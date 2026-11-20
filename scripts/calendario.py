"""
Genera un archivo de calendario (.ics) por cada partido programado de Bandidos: app/cal/<id>.ics

    python scripts/calendario.py

Lo usan "Calendario de iPhone" y "Otro calendario" en la app (Google Calendar usa un enlace armado en la app).
Incluye jornada, uniforme, sede, ubicación y un recordatorio 1 hora antes. El texto debe coincidir con
detallesEvento() de app/js/ui.js, y el uniforme sigue la misma regla que uniformeDe() de app/js/datos.js:
la fila más específica de la pestaña uniforme_partido; de local, negro (salvo fila por fecha o jornada).
Borra los .ics de partidos que ya pasaron. Lee la Google Sheet igual que notificar.py.
"""
import datetime as dt
import json
import re
import sys
import unicodedata
import urllib.parse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from notificar import CDMX, URL_APP, hoja, norm_fecha  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent
LIGA = RAIZ / "app" / "data" / "liga.json"
DESTINO = RAIZ / "app" / "cal"
DURACION_MIN = 50
UNI_LOCAL = "negro"


def norm(s):
    s = unicodedata.normalize("NFD", str(s or ""))
    return "".join(c for c in s if unicodedata.category(c) != "Mn").lower().strip()


def uniforme(p, lado, filas, unis):
    mejor, puntos = None, -1
    for r in filas:
        rama, div = norm(r.get("rama")), norm(r.get("division"))
        if rama and rama not in ("todos", "todas") and rama != norm(p["rama"]):
            continue
        if div and div not in ("todas", "todos") and div != norm(p["division"]):
            continue
        fecha = norm_fecha(r.get("fecha", ""))
        if fecha and fecha != p["fecha"]:
            continue
        if r.get("jornada") and str(r["jornada"]).strip() != str(p.get("jornada")):
            continue
        if r.get("torneo") and r["torneo"] != p.get("torneo"):
            continue
        s = (8 if fecha else 0) + (4 if r.get("jornada") else 0) + (2 if div and div != "todas" else 0) + (1 if rama and rama != "todos" else 0)
        if s > puntos:
            puntos, mejor = s, r
    if lado == "local" and puntos < 4 and any(norm(u.get("id")) == UNI_LOCAL for u in unis):
        mejor = {"uniforme": UNI_LOCAL, "nota": "Somos locales"}
    if not mejor:
        return "por confirmar"
    u = next((u for u in unis if norm(u.get("id")) == norm(mejor.get("uniforme"))), None)
    nombre = u.get("nombre") if u else mejor.get("uniforme")
    return nombre + (f" ({mejor['nota']})" if mejor.get("nota") else "")


def mapa(sede, sedes):
    s = next((x for x in sedes if norm(x.get("nombre")) == norm(sede)), None)
    if s and s.get("mapa"):
        return s["mapa"]
    return "https://www.google.com/maps/search/?api=1&query=" + urllib.parse.quote(f"{sede}, Cuernavaca, Morelos")


def esc_ics(s):
    return s.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def plegar(linea):
    """Líneas de máximo 75 bytes (RFC 5545)."""
    b = linea.encode("utf-8")
    partes = []
    while len(b) > 75:
        corte = 75 if not partes else 74
        while corte > 0 and (b[corte] & 0xC0) == 0x80:  # no cortar a mitad de un carácter
            corte -= 1
        partes.append(b[:corte].decode("utf-8"))
        b = b[corte:]
    partes.append(b.decode("utf-8"))
    return "\r\n ".join(partes)


def ics(p, torneo, uni, sedes):
    lado = "local" if re.search("bandid", p["local"]["nombre"], re.I) else "visita"
    rama = "Femenil" if p["rama"] == "FEMENIL" else "Varonil"
    titulo = f"{p['local']['nombre']} vs {p['visita']['nombre']} · {rama} {p['division'].capitalize()}"
    sede = " · ".join(x for x in [p.get("sede"), p.get("campo")] if x)
    detalles = "\n".join(x for x in [
        f"Jornada {p.get('jornada') or '–'} · {torneo}",
        f"Uniforme: {uni(p, lado)}",
        f"Sede: {sede}",
        f"Ubicación: {mapa(p.get('sede'), sedes)}",
        f"Nota: {p['nota']}" if p.get("nota") else "",
        f"App Bandidos: {URL_APP}",
    ] if x)
    ini = dt.datetime.fromisoformat(f"{p['fecha']}T{p['hora'] or '00:00'}")
    fin = ini + dt.timedelta(minutes=DURACION_MIN)
    f = "%Y%m%dT%H%M%S"
    sello = ini.replace(tzinfo=CDMX).astimezone(dt.timezone.utc).strftime(f) + "Z"
    lineas = [
        "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Bandidos Flag Football//App//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
        "BEGIN:VTIMEZONE", "TZID:America/Mexico_City", "BEGIN:STANDARD", "DTSTART:19700101T000000",
        "TZOFFSETFROM:-0600", "TZOFFSETTO:-0600", "TZNAME:CST", "END:STANDARD", "END:VTIMEZONE",
        "BEGIN:VEVENT", f"UID:{p['id']}@bandidos-app", f"DTSTAMP:{sello}",
        f"DTSTART;TZID=America/Mexico_City:{ini.strftime(f)}", f"DTEND;TZID=America/Mexico_City:{fin.strftime(f)}",
        f"SUMMARY:{esc_ics(titulo)}", f"LOCATION:{esc_ics(sede + ', Cuernavaca, Morelos')}",
        f"DESCRIPTION:{esc_ics(detalles)}", f"URL:{URL_APP}",
        "BEGIN:VALARM", "ACTION:DISPLAY", f"DESCRIPTION:{esc_ics(titulo)}", "TRIGGER:-PT1H", "END:VALARM",
        "END:VEVENT", "END:VCALENDAR",
    ]
    return "\r\n".join(plegar(x) for x in lineas) + "\r\n"


def main():
    liga = json.loads(LIGA.read_text(encoding="utf-8"))
    torneo = next((t.get("nombre") for t in liga.get("torneos", []) if t.get("nombre")), "Flag Elite Cuernavaca")
    filas, unis, sedes = hoja("uniforme_partido"), hoja("uniformes"), hoja("sedes")
    filas = [f for f in filas if f.get("uniforme")]
    hoy = (dt.datetime.now(CDMX).date() - dt.timedelta(days=1)).isoformat()
    DESTINO.mkdir(parents=True, exist_ok=True)
    vigentes, cambios = set(), 0
    for p in liga["partidos"]:
        if not (p.get("nuestro") and p.get("estado") == "Programado" and p.get("fecha") and p["fecha"] >= hoy):
            continue
        nombre = f"{p['id']}.ics"
        vigentes.add(nombre)
        texto = ics(p, torneo, lambda q, lado: uniforme(q, lado, filas, unis), sedes)
        ruta = DESTINO / nombre
        if not ruta.exists() or ruta.read_bytes() != texto.encode("utf-8"):
            ruta.write_bytes(texto.encode("utf-8"))
            cambios += 1
    for ruta in DESTINO.glob("*.ics"):
        if ruta.name not in vigentes:
            ruta.unlink()
            cambios += 1
    print(f"calendario: {len(vigentes)} partidos, {cambios} cambios")


if __name__ == "__main__":
    main()

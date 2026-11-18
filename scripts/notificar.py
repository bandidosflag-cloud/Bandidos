"""
Manda notificaciones push a la app de Bandidos con OneSignal.

    python scripts/notificar.py --rol        # cuando la liga publica el rol (corre después de actualizar_liga.py)
    python scripts/notificar.py --entreno    # el día de entreno, a partir de las 14:00 (hora de Cuernavaca)
    python scripts/notificar.py --avisos     # avisos nuevos de la hoja con "notificar = si"
    agrega --seco para ver qué mandaría sin mandar nada

Necesita las variables de entorno ONESIGNAL_API_KEY (secreto de GitHub). El App ID y el ID de la
Google Sheet se leen de app/js/config.js. Sin API key no manda nada (y no falla).
Lo ya notificado se guarda en scripts/estado/notificado.json para no repetir.
"""
import csv
import datetime as dt
import hashlib
import io
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CONFIG_JS = RAIZ / "app" / "js" / "config.js"
LIGA = RAIZ / "app" / "data" / "liga.json"
EQUIPO = RAIZ / "app" / "data" / "equipo.json"
ESTADO = RAIZ / "scripts" / "estado" / "notificado.json"
URL_APP = os.environ.get("URL_APP", "https://bandidosflag-cloud.github.io/Bandidos/")
CDMX = dt.timezone(dt.timedelta(hours=-6))  # México ya no usa horario de verano
HORA_ENTRENO = 14  # a partir de esta hora local se manda el recordatorio
DIAS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"]
MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]


def leer_config(nombre):
    m = re.search(rf'export const {nombre}\s*=\s*"([^"]*)"', CONFIG_JS.read_text(encoding="utf-8"))
    return m.group(1).strip() if m else ""


def cargar_estado():
    return json.loads(ESTADO.read_text(encoding="utf-8")) if ESTADO.exists() else {}


def guardar_estado(st):
    ESTADO.parent.mkdir(parents=True, exist_ok=True)
    ESTADO.write_text(json.dumps(st, ensure_ascii=False, indent=1), encoding="utf-8")


def hoja(pestana):
    """Filas de una pestaña de la Google Sheet (o de equipo.json si no hay hoja)."""
    sheet_id = leer_config("SHEET_ID")
    if sheet_id:
        url = (f"https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?tqx=out:csv&sheet="
               + urllib.parse.quote(pestana))
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "BandidosApp"}), timeout=30) as r:
                texto = r.read().decode("utf-8")
            filas = list(csv.DictReader(io.StringIO(texto)))
            filas = [{k.strip().lower(): (v or "").strip() for k, v in f.items() if k} for f in filas]
            if filas and ("texto" in filas[0] or "titulo" in filas[0]):
                return filas
        except Exception as e:  # noqa: BLE001
            print(f"  aviso: no se pudo leer la hoja ({e}); uso equipo.json", file=sys.stderr)
    return json.loads(EQUIPO.read_text(encoding="utf-8")).get(pestana, [])


def enviar(titulo, texto, ruta="", filtros=None, seco=False):
    app_id, key = leer_config("ONESIGNAL_APP_ID"), os.environ.get("ONESIGNAL_API_KEY", "")
    cuerpo = {
        "app_id": app_id,
        "target_channel": "push",
        "headings": {"en": titulo, "es": titulo},
        "contents": {"en": texto, "es": texto},
        "url": URL_APP + (f"#/{ruta}" if ruta else ""),
        "chrome_web_icon": URL_APP + "img/icon-192.png",
    }
    if filtros:
        cuerpo["filters"] = filtros
    else:
        cuerpo["included_segments"] = ["Total Subscriptions"]
    if seco or not (app_id and key):
        motivo = "modo seco" if seco else "falta ONESIGNAL_APP_ID o ONESIGNAL_API_KEY"
        print(f"  [no enviado: {motivo}] {titulo} — {texto}")
        return False  # no se registra como enviado: se intentará otra vez cuando haya claves
    req = urllib.request.Request(
        "https://api.onesignal.com/notifications", data=json.dumps(cuerpo).encode("utf-8"), method="POST",
        headers={"Content-Type": "application/json; charset=utf-8", "Authorization": f"Key {key}"})
    with urllib.request.urlopen(req, timeout=30) as r:
        resp = json.loads(r.read().decode("utf-8"))
    print(f"  enviado: {titulo} — {texto}  ({resp.get('id', resp)})")
    return True


def filtro_rama(rama):
    rama = (rama or "").upper()
    if rama not in ("VARONIL", "FEMENIL"):
        return None
    return [{"field": "tag", "key": "rama", "relation": "=", "value": rama}, {"operator": "OR"},
            {"field": "tag", "key": "rama", "relation": "=", "value": "TODOS"}]


def fecha_corta(iso):
    d = dt.date.fromisoformat(iso)
    return f"{DIAS[d.weekday()]} {d.day} {MESES[d.month - 1]}"


# ---------------------------------------------------------------- rol
def rol(st, seco):
    liga = json.loads(LIGA.read_text(encoding="utf-8"))
    hoy = dt.datetime.now(CDMX).date().isoformat()
    prog = [p for p in liga["partidos"] if p.get("nuestro") and p["estado"] == "Programado" and (p["fecha"] or "") >= hoy]
    ya = set(st.get("rol", []))
    nuevos = [p for p in prog if p["id"] not in ya]
    if not nuevos:
        print("rol: nada nuevo")
        return
    nuevos.sort(key=lambda p: (p["fecha"], p["hora"]))
    jornadas = sorted({p["jornada"] for p in nuevos if p.get("jornada")})
    titulo = f"Ya salió el rol{' de la jornada ' + str(jornadas[0]) if len(jornadas) == 1 else ''} 🏈"
    partes = []
    for p in nuevos:
        rival = p["visita"]["nombre"] if re.search("bandid", p["local"]["nombre"], re.I) else p["local"]["nombre"]
        corto = ("Fem " if p["rama"] == "FEMENIL" else "Var ") + p["division"].capitalize()
        partes.append(f"{corto} {p['hora']} vs {rival}")
    texto = f"{fecha_corta(nuevos[0]['fecha'])}: " + " · ".join(partes)
    if enviar(titulo, texto[:230], "partido", seco=seco) and not seco:
        st["rol"] = sorted(ya | {p["id"] for p in nuevos})


# ---------------------------------------------------------------- entreno
def entreno(st, seco):
    ahora = dt.datetime.now(CDMX)
    if ahora.hour < HORA_ENTRENO and not seco:
        print("entreno: todavía es temprano")
        return
    hoy = ahora.date().isoformat()
    ev = [e for e in hoja("eventos") if re.search("entren", e.get("tipo", ""), re.I) and e.get("fecha") == hoy]
    if not ev or hoy in st.get("entreno", []):
        print("entreno: nada que avisar")
        return
    e = ev[0]
    horario = e.get("hora", "") + (f"–{e['hora_fin']}" if e.get("hora_fin") else "")
    texto = " · ".join(x for x in [horario, e.get("lugar", ""), e.get("nota", "")] if x) or "Hoy hay entrenamiento"
    if enviar("Hoy hay entreno 💪", texto, "agenda", filtros=filtro_rama(e.get("rama")), seco=seco) and not seco:
        st["entreno"] = (st.get("entreno", []) + [hoy])[-60:]


# ---------------------------------------------------------------- avisos
def avisos(st, seco):
    filas = [a for a in hoja("avisos") if a.get("texto")]
    clave = lambda a: hashlib.sha1(f"{a.get('fecha', '')}|{a.get('texto', '')}".encode()).hexdigest()[:16]  # noqa: E731
    marcar = [a for a in filas if re.fullmatch(r"(si|sí|x|yes)", (a.get("notificar") or "").strip(), re.I)]
    if "avisos" not in st:  # primera vez: no reenviar avisos viejos
        st["avisos"] = [clave(a) for a in marcar]
        print(f"avisos: inicializado ({len(marcar)} existentes, no se reenvían)")
        return
    ya = set(st["avisos"])
    for a in marcar:
        k = clave(a)
        if k in ya:
            continue
        titulo = "Aviso importante 📣" if re.fullmatch(r"(si|sí|x|yes)", (a.get("importante") or "").strip(), re.I) else "Aviso de Bandidos"
        if enviar(titulo, a["texto"][:230], "avisos", filtros=filtro_rama(a.get("rama")), seco=seco) and not seco:
            ya.add(k)
    st["avisos"] = sorted(ya)


def main():
    args = set(sys.argv[1:])
    seco = "--seco" in args
    st = cargar_estado()
    if "--rol" in args:
        rol(st, seco)
    if "--entreno" in args:
        entreno(st, seco)
    if "--avisos" in args:
        avisos(st, seco)
    if not seco:
        guardar_estado(st)


if __name__ == "__main__":
    main()

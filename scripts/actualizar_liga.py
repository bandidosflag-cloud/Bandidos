"""
Actualiza app/data/liga.json con la informacion publica de Flag Elite Cuernavaca
(plataforma Yarai: https://app.yarai.mx/flag-elite-cuernavaca).

Solo usa la biblioteca estandar de Python (no hay que instalar nada).

Uso:
    python scripts/actualizar_liga.py

Que hace:
  1. Lee la lista de torneos de la liga.
  2. En cada torneo "En curso" busca nuestros equipos (nombre que contenga "bandid").
  3. Guarda: tablas de nuestras divisiones, partidos (jugados y por jugar),
     lideres, y los jugadores/estadisticas de nuestros equipos.
"""

import datetime as dt
import html
import json
import re
import sys
import time
import unicodedata
import urllib.request
from pathlib import Path

BASE = "https://app.yarai.mx"
LIGA = "flag-elite-cuernavaca"
PATRON_NUESTRO = re.compile(r"bandid", re.I)
SALIDA = Path(__file__).resolve().parent.parent / "app" / "data" / "liga.json"
STATS_PARTIDOS = SALIDA.parent / "stats_partidos.json"          # lo lee la app
SNAPSHOT = Path(__file__).resolve().parent / "estado" / "snapshot_stats.json"  # interno
UA = "Mozilla/5.0 (BandidosApp; actualizacion diaria)"

MESES = {"ene": 1, "feb": 2, "mar": 3, "abr": 4, "may": 5, "jun": 6,
         "jul": 7, "ago": 8, "sep": 9, "oct": 10, "nov": 11, "dic": 12}


# ---------------------------------------------------------------- utilidades
def bajar(ruta: str) -> str:
    url = ruta if ruta.startswith("http") else BASE + ruta
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for intento in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                t = r.read().decode("utf-8", "replace")
            time.sleep(0.6)  # ser amables con el servidor
            return re.sub(r"<script.*?</script>", "", t, flags=re.S)
        except Exception as e:  # noqa: BLE001
            if intento == 2:
                raise
            print(f"  reintento {url}: {e}", file=sys.stderr)
            time.sleep(3)
    return ""


def texto(fragmento: str) -> str:
    s = re.sub(r"<!-- -->", "", fragmento)
    s = re.sub(r"<[^>]+>", " ", s)
    s = html.unescape(s).replace("−", "-")
    return re.sub(r"\s+", " ", s).strip()


def num(s: str):
    s = texto(s)
    try:
        return int(s)
    except ValueError:
        return s


def bloques(t: str, clase_inicio: str):
    """Divide el HTML en trozos que empiezan con class="<clase_inicio>..."."""
    partes = re.split(r'(?=<div class="' + clase_inicio + r'[\s"])', t)
    return partes[1:]


def fecha_iso(etiqueta: str, anio_inicio: int, mes_inicio: int):
    m = re.search(r"(\d{1,2}) de (\w{3})", etiqueta)
    if not m:
        return None
    dia, mes = int(m.group(1)), MESES.get(m.group(2).lower()[:3])
    if not mes:
        return None
    anio = anio_inicio + (1 if mes < mes_inicio else 0)
    return f"{anio:04d}-{mes:02d}-{dia:02d}"


# ------------------------------------------------------------------- torneos
def leer_torneos():
    t = bajar(f"/{LIGA}/torneos")
    torneos = []
    for slug in dict.fromkeys(re.findall(rf'href="/{LIGA}/torneos/([a-z0-9-]+)"', t)):
        if slug in ("rol", "resultados"):
            continue
        torneos.append(slug)
    return torneos


def leer_cabecera(t: str):
    nombre = texto(re.search(r'<h1[^>]*>(.*?)</h1>', t, re.S).group(1)) if re.search(r"<h1", t) else ""
    nombre = nombre.split(" · ")[0]
    estado = "En curso" if "En curso" in t else ("Finalizado" if "Finalizado" in t else "")
    # "19 sep – 28 nov"
    plano = texto(t)
    m = re.search(r"(\d{1,2}) (\w{3})\s*[–-]\s*(\d{1,2}) (\w{3})", plano)
    return nombre, estado, m


# -------------------------------------------------------------------- tablas
def leer_tabla(t: str):
    filas = []
    tabla = re.search(r'<table class="tabla tabla-pos".*?</table>', t, re.S)
    if not tabla:
        return filas
    for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", tabla.group(0), re.S):
        tds = re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)
        if len(tds) < 8:
            continue
        eid = re.search(r"/equipos/([a-z0-9]+)", tds[1])
        nombre = texto(tds[1])
        filas.append({
            "pos": num(tds[0]), "equipo": nombre, "id": eid.group(1) if eid else None,
            "jj": num(tds[2]), "jg": num(tds[3]), "jp": num(tds[4]),
            "pf": num(tds[5]), "pc": num(tds[6]), "dif": num(tds[7]),
            "nuestro": bool(PATRON_NUESTRO.search(nombre)),
        })
    return filas


# ------------------------------------------------------------------ partidos
def leer_partidos(t: str, anio: int, mes_ini: int):
    partidos = []
    for sec in re.split(r'(?=<div class="jornada">)', t)[1:]:
        jm = re.search(r"<h3>(.*?)</h3>", sec, re.S)
        jornada = texto(jm.group(1)) if jm else ""
        jn = re.search(r"\d+", jornada)
        for b in bloques(sec, "partido"):
            g = lambda c: (re.search(r'class="' + c + r'">(.*?)</(?:b|span)>', b, re.S) or [None, ""])[1]  # noqa: E731
            rama_div = texto(g("info-rama"))
            rama, _, division = rama_div.partition(" · ")
            sede = texto(re.sub(r"<span class=\"info-campo\">.*", "", re.search(r'class="info-sede">(.*?)</div>', b, re.S).group(1), flags=re.S)).rstrip(" ·")
            campos = [texto(c) for c in re.findall(r'class="info-campo">(.*?)</span>', b, re.S)]
            lados = re.findall(r'<div class="lado([^"]*)">(.*?)</div>', b, re.S)
            if len(lados) < 2:
                continue
            eq = []
            for clase, contenido in lados[:2]:
                n = re.search(r'class="lado-nombre">(.*?)</span>', contenido, re.S)
                s = re.search(r'class="marcador">(.*?)</b>', contenido, re.S)
                eq.append({"nombre": texto(n.group(1)) if n else "", "pts": num(s.group(1)) if s else None,
                           "gana": "gana" in clase})
            est = re.search(r'class="carta-estado[^"]*">(.*?)</span>', b, re.S)
            if est:
                estado = texto(est.group(1))
            elif eq[0]["pts"] is not None:
                estado = "Final"
            else:
                estado = "Programado"
            etiqueta = texto(g("info-fecha"))
            p = {
                "jornada": int(jn.group(0)) if jn else None,
                "fecha": fecha_iso(etiqueta, anio, mes_ini), "fecha_txt": etiqueta,
                "hora": texto(g("info-hora")), "rama": rama, "division": division,
                "sede": sede, "campo": next((c for c in campos if c.lower().startswith("campo")), ""),
                "nota": ", ".join(c for c in campos if not c.lower().startswith("campo")),
                "local": eq[0], "visita": eq[1], "estado": estado,
            }
            p["nuestro"] = bool(PATRON_NUESTRO.search(eq[0]["nombre"]) or PATRON_NUESTRO.search(eq[1]["nombre"]))
            partidos.append(p)
    return partidos


# ------------------------------------------------------------------- lideres
def leer_lideres(t: str):
    salida = []
    for sec in re.split(r"<section", t)[1:]:
        h = re.search(r"<h3>(.*?)</h3>", sec, re.S)
        if not h or "lider" not in sec:
            continue
        rama, _, division = texto(h.group(1)).partition(" · ")
        cats = []
        for art in re.findall(r'<article class="lider[^"]*">(.*?)</article>', sec, re.S):
            titulo = texto(re.search(r"<h4>(.*?)</h4>", art, re.S).group(1))
            gente = []
            for li in re.findall(r"<li>(.*?)</li>", art, re.S):
                eqm = re.search(r'class="equipo-chico">(.*?)</span>', li, re.S)
                nombre = texto(re.sub(r'<span class="equipo-chico">.*?</span>', "", li.split('class="cifra"')[0], flags=re.S))
                cif = re.search(r'class="cifra">(.*?)</span>', li, re.S)
                equipo = texto(eqm.group(1)) if eqm else ""
                gente.append({"jugador": nombre.rstrip(' <span'), "equipo": equipo,
                              "valor": num(cif.group(1)) if cif else None,
                              "nuestro": bool(PATRON_NUESTRO.search(equipo))})
            cats.append({"categoria": titulo, "lideres": gente})
        salida.append({"rama": rama, "division": division, "categorias": cats})
    return salida


# ------------------------------------------------------------------- equipos
def leer_equipo(t: str):
    tot = {texto(s).lower(): num(b) for b, s in re.findall(r"<div><b>(.*?)</b><span>(.*?)</span></div>", t, re.S)}
    jugadores = []
    tabla = re.search(r"<table.*?</table>", t, re.S)
    if tabla:
        for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", tabla.group(0), re.S):
            tds = re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)
            if len(tds) < 7:
                continue
            jugadores.append({
                "numero": num(re.sub(r"#", "", texto(tds[0]))), "nombre": texto(tds[1]),
                "pda": num(tds[2]), "pts": num(tds[3]), "sck": num(tds[4]),
                "int": num(tds[5]), "ast": num(tds[6]),
            })
    return tot, jugadores


def leer_lista_equipos(t: str):
    """Devuelve [(rama, division, nombre, id)] de la pagina de equipos."""
    out = []
    for sec in re.split(r'(?=<div class="jornada">)|(?=<h3)', t):
        h = re.search(r"<h3[^>]*>(.*?)</h3>", sec, re.S)
        if not h:
            continue
        rd = texto(h.group(1))
        if " · " not in rd:
            continue
        rama, _, division = rd.partition(" · ")
        for eid, contenido in re.findall(r'href="[^"]*/equipos/([a-z0-9]+)"[^>]*>(.*?)</a>', sec, re.S):
            out.append((rama, division, texto(contenido).rstrip(" ›"), eid))
    return out


# --------------------------------------------------------------------- main
def procesar_torneo(slug: str):
    raiz = f"/{LIGA}/torneos/{slug}"
    portada = bajar(raiz)
    nombre, estado, rango = leer_cabecera(portada)
    hoy = dt.date.today()
    if rango:
        mes_ini = MESES.get(rango.group(2).lower(), 1)
        anio = hoy.year if mes_ini <= hoy.month + 2 else hoy.year - 1
        anio_ini, mes_fin = anio, MESES.get(rango.group(4).lower(), 12)
        inicio = f"{anio_ini:04d}-{mes_ini:02d}-{int(rango.group(1)):02d}"
        fin_anio = anio_ini + (1 if mes_fin < mes_ini else 0)
        fin = f"{fin_anio:04d}-{mes_fin:02d}-{int(rango.group(3)):02d}"
    else:
        mes_ini, anio_ini, inicio, fin = 1, hoy.year, None, None

    info = {"slug": slug, "nombre": nombre, "estado": estado, "inicio": inicio, "fin": fin,
            "url": BASE + raiz}

    equipos = leer_lista_equipos(bajar(raiz + "/equipos"))
    nuestros = [e for e in equipos if PATRON_NUESTRO.search(e[2])]
    info["equipos_total"] = len(equipos)
    if not nuestros:
        return info, None
    print(f"  {nombre}: {len(nuestros)} equipos nuestros")

    # enlaces de divisiones (cat/div) desde la portada
    divs = {}
    for href in dict.fromkeys(re.findall(r'href="(' + re.escape(raiz) + r'\?cat=[^"]+&amp;div=[^"]+)"', portada)):
        t = bajar(html.unescape(href))
        h = re.search(r'<table class="tabla tabla-pos"', t)
        if not h:
            continue
        # titulo de la division: "VARONIL · BRONZE" antes de la tabla
        antes = texto(t[:h.start()])
        m = re.findall(r"(FEMENIL|VARONIL|MIXTO) · (\w+)", antes)
        if m:
            divs[m[-1]] = leer_tabla(t)

    datos = {"torneo": info, "equipos": [], "tablas": [], "partidos": [], "lideres": []}
    divisiones_nuestras = set()
    for rama, division, nom, eid in nuestros:
        tot, jugadores = leer_equipo(bajar(f"{raiz}/equipos/{eid}"))
        divisiones_nuestras.add((rama, division))
        fila = next((f for f in divs.get((rama, division), []) if f["id"] == eid), None)
        datos["equipos"].append({
            "id": eid, "nombre": nom, "rama": rama, "division": division,
            "torneo": slug, "totales": tot, "jugadores": jugadores, "posicion": fila,
            "url": f"{BASE}{raiz}/equipos/{eid}",
        })
    for (rama, division), filas in divs.items():
        if (rama, division) in divisiones_nuestras:
            datos["tablas"].append({"rama": rama, "division": division, "torneo": slug, "filas": filas})

    todos = leer_partidos(bajar(raiz + "/partidos"), anio_ini, mes_ini)

    # Yarai muestra el rango del torneo un día antes (fecha guardada en UTC):
    # p. ej. "19 sep – 28 nov" cuando el primer partido fue el domingo 20 sep.
    # Si el primer partido cae exactamente 1 día después del inicio, se corrigen ambas fechas.
    fechas = sorted(p["fecha"] for p in todos if p["fecha"])
    if fechas and inicio and fin:
        d_ini = dt.date.fromisoformat(inicio)
        if dt.date.fromisoformat(fechas[0]) - d_ini == dt.timedelta(days=1):
            inicio = (d_ini + dt.timedelta(days=1)).isoformat()
            fin = (dt.date.fromisoformat(fin) + dt.timedelta(days=1)).isoformat()
            info["inicio"], info["fin"] = inicio, fin
    proximos = leer_partidos(bajar(raiz + "/partidos?estado=porjugar"), anio_ini, mes_ini)
    vistos = {(p["fecha"], p["hora"], p["local"]["nombre"], p["visita"]["nombre"]) for p in todos}
    todos += [p for p in proximos if (p["fecha"], p["hora"], p["local"]["nombre"], p["visita"]["nombre"]) not in vistos]
    for p in todos:
        if (p["rama"], p["division"]) in divisiones_nuestras:
            p["torneo"] = slug
            datos["partidos"].append(p)
    pj = bajar(raiz + "/partidos?estado=porjugar")
    aviso = re.search(r"Aún no se publica el rol de la jornada (\d+)", html.unescape(pj))
    info["rol_pendiente"] = int(aviso.group(1)) if aviso else None

    datos["lideres"] = [l for l in leer_lideres(bajar(raiz + "/lideres"))
                        if (l["rama"], l["division"]) in divisiones_nuestras]

    # Ranking de nuestros jugadores dentro de su división: la liga solo muestra al líder,
    # así que se leen las estadísticas de todos los equipos de nuestras divisiones.
    por_div = {}
    for rama, division, nom, eid in equipos:
        if (rama, division) not in divisiones_nuestras:
            continue
        propio = next((e for e in datos["equipos"] if e["id"] == eid), None)
        jug = propio["jugadores"] if propio else leer_equipo(bajar(f"{raiz}/equipos/{eid}"))[1]
        for j in jug:
            por_div.setdefault((rama, division), []).append({**j, "equipo": nom, "nuestro": bool(PATRON_NUESTRO.search(nom))})
    datos["rankings"] = []
    for (rama, division), jugadores in por_div.items():
        cats = []
        for clave, titulo in (("pts", "Puntos anotados"), ("pda", "Pases de anotación"),
                              ("int", "Intercepciones"), ("sck", "Sacks")):
            valores = sorted((j for j in jugadores if isinstance(j.get(clave), int) and j[clave] > 0),
                             key=lambda j: -j[clave])
            nuestros = []
            for j in valores:
                if not j["nuestro"]:
                    continue
                puesto = 1 + sum(1 for x in valores if x[clave] > j[clave])
                empate = sum(1 for x in valores if x[clave] == j[clave]) > 1
                nuestros.append({"jugador": j["nombre"], "valor": j[clave], "puesto": puesto, "empate": empate})
            cats.append({"clave": clave, "categoria": titulo, "con_registro": len(valores),
                         "valor_lider": valores[0][clave] if valores else 0, "nuestros": nuestros})
        datos["rankings"].append({"rama": rama, "division": division, "jugadores": len(jugadores), "categorias": cats})
    return info, datos


def slug(s: str) -> str:
    s = unicodedata.normalize("NFD", s or "")
    s = "".join(c for c in s if not unicodedata.combining(c)).lower().strip()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def id_partido(p) -> str:
    return slug(f"{p['fecha']}-{p['hora']}-{p['local']['nombre']}-{p['visita']['nombre']}-{p['division']}")


STATS_CLAVES = ("pda", "pts", "sck", "int", "ast")


def estadisticas_por_partido(salida):
    """
    La liga solo publica estadísticas ACUMULADAS por jugador. Para saber qué hizo cada
    jugador en un partido, guardamos una "foto" (snapshot) de los totales y, cuando aparece
    un resultado nuevo, restamos: actual - foto anterior = lo que hizo en ese partido.
    Si en ese lapso el equipo jugó 2 partidos (doble jornada), quedan combinados.
    Si la liga ya subió el marcador pero aún no las estadísticas (asistencias sin cambio),
    se espera a la siguiente corrida.
    """
    snap = json.loads(SNAPSHOT.read_text(encoding="utf-8")) if SNAPSHOT.exists() else {}
    stats = json.loads(STATS_PARTIDOS.read_text(encoding="utf-8")) if STATS_PARTIDOS.exists() else {}
    ahora = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")

    for e in salida["equipos"]:
        clave = f"{e['torneo']}|{e['rama']}|{e['division']}"
        actuales = {j["nombre"]: {k: (j.get(k) if isinstance(j.get(k), int) else 0) for k in STATS_CLAVES}
                    for j in e["jugadores"]}
        finales = sorted(p["id"] for p in salida["partidos"]
                         if p["nuestro"] and p["estado"] == "Final" and p["torneo"] == e["torneo"]
                         and p["rama"] == e["rama"] and p["division"] == e["division"])
        previo = snap.get(clave)
        if previo is None:
            snap[clave] = {"partidos": finales, "jugadores": actuales, "fecha": ahora}
            print(f"  base de estadísticas creada para {clave} ({len(finales)} partidos)")
            continue
        nuevos = [i for i in finales if i not in previo["partidos"]]
        delta = {}
        for nombre, s in actuales.items():
            ant = previo["jugadores"].get(nombre, {})
            d = {k: s[k] - ant.get(k, 0) for k in STATS_CLAVES}
            if any(d.values()):
                delta[nombre] = d
        if not nuevos:
            # sin partidos nuevos: solo correcciones de la liga -> actualizar la base
            previo["jugadores"] = actuales
            continue
        if sum(d["ast"] for d in delta.values()) <= 0:
            print(f"  {clave}: hay {len(nuevos)} resultado(s) nuevo(s) pero la liga aún no sube estadísticas; se espera.")
            continue
        jugadores = [{"nombre": n, **d} for n, d in sorted(delta.items(), key=lambda x: (-x[1]["pts"], -x[1]["pda"], x[0]))]
        registro = {"equipo": clave, "partidos": nuevos, "combinado": len(nuevos) > 1,
                    "jugadores": jugadores, "registrado": ahora}
        for i in nuevos:
            stats[i] = registro
        snap[clave] = {"partidos": finales, "jugadores": actuales, "fecha": ahora}
        print(f"  {clave}: estadísticas de {len(nuevos)} partido(s) calculadas ({len(jugadores)} jugadores)")

    SNAPSHOT.parent.mkdir(parents=True, exist_ok=True)
    SNAPSHOT.write_text(json.dumps(snap, ensure_ascii=False, indent=1), encoding="utf-8")
    STATS_PARTIDOS.write_text(json.dumps(stats, ensure_ascii=False, indent=1), encoding="utf-8")


def main():
    print("Leyendo torneos de", LIGA)
    salida = {
        "actualizado": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "fuente": f"{BASE}/{LIGA}",
        "torneos": [], "equipos": [], "tablas": [], "partidos": [], "lideres": [], "rankings": [],
    }
    for slug in leer_torneos():
        print("-", slug)
        try:
            info, datos = procesar_torneo(slug)
        except Exception as e:  # noqa: BLE001
            print(f"  ERROR en {slug}: {e}", file=sys.stderr)
            continue
        info["participamos"] = datos is not None
        salida["torneos"].append(info)
        if datos:
            for k in ("equipos", "tablas", "partidos", "lideres", "rankings"):
                salida[k] += datos[k]

    if not salida["equipos"]:
        print("No se encontraron equipos nuestros; no se sobreescribe el archivo.", file=sys.stderr)
        sys.exit(1)
    for p in salida["partidos"]:
        p["id"] = id_partido(p)
    estadisticas_por_partido(salida)

    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    SALIDA.write_text(json.dumps(salida, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"OK -> {SALIDA}  ({len(salida['equipos'])} equipos, {len(salida['partidos'])} partidos)")


if __name__ == "__main__":
    main()

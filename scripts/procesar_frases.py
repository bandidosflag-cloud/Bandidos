"""
Recorta las fotos de equipo de "Quotes/" para el recuadro "Frase de la semana" de Inicio.

    python scripts/procesar_frases.py            # procesa las fotos nuevas
    python scripts/procesar_frases.py --todas    # vuelve a procesar todas

Salida: app/img/frases/<nombre>.webp (860x426, el tamaño del recuadro a 2.5x) y app/data/frases_fotos.json.
El recorte busca a la gente (rembg u2net_human_seg, corre local) y amplía para que el grupo y las caras llenen el recuadro.
Las frases están en app/data/frases.json; la frase N usa la foto N (si hay menos fotos, se repiten en orden).
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps
from rembg import new_session, remove

RAIZ = Path(__file__).resolve().parent.parent
ORIGEN = RAIZ / "Quotes"
DESTINO = RAIZ / "app" / "img" / "frases"
MANIFIESTO = RAIZ / "app" / "data" / "frases_fotos.json"
SALIDA = (860, 426)   # 343x170 px en pantalla, a 2.5x
CABEZA_ARRIBA = 0.18  # dónde quedan las cabezas (fracción del alto, desde arriba)

# Fotos que no se usan: marca de agua ajena (IMG_6031, IMG_6558), de espaldas o muy lejos (sin caras), HEIC
DESCARTAR = {"IMG_6031", "IMG_6558", "DSC01432", "DSC01484", "DSC02423", "DSC05182", "DSC05291", "DSC05325",
             "DSC05568", "DSC06183", "DSC06401", "DSC06684", "DSC06785", "DSC07341", "DSC07511"}


def slug(s):
    return "".join(c if c.isalnum() else "-" for c in s.lower()).strip("-").replace("--", "-")


def recortar(ruta, sesion):
    full = ImageOps.exif_transpose(Image.open(ruta)).convert("RGB")
    work = full.copy()
    work.thumbnail((1200, 1200))
    s = work.width / full.width
    m = np.array(remove(work, session=sesion, only_mask=True)) > 128
    cols = np.where(m.sum(0) > m.shape[0] * 0.01)[0]
    if not len(cols):
        cols = np.arange(work.width)
        m[:, :] = True
    x0, x1 = cols.min(), cols.max()
    perfiles = [np.where(m[:, c])[0] for c in cols[::5]]
    perfiles = [p for p in perfiles if len(p)]
    alto = np.median([p.max() - p.min() for p in perfiles])   # alto típico de la gente
    cabeza = np.median([p.min() for p in perfiles])            # altura típica de las cabezas
    asp = SALIDA[0] / SALIDA[1]
    w = max((x1 - x0) * 1.08, alto * 0.9 * asp)  # que quepa el grupo sin que quede diminuto
    w = min(w, work.width)
    h = w / asp
    if h > work.height:
        h, w = work.height, work.height * asp
    left = min(max((x0 + x1) / 2 - w / 2, 0), work.width - w)
    top = min(max(cabeza - h * CABEZA_ARRIBA, 0), work.height - h)
    caja = tuple(round(v / s) for v in (left, top, left + w, top + h))
    return full.crop(caja).resize(SALIDA, Image.LANCZOS)


def main():
    todas = "--todas" in sys.argv
    DESTINO.mkdir(parents=True, exist_ok=True)
    sesion = new_session("u2net_human_seg")
    fotos = []
    for ruta in sorted(p for p in ORIGEN.iterdir() if p.suffix.lower() in (".jpg", ".jpeg", ".png")):
        if ruta.stem in DESCARTAR:
            continue
        nombre = slug(ruta.stem) + ".webp"
        salida = DESTINO / nombre
        if todas or not salida.exists():
            recortar(ruta, sesion).save(salida, quality=70, method=6)
            print(f"  {ruta.name} -> {nombre} ({salida.stat().st_size // 1024} KB)")
        fotos.append(f"img/frases/{nombre}")
    MANIFIESTO.write_text(json.dumps(fotos, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(fotos)} fotos en {MANIFIESTO.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()

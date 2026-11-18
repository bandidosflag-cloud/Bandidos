"""
Recorta a los jugadores de "Fotos jugadores/" (quita el fondo) para los bloques de Inicio.

    python scripts/procesar_fotos_hero.py            # procesa las fotos nuevas
    python scripts/procesar_fotos_hero.py --todas    # vuelve a procesar todas

Salida: app/img/hero/<nombre>.webp (fondo transparente, 480x640, cara siempre del mismo tamaño y en el mismo lugar) y app/data/fotos_hero.json.
La rama de cada foto se toma de RAMAS (abajo); las fotos que no estén ahí salen en "Todos".
Usa rembg con el modelo u2net_human_seg (corre local, no sube nada).
"""
import json
import sys
from pathlib import Path

import numpy as np
import cv2
from PIL import Image, ImageOps
from rembg import new_session, remove

RAIZ = Path(__file__).resolve().parent.parent
ORIGEN = RAIZ / "Fotos jugadores"
DESTINO = RAIZ / "app" / "img" / "hero"
MANIFIESTO = RAIZ / "app" / "data" / "fotos_hero.json"

# VARONIL / FEMENIL / TODOS (coaches o fotos de grupo)
RAMAS = {
    "DSC05269": "FEMENIL", "DSC06145": "FEMENIL", "DSC06191": "FEMENIL", "DSC06236": "TODOS",
    "DSC06289 (1)": "VARONIL", "DSC06290": "VARONIL", "DSC06296": "TODOS", "DSC06379": "VARONIL",
    "DSC06399": "VARONIL", "DSC06558": "FEMENIL", "DSC06591": "FEMENIL", "DSC06661": "FEMENIL",
    "DSC06674": "FEMENIL", "DSC06775": "FEMENIL", "DSC07236": "VARONIL", "DSC07237": "VARONIL",
    "DSC07238": "VARONIL",
}


# Limpieza a mano (fracciones del recorte cabeza-rodillas): "dejar" = polígono que se conserva, "borrar" = cajas que se quitan
LIMPIEZA = {
    "DSC06145": {"dejar": [(0.38, 0), (1, 0), (1, 1), (0.38, 1), (0.38, 0.6), (0.30, 0.55), (0.22, 0.46),
                           (0.27, 0.3), (0.33, 0.18), (0.38, 0.12)]},
    "DSC06236": {"dejar": [(0.22, 0), (1, 0), (1, 1), (0.22, 1)]},
    "DSC06296": {"dejar": [(0, 0), (0.66, 0), (0.66, 0.28), (0.72, 0.33), (0.78, 0.42), (0.85, 0.52), (0.88, 1), (0, 1)]},
    "DSC07237": {"dejar": [(0.32, 0), (1, 0), (1, 1), (0.16, 1), (0.17, 0.75), (0.2, 0.6), (0.34, 0.55), (0.34, 0.15)],
                 "alto": 0.8},  # sin piernas: ahí estaba la marca de agua
}


def slug(s):
    return "".join(c if c.isalnum() else "-" for c in s.lower()).strip("-").replace("--", "-")


def sujeto_principal(alpha):
    """Deja solo la persona más grande (quita gente del fondo)."""
    duro = (alpha > 128).astype(np.uint8)
    n, etiquetas, stats, _ = cv2.connectedComponentsWithStats(duro, 8)
    if n <= 2:
        return alpha
    mayor = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    zona = cv2.dilate((etiquetas == mayor).astype(np.uint8), np.ones((15, 15), np.uint8))
    return (alpha * zona).astype(np.uint8)


# Encuadre: todas las fotos salen en un lienzo de LIENZO px con la cara del mismo tamaño y en el mismo lugar
LIENZO = (480, 640)
CARA_ALTO = 0.16      # alto de la cara / alto del lienzo
CARA_CENTRO = (0.5, 0.24)
# Cara puesta a mano (fracciones de la foto) cuando la silueta engaña (gorras, brazos arriba): (x, y, ancho, alto)
CARA = {
    "DSC05269": (0.4047, 0.2322, 0.0714, 0.0594),
    "DSC06145": (0.4394, 0.2166, 0.1164, 0.0969),
    "DSC06191": (0.4516, 0.2562, 0.1953, 0.1625),
    "DSC06236": (0.4158, 0.1753, 0.1400, 0.1400),
    "DSC06289 (1)": (0.4439, 0.2084, 0.1074, 0.0894),
    "DSC06290": (0.0704, 0.2744, 0.1127, 0.0938),
    "DSC06296": (0.4150, 0.2383, 0.1533, 0.1533),
    "DSC06379": (0.1657, 0.1670, 0.2197, 0.1828),
    "DSC06399": (0.5061, 0.2291, 0.1803, 0.1500),
    "DSC06558": (0.5876, 0.1944, 0.0811, 0.0675),
    "DSC06591": (0.5167, 0.2775, 0.0811, 0.0675),
    "DSC06661": (0.4434, 0.2175, 0.0992, 0.0825),
    "DSC06674": (0.3608, 0.1609, 0.0879, 0.0731),
    "DSC06775": (0.4174, 0.2100, 0.2028, 0.1688),
    "DSC07236": (0.3679, 0.1756, 0.1562, 0.1300),
    "DSC07237": (0.3498, 0.1719, 0.1127, 0.0938),
    "DSC07238": (0.2961, 0.2153, 0.1562, 0.1300),
}

def aplicar_limpieza(mask, reglas):
    """Las reglas están en fracciones del recorte cabeza-rodillas de la versión anterior; se pasan a la foto."""
    ys, xs = np.where(mask > 20)
    y0, x0, w, h = ys.min(), xs.min(), xs.max() + 1 - xs.min(), ys.max() + 1 - ys.min()
    alto = min(h, max(int(w * 1.5), int(h * 0.62)))
    if "dejar" in reglas:
        m = np.zeros_like(mask)
        cv2.fillPoly(m, [np.array([(x0 + x * w, y0 + y * alto) for x, y in reglas["dejar"]], np.int32)], 1)
        m[:y0 + 1] = m[y0 + 1]  # el polígono sigue hacia arriba
        mask = (mask * cv2.GaussianBlur(m.astype(np.float32), (7, 7), 0)).astype(np.uint8)
    if "alto" in reglas:
        mask[int(y0 + reglas["alto"] * alto):] = 0
    return mask


def buscar_cara(mask, clave):
    """Ubica la cabeza por la silueta: la parte de arriba hasta que se ensancha en los hombros."""
    H, W = mask.shape
    if clave in CARA:
        x, y, w, h = CARA[clave]
        return x * W, y * H, w * W, h * H
    duro = mask > 128
    filas = np.where(duro.any(axis=1))[0]
    tope = filas[0]
    col = int(np.mean(np.where(duro[tope])[0]))
    ancho_max, centro = 0, col
    for y in range(tope, filas[-1]):
        xs = np.where(duro[y])[0]
        if not len(xs):
            continue
        # tramo continuo que contiene la columna de la cabeza
        cortes = np.split(xs, np.where(np.diff(xs) > 3)[0] + 1)
        tramo = min(cortes, key=lambda c: 0 if c[0] <= col <= c[-1] else min(abs(c[0] - col), abs(c[-1] - col)))
        ancho = tramo[-1] - tramo[0]
        if y - tope > 10 and ancho > 1.6 * ancho_max and ancho_max > 0:
            break
        if ancho > ancho_max:
            ancho_max, centro = ancho, (tramo[0] + tramo[-1]) / 2
        col = int((tramo[0] + tramo[-1]) / 2)
    alto_sujeto = filas[-1] - tope
    ancho_max = min(max(ancho_max, 0.06 * alto_sujeto), 0.3 * alto_sujeto)  # por si la silueta engaña
    h = 1.2 * ancho_max
    return centro - ancho_max / 2, tope + 0.2 * h, ancho_max, h


def procesar(ruta, sesion, depurar=None):
    full = ImageOps.exif_transpose(Image.open(ruta)).convert("RGB")
    work = full.copy()
    work.thumbnail((1800, 1800), Image.LANCZOS)
    s = work.width / full.width
    mask = np.array(remove(work, session=sesion, only_mask=True, post_process_mask=True))
    mask = sujeto_principal(mask)
    if ruta.stem in LIMPIEZA:
        mask = aplicar_limpieza(mask, LIMPIEZA[ruta.stem])
    cara = buscar_cara(mask, ruta.stem)
    x, y, w, h = cara
    if depurar is not None:
        depurar[ruta.stem] = (work, mask, cara)
    LW, LH = LIENZO
    k = CARA_ALTO * LH / h                      # px del lienzo por px de la foto de trabajo
    cx, cy = x + w / 2, y + h / 2
    caja = (cx - CARA_CENTRO[0] * LW / k, cy - CARA_CENTRO[1] * LH / k)
    caja = (*caja, caja[0] + LW / k, caja[1] + LH / k)  # en px de la foto de trabajo
    rgb = full.crop(tuple(round(v / s) for v in caja)).resize(LIENZO, Image.LANCZOS)
    alfa = Image.fromarray(mask).crop(tuple(round(v) for v in caja)).resize(LIENZO, Image.BILINEAR)
    # si la foto original se acaba antes del borde de abajo, desvanecer ese corte
    fin = (work.height - caja[1]) * k
    if fin < LH:
        a = np.array(alfa).astype(np.float32)
        rampa = np.clip((fin - np.arange(LH)) / (0.18 * LH), 0, 1)
        alfa = Image.fromarray((a * rampa[:, None]).astype(np.uint8))
    rgb.putalpha(alfa)
    return rgb


def main():
    todas = "--todas" in sys.argv
    DESTINO.mkdir(parents=True, exist_ok=True)
    sesion = new_session("u2net_human_seg")
    fotos = []
    for ruta in sorted(ORIGEN.glob("*.jp*g")) + sorted(ORIGEN.glob("*.png")):
        nombre = slug(ruta.stem) + ".webp"
        salida = DESTINO / nombre
        if todas or not salida.exists():
            procesar(ruta, sesion).save(salida, quality=80, method=6)
            print(f"  {ruta.name} -> {nombre} ({salida.stat().st_size // 1024} KB)")
        fotos.append({"img": f"img/hero/{nombre}", "rama": RAMAS.get(ruta.stem, "TODOS")})
    MANIFIESTO.write_text(json.dumps(fotos, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(fotos)} fotos en {MANIFIESTO.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()

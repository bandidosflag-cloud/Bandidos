"""
Recorta a los jugadores de "Fotos jugadores/" (quita el fondo) para los bloques de Inicio.

    python scripts/procesar_fotos_hero.py            # procesa las fotos nuevas
    python scripts/procesar_fotos_hero.py --todas    # vuelve a procesar todas

Salida: app/img/hero/<nombre>.webp (fondo transparente, 640 px de alto) y app/data/fotos_hero.json.
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
ALTO = 640

# VARONIL / FEMENIL / TODOS (coaches o fotos de grupo)
RAMAS = {
    "DSC05269": "FEMENIL", "DSC06145": "FEMENIL", "DSC06191": "FEMENIL", "DSC06236": "TODOS",
    "DSC06289 (1)": "VARONIL", "DSC06290": "VARONIL", "DSC06296": "TODOS", "DSC06379": "VARONIL",
    "DSC06399": "VARONIL", "DSC06558": "FEMENIL", "DSC06591": "FEMENIL", "DSC06661": "FEMENIL",
    "DSC06674": "FEMENIL", "DSC06775": "FEMENIL", "DSC07236": "VARONIL", "DSC07237": "VARONIL",
    "DSC07238": "VARONIL",
}


# Limpieza a mano (fracciones del recorte final): "dejar" = polígono que se conserva, "borrar" = cajas que se quitan
LIMPIEZA = {
    "DSC06145": {"dejar": [(0.38, 0), (1, 0), (1, 1), (0.38, 1), (0.38, 0.6), (0.30, 0.55), (0.22, 0.46),
                           (0.27, 0.3), (0.33, 0.18), (0.38, 0.12)]},
    "DSC06236": {"dejar": [(0.22, 0), (1, 0), (1, 1), (0.22, 1)]},
    "DSC06296": {"dejar": [(0, 0), (0.66, 0), (0.66, 0.28), (0.72, 0.33), (0.78, 0.42), (0.85, 0.52), (0.88, 1), (0, 1)]},
    "DSC07237": {"dejar": [(0.32, 0), (1, 0), (1, 1), (0.16, 1), (0.17, 0.75), (0.2, 0.6), (0.34, 0.55), (0.34, 0.15)],
                 "alto": 0.8},  # sin piernas: ahí estaba la marca de agua
}


def limpiar(rec, reglas):
    a = np.array(rec)
    h, w = a.shape[:2]
    if "dejar" in reglas:
        m = np.zeros((h, w), np.uint8)
        cv2.fillPoly(m, [np.array([(x * w, y * h) for x, y in reglas["dejar"]], np.int32)], 1)
        m = cv2.GaussianBlur(m.astype(np.float32), (7, 7), 0)
        a[..., 3] = (a[..., 3] * m).astype(np.uint8)
    for x0, y0, x1, y1 in reglas.get("borrar", []):
        a[int(y0 * h):int(y1 * h), int(x0 * w):int(x1 * w), 3] = 0
    if "alto" in reglas:
        a = a[:int(reglas["alto"] * h)]
    xs = np.where(a[..., 3].max(axis=0) > 20)[0]
    rec = Image.fromarray(a[:, xs.min():xs.max() + 1])
    return rec if rec.height == ALTO else rec.resize((round(rec.width * ALTO / rec.height), ALTO), Image.LANCZOS)


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


def procesar(ruta, sesion):
    im = ImageOps.exif_transpose(Image.open(ruta)).convert("RGB")
    im.thumbnail((1800, 1800), Image.LANCZOS)
    rgba = np.array(remove(im, session=sesion, post_process_mask=True))
    rgba[..., 3] = sujeto_principal(rgba[..., 3])
    ys, xs = np.where(rgba[..., 3] > 20)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    w, h = x1 - x0, y1 - y0
    # cuerpo completo y lejano -> de la cabeza a las rodillas
    alto = min(h, max(int(w * 1.5), int(h * 0.62)))
    rec = Image.fromarray(rgba[y0:y0 + alto, x0:x1])
    rec = rec.resize((round(rec.width * ALTO / rec.height), ALTO), Image.LANCZOS)
    if ruta.stem in LIMPIEZA:
        rec = limpiar(rec, LIMPIEZA[ruta.stem])
    return rec


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

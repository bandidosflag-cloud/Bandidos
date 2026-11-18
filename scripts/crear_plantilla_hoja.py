"""
Genera plantilla/Bandidos App - plantilla.xlsx con las pestañas que lee la app.
Se sube a Google Drive y se abre con Google Sheets (Archivo > Guardar como Hojas de cálculo de Google).

Uso:  python scripts/crear_plantilla_hoja.py      (requiere: pip install openpyxl)
"""
from pathlib import Path

import openpyxl
from openpyxl.styles import Font, PatternFill
from openpyxl.utils import get_column_letter

SALIDA = Path(__file__).resolve().parent.parent / "plantilla" / "Bandidos App - plantilla.xlsx"

PESTANAS = {
    "config": (["clave", "valor"], [
        ["instagram", ""], ["facebook", ""], ["tiktok", ""], ["mensaje_inicio", ""],
    ]),
    "uniformes": (["id", "nombre", "imagen", "color1", "color2", "numero_color", "descripcion", "usa"], [
        ["rojo", "Rojo", "img/uniformes/rojo.webp", "#C8102E", "#111111", "#E2B33C", "Varonil", "VARONIL"],
        ["blanco", "Blanco", "img/uniformes/blanco.webp", "#F4F4F5", "#E8508C", "#FFFFFF", "Femenil", "FEMENIL"],
        ["negro", "Negro", "img/uniformes/negro.webp", "#111111", "#E2B33C", "#111111", "Varonil y femenil", "TODOS"],
    ]),
    "uniforme_partido": (["torneo", "jornada", "fecha", "rama", "division", "uniforme", "nota"], [
        ["", "", "", "VARONIL", "TODAS", "rojo", "Uniforme normal de varonil"],
        ["", "", "", "FEMENIL", "TODAS", "blanco", "Uniforme normal de femenil"],
    ]),
    "eventos": (["fecha", "fecha_fin", "hora", "hora_fin", "titulo", "tipo", "rama", "lugar", "nota"], [
        ["2026-11-18", "", "18:00", "20:00", "Entrenamiento", "entrenamiento", "TODOS", "Campo Prepa 1", ""],
    ]),
    "avisos": (["fecha", "rama", "texto", "importante"], [
        ["2026-11-17", "TODOS", "Ejemplo de aviso (bórralo)", "no"],
    ]),
    "jugadores": (["rama", "nombre", "posicion", "foto", "apodo"], [
        ["VARONIL", "Balam S.", "", "", ""],
    ]),
    "contactos": (["nombre", "rol", "telefono"], [
        ["Coach Quetzal", "Head coach", ""],
        ["Coach Víctor Gómez", "Coach", ""],
        ["Coach Balam", "Coach", ""],
        ["Coach Eduardo Jalomo", "Coach", ""],
        ["Coach Edú", "Coach", ""],
    ]),
    "sedes": (["nombre", "tipo", "nota", "mapa"], [
        ["Campo Prepa 1", "Entrenamientos y partidos", "Entrenamientos lunes y miércoles 18:00–20:00", ""],
    ]),
    "social": (["url", "descripcion"], []),
}

AYUDA = [
    ["Pestaña", "Para qué sirve", "Notas"],
    ["config", "Redes y mensaje de inicio", "instagram: usuario o link · facebook: link de la página"],
    ["uniformes", "Catálogo de jerseys", "id corto sin espacios · imagen: archivo en img/uniformes/ o link · colores en #hex"],
    ["uniforme_partido", "Qué uniforme toca", "Sin jornada ni fecha = uniforme normal de la rama · Para un partido específico llena jornada O fecha (AAAA-MM-DD) · rama VARONIL/FEMENIL/TODOS · division SILVER/BRONZE/GOLDEN/TODAS · uniforme = id"],
    ["eventos", "Agenda extra", "fecha AAAA-MM-DD · tipo: torneo, entrenamiento, social, otro · rama TODOS/VARONIL/FEMENIL"],
    ["avisos", "Avisos en Inicio", "importante: si/no"],
    ["jugadores", "Posición, foto y apodo", "nombre EXACTO como sale en la liga (ej. 'Balam S.')"],
    ["contactos", "Coaches (sección Info)", "rol: Head coach, Coach… · telefono opcional (abre WhatsApp)"],
    ["social", "Publicaciones de Instagram", "pega el link de cada post o reel"],
    ["sedes", "Sedes en la sección Info", "mapa: link de Google Maps (opcional)"],
]


def main():
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "LEEME"
    for fila in AYUDA:
        ws.append(fila)
    for nombre, (cab, filas) in PESTANAS.items():
        h = wb.create_sheet(nombre)
        h.append(cab)
        for f in filas:
            h.append(f)
    for h in wb.worksheets:
        for c in h[1]:
            c.font = Font(bold=True, color="FFFFFF")
            c.fill = PatternFill("solid", fgColor="D7192D")
        for i in range(1, h.max_column + 1):
            h.column_dimensions[get_column_letter(i)].width = 22 if h.title != "LEEME" else 40
        h.freeze_panes = "A2"
    SALIDA.parent.mkdir(exist_ok=True)
    wb.save(SALIDA)
    print("OK ->", SALIDA)


if __name__ == "__main__":
    main()

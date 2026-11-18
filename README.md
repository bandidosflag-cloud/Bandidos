# Bandidos Flag Football — App interna

App web instalable (PWA) para los jugadores de Bandidos: próximo partido con horario y uniforme, agenda, tabla y líderes de Flag Elite Cuernavaca, roster con estadísticas, uniformes, redes e información.

- **Datos de la liga**: se bajan solos de la página pública de Flag Elite Cuernavaca (Yarai) con `scripts/actualizar_liga.py`.
- **Datos del equipo** (uniforme de cada partido, agenda, avisos, fotos, contactos, redes): se editan en una **Google Sheet**.
- **Costo**: $0 con GitHub Pages.

---

## 1. Probar en tu computadora

```powershell
python scripts/servidor_dev.py
```
Abre http://localhost:5173 (en el navegador, modo celular).

Actualizar datos de la liga a mano:
```powershell
python scripts/actualizar_liga.py
```

## 2. Publicar gratis (GitHub Pages) — una sola vez

1. Crea una cuenta gratis en https://github.com (sugerido: una cuenta de Bandidos).
2. Crea un repositorio nuevo, por ejemplo `bandidos-app` (puede ser **público**; Pages gratis requiere repo público en cuentas gratuitas).
3. Sube esta carpeta completa (o pídele a Claude que lo haga con `git` cuando tengas la cuenta).
4. En el repo: **Settings → Pages → Source: GitHub Actions**.
5. En **Actions** acepta habilitar los workflows y corre **"Actualizar datos de la liga" → Run workflow** una vez.
6. Tu app queda en `https://<tu-usuario>.github.io/bandidos-app/`. Compártela al grupo.

Desde ahí, solo:
- La liga se actualiza **diario a las 6:00** y **cada 2 h los domingos** de juego.
- Cualquier cambio en `app/` se publica en ~1 min.

### Instalar en el celular
- **iPhone (Safari)**: Compartir → *Agregar a pantalla de inicio*.
- **Android (Chrome)**: menú ⋮ → *Instalar app* / *Agregar a la pantalla principal*.

### Estadísticas por partido
La liga solo publica estadísticas **acumuladas**. Cada vez que corre el script guarda una foto de los totales (`scripts/estado/snapshot_stats.json`) y, cuando aparece un resultado nuevo, resta contra la foto anterior para saber qué hizo cada jugador en ese partido (`app/data/stats_partidos.json`). Si en una jornada el equipo jugó 2 partidos, quedan combinados. Si la liga sube el marcador antes que las estadísticas, el script espera a la siguiente corrida. La base se tomó al cierre de la jornada 7, así que el detalle por jugador empieza en la jornada 8.

### Rutina local (mientras no esté publicada)
Hay una tarea programada en la app de Claude ("Bandidos: actualizar resultados y estadísticas") que corre el script domingos y lunes a las 9:00 y 22:00. Solo corre con la app de Claude abierta; ya publicada en GitHub, el workflow hace lo mismo en la nube.

## Notificaciones (OneSignal, gratis)

- Cada jugador toca **"Activar avisos"** en Inicio. En iPhone solo funciona con la app agregada a la pantalla de inicio (iOS 16.4+).
- **Automáticas:** "Ya salió el rol" (cuando la liga publica horarios; lo detecta `actualizar-liga.yml`) y "Hoy hay entreno" (el día de entreno, después de las 14:00).
- **Avisos:** en la hoja, pestaña `avisos`, con `notificar = si` → llega en ~15 min (`notificaciones.yml`). Si `rama` es VARONIL o FEMENIL solo le llega a esa rama.
- Configuración: App ID en `app/js/config.js` (`ONESIGNAL_APP_ID`) y la REST API Key como secreto del repo **`ONESIGNAL_API_KEY`** (Settings → Secrets and variables → Actions). Sin esas claves no se manda nada.
- Probar sin mandar: `python scripts/notificar.py --rol --entreno --avisos --seco`
- Lo ya notificado se guarda en `scripts/estado/notificado.json`.

## 3. Google Sheet (lo que editan los coaches)

1. Sube `plantilla/Bandidos App - plantilla.xlsx` a Google Drive y ábrelo con Google Sheets → *Archivo → Guardar como Hojas de cálculo de Google*.
2. **Compartir → Cualquier persona con el enlace → Lector**.
3. Copia el ID de la URL (`https://docs.google.com/spreadsheets/d/ESTE_ID/edit`) y pégalo en `app/js/config.js` → `SHEET_ID`.
4. Listo: lo que cambien en la hoja aparece en la app al recargar (puede tardar unos minutos).

Pestañas (la pestaña **LEEME** explica cada columna):

| Pestaña | Para qué |
|---|---|
| `config` | instagram, facebook, tiktok, mensaje_inicio |
| `uniformes` | catálogo de jerseys (id, nombre, imagen, colores) |
| `uniforme_partido` | qué uniforme toca por **jornada** o **fecha**, rama y división |
| `eventos` | entrenamientos, torneos, convivios para la Agenda |
| `avisos` | avisos que salen en Inicio |
| `jugadores` | posición, foto y apodo (nombre igual que en la liga, ej. `Balam S.`) |
| `contactos` | coaches/capitanes (abre WhatsApp) |
| `social` | links de publicaciones de Instagram para mostrarlas |

Si `SHEET_ID` está vacío, la app usa `app/data/equipo.json` (mismas pestañas en formato JSON).

## 4. Fotos y jerseys

- Fotos de jugadores: `app/img/jugadores/` (cuadradas, cara centrada, WebP 600×600) y su ruta en la pestaña `jugadores` o en `app/data/equipo.json`.
- Jerseys: `app/img/uniformes/` y el nombre del archivo en la pestaña `uniformes`.

## Estructura

```
app/                 ← lo que se publica
  index.html, sw.js, manifest.webmanifest
  css/styles.css
  js/  app.js (rutas) · datos.js (modelo) · ui.js · sheets.js · config.js
       vistas/ inicio · agenda · partido · liga · equipos · mas
  data/ liga.json (automático) · equipo.json (respaldo de la hoja)
  img/  logos, íconos, jugadores/, uniformes/
scripts/ actualizar_liga.py · crear_plantilla_hoja.py
.github/workflows/  actualizar-liga.yml · publicar.yml
plantilla/  Bandidos App - plantilla.xlsx
```

## Costos opcionales

| Opción | Costo aprox. |
|---|---|
| GitHub Pages + Actions | **$0** |
| Dominio propio (vidabandida.mx / .com) | MXN 300–900 al año |
| Feed automático de Instagram (Behold / Elfsight) | $0 plan básico – USD 6–10/mes |
| Login y confirmar asistencia (Firebase / Supabase) | $0 a este tamaño |
| App Store / Google Play | USD 99/año + USD 25 una vez (no necesario) |

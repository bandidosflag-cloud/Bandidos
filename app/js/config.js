// ============================================================
//  CONFIGURACIÓN — lo único que normalmente hay que tocar aquí
// ============================================================

// ID de la Google Sheet "Bandidos App".
// Es la parte larga de la URL:  https://docs.google.com/spreadsheets/d/  <ESTE_ID>  /edit
// La hoja debe estar compartida como "Cualquier persona con el enlace: Lector".
// Si se deja vacío, la app usa data/equipo.json.
export const SHEET_ID = "1p9SVQg-YJDUKesI_pcOfsBLSkf1YKT8lA5uJxt4ADic";

// Nombres de las pestañas de la hoja (deben coincidir exactamente).
export const PESTANAS = [
  "config", "uniformes", "uniforme_partido", "eventos",
  "avisos", "jugadores", "contactos", "social", "sedes",
];

// Notificaciones push (OneSignal). Es el "App ID" que aparece en OneSignal → Settings → Keys & IDs.
// Si se deja vacío, la app no muestra el botón de activar avisos.
export const ONESIGNAL_APP_ID = "73ea13b9-727c-4e76-8a6d-80fc3637cc93";

// Liga
export const LIGA = {
  nombre: "Flag Elite Cuernavaca",
  url: "https://app.yarai.mx/flag-elite-cuernavaca",
  instagram: "https://www.instagram.com/flag_elite_cuernavaca",
  facebook: "https://www.facebook.com/p/Flag-Elite-Cuernavaca-100083001477475/",
};

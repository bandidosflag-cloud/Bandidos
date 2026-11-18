// Notificaciones push con OneSignal (Web SDK v16).
// La app funciona igual sin esto; solo se activa si hay ONESIGNAL_APP_ID en config.js.
import { ONESIGNAL_APP_ID } from "./config.js";

const DESCARTADO_K = "bandidos.avisos.descartado";
let listo = null;
let alCambiar = () => {};

export const habilitado = () => !!ONESIGNAL_APP_ID;
export const esIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const instalada = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
export const soportado = () => "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;

export function iniciar(onCambio) {
  if (!habilitado() || listo) return listo;
  if (onCambio) alCambiar = onCambio;
  const base = location.pathname.replace(/[^/]*$/, ""); // p. ej. "/Bandidos/"
  listo = new Promise(resolve => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async OneSignal => {
      try {
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          serviceWorkerPath: `${base.slice(1)}sw.js`,
          serviceWorkerParam: { scope: base },
          allowLocalhostAsSecureOrigin: true,
          notifyButton: { enable: false },
          welcomeNotification: { disable: false, title: "Bandidos", message: "¡Listo! Te avisaremos del rol y de los avisos del equipo." },
        });
        OneSignal.User.PushSubscription.addEventListener("change", () => alCambiar());
        OneSignal.Notifications.addEventListener("permissionChange", () => alCambiar());
        resolve(OneSignal);
      } catch (e) {
        console.warn("OneSignal:", e);
        resolve(null);
      }
    });
    const s = document.createElement("script");
    s.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    s.defer = true;
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
  return listo;
}

// "activo" | "pendiente" | "bloqueado" | "instalar" | "no-soportado" | "deshabilitado"
export function estado() {
  if (!habilitado()) return "deshabilitado";
  if (esIOS() && !instalada()) return "instalar";
  if (!soportado()) return "no-soportado";
  if (Notification.permission === "denied") return "bloqueado";
  const os = window.OneSignal;
  if (Notification.permission === "granted" && os?.User?.PushSubscription?.optedIn) return "activo";
  return "pendiente";
}

export async function activar(rama = "TODOS") {
  const OneSignal = await iniciar();
  if (!OneSignal) throw new Error("No se pudo conectar con el servicio de avisos");
  await OneSignal.Notifications.requestPermission();
  if (Notification.permission === "granted") {
    await OneSignal.User.PushSubscription.optIn();
    await etiquetarRama(rama);
  }
  alCambiar();
  return estado();
}

// Para mandar avisos solo a varonil o femenil
export async function etiquetarRama(rama) {
  const OneSignal = window.OneSignal;
  if (!OneSignal?.User?.PushSubscription?.optedIn) return;
  try { await OneSignal.User.addTag("rama", rama || "TODOS"); } catch { /* sin conexión */ }
}

export const descartado = () => { try { return localStorage.getItem(DESCARTADO_K) === "1"; } catch { return false; } };
export const descartar = () => { try { localStorage.setItem(DESCARTADO_K, "1"); } catch { /* */ } };

// Service worker: la app abre sin internet con los últimos datos descargados.
// También recibe las notificaciones push (OneSignal). Si no hay internet al instalar, la app sigue funcionando.
try { importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js"); } catch (e) { /* sin avisos push */ }

const VERSION = "bandidos-v14";
const SHELL = [
  "./", "index.html", "manifest.webmanifest", "css/styles.css",
  "js/app.js", "js/config.js", "js/datos.js", "js/sheets.js", "js/ui.js",
  "js/vistas/inicio.js", "js/vistas/agenda.js", "js/vistas/partido.js",
  "js/vistas/liga.js", "js/vistas/equipos.js", "js/vistas/mas.js", "js/vistas/detalle.js", "js/anim.js", "js/notificaciones.js",
  "img/vida-bandida.webp", "img/vida-bandida-roja.webp", "img/vida-bandida-original.webp", "img/uniformes/rojo.webp", "img/uniformes/blanco.webp", "img/uniformes/negro.webp", "img/vida-bandida-blanca-solida.webp", "img/game-day.webp", "img/vo-studio.webp", "img/vida-bandida-oro.webp", "img/bandido.webp",
  "img/bandida.webp", "img/bandido-blanco.webp", "img/icon-192.png",
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  // Datos y código: primero red (siempre lo más nuevo), si no hay red usa caché.
  e.respondWith(
    fetch(e.request.mode === "navigate" ? e.request : new Request(e.request, { cache: "no-cache" })).then(r => {
      if (r.ok) { const copia = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copia)); }
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});

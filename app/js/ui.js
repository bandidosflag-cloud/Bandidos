// Componentes y utilidades de interfaz.
import { M, norm } from "./datos.js";

export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ---------------- íconos (trazo 2px, 24x24)
const P = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="16.5" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  ball: '<ellipse cx="12" cy="12" rx="10" ry="6" transform="rotate(-45 12 12)"/><path d="m9 15 6-6M10.5 10.5l1 1M12.5 12.5l1 1M8.5 12.5l1 1M12.5 8.5l1 1"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M16 5h3v2a3 3 0 0 1-3 3M8 5H5v2a3 3 0 0 0 3 3M12 13v4M8 21h8M9.5 17h5"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
  shirt: '<path d="M8 3 3.5 5.5 2 10l3.5 1.5V21h13v-9.5L22 10l-1.5-4.5L16 3c-.5 1.6-2 2.5-4 2.5S8.5 4.6 8 3Z"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>',
  info: '<circle cx="12" cy="12" r="9.5"/><path d="M12 11v6M12 7.5v.5"/>',
  pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="9.5"/><path d="M12 7v5l3 2"/>',
  chevL: '<path d="m15 5-7 7 7 7"/>',
  chevR: '<path d="m9 5 7 7-7 7"/>',
  back: '<path d="M19 12H5M11 5l-7 7 7 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2Z"/>',
  crown: '<path d="m3 8 4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8Z"/>',
  ig: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/>',
  fb: '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8Z"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2ZM10 21h4"/>',
  whistle: '<circle cx="9" cy="14" r="6"/><path d="M13 9.5 21 6v4l-6 1.5M9 14h.01"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4"/>',
};
export const ico = (n, cls = "") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ""}</svg>`;

// ---------------- fechas
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const DIAS_L = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MES_C = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const fCorta = d => d ? `${DIAS[d.getDay()]} ${d.getDate()} ${MES_C[d.getMonth()]}` : "";
export const fLarga = d => d ? `${DIAS_L[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}` : "";
export const fDia = d => DIAS[d.getDay()];
export const fMesC = d => MES_C[d.getMonth()];
export function hace(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return `hace ${Math.max(1, Math.round(s / 60))} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  const d = Math.round(s / 86400);
  return d === 1 ? "ayer" : `hace ${d} días`;
}
export const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const ordinal = n => n == null ? "–" : `${n}º`;

// ---------------- escudos y avatares
export const esNuestro = n => /bandid/i.test(n || "");
export function escudo(nombre, rama, cls = "") {
  if (esNuestro(nombre)) {
    const src = rama === "FEMENIL" ? "img/bandida.webp" : "img/bandido.webp";
    return `<span class="escudo nuestro ${cls}"><img src="${src}" alt=""></span>`;
  }
  const ini = (nombre || "?").replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ0-9 ]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  return `<span class="escudo ${cls}" aria-hidden="true">${esc(ini || "?")}</span>`;
}
export function avatar(J, cls = "") {
  const rama = J.fem ? "femenil" : "varonil";
  if (J.foto) return `<span class="avatar ${rama} ${cls}"><img src="${esc(J.foto)}" alt="" loading="lazy"></span>`;
  const num = J.numero && J.numero !== "–" ? J.numero : (J.nombre || "?").split(" ").map(w => w[0]).join("").slice(0, 2);
  return `<span class="avatar ${rama} ${cls}">${esc(num)}</span>`;
}
export const tagRama = (rama, txt) => `<span class="tag ${rama === "FEMENIL" ? "femenil" : "varonil"}">${esc(txt || (rama === "FEMENIL" ? "Femenil" : "Varonil"))}</span>`;

// ---------------- jersey (SVG) cuando no hay foto del uniforme
export function jersey(u) {
  const c1 = u?.color1 || "#2A2B30", c2 = u?.color2 || "#D7192D", cn = u?.numero_color || "#fff";
  return `<svg viewBox="0 0 120 120" aria-hidden="true">
    <path d="M40 14 18 24l-10 28 16 6 4-10v58h64V48l4 10 16-6-10-28-22-10c-3 8-10 12-20 12s-17-4-20-12Z" fill="${c1}" stroke="rgba(255,255,255,.18)" stroke-width="1.5"/>
    <path d="M40 14c3 8 10 12 20 12s17-4 20-12" fill="none" stroke="${c2}" stroke-width="5"/>
    <path d="M8 52l16 6 2-6-15-6zM112 52l-16 6-2-6 15-6z" fill="${c2}"/>
    <text x="60" y="80" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="800" font-size="34" fill="${cn}">00</text>
  </svg>`;
}
export function uniformeImg(u) {
  return u?.imagen ? `<img src="${esc(u.imagen)}" alt="${esc(u.nombre)}" loading="lazy">` : jersey(u);
}

// ---------------- tarjeta de partido
export function tarjetaPartido(p, { mostrarDiv = true } = {}) {
  const fin = p.estado === "Final";
  const cancel = /cancel/i.test(p.estado);
  const L = p.local, V = p.visita;
  const ladoCls = (x, y) => fin && x.pts < y.pts ? "pierde" : "";
  const centro = fin
    ? `<div class="marcador"><span class="${L.pts >= V.pts ? "g" : "p"}">${L.pts}</span><span class="sep">-</span><span class="${V.pts >= L.pts ? "g" : "p"}">${V.pts}</span></div>`
    : cancel ? `<div class="hora"><small>Cancelado</small>—</div>`
    : `<div class="hora">${esc(p.hora || "--:--")}<small>${esc(fCorta(p.dt))}</small></div>`;
  const badge = p.res ? `<span class="res-badge ${p.res}">${p.res === "G" ? "GANADO" : p.res === "P" ? "PERDIDO" : "EMPATE"}</span>`
    : cancel ? `<span class="res-badge X">CANCELADO</span>` : "";
  const cls = p.res === "G" ? "nuestro-g" : p.res === "P" ? "nuestro-p" : "";
  return `<div class="partido ${cls}" data-partido="${p.id}" role="button" tabindex="0" aria-label="${esc(L.nombre)} vs ${esc(V.nombre)}">
    <div class="meta"><div class="izq">${mostrarDiv ? tagRama(p.rama, `${p.rama === "FEMENIL" ? "Fem" : "Var"} · ${p.division[0]}${p.division.slice(1).toLowerCase()}`) : ""}<span>${fin ? esc(fCorta(p.dt)) + " · " : ""}J${p.jornada ?? "–"} · ${esc(p.campo || "")}</span></div>${badge}</div>
    <div class="enc">
      <div class="lado ${ladoCls(L, V)}">${escudo(L.nombre, p.rama, "sm")}<span class="n">${esc(L.nombre)}</span></div>
      ${centro}
      <div class="lado der ${ladoCls(V, L)}">${escudo(V.nombre, p.rama, "sm")}<span class="n">${esc(V.nombre)}</span></div>
    </div>
  </div>`;
}

export function enlaceMapa(sede) {
  const s = (M.extra?.sedes || []).find(x => norm(x.nombre) === norm(sede));
  return s?.mapa || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sede + ", Cuernavaca, Morelos")}`;
}

// ---------------- agregar partido a Google Calendar
const DURACION_MIN = 50;
const URL_APP = "https://bandidosflag-cloud.github.io/Bandidos/";

export function tituloEvento(p) {
  const rama = p.rama === "FEMENIL" ? "Femenil" : "Varonil";
  return `${p.local.nombre} vs ${p.visita.nombre} · ${rama} ${p.division[0]}${p.division.slice(1).toLowerCase()}`;
}
export function lugarEvento(p) { return [p.sede, p.campo].filter(Boolean).join(" · ") + ", Cuernavaca, Morelos"; }
export function detallesEvento(p) {
  const u = p.uniforme;
  return [
    `Jornada ${p.jornada ?? "–"} · ${M.torneo?.nombre || "Flag Elite Cuernavaca"}`,
    `Uniforme: ${u ? u.nombre + (u.nota ? ` (${u.nota})` : "") : "por confirmar"}`,
    `Sede: ${[p.sede, p.campo].filter(Boolean).join(" · ")}`,
    `Ubicación: ${enlaceMapa(p.sede)}`,
    p.nota ? `Nota: ${p.nota}` : "",
    `App Bandidos: ${URL_APP}`,
  ].filter(Boolean).join("\n");
}
export function enlaceGoogleCal(p) {
  const pad = n => String(n).padStart(2, "0");
  const f = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const fin = new Date(p.dt.getTime() + DURACION_MIN * 60000);
  const q = new URLSearchParams({
    action: "TEMPLATE", text: tituloEvento(p), dates: `${f(p.dt)}/${f(fin)}`, ctz: "America/Mexico_City",
    details: detallesEvento(p), location: lugarEvento(p),
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

// Ícono de Google Calendar (a color)
export const icoGCal = () => `<svg class="gcal" viewBox="0 0 24 24" aria-hidden="true">
  <path d="M5 2h14l3 3v11l-6 6H5a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3Z" fill="#4285F4"/>
  <path d="M2 16h14v6H5a3 3 0 0 1-3-3Z" fill="#34A853"/><path d="M16 2h3a3 3 0 0 1 3 3v11h-6Z" fill="#FBBC04"/>
  <path d="M16 16h6l-6 6Z" fill="#EA4335"/><rect x="6" y="6" width="10" height="10" fill="#fff"/>
  <text x="11" y="14.2" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="7" fill="#4285F4">31</text></svg>`;

// El botón abre Google Calendar con el partido ya lleno (en cualquier teléfono o computadora).
export function agregarAlCalendario(p) {
  window.open(enlaceGoogleCal(p), "_blank", "noopener");
}

export const jugadorPorNombre = (rama, nombre) => M.jugadores.find(j => j.rama === rama && norm(j.nombre) === norm(nombre));

// Crédito del desarrollador (pie de Inicio e Info)
export const creditoVO = () => `<a class="credito-vo" href="https://www.instagram.com/vo.studio.mx/" target="_blank" rel="noopener"><span>App desarrollada por</span>
  <img src="img/vo-studio.webp" alt="VO Studio" width="61" height="40"><b>VO Studio MX</b></a>`;

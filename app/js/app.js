import { M, cargar } from "./datos.js";
import { ico, agregarAlCalendario } from "./ui.js";
import * as Inicio from "./vistas/inicio.js";
import * as Agenda from "./vistas/agenda.js";
import * as Partido from "./vistas/partido.js";
import * as Liga from "./vistas/liga.js";
import * as Equipos from "./vistas/equipos.js";
import * as Mas from "./vistas/mas.js";
import * as Detalle from "./vistas/detalle.js";
import { pildora, revelar, transicion } from "./anim.js";
import * as Notif from "./notificaciones.js";

const $vista = document.getElementById("vista");
const $hoja = document.getElementById("hoja");
const RAMA_K = "bandidos.rama";
let rama = (() => { try { return localStorage.getItem(RAMA_K) || "TODOS"; } catch { return "TODOS"; } })();

// íconos estáticos
document.querySelectorAll("[data-icon]").forEach(el => { el.innerHTML = ico(el.dataset.icon); });
document.getElementById("btn-mas").innerHTML = ico("grid");

const RUTAS = [
  [/^\/?$/, "inicio", () => ({ html: Inicio.render(rama), montar: r => { Inicio.iniciarCuentas(r); Inicio.iniciarFotos(r); } })],
  [/^\/agenda$/, "agenda", () => ({ html: Agenda.render(rama), montar: Agenda.montar })],
  [/^\/partido$/, "partido", () => ({ html: Partido.render(rama) })],
  [/^\/partido\/([\w-]+)$/, "partido", m => ({ html: `<a href="javascript:history.back()" class="link flex" style="gap:6px;margin:4px 0 10px">← Regresar</a>` + Detalle.render(m[1]) })],
  [/^\/liga$/, "liga", () => ({ html: Liga.render(rama), montar: Liga.montar })],
  [/^\/equipos$/, "equipos", () => ({ html: Equipos.renderLista(rama) })],
  [/^\/equipo\/([\w-]+)$/, "equipos", m => ({ html: Equipos.renderEquipo(m[1]), montar: Equipos.montar })],
  [/^\/jugador\/([\w-]+)$/, "equipos", m => ({ html: Equipos.renderJugador(m[1]) })],
  [/^\/uniformes$/, null, () => ({ html: Mas.renderUniformes() })],
  [/^\/social$/, null, () => ({ html: Mas.renderSocial() })],
  [/^\/info$/, null, () => ({ html: Mas.renderInfo() })],
  [/^\/avisos$/, null, () => ({ html: Mas.renderAvisos(rama) })],
];

const ORDEN = { inicio: 0, agenda: 1, partido: 2, liga: 3, equipos: 4 };
const $tabbar = document.querySelector(".tabbar");
const $rama = document.querySelector(".rama-switch");
let rutaPrevia = null, tabPrevia = null;

function resolver() {
  const ruta = (location.hash.replace(/^#/, "") || "/").split("?")[0];
  for (const r of RUTAS) { const x = ruta.match(r[0]); if (x) return { ruta, hit: r, m: x }; }
  return { ruta, hit: RUTAS[0], m: [] };
}

function pildoras(animar = true) {
  pildora($rama, "rama", '[aria-selected="true"]', { animar });
  pildora($tabbar, "tab", 'a[aria-current]:not(.tab-centro) .tab-in', { animar });
  $vista.querySelectorAll(".seg").forEach((seg, i) => pildora(seg, `seg-${rutaPrevia}-${i}`, '[aria-pressed="true"]', { animar }));
}

// modo: "pagina" (cambio de ruta), "rama" (cambió el filtro), "local" (re-render dentro de la vista)
function render({ modo = "pagina" } = {}) {
  const { ruta, hit, m } = resolver();
  const { html, montar } = hit[2](m);
  const cambioRuta = ruta !== rutaPrevia;
  $vista.innerHTML = html;
  document.querySelectorAll(".tabbar a").forEach(a => {
    if (a.dataset.tab === hit[1]) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  rutaPrevia = ruta;
  tabPrevia = hit[1];
  if (montar) montar($vista, () => render({ modo: "local" }));
  $vista.querySelectorAll("[data-ir-liga]").forEach(a => a.addEventListener("click", () => Liga.irDivision(a.dataset.irLiga)));
  if (cambioRuta && modo === "pagina") window.scrollTo({ top: 0 });
  pildoras(modo !== "inicial");
  if (modo !== "local") revelar($vista);
}

function irA() {
  const { hit } = resolver();
  const a = ORDEN[tabPrevia], b = ORDEN[hit[1]];
  const dir = a == null || b == null || a === b ? "arriba" : b > a ? "der" : "izq";
  transicion(sinVT => {
    render({ modo: "pagina" });
    if (sinVT) { $vista.classList.remove("vista-enter"); void $vista.offsetWidth; $vista.classList.add("vista-enter"); }
  }, dir);
}

function pintarRama() {
  document.querySelectorAll(".rama-switch button").forEach(b => b.setAttribute("aria-selected", b.dataset.rama === rama));
}
document.querySelectorAll(".rama-switch button").forEach(b => b.addEventListener("click", () => {
  rama = b.dataset.rama;
  try { localStorage.setItem(RAMA_K, rama); } catch { /* */ }
  pintarRama();
  Notif.etiquetarRama(rama);
  render({ modo: "rama" });
}));

// hoja "Más"
function abrirHoja(html) {
  document.getElementById("hoja-contenido").innerHTML = html;
  $hoja.hidden = false;
  document.body.style.overflow = "hidden";
}
function cerrarHoja() { $hoja.hidden = true; document.body.style.overflow = ""; }
document.getElementById("btn-mas").addEventListener("click", () => abrirHoja(Mas.menu()));
$hoja.addEventListener("click", e => { if (e.target.closest("[data-cerrar]")) cerrarHoja(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$hoja.hidden) cerrarHoja(); });

// activar / ocultar avisos
document.addEventListener("click", async e => {
  const act = e.target.closest("[data-activar-avisos]");
  if (act) {
    act.disabled = true; act.textContent = "Activando…";
    try { await Notif.activar(rama); } catch (err) { alert(err.message); }
    render({ modo: "local" });
    return;
  }
  if (e.target.closest("[data-descartar-avisos]")) { Notif.descartar(); render({ modo: "local" }); }
});

// agregar al calendario  /  abrir vista de partido
document.addEventListener("click", e => {
  const b = e.target.closest("[data-ics]");
  if (b) {
    e.preventDefault();
    const p = M.partidos.find(x => x.id === b.dataset.ics);
    if (p) agregarAlCalendario(p);
    return;
  }
  const t = e.target.closest("[data-partido]");
  if (t && !e.target.closest("a[href]")) {
    abrirHoja(Detalle.render(t.dataset.partido));
    document.querySelector(".hoja-panel").scrollTop = 0;
  }
});
document.addEventListener("keydown", e => {
  const t = e.target.closest?.("[data-partido]");
  if (t && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); t.click(); }
});

window.addEventListener("hashchange", () => { cerrarHoja(); irA(); });
window.addEventListener("resize", () => pildoras(false));
document.fonts?.ready.then(() => pildoras(false));

// arranque
$vista.innerHTML = `<div class="cargando"><img src="img/vida-bandida.webp" alt="Cargando"></div>`;
pintarRama();
Notif.iniciar(() => render({ modo: "local" }));
cargar(() => render({ modo: "local" }))
  .then(() => render({ modo: "inicial" }))
  .catch(err => {
    console.error(err);
    $vista.innerHTML = `<div class="vacio mt-20"><b>No se pudieron cargar los datos</b>Revisa tu conexión e intenta de nuevo.</div>`;
  });

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

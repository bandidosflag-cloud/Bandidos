// Animaciones: píldora "líquida" para selectores, aparición al hacer scroll y transición de páginas.
export const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const prev = {};

/**
 * Coloca (y anima) una píldora detrás del elemento seleccionado de `cont`.
 * Entre la posición vieja y la nueva la píldora se estira y se aplana un poco,
 * como una gota que se arrastra, y luego se asienta.
 */
export function pildora(cont, clave, selector, { animar = true } = {}) {
  if (!cont) return;
  let p = cont.querySelector(":scope > .pildora");
  if (!p) { p = document.createElement("span"); p.className = "pildora"; p.setAttribute("aria-hidden", "true"); cont.prepend(p); }
  const t = selector ? cont.querySelector(selector) : null;
  if (!t) {
    if (prev[clave] && animar && !reduce) p.animate([{ opacity: 1, scale: 1 }, { opacity: 0, scale: .6 }], { duration: 260, easing: "ease-out" });
    p.style.opacity = "0";
    prev[clave] = null;
    return;
  }
  const cr = cont.getBoundingClientRect(), tr = t.getBoundingClientRect();
  const x = tr.left - cr.left - cont.clientLeft, y = tr.top - cr.top - cont.clientTop, w = tr.width, h = tr.height;
  p.dataset.valor = t.dataset.rama || t.dataset.tab || "";
  p.style.opacity = "1";
  p.style.width = `${w}px`;
  p.style.height = `${h}px`;
  p.style.transform = `translate(${x}px, ${y}px)`;
  const a = prev[clave];
  prev[clave] = { x, y, w, h };
  if (!animar || reduce) return;
  if (!a) { // aparece
    p.animate([{ opacity: 0, transform: `translate(${x}px, ${y}px) scale(.6)` }, { opacity: 1, transform: `translate(${x}px, ${y}px) scale(1)` }],
      { duration: 360, easing: "cubic-bezier(.3,1.4,.5,1)" });
    return;
  }
  if (Math.abs(a.x - x) < 1 && Math.abs(a.w - w) < 1) return;
  const izq = Math.min(a.x, x), der = Math.max(a.x + a.w, x + w);
  const tramo = der - izq;
  const haciaDer = x > a.x;
  // a la mitad: se estira hacia el destino (el borde de adelante va primero)
  const anchoMedio = Math.max(w, a.w) + (tramo - Math.max(w, a.w)) * 0.7;
  const xMedio = haciaDer ? der - anchoMedio - (tramo - anchoMedio) * 0.15 : izq + (tramo - anchoMedio) * 0.15;
  const hMedio = h * 0.86;
  p.animate([
    { width: `${a.w}px`, height: `${a.h}px`, transform: `translate(${a.x}px, ${a.y}px)` },
    { offset: 0.45, width: `${anchoMedio}px`, height: `${hMedio}px`, transform: `translate(${xMedio}px, ${y + (h - hMedio) / 2}px)` },
    { offset: 0.8, width: `${w * 1.04}px`, height: `${h * 0.97}px`, transform: `translate(${x - w * 0.02}px, ${y + h * 0.015}px)` },
    { width: `${w}px`, height: `${h}px`, transform: `translate(${x}px, ${y}px)` },
  ], { duration: 560, easing: "cubic-bezier(.32,.72,.24,1)" });
}

export function olvidar(clave) { delete prev[clave]; }

// ---------- aparición al hacer scroll
const SEL = ".hero, .destacada, .eq-card, .partido, .rank-card, .lider-card, .jug, .ev, .fila-link, .uni, .tabla-wrap, .mini-pos, .cal, .seccion-cab, .equipo-hero, .perfil-div, .menu-item, .vacio, .detalle-datos";
let io = null;
export function revelar(raiz) {
  if (reduce || !("IntersectionObserver" in window)) return;
  io?.disconnect();
  io = new IntersectionObserver(ents => {
    for (const e of ents) if (e.isIntersecting) { e.target.classList.add("rv-in"); io.unobserve(e.target); }
  }, { rootMargin: "0px 0px -6% 0px", threshold: 0.08 });
  const vistos = new Map();
  raiz.querySelectorAll(SEL).forEach(el => {
    if (el.parentElement.closest(".rv")) return; // no animar dentro de algo que ya se anima
    const padre = el.parentElement;
    const i = vistos.get(padre) || 0;
    vistos.set(padre, i + 1);
    el.classList.add("rv");
    el.style.setProperty("--rv-d", `${Math.min(i, 7) * 45}ms`);
    io.observe(el);
  });
}

// ---------- transición entre páginas (View Transitions API, con respaldo)
export function transicion(cambiar, dir = "arriba") {
  document.documentElement.dataset.dir = dir;
  if (reduce || !document.startViewTransition) { cambiar(true); return; }
  document.startViewTransition(() => cambiar(false));
}

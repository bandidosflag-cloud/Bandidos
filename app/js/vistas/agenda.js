import { M, filtraRama, inicioDia } from "../datos.js";
import { esc, ico, MESES, ymd, fDia, fMesC, fLarga, escudo } from "../ui.js";

const st = { mes: null, sel: null };
// cono de entrenamiento
const CONO = `<svg class="cono-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M10.2 3h3.6l5.4 15H4.8L10.2 3Z" fill="#F4F4F5"/><path d="M8.6 8h6.8l1.2 3.5H7.4L8.6 8Z" fill="#D7192D"/><path d="M6.6 13.5h10.8l.9 2.5H5.7l.9-2.5Z" fill="#D7192D"/><rect x="2.5" y="18" width="19" height="3" rx="1.2" fill="#F4F4F5"/></svg>`;

function eventos(rama) {
  const out = [];
  for (const p of filtraRama(M.partidos, rama)) {
    if (!p.dt) continue;
    out.push({
      tipo: "partido", fecha: p.fecha, dt: p.dt, rama: p.rama, p,
      titulo: `${p.nos.nombre} vs ${p.rival.nombre}`,
      sub: `${p.equipo.etiqueta} · ${p.hora} · ${p.campo}`,
    });
  }
  for (const t of M.liga.torneos || []) {
    if (!t.participamos) continue;
    if (t.inicio) out.push({ tipo: "evento", fecha: t.inicio, dt: new Date(t.inicio + "T09:00"), titulo: `Arranca ${t.nombre}`, sub: "Flag Elite Cuernavaca" });
    if (t.fin) out.push({ tipo: "evento", fecha: t.fin, dt: new Date(t.fin + "T09:00"), titulo: `Cierre ${t.nombre}`, sub: "Fin de temporada (según la liga)" });
  }
  for (const e of M.extra.eventos || []) {
    if (!e.fecha) continue;
    const r = (e.rama || "").toUpperCase();
    if (rama !== "TODOS" && r && r !== "TODOS" && r !== rama) continue;
    const entreno = /entren/i.test(e.tipo || "");
    const horario = e.hora ? (e.hora_fin ? `${e.hora}–${e.hora_fin}` : e.hora) : "";
    out.push({
      tipo: "evento", sub_tipo: entreno ? "entreno" : (e.tipo || "").toLowerCase(), fecha: e.fecha, fin: e.fecha_fin || "",
      dt: new Date(`${e.fecha}T${e.hora || "09:00"}`), titulo: e.titulo,
      sub: [entreno ? "" : e.tipo, horario, e.lugar, e.nota].filter(Boolean).join(" · "),
    });
  }
  return out.sort((a, b) => a.dt - b.dt);
}

function itemEvento(ev) {
  const d = ev.dt;
  if (ev.tipo === "partido") {
    const p = ev.p;
    const res = p.res ? `<span class="res-badge ${p.res}">${p.nos.pts}-${p.rival.pts}</span>` :
      (p.estado === "Programado" ? `<button class="icon-btn" data-ics="${p.id}" aria-label="Agregar al calendario" style="width:34px;height:34px">${ico("plus")}</button>` : `<span class="res-badge X">${esc(p.estado)}</span>`);
    return `<div class="ev" data-partido="${p.id}" role="button" tabindex="0"><div class="fecha" style="${p.rama === "FEMENIL" ? "box-shadow:inset 0 -3px 0 var(--pink)" : "box-shadow:inset 0 -3px 0 var(--red)"}"><b>${d.getDate()}</b><span>${fDia(d)}</span></div>
      <div><div class="t flex" style="gap:6px">${escudo(p.rival.nombre, p.rama, "xs")}${esc(ev.titulo)}</div><div class="s">${esc(ev.sub)}</div></div>${res}</div>`;
  }
  const fin = ev.fin ? new Date(ev.fin + "T12:00") : null;
  if (ev.sub_tipo === "entreno") {
    return `<div class="ev entreno"><div class="fecha"><b>${d.getDate()}</b><span>${fDia(d)}</span></div>
      <div><div class="t flex" style="gap:6px">${CONO}${esc(ev.titulo)}</div><div class="s">${esc(ev.sub)}</div></div><span></span></div>`;
  }
  return `<div class="ev evento"><div class="fecha"><b ${fin ? 'style="font-size:19px"' : ""}>${d.getDate()}${fin ? `–${fin.getDate()}` : ""}</b><span>${fMesC(d)}</span></div>
    <div><div class="t">${esc(ev.titulo)}</div><div class="s">${esc(ev.sub)}</div></div><span></span></div>`;
}

export function render(rama) {
  const hoy = inicioDia(M.hoy);
  if (!st.mes) st.mes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const evs = eventos(rama);
  const porDia = {};
  evs.forEach(e => {
    const d = new Date(e.fecha + "T12:00"), f = new Date((e.fin || e.fecha) + "T12:00");
    for (let i = 0; d <= f && i < 31; i++, d.setDate(d.getDate() + 1)) (porDia[ymd(d)] ||= []).push(e);
  });

  const m = st.mes;
  const inicio = new Date(m); inicio.setDate(1 - ((m.getDay() + 6) % 7)); // semana inicia lunes
  const celdas = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(inicio); d.setDate(inicio.getDate() + i);
    if (i >= 35 && d.getMonth() !== m.getMonth()) break;
    const k = ymd(d);
    const lista = porDia[k] || [];
    const puntos = lista.slice(0, 3).map(e => e.sub_tipo === "entreno" ? `<i class="cono">${CONO}</i>`
      : `<i class="${e.tipo === "evento" ? "evento" : e.rama === "FEMENIL" ? "femenil" : ""}"></i>`).join("");
    const cls = [d.getMonth() !== m.getMonth() ? "fuera" : "", k === ymd(hoy) ? "hoy" : "", k === st.sel ? "sel" : ""].join(" ");
    celdas.push(`<button class="${cls}" data-dia="${k}" aria-label="${esc(fLarga(d))}${lista.length ? `, ${lista.length} eventos` : ""}">${d.getDate()}<span class="puntos">${puntos}</span></button>`);
  }

  let lista, tituloLista;
  if (st.sel) {
    lista = porDia[st.sel] || [];
    tituloLista = fLarga(new Date(st.sel + "T12:00"));
  } else {
    lista = evs.filter(e => e.dt.getMonth() === m.getMonth() && e.dt.getFullYear() === m.getFullYear());
    tituloLista = `${MESES[m.getMonth()]} ${m.getFullYear()}`;
  }
  const proximos = evs.filter(e => e.dt >= hoy).slice(0, 4);

  return `
    <div class="cal-cab">
      <h2>${MESES[m.getMonth()]} <span class="muted" style="font-weight:600">${m.getFullYear()}</span></h2>
      <div class="cal-nav">
        <button class="icon-btn" data-mes="-1" aria-label="Mes anterior">${ico("chevL")}</button>
        <button class="icon-btn" data-mes="0" aria-label="Hoy" style="width:auto;padding:0 14px;border-radius:999px;font-size:13px;font-weight:600">Hoy</button>
        <button class="icon-btn" data-mes="1" aria-label="Mes siguiente">${ico("chevR")}</button>
      </div>
    </div>
    <div class="cal">
      <div class="cal-dias">${["L", "M", "M", "J", "V", "S", "D"].map(x => `<span>${x}</span>`).join("")}</div>
      <div class="cal-grid">${celdas.join("")}</div>
      <div class="cal-leyenda"><span><i style="background:var(--red)"></i>Varonil</span><span><i style="background:var(--pink)"></i>Femenil</span><span><i style="background:var(--gold)"></i>Eventos</span><span class="ley-cono">${CONO}Entreno</span></div>
    </div>

    ${!st.sel && proximos.length ? `<section class="seccion"><div class="seccion-cab"><h2>Lo que viene</h2></div><div class="lista">${proximos.map(itemEvento).join("")}</div></section>` : ""}

    <section class="seccion">
      <div class="seccion-cab"><h2 style="text-transform:capitalize">${esc(tituloLista)}</h2>${st.sel ? `<a href="#" data-limpiar>Ver mes</a>` : ""}</div>
      <div class="lista">${lista.length ? lista.map(itemEvento).join("") : `<div class="vacio"><b>Sin eventos</b>Los coaches pueden agregar entrenamientos y torneos en la hoja de Bandidos.</div>`}</div>
    </section>`;
}

export function montar(raiz, rerender) {
  raiz.querySelectorAll("[data-mes]").forEach(b => b.onclick = () => {
    const n = Number(b.dataset.mes);
    const h = inicioDia(M.hoy);
    st.mes = n === 0 ? new Date(h.getFullYear(), h.getMonth(), 1) : new Date(st.mes.getFullYear(), st.mes.getMonth() + n, 1);
    st.sel = n === 0 ? ymd(h) : null;
    rerender();
  });
  raiz.querySelectorAll("[data-dia]").forEach(b => b.onclick = () => {
    st.sel = st.sel === b.dataset.dia ? null : b.dataset.dia;
    const d = new Date(b.dataset.dia + "T12:00");
    if (d.getMonth() !== st.mes.getMonth()) st.mes = new Date(d.getFullYear(), d.getMonth(), 1);
    rerender();
  });
  const l = raiz.querySelector("[data-limpiar]");
  if (l) l.onclick = e => { e.preventDefault(); st.sel = null; rerender(); };
}


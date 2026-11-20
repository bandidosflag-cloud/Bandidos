import { M, filtraRama } from "../datos.js";
import { esc, ico, fCorta, escudo, ordinal, uniformeImg, enlaceMapa, tarjetaPartido, tagRama, icoGCal } from "../ui.js";
import { tarjetaProximo } from "./inicio.js";

function filaRival(e, nombre) {
  return e.tabla.find(f => f.equipo === nombre);
}

function fichaEquipo(e) {
  const p = e.proximo;
  if (!p) {
    const u = e.ultimo;
    return `<div class="card">
      <div class="flex entre"><div class="flex"><img src="${e.logo}" alt="" style="height:34px;width:auto"><div><b class="display" style="font-size:18px">${esc(e.nombre)}</b><div class="peq muted">${esc(e.etiqueta)} · ${ordinal(e.pos)} de ${e.total}</div></div></div>${tagRama(e.rama, e.divTxt)}</div>
      <p class="peq muted" style="margin:12px 0 10px">Sin partido programado todavía.</p>
      ${u ? `<div class="eyebrow" style="margin-bottom:8px">Último partido</div>${tarjetaPartido(u, { mostrarDiv: false })}` : ""}
    </div>`;
  }
  const r = filaRival(e, p.rival.nombre);
  const h2h = e.partidos.filter(x => x.res && x.rival.nombre === p.rival.nombre);
  const u = p.uniforme;
  return `<div class="card">
    <div class="flex entre"><div class="flex"><img src="${e.logo}" alt="" style="height:34px;width:auto"><div><b class="display" style="font-size:18px">${esc(e.nombre)}</b><div class="peq muted">${esc(e.etiqueta)}</div></div></div>${tagRama(e.rama, e.divTxt)}</div>
    <div class="flex mt-16" style="gap:14px">
      ${escudo(p.rival.nombre, p.rama)}
      <div style="flex:1"><div class="peq muted">vs</div><b class="display" style="font-size:22px">${esc(p.rival.nombre)}</b>
      <div class="peq muted">${r ? `${ordinal(r.pos)} · ${r.jg}-${r.jp} · DIF ${r.dif}` : ""}</div></div>
      <div style="text-align:right"><b class="display" style="font-size:30px">${esc(p.hora)}</b><div class="peq muted">${esc(fCorta(p.dt))}</div></div>
    </div>
    <div class="uni-mini mt-16" style="background:var(--card-2);border-radius:14px;padding:10px">
      <div class="img" style="width:64px;height:64px;background:var(--bg)">${uniformeImg(u)}</div>
      <div><div class="eyebrow">Uniforme</div><b style="font-size:16px">${u ? esc(u.nombre) : "Por confirmar"}</b>${u?.nota ? `<div class="peq muted">${esc(u.nota)}</div>` : ""}</div>
    </div>
    <div class="botones mt-12">
      <a class="boton sec" href="${enlaceMapa(p.sede)}" target="_blank" rel="noopener">${ico("pin")}${esc(p.campo)} · Mapa</a>
      <button class="boton sec" data-ics="${p.id}">${icoGCal()}Google Calendar</button>
    </div>
    ${h2h.length ? `<div class="eyebrow mt-16" style="margin-bottom:8px">Antes contra ${esc(p.rival.nombre)}</div>${h2h.map(x => tarjetaPartido(x, { mostrarDiv: false })).join("")}` : ""}
  </div>`;
}

export function render(rama) {
  const equipos = filtraRama(M.equipos, rama).slice().sort((a, b) => (a.proximo?.dt || 9e15) - (b.proximo?.dt || 9e15));
  return `
    <div class="eyebrow mt-8">Jornada siguiente</div>
    <h1 class="titulo-xl">Próximo<br><span class="suave">partido</span></h1>
    <section class="seccion">${tarjetaProximo(rama, { conLink: false })}</section>
    <section class="seccion"><div class="seccion-cab"><h2>Por equipo</h2></div>
      <div class="lista">${equipos.map(fichaEquipo).join("")}</div>
    </section>
    <p class="nota-pie">Horarios oficiales: <a class="link" href="${esc(M.torneo?.url || M.liga.fuente)}" target="_blank" rel="noopener">Flag Elite Cuernavaca ${ico("ext").replace("<svg", '<svg style="width:12px;height:12px;vertical-align:-1px"')}</a></p>
  `;
}

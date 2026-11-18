import { M, filtraRama } from "../datos.js";
import { esc, ico, escudo, tarjetaPartido, hace, jugadorPorNombre, avatar, fCorta } from "../ui.js";

const st = { div: null, tab: "tabla", soloNuestros: false };

export function tablaHTML(e, { compacta = false } = {}) {
  return `<div class="tabla-wrap"><table class="tabla">
    <thead><tr><th>#</th><th>Equipo</th><th>JJ</th><th>JG</th><th>JP</th>${compacta ? "" : `<th class="solo-ancho">PF</th><th class="solo-ancho">PC</th>`}<th>DIF</th></tr></thead>
    <tbody>${e.tabla.map(f => `<tr class="${f.nuestro ? "nuestro" : ""} ${e.fem ? "femenil" : ""} ${f.pos === 1 ? "top1" : ""}">
      <td><span class="rk">${f.pos}</span></td>
      <td class="eq"><div>${escudo(f.equipo, e.rama, "xs")}<span>${esc(f.equipo)}</span></div></td>
      <td>${f.jj}</td><td class="fuerte">${f.jg}</td><td>${f.jp}</td>
      ${compacta ? "" : `<td class="solo-ancho">${f.pf}</td><td class="solo-ancho">${f.pc}</td>`}
      <td class="${f.dif > 0 ? "dif-mas" : f.dif < 0 ? "dif-menos" : ""}">${f.dif > 0 ? "+" : ""}${f.dif}</td></tr>`).join("")}
    </tbody></table></div>`;
}

export function render(rama) {
  const equipos = filtraRama(M.equipos, rama);
  if (!equipos.find(e => e.key === st.div)) st.div = equipos[0]?.key;
  const e = M.equipos.find(x => x.key === st.div);
  if (!e) return `<div class="vacio">Sin datos.</div>`;

  let cuerpo = "";
  if (st.tab === "tabla") {
    cuerpo = `${tablaHTML(e)}<p class="nota-pie">Orden de la liga: juegos ganados; si empatan, diferencia de puntos.</p>`;
  } else if (st.tab === "partidos") {
    const ps = e.partidos;
    const porJ = {};
    ps.forEach(p => (porJ[p.jornada ?? 0] ||= []).push(p));
    const js = Object.keys(porJ).map(Number).sort((a, b) => b - a);
    const pend = M.torneo?.rol_pendiente;
    cuerpo = `<div class="flex entre"><span class="peq muted">${ps.length} partidos de ${esc(e.nombre)} · ${e.jg}-${e.jp}</span></div>
      ${pend && !e.proximo ? `<div class="vacio mt-12"><b>Jornada ${pend}: rol pendiente</b>La liga aún no publica horarios y campos.</div>` : ""}
      ${js.map(j => `<div class="jornada-cab"><h3>Jornada ${j}</h3><span>${esc(fCorta(porJ[j][0].dt))}</span></div>
        <div class="lista">${porJ[j].map(p => tarjetaPartido(p, { mostrarDiv: false })).join("")}</div>`).join("")}`;
  } else {
    cuerpo = rankingHTML(e) + bandidosTop(e);
  }

  return `
    <div class="eyebrow mt-8">${esc(M.torneo?.nombre || "Liga")}</div>
    <h1 class="titulo-xl">Flag Elite<br><span class="suave">Cuernavaca</span></h1>
    <div class="chips mt-16">${equipos.map(x => `<button class="chip" data-div="${x.key}" aria-pressed="${x.key === st.div}"><span class="punto" style="background:${x.fem ? "var(--pink)" : "var(--red)"}"></span>${esc(x.etiqueta)}</button>`).join("")}</div>
    <div class="seg mt-12" role="tablist">${[["tabla", "Tabla"], ["partidos", "Partidos"], ["lideres", "Líderes"]].map(([k, t]) => `<button data-tab="${k}" aria-pressed="${st.tab === k}">${t}</button>`).join("")}</div>
    <section class="mt-16">${cuerpo}</section>
    <p class="pie-app">Actualizado ${esc(hace(M.liga.actualizado))} · Fuente: <a class="link" href="${esc(M.torneo?.url || M.liga.fuente)}" target="_blank" rel="noopener">Flag Elite Cuernavaca</a></p>`;
}

// Nuestros jugadores y el lugar que ocupan en su división (sin listar a otros equipos)
export function rankingHTML(e) {
  const R = (M.liga.rankings || []).find(r => r.rama === e.rama && r.division === e.division);
  if (!R) return `<div class="vacio">Sin estadísticas de la división.</div>`;
  return `<div class="lista">${R.categorias.map(c => {
    const top = c.nuestros.slice(0, 3);
    return `<div class="rank-card">
      <div class="flex entre"><div class="cat">${esc(c.categoria)}</div><span class="peq dim">${c.con_registro} jugadores con registro</span></div>
      ${top.length ? top.map(x => {
        const J = jugadorPorNombre(e.rama, x.jugador);
        return `<a class="rank-fila" ${J ? `href="#/jugador/${J.id}"` : ""}>
          <span class="puesto ${x.puesto === 1 ? "p1" : x.puesto <= 3 ? "p3" : ""}">${x.puesto}º</span>
          ${J ? avatar(J) : ""}<span class="n">${esc(x.jugador)}${x.empate ? ` <span class="dim peq">(empate)</span>` : ""}</span>
          <b class="v">${x.valor}</b></a>`;
      }).join("") : `<p class="peq muted" style="margin:10px 0 2px">Ningún Bandido con registro todavía.</p>`}
      ${top.length && top[0].puesto > 1 ? `<div class="peq dim mt-8">El 1º lugar tiene ${c.valor_lider}</div>` : ""}
    </div>`;
  }).join("")}</div>`;
}

function bandidosTop(e) {
  const top = (k, t) => {
    const j = e.jugadores.slice().sort((a, b) => (b[k] || 0) - (a[k] || 0))[0];
    if (!j || !j[k]) return "";
    const J = jugadorPorNombre(e.rama, j.nombre);
    return `<a class="fila-link" ${J ? `href="#/jugador/${J.id}"` : ""}>${J ? avatar(J) : ""}<div class="txt"><b>${esc(j.nombre)}</b><span>${t}</span></div><b class="display" style="font-size:24px">${j[k]}</b></a>`;
  };
  return `<div class="seccion-cab mt-20"><h2>Mejores de ${esc(e.nombre)}</h2></div>
    ${top("pts", "Puntos")}${top("pda", "Pases de anotación")}${top("int", "Intercepciones")}${top("sck", "Sacks")}`;
}

export function montar(raiz, rerender) {
  raiz.querySelectorAll("[data-div]").forEach(b => b.onclick = () => { st.div = b.dataset.div; rerender(); });
  raiz.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { st.tab = b.dataset.tab; rerender(); });
  const s = raiz.querySelector("[data-solo]");
  if (s) s.onclick = () => { st.soloNuestros = !st.soloNuestros; rerender(); };
}

export function irDivision(key) { st.div = key; st.tab = "tabla"; }

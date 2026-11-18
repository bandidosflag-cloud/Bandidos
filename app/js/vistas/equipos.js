import { M, filtraRama } from "../datos.js";
import { esc, ico, ordinal, avatar, tarjetaPartido, tagRama, jugadorPorNombre } from "../ui.js";
import { tablaHTML } from "./liga.js";

const st = { orden: "pts", vista: "grid" };
const STATS = [["pts", "PTS", "Puntos"], ["pda", "PDA", "Pases de anotación"], ["int", "INT", "Intercepciones"], ["sck", "SCK", "Sacks"], ["ast", "JJ", "Juegos con asistencia"]];

export function renderLista(rama) {
  const equipos = filtraRama(M.equipos, rama);
  const grupos = [["VARONIL", "Varonil"], ["FEMENIL", "Femenil"]].filter(([r]) => equipos.some(e => e.rama === r));
  return `
    <div class="eyebrow mt-8">${M.jugadores.filter(j => rama === "TODOS" || j.rama === rama).length} jugadores</div>
    <h1 class="titulo-xl">Nuestros<br><span class="suave">equipos</span></h1>
    ${grupos.map(([r, t]) => `<section class="seccion"><div class="seccion-cab"><h2>${t}</h2><img src="${r === "FEMENIL" ? "img/bandida.webp" : "img/bandido.webp"}" alt="" style="height:30px;width:auto"></div>
      <div class="lista">${equipos.filter(e => e.rama === r).map(e => `
        <a class="card flex" href="#/equipo/${e.slug}" style="gap:14px;display:flex">
          <div class="mini-pos" style="flex:1;grid-template-columns:auto 1fr">
            <div class="rk-big" style="${e.pos === 1 ? "color:var(--gold)" : ""}">${e.pos ?? "–"}<sup>º</sup></div>
            <div><b class="display" style="font-size:20px">${esc(e.nombre)} ${esc(e.divTxt)}</b>
              <div class="peq muted">${e.jg}-${e.jp} · ${e.jugadores.length} jugadores · DIF ${e.posicion?.dif ?? "–"}</div>
              <div class="forma">${e.forma.map(x => `<i class="${x}">${x}</i>`).join("")}</div></div>
          </div>
          ${ico("chevR", "chev")}
        </a>`).join("")}</div></section>`).join("")}`;
}

export function renderEquipo(slugEq) {
  const e = M.equipos.find(x => x.slug === slugEq);
  if (!e) return `<div class="vacio">Equipo no encontrado.</div>`;
  const tot = e.totales || {};
  const jug = e.jugadores.map(j => ({ ...j, J: jugadorPorNombre(e.rama, j.nombre) }))
    .sort((a, b) => (b[st.orden] || 0) - (a[st.orden] || 0) || (Number(a.numero) || 99) - (Number(b.numero) || 99));
  const resultados = e.partidos.slice().reverse();

  return `
    <a href="#/equipos" class="link flex" style="gap:6px;margin:4px 0 10px">${ico("back").replace("<svg", '<svg style="width:16px;height:16px"')}Equipos</a>
    <section class="equipo-hero ${e.fem ? "femenil" : ""}">
      <img class="logo" src="${e.logo}" alt="">
      ${tagRama(e.rama, e.etiqueta)}
      <h1 class="titulo-xl mt-8">${esc(e.nombre)}<br><span class="suave">${esc(e.divTxt)}</span></h1>
      <div class="peq muted mt-8">${ordinal(e.pos)} de ${e.total} · ${e.jg} ganados · ${e.jp} perdidos</div>
      <div class="stats-fila">
        <div class="stat"><b>${tot.pts ?? 0}</b><span>Puntos</span></div>
        <div class="stat"><b>${tot.pda ?? 0}</b><span>PDA</span></div>
        <div class="stat"><b>${tot.int ?? 0}</b><span>INT</span></div>
        <div class="stat"><b>${tot.sck ?? 0}</b><span>Sacks</span></div>
      </div>
    </section>

    <section class="seccion">
      <div class="seccion-cab"><h2>Roster</h2>
        <div class="seg" style="width:150px"><button data-v="grid" aria-pressed="${st.vista === "grid"}">Fotos</button><button data-v="tabla" aria-pressed="${st.vista === "tabla"}">Stats</button></div></div>
      ${st.vista === "grid" ? `<div class="jug-grid">${jug.map(j => `
        <a class="jug" href="#/jugador/${j.J?.id || ""}">${j.J?.foto ? `<span class="dorsal">${esc(j.numero)}</span>` : ""}${j.J ? avatar({ ...j.J, numero: j.numero }) : ""}
          <div class="nom">${esc(j.nombre)}</div><div class="pos">${esc(j.J?.posicion || `${j[st.orden] || 0} ${STATS.find(s => s[0] === st.orden)[1]}`)}</div></a>`).join("")}</div>`
      : `<div class="tabla-wrap stats-tabla"><table class="tabla">
        <thead><tr><th>#</th><th>Jugador</th>${STATS.map(([k, t]) => `<th class="${st.orden === k ? "orden" : ""}"><button data-orden="${k}">${t}${st.orden === k ? " ▾" : ""}</button></th>`).join("")}</tr></thead>
        <tbody>${jug.map(j => `<tr><td><span class="rk">${esc(j.numero)}</span></td>
          <td class="eq"><a href="#/jugador/${j.J?.id || ""}"><div>${j.J ? avatar(j.J) : ""}<span>${esc(j.nombre)}</span></div></a></td>
          ${STATS.map(([k]) => `<td class="${st.orden === k ? "fuerte" : ""}">${j[k] ?? 0}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
        <p class="nota-pie">PTS puntos · PDA pases de anotación · INT intercepciones · SCK sacks · JJ juegos con asistencia.</p>`}
    </section>

    <section class="seccion"><div class="seccion-cab"><h2>Tabla</h2><a href="#/liga" data-ir-liga="${e.key}">Completa</a></div>${tablaHTML(e, { compacta: true })}</section>

    <section class="seccion"><div class="seccion-cab"><h2>Partidos</h2><span class="peq muted">${e.partidos.length}</span></div>
      <div class="lista">${resultados.map(p => tarjetaPartido(p, { mostrarDiv: false })).join("")}</div></section>
    <p class="nota-pie"><a class="link" href="${esc(e.url)}" target="_blank" rel="noopener">Ver en Flag Elite Cuernavaca</a></p>`;
}

export function renderJugador(id) {
  const J = M.jugadores.find(j => j.id === id);
  if (!J) return `<div class="vacio">Jugador no encontrado.</div>`;
  const varias = J.equipos.length > 1;
  return `
    <a href="javascript:history.back()" class="link flex" style="gap:6px;margin:4px 0 10px">${ico("back").replace("<svg", '<svg style="width:16px;height:16px"')}Regresar</a>
    <section class="equipo-hero ${J.fem ? "femenil" : ""}" style="text-align:center;padding-top:24px">
      <div class="perfil">
        ${avatar(J, "lg")}
        <h2>${esc(J.nombre)}</h2>
        <div class="sub">${J.posicion ? esc(J.posicion) + " · " : ""}${J.equipos.map(x => `#${esc(x.numero)} ${esc(x.equipo.etiqueta)}`).join(" · ")}</div>
      </div>
      <div class="stats-fila">
        <div class="stat"><b>${J.tot.pts}</b><span>Puntos</span></div>
        <div class="stat"><b>${J.tot.pda}</b><span>PDA</span></div>
        <div class="stat"><b>${J.tot.int}</b><span>INT</span></div>
        <div class="stat"><b>${J.tot.sck}</b><span>Sacks</span></div>
      </div>
      ${varias ? `<p class="peq muted" style="margin:10px 0 0">Total sumando ${J.equipos.length} divisiones</p>` : ""}
    </section>
    <section class="seccion"><div class="seccion-cab"><h2>Por división</h2></div>
      ${J.equipos.map(x => `<a class="perfil-div" style="display:block" href="#/equipo/${x.equipo.slug}">
        <div class="flex entre"><b class="display" style="font-size:18px">${esc(x.equipo.nombre)} ${esc(x.equipo.divTxt)}</b><span class="tag">#${esc(x.numero)}</span></div>
        <div class="stats-fila">${STATS.map(([k, t]) => `<div class="stat"><b>${x[k] ?? 0}</b><span>${t}</span></div>`).join("")}</div>
      </a>`).join("")}
    </section>
    ${!J.foto ? `<p class="nota-pie">La foto se agrega desde la hoja de Bandidos (pestaña jugadores).</p>` : ""}`;
}

export function montar(raiz, rerender) {
  raiz.querySelectorAll("[data-orden]").forEach(b => b.onclick = () => { st.orden = b.dataset.orden; rerender(); });
  raiz.querySelectorAll("[data-v]").forEach(b => b.onclick = () => { st.vista = b.dataset.v; rerender(); });
}

// Vista de un partido (se abre en la hoja inferior al tocar cualquier partido).
import { M } from "../datos.js";
import { esc, ico, escudo, fLarga, tagRama, uniformeImg, enlaceMapa, tarjetaPartido, jugadorPorNombre, avatar, ordinal } from "../ui.js";

const COLS = [["pts", "PTS"], ["pda", "PDA"], ["int", "INT"], ["sck", "SCK"]];

function filaTabla(key, nombre) {
  return M.liga.tablas.find(t => `${t.rama}-${t.division}` === key)?.filas.find(f => f.equipo === nombre);
}

function bloqueStats(p) {
  if (!p.nuestro) return "";
  const s = M.stats?.[p.id];
  if (!s) {
    if (p.estado !== "Final") return "";
    return `<div class="vacio mt-16"><b>Estadísticas por jugador</b>La liga solo publica totales. La app calcula lo de cada partido comparando semana contra semana, a partir de la jornada 8.</div>`;
  }
  const destacados = s.jugadores.filter(j => COLS.some(([k]) => j[k] > 0));
  const asistieron = s.jugadores.filter(j => j.ast > 0);
  const tabla = destacados.length ? `<div class="tabla-wrap stats-tabla mt-12"><table class="tabla">
      <thead><tr><th></th><th>Jugador</th>${COLS.map(([, t]) => `<th>${t}</th>`).join("")}</tr></thead>
      <tbody>${destacados.map(j => {
        const J = jugadorPorNombre(p.rama, j.nombre);
        return `<tr><td>${J ? avatar(J) : ""}</td><td class="eq"><a href="${J ? `#/jugador/${J.id}` : "#"}"><div><span>${esc(j.nombre)}</span></div></a></td>
          ${COLS.map(([k]) => `<td class="${j[k] > 0 ? "fuerte" : "dim"}">${j[k] || "–"}</td>`).join("")}</tr>`;
      }).join("")}</tbody></table></div>` : `<p class="peq muted">Sin puntos, pases, intercepciones ni sacks registrados.</p>`;
  return `<div class="seccion-cab mt-20"><h2>Bandidos en el partido</h2></div>
    ${s.combinado ? `<p class="peq muted" style="margin:0 0 4px">Incluye los ${s.partidos.length} partidos de la jornada: la liga los registra juntos.</p>` : ""}
    ${tabla}
    ${asistieron.length ? `<div class="eyebrow mt-16" style="margin-bottom:8px">Jugaron (${asistieron.length})</div>
      <div class="flex wrap" style="gap:6px">${asistieron.map(j => `<span class="tag">${esc(j.nombre)}</span>`).join("")}</div>` : ""}`;
}

export function render(id) {
  const p = M.todos.find(x => x.id === id);
  if (!p) return `<div class="vacio">Partido no encontrado.</div>`;
  const fin = p.estado === "Final";
  const L = p.local, V = p.visita;
  const fl = filaTabla(p.key, L.nombre), fv = filaTabla(p.key, V.nombre);
  const nuestro = p.nuestro ? M.equipos.find(e => e.key === p.key) : null;
  const h2h = nuestro ? nuestro.partidos.filter(x => x.id !== p.id && x.res && x.rival.nombre === p.rival.nombre) : [];
  const res = p.res ? `<span class="res-badge ${p.res}" style="font-size:12px">${p.res === "G" ? "GANADO" : p.res === "P" ? "PERDIDO" : "EMPATE"}</span>` : "";

  const lado = (x, f) => `<div class="eq" style="text-align:center">${escudo(x.nombre, p.rama)}
    <b class="display" style="display:block;font-size:18px;line-height:1.05;margin-top:6px">${esc(x.nombre)}</b>
    <span class="peq muted">${f ? `${ordinal(f.pos)} · ${f.jg}-${f.jp}` : ""}</span></div>`;

  return `
    <div class="flex entre"><div class="flex">${tagRama(p.rama, `${p.rama === "FEMENIL" ? "Femenil" : "Varonil"} ${p.division[0]}${p.division.slice(1).toLowerCase()}`)}<span class="peq muted">Jornada ${p.jornada ?? "–"}</span></div>${res}</div>
    <h2 id="hoja-titulo" class="sr-only">${esc(L.nombre)} vs ${esc(V.nombre)}</h2>
    <div class="detalle-marcador">
      ${lado(L, fl)}
      <div style="text-align:center">${fin
        ? `<div class="display" style="font-size:48px;font-weight:800;line-height:1"><span class="${L.pts >= V.pts ? "" : "dim"}">${L.pts}</span><span class="dim" style="margin:0 6px">-</span><span class="${V.pts >= L.pts ? "" : "dim"}">${V.pts}</span></div><div class="peq muted">Final</div>`
        : `<div class="display" style="font-size:40px;font-weight:800;line-height:1">${esc(p.hora || "--:--")}</div><div class="peq muted">${esc(p.estado)}</div>`}</div>
      ${lado(V, fv)}
    </div>
    <div class="detalle-datos">
      <div>${ico("calendar")}<span>${esc(fLarga(p.dt))}${p.hora ? ` · ${esc(p.hora)}` : ""}</span></div>
      <a href="${enlaceMapa(p.sede)}" target="_blank" rel="noopener">${ico("pin")}<span>${esc(p.sede)} · ${esc(p.campo)}</span></a>
      ${p.nota ? `<div>${ico("info")}<span>${esc(p.nota)}</span></div>` : ""}
    </div>
    ${p.nuestro ? `<div class="uni-mini mt-12" style="background:var(--card);border-radius:14px;padding:10px">
      <div class="img" style="width:52px;height:52px;background:var(--bg)">${uniformeImg(p.uniforme)}</div>
      <div><div class="eyebrow">Uniforme</div><b>${p.uniforme ? esc(p.uniforme.nombre) : "Por confirmar"}</b></div></div>` : ""}
    ${p.estado === "Programado" && p.nuestro ? `<button class="boton bloque mt-12" data-ics="${p.id}">${ico("calendar")}Agregar a mi calendario</button>` : ""}
    ${bloqueStats(p)}
    ${h2h.length ? `<div class="seccion-cab mt-20"><h2>Antes contra ${esc(p.rival.nombre)}</h2></div><div class="lista">${h2h.map(x => tarjetaPartido(x, { mostrarDiv: false })).join("")}</div>` : ""}
    <p class="nota-pie" style="text-align:center"><a class="link" href="${esc(M.torneo?.url || M.liga.fuente)}/partidos" target="_blank" rel="noopener">Ver en Flag Elite Cuernavaca</a></p>`;
}

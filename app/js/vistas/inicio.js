import { M, filtraRama, proximoDomingo } from "../datos.js";
import { esc, ico, fLarga, fCorta, tarjetaPartido, escudo, ordinal, hace, uniformeImg, jugadorPorNombre, avatar } from "../ui.js";

export function tarjetaProximo(rama, { conLink = true } = {}) {
  const equipos = filtraRama(M.equipos, rama);
  const proximos = equipos.map(e => e.proximo).filter(Boolean).sort((a, b) => a.dt - b.dt);
  const p = proximos[0];
  if (p) {
    const nosLocal = p.lado === "local";
    const izq = nosLocal ? p.nos : p.rival, der = nosLocal ? p.rival : p.nos;
    const u = p.uniforme;
    return `<a ${conLink ? 'href="#/partido"' : ""} class="destacada" style="display:block">
      <div class="fila-top"><span class="tag blanco">Próximo · ${esc(p.equipo.etiqueta)}</span><span class="peq muted">Jornada ${p.jornada ?? "–"}</span></div>
      <div class="versus-grande">
        <div class="eq">${escudo(izq.nombre, p.rama)}<b>${esc(izq.nombre)}</b></div>
        <div class="hora-grande">${esc(p.hora)}<small>${esc(fCorta(p.dt))}</small></div>
        <div class="eq">${escudo(der.nombre, p.rama)}<b>${esc(der.nombre)}</b></div>
      </div>
      <div class="cuenta" data-cuenta="${p.dt.toISOString()}"></div>
      <div class="pie mt-12">
        <div class="dato"><span>Campo</span><b>${esc(p.campo || "—")}</b><br><span style="text-transform:none;letter-spacing:0;font-size:11.5px">${esc(p.sede)}</span></div>
        <div class="dato uni-mini"><div class="img">${uniformeImg(u)}</div><div><span>Uniforme</span><b>${u ? esc(u.nombre) : "Por confirmar"}</b></div></div>
      </div>
    </a>`;
  }
  // rol pendiente
  const t = M.torneo;
  const evJ = (M.extra.eventos || []).filter(e => /jornada/i.test(e.tipo || "") && e.fecha && new Date(e.fecha + "T23:59") >= M.hoy)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
  const dom = evJ ? new Date(evJ.fecha + "T12:00") : proximoDomingo(M.hoy);
  const confirmada = !!evJ;
  const enTemporada = t && t.fin && new Date(t.fin) >= M.hoy;
  return `<a ${conLink ? 'href="#/partido"' : ""} class="destacada" style="display:block">
    <div class="fila-top"><span class="tag blanco">${t?.rol_pendiente ? `Jornada ${t.rol_pendiente}` : "Próximo partido"}</span><span class="peq muted">${esc(t?.nombre || "")}</span></div>
    <div class="mt-16">
      <div class="pendiente-num">${enTemporada ? "ROL<br>PENDIENTE" : "FIN DE<br>TEMPORADA"}</div>
      <p class="muted" style="margin:10px 0 0;font-size:13.5px">${enTemporada
        ? `<b style="color:#fff">${esc(fLarga(dom))}</b>${confirmada ? "" : " (probable)"}. La liga aún no publica horarios ni campos; aquí aparecerán en cuanto salgan.`
        : "No hay partidos programados por ahora. Revisa la agenda para los próximos torneos."}</p>
    </div>
  </a>`;
}

export function iniciarCuentas(raiz) {
  const els = raiz.querySelectorAll("[data-cuenta]");
  if (!els.length) return;
  const tick = () => els.forEach(el => {
    const ms = new Date(el.dataset.cuenta) - Date.now();
    if (ms <= 0) { el.innerHTML = `<div><b>¡YA!</b><span>a jugar</span></div>`; return; }
    const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60;
    el.innerHTML = `<div><b>${d}</b><span>días</span></div><div><b>${h}</b><span>horas</span></div><div><b>${m}</b><span>min</span></div>`;
  });
  tick();
  const id = setInterval(() => { if (!document.body.contains(els[0])) clearInterval(id); else tick(); }, 30000);
}

export function render(rama) {
  const t = M.torneo;
  const equipos = filtraRama(M.equipos, rama);
  const jugados = filtraRama(M.partidos, rama).filter(p => p.res).slice(-6).reverse();
  const ultimaJ = Math.max(0, ...M.partidos.filter(p => p.res).map(p => p.jornada || 0));
  const avisos = (M.extra.avisos || []).filter(a => !a.rama || /todos/i.test(a.rama) || rama === "TODOS" || a.rama.toUpperCase() === rama);

  // Bandidos en el top 3 de su división
  const lideres = [];
  for (const R of filtraRama(M.liga.rankings || [], rama)) {
    for (const c of R.categorias) for (const x of c.nuestros) if (x.puesto <= 3) lideres.push({ ...x, cat: c.categoria, rama: R.rama, division: R.division });
  }
  lideres.sort((a, b) => a.puesto - b.puesto || b.valor - a.valor);
  const msg = M.config.mensaje_inicio;

  return `
  <section class="hero">
    <img class="hero-marca" src="${rama === "FEMENIL" ? "img/bandida.webp" : "img/bandido-blanco.webp"}" alt="">
    <div class="eyebrow">${esc(t?.estado || "Temporada")} · ${esc(M.liga.torneos[0] ? "Flag Elite Cuernavaca" : "")}</div>
    <h1 class="titulo-xl">${esc((t?.nombre || "Bandidos").replace(/\s(\d{4})$/, ""))}<br><span class="suave">${esc((t?.nombre || "").match(/\d{4}$/)?.[0] || "")}</span></h1>
    <div class="hero-meta">
      <span class="tag">${equipos.length} equipos</span>
      ${ultimaJ ? `<span class="tag">Jornada ${ultimaJ} jugada</span>` : ""}
      ${t?.fin ? `<span class="tag oro">Termina ${esc(fCorta(new Date(t.fin + "T12:00")))}</span>` : ""}
    </div>
    ${msg ? `<p class="mt-12" style="position:relative;margin-bottom:0">${esc(msg)}</p>` : ""}
  </section>

  <section class="seccion">${tarjetaProximo(rama)}</section>

  ${avisos.length ? `<section class="seccion"><div class="seccion-cab"><h2>Avisos</h2></div><div class="lista">${avisos.slice(0, 3).map(a => `
    <div class="fila-link"><div class="ico" style="${/si|sí/i.test(a.importante) ? "background:var(--red)" : ""}">${ico("bell")}</div>
    <div class="txt"><b>${esc(a.texto)}</b><span>${esc(a.fecha || "")}</span></div></div>`).join("")}</div></section>` : ""}

  <section class="seccion">
    <div class="seccion-cab"><h2>Nuestros equipos</h2><a href="#/equipos">Ver todos</a></div>
    <div class="carrusel">${equipos.map(e => `
      <a class="eq-card ${e.fem ? "femenil" : ""}" href="#/equipo/${e.slug}">
        <img class="logo" src="${e.logo}" alt="">
        <div class="nom">${esc(e.nombre)}</div><div class="div">${esc(e.etiqueta)}</div>
        <div class="pos"><b>${ordinal(e.pos)}</b><span>de ${e.total} · ${e.jg}-${e.jp}</span></div>
        <div class="forma">${e.forma.map(r => `<i class="${r}">${r}</i>`).join("")}</div>
      </a>`).join("")}</div>
  </section>

  <section class="seccion">
    <div class="seccion-cab"><h2>Últimos resultados</h2><a href="#/liga">Liga</a></div>
    <div class="lista">${jugados.length ? jugados.map(p => tarjetaPartido(p)).join("") : `<div class="vacio">Aún no hay resultados.</div>`}</div>
  </section>

  ${lideres.length ? `<section class="seccion">
    <div class="seccion-cab"><h2>Top 3 de la liga</h2><span class="peq oro">Bandidos en su división</span></div>
    <div class="lider-grid">${lideres.map(l => {
      const J = jugadorPorNombre(l.rama, l.jugador);
      const eq = M.equipos.find(e => e.rama === l.rama && e.division === l.division);
      return `<a class="lider-card ${l.puesto === 1 ? "nuestro" : ""}" ${J ? `href="#/jugador/${J.id}"` : ""}>${l.puesto === 1 ? ico("crown", "corona") : ""}
        <div class="cat">${esc(l.cat)}</div>
        <div class="flex" style="gap:8px;margin:6px 0 4px"><span class="puesto ${l.puesto === 1 ? "p1" : "p3"}">${l.puesto}º</span><div class="val" style="margin:0">${esc(l.valor)}</div></div>
        <div class="flex">${J ? avatar(J, "").replace('class="avatar', 'style="width:26px;height:26px;font-size:11px" class="avatar') : ""}<div><div class="quien">${esc(l.jugador)}</div><div class="eqn">${esc(eq?.etiqueta || l.division)}</div></div></div>
      </a>`;
    }).join("")}</div>
  </section>` : ""}

  <div class="pie-app"><img src="img/vida-bandida-oro.webp" alt="">Datos de la liga ${esc(hace(M.liga.actualizado))} · ${esc("Flag Elite Cuernavaca")}</div>
  `;
}

import { M, filtraRama, proximoDomingo } from "../datos.js";
import { esc, ico, fLarga, fCorta, tarjetaPartido, escudo, ordinal, hace, uniformeImg, jugadorPorNombre, avatar, creditoVO } from "../ui.js";
import * as Notif from "../notificaciones.js";

// Avisos vigentes para la rama elegida, del más nuevo al más viejo (los importantes primero)
export function avisosVigentes(rama) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  return (M.extra.avisos || [])
    .filter(a => a.texto)
    .filter(a => !a.hasta || new Date(a.hasta + "T23:59") >= hoy)
    .filter(a => { const r = (a.rama || "").toUpperCase(); return !r || r === "TODOS" || rama === "TODOS" || r === rama; })
    .sort((a, b) => (esImportante(b) - esImportante(a)) || (b.fecha || "").localeCompare(a.fecha || ""));
}
const esImportante = a => /^(si|sí|yes|x)$/i.test((a.importante || "").trim()) ? 1 : 0;

export function tarjetaAviso(a) {
  const f = /^\d{4}-\d{2}-\d{2}$/.test(a.fecha || "") ? fCorta(new Date(a.fecha + "T12:00")) : (a.fecha || "");
  const r = (a.rama || "").toUpperCase();
  return `<div class="aviso ${esImportante(a) ? "importante" : ""}">
    <div class="ico">${ico("bell")}</div>
    <div class="txt"><b>${esc(a.texto)}</b>
      <span>${esc(f)}${r === "VARONIL" ? ' · <i class="tag varonil">Varonil</i>' : r === "FEMENIL" ? ' · <i class="tag femenil">Femenil</i>' : ""}</span></div>
  </div>`;
}

// Frase de la semana: cambia cada lunes. La semana del lunes 16 nov 2026 es la frase 1; después siguen en bucle.
const FRASES_INICIO = new Date(2026, 10, 16);
export function fraseDeLaSemana(hoy = new Date()) {
  const frases = M.frases || [];
  if (!frases.length) return null;
  const lunes = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - ((hoy.getDay() + 6) % 7));
  const semanas = Math.round((lunes - FRASES_INICIO) / 6048e5);
  const n = ((semanas % frases.length) + frases.length) % frases.length;
  const fotos = M.fotosFrases || [];
  return { ...frases[n], img: fotos.length ? fotos[n % fotos.length] : "" };
}

function tarjetaFrase() {
  const f = fraseDeLaSemana();
  if (!f) return "";
  const largo = f.texto.length;
  const tam = largo > 115 ? "xl" : largo > 85 ? "l" : largo < 40 ? "s" : "";
  return `<section class="seccion">
    <article class="frase-semana">
      <div class="fs-fondo">${f.img ? `<img src="${esc(f.img)}" alt="" decoding="async">` : ""}</div>
      <span class="fs-comilla" aria-hidden="true">“</span>
      <div class="fs-cab">Frase de la semana</div>
      <blockquote class="${tam ? "t-" + tam : ""}"><p>${esc(f.texto)}<span class="fs-cierra" aria-hidden="true">”</span></p></blockquote>
      <img class="fs-logo" src="img/vida-bandida.webp" alt="" aria-hidden="true">
      <cite>${esc(f.autor)}</cite>
    </article>
  </section>`;
}

export function tarjetaNotificaciones(rama) {
  const e = Notif.estado();
  if (e === "deshabilitado" || e === "activo" || e === "no-soportado") return "";
  if (Notif.descartado() && e !== "bloqueado") return "";
  const textos = {
    pendiente: ["Activa los avisos", "Te llega una notificación cuando salga el rol, el día de entreno y con los avisos del equipo.", `<button class="boton" data-activar-avisos>${ico("bell")}Activar avisos</button>`],
    instalar: ["Avisos en iPhone", "Primero instala la app: en Safari toca Compartir → “Agregar a inicio”. Ábrela desde tu pantalla de inicio y activa los avisos aquí.", ""],
    bloqueado: ["Avisos bloqueados", "Las notificaciones están bloqueadas para esta app. Actívalas en los ajustes del celular o del navegador.", ""],
  }[e];
  return `<section class="seccion"><div class="notif-card">
    <div class="flex entre"><b class="display" style="font-size:22px">${textos[0]}</b>
      <button class="icon-btn" data-descartar-avisos aria-label="Ocultar" style="width:32px;height:32px">✕</button></div>
    <p class="peq" style="margin:6px 0 12px;color:rgba(255,255,255,.85)">${textos[1]}</p>${textos[2]}
  </div></section>`;
}

// ---------------- fotos de jugadores detrás de los bloques (rotan cada 8 s)
const ROTAR_MS = 8000;
const SALIDA_MS = 500; // igual que la transición de .foto-jugador img.sale en styles.css
let fotoIdx = Math.floor(Math.random() * 1000); // al abrir la app empieza en una al azar
function fotosDe(rama) {
  const todas = M.fotosHero || [];
  return rama === "TODOS" ? todas : todas.filter(f => (f.rama || "").toUpperCase() === rama);
}
// lugar 0 = bloque de temporada, 1 = bloque rojo (siempre otra persona)
function fotoEn(lista, lugar) {
  if (!lista.length) return null;
  const salto = lugar ? Math.max(1, Math.floor(lista.length / 2)) : 0;
  return lista[(fotoIdx + salto) % lista.length];
}
function capaFoto(rama, lugar) {
  const f = fotoEn(fotosDe(rama), lugar);
  return f ? `<div class="foto-jugador" data-foto-lugar="${lugar}" data-rama="${rama}" aria-hidden="true"><img src="${esc(f.img)}" alt="" decoding="async"></div>` : "";
}
export function iniciarFotos(raiz) {
  const capas = [...raiz.querySelectorAll("[data-foto-lugar]")];
  if (!capas.length || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const lista = fotosDe(capas[0].dataset.rama);
  if (lista.length < 2) return;
  const id = setInterval(() => {
    if (!document.body.contains(capas[0])) return clearInterval(id);
    if (document.hidden) return;
    fotoIdx++;
    for (const capa of capas) {
      const f = fotoEn(lista, +capa.dataset.fotoLugar);
      const nueva = new Image();
      nueva.alt = ""; nueva.className = "entra"; nueva.src = f.img;
      // primero sale la actual; cuando ya no se ve, entra la nueva (nunca encimadas)
      nueva.decode().catch(() => {}).then(() => {
        const vieja = capa.querySelector("img");
        vieja?.classList.add("sale");
        setTimeout(() => {
          capa.replaceChildren(nueva);
          requestAnimationFrame(() => requestAnimationFrame(() => nueva.classList.remove("entra")));
        }, vieja ? SALIDA_MS : 0);
      });
    }
  }, ROTAR_MS);
}

export function tarjetaProximo(rama, { conLink = true, foto = false } = {}) {
  const equipos = filtraRama(M.equipos, rama);
  const proximos = equipos.map(e => e.proximo).filter(Boolean).sort((a, b) => a.dt - b.dt);
  const p = proximos[0];
  if (p) {
    const nosLocal = p.lado === "local";
    const izq = nosLocal ? p.nos : p.rival, der = nosLocal ? p.rival : p.nos;
    const u = p.uniforme;
    return `<a ${conLink ? 'href="#/partido"' : ""} class="destacada con-partido" style="display:block">${foto ? capaFoto(rama, 1) : ""}
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
  return `<a ${conLink ? 'href="#/partido"' : ""} class="destacada" style="display:block">${foto ? capaFoto(rama, 1) : ""}
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
  const avisos = avisosVigentes(rama);

  // Bandidos en el top 3 de su división
  const lideres = [];
  for (const R of filtraRama(M.liga.rankings || [], rama)) {
    for (const c of R.categorias) for (const x of c.nuestros) if (x.puesto <= 3) lideres.push({ ...x, cat: c.categoria, rama: R.rama, division: R.division });
  }
  lideres.sort((a, b) => a.puesto - b.puesto || b.valor - a.valor);
  const msg = M.config.mensaje_inicio;

  return `
  <section class="hero">
    ${capaFoto(rama, 0) || `<img class="hero-marca" src="${rama === "FEMENIL" ? "img/bandida.webp" : "img/bandido-blanco.webp"}" alt="">`}
    <div class="eyebrow">${esc(t?.estado || "Temporada")} · ${esc(M.liga.torneos[0] ? "Flag Elite Cuernavaca" : "")}</div>
    <h1 class="titulo-xl">${esc((t?.nombre || "Bandidos").replace(/\s(\d{4})$/, ""))}<br><span class="suave">${esc((t?.nombre || "").match(/\d{4}$/)?.[0] || "")}</span></h1>
    <div class="hero-meta">
      <span class="tag">${equipos.length} equipos</span>
      ${ultimaJ ? `<span class="tag">Jornada ${ultimaJ} jugada</span>` : ""}
      ${t?.fin ? `<span class="tag oro">Termina ${esc(fCorta(new Date(t.fin + "T12:00")))}</span>` : ""}
    </div>
    ${msg ? `<p class="mt-12" style="position:relative;margin-bottom:0">${esc(msg)}</p>` : ""}
  </section>

  ${tarjetaFrase()}

  <section class="seccion">${tarjetaProximo(rama, { foto: true })}</section>

  ${tarjetaNotificaciones(rama)}

  ${avisos.length ? `<section class="seccion"><div class="seccion-cab"><h2>Avisos</h2>${avisos.length > 3 ? `<a href="#/avisos">Ver todos (${avisos.length})</a>` : ""}</div>
    <div class="lista">${avisos.slice(0, 3).map(tarjetaAviso).join("")}</div></section>` : ""}

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
  ${creditoVO()}
  `;
}

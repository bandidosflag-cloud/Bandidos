import { M } from "../datos.js";
import { LIGA } from "../config.js";
import { esc, ico, uniformeImg, enlaceMapa, hace } from "../ui.js";

export function menu() {
  return `
    <h2 id="hoja-titulo" class="display" style="font-size:28px;margin:0">Más</h2>
    <div class="menu-grid">
      <a class="menu-item rojo" href="#/uniformes" data-cerrar><div class="ico">${ico("shirt")}</div><div><b>Uniformes</b><span>Jerseys y cuál toca</span></div></a>
      <a class="menu-item" href="#/social" data-cerrar><div class="ico">${ico("share")}</div><div><b>Social</b><span>Instagram y Facebook</span></div></a>
      <a class="menu-item" href="#/info" data-cerrar><div class="ico">${ico("info")}</div><div><b>Info</b><span>Sedes, contactos, liga</span></div></a>
      <a class="menu-item" href="#/liga" data-cerrar><div class="ico">${ico("trophy")}</div><div><b>Tabla</b><span>Posiciones y líderes</span></div></a>
    </div>
    <p class="pie-app" style="margin-top:20px">Datos de la liga ${esc(hace(M.liga.actualizado))}</p>`;
}

export function renderUniformes() {
  const unis = M.extra.uniformes || [];
  const proximos = M.partidos.filter(p => p.estado === "Programado" && p.dt >= M.hoy);
  return `
    <div class="eyebrow mt-8">Kit Bandidos</div>
    <h1 class="titulo-xl">Uniformes</h1>
    ${proximos.length ? `<section class="seccion"><div class="seccion-cab"><h2>Próximos partidos</h2></div><div class="lista">
      ${proximos.slice(0, 6).map(p => `<div class="fila-link"><div class="ico" style="width:48px;height:48px">${uniformeImg(p.uniforme)}</div>
        <div class="txt"><b>${p.uniforme ? esc(p.uniforme.nombre) : "Por confirmar"}</b><span>${esc(p.equipo.etiqueta)} vs ${esc(p.rival.nombre)} · ${esc(p.hora)}</span></div></div>`).join("")}
    </div></section>` : ""}
    <section class="seccion"><div class="seccion-cab"><h2>Jerseys</h2></div>
      ${unis.length ? `<div class="uni-grid">${unis.map(u => {
        const usa = (u.usa || "").toUpperCase();
        const tag = usa === "VARONIL" ? `<span class="tag varonil">Varonil</span>` : usa === "FEMENIL" ? `<span class="tag femenil">Femenil</span>` : usa ? `<span class="tag oro">Ambos</span>` : "";
        return `<div class="uni"><div class="img">${uniformeImg(u)}</div><b>${esc(u.nombre)}</b>${tag}</div>`;
      }).join("")}</div>`
      : `<div class="vacio"><b>Aún no hay uniformes</b>Agrégalos en la hoja de Bandidos (pestaña uniformes).</div>`}
    </section>
    <p class="nota-pie">Varonil juega de rojo y femenil de blanco; el negro lo comparten. Si un partido cambia, se indica en la hoja (pestaña uniforme_partido) por jornada o fecha.</p>`;
}

export function renderSocial() {
  const ig = M.config.instagram, fb = M.config.facebook, tt = M.config.tiktok;
  const posts = (M.extra.social || []).map(r => r.url).filter(u => /instagram\.com\/(p|reel)\//.test(u));
  const usuario = u => (u || "").replace(/https?:\/\/(www\.)?(instagram|facebook|tiktok)\.com\//, "").replace(/\/$/, "");
  const perfiles = [
    ig && `<a class="fila-link" href="${esc(ig.startsWith("http") ? ig : "https://instagram.com/" + ig.replace("@", ""))}" target="_blank" rel="noopener"><div class="ico">${ico("ig")}</div><div class="txt"><b>Instagram</b><span>@${esc(usuario(ig).replace("@", ""))}</span></div>${ico("ext", "chev")}</a>`,
    fb && `<a class="fila-link" href="${esc(fb)}" target="_blank" rel="noopener"><div class="ico">${ico("fb")}</div><div class="txt"><b>Facebook</b><span>${esc(usuario(fb))}</span></div>${ico("ext", "chev")}</a>`,
    tt && `<a class="fila-link" href="${esc(tt)}" target="_blank" rel="noopener"><div class="ico">${ico("share")}</div><div class="txt"><b>TikTok</b><span>${esc(usuario(tt))}</span></div>${ico("ext", "chev")}</a>`,
  ].filter(Boolean).join("");

  return `
    <div class="eyebrow mt-8">#VidaBandida</div>
    <h1 class="titulo-xl">Social</h1>
    <section class="seccion">${perfiles || `<div class="vacio"><b>Redes por configurar</b>Agrega las cuentas de Bandidos en la hoja (pestaña config: instagram, facebook).</div>`}</section>
    ${posts.length ? `<section class="seccion"><div class="seccion-cab"><h2>Publicaciones</h2></div><div class="lista">
      ${posts.map(u => `<div class="embed-ig"><iframe src="${esc(u.split("?")[0].replace(/\/$/, ""))}/embed" height="560" loading="lazy" title="Publicación de Instagram"></iframe></div>`).join("")}</div></section>` : ""}
    ${fb ? `<section class="seccion"><div class="seccion-cab"><h2>Facebook</h2></div><div class="embed-fb">
      <iframe src="https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(fb)}&tabs=timeline&width=480&height=640&small_header=true&adapt_container_width=true&hide_cover=false" height="640" loading="lazy" title="Facebook de Bandidos" allow="encrypted-media"></iframe></div></section>` : ""}
    <section class="seccion"><div class="seccion-cab"><h2>La liga</h2></div>
      <a class="fila-link" href="${LIGA.instagram}" target="_blank" rel="noopener"><div class="ico">${ico("ig")}</div><div class="txt"><b>Flag Elite Cuernavaca</b><span>Instagram de la liga</span></div>${ico("ext", "chev")}</a>
      <a class="fila-link" href="${LIGA.facebook}" target="_blank" rel="noopener"><div class="ico">${ico("fb")}</div><div class="txt"><b>Flag Elite Cuernavaca</b><span>Facebook de la liga</span></div>${ico("ext", "chev")}</a>
    </section>`;
}

export function renderInfo() {
  const sedes = (M.extra.sedes || []).length ? M.extra.sedes
    : [...new Set(M.partidos.map(p => p.sede).filter(Boolean))].map(n => ({ nombre: n, tipo: "Partidos" }));
  const contactos = M.extra.contactos || [];
  return `
    <div class="eyebrow mt-8">Bandidos Flag Football</div>
    <h1 class="titulo-xl">Info</h1>
    <section class="seccion"><div class="seccion-cab"><h2>Sedes</h2></div>
      ${sedes.map(s => `<a class="fila-link" href="${esc(s.mapa || enlaceMapa(s.nombre))}" target="_blank" rel="noopener"><div class="ico">${ico("pin")}</div>
        <div class="txt"><b>${esc(s.nombre)}</b><span>${esc([s.tipo, s.nota].filter(Boolean).join(" · "))}</span></div>${ico("ext", "chev")}</a>`).join("")}
    </section>
    <section class="seccion"><div class="seccion-cab"><h2>Coaches</h2></div>
      ${contactos.length ? contactos.map(c => {
        const ini = c.nombre.replace(/^coach\s+/i, "").split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
        const head = /head/i.test(c.rol || "");
        return `<a class="fila-link" ${c.telefono ? `href="https://wa.me/${esc(c.telefono.replace(/\D/g, ""))}" target="_blank" rel="noopener"` : ""}>
          <span class="avatar ${head ? "head" : ""}" style="width:40px;height:40px;font-size:15px">${esc(ini)}</span>
          <div class="txt"><b>${esc(c.nombre)}</b><span>${esc(c.rol || "")}</span></div>${head ? `<span class="tag oro">Head</span>` : ""}</a>`;
      }).join("")
      : `<div class="vacio"><b>Sin coaches</b>Agrégalos en la hoja (pestaña contactos).</div>`}
    </section>
    <section class="seccion"><div class="seccion-cab"><h2>Liga</h2></div>
      <a class="fila-link" href="${LIGA.url}" target="_blank" rel="noopener"><div class="ico">${ico("trophy")}</div><div class="txt"><b>${esc(LIGA.nombre)}</b><span>Rol, resultados y estadísticas oficiales</span></div>${ico("ext", "chev")}</a>
    </section>
    <div class="pie-app"><img src="img/vida-bandida-oro.webp" alt="">App interna de Bandidos · datos de la liga ${esc(hace(M.liga.actualizado))}</div>`;
}

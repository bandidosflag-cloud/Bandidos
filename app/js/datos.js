// Carga y arma el modelo de datos de la app.
import { SHEET_ID, PESTANAS } from "./config.js";
import { leerHoja } from "./sheets.js";

const CACHE_HOJA = "bandidos.hoja.v1";
const COL_REQUERIDA = {
  config: ["clave"], uniformes: ["id"], uniforme_partido: ["uniforme"], eventos: ["titulo"],
  avisos: ["texto"], jugadores: ["nombre", "rama"], contactos: ["rol"], social: ["url"], sedes: ["nombre", "tipo"],
};

export const M = {
  liga: null, extra: null, equipos: [], partidos: [], todos: [], jugadores: [],
  torneo: null, hoy: new Date(),
};

export const norm = s => (s || "").toString().normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
export const slug = s => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const cap = s => (s || "").charAt(0) + (s || "").slice(1).toLowerCase();

function leerCache(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }
function guardarCache(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } }

async function json(url) {
  const r = await fetch(url, { cache: "no-cache" });
  if (!r.ok) throw new Error(url + " " + r.status);
  return r.json();
}

// Fechas como las escriban los coaches: 2026-11-25, 25/11/2026, 25-11-26 → "2026-11-25"
export function normFecha(v) {
  const s = (v || "").toString().trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (m) return `${m[3].length === 2 ? "20" + m[3] : m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return s;
}
// Horas: "18:00", "6:00 pm", "6pm", "18" → "18:00"
export function normHora(v) {
  const s = (v || "").toString().trim().toLowerCase().replace(/\./g, "");
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm|a m|p m)?$/);
  if (!m) return s;
  let h = Number(m[1]);
  if (m[3]?.startsWith("p") && h < 12) h += 12;
  if (m[3]?.startsWith("a") && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${m[2] || "00"}`;
}

function validarPestanas(hoja) {
  const out = {};
  for (const [k, filas] of Object.entries(hoja || {})) {
    const req = COL_REQUERIDA[k] || [];
    if (!filas.length || req.every(c => c in filas[0])) {
      out[k] = filas.map(f => {
        const g = { ...f };
        for (const c of ["fecha", "fecha_fin", "hasta"]) if (c in g) g[c] = normFecha(g[c]);
        for (const c of ["hora", "hora_fin"]) if (c in g && g[c]) g[c] = normHora(g[c]);
        return g;
      }).filter(f => Object.values(f).some(v => v));
    }
  }
  return out;
}

export async function cargar(onActualiza) {
  const [liga, respaldo, fotos, stats] = await Promise.all([
    json("data/liga.json"), json("data/equipo.json").catch(() => ({})),
    json("data/fotos.json").catch(() => ({})), json("data/stats_partidos.json").catch(() => ({})),
  ]);
  M.fotosArchivo = fotos;
  M.stats = stats;
  let extra = { ...respaldo };
  const cacheHoja = leerCache(CACHE_HOJA);
  if (SHEET_ID && cacheHoja) extra = { ...extra, ...cacheHoja };
  construir(liga, extra);

  if (SHEET_ID) {
    leerHoja(SHEET_ID, PESTANAS).then(h => {
      const v = validarPestanas(h);
      if (!Object.keys(v).length) return;
      guardarCache(CACHE_HOJA, v);
      construir(liga, { ...respaldo, ...v });
      onActualiza && onActualiza();
    }).catch(e => console.warn("Google Sheet:", e));
  }
}

// ------------------------------------------------------------
function fechaHora(fecha, hora) {
  if (!fecha) return null;
  const [y, m, d] = fecha.split("-").map(Number);
  const [hh, mm] = (hora || "00:00").split(":").map(Number);
  return new Date(y, m - 1, d, hh || 0, mm || 0);
}

function construir(liga, extra) {
  M.liga = liga;
  M.extra = extra;
  M.hoy = new Date();
  M.config = Object.fromEntries((extra.config || []).map(r => [norm(r.clave), r.valor]));
  M.torneo = (liga.torneos || []).find(t => t.participamos) || null;

  // ---- equipos
  M.equipos = liga.equipos.map(e => {
    const key = `${e.rama}-${e.division}`;
    const fem = e.rama === "FEMENIL";
    const tabla = liga.tablas.find(t => t.rama === e.rama && t.division === e.division);
    return {
      ...e, key, slug: slug(key), fem,
      ramaTxt: cap(e.rama), divTxt: cap(e.division),
      etiqueta: `${cap(e.rama)} ${cap(e.division)}`,
      logo: fem ? "img/bandida.webp" : "img/bandido.webp",
      tabla: tabla ? tabla.filas : [],
      partidos: [],
    };
  });
  const NIVEL = { GOLDEN: 0, GOLD: 0, SILVER: 1, BRONZE: 2 };
  M.equipos.sort((a, b) => (a.fem - b.fem) || ((NIVEL[a.division] ?? 9) - (NIVEL[b.division] ?? 9)));
  const porKey = Object.fromEntries(M.equipos.map(e => [e.key, e]));

  // ---- partidos
  const esNuestro = n => /bandid/i.test(n || "");
  M.todos = liga.partidos.map(p => {
    const q = { ...p, dt: fechaHora(p.fecha, p.hora), key: `${p.rama}-${p.division}` };
    q.id = p.id || slug(`${p.fecha}-${p.hora}-${p.local.nombre}-${p.visita.nombre}-${p.division}`);
    if (p.nuestro) {
      q.equipo = porKey[q.key] || null;
      q.lado = esNuestro(p.local.nombre) ? "local" : "visita";
      q.nos = q.lado === "local" ? p.local : p.visita;
      q.rival = q.lado === "local" ? p.visita : p.local;
      if (p.estado === "Final" && q.nos.pts != null) {
        q.res = q.nos.pts > q.rival.pts ? "G" : q.nos.pts < q.rival.pts ? "P" : "E";
      }
      q.uniforme = uniformeDe(q, extra);
    }
    return q;
  }).sort((a, b) => (a.dt || 0) - (b.dt || 0));
  M.partidos = M.todos.filter(p => p.nuestro && p.equipo);
  M.partidos.forEach(p => p.equipo.partidos.push(p));

  for (const e of M.equipos) {
    const jugados = e.partidos.filter(p => p.res);
    e.forma = jugados.slice(-5).map(p => p.res);
    e.jg = jugados.filter(p => p.res === "G").length;
    e.jp = jugados.filter(p => p.res === "P").length;
    e.pos = e.posicion?.pos ?? null;
    e.total = e.tabla.length;
    e.proximo = e.partidos.find(p => p.estado === "Programado" && p.dt && p.dt >= inicioDia(M.hoy)) || null;
    e.ultimo = jugados[jugados.length - 1] || null;
  }

  // ---- jugadores (unificados por rama + nombre)
  const extraJug = {};
  for (const r of extra.jugadores || []) extraJug[`${norm(r.rama)}|${norm(r.nombre)}`] = r;
  const mapa = new Map();
  for (const e of M.equipos) {
    for (const j of e.jugadores) {
      const k = `${norm(e.rama)}|${norm(j.nombre)}`;
      if (!mapa.has(k)) {
        const x = extraJug[k] || {};
        mapa.set(k, {
          id: slug(`${e.rama}-${j.nombre}`), nombre: j.nombre, rama: e.rama, fem: e.fem,
          foto: x.foto || (M.fotosArchivo || {})[`${e.rama}|${norm(j.nombre)}`] || "",
          posicion: x.posicion || "", apodo: x.apodo || "",
          equipos: [], tot: { pda: 0, pts: 0, sck: 0, int: 0, ast: 0 },
        });
      }
      const J = mapa.get(k);
      J.equipos.push({ equipo: e, ...j });
      for (const s of ["pda", "pts", "sck", "int", "ast"]) J.tot[s] += Number(j[s]) || 0;
    }
  }
  M.jugadores = [...mapa.values()];
  M.jugadores.forEach(J => { J.numero = J.equipos[0].numero; });
  M.fotos = Object.fromEntries(M.jugadores.map(J => [J.id, J.foto]));
}

export function inicioDia(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

// Uniforme asignado: la fila más específica que coincida gana.
function uniformeDe(p, extra) {
  const filas = extra.uniforme_partido || [];
  let mejor = null, puntos = -1;
  for (const r of filas) {
    const rama = norm(r.rama), div = norm(r.division);
    if (rama && rama !== "todos" && rama !== "todas" && rama !== norm(p.rama)) continue;
    if (div && div !== "todas" && div !== "todos" && div !== norm(p.division)) continue;
    if (r.fecha && r.fecha !== p.fecha) continue;
    if (r.jornada && Number(r.jornada) !== p.jornada) continue;
    if (r.torneo && r.torneo !== p.torneo) continue;
    const s = (r.fecha ? 8 : 0) + (r.jornada ? 4 : 0) + (div && div !== "todas" ? 2 : 0) + (rama && rama !== "todos" ? 1 : 0);
    if (s > puntos) { puntos = s; mejor = r; }
  }
  if (!mejor) return null;
  const u = (extra.uniformes || []).find(x => norm(x.id) === norm(mejor.uniforme));
  return u ? { ...u, nota: mejor.nota || "" } : { id: mejor.uniforme, nombre: mejor.uniforme, nota: mejor.nota || "" };
}

// ---- filtros por rama
export function filtraRama(lista, rama, campo = "rama") {
  if (!rama || rama === "TODOS") return lista;
  return lista.filter(x => (x[campo] || x.equipo?.rama) === rama);
}

export function proximoDomingo(desde = new Date()) {
  const d = inicioDia(desde);
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 0));
  return d;
}

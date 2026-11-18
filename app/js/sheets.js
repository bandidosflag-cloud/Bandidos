// Lee pestañas de una Google Sheet compartida "cualquiera con el enlace".
// Usa el endpoint gviz (devuelve CSV y permite CORS).

export function parseCSV(texto) {
  const filas = [];
  let fila = [], campo = "", comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') { campo += '"'; i++; }
        else comillas = false;
      } else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === ",") { fila.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      fila.push(campo); filas.push(fila); fila = []; campo = "";
    } else campo += c;
  }
  if (campo !== "" || fila.length) { fila.push(campo); filas.push(fila); }
  return filas.filter(f => f.some(v => v.trim() !== ""));
}

export function aObjetos(filas) {
  if (!filas.length) return [];
  const cab = filas[0].map(h => h.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "_"));
  return filas.slice(1).map(f => Object.fromEntries(cab.map((h, i) => [h, (f[i] ?? "").trim()])));
}

export async function leerPestana(sheetId, nombre) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(nombre)}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`Hoja ${nombre}: ${r.status}`);
  const t = await r.text();
  if (t.trim().startsWith("<")) throw new Error(`Hoja ${nombre}: no pública`);
  return aObjetos(parseCSV(t));
}

export async function leerHoja(sheetId, pestanas) {
  const res = await Promise.allSettled(pestanas.map(p => leerPestana(sheetId, p)));
  const out = {};
  res.forEach((r, i) => { if (r.status === "fulfilled") out[pestanas[i]] = r.value; });
  return out;
}

// Genera public/imagenes/mapa-mexico.svg: los 32 estados como <path id="mx-xxx">, sin
// relleno ni trazo (los pone quien lo usa con <use href="…#mx-xxx">). El id es el
// ISO 3166-2 en minúsculas, el mismo de AMX_LEGAL.entidades.
//
// Fuente: Natural Earth 10m «Admin 1 – States, Provinces» (dominio público,
// naturalearthdata.com). Proyección: cónica conforme de Lambert con los parámetros
// de INEGI (paralelos 17.5° y 29.5° N, meridiano −102°, origen 12° N).
//
//   node scripts/mapa-mexico.mjs <ruta>/ne_10m_admin_1_states_provinces
import { readFileSync, writeFileSync } from 'node:fs';

const base = process.argv[2];
if (!base) throw new Error('uso: node scripts/mapa-mexico.mjs <ruta sin extensión del .shp de Natural Earth>');
const ANCHO = 1000;            // unidades del viewBox
const TOLERANCIA = 1.0;        // Douglas-Peucker, en unidades del viewBox
const AREA_MIN_KM2 = 150;      // islotes fuera; Tiburón, Ángel de la Guarda y Cozumel se quedan
const LON_MIN = -117.5;        // Guadalupe queda fuera: estiraba el mapa medio país al oeste

// ── .dbf: iso_3166_2 de cada registro ──
const dbf = readFileSync(base + '.dbf');
const nReg = dbf.readUInt32LE(4), largoCab = dbf.readUInt16LE(8), largoReg = dbf.readUInt16LE(10);
const campos = [];
for (let o = 32, pos = 1; dbf[o] !== 0x0d; o += 32) {
  const nombre = dbf.toString('latin1', o, o + 11).replace(/\0.*$/, '');
  campos.push({ nombre, pos, largo: dbf[o + 16] });
  pos += dbf[o + 16];
}
const campo = (i, nombre) => {
  const c = campos.find((x) => x.nombre === nombre);
  const o = largoCab + i * largoReg + c.pos;
  return dbf.toString('utf8', o, o + c.largo).replace(/[\s\0]+$/, '');   // relleno: espacios y NUL
};

// ── .shx + .shp: los anillos de cada polígono ──
const shx = readFileSync(base + '.shx'), shp = readFileSync(base + '.shp');
const anillosDe = (i) => {
  const o = shx.readInt32BE(100 + i * 8) * 2 + 8;
  if (shp.readInt32LE(o) !== 5) return [];
  const nPartes = shp.readInt32LE(o + 36), nPuntos = shp.readInt32LE(o + 40);
  const partes = [];
  for (let p = 0; p < nPartes; p++) partes.push(shp.readInt32LE(o + 44 + p * 4));
  partes.push(nPuntos);
  const p0 = o + 44 + nPartes * 4;
  return partes.slice(0, -1).map((ini, k) => {
    const anillo = [];
    for (let j = ini; j < partes[k + 1]; j++) anillo.push([shp.readDoubleLE(p0 + j * 16), shp.readDoubleLE(p0 + j * 16 + 8)]);
    return anillo;
  });
};

// ── Lambert cónica conforme (esfera) ──
const rad = Math.PI / 180, f1 = 17.5 * rad, f2 = 29.5 * rad, l0 = -102 * rad, f0 = 12 * rad;
const t = (f) => Math.tan(Math.PI / 4 + f / 2);
const n = Math.log(Math.cos(f1) / Math.cos(f2)) / Math.log(t(f2) / t(f1));
const F = Math.cos(f1) * Math.pow(t(f1), n) / n, rho0 = F / Math.pow(t(f0), n);
const proyectar = ([lon, lat]) => {
  const rho = F / Math.pow(t(lat * rad), n), a = n * (lon * rad - l0);
  return [rho * Math.sin(a), -(rho0 - rho * Math.cos(a))];   // y hacia abajo, como el SVG
};

const areaKm2 = (anillo) => {
  let a = 0;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) a += (anillo[j][0] - anillo[i][0]) * (anillo[j][1] + anillo[i][1]);
  const lat = anillo.reduce((s, p) => s + p[1], 0) / anillo.length;
  return Math.abs(a / 2) * 111.32 * 111.32 * Math.cos(lat * rad);
};

const dp = (pts, tol) => {   // Douglas-Peucker iterativo
  const guardar = new Uint8Array(pts.length); guardar[0] = guardar[pts.length - 1] = 1;
  // Un anillo cerrado empieza y acaba en el mismo punto: contra ese segmento de largo
  // cero todo mide 0 y el anillo se colapsa. Se parte por el punto más lejano.
  let lejos = 0;
  pts.forEach(([x, y], i) => { if (Math.hypot(x - pts[0][0], y - pts[0][1]) > Math.hypot(pts[lejos][0] - pts[0][0], pts[lejos][1] - pts[0][1])) lejos = i; });
  guardar[lejos] = 1;
  const pila = [[0, lejos], [lejos, pts.length - 1]];
  while (pila.length) {
    const [a, b] = pila.pop(); let max = 0, k = -1;
    const [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / L;
      if (d > max) { max = d; k = i; }
    }
    if (max > tol) { guardar[k] = 1; pila.push([a, k], [k, b]); }
  }
  return pts.filter((_, i) => guardar[i]);
};

const estados = [];
for (let i = 0; i < nReg; i++) {
  if (campo(i, 'adm0_a3') !== 'MEX') continue;
  let iso = campo(i, 'iso_3166_2').toLowerCase();
  if (iso === 'mx-dif') iso = 'mx-cmx';   // ediciones viejas de NE llaman así a la CDMX
  const anillos = anillosDe(i).filter((r) => areaKm2(r) >= AREA_MIN_KM2 && r.every(([lon]) => lon >= LON_MIN));
  if (anillos.length) estados.push({ iso, anillos: anillos.map((r) => r.map(proyectar)) });   // mx-x01~: un islote suelto
}
if (estados.length !== 32) throw new Error(`esperaba 32 estados de México y salieron ${estados.length}`);

let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
for (const e of estados) for (const r of e.anillos) for (const [x, y] of r) {
  x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
}
const esc = ANCHO / (x1 - x0), alto = Math.ceil((y1 - y0) * esc);
const r1 = (v) => Math.round(v * 10) / 10;

const paths = estados.sort((a, b) => a.iso.localeCompare(b.iso)).map(({ iso, anillos }) => {
  const d = anillos.map((r) => {
    const pts = dp(r.map(([x, y]) => [r1((x - x0) * esc), r1((y - y0) * esc)]), TOLERANCIA);
    let s = `M${pts[0][0]} ${pts[0][1]}`;
    for (let k = 1; k < pts.length; k++) s += `l${r1(pts[k][0] - pts[k - 1][0])} ${r1(pts[k][1] - pts[k - 1][1])}`;
    return s + 'z';
  }).join('');
  return `<path id="${iso}" d="${d}"/>`;
});

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ANCHO} ${alto}">\n`
  + `<!-- Natural Earth 10m admin-1 (dominio público). Lambert cónica conforme, paralelos 17.5/29.5 N. Generado por scripts/mapa-mexico.mjs -->\n`
  + paths.join('\n') + '\n</svg>\n';
const destino = new URL('../public/imagenes/mapa-mexico.svg', import.meta.url);
writeFileSync(destino, svg);
console.log(`32 estados · viewBox 0 0 ${ANCHO} ${alto} · ${(svg.length / 1024).toFixed(1)} KB`);

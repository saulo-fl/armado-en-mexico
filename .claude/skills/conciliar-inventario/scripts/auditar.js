#!/usr/bin/env node
// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

/* Auditoría de integridad de "Armado en México".
 * Corre desde la raíz del repo:  node .claude/skills/conciliar-inventario/scripts/auditar.js
 * 1) transpila todos los .jsx (Babel standalone)  2) carga los data-*.js
 * 3) invariantes de precios/existencias por sucursal.  Sale con código !=0 si algo falla.
 */
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
let fail = 0;
const bad = (m) => { fail++; console.log('  ❌ ' + m); };
const ok = (m) => console.log('  ✅ ' + m);

// 1) transpilar .jsx
try {
  const Babel = require(path.join(ROOT, 'node_modules/@babel/standalone/babel.js'));
  const jsx = ['src', 'src/components', 'src/screens'].flatMap((d) => fs.readdirSync(path.join(ROOT, d)).filter((f) => f.endsWith('.jsx')).map((f) => path.join(d, f)));
  let errs = 0;
  jsx.forEach((f) => {
    try { Babel.transform(fs.readFileSync(path.join(ROOT, f), 'utf8'), { presets: ['react'], filename: f }); }
    catch (e) { errs++; bad('transpila ' + f + ': ' + e.message); }
  });
  if (!errs) ok(jsx.length + ' archivos .jsx transpilan');
} catch (e) { bad('no pude cargar @babel/standalone: ' + e.message); }

// 2) cargar data-*.js en un shim de window
const win = {};
global.window = win;
['data-precios.js', 'data.js', 'data-extra.js', 'data-accesorios.js', 'data-municiones.js']
  .forEach((f) => { try { eval(fs.readFileSync(path.join(ROOT, 'src/data', f), 'utf8')); } catch (e) { bad('carga ' + f + ': ' + e.message); } });
const DB = win.DB || [];
const H = win.AMX_PRICE_HISTORY_SEED || {};
const num = (s) => parseFloat(String(s).replace(/[^\d.]/g, '')) || 0;

if (DB.length) ok('DB = ' + DB.length + ' armas' + (DB.every((w, i) => w.id === i + 1) ? ' (ids contiguos)' : ''));
else bad('window.DB vacío');

// 3) invariantes
// Precio principal (regla de Saulo, 05-nov-2026; precio-principal.py y cotejo.js):
// con existencias en DCAM → DCAM; si no, con existencias en OTCA → OTCA; si no, el
// último inventario. «Existencias» = viene con piezas en el ÚLTIMO inventario de esa armería.
const autDe = (m) => m.autoridad || (/(^|\b)OTCA\b/i.test(m.nombre || '') ? 'OTCA' : 'DCAM');
const ultimoDe = (mans, s) => (mans || []).filter((m) => autDe(m) === s).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))[0] || null;
const precioPrincipal = (h, mans, qDcam) => {
  const r = (h || []).slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
  if (!r.length) return null;
  const oD = ultimoDe(mans, 'DCAM'), oO = ultimoDe(mans, 'OTCA');
  const rD = oD && r.find((x) => x.manualId === oD.id), rO = oO && r.find((x) => x.manualId === oO.id);
  const qD = qDcam != null ? qDcam : (rD && rD.qty) || 0;
  if (qD > 0 && rD) return num(rD.price);
  if (rO && rO.qty > 0) return num(rO.price);
  return num(r[r.length - 1].price);
};
let mm = 0;
const EXD = win.AMX_ARMAS_EXISTENCIAS || {};
DB.forEach((w) => { const esp = precioPrincipal(H[w.id], win.AMX_MANUALES_SEED, EXD[w.id] || 0); if (esp != null && Math.abs(esp - num(w.priceExact)) > 0.004) { mm++; if (mm <= 8) console.log('     mismatch id ' + w.id + ' ' + w.priceExact + ' vs ' + esp); } });
mm ? bad(mm + ' armas con priceExact != precio principal (DCAM con existencias > OTCA con existencias > último)') : ok('priceExact == precio principal (todas las armas)');
let mmM = 0;
(win.MUNICIONES || []).forEach((m) => { const esp = precioPrincipal((win.MUNICIONES_PRICE_HISTORY || {})[m.id], win.MUNICIONES_MANUALES, null); if (esp != null && Math.abs(esp - num(m.priceExact)) > 0.004) { mmM++; if (mmM <= 8) console.log('     mismatch munición ' + m.id + ' ' + m.priceExact + ' vs ' + esp); } });
mmM ? bad(mmM + ' municiones con precio != precio principal') : ok('precio de municiones == precio principal (todas)');

let cron = 0;
Object.values(H).forEach((r) => { for (let i = 1; i < r.length; i++) if (r[i].date < r[i - 1].date) cron++; });
cron ? bad(cron + ' historiales fuera de orden cronológico') : ok('historiales cronológicos');

const E = win.AMX_ARMAS_EXISTENCIAS || {};
const negs = Object.values(E).filter((v) => v <= 0).length;
negs ? bad(negs + ' existencias <= 0') : ok('existencias DCAM: ' + Object.keys(E).length + ' armas, todas > 0');

if (win.getArmaSucursales) {
  const d = DB.filter((a) => win.getArmaSucursales(a.id).dcam).length;
  const o = DB.filter((a) => win.getArmaSucursales(a.id).otca).length;
  ok('sucursales: DCAM ' + d + ' / OTCA ' + o);
}
// 4) imagenes: que la ruta de cada arma y de cada accesorio exista en disco. Sin
//    esto se puede borrar o renombrar una foto y ni el build ni la auditoria se quejan.
const rotas = [];
DB.concat(win.ACCESORIOS || []).forEach((a) => {
  const r = String(a.img || '');
  if (!r.startsWith('imagenes/')) return;   // data-URI del placeholder o URL remota
  if (!fs.existsSync(path.join(ROOT, 'public', r.split('?')[0]))) rotas.push('#' + a.id + ' ' + r);
});
rotas.length
  ? bad(rotas.length + ' fichas apuntan a una imagen inexistente: ' + rotas.slice(0, 6).join(', '))
  : ok('imagenes: ' + DB.concat(win.ACCESORIOS || []).filter((a) => String(a.img || '').startsWith('imagenes/')).length + ' rutas, todas existen');
console.log(win.ACCESORIOS ? '  ✅ accesorios ' + win.ACCESORIOS.length + ' · municiones ' + (win.MUNICIONES || []).length : '');

// 5) inventario fuente: el `priceManualId` de cada ficha (lo que abre «Ver inventario
//    fuente») tiene que ser el del ÚLTIMO registro de su historial y existir en su lista
//    de inventarios. Antes las conciliaciones lo dejaban apuntando a un PDF viejo.
const porFecha = (h) => (h || []).slice().sort((x, y) => String(x.date).localeCompare(String(y.date)));
const fuente = (lista, hist, manuales, etiqueta) => {
  const ids = new Set((manuales || []).map((m) => m.id));
  const mal = [];
  (lista || []).forEach((f) => {
    const h = porFecha(hist[f.id]);
    if (!f.priceManualId && !h.length) return;
    const ult = h.length ? h[h.length - 1].manualId : null;
    if ((f.priceManualId && ult && f.priceManualId !== ult) || (f.priceManualId && !ids.has(f.priceManualId)) || (ult && !ids.has(ult))) mal.push(f.id);
  });
  mal.length
    ? bad(mal.length + ' ' + etiqueta + ' con inventario fuente distinto del último registro: ' + mal.slice(0, 8).join(', '))
    : ok('inventario fuente = último registro (' + etiqueta + ')');
};
fuente(DB, H, win.AMX_MANUALES_SEED, 'armas');
fuente(win.ACCESORIOS, win.ACCESORIOS_PRICE_HISTORY || {}, win.ACCESORIOS_MANUALES, 'accesorios');
fuente(win.MUNICIONES, win.MUNICIONES_PRICE_HISTORY || {}, win.MUNICIONES_MANUALES, 'municiones');

// 6) compatibilidad explícita de accesorios (14-sep-2026): cada id de `compat.armas`
//    tiene que ser una ficha que exista, o la lista enseñaría un hueco en silencio.
const idsArma = new Set(DB.map((a) => a.id));
const huerfanas = [];
(win.ACCESORIOS || []).forEach((a) => ((a.compat || {}).armas || []).forEach((id) => { if (!idsArma.has(id)) huerfanas.push(a.id + '→' + id); }));
huerfanas.length
  ? bad(huerfanas.length + ' compatibilidades apuntan a un id de arma inexistente: ' + huerfanas.slice(0, 8).join(', '))
  : ok('compatibilidad explícita: ' + (win.ACCESORIOS || []).filter((a) => (a.compat || {}).armas).length + ' accesorios, todos los ids de arma existen');

// 7) nombre de letrero (15-sep-2026): la vitrina de /accesorios rotula `corto`. Sin
//    él el letrero sale en blanco, y dos iguales no se distinguen en la mesa.
const cortos = (win.ACCESORIOS || []).map((a) => String(a.corto || '').trim());
const sinCorto = (win.ACCESORIOS || []).filter((a, i) => !cortos[i]).map((a) => a.id);
const repetidos = [...new Set(cortos.filter((c, i) => c && cortos.indexOf(c) !== i))];
sinCorto.length
  ? bad(sinCorto.length + ' accesorios sin nombre de letrero (`corto`): ' + sinCorto.slice(0, 8).join(', '))
  : repetidos.length
    ? bad('nombres de letrero repetidos: ' + repetidos.join(', '))
    : ok('nombre de letrero: ' + cortos.length + ' accesorios, todos únicos');

// 8) tramos de los cargadores (16-sep-2026): la vitrina parte /cargadores por tipo de
//    arma y calibre. Un cargador sin tramo válido deshace los tramos de toda la sección.
const TRAMOS = win.ACCESORIO_TRAMOS || { armas: [], calibres: [] };
const armasTramo = new Set(TRAMOS.armas.map((x) => x[0]));
const cargadores = (win.ACCESORIOS || []).filter((a) => a.categoria === 'cargadores');
const sinTramo = cargadores.filter((a) => !(armasTramo.has(a.arma) && TRAMOS.calibres.includes(a.calibreTramo))).map((a) => a.id);
sinTramo.length
  ? bad(sinTramo.length + ' cargadores sin tramo válido (`ACC_TRAMO`): ' + sinTramo.slice(0, 8).join(', '))
  : ok('tramos: ' + cargadores.length + ' cargadores, todos con tipo de arma y calibre');

console.log('\n' + (fail === 0 ? '✔✔ AUDITORÍA SIN HALLAZGOS' : '✘ ' + fail + ' HALLAZGOS'));
process.exit(fail ? 1 : 0);

#!/usr/bin/env node
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
  const jsx = fs.readdirSync(ROOT).filter((f) => f.endsWith('.jsx'));
  let errs = 0;
  jsx.forEach((f) => {
    try { Babel.transform(fs.readFileSync(f, 'utf8'), { presets: ['react'], filename: f }); }
    catch (e) { errs++; bad('transpila ' + f + ': ' + e.message); }
  });
  if (!errs) ok(jsx.length + ' archivos .jsx transpilan');
} catch (e) { bad('no pude cargar @babel/standalone: ' + e.message); }

// 2) cargar data-*.js en un shim de window
const win = {};
global.window = win;
['data.js', 'data-extra.js', 'data-precios.js', 'data-accesorios.js', 'data-municiones.js']
  .forEach((f) => { try { eval(fs.readFileSync(path.join(ROOT, f), 'utf8')); } catch (e) { bad('carga ' + f + ': ' + e.message); } });
const DB = win.DB || [];
const H = win.AMX_PRICE_HISTORY_SEED || {};
const num = (s) => parseFloat(String(s).replace(/[^\d.]/g, '')) || 0;

if (DB.length) ok('DB = ' + DB.length + ' armas' + (DB.every((w, i) => w.id === i + 1) ? ' (ids contiguos)' : ''));
else bad('window.DB vacío');

// 3) invariantes
let mm = 0;
DB.forEach((w) => { const h = H[w.id]; if (h && h.length && h[h.length - 1].price !== w.priceExact) { mm++; if (mm <= 8) console.log('     mismatch id ' + w.id + ' ' + w.priceExact + ' vs ' + h[h.length - 1].price); } });
mm ? bad(mm + ' armas con priceExact != último registro del historial') : ok('priceExact == último registro (todas)');

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
// 4) imagenes: que la ruta de cada arma exista en disco. Sin esto se puede
//    borrar o renombrar una foto y ni el build ni la auditoria se quejan.
const rotas = [];
DB.forEach((a) => {
  const r = String(a.img || '');
  if (!r.startsWith('imagenes/')) return;   // data-URI del placeholder o URL remota
  if (!fs.existsSync(path.join(ROOT, r.split('?')[0]))) rotas.push('#' + a.id + ' ' + r);
});
rotas.length
  ? bad(rotas.length + ' armas apuntan a una imagen inexistente: ' + rotas.slice(0, 6).join(', '))
  : ok('imagenes: ' + DB.filter((a) => String(a.img || '').startsWith('imagenes/')).length + ' rutas, todas existen');
console.log(win.ACCESORIOS ? '  ✅ accesorios ' + win.ACCESORIOS.length + ' · municiones ' + (win.MUNICIONES || []).length : '');

console.log('\n' + (fail === 0 ? '✔✔ AUDITORÍA SIN HALLAZGOS' : '✘ ' + fail + ' HALLAZGOS'));
process.exit(fail ? 1 : 0);

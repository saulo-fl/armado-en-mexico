#!/usr/bin/env node
/* Lee y aplica cambios de inventario en los data-*.js de "Armado en México".
 *   node scripts/dcam/datos.js leer [raiz]              → JSON por stdout
 *   node scripts/dcam/datos.js aplicar plan.json [raiz] → edita los archivos
 * Diseño: scripts/dcam/DISENO.md (pieza 2). Carga los datos igual que auditar.js.
 */
const fs = require('fs');
const path = require('path');

const RAIZ_REPO = path.resolve(__dirname, '..', '..');
const DATA = ['data.js', 'data-extra.js', 'data-precios.js', 'data-accesorios.js', 'data-municiones.js'];

function cargar(raiz) {
  const win = {};
  global.window = win;
  for (const f of DATA) (0, eval)(fs.readFileSync(path.join(raiz, 'src/data', f), 'utf8'));
  return win;
}

const porFecha = (h) => (h || []).slice().sort((x, y) => String(x.date).localeCompare(String(y.date)));

function leer(raiz = RAIZ_REPO) {
  const w = cargar(raiz);
  const ficha = (f, hist, extra = {}) => ({ id: f.id, nombre: f.nombre, hist: porFecha(hist[f.id]), ...extra });
  const E = w.AMX_ARMAS_EXISTENCIAS || {};
  return {
    armas: w.DB.map((a) => ficha(a, w.AMX_PRICE_HISTORY_SEED || {}, { existencia: a.id in E ? E[a.id] : null })),
    accesorios: (w.ACCESORIOS || []).map((a) => ficha(a, w.ACCESORIOS_PRICE_HISTORY || {})),
    municiones: (w.MUNICIONES || []).map((m) => ficha(m, w.MUNICIONES_PRICE_HISTORY || {})),
    manuales: { armas: w.AMX_MANUALES_SEED, accesorios: w.ACCESORIOS_MANUALES, municiones: w.MUNICIONES_MANUALES },
  };
}

module.exports = { leer };

if (require.main === module) {
  const [cmd, a1, a2] = process.argv.slice(2);
  if (cmd === 'leer') process.stdout.write(JSON.stringify(leer(a1 ? path.resolve(a1) : RAIZ_REPO)));
  else { console.error('uso: datos.js leer [raiz] | aplicar plan.json [raiz]'); process.exit(2); }
}

#!/usr/bin/env node
/* Pruebas de datos.js. Correr desde la raíz del repo: node scripts/dcam/test_datos.js */
const assert = require('assert');
const path = require('path');
const { leer } = require('./datos.js');

const RAIZ = path.resolve(__dirname, '..', '..');
const pruebas = {
  'leer: arma 1, accesorio 132 y munición 2072 del 11-sep'() {
    const d = leer(RAIZ);
    const a1 = d.armas.find((a) => a.id === 1);
    assert.strictEqual(a1.hist[a1.hist.length - 1].manualId, 'man_dcam_2026_09_11');
    assert.strictEqual(typeof a1.existencia, 'number');
    const acc = d.accesorios.find((a) => a.id === 132);
    assert.strictEqual(acc.hist[acc.hist.length - 1].price, '$2.56 MXN');
    const mun = d.municiones.find((m) => m.id === 2072);
    assert.strictEqual(mun.hist[mun.hist.length - 1].qty, 3000);
    assert.ok(d.manuales.armas.some((m) => m.id === 'man_dcam_2026_09_11' && m.primary));
  },
};
let n = 0;
for (const [nombre, f] of Object.entries(pruebas)) { f(); n++; console.log('ok', nombre); }
console.log(`${n} pruebas OK`);

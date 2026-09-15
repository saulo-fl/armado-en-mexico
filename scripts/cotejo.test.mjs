// Pruebas de src/lib/cotejo.js — `node --test scripts/cotejo.test.mjs`
// Va en scripts/ y no junto al módulo porque copiar-estaticos.mjs publica todo
// src/lib/. Los datos son FIJOS (copiados del catálogo del 14-sep-2026), no los
// data-*.js: una conciliación nueva no debe romper estas pruebas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

globalThis.window = globalThis;
const archivo = fileURLToPath(new URL('../src/lib/cotejo.js', import.meta.url));
vm.runInThisContext(readFileSync(archivo, 'utf8'), { filename: archivo });

const MANUALES = [ // del más reciente al más viejo, como Store.getManuales
  { id: 'man_dcam_2026_09_11', fecha: '2026-09-11', autoridad: 'DCAM', primary: true },
  { id: 'man_otca_armas_2026_06_18', fecha: '2026-06-18', autoridad: 'OTCA' },
  { id: 'man_dcam_2025_10_03', fecha: '2025-10-03', autoridad: 'DCAM' },
  { id: 'man_otca_armas_2025_09_26', fecha: '2025-09-26', autoridad: 'OTCA' },
];
const AUTORIDAD = (m) => (m ? { sigla: m.autoridad || 'DCAM' } : null);
const HIST = {
  5: [
    { manualId: 'man_otca_armas_2025_09_26', price: '$10,144.65 MXN', date: '2025-09-26', qty: 4 },
    { manualId: 'man_dcam_2025_10_03', price: '$10,133.99 MXN', date: '2025-10-03' },
    { manualId: 'man_otca_armas_2026_06_18', price: '$9,110.35 MXN', date: '2026-06-18', qty: 3 },
  ],
  6: [
    { manualId: 'man_otca_armas_2025_09_26', price: '$14,891.47 MXN', date: '2025-09-26', qty: 1 },
    { manualId: 'man_dcam_2025_10_03', price: '$14,875.83 MXN', date: '2025-10-03' },
  ],
  1: [{ manualId: 'man_dcam_2026_09_11', price: '$9,927.55 MXN', date: '2026-09-11' }],
};
const arma = (id, extra) => Object.assign(
  { id, tipo: 'pistola', pais: 'EE.UU.', calibre: '.380 ACP', mecanismo: 'Semi-auto, DAO subcompacta' }, extra);
const LCP = arma(5, { nombre: 'Ruger LCP', marca: 'Ruger', capacidad: '6+1', peso: '270g', longitud: '133mm', anio: 2008, priceExact: '$9,110.35 MXN' });
const MAX = arma(6, { nombre: 'Ruger LCP Max', marca: 'Ruger', capacidad: '10+1', peso: '297g', longitud: '137mm', anio: 2021, priceExact: '$14,875.83 MXN' });
const inv = (x, existenciasDCAM = null) => window.amxInventarioArma(x,
  { priceHistory: HIST[x.id] || [], manuales: MANUALES, existenciasDCAM, autoridad: AUTORIDAD });
const resumen = (s) => s.map((x) => [x.sigla, x.agotado ? 'AGOTADO' : x.qty]);

test('inventario: la LCP tiene precio OTCA vigente, DCAM agotada y 3 en OTCA', () => {
  const i = inv(LCP);
  assert.equal(i.precio, '$9,110.35 MXN');
  assert.equal(i.sigla, 'OTCA');
  assert.equal(i.manual.id, 'man_otca_armas_2026_06_18');
  assert.equal(i.ultimoConocido, false);
  assert.deepEqual(resumen(i.sucursales), [['DCAM', 'AGOTADO'], ['OTCA', 3]]);
});

test('inventario: la LCP Max es último precio conocido y está agotada en las dos', () => {
  const i = inv(MAX);
  assert.equal(i.precio, '$14,875.83 MXN');
  assert.equal(i.sigla, 'DCAM');
  assert.equal(i.ultimoConocido, true);
  assert.deepEqual(resumen(i.sucursales), [['DCAM', 'AGOTADO'], ['OTCA', 'AGOTADO']]);
});

test('inventario: presente en DCAM y nunca en OTCA', () => {
  const i = inv(arma(1, { priceExact: '$9,927.55 MXN' }), 9);
  assert.equal(i.ultimoConocido, false);
  assert.deepEqual(resumen(i.sucursales), [['DCAM', 9]]);
});

test('inventario: sin historial usa priceExact y el inventario principal', () => {
  const i = inv(arma(99, { priceExact: '$5,000.00 MXN' }));
  assert.equal(i.precio, '$5,000.00 MXN');
  assert.equal(i.manual.id, 'man_dcam_2026_09_11');
  assert.deepEqual(i.sucursales, []);
});

test('números: solo compiten valores únicos y exactos', () => {
  const N = window.amxCotejoNum;
  assert.equal(N.capacidad('6+1'), 7);
  assert.equal(N.capacidad('5'), 5);
  assert.equal(N.capacidad('5 / 30'), null);
  assert.equal(N.peso('270g'), 270);
  assert.equal(N.peso('0.9 kg'), 900);
  assert.equal(N.peso('3.5–3.7 kg'), null);
  assert.equal(N.peso('≈4.0 kg'), null);
  assert.equal(N.longitud('133mm'), 133);
  assert.equal(N.longitud('137 mm'), 137);
  assert.equal(N.longitud('cañón 18"'), null);
  assert.equal(N.longitud(''), null);
  assert.equal(N.precio('$9,110.35 MXN'), 9110.35);
  assert.equal(N.precio('$0.00 MXN'), null);
  assert.equal(N.precio(undefined), null);
});

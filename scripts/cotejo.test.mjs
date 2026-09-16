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

const cot = (a, b) => window.amxCotejar(a, b, inv(a), b ? inv(b) : null);
const claves = (fs) => fs.map((f) => f.clave);

test('cotejo: LCP contra LCP Max', () => {
  const c = cot(LCP, MAX);
  assert.deepEqual(claves(c.arriba), ['capacidad', 'peso', 'longitud', 'precio', 'existencias', 'anio']);
  assert.deepEqual(claves(c.iguales), ['calibre', 'mecanismo', 'origen']);
  const gana = Object.fromEntries(c.arriba.map((f) => [f.clave, f.gana]));
  assert.deepEqual(gana, { capacidad: 'b', peso: 'a', longitud: 'a', precio: 'a', existencias: null, anio: null });
  const precio = c.arriba.find((f) => f.clave === 'precio');
  assert.equal(precio.a.texto, '$9,110.35');
  assert.equal(precio.a.fecha, '2026-06-18');
  assert.equal(precio.b.ultimoConocido, true);
  assert.deepEqual(c.arriba.find((f) => f.clave === 'existencias').siglas, ['DCAM', 'OTCA']);
});

test('cotejo: un empate va a iguales', () => {
  const c = cot(LCP, Object.assign({}, MAX, { peso: '270 g' }));
  assert.ok(claves(c.iguales).includes('peso'));
});

test('cotejo: un rango no compite', () => {
  const c = cot(Object.assign({}, LCP, { peso: '3.5–3.7 kg' }), MAX);
  const peso = c.arriba.find((f) => f.clave === 'peso');
  assert.equal(peso.comparable, false);
  assert.equal(peso.gana, null);
});

test('cotejo: g contra kg', () => {
  const c = cot(Object.assign({}, LCP, { peso: '900g' }), Object.assign({}, MAX, { peso: '1.2 kg' }));
  assert.equal(c.arriba.find((f) => f.clave === 'peso').gana, 'a');
});

test('cotejo: con una sola arma, todo arriba y sin ventaja', () => {
  const c = cot(LCP, null);
  assert.deepEqual(claves(c.arriba),
    ['calibre', 'capacidad', 'peso', 'longitud', 'precio', 'existencias', 'mecanismo', 'origen', 'anio']);
  assert.deepEqual(c.iguales, []);
  assert.ok(c.arriba.every((f) => f.gana === null));
});

test('tira: LCP Max frente a LCP', () => {
  const t = window.amxTiraCotejo(LCP, MAX, cot(LCP, MAX));
  assert.equal(t.nombreA, 'LCP');
  assert.equal(t.nombreB, 'LCP Max');
  assert.deepEqual(t.partes, ['+4 cartuchos', '+27 g', '+4 mm', '+$5,765.48']);
  assert.equal(t.avisoFechas, true);
});

test('tira: marcas distintas, singular, signo menos y kg', () => {
  const A = arma(20, { nombre: 'Glock 25', marca: 'Glock', capacidad: '15+1', peso: '3.2 kg', longitud: '185mm', anio: 2003, priceExact: '$20,000.00 MXN' });
  const B = arma(21, { nombre: 'Bersa Thunder 380', marca: 'Bersa', capacidad: '16+1', peso: '4.5 kg', longitud: '165mm', anio: 1995, priceExact: '$10,000.00 MXN' });
  const t = window.amxTiraCotejo(A, B, cot(A, B));
  assert.equal(t.nombreA, 'Glock 25');
  assert.equal(t.nombreB, 'Bersa Thunder 380');
  assert.deepEqual(t.partes, ['+1 cartucho', '+1.3 kg', '−20 mm', '−$10,000.00']);
  assert.equal(t.avisoFechas, false);
});

test('tira: precios iguales de inventarios con fechas distintas, sin aviso ni cifra de precio', () => {
  // Mismo precio que la LCP (OTCA 18-jun-2026), pero del inventario DCAM del 11-sep-2026.
  HIST[30] = [{ manualId: 'man_dcam_2026_09_11', price: '$9,110.35 MXN', date: '2026-09-11' }];
  const B = Object.assign({}, LCP, { id: 30, nombre: 'Ruger LCP II', capacidad: '7+1' });
  const c = cot(LCP, B);
  const precio = c.iguales.find((f) => f.clave === 'precio');
  assert.notEqual(precio.a.fecha, precio.b.fecha);
  const t = window.amxTiraCotejo(LCP, B, c);
  assert.deepEqual(t.partes, ['+1 cartucho']);
  assert.equal(t.avisoFechas, false);
});

test('tira: sin diferencias numéricas', () => {
  const gemela = Object.assign({}, LCP, { id: 7, nombre: 'Ruger LCP II' });
  assert.deepEqual(window.amxTiraCotejo(LCP, gemela, cot(LCP, gemela)).partes, []);
});

test('búsqueda: todas las palabras, sin acentos, con exclusión y alfabética', () => {
  const armas = [MAX, LCP, arma(8, { nombre: 'CZ P-07', marca: 'Ceska Zbrojovka' })];
  const nombres = (xs) => xs.map((x) => x.nombre);
  assert.deepEqual(nombres(window.amxBuscarArmas(armas, 'lcp max', [])), ['Ruger LCP Max']);
  assert.deepEqual(nombres(window.amxBuscarArmas(armas, 'RÚGER', [])), ['Ruger LCP', 'Ruger LCP Max']);
  assert.deepEqual(nombres(window.amxBuscarArmas(armas, 'ruger', [5])), ['Ruger LCP Max']);
  assert.deepEqual(nombres(window.amxBuscarArmas(armas, '', [])), ['CZ P-07', 'Ruger LCP', 'Ruger LCP Max']);
  assert.deepEqual(nombres(window.amxBuscarArmas(armas, '.380', [])), ['CZ P-07', 'Ruger LCP', 'Ruger LCP Max']);
});

test('enlace: ida y vuelta, cortes ambiguos y slugs inválidos', () => {
  const porSlug = { 'ruger-lcp': 5, 'ruger-lcp-max': 6, 'a-vs-b': 1, c: 2 };
  const slugPorId = { 5: 'ruger-lcp', 6: 'ruger-lcp-max' };
  assert.deepEqual(window.amxParComparar('ruger-lcp-vs-ruger-lcp-max', porSlug), [5, 6]);
  assert.deepEqual(window.amxParComparar('ruger-lcp', porSlug), [5]);
  assert.deepEqual(window.amxParComparar('ruger-lcp-vs-no-existe', porSlug), [5]);
  assert.deepEqual(window.amxParComparar('no-existe', porSlug), []);
  assert.deepEqual(window.amxParComparar('ruger-lcp-vs-ruger-lcp', porSlug), [5]);
  assert.deepEqual(window.amxParComparar('a-vs-b-vs-c', porSlug), [1, 2]);
  assert.equal(window.amxRutaComparar([5, 6], slugPorId), 'comparar/ruger-lcp-vs-ruger-lcp-max');
  assert.equal(window.amxRutaComparar([6], slugPorId), 'comparar/ruger-lcp-max');
  assert.equal(window.amxRutaComparar([], slugPorId), 'comparar');
});

// ── ACCESORIOS (ficha de accesorio, 15-sep-2026) ─────────────────────────────
// Datos FIJOS copiados de data-accesorios.js del 15-sep-2026. Los inventarios van
// a propósito del más viejo al más reciente: la función tiene que ordenarlos.
const MANUALES_ACC = [
  { id: 'man_acc_2025_09_26', fecha: '2025-09-26', autoridad: 'OTCA' },
  { id: 'man_acc_2025_10_03', fecha: '2025-10-03', autoridad: 'DCAM' },
  { id: 'man_acc_2026_06_16', fecha: '2026-06-16', autoridad: 'DCAM' },
  { id: 'man_acc_2026_06_18', fecha: '2026-06-18', autoridad: 'OTCA' },
  { id: 'man_acc_2026_07_06', fecha: '2026-07-06', autoridad: 'DCAM' },
  { id: 'man_acc_2026_09_11', fecha: '2026-09-11', autoridad: 'DCAM' },
];
const h = (manualId, price, date, qty) => ({ manualId, price, date, qty });
const HIST_ACC = {
  109: [h('man_acc_2025_10_03', '$723.95 MXN', '2025-10-03', 8), h('man_acc_2026_07_06', '$661.68 MXN', '2026-07-06', 1)],
  112: [h('man_acc_2025_09_26', '$701.44 MXN', '2025-09-26', 5), h('man_acc_2025_10_03', '$693.12 MXN', '2025-10-03', 42),
        h('man_acc_2026_09_11', '$615.24 MXN', '2026-09-11', 19)],
  134: [h('man_acc_2025_09_26', '$666.10 MXN', '2025-09-26', 35)],
  120: [h('man_acc_2026_06_16', '$467.70 MXN', '2026-06-16', 18), h('man_acc_2026_07_06', '$475.17 MXN', '2026-07-06', 14),
        h('man_acc_2026_09_11', '$461.48 MXN', '2026-09-11', 2)],
};
const invAcc = (id) => window.amxInventarioAccesorio({ id, priceExact: '' },
  { priceHistory: HIST_ACC[id], manuales: MANUALES_ACC, autoridad: AUTORIDAD });

test('accesorio: Springfield Echelon es último precio conocido y DCAM agotada', () => {
  const i = invAcc(109);
  assert.equal(i.precio, '$661.68 MXN');
  assert.equal(i.sigla, 'DCAM');
  assert.equal(i.ultimoConocido, true);
  assert.deepEqual(resumen(i.sucursales), [['DCAM', 'AGOTADO']]);
});

test('accesorio: Browning 1911-380 con 19 en DCAM y agotado en OTCA', () => {
  const i = invAcc(112);
  assert.equal(i.ultimoConocido, false);
  assert.deepEqual(resumen(i.sucursales), [['DCAM', 19], ['OTCA', 'AGOTADO']]);
});

test('accesorio: CZ P-07 solo en un OTCA viejo', () => {
  const i = invAcc(134);
  assert.equal(i.sigla, 'OTCA');
  assert.equal(i.ultimoConocido, true);
  assert.deepEqual(resumen(i.sucursales), [['OTCA', 'AGOTADO']]);
});

test('accesorio: Glock 17 con 2 en el último DCAM', () => {
  const i = invAcc(120);
  assert.equal(i.precio, '$461.48 MXN');
  assert.equal(i.manual.id, 'man_acc_2026_09_11');
  assert.equal(i.ultimoConocido, false);
  assert.deepEqual(resumen(i.sucursales), [['DCAM', 2]]);
});

test('compatibilidad: los cuatro casos de la hoja', () => {
  const G17 = { id: 132, nombre: 'Glock 17' };
  const G19 = { id: 40, nombre: 'Glock 19' };
  const C = window.amxCompatAccesorio;
  assert.deepEqual(C({ compat: { armas: [132, 40] }, compatibilidad: ['Glock 17', 'Glock 19'] }, [G17, G19]),
    { caso: 'fichas', armas: [G17, G19], texto: '' });
  assert.deepEqual(C({ compat: { tipos: ['rifle'], riel: true }, compatibilidad: ['Riel Picatinny'] }, [G17]),
    { caso: 'regla', armas: [G17], texto: 'cualquier arma con riel Picatinny' });
  assert.deepEqual(C({ compat: { armas: [] }, compatibilidad: ['Mossberg 500'] }, []),
    { caso: 'plataforma', armas: [], texto: 'Mossberg 500' });
  assert.deepEqual(C({ compat: { armas: [] }, compatibilidad: [] }, []),
    { caso: 'nada', armas: [], texto: '' });
  assert.deepEqual(C({ compat: {}, compatibilidad: [' '] }, []),
    { caso: 'nada', armas: [], texto: '' });
});

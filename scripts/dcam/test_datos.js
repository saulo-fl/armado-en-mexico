#!/usr/bin/env node
/* Pruebas de datos.js. Correr desde la raíz del repo: node scripts/dcam/test_datos.js */
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { leer, aplicar } = require('./datos.js');

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
  'aplicar: un inventario nuevo de cada catálogo sobre una copia'() {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dcam-datos-'));
    for (const d of ['src/data', 'src/pages', 'public/inventarios']) fs.mkdirSync(path.join(tmp, d), { recursive: true });
    for (const f of fs.readdirSync(path.join(RAIZ, 'src/data'))) fs.copyFileSync(path.join(RAIZ, 'src/data', f), path.join(tmp, 'src/data', f));
    for (const f of ['index.html', 'admin.html']) fs.copyFileSync(path.join(RAIZ, 'src/pages', f), path.join(tmp, 'src/pages', f));
    const pdf = path.join(RAIZ, 'public/inventarios/dcam-existencias-2026-09-11.pdf');
    const fecha = '2026-10-01';
    aplicar({ catalogo: 'armas', fecha, pdf, v: 'dcam20261001', seguros: [{ id: 1, precio: 9641.23, existencia: 4 }] }, tmp);
    aplicar({ catalogo: 'accesorios', fecha, pdf, v: 'dcam20261001', seguros: [{ id: 101, precio: 573.62, existencia: 2 }] }, tmp);
    aplicar({ catalogo: 'municiones', fecha, pdf, v: 'dcam20261001', seguros: [{ id: 2072, precio: 10.67, existencia: 2500 }] }, tmp);
    const d = leer(tmp);
    const a1 = d.armas.find((a) => a.id === 1);
    assert.deepStrictEqual(a1.hist[a1.hist.length - 1], { manualId: 'man_dcam_2026_10_01', price: '$9,641.23 MXN', date: '2026-10-01' });
    assert.strictEqual(a1.existencia, 4);
    global.window = {}; (0, eval)(fs.readFileSync(path.join(tmp, 'src/data/data.js'), 'utf8'));
    assert.strictEqual(window.DB.find((a) => a.id === 1).priceExact, '$9,641.23 MXN');
    const acc = d.accesorios.find((a) => a.id === 101);
    assert.deepStrictEqual(acc.hist[acc.hist.length - 1], { manualId: 'man_acc_2026_10_01', price: '$573.62 MXN', date: '2026-10-01', qty: 2 });
    const mun = d.municiones.find((m) => m.id === 2072);
    assert.strictEqual(mun.hist[mun.hist.length - 1].price, '$10.67 MXN');
    assert.strictEqual(d.manuales.armas.filter((m) => m.autoridad === 'DCAM' && m.primary).map((m) => m.id).join(), 'man_dcam_2026_10_01');
    assert.ok(fs.existsSync(path.join(tmp, 'public/inventarios/dcam-accesorios-2026-10-01.pdf')));
    const html = fs.readFileSync(path.join(tmp, 'src/pages/index.html'), 'utf8');
    for (const f of ['data.js', 'data-precios.js', 'data-accesorios.js', 'data-municiones.js']) assert.ok(html.includes(`${f}?v=dcam20261001`), f);
    // todo o nada: un plan que lanza en los pasos 1-3 no debe tocar ni un byte de los archivos.
    const antes = ['src/data/data-precios.js', 'src/data/data.js', 'src/pages/index.html'].map((f) => fs.readFileSync(path.join(tmp, f), 'utf8'));
    assert.throws(() => aplicar({ catalogo: 'armas', fecha, pdf, v: 'x', seguros: [{ id: 1, precio: 1, existencia: 1 }] }, tmp), /ya registrado/);
    assert.throws(() => aplicar({ catalogo: 'armas', fecha: '2026-10-02', pdf, v: 'x', seguros: [{ id: 99999, precio: 1, existencia: 1 }] }, tmp), /99999/);
    ['src/data/data-precios.js', 'src/data/data.js', 'src/pages/index.html'].forEach((f, i) => assert.strictEqual(fs.readFileSync(path.join(tmp, f), 'utf8'), antes[i], f));
    fs.rmSync(tmp, { recursive: true, force: true });
  },
};
let n = 0;
for (const [nombre, f] of Object.entries(pruebas)) { f(); n++; console.log('ok', nombre); }
console.log(`${n} pruebas OK`);

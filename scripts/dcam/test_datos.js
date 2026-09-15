#!/usr/bin/env node
/* Pruebas de datos.js. Correr desde la raíz del repo: node scripts/dcam/test_datos.js */
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { leer, aplicar } = require('./datos.js');

const RAIZ = path.resolve(__dirname, '..', '..');
const PDF = path.join(RAIZ, 'public/inventarios/dcam-existencias-2026-09-11.pdf');

function copiaTmp() {   // copia mínima de src/data, src/pages y public/inventarios en una carpeta temporal
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dcam-datos-'));
  for (const d of ['src/data', 'src/pages', 'public/inventarios']) fs.mkdirSync(path.join(tmp, d), { recursive: true });
  for (const f of fs.readdirSync(path.join(RAIZ, 'src/data'))) fs.copyFileSync(path.join(RAIZ, 'src/data', f), path.join(tmp, 'src/data', f));
  for (const f of ['index.html', 'admin.html']) fs.copyFileSync(path.join(RAIZ, 'src/pages', f), path.join(tmp, 'src/pages', f));
  return tmp;
}

// Inserta una coma extra justo antes del ']' que cierra el arreglo del historial de `id`
// (simula un data-precios.js con coma final ya presente, como podría dejarlo una edición a mano).
function comaFinalEnHistorial(archivo, id) {
  let texto = fs.readFileSync(archivo, 'utf8');
  const m = new RegExp(`\\n\\s*${id}: \\[`).exec(texto);
  assert.ok(m, `no encontré la clave ${id} en el historial de ${archivo}`);
  const iOpen = texto.indexOf('[', m.index);
  const iClose = texto.indexOf(']', iOpen);
  texto = texto.slice(0, iClose) + ',' + texto.slice(iClose);
  fs.writeFileSync(archivo, texto);
}

// Inserta una coma extra justo antes del '}' que cierra `window.NOMBRE = { ... };`.
function comaFinalEnObjeto(archivo, nombre) {
  let texto = fs.readFileSync(archivo, 'utf8');
  const marca = `window.${nombre} = {`;
  const i0 = texto.indexOf(marca);
  assert.ok(i0 !== -1, `no encontré ${marca} en ${archivo}`);
  const iClose = texto.indexOf('};', i0);
  texto = texto.slice(0, iClose) + ',' + texto.slice(iClose);
  fs.writeFileSync(archivo, texto);
}

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
    const tmp = copiaTmp();
    const fecha = '2026-10-01';
    aplicar({ catalogo: 'armas', fecha, pdf: PDF, v: 'dcam20261001', seguros: [{ id: 1, precio: 9641.23, existencia: 4 }] }, tmp);
    aplicar({ catalogo: 'accesorios', fecha, pdf: PDF, v: 'dcam20261001', seguros: [{ id: 101, precio: 573.62, existencia: 2 }] }, tmp);
    aplicar({ catalogo: 'municiones', fecha, pdf: PDF, v: 'dcam20261001', seguros: [{ id: 2072, precio: 10.67, existencia: 2500 }] }, tmp);
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
    // todo o nada: un plan que lanza en los pasos 1-3 no debe tocar ni un byte de los archivos, ni la carpeta de PDFs.
    const antes = ['src/data/data-precios.js', 'src/data/data.js', 'src/pages/index.html'].map((f) => fs.readFileSync(path.join(tmp, f), 'utf8'));
    const pdfsAntes = fs.readdirSync(path.join(tmp, 'public/inventarios')).sort();
    assert.throws(() => aplicar({ catalogo: 'armas', fecha, pdf: PDF, v: 'x', seguros: [{ id: 1, precio: 1, existencia: 1 }] }, tmp), /ya registrado/);
    assert.throws(() => aplicar({ catalogo: 'armas', fecha: '2026-10-02', pdf: PDF, v: 'x', seguros: [{ id: 99999, precio: 1, existencia: 1 }] }, tmp), /99999/);
    ['src/data/data-precios.js', 'src/data/data.js', 'src/pages/index.html'].forEach((f, i) => assert.strictEqual(fs.readFileSync(path.join(tmp, f), 'utf8'), antes[i], f));
    assert.deepStrictEqual(fs.readdirSync(path.join(tmp, 'public/inventarios')).sort(), pdfsAntes);
    fs.rmSync(tmp, { recursive: true, force: true });
  },
  'aplicar: coma final ya presente en el historial no deja huecos'() {
    const tmp = copiaTmp();
    comaFinalEnHistorial(path.join(tmp, 'src/data/data-precios.js'), 1);
    aplicar({ catalogo: 'armas', fecha: '2026-10-01', pdf: PDF, v: 'dcam20261001', seguros: [{ id: 1, precio: 9700, existencia: 5 }] }, tmp);
    const a1 = leer(tmp).armas.find((a) => a.id === 1);
    assert.strictEqual(a1.hist.length, 5, 'no debe haber huecos ni registros de más');
    assert.ok(a1.hist.every((r) => r && typeof r.date === 'string' && typeof r.manualId === 'string'), 'ningún registro debe ser un hueco/null');
    assert.strictEqual(a1.hist[a1.hist.length - 1].manualId, 'man_dcam_2026_10_01');
    fs.rmSync(tmp, { recursive: true, force: true });
  },
  'aplicar: coma final ya presente en AMX_ARMAS_EXISTENCIAS + id nuevo'() {
    const tmp = copiaTmp();
    comaFinalEnObjeto(path.join(tmp, 'src/data/data-precios.js'), 'AMX_ARMAS_EXISTENCIAS');
    // arma 4: tiene historial y mk(...), pero no aparece hoy en AMX_ARMAS_EXISTENCIAS.
    aplicar({ catalogo: 'armas', fecha: '2026-10-01', pdf: PDF, v: 'dcam20261001', seguros: [{ id: 4, precio: 900, existencia: 3 }] }, tmp);
    const a4 = leer(tmp).armas.find((a) => a.id === 4);
    assert.strictEqual(a4.existencia, 3);
    fs.rmSync(tmp, { recursive: true, force: true });
  },
  'aplicar: varias armas en data-precios.js a la vez, con y sin existencia previa'() {
    const tmp = copiaTmp();
    const arma2Antes = leer(RAIZ).armas.find((a) => a.id === 2);
    const fecha = '2026-10-01';
    const seguros = [
      { id: 1, precio: 10123.45, existencia: 12 },   // "9927.55" (7) -> más largo (8)
      { id: 4, precio: 891.23, existencia: 3 },      // "9936.59" (7) -> más corto (6); sin existencia previa
      { id: 5, precio: 9452.10, existencia: 8 },     // "9110.35" (7) -> igual longitud (7); sin existencia previa
      { id: 150, precio: 27500.50, existencia: 6 },  // "28301.14" (8) -> igual longitud (8)
      { id: 232, precio: 9999.99, existencia: 4 },   // "22877.17" (8) -> más corto (7)
    ];
    aplicar({ catalogo: 'armas', fecha, pdf: PDF, v: 'dcam20261001', seguros }, tmp);
    const d = leer(tmp);
    for (const s of seguros) {
      const a = d.armas.find((x) => x.id === s.id);
      assert.strictEqual(a.existencia, s.existencia, `existencia id ${s.id}`);
      assert.strictEqual(a.hist[a.hist.length - 1].manualId, 'man_dcam_2026_10_01', `hist id ${s.id}`);
    }
    const pesosFmt = (n) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;
    global.window = {}; (0, eval)(fs.readFileSync(path.join(tmp, 'src/data/data.js'), 'utf8'));
    for (const s of seguros) assert.strictEqual(window.DB.find((a) => a.id === s.id).priceExact, pesosFmt(s.precio), `priceExact id ${s.id}`);
    const arma2Despues = leer(tmp).armas.find((a) => a.id === 2);
    assert.deepStrictEqual(arma2Despues.hist, arma2Antes.hist, 'arma 2 no debía cambiar');
    assert.strictEqual(arma2Despues.existencia, arma2Antes.existencia, 'existencia de arma 2 no debía cambiar');
    fs.rmSync(tmp, { recursive: true, force: true });
  },
  'aplicar: valida el plan antes de escribir nada'() {
    const tmp = copiaTmp();
    const fecha = '2026-10-01';
    const antesData = fs.readFileSync(path.join(tmp, 'src/data/data.js'), 'utf8');
    const antesPrecios = fs.readFileSync(path.join(tmp, 'src/data/data-precios.js'), 'utf8');
    const pdfsAntes = fs.readdirSync(path.join(tmp, 'public/inventarios')).sort();

    assert.throws(() => aplicar({ catalogo: 'armas', fecha, pdf: PDF, v: 'dcam20261001',
      seguros: [{ id: 1, precio: 100, existencia: 1 }, { id: 1, precio: 200, existencia: 2 }] }, tmp), /repetid/, 'id repetido en seguros');
    // fecha == la última DCAM registrada (2026-09-11) da el mismo manualId → ya cubierto por "ya registrado"
    // en la primera prueba; aquí probamos la fecha ANTERIOR, que sí tiene un manualId distinto.
    assert.throws(() => aplicar({ catalogo: 'armas', fecha: '2026-01-01', pdf: PDF, v: 'x',
      seguros: [{ id: 1, precio: 100, existencia: 1 }] }, tmp), /más nueva/, 'fecha anterior a la última DCAM');
    assert.throws(() => aplicar({ catalogo: 'armas', fecha, pdf: PDF, v: 'dcam20261001',
      seguros: [{ id: 1, existencia: 1 }] }, tmp), /precio/, 'precio faltante');
    assert.throws(() => aplicar({ catalogo: 'armas', fecha, pdf: PDF, v: 'dcam20261001',
      seguros: [{ id: 1, precio: NaN, existencia: 1 }] }, tmp), /precio/, 'precio NaN');
    assert.throws(() => aplicar({ catalogo: 'armas', fecha, pdf: PDF, v: 'dcam20261001',
      seguros: [{ id: 1, precio: 100 }] }, tmp), /existencia/, 'existencia faltante');
    assert.throws(() => aplicar({ catalogo: 'armas', fecha, pdf: PDF, v: 'dcam20261001',
      seguros: [{ id: 1, precio: 100, existencia: 0 }] }, tmp), /existencia/, 'existencia en 0');
    assert.throws(() => aplicar({ catalogo: 'armas', fecha: '01-10-2026', pdf: PDF, v: 'dcam20261001',
      seguros: [{ id: 1, precio: 100, existencia: 1 }] }, tmp), /fecha/, 'fecha con formato inválido');
    assert.throws(() => aplicar({ catalogo: 'armas', fecha, pdf: PDF, v: 'dcam 2026 10 01',
      seguros: [{ id: 1, precio: 100, existencia: 1 }] }, tmp), /v con formato inválido/, 'v con espacios');
    assert.throws(() => aplicar({ catalogo: 'armas', fecha, pdf: PDF, v: '$dcam20261001',
      seguros: [{ id: 1, precio: 100, existencia: 1 }] }, tmp), /v con formato inválido/, 'v con $');

    assert.strictEqual(fs.readFileSync(path.join(tmp, 'src/data/data.js'), 'utf8'), antesData);
    assert.strictEqual(fs.readFileSync(path.join(tmp, 'src/data/data-precios.js'), 'utf8'), antesPrecios);
    assert.deepStrictEqual(fs.readdirSync(path.join(tmp, 'public/inventarios')).sort(), pdfsAntes);
    fs.rmSync(tmp, { recursive: true, force: true });
  },
};
let n = 0;
for (const [nombre, f] of Object.entries(pruebas)) { f(); n++; console.log('ok', nombre); }
console.log(`${n} pruebas OK`);

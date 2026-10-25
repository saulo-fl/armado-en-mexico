// Pruebas del vigía de resembrado de D1 (scripts/dcam/resembrar-vigia.mjs).
// Contrato: resiembra solo cuando lo que cambia es inventario (precio, rango de
// precio, armas nuevas) o, para otros campos (nombre, img, historia…), cuando D1 sigue
// teniendo lo que escribimos la última vez (foto base) = no se editó en el panel.
// Ids que existen solo en D1, campos editados en el panel o sin foto base = avisar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { armasDelCodigo, decidir } from './resembrar-vigia.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const precios = fs.readFileSync(path.join(RAIZ, 'src/data/data-precios.js'), 'utf8');
const datos = fs.readFileSync(path.join(RAIZ, 'src/data/data.js'), 'utf8');
const copia = (v) => JSON.parse(JSON.stringify(v));

test('armasDelCodigo carga el catálogo real con precio y sin data-URI', () => {
  const armas = armasDelCodigo(precios, datos);
  assert.ok(armas.length > 50);
  assert.ok(armas.every((a) => a.id != null));
  assert.ok(armas.some((a) => String(a.priceExact).startsWith('$')), 'data-precios.js se cargó antes que data.js');
  assert.ok(armas.every((a) => !String(a.img || '').startsWith('data:')));
});

test('D1 igual al código → nada', () => {
  const codigo = armasDelCodigo(precios, datos);
  assert.equal(decidir(codigo, copia(codigo)).accion, 'nada');
});

test('solo cambian precios y hay un arma nueva → resembrar', () => {
  const codigo = armasDelCodigo(precios, datos);
  const d1 = copia(codigo).slice(1);           // la primera arma aún no está en D1
  d1[0].priceExact = '$1.00 MXN';
  d1[1].priceLvl = (d1[1].priceLvl || 0) + 1;
  const r = decidir(codigo, d1);
  assert.equal(r.accion, 'resembrar');
  assert.equal(r.precios, 2);
  assert.equal(r.nuevas.length, 1);
});

test('un arma que existe solo en D1 → avisar, no resembrar', () => {
  const codigo = armasDelCodigo(precios, datos);
  const d1 = copia(codigo);
  d1.push({ ...d1[0], id: 999999 });
  const r = decidir(codigo, d1);
  assert.equal(r.accion, 'avisar');
  assert.deepEqual(r.soloD1.length, 1);
});

test('cambia un campo que no es de inventario → avisar', () => {
  const codigo = armasDelCodigo(precios, datos);
  const d1 = copia(codigo);
  d1[0].img = 'imagenes/editada-desde-el-panel.webp';
  d1[1].priceExact = '$1.00 MXN';
  const r = decidir(codigo, d1);
  assert.equal(r.accion, 'avisar');
  assert.ok('img' in r.otros);
});

// Un PR renombra una ficha (nombre/img/historia): el código nuevo difiere de D1, y D1
// sigue igual a la foto de lo último que resembramos.
function renombrada() {
  const codigo = armasDelCodigo(precios, datos);
  const base = copia(codigo);
  base[0].nombre = 'Nombre viejo';
  base[0].img = 'imagenes/vieja.webp';
  base[0].historia = 'Texto viejo';
  const d1 = copia(base);            // D1 = lo que escribimos la última vez
  d1[2].priceExact = '$1.00 MXN';   // y de paso cambia un precio
  return { codigo, base, d1 };
}

test('renombrar una ficha con D1 igual a la foto base → resembrar y nombrar la ficha', () => {
  const { codigo, base, d1 } = renombrada();
  const r = decidir(codigo, d1, base);
  assert.equal(r.accion, 'resembrar');
  assert.deepEqual(r.fichas, [codigo[0].nombre]);
  assert.equal(r.precios, 1);
});

test('foto base con claves en otro orden sigue contando como igual', () => {
  const { codigo, base, d1 } = renombrada();
  const desordenada = base.map((a) => Object.fromEntries(Object.entries(a).reverse()));
  assert.equal(decidir(codigo, d1, desordenada).accion, 'resembrar');
});

test('ficha editada en el panel (D1 ≠ foto base) → avisar', () => {
  const { codigo, base, d1 } = renombrada();
  d1[0].historia = 'Texto que Saulo escribió en el panel';
  const r = decidir(codigo, d1, base);
  assert.equal(r.accion, 'avisar');
  assert.ok('historia' in r.otros);
});

test('panel editó otra ficha que el código no cambió → avisar', () => {
  const { codigo, base, d1 } = renombrada();
  d1[5].img = 'imagenes/subida-desde-el-panel.webp';
  assert.equal(decidir(codigo, d1, base).accion, 'avisar');
});

test('cambio de ficha sin foto base → avisar', () => {
  const { codigo, d1 } = renombrada();
  assert.equal(decidir(codigo, d1).accion, 'avisar');
  assert.equal(decidir(codigo, d1, null).accion, 'avisar');
});

test('ficha que no está en la foto base → avisar', () => {
  const { codigo, base, d1 } = renombrada();
  assert.equal(decidir(codigo, d1, base.slice(1)).accion, 'avisar');
});

test('arma solo en D1 → avisar aunque D1 coincida con la foto base', () => {
  const { codigo, base, d1 } = renombrada();
  const extra = { ...d1[1], id: 999999 };
  d1.push(extra);
  base.push(copia(extra));
  const r = decidir(codigo, d1, base);
  assert.equal(r.accion, 'avisar');
  assert.equal(r.soloD1.length, 1);
});

test('solo inventario no necesita foto base → resembrar sin fichas', () => {
  const codigo = armasDelCodigo(precios, datos);
  const d1 = copia(codigo).slice(1);
  d1[0].priceExact = '$1.00 MXN';
  for (const base of [undefined, null, copia(codigo)]) {
    const r = decidir(codigo, d1, base);
    assert.equal(r.accion, 'resembrar');
    assert.equal(r.precios, 1);
    assert.equal(r.nuevas.length, 1);
    assert.deepEqual(r.fichas, []);
  }
});

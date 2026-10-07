// Pruebas del vigía de resembrado de D1 (scripts/dcam/resembrar-vigia.mjs).
// Contrato: solo resiembra solo cuando lo que cambia es inventario (precio, rango de
// precio, armas nuevas). Ids que existen solo en D1 o cualquier otro campo = avisar.
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

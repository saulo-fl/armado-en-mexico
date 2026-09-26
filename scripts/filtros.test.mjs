// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// Pruebas de src/lib/filtros.js — `node --test scripts/filtros.test.mjs`
// Va en scripts/ y no junto al módulo porque copiar-estaticos.mjs publica todo
// src/lib/. Los datos son FIJOS: una conciliación nueva no debe romper estas pruebas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

globalThis.window = globalThis;
const archivo = fileURLToPath(new URL('../src/lib/filtros.js', import.meta.url));
vm.runInThisContext(readFileSync(archivo, 'utf8'), { filename: archivo });

const ARMAS = { paso: 1000, tope: 100000 };

test('límites: redondea al paso y, con tope, avisa de que hay precios por encima', () => {
  assert.deepEqual(window.amxLimitesPrecio([9927.55, 5293.99, 642032.73], ARMAS), { min: 5000, max: 100000, conTope: true });
  assert.deepEqual(window.amxLimitesPrecio([9927.55, 15413.34], ARMAS), { min: 9000, max: 16000, conTope: false });
  assert.deepEqual(window.amxLimitesPrecio([5.98, 406.19], { paso: 1 }), { min: 5, max: 407, conTope: false });
});

test('límites: sin precios, los precios 0 no cuentan y nunca un rango vacío', () => {
  assert.deepEqual(window.amxLimitesPrecio([], ARMAS), { min: 0, max: 100000, conTope: true });
  assert.deepEqual(window.amxLimitesPrecio([0, 0], { paso: 1 }), { min: 0, max: 1, conTope: false });
  assert.deepEqual(window.amxLimitesPrecio([0, 12000], ARMAS), { min: 12000, max: 13000, conTope: false });
  assert.deepEqual(window.amxLimitesPrecio([150000, 200000], ARMAS), { min: 100000, max: 101000, conTope: true });
});

test('dentro de precio: con el cursor alto en el tope no hay límite superior', () => {
  const conTope = { min: 5000, max: 100000, conTope: true };
  assert.equal(window.amxDentroDePrecio(642032.73, 5000, 100000, conTope), true);
  assert.equal(window.amxDentroDePrecio(642032.73, 5000, 99000, conTope), false);
  assert.equal(window.amxDentroDePrecio(4999, 5000, 100000, conTope), false);
  const sinTope = { min: 5, max: 407, conTope: false };
  assert.equal(window.amxDentroDePrecio(406.19, 5, 407, sinTope), true);
  assert.equal(window.amxDentroDePrecio(60.5, 10, 60, sinTope), false);
});

test('marcas: una mayor cada paso bonito de un quinto del rango, cuatro menores entre mayores, nunca más fino que el paso', () => {
  const armas = window.amxMarcasRegla(5000, 100000, 1000);
  assert.equal(armas.length, 24);
  assert.deepEqual(armas[0], { valor: 8000, mayor: false });
  assert.deepEqual(armas.filter((m) => m.mayor).map((m) => m.valor), [20000, 40000, 60000, 80000, 100000]);
  const cartucho = window.amxMarcasRegla(5, 407, 1);
  assert.deepEqual(cartucho.filter((m) => m.mayor).map((m) => m.valor), [100, 200, 300, 400]);
  assert.equal(cartucho.length, 20);
  assert.deepEqual(window.amxMarcasRegla(0, 12500, 1000).filter((m) => m.mayor).map((m) => m.valor), [0, 5000, 10000]);
  assert.deepEqual(window.amxMarcasRegla(10, 10, 1), []);

  // Rangos angostos: el paso bonito no debe repetir ni mentir etiquetas
  // (Bersa, Grand Power y .38 Special de la revisión final, 16-sep-2026).
  const bersa = window.amxMarcasRegla(12000, 13000, 1000).filter((m) => m.mayor).map((m) => m.valor);
  assert.deepEqual(bersa, [12000, 13000]);
  const grandPower = window.amxMarcasRegla(17000, 29000, 1000).filter((m) => m.mayor).map((m) => m.valor);
  assert.deepEqual(grandPower, [20000, 25000]);
  const calibre38 = window.amxMarcasRegla(13, 14, 1).filter((m) => m.mayor).map((m) => m.valor);
  assert.deepEqual(calibre38, [13, 14]);

  const limites = { conTope: false };
  for (const [valores, formato] of [[bersa, 'miles'], [grandPower, 'miles'], [calibre38, 'pesos']]) {
    const etiquetas = valores.map((v) => window.amxNumeroMarca(v, limites, formato));
    assert.equal(new Set(etiquetas).size, etiquetas.length, 'etiquetas de marca sin duplicados');
  }
});

test('rótulos del rango: la cinta del chip, la lectura grande y el número de la marca', () => {
  const conTope = { min: 5000, max: 100000, conTope: true };
  assert.equal(window.amxRotuloRango(10000, 30000, conTope, 'miles'), '$10k–$30k');
  assert.equal(window.amxRotuloRango(10000, 100000, conTope, 'miles'), '$10k–$100k+');
  assert.equal(window.amxRotuloRango(10, 60, { min: 5, max: 407, conTope: false }, 'pesos'), '$10–$60');
  assert.equal(window.amxLecturaRango(10000, 30000, conTope), '$10,000 — $30,000');
  assert.equal(window.amxLecturaRango(5000, 100000, conTope), '$5,000 — $100,000+');
  assert.equal(window.amxNumeroMarca(20000, conTope, 'miles'), '20k');
  assert.equal(window.amxNumeroMarca(100000, conTope, 'miles'), '100k+');
  assert.equal(window.amxNumeroMarca(100, { min: 5, max: 407, conTope: false }, 'pesos'), '$100');
});

test('conteo: singular y plural de verdad (antes decía «1 activos»)', () => {
  const armas = ['arma', 'armas'];
  assert.deepEqual(window.amxTextoConteo(242, 0, armas), { cifra: '242', resto: 'armas' });
  assert.deepEqual(window.amxTextoConteo(1, 1, armas), { cifra: '1', resto: 'arma · 1 filtro' });
  assert.deepEqual(window.amxTextoConteo(227, 2, armas), { cifra: '227', resto: 'armas · 2 filtros' });
  assert.deepEqual(window.amxTextoConteo(1234, 0, ['cartucho', 'cartuchos']), { cifra: '1,234', resto: 'cartuchos' });
});

test('precio numérico de un texto de inventario', () => {
  assert.equal(window.amxPrecioNumero('$9,927.55 MXN'), 9927.55);
  assert.equal(window.amxPrecioNumero('$26.08 MXN'), 26.08);
  assert.equal(window.amxPrecioNumero(''), 0);
  assert.equal(window.amxPrecioNumero(undefined), 0);
});

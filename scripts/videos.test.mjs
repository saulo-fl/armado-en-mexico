// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// Pruebas de los videos de la tele (src/data/data-videos.js) — `node --test scripts/videos.test.mjs`
// A diferencia de vitrina.test.mjs, aquí SÍ se cruza con el catálogo real: lo que
// se vigila es que cada video apunte a una ficha que existe. Si una conciliación
// borra o renombra una ficha con video, esta prueba debe fallar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

globalThis.window = globalThis;
for (const f of ['data-precios.js', 'data.js', 'data-extra.js', 'data-municiones.js', 'data-videos.js']) {
  const archivo = fileURLToPath(new URL('../src/data/' + f, import.meta.url));
  vm.runInThisContext(readFileSync(archivo, 'utf8'), { filename: archivo });
}
const { POR_ARMA, POR_CALIBRE, GUIA_CALIBRES } = window.AMX_VIDEOS;
const todos = [...Object.values(POR_ARMA), ...Object.values(POR_CALIBRE), GUIA_CALIBRES].flat();

test('cada id es un id de YouTube de 11 caracteres y lleva canal', () => {
  for (const x of todos) {
    assert.match(x.id, /^[A-Za-z0-9_-]{11}$/, `id raro: ${x.id}`);
    assert.ok(x.canal && x.canal.nombre && /^https:\/\/www\.youtube\.com\/@/.test(x.canal.url), `sin canal: ${x.id}`);
  }
});

test('cada arma con video existe en data.js', () => {
  const ids = new Set(window.DB.map((a) => a.id));
  const faltan = Object.keys(POR_ARMA).map(Number).filter((id) => !ids.has(id));
  assert.deepEqual(faltan, [], 'armas con video que no están en el catálogo');
});

test('cada calibre con video tiene ficha de calibre o munición en el inventario', () => {
  const calibres = new Set(window.CALIBRES.map((c) => c.id));
  const deMunicion = new Set(window.MUNICIONES.map((m) => m.calibre));
  const huerfanos = Object.keys(POR_CALIBRE).filter((c) => !calibres.has(c) && !deMunicion.has(c));
  assert.deepEqual(huerfanos, [], 'calibres con video sin ninguna ficha');
});

test('amxVideos: arma, calibre, munición, guía y el campo youtube del admin', () => {
  assert.deepEqual(window.amxVideos('arma', { id: 151 }).map((x) => x.id), ['oxX8cb6TnFI', 'DrFCGoNxJwE']);
  assert.equal(window.amxVideos('arma', { id: 52 })[0].id, window.amxVideos('arma', { id: 264 })[0].id, 'las RM22 comparten video');
  assert.deepEqual(window.amxVideos('arma', { id: 999999 }), [], 'un arma sin video no da nada');
  assert.deepEqual(window.amxVideos('arma', { id: 999999, youtube: 'https://youtu.be/abcdefghijk' }).map((x) => x.id), ['abcdefghijk']);
  assert.equal(window.amxVideos('arma', { id: 11, youtube: 'DWBfKTXJL8w' }).length, 1, 'el del admin no se duplica');
  assert.ok(window.amxVideos('municion', { calibre: '.17 HMR' }).length > 0, '.17 HMR tiene videos aunque no tenga ficha de calibre');
  assert.deepEqual(window.amxVideos('calibre', { id: '12 GA' }), []);
  assert.equal(window.amxVideos('guia-calibres').length, 1);
});

test('index.html carga data-videos.js con su ?v= y _headers lo revalida', () => {
  const html = readFileSync(new URL('../src/pages/index.html', import.meta.url), 'utf8');
  assert.match(html, /<script src="data-videos\.js\?v=\w+"><\/script>/);
  const headers = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
  assert.match(headers, /^\/data-videos\.js\r?\n\s+Cache-Control: public, max-age=0, must-revalidate/m);
});

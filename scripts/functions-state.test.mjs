// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later

// Pruebas de GET /api/state (functions/api/state.js): qué viaja, la caché por versión y el 304.
// Sobre SQLite real (d1-sqlite.mjs) y una Cache API falsa. Corre en `npm test`.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { d1Sqlite, cacheFalsa } from './d1-sqlite.mjs';
import { onRequestGet, DOMINIOS_SNAPSHOT_PUBLICO, armarSnapshot } from '../functions/api/state.js';

const get = (headers = {}) => new Request('https://armado.mx/api/state', { headers });
async function pedir(DB, headers, env = {}) {
  const pendientes = [];
  const res = await onRequestGet({ request: get(headers), env: { DB, ...env }, waitUntil: (p) => pendientes.push(p) });
  await Promise.all(pendientes);
  return res;
}
function sembrado() {
  const DB = d1Sqlite();
  DB.sembrar('armas', [{ id: 1, nombre: 'Uno' }], '2026-11-05 20:00:00'); // formato del resembrado
  DB.sembrar('reviews', [{ id: 'r1', texto: 'publicada' }], '2026-10-29T04:00:12.644Z');
  DB.sembrar('masVisitadas', { dia: '2026-11-06', dias: 30, top: [[1, 3]] });
  DB.sembrar('visits', { 1: [1, 2, 3] });
  DB.sembrar('reviewsQueue', [{ id: 'q1', email: 'a@b.mx' }]);
  DB.sembrar('rejected', [{ id: 'x1', email: 'c@d.mx' }]);
  DB.sembrar('reports', [{ id: 'd1', email: 'e@f.mx' }]);
  return DB;
}

let cache;
beforeEach(() => { cache = cacheFalsa(); globalThis.caches = { default: cache }; });
afterEach(() => { delete globalThis.caches; });

test('el snapshot público no lleva visitas ni datos de terceros, y sí el ranking', async () => {
  const res = await pedir(sembrado());
  assert.equal(res.status, 200);
  const cuerpo = await res.json();
  assert.deepEqual(Object.keys(cuerpo).sort(), ['armas', 'masVisitadas', 'reviews']);
  assert.ok(!DOMINIOS_SNAPSHOT_PUBLICO.includes('visits'));
  for (const privado of ['reviewsQueue', 'rejected', 'reports']) assert.ok(!DOMINIOS_SNAPSHOT_PUBLICO.includes(privado));
  assert.equal(res.headers.get('cache-control'), 'no-cache');
  assert.match(res.headers.get('etag'), /^"[0-9a-f]{24}"$/);
});

test('la segunda petición sale de la caché sin tocar D1', async () => {
  const DB = sembrado();
  const r1 = await pedir(DB);
  assert.equal(r1.headers.get('x-amx-cache'), 'MISS');
  const texto1 = await r1.text();
  DB.consultas.length = 0;
  const r2 = await pedir(DB);
  assert.equal(r2.headers.get('x-amx-cache'), 'HIT');
  assert.equal(await r2.text(), texto1);
  assert.equal(DB.consultas.length, 0, 'con versión y copia en caché, cero consultas a D1');
});

test('el navegador con la misma versión recibe 304 sin cuerpo (también con ETag débil)', async () => {
  const DB = sembrado();
  const etag = (await pedir(DB)).headers.get('etag');
  for (const inm of [etag, 'W/' + etag, '"otra", ' + etag]) {
    const r = await pedir(DB, { 'If-None-Match': inm });
    assert.equal(r.status, 304, inm);
    assert.equal(await r.text(), '');
    assert.equal(r.headers.get('etag'), etag);
  }
  assert.equal((await pedir(DB, { 'If-None-Match': '"vieja"' })).status, 200);
});

test('cualquier escritura cambia la versión: formato ISO o datetime() del resembrado', async () => {
  const DB = sembrado();
  const v1 = (await pedir(DB)).headers.get('etag');
  // La versión se recuerda 60 s; aquí se simula que caducó borrando esa entrada.
  const caducar = () => { for (const k of cache.guardado.keys()) if (k.includes('__version')) cache.guardado.delete(k); };

  DB.sembrar('armas', [{ id: 1, nombre: 'Uno (resembrado)' }], '2026-11-06 20:00:00');
  caducar();
  const r2 = await pedir(DB);
  const v2 = r2.headers.get('etag');
  assert.notEqual(v2, v1, 'el resembrado (datetime) cambia la versión');
  assert.equal((await r2.json()).armas[0].nombre, 'Uno (resembrado)');

  DB.sembrar('reviews', [{ id: 'r1' }, { id: 'r2' }], '2026-11-06T19:00:00.000Z'); // ISO, «anterior» como texto
  caducar();
  const r3 = await pedir(DB);
  assert.notEqual(r3.headers.get('etag'), v2, 'una moderación con hora ISO también la cambia');
  assert.equal((await r3.json()).reviews.length, 2);
});

test('mientras la versión siga en caché (≤ 60 s) se sirve la copia anterior', async () => {
  const DB = sembrado();
  await (await pedir(DB)).text();
  DB.sembrar('armas', [{ id: 1, nombre: 'Cambio' }], '2026-11-06 20:00:00');
  const r = await pedir(DB);
  assert.equal(r.headers.get('x-amx-cache'), 'HIT');
  assert.equal((await r.json()).armas[0].nombre, 'Uno');
});

test('el admin recibe todo menos el blob de visitas, siempre de D1 y sin caché', async () => {
  const DB = sembrado();
  const env = { ALLOW_INSECURE_ADMIN: '1' };
  const req = new Request('http://localhost/api/state');
  const r = await onRequestGet({ request: req, env: { DB, ...env } });
  assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.equal(r.headers.get('etag'), null);
  const cuerpo = await r.json();
  assert.deepEqual(Object.keys(cuerpo).sort(), ['armas', 'masVisitadas', 'rejected', 'reports', 'reviews', 'reviewsQueue']);
  assert.equal(cache.guardado.size, 0, 'nada del admin se guarda en caché');
});

test('una fila corrupta se omite sin romper el snapshot; sin D1 → {}', async () => {
  const DB = sembrado();
  DB.sembrar('pages', '{roto');
  const cuerpo = JSON.parse(await armarSnapshot(DB, DOMINIOS_SNAPSHOT_PUBLICO));
  assert.ok(!('pages' in cuerpo));
  assert.ok('armas' in cuerpo);
  assert.deepEqual(await (await onRequestGet({ request: get(), env: {} })).json(), {});
});

test('sin Cache API (p. ej. local) funciona igual, armando cada vez', async () => {
  delete globalThis.caches;
  const DB = sembrado();
  const r = await pedir(DB);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('x-amx-cache'), 'MISS');
  assert.deepEqual(Object.keys(await r.json()).sort(), ['armas', 'masVisitadas', 'reviews']);
});

test('al reconstruir solo se lee de D1 lo que cambió: armas sale de su propia copia', async () => {
  const DB = sembrado();
  await (await pedir(DB)).text(); // MISS: guarda el snapshot y cada pieza
  DB.sembrar('reviews', [{ id: 'r1' }, { id: 'r9' }], '2026-11-07T10:00:00.000Z');
  for (const k of cache.guardado.keys()) if (k.includes('__version')) cache.guardado.delete(k);
  DB.consultas.length = 0;
  const r = await pedir(DB);
  assert.equal(r.headers.get('x-amx-cache'), 'MISS');
  const cuerpo = await r.json();
  assert.equal(cuerpo.reviews.length, 2);
  assert.equal(cuerpo.armas[0].nombre, 'Uno');
  const lecturas = DB.consultas.filter((q) => q.startsWith('SELECT domain, data'));
  assert.equal(lecturas.length, 1, 'una sola lectura de datos');
  assert.match(lecturas[0], /IN \(\?\)$/, 'y solo de la fila que cambió (reviews)');
});

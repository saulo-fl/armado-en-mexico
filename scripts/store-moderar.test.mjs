// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Pruebas de Store.moderar, hydrate() con colas vacías y pushAllToServer() sin dominios moderados.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DOMINIOS_MODERADOS } from '../functions/api/_lib.js';

const storeFile = fileURLToPath(new URL('../src/lib/store.js', import.meta.url));
const COLA = [
  { id: 'r1', texto: 'uno', email: 'a@b.mx', status: 'pending' },
  { id: 'r2', texto: 'dos', email: 'c@d.mx', status: 'pending' },
];

// `responder(url, opciones)` devuelve la respuesta falsa (o lanza). Cada llamada queda en `llamadas`.
function cargar(responder, { cola = COLA, previo = {} } = {}) {
  const mapa = new Map();
  const localStorage = {
    getItem: (k) => (mapa.has(k) ? mapa.get(k) : null),
    setItem: (k, v) => mapa.set(k, String(v)),
    removeItem: (k) => mapa.delete(k),
  };
  const llamadas = [];
  const fetch = async (url, opciones) => {
    llamadas.push({ url: String(url), opciones });
    return responder(String(url), opciones);
  };
  const window = {
    DB: [], AMX_PRICE_HISTORY_SEED: {}, armaPlaceholder: () => '', addEventListener: () => {},
    localStorage, location: { protocol: 'https:', origin: 'https://armado.mx' }, fetch,
  };
  const sandbox = { console, URL, localStorage, location: window.location, fetch, setTimeout, clearTimeout, window };
  vm.createContext(sandbox);
  for (const [k, v] of Object.entries(previo)) localStorage.setItem(k, JSON.stringify(v));
  vm.runInContext(readFileSync(storeFile, 'utf8'), sandbox, { filename: storeFile });
  if (cola) localStorage.setItem('amx_reviewsq_v1', JSON.stringify(cola));
  return { Store: window.Store, localStorage, llamadas };
}

const asentar = () => new Promise((r) => setImmediate(r));
const ok = (cuerpo) => ({ ok: true, status: 200, json: async () => cuerpo });
const plano = (x) => JSON.parse(JSON.stringify(x));

test('moderar manda solo accion e id y re-hidrata', async () => {
  // /state devuelve {} hasta que el POST de moderar ocurre: solo la re-hidratación (esperada con await) trae [r2].
  let moderado = false;
  const { Store, llamadas } = cargar((url) => {
    if (url.endsWith('/admin/moderar')) { moderado = true; return ok({ ok: true }); }
    return ok(moderado ? { reviewsQueue: [COLA[1]] } : {});
  });
  await asentar();
  assert.deepEqual(plano(Store.getReviewQueue()).map((r) => r.id), ['r1', 'r2']);
  llamadas.length = 0;
  const res = await Store.moderar('aprobar', 'r1');
  assert.deepEqual(plano(res), { ok: true });
  assert.equal(llamadas.length, 2);
  assert.equal(llamadas[0].url, 'https://armado.mx/api/admin/moderar');
  assert.equal(llamadas[0].opciones.method, 'POST');
  assert.equal(llamadas[0].opciones.credentials, 'include');
  assert.deepEqual(JSON.parse(llamadas[0].opciones.body), { accion: 'aprobar', id: 'r1' });
  assert.equal(llamadas[1].url, 'https://armado.mx/api/state');
  assert.deepEqual(plano(Store.getReviewQueue()).map((r) => r.id), ['r2']);
});

test('moderar con 401 devuelve el error y no cambia el caché', async () => {
  const { Store, llamadas } = cargar((url) => (url.endsWith('/state')
    ? ok({}) : { ok: false, status: 401, json: async () => ({ error: 'no_autorizado' }) }));
  await asentar();
  llamadas.length = 0;
  const antes = plano(Store.getReviewQueue());
  const res = await Store.moderar('rechazar', 'r1', 'spam');
  assert.deepEqual(plano(res), { ok: false, status: 401, error: 'no_autorizado' });
  assert.deepEqual(plano(Store.getReviewQueue()), antes);
  assert.equal(llamadas.length, 1);
});

test('moderar sin cuerpo JSON en el error usa http_<status>', async () => {
  const { Store } = cargar((url) => (url.endsWith('/state')
    ? ok({}) : { ok: false, status: 502, json: async () => { throw new Error('html'); } }));
  await asentar();
  assert.deepEqual(plano(await Store.moderar('retirar', 'r1')), { ok: false, status: 502, error: 'http_502' });
});

test('moderar cuando fetch lanza devuelve sin_conexion_o_sesion', async () => {
  const { Store } = cargar((url) => {
    if (url.endsWith('/state')) return ok({});
    throw new TypeError('Failed to fetch');
  });
  await asentar();
  const antes = plano(Store.getReviewQueue());
  assert.deepEqual(plano(await Store.moderar('aprobar', 'r1')), { ok: false, status: 0, error: 'sin_conexion_o_sesion' });
  assert.deepEqual(plano(Store.getReviewQueue()), antes);
});

test('hydrate acepta una cola vacía del servidor', async () => {
  // Se siembra una reseña publicada en caché: si 'reviews' dejara de ser excepción de hydrate(), seguiría visible.
  const publicada = { id: 'p1', texto: 'publicada', tipo: 'arma', entidadId: 47, recomienda: true };
  const { Store } = cargar((url) => ok({ reviewsQueue: [], reviews: [] }), { previo: { amx_reviews_v1: [publicada] } });
  await asentar();
  assert.equal(Store.getReviewQueue().length, 0);
  assert.equal(Store.getReviews().length, 0);
});

test('hydrate sigue ignorando armas vacías', async () => {
  const arma = { id: 1, nombre: 'Prueba', img: 'x.jpg' };
  const { Store } = cargar(() => ok({ armas: [] }), { previo: { amx_armas_v2: [arma] } });
  await asentar();
  assert.deepEqual(plano(Store.getArmas()), [arma]);
});

test('pushAllToServer no manda dominios moderados', async () => {
  const { Store, llamadas, localStorage } = cargar(() => ok({}));
  await asentar();
  for (const d of ['reviews', 'reviewsQueue', 'rejected', 'reports', 'visits', 'pages']) {
    localStorage.setItem({ reviews: 'amx_reviews_v1', reviewsQueue: 'amx_reviewsq_v1', rejected: 'amx_rejected_v2',
      reports: 'amx_reports_v1', visits: 'amx_visits_v2', pages: 'amx_pages_v4' }[d], '[]');
  }
  llamadas.length = 0;
  const results = await Store.pushAllToServer();
  const puts = llamadas.filter((l) => l.opciones && l.opciones.method === 'PUT').map((l) => l.url.split('/').pop());
  assert.ok(puts.includes('pages'), 'los dominios de contenido sí se suben');
  for (const d of DOMINIOS_MODERADOS) {
    assert.ok(!puts.includes(d), d + ' no debe subirse');
    assert.ok(!(d in results), d + ' no debe aparecer en results');
  }
});

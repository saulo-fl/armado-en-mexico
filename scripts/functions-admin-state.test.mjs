// Prueba de functions/api/admin/state/[domain].js: el PUT de admin no reemplaza los
// dominios que escribe el público. Corre en `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPut } from '../functions/api/admin/state/[domain].js';
import { DOMINIOS_MODERADOS } from '../functions/api/_lib.js';
import { d1EnMemoria } from './d1-en-memoria.mjs';

const put = (domain, body) => new Request('http://localhost/api/admin/state/' + domain, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' }, body,
});

test('el PUT de admin rechaza con 409 cada dominio moderado sin tocar D1', async () => {
  assert.deepEqual(DOMINIOS_MODERADOS, ['reviews', 'reviewsQueue', 'rejected', 'reports', 'visits']);
  for (const d of DOMINIOS_MODERADOS) {
    let calls = 0;
    const DB = { prepare() { calls++; throw new Error('D1 no debe tocarse'); } };
    const res = await onRequestPut({
      request: put(d, '[]'), env: { DB, ALLOW_INSECURE_ADMIN: '1' }, params: { domain: d },
    });
    assert.equal(res.status, 409, d);
    assert.equal((await res.json()).error, 'dominio_moderado', d);
    assert.equal(calls, 0, d);
  }
});

test('el PUT de admin sigue escribiendo dominios de contenido', async () => {
  const DB = d1EnMemoria();
  const res = await onRequestPut({
    request: put('pages', '{"a":1}'), env: { DB, ALLOW_INSECURE_ADMIN: '1' }, params: { domain: 'pages' },
  });
  assert.equal(res.status, 200);
  assert.ok(DB.filas.has('pages'));
});

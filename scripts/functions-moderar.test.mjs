// Prueba de functions/api/admin/moderar.js: moderar una reseña o denuncia a la vez, sin
// perder las que llegan entre la lectura y la escritura. Corre en `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost } from '../functions/api/admin/moderar.js';
import { onRequestPost as append } from '../functions/api/append/[domain].js';
import { d1EnMemoria } from './d1-en-memoria.mjs';

const TS = '2026-10-28T00:00:00.000Z';
const siembra = (DB, domain, x) => DB.filas.set(domain, { data: JSON.stringify(x), updated_at: TS });
const leer = (DB, domain) => JSON.parse(DB.filas.get(domain).data);
const peticion = (body, url = 'http://localhost/api/admin/moderar') => new Request(url, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});
const moderar = (DB, body) => onRequestPost({ request: peticion(body), env: { DB, ALLOW_INSECURE_ADMIN: '1' } });

const r1 = { id: 'r1', tipo: 'arma', entidadId: 47, recomienda: true, texto: 'x'.repeat(120), email: 'a@b.mx', status: 'pending', submittedAt: TS };
const r2 = { ...r1, id: 'r2' };

test('sin sesión de Access responde 401 y no toca D1', async () => {
  let calls = 0;
  const DB = { prepare() { calls++; throw new Error('D1 no debe tocarse'); } };
  const res = await onRequestPost({
    request: peticion({ accion: 'aprobar', id: 'r1' }, 'https://armado.mx/api/admin/moderar'),
    env: { DB, CF_ACCESS_TEAM_DOMAIN: 'x.cloudflareaccess.com', CF_ACCESS_AUD: 'aud' },
  });
  assert.equal(res.status, 401);
  assert.equal(calls, 0);
});

test('valida la petición', async () => {
  const DB = d1EnMemoria();
  let res = await moderar(DB, { accion: 'borrar', id: 'r1' });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, 'accion_invalida');
  for (const id of ['', 'x'.repeat(81), 5, undefined]) {
    res = await moderar(DB, { accion: 'aprobar', id });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'id_invalido');
  }
  res = await moderar(DB, '{');
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, 'json_invalido');
  for (const raw of ['null', '[]', '5']) {
    res = await moderar(DB, raw);
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'json_invalido');
  }
  assert.equal(DB.filas.size, 0);
});

test('aprobar publica sin correo y saca de la cola', async () => {
  const DB = d1EnMemoria();
  siembra(DB, 'reviewsQueue', [r1, r2]);
  const res = await moderar(DB, { accion: 'aprobar', id: 'r1' });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, accion: 'aprobar', id: 'r1' });
  const pub = leer(DB, 'reviews');
  assert.equal(pub.length, 1);
  assert.equal(pub[0].id, 'r1');
  assert.ok(!('email' in pub[0]));
  assert.ok(!('status' in pub[0]));
  assert.ok(Number.isFinite(Date.parse(pub[0].approvedAt)));
  assert.equal(pub[0].texto, r1.texto);
  assert.deepEqual(leer(DB, 'reviewsQueue').map((x) => x.id), ['r2']);
});

test('rechazar archiva con motivo y saca de la cola', async () => {
  const DB = d1EnMemoria();
  siembra(DB, 'reviewsQueue', [r1, r2]);
  const res = await moderar(DB, { accion: 'rechazar', id: 'r2', motivo: 'spam' });
  assert.equal(res.status, 200);
  const rej = leer(DB, 'rejected');
  assert.equal(rej.length, 1);
  assert.equal(rej[0].id, 'r2');
  assert.equal(rej[0].status, 'rejected');
  assert.equal(rej[0].rejectionReason, 'spam');
  assert.equal(rej[0].email, 'a@b.mx');
  assert.ok(Number.isFinite(Date.parse(rej[0].rejectedAt)));
  assert.deepEqual(leer(DB, 'reviewsQueue').map((x) => x.id), ['r1']);
  assert.ok(!DB.filas.has('reviews'));
});

test('rechazar sin motivo guarda cadena vacía y recorta el motivo a 500', async () => {
  const DB = d1EnMemoria();
  siembra(DB, 'reviewsQueue', [r1, r2]);
  await moderar(DB, { accion: 'rechazar', id: 'r1' });
  assert.equal(leer(DB, 'rejected')[0].rejectionReason, '');
  await moderar(DB, { accion: 'rechazar', id: 'r2', motivo: 'm'.repeat(900) });
  assert.equal(leer(DB, 'rejected')[0].rejectionReason.length, 500);
});

test('aprobar dos veces no duplica', async () => {
  const DB = d1EnMemoria();
  siembra(DB, 'reviewsQueue', [r1, r2]);
  assert.equal((await moderar(DB, { accion: 'aprobar', id: 'r1' })).status, 200);
  assert.equal((await moderar(DB, { accion: 'aprobar', id: 'r1' })).status, 200);
  assert.deepEqual(leer(DB, 'reviews').map((x) => x.id), ['r1']);
  assert.deepEqual(leer(DB, 'reviewsQueue').map((x) => x.id), ['r2']);
});

test('rechazar dos veces no duplica', async () => {
  const DB = d1EnMemoria();
  siembra(DB, 'reviewsQueue', [r1]);
  assert.equal((await moderar(DB, { accion: 'rechazar', id: 'r1' })).status, 200);
  assert.equal((await moderar(DB, { accion: 'rechazar', id: 'r1' })).status, 200);
  assert.deepEqual(leer(DB, 'rejected').map((x) => x.id), ['r1']);
});

test('aprobar un id que no está ni en la cola ni publicado responde 404', async () => {
  const DB = d1EnMemoria();
  siembra(DB, 'reviewsQueue', [r2]);
  const res = await moderar(DB, { accion: 'aprobar', id: 'zzz' });
  assert.equal(res.status, 404);
  assert.equal((await res.json()).error, 'no_encontrada');
  assert.equal((await moderar(DB, { accion: 'rechazar', id: 'zzz' })).status, 404);
  assert.deepEqual(leer(DB, 'reviewsQueue').map((x) => x.id), ['r2']);
});

test('aprobar con la reseña ya en ambos lados la termina', async () => {
  const DB = d1EnMemoria();
  const { email, status, ...publica } = r1;
  siembra(DB, 'reviewsQueue', [r1, r2]);
  siembra(DB, 'reviews', [{ ...publica, approvedAt: TS }]);
  const res = await moderar(DB, { accion: 'aprobar', id: 'r1' });
  assert.equal(res.status, 200);
  assert.deepEqual(leer(DB, 'reviewsQueue').map((x) => x.id), ['r2']);
  assert.deepEqual(leer(DB, 'reviews').map((x) => x.id), ['r1']);
});

test('aprobar concurrente con 10 envíos no pierde ninguno', async () => {
  const DB = d1EnMemoria();
  siembra(DB, 'reviewsQueue', [r1]);
  const envio = (i) => append({
    request: new Request('https://armado.mx/api/append/reviewsQueue', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'arma', entidadId: 47, recomienda: true, texto: 'envío ' + i + ' ' + 'y'.repeat(110), autor: 'a' + i }),
    }),
    env: { DB }, params: { domain: 'reviewsQueue' },
  });
  const res = await Promise.all([
    ...Array.from({ length: 5 }, (_, i) => envio(i)),
    moderar(DB, { accion: 'aprobar', id: 'r1' }),
    ...Array.from({ length: 5 }, (_, i) => envio(i + 5)),
  ]);
  assert.equal(res[5].status, 200);
  const enviosOk = res.filter((x, i) => i !== 5 && x.status === 200).length;
  const cola = leer(DB, 'reviewsQueue');
  assert.ok(enviosOk >= 1);
  // res[k] con k<5 es el envío k; con k>5 es el envío k-1.
  const aceptados = res.flatMap((x, k) => (k !== 5 && x.status === 200 ? [k < 5 ? k : k - 1] : []));
  assert.deepEqual(
    cola.map((x) => Number(x.texto.match(/^envío (\d+) /)[1])).sort((a, b) => a - b),
    aceptados,
  );
  assert.ok(!cola.some((x) => x.id === 'r1'));
  assert.deepEqual(leer(DB, 'reviews').map((x) => x.id), ['r1']);
});

// Bloquea solo las escrituras al dominio `dom`: run() dice que no cambió nada.
function bloquearEscrituras(DB, dom) {
  const prepare = DB.prepare.bind(DB);
  DB.prepare = (sql) => {
    const st = prepare(sql);
    return {
      bind: (...a) => {
        const d = sql.startsWith('UPDATE') ? a[2] : a[0];
        if (!sql.startsWith('SELECT') && d === dom) return { run: async () => ({ meta: { changes: 0 } }) };
        return st.bind(...a);
      },
    };
  };
}

// El orden es la garantía: si el destino no acepta la escritura, la reseña sigue en la cola.
for (const [accion, destino] of [['aprobar', 'reviews'], ['rechazar', 'rejected']]) {
  test(`${accion} con el destino ocupado responde 503 y la reseña sigue en la cola`, async () => {
    const DB = d1EnMemoria();
    siembra(DB, 'reviewsQueue', [r1]);
    bloquearEscrituras(DB, destino);
    const res = await moderar(DB, { accion, id: 'r1' });
    assert.equal(res.status, 503);
    assert.equal((await res.json()).error, 'ocupado_reintenta');
    assert.ok(leer(DB, 'reviewsQueue').some((x) => x.id === 'r1'));
  });
}

test('retirar y resolver quitan solo ese id', async () => {
  const DB = d1EnMemoria();
  siembra(DB, 'reviews', [{ id: 'a' }, { id: 'b' }]);
  siembra(DB, 'reports', [{ id: 'd1' }, { id: 'd2' }]);
  assert.equal((await moderar(DB, { accion: 'retirar', id: 'a' })).status, 200);
  assert.deepEqual(leer(DB, 'reviews'), [{ id: 'b' }]);
  assert.equal((await moderar(DB, { accion: 'resolver', id: 'd2' })).status, 200);
  assert.deepEqual(leer(DB, 'reports'), [{ id: 'd1' }]);
});

test('retirar o resolver un id inexistente responde 404 y no escribe', async () => {
  const DB = d1EnMemoria();
  siembra(DB, 'reviews', [{ id: 'a' }]);
  const res = await moderar(DB, { accion: 'retirar', id: 'nope' });
  assert.equal(res.status, 404);
  assert.equal((await res.json()).error, 'no_encontrada');
  assert.equal((await moderar(DB, { accion: 'resolver', id: 'nope' })).status, 404);
  assert.equal(DB.filas.get('reviews').updated_at, TS);
  assert.ok(!DB.filas.has('reports'));
});

test('contención sostenida responde 503 ocupado_reintenta', async () => {
  const DB = d1EnMemoria();
  siembra(DB, 'reviews', [{ id: 'a' }]);
  const prepare = DB.prepare.bind(DB);
  DB.prepare = (sql) => (sql.startsWith('UPDATE')
    ? { bind: () => ({ run: async () => ({ meta: { changes: 0 } }) }) }
    : prepare(sql));
  const res = await moderar(DB, { accion: 'retirar', id: 'a' });
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error, 'ocupado_reintenta');
  assert.equal(res.headers.get('Retry-After'), '1');
});

test('sin DB responde 503 sin_backend', async () => {
  const res = await onRequestPost({ request: peticion({ accion: 'retirar', id: 'a' }), env: { ALLOW_INSECURE_ADMIN: '1' } });
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error, 'sin_backend');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost } from './[domain].js';

const request = (body) => new Request('https://armado.mx/api/append/reports', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

const REPORTE_VALIDO = {
  reviewId: 'r_47', tipo: 'arma', entidadId: 47, entidadNombre: 'Ruger LCP',
  reviewExcerpt: 'Una reseña pública breve', motivo: 'datos',
  detalle: 'La reseña contiene el teléfono de una tercera persona.',
  email: 'ana@example.com', extra: 'no debe persistir',
};

test('un reporte inválido devuelve 400 antes de leer o escribir D1', async () => {
  let calls = 0;
  const DB = { prepare() { calls++; throw new Error('D1 no debe tocarse'); } };
  const res = await onRequestPost({
    request: request({ tipo: 'arma', motivo: 'inventado', detalle: 'x'.repeat(30) }),
    env: { DB }, params: { domain: 'reports' },
  });
  assert.equal(res.status, 400);
  assert.equal(calls, 0);
});

test('un reporte válido escribe una sola versión saneada como pendiente', async () => {
  const writes = [];
  const DB = {
    prepare(sql) {
      return {
        bind(...args) {
          if (sql.startsWith('SELECT')) return { first: async () => null };
          writes.push(args);
          return { run: async () => ({ success: true }) };
        },
      };
    },
  };
  const res = await onRequestPost({
    request: request(REPORTE_VALIDO), env: { DB }, params: { domain: 'reports' },
  });
  assert.equal(res.status, 200);
  assert.equal(writes.length, 1);
  const persisted = JSON.parse(writes[0][1]);
  assert.equal(persisted.length, 1);
  assert.equal(persisted[0].status, 'pending');
  assert.equal(persisted[0].extra, undefined);
});

// Prueba de functions/api/append/[domain].js. Corre en `npm test`; vive en scripts/ para
// no viajar dentro de functions/, que es lo que despliega Pages.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost } from '../functions/api/append/[domain].js';

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
          return { run: async () => ({ success: true, meta: { changes: 1 } }) };
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

// D1 simulada en memoria con el mismo contrato que usa _lib.js: SELECT ... first,
// INSERT ... ON CONFLICT DO NOTHING y UPDATE ... WHERE updated_at = ?, ambos con
// meta.changes. Los await entre lectura y escritura dejan que los envíos se
// intercalen como en producción.
function d1EnMemoria() {
  const filas = new Map();
  const tic = () => new Promise((r) => setTimeout(r, Math.random() * 3));
  return {
    filas,
    prepare(sql) {
      return {
        bind(...a) {
          return {
            first: async () => { await tic(); const f = filas.get(a[0]); return f ? { ...f } : null; },
            run: async () => {
              await tic();
              if (sql.startsWith('INSERT')) {
                if (filas.has(a[0])) return { meta: { changes: 0 } };
                filas.set(a[0], { data: a[1], updated_at: a[2] });
                return { meta: { changes: 1 } };
              }
              const [data, nuevo, domain, previo] = a;
              const f = filas.get(domain);
              if (!f || f.updated_at !== previo) return { meta: { changes: 0 } };
              filas.set(domain, { data, updated_at: nuevo });
              return { meta: { changes: 1 } };
            },
          };
        },
      };
    },
  };
}

test('envíos simultáneos no se pisan: ninguno se pierde', async () => {
  const DB = d1EnMemoria();
  const N = 20;
  const res = await Promise.all(Array.from({ length: N }, (_, i) => onRequestPost({
    request: request({ ...REPORTE_VALIDO, detalle: `Denuncia número ${i} con detalle suficiente.` }),
    env: { DB }, params: { domain: 'reports' },
  })));
  const ok = res.filter((r) => r.status === 200).length;
  const persistidos = JSON.parse(DB.filas.get('reports').data);
  // Lo que respondió 200 tiene que estar guardado; lo que no, respondió 503 visible.
  assert.equal(persistidos.length, ok);
  assert.ok(res.every((r) => r.status === 200 || r.status === 503));
  assert.ok(ok >= N * 0.9, `casi todo entra pese a la contención (${ok}/${N})`);
});

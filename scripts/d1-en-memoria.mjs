// D1 simulada para las pruebas de functions/. Compartida por varios archivos de prueba.
// D1 simulada en memoria con el mismo contrato que usa _lib.js: SELECT ... first,
// INSERT ... ON CONFLICT DO NOTHING y UPDATE ... WHERE updated_at = ?, ambos con
// meta.changes. Los await entre lectura y escritura dejan que los envíos se
// intercalen como en producción.
export function d1EnMemoria() {
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

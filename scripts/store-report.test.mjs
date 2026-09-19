import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const storeFile = fileURLToPath(new URL('../src/lib/store.js', import.meta.url));
const REPORTE_WEB_VALIDO = {
  reviewId: 'r_47', tipo: 'arma', entidadId: '47', entidadNombre: 'Ruger LCP',
  reviewExcerpt: 'Una reseña pública breve', motivo: 'datos',
  detalle: 'La reseña contiene el teléfono de una tercera persona.', email: '',
};

function loadStore(reportResponse) {
  const storageMap = new Map();
  const localStorage = {
    getItem: (key) => storageMap.has(key) ? storageMap.get(key) : null,
    setItem: (key, value) => storageMap.set(key, String(value)),
    removeItem: (key) => storageMap.delete(key),
  };
  const fetch = async (url) => String(url).endsWith('/state')
    ? { ok: true, status: 200, json: async () => ({}) }
    : reportResponse;
  const window = {
    DB: [], AMX_PRICE_HISTORY_SEED: {}, armaPlaceholder: () => '', addEventListener: () => {},
    localStorage, location: { protocol: 'https:', origin: 'https://armado.mx' }, fetch,
  };
  const sandbox = { console, URL, localStorage, location: window.location, fetch, setTimeout, clearTimeout, window };
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(storeFile, 'utf8'), sandbox, { filename: storeFile });
  return { Store: window.Store, localStorage };
}

test('Store.addReport no persiste en localStorage y devuelve el resultado HTTP', async () => {
  const { Store, localStorage } = loadStore({ ok: true, status: 200, json: async () => ({ ok: true }) });
  const before = localStorage.getItem('amx_reports_v1');
  const result = await Store.addReport(REPORTE_WEB_VALIDO);
  assert.equal(result.ok, true);
  assert.equal(localStorage.getItem('amx_reports_v1'), before);
  assert.equal(JSON.parse(before).length, 0);
});

test('Store.addReport conserva el fallo sin notificar éxito', async () => {
  const { Store, localStorage } = loadStore({ ok: false, status: 503, json: async () => ({ error: 'sin_backend' }) });
  const result = await Store.addReport(REPORTE_WEB_VALIDO);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), { ok: false, status: 503, error: 'sin_backend' });
  assert.deepEqual(JSON.parse(localStorage.getItem('amx_reports_v1')), []);
});

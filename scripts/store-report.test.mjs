import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const storeFile = fileURLToPath(new URL('../src/lib/store.js', import.meta.url));
const soporteFile = fileURLToPath(new URL('../src/lib/soporte.js', import.meta.url));
const REPORTE_WEB_VALIDO = {
  reviewId: 'r_47', tipo: 'arma', entidadId: '47', entidadNombre: 'Ruger LCP',
  reviewExcerpt: 'Una reseña pública breve', motivo: 'datos',
  detalle: 'La reseña contiene el teléfono de una tercera persona.', email: '',
};

function loadStore(reportResponse, { loadSupport = true } = {}) {
  const storageMap = new Map();
  const localStorage = {
    getItem: (key) => storageMap.has(key) ? storageMap.get(key) : null,
    setItem: (key, value) => storageMap.set(key, String(value)),
    removeItem: (key) => storageMap.delete(key),
  };
  let reportCalls = 0;
  const fetch = async (url) => {
    if (String(url).endsWith('/state')) return { ok: true, status: 200, json: async () => ({}) };
    reportCalls++;
    return reportResponse;
  };
  const window = {
    DB: [], AMX_PRICE_HISTORY_SEED: {}, armaPlaceholder: () => '', addEventListener: () => {},
    localStorage, location: { protocol: 'https:', origin: 'https://armado.mx' }, fetch,
  };
  const sandbox = { console, URL, localStorage, location: window.location, fetch, setTimeout, clearTimeout, window };
  vm.createContext(sandbox);
  if (loadSupport) vm.runInContext(readFileSync(soporteFile, 'utf8'), sandbox, { filename: soporteFile });
  vm.runInContext(readFileSync(storeFile, 'utf8'), sandbox, { filename: storeFile });
  return { Store: window.Store, localStorage, reportCalls: () => reportCalls };
}

const settleHydrate = () => new Promise((resolve) => setImmediate(resolve));

test('Store.addReport delega en soporte, confirma 2xx y no persiste ni notifica', async () => {
  const { Store, localStorage, reportCalls } = loadStore({ ok: true, status: 200, json: async () => ({ ok: true }) });
  await settleHydrate();
  let notifications = 0;
  Store._notify = () => { notifications++; };
  const before = localStorage.getItem('amx_reports_v1');
  const result = await Store.addReport(REPORTE_WEB_VALIDO);
  assert.equal(result.ok, true);
  assert.equal(result.status, 200);
  assert.equal(reportCalls(), 1);
  assert.equal(localStorage.getItem('amx_reports_v1'), before);
  assert.equal(JSON.parse(before).length, 0);
  assert.equal(notifications, 0);
});

test('Store.addReport conserva el 503 sin persistir ni notificar éxito', async () => {
  const { Store, localStorage, reportCalls } = loadStore({ ok: false, status: 503, json: async () => ({ error: 'sin_backend' }) });
  await settleHydrate();
  let notifications = 0;
  Store._notify = () => { notifications++; };
  const result = await Store.addReport(REPORTE_WEB_VALIDO);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), { ok: false, status: 503, error: 'sin_backend' });
  assert.equal(reportCalls(), 1);
  assert.deepEqual(JSON.parse(localStorage.getItem('amx_reports_v1')), []);
  assert.equal(notifications, 0);
});

test('Store.addReport no hace POST propio cuando falta el helper de soporte', async () => {
  const { Store, reportCalls } = loadStore(
    { ok: true, status: 200, json: async () => ({ ok: true }) }, { loadSupport: false },
  );
  await settleHydrate();
  const result = await Store.addReport(REPORTE_WEB_VALIDO);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), { ok: false, status: 0, error: 'sin_backend' });
  assert.equal(reportCalls(), 0);
});

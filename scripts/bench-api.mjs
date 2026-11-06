// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later

// Banco de CPU de las Functions públicas: mide el tiempo de CPU de los handlers REALES
// (functions/api/state.js y append/[domain].js) contra un snapshot de producción,
// sobre D1 en SQLite (d1-sqlite.mjs) y una Cache API falsa.
//
//   npm run bench:api                          # descarga https://armado.mx/api/state
//   npm run bench:api -- --fixture estado.json # snapshot guardado (p. ej. uno con el blob de visitas)
//
// Escala: con el código anterior (6-nov-2026) este banco daba ~10 ms en GET /api/state y ~5 ms
// por visita en HEFESTO, y el dashboard de Cloudflare 10.6 ms de mediana: la escala es parecida.
// El límite del plan gratis es 10 ms de CPU por petición; la meta es p99 < 10 ms.
// No mide el arranque del isolate.
import { readFileSync } from 'node:fs';
import { d1Sqlite, cacheFalsa } from './d1-sqlite.mjs';

const args = process.argv.slice(2);
const iFix = args.indexOf('--fixture');
const N = 200;

async function snapshot() {
  if (iFix >= 0) return JSON.parse(readFileSync(args[iFix + 1], 'utf8'));
  const res = await fetch('https://armado.mx/api/state');
  if (!res.ok) throw new Error('no se pudo descargar /api/state: ' + res.status);
  return res.json();
}

function sembrar(estado) {
  const DB = d1Sqlite();
  DB.sqlite.exec('CREATE TABLE IF NOT EXISTS visitas_dia (dia TEXT NOT NULL, arma_id INTEGER NOT NULL, ' +
    'n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (dia, arma_id))');
  for (const [dominio, valor] of Object.entries(estado)) DB.sembrar(dominio, valor, '2026-11-01 20:00:00');
  // Las visitas, además, en su tabla (para el código nuevo), agregadas por día.
  const ins = DB.sqlite.prepare('INSERT INTO visitas_dia (dia, arma_id, n) VALUES (?, ?, 1) ' +
    'ON CONFLICT(dia, arma_id) DO UPDATE SET n = n + 1');
  for (const [id, marcas] of Object.entries(estado.visits || {})) {
    for (const t of marcas) ins.run(new Date(t).toISOString().slice(0, 10), Number(id));
  }
  return DB;
}

async function cpu(nombre, fn, n = N) {
  for (let i = 0; i < 10; i++) await fn(i);
  const t0 = process.cpuUsage();
  for (let i = 0; i < n; i++) await fn(i);
  const d = process.cpuUsage(t0);
  const ms = (d.user + d.system) / n / 1000;
  console.log(`  ${nombre.padEnd(46)} ${ms.toFixed(2).padStart(7)} ms`);
  return ms;
}

const estado = await snapshot();
const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(0) + ' KB';
console.log(`Snapshot: ${kb(JSON.stringify(estado))} · dominios: ${Object.keys(estado).join(', ')}`);

const { onRequestGet } = await import('../functions/api/state.js');
const { onRequestPost } = await import('../functions/api/append/[domain].js');
const ctx = (request, DB) => {
  const pendientes = [];
  return { request, env: { DB }, params: {}, waitUntil: (p) => pendientes.push(p), pendientes };
};
const get = (headers = {}) => new Request('https://armado.mx/api/state', { headers });

console.log('\nGET /api/state');
{
  const DB = sembrar(estado);
  delete globalThis.caches;
  const r = await onRequestGet(ctx(get(), DB));
  console.log(`  respuesta: ${kb(await r.text())} · cache-control: ${r.headers.get('cache-control')} · etag: ${r.headers.get('etag') || '—'}`);
  // El cuerpo no se lee: en Cloudflare el runtime lo transmite fuera de JavaScript. Leerlo aquí
  // mediría la conversión texto↔bytes de Node, no el handler.
  const sinLeer = async (res) => { if (res.body) await res.body.cancel(); };
  await cpu('sin caché (cada petición arma el snapshot)', async () => { const c = ctx(get(), DB); await sinLeer(await onRequestGet(c)); await Promise.all(c.pendientes); });

  globalThis.caches = { default: cacheFalsa() };
  const c0 = ctx(get(), DB);
  const r0 = await onRequestGet(c0); await r0.text(); await Promise.all(c0.pendientes);
  const etag = r0.headers.get('etag');
  await cpu('con caché caliente (copia guardada)', async () => { const c = ctx(get(), DB); await sinLeer(await onRequestGet(c)); await Promise.all(c.pendientes); });
  if (etag) await cpu('navegador con la misma versión (304)', async () => { const c = ctx(get({ 'If-None-Match': etag }), DB); await sinLeer(await onRequestGet(c)); await Promise.all(c.pendientes); });
  delete globalThis.caches;
}

console.log('\nPOST /api/append/visits');
{
  const DB = sembrar(estado);
  const ids = Object.keys(estado.visits || { 1: [] }).map(Number);
  await cpu('una visita a una ficha', async (i) => {
    const c = ctx(new Request('https://armado.mx/api/append/visits', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ armaId: ids[i % ids.length], ts: Date.now() }),
    }), DB);
    c.params.domain = 'visits';
    const r = await onRequestPost(c);
    if (!r.ok) throw new Error('append visits respondió ' + r.status);
    await Promise.all(c.pendientes);
  });
}

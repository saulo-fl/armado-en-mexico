// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later

// Pruebas de las visitas en su tabla (functions/api/_visitas.js) y del POST /api/append/visits,
// sobre SQLite real (d1-sqlite.mjs). Corre en `npm test`; vive en scripts/ para no viajar
// dentro de functions/, que es lo que despliega Pages.
//
// Existen porque el blob de visitas anterior pasó del límite de 10 ms de CPU del plan gratis
// sin dar ningún error visible hasta que Cloudflare empezó a cortar peticiones (nov-2026).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { d1Sqlite } from './d1-sqlite.mjs';
import {
  armaIdValido, registrarVisita, mantenerRanking, diaUTC, _olvidarDiaRevisado,
  VISITAS_MAX_ID, VISITAS_DIAS_GUARDADOS, DOMINIO_RANKING,
} from '../functions/api/_visitas.js';
import { onRequestPost } from '../functions/api/append/[domain].js';
import { agregarPorDia, sqlMigracion, leerBlob } from './migrar-visitas.mjs';

const DIA = 86_400_000;
const AHORA = Date.parse('2026-11-06T18:00:00Z');
const visitas = (DB) => DB.sqlite.prepare('SELECT dia, arma_id, n FROM visitas_dia ORDER BY dia, arma_id').all().map((r) => ({ ...r }));
const ranking = (DB) => {
  const f = DB.sqlite.prepare('SELECT data FROM state WHERE domain = ?').get(DOMINIO_RANKING);
  return f ? JSON.parse(f.data) : null;
};
const post = (body) => new Request('https://armado.mx/api/append/visits', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

beforeEach(() => _olvidarDiaRevisado());

test('ids de arma: enteros de 1 al tope, nada más', () => {
  for (const bueno of [1, 47, '47', VISITAS_MAX_ID]) assert.equal(armaIdValido(bueno), Number(bueno));
  for (const malo of [0, -3, 1.5, VISITAS_MAX_ID + 1, 100000, 'abc', '12abc', null, '', true, undefined, {}]) {
    assert.equal(armaIdValido(malo), null, `rechaza ${JSON.stringify(malo)}`);
  }
});

test('una visita es un contador por arma y día: no crece con cada visita', async () => {
  const DB = d1Sqlite();
  for (let i = 0; i < 50; i++) await registrarVisita(DB, 7, { ahora: AHORA });
  await registrarVisita(DB, 8, { ahora: AHORA });
  await registrarVisita(DB, 7, { ahora: AHORA + DIA });
  assert.deepEqual(visitas(DB), [
    { dia: '2026-11-06', arma_id: 7, n: 50 },
    { dia: '2026-11-06', arma_id: 8, n: 1 },
    { dia: '2026-11-07', arma_id: 7, n: 1 },
  ]);
});

test('el ranking se recalcula una vez al día y ordena por visitas de 30 días', async () => {
  const DB = d1Sqlite();
  const ins = DB.sqlite.prepare('INSERT INTO visitas_dia (dia, arma_id, n) VALUES (?, ?, ?)');
  ins.run(diaUTC(AHORA - 40 * DIA), 1, 999); // fuera de la ventana de 30 días
  ins.run(diaUTC(AHORA - 29 * DIA), 2, 5);   // dentro (primer día de la ventana)
  ins.run(diaUTC(AHORA - 1 * DIA), 3, 9);
  ins.run(diaUTC(AHORA - 1 * DIA), 4, 5);
  assert.equal(await mantenerRanking(DB, AHORA), 'recalculado');
  assert.deepEqual(ranking(DB), { dia: '2026-11-06', dias: 30, top: [[3, 9], [2, 5], [4, 5]] });

  // Mismo día: no vuelve a agregar la tabla ni a escribir la fila (no cambia la versión del snapshot).
  const antes = DB.sqlite.prepare('SELECT updated_at FROM state WHERE domain = ?').get(DOMINIO_RANKING).updated_at;
  DB.consultas.length = 0;
  assert.equal(await mantenerRanking(DB, AHORA + 3600_000), 'al_dia');
  assert.equal(DB.consultas.length, 1, 'solo lee la fila del ranking');
  assert.equal(DB.sqlite.prepare('SELECT updated_at FROM state WHERE domain = ?').get(DOMINIO_RANKING).updated_at, antes);
});

test('el mantenimiento borra los días que ya no hacen falta', async () => {
  const DB = d1Sqlite();
  const ins = DB.sqlite.prepare('INSERT INTO visitas_dia (dia, arma_id, n) VALUES (?, ?, 1)');
  ins.run(diaUTC(AHORA - (VISITAS_DIAS_GUARDADOS + 1) * DIA), 1);
  ins.run(diaUTC(AHORA - (VISITAS_DIAS_GUARDADOS - 1) * DIA), 1);
  await mantenerRanking(DB, AHORA);
  assert.deepEqual(visitas(DB).map((v) => v.dia), [diaUTC(AHORA - (VISITAS_DIAS_GUARDADOS - 1) * DIA)]);
});

test('registrarVisita solo revisa el ranking la primera vez del día en el isolate', async () => {
  const DB = d1Sqlite();
  await registrarVisita(DB, 1, { ahora: AHORA });
  DB.consultas.length = 0;
  await registrarVisita(DB, 1, { ahora: AHORA + 1000 });
  assert.deepEqual(DB.consultas.map((q) => q.split(' ')[0]), ['INSERT'], 'una visita del mismo día = un solo upsert');
  await registrarVisita(DB, 1, { ahora: AHORA + DIA });
  assert.equal(ranking(DB).dia, '2026-11-07', 'al cambiar de día se recalcula');
});

test('POST /api/append/visits: un upsert, mantenimiento en waitUntil, ids malos → 400', async () => {
  const DB = d1Sqlite();
  const pendientes = [];
  const res = await onRequestPost({
    request: post({ armaId: 12, ts: Date.now() + 10 * 365 * DIA }), env: { DB },
    params: { domain: 'visits' }, waitUntil: (p) => pendientes.push(p),
  });
  assert.equal(res.status, 200);
  assert.equal(pendientes.length, 1, 'el ranking del día se calcula después de responder');
  await Promise.all(pendientes);
  const hoy = diaUTC();
  assert.deepEqual(visitas(DB), [{ dia: hoy, arma_id: 12, n: 1 }], 'la fecha la pone el servidor, no el ts del cliente');
  assert.deepEqual(ranking(DB).top, [[12, 1]]);
  assert.equal(DB.sqlite.prepare("SELECT COUNT(*) AS c FROM state WHERE domain = 'visits'").get().c, 0,
    'ya no se escribe el blob de visitas');

  for (const malo of [0, 'abc', VISITAS_MAX_ID + 1]) {
    const r = await onRequestPost({ request: post({ armaId: malo }), env: { DB }, params: { domain: 'visits' } });
    assert.equal(r.status, 400, `armaId ${malo}`);
  }
});

test('POST /api/append/visits sin la tabla responde 503 visible', async () => {
  const DB = d1Sqlite({ esquema: false });
  DB.sqlite.exec('CREATE TABLE state (domain TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT NOT NULL)');
  const r = await onRequestPost({ request: post({ armaId: 3 }), env: { DB }, params: { domain: 'visits' } });
  assert.equal(r.status, 503);
  assert.equal((await r.json()).error, 'visitas_no_disponible');
});

test('migración del blob: suma por día una sola vez, guarda respaldo y fuerza recalcular el ranking', async () => {
  const DB = d1Sqlite();
  const t = (iso) => Date.parse(iso);
  const blob = {
    7: [t('2026-11-01T01:00:00Z'), t('2026-11-01T23:59:00Z'), t('2026-11-02T10:00:00Z')],
    8: [t('2026-11-02T11:00:00Z')],
    999999: [t('2026-11-02T11:00:00Z')], // id fuera de rango: se ignora
  };
  DB.sembrar('visits', blob);
  DB.sembrar('masVisitadas', { dia: '2026-11-02', dias: 30, top: [] });
  // Visitas que ya entraron por el código nuevo antes de migrar: se suman, no se pisan.
  DB.sqlite.prepare("INSERT INTO visitas_dia VALUES ('2026-11-02', 7, 10)").run();

  // Formato de `wrangler d1 execute --json`.
  const exportado = JSON.stringify([{ results: [{ data: JSON.stringify(blob) }], success: true }]);
  const filas = agregarPorDia(leerBlob(exportado));
  assert.deepEqual(filas, [['2026-11-01', 7, 2], ['2026-11-02', 7, 1], ['2026-11-02', 8, 1]]);
  const sql = sqlMigracion(filas, '20261106');
  DB.sqlite.exec(sql);
  DB.sqlite.exec(sql); // repetirla no duplica: el blob ya está renombrado
  assert.deepEqual(visitas(DB), [
    { dia: '2026-11-01', arma_id: 7, n: 2 },
    { dia: '2026-11-02', arma_id: 7, n: 11 },
    { dia: '2026-11-02', arma_id: 8, n: 1 },
  ]);
  const dominios = DB.sqlite.prepare('SELECT domain FROM state ORDER BY domain').all().map((r) => r.domain);
  assert.deepEqual(dominios, ['visits_respaldo_20261106']);
  assert.throws(() => leerBlob(JSON.stringify([{ results: [] }])), /ya se migró/);
});

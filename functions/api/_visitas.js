// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// Visitas a las fichas y ranking «Más visitadas» (Cloudflare Pages Functions + D1).
// Archivo con prefijo "_": no es ruta, solo se importa.
//
// POR QUÉ ESTÁ AQUÍ Y NO EN EL BLOB `visits` DE `state` (nov-2026): el blob guardaba UNA marca
// de tiempo por visita (35 mil, ~500 KB), viajaba entero en cada GET /api/state y cada visita lo
// leía, parseaba, reescribía y guardaba — con reintentos si dos llegaban juntas. Pasó del límite
// de 10 ms de CPU del plan gratis de Workers y crecía con cada visita. Ahora:
//   · una visita = UN upsert en `visitas_dia` (contador por arma y día): sin leer ni JSON;
//   · el ranking se recalcula como mucho una vez al día (UTC) y se guarda en la fila
//     `masVisitadas` de `state` (~0.5 KB), que sí viaja en el snapshot público;
//   · ninguna carga de página agrega la tabla: eso leería miles de filas por visitante y
//     agotaría las 5 M de lecturas diarias gratis de D1.
import { writeDomain } from './_lib.js';

// Tope de id aceptado. El catálogo usa ids correlativos (272 armas, id máx. ~280 en nov-2026);
// 5000 da años de margen y acota cuántas filas por día puede crear un bucle de curl.
export const VISITAS_MAX_ID = 5000;
export const VISITAS_DIAS_RANKING = 30;  // ventana de «Más visitadas» (antes: getTopPopular(10, 30))
export const VISITAS_DIAS_GUARDADOS = 60; // lo que se conserva en la tabla (antes: 60 días de marcas)
export const VISITAS_TOP = 30;            // cuántas armas guarda el ranking (la portada muestra 10)
export const DOMINIO_RANKING = 'masVisitadas';

const DIA_MS = 86_400_000;
export const diaUTC = (ms = Date.now()) => new Date(ms).toISOString().slice(0, 10);

// Id de arma válido o null. Number() y no parseInt(): '12abc' no es un id.
export function armaIdValido(v) {
  if (v === null || v === '' || typeof v === 'boolean') return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= VISITAS_MAX_ID ? n : null;
}

// Día ya revisado por ESTE isolate: evita leer la fila del ranking en cada visita. Si otro
// isolate ya lo recalculó, este solo hace una lectura de 1 fila y se entera.
let _diaRevisado = null;
export function _olvidarDiaRevisado() { _diaRevisado = null; } // solo pruebas

// Suma una visita. `esperar` es context.waitUntil: el mantenimiento diario corre después de
// responder, sin retrasar al visitante. Sin él (pruebas), se espera aquí.
export async function registrarVisita(db, armaId, { ahora = Date.now(), esperar } = {}) {
  const dia = diaUTC(ahora);
  await db.prepare(
    'INSERT INTO visitas_dia (dia, arma_id, n) VALUES (?, ?, 1) ' +
    'ON CONFLICT(dia, arma_id) DO UPDATE SET n = n + 1'
  ).bind(dia, armaId).run();
  if (_diaRevisado === dia) return;
  const tarea = mantenerRanking(db, ahora)
    .then(() => { _diaRevisado = dia; })
    .catch(() => { /* se reintenta en la siguiente visita */ });
  if (esperar) esperar(tarea); else await tarea;
}

// Recalcula «Más visitadas» si la fila no es de hoy, y borra los días que ya no hacen falta.
// Idempotente: dos isolates que lo corran a la vez escriben lo mismo.
export async function mantenerRanking(db, ahora = Date.now()) {
  const dia = diaUTC(ahora);
  const fila = await db.prepare('SELECT data FROM state WHERE domain = ?').bind(DOMINIO_RANKING).first();
  let actual = null;
  try { actual = fila && JSON.parse(fila.data); } catch { actual = null; }
  if (actual && actual.dia === dia) return 'al_dia';

  // Ventana de 30 días contando hoy: [hoy-29, hoy].
  const desde = diaUTC(ahora - (VISITAS_DIAS_RANKING - 1) * DIA_MS);
  const { results } = await db.prepare(
    'SELECT arma_id, SUM(n) AS n FROM visitas_dia WHERE dia >= ? ' +
    'GROUP BY arma_id ORDER BY n DESC, arma_id ASC LIMIT ?'
  ).bind(desde, VISITAS_TOP).all();
  const top = (results || []).map((r) => [Number(r.arma_id), Number(r.n)]);
  await writeDomain(db, DOMINIO_RANKING, { dia, dias: VISITAS_DIAS_RANKING, top });
  await db.prepare('DELETE FROM visitas_dia WHERE dia < ?')
    .bind(diaUTC(ahora - VISITAS_DIAS_GUARDADOS * DIA_MS)).run();
  return 'recalculado';
}

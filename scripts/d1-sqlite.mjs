// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later

// D1 sobre SQLite real (node:sqlite) para las pruebas de functions/ y el banco de CPU.
// A diferencia de d1-en-memoria.mjs (que imita solo el compare-and-swap de `state`),
// esta ejecuta el SQL de verdad: ON CONFLICT, GROUP BY, IN (...), DELETE por rango.
// Mismo contrato que usan las Functions: prepare().bind().first()/all()/run() y batch().
// `consultas` registra cada SQL ejecutado, para comprobar cuándo NO se toca D1.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SCHEMA = fileURLToPath(new URL('./sql/schema.sql', import.meta.url));

export function d1Sqlite({ esquema = true } = {}) {
  const db = new DatabaseSync(':memory:');
  if (esquema) db.exec(readFileSync(SCHEMA, 'utf8'));
  const consultas = [];
  const plano = (fila) => (fila ? { ...fila } : null);
  const sentencia = (sql, args = []) => ({
    bind: (...a) => sentencia(sql, a),
    async first(columna) {
      consultas.push(sql);
      const fila = plano(db.prepare(sql).get(...args));
      if (!fila) return null;
      return columna ? fila[columna] : fila;
    },
    async all() {
      consultas.push(sql);
      return { results: db.prepare(sql).all(...args).map(plano), success: true, meta: {} };
    },
    async run() {
      consultas.push(sql);
      const info = db.prepare(sql).run(...args);
      return { success: true, meta: { changes: Number(info.changes) } };
    },
  });
  return {
    sqlite: db,
    consultas,
    prepare: (sql) => sentencia(sql),
    async batch(lista) {
      db.exec('BEGIN');
      try {
        const out = [];
        for (const s of lista) out.push(await s.run());
        db.exec('COMMIT');
        return out;
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
    // Atajo para sembrar: una fila de `state` por dominio, con el formato que se pida.
    sembrar(dominio, valor, updatedAt = new Date().toISOString()) {
      db.prepare('INSERT INTO state (domain, data, updated_at) VALUES (?, ?, ?) ' +
        'ON CONFLICT(domain) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at')
        .run(dominio, typeof valor === 'string' ? valor : JSON.stringify(valor), updatedAt);
    },
  };
}

// Cache API falsa (caches.default): guarda por URL, respeta solo lo que el código usa.
// Guarda BYTES, como la caché real: así un acierto no cuesta una conversión texto→bytes que en
// Cloudflare no ocurre en JavaScript (falsearía el banco de CPU).
export function cacheFalsa() {
  const guardado = new Map();
  const clave = (r) => (typeof r === 'string' ? r : r.url);
  return {
    guardado,
    async match(req) {
      const e = guardado.get(clave(req));
      return e ? new Response(e.cuerpo, { status: e.status, headers: e.headers }) : undefined;
    },
    async put(req, res) {
      guardado.set(clave(req), { cuerpo: new Uint8Array(await res.arrayBuffer()), status: res.status, headers: [...res.headers] });
    },
    async delete(req) { return guardado.delete(clave(req)); },
  };
}

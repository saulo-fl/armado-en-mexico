// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later

// Migración ÚNICA (nov-2026): pasa el blob histórico `visits` de `state` (una marca de tiempo
// por visita) a la tabla `visitas_dia` (contador por arma y día), para no perder el ranking
// «Más visitadas» al cambiar de modelo. Ver functions/api/_visitas.js.
//
// Se corre DESPUÉS de publicar en main el código que escribe en la tabla: a partir de ahí nadie
// escribe ya el blob, así que lo que se migra y lo que entra nuevo no se solapan.
//
//   1. Exportar el blob (solo lectura):
//        npx wrangler d1 execute armado-en-mexico --remote --json \
//          --command "SELECT data FROM state WHERE domain = 'visits'" > visits-blob.json
//   2. Generar el SQL:
//        node scripts/migrar-visitas.mjs visits-blob.json migrar-visitas.sql
//   3. Aplicarlo (ESCRITURA en producción — con aprobación de Saulo):
//        npx wrangler d1 execute armado-en-mexico --remote --file=migrar-visitas.sql
//
// El SQL es seguro de repetir: el INSERT solo suma si la fila `visits` sigue existiendo, y la
// última sentencia la RENOMBRA a `visits_respaldo_<fecha>` (el blob queda intacto como respaldo;
// se borra a mano cuando el dashboard confirme el arreglo). Al final borra `masVisitadas` para
// que la siguiente visita recalcule el ranking con el histórico ya sumado.
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const MAX_TUPLAS = 3500; // D1 limita una sentencia a 100 KB; cada tupla ocupa ~25 bytes

export function agregarPorDia(blob, maxId = 5000) {
  const cuenta = new Map();
  for (const [id, marcas] of Object.entries(blob || {})) {
    const n = Number(id);
    if (!Number.isInteger(n) || n < 1 || n > maxId || !Array.isArray(marcas)) continue;
    for (const t of marcas) {
      if (typeof t !== 'number' || !Number.isFinite(t)) continue;
      const clave = new Date(t).toISOString().slice(0, 10) + '|' + n;
      cuenta.set(clave, (cuenta.get(clave) || 0) + 1);
    }
  }
  return [...cuenta].map(([k, c]) => { const [dia, id] = k.split('|'); return [dia, Number(id), c]; })
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1]));
}

export function sqlMigracion(filas, sufijo) {
  if (!/^\d{8}$/.test(sufijo)) throw new Error('sufijo de respaldo inválido: ' + sufijo);
  if (filas.length > MAX_TUPLAS) {
    throw new Error(`${filas.length} pares día-arma no caben en una sentencia; parte el INSERT antes de seguir`);
  }
  const out = [];
  if (filas.length) {
    const tuplas = filas.map(([dia, id, n]) => `('${dia}',${id},${n})`).join(',\n  ');
    // INSERT ... SELECT con WHERE (requisito de SQLite para un upsert con SELECT) y guardia:
    // si el blob ya se renombró en una corrida anterior, no suma nada.
    out.push(
      'INSERT INTO visitas_dia (dia, arma_id, n)\n' +
      `SELECT column1, column2, column3 FROM (VALUES\n  ${tuplas}\n)\n` +
      "WHERE EXISTS (SELECT 1 FROM state WHERE domain = 'visits')\n" +
      'ON CONFLICT(dia, arma_id) DO UPDATE SET n = n + excluded.n;'
    );
  }
  out.push(`UPDATE state SET domain = 'visits_respaldo_${sufijo}' WHERE domain = 'visits';`);
  out.push("DELETE FROM state WHERE domain = 'masVisitadas';");
  return out.join('\n\n') + '\n';
}

// Acepta la salida de `wrangler d1 execute --json` o el blob JSON tal cual.
export function leerBlob(texto) {
  const v = JSON.parse(texto);
  if (Array.isArray(v) && v[0] && Array.isArray(v[0].results)) {
    const fila = v[0].results[0];
    if (!fila) throw new Error("no hay fila 'visits' en state (¿ya se migró?)");
    return JSON.parse(fila.data);
  }
  return v;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [entrada, salida] = process.argv.slice(2);
  if (!entrada || !salida) {
    console.error('uso: node scripts/migrar-visitas.mjs <visits-blob.json> <salida.sql>');
    process.exit(2);
  }
  const blob = leerBlob(readFileSync(entrada, 'utf8'));
  const filas = agregarPorDia(blob);
  if (!filas.length) {
    // Sin esto, un archivo equivocado generaría un SQL que solo renombra el blob: el histórico
    // quedaría fuera del ranking sin ningún error.
    console.error('no hay visitas que migrar: ¿es la salida de la consulta del paso 1?');
    process.exit(1);
  }
  const marcas = filas.reduce((a, f) => a + f[2], 0);
  const sufijo = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  writeFileSync(salida, sqlMigracion(filas, sufijo));
  console.log(`${marcas} visitas → ${filas.length} filas día-arma` +
    (filas.length ? ` (${filas[0][0]} a ${filas[filas.length - 1][0]})` : '') + ` · SQL en ${salida}`);
}

// GET /api/state — snapshot público de todos los dominios de curaduría.
// La app pública lo lee al arrancar (hydrate) y lo cachea en localStorage.
// Si D1 no está vinculada todavía, devuelve {} → la app opera con sus seeds.
import { json, ALL_DOMAINS } from './_lib.js';

export async function onRequestGet({ env }) {
  if (!env.DB) return json({});
  const out = {};
  try {
    const { results } = await env.DB.prepare('SELECT domain, data FROM state').all();
    for (const row of results || []) {
      if (!ALL_DOMAINS.includes(row.domain)) continue;
      try { out[row.domain] = JSON.parse(row.data); } catch { /* ignora fila corrupta */ }
    }
  } catch (e) {
    // tabla inexistente / D1 no inicializada → snapshot vacío (modo seed)
    return json({});
  }
  return json(out);
}

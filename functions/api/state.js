// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// GET /api/state — snapshot de los dominios de contenido editable.
// La app pública lo lee al arrancar (hydrate) y lo cachea en localStorage.
// Si D1 no está vinculada todavía, devuelve {} → la app opera con sus seeds.
//
// PRIVACIDAD: esta ruta NO exige autenticación, así que el snapshot público
// omite los dominios que contienen datos de terceros — 'rejected' guarda las
// reseñas rechazadas con el correo de quien escribió (y, desde antes del
// 13-sep-2026, propuestas de arma con submitterEmail), y devolverlo aquí
// publicaría esos correos en una URL abierta. 'reviewsQueue' y 'reports' están
// en la misma situación: llevan el correo del autor Y texto SIN MODERAR. Publicarlos aquí saltaría la cola
// entera — cualquiera podría leer lo que aún no ha aprobado nadie.
// El admin autenticado sí recibe el snapshot completo, que es lo que necesita
// para gestionar la cola desde cualquier navegador.
import { json, ALL_DOMAINS, requireAdmin } from './_lib.js';

// Lo que puede ver cualquiera: contenido publicado + agregados sin identidad
// ('visits' son marcas de tiempo, no llevan persona) + 'reviews', que son las
// reseñas YA APROBADAS y de las que el admin ya retiró el correo al moderar.
const PUBLIC_DOMAINS = ALL_DOMAINS.filter(
  (d) => !['rejected', 'reviewsQueue', 'reports'].includes(d)
);

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({});
  // requireAdmin devuelve null si la petición está autorizada. Aquí no se usa
  // como puerta (esta ruta es pública): solo decide CUÁNTO se devuelve. Sin
  // token sale por el 401 sin tocar el JWKS, así que no cuesta nada.
  const visibles = (await requireAdmin(request, env)) ? PUBLIC_DOMAINS : ALL_DOMAINS;
  const out = {};
  try {
    const { results } = await env.DB.prepare('SELECT domain, data FROM state').all();
    for (const row of results || []) {
      if (!visibles.includes(row.domain)) continue;
      try { out[row.domain] = JSON.parse(row.data); } catch { /* ignora fila corrupta */ }
    }
  } catch (e) {
    // tabla inexistente / D1 no inicializada → snapshot vacío (modo seed)
    return json({});
  }
  return json(out);
}

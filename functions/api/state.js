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
//
// RENDIMIENTO (nov-2026): el plan gratis de Workers corta una petición a los 10 ms de CPU, y
// esta ruta se pide en CADA carga de página. Antes parseaba y re-serializaba ~850 KB por petición
// (9.9 ms medidos con `npm run bench:api`) y pasaba del límite. Ahora:
//   1. El blob de visitas ya no viaja (vive en la tabla visitas_dia; ver _visitas.js).
//   2. El snapshot se arma PEGANDO el texto JSON de cada fila, sin parsear y re-serializar.
//   3. El snapshot público se guarda en la caché de Cloudflare (Cache API) hasta que algo cambie.
//      La clave lleva una VERSIÓN = huella de los `updated_at` de las filas públicas, así que
//      cualquier escritura (admin, moderación, resembrado de las 20:00) la invalida sola, sin
//      purgas. La versión misma se recuerda 60 s por centro de datos: cada uno consulta D1 como
//      mucho una vez por minuto y el resto de peticiones no toca D1.
//   4. ETag = versión: el navegador que ya la tiene recibe un 304 sin cuerpo.
// El admin no pasa por la caché: recibe siempre lo último de D1 (no-store).
import { json, ALL_DOMAINS, requireAdmin } from './_lib.js';

// Lo que no viaja en ningún snapshot: el blob histórico de visitas (ahora es una tabla).
const FUERA_DEL_SNAPSHOT = ['visits'];
// Lo que solo ve el admin: datos de terceros y texto sin moderar (ver PRIVACIDAD arriba).
const SOLO_ADMIN = ['rejected', 'reviewsQueue', 'reports'];

export const DOMINIOS_SNAPSHOT_ADMIN = ALL_DOMAINS.filter((d) => !FUERA_DEL_SNAPSHOT.includes(d));
// Lo que puede ver cualquiera: contenido publicado + 'masVisitadas' (agregado sin identidad)
// + 'reviews', que son las reseñas YA APROBADAS y de las que el admin ya retiró el correo.
export const DOMINIOS_SNAPSHOT_PUBLICO = DOMINIOS_SNAPSHOT_ADMIN.filter((d) => !SOLO_ADMIN.includes(d));

// Cambia este valor si cambia la FORMA del snapshot: invalida todas las copias guardadas.
const FORMATO = 'state-v2';
const VERSION_TTL_S = 60;           // cada centro de datos re-consulta la versión a lo mucho 1/min
const COPIA_TTL_S = 7 * 24 * 3600;  // red de seguridad; al cambiar la versión cambia la clave

const JSON_UTF8 = 'application/json; charset=utf-8';

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.DB) return json({});
  // requireAdmin devuelve null si la petición está autorizada. Aquí no se usa
  // como puerta (esta ruta es pública): solo decide CUÁNTO se devuelve. Sin
  // token sale por el 401 sin tocar el JWKS, así que no cuesta nada.
  const esAdmin = !(await requireAdmin(request, env));
  try {
    if (esAdmin) {
      return new Response(await armarSnapshot(env.DB, DOMINIOS_SNAPSHOT_ADMIN), {
        headers: { 'Content-Type': JSON_UTF8, 'Cache-Control': 'no-store' },
      });
    }
    return await snapshotPublico(context);
  } catch (e) {
    // tabla inexistente / D1 no inicializada → snapshot vacío (modo seed), sin cachear
    return json({});
  }
}

async function snapshotPublico(context) {
  const { request, env } = context;
  const cache = cacheDisponible();
  // Guardar en caché no debe retrasar la respuesta: va a waitUntil (llamado como método,
  // para no perder su `this`). Sin waitUntil (pruebas), se espera aquí.
  const despues = (p) => (typeof context.waitUntil === 'function' ? context.waitUntil(p) : p);
  const origen = new URL(request.url).origin;

  // 1) Versión vigente: de la caché del centro de datos (≤ 60 s) o de D1.
  const claveVersion = new Request(`${origen}/api/state/__version?f=${FORMATO}`);
  let version = null;
  if (cache) {
    const r = await cache.match(claveVersion);
    if (r) version = await r.text();
  }
  if (!version) {
    version = await leerVersion(env.DB);
    if (cache) {
      await despues(cache.put(claveVersion, new Response(version, {
        headers: { 'Cache-Control': `public, max-age=${VERSION_TTL_S}` },
      })));
    }
  }

  const cabeceras = {
    'Content-Type': JSON_UTF8,
    // no-cache = el navegador guarda la copia pero pregunta cada vez (y recibe 304 si no cambió).
    'Cache-Control': 'no-cache',
    'ETag': `"${version}"`,
  };

  // 2) El navegador ya tiene esta versión → 304 sin cuerpo.
  if (coincideEtag(request.headers.get('If-None-Match'), version)) {
    return new Response(null, { status: 304, headers: { ...cabeceras, 'X-Amx-Cache': 'NOT-MODIFIED' } });
  }

  // 3) Copia guardada de esta versión.
  const claveCopia = new Request(`${origen}/api/state/__snapshot?v=${version}`);
  if (cache) {
    const copia = await cache.match(claveCopia);
    if (copia) return new Response(copia.body, { headers: { ...cabeceras, 'X-Amx-Cache': 'HIT' } });
  }

  // 4) Sin copia: se arma una vez y se guarda.
  const cuerpo = await armarSnapshot(env.DB, DOMINIOS_SNAPSHOT_PUBLICO);
  if (cache) {
    await despues(cache.put(claveCopia, new Response(cuerpo, {
      headers: { 'Content-Type': JSON_UTF8, 'Cache-Control': `public, max-age=${COPIA_TTL_S}` },
    })));
  }
  return new Response(cuerpo, { headers: { ...cabeceras, 'X-Amx-Cache': 'MISS' } });
}

function cacheDisponible() {
  try { return (typeof caches !== 'undefined' && caches.default) || null; } catch { return null; }
}

// Huella de las filas públicas. NO vale MAX(updated_at): el resembrado escribe
// datetime('now') = '2026-11-06 20:00:00' y las Functions ISO = '2026-11-06T20:00:00.000Z';
// como texto, el espacio pierde siempre contra la 'T' del mismo día y MAX no cambiaría.
export async function leerVersion(db) {
  const marcas = DOMINIOS_SNAPSHOT_PUBLICO.map(() => '?').join(',');
  const { results } = await db.prepare(
    `SELECT domain, updated_at FROM state WHERE domain IN (${marcas}) ORDER BY domain`
  ).bind(...DOMINIOS_SNAPSHOT_PUBLICO).all();
  const huella = FORMATO + '|' + (results || []).map((r) => r.domain + '=' + r.updated_at).join('|');
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(huella)));
  return Array.from(bytes.slice(0, 12), (b) => b.toString(16).padStart(2, '0')).join('');
}

// Cloudflare debilita el ETag al comprimir (W/"…"), y If-None-Match puede traer una lista.
function coincideEtag(cabecera, version) {
  if (!cabecera) return false;
  return cabecera.split(',').some((e) => e.trim().replace(/^W\//, '') === `"${version}"`);
}

// Pega el JSON de cada fila tal como está guardado: sin JSON.parse + JSON.stringify de todo.
// Cada fila se valida con un parse (solo al reconstruir, no en cada petición) para que una
// fila corrupta se omita en vez de romper el snapshot entero, como antes.
export async function armarSnapshot(db, dominios) {
  const marcas = dominios.map(() => '?').join(',');
  const { results } = await db.prepare(
    `SELECT domain, data FROM state WHERE domain IN (${marcas})`
  ).bind(...dominios).all();
  const partes = [];
  for (const row of results || []) {
    if (!dominios.includes(row.domain) || typeof row.data !== 'string') continue;
    try { JSON.parse(row.data); } catch { continue; } // ignora fila corrupta
    partes.push(JSON.stringify(row.domain) + ':' + row.data);
  }
  return '{' + partes.join(',') + '}';
}

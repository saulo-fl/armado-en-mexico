// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// Armado en México — utilidades compartidas de la API (Cloudflare Pages Functions)
// Archivos con prefijo "_" NO se convierten en rutas: este módulo solo se importa.

// Dominios de contenido editable que se sincronizan (mismo nombre que las claves de store.js).
// NOTA: el dominio 'admin' (contraseña/sesión) NUNCA viaja al servidor.
export const ALL_DOMAINS = [
  'armas', 'pages', 'promos', 'favorites', 'appConfig', 'manuales',
  'priceHist', 'rejected', 'visits',
  'reviews', 'reviewsQueue', 'reports',
];

// Dominios con escritura PÚBLICA por "append" (el servidor hace el merge atómico).
// 'reviews' NO está: las reseñas aprobadas solo las escribe el admin al moderar.
// Si estuviera aquí, cualquiera publicaría texto sin pasar por la cola.
// 'suggestions' y 'pending' (Sugerir cambios / Proponer arma) salieron el
// 13-sep-2026: el catálogo sale de los inventarios oficiales, no de envíos.
export const APPEND_DOMAINS = ['visits', 'reviewsQueue', 'reports'];

// Una reseña sin cuerpo no puede influir en el agregado: el texto es lo que el
// moderador juzga. El máximo es MUY inferior a los 5000 del saneador genérico
// porque el dominio 'reviews' viaja entero en cada GET /api/state, en cada carga
// de página, a todos los visitantes.
// ponytail: agregado en cliente sobre el blob completo. Si esto crece, la salida
// es una tabla fila-por-reseña con COUNT, no subir el tope.
export const RESENA_MIN = 100;
export const RESENA_MAX = 1200;
export const REPORT_MIN = 20;
export const REPORT_MAX = 1200;

const TIPOS_REPORTE = ['arma', 'accesorio', 'municion', 'campo', 'curso', 'otro'];
const MOTIVOS_REPORTE = ['ilegal', 'irrespetuoso', 'fuera-de-tema', 'comercial', 'manipulacion', 'datos', 'otro'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeReport(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return { ok: false, error: 'reporte_invalido' };
  }
  const value = {
    reviewId: String(item.reviewId || '').trim(),
    tipo: String(item.tipo || '').trim(),
    entidadId: String(item.entidadId == null ? '' : item.entidadId).trim(),
    entidadNombre: String(item.entidadNombre || '').trim(),
    reviewExcerpt: String(item.reviewExcerpt || '').trim(),
    motivo: String(item.motivo || '').trim(),
    detalle: String(item.detalle || '').trim(),
    email: String(item.email || '').trim(),
  };
  const demasiadoLargo = value.reviewId.length > 80 || value.entidadId.length > 80
    || value.entidadNombre.length > 120 || value.reviewExcerpt.length > 240
    || value.email.length > 160;
  if (demasiadoLargo) return { ok: false, error: 'campo_demasiado_largo' };
  if (!TIPOS_REPORTE.includes(value.tipo)) return { ok: false, error: 'tipo_invalido' };
  if (!MOTIVOS_REPORTE.includes(value.motivo)) return { ok: false, error: 'motivo_invalido' };
  if (value.detalle.length < REPORT_MIN || value.detalle.length > REPORT_MAX) {
    return { ok: false, error: 'detalle_invalido' };
  }
  if (value.email && !EMAIL.test(value.email)) return { ok: false, error: 'email_invalido' };
  return { ok: true, value };
}

// Límite de tamaño del cuerpo (anti-abuso). 1 MB cubre de sobra cualquier dominio.
export const MAX_BODY = 1_000_000;

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

// ── Persistencia (document store por dominio) ───────────────────────────────
export async function readDomain(db, domain, fallback) {
  if (!db) return fallback;
  const row = await db.prepare('SELECT data FROM state WHERE domain = ?').bind(domain).first();
  if (!row || row.data == null) return fallback;
  try { return JSON.parse(row.data); } catch { return fallback; }
}

// Escritura condicional (compare-and-swap) para el append público. Solo escribe
// si la fila sigue como se leyó: si otro envío la cambió entretanto, devuelve
// false y el llamador reintenta sobre el estado nuevo. Sin esto, dos envíos
// simultáneos leían lo mismo y el último pisaba al primero: una reseña o una
// denuncia se perdía sin error.
// `prevUpdatedAt` es el updated_at leído (null si la fila no existía). El nuevo
// es estrictamente mayor que el anterior, para que dos escrituras en el mismo
// milisegundo no dejen la fila con el mismo sello (y un CAS viejo no acierte).
export async function readDomainVersion(db, domain) {
  const row = await db.prepare('SELECT data, updated_at FROM state WHERE domain = ?').bind(domain).first();
  if (!row) return { data: undefined, updatedAt: null };
  let data;
  try { data = row.data == null ? undefined : JSON.parse(row.data); } catch { data = undefined; }
  return { data, updatedAt: row.updated_at };
}

export async function writeDomainIf(db, domain, value, prevUpdatedAt) {
  const body = JSON.stringify(value);
  const prevMs = prevUpdatedAt ? Date.parse(prevUpdatedAt) : NaN;
  const nowIso = new Date(Math.max(Date.now(), Number.isFinite(prevMs) ? prevMs + 1 : 0)).toISOString();
  const res = prevUpdatedAt == null
    ? await db.prepare(
      'INSERT INTO state (domain, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(domain) DO NOTHING'
    ).bind(domain, body, nowIso).run()
    : await db.prepare(
      'UPDATE state SET data = ?, updated_at = ? WHERE domain = ? AND updated_at = ?'
    ).bind(body, nowIso, domain, prevUpdatedAt).run();
  return !!(res && res.meta && res.meta.changes === 1);
}

// Dominios que escribe el público (o que se moderan elemento por elemento).
// El PUT de admin los rechaza: reemplazarlos con la copia del navegador borra lo
// que llegó después de abrir el panel. Solo cambian por /api/append y por
// /api/admin/moderar.
export const DOMINIOS_MODERADOS = ['reviews', 'reviewsQueue', 'rejected', 'reports', 'visits'];

// Con 8 intentos y espera aleatoria creciente, una ráfaga de 20 envíos en el
// mismo instante entra entera en la prueba (functions-append.test.mjs).
const INTENTOS = 8;
const espera = (i) => new Promise((r) => setTimeout(r, Math.random() * 10 * (i + 1)));

// Lee-modifica-escribe un dominio con escritura condicional y reintentos.
// `cambiar(actual)` devuelve el valor nuevo, o undefined si no hay nada que
// escribir. `actual` es lo guardado, o `vacio` si la fila no existe.
// Devuelve 'ok', 'sin_cambio' o 'ocupado' (contención sostenida: mejor un error
// visible que perder la escritura en silencio).
export async function actualizarDominio(db, domain, cambiar, vacio) {
  for (let i = 0; i < INTENTOS; i++) {
    const { data, updatedAt } = await readDomainVersion(db, domain);
    const next = cambiar(data === undefined ? vacio : data);
    if (next === undefined) return 'sin_cambio';
    if (await writeDomainIf(db, domain, next, updatedAt)) return 'ok';
    await espera(i);
  }
  return 'ocupado';
}

export async function writeDomain(db, domain, value) {
  const body = typeof value === 'string' ? value : JSON.stringify(value);
  await db.prepare(
    `INSERT INTO state (domain, data, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(domain) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
  ).bind(domain, body, new Date().toISOString()).run();
}

// ── Merge de "append" público (replica el shape que espera store.js) ────────
export function mergeAppend(domain, current, item) {
  if (domain === 'reviewsQueue') {
    // Validación en el SERVIDOR, no solo en el formulario: este endpoint es
    // público y se puede llamar con curl. Una reseña que no cumpla se descarta
    // en silencio (el cliente ya validó; aquí solo cerramos el hueco).
    const arr = Array.isArray(current) ? current.slice() : [];
    const texto = typeof item.texto === 'string' ? item.texto.trim() : '';
    const entidadId = parseInt(item.entidadId, 10);
    if (typeof item.recomienda !== 'boolean') return arr;
    if (texto.length < RESENA_MIN || texto.length > RESENA_MAX) return arr;
    if (!Number.isFinite(entidadId)) return arr;
    if (!TIPOS_RESENA.includes(item.tipo)) return arr;
    const clean = sanitizeItem({
      tipo: item.tipo, entidadId, recomienda: item.recomienda, texto,
      autor: String(item.autor || '').slice(0, 60),
      email: String(item.email || '').slice(0, 160),
      entidadNombre: String(item.entidadNombre || '').slice(0, 120),
    });
    // UUID y no Date.now()+random(1000): con mil valores, dos envíos en el mismo
    // milisegundo podían compartir id, y aprobar/rechazar filtra por id.
    clean.id = 'r_' + crypto.randomUUID();
    clean.submittedAt = new Date().toISOString();
    clean.status = 'pending';
    arr.unshift(clean);
    return recortarPorBytes(arr.slice(0, 1000), MAX_DOMINIO);
  }
  if (domain === 'reports') {
    const arr = Array.isArray(current) ? current.slice() : [];
    const normalized = normalizeReport(item);
    if (!normalized.ok) return arr;
    const clean = normalized.value;
    clean.id = 'd_' + crypto.randomUUID();
    clean.submittedAt = new Date().toISOString();
    clean.status = 'pending';
    arr.unshift(clean);
    // Doble tope: por número de items y por bytes. Solo el de items dejaba un
    // techo de 1000 × el tamaño de cada uno, que era ilimitado antes de acotar
    // los campos anidados. Los más recientes van primero, así que el recorte
    // descarta los más viejos.
    return recortarPorBytes(arr.slice(0, 1000), MAX_DOMINIO);
  }
  if (domain === 'visits') {
    const out = (current && typeof current === 'object') ? { ...current } : {};
    const n = parseInt(item.armaId, 10);
    if (!Number.isInteger(n) || n < 1 || n > VISITS_MAX_ID) return out;
    const armaId = String(n);
    // La marca la pone el SERVIDOR. Antes se aceptaba `item.ts` del cliente, y
    // con curl se podían fechar visitas en el futuro (nunca caducan) o meter
    // cientos de golpe para colocar un arma en «Más visitadas».
    const now = Date.now();
    const ts = now;
    const cutoff = now - 60 * 24 * 60 * 60 * 1000;
    const list = (Array.isArray(out[armaId]) ? out[armaId] : []).concat([ts]).filter((t) => t > cutoff && t <= now);
    // ponytail: 500 marcas por arma acota la fila a ~1.2 MB con las 179 armas,
    // bajo el límite de 2 MB de D1. Con 5000 el techo eran ~12 MB y la escritura
    // habría empezado a fallar en silencio. Si algún día hace falta el conteo
    // exacto, la salida es una tabla fila-por-visita agregada con COUNT, no
    // subir este número.
    out[armaId] = list.slice(-VISITS_POR_ARMA);
    // Tope de CLAVES: sin él, un bucle de curl con armaId distintos inflaba la
    // fila hasta pasar los 2 MB de D1, y a partir de ahí toda escritura de
    // visitas fallaba (y /api/state servía el blob inflado a cada visitante).
    // Si se pasa, sale la clave con menos marcas: un id inventado con 1 visita
    // cede su sitio ante un arma real.
    const claves = Object.keys(out);
    if (claves.length > VISITS_MAX_CLAVES) {
      claves.sort((a, b) => (out[a] || []).length - (out[b] || []).length);
      for (const k of claves.slice(0, claves.length - VISITS_MAX_CLAVES)) {
        if (k !== armaId) delete out[k];
      }
    }
    return out;
  }
  return current;
}

// visits: peor caso 330 claves × 400 marcas × 14 bytes (13 dígitos + coma)
// ≈ 1.85 MB, bajo los 2 MB por fila de D1 (functions-lib.test.mjs lo mide).
// El catálogo tiene hoy 261 armas (id máx. 264): si pasa de 330, sube
// VISITS_MAX_CLAVES y baja VISITS_POR_ARMA en la misma proporción.
export const VISITS_MAX_ID = 99999;
export const VISITS_MAX_CLAVES = 330;
export const VISITS_POR_ARMA = 400;

// Tipos de entidad que aceptan reseña. Cerrado a propósito: un `tipo` libre
// dejaría crear cubos arbitrarios en el mismo blob.
const TIPOS_RESENA = ['arma', 'accesorio', 'municion', 'campo', 'curso'];

// Recorta items enviados por el público. Los topes son POR BYTES SERIALIZADOS,
// no por número de elementos: recortar un array a 100 no sirve de nada si cada
// elemento es un objeto de 50 KB. Sin esto, un solo POST anónimo mete cientos de
// KB en la fila del dominio — y /api/state la sirve entera en CADA carga de
// página, a todos los visitantes.
const MAX_CAMPO = 8 * 1024;    // un campo anidado (un objeto o array dentro de una denuncia, etc.)
const MAX_ITEM = 16 * 1024;    // el item completo ya saneado
const MAX_DOMINIO = 512 * 1024; // la lista acumulada de un dominio

function pesa(v) { try { return JSON.stringify(v).length; } catch { return Infinity; } }

function sanitizeItem(item) {
  const out = {};
  for (const k of Object.keys(item || {})) {
    if (k === 'id' || k === 'submittedAt' || k === 'status') continue; // el server los fija
    const v = item[k];
    if (typeof v === 'string') out[k] = v.slice(0, 5000);
    else if (typeof v === 'number' || typeof v === 'boolean') out[k] = v;
    else if (Array.isArray(v)) { const a = v.slice(0, 100); if (pesa(a) <= MAX_CAMPO) out[k] = a; }
    else if (v && typeof v === 'object') { if (pesa(v) <= MAX_CAMPO) out[k] = v; }
  }
  // Red de seguridad: muchos campos pequeños también suman. Conserva los que
  // quepan, en orden, y descarta el resto.
  if (pesa(out) > MAX_ITEM) {
    const min = {};
    for (const k of Object.keys(out)) {
      min[k] = out[k];
      if (pesa(min) > MAX_ITEM) { delete min[k]; break; }
    }
    return min;
  }
  return out;
}

// Corta una lista para que el JSON del dominio no crezca sin techo. D1 rechaza
// filas de más de 2 MB, y aunque no lo hiciera, esto viaja en cada /api/state.
function recortarPorBytes(arr, maxBytes) {
  const out = [];
  let total = 2; // los corchetes
  for (const it of arr) {
    const s = pesa(it) + 1;
    if (total + s > maxBytes) break;
    out.push(it);
    total += s;
  }
  return out;
}

// ── Autenticación de admin vía Cloudflare Access (verificación del JWT) ─────
// Devuelve null si la petición está autorizada, o un Response de error si no.
let _jwksCache = { url: null, keys: null, at: 0 };

export async function requireAdmin(request, env) {
  // Escape hatch SOLO para desarrollo local (wrangler pages dev). Se ata además
  // a localhost: si la variable se colara por error en el proyecto de Pages,
  // en armado.mx no abriría nada.
  if (env.ALLOW_INSECURE_ADMIN === '1' && esLocal(request)) return null;

  const team = env.CF_ACCESS_TEAM_DOMAIN; // p.ej. "tu-equipo.cloudflareaccess.com"
  const aud = env.CF_ACCESS_AUD;          // Application Audience (AUD) tag
  if (!team || !aud) {
    // Fail-closed: sin configurar Access no se permite escribir.
    return json({ error: 'admin_auth_no_configurado' }, 503);
  }
  const token = request.headers.get('Cf-Access-Jwt-Assertion') ||
    cookie(request, 'CF_Authorization');
  if (!token) return json({ error: 'no_autenticado' }, 401);

  try {
    const ok = await verifyAccessJwt(token, team, aud);
    return ok ? null : json({ error: 'prohibido' }, 403);
  } catch (e) {
    return json({ error: 'auth_error' }, 403);
  }
}

function esLocal(request) {
  try {
    const h = new URL(request.url).hostname;
    return h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
  } catch { return false; }
}

function cookie(request, name) {
  const raw = request.headers.get('Cookie') || '';
  const m = raw.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? m[1] : null;
}

async function verifyAccessJwt(token, team, aud) {
  const [h, p, s] = token.split('.');
  if (!h || !p || !s) return false;
  const header = JSON.parse(b64urlToString(h));
  const payload = JSON.parse(b64urlToString(p));
  // Access firma con RS256; cualquier otro alg se rechaza antes de buscar llave.
  if (header.alg !== 'RS256') return false;

  // Validar audiencia y expiración antes de la firma (barato).
  const auds = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!auds.includes(aud)) return false;
  // exp es obligatorio: un token sin caducidad no se acepta. nbf con 60 s de holgura.
  const ahora = Date.now() / 1000;
  if (typeof payload.exp !== 'number' || ahora > payload.exp) return false;
  if (typeof payload.nbf === 'number' && ahora + 60 < payload.nbf) return false;
  const iss = 'https://' + team;
  if (payload.iss !== iss) return false;

  const jwk = await getKey(team, header.kid);
  if (!jwk) return false;
  const key = await crypto.subtle.importKey(
    'jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']
  );
  const data = new TextEncoder().encode(h + '.' + p);
  const sig = b64urlToBytes(s);
  return crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, sig, data);
}

async function getKey(team, kid) {
  const url = 'https://' + team + '/cdn-cgi/access/certs';
  const fresh = _jwksCache.url === url && _jwksCache.keys && (Date.now() - _jwksCache.at) < 3600_000;
  if (!fresh) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('jwks_fetch_failed');
    const body = await res.json();
    _jwksCache = { url, keys: body.keys || [], at: Date.now() };
  }
  return _jwksCache.keys.find((k) => k.kid === kid) || null;
}

function b64urlToBytes(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(str.length / 4) * 4, '=');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function b64urlToString(str) {
  return new TextDecoder().decode(b64urlToBytes(str));
}

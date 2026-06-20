// Armado en México — utilidades compartidas de la API (Cloudflare Pages Functions)
// Archivos con prefijo "_" NO se convierten en rutas: este módulo solo se importa.

// Dominios de curaduría que se sincronizan (mismo nombre que las claves de store.js).
// NOTA: el dominio 'admin' (contraseña/sesión) NUNCA viaja al servidor.
export const ALL_DOMAINS = [
  'armas', 'pages', 'promos', 'favorites', 'appConfig', 'manuales',
  'priceHist', 'suggestions', 'pending', 'rejected', 'visits', 'ratings',
];

// Dominios con escritura PÚBLICA por "append" (el servidor hace el merge atómico).
export const APPEND_DOMAINS = ['suggestions', 'pending', 'ratings', 'visits'];

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

export async function writeDomain(db, domain, value) {
  const body = typeof value === 'string' ? value : JSON.stringify(value);
  await db.prepare(
    `INSERT INTO state (domain, data, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(domain) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
  ).bind(domain, body, new Date().toISOString()).run();
}

// ── Merge de "append" público (replica el shape que espera store.js) ────────
export function mergeAppend(domain, current, item) {
  if (domain === 'suggestions' || domain === 'pending') {
    const arr = Array.isArray(current) ? current.slice() : [];
    const prefix = domain === 'pending' ? 'p_' : 's_';
    const clean = sanitizeItem(item);
    clean.id = prefix + Date.now() + '_' + Math.floor(Math.random() * 1000);
    clean.submittedAt = new Date().toISOString();
    clean.status = 'pending';
    arr.unshift(clean);
    return arr.slice(0, 1000); // tope anti-abuso
  }
  if (domain === 'ratings') {
    const out = (current && typeof current === 'object') ? { ...current } : {};
    const armaId = String(parseInt(item.armaId, 10));
    const stars = Math.max(1, Math.min(5, Math.round(Number(item.stars) || 0)));
    if (!armaId || armaId === 'NaN' || !stars) return out;
    const prev = out[armaId] || { sum: 0, count: 0 };
    out[armaId] = { sum: (prev.sum || 0) + stars, count: (prev.count || 0) + 1 };
    return out;
  }
  if (domain === 'visits') {
    const out = (current && typeof current === 'object') ? { ...current } : {};
    const armaId = String(parseInt(item.armaId, 10));
    if (!armaId || armaId === 'NaN') return out;
    const ts = Number(item.ts) || Date.now();
    const cutoff = Date.now() - 60 * 24 * 60 * 60 * 1000;
    const list = (Array.isArray(out[armaId]) ? out[armaId] : []).concat([ts]).filter((t) => t > cutoff);
    out[armaId] = list.slice(-5000);
    return out;
  }
  return current;
}

// Recorta strings descomunales en items enviados por el público.
function sanitizeItem(item) {
  const out = {};
  for (const k of Object.keys(item || {})) {
    if (k === 'id' || k === 'submittedAt' || k === 'status') continue; // el server los fija
    const v = item[k];
    if (typeof v === 'string') out[k] = v.slice(0, 5000);
    else if (typeof v === 'number' || typeof v === 'boolean') out[k] = v;
    else if (Array.isArray(v)) out[k] = v.slice(0, 100);
    else if (v && typeof v === 'object') out[k] = v; // p.ej. specs anidadas de un arma propuesta
  }
  return out;
}

// ── Autenticación de admin vía Cloudflare Access (verificación del JWT) ─────
// Devuelve null si la petición está autorizada, o un Response de error si no.
let _jwksCache = { url: null, keys: null, at: 0 };

export async function requireAdmin(request, env) {
  // Escape hatch SOLO para desarrollo local (wrangler pages dev).
  if (env.ALLOW_INSECURE_ADMIN === '1') return null;

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

  // Validar audiencia y expiración antes de la firma (barato).
  const auds = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!auds.includes(aud)) return false;
  if (payload.exp && Date.now() / 1000 > payload.exp) return false;
  const iss = 'https://' + team;
  if (payload.iss && payload.iss !== iss) return false;

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

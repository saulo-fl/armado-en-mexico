// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// Reporte interno: corrección o fallo enviado desde armado.mx SIN cuenta de GitHub.
// Archivo con prefijo "_": no es ruta, solo se importa (lo usa POST /api/append/issues).
//
// Flujo: valida contra el Issue Form (sin tocar D1) → verifica Turnstile → guarda una fila
// en `reportes_web` → publica el issue en GitHub con el token de saulo-fl, acreditando la
// firma de quien reportó. Si GitHub falla, la fila queda «pendiente» y el admin la reintenta:
// el reporte nunca se pierde. Diseño y decisiones: Documentos de Proyecto/
// 2026-11-23-reportes-internos-plan.md (publicación automática y metadata solo en el admin,
// decididas por Saulo el 23-nov-2026).
//
// El formato sale de functions/api/_formatos.js, GENERADO desde .github/ISSUE_TEMPLATE/*.yml:
// así el cuerpo es idéntico al de un issue hecho con el formulario de GitHub.
//
// PRIVACIDAD: el correo y la metadata del dispositivo se quedan en D1. Nunca van al issue.
import { json } from './_lib.js';
import { FORMATOS } from './_formatos.js';

export const REPO_PUBLICO = 'saulo-fl/armado-en-mexico';
// Todo lo que no llega por armado.mx (preview de develop, *.pages.dev, local) publica aquí,
// un repo PRIVADO: así una prueba o un error de configuración nunca llena el repo público.
export const REPO_PRUEBAS = 'saulo-fl/armado-reportes-pruebas';
export const ETIQUETA_WEB = 'reporte-web';

// Topes (mecanismos aprobados por Saulo el 23-nov-2026). TOPE_COLA: reportes sin publicar
// a partir de los cuales se rechaza lo nuevo (no se borra nada viejo para hacer sitio).
// TOPE_DIARIO: issues automáticos por día UTC; los que pasen quedan pendientes para el admin.
export const TOPE_COLA = 300;
export const TOPE_DIARIO = 30;

export const FIRMA_MIN = 2;
export const FIRMA_MAX = 40;
export const TITULO_MAX = 120;
export const MAX_CUERPO = 64 * 1024; // un reporte completo cabe en ~25 KB
const LARGO = { input: 300, textarea: 4000 };

export const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
export const ACCION_TURNSTILE = 'reporte';
// Clave secreta de prueba oficial de Cloudflare (siempre pasa). Responde con otro host y sin
// acción, así que con ella no se comprueban: solo existe en local.
export const CLAVE_PRUEBA_TURNSTILE = '1x0000000000000000000000000000000AA';
const TIMEOUT_GITHUB_MS = 8000;

// Claves de metadata del dispositivo que se aceptan. Cualquier otra se descarta. El
// formulario (src/lib/metadata-dispositivo.js) debe mandar estas mismas.
export const CLAVES_METADATA = [
  'navegador', 'sistema', 'ua', 'ventana', 'pantalla', 'dpr', 'idioma', 'zonaHoraria',
  'tactil', 'esquemaColor', 'movimientoReducido', 'pagina', 'ruta', 'version', 'errores',
];
const METADATA_MAX = 4096;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GITHUB_USUARIO = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const ALFABETO_FOLIO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // sin 0/O, 1/I/L: se dicta por teléfono

const fallo = (error, campo) => (campo ? { ok: false, error, campo } : { ok: false, error });

function hostArmado(host) {
  return host === 'armado.mx' || host === 'www.armado.mx'
    || host === 'armado-en-mexico.pages.dev' || host.endsWith('.armado-en-mexico.pages.dev');
}

export function repoDestino(url) {
  let host = '';
  try { host = new URL(url).hostname; } catch { /* host vacío → pruebas */ }
  return host === 'armado.mx' || host === 'www.armado.mx' ? REPO_PUBLICO : REPO_PRUEBAS;
}

function paginaValida(valor) {
  try {
    const u = new URL(valor);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    return hostArmado(u.hostname) || u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

// ── Texto del usuario dentro del issue ───────────────────────────────────────
// Un @usuario en el texto notificaría a esa persona desde la cuenta de Saulo: se rompe con
// un espacio de ancho cero. Un correo (ana@example.com) no menciona y no se toca.
export function neutralizarMenciones(s) {
  return String(s).replace(/(^|[^A-Za-z0-9_`/.-])@(?=[A-Za-z0-9])/g, '$1@\u200b');
}

// Un comentario HTML escondería texto y podría falsificar el marcador del folio.
export function limpiarTextoUsuario(s) {
  return neutralizarMenciones(s).replace(/<!--/g, '&lt;!--');
}

function escaparMarkdown(s) {
  return String(s).replace(/([\\`*_{}[\]()#+!|<>~])/g, '\\$1');
}

export const marcador = (folio) => `<!-- armado-reporte:${folio} -->`;

// ── Validación ───────────────────────────────────────────────────────────────
function texto(v) {
  if (v == null) return '';
  if (typeof v !== 'string') return null;
  return v.replace(/\r\n?/g, '\n').replace(CONTROL, '').trim();
}

function limpiarMetadata(m) {
  if (!m || typeof m !== 'object' || Array.isArray(m)) return null;
  const out = {};
  for (const k of CLAVES_METADATA) {
    const v = m[k];
    if (k === 'errores') {
      if (Array.isArray(v)) {
        const lista = v.filter((e) => typeof e === 'string').slice(0, 5).map((e) => e.slice(0, 300));
        if (lista.length) out.errores = lista;
      }
    } else if (typeof v === 'string') {
      out[k] = v.replace(CONTROL, '').slice(0, 300);
    } else if (typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v))) {
      out[k] = v;
    }
  }
  if (JSON.stringify(out).length > METADATA_MAX) delete out.errores;
  if (JSON.stringify(out).length > METADATA_MAX) return null;
  return Object.keys(out).length ? out : null;
}

function tituloPorDefecto(formato, campos) {
  if (campos.nombre) return campos.nombre;
  const base = formato.body.find((c) => (c.type === 'textarea' || c.type === 'input') && c.id !== 'pagina' && campos[c.id]);
  const primera = base ? campos[base.id].split('\n')[0] : 'Reporte desde armado.mx';
  return primera.length > 80 ? primera.slice(0, 79).trimEnd() + '…' : primera;
}

// Devuelve { ok: true, value } o { ok: false, error, campo? }. Nunca toca D1.
export function normalizarReporteWeb(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return fallo('reporte_invalido');
  const id = typeof item.formato === 'string' ? item.formato : '';
  if (!Object.prototype.hasOwnProperty.call(FORMATOS, id)) return fallo('formato_invalido');
  const formato = FORMATOS[id];
  const entrada = item.campos && typeof item.campos === 'object' && !Array.isArray(item.campos) ? item.campos : null;
  if (!entrada) return fallo('campos_invalidos');

  const campos = {};
  for (const c of formato.body) {
    if (c.type === 'markdown') continue;
    const v = entrada[c.id];
    const requerido = !!(c.validations && c.validations.required === true);
    if (c.type === 'checkboxes') {
      const opciones = c.attributes.options;
      if (v != null && !Array.isArray(v)) return fallo('campo_invalido', c.id);
      const marcadas = opciones.map((_, i) => Array.isArray(v) && v[i] === true);
      if (opciones.some((o, i) => o.required === true && !marcadas[i])) return fallo('falta_campo', c.id);
      campos[c.id] = marcadas;
      continue;
    }
    const s = texto(v);
    if (s == null) return fallo('campo_invalido', c.id);
    if (c.type === 'dropdown') {
      if (s && !c.attributes.options.includes(s)) return fallo('opcion_invalida', c.id);
    } else if (s.length > LARGO[c.type]) {
      return fallo('campo_demasiado_largo', c.id);
    }
    if (requerido && !s) return fallo('falta_campo', c.id);
    if (c.id === 'pagina' && s && !paginaValida(s)) return fallo('pagina_invalida', c.id);
    campos[c.id] = s;
  }

  const firma = (texto(item.firma) || '').replace(/\s+/g, ' ');
  if (firma.length < FIRMA_MIN || firma.length > FIRMA_MAX || /https?:|www\.|[<>]/i.test(firma)) {
    return fallo('firma_invalida');
  }
  let github = (texto(item.github) || '').replace(/^@/, '');
  if (github && !GITHUB_USUARIO.test(github)) return fallo('github_invalido');
  const email = texto(item.email) || '';
  if (email && (email.length > 160 || !EMAIL.test(email))) return fallo('email_invalido');
  const propio = (texto(item.titulo) || '').replace(/\s+/g, ' ').slice(0, TITULO_MAX);

  return {
    ok: true,
    value: {
      formato: id,
      titulo: formato.title + (propio || tituloPorDefecto(formato, campos)),
      campos,
      firma,
      github: github || null,
      email: email || null,
      metadata: item.adjuntarMetadata === true ? limpiarMetadata(item.metadata) : null,
    },
  };
}

// ── Cuerpo del issue: el mismo que arma GitHub con el Issue Form ─────────────
// «### etiqueta», línea en blanco, valor; opcionales vacíos como _No response_; casillas
// como «- [x] texto». Los bloques markdown del formulario no viajan (GitHub tampoco los pone).
export function renderCuerpoIssue(formatoId, campos, { firma, folio, github = null, conMetadata = false }) {
  const formato = FORMATOS[formatoId];
  const partes = [];
  for (const c of formato.body) {
    if (c.type === 'markdown') continue;
    let valor;
    if (c.type === 'checkboxes') {
      const marcadas = campos[c.id] || [];
      valor = c.attributes.options.map((o, i) => `- [${marcadas[i] ? 'x' : ' '}] ${o.label}`).join('\n');
    } else {
      const v = campos[c.id];
      if (!v) valor = '_No response_';
      else if (c.attributes.render) valor = '```' + c.attributes.render + '\n' + v + '\n```';
      else valor = limpiarTextoUsuario(v);
    }
    partes.push(`### ${c.attributes.label}\n\n${valor}`);
  }
  const pie = [
    '---',
    `Reportado por **${neutralizarMenciones(escaparMarkdown(firma))}**${github ? ` (@${github})` : ''} desde [armado.mx](https://armado.mx) · folio \`${folio}\``,
    '_Publicado desde la cuenta del proyecto en nombre de quien lo reportó, sin cuenta de GitHub._',
  ];
  if (conMetadata) pie.push('_Adjuntó datos de su dispositivo; los tiene el equipo y no son públicos._');
  pie.push(marcador(folio));
  return partes.join('\n\n') + '\n\n' + pie.join('\n\n') + '\n';
}

// ── Turnstile ────────────────────────────────────────────────────────────────
export async function verificarTurnstile({ token, ip, secret, fetchFn = fetch }) {
  if (!secret) return { ok: false, error: 'captcha_no_configurado', status: 503 };
  if (typeof token !== 'string' || !token || token.length > 2048) {
    return { ok: false, error: 'captcha_invalido', status: 400 };
  }
  const form = new URLSearchParams({ secret, response: token });
  if (ip) form.set('remoteip', ip);
  let d;
  try {
    const res = await fetchFn(SITEVERIFY, {
      method: 'POST', body: form.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    d = await res.json();
  } catch {
    return { ok: false, error: 'captcha_no_disponible', status: 503 };
  }
  if (!d || d.success !== true) return { ok: false, error: 'captcha_invalido', status: 400 };
  if (secret !== CLAVE_PRUEBA_TURNSTILE) {
    if (d.action !== ACCION_TURNSTILE || typeof d.hostname !== 'string' || !hostArmado(d.hostname)) {
      return { ok: false, error: 'captcha_invalido', status: 400 };
    }
  }
  return { ok: true };
}

// ── GitHub ───────────────────────────────────────────────────────────────────
const cabecerasGitHub = (token) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'armado.mx-reportes',
  'Content-Type': 'application/json',
});

// Busca un issue ya creado para este folio (un intento anterior que se cortó después de que
// GitHub lo creara). Lista por etiqueta y fecha en vez de usar la búsqueda, que tarda en indexar.
export async function buscarExistente({ repo, folio, desde, token, fetchFn = fetch }) {
  const q = new URLSearchParams({ labels: ETIQUETA_WEB, state: 'all', since: desde, per_page: '100' });
  const res = await fetchFn(`https://api.github.com/repos/${repo}/issues?${q}`, {
    method: 'GET', headers: cabecerasGitHub(token), signal: AbortSignal.timeout(TIMEOUT_GITHUB_MS),
  });
  if (!res.ok) throw new Error('github_' + res.status);
  const lista = await res.json();
  const m = marcador(folio);
  const hallado = Array.isArray(lista) ? lista.find((i) => i && typeof i.body === 'string' && i.body.includes(m)) : null;
  return hallado ? { numero: hallado.number, url: hallado.html_url } : null;
}

async function marcarPendiente(db, id, error) {
  const ahora = new Date().toISOString();
  await db.prepare("UPDATE reportes_web SET estado = 'pendiente', error = ?, actualizado = ? WHERE id = ?")
    .bind(error, ahora, id).run();
}

// Publica la fila (que ya está en 'publicando'). Devuelve { ok, numero?, url?, error? }.
// `buscarAntes`: el admin lo usa al reintentar, por si un intento anterior sí llegó a crearlo.
export async function publicarIssue({ db, fila, token, fetchFn = fetch, buscarAntes = false }) {
  if (!token) {
    await marcarPendiente(db, fila.id, 'github_no_configurado');
    return { ok: false, error: 'github_no_configurado' };
  }
  const formato = FORMATOS[fila.formato];
  let resultado = null;
  let error = null;
  try {
    if (buscarAntes) resultado = await buscarExistente({ repo: fila.repo, folio: fila.id, desde: fila.creado, token, fetchFn });
    if (!resultado) {
      const res = await fetchFn(`https://api.github.com/repos/${fila.repo}/issues`, {
        method: 'POST',
        headers: cabecerasGitHub(token),
        signal: AbortSignal.timeout(TIMEOUT_GITHUB_MS),
        body: JSON.stringify({
          title: fila.titulo,
          body: renderCuerpoIssue(fila.formato, fila.campos, {
            firma: fila.firma, folio: fila.id, github: fila.github, conMetadata: !!fila.metadata,
          }),
          labels: [...formato.labels, ETIQUETA_WEB],
        }),
      });
      if (res.status === 201) {
        const d = await res.json();
        resultado = { numero: d.number, url: d.html_url };
      } else {
        error = 'github_' + res.status;
      }
    }
  } catch (e) {
    error = /^github_\d+$/.test(e && e.message) ? e.message : 'github_red';
  }
  if (!resultado) {
    await marcarPendiente(db, fila.id, error);
    return { ok: false, error };
  }
  const ahora = new Date().toISOString();
  await db.prepare(`UPDATE reportes_web SET estado = 'publicado', issue_num = ?, issue_url = ?, error = NULL,
      publicado = ?, actualizado = ? WHERE id = ?`)
    .bind(resultado.numero, resultado.url, ahora, ahora, fila.id).run();
  return { ok: true, ...resultado };
}

// ── Moderación (admin) ───────────────────────────────────────────────────────
// «Retirar del público»: reemplaza título y cuerpo, cierra como not_planned y bloquea el
// issue. OJO: GitHub conserva el texto original en el historial de ediciones (visible para
// cualquiera); borrarlo del todo solo se puede a mano en GitHub («Delete issue»). Por eso el
// admin enlaza el issue después de retirarlo.
export const TEXTO_RETIRADO = 'Este reporte se retiró por moderación. El equipo de armado.mx conserva el original.';

export async function retirarIssue({ repo, numero, token, fetchFn = fetch }) {
  const base = `https://api.github.com/repos/${repo}/issues/${numero}`;
  try {
    const res = await fetchFn(base, {
      method: 'PATCH', headers: cabecerasGitHub(token), signal: AbortSignal.timeout(TIMEOUT_GITHUB_MS),
      body: JSON.stringify({ title: '[Retirado por moderación]', body: TEXTO_RETIRADO, state: 'closed', state_reason: 'not_planned' }),
    });
    if (!res.ok) return { ok: false, error: 'github_' + res.status };
  } catch {
    return { ok: false, error: 'github_red' };
  }
  let bloqueado = false;
  try {
    const res = await fetchFn(base + '/lock', {
      method: 'PUT', headers: cabecerasGitHub(token), signal: AbortSignal.timeout(TIMEOUT_GITHUB_MS), body: '{}',
    });
    bloqueado = res.status === 204;
  } catch { /* el contenido ya se retiró; el bloqueo es un extra */ }
  return { ok: true, bloqueado };
}

// Estado (open/closed) de los issues con la etiqueta reporte-web de un repo, desde `desde`.
// Devuelve Map numero → 'open' | 'closed'. Hasta 10 páginas de 100.
export async function estadosIssuesWeb({ repo, desde, token, fetchFn = fetch }) {
  const estados = new Map();
  for (let pagina = 1; pagina <= 10; pagina++) {
    const q = new URLSearchParams({ labels: ETIQUETA_WEB, state: 'all', since: desde, per_page: '100', page: String(pagina) });
    const res = await fetchFn(`https://api.github.com/repos/${repo}/issues?${q}`, {
      method: 'GET', headers: cabecerasGitHub(token), signal: AbortSignal.timeout(TIMEOUT_GITHUB_MS),
    });
    if (!res.ok) throw new Error('github_' + res.status);
    const lista = await res.json();
    if (!Array.isArray(lista)) break;
    for (const i of lista) if (i && Number.isInteger(i.number)) estados.set(i.number, i.state);
    if (lista.length < 100) break;
  }
  return estados;
}

// ── D1 ───────────────────────────────────────────────────────────────────────
export function nuevoFolio() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return 'AMX-' + Array.from(bytes, (b) => ALFABETO_FOLIO[b % ALFABETO_FOLIO.length]).join('');
}

async function insertar(db, v, { estado, repo, error }) {
  const ahora = new Date().toISOString();
  for (let intento = 0; intento < 3; intento++) {
    const id = nuevoFolio();
    try {
      await db.prepare(`INSERT INTO reportes_web
          (id, formato, titulo, campos, firma, github, email, metadata, estado, repo, error, creado, actualizado)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(id, v.formato, v.titulo, JSON.stringify(v.campos), v.firma, v.github, v.email,
          v.metadata ? JSON.stringify(v.metadata) : null, estado, repo, error, ahora, ahora)
        .run();
      return { id, creado: ahora };
    } catch (e) {
      if (!/UNIQUE|PRIMARY KEY|constraint/i.test(String(e && e.message))) throw e;
    }
  }
  throw new Error('folio_repetido');
}

// ── POST /api/append/issues ──────────────────────────────────────────────────
export async function recibirReporte(context) {
  const { request, env } = context;
  const fetchFn = context.fetchFn || fetch; // las pruebas inyectan la red
  if (!env.DB) return json({ error: 'sin_backend' }, 503);

  const raw = await request.text();
  if (raw.length > MAX_CUERPO) return json({ error: 'payload_demasiado_grande' }, 413);
  let item;
  try { item = JSON.parse(raw); } catch { return json({ error: 'json_invalido' }, 400); }
  if (item == null || typeof item !== 'object') return json({ error: 'json_invalido' }, 400);

  // Primero los campos (barato y sin red): un reporte mal llenado no gasta el captcha, que es
  // de un solo uso. Después el captcha. Solo entonces D1.
  const n = normalizarReporteWeb(item);
  if (!n.ok) return json(n.campo ? { error: n.error, campo: n.campo } : { error: n.error }, 400);
  const cap = await verificarTurnstile({
    token: item.turnstile, ip: request.headers.get('CF-Connecting-IP'), secret: env.TURNSTILE_SECRET, fetchFn,
  });
  if (!cap.ok) return json({ error: cap.error }, cap.status);

  const db = env.DB;
  const repo = repoDestino(request.url);
  let fila;
  try {
    const cola = await db.prepare("SELECT COUNT(*) AS n FROM reportes_web WHERE estado IN ('publicando', 'pendiente')").first('n');
    if (cola >= TOPE_COLA) return json({ error: 'cola_llena' }, 503, { 'Retry-After': '3600' });
    const hoy = new Date().toISOString().slice(0, 10);
    const automaticos = await db.prepare(
      "SELECT COUNT(*) AS n FROM reportes_web WHERE substr(creado, 1, 10) = ? AND estado != 'pendiente'"
    ).bind(hoy).first('n');
    const estado = automaticos >= TOPE_DIARIO ? 'pendiente' : 'publicando';
    const { id, creado } = await insertar(db, n.value, { estado, repo, error: estado === 'pendiente' ? 'tope_diario' : null });
    fila = { id, creado, repo, estado, ...n.value };
  } catch {
    // p. ej. la tabla aún no existe en esta base: visible, no silencioso.
    return json({ error: 'reportes_no_disponible' }, 503);
  }
  if (fila.estado === 'pendiente') return json({ ok: true, folio: fila.id, estado: 'pendiente' });

  const pub = await publicarIssue({ db, fila, token: env.GITHUB_TOKEN_ISSUES, fetchFn });
  return pub.ok
    ? json({ ok: true, folio: fila.id, estado: 'publicado', issue: { numero: pub.numero, url: pub.url } })
    : json({ ok: true, folio: fila.id, estado: 'pendiente' });
}

// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// POST /api/append/:domain — escritura PÚBLICA por "append".
// Sirve para: enviar una reseña a moderación (reviewsQueue), denunciar
// (reports) y registrar visita (visits). El servidor hace el read-modify-write
// con escritura condicional (writeDomainIf) y reintenta si otro envío se le
// adelantó: así dos envíos simultáneos no se pisan.
import { json, APPEND_DOMAINS, MAX_BODY, normalizeReport, actualizarDominio, mergeAppend } from '../_lib.js';

export async function onRequestPost({ request, env, params }) {
  const domain = params.domain;
  if (!APPEND_DOMAINS.includes(domain)) return json({ error: 'dominio_invalido' }, 400);
  if (!env.DB) return json({ error: 'sin_backend' }, 503);

  const raw = await request.text();
  if (raw.length > MAX_BODY) return json({ error: 'payload_demasiado_grande' }, 413);
  let item;
  try { item = JSON.parse(raw); } catch { return json({ error: 'json_invalido' }, 400); }
  if (item == null || typeof item !== 'object') return json({ error: 'json_invalido' }, 400);
  if (domain === 'reports') {
    const normalized = normalizeReport(item);
    if (!normalized.ok) return json({ error: normalized.error }, 400);
    item = normalized.value;
  }

  const defaults = { visits: {} };
  const res = await actualizarDominio(env.DB, domain, (actual) => mergeAppend(domain, actual, item), defaults[domain]);
  if (res === 'ok') return json({ ok: true, domain });
  // Contención sostenida: mejor un error visible que perder el envío en silencio.
  return json({ error: 'ocupado_reintenta' }, 503, { 'Retry-After': '1' });
}

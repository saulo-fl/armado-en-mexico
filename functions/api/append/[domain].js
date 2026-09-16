// Armado en México — Copyright (C) 2026 Saulo Flores Leon
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// POST /api/append/:domain — escritura PÚBLICA por "append".
// Sirve para: enviar una reseña a moderación (reviewsQueue), denunciar
// (reports) y registrar visita (visits). El servidor hace el read-modify-write
// para que envíos concurrentes no se pisen.
import { json, APPEND_DOMAINS, MAX_BODY, readDomain, writeDomain, mergeAppend } from '../_lib.js';

export async function onRequestPost({ request, env, params }) {
  const domain = params.domain;
  if (!APPEND_DOMAINS.includes(domain)) return json({ error: 'dominio_invalido' }, 400);
  if (!env.DB) return json({ error: 'sin_backend' }, 503);

  const raw = await request.text();
  if (raw.length > MAX_BODY) return json({ error: 'payload_demasiado_grande' }, 413);
  let item;
  try { item = JSON.parse(raw); } catch { return json({ error: 'json_invalido' }, 400); }
  if (item == null || typeof item !== 'object') return json({ error: 'json_invalido' }, 400);

  const defaults = { visits: {} };
  const current = await readDomain(env.DB, domain, defaults[domain]);
  const next = mergeAppend(domain, current, item);
  await writeDomain(env.DB, domain, next);
  return json({ ok: true, domain });
}

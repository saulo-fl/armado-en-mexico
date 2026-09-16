// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// PUT /api/admin/state/:domain — reemplazo COMPLETO de un dominio (solo admin).
// Lo usa el panel para persistir cualquier edición (páginas, promos, catálogo,
// favoritos, branding, inventarios, historial de precios, y la moderación de
// reseñas y denuncias).
//
// SEGURIDAD: esta ruta vive bajo /api/admin/* y debe estar cubierta por una
// política de Cloudflare Access (igual que /admin.html). Además, la Function
// verifica el JWT de Access (requireAdmin) como defensa en profundidad.
import { json, ALL_DOMAINS, MAX_BODY, writeDomain, requireAdmin } from '../../_lib.js';

export async function onRequestPut({ request, env, params }) {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;

  const domain = params.domain;
  if (!ALL_DOMAINS.includes(domain)) return json({ error: 'dominio_invalido' }, 400);
  if (!env.DB) return json({ error: 'sin_backend' }, 503);

  const raw = await request.text();
  if (raw.length > MAX_BODY) return json({ error: 'payload_demasiado_grande' }, 413);
  try { JSON.parse(raw); } catch { return json({ error: 'json_invalido' }, 400); }

  await writeDomain(env.DB, domain, raw);
  return json({ ok: true, domain });
}

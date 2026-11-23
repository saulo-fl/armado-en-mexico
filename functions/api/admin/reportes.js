// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// /api/admin/reportes — la pestaña REPORTES WEB del admin (solo admin).
//   GET  ?estado=abiertos|todos|<estado>  → { reportes: [...], conteo: { estado: n } }
//   POST { accion: 'reintentar', id }     → publica un pendiente (sin tope diario; no duplica)
//   POST { accion: 'retirar', id, motivo? } → vacía, cierra y bloquea el issue; D1 guarda el original
//   POST { accion: 'sincronizar' }        → trae de GitHub qué issues se cerraron o reabrieron
// Los reportes llegan por POST /api/append/issues (functions/api/_issues.js).
//
// SEGURIDAD: bajo /api/admin/* (Cloudflare Access) y con requireAdmin como defensa en
// profundidad, igual que /api/admin/moderar. Aquí sí viajan el correo y la metadata: es el
// único sitio donde se ven.
import { json, requireAdmin } from '../_lib.js';
import { publicarIssue, retirarIssue, estadosIssuesWeb } from '../_issues.js';

const ESTADOS = ['publicando', 'pendiente', 'publicado', 'retirado', 'cerrado'];
const ABIERTOS = ['publicando', 'pendiente', 'publicado'];
const ID = /^AMX-[A-Z0-9]{6}$/;
const LIMITE = 300;
// Una fila en 'publicando' más vieja que esto es un intento que se cortó: se puede reintentar.
const PUBLICANDO_CADUCA_MS = 60_000;

function filaPublica(f) {
  const parse = (s) => { try { return s ? JSON.parse(s) : null; } catch { return null; } };
  return { ...f, campos: parse(f.campos) || {}, metadata: parse(f.metadata) };
}

const leerFila = (db, id) => db.prepare('SELECT * FROM reportes_web WHERE id = ?').bind(id).first();

export async function onRequestGet({ request, env }) {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;
  if (!env.DB) return json({ error: 'sin_backend' }, 503);
  const filtro = new URL(request.url).searchParams.get('estado') || 'abiertos';
  let estados;
  if (filtro === 'abiertos') estados = ABIERTOS;
  else if (filtro === 'todos') estados = ESTADOS;
  else if (ESTADOS.includes(filtro)) estados = [filtro];
  else return json({ error: 'estado_invalido' }, 400);

  try {
    const marcas = estados.map(() => '?').join(', ');
    const { results } = await env.DB.prepare(
      `SELECT * FROM reportes_web WHERE estado IN (${marcas}) ORDER BY creado DESC LIMIT ${LIMITE}`
    ).bind(...estados).all();
    const conteo = {};
    const { results: grupos } = await env.DB.prepare('SELECT estado, COUNT(*) AS n FROM reportes_web GROUP BY estado').all();
    for (const g of grupos) conteo[g.estado] = g.n;
    return json({ reportes: results.map(filaPublica), conteo });
  } catch {
    return json({ error: 'reportes_no_disponible' }, 503);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const fetchFn = context.fetchFn || fetch; // las pruebas inyectan GitHub
  const ahora = context.ahora || Date.now();
  const denied = await requireAdmin(request, env);
  if (denied) return denied;
  if (!env.DB) return json({ error: 'sin_backend' }, 503);

  const raw = await request.text();
  if (raw.length > 4096) return json({ error: 'payload_demasiado_grande' }, 413);
  let body;
  try { body = JSON.parse(raw); } catch { return json({ error: 'json_invalido' }, 400); }
  if (body == null || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'json_invalido' }, 400);

  const { accion } = body;
  if (!['reintentar', 'retirar', 'sincronizar'].includes(accion)) return json({ error: 'accion_invalida' }, 400);
  const db = env.DB;
  const token = env.GITHUB_TOKEN_ISSUES;

  if (accion === 'sincronizar') {
    if (!token) return json({ error: 'github_no_configurado' }, 503);
    const { results } = await db.prepare(
      "SELECT id, repo, issue_num, estado, creado FROM reportes_web WHERE estado IN ('publicado', 'cerrado') AND issue_num IS NOT NULL"
    ).all();
    const porRepo = new Map();
    for (const f of results) {
      if (!porRepo.has(f.repo)) porRepo.set(f.repo, []);
      porRepo.get(f.repo).push(f);
    }
    const cambios = { cerrados: 0, reabiertos: 0 };
    const marca = new Date(ahora).toISOString();
    for (const [repo, filas] of porRepo) {
      const desde = filas.reduce((m, f) => (f.creado < m ? f.creado : m), filas[0].creado);
      let estados;
      try {
        estados = await estadosIssuesWeb({ repo, desde, token, fetchFn });
      } catch (e) {
        return json({ error: /^github_\d+$/.test(e && e.message) ? e.message : 'github_red' }, 502);
      }
      for (const f of filas) {
        const enGitHub = estados.get(f.issue_num);
        const nuevo = enGitHub === 'closed' && f.estado === 'publicado' ? 'cerrado'
          : enGitHub === 'open' && f.estado === 'cerrado' ? 'publicado' : null;
        if (!nuevo) continue;
        await db.prepare('UPDATE reportes_web SET estado = ?, actualizado = ? WHERE id = ? AND estado = ?')
          .bind(nuevo, marca, f.id, f.estado).run();
        if (nuevo === 'cerrado') cambios.cerrados++; else cambios.reabiertos++;
      }
    }
    return json({ ok: true, cambios });
  }

  const { id } = body;
  if (typeof id !== 'string' || !ID.test(id)) return json({ error: 'id_invalido' }, 400);
  const fila = await leerFila(db, id);
  if (!fila) return json({ error: 'no_encontrado' }, 404);

  if (accion === 'reintentar') {
    const corte = new Date(ahora - PUBLICANDO_CADUCA_MS).toISOString();
    const marca = new Date(ahora).toISOString();
    // Se «reclama» la fila con una escritura condicional: dos clics seguidos no publican dos veces.
    const r = await db.prepare(`UPDATE reportes_web SET estado = 'publicando', actualizado = ?
        WHERE id = ? AND (estado = 'pendiente' OR (estado = 'publicando' AND actualizado < ?))`)
      .bind(marca, id, corte).run();
    if (!r.meta || r.meta.changes !== 1) return json({ error: 'no_reintentable' }, 409);
    if (!token) {
      await db.prepare("UPDATE reportes_web SET estado = 'pendiente', error = 'github_no_configurado' WHERE id = ?").bind(id).run();
      return json({ ok: false, error: 'github_no_configurado', reporte: filaPublica(await leerFila(db, id)) });
    }
    const pub = await publicarIssue({
      db, fila: { ...fila, campos: JSON.parse(fila.campos) }, token, fetchFn, buscarAntes: true,
    });
    const reporte = filaPublica(await leerFila(db, id));
    return pub.ok ? json({ ok: true, reporte }) : json({ ok: false, error: pub.error, reporte });
  }

  // retirar
  if (fila.estado === 'retirado') return json({ error: 'ya_retirado' }, 409);
  if (fila.estado === 'publicando') return json({ error: 'en_curso' }, 409);
  const motivo = typeof body.motivo === 'string' ? body.motivo.replace(/\s+/g, ' ').trim().slice(0, 300) : '';
  let bloqueado = null;
  if (fila.issue_num) {
    if (!token) return json({ error: 'github_no_configurado' }, 503);
    const r = await retirarIssue({ repo: fila.repo, numero: fila.issue_num, token, fetchFn });
    if (!r.ok) return json({ error: r.error }, 502);
    bloqueado = r.bloqueado;
  }
  await db.prepare("UPDATE reportes_web SET estado = 'retirado', error = ?, actualizado = ? WHERE id = ?")
    .bind(motivo ? 'retirado: ' + motivo : 'retirado', new Date(ahora).toISOString(), id).run();
  return json({ ok: true, bloqueado, reporte: filaPublica(await leerFila(db, id)) });
}

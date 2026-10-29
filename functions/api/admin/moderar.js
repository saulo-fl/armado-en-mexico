// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// POST /api/admin/moderar — mueve UNA reseña o denuncia (solo admin).
// Cuerpo: { accion: 'aprobar' | 'rechazar' | 'retirar' | 'resolver', id, motivo? }.
// El panel ya no sube listas enteras: el servidor lee lo vigente de D1 y cambia
// solo ese elemento, con la escritura condicional del formulario público
// (actualizarDominio). Así una reseña que llegó después de abrir el panel no se pierde.
//
// ORDEN: primero se AÑADE al destino y después se QUITA del origen. Un corte a
// medias deja el elemento duplicado, nunca perdido, y repetir la acción lo termina
// (añadir no duplica por id; quitar de algo ya quitado no escribe).
//
// SEGURIDAD: igual que /api/admin/state: bajo /api/admin/* (Access) y con
// requireAdmin como defensa en profundidad.
import { json, MAX_BODY, requireAdmin, readDomainVersion, actualizarDominio } from '../_lib.js';

const ACCIONES = ['aprobar', 'rechazar', 'retirar', 'resolver'];

const tiene = (lista, id) => Array.isArray(lista) && lista.some((x) => x && x.id === id);

// Antepone `item` si su id aún no está (undefined = nada que escribir).
const anadir = (item) => (actual) => {
  const lista = Array.isArray(actual) ? actual : [];
  if (tiene(lista, item.id)) return undefined;
  return [item, ...lista];
};

// Quita el id si está (undefined = ya no estaba).
const quitar = (id) => (actual) => {
  if (!tiene(actual, id)) return undefined;
  return actual.filter((x) => !(x && x.id === id));
};

const ocupado = () => json({ error: 'ocupado_reintenta' }, 503, { 'Retry-After': '1' });

export async function onRequestPost({ request, env }) {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;
  if (!env.DB) return json({ error: 'sin_backend' }, 503);

  const raw = await request.text();
  if (raw.length > MAX_BODY) return json({ error: 'payload_demasiado_grande' }, 413);
  let body;
  try { body = JSON.parse(raw); } catch { return json({ error: 'json_invalido' }, 400); }
  if (body == null || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'json_invalido' }, 400);

  const { accion, id } = body;
  if (!ACCIONES.includes(accion)) return json({ error: 'accion_invalida' }, 400);
  if (typeof id !== 'string' || id.length < 1 || id.length > 80) return json({ error: 'id_invalido' }, 400);
  const motivo = typeof body.motivo === 'string' ? body.motivo.slice(0, 500) : '';

  const db = env.DB;
  const ok = () => json({ ok: true, accion, id });
  const noEncontrada = () => json({ error: 'no_encontrada' }, 404);

  if (accion === 'retirar' || accion === 'resolver') {
    const dominio = accion === 'retirar' ? 'reviews' : 'reports';
    const res = await actualizarDominio(db, dominio, quitar(id), []);
    if (res === 'ocupado') return ocupado();
    return res === 'ok' ? ok() : noEncontrada();
  }

  // aprobar / rechazar: de la cola al destino.
  const destino = accion === 'aprobar' ? 'reviews' : 'rejected';
  const { data: cola } = await readDomainVersion(db, 'reviewsQueue');
  const resena = Array.isArray(cola) ? cola.find((x) => x && x.id === id) : undefined;
  if (!resena) {
    // Ya salió de la cola: si está en el destino, un reintento o un doble clic previo la terminó.
    const { data } = await readDomainVersion(db, destino);
    return tiene(data, id) ? ok() : noEncontrada();
  }

  let item;
  if (accion === 'aprobar') {
    const { email, status, ...publica } = resena; // el correo nunca se publica
    item = { ...publica, approvedAt: new Date().toISOString() };
  } else {
    item = { ...resena, status: 'rejected', rejectionReason: motivo, rejectedAt: new Date().toISOString() };
  }

  if (await actualizarDominio(db, destino, anadir(item), []) === 'ocupado') return ocupado();
  if (await actualizarDominio(db, 'reviewsQueue', quitar(id), []) === 'ocupado') return ocupado();
  return ok();
}

// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// Pruebas de /api/admin/reportes (functions/api/admin/reportes.js): la pestaña REPORTES WEB
// del admin lista los reportes sin cuenta y actúa sobre ellos (reintentar, retirar del
// público, sincronizar con GitHub). Sobre SQLite real, con GitHub simulado: nunca sale a la red.
// Vive en scripts/ para no viajar dentro de functions/, que es lo que despliega Pages.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { d1Sqlite } from './d1-sqlite.mjs';
import { onRequestGet, onRequestPost } from '../functions/api/admin/reportes.js';
import { REPO_PUBLICO, REPO_PRUEBAS, TEXTO_RETIRADO, marcador } from '../functions/api/_issues.js';

const AHORA = Date.parse('2026-11-23T20:00:00Z');
const hace = (min) => new Date(AHORA - min * 60_000).toISOString();

const CAMPOS = {
  pagina: 'https://armado.mx/pistolas/glock-19', tipo: 'Arma', nombre: 'Glock 19',
  dato_actual: 'a', correccion: 'b', fuentes: 'c', relacion: 'Ninguna', pull_request: 'No', derechos: [true],
};

function sembrar(DB, fila) {
  const f = {
    formato: 'correccion', titulo: '[Corrección]: Glock 19', campos: JSON.stringify(CAMPOS), firma: 'Ana',
    github: null, email: null, metadata: null, repo: REPO_PUBLICO, issue_num: null, issue_url: null,
    error: null, creado: hace(60), publicado: null, actualizado: hace(60), ...fila,
  };
  DB.sqlite.prepare(`INSERT INTO reportes_web (id, formato, titulo, campos, firma, github, email, metadata, estado,
      repo, issue_num, issue_url, error, creado, publicado, actualizado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(f.id, f.formato, f.titulo, f.campos, f.firma, f.github, f.email, f.metadata, f.estado,
      f.repo, f.issue_num, f.issue_url, f.error, f.creado, f.publicado, f.actualizado);
}
const fila = (DB, id) => ({ ...DB.sqlite.prepare('SELECT * FROM reportes_web WHERE id = ?').get(id) });

// GitHub falso: guarda cada llamada; `issues` es lo que responde el listado.
function githubFalso({ issues = [], crear = 201, editar = 200 } = {}) {
  const llamadas = [];
  let n = 700;
  const fetchFn = async (url, init = {}) => {
    const u = String(url);
    const metodo = init.method || 'GET';
    llamadas.push({ url: u, metodo, body: init.body ? JSON.parse(init.body) : null });
    if (!u.startsWith('https://api.github.com/')) throw new Error('red no esperada: ' + u);
    if (metodo === 'GET') {
      const repo = u.match(/repos\/([^/]+\/[^/]+)\//)[1];
      const pagina = Number(new URL(u).searchParams.get('page') || '1');
      return Response.json(pagina === 1 ? issues.filter((i) => !i.repo || i.repo === repo) : []);
    }
    if (metodo === 'POST') {
      if (crear !== 201) return Response.json({}, { status: crear });
      n++;
      return Response.json({ number: n, html_url: `https://github.com/x/y/issues/${n}` }, { status: 201 });
    }
    if (metodo === 'PATCH') return Response.json({}, { status: editar });
    if (metodo === 'PUT') return new Response(null, { status: 204 });
    throw new Error('método no esperado ' + metodo);
  };
  return { fetchFn, llamadas };
}

const ENV = (DB, extra = {}) => ({ DB, ALLOW_INSECURE_ADMIN: '1', GITHUB_TOKEN_ISSUES: 'github_pat_x', ...extra });
const get = (DB, qs = '', extra) => onRequestGet({
  request: new Request('http://localhost/api/admin/reportes' + qs), env: ENV(DB, extra),
});
const post = (DB, body, gh, extra) => onRequestPost({
  request: new Request('http://localhost/api/admin/reportes', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }),
  env: ENV(DB, extra), fetchFn: gh.fetchFn, ahora: AHORA,
});

test('sin sesión de Access: 401 y no toca D1', async () => {
  let llamadas = 0;
  const DB = { prepare() { llamadas++; throw new Error('no'); } };
  const env = { DB, CF_ACCESS_TEAM_DOMAIN: 'x.cloudflareaccess.com', CF_ACCESS_AUD: 'aud' };
  const r1 = await onRequestGet({ request: new Request('https://armado.mx/api/admin/reportes'), env });
  const r2 = await onRequestPost({ request: new Request('https://armado.mx/api/admin/reportes', { method: 'POST', body: '{}' }), env });
  assert.equal(r1.status, 401);
  assert.equal(r2.status, 401);
  assert.equal(llamadas, 0);
});

test('GET lista los abiertos por defecto, con metadata, correo y conteo por estado', async () => {
  const DB = d1Sqlite();
  sembrar(DB, { id: 'AMX-AAAAA1', estado: 'pendiente', error: 'github_500', email: 'a@b.mx', metadata: '{"navegador":"Chrome 142"}', creado: hace(30) });
  sembrar(DB, { id: 'AMX-AAAAA2', estado: 'publicado', issue_num: 9, issue_url: 'u9', creado: hace(20) });
  sembrar(DB, { id: 'AMX-AAAAA3', estado: 'cerrado', issue_num: 8, creado: hace(10) });
  sembrar(DB, { id: 'AMX-AAAAA4', estado: 'retirado', creado: hace(5) });
  const r = await (await get(DB)).json();
  assert.deepEqual(r.reportes.map((x) => x.id), ['AMX-AAAAA2', 'AMX-AAAAA1'], 'más nuevos primero, sin cerrados ni retirados');
  assert.deepEqual(r.conteo, { pendiente: 1, publicado: 1, cerrado: 1, retirado: 1 });
  const pend = r.reportes.find((x) => x.id === 'AMX-AAAAA1');
  assert.deepEqual(pend.campos, CAMPOS);
  assert.deepEqual(pend.metadata, { navegador: 'Chrome 142' });
  assert.equal(pend.email, 'a@b.mx');
  assert.equal(pend.error, 'github_500');
  const todos = await (await get(DB, '?estado=todos')).json();
  assert.equal(todos.reportes.length, 4);
  assert.equal((await get(DB, '?estado=raro')).status, 400);
});

test('valida acción e id', async () => {
  const DB = d1Sqlite();
  const gh = githubFalso();
  assert.equal((await (await post(DB, '{', gh)).json()).error, 'json_invalido');
  assert.equal((await (await post(DB, { accion: 'borrar', id: 'AMX-X' }, gh)).json()).error, 'accion_invalida');
  assert.equal((await (await post(DB, { accion: 'reintentar', id: 'nada' }, gh)).json()).error, 'id_invalido');
  assert.equal((await post(DB, { accion: 'reintentar', id: 'AMX-ZZZZZZ' }, gh)).status, 404);
  assert.equal(gh.llamadas.length, 0);
});

test('reintentar publica un pendiente aunque se haya pasado el tope diario', async () => {
  const DB = d1Sqlite();
  sembrar(DB, { id: 'AMX-PEND01', estado: 'pendiente', error: 'tope_diario', github: 'otreblA07' });
  const gh = githubFalso();
  const r = await (await post(DB, { accion: 'reintentar', id: 'AMX-PEND01' }, gh)).json();
  assert.equal(r.ok, true);
  assert.equal(r.reporte.estado, 'publicado');
  assert.equal(r.reporte.issue_num, 701);
  const crear = gh.llamadas.find((l) => l.metodo === 'POST');
  assert.equal(crear.url, `https://api.github.com/repos/${REPO_PUBLICO}/issues`);
  assert.match(crear.body.body, /\(@otreblA07\)/);
  assert.equal(fila(DB, 'AMX-PEND01').error, null);
});

test('reintentar no duplica: si el issue ya existía (intento cortado), lo enlaza sin crear otro', async () => {
  const DB = d1Sqlite();
  sembrar(DB, { id: 'AMX-CORTE1', estado: 'publicando', actualizado: hace(10) });
  const gh = githubFalso({ issues: [{ number: 55, html_url: 'u55', body: 'x\n' + marcador('AMX-CORTE1') }] });
  const r = await (await post(DB, { accion: 'reintentar', id: 'AMX-CORTE1' }, gh)).json();
  assert.equal(r.reporte.issue_num, 55);
  assert.equal(gh.llamadas.filter((l) => l.metodo === 'POST').length, 0);
});

test('reintentar rechaza lo ya publicado y lo que se está publicando ahora mismo', async () => {
  const DB = d1Sqlite();
  sembrar(DB, { id: 'AMX-YAPUB1', estado: 'publicado', issue_num: 3 });
  sembrar(DB, { id: 'AMX-ENCURS', estado: 'publicando', actualizado: hace(0.2) });
  const gh = githubFalso();
  for (const id of ['AMX-YAPUB1', 'AMX-ENCURS']) {
    const res = await post(DB, { accion: 'reintentar', id }, gh);
    assert.equal(res.status, 409, id);
    assert.equal((await res.json()).error, 'no_reintentable');
  }
  assert.equal(gh.llamadas.length, 0);
});

test('si GitHub vuelve a fallar, sigue pendiente con el motivo nuevo', async () => {
  const DB = d1Sqlite();
  sembrar(DB, { id: 'AMX-FALLA1', estado: 'pendiente', error: 'github_500' });
  const r = await (await post(DB, { accion: 'reintentar', id: 'AMX-FALLA1' }, githubFalso({ crear: 401 }))).json();
  assert.equal(r.ok, false);
  assert.equal(r.error, 'github_401');
  assert.equal(fila(DB, 'AMX-FALLA1').estado, 'pendiente');
  assert.equal(fila(DB, 'AMX-FALLA1').error, 'github_401');
});

test('retirar un publicado: vacía, cierra como not planned y bloquea el issue; el original se queda en D1', async () => {
  const DB = d1Sqlite();
  sembrar(DB, { id: 'AMX-RETIR1', estado: 'publicado', issue_num: 12, issue_url: 'u12', repo: REPO_PRUEBAS });
  const gh = githubFalso();
  const r = await (await post(DB, { accion: 'retirar', id: 'AMX-RETIR1', motivo: 'datos personales' }, gh)).json();
  assert.equal(r.ok, true);
  assert.equal(r.reporte.estado, 'retirado');
  const [editar, bloquear] = gh.llamadas;
  assert.equal(editar.metodo, 'PATCH');
  assert.equal(editar.url, `https://api.github.com/repos/${REPO_PRUEBAS}/issues/12`);
  assert.deepEqual(editar.body, { title: '[Retirado por moderación]', body: TEXTO_RETIRADO, state: 'closed', state_reason: 'not_planned' });
  assert.doesNotMatch(TEXTO_RETIRADO, /datos personales/, 'el motivo es interno');
  assert.equal(bloquear.metodo, 'PUT');
  assert.equal(bloquear.url, `https://api.github.com/repos/${REPO_PRUEBAS}/issues/12/lock`);
  const f = fila(DB, 'AMX-RETIR1');
  assert.equal(f.estado, 'retirado');
  assert.equal(f.error, 'retirado: datos personales');
  assert.deepEqual(JSON.parse(f.campos), CAMPOS);
});

test('retirar un pendiente no llama a GitHub; si GitHub falla al retirar, no cambia el estado', async () => {
  const DB = d1Sqlite();
  sembrar(DB, { id: 'AMX-RETIR2', estado: 'pendiente' });
  const gh = githubFalso();
  assert.equal((await (await post(DB, { accion: 'retirar', id: 'AMX-RETIR2' }, gh)).json()).reporte.estado, 'retirado');
  assert.equal(gh.llamadas.length, 0);

  sembrar(DB, { id: 'AMX-RETIR3', estado: 'publicado', issue_num: 13 });
  const res = await post(DB, { accion: 'retirar', id: 'AMX-RETIR3' }, githubFalso({ editar: 403 }));
  assert.equal(res.status, 502);
  assert.equal((await res.json()).error, 'github_403');
  assert.equal(fila(DB, 'AMX-RETIR3').estado, 'publicado');
});

test('sincronizar marca cerrados y reabiertos según GitHub, por repo, sin tocar retirados', async () => {
  const DB = d1Sqlite();
  sembrar(DB, { id: 'AMX-SINC01', estado: 'publicado', issue_num: 20 });
  sembrar(DB, { id: 'AMX-SINC02', estado: 'cerrado', issue_num: 21 });
  sembrar(DB, { id: 'AMX-SINC03', estado: 'publicado', issue_num: 22 });
  sembrar(DB, { id: 'AMX-SINC04', estado: 'retirado', issue_num: 23 });
  sembrar(DB, { id: 'AMX-SINC05', estado: 'publicado', issue_num: 20, repo: REPO_PRUEBAS });
  const gh = githubFalso({ issues: [
    { repo: REPO_PUBLICO, number: 20, state: 'closed' },
    { repo: REPO_PUBLICO, number: 21, state: 'open' },
    { repo: REPO_PUBLICO, number: 22, state: 'open' },
    { repo: REPO_PUBLICO, number: 23, state: 'open' },
    { repo: REPO_PRUEBAS, number: 20, state: 'open' },
  ] });
  const r = await (await post(DB, { accion: 'sincronizar' }, gh)).json();
  assert.equal(r.ok, true);
  assert.deepEqual(r.cambios, { cerrados: 1, reabiertos: 1 });
  assert.equal(fila(DB, 'AMX-SINC01').estado, 'cerrado');
  assert.equal(fila(DB, 'AMX-SINC02').estado, 'publicado');
  assert.equal(fila(DB, 'AMX-SINC03').estado, 'publicado');
  assert.equal(fila(DB, 'AMX-SINC04').estado, 'retirado');
  assert.equal(fila(DB, 'AMX-SINC05').estado, 'publicado', 'el #20 del repo de pruebas es otro issue');
  const listados = gh.llamadas.filter((l) => l.metodo === 'GET');
  assert.ok(listados.every((l) => /labels=reporte-web/.test(l.url) && /state=all/.test(l.url)));
  assert.equal(new Set(listados.map((l) => l.url.match(/repos\/([^/]+\/[^/]+)/)[1])).size, 2);
});

test('sin token de GitHub, las acciones que lo necesitan lo dicen', async () => {
  const DB = d1Sqlite();
  sembrar(DB, { id: 'AMX-SINTOK', estado: 'publicado', issue_num: 1 });
  const gh = githubFalso();
  const res = await post(DB, { accion: 'sincronizar' }, gh, { GITHUB_TOKEN_ISSUES: '' });
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error, 'github_no_configurado');
});

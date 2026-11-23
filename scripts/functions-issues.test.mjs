// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// Pruebas del reporte interno (functions/api/_issues.js y POST /api/append/issues), sobre
// SQLite real (d1-sqlite.mjs) y con Turnstile y GitHub simulados: nunca salen a la red.
// Vive en scripts/ para no viajar dentro de functions/, que es lo que despliega Pages.
//
// Lo que protegen: que un reporte hecho en armado.mx salga con el MISMO cuerpo que uno
// hecho con el Issue Form de GitHub; que nada llegue a D1 sin captcha; que el correo y la
// metadata del dispositivo nunca viajen a GitHub; y que GitHub caído no pierda el reporte.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { d1Sqlite } from './d1-sqlite.mjs';
import {
  normalizarReporteWeb, renderCuerpoIssue, verificarTurnstile, repoDestino, buscarExistente,
  limpiarTextoUsuario, marcador, REPO_PUBLICO, REPO_PRUEBAS, ETIQUETA_WEB, TOPE_COLA, TOPE_DIARIO,
  FIRMA_MAX, CLAVE_PRUEBA_TURNSTILE,
} from '../functions/api/_issues.js';
import { onRequestPost } from '../functions/api/append/[domain].js';

// Cuerpo LITERAL del #485, hecho con el formulario de GitHub (gh api …/issues/485 --jq .body).
const CUERPO_485 = '### Página exacta\n\nhttps://armado.mx/escopetas/derya-mr-s1\n\n### Tipo de contenido\n\nArma\n\n### Ficha o sección\n\nDerya MR-S1\n\n### Dato actual\n\nEn capacidad dice que es 4+1 y es una escopeta superpuesta. Su capacidad es de 2 cartuchos\n\n### Corrección propuesta\n\nCapacidad 2 o 1+1\n\n### Fuentes\n\nhttps://deryaarms.com/urun/meriva-sport-mr-s1\n\n### Relación comercial o institucional\n\nNinguna\n\n### ¿Te interesaría aportar la solución mediante un pull request?\n\nTal vez, necesito orientación\n\n### Derechos y licencia\n\n- [x] Confirmo que puedo aportar este contenido bajo la licencia correspondiente y que no incluyo material de terceros sin permiso compatible.';

const CAMPOS_485 = {
  pagina: 'https://armado.mx/escopetas/derya-mr-s1',
  tipo: 'Arma',
  nombre: 'Derya MR-S1',
  dato_actual: 'En capacidad dice que es 4+1 y es una escopeta superpuesta. Su capacidad es de 2 cartuchos',
  correccion: 'Capacidad 2 o 1+1',
  fuentes: 'https://deryaarms.com/urun/meriva-sport-mr-s1',
  relacion: 'Ninguna',
  pull_request: 'Tal vez, necesito orientación',
  derechos: [true],
};

const CAMPOS_FALLO = {
  pagina: 'https://armado.mx/pistolas/glock-19',
  que_paso: 'Al tocar «Comparar» la página se queda en blanco.',
  que_esperabas: 'Que abriera el comparador.',
  pasos: '1. Entré a la ficha\n2. Toqué Comparar',
  frecuencia: 'Siempre',
  privacidad: [true],
};

const reporte = (extra = {}) => ({
  formato: 'correccion', campos: { ...CAMPOS_485 }, firma: 'otreblA07',
  turnstile: 'token-valido', ...extra,
});

// ── Simuladores ──────────────────────────────────────────────────────────────
// Turnstile + GitHub en una sola fetch falsa. Registra cada llamada.
function redFalsa({ captcha = { success: true, action: 'reporte', hostname: 'armado.mx' }, github = 201, issues = [] } = {}) {
  const llamadas = [];
  let numero = 600;
  const fetchFn = async (url, init = {}) => {
    const u = String(url);
    llamadas.push({ url: u, init });
    if (u.startsWith('https://challenges.cloudflare.com/')) {
      if (captcha === 'caida') throw new TypeError('fetch failed');
      return Response.json({ 'error-codes': [], ...captcha });
    }
    if (u.startsWith('https://api.github.com/')) {
      if (github === 'caida') throw new TypeError('fetch failed');
      if ((init.method || 'GET') === 'GET') return Response.json(issues);
      if (github !== 201) return Response.json({ message: 'nope' }, { status: github });
      numero++;
      const repo = u.match(/repos\/([^/]+\/[^/]+)\/issues/)[1];
      return Response.json({ number: numero, html_url: `https://github.com/${repo}/issues/${numero}` }, { status: 201 });
    }
    throw new Error('red no esperada: ' + u);
  };
  return { fetchFn, llamadas, aGitHub: () => llamadas.filter((l) => l.url.startsWith('https://api.github.com/') && l.init.method === 'POST') };
}

const ENV = (DB, extra = {}) => ({ DB, TURNSTILE_SECRET: 'secreto-real', GITHUB_TOKEN_ISSUES: 'github_pat_prueba', ...extra });

const peticion = (cuerpo, host = 'armado.mx') => new Request(`https://${host}/api/append/issues`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.7' },
  body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
});

const enviar = (cuerpo, { DB, red, env = {}, host } = {}) => onRequestPost({
  request: peticion(cuerpo, host), env: ENV(DB, env), params: { domain: 'issues' }, fetchFn: red.fetchFn,
});

const filas = (DB) => DB.sqlite.prepare('SELECT * FROM reportes_web ORDER BY creado').all().map((r) => ({ ...r }));

// ── Formato: idéntico al Issue Form ──────────────────────────────────────────
test('el cuerpo de una corrección es idéntico al del #485, hecho con el formulario de GitHub', () => {
  const n = normalizarReporteWeb(reporte());
  assert.ok(n.ok, JSON.stringify(n));
  const cuerpo = renderCuerpoIssue('correccion', n.value.campos, { firma: 'otreblA07', folio: 'AMX-ABC234' });
  assert.ok(cuerpo.startsWith(CUERPO_485 + '\n\n'), 'los campos deben salir tal cual los arma GitHub');
  assert.equal(n.value.titulo, '[Corrección]: Derya MR-S1');
});

test('el pie acredita a quien reportó, con folio y marcador, y escapa su firma', () => {
  const cuerpo = renderCuerpoIssue('correccion', CAMPOS_485, { firma: 'Juan *el* [tirador]', folio: 'AMX-ABC234', github: 'otreblA07' });
  const pie = cuerpo.slice(CUERPO_485.length);
  assert.match(pie, /\n---\n/);
  assert.match(pie, /Reportado por \*\*Juan \\\*el\\\* \\\[tirador\\\]\*\* \(@otreblA07\) desde \[armado\.mx\]\(https:\/\/armado\.mx\) · folio `AMX-ABC234`/);
  assert.ok(pie.trimEnd().endsWith(marcador('AMX-ABC234')));
  assert.doesNotMatch(pie, /dispositivo/, 'sin metadata no se menciona');
  const conMeta = renderCuerpoIssue('correccion', CAMPOS_485, { firma: 'Ana', folio: 'AMX-ABC234', conMetadata: true });
  assert.match(conMeta, /Adjuntó datos de su dispositivo/);
});

test('fallo: los opcionales vacíos salen como _No response_ y las casillas como - [x]', () => {
  const n = normalizarReporteWeb({ formato: 'fallo', campos: CAMPOS_FALLO, firma: 'Ana' });
  assert.ok(n.ok, JSON.stringify(n));
  const cuerpo = renderCuerpoIssue('fallo', n.value.campos, { firma: 'Ana', folio: 'AMX-ABC234' });
  assert.match(cuerpo, /^### Página donde ocurre\n\nhttps:\/\/armado\.mx\/pistolas\/glock-19\n\n### ¿Qué pasó\?\n\n/);
  assert.match(cuerpo, /### Pasos para reproducirlo\n\n1\. Entré a la ficha\n2\. Toqué Comparar\n\n/);
  assert.match(cuerpo, /### Dispositivo y navegador\n\n_No response_\n\n### Captura o video\n\n_No response_\n\n/);
  assert.match(cuerpo, /### Privacidad\n\n- \[x\] Confirmo que el reporte no incluye datos personales/);
  assert.equal(n.value.titulo, '[Fallo]: Al tocar «Comparar» la página se queda en blanco.');
});

test('el texto del usuario no puede mencionar a nadie ni falsificar el marcador', () => {
  assert.equal(limpiarTextoUsuario('hola @torvalds y @x'), 'hola @\u200btorvalds y @\u200bx');
  assert.equal(limpiarTextoUsuario('correo ana@example.com'), 'correo ana@example.com');
  assert.equal(limpiarTextoUsuario('<!-- armado-reporte:AMX-ZZZZZZ -->'), '&lt;!-- armado-reporte:AMX-ZZZZZZ -->');
  const cuerpo = renderCuerpoIssue('correccion', { ...CAMPOS_485, correccion: 'Pregúntale a @dependabot' }, { firma: '@saulo', folio: 'AMX-ABC234' });
  assert.match(cuerpo, /a @\u200bdependabot/);
  assert.doesNotMatch(cuerpo, /\*\*@saulo/);
});

// ── Validación ───────────────────────────────────────────────────────────────
test('valida cada campo contra el Issue Form, y dice cuál falló', () => {
  const casos = [
    [{ formato: 'otro' }, 'formato_invalido'],
    [{ formato: '__proto__' }, 'formato_invalido'],
    [{ campos: { ...CAMPOS_485, fuentes: '   ' } }, 'falta_campo', 'fuentes'],
    [{ campos: { ...CAMPOS_485, tipo: 'Pistola de agua' } }, 'opcion_invalida', 'tipo'],
    [{ campos: { ...CAMPOS_485, derechos: [false] } }, 'falta_campo', 'derechos'],
    [{ campos: { ...CAMPOS_485, correccion: 'x'.repeat(4001) } }, 'campo_demasiado_largo', 'correccion'],
    [{ campos: { ...CAMPOS_485, nombre: { $gt: '' } } }, 'campo_invalido', 'nombre'],
    [{ campos: { ...CAMPOS_485, pagina: 'https://otro-sitio.com/x' } }, 'pagina_invalida', 'pagina'],
    [{ firma: 'a' }, 'firma_invalida'],
    [{ firma: 'x'.repeat(FIRMA_MAX + 1) }, 'firma_invalida'],
    [{ firma: 'visita https://spam.example' }, 'firma_invalida'],
    [{ github: 'no válido!' }, 'github_invalido'],
    [{ email: 'no-es-correo' }, 'email_invalido'],
  ];
  for (const [extra, error, campo] of casos) {
    const n = normalizarReporteWeb(reporte(extra));
    assert.equal(n.ok, false, JSON.stringify(extra));
    assert.equal(n.error, error, JSON.stringify(extra));
    if (campo) assert.equal(n.campo, campo);
  }
  for (const pagina of ['https://armado.mx/x', 'https://develop.armado-en-mexico.pages.dev/x', 'http://localhost:8788/x']) {
    assert.ok(normalizarReporteWeb(reporte({ campos: { ...CAMPOS_485, pagina } })).ok, pagina);
  }
  const conArroba = normalizarReporteWeb(reporte({ github: '@otreblA07' }));
  assert.equal(conArroba.value.github, 'otreblA07');
});

test('la metadata solo se guarda si marcó la casilla, y solo las claves conocidas', () => {
  const metadata = { navegador: 'Chrome 142', ventana: '412x915', dpr: 2.6, errores: ['TypeError: x', 'b', 'c', 'd', 'e', 'f'], cookie: 'robada' };
  assert.equal(normalizarReporteWeb(reporte({ metadata })).value.metadata, null, 'sin casilla, nada');
  assert.equal(normalizarReporteWeb(reporte({ metadata, adjuntarMetadata: 'true' })).value.metadata, null, 'la casilla es un booleano');
  const m = normalizarReporteWeb(reporte({ metadata, adjuntarMetadata: true })).value.metadata;
  assert.deepEqual(m, { navegador: 'Chrome 142', ventana: '412x915', dpr: 2.6, errores: ['TypeError: x', 'b', 'c', 'd', 'e'] });
});

// ── Captcha y destino ────────────────────────────────────────────────────────
test('Turnstile: falla cerrado y comprueba acción y host', async () => {
  const sinSecreto = await verificarTurnstile({ token: 't', secret: '', fetchFn: redFalsa().fetchFn });
  assert.deepEqual(sinSecreto, { ok: false, error: 'captcha_no_configurado', status: 503 });

  const r = redFalsa();
  assert.equal((await verificarTurnstile({ token: '', secret: 's', fetchFn: r.fetchFn })).error, 'captcha_invalido');
  assert.equal(r.llamadas.length, 0, 'sin token no se llama a Cloudflare');

  const casos = [
    [{ success: false }, false],
    [{ success: true, action: 'otra', hostname: 'armado.mx' }, false],
    [{ success: true, action: 'reporte', hostname: 'evil.example' }, false],
    [{ success: true, action: 'reporte', hostname: 'armado.mx' }, true],
    [{ success: true, action: 'reporte', hostname: 'develop.armado-en-mexico.pages.dev' }, true],
  ];
  for (const [captcha, ok] of casos) {
    const v = await verificarTurnstile({ token: 't', secret: 's', ip: '1.2.3.4', fetchFn: redFalsa({ captcha }).fetchFn });
    assert.equal(v.ok, ok, JSON.stringify(captcha));
  }
  // La clave de prueba oficial responde con otro host y sin acción: solo se usa en local.
  const prueba = await verificarTurnstile({ token: 't', secret: CLAVE_PRUEBA_TURNSTILE, fetchFn: redFalsa({ captcha: { success: true, hostname: 'example.com' } }).fetchFn });
  assert.equal(prueba.ok, true);
  const caida = await verificarTurnstile({ token: 't', secret: 's', fetchFn: redFalsa({ captcha: 'caida' }).fetchFn });
  assert.deepEqual(caida, { ok: false, error: 'captcha_no_disponible', status: 503 });
});

test('solo armado.mx publica en el repo real; todo lo demás va al de pruebas', () => {
  assert.equal(repoDestino('https://armado.mx/api/append/issues'), REPO_PUBLICO);
  assert.equal(repoDestino('https://www.armado.mx/api/append/issues'), REPO_PUBLICO);
  for (const u of ['https://develop.armado-en-mexico.pages.dev/x', 'https://armado-en-mexico.pages.dev/x', 'http://localhost:8788/x', 'https://armado.mx.evil.example/x']) {
    assert.equal(repoDestino(u), REPO_PRUEBAS, u);
  }
});

// ── Endpoint POST /api/append/issues ─────────────────────────────────────────
test('JSON inválido, campos inválidos o captcha inválido: 400 sin tocar D1', async () => {
  const DB = d1Sqlite();
  const red = redFalsa();
  assert.equal((await (await enviar('x', { DB, red })).json()).error, 'json_invalido');
  const malo = await enviar(reporte({ firma: '' }), { DB, red });
  assert.equal(malo.status, 400);
  assert.equal((await malo.json()).error, 'firma_invalida');
  assert.equal(red.llamadas.length, 0, 'un reporte inválido no gasta el captcha');

  const sinCaptcha = await enviar(reporte(), { DB, red: redFalsa({ captcha: { success: false } }) });
  assert.equal(sinCaptcha.status, 400);
  assert.equal((await sinCaptcha.json()).error, 'captcha_invalido');
  assert.equal(DB.consultas.length, 0, 'nada llega a D1 sin captcha');
});

test('un reporte válido se guarda y se publica solo en GitHub, sin correo ni metadata', async () => {
  const DB = d1Sqlite();
  const red = redFalsa();
  const res = await enviar(reporte({
    email: 'privado@example.com', github: 'otreblA07',
    adjuntarMetadata: true, metadata: { navegador: 'Firefox 140', ventana: '1280x720' },
  }), { DB, red });
  assert.equal(res.status, 200);
  const r = await res.json();
  assert.equal(r.ok, true);
  assert.equal(r.estado, 'publicado');
  assert.match(r.folio, /^AMX-[2-9A-HJKMNP-Z]{6}$/);
  assert.equal(r.issue.url, `https://github.com/${REPO_PUBLICO}/issues/601`);

  const [captcha] = red.llamadas;
  assert.match(String(captcha.init.body), /remoteip=203\.0\.113\.7/);
  const [gh] = red.aGitHub();
  assert.equal(gh.url, `https://api.github.com/repos/${REPO_PUBLICO}/issues`);
  assert.equal(gh.init.headers.Authorization, 'Bearer github_pat_prueba');
  const enviado = JSON.parse(gh.init.body);
  assert.equal(enviado.title, '[Corrección]: Derya MR-S1');
  assert.deepEqual(enviado.labels, ['documentation', ETIQUETA_WEB]);
  assert.ok(enviado.body.startsWith(CUERPO_485));
  assert.match(enviado.body, new RegExp(`folio \`${r.folio}\``));
  assert.match(enviado.body, /\(@otreblA07\)/);
  assert.match(enviado.body, /Adjuntó datos de su dispositivo/);
  assert.doesNotMatch(enviado.body, /privado@example\.com|Firefox|1280x720/);

  const [fila] = filas(DB);
  assert.equal(fila.id, r.folio);
  assert.equal(fila.estado, 'publicado');
  assert.equal(fila.issue_num, 601);
  assert.equal(fila.repo, REPO_PUBLICO);
  assert.equal(fila.email, 'privado@example.com');
  assert.deepEqual(JSON.parse(fila.metadata), { navegador: 'Firefox 140', ventana: '1280x720' });
  assert.ok(fila.publicado);
});

test('desde el preview publica en el repo de pruebas', async () => {
  const DB = d1Sqlite();
  const red = redFalsa({ captcha: { success: true, action: 'reporte', hostname: 'develop.armado-en-mexico.pages.dev' } });
  const r = await (await enviar(reporte(), { DB, red, host: 'develop.armado-en-mexico.pages.dev' })).json();
  assert.equal(r.estado, 'publicado');
  assert.equal(red.aGitHub()[0].url, `https://api.github.com/repos/${REPO_PRUEBAS}/issues`);
  assert.equal(filas(DB)[0].repo, REPO_PRUEBAS);
});

test('si GitHub falla o falta el token, el reporte queda pendiente y no se pierde', async () => {
  for (const [github, env, error] of [[500, {}, 'github_500'], ['caida', {}, 'github_red'], [201, { GITHUB_TOKEN_ISSUES: '' }, 'github_no_configurado']]) {
    const DB = d1Sqlite();
    const res = await enviar(reporte(), { DB, red: redFalsa({ github }), env });
    assert.equal(res.status, 200);
    const r = await res.json();
    assert.equal(r.ok, true);
    assert.equal(r.estado, 'pendiente');
    assert.equal(r.issue, undefined);
    const [fila] = filas(DB);
    assert.equal(fila.estado, 'pendiente');
    assert.equal(fila.error, error);
    assert.equal(fila.issue_num, null);
  }
});

test('tope diario: a partir del 31.º del día se guardan como pendientes sin llamar a GitHub', async () => {
  const DB = d1Sqlite();
  const ahora = new Date().toISOString();
  const ins = DB.sqlite.prepare(`INSERT INTO reportes_web (id, formato, titulo, campos, firma, estado, repo, creado, actualizado)
    VALUES (?, 'correccion', 't', '{}', 'f', 'publicado', ?, ?, ?)`);
  for (let i = 0; i < TOPE_DIARIO; i++) ins.run(`AMX-X${String(i).padStart(5, '0')}`, REPO_PUBLICO, ahora, ahora);
  const red = redFalsa();
  const r = await (await enviar(reporte(), { DB, red })).json();
  assert.equal(r.estado, 'pendiente');
  assert.equal(red.aGitHub().length, 0);
  assert.equal(filas(DB).find((f) => f.id === r.folio).error, 'tope_diario');
});

test('cola llena: 503 sin guardar nada más', async () => {
  const DB = d1Sqlite();
  const ahora = new Date().toISOString();
  const ins = DB.sqlite.prepare(`INSERT INTO reportes_web (id, formato, titulo, campos, firma, estado, repo, creado, actualizado)
    VALUES (?, 'correccion', 't', '{}', 'f', 'pendiente', ?, '2026-01-01T00:00:00Z', ?)`);
  for (let i = 0; i < TOPE_COLA; i++) ins.run(`AMX-Y${String(i).padStart(5, '0')}`, REPO_PUBLICO, ahora);
  const res = await enviar(reporte(), { DB, red: redFalsa() });
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error, 'cola_llena');
  assert.equal(filas(DB).length, TOPE_COLA);
});

test('sin la tabla en D1: error visible, no un 500 mudo', async () => {
  const DB = d1Sqlite({ esquema: false });
  const res = await enviar(reporte(), { DB, red: redFalsa() });
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error, 'reportes_no_disponible');
});

test('buscarExistente encuentra un issue ya creado por su marcador (reintento tras un corte)', async () => {
  const issues = [
    { number: 9, html_url: 'u9', body: 'otro' },
    { number: 10, html_url: 'u10', body: 'algo\n' + marcador('AMX-ABC234') },
  ];
  const red = redFalsa({ issues });
  const hallado = await buscarExistente({ repo: REPO_PRUEBAS, folio: 'AMX-ABC234', desde: '2026-11-23T00:00:00Z', token: 't', fetchFn: red.fetchFn });
  assert.deepEqual(hallado, { numero: 10, url: 'u10' });
  assert.match(red.llamadas[0].url, /labels=reporte-web/);
  assert.equal(await buscarExistente({ repo: REPO_PRUEBAS, folio: 'AMX-NOESTA', desde: '2026-11-23T00:00:00Z', token: 't', fetchFn: red.fetchFn }), null);
});

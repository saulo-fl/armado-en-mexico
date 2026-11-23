// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// El lado del navegador del reporte web: formulario (reportes.jsx), captcha (turnstile.js),
// datos del dispositivo (metadata-dispositivo.js) y su engranaje con el servidor
// (functions/api/_issues.js). Lo que se rompe sin que nada falle: una clave de metadata que
// el servidor descarta en silencio, una acción de Turnstile distinta a la que verifica, o un
// script que carga después de quien lo usa. El render real lo cubre `npm run smoke`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { CLAVES_METADATA, ACCION_TURNSTILE } from '../functions/api/_issues.js';
import { FORMATOS } from '../functions/api/_formatos.js';

const leer = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

function cargarMetadata() {
  const oyentes = {};
  const window = {
    innerWidth: 412, innerHeight: 915, devicePixelRatio: 2.625,
    screen: { width: 1080, height: 2400 },
    addEventListener: (tipo, fn) => { oyentes[tipo] = fn; },
    matchMedia: (q) => ({ matches: q.includes('dark') }),
  };
  const sandbox = {
    window, Intl,
    navigator: {
      userAgent: 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36',
      language: 'es-MX', maxTouchPoints: 5,
      userAgentData: { brands: [{ brand: 'Not A(Brand', version: '99' }, { brand: 'Google Chrome', version: '142' }], platform: 'Android' },
    },
    location: { href: 'https://armado.mx/pistolas/glock-19', pathname: '/pistolas/glock-19', hostname: 'armado.mx' },
    document: { querySelector: () => ({ getAttribute: () => 'app.js?v=20260922a' }) },
  };
  vm.runInNewContext(leer('../src/lib/metadata-dispositivo.js'), sandbox);
  return { amx: window.amxMetadataDispositivo, oyentes };
}

test('la metadata del navegador usa solo claves que el servidor acepta', () => {
  const { amx, oyentes } = cargarMetadata();
  oyentes.error({ message: 'TypeError: x is undefined\n  at foo' });
  oyentes.unhandledrejection({ reason: new Error('fallo de red') });
  const m = amx();
  for (const k of Object.keys(m)) assert.ok(CLAVES_METADATA.includes(k), `clave «${k}» la descartaría el servidor`);
  assert.equal(m.navegador, 'Google Chrome 142');
  assert.equal(m.sistema, 'Android');
  assert.equal(m.ventana, '412x915');
  assert.equal(m.esquemaColor, 'oscuro');
  assert.equal(m.version, '20260922a');
  assert.deepEqual([...m.errores], ['TypeError: x is undefined', 'fallo de red']);
  assert.equal(JSON.stringify(m).includes('cookie'), false);
});

test('el captcha pide la misma acción que verifica el servidor', () => {
  const ts = leer('../src/lib/turnstile.js');
  assert.match(ts, new RegExp(`action: '${ACCION_TURNSTILE}'`));
  assert.match(ts, /render=explicit/);
  assert.match(ts, /SITEKEY = '0x4AAAAAAGPXQUOTWCmKQqAV'/);
});

test('los campos que prellena la ficha existen en el formulario de corrección', () => {
  const sandbox = { window: {}, URL };
  sandbox.window.window = sandbox.window;
  vm.runInNewContext(leer('../src/lib/soporte.js'), sandbox);
  const c = sandbox.window.amxCamposCorreccion({ tipo: 'municion', titulo: '9 mm Luger', ruta: '/municiones/x', origin: 'https://armado.mx' });
  assert.deepEqual({ ...c }, { pagina: 'https://armado.mx/municiones/x', tipo: 'Munición', nombre: '9 mm Luger' });
  const tipo = FORMATOS.correccion.body.find((x) => x.id === 'tipo');
  assert.ok(tipo.attributes.options.includes(c.tipo));
  assert.equal(sandbox.window.AMX_REPORTE_URL, '/api/append/issues');
});

test('la ficha y Soporte usan el formulario web, y conservan la vía de GitHub', () => {
  const ui = leer('../src/components/ui.jsx');
  const bloque = ui.slice(ui.indexOf('function ReportarError'), ui.indexOf('window.ReportarError = ReportarError'));
  assert.match(bloque, /<window\.FormularioReporte formato="correccion"/);
  assert.match(bloque, /amxCorreccionUrl/);
  const dos = leer('../src/screens/screens-2.jsx');
  assert.match(dos, /<SoporteFallo \/>/);
  assert.match(dos, /<window\.FormularioReporte formato="fallo"/);
  assert.match(dos, /template=fallo\.yml/);
  const rep = leer('../src/components/reportes.jsx');
  assert.match(rep, /^window\.FormularioReporte = FormularioReporte;$/m);
  assert.match(rep, /window\.AMX_FORMATOS_ISSUE/);
});

test('el formulario advierte arriba de los campos que no se incluyan datos personales', () => {
  const rep = leer('../src/components/reportes.jsx');
  const form = rep.slice(rep.indexOf('<form className="amx-reporte"'));
  const aviso = form.indexOf('amx-reporte-advertencia');
  assert.ok(aviso > 0 && aviso < form.indexOf('<CampoReporte'), 'la advertencia va antes del primer campo');
  assert.match(form, /No incluyas datos personales/);
  assert.match(form, /será público en GitHub/);
  for (const [id, f] of Object.entries(FORMATOS)) {
    const md = f.body.filter((c) => c.type === 'markdown').map((c) => c.attributes.value).join(' ');
    assert.match(md, /No incluyas datos personales/, `${id}.yml debe conservar el aviso`);
  }
});

test('index.html carga cada pieza antes de quien la usa', () => {
  const html = leer('../src/pages/index.html');
  const pos = (f) => {
    const i = html.indexOf(`src="${f}?v=`);
    assert.ok(i > 0, `${f} no se carga en index.html`);
    return i;
  };
  assert.ok(pos('metadata-dispositivo.js') < pos('data-precios.js'), 'la metadata va antes que la app para ver sus errores');
  assert.ok(pos('soporte.js') < pos('reportes.js'));
  assert.ok(pos('formatos-issue.js') < pos('reportes.js'));
  assert.ok(pos('turnstile.js') < pos('reportes.js'));
  assert.ok(pos('ui.js') < pos('reportes.js') && pos('reportes.js') < pos('screens-1.js'));
  assert.doesNotMatch(html, /challenges\.cloudflare\.com/, 'el script de Turnstile se pide al abrir el formulario, no en cada página');
});

test('Soporte explica la vía sin cuenta y ya no dice que hay que pulsar Submit en GitHub', () => {
  const sandbox = { window: {} };
  vm.runInNewContext(leer('../src/data/data-soporte.js'), sandbox);
  const C = sandbox.window.AMX_SOPORTE_CONTENT;
  assert.match(C.correccion.intro, /sin crear cuenta/);
  assert.doesNotMatch(JSON.stringify(C), /Submit new issue|no publica nada en tu nombre/);
  assert.equal(C.fallo.titulo, 'Reportar un fallo del sitio');
});

test('admin: la pestaña REPORTES WEB usa la API del servidor y avisa del historial de GitHub al retirar', () => {
  const admin = leer('../src/admin.jsx').replace(/\r\n/g, '\n');
  const tab = admin.slice(admin.indexOf('function ReportesWebTab'), admin.indexOf('window.ReportesWebTab = ReportesWebTab'));
  assert.ok(tab.length > 1000, 'no encontré ReportesWebTab');
  assert.match(admin, /^window\.ReportesWebTab = ReportesWebTab;$/m);
  assert.match(admin, /tab === 'reportesWeb' && <ReportesWebTab/);
  assert.match(tab, /window\.Store\.reportesWeb\(/);
  for (const accion of ['reintentar', 'retirar', 'sincronizar']) assert.match(tab, new RegExp(`actuar\\('${accion}'`));
  assert.match(tab, /historial de ediciones[\s\S]*Delete issue/);
  assert.match(tab, /rep\.metadata/);
  const store = leer('../src/lib/store.js');
  assert.match(store, /'\/admin\/reportes\?estado='/);
  assert.match(store, /REMOTE\.base \+ '\/admin\/reportes', \{/);
  const html = leer('../src/pages/admin.html');
  assert.ok(html.indexOf('formatos-issue.js?v=') > 0 && html.indexOf('formatos-issue.js?v=') < html.indexOf('admin.js?v='),
    'el admin necesita los formatos para nombrar los campos');
});

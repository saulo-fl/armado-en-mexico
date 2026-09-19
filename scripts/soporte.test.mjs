import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const load = (rel, sandbox) => {
  const url = new URL(rel, import.meta.url);
  vm.runInNewContext(readFileSync(url, 'utf8'), sandbox, { filename: url.pathname });
};

const sandbox = { window: {}, URL, console };
sandbox.window.window = sandbox.window;
load('../src/data/data-soporte.js', sandbox);
load('../src/lib/soporte.js', sandbox);

const C = sandbox.window.AMX_SOPORTE_CONTENT;
const U = sandbox.window;

test('el contenido conserva las decisiones editoriales aprobadas', () => {
  assert.equal(C.apertura,
    'Todos pueden contribuir a mejorar esta enciclopedia. Queremos construir un espacio seguro, respetuoso y útil para los amantes de las armas en México, sin importar su nivel de experiencia.');
  assert.equal(C.normas.length, 4);
  assert.match(C.venta.titulo, /Aquí no se compra ni se vende/i);
  assert.match(JSON.stringify(C), /no se retirará solo por ser desfavorable/i);
  assert.match(JSON.stringify(C), /fabricantes, distribuidores, tiendas, clubes y campos de tiro/i);
  assert.equal(C.clasificacion.criterios.length, 3);
  assert.doesNotMatch(JSON.stringify(C), /bloqueo inmediato|reporte a las autoridades|24 horas|48 horas/i);
});

test('la URL de corrección codifica la página y el contexto', () => {
  const url = new URL(U.amxCorreccionUrl({
    tipo: 'arma', titulo: 'Pistola Águila & Cía.', ruta: '/pistolas/aguila?vista=1', origin: 'https://armado.mx',
  }));
  assert.equal(url.origin + url.pathname,
    'https://github.com/saulo-fl/armado-en-mexico/issues/new');
  assert.equal(url.searchParams.get('template'), 'correccion.yml');
  assert.equal(url.searchParams.get('title'), '[Corrección]: Pistola Águila & Cía.');
  assert.equal(url.searchParams.get('pagina'), 'https://armado.mx/pistolas/aguila?vista=1');
  assert.equal(url.searchParams.get('tipo'), 'Arma');
  assert.equal(url.searchParams.get('nombre'), 'Pistola Águila & Cía.');
});

test('el contexto de denuncia contiene solo datos públicos y acota el extracto', () => {
  const out = U.amxContextoDenuncia({
    review: { id: 'r_1', autor: 'Ana', texto: 'x'.repeat(300), email: 'privado@example.com' },
    tipo: 'arma', entidadId: 47, entidadNombre: 'Ruger LCP',
  });
  assert.deepEqual(Object.keys(out),
    ['reviewId', 'tipo', 'entidadId', 'entidadNombre', 'autor', 'reviewExcerpt']);
  assert.equal(out.reviewExcerpt.length, 240);
  assert.equal('email' in out, false);
});

test('el envío solo informa éxito ante un 2xx', async () => {
  const ok = await U.amxEnviarReporte('/api/append/reports', { detalle: 'x'.repeat(20) },
    async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) }));
  const bad = await U.amxEnviarReporte('/api/append/reports', { detalle: 'x'.repeat(20) },
    async () => ({ ok: false, status: 503, json: async () => ({ error: 'sin_backend' }) }));
  const offline = await U.amxEnviarReporte('/api/append/reports', {},
    async () => { throw new Error('network down'); });
  assert.deepEqual(JSON.parse(JSON.stringify(ok)), { ok: true, status: 200, data: { ok: true } });
  assert.equal(bad.ok, false);
  assert.equal(bad.status, 503);
  assert.equal(offline.ok, false);
  assert.equal(offline.status, 0);
});

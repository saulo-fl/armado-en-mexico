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

test('las reseñas publicadas exponen Denunciar y App transporta contexto', () => {
  const screen = readFileSync(new URL('../src/screens/screens-2.jsx', import.meta.url), 'utf8');
  const app = readFileSync(new URL('../src/app.jsx', import.meta.url), 'utf8');
  const admin = readFileSync(new URL('../src/admin.jsx', import.meta.url), 'utf8');
  assert.match(screen, /onReportReview/);
  assert.match(screen, /className="amx-opinion-denunciar"[\s\S]{0,240}>\s*Denunciar\s*</);
  assert.match(app, /reportContext/);
  assert.match(app, /openReviewReport/);
  assert.match(app, /<window\.SoporteScreen[^>]+reportContext=/);
  // Admin muestra el contexto factual de la denuncia
  for (const field of ['entidadNombre', 'entidadId', 'reviewExcerpt']) {
    assert.match(admin, new RegExp('d\\.' + field));
  }
});

test('Soporte usa el dato común y deja todas las normas visibles', () => {
  const src = readFileSync(new URL('../src/screens/screens-2.jsx', import.meta.url), 'utf8');
  const ini = src.indexOf('function SoportePortada');
  const fin = src.indexOf('window.SoporteScreen = SoporteScreen');
  const soporte = src.slice(ini, fin);
  assert.match(soporte, /AMX_SOPORTE_CONTENT/);
  assert.match(soporte, /amx-soporte-reglas/);
  assert.doesNotMatch(soporte, /<window\.Disclosure/);
  assert.match(soporte, /aria-live/);
  assert.match(soporte, /Reintentar/);
});

test('la piel de Soporte usa papeles físicos y un solo corte estructural', () => {
  const css = readFileSync(new URL('../src/styles/estilo.css', import.meta.url), 'utf8');
  for (const cls of ['amx-soporte', 'amx-soporte-portada', 'amx-soporte-aviso',
    'amx-soporte-reglas', 'amx-soporte-regla', 'amx-soporte-carbon', 'amx-soporte-formato']) {
    assert.match(css, new RegExp('\\.' + cls + '\\b'));
  }
  assert.match(css, /@media \(min-width: 1024px\)\s*\{[^}]*\.amx-soporte-reglas\b/);
  assert.doesNotMatch(css, /amx-soporte-regles/);
});

test('ReportarError usa el helper público y advierte que GitHub es público', () => {
  const ui = readFileSync(new URL('../src/components/ui.jsx', import.meta.url), 'utf8');
  assert.match(ui, /function ReportarError/);
  assert.match(ui, /amxCorreccionUrl/);
  assert.match(ui, /noopener noreferrer/);
  assert.match(ui, /públic/i);
  assert.match(ui, /window\.ReportarError = ReportarError/);
});

test('la acción aparece en seis tipos de detalle y no en listados', () => {
  const two = readFileSync(new URL('../src/screens/screens-2.jsx', import.meta.url), 'utf8');
  const acc = readFileSync(new URL('../src/screens/screens-accesorios.jsx', import.meta.url), 'utf8');
  const mun = readFileSync(new URL('../src/screens/screens-municiones.jsx', import.meta.url), 'utf8');
  const three = readFileSync(new URL('../src/screens/screens-3.jsx', import.meta.url), 'utf8');
  // Legalidad se mudó a su propio archivo con el rediseño del 19-sep-2026: la vieja
  // LegalScreen de screens-2.jsx se borró entera.
  const leg = readFileSync(new URL('../src/screens/screens-legalidad.jsx', import.meta.url), 'utf8');
  assert.match(two, /tipo="arma"/);
  assert.match(leg, /tipo="legalidad"/);
  assert.match(two, /tipo="faq"/);
  assert.match(acc, /tipo="accesorio"/);
  assert.match(mun, /tipo="municion"/);
  assert.match(three, /tipo="calibre"/);
});

test('el prerender de Soporte contiene el manual completo sin formulario operativo', async () => {
  const { renderSoporteHtml } = await import('./prerender-soporte.mjs');
  const html = renderSoporteHtml(C);
  assert.match(html, /<h1[^>]*>Normas de la comunidad<\/h1>/);
  assert.match(html, /Todos pueden contribuir a mejorar esta enciclopedia/);
  assert.match(html, /Aquí no se compra ni se vende/);
  for (const norma of C.normas) assert.match(html, new RegExp(norma.titulo));
  assert.match(html, /Cómo se moderan las reseñas/);
  assert.match(html, /Corregir información de la enciclopedia/);
  assert.match(html, /href="\/legalidad"/);
  assert.match(html, /href="\/preguntas"/);
  assert.doesNotMatch(html, /<form|type="email"|reviewId/);
  assert.equal((html.match(/<h1/g) || []).length, 1);
});

// Un `window.X = X` puede estar escrito sin indentar y aun asi vivir DENTRO de otra
// funcion: asi entro ReportarError en medio de TiraFiltros, y su export solo corria
// si antes se renderizaba la tira de filtros. Hasta entonces window.ReportarError
// era undefined y cada pantalla que lo usa (FAQ, Legalidad, las tres fichas)
// reventaba con React #130 y se quedaba en blanco. Mirar el texto no basta: hay que
// mirar el ARBOL.
test('las primitivas de ui.jsx se exportan a nivel de modulo, no dentro de otra funcion', async () => {
  const { parse } = await import('@babel/parser');
  const src = readFileSync(new URL('../src/components/ui.jsx', import.meta.url), 'utf8');
  const ast = parse(src, { sourceType: 'script', plugins: ['jsx'] });
  const nivelSuperior = new Set();
  for (const n of ast.program.body) {
    if (n.type === 'ExpressionStatement' && n.expression.type === 'AssignmentExpression') {
      const l = n.expression.left;
      if (l.type === 'MemberExpression' && l.object.name === 'window') nivelSuperior.add(l.property.name);
    }
  }
  for (const nombre of ['ReportarError', 'CintaDymo', 'TiraFiltros', 'FolderPregunta']) {
    assert.ok(nivelSuperior.has(nombre),
      `window.${nombre} no se asigna a nivel de modulo: quedaria undefined hasta que se renderice quien lo envuelve`);
  }
});

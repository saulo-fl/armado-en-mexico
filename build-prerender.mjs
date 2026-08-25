// Armado en México — prerender estático + sitemap + robots
// ============================================================================
// Emite un .html REAL por cada URL de la app, con su <title>, description,
// canonical, Open Graph, JSON-LD y contenido en HTML crudo.
//
// Por qué existe: la app pinta todo con JavaScript, y hasta ahora las rutas
// profundas devolvían 404 (las resolvía el truco SPA de 404.html). Googlebot
// no renderiza JS en respuestas 4xx, y los crawlers de IA (GPTBot, ClaudeBot,
// PerplexityBot) no ejecutan JS en absoluto. Sin estos ficheros, el sitio es
// invisible para ambos. Ver SEO.md.
//
// Cloudflare Pages sirve `x.html` en la URL `/x` (sin extensión), así que
// `pistolas/glock-19.html` responde 200 en /pistolas/glock-19 — justo el
// esquema de URLs del router. NO emitir `glock-19/index.html`: eso daría una
// URL con barra final y obligaría a decidir canonicals.
//
// Se ejecuta desde `npm run build`, después de Babel.
// ============================================================================

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createContext, runInContext } from 'node:vm';

const SITIO = 'https://armado.mx';
const RAIZ = process.cwd();

// ─── 1. Cargar los datos igual que el navegador ─────────────────────────────
// Los data-*.js no son módulos: cuelgan sus catálogos de `window`. Se ejecutan
// en un contexto de vm con un `window` propio, que es la forma explícita de
// "corre este script y quédate con sus globales" sin ensuciar el global de Node.
const win = {};
const ctx = createContext({ window: win, console });
ctx.window = win;
for (const f of ['data.js', 'data-extra.js', 'data-traumaticas.js',
                 'data-precios.js', 'data-accesorios.js', 'data-municiones.js']) {
  runInContext(readFileSync(join(RAIZ, f), 'utf8'), ctx, { filename: f });
}
const ARMAS = win.DB || [], ACCESORIOS = win.ACCESORIOS || [], MUNICIONES = win.MUNICIONES || [];
if (!ARMAS.length) throw new Error('No se cargaron las armas: revisa data.js');

// ─── 2. Slugs: misma lógica que app.jsx ─────────────────────────────────────
// (duplicada a propósito — este script corre en Node, sin el bundle de la app.
//  Si cambias amxSlug/amxSlugIndex en app.jsx, cambia esto también.)
const slug = (s) => String(s == null ? '' : s)
  .normalize('NFD').replace(/\p{Diacritic}/gu, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const TIPO_TO_PATH = { pistola: 'pistolas', revolver: 'revolveres', rifle: 'rifles',
                       escopeta: 'escopetas', carabina: 'carabinas' };
const TIPO_LABEL = { pistola: 'Pistolas', revolver: 'Revólveres', rifle: 'Rifles',
                     escopeta: 'Escopetas', carabina: 'Carabinas' };
const CAT_LABEL = { cargadores: 'Cargadores', opticas: 'Miras y ópticas',
                    refacciones: 'Refacciones y repuestos', empunaduras: 'Empuñaduras y culatas' };

const unico = (mapa, base) => {
  const b = base || 'sin-nombre';
  let s = b, n = 2;
  while (mapa.has(s)) { s = `${b}-${n}`; n++; }
  mapa.add(s); return s;
};
const porId = (a) => a.slice().sort((x, y) => (x.id || 0) - (y.id || 0));

const rutaArma = new Map(), vistosA = new Set();
porId(ARMAS).forEach((a) => rutaArma.set(a.id,
  unico(vistosA, `${TIPO_TO_PATH[a.tipo] || 'otras'}/${slug(a.nombre)}`)));
const rutaAcc = new Map(), vistosC = new Set();
porId(ACCESORIOS).forEach((c) => rutaAcc.set(c.id,
  unico(vistosC, `${slug(c.categoria || 'accesorios')}/${slug(c.nombre)}`)));
const rutaMun = new Map(), vistosM = new Set();
porId(MUNICIONES).forEach((m) => rutaMun.set(m.id,
  unico(vistosM, `municiones/${slug([m.calibre, m.marca, m.bala, m.grano].filter(Boolean).join(' '))}`)));

// ─── 3. Utilidades de HTML ──────────────────────────────────────────────────
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const recorta = (s, n) => {
  const t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  return t.length <= n ? t : t.slice(0, t.lastIndexOf(' ', n - 1)).replace(/[,;:.]$/, '') + '…';
};
const dl = (pares) => `<dl>${pares.filter(([, v]) => v).map(
  ([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;

const migas = (items) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({
    '@type': 'ListItem', position: i + 1, name: it.nombre,
    ...(it.ruta ? { item: `${SITIO}/${it.ruta}`.replace(/\/$/, '/') } : {}),
  })),
});

// ─── 4. Shell: index.html con los huecos marcados ───────────────────────────
const shell = readFileSync(join(RAIZ, 'index.html'), 'utf8');

// APP_BASE se calcula desde location.pathname. Eso valía cuando toda ruta
// profunda pasaba por 404.html (y pathname era "/"). Ahora que cada URL es un
// fichero real, sobre /pistolas/glock-19 daría APP_BASE="/pistolas/" y un
// <base> roto que rompería scripts e imágenes. En las páginas generadas lo
// fijamos a "/". Si esta línea cambia en index.html, el build falla aquí.
const LINEA_BASE = "window.APP_BASE = window.location.pathname.replace(/[^/]*$/, '');";
if (!shell.includes(LINEA_BASE)) {
  throw new Error('build-prerender: no encuentro el cálculo de APP_BASE en index.html.\n' +
                  'Si lo cambiaste, actualiza LINEA_BASE en este script.');
}

// El <base> lo crea un script inline, y eso no basta en las páginas generadas:
// el preload scanner del navegador empieza a descargar los <script src="app.js">
// ANTES de ejecutar ese inline, resolviéndolos contra /pistolas/ → una tanda de
// 404 inútiles en cada visita (la app se recupera, pero desperdicia peticiones y
// crawl budget). En las páginas generadas emitimos <base href="/"> como etiqueta
// ESTÁTICA, lo primero del <head>, y quitamos el que se creaba por JS.
// Regex y no cadena literal: el repo se clona con CRLF en Windows y con LF en
// el build de Cloudflare, así que comparar texto exacto falla en una de las dos.
const IIFE_BASE = /\(function \(\) \{\s*var b = document\.createElement\('base'\);[\s\S]*?\}\)\(\);/;
if (!IIFE_BASE.test(shell)) {
  throw new Error('build-prerender: no encuentro el bloque que crea el <base> en index.html.\n' +
                  'Si lo cambiaste, actualiza IIFE_BASE en este script.');
}
const MARCA_HEAD = '<head>';
if (!shell.includes(MARCA_HEAD)) throw new Error('build-prerender: falta <head> en index.html');
const MARCA_DESC = /<meta name="description"[^>]*>/;
if (!MARCA_DESC.test(shell)) throw new Error('build-prerender: falta <meta name="description"> en index.html');
const MARCA_TITULO = /<title>[\s\S]*?<\/title>/;
const MARCA_ROOT = '<div id="app-root"></div>';
if (!shell.includes(MARCA_ROOT)) throw new Error('build-prerender: falta <div id="app-root"></div> en index.html');

function emitir(ruta, { titulo, desc, jsonld, cuerpo, noindex }) {
  const url = ruta ? `${SITIO}/${ruta}` : `${SITIO}/`;
  const cabeza = [
    `<meta name="description" content="${esc(desc)}">`,
    `<link rel="canonical" href="${url}">`,
    noindex ? '<meta name="robots" content="noindex,follow">' : '',
    `<meta property="og:type" content="article">`,
    `<meta property="og:title" content="${esc(titulo)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:site_name" content="Armado en México">`,
    `<meta property="og:locale" content="es_MX">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : '',
  ].filter(Boolean).join('\n');

  const html = shell
    .replace(MARCA_HEAD, `<head>\n<base href="/">`)
    .replace(LINEA_BASE, "window.APP_BASE = '/';")
    .replace(IIFE_BASE, '  /* <base href="/"> ya viene estático en el <head> (prerender). */')
    .replace(MARCA_TITULO, `<title>${esc(titulo)}</title>`)
    .replace(MARCA_DESC, cabeza)
    // El contenido va DENTRO de #app-root: React lo reemplaza al montar
    // (createRoot, no hydrateRoot), así que no hay desajuste de hidratación.
    // Es lo que leen los crawlers que no ejecutan JavaScript.
    .replace(MARCA_ROOT, `<div id="app-root">${cuerpo}</div>`);

  const destino = join(RAIZ, ruta ? `${ruta}.html` : 'index.html');
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, html, 'utf8');
  return url;
}

// ─── 5. Páginas ─────────────────────────────────────────────────────────────
const paginas = [];  // {ruta, enSitemap}

// 5a. Fichas de arma
for (const a of ARMAS) {
  const ruta = rutaArma.get(a.id);
  const rama = TIPO_TO_PATH[a.tipo] || 'otras';
  const tipoNom = (TIPO_LABEL[a.tipo] || 'Arma').replace(/e?s$/, '');
  const titulo = `${a.nombre} — ${tipoNom.toLowerCase()} ${a.calibre} | Armado en México`;
  const resumen = `La ${a.nombre} es una ${tipoNom.toLowerCase()} de ${a.marca} `
    + `en calibre ${a.calibre}${a.capacidad ? `, con capacidad de ${a.capacidad}` : ''}. `
    + `En México su clasificación es «${a.availLabel}»${a.priceExact ? `, con precio de referencia ${a.priceExact} en el catálogo oficial` : ''}.`;
  emitir(ruta, {
    titulo,
    desc: recorta(`${resumen} ${a.legalDesc || ''}`, 155),
    jsonld: { '@context': 'https://schema.org', '@graph': [
      { '@type': 'Article', headline: `${a.nombre} — ficha técnica y clasificación legal en México`,
        description: recorta(resumen, 250), inLanguage: 'es-MX',
        isPartOf: { '@type': 'WebSite', name: 'Armado en México', url: SITIO },
        author: { '@type': 'Organization', name: 'Armado en México' },
        publisher: { '@type': 'Organization', name: 'Armado en México' } },
      migas([{ nombre: 'Inicio', ruta: '' }, { nombre: TIPO_LABEL[a.tipo] || 'Arsenal', ruta: rama }, { nombre: a.nombre }]),
    ] },
    cuerpo: `<article>
<nav aria-label="Ruta"><a href="/">Inicio</a> › <a href="/${rama}">${esc(TIPO_LABEL[a.tipo] || 'Arsenal')}</a> › ${esc(a.nombre)}</nav>
<h1>${esc(a.nombre)}</h1>
<p>${esc(resumen)}</p>
${dl([['Marca', a.marca], ['Tipo', tipoNom], ['Calibre', a.calibre], ['Capacidad', a.capacidad],
      ['Mecanismo', a.mecanismo], ['Peso', a.peso], ['Longitud', a.longitud],
      ['País de origen', a.pais], ['Año', a.anio], ['Clasificación legal', a.availLabel],
      ['Precio de referencia', a.priceExact]])}
${a.legalTit ? `<h2>Situación legal en México</h2><p><strong>${esc(a.legalTit)}.</strong> ${esc(a.legalDesc || '')}</p>` : ''}
${a.historia ? `<h2>Contexto</h2><p>${esc(a.historia)}</p>` : ''}
<p><small>Información divulgativa basada en la Ley Federal de Armas de Fuego y Explosivos y en el catálogo oficial DCAM/SEDENA. Sin fines de lucro; no se comercializan armas de fuego.</small></p>
</article>`,
  });
  paginas.push({ ruta, enSitemap: true, fuente: 'armas' });
}

// 5b. Fichas de accesorio
for (const c of ACCESORIOS) {
  const ruta = rutaAcc.get(c.id);
  const rama = slug(c.categoria || 'accesorios');
  const resumen = `${c.nombre}${c.marca ? ` de ${c.marca}` : ''}. ${c.descripcion || ''}`;
  emitir(ruta, {
    titulo: `${c.nombre} | Accesorios DCAM · Armado en México`,
    desc: recorta(resumen, 155),
    jsonld: { '@context': 'https://schema.org', '@graph': [
      { '@type': 'Article', headline: c.nombre, description: recorta(resumen, 250), inLanguage: 'es-MX',
        isPartOf: { '@type': 'WebSite', name: 'Armado en México', url: SITIO } },
      migas([{ nombre: 'Inicio', ruta: '' }, { nombre: CAT_LABEL[rama] || 'Accesorios', ruta: rama }, { nombre: c.nombre }]),
    ] },
    cuerpo: `<article>
<nav aria-label="Ruta"><a href="/">Inicio</a> › <a href="/${rama}">${esc(CAT_LABEL[rama] || 'Accesorios')}</a> › ${esc(c.nombre)}</nav>
<h1>${esc(c.nombre)}</h1>
<p>${esc(recorta(resumen, 400))}</p>
${dl([['Marca', c.marca], ['Categoría', CAT_LABEL[rama] || c.categoria], ['País', c.pais],
      ['Compatibilidad', c.compatibilidad], ['Especificaciones', c.specs],
      ['Clasificación', c.avail], ['Precio de referencia', c.priceExact]])}
</article>`,
  });
  paginas.push({ ruta, enSitemap: true, fuente: 'acc' });
}

// 5c. Fichas de munición
for (const m of MUNICIONES) {
  const ruta = rutaMun.get(m.id);
  const resumen = `${m.nombre}. ${m.descripcion || ''}`;
  emitir(ruta, {
    titulo: `${m.calibre} ${m.marca ? `· ${m.marca} ` : ''}— munición | Armado en México`,
    desc: recorta(resumen, 155),
    jsonld: { '@context': 'https://schema.org', '@graph': [
      { '@type': 'Article', headline: m.nombre, description: recorta(resumen, 250), inLanguage: 'es-MX',
        isPartOf: { '@type': 'WebSite', name: 'Armado en México', url: SITIO } },
      migas([{ nombre: 'Inicio', ruta: '' }, { nombre: 'Municiones', ruta: 'municiones' }, { nombre: m.nombre }]),
    ] },
    cuerpo: `<article>
<nav aria-label="Ruta"><a href="/">Inicio</a> › <a href="/municiones">Municiones</a> › ${esc(m.nombre)}</nav>
<h1>${esc(m.nombre)}</h1>
<p>${esc(recorta(resumen, 400))}</p>
${dl([['Calibre', m.calibre], ['Marca', m.marca], ['Tipo de bala', m.bala], ['Grano', m.grano],
      ['Uso', m.tipo], ['País', m.pais], ['Clasificación', m.avail], ['Precio de referencia', m.priceExact]])}
</article>`,
  });
  paginas.push({ ruta, enSitemap: true, fuente: 'mun' });
}

// 5d. Listados por rama (armas y accesorios) + municiones
const listados = [
  ...Object.entries(TIPO_TO_PATH).map(([tipo, ruta]) => ({
    ruta, nombre: TIPO_LABEL[tipo], fuente: 'armas',
    items: ARMAS.filter((a) => a.tipo === tipo).map((a) => ({ nombre: a.nombre, ruta: rutaArma.get(a.id) })),
    intro: `Listado de ${TIPO_LABEL[tipo].toLowerCase()} registradas en el catálogo oficial DCAM/SEDENA, con su calibre, características y clasificación legal en México.`,
  })),
  ...Object.keys(CAT_LABEL).map((cat) => ({
    ruta: cat, nombre: CAT_LABEL[cat], fuente: 'acc',
    items: ACCESORIOS.filter((c) => slug(c.categoria) === cat).map((c) => ({ nombre: c.nombre, ruta: rutaAcc.get(c.id) })),
    intro: `${CAT_LABEL[cat]} disponibles en el inventario oficial DCAM, con marca, compatibilidad y precio de referencia.`,
  })),
  { ruta: 'municiones', nombre: 'Municiones', fuente: 'mun',
    items: MUNICIONES.map((m) => ({ nombre: m.nombre, ruta: rutaMun.get(m.id) })),
    intro: 'Cartuchos y munición del inventario oficial DCAM/OTCA, por calibre, marca y tipo de bala.' },
].filter((l) => l.items.length);

for (const l of listados) {
  emitir(l.ruta, {
    titulo: `${l.nombre} legales en México — catálogo DCAM | Armado en México`,
    desc: recorta(l.intro, 155),
    jsonld: { '@context': 'https://schema.org', '@graph': [
      { '@type': 'ItemList', name: `${l.nombre} en México`, numberOfItems: l.items.length,
        itemListElement: l.items.map((it, i) => ({
          '@type': 'ListItem', position: i + 1, name: it.nombre, url: `${SITIO}/${it.ruta}` })) },
      migas([{ nombre: 'Inicio', ruta: '' }, { nombre: l.nombre }]),
    ] },
    cuerpo: `<article>
<nav aria-label="Ruta"><a href="/">Inicio</a> › ${esc(l.nombre)}</nav>
<h1>${esc(l.nombre)} legales en México</h1>
<p>${esc(l.intro)}</p>
<ul>${l.items.map((it) => `<li><a href="/${it.ruta}">${esc(it.nombre)}</a></li>`).join('')}</ul>
</article>`,
  });
  paginas.push({ ruta: l.ruta, enSitemap: true, fuente: l.fuente });
}

// 5e. Páginas fijas de la app
const FIJAS = [
  { ruta: 'arsenal', titulo: 'Arsenal completo — armas legales en México', enSitemap: true,
    desc: 'Catálogo completo de armas de fuego del inventario oficial DCAM/SEDENA, con filtros por tipo, calibre, uso y disponibilidad.' },
  { ruta: 'calibres', titulo: 'Guía de calibres', enSitemap: true,
    desc: 'Guía divulgativa de los calibres presentes en el catálogo DCAM: uso típico, velocidad, energía y retroceso.' },
  { ruta: 'legalidad', titulo: 'Tenencia legal de armas en México — requisitos y trámite SEDENA', enSitemap: true,
    desc: 'Requisitos y pasos para la posesión legal de un arma de fuego en México conforme a la Ley Federal de Armas de Fuego y Explosivos.' },
  { ruta: 'traumaticas', titulo: 'Armas traumáticas — defensa menos letal sin permiso SEDENA', enSitemap: true,
    desc: 'Dispositivos de defensa menos letal accionados por CO₂: no son armas de fuego y no requieren permiso ante la SEDENA.' },
  { ruta: 'preguntas', titulo: 'Preguntas frecuentes sobre armas legales en México', enSitemap: true,
    desc: 'Dudas habituales sobre licencias, calibres permitidos, portación y trámite ante la SEDENA.' },
  { ruta: 'campos', titulo: 'Campos de tiro y clubes en México', enSitemap: true,
    desc: 'Clubes de tiro y polígonos en México, con disciplinas, distancias y modalidad.' },
  { ruta: 'cursos', titulo: 'Cursos de manejo y tiro', enSitemap: true,
    desc: 'Formación en manejo seguro, tiro defensivo, precisión y marco legal.' },
  { ruta: 'acerca', titulo: 'Acerca de Armado en México', enSitemap: true,
    desc: 'Quiénes somos, con qué fuentes trabajamos y por qué esta enciclopedia es divulgativa y sin fines de lucro.' },
  // Sin valor de búsqueda: existen para no dar 404, pero fuera del índice.
  { ruta: 'comparar', titulo: 'Comparador de armas', enSitemap: false, noindex: true,
    desc: 'Compara dos armas del catálogo lado a lado.' },
  { ruta: 'proponer', titulo: 'Proponer un arma', enSitemap: false, noindex: true,
    desc: 'Envía al curador un arma que falte en el catálogo.' },
  { ruta: 'mas', titulo: 'Más secciones', enSitemap: false, noindex: true,
    desc: 'Índice de secciones de Armado en México.' },
];
for (const p of FIJAS) {
  emitir(p.ruta, {
    titulo: `${p.titulo} | Armado en México`, desc: p.desc, noindex: p.noindex,
    jsonld: { '@context': 'https://schema.org',
      '@graph': [migas([{ nombre: 'Inicio', ruta: '' }, { nombre: p.titulo }])] },
    cuerpo: `<article>
<nav aria-label="Ruta"><a href="/">Inicio</a> › ${esc(p.titulo)}</nav>
<h1>${esc(p.titulo)}</h1><p>${esc(p.desc)}</p></article>`,
  });
  paginas.push({ ruta: p.ruta, enSitemap: p.enSitemap });
}

// ─── 6. sitemap.xml ─────────────────────────────────────────────────────────
// lastmod: se toma la fecha real del último commit que tocó los datos. Google
// solo usa lastmod si es "consistently and verifiably accurate" y la confianza
// es binaria: si no fuera real, es mejor omitirlo que inventar la fecha del build.
// Cada página lleva la fecha del commit que tocó SU fuente de datos. Las
// páginas fijas no salen de un data-*.js, así que van SIN lastmod: es
// preferible omitirlo a inventar una fecha, porque Google se cree la columna
// entera o la descarta entera, y una fecha falsa contamina las verdaderas.
const fechaDe = (archivo) => {
  try {
    return execFileSync('git', ['log', '-1', '--format=%cI', '--', archivo],
      { cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch { return ''; }   // sin git (build de Cloudflare sin historial) → se omite
};
const FECHA = { armas: fechaDe('data.js'), acc: fechaDe('data-accesorios.js'), mun: fechaDe('data-municiones.js') };

const enSitemap = [{ ruta: '', enSitemap: true }, ...paginas].filter((p) => p.enSitemap);
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${enSitemap.map(({ ruta, fuente }) => {
  const lm = fuente ? FECHA[fuente] : '';
  return `  <url><loc>${esc(ruta ? `${SITIO}/${ruta}` : `${SITIO}/`)}</loc>`
    + (lm ? `<lastmod>${lm}</lastmod>` : '') + `</url>`;
}).join('\n')}
</urlset>
`;
writeFileSync(join(RAIZ, 'sitemap.xml'), xml, 'utf8');

// ─── 6b. (sin _redirects) ───────────────────────────────────────────────────
// Aquí hubo un rewrite `/pistolas -> /pistolas.html 200` para fijar el listado
// frente al directorio del mismo nombre. Provocaba un BUCLE: Cloudflare redirige
// todo `.html` a su versión sin extensión, así que /pistolas.html volvía a
// /pistolas y de ahí otra vez a la regla. Medido en el preview: 308 -> /pistolas.
// Se deja que Pages resuelva `pistolas.html` en /pistolas por su cuenta.

// ─── 7. robots.txt ──────────────────────────────────────────────────────────
// Cloudflare antepone su propio bloque gestionado (Content Signals) a este
// fichero; la directiva Sitemap: es global y funciona igualmente. Ver SEO.md.
writeFileSync(join(RAIZ, 'robots.txt'), `User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin.html
Disallow: /shopify-demo
Disallow: /shopify-demo.html

Sitemap: ${SITIO}/sitemap.xml
`, 'utf8');

// ─── 8. Resumen ─────────────────────────────────────────────────────────────
console.log(`prerender: ${paginas.length} páginas`
  + ` (${ARMAS.length} armas · ${ACCESORIOS.length} accesorios · ${MUNICIONES.length} municiones`
  + ` · ${listados.length} listados · ${FIJAS.length} fijas)`);
const conFecha = enSitemap.filter((p) => p.fuente && FECHA[p.fuente]).length;
console.log(`sitemap:   ${enSitemap.length} URLs · ${conFecha} con lastmod`
  + (FECHA.armas ? ` (datos: ${FECHA.armas.slice(0, 10)})` : ' — sin git, lastmod omitido'));

// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.

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
import { createContext, runInContext } from 'node:vm';
import { renderSoporteHtml } from './prerender-soporte.mjs';
import { renderLegalHtml } from './prerender-legal.mjs';

const SITIO = 'https://armado.mx';
const RAIZ = process.cwd();
// El repo separa fuente de salida: se lee de src/ y public/, se escribe en out/.
// out/ es lo que Cloudflare Pages publica (pages_build_output_dir en wrangler.toml).
const SRC = join(RAIZ, 'src');
const PUB = join(RAIZ, 'public');
const OUT = join(RAIZ, 'out');
mkdirSync(OUT, { recursive: true });

// ─── 1. Cargar los datos igual que el navegador ─────────────────────────────
// Los data-*.js no son módulos: cuelgan sus catálogos de `window`. Se ejecutan
// en un contexto de vm con un `window` propio, que es la forma explícita de
// "corre este script y quédate con sus globales" sin ensuciar el global de Node.
const win = {};
const ctx = createContext({ window: win, console });
ctx.window = win;
for (const f of ['data.js', 'data-extra.js', 'data-traumaticas.js', 'data-soporte.js',
                 'data-legal.js', 'data-precios.js', 'data-accesorios.js', 'data-municiones.js']) {
  runInContext(readFileSync(join(SRC, 'data', f), 'utf8'), ctx, { filename: f });
}
runInContext(readFileSync(join(SRC, 'lib', 'legal.js'), 'utf8'), ctx, { filename: 'legal.js' });
const LEGAL = win.AMX_LEGAL;
if (!LEGAL || !LEGAL.requisitos || LEGAL.requisitos.length === 0) throw new Error('data-legal.js no cargó');
const ARMAS = win.DB || [], ACCESORIOS = win.ACCESORIOS || [], MUNICIONES = win.MUNICIONES || [];
if (!ARMAS.length) throw new Error('No se cargaron las armas: revisa data.js');

// Verificar contenido de Soporte
const SOPORTE = win.AMX_SOPORTE_CONTENT;
if (!SOPORTE || !SOPORTE.normas || SOPORTE.normas.length !== 4) {
  throw new Error('No se cargó el contenido completo de Soporte');
}

// ─── 1b. Fecha real de cada artículo, para el lastmod del sitemap ───────────
// NO sale de git. Cloudflare Pages clona en superficial, así que
// `git log -1 -- ruta` cae siempre al commit HEAD y el sitemap publicado
// acababa con UNA sola fecha —la del último deploy— en sus 317 URLs. Medido el
// 9-sep-2026 comparando armado.mx con el historial local.
//
// Los historiales de precio SÍ traen la fecha real de cada inventario, y una
// por artículo: es exactamente cuándo cambió el dato de ESA página. Cobertura
// verificada: 192/192 armas, 36/36 accesorios, 71/71 municiones.
// Formato ISO corto (AAAA-MM-DD), que es W3C válido para <lastmod>.
const ultimaFecha = (hist) => (Array.isArray(hist) ? hist : [])
  .map((e) => e && e.date).filter(Boolean).sort().pop() || '';
const histAcc = (id) => (typeof win.getAccesorioPriceHistory === 'function'
  ? win.getAccesorioPriceHistory(id) : (win.ACCESORIOS_PRICE_HISTORY || {})[id]);
const histMun = (id) => (typeof win.getMunicionPriceHistory === 'function'
  ? win.getMunicionPriceHistory(id) : (win.MUNICIONES_PRICE_HISTORY || {})[id]);
// Ordenado como lo sirve Store.getPriceHistory: el último es el precio actual.
const histArma = (id) => ((win.AMX_PRICE_HISTORY_SEED || {})[id] || []).slice()
  .sort((x, y) => String(x.date || '').localeCompare(String(y.date || '')));
const fechaArma = (a) => ultimaFecha((win.AMX_PRICE_HISTORY_SEED || {})[a.id]);
const fechaAcc = (c) => ultimaFecha(histAcc(c.id));
const fechaMun = (m) => ultimaFecha(histMun(m.id));
// Un listado es tan reciente como el más reciente de sus artículos.
const fechaPorRuta = new Map();
const masReciente = (fechas) => fechas.filter(Boolean).sort().pop() || '';

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

// La nota de errata DCAM junto al precio: el último registro del historial trae
// `errata` (el precio tal como salió en el PDF) y `price` es el que se publica.
// LOS DOS TEXTOS SON EL MISMO: es `amxTextoErrata` de ui.jsx, duplicado porque
// aquí no hay ui.jsx. Si tocas uno, toca el otro. Los metadatos (description,
// og:description, JSON-LD) no la llevan: ya citan el precio que se publica.
const MESES_ERRATA = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const fechaErrata = (f) => {
  const [a, m, d] = String(f || '').slice(0, 10).split('-');
  return MESES_ERRATA[m - 1] ? `${d}-${MESES_ERRATA[m - 1]}-${a}` : String(f || '');
};
const precioNum = (s) => {
  const n = parseFloat(String(s == null ? '' : s).replace(/[^\d.]/g, ''));
  return isFinite(n) ? n : null;
};
function textoErrata(hist) {
  const h = Array.isArray(hist) ? hist : [];
  const ultimo = h[h.length - 1];
  if (!ultimo || !ultimo.errata) return null;
  const v = precioNum(ultimo.price);
  let anterior = null;
  for (let i = h.length - 2; i >= 0 && v != null; i--) {
    if (precioNum(h[i].price) === v) { anterior = h[i]; break; }
  }
  const error = 'probablemente es un error de la publicación de la Secretaría de la Defensa.';
  return anterior
    ? `Precio del inventario ${fechaErrata(anterior.date)}. El publicado el ${fechaErrata(ultimo.date)} (${String(ultimo.errata).replace(' MXN', '')}) ${error}`
    : `El precio publicado el ${fechaErrata(ultimo.date)} ${error}`;
}
const notaErrata = (hist) => {
  const t = textoErrata(hist);
  return t ? `<p>⚠ ${esc(t)}</p>` : '';
};

const migas = (items) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({
    '@type': 'ListItem', position: i + 1, name: it.nombre,
    ...(it.ruta ? { item: `${SITIO}/${it.ruta}` } : {}),
  })),
});

// ─── 4. Shell: index.html con los huecos marcados ───────────────────────────
const shell = readFileSync(join(SRC, 'pages', 'index.html'), 'utf8');

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

// ─── 4b. El pie del sitio, en HTML crudo ────────────────────────────────────
// `window.PieDeSitio` (ui.jsx) solo existe DESPUÉS de que React monte, y GPTBot,
// ClaudeBot y PerplexityBot no ejecutan JS (SEO.md §2). Un aviso legal que solo
// existe en JavaScript no es un aviso: para ellos el sitio no lo lleva.
// Va una vez aquí, dentro de emitir(), y sale en las 321 páginas.
// LOS DOS TEXTOS SON EL MISMO: si tocas el pie en ui.jsx, tócalo aquí.
const PIE = `<footer>
<hr>
<p>Construido por <a href="https://github.com/saulo-fl" rel="noopener noreferrer">saulo-fl</a> y <a href="https://armasmys.com/" rel="noopener noreferrer">Armas M&amp;S</a> para la comunidad de tiradores de México · <a href="https://github.com/saulo-fl/armado-en-mexico" rel="noopener noreferrer">GitHub</a></p>
<p>Catálogo divulgativo de código abierto. Las armas de fuego se muestran solo con fines informativos. Información basada en la <a href="/legalidad">Ley Federal de Armas de Fuego</a> y precios DCAM.</p>
<p><small>Fuentes: precios y existencias de los <a href="/acerca">inventarios oficiales DCAM y OTCA</a>, con la fecha del inventario en cada ficha · Marco legal: <a href="/legalidad">Ley Federal de Armas de Fuego y Explosivos</a> · Datos técnicos: <a href="/calibres">guía de calibres</a> y publicaciones de los fabricantes.</small></p>
<p><small>Los nombres de productos, logotipos y marcas que aparecen en este sitio son propiedad de sus respectivos dueños y se usan únicamente para identificar el producto del que se informa. Armado en México no está afiliado ni respaldado por ninguna de estas compañías, y no forma parte de DEFENSA (anteriormente SEDENA), la DCAM ni de ninguna dependencia del gobierno mexicano.</small></p>
</footer>`;

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
    .replace(MARCA_ROOT, `<div id="app-root">${cuerpo}${PIE}</div>`);

  const destino = join(OUT, ruta ? `${ruta}.html` : 'index.html');
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, html, 'utf8');
  return url;
}

// ─── 5. Páginas ─────────────────────────────────────────────────────────────
const paginas = [];  // {ruta, enSitemap}

// 5a. Fichas de arma
// Nombre del tipo en singular, con su artículo. Antes se despluralizaba
// TIPO_LABEL con /e?s$/ y el artículo iba fijo en femenino: salían «rifl .300»
// y «La Ruger Wrangler es una revólver» en 42 títulos y 50 resúmenes.
const TIPO_NOM = {
  pistola: ['pistola', 'La', 'una'], revolver: ['revólver', 'El', 'un'],
  rifle: ['rifle', 'El', 'un'], escopeta: ['escopeta', 'La', 'una'],
  carabina: ['carabina', 'La', 'una'],
};
const mayus = (s) => s.charAt(0).toUpperCase() + s.slice(1);
for (const a of ARMAS) {
  const ruta = rutaArma.get(a.id);
  const rama = TIPO_TO_PATH[a.tipo] || 'otras';
  const [tipoNom, art, indef] = TIPO_NOM[a.tipo] || ['arma', 'El', 'un'];
  const titulo = `${a.nombre} — ${tipoNom} ${a.calibre} | Armado en México`;
  const resumen = `${art} ${a.nombre} es ${indef} ${tipoNom} de ${a.marca} `
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
${dl([['Marca', a.marca], ['Tipo', mayus(tipoNom)], ['Calibre', a.calibre], ['Capacidad', a.capacidad],
      ['Mecanismo', a.mecanismo], ['Peso', a.peso], ['Longitud', a.longitud],
      ['País de origen', a.pais], ['Año', a.anio], ['Clasificación legal', a.availLabel],
      ['Precio de referencia', a.priceExact]])}
${notaErrata(histArma(a.id))}
${a.legalTit ? `<h2>Situación legal en México</h2><p><strong>${esc(a.legalTit)}.</strong> ${esc(a.legalDesc || '')}</p>` : ''}
${a.historia ? `<h2>Contexto</h2><p>${esc(a.historia)}</p>` : ''}
<p><small>Información divulgativa basada en la Ley Federal de Armas de Fuego y Explosivos y en el catálogo oficial DCAM/SEDENA. No se comercializan armas de fuego.</small></p>
</article>`,
  });
  fechaPorRuta.set(ruta, fechaArma(a));
  paginas.push({ ruta, enSitemap: true, fuente: 'armas', lastmod: fechaArma(a) });
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
${notaErrata(histAcc(c.id))}
</article>`,
  });
  fechaPorRuta.set(ruta, fechaAcc(c));
  paginas.push({ ruta, enSitemap: true, fuente: 'acc', lastmod: fechaAcc(c) });
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
${notaErrata(histMun(m.id))}
</article>`,
  });
  fechaPorRuta.set(ruta, fechaMun(m));
  paginas.push({ ruta, enSitemap: true, fuente: 'mun', lastmod: fechaMun(m) });
}

// Ficha de cada calibre: /calibres/<slug>. Van SIN lastmod a propósito: no salen
// de un inventario con fecha, como las armas, sino de una guía.
for (const c of (win.CALIBRES || [])) {
  const ruta = `calibres/${slug(c.id)}`;
  const armas = ARMAS.filter((a) => a.calibre === c.id);
  const resumen = `${c.id}: cartucho de ${String(c.clase).toLowerCase()} para ${String(c.uso).toLowerCase()}. ${c.desc || ''}`;
  emitir(ruta, {
    titulo: `${c.id} — calibre, balística y situación legal en México | Armado en México`,
    desc: recorta(resumen, 155),
    jsonld: { '@context': 'https://schema.org', '@graph': [
      { '@type': 'Article', headline: `${c.id} — ficha del calibre`, description: recorta(resumen, 250), inLanguage: 'es-MX',
        isPartOf: { '@type': 'WebSite', name: 'Armado en México', url: SITIO } },
      migas([{ nombre: 'Inicio', ruta: '' }, { nombre: 'Calibres', ruta: 'calibres' }, { nombre: c.id }]),
    ] },
    cuerpo: `<article>
<nav aria-label="Ruta"><a href="/">Inicio</a> › <a href="/calibres">Calibres</a> › ${esc(c.id)}</nav>
<h1>${esc(c.id)}</h1>
<p>${esc(recorta(resumen, 400))}</p>
${dl([['Clase', c.clase], ['Sistema', c.sistema], ['Uso típico', c.uso],
      ['Largo del cartucho', c.mm ? `${c.mm} mm` : ''],
      ['Velocidad', c.velocidad], ['Energía', c.energia], ['Retroceso', c.retroceso],
      ['Situación legal', c.legalNota], ['Fundamento', c.legalArt],
      ['Fuente de las cifras', c.fuente ? `${c.fuente.nombre} (${c.fuente.fecha})` : '']])}
${armas.length ? `<h2>Armas del catálogo en ${esc(c.id)}</h2><ul>${armas.map((a) => `<li><a href="/${rutaArma.get(a.id)}">${esc(a.nombre)}</a></li>`).join('')}</ul>` : ''}
</article>`,
  });
  paginas.push({ ruta, enSitemap: true, fuente: 'calibres' });
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
  // El arsenal se separa en base y catálogo: /arsenal (el hub) va en FIJAS;
  // el catálogo y los filtros rápidos por armería son listados de verdad —
  // tienen contenido: un ItemList de fichas. La misma getArmaSucursales de
  // data-precios.js decide qué arma sale en cada armería, como en la app.
  { ruta: 'arsenal/catalogo', nombre: 'Arsenal', h1: 'Arsenal completo',
    miga: { nombre: 'Arsenal', ruta: 'arsenal' },
    titulo: 'Arsenal completo — armas legales en México | Armado en México',
    fuente: 'armas',
    items: ARMAS.map((a) => ({ nombre: a.nombre, ruta: rutaArma.get(a.id) })),
    intro: 'El catálogo completo de armas de fuego de los inventarios oficiales DCAM y OTCA, con su calibre, características, precio de referencia y clasificación legal en México.' },
  { ruta: 'arsenal/catalogo/dcam', nombre: 'Arsenal DCAM', h1: 'Arsenal DCAM',
    miga: { nombre: 'Arsenal', ruta: 'arsenal' },
    titulo: 'Arsenal DCAM — armas legales en México | Armado en México',
    fuente: 'armas',
    items: ARMAS.filter((a) => win.getArmaSucursales(a.id).dcam).map((a) => ({ nombre: a.nombre, ruta: rutaArma.get(a.id) })),
    intro: 'Armas de fuego registradas en el inventario oficial de la DCAM (Campo Militar No. 1-D, Naucalpan, Edo. Méx.), con su calibre, características, precio de referencia y clasificación legal en México.' },
  { ruta: 'arsenal/catalogo/otca', nombre: 'Arsenal OTCA', h1: 'Arsenal OTCA',
    miga: { nombre: 'Arsenal', ruta: 'arsenal' },
    titulo: 'Arsenal OTCA — armas legales en México | Armado en México',
    fuente: 'armas',
    items: ARMAS.filter((a) => win.getArmaSucursales(a.id).otca).map((a) => ({ nombre: a.nombre, ruta: rutaArma.get(a.id) })),
    intro: 'Armas de fuego registradas en el inventario oficial de la OTCA (Monterrey, Nuevo León), con su calibre, características, precio de referencia y clasificación legal en México.' },
].filter((l) => l.items.length);

for (const l of listados) {
  // Las ramas del arsenal llevan `miga` (su padre, /arsenal), `h1` y `titulo`
  // propios; los listados clásicos siguen usando los valores por defecto.
  const migaPadre = l.miga ? ` › <a href="/${l.miga.ruta}">${esc(l.miga.nombre)}</a>` : '';
  emitir(l.ruta, {
    titulo: l.titulo || `${l.nombre} legales en México — catálogo DCAM | Armado en México`,
    desc: recorta(l.intro, 155),
    jsonld: { '@context': 'https://schema.org', '@graph': [
      { '@type': 'ItemList', name: `${l.nombre} en México`, numberOfItems: l.items.length,
        itemListElement: l.items.map((it, i) => ({
          '@type': 'ListItem', position: i + 1, name: it.nombre, url: `${SITIO}/${it.ruta}` })) },
      migas(l.miga
        ? [{ nombre: 'Inicio', ruta: '' }, { nombre: l.miga.nombre, ruta: l.miga.ruta }, { nombre: l.nombre }]
        : [{ nombre: 'Inicio', ruta: '' }, { nombre: l.nombre }]),
    ] },
    cuerpo: `<article>
<nav aria-label="Ruta"><a href="/">Inicio</a> ›${migaPadre} ${esc(l.nombre)}</nav>
<h1>${esc(l.h1 || `${l.nombre} legales en México`)}</h1>
<p>${esc(l.intro)}</p>
<ul>${l.items.map((it) => `<li><a href="/${it.ruta}">${esc(it.nombre)}</a></li>`).join('')}</ul>
</article>`,
  });
  paginas.push({ ruta: l.ruta, enSitemap: true, fuente: l.fuente,
    lastmod: masReciente((l.items || []).map((it) => fechaPorRuta.get(it.ruta))) });
}

// 5e. Páginas fijas de la app
const FIJAS = [
  // /arsenal es la BASE de la sección (el hub). El catálogo completo vive en
  // /arsenal/catalogo y los filtros rápidos por armería en /arsenal/catalogo/dcam
  // y /arsenal/catalogo/otca — los tres salen de `listados` arriba.
  { ruta: 'arsenal', titulo: 'Arsenal — armas legales en México', enSitemap: true,
    desc: 'La sección Arsenal: los tipos de armas, las armerías DCAM y OTCA, y el catálogo completo con filtros por tipo, calibre, uso, precio y disponibilidad.' },
  { ruta: 'calibres', titulo: 'Guía de calibres', enSitemap: true,
    desc: 'Los 30 calibres de la guía, de menor a mayor: qué son, qué tan fuerte pega cada uno, su balística y cuáles puede adquirir un civil en México.' },
  { ruta: 'legalidad', titulo: 'Tenencia legal de armas en México — requisitos y trámite SEDENA', enSitemap: true,
    desc: 'Los permisos, los papeles y la ley detrás de tener un arma legalmente en México, con la fuente y la fecha de cada afirmación.',
    cuerpo: renderLegalHtml(LEGAL, 'hub', win) },
  { ruta: 'legalidad/requisitos', titulo: 'Requisitos para comprar un arma en México — permiso y compra', enSitemap: true,
    desc: 'Los papeles que pide el permiso extraordinario ante el Registro Federal y los que pide la compra en la DCAM. Son dos trámites distintos.',
    cuerpo: renderLegalHtml(LEGAL, 'requisitos', win) },
  { ruta: 'traumaticas', titulo: 'Armas traumáticas — defensa menos letal sin permiso SEDENA', enSitemap: true,
    desc: 'Dispositivos de defensa menos letal accionados por CO₂: no son armas de fuego y no requieren permiso ante la SEDENA.' },
  { ruta: 'soporte', titulo: 'Soporte y normas de la comunidad', enSitemap: true,
    desc: 'Qué se puede publicar en las reseñas, cómo denunciar contenido y cómo se modera. Catálogo divulgativo: aquí no se compran ni se venden armas.',
    cuerpo: renderSoporteHtml(SOPORTE) },
  { ruta: 'preguntas', titulo: 'Preguntas frecuentes sobre armas legales en México', enSitemap: true,
    desc: 'Dudas habituales sobre licencias, calibres permitidos, portación y trámite ante la SEDENA.' },
  // CONGELADAS hasta el lanzamiento: la app sirve una pantalla «Próximamente».
  // Siguen existiendo para no dar 404 a quien tenga el enlace, pero salen del
  // indice. /cursos es el nombre viejo de /experiencias y se mantiene vivo
  // porque ya estaba indexado; la app lo resuelve a Experiencias. NO se les
  // pone canonical cruzado: con noindex en las tres no tendria efecto, y el
  // canonico se decide al reactivarlas. Ver PLACEHOLDERS.md.
  { ruta: 'campos', titulo: 'Campos de tiro y clubes en México', enSitemap: false, noindex: true,
    desc: 'Clubes de tiro y polígonos en México. Sección en preparación.' },
  { ruta: 'experiencias', titulo: 'Experiencias', enSitemap: false, noindex: true,
    desc: 'Formación y actividades de tiro. Sección en preparación.' },
  { ruta: 'cursos', titulo: 'Experiencias', enSitemap: false, noindex: true,
    desc: 'Formación y actividades de tiro. Sección en preparación.' },
  { ruta: 'acerca', titulo: 'Acerca de Armado en México', enSitemap: true,
    desc: 'Quiénes somos, con qué fuentes trabajamos y por qué esta enciclopedia es divulgativa.' },
  // Sin valor de búsqueda: existen para no dar 404, pero fuera del índice.
  { ruta: 'comparar', titulo: 'Comparador de armas', enSitemap: false, noindex: true,
    desc: 'Compara dos armas del catálogo lado a lado.' },
  { ruta: 'mas', titulo: 'Más secciones', enSitemap: false, noindex: true,
    desc: 'Índice de secciones de Armado en México.' },
];
for (const p of FIJAS) {
  // Si la entrada ya tiene `cuerpo` (ej. soporte con renderSoporteHtml),
  // úsalo tal cual; de lo contrario, genera el HTML genérico.
  const cuerpo = p.cuerpo || `<article>
<nav aria-label="Ruta"><a href="/">Inicio</a> › ${esc(p.titulo)}</nav>
<h1>${esc(p.titulo)}</h1><p>${esc(p.desc)}</p></article>`;
  emitir(p.ruta, {
    titulo: `${p.titulo} | Armado en México`, desc: p.desc, noindex: p.noindex,
    jsonld: { '@context': 'https://schema.org',
      '@graph': [migas([{ nombre: 'Inicio', ruta: '' }, { nombre: p.titulo }])] },
    cuerpo,
  });
  paginas.push({ ruta: p.ruta, enSitemap: p.enSitemap });
}

// ─── 6. sitemap.xml ─────────────────────────────────────────────────────────
// lastmod: la fecha real del inventario del que sale cada artículo (ver 1b), no
// la del build ni la de un commit. Google solo usa lastmod si es "consistently
// and verifiably accurate" y la confianza es binaria: si no fuera real, es mejor
// omitirlo que inventar una fecha, porque se cree la columna entera o la
// descarta entera, y una fecha falsa contamina las verdaderas. Las páginas fijas
// no salen de un data-*.js, así que siguen SIN lastmod.
// La portada lleva la más reciente de todas: es lo que cambia cuando cambia algo.

const enSitemap = [{ ruta: '', enSitemap: true, lastmod: masReciente(paginas.map((p) => p.lastmod)) },
  ...paginas].filter((p) => p.enSitemap);
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${enSitemap.map(({ ruta, lastmod }) => {
  const lm = lastmod || '';
  return `  <url><loc>${esc(ruta ? `${SITIO}/${ruta}` : `${SITIO}/`)}</loc>`
    + (lm ? `<lastmod>${lm}</lastmod>` : '') + `</url>`;
}).join('\n')}
</urlset>
`;
writeFileSync(join(OUT, 'sitemap.xml'), xml, 'utf8');

// ─── 6b. (sin _redirects) ───────────────────────────────────────────────────
// Aquí hubo un rewrite `/pistolas -> /pistolas.html 200` para fijar el listado
// frente al directorio del mismo nombre. Provocaba un BUCLE: Cloudflare redirige
// todo `.html` a su versión sin extensión, así que /pistolas.html volvía a
// /pistolas y de ahí otra vez a la regla. Medido en el preview: 308 -> /pistolas.
// Se deja que Pages resuelva `pistolas.html` en /pistolas por su cuenta.

// ─── 7. robots.txt ──────────────────────────────────────────────────────────
// Cloudflare antepone su propio bloque gestionado (Content Signals) a este
// fichero; la directiva Sitemap: es global y funciona igualmente. Ver SEO.md.
writeFileSync(join(OUT, 'robots.txt'), `User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin.html

Sitemap: ${SITIO}/sitemap.xml
`, 'utf8');

// ─── 7b. Guardias de caché ──────────────────────────────────────────────────
// Dos formas distintas de que un deploy no llegue al visitante, las dos mudas.
//
// (a) REGLA EN `_headers`. Todo .js/.css servido por el sitio DEBE tener la
// suya, o Pages lo sirve con su default de `max-age=14400` y el navegador
// ejecuta la versión vieja hasta 4 h después del deploy. Ya pasó (ago-2026):
// `/*.js` parecía cubrirlo, pero el splat de Pages nunca coincide con un patrón
// que lleve texto tras el asterisco, así que la regla estaba muerta y nadie se
// enteró — una regla muerta no rompe el build, solo deja de hacer nada.
// Por eso los archivos van uno a uno en `_headers` y esto comprueba la lista.
//
// (b) SUFIJO `?v=` EN EL HTML. La regla de (a) solo consigue que el navegador
// revalide; no invalida lo que ya tiene guardado. Un móvil con el `ui.js` del
// tema anterior en su caché (o detrás de un proxy, o con la pestaña dormida) lo
// sigue ejecutando y mezcla el HTML nuevo con el JavaScript viejo. Ocurrió con
// el rediseño de ago-2026: llegaba el HTML nuevo y el JS seguía pintando el
// acento beige #DDD5C4, que sobre el lienzo crema da 1.27:1 — invisible.
// Cambiar la URL es lo único que fuerza una descarga de verdad.
//
// El \r\n importa: git materializa `_headers` con CRLF en Windows y con LF en
// el build de Cloudflare. Sin normalizar, en local fallaba denunciando los 19
// archivos a la vez — un guardia que grita siempre se acaba ignorando.
const reglasCache = readFileSync(join(PUB, '_headers'), 'utf8').replace(/\r\n/g, '\n');
const scriptsLocales = new Set();
const sinVersion = [];
// Las dos páginas fuente que cargan código del sitio. Fuera de esta lista sus
// <script> se saltarían los dos guardias de abajo.
for (const html of ['index.html', 'admin.html']) {
  const src = readFileSync(join(SRC, 'pages', html), 'utf8');
  // Grupo 1 = ruta sin query (lo que se busca en `_headers`); grupo 2 = la query
  // tal cual, que es donde se comprueba el ?v=.
  const refs = [
    ...src.matchAll(/<script[^>]+src="([^"?]+\.js)(\?[^"]*)?"/g),
    // Las hojas de estilo tienen exactamente el mismo problema que los scripts y
    // hasta ago-2026 no se vigilaban: un .css sin regla NO rompía el build, se
    // colaba en silencio y se quedaba a merced del TTL de la zona.
    ...src.matchAll(/<link[^>]+href="([^"?]+\.css)(\?[^"]*)?"/g),
  ];
  for (const m of refs) {
    if (/^https?:/.test(m[1])) continue;   // unpkg / Google Fonts: versión en la propia URL
    scriptsLocales.add(m[1].replace(/^\.?\//, ''));
    if (!/[?&]v=/.test(m[2] || '')) sinVersion.push(`${html}  →  ${m[1]}`);
  }
}

const sinRegla = [...scriptsLocales].filter((f) => !reglasCache.includes('\n/' + f + '\n'));
if (sinRegla.length) {
  throw new Error(
    'build-prerender: estos archivos no tienen regla de caché en `_headers`:\n'
    + sinRegla.map((f) => '  /' + f).join('\n')
    + '\n\nSin ella Cloudflare Pages los sirve con max-age=14400, y un deploy tarda\n'
    + '4 h en llegar a quien ya visitó el sitio. Añade a `_headers`:\n\n'
    + sinRegla.map((f) => '/' + f + '\n  Cache-Control: public, max-age=0, must-revalidate').join('\n')
    + '\n\nOJO: la ruta va literal, sin comodines — `/*.js` NO coincide con nada.'
  );
}

if (sinVersion.length) {
  throw new Error(
    'build-prerender: estos recursos locales se cargan sin sufijo `?v=`:\n'
    + sinVersion.map((f) => '  ' + f).join('\n')
    + '\n\nSin `?v=` el deploy NO llega a quien ya tiene el archivo cacheado: su\n'
    + 'navegador reutiliza la copia vieja y mezcla el HTML nuevo con el JS/CSS\n'
    + 'anterior. Así se rompió el rediseño en móvil (ago-2026): HTML nuevo + ui.js\n'
    + 'viejo, que seguía pintando el acento #DDD5C4 — 1.27:1 sobre el lienzo crema,\n'
    + 'texto invisible. La regla de `_headers` hace revalidar, no descargar: no basta.\n\n'
    + 'Pon la fecha del deploy en el HTML, p. ej.:\n\n'
    + sinVersion.map((f) => '  ' + f.split('→')[1].trim() + '?v=AAAAMMDD').join('\n')
    + '\n\nLos data-*.js llevan su propia versión y solo cambian cuando cambian los\n'
    + 'datos; el resto del código se sube de golpe en cada rediseño.'
  );
}

// ─── 8. Resumen ─────────────────────────────────────────────────────────────
console.log(`prerender: ${paginas.length} páginas`
  + ` (${ARMAS.length} armas · ${ACCESORIOS.length} accesorios · ${MUNICIONES.length} municiones`
  + ` · ${listados.length} listados · ${FIJAS.length} fijas)`);
const conFecha = enSitemap.filter((p) => p.lastmod).length;
const distintas = new Set(enSitemap.map((p) => p.lastmod).filter(Boolean)).size;
console.log(`sitemap:   ${enSitemap.length} URLs · ${conFecha} con lastmod`
  + ` · ${distintas} fechas distintas (de los inventarios, no de git)`);

// ─── 8b. cifras.json ────────────────────────────────────────────────────────
// Las cifras del README las escribe QUIEN LAS CUENTA. `scripts/actualizar-readme.mjs`
// las pinta y no cuenta nada: así no hay una segunda aritmética que se
// desincronice en silencio, ni una CUARTA copia del truco de node:vm de §1
// (ya está en resembrar.js y auditar.js).
// No parsear el console.log de arriba: es prosa, se rompería al retocarla.
writeFileSync(join(OUT, 'cifras.json'), JSON.stringify({
  armas: ARMAS.length,
  accesorios: ACCESORIOS.length,
  municiones: MUNICIONES.length,
  paginas: paginas.length,
  urls: enSitemap.length,
  conFecha,
  inventario: masReciente(enSitemap.map((p) => p.lastmod)),
}, null, 2) + '\n', 'utf8');

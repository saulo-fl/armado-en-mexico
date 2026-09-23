// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// LA TRAMPA QUE ESTA PRUEBA VIGILA (23-sep-2026, cazada al verificar la promoción
// de develop a main):
//
// En `build-prerender.mjs`, `emitir(ruta, …)` saca DOS cosas de la misma variable:
//   const url     = `${SITIO}/${ruta}`;        // el <link rel="canonical"> y el sitemap
//   const destino = join(OUT, `${ruta}.html`); // el archivo en disco
//
// Así que tocar `ruta` para mover el ARCHIVO mueve también la URL PÚBLICA. Pasó con
// el hub de Legalidad: se cambió `'legalidad'` por `'legalidad/index'` buscando emitir
// `legalidad/index.html`, y el efecto colateral fue que el canonical, el og:url y el
// sitemap pasaron a declarar `https://armado.mx/legalidad/index` — una URL que
// Cloudflare Pages ni siquiera sirve (responde 308 a `/legalidad/`), mientras
// `/legalidad`, que es la que está indexada y a la que apuntan los 455 HTML del
// propio sitio, desaparecía del sitemap.
//
// Un canonical que apunta a una URL que redirige es un canonical roto: Google
// descarta la señal. Y no lo veía NADIE — ni el build (que emitía feliz), ni
// auditar.js (mira datos, no URLs), ni el smoke (navega con JS, donde el ruteo es
// el de app.jsx y no el del prerender).
//
// Reglas que se comprueban aquí, sobre el sitemap y el HTML YA GENERADOS en out/:
//   1. Ninguna URL pública termina en `/index`.
//   2. El canonical de cada página coincide con la URL por la que se la sirve.
//   3. Las rutas del sitemap son exactamente las que el sitio se enlaza a sí mismo.
//
// Requiere `npm run build` antes. Si `out/` no existe, la prueba lo dice y se salta,
// para no fallar en un checkout limpio.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../out', import.meta.url));
const SITIO = 'https://armado.mx';
const hayBuild = existsSync(join(OUT, 'sitemap.xml'));

function htmls(dir, acc = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) htmls(p, acc);
    else if (e.endsWith('.html')) acc.push(p);
  }
  return acc;
}

const sitemap = hayBuild ? readFileSync(join(OUT, 'sitemap.xml'), 'utf8') : '';
const urlsSitemap = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

test('hay un build en out/ que auditar', () => {
  assert.ok(hayBuild, 'no existe out/sitemap.xml — corre `npm run build` antes');
});

test('ninguna URL del sitemap termina en /index', { skip: !hayBuild }, () => {
  const malas = urlsSitemap.filter((u) => /\/index$/.test(u));
  assert.deepEqual(malas, [],
    'Una URL acabada en /index sale de haber usado `ruta` para mover el archivo ' +
    'en disco: `emitir()` construye el canonical con esa misma variable. ' +
    'Pages sirve ese path como 308 a la carpeta, así que el canonical apunta a ' +
    'una redirección y Google descarta la señal.');
});

test('ninguna URL del sitemap acaba en .html', { skip: !hayBuild }, () => {
  const malas = urlsSitemap.filter((u) => u.endsWith('.html'));
  assert.deepEqual(malas, [], 'Pages redirige .html a la URL sin extensión: el sitemap debe llevar ya la definitiva');
});

test('el canonical de cada página es la URL por la que se sirve', { skip: !hayBuild }, () => {
  const fallos = [];
  for (const archivo of htmls(OUT)) {
    const rel = relative(OUT, archivo).replace(/\\/g, '/');
    // Pages sirve `x.html` como `/x`, e `x/index.html` como `/x/`.
    const esperada = rel === 'index.html' ? `${SITIO}/`
      : rel.endsWith('/index.html') ? `${SITIO}/${rel.slice(0, -'/index.html'.length)}/`
      : `${SITIO}/${rel.slice(0, -'.html'.length)}`;
    const html = readFileSync(archivo, 'utf8');
    const m = html.match(/<link rel="canonical" href="([^"]+)">/);
    if (!m) continue;                                   // 404.html y compañía no llevan
    if (/name="robots" content="noindex/.test(html)) continue;  // el comparador, a propósito
    if (m[1] !== esperada) fallos.push(`${rel}: canonical ${m[1]} · se sirve en ${esperada}`);
  }
  assert.deepEqual(fallos, [], 'canonical que no coincide con la URL servida:\n' + fallos.join('\n'));
});

test('el hub de Legalidad vive en /legalidad, como el resto del sitio lo enlaza', { skip: !hayBuild }, () => {
  assert.ok(urlsSitemap.includes(`${SITIO}/legalidad`),
    '/legalidad está indexada y es la URL a la que apuntan los enlaces internos y el pie de todas las páginas');
  assert.ok(!urlsSitemap.includes(`${SITIO}/legalidad/index`), '/legalidad/index no es una URL servible');

  const html = readFileSync(join(OUT, 'legalidad.html'), 'utf8');
  assert.match(html, /<link rel="canonical" href="https:\/\/armado\.mx\/legalidad">/);
  assert.match(html, /<meta property="og:url" content="https:\/\/armado\.mx\/legalidad">/);
});

test('toda ruta interna enlazada existe en el build o tiene su 301', { skip: !hayBuild }, () => {
  const redirects = existsSync(join(OUT, '_redirects'))
    ? readFileSync(join(OUT, '_redirects'), 'utf8')
        .split('\n').filter((l) => l.trim() && !l.trim().startsWith('#'))
        .map((l) => l.trim().split(/\s+/)[0])
    : [];
  const servible = (ruta) =>
    existsSync(join(OUT, `${ruta}.html`)) || existsSync(join(OUT, ruta, 'index.html')) ||
    existsSync(join(OUT, ruta)) || redirects.includes(`/${ruta}`);

  const rotos = new Set();
  for (const archivo of htmls(OUT)) {
    const html = readFileSync(archivo, 'utf8');
    for (const m of html.matchAll(/href="\/([a-z0-9][a-z0-9/_.-]*)"/g)) {
      const ruta = m[1].replace(/\/$/, '');
      if (!ruta || ruta.startsWith('api/')) continue;
      if (!servible(ruta)) rotos.add(`/${ruta}  (enlazado en ${relative(OUT, archivo)})`);
    }
  }
  assert.deepEqual([...rotos], [], 'enlaces internos que no resuelven a nada:\n' + [...rotos].join('\n'));
});

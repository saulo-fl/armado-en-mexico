// Copia a out/ todo lo que se sirve tal cual, sin pasar por Babel ni por el
// prerender: los estáticos de public/ y las fuentes que el navegador consume sin
// compilar (los data-*.js cuelgan sus catálogos de window, store.js y
// dev-viewport.js son JS plano, estilo.css es CSS plano).
//
// Va en Node y no en `cp -r` porque este mismo script corre en el Windows de
// desarrollo y en el Linux del build de Cloudflare Pages.
//
// La salida se vacía en cada build: si un archivo se renombra o se borra, su
// copia vieja no debe sobrevivir en out/ y acabar publicada. Por eso este paso va
// PRIMERO en `npm run build`, antes de que Babel y el prerender escriban ahí.

import { cpSync, rmSync, mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = process.cwd();
const OUT = join(RAIZ, 'out');

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// 1. public/ entero → out/ (imagenes/, inventarios/, _headers, logo.png, manifest)
cpSync(join(RAIZ, 'public'), OUT, { recursive: true });

// 2. Fuentes que el navegador carga sin compilar. Se APLANAN a la raíz de out/ a
//    propósito: así las rutas servidas no cambian y no hay que tocar ni los
//    <script src> de las páginas ni las 20 reglas literales de _headers.
const planos = [
  ...readdirSync(join(RAIZ, 'src', 'data')).map((f) => ['src/data', f]),
  ...readdirSync(join(RAIZ, 'src', 'lib')).map((f) => ['src/lib', f]),
  ['src/styles', 'estilo.css'],
  // index.html no va aquí: lo genera el prerender a partir de src/pages/index.html.
  // admin.html y 404.html sí, que se sirven tal cual.
  ['src/pages', 'admin.html'],
  ['src/pages', '404.html'],
];
for (const [dir, f] of planos) copyFileSync(join(RAIZ, dir, f), join(OUT, f));

console.log(`estaticos: public/ + ${planos.length} archivos sueltos → out/`);

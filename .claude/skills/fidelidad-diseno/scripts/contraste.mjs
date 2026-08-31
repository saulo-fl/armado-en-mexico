#!/usr/bin/env node
// Contraste WCAG para "Armado en México".
//
//   node contraste.mjs                 → audita la PALETTE de ui.jsx contra los fondos
//   node contraste.mjs #FFF #1A1A1A    → un par suelto
//
// Umbrales WCAG 2.1: 4.5:1 texto normal · 3:1 texto grande y gráficos · 1.5:1 nada.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const lum = (hex) => {
  const h = hex.replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const [r, g, b] = full.match(/../g).map((x) => {
    const v = parseInt(x, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const veredicto = (r) =>
  r >= 4.5 ? ['AA texto', 'ok'] :
  r >= 3   ? ['solo gráfico/grande', 'warn'] :
  r >= 1.5 ? ['DÉBIL', 'bad'] : ['INVISIBLE', 'bad'];

const COLOR = { ok: '\x1b[32m', warn: '\x1b[33m', bad: '\x1b[31m', off: '\x1b[0m' };

function linea(nombre, fg, bg) {
  const r = ratio(fg, bg);
  const [texto, nivel] = veredicto(r);
  const n = COLOR[nivel];
  console.log(
    `${nombre.padEnd(42)} ${r.toFixed(2).padStart(6)}:1  ${n}${texto}${COLOR.off}`
  );
  return nivel === 'bad';
}

const args = process.argv.slice(2);

if (args.length === 2) {
  process.exit(linea(`${args[0]} sobre ${args[1]}`, args[0], args[1]) ? 1 : 0);
}

// Sin argumentos: auditar la PALETTE viva de ui.jsx.
const aqui = dirname(fileURLToPath(import.meta.url));
const uiPath = resolve(aqui, '../../../../ui.jsx');
const src = readFileSync(uiPath, 'utf8');
const bloque = src.match(/const PALETTE = \{([\s\S]*?)\n\};/);
if (!bloque) {
  console.error(`No encontré PALETTE en ${uiPath}`);
  process.exit(2);
}

const P = Object.fromEntries(
  [...bloque[1].matchAll(/(\w+)\s*:\s*'(#[0-9A-Fa-f]{3,6})'/g)].map((m) => [m[1], m[2]])
);

console.log(`\nPALETTE de ui.jsx — ${Object.keys(P).length} colores\n`);

let fallos = 0;

console.log('SUPERFICIES (¿se distingue una capa de la otra?)');
for (const [a, b] of [['bgCard', 'bg'], ['border', 'bgCard'], ['border', 'bg'], ['borderHi', 'bgCard']]) {
  if (P[a] && P[b]) fallos += linea(`  ${a} ${P[a]} / ${b} ${P[b]}`, P[a], P[b]);
}

console.log('\nTEXTO Y ACENTOS sobre el fondo');
for (const k of ['text', 'textDim', 'textMuted', 'amber', 'amberDim', 'green', 'red', 'redHi', 'blue', 'military']) {
  if (P[k]) fallos += linea(`  ${k} ${P[k]}`, P[k], P.bg);
}

console.log('\nTEXTO sobre tarjeta');
for (const k of ['text', 'textDim', 'textMuted', 'amber']) {
  if (P[k]) fallos += linea(`  ${k} ${P[k]}`, P[k], P.bgCard);
}

console.log(
  fallos
    ? `\n${COLOR.bad}${fallos} par(es) por debajo de 3:1 — invisibles o demasiado débiles.${COLOR.off}\n`
    : `\n${COLOR.ok}Ningún par cae por debajo de 3:1.${COLOR.off}\n`
);
process.exit(fallos ? 1 : 0);

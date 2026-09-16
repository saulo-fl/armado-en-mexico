#!/usr/bin/env node
// Armado en México — Copyright (C) 2026 Saulo Flores Leon
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// Contraste WCAG para "Armado en México".
//
//   node contraste.mjs                 → audita LOS DOS TEMAS del sitio
//   node contraste.mjs #FFF #1A1A1A    → un par suelto
//
// Umbrales WCAG 2.1: 4.5:1 texto normal · 3:1 texto grande y gráficos · 1.5:1 nada.
//
// ── POR QUÉ YA NO LEE ui.jsx ────────────────────────────────────────────────
// Hasta el modo oscuro, `PALETTE` de ui.jsx guardaba hex y este script los
// sacaba con una regex. Desde que guarda `var(--token)` —que es lo que hace que
// los ~1355 usos inline hereden el tema sin reescribirlos— ahí ya no hay ningún
// hex que medir: la regex casaba cero y la auditoría se quedaba MUDA, que es
// peor que fallar. Los valores reales viven ahora en el bloque `:root` de
// `estilo.css`, declarados por pares:
//
//     --lienzo: #E7EAE4;   --d-lienzo: #0E1211;
//     └ tema CLARO         └ tema OSCURO
//
// Así que este script lee ESE bloque, arma las dos paletas —la oscura es la
// clara con los `--d-` encima— y mide la misma lista de pares en cada una,
// informando de los dos por separado. Sale con código ≠0 si algún par de
// CUALQUIERA de los dos temas cae por debajo del umbral.

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

const veredicto = (r, min) =>
  r >= 4.5 ? ['AA texto', 'ok'] :
  r >= 3   ? ['solo gráfico/grande', min <= 3 ? 'ok' : 'warn'] :
  r >= 1.5 ? ['DÉBIL', 'bad'] : ['INVISIBLE', 'bad'];

const COLOR = { ok: '\x1b[32m', warn: '\x1b[33m', bad: '\x1b[31m', dim: '\x1b[2m', off: '\x1b[0m' };

// ── Modo «un par suelto»: la interfaz de dos argumentos, intacta ────────────
const args = process.argv.slice(2);
if (args.length === 2) {
  const r = ratio(args[0], args[1]);
  const [texto, nivel] = veredicto(r, 4.5);
  console.log(`${`${args[0]} sobre ${args[1]}`.padEnd(42)} ${r.toFixed(2).padStart(6)}:1  `
    + `${COLOR[nivel]}${texto}${COLOR.off}`);
  process.exit(nivel === 'bad' ? 1 : 0);
}

// ── Las dos paletas, leídas de estilo.css ───────────────────────────────────
const aqui = dirname(fileURLToPath(import.meta.url));
const cssPath = resolve(aqui, '../../../../src/styles/estilo.css');
const css = readFileSync(cssPath, 'utf8');

// El primer `:root { … }` del archivo es el bloque de tokens. Se corta en el
// primer `}` porque dentro no hay bloques anidados (a propósito: si un día los
// hubiera, esto lo cortaría de más y el recuento de tokens lo delataría).
const bloque = css.match(/:root\s*\{([\s\S]*?)\n\}/);
if (!bloque) {
  console.error(`No encontré el bloque :root de tokens en ${cssPath}`);
  process.exit(2);
}

// Se resuelven las cadenas `--a: var(--b)` para que `--tinta: var(--negro)`
// dé un hex y no una cadena. Dos pasadas bastan para la profundidad que hay;
// lo que quede sin resolver se queda fuera y salta en la comprobación final.
function paleta(prefijo) {
  const crudo = {};
  for (const m of bloque[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    crudo[m[1].trim()] = m[2].trim();
  }
  const salida = {};
  const resolver = (v, saltos = 0) => {
    if (/^#[0-9A-Fa-f]{3,8}$/.test(v)) return v;
    const ref = v.match(/^var\((--[\w-]+)\)$/);
    if (ref && saltos < 4) return resolver(crudo[ref[1]] || '', saltos + 1);
    return null;
  };
  for (const [k, v] of Object.entries(crudo)) {
    if (k.startsWith('--d-')) continue;      // la variante oscura se aplica aparte
    const hex = resolver(v);
    if (hex) salida[k] = hex;
  }
  if (prefijo === 'oscuro') {
    for (const [k, v] of Object.entries(crudo)) {
      if (!k.startsWith('--d-')) continue;
      const hex = resolver(v);
      if (hex) salida['--' + k.slice(4)] = hex;
    }
  }
  return salida;
}

const TEMAS = { claro: paleta('claro'), oscuro: paleta('oscuro') };

// ── Los pares que se auditan ────────────────────────────────────────────────
// [rótulo, token de tinta, token de fondo, umbral]. El umbral es 4.5 para lo
// que porta texto y 3 para lo que es solo gráfico o borde de estado (WCAG
// 1.4.11). Las SUPERFICIES no tienen umbral WCAG —dos fondos no son texto—:
// se listan para vigilar que la jerarquía de capas exista, y su umbral de
// fallo es el de «invisible».
const TEXTO = [
  ['tinta sobre el lienzo',            '--tinta', '--lienzo', 4.5],
  ['tinta sobre el papel',             '--tinta', '--papel', 4.5],
  ['tinta-dim sobre el lienzo',        '--tinta-dim', '--lienzo', 4.5],
  ['tinta-dim sobre el papel',         '--tinta-dim', '--papel', 4.5],
  ['tinta-2 sobre el lienzo',          '--tinta-2', '--lienzo', 4.5],
  ['tinta-2 sobre el papel',           '--tinta-2', '--papel', 4.5],
  ['tinta-2 sobre la fila alterna',    '--tinta-2', '--beige', 4.5],
  ['acento sobre el lienzo',           '--acento', '--lienzo', 4.5],
  ['acento sobre el papel',            '--acento', '--papel', 4.5],
  ['tinta SOBRE un relleno de acento', '--tinta-sobre-marca', '--acento', 4.5],
  ['ok (uso civil) sobre el papel',    '--ok', '--papel', 4.5],
  ['seguridad sobre el papel',         '--seguridad', '--papel', 4.5],
  ['alerta (ejército) sobre el papel', '--alerta', '--papel', 4.5],
  ['azul sobre el papel',              '--azul', '--papel', 4.5],
  ['rojo-txt / anillo de foco',        '--rojo-txt', '--lienzo', 3],
  ['rojo-txt sobre el papel',          '--rojo-txt', '--papel', 3],
  ['blanco sobre el rojo de relleno',  '--blanco', '--rojo', 4.5],
  ['placeholder sobre el papel',       '--placeholder', '--papel', 4.5],
  ['gris-2 (gráfico) sobre el papel',  '--gris-2', '--papel', 3],
];

const MARCA = [
  ['sobre-marca sobre la marca',       '--sobre-marca', '--marca', 4.5],
  ['sobre-marca-dim sobre la marca',   '--sobre-marca-dim', '--marca', 4.5],
  ['sobre-marca-muted sobre la marca', '--sobre-marca-muted', '--marca', 4.5],
  ['rojo-sobre-marca sobre la marca',  '--rojo-sobre-marca', '--marca', 4.5],
  ['sobre-marca sobre marca-alt',      '--sobre-marca', '--marca-alt', 4.5],
];

// La placa fotográfica es clara en los DOS temas (ver estilo.css): lo que cae
// encima se mide contra ella, no contra el papel.
const PLACA = [
  ['tinta-placa sobre la placa',       '--tinta-placa', '--papel-hi', 4.5],
  ['silueta (gráfico) sobre la placa', '--silueta', '--papel-hi', 3],
];

// La papelería de la ficha de arma (13-sep-2026). Son objetos y no siguen al
// tema… salvo el manila, que en oscuro baja a penumbra: por eso sus pares SÍ
// cambian entre temas y el resto da lo mismo en los dos.
const PAPELERIA = [
  ['tinta sobre el manila',            '--manila-tinta', '--manila-medido', 4.5],
  ['tinta-2 sobre el manila',          '--manila-tinta-2', '--manila-medido', 4.5],
  ['tinta sobre el talón',             '--talon-tinta', '--talon', 4.5],
  ['tinta-2 sobre el talón',           '--talon-tinta-2', '--talon', 4.5],
  ['rojo impreso sobre el talón',      '--talon-rojo', '--talon', 4.5],
  ['tinta-2 de ficha sobre el fichero','--ficha-tinta-2', '--fichero', 4.5],
  ['tinta-2 de ficha sobre el rayado', '--ficha-tinta-2', '--fichero-azul', 4.5],
  ['impreso sobre el kárdex',          '--kardex-imp', '--kardex', 4.5],
  ['tinta-2 sobre el kárdex',          '--kardex-tinta-2', '--kardex', 4.5],
  ['sello restr. sobre el kárdex',     '--sello-restr', '--kardex', 4.5],
  ['tinta-2 sobre el milimétrico',     '--milimetrico-tinta-2', '--milimetrico', 4.5],
  ['sello civil sobre el milimétrico', '--sello-civil', '--milimetrico', 4.5],
  ['sello restr. sobre el milimétrico','--sello-restr', '--milimetrico', 4.5],
  ['tinta-2 sobre el oficio',          '--oficio-tinta-2', '--oficio', 4.5],
  ['tinta-2 sobre el separador',       '--oficio-tinta-2', '--oficio-2', 4.5],
  ['oficio sobre la banda civil',      '--oficio', '--sello-civil', 4.5],
  ['oficio sobre la banda restr.',     '--oficio', '--sello-restr', 4.5],
  ['sello azul sobre el oficio',       '--sello-azul', '--oficio', 4.5],
  ['sello azul sobre la placa',        '--sello-azul', '--copia-placa', 4.5],
  ['tinta-2 sobre la etiqueta',        '--etiqueta-tinta-2', '--etiqueta', 4.5],
  ['sello restr. sobre la etiqueta',   '--sello-restr', '--etiqueta', 4.5],
  ['sello civil sobre la etiqueta',    '--sello-civil', '--etiqueta', 4.5],
  ['tinta sobre la placa de latón',    '--manila-tinta', '--laton', 4.5],
  ['letra sobre la cinta Dymo',        '--dymo-letra', '--dymo', 4.5],
  ['rotulador (trazo) sobre el fichero','--rotulador', '--fichero', 3],
  ['cifras de la tira sobre el oficio', '--sello-restr', '--oficio', 4.5],
  ['tinta-2 de ficha sobre el oficio',  '--ficha-tinta-2', '--oficio', 4.5],
  ['rótulo del toldo sobre la lona',    '--lona-crema', '--lona-verde', 4.5],
];

// Las superficies NO se miden con el umbral de WCAG —dos fondos no son texto—
// y su mínimo DEPENDE DEL TEMA, que es la asimetría de fondo de todo esto:
//
//   CLARO: entre dos claros el máximo alcanzable es ~1.2:1. Ahí la capa la
//     separa la SOMBRA, así que al par papel/lienzo no se le puede exigir un
//     salto de color: solo que no sean el mismo color.
//   OSCURO: la sombra no separa nada sobre un fondo oscuro. Ahí el salto de
//     superficie es OBLIGATORIO, y por eso se le exige 1.40:1, más el hairline.
//
// Si alguien aplana el tema oscuro copiando los valores del claro, esta tabla
// es lo que lo suspende.
const SUPERFICIES = [
  ['papel sobre el lienzo',            '--papel', '--lienzo', { claro: 1.05, oscuro: 1.40 }],
  ['fila alterna sobre el papel',      '--beige', '--papel', { claro: 1.05, oscuro: 1.10 }],
  ['hairline sobre el papel',          '--hair', '--papel', { claro: 1.5, oscuro: 1.5 }],
  ['hairline sobre el lienzo',         '--hair', '--lienzo', { claro: 1.5, oscuro: 1.5 }],
  ['hairline de ESTADO sobre el papel','--hair-hi', '--papel', { claro: 3, oscuro: 3 }],
  ['marca sobre el lienzo',            '--marca', '--lienzo', { claro: 1.05, oscuro: 1.30 }],
];

function auditar(nombre, P) {
  let fallos = 0;
  const grupo = (titulo, pares, superficie = false) => {
    console.log(`\n  ${titulo}`);
    for (const [rotulo, fg, bg, umbral] of pares) {
      const min = typeof umbral === 'object' ? umbral[nombre] : umbral;
      if (!P[fg] || !P[bg]) {
        console.log(`    ${rotulo.padEnd(38)} ${COLOR.bad}token sin valor (${!P[fg] ? fg : bg})${COLOR.off}`);
        fallos++;
        continue;
      }
      const r = ratio(P[fg], P[bg]);
      const mal = r < min;
      // Las superficies se juzgan contra SU mínimo, no con el vocabulario de
      // WCAG: un hairline a 1.81:1 no es «DÉBIL», es justo lo que debe ser.
      const [texto, nivel] = superficie
        ? (mal ? ['SIN SALTO SUFICIENTE', 'bad'] : ['separa', 'ok'])
        : veredicto(r, min);
      const c = mal ? COLOR.bad : COLOR[nivel];
      console.log(`    ${rotulo.padEnd(38)} ${r.toFixed(2).padStart(6)}:1  ${c}${texto}${COLOR.off}`
        + `  ${COLOR.dim}${P[fg]} / ${P[bg]} · mín ${min}${COLOR.off}`);
      if (mal) fallos++;
    }
  };
  console.log(`\n══ TEMA ${nombre.toUpperCase()} ${'═'.repeat(Math.max(0, 52 - nombre.length))}`);
  grupo('SUPERFICIES (¿se distingue una capa de la otra?)', SUPERFICIES, true);
  grupo('TEXTO Y ESTADO sobre las superficies de contenido', TEXTO);
  grupo('SOBRE LAS SUPERFICIES DE MARCA', MARCA);
  grupo('SOBRE LA PLACA FOTOGRÁFICA (clara en los dos temas)', PLACA);
  grupo('LA PAPELERÍA DE LA FICHA DE ARMA (el manila baja a penumbra en oscuro)', PAPELERIA);
  return fallos;
}

console.log(`\nTokens de estilo.css — claro: ${Object.keys(TEMAS.claro).length} · `
  + `oscuro: ${Object.keys(TEMAS.oscuro).length}`);

let total = 0;
for (const [nombre, P] of Object.entries(TEMAS)) total += auditar(nombre, P);

console.log(
  total
    ? `\n${COLOR.bad}${total} par(es) por debajo de su umbral, sumando los dos temas.${COLOR.off}\n`
    : `\n${COLOR.ok}Los dos temas pasan: ningún par por debajo de su umbral.${COLOR.off}\n`
);
process.exit(total ? 1 : 0);

// Armado en México — los tokens de diseño, del CSS a Penpot en UN sentido.
//
// Lee el bloque `:root` de src/styles/estilo.css (la fuente de verdad: ahí
// viven los valores Y la bitácora de por qué son así) y escribe
// docs/penpot/tokens.json en el formato W3C DTCG que Penpot importa (panel
// Tokens → Import, o el lote de MCP descrito en docs/PENPOT.md).
//
// Nunca al revés: regenerar el :root desde un JSON borraría los comentarios
// con los ratios medidos y las decisiones fechadas. Si un token cambia en
// Penpot, se cambia en estilo.css y se vuelve a correr esto:
//
//   npm run tokens
//
// `scripts/tokens.test.mjs` falla si el JSON y el CSS se han separado.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CSS = new URL('../src/styles/estilo.css', import.meta.url);
const JSON_OUT = new URL('../docs/penpot/tokens.json', import.meta.url);

// ── 1. El :root, sin comentarios ─────────────────────────────────────────
// Mismo corte que contraste.mjs (el primer `:root { … }`), pero quitando los
// comentarios antes de leer pares: dentro de ellos hay ejemplos como
// `--carton: #F3E5C5` que NO son tokens.
function pares(css) {
  const bloque = css.match(/:root\s*\{([\s\S]*?)\n\}/);
  if (!bloque) throw new Error('No encontré el bloque :root de tokens en estilo.css');
  const limpio = bloque[1].replace(/\/\*[\s\S]*?\*\//g, '');
  const crudo = {};
  for (const m of limpio.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) crudo[m[1]] = m[2].trim();
  return crudo;
}

// ── 2. Qué es cada token y cómo se llama en Penpot ───────────────────────
// Los nombres son los del CSS con un prefijo de tipo: `--tinta-2` ⇄
// `color.tinta-2`. Sin tabla de traducción: la ida y vuelta es literal.
const SALTAR = (k, v) => k.startsWith('--sombra') || /url\(|gradient\(/.test(v);
function clasificar(k, v) {
  if (/^--e\d$/.test(k)) return ['spacing', 'espacio.' + k.slice(2), v.replace('px', '')];
  if (k === '--radio') return ['borderRadius', 'radio.base', v.replace('px', '')];
  if (k === '--radio-sm') return ['borderRadius', 'radio.sm', v.replace('px', '')];
  if (k === '--sans' || k === '--mono') return ['fontFamilies', 'tipo.familia.' + k.slice(2), v.match(/'([^']+)'/)[1]];
  if (k === '--manila-luz') return ['opacity', 'opacidad.manila-luz', String(Number(v))];
  return ['color', 'color.' + k.slice(2), color(v)];
}
function color(v) {
  const ref = v.match(/^var\(--(d-)?([\w-]+)\)$/);
  if (ref) return `{color.${ref[2]}}`;
  // Los colores con alfa se quedan como rgba(): Penpot lee un hex de 8 dígitos
  // como ARGB (#80FFFF00), al revés que CSS, y rgba() lo entienden los dos.
  const rgba = v.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)$/);
  if (rgba) return `rgba(${rgba[1]}, ${rgba[2]}, ${rgba[3]}, ${rgba[4] === undefined ? 1 : Number(rgba[4])})`;
  if (/^#[0-9a-f]{3,8}$/i.test(v)) return v.toUpperCase();
  throw new Error(`No sé convertir el color ${v}`);
}

// ── 3. Los estilos de texto ──────────────────────────────────────────────
// Los que tienen regla propia en el CSS se LEEN de ella (peso, tracking en em,
// interlineado, mayúsculas); el tamaño del titular no está en la regla (lo
// pone cada pantalla) y va fijo aquí. Penpot mide el tracking en px.
function regla(css, selector) {
  const m = css.match(new RegExp(selector.replace(/[.\-]/g, '\\$&') + '\\s*\\{([^}]*)\\}'));
  if (!m) throw new Error(`No encontré la regla ${selector}`);
  const prop = (p) => (m[1].match(new RegExp(p + ':\\s*([^;]+);')) || [])[1]?.trim();
  return { peso: prop('font-weight'), tam: prop('font-size'), lh: prop('line-height'),
    em: prop('letter-spacing'), caja: prop('text-transform') };
}
function tipografias(css) {
  const titulo = regla(css, '.amx-v2 .t-titulo');
  const dymo = regla(css, '.amx-v2 .amx-dymo');
  const chica = regla(css, '.amx-v2 .amx-dymo--chica');
  const px = (em, tam) => String(Math.round(parseFloat(em) * tam * 100) / 100);
  const estilo = (familia, peso, tam, lh, tracking, caja = 'none') => ({ $type: 'typography', $value: {
    fontFamilies: familia, fontWeights: String(peso), fontSizes: String(tam), lineHeights: String(lh),
    letterSpacing: String(tracking), textCase: caja, textDecoration: 'none' } });
  return {
    'titulo-h1': estilo('{tipo.familia.titulo}', titulo.peso, 26, titulo.lh, px(titulo.em, 26), titulo.caja),
    'titulo-h2': estilo('{tipo.familia.titulo}', titulo.peso, 20, titulo.lh, px(titulo.em, 20), titulo.caja),
    'dymo': estilo('{tipo.familia.sans}', dymo.peso, parseInt(dymo.tam), dymo.lh, px(dymo.em, parseInt(dymo.tam)), dymo.caja),
    'dymo-chica': estilo('{tipo.familia.sans}', dymo.peso, parseInt(chica.tam), dymo.lh, px(chica.em, parseInt(chica.tam)), dymo.caja),
    'etiqueta': estilo('{tipo.familia.sans}', 600, 11, 1.2, px('.12em', 11), 'uppercase'),
    'cuerpo': estilo('{tipo.familia.sans}', 400, 15, 1.5, 0),
    'cuerpo-chico': estilo('{tipo.familia.sans}', 400, 13, 1.45, 0),
    'dato': estilo('{tipo.familia.mono}', 400, 13, 1.3, 0),
    'dato-grande': estilo('{tipo.familia.mono}', 700, 18, 1.2, 0),
  };
}

// ── 4. Sets: core (sin tema) · modo/claro · modo/oscuro ──────────────────
// La regla estructural del CSS: un token SIN gemelo `--d-` es un objeto o una
// constante y va igual en los dos temas (core); con gemelo, va a los dos sets
// de modo. Nada se lista a mano.
function poner(set, nombre, tipo, valor, descripcion) {
  const partes = nombre.split('.');
  let nodo = set;
  for (const p of partes.slice(0, -1)) nodo = nodo[p] ??= {};
  nodo[partes.at(-1)] = { $type: tipo, $value: valor, ...(descripcion ? { $description: descripcion } : {}) };
}
export function generar(css) {
  const crudo = pares(css);
  const core = {}, claro = {}, oscuro = {};
  for (const [k, v] of Object.entries(crudo)) {
    if (k.startsWith('--d-') || SALTAR(k, v)) continue;
    const [tipo, nombre, valor] = clasificar(k, v);
    const gemelo = crudo['--d-' + k.slice(2)];
    if (gemelo === undefined) { poner(core, nombre, tipo, valor); continue; }
    poner(claro, nombre, tipo, valor);
    poner(oscuro, nombre, tipo, clasificar(k, gemelo)[2]);
  }
  poner(core, 'tipo.familia.titulo', 'fontFamilies', 'Archivo SemiCondensed',
    'Los titulares (.t-titulo) son Archivo a 85 % de ancho. Penpot no tiene el eje de ancho: '
    + 'se sube ArchivoSemiCondensed (87,5 %, OFL) como fuente del equipo. Ver docs/PENPOT.md.');
  for (const [n, t] of Object.entries(tipografias(css))) poner(core, 'tipo.' + n, t.$type, t.$value);
  return {
    core, 'modo/claro': claro, 'modo/oscuro': oscuro,
    $themes: [
      { name: 'Claro', group: 'Modo', description: '', selectedTokenSets: { core: 'enabled', 'modo/claro': 'enabled' } },
      { name: 'Oscuro', group: 'Modo', description: '', selectedTokenSets: { core: 'enabled', 'modo/oscuro': 'enabled' } },
    ],
    $metadata: { tokenSetOrder: ['core', 'modo/claro', 'modo/oscuro'], activeThemes: ['Modo/Claro'], activeSets: ['core', 'modo/claro'] },
  };
}

// Cuenta hojas (tokens) de un set: para el informe y para cotejar con Penpot.
export function contar(set) {
  let n = 0;
  for (const v of Object.values(set)) n += v && typeof v === 'object' && '$type' in v ? 1 : contar(v);
  return n;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const salida = generar(readFileSync(CSS, 'utf8'));
  mkdirSync(new URL('./', JSON_OUT), { recursive: true });
  writeFileSync(JSON_OUT, JSON.stringify(salida, null, 2) + '\n');
  for (const s of salida.$metadata.tokenSetOrder) console.log(`${s.padEnd(12)} ${contar(salida[s])} tokens`);
  console.log('→ docs/penpot/tokens.json');
}

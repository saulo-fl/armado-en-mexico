#!/usr/bin/env node
// Decide si lo que dejó el solucionador DCAM en un directorio es SOLO DATOS respecto a la
// base (main). No lee ningún diff de texto — eso es lo que generaba la superficie de ataque
// (cabeceras falsas, CRLF, rutas raras, recortes por línea). En vez de eso: para cada
// archivo de la lista cerrada, tokeniza base y nuevo COMPLETOS con @babel/parser y compara
// las dos secuencias de tokens con un diff de verdad (`git diff --no-index` sobre dos
// temporales que ESTE script escribe, uno-token-por-línea — de confianza porque los
// escribimos nosotros, no el parche). Cada token insertado o borrado se valida con la regla
// de clases (solo literales dentro de mk/mun/acc); el resto del archivo, igual en ambos
// lados, ni se mira.
import { readFileSync, writeFileSync, lstatSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { parse } from '@babel/parser';

const S = '.claude/skills/conciliar-inventario/scripts/';
const CATS = ['armas', 'cartuchos', 'accesorios'];
const JS = new Set(['src/data/data.js', 'src/data/data-precios.js', 'src/data/data-municiones.js', 'src/data/data-accesorios.js']);
const LIGAS = new Set(CATS.map((c) => `${S}ligas-${c}.json`));
const REFS = new Set(CATS.map((c) => `${S}referencia-${c}.json`));
const MAPEOS = new Set(CATS.map((c) => `mapeo-${c}.json`));
export const PERMITIDOS = new Set([...JS, ...LIGAS, ...REFS, ...MAPEOS]);
// mk/mun/acc: constructores de ficha de los 4 archivos de datos. El resto son los helpers
// locales que data-municiones.js define y usa en MUNICIONES_PRICE_HISTORY para no repetir
// fecha/manualId en cada renglón (p. ej. `_mh18s(8.96, 966)`); decenas de renglones los
// llaman con los MISMOS literales que un renglón de otro ficha distinto, y el diff de
// tokens (Myers, vía `git diff`) puede emparejar por error una ocurrencia sin tocar de un
// lado con otra sin tocar del otro cuando hay tanta repetición exacta — hallazgo real del
// parche del 07-oct-2026 (#364). Permitirlos como llamada (con argumentos literales, igual
// que mk/mun/acc) es seguro: son funciones fijas ya auditadas, no redefinibles por un
// parche de datos (redefinir `function _mh18(...)` seguiría cayendo en "token no
// permitido"/"identificador no permitido" al no ser un argumento literal dentro de una
// llamada permitida).
const LLAMADAS = new Set(['mk', 'mun', 'acc', '_mh', '_mh14', '_mh15', '_mh18', '_mh18s', '_mh22', '_mh25', '_mhj', '_mhl', '_mhs']);
const PUNTOS = new Set(['{', '}', '[', ']', ',', ':', '...', '(', ')', ';']);
export const MAX_BYTES = 5 * 1024 * 1024;

const tipo = (t) => (typeof t.type === 'string' ? t.type : t.type.label);

// Un token por línea: "<tipo>\t<JSON.stringify(texto crudo)>". JSON.stringify escapa
// cualquier salto de línea real dentro del token (strings con continuación de línea), así
// que la invariante "una línea = un token" se cumple pase lo que pase en el contenido.
function serializarTokens(src, toks) {
  if (!toks.length) return ''; // archivo vacío de tokens -> 0 líneas, nunca una línea en blanco
  return toks.map((t) => `${tipo(t)}\t${JSON.stringify(src.slice(t.start, t.end))}`).join('\n') + '\n';
}

// Diferencia real entre dos secuencias de tokens, vía `git diff --no-index` sobre los dos
// temporales serializados arriba. Los hunks (-U0: sin contexto) se leen por los CONTADORES
// de la cabecera `@@ -a,b +c,d @@`, nunca interpretando el prefijo +/- de cada línea del
// cuerpo (ese prefijo es justo lo que un parche podía falsificar en el diseño anterior; aquí
// el contenido lo generamos nosotros, pero mantenemos la misma disciplina). Si `git diff`
// falla por algo que no sea "hay diferencias" (status 1), es un error real: no se trata como
// "sin diferencias" (fail-closed).
function diferenciaDeTokens(toksBase, toksNuevo, src1, src2) {
  const dir = mkdtempSync(join(tmpdir(), 'dcam-validar-'));
  const pBase = join(dir, 'base.tok'), pNuevo = join(dir, 'nuevo.tok');
  try {
    writeFileSync(pBase, serializarTokens(src1, toksBase));
    writeFileSync(pNuevo, serializarTokens(src2, toksNuevo));
    let salida;
    try {
      execFileSync('git', ['-c', 'core.autocrlf=false', '-c', 'core.safecrlf=false', 'diff', '--no-index', '-U0', '--no-color', '--no-ext-diff', pBase, pNuevo], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      salida = ''; // idénticos, sin excepción
    } catch (e) {
      if (e.status !== 1) throw new Error(`git diff --no-index falló (status ${e.status}): ${e.stderr || e.message}`);
      salida = e.stdout || '';
    }
    const añadidos = [], borrados = [];
    const lineas = salida.split('\n');
    for (let i = 0; i < lineas.length; i++) {
      const m = lineas[i].match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      if (!m) continue;
      const a = +m[1], b = m[2] == null ? 1 : +m[2], c = +m[3], d = m[4] == null ? 1 : +m[4];
      for (let k = 0; k < b; k++) borrados.push(a - 1 + k);
      for (let k = 0; k < d; k++) añadidos.push(c - 1 + k);
      i += b + d; // el cuerpo del hunk, sin interpretar sus líneas
    }
    return { añadidos, borrados };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function revisarToken(src, toks, i, ruta) {
  const t = toks[i];
  const k = tipo(t), sig = toks[i + 1] && tipo(toks[i + 1]), crudo = src.slice(t.start, t.end);
  if (k === 'string') {
    // Backslash/backtick/<>/controles: igual que antes. Se suma "//", "/*", "*/": un texto
    // divulgativo (ficha, descripción) no los necesita, y sin esto una cadena puede dejar
    // plantado un fragmento inerte que una sola comilla insertada en UN PARCHE POSTERIOR
    // convierte en código real (V2/V2a: el string ya no es sospechoso por sí solo bajo la
    // regla vieja, pero sí lo es si contiene marcadores de comentario de JS).
    if (/[\\`<>]/.test(crudo) || /[\u0000-\u001f]/.test(crudo) || crudo.includes('//') || crudo.includes('/*') || crudo.includes('*/')) {
      return [`${ruta}:${t.loc.start.line}: string con escape, <>, o marcador de comentario (${crudo.slice(0, 40)})`];
    }
    return [];
  }
  if (k === 'num' || k === 'null' || k === 'true' || k === 'false' || PUNTOS.has(k)) {
    if (k === '(' && !(i > 0 && LLAMADAS.has(src.slice(toks[i - 1].start, toks[i - 1].end)))) return [`${ruta}:${t.loc.start.line}: paréntesis fuera de ${[...LLAMADAS].join('/')}`];
    return [];
  }
  if (k === 'name') {
    if (!(LLAMADAS.has(crudo) && sig === '(') && sig !== ':') return [`${ruta}:${t.loc.start.line}: identificador no permitido «${crudo}»`];
    return [];
  }
  return [`${ruta}:${t.loc.start.line}: token no permitido «${crudo.slice(0, 20)}»`];
}

function compararJS(ruta, base, nuevo) {
  let astBase, astNuevo;
  try { astBase = parse(base, { sourceType: 'script', tokens: true }); } catch (e) { return [`${ruta}: la base no parsea (${e.message})`]; }
  try { astNuevo = parse(nuevo, { sourceType: 'script', tokens: true }); } catch (e) { return [`${ruta}: el nuevo no parsea (${e.message})`]; }

  const comentarios = (ast) => (ast.comments || []).map((c) => `${c.type}\u0000${c.value}`);
  const cB = comentarios(astBase), cN = comentarios(astNuevo);
  if (cB.length !== cN.length || cB.some((c, i) => c !== cN[i])) {
    return [`${ruta}: los comentarios cambiaron (añadidos, borrados o editados) — no se tocan`];
  }

  const toksBase = astBase.tokens.filter((t) => t.loc && tipo(t) !== 'eof');
  const toksNuevo = astNuevo.tokens.filter((t) => t.loc && tipo(t) !== 'eof');
  const { añadidos, borrados } = diferenciaDeTokens(toksBase, toksNuevo, base, nuevo);

  const malos = [];
  for (const i of añadidos) malos.push(...revisarToken(nuevo, toksNuevo, i, ruta));
  for (const i of borrados) malos.push(...revisarToken(base, toksBase, i, ruta + ' (borrado)'));
  return malos;
}

function esEntero(v) { return v === null || Number.isInteger(v); }
function esNumero(v) { return typeof v === 'number' && Number.isFinite(v); }
function esObjetoPlano(v) { return typeof v === 'object' && v !== null && !Array.isArray(v); }

function jsonMalo(ruta, texto) {
  let j; try { j = JSON.parse(texto); } catch { return [`${ruta}: JSON inválido`]; }

  if (LIGAS.has(ruta)) {
    if (!esObjetoPlano(j)) return [`${ruta}: no es un objeto`];
    return Object.values(j).every(esEntero) ? [] : [`${ruta}: una liga no es entero ni null`];
  }

  if (REFS.has(ruta)) {
    if (!esObjetoPlano(j) || !Array.isArray(j.rows)) return [`${ruta}: no tiene la forma esperada`];
    return j.rows.every((r) => esObjetoPlano(r) && esEntero(r.fichaId ?? null)) ? [] : [`${ruta}: fichaId no entero`];
  }

  if (MAPEOS.has(ruta)) {
    if (!esObjetoPlano(j)) return [`${ruta}: no es un objeto`];
    const claves = ['existencias', 'precios', 'factores', 'sinFicha', 'sinPrecio', 'revisarPrecio', 'totalPdf', 'totalMapped', 'excluidos', 'regresos', 'regresosRechazados'];
    const extra = Object.keys(j).filter((k) => !claves.includes(k));
    if (extra.length) return [`${ruta}: claves fuera de esquema (${extra.join(', ')})`];
    const faltan = claves.filter((k) => !(k in j));
    if (faltan.length) return [`${ruta}: faltan claves (${faltan.join(', ')})`];
    if (!esObjetoPlano(j.existencias) || !Object.values(j.existencias).every(esEntero)) return [`${ruta}: existencias no es {id: entero}`];
    if (!esObjetoPlano(j.precios) || !Object.values(j.precios).every(esNumero)) return [`${ruta}: precios no es {id: número}`];
    if (!Array.isArray(j.factores) || !j.factores.every(esNumero)) return [`${ruta}: factores no es number[]`];
    if (!Number.isInteger(j.totalPdf) || !Number.isInteger(j.totalMapped)) return [`${ruta}: totalPdf/totalMapped no son enteros`];
    for (const k of ['sinFicha', 'sinPrecio', 'revisarPrecio', 'excluidos', 'regresos', 'regresosRechazados']) {
      if (!Array.isArray(j[k]) || !j[k].every(esObjetoPlano)) return [`${ruta}: ${k} no es un array de objetos`];
    }
    return [];
  }

  return [`${ruta}: no permitido`];
}

export function compararArchivo(ruta, base, nuevo) {
  if (!PERMITIDOS.has(ruta)) return [`${ruta}: archivo fuera de la lista`];
  if (base === nuevo) return [];
  if (!JS.has(ruta)) return jsonMalo(ruta, nuevo);
  return compararJS(ruta, base, nuevo);
}

// Comprobaciones que solo tienen sentido contra archivos reales en disco (la CLI las usa
// antes de leer contenido; expuestas aparte para poder probarlas con directorios de verdad).
export function verificarArchivoEnNuevo(dirNuevo, ruta) {
  const p = join(dirNuevo, ruta);
  let st;
  try { st = lstatSync(p); } catch { return [`${ruta}: no existe en el nuevo`]; }
  if (!st.isFile()) return [`${ruta}: no es un archivo regular (symlink, directorio u otra cosa)`];
  if (st.size > MAX_BYTES) return [`${ruta}: excede ${MAX_BYTES} bytes`];
  return [];
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('validar-parche.mjs')) {
  const [dirBase, dirNuevo] = process.argv.slice(2);
  if (!dirBase || !dirNuevo) { console.error('uso: validar-parche.mjs <dir-base> <dir-nuevo>'); process.exit(1); }
  const problemas = [];
  for (const ruta of [...PERMITIDOS].sort()) {
    const probsExistencia = verificarArchivoEnNuevo(dirNuevo, ruta);
    if (probsExistencia.length) { problemas.push(...probsExistencia); continue; }
    const nuevoBuf = readFileSync(join(dirNuevo, ruta));
    let baseBuf;
    try { baseBuf = readFileSync(join(dirBase, ruta)); } catch { baseBuf = Buffer.alloc(0); }
    if (baseBuf.equals(nuevoBuf)) continue;
    problemas.push(...compararArchivo(ruta, baseBuf.toString('utf8'), nuevoBuf.toString('utf8')));
  }
  if (problemas.length) { console.error(problemas.join('\n')); process.exit(1); }
  console.log('✔ solo datos');
}

#!/usr/bin/env node
// Decide si el parche del solucionador es SOLO DATOS. No ejecuta nada del parche:
// lo lee como texto. Corre con el código de main, nunca con el de la rama del agente.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from '@babel/parser';

const S = '.claude/skills/conciliar-inventario/scripts/';
const CATS = ['armas', 'cartuchos', 'accesorios'];
const JS = new Set(['src/data/data.js', 'src/data/data-precios.js', 'src/data/data-municiones.js', 'src/data/data-accesorios.js']);
const LIGAS = new Set(CATS.map((c) => `${S}ligas-${c}.json`));
const REFS = new Set(CATS.map((c) => `${S}referencia-${c}.json`));
const MAPEOS = new Set(CATS.map((c) => `mapeo-${c}.json`));
const PERMITIDOS = new Set([...JS, ...LIGAS, ...REFS, ...MAPEOS]);
const LLAMADAS = new Set(['mk', 'mun', 'acc']);
const PUNTOS = new Set(['{', '}', '[', ']', ',', ':', '...', '(', ')', ';']);
const MAPA = /^window\.AMX_ARMAS_(EXISTENCIAS|PRECIOS) = \{ (\d+: \d+(\.\d+)?)(, \d+: \d+(\.\d+)?)* \};$/;

export function leerDiff(texto) {
  const out = []; let f = null, nuevo = 0, viejo = 0;
  // Corrida de líneas '-'/'+' consecutivas, para emparejar reemplazos de línea completa
  // 1:1 (ver «rangoCambiado» más abajo: permite distinguir, dentro de un renglón de
  // historial escrito en una sola línea, lo que de verdad cambió de lo que ya estaba).
  let corridaBorr = [], corridaAñad = [];
  const cerrarCorrida = () => {
    if (f && corridaBorr.length && corridaBorr.length === corridaAñad.length) {
      for (let i = 0; i < corridaBorr.length; i++) f.reemplazos.push([corridaBorr[i], corridaAñad[i]]);
    }
    corridaBorr = []; corridaAñad = [];
  };
  for (const l of texto.split('\n')) {
    const m = l.match(/^diff --git a\/(\S+) b\/(\S+)$/);
    if (m) {
      cerrarCorrida();
      f = { ruta: m[2], añadidas: new Set(), borradas: new Set(), reemplazos: [], problema: null };
      if (m[1] !== m[2]) f.problema = 'renombrado';
      else if (!PERMITIDOS.has(m[2])) f.problema = 'archivo fuera de la lista';
      out.push(f); continue;
    }
    if (!f) continue;
    if (/^(new file|deleted file|old mode|new mode|rename |similarity|Binary files|GIT binary patch)/.test(l)) { f.problema ||= 'cambio no permitido: ' + l.split(' ').slice(0, 2).join(' '); continue; }
    const h = l.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (h) { cerrarCorrida(); viejo = +h[1]; nuevo = +h[2]; continue; }
    if (l.startsWith('+++') || l.startsWith('---')) continue;
    if (l.startsWith('+')) { f.añadidas.add(nuevo); corridaAñad.push(nuevo); nuevo++; }
    else if (l.startsWith('-')) { f.borradas.add(viejo); corridaBorr.push(viejo); viejo++; }
    else if (l.startsWith(' ')) { cerrarCorrida(); viejo++; nuevo++; }
  }
  cerrarCorrida();
  return out;
}

const tipo = (t) => (typeof t.type === 'string' ? t.type : t.type.label);

function desplazamientosDeLineas(src) {
  const d = [0];
  for (let i = 0; i < src.length; i++) if (src[i] === '\n') d.push(i + 1);
  return d;
}

function prefijoSufijoComunes(a, b) {
  const max = Math.min(a.length, b.length);
  let p = 0;
  while (p < max && a.charCodeAt(p) === b.charCodeAt(p)) p++;
  let s = 0;
  while (s < max - p && a.charCodeAt(a.length - 1 - s) === b.charCodeAt(b.length - 1 - s)) s++;
  return [p, s];
}

// Rango de caracteres de una línea que de verdad cambió. Varios archivos de datos escriben
// un renglón de historial entero en una sola línea de texto (se le va agregando al final en
// cada inventario); el diff por líneas marca ESA línea completa como nueva aunque el 95 % ya
// estuviera ahí (llamadas y strings legítimos de antes), lo que la rechazaría sin motivo. Si
// la línea tiene pareja 1:1 en el otro lado (un reemplazo de línea completa), el prefijo y el
// sufijo compartidos con la línea vieja son idénticos byte a byte — no los trajo el parche—,
// así que solo hace falta validar el tramo de en medio. Sin pareja, se valida la línea entera
// (comportamiento conservador de siempre).
// ponytail: empareja por POSICIÓN dentro de una corrida -/+ del mismo tamaño (leerDiff), no
// es un diff real por contenido. Peor caso si empareja mal: se valida de más (línea
// completa), nunca de menos — el tramo distinto entre dos textos cualesquiera siempre
// incluye lo que de verdad cambió. Si algún día hace falta exactitud total en bloques
// grandes reordenados, usar un diff de verdad (p. ej. Myers) en vez de esta heurística.
function rangoCambiado(filas, offsets, n, otraLinea) {
  const texto = filas[n - 1] ?? '';
  const inicio = offsets[n - 1] ?? 0;
  if (otraLinea == null) return [inicio, inicio + texto.length];
  const [p, s] = prefijoSufijoComunes(otraLinea, texto);
  return [inicio + p, inicio + Math.max(p, texto.length - s)];
}

function tokensMalos(src, rangos, ruta) {
  if (!rangos.length) return [];
  let ast;
  try { ast = parse(src, { sourceType: 'script', tokens: true }); } catch (e) { return [`${ruta}: no parsea (${e.message})`]; }
  const toks = ast.tokens.filter((t) => t.loc && tipo(t) !== 'eof');
  const malos = [];
  const vistos = new Set();
  toks.forEach((t, i) => {
    if (!rangos.some(([d, h]) => t.start < h && t.end > d)) return;
    if (vistos.has(t.start)) return;
    vistos.add(t.start);
    const k = tipo(t), sig = toks[i + 1] && tipo(toks[i + 1]), crudo = src.slice(t.start, t.end);
    if (k === 'string') {
      if (/[\\`<>]/.test(crudo) || /[\u0000-\u001f]/.test(crudo)) malos.push(`${ruta}:${t.loc.start.line}: string con escape o <> (${crudo.slice(0, 40)})`);
    } else if (k === 'num' || k === 'null' || k === 'true' || k === 'false' || PUNTOS.has(k)) {
      if (k === '(' && !(i > 0 && LLAMADAS.has(src.slice(toks[i - 1].start, toks[i - 1].end)))) malos.push(`${ruta}:${t.loc.start.line}: paréntesis fuera de mk/mun/acc`);
    } else if (k === 'name') {
      if (!(LLAMADAS.has(crudo) && sig === '(') && sig !== ':') malos.push(`${ruta}:${t.loc.start.line}: identificador no permitido «${crudo}»`);
    } else malos.push(`${ruta}:${t.loc.start.line}: token no permitido «${crudo.slice(0, 20)}»`);
  });
  return malos;
}

function jsonMalo(ruta, texto) {
  let j; try { j = JSON.parse(texto); } catch { return [`${ruta}: JSON inválido`]; }
  const entero = (v) => v === null || Number.isInteger(v);
  if (LIGAS.has(ruta)) return Object.values(j).every(entero) ? [] : [`${ruta}: una liga no es entero ni null`];
  if (REFS.has(ruta)) return (j.rows || []).every((r) => entero(r.fichaId ?? null)) ? [] : [`${ruta}: fichaId no entero`];
  if (MAPEOS.has(ruta)) return Object.values(j).every((sec) => typeof sec !== 'object' || sec === null || Object.values(sec).every((v) => typeof v === 'number' || Array.isArray(v) || (typeof v === 'object' && v !== null)))
    ? [] : [`${ruta}: valor no numérico`];
  return [`${ruta}: no permitido`];
}

export function validarArchivo(ruta, base, nuevo, añadidas, borradas, reemplazos = []) {
  if (!PERMITIDOS.has(ruta)) return [`${ruta}: archivo fuera de la lista`];
  if (!JS.has(ruta)) return jsonMalo(ruta, nuevo);

  const filasBase = base.split('\n'), filasNuevo = nuevo.split('\n');
  const offsetsBase = desplazamientosDeLineas(base), offsetsNuevo = desplazamientosDeLineas(nuevo);
  const viejoDeNueva = new Map(reemplazos.map(([o, n]) => [n, o]));
  const nuevaDeVieja = new Map(reemplazos.map(([o, n]) => [o, n]));

  const rangosNuevo = [];
  for (const n of añadidas) {
    const o = viejoDeNueva.get(n);
    const tienePareja = o != null && borradas.has(o);
    if (!tienePareja && MAPA.test(filasNuevo[n - 1] ?? '')) continue; // mapa regenerado, de confianza
    rangosNuevo.push(rangoCambiado(filasNuevo, offsetsNuevo, n, tienePareja ? filasBase[o - 1] : null));
  }

  const rangosBase = [];
  for (const o of borradas) {
    const n = nuevaDeVieja.get(o);
    const tienePareja = n != null && añadidas.has(n);
    if (!tienePareja && MAPA.test(filasBase[o - 1] ?? '')) continue;
    rangosBase.push(rangoCambiado(filasBase, offsetsBase, o, tienePareja ? filasNuevo[n - 1] : null));
  }

  return [...tokensMalos(nuevo, rangosNuevo, ruta), ...tokensMalos(base, rangosBase, ruta + ' (borrado)')];
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('validar-parche.mjs')) {
  const [diffRuta, dirBase, dirNuevo] = process.argv.slice(2);
  const diff = readFileSync(diffRuta, 'utf8');
  if (diff.length > 300_000) { console.error('parche demasiado grande'); process.exit(1); }
  const problemas = [];
  for (const f of leerDiff(diff)) {
    if (f.problema) { problemas.push(`${f.ruta}: ${f.problema}`); continue; }
    problemas.push(...validarArchivo(f.ruta, readFileSync(join(dirBase, f.ruta), 'utf8'), readFileSync(join(dirNuevo, f.ruta), 'utf8'), f.añadidas, f.borradas, f.reemplazos));
  }
  if (problemas.length) { console.error(problemas.join('\n')); process.exit(1); }
  console.log('✔ parche solo de datos');
}

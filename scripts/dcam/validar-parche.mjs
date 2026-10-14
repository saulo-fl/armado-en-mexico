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
import { VISITOR_KEYS } from '@babel/types';

const S = '.claude/skills/conciliar-inventario/scripts/';
const CATS = ['armas', 'cartuchos', 'accesorios'];
const JS = new Set(['src/data/data.js', 'src/data/data-precios.js', 'src/data/data-municiones.js', 'src/data/data-accesorios.js']);
const LIGAS = new Set(CATS.map((c) => `${S}ligas-${c}.json`));
const REFS = new Set(CATS.map((c) => `${S}referencia-${c}.json`));
const MAPEOS = new Set(CATS.map((c) => `mapeo-${c}.json`));
export const PERMITIDOS = new Set([...JS, ...LIGAS, ...REFS, ...MAPEOS]);
// Callees permitidos, POR ARCHIVO (ronda 2: antes era una sola lista global y `_mh*` quedaba
// "permitido" en los 4 .js aunque solo existe en data-municiones.js — minor de la revisión).
// mk/mun: constructores de ficha de data.js/data-municiones.js. `_mh*`: helpers locales que
// data-municiones.js define y usa en MUNICIONES_PRICE_HISTORY para no repetir fecha/manualId
// en cada renglón (p. ej. `_mh18s(8.96, 966)`); decenas de renglones los llaman con los
// MISMOS literales que un renglón de otra ficha distinta, y el diff de tokens (Myers, vía
// `git diff`) puede emparejar por error una ocurrencia sin tocar de un lado con otra sin
// tocar del otro cuando hay tanta repetición exacta — hallazgo real del parche del
// 07-oct-2026 (#364). Permitirlos como llamada (con argumentos literales) es seguro: son
// funciones fijas ya auditadas, no redefinibles por un parche de datos. data-accesorios.js
// escribe cada ficha como OBJETO LITERAL (no hay función `acc`) y data-precios.js solo
// reasigna los mapas `window.AMX_ARMAS_*` (object literal también): ninguno de los dos
// necesita ningún callee permitido — confirmado con `grep` contra los 4 archivos reales.
export const CALLABLES_POR_ARCHIVO = {
  'src/data/data.js': new Set(['mk']),
  'src/data/data-municiones.js': new Set(['mun', '_mh', '_mh14', '_mh15', '_mh18', '_mh18s', '_mh22', '_mh25', '_mhj', '_mhl', '_mhs']),
  // `_h` (data-accesorios.js:720) es el equivalente de `_mh*` para ACCESORIOS_PRICE_HISTORY
  // — hallazgo real al validar contra el parche del 13-oct-2026 (#369): sin él, CUALQUIER
  // ficha de accesorio con historial se vuelve "código" porque el array completo deja de
  // ser dato puro (un elemento `_h(...)` no permitido basta para contagiar al resto).
  'src/data/data-accesorios.js': new Set(['_h']),
  'src/data/data-precios.js': new Set(),
};
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

// Parsea la salida de `git diff --no-index -U0` por los CONTADORES de la cabecera
// `@@ -a,b +c,d @@`, nunca interpretando el prefijo +/- de cada línea del cuerpo (ese
// prefijo es justo lo que un parche podía falsificar en el diseño anterior; aquí el
// contenido lo generamos nosotros, pero mantenemos la misma disciplina). Función pura
// (sin tocar disco ni invocar nada) para poder probarla directo contra una salida
// fabricada — p. ej. «Binary files … differ» — sin depender de que git produzca ese caso.
export function leerHunksDeDiff(salida) {
  const añadidos = [], borrados = [];
  const lineas = salida.split('\n');
  let huboHunk = false;
  for (let i = 0; i < lineas.length; i++) {
    const m = lineas[i].match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
    if (!m) continue;
    huboHunk = true;
    const a = +m[1], b = m[2] == null ? 1 : +m[2], c = +m[3], d = m[4] == null ? 1 : +m[4];
    for (let k = 0; k < b; k++) borrados.push(a - 1 + k);
    for (let k = 0; k < d; k++) añadidos.push(c - 1 + k);
    i += b + d; // el cuerpo del hunk, sin interpretar sus líneas
  }
  return { añadidos, borrados, huboHunk };
}

// Diferencia real entre dos secuencias de tokens, vía `git diff --no-index` sobre los dos
// temporales serializados arriba, corrido en «cerrado»: cwd en el propio directorio
// temporal, sin config de sistema/usuario/atributos que pudiera reinterpretar los
// temporales (p. ej. como binarios, o con un `diff` externo) y con un buffer grande para
// que un archivo legítimo grande no truene por maxBuffer (Important/Minor de la revisión).
// Si git sale con un status que no sea 1 (diferencias), o sale 1 pero sin ningún hunk
// (p. ej. «Binary files … differ» — también tiene exit 1, pero no imprime ningún `@@`), o
// el invariante de longitudes no cuadra, es un error real: nunca se trata como "sin
// diferencias" (fail-closed).
function diferenciaDeTokens(toksBase, toksNuevo, src1, src2) {
  const dir = mkdtempSync(join(tmpdir(), 'dcam-validar-'));
  const pGitConfigVacio = join(dir, 'gitconfig-vacio');
  const pBase = join(dir, 'base.tok'), pNuevo = join(dir, 'nuevo.tok');
  try {
    writeFileSync(pGitConfigVacio, '');
    writeFileSync(pBase, serializarTokens(src1, toksBase));
    writeFileSync(pNuevo, serializarTokens(src2, toksNuevo));
    let salida, status;
    try {
      salida = execFileSync('git', ['-c', 'core.attributesFile=', 'diff', '--no-index', '--text', '-U0', '--no-color', '--no-ext-diff', 'base.tok', 'nuevo.tok'], {
        cwd: dir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        maxBuffer: 256 * 1024 * 1024,
        env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: pGitConfigVacio, HOME: dir, USERPROFILE: dir },
      });
      status = 0;
    } catch (e) {
      if (typeof e.status !== 'number') throw new Error(`git diff --no-index no se pudo ejecutar: ${e.message}`);
      salida = e.stdout || ''; status = e.status;
    }
    if (status === 0) return { añadidos: [], borrados: [] }; // idénticos
    if (status !== 1) throw new Error(`git diff --no-index falló (status ${status}): ${salida.slice(0, 500)}`);
    const { añadidos, borrados, huboHunk } = leerHunksDeDiff(salida);
    if (!huboHunk) throw new Error(`git diff --no-index dijo que hay diferencias (status 1) pero no imprimió ningún hunk: ${salida.slice(0, 500)}`);
    if (toksNuevo.length - añadidos.length !== toksBase.length - borrados.length) {
      throw new Error('git diff --no-index: el invariante de tokens sin tocar no cuadra (toksNuevo - añadidos !== toksBase - borrados)');
    }
    return { añadidos, borrados };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function contenidoStringMalo(crudo) {
  // Backslash/backtick/<>/controles, más "//", "/*", "*/": un texto divulgativo (ficha,
  // descripción) no los necesita, y sin esto una cadena puede dejar plantado un fragmento
  // inerte que una sola comilla insertada en UN PARCHE POSTERIOR convierte en código real
  // (V2/V2a: el string ya no es sospechoso por sí solo bajo la regla vieja de escapes, pero
  // sí lo es si contiene marcadores de comentario de JS).
  // Excepción: una comilla escapada (\" o \') SÍ es dato legítimo — calibres como 0.38"
  // la necesitan (hallazgo real del 07-oct-2026) — así que se descarta ANTES de buscar
  // backslashes peligrosos; cualquier OTRO backslash (\u, \x, \n, \\, …) sigue prohibido.
  const sinComillasEscapadas = crudo.replace(/\\(['"])/g, '$1');
  return /\\/.test(sinComillasEscapadas) || /[`<>]/.test(crudo) || /[\u0000-\u001f]/.test(crudo) || crudo.includes('//') || crudo.includes('/*') || crudo.includes('*/');
}

function revisarToken(src, toks, i, ruta, callables) {
  const t = toks[i];
  const k = tipo(t), sig = toks[i + 1] && tipo(toks[i + 1]), crudo = src.slice(t.start, t.end);
  if (k === 'string') {
    if (contenidoStringMalo(crudo)) return [`${ruta}:${t.loc.start.line}: string con escape, <>, o marcador de comentario (${crudo.slice(0, 40)})`];
    return [];
  }
  if (k === 'num' || k === 'null' || k === 'true' || k === 'false' || PUNTOS.has(k)) {
    if (k === '(' && !(i > 0 && callables.has(src.slice(toks[i - 1].start, toks[i - 1].end)))) return [`${ruta}:${t.loc.start.line}: paréntesis fuera de ${[...callables].join('/') || '(ningún callee permitido en este archivo)'}`];
    return [];
  }
  if (k === 'name') {
    if (!(callables.has(crudo) && sig === '(') && sig !== ':') return [`${ruta}:${t.loc.start.line}: identificador no permitido «${crudo}»`];
    return [];
  }
  return [`${ruta}:${t.loc.start.line}: token no permitido «${crudo.slice(0, 20)}»`];
}

// --- Segunda capa (ronda 2): el esqueleto del programa tiene que ser idéntico ---
// El diff de tokens (capa 1) solo mira los tokens insertados/borrados; por diseño no ve
// la ESTRUCTURA que los rodea. Riesgo (b) de la revisión: insertar o borrar solo
// puntuación permitida (`{ } [ ] , ; : ) ...`) alrededor de código YA EXISTENTE puede
// cambiar su estructura (qué envuelve a qué) sin tocar ningún token "peligroso". Esta capa
// lo cierra: serializa el AST completo a una cadena canónica y exige que sea IDÉNTICA en
// base y nuevo, colapsando a un solo marcador "D" cada nodo de DATOS PUROS maximal (así
// una ficha nueva, un registro de historial o un número del mapa sí pueden cambiar).

// Nombres declarados en el tope del archivo como `const NOMBRE = <literal>` (p. ej. las
// constantes de fecha/manualId que data-accesorios.js y data-municiones.js declaran una
// vez y reusan en cada llamada: `const S25 = 'man_acc_2026_09_25', S25d = '2026-09-25';`).
// Referenciarlas no da más poder que escribir el literal inline — son, estructuralmente,
// un alias de un literal fijo que el solucionador NUNCA toca (una declaración nueva sí
// cambiaría la estructura del Program y los tokens: `const`/el nombre nuevo no pasarían
// las otras dos capas).
function constantesLiterales(cuerpoPrograma) {
  const nombres = new Set();
  const esLiteral = (t) => t === 'StringLiteral' || t === 'NumericLiteral' || t === 'NullLiteral' || t === 'BooleanLiteral';
  for (const st of cuerpoPrograma) {
    if (st.type !== 'VariableDeclaration') continue;
    for (const d of st.declarations) {
      if (d.id.type === 'Identifier' && d.init && esLiteral(d.init.type)) nombres.add(d.id.name);
    }
  }
  return nombres;
}

// ¿Es `node` un nodo de datos puros? Recursivo. Un literal suelto NUNCA cuenta como "nodo
// sustituible" por sí mismo (eso lo decide serializarEsqueleto: solo Array/Object/Call);
// esta función solo dice si el contenido, de arriba abajo, es literal+llamada-permitida.
export function esDatoPuro(node, src, callables, constantes) {
  if (!node) return false;
  switch (node.type) {
    case 'StringLiteral':
      return !contenidoStringMalo(src.slice(node.start, node.end));
    case 'NumericLiteral':
    case 'NullLiteral':
    case 'BooleanLiteral':
      return true;
    case 'Identifier':
      return constantes.has(node.name);
    case 'UnaryExpression':
      return node.operator === '-' && node.argument.type === 'NumericLiteral';
    case 'ArrayExpression':
      return node.elements.every((el) => el !== null && esDatoPuro(el, src, callables, constantes));
    case 'ObjectExpression':
      return node.properties.every((p) => {
        if (p.type === 'SpreadElement') return esDatoPuro(p.argument, src, callables, constantes);
        if (p.type !== 'ObjectProperty' || p.computed) return false;
        const k = p.key;
        if (k.type !== 'Identifier' && k.type !== 'StringLiteral' && k.type !== 'NumericLiteral') return false;
        return esDatoPuro(p.value, src, callables, constantes);
      });
    case 'CallExpression':
      return node.callee.type === 'Identifier' && callables.has(node.callee.name)
        && node.arguments.every((a) => a.type !== 'SpreadElement' && esDatoPuro(a, src, callables, constantes));
    default:
      return false;
  }
}

const SUSTITUIBLES = new Set(['ArrayExpression', 'ObjectExpression', 'CallExpression']);

// Serializa el AST completo a una cadena canónica: tipo de nodo, nombres de identificador,
// operadores y valor de los literales que queden EN POSICIÓN DE CÓDIGO (no sustituidos) —
// nunca posiciones/loc/comentarios (los comentarios ya los exige iguales el chequeo de
// arriba). Recorre los hijos en el orden fijo de `VISITOR_KEYS` (de @babel/types — la misma
// tabla que usa @babel/traverse; no reinventa un recorrido propio nodo por nodo).
export function serializarEsqueleto(node, src, callables, constantes) {
  if (node == null) return 'null';
  if (Array.isArray(node)) return `[${node.map((n) => serializarEsqueleto(n, src, callables, constantes)).join(',')}]`;
  if (typeof node.type !== 'string') return 'null'; // campos no-nodo (p. ej. un booleano suelto)

  if (SUSTITUIBLES.has(node.type) && esDatoPuro(node, src, callables, constantes)) return 'D';

  const partes = [node.type];
  if (node.type === 'Identifier') partes.push(node.name);
  else if (node.type === 'StringLiteral') partes.push(JSON.stringify(src.slice(node.start, node.end)));
  else if (node.type === 'NumericLiteral' || node.type === 'BooleanLiteral') partes.push(String(node.value));
  else if ('operator' in node) partes.push(node.operator);
  else if (node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression') partes.push(node.computed ? 'computado' : 'estatico');

  for (const campo of VISITOR_KEYS[node.type] || []) partes.push(serializarEsqueleto(node[campo], src, callables, constantes));
  return partes.join('\u0001');
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

  const callables = CALLABLES_POR_ARCHIVO[ruta] || new Set();
  const esqB = serializarEsqueleto(astBase.program, base, callables, constantesLiterales(astBase.program.body));
  const esqN = serializarEsqueleto(astNuevo.program, nuevo, callables, constantesLiterales(astNuevo.program.body));
  if (esqB !== esqN) return [`${ruta}: la estructura del código cambió`];

  const toksBase = astBase.tokens.filter((t) => t.loc && tipo(t) !== 'eof');
  const toksNuevo = astNuevo.tokens.filter((t) => t.loc && tipo(t) !== 'eof');
  const { añadidos, borrados } = diferenciaDeTokens(toksBase, toksNuevo, base, nuevo);

  const malos = [];
  for (const i of añadidos) malos.push(...revisarToken(nuevo, toksNuevo, i, ruta, callables));
  for (const i of borrados) malos.push(...revisarToken(base, toksBase, i, ruta + ' (borrado)', callables));
  return malos;
}

function esEntero(v) { return v === null || Number.isInteger(v); }
function esNumero(v) { return typeof v === 'number' && Number.isFinite(v); }
function esObjetoPlano(v) { return typeof v === 'object' && v !== null && !Array.isArray(v); }
function esEnteroNoNeg(v) { return Number.isInteger(v) && v >= 0; }
function esNumeroNoNeg(v) { return esNumero(v) && v >= 0; }
function esNumeroNoNegOuNull(v) { return v === null || esNumeroNoNeg(v); }
function esEnteroNoNegOuNull(v) { return v === null || esEnteroNoNeg(v); }
// max=200: de sobra para nombres/referencias/fechas/motivos cortos (el más largo real
// medido hoy es de 40). `desc` (la descripción larga del renglón del PDF) usa 1000 — el
// más largo real medido hoy es de 606 caracteres (referencia-armas.json, ficha 7).
function esStringLimpio(v, max = 200) { return typeof v === 'string' && v.length <= max && !/[\u0000-\u001f]/.test(v); }

// Objeto cuyas claves son EXACTAMENTE `requeridas` (todas presentes) más, a lo mucho, un
// subconjunto de `opcionales`; cada valor pasa su propio validador. Cualquier otra clave,
// clave requerida ausente, o valor que no valida → false (ronda 2, hallazgo 1: antes
// "array de objetos planos" aceptaba contenido arbitrario).
function objetoCerrado(obj, requeridas, opcionales = {}) {
  if (!esObjetoPlano(obj)) return false;
  const permitidas = new Set([...Object.keys(requeridas), ...Object.keys(opcionales)]);
  for (const k of Object.keys(obj)) if (!permitidas.has(k)) return false;
  for (const [k, val] of Object.entries(requeridas)) if (!(k in obj) || !val(obj[k])) return false;
  for (const [k, val] of Object.entries(opcionales)) if (k in obj && !val(obj[k])) return false;
  return true;
}

// `existencias`/`precios` de mapeo-*: clave = id (solo dígitos), valor según el campo.
function esMapaDeIds(obj, esValor) {
  if (!esObjetoPlano(obj)) return false;
  return Object.entries(obj).every(([k, v]) => /^\d+$/.test(k) && esValor(v));
}

// Esquemas de los objetos "detalle" de mapeo-* (derivados de mapear-existencias.py y de los
// archivos reales de HOY + el parche del 13-oct-2026, #369 — ver fase-1-report.md ronda 2).
const ESQ_SIN_FICHA = { idx: esEnteroNoNeg, name: (v) => esStringLimpio(v), priceN: esNumeroNoNeg, qty: esEnteroNoNeg, desc: (v) => esStringLimpio(v, 1000) };
const ESQ_SIN_PRECIO = { fichaId: esEnteroNoNeg, refName: (v) => esStringLimpio(v), refPrice: esNumeroNoNeg };
const ESQ_REVISAR_PRECIO = { fichaId: esEnteroNoNeg, dcamRef: (v) => esStringLimpio(v), renglon: (v) => esStringLimpio(v), precio: esNumeroNoNeg, ultimo: esNumeroNoNegOuNull, motivo: (v) => esStringLimpio(v) };
const ESQ_EXCLUIDOS = { idx: esEnteroNoNeg, name: (v) => esStringLimpio(v), priceN: esNumeroNoNeg, qty: esEnteroNoNeg };
// regresos (detalle, `det` de cuadra_regreso() siempre completo) y regresosRechazados
// (rechazo, puede quedarse a medio camino: motivo. SIN fichaId; o +fichaId; o completo).
const ESQ_REGRESOS = { idx: esEnteroNoNeg, name: (v) => esStringLimpio(v), priceN: esNumeroNoNeg, fichaId: esEnteroNoNeg, fechaAntes: (v) => esStringLimpio(v), antes: esNumeroNoNeg, razon: esNumero, motivo: (v) => esStringLimpio(v), general: esNumeroNoNegOuNull, tramo: esEnteroNoNeg, apoyos: esEnteroNoNeg };
const ESQ_REGRESOS_RECHAZADOS_REQ = { idx: esEnteroNoNeg, name: (v) => esStringLimpio(v), priceN: esNumeroNoNeg, motivo: (v) => esStringLimpio(v) };
const ESQ_REGRESOS_RECHAZADOS_OPC = { fichaId: esEnteroNoNeg, fechaAntes: (v) => esStringLimpio(v), antes: esNumeroNoNeg, razon: esNumero, general: esNumeroNoNegOuNull, tramo: esEnteroNoNeg, apoyos: esEnteroNoNeg };

function jsonMalo(ruta, texto) {
  let j; try { j = JSON.parse(texto); } catch { return [`${ruta}: JSON inválido`]; }

  if (LIGAS.has(ruta)) {
    if (!esObjetoPlano(j)) return [`${ruta}: no es un objeto`];
    return Object.values(j).every(esEntero) ? [] : [`${ruta}: una liga no es entero ni null`];
  }

  if (REFS.has(ruta)) {
    const esFila = (r) => objetoCerrado(r, { idx: esEnteroNoNeg, name: (v) => esStringLimpio(v), desc: (v) => esStringLimpio(v, 1000), priceN: esNumeroNoNeg, qty: esEnteroNoNeg, fichaId: esEnteroNoNegOuNull });
    if (!objetoCerrado(j, { pdfDate: (v) => esStringLimpio(v, 40), pdfFile: (v) => esStringLimpio(v, 120), totalRows: esEnteroNoNeg, rows: Array.isArray })) return [`${ruta}: no tiene la forma esperada`];
    return j.rows.every(esFila) ? [] : [`${ruta}: una fila de "rows" no tiene el esquema exacto`];
  }

  if (MAPEOS.has(ruta)) {
    const req = {
      existencias: (v) => esMapaDeIds(v, esEnteroNoNeg),
      precios: (v) => esMapaDeIds(v, esNumeroNoNeg),
      factores: (v) => Array.isArray(v) && v.every(esNumero),
      sinFicha: (v) => Array.isArray(v) && v.every((x) => objetoCerrado(x, ESQ_SIN_FICHA)),
      sinPrecio: (v) => Array.isArray(v) && v.every((x) => objetoCerrado(x, ESQ_SIN_PRECIO)),
      revisarPrecio: (v) => Array.isArray(v) && v.every((x) => objetoCerrado(x, ESQ_REVISAR_PRECIO)),
      totalPdf: esEnteroNoNeg,
      totalMapped: esEnteroNoNeg,
      excluidos: (v) => Array.isArray(v) && v.every((x) => objetoCerrado(x, ESQ_EXCLUIDOS)),
      regresos: (v) => Array.isArray(v) && v.every((x) => objetoCerrado(x, ESQ_REGRESOS)),
      regresosRechazados: (v) => Array.isArray(v) && v.every((x) => objetoCerrado(x, ESQ_REGRESOS_RECHAZADOS_REQ, ESQ_REGRESOS_RECHAZADOS_OPC)),
    };
    return objetoCerrado(j, req) ? [] : [`${ruta}: no cumple el esquema exacto de mapeo-*`];
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

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
// mk/mun/amx: constructores de ficha de data.js/data-municiones.js/data-accesorios.js.
// `_mh*`/`_h`: helpers locales que cada archivo define y usa en su historial de precios para
// no repetir fecha/manualId en cada renglón (p. ej. `_mh18s(8.96, 966)`, `_h(S25, 613.96,
// S25d, 4)`); decenas de renglones los llaman con los MISMOS literales que un renglón de otra
// ficha distinta, y el diff de tokens (Myers, vía `git diff`) puede emparejar por error una
// ocurrencia sin tocar de un lado con otra sin tocar del otro cuando hay tanta repetición
// exacta — hallazgo real del parche del 07-oct-2026 (#364). Permitirlos como llamada (con
// argumentos literales) es seguro: son funciones fijas ya auditadas, no redefinibles por un
// parche de datos. data-precios.js solo reasigna los mapas `window.AMX_ARMAS_*` (objeto
// literal): no necesita ningún callee permitido.
// Ronda 3 (Important de la re-revisión): el comentario anterior decía que data-accesorios.js
// "escribe cada ficha como objeto literal (no hay función acc)" y por eso no necesitaba
// ningún callee — FALSO: la ficha SÍ se construye con una función, `amx` (data-accesorios.js
// :285, 30 llamadas). Se me pasó porque solo grepeé `acc(` y `function _xxx(`, nunca
// `const amx = (`. Sin `amx` en la lista, añadir una ficha de accesorio NUEVA o cambiar el
// precio de una existente rechazaba por "la estructura del código cambió".
export const CALLABLES_POR_ARCHIVO = {
  'src/data/data.js': new Set(['mk']),
  'src/data/data-municiones.js': new Set(['mun', '_mh', '_mh14', '_mh15', '_mh18', '_mh18s', '_mh22', '_mh25', '_mhj', '_mhl', '_mhs']),
  'src/data/data-accesorios.js': new Set(['amx', '_h']),
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
      salida = execFileSync('git', ['-c', 'core.attributesFile=', 'diff', '--no-index', '--text', '--no-textconv', '-U0', '--no-color', '--no-ext-diff', 'base.tok', 'nuevo.tok'], {
        cwd: dir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        maxBuffer: 256 * 1024 * 1024,
        env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: pGitConfigVacio, GIT_ATTR_NOSYSTEM: '1', HOME: dir, USERPROFILE: dir },
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
// Ronda 3 (Minor #4 + hallazgos 1f/1g de la re-revisión): exige `const` (no `let`/`var` —
// antes se colaba un `let` reasignado) y, además, descarta cualquier nombre que vuelva a
// aparecer en CUALQUIER OTRO lugar del archivo como parámetro de función, declarador
// anidado o blanco de una asignación/incremento. No resuelve ámbitos de verdad (no hace
// falta: es barato y conservador) — si el nombre se toca de cualquier otra forma, en ESE
// punto puede no ser el literal de arriba, así que nunca se trata como dato puro.
function constantesLiterales(programa) {
  const esLiteral = (t) => t === 'StringLiteral' || t === 'NumericLiteral' || t === 'NullLiteral' || t === 'BooleanLiteral';
  const declaradoresTope = new Set();
  const nombres = new Set();
  for (const st of programa.body) {
    if (st.type !== 'VariableDeclaration' || st.kind !== 'const') continue;
    for (const d of st.declarations) {
      declaradoresTope.add(d);
      if (d.id.type === 'Identifier' && d.init && esLiteral(d.init.type)) nombres.add(d.id.name);
    }
  }

  const inseguros = new Set();
  const marcarParam = (p) => {
    if (!p) return;
    if (p.type === 'Identifier') inseguros.add(p.name);
    else if (p.type === 'AssignmentPattern') marcarParam(p.left);
    else if (p.type === 'RestElement') marcarParam(p.argument);
  };
  (function walk(n) {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (typeof n.type !== 'string') return;
    if (n.type === 'FunctionDeclaration' || n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression') (n.params || []).forEach(marcarParam);
    if (n.type === 'VariableDeclarator' && !declaradoresTope.has(n) && n.id.type === 'Identifier') inseguros.add(n.id.name);
    if (n.type === 'AssignmentExpression' && n.left.type === 'Identifier') inseguros.add(n.left.name);
    if (n.type === 'UpdateExpression' && n.argument.type === 'Identifier') inseguros.add(n.argument.name);
    for (const k of VISITOR_KEYS[n.type] || []) walk(n[k]);
  })(programa);

  for (const n of inseguros) nombres.delete(n);
  return nombres;
}

// Nunca son dato puro como CLAVE de un objeto (ronda 3, endurecimiento #6): envenenar el
// prototipo no añade ningún token "peligroso" por sí solo si el valor también es literal,
// pero no tiene ningún motivo legítimo en una ficha de datos.
const CLAVES_PELIGROSAS = new Set(['__proto__', 'constructor', 'prototype']);

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
        let nombreClave;
        if (k.type === 'Identifier') nombreClave = k.name;
        else if (k.type === 'StringLiteral') nombreClave = k.value;
        else if (k.type === 'NumericLiteral') nombreClave = String(k.value);
        else return false;
        if (CLAVES_PELIGROSAS.has(nombreClave)) return false;
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

// Campos que nunca entran en el esqueleto: posición/rango, y metadatos de comentarios (esos
// ya los exige iguales el chequeo de arriba, byte a byte, en otro lado).
const IGNORAR_CAMPOS = new Set(['type', 'start', 'end', 'loc', 'range', 'extra', 'leadingComments', 'trailingComments', 'innerComments', 'comments', 'tokens', 'errors']);

// Serializa el AST completo a una cadena canónica: tipo de nodo, TODO campo propio de valor
// primitivo (string/number/boolean/null — cubre `computed`, `shorthand`, `kind`, `async`,
// `generator`, `prefix`, `method`, `static`, `operator`, el valor de cualquier literal,
// `pattern`/`flags`…) y los nodos-hijo en el orden fijo de `VISITOR_KEYS` (de @babel/types —
// la misma tabla que usa @babel/traverse; no reinventa un recorrido propio nodo por nodo).
// Ronda 3 (Critical de la re-revisión): la versión anterior solo guardaba `operator` y un
// puñado de campos a mano — se le escapaba `computed` (entre otros), así que
// `{ k: v }` -> `{ [k]: v }` (clave normal -> clave computada) salía con el MISMO esqueleto,
// porque los únicos tokens nuevos (`[`/`]`) son puntuación permitida. Serializar TODO campo
// escalar propio, genérico por `Object.keys` menos la lista de ignorados, cierra esa familia
// entera de una vez (no solo `computed`) sin tener que enumerar cada caso a mano.
export function serializarEsqueleto(node, src, callables, constantes) {
  if (node == null) return 'null';
  if (Array.isArray(node)) return `[${node.map((n) => serializarEsqueleto(n, src, callables, constantes)).join(',')}]`;
  if (typeof node.type !== 'string') return 'null'; // campos no-nodo (p. ej. un booleano suelto)

  // Marcador con el TIPO de nodo (Minor #2): sin esto, `[1, 2]` sustituido por `mk(1, 2)` o
  // por `{ length: 9 }` salían con el mismo "D" — un dato puro de otra FORMA ya no es
  // intercambiable en el esqueleto aunque ambos sean "puros".
  if (SUSTITUIBLES.has(node.type) && esDatoPuro(node, src, callables, constantes)) return 'D:' + node.type;

  const vk = VISITOR_KEYS[node.type] || [];
  const vkSet = new Set(vk);
  const partes = [node.type];
  for (const campo of Object.keys(node).filter((k) => !IGNORAR_CAMPOS.has(k) && !vkSet.has(k)).sort()) {
    const v = node[campo];
    // Nodo (o arreglo de nodos) que VISITOR_KEYS no catalogó para este tipo: no debería
    // pasar (verificado contra los 4 archivos reales), pero por si acaso se recorre igual
    // en vez de ignorarlo en silencio.
    const esNodo = v && typeof v === 'object' && (typeof v.type === 'string' || (Array.isArray(v) && v.some((x) => x && typeof x.type === 'string')));
    partes.push(`${campo}=${esNodo ? serializarEsqueleto(v, src, callables, constantes) : JSON.stringify(v)}`);
  }

  for (const campo of vk) partes.push(serializarEsqueleto(node[campo], src, callables, constantes));
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
  const esqB = serializarEsqueleto(astBase.program, base, callables, constantesLiterales(astBase.program));
  const esqN = serializarEsqueleto(astNuevo.program, nuevo, callables, constantesLiterales(astNuevo.program));
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

// Minor #5 (re-revisión): sin git en PATH (u otro fallo real de `diferenciaDeTokens`),
// `compararArchivo` deja pasar la excepción (`spawnSync git ENOENT`) y el CLI terminaba en
// una traza en vez de un problema limpio. Nunca deja pasar una excepción sin convertir:
// fail-closed (problema, salida 1), nunca "sin problemas" por accidente.
export function compararArchivoSeguro(ruta, base, nuevo) {
  try {
    return compararArchivo(ruta, base, nuevo);
  } catch (e) {
    return [`${ruta}: no se pudo validar (${e.message})`];
  }
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
    try {
      const probsExistencia = verificarArchivoEnNuevo(dirNuevo, ruta);
      if (probsExistencia.length) { problemas.push(...probsExistencia); continue; }
      const nuevoBuf = readFileSync(join(dirNuevo, ruta));
      let baseBuf;
      try { baseBuf = readFileSync(join(dirBase, ruta)); } catch { baseBuf = Buffer.alloc(0); }
      if (baseBuf.equals(nuevoBuf)) continue;
      problemas.push(...compararArchivoSeguro(ruta, baseBuf.toString('utf8'), nuevoBuf.toString('utf8')));
    } catch (e) {
      problemas.push(`${ruta}: no se pudo validar (${e.message})`);
    }
  }
  if (problemas.length) { console.error(problemas.join('\n')); process.exit(1); }
  console.log('✔ solo datos');
}

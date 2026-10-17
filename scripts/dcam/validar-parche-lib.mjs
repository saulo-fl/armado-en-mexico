// Decide si lo que dejó el solucionador DCAM en un directorio es SOLO DATOS respecto a la
// base (main). No lee ningún diff de texto — eso es lo que generaba la superficie de ataque
// (cabeceras falsas, CRLF, rutas raras, recortes por línea). En vez de eso: para cada
// archivo de la lista cerrada, tokeniza base y nuevo COMPLETOS con @babel/parser y compara
// las dos secuencias de tokens con un diff de verdad (`git diff --no-index` sobre dos
// temporales que ESTE script escribe, uno-token-por-línea — de confianza porque los
// escribimos nosotros, no el parche). Cada token insertado o borrado se valida con la regla
// de clases (solo literales dentro de mk/mun/amx); el resto del archivo, igual en ambos
// lados, ni se mira.
//
// Toda la lógica de validación vive AQUÍ (no en el CLI): `validar-parche.mjs` es solo un
// invocador delgado que importa de este módulo y siempre corre (ronda de arreglo 1/5 —
// antes tenía un guard `argv[1] === ruta del módulo` que un symlink/junction rompía:
// Node carga el módulo por su ruta REAL, pero `process.argv[1]` conserva la del enlace, así
// que nunca coincidían y el CLI salía EXIT=0 sin validar nada. Sin guard, ese modo de fallo
// no existe: el módulo nunca se auto-ejecuta por ser importado, porque aquí no hay ningún
// código a nivel de módulo que toque `process.argv` o `process.exit`).
import { writeFileSync, lstatSync, mkdtempSync, rmSync } from 'node:fs';
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

// Todo texto que venga de un archivo (o de un error que lo cite) entra a un mensaje por
// aquí: JSON lo deja en UNA línea (escapa saltos de línea y controles; aquí también
// U+0085/U+2028/U+2029) y el tope corta lo largo. Los mensajes acaban en conciliar.log: sin
// esto, una clave con un salto de línea y «FAKE compuertas: ✔ solo datos» escribía un
// renglón falso en el log (re-revisión de la ronda 1).
const SEPARADORES = new RegExp('[' + String.fromCharCode(0x85, 0x2028, 0x2029) + ']', 'g');
export const txt = (v) => JSON.stringify(String(v)).replace(SEPARADORES, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')).slice(0, 200);

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
    if (status !== 1) throw new Error(`git diff --no-index falló (status ${status}): ${txt(salida)}`);
    const { añadidos, borrados, huboHunk } = leerHunksDeDiff(salida);
    if (!huboHunk) throw new Error(`git diff --no-index dijo que hay diferencias (status 1) pero no imprimió ningún hunk: ${txt(salida)}`);
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
  // la necesitan (hallazgo real del 07-oct-2026) — y \$ también es dato legítimo (precios
  // de la ficha, p. ej. mk(128) en data.js:451) — así que ambas se descartan ANTES de
  // buscar backslashes peligrosos; cualquier OTRO backslash (\u, \x, \n, \\, …) sigue
  // prohibido. Esto incluye una barra SUELTA delante de `$` (dos o más backslashes seguidos
  // de `$`): el regex solo consume UN par barra+carácter por `$`/comilla, así que cualquier
  // barra extra antes de ese par queda sin consumir y cae en el `/\\/.test` de abajo — un
  // escape real de backslash (`\\`) seguido de un `$` literal SIGUE prohibido, porque ahí el
  // backslash es un carácter de verdad en el valor, no parte de un escape de `$`.
  const sinComillasEscapadas = crudo.replace(/\\(['"$])/g, '$1');
  return /\\/.test(sinComillasEscapadas) || /[`<>]/.test(crudo) || /[\u0000-\u001f]/.test(crudo) || crudo.includes('//') || crudo.includes('/*') || crudo.includes('*/');
}

function revisarToken(src, toks, i, ruta, callables) {
  const t = toks[i];
  const k = tipo(t), sig = toks[i + 1] && tipo(toks[i + 1]), crudo = src.slice(t.start, t.end);
  if (k === 'string') {
    if (contenidoStringMalo(crudo)) return [`${ruta}:${t.loc.start.line}: string con escape, <>, o marcador de comentario (${txt(crudo)})`];
    return [];
  }
  if (k === 'num' || k === 'null' || k === 'true' || k === 'false' || PUNTOS.has(k)) {
    if (k === '(' && !(i > 0 && callables.has(src.slice(toks[i - 1].start, toks[i - 1].end)))) return [`${ruta}:${t.loc.start.line}: paréntesis fuera de ${[...callables].join('/') || '(ningún callee permitido en este archivo)'}`];
    return [];
  }
  if (k === 'name') {
    if (!(callables.has(crudo) && sig === '(') && sig !== ':') return [`${ruta}:${t.loc.start.line}: identificador no permitido ${txt(crudo)}`];
    return [];
  }
  return [`${ruta}:${t.loc.start.line}: token no permitido ${txt(crudo)}`];
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
// aparecer en el archivo como parámetro SIMPLE (Identifier, con default o rest) de una
// función, declarador `let`/`var` con id Identifier (anidado o no), o blanco de una
// asignación/incremento (el 16-oct se amplió a desestructuración, `catch` y nombres de
// función/clase: ver abajo). Un parche no puede AÑADIR esa sintaxis (un `{`/`[` nuevo en un
// parámetro, un `catch` nuevo, un método nuevo): reprueba antes de llegar aquí, por la capa
// de tokens (identificador o puntuación no vistos en base) o por la de esqueleto (la
// estructura del Program cambió). No resuelve ámbitos de verdad (no hace
// falta: es barato y conservador) — si el nombre se toca de cualquier otra forma, en ESE
// punto puede no ser el literal de arriba, así que nunca se trata como dato puro.
// 16-oct-2026 (altas de cartuchos): data-municiones.js declara sus constantes
// (`var SEP18 = 'man_mun_dcam_2026_09_18', …`) en el primer nivel de su IIFE, no en el tope;
// por eso no se veía ninguna, 75 fichas con `priceManualId: SEP18` no eran dato puro y
// window.MUNICIONES nunca colapsaba: cualquier alta cambiaba el esqueleto. Ahora cuenta
// también el primer nivel del cuerpo de una IIFE de tope `(function () { … })();`, con
// `const` o `var` (local: solo el código de ESTE archivo puede tocarla; un `var` del tope,
// en cambio, es una propiedad global que cualquier otro script reasigna). Al admitir `var`,
// las otras formas de tocar un nombre dejan de ser imposibles (con `const` tronaban), así
// que ahora se descarta todo nombre que: se declare otra vez en cualquier lado (declarador,
// parámetro —desestructurado o no— de función, flecha o método de objeto/clase, `catch`,
// función o clase homónima); sea blanco de una asignación (también desestructurada), de
// `++`/`--` o de un for-in/for-of; o, si viene de una IIFE, aparezca fuera del rango de ESA
// IIFE (afuera es otro nombre: el global). Y si el archivo tiene un `with` o una llamada a
// `eval` (pueden reasignar cualquier nombre sin escribirlo), ninguna constante cuenta.
// Ronda de arreglo 1: antes los parámetros de métodos (`{ f(A) {} }`, `class { m(A) {} }`)
// y el `with` se escapaban; hoy ninguno de los 4 archivos los tiene, pero ya no hace falta
// fiarse de eso.
function constantesLiterales(programa) {
  const esLiteral = (t) => t === 'StringLiteral' || t === 'NumericLiteral' || t === 'NullLiteral' || t === 'BooleanLiteral';
  const candidatos = new Map(); // nombre -> [desde, hasta] (rango del archivo donde vale)
  const declarar = (st, kinds, desde, hasta) => {
    if (st.type !== 'VariableDeclaration' || !kinds.includes(st.kind)) return;
    for (const d of st.declarations) {
      if (d.id.type === 'Identifier' && d.init && esLiteral(d.init.type)) candidatos.set(d.id.name, [desde, hasta]);
    }
  };
  for (const st of programa.body) {
    declarar(st, ['const'], -Infinity, Infinity);
    const e = st.type === 'ExpressionStatement' ? st.expression : null;
    if (e && e.type === 'CallExpression' && e.arguments.length === 0 && e.callee.type === 'FunctionExpression' && !e.callee.async && !e.callee.generator) {
      for (const s of e.callee.body.body) declarar(s, ['const', 'var'], e.start, e.end);
    }
  }

  // Identificadores ligados por un patrón (parámetro, declarador, blanco de asignación).
  const nombresDe = (p, out = []) => {
    if (!p) return out;
    if (p.type === 'Identifier') out.push(p.name);
    else if (p.type === 'AssignmentPattern') nombresDe(p.left, out);
    else if (p.type === 'RestElement') nombresDe(p.argument, out);
    else if (p.type === 'ArrayPattern') p.elements.forEach((el) => nombresDe(el, out));
    else if (p.type === 'ObjectPattern') p.properties.forEach((pr) => nombresDe(pr.type === 'RestElement' ? pr : pr.value, out));
    return out;
  };
  const declaraciones = new Map(); // nombre -> cuántas veces se liga en el archivo
  const inseguros = new Set();
  const ligar = (nombres) => nombres.forEach((n) => declaraciones.set(n, (declaraciones.get(n) || 0) + 1));
  const CON_PARAMS = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression', 'ObjectMethod', 'ClassMethod', 'ClassPrivateMethod']);
  let opaco = false; // `with` o `eval`: cualquier nombre puede cambiar sin escribirse
  (function walk(n) {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (typeof n.type !== 'string') return;
    if (n.type === 'WithStatement' || (n.type === 'CallExpression' && n.callee.type === 'Identifier' && n.callee.name === 'eval')) opaco = true;
    if (CON_PARAMS.has(n.type)) {
      ligar(nombresDe(n.id)); // los métodos no tienen `id`: su nombre es una clave, no una ligadura
      (n.params || []).forEach((p) => ligar(nombresDe(p)));
    }
    if (n.type === 'ClassDeclaration' || n.type === 'ClassExpression') ligar(nombresDe(n.id));
    if (n.type === 'VariableDeclarator') ligar(nombresDe(n.id));
    if (n.type === 'CatchClause') ligar(nombresDe(n.param));
    if (n.type === 'AssignmentExpression') nombresDe(n.left).forEach((x) => inseguros.add(x));
    if (n.type === 'UpdateExpression') nombresDe(n.argument).forEach((x) => inseguros.add(x));
    if ((n.type === 'ForInStatement' || n.type === 'ForOfStatement') && n.left.type !== 'VariableDeclaration') nombresDe(n.left).forEach((x) => inseguros.add(x));
    if (n.type === 'Identifier' && candidatos.has(n.name)) {
      const [desde, hasta] = candidatos.get(n.name);
      if (n.start < desde || n.end > hasta) inseguros.add(n.name);
    }
    for (const k of VISITOR_KEYS[n.type] || []) walk(n[k]);
  })(programa);

  const nombres = new Set();
  if (opaco) return nombres;
  for (const nombre of candidatos.keys()) if (declaraciones.get(nombre) === 1 && !inseguros.has(nombre)) nombres.add(nombre);
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
// `formas` (opcional): por cada ARREGLO que colapsa a "D", en orden de recorrido, sus
// elementos (compararJS saca su forma con formaDeFicha) — para que compararJS exija que las fichas que
// ya existían sigan ahí con su misma forma, y que una nueva tenga la forma de alguna de ellas.
export function serializarEsqueleto(node, src, callables, constantes, formas) {
  if (node == null) return 'null';
  if (Array.isArray(node)) return `[${node.map((n) => serializarEsqueleto(n, src, callables, constantes, formas)).join(',')}]`;
  if (typeof node.type !== 'string') return 'null'; // campos no-nodo (p. ej. un booleano suelto)

  // Marcador con el TIPO de nodo (Minor #2): sin esto, `[1, 2]` sustituido por `mk(1, 2)` o
  // por `{ length: 9 }` salían con el mismo "D" — un dato puro de otra FORMA ya no es
  // intercambiable en el esqueleto aunque ambos sean "puros".
  if (SUSTITUIBLES.has(node.type) && esDatoPuro(node, src, callables, constantes)) {
    if (formas && node.type === 'ArrayExpression') formas.push(node.elements);
    return 'D:' + node.type;
  }

  const vk = VISITOR_KEYS[node.type] || [];
  const vkSet = new Set(vk);
  const partes = [node.type];
  for (const campo of Object.keys(node).filter((k) => !IGNORAR_CAMPOS.has(k) && !vkSet.has(k)).sort()) {
    const v = node[campo];
    // Nodo (o arreglo de nodos) que VISITOR_KEYS no catalogó para este tipo: no debería
    // pasar (verificado contra los 4 archivos reales), pero por si acaso se recorre igual
    // en vez de ignorarlo en silencio.
    const esNodo = v && typeof v === 'object' && (typeof v.type === 'string' || (Array.isArray(v) && v.some((x) => x && typeof x.type === 'string')));
    partes.push(`${campo}=${esNodo ? serializarEsqueleto(v, src, callables, constantes, formas) : JSON.stringify(v)}`);
  }

  for (const campo of vk) partes.push(serializarEsqueleto(node[campo], src, callables, constantes, formas));
  return partes.join('\u0001');
}

// Forma de un elemento de un arreglo de datos puros (ya validado por esDatoPuro): qué
// constructor usa y qué claves lleva, sin los valores. `{ ...mun(…), priceManualId: SEP18 }`
// -> `O{...C:mun,priceManualId}`; `mun(…)` -> `C:mun`; un literal o una constante -> `L`.
// Con `declarados` (constructores definidos en el archivo), cada uno de ellos lleva además su
// número de argumentos (`C:mun/14`).
function formaDeFicha(el, declarados) {
  if (el.type === 'CallExpression') return 'C:' + el.callee.name + (declarados && declarados.has(el.callee.name) ? '/' + el.arguments.length : '');
  if (el.type === 'ArrayExpression') return 'A';
  if (el.type !== 'ObjectExpression') return 'L';
  const clave = (k) => (k.type === 'Identifier' ? k.name : String(k.value));
  return `O{${el.properties.map((p) => (p.type === 'SpreadElement' ? '...' + formaDeFicha(p.argument, declarados) : clave(p.key))).join(',')}}`;
}

// 16-oct-2026: al colapsar window.MUNICIONES a "D" (ver constantesLiterales), el esqueleto
// ya no ve el número ni la forma de sus fichas. Sin esto, borrar una ficha o cambiarle la
// forma pasaría — antes lo rechazaba el esqueleto (por accidente: el arreglo no colapsaba).
// Regla, por arreglo colapsado y en los 4 archivos (decisión de Saulo, 16-oct: las fichas
// no se borran; un duplicado lo funde él, con su 301, ligas y D1): las fichas de la base
// siguen ahí, en orden y con su forma — las que tienen id (ver idDeFicha), por IDENTIDAD
// (ronda 2: por forma sola, «borrar una + dar de alta otra» pasaba); las que no, como
// subsecuencia de las del nuevo —, ningún id se repite, y cada ficha
// nueva tiene la forma de alguna de la base y, si usa constructor (mun/mk/amx), el mismo
// número de argumentos que alguna de esa forma. Cambiar VALORES sigue igual que antes (lo
// vigila la capa de tokens); los historiales viven en arreglos ANIDADOS en un objeto
// colapsado, no aquí, y se pueden corregir (borrar, mover, vaciar registros) MIENTRAS el
// registro no lleve nombres: los de municiones (`_mh25(9.54, 3000)`) y los literales
// `{ manualId: … }` sí; los de accesorios con constantes (`_h(S25, 613.96, S25d, 4)`) NO,
// porque la capa de tokens rechaza todo identificador borrado o insertado que no sea clave
// o callee (límite conocido; abrirlo es otra tarea).
// El mensaje de rechazo dice qué hacer, porque lo lee el solucionador.
function constructoresDeclarados(programa) {
  const nombres = new Set();
  (function walk(n) {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (typeof n.type !== 'string') return;
    if (n.type === 'FunctionDeclaration' && n.id) nombres.add(n.id.name);
    if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier' && n.init && (n.init.type === 'ArrowFunctionExpression' || n.init.type === 'FunctionExpression')) nombres.add(n.id.name);
    for (const k of VISITOR_KEYS[n.type] || []) walk(n[k]);
  })(programa);
  return nombres;
}

// Id de una ficha: primer argumento literal de mk/mun/amx (también dentro de
// `{ ...mun(id, …) }`) o la clave `id` literal de un objeto (manuales). Si un objeto trae las
// dos, gana la que va DESPUÉS (es la que queda en tiempo de ejecución). null si no tiene.
// Ronda de arreglo 2: comparar solo FORMAS dejaba pasar «borrar mk(101) + alta mk(9999)»
// (en data.js las 261 fichas tienen la misma forma): ahora cada id de la base tiene que seguir.
const CONSTRUCTORES_DE_FICHA = new Set(['mk', 'mun', 'amx']);
function idDeFicha(el) {
  // String(): `"101"` y `101` son el MISMO id (la app hace Number(id)); con JSON.stringify eran
  // dos, y una alta `mk("101", …)` colaba una ficha gemela (revisión final, Minor 3).
  const lit = (n) => (n && (n.type === 'NumericLiteral' || n.type === 'StringLiteral') ? String(n.value) : null);
  const deLlamada = (c) => (c.type === 'CallExpression' && c.callee.type === 'Identifier' && CONSTRUCTORES_DE_FICHA.has(c.callee.name) ? lit(c.arguments[0]) : null);
  if (el.type === 'CallExpression') return deLlamada(el);
  if (el.type !== 'ObjectExpression') return null;
  let id = null;
  for (const p of el.properties) {
    if (p.type === 'SpreadElement') { const x = deLlamada(p.argument); if (x !== null) id = x; }
    else if (p.type === 'ObjectProperty' && !p.computed && ((p.key.type === 'Identifier' && p.key.name === 'id') || (p.key.type === 'StringLiteral' && p.key.value === 'id'))) id = lit(p.value);
  }
  return id;
}

function problemaDeFichas(base, nuevo) {
  const NO_BORRAR = 'no se borran fichas: reporta el duplicado en pendiente';
  const lista = (xs) => { const s = [...new Set(xs)].join(' · '); return s.length > 300 ? s.slice(0, 300) + '…' : s; };
  const cuenta = (xs) => xs.reduce((m, x) => (x.id === null ? m : m.set(x.id, (m.get(x.id) || 0) + 1)), new Map());
  const idsB = cuenta(base), idsN = cuenta(nuevo);
  // 1) Identidad (fichas con id): cada id de la base sigue, en el mismo orden relativo, con su
  //    forma (aridad incluida); ningún id aparece más veces que en la base (y uno nuevo, una).
  for (const x of base) if (x.id !== null && !idsN.has(x.id)) return `se borró una ficha (${base.length} → ${nuevo.length}), la ${txt(x.id)}: ${NO_BORRAR}`;
  for (const [id, n] of idsN) if (n > Math.max(1, idsB.get(id) || 0)) return `la ficha ${txt(id)} aparece ${n} veces: un id no se repite`;
  const formaB = new Map(base.filter((x) => x.id !== null).map((x) => [x.id, x.a]));
  for (const x of nuevo) {
    if (x.id !== null && formaB.has(x.id) && formaB.get(x.id) !== x.a) return `la ficha existente ${txt(x.id)} cambió de forma (era ${txt(formaB.get(x.id))}, ahora ${txt(x.a)})`;
  }
  const ordenB = base.filter((x) => x.id !== null).map((x) => x.id).join(',');
  const ordenN = nuevo.filter((x) => x.id !== null && idsB.has(x.id)).map((x) => x.id).join(',');
  if (ordenB !== ordenN) return 'cambió el orden de las fichas existentes';
  // 2) Fichas nuevas (id que la base no tiene): forma y aridad de alguna existente.
  const conocidas = new Set(base.map((x) => x.f)), conocidasA = new Set(base.map((x) => x.a));
  const revisarNueva = (x) => {
    if (!conocidas.has(x.f)) return `una ficha nueva tiene una forma que ninguna del arreglo tiene (${txt(x.f)}); usa una de: ${lista(base.map((y) => y.f))}`;
    if (!conocidasA.has(x.a)) return `una ficha nueva no lleva el número de argumentos de ninguna existente (${txt(x.a)}); usa uno de: ${lista(base.filter((y) => y.f === x.f).map((y) => y.a))}`;
    return null;
  };
  for (const x of nuevo) if (x.id !== null && !idsB.has(x.id)) { const p = revisarNueva(x); if (p) return p; }
  const sinIdB = base.filter((x) => x.id === null), sinIdN = nuevo.filter((x) => x.id === null);
  // Si TODAS las de la base tienen id, una nueva sin id literal (`mk(null, …)`) no pasa: si no,
  // colaba fichas sin identidad por la regla de subsecuencia (revisión final, Minor 4).
  if (sinIdB.length === 0 && idsB.size > 0) {
    const sinId = nuevo.find((x) => x.id === null);
    if (sinId) return `una ficha nueva no tiene id literal (${txt(sinId.a)}): todas las del arreglo lo tienen`;
  }
  // 3) Elementos sin id: las de la base siguen, en orden y con su forma (subsecuencia de las
  //    del nuevo). Se empareja por la forma CON aridad: si fuera sin ella, una ficha nueva de
  //    aridad mala metida justo antes de una existente de su forma «ocuparía» el lugar de esa.
  let i = 0;
  for (const x of sinIdN) {
    if (i < sinIdB.length && x.a === sinIdB[i].a) { i++; continue; }
    if (sinIdN.length <= sinIdB.length) return `una ficha existente cambió de forma u orden (${txt(x.a)})`;
    const p = revisarNueva(x); if (p) return p;
  }
  if (i === sinIdB.length) return null;
  return sinIdN.length < sinIdB.length ? `se borró una ficha (${base.length} → ${nuevo.length}): ${NO_BORRAR}` : `una ficha existente cambió de forma u orden (era ${txt(sinIdB[i].a)})`;
}

function compararJS(ruta, base, nuevo) {
  let astBase, astNuevo;
  try { astBase = parse(base, { sourceType: 'script', tokens: true }); } catch (e) { return [`${ruta}: la base no parsea (${txt(e.message)})`]; }
  try { astNuevo = parse(nuevo, { sourceType: 'script', tokens: true }); } catch (e) { return [`${ruta}: el nuevo no parsea (${txt(e.message)})`]; }

  const comentarios = (ast) => (ast.comments || []).map((c) => `${c.type}\u0000${c.value}`);
  const cB = comentarios(astBase), cN = comentarios(astNuevo);
  if (cB.length !== cN.length || cB.some((c, i) => c !== cN[i])) {
    return [`${ruta}: los comentarios cambiaron (añadidos, borrados o editados) — no se tocan`];
  }

  const callables = CALLABLES_POR_ARCHIVO[ruta] || new Set();
  const formasB = [], formasN = [];
  const esqB = serializarEsqueleto(astBase.program, base, callables, constantesLiterales(astBase.program), formasB);
  const esqN = serializarEsqueleto(astNuevo.program, nuevo, callables, constantesLiterales(astNuevo.program), formasN);
  if (esqB !== esqN || formasB.length !== formasN.length) return [`${ruta}: la estructura del código cambió`];
  // Esqueletos iguales => los mismos arreglos colapsados, en el mismo orden. La aridad solo
  // cuenta para constructores definidos en el archivo (mk/mun/amx en los reales): en un
  // fragmento sin su definición no hay firma contra la cual medir.
  const declarados = constructoresDeclarados(astBase.program);
  const aFormas = (els) => els.map((el) => ({ f: formaDeFicha(el, null), a: formaDeFicha(el, declarados), id: idDeFicha(el) }));
  for (let k = 0; k < formasB.length; k++) {
    const p = problemaDeFichas(aFormas(formasB[k]), aFormas(formasN[k]));
    if (p) return [`${ruta}: ${p}`];
  }

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
// Desde #375 el motivo puede citar el dcamRef de la ficha («[posible ]renombre de «<dcamRef>»:
// <motivo>»): 21 + dcamRef (≤ 200, el mismo tope que un nombre) + 3 + el motivo base más
// largo (63) = 287 → tope de 300 para el motivo de regresos y rechazos (el dcamRef real más
// largo hoy mide 120: con 200 no cabía).
const MAX_MOTIVO_REGRESO = 300;
const ESQ_REGRESOS = { idx: esEnteroNoNeg, name: (v) => esStringLimpio(v), priceN: esNumeroNoNeg, fichaId: esEnteroNoNeg, fechaAntes: (v) => esStringLimpio(v), antes: esNumeroNoNeg, razon: esNumero, motivo: (v) => esStringLimpio(v, MAX_MOTIVO_REGRESO), general: esNumeroNoNegOuNull, tramo: esEnteroNoNeg, apoyos: esEnteroNoNeg };
const ESQ_REGRESOS_RECHAZADOS_REQ = { idx: esEnteroNoNeg, name: (v) => esStringLimpio(v), priceN: esNumeroNoNeg, motivo: (v) => esStringLimpio(v, MAX_MOTIVO_REGRESO) };
const ESQ_REGRESOS_RECHAZADOS_OPC = { fichaId: esEnteroNoNeg, fechaAntes: (v) => esStringLimpio(v), antes: esNumeroNoNeg, razon: esNumero, general: esNumeroNoNegOuNull, tramo: esEnteroNoNeg, apoyos: esEnteroNoNeg };
// gemelos (#375, ligar_gemelos): segundo renglón del mismo producto ligado a la misma ficha.
// Clave OPCIONAL del mapeo: los mapeos anteriores a #375 no la traen.
const ESQ_GEMELOS = { idx: esEnteroNoNeg, name: (v) => esStringLimpio(v), qty: esEnteroNoNeg, fichaId: esEnteroNoNeg };

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
    const opc = { gemelos: (v) => Array.isArray(v) && v.every((x) => objetoCerrado(x, ESQ_GEMELOS)) };
    return objetoCerrado(j, req, opc) ? [] : [`${ruta}: no cumple el esquema exacto de mapeo-*`];
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
    return [`${ruta}: no se pudo validar (${txt(e.message)})`];
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

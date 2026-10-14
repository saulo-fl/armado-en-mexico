import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { compararArchivo, verificarArchivoEnNuevo, MAX_BYTES } from './validar-parche.mjs';

const D = 'src/data/data.js';
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

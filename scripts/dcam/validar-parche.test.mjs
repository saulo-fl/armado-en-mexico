import test from 'node:test';
import assert from 'node:assert/strict';
import { leerDiff, validarArchivo } from './validar-parche.mjs';

const D = 'src/data/data.js';
const base = 'const X = [\n  mk(1, "A", "M"),\n];\nwindow.DB.forEach(a => a);\n';
const lineas = (s) => new Set(s);

test('una ficha nueva con literales pasa', () => {
  const nuevo = base.replace('];', '  mk(2, "Mendoza RM22-3000 Squad", "Mendoza", null, 10.5),\n];');
  assert.deepEqual(validarArchivo(D, base, nuevo, lineas([3]), lineas([])), []);
});

test('una llamada que no es mk/mun/acc se rechaza', () => {
  const nuevo = base.replace('];', '  fetch("https://x.y"),\n];');
  assert.ok(validarArchivo(D, base, nuevo, lineas([3]), lineas([])).length > 0);
});

test('un argumento que no es literal se rechaza', () => {
  const nuevo = base.replace('];', '  mk(2, window.name),\n];');
  assert.ok(validarArchivo(D, base, nuevo, lineas([3]), lineas([])).length > 0);
});

test('template literal y escapes se rechazan', () => {
  for (const s of ['`x`', '"\\u003cscript"', '"a</script>"']) {
    const nuevo = base.replace('];', `  mk(2, ${s}),\n];`);
    assert.ok(validarArchivo(D, base, nuevo, lineas([3]), lineas([])).length > 0, s);
  }
});

test('borrar una línea de código se rechaza', () => {
  const nuevo = base.replace('window.DB.forEach(a => a);\n', '');
  assert.ok(validarArchivo(D, base, nuevo, lineas([]), lineas([4])).length > 0);
});

test('el mapa de existencias regenerado pasa', () => {
  const b = 'window.AMX_ARMAS_EXISTENCIAS = { 1: 9 };\n';
  const n = 'window.AMX_ARMAS_EXISTENCIAS = { 1: 9, 52: 6 };\n';
  assert.deepEqual(validarArchivo('src/data/data-precios.js', b, n, lineas([1]), lineas([1])), []);
});

test('ligas: solo enteros o null', () => {
  const r = '.claude/skills/conciliar-inventario/scripts/ligas-armas.json';
  assert.deepEqual(validarArchivo(r, '{}', '{"MODELO X": 52, "Y": null}', lineas([1]), lineas([1])), []);
  assert.ok(validarArchivo(r, '{}', '{"MODELO X": "52"}', lineas([1]), lineas([1])).length > 0);
});

test('archivos fuera de la lista, nuevos, binarios o renombrados se rechazan', () => {
  const diffs = [
    'diff --git a/scripts/x.py b/scripts/x.py\n--- a/scripts/x.py\n+++ b/scripts/x.py\n@@ -1 +1 @@\n-a\n+b\n',
    'diff --git a/src/data/data.js b/src/data/data.js\nnew file mode 100644\n',
    'diff --git a/src/data/data.js b/src/data/data.js\nBinary files a/src/data/data.js and b/src/data/data.js differ\n',
    'diff --git a/src/data/data.js b/src/data/otro.js\nrename from src/data/data.js\nrename to src/data/otro.js\n',
    'diff --git a/.claude/skills/conciliar-inventario/references/solucionador.md b/.claude/skills/conciliar-inventario/references/solucionador.md\n',
  ];
  for (const d of diffs) assert.ok(leerDiff(d).some((f) => f.problema), d.split('\n')[0]);
});

test('leerDiff cuenta líneas nuevas y borradas', () => {
  const d = 'diff --git a/src/data/data.js b/src/data/data.js\n--- a/src/data/data.js\n+++ b/src/data/data.js\n@@ -2,2 +2,3 @@\n   mk(1, "A", "M"),\n+  mk(2, "B", "M"),\n ];\n';
  const [f] = leerDiff(d);
  assert.equal(f.problema, null);
  assert.deepEqual([...f.añadidas], [3]);
  assert.deepEqual([...f.borradas], []);
});

test('paréntesis de llamada pegados a algo que no es mk/mun/acc se rechazan (mordida del paso 5)', () => {
  // A diferencia de `fetch(...)`, aquí no hay ningún identificador fuera de lista — solo
  // paréntesis de llamada pegados a un literal. Si se comenta el chequeo de '(' en
  // tokensMalos, este es el caso que deja de detectarse (el de `fetch` lo sigue cachando
  // el chequeo de identificadores, así que no sirve para probar la mordida).
  const nuevo = base.replace('];', '  mk(2, "a"()),\n];');
  assert.ok(validarArchivo(D, base, nuevo, lineas([3]), lineas([])).length > 0);
});

test('un renglón de historial en una sola línea: solo se valida lo que cambió, no la línea entera (hallazgo del parche real del 07-oct)', () => {
  // data-municiones.js escribe cada año de historial en una sola línea y le va agregando
  // al final en cada inventario (p. ej. MUNICIONES_PRICE_HISTORY). El diff por líneas marca
  // la línea ENTERA como nueva aunque casi todo ya estuviera ahí — incluidas llamadas a
  // helpers locales como `_mh`, que no son mk/mun/acc pero tampoco las trajo este parche.
  const ruta = 'src/data/data-municiones.js';
  const base = 'const H = {\n  2004: [_mh(1, 2), _mh(3, 4)],\n};\n';
  const nuevo = 'const H = {\n  2004: [_mh(1, 2), _mh(3, 4), { manualId: "x", price: "y", date: "z", qty: 5 }],\n};\n';
  const diff = 'diff --git a/src/data/data-municiones.js b/src/data/data-municiones.js\n--- a/src/data/data-municiones.js\n+++ b/src/data/data-municiones.js\n@@ -2,1 +2,1 @@\n-  2004: [_mh(1, 2), _mh(3, 4)],\n+  2004: [_mh(1, 2), _mh(3, 4), { manualId: "x", price: "y", date: "z", qty: 5 }],\n';
  const [f] = leerDiff(diff);
  assert.equal(f.problema, null);
  assert.deepEqual(validarArchivo(ruta, base, nuevo, f.añadidas, f.borradas, f.reemplazos), []);
  // Sin el emparejamiento (como si viniera de una llamada vieja sin `reemplazos`), la línea
  // completa sí se rechaza por `_mh` — confirma que el caso es real, no que se aflojó todo.
  assert.ok(validarArchivo(ruta, base, nuevo, f.añadidas, f.borradas).length > 0);
});

test('solo cambia un número en una línea con un string ya existente con comilla escapada (hallazgo del parche real del 07-oct)', () => {
  const ruta = 'src/data/data-municiones.js';
  const base = 'const F = [\n  mun(1, "Cartucho 0.38\\" Super", 10),\n];\n';
  const nuevo = 'const F = [\n  mun(1, "Cartucho 0.38\\" Super", 12),\n];\n';
  const diff = 'diff --git a/src/data/data-municiones.js b/src/data/data-municiones.js\n--- a/src/data/data-municiones.js\n+++ b/src/data/data-municiones.js\n@@ -2,1 +2,1 @@\n-  mun(1, "Cartucho 0.38\\" Super", 10),\n+  mun(1, "Cartucho 0.38\\" Super", 12),\n';
  const [f] = leerDiff(diff);
  assert.equal(f.problema, null);
  assert.deepEqual(validarArchivo(ruta, base, nuevo, f.añadidas, f.borradas, f.reemplazos), []);
});

test('CRLF en JSON no rompe la validación de ligas', () => {
  const r = '.claude/skills/conciliar-inventario/scripts/ligas-armas.json';
  const b = '{}\r\n';
  const n = '{"MODELO X": 52, "Y": null}\r\n';
  assert.deepEqual(validarArchivo(r, b, n, lineas([1]), lineas([1])), []);
});

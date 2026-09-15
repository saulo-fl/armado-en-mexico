// Pruebas de window.accesoriosVitrina (src/data/data-accesorios.js) — `node --test scripts/vitrina.test.mjs`
// Va en scripts/ por lo mismo que cotejo.test.mjs. Los datos son FIJOS, no el
// catálogo: una conciliación nueva no debe romper estas pruebas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

globalThis.window = globalThis;
window.DB = [];   // data-accesorios.js cruza `compat.armas` con las fichas de arma
const archivo = fileURLToPath(new URL('../src/data/data-accesorios.js', import.meta.url));
vm.runInThisContext(readFileSync(archivo, 'utf8'), { filename: archivo });

const CATS = [
  { id: 'cargadores', label: 'Cargadores' },
  { id: 'opticas', label: 'Miras y ópticas' },
  { id: 'fundas', label: 'Fundas y pistoleras' },
  { id: 'empunaduras', label: 'Empuñaduras y culatas' },
];
const pieza = (id, categoria, corto) => ({ id, categoria, corto, nombre: 'Accesorio ' + id });
const LISTA = [
  pieza(1, 'empunaduras', 'Culata DT11'),
  pieza(2, 'cargadores', 'Glock 19'),
  pieza(3, 'opticas', 'Mepro MOR'),
  pieza(4, 'cargadores', 'Beretta 92FS'),
  pieza(5, 'cargadores', 'Ángel 9mm'),
  pieza(6, 'cargadores', '5.56 polímero'),
];
const vitrina = (cat) => window.accesoriosVitrina(cat, LISTA, CATS);
const cortos = (s) => s.piezas.map((p) => p.corto);

test('todas: solo categorías con piezas, en el orden de las categorías', () => {
  assert.deepEqual(vitrina('all').map((s) => [s.id, s.label]),
    [['cargadores', 'Cargadores'], ['opticas', 'Miras y ópticas'], ['empunaduras', 'Empuñaduras y culatas']]);
});

test('piezas en orden alfabético español por nombre corto', () => {
  assert.deepEqual(cortos(vitrina('all')[0]), ['5.56 polímero', 'Ángel 9mm', 'Beretta 92FS', 'Glock 19']);
});

test('una categoría con piezas deja solo su sección', () => {
  const s = vitrina('opticas');
  assert.equal(s.length, 1);
  assert.deepEqual(cortos(s[0]), ['Mepro MOR']);
});

test('una categoría sin piezas, desconocida o vacía devuelve todas', () => {
  for (const cat of ['fundas', 'no-existe', '', undefined, null]) {
    assert.equal(vitrina(cat).length, 3, String(cat));
  }
});

test('no muta la lista de entrada', () => {
  const antes = LISTA.map((p) => p.id);
  vitrina('all');
  assert.deepEqual(LISTA.map((p) => p.id), antes);
});

test('el catálogo real: cada accesorio con nombre de letrero', () => {
  assert.ok(window.ACCESORIOS.length > 0);
  for (const a of window.ACCESORIOS) assert.ok(String(a.corto || '').trim(), 'sin corto: ' + a.id);
});

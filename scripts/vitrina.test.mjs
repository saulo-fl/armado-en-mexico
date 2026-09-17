// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.

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

// ── Tramos de los cargadores (16-sep-2026) ──
const cargador = (id, corto, arma, calibreTramo) =>
  ({ id, categoria: 'cargadores', corto, nombre: 'Cargador ' + id, arma, calibreTramo });
const CON_TRAMOS = [
  cargador(11, 'Glock 19', 'pistola', '9mm'),
  cargador(12, 'CZ 457', 'rifle', '.22 LR'),
  cargador(13, 'Beretta 92FS', 'pistola', '9mm'),
  cargador(14, 'OPT VM G2 12 GA', 'escopeta', '12 GA'),
  cargador(15, 'Taurus TH380', 'pistola', '.380 ACP'),
  cargador(16, 'Benelli MR1', 'rifle', '.223 Rem'),
  cargador(17, 'C-MAG G36', 'rifle', '5.56'),
  pieza(18, 'opticas', 'Mepro MOR'),
];
const conTramos = (cat, lista = CON_TRAMOS) => window.accesoriosVitrina(cat, lista, CATS);

test('cargadores: tramos por tipo de arma y dentro por calibre, con su rótulo', () => {
  assert.deepEqual(conTramos('cargadores')[0].tramos.map((t) => [t.id, t.label]), [
    ['pistola-380acp', 'Pistolas · .380 ACP'],
    ['pistola-9mm', 'Pistolas · 9mm'],
    ['rifle-22lr', 'Rifles · .22 LR'],
    ['rifle-223rem', 'Rifles · .223 Rem'],
    ['rifle-556', 'Rifles · 5.56'],
    ['escopeta-12ga', 'Escopetas · 12 GA'],
  ]);
});

test('dentro de un tramo, por nombre corto; la sección conserva todas sus piezas', () => {
  const s = conTramos('all')[0];
  assert.deepEqual(s.tramos[1].piezas.map((p) => p.corto), ['Beretta 92FS', 'Glock 19']);
  assert.equal(s.piezas.length, 7);
});

test('las demás categorías no llevan tramos', () => {
  assert.equal(conTramos('opticas')[0].tramos, null);
});

test('un cargador sin tramo válido deja la sección sin tramos y no se pierde', () => {
  for (const extra of [pieza(19, 'cargadores', 'Sin datos'), cargador(20, 'Raro', 'pistola', '.45 ACP')]) {
    const s = conTramos('cargadores', CON_TRAMOS.concat([extra]))[0];
    assert.equal(s.tramos, null, String(extra.id));
    assert.equal(s.piezas.length, 8);
  }
});

test('el catálogo real: 34 cargadores en 9 tramos; Jericho en 9mm y MR1 en .223 Rem', () => {
  const s = window.accesoriosVitrina('cargadores')[0];
  assert.equal(s.piezas.length, 34);
  assert.deepEqual(s.tramos.map((t) => [t.label, t.piezas.length]), [
    ['Pistolas · .22 LR', 4], ['Pistolas · .380 ACP', 7], ['Pistolas · 9mm', 10], ['Pistolas · .40 S&W', 1],
    ['Rifles · .22 LR', 4], ['Rifles · .223 Rem', 1], ['Rifles · 5.56', 5],
    ['Escopetas · 12 GA', 1], ['Escopetas · 20 GA', 1],
  ]);
  const ids = (label) => s.tramos.find((t) => t.label === label).piezas.map((p) => p.id);
  assert.ok(ids('Pistolas · 9mm').includes(106));
  assert.deepEqual(ids('Rifles · .223 Rem'), [104]);
});

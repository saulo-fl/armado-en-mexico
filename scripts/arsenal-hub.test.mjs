// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// Pruebas de src/lib/arsenal-hub.js — `node --test scripts/arsenal-hub.test.mjs`
// Va en scripts/ y no junto al módulo porque copiar-estaticos.mjs publica todo
// src/lib/. Los datos son FIJOS, no los data-*.js: una conciliación nueva no debe
// romper estas pruebas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

globalThis.window = globalThis;
const archivo = fileURLToPath(new URL('../src/lib/arsenal-hub.js', import.meta.url));
vm.runInThisContext(readFileSync(archivo, 'utf8'), { filename: archivo });

// Existencias fijas: 1 solo en DCAM · 2 solo en OTCA · 3 en las dos · 4 en ninguna.
const DCAM = { 1: 9, 3: 2 };
const OTCA = { 2: { qty: 23 }, 3: { qty: 1 } };
const FX = { dcam: (id) => (DCAM[id] == null ? null : DCAM[id]), otca: (id) => OTCA[id] || null };
const DB = [
  { id: 1, calibre: '.380 ACP' },
  { id: 2, calibre: '.300 Win Mag' },
  { id: 3, calibre: '16 GA' },
  { id: 4, calibre: '.380 ACP' },
];

test('existencia: cada sucursal mira solo su último inventario', () => {
  const t = (id, s) => window.amxTieneExistencia(id, s, FX);
  assert.deepEqual([1, 2, 3, 4].map((id) => t(id, 'DCAM')), [true, false, true, false]);
  assert.deepEqual([1, 2, 3, 4].map((id) => t(id, 'OTCA')), [false, true, true, false]);
  assert.deepEqual([1, 2, 3, 4].map((id) => t(id, 'all')), [true, true, true, false]);
});

test('sucursales: armas con existencia y fecha del último inventario de cada una, sin total', () => {
  const MANUALES = [
    { id: 'a', fecha: '2025-10-03', autoridad: 'DCAM' },
    { id: 'b', fecha: '2026-09-11', autoridad: 'DCAM' },
    { id: 'c', fecha: '2026-06-18', autoridad: 'OTCA' },
    { id: 'd', fecha: '2025-09-26', autoridad: 'OTCA' },
    { id: 'e', fecha: '2026-06-16' }, // sin autoridad cuenta como DCAM
  ];
  assert.deepEqual(window.amxArsenalSucursales(DB, MANUALES, FX), [
    { sigla: 'DCAM', armas: 2, fecha: '2026-09-11' },
    { sigla: 'OTCA', armas: 2, fecha: '2026-06-18' },
  ]);
});

test('calibres: solo con armas, en el orden de la categoría, a escala del más largo', () => {
  const CATS = [
    { id: '.380 ACP', label: '.380 ACP' },
    { id: '9mm Parabellum', label: '9mm Parabellum' }, // sin armas: no sale
    { id: '.300 Win Mag', label: '.300 Win' },
    { id: '16 GA', label: 'Cal. 16' },                 // fuera de la guía de calibres
  ];
  const GUIA = [
    { id: '.380 ACP', mm: 25, cartucho: 'imagenes/cartuchos/380acp.webp' },
    { id: '9mm Parabellum', mm: 29.7, cartucho: 'imagenes/cartuchos/9mm.webp' },
    { id: '.300 Win Mag', mm: 84.8, cartucho: 'imagenes/cartuchos/300wm.webp' },
  ];
  const r = window.amxArsenalCalibres(DB, CATS, GUIA);
  assert.deepEqual(r.map((c) => [c.id, c.label, c.armas, c.mm, c.foto]), [
    ['.380 ACP', '.380 ACP', 2, 25, 'imagenes/cartuchos/380acp.webp'],
    ['.300 Win Mag', '.300 Win', 1, 84.8, 'imagenes/cartuchos/300wm.webp'],
    ['16 GA', 'Cal. 16', 1, 70, null],
  ]);
  assert.equal(r[1].escala, 1);
  assert.ok(Math.abs(r[0].escala - 25 / 84.8) < 1e-9);
  assert.ok(Math.abs(r[2].escala - 70 / 84.8) < 1e-9);
});

test('calibres: los 4 que no están en la guía traen su largo (SAAMI)', () => {
  const CATS = ['.22-250 Rem', '.223 Rem', '6.5 Creedmoor', '16 GA'].map((id) => ({ id, label: id }));
  const db = CATS.map((c, i) => ({ id: i, calibre: c.id }));
  assert.deepEqual(window.amxArsenalCalibres(db, CATS, []).map((c) => c.mm), [59.7, 57.4, 71.8, 70]);
});

test('calibres: uno sin largo conocido se dibuja como el más corto, no como el más largo', () => {
  const CATS = [
    { id: '.380 ACP', label: '.380 ACP' },
    { id: '.300 Win Mag', label: '.300 Win' },
    { id: 'Calibre raro', label: 'Calibre raro' },   // ni en la guía ni en LARGO_SIN_GUIA
  ];
  const GUIA = [
    { id: '.380 ACP', mm: 25, cartucho: 'imagenes/cartuchos/380acp.webp' },
    { id: '.300 Win Mag', mm: 84.8, cartucho: 'imagenes/cartuchos/300wm.webp' },
  ];
  const db = [{ id: 1, calibre: '.380 ACP' }, { id: 2, calibre: '.300 Win Mag' }, { id: 3, calibre: 'Calibre raro' }];
  const r = window.amxArsenalCalibres(db, CATS, GUIA);
  assert.equal(r[2].mm, null);
  assert.equal(r[2].escala, r[0].escala);          // el del .380 ACP, que es el más corto
  assert.ok(r[2].escala < r[1].escala);
});

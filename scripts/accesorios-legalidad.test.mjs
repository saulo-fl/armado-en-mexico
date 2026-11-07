// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// Issue #467: el cargador 9mm de la SIG P320 salía como civil ('dcam') aunque
// toda arma 9mm del catálogo es de uso exclusivo del Ejército. Un accesorio no
// puede ser menos restringido que el calibre que sirve (9mm y 5.56).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

globalThis.window = globalThis;
for (const f of ['../src/data/data.js', '../src/data/data-accesorios.js']) {
  const archivo = fileURLToPath(new URL(f, import.meta.url));
  vm.runInThisContext(readFileSync(archivo, 'utf8'), { filename: archivo });
}

// Calibre del arma (data.js) ↔ tramo del cargador (ACC_TRAMO en data-accesorios.js).
// Se usa el tramo y no la spec «Calibre» porque hay cargadores sin ella (106 Jericho).
const EXCLUSIVOS = { '9mm': '9mm Parabellum', '5.56': '5.56x45mm' };

for (const [tramo, cal] of Object.entries(EXCLUSIVOS)) {
  test(`toda arma ${cal} del catálogo es de uso exclusivo del Ejército`, () => {
    const armas = window.DB.filter(w => w.calibre === cal);
    assert.ok(armas.length > 0);
    for (const w of armas) assert.equal(w.avail, 'ejercito', `${w.id} ${w.nombre}`);
  });

  test(`todo accesorio ${tramo} es de uso exclusivo del Ejército (issue #467)`, () => {
    const acc = window.ACCESORIOS.filter(a => a.calibreTramo === tramo);
    assert.ok(acc.length > 0);
    for (const a of acc) assert.equal(a.avail, 'ejercito', `${a.id} ${a.nombre}`);
  });
}

test('el cargador SIG P320 (id 110) es de uso exclusivo del Ejército', () => {
  assert.equal(window.ACCESORIOS.find(a => a.id === 110).avail, 'ejercito');
});

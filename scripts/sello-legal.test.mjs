// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// El sello CIVIL de cada arma (avail 'dcam') contra la LFAFE reformada el 29-05-2025.
// Corrección del 1-nov-2026: las réplicas del M4 y las escopetas de cañón corto
// estaban como civiles; la MR1 de culata fija, como exclusiva (dato de militares).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const raiz = (p) => fileURLToPath(new URL('../' + p, import.meta.url));
const ctx = {}; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(readFileSync(raiz('src/data/data.js'), 'utf8'), ctx);
const arma = (id) => ctx.DB.find((a) => a.id === id) || assert.fail('no existe el arma ' + id);

test('una réplica de arma de uso exclusivo no es civil (art. 9o, último párrafo)', () => {
  // toda Tippmann del catálogo es la M4-22; las altas nuevas suelen decir «réplica» en el mecanismo
  const replicas = ctx.DB.filter((a) => a.marca === 'Tippmann' || /réplica/i.test(a.mecanismo));
  assert.ok(replicas.length >= 6, 'deben seguir entrando las seis Tippmann M4-22');
  for (const a of replicas) assert.notEqual(a.avail, 'dcam', `${a.id} ${a.nombre}`);
});

test('escopetas con cañón menor de 635 mm son exclusivas (art. 11 e)', () => {
  // largo del cañón según la descripción DCAM/OTCA: 18½", 14", 18.5", 20", 18.5", 14", 13"
  for (const id of [85, 162, 165, 166, 167, 168, 232]) assert.equal(arma(id).avail, 'ejercito', arma(id).nombre);
});

test('Benelli MR1: .223 Rem como en el registro; culata fija civil, estándar exclusiva', () => {
  assert.equal(arma(143).calibre, '.223 Rem');
  assert.equal(arma(231).calibre, '.223 Rem');
  assert.equal(arma(143).avail, 'ejercito');
  assert.equal(arma(231).avail, 'dcam');
});

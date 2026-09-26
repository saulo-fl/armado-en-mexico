// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

globalThis.window = globalThis;
window.amxSlug = (s) => String(s == null ? '' : s)
  .normalize('NFD').replace(/\p{Diacritic}/gu, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const archivo = fileURLToPath(new URL('../src/lib/calibres.js', import.meta.url));
vm.runInThisContext(readFileSync(archivo, 'utf8'), { filename: archivo });

const GUIA = [
  { id: '.22 LR',       clase: 'Rimfire',  sistema: 'Rimfire',           mm: 25.4, energiaJ:  150, velocidadMs: 330, avail: 'dcam' },
  { id: '.40 S&W',      clase: 'Pistola',  sistema: 'Percusión central', mm: 28.8, energiaJ:  600, velocidadMs: 330, avail: 'ejercito' },
  { id: '.38 Special',  clase: 'Revólver', sistema: 'Percusión central', mm: 39.6, energiaJ:  300, velocidadMs: 260, avail: 'dcam' },
  { id: '.300 Win Mag', clase: 'Rifle',    sistema: 'Percusión central', mm: 84.8, energiaJ: 4800, velocidadMs: 900, avail: 'dcam' },
  { id: '12 GA',        clase: 'Escopeta', sistema: 'Percusión central', mm: null, energiaJ: null, velocidadMs: 400, avail: 'dcam' },
];
const DB = [{ calibre: '.22 LR' }, { calibre: '.22 LR' }, { calibre: '.40 S&W' }];

test('1 — amxGuiaCalibres(GUIA, DB) sale ordenado por mm ascendente; el 12 GA, sin mm, puede ir en cualquier posición', () => {
  const resultado = window.amxGuiaCalibres(GUIA, DB);
  const conMm = resultado.filter(c => c.mm != null);
  for (let i = 1; i < conMm.length; i++) {
    assert.ok(conMm[i].mm >= conMm[i - 1].mm,
      `${conMm[i].id} (${conMm[i].mm}) debe ir después de ${conMm[i - 1].id} (${conMm[i - 1].mm})`);
  }
});

test('2 — el .300 Win Mag sale con escala 1 y el .22 LR con escala menor que 1', () => {
  const resultado = window.amxGuiaCalibres(GUIA, DB);
  const winMag = resultado.find(c => c.id === '.300 Win Mag');
  const lr22 = resultado.find(c => c.id === '.22 LR');
  assert.strictEqual(winMag.escala, 1, 'el calibre más largo debe tener escala 1');
  assert.ok(lr22.escala < 1, `escala de .22 LR (${lr22.escala}) debe ser < 1`);
});

test('3 — el 12 GA sale con la misma escala que el .22 LR, y distinta de 1', () => {
  const resultado = window.amxGuiaCalibres(GUIA, DB);
  const doceGa = resultado.find(c => c.id === '12 GA');
  const lr22 = resultado.find(c => c.id === '.22 LR');
  assert.notStrictEqual(doceGa.escala, 1, '12 GA no debe tener escala 1');
  assert.strictEqual(doceGa.escala, lr22.escala,
    `12 GA (${doceGa.escala}) debe tener la misma escala que .22 LR (${lr22.escala})`);
});

test('4 — amxPosicionEnRango(280, 150, 4800) da un valor mayor que 0 y menor que 1', () => {
  const pos = window.amxPosicionEnRango(280, 150, 4800);
  assert.ok(pos > 0, `posición (${pos}) debe ser > 0`);
  assert.ok(pos < 1, `posición (${pos}) debe ser < 1`);
});

test('5 — amxCalibrePorSlug("40-s-w", GUIA) devuelve la entrada de id ".40 S&W"', () => {
  const resultado = window.amxCalibrePorSlug('40-s-w', GUIA);
  assert.ok(resultado, 'debe encontrar el calibre');
  assert.strictEqual(resultado.id, '.40 S&W');
});

test('6 — amxFiltrarCalibres(GUIA, { avail: "dcam" }) devuelve 4 entradas y ninguna con avail "ejercito"', () => {
  const resultado = window.amxFiltrarCalibres(GUIA, { avail: 'dcam' });
  assert.strictEqual(resultado.length, 4, `debe devolver 4 entradas, got ${resultado.length}`);
  for (const c of resultado) {
    assert.notStrictEqual(c.avail, 'ejercito', `no debe haber calibre "ejercito" en el resultado`);
  }
});

// El bug que vigila (24-sep-2026): amxGuiaCalibres copiaba campo por campo y se
// dejaba `cartucho`, `desc`, `uso`, `velocidad`, `energia`, `legalArt` y demás.
// La guía y la ficha leen de ahí: salían con la silueta y los renglones vacíos
// aunque data-extra.js tuviera el dato. Este fixture lleva los campos que la
// ficha pinta; si alguien vuelve a enumerar campos, se cae.
const GUIA_COMPLETA = GUIA.map((c, i) => Object.assign({}, c, {
  uso: 'uso ' + i,
  alias: ['alias ' + i],
  velocidad: '330 m/s',
  energia: '600 J',
  retroceso: 'suave',
  retrocesoNivel: 2,
  legalArt: 'art. 9 fr. I',
  legalNota: 'nota ' + i,
  fuente: { nombre: 'C.I.P.', fecha: '2026-01-01' },
  enCatalogo: true,
  cartucho: 'imagenes/cartuchos/prueba-' + i + '.webp',
  desc: 'descripción ' + i,
}));

test('7 — amxGuiaCalibres no pierde ningún campo del calibre de origen', () => {
  const resultado = window.amxGuiaCalibres(GUIA_COMPLETA, DB);
  for (const origen of GUIA_COMPLETA) {
    const salida = resultado.find(c => c.id === origen.id);
    assert.ok(salida, `${origen.id} debe estar en la guía`);
    for (const campo of Object.keys(origen)) {
      assert.deepStrictEqual(salida[campo], origen[campo],
        `la guía perdió o cambió "${campo}" de ${origen.id}`);
    }
  }
});

test('8 — la foto del cartucho llega a la guía (la mesa y la ficha la leen de aquí)', () => {
  const resultado = window.amxGuiaCalibres(GUIA_COMPLETA, DB);
  const conFoto = resultado.filter(c => c.cartucho);
  assert.strictEqual(conFoto.length, GUIA_COMPLETA.length,
    `los ${GUIA_COMPLETA.length} calibres traen cartucho; llegaron ${conFoto.length}`);
});

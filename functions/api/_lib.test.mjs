// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// Comprobación de los topes anti-abuso de la API pública.
// Correr con:  node functions/api/_lib.test.mjs
// (El prefijo "_" impide que Pages lo convierta en una ruta.)
//
// Existe porque estos límites protegen contra algo que NO se nota: un item
// descomunal no da error, se guarda, y a partir de ahí /api/state lo sirve
// entero en cada carga de página. Sin esta prueba, subir un tope o tocar
// sanitizeItem rompe la protección en silencio.
import assert from 'node:assert/strict';
import {
  mergeAppend, APPEND_DOMAINS, RESENA_MIN, RESENA_MAX,
  normalizeReport, REPORT_MIN, REPORT_MAX,
} from './_lib.js';

const pesa = (v) => JSON.stringify(v).length;
let n = 0;
const ok = (msg) => { n++; console.log('  ok', msg); };

// ── Denuncias: contrato cerrado que no acepta campos arbitrarios ────────────
const REPORTE_VALIDO = {
  reviewId: 'r_47', tipo: 'arma', entidadId: 47, entidadNombre: 'Ruger LCP',
  reviewExcerpt: 'Una reseña pública breve', motivo: 'datos',
  detalle: 'La reseña contiene el teléfono de una tercera persona.',
  email: 'ana@example.com', extra: 'no debe persistir',
};

{
  const out = normalizeReport(REPORTE_VALIDO);
  assert.equal(out.ok, true);
  assert.equal(out.value.extra, undefined);
  assert.deepEqual(Object.keys(out.value), [
    'reviewId', 'tipo', 'entidadId', 'entidadNombre', 'reviewExcerpt', 'motivo', 'detalle', 'email',
  ]);
  ok('denuncia válida normalizada por lista cerrada');
}

for (const [nombre, cambio] of [
  ['tipo desconocido', { tipo: 'inventado' }],
  ['motivo desconocido', { motivo: 'spam' }],
  ['detalle corto', { detalle: 'demasiado corto' }],
  ['detalle largo', { detalle: 'x'.repeat(REPORT_MAX + 1) }],
  ['correo inválido', { email: 'no-es-correo' }],
  ['nombre sobredimensionado', { entidadNombre: 'x'.repeat(121) }],
]) {
  const out = normalizeReport({ ...REPORTE_VALIDO, ...cambio });
  assert.equal(out.ok, false, nombre);
  assert.deepEqual(mergeAppend('reports', [], { ...REPORTE_VALIDO, ...cambio }), [], nombre);
}
ok('denuncias inválidas no modifican el dominio');

{
  const current = [{ id: 'd_existente', status: 'pending' }];
  const out = mergeAppend('reports', current, { ...REPORTE_VALIDO, motivo: 'inventado' });
  assert.deepEqual(out, current, 'un reporte inválido conserva la cola existente');
  assert.notEqual(out, current, 'la defensa no expone el array original');
  ok('denuncia inválida conserva la cola existente');
}

// ── Los envíos de «Proponer arma» y «Sugerir cambios» ya no se aceptan ─────
// Salieron el 13-sep-2026. Si alguien vuelve a añadirlos a APPEND_DOMAINS, la
// API pública volvería a guardar lo que ninguna pantalla revisa.
{
  assert.ok(!APPEND_DOMAINS.includes('pending'), 'pending no admite escritura publica');
  assert.ok(!APPEND_DOMAINS.includes('suggestions'), 'suggestions no admite escritura publica');
  assert.deepEqual(mergeAppend('pending', [], { nombre: 'x' }), [], 'mergeAppend no conoce pending');
  ok('pending y suggestions retirados de la escritura publica');
}

// ── visits: tope por arma, y la fila entera cabe en D1 ──────────────────────
{
  let v = {};
  for (let i = 0; i < 600; i++) v = mergeAppend('visits', v, { armaId: 1, ts: Date.now() - i });
  assert.equal(v['1'].length, 500, 'maximo 500 marcas por arma');

  let full = {};
  for (let id = 1; id <= 179; id++) {
    for (let i = 0; i < 600; i++) full = mergeAppend('visits', full, { armaId: id, ts: Date.now() - i });
  }
  const bytes = pesa(full);
  assert.ok(bytes < 2_000_000, `179 armas saturadas deben caber en la fila de 2 MB de D1, miden ${bytes}`);
  ok(`visits saturado en las 179 armas = ${bytes} bytes, bajo el limite de 2 MB`);
}

// ── Reseñas: el mínimo de texto se impone en el SERVIDOR ─────────────
// El formulario ya valida, pero /api/append/reviewsQueue es público y se puede
// llamar con curl. Sin esta comprobación el mínimo de 100 caracteres es
// decorativo y la cola se llena de "ok" de tres letras.
{
  const base = { tipo: 'arma', entidadId: 47, recomienda: true, autor: 'Ana', email: 'a@b.c' };
  const largo = 'x'.repeat(RESENA_MIN);

  assert.equal(mergeAppend('reviewsQueue', [], { ...base, texto: 'muy buena' }).length, 0,
    'un texto por debajo del minimo no entra');
  assert.equal(mergeAppend('reviewsQueue', [], { ...base, texto: 'x'.repeat(RESENA_MAX + 1) }).length, 0,
    'un texto por encima del maximo no entra');
  assert.equal(mergeAppend('reviewsQueue', [], { ...base, texto: largo, recomienda: 'si' }).length, 0,
    'recomienda tiene que ser booleano, no la cadena "si"');
  assert.equal(mergeAppend('reviewsQueue', [], { ...base, texto: largo, tipo: 'inventado' }).length, 0,
    'el tipo de entidad esta cerrado a una lista');
  assert.equal(mergeAppend('reviewsQueue', [], { ...base, texto: largo, entidadId: 'abc' }).length, 0,
    'entidadId tiene que ser un numero');
  ok('reviewsQueue rechaza lo que no cumple sin tocar la cola');

  const out = mergeAppend('reviewsQueue', [], { ...base, texto: largo, status: 'approved', id: 'falso' });
  assert.equal(out.length, 1, 'una resena valida si entra');
  assert.equal(out[0].status, 'pending', 'el status lo fija el servidor, no el cliente');
  assert.notEqual(out[0].id, 'falso', 'el id lo fija el servidor');
  ok('una resena valida entra siempre como pendiente');
}

console.log(`\n✔ ${n} comprobaciones OK`);

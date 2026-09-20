// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

globalThis.window = globalThis;
vm.runInThisContext(
  readFileSync(
    fileURLToPath(new URL('../src/lib/legal.js', import.meta.url)),
    'utf8'
  )
);

// ── Corpus falso para los tests ──────────────────────────────────────
var corpusFalso = {
  fuentes: {
    lfafe: { titulo: 'LFAFE', emisor: 'SCNJ', url: 'http://test/lfafe', fechaConsulta: '2026-09-19' }
  },
  escenarios: [
    { id: 'asalariado', eje: 'ingresos', label: 'Asalariado' },
    { id: 'independiente', eje: 'ingresos', label: 'Independiente' },
    { id: 'ejidatario', eje: 'ingresos', label: 'Ejidatario' },
    { id: 'hombre', eje: 'persona', label: 'Hombre' }
  ],
  normas: [
    { id: 'n1', revisar: true, nota: 'norma pendiente' },
    { id: 'n2', revisar: false }
  ],
  articulos: [
    { id: 'a1', revisar: true, nota: 'artículo pendiente' }
  ],
  tramites: [
    { id: 'tr1', revisar: false }
  ],
  requisitos: [
    // requisito con variantes — casará con ejidatario
    {
      id: 'r1', tramite: 'tr1', orden: 1, nombre: 'Req Ejidatario',
      variantes: [
        { escenario: 'ejidatario', documento: 'Acta ejidal', autoridadLocal: 'Registro Agrario Nacional' }
      ]
    },
    // requisito con variantes — casará con independiente
    {
      id: 'r2', tramite: 'tr1', orden: 2, nombre: 'Req Independiente',
      variantes: [
        { escenario: 'independiente', documento: 'RFC', autoridadLocal: 'contador público' }
      ]
    },
    // requisito con variantes — NO casará con ningún escenario pasado
    {
      id: 'r3', tramite: 'tr1', orden: 3, nombre: 'Req Nadie',
      variantes: [
        { escenario: 'agricultor', documento: 'algo' }
      ]
    },
    // requisito con escenarios ['*'] — siempre entra
    {
      id: 'r4', tramite: 'tr1', orden: 0, nombre: 'Req Universal',
      escenarios: ['*']
    },
    // requisito con tramite diferente — nunca entra
    {
      id: 'r5', tramite: 'trOtro', orden: 0, nombre: 'Req Otro',
      escenarios: ['*']
    }
  ],
  entidades: [
    { id: 'e1', revisar: false, nombre: 'ENTIDAD 1' },
    { id: 'e2', revisar: true, nota: 'entidad pendiente' }
  ]
};

// ── Tests ────────────────────────────────────────────────────────────

test('amxLegalFecha convierte AAAA-MM-DD → DD-MES-AAAA', function () {
  assert.equal(amxLegalFecha('2026-09-19'), '19-SEP-2026');
});

test('amxLegalFecha devuelve "" para formato inválido', function () {
  assert.equal(amxLegalFecha('cualquier cosa'), '');
});

test('amxLegalPublicado: revisar:true → false, sin revisar → true', function () {
  assert.equal(amxLegalPublicado({ revisar: true }), false);
  assert.equal(amxLegalPublicado({}), true);
});

test('amxLegalHuecos encuentra exactamente los 3 huecos del corpus falso', function () {
  var huecos = amxLegalHuecos(corpusFalso);
  // n1 (normas), a1 (articulos), e2 (entidades)
  assert.equal(huecos.length, 3);
  var ids = huecos.map(function (h) { return h.tabla + '/' + h.id; });
  assert.ok(ids.indexOf('normas/n1') !== -1);
  assert.ok(ids.indexOf('articulos/a1') !== -1);
  assert.ok(ids.indexOf('entidades/e2') !== -1);
});

test('amxRequisitosDe con { ingresos:"ejidatario" } devuelve variante con "Registro Agrario Nacional"', function () {
  var reqs = amxRequisitosDe(corpusFalso, 'tr1', { ingresos: 'ejidatario' });
  assert.equal(reqs.length, 2); // solo r4 (escenarios ['*']) y r1 (variante ejidatario)
  // Verificar que r1 tiene variante con Registro Agrario Nacional
  var r1 = reqs.find(function (r) { return r.id === 'r1' });
  assert.ok(r1, 'r1 debe estar en el resultado');
  assert.ok(r1.variante, 'r1 debe tener variante');
  assert.ok(r1.variante.autoridadLocal.indexOf('Registro Agrario Nacional') !== -1);
});

test('amxRequisitosDe con { ingresos:"independiente" } devuelve variante con "contador público", distinto al punto 5', function () {
  var reqs = amxRequisitosDe(corpusFalso, 'tr1', { ingresos: 'independiente' });
  var r2 = reqs.find(function (r) { return r.id === 'r2' });
  assert.ok(r2, 'r2 debe estar en el resultado');
  assert.ok(r2.variante, 'r2 debe tener variante');
  assert.ok(r2.variante.autoridadLocal.indexOf('contador público') !== -1);
  assert.notEqual(r2.variante.autoridadLocal, 'Registro Agrario Nacional');
});

test('un requisito cuyas variantes no casan NO aparece', function () {
  var reqs = amxRequisitosDe(corpusFalso, 'tr1', { ingresos: 'ejidatario' });
  var r3 = reqs.find(function (r) { return r.id === 'r3' });
  assert.equal(r3, undefined);
});

test('un requisito con escenarios:["*"] aparece siempre', function () {
  var reqs = amxRequisitosDe(corpusFalso, 'tr1', { ingresos: 'ejidatario', persona: 'mujer' });
  var r4 = reqs.find(function (r) { return r.id === 'r4' });
  assert.ok(r4, 'r4 con [*] debe aparecer aunque pases escenarios distintos');
});

test('el resultado sale ordenado por orden ascendente', function () {
  var reqs = amxRequisitosDe(corpusFalso, 'tr1', { ingresos: 'ejidatario' });
  var ordenes = reqs.map(function (r) { return r.orden; });
  for (var i = 1; i < ordenes.length; i++) {
    assert.ok(ordenes[i] >= ordenes[i - 1], 'orden debe ser ascendente');
  }
});

test('amxRequisitosDe devuelve copias: mutar el resultado no cambia el corpus', function () {
  var reqs = amxRequisitosDe(corpusFalso, 'tr1', { ingresos: 'ejidatario' });
  // Mutar el resultado
  reqs[0].nombre = 'MODIFICADO';
  // El corpus original debe estar intacto
  var reqsOriginal = amxRequisitosDe(corpusFalso, 'tr1', { ingresos: 'ejidatario' });
  assert.notEqual(reqsOriginal[0].nombre, 'MODIFICADO');
});

test('amxLegalFuente devuelve la fuente o null', function () {
  var f = amxLegalFuente(corpusFalso, 'lfafe');
  assert.ok(f);
  assert.equal(f.titulo, 'LFAFE');
  assert.equal(amxLegalFuente(corpusFalso, 'inexistente'), null);
});

test('amxLegalEntidad devuelve la entidad o null', function () {
  var e = amxLegalEntidad(corpusFalso, 'e1');
  assert.ok(e);
  assert.equal(e.nombre, 'ENTIDAD 1');
  assert.equal(amxLegalEntidad(corpusFalso, 'noexiste'), null);
});

// Un hueco no siempre es una entrada entera. Si amxLegalHuecos solo mirara el primer
// nivel, el bloque «que falta por verificar» del hub ensenaria 5 huecos donde hay 32, y
// el sitio pareceria mas verificado de lo que esta: justo lo contrario de para lo que
// existe ese bloque. Esta prueba fija que tambien se recorren fuentes, limites,
// variantes y el portal de antecedentes de cada estado.
test('amxLegalHuecos tambien encuentra los huecos anidados', function () {
  var corpus = {
    fuentes: {
      buena: { titulo: 'Con URL' },
      coja: { titulo: 'Sin URL', revisar: true, nota: 'HUECO en la fuente' },
    },
    normas: [],
    articulos: [],
    tramites: [
      { id: 't1', limites: [
        { id: 'l-ok', texto: 'con fundamento' },
        { id: 'l-hueco', texto: 'sin fundamento', revisar: true, nota: 'HUECO en el limite' },
      ] },
    ],
    requisitos: [
      { id: 'r1', tramite: 't1', orden: 1, variantes: [
        { escenario: 'asalariado', documento: 'Carta' },
        { escenario: 'extranjero', documento: 'FM2', revisar: true, nota: 'HUECO en la variante' },
      ] },
    ],
    entidades: [
      { id: 'mx-que', nombre: 'Queretaro', antecedentes: { dependencia: 'Fiscalia', url: 'https://x.gob.mx' } },
      { id: 'mx-jal', nombre: 'Jalisco', antecedentes: { revisar: true, nota: 'HUECO en el portal' } },
    ],
  };
  var h = amxLegalHuecos(corpus);
  var donde = h.map(function (x) { return x.tabla; }).sort();
  assert.deepEqual(donde, [
    'entidades/antecedentes', 'fuentes', 'requisitos/variantes', 'tramites/limites',
  ], 'deben salir los cuatro tipos de hueco anidado');
  assert.ok(h.every(function (x) { return x.nota; }), 'todo hueco lleva su nota');
  var portal = h.find(function (x) { return x.tabla === 'entidades/antecedentes'; });
  assert.equal(portal.id, 'mx-jal');
  var variante = h.find(function (x) { return x.tabla === 'requisitos/variantes'; });
  assert.equal(variante.id, 'r1/extranjero', 'la variante se identifica por requisito y escenario');
});

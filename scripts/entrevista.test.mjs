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
    fileURLToPath(new URL('../src/lib/entrevista.js', import.meta.url)),
    'utf8',
  ),
);

var ARBOL = {
  version: '2026-09-19',
  siempre: ['pa-curp'],
  etapas: [{ id: 'quien', nombre: 'Quién eres' }, { id: 'modo', nombre: 'Modo de vivir' }],
  preguntas: [
    { clave: 'ed', id: 'edad', etapa: 'quien', texto: '¿Eres mayor de edad?',
      opciones: [
        { clave: 's', id: 'si', texto: 'Sí' },
        { clave: 'n', id: 'no', texto: 'No',
          impedimento: { tipo: 'definitivo', motivo: 'Solo mayores de edad.',
                         remedio: null, nota: 'Desaparece al cumplir 18.',
                         fundamento: 'CCF art. 646' } } ] },
    { clave: 'mv', id: 'modo', etapa: 'modo', texto: '¿De qué vives?',
      si: [{ pregunta: 'edad', es: ['si'] }],
      opciones: [
        { clave: 'a', id: 'asalariado', texto: 'Asalariado', documentos: ['pa-ingresos'] },
        { clave: 'i', id: 'independiente', texto: 'Independiente' } ] },
    { clave: 'ct', id: 'contador', etapa: 'modo', texto: '¿Tienes contador con cédula?',
      si: [{ pregunta: 'modo', es: ['independiente'] }],
      opciones: [
        { clave: 's', id: 'si', texto: 'Sí', documentos: ['pa-ingresos'] },
        { clave: 'n', id: 'no', texto: 'No',
          impedimento: { tipo: 'subsanable', motivo: 'Falta la constancia del contador.',
                         remedio: 'Cualquier contador titulado con cédula puede emitirla.',
                         fundamento: 'Formato, requisito 2' } } ] },
    { clave: 'uso', id: 'uso', etapa: 'modo', texto: '¿Para qué la quieres?',
      opciones: [
        { clave: 'd', id: 'domicilio', texto: 'Proteger mi casa',
          aviso: { texto: 'En esta modalidad solo se autoriza un arma corta.',
                   fundamento: 'Instructivo, punto 3' } },
        { clave: 't', id: 'tiro', texto: 'Tiro deportivo', documentos: ['pa-club'] } ] },
  ],
};

test('{} → incompleta, pendiente = edad', function () {
  var r = amxEvaluarEntrevista(ARBOL, {});
  assert.equal(r.estado, 'incompleta');
  assert.equal(r.dictamen, null);
  assert.equal(r.pendiente.id, 'edad');
});

test('{ edad: no } → detenida, no-procede', function () {
  var r = amxEvaluarEntrevista(ARBOL, { edad: 'no' });
  assert.equal(r.estado, 'detenida');
  assert.equal(r.dictamen, 'no-procede');
  assert.equal(r.impedimento.remedio, null);
});

test('{ edad:si, modo:asalariado, uso:domicilio } → completa', function () {
  var r = amxEvaluarEntrevista(ARBOL, { edad: 'si', modo: 'asalariado', uso: 'domicilio' });
  assert.equal(r.estado, 'completa');
  assert.equal(r.dictamen, 'reune-requisitos');
  // La pregunta 'contador' NO aplica porque su guarda pide independiente.
  assert.equal(r.recorrido.some(function (x) { return x.pregunta.id === 'contador'; }), false);
});

test('{ edad:si, modo:independiente, contador:no } → falta-requisito', function () {
  var r = amxEvaluarEntrevista(ARBOL, { edad: 'si', modo: 'independiente', contador: 'no' });
  assert.equal(r.dictamen, 'falta-requisito');
  assert.ok(r.impedimento.remedio.toLowerCase().includes('contador'));
});

test('{ edad:si, modo:asalariado, uso:domicilio } → documentos ordenados', function () {
  var r = amxEvaluarEntrevista(ARBOL, { edad: 'si', modo: 'asalariado', uso: 'domicilio' });
  assert.equal(r.documentos[0], 'pa-curp');
  assert.ok(r.documentos.includes('pa-ingresos'));
  assert.equal(r.documentos.length, r.documentos.filter(function (v, i) { return r.documentos.indexOf(v) === i; }).length);
});

test('{ edad:si, modo:asalariado, uso:domicilio } → aviso arma corta', function () {
  var r = amxEvaluarEntrevista(ARBOL, { edad: 'si', modo: 'asalariado', uso: 'domicilio' });
  assert.equal(r.avisos.length, 1);
  assert.ok(r.avisos[0].texto.includes('un arma corta'));
});

test('{ edad: no } → documentos incluye pa-curp aunque detenida', function () {
  var r = amxEvaluarEntrevista(ARBOL, { edad: 'no' });
  assert.ok(r.documentos.includes('pa-curp'));
});

test('ida y vuelta: decodificar(codificar(r)) === r', function () {
  var r = { edad: 'si', modo: 'independiente', contador: 'si', uso: 'tiro' };
  var cod = amxCodificarEntrevista(ARBOL, r);
  var dec = amxDecodificarEntrevista(ARBOL, cod);
  assert.deepEqual(dec.respuestas, r);
});

test('codificar({ edad:si, modo:independiente }) === v20260919.ed-s_mv-i', function () {
  var resultado = amxCodificarEntrevista(ARBOL, { edad: 'si', modo: 'independiente' });
  assert.equal(resultado, 'v20260919.ed-s_mv-i');
});

test('decodificar de v20260919.ed-s_zz-q descarta zz-q, deja { edad:si }', function () {
  var dec = amxDecodificarEntrevista(ARBOL, 'v20260919.ed-s_zz-q');
  assert.deepEqual(dec.respuestas, { edad: 'si' });
  assert.equal(dec.avisos.length, 1);
});

test('amxEvaluarEntrevista(ARBOL, { basura: x }) no lanza → incompleta', function () {
  var r = amxEvaluarEntrevista(ARBOL, { basura: 'x' });
  assert.equal(r.estado, 'incompleta');
  assert.equal(r.dictamen, null);
});

test('progreso.total: asalariado=3, independiente=4', function () {
  var r1 = amxEvaluarEntrevista(ARBOL, { edad: 'si', modo: 'asalariado', uso: 'domicilio' });
  assert.equal(r1.progreso.total, 3);
  var r2 = amxEvaluarEntrevista(ARBOL, { edad: 'si', modo: 'independiente', uso: 'domicilio' });
  assert.equal(r2.progreso.total, 4);
});

// ── Enumeración exhaustiva: TODO camino termina ─────────────────────────────
// Los tests de arriba prueban casos concretos. Este recorre el árbol entero generando
// cada combinación posible de respuestas y comprueba las invariantes en todas. Es lo que
// caza el camino raro que nadie penso en escribir a mano, y lo que hace que meter una
// pregunta nueva al guion no pueda dejar un callejón sin salida en silencio.
function todosLosCaminos(arbol) {
  const caminos = [];
  (function avanzar(respuestas) {
    const d = amxEvaluarEntrevista(arbol, respuestas);
    if (d.estado !== 'incompleta' || !d.pendiente) { caminos.push(respuestas); return; }
    for (const o of d.pendiente.opciones) avanzar(Object.assign({}, respuestas, { [d.pendiente.id]: o.id }));
  })({});
  return caminos;
}

test('todo camino del árbol termina en un dictamen, y ninguno lanza', () => {
  const caminos = todosLosCaminos(ARBOL);
  assert.ok(caminos.length >= 4, 'se esperaban varios caminos, hay ' + caminos.length);
  for (const respuestas of caminos) {
    const etiqueta = JSON.stringify(respuestas);
    const d = amxEvaluarEntrevista(ARBOL, respuestas);
    assert.notEqual(d.estado, 'incompleta', 'camino sin salida: ' + etiqueta);
    assert.ok(d.dictamen, 'camino sin dictamen: ' + etiqueta);

    // El estado y el dictamen no pueden contradecirse.
    if (d.estado === 'completa') {
      assert.equal(d.dictamen, 'reune-requisitos', etiqueta);
      assert.equal(d.impedimento, null, etiqueta);
      assert.equal(d.pendiente, null, etiqueta);
    } else {
      assert.equal(d.estado, 'detenida', etiqueta);
      assert.ok(d.impedimento, 'detenida sin impedimento: ' + etiqueta);
      assert.equal(d.dictamen, d.impedimento.tipo === 'definitivo' ? 'no-procede' : 'falta-requisito', etiqueta);
      // Un definitivo no puede insinuar una salida que no existe.
      if (d.impedimento.tipo === 'definitivo') assert.equal(d.impedimento.remedio, null, etiqueta);
    }

    // Los documentos de `siempre` salen en todos los caminos, hasta en los detenidos,
    // y nunca repetidos: son ciertos el día que el impedimento deje de existir.
    for (const id of ARBOL.siempre) assert.ok(d.documentos.includes(id), etiqueta);
    assert.equal(new Set(d.documentos).size, d.documentos.length, 'documentos repetidos: ' + etiqueta);

    // El enlace compartible sobrevive la ida y vuelta en cualquier camino.
    const vuelta = amxDecodificarEntrevista(ARBOL, amxCodificarEntrevista(ARBOL, respuestas));
    assert.deepEqual(vuelta.respuestas, respuestas, 'el enlace pierde respuestas: ' + etiqueta);
  }
});

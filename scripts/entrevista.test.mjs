// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { transformSync } from '@babel/core';

globalThis.window = globalThis;
vm.runInThisContext(
  readFileSync(
    fileURLToPath(new URL('../src/lib/entrevista.js', import.meta.url)),
    'utf8',
  ),
);
vm.runInThisContext(
  readFileSync(
    fileURLToPath(new URL('../src/data/data-entrevista.js', import.meta.url)),
    'utf8',
  ),
);

const ENTREVISTA_ACTUAL = globalThis.AMX_ENTREVISTA;

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

test('el guion nuevo no concede documentos antes de responder', function () {
  var r = amxEvaluarEntrevista(ENTREVISTA_ACTUAL, {});
  assert.deepEqual(r.documentos, []);
});

test('una mujer nacida en México nunca recibe la pregunta de cartilla', function () {
  var r = amxEvaluarEntrevista(ENTREVISTA_ACTUAL, {
    nacimiento: 'mx',
    sexo: 'mujer',
    edad: 'si',
    militar: 'no',
    'modo-vivir': 'asalariado',
    'carta-trabajo': 'si',
    antecedentes: 'no',
    uso: 'domicilio',
    domicilio: 'a-mi-nombre',
    medico: 'si',
    nombres: 'si',
  });
  assert.equal(r.estado, 'completa');
  assert.equal(r.recorrido.some(function (x) { return x.pregunta.id === 'cartilla'; }), false);
});

test('al personal militar no se le pregunta por la cartilla', function () {
  // Antes «Soy personal militar» era una opción DENTRO de la cartilla, así que
  // la pregunta llegaba igual y el militar sin cartilla liberada se llevaba un
  // impedimento que no le corresponde. Ahora se pregunta antes y se le salta.
  var r = amxEvaluarEntrevista(ENTREVISTA_ACTUAL, {
    nacimiento: 'mx', sexo: 'hombre', edad: 'si', militar: 'si',
  });
  assert.equal(r.recorrido.some(function (x) { return x.pregunta.id === 'cartilla'; }), false);
  assert.equal(r.documentos.includes('pa-smn'), false);
  assert.equal(r.escenarios.includes('militar'), true);
});

test('una mujer militar también recibe el aviso del formato militar', function () {
  // El caso que la versión anterior no cubría: la cartilla no se le preguntaba,
  // así que nunca veía la opción y se iba con el expediente civil sin aviso.
  var r = amxEvaluarEntrevista(ENTREVISTA_ACTUAL, {
    nacimiento: 'mx', sexo: 'mujer', edad: 'si', militar: 'si',
  });
  assert.equal(r.escenarios.includes('militar'), true);
  assert.ok(r.avisos.some(function (a) { return /formato de CIVILES/.test(a.texto); }),
    'no sale el aviso de que esta entrevista es la de civiles');
});

test('la pregunta del trabajo tiene cuatro respuestas y ninguna salida de escape', function () {
  var p = ENTREVISTA_ACTUAL.preguntas.find(function (x) { return x.id === 'modo-vivir'; });
  assert.equal(p.texto, '¿Cómo es tu trabajo?');
  assert.equal(p.opciones.length, 4);
  assert.equal(p.opciones.some(function (o) { return o.id === 'ninguno'; }), false);
  // El dato que vivía en el impedimento de la quinta opción no se pierde.
  assert.match(p.ayuda, /contador público con cédula profesional/);
});

test('una persona extranjera recibe residencia y no acta de nacimiento', function () {
  var r = amxEvaluarEntrevista(ENTREVISTA_ACTUAL, { nacimiento: 'extranjero' });
  assert.equal(r.documentos.includes('pa-acta-nacimiento'), false);
  assert.equal(r.documentos.includes('pa-residencia'), true);
});

test('ser mayor de edad añade la identificación al expediente', function () {
  var r = amxEvaluarEntrevista(ENTREVISTA_ACTUAL, { edad: 'si' });
  assert.equal(r.documentos.includes('pa-identificacion'), true);
});

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

// El puente entre el guion y el corpus: la opcion declara su `escenario` y el evaluador
// lo acumula, para que amxRequisitosDe pueda elegir la variante del documento que le toca
// a esta persona. Sin esto, el guion puede partir un escenario en dos opciones (hombre con
// cartilla liberada y sin ella) y la variante se cae del expediente en silencio.
test('el evaluador acumula los escenarios que declaran las opciones', () => {
  const arbol = {
    version: '2026-09-19', siempre: [],
    preguntas: [
      { clave: 'pe', id: 'persona', texto: '¿Quién eres?', opciones: [
        { clave: 'h', id: 'hombre-con-cartilla', texto: 'Hombre con cartilla', escenario: 'hombre' },
        { clave: 'm', id: 'mujer', texto: 'Mujer', escenario: 'mujer' } ] },
      { clave: 'mv', id: 'modo', texto: '¿De qué vives?', opciones: [
        { clave: 'a', id: 'asalariado', texto: 'Asalariado', escenario: 'asalariado' },
        { clave: 'x', id: 'ninguno', texto: 'De nada por ahora' } ] },
    ],
  };
  // El id de la opción y el del escenario NO son el mismo: por eso hace falta declararlo.
  const d = amxEvaluarEntrevista(arbol, { persona: 'hombre-con-cartilla', modo: 'asalariado' });
  assert.deepEqual(d.escenarios, ['hombre', 'asalariado']);
  // Una opción sin `escenario` no aporta ninguno, y no rompe nada.
  const d2 = amxEvaluarEntrevista(arbol, { persona: 'mujer', modo: 'ninguno' });
  assert.deepEqual(d2.escenarios, ['mujer']);
  // Sin respuestas, la lista viene vacía y no undefined: la forma no cambia.
  assert.deepEqual(amxEvaluarEntrevista(arbol, {}).escenarios, []);
});

test('la hoja PNG ajusta texto por palabras y parte una palabra que no cabe', () => {
  const fuente = readFileSync(
    fileURLToPath(new URL('../src/screens/screens-entrevista.jsx', import.meta.url)),
    'utf8',
  );
  const compilado = transformSync(fuente, {
    babelrc: false,
    configFile: false,
    presets: [['@babel/preset-react', { runtime: 'classic' }]],
  }).code;
  const contexto = { window: {}, React: {}, console };
  vm.runInNewContext(compilado, contexto);
  const ajustar = contexto.window.amxEntrevistaAjustarTexto;
  const ctx = { measureText: (texto) => ({ width: Array.from(texto).length * 10 }) };

  const lineas = Array.from(ajustar(ctx, 'motivo legal con varias palabras', 100));
  assert.equal(lineas.join(' '), 'motivo legal con varias palabras');
  assert.ok(lineas.every((linea) => ctx.measureText(linea).width <= 100));

  const palabraLarga = Array.from(ajustar(ctx, 'documentoextraordinariamentelargo', 70));
  assert.equal(palabraLarga.join(''), 'documentoextraordinariamentelargo');
  assert.ok(palabraLarga.every((linea) => ctx.measureText(linea).width <= 70));
});

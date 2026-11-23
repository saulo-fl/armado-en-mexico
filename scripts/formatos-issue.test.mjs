// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// Los formatos del reporte interno son un DERIVADO de los Issue Forms de GitHub.
// Estas pruebas fallan si alguien toca un .yml de .github/ISSUE_TEMPLATE/ sin
// correr `npm run formatos`, o si edita a mano alguna de las dos copias generadas.
// Es lo que garantiza que un reporte hecho en armado.mx salga con el mismo formato
// que uno hecho en GitHub.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import {
  leerFormatos, validarFormato, generarNavegador, generarFunctions,
  SALIDA_NAVEGADOR, SALIDA_FUNCTIONS,
} from './formatos-issue.mjs';
import { FORMATOS } from '../functions/api/_formatos.js';

// core.autocrlf de Windows deja CRLF en la copia de trabajo; el generador escribe LF.
const leer = (ruta) => readFileSync(ruta, 'utf8').replace(/\r\n/g, '\n');
const formatos = leerFormatos();

const idsCampo = (f) => f.body.filter((c) => c.type !== 'markdown').map((c) => c.id);
const obligatorio = (c) => c.type === 'checkboxes'
  ? c.attributes.options.some((o) => o.required === true)
  : !!(c.validations && c.validations.required === true);

test('las dos copias generadas están al día con los .yml', () => {
  assert.equal(leer(SALIDA_NAVEGADOR), generarNavegador(formatos), 'src/lib/formatos-issue.js desfasado: corre `npm run formatos`');
  assert.equal(leer(SALIDA_FUNCTIONS), generarFunctions(formatos), 'functions/api/_formatos.js desfasado: corre `npm run formatos`');
});

test('navegador y Functions ven exactamente los mismos formatos', () => {
  const sandbox = { window: {} };
  vm.runInNewContext(readFileSync(SALIDA_NAVEGADOR, 'utf8'), sandbox);
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.window.AMX_FORMATOS_ISSUE)), FORMATOS);
  assert.deepEqual(Object.keys(FORMATOS), ['correccion', 'fallo']);
});

test('corrección conserva sus 9 campos obligatorios, título y etiqueta', () => {
  const f = FORMATOS.correccion;
  assert.equal(f.archivo, 'correccion.yml');
  assert.equal(f.title, '[Corrección]: ');
  assert.deepEqual(f.labels, ['documentation']);
  assert.deepEqual(idsCampo(f),
    ['pagina', 'tipo', 'nombre', 'dato_actual', 'correccion', 'fuentes', 'relacion', 'pull_request', 'derechos']);
  for (const c of f.body.filter((x) => x.type !== 'markdown')) assert.ok(obligatorio(c), `${c.id} debe ser obligatorio`);
});

test('fallo pide qué pasó, qué se esperaba, pasos y frecuencia; dispositivo y captura son opcionales', () => {
  const f = FORMATOS.fallo;
  assert.equal(f.archivo, 'fallo.yml');
  assert.equal(f.title, '[Fallo]: ');
  assert.deepEqual(f.labels, ['bug']);
  assert.deepEqual(idsCampo(f),
    ['pagina', 'que_paso', 'que_esperabas', 'pasos', 'frecuencia', 'dispositivo', 'captura', 'privacidad']);
  const porId = Object.fromEntries(f.body.filter((c) => c.id).map((c) => [c.id, c]));
  for (const id of ['pagina', 'que_paso', 'que_esperabas', 'pasos', 'frecuencia', 'privacidad']) {
    assert.ok(obligatorio(porId[id]), `${id} debe ser obligatorio`);
  }
  assert.ok(!obligatorio(porId.dispositivo));
  assert.ok(!obligatorio(porId.captura));
  assert.deepEqual(porId.frecuencia.attributes.options, ['Siempre', 'A veces', 'Solo una vez']);
});

test('el generador rechaza lo que el formulario web no sabría pintar', () => {
  const base = () => ({
    name: 'X', description: 'X', title: '[X]: ', labels: ['bug'],
    body: [{ type: 'input', id: 'uno', attributes: { label: 'Uno' } }],
  });
  assert.doesNotThrow(() => validarFormato(base(), 'x.yml'));

  const tipoRaro = base();
  tipoRaro.body.push({ type: 'upload', id: 'dos', attributes: { label: 'Dos' } });
  assert.throws(() => validarFormato(tipoRaro, 'x.yml'), /no soportado/);

  const repetido = base();
  repetido.body.push({ type: 'textarea', id: 'uno', attributes: { label: 'Otra' } });
  assert.throws(() => validarFormato(repetido, 'x.yml'), /repetido/);

  const sinOpciones = base();
  sinOpciones.body.push({ type: 'dropdown', id: 'tres', attributes: { label: 'Tres', options: [] } });
  assert.throws(() => validarFormato(sinOpciones, 'x.yml'), /opciones/);

  const sinEtiquetas = base();
  sinEtiquetas.labels = [];
  assert.throws(() => validarFormato(sinEtiquetas, 'x.yml'), /labels/);
});

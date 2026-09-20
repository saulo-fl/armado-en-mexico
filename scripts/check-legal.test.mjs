// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// Prueba del JUEZ, no del corpus. Un juez que no caza nada pasa siempre y da una
// falsa sensación de respaldo, que en contenido legal es peor que no tenerlo: por eso
// se le siembran defectos a propósito y se comprueba que los encuentra.
//
// El corpus sano de aquí es un MÍNIMO artificial, no el de producción: dos entidades
// en vez de 32 (y por eso el propio caso sano espera ese error), lo justo para que
// cada invariante tenga algo que morder.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { revisarLegal, revisarEntrevista } from './check-legal.mjs';

const HOY = '2026-09-19';

// Corpus mínimo y sano, salvo que solo trae 2 de las 32 entidades.
const sano = () => ({
  version: 1,
  actualizado: '2026-09-19',
  advertencia: 'La información mostrada es de carácter informativo. Consulta siempre la normativa y fuente oficial vigente.',
  fuentes: {
    'formato-040': {
      titulo: 'Formato DEFENSA-02-040 Civ.',
      emisor: 'Dirección General del Registro Federal de Armas de Fuego y Control de Explosivos',
      nivel: 1,
      url: 'https://www.gob.mx/defensa/acciones-y-programas/comercializacion-de-armas',
      pdf: true,
      fechaConsulta: '2026-09-19',
    },
    'lfafe': {
      titulo: 'Ley Federal de Armas de Fuego y Explosivos',
      emisor: 'Cámara de Diputados',
      revisar: true,
      nota: 'HUECO — falta fijar la URL del texto vigente y la fecha de la última reforma.',
    },
  },
  escenarios: [
    { id: 'asalariado', eje: 'ingresos', label: 'Asalariado' },
    { id: 'ejidatario', eje: 'ingresos', label: 'Ejidatario, comunero o jornalero del campo' },
  ],
  normas: [
    { id: 'formato', rango: 'formato', rotulo: 'DEFENSA-02-040 Civ.',
      fundamento: 'Instructivo del formato DEFENSA-02-040 Civ. (mayo 2021)', fuente: 'formato-040' },
  ],
  articulos: [
    { id: 'lfafe-9', norma: null, numero: '9o', rotulo: 'Art. 9o LFAFE',
      revisar: true, nota: 'HUECO — depende de la fuente lfafe, que aún no tiene URL.' },
  ],
  tramites: [
    { id: 'permiso', clase: 'permiso', homoclave: 'DEFENSA-02-040',
      nombre: 'Permiso extraordinario de adquisición',
      requisitos: ['ingresos'],
      costo: { monto: 490, moneda: 'MXN', anio: 2026, fuente: 'formato-040' },
      fundamento: 'Instructivo del formato DEFENSA-02-040 Civ.', fuente: 'formato-040' },
  ],
  requisitos: [
    { id: 'ingresos', tramite: 'permiso', orden: 2, nombre: 'Comprobante de ingresos', original: true,
      variantes: [
        { escenario: 'asalariado', documento: 'Carta de trabajo original con membrete.' },
        { escenario: 'ejidatario', documento: 'Certificado del Comisariado Ejidal inscrito en el Registro Agrario Nacional.' },
      ],
      fundamento: 'Instructivo del formato DEFENSA-02-040 Civ., requisito 2', fuente: 'formato-040' },
  ],
  entidades: [
    { id: 'mx-cmx', nombre: 'Ciudad de México',
      antecedentes: { dependencia: 'Dirección del Archivo Nacional de Sentenciados y Estadística Penitenciaria, SSPC',
                      url: 'https://www.gob.mx/sspc', enLinea: false },
      fundamento: 'Instructivo del formato DEFENSA-02-040 Civ., requisito 3', fuente: 'formato-040' },
    { id: 'mx-jal', nombre: 'Jalisco',
      antecedentes: { revisar: true, nota: 'HUECO — falta verificar el portal de la fiscalía.' },
      revisar: true, nota: 'HUECO — sin verificar.' },
  ],
});

// Solo el error de «faltan entidades», que el corpus mínimo tiene a propósito.
const ESPERADO_BASE = 1;
const revisar = (c) => revisarLegal(c, { hoy: HOY });
const textos = (r) => r.errores.join('\n');

test('el corpus sano solo se queja de las entidades que faltan', () => {
  const r = revisar(sano());
  assert.equal(r.errores.length, ESPERADO_BASE, 'errores inesperados:\n' + textos(r));
  assert.match(textos(r), /hay 2 y México tiene 32/);
});

test('defecto 1 · afirmación sin fuente', () => {
  const c = sano();
  delete c.normas[0].fuente;
  assert.match(textos(revisar(c)), /normas:formato — sin `fuente`/);
});

test('defecto 2 · hueco sin nota que lo explique', () => {
  const c = sano();
  delete c.articulos[0].nota;
  assert.match(textos(revisar(c)), /articulos:lfafe-9 — marcado `revisar` y sin `nota`/);
});

test('defecto 3 · URL que no es de un dominio oficial', () => {
  const c = sano();
  c.fuentes['formato-040'].url = 'https://es.wikipedia.org/wiki/LFAFE';
  assert.match(textos(revisar(c)), /no es un dominio oficial \(\*\.gob\.mx\): es\.wikipedia\.org/);
});

test('defecto 4 · referencia a una fuente que no existe', () => {
  const c = sano();
  c.normas[0].fuente = 'acuerdo-que-no-escribi';
  assert.match(textos(revisar(c)), /apunta a "acuerdo-que-no-escribi", que no existe/);
});

test('defecto 5 · el requisito se cae del checklist', () => {
  const c = sano();
  c.tramites[0].requisitos = [];
  const t = textos(revisar(c));
  assert.match(t, /requisitos:ingresos — dice pertenecer a "permiso", pero ese trámite no lo lista/);
});

test('defecto 6 · fecha de consulta caducada', () => {
  const c = sano();
  c.fuentes['formato-040'].fechaConsulta = '2024-01-01';
  assert.match(textos(revisar(c)), /consultada hace \d+ días: por encima de 365 no se publica/);
});

test('defecto 7 · clave de iconografía oficial', () => {
  const c = sano();
  c.tramites[0].escudo = 'imagenes/aguila.png';
  assert.match(textos(revisar(c)), /clave "escudo" prohibida/);
});

test('la advertencia obligatoria va literal', () => {
  const c = sano();
  c.advertencia = 'La información es informativa.';
  assert.match(textos(revisar(c)), /falta la advertencia obligatoria literal/);
});

test('una variante no puede apuntar a un escenario inexistente', () => {
  const c = sano();
  c.requisitos[0].variantes[0].escenario = 'astronauta';
  assert.match(textos(revisar(c)), /"astronauta" no existe en la tabla escenarios/);
});

test('un hueco con respaldo completo ya no es un hueco', () => {
  const c = sano();
  c.articulos[0].fundamento = 'art. 9o LFAFE';
  c.articulos[0].fuente = 'formato-040';
  assert.match(textos(revisar(c)), /quítale la marca o quítale el respaldo/);
});

test('la cuota de un año pasado sale como aviso, no como error', () => {
  const c = sano();
  c.tramites[0].costo.anio = 2025;
  const r = revisar(c);
  assert.equal(r.errores.length, ESPERADO_BASE, 'no debería sumar errores:\n' + textos(r));
  assert.match(r.avisos.join('\n'), /es del 2025 y estamos en 2026/);
});

test('la entrevista no puede citar un documento que el corpus no tiene', () => {
  const c = sano();
  const arbol = {
    siempre: ['ingresos'],
    preguntas: [{ id: 'modo', opciones: [{ id: 'a', documentos: ['carta-que-no-existe'] }] }],
  };
  const r = revisarEntrevista(c, arbol);
  assert.equal(r.errores.length, 1);
  assert.match(r.errores[0], /cita el documento "carta-que-no-existe", que no existe en los requisitos del corpus/);
});

test('la entrevista que cita bien no se queja', () => {
  const arbol = { siempre: ['ingresos'], preguntas: [{ id: 'modo', opciones: [{ id: 'a', documentos: ['ingresos'] }] }] };
  assert.equal(revisarEntrevista(sano(), arbol).errores.length, 0);
});

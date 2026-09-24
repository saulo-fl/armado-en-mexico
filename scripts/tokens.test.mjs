// Armado en México — el JSON de tokens para Penpot es un DERIVADO del CSS.
// Estas pruebas fallan si alguien toca el :root de estilo.css sin volver a
// correr `npm run tokens`, o si edita docs/penpot/tokens.json a mano.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generar, contar } from './tokens-dtcg.mjs';

const css = readFileSync(new URL('../src/styles/estilo.css', import.meta.url), 'utf8');
const json = JSON.parse(readFileSync(new URL('../docs/penpot/tokens.json', import.meta.url), 'utf8'));

test('docs/penpot/tokens.json está al día con el :root de estilo.css', () => {
  assert.deepEqual(json, generar(css));
});

test('los tres sets existen y el modo claro y el oscuro tienen los MISMOS nombres', () => {
  assert.deepEqual(json.$metadata.tokenSetOrder, ['core', 'modo/claro', 'modo/oscuro']);
  const hojas = (set, ruta = '') => Object.entries(set).flatMap(([k, v]) =>
    v && typeof v === 'object' && '$type' in v ? [ruta + k] : hojas(v, ruta + k + '.'));
  assert.deepEqual(hojas(json['modo/claro']).sort(), hojas(json['modo/oscuro']).sort());
  assert.ok(contar(json.core) > 60 && contar(json['modo/claro']) > 20, 'se perdieron tokens al generar');
});

test('un token con gemelo --d- nunca cae en core, y uno sin gemelo nunca cae en modo', () => {
  assert.equal(json.core.color.lienzo, undefined);              // tiene --d-lienzo
  assert.equal(json['modo/claro'].color.lienzo.$value, '#E7EAE4');
  assert.equal(json['modo/oscuro'].color.lienzo.$value, '#1D1D1D');
  assert.equal(json.core.color['copia-carton'].$value, '#F7F8F4'); // diegético, sin gemelo
  assert.equal(json['modo/claro'].color['copia-carton'], undefined);
});

test('los estilos de texto calcan las reglas del CSS (.t-titulo y .amx-dymo)', () => {
  const titulo = css.match(/\.amx-v2 \.t-titulo\s*\{([^}]*)\}/)[1];
  const dymo = css.match(/\.amx-v2 \.amx-dymo\s*\{([^}]*)\}/)[1];
  const h1 = json.core.tipo['titulo-h1'].$value;
  assert.equal(h1.fontWeights, titulo.match(/font-weight:\s*(\d+)/)[1]);
  assert.equal(h1.textCase, titulo.match(/text-transform:\s*(\w+)/)[1]);
  assert.equal(h1.lineHeights, titulo.match(/line-height:\s*([\d.]+)/)[1]);
  const em = parseFloat(titulo.match(/letter-spacing:\s*([\d.]+)em/)[1]);
  assert.equal(h1.letterSpacing, String(Math.round(em * 26 * 100) / 100));
  const cinta = json.core.tipo.dymo.$value;
  assert.equal(cinta.fontSizes, dymo.match(/font-size:\s*(\d+)px/)[1]);
  const emDymo = parseFloat(dymo.match(/letter-spacing:\s*([\d.]+)em/)[1]);
  assert.equal(cinta.letterSpacing, String(Math.round(emDymo * parseInt(cinta.fontSizes) * 100) / 100));
});

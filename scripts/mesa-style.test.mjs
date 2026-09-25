// Armado en México — contrato visual de las superficies de mesa.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const cssPath = fileURLToPath(new URL('../src/styles/estilo.css', import.meta.url));
const css = readFileSync(cssPath, 'utf8');
const ui = readFileSync(fileURLToPath(new URL('../src/components/ui.jsx', import.meta.url)), 'utf8');
const municiones = readFileSync(fileURLToPath(new URL('../src/screens/screens-municiones.jsx', import.meta.url)), 'utf8');
const accesorios = readFileSync(fileURLToPath(new URL('../src/screens/screens-accesorios.jsx', import.meta.url)), 'utf8');

test('las baldas de Accesorios conservan su superficie de mesa', () => {
  assert.match(css, /\.amx-mesa-fila\s*\{[\s\S]*?--mesa-superficie:\s*var\(--mesa-madera\)/);
  assert.match(css, /\.amx-mesa-fila::after\s*\{[\s\S]*?background:\s*var\(--mesa-superficie\)/);
});

test('el mostrador de calibres NO lleva tabla: solo pared, cartuchos y etiquetas', () => {
  // Se desliza mucho, y la madera corriendo por delante de los cartuchos
  // mareaba. El anaquel ya pone la pared detrás, que es todo el suelo que
  // necesitan. La mesa se queda donde sí sostiene algo: las baldas.
  const mostrador = css.match(/\.amx-v2 \.amx-mostrador \{[^}]*\}/);
  assert.ok(mostrador, 'no encuentro la regla del mostrador');
  assert.doesNotMatch(mostrador[0], /--mesa-superficie/,
    'el mostrador no debe declarar superficie de mesa');
  assert.doesNotMatch(css, /\.amx-mostrador \.amx-repisa-carril\s*\{[^}]*background:\s*var\(--mesa-superficie\)/,
    'el carril del mostrador no debe pintar la tabla');
});

test('ninguna repisa se queda sin su pared', () => {
  // El canto de madera y la pared son los mismos para la vitrina de la ficha,
  // las categorías de accesorios y los mostradores de calibres. Una repisa sin
  // pared detrás flota sobre el fondo de la página y se lee como un error.
  assert.match(css,
    /\.amx-vitrina,\s*\.amx-v2 \.amx-vitrina-acc-seccion,\s*\.amx-v2 \.amx-anaquel \{[^}]*border: 10px solid var\(--mesa-canto\)/,
    'los tres muebles deben compartir el canto y la pared');
  // Y el mostrador de calibres va DENTRO de su mueble, no suelto.
  assert.match(ui, /amx-anaquel amx-anaquel--mostrador[\s\S]{0,240}amx-repisa-fila amx-mostrador/,
    'el mostrador de calibres debe ir envuelto en su anaquel');
});

test('MesaPuestos ofrece etiquetas opcionales y conserva el letrero por defecto', () => {
  assert.match(ui,
    /function MesaPuestos\(\{ items, porFila, renderPuesto, renderEtiqueta \}\)/,
    'falta el contrato renderEtiqueta');
  assert.match(ui,
    /renderEtiqueta[\s\S]{0,900}amx-mesa-etiquetas[\s\S]{0,900}amx-etiqueta/,
    'el contenido opcional no llega a un carril de etiquetas');
  assert.match(ui,
    /rotulo &&[\s\S]{0,500}amx-puesto-letrero[\s\S]{0,500}amx-puesto-palo/,
    'letrero y vara deben desaparecer juntos cuando no hay rótulo');
  assert.match(accesorios, /rotulo=\{a\.corto\}/,
    'Accesorios debe conservar sus letreros');
});

test('el carril de etiquetas comparte columnas y no mueve la mesa de Accesorios', () => {
  assert.match(css,
    /\.amx-mesa-etiquetas\s*\{[^}]*grid-template-columns:\s*repeat\(var\(--por-fila\), minmax\(0, 1fr\)\)/,
    'productos y etiquetas deben usar las mismas columnas');
  assert.match(css,
    /\.amx-mesa-etiquetas \.amx-etiqueta\s*\{[^}]*margin-top:\s*-4px/,
    'la cinta debe montar la etiqueta sobre el frente de madera');
  assert.doesNotMatch(css,
    /\.amx-mesa-fila(?![^,{]*--etiquetas)[^{]*\{[^}]*padding-bottom/,
    'la mesa base de Accesorios no debe reservar espacio de etiqueta');
});

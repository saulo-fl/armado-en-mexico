// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// El recorrido de bienvenida (27-sep-2026) navega por páginas de verdad y busca en cada
// una un apartado por su clase. Si una ruta deja de existir o una clase cambia de nombre,
// la parada se salta en silencio a los 4 s y nadie se entera: esta prueba es la que avisa.
// Además fija la geometría de la nota: nunca tapa el marco ni se sale de la ventana.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { transformSync } from '@babel/core';

const raiz = (p) => fileURLToPath(new URL('../' + p, import.meta.url));
const jsx = (f) => transformSync(readFileSync(raiz(f), 'utf8'),
  { presets: [['@babel/preset-react', { runtime: 'classic' }]], filename: f }).code;

// Los datos reales, el ruteo real de app.jsx y el recorrido real; React no hace falta.
const ctx = vm.createContext({ console, React: {} });
ctx.window = ctx;
vm.runInContext(readFileSync(raiz('src/data/data.js'), 'utf8'), ctx);
vm.runInContext(readFileSync(raiz('src/lib/cotejo.js'), 'utf8'), ctx);
vm.runInContext(jsx('src/app.jsx'), ctx);
vm.runInContext(jsx('src/screens/screens-tutorial.jsx'), ctx);
const { PARADAS, colocarNota } = ctx.RecorridoSitio;

test('son doce paradas, cada una con su cinta y su nota', () => {
  assert.equal(PARADAS.length, 12);
  for (const p of PARADAS) assert.ok(p.cinta && p.nota && p.sel.length, 'parada incompleta: ' + p.ruta);
});

test('cada ruta es una página del sitio: se lee y se vuelve a escribir igual', () => {
  const nombre = (id) => ctx.DB.find((a) => a.id === id).nombre;
  for (const { ruta } of PARADAS) {
    const s = ctx.amxParsePath(ruta);
    assert.notEqual(s.screen, 'home', ruta + ' cae en la portada');
    const vuelta = ctx.amxBuildPath(s.screen, s.productId, s.accesorioId, s.municionId, s.calibreId, s.catalogFilter, s.compareIds);
    assert.equal('/' + vuelta, ruta, ruta + ' no es la dirección de ninguna página');
    if (s.screen === 'product') assert.equal(nombre(s.productId), 'Glock 25');
    if (s.screen === 'compare') assert.equal(s.compareIds.map(nombre).join(' vs '), 'Glock 25 vs Glock 28');
  }
});

test('cada apartado existe en el marcado de alguna pantalla', () => {
  const dirs = ['src/screens', 'src/components'];
  const fuente = dirs.flatMap((d) => readdirSync(raiz(d)).filter((f) => f.endsWith('.jsx') && f !== 'screens-tutorial.jsx')
    .map((f) => readFileSync(raiz(d + '/' + f), 'utf8'))).join('\n') + readFileSync(raiz('src/app.jsx'), 'utf8');
  for (const p of PARADAS) for (const sel of p.sel) {
    for (const [, clase] of sel.matchAll(/\.([a-z0-9-]+)/g)) {
      assert.match(fuente, new RegExp('(?<![a-z0-9-])' + clase + '(?![a-z0-9-])'), `${p.cinta}: la clase ${clase} no está en ninguna pantalla`);
    }
  }
});

// ── La geometría ─────────────────────────────────────────────────────────
const cruzan = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const ESCRITORIO = { ancho: 1280, alto: 800, arriba: 72, abajo: 0, movil: false };
const NOTA = { ancho: 360, alto: 220 };
function sinCruce(r, v, n, lado) {
  const g = colocarNota(r, v, n);
  if (lado) assert.equal(g.lado, lado);
  assert.ok(g.marco.h > 40, 'el marco quedó sin altura: ' + JSON.stringify(g.marco));
  if (g.nota) {
    const nota = { x: g.nota.x, y: g.nota.y, w: n.ancho, h: n.alto };
    assert.ok(!cruzan(nota, g.marco), 'la nota tapa el marco: ' + JSON.stringify(g));
    assert.ok(nota.x >= 0 && nota.y >= v.arriba && nota.x + nota.w <= v.ancho && nota.y + nota.h <= v.alto,
      'la nota se sale de la ventana: ' + JSON.stringify(g));
  }
  assert.ok(g.marco.y >= v.arriba && g.marco.y + g.marco.h <= v.alto - v.abajo, 'el marco se sale de la franja visible');
  return g;
}

test('escritorio: la nota va al lado del apartado cuando cabe (la carpeta legal de la ficha)', () => {
  sinCruce({ top: 84, bottom: 814, left: 108, right: 491 }, ESCRITORIO, NOTA, 'derecha');
  sinCruce({ top: 84, bottom: 636, left: 543, right: 1172 }, ESCRITORIO, NOTA, 'izquierda');
});

test('escritorio: un apartado ancho y más alto que la pantalla se recorta y la nota va debajo', () => {
  sinCruce({ top: 84, bottom: 936, left: 258, right: 1022 }, ESCRITORIO, NOTA, 'abajo');
});

test('escritorio: un apartado al final de la página, que ya no sube, lleva la nota encima', () => {
  sinCruce({ top: 560, bottom: 720, left: 0, right: 1280 }, ESCRITORIO, NOTA, 'arriba');
});

test('móvil: el marco termina antes de la nota fija de abajo, también en un teléfono chico', () => {
  const g = sinCruce({ top: 70, bottom: 1455, left: 16, right: 374 }, { ancho: 360, alto: 640, arriba: 58, abajo: 360, movil: true }, NOTA, 'movil');
  assert.ok(g.marco.y + g.marco.h <= 640 - 360 - 16);
  assert.ok(g.marco.x >= 0 && g.marco.x + g.marco.w <= 360, 'el marco se sale por los lados');
});

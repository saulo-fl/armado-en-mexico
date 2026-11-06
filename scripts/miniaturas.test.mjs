// Miniaturas de public/imagenes/ (fase 4.2 de velocidad, 6-nov-2026).
// Las tarjetas piden `imagenes/400/<ruta>` por srcset. Si una foto se agrega o se
// reemplaza sin regenerar su miniatura, el sitio sirve una vieja (o un 404 que
// obliga a reintentar con el original). Esta prueba lo impide:
//   uv run scripts/miniaturas.py   → regenera lo que falte y actualiza scripts/miniaturas.json
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformSync } from '@babel/core';

const IMAGENES = fileURLToPath(new URL('../public/imagenes/', import.meta.url));
const MANIFIESTO = JSON.parse(readFileSync(new URL('./miniaturas.json', import.meta.url), 'utf8'));
const RASTER = new Set(['.webp', '.png', '.jpg', '.jpeg']);
const GENERADAS = new Set(['400', '800']);
const ARREGLO = 'Ejecuta: uv run scripts/miniaturas.py';

function archivos(dir) {
  return readdirSync(dir).flatMap((n) => {
    const r = join(dir, n);
    return statSync(r).isDirectory() ? archivos(r) : [r];
  });
}
const rel = (r, base = IMAGENES) => relative(base, r).split(sep).join('/');
const originales = archivos(IMAGENES)
  .filter((r) => RASTER.has(extname(r).toLowerCase()) && !GENERADAS.has(rel(r).split('/')[0]))
  .map((r) => rel(r));

test('cada imagen del repo tiene miniatura de 400 px al día con su original', () => {
  const faltan = [], viejas = [];
  for (const r of originales) {
    const e = MANIFIESTO[r];
    const huella = createHash('sha256').update(readFileSync(join(IMAGENES, r))).digest('hex').slice(0, 16);
    if (!e || e.huella !== huella) { viejas.push(r); continue; }
    for (const a of e.miniaturas) if (!existsSync(join(IMAGENES, String(a), r))) faltan.push(`${a}/${r}`);
    if (!e.miniaturas.includes(400)) faltan.push(`400/${r}`);
    if (e.ancho > 1300 && !e.miniaturas.includes(800)) faltan.push(`800/${r}`);
  }
  assert.deepEqual(viejas, [], `fotos nuevas o reemplazadas sin miniatura al día. ${ARREGLO}`);
  assert.deepEqual(faltan, [], `faltan miniaturas. ${ARREGLO}`);
});

test('no quedan miniaturas huérfanas ni entradas de fotos que ya no existen', () => {
  const huerfanas = [];
  for (const a of GENERADAS) {
    const dir = join(IMAGENES, a);
    if (!existsSync(dir)) continue;
    for (const r of archivos(dir).map((x) => rel(x, dir))) {
      if (!MANIFIESTO[r] || !MANIFIESTO[r].miniaturas.includes(Number(a))) huerfanas.push(`${a}/${r}`);
    }
  }
  assert.deepEqual(huerfanas, [], `miniaturas sin original. ${ARREGLO}`);
  const sinArchivo = Object.keys(MANIFIESTO).filter((r) => !originales.includes(r));
  assert.deepEqual(sinArchivo, [], `scripts/miniaturas.json cita fotos borradas. ${ARREGLO}`);
});

test('una miniatura nunca es más ancha que lo que promete el srcset', () => {
  // Una de 400 que en realidad mida 1200 anula todo el ahorro sin que nada falle.
  const leerAnchoWebp = (b) => {
    const tipo = b.toString('ascii', 12, 16);
    if (tipo === 'VP8X') return 1 + b.readUIntLE(24, 3);
    if (tipo === 'VP8L') return 1 + (b.readUInt32LE(21) & 0x3fff);
    if (tipo === 'VP8 ') return b.readUInt16LE(26) & 0x3fff;
    return null;
  };
  const anchas = [];
  for (const [r, e] of Object.entries(MANIFIESTO)) {
    if (!r.endsWith('.webp')) continue;
    for (const a of e.miniaturas) {
      const w = leerAnchoWebp(readFileSync(join(IMAGENES, String(a), r)));
      if (w != null && w > a) anchas.push(`${a}/${r} mide ${w}`);
    }
  }
  assert.deepEqual(anchas, []);
});

// ui.jsx no es un módulo: se compila y corre con un React fingido (mismo patrón que entrevista.test.mjs).
function cargarUI() {
  const fuente = readFileSync(new URL('../src/components/ui.jsx', import.meta.url), 'utf8');
  const compilado = transformSync(fuente, {
    babelrc: false, configFile: false, presets: [['@babel/preset-react', { runtime: 'classic' }]],
  }).code;
  const React = {
    Component: class {}, memo: (f) => f, useState: (v) => [v, () => {}],
    useRef: () => ({ current: null }), useEffect: () => {}, useMemo: (f) => f(),
    useCallback: (f) => f, createElement: () => null, Fragment: 'f',
  };
  const contexto = { window: {}, React, console, document: { querySelector: () => null, createElement: () => ({}) }, navigator: {} };
  vm.runInNewContext(compilado, contexto);
  return contexto.window;
}

test('imgResponsiva: srcset solo para fotos locales, con la versión ?v= en cada candidata', () => {
  const { imgResponsiva } = cargarUI();
  const plano = (o) => JSON.parse(JSON.stringify(o));
  assert.deepEqual(plano(imgResponsiva('imagenes/002_Taurus_PT58_Plus.webp?v=2', 'auto, 115px')), {
    src: 'imagenes/002_Taurus_PT58_Plus.webp?v=2',
    srcSet: 'imagenes/400/002_Taurus_PT58_Plus.webp?v=2 400w, imagenes/002_Taurus_PT58_Plus.webp?v=2 1200w',
    sizes: 'auto, 115px',
  });
  assert.deepEqual(plano(imgResponsiva('/imagenes/carta-pistola.webp', '250px', { ancho: 1500, con800: true })).srcSet,
    '/imagenes/400/carta-pistola.webp 400w, /imagenes/800/carta-pistola.webp 800w, /imagenes/carta-pistola.webp 1500w');
  assert.equal(plano(imgResponsiva('imagenes/accesorios/mira.webp', '100px')).srcSet,
    'imagenes/400/accesorios/mira.webp 400w, imagenes/accesorios/mira.webp 1200w');
  for (const fuera of ['data:image/webp;base64,AAAA', 'https://i.ytimg.com/vi/x/hqdefault.jpg',
    'imagenes/400/ya-es-miniatura.webp', 'imagenes/mapa.svg', '', null, undefined]) {
    assert.deepEqual(plano(imgResponsiva(fuera, '1px')), plano({ src: fuera }), String(fuera));
  }
  // Toda candidata que imgResponsiva promete para una foto real del repo existe en disco.
  for (const r of originales) {
    const { srcSet } = imgResponsiva('imagenes/' + r, '1px', { con800: (MANIFIESTO[r] || {}).ancho > 1300 });
    if (!srcSet) continue;
    for (const c of srcSet.split(', ')) {
      const ruta = c.split(' ')[0].replace(/^imagenes\//, '').replace(/\?.*$/, '');
      assert.ok(existsSync(join(IMAGENES, ruta)), `${r}: la candidata ${ruta} no existe`);
    }
  }
});

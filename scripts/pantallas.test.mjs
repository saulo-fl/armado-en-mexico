// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// Que un .jsx COMPILE no prueba que RENDERICE. Un `corpus.tramites.find(...)` que
// devuelve undefined compila igual y revienta al pintar; una prop mal escrita compila y
// sale en blanco. Este arnés transpila las pantallas, las ejecuta con un React de mentira
// que solo recoge el árbol, y comprueba contra los DATOS REALES que sale lo que debe.
//
// No sustituye a mirar la pantalla en el navegador —eso es la revisión final con Saulo—,
// pero caza lo que ahí se vería como una página en blanco sin explicación.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { transformSync } from '@babel/core';

const raiz = (p) => fileURLToPath(new URL('../' + p, import.meta.url));

// Un React mínimo: createElement devuelve el nodo tal cual, y useState devuelve el valor
// inicial con un setter que no hace nada. Basta para el primer pintado, que es donde
// aparecen los errores de datos.
function reactDeMentira() {
  return {
    createElement: (tipo, props, ...hijos) => ({ tipo, props: props || {}, hijos: hijos.flat(Infinity) }),
    Fragment: 'Fragment',
    useState: (inicial) => [inicial, () => {}],
    useEffect: () => {},
    useRef: (v) => ({ current: v }),
    useMemo: (f) => f(),
    useCallback: (f) => f,
  };
}

// Aplana el árbol a texto, para poder buscar en él.
function texto(nodo) {
  if (nodo == null || nodo === false || nodo === true) return '';
  if (typeof nodo === 'string' || typeof nodo === 'number') return String(nodo);
  if (Array.isArray(nodo)) return nodo.map(texto).join(' ');
  if (typeof nodo.tipo === 'function') return texto(nodo.tipo(nodo.props));  // baja a la primitiva
  return nodo.hijos ? nodo.hijos.map(texto).join(' ') : '';
}

// Cuenta cuántas veces aparece un tipo de elemento en el árbol, bajando por los hijos.
function contar(nodo, tipo, n) {
  n = n || { v: 0 };
  if (!nodo || typeof nodo !== 'object') return n.v;
  if (Array.isArray(nodo)) { nodo.forEach((x) => contar(x, tipo, n)); return n.v; }
  if (nodo.tipo === tipo) n.v++;
  if (typeof nodo.tipo === 'function') contar(nodo.tipo(nodo.props), tipo, n);
  (nodo.hijos || []).forEach((x) => contar(x, tipo, n));
  return n.v;
}

// Monta el mundo: los datos reales, las librerías reales, las primitivas reales y las
// pantallas, todo en un contexto con el React de mentira.
function montar() {
  const win = {};
  const ctx = vm.createContext({ window: win, console, React: reactDeMentira(), Date });
  ctx.window = win;
  ctx.React = ctx.React;
  for (const f of ['src/data/data-legal.js', 'src/data/data-entrevista.js',
                   'src/lib/legal.js', 'src/lib/entrevista.js']) {
    vm.runInContext(readFileSync(raiz(f), 'utf8'), ctx, { filename: f });
  }
  for (const f of ['src/screens/screens-legalidad.jsx', 'src/screens/screens-entrevista.jsx']) {
    let fuente;
    try { fuente = readFileSync(raiz(f), 'utf8'); } catch (e) { continue; }  // aún no escrita
    const js = transformSync(fuente, { presets: [['@babel/preset-react', { runtime: 'classic' }]], filename: f }).code;
    vm.runInContext(js, ctx, { filename: f });
  }
  return win;
}

const win = montar();

test('el mundo carga: datos, librerías y pantallas', () => {
  assert.ok(win.AMX_LEGAL, 'falta el corpus');
  assert.ok(win.AMX_ENTREVISTA, 'falta el guion');
  assert.ok(typeof win.amxRequisitosDe === 'function', 'falta amxRequisitosDe');
  assert.ok(typeof win.amxEvaluarEntrevista === 'function', 'falta amxEvaluarEntrevista');
});

test('LegalidadHub pinta sin reventar, con los datos reales', (t) => {
  if (!win.LegalidadHub) return t.skip('pantalla aún no escrita');
  const arbol = win.LegalidadHub({ onNav: () => {} });
  assert.ok(arbol, 'devolvió vacío');
  const t2 = texto(arbol);
  assert.match(t2, /Legalidad/i);
  // El bloque de honestidad es la razón de ser del hub: si no lista los huecos, el sitio
  // parece más verificado de lo que está.
  assert.match(t2, /falta por verificar/i, 'no pinta el bloque de huecos');
  const huecos = win.amxLegalHuecos(win.AMX_LEGAL);
  assert.ok(huecos.length > 20, 'el corpus debería traer más de 20 huecos, trae ' + huecos.length);
  assert.ok(t2.includes(huecos[0].nota.slice(0, 40)), 'la nota del primer hueco no sale en pantalla');
});

test('LegalidadRequisitos separa PERMISO de COMPRA, que es el error que corrige', (t) => {
  if (!win.LegalidadRequisitos) return t.skip('pantalla aún no escrita');
  const t2 = texto(win.LegalidadRequisitos({ onNav: () => {} }));
  const C = win.AMX_LEGAL;
  const permiso = C.tramites.find((x) => x.id === 'permiso-adquisicion');
  const compra = C.tramites.find((x) => x.id === 'compra-dcam');
  assert.ok(t2.includes(permiso.nombre), 'no sale el trámite del permiso');
  assert.ok(t2.includes(compra.nombre), 'no sale el trámite de la compra');
  // Los tres documentos que van en ORIGINAL tienen que verse como tales.
  assert.match(t2, /ORIGINAL/);
  // Y la variante del ejidatario, que es la que más cuesta encontrar en el formato.
  assert.match(t2, /Registro Agrario Nacional/, 'no sale la variante del ejidatario');
  assert.doesNotMatch(t2, /Requisitos SEDENA/, 'el rótulo equivocado no puede volver');
});

test('la entrevista arranca por la primera pregunta y no por otra', (t) => {
  if (!win.EntrevistaScreen) return t.skip('pantalla aún no escrita');
  const arbol = win.EntrevistaScreen({ onNav: () => {} });
  const t2 = texto(arbol);
  const primera = win.AMX_ENTREVISTA.preguntas[0];
  assert.ok(t2.includes(primera.texto), 'no arranca por «' + primera.texto + '»');
  // Radios nativos, no botones con rol: es lo que da flechas de teclado gratis.
  assert.ok(contar(arbol, 'fieldset') >= 1, 'la pregunta no va en un <fieldset>');
  assert.ok(contar(arbol, 'legend') >= 1, 'el <fieldset> no lleva <legend>');
});

test('ninguna pantalla promete que el permiso se vaya a otorgar', (t) => {
  const fuentes = ['src/screens/screens-legalidad.jsx', 'src/screens/screens-entrevista.jsx'];
  let miradas = 0;
  for (const f of fuentes) {
    let s;
    try { s = readFileSync(raiz(f), 'utf8'); } catch (e) { continue; }
    miradas++;
    assert.doesNotMatch(s, /s[íi],? (s[íi] )?puedes (comprar|adquirir)/i, f);
    assert.doesNotMatch(s, /(est[áa]s|ser[áa]s|has sido) autorizad/i, f);
    assert.doesNotMatch(s, /podr[áa]s (comprar|adquirir)/i, f);
    // Dentro de un papel no entran las variables de tema: en oscuro serían tinta clara
    // sobre papel claro.
    assert.doesNotMatch(s, /\bPALETTE\b|\bCLARO\b/, f + ' usa tokens de tema sobre papel');
  }
  if (!miradas) t.skip('ninguna pantalla escrita todavía');
});

// El <dt> de las variantes salió una vez con `v.scenario` en vez de `v.escenario`: la
// lista de definiciones se pintaba con los términos EN BLANCO, y compilaba igual. Esta
// prueba fija que el rótulo de cada variante y su autoridad emisora aparecen de verdad.
test('cada variante muestra su escenario y quién expide el documento', (t) => {
  if (!win.LegalidadRequisitos) return t.skip('pantalla aún no escrita');
  const t2 = texto(win.LegalidadRequisitos({ onNav: () => {} }));
  for (const e of ['asalariado', 'independiente', 'pensionado', 'ejidatario']) {
    assert.ok(t2.includes(e), 'no sale el rótulo de la variante «' + e + '»');
  }
  assert.match(t2, /Comisariado Ejidal/, 'no dice quién expide el certificado del campo');
  assert.match(t2, /contador público/i, 'no sale la variante del trabajador independiente');
});

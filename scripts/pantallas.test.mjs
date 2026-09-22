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
  // Legalidad v2 (22-sep-2026, hilos 1 y 2): la entrevista va arriba, con su botón, y los
  // huecos del corpus NO se publican: son de desarrollo (check-legal.mjs los sigue
  // contando), y la nota interna de un hueco no puede aparecer en pantalla.
  assert.match(t2, /Puedo comprar un arma/, 'no pinta la llamada a la entrevista');
  assert.match(t2, /Empezar la entrevista/, 'no pinta el botón de la entrevista');
  assert.doesNotMatch(t2, /Contesta \d+ preguntas/, 'siete de las preguntas son condicionales: la cifra inflaría el esfuerzo');
  assert.doesNotMatch(t2, /falta por verificar/i, 'el bloque de huecos volvió al hub');
  const huecos = win.amxLegalHuecos(win.AMX_LEGAL);
  assert.ok(huecos.length > 20, 'el corpus debería traer más de 20 huecos, trae ' + huecos.length);
  for (const h of huecos) {
    if (h.nota) assert.ok(!t2.includes(h.nota.slice(0, 40)), 'la nota interna del hueco ' + h.tabla + '/' + h.id + ' sale en pantalla');
  }
  // Tres carpetas más documentos: Requisitos y Permisos ya no existen por separado.
  assert.match(t2, /Trámites/);
  assert.doesNotMatch(t2, /\bPermisos\b/, 'la carpeta «Permisos» tiene que haberse fundido en Trámites');
});

test('LegalidadTramites separa PERMISO de COMPRA, que es el error que corrige', (t) => {
  if (!win.LegalidadTramites) return t.skip('pantalla aún no escrita');
  const t2 = texto(win.LegalidadTramites({ onNav: () => {} }));
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
  // Y lo que antes vivía en Permisos: los seis trámites, cada uno con su paso, su
  // importe y la vigencia de la cuota junto a él (hilos 6 y 7).
  for (const tr of C.tramites) assert.ok(t2.includes(tr.nombre), 'falta el trámite ' + tr.id);
  assert.match(t2, /Posesión no es portación/);
  assert.match(t2, /Cuota vigente 2026/, 'la vigencia de la cuota no sale junto al importe');
  assert.match(t2, /\$15,804\.77/, 'el importe va con separador de miles');
  assert.doesNotMatch(t2, /Paso \d+ de \d+/, 'el orden del corpus no es una cronología: nada de «Paso N de M»');
  // Un extranjero tiene que ver el documento de residencia, y saber que es solo para él.
  assert.match(t2, /Solo si: Persona extranjera/);
  // Ningún hueco interno llega a la pantalla: ni requisitos ni variantes en revisión (hilo 2).
  for (const r of C.requisitos) {
    if (r.revisar) assert.ok(!t2.includes(r.nombre), 'el requisito en revisión «' + r.id + '» sale en pantalla');
    for (const v of r.variantes || []) {
      if (v.revisar && v.documento) assert.ok(!t2.includes(v.documento), 'la variante en revisión «' + r.id + '/' + v.escenario + '» sale en pantalla');
    }
  }
});

// Bots y personas ven el mismo checklist: el prerender usa la misma lista que la pantalla.
test('el checklist de cada trámite cuenta lo mismo en pantalla y en el prerender', () => {
  const t2 = texto(win.LegalidadTramites({ onNav: () => {} }));
  const html = renderLegalHtml(win.AMX_LEGAL, 'tramites', helpers);
  const cuenta = (s) => [...s.matchAll(/(\d+) requisitos · checklist/g)].map((m) => Number(m[1]));
  assert.ok(cuenta(t2).length === win.AMX_LEGAL.tramites.length, 'falta el sumario de algún trámite en pantalla');
  assert.deepEqual(cuenta(t2), cuenta(html));
});

test('LegalidadFederal va por pregunta ciudadana y no publica el hueco de una norma', (t) => {
  if (!win.LegalidadFederal) return t.skip('pantalla aún no escrita');
  const t2 = texto(win.LegalidadFederal({ onNav: () => {} }));
  const C = win.AMX_LEGAL;
  assert.match(t2, /Qué arma puedo tener y dónde/);
  assert.match(t2, /Qué papel lleno/);
  assert.match(t2, /Cuánto cuesta cada trámite/);
  assert.doesNotMatch(t2, /Pendiente de verificar/, 'el hueco de una norma es interno (hilo 2)');
  // Una norma en revisión no publica su resumen ni su nota de vigencia (afirmaciones sin
  // verificar), pero sí su fuente y una línea neutra.
  for (const n of C.normas.filter((x) => x.revisar)) {
    if (n.resumen) assert.ok(!t2.includes(n.resumen.slice(0, 40)), 'la norma en revisión «' + n.id + '» publica su resumen');
    if (n.notaVigencia) assert.ok(!t2.includes(n.notaVigencia.slice(0, 40)), 'la norma en revisión «' + n.id + '» publica su nota de vigencia');
  }
  assert.match(t2, /En verificación/);
  // La norma sin texto confirmado no se publica hasta verificarse.
  const simpl = C.normas.find((n) => n.id === 'acuerdo-simplificacion');
  if (simpl && simpl.revisar) assert.ok(!t2.includes(simpl.titulo), 'el Acuerdo de simplificación no debe publicarse sin texto');
  // Los artículos, como resumen + cita (hilo 4).
  assert.match(t2, /artículos · resumen y cita/);
});

test('LegalidadEstatal deja en el selector a las entidades sin portal, en gris y avisando', (t) => {
  if (!win.LegalidadEstatal) return t.skip('pantalla aún no escrita');
  const arbol = win.LegalidadEstatal({ onNav: () => {} });
  const t2 = texto(arbol);
  const C = win.AMX_LEGAL;
  const sinPortal = C.entidades.filter((e) => e.antecedentes && e.antecedentes.revisar);
  assert.ok(sinPortal.length > 0, 'el corpus debería traer entidades sin portal');
  for (const e of sinPortal) assert.ok(t2.includes(e.nombre + ' · portal sin verificar'), e.nombre + ' no avisa en el selector');
  assert.equal(contar(arbol, 'option'), C.entidades.length + 1, 'todas las entidades siguen en el selector');
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

test('en el teléfono la entrevista de la portada cabe en pantalla', () => {
  const portada = readFileSync(raiz('src/screens/screens-1.jsx'), 'utf8');
  const estilos = readFileSync(raiz('src/styles/estilo.css'), 'utf8');
  assert.doesNotMatch(portada, /Basado en el formato DEFENSA-02-040/i,
    'la portada no debe repetir el aviso del formato: ya está en Legalidad');
  // El título se retira SOLO con la entrevista empezada. En la primera pregunta
  // es el único contexto que tiene quien llega; a partir de la segunda estorba y
  // empuja la mesa con los documentos fuera de la pantalla.
  assert.match(estilos,
    /\.amx-hent:has\(\.amx-ent-cuerpo:not\(\.amx-ent-cuerpo--compacto\)\) \.amx-hent-tit \{[^}]*clip:/,
    'falta la regla que retira el título una vez empezada la entrevista');
  assert.doesNotMatch(estilos,
    /\.amx-hent:has\(\.amx-ent-cuerpo--compacto\) \.amx-hent-tit \{[^}]*clip:/,
    'el título no debe esconderse en la primera pregunta: ahí es el único contexto');
  // En 390 px los tres renglones reservados del enunciado dejaban 70 px de hueco
  // sobre cada pregunta corta. En tableta y escritorio la reserva se queda.
  assert.match(estilos, /\.amx-v2 \.amx-ent-pregunta legend \{\s*min-height: 0;/,
    'en móvil el enunciado no debe reservar los tres renglones');
});

test('toda la entrevista se sirve sobre la hoja de formato, no en tarjetas', () => {
  const cuerpo = readFileSync(raiz('src/screens/screens-entrevista.jsx'), 'utf8');
  const estilos = readFileSync(raiz('src/styles/estilo.css'), 'utf8');
  // La MISMA hoja que la FAQ y la clasificación, con su membrete: era la única
  // superficie del sitio sin metáfora física. Vale para todas las preguntas,
  // no solo para la primera de la portada.
  assert.match(cuerpo, /className="amx-ent-folder amx-oficio"/,
    'la pregunta debe ir sobre la hoja de oficio');
  assert.match(cuerpo, /amx-oficio-membrete[\s\S]{0,400}DEFENSA-02-040/,
    'falta el membrete del formato');
  assert.match(cuerpo, /className="amx-ent-folio"/, 'falta el folio del renglón');
  // Cada respuesta es un renglón que se marca: casilla, etiqueta y su raya.
  // Sin fondo, sin sombra y sin flecha, que era lo que las hacía botones.
  const base = estilos.match(/\.amx-v2 button\.amx-ent-opcion \{[^}]*\}/);
  assert.ok(base, 'no encuentro la regla base de la respuesta');
  assert.match(base[0], /background: transparent/, 'la respuesta no puede llevar fondo');
  assert.match(base[0], /box-shadow: none/, 'la respuesta no puede llevar sombra');
  assert.match(base[0], /border-bottom: 1px solid/, 'a cada renglón le falta su raya');
  assert.match(estilos, /button\.amx-ent-opcion::before \{[^}]*border: 1\.5px/,
    'las respuestas deben llevar su casilla');
  assert.match(estilos, /button\.amx-ent-opcion::after \{\s*content: none;/,
    'la flecha de botón sobra en una casilla');
});

test('la mesa va arriba de las preguntas y los documentos suben hacia ella', () => {
  const cuerpo = readFileSync(raiz('src/screens/screens-entrevista.jsx'), 'utf8');
  const estilos = readFileSync(raiz('src/styles/estilo.css'), 'utf8');
  // El escritorio se pinta ANTES que la tarjeta: es lo que impide que una
  // pregunta con cuatro respuestas largas lo empuje fuera de la pantalla.
  const escritorio = cuerpo.indexOf('window.EscritorioPapeles');
  const tarjeta = cuerpo.indexOf('className="amx-ent-mesa"');
  assert.ok(escritorio !== -1 && tarjeta !== -1, 'no encuentro el escritorio o la tarjeta');
  assert.ok(escritorio < tarjeta,
    'el escritorio debe ir antes que la tarjeta, también en el orden del DOM');
  // Con la mesa arriba, el documento entra desde ABAJO: parece salir de la
  // respuesta que se acaba de tocar. Una sola dirección en todas las pantallas.
  assert.match(estilos,
    /@keyframes amx-ent-papel-entra \{\s*from \{[^}]*var\(--amx-plaza-y\) \+ 210%\)/,
    'el papel debe entrar desde abajo');
  assert.doesNotMatch(estilos, /amx-ent-papel-entra-escritorio/,
    'sobra el override de escritorio: la dirección es la misma en toda pantalla');
  // Con la mesa encima, contestar la primera pregunta empuja todo hacia abajo:
  // el único empujón de scroll de la entrevista, y solo en la portada.
  assert.match(cuerpo, /contestadas !== 1[\s\S]{0,220}scrollIntoView/,
    'falta el scroll de la primera respuesta, o no está acotado a ella');
  assert.match(cuerpo, /prefers-reduced-motion[\s\S]{0,200}scrollIntoView/,
    'el scroll debe ser instantáneo para quien pide menos movimiento');
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
  if (!win.LegalidadTramites) return t.skip('pantalla aún no escrita');
  const t2 = texto(win.LegalidadTramites({ onNav: () => {} }));
  for (const e of ['asalariado', 'independiente', 'pensionado', 'ejidatario']) {
    assert.ok(t2.includes(e), 'no sale el rótulo de la variante «' + e + '»');
  }
  assert.match(t2, /Comisariado Ejidal/, 'no dice quién expide el certificado del campo');
  assert.match(t2, /contador público/i, 'no sale la variante del trabajador independiente');
});

// ── El prerender: lo que ven los buscadores y quien no ejecuta JavaScript ───
// Antes de esto, /legalidad se servía como dos líneas de HTML: un bot no veía ni un
// requisito. Estas pruebas no miran el archivo construido —eso obligaría a correr el
// build— sino el renderizador, que es donde está la lógica.
import { renderLegalHtml } from './prerender-legal.mjs';

const helpers = {
  amxLegalFuente: win.amxLegalFuente, amxLegalHuecos: win.amxLegalHuecos,
  amxRequisitosDe: win.amxRequisitosDe, amxLegalFecha: win.amxLegalFecha,
  amxNormasPorPregunta: win.amxNormasPorPregunta, amxVigenciaCuota: win.amxVigenciaCuota,
  amxImporte: win.amxImporte, amxRotuloEscenarios: win.amxRotuloEscenarios,
};

test('el prerender sirve contenido de verdad, no un esqueleto', () => {
  // El hub es corto a propósito desde que los huecos dejaron de publicarse (22-sep-2026):
  // intro, aviso, la entrevista y las cuatro carpetas con su descripción.
  const minimo = { hub: 2000, tramites: 4000, federal: 4000 };
  for (const seccion of ['hub', 'tramites', 'federal']) {
    const html = renderLegalHtml(win.AMX_LEGAL, seccion, helpers);
    assert.ok(html.length > minimo[seccion], seccion + ': solo ' + html.length + ' caracteres, es un esqueleto');
    assert.equal((html.match(/<h1/g) || []).length, 1, seccion + ': debe haber exactamente un <h1>');
    // Es HTML para bots y para quien no tiene JavaScript: nada operativo.
    for (const tag of ['<form', '<input', '<select', '<button']) {
      assert.ok(!html.includes(tag), seccion + ': no puede llevar ' + tag);
    }
  }
});

test('el prerender de Trámites trae los seis trámites, su checklist y cita sus fuentes', () => {
  const html = renderLegalHtml(win.AMX_LEGAL, 'tramites', helpers);
  const C = win.AMX_LEGAL;
  for (const t of C.tramites) {
    assert.ok(html.includes(t.nombre.slice(0, 40).replace(/&/g, '&amp;')), 'falta el trámite ' + t.id);
  }
  assert.match(html, /<details class="amx-leg-plegable" open>/, 'la checklist del primer trámite viene abierta');
  assert.match(html, /Cuota vigente 2026/, 'la vigencia de la cuota no llega al HTML');
  assert.match(html, /Solo si: Persona extranjera/, 'el requisito solo para extranjeros no dice a quién aplica');
  assert.match(html, /Registro Agrario Nacional/, 'falta la variante del ejidatario');
  assert.match(html, /rel="noopener noreferrer"/, 'los enlaces externos van con rel noopener');
  assert.match(html, /se abre en una pestaña nueva/, 'los enlaces externos lo dicen al lector de pantalla');
});

test('el prerender no publica ningún hueco: ni como afirmación ni como lista', () => {
  const C = win.AMX_LEGAL;
  const huecos = win.amxLegalHuecos(C);
  assert.ok(huecos.length > 20);
  for (const seccion of ['hub', 'tramites', 'federal', 'estatal']) {
    const html = renderLegalHtml(win.AMX_LEGAL, seccion, helpers);
    // Un trámite marcado `revisar` no puede salir como si estuviera verificado…
    for (const t of C.tramites.filter((x) => x.revisar)) {
      assert.ok(!html.includes(t.nombre), seccion + ': el trámite "' + t.id + '" está marcado como hueco y sale afirmado');
    }
    // …y su nota interna tampoco: desde el 22-sep-2026 los huecos son de desarrollo
    // (check-legal.mjs y docs/fuentes/legalidad.md), no del público (hilo 2).
    assert.doesNotMatch(html, /falta por verificar/i, seccion + ': volvió el bloque de huecos');
    for (const h of huecos) {
      if (h.nota) assert.ok(!html.includes(h.nota.slice(0, 40).replace(/&/g, '&amp;')),
        seccion + ': la nota interna del hueco ' + h.tabla + '/' + h.id + ' llega al HTML');
    }
  }
});

// Toda carpeta del hub tiene que llevar a una pantalla que EXISTE y estar dada de alta en
// el router. Una carpeta que navega a una clave inventada no da error: no hace nada, y eso
// no se nota hasta que alguien la pulsa. Pasó con 'legal-requisitos', que el router llama
// 'legal-req'.
test('las carpetas del hub llevan a pantallas que existen y están ruteadas', () => {
  const app = readFileSync(raiz('src/app.jsx'), 'utf8');
  const src = readFileSync(raiz('src/screens/screens-legalidad.jsx'), 'utf8');
  const claves = [...src.matchAll(/clave:\s*'([^']+)'/g)].map((m) => m[1]);
  assert.ok(claves.length >= 4, 'se esperaban al menos cuatro carpetas, hay ' + claves.length);
  const bloque = app.match(/const SCREEN_TO_PATH = \{[\s\S]*?\n\};/);
  assert.ok(bloque, 'no encuentro SCREEN_TO_PATH en app.jsx');
  const mapa = bloque[0];
  for (const c of claves) {
    assert.match(app, new RegExp("screen === '" + c + "'"),
      'la carpeta «' + c + '» navega a una pantalla que el router no monta: el botón no haría nada');
    // Se busca DENTRO de SCREEN_TO_PATH, no en todo app.jsx: la misma clave
    // aparece en los mapas de rótulos y de pestaña, así que buscarla en el
    // archivo entero daba por buena una ruta que no existía (comprobado
    // borrándola: el test seguía pasando). La clave va entrecomillada o
    // desnuda, y los escapes van dobles al construir la expresión desde
    // cadena: `"\b"` es el carácter de retroceso, no el límite de palabra.
    const enMapa = new RegExp("[{,]\\s*'?" + c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "'?\\s*:");
    assert.ok(enMapa.test(mapa), 'la carpeta «' + c + '» no tiene ruta en SCREEN_TO_PATH');
  }
});

// La descripción de «Estatal» decía «normativa estatal aplicable a la posesión y uso de
// armas». Es falso: las armas son competencia federal y el propio corpus lo dice en
// `noHayEstatal`. Un texto de relleno plausible que contradice al corpus es exactamente
// lo que §6b prohíbe, y en una sección legal es lo más caro que puede pasar.
test('ninguna carpeta afirma que existe normativa estatal de armas', () => {
  const src = readFileSync(raiz('src/screens/screens-legalidad.jsx'), 'utf8');
  const descs = [...src.matchAll(/desc:\s*'([^']+)'/g)].map((m) => m[1]).join(' ');
  assert.doesNotMatch(descs, /normativa estatal/i,
    'una carpeta afirma que hay normativa estatal de armas; el corpus dice lo contrario');
  assert.ok(win.AMX_LEGAL.noHayEstatal && win.AMX_LEGAL.noHayEstatal.length > 80,
    'el corpus tiene que explicar por qué no hay normativa estatal');
});

// Dos fallos que solo se ven mirando la pantalla, no leyendo el codigo:
//   1. `AMX_LEGAL.requisitos` es un ARRAY. Indexarlo con una cadena da undefined, y la
//      carpeta enseniaba los ids crudos —«pa-curp»— en vez de los nombres. Compilaba.
//   2. El titulo se sacaba del dictamen, que no lo tiene, asi que la cinta Dymo decia
//      «Entrevista» en vez de la pregunta que da nombre a la pantalla.
test('la entrevista enseña NOMBRES de documento, no ids, y su título de verdad', (t) => {
  if (!win.EntrevistaScreen) return t.skip('pantalla aún no escrita');
  const t2 = texto(win.EntrevistaScreen({ onNav: () => {} }));
  assert.ok(t2.includes(win.AMX_ENTREVISTA.titulo), 'la cinta no lleva el título del guion');
  // Los documentos que le tocan a todo el mundo salen desde la primera pregunta.
  const C = win.AMX_LEGAL;
  for (const id of win.AMX_ENTREVISTA.siempre) {
    const req = C.requisitos.find((r) => r.id === id);
    assert.ok(req, 'el guion cita un documento que el corpus no tiene: ' + id);
    assert.ok(t2.includes(req.nombre), 'la carpeta no muestra el nombre de «' + id + '»');
    assert.ok(!t2.includes(id), 'la carpeta enseña el id crudo «' + id + '» en vez del nombre');
  }
});

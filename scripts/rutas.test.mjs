// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// El ruteo de src/app.jsx se escribe con funciones de MUCHOS PARÁMETROS POSICIONALES.
// El 19-sep-2026 `calibreId` se insertó en la 5ª posición de la firma y los sitios de
// llamada lo añadieron AL FINAL: los tres últimos argumentos quedaron corridos y las
// cinco rutas principales se escribieron mal en producción. Ninguna prueba lo vio,
// porque las que hay prueban las funciones sueltas (cotejo.test.mjs) y nunca el cableado.
//
// Esta prueba mira el CABLEADO: que cada llamada pase los argumentos en el mismo orden
// y en la misma cantidad que la firma declara. No ejecuta React ni necesita el build,
// que es lo que la hace barata de correr en cada commit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RUTA = fileURLToPath(new URL('../src/app.jsx', import.meta.url));
const src = readFileSync(RUTA, 'utf8');
const BARRA = 92;          // el código de la barra invertida
const ABRE = '([{';
const CIERRA = ')]}';

// Los parámetros declarados de `function <nombre>(a, b, c)`.
function parametros(nombre) {
  const m = src.match(new RegExp('function\\s+' + nombre + '\\s*\\(([^)]*)\\)'));
  assert.ok(m, `no se encontró la declaración de ${nombre} en src/app.jsx`);
  return m[1].split(',').map((s) => s.trim()).filter(Boolean);
}

// Parte los argumentos de una llamada por las comas de PRIMER nivel: respeta paréntesis,
// corchetes, llaves y comillas, para no romper `foo(a, b)` ni `{ x: 1, y: 2 }`.
function partirArgumentos(texto) {
  const partes = [];
  let actual = '', prof = 0, comilla = null;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comilla) {
      actual += c;
      if (c === comilla && texto.charCodeAt(i - 1) !== BARRA) comilla = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { comilla = c; actual += c; continue; }
    if (ABRE.includes(c)) prof++;
    if (CIERRA.includes(c)) prof--;
    if (c === ',' && prof === 0) { partes.push(actual.trim()); actual = ''; continue; }
    actual += c;
  }
  if (actual.trim()) partes.push(actual.trim());
  return partes;
}

// Cada llamada a `<nombre>(…)` del archivo, con su número de línea. Salta la declaración.
function llamadas(nombre) {
  const fuera = [];
  const re = new RegExp('(?<!function\\s)\\b' + nombre + '\\s*\\(', 'g');
  let m;
  while ((m = re.exec(src)) !== null) {
    let i = m.index + m[0].length, prof = 1, comilla = null;
    while (i < src.length && prof > 0) {
      const c = src[i];
      if (comilla) { if (c === comilla && src.charCodeAt(i - 1) !== BARRA) comilla = null; }
      else if (c === '"' || c === "'" || c === '`') comilla = c;
      else if (ABRE.includes(c)) prof++;
      else if (CIERRA.includes(c)) prof--;
      i++;
    }
    fuera.push({
      linea: src.slice(0, m.index).split('\n').length,
      args: partirArgumentos(src.slice(m.index + m[0].length, i - 1)),
    });
  }
  return fuera;
}

test('amxBuildUrl es un pasamanos exacto de amxBuildPath', () => {
  assert.deepEqual(parametros('amxBuildUrl'), parametros('amxBuildPath'),
    'las dos firmas tienen que coincidir parámetro a parámetro: amxBuildUrl solo antepone APP_BASE');
});

test('toda llamada a amxBuildUrl pasa tantos argumentos como parámetros declara', () => {
  const params = parametros('amxBuildUrl');
  const calls = llamadas('amxBuildUrl');
  assert.ok(calls.length > 0, 'no se encontró ninguna llamada a amxBuildUrl');
  for (const c of calls) {
    assert.equal(c.args.length, params.length,
      `src/app.jsx:${c.linea} pasa ${c.args.length} argumentos y la firma declara ${params.length}. ` +
      `Los de la cola llegan como undefined.\n  firma:   (${params.join(', ')})\n  llamada: (${c.args.join(', ')})`);
  }
});

test('toda llamada a amxBuildUrl pasa los argumentos EN EL ORDEN de la firma', () => {
  const params = parametros('amxBuildUrl');
  for (const c of llamadas('amxBuildUrl')) {
    c.args.forEach((arg, i) => {
      // Solo se cotejan los argumentos que son un identificador a secas y que además
      // coinciden con algún parámetro: los literales (null, 'compare') y las
      // expresiones (idsVivos.current) no tienen nombre con el que comparar.
      if (!/^[A-Za-z_$][\w$]*$/.test(arg)) return;
      const esperado = params.indexOf(arg);
      if (esperado < 0) return;
      assert.equal(i, esperado,
        `src/app.jsx:${c.linea} pasa "${arg}" en la posición ${i}, pero la firma lo declara en la ${esperado}: ` +
        `entra en el parámetro "${params[i]}".\n  firma:   (${params.join(', ')})\n  llamada: (${c.args.join(', ')})`);
    });
  }
});

test('la restauración del comparador pasa las armas en el parámetro de las armas', () => {
  const params = parametros('amxBuildUrl');
  const pos = params.indexOf('compareIds');
  assert.ok(pos >= 0, 'la firma de amxBuildUrl ya no declara compareIds');
  const cmp = llamadas('amxBuildUrl').filter((c) => /^['"]compare['"]$/.test(c.args[0] || ''));
  assert.ok(cmp.length > 0, 'no se encontró la llamada que reescribe la URL del comparador al volver con «atrás»');
  for (const c of cmp) {
    assert.match(c.args[pos] || '', /idsVivos\.current/,
      `src/app.jsx:${c.linea} no pasa idsVivos.current en la posición de compareIds (${pos}), sino "${c.args[pos]}". ` +
      `El comparador se reescribiría sin sus armas.`);
  }
});

// Requisitos y Permisos se fundieron en Trámites (22-sep-2026). Las dos direcciones viejas
// estaban en el sitemap y en enlaces ajenos: el servidor las redirige con 301 (reglas
// literales, nunca un comodín: AGENTS.md) y la app las resuelve por si llegan por dentro.
test('las rutas viejas de Requisitos y Permisos llevan a Trámites, en el servidor y en la app', () => {
  const src = readFileSync(new URL('../src/app.jsx', import.meta.url), 'utf8');
  for (const vieja of ['legalidad/requisitos', 'legalidad/permisos']) {
    assert.match(src, new RegExp("PATH_TO_SCREEN\\['" + vieja + "'\\] = 'legal-tramites'"), vieja + ' no se resuelve a Trámites en la app');
  }
  const redirects = readFileSync(new URL('../public/_redirects', import.meta.url), 'utf8');
  const reglas = redirects.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
  assert.deepEqual(reglas.map((l) => l.split(/\s+/)), [
    ['/legalidad/requisitos', '/legalidad/tramites', '301'],
    ['/legalidad/permisos', '/legalidad/tramites', '301'],
  ], 'solo las dos reglas literales; un comodín se comería sitemap.xml y app.js');
});

// Las rutas de Legalidad son de DOS segmentos. La búsqueda de PATH_TO_SCREEN exige
// `seg.length === 1`, así que sin una rama propia una recarga directa sobre
// /legalidad/requisitos se caía al fallback de accesorios y de ahí a la portada: la URL
// se escribía bien y al recargar aparecía otra pantalla. Esta prueba fija las dos ramas
// y que una desconocida aterrice en el hub de Legalidad, nunca en la portada.
test('las ramas de Legalidad se parsean, y una desconocida cae en el hub', () => {
  // No se puede cazar el bloque con un no-codicioso hasta el primer `}`: el primero que
  // aparece es el de `Object.assign({}`. Se miran las dos líneas siguientes al `if`,
  // que es donde vive la lógica.
  const iSalto = src.indexOf('seg[0] === SCREEN_TO_PATH.legal && seg[1]');
  const m = iSalto < 0 ? null : [src.slice(iSalto).split('\n').slice(0, 3).join('\n')];
  assert.ok(m, 'no hay rama de parseo para las subrutas de Legalidad: /legalidad/requisitos se caería al recargar');
  assert.match(m[0], /PATH_TO_SCREEN\[seg\[0\] \+ '\/' \+ seg\[1\]\]/, 'la rama no compone la ruta de dos segmentos');
  assert.match(m[0], /\|\| 'legal'/, 'una rama desconocida debe caer en el hub de Legalidad, no en la portada');

  // Y la rama tiene que ir ANTES de la búsqueda de un solo segmento y del fallback.
  const iRama = src.indexOf("seg[0] === SCREEN_TO_PATH.legal && seg[1]");
  const iUno = src.indexOf('seg.length === 1 && PATH_TO_SCREEN[seg[0]]');
  assert.ok(iRama > 0 && iUno > 0 && iRama < iUno, 'la rama de Legalidad debe ir antes de la búsqueda de un segmento');
});

// Las dos pantallas nuevas son puntos de alta en cinco sitios distintos. Si falta uno, el
// botón de la barra queda muerto o el título sale vacío, y no lo nota nadie hasta el
// navegador. Aquí se cuentan los cinco de una vez.
test('cada pantalla nueva está dada de alta en los cinco sitios', () => {
  for (const [pantalla, ruta, titulo] of [
    ['legal-tramites', 'legalidad/tramites', 'Trámites'],
    ['entrevista', 'legalidad/puedo-comprar', '¿Puedo comprar un arma?'],
  ]) {
    assert.ok(src.includes("'" + ruta + "'"), pantalla + ': falta su ruta en SCREEN_TO_PATH');
    assert.ok(src.includes("'" + titulo + "'"), pantalla + ': falta su título');
    // La clave puede ir entrecomillada o no —`'legal-req': 'legal'` frente a
    // `entrevista: 'legal'`—, así que se admiten las dos formas.
    const navId = new RegExp("'?" + pantalla + "'?\\s*:\\s*'legal'");
    assert.match(src, navId,
      pantalla + ': no cuelga de Legalidad en currentNavId, su botón de la barra quedaría muerto');
    // Nada de regex por distancia: la línea de isInternal es larga y crece cada vez que
    // se añade una pantalla. Se busca la línea y se mira dentro.
    const lineaInternal = src.split('\n').find((l) => l.includes('const isInternal'));
    assert.ok(lineaInternal, 'no se encontró la línea de isInternal');
    assert.ok(lineaInternal.includes("'" + pantalla + "'"),
      pantalla + ': no está en isInternal, se quedaría sin botón de volver');
    assert.match(src, new RegExp("screen === '" + pantalla + "'"),
      pantalla + ': no se monta en el switch de contenido');
  }
});

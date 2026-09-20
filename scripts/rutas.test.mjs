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

// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// Formatos de reporte: los Issue Forms de GitHub son la ÚNICA fuente.
//
// Lee .github/ISSUE_TEMPLATE/*.yml y escribe dos copias generadas que sí se
// commitean, una para cada lado del formulario interno de armado.mx:
//   · src/lib/formatos-issue.js   → window.AMX_FORMATOS_ISSUE (el navegador pinta el formulario)
//   · functions/api/_formatos.js  → export const FORMATOS     (el servidor valida y arma el issue)
// La estructura de cada campo es la del YAML tal cual (type, id, attributes,
// validations): así un reporte hecho en el sitio sale idéntico a uno hecho en GitHub.
//
// Uso: `npm run formatos` después de tocar cualquier .yml. scripts/formatos-issue.test.mjs
// falla si las copias no coinciden con el YAML.
//
// Falla ruidosamente ante un campo que el formulario web no sabe pintar: mejor
// romper aquí que publicar un formulario al que le falta un campo obligatorio.

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const RAIZ = join(fileURLToPath(new URL('.', import.meta.url)), '..');
export const DIR_PLANTILLAS = join(RAIZ, '.github', 'ISSUE_TEMPLATE');
export const SALIDA_NAVEGADOR = join(RAIZ, 'src', 'lib', 'formatos-issue.js');
export const SALIDA_FUNCTIONS = join(RAIZ, 'functions', 'api', '_formatos.js');

// Los tipos de Issue Form que el formulario web sabe pintar.
export const TIPOS_SOPORTADOS = ['markdown', 'input', 'textarea', 'dropdown', 'checkboxes'];

const CABECERA = [
  '// Armado en México — Copyright (C) 2026 Saulo Flores León',
  '// SPDX-License-Identifier: AGPL-3.0-or-later',
  '// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales',
  '// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.',
  '',
  '// GENERADO por scripts/formatos-issue.mjs desde .github/ISSUE_TEMPLATE/*.yml.',
  '// NO lo edites a mano: cambia el .yml y corre `npm run formatos`.',
].join('\n');

function fallar(archivo, msg) {
  throw new Error(`formatos-issue: ${archivo}: ${msg}`);
}

export function validarFormato(form, archivo) {
  if (!form || typeof form !== 'object') fallar(archivo, 'no es un Issue Form');
  for (const k of ['name', 'description', 'title']) {
    if (typeof form[k] !== 'string' || !form[k].trim()) fallar(archivo, `falta «${k}»`);
  }
  if (!Array.isArray(form.labels) || form.labels.length === 0) fallar(archivo, 'falta «labels»');
  if (!Array.isArray(form.body) || form.body.length === 0) fallar(archivo, 'falta «body»');
  const ids = new Set();
  for (const [i, campo] of form.body.entries()) {
    const donde = `body[${i}]`;
    if (!TIPOS_SOPORTADOS.includes(campo.type)) {
      fallar(archivo, `${donde}: tipo «${campo.type}» no soportado por el formulario web`);
    }
    const a = campo.attributes || {};
    if (campo.type === 'markdown') {
      if (typeof a.value !== 'string' || !a.value.trim()) fallar(archivo, `${donde}: markdown vacío`);
      continue;
    }
    if (typeof campo.id !== 'string' || !/^[a-z][a-z0-9_]*$/.test(campo.id)) {
      fallar(archivo, `${donde}: id inválido «${campo.id}»`);
    }
    if (ids.has(campo.id)) fallar(archivo, `${donde}: id repetido «${campo.id}»`);
    ids.add(campo.id);
    if (typeof a.label !== 'string' || !a.label.trim()) fallar(archivo, `${campo.id}: falta label`);
    if (campo.type === 'dropdown') {
      if (!Array.isArray(a.options) || a.options.length === 0
        || !a.options.every((o) => typeof o === 'string' && o.trim())) {
        fallar(archivo, `${campo.id}: el dropdown necesita opciones de texto`);
      }
    }
    if (campo.type === 'checkboxes') {
      if (!Array.isArray(a.options) || a.options.length === 0
        || !a.options.every((o) => o && typeof o.label === 'string' && o.label.trim())) {
        fallar(archivo, `${campo.id}: las casillas necesitan opciones con label`);
      }
    }
  }
  return form;
}

// Lee y valida todos los formularios. config.yml es la configuración del selector
// de plantillas de GitHub, no un formulario. Orden por nombre de archivo: estable.
export function leerFormatos(dir = DIR_PLANTILLAS) {
  const archivos = readdirSync(dir)
    .filter((f) => /\.ya?ml$/.test(f) && !/^config\.ya?ml$/.test(f))
    .sort();
  if (archivos.length === 0) throw new Error(`formatos-issue: no hay Issue Forms en ${dir}`);
  const formatos = {};
  for (const archivo of archivos) {
    const form = validarFormato(parse(readFileSync(join(dir, archivo), 'utf8')), archivo);
    const id = basename(archivo).replace(/\.ya?ml$/, '');
    formatos[id] = { id, archivo, ...form };
  }
  return formatos;
}

export function generarNavegador(formatos) {
  return `${CABECERA}\n\n(function () {\n  window.AMX_FORMATOS_ISSUE = ${
    JSON.stringify(formatos, null, 2).replace(/\n/g, '\n  ')
  };\n})();\n`;
}

export function generarFunctions(formatos) {
  return `${CABECERA}\n\nexport const FORMATOS = ${JSON.stringify(formatos, null, 2)};\n`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const formatos = leerFormatos();
  writeFileSync(SALIDA_NAVEGADOR, generarNavegador(formatos));
  writeFileSync(SALIDA_FUNCTIONS, generarFunctions(formatos));
  console.log(`formatos-issue: ${Object.keys(formatos).join(', ')} → src/lib/formatos-issue.js + functions/api/_formatos.js`);
}

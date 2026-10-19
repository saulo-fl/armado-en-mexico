#!/usr/bin/env node
// CLI delgado: toda la lógica de validación vive en ./validar-parche-lib.mjs (leer ese
// archivo para el cómo y el porqué). Este archivo SOLO junta argv con esa lógica y decide
// qué imprimir/qué exit code usar — sin ningún guard sobre cómo se invocó. Un guard así
// ("¿soy el módulo principal?") fue la causa del Critical de la ronda de arreglo 1/5:
// comparaba `process.argv[1]` contra la ruta del módulo, y un symlink o una junction al
// script hace que esas dos rutas NUNCA coincidan (Node resuelve el módulo a su ruta REAL;
// `process.argv[1]` conserva la del enlace), así que el bloque entero no corría — EXIT=0
// sin validar nada, con cualquier ataque en el "nuevo". Sin guard no hay nada que ese
// desajuste pueda romper: el validador corre siempre que este archivo se ejecuta.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PERMITIDOS, compararArchivoSeguro, verificarArchivoEnNuevo } from './validar-parche-lib.mjs';

const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error('uso: validar-parche.mjs <dir-base> <dir-nuevo>');
  process.exit(2);
}
const [dirBase, dirNuevo] = args;

const problemas = [];
for (const ruta of [...PERMITIDOS].sort()) {
  try {
    const probsExistencia = verificarArchivoEnNuevo(dirNuevo, ruta);
    if (probsExistencia.length) { problemas.push(...probsExistencia); continue; }
    const nuevoBuf = readFileSync(join(dirNuevo, ruta));
    let baseBuf;
    try { baseBuf = readFileSync(join(dirBase, ruta)); } catch { baseBuf = Buffer.alloc(0); }
    if (baseBuf.equals(nuevoBuf)) continue;
    problemas.push(...compararArchivoSeguro(ruta, baseBuf.toString('utf8'), nuevoBuf.toString('utf8')));
  } catch (e) {
    problemas.push(`${ruta}: no se pudo validar (${e.message})`);
  }
}
if (problemas.length) { console.error(problemas.join('\n')); process.exit(1); }
console.log('✔ solo datos');

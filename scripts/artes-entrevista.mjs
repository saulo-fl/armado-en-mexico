// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// Los artes de documentos de la entrevista, de la carpeta de assets a public/.
//
// Los originales pesan 8.1 MB entre los doce: PNG de hasta 1.8 MB, que es lo que
// sale de un generador de imágenes. En WebP con alfa bajan a 368 KB EN TOTAL.
// GDI+ no sirve aquí: comprime PNG tan mal que ni a 320 px de ancho bajaban de
// 150 KB. ffmpeg con libwebp lo resuelve y ya está instalado en HEFESTO.
//
// Uso:  node scripts/artes-entrevista.mjs [ruta-de-los-originales]

import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';

const ORIGEN = process.argv[2] ||
  'C:/Users/USER/Documents/Claude/Projects/Armado en Mexico/Assets del Sitio/elementos/Entrevista';
const DESTINO = 'public/imagenes/entrevista';

// origen tal como lo entregaron -> nombre en el sitio. El id de requisito que le
// corresponde a cada uno vive en el mapa de ui.jsx, no aquí.
const ARTES = {
  'INE - Credencial para votar.png': 'ine.webp',
  'Acta de Nacimiento.png': 'acta-nacimiento.webp',
  'CURP.png': 'curp.webp',
  'Cartilla militar.png': 'cartilla-militar.webp',
  'Constancia de ingresos.png': 'constancia-ingresos.webp',
  'Constancia de antecedentes no penales.png': 'antecedentes-no-penales.webp',
  'Comprobante de domicilio.png': 'comprobante-domicilio.webp',
  'certificados-medicos.png': 'certificados-medicos.webp',
  'licencia-club-tiro.png': 'licencia-club-tiro.webp',
  'constancia-club-cinegetico.png': 'constancia-club-cinegetico.webp',
  'permiso-coleccionista.png': 'permiso-coleccionista.webp',
  'tarjeta-residente.png': 'tarjeta-residente.webp',
};

const LIMITE_KB = 150;

mkdirSync(DESTINO, { recursive: true });

let fallos = 0;
for (const [origen, destino] of Object.entries(ARTES)) {
  const entrada = path.join(ORIGEN, origen);
  if (!existsSync(entrada)) {
    console.log(`FALTA EL ORIGINAL: ${origen}`);
    fallos++;
    continue;
  }
  const salida = path.join(DESTINO, destino);
  // -nostdin es obligatorio: sin él, ffmpeg se come la entrada de quien lo llama
  // en bucle y se salta archivos. `min(600,iw)` no amplía los que ya son chicos.
  execFileSync('ffmpeg', [
    '-nostdin', '-loglevel', 'error', '-y', '-i', entrada,
    '-vf', "scale='min(600,iw)':-1",
    '-c:v', 'libwebp', '-lossless', '0', '-q:v', '82', '-compression_level', '6',
    salida,
  ]);
  const kb = Math.round(statSync(salida).size / 1024);
  if (kb > LIMITE_KB) { console.log(`  PASADO DE PESO: ${destino} ${kb} KB`); fallos++; }
  console.log(`${origen.padEnd(42)} -> ${destino}  (${kb} KB)`);
}

if (fallos > 0) {
  console.log(`\n${fallos} arte(s) con problema.`);
  process.exit(1);
}
console.log(`\nListo: ${Object.keys(ARTES).length} artes en ${DESTINO}`);

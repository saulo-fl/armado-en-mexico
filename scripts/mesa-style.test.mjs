// Armado en México — contrato visual de las superficies de mesa.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const cssPath = fileURLToPath(new URL('../src/styles/estilo.css', import.meta.url));
const css = readFileSync(cssPath, 'utf8');

test('Accesorios y Calibres declaran la misma superficie de mesa', () => {
  assert.match(css, /\.amx-mesa-fila\s*\{[\s\S]*?--mesa-superficie:\s*var\(--mesa-madera\)/);
  assert.match(css, /\.amx-mostrador\s*\{[\s\S]*?--mesa-superficie:\s*var\(--mesa-madera\)/);
  assert.match(css, /\.amx-mesa-fila::after\s*\{[\s\S]*?background:\s*var\(--mesa-superficie\)/);
  assert.match(css, /\.amx-mostrador \.amx-repisa-carril\s*\{[\s\S]*?background:\s*var\(--mesa-superficie\)/);
});
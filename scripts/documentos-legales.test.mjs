import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';

const contexto = createContext({ window: {} });
runInContext(readFileSync(new URL('../src/data/data-legal.js', import.meta.url), 'utf8'), contexto);
const corpus = contexto.window.AMX_LEGAL;
const documentos = [...Object.values(corpus.fuentes), ...corpus.documentosComplementarios];

test('cada PDF anunciado en el índice existe y contiene un PDF real', () => {
  const locales = documentos.filter((d) => d.archivoLocal);
  assert.equal(locales.length, 19);
  const rutas = new Set();
  for (const d of locales) {
    assert.equal(d.pdf, true, d.titulo);
    assert.match(d.url, /^https:\/\//, d.titulo);
    assert.match(d.archivoLocal, /^documentos-legales\/[a-z0-9-]+\.pdf$/, d.titulo);
    assert.equal(rutas.has(d.archivoLocal), false, d.archivoLocal);
    rutas.add(d.archivoLocal);
    const bytes = readFileSync(new URL('../public/' + d.archivoLocal, import.meta.url));
    assert.equal(bytes.subarray(0, 5).toString(), '%PDF-', d.archivoLocal);
    assert.match(bytes.subarray(-1024).toString(), /%%EOF/, d.archivoLocal);
    assert.ok(bytes.length > 1000, d.archivoLocal);
  }
  const publicados = readdirSync(new URL('../public/documentos-legales/', import.meta.url))
    .filter((f) => f.endsWith('.pdf')).map((f) => 'documentos-legales/' + f);
  assert.deepEqual(publicados.sort(), [...rutas].sort(), 'PDF sin ficha en el índice');
});

test('los textos sin copia conservan la fuente oficial o constan como pendientes', () => {
  for (const fuente of Object.values(corpus.fuentes)) {
    if (!fuente.archivoLocal) assert.ok(fuente.url || fuente.revisar, fuente.titulo);
  }
});

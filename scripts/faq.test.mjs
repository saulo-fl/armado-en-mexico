// Las preguntas de /preguntas se rotulan por tema en la pestaña del folder, y
// ahí solo cabe un tercio del ancho del cartón. Esto es lo que falla si alguien
// añade una pregunta —desde el admin o a mano— sin tema o con uno kilométrico.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// store.js es un script de navegador (window.Store), no un módulo: se lee el
// seed del texto, que es justo lo que se publica cuando D1 no responde.
const src = readFileSync(new URL('../src/lib/store.js', import.meta.url), 'utf8');
const faq = [...src.matchAll(/^      \{ tema: '(.*?)', q: '(.*?)', a: '(.*?)' \},$/gm)]
  .map(([, tema, q, a]) => ({ tema, q, a }));

test('el seed del FAQ trae las 12 preguntas', () => {
  // Si sube o baja el número, actualiza aquí: es el aviso de que alguien tocó
  // el contenido legal de la pantalla.
  assert.equal(faq.length, 12);
});

test('cada pregunta tiene tema, pregunta y respuesta', () => {
  for (const { tema, q, a } of faq) {
    assert.ok(tema.trim(), `sin tema: ${q}`);
    assert.ok(q.trim().startsWith('¿'), `la pregunta no lo parece: ${q}`);
    assert.ok(a.trim().length > 40, `respuesta demasiado corta: ${q}`);
  }
});

test('el tema cabe en la pestaña del folder', () => {
  for (const { tema, q } of faq) {
    assert.ok(tema.length <= 12, `tema de ${tema.length} caracteres (máx. 12): ${tema} — ${q}`);
    assert.ok(!tema.includes(' '), `el tema es una sola palabra: ${tema} — ${q}`);
  }
});

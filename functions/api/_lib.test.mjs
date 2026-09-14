// Comprobación de los topes anti-abuso de la API pública.
// Correr con:  node functions/api/_lib.test.mjs
// (El prefijo "_" impide que Pages lo convierta en una ruta.)
//
// Existe porque estos límites protegen contra algo que NO se nota: un item
// descomunal no da error, se guarda, y a partir de ahí /api/state lo sirve
// entero en cada carga de página. Sin esta prueba, subir un tope o tocar
// sanitizeItem rompe la protección en silencio.
import assert from 'node:assert/strict';
import { mergeAppend, APPEND_DOMAINS, RESENA_MIN, RESENA_MAX } from './_lib.js';

const pesa = (v) => JSON.stringify(v).length;
let n = 0;
const ok = (msg) => { n++; console.log('  ok', msg); };

// ── Un objeto anidado descomunal no entra ───────────────────────────────────
{
  const specs = {};
  for (let i = 0; i < 2500; i++) specs['k' + i] = 'x'.repeat(100);   // ~276 KB
  const out = mergeAppend('reports', [], { nombre: 'Prueba', specs });
  assert.equal(out.length, 1, 'el item debe guardarse');
  assert.equal(out[0].specs, undefined, 'specs de 276 KB debe descartarse');
  assert.equal(out[0].nombre, 'Prueba', 'los campos normales sobreviven');
  ok('objeto anidado de 276 KB descartado, el resto del item intacto');
}

// ── Un objeto anidado razonable SÍ entra (no romper el caso legítimo) ────────
{
  const out = mergeAppend('reports', [], {
    motivo: 'spam', detalle: { entidad: 'arma', entidadId: 40, resenaId: 'r_1' },
  });
  assert.equal(out[0].detalle.entidadId, 40, 'un objeto anidado normal debe conservarse');
  ok('objeto anidado legítimo conservado');
}

// ── Un array de objetos gordos tampoco pasa por el hueco del slice(0,100) ───
{
  const fotos = Array.from({ length: 100 }, () => ({ b64: 'x'.repeat(1000) }));  // ~100 KB
  const out = mergeAppend('reports', [], { nombre: 'A', fotos });
  assert.equal(out[0].fotos, undefined, 'array de 100 KB debe descartarse');
  ok('array grande descartado (slice por elementos no bastaba)');
}

// ── La lista acumulada del dominio tiene techo en bytes ─────────────────────
{
  let lista = [];
  for (let i = 0; i < 300; i++) {
    lista = mergeAppend('reports', lista, { nombre: 'n' + i, texto: 'y'.repeat(5000) });
  }
  const bytes = pesa(lista);
  assert.ok(bytes <= 512 * 1024, `el dominio debe quedar bajo 512 KB, mide ${bytes}`);
  assert.ok(lista.length > 20, `debe conservar items utiles, conserva ${lista.length}`);
  assert.equal(lista[0].nombre, 'n299', 'el mas reciente va primero');
  ok(`dominio acotado a ${bytes} bytes con ${lista.length} items, el mas nuevo primero`);
}

// ── Los envíos de «Proponer arma» y «Sugerir cambios» ya no se aceptan ─────
// Salieron el 13-sep-2026. Si alguien vuelve a añadirlos a APPEND_DOMAINS, la
// API pública volvería a guardar lo que ninguna pantalla revisa.
{
  assert.ok(!APPEND_DOMAINS.includes('pending'), 'pending no admite escritura publica');
  assert.ok(!APPEND_DOMAINS.includes('suggestions'), 'suggestions no admite escritura publica');
  assert.deepEqual(mergeAppend('pending', [], { nombre: 'x' }), [], 'mergeAppend no conoce pending');
  ok('pending y suggestions retirados de la escritura publica');
}

// ── visits: tope por arma, y la fila entera cabe en D1 ──────────────────────
{
  let v = {};
  for (let i = 0; i < 600; i++) v = mergeAppend('visits', v, { armaId: 1, ts: Date.now() - i });
  assert.equal(v['1'].length, 500, 'maximo 500 marcas por arma');

  let full = {};
  for (let id = 1; id <= 179; id++) {
    for (let i = 0; i < 600; i++) full = mergeAppend('visits', full, { armaId: id, ts: Date.now() - i });
  }
  const bytes = pesa(full);
  assert.ok(bytes < 2_000_000, `179 armas saturadas deben caber en la fila de 2 MB de D1, miden ${bytes}`);
  ok(`visits saturado en las 179 armas = ${bytes} bytes, bajo el limite de 2 MB`);
}

// ── Reseñas: el mínimo de texto se impone en el SERVIDOR ─────────────
// El formulario ya valida, pero /api/append/reviewsQueue es público y se puede
// llamar con curl. Sin esta comprobación el mínimo de 100 caracteres es
// decorativo y la cola se llena de "ok" de tres letras.
{
  const base = { tipo: 'arma', entidadId: 47, recomienda: true, autor: 'Ana', email: 'a@b.c' };
  const largo = 'x'.repeat(RESENA_MIN);

  assert.equal(mergeAppend('reviewsQueue', [], { ...base, texto: 'muy buena' }).length, 0,
    'un texto por debajo del minimo no entra');
  assert.equal(mergeAppend('reviewsQueue', [], { ...base, texto: 'x'.repeat(RESENA_MAX + 1) }).length, 0,
    'un texto por encima del maximo no entra');
  assert.equal(mergeAppend('reviewsQueue', [], { ...base, texto: largo, recomienda: 'si' }).length, 0,
    'recomienda tiene que ser booleano, no la cadena "si"');
  assert.equal(mergeAppend('reviewsQueue', [], { ...base, texto: largo, tipo: 'inventado' }).length, 0,
    'el tipo de entidad esta cerrado a una lista');
  assert.equal(mergeAppend('reviewsQueue', [], { ...base, texto: largo, entidadId: 'abc' }).length, 0,
    'entidadId tiene que ser un numero');
  ok('reviewsQueue rechaza lo que no cumple sin tocar la cola');

  const out = mergeAppend('reviewsQueue', [], { ...base, texto: largo, status: 'approved', id: 'falso' });
  assert.equal(out.length, 1, 'una resena valida si entra');
  assert.equal(out[0].status, 'pending', 'el status lo fija el servidor, no el cliente');
  assert.notEqual(out[0].id, 'falso', 'el id lo fija el servidor');
  ok('una resena valida entra siempre como pendiente');
}

console.log(`\n✔ ${n} comprobaciones OK`);

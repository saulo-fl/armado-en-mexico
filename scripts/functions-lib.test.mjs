// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// Comprobación de los topes anti-abuso de la API pública.
// Corre en `npm test`. Vive en scripts/ y no junto a functions/api/_lib.js para que
// la prueba no viaje dentro de functions/, que es lo que despliega Pages.
//
// Existe porque estos límites protegen contra algo que NO se nota: un item
// descomunal no da error, se guarda, y a partir de ahí /api/state lo sirve
// entero en cada carga de página. Sin esta prueba, subir un tope o tocar
// sanitizeItem rompe la protección en silencio.
import assert from 'node:assert/strict';
import {
  mergeAppend, APPEND_DOMAINS, RESENA_MIN, RESENA_MAX,
  normalizeReport, REPORT_MIN, REPORT_MAX,
  VISITS_MAX_CLAVES, VISITS_POR_ARMA, requireAdmin,
} from '../functions/api/_lib.js';

const pesa = (v) => JSON.stringify(v).length;
let n = 0;
const ok = (msg) => { n++; console.log('  ok', msg); };

// ── Denuncias: contrato cerrado que no acepta campos arbitrarios ────────────
const REPORTE_VALIDO = {
  reviewId: 'r_47', tipo: 'arma', entidadId: 47, entidadNombre: 'Ruger LCP',
  reviewExcerpt: 'Una reseña pública breve', motivo: 'datos',
  detalle: 'La reseña contiene el teléfono de una tercera persona.',
  email: 'ana@example.com', extra: 'no debe persistir',
};

{
  const out = normalizeReport(REPORTE_VALIDO);
  assert.equal(out.ok, true);
  assert.equal(out.value.extra, undefined);
  assert.deepEqual(Object.keys(out.value), [
    'reviewId', 'tipo', 'entidadId', 'entidadNombre', 'reviewExcerpt', 'motivo', 'detalle', 'email',
  ]);
  ok('denuncia válida normalizada por lista cerrada');
}

for (const [nombre, cambio] of [
  ['tipo desconocido', { tipo: 'inventado' }],
  ['motivo desconocido', { motivo: 'spam' }],
  ['detalle corto', { detalle: 'demasiado corto' }],
  ['detalle largo', { detalle: 'x'.repeat(REPORT_MAX + 1) }],
  ['correo inválido', { email: 'no-es-correo' }],
  ['nombre sobredimensionado', { entidadNombre: 'x'.repeat(121) }],
]) {
  const out = normalizeReport({ ...REPORTE_VALIDO, ...cambio });
  assert.equal(out.ok, false, nombre);
  assert.deepEqual(mergeAppend('reports', [], { ...REPORTE_VALIDO, ...cambio }), [], nombre);
}
ok('denuncias inválidas no modifican el dominio');

{
  const current = [{ id: 'd_existente', status: 'pending' }];
  const out = mergeAppend('reports', current, { ...REPORTE_VALIDO, motivo: 'inventado' });
  assert.deepEqual(out, current, 'un reporte inválido conserva la cola existente');
  assert.notEqual(out, current, 'la defensa no expone el array original');
  ok('denuncia inválida conserva la cola existente');
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
  assert.equal(v['1'].length, VISITS_POR_ARMA, `maximo ${VISITS_POR_ARMA} marcas por arma`);

  let full = {};
  // Peor caso construido directamente (mergeAppend con la marca del servidor
  // tardaría demasiado): el tope de claves lleno, cada una con su tope de marcas.
  const ahora = Date.now();
  for (let id = 1; id <= VISITS_MAX_CLAVES; id++) {
    full[String(id)] = Array.from({ length: VISITS_POR_ARMA }, (_, i) => ahora - i);
  }
  full = mergeAppend('visits', full, { armaId: 1 });
  const bytes = pesa(full);
  assert.ok(bytes < 2_000_000, `visits saturado debe caber en la fila de 2 MB de D1, mide ${bytes}`);
  ok(`visits saturado (${VISITS_MAX_CLAVES} claves) = ${bytes} bytes, bajo el limite de 2 MB`);
}

// ── visits: el cliente no elige la marca ni infla la fila con ids ───────────
{
  const antes = Date.now();
  const futuro = antes + 10 * 365 * 24 * 3600 * 1000;
  const v = mergeAppend('visits', {}, { armaId: 7, ts: futuro });
  assert.equal(v['7'].length, 1);
  assert.ok(v['7'][0] >= antes && v['7'][0] <= Date.now(), 'la marca es la hora del servidor, no la enviada');
  ok('visits ignora el ts del cliente');

  for (const malo of [0, -3, 100000, 'abc', null]) {
    assert.deepEqual(mergeAppend('visits', {}, { armaId: malo }), {}, `armaId ${malo} rechazado`);
  }
  ok('visits rechaza ids fuera de rango');

  let lleno = {};
  for (let id = 1; id <= VISITS_MAX_CLAVES + 50; id++) lleno = mergeAppend('visits', lleno, { armaId: id });
  assert.ok(Object.keys(lleno).length <= VISITS_MAX_CLAVES, 'tope de claves respetado');
  ok(`visits nunca pasa de ${VISITS_MAX_CLAVES} claves`);
}

// ── ids de reseña/denuncia: sin colisiones ──────────────────────────────────
{
  const base = { tipo: 'arma', entidadId: 47, recomienda: true, autor: 'Ana', texto: 'x'.repeat(RESENA_MIN) };
  let cola = [];
  for (let i = 0; i < 200; i++) cola = mergeAppend('reviewsQueue', cola, base);
  assert.equal(new Set(cola.map((r) => r.id)).size, cola.length, 'ids únicos');
  ok('200 reseñas en ráfaga, 200 ids distintos');
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

// ── ALLOW_INSECURE_ADMIN solo abre en localhost ─────────────────────────────
// Si la variable se colara en el proyecto de Pages, en armado.mx no debe abrir.
{
  const env = { ALLOW_INSECURE_ADMIN: '1' };
  const prod = await requireAdmin(new Request('https://armado.mx/api/admin/state/pages'), env);
  assert.ok(prod, 'en armado.mx no abre');
  assert.equal(prod.status, 503, 'sin vars de Access cae al fail-closed');
  const prodConVars = await requireAdmin(new Request('https://armado.mx/api/admin/state/pages'),
    { ...env, CF_ACCESS_TEAM_DOMAIN: 'x.cloudflareaccess.com', CF_ACCESS_AUD: 'aud' });
  assert.equal(prodConVars.status, 401, 'con vars de Access exige token');
  const local = await requireAdmin(new Request('http://localhost:8788/api/admin/state/pages'), env);
  assert.equal(local, null, 'en localhost sí abre (wrangler pages dev)');
  ok('ALLOW_INSECURE_ADMIN atado a localhost');
}

// ── JWT: alg distinto de RS256 y token sin exp se rechazan sin red ──────────
{
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const env = { CF_ACCESS_TEAM_DOMAIN: 'x.cloudflareaccess.com', CF_ACCESS_AUD: 'aud' };
  const futuro = Math.floor(Date.now() / 1000) + 3600;
  const casos = [
    ['alg none', { alg: 'none', kid: 'k' }, { aud: 'aud', iss: 'https://x.cloudflareaccess.com', exp: futuro }],
    ['alg HS256', { alg: 'HS256', kid: 'k' }, { aud: 'aud', iss: 'https://x.cloudflareaccess.com', exp: futuro }],
    ['sin exp', { alg: 'RS256', kid: 'k' }, { aud: 'aud', iss: 'https://x.cloudflareaccess.com' }],
    ['sin iss', { alg: 'RS256', kid: 'k' }, { aud: 'aud', exp: futuro }],
  ];
  for (const [nombre, h, p] of casos) {
    const tok = `${b64(h)}.${b64(p)}.AAAA`;
    const res = await requireAdmin(new Request('https://armado.mx/x', { headers: { 'Cf-Access-Jwt-Assertion': tok } }), env);
    assert.equal(res && res.status, 403, nombre);
  }
  ok('JWT con alg ajeno, sin exp o sin iss rechazado');
}

console.log(`\n✔ ${n} comprobaciones OK`);

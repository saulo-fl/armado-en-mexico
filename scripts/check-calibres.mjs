// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// Comprueba window.CALIBRES de src/data/data-extra.js — `node scripts/check-calibres.mjs`
// Este archivo es el JUEZ de la guía de calibres: ninguna ficha debe publicarse sin
// su largo real, su estatus legal y la fuente de sus cifras. Un calibre sin `avail`
// solo se admite si está marcado `revisar: true`: es un hueco consciente, no un olvido.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ruta = fileURLToPath(new URL('../src/data/data-extra.js', import.meta.url));
const fuente = readFileSync(ruta, 'utf8');
globalThis.window = globalThis;
vm.runInThisContext(fuente, { filename: ruta });

const slug = (s) => String(s == null ? '' : s)
  .normalize('NFD').replace(/\p{Diacritic}/gu, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const ESPERADOS = 30;
const AVAIL = ['dcam', 'seguridad', 'ejercito'];
const SISTEMAS = ['Rimfire', 'Percusión central'];
const TEXTO = ['id', 'clase', 'sistema', 'uso', 'desc', 'legalArt', 'legalNota'];

const cal = window.CALIBRES || [];
const errores = [];
const avisos = [];
const err = (id, m) => errores.push(`${id} — ${m}`);

if (cal.length !== ESPERADOS) err('(lista)', `hay ${cal.length} calibres, se esperaban ${ESPERADOS}`);

const vistos = new Map();
for (const c of cal) {
  const id = c.id || '(sin id)';
  for (const campo of TEXTO) {
    if (!c[campo] || String(c[campo]).trim() === '') err(id, `le falta ${campo}`);
  }
  if (c.avail === null || c.avail === undefined) {
    if (c.revisar !== true) err(id, 'sin avail y sin revisar:true — un hueco debe ir marcado');
    else avisos.push(`${id} — sin sello legal a propósito, pendiente de decisión`);
  } else if (!AVAIL.includes(c.avail)) {
    err(id, `avail "${c.avail}" fuera de dominio (${AVAIL.join(' / ')})`);
  }
  if (c.sistema && !SISTEMAS.includes(c.sistema)) err(id, `sistema "${c.sistema}" fuera de dominio`);
  if (typeof c.mm !== 'number' || !(c.mm > 0)) err(id, 'sin largo real (mm): sostiene la escala de la mesa');
  // El número y su texto tienen que contar lo mismo. Si el texto trae una cifra, el
  // campo numérico NO puede venir vacío: es el que dibuja la regla comparativa, y un
  // null ahí deja la ficha muda sin que nada más lo delate. Las escopetas, cuya
  // energía es "Variable" a propósito, sí van sin número.
  for (const [txt, num] of [['velocidad', 'velocidadMs'], ['energia', 'energiaJ']]) {
    if (c[num] !== null && typeof c[num] !== 'number') err(id, `${num} debe ser número o null`);
    if (typeof c[num] === 'number' && !(c[num] > 0)) err(id, `${num} vale ${c[num]}, debe ser mayor que 0`);
    if (/\d/.test(String(c[txt] || '')) && typeof c[num] !== 'number') {
      err(id, `${txt} dice "${c[txt]}" pero ${num} no trae ese número`);
    }
  }
  if (!c.fuente || !c.fuente.nombre || !c.fuente.fecha) err(id, 'sin fuente {nombre, fecha} para sus cifras');
  if (typeof c.enCatalogo !== 'boolean') err(id, 'sin enCatalogo (true/false)');
  const s = slug(id);
  if (vistos.has(s)) err(id, `su slug "${s}" choca con ${vistos.get(s)}`);
  else vistos.set(s, id);
  if (c.revisar === true) avisos.push(`${id} — marcado para revisión de Saulo`);
}

// La regla vieja derivaba el sistema de percusión diciendo que solo el .22 LR es
// rimfire. Con el .22 WMR en la guía eso sería falso, así que `sistema` va explícito.
if (/forEach\([^)]*\)\s*=>\s*\{[\s\S]{0,200}sistema\s*=/.test(fuente)) {
  err('(data-extra.js)', 'sigue derivando `sistema` con un forEach: debe venir explícito en cada entrada');
}

for (const a of [...new Set(avisos)]) console.log('· aviso:', a);
if (errores.length) {
  console.error(`\nFALLA ${errores.length} problema(s):`);
  for (const e of errores) console.error('  ✖', e);
  process.exit(1);
}
console.log(`\nOK ${cal.length}/${ESPERADOS} calibres — campos, dominios, fuentes y slugs correctos`);

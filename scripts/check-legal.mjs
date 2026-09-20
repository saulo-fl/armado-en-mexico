// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// Comprueba window.AMX_LEGAL de src/data/data-legal.js — `node scripts/check-legal.mjs`
//
// Este archivo es el JUEZ del corpus normativo. §6b de docs/DESIGN.md dice: «Todo
// contenido legal va respaldado por texto real de la ley. Si no hay fuente, no se
// escribe», y §14: «La información jurídica debe mostrar siempre FUENTE + FECHA DE
// ACTUALIZACIÓN». Aquí eso deja de ser disciplina y pasa a ser una prueba que falla.
//
// La regla que lo gobierna todo: una afirmación necesita `fundamento` Y `fuente`, o
// va marcada `revisar: true` con su `nota` — y entonces NO se publica. Un hueco
// marcado es preferible a una afirmación jurídica inventada; es la misma decisión que
// docs/fuentes/README.md tomó con el .357 Magnum, el .45 ACP y el 5.7×28.
//
// Con `--entrevista` comprueba además que todo id de documento que cita el guion de
// src/data/data-entrevista.js resuelve contra los requisitos del corpus: es lo que
// impide que la entrevista críe su propia tabla de documentos y se desincronice.
import vm from 'node:vm';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// ── Reglas del dominio ──────────────────────────────────────────────────────
const ENTIDADES_MX = 32;
const DIAS_AVISO = 180;          // una consulta más vieja que esto merece repaso
const DIAS_ERROR = 365;          // más vieja que esto no se publica
const HOMOCLAVE = /^(DEFENSA|SEDENA)-\d{2}-\d{3}/;
const ADVERTENCIA = 'La información mostrada es de carácter informativo. Consulta siempre la normativa y fuente oficial vigente.';
// §6b prohíbe la iconografía oficial. El corpus no lleva imágenes: prohibir las claves
// cierra por construcción toda una familia de violaciones en vez de vigilarla a ojo.
const CLAVES_PROHIBIDAS = ['img', 'imagen', 'logo', 'escudo', 'emblema', 'sello', 'icono'];
// Las tablas que contienen afirmaciones y por tanto necesitan respaldo.
const TABLAS = ['normas', 'articulos', 'tramites', 'requisitos', 'entidades'];

const dias = (desde, hasta) => Math.floor((hasta - desde) / 86400000);

/**
 * Revisa el corpus. Devuelve { errores, avisos } en vez de imprimir, para que la
 * suite de pruebas lo pueda ejecutar en proceso — `check-calibres.mjs` es todo
 * código de nivel superior y por eso se quedó fuera de `npm test`; este no.
 */
export function revisarLegal(corpus, opciones = {}) {
  const hoy = opciones.hoy ? new Date(opciones.hoy) : new Date();
  const errores = [];
  const avisos = [];
  const err = (donde, m) => errores.push(`${donde} — ${m}`);
  const avisa = (donde, m) => avisos.push(`${donde} — ${m}`);

  if (!corpus || typeof corpus !== 'object') {
    return { errores: ['(corpus) — window.AMX_LEGAL no existe o no es un objeto'], avisos };
  }

  const fuentes = corpus.fuentes || {};
  const porId = (lista) => new Map((lista || []).map((x) => [x.id, x]));
  const normas = porId(corpus.normas);
  const articulos = porId(corpus.articulos);
  const tramites = porId(corpus.tramites);
  const requisitos = porId(corpus.requisitos);
  const entidades = porId(corpus.entidades);
  const escenarios = new Set((corpus.escenarios || []).map((e) => e.id));

  // 1 · La advertencia obligatoria, literal. El brief la pide con estas palabras.
  if (corpus.advertencia !== ADVERTENCIA) {
    err('(corpus)', `falta la advertencia obligatoria literal.\n    esperada: "${ADVERTENCIA}"\n    hallada:  "${corpus.advertencia || ''}"`);
  }
  if (!corpus.actualizado) err('(corpus)', 'sin `actualizado`: §14 pide fecha de actualización visible');

  // 2 · Las fuentes: son el catálogo de citas y el único sitio donde se escribe una URL.
  for (const [id, f] of Object.entries(fuentes)) {
    const d = `fuente:${id}`;
    if (!f.titulo) err(d, 'sin `titulo`');
    if (!f.emisor) err(d, 'sin `emisor`: quién lo publica es parte de la cita');
    if (f.revisar === true) {
      if (!f.nota) err(d, 'marcada `revisar` y sin `nota`: un hueco sin explicar es un olvido');
      continue;                       // un hueco no se juzga por lo que le falta
    }
    if (typeof f.nivel !== 'number' || f.nivel < 1 || f.nivel > 4) {
      err(d, 'sin `nivel` 1-4 (jerarquía de CONTRIBUTING.md: 1 oficial legal · 2 inventario DCAM/OTCA · 3 fabricante · 4 editorial)');
    }
    if (!f.url) {
      err(d, 'sin `url` y sin `revisar: true`: o se cita algo consultable, o es un hueco');
    } else {
      let u = null;
      try { u = new URL(f.url); } catch (e) { err(d, `\`url\` no es una URL válida: ${f.url}`); }
      if (u) {
        if (u.protocol !== 'https:') err(d, `\`url\` no es https: ${f.url}`);
        if (u.hostname !== 'gob.mx' && !u.hostname.endsWith('.gob.mx')) {
          err(d, `\`url\` no es un dominio oficial (*.gob.mx): ${u.hostname}`);
        }
      }
    }
    if (!f.fechaConsulta) {
      err(d, 'sin `fechaConsulta`: §14 exige fecha, y sin ella no se sabe si sigue vigente');
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(f.fechaConsulta) || isNaN(new Date(f.fechaConsulta))) {
      err(d, `\`fechaConsulta\` no es AAAA-MM-DD: ${f.fechaConsulta}`);
    } else {
      const edad = dias(new Date(f.fechaConsulta), hoy);
      if (edad < 0) err(d, `\`fechaConsulta\` está en el futuro: ${f.fechaConsulta}`);
      else if (edad > DIAS_ERROR) err(d, `consultada hace ${edad} días: por encima de ${DIAS_ERROR} no se publica`);
      else if (edad > DIAS_AVISO) avisa(d, `consultada hace ${edad} días, conviene repasarla`);
    }
  }

  // 3 · Recorrido de las tablas con afirmaciones.
  for (const tabla of TABLAS) {
    const lista = corpus[tabla];
    if (!Array.isArray(lista)) { err(`(corpus)`, `\`${tabla}\` falta o no es un array`); continue; }
    const vistos = new Set();
    for (const it of lista) {
      const d = `${tabla}:${it.id || '(sin id)'}`;
      if (!it.id) err(d, 'sin `id`');
      else if (vistos.has(it.id)) err(d, 'id repetido');
      else vistos.add(it.id);

      // 3a · El hueco: marcado, explicado, y sin respaldo completo (si lo tiene, ya no es hueco).
      if (it.revisar === true) {
        if (!it.nota) err(d, 'marcado `revisar` y sin `nota`: un hueco sin explicar es un olvido');
        if (it.fundamento && it.fuente) {
          err(d, 'marcado `revisar` pero ya trae `fundamento` y `fuente`: quítale la marca o quítale el respaldo');
        }
      } else {
        // 3b · La regla de fondo: afirmar exige respaldo.
        if (!it.fundamento) err(d, 'sin `fundamento` y sin `revisar: true` (§6b: si no hay fuente, no se escribe)');
        if (!it.fuente) err(d, 'sin `fuente` y sin `revisar: true` (§6b)');
      }

      // 3c · Toda referencia resuelve.
      refResuelve(err, d, 'fuente', it.fuente, fuentes);
      refResuelve(err, d, 'norma', it.norma, normas);
      refResuelve(err, d, 'articulo', it.articulo, articulos);
      refResuelve(err, d, 'tramiteRelacionado', it.tramiteRelacionado, tramites);
      refResuelve(err, d, 'tramite', it.tramite, tramites);

      // 3d · Las variantes: cada una es una afirmación por derecho propio.
      for (const v of it.variantes || []) {
        const dv = `${d} · variante:${v.escenario || '(sin escenario)'}`;
        if (!v.escenario) err(dv, 'sin `escenario`');
        else if (!escenarios.has(v.escenario)) err(dv, `\`escenario\` "${v.escenario}" no existe en la tabla escenarios`);
        if (!v.documento) err(dv, 'sin `documento`: la variante no dice qué papel es');
      }
      for (const l of it.limites || []) {
        const dl = `${d} · limite:${l.id || '(sin id)'}`;
        if (!l.texto) err(dl, 'sin `texto`');
        if (l.revisar !== true) {
          if (!l.fundamento) err(dl, 'sin `fundamento` y sin `revisar: true`');
          refResuelve(err, dl, 'fuente', l.fuente, fuentes);
        }
      }

      // 3e · Los costos caducan. Las cuotas de la Ley Federal de Derechos se
      // actualizan cada 1 de enero: sin `anio` no hay forma de saber si mintió.
      const costos = [it.costo, ...(it.costos || [])].filter(Boolean);
      for (const c of costos) {
        if (c.revisar === true) continue;
        if (typeof c.monto !== 'number') err(d, '`costo` sin `monto` numérico');
        if (!c.moneda) err(d, '`costo` sin `moneda`');
        if (typeof c.anio !== 'number') err(d, '`costo` sin `anio`: las cuotas cambian cada 1 de enero');
        else if (c.anio < hoy.getFullYear()) avisa(d, `\`costo\` es del ${c.anio} y estamos en ${hoy.getFullYear()}: verifica la cuota vigente`);
        refResuelve(err, d, 'costo.fuente', c.fuente, fuentes);
      }

      if (it.homoclave && !HOMOCLAVE.test(it.homoclave)) {
        err(d, `\`homoclave\` "${it.homoclave}" no tiene la forma DEFENSA-00-000`);
      }

      // 3f · §6b: ninguna iconografía oficial, ni siquiera un campo donde meterla.
      for (const k of Object.keys(it)) {
        if (CLAVES_PROHIBIDAS.includes(k.toLowerCase())) {
          err(d, `clave "${k}" prohibida: §6b veta la iconografía oficial, y el corpus no lleva imágenes`);
        }
      }
    }
  }

  // 4 · Trámites y requisitos se apuntan en los DOS sentidos. Un solo sentido deja
  //     que una casilla se caiga del checklist sin que nada lo delate.
  for (const t of corpus.tramites || []) {
    for (const rid of t.requisitos || []) {
      const r = requisitos.get(rid);
      if (!r) { err(`tramites:${t.id}`, `requiere "${rid}", que no existe en requisitos`); continue; }
      if (r.tramite !== t.id) {
        err(`tramites:${t.id}`, `lista "${rid}", pero ese requisito dice pertenecer a "${r.tramite}"`);
      }
    }
  }
  for (const r of corpus.requisitos || []) {
    if (!r.tramite) continue;
    const t = tramites.get(r.tramite);
    if (t && !(t.requisitos || []).includes(r.id)) {
      err(`requisitos:${r.id}`, `dice pertenecer a "${r.tramite}", pero ese trámite no lo lista: se caería del checklist`);
    }
    if (!r.variantes && !r.escenarios) {
      err(`requisitos:${r.id}`, 'sin `escenarios` ni `variantes`: no se sabe a quién le toca');
    }
  }

  // 5 · Las 32 entidades. Ni 31 ni 33: si falta una, alguien se queda sin su portal.
  const ents = corpus.entidades || [];
  if (ents.length !== ENTIDADES_MX) {
    err('(entidades)', `hay ${ents.length} y México tiene ${ENTIDADES_MX} entidades federativas`);
  }
  const nombres = new Set();
  for (const e of ents) {
    if (!e.nombre) err(`entidades:${e.id}`, 'sin `nombre`');
    else if (nombres.has(e.nombre)) err(`entidades:${e.id}`, `nombre repetido: ${e.nombre}`);
    else nombres.add(e.nombre);
    const a = e.antecedentes;
    if (!a) err(`entidades:${e.id}`, 'sin `antecedentes`: es el dato por el que existe la pestaña Estatal');
    else if (a.revisar !== true) {
      if (!a.dependencia) err(`entidades:${e.id}`, '`antecedentes` sin `dependencia` y sin `revisar: true`');
      if (a.url) refUrl(err, `entidades:${e.id}`, a.url);
    } else if (!a.nota) {
      err(`entidades:${e.id}`, '`antecedentes` marcado `revisar` y sin `nota`');
    }
  }

  return { errores, avisos };
}

function refResuelve(err, donde, campo, valor, tabla) {
  if (!valor) return;
  const existe = tabla instanceof Map ? tabla.has(valor) : Object.prototype.hasOwnProperty.call(tabla, valor);
  if (!existe) err(donde, `\`${campo}\` apunta a "${valor}", que no existe`);
}

function refUrl(err, donde, url) {
  let u = null;
  try { u = new URL(url); } catch (e) { err(donde, `url inválida: ${url}`); return; }
  if (u.protocol !== 'https:') err(donde, `url no es https: ${url}`);
  if (u.hostname !== 'gob.mx' && !u.hostname.endsWith('.gob.mx')) {
    err(donde, `url no es un dominio oficial (*.gob.mx): ${u.hostname}`);
  }
}

/**
 * Comprueba que el guion de la entrevista no cría su propia tabla de documentos:
 * todo id que cita tiene que resolver contra los requisitos del corpus.
 */
export function revisarEntrevista(corpus, arbol) {
  const errores = [];
  const avisos = [];
  if (!arbol) return { errores: ['(entrevista) — window.AMX_ENTREVISTA no existe'], avisos };
  const ids = new Set((corpus.requisitos || []).map((r) => r.id));
  const usados = new Set();
  const cita = (lista, donde) => {
    for (const id of lista || []) {
      usados.add(id);
      if (!ids.has(id)) errores.push(`${donde} — cita el documento "${id}", que no existe en los requisitos del corpus`);
    }
  };
  cita(arbol.siempre, 'entrevista:siempre');
  for (const p of arbol.preguntas || []) {
    for (const o of p.opciones || []) cita(o.documentos, `entrevista:${p.id} · ${o.id}`);
  }
  for (const id of usados) {
    // Nada que hacer: el bucle de arriba ya reportó los que no resuelven.
    void id;
  }
  return { errores, avisos };
}

// ── Ejecución directa ───────────────────────────────────────────────────────
const ESTE = fileURLToPath(import.meta.url);
if (process.argv[1] && process.argv[1].replace(/\\/g, '/') === ESTE.replace(/\\/g, '/')) {
  const cargar = (rel, global) => {
    const ruta = fileURLToPath(new URL(rel, import.meta.url));
    if (!existsSync(ruta)) {
      console.error(`✖ falta ${rel} — todavía no se ha escrito el corpus`);
      process.exit(1);
    }
    globalThis.window = globalThis;
    vm.runInThisContext(readFileSync(ruta, 'utf8'), { filename: ruta });
    return globalThis[global];
  };

  const corpus = cargar('../src/data/data-legal.js', 'AMX_LEGAL');
  let { errores, avisos } = revisarLegal(corpus);

  if (process.argv.includes('--entrevista')) {
    const arbol = cargar('../src/data/data-entrevista.js', 'AMX_ENTREVISTA');
    const r = revisarEntrevista(corpus, arbol);
    errores = errores.concat(r.errores);
    avisos = avisos.concat(r.avisos);
  }

  for (const a of avisos) console.log(`· aviso: ${a}`);
  if (errores.length) {
    for (const e of errores) console.error(`✖ ${e}`);
    console.error(`\nFALLA ${errores.length} problema(s)`);
    process.exit(1);
  }
  const huecos = [];
  for (const tabla of TABLAS) for (const it of corpus[tabla] || []) if (it.revisar === true) huecos.push(`${tabla}:${it.id}`);
  for (const [id, f] of Object.entries(corpus.fuentes || {})) if (f.revisar === true) huecos.push(`fuente:${id}`);
  console.log(`OK · ${(corpus.entidades || []).length} entidades · ${Object.keys(corpus.fuentes || {}).length} fuentes · ${huecos.length} hueco(s) marcado(s)`);
  if (huecos.length) console.log(`   huecos: ${huecos.join(', ')}`);
}

// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

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

// El guion NO puede prometer un resultado: la autorización la decide la autoridad.
//
// Lo que se persigue es la promesa EN SEGUNDA PERSONA sobre el desenlace del trámite,
// no la palabra suelta. «Autorizado» aparece legítimamente en citas del propio formato
// —«nadie está autorizado para recibir dinero en efectivo», que es una advertencia
// contra la corrupción y tiene que poder decirse— y en «el material autorizado en el
// último permiso». Un patrón por palabra suelta las tacharía todas.
const PROMESAS = new RegExp([
  'te (garantizamos|aseguramos)',
  '(est[áa]s|quedas|ser[áa]s|has sido) autorizad',
  'tu (permiso|solicitud|tr[áa]mite) (ser[áa]|est[áa]|queda) (autorizad|aprobad|concedid)',
  's[íi],? (s[íi] )?puedes (comprar|adquirir)',
  'podr[áa]s (comprar|adquirir)',
  'tu tr[áa]mite proceder[áa]',
  'tienes garantizad',
].join('|'), 'i');
const JERGA = /\b(dossier|curadur[íi]a)\b/i;
const CLAVE_OK = /^[a-z0-9]{1,6}$/;

/**
 * Juzga el guion de la entrevista. Dos familias de comprobación:
 *
 *   1. Que no críe su propia tabla de documentos. Todo id que cita tiene que resolver
 *      contra los requisitos del corpus, o volveríamos a tener el mismo documento
 *      descrito en dos sitios, que es el incidente «DCAM Monterrey» otra vez.
 *   2. Que el árbol sea recorrible y honesto: claves estables, guardas que miran hacia
 *      atrás, todo camino con salida, y —lo que más importa— que un impedimento
 *      definitivo no insinúe una salida que no existe, y que nada prometa un permiso.
 */
export function revisarEntrevista(corpus, arbol) {
  const errores = [];
  const avisos = [];
  if (!arbol) return { errores: ['(entrevista) — el guion no existe'], avisos };
  const err = (donde, m) => errores.push(`${donde} — ${m}`);

  const ids = new Set((corpus.requisitos || []).map((r) => r.id));
  const escenarios = new Set((corpus.escenarios || []).map((e) => e.id));
  const cita = (lista, donde) => {
    for (const id of lista || []) {
      if (!ids.has(id)) err(donde, `cita el documento "${id}", que no existe en los requisitos del corpus`);
    }
  };
  cita(arbol.siempre, 'entrevista:siempre');

  const preguntas = arbol.preguntas || [];
  if (!preguntas.length) err('(entrevista)', 'no tiene preguntas');

  const vistas = new Map();   // id de pregunta -> índice, para que las guardas miren atrás
  const claves = new Map();
  const etapas = new Set((arbol.etapas || []).map((e) => e.id));

  preguntas.forEach((p, i) => {
    const d = `entrevista:${p.id || '(sin id)'}`;
    if (!p.id) err(d, 'sin `id`');
    if (!p.texto) err(d, 'sin `texto`');
    if (p.etapa && etapas.size && !etapas.has(p.etapa)) err(d, `\`etapa\` "${p.etapa}" no existe`);

    // La clave viaja en el enlace compartible: es para siempre y no se puede reusar.
    if (!CLAVE_OK.test(p.clave || '')) err(d, `\`clave\` "${p.clave}" debe casar ${CLAVE_OK}`);
    else if (claves.has(p.clave)) err(d, `\`clave\` "${p.clave}" ya la usa ${claves.get(p.clave)}`);
    else claves.set(p.clave, p.id);

    // Una guarda hacia adelante no se cumple nunca: es el equivalente al nodo huérfano.
    for (const regla of p.si || []) {
      const ref = regla.pregunta;
      if (!vistas.has(ref)) {
        err(d, `su guarda mira a "${ref}", que no es una pregunta ANTERIOR: nunca se cumpliría`);
        continue;
      }
      const previa = preguntas[vistas.get(ref)];
      const valores = [].concat(regla.es || [], regla.noEs || []);
      if (!valores.length) err(d, `su guarda sobre "${ref}" no trae ni \`es\` ni \`noEs\``);
      for (const v of valores) {
        if (!(previa.opciones || []).some((o) => o.id === v)) {
          err(d, `su guarda espera la respuesta "${v}", que no es una opción de "${ref}"`);
        }
      }
    }

    const ops = p.opciones || [];
    if (!ops.length) err(d, 'sin opciones: la entrevista se quedaría sin salida aquí');
    const clavesOp = new Set();
    for (const o of ops) {
      const dd = `${d} · ${o.id || '(sin id)'}`;
      if (!o.id) err(dd, 'opción sin `id`');
      if (!o.texto) err(dd, 'opción sin `texto`');
      if (!CLAVE_OK.test(o.clave || '')) err(dd, `\`clave\` de opción "${o.clave}" debe casar ${CLAVE_OK}`);
      else if (clavesOp.has(o.clave)) err(dd, `\`clave\` de opción "${o.clave}" repetida dentro de la pregunta`);
      else clavesOp.add(o.clave);
      cita(o.documentos, dd);

      // El escenario declarado es lo que permite a amxRequisitosDe elegir la variante
      // que le toca a esta persona. Un id que no exista en el corpus no falla a gritos:
      // simplemente deja caer del expediente el documento de esa variante, en silencio.
      // Así se perdió la cartilla del Servicio Militar la primera vez.
      if (o.escenario && !escenarios.has(o.escenario)) {
        err(dd, `\`escenario\` "${o.escenario}" no existe en el corpus: su variante se caería del expediente sin avisar`);
      }

      const imp = o.impedimento;
      if (imp) {
        if (!['definitivo', 'subsanable'].includes(imp.tipo)) {
          err(dd, `\`impedimento.tipo\` "${imp.tipo}" no es definitivo ni subsanable`);
        }
        if (!imp.motivo) err(dd, 'impedimento sin `motivo`');
        if (imp.tipo === 'definitivo') {
          // Insinuar una salida donde la ley no la da es peor que no decir nada.
          if (imp.remedio !== null && imp.remedio !== undefined) {
            err(dd, 'un impedimento definitivo debe llevar `remedio: null`: no hay salida que ofrecer');
          }
          if (!imp.nota) err(dd, 'un impedimento definitivo necesita `nota` que explique por qué no la hay');
        }
        if (imp.tipo === 'subsanable') {
          if (!imp.remedio) err(dd, 'un impedimento subsanable necesita `remedio`: decir qué falta sin decir cómo se consigue no sirve de nada');
          else if (imp.remedio.trim() === (imp.motivo || '').trim()) err(dd, 'el `remedio` repite el `motivo`');
        }
        if (!imp.fundamento) err(dd, 'impedimento sin `fundamento`: es una afirmación normativa');
      }
      if (o.aviso) {
        if (!o.aviso.texto) err(dd, 'aviso sin `texto`');
        // Un aviso es para lo que nadie exige. Si dice que no puedes comprar, es un
        // impedimento disfrazado, y encima uno sin respaldo.
        if (/no puedes? (comprar|adquirir)/i.test(o.aviso.texto || '')) {
          err(dd, 'un `aviso` no puede decir que no puedes comprar: o es impedimento con su fundamento, o no se dice');
        }
      }
      if (!o.impedimento && !o.aviso && !o.documentos && !o.id) err(dd, 'la opción no hace nada');
    }
    vistas.set(p.id, i);
  });

  const texto = JSON.stringify(arbol);
  const promesa = texto.match(PROMESAS);
  if (promesa) err('(entrevista)', `promete un resultado ("${promesa[0]}"): la autorización la decide la autoridad, no el cuestionario`);
  const jerga = texto.match(JERGA);
  if (jerga) err('(entrevista)', `usa vocabulario prohibido ("${jerga[0]}")`);

  const sinUsar = [...ids].filter((id) => !texto.includes('"' + id + '"'));
  if (sinUsar.length) avisos.push(`(entrevista) — requisitos del corpus que el guion nunca cita: ${sinUsar.join(', ')}`);

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

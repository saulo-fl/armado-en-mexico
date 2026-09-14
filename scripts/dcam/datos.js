#!/usr/bin/env node
/* Lee y aplica cambios de inventario en los data-*.js de "Armado en México".
 *   node scripts/dcam/datos.js leer [raiz]              → JSON por stdout
 *   node scripts/dcam/datos.js aplicar plan.json [raiz] → edita los archivos
 * Diseño: scripts/dcam/DISENO.md (pieza 2). Carga los datos igual que auditar.js.
 */
const fs = require('fs');
const path = require('path');

const RAIZ_REPO = path.resolve(__dirname, '..', '..');
const DATA = ['data.js', 'data-extra.js', 'data-precios.js', 'data-accesorios.js', 'data-municiones.js'];

function cargar(raiz) {
  const win = {};
  global.window = win;
  for (const f of DATA) (0, eval)(fs.readFileSync(path.join(raiz, 'src/data', f), 'utf8'));
  return win;
}

const porFecha = (h) => (h || []).slice().sort((x, y) => String(x.date).localeCompare(String(y.date)));

function leer(raiz = RAIZ_REPO) {
  const w = cargar(raiz);
  const ficha = (f, hist, extra = {}) => ({ id: f.id, nombre: f.nombre, hist: porFecha(hist[f.id]), ...extra });
  const E = w.AMX_ARMAS_EXISTENCIAS || {};
  return {
    armas: w.DB.map((a) => ficha(a, w.AMX_PRICE_HISTORY_SEED || {}, { existencia: a.id in E ? E[a.id] : null })),
    accesorios: (w.ACCESORIOS || []).map((a) => ficha(a, w.ACCESORIOS_PRICE_HISTORY || {})),
    municiones: (w.MUNICIONES || []).map((m) => ficha(m, w.MUNICIONES_PRICE_HISTORY || {})),
    manuales: { armas: w.AMX_MANUALES_SEED, accesorios: w.ACCESORIOS_MANUALES, municiones: w.MUNICIONES_MANUALES },
  };
}

const { parse } = require(path.join(RAIZ_REPO, 'node_modules', '@babel', 'parser'));

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const fechaLarga = (f) => { const [a, m, d] = f.split('-').map(Number); return `${d} de ${MESES[m - 1]} ${a}`; };
const guion = (f) => f.replace(/-/g, '_');
const pesos = (n) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;

const CATALOGOS = {
  armas: {
    pdf: (f) => `dcam-existencias-${f}.pdf`, manual: (f) => `man_dcam_${guion(f)}`, etiqueta: 'armas',
    manuales: ['src/data/data-precios.js', 'AMX_MANUALES_SEED'], hist: ['src/data/data-precios.js', 'AMX_PRICE_HISTORY_SEED'],
    ficha: ['src/data/data.js', 'mk', 12, (n) => `"${Number(n).toFixed(2)}"`], conQty: false, v: ['data.js', 'data-precios.js'],
  },
  accesorios: {
    pdf: (f) => `dcam-accesorios-${f}.pdf`, manual: (f) => `man_acc_${guion(f)}`, etiqueta: 'accesorios',
    manuales: ['src/data/data-accesorios.js', 'ACCESORIOS_MANUALES'], hist: ['src/data/data-accesorios.js', 'ACCESORIOS_PRICE_HISTORY'],
    ficha: ['src/data/data-accesorios.js', 'amx', 6, (n) => String(Number(n))], conQty: true, v: ['data-accesorios.js'],
  },
  municiones: {
    pdf: (f) => `dcam-municiones-${f}.pdf`, manual: (f) => `man_mun_dcam_${guion(f)}`, etiqueta: 'municiones',
    manuales: ['src/data/data-municiones.js', 'MUNICIONES_MANUALES'], hist: ['src/data/data-municiones.js', 'MUNICIONES_PRICE_HISTORY'],
    ficha: ['src/data/data-municiones.js', 'mun', 9, (n) => String(Number(n))], conQty: true, v: ['data-municiones.js'],
  },
};

function recorrer(nodo, visita) {
  if (!nodo || typeof nodo.type !== 'string') return;
  visita(nodo);
  for (const k of Object.keys(nodo)) {
    const v = nodo[k];
    if (Array.isArray(v)) v.forEach((x) => recorrer(x, visita));
    else if (v && typeof v.type === 'string') recorrer(v, visita);
  }
}

function asignacion(ast, nombre) {   // window.NOMBRE = <nodo>
  let hallado = null;
  recorrer(ast, (n) => {
    if (n.type === 'AssignmentExpression' && n.left.type === 'MemberExpression' && n.left.property.name === nombre) hallado = n.right;
  });
  if (!hallado) throw new Error(`no encuentro window.${nombre}`);
  return hallado;
}

const clave = (p) => (p.key.type === 'Identifier' ? p.key.name : p.key.value);

function editar(texto, ediciones) {   // [{ini, fin, txt}] sin solaparse; se aplican de atrás hacia adelante
  return ediciones.sort((a, b) => b.ini - a.ini).reduce((t, e) => t.slice(0, e.ini) + e.txt + t.slice(e.fin), texto);
}

function aplicar(plan, raiz = RAIZ_REPO) {
  const cat = CATALOGOS[plan.catalogo];
  if (!cat) throw new Error(`catálogo desconocido: ${plan.catalogo}`);
  const manualId = cat.manual(plan.fecha);
  const pdfNombre = cat.pdf(plan.fecha);
  const archivos = {};
  const leerArchivo = (rel) => (archivos[rel] ??= { texto: fs.readFileSync(path.join(raiz, rel), 'utf8'), ed: [] });
  const ast = (rel) => parse(leerArchivo(rel).texto, { sourceType: 'script', ranges: false });

  // 1) lista de inventarios
  {
    const a = leerArchivo(cat.manuales[0]);
    const lista = asignacion(ast(cat.manuales[0]), cat.manuales[1]);
    for (const el of lista.elements) {
      const props = Object.fromEntries(el.properties.map((p) => [clave(p), p.value]));
      if (props.id && props.id.value === manualId) throw new Error(`inventario ya registrado: ${manualId}`);
      if (props.autoridad && props.autoridad.value === 'DCAM' && props.primary && props.primary.value === true)
        a.ed.push({ ini: props.primary.start, fin: props.primary.end, txt: 'false' });
    }
    const nuevo = `{ id: '${manualId}', nombre: 'Existencias de ${cat.etiqueta} DCAM · ${fechaLarga(plan.fecha)}', autoridad: 'DCAM', ` +
      `fecha: '${plan.fecha}', url: 'inventarios/${pdfNombre}', fileName: '${pdfNombre}', primary: true },`;
    a.ed.push({ ini: lista.start + 1, fin: lista.start + 1, txt: `\n  ${nuevo}` });
  }

  // 2) historial, precio de la ficha y existencias
  const h = leerArchivo(cat.hist[0]);
  const hist = asignacion(ast(cat.hist[0]), cat.hist[1]);
  const porId = new Map(hist.properties.map((p) => [Number(clave(p)), p.value]));
  const f = leerArchivo(cat.ficha[0]);
  const llamadas = new Map();
  recorrer(ast(cat.ficha[0]), (n) => {
    if (n.type === 'CallExpression' && n.callee.name === cat.ficha[1] && n.arguments[0] && n.arguments[0].type === 'NumericLiteral')
      llamadas.set(n.arguments[0].value, n);
  });
  let existencias = null;
  if (plan.catalogo === 'armas') existencias = asignacion(ast('src/data/data-precios.js'), 'AMX_ARMAS_EXISTENCIAS');
  for (const s of plan.seguros) {
    const arr = porId.get(s.id);
    const llamada = llamadas.get(s.id);
    if (!arr || arr.type !== 'ArrayExpression' || !llamada) throw new Error(`ficha ${s.id} sin historial o sin ${cat.ficha[1]}(...) en ${plan.catalogo}`);
    const reg = `{ manualId: '${manualId}', price: '${pesos(s.precio)}', date: '${plan.fecha}'${cat.conQty ? `, qty: ${Number(s.existencia)}` : ''} }`;
    h.ed.push({ ini: arr.end - 1, fin: arr.end - 1, txt: `${arr.elements.length ? ', ' : ''}${reg}` });
    const arg = llamada.arguments[cat.ficha[2]];
    f.ed.push({ ini: arg.start, fin: arg.end, txt: cat.ficha[3](s.precio) });
    if (existencias) {
      const p = existencias.properties.find((x) => Number(clave(x)) === s.id);
      if (p) h.ed.push({ ini: p.value.start, fin: p.value.end, txt: String(Number(s.existencia)) });
      else h.ed.push({ ini: existencias.end - 1, fin: existencias.end - 1, txt: `${existencias.properties.length ? ', ' : ''}${s.id}: ${Number(s.existencia)} ` });
    }
  }

  // 3) ?v= en las páginas que cargan esos archivos
  for (const pagina of ['src/pages/index.html', 'src/pages/admin.html']) {
    const p = leerArchivo(pagina);
    for (const js of cat.v) {
      const re = new RegExp(`(${js.replace('.', '\\.')}\\?v=)[^"']+`, 'g');
      p.texto = p.texto.replace(re, `$1${plan.v}`);
    }
  }

  // 4) escribir (todo o nada: si algo lanzó antes, no se escribió nada)
  fs.copyFileSync(plan.pdf, path.join(raiz, 'public', 'inventarios', pdfNombre));
  const tocados = [];
  for (const [rel, a] of Object.entries(archivos)) {
    const nuevo = editar(a.texto, a.ed);
    if (nuevo !== fs.readFileSync(path.join(raiz, rel), 'utf8')) { fs.writeFileSync(path.join(raiz, rel), nuevo); tocados.push(rel); }
  }
  return { archivos: [...tocados, `public/inventarios/${pdfNombre}`] };
}

module.exports = { leer, aplicar };

if (require.main === module) {
  const [cmd, a1, a2] = process.argv.slice(2);
  if (cmd === 'leer') process.stdout.write(JSON.stringify(leer(a1 ? path.resolve(a1) : RAIZ_REPO)));
  else if (cmd === 'aplicar' && a1) process.stdout.write(JSON.stringify(aplicar(JSON.parse(fs.readFileSync(a1, 'utf8')), a2 ? path.resolve(a2) : RAIZ_REPO)));
  else { console.error('uso: datos.js leer [raiz] | aplicar plan.json [raiz]'); process.exit(2); }
}

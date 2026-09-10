#!/usr/bin/env node
/* Resiembra un dominio de D1 desde el código fuente.
 *
 *   node .claude/skills/sincronizar-d1/scripts/resembrar.js armas   [--aplicar]
 *   node .claude/skills/sincronizar-d1/scripts/resembrar.js pages   [--aplicar]
 *
 * Sin --aplicar solo compara y enseña el diff; no toca nada.
 *
 * POR QUÉ EXISTE: los dominios de D1 PISAN a los seeds del código al hidratar
 * (store.js). Publicar un cambio en data.js o en DEFAULT_PAGES no lo ve nadie
 * que ya haya visitado el sitio hasta que D1 se resiembra. El botón «Sincronizar
 * todo al servidor» del admin sube lo que tenga el NAVEGADOR — que es justo el
 * catálogo viejo que le sirvió D1, así que puede consolidar el error en vez de
 * arreglarlo. Este script parte del código, que es la fuente de verdad.
 *
 * Dos cosas que costaron un intento cada una:
 *   - Un UPDATE con el JSON entero da SQLITE_TOOBIG (el catálogo son ~188 KB).
 *     Se trocea y se concatena con ||.
 *   - La concatenación va sobre una fila TEMPORAL y solo al final se copia sobre
 *     el dominio real, para que un fallo a medias no deje producción a medias.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../../../..');   // repo/github-deploy
const TMP = path.join(ROOT, '.d1-resembrado.sql');     // efímero, en .gitignore
const TROZO = 40000;                                    // holgado bajo el límite de D1
const API = 'https://armado.mx/api/state';

const dominio = process.argv[2];
const aplicar = process.argv.includes('--aplicar');
if (!['armas', 'pages'].includes(dominio)) {
  console.error('uso: resembrar.js <armas|pages> [--aplicar]');
  process.exit(2);
}

// ── el valor que DEBERÍA tener D1, sacado del código ────────────────────────
function desdeElCodigo(dom) {
  if (dom === 'armas') {
    global.window = global;
    require(path.join(ROOT, 'src/data/data.js'));
    return (global.DB || []).map((a) => {
      const c = Object.assign({}, a);
      // Las que no tienen foto real van con img vacía: el cliente les pone el
      // placeholder al hidratar, y así D1 no carga decenas de data-URI de ~900 B
      // que viajarían en CADA GET /api/state de CADA visitante.
      if (String(c.img || '').startsWith('data:')) c.img = '';
      return c;
    });
  }
  // pages vive en DEFAULT_PAGES, dentro del IIFE de store.js: hace falta un
  // shim mínimo de navegador. localStorage vacío => init() siembra el default.
  const almacen = {};
  const win = {
    DB: [], ACCESORIOS: [], MUNICIONES: [],
    localStorage: {
      getItem: (k) => (k in almacen ? almacen[k] : null),
      setItem: (k, v) => { almacen[k] = String(v); },
      removeItem: (k) => { delete almacen[k]; },
    },
    addEventListener() {}, dispatchEvent() {},
    location: { protocol: 'file:', origin: '' },       // desactiva el fetch a /api
    armaPlaceholder: () => '',
  };
  win.window = win;
  const ctx = vm.createContext(Object.assign(win, {
    console, JSON, Date, Math, String, Number, Object, Array, RegExp,
    setTimeout, clearTimeout, localStorage: win.localStorage,
  }));
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/data/data-precios.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/lib/store.js'), 'utf8'), ctx);
  ctx.Store.init();
  return ctx.Store.getPages();
}

// ── lo que D1 sirve hoy ─────────────────────────────────────────────────────
function desdeProduccion(dom) {
  const out = execFileSync('curl', ['-s', API], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return (JSON.parse(out || '{}'))[dom];
}

function resumen(v) {
  const t = JSON.stringify(v);
  return {
    tamano: (t.length / 1024).toFixed(1) + ' KB',
    elementos: Array.isArray(v) ? v.length : Object.keys(v || {}).length,
    'sede Monterrey': (t.match(/sede Monterrey/g) || []).length,
    'DCAM Monterrey': (t.match(/DCAM Monterrey/g) || []).length,
    OTCA: (t.match(/OTCA/g) || []).length,
  };
}

const nuevo = desdeElCodigo(dominio);
const viejo = desdeProduccion(dominio);

console.log(`\ndominio: ${dominio}\n`);
console.log('  en produccion (D1):', JSON.stringify(resumen(viejo)));
console.log('  en el codigo      :', JSON.stringify(resumen(nuevo)));

if (Array.isArray(nuevo) && Array.isArray(viejo)) {
  const ids = (a) => new Set(a.map((x) => x.id));
  const A = ids(viejo), B = ids(nuevo);
  const faltan = [...B].filter((i) => !A.has(i));
  const sobran = [...A].filter((i) => !B.has(i));
  if (faltan.length) console.log('  no se ven en produccion:', faltan.join(', '));
  // Un id en D1 que no está en el código puede ser un alta hecha desde el admin:
  // resembrar la borraría. Se avisa fuerte en vez de decidir por el usuario.
  if (sobran.length) console.log('  !! SOLO en D1 (se PERDERIAN al resembrar):', sobran.join(', '));
}

if (JSON.stringify(nuevo) === JSON.stringify(viejo)) {
  console.log('\nD1 ya esta al dia. Nada que hacer.');
  process.exit(0);
}

if (!aplicar) {
  console.log('\nDifieren. Repite con --aplicar para escribir en D1.');
  process.exit(0);
}

const json = JSON.stringify(nuevo);
const esc = (s) => s.split("'").join("''");   // en SQLite la comilla se duplica
const tmp = dominio + '_tmp';
const stmts = [
  `DELETE FROM state WHERE domain='${tmp}';`,
  `INSERT INTO state (domain, data, updated_at) VALUES ('${tmp}', '', datetime('now'));`,
];
for (let i = 0; i < json.length; i += TROZO) {
  stmts.push(`UPDATE state SET data = data || '${esc(json.slice(i, i + TROZO))}' WHERE domain='${tmp}';`);
}
stmts.push(`UPDATE state SET data = (SELECT data FROM state WHERE domain='${tmp}'), ` +
           `updated_at = datetime('now') WHERE domain='${dominio}';`);
stmts.push(`DELETE FROM state WHERE domain='${tmp}';`);

fs.writeFileSync(TMP, stmts.join('\n'));
try {
  console.log(`\nescribiendo ${stmts.length} sentencias...`);
  // OJO con la ruta: en Windows hace falta shell:true para encontrar npx, y con
  // shell:true Node junta los argumentos con espacios y los reparsea el shell.
  // La ruta del proyecto lleva un espacio ("Armado en Mexico"), asi que pasar TMP
  // absoluto partia el argumento en dos y wrangler fallaba sin decir por que:
  // execFileSync solo devolvia status 1 con stdout y stderr en null. El mismo SQL
  // ejecutado a mano entraba sin problema. Se pasa el NOMBRE y se fija cwd.
  execFileSync('npx', ['wrangler', 'd1', 'execute', 'armado-en-mexico', '--remote',
                       '--file', path.basename(TMP)],
               { stdio: 'inherit', cwd: ROOT, shell: process.platform === 'win32' });
} finally {
  fs.unlinkSync(TMP);
}

const tras = desdeProduccion(dominio);
console.log('\n  D1 tras escribir:', JSON.stringify(resumen(tras)));
console.log(JSON.stringify(tras) === json ? '\nOK: D1 coincide con el codigo.'
                                          : '\n!! D1 NO coincide con el codigo. Revisar.');

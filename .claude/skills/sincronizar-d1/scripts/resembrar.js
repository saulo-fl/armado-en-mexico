#!/usr/bin/env node
// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

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
 * Historia de la escritura (lo que costó un intento cada vez):
 *   - Un UPDATE con el JSON entero DENTRO del SQL da SQLITE_TOOBIG (~188 KB):
 *     hasta el 12-sep se troceaba y concatenaba sobre una fila temporal.
 *   - Desde el 13-sep va como parámetro de la API de consultas: ver abajo.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../../../..');   // repo/github-deploy
const CUENTA = '093b05ab8c36ac3d4c79e73b7e4b5d5b';     // cuenta de Cloudflare (no es secreto)                                  // holgado bajo el límite de D1
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

// UNA consulta parametrizada contra la API de D1 (13-sep-2026). Lo que había
// antes —SQL troceado en un fichero y `wrangler d1 execute --file`— dejó de
// servir: `--file` va por el endpoint /import, que responde «Authentication error
// [code: 10000]» al token OAuth de wrangler aunque tenga d1 (write). Pasarlo a
// `--command` tampoco: en Windows npx relanza wrangler por cmd.exe, que corta en
// 8191 caracteres y revienta (0xC0000409) con trozos llenos de comillas.
// Con el JSON como PARÁMETRO no hay SQL que escapar ni límite de sentencia
// (medido: 220 KB entran), así que sobran los trozos y la fila temporal: es un
// solo UPDATE, atómico por sí mismo.
const json = JSON.stringify(nuevo);
const npx = process.platform === 'win32'   // Node no lanza npx.cmd sin shell
  ? [process.execPath, [path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js')]]
  : ['npx', []];
const token = process.env.CLOUDFLARE_API_TOKEN || (() => {   // APOLO: token de API en el entorno; HEFESTO: sesión de wrangler
  const auth = execFileSync(npx[0], [...npx[1], 'wrangler', 'auth', 'token', '--json'],
                            { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], cwd: ROOT });
  return JSON.parse(auth.slice(auth.indexOf('{'))).token;
})();   // nunca se imprime
const base = fs.readFileSync(path.join(ROOT, 'wrangler.toml'), 'utf8').match(/database_id\s*=\s*"([^"]+)"/)[1];

(async () => {
  console.log('\nescribiendo en D1...');
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CUENTA}/d1/database/${base}/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sql: "UPDATE state SET data = ?, updated_at = datetime('now') WHERE domain = ?",
      params: [json, dominio],
    }),
  }).then((res) => res.json());
  const cambios = r.result?.[0]?.meta?.changes;
  if (!r.success || cambios !== 1) {
    console.error('!! D1 no aceptó la escritura:', JSON.stringify(r.errors), '| filas cambiadas:', cambios);
    process.exit(1);
  }

  const tras = desdeProduccion(dominio);
  console.log('\n  D1 tras escribir:', JSON.stringify(resumen(tras)));
  console.log(JSON.stringify(tras) === json ? '\nOK: D1 coincide con el codigo.'
                                            : '\n!! D1 NO coincide con el codigo. Revisar.');
})();

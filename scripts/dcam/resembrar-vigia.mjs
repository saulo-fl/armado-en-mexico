#!/usr/bin/env node
// Vigía de resembrado D1 — Armado en México (APOLO, cada 15 min por systemd --user).
//
// Problema: D1 (dominio `armas`) PISA a data.js al hidratar. Publicar un inventario
// no basta; había que resembrar a mano tras cada merge.
//
// Cómo decide, sin git y sin adivinar cuándo terminó el deploy:
//   1. Baja los data-precios.js + data.js que armado.mx SIRVE HOY. Si el deploy de
//      Pages no ha terminado, sigue sirviendo el viejo y no hay nada nuevo que hacer.
//   2. Si ese código publicado es el mismo que la última vez que resembramos
//      (estado en resembrar-vigia.json), no toca nada: cualquier diferencia con D1
//      es una edición hecha desde el admin y es de Saulo.
//   3. Si el código publicado es NUEVO, compara arma por arma contra /api/state.
//      Solo resiembra si las diferencias son de inventario: priceExact, priceLvl y
//      armas nuevas. Ids que existen solo en D1 o cualquier otro campo → NO escribe,
//      avisa por Telegram una vez y espera a Saulo.
//   4. Tras escribir, relee /api/state y exige que coincida con el código.
//
// Solo el dominio `armas`. `pages` NUNCA (D1 tiene una página `legal` que el código no).
// Misma transformación que .claude/skills/sincronizar-d1/scripts/resembrar.js.
//
// Uso:  resembrar-vigia.mjs            (lo que corre el timer)
//       resembrar-vigia.mjs --simular  (dice qué haría; no escribe ni guarda estado)
//       resembrar-vigia.mjs --base     (marca el código publicado actual como ya
//                                       resembrado, sin escribir en D1)
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const DIR = process.env.DCAM_DIR || '/home/saulo/apps/armadomx/dcam-bot';
const SITIO = 'https://armado.mx';
const CUENTA = '093b05ab8c36ac3d4c79e73b7e4b5d5b';   // no es secreto
const BASE_D1 = '0b044863-4127-44c5-a6b9-0f72607a0c08'; // wrangler.toml → database_id
const ESTADO = path.join(DIR, 'resembrar-vigia.json');
const LOG = path.join(DIR, 'resembrar-vigia.log');
const CAMPOS_INVENTARIO = new Set(['priceExact', 'priceLvl']);
const simular = process.argv.includes('--simular');
const soloBase = process.argv.includes('--base');

const ahora = () => new Date().toISOString();
const log = (m) => { const l = `${ahora()} ${m}`; console.log(l); if (!simular) fs.appendFileSync(LOG, l + '\n'); };
const leerEnv = (f) => Object.fromEntries(
  fs.readFileSync(path.join(DIR, f), 'utf8').split('\n')
    .map((l) => l.trim()).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^["']|["']$/g, '')]));
const leerEstado = () => { try { return JSON.parse(fs.readFileSync(ESTADO, 'utf8')); } catch { return {}; } };
const guardarEstado = (e) => { if (!simular) fs.writeFileSync(ESTADO, JSON.stringify(e, null, 2) + '\n'); };
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

async function bajar(ruta) {
  // Solo para probar: VIGIA_CODIGO_DIR=<dir con data-precios.js y data.js> sustituye
  // al código publicado (p. ej. el de un commit viejo). Nunca en el timer.
  const prueba = process.env.VIGIA_CODIGO_DIR;
  if (prueba && ruta.startsWith('/data')) return fs.readFileSync(path.join(prueba, ruta.slice(1)), 'utf8');
  const r = await fetch(`${SITIO}${ruta}${ruta.includes('?') ? '&' : '?'}vigia=${Date.now()}`,
    { headers: { 'cache-control': 'no-cache' }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`${ruta} → HTTP ${r.status}`);
  return r.text();
}

async function telegram(texto) {
  if (simular) { console.log('[telegram simulado]\n' + texto); return; }
  try {
    const { TG_TOKEN, TG_CHAT_ID } = leerEnv('telegram.env');
    const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT_ID, text: texto, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) log(`telegram HTTP ${r.status}`);
  } catch (e) { log(`telegram falló: ${e.message}`); }
}

// Las armas que DEBERÍA tener D1, sacadas del código publicado (igual que el navegador:
// data-precios.js antes que data.js; las sin foto van con img vacía).
export function armasDelCodigo(precios, datos) {
  const ctx = vm.createContext({ console: { log() {}, warn() {}, error() {} } });
  ctx.window = ctx;
  vm.runInContext(precios, ctx, { filename: 'data-precios.js', timeout: 10000 });
  vm.runInContext(datos, ctx, { filename: 'data.js', timeout: 10000 });
  const db = ctx.DB;
  if (!Array.isArray(db) || db.length < 50) throw new Error(`data.js no dio un catálogo válido (${db?.length})`);
  return JSON.parse(JSON.stringify(db.map((a) => {
    const c = Object.assign({}, a);
    if (String(c.img || '').startsWith('data:')) c.img = '';
    return c;
  })));
}

export function comparar(codigo, d1) {
  const enD1 = new Map(d1.map((a) => [a.id, a]));
  const ids = new Set(codigo.map((a) => a.id));
  const nuevas = codigo.filter((a) => !enD1.has(a.id)).map((a) => a.nombre || a.name || a.id);
  const soloD1 = d1.filter((a) => !ids.has(a.id)).map((a) => `${a.id} ${a.nombre || a.name || ''}`.trim());
  let precios = 0;
  const otros = {};
  for (const a of codigo) {
    const p = enD1.get(a.id);
    if (!p) continue;
    let cambioPrecio = false;
    for (const k of new Set([...Object.keys(a), ...Object.keys(p)])) {
      if (JSON.stringify(a[k]) === JSON.stringify(p[k])) continue;
      if (CAMPOS_INVENTARIO.has(k)) cambioPrecio = true;
      else (otros[k] ||= []).push(a.nombre || a.name || a.id);
    }
    if (cambioPrecio) precios++;
  }
  return { nuevas, soloD1, precios, otros };
}

// Qué hacer con un código publicado nuevo: 'nada' | 'resembrar' | 'avisar'.
export function decidir(codigo, d1) {
  if (JSON.stringify(codigo) === JSON.stringify(d1)) return { accion: 'nada' };
  const c = comparar(codigo, d1);
  if (c.soloD1.length || Object.keys(c.otros).length) return { accion: 'avisar', ...c };
  return { accion: 'resembrar', ...c };
}

async function escribirD1(token, armas) {
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CUENTA}/d1/database/${BASE_D1}/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sql: "UPDATE state SET data = ?, updated_at = datetime('now') WHERE domain = ?",
      params: [JSON.stringify(armas), 'armas'],
    }),
    signal: AbortSignal.timeout(60000),
  }).then((res) => res.json());
  const cambios = r.result?.[0]?.meta?.changes;
  if (!r.success || cambios !== 1) throw new Error(`D1 no aceptó la escritura: ${JSON.stringify(r.errors)} (filas ${cambios})`);
}

async function main() {
  const estado = leerEstado();
  const [precios, datos] = await Promise.all([bajar('/data-precios.js'), bajar('/data.js')]);
  const huella = sha(precios + '\u0000' + datos);
  const codigo = armasDelCodigo(precios, datos);

  if (soloBase) {
    guardarEstado({ ...estado, codigoResembrado: huella, fecha: ahora(), alertado: null });
    log(`base marcada: código publicado ${huella} (${codigo.length} armas), sin escribir en D1`);
    return;
  }
  if (estado.codigoResembrado === huella) return; // nada nuevo publicado: silencio

  const st = JSON.parse(await bajar('/api/state'));
  if (!Array.isArray(st.armas)) throw new Error('/api/state no trae armas (¿se perdió el binding D1?)');
  const json = JSON.stringify(codigo);
  const c = decidir(codigo, st.armas);
  if (c.accion === 'nada') {
    guardarEstado({ ...estado, codigoResembrado: huella, fecha: ahora(), alertado: null });
    log(`código nuevo ${huella}, D1 ya coincidía — nada que escribir`);
    return;
  }
  const raros = Object.keys(c.otros);
  if (c.accion === 'avisar') {
    if (estado.alertado === huella) return; // ya avisó de este mismo código
    const lineas = ['⚠️ Armado MX: hay código nuevo publicado pero NO resembré D1.', ''];
    if (c.soloD1.length) lineas.push(`Armas que existen solo en D1 (se borrarían): ${c.soloD1.slice(0, 10).join(', ')}${c.soloD1.length > 10 ? '…' : ''}`);
    for (const k of raros) lineas.push(`Cambia «${k}» en ${c.otros[k].length}: ${c.otros[k].slice(0, 5).join(', ')}${c.otros[k].length > 5 ? '…' : ''}`);
    lineas.push('', 'No son cambios de inventario (pueden ser ediciones del panel o un PR de fotos/datos). Pide a tu agente revisarlo y resembrar a mano.');
    await telegram(lineas.join('\n'));
    guardarEstado({ ...estado, alertado: huella });
    log(`NO resembrado ${huella}: soloD1=${c.soloD1.length} otrosCampos=${raros.join(',')}`);
    return;
  }

  const resumen = `${c.precios} precios${c.nuevas.length ? ` y ${c.nuevas.length} armas nuevas` : ''}`;
  if (simular) { console.log(`[simulado] resembraría D1: ${resumen}`); return; }

  const { CLOUDFLARE_API_TOKEN } = leerEnv('cloudflare.env');
  await escribirD1(CLOUDFLARE_API_TOKEN, codigo);
  const tras = JSON.parse(await bajar('/api/state')).armas;
  if (JSON.stringify(tras) !== json) throw new Error('escribí en D1 pero /api/state no coincide con el código');

  guardarEstado({ codigoResembrado: huella, fecha: ahora(), alertado: null });
  log(`resembrado ${huella}: ${resumen} (${codigo.length} armas)`);
  await telegram(`✅ Armado MX: D1 resembrado solo — ${resumen}.\n${codigo.length} armas; comprobado en armado.mx/api/state.` +
    (c.nuevas.length ? `\nNuevas: ${c.nuevas.slice(0, 8).join(', ')}${c.nuevas.length > 8 ? '…' : ''}` : ''));
}

const esPrincipal = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (esPrincipal) main().catch(async (e) => {
  log(`ERROR ${e.message}`);
  const estado = leerEstado();
  const clave = `error:${e.message}`;
  if (estado.alertado !== clave) {   // un aviso por error distinto, no cada 15 min
    await telegram(`❌ Armado MX: falló el resembrado automático de D1.\nMotivo: ${e.message}\nLos visitantes que ya entraron siguen viendo precios viejos hasta que se arregle.`);
    guardarEstado({ ...estado, alertado: clave });
  }
  process.exit(1);
});

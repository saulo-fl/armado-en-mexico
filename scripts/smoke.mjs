// Abre una página de cada familia del sitio en un Chrome de verdad y falla si
// alguna tira un error. Es la revisión que se hizo a mano el 19-sep-2026,
// cuando tres fichas llevaban horas en blanco en armado.mx: la suite pasaba,
// el build sacaba sus 449 páginas y el prerender escribía el HTML, porque
// ninguno de los tres llega a EJECUTAR los componentes. Un navegador sí.
//
//   node scripts/smoke.mjs                      → contra out/, con su servidor
//   node scripts/smoke.mjs https://armado.mx    → contra lo publicado
//
// Las URLs salen del sitemap que acaba de generar el build, una por familia
// (el primer tramo de la ruta), así que no hay lista que se quede vieja: si
// mañana nace /chalecos, entra sola.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname } from 'node:path';
import puppeteer from 'puppeteer-core';

const OUT = new URL('../out/', import.meta.url);
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.xml': 'application/xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

// Chrome ya está instalado en las dos máquinas y en el runner de Actions: esto
// no descarga ningún navegador, solo lo encuentra.
function buscarChrome() {
  const candidatos = [process.env.PUPPETEER_EXECUTABLE_PATH, process.env.CHROME_BIN, process.env.CHROME_PATH,
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium-browser', '/usr/bin/chromium',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
  const hallado = candidatos.find((p) => existsSync(p));
  if (!hallado) throw new Error('No encontré Chrome. Pon su ruta en PUPPETEER_EXECUTABLE_PATH.');
  return hallado;
}

// Sirve out/ con el mismo enrutado que Cloudflare Pages: /pistolas/glock-19
// se resuelve a out/pistolas/glock-19/index.html.
function servir() {
  const server = createServer(async (req, res) => {
    const ruta = decodeURIComponent(req.url.split('?')[0]);
    const sinBarra = ruta.endsWith('/') ? ruta.slice(0, -1) : ruta;
    const intentos = extname(ruta) ? [ruta] : [sinBarra + '/index.html', sinBarra + '.html'];
    for (const t of intentos) {
      try {
        const cuerpo = await readFile(new URL('.' + t, OUT));
        res.writeHead(200, { 'content-type': TIPOS[extname(t)] || 'application/octet-stream' });
        return res.end(cuerpo);
      } catch { /* siguiente intento */ }
    }
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('404');
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok({ server, puerto: server.address().port })));
}

// Una URL por familia: la primera de cada primer tramo, más la portada.
async function urlsDelSitemap() {
  const xml = await readFile(new URL('sitemap.xml', OUT), 'utf8');
  const rutas = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => new URL(m[1]).pathname)
    .sort();
  const porFamilia = new Map();
  for (const r of rutas) {
    const tramos = r.split('/').filter(Boolean);
    // La PROFUNDIDAD entra en la clave, y no es un detalle: /pistolas es el
    // listado y /pistolas/glock-19 es la ficha, que son dos pantallas
    // distintas. Agrupando solo por el primer tramo, el listado tapaba a la
    // ficha — y la ficha es justo donde estuvo el bug del 19-sep.
    const familia = (tramos[0] || '(portada)') + '/' + tramos.length;
    if (!porFamilia.has(familia)) porFamilia.set(familia, r);
  }
  if (![...porFamilia.values()].includes('/')) porFamilia.set('(portada)/0', '/');
  return [...porFamilia.values()].sort();
}

const base = process.argv[2];
const local = base ? null : await servir();
const raiz = base ? base.replace(/\/$/, '') : `http://127.0.0.1:${local.puerto}`;
const navegador = await puppeteer.launch({ executablePath: buscarChrome(), headless: true, args: ['--no-sandbox'] });
const fallos = [];
let revisadas = 0;

try {
  for (const ruta of await urlsDelSitemap()) {
    const pagina = await navegador.newPage();
    const suyos = [];
    // `pageerror` es la excepción sin capturar que tumba React — el fallo que
    // nos ocupa. `console.error` recoge además lo que el boundary reporta.
    pagina.on('pageerror', (e) => suyos.push(String(e.message).split('\n')[0]));
    pagina.on('console', (m) => {
      if (m.type() !== 'error') return;
      // La URL del recurso viaja aparte del texto: sin ella no se distingue el
      // /api/state que falta contra el build local de un fallo de verdad.
      const donde = (m.location() && m.location().url) || '';
      suyos.push(m.text().split('\n')[0] + (donde ? ' ← ' + donde : ''));
    });
    try {
      await pagina.goto(raiz + ruta, { waitUntil: 'networkidle2', timeout: 30000 });
      // El aviso del cortafuegos es un fallo aunque no quede nada en consola.
      if (await pagina.$('[role=alert]')) suyos.push('la pantalla cayó en el aviso de PantallaRota');
      // Una página que se queda sin texto es el síntoma clásico del árbol caído.
      const largo = await pagina.evaluate(() => document.body.innerText.trim().length);
      if (largo < 200) suyos.push(`se renderizó casi vacía (${largo} caracteres)`);
    } catch (e) {
      suyos.push('no cargó: ' + e.message.split('\n')[0]);
    }
    await pagina.close();
    revisadas++;
    // Contra el build local no hay Worker, así que /api/* falta por diseño.
    // Contra lo publicado sí cuenta: ahí ese 404 sería una caída de verdad.
    const reales = suyos.filter((s) => !(local && /\/api\//.test(s)));
    if (reales.length) fallos.push({ ruta, motivos: [...new Set(reales)] });
    process.stdout.write(reales.length ? 'x' : '.');
  }
} finally {
  await navegador.close();
  if (local) local.server.close();
}

console.log(`\nsmoke: ${revisadas} páginas en ${raiz}`);
if (fallos.length) {
  for (const f of fallos) console.error(`  ✖ ${f.ruta}\n      ${f.motivos.join('\n      ')}`);
  console.error(`\n${fallos.length} de ${revisadas} con errores.`);
  process.exit(1);
}
console.log('sin errores de consola.');

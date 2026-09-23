// Armado en México — capturas del sitio publicado a 360 px para el archivo de
// Penpot («Wire Frame», página `03 Pantallas`, boards `/real/movil/<ruta>`).
// Son la referencia de lo que YA está publicado: en Penpot no se redibuja lo
// que existe, se mira. Se suben a Penpot desde raw.githubusercontent.com, así
// que tienen que estar commiteadas en una rama (docs/PENPOT.md).
//
//   node scripts/capturas-movil.mjs            → contra https://armado.mx
//   node scripts/capturas-movil.mjs http://localhost:8788   → contra un build local
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const RAIZ = process.argv[2] || 'https://armado.mx';
const OUT = fileURLToPath(new URL('../docs/capturas/movil/', import.meta.url));
const ANCHO = 360;   // la base de estilo.css: el peor caso de envoltura
// Tope de alto: un catálogo entero mide 43 000 px y no cabe en un WebP (16 383
// px a 2×). Lo que está por debajo del tope ya enseña la plantilla.
const MAX_ALTO = 10000;

// Ruta → nombre de archivo. El nombre es el que lleva el board en Penpot.
const RUTAS = [
  ['/', 'inicio'],
  ['/arsenal', 'arsenal'],
  ['/arsenal/catalogo', 'arsenal-catalogo'],
  ['/pistolas/glock-19', 'ficha-arma'],
  ['/accesorios', 'accesorios'],
  ['/municiones', 'municiones'],
  ['/calibres', 'calibres'],
  ['/calibres/9mm-parabellum', 'ficha-calibre'],
  ['/comparar', 'comparar'],
  ['/legalidad', 'legalidad'],
  ['/legalidad/requisitos', 'legalidad-requisitos'],
  ['/legalidad/federal', 'legalidad-federal'],
  ['/legalidad/estatal', 'legalidad-estatal'],
  ['/legalidad/permisos', 'legalidad-permisos'],
  ['/legalidad/puedo-comprar', 'legalidad-puedo-comprar'],
  ['/traumaticas', 'traumaticas'],
  ['/soporte', 'soporte'],
  ['/preguntas', 'preguntas'],
  ['/acerca', 'acerca'],
  ['/mas', 'mas'],
];

// Mismo buscador que smoke.mjs: Chrome ya está instalado, solo se localiza.
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

mkdirSync(OUT, { recursive: true });
const navegador = await puppeteer.launch({ executablePath: buscarChrome(), headless: true, args: ['--no-sandbox'] });
const pagina = await navegador.newPage();
await pagina.setViewport({ width: ANCHO, height: 800, deviceScaleFactor: 1.25, isMobile: true, hasTouch: true });
// Sin tutorial de bienvenida y en tema claro: es lo que ve un visitante que
// ya entró una vez. La captura documenta la pantalla, no el onboarding.
await pagina.evaluateOnNewDocument(() => {
  localStorage.setItem('amx_onboarded_v1', '1');
  localStorage.setItem('amx-tema', 'claro');
});

let fallos = 0;
for (const [ruta, nombre] of RUTAS) {
  const destino = OUT + nombre + '.webp';
  try {
    await pagina.goto(RAIZ + ruta, { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise((r) => setTimeout(r, 1200));   // hidratación desde D1 y fuentes
    const alto = await pagina.evaluate(() => document.documentElement.scrollHeight);
    const recorte = alto > MAX_ALTO;
    await pagina.screenshot(recorte
      ? { path: destino, type: 'webp', quality: 65, captureBeyondViewport: true, clip: { x: 0, y: 0, width: ANCHO, height: MAX_ALTO } }
      : { path: destino, type: 'webp', quality: 65, fullPage: true });
    console.log(`✓ ${ruta.padEnd(28)} → ${nombre}.webp  (${ANCHO}×${alto}${recorte ? `, recortada a ${MAX_ALTO}` : ''})`);
  } catch (e) {
    fallos++;
    console.log(`✘ ${ruta.padEnd(28)} ${e.message.split('\n')[0]}`);
  }
}
await navegador.close();
console.log(fallos ? `${fallos} capturas fallaron` : `${RUTAS.length} capturas en docs/capturas/movil/`);
process.exit(fallos ? 1 : 0);

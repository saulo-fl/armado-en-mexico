// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// Imágenes del README: captura el sitio publicado y lo monta en una laptop y un
// teléfono sobre el lienzo del sitio. Dos son GIF: el recorrido por la ficha de
// la Glock 25 y la entrevista contestada de principio a fin.
//
//   node scripts/capturas-readme.mjs                         → contra https://armado.mx
//   node scripts/capturas-readme.mjs http://localhost:8788   → contra un build local
//   node scripts/capturas-readme.mjs "" ficha-arma           → solo esa imagen
//
// Los GIF necesitan ffmpeg en el PATH (lo usa page.screencast y la paleta).
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const RAIZ = process.argv[2] || 'https://armado.mx';
const SOLO = process.argv[3];
const OUT = fileURLToPath(new URL('../docs/capturas/readme/', import.meta.url));
const LOGO = fileURLToPath(new URL('../public/imagenes/logo-armado-mx.webp', import.meta.url));

const ESCRITORIO = { width: 1440, height: 900, deviceScaleFactor: 1 };
const MOVIL = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

// Mismo buscador que capturas-movil.mjs.
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

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const dataUri = (buf, tipo = 'png') => `data:image/${tipo};base64,${buf.toString('base64')}`;

mkdirSync(OUT, { recursive: true });
const navegador = await puppeteer.launch({ executablePath: buscarChrome(), headless: true, args: ['--no-sandbox'] });

// Una pestaña del sitio, sin tutorial de bienvenida y en tema claro.
async function abrir(ruta, vista) {
  const pagina = await navegador.newPage();
  await pagina.setViewport(vista);
  await pagina.evaluateOnNewDocument(() => {
    localStorage.setItem('amx_onboarded_v1', '1');
    localStorage.setItem('amx-tema', 'claro');
    localStorage.removeItem('amx_entrevista_v1');
  });
  await pagina.goto(RAIZ + ruta, { waitUntil: 'networkidle2', timeout: 45000 });
  await esperar(1500);   // hidratación desde D1 y fuentes
  return pagina;
}

// Captura de la pantalla visible; `desde` baja hasta ese elemento antes.
async function pantalla(ruta, vista, desde, margen = vista.isMobile ? 70 : 90) {
  const pagina = await abrir(ruta, vista);
  if (desde) {
    await pagina.evaluate((sel, alto) => {
      const el = document.querySelector(sel);
      if (el) window.scrollTo(0, el.getBoundingClientRect().top + scrollY - alto);
    }, desde, margen);
    await esperar(600);
  }
  const png = await pagina.screenshot({ type: 'png' });
  await pagina.close();
  return png;
}

// `pulsar`: un botón que se pulsa antes, para enseñar el elemento abierto.
async function elemento(ruta, vista, selector, pulsar) {
  const pagina = await abrir(ruta, vista);
  const el = await pagina.waitForSelector(selector, { timeout: 10000 });
  await el.scrollIntoView();
  if (pulsar) await (await pagina.waitForSelector(pulsar)).click();
  await esperar(500);
  const png = await el.screenshot({ type: 'png' });
  await pagina.close();
  return png;
}

// ── El lienzo ───────────────────────────────────────────────────────────────
// Colores de src/styles/estilo.css: el lienzo, el cartón del folder, la cinta
// Dymo, el verde de marca y la tinta de los sellos.
const FUENTES = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@75..100,400..800&family=JetBrains+Mono:wght@400;700&display=swap">';
const ESTILO = `
* { box-sizing: border-box; margin: 0; }
body { width: var(--w); height: var(--h); overflow: hidden; font-family: Archivo, sans-serif; color: #171B19;
  background: #E7EAE4 radial-gradient(circle at 1px 1px, rgba(23,27,25,.07) 1px, transparent 0) 0 0 / 6px 6px; position: relative; }
.folder { position: absolute; background: #EBDDB8; border: 1px solid #D8C69B; border-radius: 6px 14px 10px 10px;
  box-shadow: 0 30px 60px -30px rgba(40,30,10,.45); }
.folder::before { content: ''; position: absolute; left: 36px; top: -38px; width: 220px; height: 40px; background: #F6EACF;
  border: 1px solid #D8C69B; border-bottom: 0; border-radius: 10px 10px 0 0; }
.laptop { position: absolute; }
.laptop .tapa { background: #171B19; border-radius: 18px 18px 6px 6px; padding: 16px 16px 20px; box-shadow: 0 40px 70px -25px rgba(0,0,0,.55); }
.laptop .tapa img { display: block; width: 100%; border-radius: 3px; }
.laptop .base { height: 18px; margin: 0 -60px; background: linear-gradient(#D4D7D1, #A9ADA6); border-radius: 0 0 22px 22px; position: relative; }
.laptop .base::after { content: ''; position: absolute; left: 50%; top: 0; width: 140px; height: 7px; margin-left: -70px; background: #9A9E97; border-radius: 0 0 8px 8px; }
.tel { position: absolute; background: #171B19; border-radius: 46px; padding: 12px; box-shadow: 0 40px 70px -20px rgba(0,0,0,.6), inset 0 0 0 2px #3A3F3C; }
.tel img { display: block; width: 100%; border-radius: 35px; }
.dymo { display: inline-block; background: #1C1D1F; color: #F2F1EC; font: 800 20px/1 Archivo; font-stretch: 75%; letter-spacing: .28em;
  padding: 12px 18px 11px 20px; border-radius: 3px; box-shadow: 0 3px 0 rgba(0,0,0,.25); transform: rotate(-1.2deg); }
.sello { position: absolute; border: 4px solid #2F6B33; color: #2F6B33; font: 800 34px/1 'JetBrains Mono'; letter-spacing: .2em;
  padding: 10px 14px 8px 20px; border-radius: 8px; transform: rotate(-12deg); opacity: .85; }
.tarjeta { position: absolute; background: #F7F8F4; padding: 18px; border-radius: 6px; box-shadow: 0 30px 60px -25px rgba(0,0,0,.45); }
.tarjeta img { display: block; width: 100%; }
`;

async function lienzo(w, h, cuerpo, css = '') {
  const pagina = await navegador.newPage();
  await pagina.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await pagina.setContent(`<!doctype html><html><head><meta charset="utf-8">${FUENTES}<style>:root{--w:${w}px;--h:${h}px}${ESTILO}${css}</style></head><body>${cuerpo}</body></html>`,
    { waitUntil: 'networkidle0' });
  await pagina.evaluate(() => Promise.all([document.fonts.load('800 20px Archivo'), document.fonts.load('400 20px Archivo'),
    document.fonts.load('700 20px "JetBrains Mono"')]).then(() => document.fonts.ready));
  return pagina;
}

async function montar(nombre, w, h, cuerpo) {
  const pagina = await lienzo(w, h, cuerpo);
  await pagina.screenshot({ path: OUT + nombre + '.webp', type: 'webp', quality: 82 });
  await pagina.close();
  console.log(`✓ ${nombre}.webp`);
}

// Laptop con la vista de escritorio y teléfono con la móvil, sobre un folder.
function par(escritorio, movil) {
  return `<div class="folder" style="left:60px;top:90px;width:1480px;height:760px"></div>
    <div class="laptop" style="left:130px;top:70px;width:1120px"><div class="tapa"><img src="${dataUri(escritorio)}"></div><div class="base"></div></div>
    <div class="tel" style="left:1230px;top:150px;width:300px"><img src="${dataUri(movil)}"></div>`;
}

function sola(png, ancho) {
  return `<div class="folder" style="left:50px;top:70px;right:50px;bottom:40px"></div>
    <div class="tarjeta" style="left:50%;top:50%;width:${ancho}px;transform:translate(-50%,-44%)"><img src="${dataUri(png)}"></div>`;
}

// ── Las imágenes ────────────────────────────────────────────────────────────
const GLOCK = '/pistolas/glock-25';

const TRABAJOS = {
  async portada() {
    const [esc, mov] = await Promise.all([pantalla(GLOCK, ESCRITORIO), pantalla(GLOCK, MOVIL)]);
    const logo = dataUri(readFileSync(LOGO), 'webp');
    await montar('portada', 1600, 900, `
      <div class="folder" style="left:720px;top:120px;width:840px;height:720px"></div>
      <div style="position:absolute;left:80px;top:170px;width:580px">
        <img src="${logo}" style="width:120px;border-radius:22px;box-shadow:0 12px 30px -12px rgba(0,0,0,.5)">
        <h1 style="font:800 88px/.92 Archivo;font-stretch:75%;letter-spacing:-.01em;margin:34px 0 26px">ARMADO<br>EN MÉXICO</h1>
        <span class="dymo">ENCICLOPEDIA DE ARMAS LEGALES</span>
        <p style="font:400 25px/1.45 Archivo;margin-top:30px;max-width:540px">Precio oficial, existencias por armería, clasificación legal y calibre de cada arma,
          con el inventario DCAM u OTCA del que sale y su fecha.</p>
        <p style="font:700 20px/1 'JetBrains Mono';margin-top:28px;color:#173A32">armado.mx</p>
      </div>
      <div class="laptop" style="left:680px;top:190px;width:820px"><div class="tapa"><img src="${dataUri(esc)}"></div><div class="base"></div></div>
      <div class="tel" style="left:1310px;top:300px;width:250px"><img src="${dataUri(mov)}"></div>
      <div class="sello" style="left:1330px;top:120px">CIVIL</div>`);
  },

  async 'ficha-municion'() {
    const r = '/municiones/380-acp-federal-fmj-95-gr';
    await montar('ficha-municion', 1600, 900, par(await pantalla(r, ESCRITORIO), await pantalla(r, MOVIL)));
  },
  async 'ficha-accesorio'() {
    const r = '/opticas/mira-reflex-meprolight-mepro-mor';
    await montar('ficha-accesorio', 1600, 900, par(await pantalla(r, ESCRITORIO), await pantalla(r, MOVIL)));
  },
  async comparar() {
    const r = '/comparar/ruger-lcp-vs-ruger-lcp-max';
    await montar('comparar', 1600, 900, par(await pantalla(r, ESCRITORIO), await pantalla(r, MOVIL)));
  },
  async legalidad() {
    await montar('legalidad', 1600, 900, par(await pantalla('/legalidad', ESCRITORIO, '.amx-boton-tinta', 200), await pantalla('/legalidad', MOVIL, '.amx-boton-tinta', 200)));
  },
  async calibres() {
    await montar('calibres', 1600, 900, par(await pantalla('/calibres', ESCRITORIO), await pantalla('/calibres/9mm-parabellum', MOVIL)));
  },
  async arsenal() {
    await montar('arsenal', 1600, 900, par(await pantalla('/arsenal', ESCRITORIO), await pantalla('/arsenal', MOVIL)));
  },
  async soporte() {
    await montar('soporte', 1600, 900, par(await pantalla('/soporte', ESCRITORIO), await pantalla('/soporte', MOVIL)));
  },
  async acerca() {
    await montar('acerca', 1600, 900, par(await pantalla('/acerca', ESCRITORIO), await pantalla('/acerca', MOVIL)));
  },
  async reportes() {
    await montar('reportes', 1600, 620, sola(await elemento(GLOCK, MOVIL, '.amx-reportar-error'), 640));
  },
  async recomendaciones() {
    await montar('recomendaciones', 1600, 900, sola(await elemento(GLOCK, ESCRITORIO, '.amx-comentarios', '.amx-sello-voto--si'), 1000));
  },

  // El recorrido por la ficha: la captura completa de la Glock 25 y una cámara
  // que se acerca a cada apartado, lo ilumina y lo rotula. Cuadro a cuadro, sin
  // transiciones CSS: así cada cuadro es exacto y las pausas son un solo cuadro.
  async 'ficha-arma'() {
    const pagina = await abrir(GLOCK, ESCRITORIO);
    const PARADAS = [
      ['.amx-talon-papel', 'PRECIO OFICIAL CON IVA'],
      ['.amx-kardex-carton', 'EXISTENCIAS POR ARMERÍA'],
      ['.amx-fichero-carton', 'CALIBRE Y FICHA TÉCNICA'],
      ['.amx-oficio', 'CLASIFICACIÓN LEGAL'],
      ['.amx-milimetrico', 'HISTORIAL DE PRECIOS'],
    ];
    const rects = await pagina.evaluate((sels) => sels.map((s) => {
      const r = document.querySelector(s).getBoundingClientRect();
      return { x: r.x, y: r.y + scrollY, w: r.width, h: r.height };
    }), PARADAS.map((p) => p[0]));
    const completa = await pagina.screenshot({ type: 'png', fullPage: true });
    await pagina.close();

    const W = 960, H = 600;
    const general = { x: 170, y: 40, w: 1100, h: 1000 };   // la primera vista del folder
    const paradas = [[general, ''], ...rects.map((r, i) => [r, PARADAS[i][1]]), [general, '']];
    const lz = await lienzo(W, H, `<div id="cam"><img src="${dataUri(completa)}"><div id="luz"></div></div><span id="rotulo" class="dymo"></span>`, `
      #cam { position:absolute; left:0; top:0; transform-origin:0 0; }
      #cam img { display:block; }
      #luz { position:absolute; border:4px solid #A3341F; border-radius:6px; box-shadow:0 0 0 4000px rgba(23,27,25,.5); }
      #rotulo { position:absolute; left:24px; top:22px; }`);

    // Cámara que encuadra el rectángulo; con rótulo deja sitio arriba para la cinta.
    const encuadre = (r, rotulado) => {
      const pad = rotulado ? 36 : 0, arriba = rotulado ? 60 : 0;
      const s = Math.min(W / (r.w + pad * 2), (H - arriba) / (r.h + pad * 2), 1.15);
      return { s, tx: W / 2 - s * (r.x + r.w / 2), ty: (H + arriba) / 2 - s * (r.y + r.h / 2) };
    };
    const pintar = (c, luz, opacidad, texto) => {
      document.getElementById('cam').style.transform = `translate(${c.tx}px,${c.ty}px) scale(${c.s})`;
      Object.assign(document.getElementById('luz').style, { left: luz.x - 10 + 'px', top: luz.y - 10 + 'px',
        width: luz.w + 20 + 'px', height: luz.h + 20 + 'px', opacity: opacidad });
      const rot = document.getElementById('rotulo');
      rot.style.opacity = texto ? 1 : 0;
      rot.textContent = texto;
    };
    const mezcla = (a, b, t) => Object.fromEntries(Object.keys(a).map((k) => [k, a[k] + (b[k] - a[k]) * t]));
    const suave = (t) => (t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

    await grabarCuadros('ficha-arma', 720, async (cuadro) => {
      let [antes, textoAntes] = paradas[0];
      await lz.evaluate(pintar, encuadre(antes, false), antes, 0, '');
      await cuadro(1.2);
      for (const [r, texto] of paradas.slice(1)) {
        const c0 = encuadre(antes, !!textoAntes), c1 = encuadre(r, !!texto);
        const PASOS = 16;   // 1.3 s a 12 cuadros por segundo
        for (let i = 1; i <= PASOS; i++) {
          const t = suave(i / PASOS);
          const opacidad = (textoAntes ? 1 - t : 0) + (texto ? t : 0);
          await lz.evaluate(pintar, mezcla(c0, c1, t), mezcla(antes, r, t), Math.min(1, opacidad), i === PASOS ? texto : '');
          await cuadro(1 / 12);
        }
        await cuadro(texto ? 2.4 : 1.6);
        [antes, textoAntes] = [r, texto];
      }
    }, lz);
    await lz.close();
  },

  // La entrevista contestada con clics reales: se ven las preguntas avanzar y
  // los documentos caer sobre la mesa hasta el dictamen. Aquí manda el reloj del
  // sitio, así que se graba tomando capturas seguidas con su marca de tiempo.
  async entrevista() {
    const pagina = await abrir('/legalidad/puedo-comprar', { ...MOVIL, deviceScaleFactor: 1.25 });
    // Respuesta por pregunta; si no está aquí, la primera opción.
    const RESPUESTAS = { 'personal militar': 'No' };
    await grabarContinuo('entrevista', 400, pagina, async () => {
      await esperar(1500);
      for (let i = 0; i < 25; i++) {
        const opcion = await pagina.evaluateHandle((resp) => {
          const radios = [...document.querySelectorAll('[role=radio]')];
          if (!radios.length) return null;
          const pregunta = document.querySelector('[aria-live]')?.textContent || '';
          const clave = Object.keys(resp).find((k) => pregunta.includes(k));
          const elegido = clave && radios.find((r) => r.textContent.trim().startsWith(resp[clave]));
          return elegido || radios[0];
        }, RESPUESTAS);
        if (!opcion.asElement()) break;
        await esperar(900);   // que se lea la pregunta antes de contestarla
        await opcion.evaluate((el) => el.click());   // el clic de ratón no le llega en móvil emulado
        await pagina.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
        await esperar(1300);
      }
      await esperar(1500);
      // El dictamen y la lista de documentos quedan debajo de la mesa.
      await pagina.evaluate(() => {
        const d = [...document.querySelectorAll('h2,h3,p,div')].find((e) => /Documentos que te corresponden/.test(e.textContent) && e.children.length < 3);
        if (d) window.scrollTo({ top: d.getBoundingClientRect().top + scrollY - 300, behavior: 'smooth' });
      });
      await esperar(3000);
    });
    await pagina.close();
  },
};

// ── GIF ─────────────────────────────────────────────────────────────────────
// Cuadros PNG con su duración → concat de ffmpeg → GIF con paleta propia. Los
// PNG sin pérdida dejan que el GIF guarde solo lo que cambia entre cuadros.
function aGif(nombre, ancho, cuadros) {
  const dir = OUT + nombre + '-cuadros/';
  const lista = cuadros.map(([f, d]) => `file '${f.replace(/\\/g, '/')}'\nduration ${d.toFixed(3)}`).join('\n')
    + `\nfile '${cuadros.at(-1)[0].replace(/\\/g, '/')}'\n`;   // concat ignora la duración del último
  writeFileSync(dir + 'lista.txt', lista);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', dir + 'lista.txt', '-vf',
    `fps=12,scale=${ancho}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`,
    OUT + nombre + '.gif']);
  rmSync(dir, { recursive: true });
  console.log(`✓ ${nombre}.gif  (${cuadros.length} cuadros)`);
}

// `guion(cuadro)` pinta y llama a cuadro(segundos) por cada cuadro que quiere.
async function grabarCuadros(nombre, ancho, guion, pagina) {
  const dir = OUT + nombre + '-cuadros/';
  mkdirSync(dir, { recursive: true });
  const cuadros = [];
  await guion(async (segundos) => {
    const f = dir + String(cuadros.length).padStart(5, '0') + '.png';
    await pagina.screenshot({ path: f, type: 'png' });
    cuadros.push([f, segundos]);
  });
  aGif(nombre, ancho, cuadros);
}

// Captura sin parar mientras `accion` corre; la duración de cada cuadro es el
// tiempo real hasta el siguiente.
async function grabarContinuo(nombre, ancho, pagina, accion) {
  const dir = OUT + nombre + '-cuadros/';
  mkdirSync(dir, { recursive: true });
  const tomas = [];
  let activo = true;
  const bucle = (async () => {
    while (activo) {
      const f = dir + String(tomas.length).padStart(5, '0') + '.png';
      const t = Date.now();
      await pagina.screenshot({ path: f, type: 'png' });
      tomas.push([f, t]);
    }
  })();
  await accion();
  activo = false;
  await bucle;
  const cuadros = tomas.map(([f, t], i) => [f, ((tomas[i + 1]?.[1] ?? t + 2000) - t) / 1000]);
  aGif(nombre, ancho, cuadros);
}

let fallos = 0;
for (const [nombre, trabajo] of Object.entries(TRABAJOS)) {
  if (SOLO && SOLO !== nombre) continue;
  try { await trabajo(); } catch (e) { fallos++; console.error(`✗ ${nombre}: ${e.message}`); }
}
await navegador.close();
process.exit(fallos ? 1 : 0);

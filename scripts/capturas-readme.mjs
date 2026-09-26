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
// `resaltar`: ilumina ese elemento y atenúa el resto, como en los recorridos.
async function pantalla(ruta, vista, desde, margen = vista.isMobile ? 70 : 90, resaltar) {
  const pagina = await abrir(ruta, vista);
  if (resaltar) await pagina.addStyleTag({ content: `${resaltar} { position: relative; z-index: 50;
    outline: 4px solid #A3341F; outline-offset: 6px; box-shadow: 0 0 0 6px #fff, 0 0 0 4000px rgba(23,27,25,.5); }` });
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
.ventana { position: absolute; background: #FBFBF8; border-radius: 16px; overflow: hidden;
  box-shadow: 0 0 0 1px rgba(23,27,25,.10), 0 50px 90px -30px rgba(23,27,25,.45), 0 18px 36px -18px rgba(23,27,25,.25); }
.ventana .barra { height: 38px; display: flex; align-items: center; gap: 8px; padding: 0 16px; background: #F1F2EE; border-bottom: 1px solid rgba(23,27,25,.08); }
.ventana .barra i { width: 11px; height: 11px; border-radius: 50%; background: #D5D8D2; }
.ventana .barra b { margin: 0 auto; transform: translateX(-26px); font: 500 13px/1 'JetBrains Mono'; color: #5B625E;
  background: #E4E7E1; padding: 6px 18px; border-radius: 8px; }
.ventana img { display: block; width: 100%; }
.escena { position: absolute; perspective: 2200px; }
.escena > * { transform-style: preserve-3d; }
.laptop { position: absolute; }
.laptop .tapa { background: #171B19; border-radius: 18px 18px 6px 6px; padding: 16px 16px 20px; box-shadow: 0 40px 70px -25px rgba(0,0,0,.55); }
.laptop .tapa img { display: block; width: 100%; border-radius: 3px; }
.laptop .base { height: 18px; margin: 0 -60px; background: linear-gradient(#D4D7D1, #A9ADA6); border-radius: 0 0 22px 22px; position: relative; }
.laptop .base::after { content: ''; position: absolute; left: 50%; top: 0; width: 140px; height: 7px; margin-left: -70px; background: #9A9E97; border-radius: 0 0 8px 8px; }
.tel { position: absolute; background: #FBFBF8; border-radius: 40px; padding: 9px;
  box-shadow: 0 0 0 1px rgba(23,27,25,.12), 0 50px 80px -28px rgba(23,27,25,.5), 0 16px 30px -16px rgba(23,27,25,.3); }
.tel img { display: block; width: 100%; border-radius: 32px; }
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

// `transparente`: sin lienzo, solo el mockup y su sombra sobre fondo transparente.
async function montar(nombre, w, h, cuerpo, transparente = false) {
  const pagina = await lienzo(w, h, cuerpo, transparente ? 'body { background: transparent; }' : '');
  await pagina.screenshot({ path: OUT + nombre + '.webp', type: 'webp', quality: 82, omitBackground: transparente });
  await pagina.close();
  console.log(`✓ ${nombre}.webp`);
}

// Ventana de navegador con la vista de escritorio.
function ventana(png, url, estilo) {
  return `<div class="ventana" style="${estilo}"><div class="barra"><i></i><i></i><i></i><b>${url}</b></div><img src="${dataUri(png)}"></div>`;
}
function escritorio(png, url) {
  return ventana(png, url, 'left:90px;top:40px;width:1180px');
}

// Un elemento suelto como tarjeta, a su tamaño real; el lienzo se ajusta a él.
async function montarSola(nombre, png) {
  const w = png.readUInt32BE(16), h = png.readUInt32BE(20);   // cabecera IHDR del PNG
  await montar(nombre, w + 36 + 120, h + 36 + 140, `<div class="tarjeta" style="left:60px;top:50px;width:${w + 36}px"><img src="${dataUri(png)}"></div>`, true);
}

// ── El recorrido ────────────────────────────────────────────────────────────
// La captura completa de una página y una cámara que se acerca a cada apartado,
// lo ilumina y lo rotula. Cuadro a cuadro, sin transiciones CSS: así cada cuadro
// es exacto y las pausas son un solo cuadro.
//
// Cada parada es [apartado, rótulo]. El apartado puede ser:
//   '.selector'                                el primero que coincida
//   { sel, texto, todos, indice, alto }         filtra por el texto con que empieza
//                                              (regex), une todos o toma uno
//   { titulo, hasta }                          de un rótulo de columna al siguiente
async function recorrido(nombre, ruta, general, PARADAS) {
  const pagina = await abrir(ruta, ESCRITORIO);
  const rects = await pagina.evaluate((specs) => specs.map((spec) => {
    if (typeof spec === 'string') spec = { sel: spec };
    const caja = (r) => ({ x: r.left, y: r.top + scrollY, x2: r.right, y2: r.bottom + scrollY });
    let c;
    if (spec.titulo) {
      const hoja = (t) => [...document.querySelectorAll('body *')].find((e) => !e.children.length && e.textContent.trim().toUpperCase() === t);
      const col = caja(hoja(spec.titulo).parentElement.getBoundingClientRect());
      const fin = spec.hasta ? caja(hoja(spec.hasta).parentElement.getBoundingClientRect()).y - 14
        : caja(hoja(spec.titulo).parentElement.parentElement.getBoundingClientRect()).y2;
      c = { ...col, y2: fin };
    } else {
      let els = [...document.querySelectorAll(spec.sel)];
      if (spec.texto) els = els.filter((e) => new RegExp(spec.texto).test(e.innerText.trim().toUpperCase()));
      if (spec.indice != null) els = [els[spec.indice]];
      else if (!spec.todos) els = els.slice(0, 1);
      if (!els.length || !els[0]) throw new Error('sin apartado: ' + JSON.stringify(spec));
      c = els.map((e) => caja(e.getBoundingClientRect())).reduce((a, b) => ({
        x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), x2: Math.max(a.x2, b.x2), y2: Math.max(a.y2, b.y2) }));
    }
    const h = Math.min(c.y2 - c.y, spec.alto || Infinity);
    return { x: c.x, y: c.y, w: c.x2 - c.x, h };
  }), PARADAS.map((p) => p[0]));
  // Bajar la página entera antes de la captura: las fotos con carga diferida
  // salen en blanco si nunca entraron en pantalla.
  await pagina.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 150)); }
    window.scrollTo(0, 0);
  });
  await esperar(1200);
  const completa = await pagina.screenshot({ type: 'png', fullPage: true });
  await pagina.close();

  const W = 960, H = 600;
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

  await grabarCuadros(nombre, 640, async (cuadro) => {
    let [antes, textoAntes] = paradas[0];
    await lz.evaluate(pintar, encuadre(antes, false), antes, 0, '');
    await cuadro(1.2);
    for (const [r, texto] of paradas.slice(1)) {
      const c0 = encuadre(antes, !!textoAntes), c1 = encuadre(r, !!texto);
      const PASOS = 12;   // 1 s a 12 cuadros por segundo
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
}

// ── Las imágenes ────────────────────────────────────────────────────────────
const GLOCK = '/pistolas/glock-25';

const TRABAJOS = {
  async portada() {
    const [esc, mov] = await Promise.all([pantalla('/comparar/glock-25-vs-glock-28', ESCRITORIO), pantalla(GLOCK, MOVIL)]);
    const logo = dataUri(readFileSync(LOGO), 'webp');
    await montar('portada', 1600, 900, `
      <div style="position:absolute;left:80px;top:170px;width:580px">
        <img src="${logo}" style="width:120px;border-radius:22px;box-shadow:0 12px 30px -12px rgba(0,0,0,.5)">
        <h1 style="font:800 88px/.92 Archivo;font-stretch:75%;letter-spacing:-.01em;margin:34px 0 26px">ARMADO<br>EN MÉXICO</h1>
        <span class="dymo">ENCICLOPEDIA DE ARMAS LEGALES</span>
        <p style="font:400 25px/1.45 Archivo;margin-top:30px;max-width:540px">Conoce tus derechos, los trámites necesarios, precios y disponibilidad de las armas
          que ofrece la Secretaría de la Defensa a través de sus armerías DCAM y OTCA.</p>
        <p style="font:700 20px/1 'JetBrains Mono';margin-top:28px;color:#173A32">armado.mx</p>
      </div>
      <div class="escena" style="left:630px;top:0;width:940px;height:900px">
        ${ventana(esc, 'armado.mx/comparar/glock-25-vs-glock-28', 'left:40px;top:170px;width:860px;transform:rotateY(-14deg) rotateX(5deg) rotateZ(1deg)')}
        <div class="tel" style="left:690px;top:300px;width:230px;transform:rotateY(-14deg) rotateX(5deg) rotateZ(1deg)"><img src="${dataUri(mov)}"></div>
      </div>
      <div class="sello" style="left:1360px;top:95px">CIVIL</div>`);
  },

  async soporte() {
    await montar('soporte', 1360, 880, escritorio(await pantalla('/soporte', ESCRITORIO), 'armado.mx/soporte'), true);
  },
  async acerca() {
    await montar('acerca', 1360, 880, escritorio(await pantalla('/acerca', ESCRITORIO), 'armado.mx/acerca'), true);
  },
  async reportes() {
    await montar('reportes', 1360, 880, escritorio(await pantalla(GLOCK, ESCRITORIO, '.amx-reportar-error', 560, '.amx-reportar-error'), 'armado.mx/pistolas/glock-25'), true);
  },
  async recomendaciones() {
    await montarSola('recomendaciones', await elemento(GLOCK, ESCRITORIO, '.amx-comentarios', '.amx-sello-voto--si'));
  },

  'ficha-arma': () => recorrido('ficha-arma', GLOCK, { x: 170, y: 40, w: 1100, h: 1000 }, [
    ['.amx-talon-papel', 'PRECIO OFICIAL CON IVA'],
    ['.amx-kardex-carton', 'EXISTENCIAS POR ARMERÍA'],
    ['.amx-fichero-carton', 'CALIBRE Y FICHA TÉCNICA'],
    ['.amx-oficio', 'CLASIFICACIÓN LEGAL'],
    ['.amx-milimetrico', 'HISTORIAL DE PRECIOS'],
  ]),
  'ficha-municion': () => recorrido('ficha-municion', '/municiones/380-acp-federal-fmj-95-gr', { x: 150, y: 50, w: 1140, h: 1000 }, [
    [{ titulo: 'PRECIO DE REFERENCIA', hasta: 'HISTORIAL DE PRECIOS' }, 'PRECIO POR CARTUCHO Y EXISTENCIAS'],
    [{ titulo: 'HISTORIAL DE PRECIOS', hasta: 'ESTATUS LEGAL' }, 'HISTORIAL DE PRECIOS'],
    [{ titulo: 'ESTATUS LEGAL' }, 'ESTATUS LEGAL'],
    [{ titulo: 'ESPECIFICACIONES', hasta: 'COMPATIBLE CON' }, 'ESPECIFICACIONES'],
    ['.amx-carousel', 'ARMAS DE SU CALIBRE'],
  ]),
  'ficha-accesorio': () => recorrido('ficha-accesorio', '/opticas/mira-reflex-meprolight-mepro-mor', { x: 140, y: 60, w: 1160, h: 1000 }, [
    ['.amx-talon-papel', 'PRECIO OFICIAL CON IVA'],
    ['.amx-kardex-carton', 'EXISTENCIAS POR ARMERÍA'],
    ['.amx-fichero-carton', 'FICHA TÉCNICA'],
    ['.amx-oficio', 'ARMAS COMPATIBLES'],
    ['.amx-milimetrico', 'HISTORIAL DE PRECIOS'],
  ]),
  comparar: () => recorrido('comparar', '/comparar/ruger-lcp-vs-ruger-lcp-max', { x: 300, y: 60, w: 840, h: 1000 }, [
    [{ sel: '.amx-cotejo-fila', texto: '^(CAPACIDAD|PESO|LONGITUD)', todos: true }, 'LO QUE LAS DISTINGUE'],
    [{ sel: '.amx-cotejo-fila', texto: '^PRECIO', todos: true }, 'PRECIO OFICIAL'],
    [{ sel: '.amx-cotejo-fila', texto: '^EXISTENCIAS', todos: true }, 'EXISTENCIAS POR ARMERÍA'],
    [{ sel: '.amx-cotejo-sep, .amx-cotejo-fila', texto: '^(— IGUALES|CALIBRE|MECANISMO|ORIGEN)', todos: true }, 'LO QUE COMPARTEN'],
    ['.amx-cotejo-tira', 'LA DIFERENCIA EN UNA LÍNEA'],
  ]),
  legalidad: () => recorrido('legalidad', '/legalidad', { x: 270, y: 60, w: 900, h: 1000 }, [
    ['.amx-leg-cta', 'LA ENTREVISTA'],
    ['.amx-mapa', 'EL MAPA DEL TRÁMITE'],
    [{ sel: '.amx-faq-folder', indice: 0 }, 'FEDERAL'],
    [{ sel: '.amx-faq-folder', indice: 1 }, 'POR ESTADO'],
    ['.amx-leg-contraste', 'POSESIÓN NO ES PORTACIÓN'],
    [{ sel: '.amx-faq-folder', indice: 2, alto: 620 }, 'LOS SEIS TRÁMITES'],
    [{ sel: '.amx-faq-folder', indice: 3 }, 'FUNDAMENTO LEGAL EN PDF'],
  ]),
  calibres: () => recorrido('calibres', '/calibres', { x: 180, y: 70, w: 1080, h: 1000 }, [
    [{ sel: '.amx-anaquel' }, 'CARTUCHOS A ESCALA REAL'],
    [{ sel: '.amx-cal-rejilla', alto: 560 }, 'UNA FICHA POR CALIBRE'],
    ['.amx-cal-lecciones', 'FUNDAMENTOS'],
  ]),
  arsenal: () => recorrido('arsenal', '/arsenal', { x: 180, y: 70, w: 1080, h: 1000 }, [
    ['.amx-arsenal-armeria', 'POR ARMERÍA: DCAM Y OTCA'],
    ['.amx-kardex-carton', 'DISPONIBILIDAD POR SUCURSAL'],
    ['.amx-oficio', 'CLASIFICACIÓN LEGAL'],
    [{ sel: '.amx-arsenal-loteria-mesa', alto: 600 }, 'TIPO DE ARMA'],
    ['.amx-hub-usos', 'POR USO'],
    ['.amx-anaquel', 'POR CALIBRE'],
  ]),

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
    `fps=12,scale=${ancho}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=64:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`,
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

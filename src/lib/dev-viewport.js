// Armado en México — DEV VIEWPORT: alternador de vista escritorio / móvil
// ─────────────────────────────────────────────────────────────────────────
// Módulo compartido por las 3 ramas (Principal, Admin, Shopify).
// Vanilla JS — no depende de React ni Babel.
//
//   AUTO    → la página se renderiza directa (cero overhead, modo por defecto)
//   MÓVIL   → la misma página dentro de un marco de teléfono 390×844 (iframe ?embed=1)
//   ESCRIT. → la misma página dentro de un marco de navegador 1280×800
//
// El modo se persiste por página en localStorage. Dentro del iframe (?embed=1)
// el módulo no pinta nada — solo expone window.__AMX_EMBEDDED.

(function () {
  var PARAMS = new URLSearchParams(location.search);
  var EMBEDDED = PARAMS.get('embed') === '1';
  window.__AMX_EMBEDDED = EMBEDDED;
  if (EMBEDDED) return; // dentro del marco: nada de UI de debug

  // Ocultar la barra DEBUG en la WEB PÚBLICA (producción). Es una herramienta
  // de desarrollo: se mantiene en Claude Design, en local y en previews, pero
  // no debe aparecer en el sitio publicado.
  var HOST = (location.hostname || '').toLowerCase();
  var IS_PROD = HOST === 'armado.mx' || HOST === 'www.armado.mx' || /\.pages\.dev$/.test(HOST);
  if (IS_PROD) return;

  var PAGE = (location.pathname.split('/').pop() || 'index').replace(/\W+/g, '_');
  var KEY = 'amx_devvp_' + PAGE;
  var mode = 'auto';
  try { mode = localStorage.getItem(KEY) || 'auto'; } catch (e) {}
  if (mode !== 'mobile' && mode !== 'desktop') mode = 'auto';

  var AMARILLO = '#F5C518', NEGRO = '#1A1A1A', GRIS = '#2C2C2C', BORDE = '#3A3A3A';

  var stage = null, frameBox = null, frameW = 0, frameH = 0, buttons = {};

  function embedSrc() {
    var u = new URL(location.href);
    u.searchParams.set('embed', '1');
    u.hash = '';
    return u.pathname + u.search;
  }

  function resize() {
    if (!stage || !frameBox) return;
    var availW = window.innerWidth - 48;
    var availH = window.innerHeight - 92; // hueco para la barra
    var scale = Math.min(1, availW / frameW, availH / frameH);
    frameBox.style.transform = 'translate(-50%, -50%) scale(' + scale + ')';
  }

  function buildStage(m) {
    var isMobile = m === 'mobile';
    var FW = isMobile ? 390 : 1280;
    var FH = isMobile ? 844 : 800;
    var bezel = isMobile ? 13 : 0;
    var chrome = isMobile ? 0 : 36;
    frameW = FW + bezel * 2;
    frameH = FH + bezel * 2 + chrome;

    stage = document.createElement('div');
    stage.id = '__amx_devstage';
    stage.style.cssText =
      'position:fixed;inset:0;z-index:2147482000;background:' +
      'radial-gradient(ellipse at center,#222 0%,#0E0E0E 75%);overflow:hidden;';

    // cuadrícula táctica de fondo
    var grid = document.createElement('div');
    grid.setAttribute('aria-hidden', 'true');
    grid.style.cssText =
      'position:absolute;inset:0;pointer-events:none;' +
      'background-image:linear-gradient(rgba(245,197,24,0.04) 1px,transparent 1px),' +
      'linear-gradient(90deg,rgba(245,197,24,0.04) 1px,transparent 1px);' +
      'background-size:40px 40px;' +
      '-webkit-mask-image:radial-gradient(ellipse at center,black 20%,transparent 75%);' +
      'mask-image:radial-gradient(ellipse at center,black 20%,transparent 75%);';
    stage.appendChild(grid);

    frameBox = document.createElement('div');
    frameBox.style.cssText =
      'position:absolute;top:50%;left:50%;width:' + frameW + 'px;height:' + frameH + 'px;' +
      'transform:translate(-50%,-50%);transform-origin:center center;';

    var iframe = document.createElement('iframe');
    iframe.title = 'dev-preview-' + m;
    iframe.src = embedSrc();
    iframe.style.cssText = 'width:' + FW + 'px;height:' + FH + 'px;border:none;display:block;background:' + NEGRO + ';';

    if (isMobile) {
      var shell = document.createElement('div');
      shell.style.cssText =
        'width:100%;height:100%;background:#1d1d1b;border-radius:52px;padding:' + bezel + 'px;' +
        'box-shadow:0 40px 90px rgba(0,0,0,0.7),inset 0 0 0 2px #000,0 0 0 1px #3a3d36;position:relative;';
      var notch = document.createElement('div');
      notch.style.cssText =
        'position:absolute;top:' + (bezel + 6) + 'px;left:50%;transform:translateX(-50%);' +
        'width:128px;height:26px;background:#000;border-radius:16px;z-index:5;';
      iframe.style.borderRadius = '40px';
      shell.appendChild(notch);
      shell.appendChild(iframe);
      frameBox.appendChild(shell);
    } else {
      var win = document.createElement('div');
      win.style.cssText =
        'width:100%;height:100%;background:' + GRIS + ';border:1px solid ' + BORDE + ';' +
        'box-shadow:0 40px 90px rgba(0,0,0,0.7);display:flex;flex-direction:column;';
      var bar = document.createElement('div');
      bar.style.cssText =
        'height:' + chrome + 'px;display:flex;align-items:center;gap:8px;padding:0 14px;' +
        'background:' + NEGRO + ';border-bottom:1px solid ' + BORDE + ';flex-shrink:0;';
      ['#C0392B', '#F5C518', '#555555'].forEach(function (c) {
        var dot = document.createElement('span');
        dot.style.cssText = 'width:10px;height:10px;border-radius:50%;background:' + c + ';';
        bar.appendChild(dot);
      });
      var url = document.createElement('span');
      url.textContent = location.pathname.split('/').pop();
      url.style.cssText =
        'margin-left:10px;font:10px/1 "Courier Prime",monospace;color:#7A7A7A;letter-spacing:0.08em;' +
        'background:' + GRIS + ';border:1px solid ' + BORDE + ';padding:4px 10px;flex:1;max-width:420px;' +
        'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      bar.appendChild(url);
      win.appendChild(bar);
      win.appendChild(iframe);
      frameBox.appendChild(win);
    }

    stage.appendChild(frameBox);
    document.body.appendChild(stage);
    resize();
  }

  function applyMode(m) {
    mode = m;
    try { localStorage.setItem(KEY, m); } catch (e) {}
    if (stage) { stage.remove(); stage = null; frameBox = null; }
    if (m !== 'auto') buildStage(m);
    Object.keys(buttons).forEach(function (k) {
      var on = k === mode;
      buttons[k].style.background = on ? AMARILLO : 'transparent';
      buttons[k].style.color = on ? '#000' : '#B5B5B5';
      buttons[k].style.fontWeight = on ? '700' : '600';
    });
  }

  function makeBar() {
    var bar = document.createElement('div');
    bar.id = '__amx_devbar';
    bar.setAttribute('data-dev-tool', 'viewport');
    bar.style.cssText =
      'position:fixed;bottom:14px;left:14px;z-index:2147483000;display:flex;align-items:stretch;' +
      'background:rgba(26,26,26,0.96);border:1px solid ' + BORDE + ';' +
      'box-shadow:0 8px 24px rgba(0,0,0,0.5);backdrop-filter:blur(8px);';

    var tag = document.createElement('span');
    tag.textContent = '◉ DEBUG';
    tag.style.cssText =
      'display:flex;align-items:center;padding:8px 12px;font:9px/1 "Courier Prime",monospace;' +
      'letter-spacing:0.18em;color:' + AMARILLO + ';border-right:1px solid ' + BORDE + ';';
    bar.appendChild(tag);

    [['auto', 'AUTO'], ['mobile', 'MÓVIL'], ['desktop', 'ESCRIT.']].forEach(function (opt) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = opt[1];
      b.style.cssText =
        'border:none;cursor:pointer;padding:8px 14px;background:transparent;color:#B5B5B5;' +
        'font:600 10px/1 Montserrat,sans-serif;letter-spacing:0.14em;';
      b.onclick = function () { applyMode(opt[0]); };
      buttons[opt[0]] = b;
      bar.appendChild(b);
    });

    document.body.appendChild(bar);
  }

  function init() {
    makeBar();
    applyMode(mode);
    window.addEventListener('resize', resize);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

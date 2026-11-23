// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// Datos del dispositivo que el reporte web adjunta SOLO si la persona marca la casilla.
// Las claves son exactamente CLAVES_METADATA de functions/api/_issues.js (el servidor descarta
// cualquier otra; scripts/reportes-web.test.mjs vigila que coincidan). Nada de IP, ubicación,
// cookies ni localStorage: solo lo que el navegador dice de sí mismo sin pedir permisos.
//
// Se carga antes que el resto de la app para recoger los errores de JavaScript de la visita
// (los últimos 5), que es lo que más ayuda a reproducir un fallo.
(function () {
  const errores = [];
  const anotar = (texto) => {
    if (!texto) return;
    errores.push(String(texto).split('\n')[0].slice(0, 300));
    if (errores.length > 5) errores.shift();
  };
  window.addEventListener('error', (e) => anotar(e && (e.message || (e.error && e.error.message))));
  window.addEventListener('unhandledrejection', (e) => {
    const r = e && e.reason;
    anotar(r && (r.message || String(r)));
  });

  function navegadorYSistema() {
    const d = navigator.userAgentData;
    if (d && Array.isArray(d.brands) && d.brands.length) {
      const marca = d.brands.find((b) => !/not.?a.?brand|chromium/i.test(b.brand)) || d.brands[0];
      return { navegador: `${marca.brand} ${marca.version}`, sistema: d.platform || '' };
    }
    const ua = navigator.userAgent || '';
    const nav = (ua.match(/(Edg|OPR|Firefox|FxiOS|CriOS|Chrome|Version)\/(\d+)/) || []);
    const nombres = { Edg: 'Edge', OPR: 'Opera', FxiOS: 'Firefox', CriOS: 'Chrome', Version: 'Safari' };
    const sistema = (ua.match(/(Android [\d.]+|iPhone OS [\d_]+|iPad|Mac OS X [\d_]+|Windows NT [\d.]+|Linux)/) || [''])[0]
      .replace(/_/g, '.');
    return { navegador: nav[1] ? `${nombres[nav[1]] || nav[1]} ${nav[2]}` : '', sistema };
  }

  function versionDelSitio() {
    const s = document.querySelector('script[src*="app.js"]');
    const m = s && s.getAttribute('src').match(/[?&]v=([^&]+)/);
    return m ? m[1] : '';
  }

  const consulta = (q) => !!(window.matchMedia && window.matchMedia(q).matches);

  window.amxMetadataDispositivo = function () {
    const { navegador, sistema } = navegadorYSistema();
    const out = {
      navegador,
      sistema,
      ua: (navigator.userAgent || '').slice(0, 300),
      ventana: `${window.innerWidth}x${window.innerHeight}`,
      pantalla: window.screen ? `${window.screen.width}x${window.screen.height}` : '',
      dpr: Math.round((window.devicePixelRatio || 1) * 100) / 100,
      idioma: navigator.language || '',
      zonaHoraria: (Intl.DateTimeFormat().resolvedOptions().timeZone) || '',
      tactil: (navigator.maxTouchPoints || 0) > 0,
      esquemaColor: consulta('(prefers-color-scheme: dark)') ? 'oscuro' : 'claro',
      movimientoReducido: consulta('(prefers-reduced-motion: reduce)'),
      pagina: location.href.slice(0, 300),
      ruta: location.pathname.slice(0, 300),
      version: versionDelSitio(),
    };
    if (errores.length) out.errores = errores.slice();
    for (const k of Object.keys(out)) if (out[k] === '') delete out[k];
    return out;
  };
})();

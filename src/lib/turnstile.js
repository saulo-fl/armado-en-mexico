// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// Cloudflare Turnstile para el reporte web. El script de Cloudflare se pide SOLO al abrir un
// formulario, nunca en cada página. El servidor verifica el token (functions/api/_issues.js)
// con la acción 'reporte' y el host de armado.mx.
//
// Widget «armado.mx · reportes» (modo Managed, armado.mx + *.armado-en-mexico.pages.dev).
// La site key es pública; la secreta vive en Pages como TURNSTILE_SECRET.
// En localhost se usa la site key de prueba oficial (siempre pasa), que hace pareja con la
// clave secreta de prueba de `wrangler pages dev` (ver docs/BACKEND.md §Reportes).
(function () {
  const SITEKEY = '0x4AAAAAAGPXQUOTWCmKQqAV';
  const SITEKEY_PRUEBA = '1x00000000000000000000AA';
  const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  let cargando = null;

  const esLocal = () => /^(localhost|127\.0\.0\.1)$/.test(location.hostname);

  function cargar() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (cargando) return cargando;
    cargando = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SCRIPT;
      s.async = true;
      s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile_sin_api')));
      s.onerror = () => { cargando = null; s.remove(); reject(new Error('turnstile_no_carga')); };
      document.head.appendChild(s);
    });
    return cargando;
  }

  // Monta el widget en `el`. Devuelve un control { reset, quitar }.
  async function montar(el, { onToken, onCaduca }) {
    const ts = await cargar();
    const id = ts.render(el, {
      sitekey: esLocal() ? SITEKEY_PRUEBA : SITEKEY,
      action: 'reporte',
      language: 'es',
      theme: 'light',
      appearance: 'interaction-only', // invisible salvo que Cloudflare necesite un clic
      callback: (token) => onToken(token),
      'expired-callback': () => onCaduca(),
      'error-callback': () => { onCaduca(); return true; },
    });
    return {
      reset: () => { try { ts.reset(id); } catch (e) {} },
      quitar: () => { try { ts.remove(id); } catch (e) {} },
    };
  }

  window.amxTurnstile = { SITEKEY, SITEKEY_PRUEBA, cargar, montar };
})();

(function () {
  const ISSUE_URL = 'https://github.com/saulo-fl/armado-en-mexico/issues/new';
  const TIPO_ISSUE = {
    arma: 'Arma', accesorio: 'Accesorio', municion: 'Munición',
    calibre: 'Calibre', legalidad: 'Legalidad', faq: 'Preguntas frecuentes',
  };

  window.amxCorreccionUrl = function ({ tipo, titulo, ruta, origin }) {
    const base = origin || (window.location && window.location.origin) || 'https://armado.mx';
    const pagina = new URL(ruta || (window.location && window.location.pathname) || '/', base).href;
    const url = new URL(ISSUE_URL);
    url.searchParams.set('template', 'correccion.yml');
    url.searchParams.set('title', '[Corrección]: ' + String(titulo || 'Dato de la enciclopedia'));
    url.searchParams.set('pagina', pagina);
    url.searchParams.set('tipo', TIPO_ISSUE[tipo] || 'Otro');
    url.searchParams.set('nombre', String(titulo || ''));
    return url.href;
  };

  window.amxContextoDenuncia = function ({ review, tipo, entidadId, entidadNombre }) {
    return {
      reviewId: String((review && review.id) || ''),
      tipo: String(tipo || 'otro'),
      entidadId: String(entidadId == null ? '' : entidadId),
      entidadNombre: String(entidadNombre || '').slice(0, 120),
      autor: String((review && review.autor) || '').slice(0, 60),
      reviewExcerpt: String((review && review.texto) || '').trim().slice(0, 240),
    };
  };

  window.amxEnviarReporte = async function (url, item, fetchFn) {
    const send = fetchFn || (window.fetch && window.fetch.bind(window));
    if (!send) return { ok: false, status: 0, error: 'sin_backend' };
    try {
      const res = await send(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item), credentials: 'include',
      });
      let data = {};
      try { data = await res.json(); } catch (e) {}
      return res.ok
        ? { ok: true, status: res.status, data }
        : { ok: false, status: res.status, error: data.error || 'http_' + res.status };
    } catch (e) {
      return { ok: false, status: 0, error: 'red_no_disponible' };
    }
  };
})();

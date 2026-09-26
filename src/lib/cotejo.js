// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// Armado en México — el cotejo de dos armas (pantalla Comparar) y el inventario y la compatibilidad de un arma o un accesorio
// ─────────────────────────────────────────────────────────────────────────────
// JS plano colgado de `window`, como store.js y los data-*.js: sin React ni DOM,
// para que `node --test scripts/cotejo.test.mjs` lo pruebe tal cual. Se carga
// ANTES que ui.js: lo usan la ficha de arma y el comparador.
// Reglas decididas con Saulo el 14-sep-2026: docs/DESIGN.md §5.6.
(function () {
  const texto = (v) => String(v == null ? '' : v);

  // ── INVENTARIO DE UN ARMA ─────────────────────────────────────────────────
  // Precio vigente, su inventario fuente, «último precio conocido» y existencias
  // por sucursal. Vivía dentro de ProductScreen; sale aquí porque el comparador
  // enseña lo mismo, y dos copias de la regla acabarían diciendo cosas
  // distintas de la misma arma.
  //   o.priceHistory    registros del arma, del más viejo al más reciente (Store.getPriceHistory)
  //   o.manuales        inventarios, del más reciente al más viejo (Store.getManuales)
  //   o.existenciasDCAM número o null (window.getArmaExistencias)
  //   o.autoridad       window.manualAutoridad
  // Existencias: SOLO cuenta el último inventario de cada sucursal; si el arma
  // estuvo alguna vez en esa sucursal y no aparece en él, está AGOTADA ahí.
  function amxInventarioArma(arma, o) {
    const priceHistory = (o && o.priceHistory) || [];
    const manuales = (o && o.manuales) || [];
    const autoridad = (o && o.autoridad) || (() => null);
    const manualById = (id) => (id ? manuales.find((m) => m.id === id) : null) || null;
    const ultimo = priceHistory.length ? priceHistory[priceHistory.length - 1] : null;
    const manual = manualById(arma.priceManualId) ||
      (ultimo ? manualById(ultimo.manualId) : null) ||
      manuales.find((m) => m.primary) || manuales[0] || null;
    const aut = autoridad(manual);
    const sigla = aut ? aut.sigla : 'DCAM';
    const precio = ultimo ? ultimo.price : arma.priceExact;

    const autOf = (m) => (m && (m.autoridad || (autoridad(m) ? autoridad(m).sigla : 'DCAM'))) || 'DCAM';
    const ultimoDe = (s) => manuales.find((m) => autOf(m) === s) || null;
    const estuvoEn = (s) => priceHistory.some((h) => autOf(manualById(h.manualId)) === s);

    const sucursales = [];
    const dcam = ultimoDe('DCAM');
    const qtyDcam = o && o.existenciasDCAM != null ? o.existenciasDCAM : null;
    if (qtyDcam != null) sucursales.push({ sigla: 'DCAM', qty: qtyDcam, manual: dcam, agotado: false });
    else if (estuvoEn('DCAM') && dcam) sucursales.push({ sigla: 'DCAM', qty: null, manual: dcam, agotado: true });
    const otca = ultimoDe('OTCA');
    if (otca) {
      const rec = priceHistory.find((h) => h.manualId === otca.id);
      if (rec && rec.qty != null) sucursales.push({ sigla: 'OTCA', qty: rec.qty, manual: otca, agotado: false });
      else if (estuvoEn('OTCA')) sucursales.push({ sigla: 'OTCA', qty: null, manual: otca, agotado: true });
    }

    // ¿Hay un inventario de la MISMA sucursal más reciente que el del precio? Si
    // lo hay, el arma ya no aparece en él y el precio es el último conocido.
    // Fechas AAAA-MM-DD, comparables como texto.
    const ultimoSuc = ultimoDe(sigla);
    const ultimoConocido = !!(manual && ultimoSuc && String(ultimoSuc.fecha || '') > String(manual.fecha || ''));
    return { precio, manual, sigla, ultimoConocido, sucursales };
  }

  // La misma consulta con los datos vivos de la app (Store, hidratado desde D1).
  function amxInventarioDe(arma) {
    const S = window.Store;
    return amxInventarioArma(arma, {
      priceHistory: S ? S.getPriceHistory(arma.id) : [],
      manuales: S ? S.getManuales() : [],
      existenciasDCAM: window.getArmaExistencias ? window.getArmaExistencias(arma.id) : null,
      autoridad: window.manualAutoridad,
    });
  }

  // ── INVENTARIO DE UN ACCESORIO ────────────────────────────────────────────
  // La misma regla que el arma (DESIGN.md §5.5): nunca sale «último precio
  // conocido» sin el AGOTADO de su sucursal. Los accesorios no tienen un dato
  // aparte de existencias DCAM: sale del registro del ÚLTIMO inventario DCAM,
  // si el accesorio aparece en él.
  //   o.priceHistory  registros del accesorio, del más viejo al más reciente (getAccesorioPriceHistory)
  //   o.manuales      inventarios de accesorios, en cualquier orden (ACCESORIOS_MANUALES)
  //   o.autoridad     window.manualAutoridad
  function amxInventarioAccesorio(acc, o) {
    const priceHistory = (o && o.priceHistory) || [];
    const autoridad = (o && o.autoridad) || (() => null);
    const manuales = ((o && o.manuales) || []).slice()
      .sort((a, b) => texto(b.fecha).localeCompare(texto(a.fecha)));
    const siglaDe = (m) => m.autoridad || (autoridad(m) ? autoridad(m).sigla : 'DCAM');
    const dcam = manuales.find((m) => siglaDe(m) === 'DCAM');
    const rec = dcam ? priceHistory.find((x) => x.manualId === dcam.id) : null;
    return amxInventarioArma(acc, {
      priceHistory, manuales, autoridad,
      existenciasDCAM: rec && rec.qty != null ? rec.qty : null,
    });
  }

  // ── COMPATIBILIDAD DE UN ACCESORIO — la hoja «Compatibilidad» ─────────────
  // `armas` es window.getArmasCompatibles(acc), ya resuelto por la regla de
  // data-accesorios.js. Cuatro casos (spec del 15-sep-2026, §3.2):
  //   fichas      lista explícita (`compat.armas`) con fichas → sus armas
  //   regla       universal (sin `compat.armas`) con fichas → «cualquier arma con riel Picatinny»
  //   plataforma  sin fichas, con la plataforma que nombra el PDF → «Mossberg 500»
  //   nada        ni fichas ni plataforma → la ficha no pinta la pestaña
  function amxCompatAccesorio(acc, armas) {
    const lista = armas || [];
    const nombres = ((acc && acc.compatibilidad) || []).map((n) => texto(n).trim()).filter(Boolean);
    const explicita = !!(acc && acc.compat && acc.compat.armas);
    if (lista.length && !explicita && nombres.length) {
      const regla = nombres.join(', ');
      return { caso: 'regla', armas: lista, texto: 'cualquier arma con ' + regla.charAt(0).toLowerCase() + regla.slice(1) };
    }
    if (lista.length) return { caso: 'fichas', armas: lista, texto: '' };
    if (nombres.length) return { caso: 'plataforma', armas: [], texto: nombres.join(', ') };
    return { caso: 'nada', armas: [], texto: '' };
  }

  // ── NÚMEROS COMPARABLES ───────────────────────────────────────────────────
  // Solo un valor único y exacto compite por la ventaja. Formatos medidos sobre
  // las 231 armas del 14-sep-2026: capacidad `N` o `N+N`; peso `Ng` o `N kg`;
  // longitud `Nmm` o `N mm`; precio `$N MXN`. Lo demás —`5 / 30`, `3.5–3.7 kg`,
  // `≈4.0 kg`, `cañón 18"`, `varía`, vacío, precio 0— da null: se muestra tal
  // cual, sin círculo y fuera de la tira.
  const amxCotejoNum = {
    capacidad(v) {
      const m = /^\s*(\d+)(?:\s*\+\s*(\d+))?\s*$/.exec(texto(v));
      return m ? Number(m[1]) + Number(m[2] || 0) : null;
    },
    peso(v) { // en gramos
      const m = /^\s*(\d+(?:\.\d+)?)\s*(kg|g)\s*$/i.exec(texto(v));
      if (!m) return null;
      const n = Number(m[1]) * (m[2].toLowerCase() === 'kg' ? 1000 : 1);
      return n > 0 ? n : null;
    },
    longitud(v) { // en milímetros
      const m = /^\s*(\d+(?:\.\d+)?)\s*mm\s*$/i.exec(texto(v));
      return m && Number(m[1]) > 0 ? Number(m[1]) : null;
    },
    precio(v) {
      const m = /^\s*\$\s*(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?\s*(?:MXN)?\s*$/i.exec(texto(v));
      if (!m) return null;
      const n = Number(m[1].replace(/,/g, '') + (m[2] || ''));
      return n > 0 ? n : null;
    },
  };

  // ── EL COTEJO ─────────────────────────────────────────────────────────────
  // Los datos en el orden de la ficha técnica. `gana`: qué valor se circula;
  // sin `gana`, el dato nunca tiene ventaja (regla fija, decisión de Saulo).
  const DATOS = [
    { clave: 'calibre', etiqueta: 'Calibre', corta: 'Cal.', tipo: 'texto', de: (x) => x.calibre },
    { clave: 'capacidad', etiqueta: 'Capacidad', corta: 'Cap.', tipo: 'num', de: (x) => x.capacidad, num: amxCotejoNum.capacidad, gana: 'mayor' },
    { clave: 'peso', etiqueta: 'Peso', corta: 'Peso', tipo: 'num', de: (x) => x.peso, num: amxCotejoNum.peso, gana: 'menor' },
    { clave: 'longitud', etiqueta: 'Longitud', corta: 'Long.', tipo: 'num', de: (x) => x.longitud, num: amxCotejoNum.longitud, gana: 'menor' },
    { clave: 'precio', etiqueta: 'Precio', corta: 'Precio', tipo: 'precio', num: amxCotejoNum.precio, gana: 'menor' },
    { clave: 'existencias', etiqueta: 'Existencias', corta: 'Existencias', tipo: 'existencias' },
    { clave: 'mecanismo', etiqueta: 'Mecanismo', corta: 'Mec.', tipo: 'texto', de: (x) => x.mecanismo },
    { clave: 'origen', etiqueta: 'Origen', corta: 'Origen', tipo: 'texto', de: (x) => x.pais },
    { clave: 'anio', etiqueta: 'Año', corta: 'Año', tipo: 'texto', de: (x) => x.anio },
  ];
  const SUCURSALES = ['DCAM', 'OTCA'];
  const mostrar = (v) => (texto(v).trim() === '' ? '—' : texto(v).trim());

  function ladoDe(d, arma, inv) {
    if (d.tipo === 'existencias') return { sucursales: inv.sucursales };
    if (d.tipo === 'precio') {
      return {
        texto: mostrar(texto(inv.precio).replace(/\s*MXN\s*$/i, '')),
        num: d.num(inv.precio),
        sigla: inv.sigla,
        fecha: inv.manual ? texto(inv.manual.fecha) : '',
        ultimoConocido: inv.ultimoConocido,
      };
    }
    const v = d.de(arma);
    return { texto: mostrar(v), num: d.num ? d.num(v) : null };
  }

  // Una fila por dato. Con `b` null (una sola arma) todas van arriba, sin
  // igualdad ni ventaja. Existencias va SIEMPRE arriba: es estado del
  // inventario, no atributo del arma.
  function amxCotejar(a, b, invA, invB) {
    const arriba = [];
    const iguales = [];
    DATOS.forEach((d) => {
      const fila = {
        clave: d.clave, etiqueta: d.etiqueta, corta: d.corta, tipo: d.tipo,
        a: ladoDe(d, a, invA), b: b ? ladoDe(d, b, invB) : null,
        igual: false, gana: null, comparable: false,
      };
      if (d.tipo === 'existencias') {
        const hay = (s) => [fila.a, fila.b].some((x) => x && x.sucursales.some((y) => y.sigla === s));
        fila.siglas = SUCURSALES.filter(hay);
        arriba.push(fila);
        return;
      }
      if (!b) { arriba.push(fila); return; }
      fila.comparable = fila.a.num != null && fila.b.num != null;
      fila.igual = fila.comparable ? fila.a.num === fila.b.num : fila.a.texto === fila.b.texto;
      if (d.gana && fila.comparable && !fila.igual) {
        const aMayor = fila.a.num > fila.b.num;
        fila.gana = (d.gana === 'mayor') === aMayor ? 'a' : 'b';
      }
      (fila.igual ? iguales : arriba).push(fila);
    });
    return { arriba, iguales };
  }

  // ── LA TIRA DE DIFERENCIAS ────────────────────────────────────────────────
  // La SEGUNDA arma frente a la primera (el orden de la URL). Solo los datos
  // numéricos comparables que difieren. Formato fijo, sin toLocaleString: la
  // salida no depende del ICU del navegador ni del de Node.
  const MENOS = '−';
  const miles = (s) => {
    const partes = s.split('.');
    return partes[0].replace(/\B(?=(\d{3})+$)/g, ',') + (partes[1] ? '.' + partes[1] : '');
  };
  const CIFRA = {
    capacidad: (n) => n + (n === 1 ? ' cartucho' : ' cartuchos'),
    peso: (g) => (g < 1000 ? Math.round(g) + ' g' : Number((g / 1000).toFixed(2)) + ' kg'),
    longitud: (mm) => Number(mm.toFixed(1)) + ' mm',
    precio: (n) => '$' + miles(n.toFixed(2)),
  };
  // Con la misma marca, sin la marca: «LCP Max frente a LCP».
  function nombreCorto(x, otra) {
    const marca = texto(x.marca);
    if (!marca || marca !== otra.marca || texto(x.nombre).indexOf(marca + ' ') !== 0) return x.nombre;
    return x.nombre.slice(marca.length + 1);
  }
  function amxTiraCotejo(a, b, cotejo) {
    const partes = [];
    let avisoFechas = false;
    cotejo.arriba.forEach((f) => {
      if (!CIFRA[f.clave] || !f.comparable || f.igual) return;
      const d = f.b.num - f.a.num;
      partes.push((d > 0 ? '+' : MENOS) + CIFRA[f.clave](Math.abs(d)));
      if (f.clave === 'precio' && f.a.fecha && f.b.fecha && f.a.fecha !== f.b.fecha) avisoFechas = true;
    });
    return { nombreA: nombreCorto(a, b), nombreB: nombreCorto(b, a), partes, avisoFechas };
  }

  // ── LA BÚSQUEDA ───────────────────────────────────────────────────────────
  // Por nombre, marca y calibre, sin mayúsculas ni acentos, con TODAS las
  // palabras escritas. Vacía = el catálogo entero en orden alfabético.
  const normal = (s) => texto(s).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  function amxBuscarArmas(armas, consulta, excluir) {
    const fuera = new Set(excluir || []);
    const palabras = normal(consulta).split(/\s+/).filter(Boolean);
    return (armas || [])
      .filter((x) => !fuera.has(x.id))
      .filter((x) => {
        const h = normal([x.nombre, x.marca, x.calibre].join(' '));
        return palabras.every((p) => h.indexOf(p) >= 0);
      })
      .sort((x, y) => texto(x.nombre).localeCompare(texto(y.nombre), 'es'));
  }

  // ── EL ENLACE ─────────────────────────────────────────────────────────────
  // /comparar/<slug-a>-vs-<slug-b>. Los slugs son los del NOMBRE, sin la rama de
  // tipo, y los arma amxSlugIndex() en app.jsx (`nPorSlug` / `slugNPorA`). Un
  // slug podría contener «-vs-», así que se prueban todos los cortes; lo que no
  // existe se ignora.
  const tiene = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  function amxParComparar(segmento, porSlug) {
    const s = texto(segmento);
    if (!s) return [];
    if (tiene(porSlug, s)) return [porSlug[s]];
    let parcial = null;
    for (let i = s.indexOf('-vs-'); i >= 0; i = s.indexOf('-vs-', i + 1)) {
      const izq = s.slice(0, i);
      const der = s.slice(i + 4);
      if (tiene(porSlug, izq) && tiene(porSlug, der) && porSlug[izq] !== porSlug[der]) return [porSlug[izq], porSlug[der]];
      if (!parcial && tiene(porSlug, izq)) parcial = [porSlug[izq]];
      if (!parcial && tiene(porSlug, der)) parcial = [porSlug[der]];
    }
    return parcial || [];
  }
  function amxRutaComparar(ids, slugPorId) {
    const slugs = (ids || []).map((id) => slugPorId[id]).filter(Boolean);
    return 'comparar' + (slugs.length ? '/' + slugs.join('-vs-') : '');
  }

  window.amxInventarioArma = amxInventarioArma;
  window.amxInventarioDe = amxInventarioDe;
  window.amxInventarioAccesorio = amxInventarioAccesorio;
  window.amxCompatAccesorio = amxCompatAccesorio;
  window.amxCotejoNum = amxCotejoNum;
  window.amxCotejar = amxCotejar;
  window.amxTiraCotejo = amxTiraCotejo;
  window.amxBuscarArmas = amxBuscarArmas;
  window.amxParComparar = amxParComparar;
  window.amxRutaComparar = amxRutaComparar;
})();

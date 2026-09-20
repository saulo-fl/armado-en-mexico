// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// Armado en México — App principal (router + estado + responsive)

const { useState: useStateApp, useEffect: useEffectApp, useRef: useRefApp } = React;

// ─── RUTEO POR URL ───────────────────────────────────────────────────────
// Direcciones legibles y jerárquicas, pensadas para SEO/GEO:
//   /arsenal                           inicio de la sección (el hub)
//   /arsenal/catalogo                  el catálogo completo
//   /arsenal/catalogo/dcam             catálogo filtrado por armería DCAM
//   /arsenal/catalogo/otca             catálogo filtrado por armería OTCA
//   /pistolas                          listado del tipo
//   /pistolas/glock-19                 ficha del arma
//   /cargadores                        listado de la categoría
//   /cargadores/cargador-22-lr-mossberg
//   /municiones                        listado (las municiones no llevan sub-rama)
//   /municiones/12-ga-rio-perdigon-7-5-28-gr
// Los slugs se derivan de los datos (no se guardan): ver amxSlugIndex().
const APP_BASE = (window.APP_BASE || '/').replace(/[^/]*$/, (m) => (m.indexOf('.') >= 0 ? '' : m)) || '/';
const SCREEN_TO_PATH = {
  home: '', catalog: 'arsenal', accesorios: 'accesorios',
  calibres: 'calibres', campos: 'campos', experiencias: 'experiencias',
  compare: 'comparar', legal: 'legalidad', about: 'acerca',
  faq: 'preguntas', menu: 'mas', traumaticas: 'traumaticas',
  soporte: 'soporte',
  municiones: 'municiones',
};
const PATH_TO_SCREEN = Object.keys(SCREEN_TO_PATH).reduce((m, s) => {
  if (SCREEN_TO_PATH[s]) m[SCREEN_TO_PATH[s]] = s;
  return m;
}, {});

// tipo de arma (dato) ↔ segmento de URL (plural, sin acentos)
const TIPO_TO_PATH = {
  pistola: 'pistolas', revolver: 'revolveres', rifle: 'rifles',
  escopeta: 'escopetas', carabina: 'carabinas',
};
const PATH_TO_TIPO = Object.keys(TIPO_TO_PATH).reduce((m, t) => { m[TIPO_TO_PATH[t]] = t; return m; }, {});

function amxSlug(s) {
  return String(s == null ? '' : s)
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')   // quita acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
window.amxSlug = amxSlug;

// Índice slug ↔ id. Se reconstruye si cambia el tamaño de algún catálogo
// (p. ej. tras hidratar desde el backend), no en cada navegación.
let _slugIdx = null, _slugKey = '';
function amxSlugIndex() {
  const DB = window.DB || [], AC = window.ACCESORIOS || [], MU = window.MUNICIONES || [];
  const key = DB.length + ':' + AC.length + ':' + MU.length;
  if (_slugIdx && _slugKey === key) return _slugIdx;

  const idx = { aPorSlug: {}, slugPorA: {}, cPorSlug: {}, slugPorC: {}, mPorSlug: {}, slugPorM: {}, nPorSlug: {}, slugNPorA: {} };
  // Desempate determinista: recorremos por id, y al repetirse un slug se le
  // añade -2, -3… Así la URL de una ficha no cambia al añadir otras.
  const unico = (mapa, base) => {
    const b = base || 'sin-nombre';
    let s = b, n = 2;
    while (Object.prototype.hasOwnProperty.call(mapa, s)) { s = b + '-' + n; n++; }
    return s;
  };
  const porId = (arr) => arr.slice().sort((x, y) => (x.id || 0) - (y.id || 0));

  porId(DB).forEach((a) => {
    const rama = TIPO_TO_PATH[a.tipo] || 'otras';
    const s = unico(idx.aPorSlug, rama + '/' + amxSlug(a.nombre));
    idx.aPorSlug[s] = a.id; idx.slugPorA[a.id] = s;
  });
  // Comparador: el slug del NOMBRE, sin la rama de tipo
  // (/comparar/ruger-lcp-vs-ruger-lcp-max). Mismo desempate por id que las fichas.
  porId(DB).forEach((a) => {
    const s = unico(idx.nPorSlug, amxSlug(a.nombre));
    idx.nPorSlug[s] = a.id; idx.slugNPorA[a.id] = s;
  });
  porId(AC).forEach((c) => {
    const s = unico(idx.cPorSlug, amxSlug(c.categoria || 'accesorios') + '/' + amxSlug(c.nombre));
    idx.cPorSlug[s] = c.id; idx.slugPorC[c.id] = s;
  });
  // Municiones: sin sub-rama. Calibre y marca no bastan (hay varios cartuchos
  // del mismo calibre y marca), así que el slug suma bala y grano.
  porId(MU).forEach((m) => {
    const base = amxSlug([m.calibre, m.marca, m.bala, m.grano].filter(Boolean).join(' '));
    const s = unico(idx.mPorSlug, base);
    idx.mPorSlug[s] = m.id; idx.slugPorM[m.id] = s;
  });

  _slugIdx = idx; _slugKey = key;
  return idx;
}
window.amxSlugIndex = amxSlugIndex;

function amxBuildPath(screen, productId, accesorioId, municionId, calibreId, catalogFilter, compareIds) {
  const idx = amxSlugIndex();
  if (screen === 'compare') return window.amxRutaComparar(compareIds, idx.slugNPorA);
  if (screen === 'product') return idx.slugPorA[productId] || 'arsenal';
  if (screen === 'accesorio') return idx.slugPorC[accesorioId] || 'accesorios';
  if (screen === 'municion') return 'municiones/' + (idx.slugPorM[municionId] || '');
  if (screen === 'calibre') return 'calibres/' + amxSlug(calibreId || '');
  // Listados por rama: /pistolas, /cargadores…
  if (screen === 'catalog' && catalogFilter && catalogFilter.mode === 'tipo' && TIPO_TO_PATH[catalogFilter.value]) {
    return TIPO_TO_PATH[catalogFilter.value];
  }
  // El arsenal se separa en base y catálogo: /arsenal es el hub (sin filtro)
  // y el listado vive en /arsenal/catalogo. Cada armería tiene su filtro
  // rápido: /arsenal/catalogo/dcam y /arsenal/catalogo/otca. Los demás
  // filtros rápidos del hub (p. ej. «disponibles») caen al catálogo general.
  if (screen === 'catalog') {
    if (!catalogFilter) return 'arsenal';
    if (catalogFilter.mode === 'sucursal' && (catalogFilter.value === 'DCAM' || catalogFilter.value === 'OTCA')) {
      return 'arsenal/catalogo/' + catalogFilter.value.toLowerCase();
    }
    return 'arsenal/catalogo';
  }
  if (screen === 'accesorios' && catalogFilter && catalogFilter.categoria && catalogFilter.categoria !== 'all') {
    return amxSlug(catalogFilter.categoria);
  }
  return SCREEN_TO_PATH[screen] || '';
}
function amxBuildUrl(screen, productId, accesorioId, municionId, calibreId, catalogFilter, compareIds) {
  return APP_BASE + amxBuildPath(screen, productId, accesorioId, municionId, calibreId, catalogFilter, compareIds);
}

const VACIO = { screen: 'home', productId: null, accesorioId: null, municionId: null, calibreId: null, catalogFilter: null, compareIds: [] };
function amxParsePath(pathname) {
  let rel = pathname || '';
  if (APP_BASE !== '/' && rel.indexOf(APP_BASE) === 0) rel = rel.slice(APP_BASE.length);
  else if (APP_BASE === '/' && rel[0] === '/') rel = rel.slice(1);
  rel = rel.replace(/index\.html$/, '').replace(/^\/+|\/+$/g, '');
  if (!rel) return Object.assign({}, VACIO);

  const seg = rel.split('/').map((s) => decodeURIComponent(s).toLowerCase());
  const idx = amxSlugIndex();

  // /cursos es el nombre viejo de /experiencias. Se mantiene como alias para no
  // dejar huerfana una URL ya indexada; el canonico es /experiencias.
  if (seg.length === 1 && seg[0] === 'cursos') {
    return Object.assign({}, VACIO, { screen: 'experiencias' });
  }
  // Comparador con armas: /comparar/<slug>[-vs-<slug>]
  if (seg[0] === SCREEN_TO_PATH.compare && seg[1]) {
    return Object.assign({}, VACIO, { screen: 'compare', compareIds: window.amxParComparar(seg[1], idx.nPorSlug) });
  }
  // El catálogo del arsenal y sus filtros rápidos por armería. /arsenal solo
  // (un segmento) es el hub y lo resuelve PATH_TO_SCREEN; aquí son las ramas:
  //   /arsenal/catalogo            listado completo
  //   /arsenal/catalogo/dcam|otca  listado con la armería ya filtrada
  // Una sigla desconocida vuelve al listado completo, no a la portada.
  if (seg[0] === 'arsenal' && seg[1] === 'catalogo') {
    const SIGLA = { dcam: 'DCAM', otca: 'OTCA' }[seg[2]];
    return Object.assign({}, VACIO, { screen: 'catalog', catalogFilter: SIGLA
      ? { mode: 'sucursal', value: SIGLA }
      : { mode: 'all' } });
  }
  // Pantallas con nombre propio (/arsenal, /calibres…) y el listado de municiones
  if (seg.length === 1 && PATH_TO_SCREEN[seg[0]]) {
    return Object.assign({}, VACIO, { screen: PATH_TO_SCREEN[seg[0]] });
  }
  // Ficha de un calibre: /calibres/<slug>. El id lleva puntos y espacios
  // («.30-06 Sprg»), así que la dirección guarda su slug y aquí se busca de
  // vuelta. Un slug que no existe cae en la guía, no en la portada.
  if (seg[0] === SCREEN_TO_PATH.calibres && seg[1]) {
    const cal = (window.CALIBRES || []).find((c) => amxSlug(c.id) === seg[1]);
    return cal
      ? Object.assign({}, VACIO, { screen: 'calibre', calibreId: cal.id })
      : Object.assign({}, VACIO, { screen: 'calibres' });
  }
  // Ficha de munición: /municiones/<slug>
  if (seg[0] === SCREEN_TO_PATH.municiones && seg[1]) {
    const id = idx.mPorSlug[seg[1]];
    return id != null
      ? Object.assign({}, VACIO, { screen: 'municion', municionId: id })
      : Object.assign({}, VACIO, { screen: 'municiones' });
  }
  // Listado por tipo de arma: /pistolas
  if (seg.length === 1 && PATH_TO_TIPO[seg[0]]) {
    return Object.assign({}, VACIO, { screen: 'catalog', catalogFilter: { mode: 'tipo', value: PATH_TO_TIPO[seg[0]] } });
  }
  // Ficha de arma: /pistolas/<slug>
  if (seg.length >= 2 && PATH_TO_TIPO[seg[0]]) {
    const id = idx.aPorSlug[seg[0] + '/' + seg[1]];
    return id != null
      ? Object.assign({}, VACIO, { screen: 'product', productId: id })
      : Object.assign({}, VACIO, { screen: 'catalog', catalogFilter: { mode: 'tipo', value: PATH_TO_TIPO[seg[0]] } });
  }
  // Accesorios: /cargadores y /cargadores/<slug>
  const catAcc = (window.ACCESORIOS || []).some((c) => amxSlug(c.categoria) === seg[0]);
  if (catAcc) {
    if (seg[1]) {
      const id = idx.cPorSlug[seg[0] + '/' + seg[1]];
      if (id != null) return Object.assign({}, VACIO, { screen: 'accesorio', accesorioId: id });
    }
    return Object.assign({}, VACIO, { screen: 'accesorios', catalogFilter: { categoria: seg[0] } });
  }
  return Object.assign({}, VACIO);
}

function App() {
  const vp = window.useViewport();

  // Aquí vivía el panel de Tweaks del prototipo de Claude Design (facción,
  // intensidad HUD, tipografía). Se retiró el 12-sep-2026: solo se abría desde
  // un marco padre y sus tres controles ya no hacían nada. NO se vuelve a
  // escribir PALETTE en runtime: su «facción» pisaba PALETTE.amber con un beige
  // que sobre el lienzo crema medía 1.27:1. La paleta la define ui.jsx.

  // Navegación — estado inicial leído de la URL (deep-links)
  const _init = amxParsePath(window.location.pathname);
  const [screen, setScreen] = useStateApp(_init.screen);
  const [productId, setProductId] = useStateApp(_init.productId);
  const [accesorioId, setAccesorioId] = useStateApp(_init.accesorioId);
  const [municionId, setMunicionId] = useStateApp(_init.municionId);
  const [calibreId, setCalibreId] = useStateApp(_init.calibreId);
  const [catalogFilter, setCatalogFilter] = useStateApp(_init.catalogFilter);
  const [compareIds, setCompareIds] = useStateApp(_init.compareIds);
  // El lado del comparador que se está eligiendo en la búsqueda ('a', 'b' o null).
  const [buscarLado, setBuscarLado] = useStateApp(null);
  const [history, setHistory] = useStateApp([]);
  const skipPush = useRefApp(false);

  // Contexto de denuncia: solo en memoria, se borra al salir de /soporte
  const [reportContext, setReportContext] = useStateApp(null);

  const openReviewReport = (context) => {
    setHistory((h) => [...h, { screen, productId, accesorioId, municionId, catalogFilter }]);
    setReportContext(context);
    setScreen('soporte');
  };

  useEffectApp(() => {
    if (screen !== 'soporte') setReportContext(null);
  }, [screen]);

  // URL ↔ pantalla: empuja una nueva dirección al cambiar de pantalla. Dentro del
  // comparador, cambiar o quitar un arma REEMPLAZA la dirección en vez de apilar
  // una por toque; y al llegar por un enlace con un slug que no existe, la
  // normaliza sin dejar la mala en el historial.
  const pantallaAnterior = useRefApp(_init.screen);
  useEffectApp(() => {
    // Lo mismo al cambiar de separador en la vitrina de accesorios (15-sep-2026):
    // /accesorios ↔ /cargadores no apila una entrada del historial por pestaña.
    const reemplazar = (screen === 'compare' || screen === 'accesorios') && pantallaAnterior.current === screen;
    pantallaAnterior.current = screen;
    if (skipPush.current) { skipPush.current = false; return; }
    // Basta comparar la dirección que toca con la que hay. Al depender también
    // del filtro, /arsenal y /pistolas son direcciones distintas.
    const url = amxBuildUrl(screen, productId, accesorioId, municionId, catalogFilter, compareIds, calibreId);
    if (window.location.pathname === url) return;
    try {
      window.history[reemplazar ? 'replaceState' : 'pushState']({ screen, productId, accesorioId, municionId, calibreId }, '', url);
    } catch (e) {}
  }, [screen, productId, accesorioId, municionId, catalogFilter, compareIds, calibreId]);

  // Botón atrás/adelante del navegador → aplica la pantalla de la URL
  const idsVivos = useRefApp(compareIds);   // para onPop, que se registra una sola vez
  idsVivos.current = compareIds;
  useEffectApp(() => {
    const onPop = () => {
      const s = amxParsePath(window.location.pathname);
      skipPush.current = true;
      setHistory([]);
      setScreen(s.screen);
      setProductId(s.productId);
      setAccesorioId(s.accesorioId);
      setMunicionId(s.municionId);
      setCalibreId(s.calibreId);
      setCatalogFilter(s.catalogFilter);
      setReportContext(null);
      // En el comparador manda la selección EN MEMORIA, no la de la dirección:
      // la entrada del historial guarda las armas de cuando se escribió, y al
      // volver con «atrás» pisaba lo marcado después en otra ficha (se veía el
      // comparador vacío). Se reescribe la dirección con las armas actuales aquí
      // y no en el efecto de la URL: saltando de un comparador a otro (mantener
      // pulsado «atrás») no cambia ningún estado y el efecto no correría; y por
      // eso mismo skipPush vuelve a false, o se tragaría el siguiente pushState.
      if (s.screen === 'compare') {
        skipPush.current = false;
        const url = amxBuildUrl('compare', null, null, null, null, idsVivos.current);
        if (window.location.pathname !== url) {
          try { window.history.replaceState(window.history.state, '', url); } catch (e) {}
        }
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // ─── Tutorial de bienvenida (primer arranque + reproducible desde MÁS) ───
  // SOLO se abre solo para quien entra por la PORTADA. Este efecto corría sin
  // mirar la pantalla, así que quien llegaba desde un buscador a una de las 321
  // páginas prerenderizadas se lo comía igual — y desde que el tutorial no
  // tiene SALTAR (obligatorio por legalidad, tablero del 10-sep-2026) eso sería
  // obligarle a atravesar cuatro pantallas antes de ver la ficha que venía a
  // leer. `_init` es la ruta con la que se cargó la página; el efecto corre una
  // sola vez, al montar, así que es la de ATERRIZAJE y no cambia al navegar.
  const [tutorialOpen, setTutorialOpen] = useStateApp(false);
  useEffectApp(() => {
    if (_init.screen !== 'home') return;
    let seen = false;
    try { seen = !!localStorage.getItem('amx_onboarded_v1'); } catch (e) {}
    if (!seen) setTutorialOpen(true);
  }, []);
  const closeTutorial = () => {
    try { localStorage.setItem('amx_onboarded_v1', '1'); } catch (e) {}
    setTutorialOpen(false);
  };
  const replayTutorial = () => setTutorialOpen(true);

  const scrollRef = useRefApp(null);

  // Auto-hide BottomNav: visible por defecto, se oculta al bajar, reaparece al subir
  const [navVisible, setNavVisible] = useStateApp(true);
  const lastScrollY = useRefApp(0);

  useEffectApp(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    window.scrollTo(0, 0);
    setNavVisible(true);
    lastScrollY.current = 0;
  }, [screen, productId]);

  // Dirección de scroll → ocultar/mostrar BottomNav en móvil.
  // Escuchamos en el scroll-body Y en window: según la geometría del
  // contenido el scroll puede ocurrir en cualquiera de los dos.
  useEffectApp(() => {
    if (!vp.isMobile) return;
    const el = scrollRef.current;
    let ticking = false;
    const getY = () => {
      const ey = el ? el.scrollTop : 0;
      const wy = window.scrollY || window.pageYOffset || 0;
      return Math.max(ey, wy);
    };
    lastScrollY.current = getY();
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = getY();
        const delta = y - lastScrollY.current;
        lastScrollY.current = y;
        if (delta > 8) setNavVisible(false);
        else if (delta < -4) setNavVisible(true);
        ticking = false;
      });
    };
    const opts = { passive: true };
    if (el) el.addEventListener('scroll', onScroll, opts);
    window.addEventListener('scroll', onScroll, opts);
    return () => {
      if (el) el.removeEventListener('scroll', onScroll);
      window.removeEventListener('scroll', onScroll);
    };
  }, [vp.isMobile]);

  const navigate = (target, filter) => {
    setHistory(h => [...h, { screen, productId, catalogFilter }]);
    if (target === 'category') {
      setCatalogFilter(filter);
      setScreen('catalog');
    } else {
      setCatalogFilter(filter || null);
      setScreen(target);
    }
  };

  const openArma = (id) => {
    setHistory(h => [...h, { screen, productId, catalogFilter }]);
    setProductId(id);
    setScreen('product');
  };

  const openAccesorio = (id) => {
    setHistory(h => [...h, { screen, productId, catalogFilter }]);
    setAccesorioId(id);
    setScreen('accesorio');
  };

  const openMunicion = (id) => {
    setHistory(h => [...h, { screen, productId, catalogFilter }]);
    setMunicionId(id);
    setScreen('municion');
  };

  const openCalibre = (id) => {
    setHistory(h => [...h, { screen, productId, catalogFilter }]);
    setCalibreId(id);
    setScreen('calibre');
  };

  const goBack = () => {
    setHistory(h => {
      if (!h.length) { setScreen('home'); return []; }
      const last = h[h.length - 1];
      setScreen(last.screen);
      setProductId(last.productId);
      setCatalogFilter(last.catalogFilter);
      return h.slice(0, -1);
    });
  };

  const navTab = (id) => {
    setHistory([]);
    if (id === 'menu') setScreen('menu');
    else if (id === 'legal') setScreen('legal');
    else if (id === 'about') setScreen('about');
    else if (id === 'faq') setScreen('faq');
    else if (id === 'soporte') setScreen('soporte');
    else if (id === 'compare') setScreen('compare');
    else if (id === 'catalog') { setCatalogFilter(null); setScreen('catalog'); }
    else if (id === 'accesorios') { setCatalogFilter(null); setScreen('accesorios'); }
    else if (id === 'municiones') { setCatalogFilter(null); setScreen('municiones'); }
    else if (id === 'calibres') setScreen('calibres');
    else if (id === 'campos') setScreen('campos');
    else if (id === 'experiencias') setScreen('experiencias');
    else if (id === 'traumaticas') setScreen('traumaticas');
    else if (id === 'home') setScreen('home');
  };

  const toggleCompare = (id) => {
    setCompareIds(ids => {
      if (ids.includes(id)) return ids.filter(x => x !== id);
      if (ids.length >= 2) return [ids[1], id];
      return [...ids, id];
    });
  };

  const clearCompare = () => setCompareIds([]);
  const removeFromCompare = (id) => setCompareIds(ids => ids.filter(x => x !== id));

  // Elegir desde la búsqueda del comparador: el arma entra en SU lado ('a' la
  // primera, 'b' la segunda) y sustituye a la que hubiera. El orden importa: la
  // tira compara la segunda contra la primera y la URL lo escribe así.
  const ponerEnComparacion = (lado, id) => setCompareIds((ids) => {
    const next = ids.slice(0, 2);
    const i = lado === 'b' ? 1 : 0;
    if (i < next.length) next[i] = id; else next.push(id);
    return next.filter((x, k) => next.indexOf(x) === k);
  });

  // Una búsqueda abierta no sobrevive a salir del comparador (atrás del navegador).
  useEffectApp(() => { if (screen !== 'compare') setBuscarLado(null); }, [screen]);

  const titles = {
    home: '', catalog: 'Arsenal', product: 'Ficha',
    accesorios: 'Accesorios', accesorio: 'Ficha',
    municiones: 'Municiones', municion: 'Ficha',
    compare: 'Comparador', legal: 'Legalidad',
    about: 'Acerca', faq: 'FAQ', menu: 'Más', soporte: 'Soporte',
    calibres: 'Calibres', calibre: 'Calibre', campos: 'Campos de tiro', experiencias: 'Experiencias',
    traumaticas: 'Armas traumáticas',
  };

  const isInternal = ['product', 'accesorio', 'municion', 'calibre', 'about', 'faq', 'soporte', 'calibres', 'campos', 'experiencias', 'traumaticas'].includes(screen) || ((screen === 'catalog' || screen === 'accesorios' || screen === 'municiones') && history.length > 0);
  const currentNavId = ({
    home: 'home', catalog: 'catalog', compare: 'compare',
    legal: 'legal', menu: 'menu', about: 'about', faq: 'faq',
    calibres: 'menu', calibre: 'menu', campos: 'menu', experiencias: 'menu', traumaticas: 'menu',
    soporte: 'menu',
    municiones: 'menu', municion: 'menu',
    accesorios: 'accesorios', accesorio: 'accesorios',
    product: history[history.length-1]?.screen === 'compare' ? 'compare' : 'catalog',
  })[screen] || 'home';

  // contenido del screen
  let content;
  if (screen === 'home') {
    content = <window.HomeScreen onNav={navigate} onOpenArma={openArma} onOpenAccesorio={openAccesorio} onOpenMunicion={openMunicion} />;
  } else if (screen === 'catalog') {
    content = catalogFilter
      ? <window.CatalogScreen initialFilter={catalogFilter}
          onOpenArma={openArma}
          compareIds={compareIds}
          toggleCompare={toggleCompare} />
      : <window.ArsenalHubScreen onNav={navigate} />;
  } else if (screen === 'product') {
    content = <window.ProductScreen armaId={productId}
      onOpenArma={openArma}
      onOpenAccesorio={openAccesorio}
      onOpenMunicion={openMunicion}
      onNav={navigate}
      onReportReview={openReviewReport}
      compareIds={compareIds}
      toggleCompare={toggleCompare} />;
  } else if (screen === 'compare') {
    content = <window.CompareScreen ids={compareIds}
      onOpenArma={openArma}
      onNav={navigate}
      onPoner={ponerEnComparacion}
      onQuitar={removeFromCompare}
      buscarLado={buscarLado}
      onBuscar={setBuscarLado} />;
  } else if (screen === 'legal') {
    content = <window.LegalScreen onNav={navigate} />;
  } else if (screen === 'about') {
    content = <window.AboutScreen />;
  } else if (screen === 'faq') {
    content = <window.FAQScreen />;
  } else if (screen === 'soporte') {
    content = <window.SoporteScreen onNav={navTab} reportContext={reportContext} />;
  } else if (screen === 'menu') {
    content = <window.MenuScreen onNav={navigate} onTutorial={replayTutorial} />;
  } else if (screen === 'calibres') {
    content = <window.CalibresScreen onNav={navigate} onAbrirCalibre={openCalibre} />;
  } else if (screen === 'calibre') {
    content = <window.CalibreScreen calibreId={calibreId} onOpenArma={openArma} onNav={navigate} />;
  // Campos y Experiencias estan CONGELADAS hasta el lanzamiento: sus datos son
  // de relleno (ver data-extra.js). CamposScreen y CursosScreen siguen escritas
  // en screens-3.jsx — para reactivarlas basta con volver a montarlas aqui.
  } else if (screen === 'campos') {
    content = <window.ProximamenteScreen titulo="Campos de tiro"
      texto="Estamos reuniendo los clubes y polígonos del país con sus disciplinas, distancias y condiciones de acceso. Esta sección se abrirá cuando la información esté verificada." />;
  } else if (screen === 'experiencias') {
    content = <window.ProximamenteScreen titulo="Experiencias"
      texto="Formación y actividades de tiro: manejo seguro, tiro defensivo, precisión y marco legal. Esta sección se abrirá cuando la oferta esté confirmada." />;
  } else if (screen === 'traumaticas') {
    content = <window.TraumaticasScreen onNav={navigate} />;
  } else if (screen === 'accesorios') {
    content = <window.AccesoriosScreen initialFilter={catalogFilter} onOpenAccesorio={openAccesorio}
      onCategoria={(id) => setCatalogFilter(id === 'all' ? null : { categoria: id })} />;
  } else if (screen === 'accesorio') {
    content = <window.AccesorioFicha accesorioId={accesorioId} onOpenArma={openArma} onNav={navigate} onReportReview={openReviewReport} compareIds={compareIds} />;
  } else if (screen === 'municiones') {
    content = <window.MunicionesScreen initialFilter={catalogFilter} onOpenMunicion={openMunicion} onNav={navigate} />;
  } else if (screen === 'municion') {
    content = <window.MunicionFicha municionId={municionId} onOpenMunicion={openMunicion} onOpenArma={openArma} />;
  }

  return (
    // amx-v2 expone los tokens y las utilidades de estilo.css a TODA la app.
    // Antes envolvía solo la ficha, y el resultado era una pantalla a medio
    // migrar: bloques con la paleta nueva junto a bloques con la vieja.
    <div className="amx-v2" style={{
      width: '100%', minHeight: '100vh',
      background: PALETTE.bg,
      color: PALETTE.text,
      display: 'flex', flexDirection: 'column',
      position: 'relative',
    }}>
      {/* Header */}
      {vp.isMobile ? (
        <window.AppHeader
          title={titles[screen]}
          back={isInternal}
          onBack={goBack}
          onHome={() => navTab('home')}
        />
      ) : (
        <window.TopNav
          current={currentNavId}
          onNav={navTab}
          compareCount={compareIds.length}
        />
      )}

      {/* Scroll body */}
      <div ref={scrollRef} style={{
        flex: 1, minHeight: 0,
        overflowY: vp.isMobile ? 'auto' : 'visible',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        maxWidth: '100vw',
      }}>
        {/* El cortafuegos: si la pantalla revienta, se lleva solo este hueco.
            Cabecera, navegación y pie siguen en pie. La llave es la pantalla
            actual, para que al navegar el aviso se suelte. */}
        <window.PantallaRota llave={screen} onNav={navTab}>
          {content}
        </window.PantallaRota>
        {/* PIE DE OFICIO — global, no solo del Home. Tres razones:
            (1) lo que lleva dentro son avisos de SITIO —divulgativo, no somos
                gobierno, marcas de terceros—, no de pantalla;
            (2) casi nadie entra por la portada: el buscador manda a las fichas,
                y ahí el aviso tiene que estar;
            (3) va DENTRO del cuerpo con scroll, no como hermano del nav: en
                móvil este div es el único que hace scroll, y colgado fuera se
                quedaría fijo comiéndose la pantalla. */}
        <window.PieDeSitio onNav={navTab} />
      </div>

      {/* Floating Compare Bar (mobile only) */}
      {vp.isMobile && compareIds.length > 0 && screen !== 'compare' && (
        <window.CompareFloat ids={compareIds}
          onOpen={() => { setHistory(h => [...h, { screen, productId, catalogFilter }]); setScreen('compare'); }}
          onElegir={() => { setHistory(h => [...h, { screen, productId, catalogFilter }]); setScreen('compare'); setBuscarLado('b'); }}
          onClear={clearCompare} />
      )}

      {/* Desktop compare badge: bottom-right when there are items */}
      {!vp.isMobile && compareIds.length > 0 && screen !== 'compare' && (
        <button onClick={() => setScreen('compare')} style={{
          position: 'fixed', bottom: 24, right: 24,
          background: PALETTE.amber, color: PALETTE.tintaSobreMarca, border: 'none',
          padding: '12px 18px',
          fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 15,
          letterSpacing: '0.15em', textTransform: 'uppercase',
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(221,213,196,0.4)',
          zIndex: 50,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          Ver comparador · {compareIds.length} {compareIds.length === 1 ? 'arma' : 'armas'}
        </button>
      )}

      {/* Bottom Nav (mobile only) */}
      {vp.isMobile && (
        <window.BottomNav
          current={currentNavId}
          onNav={navTab}
          compareCount={compareIds.length}
          visible={navVisible} />
      )}

      {/* ─── TUTORIAL DE BIENVENIDA (overlay) ─── */}
      {window.OnboardingTutorial && (
        <window.OnboardingTutorial open={tutorialOpen} onClose={closeTutorial} />
      )}
    </div>
  );
}

window.App = App;

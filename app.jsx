// Armado en México — App principal (router + estado + responsive)

const { useState: useStateApp, useEffect: useEffectApp, useRef: useRefApp } = React;

// ─── RUTEO POR URL ───────────────────────────────────────────────────────
// Direcciones legibles y jerárquicas, pensadas para SEO/GEO:
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
  calibres: 'calibres', campos: 'campos', cursos: 'cursos',
  compare: 'comparar', legal: 'legalidad', about: 'acerca',
  faq: 'preguntas', menu: 'mas', submit: 'proponer', traumaticas: 'traumaticas',
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

  const idx = { aPorSlug: {}, slugPorA: {}, cPorSlug: {}, slugPorC: {}, mPorSlug: {}, slugPorM: {} };
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

function amxBuildPath(screen, productId, accesorioId, municionId, catalogFilter) {
  const idx = amxSlugIndex();
  if (screen === 'product') return idx.slugPorA[productId] || 'arsenal';
  if (screen === 'accesorio') return idx.slugPorC[accesorioId] || 'accesorios';
  if (screen === 'municion') return 'municiones/' + (idx.slugPorM[municionId] || '');
  // Listados por rama: /pistolas, /cargadores…
  if (screen === 'catalog' && catalogFilter && catalogFilter.mode === 'tipo' && TIPO_TO_PATH[catalogFilter.value]) {
    return TIPO_TO_PATH[catalogFilter.value];
  }
  if (screen === 'accesorios' && catalogFilter && catalogFilter.categoria && catalogFilter.categoria !== 'all') {
    return amxSlug(catalogFilter.categoria);
  }
  return SCREEN_TO_PATH[screen] || '';
}
function amxBuildUrl(screen, productId, accesorioId, municionId, catalogFilter) {
  return APP_BASE + amxBuildPath(screen, productId, accesorioId, municionId, catalogFilter);
}

const VACIO = { screen: 'home', productId: null, accesorioId: null, municionId: null, catalogFilter: null };
function amxParsePath(pathname) {
  let rel = pathname || '';
  if (APP_BASE !== '/' && rel.indexOf(APP_BASE) === 0) rel = rel.slice(APP_BASE.length);
  else if (APP_BASE === '/' && rel[0] === '/') rel = rel.slice(1);
  rel = rel.replace(/index\.html$/, '').replace(/^\/+|\/+$/g, '');
  if (!rel) return Object.assign({}, VACIO);

  const seg = rel.split('/').map((s) => decodeURIComponent(s).toLowerCase());
  const idx = amxSlugIndex();

  // Pantallas con nombre propio (/arsenal, /calibres…) y el listado de municiones
  if (seg.length === 1 && PATH_TO_SCREEN[seg[0]]) {
    return Object.assign({}, VACIO, { screen: PATH_TO_SCREEN[seg[0]] });
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

  // ─── Tweaks (3 controles expresivos: facción, intensidad HUD, tipografía) ───
  const [tw, setTweak] = window.useTweaks(window.TWEAK_DEFAULTS || {
    faction: 'amarillo', hudIntensity: 'standard', typeface: 'stencil',
  });
  useEffectApp(() => {
    const FACTIONS = {
      amarillo: { accent: '#F5C518', deep: '#D4A910' },  // Amarillo Táctica (marca)
      oro:      { accent: '#D4A910', deep: '#A98A0C' },  // oro intenso
      alerta:   { accent: '#C0392B', deep: '#A93226' },  // Rojo Alerta
      acero:    { accent: '#9AA3AD', deep: '#6B7178' },  // acero neutro
    };
    const p = FACTIONS[tw.faction] || FACTIONS.amarillo;
    window.GUN_ACCENT = p.accent;
    window.GUN_ACCENT_DEEP = p.deep;
    if (window.PALETTE) {
      window.PALETTE.amber = p.accent;
      window.PALETTE.amberDim = p.deep;
    }
    document.body.dataset.hud = tw.hudIntensity || 'standard';
    document.body.dataset.type = tw.typeface || 'stencil';
  }, [tw.faction, tw.hudIntensity, tw.typeface]);

  // Navegación — estado inicial leído de la URL (deep-links)
  const _init = amxParsePath(window.location.pathname);
  const [screen, setScreen] = useStateApp(_init.screen);
  const [productId, setProductId] = useStateApp(_init.productId);
  const [accesorioId, setAccesorioId] = useStateApp(_init.accesorioId);
  const [municionId, setMunicionId] = useStateApp(_init.municionId);
  const [catalogFilter, setCatalogFilter] = useStateApp(_init.catalogFilter);
  const [compareIds, setCompareIds] = useStateApp([]);
  const [pickerSlot, setPickerSlot] = useStateApp(null);
  const [history, setHistory] = useStateApp([]);
  const skipPush = useRefApp(false);

  // URL ↔ pantalla: empuja una nueva dirección al cambiar de pantalla
  useEffectApp(() => {
    if (skipPush.current) { skipPush.current = false; return; }
    // Basta comparar la dirección que toca con la que hay. Al depender también
    // del filtro, /arsenal y /pistolas son direcciones distintas.
    const url = amxBuildUrl(screen, productId, accesorioId, municionId, catalogFilter);
    if (window.location.pathname === url) return;
    try { window.history.pushState({ screen, productId, accesorioId, municionId }, '', url); } catch (e) {}
  }, [screen, productId, accesorioId, municionId, catalogFilter]);

  // Botón atrás/adelante del navegador → aplica la pantalla de la URL
  useEffectApp(() => {
    const onPop = () => {
      const s = amxParsePath(window.location.pathname);
      skipPush.current = true;
      setHistory([]);
      setScreen(s.screen);
      setProductId(s.productId);
      setAccesorioId(s.accesorioId);
      setMunicionId(s.municionId);
      setCatalogFilter(s.catalogFilter);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // ─── Tutorial de bienvenida (primer arranque + reproducible desde MÁS) ───
  const [tutorialOpen, setTutorialOpen] = useStateApp(false);
  useEffectApp(() => {
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

  useEffectApp(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    window.scrollTo(0, 0);
  }, [screen, productId]);

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
    if (pickerSlot !== null) {
      setCompareIds(ids => {
        const next = [...ids];
        next[pickerSlot] = id;
        return next.filter(Boolean);
      });
      setPickerSlot(null);
    }
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
    else if (id === 'submit') setScreen('submit');
    else if (id === 'compare') setScreen('compare');
    else if (id === 'catalog') { setCatalogFilter(null); setScreen('catalog'); }
    else if (id === 'accesorios') { setCatalogFilter(null); setScreen('accesorios'); }
    else if (id === 'municiones') { setCatalogFilter(null); setScreen('municiones'); }
    else if (id === 'calibres') setScreen('calibres');
    else if (id === 'campos') setScreen('campos');
    else if (id === 'cursos') setScreen('cursos');
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
  const openPickerForSlot = (slot) => {
    setPickerSlot(slot);
    setHistory(h => [...h, { screen, productId, catalogFilter }]);
    setCatalogFilter({ mode: 'all' }); // mostrar el listado (no el hub) para elegir arma
    setScreen('catalog');
  };

  const titles = {
    home: '', catalog: 'Arsenal', product: 'Ficha',
    accesorios: 'Accesorios', accesorio: 'Ficha',
    municiones: 'Municiones', municion: 'Ficha',
    compare: 'Comparador', legal: 'Legalidad',
    about: 'Acerca', faq: 'FAQ', menu: 'Más',
    submit: 'Proponer arma',
    calibres: 'Calibres', campos: 'Campos de tiro', cursos: 'Cursos',
    traumaticas: 'Armas traumáticas',
  };

  const isInternal = ['product', 'accesorio', 'municion', 'about', 'faq', 'submit', 'calibres', 'campos', 'cursos', 'traumaticas'].includes(screen) || ((screen === 'catalog' || screen === 'accesorios' || screen === 'municiones') && history.length > 0);
  const currentNavId = ({
    home: 'home', catalog: 'catalog', compare: 'compare',
    legal: 'legal', menu: 'menu', about: 'about', faq: 'faq',
    calibres: 'menu', campos: 'menu', cursos: 'menu', traumaticas: 'menu',
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
      compareIds={compareIds}
      toggleCompare={toggleCompare} />;
  } else if (screen === 'compare') {
    content = <window.CompareScreen ids={compareIds}
      onOpenArma={openArma}
      onNav={navigate}
      removeFromCompare={removeFromCompare}
      openPickerForSlot={openPickerForSlot} />;
  } else if (screen === 'legal') {
    content = <window.LegalScreen onNav={navigate} />;
  } else if (screen === 'about') {
    content = <window.AboutScreen />;
  } else if (screen === 'faq') {
    content = <window.FAQScreen />;
  } else if (screen === 'menu') {
    content = <window.MenuScreen onNav={navigate} onTutorial={replayTutorial} />;
  } else if (screen === 'submit') {
    content = <window.SubmitScreen onNav={navigate} />;
  } else if (screen === 'calibres') {
    content = <window.CalibresScreen onOpenArma={openArma} onNav={navigate} />;
  } else if (screen === 'campos') {
    content = <window.CamposScreen onNav={navigate} />;
  } else if (screen === 'cursos') {
    content = <window.CursosScreen onNav={navigate} />;
  } else if (screen === 'traumaticas') {
    content = <window.TraumaticasScreen onNav={navigate} />;
  } else if (screen === 'accesorios') {
    content = <window.AccesoriosScreen initialFilter={catalogFilter} onOpenAccesorio={openAccesorio} onNav={navigate} />;
  } else if (screen === 'accesorio') {
    content = <window.AccesorioFicha accesorioId={accesorioId} onOpenAccesorio={openAccesorio} onOpenArma={openArma} onNav={navigate} />;
  } else if (screen === 'municiones') {
    content = <window.MunicionesScreen initialFilter={catalogFilter} onOpenMunicion={openMunicion} onNav={navigate} />;
  } else if (screen === 'municion') {
    content = <window.MunicionFicha municionId={municionId} onOpenMunicion={openMunicion} onOpenArma={openArma} />;
  }

  return (
    <div style={{
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
          right={pickerSlot !== null ? (
            <span style={{
              fontFamily: 'Courier Prime, monospace',
              fontSize: 13, color: PALETTE.amber,
              letterSpacing: '0.15em',
              background: 'rgba(245,197,24,0.12)',
              border: `1px solid ${PALETTE.amber}`,
              padding: '3px 6px',
            }}>SLOT {pickerSlot === 0 ? 'A' : 'B'}</span>
          ) : null}
        />
      ) : (
        <window.TopNav
          current={currentNavId}
          onNav={navTab}
          compareCount={compareIds.length}
        />
      )}

      {/* Picker mode banner on desktop */}
      {!vp.isMobile && pickerSlot !== null && (
        <div style={{
          position: 'sticky', top: 64, zIndex: 40,
          background: PALETTE.amber, color: '#000',
          padding: '8px 28px',
          fontFamily: 'Courier Prime, monospace',
          fontSize: 15.5, letterSpacing: '0.15em',
          textTransform: 'uppercase',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>◆ MODO SELECCIÓN — Slot {pickerSlot === 0 ? 'A' : 'B'} · elige un arma para añadirla al comparador</span>
          <button onClick={() => { window.cancelPicker && window.cancelPicker(); }} style={{
            background: 'rgba(0,0,0,0.2)', color: '#000', border: '1px solid #000',
            padding: '3px 8px', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 14.5, letterSpacing: '0.1em',
            textTransform: 'uppercase', fontWeight: 700,
          }}>Cancelar</button>
        </div>
      )}

      {/* Scroll body */}
      <div ref={scrollRef} style={{
        flex: 1, minHeight: 0,
        overflowY: vp.isMobile ? 'auto' : 'visible',
        WebkitOverflowScrolling: 'touch',
      }}>
        {content}
      </div>

      {/* Floating Compare Bar (mobile only) */}
      {vp.isMobile && compareIds.length > 0 && screen !== 'compare' && (
        <window.CompareFloat ids={compareIds}
          onOpen={() => { setHistory(h => [...h, { screen, productId, catalogFilter }]); setScreen('compare'); }}
          onClear={clearCompare} />
      )}

      {/* Desktop compare badge: bottom-right when there are items */}
      {!vp.isMobile && compareIds.length > 0 && screen !== 'compare' && (
        <button onClick={() => setScreen('compare')} style={{
          position: 'fixed', bottom: 24, right: 24,
          background: PALETTE.amber, color: '#000', border: 'none',
          padding: '12px 18px',
          fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 15,
          letterSpacing: '0.15em', textTransform: 'uppercase',
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(245,197,24,0.4)',
          zIndex: 50,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          ⇄ Comparar · {compareIds.length}/2
        </button>
      )}

      {/* Bottom Nav (mobile only) */}
      {vp.isMobile && (
        <window.BottomNav
          current={currentNavId}
          onNav={navTab}
          compareCount={compareIds.length} />
      )}

      {/* ─── TUTORIAL DE BIENVENIDA (overlay) ─── */}
      {window.OnboardingTutorial && (
        <window.OnboardingTutorial open={tutorialOpen} onClose={closeTutorial} />
      )}

      {/* ─── TWEAKS PANEL ─── */}
      {window.TweaksPanel && (
        <window.TweaksPanel title="Tweaks · Armado MX">
          <window.TweakSection label="Acento · marca">
            <window.TweakColor
              label="Color"
              value={({amarillo:'#F5C518',oro:'#D4A910',alerta:'#C0392B',acero:'#9AA3AD'})[tw.faction] || '#F5C518'}
              options={['#F5C518','#D4A910','#C0392B','#9AA3AD']}
              onChange={(hex) => {
                const map = { '#F5C518':'amarillo', '#D4A910':'oro', '#C0392B':'alerta', '#9AA3AD':'acero' };
                setTweak('faction', map[hex] || 'amarillo');
              }}
            />
          </window.TweakSection>
          <window.TweakSection label="Intensidad HUD">
            <window.TweakRadio
              label="Chrome"
              value={tw.hudIntensity}
              options={[
                { value: 'minimal',  label: 'Discreta' },
                { value: 'standard', label: 'Estándar' },
                { value: 'max',      label: 'Máxima' },
              ]}
              onChange={(v) => setTweak('hudIntensity', v)}
            />
          </window.TweakSection>
          <window.TweakSection label="Tipografía">
            <window.TweakRadio
              label="Sistema"
              value={tw.typeface}
              options={[
                { value: 'stencil',   label: 'Stencil' },
                { value: 'editorial', label: 'Editorial' },
                { value: 'terminal',  label: 'Terminal' },
              ]}
              onChange={(v) => setTweak('typeface', v)}
            />
          </window.TweakSection>
        </window.TweaksPanel>
      )}
    </div>
  );
}

window.App = App;

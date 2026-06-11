// Armado en México — App principal (router + estado + responsive)

const { useState: useStateApp, useEffect: useEffectApp, useRef: useRefApp } = React;

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

  // Navegación
  const [screen, setScreen] = useStateApp('home');
  const [productId, setProductId] = useStateApp(null);
  const [catalogFilter, setCatalogFilter] = useStateApp(null);
  const [compareIds, setCompareIds] = useStateApp([]);
  const [pickerSlot, setPickerSlot] = useStateApp(null);
  const [history, setHistory] = useStateApp([]);

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
    else if (id === 'calibres') setScreen('calibres');
    else if (id === 'campos') setScreen('campos');
    else if (id === 'cursos') setScreen('cursos');
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
    setScreen('catalog');
  };

  const titles = {
    home: '', catalog: 'Arsenal', product: 'Ficha',
    compare: 'Comparador', legal: 'Legalidad',
    about: 'Acerca', faq: 'FAQ', menu: 'Más',
    submit: 'Proponer arma',
    calibres: 'Calibres', campos: 'Campos de tiro', cursos: 'Cursos',
  };

  const isInternal = ['product', 'about', 'faq', 'submit', 'calibres', 'campos', 'cursos'].includes(screen) || (screen === 'catalog' && history.length > 0);
  const currentNavId = ({
    home: 'home', catalog: 'catalog', compare: 'compare',
    legal: 'legal', menu: 'menu', about: 'about', faq: 'faq',
    calibres: 'menu', campos: 'menu', cursos: 'menu',
    product: history[history.length-1]?.screen === 'compare' ? 'compare' : 'catalog',
  })[screen] || 'home';

  // contenido del screen
  let content;
  if (screen === 'home') {
    content = <window.HomeScreen onNav={navigate} onOpenArma={openArma} />;
  } else if (screen === 'catalog') {
    content = <window.CatalogScreen initialFilter={catalogFilter}
      onOpenArma={openArma}
      compareIds={compareIds}
      toggleCompare={toggleCompare} />;
  } else if (screen === 'product') {
    content = <window.ProductScreen armaId={productId}
      onOpenArma={openArma}
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
    content = <window.MenuScreen onNav={navigate} />;
  } else if (screen === 'submit') {
    content = <window.SubmitScreen onNav={navigate} />;
  } else if (screen === 'calibres') {
    content = <window.CalibresScreen onOpenArma={openArma} onNav={navigate} />;
  } else if (screen === 'campos') {
    content = <window.CamposScreen onNav={navigate} />;
  } else if (screen === 'cursos') {
    content = <window.CursosScreen onNav={navigate} />;
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
              fontSize: 11, color: PALETTE.amber,
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
          fontSize: 13, letterSpacing: '0.15em',
          textTransform: 'uppercase',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>◆ MODO SELECCIÓN — Slot {pickerSlot === 0 ? 'A' : 'B'} · elige un arma para añadirla al comparador</span>
          <button onClick={() => { window.cancelPicker && window.cancelPicker(); }} style={{
            background: 'rgba(0,0,0,0.2)', color: '#000', border: '1px solid #000',
            padding: '3px 8px', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 12, letterSpacing: '0.1em',
            textTransform: 'uppercase', fontWeight: 700,
          }}>Cancelar</button>
        </div>
      )}

      {/* Scroll body */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: vp.isMobile ? 'auto' : 'visible',
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

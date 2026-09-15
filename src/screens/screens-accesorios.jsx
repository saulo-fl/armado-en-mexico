// Armado en México — Pantallas de ACCESORIOS DCAM
// Card, carrusel de Home, la vitrina del catálogo (rediseño del 15-sep-2026), y
// ficha de detalle con el bloque de precio + historial de inventarios (mismo
// patrón que las armas).
// Expone en window: AccesorioCard, HomeAccesoriosSection, AccesoriosScreen, AccesorioFicha

const { useState: useStateAcc } = React;

// Fecha de inventario (YYYY-MM-DD) → texto es-MX
function accFmtDate(f) {
  if (!f) return '';
  const d = new Date(String(f).length === 10 ? f + 'T12:00:00' : f);
  if (isNaN(d)) return String(f);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}
function accCatMeta(id) {
  return (window.ACCESORIO_CATEGORIES.categoria.find(c => c.id === id)) || { label: id, icon: '◆' };
}

// Aviso discreto cuando no hay fotografía real del accesorio
// Respaldo cuando un accesorio no tiene fotografía propia — hoy, los 36 del
// catálogo, así que es la vista por defecto y no un caso raro.
// Era una cámara tachada en SVG dibujada a mano. Saulo retiró los SVG generados
// el 8-sep-2026: ahora va la SILUETA de la categoría, el mismo lenguaje que las
// armas. Se pinta como máscara, así que el color lo pone el CSS y sigue al tema.
function AccNoImage({ acc, compact }) {
  const forma = window.accesorioPlaceholder ? window.accesorioPlaceholder(acc) : null;
  return (
    <div role="img" aria-label={'Sin fotografía en expediente' + (acc && acc.nombre ? ': ' + acc.nombre : '')}
      style={{
        position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: compact ? 6 : 10,
        padding: '0 12px', textAlign: 'center', width: '100%', height: '100%',
      }}>
      {forma && (
        <span className="amx-silueta-acc" aria-hidden="true"
          style={{ '--silueta-forma': `url(${forma})`, height: compact ? 34 : 52 }} />
      )}
      <span style={{
        fontFamily: 'JetBrains Mono, monospace',
        // 11px es el piso de texto funcional; los 10.5 de antes quedaban debajo.
        fontSize: compact ? 11 : 12.5,
        color: 'var(--tinta-2)', letterSpacing: '0.05em', lineHeight: 1.45,
      }}>Sin fotografía{compact ? '' : ' en expediente'}</span>
    </div>
  );
}
window.AccNoImage = AccNoImage;

// ════════════════════════════════════════════════════════════════
// ACCESORIO CARD — tarjeta horizontal (gemela de ArmaCard)
// ════════════════════════════════════════════════════════════════
function AccesorioCard({ acc, onClick }) {
  const P = window.PALETTE;
  const [imgError, setImgError] = useStateAcc(false);
  const cat = accCatMeta(acc.categoria);
  return (
    <div onClick={onClick} style={{
      position: 'relative',
      background: window.CLARO.panel,
      borderRadius: window.CLARO.radio,
      border: `1px solid ${window.CLARO.hair}`,
      // La sombra la pone .amx-card en estilo.css (ver ui.jsx/ArmaCard).
      cursor: 'pointer',
      overflow: 'hidden',
      height: '100%',
      display: 'flex', flexDirection: 'row',
      contentVisibility: 'auto',
      containIntrinsicSize: 'auto 150px',
    }} className="amx-card">
      {/* imagen */}
      <div style={{
        width: '42%', flexShrink: 0, alignSelf: 'stretch', minHeight: 112,
        background: `radial-gradient(circle at 50% 50%, ${window.CLARO.panelHi} 0%, ${P.bg} 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', borderRight: `1px solid ${window.CLARO.hair}`, overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `repeating-linear-gradient(0deg, transparent 0 3px, rgba(221,213,196,0.03) 3px 4px)`,
        }} />
        {window.isRealImage(acc.img) && !imgError ? (
          <img src={acc.img} alt={acc.nombre}
            loading="lazy" decoding="async" onError={() => setImgError(true)}
            style={{ maxWidth: '88%', maxHeight: '88%', objectFit: 'contain', position: 'relative', zIndex: 1 }} />
        ) : (
          <AccNoImage acc={acc} compact />
        )}
        <span style={{
          position: 'absolute', top: 6, left: 6,
          fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600,
          // Va sobre la PLACA fotográfica, clara en los dos temas: la tinta se
          // fija a --tinta-placa. CLARO.tinta2 se aclara en oscuro y dejaría
          // gris claro sobre casi blanco.
          color: 'var(--tinta-placa)', background: 'rgba(250,249,245,0.92)', padding: '2px 6px', borderRadius: 4,
          letterSpacing: '0.1em', textTransform: 'uppercase', borderLeft: '2px solid var(--tinta-placa)',
        }}>{cat.icon} {cat.label.split(' ')[0]}</span>
      </div>
      {/* body */}
      <div style={{ padding: '10px 12px 12px', flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, minWidth: 0 }}>
          {window.CountryFlag && <window.CountryFlag pais={acc.pais} height={12} />}
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: window.CLARO.tinta2,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{acc.marca}</span>
        </div>
        <div style={{
          fontFamily: 'Archivo, sans-serif', fontWeight: 600, fontSize: 16,
          color: window.CLARO.tinta, textTransform: 'uppercase', lineHeight: 1.15, marginBottom: 6,
          letterSpacing: '0.02em', height: 38,
          display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden',
        }}>{acc.nombre}</div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: window.CLARO.tinta2, marginBottom: 8,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          <span style={{ color: window.CLARO.tinta2 }}>CAT </span>{cat.label}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px 8px', flexWrap: 'wrap', marginTop: 'auto' }}>
          <window.AvailBadge avail={acc.avail} compact />
          <window.PriceLevel lvl={acc.priceLvl} />
        </div>
      </div>
    </div>
  );
}
window.AccesorioCard = AccesorioCard;

// ════════════════════════════════════════════════════════════════
// HOME — cartas de lotería de las categorías de accesorio
// ════════════════════════════════════════════════════════════════
// Sin encabezado ni rejilla propios: devuelve solo las cartas, y el Home las
// pinta dentro de la misma mesa de «Categorías» que las de arma (Saulo,
// 13-sep-2026: fuera el título «Accesorios DCAM» y su «Ver todos →»).
function HomeAccesoriosSection({ onNav }) {
  const cats = window.ACCESORIO_CATEGORIES.categoria;
  const counts = {};
  (window.ACCESORIOS || []).forEach(a => { counts[a.categoria] = (counts[a.categoria] || 0) + 1; });

  // El número es cuántos accesorios hay en la categoría y el nombre va abajo.
  // La figura sale de `accesorioPlaceholder`, que ya sabe mapear las diez
  // categorías a las siluetas que existen —solo lee `.categoria`, por eso se le
  // pasa un objeto de un campo.
  return (
    <React.Fragment>
      {cats.filter(c => counts[c.id]).map(c => (
        <window.CartaLoteria key={c.id}
          nombre={c.label}
          cuenta={counts[c.id]}
          unidad="accesorios"
          forma={window.accesorioPlaceholder({ categoria: c.id })}
          onClick={() => onNav && onNav('accesorios', { categoria: c.id })} />
      ))}
    </React.Fragment>
  );
}
window.HomeAccesoriosSection = HomeAccesoriosSection;

// ════════════════════════════════════════════════════════════════
// CATÁLOGO DE ACCESORIOS — la vitrina (rediseño del 15-sep-2026)
// Un puesto de tianguis como el de Municiones del Home: toldo de lona,
// separadores de fichero por categoría y un puesto por pieza con SOLO su nombre
// corto. Decidido con Saulo pregunta por pregunta (docs/DESIGN.md §5.7); él
// retiró el buscador, los desplegables y el aviso de esta pantalla.
// La categoría activa vive en la URL (app.jsx): aquí solo se lee y se avisa con
// `onCategoria` al cambiar de separador.
// ════════════════════════════════════════════════════════════════
function AccesoriosScreen({ initialFilter, onOpenAccesorio, onCategoria }) {
  const vp = window.useViewport();
  // 2 por fila en móvil, 4 en tableta (solo para que no se rompa) y 6 desde el
  // corte único de 1024 px.
  const porFila = vp.width < 720 ? 2 : vp.width < 1024 ? 4 : 6;
  const secciones = window.accesoriosVitrina('all');
  const pedida = initialFilter && initialFilter.categoria;
  const activo = secciones.some((s) => s.id === pedida) ? pedida : 'all';
  const visibles = window.accesoriosVitrina(activo);
  const opciones = [{ id: 'all', label: 'Todas' }].concat(secciones.map((s) => ({ id: s.id, label: s.label })));

  return (
    <div className="amx-vitrina-acc">
      <window.ToldoLona>Accesorios</window.ToldoLona>
      <window.SeparadoresFiltro etiqueta="Categorías de accesorios" opciones={opciones}
        activo={activo} controla="vitrina-acc-panel" onCambiar={(id) => onCategoria && onCategoria(id)} />
      <div id="vitrina-acc-panel" role="tabpanel" aria-labelledby={'separador-' + activo}>
        {visibles.map((s) => (
          <section key={s.id} className="amx-vitrina-acc-seccion" aria-labelledby={'vitrina-acc-' + s.id}>
            <window.CintaDymo id={'vitrina-acc-' + s.id}>{s.label}</window.CintaDymo>
            <window.MesaPuestos items={s.piezas} porFila={porFila} renderPuesto={(a) => (
              <window.PuestoPieza key={a.id}
                rotulo={a.corto}
                ariaLabel={a.corto + ' — ' + a.nombre}
                foto={window.isRealImage(a.img) ? a.img : null}
                silueta={window.accesorioPlaceholder(a)}
                onClick={() => onOpenAccesorio(a.id)} />
            )} />
          </section>
        ))}
      </div>
    </div>
  );
}
window.AccesoriosScreen = AccesoriosScreen;

// ════════════════════════════════════════════════════════════════
// FICHA DE ACCESORIO — detalle + precio referencia DCAM + historial
// ════════════════════════════════════════════════════════════════
function AccesorioFicha({ accesorioId, onOpenAccesorio, onOpenArma, onNav }) {
  const P = window.PALETTE;
  const vp = window.useViewport();
  const padX = vp.isDesktop ? 28 : 16;
  const acc = window.getAccesorioById(accesorioId);

  if (!acc) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', color: P.textMuted }}>
        Accesorio no encontrado.
      </div>
    );
  }

  const cat = accCatMeta(acc.categoria);
  const availMeta = window.ACCESORIO_CATEGORIES.disponibilidad.find(d => d.id === acc.avail);
  const priceHistory = window.getAccesorioPriceHistory(acc.id);
  const existencias = window.getAccesorioExistencias(acc.id);
  const armasComp = window.getArmasCompatibles(acc);
  const manualById = (id) => window.getAccesorioManual(id);
  const currentManual = manualById(acc.priceManualId) ||
    (priceHistory.length ? manualById(priceHistory[priceHistory.length - 1].manualId) : null) ||
    window.getAccesorioPrimaryManual();
  const curAut = window.manualAutoridad ? window.manualAutoridad(currentManual) : null;
  const curSigla = curAut ? curAut.sigla : 'DCAM';
  const relacionados = (window.ACCESORIOS || []).filter(a => a.categoria === acc.categoria && a.id !== acc.id).slice(0, 6);

  const [imgError, setImgError] = useStateAcc(false);

  return (
    <div style={{ paddingBottom: 90, maxWidth: 1100, margin: '0 auto', width: '100%' }}>
      {/* HERO: imagen + cabecera */}
      <div style={{
        display: vp.isDesktop ? 'grid' : 'block',
        gridTemplateColumns: vp.isDesktop ? '1fr 1fr' : 'none', gap: 24,
        padding: `20px ${padX}px 0`,
      }}>
        <div style={{
          position: 'relative', background: `radial-gradient(circle at 50% 45%, ${P.bgElev} 0%, ${P.bg} 100%)`,
          border: `1px solid ${P.border}`, minHeight: 240, aspectRatio: vp.isDesktop ? 'auto' : '4/3',
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        }}>
          <window.TacticalCorners size={14} color={P.amber} thickness={2} />
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `repeating-linear-gradient(0deg, transparent 0 3px, rgba(221,213,196,0.03) 3px 4px)` }} />
          {window.isRealImage(acc.img) && !imgError ? (
            <img src={acc.img} alt={acc.nombre} onError={() => setImgError(true)}
              style={{ maxWidth: '82%', maxHeight: '82%', objectFit: 'contain', position: 'relative', zIndex: 1 }} />
          ) : (
            <AccNoImage acc={acc} />
          )}
          <span style={{
            position: 'absolute', top: 10, left: 10,
            fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: P.textDim,
            // Va sobre la PLACA fotográfica, clara en los dos temas: la tinta
            // se fija a --tinta-placa (CLARO.tinta2 se aclara en oscuro).
            background: 'rgba(250,249,245,0.92)', color: 'var(--tinta-placa)', padding: '3px 8px', borderRadius: 4, letterSpacing: '0.1em',
            textTransform: 'uppercase', borderLeft: `2px solid ${P.amber}`,
          }}>{cat.icon} {cat.label}</span>
        </div>

        <div style={{ paddingTop: vp.isDesktop ? 4 : 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            {window.CountryFlag && <window.CountryFlag pais={acc.pais} height={14} />}
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 14.5, color: P.amber,
              letterSpacing: '0.16em', textTransform: 'uppercase',
            }}>{acc.marca}{acc.pais ? ` · ${acc.pais}` : ''}</span>
          </div>
          <h1 style={{
            fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: vp.isDesktop ? 30 : 25,
            color: P.text, textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1.08, margin: '0 0 12px',
          }}>{acc.nombre}</h1>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            <window.AvailBadge avail={acc.avail} />
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: P.bgCard, border: `1px solid ${P.border}`, padding: '3px 9px',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: P.textDim,
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}><span style={{ color: P.amber }}>{cat.icon}</span>{cat.label}</span>
          </div>
          {acc.descripcion &&
            <p style={{
              fontFamily: 'Archivo, system-ui, sans-serif', fontSize: 17.5, color: P.textDim,
              lineHeight: 1.65, margin: '0 0 6px', textWrap: 'pretty',
            }}>{acc.descripcion}</p>
          }
        </div>
      </div>

      {/* CUERPO en columnas en escritorio */}
      <div style={{
        display: vp.isDesktop ? 'grid' : 'block',
        gridTemplateColumns: vp.isDesktop ? '1fr 1fr' : 'none', gap: 24,
        padding: `20px ${padX}px 0`,
      }}>
        {/* Columna izquierda: specs + compatibilidad */}
        <div>
          {acc.specs && acc.specs.length > 0 &&
            <React.Fragment>
              <window.SectionHeader>Especificaciones</window.SectionHeader>
              <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, boxShadow: window.CLARO.sombra, marginBottom: 16 }}>
                {acc.specs.map(([k, v], i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', gap: 12,
                    padding: '9px 12px',
                    borderBottom: i < acc.specs.length - 1 ? `1px solid ${P.border}` : 'none',
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 15.5,
                  }}>
                    <span style={{ color: P.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k}</span>
                    <span style={{ color: P.text, fontWeight: 600, textAlign: 'right' }}>{v}</span>
                  </div>
                ))}
              </div>
            </React.Fragment>
          }

          {acc.compatibilidad && acc.compatibilidad.length > 0 &&
            <React.Fragment>
              <window.SectionHeader>Compatible con</window.SectionHeader>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                {acc.compatibilidad.map((c, i) => (
                  <span key={i} style={{
                    background: P.bgCard, border: `1px solid ${P.border}`,
                    padding: '6px 10px', fontFamily: 'JetBrains Mono, monospace', fontSize: 14.5,
                    color: P.text, letterSpacing: '0.06em',
                  }}>{c}</span>
                ))}
              </div>
            </React.Fragment>
          }
        </div>

        {/* Columna derecha: PRECIO + HISTORIAL */}
        <div>
          <window.SectionHeader>Precio de Referencia</window.SectionHeader>
          <div style={{
            background: P.bgCard, border: `1px solid ${P.amber}`, padding: '14px',
            marginBottom: 16, position: 'relative',
          }}>
            <window.TacticalCorners size={12} color={P.amber} thickness={2} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: P.textMuted,
                letterSpacing: '0.18em', textTransform: 'uppercase',
              }}>◆ Precio Actual (con IVA)</span>
              {curAut &&
                <span title={curAut.nombre} style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700,
                  letterSpacing: '0.12em', color: '#000', background: curAut.color,
                  padding: '2px 7px', flexShrink: 0,
                }}>{curAut.sigla}</span>}
            </div>
            <div style={{
              fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 23,
              color: P.amber, letterSpacing: '0.02em',
            }}>{priceHistory.length ? priceHistory[priceHistory.length - 1].price : acc.priceExact}</div>
            <window.NotaErrata historial={priceHistory} />
            {acc.dcamRef &&
              <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: P.textMuted,
                marginTop: 4, lineHeight: 1.4,
              }}>Ref. {curSigla}: {acc.dcamRef}</div>
            }
            {currentManual && currentManual.url &&
              <a href={currentManual.url} target="_blank" rel="noopener" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 9,
                fontFamily: 'JetBrains Mono, monospace', fontSize: 14.5, color: P.amber,
                textDecoration: 'none', border: `1px solid ${P.amber}`, padding: '9px 12px',
                minHeight: 40, boxSizing: 'border-box', letterSpacing: '0.04em',
              }}>
                <span aria-hidden="true">▦</span>
                Ver inventario fuente · {accFmtDate(currentManual.fecha)}
                <span aria-hidden="true">↗</span>
              </a>
            }
            {(() => {
              // Regla: SOLO cuenta el ÚLTIMO inventario de cada sucursal (DCAM y OTCA
              // por separado). Si el accesorio no aparece en él (pero antes sí estuvo
              // en la sucursal), se muestra AGOTADO.
              const autOf = (m) => (m && (m.autoridad || (window.manualAutoridad ? window.manualAutoridad(m).sigla : 'DCAM'))) || 'DCAM';
              const allMan = (window.ACCESORIOS_MANUALES || []).slice().sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
              const latestOf = (s) => allMan.find((m) => autOf(m) === s) || null;
              const everIn = (s) => priceHistory.some((h) => autOf(manualById(h.manualId)) === s);
              const branches = [];
              ['DCAM', 'OTCA'].forEach((s) => {
                const man = latestOf(s); if (!man) return;
                const rec = priceHistory.find((h) => h.manualId === man.id);
                if (rec && rec.qty != null) branches.push({ sigla: s, qty: rec.qty, manual: man, agotado: false });
                else if (everIn(s)) branches.push({ sigla: s, qty: null, manual: man, agotado: true });
              });
              if (!branches.length) return null;
              return (
                <div style={{ marginTop: 11, paddingTop: 11, borderTop: `1px solid ${P.border}` }}>
                  {branches.map((b, bi) => (
                    <div key={b.sigla + bi} style={{ marginTop: bi === 0 ? 0 : 9 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                        {b.agotado ? (
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14.5, fontWeight: 700, color: window.CLARO.alerta, letterSpacing: '0.06em' }}>AGOTADO en <b style={{ letterSpacing: '0.08em' }}>{b.sigla}</b></span>
                        ) : (
                          <React.Fragment>
                            <span style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 19, color: window.CLARO.ok }}>{Number(b.qty).toLocaleString('es-MX')}</span>
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14.5, color: P.text, letterSpacing: '0.06em' }}>disponibles en <b style={{ letterSpacing: '0.08em' }}>{b.sigla}</b></span>
                          </React.Fragment>
                        )}
                      </div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, color: P.textDim, marginTop: 5, lineHeight: 1.55 }}>
                        {b.agotado ? 'No aparece en el último inventario: ' : 'De acuerdo a '}
                        {b.manual && b.manual.url ? (
                          <a href={b.manual.url} target="_blank" rel="noopener" style={{ color: P.amber, textDecoration: 'none', borderBottom: `1px solid ${P.amber}` }}>▦ {b.manual.nombre} ↗</a>
                        ) : (
                          <span style={{ color: P.textMuted }}>{b.manual ? b.manual.nombre : 'inventario oficial ' + b.sigla}</span>
                        )}
                        {b.manual ? (b.agotado ? ' (' + accFmtDate(b.manual.fecha) + ').' : ', publicado el ' + accFmtDate(b.manual.fecha) + '.') : '.'}
                      </div>
                    </div>
                  ))}
                  <div style={window.amxProsa({ fontSize: 13, color: P.textMuted, marginTop: 7, lineHeight: 1.5 })}>
                    ⚠ Dato <b style={{ color: P.textDim }}>histórico</b> por sucursal, no en tiempo real: la disponibilidad actual puede variar.
                  </div>
                </div>
              );
            })()}
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: P.textDim, marginTop: 9,
            }}>Nivel: <window.PriceLevel lvl={acc.priceLvl} size={13} /></div>
          </div>

          {/* HISTORIAL DE PRECIOS */}
          {priceHistory.length > 0 &&
            <React.Fragment>
              <window.SectionHeader>Historial de precios</window.SectionHeader>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: P.textDim,
                letterSpacing: '0.04em', marginTop: -6, marginBottom: 10, lineHeight: 1.4,
              }}>Según inventarios oficiales DCAM / OTCA</div>
              <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, boxShadow: window.CLARO.sombra, marginBottom: 16 }}>
                {priceHistory.slice().reverse().map((h, i) => {
                  const man = manualById(h.manualId);
                  const hAut = window.manualAutoridad ? window.manualAutoridad(man) : null;
                  return (
                    <div key={i} style={{
                      padding: '10px 12px',
                      borderBottom: i < priceHistory.length - 1 ? `1px solid ${P.border}` : 'none',
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 15.5,
                      background: i === 0 ? 'rgba(221,213,196,0.06)' : 'transparent',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <span style={{
                            color: i === 0 ? P.amber : P.textMuted, fontSize: 13, letterSpacing: '0.1em', flexShrink: 0,
                          }}>{i === 0 ? '● ACTUAL' : '○'}</span>
                          <span style={{ color: P.text, fontWeight: i === 0 ? 700 : 500 }}>{h.price}</span>
                          {hAut &&
                            <span title={hAut.nombre} style={{
                              fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700,
                              letterSpacing: '0.1em', color: '#000', background: hAut.color,
                              padding: '1px 6px', flexShrink: 0,
                            }}>{hAut.sigla}</span>}
                        </div>
                        <span style={{ color: P.textDim, fontSize: 14.5, flexShrink: 0 }}>{accFmtDate(h.date) || '—'}</span>
                      </div>
                      {man &&
                        <div style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
                          marginTop: 6, paddingLeft: 22,
                        }}>
                          <span style={{
                            color: P.textMuted, fontSize: 13,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>{man.nombre}</span>
                          {man.url &&
                            <a href={man.url} target="_blank" rel="noopener" style={{
                              color: P.amber, fontSize: 13, textDecoration: 'none',
                              borderBottom: `1px solid ${P.amber}`, flexShrink: 0, whiteSpace: 'nowrap',
                            }}>▦ Ver PDF ↗</a>
                          }
                        </div>
                      }
                    </div>
                  );
                })}
              </div>
            </React.Fragment>
          }

          {/* Estatus legal */}
          {availMeta &&
            <React.Fragment>
              <window.SectionHeader>Estatus Legal</window.SectionHeader>
              <div style={{
                background: P.bgCard, border: `1px solid ${window.amxColorAvail(availMeta.color)}`, boxShadow: window.CLARO.sombra,
                padding: '12px 14px', marginBottom: 16,
              }}>
                <div style={{
                  fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 15,
                  color: window.amxColorAvail(availMeta.color), textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
                }}>{availMeta.label}</div>
                <div style={{ fontFamily: 'Archivo, system-ui, sans-serif', fontSize: 16, color: P.textDim, lineHeight: 1.6 }}>
                  {availMeta.desc}
                </div>
              </div>
            </React.Fragment>
          }
        </div>
      </div>

      {/* Armas compatibles en inventario */}
      {armasComp.length > 0 &&
        <div style={{ marginTop: 6 }}>
          <window.CarouselSection
            title={armasComp.length === 1 ? 'Arma compatible' : `Armas compatibles · ${armasComp.length}`}
            items={armasComp}
            renderItem={(a) => <window.ArmaCard arma={a} onClick={() => onOpenArma && onOpenArma(a.id)} />}
          />
        </div>
      }

      {/* Relacionados */}
      {relacionados.length > 0 &&
        <div style={{ marginTop: 6 }}>
          <window.CarouselSection
            title="Accesorios relacionados"
            items={relacionados}
            renderItem={(a) => <AccesorioCard acc={a} onClick={() => onOpenAccesorio(a.id)} />}
          />
        </div>
      }
    </div>
  );
}
window.AccesorioFicha = AccesorioFicha;

// Armado en México — Pantallas de Producto, Comparador, Legal, FAQ, Acerca

const { useState: useState2, useMemo: useMemo2 } = React;

// ════════════════════════════════════════════════════════════════
// PRODUCT — Ficha completa de un arma
// ════════════════════════════════════════════════════════════════
function ProductScreen({ armaId, onOpenArma, onNav, compareIds, toggleCompare }) {
  const vp = window.useViewport();
  const arma = window.findArma(armaId);
  const [tab, setTab] = useState2('specs');
  const [showSuggest, setShowSuggest] = useState2(false);

  // track de visita una vez por mount
  useEffect(() => {
    if (arma && window.Store) window.Store.trackVisit(arma.id);
  }, [arma?.id]);

  if (!arma) return <div style={{ padding: 40, color: PALETTE.text }}>Arma no encontrada</div>;

  const availMeta = window.CATEGORIES.disponibilidad.find((d) => d.id === arma.avail);
  const inCmp = compareIds.includes(arma.id);
  const containerMax = { maxWidth: 1200, margin: '0 auto', width: '100%' };
  const PAD = vp.isDesktop ? 28 : 16;
  const flag = window.countryFlag(arma.pais);
  const priceHistory = window.Store ? window.Store.getPriceHistory(arma.id) : [];

  // armas relacionadas (mismo tipo)
  const related = window.DB.filter((a) => a.tipo === arma.tipo && a.id !== arma.id).slice(0, 4);

  return (
    <div style={{ paddingBottom: 90 }}>
     <div style={containerMax}>
      {/* HERO IMAGE — original (foto principal del arma) */}
      <div style={{
          position: 'relative',
          height: vp.isDesktop ? 380 : 240,
          background: `radial-gradient(ellipse at 50% 50%, ${PALETTE.bgElev} 0%, ${PALETTE.bg} 100%)`,
          borderBottom: `1px solid ${PALETTE.border}`,
          overflow: 'hidden'
        }}>
        <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `linear-gradient(90deg, ${PALETTE.border}55 1px, transparent 1px), linear-gradient(0deg, ${PALETTE.border}55 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
            maskImage: 'radial-gradient(circle, black 0%, transparent 70%)'
          }} />
        {/* readouts */}
        <div style={{
            position: 'absolute', top: 12, left: 12,
            fontFamily: 'Courier Prime, monospace',
            fontSize: 11, color: PALETTE.amber,
            letterSpacing: '0.18em', textTransform: 'uppercase'
          }}>
          ◢ ID-{String(arma.id).padStart(3, '0')}
        </div>
        <div style={{
            position: 'absolute', top: 12, right: 12
          }}>
          <AvailBadge avail={arma.avail} compact />
        </div>

        <img src={arma.img} alt={arma.nombre} decoding="async" fetchpriority="high" style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            maxWidth: '85%', maxHeight: '75%',
            filter: 'grayscale(0.1) contrast(1.15) drop-shadow(0 8px 24px rgba(0,0,0,0.6))'
          }} onError={(e) => {e.target.src = window.armaPlaceholder(arma);e.target.onerror = null;}} />

        {/* bottom readouts */}
        <div style={{
            position: 'absolute', bottom: 12, left: 12, right: 12,
            display: 'flex', justifyContent: 'space-between',
            fontFamily: 'Courier Prime, monospace',
            fontSize: 10, color: PALETTE.textMuted,
            letterSpacing: '0.15em'
          }}>
          <span>━━ {arma.longitud}</span>
          <span>{arma.peso} ●</span>
        </div>
      </div>

      {/* TITLE BLOCK — original */}
      <div style={{ padding: `16px ${PAD}px 12px`, borderBottom: `1px solid ${PALETTE.border}` }}>
        <div style={{
            fontFamily: 'Courier Prime, monospace',
            fontSize: 12, color: PALETTE.amber,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            marginBottom: 4,
            display: 'flex', alignItems: 'center', gap: 8
          }}>
          <CountryFlag pais={arma.pais} height={12} />
          <span>{arma.marca} · {arma.pais} · {arma.anio}</span>
        </div>
        <div style={{
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 700, fontSize: 26,
            color: PALETTE.text,
            textTransform: 'uppercase',
            lineHeight: 1.05, letterSpacing: '0.02em',
            marginBottom: 8
          }}>{arma.nombre}</div>
        <div style={{
            fontFamily: 'Courier Prime, monospace',
            fontSize: 13, color: PALETTE.textDim,
            marginBottom: 12
          }}>{arma.mecanismo}</div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => toggleCompare(arma.id)} style={{
              flex: 1,
              background: inCmp ? PALETTE.amber : 'transparent',
              color: inCmp ? '#000' : PALETTE.amber,
              border: `1.5px solid ${PALETTE.amber}`,
              padding: '10px',
              fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 14,
              letterSpacing: '0.15em', textTransform: 'uppercase',
              cursor: 'pointer'
            }}>{inCmp ? '✓ AÑADIDA' : '⇄ Comparar'}</button>
          <button onClick={() => onNav('catalog', { mode: 'tipo', value: arma.tipo })} style={{
              flex: 1,
              background: PALETTE.bgCard,
              color: PALETTE.text,
              border: `1.5px solid ${PALETTE.border}`,
              padding: '10px',
              fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 14,
              letterSpacing: '0.15em', textTransform: 'uppercase',
              cursor: 'pointer'
            }}>+ Similares</button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
             GUNSMITH PANEL — ficha HUD táctica rediseñada
             ─ Header: nombre + pestañas tipo/marca + nivel de uso
             ─ Centro: imagen grande del arma + tarjetas flotantes
             ─ Stats panel + leyenda
             (Diseño original; estética táctica, no afiliada a marca alguna)
             ═══════════════════════════════════════════════════════════ */}
      {(() => {
          const ORANGE = window.GUN_ACCENT || '#F5C518';
          const ORANGE_DEEP = window.GUN_ACCENT_DEEP || '#D4A910';
          const NIVEL = { dcam: 'Civil', seguridad: 'Policial', ejercito: 'Militar' };
          const nivel = NIVEL[arma.avail] || 'Civil';
          const statsKeys = [
          { k: 'precision', l: 'Precisión' },
          { k: 'poder', l: 'Daño' },
          { k: 'alcance', l: 'Alcance' },
          { k: 'manejo', l: 'Movilidad' },
          { k: 'capacidad', l: 'Capacidad' },
          { k: 'retroceso', l: 'Retroceso', invert: true }];


          // Tarjeta flotante (estilo HUD táctico) — mobile-first sizing
          const FloatCard = ({ icon, fallbackIcon, label, value, connectorSide = 'bottom' }) =>
          <div style={{
            position: 'relative',
            background: 'rgba(44,44,44,0.85)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            border: `1px solid rgba(255,255,255,0.08)`,
            boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
            padding: vp.isDesktop ? '10px 14px 10px 10px' : '7px 10px 7px 7px',
            display: 'flex', alignItems: 'center',
            gap: vp.isDesktop ? 10 : 7,
            minWidth: vp.isDesktop ? 168 : 102,
            maxWidth: vp.isDesktop ? 220 : 132
          }}>
            {/* dot naranja arriba-derecha */}
            <span style={{
              position: 'absolute', top: 7, right: 8,
              width: 6, height: 6, borderRadius: 6,
              background: ORANGE,
              boxShadow: `0 0 8px ${ORANGE}cc, 0 0 0 1px rgba(0,0,0,0.4)`
            }} />
            {/* icono */}
            <div style={{
              width: vp.isDesktop ? 30 : 22,
              height: vp.isDesktop ? 30 : 22,
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              {icon ?
              <img src={icon} alt={label} style={{ maxWidth: vp.isDesktop ? 22 : 16, maxHeight: vp.isDesktop ? 22 : 16, objectFit: 'contain' }}
              onError={(e) => {e.target.style.display = 'none';if (e.target.nextSibling) e.target.nextSibling.style.display = 'block';}} /> :
              null}
              <span style={{
                display: icon ? 'none' : 'block',
                fontFamily: 'Courier Prime, monospace',
                fontSize: vp.isDesktop ? 15 : 12, fontWeight: 700, color: ORANGE
              }}>{fallbackIcon || '◆'}</span>
            </div>
            {/* texto */}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontFamily: 'Courier Prime, monospace',
                fontSize: vp.isDesktop ? 10.5 : 9.5, color: '#A3A3A3',
                textTransform: 'uppercase', letterSpacing: '0.16em',
                marginBottom: 1
              }}>{label}</div>
              <div style={{
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: 600, fontSize: vp.isDesktop ? 15 : 12.5,
                color: '#FFFFFF',
                letterSpacing: '0.03em',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                lineHeight: 1.1
              }}>{value}</div>
            </div>
            {/* línea conectora — apunta hacia el arma */}
            {connectorSide === 'bottom' &&
            <span style={{
              position: 'absolute', left: '50%', bottom: -22,
              width: 1, height: 18,
              background: `linear-gradient(180deg, ${ORANGE}99, transparent)`,
              transform: 'translateX(-50%)'
            }}><span style={{
                position: 'absolute', left: '50%', bottom: -3,
                width: 5, height: 5, borderRadius: 5,
                background: ORANGE,
                boxShadow: `0 0 4px ${ORANGE}`,
                transform: 'translateX(-50%)'
              }} /></span>
            }
            {connectorSide === 'top' &&
            <span style={{
              position: 'absolute', left: '50%', top: -22,
              width: 1, height: 18,
              background: `linear-gradient(0deg, ${ORANGE}99, transparent)`,
              transform: 'translateX(-50%)'
            }}><span style={{
                position: 'absolute', left: '50%', top: -3,
                width: 5, height: 5, borderRadius: 5,
                background: ORANGE,
                boxShadow: `0 0 4px ${ORANGE}`,
                transform: 'translateX(-50%)'
              }} /></span>
            }
          </div>;


          return (
            <div className="gunsmith" style={{
              position: 'relative',
              padding: vp.isDesktop ? `28px ${PAD}px 24px` : `20px ${PAD}px 18px`,
              background: `radial-gradient(ellipse 75% 55% at 50% 48%, ${PALETTE.bgElev} 0%, ${PALETTE.bg} 80%)`,
              borderBottom: `1px solid ${PALETTE.border}`,
              overflow: 'hidden'
            }}>
            {/* topograph overlay */}
            <div aria-hidden style={{
                position: 'absolute', inset: 0,
                backgroundImage: `linear-gradient(90deg, ${PALETTE.border}22 1px, transparent 1px), linear-gradient(0deg, ${PALETTE.border}22 1px, transparent 1px)`,
                backgroundSize: '64px 64px',
                maskImage: 'radial-gradient(ellipse at center, black 0%, transparent 85%)',
                WebkitMaskImage: 'radial-gradient(ellipse at center, black 0%, transparent 85%)',
                pointerEvents: 'none'
              }} />

            {/* ── HEADER ───────────────────────────────────────────── */}
            <div style={{
                position: 'relative', zIndex: 3,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 16,
                marginBottom: vp.isDesktop ? 24 : 18,
                flexWrap: 'wrap'
              }}>
              {/* LEFT — título + pestañas */}
              <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                <div style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontWeight: 700,
                    fontSize: vp.isDesktop ? 38 : 25,
                    color: '#FFFFFF',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    lineHeight: 0.95,
                    marginBottom: 14
                  }}>{arma.nombre}</div>

                {/* TABS */}
                <div style={{
                    display: 'flex',
                    gap: vp.isDesktop ? 28 : 16,
                    fontFamily: 'Courier Prime, monospace',
                    fontSize: vp.isDesktop ? 13 : 12,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    flexWrap: 'wrap',
                    alignItems: 'flex-end'
                  }}>
                  {/* TAB ACTIVA — tipo de arma */}
                  <div style={{
                      color: '#FFFFFF',
                      fontWeight: 600,
                      paddingBottom: 6,
                      borderBottom: `2px solid ${ORANGE}`
                    }}>{arma.tipo}</div>
                  {/* TAB inactiva — marca + bandera + país */}
                  <div style={{
                      color: '#A3A3A3',
                      paddingBottom: 6,
                      borderBottom: `2px solid transparent`,
                      display: 'inline-flex', alignItems: 'center', gap: 6
                    }}>
                    <span>{arma.marca}</span>
                    <CountryFlag pais={arma.pais} height={10} style={{ marginLeft: 2 }} />
                    <span>{arma.pais}</span>
                  </div>
                </div>
              </div>

              {/* RIGHT — nivel de uso */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{
                    fontFamily: 'Courier Prime, monospace',
                    fontSize: 11, color: '#A3A3A3',
                    letterSpacing: '0.20em', textTransform: 'uppercase',
                    marginBottom: 4
                  }}>Nivel de uso</div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
                  <span style={{
                      width: 6, height: 6, borderRadius: 6,
                      background: ORANGE,
                      boxShadow: `0 0 8px ${ORANGE}`
                    }} />
                  <div style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontWeight: 700, fontSize: vp.isDesktop ? 23 : 17,
                      color: ORANGE,
                      textTransform: 'uppercase', letterSpacing: '0.10em',
                      lineHeight: 1
                    }}>{nivel}</div>
                </div>
                <div style={{
                    fontFamily: 'Courier Prime, monospace',
                    fontSize: 11, color: '#A3A3A3',
                    marginTop: 4, letterSpacing: '0.08em'
                  }}>{arma.availLabel}</div>
              </div>
            </div>

            {/* ── ÁREA CENTRAL: imagen + tarjetas flotantes ─────────
                Layout unificado mobile-first. La app es móvil; escritorio
                solo aumenta tamaños. */}
            {true ?
              <div style={{
                position: 'relative',
                height: vp.isDesktop ? 420 : 300,
                margin: '0 auto',
                maxWidth: 1100,
                zIndex: 2
              }}>
                {/* TARJETAS ARRIBA (3) — connector vía SVG overlay (sin conector propio) */}
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0,
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: vp.isDesktop ? 16 : 4,
                  paddingLeft: vp.isDesktop ? 8 : 0,
                  paddingRight: vp.isDesktop ? 8 : 0,
                  zIndex: 3
                }}>
                  <FloatCard fallbackIcon="●" label="Calibre" value={arma.calibre} connectorSide="none" />
                  <FloatCard fallbackIcon="━" label="Longitud" value={arma.longitud} connectorSide="none" />
                  <FloatCard fallbackIcon="⚙" label="Mecanismo" value={arma.mecanismo} connectorSide="none" />
                </div>

                {/* ── SVG CONNECTOR OVERLAY ──────────────────────────
                       Solo las líneas indicadas: 4 conectores simples
                       + 1 regla horizontal para Longitud. Sin extras. */}
                <svg viewBox="0 0 100 100" preserveAspectRatio="none"
                     style={{
                       position: 'absolute', inset: 0,
                       width: '100%', height: '100%',
                       pointerEvents: 'none', zIndex: 1,
                       overflow: 'visible'
                     }}>
                  {/* CALIBRE — curva down-right hacia donde irá la imagen del cartucho */}
                  <path d="M 9 13 C 9 35, 12 55, 18 70"
                        stroke={ORANGE} strokeWidth="1.25" fill="none"
                        strokeLinecap="round" opacity="0.85"
                        vectorEffect="non-scaling-stroke" />

                  {/* LONGITUD — regla: drop vertical + línea horizontal que mide el arma */}
                  <path d="M 50 13 L 50 78"
                        stroke={ORANGE} strokeWidth="1.25" fill="none"
                        strokeLinecap="round" opacity="0.85"
                        vectorEffect="non-scaling-stroke" />
                  <line x1="20" y1="78" x2="80" y2="78"
                        stroke={ORANGE} strokeWidth="1.25"
                        strokeLinecap="round" opacity="0.85"
                        vectorEffect="non-scaling-stroke" />
                  <line x1="20" y1="75" x2="20" y2="81"
                        stroke={ORANGE} strokeWidth="1.5"
                        opacity="0.9" vectorEffect="non-scaling-stroke" />
                  <line x1="80" y1="75" x2="80" y2="81"
                        stroke={ORANGE} strokeWidth="1.5"
                        opacity="0.9" vectorEffect="non-scaling-stroke" />

                  {/* MECANISMO — curva down-left hacia el cuerpo del arma */}
                  <path d="M 91 13 C 91 28, 86 42, 76 42"
                        stroke={ORANGE} strokeWidth="1.25" fill="none"
                        strokeLinecap="round" opacity="0.85"
                        vectorEffect="non-scaling-stroke" />

                  {/* PESO — curva up-right hacia el cuerpo del arma */}
                  <path d="M 28 87 C 28 75, 33 62, 42 62"
                        stroke={ORANGE} strokeWidth="1.25" fill="none"
                        strokeLinecap="round" opacity="0.85"
                        vectorEffect="non-scaling-stroke" />

                  {/* CAPACIDAD — curva up-left hacia el cargador del arma */}
                  <path d="M 72 87 C 72 75, 68 62, 60 62"
                        stroke={ORANGE} strokeWidth="1.25" fill="none"
                        strokeLinecap="round" opacity="0.85"
                        vectorEffect="non-scaling-stroke" />
                </svg>

                {/* IMAGEN DEL ARMA — centrada horizontal */}
                <div style={{
                  position: 'absolute',
                  top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '92%',
                  maxWidth: 820,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {/* underglow sutil */}
                  <div aria-hidden style={{
                    position: 'absolute', inset: 0,
                    background: `radial-gradient(ellipse 60% 40% at 50% 60%, ${ORANGE}18 0%, transparent 70%)`,
                    pointerEvents: 'none'
                  }} />
                  {arma.img ?
                  <img src={arma.img} alt={arma.nombre} loading="lazy" decoding="async" style={{
                    maxWidth: '100%', maxHeight: vp.isDesktop ? 240 : 150,
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 18px 30px rgba(0,0,0,0.7))',
                    position: 'relative', zIndex: 1
                  }} onError={(e) => {e.target.src = window.armaPlaceholder(arma);e.target.onerror = null;}} /> :

                  <div style={{
                    border: `1.5px dashed ${PALETTE.border}`,
                    padding: vp.isDesktop ? '40px 80px' : '24px 40px',
                    fontFamily: 'Courier Prime, monospace',
                    fontSize: vp.isDesktop ? 13 : 11, color: '#A3A3A3',
                    letterSpacing: '0.18em', textTransform: 'uppercase',
                    textAlign: 'center'
                  }}>
                      <div style={{ color: ORANGE }}>[ ▢ PNG SIN FONDO ]</div>
                      <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>{arma.nombre}</div>
                    </div>
                  }
                </div>

                {/* TARJETAS ABAJO (2) — connector vía SVG overlay */}
                <div style={{
                  position: 'absolute',
                  bottom: 0, left: 0, right: 0,
                  display: 'flex',
                  justifyContent: 'space-around',
                  gap: vp.isDesktop ? 16 : 8,
                  paddingLeft: vp.isDesktop ? 60 : 14,
                  paddingRight: vp.isDesktop ? 60 : 14,
                  zIndex: 3
                }}>
                  <FloatCard fallbackIcon="◆" label="Peso" value={arma.peso} connectorSide="none" />
                  <FloatCard fallbackIcon="▦" label="Capacidad" value={arma.capacidad} connectorSide="none" />
                </div>
              </div> : null
              }

            {/* ── STATS PANEL — abajo-izquierda ───────────────────── */}
            <div style={{
                position: 'relative', zIndex: 3,
                marginTop: vp.isDesktop ? 20 : 18,
                display: vp.isDesktop ? 'grid' : 'block',
                gridTemplateColumns: vp.isDesktop ? 'minmax(0, 360px) 1fr' : '1fr',
                gap: vp.isDesktop ? 24 : 0,
                alignItems: 'start'
              }}>
              <div style={{
                  background: 'rgba(44,44,44,0.7)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  padding: '14px 16px 12px'
                }}>
                <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12
                  }}>
                  <div style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontWeight: 700, fontSize: 15,
                      color: '#FFFFFF',
                      textTransform: 'uppercase', letterSpacing: '0.18em'
                    }}>ESTADISTICAS</div>
                  <span style={{
                      fontFamily: 'Courier Prime, monospace',
                      fontSize: 10, color: '#A3A3A3',
                      letterSpacing: '0.16em', textTransform: 'uppercase'
                    }}>Est. divulgativa</span>
                </div>
                {statsKeys.map((s) => {
                    const raw = arma.stats[s.k] || 0;
                    const v = s.invert ? 100 - raw : raw;
                    return (
                      <div key={s.k} style={{
                        display: 'grid',
                        gridTemplateColumns: '88px 1fr',
                        alignItems: 'center',
                        gap: 12,
                        marginBottom: 9
                      }}>
                      <span style={{
                          fontFamily: 'Courier Prime, monospace',
                          fontSize: 12, color: '#A3A3A3',
                          textTransform: 'uppercase', letterSpacing: '0.10em'
                        }}>{s.l}</span>
                      <div style={{
                          position: 'relative',
                          height: 3,
                          background: 'rgba(255,255,255,0.06)',
                          overflow: 'hidden'
                        }}>
                        <div style={{
                            position: 'absolute', top: 0, bottom: 0, left: 0,
                            width: `${Math.max(2, Math.min(100, v))}%`,
                            background: `linear-gradient(90deg, ${ORANGE_DEEP}, ${ORANGE})`,
                            boxShadow: `0 0 6px ${ORANGE}66`
                          }} />
                      </div>
                    </div>);

                  })}
              </div>

              {/* disclaimer */}
              <div style={{
                  padding: '10px 12px',
                  fontFamily: 'Courier Prime, monospace',
                  fontSize: 11, color: '#A3A3A3', lineHeight: 1.55,
                  borderLeft: `2px solid ${ORANGE}`,
                  background: 'rgba(44,44,44,0.4)',
                  marginTop: vp.isDesktop ? 0 : 10,
                  alignSelf: 'start'
                }}>
                Las estadísticas mostradas son estimaciones cualitativas derivadas de las especificaciones técnicas. Se proveen con fines divulgativos y de comparación entre modelos.
              </div>
            </div>
          </div>);

        })()}

      {/* TABS */}
      <div style={{
          display: 'flex',
          borderBottom: `1px solid ${PALETTE.border}`,
          background: PALETTE.bgElev
        }}>
        {[
          { id: 'specs', label: 'Specs' },
          { id: 'legal', label: 'Legal' },
          { id: 'history', label: 'Historia' }].
          map((t) =>
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, background: 'none', border: 'none',
            padding: '12px 8px',
            borderBottom: tab === t.id ? `2px solid ${PALETTE.amber}` : '2px solid transparent',
            cursor: 'pointer',
            fontFamily: 'Montserrat, sans-serif',
            fontSize: 13, fontWeight: 600,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: tab === t.id ? PALETTE.amber : PALETTE.textDim
          }}>{t.label}</button>
          )}
      </div>

      {/* TAB CONTENT */}
      <div style={{ padding: vp.isDesktop ? `20px ${PAD}px` : '16px', maxWidth: 1000, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {tab === 'specs' &&
          <div>
            <SectionHeader>Especificaciones Técnicas</SectionHeader>
            <div style={{
              background: PALETTE.bgCard,
              border: `1px solid ${PALETTE.border}`,
              marginBottom: 16
            }}>
              <TacticalCorners size={10} color={PALETTE.amber} />
              <SpecRow label="Calibre" value={arma.calibre} accent={PALETTE.amber} />
              <SpecRow label="Capacidad" value={arma.capacidad} />
              <SpecRow label="Peso" value={arma.peso} />
              <SpecRow label="Longitud" value={arma.longitud} />
              <SpecRow label="Mecanismo" value={arma.mecanismo} />
              <SpecRow label="Origen" value={arma.pais} />
              <SpecRow label="Año intro." value={arma.anio} />
              <SpecRow label="Tipo" value={arma.tipo.toUpperCase()} />
            </div>

            <SectionHeader>Precio Referencia DCAM</SectionHeader>
            <div style={{
              background: PALETTE.bgCard,
              border: `1px solid ${PALETTE.amber}`,
              padding: '14px 14px',
              marginBottom: 16,
              position: 'relative'
            }}>
              <TacticalCorners size={12} color={PALETTE.amber} thickness={2} />
              <div style={{
                fontFamily: 'Courier Prime, monospace',
                fontSize: 11, color: PALETTE.textMuted,
                letterSpacing: '0.18em', textTransform: 'uppercase',
                marginBottom: 4
              }}>◆ Precio Actual (con IVA)</div>
              <div style={{
                fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
                fontSize: 23, color: PALETTE.amber,
                letterSpacing: '0.02em'
              }}>{arma.priceExact}</div>
              <div style={{
                fontFamily: 'Courier Prime, monospace',
                fontSize: 11, color: PALETTE.textMuted,
                marginTop: 4, lineHeight: 1.4
              }}>Ref. DCAM: {arma.dcamRef}</div>
              <div style={{
                fontFamily: 'Courier Prime, monospace',
                fontSize: 11, color: PALETTE.textDim,
                marginTop: 6
              }}>Nivel: <window.PriceLevel lvl={arma.priceLvl} size={13} /></div>
            </div>

            {/* CALIFICACIÓN DE USUARIOS */}
            <RatingBlock armaId={arma.id} />

            {/* HISTORIAL DE PRECIOS */}
            {priceHistory.length > 0 &&
            <React.Fragment>
                <SectionHeader>Historial de precios</SectionHeader>
                <div style={{
                background: PALETTE.bgCard,
                border: `1px solid ${PALETTE.border}`,
                marginBottom: 16
              }}>
                  {priceHistory.slice().reverse().map((h, i) => {
                  const d = new Date(h.date);
                  return (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between',
                      padding: '9px 12px',
                      borderBottom: i < priceHistory.length - 1 ? `1px solid ${PALETTE.border}` : 'none',
                      fontFamily: 'Courier Prime, monospace',
                      fontSize: 13,
                      background: i === 0 ? 'rgba(245,197,24,0.06)' : 'transparent'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{
                          color: i === 0 ? PALETTE.amber : PALETTE.textMuted,
                          fontSize: 11, letterSpacing: '0.1em'
                        }}>{i === 0 ? '● ACTUAL' : '○'}</span>
                          <span style={{ color: PALETTE.text, fontWeight: i === 0 ? 700 : 500 }}>{h.price}</span>
                          {h.note && <span style={{ color: PALETTE.textMuted, fontSize: 11 }}>· {h.note}</span>}
                        </div>
                        <span style={{ color: PALETTE.textDim, fontSize: 12 }}>
                          {d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>);

                })}
                </div>
              </React.Fragment>
            }

            <SectionHeader>Usos Recomendados</SectionHeader>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              {arma.uses.map((u) => {
                const meta = window.CATEGORIES.uso.find((x) => x.id === u);
                return (
                  <span key={u} style={{
                    background: PALETTE.bgCard,
                    border: `1px solid ${PALETTE.border}`,
                    borderLeft: `2px solid ${PALETTE.amber}`,
                    padding: '6px 10px',
                    fontFamily: 'Courier Prime, monospace',
                    fontSize: 12, color: PALETTE.text,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    display: 'inline-flex', alignItems: 'center', gap: 6
                  }}>
                    <span style={{ color: PALETTE.amber }}>{meta?.icon || '●'}</span>
                    {meta?.label || u}
                  </span>);

              })}
            </div>
          </div>
          }

        {tab === 'legal' &&
          <div>
            <SectionHeader>Estatus Legal en México</SectionHeader>
            <div style={{
              background: PALETTE.bgCard,
              border: `1px solid ${availMeta?.color || PALETTE.border}`,
              borderLeft: `4px solid ${availMeta?.color || PALETTE.border}`,
              padding: '14px 14px',
              marginBottom: 12
            }}>
              <div style={{
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: 700, fontSize: 16,
                color: availMeta?.color || PALETTE.text,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                marginBottom: 6
              }}>{arma.legalTit}</div>
              <div style={{
                fontFamily: 'Courier Prime, monospace',
                fontSize: 13, color: PALETTE.textDim,
                lineHeight: 1.55
              }}>{arma.legalDesc}</div>
            </div>

            <SectionHeader>Disponibilidad</SectionHeader>
            <div style={{
              background: PALETTE.bgCard,
              border: `1px solid ${PALETTE.border}`,
              padding: '10px 12px',
              marginBottom: 16
            }}>
              {arma.disponibilidad.map((d, i) =>
              <div key={i} style={{
                fontFamily: 'Courier Prime, monospace',
                fontSize: 12, color: PALETTE.text,
                padding: '5px 0',
                borderBottom: i < arma.disponibilidad.length - 1 ? `1px solid ${PALETTE.border}` : 'none',
                display: 'flex', alignItems: 'center', gap: 8
              }}>
                  <span style={{ color: PALETTE.amber }}>▸</span>
                  {d}
                </div>
              )}
            </div>

            <button onClick={() => onNav('legal')} style={{
              width: '100%',
              background: 'transparent',
              border: `1.5px dashed ${PALETTE.border}`,
              color: PALETTE.amber,
              padding: '12px',
              fontFamily: 'Montserrat, sans-serif',
              fontSize: 14, fontWeight: 600,
              letterSpacing: '0.15em', textTransform: 'uppercase',
              cursor: 'pointer'
            }}>§ Guía Legal Completa →</button>
          </div>
          }

        {tab === 'history' &&
          <div>
            <SectionHeader>Dossier Histórico</SectionHeader>
            <div style={{
              background: PALETTE.bgCard,
              border: `1px solid ${PALETTE.border}`,
              padding: 14,
              position: 'relative'
            }}>
              <TacticalCorners size={10} color={PALETTE.amber} />
              <div style={{
                fontFamily: 'Courier Prime, monospace',
                fontSize: 10, color: PALETTE.amber,
                letterSpacing: '0.2em', textTransform: 'uppercase',
                marginBottom: 8
              }}>━━━ ENTRADA · {arma.anio} ━━━</div>
              <div style={{
                fontFamily: 'Courier Prime, monospace',
                fontSize: 13, color: PALETTE.text,
                lineHeight: 1.7
              }}>{arma.historia}</div>
            </div>
          </div>
          }
      </div>

      {/* SUGERIR CAMBIOS */}
      <div style={{ padding: `0 ${PAD}px 16px`, maxWidth: 1000, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <button onClick={() => setShowSuggest(true)} style={{
            width: '100%',
            background: 'transparent',
            color: PALETTE.amber,
            border: `1.5px dashed ${PALETTE.amber}`,
            padding: '14px',
            fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 15,
            letterSpacing: '0.15em', textTransform: 'uppercase',
            cursor: 'pointer',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
          <span>✎ ¿Encontraste un error? Sugerir cambios</span>
          <span>→</span>
        </button>
      </div>

      {showSuggest &&
        <SuggestChangesModal arma={arma} onClose={() => setShowSuggest(false)} />
        }

      {/* VIDEO YOUTUBE (sólo si hay) */}
      <YouTubeBlock arma={arma} padX={PAD} />

      {/* RELATED */}
      {related.length > 0 &&
        <div style={{ padding: `0 ${PAD}px 16px` }}>
          <SectionHeader>Misma Categoría</SectionHeader>
          <div className="amx-hscroll" style={{
            display: vp.isDesktop ? 'grid' : 'flex',
            gridTemplateColumns: vp.isDesktop ? 'repeat(4, 1fr)' : undefined,
            gap: vp.isDesktop ? 14 : 10,
            overflowX: vp.isDesktop ? 'visible' : 'auto',
            paddingBottom: 4,
            margin: vp.isDesktop ? 0 : `0 -${PAD}px`,
            padding: vp.isDesktop ? 0 : `0 ${PAD}px 4px`
          }}>
            {related.map((a) =>
            <div key={a.id} style={{ width: vp.isDesktop ? 'auto' : 300, flexShrink: 0 }}>
                <ArmaCard arma={a}
              onClick={() => onOpenArma(a.id)}
              onCompare={() => toggleCompare(a.id)}
              inCompare={compareIds.includes(a.id)} />
              
              </div>
            )}
          </div>
        </div>
        }
     </div>
    </div>);

}
window.ProductScreen = ProductScreen;

// ════════════════════════════════════════════════════════════════
// RATING BLOCK — bloque visual para calificar un arma (1-5★)
// ════════════════════════════════════════════════════════════════
function RatingBlock({ armaId }) {
  const [, force] = useState2(0);
  useEffect(() => window.Store && window.Store.onChange(() => force((x) => x + 1)), []);
  const rating = window.Store ? window.Store.getRating(armaId) : { avg: 0, count: 0 };
  const userR = window.Store ? window.Store.getUserRating(armaId) : 0;
  const [thanks, setThanks] = useState2(false);

  const onRate = (n) => {
    window.Store && window.Store.addRating(armaId, n);
    setThanks(true);
    setTimeout(() => setThanks(false), 1800);
  };

  return (
    <React.Fragment>
      <SectionHeader>Calificación de usuarios</SectionHeader>
      <div style={{
        background: PALETTE.bgCard,
        border: `1px solid ${PALETTE.border}`,
        borderLeft: `3px solid ${PALETTE.amber}`,
        padding: '14px 16px',
        marginBottom: 16,
        display: 'flex', flexDirection: 'column', gap: 10
      }}>
        {/* Promedio destacado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 700, fontSize: 36,
            color: rating.count ? PALETTE.amber : PALETTE.textMuted,
            lineHeight: 1,
            minWidth: 60
          }}>
            {rating.count ? rating.avg.toFixed(1) : '—'}
            <span style={{ fontSize: 16, color: PALETTE.textMuted }}>/5</span>
          </div>
          <div style={{ flex: 1 }}>
            <window.StarRating value={rating.avg} count={rating.count} size="sm" showCount={false} />
            <div style={{
              fontFamily: 'Courier Prime, monospace',
              fontSize: 12, color: PALETTE.textDim,
              letterSpacing: '0.06em', marginTop: 4
            }}>
              {rating.count === 0 ?
              'Sé el primero en calificar' :
              `${rating.count} ${rating.count === 1 ? 'calificación' : 'calificaciones'}`}
            </div>
          </div>
        </div>

        {/* Acción del usuario */}
        <div style={{
          paddingTop: 10,
          borderTop: `1px dashed ${PALETTE.border}`
        }}>
          <div style={{
            fontFamily: 'Courier Prime, monospace',
            fontSize: 12, color: PALETTE.textDim,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            marginBottom: 8
          }}>{userR ? 'Tu calificación' : 'Califica este modelo'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <window.StarRating value={userR} count={0} interactive
            onRate={onRate} size="lg" showCount={false} />
            {thanks &&
            <span style={{
              fontFamily: 'Courier Prime, monospace',
              fontSize: 13, color: PALETTE.amber,
              letterSpacing: '0.08em', fontWeight: 700,
              animation: 'slideUp 0.25s'
            }}>✓ ¡Gracias!</span>
            }
          </div>
        </div>
      </div>
    </React.Fragment>);

}
window.RatingBlock = RatingBlock;

// ════════════════════════════════════════════════════════════════
// YOUTUBE BLOCK — embed de video de Armas M&S (si existe)
// ════════════════════════════════════════════════════════════════
function YouTubeBlock({ arma, padX = 16 }) {
  const [loaded, setLoaded] = useState2(false);
  const vid = window.youtubeId(arma.youtube);
  if (!vid) return null; // si no hay video, no se renderiza nada

  const thumb = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
  const embed = `https://www.youtube-nocookie.com/embed/${vid}?rel=0&autoplay=1&modestbranding=1`;

  return (
    <div style={{ padding: `0 ${padX}px 16px` }}>
      <SectionHeader action={
      <a href={`https://youtube.com/watch?v=${vid}`} target="_blank" rel="noopener noreferrer"
      style={{
        fontFamily: 'Courier Prime, monospace',
        fontSize: 11, color: PALETTE.textMuted,
        letterSpacing: '0.1em', textDecoration: 'none'
      }}>
          @ArmasMS ↗
        </a>
      }>Video Review · YouTube</SectionHeader>

      <div style={{
        position: 'relative',
        background: '#000',
        border: `1px solid ${PALETTE.border}`,
        aspectRatio: '16/9',
        overflow: 'hidden',
        cursor: loaded ? 'default' : 'pointer'
      }} onClick={() => !loaded && setLoaded(true)}>
        {loaded ?
        <iframe
          src={embed}
          title={'Video: ' + arma.nombre}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} /> :


        <React.Fragment>
            <img src={thumb} alt={arma.nombre}
          loading="lazy"
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover',
            filter: 'brightness(0.7)'
          }}
          onError={(e) => {
            // fallback: thumbnail "0" if hqdefault not available
            if (!e.target.dataset.fb) {
              e.target.dataset.fb = '1';
              e.target.src = `https://i.ytimg.com/vi/${vid}/0.jpg`;
            } else {
              e.target.style.display = 'none';
            }
          }} />
          
            {/* play button overlay */}
            <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none'
          }}>
              <div style={{
              width: 70, height: 50,
              background: 'rgba(192,57,43,0.92)',
              borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
              transition: 'transform 0.18s'
            }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
            {/* canal info bottom-left */}
            <div style={{
            position: 'absolute', bottom: 10, left: 12,
            fontFamily: 'Courier Prime, monospace',
            fontSize: 13, color: '#fff',
            letterSpacing: '0.08em',
            textShadow: '0 2px 6px rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', gap: 6
          }}>
              <span style={{
              background: PALETTE.amber, color: '#000',
              padding: '2px 6px', fontWeight: 700, fontSize: 11,
              letterSpacing: '0.1em'
            }}>YOUTUBE</span>
              @ArmasMS
            </div>
            <div style={{
            position: 'absolute', top: 10, right: 12,
            fontFamily: 'Courier Prime, monospace',
            fontSize: 11, color: '#fff', opacity: 0.85,
            letterSpacing: '0.12em',
            background: 'rgba(0,0,0,0.5)',
            padding: '3px 7px'
          }}>▶ TOCA PARA REPRODUCIR</div>
          </React.Fragment>
        }
      </div>
    </div>);

}
window.YouTubeBlock = YouTubeBlock;

// ════════════════════════════════════════════════════════════════
// SUGGEST CHANGES — modal para sugerir cambios a una ficha
// ════════════════════════════════════════════════════════════════
function SuggestChangesModal({ arma, onClose }) {
  const [f, setF] = useState2({ name: '', email: '', field: 'precio', current: '', suggested: '', source: '', notes: '' });
  const [sent, setSent] = useState2(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (!f.name || !f.suggested) {alert('Falta tu nombre y el cambio sugerido.');return;}
    window.Store.addSuggestion({
      armaId: arma.id,
      armaNombre: arma.nombre,
      submitterName: f.name,
      submitterEmail: f.email,
      field: f.field,
      currentValue: f.current,
      suggestedValue: f.suggested,
      source: f.source,
      notes: f.notes
    });
    setSent(true);
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(7,8,10,0.85)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '40px 16px', overflowY: 'auto'
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        maxWidth: 580, width: '100%',
        background: PALETTE.bgCard, border: `1px solid ${PALETTE.amber}`,
        boxShadow: '0 30px 80px rgba(0,0,0,0.6)'
      }}>
        <div style={{
          padding: '14px 18px',
          background: PALETTE.bgElev,
          borderBottom: `2px solid ${PALETTE.amber}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <div style={{ fontFamily: 'Courier Prime, monospace', fontSize: 11, color: PALETTE.amber, letterSpacing: '0.2em' }}>✎ SUGERIR CAMBIO</div>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 17, color: PALETTE.text, textTransform: 'uppercase' }}>{arma.nombre}</div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: `1px solid ${PALETTE.border}`,
            color: PALETTE.textDim, width: 28, height: 28, cursor: 'pointer',
            fontSize: 16, lineHeight: 1
          }}>✕</button>
        </div>

        {sent ?
        <div style={{ padding: 28, textAlign: 'center' }}>
            <div style={{ fontSize: 42, color: PALETTE.amber, lineHeight: 1, marginBottom: 12 }}>✓</div>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 19, color: PALETTE.text, textTransform: 'uppercase', marginBottom: 8 }}>¡Gracias!</div>
            <div style={{ fontFamily: 'Courier Prime, monospace', fontSize: 13, color: PALETTE.textDim, lineHeight: 1.6, marginBottom: 20 }}>Tu sugerencia entró en la cola. El curador revisará la información y, si procede, aplicará el cambio.</div>
            <button onClick={onClose} style={{
            background: PALETTE.amber, color: '#000', border: 'none',
            padding: '10px 20px',
            fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 14,
            letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer'
          }}>Cerrar</button>
          </div> :

        <form onSubmit={submit} style={{ padding: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
              {sfld('Tu nombre', 'name', f, set, { required: true })}
              {sfld('Correo (opcional)', 'email', f, set, { type: 'email' })}
            </div>
            {sfld('Campo a corregir', 'field', f, set, { select: [
            { value: 'precio', label: 'Precio / Historial de precios' },
            { value: 'ficha_tecnica', label: 'Ficha técnica (specs)' },
            { value: 'historia', label: 'Historia / descripción' },
            { value: 'legal', label: 'Información legal' },
            { value: 'imagen', label: 'Imagen' },
            { value: 'stats', label: 'Stats de combate' },
            { value: 'otro', label: 'Otro' }]
          })}
            {sfld('Valor actual (lo que dice ahora)', 'current', f, set, { ta: true, rows: 2 })}
            {sfld('Valor sugerido / corrección', 'suggested', f, set, { ta: true, rows: 3, required: true })}
            {sfld('Fuente / referencia (URL, doc, etc.)', 'source', f, set, { placeholder: 'https://... o "publicación oficial XYZ"' })}
            {sfld('Comentarios adicionales', 'notes', f, set, { ta: true, rows: 2 })}

            <div style={{
            background: PALETTE.bgElev, border: `1px dashed ${PALETTE.border}`,
            padding: 10, marginTop: 8,
            fontFamily: 'Courier Prime, monospace', fontSize: 11, color: PALETTE.textMuted,
            lineHeight: 1.5
          }}>
              <b style={{ color: PALETTE.amber }}>◆ Nota:</b> tu sugerencia va a la cola del curador. No se aplica al instante; se revisa, se valida con la fuente y luego se publica.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button type="button" onClick={onClose} style={{
              background: 'transparent', color: PALETTE.textDim,
              border: `1px solid ${PALETTE.border}`,
              padding: '10px 18px',
              fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 14,
              letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer'
            }}>Cancelar</button>
              <button type="submit" style={{
              background: PALETTE.amber, color: '#000', border: 'none',
              padding: '10px 20px',
              fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 14,
              letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer'
            }}>✓ Enviar sugerencia</button>
            </div>
          </form>
        }
      </div>
    </div>);

}
function sfld(label, k, f, set, p = {}) {
  return (
    <div style={{ marginBottom: 12, gridColumn: p.span === 2 ? '1 / -1' : 'auto' }}>
      <label style={{
        display: 'block',
        fontFamily: 'Courier Prime, monospace',
        fontSize: 11, color: PALETTE.textMuted,
        letterSpacing: '0.15em', textTransform: 'uppercase',
        marginBottom: 4
      }}>{label} {p.required && <span style={{ color: PALETTE.amber }}>*</span>}</label>
      {p.ta ?
      <textarea value={f[k]} onChange={(e) => set(k, e.target.value)}
      rows={p.rows || 3} placeholder={p.placeholder} style={sInpStyle()} /> :
      p.select ?
      <select value={f[k]} onChange={(e) => set(k, e.target.value)} style={sInpStyle()}>
          {p.select.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select> :

      <input type={p.type || 'text'} value={f[k]} onChange={(e) => set(k, e.target.value)}
      placeholder={p.placeholder} style={sInpStyle()} />
      }
    </div>);

}
function sInpStyle() {
  return {
    width: '100%',
    background: PALETTE.bg,
    border: `1px solid ${PALETTE.border}`,
    color: PALETTE.text,
    padding: '8px 10px',
    fontFamily: 'Courier Prime, monospace',
    fontSize: 13, outline: 'none',
    resize: 'vertical', lineHeight: 1.5
  };
}
window.SuggestChangesModal = SuggestChangesModal;

// ════════════════════════════════════════════════════════════════
// COMPARE — Vista lado a lado tipo loadout
// ════════════════════════════════════════════════════════════════
function CompareScreen({ ids, onOpenArma, onNav, removeFromCompare, openPickerForSlot }) {
  const vp = window.useViewport();
  const a = ids[0] ? window.findArma(ids[0]) : null;
  const b = ids[1] ? window.findArma(ids[1]) : null;

  if (!a && !b) {
    return (
      <div style={{
        padding: '60px 24px', textAlign: 'center',
        fontFamily: 'Courier Prime, monospace',
        color: PALETTE.textMuted
      }}>
        <div style={{ fontSize: 48, color: PALETTE.border, marginBottom: 16 }}>⇄</div>
        <div style={{ fontSize: 14, marginBottom: 8, color: PALETTE.text }}>COMPARADOR VACÍO</div>
        <div style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 18 }}>
          Selecciona armas desde el catálogo<br />tocando el botón ⇄ en cada tarjeta.
        </div>
        <button onClick={() => onNav('catalog')} style={{
          background: PALETTE.amber, color: '#000', border: 'none',
          padding: '10px 22px',
          fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 14,
          letterSpacing: '0.15em', textTransform: 'uppercase',
          cursor: 'pointer'
        }}>Ir al Arsenal</button>
      </div>);

  }

  const padX = vp.isDesktop ? 28 : 12;
  return (
    <div style={{ paddingBottom: 90, maxWidth: 1100, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div style={{
        padding: `${vp.isDesktop ? 22 : 14}px ${padX}px 10px`,
        fontFamily: 'Courier Prime, monospace',
        fontSize: 11, color: PALETTE.amber,
        letterSpacing: '0.2em', textTransform: 'uppercase',
        textAlign: 'center'
      }}>━━━ LOADOUT · COMPARATIVA ━━━</div>

      {/* HEADERS LADO A LADO */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: vp.isDesktop ? 16 : 4,
        padding: `0 ${padX}px 12px`
      }}>
        {[a, b].map((x, idx) =>
        <CompareSlot key={idx} arma={x} side={idx === 0 ? 'A' : 'B'}
        onOpen={() => x && onOpenArma(x.id)}
        onRemove={() => x && removeFromCompare(x.id)}
        onPick={() => openPickerForSlot(idx)} />
        )}
      </div>

      {/* STATS SIDE BY SIDE */}
      {a && b &&
      <div style={{ padding: `0 ${padX}px 16px` }}>
          <SectionHeader>Estadísticas</SectionHeader>
          <div style={{
          background: PALETTE.bgCard,
          border: `1px solid ${PALETTE.border}`,
          padding: 12,
          position: 'relative'
        }}>
            <TacticalCorners size={10} color={PALETTE.amber} />
            {[
          { k: 'alcance', l: 'Alcance' },
          { k: 'precision', l: 'Precisión' },
          { k: 'retroceso', l: 'Retroceso' },
          { k: 'capacidad', l: 'Capacidad' },
          { k: 'manejo', l: 'Manejo' },
          { k: 'poder', l: 'Poder' }].
          map((stat) => {
            const va = a.stats[stat.k],vb = b.stats[stat.k];
            const winner = va > vb ? 'a' : vb > va ? 'b' : null;
            return (
              <div key={stat.k} style={{
                display: 'grid', gridTemplateColumns: '1fr 70px 1fr',
                alignItems: 'center', gap: 8, marginBottom: 10
              }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                    fontFamily: 'Courier Prime, monospace',
                    fontSize: 13, color: winner === 'a' ? PALETTE.amber : PALETTE.text,
                    fontWeight: 700
                  }}>{va}</div>
                    <div style={{
                    height: 4, background: PALETTE.bg,
                    border: `1px solid ${PALETTE.border}`,
                    marginTop: 3, position: 'relative'
                  }}>
                      <div style={{
                      position: 'absolute', right: 0, top: 0, bottom: 0,
                      width: `${va}%`,
                      background: winner === 'a' ? PALETTE.amber : PALETTE.textMuted,
                      boxShadow: winner === 'a' ? `0 0 4px ${PALETTE.amber}66` : 'none'
                    }} />
                    </div>
                  </div>
                  <div style={{
                  fontFamily: 'Courier Prime, monospace',
                  fontSize: 11, color: PALETTE.textMuted,
                  textAlign: 'center', letterSpacing: '0.1em',
                  textTransform: 'uppercase'
                }}>{stat.l}</div>
                  <div>
                    <div style={{
                    fontFamily: 'Courier Prime, monospace',
                    fontSize: 13, color: winner === 'b' ? PALETTE.amber : PALETTE.text,
                    fontWeight: 700
                  }}>{vb}</div>
                    <div style={{
                    height: 4, background: PALETTE.bg,
                    border: `1px solid ${PALETTE.border}`,
                    marginTop: 3, position: 'relative'
                  }}>
                      <div style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0,
                      width: `${vb}%`,
                      background: winner === 'b' ? PALETTE.amber : PALETTE.textMuted,
                      boxShadow: winner === 'b' ? `0 0 4px ${PALETTE.amber}66` : 'none'
                    }} />
                    </div>
                  </div>
                </div>);

          })}
          </div>

          {/* SPEC ROWS */}
          <SectionHeader>Ficha técnica</SectionHeader>
          <div style={{
          background: PALETTE.bgCard,
          border: `1px solid ${PALETTE.border}`
        }}>
            {[
          { l: 'Calibre', av: a.calibre, bv: b.calibre },
          { l: 'Capacidad', av: a.capacidad, bv: b.capacidad },
          { l: 'Peso', av: a.peso, bv: b.peso },
          { l: 'Longitud', av: a.longitud, bv: b.longitud },
          { l: 'Origen', av: a.pais, bv: b.pais },
          { l: 'Año', av: a.anio, bv: b.anio },
          { l: 'Mecanismo', av: a.mecanismo, bv: b.mecanismo },
          { l: 'Precio', av: a.priceExact, bv: b.priceExact },
          { l: 'Disponib.', av: a.availLabel, bv: b.availLabel }].
          map((row, i) =>
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '1fr 80px 1fr',
            borderBottom: `1px solid ${PALETTE.border}`,
            padding: '8px 10px', alignItems: 'center', gap: 8,
            fontFamily: 'Courier Prime, monospace',
            fontSize: 12
          }}>
                <div style={{ color: PALETTE.text, textAlign: 'right', lineHeight: 1.3 }}>{row.av}</div>
                <div style={{
              color: PALETTE.textMuted,
              textAlign: 'center', letterSpacing: '0.1em',
              textTransform: 'uppercase', fontSize: 10
            }}>{row.l}</div>
                <div style={{ color: PALETTE.text, lineHeight: 1.3 }}>{row.bv}</div>
              </div>
          )}
          </div>
        </div>
      }
    </div>);

}
function CompareSlot({ arma, side, onOpen, onRemove, onPick }) {
  if (!arma) {
    return (
      <button onClick={onPick} style={{
        height: 230,
        background: 'transparent',
        border: `2px dashed ${PALETTE.border}`,
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 6,
        fontFamily: 'Courier Prime, monospace',
        color: PALETTE.textMuted
      }}>
        <div style={{ fontSize: 32, color: PALETTE.border }}>+</div>
        <div style={{
          fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase'
        }}>SLOT {side}</div>
        <div style={{ fontSize: 11, color: PALETTE.textDim }}>Añadir arma</div>
      </button>);

  }
  return (
    <div style={{
      background: PALETTE.bgCard,
      border: `1px solid ${PALETTE.border}`,
      padding: 10,
      position: 'relative'
    }}>
      <TacticalCorners size={8} color={PALETTE.amber} />
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        marginBottom: 4
      }}>
        <span style={{
          fontFamily: 'Courier Prime, monospace',
          fontSize: 10, color: PALETTE.amber,
          letterSpacing: '0.2em'
        }}>◆ SLOT {side}</span>
        <button onClick={onRemove} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: PALETTE.textMuted, fontSize: 13, padding: 0
        }}>✕</button>
      </div>
      <div style={{
        height: 90,
        background: `radial-gradient(ellipse at 50% 50%, ${PALETTE.bgElev} 0%, ${PALETTE.bg} 100%)`,
        border: `1px solid ${PALETTE.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 8, overflow: 'hidden'
      }}>
        <img src={arma.img} alt={arma.nombre} loading="lazy" decoding="async" style={{
          maxWidth: '90%', maxHeight: '85%',
          filter: 'grayscale(0.15) contrast(1.1)'
        }} onError={(e) => {e.target.src = window.armaPlaceholder(arma);e.target.onerror = null;}} />
      </div>
      <div style={{
        fontFamily: 'Courier Prime, monospace',
        fontSize: 10, color: PALETTE.amber,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        marginBottom: 2
      }}>{arma.marca}</div>
      <div style={{
        fontFamily: 'Montserrat, sans-serif',
        fontSize: 15, fontWeight: 600,
        color: PALETTE.text,
        textTransform: 'uppercase',
        lineHeight: 1.1, marginBottom: 4
      }}>{arma.nombre}</div>
      <div style={{
        fontFamily: 'Courier Prime, monospace',
        fontSize: 11, color: PALETTE.textDim,
        marginBottom: 6
      }}>{arma.calibre.replace(' Parabellum', '').replace('Winchester', 'Win')}</div>
      <AvailBadge avail={arma.avail} compact />
      <button onClick={onOpen} style={{
        marginTop: 8, width: '100%',
        background: 'transparent', border: `1px solid ${PALETTE.border}`,
        color: PALETTE.text,
        padding: '5px',
        fontFamily: 'Courier Prime, monospace',
        fontSize: 11, letterSpacing: '0.1em',
        cursor: 'pointer', textTransform: 'uppercase'
      }}>Ver ficha →</button>
    </div>);

}
window.CompareScreen = CompareScreen;

// ════════════════════════════════════════════════════════════════
// LEGAL — Página de legalidad con WhatsApp asesoría
// ════════════════════════════════════════════════════════════════
function LegalScreen({ onNav }) {
  const vp = window.useViewport();
  const padX = vp.isDesktop ? 28 : 16;
  const page = window.Store ? window.Store.getPages().legal : null;
  const eyebrow = page?.eyebrow || '§ LEGALIDAD · MX';
  const title = page?.title || 'Tenencia legal de armas de fuego';
  const intro = page?.intro || 'Resumen de los requisitos y pasos para la posesión legal en México conforme a la Ley Federal de Armas de Fuego y Explosivos.';
  const requisitos = page?.requisitos || ['INE / IFE vigente', 'CURP impresa', 'RFC (constancia SAT)', 'Comprobante de domicilio (no mayor a 3 meses)', 'Constancia de no antecedentes penales', 'Examen toxicológico (algunos casos)', 'Acta de nacimiento'];
  const pasos = page?.pasos || [
  { t: 'Registro en plataforma SEDENA', d: 'Crear cuenta en el portal oficial de Defensa Nacional y completar perfil con tus datos.' },
  { t: 'Solicitud de licencia', d: 'Pedir Licencia Particular (uso doméstico) o de tiro/cacería según el caso. Pago de derechos.' },
  { t: 'Cita en la DCAM', d: 'Agendar visita al Campo Militar No. 1 (CDMX) o sede Monterrey. Llevar documentación completa.' },
  { t: 'Selección y compra', d: 'Elegir arma del catálogo oficial. La DCAM es el único punto legal de adquisición civil de armas de fuego en México.' },
  { t: 'Registro federal del arma', d: 'Toda arma adquirida queda registrada a tu nombre en el Registro Federal de Armas (RFA).' }];

  const waPhone = page?.whatsapp_phone || '525555555555';
  const waMsg = page?.whatsapp_msg || 'Hola, me interesa asesoría para trámite SEDENA';
  const waPitch = page?.whatsapp_pitch || 'El acompañamiento legal para el trámite SEDENA es prestado por un abogado externo especializado, en lo individual y bajo su propia cédula profesional. Armas M&S no es despacho jurídico y únicamente facilita el contacto con el profesional.';
  const decl = window.ARMADO_DECLARACION || { titulo: 'Declaración de intenciones', parrafos: [] };
  return (
    <div style={{ padding: `0 ${padX}px 90px`, maxWidth: 900, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div style={{
        padding: '20px 0',
        textAlign: 'center',
        borderBottom: `1px solid ${PALETTE.border}`,
        marginBottom: 18
      }}>
        <div style={{
          fontFamily: 'Courier Prime, monospace',
          fontSize: 11, color: PALETTE.amber,
          letterSpacing: '0.2em', marginBottom: 6
        }}>{eyebrow}</div>
        <div style={{
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: 700, fontSize: 23,
          color: PALETTE.text,
          textTransform: 'uppercase',
          letterSpacing: '0.04em', lineHeight: 1.1
        }}>{title}</div>
        <div style={{
          fontFamily: 'Courier Prime, monospace',
          fontSize: 12, color: PALETTE.textDim,
          marginTop: 10, maxWidth: 480, marginInline: 'auto',
          lineHeight: 1.5
        }}>{intro}</div>
      </div>

      {/* DISCLAIMER OFICIAL — visible al principio */}
      <div style={{
        background: 'rgba(168,58,42,0.08)',
        border: `1px solid ${PALETTE.red}`,
        borderLeft: `4px solid ${PALETTE.red}`,
        padding: '14px',
        marginBottom: 22
      }}>
        <div style={{
          fontFamily: 'Courier Prime, monospace',
          fontSize: 11, color: PALETTE.red,
          letterSpacing: '0.2em', textTransform: 'uppercase',
          marginBottom: 6,
          fontWeight: 700
        }}>▲ AVISO DE TRANSPARENCIA</div>
        <div style={{
          fontFamily: 'Courier Prime, monospace',
          fontSize: 13, color: PALETTE.text,
          lineHeight: 1.65
        }}>
          <b>Armado en México y Armas M&amp;S no forman parte de DEFENSA (anteriormente SEDENA), DCAM ni de ninguna dependencia del gobierno mexicano.</b> Las armas de fuego se muestran solo con fines informativos y de transparencia: no las comercializamos, y no gestionamos licencias, permisos ni trámites administrativos de ningún tipo. <b>Armado en México y Armas M&amp;S tampoco prestan servicios jurídicos.</b>
          <br /><br />
          La asesoría legal relativa al proceso SEDENA es prestada de forma independiente por un <span style={{ color: PALETTE.amber, fontWeight: 700 }}>abogado externo especializado</span>, bajo su propia cédula profesional y responsabilidad. Armas M&amp;S no es despacho jurídico ni mantiene relación laboral con dicho profesional, y se limita a facilitar el contacto entre el interesado y el abogado. Honorarios, alcance y términos del servicio se acuerdan directamente con el profesional.
        </div>
      </div>

      {/* CATEGORÍAS LEGALES */}
      <SectionHeader>Las 4 Categorías Legales</SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
        {window.CATEGORIES.disponibilidad.map((d) =>
        <div key={d.id} style={{
          background: PALETTE.bgCard,
          border: `1px solid ${PALETTE.border}`,
          borderLeft: `4px solid ${d.color}`,
          padding: '12px 14px'
        }}>
            <div style={{
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 700, fontSize: 15,
            color: d.color,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            marginBottom: 4
          }}>{d.label}</div>
            <div style={{
            fontFamily: 'Courier Prime, monospace',
            fontSize: 12, color: PALETTE.textDim,
            lineHeight: 1.55
          }}>{d.desc}</div>
          </div>
        )}
        {/* 4ª categoría — Armas traumáticas (sin licencia) */}
        <div style={{
          background: PALETTE.bgCard,
          border: `1px solid ${PALETTE.border}`,
          borderLeft: `4px solid #FFFFFF`,
          padding: '12px 14px'
        }}>
          <div style={{
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 700, fontSize: 15,
            color: '#FFFFFF',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            marginBottom: 4
          }}>Sin Licencia</div>
          <div style={{
            fontFamily: 'Courier Prime, monospace',
            fontSize: 12, color: PALETTE.textDim,
            lineHeight: 1.55
          }}>Armas traumáticas. No letales impulsadas por aire comprimido, menores a 140 Joules de potencia.</div>
        </div>
      </div>

      {/* REQUISITOS */}
      <SectionHeader>Requisitos SEDENA</SectionHeader>
      <div style={{
        background: PALETTE.bgCard,
        border: `1px solid ${PALETTE.border}`,
        padding: '14px',
        marginBottom: 22,
        position: 'relative'
      }}>
        <TacticalCorners size={10} color={PALETTE.amber} />
        {requisitos.map((r, i) =>
        <div key={i} style={{
          fontFamily: 'Courier Prime, monospace',
          fontSize: 13, color: PALETTE.text,
          padding: '7px 0',
          borderBottom: i < requisitos.length - 1 ? `1px solid ${PALETTE.border}` : 'none',
          display: 'flex', alignItems: 'center', gap: 10
        }}>
            <span style={{
            width: 18, height: 18,
            border: `1px solid ${PALETTE.amber}`,
            color: PALETTE.amber,
            fontSize: 11, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>{String(i + 1).padStart(2, '0')}</span>
            <span>{r}</span>
          </div>
        )}
      </div>

      {/* PASOS DCAM */}
      <SectionHeader>Pasos para comprar en DCAM</SectionHeader>
      <div style={{ marginBottom: 22 }}>
        {pasos.map((s, i) =>
        <div key={i} style={{
          display: 'flex', gap: 12,
          padding: '12px 0',
          borderBottom: i < pasos.length - 1 ? `1px solid ${PALETTE.border}` : 'none'
        }}>
            <div style={{
            width: 32, height: 32,
            background: PALETTE.bgElev,
            border: `1.5px solid ${PALETTE.amber}`,
            color: PALETTE.amber,
            fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
            fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            letterSpacing: '0'
          }}>{String(i + 1).padStart(2, '0')}</div>
            <div>
              <div style={{
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 600, fontSize: 15,
              color: PALETTE.text,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 4
            }}>{s.t}</div>
              <div style={{
              fontFamily: 'Courier Prime, monospace',
              fontSize: 12, color: PALETTE.textDim,
              lineHeight: 1.55
            }}>{s.d}</div>
            </div>
          </div>
        )}
      </div>

      {/* ASESORÍA WHATSAPP */}
      <div style={{
        background: `linear-gradient(135deg, ${PALETTE.bgCard} 0%, ${PALETTE.bgElev} 100%)`,
        border: `1.5px solid ${PALETTE.amber}`,
        padding: '16px 14px',
        marginBottom: 16,
        position: 'relative'
      }}>
        <TacticalCorners size={14} color={PALETTE.amber} thickness={2} />
        <div style={{
          fontFamily: 'Courier Prime, monospace',
          fontSize: 11, color: PALETTE.amber,
          letterSpacing: '0.2em', textTransform: 'uppercase',
          marginBottom: 6
        }}>▸ ABOGADO EXTERNO · ASESORÍA INDEPENDIENTE</div>
        <div style={{
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: 700, fontSize: 19,
          color: PALETTE.text,
          textTransform: 'uppercase',
          letterSpacing: '0.04em', lineHeight: 1.1,
          marginBottom: 8
        }}>Acompañamiento legal<br />con abogado especializado</div>
        <div style={{
          fontFamily: 'Courier Prime, monospace',
          fontSize: 12, color: PALETTE.textDim,
          lineHeight: 1.6, marginBottom: 10
        }}>{waPitch}</div>
        <div style={{
          fontFamily: 'Courier Prime, monospace',
          fontSize: 11, color: PALETTE.textMuted,
          lineHeight: 1.55, marginBottom: 14,
          paddingTop: 8,
          borderTop: `1px dashed ${PALETTE.border}`
        }}>
          <b style={{ color: PALETTE.textDim }}>Nota:</b> el servicio jurídico es prestado por un abogado externo bajo su propia cédula profesional. Armas M&amp;S no es despacho jurídico y únicamente facilita el contacto; los honorarios se pactan directamente con el profesional.
        </div>
        <a href={`https://wa.me/${waPhone}?text=${encodeURIComponent(waMsg)}`}
        target="_blank" rel="noopener" style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: PALETTE.amber, color: '#000',
          textDecoration: 'none',
          padding: '12px 16px',
          fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 15,
          letterSpacing: '0.15em', textTransform: 'uppercase'
        }}>
          <span>Contactar al abogado</span>
          <span style={{ fontSize: 17 }}>↗</span>
        </a>
      </div>
    </div>);

}
window.LegalScreen = LegalScreen;

// ════════════════════════════════════════════════════════════════
// ABOUT
// ════════════════════════════════════════════════════════════════
function AboutScreen() {
  const vp = window.useViewport();
  const padX = vp.isDesktop ? 28 : 16;
  const page = window.Store ? window.Store.getPages().about : null;
  const eyebrow = page?.eyebrow || '◆ ACERCA DE';
  const title = page?.title || 'Armado en México';
  const mision = page?.mision || 'Divulgar de forma rigurosa la información técnica, histórica y legal sobre las armas de fuego disponibles para civiles en México.';
  const autor = page?.autor || 'Saulo Flores';
  const empresa = page?.empresa || 'Armas M&S';
  const bio = page?.bio || 'Catálogo curado y mantenido con base en información oficial de DCAM, SEDENA y publicaciones técnicas de los fabricantes.';
  const aviso = page?.aviso || 'Las armas de fuego de este catálogo se muestran únicamente con fines informativos y de transparencia. Las únicas que comercializamos son las tres armas traumáticas menos letales.';
  const decl = window.ARMADO_DECLARACION || { titulo: 'Declaración de intenciones', parrafos: [] };
  return (
    <div style={{ padding: `0 ${padX}px 90px`, maxWidth: 800, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div style={{
        padding: '24px 0',
        textAlign: 'center',
        borderBottom: `1px solid ${PALETTE.border}`,
        marginBottom: 18
      }}>
        {/* LOGO Armado en México */}
        <div style={{
          width: 132, margin: '0 auto 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <img src="imagenes/logo-armado-mx.png" alt="Armado en México" style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 14 }} />
        </div>
        <div style={{
          fontFamily: 'Courier Prime, monospace',
          fontSize: 11, color: PALETTE.amber,
          letterSpacing: '0.2em', marginBottom: 6
        }}>{eyebrow}</div>
        <div style={{
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: 700, fontSize: 26,
          color: PALETTE.text,
          textTransform: 'uppercase',
          letterSpacing: '0.04em', lineHeight: 1.05
        }}>{title}</div>
      </div>

      {/* 1 ▸ DISCLAIMER OFICIAL — NO SOMOS GOBIERNO */}
      <div style={{
        background: 'rgba(168,58,42,0.08)',
        border: `1px solid ${PALETTE.red}`,
        borderLeft: `4px solid ${PALETTE.red}`,
        padding: 14, marginBottom: 18
      }}>
        <div style={{
          fontFamily: 'Courier Prime, monospace',
          fontSize: 11, color: PALETTE.red,
          letterSpacing: '0.2em', textTransform: 'uppercase',
          marginBottom: 6, fontWeight: 700
        }}>▲ NO SOMOS GOBIERNO · FINES INFORMATIVOS</div>
        <div style={{
          fontFamily: 'Courier Prime, monospace',
          fontSize: 13, color: PALETTE.text,
          lineHeight: 1.7
        }}>
          <b>Armado en México y Armas M&amp;S NO forman parte de DEFENSA (anteriormente SEDENA), DCAM ni de ninguna dependencia del gobierno mexicano.</b> Somos un proyecto privado divulgativo. <b>No comercializamos armas de fuego, municiones ni accesorios para ellas: se muestran solo con fines informativos y de transparencia. No tramitamos licencias ni permisos.</b> Lo único que comercializamos son las tres armas traumáticas menos letales. El único servicio adicional que ofrecemos es <span style={{ color: PALETTE.amber, fontWeight: 700 }}>asesoría legal personalizada</span> con un abogado especializado, contratada de forma independiente y con costo.
        </div>
      </div>

      {/* 2 ▸ DECLARACIÓN DE INTENCIONES */}
      <SectionHeader>{decl.titulo}</SectionHeader>
      <div style={{
        background: PALETTE.bgCard, border: `1px solid ${PALETTE.border}`, borderLeft: `4px solid ${PALETTE.amber}`,
        padding: vp.isDesktop ? '20px 22px' : '16px', marginBottom: 18,
      }}>
        {decl.parrafos.map((t, i) => (
          <p key={i} style={{
            margin: i === 0 ? 0 : '14px 0 0', fontFamily: 'Open Sans, sans-serif',
            fontSize: 14.5, color: i === 0 ? PALETTE.text : PALETTE.textDim, lineHeight: 1.7, textWrap: 'pretty',
          }}>{t}</p>
        ))}
        <div style={{
          marginTop: 18, paddingTop: 12, borderTop: `1px dashed ${PALETTE.border}`,
          fontFamily: 'Courier Prime, monospace', fontSize: 11.5, color: PALETTE.textMuted, letterSpacing: '0.04em',
        }}>Armado en México · ¡Protege lo que amas!</div>
      </div>

      {/* 3 ▸ MISIÓN */}
      <SectionHeader>Misión</SectionHeader>
      <div style={{
        background: PALETTE.bgCard,
        border: `1px solid ${PALETTE.border}`,
        padding: 14, marginBottom: 18,
        position: 'relative'
      }}>
        <TacticalCorners size={10} color={PALETTE.amber} />
        <div style={{
          fontFamily: 'Courier Prime, monospace',
          fontSize: 13, color: PALETTE.text,
          lineHeight: 1.7
        }}>{mision}</div>
      </div>

      {/* 4 ▸ DIFERENCIA — ARMADO EN MÉXICO vs ARMAS M&S */}
      <SectionHeader>Armado en México vs. Armas M&amp;S</SectionHeader>
      <div style={{
        display: 'grid', gridTemplateColumns: vp.isDesktop ? '1fr 1fr' : '1fr',
        gap: 12, marginBottom: 18,
      }}>
        <div style={{ background: PALETTE.bgCard, border: `1px solid ${PALETTE.border}`, borderTop: `2px solid ${PALETTE.amber}`, padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <img src="imagenes/logo-armado-mx.png" alt="Armado en México" style={{ width: 36, height: 36, borderRadius: 7, flexShrink: 0, display: 'block' }} />
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 16, color: PALETTE.text, textTransform: 'uppercase', letterSpacing: '0.03em', lineHeight: 1.05 }}>Armado en México</div>
          </div>
          <div style={{ fontFamily: 'Open Sans, sans-serif', fontSize: 13.5, color: PALETTE.textDim, lineHeight: 1.65 }}>
            Una <b style={{ color: PALETTE.text }}>enciclopedia libre</b> que busca dar transparencia a toda la parte legal que las instituciones mantienen opaca para tener al pueblo desarmado e ignorante de sus derechos.
          </div>
        </div>
        <div style={{ background: PALETTE.bgCard, border: `1px solid ${PALETTE.border}`, borderTop: `2px solid ${PALETTE.amber}`, padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 7, flexShrink: 0, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <img src="imagenes/logo-main.png" alt="Armas M&amp;S" style={{ width: '90%', height: 'auto', display: 'block' }} />
            </div>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 16, color: PALETTE.text, textTransform: 'uppercase', letterSpacing: '0.03em', lineHeight: 1.05 }}>Armas M&amp;S</div>
          </div>
          <div style={{ fontFamily: 'Open Sans, sans-serif', fontSize: 13.5, color: PALETTE.textDim, lineHeight: 1.65 }}>
            Un <b style={{ color: PALETTE.text }}>proyecto digital de e-commerce</b> con tienda en <span style={{ color: PALETTE.amber }}>armasmys.com</span> y de divulgación en redes sociales (YouTube, Facebook e Instagram) sobre armamento y defensa personal.
          </div>
        </div>
      </div>

      {/* AUTOR */}
      <SectionHeader>Autor</SectionHeader>
      <div style={{
        background: PALETTE.bgCard,
        border: `1px solid ${PALETTE.border}`,
        padding: 14, marginBottom: 18,
        display: 'flex', gap: 16, alignItems: 'flex-start',
        flexWrap: 'wrap'
      }}>
        {/* FOTO */}
        <div style={{
          width: 120, height: 120,
          background: PALETTE.bgElev,
          position: 'relative',
          flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden'
        }}>
          {window.Store && window.Store.getPages().about.foto ?
          <img src={window.Store.getPages().about.foto} alt={autor}
          style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(0.15) contrast(1.05)' }} /> :

          <div style={{
            fontFamily: 'Courier Prime, monospace',
            fontSize: 11, color: PALETTE.textMuted,
            letterSpacing: '0.15em', textAlign: 'center',
            padding: 8, lineHeight: 1.5
          }}>
              <div style={{ fontSize: 32, color: PALETTE.amber, marginBottom: 4 }}>◯</div>
              FOTO<br />PENDIENTE
            </div>
          }
        </div>

        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{
            fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
            fontSize: 23, color: PALETTE.text,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            lineHeight: 1.1
          }}>{autor}</div>
          <div style={{
            fontFamily: 'Courier Prime, monospace',
            fontSize: 13, color: PALETTE.amber,
            marginTop: 6, lineHeight: 1.5
          }}>Co-Fundador de Armas M&amp;S<br />Creador de Armado en México</div>
          <div style={{
            fontFamily: 'Courier Prime, monospace',
            fontSize: 12, color: PALETTE.textDim,
            lineHeight: 1.65, marginTop: 10
          }}>{bio}</div>
        </div>
      </div>

      <div style={{
        textAlign: 'center',
        padding: '16px',
        fontFamily: 'Courier Prime, monospace',
        fontSize: 11, color: PALETTE.textMuted,
        letterSpacing: '0.15em'
      }}>━━━ EDICIÓN 2026 · v1.0 ━━━</div>
    </div>);

}
window.AboutScreen = AboutScreen;

// ════════════════════════════════════════════════════════════════
// FAQ
// ════════════════════════════════════════════════════════════════
function FAQScreen() {
  const vp = window.useViewport();
  const padX = vp.isDesktop ? 28 : 16;
  const [open, setOpen] = useState2(0);
  const faqs = window.Store ? window.Store.getPages().faq : [
  { q: '¿Puedo comprar un arma en cualquier tienda?', a: 'No. En México la única forma legal de adquirir un arma de fuego es a través de la DCAM (Dirección de Comercialización de Armamento y Municiones de la SEDENA).' }];

  return (
    <div style={{ padding: `0 ${padX}px 90px`, maxWidth: 900, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div style={{
        padding: '20px 0',
        textAlign: 'center',
        borderBottom: `1px solid ${PALETTE.border}`,
        marginBottom: 18
      }}>
        <div style={{
          fontFamily: 'Courier Prime, monospace',
          fontSize: 11, color: PALETTE.amber,
          letterSpacing: '0.2em', marginBottom: 6
        }}>? PREGUNTAS FRECUENTES</div>
        <div style={{
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: 700, fontSize: 23,
          color: PALETTE.text,
          textTransform: 'uppercase',
          letterSpacing: '0.04em', lineHeight: 1.1
        }}>FAQ</div>
      </div>

      {/* DISCLAIMER */}
      <div style={{
        background: 'rgba(168,58,42,0.08)',
        border: `1px solid ${PALETTE.red}`,
        borderLeft: `4px solid ${PALETTE.red}`,
        padding: 14, marginBottom: 18
      }}>
        <div style={{
          fontFamily: 'Courier Prime, monospace',
          fontSize: 11, color: PALETTE.red,
          letterSpacing: '0.2em', textTransform: 'uppercase',
          marginBottom: 6, fontWeight: 700
        }}>▲ AVISO DE TRANSPARENCIA</div>
        <div style={{
          fontFamily: 'Courier Prime, monospace',
          fontSize: 13, color: PALETTE.text,
          lineHeight: 1.65
        }}>
          <b>Armado en México y Armas M&amp;S no son DEFENSA (anteriormente SEDENA) ni autoridad gubernamental.</b> Las armas de fuego de esta app son informativas: no las comercializamos ni realizamos trámites ante ninguna dependencia. La única vía legal para adquirir un arma de fuego en México es directamente en la DCAM. Lo único que comercializamos directamente son las tres armas traumáticas menos letales.
          <br /><br />
          <b>Armas M&amp;S no presta servicios jurídicos.</b> La asesoría legal sobre el proceso SEDENA es ofrecida de forma independiente por un <span style={{ color: PALETTE.amber, fontWeight: 700 }}>abogado externo</span> bajo su propia cédula profesional; nuestra función se limita a facilitar el contacto entre el interesado y el profesional.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {faqs.map((f, i) =>
        <div key={i} style={{
          background: PALETTE.bgCard,
          border: `1px solid ${open === i ? PALETTE.amber : PALETTE.border}`
        }}>
            <button onClick={() => setOpen(open === i ? -1 : i)} style={{
            width: '100%',
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '12px 14px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            gap: 10, textAlign: 'left'
          }}>
              <span style={{
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 600, fontSize: 15,
              color: open === i ? PALETTE.amber : PALETTE.text,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              lineHeight: 1.25,
              flex: 1
            }}>{f.q}</span>
              <span style={{
              color: PALETTE.amber,
              fontFamily: 'Courier Prime, monospace',
              fontSize: 16, flexShrink: 0
            }}>{open === i ? '−' : '+'}</span>
            </button>
            {open === i &&
          <div style={{
            padding: '0 14px 14px',
            fontFamily: 'Courier Prime, monospace',
            fontSize: 13, color: PALETTE.textDim,
            lineHeight: 1.65,
            borderTop: `1px dashed ${PALETTE.border}`,
            paddingTop: 12
          }}>{f.a}</div>
          }
          </div>
        )}
      </div>
    </div>);

}
window.FAQScreen = FAQScreen;

// ════════════════════════════════════════════════════════════════
// MENU — pantalla "Más"
// ════════════════════════════════════════════════════════════════
function MenuScreen({ onNav, onTutorial }) {
  const vp = window.useViewport();
  const padX = vp.isDesktop ? 28 : 16;
  const items = [
  { id: 'traumaticas', icon: '◎', title: 'Armas traumáticas', desc: 'Defensa menos letal CO₂ .50/.68 · sin permiso SEDENA', accent: true },
  { id: 'calibres', icon: '◉', title: 'Calibres', desc: 'Guía de munición: uso, balística y armas' },
  { id: 'campos', icon: '◎', title: 'Campos de tiro', desc: 'Clubes y polígonos aliados · suscripción próximamente' },
  { id: 'cursos', icon: '✦', title: 'Cursos', desc: 'Formación: manejo seguro, tiro defensivo y más' },
  { id: 'submit', icon: '＋', title: 'Proponer arma', desc: 'Envía un arma al curador para revisión', accent: true },
  { id: 'legal', icon: '§', title: 'Legalidad', desc: 'Trámite SEDENA y categorías legales' },
  { id: 'about', icon: '◆', title: 'Acerca de', desc: 'Sobre Armado en México y M&S' },
  { id: 'faq', icon: '?', title: 'FAQ', desc: 'Preguntas frecuentes' },
  { id: 'tutorial', action: 'tutorial', icon: '▶', title: 'Ver tutorial', desc: 'Reproduce la introducción de bienvenida' }];

  return (
    <div style={{ padding: `20px ${padX}px 90px`, maxWidth: 700, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div style={{
        fontFamily: 'Courier Prime, monospace',
        fontSize: 11, color: PALETTE.amber,
        letterSpacing: '0.2em', marginBottom: 14
      }}>☰ MÁS</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((it) =>
        <button key={it.id} onClick={() => it.action === 'tutorial' ? (onTutorial && onTutorial()) : onNav(it.id)} style={{
          background: it.accent ? `linear-gradient(135deg, ${PALETTE.bgCard} 0%, ${PALETTE.bgElev} 100%)` : PALETTE.bgCard,
          border: `1px solid ${it.accent ? PALETTE.amber : PALETTE.border}`,
          padding: '14px',
          cursor: 'pointer',
          textAlign: 'left',
          display: 'flex', alignItems: 'center', gap: 14
        }}>
            <span style={{
            fontSize: 23, color: PALETTE.amber,
            width: 30, textAlign: 'center',
            fontFamily: 'Courier Prime, monospace'
          }}>{it.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 600, fontSize: 16,
              color: PALETTE.text,
              textTransform: 'uppercase',
              letterSpacing: '0.06em'
            }}>{it.title}</div>
              <div style={{
              fontFamily: 'Courier Prime, monospace',
              fontSize: 12, color: PALETTE.textMuted,
              marginTop: 2
            }}>{it.desc}</div>
            </div>
            <span style={{ color: PALETTE.amber, fontSize: 17 }}>›</span>
          </button>
        )}
      </div>

      <div style={{
        marginTop: 30,
        padding: '14px',
        background: PALETTE.bgElev,
        border: `1px dashed ${PALETTE.border}`,
        fontFamily: 'Courier Prime, monospace',
        fontSize: 12, color: PALETTE.textMuted,
        lineHeight: 1.6
      }}>
        <div style={{ color: PALETTE.amber, fontWeight: 700, letterSpacing: '0.15em', marginBottom: 4, fontSize: 11 }}>◆ ARMADO·MX</div>
        Catálogo divulgativo. Edición 2026. Curado por Saulo Flores · Armas M&amp;S.
      </div>
    </div>);

}
window.MenuScreen = MenuScreen;

// ════════════════════════════════════════════════════════════════
// SUBMIT — Formulario público para proponer un arma
// ════════════════════════════════════════════════════════════════
function SubmitScreen({ onNav }) {
  const vp = window.useViewport();
  const padX = vp.isDesktop ? 28 : 16;
  const [sent, setSent] = useState2(false);
  const [f, setF] = useState2({
    submitterName: '', submitterEmail: '', submitterMessage: '',
    nombre: '', marca: '', tipo: 'pistola', pais: '',
    calibre: '', capacidad: '', peso: '', longitud: '', mecanismo: '',
    anio: new Date().getFullYear(), img: '',
    historia: '', avail: 'dcam'
  });
  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (!f.submitterName || !f.nombre || !f.marca || !f.calibre) {
      alert('Faltan campos obligatorios: tu nombre, nombre del arma, marca y calibre.');
      return;
    }
    window.Store.addPending({
      submitterName: f.submitterName,
      submitterEmail: f.submitterEmail,
      submitterMessage: f.submitterMessage,
      nombre: f.nombre, marca: f.marca, tipo: f.tipo, pais: f.pais,
      calibre: f.calibre, capacidad: f.capacidad, peso: f.peso,
      longitud: f.longitud, mecanismo: f.mecanismo,
      anio: Number(f.anio) || new Date().getFullYear(),
      era: 'moderno',
      img: f.img, historia: f.historia,
      avail: f.avail, availLabel: window.CATEGORIES.disponibilidad.find((d) => d.id === f.avail)?.label || 'Civil',
      uses: ['domicilio', 'club'],
      priceLvl: 2, priceExact: 'Por confirmar',
      stats: { alcance: 50, precision: 50, retroceso: 50, capacidad: 50, manejo: 50, poder: 50 },
      disponibilidad: [], dcamRef: '', legalTit: '', legalDesc: ''
    });
    setSent(true);
  };

  if (sent) {
    return (
      <div style={{ padding: `40px ${padX}px 90px`, maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          fontSize: 56, color: PALETTE.amber, marginBottom: 20, lineHeight: 1
        }}>✓</div>
        <div style={{
          fontFamily: 'Courier Prime, monospace',
          fontSize: 12, color: PALETTE.amber,
          letterSpacing: '0.25em', marginBottom: 10
        }}>◆ ENVÍO RECIBIDO</div>
        <div style={{
          fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
          fontSize: 26, color: PALETTE.text, textTransform: 'uppercase',
          lineHeight: 1.1, letterSpacing: '0.02em', marginBottom: 14
        }}>¡Gracias por contribuir!</div>
        <div style={{
          fontFamily: 'Courier Prime, monospace',
          fontSize: 14, color: PALETTE.textDim,
          lineHeight: 1.7, marginBottom: 28
        }}>
          Tu propuesta entró en la cola de revisión. Saulo Flores revisará la información,
          podrá enriquecerla con datos técnicos adicionales, y publicarla en el catálogo cuando esté lista.
          {f.submitterEmail && <div style={{ marginTop: 10, color: PALETTE.amber }}>
            Te avisaremos por correo a <b>{f.submitterEmail}</b> cuando se publique.
          </div>}
        </div>
        <button onClick={() => onNav('home')} style={{
          background: PALETTE.amber, color: '#000', border: 'none',
          padding: '12px 24px',
          fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 15,
          letterSpacing: '0.18em', textTransform: 'uppercase',
          cursor: 'pointer', marginRight: 8
        }}>Volver al inicio</button>
        <button onClick={() => {setSent(false);setF((prev) => ({ ...prev, nombre: '', marca: '', calibre: '', img: '', historia: '' }));}} style={{
          background: 'transparent', color: PALETTE.text,
          border: `1px solid ${PALETTE.border}`,
          padding: '12px 24px',
          fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 15,
          letterSpacing: '0.18em', textTransform: 'uppercase',
          cursor: 'pointer'
        }}>Enviar otra</button>
      </div>);

  }

  const fld = (label, k, props = {}) =>
  <div style={{ marginBottom: 14, gridColumn: props.span === 2 ? '1 / -1' : 'auto' }}>
      <label style={{
      display: 'block',
      fontFamily: 'Courier Prime, monospace',
      fontSize: 11, color: PALETTE.textMuted,
      letterSpacing: '0.15em', textTransform: 'uppercase',
      marginBottom: 5
    }}>{label} {props.required && <span style={{ color: PALETTE.amber }}>*</span>}</label>
      {props.ta ?
    <textarea value={f[k]} onChange={(e) => set(k, e.target.value)}
    rows={props.rows || 3} style={inpStyleS()} placeholder={props.placeholder} /> :
    props.select ?
    <select value={f[k]} onChange={(e) => set(k, e.target.value)} style={inpStyleS()}>
          {props.select.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select> :

    <input type={props.type || 'text'} value={f[k]} onChange={(e) => set(k, e.target.value)}
    style={inpStyleS()} placeholder={props.placeholder} />
    }
    </div>;


  return (
    <form onSubmit={submit} style={{ padding: `0 ${padX}px 90px`, maxWidth: 880, margin: '0 auto' }}>
      <div style={{
        padding: '24px 0',
        textAlign: 'center',
        borderBottom: `1px solid ${PALETTE.border}`,
        marginBottom: 22
      }}>
        <div style={{
          fontFamily: 'Courier Prime, monospace',
          fontSize: 11, color: PALETTE.amber,
          letterSpacing: '0.25em', marginBottom: 8
        }}>＋ COLABORA</div>
        <div style={{
          fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
          fontSize: 28, color: PALETTE.text, textTransform: 'uppercase',
          lineHeight: 1, letterSpacing: '0.04em', marginBottom: 10
        }}>Proponer un arma</div>
        <div style={{
          fontFamily: 'Courier Prime, monospace',
          fontSize: 13, color: PALETTE.textDim,
          lineHeight: 1.6, maxWidth: 540, margin: '0 auto'
        }}>¿Tienes información de un arma que falta en el catálogo? Compártela. El curador revisará tu envío y lo publicará si cumple los criterios divulgativos.</div>
      </div>

      <SectionHeader>Sobre ti</SectionHeader>
      <div style={{ background: PALETTE.bgCard, border: `1px solid ${PALETTE.border}`, padding: 18, marginBottom: 24, display: 'grid', gridTemplateColumns: vp.isDesktop ? '1fr 1fr' : '1fr', gap: '0 16px' }}>
        {fld('Tu nombre', 'submitterName', { required: true, placeholder: 'Cómo apareces en los créditos' })}
        {fld('Correo (opcional)', 'submitterEmail', { type: 'email', placeholder: 'Para avisarte cuando se publique' })}
        {fld('Comentario al curador (opcional)', 'submitterMessage', { ta: true, rows: 2, span: 2, placeholder: 'Cualquier nota: fuentes, dudas, contexto...' })}
      </div>

      <SectionHeader>Datos del arma</SectionHeader>
      <div style={{ background: PALETTE.bgCard, border: `1px solid ${PALETTE.border}`, padding: 18, marginBottom: 24, display: 'grid', gridTemplateColumns: vp.isDesktop ? '1fr 1fr' : '1fr', gap: '0 16px' }}>
        {fld('Nombre del arma', 'nombre', { required: true, placeholder: 'CZ Shadow 2' })}
        {fld('Marca / fabricante', 'marca', { required: true, placeholder: 'Ceska Zbrojovka' })}
        {fld('Tipo', 'tipo', { select: [
          { value: 'pistola', label: 'Pistola' }, { value: 'revolver', label: 'Revólver' },
          { value: 'rifle', label: 'Rifle' }, { value: 'escopeta', label: 'Escopeta' },
          { value: 'carabina', label: 'Carabina' }]
        })}
        {fld('País de origen', 'pais', { placeholder: 'República Checa' })}
        {fld('Calibre', 'calibre', { required: true, placeholder: '9mm Parabellum' })}
        {fld('Capacidad', 'capacidad', { placeholder: '17+1' })}
        {fld('Peso', 'peso', { placeholder: '1,270g' })}
        {fld('Longitud', 'longitud', { placeholder: '206mm' })}
        {fld('Mecanismo', 'mecanismo', { placeholder: 'Semi-auto, DA/SA, metal completo', span: 2 })}
        {fld('Año de introducción', 'anio', { type: 'number' })}
        {fld('Disponibilidad legal', 'avail', { select: [
          { value: 'dcam', label: 'Civil — DCAM' },
          { value: 'externo', label: 'Civil con licencia externa' },
          { value: 'seguridad', label: 'Policía / Seguridad' },
          { value: 'ejercito', label: 'Exclusivo Ejército' }]
        })}
        {fld('URL de imagen (opcional)', 'img', { placeholder: 'https://...jpg', span: 2 })}
        {fld('Historia / contexto', 'historia', { ta: true, rows: 5, placeholder: 'Datos históricos, fabricante, usos notables, año de introducción al mercado mexicano...', span: 2 })}
      </div>

      <div style={{
        background: PALETTE.bgElev, border: `1px dashed ${PALETTE.border}`,
        padding: 14, marginBottom: 22,
        fontFamily: 'Courier Prime, monospace', fontSize: 12, color: PALETTE.textMuted,
        lineHeight: 1.6
      }}>
        <b style={{ color: PALETTE.amber }}>◆ Nota:</b> tu envío no se publica automáticamente. Pasa primero por la revisión del curador. Pueden completarse datos faltantes (precio, ficha legal, ref. DCAM), corregir errores y enriquecerlo con fotografía oficial.
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button type="button" onClick={() => onNav('home')} style={{
          background: 'transparent', color: PALETTE.textDim,
          border: `1px solid ${PALETTE.border}`,
          padding: '12px 22px',
          fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 14,
          letterSpacing: '0.15em', textTransform: 'uppercase',
          cursor: 'pointer'
        }}>Cancelar</button>
        <button type="submit" style={{
          background: PALETTE.amber, color: '#000', border: 'none',
          padding: '12px 26px',
          fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 15,
          letterSpacing: '0.18em', textTransform: 'uppercase',
          cursor: 'pointer'
        }}>＋ Enviar propuesta</button>
      </div>
    </form>);

}

function inpStyleS() {
  return {
    width: '100%',
    background: PALETTE.bg,
    border: `1px solid ${PALETTE.border}`,
    color: PALETTE.text,
    padding: '9px 11px',
    fontFamily: 'Courier Prime, monospace',
    fontSize: 14, outline: 'none',
    resize: 'vertical', lineHeight: 1.4
  };
}

window.SubmitScreen = SubmitScreen;
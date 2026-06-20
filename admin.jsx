// Armado en México — Admin Panel
// Backend de gestión para Saulo Flores

const { useState, useEffect, useMemo, useRef } = React;

const ADMIN_PALETTE = window.PALETTE || {
  bg: '#0d0f0c', bgElev: '#161a14', bgCard: '#1c211a',
  border: '#2a2f24', amber: '#c9a227', military: '#4a5d3a',
  red: '#a83a2a', blue: '#5a7a9a',
  text: '#e8e6e0', textDim: '#a8a59c', textMuted: '#6a685e',
};
const P = ADMIN_PALETTE;

// ════════════════════════════════════════════════════════════════
// LOGIN
// ════════════════════════════════════════════════════════════════
function AdminLogin({ onLogin }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (window.Store.login(pw)) onLogin();
    else { setErr('Contraseña incorrecta'); setPw(''); }
  };
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
      background: `radial-gradient(ellipse at top, ${P.bgElev} 0%, ${P.bg} 60%)`,
    }}>
      <form onSubmit={submit} style={{
        width: '100%', maxWidth: 380,
        background: P.bgCard,
        border: `1px solid ${P.border}`,
        padding: 28,
        position: 'relative',
      }}>
        <TC color={P.amber} />
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10, color: P.amber,
          letterSpacing: '0.25em', textTransform: 'uppercase',
          marginBottom: 8,
        }}>◆ ACCESO RESTRINGIDO</div>
        <div style={{
          fontFamily: 'Oswald, sans-serif',
          fontWeight: 700, fontSize: 26,
          color: P.text, textTransform: 'uppercase',
          letterSpacing: '0.04em', lineHeight: 1,
          marginBottom: 6,
        }}>ARMADO·MX<br/><span style={{ color: P.amber }}>ADMIN</span></div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 11, color: P.textDim,
          marginBottom: 22, lineHeight: 1.5,
        }}>Panel de gestión del catálogo. Curado por Saulo Flores · Armas M&amp;S.</div>

        <label style={{
          display: 'block',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9, color: P.textMuted,
          letterSpacing: '0.15em', textTransform: 'uppercase',
          marginBottom: 6,
        }}>Contraseña</label>
        <input type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} style={{
          width: '100%',
          background: P.bg,
          border: `1px solid ${err ? P.red : P.border}`,
          color: P.text,
          padding: '10px 12px',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 13,
          letterSpacing: '0.2em',
          outline: 'none',
          marginBottom: 12,
        }} />
        {err && <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10, color: P.red,
          marginBottom: 12,
          letterSpacing: '0.1em',
        }}>▲ {err}</div>}
        <button type="submit" style={{
          width: '100%',
          background: P.amber, color: '#000', border: 'none',
          padding: '12px',
          fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: 13,
          letterSpacing: '0.2em', textTransform: 'uppercase',
          cursor: 'pointer',
        }}>Iniciar Sesión</button>

        <div style={{
          marginTop: 18,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9, color: P.textMuted,
          letterSpacing: '0.1em',
          padding: 10,
          border: `1px dashed ${P.border}`,
          lineHeight: 1.5,
        }}>
          <b style={{ color: P.amber }}>Demo:</b> contraseña inicial <code style={{ color: P.amber }}>armado2026</code> · Puedes cambiarla en Configuración.
        </div>
      </form>
    </div>
  );
}
window.AdminLogin = AdminLogin;

// ════════════════════════════════════════════════════════════════
// SHELL — header + tabs
// ════════════════════════════════════════════════════════════════
function AdminShell({ onLogout, children, tab, setTab, stats }) {
  const tabs = [
    { id: 'queue',      label: 'COLA',         badge: stats.pending },
    { id: 'suggests',   label: 'SUGERENCIAS',  badge: stats.suggestions },
    { id: 'catalog',    label: 'CATÁLOGO',     badge: null },
    { id: 'manuales',   label: 'INVENTARIOS',  badge: stats.manuales || null },
    { id: 'favorites',  label: 'FAVORITOS',    badge: null },
    { id: 'bulk',       label: 'IMPORT CSV',   badge: null },
    { id: 'promos',     label: 'PROMOS',       badge: null },
    { id: 'pages',      label: 'PÁGINAS',      badge: null },
    { id: 'branding',   label: 'BRANDING',     badge: null },
    { id: 'settings',   label: 'CONFIG',       badge: null },
  ];
  return (
    <div style={{ minHeight: '100vh', background: P.bg, color: P.text }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(13,15,12,0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${P.border}`,
      }}>
        <div style={{
          maxWidth: 1400, margin: '0 auto',
          padding: '0 28px', height: 64,
          display: 'flex', alignItems: 'center', gap: 24,
        }}>
          <div style={{
            fontFamily: 'Oswald, sans-serif', fontWeight: 700,
            fontSize: 18, color: P.amber,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', gap: 8,
            flexShrink: 0,
          }}>
            <span style={{
              display: 'inline-block', width: 16, height: 16,
              border: `1.5px solid ${P.amber}`, position: 'relative',
            }}>
              <span style={{ position: 'absolute', inset: 3, background: P.amber }} />
            </span>
            ARMADO·MX
            <span style={{
              fontSize: 10, color: P.red,
              border: `1px solid ${P.red}`,
              padding: '2px 6px', marginLeft: 4,
              letterSpacing: '0.18em',
            }}>ADMIN</span>
          </div>
          <div style={{ display: 'flex', gap: 4, flex: 1, justifyContent: 'center' }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '8px 16px',
                fontFamily: 'Oswald, sans-serif',
                fontSize: 13, fontWeight: 600,
                letterSpacing: '0.15em', textTransform: 'uppercase',
                color: tab === t.id ? P.amber : P.textDim,
                borderBottom: tab === t.id ? `2px solid ${P.amber}` : '2px solid transparent',
                position: 'relative',
              }}>
                {t.label}
                {t.badge ? (
                  <span style={{
                    position: 'absolute', top: 2, right: -2,
                    background: P.amber, color: '#000',
                    fontSize: 9, fontWeight: 700,
                    padding: '1px 5px',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}>{t.badge}</span>
                ) : null}
              </button>
            ))}
          </div>
          <a href="index.html" target="_blank" rel="noopener noreferrer" style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10, color: P.textDim,
            textDecoration: 'none',
            border: `1px solid ${P.border}`,
            padding: '6px 10px',
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>↗ Ver app pública</a>
          <button onClick={onLogout} style={{
            background: 'none', border: `1px solid ${P.border}`,
            color: P.textDim, cursor: 'pointer',
            padding: '6px 10px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10, letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>Salir</button>
        </div>
      </div>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px' }}>
        {children}
      </div>
    </div>
  );
}
window.AdminShell = AdminShell;

// ════════════════════════════════════════════════════════════════
// QUEUE — Cola de aprobación
// ════════════════════════════════════════════════════════════════
function QueueTab({ onEdit }) {
  const [pending, setPending] = useState(window.Store.getPending());
  const [rejected, setRejected] = useState(window.Store.getRejected());
  const [showRejected, setShowRejected] = useState(false);
  const refresh = () => { setPending(window.Store.getPending()); setRejected(window.Store.getRejected()); };
  useEffect(() => window.Store.onChange(refresh), []);

  const approve = (p) => {
    if (!confirm(`¿Aprobar "${p.nombre}" y publicar en el catálogo?`)) return;
    window.Store.approvePending(p.id);
    refresh();
  };
  const reject = (p) => {
    const reason = prompt('Razón del rechazo (opcional):', '');
    if (reason === null) return;
    window.Store.rejectPending(p.id, reason);
    refresh();
  };

  return (
    <div>
      <SectionHead title="Cola de envíos" sub={`${pending.length} propuestas de usuarios esperando revisión`} action={
        <button onClick={() => setShowRejected(s => !s)} style={btnGhost}>
          {showRejected ? '▼ Ocultar rechazados' : `▶ Ver rechazados (${rejected.length})`}
        </button>
      }/>

      {pending.length === 0 ? (
        <Empty icon="✓" title="Sin envíos pendientes" sub="Cuando un usuario proponga un arma desde la app pública, aparecerá aquí." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {pending.map(p => (
            <SubmissionCard key={p.id} sub={p}
              onApprove={() => approve(p)}
              onReject={() => reject(p)}
              onEdit={() => onEdit(p, 'pending')} />
          ))}
        </div>
      )}

      {showRejected && rejected.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <SectionHead title="Rechazados" sub={`${rejected.length} envíos rechazados (histórico)`} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rejected.map(r => (
              <div key={r.id} style={{
                background: P.bgCard,
                border: `1px solid ${P.border}`,
                borderLeft: `3px solid ${P.red}`,
                padding: '12px 14px',
                opacity: 0.7,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div>
                    <div style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 600, fontSize: 14, textTransform: 'uppercase' }}>{r.nombre}</div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: P.textMuted, marginTop: 2 }}>
                      Por {r.submitterName} · {new Date(r.rejectedAt).toLocaleDateString()}
                      {r.rejectionReason && <span style={{ color: P.red }}> · "{r.rejectionReason}"</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
window.QueueTab = QueueTab;

function SubmissionCard({ sub, onApprove, onReject, onEdit }) {
  return (
    <div style={{
      background: P.bgCard,
      border: `1px solid ${P.amber}`,
      padding: 18,
      display: 'grid',
      gridTemplateColumns: '120px 1fr auto',
      gap: 18, alignItems: 'flex-start',
      position: 'relative',
    }}>
      <TC color={P.amber} />
      <div style={{
        height: 100,
        background: `radial-gradient(circle, ${P.bgElev} 0%, ${P.bg} 100%)`,
        border: `1px solid ${P.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', position: 'relative',
      }}>
        <img src={sub.img || window.armaPlaceholder(sub)}
          onError={(e) => { e.target.src = window.armaPlaceholder(sub); e.target.onerror = null; }}
          style={{ maxWidth: '90%', maxHeight: '90%', filter: 'grayscale(0.2) contrast(1.1)' }} />
      </div>
      <div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9, color: P.amber,
          letterSpacing: '0.18em', textTransform: 'uppercase',
          marginBottom: 4,
        }}>NUEVO ENVÍO · {new Date(sub.submittedAt).toLocaleString('es-MX')}</div>
        <div style={{
          fontFamily: 'Oswald, sans-serif',
          fontWeight: 700, fontSize: 20,
          color: P.text, textTransform: 'uppercase',
          letterSpacing: '0.02em',
          marginBottom: 4,
        }}>{sub.nombre || '(sin nombre)'}</div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 11, color: P.textDim,
          marginBottom: 10,
        }}>
          {sub.marca || '?'} · {sub.tipo || '?'} · {sub.calibre || '?'} · {sub.pais || '?'}
        </div>

        <div style={{
          background: P.bg,
          border: `1px solid ${P.border}`,
          padding: 10,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10, color: P.textDim,
          lineHeight: 1.6,
        }}>
          <div style={{ color: P.amber, marginBottom: 4 }}>━ SUBMITTER</div>
          <div><b style={{ color: P.text }}>{sub.submitterName || '(anónimo)'}</b></div>
          {sub.submitterEmail && <div>✉ {sub.submitterEmail}</div>}
          {sub.submitterMessage && (
            <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px dashed ${P.border}`, color: P.textDim }}>
              "{sub.submitterMessage}"
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 140 }}>
        <button onClick={onApprove} style={btnPrimary}>✓ Aprobar</button>
        <button onClick={onEdit} style={btnSecondary}>✎ Editar y aprobar</button>
        <button onClick={onReject} style={btnDanger}>✕ Rechazar</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// CATALOG — Tabla de armas
// ════════════════════════════════════════════════════════════════
function CatalogTab({ onEdit }) {
  const [armas, setArmas] = useState(window.Store.getArmas());
  const [q, setQ] = useState('');
  const [tipoF, setTipoF] = useState('all');
  const refresh = () => setArmas(window.Store.getArmas());
  useEffect(() => window.Store.onChange(refresh), []);

  const filtered = armas.filter(a => {
    if (tipoF !== 'all' && a.tipo !== tipoF) return false;
    if (q) {
      const s = q.toLowerCase();
      if (!a.nombre.toLowerCase().includes(s) && !a.marca.toLowerCase().includes(s) && !a.calibre.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const del = (a) => {
    if (!confirm(`¿Eliminar "${a.nombre}"? Esta acción no se puede deshacer.`)) return;
    window.Store.deleteArma(a.id);
    refresh();
  };

  return (
    <div>
      <SectionHead title="Catálogo" sub={`${armas.length} armas registradas · ${filtered.length} mostradas`} action={
        <button onClick={() => onEdit(null, 'new')} style={btnPrimary}>＋ Nueva arma</button>
      }/>

      <div style={{
        display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: P.bgCard, border: `1px solid ${P.border}`,
          padding: '8px 12px', flex: 1, minWidth: 220,
        }}>
          <span style={{ color: P.amber }}>⌕</span>
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar nombre, marca, calibre..."
            style={inpStyle()} />
        </div>
        <select value={tipoF} onChange={(e) => setTipoF(e.target.value)} style={selStyle()}>
          <option value="all">Todos los tipos</option>
          <option value="pistola">Pistolas</option>
          <option value="revolver">Revólveres</option>
          <option value="rifle">Rifles</option>
          <option value="escopeta">Escopetas</option>
          <option value="carabina">Carabinas</option>
        </select>
      </div>

      <div style={{
        background: P.bgCard, border: `1px solid ${P.border}`,
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '50px 70px 1fr 1fr 1fr 120px 90px 120px',
          gap: 10, padding: '10px 14px',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9, color: P.textMuted,
          letterSpacing: '0.15em', textTransform: 'uppercase',
          borderBottom: `1px solid ${P.border}`,
          background: P.bgElev,
        }}>
          <div>ID</div><div>Img</div><div>Nombre</div><div>Marca</div>
          <div>Calibre</div><div>Disponibilidad</div><div>$ Nivel</div><div>Acciones</div>
        </div>
        {filtered.map(a => (
          <div key={a.id} style={{
            display: 'grid',
            gridTemplateColumns: '50px 70px 1fr 1fr 1fr 120px 90px 120px',
            gap: 10, padding: '10px 14px',
            borderBottom: `1px solid ${P.border}`,
            alignItems: 'center',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11, color: P.text,
          }}>
            <div style={{ color: P.textMuted, fontSize: 10 }}>#{String(a.id).padStart(3,'0')}</div>
            <div style={{
              width: 50, height: 36, background: P.bg, border: `1px solid ${P.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            }}>
              <img src={a.img} style={{ maxWidth: '88%', maxHeight: '88%' }} />
            </div>
            <div style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 600, fontSize: 13, textTransform: 'uppercase' }}>{a.nombre}</div>
            <div style={{ color: P.amber, fontSize: 10, textTransform: 'uppercase' }}>{a.marca}</div>
            <div style={{ fontSize: 10 }}>{a.calibre}</div>
            <div>{window.AvailBadge ? <window.AvailBadge avail={a.avail} compact /> : a.avail}</div>
            <div style={{ color: P.amber }}>{('$'.repeat(a.priceLvl||1))}</div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => onEdit(a, 'edit')} style={btnTiny}>✎ Editar</button>
              <button onClick={() => del(a)} style={Object.assign({}, btnTiny, { color: P.red, borderColor: P.red })}>✕</button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: P.textMuted, fontSize: 11 }}>
            Sin resultados.
          </div>
        )}
      </div>
    </div>
  );
}
window.CatalogTab = CatalogTab;

// ════════════════════════════════════════════════════════════════
// FORM — Editor de arma (usado para crear, editar, y aprobar pending)
// ════════════════════════════════════════════════════════════════
function ArmaForm({ arma, mode, source, onSave, onCancel }) {
  // mode: 'new' | 'edit' | 'pending'
  // source: pending sub object (when mode === 'pending')
  const [f, setF] = useState(() => {
    const base = arma || {};
    return {
      id: base.id,
      nombre: base.nombre || '',
      marca: base.marca || '',
      tipo: base.tipo || 'pistola',
      pais: base.pais || '',
      calibre: base.calibre || '',
      capacidad: base.capacidad || '',
      peso: base.peso || '',
      longitud: base.longitud || '',
      mecanismo: base.mecanismo || '',
      anio: base.anio || new Date().getFullYear(),
      era: base.era || 'moderno',
      img: base.img && !base.img.startsWith('data:') ? base.img : '',
      historia: base.historia || '',
      avail: base.avail || 'dcam',
      availLabel: base.availLabel || 'Uso civil — DCAM',
      legalTit: base.legalTit || '',
      legalDesc: base.legalDesc || '',
      priceExact: base.priceExact || '',
      priceLvl: base.priceLvl || 1,
      dcamRef: base.dcamRef || '',
      disponibilidad: (base.disponibilidad || []).join('\n'),
      uses: base.uses || ['domicilio','club'],
      stats: base.stats || { alcance:50, precision:50, retroceso:50, capacidad:50, manejo:50, poder:50 },
    };
  });

  // Historial de precios ligado a inventarios DCAM-SEDENA
  const [priceHist, setPriceHist] = useState(() =>
    (arma && arma.id ? (window.Store.getPriceHistory(arma.id) || []) : []).slice()
  );
  const manuales = useMemo(() => window.Store.getManuales(), []);
  // historial ordenado cronológicamente (más antiguo → más reciente); el último es el precio actual
  const sortedHist = useMemo(() =>
    priceHist.slice().sort((a, b) => String(a.date || '').localeCompare(String(b.date || ''))),
    [priceHist]
  );
  const latestEntry = sortedHist[sortedHist.length - 1];

  const addPriceEntry = () => {
    const m = manuales[0];
    setPriceHist(prev => [...prev, {
      price: '', manualId: m ? m.id : '',
      date: m ? m.fecha : '', note: m ? m.nombre : '',
    }]);
  };
  const setPriceEntry = (i, patch) => setPriceHist(prev => prev.map((e, idx) => idx === i ? Object.assign({}, e, patch) : e));
  const onPickManual = (i, mid) => {
    const m = manuales.find(x => x.id === mid);
    setPriceEntry(i, { manualId: mid, date: m ? m.fecha : '', note: m ? m.nombre : '' });
  };
  const removePriceEntry = (i) => setPriceHist(prev => prev.filter((_, idx) => idx !== i));

  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));
  const setStat = (k, v) => setF(prev => ({ ...prev, stats: { ...prev.stats, [k]: Number(v) } }));
  const toggleUse = (u) => setF(prev => ({ ...prev, uses: prev.uses.includes(u) ? prev.uses.filter(x => x !== u) : [...prev.uses, u] }));

  const save = () => {
    if (!f.nombre || !f.marca || !f.tipo || !f.calibre) {
      alert('Faltan campos obligatorios: nombre, marca, tipo, calibre.');
      return;
    }
    const out = {
      ...f,
      disponibilidad: f.disponibilidad.split('\n').map(s => s.trim()).filter(Boolean),
      anio: Number(f.anio) || new Date().getFullYear(),
      priceLvl: Number(f.priceLvl) || 1,
    };
    // Si hay historial de inventarios, el precio actual = entrada más reciente
    const cleanHist = priceHist
      .filter(h => h.price && String(h.price).trim())
      .map(h => ({ price: String(h.price).trim(), manualId: h.manualId || '', date: h.date || '', note: h.note || '' }))
      .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
    const latest = cleanHist[cleanHist.length - 1];
    if (latest) {
      out.priceExact = latest.price;
      out.priceManualId = latest.manualId || '';
    }
    let savedArma;
    if (mode === 'pending') {
      // aprobar la submission con overrides
      savedArma = window.Store.approvePending(source.id, out);
    } else {
      savedArma = window.Store.upsertArma(out);
    }
    // Persistir historial curado (sobrescribe cualquier auto-registro)
    if (savedArma && savedArma.id) {
      window.Store.setPriceHistory(savedArma.id, cleanHist);
    }
    onSave();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(7,8,10,0.92)', backdropFilter: 'blur(6px)',
      overflowY: 'auto', padding: '40px 20px',
    }}>
      <div style={{
        maxWidth: 980, margin: '0 auto',
        background: P.bgCard,
        border: `1px solid ${P.amber}`,
        boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
      }}>
        <div style={{
          background: P.bgElev,
          padding: '16px 22px',
          borderBottom: `2px solid ${P.amber}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: P.amber, letterSpacing: '0.2em' }}>
              {mode === 'new' ? '＋ NUEVA ARMA' : mode === 'pending' ? '◆ APROBAR ENVÍO' : '✎ EDITAR ARMA'}
            </div>
            <div style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: 22, textTransform: 'uppercase' }}>
              {f.nombre || 'Sin nombre'}
            </div>
          </div>
          <button onClick={onCancel} style={btnGhost}>✕ Cancelar</button>
        </div>

        <div style={{
          padding: 22,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr', gap: 18,
        }}>
          <FormField label="Nombre" required>
            <input value={f.nombre} onChange={(e) => set('nombre', e.target.value)} style={inpStyle()} />
          </FormField>
          <FormField label="Marca" required>
            <input value={f.marca} onChange={(e) => set('marca', e.target.value)} style={inpStyle()} />
          </FormField>
          <FormField label="Tipo" required>
            <select value={f.tipo} onChange={(e) => set('tipo', e.target.value)} style={selStyle()}>
              <option value="pistola">Pistola</option>
              <option value="revolver">Revólver</option>
              <option value="rifle">Rifle</option>
              <option value="escopeta">Escopeta</option>
              <option value="carabina">Carabina</option>
            </select>
          </FormField>
          <FormField label="País de origen">
            <input value={f.pais} onChange={(e) => set('pais', e.target.value)} style={inpStyle()} />
          </FormField>
          <FormField label="Calibre" required>
            <input value={f.calibre} onChange={(e) => set('calibre', e.target.value)} style={inpStyle()} placeholder="9mm Parabellum" />
          </FormField>
          <FormField label="Capacidad">
            <input value={f.capacidad} onChange={(e) => set('capacidad', e.target.value)} style={inpStyle()} placeholder="15+1" />
          </FormField>
          <FormField label="Peso">
            <input value={f.peso} onChange={(e) => set('peso', e.target.value)} style={inpStyle()} placeholder="780g" />
          </FormField>
          <FormField label="Longitud">
            <input value={f.longitud} onChange={(e) => set('longitud', e.target.value)} style={inpStyle()} placeholder="185mm" />
          </FormField>
          <FormField label="Mecanismo">
            <input value={f.mecanismo} onChange={(e) => set('mecanismo', e.target.value)} style={inpStyle()} placeholder="Semi-auto, striker-fired" />
          </FormField>
          <FormField label="Año intro.">
            <input type="number" value={f.anio} onChange={(e) => set('anio', e.target.value)} style={inpStyle()} />
          </FormField>
          <FormField label="Era">
            <select value={f.era} onChange={(e) => set('era', e.target.value)} style={selStyle()}>
              <option value="clasico">Clásico</option>
              <option value="moderno">Moderno</option>
              <option value="vanguardia">Vanguardia</option>
            </select>
          </FormField>
          <FormField label="URL de imagen (web)">
            <input value={f.img} onChange={(e) => set('img', e.target.value)} style={inpStyle()} placeholder="https://...jpg" />
          </FormField>
          <FormField label="🎬 Video YouTube (URL o ID)" span="2">
            <input value={f.youtube || ''} onChange={(e) => set('youtube', e.target.value)} style={inpStyle()}
              placeholder="https://youtube.com/watch?v=... · https://youtu.be/... · o ID directo" />
            {f.youtube && window.youtubeId(f.youtube) ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                marginTop: 8, padding: 8,
                background: P.bg, border: `1px solid ${P.border}`,
              }}>
                <img src={`https://i.ytimg.com/vi/${window.youtubeId(f.youtube)}/default.jpg`}
                  alt="" style={{ width: 80, height: 60, objectFit: 'cover' }}
                  onError={(e) => { e.target.style.display = 'none'; }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: P.amber, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em' }}>
                    ✓ Video ID: <b>{window.youtubeId(f.youtube)}</b>
                  </div>
                  <a href={`https://youtube.com/watch?v=${window.youtubeId(f.youtube)}`}
                    target="_blank" rel="noopener" style={{
                      fontSize: 10, color: P.textDim,
                      fontFamily: 'JetBrains Mono, monospace',
                      textDecoration: 'underline', wordBreak: 'break-all',
                    }}>Abrir en YouTube ↗</a>
                </div>
              </div>
            ) : f.youtube && (
              <div style={{ fontSize: 11, color: '#ff8b8b', marginTop: 6, fontFamily: 'JetBrains Mono, monospace' }}>
                ⚠ No se pudo extraer un ID válido. Pega la URL completa del video o el ID de 11 caracteres.
              </div>
            )}
          </FormField>

          <FormField label="Disponibilidad legal" span="2">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {window.CATEGORIES.disponibilidad.map(d => (
                <button key={d.id} onClick={() => { set('avail', d.id); set('availLabel', d.label); }}
                  style={{
                    background: f.avail === d.id ? d.color : 'transparent',
                    color: f.avail === d.id ? '#000' : P.textDim,
                    border: `1px solid ${f.avail === d.id ? d.color : P.border}`,
                    padding: '6px 12px',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 10, letterSpacing: '0.08em',
                    textTransform: 'uppercase', cursor: 'pointer',
                  }}>{d.label}</button>
              ))}
            </div>
          </FormField>

          <FormField label="Título legal (encabezado)" span="2">
            <input value={f.legalTit} onChange={(e) => set('legalTit', e.target.value)} style={inpStyle()} placeholder="Civil — Adquisición directa en DCAM" />
          </FormField>
          <FormField label="Descripción legal" span="2">
            <textarea value={f.legalDesc} onChange={(e) => set('legalDesc', e.target.value)} style={taStyle()} rows={3} />
          </FormField>

          <FormField label="Disponibilidad (una por línea)" span="2">
            <textarea value={f.disponibilidad} onChange={(e) => set('disponibilidad', e.target.value)} style={taStyle()} rows={2} placeholder={"DCAM CDMX\nDCAM Monterrey"} />
          </FormField>

          <FormField label="Precio (texto)">
            <input value={f.priceExact} onChange={(e) => set('priceExact', e.target.value)} style={inpStyle()} placeholder="$10,084 MXN" />
            <div style={{ fontSize: 10, color: P.textMuted, marginTop: 5, lineHeight: 1.4 }}>
              Se sobrescribe con el inventario más reciente del historial de abajo, si lo hay.
            </div>
          </FormField>
          <FormField label="Nivel de precio (1-5)">
            <select value={f.priceLvl} onChange={(e) => set('priceLvl', e.target.value)} style={selStyle()}>
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{'$'.repeat(n)}</option>)}
            </select>
          </FormField>

          <FormField label="Ref. DCAM" span="2">
            <input value={f.dcamRef} onChange={(e) => set('dcamRef', e.target.value)} style={inpStyle()} placeholder="PISTOLA CAL. 9mm MCA TAURUS MOD. GX4 PAVON" />
          </FormField>

          <FormField label="Historial de precios DCAM (por inventario oficial)" span="2">
            <div style={{
              fontSize: 11, color: P.textDim, lineHeight: 1.55, marginBottom: 10,
            }}>
              Registra el precio que aparece en cada PDF de inventario. El <b style={{ color: P.amber }}>más reciente</b> se publica como precio actual y los campos «Precio» y «Ref. DCAM» de arriba se actualizan solos.
            </div>

            {manuales.length === 0 ? (
              <div style={{
                background: 'rgba(168,58,42,0.08)', border: `1px solid ${P.red}`,
                padding: '10px 14px', fontSize: 12, color: P.textDim, lineHeight: 1.5,
              }}>
                ⚠ Aún no has cargado ningún inventario. Ve a la pestaña <b style={{ color: P.amber }}>INVENTARIOS</b> y sube el PDF oficial de la DCAM antes de registrar precios.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {priceHist.length === 0 && (
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: P.textMuted }}>
                    Sin registros. Agrega el primer precio desde un inventario.
                  </div>
                )}
                {priceHist.map((h, i) => {
                  const isLatest = latestEntry && h === latestEntry;
                  return (
                    <div key={i} style={{
                      display: 'grid',
                      gridTemplateColumns: '1.6fr 1fr auto auto',
                      gap: 8, alignItems: 'center',
                      background: isLatest ? 'rgba(201,162,39,0.07)' : P.bg,
                      border: `1px solid ${isLatest ? P.amber : P.border}`,
                      padding: '8px 10px',
                    }}>
                      <select value={h.manualId || ''} onChange={(e) => onPickManual(i, e.target.value)} style={selStyle()}>
                        <option value="">— Elegir inventario —</option>
                        {manuales.map(m => (
                          <option key={m.id} value={m.id}>{fmtFecha(m.fecha)} · {m.nombre}</option>
                        ))}
                      </select>
                      <input value={h.price || ''} onChange={(e) => setPriceEntry(i, { price: e.target.value })}
                        style={inpStyle()} placeholder="$10,084 MXN" />
                      <span style={{
                        fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
                        letterSpacing: '0.1em', textTransform: 'uppercase',
                        color: isLatest ? P.amber : 'transparent', width: 54, textAlign: 'center',
                      }}>{isLatest ? '● actual' : ''}</span>
                      <button onClick={() => removePriceEntry(i)} style={Object.assign({}, btnGhost, { color: '#ff8b8b', padding: '6px 10px' })}>✕</button>
                    </div>
                  );
                })}
                <button onClick={addPriceEntry} style={Object.assign({}, btnSecondary, { alignSelf: 'flex-start', marginTop: 2 })}>
                  ＋ Agregar precio de inventario
                </button>
              </div>
            )}
          </FormField>

          <FormField label="Usos recomendados" span="2">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {window.CATEGORIES.uso.map(u => (
                <button key={u.id} onClick={() => toggleUse(u.id)} style={{
                  background: f.uses.includes(u.id) ? P.amber : 'transparent',
                  color: f.uses.includes(u.id) ? '#000' : P.textDim,
                  border: `1px solid ${f.uses.includes(u.id) ? P.amber : P.border}`,
                  padding: '6px 12px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10, cursor: 'pointer',
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>
                  {u.icon} {u.label}
                </button>
              ))}
            </div>
          </FormField>

          <FormField label="Stats de combate (0-100)" span="2">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                ['alcance','Alcance'],['precision','Precisión'],['retroceso','Retroceso'],
                ['capacidad','Capacidad'],['manejo','Manejo'],['poder','Poder']
              ].map(([k, l]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                    color: P.textDim, width: 80, textTransform: 'uppercase', letterSpacing: '0.08em',
                  }}>{l}</span>
                  <input type="range" min="0" max="100" value={f.stats[k]}
                    onChange={(e) => setStat(k, e.target.value)} style={{ flex: 1, accentColor: P.amber }} />
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                    color: P.amber, fontWeight: 700, width: 30, textAlign: 'right',
                  }}>{f.stats[k]}</span>
                </div>
              ))}
            </div>
          </FormField>

          <FormField label="Historia / Dossier" span="2">
            <textarea value={f.historia} onChange={(e) => set('historia', e.target.value)} style={taStyle()} rows={5} placeholder="Contexto histórico, fabricante, datos curiosos..." />
          </FormField>
        </div>

        <div style={{
          padding: '14px 22px',
          borderTop: `1px solid ${P.border}`,
          background: P.bgElev,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: P.textMuted }}>
            {mode === 'pending' ? '◆ Al guardar, se publica en el catálogo y se borra de la cola.' : '◆ Los cambios persisten en este navegador (localStorage).'}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onCancel} style={btnGhost}>Cancelar</button>
            <button onClick={save} style={btnPrimary}>
              {mode === 'pending' ? '✓ Aprobar y publicar' : '💾 Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
window.ArmaForm = ArmaForm;

// ════════════════════════════════════════════════════════════════
// PAGES — editor de páginas Legal / FAQ / About
// ════════════════════════════════════════════════════════════════
function PagesTab() {
  const [sub, setSub] = useState('legal');
  return (
    <div>
      <SectionHead title="Páginas" sub="Editar contenido visible al usuario en la app pública" />

      <div style={{ display: 'flex', gap: 0, marginBottom: 18, borderBottom: `1px solid ${P.border}` }}>
        {[
          { id: 'legal', label: 'Legalidad' },
          { id: 'faq',   label: 'FAQ' },
          { id: 'about', label: 'Acerca' },
        ].map(t => (
          <button key={t.id} onClick={() => setSub(t.id)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '10px 18px',
            fontFamily: 'Oswald, sans-serif',
            fontSize: 12, fontWeight: 600,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: sub === t.id ? P.amber : P.textDim,
            borderBottom: sub === t.id ? `2px solid ${P.amber}` : '2px solid transparent',
          }}>{t.label}</button>
        ))}
      </div>

      {sub === 'legal' && <LegalEditor />}
      {sub === 'faq'   && <FAQEditor />}
      {sub === 'about' && <AboutEditor />}
    </div>
  );
}
window.PagesTab = PagesTab;

function LegalEditor() {
  const [v, setV] = useState(window.Store.getPages().legal);
  const set = (k, val) => setV(prev => ({ ...prev, [k]: val }));
  const save = () => { window.Store.updatePage('legal', v); alert('✓ Página legal guardada.'); };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
      <FormField label="Eyebrow"><input value={v.eyebrow} onChange={(e) => set('eyebrow', e.target.value)} style={inpStyle()} /></FormField>
      <FormField label="Título"><input value={v.title} onChange={(e) => set('title', e.target.value)} style={inpStyle()} /></FormField>
      <FormField label="Introducción" span="2"><textarea value={v.intro} onChange={(e) => set('intro', e.target.value)} style={taStyle()} rows={3} /></FormField>

      <FormField label="Requisitos SEDENA (uno por línea)" span="2">
        <textarea value={v.requisitos.join('\n')} onChange={(e) => set('requisitos', e.target.value.split('\n'))} style={taStyle()} rows={7} />
      </FormField>

      <FormField label="Pasos DCAM (formato: TÍTULO | descripción, uno por línea)" span="2">
        <textarea value={v.pasos.map(p => p.t + ' | ' + p.d).join('\n')}
          onChange={(e) => set('pasos', e.target.value.split('\n').map(l => {
            const [t, ...d] = l.split('|');
            return { t: (t||'').trim(), d: d.join('|').trim() };
          }))}
          style={taStyle()} rows={6} />
      </FormField>

      <FormField label="WhatsApp (con código país)"><input value={v.whatsapp_phone} onChange={(e) => set('whatsapp_phone', e.target.value)} style={inpStyle()} /></FormField>
      <FormField label="Mensaje predefinido"><input value={v.whatsapp_msg} onChange={(e) => set('whatsapp_msg', e.target.value)} style={inpStyle()} /></FormField>
      <FormField label="Pitch de la asesoría" span="2"><textarea value={v.whatsapp_pitch} onChange={(e) => set('whatsapp_pitch', e.target.value)} style={taStyle()} rows={3} /></FormField>

      <div style={{ gridColumn: '1/-1', textAlign: 'right' }}>
        <button onClick={save} style={btnPrimary}>💾 Guardar página Legal</button>
      </div>
    </div>
  );
}

function FAQEditor() {
  const [items, setItems] = useState(window.Store.getPages().faq);
  const set = (i, k, val) => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [k]: val } : it));
  const add = () => setItems(prev => [...prev, { q: '', a: '' }]);
  const del = (i) => { if (confirm('¿Eliminar esta pregunta?')) setItems(prev => prev.filter((_, idx) => idx !== i)); };
  const move = (i, dir) => {
    setItems(prev => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };
  const save = () => {
    const pages = window.Store.getPages();
    pages.faq = items;
    window.Store.savePages(pages);
    alert('✓ FAQ guardado.');
  };
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
        {items.map((it, i) => (
          <div key={i} style={{
            background: P.bgCard, border: `1px solid ${P.border}`,
            padding: 14, position: 'relative',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: P.textMuted }}>
                ━ Pregunta {String(i+1).padStart(2,'0')}
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => move(i, -1)} disabled={i===0} style={btnTiny}>▲</button>
                <button onClick={() => move(i, 1)} disabled={i===items.length-1} style={btnTiny}>▼</button>
                <button onClick={() => del(i)} style={Object.assign({}, btnTiny, { color: P.red })}>✕</button>
              </div>
            </div>
            <input value={it.q} onChange={(e) => set(i, 'q', e.target.value)} style={inpStyle()} placeholder="Pregunta" />
            <div style={{ height: 8 }} />
            <textarea value={it.a} onChange={(e) => set(i, 'a', e.target.value)} style={taStyle()} rows={3} placeholder="Respuesta" />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={add} style={btnSecondary}>＋ Añadir pregunta</button>
        <button onClick={save} style={btnPrimary}>💾 Guardar FAQ</button>
      </div>
    </div>
  );
}

function AboutEditor() {
  const [v, setV] = useState(window.Store.getPages().about);
  const set = (k, val) => setV(prev => ({ ...prev, [k]: val }));
  const save = () => { window.Store.updatePage('about', v); alert('✓ Acerca guardado.'); };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
      <FormField label="Eyebrow"><input value={v.eyebrow} onChange={(e) => set('eyebrow', e.target.value)} style={inpStyle()} /></FormField>
      <FormField label="Título"><input value={v.title} onChange={(e) => set('title', e.target.value)} style={inpStyle()} /></FormField>
      <FormField label="Misión" span="2"><textarea value={v.mision} onChange={(e) => set('mision', e.target.value)} style={taStyle()} rows={4} /></FormField>
      <FormField label="Autor"><input value={v.autor} onChange={(e) => set('autor', e.target.value)} style={inpStyle()} /></FormField>
      <FormField label="Empresa"><input value={v.empresa} onChange={(e) => set('empresa', e.target.value)} style={inpStyle()} /></FormField>
      <FormField label="URL de foto del autor (opcional)" span="2">
        <input value={v.foto || ''} onChange={(e) => set('foto', e.target.value)} style={inpStyle()} placeholder="https://...jpg" />
        {v.foto && <img src={v.foto} alt="" style={{ marginTop: 8, maxWidth: 120, maxHeight: 120, objectFit: 'cover', border: `1px solid ${P.border}` }} />}
      </FormField>
      <FormField label="Bio del autor" span="2"><textarea value={v.bio} onChange={(e) => set('bio', e.target.value)} style={taStyle()} rows={3} /></FormField>
      <FormField label="Aviso importante" span="2"><textarea value={v.aviso} onChange={(e) => set('aviso', e.target.value)} style={taStyle()} rows={4} /></FormField>
      <FormField label="Disclaimer oficial (no SEDENA / informativo)" span="2">
        <textarea value={v.disclaimerOficial || ''} onChange={(e) => set('disclaimerOficial', e.target.value)} style={taStyle()} rows={4} />
      </FormField>
      <div style={{ gridColumn: '1/-1', textAlign: 'right' }}>
        <button onClick={save} style={btnPrimary}>💾 Guardar Acerca</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// SETTINGS — Export, Import, Password, Reset
// ════════════════════════════════════════════════════════════════
function SettingsTab() {
  const [newPw, setNewPw] = useState('');
  const [importText, setImportText] = useState('');
  const fileRef = useRef(null);

  const exportJson = () => {
    const data = window.Store.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'armado-mx-export-' + new Date().toISOString().slice(0,10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = (ev) => { setImportText(ev.target.result); };
    r.readAsText(file);
  };

  const doImport = () => {
    if (!importText) return;
    try {
      const data = JSON.parse(importText);
      if (!confirm('Esto sobrescribirá todos los datos actuales. ¿Continuar?')) return;
      window.Store.importAll(data);
      setImportText('');
      alert('✓ Importación exitosa.');
    } catch (e) {
      alert('Error: JSON inválido. ' + e.message);
    }
  };

  const changePw = () => {
    if (!newPw || newPw.length < 4) { alert('La contraseña debe tener al menos 4 caracteres.'); return; }
    window.Store.setPassword(newPw);
    setNewPw('');
    alert('✓ Contraseña actualizada.');
  };

  return (
    <div>
      <SectionHead title="Configuración" sub="Backup, restauración y administración del sistema" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <Card title="Exportar todo (catálogo + páginas + cola)">
          <p style={txtMuted}>Descarga un JSON con todos los datos. Úsalo para respaldo o para mover entre dispositivos.</p>
          <button onClick={exportJson} style={btnPrimary}>📥 Descargar export JSON</button>
        </Card>

        <Card title="Importar desde JSON">
          <p style={txtMuted}>Carga un archivo de export anterior. Sobrescribe los datos actuales.</p>
          <input type="file" accept=".json" onChange={importFile} ref={fileRef} style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
            color: P.text, marginBottom: 8,
          }} />
          <textarea value={importText} onChange={(e) => setImportText(e.target.value)}
            placeholder="O pega aquí el JSON..." style={taStyle()} rows={4} />
          <button onClick={doImport} disabled={!importText} style={Object.assign({}, btnPrimary, { marginTop: 8, opacity: importText ? 1 : 0.5 })}>
            ⬆ Importar
          </button>
        </Card>

        <Card title="Cambiar contraseña">
          <p style={txtMuted}>Mínimo 4 caracteres. Se guarda solo en este navegador.</p>
          <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Nueva contraseña" style={inpStyle()} />
          <button onClick={changePw} style={Object.assign({}, btnPrimary, { marginTop: 8 })}>🔒 Actualizar</button>
        </Card>

        <Card title="Acerca del sistema">
          <p style={txtMuted}>Datos guardados localmente (localStorage). Para sincronizar entre dispositivos, exporta JSON regularmente.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: P.textDim }}>
            <div>◆ Armas en catálogo: <b style={{ color: P.amber }}>{window.Store.getArmas().length}</b></div>
            <div>◆ Envíos pendientes: <b style={{ color: P.amber }}>{window.Store.getPending().length}</b></div>
            <div>◆ Sugerencias pendientes: <b style={{ color: P.amber }}>{window.Store.getSuggestions().length}</b></div>
            <div>◆ Promos activas: <b style={{ color: P.amber }}>{window.Store.getPromos().length}</b></div>
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 24, padding: 14, background: P.bgElev, border: `1px dashed ${P.border}`, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: P.textMuted, lineHeight: 1.6 }}>
        <b style={{ color: P.amber }}>◆ Nota:</b> Este admin guarda datos en <code style={{ color: P.amber }}>localStorage</code> del navegador. Funciona offline y no requiere servidor. Para usarlo en producción con sincronización entre dispositivos, exporta el JSON regularmente o monta una API real.
      </div>
    </div>
  );
}
window.SettingsTab = SettingsTab;

// ════════════════════════════════════════════════════════════════
// HELPERS UI
// ════════════════════════════════════════════════════════════════
function SectionHead({ title, sub, action }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
      marginBottom: 22, gap: 12, flexWrap: 'wrap',
    }}>
      <div>
        <div style={{
          fontFamily: 'Oswald, sans-serif', fontWeight: 700,
          fontSize: 26, color: P.text, textTransform: 'uppercase',
          letterSpacing: '0.04em', lineHeight: 1.05,
        }}>{title}</div>
        {sub && <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 11, color: P.textDim,
          marginTop: 6, letterSpacing: '0.05em',
        }}>{sub}</div>}
      </div>
      {action}
    </div>
  );
}

function FormField({ label, children, required, span }) {
  return (
    <div style={{ gridColumn: span === '2' ? '1 / -1' : 'auto' }}>
      <label style={{
        display: 'block',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 9, color: P.textMuted,
        letterSpacing: '0.15em', textTransform: 'uppercase',
        marginBottom: 5,
      }}>{label} {required && <span style={{ color: P.amber }}>*</span>}</label>
      {children}
    </div>
  );
}

function Card({ title, children, danger }) {
  return (
    <div style={{
      background: P.bgCard,
      border: `1px solid ${danger ? P.red : P.border}`,
      padding: 18, position: 'relative',
    }}>
      <TC color={danger ? P.red : P.amber} />
      <div style={{
        fontFamily: 'Oswald, sans-serif',
        fontWeight: 600, fontSize: 14,
        color: P.text, textTransform: 'uppercase',
        letterSpacing: '0.08em', marginBottom: 10,
      }}>{title}</div>
      {children}
    </div>
  );
}

function Empty({ icon, title, sub }) {
  return (
    <div style={{
      padding: '60px 20px', textAlign: 'center',
      background: P.bgCard, border: `1px dashed ${P.border}`,
    }}>
      <div style={{ fontSize: 36, color: P.textMuted, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 14, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{title}</div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: P.textMuted }}>{sub}</div>
    </div>
  );
}

function TC({ color }) {
  const c = color || P.amber;
  const s = (pos) => {
    const out = { position: 'absolute', width: 10, height: 10, pointerEvents: 'none' };
    if (pos.includes('t')) { out.top = 0; out.borderTop = `1.5px solid ${c}`; }
    if (pos.includes('b')) { out.bottom = 0; out.borderBottom = `1.5px solid ${c}`; }
    if (pos.includes('l')) { out.left = 0; out.borderLeft = `1.5px solid ${c}`; }
    if (pos.includes('r')) { out.right = 0; out.borderRight = `1.5px solid ${c}`; }
    return out;
  };
  return (
    <React.Fragment>
      <span style={s('tl')} /><span style={s('tr')} />
      <span style={s('bl')} /><span style={s('br')} />
    </React.Fragment>
  );
}
window.AdminTC = TC;

function inpStyle() {
  return {
    width: '100%', background: P.bg,
    border: `1px solid ${P.border}`,
    color: P.text, padding: '8px 10px',
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 12, outline: 'none',
  };
}
function selStyle() { return Object.assign(inpStyle(), { appearance: 'none', cursor: 'pointer' }); }
function taStyle() {
  return Object.assign(inpStyle(), { resize: 'vertical', lineHeight: 1.5, fontFamily: 'JetBrains Mono, monospace' });
}
const btnPrimary = {
  background: P.amber, color: '#000', border: 'none',
  padding: '8px 16px', cursor: 'pointer',
  fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: 12,
  letterSpacing: '0.15em', textTransform: 'uppercase',
  whiteSpace: 'nowrap',
};
const btnSecondary = {
  background: P.bgCard, color: P.text,
  border: `1px solid ${P.border}`,
  padding: '8px 14px', cursor: 'pointer',
  fontFamily: 'Oswald, sans-serif', fontWeight: 600, fontSize: 11,
  letterSpacing: '0.12em', textTransform: 'uppercase',
  whiteSpace: 'nowrap',
};
const btnGhost = {
  background: 'none', color: P.textDim,
  border: `1px solid ${P.border}`,
  padding: '6px 12px', cursor: 'pointer',
  fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
  letterSpacing: '0.1em', textTransform: 'uppercase',
};
const btnDanger = {
  background: 'transparent', color: P.red,
  border: `1px solid ${P.red}`,
  padding: '8px 14px', cursor: 'pointer',
  fontFamily: 'Oswald, sans-serif', fontWeight: 600, fontSize: 11,
  letterSpacing: '0.12em', textTransform: 'uppercase',
  whiteSpace: 'nowrap',
};
const btnTiny = {
  background: 'transparent', color: P.textDim,
  border: `1px solid ${P.border}`,
  padding: '3px 6px', cursor: 'pointer',
  fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
  letterSpacing: '0.05em', textTransform: 'uppercase',
};
const txtMuted = {
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 11, color: P.textDim,
  lineHeight: 1.6, marginBottom: 12, marginTop: 0,
};

// ════════════════════════════════════════════════════════════════
// ADMIN APP
// ════════════════════════════════════════════════════════════════
function AdminApp() {
  const [authed, setAuthed] = useState(window.Store.isLoggedIn());
  const [tab, setTab] = useState('queue');
  const [editing, setEditing] = useState(null);
  const [stats, setStats] = useState({
    pending: window.Store.getPending().length,
    suggestions: window.Store.getSuggestions().length,
    manuales: window.Store.getManuales().length,
  });

  useEffect(() => {
    return window.Store.onChange(() => {
      setStats({
        pending: window.Store.getPending().length,
        suggestions: window.Store.getSuggestions().length,
        manuales: window.Store.getManuales().length,
      });
    });
  }, []);

  if (!authed) return <AdminLogin onLogin={() => setAuthed(true)} />;

  return (
    <AdminShell
      onLogout={() => { window.Store.logout(); setAuthed(false); }}
      tab={tab} setTab={setTab} stats={stats}
    >
      {tab === 'queue'    && <QueueTab onEdit={(p, mode) => setEditing({ arma: p, mode, source: p })} />}
      {tab === 'suggests' && <SuggestionsTab />}
      {tab === 'catalog'  && <CatalogTab onEdit={(a, mode) => setEditing({ arma: a, mode, source: null })} />}
      {tab === 'manuales' && <ManualesTab />}
      {tab === 'favorites'&& <FavoritesTab />}
      {tab === 'bulk'     && <BulkImportTab />}
      {tab === 'promos'   && <PromosTab />}
      {tab === 'pages'    && <PagesTab />}
      {tab === 'branding' && <BrandingTab />}
      {tab === 'settings' && <SettingsTab />}

      {editing && <ArmaForm
        arma={editing.arma}
        mode={editing.mode}
        source={editing.source}
        onSave={() => setEditing(null)}
        onCancel={() => setEditing(null)}
      />}
    </AdminShell>
  );
}
window.AdminApp = AdminApp;

// ════════════════════════════════════════════════════════════════
// SUGGESTIONS TAB — cola de sugerencias de cambios a fichas
// ════════════════════════════════════════════════════════════════
function SuggestionsTab() {
  const [items, setItems] = useState(window.Store.getSuggestions());
  const refresh = () => setItems(window.Store.getSuggestions());
  useEffect(() => window.Store.onChange(refresh), []);

  const accept = (s) => {
    const arma = window.findArma(s.armaId);
    if (!arma) { alert('El arma referenciada ya no existe.'); return; }
    if (s.field === 'precio') {
      if (!confirm(`¿Actualizar precio de "${arma.nombre}" a "${s.suggestedValue}"? Se guardará el anterior en el historial.`)) return;
      arma.priceExact = s.suggestedValue;
      window.Store.upsertArma(arma);
      window.Store.deleteSuggestion(s.id);
      alert('✓ Precio actualizado y registrado en historial.');
      return;
    }
    if (s.field === 'historia') {
      if (!confirm(`¿Reemplazar la historia de "${arma.nombre}"?`)) return;
      arma.historia = s.suggestedValue;
      window.Store.upsertArma(arma);
      window.Store.deleteSuggestion(s.id);
      return;
    }
    alert('Esta sugerencia requiere edición manual. Abre la ficha del arma en la tab CATÁLOGO y aplica el cambio.');
  };

  const reject = (s) => {
    if (!confirm('¿Descartar esta sugerencia?')) return;
    window.Store.deleteSuggestion(s.id);
  };

  return (
    <div>
      <SectionHead title="Sugerencias de cambios" sub={`${items.length} sugerencias a fichas existentes esperando revisión`} />
      {items.length === 0 ? (
        <Empty icon="✓" title="Sin sugerencias pendientes" sub="Cuando un usuario sugiera un cambio a una ficha desde la app pública, aparecerá aquí." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map(s => (
            <div key={s.id} style={{
              background: P.bgCard, border: `1px solid ${P.amber}`,
              padding: 18, position: 'relative',
            }}>
              <TC color={P.amber} />
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 140px', gap: 18, alignItems: 'flex-start',
              }}>
                <div>
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 9, color: P.amber,
                    letterSpacing: '0.18em', textTransform: 'uppercase',
                    marginBottom: 4,
                  }}>✎ SUGERENCIA · {new Date(s.submittedAt).toLocaleString('es-MX')} · CAMPO: {s.field}</div>
                  <div style={{
                    fontFamily: 'Oswald, sans-serif',
                    fontWeight: 700, fontSize: 18,
                    color: P.text, textTransform: 'uppercase',
                    marginBottom: 8,
                  }}>{s.armaNombre} <span style={{ color: P.textDim, fontSize: 12 }}>· #{String(s.armaId).padStart(3,'0')}</span></div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
                    <div style={{ background: P.bg, border: `1px solid ${P.border}`, padding: 10 }}>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: P.textMuted, letterSpacing: '0.15em', marginBottom: 4 }}>VALOR ACTUAL</div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: P.text, lineHeight: 1.5 }}>{s.currentValue || '(no proporcionado)'}</div>
                    </div>
                    <div style={{ background: P.bg, border: `1px solid ${P.amber}`, padding: 10 }}>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: P.amber, letterSpacing: '0.15em', marginBottom: 4 }}>SUGERIDO</div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: P.text, lineHeight: 1.5 }}>{s.suggestedValue}</div>
                    </div>
                  </div>

                  {s.source && (
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: P.textDim, marginBottom: 6 }}>
                      <b style={{ color: P.amber }}>FUENTE:</b> {s.source}
                    </div>
                  )}
                  {s.notes && (
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: P.textDim, marginBottom: 6, fontStyle: 'italic' }}>
                      "{s.notes}"
                    </div>
                  )}
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: P.textMuted, marginTop: 8 }}>
                    ━ POR <b style={{ color: P.text }}>{s.submitterName}</b>
                    {s.submitterEmail && <span> · ✉ {s.submitterEmail}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button onClick={() => accept(s)} style={btnPrimary}>✓ Aplicar</button>
                  <button onClick={() => reject(s)} style={btnDanger}>✕ Descartar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
window.SuggestionsTab = SuggestionsTab;

// ════════════════════════════════════════════════════════════════
// BULK IMPORT (CSV) — añadir/modificar masivamente con hojas de datos
// ════════════════════════════════════════════════════════════════
function BulkImportTab() {
  const [csvText, setCsvText] = useState('');
  const [mode, setMode] = useState('merge');
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = (ev) => setCsvText(ev.target.result);
    r.readAsText(file);
  };

  const doImport = () => {
    if (!csvText.trim()) { alert('Pega o carga un CSV primero.'); return; }
    if (mode === 'replace' && !confirm('Modo REEMPLAZAR: el catálogo actual será BORRADO y reemplazado por las filas del CSV. ¿Continuar?')) return;
    try {
      const out = window.Store.importCsv(csvText, mode);
      setResult(out);
      if (out.errors.length === 0) {
        alert(`✓ Importación exitosa: ${out.added} añadidas, ${out.updated} actualizadas.`);
      }
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  const downloadTemplate = () => {
    const headers = 'id,nombre,marca,tipo,pais,calibre,capacidad,peso,longitud,mecanismo,anio,era,img,avail,availLabel,priceExact,priceLvl,dcamRef,legalTit,legalDesc,disponibilidad,uses,alcance,precision,retroceso,capacidad_stat,manejo,poder,historia';
    const sample = ',Ejemplo Pistola,Marca X,pistola,México,9mm Parabellum,15+1,750g,185mm,"Semi-auto, striker",2025,moderno,,dcam,Uso civil — DCAM,"$10,000 MXN",2,REF DCAM ABC,Civil — DCAM,Descripción legal,DCAM CDMX;DCAM Monterrey,domicilio;club,60,70,45,75,80,62,Texto de la historia';
    const blob = new Blob([headers + '\n' + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'armado-mx-plantilla.csv';
    a.click(); URL.revokeObjectURL(url);
  };

  const downloadCurrent = () => {
    const csv = window.Store.exportCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'armado-mx-catalogo-' + new Date().toISOString().slice(0,10) + '.csv';
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div>
      <SectionHead title="Importar / Editar masivo (CSV)" sub="Carga una hoja de cálculo de Google Sheets o Excel exportada como CSV" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 20 }}>
        <Card title="① Descargar plantilla">
          <p style={txtMuted}>Plantilla en blanco con todas las columnas y un ejemplo de fila. Ábrela en Excel o Google Sheets y rellena.</p>
          <button onClick={downloadTemplate} style={btnSecondary}>📥 plantilla.csv</button>
        </Card>
        <Card title="② Descargar catálogo actual">
          <p style={txtMuted}>Exporta las {window.Store.getArmas().length} armas actuales para editarlas en una hoja y reimportarlas.</p>
          <button onClick={downloadCurrent} style={btnSecondary}>📥 catalogo-actual.csv</button>
        </Card>
      </div>

      <Card title="③ Importar CSV editado">
        <p style={txtMuted}>
          <b style={{ color: P.amber }}>MERGE</b> = añade nuevas filas (sin id) y actualiza existentes (con id).<br/>
          <b style={{ color: P.red }}>REPLACE</b> = borra el catálogo y lo reemplaza con el CSV completo.<br/>
          Columnas <b>uses</b> y <b>disponibilidad</b> aceptan múltiples valores separados por <code style={{ color: P.amber }}>;</code> (punto y coma).
        </p>

        <div style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: P.text, cursor: 'pointer' }}>
            <input type="radio" name="csvmode" checked={mode === 'merge'} onChange={() => setMode('merge')} /> MERGE (recomendado)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: P.red, cursor: 'pointer' }}>
            <input type="radio" name="csvmode" checked={mode === 'replace'} onChange={() => setMode('replace')} /> REPLACE
          </label>
        </div>

        <input type="file" accept=".csv,.txt" ref={fileRef} onChange={handleFile} style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
          color: P.text, marginBottom: 8,
        }} />
        <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)}
          placeholder="O pega aquí el CSV..."
          style={Object.assign({}, taStyle(), { minHeight: 180, fontSize: 10 })}
          rows={10} />
        <button onClick={doImport} disabled={!csvText.trim()}
          style={Object.assign({}, btnPrimary, { marginTop: 10, opacity: csvText.trim() ? 1 : 0.5 })}>
          ⬆ Procesar CSV
        </button>
      </Card>

      {result && (
        <div style={{ marginTop: 18 }}>
          <Card title="Resultado de la importación">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 12 }}>
              <div style={{ background: P.bg, border: `1px solid ${P.military}`, padding: 14, textAlign: 'center' }}>
                <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 28, fontWeight: 700, color: P.military }}>{result.added}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: P.textDim, letterSpacing: '0.15em' }}>AÑADIDAS</div>
              </div>
              <div style={{ background: P.bg, border: `1px solid ${P.amber}`, padding: 14, textAlign: 'center' }}>
                <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 28, fontWeight: 700, color: P.amber }}>{result.updated}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: P.textDim, letterSpacing: '0.15em' }}>ACTUALIZADAS</div>
              </div>
              <div style={{ background: P.bg, border: `1px solid ${result.errors.length ? P.red : P.border}`, padding: 14, textAlign: 'center' }}>
                <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 28, fontWeight: 700, color: result.errors.length ? P.red : P.textMuted }}>{result.errors.length}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: P.textDim, letterSpacing: '0.15em' }}>ERRORES</div>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div style={{ background: P.bg, border: `1px solid ${P.red}`, padding: 12, maxHeight: 200, overflowY: 'auto' }}>
                {result.errors.map((e, i) => (
                  <div key={i} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: P.text, padding: '4px 0' }}>
                    <span style={{ color: P.red }}>FILA {e.row}:</span> {e.reason}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
window.BulkImportTab = BulkImportTab;

// ════════════════════════════════════════════════════════════════
// PROMOS TAB — editor de slides del banner del Home
// ════════════════════════════════════════════════════════════════
function PromosTab() {
  const [promos, setPromos] = useState(window.Store.getPromos());
  const [editing, setEditing] = useState(null);
  const refresh = () => setPromos(window.Store.getPromos());
  useEffect(() => window.Store.onChange(refresh), []);

  const add = () => setEditing({
    id: '', eyebrow: '', title: '', subtitle: '', cta: '', ctaTarget: 'catalog',
    bgImage: '', bgColor: '#0d0f0c', accent: '#c9a227',
  });
  const del = (id) => {
    if (!confirm('¿Eliminar este slide?')) return;
    window.Store.deletePromo(id);
  };
  const move = (idx, dir) => {
    const arr = [...promos];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    window.Store.savePromos(arr);
  };

  return (
    <div>
      <SectionHead title="Slider de promociones" sub="Banners editables que aparecen al inicio de la Home" action={
        <button onClick={add} style={btnPrimary}>＋ Nuevo slide</button>
      } />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {promos.map((p, i) => (
          <div key={p.id} style={{
            background: p.bgColor || P.bgElev,
            border: `1px solid ${p.accent || P.amber}`,
            padding: 18,
            position: 'relative',
            display: 'grid', gridTemplateColumns: '1fr 200px', gap: 16,
          }}>
            <div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: p.accent || P.amber, letterSpacing: '0.2em', marginBottom: 4 }}>SLIDE {String(i+1).padStart(2,'0')} · {p.eyebrow}</div>
              <div style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: 22, color: P.text, textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 6, lineHeight: 1.1 }}>{p.title}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: P.textDim, lineHeight: 1.5, marginBottom: 8 }}>{p.subtitle}</div>
              <div style={{ display: 'inline-block', background: p.accent || P.amber, color: '#000', padding: '5px 12px', fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{p.cta} → {p.ctaTarget}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button onClick={() => setEditing({ ...p })} style={btnSecondary}>✎ Editar</button>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => move(i, -1)} disabled={i===0} style={Object.assign({}, btnTiny, { flex: 1 })}>▲</button>
                <button onClick={() => move(i, 1)} disabled={i===promos.length-1} style={Object.assign({}, btnTiny, { flex: 1 })}>▼</button>
              </div>
              <button onClick={() => del(p.id)} style={btnDanger}>✕ Eliminar</button>
            </div>
          </div>
        ))}
      </div>

      {editing && <PromoEditor promo={editing} onSave={() => setEditing(null)} onCancel={() => setEditing(null)} />}
    </div>
  );
}
window.PromosTab = PromosTab;

function PromoEditor({ promo, onSave, onCancel }) {
  const [f, setF] = useState(promo);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const bgFileRef = useRef(null);
  const uploadBg = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 400 * 1024) {
      if (!confirm('La imagen pesa ' + Math.round(file.size / 1024) + 'KB. ' +
        'Para mejor rendimiento en móvil se recomienda <400KB. ¿Continuar igualmente?')) return;
    }
    const r = new FileReader();
    r.onload = (ev) => set('bgImage', ev.target.result);
    r.readAsDataURL(file);
  };
  // Sólo URLs http(s) o data:image, sin caracteres que rompan el url("...") en CSS del slider
  const sanitizeBg = (v) => {
    v = (v || '').trim();
    if (!v) return '';
    if (!/^(https?:\/\/|data:image\/)/i.test(v)) return '';
    if (/["')]|\s/.test(v)) return '';
    return v;
  };
  const save = () => {
    if (!f.title) { alert('Falta el título del slide.'); return; }
    const clean = Object.assign({}, f, { bgImage: sanitizeBg(f.bgImage) });
    if (f.bgImage && !clean.bgImage) {
      if (!confirm('La imagen de fondo no es una URL http(s) o data:image válida y se ignorará. ¿Guardar de todas formas?')) return;
    }
    window.Store.upsertPromo(clean);
    onSave();
  };
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(7,8,10,0.92)', backdropFilter: 'blur(6px)',
      overflowY: 'auto', padding: '40px 20px',
    }}>
      <div style={{ maxWidth: 680, margin: '0 auto', background: P.bgCard, border: `1px solid ${P.amber}` }}>
        <div style={{ background: P.bgElev, padding: '14px 22px', borderBottom: `2px solid ${P.amber}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: 18, textTransform: 'uppercase' }}>
            {promo.id ? '✎ Editar slide' : '＋ Nuevo slide'}
          </div>
          <button onClick={onCancel} style={btnGhost}>✕ Cerrar</button>
        </div>
        <div style={{ padding: 22, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <FormField label="Eyebrow"><input value={f.eyebrow} onChange={(e) => set('eyebrow', e.target.value)} style={inpStyle()} placeholder="◆ ENCICLOPEDIA TÁCTICA · 2026" /></FormField>
          <FormField label="Texto del botón">
            <input value={f.cta} onChange={(e) => set('cta', e.target.value)} style={inpStyle()} placeholder="Explorar arsenal" />
          </FormField>
          <FormField label="Título principal" span="2">
            <input value={f.title} onChange={(e) => set('title', e.target.value)} style={inpStyle()} placeholder="Conoce las armas legales en México" />
          </FormField>
          <FormField label="Subtítulo / descripción" span="2">
            <textarea value={f.subtitle} onChange={(e) => set('subtitle', e.target.value)} style={taStyle()} rows={2} placeholder="Texto de apoyo, ~140 caracteres" />
          </FormField>
          <FormField label="Imagen de fondo (opcional)" span="2">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginTop: 4 }}>
              <div style={{
                width: 112, height: 63, background: P.bg,
                border: `1px dashed ${P.border}`, borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', color: P.textMuted, fontSize: 10, flexShrink: 0,
              }}>
                {f.bgImage
                  ? <img src={f.bgImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : 'Sin imagen'}
              </div>
              <div style={{ flex: 1 }}>
                <input ref={bgFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadBg} />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => bgFileRef.current.click()} style={btnPrimary}>📤 Subir imagen</button>
                  {f.bgImage && (
                    <button type="button" onClick={() => set('bgImage', '')} style={Object.assign({}, btnGhost, { color: '#ff8b8b' })}>
                      Quitar
                    </button>
                  )}
                </div>
                <div style={{ fontSize: 11, color: P.textMuted, marginTop: 8, lineHeight: 1.5 }}>
                  Recomendado: JPG/WebP horizontal ~1600×640, &lt;400KB. El texto se superpone con un degradado oscuro.<br/>
                  También puedes pegar una URL pública abajo.
                </div>
                <input value={f.bgImage || ''} onChange={(e) => set('bgImage', e.target.value)}
                  style={Object.assign({}, inpStyle(), { marginTop: 10 })}
                  placeholder="O pega una URL: https://...jpg" />
              </div>
            </div>
          </FormField>
          <FormField label="Color de fondo">
            <input type="color" value={f.bgColor || '#0d0f0c'} onChange={(e) => set('bgColor', e.target.value)} style={Object.assign({}, inpStyle(), { padding: 4, height: 38 })} />
          </FormField>
          <FormField label="Color de acento">
            <input type="color" value={f.accent || '#c9a227'} onChange={(e) => set('accent', e.target.value)} style={Object.assign({}, inpStyle(), { padding: 4, height: 38 })} />
          </FormField>
          <FormField label="Destino del botón">
            <select value={f.ctaTarget} onChange={(e) => set('ctaTarget', e.target.value)} style={selStyle()}>
              <option value="catalog">Catálogo</option>
              <option value="legal">Legalidad</option>
              <option value="submit">Proponer arma</option>
              <option value="faq">FAQ</option>
              <option value="about">Acerca</option>
              <option value="compare">Comparador</option>
            </select>
          </FormField>
        </div>
        <div style={{ padding: '14px 22px', borderTop: `1px solid ${P.border}`, background: P.bgElev, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onCancel} style={btnGhost}>Cancelar</button>
          <button onClick={save} style={btnPrimary}>💾 Guardar slide</button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// FAVORITES TAB — curaduría de armas "Favoritas del equipo"
// ════════════════════════════════════════════════════════════════
function FavoritesTab() {
  const [favs, setFavs] = useState(window.Store.getFavorites());
  const [q, setQ] = useState('');

  const save = (ids) => {
    setFavs(ids);
    window.Store.setFavorites(ids);
  };
  const toggle = (id) => save(favs.includes(id) ? favs.filter(x => x !== id) : [...favs, id]);
  const move = (id, dir) => {
    const idx = favs.indexOf(id);
    if (idx < 0) return;
    const ni = idx + dir;
    if (ni < 0 || ni >= favs.length) return;
    const arr = [...favs];
    [arr[idx], arr[ni]] = [arr[ni], arr[idx]];
    save(arr);
  };

  const armas = window.Store.getArmas();
  const query = q.trim().toLowerCase();
  const candidates = armas.filter(a =>
    !query ||
    a.nombre.toLowerCase().includes(query) ||
    a.marca.toLowerCase().includes(query) ||
    a.calibre.toLowerCase().includes(query)
  );

  const favArmas = favs.map(id => armas.find(a => a.id === id)).filter(Boolean);

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px' }}>
      <div style={{
        fontFamily: 'Oswald, sans-serif', fontWeight: 700,
        fontSize: 22, letterSpacing: '0.04em',
        textTransform: 'uppercase', marginBottom: 8, color: P.text,
      }}>★ Favoritos del equipo</div>
      <p style={{ fontSize: 13, color: P.textDim, marginBottom: 22, maxWidth: 700, lineHeight: 1.5 }}>
        Curaduría editorial: estas armas aparecen en el carrusel <b style={{ color: P.amber }}>"Favoritos de Armas M&S"</b> en el inicio de la app. Arrastra o usa las flechas para reordenar.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
        {/* COLUMNA: Favoritos actuales */}
        <div style={{
          background: P.bgCard, border: `1px solid ${P.border}`,
          padding: 16,
        }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11, color: P.amber, letterSpacing: '0.15em',
            textTransform: 'uppercase', marginBottom: 12,
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span>Seleccionadas · {favArmas.length}</span>
            {favArmas.length > 0 && (
              <button onClick={() => { if (confirm('¿Vaciar la lista de favoritos?')) save([]); }} style={{
                background: 'none', border: 'none', color: P.textMuted,
                fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
              }}>Vaciar todas</button>
            )}
          </div>
          {favArmas.length === 0 ? (
            <div style={{
              padding: 30, textAlign: 'center',
              border: `1px dashed ${P.border}`,
              color: P.textMuted, fontFamily: 'JetBrains Mono, monospace',
              fontSize: 12, lineHeight: 1.5,
            }}>
              No hay favoritos.<br/>Añade desde la columna de la derecha.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {favArmas.map((a, i) => (
                <div key={a.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: 8, background: P.bgElev,
                  border: `1px solid ${P.border}`,
                  borderLeft: `3px solid ${P.amber}`,
                }}>
                  <span style={{
                    fontFamily: 'Oswald, sans-serif', fontWeight: 700,
                    fontSize: 14, color: P.amber, minWidth: 22,
                  }}>{String(i + 1).padStart(2, '0')}</span>
                  <img src={a.img} alt="" style={{
                    width: 40, height: 32, objectFit: 'contain',
                    background: P.bg,
                  }} onError={(e) => { e.target.src = window.armaPlaceholder(a); e.target.onerror = null; }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: 'Oswald, sans-serif', fontWeight: 600,
                      fontSize: 13, color: P.text,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{a.nombre}</div>
                    <div style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 10, color: P.textMuted, letterSpacing: '0.06em',
                    }}>{a.marca} · {a.calibre}</div>
                  </div>
                  <button onClick={() => move(a.id, -1)} disabled={i === 0} style={favBtn(i === 0)}>▲</button>
                  <button onClick={() => move(a.id, 1)} disabled={i === favArmas.length - 1} style={favBtn(i === favArmas.length - 1)}>▼</button>
                  <button onClick={() => toggle(a.id)} style={Object.assign({}, favBtn(false), { color: '#ff8b8b' })}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* COLUMNA: Buscar y añadir */}
        <div style={{ background: P.bgCard, border: `1px solid ${P.border}`, padding: 16 }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11, color: P.amber, letterSpacing: '0.15em',
            textTransform: 'uppercase', marginBottom: 12,
          }}>Catálogo · añadir armas</div>
          <input type="text" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, marca o calibre..."
            style={Object.assign({}, inpStyle(), { marginBottom: 12 })} />
          <div style={{
            maxHeight: 520, overflowY: 'auto',
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            {candidates.map(a => {
              const active = favs.includes(a.id);
              return (
                <button key={a.id} onClick={() => toggle(a.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: 7, background: active ? P.bgElev : P.bg,
                  border: `1px solid ${active ? P.amber : P.border}`,
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                  transition: 'all 0.15s',
                }}>
                  <img src={a.img} alt="" style={{ width: 34, height: 28, objectFit: 'contain', background: P.bgElev }}
                    onError={(e) => { e.target.src = window.armaPlaceholder(a); e.target.onerror = null; }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: 'Oswald, sans-serif', fontWeight: 600,
                      fontSize: 12, color: P.text,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{a.nombre}</div>
                    <div style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 9, color: P.textMuted, letterSpacing: '0.06em',
                    }}>{a.marca} · {a.calibre}</div>
                  </div>
                  <span style={{
                    color: active ? '#000' : P.amber,
                    background: active ? P.amber : 'transparent',
                    border: `1px solid ${P.amber}`,
                    padding: '4px 8px', fontSize: 10,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 700, letterSpacing: '0.05em',
                  }}>{active ? '★ AÑADIDA' : '＋ Añadir'}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
function favBtn(disabled) {
  return {
    background: 'none', border: `1px solid ${P.border}`,
    color: disabled ? P.textMuted : P.text,
    cursor: disabled ? 'not-allowed' : 'pointer',
    width: 26, height: 26, fontSize: 11, lineHeight: 1,
    fontFamily: 'JetBrains Mono, monospace',
  };
}
window.FavoritesTab = FavoritesTab;

// ════════════════════════════════════════════════════════════════
// BRANDING TAB — logo de la app + texto del header
// ════════════════════════════════════════════════════════════════
function BrandingTab() {
  const [cfg, setCfg] = useState(window.Store.getAppConfig());
  const fileRef = useRef(null);

  const save = (patch) => {
    const next = Object.assign({}, cfg, patch);
    setCfg(next);
    window.Store.setAppConfig(patch);
  };

  const upload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 200 * 1024) {
      if (!confirm('La imagen pesa ' + Math.round(file.size/1024) + 'KB. ' +
        'Para mejor rendimiento en mobile se recomienda <200KB. ¿Continuar igualmente?')) return;
    }
    const r = new FileReader();
    r.onload = (ev) => save({ logo: ev.target.result });
    r.readAsDataURL(file);
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 28 }}>
      <div style={{
        fontFamily: 'Oswald, sans-serif', fontWeight: 700,
        fontSize: 22, letterSpacing: '0.04em',
        textTransform: 'uppercase', marginBottom: 8, color: P.text,
      }}>◆ Branding de la app</div>
      <p style={{ fontSize: 13, color: P.textDim, marginBottom: 22, lineHeight: 1.5, maxWidth: 640 }}>
        Cambia el logo del header y el texto que ven los usuarios. Esto afecta solo la versión móvil — el panel admin mantiene su propio branding.
      </p>

      {/* PREVIEW */}
      <div style={{
        background: 'rgba(13,15,12,0.92)',
        border: `1px solid ${P.border}`,
        borderRadius: 4,
        padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 24,
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10, color: P.textMuted,
          letterSpacing: '0.12em',
          marginRight: 12, textTransform: 'uppercase',
        }}>PREVIEW MÓVIL ▸</div>
        {cfg.logo ? (
          <img src={cfg.logo} alt="logo" style={{
            width: 28, height: 28, objectFit: 'contain', borderRadius: 6,
          }} />
        ) : (
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28,
            border: `1.5px dashed ${P.amber}`, borderRadius: 6,
            color: P.amber, fontFamily: 'JetBrains Mono, monospace',
            fontSize: 9, letterSpacing: '0.1em',
            background: 'rgba(201,162,39,0.08)',
          }}>LOGO</span>
        )}
        <div style={{
          fontFamily: 'Oswald, sans-serif', fontWeight: 700,
          fontSize: 16, color: P.amber, letterSpacing: '0.08em',
        }}>
          {(cfg.logoText || 'ARMADO en MX').split(/\s+(?=en\s+MX)/i).map((part, i) =>
            i === 0
              ? <span key="t">{part}</span>
              : <span key="s" style={{ color: P.textDim, fontWeight: 400, fontSize: '0.72em', marginLeft: 4 }}>{part}</span>
          )}
        </div>
      </div>

      {/* LOGO uploader */}
      <FormField label="Logo de la app" span="2">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginTop: 4 }}>
          <div style={{
            width: 72, height: 72, background: P.bg,
            border: `1px dashed ${P.border}`, borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: P.textMuted, fontSize: 10,
          }}>
            {cfg.logo ? <img src={cfg.logo} alt="" style={{ maxWidth: '85%', maxHeight: '85%', objectFit: 'contain' }} /> : 'Sin logo'}
          </div>
          <div style={{ flex: 1 }}>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={upload} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => fileRef.current.click()} style={btnPrimary}>📤 Subir imagen</button>
              {cfg.logo && (
                <button onClick={() => save({ logo: '' })} style={Object.assign({}, btnGhost, { color: '#ff8b8b' })}>
                  Quitar logo
                </button>
              )}
            </div>
            <div style={{ fontSize: 11, color: P.textMuted, marginTop: 8, lineHeight: 1.5 }}>
              Recomendado: PNG con fondo transparente, cuadrado, mínimo 128×128px, &lt;200KB.<br/>
              También puedes pegar una URL pública en el campo de abajo.
            </div>
            <input value={cfg.logo || ''} onChange={(e) => save({ logo: e.target.value })}
              style={Object.assign({}, inpStyle(), { marginTop: 10 })}
              placeholder="O pega una URL: https://..." />
          </div>
        </div>
      </FormField>

      <FormField label="Texto del header">
        <input value={cfg.logoText || ''} onChange={(e) => save({ logoText: e.target.value })}
          style={inpStyle()} placeholder="ARMADO en MX" />
        <div style={{ fontSize: 11, color: P.textMuted, marginTop: 6 }}>
          Tip: la segunda palabra ("en MX") se muestra más pequeña automáticamente.
        </div>
      </FormField>

      <FormField label="Nombre del equipo (carrusel de favoritos)">
        <input value={cfg.teamName || ''} onChange={(e) => save({ teamName: e.target.value })}
          style={inpStyle()} placeholder="Armas M&S" />
        <div style={{ fontSize: 11, color: P.textMuted, marginTop: 6 }}>
          Aparece como "Favoritos de <b>{cfg.teamName || 'Armas M&S'}</b>" en la home.
        </div>
      </FormField>
    </div>
  );
}
window.BrandingTab = BrandingTab;

// ════════════════════════════════════════════════════════════════
// MANUALES / INVENTARIOS — biblioteca de PDFs oficiales DCAM-SEDENA
// ════════════════════════════════════════════════════════════════
function fmtFecha(f) {
  if (!f) return '—';
  const d = new Date(f + (f.length === 10 ? 'T12:00:00' : ''));
  if (isNaN(d)) return f;
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
}

function ManualesTab() {
  const [manuales, setManuales] = useState(window.Store.getManuales());
  const [editing, setEditing] = useState(null); // manual object or 'new'
  const refresh = () => setManuales(window.Store.getManuales());

  const add = () => setEditing({ nombre: '', fecha: '', url: '', fileName: '' });
  const remove = (m) => {
    if (!confirm('¿Eliminar el inventario "' + (m.nombre || 'sin nombre') + '"?\n\nLas fichas que lo referencian dejarán de mostrar el enlace al PDF.')) return;
    window.Store.deleteManual(m.id);
    refresh();
  };

  // cuántas armas referencian cada manual (en su historial de precios)
  const usageCount = (mid) => {
    let n = 0;
    window.Store.getArmas().forEach(a => {
      const h = window.Store.getPriceHistory(a.id) || [];
      if (h.some(e => e.manualId === mid)) n++;
    });
    return n;
  };

  return (
    <div>
      <SectionHead
        title="Inventarios oficiales DCAM-SEDENA"
        sub={`${manuales.length} ${manuales.length === 1 ? 'PDF cargado' : 'PDFs cargados'} · fuente verificable de los precios del catálogo`}
        action={<button onClick={add} style={btnPrimary}>＋ Cargar inventario</button>}
      />

      <div style={{
        background: 'rgba(201,162,39,0.06)',
        border: `1px solid ${P.border}`, borderLeft: `3px solid ${P.amber}`,
        padding: '12px 16px', marginBottom: 22,
        fontSize: 12, color: P.textDim, lineHeight: 1.6,
      }}>
        <b style={{ color: P.amber }}>◆ Cómo funciona (PDFs en el repositorio):</b> coloca cada PDF oficial de la DCAM-SEDENA
        en la carpeta <code style={{ color: P.text, fontFamily: 'JetBrains Mono, monospace' }}>inventarios/</code> del repositorio
        y aquí registra su <b>nombre</b>, <b>fecha</b> y <b>ruta relativa</b> (ej. <code style={{ color: P.text, fontFamily: 'JetBrains Mono, monospace' }}>inventarios/dcam-existencias-2025-10-03.pdf</code>).
        Así viajan con el despliegue, quedan versionados en git y los ve cualquier usuario.
        El inventario más reciente es la <b>fuente principal de precios</b>; para registrar el precio de cada arma por inventario, edítala en <b>CATÁLOGO</b>.
      </div>

      {manuales.length === 0 ? (
        <Empty icon="📄" title="Sin inventarios cargados" sub="Carga el primer PDF oficial de la DCAM para empezar a referenciar precios." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {manuales.map(m => {
            const used = usageCount(m.id);
            return (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: P.bgCard, border: `1px solid ${P.border}`,
                padding: '12px 16px', position: 'relative',
              }}>
                <div style={{
                  width: 38, height: 46, flexShrink: 0,
                  border: `1px solid ${P.amber}`, color: P.amber,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 8, letterSpacing: '0.05em',
                  background: 'rgba(201,162,39,0.06)',
                }}>
                  <span style={{ fontSize: 16 }}>▦</span>PDF
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'Oswald, sans-serif', fontWeight: 600, fontSize: 15,
                    color: P.text, textTransform: 'uppercase', letterSpacing: '0.03em',
                  }}>{m.nombre || 'Inventario sin nombre'}</div>
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                    color: P.textDim, marginTop: 3, letterSpacing: '0.04em',
                  }}>
                    📅 {fmtFecha(m.fecha)}
                    {m.fileName ? ' · ' + m.fileName : ''}
                    {' · '}
                    {used > 0
                      ? <span style={{ color: P.amber }}>{used} {used === 1 ? 'arma referencia' : 'armas referencian'}</span>
                      : <span>sin referencias aún</span>}
                  </div>
                </div>
                {m.url ? (
                  <a href={m.url} target="_blank" rel="noopener" style={Object.assign({}, btnGhost, {
                    textDecoration: 'none', display: 'inline-block',
                  })}>↗ Abrir PDF</a>
                ) : (
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#ff8b8b' }}>⚠ sin archivo</span>
                )}
                <button onClick={() => setEditing(m)} style={btnGhost}>✎ Editar</button>
                <button onClick={() => remove(m)} style={Object.assign({}, btnGhost, { color: '#ff8b8b' })}>✕</button>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <ManualEditor
          manual={editing}
          onSave={() => { setEditing(null); refresh(); }}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}
window.ManualesTab = ManualesTab;

function ManualEditor({ manual, onSave, onCancel }) {
  const [f, setF] = useState({
    id: manual.id,
    nombre: manual.nombre || '',
    fecha: manual.fecha || '',
    url: manual.url || '',
    fileName: manual.fileName || '',
  });
  const fileRef = useRef(null);
  const set = (k, v) => setF(prev => Object.assign({}, prev, { [k]: v }));

  const upload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
      if (!confirm('El archivo no parece ser un PDF. ¿Cargarlo de todas formas?')) return;
    }
    const mb = file.size / (1024 * 1024);
    if (mb > 2) {
      if (!confirm('El PDF pesa ' + mb.toFixed(1) + ' MB. Guardarlo dentro de la app puede agotar el espacio del navegador.\n\nRecomendado: súbelo a Drive/servidor y pega su enlace público en el campo URL.\n\n¿Cargar el archivo de todas formas?')) {
        e.target.value = '';
        return;
      }
    }
    const r = new FileReader();
    r.onload = (ev) => setF(prev => Object.assign({}, prev, { url: ev.target.result, fileName: file.name }));
    r.readAsDataURL(file);
  };

  const save = () => {
    if (!f.nombre.trim()) { alert('Ponle un nombre al inventario (ej. "Catálogo DCAM · Q4 2025").'); return; }
    if (!f.fecha) { alert('Indica la fecha del inventario.'); return; }
    if (!f.url) { alert('Sube el PDF o pega su enlace público.'); return; }
    window.Store.upsertManual(f);
    onSave();
  };

  const isData = f.url && f.url.startsWith('data:');

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(7,8,10,0.92)', backdropFilter: 'blur(6px)',
      overflowY: 'auto', padding: '40px 20px',
    }}>
      <div style={{
        maxWidth: 620, margin: '0 auto', background: P.bgCard,
        border: `1px solid ${P.amber}`, boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
      }}>
        <div style={{
          background: P.bgElev, padding: '16px 22px',
          borderBottom: `2px solid ${P.amber}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: P.amber, letterSpacing: '0.2em' }}>
              {manual.id ? '✎ EDITAR INVENTARIO' : '＋ CARGAR INVENTARIO'}
            </div>
            <div style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: 20, textTransform: 'uppercase' }}>
              {f.nombre || 'Inventario DCAM-SEDENA'}
            </div>
          </div>
          <button onClick={onCancel} style={btnGhost}>✕ Cancelar</button>
        </div>

        <div style={{ padding: 22, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <FormField label="Nombre del inventario" required span="2">
            <input value={f.nombre} onChange={(e) => set('nombre', e.target.value)} style={inpStyle()}
              placeholder="Catálogo de precios DCAM · 4° trimestre 2025" />
          </FormField>
          <FormField label="Fecha del inventario" required>
            <input type="date" value={f.fecha} onChange={(e) => set('fecha', e.target.value)} style={inpStyle()} />
          </FormField>
          <FormField label="Vista previa fecha">
            <div style={{
              padding: '8px 10px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
              color: P.amber, border: `1px solid ${P.border}`, background: P.bg,
            }}>{fmtFecha(f.fecha)}</div>
          </FormField>

          <FormField label="Ruta del PDF en el repositorio (recomendado)" required span="2">
            <input value={isData ? '' : f.url} onChange={(e) => set('url', e.target.value)} style={inpStyle()}
              placeholder="inventarios/dcam-existencias-2025-10-03.pdf"
              disabled={isData} />
            <div style={{ fontSize: 11, color: P.textMuted, marginTop: 6, lineHeight: 1.55 }}>
              Ruta relativa a un PDF dentro del repo (carpeta <code style={{ fontFamily: 'JetBrains Mono, monospace', color: P.textDim }}>inventarios/</code>),
              o un enlace público (Drive, servidor, etc.).
              {isData && (
                <React.Fragment>
                  {' '}Hay un archivo cargado en la app; para usar una ruta o enlace, primero
                  <button onClick={() => setF(prev => Object.assign({}, prev, { url: '', fileName: '' }))}
                    style={{ background: 'none', border: 'none', color: P.amber, cursor: 'pointer', textDecoration: 'underline', padding: 0, marginLeft: 4, font: 'inherit' }}>
                    quita el archivo
                  </button>.
                </React.Fragment>
              )}
            </div>
            {f.url && !isData && (
              <a href={f.url} target="_blank" rel="noopener" style={Object.assign({}, btnGhost, { textDecoration: 'none', marginTop: 8, display: 'inline-block' })}>↗ Abrir / verificar</a>
            )}
          </FormField>

          <FormField label="Alternativa: cargar el archivo en la app (borrador local)" span="2">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <input ref={fileRef} type="file" accept="application/pdf,.pdf" style={{ display: 'none' }} onChange={upload} />
              <button onClick={() => fileRef.current.click()} style={btnSecondary}>📤 Subir PDF al navegador</button>
              {isData && (
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: P.text }}>
                  ✓ PDF cargado{f.fileName ? ' · ' + f.fileName : ''}
                </span>
              )}
              {isData && (
                <a href={f.url} target="_blank" rel="noopener" style={Object.assign({}, btnGhost, { textDecoration: 'none' })}>↗ Ver</a>
              )}
            </div>
            <div style={{ fontSize: 11, color: P.textMuted, marginTop: 6, lineHeight: 1.5 }}>
              Solo para pruebas rápidas: el archivo queda en este navegador (no se versiona ni lo ven otros usuarios) y el espacio es limitado. Para producción, usa la ruta del repo de arriba.
            </div>
          </FormField>
        </div>

        <div style={{
          padding: '14px 22px', borderTop: `1px solid ${P.border}`, background: P.bgElev,
          display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          <button onClick={onCancel} style={btnGhost}>Cancelar</button>
          <button onClick={save} style={btnPrimary}>💾 Guardar inventario</button>
        </div>
      </div>
    </div>
  );
}
window.ManualEditor = ManualEditor;

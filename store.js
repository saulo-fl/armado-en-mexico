// Armado en México — Store (persistencia en localStorage)
// Mantiene catálogo, cola de pendientes, contenido editable de páginas y auth admin.
// Compartido entre app pública y admin via mismo origen + localStorage.

(function(){
  const K = {
    armas:       'amx_armas_v2',
    pending:     'amx_pending_v2',
    pages:       'amx_pages_v4',
    admin:       'amx_admin_v2',
    rejected:    'amx_rejected_v2',
    visits:      'amx_visits_v2',
    priceHist:   'amx_priceHist_v2',
    promos:      'amx_promos_v2',
    suggestions: 'amx_suggestions_v2',
    favorites:   'amx_favorites_v2',
    ratings:     'amx_ratings_v2',
    appConfig:   'amx_appconfig_v2',
    manuales:    'amx_manuales_v2',
  };

  const DEFAULT_APP_CONFIG = {
    logo: 'logo.png',        // borrador de logo (reemplazable desde admin)
    logoText: 'ARMADO en MX', // texto del header (si no hay logo)
    teamName: 'Armas M&S',   // nombre del equipo para "Favoritos de"
  };

  // limpia versiones anteriores para evitar que un catálogo viejo (con URLs rotas) se quede atascado
  try {
    ['amx_armas_v1','amx_pending_v1','amx_pages_v1','amx_admin_v1','amx_rejected_v1','amx_visits_v1','amx_priceHist_v1','amx_promos_v1','amx_suggestions_v1']
      .forEach(k => { try { localStorage.removeItem(k); } catch(e) {} });
  } catch(e) {}

  const DEFAULT_PW = 'armado2026';

  const DEFAULT_PROMOS = [
    {
      id: 'p1',
      eyebrow: '◆ ENCICLOPEDIA TÁCTICA · 2026',
      title: 'Conoce las armas legales en México',
      subtitle: 'Catálogo divulgativo con información oficial DCAM-SEDENA. Sin fines de lucro.',
      cta: 'Explorar arsenal',
      ctaTarget: 'catalog',
      bgImage: '',
      bgColor: '#0d0f0c',
      accent: '#c9a227',
    },
    {
      id: 'p2',
      eyebrow: '⚖ ASESORÍA LEGAL',
      title: 'Trámite SEDENA con abogado',
      subtitle: 'Trámite acompañado por un abogado externo especializado, bajo su propia cédula profesional. Armas M&S facilita el contacto.',
      cta: 'Cotizar por WhatsApp',
      ctaTarget: 'legal',
      bgImage: '',
      bgColor: '#161a14',
      accent: '#c9a227',
    },
    {
      id: 'p3',
      eyebrow: '＋ COLABORA',
      title: '¿Conoces un arma que falta?',
      subtitle: 'Envíala al curador para revisión y se publicará en el catálogo.',
      cta: 'Proponer arma',
      ctaTarget: 'submit',
      bgImage: '',
      bgColor: '#1c211a',
      accent: '#c9a227',
    },
  ];

  // ── INVENTARIOS OFICIALES (PDFs versionados en el repo) ──────────────
  // Fuente de verdad en data-precios.js (window.AMX_MANUALES_SEED). El
  // arreglo de abajo es solo respaldo por si ese archivo no cargó.
  const DEFAULT_MANUALES = (window.AMX_MANUALES_SEED && window.AMX_MANUALES_SEED.length)
    ? window.AMX_MANUALES_SEED
    : [
    {
      id: 'man_dcam_2025_10_03',
      nombre: 'Existencias de armas DCAM · 3 de octubre 2025',
      fecha: '2025-10-03',
      url: 'inventarios/dcam-existencias-2025-10-03.pdf',
      fileName: 'dcam-existencias-2025-10-03.pdf',
      addedAt: '2025-10-03T12:00:00.000Z',
      primary: true,
    },
  ];
  // Historial de precios sembrado por arma (window.AMX_PRICE_HISTORY_SEED)
  const PRICE_HISTORY_SEED = window.AMX_PRICE_HISTORY_SEED || {};

  const DEFAULT_PAGES = {
    legal: {
      eyebrow: '§ LEGALIDAD · MX',
      title: 'Tenencia legal de armas de fuego',
      intro: 'Resumen de los requisitos y pasos para la posesión legal en México conforme a la Ley Federal de Armas de Fuego y Explosivos.',
      requisitos: [
        'INE / IFE vigente',
        'CURP impresa',
        'RFC (constancia SAT)',
        'Comprobante de domicilio (no mayor a 3 meses)',
        'Constancia de no antecedentes penales',
        'Examen toxicológico (algunos casos)',
        'Acta de nacimiento',
      ],
      pasos: [
        { t: 'Registro en plataforma SEDENA', d: 'Crear cuenta en el portal oficial de Defensa Nacional y completar perfil con tus datos.' },
        { t: 'Solicitud de licencia',         d: 'Pedir Licencia Particular (uso doméstico) o de tiro/cacería según el caso. Pago de derechos.' },
        { t: 'Cita en la DCAM',                d: 'Agendar visita al Campo Militar No. 1 (CDMX) o sede Monterrey. Llevar documentación completa.' },
        { t: 'Selección y compra',             d: 'Elegir arma del catálogo oficial. La DCAM es el único punto legal de adquisición civil de armas de fuego en México.' },
        { t: 'Registro federal del arma',      d: 'Toda arma adquirida queda registrada a tu nombre en el Registro Federal de Armas (RFA).' },
      ],
      whatsapp_phone: '525555555555',
      whatsapp_msg: 'Hola, me interesa asesoría para trámite SEDENA',
      whatsapp_pitch: 'El acompañamiento legal para el trámite SEDENA es prestado por un abogado externo especializado, en lo individual y bajo su propia cédula profesional. Armas M&S no es despacho jurídico y únicamente facilita el contacto con el profesional.',
    },
    faq: [
      { q: '¿Necesito permiso de la SEDENA para una arma traumática?', a: 'No. Las armas traumáticas (HDP 50, Secure 68P y HDX 68) son dispositivos menos letales accionados por gas CO₂; al no usar pólvora no son armas de fuego y, conforme al Artículo 13 de la LFAFE —que permite dispositivos de hasta 140 Joules de energía—, no requieren permiso ni registro ante la SEDENA. Puedes adquirirlas siendo mayor de edad.' },
      { q: '¿Puedo adquirir una arma traumática directamente con ustedes?', a: 'Sí. Las armas traumáticas son los únicos tres modelos de armamento que comercializamos y puedes adquirirlas directamente en armasmys.com, sin trámite ante la SEDENA. Las armas de fuego del resto de la app se muestran solo con fines informativos y de transparencia.' },
      { q: '¿Las armas traumáticas son legales en todo México?', a: 'Su posesión es legal para mayores de edad por estar muy por debajo del límite de 140 Joules del Artículo 13 de la LFAFE (desarrollan entre 13 y 40 Joules). No obstante, el Artículo 12 remite a los códigos penales de cada estado, por lo que las reglas de traslado pueden variar: algunos estados (como Morelos) reconocen la defensa personal como fin lícito y otros (como la CDMX) exigen acreditar un motivo lícito. Verifica la normativa local antes de trasladarla o usarla.' },
      { q: '¿Puedo comprar un arma en cualquier tienda?', a: 'No. En México la única forma legal de adquirir un arma de fuego es a través de la DCAM (Dirección de Comercialización de Armamento y Municiones de la SEDENA), ubicada en el Campo Militar No. 1 de CDMX y en sede Monterrey.' },
      { q: '¿Cuánto cuesta tramitar la licencia?', a: 'El costo de derechos varía por tipo de licencia. La Licencia Particular (uso doméstico) y la de tiro/cacería tienen tarifas oficiales publicadas por SEDENA. El trámite básico ronda los $1,000 a $3,000 MXN sin incluir el arma.' },
      { q: '¿Qué calibres puedo tener como civil?', a: 'Para uso doméstico: pistolas .380 ACP máximo, revólveres .38 Special máximo, escopetas hasta calibre 12, rifles deportivos en calibres permitidos. El 9mm Parabellum requiere licencia de tiro/cacería en club registrado.' },
      { q: '¿Puedo portar mi arma en la vía pública?', a: 'Por regla general NO. La Licencia Particular solo permite tenencia en domicilio. La portación requiere Licencia Particular de Portación (muy restrictiva, casi nunca otorgada) o pertenecer a corporación de seguridad con licencia colectiva.' },
      { q: '¿Por qué hay armas que solo puede tener el ejército?', a: 'La Ley Federal de Armas de Fuego clasifica como uso exclusivo de fuerzas armadas todos los fusiles automáticos, calibres militares de alto poder, explosivos, y subfusiles. Los civiles no pueden poseerlos bajo ninguna circunstancia.' },
      { q: '¿Cuántas armas puedo tener registradas?', a: 'Con Licencia Particular se permite hasta una pistola/revólver y dos armas largas (rifles/escopetas) por domicilio, con calibres y características restringidas. Coleccionistas registrados pueden tener más con licencia especial.' },
      { q: '¿Las balas se compran igual?', a: 'Sí, las municiones también se adquieren exclusivamente en DCAM, con tu licencia y registro de arma vigentes. Existe un límite anual de adquisición por calibre.' },
      { q: '¿Qué pasa si me roban mi arma?', a: 'Debes reportarlo de inmediato al Ministerio Público y notificar a la SEDENA por el portal correspondiente. No reportar el robo puede acarrear responsabilidad legal si el arma es utilizada en un delito.' },
      { q: '¿Cuál es la diferencia entre Licencia y Permiso?', a: 'La Licencia es el documento que permite tener armas registradas. El Permiso General de Portación es para cuerpos colectivos (corporaciones de seguridad). Permisos extraordinarios existen pero son excepcionales.' },
    ],
    about: {
      eyebrow: '◆ ACERCA DE',
      title: 'Armado en México',
      mision: 'Divulgar de forma rigurosa la información técnica, histórica y legal sobre las armas de fuego disponibles para civiles en México. Una enciclopedia para el coleccionista, el deportista, el cazador, el aficionado y el ciudadano responsable.',
      autor: 'Saulo Flores',
      empresa: 'Armas M&S',
      bio: 'Catálogo mantenido con base en información oficial de DCAM, SEDENA y publicaciones técnicas de los fabricantes.',
      foto: 'imagenes/saulo-flores.png', // URL de foto del autor
      aviso: 'Las armas de fuego de este catálogo se muestran únicamente con fines informativos y de transparencia; no se intermedia en su adquisición, que solo puede realizarse a través de la DCAM-SEDENA. Las únicas que comercializamos directamente son las tres armas traumáticas (menos letales), disponibles en armasmys.com.',
      disclaimerOficial: 'Armas M&S no forma parte de SEDENA, DCAM ni de ninguna dependencia del gobierno mexicano. No comercializamos armas de fuego, municiones ni accesorios para ellas: las armas de fuego se muestran solo con fines informativos y de transparencia. Lo único que comercializamos directamente son las tres armas traumáticas menos letales. Tampoco gestionamos licencias, permisos ni trámites administrativos. Armas M&S no presta servicios jurídicos por sí mismo: la asesoría legal sobre el proceso SEDENA es prestada de forma independiente por un abogado externo especializado, bajo su propia cédula profesional. Nuestra función se limita a facilitar el contacto entre el interesado y dicho profesional; los honorarios y términos se acuerdan directamente con el abogado.',
    },
  };

  function read(k, fallback) {
    try {
      const v = localStorage.getItem(k);
      return v == null ? fallback : JSON.parse(v);
    } catch (e) {
      console.warn('[Store] error reading', k, e);
      return fallback;
    }
  }
  function write(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); }
    catch (e) { console.warn('[Store] error writing', k, e); }
  }

  const Store = {
    // ─── INIT ─────────────────────────────────────────────
    init() {
      // si no hay armas guardadas, sembrar con DB seed
      if (!localStorage.getItem(K.armas)) {
        write(K.armas, window.DB);
      } else {
        // override window.DB con el array guardado
        const saved = read(K.armas, window.DB);
        // Migración: si img guardada es placeholder SVG o vacía, usar la del seed (data.js)
        const seedById = {};
        (window.DB || []).forEach(s => { seedById[s.id] = s; });
        let migrated = 0;
        saved.forEach(a => {
          const isPlaceholder = !a.img || (typeof a.img === 'string' && a.img.startsWith('data:image/svg+xml'));
          const seed = seedById[a.id];
          if (isPlaceholder && seed && seed.img && !seed.img.startsWith('data:image/svg+xml')) {
            a.img = seed.img;
            migrated++;
          }
          if (!a.img) a.img = window.armaPlaceholder(a);
        });
        if (migrated > 0) {
          write(K.armas, saved);
          console.log('[Store] migración imágenes:', migrated, 'armas actualizadas con fotos reales');
        }
        // mantener referencia: vaciar y rellenar
        window.DB.length = 0;
        saved.forEach(a => window.DB.push(a));
      }
      // sembrar páginas si no existen
      if (!localStorage.getItem(K.pages)) write(K.pages, DEFAULT_PAGES);
      if (!localStorage.getItem(K.pending)) write(K.pending, []);
      if (!localStorage.getItem(K.rejected)) write(K.rejected, []);
      if (!localStorage.getItem(K.visits)) write(K.visits, {});
      if (!localStorage.getItem(K.priceHist)) write(K.priceHist, {});
      if (!localStorage.getItem(K.promos)) write(K.promos, DEFAULT_PROMOS);
      if (!localStorage.getItem(K.suggestions)) write(K.suggestions, []);
      if (!localStorage.getItem(K.admin)) write(K.admin, { password: DEFAULT_PW, loggedIn: false });
      if (!localStorage.getItem(K.favorites)) write(K.favorites, []);
      if (!localStorage.getItem(K.ratings)) write(K.ratings, {});
      if (!localStorage.getItem(K.appConfig)) write(K.appConfig, DEFAULT_APP_CONFIG);
    },

    // ─── ARMAS ────────────────────────────────────────────
    getArmas() { return read(K.armas, window.DB); },
    saveArmas(arr) {
      write(K.armas, arr);
      window.DB.length = 0;
      arr.forEach(a => {
        if (!a.img) a.img = window.armaPlaceholder(a);
        window.DB.push(a);
      });
      Store._notify();
    },
    upsertArma(arma) {
      const arr = this.getArmas();
      if (!arma.id) {
        const maxId = arr.reduce((m, a) => Math.max(m, a.id || 0), 0);
        arma.id = maxId + 1;
      }
      const idx = arr.findIndex(a => a.id === arma.id);
      // si cambió el precio, guardar en historial
      const prev = idx >= 0 ? arr[idx] : null;
      if (arma.priceExact && (!prev || prev.priceExact !== arma.priceExact)) {
        this.addPriceHistory(arma.id, arma.priceExact, prev ? prev.priceExact : null);
      }
      if (idx >= 0) arr[idx] = arma;
      else arr.push(arma);
      this.saveArmas(arr);
      return arma;
    },
    deleteArma(id) {
      const arr = this.getArmas().filter(a => a.id !== id);
      this.saveArmas(arr);
    },

    // ─── FAVORITOS (curados por admin) ──────────────────────
    getFavorites() { return read(K.favorites, []); },
    setFavorites(ids) { write(K.favorites, (ids || []).map(Number).filter(Boolean)); Store._notify(); },
    toggleFavorite(id) {
      const f = this.getFavorites();
      this.setFavorites(f.includes(id) ? f.filter(x => x !== id) : [...f, id]);
    },
    getFavoriteArmas() {
      const armas = this.getArmas();
      return this.getFavorites().map(id => armas.find(a => a.id === id)).filter(Boolean);
    },

    // ─── RATINGS (1-5 estrellas por arma) ──────────────────
    getAllRatings() { return read(K.ratings, {}); },
    getRating(armaId) {
      const r = read(K.ratings, {})[armaId];
      if (!r || !r.count) return { avg: 0, count: 0 };
      return { avg: r.sum / r.count, count: r.count };
    },
    addRating(armaId, stars) {
      stars = Math.max(1, Math.min(5, Math.round(Number(stars) || 0)));
      if (!stars) return;
      const ratings = read(K.ratings, {});
      const userKey = 'amx_rated_' + armaId;
      const prev = Number(localStorage.getItem(userKey)) || 0;
      if (!ratings[armaId]) ratings[armaId] = { sum: 0, count: 0 };
      if (prev) {
        // actualizar: quitar voto anterior, sumar nuevo
        ratings[armaId].sum += (stars - prev);
      } else {
        ratings[armaId].sum += stars;
        ratings[armaId].count += 1;
      }
      try { localStorage.setItem(userKey, String(stars)); } catch(e) {}
      write(K.ratings, ratings);
      Store._notify();
    },
    getUserRating(armaId) {
      try {
        const v = localStorage.getItem('amx_rated_' + armaId);
        return v ? Number(v) : 0;
      } catch(e) { return 0; }
    },
    getTopRated(n = 10, minCount = 1) {
      const ratings = read(K.ratings, {});
      const armas = this.getArmas();
      return armas
        .map(a => ({ a, r: ratings[a.id] || { sum: 0, count: 0 } }))
        .filter(x => x.r.count >= minCount)
        .map(x => ({ a: x.a, avg: x.r.sum / x.r.count, count: x.r.count }))
        .sort((x, y) => y.avg - x.avg || y.count - x.count)
        .slice(0, n)
        .map(x => x.a);
    },
    // Para admin: setear ratings manualmente (por ejemplo para seed)
    setRating(armaId, sum, count) {
      const ratings = read(K.ratings, {});
      ratings[armaId] = { sum: Number(sum) || 0, count: Number(count) || 0 };
      write(K.ratings, ratings);
      Store._notify();
    },

    // ─── APP CONFIG (logo y branding) ───────────────────────
    getAppConfig() {
      const cfg = Object.assign({}, DEFAULT_APP_CONFIG, read(K.appConfig, {}));
      if (!cfg.logo) cfg.logo = DEFAULT_APP_CONFIG.logo; // logo guardado vacío → usa el borrador
      return cfg;
    },
    setAppConfig(cfg) {
      const cur = this.getAppConfig();
      write(K.appConfig, Object.assign({}, cur, cfg));
      Store._notify();
    },

    // ─── VISITS (tracking 30 días) ────────────────────────
    trackVisit(armaId) {
      if (!armaId) return;
      const v = read(K.visits, {});
      if (!v[armaId]) v[armaId] = [];
      v[armaId].push(Date.now());
      // mantener solo últimos 60 días para no inflar
      const cutoff = Date.now() - 60 * 24 * 60 * 60 * 1000;
      v[armaId] = v[armaId].filter(t => t > cutoff);
      write(K.visits, v);
    },
    getVisits() { return read(K.visits, {}); },
    getTopPopular(n = 5, days = 30) {
      const v = read(K.visits, {});
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      const counts = {};
      Object.keys(v).forEach(id => {
        counts[id] = (v[id] || []).filter(t => t > cutoff).length;
      });
      const armas = this.getArmas();
      // ordenar por visitas; fallback: si nadie ha visitado nada, devolver primeras
      const ranked = armas
        .map(a => ({ a, c: counts[a.id] || 0 }))
        .sort((x, y) => y.c - x.c);
      return ranked.slice(0, n).map(r => r.a);
    },

    // ─── PRICE HISTORY ────────────────────────────────────
    getPriceHistory(armaId) {
      const h = read(K.priceHist, {});
      // 1) edición explícita en este navegador (admin) tiene prioridad
      if (Object.prototype.hasOwnProperty.call(h, armaId)) return h[armaId];
      // 2) historial sembrado en código (data-precios.js)
      if (PRICE_HISTORY_SEED[armaId] && PRICE_HISTORY_SEED[armaId].length) {
        return PRICE_HISTORY_SEED[armaId].slice()
          .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
      }
      // 3) auto: si el arma tiene precio real, atribúyelo al inventario principal
      const arma = (this.getArmas() || []).find(a => a.id === armaId);
      const primary = this.getPrimaryManual();
      if (arma && primary && arma.priceExact && /\d/.test(String(arma.priceExact))) {
        return [{ manualId: primary.id, price: arma.priceExact, date: primary.fecha, note: primary.nombre }];
      }
      return [];
    },
    addPriceHistory(armaId, price, prevPrice) {
      const h = read(K.priceHist, {});
      if (!h[armaId]) h[armaId] = [];
      // si el array está vacío y hay un prevPrice (del estado previo), añadirlo como histórico inicial
      if (h[armaId].length === 0 && prevPrice && prevPrice !== price) {
        h[armaId].push({ price: prevPrice, date: new Date(Date.now() - 86400000).toISOString(), note: 'precio anterior' });
      }
      h[armaId].push({ price, date: new Date().toISOString(), note: '' });
      // máx 24 entradas
      if (h[armaId].length > 24) h[armaId] = h[armaId].slice(-24);
      write(K.priceHist, h);
    },
    setPriceHistory(armaId, arr) {
      const h = read(K.priceHist, {});
      h[armaId] = arr;
      write(K.priceHist, h);
    },

    // ─── MANUALES / INVENTARIOS OFICIALES DCAM-SEDENA ──────
    // Cada manual: { id, nombre, fecha (YYYY-MM-DD del inventario),
    //                url (dataURL o enlace externo al PDF), fileName, addedAt }
    getManuales() {
      const arr = read(K.manuales, DEFAULT_MANUALES);
      // más reciente primero (por fecha del inventario)
      return arr.slice().sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
    },
    // Inventario fuente principal: el marcado como primary, o el más reciente
    getPrimaryManual() {
      const arr = this.getManuales();
      return arr.find(m => m.primary) || arr[0] || null;
    },
    getManual(id) {
      if (!id) return null;
      return read(K.manuales, DEFAULT_MANUALES).find(m => m.id === id) || null;
    },
    saveManuales(arr) { write(K.manuales, arr); Store._notify(); },
    upsertManual(m) {
      const arr = read(K.manuales, DEFAULT_MANUALES).slice();
      if (!m.id) m.id = 'man_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      if (!m.addedAt) m.addedAt = new Date().toISOString();
      const idx = arr.findIndex(x => x.id === m.id);
      if (idx >= 0) arr[idx] = Object.assign({}, arr[idx], m);
      else arr.push(m);
      this.saveManuales(arr);
      return m;
    },
    deleteManual(id) {
      this.saveManuales(read(K.manuales, DEFAULT_MANUALES).filter(m => m.id !== id));
    },

    // ─── PROMOS (banners slider) ──────────────────────────
    getPromos() { return read(K.promos, DEFAULT_PROMOS); },
    savePromos(arr) { write(K.promos, arr); Store._notify(); },
    upsertPromo(promo) {
      const arr = this.getPromos();
      if (!promo.id) promo.id = 'p_' + Date.now();
      const idx = arr.findIndex(p => p.id === promo.id);
      if (idx >= 0) arr[idx] = promo;
      else arr.push(promo);
      this.savePromos(arr);
    },
    deletePromo(id) {
      const arr = this.getPromos().filter(p => p.id !== id);
      this.savePromos(arr);
    },

    // ─── SUGGESTIONS (cambios sugeridos a armas existentes) ──
    getSuggestions() { return read(K.suggestions, []); },
    saveSuggestions(arr) { write(K.suggestions, arr); Store._notify(); },
    addSuggestion(s) {
      const arr = this.getSuggestions();
      s.id = 's_' + Date.now() + '_' + Math.floor(Math.random()*1000);
      s.submittedAt = new Date().toISOString();
      s.status = 'pending';
      arr.unshift(s);
      this.saveSuggestions(arr);
      return s;
    },
    deleteSuggestion(id) {
      const arr = this.getSuggestions().filter(s => s.id !== id);
      this.saveSuggestions(arr);
    },

    // ─── PENDING SUBMISSIONS ──────────────────────────────
    getPending() { return read(K.pending, []); },
    savePending(arr) { write(K.pending, arr); Store._notify(); },
    addPending(sub) {
      const arr = this.getPending();
      sub.id = 'p_' + Date.now() + '_' + Math.floor(Math.random()*1000);
      sub.submittedAt = new Date().toISOString();
      sub.status = 'pending';
      arr.unshift(sub);
      this.savePending(arr);
      return sub;
    },
    approvePending(pid, overrides) {
      const arr = this.getPending();
      const idx = arr.findIndex(p => p.id === pid);
      if (idx < 0) return null;
      const sub = arr[idx];
      arr.splice(idx, 1);
      this.savePending(arr);
      // crear arma
      const arma = Object.assign({}, sub, overrides || {});
      // limpiar campos de submission
      delete arma.id; delete arma.submittedAt; delete arma.status;
      delete arma.submitterName; delete arma.submitterEmail; delete arma.submitterMessage;
      const saved = this.upsertArma(arma);
      return saved;
    },
    rejectPending(pid, reason) {
      const arr = this.getPending();
      const idx = arr.findIndex(p => p.id === pid);
      if (idx < 0) return;
      const rej = Object.assign({}, arr[idx], { status: 'rejected', rejectionReason: reason, rejectedAt: new Date().toISOString() });
      arr.splice(idx, 1);
      this.savePending(arr);
      const rejected = read(K.rejected, []);
      rejected.unshift(rej);
      write(K.rejected, rejected);
      Store._notify();
    },
    updatePending(pid, fields) {
      const arr = this.getPending();
      const idx = arr.findIndex(p => p.id === pid);
      if (idx < 0) return;
      arr[idx] = Object.assign({}, arr[idx], fields);
      this.savePending(arr);
    },
    getRejected() { return read(K.rejected, []); },

    // ─── PÁGINAS ──────────────────────────────────────────
    getPages() { return Object.assign({}, DEFAULT_PAGES, read(K.pages, {})); },
    savePages(p) { write(K.pages, p); Store._notify(); },
    updatePage(section, fields) {
      const pages = this.getPages();
      pages[section] = Object.assign({}, pages[section], fields);
      this.savePages(pages);
    },

    // ─── AUTH ─────────────────────────────────────────────
    isLoggedIn() {
      const v = read(K.admin, {});
      return !!v.loggedIn;
    },
    checkPassword(pw) {
      const v = read(K.admin, { password: DEFAULT_PW });
      return pw === v.password;
    },
    login(pw) {
      if (!this.checkPassword(pw)) return false;
      const v = read(K.admin, {});
      v.loggedIn = true;
      write(K.admin, v);
      return true;
    },
    logout() {
      const v = read(K.admin, {});
      v.loggedIn = false;
      write(K.admin, v);
    },
    setPassword(newPw) {
      const v = read(K.admin, {});
      v.password = newPw;
      write(K.admin, v);
    },

    // ─── JSON IO ──────────────────────────────────────────
    exportAll() {
      return {
        armas: this.getArmas(),
        pages: this.getPages(),
        pending: this.getPending(),
        rejected: this.getRejected(),
        priceHist: read(K.priceHist, {}),
        promos: this.getPromos(),
        suggestions: this.getSuggestions(),
        favorites: this.getFavorites(),
        ratings: this.getAllRatings(),
        appConfig: this.getAppConfig(),
        exportedAt: new Date().toISOString(),
      };
    },
    importAll(data) {
      if (!data || typeof data !== 'object') throw new Error('JSON inválido');
      if (Array.isArray(data.armas)) this.saveArmas(data.armas);
      if (data.pages) this.savePages(data.pages);
      if (Array.isArray(data.pending)) this.savePending(data.pending);
      if (Array.isArray(data.rejected)) write(K.rejected, data.rejected);
      if (data.priceHist) write(K.priceHist, data.priceHist);
      if (Array.isArray(data.promos)) this.savePromos(data.promos);
      if (Array.isArray(data.suggestions)) this.saveSuggestions(data.suggestions);
      if (Array.isArray(data.favorites)) this.setFavorites(data.favorites);
      if (data.ratings && typeof data.ratings === 'object') { write(K.ratings, data.ratings); Store._notify(); }
      if (data.appConfig) this.setAppConfig(data.appConfig);
    },

    // ─── CSV IMPORT (bulk) ────────────────────────────────
    // Devuelve { added, updated, errors[] }
    importCsv(csvText, mode /* 'merge' | 'replace' */) {
      const lines = csvText.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) throw new Error('CSV vacío o sin filas de datos');
      const headers = parseCsvRow(lines[0]).map(h => h.trim().toLowerCase());
      const out = { added: 0, updated: 0, errors: [] };
      const arr = mode === 'replace' ? [] : this.getArmas();

      for (let i = 1; i < lines.length; i++) {
        try {
          const row = parseCsvRow(lines[i]);
          if (row.length === 0 || row.every(c => !c.trim())) continue;
          const obj = {};
          headers.forEach((h, idx) => { obj[h] = (row[idx] || '').trim(); });

          // mapeo de columnas → arma
          const arma = {
            id: obj.id ? Number(obj.id) : undefined,
            nombre: obj.nombre || '',
            marca: obj.marca || '',
            tipo: (obj.tipo || 'pistola').toLowerCase(),
            pais: obj.pais || obj['país'] || '',
            calibre: obj.calibre || '',
            capacidad: obj.capacidad || '',
            peso: obj.peso || '',
            longitud: obj.longitud || '',
            mecanismo: obj.mecanismo || '',
            anio: Number(obj.anio || obj['año'] || new Date().getFullYear()),
            era: (obj.era || 'moderno').toLowerCase(),
            img: obj.img || obj.imagen || '',
            youtube: obj.youtube || obj.video || '',
            historia: obj.historia || '',
            avail: (obj.avail || obj.disponibilidad_legal || 'dcam').toLowerCase(),
            availLabel: obj.availlabel || obj.avail_label || '',
            legalTit: obj.legaltit || obj.legal_titulo || '',
            legalDesc: obj.legaldesc || obj.legal_desc || '',
            priceExact: obj.precio || obj.priceexact || '',
            priceLvl: Number(obj.pricelvl || obj.nivel || 1),
            dcamRef: obj.dcamref || obj.dcam_ref || '',
            disponibilidad: (obj.disponibilidad || '').split(';').map(s => s.trim()).filter(Boolean),
            uses: (obj.uses || obj.usos || 'domicilio;club').split(';').map(s => s.trim()).filter(Boolean),
            stats: {
              alcance:   Number(obj.alcance   || 50),
              precision: Number(obj.precision || 50),
              retroceso: Number(obj.retroceso || 50),
              capacidad: Number(obj.capacidad_stat || 50),
              manejo:    Number(obj.manejo    || 50),
              poder:     Number(obj.poder     || 50),
            },
          };

          if (!arma.nombre || !arma.marca) {
            out.errors.push({ row: i + 1, reason: 'Falta nombre o marca' });
            continue;
          }

          // si tiene id y existe → update; si no → add
          const existingIdx = arma.id ? arr.findIndex(a => a.id === arma.id) : -1;
          if (existingIdx >= 0) {
            arr[existingIdx] = Object.assign({}, arr[existingIdx], arma);
            out.updated++;
          } else {
            arma.id = arma.id || (arr.reduce((m, a) => Math.max(m, a.id || 0), 0) + 1);
            arr.push(arma);
            out.added++;
          }
        } catch (e) {
          out.errors.push({ row: i + 1, reason: e.message });
        }
      }
      this.saveArmas(arr);
      return out;
    },

    exportCsv() {
      const armas = this.getArmas();
      const cols = ['id','nombre','marca','tipo','pais','calibre','capacidad','peso','longitud','mecanismo','anio','era','img','youtube','avail','availLabel','priceExact','priceLvl','dcamRef','legalTit','legalDesc','disponibilidad','uses','alcance','precision','retroceso','capacidad_stat','manejo','poder','historia'];
      const esc = (v) => {
        const s = (v == null ? '' : String(v));
        if (/[",\n;]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
        return s;
      };
      const rows = [cols.join(',')];
      armas.forEach(a => {
        rows.push(cols.map(c => {
          if (c === 'disponibilidad') return esc((a.disponibilidad || []).join(';'));
          if (c === 'uses') return esc((a.uses || []).join(';'));
          if (c === 'capacidad_stat') return esc(a.stats?.capacidad);
          if (['alcance','precision','retroceso','manejo','poder'].includes(c)) return esc(a.stats?.[c]);
          return esc(a[c]);
        }).join(','));
      });
      return rows.join('\n');
    },
    reset() {
      Object.values(K).forEach(k => localStorage.removeItem(k));
    },
    _listeners: [],
    onChange(fn) { Store._listeners.push(fn); return () => { Store._listeners = Store._listeners.filter(f => f !== fn); }; },
    _notify() { Store._listeners.forEach(f => { try { f(); } catch(e){} }); },
  };

  // escuchar cambios cross-tab
  window.addEventListener('storage', (e) => {
    if (e.key && Object.values(K).includes(e.key)) {
      // refrescar window.DB si cambiaron armas
      if (e.key === K.armas) {
        const saved = read(K.armas, []);
        window.DB.length = 0;
        saved.forEach(a => window.DB.push(a));
      }
      Store._notify();
    }
  });

  // parser CSV mínimo (soporta comillas y comas dentro)
  function parseCsvRow(line) {
    const out = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQ) {
        if (c === '"' && line[i+1] === '"') { cur += '"'; i++; }
        else if (c === '"') { inQ = false; }
        else cur += c;
      } else {
        if (c === ',') { out.push(cur); cur = ''; }
        else if (c === '"') inQ = true;
        else cur += c;
      }
    }
    out.push(cur);
    return out;
  }

  window.Store = Store;
  window.Store.init();
})();

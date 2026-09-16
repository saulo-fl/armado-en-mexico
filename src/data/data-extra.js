// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.
//
// LOS DATOS de este fichero —la selección, la estructura y los textos
// divulgativos— se ofrecen ADEMÁS bajo CC BY-SA 4.0; los hechos que contiene
// no son de nadie (art. 14 fr. X LFDA). Detalle: LICENSE-CONTENIDO.md.

// Armado en México — Datos de apartados nuevos
// Calibres (enciclopédico) · Campos de tiro (placeholder) · Cursos (placeholder)
// ───────────────────────────────────────────────────────────────────────
// NOTA: Campos y Cursos son datos PLACEHOLDER para engrosar más tarde.
// Calibres usa la taxonomía real de CATEGORIES.calibre + el catálogo (window.DB).

// ═══════════════════════════════════════════════════════════════════════
// CALIBRES — ficha divulgativa por calibre
//   clase     · Pistola / Revólver / Rifle / Escopeta / Rimfire
//   uso       · aplicación típica
//   velocidad · boca de cañón aprox. (divulgativo)
//   energia   · energía de boca aprox. (divulgativo)
//   retroceso · Bajo / Medio / Alto / Muy alto
// ═══════════════════════════════════════════════════════════════════════
window.CALIBRES = [
  { id: '.22 LR',          clase: 'Rimfire',  uso: 'Práctica, plinking y caza menor',           velocidad: '~330 m/s', energia: '~150 J',  retroceso: 'Bajo',
    mm: 25.4, cartucho: 'imagenes/cartuchos/22lr.webp', desc: 'El calibre de fuego anular más popular del mundo. Económico y de retroceso mínimo: ideal para iniciación, entrenamiento y control de plagas.' },
  { id: '.380 ACP',        clase: 'Pistola',  uso: 'Defensa personal compacta',                 velocidad: '~300 m/s', energia: '~280 J',  retroceso: 'Bajo-Medio',
    mm: 25, cartucho: 'imagenes/cartuchos/380acp.webp', desc: 'Cartucho de defensa en pistolas subcompactas. De libre adquisición para civiles en México (DCAM), uno de los más solicitados para defensa de domicilio.' },
  { id: '.38 Special',     clase: 'Revólver', uso: 'Defensa y tiro recreativo',                 velocidad: '~260 m/s', energia: '~300 J',  retroceso: 'Medio',
    mm: 39.6, cartucho: 'imagenes/cartuchos/38special.webp', desc: 'Cartucho de revólver clásico, fiable y noble. Estándar de defensa civil durante décadas; sigue vigente en revólveres de acero como el Taurus 856.' },
  { id: '.38 Super',       clase: 'Pistola',  uso: 'Tiro deportivo (IPSC) y defensa',           velocidad: '~430 m/s', energia: '~650 J',  retroceso: 'Medio',
    mm: 32.6, cartucho: 'imagenes/cartuchos/38super.webp', desc: 'Muy arraigado en México. Alta velocidad y excelente para competencia de acción en plataformas tipo 1911 y Colt Government.' },
  { id: '9mm Parabellum',  clase: 'Pistola',  uso: 'Servicio, defensa y deportivo',             velocidad: '~360 m/s', energia: '~500 J',  retroceso: 'Medio',
    mm: 29.7, cartucho: 'imagenes/cartuchos/9mm.webp', desc: 'El estándar mundial de pistola. Equilibrio entre capacidad, control y poder de parada. Restringido en México a corporaciones de seguridad.' },
  { id: '.40 S&W',         clase: 'Pistola',  uso: 'Servicio y seguridad',                      velocidad: '~330 m/s', energia: '~600 J',  retroceso: 'Medio-Alto',
    mm: 28.8, cartucho: 'imagenes/cartuchos/40sw.webp', desc: 'Desarrollado para cuerpos policiales: más poder que el 9mm conservando capacidad razonable. Uso restringido a seguridad pública/privada.' },
  { id: '.243 Winchester', clase: 'Rifle',    uso: 'Caza menor-media y varmint',                velocidad: '~950 m/s', energia: '~3,200 J', retroceso: 'Medio',
    mm: 68.6, cartucho: 'imagenes/cartuchos/243win.webp', desc: 'Versátil y de retroceso suave. Trayectoria tensa para caza de venado pequeño y tiro a media distancia.' },
  { id: '.270 Winchester', clase: 'Rifle',    uso: 'Caza media-mayor',                          velocidad: '~930 m/s', energia: '~3,800 J', retroceso: 'Medio-Alto',
    mm: 84.8, cartucho: 'imagenes/cartuchos/270win.webp', desc: 'Clásico de cacería en campo abierto. Excelente alcance efectivo y energía para venado y borrego.' },
  { id: '.308 Winchester', clase: 'Rifle',    uso: 'Caza y tiro de precisión',                  velocidad: '~840 m/s', energia: '~3,500 J', retroceso: 'Alto',
    mm: 71.1, cartucho: 'imagenes/cartuchos/308win.webp', desc: 'Uno de los calibres de rifle más equilibrados. Precisión sobresaliente y enorme disponibilidad de munición y rifles.' },
  { id: '.30-06 Sprg',     clase: 'Rifle',    uso: 'Caza mayor versátil',                       velocidad: '~880 m/s', energia: '~3,900 J', retroceso: 'Alto',
    mm: 84.8, cartucho: 'imagenes/cartuchos/3006.webp', desc: 'Histórico y polivalente. Cubre prácticamente toda la caza norteamericana con amplia gama de balas.' },
  { id: '7mm Rem Mag',     clase: 'Rifle',    uso: 'Caza a larga distancia',                    velocidad: '~920 m/s', energia: '~4,500 J', retroceso: 'Alto',
    mm: 84.8, cartucho: 'imagenes/cartuchos/7mmrem.webp', desc: 'Magnum de trayectoria muy tensa para tiros largos en campo abierto. Energía elevada con retroceso manejable para su clase.' },
  { id: '.300 Win Mag',    clase: 'Rifle',    uso: 'Caza mayor y larga distancia',              velocidad: '~900 m/s', energia: '~4,800 J', retroceso: 'Muy alto',
    mm: 84.8, cartucho: 'imagenes/cartuchos/300wm.webp', desc: 'Magnum de gran potencia para piezas grandes y tiro extremo. Exige buen dominio por su retroceso pronunciado.' },
  { id: '6.5 PRC',         clase: 'Rifle',    uso: 'Precisión a larga distancia',               velocidad: '~915 m/s', energia: '~3,900 J', retroceso: 'Alto',
    mm: 73.7, cartucho: 'imagenes/cartuchos/65prc.webp', desc: 'Cartucho moderno de altísimo coeficiente balístico. Favorito actual del tiro de precisión y la caza de montaña.' },
  { id: '12 GA',           clase: 'Escopeta', uso: 'Caza, defensa y tiro al plato',             velocidad: '~400 m/s', energia: 'Variable', retroceso: 'Alto',
    mm: 70, cartucho: 'imagenes/cartuchos/12ga.webp', desc: 'El calibre de escopeta universal. Acepta perdigón, posta y bala; versátil para caza, deportivo (skeet/trap) y defensa.' },
  { id: '20 GA',           clase: 'Escopeta', uso: 'Caza menor y tiro',                         velocidad: '~380 m/s', energia: 'Variable', retroceso: 'Medio',
    mm: 70, cartucho: 'imagenes/cartuchos/20ga.webp', desc: 'Más ligero que el calibre 12, con menor retroceso. Ideal para caza de ave y tiradores de menor complexión.' },
  { id: '.410 Bore',       clase: 'Escopeta', uso: 'Caza menor e iniciación',                   velocidad: '~360 m/s', energia: 'Variable', retroceso: 'Bajo',
    mm: 63.5, cartucho: 'imagenes/cartuchos/410.webp', desc: 'El calibre de escopeta más pequeño. Retroceso muy suave: excelente para iniciación y control de plagas a corta distancia.' },
  { id: '5.56x45mm',       clase: 'Carabina', uso: 'Táctico y deportivo',                       velocidad: '~940 m/s', energia: '~1,700 J', retroceso: 'Bajo-Medio',
    mm: 57.4, cartucho: 'imagenes/cartuchos/556.webp', desc: 'Estándar OTAN para fusil. Retroceso ligero y trayectoria tensa. Uso restringido en plataformas tipo AR a corporaciones/FF.AA.' },
  { id: '7.62x39mm',       clase: 'Carabina', uso: 'Táctico',                                   velocidad: '~715 m/s', energia: '~2,000 J', retroceso: 'Medio',
    mm: 56, cartucho: 'imagenes/cartuchos/762x39.webp', desc: 'Cartucho intermedio robusto y fiable. Buen poder a distancias medias. Uso restringido a seguridad/FF.AA.' },
  { id: '7.62x51mm',       clase: 'Carabina', uso: 'Táctico y precisión',                       velocidad: '~840 m/s', energia: '~3,300 J', retroceso: 'Alto',
    mm: 71.1, cartucho: 'imagenes/cartuchos/762x51.webp', desc: 'Equivalente militar del .308. Gran energía y alcance para fusiles de batalla y precisión. Uso restringido.' },
];

// Sistema de percusión (ignición) del cartucho: lo que el slider muestra como
// "clase". Solo el .22 LR (y fuego anular en general) es Rimfire; el resto es
// de percusión central (centerfire).
window.CALIBRES.forEach((c) => {
  c.sistema = (c.clase === 'Rimfire' || c.id === '.22 LR') ? 'Rimfire' : 'Percusión central';
});

// ═══════════════════════════════════════════════════════════════════════
// CAMPOS DE TIRO — clubes y polígonos (PLACEHOLDER · suscripción a futuro)
// ═══════════════════════════════════════════════════════════════════════
window.CAMPOS = [
  { id: 'cdmx-valle',   nombre: 'Club de Tiro Valle de México', ciudad: 'Ciudad de México', estado: 'CDMX',     entorno: 'Outdoor',       distancias: '25 · 50 · 100 m', disciplinas: ['Pistola', 'Rifle', 'Precisión'], plan: 'Membresía mensual', estatus: 'Aliado destacado' },
  { id: 'mty-poligono', nombre: 'Polígono Monterrey',           ciudad: 'Monterrey',        estado: 'Nuevo León', entorno: 'Indoor',        distancias: '15 · 25 m',       disciplinas: ['Pistola', 'Defensivo'],            plan: 'Membresía / visita',  estatus: 'Próximamente' },
  { id: 'gdl-cinegetico', nombre: 'Club Cinegético Guadalajara', ciudad: 'Guadalajara',     estado: 'Jalisco',    entorno: 'Outdoor',       distancias: 'Plato · 50 m',    disciplinas: ['Escopeta', 'Skeet', 'Trap'],       plan: 'Membresía anual',     estatus: 'Próximamente' },
  { id: 'son-venado',   nombre: 'Rancho Cinegético El Venado',  ciudad: 'Hermosillo',       estado: 'Sonora',     entorno: 'Campo abierto', distancias: 'Caza · 100-300 m',disciplinas: ['Rifle', 'Cacería'],                plan: 'Por temporada',       estatus: 'Próximamente' },
  { id: 'pue-deportivo', nombre: 'Tiro Deportivo Puebla',       ciudad: 'Puebla',           estado: 'Puebla',     entorno: 'Indoor',        distancias: '25 m',            disciplinas: ['Pistola', 'Recreativo'],           plan: 'Visita / membresía',  estatus: 'Próximamente' },
  { id: 'qro-tactico',  nombre: 'Campo Táctico Querétaro',      ciudad: 'Querétaro',        estado: 'Querétaro',  entorno: 'Outdoor',       distancias: '25 · 50 m',       disciplinas: ['Defensivo', 'IPSC'],               plan: 'Membresía mensual',   estatus: 'Próximamente' },
];

// ═══════════════════════════════════════════════════════════════════════
// CURSOS — formación (PLACEHOLDER · catálogo de muestra)
// ═══════════════════════════════════════════════════════════════════════
window.CURSOS = [
  { id: 'manejo-seguro',  titulo: 'Manejo Seguro de Armas',         nivel: 'Básico',      duracion: '1 día (8 h)',  modalidad: 'Presencial', precio: 'Desde $—',
    desc: 'Fundamentos de seguridad, reglas de oro, manipulación, carga/descarga y almacenamiento responsable. Punto de partida para todo tirador.' },
  { id: 'tiro-defensivo', titulo: 'Tiro Defensivo',                 nivel: 'Intermedio',  duracion: '2 días (16 h)',modalidad: 'Presencial', precio: 'Desde $—',
    desc: 'Desenfunde, posiciones de tiro, recargas y toma de decisiones bajo estrés. Requiere haber tomado Manejo Seguro.' },
  { id: 'precision-rifle',titulo: 'Tiro de Precisión · Rifle',      nivel: 'Avanzado',    duracion: '2 días (16 h)',modalidad: 'Presencial', precio: 'Desde $—',
    desc: 'Fundamentos de precisión a media y larga distancia: posición, respiración, viento y lectura de impactos.' },
  { id: 'marco-legal',    titulo: 'Marco Legal y Portación',        nivel: 'Básico',      duracion: '4 h',          modalidad: 'En línea',   precio: 'Desde $—',
    desc: 'Ley Federal de Armas de Fuego, trámite SEDENA, categorías legales y portación responsable. Curso teórico.' },
  { id: 'defensa-hogar',  titulo: 'Defensa en el Hogar',            nivel: 'Intermedio',  duracion: '1 día (8 h)',  modalidad: 'Presencial', precio: 'Desde $—',
    desc: 'Selección de arma para domicilio, protocolos de seguridad familiar y respuesta ante intrusión dentro del marco legal.' },
  { id: 'mantenimiento',  titulo: 'Mantenimiento y Limpieza',       nivel: 'Básico',      duracion: '4 h',          modalidad: 'Presencial', precio: 'Desde $—',
    desc: 'Desarme básico, limpieza, lubricación y diagnóstico de fallas comunes para conservar tu arma en óptimas condiciones.' },
];

// Armado en México — Armas Traumáticas (defensa MENOS LETAL)
// CATEGORÍA APARTE del arsenal: NO son armas de fuego, NO requieren permiso SEDENA
// y pueden adquirirse directamente en armasmys.com. Son los únicos 3 modelos de
// armamento que comercializamos. Datos extraídos del conector de Shopify.
// ═══════════════════════════════════════════════════════════════════════
window.TRAUMATICAS = [
  {
    id: 'hdp50',
    modelo: 'HDP 50',
    tipo: 'Pistola',
    marca: 'P2P · Umarex',
    nombre: 'Pistola de Protección HDP 50 · Gen 2',
    tier: 'Más Económica',
    tierColor: '#4FAE5C',
    effect: 'glow',
    tagline: 'Para quienes buscan empezar con armas traumáticas',
    features: [
      'Calibre .50',
      '13 joules de impacto',
      'Cargador Interno (6 tiros)',
      'Compatible con munición de goma, pimienta y polvo inerte para defensa y entrenamiento',
    ],
    precio: 3999,
    stock: 0,
    handle: 'pistola-de-proteccion-de-gas-pimienta',
    img: 'https://cdn.shopify.com/s/files/1/0669/3296/5670/files/Pistola_De_Proteccion_Hdp_50_Gas_Pimienta_Umarex.png?v=1774490005',
    resumen: 'Pistola compacta de defensa no letal calibre .50. Dispara bolitas de pimienta, goma o polvo; semiautomática y lista para el hogar.',
    specs: [
      ['Calibre', '.50'],
      ['Propulsión', 'CO₂ 12 g'],
      ['Velocidad', '375 fps · 114 m/s'],
      ['Capacidad', '6 tiros'],
      ['Disparo', 'Semiautomático'],
      ['Peso', '0.68 kg'],
    ],
    destacados: [
      'Cargador de carga rápida · 6 tiros calibre .50',
      'Munición de pimienta, goma o polvo',
      'Incluye 10 bolitas de goma, 10 de pimienta y limpiador',
    ],
    municion: ['Pimienta', 'Goma', 'Polvo'],
  },
  {
    id: 'secure68p',
    modelo: 'SECURE 68P',
    tipo: 'Pistola',
    marca: 'P2P · Umarex',
    nombre: 'Pistola de Protección Secure 68P · cal. .68',
    tier: 'Más Popular',
    tierColor: '#F5C518',
    effect: 'pulse',
    tagline: 'La mayor tecnología que asemeja un arma real con cargadores extraíbles',
    features: [
      'Calibre .68',
      '19 joules de impacto',
      'Cargador Extraíble (6 tiros)',
      'Compatible con munición de goma, pimienta y polvo inerte para defensa y entrenamiento',
      'Munición de Pimienta con núcleo metálico para mayor impacto',
      'Capacidad Extendida con cargadores adicionales (incluye 1 cargador)',
    ],
    precio: 7999,
    stock: 2,
    handle: 'pistola-traumatica-de-proteccion-secure-68p-gas-pimienta-umarex-cal-68',
    img: 'https://cdn.shopify.com/s/files/1/0669/3296/5670/files/PistolaTraumaticaDeProteccionSecure68PGasPimientaUmarexcal.68_1.png?v=1772603397',
    resumen: 'Pistola .68 de defensa del hogar con sistema patentado Response-Ready Trigger: se almacena con el CO₂ sellado y queda lista para responder en segundos.',
    specs: [
      ['Calibre', '.68'],
      ['Propulsión', 'CO₂ 12 g'],
      ['Velocidad', '350 fps · 107 m/s'],
      ['Energía', '19 J'],
      ['Capacidad', '6 tiros'],
      ['Miras', 'Fibra óptica'],
    ],
    destacados: [
      'Sistema Response-Ready Trigger (patent pending)',
      'Cargador extraíble de 6 disparos · drop-free',
      'Miras de fibra óptica + riel Picatinny',
    ],
    municion: ['Pimienta', 'Goma', 'Polvo'],
  },
  {
    id: 'hdx68',
    modelo: 'HDX 68',
    tipo: 'Escopeta',
    marca: 'P2P · Umarex',
    nombre: 'Escopeta HDX 68 · "Home Defense Extreme"',
    tier: 'Más Poderosa',
    tierColor: '#C0392B',
    effect: 'fire',
    tagline: 'Máxima potencia para detener cualquier amenaza que invada tu hogar',
    features: [
      'Calibre .68',
      '40 joules de impacto',
      'Cargador Interno (16 tiros)',
      'Compatible con munición de goma, pimienta y polvo inerte para defensa y entrenamiento',
      'Munición de Pimienta con núcleo metálico para mayor impacto',
      'Capacidad Extendida por cargador tubular interno de 16 tiros',
      'Seguro Manual',
      'Indicador de Presión',
      'Escopeta con sistema de bombeo',
      'Puede utilizar tanques de CO₂ de 12 y de 88 gramos',
    ],
    precio: 14499,
    stock: 3,
    handle: 'escopeta-p2p-hdx-68-home-defense-extreme-530-fps-40-joules',
    manual: 'https://cdn.shopify.com/s/files/1/0669/3296/5670/files/Manual_HDX68_ArmasMS.pdf?v=1780718524',
    img: 'https://cdn.shopify.com/s/files/1/0669/3296/5670/files/Escopeta_P2P_HDX_68_HOME_DEFENSE_EXTREME_-_530_FPS_40_JOULES_2.png?v=1772603442',
    resumen: 'La plataforma menos letal más contundente de la línea: formato escopeta de acción pump, hasta 530 fps y ~40 J de impacto para máxima disuasión.',
    specs: [
      ['Calibre', '.68'],
      ['Propulsión', 'CO₂ 88 g / 2×12 g'],
      ['Velocidad', '530 fps · 162 m/s'],
      ['Energía', '≈ 40 J'],
      ['Capacidad', '16 rondas'],
      ['Acción', 'Pump manual'],
    ],
    destacados: [
      'Acción pump · cargador tubular de 16 rondas',
      '530 fps · ~40 J de impacto contundente',
      'Rieles Picatinny y M-LOK · cañón metálico',
    ],
    municion: ['Pimienta', 'Goma', 'Polvo'],
  },
];

// Tienda
window.TRAUMATICAS_TIENDA = 'armasmys.com';
window.traumaticaUrl = function (handle) {
  return 'https://armasmys.com/products/' + handle;
};

// ═════════════════════════════════════════════════════════════════
// MARCO LEGAL — Armas traumáticas (fuente: Manual de usuario HDX 68, sección 08;
// Ley Federal de Armas de Fuego y Explosivos — LFAFE).
// ═════════════════════════════════════════════════════════════════
window.TRAUMATICAS_LEGAL = {
  resumen: 'Las armas traumáticas accionadas por gas CO₂ NO son armas de fuego: no usan pólvora. Por ello están fuera del régimen de permiso y registro de la SEDENA y puedes adquirirlas directamente, siendo mayor de edad.',
  puntos: [
    {
      tit: 'Artículo 13 LFAFE · Límite de 140 Joules',
      desc: 'La Ley Federal de Armas de Fuego y Explosivos permite las armas accionadas por gas, aire comprimido o pistón que no superen los 140 Joules de energía cinética. Los tres modelos que ofrecemos desarrollan entre 13 y 40 Joules — muy por debajo del límite —, por lo que su posesión es legal para mayores de edad sin permiso de la SEDENA.',
    },
    {
      tit: 'Artículo 12 LFAFE · Normativa de cada estado',
      desc: 'La definición de armas prohibidas se remite a los códigos penales de cada entidad, por lo que las reglas pueden variar por estado. Morelos (Art. 245, reforma 2021) reconoce expresamente la defensa personal como fin lícito; la Ciudad de México (Art. 251) exige acreditar un motivo lícito.',
    },
    {
      tit: 'Uso legítimo',
      desc: 'Están destinadas a la defensa personal, la protección del hogar y el entrenamiento deportivo. La legislación mexicana reconoce la legítima defensa (Art. 15, fracción IV del Código Penal Federal) cuando se repele una agresión real, actual e inminente con un medio racionalmente necesario. El uso ofensivo o intimidatorio constituye un delito.',
    },
    {
      tit: 'Resguardo y traslado responsable',
      desc: 'Consérvalas descargadas, sin tanque de CO₂ perforado y en su estuche. No las introduzcas a aeropuertos, aeronaves, instalaciones gubernamentales, escuelas ni eventos masivos. Su uso debe limitarse al sitio donde se empleen; el traslado debe justificarse por trabajo o deporte.',
    },
  ],
  disclaimer: 'Información orientativa actualizada a la fecha de edición del manual (junio 2026); no constituye asesoría legal. La normativa puede cambiar — consulta a la autoridad local o a un profesional del derecho. Es responsabilidad exclusiva del adquirente verificar y cumplir la normativa federal, estatal y municipal aplicable antes de adquirir, poseer, trasladar o usar el artículo.',
};

// Declaración de intenciones — manifiesto de la app
window.ARMADO_DECLARACION = {
  titulo: 'Declaración de intenciones',
  parrafos: [
    'Todas las armas de fuego que aparecen en esta app se muestran únicamente con fines informativos. Sus precios se publican solo con fines informativos y de transparencia, en ejercicio del derecho constitucional (Artículo 10 de la Constitución) a la posesión legal de armas para la protección del domicilio.',
    'Esta app surge como respuesta a la opacidad de las instituciones para brindar información pública y actualizada, y que buscan ofuscar el ejercicio de este derecho constitucional, desincentivando a los ciudadanos y satanizando las armas en un entorno de violencia y narcotráfico que asola al país desde hace más de veinte años.',
    'No creemos que cualquiera deba tener un arma. Defendemos el derecho que tenemos como mexicanos y como personas a proteger nuestra vida, nuestra familia y nuestro hogar en un entorno donde la violencia y el crimen son el pan de cada día — donde alguien puede irrumpir en tu casa y arruinarte la vida sin que las autoridades respondan a tiempo ni el sistema te ayude a encontrar justicia.',
    'Abogamos por la tenencia responsable de armas para el tiro deportivo, pero sobre todo para la capacitación y la protección del hogar.',
    'Las armas traumáticas, en cambio, son una categoría totalmente distinta dentro del arsenal: no son armas de fuego, no requieren permiso de la SEDENA y puedes adquirirlas directamente con nosotros. Son los únicos tres modelos de armamento que comercializamos.',
  ],
};

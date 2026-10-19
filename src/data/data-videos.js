// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.
//
// LOS DATOS de este fichero —la selección, la estructura y los textos
// divulgativos— se ofrecen ADEMÁS bajo CC BY-SA 4.0; los hechos que contiene
// no son de nadie (art. 14 fr. X LFDA). Detalle: LICENCIA-CONTENIDO.md.

// ──────────────────────────────────────────────────────────────
// VIDEOS — los que salen en la tele antigua de las fichas
// ──────────────────────────────────────────────────────────────
// Los elige Saulo A MANO (18-oct-2026): reviews del canal Armas M&S, videos de
// calibre de M&S Army y, en el futuro, de creadores que lo hayan AUTORIZADO.
// Nada de esto es automático. Vive aquí y no en D1 a propósito: la app hidrata
// las armas desde D1 y el resembrado pisa lo que se meta por el admin.
//
// Un video es su id de YouTube (los 11 caracteres de ?v=) y su canal. Siempre
// arranca desde el principio. Las variantes de un arma que solo cambian de
// acabado comparten video. Un calibre sin ficha no lleva video.
// Todo va dentro de una función: los data-*.js comparten el ámbito global y un
// `const` suelto chocaría con el de otro archivo.

(function () {
const CANALES = {
  armasms: { nombre: 'Armas M&S', url: 'https://www.youtube.com/@ArmasMS' },
  msarmy:  { nombre: 'M&S Army',  url: 'https://www.youtube.com/@msarmy2490' },
};
const v = (id, canal) => ({ id, canal: CANALES[canal] });

// Por id de arma (data.js).
const RM22 = [v('9RIekKHX-58', 'armasms')];
const TIPPMANN = [v('XPexSruOCYg', 'armasms')];
const RUGER_1022 = [v('oxX8cb6TnFI', 'armasms'), v('DrFCGoNxJwE', 'armasms')];
const POR_ARMA = {
  99:  [v('_VW1O5u8FxM', 'armasms')],   // Huglu Atrox
  151: RUGER_1022,                      // Ruger 10/22
  13:  [v('-yr5-D4lid0', 'armasms')],   // Beretta 80X Cheetah
  134: [v('njThIuPZUnM', 'armasms')],   // Beretta 92FS .22 LR
  9:   [v('HDqC7Gf9hEQ', 'armasms')],   // CZ P-10 C
  256: [v('d1svvgM1ZPQ', 'armasms')],   // CZ 457 Jaguar XII
  17:  [v('kZKXxltWaX4', 'armasms')],   // Browning Buck Mark
  11:  [v('DWBfKTXJL8w', 'armasms')],   // Glock 25
  18:  [v('vRJfSbzc4F4', 'armasms')],   // SIG Sauer P322
  5:   [v('FUqd3FG8Q4U', 'armasms')],   // Ruger LCP
  8:   [v('q2O2KIIRODU', 'armasms')],   // CZ P-07
  // Mendoza RM22: el mismo rifle con otra culata o acabado.
  50: RM22, 51: RM22, 52: RM22, 53: RM22, 54: RM22, 55: RM22, 179: RM22, 262: RM22, 263: RM22, 264: RM22,
  // Tippmann M4-22: Elite, Redline y OD-Green.
  80: TIPPMANN, 81: TIPPMANN, 82: TIPPMANN,
};

// Por calibre: sirve a la ficha del calibre (window.CALIBRES) y a las fichas de
// munición de ese calibre (window.MUNICIONES[].calibre). .17 HMR y .30 Carbine
// no tienen ficha de calibre, solo munición.
const ANULAR = v('5XqMkye6-qc', 'msarmy');   // por qué la percusión anular solo queda en .22
const POR_CALIBRE = {
  '.380 ACP':    [v('s_YZ4H1axCY', 'msarmy'), v('-OinJl5azFk', 'msarmy')],
  '.32 ACP':     [v('hmN9gMZRT_Q', 'msarmy'), v('pPt81-e7Ky4', 'msarmy')],
  '.40 S&W':     [v('7BnaBTeerIQ', 'msarmy'), v('ujpykirYDIk', 'msarmy')],
  '.45 ACP':     [v('-IX-faii6qQ', 'msarmy'), v('KggHg8UyzI0', 'msarmy')],
  '.38 Super':   [v('fYizFugZx3w', 'msarmy'), v('YctSyZZxZFI', 'msarmy')],
  '.38 Special': [v('-u9rTNgpiYw', 'msarmy'), v('glq9UJ5eI6o', 'msarmy')],
  '.357 Magnum': [v('ZitAhiLiLRY', 'msarmy')],
  '.22 WMR':     [v('FWNecLbZQQY', 'msarmy'), ANULAR],
  '.22 LR':      [ANULAR],
  '.17 HMR':     [v('4oID4UPCJEE', 'msarmy'), ANULAR],
  '.30 Carbine': [v('uQjZlQNpm0k', 'msarmy')],
};

// La portada de la Guía de calibres, después de las fichas.
const GUIA_CALIBRES = [v('wUS4_ASpRjI', 'msarmy')];   // todos los .38 / 9 mm / .357

window.AMX_VIDEOS = { POR_ARMA, POR_CALIBRE, GUIA_CALIBRES, CANALES };

// Los videos de una ficha. `arma` acepta además el campo `youtube` que se edita
// en el admin, para que ese campo siga teniendo efecto; va detrás de los fijados aquí.
window.amxVideos = function (tipo, entidad) {
  if (tipo === 'guia-calibres') return GUIA_CALIBRES;
  if (!entidad) return [];
  if (tipo === 'arma') {
    const lista = (POR_ARMA[entidad.id] || []).slice();
    const id = window.youtubeId && window.youtubeId(entidad.youtube);
    if (id && !lista.some((x) => x.id === id)) lista.push({ id, canal: CANALES.armasms });
    return lista;
  }
  if (tipo === 'calibre') return POR_CALIBRE[entidad.id] || [];
  if (tipo === 'municion') return POR_CALIBRE[entidad.calibre] || [];
  return [];
};
})();

// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// Renderizador HTML prerrenderizado para /soporte
// Genera HTML estático con el contenido editorial completo sin JavaScript.

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const lista = (items) => `<ul>${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;

export function renderSoporteHtml(c) {
  const hoja = (id, titulo, cuerpo, clases = '') => `<section class="amx-soporte-regla${clases}" aria-labelledby="${id}">
<h2 id="${id}">${esc(titulo)}</h2>${cuerpo}</section>`;
  return `<article class="amx-soporte amx-v2">
<nav aria-label="Ruta"><a href="/">Inicio</a> › Soporte</nav>
<div class="amx-soporte-cabecera">
<span class="amx-soporte-cabecera-rotulo" aria-hidden="true">Comunidad</span>
<header class="amx-soporte-portada">
<h1 class="amx-dymo">${esc(c.titulo)}</h1>
<p class="amx-soporte-apertura">${esc(c.apertura)}</p>
<p class="amx-soporte-alcance">${esc(c.alcance)}</p></header>
<section class="amx-soporte-aviso" aria-labelledby="limite-compraventa">
<p class="amx-soporte-aviso-tit" id="limite-compraventa">${esc(c.venta.titulo)}</p>
<p>${esc(c.venta.intro)}</p>${lista(c.venta.puntos)}
<p class="amx-soporte-alcance">${esc(c.venta.consecuencia)}</p></section>
</div>
<section aria-labelledby="normas-comunidad"><h2 id="normas-comunidad">Normas</h2>
<div class="amx-soporte-reglas">${c.normas.map((n) =>
  `<section class="amx-soporte-regla"><h3><span class="amx-soporte-num">NORMA ${esc(n.numero)}</span>${esc(n.titulo)}</h3>${lista(n.puntos)}</section>`).join('')}</div></section>
${hoja('moderacion', 'Cómo se moderan las reseñas', lista(c.moderacion), ' amx-soporte-carbon')}
${hoja('denuncia', 'Denunciar una reseña',
  `<p>${esc(c.denuncia.intro)}</p><p class="amx-soporte-alcance">${esc(c.denuncia.privacidad)}</p>`)}
${hoja('clasificacion', c.clasificacion.titulo, lista(c.clasificacion.criterios))}
${hoja('correccion', c.correccion.titulo,
  `<p>${esc(c.correccion.intro)}</p>${lista(c.correccion.pasos)}` +
  `<h3>Fuentes aceptables</h3>${lista(c.correccion.fuentes)}`)}
<nav class="amx-soporte-regla" aria-label="Más ayuda">
<a href="/legalidad">Legalidad</a> · <a href="/preguntas">Preguntas frecuentes</a></nav>
</article>`;
}

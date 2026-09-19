// Armado en México — Copyright (C) 2026 Saulo Flores León
// SPDX-License-Identifier: AGPL-3.0-or-later
// Software libre bajo AGPL-3.0. Sujeto además a los términos adicionales
// (§7 c, e) de LICENSE-TERMINOS-ADICIONALES.md, en la raíz del repositorio.

// Renderizador HTML prerrenderizado para /soporte
// Genera HTML estático con el contenido editorial completo sin JavaScript.

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const lista = (items) => `<ul>${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;

export function renderSoporteHtml(c) {
  return `<article>
<nav aria-label="Ruta"><a href="/">Inicio</a> › Soporte</nav>
<h1>${esc(c.titulo)}</h1>
<p>${esc(c.apertura)}</p>
<p>${esc(c.alcance)}</p>
<section aria-labelledby="limite-compraventa"><h2 id="limite-compraventa">${esc(c.venta.titulo)}</h2>
<p>${esc(c.venta.intro)}</p>${lista(c.venta.puntos)}<p>${esc(c.venta.consecuencia)}</p></section>
<section aria-labelledby="normas-comunidad"><h2 id="normas-comunidad">Normas</h2>
${c.normas.map((n) => `<section><h3>${esc(n.titulo)}</h3>${lista(n.puntos)}</section>`).join('')}</section>
<section><h2>Cómo se moderan las reseñas</h2>${lista(c.moderacion)}</section>
<section><h2>Denunciar una reseña</h2><p>${esc(c.denuncia.intro)}</p><p>${esc(c.denuncia.privacidad)}</p></section>
<section><h2>${esc(c.clasificacion.titulo)}</h2>${lista(c.clasificacion.criterios)}</section>
<section><h2>${esc(c.correccion.titulo)}</h2><p>${esc(c.correccion.intro)}</p>
${lista(c.correccion.pasos)}<h3>Fuentes aceptables</h3>${lista(c.correccion.fuentes)}</section>
<p><a href="/legalidad">Legalidad</a> · <a href="/preguntas">Preguntas frecuentes</a></p>
</article>`;
}

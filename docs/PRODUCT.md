# PRODUCT.md — Armado en México

> **Qué es esto.** La verdad de producto del sitio: quién lo usa, para qué, y qué restricciones
> debe preservar cualquier trabajo futuro. No contiene decisiones visuales — esas viven en
> `DESIGN.md`, que es la autoridad de dirección de arte y no se toca desde aquí.
>
> Escrito el 7-sep-2026 con `/impeccable init`. Las respuestas de Saulo están marcadas
> **[confirmado]**; lo derivado del repositorio, **[evidencia]**; lo que falta por decidir,
> **[abierto]**.

---

## Plataforma

`web` **[evidencia]**. Sitio estático publicado en Cloudflare Pages, con una página
prerenderizada por URL y una capa de datos en D1. No hay app nativa ni envoltorio; el móvil es web móvil.

---

## Usuarios

**Dos públicos, con el mismo peso** **[confirmado]**. Ninguno manda sobre el otro, y esa es la
restricción de diseño más exigente del producto:

- **El civil que considera su primera arma.** Llega sin saber qué puede adquirir legalmente, qué
  cuesta ni cómo funciona el trámite en la DCAM. Necesita orientación y confianza.
- **El tirador o coleccionista con experiencia.** Ya sabe de armas; viene por precios vigentes,
  existencias por sucursal, compatibilidad de accesorios y comparación entre modelos concretos.
  Prioriza densidad y exactitud.

**Consecuencia:** el sitio no puede simplificarse hasta volverse inútil para el experto, ni
densificarse hasta expulsar al primerizo. Cuando ambas necesidades chocan, se resuelve con
progresión (lo esencial visible, el detalle a un clic), no eligiendo un público.

---

## Qué hace posible

Responder, con dato verificable, **qué armas puede comprar legalmente un civil en México, cuánto
cuestan hoy y qué dice la ley al respecto** — información que está dispersa, desactualizada o
simplemente no publicada en línea.

## Posicionamiento

**Las tres cosas juntas** **[confirmado]**. Ninguna por separado justifica el sitio:

1. **Precios y existencias reales de la DCAM.** Precio con IVA e inventario por sucursal, trazados
   a un inventario oficial fechado. Nadie más lo publica de forma consultable.
2. **El marco legal explicado y respaldado.** La Ley Federal de Armas de Fuego y Explosivos
   traducida a algo entendible, con clase legal por arma y siempre con texto real de la ley.
3. **El catálogo completo en un solo lugar.** Armas, municiones, accesorios y sus compatibilidades,
   reunidos y comparables.

El mecanismo diferencial es la **trazabilidad**: cada precio apunta a su inventario fuente y su
fecha; cada afirmación legal, a su texto de ley. El sitio vale lo que vale su procedencia.

---

## Capacidades

**[evidencia]** — el catálogo de armas al completo, con un `.html` por URL. Las cifras
del día las imprime `npm run build` y las repinta el README solo; aquí no se copian,
porque copiadas se quedan viejas (llegaron a decir 192 armas y 321 páginas).

- Catálogo por tipo (pistola · revólver · rifle · escopeta · carabina), calibre, uso y disponibilidad.
- Ficha por arma: especificaciones, clase legal, precio actual e histórico, existencias por sucursal,
  accesorios compatibles, municiones, opiniones y contenido en video.
- Municiones, accesorios (ópticas, cargadores, empuñaduras, refacciones) y armas traumáticas.
- Comparador lado a lado.
- Sección legal, cursos, campos de tiro, experiencias, preguntas frecuentes y soporte.
- Propuestas de cambio y opiniones de usuarios.
- Panel de administración (`admin.html`) tras Cloudflare Access.

---

## Terminología

Vocabulario del dominio, no intercambiable por sinónimos:

- **DCAM** — Dirección de Comercialización de Armamento y Municiones (SEDENA). Sucursal y fuente
  de precios. **OTCA** — la otra sucursal con inventario propio.
- **Clase legal** — la categoría bajo la que la ley permite o restringe un arma.
- **Disponibilidad** — `uso civil` · `policía / seguridad` · `exclusivo Ejército`.

---

## Restricciones durables

**Inviolables** **[confirmado, §4.4/§6b de DESIGN.md]** — no son preferencias estéticas, evitan
problemas legales y de confusión institucional:

- **Nada de iconografía oficial de instituciones públicas.** Ni escudo nacional, ni águila, ni
  emblemas de SEDENA o de gobierno, ni «inspirados en». El sitio no puede parecer del gobierno.
- **Prohibido inventar leyes, artículos o reformas.** Todo contenido legal va respaldado por texto
  real de la ley, con fuente y fecha visibles. El apartado legal solo se modifica cuando la ley
  cambia de verdad.
- **Los logotipos** de Armado en México, Armas y Más y Armas M&S, y el nombre de **Saulo Flores
  León**, se usan tal cual y no se tocan.

**Accesibilidad** **[evidencia, §7 de DESIGN.md]** — el sitio es divulgativo y con contenido de
referencia legal, así que el listón no es negociable: contraste ≥ 4.5:1 para todo texto que porte
información, objetivos táctiles ≥ 44px, `:focus-visible` siempre visible, y `prefers-reduced-motion`
desactiva todo movimiento ambiental.

**Datos** **[evidencia]** — `priceExact` debe coincidir con el último registro del historial; los
ids son contiguos; los historiales van en orden cronológico. La skill `verificar-app` lo audita y
falla el build si no se cumple.

---

## Stack

**[evidencia]** — decidido y en producción; no es una elección abierta.

- React vía UMD, sin bundler. Los `.jsx` son la fuente.
- `npm run build` = Babel CLI (`.jsx` → `.js`) + `build-prerender.mjs` (un `.html` por URL).
- **Los `.js` y los `.html` generados no se versionan.** Se edita el `.jsx`.
- Cloudflare Pages + D1. `admin.html` protegido por Cloudflare Access.

---

## Éxito

**[abierto]** — no hay métrica declarada. Falta saber si el objetivo es tráfico de consulta,
conversión hacia la tienda (Armas M&S), o servir de referencia citable. Se decide con Saulo antes
de que ninguna decisión de producto dependa de ello.

## Sin decidir

- **[abierto]** Relación operativa entre Armado en México y la tienda Armas M&S: si el sitio debe
  dirigir a la venta o mantenerse estrictamente informativo.
- **[abierto]** Método de emparejamiento arma ↔ accesorio por nombre de modelo (hoy solo por
  calibre). Referencia a estudiar: `github.com/midudev/canirun.ai` (§4.1 de `DESIGN.md`).
  Es trabajo de datos, no de diseño.
- **[evidencia]** Cubierto: hoy todas las armas del catálogo tienen fotografía propia y su
  archivo en `public/`, así que ninguna cae en `window.armaPlaceholder`, que queda de red
  para las altas nuevas. Llegó a ser el 32% (62 de 192) cuando se levantó este documento.

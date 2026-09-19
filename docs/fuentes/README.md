# De dónde salen los datos de la guía de calibres

Los 30 calibres de `src/data/data-extra.js` no se escribieron a mano: se
compusieron el 19-sep-2026 a partir de estos cuatro archivos, que se conservan
para poder auditar cada número y cada afirmación legal.

| Archivo | Qué contiene |
|---|---|
| `cifras-11.json` | Largo, velocidad y energía de los 11 calibres que no estaban en la guía. Los largos son la dimensión **L6 (cartridge maxi)** de la ficha TDCC de la **C.I.P.**, leída de cada PDF y contrastada con SAAMI: coinciden al centésimo de milímetro. Velocidad y energía salen de la ficha del fabricante de una carga comercial corriente, citada en cada entrada. |
| `legal-30.json` | El estatus legal de los 30, con el artículo que lo respalda. Su única fuente es el texto ya aprobado del FAQ (`src/lib/store.js`, tema «Calibres») y los textos de `_legalFor` en `src/data/data.js`. **No se inventó ningún artículo.** |
| `textos-11.json` | Descripciones y usos de los 11 nuevos, redactados para esta guía. |
| `calibres-30.json` | El resultado de fundir los tres anteriores con los 19 que ya existían. Es lo que se volcó a `data-extra.js`. |

Tres calibres quedaron **sin sello legal a propósito** —`.357 Magnum`, `.45 ACP`
y `5.7×28`—: no hay en el repo ningún texto que fije su clasificación, y un hueco
marcado es preferible a una afirmación jurídica inventada (`docs/DESIGN.md` §6b).
Otros cuatro van marcados `revisar`.

El juez de estos datos es `scripts/check-calibres.mjs`: ninguna ficha pasa sin
largo real, estatus legal y fuente de sus cifras.

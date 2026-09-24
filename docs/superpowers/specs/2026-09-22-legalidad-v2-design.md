# Legalidad v2 — diseño acordado (22-sep-2026)

Diseñado en Penpot («Wire Frame», página `10 Legalidad`, versión «10 legalidad v2 — veredicto
de Saulo») y decidido por Saulo en ocho hilos de comentarios sobre los boards. Este documento
es lo que el código tiene que cumplir; el contenido (condensar la investigación y cerrar los
18 huecos) es un trabajo aparte y posterior.

## Las ocho decisiones

| # | Sobre | Decisión de Saulo |
|---|---|---|
| 1 | Hub | La entrevista «¿Puedo comprar un arma?» va arriba. El mapa del trámite conserva su sitio pero **hay que rediseñarlo** (el actual no se lee en móvil): sesión y PR aparte. |
| 2 | Hub | Los huecos declarados **no se muestran al público**: son de desarrollo interno (`docs/fuentes/legalidad.md`, `check-legal.mjs`). |
| 3 | Federal | Las normas se ordenan **por pregunta ciudadana**, no por jerarquía; la jerarquía se ve dentro de cada norma. |
| 4 | Federal | Los 33 artículos van como **resumen llano + cita a la fuente**; el literal se abre desde la cita. |
| 5 | Estatal | Las 14 entidades sin portal verificado se muestran **en gris** con «portal sin verificar», no se quitan del selector. |
| 6 | Requisitos + Permisos | Se **fusionan en una pantalla «Trámites»**: seis trámites en orden, cada uno con lo que habilita, su checklist plegada y su costo. |
| 7 | Trámites | La **vigencia de las cuotas** («Cuota 2026 · caduca 1-ene-2027») se muestra en rojo bajo cada importe. |
| 8 | Dictamen | El conflicto formato 2021 / ley 2025 se marca con **NotaErrata**, no con un sello. |

## Las pantallas (4 + entrevista)

| Ruta | Pantalla | Board en Penpot | Qué cambia respecto a hoy |
|---|---|---|---|
| `/legalidad` | Hub | `screens / movil / legalidad` | Orden: cinta · eyebrow con fecha · título · intro · aviso de transparencia · **bloque entrevista con CTA** · mapa del trámite (sin cambios, pendiente de rediseño) · **tres** carpetas (Federal, Estatal, Trámites) · cita. Sale el bloque «Qué falta por verificar» (`amxLegalHuecos` deja de renderizarse; el dato sigue en el corpus). |
| `/legalidad/federal` | Lo federal | `screens / movil / legalidad-federal` | La escalera `amx-leg-escalera` pasa a **tres grupos con cinta Dymo**: «¿Qué arma puedo tener y dónde?» (Constitución, LFAFE) · «¿Qué papel lleno y con qué documentos?» (Formato 02-040, Reglamento, Acuerdo médico, Requisitos DCAM) · «¿Cuánto cuesta cada trámite?» (Ley Federal de Derechos, Costos 2026). Cada norma: rótulo numerado, título, resumen, «N artículos · resumen llano + cita ›» y, si aplica, nota de vigencia en `--alerta`. El Acuerdo de simplificación 2026 (sin texto confirmado) **no se publica** hasta verificarse (decisión 2). |
| `/legalidad/estatal` | Lo que cambia por estado | `screens / movil / legalidad-estatal` | Sin cambios de estructura. Las 14 sin portal: opción en gris (`--tinta-2`) con «portal sin verificar»; al elegirlas, la fila «Antecedentes» dice «portal sin verificar» en vez de enlazar. |
| `/legalidad/tramites` | Trámites | `screens / movil / legalidad-tramites` | **Nueva**, sustituye a `/legalidad/requisitos` y `/legalidad/permisos`. Cinta · intro · hoja «Posesión no es portación» · seis tarjetas (`Paso N de 6`, homoclave, nombre, qué habilita, importe `tipo/dato-grande`, vigencia en rojo, checklist plegada con `<details>`; la del primer trámite abierta por defecto) · cita. Los requisitos conservan el sello ORIGINAL en rojo en la propia línea. |
| `/legalidad/puedo-comprar` | Entrevista | `…-puedo-comprar-pregunta` y `…-dictamen` | Sin cambios en el flujo. En el dictamen: sale el sello y entra **NotaErrata** (caja `--oficio-2` con filete `--rotulador`, rótulo «Errata · prevalece la ley» y el texto del conflicto) inmediatamente después de la hoja del dictamen; las opciones de respuesta a ancho completo con salto de línea. |

## Cambios de código (para el PR de implementación)

- `src/app.jsx`: ruta `legal-tramites` → `/legalidad/tramites`; `/legalidad/requisitos` y
  `/legalidad/permisos` redirigen a `/legalidad/tramites` (en `amxParsePath` y en `404.html`),
  no desaparecen sin más: están en el sitemap publicado.
- `src/screens/screens-legalidad.jsx`: `LegalidadTramites` (fusión de `LegalidadRequisitos` y
  `LegalidadPermisos`; cada trámite con su checklist en `<details>`); `LegalidadHub` sin el
  bloque de huecos y con tres carpetas; `LegalidadFederal` agrupada por pregunta.
- `src/lib/legal.js`: el agrupador `amxNormasPorPregunta(normas)` con la tabla de tres
  preguntas → ids de norma (`constitucion`, `lfafe` · `formato-02040`, `reglamento`,
  `acuerdo-medico`, `requisitos-dcam` · `lfd`, `costos-2026`). `acuerdo-simplificacion` queda
  fuera mientras `revisar: true`. `amxLegalHuecos` se conserva para `check-legal.mjs`, deja
  de usarse en pantalla.
- `src/screens/screens-entrevista.jsx`: `NotaErrata` (ya existe en `ui.jsx`) en el dictamen
  cuando el escenario lleve `notaVigencia`; sin sello.
- `src/styles/estilo.css`: `.amx-leg-*` para las tarjetas de trámite y la vigencia; nada
  nuevo que no salga de tokens.
- `scripts/build-prerender.mjs` y `scripts/prerender-legal.mjs`: `legalidad/tramites` entra;
  `requisitos` y `permisos` salen (454 → 453 páginas); sitemap y `docs/PENPOT.md` al día.
- Tests: `scripts/legalidad.test.mjs`, `rutas.test.mjs`, `pantallas.test.mjs`,
  `referencias.test.mjs` (nombres de pantalla), y el conteo del prerender.
- `README.md`: llevar Legalidad al README (pendiente desde el PR #126).
- No hace falta resembrar D1: Legalidad ya no lee de `pages`.

## Lo que queda fuera de este PR

- El rediseño del mapa del trámite (`src/components/mapa-tramite.jsx`): decisión 1, PR aparte.
- El contenido: condensar la investigación en los textos de cada norma y trámite y cerrar
  los 18 huecos y los 14 estados sin portal (`docs/fuentes/legalidad.md`).

## Evidencia en Penpot

Exportaciones de los boards `screens / movil / legalidad`, `…-federal`, `…-tramites` y
`…-puedo-comprar-dictamen` adjuntas al PR; los 8 hilos con la respuesta «Aplicado: …» y
marcados como resueltos; versión «10 legalidad v2 — veredicto de Saulo (22-sep-2026)».

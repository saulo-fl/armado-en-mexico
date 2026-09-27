# Ficha de calibre en el expediente — diseño

**Fecha:** 27-sep-2026 · **Rama:** `Opus-5/RED-ficha-calibre` · **Decidido con Saulo en cinco rondas.**

La ficha de cada calibre (`/calibres/<slug>`, `CalibreScreen` en `src/screens/screens-3.jsx`) era una tarjeta
blanca con tabla: la única ficha fuera del folder manila. Pasa al mismo expediente que las fichas de arma,
accesorio y munición (DESIGN.md §5.5, §5.8, §5.11). El índice `/calibres` no se toca.

## Decisiones (literal de las respuestas)

| Pieza | Decisión |
|---|---|
| Alcance | Solo la ficha `/calibres/<slug>` |
| Molde | Réplica del expediente |
| Talón y tarjeta de almacén | Se omiten: un calibre no tiene precio ni existencias propias |
| Pestaña del folder | «Calibre» en las 30 |
| Cabecera | Todo lo de hoy: clase · sistema, nombre, uso, «También se le llama…», descripción |
| Copia | Polaroid con clip y la foto del cartucho; al pie «.380 ACP» y «25 mm de largo» |
| Sin clasificación (.357 Magnum, .45 ACP, 5.7x28mm) | Sin sello |
| Papel milimétrico | Solo «Energía frente a los otros 29» (regla comparativa y su fuente) |
| Regla del cartucho | Se retira: la foto y el largo al pie la sustituyen |
| Escopetas (.410, 12, 16, 20 GA) | Sin milimétrico |
| Separadores | Armas · Legalidad, abre en Armas; «Lo disparan:», 6 enlaces y «Ver las N»; sin armas no hay hoja |
| Ficha técnica | Velocidad, Energía, Retroceso, En el catálogo |
| Escritorio (≥1024) | Como munición sin la fila de talón: `foto cab` / `foto ficha` / `legal historial` |
| Escopetas en escritorio | Los separadores se quedan en su columna |
| Móvil | cabecera → copia → ficha técnica → milimétrico → separadores |
| Debajo del folder | Municiones de este calibre (vitrina de §5.11) → Armas que lo usan (polaroids de hoy) → «¿Encontraste un dato incorrecto?» |

## Datos

- **Municiones del calibre.** 17 de 30 tienen munición en el inventario. El inventario escribe «.308 Win»,
  «.243 Win» y «.270 Win» donde la guía y las armas dicen «… Winchester»: el cruce lo hace
  `amxMismoCalibre(a, b)` en `src/lib/calibres.js`, que iguala solo ese sufijo.
- **Armas del calibre:** `armasPorCalibre(id)` de siempre (igualdad exacta: las armas ya dicen «Winchester»).
- **Nada nuevo en D1:** calibres y municiones salen del código; solo las armas se hidratan.
- **El prerender** (`scripts/build-prerender.mjs`, «Ficha de cada calibre») genera su propio HTML y no cambia.

## Fuera de alcance

El índice `/calibres`, el GIF de calibres del README (recorre solo el índice), las 7 decisiones legales
pendientes de la guía y el texto legal de cada calibre (salvo lo que Saulo apruebe aparte).

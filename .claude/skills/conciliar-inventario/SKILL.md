---
name: conciliar-inventario
description: Concilia un inventario oficial (PDF) de DCAM o OTCA en el catálogo de "Armado en México". Úsalo SIEMPRE que el usuario suba un PDF de existencias/precios (DCAM-SEDENA o OTCA-Monterrey, "anexo", "inventario", "existencias") y pida incorporarlo, actualizar precios/existencias, o "conciliar". Cubre armas (data.js + data-precios.js), accesorios (data-accesorios.js) y municiones (data-municiones.js).
---

# Conciliar inventario DCAM / OTCA

Flujo recurrente y de alta precisión (se publican precios oficiales). Sigue estos
pasos EN ORDEN. No improvises el mapeo: un precio mal mapeado es un error visible.

## 0) Antes de empezar
- Lee `AGENTS.md` (sección "Conciliar inventarios y precios") y la cabecera de
  `src/data/data-precios.js` — son la fuente de verdad del esquema.
- Trabaja SIEMPRE sobre `origin/main` fresco: `git fetch origin main && git checkout -B <rama> origin/main`. (Ver skill `publicar`: NO hacer `checkout -B` sin `fetch` — te basas en un main viejo y revertirías trabajo.)
- El entorno de nube NO tiene salida a internet: no intentes descargar imágenes ni verificar armado.mx con curl.

## 1) Extraer el PDF (parser posicional)
Usa `scripts/parse_pdf.py` (PyMuPDF/`fitz`, ya instalado). Detecta el formato solo
(OTCA pone «$» en los precios; la DCAM no):
- **DCAM** (sin «$»; 2025 y 2026): tabla posicional. Las columnas se toman de las
  cabeceras «Existencia»/«Precio» de la pág. 1 (en 2026, **precio** x≈510-530 y
  **existencia** x≈446-486; en oct-2025, más a la izquierda), y el
  **nombre corto** (y su descripción larga que envuelve debajo) en x≈31. El precio
  y la existencia comparten la MISMA fila `y` que el nombre corto. Cuidado: las
  descripciones largas se derraman a la página siguiente entre el header repetido.
- **OTCA anexo** (columnas "DESCRIPCIÓN / EXISTENCIA / PRECIO PUBLICO M.N."): layout
  apilado. Por ítem: descripción (multi-línea) → existencia (entero) → precio ($N).

Comando: `python3 .claude/skills/conciliar-inventario/scripts/parse_pdf.py <ruta.pdf>`
Salida: JSON con `[{idx, name, qty, priceN, desc}]` (`desc` = descripción larga, solo DCAM).
Desde sep-2026 la DCAM publica **tres PDFs** (armas, cartuchos, accesorios): cópialos como
`dcam-existencias-`, `dcam-municiones-` y `dcam-accesorios-AAAA-MM-DD.pdf`. Si llega uno
combinado, separa por prefijo (`CARG|CART|CULATA|SISTEMA|CLIPS|CAÑON` = accesorio/munición).
Autochequeo del parser: `python3 .claude/skills/conciliar-inventario/scripts/test_parse_pdf.py`.

## 2) Mapear PDF → catálogo (VERIFICADO, no fuzzy)
- El campo `dcamRef` en `data.js` es el nombre-corto del PDF, pero **normalizado a
  mano** (sin puntuación, "IWI" junto): el matching por string exacto o difflib
  FALLA (mapea TH380→PT58, P-07→P-09, etc.). Mapea por **marca + modelo + calibre**.
- Construye un dict explícito `{ id_catalogo: idx_pdf }` y REVISA cada renglón:
  imprime tabla `id | nombre | calibre | precio_viejo → precio_nuevo | qty`.
- Chequeo semántico: que un token distintivo del modelo aparezca en el renglón PDF.
- Colisiones típicas: variantes de acabado/cañón (DT11 30"/32", B5.25 71/76cm,
  GX4 vs GX4 CO vs GX4XL, XD-M vs XD-M Elite). Elige UNA representativa por modelo.

## 3) Aplicar cambios
Guiado por las reglas de `AGENTS.md` y `data-precios.js`:
- **Registrar el inventario nuevo** en el `*_MANUALES` correspondiente con
  `primary: true` y quitar `primary` al anterior de esa autoridad. Copia el PDF a
  `public/inventarios/<dcam|otca>-...-AAAA-MM-DD.pdf`.
- **Presentes**: actualiza `priceExact` (13º arg de `mk(...)` en data.js — reemplaza
  solo el token `"\d+\.\d{2}"`) y AÑADE un registro al historial. INVARIANTE:
  `priceExact` debe igualar SIEMPRE el último registro del historial.
- **Agotadas** (no están en el último inventario de su sucursal): quítalas del mapa
  de existencias DCAM y fija su precio al inventario previo (no lo atribuyas al
  nuevo primario). La ficha las muestra "AGOTADO en <sucursal>".
- **Modelos nuevos**: alta de ficha (ids consecutivos). avail por calibre:
  9mm/.40/5.56/7.62 = `ejercito`; .380 cañón largo = `seguridad`; .380 corto/.22/.38
  Special/escopetas/rifles de caza = `dcam`. Imagen `""` (placeholder). Deriva specs
  de la descripción del PDF + conocimiento; historia 1-2 frases (estilo OTCA 112-128).
- **Accesorios/municiones**: mismo patrón. La existencia vive en el `qty` del último
  registro del historial (no en un mapa aparte). Municiones DCAM y OTCA suelen ser
  sets DISTINTOS (nacionales vs. españolas de competencia) → casi todo es alta nueva.
- **Inventario fuente** («Ver inventario fuente» de la ficha): es el `priceManualId`, y
  tiene que ser el inventario del **último registro del historial**. En accesorios y
  municiones se deriva solo al final de `data-accesorios.js` / `data-municiones.js`: al
  añadir un registro NO hay que tocar el `priceManualId` de la ficha, pero tampoco borres
  esa derivación. En armas no se escribe (la ficha cae al último registro). `auditar.js`
  falla si alguna ficha apunta a otro inventario o a uno que no existe.

## Decisiones de producto (CONVENCIÓN FIJA — el usuario ya las tomó)
- **Modelos nuevos → SIEMPRE se dan de alta como fichas** (no omitir). Specs derivadas
  del PDF + conocimiento; imagen ""; avail por calibre. Si un modelo es variante de
  acabado/cañón de uno ya catalogado, NO dupliques; si es calibre distinto o marca
  distinta, SÍ es ficha propia.
- **Municiones — registra el precio TAL CUAL lo da el inventario. NO inventes, NO
  prorratees, NO calcules por-unidad.** Si DCAM vende por cartucho, registras por
  cartucho; si OTCA vende por caja (p. ej. PMC 9mm: 17,700 existencia / $406.19), lo
  registras por caja. Por eso DCAM y OTCA van SEPARADOS. **Marca distinta del mismo
  calibre = ficha propia** (no consolidar marcas). Existencia = la del inventario.
- **(13-sep-2026) Variantes: «un mismo arma no puede estar cambiando de calibre; si son
  diferentes se crean las variantes pero no se sobrescriben modelos».** Una ficha =
  **modelo + calibre**. Si en un inventario coexisten varias variantes de acabado/cañón
  del mismo modelo y calibre, van en la MISMA ficha, que suma existencias, y su precio
  sigue a una **variante representativa fija**, siempre la misma (la de la ficha: su
  `dcamRef`/nombre/specs; si no discrimina, la de su primer registro). **Cuando esa
  variante desaparece y solo queda otra, la ficha queda AGOTADA con su último precio y la
  variante que queda entra como FICHA NUEVA** con su propio historial (incluidos los
  renglones anteriores de esa variante). Nunca se «pasa» una ficha a la variante nueva:
  eso da saltos de precio que no son subidas (DT11 +24.6 %, 694 +21 %).
- **(13-sep-2026) La presentación (número de cargadores, estuche, kit) no es variante:
  misma ficha, suma existencias.** Dos renglones del mismo modelo y calibre que solo
  cambian lo que trae la caja nunca separan fichas ni dejan una agotada; el precio sigue a
  una presentación representativa fija (la que la ficha publica y sigue en el inventario).
  Casos: Springfield XD-M 36 (1 o 2 cargadores adicionales), Taurus GX4 24 (2×11 o 3×13).
- **(13-sep-2026) Un historial no mezcla modelos ni calibres.** Cada registro tiene que
  corresponder a un renglón del PDF de ESE modelo y ESE calibre. Si aparece uno ajeno, se
  mueve a la ficha correcta (existente o variante nueva) sin tocar el modelo ni el calibre
  de la ficha original. Vale para armas, accesorios y municiones (en municiones, DCAM y
  OTCA separadas y marca distinta = ficha propia NO son mezcla). Mismo cargador para otra
  pistola = otro modelo (113 CZ Shadow 2 vs 134 CZ P-07).
- **(13-sep-2026) Municiones TAL CUAL el PDF aunque el fabricante no publique esa
  combinación** (perdigón/gramaje de catálogo inexistente: Saga Gold 28 BB, Magnum 50 BB,
  GB Express P4, Rio Game Load P4, Saga Sporting 32). Sin nota. Sí se añade lo que el PDF
  dice y la ficha omitía (p. ej. «eslabonado»).
- **(13-sep-2026) Erratas de precio de la DCAM.** Si el precio publicado es una errata
  evidente, se publica el **último precio conocido** con una nota visible junto al precio
  («probablemente es un error de la publicación de la Secretaría de la Defensa»); **si no
  hay precio anterior, se publica el del PDF con la misma nota**. Contrato de datos: el
  registro del historial lleva `errata: '<precio tal como lo publicó la DCAM>'` (string,
  mismo formato que `price`) y `price` es el que se publica. En accesorios:
  `_h(mid, price, date, qty, errata)`. Solo lo marca Saulo: si la conciliación o una
  auditoría encuentra otra errata, se LISTA en el PR, no se marca.
- **(14-sep-2026) Compatibilidad accesorio ↔ arma por LISTA EXPLÍCITA, no por calibre.**
  Al dar de alta un accesorio **o una arma nueva**, actualiza `ACC_COMPAT` en
  `data-accesorios.js`. Cargador, cañón, culata o refacción = `armas: [ids]`: las fichas
  que nombra la descripción del PDF («P/HK G36», «IWI MASADA»), verificadas con la ficha
  del fabricante, incluidas todas las fichas del mismo modelo y calibre (variantes de
  acabado). Si no se confirma ninguna, `armas: []`: mejor nada que algo falso. Solo lo
  verdaderamente universal (ópticas de riel) va por `tipos` + `riel: true`, y solo sale en
  las fichas con `riel` en `data.js` (riel Picatinny/Weaver superior de fábrica verificado
  con el fabricante; si no se puede verificar, sin riel): al dar de alta un arma, decide
  su `riel`. Un arma nueva puede entrar en listas ya existentes (p. ej. otra Glock 9 mm en
  las de los cargadores Glock): revísalas. «Compatible con» sale solo de los nombres de la
  lista; sin fichas, escribe en `amx()` la plataforma que nombra el PDF («Mossberg 500»),
  nunca un genérico («Pistola 9mm»). `auditar.js` falla si una lista apunta a un id de
  arma inexistente.
- **(15-sep-2026) Nombre de letrero `corto`.** Al dar de alta un accesorio, añade su entrada
  en `ACC_CORTO` (`data-accesorios.js`): lo que rotula el letrero de su puesto en la vitrina de
  `/accesorios` — la plataforma a la que sirve, con marca si cabe, calibre solo para
  desempatar, máximo 2 renglones a 360 px. `auditar.js` falla si falta o se repite.
- **(16-sep-2026) Tramo de los cargadores.** Al dar de alta un cargador, añade su entrada en
  `ACC_TRAMO` (`data-accesorios.js`): `[tipo de arma, calibre]` con los valores de
  `ACC_TRAMO_ARMAS` y `ACC_TRAMO_CALIBRES` (un calibre nuevo se añade ahí, en su orden). Si el
  renglón del PDF no trae calibre, búscalo en los inventarios y anota la fuente junto a la tabla.
  `auditar.js` falla si falta.

## 4) Verificar (obligatorio antes de commitear)
Invoca el skill `verificar-app` o corre `scripts/auditar.js`:
- Todos los `.jsx` transpilan (Babel standalone en `node_modules/@babel/standalone`).
- Los `data-*.js` cargan juntos en Node sin error.
- `priceExact == último registro del historial` para TODAS las armas.
- Existencias solo de presentes; agotadas removidas; historiales cronológicos.
- Inventario fuente (`priceManualId`) = el del último registro, en armas, accesorios y municiones.
- Mapeo semántico revisado; simulación por sucursal (presentes, agotados, solo-OTCA).

## 5) Publicar
Usa el skill `publicar`: rama → commit → PR a `main` Y `develop`. Si cambió
cualquier `data-*.js`, sube el sufijo `?v=` de cache-busting en los HTML.

## Bitácora de aprendizajes (automejora — AÑADE lo que descubras)
- 2026-06: el matching fuzzy (difflib) es inseguro; usar marca+modelo+calibre.
- 2026-06: el "precio actual" de la ficha se toma del último registro del historial,
  no de `arma.priceExact` directo (evita inconsistencias por caché de data.js).
- 2026-06: OTCA anexo trae un layout distinto al DCAM (columnas apiladas).
- 2026-06: gotcha git — `checkout -B <rama> origin/main` SIN `fetch` previo te basa
  en un main viejo; rebasa antes de pushear si te pasó.
- 2026-06 (anexos 18-jun): un "ANEXO" DCAM puede ser SOLO armas (sin accesorios ni
  municiones). Verifica composición antes de asumir refresco de los 3 catálogos.
- 2026-06: cuando llega un inventario casi idéntico a uno ya conciliado (16→18-jun),
  reconstruir el mapeo arma→renglón por `(precio, qty)` exacto del estado actual es
  rápido y auto-verificable (Δ mediano ~0 confirma; un mis-map da saltos enormes).
- 2026-06: `getArmaExistenciasOTCA` tenía hardcodeado el manualId del 26-sep → al alta
  de un OTCA nuevo hay que leer el OTCA MÁS RECIENTE (ya se hizo genérico).
- 2026-06: parser OTCA — la EXISTENCIA puede traer coma (`17,700`); usar
  `re.fullmatch(r'[\d,]+', s)`, no `isdigit()`. Saltar el boilerplate de pie/encabezado
  que se repite por página (RVC-…, "18 DE JUNIO…", "SECRETARÍA…"). Los números grandes
  con coma son EXISTENCIA, no precio.
- 2026-06: variante representativa puede desaparecer aunque el modelo siga disponible
  (Browning Maxus V.H.→B.G.). No agotar por ausencia del nombre exacto; revalidar por
  marca+modelo.
- 2026-07 (BUG del parser DCAM, corregido): la EXISTENCIA de municiones trae coma
  (`3,500`) y `parse_dcam` la filtraba con `isdigit()`. Al no haber candidato en su
  fila, el vecino más cercano le encajaba la qty de OTRO renglón → **las existencias
  de municiones del 16-jun quedaron mal** (valores repetidos 540/920/950/235). Ya se
  usa `[\d,]+` y se corrigieron los registros históricos. Si ves una qty repetida en
  muchos renglones seguidos, sospecha de esto.
- 2026-07 (BUG del parser DCAM, corregido): el nombre corto va a un desplazamiento
  vertical FIJO bajo el precio, pero ese offset **cambia entre layouts** (0.0 en el PDF
  de 2025-10, +1.6 en los de 2026). Con "la descripción más cercana" una línea larga
  derramada podía caer sobre el renglón del precio y robarle el nombre: así se perdió
  el **Tippmann M4-22 Redline** en las conciliaciones de 16 y 18-jun. Ahora el offset se
  calibra con la moda del propio documento.
- 2026-07: el encadenado catálogo→PDF_anterior→PDF_nuevo debe emparejar renglones por
  **(nombre, nº de ocurrencia)**: un mismo nombre corto se repite en el PDF (Huglu Atrox,
  Arex Delta L, Stribog, Renova, Taurus G3) y emparejar solo por nombre colapsa el grupo
  y falsea precio y qty.
- 2026-07: la Δ% uniforme es el mejor autochequeo. En 06-jul el 97 % de las armas cayó
  en +1.67 % o +0.31 %; los únicos outliers eran regresos legítimos de fichas agotadas.
  Un Δ raro fuera de esa distribución = mis-map, revísalo antes de aplicar.
- 2026-07: ACCESORIOS usan **una ficha con historial mixto DCAM+OTCA** (como las armas);
  MUNICIONES van **separadas por autoridad** (precio por cartucho vs. por caja). No los
  trates igual.
- 2026-07: un modelo agotado puede REGRESAR (Taurus TH380/PT59, SIG MCX). (La Weatherby
  Vanguard .243 NO regresó: el renglón del 6-jul era la Outfitter, otra línea; #161.) Antes de dar de alta una ficha nueva, contrasta el renglón contra el
  catálogo COMPLETO, no solo contra las fichas con existencia.
- 2026-09 (11-sep, CALIBRACIÓN de `parse_pdf.py`): la DCAM separó el anexo en **3 PDFs**
  (armas 204 · cartuchos 42 · accesorios 30). El layout es el mismo (offset del nombre
  +1.6, encabezado a y=159.9 o 153.9 según página), así que nombre/qty/precio salían bien;
  se verificó renglón a renglón contra el 6-jul re-parseado (0 diferencias). Lo que faltaba:
  (1) **`desc`**: 7 nombres cortos se repiten con productos distintos («ARMSAN P612 A.C.» ×3,
  una es la A612 semiautomática; «PHENOMA A.S.N.» ×2) y la descripción es lo único que los
  separa. Se recoge entre el nombre y el siguiente, cruzando de página (armas págs. 12, 18,
  19, 20, 24; cartuchos pág. 3), cortando 14 pt antes del siguiente nombre para dejar fuera
  su línea en negrita («(Venta exclusiva para Oficiales…)» se encima con el nombre). El pie
  de página se quita por POSICIÓN (y≥755), no por ser dígitos: «75» o «23715» sueltos son
  códigos de la descripción. (2) `--json` escribía cp1252 en Windows (HEFESTO): ahora UTF-8.
  (3) `EXISTENCIA DE ` genérico en el encabezado (antes solo «…DE ARMAS»).
- 2026-09: la **existencia agregada por ficha no es uniforme**. Muchas fichas toman UN
  renglón y dejan fuera sus variantes (CZ 457 con 13 variantes → solo «American»; Glock 17,
  P320 Full Size, Taurus 82S, PT58…); otras suman todas (Atrox, Maxus, Fair SLX800P, Stribog,
  Arex Delta L, B525, OPT-200, Stoeger M3000/P3500, Vanguard). Reconstruido con la suma
  exacta de qty del 6-jul contra `AMX_ARMAS_EXISTENCIAS`. Conserva el
  grupo que ya tenía cada ficha; si su representativo desaparece, suma las variantes que
  queden del mismo modelo (precedente Maxus). (14-sep, #161: Saulo mandó sumar ya la
  «clase A» —mismo modelo y calibre, solo acabado/cañón/presentación—; la «clase B», donde
  antes hay que decidir variante o modelo, se decide caso por caso.)
- 2026-09: cambiar de variante representativa mueve el precio aunque no haya subida
  (DT11 32" → DT11 Black DLC Pro +24.6 %, 694 Sporting → 694 Pro B-Fast +21 %, Renova VBN
  → camo +5.4 %). Y al revés: un precio puede encadenar EXACTO con otro modelo (92FS 6-jul ×
  0.98693 = «92A1» 11-sep, 5 u.). Manda la descripción (marca+modelo+calibre); señálalo.
- 2026-09: dos factores de ajuste conviven: −2.88 % general y −1.31 % en Beretta, Benelli,
  AYA, Stoeger, Grand Power y Chiappa (Franchi entra nuevo). Caesar Guerini +3.51 %.
  Municiones Águila de pistola/.30 Carbine/5.56 sin cambio.
- 2026-09: el PDF puede traer precios imposibles (cargador Tanfoglio FT-9-FS a $2.56): se
  registra TAL CUAL y se señala en el PR; no se corrige a mano. (13-sep: Saulo lo marcó como
  errata con el campo `errata`; ver «Decisiones de producto».)
- 2026-09-13 (AUDITORÍA de los 7 PDFs de armas + accesorios y municiones): el método que
  encontró las mezclas fue **encadenar precios con el factor de cada transición**
  (oct-25→16-jun ×0.89960 general / ×0.89447 grupo Beretta; 16→18-jun ×0.999326 / ×0.998077;
  18-jun→6-jul ×1.016673 / ×1.003131; 6-jul→11-sep ×0.971179 / ×0.986928; OTCA 26-sep ≈
  DCAM 3-oct ×1.00105; OTCA 26-sep→18-jun ×0.89804). Un registro que no encadena y cuyo
  «precio esperado» SÍ aparece en otro renglón del PDF es casi siempre un mapeo cruzado:
  Glock 19 (oct = 19X), GX4 ↔ GX4 Carry, Maxus (CF Negra → Hunter → Black Gold), Atrox
  (sintética → camo), XD-M (dos presentaciones), System Defence (C9 FS ↔ C9 Compact).
- 2026-09-13: **el nombre corto no basta ni para la marca**: el renglón DCAM 18-jun «ATROX
  SINT» describe una Huglu Renova camo (y encadena con ella); «ATROX C.» se usa para la
  sintética Y la camo. Manda la descripción larga + el encadenado.
- 2026-09-13: **el PDF OTCA 26-sep-2025 tiene descripciones que no salen como texto**
  (renglón $12,290.81 = SIG P322, solo visible renderizando la página). Si un renglón OTCA
  sale con descripción vacía, renderízalo (`page.get_pixmap(clip=…)`) antes de mapearlo.
- 2026-09-13: **`parse_pdf.py` no lee los PDFs de oct-2025** (DCAM existencias y accesorios
  3-oct: formato apilado sin «$»; detecta OTCA y devuelve 0 renglones). Para auditar se usó
  un lector apilado ad hoc (descripción → existencia → precio); pierde algún renglón cuando
  el texto se encima (XD-M $11,426.20, Taurus 856 Tungsten). RESUELTO el 14-sep (#161): ver abajo.
- 2026-09-13: una qty de municiones del 16-jun seguía mal por el bug viejo del parser
  (2023 Águila .308: 540 → 1,780). Si auditas municiones, compara (precio, qty) exactos.
- 2026-09-13 (revisor del PR #158): **«Ver inventario fuente» abría PDFs viejos** en 34
  accesorios y 34 municiones: la pantalla usa `priceManualId` antes que el último registro,
  y cada conciliación añadía registros sin actualizar ese campo escrito a mano. Ahora se
  deriva del historial en los propios `data-*.js` y `auditar.js` lo comprueba.
- 2026-09-13: **un mismo producto puede venir en dos renglones** (Águila .38 Super, código
  1E382112, en jun y jul) o cambiar de rótulo entre inventarios (Águila .270). Antes de
  dar un salto de existencia por «otro renglón», compara código y descripción larga.
- 2026-09-13: fichas creadas por acabado antes de la regla de variantes (Taurus 856 Inox /
  Pavón Mate / Tungsten; Mendoza RM22-6000 Black/Squad/Safari/Commander) se dejaron como
  están: la regla prohíbe sobrescribir modelos, no obliga a fusionar lo publicado.
- 2026-09-14 (#161, decisiones de Saulo sobre la conciliación del 11-sep):
  - **CZ 457: las líneas son modelos**, como las vende CZ. La 57 es la American (la American
    LH suma). Varmint MTR (227), Synthetic (228) y Stainless (229) son fichas propias. Las
    otras diez líneas del PDF (Lux, Premium, Premium LH, Varmint, Varmint LH, Varmint
    Synthetic, LRP Black, MDT, Thumbhole, AT-ONE, Training) siguen sin ficha: es clase B.
  - Un renglón que no dice la línea («CZ 457» a secas, oct-2025) se atribuye por
    **encadenado al centavo**: $21,514.50 × 0.887639 = Varmint MTR del 11-sep.
  - **Un registro OTCA puede traer la qty de todo el grupo** (41 en la 57 = seis líneas).
    Al separar, cada ficha lleva la qty de su propio renglón (Stainless: 9).
  - Weatherby Vanguard .243 (61): se aplicó la regla de variantes. Queda agotada con el
    precio de oct y la Outfitter entra como ficha 230. La foto de la 61 es una Vanguard
    sintética gris con paneles negros, no la Outfitter.
  - **Benelli MR1 16" = ficha propia (231)** aunque falte en una sola sucursal: tiene código
    propio (A0488100), cuesta ×1.59 y encadena su propio historial (16-jun → OTCA → 11-sep).
  - Erratas: el accesorio 104 y el OTCA de la Retay 106 NO se marcan.
  - **Duplicado DCAM del mismo cartucho** (2025/2029: mismo calibre, bala, grano y precio al
    centavo, distinta redacción) → se fusiona. Queda la ficha con la bala correcta y la otra
    desaparece, con las existencias sumadas.
  - **La URL de una munición sale de calibre+marca+bala+grano**: corregir la bala (Cor-Bon
    2026 FMJ → JHP) cambia la URL y la vieja da 404 (no hay `_redirects`). Si una ficha de id
    menor ya ocupa el slug, sale `-2`. Antes de tocar bala o grano, calcula las URLs de las
    fichas vecinas: al fusionar 2025/2029, la 2051 conserva su `-2`.
  - Altas con specs del fabricante. Lo que no se verifica va `""` y el año va `null`; `mk()`
    ya no le pone era, así que no cae en «clásico». Si el fabricante vende dos cañones y el
    PDF no dice cuál, peso y longitud van con el rango de los dos.
  - Fuentes que sí responden: **czfirearms.com** trae las specs en JSON embebido que WebFetch
    no ve (bájalo con curl y busca `"title":"CZ 457 …","productAttributes"`).
    **benelli.it/en/arma/mr1** no da 403 con curl. Para Optimum Arms,
    `optimumarms.com.tr/opt-vm-g2-20-compact-desert-sand` (y hermanas).
  - **`parse_pdf.py` lee oct-2025.** Detecta el formato por «$», toma las columnas de las
    cabeceras y separa el precio del texto que lleva pegado. Los 14 nombres ilegibles salen
    «?»: léelos renderizando. La salida de los 8 PDFs de 2026 y OTCA quedó idéntica byte a
    byte, y `test_parse_pdf.py` fija 177 armas y 22 accesorios de oct-2025.
- 2026-09-14: existe una **conciliación automática** de los inventarios DCAM (pieza 2 del
  bot DCAM, `scripts/dcam/`): sola publica lo ya catalogado que cambia de forma predecible
  y manda a PR investigado lo que pide criterio (altas, agotados, variantes, erratas, % fuera
  de grupo); esta skill sigue aplicando a esos PR y a lo que el bot no cubre (OTCA, altas por
  mano). El mapeo renglón del PDF ↔ ficha vive versionado en `scripts/dcam/mapeo-dcam.json`.
  Diseño completo: `scripts/dcam/DISENO.md`.
- 2026-09-14 (#180, existencias «clase B»; Saulo aceptó las seis recomendaciones):
  - **Jerarquía de fuentes para las specs de un alta: 1) fabricante, 2) Wikipedia, 3) SEDENA**
    (la descripción del PDF). Solo se baja de nivel cuando el de arriba no publica el dato.
    Si no lo da ninguna, `""` o año `null`. El país casi nunca lo publica el fabricante por
    modelo; para CZ sale de Wikipedia («origin = Czech Republic»).
  - **Variante (suma existencias; el precio sigue en la representativa):**
    - **TS9, 2.º renglón (→ 23):** misma descripción; cambian «llave Allen» por «accesorios» y el
      grabado D.C.A.M./S.D.N. Cuesta +27.5 %: parece otro lote, no otro modelo.
    - **92A1 con 1 + 2 cargadores de 17 (→ 130):** es presentación. Su precio encadena al centavo
      con la 92FS del 6-jul, pero la descripción cambió 15 → 17 cartuchos, así que dice 92A1 de
      verdad. Manda la descripción.
    - **Taurus 856 bitono inox/negro mate (→ 19):** mismo precio al centavo que el inox en los
      5 inventarios. Las 856 que ya estaban separadas por acabado se quedan como están.
  - **Modelo (ficha propia):** CZ P-09 F Nocturne (233): el PDF la nombra como modelo y CZ la
    vende como serie. Winchester Xpert Thumbhole (234): culata de madera y +27 %; las XPR ya
    separaban sintético y thumbhole, y Winchester la vende aparte. **El OTCA 18-jun de la 145
    sumaba las dos (22 = 15 + 7):** si una ficha tiene specs que nombran dos versiones
    («sintética/thumbhole»), sospecha que su registro OTCA mezcla renglones.
  - CZ 457: Lux 235, Premium 236, Varmint 237, Varmint Synthetic 238, LRP Black 239 (agotada el
    11-sep), MDT Chassis 240, Thumbhole 241, AT-ONE 242, Training Rifle XII 243.
    - **La LH suma aunque en un inventario solo venga la LH** (Premium 16-jun; Varmint 16 y
      18-jun). Ese registro es el de la LH, que cuesta lo mismo al centavo donde coinciden.
    - **La MDT usa los cargadores de fábrica de CZ** (support.mdttac.com, «What magazine do I
      need for a CZ 457»; WebFetch da 403, curl no). Entra en la lista del cargador 131.
    - Riel de 25 MOA solo en LRP Black y MDT; las demás llevan cola de milano de 11 mm.
  - **Winchester vende tres Xpert Thumbhole .22 LR** (Gray SR y Brown SR en EE. UU., otra en
    winchester.eu). El PDF no distingue: el peso va en rango, y la longitud y el riel van vacíos
    porque solo los publica una de las tres.
  - **Trucos de fuente:** desde México, `czfirearms.com/en-us/…` redirige 302 al sitio global
    (mismo JSON). Ese JSON trae las comillas escapadas (`\"productAttributes\"`), así que el grep
    literal falla. Si la página EN viene vacía (`product: null`, AT-ONE), prueba `/es/` o `/de/`.
    Los catálogos PDF de CZ (`katalogy.czub.cz/cz-katalog-20XX-en/…/publication.pdf`) fechan
    lanzamientos y renombres.
  - **Ningún renglón de oct-2025 ni del OTCA 26-sep encadena con estas altas.** Se comprobó
    dividiendo el precio del 16-jun entre ×0.89960 (general) y ×0.89447 (grupo Beretta), con
    ×1.00105 para OTCA: sus historiales empiezan en 2026.

## Cuando te invoca el conciliador headless

`infra/conciliar.sh` te llama con `openclaw agent`, sin humano delante. Contrato duro:

- Trabaja sobre `origin/main` fresco, en la rama `auto/inventario-<FECHA>`.
- `auditar.js` es puerta dura: si no da «✔✔ AUDITORÍA SIN HALLAZGOS», **no abras PR**.
- Abre los **dos** Draft-PR con `gh pr create --draft`, uno `--base main` y otro `--base develop`.
- Tu **última línea** de salida debe ser SOLO este JSON:
  `{"ok":true,"prs":["url1","url2"]}` o `{"ok":false,"motivo":"..."}`.

Si cambias cualquiera de esos cuatro puntos, `conciliar.sh` lo lee como fallo: avisa por Telegram
y manda la señal a `.fallida` aunque los PR estén abiertos.

## Atribución de existencias (mapear-existencias.py)

La atribución de stock por ficha NO es uniforme: 33 fichas suman variantes de varias
maneras (lotes, acabados, cañones, presentaciones) y 62 de 152 fichas necesitan mapeo
explícito. El método para resolverlo: **price chain + name similarity**.

### Cómo funciona

1. `referencia-armas.json` (y sus equivalentes para cartuchos y accesorios) contienen los
   renglones del último PDF verificado, cada uno etiquetado con su `fichaId`. Es la piedra Rosetta.
2. `mapear-existencias.py` empareja el PDF nuevo contra la referencia:
   - Detecta los factores de precio (1-2 factores dominantes entre PDFs consecutivos).
   - Para cada renglón del PDF nuevo, busca su equivalente en la referencia por
     `precio_nuevo / precio_ref ≈ factor`, desempatando por similitud de nombre.
   - Transfiere el `fichaId` y suma las cantidades.
3. Los renglones sin match son altas nuevas (`sinFicha`). Las fichas sin renglón son
   agotados (`sinPrecio`).

### Uso desde el conciliador headless

```bash
VENV=/home/saulo/apps/dcam-bot/.venv/bin/python
SCRIPTS=.claude/skills/conciliar-inventario/scripts

# Armas
$VENV $SCRIPTS/parse_pdf.py <armas.pdf> --json /tmp/armas.json
$VENV $SCRIPTS/mapear-existencias.py /tmp/armas.json --verbose
# → usa referencia-armas.json (default)

# Cartuchos
$VENV $SCRIPTS/parse_pdf.py <cartuchos.pdf> --json /tmp/carts.json
$VENV $SCRIPTS/mapear-existencias.py /tmp/carts.json --ref $SCRIPTS/referencia-cartuchos.json --verbose

# Accesorios
$VENV $SCRIPTS/parse_pdf.py <accesorios.pdf> --json /tmp/accs.json
$VENV $SCRIPTS/mapear-existencias.py /tmp/accs.json --ref $SCRIPTS/referencia-accesorios.json --verbose
```

El JSON de salida tiene `{existencias, factores, sinFicha, sinPrecio, totalPdf, totalMapped}`:
- `existencias`: mapa `fichaId → qty` listo para el mapa de existencias de su tipo.
- `sinFicha`: renglones del PDF que NO existen en la referencia → **dar de alta fichas nuevas**.
  Pueden ser modelos nuevos O fichas que REGRESAN de agotadas; verificar contra el catálogo
  completo antes de crear una ficha nueva.
- `sinPrecio`: fichas de la referencia sin renglón en el nuevo PDF → **marcar como agotadas**.

El mapa de `existencias` es la BASE pero NO es definitivo: las fichas en `sinFicha` pueden ser
regresos que necesitan sumarse a una ficha existente, y las de `sinPrecio` pueden ser variantes
que cambiaron de nombre. **Revisa ambas listas con criterio antes de aplicar.**

### Actualizar la referencia (OBLIGATORIO tras conciliación exitosa)

Después de commitear y antes de abrir los PR, regenera las 3 referencias:

```bash
$VENV $SCRIPTS/mapear-existencias.py /tmp/armas.json --update-ref
$VENV $SCRIPTS/mapear-existencias.py /tmp/carts.json --ref $SCRIPTS/referencia-cartuchos.json --update-ref
$VENV $SCRIPTS/mapear-existencias.py /tmp/accs.json --ref $SCRIPTS/referencia-accesorios.json --update-ref
```

Esto mantiene la cadena de factores fresca para la siguiente conciliación. **Incluye los
archivos actualizados en el mismo commit.**

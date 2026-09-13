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
Usa `scripts/parse_pdf.py` (PyMuPDF/`fitz`, ya instalado). Detecta el formato solo:
- **DCAM** (cabecera "DIRECCION DE COMERCIALIZACION"): tabla posicional. En cada
  renglón, el **precio** está en x≈510-530, la **existencia** en x≈446-486, y el
  **nombre corto** (y su descripción larga que envuelve debajo) en x≈31. El precio
  y la existencia comparten la MISMA fila `y` que el nombre corto. Cuidado: las
  descripciones largas se derraman a la página siguiente entre el header repetido.
- **OTCA anexo** (columnas "DESCRIPCIÓN / EXISTENCIA / PRECIO PUBLICO M.N."): layout
  apilado. Por ítem: descripción (multi-línea) → existencia (entero) → precio ($N).

Comando: `python3 .claude/skills/conciliar-inventario/scripts/parse_pdf.py <ruta.pdf>`
Salida: JSON con `[{idx, name, qty, priceN}]`. Separa armas de accesorios/cartuchos
por prefijo (`CARG|CART|CULATA|SISTEMA|CLIPS|CAÑON` = accesorio/munición).

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

## 4) Verificar (obligatorio antes de commitear)
Invoca el skill `verificar-app` o corre `scripts/auditar.js`:
- Todos los `.jsx` transpilan (Babel standalone en `node_modules/@babel/standalone`).
- Los `data-*.js` cargan juntos en Node sin error.
- `priceExact == último registro del historial` para TODAS las armas.
- Existencias solo de presentes; agotadas removidas; historiales cronológicos.
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
- 2026-07: un modelo agotado puede REGRESAR (Taurus TH380/PT59, SIG MCX, Weatherby
  Vanguard .243). Antes de dar de alta una ficha nueva, contrasta el renglón contra el
  catálogo COMPLETO, no solo contra las fichas con existencia.

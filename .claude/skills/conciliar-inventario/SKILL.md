---
name: conciliar-inventario
description: Concilia un inventario oficial (PDF) de DCAM o OTCA en el catálogo de "Armado en México". Úsalo SIEMPRE que el usuario suba un PDF de existencias/precios (DCAM-SEDENA o OTCA-Monterrey, "anexo", "inventario", "existencias") y pida incorporarlo, actualizar precios/existencias, o "conciliar". Cubre armas (data.js + data-precios.js), accesorios (data-accesorios.js) y municiones (data-municiones.js).
---

# Conciliar inventario DCAM / OTCA

Flujo recurrente y de alta precisión (se publican precios oficiales). Sigue estos
pasos EN ORDEN. No improvises el mapeo: un precio mal mapeado es un error visible.

## 0) Antes de empezar
- Lee `CLAUDE.md` (sección "Conciliar inventarios y precios") y la cabecera de
  `data-precios.js` — son la fuente de verdad del esquema.
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
Guiado por las reglas de `CLAUDE.md` y `data-precios.js`:
- **Registrar el inventario nuevo** en el `*_MANUALES` correspondiente con
  `primary: true` y quitar `primary` al anterior de esa autoridad. Copia el PDF a
  `inventarios/<dcam|otca>-...-AAAA-MM-DD.pdf`.
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
  Dedup renglones repetidos del mismo producto sumando existencias.

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

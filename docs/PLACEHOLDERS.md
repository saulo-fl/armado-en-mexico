# Inventario de placeholders de imagen — Armado en México

Revisión completa del código (rama `develop`). Lista de todos los huecos de imagen,
qué debe ir en cada uno, dónde aparece en la app, y la resolución / relación de
aspecto recomendada para diseñarlos.

Las resoluciones recomendadas ya van a **2× (retina)** sobre el tamaño real de
despliegue. Exporta en ese tamaño o mayor; la app recorta con `object-fit: cover`
o ajusta con `contain` según el caso.

---

## 🔴 PRIORIDAD ALTA — placeholders activos (hoy se ve un recuadro rayado "▢")

Estos NO tienen imagen real; la app dibuja un marcador rayado con texto. Son los
que más se notan.

> ## ⚠️ CONGELADAS (27-ago-2026) — NO produzcas estas 12 imágenes
>
> **Campos de tiro** y **Experiencias** (antes «Cursos») están desconectadas hasta
> el lanzamiento: sus datos son de relleno y la app sirve una pantalla
> «Próximamente». Las 12 fotos 16:9 de los sets 1 y 2 **no se usarían**.
>
> **Para reactivarlas**, todo el trabajo sigue en el repo:
> 1. `app.jsx` — volver a montar `CamposScreen` / `CursosScreen` en el switch
>    (hoy montan `ProximamenteScreen`).
> 2. `screens-1.jsx` — devolver `window.CAMPOS` / `window.CURSOS` a los
>    `CarouselSection` con su botón «Ver todos →», en vez de `ProximamenteCard`.
> 3. `ui.jsx` y `screens-2.jsx` — quitar `proximamente: true` de las entradas de
>    menú y el «(Próximamente)» del rótulo.
> 4. `screens-tutorial.jsx` — quitar el «· próximamente» de la fila Experiencias.
> 5. `build-prerender.mjs` — quitar `noindex` y volver a `enSitemap: true`, y
>    decidir entonces qué hacer con `/cursos` (hoy es un alias vivo de
>    `/experiencias`, que es la ruta canónica).
>
> Las pantallas, las tarjetas y los datos siguen escritos: no hay que rehacer nada.

### 1. Campos de tiro — 6 imágenes · **16:9** — CONGELADO
- **Dónde:** pantalla "Campos de tiro" (tarjeta grande) y carrusel de la Home
  (tarjeta chica). `screens-3.jsx` (`StripePlaceholder`, "▢ FOTO DEL CAMPO").
- **Qué va:** foto real de la instalación / línea de tiro / polígono (con contexto,
  no fondo blanco). Ambientada, preferible con tiradores o el entorno.
- **Aspecto:** `16 / 9` (horizontal).
- **Resolución recomendada:** **1600×900** (mín. 1280×720).
- **Lista (6):**
  1. Club de Tiro Valle de México — CDMX (Outdoor)
  2. Polígono Monterrey — Nuevo León (Indoor)
  3. Club Cinegético Guadalajara — Jalisco (Outdoor)
  4. Rancho Cinegético El Venado — Hermosillo, Sonora (Campo abierto)
  5. Tiro Deportivo Puebla — Puebla (Indoor)
  6. Campo Táctico Querétaro — Querétaro (Outdoor)

### 2. Experiencias (antes «Cursos») — 6 imágenes · **16:9** — CONGELADO
- **Dónde:** pantalla "Experiencias" (tarjeta grande) y carrusel de la Home.
  `screens-3.jsx` (`StripePlaceholder`, "▢ FOTO DEL CURSO").
- **Qué va:** foto representativa del curso (instrucción, clase, tirador en práctica,
  mesa de limpieza, aula, etc.).
- **Aspecto:** `16 / 9` (horizontal).
- **Resolución recomendada:** **1600×900** (mín. 1280×720).
- **Lista (6):**
  1. Manejo Seguro de Armas (Básico · Presencial)
  2. Tiro Defensivo (Intermedio · Presencial)
  3. Tiro de Precisión · Rifle (Avanzado · Presencial)
  4. Marco Legal y Portación (Básico · En línea)
  5. Defensa en el Hogar (Intermedio · Presencial)
  6. Mantenimiento y Limpieza (Básico · Presencial)

---

## 🟡 PRIORIDAD MEDIA — imágenes prestadas (hoy reutilizan fotos de armas)

Funcionan, pero usan una foto de arma del catálogo como "stand-in". Idealmente
fotos dedicadas con persona/contexto.

### 3. Categorías por tipo — 5 imágenes · **4:5 (vertical)**
- **Dónde:** Home, grid "Explora por categoría". `screens-1.jsx`
  (`CATEGORY_HEROS`, hero 4:5 con tinte oscuro y overlay de texto abajo).
- **Qué va:** foto contextual vertical con persona o escena (NO fondo blanco). El
  texto/etiqueta va encimado abajo, así que deja la parte inferior "tranquila".
- **Aspecto:** `4 / 5` (vertical).
- **Resolución recomendada:** **1000×1250** (mín. 640×800).
- **Lista (5):** Pistolas · Revólveres · Rifles · Escopetas · Carabinas.
- *Ya NO reutilizan fotos de ficha:* desde el 27-ago-2026 `CATEGORY_HEROS` apunta a
  `imagenes/hero-<tipo>.webp`, cinco archivos propios. Verificado el 31-ago. Importa
  porque mientras compartían archivo con una ficha, recortar esa arma dejaba la
  portada de su categoría con un arma flotando sobre el degradado. **Si vuelves a
  apuntar un hero a una foto de arma, esa trampa vuelve.**

---

## 🟢 PRIORIDAD BAJA / OPCIONAL — fondos configurables (vacíos por defecto)

### 4. Banner promocional (slider de la Home) — hasta 3 fondos · banner ancho
- **Dónde:** parte superior de la Home (`PromoSlider`, `screens-1.jsx`). El fondo
  (`bgImage`) es editable desde el panel **admin**; por defecto va color sólido.
- **Qué va:** fondo/escena táctica oscura. Encima lleva un gradiente + texto, así
  que el sujeto debe ir centrado y con bordes "tranquilos".
- **Tamaño en pantalla:** alto fijo **330px escritorio / 285px móvil**, ancho
  completo (hasta 1280px de contenedor, full-bleed en pantallas grandes).
- **Aspecto / resolución:** banner ancho con sujeto centrado (se recorta con
  `cover`). Recomendado **2000×800** (deja margen para el recorte móvil ~1.4:1 y el
  de escritorio ~3.9:1).
- **Cantidad:** 3 slides por defecto (o 1 reutilizable).

---

## 🔴 PRIORIDAD ALTA — fotos de arma (censo del 31-ago-2026)

Esta sección decía «ya cubierto, 111 fotos reales» y por eso el hueco pasó
desapercibido: el catálogo tiene **192 armas**, no 111. Números medidos, no
estimados (`fotos.py verificar` y el censo de `data.js`):

| Estado | Nº | Qué necesita |
|---|---|---|
| Con alfa, listas | 36 | nada |
| Recorte hecho pero rechazado por contenido | 15 | **conseguir otra foto** |
| Origen por debajo de 900 px | 59 | **conseguir otra foto** |
| Sin foto ninguna (placeholder SVG rayado) | **81** | **conseguir foto** |
| Pendiente de verificar el catálogo del fabricante | 1 | Armsan P612 (#91) |

Las 15 rechazadas por contenido lo fueron por motivos que ninguna métrica ve y
conviene tener presentes al buscar sustitutas: fotos de escena o con una persona
sosteniendo el arma, tintes de color (la Ruger LCP salía azul y la CZ P-10 C
dorada), el arma cortada por el borde del encuadre, un cargador suelto flotando
al lado, y dos «Retay Masai Mara» que en realidad son la culata y el guardamanos
sueltos, no el arma.

Las 81 sin foto son los **ids 112-192**, las altas del inventario de OTCA
Monterrey. Hoy la ficha les dibuja el marcador rayado `armaPlaceholder`. Por
marca: Beretta 11, Benelli 10, Weatherby 10, Taurus 9, Winchester 7, Glock 4,
Optimum Arms 4, IWI 3, Browning 3 — doce marcas cubren unas 65 de las 81, y
todas publican foto de producto en su catálogo.

**53 de esas 81 son arma larga** (33 escopetas, 20 rifles), que es el caso donde
el semáforo estaba mal calibrado hasta el 31-ago (ver bitácora de la skill
`fotos-producto`).

Estándar: **lateral sobre lienzo 1:1 con alfa**, cañón a la derecha salvo que el
fabricante solo publique del otro lado. Alto máx. en ficha: 240px escritorio /
150px móvil, sobre el hero oscuro `#2C2C2C → #1A1A1A` — por eso el fondo blanco
opaco se lee como un error y hace falta el alfa.

---

## ⚪ YA CUBIERTO — sin acción necesaria (referencia)

- **Cartuchos (19):** completos en `imagenes/cartuchos/` (PNG vertical, escala real).
- **Armas traumáticas (3):** usan fotos reales del CDN de Shopify (HDP 50, Secure 68P,
  HDX 68). No requieren diseño local.
- **Logos y autor:** `logo-main.png`, `logo-armado-mx.png`, `saulo-flores.png` ya
  presentes. (`logo.png` sigue siendo borrador reemplazable.)

---

## Resumen de lo que falta diseñar

| # | Set | Cantidad | Aspecto | Resolución sugerida |
|---|-----|----------|---------|---------------------|
| 0 | **Fotos de arma que faltan** | **155** | 1:1 con alfa | ≥900 px de lado |
| 1 | ~~Campos de tiro~~ **CONGELADO** | 6 | 16:9 | 1600×900 |
| 2 | ~~Experiencias~~ **CONGELADO** | 6 | 16:9 | 1600×900 |
| 3 | Categorías (tipo) | 5 | 4:5 | 1000×1250 |
| 4 | Banner promo (opcional) | 1–3 | banner ancho | 2000×800 |
| 5 | Accesorios | 36 | 1:1 con alfa | ≥900 px de lado |

**El grueso del trabajo es el set 0**, y no es de diseño sino de **adquisición**: 81
armas sin foto + 74 con foto inservible. El pipeline de recorte ya existe y está
calibrado (skill `fotos-producto`); lo que no existe es nada que consiga las fotos.
`fotos.py` solo procesa lo que ya está en disco — `mejor_origen()` mira en el repo y
en `Catalogo de Armas/imagenes/`, y nada más.

Los 12 de campos y experiencias quedan fuera mientras esas secciones estén congeladas.

### Convenciones de la app
- Tema oscuro (`#1A1A1A`); las fotos llevan un tinte/gradiente oscuro encimado.
- 16:9 y 4:5 se recortan con `cover` → centra el sujeto, deja aire en los bordes.
- Formato: JPG/WebP para fotos; PNG transparente solo para armas/cartuchos.
- Nombres de archivo sin espacios ni acentos, ruta relativa bajo `imagenes/`.

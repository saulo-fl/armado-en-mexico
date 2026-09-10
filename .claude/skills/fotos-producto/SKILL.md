---
name: fotos-producto
description: Prepara fotos de producto para "Armado en México" — quita el fondo con alfa, decontamina el borde, recorta y encuadra, y las integra en el catálogo. Úsalo cuando haya que sustituir la foto de un arma o accesorio, cuando entren fotos nuevas, cuando una ficha muestre un recorte sobre fondo blanco opaco, y para conseguir e integrar las FOTOS DE CAJA de las municiones (fichas de cartucho por marca) cuando entren cartuchos nuevos al inventario o alguno se quede sin caja. Incluye control de calidad automático y una hoja de contactos para la aprobación humana.
---

# Fotos de producto — Armado en México

## El problema que resuelve

Las fotos de arma son recortes sobre **blanco opaco**, y el hero de la ficha es
un degradado oscuro (`#2C2C2C → #1A1A1A`): el blanco se lee como un error. No
tiene salida por CSS — cualquier truco de mezcla que «quite» el blanco rompe las
que ya traen alfa. Es problema de assets.

Estado al 31-ago-2026: **36 de 192 armas con alfa**. Y el cuello de botella no es
el recorte: **81 armas no tienen foto ninguna** (ids 112-192, las altas de OTCA)
y otras 74 tienen una inservible. `fotos.py` solo procesa lo que ya está en
disco; conseguir las fotos no lo hace nadie todavía. Censo en `PLACEHOLDERS.md`.

## Uso

```bash
uv run .claude/skills/fotos-producto/scripts/fotos.py preparar --tipo pistola
# --solo manda sobre --tipo: una tanda puede cruzar tipos en UNA corrida, que es
# lo que hay que hacer, porque informe.json se reescribe entero en cada llamada.
uv run .claude/skills/fotos-producto/scripts/fotos.py preparar --solo 24,50,58,62,78
uv run .claude/skills/fotos-producto/scripts/fotos.py aplicar --aprobar 13,33,11
uv run .claude/skills/fotos-producto/scripts/fotos.py aplicar --decisiones decisiones.json
uv run .claude/skills/fotos-producto/scripts/fotos.py verificar --tipo pistola
```

`uv` monta un venv efímero con las dependencias declaradas en la cabecera PEP 723
del propio `.py`: no toca los Python del sistema. La primera vez descarga el
modelo (~928 MB a `%USERPROFILE%\.rembg`).

Carpeta de trabajo **fuera del repo**, en `Catalogo de Armas/fotos-trabajo/`:
`2-master/` (PNG a resolución completa, para recodificar sin volver a inferir),
`3-final/` (los WebP que entran al repo), `informe.json`, `hoja-de-contactos.html`.

## El estándar acordado

**Lateral sobre lienzo 1:1.** De perfil, arma centrada con margen uniforme.
Cañón a la derecha **cuando exista esa foto**.

La orientación **nunca se corrige con proceso**: espejar una foto invierte las
inscripciones y el lado de la ventana de expulsión, que en una ficha divulgativa
es un error de dato. Y una vista 3/4 no se obtiene rotando una lateral. Eso no
se negocia.

Lo que sí cambió (31-ago-2026, decisión de Saulo): apuntar a la izquierda
**avisa, no bloquea**. Hay fabricantes que solo publican de ese lado — las seis
Mendoza RM22 son foto oficial de 5906×1329 y las seis miran a la izquierda; no
existe una lateral derecha oficial que buscar. Si el fabricante tiene lateral
derecha se usa esa; si no, entra así. **Lo decide el humano en la hoja**, no el
script: el script solo lo marca en ámbar.

## Cinco cosas que NO se tocan

1. **El modelo va siempre explícito** (`birefnet-general`). El de por defecto de
   `rembg` es hoy `bria-rmbg`, que es **CC BY-NC**: no vale para este sitio.
2. **El orden es** máscara → decontaminar → recortar → escalar → comprimir.
   Comprimir antes de decontaminar deja el halo blanco fijado en el WebP.
3. **Nunca se escala hacia arriba.** Por debajo de 900 px se marca `RESUSTITUIR`.
   La Bersa Thunder (188 px) y la Glock 19 (384 px) no se arreglan con ningún
   escalador.
4. **La máscara no se binariza** (nada de `post_process_mask`): sobre el hero
   oscuro un alfa binario se ve aserrado.
5. **La GPU no se usa y no se pelea.** `onnxruntime-gpu` de PyPI no trae kernels
   `sm_120` y en la RTX 5070 (Blackwell) el proveedor CUDA **cae a CPU en
   silencio**; el `torch 2.5.1+cu121` tampoco sirve. ~25 s por foto en CPU.

## Al integrar: dos pasos que no son opcionales

- **`?v=` en la ruta.** `_headers` da `max-age=31536000` a `imagenes/*`: el mismo
  nombre de archivo no lo vuelve a pedir nadie que ya haya entrado. Lo hace
  `aplicar` solo.
- **Resembrar D1** (skill `sincronizar-d1`). El catálogo de D1 pisa a `data.js`.
  Desde el 27-ago `fixArmaImg` repara las rutas locales contra el seed, así que
  la foto llega igual — pero D1 queda desincronizado y conviene arreglarlo.

## Control de calidad

Once métricas sobre la máscara y el RGB. **Rojo** no se propone aprobar; solo
ámbar se propone marcado; todo verde se preselecciona.

Rojo: `huecos_internos = 0` (un arma sin hueco de guardamonte es una máscara
rellenada) · `mordida < 0.93` · `halo < -25` (borde ennegrecido) o `> 120` ·
`llenado < 20%` · `alpha_pct > 92` · `borde_recortado > 0.5%` ·
`fondo_sigma > 25` · `resolucion < 900`.

Ámbar: `canon = izquierda` · `fondo_sigma > 12` (fondo con textura) ·
`huecos_rel < 1%` · `dureza_borde` fuera de [0.8, 6] · `halo > 18` ·
`peso > 140 KB` · `luminancia_sujeto < 45`.

**Dos umbrales se miden contra el arma, no contra el lienzo** (recalibrado el
31-ago; ver bitácora). `llenado` es el % del *bbox del arma* que es arma, y
`huecos_rel` el % *del arma* que es hueco. Medido sobre el lienzo, ambos miden el
aspecto del arma en vez de la calidad del recorte, y toda arma larga salía roja.

**El halo alto avisa, no bloquea.** Un objeto oscuro sobre fondo claro tiene un
borde antialias intrínsecamente más claro que el objeto: es muestreo, no un
defecto. Recortes impecables marcan +68.

**Ya no existe la rama `mordida > 1.10`.** Desde el 31-ago numerador y
denominador salen del mismo conjunto, así que la razón está acotada a 1 por
construcción. «La máscara dejó fondo» lo cubren `alpha_pct > 92` y `llenado`.

Lo que las métricas **no** ven, y por eso la revisión humana no es opcional —
todos estos casos son reales, del lote del 31-ago: que la foto sea de otro modelo
o de otra variante · **tintes de color** (la Ruger LCP salía azul entera y la CZ
P-10 C dorada, con métricas impecables) · que el sujeto **no sea el arma** (dos
«Retay Masai Mara» eran la culata y el guardamanos sueltos) · un cargador suelto
flotando al lado del arma · un recorte técnicamente perfecto sobre una escena.

## Antes de tocar una foto de arma: ¿es hero de categoría?

`screens-1.jsx` (`CATEGORY_HEROS`) usa fotos **con persona y contexto** para las
portadas. Hasta el 27-ago eran las mismas que la ficha de cinco armas; ya están
separadas en `imagenes/hero-<tipo>.webp`. Si vuelve a apuntarse una foto de arma
como hero, recortarla dejaría la portada con un arma flotando.

## Cajas de munición — `cajas.py`

**El PNG del cartucho es del CALIBRE, no del producto.** `imagenes/cartuchos/*.webp`
manda en la home de calibres y en la guía educativa, donde lo que se enseña es el
calibre. Pero la tarjeta y la ficha de una munición son de una **marca**: ahí lo
que identifica al producto es su **caja**, que es como se compra y como se
reconoce en el mostrador. Sin caja, la ficha cae al PNG del calibre (`munFoto()`
en `screens-municiones.jsx`), que sigue siendo correcto — nunca al de otra marca.

### La clave: `marca__calibre`

`aguila__380acp`, `pmc__9mmparabellum`, `rio__12ga`. **Una caja sirve a todas las
municiones de esa marca y ese calibre**, que es como se venden: el inventario OTCA
tiene cinco Rio 12 GA de líneas distintas y una sola caja las cubre. Ventaja que
importa para el mantenimiento: **un cartucho nuevo de una marca+calibre que ya
tiene caja la hereda solo** — basta correr `aplicar`, no hay que buscar nada.

Cuando una munición concreta necesite SU foto, el archivo se llama con su id
(`2054.webp`) y pisa a la de marca+calibre. El slug (`_slug()` en
`data-municiones.js` y `slug()` en `cajas.py`) tiene que dar lo mismo en los dos
lados; si tocas uno, toca el otro.

**Regla que no se negocia: la caja tiene que ser del calibre de la ficha.** Una
caja lleva el calibre impreso; poner la de 12 GA en una munición de 20 GA es un
error de dato, no una aproximación. La línea comercial sí puede no coincidir
(Rio Game Load por Rio Star Evo): la caja es de la marca y del calibre correctos.

### El ciclo

```bash
uv run .claude/skills/fotos-producto/scripts/cajas.py pendientes     # qué falta y con qué buscarlo
uv run .claude/skills/fotos-producto/scripts/cajas.py listar <url>   # candidatas de una página, medidas
uv run .claude/skills/fotos-producto/scripts/cajas.py bajar aguila__380acp <url-imagen>
uv run .claude/skills/fotos-producto/scripts/cajas.py procesar [--solo clave,clave]
uv run .claude/skills/fotos-producto/scripts/cajas.py aplicar        # reescribe MUNICION_CAJAS
uv run .claude/skills/fotos-producto/scripts/cajas.py verificar
```

Buscar la foto **lo hace el agente, no el script**: `pendientes` imprime la marca,
el calibre y la línea comercial del inventario DCAM (`GB CLUB`, `STAR EVO`,
`TRAP AMERICAN`) — sin esa línea, «GB 12 GA» no encuentra ninguna caja. Con eso se
busca la web del fabricante, y `listar` ordena las imágenes de la página por
tamaño: la caja casi siempre es la mayor.

`aplicar` reescribe el bloque `MUNICION_CAJAS` de `data-municiones.js` a partir de
lo que HAY en `imagenes/municiones/` — es idempotente y no hay que tocarlo a mano.
Pone el `?v=` con la fecha del archivo (`imagenes/*` va con `max-age` de un año).
No hace falta resembrar D1: `resembrar.js` solo siembra `armas` y `pages`; las
municiones viven en el `.js`.

### Dónde se busca (lo que ya funcionó)

| Fuente | Cómo |
|---|---|
| `aguilaammo.com` | `sitemap-products.xml` → la página del producto → `og:image` (PNG 2000² con alfa) |
| `pmcammo.com` | `wp-sitemap-posts-product-1.xml` → `og:image` (tope 500², es lo que publican) |
| `hornady.com` | `static.hornady.media/presscenter/thumbs/{photos,illustrations}/…` |
| Demandware (Remington, Federal, Speer, Fiocchi) | quita `?sw=800` o usa la ruta `on/demandware.static/…` sin el proxy `dw/image/v2` → sale el original |
| WordPress (Saga, GB, CorBon, Rio) | `listar` y el archivo sin sufijo `-300x200` |
| Escopeta europea (Trust, J&G, EG del Sur, Bornaghi) | el fabricante no publica catálogo web; tiendas que sí lo hacen: `cosasdecaza.es` (categorías por marca), `armeriasabater.com`, `armeriarossetti.it` (`area/prod/img000<id>A.jpg`) |

**`--compressed` en curl no es opcional.** hornady.com sirve gzip aunque no se
pida, y sin eso el HTML llega binario y la página parece «sin imágenes». Ya está
puesto en `cajas.py` y en `traer.py`.

**Dos trampas que el QC no ve y hay que mirar:**

- En Hornady, `…/illustrations/…` **no siempre es la caja**: en las líneas de rifle
  es el CARTUCHO suelto tumbado (salió así en .22-250 y en 6mm Rem, y es justo lo
  que estamos quitando de la ficha). La caja está en `…/photos/…`. Mira la foto
  antes de aplicar.
- Las fotos de tienda suelen traer el **reflejo** de la caja debajo; rembg lo da por
  objeto y en la tarjeta queda un bloque blanco flotando. Se corta en el ORIGEN
  (recorta el alto del jpg de `cajas-fuente/` y vuelve a `procesar`), no a mano
  sobre el WebP.

### Diferencias con el pipeline de arma

- **Se infiere siempre**, aunque la foto traiga alfa. Los renders de fabricante
  (Águila) meten una nube de polvo y una sombra DENTRO del alfa; `_alfa_de_fabrica()`
  la daría por buena y la tarjeta saldría con la nube. rembg la quita limpia.
- **Recorte ajustado, no lienzo 1:1** (`cuadrado=False`). La caja es apaisada y el
  hueco de la tarjeta también: en 1:1 la caja se queda en un tercio del ancho.
- **El semáforo de `fotos.py` no aplica**: mide huecos internos (el guardamonte), y
  una caja no tiene ninguno — saldría roja siempre. Aquí el QC son tres avisos:
  **esquinas opacas > 75 %** (quedó fondo), menos del 8 % de la imagen opaca (se
  comió la caja) y resolución por debajo de 600 px. El aviso de fondo se mide en
  las **cuatro esquinas**, no en el total: con recorte ajustado, «% de píxeles
  opacos» mide la forma de la caja y no el recorte — la Remington UMC, casi de
  frente y perfectamente recortada, marcaba 92 % de opacidad y 58 % de esquinas.
  Lo que las métricas no ven —caja de otra marca, de otro calibre, con el logo de
  la tienda encima— lo ve el humano en `hoja-cajas.html`.
- **Ancho 900 px** (la ficha da ~470 CSS px al ancho de la caja, ×2 de DPR).

### Estado al 8-sep-2026

Primer barrido: **37 cajas para 60 de las 71 municiones**. Sin caja quedan 11, que
caen al PNG del calibre; **no hay nada que arreglar a mano** — el día que aparezca
la foto, basta `bajar` + `procesar` + `aplicar`:

- `bornaghi__12ga` (2), `bornaghi__20ga`, `bornaghi__28ga` — **descartadas a
  propósito**: bornaghi.it solo publica un PDF de catálogo, y las únicas fotos de
  caja que hay en tienda (armeriarossetti.it) llevan **el logo de la tienda
  encima**. Una marca ajena en la ficha no entra.
- `bullet__12ga` (2), `partizan__300winmag`, `sb__9x18makarov`, `egdelsur__20ga` —
  el fabricante no publica foto de caja de ese calibre y no la encontré en tienda.
  («Bullet» ni siquiera aparece como marca en el comercio español: puede ser un
  nombre del inventario DCAM, no la marca real de la caja.)
- `__243win` y `__270win` (ids 2021 y 2022): el inventario los trae **sin marca**
  (`marca: '—'`). No hay caja posible mientras no se les asigne marca; si algún día
  se identifican, heredan la de su marca sin tocar una sola foto.

Cajas correctas pero **blandas**, a resustituir si el fabricante publica algo
mejor: `saga__*` y `sagasporting__12ga` (la caja sale a ~200 px porque 431×287 es
el tope de saga.es), `egdelsur__12ga` (168×276), los cuatro `pmc__*` (~400 px; 500²
es todo lo que publica pmcammo.com). Se quedan porque **son la línea comercial
correcta**, y en la ficha la foto la limita el alto del panel, no el ancho: el
reescalado real es de ~1.6×, no de 2.6×. No se escalan hacia arriba nunca (regla 3).

## Bitácora

- **2026-08-27** — piloto de pistolas. Cuatro pasadas de calibración:
  (1) Pillow aplana RGBA contra **negro** en `.convert("RGB")`, así que en las
  fotos que ya traían alfa la decontaminación **aclaraba** el borde — se aplana
  sobre blanco; (2) la división por alfa baja sacaba bordes negros — la
  corrección se desvanece por debajo de α=0.35; (3) el halo se medía contra el
  arma entera en vez de contra los píxeles vecinos; (4) y sin ponderar por alfa,
  el blanco residual de la cola casi transparente contaba como si fuera opaco.
- **2026-08-27** — el hero de la ficha es muy apaisado (1200×380): una foto 1:1
  la limita siempre el alto. Con `maxHeight: 75%` el arma quedaba en 272 px
  teniendo 1200 disponibles. Subido a 96 % en `screens-2.jsx`.
- **2026-09-08** — cajas de munición (`cajas.py`). Tres cosas que costaron y no se
  ven en el código: (1) hornady.com manda gzip sin pedirlo y el HTML llegaba
  binario — `--compressed`; (2) `node -e` escupe UTF-8 y `subprocess(text=True)` lo
  decodifica en cp1252 en Windows: «Águila» reventaba `catalogo()`; (3) el alfa que
  traen los PNG de Águila incluye la nube de polvo del render, así que aquí se
  infiere siempre en vez de confiar en el alfa de fábrica.
- **Pendiente**: censo de las 61 pistolas con el estándar lateral derecha, y
  adquisición para las que no cumplan. BiRefNet infiere a 1024², así que los
  panorámicos de rifle (1920×500) habrá que recortarlos antes de inferir.

---
name: fotos-producto
description: Prepara fotos de producto para "Armado en México" — quita el fondo con alfa, decontamina el borde, recorta y encuadra a 1:1, y las integra en el catálogo. Úsalo cuando haya que sustituir la foto de un arma, accesorio o munición, cuando entren fotos nuevas, o cuando una ficha muestre un recorte sobre fondo blanco opaco. Incluye control de calidad automático y una hoja de contactos para la aprobación humana.
---

# Fotos de producto — Armado en México

## El problema que resuelve

Las fotos de arma son recortes sobre **blanco opaco**, y el hero de la ficha es
un degradado oscuro (`#2C2C2C → #1A1A1A`): el blanco se lee como un error. No
tiene salida por CSS — cualquier truco de mezcla que «quite» el blanco rompe las
que ya traen alfa. Es problema de assets.

Estado al 27-ago-2026: **24 de 111 fotos con alfa**. El resto, pendiente.

## Uso

```bash
uv run .claude/skills/fotos-producto/scripts/fotos.py preparar --tipo pistola
uv run .claude/skills/fotos-producto/scripts/fotos.py preparar --tipo pistola --solo 13,33,11
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

**Lateral derecha sobre lienzo 1:1.** Cañón a la derecha, de perfil, arma
centrada con margen uniforme. Es la foto que los fabricantes publican de serie,
así que es conseguible para casi todo el catálogo.

La orientación **no se corrige con proceso**: espejar una foto invierte las
inscripciones y el lado de la ventana de expulsión, que en una ficha divulgativa
es un error de dato. Y una vista 3/4 no se obtiene rotando una lateral. Si la
foto no cumple, se busca otra — el script las detecta y las bloquea.

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

Rojo: `huecos_internos = 0` (una pistola sin hueco de guardamonte es una máscara
rellenada) · `mordida` fuera de [0.93, 1.10] · `canon = izquierda` · `halo < -25`
(borde ennegrecido) o `> 120` · `alpha_pct` fuera de [12, 92] ·
`borde_recortado > 0.5%` · `resolucion < 900`.

Ámbar: `fondo_sigma > 12` (**es una foto de escena, no de producto**) ·
`dureza_borde` fuera de [0.8, 6] · `halo > 18` · `peso > 140 KB`.

**El halo alto avisa, no bloquea.** Un objeto oscuro sobre fondo claro tiene un
borde antialias intrínsecamente más claro que el objeto: es muestreo, no un
defecto. Recortes impecables marcan +68.

Lo que las métricas **no** ven, y por eso la revisión humana no es opcional: que
la foto sea del modelo o la variante equivocada, y que un recorte técnicamente
perfecto lo sea sobre una foto de escena.

## Antes de tocar una foto de arma: ¿es hero de categoría?

`screens-1.jsx` (`CATEGORY_HEROS`) usa fotos **con persona y contexto** para las
portadas. Hasta el 27-ago eran las mismas que la ficha de cinco armas; ya están
separadas en `imagenes/hero-<tipo>.webp`. Si vuelve a apuntarse una foto de arma
como hero, recortarla dejaría la portada con un arma flotando.

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
- **Pendiente**: censo de las 61 pistolas con el estándar lateral derecha, y
  adquisición para las que no cumplan. BiRefNet infiere a 1024², así que los
  panorámicos de rifle (1920×500) habrá que recortarlos antes de inferir.

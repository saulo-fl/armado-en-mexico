# DESIGN.md — Armado en México

> **Qué es esto.** El brief de dirección de arte del sitio. Cualquier agente que vaya a tocar UI
> lee este archivo **antes** de escribir una línea.
>
> **Estado:** borrador. Las secciones marcadas **`◻︎ SAULO`** están vacías a propósito — las llena
> él. Hasta que no estén llenas, este brief no está terminado y la dirección sigue siendo genérica.

---

## 1. El stack real (verificado 31-ago-2026, rutas al día a 12-sep-2026)

- **Sí hay build step.** `npm run build` son tres pasos que acaban en `out/`: `build:static` (copia `public/`), `build:js` (Babel, `.jsx` → `.js`) y `build:html` (`scripts/build-prerender.mjs`). Corre en Cloudflare Pages en cada deploy.
- **No se transpila en el navegador.** `index.html` carga React/ReactDOM UMD y `.js` ya compilados.
- **Sí hay CSS.** Vive en `src/styles/estilo.css` (se sirve como `/estilo.css`) y ya usa `::before`, `::after`, `:hover`, `:focus-visible`, `@media`, `@keyframes` y `:has()`.
- **Los `.js` no se versionan.** Se editan los `.jsx`; el build genera los `.js`.

**Consecuencia:** no hay ninguna limitación técnica para hacer buen CSS. Lo que falta es que los
componentes tengan `className` para que el CSS pueda agarrarlos.

---

## 2. Diagnóstico medido (por qué el sitio se ve «cuadrado»)

| Medición | Valor | Lectura |
|---|---|---|
| Borde `#3A3A3A` sobre tarjeta `#2C2C2C` | **1.23:1** | Invisible |
| Tarjeta `#2C2C2C` sobre fondo `#1A1A1A` | **1.25:1** | Invisible |
| Objetos `style={{` en los `.jsx` | **1238** | Reescribirlos no es viable |
| Valores distintos de padding/gap/fontSize | **36** | Una escala usa 6-8 |
| Escalas de espaciado, tipografía o elevación | **0** | No existe sistema |

Las dos señales que definen una tarjeta —su borde y su superficie— están por debajo del umbral
perceptible. El ojo solo puede ver la geometría, y la geometría son rectángulos. **Primero
superficies, después efectos.** Al revés se obtiene un sitio ruidoso *y* plano.

---

## 3. Dirección de arte

### El ancla

**Documento oficial mexicano de armas + instrumentación HUD.**

No es cyberpunk, no es videojuego, no es sci-fi. Es el cruce entre el papeleo real de la DCAM
—que es el mundo verdadero de este catálogo— y la precisión de un instrumento de medición.

Vernáculo del que salen las decisiones:

- **Del documento oficial:** folio, matrícula, sello, clase legal (I/II/III), anexo de inventario,
  tabla de calibres impresa, membrete, márgenes de oficio, tinta de matriz de puntos, el uso de
  mayúsculas y guiones del Diario Oficial de la Federación.
- **Del instrumento:** números tabulares que alinean en columna, pares etiqueta/valor, color
  semántico de estado, ticks de regla, marcas de esquina en dosis mínima.

### Por qué no «táctico HUD» a secas

Es el terreno más saturado que existe, y es literalmente el punto donde converge cualquier modelo
de IA: la skill oficial `frontend-design` lista *near-black con acento saturado* y *hairlines de
1px con radius cero* como dos de los tres clichés a evitar. El sitio hoy calza con ambos.

Referencia de sobriedad: **Anduril**, la marca táctica más creíble del mercado, no usa stencil ni
scanlines. Usa Helvetica, blanco y negro, y deja que el único color lo aporte el producto.

---

## 4. ◻︎ SAULO — Lo que te gusta

El brief original de Saulo (los 36 apartados del concepto, §4.1 sitios que le gustan, §4.3 el
elemento firma y §4.4 qué no se toca) vive **fuera del repo**, íntegro, en
`Documentos de Proyecto/archivo-repo-2026-10-18/docs/DESIGN-4-brief-original-saulo.md`.
Las citas «§4.x» del código remiten a ese archivo. Lo que manda aquí es lo que se destiló de él:
el sistema de la §5, las prohibiciones de la §6 (lo inviolable de §4.4 está en la §6b) y los no
negociables de la §7.

---

## 5. Sistema visual

### 5.1 La paleta, auditada

Los valores de la §2, medidos con
`node .claude/skills/fidelidad-diseno/scripts/contraste.mjs`. **Cuatro pares no sirven para
lo que parecen servir** — vale la pena saberlo antes de escribir el primer componente:

| Par | Ratio | Veredicto |
|---|---|---|
| Crema `#F3EFE4` sobre verde `#173A32` | **10.83:1** | El patrón dominante del mockup. Sólido |
| Blanco `#FAF9F5` sobre verde | 11.81:1 | Sólido |
| Beige `#DDD5C4` sobre verde | 8.53:1 | Sólido |
| Negro `#171B19` sobre crema | 15.14:1 | Sólido |
| Gris `#59605C` sobre crema | 5.62:1 | Pasa AA |
| **Verde 2 `#245247` sobre verde `#173A32`** | **1.41:1** | ⚠ **Invisible** |
| **Rojo `#C83B32` sobre verde** | **2.45:1** | ⚠ Débil |
| **Rojo `#C83B32` sobre crema** | **4.43:1** | ⚠ Falla AA por poco |
| Beige sobre crema (zebra) | 1.27:1 | Solo con hairline |

**Las tres correcciones, con el mínimo cambio que alcanza el umbral:**

```css
--verde-2:  #2C6457;  /* era #245247 → 1.41:1. Ahora 1.82:1: la tarjeta oscura se ve */
--rojo-txt: #C63A32;  /* era #C83B32 → 4.43:1. Ahora 4.51:1 sobre crema. A ojo es el mismo */
/* El rojo #C83B32 se queda para RELLENO con texto claro encima (botones del mockup).
   Como texto o borde fino sobre verde da 2.45:1: para eso no se usa. */
```

`verde-2` importa más de lo que parece: es exactamente el error que arrastraba la paleta
anterior, donde la tarjeta daba 1.25:1 contra su fondo y por eso el sitio se leía «cuadrado».
Si una tarjeta oscura va sobre verde, necesita esa separación o vuelve el mismo problema.

**El mockup ya lo resuelve solo en la mayoría de pantallas:** las tarjetas son crema sobre
verde (10.83:1). Ese es el patrón fuerte. La superficie oscura sobre oscura es la excepción,
y es donde hay que usar `--verde-2` corregido.

### 5.1b Superficies

> Actualizada el 7-sep-2026. La versión anterior describía un stack **oscuro** —verde de fondo
> y el crema como tarjeta— que dejó de ser cierto cuando la app se invirtió a clara. Estos son
> los valores que sirve el sitio hoy. Si vuelven a cambiar, se cambian aquí.

**La app es CLARA. El verde es color de MARCA, no fondo de pantalla:** vive en la banda superior,
el sello, los acentos y la navegación, no bajo el contenido.

```css
/* Las dos superficies claras. Viven en estilo.css (.amx-v2) y en el objeto
   CLARO de ui.jsx — son gemelas: si cambia una, cambia la otra. */
--lienzo:  #E7EAE4;  /* el lienzo de la app: «papel de oficio frío» */
--papel:   #F7F8F4;  /* la tarjeta por defecto — 1.14:1 sobre el lienzo */
--beige:   #E4E7E0;  /* fila alterna sobre el papel — 1.17:1, SOLO con hairline */
--hair:    #B6BDB0;  /* hairline — 1.59:1 sobre el lienzo */
           #868E84;  /* borderHi: borde que PORTA estado — 3.17:1 (WCAG 1.4.11) */

/* El verde, como marca */
--verde:   #173A32;  /* banda, sello, acentos. Tinta clara encima: 10.24:1 */
--verde-2: #2C6457;  /* superficie oscura elevada, cuando la haya */

/* El crema y el blanco NO son superficies: son TINTA CLARA sobre el verde */
--crema:   #F3EFE4;  /* texto sobre verde — 10.83:1 */
--blanco:  #FAF9F5;  /* texto sobre el rojo de relleno */
```

**Por qué el lienzo no es crema.** El `#F3EFE4` anterior es el *warm off-white* al que llega por
reflejo cualquier interfaz generada; el detector lo marca como `cream-palette` una vez por página
—323 veces— y §6 ya vetaba el cream con serif display. El `#E7EAE4` conserva la sensación de papel
pero en el mismo matiz verde-gris de la marca, y no dispara la regla. Comprobado a mano: la regla
persigue el tono cálido, no la claridad.

**La regla que gobierna esta sección:** separar por **superficie y sombra**, nunca por un borde de
1px (§6, y §27 de tu spec: «sombras extremadamente suaves»).

Y el motivo por el que no es negociable: **entre dos superficies claras el contraste máximo
alcanzable es ~1.2:1.** Papel sobre lienzo da 1.14:1. El color no puede separarlas —da igual qué
dos claros elijas—, así que quien las separa es la sombra. Elegir otro claro y no tocar la sombra
reproduce el defecto medido en §2, que es de donde salió todo este brief.

```css
/* Tres capas escalonadas: contacto + media + ambiente. Ese escalonado es lo que
   el ojo lee como «una capa encima de otra» cuando el color solo da 1.14:1. */
--sombra: 0 1px 2px rgba(23,27,25,.14),
          0 4px 8px -2px rgba(23,27,25,.16),
          0 12px 18px -8px rgba(23,27,25,.28);
```

Dos condiciones, las dos aprendidas a golpes:

- **En la tinta del sitio `rgba(23,27,25,…)`, nunca teñida con el verde.** Una sombra de color es
  un halo cromático: otro tic de interfaz generada. El detector lo marca como `dark-glow`.
- **Máximo 18px de blur** (24px en hover, y solo ahí). El coste de una sombra escala con el
  cuadrado del radio, y el sitio son cientos de páginas con muchas tarjetas cada una.

### 5.2 Escala de espaciado — 6 valores, no 36

`4 · 8 · 12 · 20 · 32 · 52`

Cualquier número fuera de la escala necesita justificación explícita en el commit.

### 5.3 Tipografía

**Sustituir, no sumar** — hoy se cargan 4 familias y 13 archivos.

Dos familias, no cuatro. El ancla es **industrial y de señalética**, no militar.

| Rol | Fuente | Sustituye a |
|---|---|---|
| Titulares, cuerpo, etiquetas | **Archivo** (variable, `wdth 75..100`) | Montserrat + Open Sans |
| Datos, specs, tablas, códigos | **JetBrains Mono** | Courier Prime |

`Archivo` es una grotesca industrial con eje de ancho: el mismo archivo da el condensado en
mayúsculas de los titulares del mockup y el cuerpo a ancho normal. Eso cubre el «tipografía
industrial + geometría limpia» de tu §1 sin sumar peticiones.

`Courier Prime` es una fuente de guion de cine —blanda, con serifas, de mancha irregular—, no
una mono técnica. **Playfair Display se elimina**: una serif editorial de moda no pertenece a
este ancla y cuesta una petición entera.

Descartadas a propósito: **stencil militar** (el ancla es burocracia y señalética, no cuartel)
y **Space Grotesk** (es el punto de convergencia documentado de la IA, §6).

`font-variant-numeric: tabular-nums` en todo dato numérico. Es lo que hace que un calibre se lea
como instrumentación y no como texto.

### 5.4 Jerarquía sin bordes

- **Estado legal en el hairline completo de la tarjeta**, no en una barra lateral. El color de
  disponibilidad —uso civil / seguridad / exclusivo Ejército— es el `border: 1px solid` de todo
  el contorno. Semántica real, una propiedad.

  > Esto decía `border-left: 3px` y **se corrigió el 7-sep-2026**, porque se contradecía con §6.
  > La franja de color en el canto izquierdo de una tarjeta es el tic más reconocible de interfaz
  > generada por IA — el detector la marca con su propio nombre, `side-tab`, y era el hallazgo más
  > repetido del sitio: 20 sobre fuente y 41 en todo el repo. El brief se pedía a sí mismo aquello
  > que en §6 declara señal de trabajo genérico.
  >
  > El color no se perdió, se movió: pintando el contorno entero se conserva la misma información
  > y el mismo color semántico, sin la pestaña. Medido sobre la tarjeta `#F7F8F4`:
  > **6.02 / 5.49 / 6.42:1**. Y como la separación real la hace la sombra de §5.1b, el borde deja
  > de ser el recurso principal, que es justo lo que pedía §6.
  >
  > **No reintroduzcas la barra lateral.** Si algo necesita distinguirse, es superficie y sombra.
- Fichas destacadas con `grid-column: span 2` — rompe la cuadrícula sin código nuevo.
- Par etiqueta/valor: etiqueta a 10-11px en mayúsculas con `letter-spacing: .08em`; valor en mono.
- **Asimetría sistemática, no aleatoria:** siempre la misma esquina cortada, siempre los mismos
  dos corchetes. Rompe el rectángulo conservando el escaneo predecible.

### 5.5 La papelería del expediente — la ficha de arma (13-sep-2026)

Cómo se resolvió §4.3, decidido con Saulo sección por sección. El detalle de cada pieza, con sus
medidas, vive en `estilo.css`, bloque «LA FICHA DE ARMA»; las primitivas, al final de `ui.jsx`.

- **Cada dato es un papel de oficina distinto dentro del folder manila.** La copia instantánea con
  clip y el sello legal estampado encima; el talón de comprobante rosa (precio y Comparar); la
  ficha de fichero (ficha técnica); la tarjeta de almacén (existencias por sucursal); el papel
  milimétrico con su registro y los anexos grapados (historial y PDFs); los separadores con la
  hoja de oficio (Legalidad · Usos · Antecedentes). Fuera del folder: la vitrina con dos repisas
  (munición y accesorios), la tele de los 80 (video), la tarjeta de comentarios y los expedientes
  de armas similares. Los títulos de sección fuera del folder van en **cinta Dymo** negra. Las letras van
  alineadas: Saulo retiró los saltos por letra de todas las cintas el 16-sep-2026.
- **Intensidad: papelería física, sin texturas.** Se permiten clips, grapas, cinta canela,
  perforaciones, papel autocopiante, cinta rotuladora y líneas de corte, dibujados en CSS o como
  recortes ligeros. Sigue prohibido lo de §27 («texturas de papel fuertes») y lo de §3: ningún
  filtro de envejecido, ninguna fuente nueva. Una cuadrícula de milimétrico o el rayado de una
  ficha no son texturas: son el papel mismo.
- **El folder es la foto de la Home como 9-slice** (`border-image`, igual que el tutorial): crece
  con la ficha sin torcer la pestaña. Saulo rechazó dos veces el folder dibujado en CSS.
- **Excepción a la regla diegética: manila en penumbra.** Los papeles no siguen al tema (§5.1b),
  pero el folder ocupa casi toda la pantalla y en oscuro deslumbraba. En oscuro baja el BRILLO de
  la foto al 68 % (`--manila-luz`), no su color; los papeles de dentro siguen claros. Lo escrito
  directamente sobre el manila usa la tinta plena en oscuro: la secundaria no llega a 4.5:1.
- **Dos colores legales, no tres** (decisión del 8-sep-2026, se mantiene): verde para CIVIL, rojo
  para SEGURIDAD y EXCLUSIVO; las distingue la palabra. La tinta azul de sello es para lo que no
  es legal (usos, foto pendiente).
- **Un solo corte, 1024px.** Por encima, las dos solapas se leen POR FILAS: foto | ficha técnica y
  comprobante | tarjeta de almacén a la vista al abrir, y al bajar, Legalidad · Usos · Antecedentes |
  historial. **Nada se queda fijo al hacer scroll** en el folder: hubo una columna izquierda fija y
  Saulo la retiró porque rompía la estética diegética (un papel no persigue a quien lee). Por
  debajo de 1024px: pila en ese mismo orden y talón fijo abajo —ese sí, es la barra del pulgar—, que
  aparece cuando el talón de la ficha sale de pantalla y se retira al asomar el pie.
- **Último precio conocido** (13-sep-2026). Si el inventario de donde sale el precio es anterior al
  último de la misma sucursal, el arma ya no aparece en este y la tarjeta de almacén dice AGOTADO.
  Los dos datos son ciertos, pero juntos parecían contradecirse. El talón lleva entonces el sello
  rojo «ÚLTIMO PRECIO CONOCIDO» junto a la cifra, y en la barra fija del móvil el rótulo pasa a
  «Último precio OTCA» o «DCAM». Es la misma regla que el AGOTADO del kárdex, así que nunca sale
  uno sin el otro.
- **La situación legal se dice una vez:** el sello sobre la copia y la hoja de Legalidad. Sin línea
  de texto ni enlace «§ Ver situación legal» bajo la foto.
- **Las pestañas no mueven el fondo:** las tres hojas de oficio comparten celda y la pila mide lo
  que la más larga. La tableta no es objetivo; el móvil sí, medido en los anchos reales de México
  (Statcounter, ago-2026): 360 · 384 · 390 · 393 · 402 · 412 · 414 · 440.
- **Una sola animación de entrada:** el sello que se estampa sobre la copia. Todo lo demás solo
  responde a una acción.
- **Dentro de un papel no se usa `PALETTE` ni `CLARO`** (siguen al tema y en oscuro dejarían tinta
  clara sobre papel claro): solo los tokens de la papelería, auditados por `contraste.mjs` en el
  grupo «LA PAPELERÍA DE LA FICHA DE ARMA». El anillo de foco sobre los papeles va en tinta.

### 5.6 El comparador — dos fichas de fichero (14-sep-2026)

Decidido con Saulo sección por sección (rama `Opus-5/RED-Comparar`). La regla de datos vive en
`src/lib/cotejo.js`, con su prueba (`node --test scripts/cotejo.test.mjs`); las piezas, en `ui.jsx`, bloque
«EL COMPARADOR»; la piel, en `estilo.css`, con el mismo nombre.

- **Dos expedientes lado a lado, también en móvil:** la copia con grapa y sello legal encima de su ficha de
  fichero, y «Cambiar · Quitar» debajo. Tocar la copia abre la ficha del arma. Título en cinta Dymo
  «Comparador». Sin folder manila. En escritorio, la misma pila centrada y más grande (corte único 1024).
- **El mismo dato a la misma altura** en las dos fichas (`subgrid`). Arriba lo que difiere, en el orden de la
  ficha técnica; después «— iguales —» y lo que coincide. Existencias, siempre arriba.
- **La ventaja se circula con rotulador rojo** (`--rotulador`), por regla fija: más capacidad (cargador +
  recámara); menos peso, longitud y precio. Calibre, mecanismo, origen, año y existencias, nunca. Solo compite
  un valor único y exacto: un rango, un «≈», un «varía» o un dato ausente se muestran sin círculo.
  **Nunca una valoración que no salga de un dato de la ficha** (#130 retiró las barras por eso).
- **La tira de diferencias:** la segunda arma frente a la primera, solo en cifras («+4 cartuchos · +27 g ·
  +4 mm · +$5,765.48»), con «precios de fechas distintas» si los inventarios de los dos precios no son del
  mismo día. El precio de «último conocido» compite, y su ficha lleva el sello.
- **Elegir un arma es un `<dialog>`** con búsqueda por nombre, marca y calibre, sin salir de la pantalla. No
  hay «modo selección» ni rótulos genéricos («SLOT A/B», «LOADOUT»): cada lado lleva el nombre de su arma.
- **Estados:** sin armas, una hoja con «Ir al Arsenal»; con una, su expediente y una ficha en blanco.
- **El enlace** `/comparar/<a>-vs-<b>` guarda la comparación; su orden es el de las armas. Fuera de Google
  hasta la parte 2 (indexación), que tiene su propio spec.

### 5.7 La vitrina de accesorios — un puesto de tianguis (15-sep-2026)

Decidido con Saulo pregunta por pregunta (rama `Opus-5/RED-accesorios`). La regla de datos vive en
`window.accesoriosVitrina` (`src/data/data-accesorios.js`), con su prueba (`node --test scripts/vitrina.test.mjs`);
las piezas, en `ui.jsx`, bloque «LA VITRINA DE ACCESORIOS»; la piel, en `estilo.css`, con el mismo nombre.

- **El catálogo es una vitrina como el puesto de Municiones del Home**, no una rejilla de tarjetas. Arriba, un
  **toldo de lona rayada en verde de marca y crema** con «Accesorios» rotulado. Sin aviso legal y sin buscador.
- **Separadores de fichero** (las pestañas de la ficha de arma) filtran por categoría: «Todas» y solo las categorías
  con piezas, sin número y sin quedarse fijos. La pestaña vive en la URL (`/accesorios`, `/cargadores`…) y cambiarla
  reemplaza la dirección en vez de apilarla.
- **Secciones por categoría** con cinta Dymo sin número; dentro, **orden alfabético por nombre corto**.
- **Los cargadores van en tramos** (16-sep-2026), también con «Todas»: por tipo de arma (Pistolas; Rifles, con los
  fusiles; Escopetas) y dentro por calibre, cada tramo con su cinta Dymo chica (`<h3>`). `.223 Rem` y `5.56` van
  aparte. El tramo de cada cargador vive en `ACC_TRAMO` (`data-accesorios.js`) y `auditar.js` falla si falta.
- **Un puesto por pieza:** letrero de tianguis con **solo el nombre corto** (`corto`, máximo 2 renglones a 360 px; el
  `aria-label` es el nombre corto seguido del nombre completo, para que quien dicta lo que ve pueda activarlo), la
  vara y la **pieza sola**. Sin precio, sello ni existencias: eso vive en la ficha. Sin foto, la silueta de su
  categoría, sola.
- **La mesa cruza la fila entera** aunque falten puestos. 2 por fila en móvil, 4 entre 720 y 1023 px, 6 desde 1024.
- **Tema oscuro:** lona, madera, letreros y fotos son objetos y no cambian; la silueta de respaldo sigue al tema
  porque se recorta contra el lienzo.
- **Las fotos** (la pieza sola recortada con alfa) son una entrega aparte, con su propio spec.
- **Variante de Municiones (24-sep-2026).** `/municiones` comparte toldo,
  separadores, mueble y mesas con Accesorios, pero no sus letreros amarillos.
  Cada caja conserva la luz del puesto y lleva debajo, sobre el frente de madera,
  la misma etiqueta de cartón de la vitrina de una ficha de arma: marca + condición
  legal, bala/grano y precio por `munUnidadPrecio`. Accesorios y los puestos de Home
  conservan el letrero con vara.

### 5.8 La ficha de accesorio — el mismo expediente (15-sep-2026)

Decidido con Saulo pregunta por pregunta (rama `Opus-5/RED-ficha-accesorio`). Las reglas de datos viven en
`src/lib/cotejo.js` (`amxInventarioAccesorio`, `amxCompatAccesorio`), con su prueba (`npm test`); la pantalla, en
`AccesorioFicha` (`screens-accesorios.jsx`); las primitivas son las de §5.5.

- **Réplica exacta de la ficha de arma:** el mismo folder, los mismos papeles y el mismo reparto por filas desde
  1024 px. La pestaña del folder lleva la categoría en singular (Cargador, Mira, Refacción, Culata).
- **Cabecera:** el nombre corto (`corto`, el del letrero de la vitrina) de título, el nombre completo a máquina y la
  descripción debajo.
- **La copia lleva la silueta sola** de su categoría y el sello legal estampado; el faldón, bandera · marca · país. En
  cuanto un accesorio tenga `img`, la foto sustituye a la silueta sin tocar la ficha.
- **La ficha técnica** son las specs del inventario tal cual, más el origen.
- **El talón va sin casilla** (no hay comparador de accesorios) y es fijo en móvil, como el arma. Aplica la misma
  regla de errata y de «último precio conocido».
- **Hojas: Compatibilidad · Legalidad**, y abre Compatibilidad.
  - Compatibilidad dice «Sirve a:» con los primeros 6 enlaces y «Ver las N».
  - Si la regla es universal: «cualquier arma con riel Picatinny. En el Arsenal:».
  - Sin fichas, la plataforma del PDF «(sin ficha en el Arsenal)».
  - Sin nada, no hay pestaña.
  - Los enlaces a armas van sin `↗`: en el sitio `↗` es «abre un PDF».
- **Debajo del folder:** «Armas compatibles» (todas, en expediente y sin ⇄) y «Opiniones». Sin accesorios
  relacionados.

### 5.9 El hub del Arsenal (15-sep-2026)

Decidido con Saulo sección por sección (rama `Opus-5/RED-Arsenal`). Las cuentas viven en `src/lib/arsenal-hub.js`,
con su prueba (`node --test scripts/arsenal-hub.test.mjs`); las piezas, en `ui.jsx`, bloque «EL HUB DEL ARSENAL»; la
piel, en `estilo.css`, con el mismo nombre.

- **Títulos en cinta Dymo** en las seis secciones, como fuera del folder de la ficha.
- **Disponibilidad es la tarjeta de almacén:** un renglón por sucursal con las armas que tienen existencia en el
  ÚLTIMO inventario de armas de esa sucursal y la fecha de ese inventario. Sin total: un arma puede estar en las dos.
  Cada renglón abre el catálogo con Armería = esa sucursal y Disponibilidad = Con existencias, y la lista mide lo mismo
  que el renglón. Las polaroids de Armería siguen abriendo todo lo de su armería, esté disponible o no.
- **Con una armería elegida, «Con existencias» y «Agotadas» miran esa sucursal** (`amxTieneExistencia`). Antes
  contaban existencias en cualquiera y se colaban armas que solo tenía la otra (la SIG Sauer P322 en DCAM).
- **Clasificación legal es una hoja de oficio con los sellos de la ficha:** la palabra corta por debajo de 1024 px, la
  etiqueta completa por encima; verde civil, rojo seguridad y exclusivo.
- **Uso son polaroids apaisadas** con solo el nombre y fotos de banco libre, con su fuente anotada junto a
  `USO_FOTOS`. Militar / Táctico no sale en el hub.
- **Calibre es un mostrador que se desliza:** una sola tabla con los calibres que tienen armas, cada cartucho a escala
  de su largo real y con su etiqueta de cartón (nombre y armas). Sin foto, la silueta de pie. El ancho de celda sale
  del de la pantalla para que siempre asome el siguiente calibre.

### 5.10 Los filtros de los catálogos (16-sep-2026)

Decidido con Saulo pregunta por pregunta, con maqueta (rama `Opus-5/RED-Filtros`). Las cuentas viven en
`src/lib/filtros.js`, con su prueba (`node --test scripts/filtros.test.mjs`); las piezas, en `ui.jsx`, bloque «LOS
FILTROS DE LOS CATÁLOGOS»; la piel, en `estilo.css`, con el mismo nombre. Armas y municiones; Accesorios conserva
sus separadores (§5.7).

- **La banda verde solo lleva el buscador**, y su ✕ borra solo el texto. **Nada se queda fijo** al bajar. En móvil
  el scroll lo lleva el cuerpo de `app.jsx`: un `sticky` con `top: 50` dejaba una franja vacía de 50 px.
- **Una tira de chips que se desliza de lado**, igual en escritorio, con un degradado en el borde mientras hay más.
  Armas: Tipo · Calibre · Armería · Disponibilidad · Precio · Más. Municiones: Calibre · Disponibilidad · Marca ·
  Precio; su título y su aviso quedan arriba de la banda.
- **Chip sin filtro: etiqueta de papel** con sombra, sin borde. **Con filtro: la cinta Dymo** rotulada con el valor y
  su ✕, que lo quita sin abrir nada.
- **Cada chip abre debajo una hoja que empuja el catálogo**, con una muesca hacia su chip. Se cierra al elegir, con
  «Cerrar», con Esc o con su chip; tocar fuera no la cierra. En escritorio mide como máximo 560 px y se alinea bajo
  su chip.
- **Las opciones son casillas de formulario** en columnas parejas; una sola por filtro, marcada con ✕.
- **El precio es una regla** con marcas y dos cursores: paso $1,000 y tope «$100,000+» en armas; por cartucho y sin
  tope en municiones. Sus límites salen de los demás filtros y cambiar uno reinicia el rango.
- **«Más»** (armas) abre Uso, Clasificación legal, Marca, Mecanismo y Era como renglones de formulario con puntos
  guía; elegir cierra el renglón y deja la hoja abierta.
- **Conteo y «Limpiar»** en un renglón bajo la tira («▸ 227 ARMAS · 1 FILTRO», sin total). «Limpiar» borra filtros,
  precio y búsqueda, y solo sale si hay algo puesto.

### 5.11 La ficha de munición — el mismo expediente (26-sep-2026)

Decidido con Saulo (rama `Opus-5/RED-ficha-municion`). Reglas en `src/lib/cotejo.js`
(`amxInventarioMunicion`, `amxCompatMunicion`, `amxRequisitoMunicion`), con prueba; pantalla en
`MunicionFicha` (`screens-municiones.jsx`); primitivas de §5.5.

- **Réplica de la ficha de accesorio (§5.8)**, pestaña «Munición». Título: el nombre; debajo, la
  descripción. La copia es la foto de la caja; si no carga, la silueta de munición.
- **El talón dice la unidad:** «Por cartucho · con IVA», o «Por caja» (2046); en móvil, `/ cartucho`.
- **Legalidad: solo el requisito de este cartucho** de la tabla de la DCAM (escopeta, anular .22,
  fuego central). Sin requisito: los de seguridad y el .17 HMR, hasta confirmarlo con la DCAM.
- **Debajo del folder:** Armas compatibles (todas, sin ⇄), Otras municiones del calibre en la vitrina de la ficha de arma
  (`Repisa` y etiqueta de cartón; 12 a la vista y «Ver los N» dentro del mueble) y Opiniones.

### 5.12 La ficha de calibre — el mismo expediente (27-sep-2026)

Decidido con Saulo en cinco rondas (rama `Opus-5/RED-ficha-calibre`; spec
`2026-09-28-ficha-calibre-design.md`, fuera del repo, en
`Documentos de Proyecto/archivo-repo-2026-10-18/docs/superpowers/specs/`). Pantalla en `CalibreScreen` (`screens-3.jsx`);
cruce de munición en `amxMismoCalibre` (`src/lib/calibres.js`, con prueba); primitivas de §5.5.

- **Réplica de la ficha de munición (§5.11) sin talón ni tarjeta de almacén:** un calibre no tiene precio ni
  existencias propias, y no se inventan. Pestaña «Calibre» en las 30.
- **Cabecera:** clase · sistema, el nombre, el uso, «También se le llama…» y la descripción.
- **La copia** es la foto del cartucho; al pie, su nombre y su largo («25 mm de largo»). Sello legal estampado;
  los calibres sin clasificación fijada (.357 Magnum, .45 ACP, 5.7x28mm) van **sin sello**. La regla del
  cartucho de la ficha anterior se retiró: la foto y el largo al pie la sustituyen.
- **Ficha técnica:** Velocidad, Energía, Retroceso, En el catálogo y, al pie, la fuente de las cifras.
- **Papel milimétrico: comparativa de tamaños** (corrección de Saulo en Penpot, 27-sep-2026; sustituye a la regla
  de energía, que no se entendía). Eje Y en milímetros; el cartucho a tamaño real y un bolígrafo de 15 cm
  (`imagenes/boligrafo-15cm.webp`, generado sin marca). En escritorio suma «Comparado con otros calibres»: hasta 3
  de su rama, los de más armas en el catálogo (carabina y rifle juntas); el .22 LR, con 9mm Parabellum, .38
  Special y .308 Winchester; el .22 WMR, con el .22 LR (`amxComparadosDe`). También en las escopetas.
- **Hojas: Armas · Legalidad**, abre en Armas («Lo disparan:», 6 enlaces y «Ver las N»); sin armas, no hay hoja.
- **Móvil:** cabecera → copia → ficha técnica → milimétrico → hojas. **Escritorio:** copia | cabecera y ficha;
  debajo, hojas | milimétrico, que llena la columna derecha.
- **Debajo del folder:** Municiones de este calibre (la vitrina de §5.11, compartida en `VitrinaMuniciones`)
  → Armas que lo usan (polaroids iguales y alineadas; 6 y «Ver las N en el Arsenal») → «¿Encontraste un dato incorrecto?».

---

## 6. Prohibiciones explícitas

Restricciones negativas: sin ellas el modelo vuelve al promedio.

- ❌ **Space Grotesk** — es el punto de convergencia documentado de la IA. Tampoco Inter ni Roboto.
- ❌ **Gradientes morado-azul**, cream `#F4F1EA` con serif display, emoji como iconos de sección.
- ❌ **El borde de 1px como recurso principal.** Si una caja necesita separarse, es superficie o sombra.
- ❌ **`backdrop-filter: blur()`** en cualquier cosa que haga scroll.
- ❌ **`box-shadow` con blur > 24px** en listas: el costo escala con el cuadrado del radio.
- ❌ **augmented-ui en la grilla.** Como recetario de `clip-path` para 3-6 elementos hero, sí; como
  librería en 321 tarjetas, no — crea un contexto de apilamiento por elemento.
- ❌ **Tailwind por CDN.** Compila en runtime; deshace el prerender del que dependen los crawlers.
- ❌ **Animar `background-position`.** Si algo rota, se anima con `transform`.
- ❌ **Todo centrado.** Y nada de `border-radius` uniforme en todo.

---

### 6b. Prohibiciones de identidad y contenido (de la §4.4 de Saulo — inviolables)

Estas no son preferencias estéticas: evitan problemas legales y de confusión institucional.

- ❌ **Iconografía oficial de cualquier institución pública.** Ni escudo nacional, ni águila,
  ni emblemas de SEDENA, ni logos de gobierno, ni sellos oficiales — tampoco «inspirados en».
  El sitio no puede parecer que pertenece al gobierno.
- ❌ **Inventar leyes, artículos o reformas.** Todo contenido legal va respaldado por texto
  real de la ley. Si no hay fuente, no se escribe. El apartado legal solo se modifica cuando
  la ley cambia de verdad.
- ❌ **Tocar los logotipos** de Armado en México, Armas y Más y Armas M&S, ni el nombre de
  Saulo Flores León. Se usan tal cual, siempre igual.
- ✅ Sí van: verde/blanco/rojo, señalética, gráfica editorial mexicana, formularios, **sellos
  gráficos ficticios**, numeración de expedientes, códigos, líneas tricolor.

Todo contenido normativo muestra **fuente + fecha de actualización** visibles (tu §14).

## 7. No negociables

Es un sitio publicado, divulgativo y con contenido de referencia legal.

- **Contraste ≥ 4.5:1** para todo texto que porte información, incluidas las etiquetas que parecen
  decorativas. Si comunica, no es decorativa.
- **Objetivos táctiles ≥ 44px** en filtros y chips.
- **`:focus-visible` siempre visible.** `clip-path` recorta el anillo de foco: usar
  `outline-offset` negativo cuando se recorte una tarjeta enfocable.
- **`prefers-reduced-motion`** desactiva scanlines, parpadeos y cualquier movimiento ambiental.
- **Densidad de datos por encima del espectáculo.** Es una enciclopedia, no una landing.
- **Rendimiento móvil:** medir antes y después en gama media. `contain-intrinsic-size: auto 600px`
  junto a `content-visibility`, o el scroll salta y Ctrl+F cae en la sección equivocada.

---

## 8. Cómo se trabaja

1. **Nunca sobre el sitio entero.** Se itera en una página de galería con todos los primitivos.
2. **Las primitivas antes que las pantallas.** Las ~15 de `ui.jsx` (`ArmaCard`, `TiraFiltros`,
   `AvailBadge`, `TacticalCorners`, `SectionHeader`, `PriceLevel`…) propagan solas a todo el sitio.
   Las pantallas solo las componen.
3. **La piel va al CSS, el layout se queda inline.** Una propiedad vive en un sitio o en el otro,
   nunca en los dos — si no, empieza la guerra de `!important`. Lo dinámico viaja como custom
   property: `style={{'--estado': color}}`.
4. **Antes de publicar:** las skills `verificar-app` y `fidelidad-diseno`, con capturas antes/después.
5. **Prueba de no-genérico.** Antes de dar por buena una pantalla, la pregunta es:
   *¿produciría esto mismo para cualquier catálogo oscuro?* Si la respuesta es sí, se revisa.
6. **Lo nuevo se propone en Penpot, lo publicado se mira en el navegador.** El archivo «Wire
   Frame» consume estos tokens (`npm run tokens` → `docs/penpot/tokens.json`); nunca al revés.
   Reglas, mapa y trampas en `docs/PENPOT.md`.

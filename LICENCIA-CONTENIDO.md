# Licencia del contenido · Content license

**Armado en México** — Copyright (C) 2026 Saulo Flores León

El **código** de este repositorio está bajo AGPL-3.0-or-later ([`LICENSE`](LICENSE)) con
los dos términos de [`TERMINOS-ADICIONALES.md`](TERMINOS-ADICIONALES.md).
Pero un repositorio no es solo código: aquí viven además un catálogo, unos PDF oficiales
y 243 imágenes, y cada cosa tiene un dueño distinto. **Este documento dice, pieza por
pieza, qué se concede y qué no.**

> En caso de discrepancia entre las dos versiones de este documento, **prevalece la
> versión en español**.

---

## El mapa

| Qué | Dónde | Quién lo tiene | Qué se concede |
|---|---|---|---|
| Compilación del catálogo | `src/data/` | Saulo Flores León | **CC BY-SA 4.0** |
| Los hechos en sí | (dentro de lo anterior) | Nadie | No hay nada que conceder |
| Inventarios oficiales | `public/inventarios/*.pdf` | Fuera del derecho de autor | Redistribuibles, sin exclusividad |
| Fotos de producto y texturas | `public/imagenes/` | Los fabricantes y terceros | **Nada** |
| Fotos de uso | `public/imagenes/usos/` | Sus autores (Pexels) | Licencia Pexels |
| Identidad del proyecto | logotipo, isotipo, retrato | Saulo Flores León | **Nada** — ver §7(e) |

---

## 1 · La compilación del catálogo — CC BY-SA 4.0

Los ficheros de `src/data/` se ofrecen **además** de la AGPL bajo la
[**Creative Commons Atribución-CompartirIgual 4.0 Internacional**](https://creativecommons.org/licenses/by-sa/4.0/deed.es)
(`CC-BY-SA-4.0`), en lo que tienen de contenido:

- la **selección y disposición** de las piezas del catálogo;
- la **estructura** de los registros y la **taxonomía** (categorías, tipos, calibres,
  clasificaciones, compatibilidades);
- los **textos divulgativos** redactados para este proyecto — las descripciones de
  cada arma, accesorio, munición y calibre.

Los ficheros `.js` que los contienen **siguen bajo AGPL-3.0**, porque son JavaScript y
llevan funciones dentro. La concesión CC corre en paralelo y sobre el conjunto de datos
como tal: sirve a quien quiera llevarse el catálogo a otro proyecto sin arrastrar la
AGPL. Quien se lleve el fichero entero, se lleva las dos licencias.

**Sobre qué derecho se concede esto.** La Ley Federal del Derecho de Autor reconoce
tres cosas distintas, y conviene no confundirlas:

- **Artículo 107** — las bases de datos que «por razones de selección y disposición de
  su contenido constituyan creaciones intelectuales, quedarán protegidas como
  compilaciones. Dicha protección no se extenderá a los datos y materiales en sí
  mismos.»
- **Artículo 108** — «Las bases de datos que no sean originales quedan, sin embargo,
  protegidas en su uso exclusivo por quien las haya elaborado, durante un lapso de 5
  años.»
- **Artículo 110** — el derecho exclusivo recae sobre «la forma de expresión de la
  estructura» de la base: reproducirla, traducirla, adaptarla, reordenarla,
  distribuirla y comunicarla al público.

El derecho del artículo 108 es el que hace falta licenciar de verdad: sin una concesión
expresa, copiar `src/data/` lo infringiría **aunque cada dato suelto sea libre**. La
sección 4 de la CC BY-SA 4.0 lo cubre de forma explícita — su definición de «Derechos
Sui Generis sobre Bases de Datos» alcanza a «otros derechos esencialmente equivalentes
en cualquier otra parte del mundo», y este lo es.

**Qué tienes que hacer si lo usas:** citar la fuente («Armado en México», con enlace al
repositorio) y publicar tus añadidos bajo la misma licencia. Nada más.

## 2 · Los hechos no son de nadie

Los precios, las existencias, las referencias DCAM, los calibres, las velocidades de
boca y las especificaciones de fábrica **no son propiedad de este proyecto ni de nadie**.
El artículo 14 fracción X de la Ley Federal del Derecho de Autor excluye de protección
«la información de uso común tal como los refranes, dichos, leyendas, **hechos**,
calendarios y las escalas métricas».

Dicho sin rodeos: si tomas de aquí el precio oficial de un rifle, no le debes nada a
nadie. Lo que se licencia arriba es el trabajo de reunirlos, ordenarlos y describirlos
— no los números.

## 3 · Los inventarios oficiales — fuera del derecho de autor

Los PDF de `public/inventarios/` son publicaciones de la **DCAM** y la **OTCA**. El
artículo 14 fracción VIII de la Ley Federal del Derecho de Autor deja fuera de
protección «los textos legislativos, reglamentarios, administrativos o judiciales», y
añade: «En caso de ser publicados, deberán apegarse al texto oficial y no conferirán
derecho exclusivo de edición».

Se archivan y se redistribuyen aquí **sin alterar**, precisamente por eso. Este proyecto
no reclama ningún derecho sobre ellos, y tampoco puede concedértelo: ya los tienes.

## 4 · Las fotografías de producto y las texturas — de terceros

Las imágenes de `public/imagenes/` que muestran armas, accesorios, municiones y
cartuchos proceden en su mayoría de los **sitios web de los propios fabricantes**. Lo
mismo vale para las texturas y elementos gráficos de atrezo (el folder, el marco, la
ficha de biblioteca, el letrero, los sellos de desgaste, los banners de armería).

**Esta licencia no concede ningún derecho sobre ellas, ni podría.** Se muestran con
fines informativos y de identificación del producto, y sus titulares son quienes son.
Si haces un fork y lo publicas, **consigue las tuyas o bórralas**: el catálogo funciona
sin ellas — `window.isRealImage` vacía toda ruta que no exista y la interfaz dibuja su
marcador. Ninguna foto ajena es necesaria para que el sitio compile y corra.

## 5 · Las fotografías de uso — banco libre

`public/imagenes/usos/` son de **Pexels**, con licencia de uso libre incluido el
comercial. Sus autores están acreditados en `src/screens/screens-1.jsx`, junto a
`USO_FOTOS`:

| Archivo | Autor |
|---|---|
| `domicilio.webp` | Terrance Barksdale |
| `club.webp` | Artem Zhukov |
| `caza.webp` | Arian Fernandez |

Si las conservas en tu fork, conserva también el crédito.

## 6 · La identidad del proyecto — reservada

El logotipo, el isotipo, los favicones y el retrato del autor (`saulo-flores.webp`)
**no se licencian**. Es el mismo criterio del término §7(e) de
[`TERMINOS-ADICIONALES.md`](TERMINOS-ADICIONALES.md), y en el caso del
retrato rige además el artículo 87 de la Ley Federal del Derecho de Autor.

---

## Cómo forkear esto sin pisar a nadie

1. Clona. Todo el **código** es tuyo para usar, bajo AGPL.
2. **Quédate el catálogo** de `src/data/`: cítanos y compártelo igual (CC BY-SA 4.0).
3. **Quédate los PDF** si te sirven. No son de nadie.
4. **Borra o sustituye las fotos** de `public/imagenes/`, salvo las tres de `usos/`, que
   solo piden el crédito. La app arranca igual.
5. **Cámbiale el nombre y la identidad gráfica.** Es el término §7(c): un fork es
   bienvenido, solo tiene que llamarse de otra manera.

Nada de esto es una trampa. Lo único que se reserva de verdad es que tu versión no se
haga pasar por la nuestra.

---
---

# English translation (unofficial)

**Armado en México** — Copyright (C) 2026 Saulo Flores León

The **code** in this repository is under AGPL-3.0-or-later ([`LICENSE`](LICENSE)) with
the two terms in [`TERMINOS-ADICIONALES.md`](TERMINOS-ADICIONALES.md).
This document covers everything else. **In case of discrepancy, the Spanish version
above prevails.**

| What | Where | Who holds it | What is granted |
|---|---|---|---|
| Catalog compilation | `src/data/` | Saulo Flores León | **CC BY-SA 4.0** |
| The facts themselves | (within the above) | No one | Nothing to grant |
| Official inventories | `public/inventarios/*.pdf` | Outside copyright | Redistributable, non-exclusive |
| Product photos, textures | `public/imagenes/` | Manufacturers, third parties | **Nothing** |
| Use photos | `public/imagenes/usos/` | Their authors (Pexels) | Pexels license |
| Project identity | logo, icon, portrait | Saulo Flores León | **Nothing** — see §7(e) |

**1 · The catalog compilation** is offered, in addition to the AGPL, under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/): its selection and
arrangement, the record structure and taxonomy, and the descriptive texts written for
this project. The `.js` files themselves remain AGPL — they contain code. Under Mexican
law this rests on arts. 107, 108 and 110 of the Ley Federal del Derecho de Autor; art.
108 in particular grants whoever compiled a non-original database five years of
exclusive use, and CC BY-SA 4.0 §4 expressly reaches such rights ("other essentially
equivalent rights anywhere in the world"). Attribute the source and share alike.

**2 · The facts are nobody's.** Prices, stock figures, DCAM references, calibers and
factory specifications are excluded from protection by art. 14(X) LFDA as "information
in common use, such as ... facts". Take them freely.

**3 · The official inventories** in `public/inventarios/` are DCAM and OTCA
publications. Art. 14(VIII) LFDA excludes "legislative, regulatory, administrative or
judicial texts" from copyright and adds that publishing them "shall confer no exclusive
right of edition". They are archived here unaltered. This project claims nothing over
them.

**4 · Product photographs and textures** in `public/imagenes/` come mostly from the
manufacturers' own websites. **No rights are granted over them, and none could be.**
They appear for identification and information. If you fork and publish, get your own
or delete them — `window.isRealImage` blanks any missing path and the UI draws its
placeholder. The site builds and runs without a single third-party photo.

**5 · Use photos** in `public/imagenes/usos/` are from Pexels (free license, commercial
use included): `domicilio.webp` by Terrance Barksdale, `club.webp` by Artem Zhukov,
`caza.webp` by Arian Fernandez. Keep the credit if you keep the photos.

**6 · Project identity** — logo, icon, favicons and the author's portrait — is not
licensed. Same rationale as term §7(e); the portrait is also covered by art. 87 LFDA.

**Forking, in short:** take the code, take the catalog (cite and share alike), take the
PDFs, replace the photos, and give it another name. Nothing here is a trap — the only
thing truly reserved is that your version must not pass itself off as ours.

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

1. Concepto general
Nombre: Armado en México
Propósito: Enciclopedia digital mexicana sobre armas, calibres, municiones, accesorios y marco legal relacionado.
La aplicación debe sentirse como una herramienta de consulta moderna, no como una página gubernamental antigua.
La estética combina:
México de los años 80–90.
Diseño editorial técnico.
Archivos y fichas gubernamentales.
HUD / interfaces tácticas.
Catálogos militares.
Tipografía industrial.
Geometría limpia.
Bordes redondeados modernos.
Microdetalles inspirados en documentación burocrática mexicana.
Importante: el estilo ochentero debe estar en el lenguaje visual, no mediante filtros de imagen envejecidos.
La interfaz debe ser nítida, limpia, responsive y contemporánea.
---
2. Sistema visual
Paleta principal
```text
Verde profundo      #173A32
Verde secundario    #245247
Crema               #F3EFE4
Blanco              #FAF9F5
Rojo mexicano       #C83B32
Negro técnico       #171B19
Gris texto          #59605C
Beige secundario    #DDD5C4
```
El rojo debe utilizarse como acento, no como color dominante.
Sensación
> ¿Cómo sería una aplicación tecnológica actual diseñada por una dependencia mexicana de 1988?
Pero ejecutada con estándares de UI actuales.
---
3. Logo
El logo proporcionado por el usuario es el único elemento de identidad principal.
No utilizar:
Escudo nacional de México.
Águila del escudo.
Logos gubernamentales.
Sellos oficiales.
Emblemas de SEDENA como branding.
El logo debe aparecer principalmente en:
Splash.
Header.
Menú lateral/MÁS.
Login si posteriormente existe.
About.
El nombre debe escribirse:
ARMADO EN MÉXICO
No utilizar "Enciclopedia Nacional de Armas" como nombre de marca.
---
4. Navegación principal
La navegación inferior de móvil tiene exactamente cinco apartados:
```text
HOME
ARSENAL
COMPARAR
LEGALIDAD
MÁS
```
En desktop puede convertirse en sidebar/top navigation.
HOME
Dashboard y descubrimiento.
ARSENAL
Catálogo completo de armas.
COMPARAR
Comparador de fichas.
LEGALIDAD
Información jurídica y normativa.
MÁS
Menú secundario.
El menú MÁS contiene:
```text
ARMAS TRAUMÁTICAS
ACCESORIOS
MUNICIONES
CALIBRES
SOPORTE Y NORMAS
PREGUNTAS FRECUENTES
ACERCA DE
VER TUTORIAL
```
---
5. HOME
La pantalla principal debe funcionar como el dashboard de la aplicación.
Header
Arriba:
Logo pequeño.
Nombre ARMADO EN MÉXICO.
Icono de notificaciones, si existe.
Menú.
Debajo:
Buscador global
Placeholder:
> Buscar armas, calibres, marcas...
El buscador debe permitir encontrar:
Armas.
Modelos.
Fabricantes.
Calibres.
Municiones.
Accesorios.
Contenido legal.
---
5.1 Arma destacada
Card grande horizontal/vertical.
Ejemplo:
```text
ARMA DESTACADA

Beretta 92FS
9mm Parabellum

Pistola
Italia
1975

[VER DETALLES] [COMPARAR]
```
La imagen del arma debe utilizar un tratamiento de ficha técnica / producto, preferentemente sobre fondo limpio o retícula técnica.
No usar fotografías con filtros retro.
---
6. Categorías principales
Cards de acceso rápido.
ARMAS CORTAS
Pistolas y revólveres.
ARMAS LARGAS
Rifles, fusiles, carabinas, escopetas, etc.
MUNICIONES
Catálogo de municiones.
ACCESORIOS
Accesorios relacionados.
CALIBRES
Base de datos de calibres.
LEGALIDAD
Información jurídica.
Cada card debe mostrar:
Icono.
Nombre.
Cantidad de registros, si existe.
CTA implícito.
Ejemplo:
```text
┌─────────────────────┐
│       [icono]       │
│   ARMAS CORTAS      │
│      1,248          │
└─────────────────────┘
```
---
7. Novedades / contenido
Debajo de categorías:
NOVEDADES
Contenido editorial.
Cada artículo puede mostrar:
```text
NUEVA LEGISLACIÓN

Cambios recientes en materia
de posesión de armas.

12 ABR 2026
```
También puede incluir:
Fecha.
Categoría.
Título.
Resumen.
Imagen/ilustración.
Estado.
CTA:
VER TODO
---
8. ARSENAL
Este es uno de los módulos principales.
Debe ser un catálogo consultable.
Header
```text
ARSENAL

[ Buscar... ]

[Filtros]
```
Filtros:
Tipo.
Fabricante.
País.
Año.
Calibre.
Acción.
Estado/estatus, si aplica.
No cargar todos los filtros simultáneamente en móvil.
Usar:
FILTRAR
que abre un bottom sheet.
---
9. Listado de armas
Cada resultado debe ser una card.
Ejemplo:
```text
┌───────────────────────────┐
│       imagen arma         │
│                           │
├───────────────────────────┤
│ AK-47                     │
│ 7.62×39 mm                │
│                           │
│ URSS · 1947               │
│ Fusil de asalto           │
│                           │
│ [Ver ficha]       ☆       │
└───────────────────────────┘
```
La información debe ser descriptiva/enciclopédica.
No convertir la ficha en una guía de fabricación, modificación o empleo.
---
10. Ficha individual del arma
Esta es una de las pantallas más importantes de la aplicación.
Header
```text
←   AK-47          ☆
    7.62×39 mm
```
Hero
Imagen grande del arma.
Puede utilizar:
Fondo verde oscuro.
Retícula HUD.
Líneas técnicas.
Marcadores.
Código de registro.
Ejemplo:
```text
AK-47
7.62×39 mm

CÓDIGO: AR-0047
ORIGEN: URSS
AÑO: 1947
```
---
11. Tabs de la ficha
La ficha debe dividirse en:
```text
INFORMACIÓN
ESPECIFICACIONES
HISTORIA
GALERÍA
```
INFORMACIÓN
Descripción general.
Contenido:
Qué es.
Fabricante/diseñador.
Contexto histórico.
País de origen.
Uso histórico.
ESPECIFICACIONES
Tabla técnica.
Ejemplo:
```text
TIPO             Fusil de asalto
ORIGEN           URSS
DISEÑADOR        M. Kalashnikov
AÑO              1947
CALIBRE          7.62×39 mm
LONGITUD         ...
PESO             ...
```
Los campos deben venir del backend.
No hardcodear las especificaciones dentro del componente.
HISTORIA
Contenido editorial.
Debe permitir:
Texto enriquecido.
Fechas.
Eventos.
Países.
Fabricantes.
Fotografías históricas.
GALERÍA
Galería de imágenes:
Vista lateral.
Detalles.
Variantes.
Fotografías históricas.
Documentación.
Grid responsive.
---
12. COMPARAR
Debe permitir seleccionar dos o más registros compatibles y visualizar sus diferencias.
Pantalla inicial:
```text
COMPARAR

Selecciona armas

[ + Agregar arma ]

VS

[ + Agregar arma ]
```
Después:
```text
AK-47                 AR-15

Tipo
Fusil                 Rifle

Calibre
7.62×39 mm            5.56×45 mm

Origen
URSS                  EE.UU.

Año
1947                  ...

Longitud
...                   ...

Peso
...                   ...
```
UX
Las diferencias importantes deben resaltarse visualmente.
No utilizar colores que impliquen automáticamente "mejor" o "peor".
El comparador es informativo, no una herramienta para recomendar un arma para causar daño.
---
13. LEGALIDAD
Debe sentirse diferente al Arsenal.
Aquí el diseño puede parecer más:
archivo jurídico + sistema de consulta.
Header:
```text
LEGALIDAD

Información normativa
```
Tabs:
```text
FEDERAL
ESTATAL
REQUISITOS
PERMISOS
```
---
13.1 Federal
Mostrar contenido relacionado con legislación federal.
Cards:
```text
LEY FEDERAL DE ARMAS
DE FUEGO Y EXPLOSIVOS

Última actualización
[fecha]

[VER RESUMEN]
```
También:
Artículos relevantes.
Cambios normativos.
Fuentes.
Fecha de actualización.
---
14. Estatal
Selector:
```text
Selecciona estado

[ Ciudad de México ▼ ]
```
Después:
```text
Normativa aplicable
Requisitos
Dependencias
Trámites
Restricciones
```
La información jurídica debe mostrar siempre:
FUENTE + FECHA DE ACTUALIZACIÓN
Esto es fundamental para evitar presentar contenido legal desactualizado como vigente.
---
15. Requisitos
Vista tipo checklist.
Ejemplo:
```text
REQUISITOS

○ Identificación
○ Comprobante de domicilio
○ Documentación correspondiente
○ Requisitos adicionales

[VER FUENTE]
```
Debe existir una advertencia:
> La información mostrada es de carácter informativo. Consulta siempre la normativa y fuente oficial vigente.
---
16. Permisos
Cards de información.
Por ejemplo:
```text
PERMISOS

Posesión
Portación
Coleccionismo
Actividades autorizadas
```
Cada permiso tiene:
Descripción.
Quién puede solicitarlo, si corresponde.
Requisitos generales.
Fuente.
Fecha de actualización.
Enlace a fuente oficial.
---
17. MÁS
El botón MÁS abre un menú tipo drawer/bottom sheet.
Visualmente:
```text
MÁS

ARMAS TRAUMÁTICAS       →
ACCESORIOS              →
MUNICIONES              →
CALIBRES                →
SOPORTE Y NORMAS        →
PREGUNTAS FRECUENTES    →
ACERCA DE               →
VER TUTORIAL            →
```
El menú debe mantener la identidad visual de la aplicación.
---
18. ARMAS TRAUMÁTICAS
Catálogo independiente.
Debe permitir separar claramente esta categoría del Arsenal principal.
Filtros y categorías propios.
Ficha:
```text
NOMBRE
TIPO
FABRICANTE
MODELO
CALIBRE
CARACTERÍSTICAS
ESTATUS LEGAL
```
El estatus legal debe enlazar a LEGALIDAD.
---
19. ACCESORIOS
Catálogo enciclopédico de accesorios.
Categorías visuales:
Óptica.
Monturas.
Cargadores.
Sistemas de iluminación.
Elementos de transporte.
Otros.
Las fichas deben ser informativas.
No convertir el módulo en instrucciones de modificación de armas.
---
20. MUNICIONES
Base de datos de municiones.
Cada registro:
```text
9×19 mm

Denominación
9×19 Parabellum

Diámetro
...

Longitud
...

Familia
...

Historia
...

Armas asociadas
...
```
Puede existir relación:
Munición → Calibre → Armas compatibles
pero la relación debe ser únicamente de referencia de catálogo.
---
21. CALIBRES
Una de las mejores oportunidades para crear una experiencia de enciclopedia.
Pantalla:
```text
CALIBRES

[ Buscar calibre ]

9 mm
.22 LR
.380 ACP
.45 ACP
5.56×45 mm
7.62×39 mm
...
```
Cada calibre abre una ficha.
Ficha
```text
7.62×39 mm

INFORMACIÓN
ESPECIFICACIONES
HISTORIA
ARMAS RELACIONADAS
MUNICIONES RELACIONADAS
```
---
22. SOPORTE Y NORMAS
Sección documental.
Debe contener:
Normas de uso de la plataforma.
Política de contenido.
Fuentes de información.
Criterios de clasificación.
Correcciones.
Reportar información incorrecta.
Contacto.
Puede utilizar un diseño parecido a documentación técnica.
---
23. PREGUNTAS FRECUENTES
FAQ con acordeones.
Ejemplo:
```text
¿Qué es Armado en México?       +
¿Cómo se clasifican las armas? +
¿Cómo se actualiza la información? +
¿De dónde provienen los datos? +
¿Cómo reporto un error?        +
```
Al abrir:
```text
Pregunta
────────────────────

Respuesta...
```
---
24. ACERCA DE
Página institucional de la aplicación.
Debe destacar:
ARMADO EN MÉXICO
> Enciclopedia y plataforma de consulta sobre armas, calibres, municiones, accesorios y normativa.
Secciones:
Qué es.
Objetivo.
Metodología.
Fuentes.
Contacto.
Versión.
---
25. VER TUTORIAL
Tutorial de bienvenida de cuatro pasos, a PANTALLA COMPLETA (no overlays sobre la interfaz), con el lenguaje del expediente: hoja con pestaña de folder, copia instantánea y sellos de tinta.
Es OBLIGATORIO la primera vez: no hay SALTAR, porque lleva el aviso legal. «Menos accesible, pero es imprescindible esta información por legalidad» (Saulo, 10-sep-2026).
Solo se abre por sí mismo al entrar por la PORTADA. Quien aterriza en una ficha desde un buscador no lo ve.
Escape NO lo cierra la primera vez (sería el SALTAR escondido en una tecla); sí lo cierra cuando se repite desde MÁS → «Ver tutorial».
Paso 1
Bienvenido a Armado en México
> Qué es el sitio, con el logotipo en una copia instantánea.
Paso 2
¿Qué es Armado en México?
> Plataforma divulgativa de código abierto. Tres sellos rojos: no pertenecemos al gobierno · no vendemos armas de fuego · no tramitamos licencias ni permisos.
Paso 3
Lo que puedes hacer
> Armas · Calibres · Legalidad · Comparación, en texto centrado.
Paso 4
Todo listo
> Sello de aprobado y «¿Qué prefieres?» Modo claro / Modo oscuro: el tema cambia EN VIVO y no avanza. «Continuar» cierra.
El texto literal vive en src/screens/screens-tutorial.jsx; este brief fija la estructura, no el copy.
---
26. Diseño de componentes
El agente debería construir componentes reutilizables.
```text
AppShell
├── Header
├── BottomNavigation
├── SearchBar
├── SectionHeader
├── WeaponCard
├── CategoryCard
├── WeaponHero
├── SpecificationTable
├── ContentTabs
├── FilterSheet
├── ComparisonTable
├── LegalCard
├── ArticleCard
├── MenuDrawer
├── FAQAccordion
├── SourceBadge
└── UpdateDate
```
Esto evitará construir cada pantalla como un diseño independiente.
---
27. Sistema de cards
Todas las cards deben compartir:
Border radius consistente.
Bordes finos.
Sombras extremadamente suaves.
Espaciado consistente.
Tipografía jerárquica.
Iconografía lineal.
No usar neumorfismo.
No usar glassmorphism excesivo.
No usar texturas de papel fuertes.
El "México 80s/90s" debe provenir principalmente de:
tipografía + composición + colores + geometría + detalles gráficos.
---
28. HUD
El HUD es un detalle decorativo/informativo, no debe dificultar la lectura.
Utilizar:
```text
┌───────────────┐
│ ┌           ┐ │
│ │   ARMA    │ │
│ └           ┘ │
└───────────────┘
```
Con:
Retículas.
Coordenadas.
Líneas finas.
Códigos.
Etiquetas.
Indicadores.
Pero siempre con baja jerarquía visual.
---
29. Elementos mexicanos
La identidad mexicana debe ser sutil.
Sí
Verde / blanco / rojo.
Composiciones inspiradas en gráfica editorial mexicana.
Señalética.
Tipografía industrial.
Diseño burocrático.
Formularios.
Sellos gráficos ficticios.
Numeración de expedientes.
Códigos.
Líneas tricolor.
No
Escudo nacional.
Águila oficial.
Logos gubernamentales.
Copiar documentos oficiales.
Hacer parecer que la aplicación pertenece al gobierno.
---
30. Responsive
Mobile
Prioridad absoluta.
```text
390 × 844
375 × 812
430 × 932
```
Bottom navigation fija.
Tablet
Convertir:
```text
Bottom Navigation
```
en navegación lateral o superior.
Desktop
Idealmente:
```text
┌──────────────┬─────────────────────────┐
│              │                         │
│   SIDEBAR    │       CONTENT           │
│              │                         │
│ HOME         │                         │
│ ARSENAL      │                         │
│ COMPARAR     │                         │
│ LEGALIDAD    │                         │
│ MÁS          │                         │
│              │                         │
└──────────────┴─────────────────────────┘
```
---
31. Arquitectura de datos recomendada
El frontend no debe tener datos de armas hardcodeados.
Crear entidades:
```text
Weapon
Manufacturer
Caliber
Ammunition
Accessory
TraumaticWeapon
LegalDocument
LegalRequirement
Article
FAQ
```
Relaciones:
```text
Weapon
 ├── Manufacturer
 ├── Caliber
 ├── Ammunition
 ├── Categories
 ├── Images
 ├── Specifications
 └── LegalReferences
```
Y:
```text
Caliber
 ├── Weapons
 └── Ammunition
```
Esto permitirá que Arsenal, Comparar y Buscar utilicen la misma fuente de datos.
---
32. Búsqueda global
Debe ser una de las funciones centrales.
Cuando el usuario escribe:
> AK
debería devolver:
```text
ARMAS
AK-47
AKM
AK-74

CALIBRES
7.62×39 mm
5.45×39 mm

FABRICANTES
Kalashnikov
...
```
Los resultados deben clasificarse por tipo.
---
33. Estados de UI
El agente debe implementar explícitamente:
Loading
Skeletons.
Empty
```text
NO ENCONTRAMOS RESULTADOS

Prueba con otro término.
```
Error
```text
NO FUE POSIBLE CARGAR EL CONTENIDO

[REINTENTAR]
```
Offline
```text
SIN CONEXIÓN

Algunos contenidos pueden no estar disponibles.
```
Actualización
Mostrar:
```text
Actualizado:
31 AGO 2026
```
cuando exista fecha real.
---
34. Principio rector del diseño
La aplicación no debe parecer una app retro.
Debe parecer:
> **una app moderna que utiliza el lenguaje gráfico de la burocracia y tecnología mexicana de los 80/90.**
La diferencia es importante.
La interfaz final debe tener:
2026 en UX + 1980/90 en dirección de arte.
El mockup visual sirve como dirección de arte. Esta especificación funciona como fuente de verdad funcional y de arquitectura de interfaz.
---
35. Criterios de implementación para el agente de código
Prioridad 1 — Sistema de diseño
Antes de crear todas las páginas:
Definir tokens de color.
Definir tipografía.
Definir spacing.
Definir border radius.
Definir sombras.
Definir iconografía.
Crear componentes base.
Prioridad 2 — Shell de aplicación
Implementar:
AppShell.
Header.
Navegación móvil.
Navegación desktop.
Menú MÁS.
Responsive layout.
Prioridad 3 — Datos
Separar:
Datos.
Servicios/API.
Estado.
Componentes.
Presentación.
Evitar datos ficticios incrustados directamente en componentes de UI.
Prioridad 4 — Módulos
Orden recomendado:
```text
HOME
↓
ARSENAL
↓
FICHA DE ARMA
↓
COMPARAR
↓
LEGALIDAD
↓
CALIBRES
↓
MUNICIONES
↓
ACCESORIOS
↓
ARMAS TRAUMÁTICAS
↓
SOPORTE Y NORMAS
↓
FAQ
↓
ACERCA DE
↓
TUTORIAL
```
Prioridad 5 — Calidad
La aplicación debe cumplir:
Responsive real.
Accesibilidad básica.
Estados loading/error/empty.
Navegación consistente.
Componentes reutilizables.
Datos provenientes de backend.
URLs/rutas profundas para fichas.
SEO cuando se utilice web.
Buen rendimiento de imágenes.
Lazy loading para galerías.
Validación de contenido legal.
Fecha y fuente visibles en contenido normativo.
---
36. Regla final para el agente
No diseñar cada pantalla desde cero.
Construir/modificar primero un Design System de Armado en México y posteriormente ensamblar las pantallas a partir de los mismos componentes.
La aplicación debe transmitir:
ENCICLOPEDIA + ARCHIVO + TECNOLOGÍA + MÉXICO 80/90 + UI MODERNA
sin parecer una aplicación gubernamental oficial ni una interfaz retro.


### 4.1 Sitios, apps o piezas que te gustan y por qué


1.https://midu.dev/cursos En general el estilo de Midudev me gusta mucho, contornos suabes, buen manejo y contraste de colores, colores en sus fichas de Mensual trimestral, anual sin que saturen.
2.https://www.canirun.ai/ nuevamente una pagina de midudev y es que las funcionalidades que incluye esta web me gustan mucho, no tenemos un uso directo en armado en mexico para varias cosas pero son dignas de estudiarse. Sobre todo que nosotros no tenemos una buena forma de seleccionar que accesorios son de cada arma; en cambio canirun.ai utiliza diferentes metodos para asignar calificaciones y velocidades a cada modelo y cada cuantizacion. Te dejo el REPÖ de la web para que puedas estudiarlo y sacar un metodo directo para los accesorios. Que de hecho debería ser mucho más sencillo ya que lo que debemos buscar que haga match es el nombre del modelo del arma, no solo el calibre. https://github.com/midudev/canirun.ai


### 4.3 El elemento firma

> La pagina de arma de cada elemento debe ser preciosa, con un diseño tipo analógico que de la sensación de estar leyendo desde un folder. En escritorio aprovecharemos el ancho de la pagina para tener un folder extendido con la foto del arma del lazo izquierdo con un marco de polaroid y su precio de referencia y del lado derecho la ficha tecnica del arma.


### 4.4 Qué NO se toca

Logotipos de Armado en Mexico, Armas y MAs, Armas M&S, mi nombre: Saulo Flores Leon. Esto siempre debe ser igual. 
En el apartado legal debe de tocarse y modificarse unicamente si es que la ley ha cambiado, PROHIBIDO inventar leyes o articulos inexistentes, siempre deben estar respaldados por texto real de la ley. PROHIBIDO USAR INONOGRAFIA OFICIAL, ESCUDO MEXICANO O DE CUALQUIER OTRA FUERZA O INSTITUCION PUBLICA para evitar confusiones y problemas legales.
-

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
  cuadrado del radio, y son 322 páginas con muchas tarjetas.

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

---

## 6. Prohibiciones explícitas

Restricciones negativas: sin ellas el modelo vuelve al promedio.

- ❌ **Space Grotesk** — es el punto de convergencia documentado de la IA. Tampoco Inter ni Roboto.
- ❌ **Gradientes morado-azul**, cream `#F4F1EA` con serif display, emoji como iconos de sección.
- ❌ **El borde de 1px como recurso principal.** Si una caja necesita separarse, es superficie o sombra.
- ❌ **`backdrop-filter: blur()`** en cualquier cosa que haga scroll.
- ❌ **`box-shadow` con blur > 24px** en listas: el costo escala con el cuadrado del radio.
- ❌ **augmented-ui en la grilla.** Como recetario de `clip-path` para 3-6 elementos hero, sí; como
  librería en 322 tarjetas, no — crea un contexto de apilamiento por elemento.
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

1. **Nunca sobre las 322 páginas.** Se itera en una página de galería con todos los primitivos.
2. **Las primitivas antes que las pantallas.** Las ~15 de `ui.jsx` (`ArmaCard`, `FilterChip`,
   `AvailBadge`, `TacticalCorners`, `SectionHeader`, `PriceLevel`…) propagan solas a todo el sitio.
   Las pantallas solo las componen.
3. **La piel va al CSS, el layout se queda inline.** Una propiedad vive en un sitio o en el otro,
   nunca en los dos — si no, empieza la guerra de `!important`. Lo dinámico viaja como custom
   property: `style={{'--estado': color}}`.
4. **Antes de publicar:** las skills `verificar-app` y `fidelidad-diseno`, con capturas antes/después.
5. **Prueba de no-genérico.** Antes de dar por buena una pantalla, la pregunta es:
   *¿produciría esto mismo para cualquier catálogo oscuro?* Si la respuesta es sí, se revisa.

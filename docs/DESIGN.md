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

[Tipo ▾][Calibre ▾][Armería ▾] →
```
Filtros: los de §5.10 (16-sep-2026), que sustituyen al «FILTRAR que abre un bottom sheet» que pedía este brief.
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
Rediseño del 19-sep-2026: manual de convivencia vintage + formato de denuncia privada.

Concepto: archivo físico del sitio (papel oficio, carpetas manila, hojas siempre visibles).
Ancho aproximado: 920 px centrado. Papel fijo en tema oscuro. Breakpoint estructural: 1024 px (2 × 2 grid).
Clases CSS: `.amx-soporte-*` (portada, aviso, reglas, regla, carbon, formato).

Estructura:
- Portada: h1 Dymo, apertura y alcance.
- Aviso: prohibido comprar/vender (antes de las normas).
- Normas: cuatro hojas siempre visibles (no acordeones), 1 columna < 1024 px, 2 × 2 desde 1024 px.
- Moderación: copia al carbón + acciones reales.
- Denuncia: formulario privado con contexto de reseña (no persiste en localStorage, no va a URL).
- Directorio: clasificación, corrección pública vía GitHub Issues, fuentes aceptables, FAQ y Legalidad.

Diferencia entre denuncia privada y corrección pública:
- Denuncia: formulario en /soporte, solo backend escribe en D1, contexto en memoria React.
- Corrección: Issue Form público en GitHub, PR opcional posterior a revisión editorial.

ReportarError: primitiva reutilizable que aparece al final de arma, accesorio, munición, calibre, Legalidad y FAQ. NO en Inicio, Arsenal, Comparador, Más, Acerca, Tutorial ni Soporte.

Textos prohibidos (no afirmar): bloqueo inmediato, reporte a autoridades, 24/48 horas, te contamos en qué quedó.
Textos vigentes: opiniones negativas fundadas protegidas, fabricantes pueden corregir declarando relación.
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
> Plataforma divulgativa de código abierto. Tres sellos rojos: no pertenecemos al gobierno · no vendemos armas de fuego · no emitimos licencias ni permisos.
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

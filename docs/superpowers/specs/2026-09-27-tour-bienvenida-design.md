# Recorrido de bienvenida por el sitio — diseño

**Fecha:** 27-sep-2026 · **Rama:** `Opus-5/RED-tour-bienvenida` · **Para la 1.0.** Decidido con Saulo en cinco rondas;
notas completas en `Documentos de Proyecto\2026-09-28-tres-pendientes\entrevista-C.md` (fuera del repo).

## Qué es

Un recorrido guiado por páginas reales de armado.mx que enseña a quien llega por primera vez qué puede hacer y
dónde está cada cosa. Parte del tutorial de bienvenida que ya existe (`src/screens/screens-tutorial.jsx`): no se crea
otro. Los cuatro pasos del aviso legal **no cambian**: siguen obligatorios, sin SALTAR, solo al entrar por la
portada, y se repiten desde Más → «Ver tutorial».

## Decisiones

| Pieza | Decisión |
|---|---|
| Forma | **Sobre la web real**: navega por páginas de verdad; en cada parada atenúa la página, ilumina un apartado con el marco rojo y la cinta Dymo de los GIF del README y muestra una nota con «‹ Atrás · NN / 12 · Siguiente ›» |
| Arranque | **Se ofrece al final del aviso**: el paso 4 («Empieza a explorar») cambia «Continuar» por dos sellos, «Hacer el recorrido» y «Explorar por mi cuenta» |
| Salida | Se puede salir con «Salir», Escape o el botón atrás del navegador; el visitante se queda en la página donde estaba |
| Quién | Solo visitantes nuevos (los que ven el aviso por primera vez); el resto, desde Más → «Ver tutorial», que abre **lo mismo que la primera vez** (en la repetición Escape cierra el aviso, como hoy) |
| Página de fondo | **No responde** durante el recorrido; se avanza con la nota, las flechas del teclado o deslizando |
| Nota en móvil | **Fija abajo**, encima de la barra de navegación; el apartado se desplaza para quedar a la vista arriba de ella |
| Nota en escritorio | **Junto al apartado**, donde quepa, con una flecha que lo señala |
| Final | **Hoja «Listo»** con el sello de aprobado; «Empezar» vuelve a la portada |
| Arma de ejemplo | Glock 25 (la del README); comparador Glock 25 vs Glock 28 |
| Textos | Propuestos desde el README, corregidos y aprobados por Saulo (tabla de abajo) |

## Las 12 paradas

| # | Página | Cinta | Nota |
|---|---|---|---|
| 1 | `/arsenal` | POR ARMERÍA | El catálogo se reparte por armería: la OTCA (Coahuila, Nuevo León, San Luis Potosí y Tamaulipas) y la DCAM (el resto del país). La tarjeta de almacén dice cuántas armas tenía cada sucursal en su último inventario. |
| 2 | `/arsenal` | TIPO, USO Y CALIBRE | También puedes entrar por tipo de arma, por uso o por calibre. Cada entrada lleva al listado con su filtro ya puesto. |
| 3 | `/pistolas/glock-25` | PRECIO Y EXISTENCIAS | Cada arma tiene su ficha. El comprobante dice el precio oficial con IVA, la armería y la fecha del inventario; la tarjeta de almacén, cuántas piezas había en cada sucursal. |
| 4 | `/pistolas/glock-25` | CLASIFICACIÓN LEGAL | El sello dice si es de uso civil, de seguridad o exclusivo, y la hoja explica qué permiso hace falta y dónde se tramita. |
| 5 | `/pistolas/glock-25` | HISTORIAL DE PRECIOS | Cada inventario oficial deja un punto en el papel milimétrico: así ves cómo ha cambiado el precio. |
| 6 | `/pistolas/glock-25` | RECOMENDACIONES | ¿La recomiendas? Se contesta con un sello y una reseña de al menos 100 caracteres. Nada se publica sin que lo revise una persona. |
| 7 | `/pistolas/glock-25` | REPORTAR UN ERROR | Si ves un dato incorrecto, repórtalo: se abre un formulario público en GitHub con la ficha ya puesta. Cada corrección se revisa con sus fuentes. |
| 8 | `/comparar/glock-25-vs-glock-28` | COMPARADOR | Pon dos armas lado a lado. Arriba va lo que las distingue, con la mejor cifra rodeada en rojo. Se llena con la casilla «Comparar» de cada ficha. |
| 9 | `/legalidad` | LA ENTREVISTA | ¿Puedo comprar un arma? Contesta unas preguntas (ninguna pide datos personales) y llévate la lista de documentos que te corresponden. |
| 10 | `/legalidad` | EL MAPA DEL TRÁMITE | El camino completo, del permiso a la compra en la armería, en un solo mapa. |
| 11 | `/legalidad` | LO QUE DICE LA LEY | Lo que permite la ley, lo que cambia en tu estado y los trámites con sus costos. Cada afirmación lleva su fuente oficial al pie. |
| 12 | `/soporte` | NORMAS DE LA COMUNIDAD | Aquí no se compra ni se vende. Las normas rigen reseñas y reportes, y desde aquí puedes denunciar una reseña. |
| — | hoja final | LISTO | Ya conoces el sitio. Puedes repetir este recorrido desde Más → Ver tutorial. Sello «Aprobado» y botón «Empezar». |

Los apartados de cada parada (selectores) se fijan en el plan, medidos en armado.mx a 390 y 1280. Los que miden más
que la pantalla (el tablero de tipos del Arsenal, los folders y las fuentes de Legalidad) se encuadran solo en su
primera parte, como hacen los GIF del README.

## Diseño técnico

- **Código propio, sin dependencias.** Las librerías de recorridos (driver.js, Shepherd) resolverían el globo pero
  añaden una dependencia, no hablan el sistema visual (papel, Dymo, sellos) y la navegación entre páginas habría
  que hacerla igual. El foco es la técnica del GIF: un marco con `outline` y una sombra enorme que atenúa el resto.
- **`RecorridoSitio`** en `screens-tutorial.jsx` (junto al tutorial): capa que bloquea la página, marco, cinta Dymo
  y la nota en papel de oficio. La lista de paradas es un dato (`ruta`, apartado, cinta, nota).
- **`app.jsx`** guarda si el recorrido está abierto, navega entre páginas sin recargar y lo cierra con el botón atrás.
- **Nunca atrapa a nadie:** si el apartado de una parada no aparece en 4 s, la parada se salta; Escape, «Salir» y
  atrás cierran. El marco se recoloca al cambiar el tamaño de la ventana.
- **Accesibilidad:** la nota es un diálogo con el foco dentro; cada parada se anuncia («Parada 3 de 12: Precio y
  existencias»); botones de 44 px; sin animaciones con movimiento reducido; contraste medido en claro y oscuro.
- **Colores:** solo tokens existentes; el papel de la nota no sigue al tema (como todo papel del sitio).

## Cómo se comprueba

- Prueba: las 12 paradas apuntan a rutas del sitio y a clases que existen en el código.
- Sonda en navegador: visitante nuevo → aviso → «Hacer el recorrido» → las 12 paradas con el marco sobre su
  apartado → hoja «Listo» → portada; en 360, 390 y 1280, claro y oscuro. Además: «Salir» a mitad, Escape, atrás
  del navegador, una parada con el apartado ausente (se salta) y la repetición desde Más.
- El aviso legal sigue igual: obligatorio, solo desde la portada, Escape solo en la repetición.

## Fuera de alcance

Paradas de munición, accesorios, entrevista, calibres, preguntas frecuentes y buscador de la portada (Saulo no las
eligió). Cambiar los cuatro pasos del aviso legal más allá del sello del paso 4.

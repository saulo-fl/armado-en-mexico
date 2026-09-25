# Municiones — etiqueta de especificaciones y precio (24-sep-2026)

## Objetivo

Completar la migración visual de `/municiones` al aparador que ya usa
`/accesorios`: conservar toldo, separadores por calibre, mueble, mesa, fotos y
siluetas, pero sustituir el letrero amarillo de cada cartucho por la etiqueta de
cartón que ya aparece en «Munición y accesorios» dentro de la ficha de un arma.

La referencia vigente está en `src/screens/screens-2.jsx` y en las clases
`.amx-etiqueta*` de `src/styles/estilo.css`. No se diseña una tarjeta nueva.

## Resultado visible

- Cada caja o silueta permanece apoyada sobre la mesa.
- Debajo del frente de madera aparece una etiqueta de cartón claro, pegada con
  cinta canela y ligeramente girada, alineada con su producto.
- Desaparecen únicamente en `/municiones` el letrero amarillo y su vara. La luz
  suave de hover/foco detrás del producto se conserva.
- La etiqueta lleva exactamente tres niveles de información:

  1. Marca a la izquierda y condición legal a la derecha: `CIVIL`, `SEGURIDAD`
     o `EXCLUSIVO`, tomados de `window.SELLOS_LEGALES`.
  2. Tipo de bala y grano, unidos con ` · `. Si no hay grano, no se deja un
     separador vacío.
  3. `priceExact` sin el sufijo ` MXN`, seguido de `/ cartucho` o `/ caja` según
     `window.munUnidadPrecio(mun)`. Esto conserva el caso especial de la
     munición 2046, cotizada por caja.

- Si falta precio, la tercera línea no se pinta. No se inventan cifras ni textos
  sustitutos.
- El calibre sigue viviendo en la cinta Dymo de la sección; no se repite en la
  etiqueta.

## Alcance

Incluye solamente el listado `/municiones` que pinta `MunicionesScreen`.

Quedan fuera:

- Los puestos de Accesorios, que conservan su letrero amarillo.
- La sección de municiones de Home.
- La ficha individual de munición.
- La vitrina «Munición y accesorios» de la ficha de arma; es la referencia y no
  debe cambiar visualmente.
- Datos de catálogo, precios, inventarios, rutas, prerender y D1.

## Comportamiento y accesibilidad

- El botón existente de cada producto conserva la navegación a su ficha y el
  foco visible.
- La etiqueta visual lleva `aria-hidden="true"`; el `aria-label` del botón
  contiene nombre, condición legal, especificación y precio por unidad para no
  duplicar la lectura.
- La cuadrícula conserva 2 productos por fila bajo 720 px, 4 entre 720 y 1023
  px y 6 desde 1024 px.
- Las etiquetas de una fila ocupan un carril alineado con las mismas columnas.
  La altura la determina la etiqueta más larga de esa fila, evitando que la
  siguiente mesa la invada.
- En claro y oscuro la etiqueta sigue siendo un objeto físico claro con sus
  tintas fijas; no usa `PALETTE` ni `CLARO` dentro del papel.

## Criterios de aceptación

1. `/municiones` no contiene letreros amarillos ni varas sobre los productos.
2. Cada producto muestra marca, condición legal, bala/grano y precio/unidad con
   la misma piel de `.amx-etiqueta` que la vitrina de una ficha de arma.
3. La munición 2046 dice `/ caja`; las demás conservan su unidad real.
4. Accesorios y Home se ven igual que antes.
5. No hay solapamientos ni scroll horizontal ajeno a carruseles a 390, 720,
   1024 y 1440 px.
6. El foco de teclado sigue siendo visible y activa la luz del producto.
7. Pasan el test específico de mesa, el build, la auditoría de inventario, la
   auditoría de contraste y el smoke en Chrome.


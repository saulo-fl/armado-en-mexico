# Recorrido de bienvenida por el sitio — plan de implementación

> Para agentes: el código de cada tarea va LITERAL en los contratos de Qwen de la sesión
> (`Documentos de Proyecto\2026-09-28-tres-pendientes\qwen\K1…K15-recorrido.md`, fuera del repo), generados desde
> una versión de referencia ya compilada, probada y sondeada. El juez de cada contrato es un `diff` exacto contra el
> estado esperado (`qwen\r13\juez.mjs`); el informe del modelo no cuenta.

**Objetivo:** que quien llega por primera vez recorra doce apartados reales de armado.mx y sepa dónde está cada cosa.

**Arquitectura:** `RecorridoSitio` vive junto al tutorial en `src/screens/screens-tutorial.jsx`; `app.jsx` guarda si
está abierto y le da `irARuta`, que aplica una dirección con el mismo `amxParsePath` del botón atrás. Cada parada
navega, espera su apartado (4 s o se salta), lo lleva arriba y lo sigue midiendo; `colocarNota` (pura) decide dónde
van el marco y la nota.

**Tecnología:** React sin bundler (Babel → `out/`), CSS en `<style>` del componente como el resto del tutorial, sin
dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-09-27-tour-bienvenida-design.md`

## Restricciones globales

- Los cuatro pasos del aviso no cambian salvo el pie del paso 4: «Hacer el recorrido» / «Explorar por mi cuenta».
- Textos de las paradas: los de la tabla del spec, sin tocar.
- Solo tokens existentes; el papel de la nota no sigue al tema; foco visible con 3:1 o más sobre el papel.
- Botones de 44 px; sin animación con movimiento reducido; nada de dependencias.

## Foco de revisión

1. **El apartado de una parada no aparece** (clase renombrada, página cambiada): se salta a los 4 s. La prueba
   `recorrido.test.mjs` caza la clase y la ruta; la sonda fuerza un apartado ausente.
2. **Atrás del navegador a mitad**: cierra el recorrido y la app pinta la página anterior (sonda).
3. **La página se mueve después de llegar** (D1, fotos): se re-mide cada 250 ms y se vuelve a llevar el apartado
   si se sale de la franja visible (sonda: marco sobre el apartado tras 1.1 s).
4. **Teléfono chico (360×640)**: la nota fija abajo no tapa el marco y nada se sale de la nota (prueba + sonda).
5. **Repetición con una selección previa en el comparador**: al salir de la parada del comparador vuelve la
   selección del visitante (sonda: el comparador regresa a la dirección que traía).

## Tareas

### Tarea 1 — `src/app.jsx` (contrato K1)
Estado `recorrido`, `abrirRecorrido` (cierra el tutorial y guarda la selección del comparador), `irARuta(ruta)`;
`BottomNav` visible mientras dura; `onRecorrido` al tutorial y `<window.RecorridoSitio>` al final.

### Tarea 2 — el paso 4 del aviso (contrato K2)
Firma `OnboardingTutorial({ open, onClose, onRecorrido })`; el pie del último paso cambia «Continuar» por los dos
sellos; CSS `.tut-dos` y `.tut-sello--tinta`.

### Tarea 3 — `PARADAS`, `colocarNota` y `RecorridoSitio` (contratos K3–K12)
Se insertan en ocho trozos antes del cierre `})();`. Expone `RecorridoSitio.PARADAS` y `RecorridoSitio.colocarNota`
para la prueba.

### Tarea 4 — la prueba (contratos K13–K15)
`scripts/recorrido.test.mjs` y su entrada en `npm test`: doce paradas completas; cada ruta se lee y se reescribe
igual con el ruteo real (Glock 25 y Glock 25 vs 28); cada clase existe en el marcado de alguna pantalla; la nota no
tapa el marco ni se sale (lado, debajo, encima y móvil 360×640).

## Verificación

- Después de cada contrato: `node qwen/r13/juez.mjs K<n> <worktree>` → idéntico.
- Al final: `npm run build`, `npm test` y una mordida (romper una clase de `PARADAS` → la prueba falla).
- Sonda `qwen/sonda-recorrido.mjs` contra el build local: recorrido completo en 360×640, 390×844 y 1280×800, claro
  y oscuro; «Salir», Escape y atrás; parada sin apartado; repetición desde Más.

# Ficha de munición — el mismo expediente (26-sep-2026)

Decidido con Saulo pregunta por pregunta. Rama `Opus-5/RED-ficha-municion`, worktree
`repo/wt-ficha-municion`, sobre develop `080a4e4`.

## Objetivo

Que al abrir un cartucho (`/municiones/<slug>`, `MunicionFicha`) se vea el mismo expediente que el
arma y el accesorio (DESIGN.md §5.5 y §5.8). Sin datos nuevos inventados y sin perder ninguno de
los que hoy muestra la ficha.

## Decisiones de Saulo

1. **Réplica de la ficha de accesorio.** Mismo folder, mismos papeles, mismo reparto por filas
   desde 1024 px. La pestaña del folder dice **«Munición»**.
2. **Debajo del folder**, bajo cinta Dymo: **Armas compatibles** (todas, en expediente y sin ⇄),
   **Otras municiones** del mismo calibre (con `MunicionCard`) y **Opiniones** (nuevo).
3. **Legalidad:** solo el requisito que aplica a este cartucho, no el párrafo con los cuatro.
4. **.17 HMR:** sin requisito específico; solo la guía legal, hasta confirmarlo con la DCAM.

## El folder

- **Cabecera:** `mun.nombre` de título y la descripción debajo. Sin la línea a máquina: la
  referencia del inventario (`dcamRef`) ya sale en la tarjeta de almacén.
- **Copia con clip:** `ArmaPolaroid` con `pie="procedencia"` (bandera · marca · país) y el sello
  legal estampado. La foto es la caja (`mun.img`, las 102 la tienen). Si no carga, la silueta es
  `imagenes/silueta-municion.webp`, nunca la de un arma.
- **Ficha técnica:** `mun.specs` y el origen si no viene ya en ellas.
- **Talón:** sin casilla Comparar. Nueva prop `unidad` en `TalonComprobante`: la cabecera dice
  «Por cartucho · con IVA» (o «Por caja», munición 2046, vía `munUnidadPrecio`) y la barra fija
  del móvil pone `/ cartucho` tras la cifra. Arma y accesorio no pasan `unidad` y no cambian.
  Fijo en móvil como el arma, oculto si hay barra de comparación.
- **Tarjeta de almacén:** existencias por sucursal con la regla de `cotejo.js`. La munición
  usa la misma que el accesorio (existencias DCAM del registro del último inventario DCAM), con
  el nombre `amxInventarioMunicion`. Se borra el cálculo propio de la ficha.
- **Hojas — Compatibilidad · Legalidad**, abre Compatibilidad.
  - Compatibilidad: «Sirve a:» con las 6 primeras armas de `getArmasParaMunicion` y «Ver las
    N». Sin fichas: «Sirve a: armas calibre X (sin ficha en el Arsenal)». `HojaCompatibilidad`
    pasa de `screens-accesorios.jsx` a `ui.jsx`, compartida.
  - Legalidad: banda de clasificación, descripción de la disponibilidad, el requisito
    (`amxRequisitoMunicion`) si lo hay y el botón «§ Guía legal completa».
- **Papel milimétrico:** `HistorialPrecios`, como el accesorio.

## El requisito legal (`amxRequisitoMunicion(mun)` en `cotejo.js`)

Texto de la tabla de requisitos de la DCAM que hoy va entero en la ficha:

| Cartucho | Requisito |
|---|---|
| `avail === 'seguridad'` | ninguno (no es de venta civil) |
| `.17 HMR` | ninguno (decisión 4) |
| `tipo === 'escopeta'` | hoja de manifestación de registro del arma |
| calibre `.22 LR` o `.22 Short` | esa hoja, el Volante de Adquisición de Cartuchos del mes y la credencial vigente del club |
| resto (fuego central) | permiso extraordinario de adquisición vigente |

Todo requisito civil termina con «y una identificación oficial vigente».

## Fuera de alcance

El listado `/municiones` y sus etiquetas (plan del 24-sep), Home, datos, D1, precios, rutas y
prerender.

## Criterios de aceptación

1. `/municiones/<slug>` pinta el folder manila con pestaña «Munición», como el accesorio.
2. No se pierde ningún dato: precio, fuente, referencia, existencias por sucursal, historial
   con PDF, nivel de precio, clasificación legal, compatibles y del mismo calibre.
3. La 2046 dice «Por caja»; la 2005 «Por cartucho».
4. Legalidad muestra un solo requisito, o ninguno en seguridad y .17 HMR.
5. Opiniones funciona con `tipo="municion"`.
6. Arma y accesorio se ven igual que antes.
7. `npm test` (con prueba nueva de `amxRequisitoMunicion` y `amxInventarioMunicion`), build,
   `auditar.js` y `contraste.mjs` limpios; Chrome a 390 y 1440 px en claro y oscuro con la
   2005, la 2046 y un cartucho de seguridad.

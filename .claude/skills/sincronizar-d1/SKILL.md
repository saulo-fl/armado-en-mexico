---
name: sincronizar-d1
description: Resiembra los dominios de D1 (armas, pages) desde el código de "Armado en México". Úsalo SIEMPRE después de publicar un cambio en data.js o en DEFAULT_PAGES de store.js, y cuando algo esté corregido en el repo pero siga mal en armado.mx. D1 PISA a los seeds al hidratar: sin este paso el cambio no lo ve nadie que ya haya visitado el sitio.
---

# Sincronizar D1 — Armado en México

## La trampa, en una frase

**El código no es lo que ve el visitante.** `store.js` hidrata desde
`GET /api/state` y el catálogo guardado en D1 **sustituye** a `window.DB`
(`store.js:253-267`, y lo mismo al hidratar en `:238`). Publicar un cambio en
`data.js` o en `DEFAULT_PAGES` alcanza solo a quien nunca haya entrado.

Ya mordió tres veces: el texto «sede Monterrey» del FAQ (25-ago), las trece
armas del inventario del 6-jul que estuvieron invisibles siete semanas, y las
rutas de foto del piloto de pistolas.

## Uso

```bash
# compara y enseña el diff — no toca nada
node .claude/skills/sincronizar-d1/scripts/resembrar.js armas
node .claude/skills/sincronizar-d1/scripts/resembrar.js pages

# escribe en D1
node .claude/skills/sincronizar-d1/scripts/resembrar.js armas --aplicar
```

Requiere wrangler autenticado (`npx wrangler whoami`). **`--aplicar` escribe en la
D1 de producción** —la misma que usan los previews—: se pide al usuario SIEMPRE,
y el guardia del arnés (`.claude/hooks/guardia.mjs`) lo convierte en pregunta
aunque algo lo autorice.

## Por qué NO se usa el botón del admin

Admin → Configuración → «Sincronizar todo al servidor» sube **lo que tenga el
navegador en `localStorage`** — que es justo el catálogo viejo que le sirvió D1.
En agosto de 2026, pulsarlo habría escrito 179 armas sobre las 192 del código y
**consolidado la pérdida** de trece fichas. El script parte del código, que es
la fuente de verdad.

El botón sigue siendo válido para subir ediciones hechas *desde* el admin. La
regla: si el cambio viene del **código**, este script; si viene del **panel**, el
botón.

## Antes de aplicar, mira el aviso de ids

El script avisa de los ids que están **solo en D1**: pueden ser altas hechas
desde el admin que no existen en `data.js`, y resembrar las borraría. Si aparece
ese aviso, para y decide; no lo ignores.

## Comprobado, no supuesto

- La escritura es **un solo `UPDATE` parametrizado** contra la API de consultas de
  D1, con el token de `wrangler auth token`. Con el JSON dentro del SQL daba
  **`SQLITE_TOOBIG`** (~188 KB) y había que trocearlo sobre una fila temporal; como
  parámetro entra entero (medidos 220 KB) y el `UPDATE` es atómico por sí mismo.
- Las armas sin foto se guardan con `img: ''` en vez del data-URI del
  placeholder. Son ~900 B × 68 armas que viajarían en **cada** `GET /api/state`
  de **cada** visitante; el cliente repone el placeholder solo.

## Sondas

```bash
curl -s https://armado.mx/api/state | grep -c "sede Monterrey"   # debe dar 0
curl -s https://armado.mx/api/state | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log('armas:',JSON.parse(s).armas.length))"
```

La prueba de verdad es como visitante: abrir armado.mx, `localStorage.clear()`,
recargar y contar `window.DB.length`. La API puede estar bien y el cliente no.

## Bitácora

- **2026-08-27** — primer uso. `armas` llevaba congelado desde el 25-ago: 179
  fichas en vez de 192, «DCAM Monterrey» en 117 armas, 113 precios anteriores al
  inventario del 6-jul. `pages` igual, con el FAQ y el paso del trámite. Ambos
  resembrados y verificados. D1 bajó de 221.7 KB a 187.6 KB al quitar los
  data-URI.
- **2026-09-12** — el resumen de `resembrar.js` solo enseña tamaños y conteos.
  Cuando dice «Difieren» y la diferencia no cuadra con lo publicado (hoy 1.8 KB
  frente a tres `?v=2`), **compara campo a campo antes de `--aplicar`**: carga
  `src/data/data.js` con la misma transformación del script y cruza por `id`
  contra `/api/state`. Salieron 62 armas con `img: ""` en D1 que en el código ya
  llevan `imagenes/silueta-*.webp`, más las 3 fotos; ningún otro campo. Sin ese
  cruce no se sabe si resembrar pisa ediciones hechas desde el admin.

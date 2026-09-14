---
name: verificar-app
description: Verifica la integridad de "Armado en México" antes de commitear/publicar. Úsalo tras editar cualquier .jsx o data-*.js — transpila todos los JSX (Babel standalone), carga los data-*.js en Node y valida invariantes (priceExact == último registro del historial, ids contiguos, existencias, historiales cronológicos, sucursales). SIEMPRE córrelo antes de un commit que toque datos o pantallas.
---

# Verificar app (checklist obligatorio antes de publicar)

Los `.jsx` se precompilan a `.js` con Babel CLI y el navegador recibe JS plano.
Un error de sintaxis en un `.jsx` rompe la app en producción sin que ningún test lo
atrape, así que la verificación es manual pero automatizable.

## Rápido (dos órdenes)
```bash
npm run build                                              # .jsx -> .js  +  prerender de las 321 páginas, todo a out/
node .claude/skills/conciliar-inventario/scripts/auditar.js
```
Si `npm run build` falla, NO sigas: el deploy publicaría HTML apuntando a `.js`
que no existen. Corre `npm install` primero si no hay `node_modules/`.

`build:html` (prerender) falla a propósito si `index.html` cambió de forma. Tras
tocar datos o pantallas, comprueba también el recuento que imprime (321 páginas /
317 URLs en sitemap, a 12-sep-2026) y que `out/sitemap.xml` y `out/robots.txt` se
regeneraron.
Debe terminar en `✔✔ AUDITORÍA SIN HALLAZGOS` (sale con código !=0 si falla). Cubre:
- Todos los `.jsx` transpilan con `@babel/standalone`.
- Los `data-*.js` cargan juntos en Node (shim de `window`).
- `priceExact == último registro del historial` para las 192 armas.
- ids contiguos, existencias > 0, historiales cronológicos, conteo por sucursal.

## Transpilar un archivo suelto (al iterar una pantalla)
```bash
node -e 'const B=require("./node_modules/@babel/standalone/babel.js");const fs=require("fs");B.transform(fs.readFileSync("src/screens/screens-1.jsx","utf8"),{presets:["react"],filename:"screens-1.jsx"});console.log("OK")'
```

## Reglas
- No commitees si `npm run build` o la auditoría fallan.
- Los `.js` generados están en `.gitignore` — si aparecen en `git status`, algo se
  salió del patrón: revísalo antes de commitear.
- `auditar.js` **sí** sale con código 1 si hay hallazgos, así que sirve como puerta
  automática. Pero **no midas el código tras un pipe**: `node auditar.js | tail; echo $?`
  devuelve el de `tail` (siempre 0) y parece que la auditoría pasó. Usa
  `node auditar.js` a secas, o `set -o pipefail`.
- Si tocaste lógica de precios/existencias, además SIMULA a mano un par de casos
  (presente, agotado, solo-OTCA, ficha nueva) cargando los datos en Node.
- No puedes abrir un navegador real (sin red para unpkg): la transpilación + carga
  en Node es el sustituto. No inventes "lo probé en el navegador".

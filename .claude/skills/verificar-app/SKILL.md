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
npm run build                                              # los .jsx -> .js
node .claude/skills/conciliar-inventario/scripts/auditar.js
```
Si `npm run build` falla, NO sigas: el deploy publicaría HTML apuntando a `.js`
que no existen. Corre `npm install` primero si no hay `node_modules/`.
Debe terminar en `✔✔ AUDITORÍA SIN HALLAZGOS` (sale con código !=0 si falla). Cubre:
- Todos los `.jsx` transpilan con `@babel/standalone`.
- Los `data-*.js` cargan juntos en Node (shim de `window`).
- `priceExact == último registro del historial` para las 168 armas.
- ids contiguos, existencias > 0, historiales cronológicos, conteo por sucursal.

## Transpilar un archivo suelto (al iterar una pantalla)
```bash
node -e 'const B=require("./node_modules/@babel/standalone/babel.js");const fs=require("fs");B.transform(fs.readFileSync("screens-1.jsx","utf8"),{presets:["react"],filename:"screens-1.jsx"});console.log("OK")'
```

## Reglas
- No commitees si `npm run build` o la auditoría fallan.
- Los `.js` generados están en `.gitignore` — si aparecen en `git status`, algo se
  salió del patrón: revísalo antes de commitear.
- OJO: hoy `auditar.js` imprime los hallazgos pero **sale con código 0 igualmente**,
  así que no sirve como puerta automática en CI. Lee su salida.
- Si tocaste lógica de precios/existencias, además SIMULA a mano un par de casos
  (presente, agotado, solo-OTCA, ficha nueva) cargando los datos en Node.
- No puedes abrir un navegador real (sin red para unpkg): la transpilación + carga
  en Node es el sustituto. No inventes "lo probé en el navegador".

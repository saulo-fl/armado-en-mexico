# CLAUDE.md — Instrucciones para Claude Code (Armado en México)

Este directorio es el contenido COMPLETO del repositorio `armado-en-mexico`.
Es una app estática (HTML + JSX transpilado en navegador, sin build step).

## Tarea actual: publicar esta iteración como BRANCH

Esta carpeta contiene una **iteración de UI/UX ya aplicada** sobre la app
(detalle completo en `CHANGES.md`). Tu trabajo es publicarla como rama y abrir PR
— **no modificar el código**.

### Si el repo YA existe (caso esperado)

```bash
# dentro de una copia clonada del repo
git checkout -b feature/ui-accesibilidad-fichas
# reemplaza el contenido del repo con el de este zip (respetando .git/)
rsync -a --delete --exclude '.git' <carpeta-de-este-zip>/ .
git add -A
git commit -m "UI: fichas horizontales estandarizadas, accesibilidad tipográfica y carruseles con swipe"
git push -u origin feature/ui-accesibilidad-fichas
gh pr create --fill --title "UI: fichas horizontales + accesibilidad" --body-file CHANGES.md
```

### Si el repo NO existe (primer deploy)

```bash
git init -b main
git add -A
git commit -m "Primer deploy: Armado en México (app + admin + demo Shopify)"
gh repo create armado-en-mexico --public --source . --push
gh api -X POST "repos/{owner}/armado-en-mexico/pages" \
  -f "source[branch]=main" -f "source[path]=/"
```

### Verificación del deploy / preview

- `https://<OWNER>.github.io/armado-en-mexico/` → app principal (splash "CARGANDO ARSENAL…" y luego la home)
- `.../admin.html` → panel de administración
- `.../shopify-demo.html` → demo de la sección Shopify
- Consola sin 404 de `imagenes/`, `logo.png` ni de los `.jsx`
- Smoke test visual (ver `CHANGES.md` § Verificación): fichas horizontales, badges
  CIVIL en verde, carruseles con arrastre y sin flechas

## Reglas importantes

- **No renombres archivos ni rutas**: `index.html`, `admin.html` y `shopify-demo.html` cargan los `.js`/`.jsx` y `imagenes/` por ruta relativa.
- **No elimines `.nojekyll`** — evita que Jekyll interfiera con el servido de archivos.
- **No "compiles" los `.jsx`**: se transpilan en el navegador con Babel standalone a propósito. La precompilación es una mejora futura opcional, no parte de este deploy.
- Los scripts de React/Babel vienen de unpkg con hashes `integrity` fijados — no cambies las versiones.
- La carpeta `shopify/` no es parte de la web servida: contiene la sección Liquid instalable en el tema de Shopify de armasmys.com (instrucciones en `shopify/INSTALL.md`). Déjala en el repo como fuente de verdad.
- La barra "◉ DEBUG" (abajo-izquierda) es una herramienta de desarrollo intencional; no la quites.
- `logo.png` es un **borrador** del logo — se reemplazará por la versión final más adelante (mismo nombre de archivo).

## Limitación conocida (documentar, no arreglar ahora)

El "backend" (`store.js` + `admin.html`) persiste en `localStorage`: la curaduría del admin solo vive en el navegador donde se hizo. Para compartir catálogo curado entre visitantes hará falta un backend real (API + DB) en una fase posterior.

## Mejoras futuras opcionales (NO hacer ahora)

- GitHub Action que precompile los `.jsx` con Babel CLI y sirva JS plano (quita ~1-2 s de arranque).
- Cambiar React development → production builds.
- Convertir `imagenes/` a WebP uniformes con tamaños responsivos (hoy son mezcla de jpg/png/webp con relaciones de aspecto heterogéneas; las fichas las muestran con `object-fit: contain`).

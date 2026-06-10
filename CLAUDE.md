# CLAUDE.md — Instrucciones de deploy (Armado en México)

## Tarea: primer deploy a GitHub Pages

Este directorio es el contenido COMPLETO del repositorio `armado-en-mexico`.
Es una app estática (HTML + JS, sin build step). Tu trabajo es publicarla, no modificarla.

### Pasos

1. **Inicializa el repo y haz el primer commit** (si no existe ya `.git`):
   ```bash
   git init -b main
   git add -A
   git commit -m "Primer deploy: Armado en México (app + admin + demo Shopify)"
   ```

2. **Crea el repositorio remoto y haz push** (usa `gh` si está disponible):
   ```bash
   gh repo create armado-en-mexico --public --source . --push
   ```
   Si el repo ya existe en la cuenta del usuario:
   ```bash
   git remote add origin https://github.com/<OWNER>/armado-en-mexico.git
   git push -u origin main
   ```

3. **Activa GitHub Pages** sirviendo la rama `main` desde la raíz:
   ```bash
   gh api -X POST "repos/{owner}/armado-en-mexico/pages" \
     -f "source[branch]=main" -f "source[path]=/"
   ```
   (Si responde 409, Pages ya está activo; usa `-X PUT .../pages` para actualizar la fuente.)

4. **Verifica el deploy** (puede tardar 1–2 min en propagarse):
   - `https://<OWNER>.github.io/armado-en-mexico/` → app principal (debe verse el splash "CARGANDO ARSENAL…" y luego la home)
   - `.../admin.html` → panel de administración
   - `.../shopify-demo.html` → demo de la sección Shopify
   - Comprueba en consola que no haya 404 de `imagenes/` ni de los `.jsx`.

### Reglas importantes

- **No renombres archivos ni rutas**: `index.html`, `admin.html` y `shopify-demo.html` cargan los `.js`/`.jsx` y `imagenes/` por ruta relativa.
- **No elimines `.nojekyll`** — evita que Jekyll interfiera con el servido de archivos.
- **No "compiles" los `.jsx`**: se transpilan en el navegador con Babel standalone a propósito. La precompilación es una mejora futura opcional (ver abajo), no parte de este deploy.
- Los scripts de React/Babel vienen de unpkg con hashes `integrity` fijados — no cambies las versiones.
- La carpeta `shopify/` no es parte de la web servida: contiene la sección Liquid instalable en el tema de Shopify de armasmys.com (instrucciones en `shopify/INSTALL.md`). Déjala en el repo como fuente de verdad.
- La barra "◉ DEBUG" (abajo-izquierda) es una herramienta de desarrollo intencional; no la quites en este deploy.

### Limitación conocida (documentar, no arreglar ahora)

El "backend" (`store.js` + `admin.html`) persiste en `localStorage`: la curaduría del admin solo vive en el navegador donde se hizo. Para compartir catálogo curado entre visitantes hará falta un backend real (API + DB) en una fase posterior.

### Mejoras futuras opcionales (NO hacer en el primer deploy)

- GitHub Action que precompile los `.jsx` con Babel CLI y sirva JS plano (quita ~1-2 s de arranque).
- Cambiar React development → production builds.
- Convertir `imagenes/` a WebP uniformes con tamaños responsivos.

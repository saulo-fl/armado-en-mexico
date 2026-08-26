# Armado en México — Enciclopedia táctica

Enciclopedia divulgativa de armas legales en México (DCAM · SEDENA), por **Armas M&S**.
App 100% estática del lado del cliente — no requiere backend ni build step.

## Ramas de la app

| Página | URL en Pages | Descripción |
|---|---|---|
| `index.html` | `/` | App principal — catálogo, comparador, legalidad, calibres, campos, cursos. Responsive escritorio + móvil. |
| `admin.html` | `/admin.html` | Panel de administración — edición del catálogo, cola de propuestas, favoritos. |
| `shopify-demo.html` | `/shopify-demo.html` | Demo de la sección embebible para armasmys.com (la versión instalable real está en `shopify/`). |

## Estructura

```
index.html            ← app principal (monta React)
admin.html            ← panel de edición
shopify-demo.html     ← demo de la sección Shopify
data.js / data-extra.js  ← catálogo seed (111 armas) y datos auxiliares
store.js              ← persistencia (localStorage) compartida app ↔ admin
ui.jsx                ← componentes compartidos (paleta, nav, cards)
screens-1/2/3.jsx     ← pantallas (home, catálogo, ficha, comparador, etc.)
app.jsx               ← router + estado raíz
admin.jsx             ← panel de administración
tweaks-panel.jsx      ← panel de ajustes de diseño
dev-viewport.js       ← barra DEBUG (AUTO / MÓVIL / ESCRIT.) en las 3 páginas
imagenes/             ← 111 fotos del catálogo
shopify/              ← sección Liquid instalable + catálogo JSON + INSTALL.md
```

## Notas técnicas

- **Un solo paso de build**: los `.jsx` se precompilan a `.js` con Babel CLI (`npm run build`); el navegador recibe JS plano. No hay bundler ni módulos: los archivos siguen comunicándose por `window.*` y el orden de los `<script>` sigue importando. React 18.3.1 vía unpkg con hashes de integridad.
- **Los `.js` generados no se commitean** (están en `.gitignore`): los produce el build de Cloudflare Pages en cada deploy. La fuente son los `.jsx`.
- **Datos**: el catálogo curado vive en `localStorage` por navegador y, cuando está aprovisionado el **backend compartido** (Cloudflare Pages Functions + D1), se replica al servidor para que todos los visitantes vean lo mismo. La app funciona igual sin backend (modo offline con seeds). Detalle y alta en **`BACKEND.md`**.
- **Desarrollo local**: instala (`npm install`), compila (`npm run build`, o `npm run watch` para recompilar al guardar) y sirve por HTTP:
  ```bash
  npx serve .        # o: python3 -m http.server 8080
  ```
- **Paleta de marca** (Armas M&S): Negro Carbón `#1A1A1A` · Amarillo Táctica `#F5C518` · Rojo Alerta `#C0392B` · Gris Oscuro `#2C2C2C` · Gris Medio `#555555`.

## Deploy

Pensada para **GitHub Pages** (rama `main`, raíz). Ver `CLAUDE.md` para los pasos automatizados.

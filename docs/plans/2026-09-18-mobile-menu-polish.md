# Rediseño menú MÁS (móvil) + corrección de overflow — Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar el menú desplegable de MÁS en la versión móvil con el estilo vintage «Documento Oficial Mexicano» que domina en la página (folders manila, polaroids, sellos, tipografía monoespaciada), pulir la barra inferior, y corregir los bugs de overflow horizontal que permiten mover la página fuera de la pantalla.

**Architecture:** El menú MÁS (`MenuScreen` en `src/screens/screens-2.jsx`) actualmente usa tarjetas blancas planas con `PALETTE.bgCard` que rompen con la estética vintage del resto del sitio (folders manila, sellos, fichas de biblioteca). Se rediseñará para que parezca un índice de carpetas de archivero / legajo abierto, reutilizando los tokens `--manila-*`, `--carton-*`, `--sello-*` y la tipografía monoespaciada (`JetBrains Mono`) que ya existen en el sistema de diseño. Los bugs de overflow se resolverán con CSS defensivo a nivel global y correcciones puntuales en los componentes que desbordan.

**Tech Stack:** React (UMD, sin bundler) · CSS en `src/styles/estilo.css` · JSX con estilos inline compilados por Babel · Tokens de diseño en `:root`

**Spec:** `docs/DESIGN.md` (dirección de arte §3-§4), `src/styles/estilo.css` (tokens de diseño)

## Global Constraints

- No hay bundler: los `.jsx` se compilan con Babel a `.js`, los archivos se comunican por `window.*`.
- `estilo.css` es la fuente de tokens; los colores en los componentes usan `PALETTE.*` o `var(--token)`.
- Seguir DESIGN.md §4: "el estilo ochentero debe estar en el lenguaje visual, no mediante filtros de imagen envejecidos" — geometría, no filtros.
- Seguir DESIGN.md §6: no animar nada que no sea opacity/transform; no usar `!important`.
- Una propiedad vive en CSS **O** en inline, nunca en las dos (regla del encabezado de `estilo.css`).
- Verificar con `node .claude/skills/conciliar-inventario/scripts/auditar.js` antes de cada commit.
- Los bordes `border-radius: 0` en los elementos vintage (sellos, fichas, folders). Los elementos modernos de UI pueden tener bordes redondeados.
- Respetar safe-area-inset para la barra inferior (iPhone notch/home indicator).

---

### Task 1: Corregir overflow horizontal global (bug de scroll lateral)

**Problema observado:** En móvil la página se puede arrastrar horizontalmente, mostrando contenido fuera de la pantalla (imágenes 4-7 del reporte). El `body` ya tiene `overflow-x: hidden` en `index.html`, pero algunos elementos hijos desbordan igualmente.

**Files:**
- Modify: `src/pages/index.html` (CSS del `<style>` en el `<head>`)
- Modify: `src/styles/estilo.css` (reglas defensivas para móvil)
- Modify: `src/screens/screens-3.jsx` (pestañas de calibres que desbordan)

**Interfaces:**
- Consumes: nada
- Produces: viewport bloqueado horizontalmente — ningún contenido puede causar scroll horizontal en la app

- [ ] **Step 1: Añadir `overflow-x: hidden` al `#app-root` como defensa en profundidad**

En `src/pages/index.html`, dentro del bloque `<style>`, el `#app-root` ya existe (línea ~110). Añadirle `overflow-x: hidden` para que cualquier hijo que desborde quede recortado antes de llegar al `body`:

```css
#app-root {
  position: relative; z-index: 1;
  min-height: 100vh;
  min-height: -webkit-fill-available;
  overflow-x: hidden;  /* NUEVO: defensa contra hijos que desbordan */
}
```

- [ ] **Step 2: Añadir `max-width: 100vw` y `overflow-x: clip` al scroll body en `app.jsx`**

En `src/app.jsx`, el div del "Scroll body" (línea ~489) controla el contenido de cada pantalla. Añadir defensas:

```jsx
<div ref={scrollRef} style={{
  flex: 1, minHeight: 0,
  overflowY: vp.isMobile ? 'auto' : 'visible',
  overflowX: 'hidden',       // NUEVO
  WebkitOverflowScrolling: 'touch',
  maxWidth: '100vw',         // NUEVO
}}>
```

- [ ] **Step 3: Corregir las pestañas de CalibresScreen que desbordan**

En `src/screens/screens-3.jsx` línea 113, el contenedor de pestañas ya tiene `overflowX: 'auto'` y la clase `amx-hscroll`, pero las pestañas con texto largo como "PERCUSIÓN CENTRAL" se cortan. El problema es que el `div` padre del screen (línea 105) tiene `width: '100%'` pero no `overflow: hidden`. Añadir `overflow: hidden` al contenedor padre:

```jsx
<div style={{ padding: `20px ${padX}px 90px`, maxWidth: 1100, margin: '0 auto', width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
```

- [ ] **Step 4: Añadir regla CSS defensiva global para móvil**

En `src/styles/estilo.css`, al inicio del archivo (después de los tokens, antes de los componentes), añadir:

```css
/* ── DEFENSA CONTRA DESBORDE HORIZONTAL en móvil ──────────────────────── */
@media (max-width: 719px) {
  .amx-v2 { max-width: 100vw; overflow-x: hidden; }
}
```

- [ ] **Step 5: Verificar y commit**

```bash
npm run build
node .claude/skills/conciliar-inventario/scripts/auditar.js
git add src/pages/index.html src/app.jsx src/screens/screens-3.jsx src/styles/estilo.css
git commit -m "fix: bloquear overflow horizontal en móvil — defensa en profundidad"
```

---

### Task 2: Rediseñar MenuScreen con estética vintage «legajo de archivero»

**Concepto de diseño:** El menú MÁS pasa de ser una lista de tarjetas planas blancas a ser un **legajo abierto** / índice de archivero. Cada entrada es una pestaña de ficha de archivo (como las que asoman de un folder manila), con:
- Fondo en color manila/cartulina (`var(--ficha)` / `var(--manila-medido)`)
- Tipografía mecanografiada (`JetBrains Mono`)
- Iconos como sellos/marcas de archivo en lugar de glifos sueltos
- Separador visual tipo ficha de biblioteca con una línea horizontal azul pálida
- El ítem activo/accent (Armas Traumáticas) lleva un sello rojo tipo `EXCLUSIVO`

**Files:**
- Modify: `src/screens/screens-2.jsx` (líneas 1240-1317, `MenuScreen`)
- Modify: `src/styles/estilo.css` (nuevas clases `.amx-menu-*`)

**Interfaces:**
- Consumes: tokens de `estilo.css` (`--manila-*`, `--ficha*`, `--sello-*`, `--carton-*`), componente `window.amxProsa()`
- Produces: `MenuScreen` rediseñado con el mismo API (props `onNav`, `onTutorial`)

- [ ] **Step 1: Definir las clases CSS del menú vintage en `estilo.css`**

Añadir al final de `estilo.css` (antes de cualquier `@media` final) un nuevo bloque:

```css
/* ══════════════════════════════════════════════════════════════════════════
   MENÚ MÁS — legajo de archivero / índice de fichas
   Cada entrada es una pestaña que asoma de un folder, con tipografía
   mecanografiada y la estética de «Documento Oficial Mexicano» (§3 DESIGN.md).
   ══════════════════════════════════════════════════════════════════════════ */

.amx-v2 .amx-menu {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0;
  margin: 0;
  list-style: none;
}

/* Cada ficha del índice */
.amx-v2 .amx-menu-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--e4);
  padding: 14px 16px;
  background: var(--ficha);
  border: none;
  border-left: 3px solid var(--hair);
  cursor: pointer;
  text-align: left;
  width: 100%;
  font-family: inherit;
  transition: none;  /* §6: no animar */
}

.amx-v2 .amx-menu-item:hover {
  border-left-color: var(--acento);
}

.amx-v2 .amx-menu-item:focus-visible {
  outline: 2px solid var(--acento);
  outline-offset: -2px;
}

/* Ítem deshabilitado (próximamente) */
.amx-v2 .amx-menu-item[disabled] {
  opacity: .5;
  cursor: default;
}
.amx-v2 .amx-menu-item[disabled]:hover {
  border-left-color: var(--hair);
}

/* El icono: cuadrado de sello */
.amx-v2 .amx-menu-icono {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--mono);
  font-size: 18px;
  color: var(--ficha-tinta-2);
  border: 1.5px solid var(--ficha-tinta-2);
  border-radius: 0;
}

/* Acento: el borde izquierdo y el icono en rojo sello */
.amx-v2 .amx-menu-item--accent {
  border-left-color: var(--sello-restr);
}
.amx-v2 .amx-menu-item--accent .amx-menu-icono {
  color: var(--sello-restr);
  border-color: var(--sello-restr);
}

/* Texto */
.amx-v2 .amx-menu-titulo {
  font-family: var(--mono);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--ficha-tinta);
}

.amx-v2 .amx-menu-desc {
  font-family: 'Archivo', system-ui, sans-serif;
  font-size: 13.5px;
  line-height: 1.4;
  color: var(--ficha-tinta-2);
  margin-top: 2px;
}

/* Flecha de la ficha — como una anotación al margen */
.amx-v2 .amx-menu-flecha {
  flex-shrink: 0;
  margin-left: auto;
  font-family: var(--mono);
  font-size: 16px;
  color: var(--ficha-tinta-2);
}

/* Separadores entre grupos: la raya azul de la ficha de biblioteca */
.amx-v2 .amx-menu-sep {
  height: 0;
  border: none;
  border-top: 1px dashed var(--hair);
  margin: 6px 0;
}

/* El crédito de pie */
.amx-v2 .amx-menu-pie {
  margin-top: 24px;
  padding: 14px;
  background: var(--ficha);
  border: 1px dashed var(--hair);
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .1em;
  color: var(--ficha-tinta-2);
  line-height: 1.6;
}
.amx-v2 .amx-menu-pie strong {
  display: block;
  color: var(--acento);
  font-weight: 700;
  letter-spacing: .15em;
  margin-bottom: 4px;
  font-size: 13px;
}

/* Responsive: en móvil estrecho, reducir el gap y el icono */
@media (max-width: 399px) {
  .amx-v2 .amx-menu-item { gap: var(--e3); padding: 12px 12px; }
  .amx-v2 .amx-menu-icono { width: 30px; height: 30px; font-size: 15px; }
  .amx-v2 .amx-menu-titulo { font-size: 13px; }
  .amx-v2 .amx-menu-desc { font-size: 12.5px; }
}
```

- [ ] **Step 2: Reescribir el JSX de `MenuScreen`**

En `src/screens/screens-2.jsx`, reemplazar la función `MenuScreen` completa (líneas 1240-1317) por:

```jsx
function MenuScreen({ onNav, onTutorial }) {
  const vp = window.useViewport();
  const padX = vp.isDesktop ? 28 : 16;

  const items = [
    { id: 'traumaticas', icon: '◎', title: 'Armas traumáticas', desc: 'Defensa menos letal CO₂ .50/.68 · sin permiso SEDENA', accent: true },
    { id: 'accesorios', icon: '▫', title: 'Accesorios', desc: 'Equipamiento de adquisición legal en la DCAM · precio oficial' },
    { id: 'municiones', icon: '◉', title: 'Municiones', desc: 'Cartuchos por calibre · precio de referencia DCAM / OTCA' },
    { id: 'calibres', icon: '◉', title: 'Calibres', desc: 'Guía de munición: uso, balística y armas' },
    { sep: true },
    { id: 'campos', icon: '◎', title: 'Campos de tiro', desc: 'Clubes y polígonos aliados', proximamente: true },
    { id: 'experiencias', icon: '✦', title: 'Experiencias', desc: 'Formación y actividades de tiro', proximamente: true },
    { sep: true },
    { id: 'legal', icon: '§', title: 'Legalidad', desc: 'Trámite SEDENA y categorías legales' },
    { id: 'soporte', icon: '◈', title: 'Soporte y normas', desc: 'Normas de la comunidad, denuncias y moderación' },
    { id: 'faq', icon: '?', title: 'Preguntas frecuentes', desc: 'Dudas comunes sobre armas y trámites' },
    { id: 'about', icon: '◆', title: 'Acerca de', desc: 'Sobre Armado en México y M&S' },
    { sep: true },
    { id: 'tutorial', action: 'tutorial', icon: '▶', title: 'Ver tutorial', desc: 'Reproduce la introducción de bienvenida' },
  ];

  return (
    <div style={{ padding: `20px ${padX}px 90px`, maxWidth: 700, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 12, color: PALETTE.amber,
        letterSpacing: '0.2em', marginBottom: 14,
        textTransform: 'uppercase',
        textAlign: vp.isMobile ? 'center' : 'left'
      }}>☰ ÍNDICE · MÁS</div>

      <div className="amx-menu">
        {items.map((it, i) => {
          if (it.sep) return <hr key={`sep-${i}`} className="amx-menu-sep" />;
          const proximamente = it.proximamente;
          const label = proximamente ? `${it.title} (Próximamente)` : it.title;
          return (
            <button
              key={it.id}
              className={`amx-menu-item${it.accent ? ' amx-menu-item--accent' : ''}`}
              disabled={proximamente}
              onClick={proximamente ? undefined : () => it.action === 'tutorial' ? (onTutorial && onTutorial()) : onNav(it.id)}
            >
              <span className="amx-menu-icono">{it.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="amx-menu-titulo">{label}</div>
                <div className="amx-menu-desc">{it.desc}</div>
              </div>
              <span className="amx-menu-flecha">›</span>
            </button>
          );
        })}
      </div>

      <div className="amx-menu-pie">
        <strong>◆ ARMADO·MX</strong>
        Catálogo divulgativo. Edición 2026. Contenido editado por Saulo Flores · Armas M&amp;S.
      </div>
    </div>
  );
}
window.MenuScreen = MenuScreen;
```

- [ ] **Step 3: Build, auditar y commit**

```bash
npm run build
node .claude/skills/conciliar-inventario/scripts/auditar.js
git add src/screens/screens-2.jsx src/styles/estilo.css
git commit -m "feat: rediseñar MenuScreen con estética vintage de legajo/archivero"
```

---

### Task 3: Pulir la barra inferior (BottomNav)

**Mejoras observadas necesarias:**
1. El indicador activo (la línea luminosa en la parte superior del ítem seleccionado) es apenas visible — hacerlo más prominente.
2. El color activo `#DDD5C4` contrasta poco con el `sobreMarcaDim` inactivo — mayor diferenciación.
3. El label "MÁS" se recorta visualmente en pantallas estrechas porque los 5 ítems compiten por espacio.
4. Falta un efecto de área táctil visible (feedback al toque).

**Files:**
- Modify: `src/components/ui.jsx` (función `BottomNav`, líneas 702-799)
- Modify: `src/styles/estilo.css` (nueva clase `.amx-nav-*` si se migra a CSS)

**Interfaces:**
- Consumes: `PALETTE`, `current`, `onNav`, `compareCount`
- Produces: `BottomNav` con el mismo API, visualmente mejorado

- [ ] **Step 1: Mejorar el indicador activo y el contraste en BottomNav**

En `src/components/ui.jsx`, modificar la función `BottomNav` (líneas 760-795). Los cambios son dentro del inline style de los ítems:

1. **Indicador activo más prominente:** Cambiar el `width: 18` del indicador a `width: 24` y `height: 2` a `height: 2.5`, con `borderRadius: 1`.
2. **Mejor contraste activo vs inactivo:** El activo pasa de `#DDD5C4` a `#FAF9F5` (blanco papel, máximo contraste sobre marca). El inactivo se mantiene en `PALETTE.sobreMarcaDim`.
3. **Asegurar `minWidth: 0`** en cada botón para que en pantallas estrechas los labels se compriman sin desbordarse (añadir `overflow: hidden`, `textOverflow: 'ellipsis'` al label).

Reemplazar el bloque de `items.map` (líneas 758-795):

```jsx
{items.map(it => {
  const active = current === it.id;
  return (
    <button key={it.id} onClick={() => onNav(it.id)} style={{
      flex: 1, minWidth: 0, background: 'none', border: 'none', cursor: 'pointer',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '8px 2px', gap: 4, minHeight: 48,
      color: active ? '#FAF9F5' : PALETTE.sobreMarcaDim,
      position: 'relative',
    }}>
      {active && (
        <span style={{
          position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)',
          width: 24, height: 2.5, borderRadius: 1,
          background: '#FAF9F5',
          boxShadow: '0 0 8px rgba(250,249,245,.6)',
        }} />
      )}
      <span style={{ lineHeight: 1, position: 'relative' }}>
        <NavIcon id={it.id} />
        {it.badge ? (
          <span style={{
            position: 'absolute', top: -4, right: -10,
            background: '#DDD5C4', color: '#000',
            fontSize: 12, fontWeight: 700,
            borderRadius: 8, padding: '1px 4px',
            fontFamily: 'JetBrains Mono, monospace',
            minWidth: 12, textAlign: 'center', lineHeight: 1.2,
          }}>{it.badge}</span>
        ) : null}
      </span>
      <span style={{
        fontFamily: 'Archivo, sans-serif',
        fontSize: 11, fontWeight: active ? 600 : 500,
        letterSpacing: '0.06em',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        maxWidth: '100%',
      }}>{it.label}</span>
    </button>
  );
})}
```

Cambios clave:
- `fontSize: 12` → `fontSize: 11` en el label para dar aire en pantallas estrechas.
- `padding: '8px 4px'` → `padding: '8px 2px'` para más respiración entre ítems.
- Color activo: `#DDD5C4` → `#FAF9F5` (mayor contraste).
- Indicador: `width: 18` → `24`, `height: 2` → `2.5`, + `borderRadius: 1`.
- Label con `whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'`.

- [ ] **Step 2: Build, auditar y commit**

```bash
npm run build
node .claude/skills/conciliar-inventario/scripts/auditar.js
git add src/components/ui.jsx
git commit -m "fix: pulir BottomNav — mejor contraste activo, indicador más visible"
```

---

### Task 4: Corregir desborde del Arma Destacada en Home (tarjeta CZ P-09)

**Problema observado (imagen 4):** En la pantalla Home, la tarjeta del "Arma Destacada" (el folder manila con la CZ P-09) permite que el contenido desborde horizontalmente. El label "ARMA DESTACADA" se corta, y la tarjeta completa es más ancha que el viewport.

**Files:**
- Modify: `src/styles/estilo.css` (reglas `.amx-dest-folder` para móvil)

**Interfaces:**
- Consumes: CSS existente de `.amx-dest-folder`
- Produces: folder manila que siempre cabe en el viewport móvil

- [ ] **Step 1: Añadir `max-width: 100%` y `overflow: hidden` al folder destacado en móvil**

En `src/styles/estilo.css`, buscar la media query de `@media (max-width: 719px)` para `.amx-dest-folder` (línea ~1102) y añadir:

```css
@media (max-width: 719px) {
  .amx-v2 .amx-dest-folder {
    grid-template-columns: minmax(0, 1fr) minmax(0, 38%);
    gap: var(--e3);
    max-width: 100%;  /* NUEVO: no desbordar el viewport */
    overflow: hidden;  /* NUEVO: recortar contenido que sobresalga */
  }
  /* ... reglas existentes ... */
}
```

- [ ] **Step 2: Build, auditar y commit**

```bash
npm run build
node .claude/skills/conciliar-inventario/scripts/auditar.js
git add src/styles/estilo.css
git commit -m "fix: folder destacado no desborda en móvil"
```

---

### Task 5: Push de la rama y verificación final

- [ ] **Step 1: Push de la rama al remoto**

```bash
git push -u origin fix/mobile-menu-vintage-polish
```

- [ ] **Step 2: Verificar que el build pasa**

```bash
npm install
npm run build
npm test
node .claude/skills/conciliar-inventario/scripts/auditar.js
```

- [ ] **Step 3: Verificar visualmente con `npx serve out`**

Abrir `http://localhost:3000` y comprobar en viewport móvil (DevTools, 375px):
1. ✅ El menú MÁS tiene estética vintage (fichas de archivero sobre cartulina)
2. ✅ La barra inferior tiene contraste correcto y labels legibles
3. ✅ No hay scroll horizontal en ninguna pantalla
4. ✅ El folder destacado no desborda
5. ✅ Las pestañas de Calibres se deslizan sin romper el layout

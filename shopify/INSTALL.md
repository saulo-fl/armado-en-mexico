# Armado en México — Instalación en Shopify

## Archivos

- **`armado-en-mexico.liquid`** → la sección. Va en `sections/`
- **`armado-en-mexico.catalog.json`** → el catálogo (36 armas). Va pegado en un setting

## Pasos

### 1. Subir la sección al tema
En tu admin Shopify → **Tienda online → Temas → Acciones → Editar código**.
En la columna izquierda, sección **Sections**, click en **Agregar una nueva sección** → nómbrala `armado-en-mexico`.
Pega el contenido de `armado-en-mexico.liquid` y guarda.

### 2. Agregarla a una página
Crea una página nueva (ej. `Armado en México`) usando una plantilla compatible con secciones (`page.armado-en-mexico.json`), o agrégala desde el customizer a cualquier página de plantilla.

### 3. Cargar el catálogo (opción A — rápida, recomendada para empezar)
En la sección, en **Fuente de datos** elige `JSON manual`. Copia todo el contenido de `armado-en-mexico.catalog.json` y pégalo en el campo **Catálogo JSON**.
✅ 17 modelos vendrán con foto real de Wikipedia.

### 4. Cargar el catálogo (opción B — robusta, vía metaobjects)
1. Admin → **Settings → Custom data → Metaobjects → Add definition**
2. Nombre: `armado_arma`. Crea estos campos:

| Campo | Tipo |
|---|---|
| nombre, marca, tipo, pais, calibre, capacidad, peso, longitud, mecanismo, era, avail, avail_label, legal_titulo, precio_exacto, dcam_ref | Single line text |
| anio, precio_nivel | Integer |
| legal_desc, historia | Multi-line text |
| imagen | File |
| stats, disponibilidad, uses | JSON |

3. Crea una entrada por arma (tomando datos del catálogo JSON).
4. En la sección, **Fuente de datos** → `Metaobjects 'armado_arma'`.

### 5. Asesoría WhatsApp
Configura en la sección:
- **WhatsApp** → tu número con código país (ej. `5215512345678`)
- **Texto del botón** → por defecto: `WhatsApp · Hablar con un asesor`
- **Disclaimer** → la frase fija "Somos asesores, no gestores." aparece automáticamente; el texto adicional es editable.

### 6. SEO
La sección inyecta automáticamente JSON-LD (Organization, WebPage, BreadcrumbList, FAQPage). Para los meta tags del `<head>` (title, description, OG), usa los campos de SEO de la página en el admin Shopify (no se pueden inyectar desde dentro de una sección).

**Recomendado:**
- Title: `Armado en México · Catálogo legal de armas en DCAM | [Tu tienda]`
- Description: `Enciclopedia divulgativa de armas de fuego legales en México. Pistolas, revólveres, rifles y escopetas con su estatus legal SEDENA.`

## Imágenes
17 de 36 modelos traen foto de Wikimedia. Para los 19 restantes, sube las fotos del fabricante a Shopify Files y pega la URL en el campo `img` del catálogo JSON, o asígnalas como `imagen` en el metaobject. Cards con `img` válida obtienen fondo blanco automático.

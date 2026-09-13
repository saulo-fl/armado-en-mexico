# SEO y GEO — referencia de trabajo

Destilado de la investigación del 24-ago-2026 para **armado.mx**. Solo lo que
aplica a este sitio; las fuentes primarias están al final.

---

## 1. El bloqueante: las URLs devuelven 404

Verificado en producción:

```
200  /
404  /pistolas
404  /pistolas/glock-19
404  /municiones/<slug>
```

El deep-linking se resuelve con el truco de `404.html` (redirige a `/?/<ruta>` y
`index.html` restaura con `replaceState`). **Eso funciona para navegadores y no
para crawlers**, porque el crawler juzga por el status code:

- Google: *"Google doesn't use the content from URLs that return 4xx status codes"*
  y *"queues all pages with a 200 HTTP status code for rendering"* → con 404 **ni
  siquiera se encola el render de JS**.
- Estudio Vercel/MERJ: *"Pages with other 3xx, 4xx, and 5xx errors were not rendered."*

**Consecuencia:** un `sitemap.xml` que liste estas URLs solo llena Search Console
de «Not found (404)». Hay que arreglar el estado HTTP **antes** del sitemap.

### Las tres salidas

| | Qué es | Veredicto |
|---|---|---|
| **B. Prerender estático** | Emitir un `.html` real por URL en el build | ✅ **La buena.** Arregla 404 + indexación JS + IA + `<head>` por página |
| **A. `_redirects` con 200** | Rewrite de cada prefijo a `/index.html` | ⚠️ Parche. Deja 285 URLs con HTML idéntico → duplicados |
| **C. Borrar `404.html`** | Pages entra en modo SPA nativo | ❌ Soft 404 masivos, no arregla nada más |

**Gotcha de Pages a favor de B:** Pages sirve `/x.html` también en `/x` (redirige
`.html` → sin extensión). Verificado aquí: `/pistolas.html` → 308 → `/pistolas`.
→ Emitir `pistolas/glock-19.html` da `/pistolas/glock-19` con **200 y sin slash**,
que es justo el esquema actual. **No emitir `pistolas/glock-19/index.html`**: eso
produce URL *con* slash y obliga a decidir canonicals.

**🚨 Gotcha grande si se usa A:** en Cloudflare Pages *"Redirects are always followed,
regardless of whether or not an asset matches the incoming request"*. Un catch-all
`/* /index.html 200` **se come `/sitemap.xml`, `/robots.txt`, `/app.js`, `/imagenes/*`**
y rompe el sitio. (En Netlify no pasa; por eso circula tanto consejo equivocado.)
Si se usa A, hay que listar prefijos explícitos, estáticos primero.

Notas de convivencia: `_redirects` **no** aplica a Pages Functions (`/api/*` a salvo)
y se evalúa **antes** que `_headers`.

---

## 2. Los crawlers de IA no ejecutan JavaScript

| Motor | ¿Ejecuta JS? |
|---|---|
| Googlebot | Sí, fiable (solo con 200) |
| Bingbot | Parcial, no a escala |
| **GPTBot · ClaudeBot · PerplexityBot** | **No** |

Descargan los `.js` pero no los ejecutan. **Si el contenido no está en el HTML crudo,
para ChatGPT y Claude este sitio está vacío.** Es el argumento decisivo para el
prerender, más aún que el SEO.

Retraso de la segunda oleada de Googlebot (Vercel/MERJ, 37 000 pares): mediana 10 s,
p75 26 s, p90 ~3 h, p99 ~18 h. No es el problema aquí; el 404 sí.

Google ya **no** recomienda dynamic rendering: *"a workaround and not a long-term
solution"*. Recomienda static rendering — que es exactamente la opción B.

`llms.txt`: ningún motor grande ha confirmado usarlo. No perder tiempo.

---

## 3. `robots.txt` — dos bloques: el de Cloudflare y el del repo

El repo emite su propio `robots.txt` desde `scripts/build-prerender.mjs`, pero Cloudflare
(Content Signals Policy) **antepone** su bloque gestionado a él. Ese bloque hoy bloquea:

```
Content-Signal: search=yes, ai-train=no, use=reference
GPTBot · ClaudeBot · CCBot · Google-Extended · Bytespider
Amazonbot · Applebot-Extended · meta-externalagent   →  Disallow: /
```

**Matiz que importa para GEO:** lo bloqueado son los bots de **entrenamiento**. Los de
**recuperación en tiempo real** — `OAI-SearchBot`, `ChatGPT-User`, `Claude-SearchBot`,
`Claude-User`, `PerplexityBot` — **no** están en la lista y siguen permitidos por el
`User-agent: *`. Para ser citado en respuestas, esos son los que cuentan.

Se cambia en **Cloudflare Dashboard → Security → Control AI Crawlers**. No intentar
contrarrestarlo con un `Allow:` propio: quedaría en un segundo grupo y la resolución
depende de cada crawler.

**Lo que añade el repo** (ya hecho: lo escribe `build-prerender.mjs` en cada build;
Cloudflare lo anexa tras el suyo, y `Sitemap:` es directiva global):

```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin.html

Sitemap: https://armado.mx/sitemap.xml
```

---

## 4. Sitemap: reglas que aplican

| Regla | Valor |
|---|---|
| Máx. URLs / tamaño | 50 000 · 50 MB sin comprimir |
| Codificación | UTF-8, URLs absolutas |
| Escapado obligatorio | `&` `'` `"` `>` `<` → entidades |
| Sitemap index | Solo si se superan los límites — **aquí no: 285 URLs, un solo fichero** |
| Ubicación | Raíz (un sitemap en `/x/` solo puede listar URLs bajo `/x/`) |

- **`changefreq` y `priority`: Google los ignora.** Omitirlos.
- **`lastmod`**: ISO 8601. Google lo usa *"if it's consistently and verifiably accurate"*.
  La confianza es **binaria**: o se cree toda la columna o la descarta entera, sin avisar.
  → O se deriva de algo real **o se omite**. Nunca poner la fecha del build en todas las URLs.
  Aquí sale de la **fecha del inventario** de cada artículo; **no** de `git log`: Cloudflare
  Pages clona en superficial y todas las URLs caían a la fecha del último commit
  (ver `AGENTS.md`, sección del prerender).

Generarlo **en el build, desde la misma fuente de datos que la app** — así no puede
desincronizarse. Un sitemap a mano se pudre en dos semanas.

### Gotchas que aplican aquí

- No listar `/pistolas/glock-19.html` (308) ni `/admin.html`. Solo la forma final.
- **Trailing slash**: el router usa *sin* slash. Mantenerlo en sitemap, canonical y
  enlaces internos. Google trata `/x` y `/x/` como URLs distintas.
- No listar `/?/pistolas/glock-19` (la forma interna del truco SPA).
- Excluir `/admin`.
- Ya resuelto: HSTS activo, sin www, slugs ASCII en minúscula.

---

## 5. JSON-LD — qué usar y qué no

| Schema | Veredicto |
|---|---|
| **`BreadcrumbList`** | ✅✅ **El de mayor retorno.** Rich result vivo. En todas las páginas |
| **`Article`** como envoltorio | ✅ Encaja con lo divulgativo, sin riesgo comercial |
| **`ItemList`** en listados | ✅ Barato, ayuda al descubrimiento |
| **`Product`** sin `offers` | ⚠️ *Válido* — Google contempla «product snippets» para páginas donde **no** se puede comprar. Sin `offers`/`review`/`aggregateRating` no habrá rich result, pero no es penalización. **El riesgo es de negocio**: marcar armas como `Product` puede hacer que Google clasifique el sitio como comercial, y Merchant Center/Ads prohíben armas desde 2012 |
| ~~`FAQPage`~~ | ❌ Google eliminó los rich results de FAQ el 7-may-2026. Sigue siendo válido y puede ayudar a los LLM, pero cero efecto en SERP |
| ~~`HowTo`~~ | ❌ También eliminado |

**Lo que de verdad mueve GEO** (consenso, no doctrina de Google): contenido en el HTML
crudo · encabezados semánticos y tablas reales, no divs pintados por React · un párrafo
de respuesta directa al principio de cada ficha (los LLM citan párrafos autocontenidos)
· fecha visible y fuente citada (DCAM/SEDENA, LFAFE).

---

## 6. El nicho: contenido sobre armas

- Google **Shopping y Ads prohíben** armas de fuego. Search orgánico **no** tiene
  política de exclusión para contenido informativo sobre armas legales.
- El problema real del nicho no es la indexación: es **conseguir enlaces**. Muchos
  medios evitan enlazar. → El SEO técnico y la calidad del contenido pesan más aquí.
- Plausible (no confirmado) que caiga bajo **YMYL** por implicaciones legales y de
  seguridad → más exigencia de E-E-A-T. Mitigación barata: `/acerca` con autoría real,
  fuentes citadas con fecha, avisos legales explícitos.
- No hay evidencia de penalización algorítmica por contenido informativo sobre armas.

---

## 7. Verificación obligatoria tras cualquier cambio

```bash
for u in / /pistolas /pistolas/glock-19 /municiones/12-ga-rio-perdigon-7-5-28-gr \
         /sitemap.xml /robots.txt /app.js /imagenes/favicon.png /noexiste-xyz; do
  echo "$(curl -s -o /dev/null -w '%{http_code}' https://armado.mx$u)  $u"
done
# Esperado: 200 en todas menos /noexiste-xyz -> 404
```

Y dar de alta el sitio en **Search Console** — sin eso no hay forma de saber si Google
dejó de ver 404. El endpoint de ping de sitemaps **se eliminó en 2023**: no implementarlo.

---

## Fuentes

Google Search Central: [HTTP status codes](https://developers.google.com/search/docs/crawling-indexing/http-network-errors) ·
[JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics) ·
[Build a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap) ·
[Dynamic rendering](https://developers.google.com/search/docs/crawling-indexing/javascript/dynamic-rendering) ·
[Product structured data](https://developers.google.com/search/docs/appearance/structured-data/product) ·
[Sitemaps ping removed](https://developers.google.com/search/blog/2023/06/sitemaps-lastmod-ping)

Cloudflare: [Pages redirects](https://developers.cloudflare.com/pages/configuration/redirects/) ·
[Serving Pages](https://developers.cloudflare.com/pages/configuration/serving-pages/) ·
[Managed robots.txt](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt)

Otros: [sitemaps.org](https://www.sitemaps.org/protocol.html) ·
[Vercel+MERJ, cómo Google maneja JS](https://vercel.com/blog/how-google-handles-javascript-throughout-the-indexing-process) ·
[Vercel+MERJ, AI crawlers](https://vercel.com/blog/the-rise-of-the-ai-crawler) ·
[SEJ, FAQ rich results eliminados](https://www.searchenginejournal.com/google-drops-faq-rich-results-from-search/574429/)

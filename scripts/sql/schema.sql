-- Armado en México — esquema de la base D1 (Cloudflare)
-- =============================================================================
-- El backend usa un "document store" por DOMINIO: cada dominio de curaduría que
-- hoy vive en localStorage (páginas, promos, favoritos, branding, catálogo,
-- historial de precios, inventarios, propuestas, sugerencias, reseñas, denuncias, visitas)
-- se guarda como UNA fila con su JSON. Esto refleja exactamente la forma que ya
-- maneja store.js, así que la sincronización es trivial y la API es mínima.
--
-- Aplicar con:
--   wrangler d1 create armado-en-mexico       # crea la base, copia el database_id a wrangler.toml
--   wrangler d1 execute armado-en-mexico --remote --file=./scripts/sql/schema.sql
-- (o --local para pruebas con `wrangler pages dev`).
-- =============================================================================

CREATE TABLE IF NOT EXISTS state (
  domain     TEXT PRIMARY KEY,   -- 'pages' | 'promos' | 'armas' | 'reviews' | ...
  data       TEXT NOT NULL,      -- JSON serializado del dominio (mismo shape que localStorage)
  updated_at TEXT NOT NULL       -- ISO timestamp del último cambio
);

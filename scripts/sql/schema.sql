-- Armado en México — esquema de la base D1 (Cloudflare)
-- =============================================================================
-- El backend usa un "document store" por DOMINIO: cada dominio de contenido editable que
-- hoy vive en localStorage (páginas, promos, favoritos, branding, catálogo,
-- historial de precios, inventarios, reseñas, denuncias)
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

-- Visitas a las fichas: un contador por arma y día (UTC). Desde nov-2026 no van en un blob de
-- `state`: el blob guardaba una marca por visita, viajaba en cada GET /api/state y cada visita lo
-- leía y reescribía entero (~500 KB) — pasó del límite de 10 ms de CPU del plan gratis. Aquí una
-- visita es un solo UPSERT. El ranking «Más visitadas» se precalcula una vez al día en la fila
-- `masVisitadas` de `state` (functions/api/_visitas.js). Tabla sola en scripts/sql/visitas-dia.sql.
CREATE TABLE IF NOT EXISTS visitas_dia (
  dia      TEXT    NOT NULL,     -- 'YYYY-MM-DD' (UTC)
  arma_id  INTEGER NOT NULL,
  n        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (dia, arma_id)     -- dia primero: el ranking y la limpieza filtran por rango de días
);

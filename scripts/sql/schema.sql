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

-- Reportes de corrección y de fallo hechos desde armado.mx sin cuenta de GitHub (nov-2026).
-- Una fila por reporte; NO viaja en GET /api/state (llevan correo y metadata privados).
-- Al recibirse se publican solos como issue (functions/api/_issues.js). Tabla sola en
-- scripts/sql/reportes-web.sql. Diseño: Documentos de Proyecto/2026-11-23-reportes-internos-plan.md.
CREATE TABLE IF NOT EXISTS reportes_web (
  id          TEXT PRIMARY KEY,     -- folio que ve quien reporta: 'AMX-' + 6 caracteres
  formato     TEXT NOT NULL,        -- id del Issue Form: 'correccion' | 'fallo'
  titulo      TEXT NOT NULL,        -- título completo del issue, con su prefijo
  campos      TEXT NOT NULL,        -- JSON { idCampo: valor } ya validado contra el formato
  firma       TEXT NOT NULL,        -- nombre o apodo (público en el issue)
  github      TEXT,                 -- usuario de GitHub opcional (el issue lo menciona)
  email       TEXT,                 -- opcional y PRIVADO: nunca sale a GitHub
  metadata    TEXT,                 -- JSON del dispositivo solo si lo aceptó; NULL si no. Nunca sale a GitHub
  estado      TEXT NOT NULL,        -- 'publicando' | 'pendiente' | 'publicado' | 'retirado' | 'cerrado'
  repo        TEXT NOT NULL,        -- repo destino, decidido por el host de la petición
  issue_num   INTEGER,
  issue_url   TEXT,
  error       TEXT,                 -- último motivo por el que quedó pendiente (github_401, tope_diario…)
  creado      TEXT NOT NULL,
  publicado   TEXT,
  actualizado TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS reportes_web_estado ON reportes_web (estado, creado);

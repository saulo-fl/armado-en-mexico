-- Armado en México — tabla de visitas por día (migración de nov-2026).
-- Aditiva: el código anterior no la usa, así que puede crearse antes de publicar.
--   npx wrangler d1 execute armado-en-mexico --remote --file=./scripts/sql/visitas-dia.sql
-- Misma definición que en schema.sql (ahí está el porqué).
CREATE TABLE IF NOT EXISTS visitas_dia (
  dia      TEXT    NOT NULL,
  arma_id  INTEGER NOT NULL,
  n        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (dia, arma_id)
);

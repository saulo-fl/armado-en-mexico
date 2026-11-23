-- Armado en México — tabla de reportes web (nov-2026).
-- Aditiva: el código anterior no la usa, así que puede crearse antes de publicar.
--   npx wrangler d1 execute armado-en-mexico --remote --file=./scripts/sql/reportes-web.sql
-- Misma definición que en schema.sql (ahí está el porqué).
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

-- Two things on one branch (one migration per merge). First, her own words on an
-- extra (the Extras block, 2026-11-18): `site_description`, her
-- description for the website, shown instead of KennelOS's (which stays KennelOS's,
-- replaced by each bundle); and `details`, the longer words behind "More details".
-- Both hers, never sent by KennelOS. Additive only: two empty columns, so every
-- extra shows as today until she writes them.
ALTER TABLE extras ADD COLUMN site_description TEXT;
ALTER TABLE extras ADD COLUMN details TEXT;

-- Documents (2026-11-18): a site's PDFs, which the owner uploads, kept in R2 under
-- the site's files (sites/<id>/docs/); any button on the site can open one. A new
-- table, empty: nothing existing changes.
CREATE TABLE IF NOT EXISTS documents (
  id          TEXT PRIMARY KEY,
  site_id     TEXT NOT NULL REFERENCES sites(id),
  r2_key      TEXT NOT NULL,
  name        TEXT NOT NULL,
  title       TEXT,
  bytes       INTEGER NOT NULL,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS documents_site ON documents (site_id);

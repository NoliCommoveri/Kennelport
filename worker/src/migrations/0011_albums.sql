-- Albums (plan 3.1, phase 5): photo galleries, each with its own address
-- (/albums/<slug>), optionally of one litter (its page links to them). The photos
-- are the site's own, in order, as a JSON list of photo ids; a removed photo just
-- drops out. Additive only.
CREATE TABLE IF NOT EXISTS albums (
  id              TEXT PRIMARY KEY,
  site_id         TEXT NOT NULL REFERENCES sites(id),
  slug            TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  litter_id       TEXT,
  cover_photo_id  TEXT,
  photos          TEXT,
  show_on_site    INTEGER NOT NULL DEFAULT 1,
  sort            INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  UNIQUE (site_id, slug)
);

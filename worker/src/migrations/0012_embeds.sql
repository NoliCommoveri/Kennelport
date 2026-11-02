-- Videos and posts (plan 3.3, phase 5): never pasted HTML, only the provider and the
-- item read from a pasted link (src/embeds.js). place: where it shows: 'home',
-- 'about', or 'dog:<id>', 'litter:<id>', 'album:<id>'. preview_photo_id: a copy of
-- the provider's preview picture, stored on the site, when it has one.
CREATE TABLE IF NOT EXISTS embeds (
  id                TEXT PRIMARY KEY,
  site_id           TEXT NOT NULL REFERENCES sites(id),
  place             TEXT NOT NULL,
  provider          TEXT NOT NULL,
  item              TEXT NOT NULL,
  title             TEXT,
  preview_photo_id  TEXT,
  sort              INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_embeds_site ON embeds (site_id, place, sort);

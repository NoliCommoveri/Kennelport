-- Recommended products (the /recommended page): what the breeder suggests, each
-- with an optional referral link and code. home_badge: also shown as a logo under
-- the Home banner (at most two, content/records.js). image_url: the brand's own
-- picture, shown from the brand's address (content/model.js BRAND_IMAGE_ORIGINS).
-- kennelos_id: the KennelOS Account it comes from, when linked (plan 5.3; its
-- name, link, code and code note are then KennelOS's).
-- Additive only.
CREATE TABLE IF NOT EXISTS products (
  id           TEXT PRIMARY KEY,
  site_id      TEXT NOT NULL REFERENCES sites(id),
  name         TEXT NOT NULL,
  grp          TEXT,
  description  TEXT,
  photo_id     TEXT,
  image_url    TEXT,
  link_url     TEXT,
  link_label   TEXT,
  code         TEXT,
  code_note    TEXT,
  home_badge   INTEGER NOT NULL DEFAULT 0,
  sort         INTEGER NOT NULL DEFAULT 0,
  source       TEXT NOT NULL DEFAULT 'kennelport',
  kennelos_id  TEXT
);
CREATE INDEX IF NOT EXISTS idx_products_site ON products (site_id, sort);

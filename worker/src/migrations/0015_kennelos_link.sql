-- Phase 4: the KennelOS link (plan 5), litter prices (3.2), the dogs page's new
-- groups (3.7) and the 30 days with Keep for litters (5.3). Additive only.

-- ---------- prices (plan 3.2) ----------
-- With this on, a linked site takes the litter prices and the extras prices from
-- KennelOS (decision 6), read-only here. Off by default.
ALTER TABLE sites ADD COLUMN use_kennelos_prices INTEGER NOT NULL DEFAULT 0;

-- A litter's six figures, each per sex, in whole dollars. Either sex blank means
-- "the same as the other". show_prices is off by default ("Contact us for
-- pricing"); show_placed is on.
ALTER TABLE litters ADD COLUMN price_female INTEGER;
ALTER TABLE litters ADD COLUMN price_male INTEGER;
ALTER TABLE litters ADD COLUMN deposit_female INTEGER;
ALTER TABLE litters ADD COLUMN deposit_male INTEGER;
ALTER TABLE litters ADD COLUMN full_reg_female INTEGER;
ALTER TABLE litters ADD COLUMN full_reg_male INTEGER;
ALTER TABLE litters ADD COLUMN price_note TEXT;
ALTER TABLE litters ADD COLUMN show_prices INTEGER NOT NULL DEFAULT 0;
ALTER TABLE litters ADD COLUMN show_placed INTEGER NOT NULL DEFAULT 1;
-- When deposits open (KennelOS's accept_deposits_date): before it, the litter sits
-- under Coming up and its Available puppies read "Available on <date>" (5.3, 3.6).
ALTER TABLE litters ADD COLUMN deposits_on TEXT;

-- A puppy's registration, when settled ('limited' / 'full'), and its own price,
-- which overrides the litter's. Both optional.
ALTER TABLE puppies ADD COLUMN registration TEXT CHECK (registration IN ('limited', 'full'));
ALTER TABLE puppies ADD COLUMN price INTEGER;

-- ---------- the dogs page (plan 3.7) ----------
-- upcoming: young stock she has kept (Up and coming). for_sale: an adult she is
-- placing (Looking for a home), with its asking price, shown only with the site's
-- Show other prices on. died_on: for a dog in memory.
ALTER TABLE dogs ADD COLUMN upcoming INTEGER NOT NULL DEFAULT 0;
ALTER TABLE dogs ADD COLUMN for_sale INTEGER NOT NULL DEFAULT 0;
ALTER TABLE dogs ADD COLUMN price INTEGER;
ALTER TABLE dogs ADD COLUMN died_on TEXT;

-- ---------- a litter isn't an archive (plan 5.3, decision 28) ----------
-- left_site_at: when it went off the site (unticked, gone from the bundle,
-- switched off, or Past without Keep). The daily cleanup deletes it 30 days
-- after, unless kept_at says she pressed Keep.
ALTER TABLE litters ADD COLUMN left_site_at TEXT;
ALTER TABLE litters ADD COLUMN kept_at TEXT;
-- What kind of KennelOS record a website litter is matched to: a 'litter', a
-- 'pairing' (becomes the litter at whelping, keeping its page) or a 'heat'.
ALTER TABLE litters ADD COLUMN kennelos_kind TEXT CHECK (kennelos_kind IN ('litter', 'pairing', 'heat'));

-- KennelOS ids for the rows that come in a bundle as lists.
ALTER TABLE health_results ADD COLUMN kennelos_id TEXT;
ALTER TABLE extras ADD COLUMN kennelos_id TEXT;
ALTER TABLE steps ADD COLUMN kennelos_id TEXT;

CREATE INDEX IF NOT EXISTS idx_dogs_kennelos ON dogs (site_id, kennelos_id);
CREATE INDEX IF NOT EXISTS idx_litters_kennelos ON litters (site_id, kennelos_id);
CREATE INDEX IF NOT EXISTS idx_puppies_kennelos ON puppies (site_id, kennelos_id);

-- ---------- linking (plan 5.2) ----------
-- The one-time codes Link KennelOS shows: eight characters, a quarter of an hour,
-- single use. Kept as a keyed hash.
CREATE TABLE IF NOT EXISTS link_codes (
  code_hash   TEXT PRIMARY KEY,
  site_id     TEXT NOT NULL REFERENCES sites(id),
  created_by  TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  used_at     TEXT
);
CREATE INDEX IF NOT EXISTS idx_link_codes_site ON link_codes (site_id);

-- One row per KennelOS device. A bundle from any kennel but kennelos_kennel_id is
-- refused. The token is kept as its SHA-256. last_bundle_id: a repeat is answered
-- with last_bundle_summary, not applied twice. revoked_at: stopped (Unlink, or
-- this device alone).
CREATE TABLE IF NOT EXISTS links (
  id                   TEXT PRIMARY KEY,
  site_id              TEXT NOT NULL REFERENCES sites(id),
  kennelos_kennel_id   TEXT NOT NULL,
  token_hash           TEXT NOT NULL UNIQUE,
  device_label         TEXT,
  linked_at            TEXT NOT NULL,
  last_seen_at         TEXT,
  last_bundle_id       TEXT,
  last_bundle_at       TEXT,
  last_bundle_summary  TEXT,
  revoked_at           TEXT
);
CREATE INDEX IF NOT EXISTS idx_links_site ON links (site_id);

-- Matching what's already there (plan 5.2 step 4): a KennelOS dog or litter whose
-- name matches a website one not yet linked waits here, with what the bundle said
-- about it (data, JSON), until she confirms or declines the pair.
CREATE TABLE IF NOT EXISTS link_pending (
  site_id        TEXT NOT NULL REFERENCES sites(id),
  kind           TEXT NOT NULL CHECK (kind IN ('dogs', 'litters')),
  kennelos_id    TEXT NOT NULL,
  kennelport_id  TEXT NOT NULL,
  data           TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  PRIMARY KEY (site_id, kind, kennelos_id)
);

-- A pair she declined, so she isn't asked again at every bundle.
CREATE TABLE IF NOT EXISTS link_declines (
  site_id        TEXT NOT NULL REFERENCES sites(id),
  kind           TEXT NOT NULL,
  kennelos_id    TEXT NOT NULL,
  kennelport_id  TEXT NOT NULL,
  PRIMARY KEY (site_id, kind, kennelos_id, kennelport_id)
);

-- What the manage app shows the breeder (plan 6): a bundle's summary, for now.
CREATE TABLE IF NOT EXISTS notices (
  id          TEXT PRIMARY KEY,
  site_id     TEXT NOT NULL REFERENCES sites(id),
  kind        TEXT NOT NULL,
  message     TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  read_at     TEXT
);
CREATE INDEX IF NOT EXISTS idx_notices_site ON notices (site_id, created_at);

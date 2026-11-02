-- KennelPort's first schema (plan section 6). Phase 0 holds only what the router
-- needs to find a site; each later phase adds its tables in a new file.
-- Timestamps are ISO-8601 UTC strings.
--
-- Pre-launch, this file may still be edited on staging (it then reads as drifted
-- on /ops; reset staging's D1 and apply again). From the first real site on
-- production, migrations are forward-only and additive, and an applied file is
-- never edited.

-- One row per site. A closed site keeps only id, subdomain, status 'closed' and
-- closed_at (plan 4.3); every other column is wiped.
CREATE TABLE IF NOT EXISTS sites (
  id                     TEXT PRIMARY KEY,
  subdomain              TEXT NOT NULL UNIQUE,
  kennel_name            TEXT,
  template               TEXT NOT NULL DEFAULT 'ak',
  scheme                 TEXT NOT NULL DEFAULT 'lawn',
  dark_mode              TEXT NOT NULL DEFAULT 'auto' CHECK (dark_mode IN ('auto', 'light_only')),
  kennelos_public_id     TEXT,
  status                 TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'live', 'suspended', 'closed')),
  published_snapshot_id  TEXT,
  closed_at              TEXT,
  storage_limit          INTEGER,
  photo_limit            INTEGER,
  album_limit            INTEGER,
  created_at             TEXT NOT NULL
);

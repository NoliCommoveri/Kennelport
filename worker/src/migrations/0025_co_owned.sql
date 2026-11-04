-- Co-owned dogs (docs/Co_Owned_Dogs_Plan.md). A partner kennel is one her
-- co-owned dogs are shared with: its name and website (KennelOS's, on a linked
-- site, and only a kennel she ticked there) and its logo, uploaded here or copied
-- from the badge code the kennel hands out. Never a co-owner's personal details.
-- hidden_by_kennelos: no longer sent; kept with its logo until she removes it.
--
-- On a dog: co_owned; lives_away, living with one of its co-owners rather than
-- with her (then only in the Dogs page's Co-owned section, never in her own
-- groups or on Home); lives_with_kennel_id, the kennel it lives with now, when
-- named; co_owned_with_ids, a JSON list of its co-owners' kennels, for
-- "Co-owned with". Additive only.
CREATE TABLE IF NOT EXISTS partner_kennels (
  id                  TEXT PRIMARY KEY,
  site_id             TEXT NOT NULL REFERENCES sites(id),
  name                TEXT NOT NULL,
  url                 TEXT,
  photo_id            TEXT,
  sort                INTEGER NOT NULL DEFAULT 0,
  source              TEXT NOT NULL DEFAULT 'kennelport',
  kennelos_id         TEXT,
  hidden_by_kennelos  INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_partner_kennels_site ON partner_kennels (site_id, sort);

ALTER TABLE dogs ADD COLUMN co_owned INTEGER NOT NULL DEFAULT 0;
ALTER TABLE dogs ADD COLUMN lives_away INTEGER NOT NULL DEFAULT 0;
ALTER TABLE dogs ADD COLUMN lives_with_kennel_id TEXT;
ALTER TABLE dogs ADD COLUMN co_owned_with_ids TEXT;

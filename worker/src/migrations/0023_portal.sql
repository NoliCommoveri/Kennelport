-- The Puppy Parent Portal, build chunk 1 (docs/Puppy_Parent_Portal_Plan.md sections
-- 2, 5, 9 and 10): families and their sign-in, placements with the pickup and the
-- vet clock, health records, files, the reminder log, history, clicks and her
-- portal settings. Switched on per site (sites.portal_on, from /ops). Additive only.
--
-- Family email addresses are the one readable personal data KennelPort keeps: the
-- portal emails families months later. Each is stored encrypted (AES-GCM, the
-- PORTAL_EMAIL_KEY secret) beside the keyed hash used to look it up. Never logged.

ALTER TABLE sites ADD COLUMN portal_on INTEGER NOT NULL DEFAULT 0;

-- Recommended products double as the portal's programs (plan 7.3): which show to
-- families, what kind each is, and what the family has to do.
ALTER TABLE products ADD COLUMN portal_show INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN portal_type TEXT CHECK (portal_type IN ('food', 'insurance', 'registration', 'product', 'other'));
ALTER TABLE products ADD COLUMN family_action TEXT;

-- One row per site with the portal on. vet_rule is how her contract counts the
-- vet visit (plan section 5): 72 hours from pickup, or by the end of the third
-- calendar day after the pickup day, in her time zone.
CREATE TABLE IF NOT EXISTS portal_settings (
  site_id     TEXT PRIMARY KEY REFERENCES sites(id),
  time_zone   TEXT NOT NULL DEFAULT 'America/New_York',
  vet_rule    TEXT NOT NULL DEFAULT 'hours72' CHECK (vet_rule IN ('hours72', 'days3')),
  proof_note  TEXT,
  disclosure  TEXT,
  updated_at  TEXT
);

CREATE TABLE IF NOT EXISTS portal_families (
  id                  TEXT PRIMARY KEY,
  site_id             TEXT NOT NULL REFERENCES sites(id),
  name                TEXT NOT NULL,
  invited_at          TEXT,
  first_signed_in_at  TEXT,
  last_activity_at    TEXT,
  keep                INTEGER NOT NULL DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'erased')),
  source              TEXT NOT NULL DEFAULT 'portal' CHECK (source IN ('portal', 'kennelos')),
  kennelos_id         TEXT,
  edited_fields       TEXT NOT NULL DEFAULT '[]',
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_portal_families_site ON portal_families (site_id, name);

-- Several addresses per family, so partners both sign in. invite_hash: the
-- tap-to-sign-in link sent to this address, works once, until invite_expires_at.
CREATE TABLE IF NOT EXISTS portal_emails (
  id                 TEXT PRIMARY KEY,
  site_id            TEXT NOT NULL REFERENCES sites(id),
  family_id          TEXT NOT NULL REFERENCES portal_families(id),
  email_hash         TEXT NOT NULL,
  email_enc          TEXT NOT NULL,
  invite_hash        TEXT,
  invite_expires_at  TEXT,
  invited_at         TEXT,
  added_at           TEXT NOT NULL,
  UNIQUE (site_id, email_hash)
);
CREATE INDEX IF NOT EXISTS idx_portal_emails_family ON portal_emails (family_id);
CREATE INDEX IF NOT EXISTS idx_portal_emails_invite ON portal_emails (invite_hash);

-- Family sign-in, kept apart from breeder sign-in (login_codes, sessions).
CREATE TABLE IF NOT EXISTS portal_codes (
  site_id     TEXT NOT NULL,
  email_hash  TEXT NOT NULL,
  code_hash   TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  PRIMARY KEY (site_id, email_hash)
);

CREATE TABLE IF NOT EXISTS portal_sessions (
  token_hash    TEXT PRIMARY KEY,
  site_id       TEXT NOT NULL REFERENCES sites(id),
  family_id     TEXT NOT NULL REFERENCES portal_families(id),
  created_at    TEXT NOT NULL,
  last_seen_at  TEXT NOT NULL,
  expires_at    TEXT NOT NULL,
  revoked_at    TEXT
);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_family ON portal_sessions (family_id);

-- One per puppy a family takes home (plan section 9). puppy_name keeps the
-- placement readable if the site's puppy record is ever deleted.
-- pickup_state: planned (not home yet); assumed (the booked time passed unmarked,
-- so the clock started from it and she's asked to confirm); confirmed (she marked
-- or confirmed it); not_yet (she said it hasn't happened: clock stopped).
-- vet_deadline_at is stored, not recomputed: reminders and her evidence use the
-- deadline as it was (portal_history keeps every earlier one).
CREATE TABLE IF NOT EXISTS portal_placements (
  id                 TEXT PRIMARY KEY,
  site_id            TEXT NOT NULL REFERENCES sites(id),
  family_id          TEXT NOT NULL REFERENCES portal_families(id),
  puppy_id           TEXT REFERENCES puppies(id) ON DELETE SET NULL,
  puppy_name         TEXT NOT NULL,
  call_name          TEXT,
  microchip          TEXT,
  registration_no    TEXT,
  go_home_on         TEXT,
  pickup_booked_at   TEXT,
  picked_up_at       TEXT,
  pickup_state       TEXT NOT NULL DEFAULT 'planned' CHECK (pickup_state IN ('planned', 'assumed', 'confirmed', 'not_yet')),
  vet_deadline_at    TEXT,
  vet_booked_for     TEXT,
  vet_clinic         TEXT,
  vet_booked_at      TEXT,
  proof_file_id      TEXT,
  proof_uploaded_at  TEXT,
  proof_accepted_at  TEXT,
  contract_file_id   TEXT,
  life_status        TEXT NOT NULL DEFAULT 'with_family' CHECK (life_status IN ('with_family', 'deceased', 'rehomed', 'returned')),
  life_status_on     TEXT,
  status             TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  source             TEXT NOT NULL DEFAULT 'portal' CHECK (source IN ('portal', 'kennelos')),
  kennelos_id        TEXT,
  edited_fields      TEXT NOT NULL DEFAULT '[]',
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_portal_placements_family ON portal_placements (family_id);
CREATE INDEX IF NOT EXISTS idx_portal_placements_site ON portal_placements (site_id, status);
CREATE INDEX IF NOT EXISTS idx_portal_placements_puppy ON portal_placements (puppy_id);

-- Vet proof, the contract and record attachments, in R2 under
-- sites/<site>/portal/ (so closing a site removes them with the rest).
CREATE TABLE IF NOT EXISTS portal_files (
  id            TEXT PRIMARY KEY,
  site_id       TEXT NOT NULL REFERENCES sites(id),
  placement_id  TEXT NOT NULL REFERENCES portal_placements(id),
  kind          TEXT NOT NULL CHECK (kind IN ('proof', 'contract', 'record')),
  r2_key        TEXT NOT NULL,
  type          TEXT NOT NULL,
  bytes         INTEGER NOT NULL,
  name          TEXT,
  uploaded_by   TEXT NOT NULL CHECK (uploaded_by IN ('family', 'breeder')),
  uploaded_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_portal_files_placement ON portal_files (placement_id);

-- Shots, deworming and vet visits, on the placement (records given before the
-- family existed are typed onto it by her).
CREATE TABLE IF NOT EXISTS portal_health_records (
  id            TEXT PRIMARY KEY,
  site_id       TEXT NOT NULL REFERENCES sites(id),
  placement_id  TEXT NOT NULL REFERENCES portal_placements(id),
  type          TEXT NOT NULL CHECK (type IN ('vaccine', 'deworming', 'vet_visit', 'other')),
  given_on      TEXT NOT NULL,
  name          TEXT NOT NULL,
  notes         TEXT,
  source        TEXT NOT NULL DEFAULT 'portal' CHECK (source IN ('portal', 'kennelos')),
  kennelos_id   TEXT,
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_portal_health_placement ON portal_health_records (placement_id, given_on);

-- Every email the portal sends, per address: her evidence (plan section 5).
-- basis: the deadline (or go-home) a reminder was counted from, so a moved pickup
-- sends fresh reminders and the log shows which time each came from.
CREATE TABLE IF NOT EXISTS portal_email_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id       TEXT NOT NULL REFERENCES sites(id),
  family_id     TEXT,
  placement_id  TEXT,
  kind          TEXT NOT NULL,
  basis         TEXT,
  address_hash  TEXT NOT NULL,
  provider_id   TEXT,
  result        TEXT NOT NULL CHECK (result IN ('sent', 'outbox', 'failed', 'delivered', 'bounced')),
  sent_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_portal_email_log_placement ON portal_email_log (placement_id, kind, basis);
CREATE INDEX IF NOT EXISTS idx_portal_email_log_family ON portal_email_log (family_id);

-- Every change to a portal record, with when and by whom (plan 3.1).
CREATE TABLE IF NOT EXISTS portal_history (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id     TEXT NOT NULL REFERENCES sites(id),
  tbl         TEXT NOT NULL,
  row_id      TEXT NOT NULL,
  field       TEXT NOT NULL,
  old_value   TEXT,
  new_value   TEXT,
  changed_at  TEXT NOT NULL,
  changed_by  TEXT NOT NULL CHECK (changed_by IN ('breeder', 'family', 'kennelos', 'portal'))
);
CREATE INDEX IF NOT EXISTS idx_portal_history_row ON portal_history (tbl, row_id, changed_at);

-- Program link clicks (plan 12.1). family_id is cleared when an account goes.
CREATE TABLE IF NOT EXISTS portal_clicks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id     TEXT NOT NULL REFERENCES sites(id),
  family_id   TEXT,
  product_id  TEXT NOT NULL,
  place       TEXT NOT NULL,
  at          TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_portal_clicks_site ON portal_clicks (site_id, product_id);

-- The vet visit's count as her setting, whether she has saved her portal settings, and
-- her automatic invites (2026-11-25, the owner: a second breeder's contract is 72 hours,
-- a third's 48, so the count can't be fixed in code). Additive only: new columns and two new tables (resources, the potty schedule; their notes below).
--
-- portal_settings.vet_count: the number of hours or days her contract gives. vet_rule
-- (its CHECK still allows only 'hours72' and 'days3') now says only how it's counted,
-- hours or days; empty means 72 or 3, as every site is counted today
-- (portal/store.js getSettings joins the two into one rule, "hours48").
--
-- portal_settings.saved_at: when she first saved her portal settings. Until then the
-- defaults (Eastern, 72 hours) are only a starting point, so no invite or vet reminder
-- goes out. A row can exist without her saving it (KennelOS fills in her vet), so the
-- row alone doesn't say it. Every row today belongs to a portal already running, so
-- each counts as saved from its last change.
ALTER TABLE portal_settings ADD COLUMN vet_count INTEGER;
ALTER TABLE portal_settings ADD COLUMN saved_at TEXT;
UPDATE portal_settings SET saved_at = COALESCE(updated_at, '2026-11-25T00:00:00.000Z') WHERE saved_at IS NULL;

-- portal_settings.auto_invite_at: when she switched on "Send invites by themselves"; empty
-- is off, as for every site today. Only families added from then on are invited by
-- themselves (portal/auth.js autoInvite), so switching it on never invites a family she
-- chose not to.
ALTER TABLE portal_settings ADD COLUMN auto_invite_at TEXT;

-- Resources (docs/plans/portal-resources-potty.md section 1): her links and PDFs for
-- families, on their Resources page (a Quick link). kind: 'link' (url, or a program of hers,
-- product_id) or 'file' (r2_key under sites/<site>/portal/resources/, a PDF or photo).
-- heading: her own, optional, groups the list. shown: 0 hides it from families, kept.
CREATE TABLE IF NOT EXISTS portal_resources (
  id          TEXT PRIMARY KEY,
  site_id     TEXT NOT NULL REFERENCES sites(id),
  kind        TEXT NOT NULL CHECK (kind IN ('link', 'file')),
  title       TEXT NOT NULL,
  note        TEXT,
  heading     TEXT,
  url         TEXT,
  product_id  TEXT,
  r2_key      TEXT,
  type        TEXT,
  bytes       INTEGER,
  shown       INTEGER NOT NULL DEFAULT 1,
  sort        INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_portal_resources_site ON portal_resources (site_id, sort);

-- The potty schedule (plan section 2): each family's answers for their puppy, from which
-- the page works out the day's schedule by the puppy's age (portal/potty.js). wake and
-- bed are local times "HH:MM"; meals a comma list of times.
CREATE TABLE IF NOT EXISTS portal_potty (
  placement_id TEXT PRIMARY KEY REFERENCES portal_placements(id),
  site_id      TEXT NOT NULL REFERENCES sites(id),
  wake         TEXT NOT NULL,
  bed          TEXT NOT NULL,
  meals        TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_portal_potty_site ON portal_potty (site_id);

-- Her potty guide: her own text (empty: the suggested guide), off (the guide not shown),
-- and the potty page off for her whole site.
ALTER TABLE portal_settings ADD COLUMN potty_guide TEXT;
ALTER TABLE portal_settings ADD COLUMN potty_guide_off INTEGER NOT NULL DEFAULT 0;
ALTER TABLE portal_settings ADD COLUMN potty_off INTEGER NOT NULL DEFAULT 0;

-- A timeline task that opens a page of theirs and ticks itself there: 'potty' (their potty
-- schedule; done once they make it). Its own column, as auto's CHECK allows only the vet and
-- pickup kinds; the code reads the two as one (portal/steps.js autoOf).
ALTER TABLE portal_timeline_tasks ADD COLUMN opens TEXT;

-- The families' Training page (the AKC's guides, portal/training.js): on unless she
-- switches it off for her site on her Resources screen.
ALTER TABLE portal_settings ADD COLUMN training_off INTEGER NOT NULL DEFAULT 0;

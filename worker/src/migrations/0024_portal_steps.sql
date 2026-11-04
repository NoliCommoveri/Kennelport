-- The Puppy Parent Portal, build chunk 2 (docs/Puppy_Parent_Portal_Plan.md sections
-- 4, 6, 7.2 and 9): the go-home checklist and the first-weeks timeline (her
-- templates, plus additions for one family), each family's ticks, hidden steps and
-- moved dates, each family's program status and their own code, and What she's
-- eating now. Additive only.

-- What the puppies eat now, for the food band on the family's Home (plan 7.2):
-- the exact food, the bag, how much and how often, and a line of her own.
ALTER TABLE portal_settings ADD COLUMN food_name TEXT;
ALTER TABLE portal_settings ADD COLUMN food_bag TEXT;
ALTER TABLE portal_settings ADD COLUMN food_how TEXT;
ALTER TABLE portal_settings ADD COLUMN food_note TEXT;

-- A program whose code or certificate is different for each family (plan 9): the
-- family sees their own, typed by her on their screen.
ALTER TABLE products ADD COLUMN portal_per_family INTEGER NOT NULL DEFAULT 0;

-- Go-home checklist items. placement_id NULL: her template, on every family's
-- list; set: an item she added for that family alone. product_id: the program the
-- item links to. auto: ticked by the portal itself (vet_booked: "I've booked it").
-- {name} in a title is the puppy's name, {food} her food.
CREATE TABLE IF NOT EXISTS portal_checklist_items (
  id            TEXT PRIMARY KEY,
  site_id       TEXT NOT NULL REFERENCES sites(id),
  placement_id  TEXT REFERENCES portal_placements(id),
  title         TEXT NOT NULL,
  product_id    TEXT,
  auto          TEXT CHECK (auto IN ('vet_booked')),
  sort          INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_portal_checklist_site ON portal_checklist_items (site_id, placement_id, sort);

-- First-weeks timeline tasks: each counts from the puppy's birth or from pickup,
-- offset_days before (negative) or after. A birth-dated task due by go-home is
-- hers ("done before go-home"); the rest are the family's. auto: done when the
-- portal sees it happen (vet_booking, pickup, vet_visit), and the vet visit is
-- dated by the real deadline. button_label: the words on its program link.
CREATE TABLE IF NOT EXISTS portal_timeline_tasks (
  id            TEXT PRIMARY KEY,
  site_id       TEXT NOT NULL REFERENCES sites(id),
  placement_id  TEXT REFERENCES portal_placements(id),
  title         TEXT NOT NULL,
  body          TEXT,
  count_from    TEXT NOT NULL CHECK (count_from IN ('birth', 'pickup')),
  offset_days   INTEGER NOT NULL DEFAULT 0,
  product_id    TEXT,
  button_label  TEXT,
  auto          TEXT CHECK (auto IN ('vet_booking', 'pickup', 'vet_visit')),
  sort          INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_portal_timeline_site ON portal_timeline_tasks (site_id, placement_id, sort);

-- One family's state for one checklist item or timeline task: ticked (done_at,
-- done_by), hidden from their list by her, or a task moved to another day.
CREATE TABLE IF NOT EXISTS portal_placement_progress (
  site_id       TEXT NOT NULL REFERENCES sites(id),
  placement_id  TEXT NOT NULL REFERENCES portal_placements(id),
  item_type     TEXT NOT NULL CHECK (item_type IN ('checklist', 'task')),
  item_id       TEXT NOT NULL,
  done_at       TEXT,
  done_by       TEXT CHECK (done_by IN ('family', 'breeder')),
  hidden        INTEGER NOT NULL DEFAULT 0,
  due_on        TEXT,
  updated_at    TEXT NOT NULL,
  PRIMARY KEY (placement_id, item_type, item_id)
);

-- Each family's status in each program (plan 9): not started, clicked (through
-- the portal's link), done (they or she marked it). code: their own code or
-- certificate, for a program that gives one per family. Clicks and statuses
-- tell her who to nudge; sign-ups come from the programs' own reports (12.1).
CREATE TABLE IF NOT EXISTS portal_placements_programs (
  site_id       TEXT NOT NULL REFERENCES sites(id),
  placement_id  TEXT NOT NULL REFERENCES portal_placements(id),
  product_id    TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'clicked', 'done')),
  code          TEXT,
  updated_at    TEXT NOT NULL,
  updated_by    TEXT NOT NULL CHECK (updated_by IN ('family', 'breeder', 'portal')),
  PRIMARY KEY (placement_id, product_id)
);

-- ---------- chunk 3: the KennelOS family feed ----------

-- When the family feed last arrived (her "Last from KennelOS"), per site.
ALTER TABLE sites ADD COLUMN portal_feed_at TEXT;

-- status_url: the family's KennelOS status page, for "Book your pickup on your
-- status page" before pickup. kennelos_gone_at: KennelOS no longer sends it; she
-- decides what that means (plan 3.1), nothing is removed.
ALTER TABLE portal_families ADD COLUMN status_url TEXT;
ALTER TABLE portal_families ADD COLUMN kennelos_gone_at TEXT;

-- closed_reason: why a placement closed (a sale voided in KennelOS: the pup died,
-- failed a health check, or the family backed out). contract_signed_on: the signed
-- contract's date from KennelOS, the start of the portal for that family.
ALTER TABLE portal_placements ADD COLUMN closed_reason TEXT CHECK (closed_reason IN ('died', 'failed_health', 'backed_out', 'other'));
ALTER TABLE portal_placements ADD COLUMN contract_signed_on TEXT;
ALTER TABLE portal_placements ADD COLUMN kennelos_gone_at TEXT;
ALTER TABLE portal_health_records ADD COLUMN kennelos_gone_at TEXT;
CREATE INDEX IF NOT EXISTS idx_portal_placements_kennelos ON portal_placements (site_id, kennelos_id);
CREATE INDEX IF NOT EXISTS idx_portal_families_kennelos ON portal_families (site_id, kennelos_id);

-- A value KennelOS sent for a field she has edited (plan 3.1): her value stays;
-- her screen offers "use it / ignore". Ignored: that value isn't offered again.
CREATE TABLE IF NOT EXISTS portal_suggestions (
  site_id     TEXT NOT NULL REFERENCES sites(id),
  tbl         TEXT NOT NULL,
  row_id      TEXT NOT NULL,
  field       TEXT NOT NULL,
  value       TEXT,
  ignored     INTEGER NOT NULL DEFAULT 0,
  sent_at     TEXT NOT NULL,
  PRIMARY KEY (tbl, row_id, field)
);
CREATE INDEX IF NOT EXISTS idx_portal_suggestions_site ON portal_suggestions (site_id, ignored);

-- Deleted stays deleted (plan 3.1): a KennelOS record she deleted, by its id and
-- type only (no name or email), so the next feed doesn't bring it back.
CREATE TABLE IF NOT EXISTS portal_tombstones (
  site_id      TEXT NOT NULL REFERENCES sites(id),
  type         TEXT NOT NULL CHECK (type IN ('family', 'placement', 'health')),
  kennelos_id  TEXT NOT NULL,
  deleted_at   TEXT NOT NULL,
  PRIMARY KEY (site_id, type, kennelos_id)
);

-- The status page's one-tap links into the portal (plan 3.4): each works once.
CREATE TABLE IF NOT EXISTS portal_handoffs (
  nonce_hash  TEXT PRIMARY KEY,
  site_id     TEXT NOT NULL REFERENCES sites(id),
  used_at     TEXT NOT NULL
);

-- ---------- chunk 4: messages, the loss page, bounces, delete and erase ----------

-- Messages between the family and her, from pickup on (plan 2). With the family's
-- account: an erase or a final delete takes them.
CREATE TABLE IF NOT EXISTS portal_messages (
  id            TEXT PRIMARY KEY,
  site_id       TEXT NOT NULL REFERENCES sites(id),
  family_id     TEXT NOT NULL REFERENCES portal_families(id),
  sender        TEXT NOT NULL CHECK (sender IN ('family', 'breeder')),
  body          TEXT NOT NULL,
  sent_at       TEXT NOT NULL,
  read_at       TEXT
);
CREATE INDEX IF NOT EXISTS idx_portal_messages_family ON portal_messages (family_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_portal_messages_unread ON portal_messages (site_id, sender, read_at);

-- When a puppy dies or fails a health check before pickup (plan 7.4): her own
-- note for the family, when she saved it, and when (if) she emailed it.
ALTER TABLE portal_placements ADD COLUMN loss_note TEXT;
ALTER TABLE portal_placements ADD COLUMN loss_note_at TEXT;
ALTER TABLE portal_placements ADD COLUMN loss_sent_at TEXT;

-- deleted_at: she deleted the family (or they backed out), undoable until the
-- daily cleanup finishes it 30 days later. delete_reason: 'breeder' or
-- 'backed_out'. erased_at: the family asked for their data to go (status
-- 'erased'); their sale records stay, the account doesn't.
ALTER TABLE portal_families ADD COLUMN deleted_at TEXT;
ALTER TABLE portal_families ADD COLUMN delete_reason TEXT CHECK (delete_reason IN ('breeder', 'backed_out'));
ALTER TABLE portal_families ADD COLUMN erased_at TEXT;

-- Resend's webhook matches its events to the log by message id.
CREATE INDEX IF NOT EXISTS idx_portal_email_log_provider ON portal_email_log (provider_id);

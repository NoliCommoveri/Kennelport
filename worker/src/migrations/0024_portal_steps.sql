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

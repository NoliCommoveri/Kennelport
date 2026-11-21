-- The go-home bag (2026-11-21, docs/plans/portal-go-home-bag.md; family-portal.md 8.4).
-- Additive only: two new tables, empty until she adds an item, and one column.
--
-- portal_bag_items: her bag template, in her order. cost_cents and expense are hers
-- alone (families never see them); expense: she expenses it. origin: where it comes
-- from, in her words. product_id: the program it's tied to; button: her words on the
-- family's button for it. shown = 0: off, not in the bag for new families. From
-- KennelOS (bundle section bag_items): source 'kennelos' with its kennelos_id, and
-- hidden_by_kennelos when KennelOS stops sending it (never deleted).
CREATE TABLE IF NOT EXISTS portal_bag_items (
  id                 TEXT PRIMARY KEY,
  site_id            TEXT NOT NULL REFERENCES sites(id),
  name               TEXT NOT NULL,
  cost_cents         INTEGER NOT NULL DEFAULT 0,
  expense            INTEGER NOT NULL DEFAULT 1,
  origin             TEXT,
  product_id         TEXT REFERENCES products(id),
  button             TEXT,
  shown              INTEGER NOT NULL DEFAULT 1,
  sort               INTEGER NOT NULL DEFAULT 0,
  source             TEXT NOT NULL DEFAULT 'kennelport',
  kennelos_id        TEXT,
  hidden_by_kennelos INTEGER NOT NULL DEFAULT 0,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_portal_bag_items_site ON portal_bag_items (site_id, sort);
CREATE INDEX IF NOT EXISTS idx_portal_bag_items_kennelos ON portal_bag_items (site_id, kennelos_id);

-- portal_placement_bag: what one puppy went home with, each item as it was when it
-- went (its name, cost, expense, program and button), so a later change to her
-- template never rewrites it. bag_item_id: the template item, null for one she added
-- for this family alone. Kept with her sale records when a family's account is erased.
CREATE TABLE IF NOT EXISTS portal_placement_bag (
  id           TEXT PRIMARY KEY,
  site_id      TEXT NOT NULL REFERENCES sites(id),
  placement_id TEXT NOT NULL REFERENCES portal_placements(id),
  bag_item_id  TEXT,
  name         TEXT NOT NULL,
  cost_cents   INTEGER NOT NULL DEFAULT 0,
  expense      INTEGER NOT NULL DEFAULT 1,
  product_id   TEXT,
  button       TEXT,
  sort         INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_portal_placement_bag ON portal_placement_bag (placement_id, sort);

-- When the placement's bag became its own (her Save, or Mark picked up); null: it
-- reads her template. Set with no rows: nothing went.
ALTER TABLE portal_placements ADD COLUMN bag_saved_at TEXT;

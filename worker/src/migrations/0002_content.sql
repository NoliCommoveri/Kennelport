-- Phase 1: the content the first template shows, the published snapshots and the
-- redirects (plan sections 3, 4.1 and 6). Additive only. Each content table is
-- part of the draft: every edit lands here, and nothing visitors see changes
-- until Publish writes a snapshot (plan 4.1).
--
-- Conventions: ids are random UUIDs; date-only fields are YYYY-MM-DD; created_at
-- and updated_at are full ISO timestamps; `sort` orders a list; `source` is
-- 'kennelport' or 'kennelos', and `kennelos_id` / `hidden_by_kennelos` serve the
-- KennelOS link (phase 4, plan 5.3).

-- The kennel's own details, shown in the header, footer, contact page and share
-- previews.
ALTER TABLE sites ADD COLUMN tagline TEXT;
ALTER TABLE sites ADD COLUMN blurb TEXT;
ALTER TABLE sites ADD COLUMN breed TEXT;
ALTER TABLE sites ADD COLUMN monogram TEXT;
ALTER TABLE sites ADD COLUMN town TEXT;
ALTER TABLE sites ADD COLUMN region TEXT;
ALTER TABLE sites ADD COLUMN contact_email TEXT;
ALTER TABLE sites ADD COLUMN contact_phone TEXT;
ALTER TABLE sites ADD COLUMN facebook_url TEXT;
ALTER TABLE sites ADD COLUMN facebook_label TEXT;
ALTER TABLE sites ADD COLUMN instagram_url TEXT;
-- Prices not tied to a litter (extras now; delivery, stud and adults later)
-- show only with this on (plan 3.2), off by default.
ALTER TABLE sites ADD COLUMN show_other_prices INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sites ADD COLUMN draft_changed_at TEXT;

-- Photos (plan 4.2). Files live in R2 under sites/<site_id>/photos/; a photo is
-- served only if the published snapshot lists it.
CREATE TABLE IF NOT EXISTS photos (
  id          TEXT PRIMARY KEY,
  site_id     TEXT NOT NULL REFERENCES sites(id),
  r2_key      TEXT NOT NULL,
  thumb_key   TEXT,
  type        TEXT NOT NULL CHECK (type IN ('image/webp', 'image/jpeg')),
  width       INTEGER,
  height      INTEGER,
  bytes       INTEGER NOT NULL,
  alt         TEXT,
  removed_at  TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_photos_site ON photos (site_id);

CREATE TABLE IF NOT EXISTS dogs (
  id                  TEXT PRIMARY KEY,
  site_id             TEXT NOT NULL REFERENCES sites(id),
  slug                TEXT NOT NULL,
  call_name           TEXT NOT NULL,
  registered_name     TEXT,
  sex                 TEXT NOT NULL CHECK (sex IN ('female', 'male')),
  role                TEXT,
  color               TEXT,
  date_of_birth       TEXT,
  titles              TEXT,
  bio                 TEXT,
  photo_id            TEXT,
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'retired', 'remembered')),
  health_display      TEXT NOT NULL DEFAULT 'normal_only' CHECK (health_display IN ('normal_only', 'all', 'none')),
  show_on_site        INTEGER NOT NULL DEFAULT 1,
  sort                INTEGER NOT NULL DEFAULT 0,
  source              TEXT NOT NULL DEFAULT 'kennelport',
  kennelos_id         TEXT,
  hidden_by_kennelos  INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL,
  UNIQUE (site_id, slug)
);

-- Health results (plan 3.7): each one private until ticked.
CREATE TABLE IF NOT EXISTS health_results (
  id          TEXT PRIMARY KEY,
  site_id     TEXT NOT NULL REFERENCES sites(id),
  dog_id      TEXT NOT NULL REFERENCES dogs(id),
  test        TEXT NOT NULL,
  result      TEXT NOT NULL,
  normal      INTEGER NOT NULL DEFAULT 1,
  date        TEXT,
  verify_url  TEXT,
  show        INTEGER NOT NULL DEFAULT 0,
  sort        INTEGER NOT NULL DEFAULT 0,
  source      TEXT NOT NULL DEFAULT 'kennelport'
);
CREATE INDEX IF NOT EXISTS idx_health_dog ON health_results (dog_id);

-- Litters: planned (before birth), current, older (puppies still here past
-- going-home) or past. Parents are this site's dogs, or a typed name for a dog
-- that isn't on the site.
CREATE TABLE IF NOT EXISTS litters (
  id                  TEXT PRIMARY KEY,
  site_id             TEXT NOT NULL REFERENCES sites(id),
  slug                TEXT NOT NULL,
  name                TEXT NOT NULL,
  stage               TEXT NOT NULL CHECK (stage IN ('planned', 'current', 'past')),
  plan_label          TEXT,
  dam_id              TEXT REFERENCES dogs(id),
  sire_id             TEXT REFERENCES dogs(id),
  dam_name            TEXT,
  sire_name           TEXT,
  born_on             TEXT,
  ready_on            TEXT,
  expected_label      TEXT,
  ready_label         TEXT,
  summary             TEXT,
  show_on_site        INTEGER NOT NULL DEFAULT 1,
  sort                INTEGER NOT NULL DEFAULT 0,
  source              TEXT NOT NULL DEFAULT 'kennelport',
  kennelos_id         TEXT,
  hidden_by_kennelos  INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL,
  UNIQUE (site_id, slug)
);

-- Puppy statuses are plan 3.6's fixed list.
CREATE TABLE IF NOT EXISTS puppies (
  id                  TEXT PRIMARY KEY,
  site_id             TEXT NOT NULL REFERENCES sites(id),
  litter_id           TEXT NOT NULL REFERENCES litters(id),
  slug                TEXT NOT NULL,
  name                TEXT NOT NULL,
  collar              TEXT,
  sex                 TEXT NOT NULL CHECK (sex IN ('female', 'male')),
  color               TEXT,
  status              TEXT NOT NULL DEFAULT 'coming_soon' CHECK (status IN ('available', 'reserved', 'placed', 'staying', 'coming_soon', 'hidden')),
  bio                 TEXT,
  photo_id            TEXT,
  sort                INTEGER NOT NULL DEFAULT 0,
  source              TEXT NOT NULL DEFAULT 'kennelport',
  kennelos_id         TEXT,
  hidden_by_kennelos  INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL,
  UNIQUE (litter_id, slug)
);

-- Reviews (plan 3.9, decision 13). Phase 1: added by the operator with the
-- family's agreement; the family form and approval queue are phase 2.
CREATE TABLE IF NOT EXISTS stories (
  id                       TEXT PRIMARY KEY,
  site_id                  TEXT NOT NULL REFERENCES sites(id),
  kind                     TEXT NOT NULL DEFAULT 'review' CHECK (kind IN ('review', 'at_home')),
  quote                    TEXT NOT NULL,
  rating                   INTEGER CHECK (rating BETWEEN 1 AND 5),
  first_name               TEXT NOT NULL,
  town                     TEXT,
  puppy_name               TEXT,
  home_month               TEXT,
  topic                    TEXT,
  photo_id                 TEXT,
  submitted_by             TEXT NOT NULL DEFAULT 'breeder' CHECK (submitted_by IN ('family', 'breeder')),
  status                   TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'hidden')),
  permission_confirmed_at  TEXT,
  sort                     INTEGER NOT NULL DEFAULT 0,
  submitted_at             TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_stories_site ON stories (site_id);

-- How it works steps (and later the raising page, backlog).
CREATE TABLE IF NOT EXISTS steps (
  id        TEXT PRIMARY KEY,
  site_id   TEXT NOT NULL REFERENCES sites(id),
  page      TEXT NOT NULL CHECK (page IN ('how_it_works', 'raising')),
  sort      INTEGER NOT NULL DEFAULT 0,
  heading   TEXT NOT NULL,
  body      TEXT,
  detail    TEXT,
  pay_link  INTEGER NOT NULL DEFAULT 0,
  source    TEXT NOT NULL DEFAULT 'kennelport'
);

-- Policies, FAQ and the status-page help (plan 3.12).
CREATE TABLE IF NOT EXISTS expanders (
  id          TEXT PRIMARY KEY,
  site_id     TEXT NOT NULL REFERENCES sites(id),
  page        TEXT NOT NULL CHECK (page IN ('policies', 'faq', 'waitlist_help')),
  sort        INTEGER NOT NULL DEFAULT 0,
  heading     TEXT NOT NULL,
  body        TEXT NOT NULL,
  start_open  INTEGER NOT NULL DEFAULT 0
);

-- Extras and extended-homegoing packages (plan 3.4). Prices in whole dollars;
-- price_to only for a range.
CREATE TABLE IF NOT EXISTS extras (
  id           TEXT PRIMARY KEY,
  site_id      TEXT NOT NULL REFERENCES sites(id),
  kind         TEXT NOT NULL CHECK (kind IN ('item', 'homegoing')),
  grp          TEXT,
  name         TEXT NOT NULL,
  description  TEXT,
  photo_id     TEXT,
  price_from   INTEGER,
  price_to     INTEGER,
  weeks        INTEGER,
  lead_in      TEXT,
  checklist    TEXT,
  closing      TEXT,
  featured     INTEGER NOT NULL DEFAULT 0,
  sort         INTEGER NOT NULL DEFAULT 0,
  source       TEXT NOT NULL DEFAULT 'kennelport'
);

-- Home, block by block (plan 3.12). content is JSON whose keys the content model
-- (src/content/model.js) names; nothing else is kept.
CREATE TABLE IF NOT EXISTS home_blocks (
  site_id  TEXT NOT NULL REFERENCES sites(id),
  block    TEXT NOT NULL CHECK (block IN ('hero', 'facts', 'story', 'dogs', 'litters', 'reviews', 'waitlist')),
  enabled  INTEGER NOT NULL DEFAULT 1,
  content  TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY (site_id, block)
);

-- Each page's switch, menu label and wording (plan 3.12). content is JSON, as
-- for home_blocks.
CREATE TABLE IF NOT EXISTS site_pages (
  site_id     TEXT NOT NULL REFERENCES sites(id),
  page        TEXT NOT NULL,
  enabled     INTEGER NOT NULL DEFAULT 1,
  menu_label  TEXT,
  content     TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY (site_id, page)
);

-- Published snapshots (plan 4.1): the JSON is in R2 at r2_key; the last 10 per
-- site are kept.
CREATE TABLE IF NOT EXISTS snapshots (
  id            TEXT PRIMARY KEY,
  site_id       TEXT NOT NULL REFERENCES sites(id),
  published_at  TEXT NOT NULL,
  published_by  TEXT NOT NULL,
  r2_key        TEXT NOT NULL,
  bytes         INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_snapshots_site ON snapshots (site_id, published_at);

-- Old addresses that keep working after a slug changes (plan 3.1), written at
-- publish time.
CREATE TABLE IF NOT EXISTS redirects (
  site_id     TEXT NOT NULL REFERENCES sites(id),
  old_path    TEXT NOT NULL,
  new_path    TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  PRIMARY KEY (site_id, old_path)
);

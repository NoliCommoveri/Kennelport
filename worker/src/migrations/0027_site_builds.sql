-- The owner's build for each site (docs/Site_Builder_Plan.md, step 1): its display
-- and timing rules, as JSON holding only what she changed from today's behaviour
-- (content/rules.js lays it over the defaults). No row: every rule is the default,
-- so no site looks different the day this ships. Additive only.
CREATE TABLE IF NOT EXISTS site_builds (
  site_id     TEXT PRIMARY KEY REFERENCES sites(id),
  build       TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

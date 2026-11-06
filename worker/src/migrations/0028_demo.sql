-- The demo site (docs/Linked_Sample_Plan.md, step 3), the breeder's switches for
-- blocks the owner adds, and the owner's wording for the Site Manager (below).
-- The demo: a site made in /ops from the linked sample, for the owner only.
-- demo_step is the sample step it holds (1–5);
-- NULL for every real site. A demo is never served at its address, never
-- published, and can't be invited to, given a domain or linked to a real KennelOS
-- (kennelos/demo.js). Additive only.
ALTER TABLE sites ADD COLUMN demo_step INTEGER;

-- The site builder, step 2 (docs/Site_Builder_Plan.md): the breeder's switch and
-- words for each block the owner adds to a page (content/blocks.js addedBlocks),
-- kept apart from the owner's build so Reset to template leaves them alone. page
-- is the page's key (home, dogs, x-<her page>…), block the block's id. content is
-- JSON: eyebrow, heading, lede. A page the owner adds keeps its switch, menu name
-- and heading in site_pages, as every page does.
CREATE TABLE IF NOT EXISTS block_switches (
  site_id  TEXT NOT NULL REFERENCES sites(id),
  page     TEXT NOT NULL,
  block    TEXT NOT NULL,
  enabled  INTEGER NOT NULL DEFAULT 1,
  content  TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY (site_id, page, block)
);

-- The site builder, step 2 (docs/Site_Builder_Plan.md, decision 19): the owner's
-- wording for the breeder's Site Manager, for every site (manage/wording.js). key
-- is the item's key in the list; a site's own wording is in its build. Only what
-- the owner changed is stored; everything else is today's wording.
CREATE TABLE IF NOT EXISTS wording (
  key         TEXT PRIMARY KEY,
  text        TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

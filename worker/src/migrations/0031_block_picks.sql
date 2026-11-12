-- The breeder's own choice of records on a data block (docs/plans/kennelos-contract.md
-- B3 and B5, the owner's decision of 2026-11-12; content/picks.js): on any Dog cards,
-- Litter cards or Pup cards block, the records she unticked (omit); on a Featured
-- block, the ones she picked, in her order (pick), and any she features on set dates
-- (fixed). Kept apart from the owner's build (site_builds), so a change to the owner's
-- settings never undoes them. page is the page's key (home, dogs, x-<her page>…),
-- block the block's id; picks is JSON. Additive only: a new table.
CREATE TABLE IF NOT EXISTS block_picks (
  site_id     TEXT NOT NULL REFERENCES sites(id),
  page        TEXT NOT NULL,
  block       TEXT NOT NULL,
  picks       TEXT NOT NULL DEFAULT '{}',
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (site_id, page, block)
);

-- KennelOS's raw values (docs/plans/kennelos-contract.md Part C, step 4), each kept as
-- KennelOS sent it so the site's rules and blocks can read it: a litter pup's
-- disposition (pup_disposition), a litter's KennelOS status (litter_status), a health
-- result's KennelOS test type (health_detail) and a product's KennelOS account type
-- (account_type). Null until a KennelOS that sends them presses Update website.
-- And the breeder's site-wide switch to group a dog's health results by that test
-- type on its page (off, one list, as before).
-- A dog's titles as KennelOS sends them with titles_detail: one row each, with its
-- organization and date (C3); the dog's titles line stays their abbreviations.
-- Additive only: five new columns and a new table.
ALTER TABLE puppies ADD COLUMN disposition TEXT;
ALTER TABLE litters ADD COLUMN kennelos_status TEXT;
ALTER TABLE health_results ADD COLUMN test_type TEXT;
ALTER TABLE products ADD COLUMN account_type TEXT;
ALTER TABLE sites ADD COLUMN group_health INTEGER NOT NULL DEFAULT 0;
CREATE TABLE dog_titles (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  dog_id TEXT NOT NULL,
  abbr TEXT NOT NULL,
  organization TEXT,
  earned_on TEXT,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX dog_titles_dog ON dog_titles (site_id, dog_id);

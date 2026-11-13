-- KennelOS's raw values (docs/plans/kennelos-contract.md Part C, step 4), each kept as
-- KennelOS sent it so the site's rules and blocks can read it: a litter pup's
-- disposition (pup_disposition), a litter's KennelOS status (litter_status), a health
-- result's KennelOS test type (health_detail) and a product's KennelOS account type
-- (account_type). Null until a KennelOS that sends them presses Update website.
-- And the breeder's site-wide switch to group a dog's health results by that test
-- type on its page (off, one list, as before).
-- Additive only: five new columns.
ALTER TABLE puppies ADD COLUMN disposition TEXT;
ALTER TABLE litters ADD COLUMN kennelos_status TEXT;
ALTER TABLE health_results ADD COLUMN test_type TEXT;
ALTER TABLE products ADD COLUMN account_type TEXT;
ALTER TABLE sites ADD COLUMN group_health INTEGER NOT NULL DEFAULT 0;

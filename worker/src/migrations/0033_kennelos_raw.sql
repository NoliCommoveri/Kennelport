-- KennelOS's raw values (docs/plans/kennelos-contract.md Part C, step 4), each kept as
-- KennelOS sent it so the site's rules and blocks can read it: a litter pup's
-- disposition (pup_disposition), a litter's KennelOS status (litter_status), a health
-- result's KennelOS test type (health_detail) and a product's KennelOS account type
-- (account_type). Null until a KennelOS that sends them presses Update website.
-- Additive only: four new columns.
ALTER TABLE puppies ADD COLUMN disposition TEXT;
ALTER TABLE litters ADD COLUMN kennelos_status TEXT;
ALTER TABLE health_results ADD COLUMN test_type TEXT;
ALTER TABLE products ADD COLUMN account_type TEXT;

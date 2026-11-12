-- A dog's sire and dam (docs/plans/kennelos-contract.md B6, as the owner set it on
-- 2026-11-12): each a dog on the site (sire_id, dam_id), or a name typed for one that
-- isn't (sire_name, dam_name), as a litter's parents are. A featured offspring she
-- sold is an outside dog ("not my dog") whose sire or dam is her dog; its own
-- offspring chain on from it. KennelOS's lineage (step 6) fills the same columns.
-- Additive only.
ALTER TABLE dogs ADD COLUMN sire_id TEXT;
ALTER TABLE dogs ADD COLUMN dam_id TEXT;
ALTER TABLE dogs ADD COLUMN sire_name TEXT;
ALTER TABLE dogs ADD COLUMN dam_name TEXT;

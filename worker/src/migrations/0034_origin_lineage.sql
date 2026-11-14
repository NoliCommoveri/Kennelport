-- Origin and lineage (docs/plans/kennelos-contract.md C4, C7, step 6).
-- A dog's origin: imported (1, 0, or null when never said) and its country of origin,
-- KennelOS's with the origin section (kennelos_origin marks that), else hers on the
-- dog's form. Its breed, KennelOS's with lineage. Her switch to leave one dog out of
-- Import-descended (import_descended_off), for a pedigree KennelOS holds only in part.
-- KennelOS's lineage: the dog's ancestors, up to four generations, as JSON
-- ([{ path, id, call_name, registered_name, titles, imported, import_country }]);
-- null until a KennelOS that sends lineage presses Update website.
-- A record she made from a KennelOS ancestor known only by name keeps that
-- ancestor's KennelOS id (kennelos_ancestor_id), so the pedigree links to it.
-- Her switch to leave one dog out of Champion-descended (champion_descended_off), as
-- for Import-descended.
-- Additive only: eight new columns.
ALTER TABLE dogs ADD COLUMN imported INTEGER;
ALTER TABLE dogs ADD COLUMN import_country TEXT;
ALTER TABLE dogs ADD COLUMN breed TEXT;
ALTER TABLE dogs ADD COLUMN import_descended_off INTEGER;
ALTER TABLE dogs ADD COLUMN ancestors TEXT;
ALTER TABLE dogs ADD COLUMN kennelos_origin INTEGER NOT NULL DEFAULT 0;
ALTER TABLE dogs ADD COLUMN kennelos_ancestor_id TEXT;
ALTER TABLE dogs ADD COLUMN champion_descended_off INTEGER;

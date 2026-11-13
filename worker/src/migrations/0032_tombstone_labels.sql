-- Giving a deleted family back (the owner's decision of 2026-11-13): a family she
-- deleted for good stays deleted, but she can let KennelOS send them again. So a
-- family's tombstone keeps the name she knew them by (label: the family's name and
-- their puppy's, no email address), and every tombstone written with a family's
-- delete keeps that family's KennelOS id, so giving them back lifts all of them
-- together. Older tombstones have neither; they're grouped by their deleted_at, which
-- one delete shares. Additive only: two new columns.
ALTER TABLE portal_tombstones ADD COLUMN label TEXT;
ALTER TABLE portal_tombstones ADD COLUMN family_kennelos_id TEXT;

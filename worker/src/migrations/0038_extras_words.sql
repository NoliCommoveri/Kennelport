-- Her own words on an extra (the Extras block, 2026-11-18): `site_description`, her
-- description for the website, shown instead of KennelOS's (which stays KennelOS's,
-- replaced by each bundle); and `details`, the longer words behind "More details".
-- Both hers, never sent by KennelOS. Additive only: two empty columns, so every
-- extra shows as today until she writes them.
ALTER TABLE extras ADD COLUMN site_description TEXT;
ALTER TABLE extras ADD COLUMN details TEXT;

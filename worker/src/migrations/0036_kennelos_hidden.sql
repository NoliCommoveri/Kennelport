-- A product or extra KennelOS stops sending is hidden, not deleted (review finding
-- 01-1): the row holds her wording, picture and portal settings, and families'
-- program statuses and codes point at its id. Hidden: off the public site (Recommended
-- products, Getting your pup home, Extras), still in the family portal, waiting in her
-- lists as "Not sent by KennelOS". Sent again, the same row comes back. As dogs,
-- litters, puppies and partner kennels already have it. Additive only: two columns.
ALTER TABLE products ADD COLUMN hidden_by_kennelos INTEGER NOT NULL DEFAULT 0;
ALTER TABLE extras ADD COLUMN hidden_by_kennelos INTEGER NOT NULL DEFAULT 0;

-- A puppy's own photos on its page, from the photos she tags as that puppy's.
-- Additive only.
--
-- Photo tags (0005) are the breeder's own sorting aid and have never been
-- published. This switch is what publishes them, per litter: on, each of its
-- puppies' pages shows the photos tagged for that puppy as its own album. Off by
-- default, so a site that never ticks it publishes nothing it didn't before.
ALTER TABLE litters ADD COLUMN show_puppy_photos INTEGER NOT NULL DEFAULT 0;

-- A puppy's own "See more photos" link. Additive only.
--
-- Where the rest of that puppy's photos live (her Google Photos or Shutterfly
-- share for it), shown under its photos on its page, the way an album's is
-- (0019). Its own, never the litter's: a family following one puppy gets that
-- puppy's gallery.
ALTER TABLE puppies ADD COLUMN more_photos_url TEXT;

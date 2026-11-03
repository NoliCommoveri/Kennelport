-- Albums newest first, and an album's own "See more photos" link. Additive only.
--
-- Newest first everywhere albums are listed (/albums, a litter page, a puppy
-- page) and in the manage app, while her up/down arrows still win: `sort` stays
-- what orders them, so this only sets a starting order. Lower sorts come first,
-- so the newest album takes the lowest: minus its created_at as a number. A new
-- album is given one below the lowest (records.js), and her first move renumbers
-- the list 0..n-1 as before.
UPDATE albums SET sort = -CAST(strftime('%s', created_at) AS INTEGER);

-- Where the rest of this album's photos live (her Google Photos or Shutterfly
-- share, say): shown under the album as "See more photos ->". Empty for most.
ALTER TABLE albums ADD COLUMN more_photos_url TEXT;

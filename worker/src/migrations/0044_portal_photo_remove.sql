-- A photo she removes from one family's portal (2026-11-23, the owner: a photo of the
-- wrong pup). Additive only: one new column, empty for every photo kept today.
-- portal_pup_photos.removed_at: set when she removes the photo from that family's
-- portal on their screen (portal/pups.js removePhotoStatement). The family no longer
-- sees it, whether the website still shows it on their puppy or not; Put back clears
-- it. A removed photo doesn't keep its file from the nightly cleanup.
ALTER TABLE portal_pup_photos ADD COLUMN removed_at TEXT;

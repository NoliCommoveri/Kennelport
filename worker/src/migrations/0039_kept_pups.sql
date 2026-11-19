-- A family's puppy kept after its litter leaves the website (2026-11-19,
-- docs/plans/portal-kept-pups.md). Additive only: two new tables, empty, and four
-- new columns on a placement, filled from the site's vet where blank.
--
-- portal_pups: the few details a family's portal shows from the website's puppy
-- and litter (name, sex, colour, registration, litter, born, ready, parents, the
-- main photo), copied for each placement of a family with a portal at the moment
-- the website's puppy or litter is deleted. The family's pages read it once the
-- website's puppy is gone. It is not a litter: her lists never show it.
CREATE TABLE IF NOT EXISTS portal_pups (
  placement_id  TEXT PRIMARY KEY REFERENCES portal_placements(id),
  site_id       TEXT NOT NULL REFERENCES sites(id),
  name          TEXT,
  sex           TEXT,
  color         TEXT,
  registration  TEXT,
  registry      TEXT,
  photo_id      TEXT,
  litter_name   TEXT,
  born_on       TEXT,
  ready_on      TEXT,
  dam_name      TEXT,
  sire_name     TEXT,
  dam_call      TEXT,
  sire_call     TEXT,
  kept_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_portal_pups_site ON portal_pups (site_id);

-- portal_pup_photos: the photos a family keeps, pinned when the website's puppy goes
-- or when she removes a photo from the website. The nightly cleanup never deletes a
-- pinned photo's file; a pin goes when the family is deleted for good.
CREATE TABLE IF NOT EXISTS portal_pup_photos (
  placement_id  TEXT NOT NULL REFERENCES portal_placements(id),
  site_id       TEXT NOT NULL REFERENCES sites(id),
  photo_id      TEXT NOT NULL,
  kept_at       TEXT NOT NULL,
  PRIMARY KEY (placement_id, photo_id)
);
CREATE INDEX IF NOT EXISTS idx_portal_pup_photos_photo ON portal_pup_photos (site_id, photo_id);

-- The puppy's own vet, on its placement ("<name>'s vet since birth" on the
-- family's pages): from KennelOS's placement vet, else her site vet at the time.
-- A later change to her site vet never changes it. (vet_clinic on a placement is
-- the family's own booking, so these are new.)
ALTER TABLE portal_placements ADD COLUMN pup_vet_clinic TEXT;
ALTER TABLE portal_placements ADD COLUMN pup_vet_doctor TEXT;
ALTER TABLE portal_placements ADD COLUMN pup_vet_phone TEXT;
ALTER TABLE portal_placements ADD COLUMN pup_vet_address TEXT;

-- Today's placements keep the vet their families see today.
UPDATE portal_placements SET
  pup_vet_clinic = (SELECT vet_clinic FROM portal_settings s WHERE s.site_id = portal_placements.site_id),
  pup_vet_doctor = (SELECT vet_doctor FROM portal_settings s WHERE s.site_id = portal_placements.site_id),
  pup_vet_phone = (SELECT vet_phone FROM portal_settings s WHERE s.site_id = portal_placements.site_id),
  pup_vet_address = (SELECT vet_address FROM portal_settings s WHERE s.site_id = portal_placements.site_id)
WHERE pup_vet_clinic IS NULL AND pup_vet_doctor IS NULL AND pup_vet_phone IS NULL AND pup_vet_address IS NULL;

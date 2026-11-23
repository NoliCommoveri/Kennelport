-- A placement's registration and screening tests from KennelOS (2026-11-23, the owner).
-- Additive only: two new columns, empty until KennelOS sends them.
-- portal_placements.registration: the registration the family's sale is for (limited,
-- full, co_own, none), so the family's Records page shows what they bought, not the
-- puppy's planned registration on the website, and a pup placed again after its
-- litter left the website still shows it.
-- portal_health_records.kind: 'screening' for a screening test from KennelOS (fecal,
-- brucellosis…), 'health_test' for the pup's genetic, OFA / PennHIP or breed-specific
-- test; kept as type 'other' so the table's type check stays as it is; read as
-- "Screening test" / "Health test". Null for every other record.
ALTER TABLE portal_placements ADD COLUMN registration TEXT;
ALTER TABLE portal_health_records ADD COLUMN kind TEXT;

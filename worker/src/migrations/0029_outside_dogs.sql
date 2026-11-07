-- Outside dogs: dogs from other kennels she has bred to (an outside stud, say).
-- Kept in dogs like her own, so a litter's dam_id or sire_id, health results,
-- photo tags and the dog's page all work for them; `outside` keeps them out of
-- her own groups (Girls and boys, Home's slider) unless a Dog cards block asks
-- for them. owner_name and owner_url: the kennel that owns it, as she types it.
-- Additive only.
ALTER TABLE dogs ADD COLUMN outside INTEGER NOT NULL DEFAULT 0;
ALTER TABLE dogs ADD COLUMN owner_name TEXT;
ALTER TABLE dogs ADD COLUMN owner_url TEXT;

-- Registration on the site. Additive only.
--
-- A litter's "Families can ask about full registration" (the breeder's own
-- setting, never KennelOS's): on, each undecided puppy (no registration set) and
-- the litter page link to the contact form with them filled in. Off by default.
ALTER TABLE litters ADD COLUMN ask_full_reg INTEGER NOT NULL DEFAULT 0;

-- A dog's and a puppy's registry ("AKC", "CKC"…), shown where set; KennelOS's
-- while linked.
ALTER TABLE dogs ADD COLUMN registry TEXT;
ALTER TABLE puppies ADD COLUMN registry TEXT;

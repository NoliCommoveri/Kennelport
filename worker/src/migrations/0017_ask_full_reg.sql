-- A litter's "Families can ask about full registration" (the breeder's own
-- setting, never KennelOS's): on, the litter page and each puppy planned for
-- Limited link to the contact form with the litter and puppy filled in. Off by
-- default. Additive only.
ALTER TABLE litters ADD COLUMN ask_full_reg INTEGER NOT NULL DEFAULT 0;

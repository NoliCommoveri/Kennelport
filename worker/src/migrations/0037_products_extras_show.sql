-- Her own Show on my website switch on products and extras (review finding 02-1).
-- Unlink turns "hidden by KennelOS" into this switch, off, as it already does for
-- dogs and litters, so a product or extra KennelOS had stopped sending can be put
-- back on her site once no KennelOS can send it. Off: off the public site (as hidden
-- by KennelOS is), still in the family portal. Additive only: two columns, every
-- existing row shown, as today.
ALTER TABLE products ADD COLUMN show_on_site INTEGER NOT NULL DEFAULT 1;
ALTER TABLE extras ADD COLUMN show_on_site INTEGER NOT NULL DEFAULT 1;

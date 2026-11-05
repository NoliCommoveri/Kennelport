-- Getting your pup home (/pickup, plan 3.5) and badges on more pages. On a
-- product: transport, a flight nanny or ground transporter (from a KennelOS
-- transport account, or ticked by her), shown as a badge on the Getting your pup
-- home page and never on Recommended products; website_url, the address shown
-- under its badge; badge_places, a JSON list of the pages besides Home whose
-- badge row shows its logo (model.js BADGE_PLACES). The page's words live in
-- site_pages like every page's. Additive only.
ALTER TABLE products ADD COLUMN transport INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN website_url TEXT;
ALTER TABLE products ADD COLUMN badge_places TEXT;

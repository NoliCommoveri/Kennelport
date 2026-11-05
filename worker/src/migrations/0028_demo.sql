-- The demo site (docs/Linked_Sample_Plan.md, step 3): a site made in /ops from the
-- linked sample, for the owner only. demo_step is the sample step it holds (1–5);
-- NULL for every real site. A demo is never served at its address, never
-- published, and can't be invited to, given a domain or linked to a real KennelOS
-- (kennelos/demo.js). Additive only.
ALTER TABLE sites ADD COLUMN demo_step INTEGER;

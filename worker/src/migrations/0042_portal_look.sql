-- The portal's look (2026-11-21, the owner): each breeder picks how her families' portal
-- looks. Additive only: one column, empty (Classic, today's portal) until she picks
-- another. The looks are listed in portal/looks.js; a value it doesn't know reads as
-- Classic.
ALTER TABLE portal_settings ADD COLUMN look TEXT;

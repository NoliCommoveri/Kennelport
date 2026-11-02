-- The simple waitlist (plan 3.8): for breeders without KennelOS, a list they keep
-- by hand. Families are added from an application in the Inbox, or typed in; the
-- breeder offers pups from her own email and marks a family fulfilled, which takes
-- them off and moves everyone below up. No turns, deadlines or automation: that's
-- KennelOS's waitlist. Shown on the site live (no publish), only while the site
-- has no KennelOS feed.
--
-- list_name: how the site shows them ("Megan R."), the only part ever public with
-- wants and added_on. Order is sort among status 'waiting'; a position is never
-- stored, so fulfilling one moves the rest up. A fulfilled family keeps its sort,
-- so Put back returns it to its place. Fulfilled ones are deleted 90 days after
-- done_at by the daily cleanup.
CREATE TABLE IF NOT EXISTS waitlist_entries (
  id          TEXT PRIMARY KEY,
  site_id     TEXT NOT NULL REFERENCES sites(id),
  name        TEXT NOT NULL,
  list_name   TEXT NOT NULL,
  email       TEXT,
  phone       TEXT,
  wants       TEXT,
  added_on    TEXT NOT NULL,
  inquiry_id  TEXT,
  status      TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'fulfilled')),
  sort        REAL NOT NULL,
  created_at  TEXT NOT NULL,
  done_at     TEXT
);
CREATE INDEX IF NOT EXISTS idx_waitlist_site ON waitlist_entries (site_id, status, sort);

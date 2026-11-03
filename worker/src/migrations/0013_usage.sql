-- Removed photos' files leave R2 (the daily cleanup, once no kept version of the
-- site uses them): purged_at says when. The row stays, so anything that still
-- names the photo finds it gone rather than a broken reference. Additive only.
ALTER TABLE photos ADD COLUMN purged_at TEXT;

-- Emails sent, counted per day and kind ('code', 'invite') for /ops's usage table.
-- Counts only: no address, no subject.
CREATE TABLE IF NOT EXISTS mail_counts (
  day   TEXT NOT NULL,
  kind  TEXT NOT NULL,
  n     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, kind)
);

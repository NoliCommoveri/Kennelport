-- Phase 2, batch 3: messages from the site, reviews from families, and push
-- notifications (plan 3.9, 3.10; decisions 12, 13, 17). Additive only.

-- What visitors send through the site's contact form (and, in phase 3, the
-- application form on the manual route). Kept 90 days, then deleted by the daily
-- cleanup (decision 12). Never emailed anywhere.
CREATE TABLE IF NOT EXISTS inquiries (
  id           TEXT PRIMARY KEY,
  site_id      TEXT NOT NULL REFERENCES sites(id),
  kind         TEXT NOT NULL DEFAULT 'contact' CHECK (kind IN ('contact', 'application')),
  name         TEXT NOT NULL,
  email        TEXT NOT NULL,
  phone        TEXT,
  topic        TEXT,
  message      TEXT NOT NULL,
  received_at  TEXT NOT NULL,
  read_at      TEXT
);
CREATE INDEX IF NOT EXISTS idx_inquiries_site ON inquiries (site_id, received_at);

-- One row per device that turned notifications on (plan 3.10), as in KennelOS
-- cloud: the endpoint is the push service's address for that browser; auth_secret
-- is the subscription's own secret, which the service worker shows to ask what a
-- notification should say (pushes carry no text). Tied to the session it was made
-- in, so signing out silences the device.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint_hash   TEXT PRIMARY KEY,
  email_hash      TEXT NOT NULL,
  session_hash    TEXT NOT NULL,
  endpoint        TEXT NOT NULL,
  auth_secret     TEXT NOT NULL,
  created_at      TEXT NOT NULL,
  last_sent_at    TEXT,
  last_shown_seq  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_push_email ON push_subscriptions (email_hash);

-- What happened, for notifications: the kind and the sender's first name only,
-- never what they wrote. Kept 8 days.
CREATE TABLE IF NOT EXISTS notify_items (
  seq      INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id  TEXT NOT NULL REFERENCES sites(id),
  kind     TEXT NOT NULL CHECK (kind IN ('message', 'review', 'notice', 'test')),
  name     TEXT,
  ref      TEXT,
  at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notify_site ON notify_items (site_id, seq);

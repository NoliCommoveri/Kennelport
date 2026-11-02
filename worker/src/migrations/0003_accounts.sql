-- Phase 2: breeder sign-in (plan 4, section 6). As in KennelOS cloud, nothing
-- here holds a readable email address: a person is the keyed hash of their
-- address, HMAC(EMAIL_HMAC_KEY, normalized email). Codes and session tokens are
-- stored hashed too. Additive only.

-- Who may manage which site. One person can be on several sites.
CREATE TABLE IF NOT EXISTS site_users (
  site_id     TEXT NOT NULL REFERENCES sites(id),
  email_hash  TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('owner', 'editor')),
  invited_at  TEXT NOT NULL,
  joined_at   TEXT,
  PRIMARY KEY (site_id, email_hash)
);
CREATE INDEX IF NOT EXISTS idx_site_users_email ON site_users (email_hash);

-- At most one live sign-in code per address; a new request replaces it.
CREATE TABLE IF NOT EXISTS login_codes (
  email_hash  TEXT PRIMARY KEY,
  code_hash   TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL
);

-- One row per signed-in browser or installed app. The cookie holds the token;
-- this holds its SHA-256.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash    TEXT PRIMARY KEY,
  email_hash    TEXT NOT NULL,
  label         TEXT,
  created_at    TEXT NOT NULL,
  last_seen_at  TEXT NOT NULL,
  expires_at    TEXT NOT NULL,
  revoked_at    TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_email ON sessions (email_hash);

-- Sign-in rate limits: per address hash and per hashed IP, per UTC hour.
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket        TEXT NOT NULL,
  window_start  TEXT NOT NULL,
  count         INTEGER NOT NULL,
  PRIMARY KEY (bucket, window_start)
);

-- Staging only (DEV_OUTBOX = "1"), while no email provider is connected: what
-- would have been emailed, shown on /ops. Keyed by the address HASH, never the
-- address.
CREATE TABLE IF NOT EXISTS dev_outbox (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email_hash  TEXT NOT NULL,
  kind        TEXT NOT NULL,
  subject     TEXT NOT NULL,
  body        TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

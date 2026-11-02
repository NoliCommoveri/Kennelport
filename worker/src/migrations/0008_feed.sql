-- The KennelOS website feed (plan 3.8): the last copy of a kennel's
-- GET /f/site/<public_id>, the public list anyone can already see, plus her
-- application form while she takes applications online (all public on her
-- /apply page). Replaced on each read; deleted when the breeder removes the
-- feed address or the site closes. The kennel is sites.kennelos_public_id.
--
-- state: 'ok' (body is the feed), 'not_shared' (KennelOS answered 404
-- not_shared: her website feed switch is off), 'not_found' (no such kennel).
-- fetched_at: when body was read; checked_at: the last time KennelOS was asked,
-- so an unreachable KennelOS is asked at most once a minute.
CREATE TABLE IF NOT EXISTS feed_cache (
  site_id     TEXT PRIMARY KEY REFERENCES sites(id),
  state       TEXT NOT NULL CHECK (state IN ('ok', 'not_shared', 'not_found')),
  body        TEXT,
  fetched_at  TEXT,
  checked_at  TEXT NOT NULL
);

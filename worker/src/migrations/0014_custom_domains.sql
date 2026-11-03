-- A site's own domain (plan 2.4). One per site. hostname is the main address,
-- normally the www. name (decision 15); the bare name redirects to it.
-- status: 'pending' serves on the domain but the kennelport.com address doesn't
-- redirect yet (for checking it works); 'active' makes it the main address.
-- cloudflare_hostname_id is for Cloudflare for SaaS custom hostnames (empty for a
-- domain routed straight to the Worker). Additive only.
CREATE TABLE IF NOT EXISTS custom_domains (
  hostname                TEXT PRIMARY KEY,
  site_id                 TEXT NOT NULL UNIQUE REFERENCES sites(id),
  status                  TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'stuck', 'broken')),
  cloudflare_hostname_id  TEXT,
  registrar               TEXT,
  created_at              TEXT NOT NULL,
  checked_at              TEXT,
  connected_at            TEXT
);

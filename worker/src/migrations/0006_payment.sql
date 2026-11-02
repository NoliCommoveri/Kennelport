-- How to pay (plan 3.9): how a family pays the application fee and the deposit,
-- and the safe-payment notice. One row per kind, its wording as JSON with the
-- keys the content model names (PAYMENT_FIELDS, SAFE_NOTICE_FIELDS).
-- show_on_site: the fee and deposit are off until the breeder turns them on; the
-- notice has no row until it's edited, and with none it's on.
-- source: 'kennelos' once phase 4 fills the fee and deposit from KennelOS.
CREATE TABLE IF NOT EXISTS payment_info (
  site_id       TEXT NOT NULL REFERENCES sites(id),
  kind          TEXT NOT NULL CHECK (kind IN ('application_fee', 'deposit', 'safe_notice')),
  show_on_site  INTEGER NOT NULL DEFAULT 0,
  content       TEXT NOT NULL DEFAULT '{}',
  source        TEXT NOT NULL DEFAULT 'kennelport' CHECK (source IN ('kennelport', 'kennelos')),
  PRIMARY KEY (site_id, kind)
);

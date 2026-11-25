-- Her payment methods from KennelOS (Website Contract C11, bundle section pay_methods,
-- 2026-11-25): each method she accepts, once, in her order, with the stages of a sale she
-- takes it for. Additive only: a new table.
--
-- label: what buyers see (KennelOS's). url: her own payment link, no amount. note: her
-- instructions, line breaks kept. stages: a JSON list of application_fee, deposit,
-- payments, final_payment. sort: her order. A bundle replaces the site's KennelOS rows
-- whole (a method she stops offering drops out); no account ids or account data are kept.
-- own_label: a name of her own shown instead of label (docs/plans/payment-blocks.md
-- step 1), kept by label across updates; empty shows KennelOS's.
CREATE TABLE IF NOT EXISTS pay_methods (
  id          TEXT PRIMARY KEY,
  site_id     TEXT NOT NULL REFERENCES sites(id),
  sort        INTEGER NOT NULL DEFAULT 0,
  label       TEXT NOT NULL,
  url         TEXT,
  note        TEXT,
  stages      TEXT NOT NULL DEFAULT '[]',
  own_label   TEXT,
  source      TEXT NOT NULL DEFAULT 'kennelos' CHECK (source IN ('kennelport', 'kennelos'))
);
CREATE INDEX IF NOT EXISTS pay_methods_site ON pay_methods (site_id, sort);

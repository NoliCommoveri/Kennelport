-- Her payment methods from KennelOS (Website Contract C11, bundle section pay_methods,
-- 2026-11-25): each method she accepts, once, in her order, with the stages of a sale she
-- takes it for. Additive only: a new table.
--
-- label: what buyers see (KennelOS's). url: her own payment link, no amount. note: her
-- instructions, line breaks kept. stages: a JSON list of application_fee, deposit,
-- payments, final_payment. sort: her order. A bundle replaces the site's KennelOS rows
-- whole (a method she stops offering drops out); no account ids or account data are kept.
-- own_label: a name of her own shown instead of label (docs/plans/payment-blocks.md
-- step 1), kept across updates by method_key (else by label); empty shows KennelOS's.
-- method_key: KennelOS's stable key for the method (its Account id, the id products
-- already carry; Website Contract C13, section pay_charges), null from a KennelOS that
-- doesn't send it. pays: a JSON object { payments?, final_payment? }, the kinds of
-- charge (price, boarding, transport, extras) the method may pay at that stage; null
-- when not sent.
--
-- pay_notes: her own words under each stage's choices (C13, payment.notes), one row
-- per stage (application_fee, deposit, payments, final_payment); a bundle replaces
-- KennelOS's rows whole.
CREATE TABLE IF NOT EXISTS pay_methods (
  id          TEXT PRIMARY KEY,
  site_id     TEXT NOT NULL REFERENCES sites(id),
  sort        INTEGER NOT NULL DEFAULT 0,
  label       TEXT NOT NULL,
  url         TEXT,
  note        TEXT,
  stages      TEXT NOT NULL DEFAULT '[]',
  own_label   TEXT,
  method_key  TEXT,
  pays        TEXT,
  source      TEXT NOT NULL DEFAULT 'kennelos' CHECK (source IN ('kennelport', 'kennelos'))
);
CREATE INDEX IF NOT EXISTS pay_methods_site ON pay_methods (site_id, sort);

CREATE TABLE IF NOT EXISTS pay_notes (
  site_id     TEXT NOT NULL REFERENCES sites(id),
  stage       TEXT NOT NULL CHECK (stage IN ('application_fee', 'deposit', 'payments', 'final_payment')),
  note        TEXT NOT NULL,
  source      TEXT NOT NULL DEFAULT 'kennelos' CHECK (source IN ('kennelport', 'kennelos')),
  PRIMARY KEY (site_id, stage)
);

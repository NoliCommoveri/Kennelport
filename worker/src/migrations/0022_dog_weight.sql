-- A dog's weight, as she types it ("45 lb"), shown on its card and page. The
-- website's own field: KennelOS's bundle never sets it (bundle.js OWNED leaves it
-- out). Additive only.
ALTER TABLE dogs ADD COLUMN weight TEXT;

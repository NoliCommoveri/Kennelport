-- The name KennelOS last gave a litter (bundle.js namedByKennelos): while the
-- website name is still this, it follows KennelOS's (a nickname, a heat becoming
-- a pairing, a pairing a litter); once she changes it, hers stays.
ALTER TABLE litters ADD COLUMN kennelos_name TEXT;

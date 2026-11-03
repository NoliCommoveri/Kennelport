-- A question from the FAQ shown again elsewhere on the site. Additive only.
--
-- The pages a FAQ also shows at the top of, as a JSON list of place keys
-- (content/model.js FAQ_PLACES: 'litter' for every litter's page, 'dog' for
-- every dog's, and so on). It lives on the question itself, not in a table of
-- its own, so an export carries it with the question and an import can't leave
-- a placement pointing at a question that is gone. Null or empty: the question
-- shows on the FAQ page only, as before.
ALTER TABLE expanders ADD COLUMN places TEXT;

-- The application form for breeders who run their waitlist by hand (plan 3.8,
-- 3.10; decision 26): the breeder's own questions, and the answers each
-- application brought. Additive only.

-- One row per question on the waitlist page's application form, in order. Name
-- and email are always asked and aren't rows. type is from a fixed list
-- (content/model.js QUESTION_TYPES); options is a JSON list for 'choice'.
CREATE TABLE IF NOT EXISTS form_fields (
  id        TEXT PRIMARY KEY,
  site_id   TEXT NOT NULL REFERENCES sites(id),
  form      TEXT NOT NULL DEFAULT 'application' CHECK (form IN ('application')),
  type      TEXT NOT NULL,
  label     TEXT NOT NULL,
  hint      TEXT,
  required  INTEGER NOT NULL DEFAULT 0,
  options   TEXT,
  sort      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_form_fields_site ON form_fields (site_id, form, sort);

-- An application's answers, as JSON [[question, answer], ...] in the order asked,
-- with the question's wording as it was when sent, so later edits to the form
-- don't change what a family wrote.
ALTER TABLE inquiries ADD COLUMN answers TEXT;

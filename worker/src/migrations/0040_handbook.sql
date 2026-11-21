-- The puppy handbook (2026-11-21, docs/plans/family-portal.md sections 4, 6 phase 2,
-- 7.2 and 9). Additive only: one new table, empty until she writes a chapter.
--
-- portal_chapters: her handbook's chapters, in her order. body is plain text:
-- paragraphs split by a blank line, "- " lines as a list, and "[link: Program]" for
-- one of her programs' links (portal/handbook.js). shown = 0: hers to finish, families
-- don't see it. A chapter with no words isn't shown either.
CREATE TABLE IF NOT EXISTS portal_chapters (
  id          TEXT PRIMARY KEY,
  site_id     TEXT NOT NULL REFERENCES sites(id),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL DEFAULT '',
  shown       INTEGER NOT NULL DEFAULT 1,
  sort        INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_portal_chapters_site ON portal_chapters (site_id, sort);

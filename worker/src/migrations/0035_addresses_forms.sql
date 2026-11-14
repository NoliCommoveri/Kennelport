-- Page addresses, and the contact and review forms' fields: one migration for the
-- branch (CLAUDE.md), two additive columns.
--
-- Page addresses (docs/plans/site-builder.md, "Page addresses", step 3.5).
-- The breeder's own address for a page, beside its menu name: null keeps the page's
-- starting address (content/model.js PAGES, or the owner's in the build for a page
-- she added). A renamed page's old address redirects through the existing redirects
-- table, written at Publish. Additive only: one new column.
ALTER TABLE site_pages ADD COLUMN path TEXT;

-- The contact and review forms' fields (docs/plans/site-builder.md, "Forms", step
-- 3.8; content/forms.js). A review's answers for the breeder only (its email, phone
-- and the owner's own questions), as JSON [[words, answer], ...]; the review card
-- never shows them. A contact message's extra answers go in inquiries.answers, the
-- column applications already have (0007). Additive only: one new column.
ALTER TABLE stories ADD COLUMN answers TEXT;

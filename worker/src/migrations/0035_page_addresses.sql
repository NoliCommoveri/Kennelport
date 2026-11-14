-- Page addresses (docs/plans/site-builder.md, "Page addresses", step 3.5).
-- The breeder's own address for a page, beside its menu name: null keeps the page's
-- starting address (content/model.js PAGES, or the owner's in the build for a page
-- she added). A renamed page's old address redirects through the existing redirects
-- table, written at Publish. Additive only: one new column.
ALTER TABLE site_pages ADD COLUMN path TEXT;

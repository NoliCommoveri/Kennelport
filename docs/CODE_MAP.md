# Code map

Where things live in `worker/`, one line each, so you can open the right file first. Each
source file starts with a comment saying what it does and which plan section it follows;
read that before the rest. Update this map when you add, move or split a file.

## The request, from the top

- `src/index.js`: the router. `src/hosts.js` picks the part of KennelPort from the
  hostname: `kennelport.com` (front), `manage.` (Site Manager, `/ops`), `api.` (KennelOS),
  or a site.
- `src/gate.js`: applies a deploy's pending migrations by itself, and answers 503 only
  while that runs or if it failed. `src/migrate.js` runs them; `src/migrations/` holds them (a `.sql` file plus its line in `index.js`; one per
  branch, never edit one on `main`: see CLAUDE.md).
- `src/lib/`: `http.js`, `html.js` (escaping), `sql.js`, `crypto.js`, `demo.js`,
  `vendor/qrcode.js`. `sql.js`, `crypto.js` and `migrate.js` are copied from KennelOS
  cloud: a fix in one copy belongs in both. `gate.js` started as a copy and now differs
  (it applies migrations itself).

## A breeder's website

- `src/site.js`: serves a site: its published snapshot, or the draft behind a preview link.
- `src/publish.js`: draft → snapshot in R2 → live; undo; redirects. `src/diff.js`: Publish's
  list of changes.
- `src/render/`: the "ak" template. `index.js` path → page; `pages.js` the page frame and the pages
  not yet split out; `pages/` one file per page split out (`about.js`, `reviews.js`,
  `contact.js`, `albums.js`, `privacy.js`, `puppy.js`) and pieces `pages.js` uses
  (`blocks.js` the data blocks, `featured.js` the Featured block,
  `albumLists.js`, `formParts.js` the visitor forms, `applicationForm.js` KennelOS's form);
  `parts.js` shared cards, photos, menu; `layout.js` head, header, footer; `schemes.js` the
  colour schemes (source for `scripts/schemes.mjs`); `version.js` `ASSET_VERSION`.
- `public/_kp/t/ak/`: the template's CSS, JS, scheme CSS and ornaments; `public/_kp/fonts/`.
  A change here needs an `ASSET_VERSION` bump (ask first: CLAUDE.md).
- `src/siteforms.js`: forms visitors send (contact, waitlist application, review).
- `src/feed.js`: KennelOS's public waitlist and application form, read for the waitlist page.
- `src/waitlist.js`: the simple waitlist kept by hand.
- `src/embeds.js` (reading a pasted link) and `src/embedStore.js` (where each video or post
  sits). `src/qr.js`: QR codes.
- `src/front.js`: kennelport.com's own front page, terms and privacy.

## Content: what a site holds

- `src/content/model.js`: every field and its limits; the one list everything else uses.
- `src/content/records.js`: saving one record at a time (the Site Manager's forms).
- `src/content/io.js`: content as one JSON document (`/ops` import and export).
- `src/content/blocks.js`: pages as lists of blocks (`PAGE_DEFAULTS`), each block's records
  and what its cards show.
- `src/content/rules.js`: display and timing rules, set per site by the owner.
- `src/content/fields.js`: every field a data block can choose by, order by or group by
  (dog, pup, litter), with the conditions, order and groups themselves
  (`plans/kennelos-contract.md` B1, B2). `render/parts.js` `recordCtx` gives it the day,
  a litter's stage and a pup's status row.
- `src/content/picks.js`: the breeder's ticks and picks on a data block (`block_picks`):
  Leave out, and a Featured block's picks and set dates (`plans/kennelos-contract.md`
  B3). `src/content/featured.js`: a Featured block's schedule and which record shows
  today (B5).
- `src/content/prices.js`: every price shown, worked out from a litter's figures.
- `src/content/akSample.js`: the AK sample as a content document.
- Photos: `src/photos.js` (upload checks), `src/photoTags.js` (what a photo is of),
  `src/photoPlaces.js` (where each photo shows: the photo library). `src/badgeCode.js`:
  a product's embed code.

## The Site Manager (the breeder's app, and the owner's admin view)

- `src/manage/index.js`: sign-in, her sites, home. `src/auth.js`, `src/mail.js`: email-code
  sign-in, invites, sessions.
- `src/manage/screens.js`: the editing screens under `/s/<subdomain>/`, in `createScreens`.
  Split out into `src/manage/screens/`, each a factory given what `createScreens` holds:
  `share.js`, `inbox.js`, `queue.js` (reviews to approve), `account.js` (storage, download,
  delete), `dogform.js` (a dog's Life stage choice and its pedigree card), `pages.js` (her
  Pages and Home, and the blocks placed on them), `picks.js` (which records a data block
  shows: her ticks and picks); `parts.js` small shared pieces.
- `src/manage/forms.js`: an input per content field, with `LABELS` (field wording).
- `src/manage/wording.js`: every other line she reads, as one list (`say('key')`).
- `src/manage/hub.js`: Today, Families, Dogs, Website, Portal: the app for sites with the
  portal on.
- `src/manage/builder.js` and `src/admin.js`: the owner's admin view (pages, blocks, menu,
  rules, timing, wording). Screens split out of `builder.js` are in `src/manage/builder/`:
  `sites.js` (Every site), `rules.js` (Pups), `kennelos.js` (From KennelOS), `timing.js`,
  `formats.js`, `instructions.js` (her instructions), `records.js` (a data block's
  conditions, order and groups), `blocks.js` (a data block's settings and a Featured
  block's schedule), `menugroups.js` (menu links to a group of a block); `frame.js` the nav and redirect,
  `controls.js` the form controls. The five big files (`builder.js`, `screens.js`,
  `render/pages.js`, `portal/admin.js`, `portal/family.js`) are split further a screen at a
  time as they're touched (`review/senior-review-2026-11.md`, item 7): don't grow them.
- `src/push.js`: push notifications. `src/manage/version.js`: `APP_VERSION`.
- `public/_kp/m/`: the app's CSS, JS, service worker, photo resizing, zip, icons. A change
  here needs an `APP_VERSION` bump (ask first).

## The family portal (`src/portal/`, sites with it switched on)

- `family.js` the family's pages under `/family`; `auth.js` family sign-in. Split out into
  `family/`: `icons.js`, `stay.js` (the extended stay's pieces), `files.js` (photos, files,
  program links), `parts.js`.
- `admin.js` her side (Puppy families, each family's screen). Split out into `admin/`:
  `templates.js` (checklist and timeline), `settings.js`, `today.js` (the Families and
  Portal tabs' lists, Today's portal part), `parts.js`.
- `store.js` the records; `steps.js` checklist, timeline, programs; `stays.js` extended
  stays; `vet.js` the 3-day vet visit; `reminders.js` the hourly job; `messages.js` emails;
  `bounces.js` Resend's delivery results; `account.js` the account over time (loss, delete,
  Delete now, giving a deleted family back); `merge.js` the same family twice (merging a
  typed placement or family into KennelOS's).
- `view.js` her read-only view of a family's portal (`plans/done/family-view.md`): the view
  link and the view cookie; `family.js` refuses every write under one.
- `feed.js` KennelOS's family feed. `version.js`: `PORTAL_VERSION`; files in `public/_kp/f/`
  (ask before bumping).

## KennelOS link (`src/kennelos/`)

- `api.js` the API on `api.kennelport.com`; `link.js` link codes and device tokens;
  `bundle.js` what a bundle does to the site (every key it accepts is listed at its top);
  `match.js` matching existing records; `clock.js` the 30 days a litter is kept;
  `demo.js` and `sampleDates.js` the demo site from the linked sample.

## The operator (`/ops`)

- `src/ops.js` sign-in, setup checks, migrations; `src/ops/sites.js` site screens;
  `src/ops/usage.js` usage against the free tiers.
- `src/backup.js` a whole site out and back in (every table's rows, every file);
  `src/ops/backup.js` its pages and routes; `public/_kp/o/backup.js` makes and reads the
  zip in the browser (not a versioned set: only the operator loads it). The format:
  `docs/plans/backup-format.md`. A new table with `site_id` goes in `sites.js`
  `SITE_TABLES`; a test fails until it does.
- `src/sites.js` create, suspend, close; `src/domains.js` custom domains;
  `src/cleanup.js` the daily cleanup (what KennelPort promises not to keep).

## Scripts and tests

- `scripts/fingerprint.mjs`: the fingerprints for the three versions. `scripts/schemes.mjs`:
  writes the scheme CSS. `scripts/cpu-check.mjs`: CPU time of publish and render.
- `tests/`: one `*.test.js` per area, named after it (`portal-feed.test.js`,
  `blocks.test.js`…). `tests/helpers/`: a D1 over `node:sqlite` (`d1.js`), a staging-like
  environment and calls as any host (`env.js`), the Worker loaded with its `.sql` hook
  (`worker.js`, `sql-hooks.js`), static files (`assets.js`), tiny test images (`images.js`). `tests/versions.test.js` fails when a
  versioned file changes without its bump. `tests/fixtures/linked-sample/`: a made-up
  kennel as KennelOS would send it.
- `.github/workflows/test.yml`: the tests, on every pull request and push.
- Run: `node --test` from the repo root, or `npm test` in `worker/` (Node 22 or later).

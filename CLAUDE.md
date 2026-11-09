# KennelPort: notes for Claude

## Start here, and read only what you need

1. `docs/STATUS.md`: what's built and what's next (short).
2. `docs/CODE_MAP.md`: which file does what. Each source file's top comment says the rest.
3. Then only the plan section the task names (`docs/plans/`); use `grep -n '^#'` on a plan
   to find its section rather than reading it whole. Plans are big (the main one is 120 KB).

Don't read whole files that have an index: the prototypes in `docs/reference/` (use the
"Finding a screen" list in its README, then read that range) and the build log (read
only its tail to add an entry; the archive in `docs/log/` only by grep). `docs/research/`
and `docs/review/` are rarely needed.

When you finish a piece of work: add an entry at the end of `docs/log/BUILD_LOG.md`,
change its line in `docs/STATUS.md`, and update `docs/CODE_MAP.md` if you added, moved or
split a file. Doc names are lowercase with hyphens; a new feature plan goes in
`docs/plans/` and moves to `docs/plans/done/` once it's fully built.

## Deploys: `main` is production

Production is live with the real breeder's site and families, and there's no staging step
in practice: a merge to `main` deploys to `kennelport.com` at once (Workers Builds). A
merge carrying a migration makes the Worker answer 503 (`src/gate.js`) until the owner
presses **Apply pending** in `/ops`, so say so whenever a branch adds one. Keep migrations
safe to apply to live data (add, don't drop or rewrite), and never push to `main`.

## Version bumps: ask first, every time

Browsers cache two sets of files, so a change to them only reaches phones and
computers when its version number changes:

- the manage app (`worker/public/_kp/m/`), served from its service worker's cache
  first: `APP_VERSION` in `worker/src/manage/version.js`;
- the site template (`worker/public/_kp/t/`), kept by browsers for a day:
  `ASSET_VERSION` in `worker/src/render/version.js`;
- the family portal (`worker/public/_kp/f/`), kept by browsers for a day:
  `PORTAL_VERSION` in `worker/src/portal/version.js` (`PORTAL_FILES`).

**Never bump any of them without asking the owner first, every time,** even when a test
fails for it. The owner may not be done changing things and wants to bump once, at
the end. Say which files changed and ask; bump only after a yes.

**First check whether the current number has gone out.** Compare it with the one on
`main` (`git fetch origin main`, then `git show origin/main:worker/src/manage/version.js`
or `.../render/version.js`). If the branch's number is already higher than `main`'s,
it hasn't been released: no browser has cached it, so don't bump and don't ask. Just
run the fingerprint script and update the fingerprint beside that same number, and
say you did. Only when the number matches `main`'s (it has gone out) is a bump
needed, and then ask as above.

When a file there changes without a bump, `worker/tests/versions.test.js` fails and says
what to do. That failure is expected while work is in progress; it's the cue to ask,
not to bump. After a yes: bump the number by one, run
`node worker/scripts/fingerprint.mjs` from the repo root, and paste the matching
fingerprint (`APP_FILES` or `TEMPLATE_FILES`) beside the number.

## Look: match the prototypes

The owner worked hard on the styling. The reference builds in `docs/reference/` are the
target look: `portal-prototype.html` for the family portal and the Site Manager (her
screens), `ak-sample.html` for her website. Before building or changing any screen,
including every later phase, open the matching prototype screen (find it with `docs/reference/README.md`,
"Finding a screen") and carry over its
components, classes and CSS (tiles, bands, calendar pages, numbered steps, highlight
rows, pills, the pinned action bar), not a plainer stand-in. Check the result side by
side with the prototype at phone width (390px) and on a computer. Any change from the
prototype should add pleasing variety, never remove it. If a screen has no prototype,
build it from the prototype's existing components, and say so.

## Breeder-facing wording goes in the owner's list

The owner writes every line the breeder reads in the Site Manager: help lines, hints,
labels, button wording, empty-screen messages, confirmations and errors that tell her
what to do (`docs/plans/site-builder.md`, decision 19). The list is
`worker/src/manage/wording.js` (the field labels and hints stay in `manage/forms.js`
LABELS and are listed from there); screens read it with `say('key')`. From now on, put
new breeder-facing text in that list, not only in the code. For a screen not moved into
it yet, keep its wording in one place and note it in the build log, so it's easy to move
later. The owner's own admin screens and messages about KennelPort itself failing are
left out.

## Migrations: one per merge

A branch adds at most one migration file. Before adding one, check what the branch
already adds beyond `main` (`git diff --stat origin/main -- worker/src/migrations`);
if it has one, add your statements to that file (and its comment) instead of a new
one, and keep its one line in `migrations/index.js`. Never change a migration that is
on `main`: it has been applied.

## Tests

`node --test` from the repo root (Node 22 or later); the tests are in `worker/tests/`.

# KennelPort: a senior engineer's review, 2026-11-10

Asked for: an unsparing look at what works and what needs to be torn out, with leave to
slash and burn as long as the three live sites' data survives.

## The verdict

**Don't burn it down. The code is not the problem. The way it reaches production is.**

I came to this expecting a mess: 278 commits, almost all of them in nine days (1 to 9
November), no reviewer, nobody on the project able to read the code, and real families
on it. That history normally produces something that has to be rewritten.

It didn't. The parts that are expensive to get wrong are done properly, and a rewrite
would spend weeks to arrive at the same design with new bugs and three live sites
migrated for nothing. What is wrong is around the code: there is no net under it. Those
are the things to fix, and the first of them are fixed in this branch.

## What I looked at, and what I didn't

Read in full: the router, host routing, the maintenance gate, the migration runner and
all 29 migrations, breeder sign-in, `/ops` and its sign-in, the admin cookie, mail, how a
site is served, the content model, content import and export, site close, the daily
cleanup.

Swept by pattern across all of `worker/src`: every database write (is it tied to the
site it belongs to), every statement built from pieces (can outside text get into it),
the cross-site form check, the content security policy on each surface, who can open a
family's files.

Sampled, not read line by line: the big screen files (`manage/screens.js`,
`manage/builder.js`, `portal/admin.js`, `portal/family.js`, `render/pages.js`), about
half the code by size. Their structure is judged below; their every line is not vouched
for. Ran: the whole test suite (344 tests before this branch, all passing).

## What is sound. Keep all of it.

- **Sign-in.** No passwords. Email addresses kept only as keyed hashes; codes and
  session tokens hashed; five tries per code; per-address and per-IP limits; the screen
  never reveals whether an address has a site. Families' addresses, the one thing that
  must be readable, are encrypted.
- **Every write is tied to its site.** I looked for one that wasn't, in ways that let
  one breeder touch another's records. Found none. A family can open only its own files.
- **No outside text reaches a database statement.** Everything built from pieces is
  built from fixed lists in the code.
- **Draft and published are separate.** Visitors only ever see a published version, a
  frozen file. An edit can't half-appear, and Undo is real.
- **Migrations land whole or not at all**, with a checksum so a changed file is noticed.
- **Browsers are locked down.** Each surface says exactly what it may load. Forms are
  refused unless they come from the app itself.
- **No third-party code** in what runs, apart from one QR library. Nothing to go stale.
- **The tests are real.** They drive the whole Worker against a real database, not
  stand-ins that agree with the code. That is the single best thing here, and the reason
  the rest held together at this speed.
- **The privacy promises are in the code**, not only in the terms: what is deleted, when.

## What is wrong, worst first

### 1. Every database change takes every site offline until you press a button

A merge to `main` deploys at once. If it carries a migration, every public site, every
family's portal and the Site Manager answer "Back soon" (503) until **Apply pending** is
pressed in `/ops` (`src/gate.js`, `src/site.js`). If you are asleep, at work or out of
signal, three breeders' websites are down for as long as that lasts. The published pages
are frozen files that don't need the new database to be served; they are being taken
down by a safety check, not by any real need.

**Not changed here:** it alters how production deploys, so it is your call. See "What I
need from you" at the end. This is the first thing I would fix.

### 2. Nothing stands between a change and production

No automatic test run. Staging exists and isn't used. A session that forgets to run the
tests, or misreads the result, ships to real families. The tests are good; nothing made
anyone run them.

**Fixed here:** `.github/workflows/test.yml` runs the suite on every pull request and
every push, so a red mark shows on the pull request before it is merged. It cannot stop
a merge by itself: turn on "Require status checks to pass" for `main` in the GitHub
repository settings (Branches) so that it does.

### 3. There was no backup

The JSON you can download from `/ops` holds what a site shows and nothing else: no
photos, no page builds, no inbox, no waitlist, no KennelOS link, **none of the puppy
portal** (families, placements, health records, vet proof, contracts, messages). The
breeder's Download a copy adds photos and the inbox, still no portal, and nothing can
read it back in. The database can be wound back 30 days at Cloudflare; the photos and
families' documents in file storage had **no second copy anywhere**.

**Fixed here:** a full backup and restore in `/ops`, described in
[`plans/backup-format.md`](../plans/backup-format.md). Every row, every file, one zip,
and it goes back in. Tested by backing a site up, restoring it somewhere empty, and
comparing every row and every file; also run in a real browser.

### 4. One long password opens everything, and can be guessed at without limit

`/ops` is one shared token. Whoever has it has every site, every family's details and
the button that runs migrations. Wrong guesses are not counted or slowed
(`src/ops.js`). With a long random token that is survivable; it is still the one door
with no lock on the handle, on a system that is careful everywhere else.

**Not changed here.** Small to fix (count failures per address, as breeder sign-in
already does). Do it with item 1.

### 5. A crash showed visitors Cloudflare's error screen

Nothing caught an error nobody expected, so a family or a visitor would get a raw
"Worker threw exception" page.

**Fixed here:** a plain "Something went wrong" page, and what failed goes to the log.

### 6. Built faster than it was checked

Site builder, family portal, KennelOS link, a demo system and custom domains, in nine
days, live. The portal's own gate, one litter from signed contract to vet visit with no
fixes by hand (`STATUS.md`), has not been run, and the portal is on. A code review was
planned on 3 November and parked without a session ever running. Features were arriving
several a day, each "built" the moment its tests passed.

This is the management failure, and it is ordinary: nobody was placed to say "stop
adding, prove what's there." **Recommendation: no new features until the portal's gate
has been run on a real litter and items 1 and 4 are done.**

### 7. The screens are five enormous files

`manage/screens.js` (118 KB), `manage/builder.js` (115 KB), `render/pages.js`,
`portal/admin.js`, `portal/family.js`: about half the code. Whole pages are written as
single lines of HTML up to 989 characters long, inside one function per file. It works
and it is tested from the outside. It is also where the next bugs will come from: a
change to one screen means working inside a file no one can hold in their head, and
every session pays to read it.

**Not a rewrite.** Split each file by screen, one at a time, when that screen is next
touched, with the tests as the guard. Do not let any of them grow further.

### 8. Four places hold "what a page looks like"

`site_pages`, `home_blocks`, `block_switches` and the `site_builds` JSON all describe
layout, in layers: the code's default, the owner's build over it, the breeder's switches
and words over that. Each layer exists because of the rule that no live site may change
the day a feature ships. That rule was right, and for three sites it has bought a lot of
machinery: every new block has to work out which layer it lives in.

**Leave it.** Folding the layers into one is the only real case for reshaping the data,
and it is not worth doing to live sites now. If Templates (site builder step 5) is ever
built, that is the moment, and the backup above is what makes it safe.

### 9. Things kept in step by hand

The list of a site's tables (what closing a site deletes), the migration list, the three
version fingerprints, the code map. Each is a list someone must remember to update. The
table list is now checked by a test (it was complete). The version fingerprints are a
ritual a build step would do by itself: a later tidy-up, not urgent.

### 10. The same thing written twice

Breeder sign-in and family sign-in are two copies of one idea. Four files are copies
from KennelOS with a note that a fix in one belongs in both. Copies drift. Not urgent;
when either sign-in is next changed, make them share.

### 11. Small things

- Messages from the contact form are deleted after 90 days. That is a promise in the
  terms, and deliberate. Make sure each breeder knows, because a backup holds only what
  is still there.
- A stale comment at the top of the router said every page was a placeholder. Removed.
- The docs are larger than the code (1.5 MB against 1.4 MB). The plans are worth
  keeping; the habit of reading them whole is not, and `CLAUDE.md` already says so.

## What this branch changed

| Change | Files |
|---|---|
| Full backup and restore in `/ops` | `worker/src/backup.js`, `worker/src/ops/backup.js`, `worker/public/_kp/o/backup.js`, links in `ops/sites.js`, routes in `ops.js` |
| Tests for it (7), and one for the error page | `worker/tests/backup.test.js`, `worker/tests/worker.test.js` |
| A plain page instead of a crash screen | `worker/src/index.js` |
| Tests run on every pull request and push | `.github/workflows/test.yml` |
| The format and the mapping | `docs/plans/backup-format.md` |

No migration, so merging it does **not** bring up "Back soon". No file in the three
versioned sets changed, so no version bump. No site looks or behaves differently.

## What it deliberately did not change

- **No rewrite, no reshaped data.** Nothing found justifies one. The mapping from old to
  new is therefore one to one, and written down in case that ever changes.
- **How migrations are applied** (item 1) and **the `/ops` sign-in** (item 4): both
  change how production is run. Yours to decide.
- **The big files** (item 7): splitting them is safe only a screen at a time.

## In order, from here

1. Merge this. Then make a full backup of each of the three sites and keep the zips.
2. Turn on required status checks for `main` in GitHub.
3. Decide item 1 (below), and have the `/ops` sign-in limited at the same time.
4. Run the portal's gate on a real litter before anything else is built.
5. Then features again, with the big files split as they are touched.

## What I need from you

**Item 1.** Today a database change takes all three sites down until you press Apply
pending. The alternative: KennelPort applies it by itself the moment the new code is
live (the same all-or-nothing step, the same checks), and only shows "Back soon" if that
fails, which is when you would be needed anyway. You would lose the moment of pressing
the button; the sites would stop going dark while they wait for you. I recommend the
change.

# 03 — Records' lifecycle: matching, the hand-over, the 30-day clock, photos

Commit reviewed: `9bd2d14` (main after PR #63)  ·  Changed since the target (`8aaf58a`):
`kennelos/bundle.js` (extras/products hidden not deleted, health twins, steps taken over),
`kennelos/link.js` (the last device stopping is no longer an Unlink), migrations 0036 and
0037. None of it touches the hand-over block, the clock or the photo cleanup.
Reviewed: `kennelos/match.js` 101, `kennelos/clock.js` 139, `cleanup.js` 76, `photos.js` 90,
`photoTags.js` 75, `ops/usage.js` 79, `photoPlaces.js` 90, `backup.js` 238, the hand-over and
match parts of `kennelos/bundle.js` (992), migrations 0018/0019/0020/0029, and where the family
portal reads a puppy's photos (`portal/family/parts.js`, `portal/family.js`).
Contract read: plan §5.3 (gone from the bundle, "a litter is not an archive", the hand-over),
§5.4, decision 28; `kennelos-contract.md` C1.
Verified by: `node --test` → **455 pass, 0 fail** (green start). A scratch suite of 12 tests
driving the real bundle API, `runCleanup`, `matchChanges`/`confirmMatch`/`declineMatch` and
the D1 helper (kept in the session's scratchpad, not the repo). KennelOS not checked out;
nothing here needed its side beyond what KennelPort's own contract comments say it sends.

**The two questions the plan led with.**
- *Does a kept puppy's every photo survive the hand-over?* **Only if the dog is made in the
  bundle that takes the litter away.** Then yes: the cover (`photo_id`) and every
  `puppy:<id>` tag are copied, and all of them survive the cleanup (scratch test A: cover +
  3 tagged photos, all kept). But the hand-over runs once, when the dog row is created. If the
  dog already exists while the litter is still on the site — the default path whenever she
  ticks the pup's Dog record in KennelOS — nothing is copied, and every photo she gives the
  puppy goes with the litter 30 days later (finding 1). The puppy's own "See more photos"
  link (0020) never moves (finding 9).
- *Do litters already off the site all become due the day this ships?* **No.** No backfill
  code is needed: the first `litterClockStatements` run (any save, bundle, or the night's
  cleanup) stamps `left_site_at = now`, not the litter's old `updated_at`. Scratch test J:
  a litter off with no stamp is stamped on the first run, kept at day 29, deleted at day 31.
  Phase 4 has long since shipped, so this is settled. The same "old stamp" danger does exist
  on one path, restoring a backup (finding 5).

| # | Sev | Where | What | Verified? |
|---|-----|-------|------|-----------|
| 1 | S1 | worker/src/kennelos/bundle.js:750-762 | The hand-over copies photos only when the dog row is created; a dog that already exists while its litter is on the site gets none, and the puppy's photos are deleted with the litter | verified |
| 2 | S1 | worker/src/kennelos/clock.js:133 · portal/family.js:280 | A puppy lost before pickup: its placement is closed, so it no longer holds the litter; the litter's deletion takes the photos the family's portal promises "stay here for you" | verified |
| 3 | S1 | worker/src/kennelos/clock.js:91-93 | `photosToRemove` never reads the owner's blocks (`site_builds`) or her photos in them (`block_switches`): a photo shown on Our story or Home is deleted with a litter | verified |
| 4 | S2 | worker/src/kennelos/clock.js:35 · manage/index.js:182 · wrangler.toml:81 | "Deleted on 3 May" is a UTC date and the cron runs at 04:23 UTC: a US breeder loses the litter on the evening before the date she was shown | verified |
| 5 | S2 | worker/src/backup.js:185-217 · clock.js:131-132 | A restored backup keeps its old `left_site_at` stamps: litters that were on the leaving list are deleted the first night after the restore (or mid-restore: suspended sites aren't skipped) | verified (reading + J) |
| 6 | S3 | worker/src/kennelos/bundle.js:755-765 | A kept puppy whose dog she already made by hand: the hand-over runs before the name match, making a second dog of the same name, with no match offered | verified |
| 7 | S3 | worker/src/kennelos/bundle.js:740-741,764-768 | Two KennelOS dogs with the same name: the second becomes a new dog at once; after she declines the first, her own record is never offered for the other | verified |
| 8 | S3 | worker/src/kennelos/match.js:52 · bundle.js:161,942 | The match screen lists only `OWNED` fields; a confirm also replaces her typed sire/dam (lineage), and the next bundle her breed and origin, none of it shown | verified |
| 9 | S3 | worker/src/kennelos/bundle.js:759 · migrations/0020 | The puppy's "See more photos" link isn't carried to the dog (dogs have no such column); it goes with the litter | verified |
| 10 | S3 | worker/src/kennelos/clock.js:38-41,133 · manage/screens.js:193 | A litter held by an open placement stays on "Leaving your site" with a "Deleted on" date in the past, then goes the night the placement closes, with no new date | verified (reading) |
| 11 | S4 | worker/src/kennelos/clock.js:85,105-106 | A deleted litter's (and its albums') videos go, but their preview photos stay: counted against her photo and storage limits, under "Not used anywhere" | verified |
| 12 | S4 | worker/src/cleanup.js:34-36 · clock.js:134-137 | One litter whose delete throws stops the whole nightly cleanup every night after (it sorts first), portal daily and photo purge included, with no alert | suspected |
| 13 | S4 | worker/src/ops/usage.js:48 | `/ops`'s R2 total leaves out the family portal's files and stay photos (up to 10 MB each), so the 80% warning can come late | verified (reading) |

## 1. The hand-over is one moment; photos given to a kept puppy after it are deleted  (S1, verified)

**Where** `kennelos/bundle.js:750-762`. A dog found by `kennelos_id` goes to `updateDog`
(line 753) and `continue`s; only a dog *not yet on the site* reaches the hand-over, which
copies `pup.photo_id` and the `puppy:<id>` tags at that instant. Nothing copies later.
`photosToRemove` (`clock.js:63-94`) then treats every `puppy:<id>` tag and puppy cover of
the deleted litter as going.

**Scenario** (scratch test B). KennelOS sends a litter with Fern (`staying`, disposition
`keeping`), and — because she ticked Fern's Dog record "Show on website", as the
`disposition` section on a puppy-status dog expects (`kennelos-contract.md` C1; every
`pup_*` rule is on by default, `rules.js:192`) — Fern as a dog with status `puppy`. Same
bundle: the dog is created first, before any puppy row exists, so no hand-over at all. Weeks
3-8 she photographs Fern on the puppy row (cover + tagged photos), because that is where the
Photos screen and the litter page put her. The litter sells out and leaves. 31 days later:
dog Fern still there with `photo_id = null`; both photos `removed_at` set, files purged that
night. The same happens with any order in which the dog row predates her last puppy photo:
a dog made in an earlier bundle, or a photo tagged to the puppy after the hand-over ran.

**Why it matters** This is the exact loss §5.3 says the hand-over exists to stop ("the
litter's deletion can't take the only pictures of her"). The existing test
(`kennelos.test.js:332`) covers only the one ordering that works.

**What I'd do** Make the rule a property of the cleanup, not of one bundle: in
`photosToRemove`, treat a puppy whose `kennelos_id` matches a surviving dog's as surviving
(its cover and tags are "used"), and move them to `dog:<id>` in `deleteLitter`'s batch.

## 2. A lost puppy's photos go with its litter, under a page that says they stay  (S1, verified)

**Where** `clock.js:133` holds a litter only for a placement with `status = 'open'`.
`markLoss` (`portal/account.js:105-115`) closes the placement. `portal_placements.puppy_id`
is `ON DELETE SET NULL` (0023:110); `puppyPhotos` (`portal/family/parts.js:6-12`) reads only
the puppy row and its tags. `lossPage` (`portal/family.js:280`) says "Pip's photos stay
here for you."

**Scenario** (scratch test L). Pip dies before pickup; she records it; the family's Home
becomes the quiet page with Pip's photo and the promise. The litter leaves the site when the
others go home (or if none of the others' families use the portal). 31 days later the
cleanup deletes the litter: `puppy_id` becomes null, Pip's cover and tagged photos are
removed and purged. The family's Photos tab now reads "No photos yet."; the loss page's
photo is gone. The same applies to a placement closed by the feed (`portal/feed.js:314`).

**Why it matters** A grieving family loses the only photos of their puppy, from a page that
promised they would stay, with nothing telling anyone.

**What I'd do** Count any placement (not only open ones) as a user of its puppy's photos in
`photosToRemove`, or hold the litter for a placement with a loss; and keep the photo ids on
the placement so they outlive the puppy row.

## 3. Photos in the owner's blocks are deleted with a litter  (S1, verified)

**Where** `clock.js:91-93` scans only `home_blocks.content` and `site_pages.content` for
photo ids. The owner's photo, overlay, beside, collage and gallery blocks keep theirs in
`site_builds.build` (`b.photo`, `b.photos`) and her own choice in `block_switches.content`
(`photo_id`, `photos`), which `photoPlaces.js:59-69` reads and `photosToRemove` doesn't.

**Scenario** (scratch test C). She tags a sweet puppy photo to its puppy, then picks the same
photo for the photo block on Our story (one an owner put there, and one she may change). The
photo library lists it under "Our story: Photo". She switches the litter off; 31 days later
both photos are `removed_at`, and their files go once a publish no longer lists them. Her
next publish renders the Our story block with no photo. A gallery strip set to that litter's
album (`source: 'album'`) loses the album outright.

**Why it matters** Silent loss of a photo she placed on a page, the class of loss §5.3 rules
out ("the cleanup never deletes a photo a surviving record uses").

**What I'd do** Have `photosToRemove` reuse `photoPlaces` (or the same readers) as the one
answer to "where is this photo used", so the two can't drift again.

## 4. "Deleted on" is a day early for a breeder west of UTC  (S2, verified)

**Where** `deletesOn` (`clock.js:35`) is the UTC date of `left_site_at + days`; the screen
formats it with `timeZone: 'UTC'` (`manage/index.js:182`); the cron runs at `23 4 * * *` UTC
(`wrangler.toml:81`) and deletes at the first run after the exact instant.

**Scenario** (scratch test E). She switches a litter off at 8:30 pm Pacific on 2 April
(03:30 UTC, 3 April). The list says "Deleted on May 3". The 04:23 UTC run on 3 May is
9:23 pm Pacific on **2 May**: it goes then. Any litter that leaves between 5 pm and 9:23 pm
Pacific (8 pm–11:23 pm Eastern), the hours a breeder does her admin, is deleted the evening
before the date shown. A breeder who left Keep for "the day" loses it.

**What I'd do** Show the day of the first cron run after the due instant, in her time zone
(or the day before, "Keep by"), and test it at 23:59 local.

## 5. A restored backup brings back old clocks  (S2, verified by reading + scratch test J)

**Where** `restoreRows` (`backup.js:185`) writes `left_site_at` as stored; `restoreFinish`
doesn't touch it. `expireLitters` skips only `status = 'closed'` sites (`clock.js:132`), and a
site being restored is `suspended`.

**Scenario** A backup made while a litter was 20 days into its 30 is restored 15 days later.
Its `deletes_on` is already past; the next 04:23 UTC run deletes it and its photos, before
she has seen the restored site. If that run falls during the restore itself, it can delete a
litter whose photo tags, albums and pages haven't been put back yet, so `photosToRemove`
judges "unused" from a half-restored site, and the later rows for its puppies can no longer
go in (their litter is gone).

**What I'd do** Re-stamp `left_site_at` to the restore's time in `restoreFinish`, and skip
sites with a restore marker (or all `suspended` ones) in `expireLitters`.

## 6. Her own dog record for a kept puppy is doubled  (S3, verified)

**Where** `bundle.js:755-765`: the puppy lookup comes before `candidate()`.
**Scenario** (scratch test F). She kept Fern and made Fern's dog record by hand. KennelOS
then sends Fern as a dog. The hand-over makes a second "Fern" (`fern-2`) with no match
offered: her Dogs page shows two Ferns, one with her bio and photos, one with KennelOS's
data under Up and coming. **What I'd do** Look for a name candidate first, and carry the
puppy's photos into whichever dog results.

## 7. Two KennelOS dogs with one name: the wrong one can never be matched  (S3, verified)

**Where** `claimed` (`bundle.js:740-741`) gives her one record to the first KennelOS dog in
bundle order; the second falls through to `createDog` (line 767). **Scenario** (scratch
test H). KennelOS sends Willow (red) and Willow (brindle); her site has one Willow, which is
the brindle. She's asked about the red one only; brindle is already made new
(`willow-2`). She declines; the red one is made new too (`willow-3`). Her own Willow is never
offered again (both KennelOS ids now have records): three Willows on her Dogs page and no way
to join hers to the right one. **What I'd do** Hold every same-name KennelOS dog as pending
against the one candidate (or offer the choice of which), rather than creating the rest.

## 8. The match screen doesn't show everything a match changes  (S3, verified)

**Where** `matchChanges` filters to `OWNED[kind]` (`match.js:52`). `confirmMatch` also runs
`lineage()` and the next bundle runs the full `dogValues`. The pending data is stored as
JSON (`bundle.js:942`), losing the non-enumerable `sent` set (`bundle.js:161`), so confirm
applies a different set of fields than the bundle that follows.
**Scenario** (scratch test D). Her Willow has sire "Duke" typed by hand. KennelOS sends
Willow with lineage (sire Rocky). The screen lists registered name and colour. She confirms:
sire becomes Rocky, never shown. Her typed breed and country of origin are overwritten by
the next bundle (they're KennelOS's once sent, `ownedLineage`), also never shown.
**Why it matters** The plan's promise for this screen is "every field the match will change,
and she chooses". **What I'd do** Build the list from the same values the confirm and the
next bundle write (`dogValues` + lineage + `ownedLineage`), and keep `sent` in the stored data.

## 9. The puppy's "See more photos" link is lost at the hand-over  (S3, verified)

**Where** `bundle.js:759` carries `photo_id` and `bio` only; `dogs` has no
`more_photos_url` (0020 added it to puppies only). **Scenario** (scratch test A). She set
Fern's link to her Google Photos album for Fern. Fern becomes a dog; the litter goes; the
link she typed is gone with the puppy row. **What I'd do** Carry it to the dog (a column on
dogs, shown as on albums), or at least into the bio.

## 10. A litter held by a family's placement shows a date in the past  (S3, verified by reading)

**Where** `leavingLitters` (`clock.js:38-41`) lists every stamped litter; `expireLitters`
skips those with an open placement (line 133). **Scenario** Her litter left in June with a
pup still in the portal. In August the list still says "Deleted on July 10". The night the
placement closes (a loss, or a voided sale), the litter goes, with no new date shown first.
**What I'd do** Show "Kept while <family>'s puppy is in the portal" instead of a date, and
restart the 30 days when the hold ends.

## 11. Videos' preview photos outlive a deleted litter  (S4, verified)

**Where** `deleteLitter` deletes `embeds` at `litter:<id>` and `album:<id>`
(`clock.js:105-106`), but `photosToRemove` counts every embed's `preview_photo_id` as used
(line 85), read before the deletion. `embedStore.js:59` shows the intent: removing an embed
removes its preview. **Scenario** (scratch test K). A litter with a video goes; the preview
photo stays, not removed, under "Not used anywhere", counted against her photo and storage
limits forever. **What I'd do** Leave out the going embeds' previews from `used`, and add them
to the candidates.

## 12. One failing litter can stop every night's cleanup  (S4, suspected)

**Where** `expireLitters` deletes in `left_site_at` order and doesn't catch
(`clock.js:134-137`); `runCleanup` runs it before `runPortalDaily` and the photo purge
(`cleanup.js:34-36`); the cron handler has no catch (`index.js:62`). **Scenario** A litter
whose delete throws (bad JSON in one of its albums' `photos`, say, which `JSON.parse` at
line 72 doesn't guard) is first in line every night: the families deleted 30 days ago are
never purged, expired family codes stay, removed photos' files never leave R2, and nothing
tells the owner. **What I'd do** Catch per litter, skip and record it (an `/ops` line), and
run the portal and purge steps regardless.

## 13. `/ops` under-counts R2  (S4, verified by reading)

**Where** `usage.js:48` sums `photos` and `snapshots` only. `portal_files` (vet records,
contracts, up to 10 MB) and `portal_media` (stay photos, up to 10 MB each) are in R2 too.
**Scenario** Once the portal is in use, a few stays a month of eight photos each can add
more than the whole site's photo set, unseen by the "Over 80% of a free tier" line.
**What I'd do** Add both tables' `bytes` to the R2 row.

## Notes, not findings

- **A dog is never deleted by a clock: confirmed.** No path in `cleanup.js`, `clock.js` or
  `bundle.js` deletes a dog row; a dog KennelOS stops sending, archives, or whose litter
  goes is only `hidden_by_kennelos`; suspended sites behave the same; `photosToRemove` counts
  every dog's `photo_id` and every `dog:<id>` tag as used. The only dog deletes are her
  Remove (`records.js`), a content import (`content/io.js:356`, an owner tool) and deleting
  the site.
- **R2 failure leaves no dangling pair.** Photos are marked removed in the same batch that
  deletes the litter; files are deleted before `purged_at` is set, so a failed R2 delete is
  retried the next night (`removed_at < 1 day ago`), and a failed D1 update after a good R2
  delete just repeats a harmless delete. Removed-but-not-purged photos don't count against
  her limits (`photos.js:76`).
- **Limits.** A bundle never uploads photos or makes albums, so it can't cross a limit. The
  Account screen warns at 90% (`manage/screens/account.js:27`); uploads are refused at the
  limit with a plain message.
- **Nothing outside the app says a litter is leaving.** The 30 days are only on the Site
  Manager's list and Home count; a breeder who doesn't open it for a month loses the litter.
  As the plan designed it, but worth a push/email once the owner wants one.
- **The owner lowering `litter_days`** (1-365, `manage/builder/timing.js:9`) makes every
  litter past the new number due that night, with no warning on the builder screen.
- **The nightly cap of 50** is global, oldest first: fair enough, and a backlog drains at
  50 a night. Each delete reads the site's whole photo-using tables (about 14 queries), so 50
  is about 700 D1 calls a run; if binding calls count toward the subrequest limit on the
  plan in use, that's within 1000 but not by much once the purge's snapshot reads are added.
- **The general purge** takes the 500 oldest removed photos and skips those a kept snapshot
  names (`cleanup.js:45-75`); if 500 such ever pile up, newer removals never purge. Needs
  many sites that rarely publish; not a finding today.
- **Double-tapped Decline** (two `declineMatch` at once) made one dog in the D1 helper, which
  runs statements one at a time; real D1 could interleave the two `load`s and make two.
  Not reproduced.
- **A match for a record she has since removed:** Confirm says "That website record is no
  longer there" and drops the pending row, but the KennelOS dog isn't made until the next
  bundle. Fine, but the message could say so.
- **After an Unlink and a relink,** puppies have lost their `kennelos_id`, so a later
  hand-over finds no puppy and makes a dog with no photos (finding 1's fix covers it if it
  matches by name too).
- **A kept litter that KennelOS sends again** comes back as a name-match question (Keep
  clears its `kennelos_id`), or as a second litter if she renamed it. Rare: KennelOS no
  longer sends sold or closed litters.
- **Photos of the kept puppy in the litter's albums** (not tagged to her) go with the
  albums, as §5.3 says. A line on the Keep card ("albums go too; tag the photos you want to
  keep") would make that a choice.
- "Deleted on" and the leaving card's paragraph are inline in `manage/screens.js:192-193`,
  not in `wording.js` (session 6's area).

## Coverage gaps I found (tests that should exist)

- The hand-over when the dog already exists before the litter leaves, and when a puppy photo
  is added after the hand-over (finding 1).
- A closed placement (loss) and the litter's deletion: the family still sees the photos (2).
- `photosToRemove` against a photo in an owner block and in `block_switches` (3), and an
  embed preview (11).
- `deletesOn` against the cron hour and a time zone west of UTC (4).
- A restore followed by `runCleanup` (5); `expireLitters` with one litter that throws (12).
- The match screen's list compared with what confirm plus the next bundle write (8).

## What I did not get to

- `worker/public/_kp/o/backup.js` and `docs/plans/backup-format.md` beyond what finding 5
  needed; `backup.test.js`, `outside.test.js`, `photoshapes.test.js` (read by name only).
- Migration 0029 (outside dogs) as a lifecycle: whether a dog leaving KennelOS is turned
  into an outside dog anywhere (I found no code that does; the plan line may be drift).
- Real D1 concurrency (the double-tap Decline, a bundle landing during a confirm).
- `node worker/scripts/cpu-check.mjs` against a 50-litter cleanup run.
- The KennelOS side: whether it really sends a kept pup's Dog record during the litter (the
  contract says so for marked puppy-status dogs; finding 1 doesn't depend on it, since a
  photo tagged after any hand-over is lost the same way).

# KennelPort × KennelOS: version-1 code review plan

> **Ready to run (updated 2026-11-14, evening).** Written against the code of 2026-11-03,
> parked, then brought up to date twice on 2026-11-14: file lists against
> `docs/CODE_MAP.md` (loose ends #18), then for everything built since (the shared sign-in,
> page addresses, the forms' fields, migration 0035) with questions for each feature built
> after 3 November, not only its files. **The target is `main` at the merge of branch
> `ccr-a71eca85-omlwep`** (page addresses and the forms' fields): each session records the
> commit it reviewed (section 0, "Before you start"). KennelOS paths and test counts are
> still unchecked: no session that updated this plan could attach the KennelOS repo. Sessions
> that read KennelOS (1, 2, 4, 5, 9) check its paths against KennelOS's own map first. The
> plan docs named here live in `docs/plans/` (`kennelport.md` is "plan"), the build log in
> `docs/log/`. "Guide §n" is KennelOS's guide.

A read-only review of the built code against the plans, run over several sessions.
**KennelPort is the higher priority**; KennelOS is reviewed where it touches KennelPort
and where it feeds the website.

We are **not** hunting for departures from the plan. The plans are older than the code and
may be wrong. We are hunting for:

- **Defects** — code that does the wrong thing, loses data, or fails on real input.
- **Pitfalls** — code that works today and breaks on the next ordinary change, deploy,
  scale-up or edge case (caps, limits, retries, two devices, two kennels, offline).
- **Poor user experience** — a breeder or a visiting family hits a dead end, a silent
  failure, a confusing word, a lost edit, an unreadable page, a wait with no feedback.
- **Doc drift** — only where the drift itself will cause one of the three above (a future
  session or a future change relying on a statement that is no longer true).

Plan sections are quoted as the contract to *compare against*, not as a rulebook. When code
and plan disagree and the code is better, the finding is "doc drift (harmless)" or nothing.

---

## 0. Ground rules for every session

**Both repos are checked out.** `/home/user/Kennelport` and `/home/user/KennelOS`. Confirm
with `ls` before starting; if one is missing, attach it (`add_repo`) rather than guessing.

**Read-only review.** Do not change product code, tests, or any file under
`worker/public/_kp/` or `KennelOS/shared/`. Do not bump `APP_VERSION`,
`ASSET_VERSION`, or KennelOS's `CACHE_NAME` — both repos require asking the owner first,
and a review has no reason to touch them. The only files a review session writes are its
own findings file and the index (below). If you want to prove a defect, write a scratch
script in your scratchpad directory, not in the repo.

**Before you start.** Record the KennelPort commit you review (`git log --oneline -1`) at the
top of your findings file. If it is later than the target (the header above), run
`git diff --stat <target>..HEAD -- worker/src` and read what changed in your files first: the
plan doesn't know about it. File sizes aren't listed here (they drift); `wc -l` the files you
are given.

**Green baseline.** `node --test` in `/home/user/Kennelport` → 448 pass at the target
(2026-11-14). KennelOS on 2026-11-03: `node --test` → 1490 pass, `cloud` `npm test` → 279 pass;
not rechecked since, so record what you see. If your session starts red, that is finding
number one; say so and stop guessing.

**Evidence standard.** Every finding carries:
1. `file:line` (both sides, for a cross-app finding);
2. a concrete failure scenario — the inputs or sequence of taps, and what the breeder or
   the family actually sees or loses;
3. whether you **verified** it (ran it, wrote a throwaway script, read both sides and the
   stored shape) or it is **suspected** (reasoning only). Label each one.

A finding with no scenario is not a finding. "This could be hardened" without a path to a
real user hitting it belongs in a short "notes, not findings" section at the end.

**Severity.**
- **S1 — data loss or silent wrong data.** Something she typed is destroyed, a family sees
  a wrong price/status/name, or a record disappears with no trace.
- **S2 — broken path.** A flow dead-ends, a retry double-applies, a limit refuses a
  legitimate action, a page 500s or renders blank.
- **S3 — poor experience.** Works, but confusing, slow, unreadable on a phone, or silent
  where it should speak.
- **S4 — latent.** Fine today; the next ordinary change or scale-up breaks it.

**Not findings** (deferred on purpose — check before reporting):
- `docs/plans/backlog.md`: requests, guided custom domains, the pickup page's structured
  places and KennelOS transport settings (backlog 4; the `/pickup` page with her own words
  is built and **is** in scope), the rest of 3.9, survey pages, past litters.
- The **Open** entries in plan section 9 (content rules and suspension, decision 9).
- `docs/loose-ends.md` items not yet built: #5 waitlist facts, #6 the owner's other blocks,
  #7 fonts, #8 the other display rules, #9 the portal's wording in her list, #10 KennelOS
  shares with album links, #16 content rules, #19 automated fingerprints, #20 splitting the
  big files, #21 the staging deploy. Report a defect in what *is* built around them, not
  their absence.
- Site builder steps 5 to 7 and family-portal phases 2 and 3 (`docs/STATUS.md`).

`docs/STATUS.md` names what is built and what is only built-but-untried; "built, not yet
tried with a real litter" (the portal's gate) is not a defect, but *code that cannot work
when it is tried* is.

**Output.** One file per session:
`docs/review/findings/NN-<slug>.md` in the **KennelPort** repo (findings about KennelOS go
there too, so everything is in one place). Then add your row to
`docs/review/index.md`. Commit docs only, push to the branch your session was assigned.
Use this shape:

```markdown
# NN — <session title>

Commit reviewed: <hash>  ·  Changed since the target: <none, or the files>
Reviewed: <files, with line counts>  ·  Contract read: <doc sections>
Verified by: <tests run, scripts written, pages opened>

| # | Sev | Where | What | Verified? |
|---|-----|-------|------|-----------|
| 1 | S1  | worker/src/kennelos/bundle.js:412 | one-line claim | verified |

## 1. <title>  (S1, verified)
**Where** … **Scenario** … **Why it matters** … **What I'd do** (one or two lines, no patch)

## Notes, not findings
## Coverage gaps I found (tests that should exist)
## What I did not get to
```

**Tooling available.** `grep`/`rg`, `node --test`, `node --check`, `node build/assemble.mjs`
(KennelOS), `node worker/scripts/cpu-check.mjs`, `python3 -m http.server 8000` plus
Chromium/Playwright (pre-installed; use it for 320px-wide and phone-emulation checks, and
screenshot at `deviceScaleFactor: 2` only for images a person will look at). KennelPort's
Worker has no local dev server set up in these sessions — drive it through
`worker/tests/helpers/worker.js` and the D1 helper instead of trying to `wrangler dev`.

**Where the contract lives.**

Find a section with `grep -n '^#' <file>` and read that range; line numbers aren't given
because they move.

| Contract | Read |
|---|---|
| The KennelOS link, end to end | `Kennelport/docs/plans/kennelport.md` §5: 5.1 principle, 5.2 linking, 5.3 what a bundle does, 5.4 photos/addresses, 5.5 the KennelOS side |
| The waitlist on the site + the sealed application form | same file §3.8 |
| What's public, puppy statuses, prices, embeds | §3.2, §3.3, §3.6, §3.7 |
| Sign-in, draft/preview/publish, photos, limits | §4 |
| Decisions (and what's still open) | §9; risks §10 |
| The site builder: pages, blocks, menu, rules, page addresses, forms, the owner's tools | `docs/plans/site-builder.md` (its "Decisions" and "Building it, in steps") |
| What KennelOS sends beyond the first contract | `docs/plans/kennelos-contract.md` |
| The family portal | `docs/plans/family-portal.md`, `docs/plans/done/family-view.md` |
| The senior review's own verdicts (don't re-report them) | `docs/review/senior-review-2026-11.md` |
| KennelOS's own account of the same link | `KennelOS/docs/End_State_Design_and_Maintenance_Guide.md` §35 |
| KennelOS waitlist, editions, invariants, SW | same guide §29, §0, §16, §12 |
| KennelOS cloud sync/backup | `docs/KennelOS_Cloud_Phase1_Plan.md`, `_Phase2_Sync_Plan.md`, `cloud/README.md` |

Do not read `log/BUILD_LOG.md` by default in either repo (grep it for a feature's entry
when you need why something is as it is). Do skim `git log --oneline --since=2026-11-03` in
both, filtered to your files (`-- <paths>`): the newest work is the least reviewed, and
commits that reversed each other (KennelOS `84c40e3` then `2c00f28` on the
full-registration surcharge is one) are where the two sides most easily disagree.

---

## 1. The sessions

Twelve sessions (11 and 12 added 2026-11-14; the evening update added page addresses and the forms' fields to 4, 5, 6, 7, 8 and 12, and the shared sign-in to 2). **1, 2, 3, 5 are the priority four** — they are the cross-app seam, where a
defect costs a breeder her data or a family a wrong answer. 4 and 9 close the loop on that
seam. 6, 7, 8, 11 (the family portal) and 12 (the owner's admin view) are KennelPort's own surface. 10 consolidates.

Sessions 1–9, 11 and 12 are independent: any order, and several can run in parallel. Only session 10
needs the others finished. If a session finds its area clean early, it should go deeper on
its own "what I did not get to" list rather than wandering into another session's files —
overlap wastes the budget we are splitting for.

---

### Session 1 — The bundle contract, field by field (KP + KOS) ★ start here

**Why first.** Everything a family reads about a dog, a litter or a puppy arrives through
this one call. A mismatch here is wrong data on a public website, or a breeder's typed
field destroyed.

**Read**
- KennelPort: `worker/src/kennelos/bundle.js`, `worker/src/kennelos/api.js`,
  `worker/src/content/model.js` (the shapes the bundle writes into),
  `worker/src/migrations/0015_kennelos_link.sql`, `0016_products.sql`, `0017_registration.sql`
- Added 2026-11-14: the contract's later sections and their fields: migrations
  `0025_co_owned`, `0029_outside_dogs`, `0030_dog_parents`, `0033_kennelos_raw`,
  `0034_origin_lineage`; `worker/src/content/fields.js` (`pedigreeOf`, `originOf`, the
  raw fields as block fields); `worker/src/content/rules.js` (a pup's status and a
  product's place from KennelOS's raw values); `worker/src/kennelos/demo.js` and
  `sampleDates.js`; the made-up kennel in `worker/tests/fixtures/linked-sample/`. Tests:
  `linked-sample.test.js`, `lineage.test.js`, `coowned.test.js`, `outside.test.js`,
  `dog-parents.test.js`, `no-reserved.test.js`, `demo.test.js`. Contract:
  `docs/plans/kennelos-contract.md` Part C, and `docs/plans/done/` for co-owned dogs, the
  linked sample and the two KennelOS hand-overs.
- KennelOS: `shared/data/siteExport.js`
- Tests already there: `worker/tests/kennelos.test.js`, `KennelOS/tests/siteExport.test.js`
- Contract: plan §5.1, §5.3 (the ownership table, "what a blank means"), §3.6, §3.7, §3.2;
  guide §35

**What you are evaluating**
1. **Key and shape parity.** `siteExport`'s `*_KEYS` / `assertOnlyKeys` against
   `bundle.js`'s `SHAPES` and `TOP`. For every field: does KennelOS's `line(v, max)` cut at
   the same length KennelPort's `S(max)` accepts? A shorter KennelPort max means silent
   truncation or a refusal; a longer one means dead allowance. Enum values
   (`DOG_STATUS`, `PUPPY_STATUS`, `SEX`), required flags, date formats.
2. **Caps.** `SITE_MAX` vs `MAX`, and `MAX_BUNDLE_BYTES`. Is `puppies: 30` per litter on one
   side and per bundle on the other? What does a breeder with 210 dogs actually see — a
   clear "too many to send" with a way forward, or a refusal she can't act on? Does one
   over-cap record block the whole update?
3. **Section negotiation.** `SECTIONS = ['products', 'registry']`, `siteFacts`'s `sections`,
   and `siteExport`'s `sections` argument. Products are held back from an older Worker —
   is `registry` (migration 0017, recent) held back the same way, and is a puppy's
   `registration` inside `PUPPY_KEYS` unconditionally? An older Worker refusing the whole
   bundle over one new field is an S2.
4. **Idempotency and retries.** `device.last_bundle_id` is per *device* row. Walk: the same
   bundle id from a second device; a retry after `Unlink`; a retry after the batch
   half-failed; two Update presses in flight at once. The plan promises "answered with its
   first summary instead of being applied twice".
5. **Atomicity at size.** One `env.DB.batch(w.s)`. Count the statements a full bundle
   generates (200 dogs × fields + 100 litters × 30 puppies + health + extras + products +
   steps + clocks). Check it against D1's real batch limits and the Worker CPU budget
   (`worker/scripts/cpu-check.mjs`). A bundle that is refused *because it is big* is an S2
   for exactly the breeder who most needs it.
6. **Blanks: stored vs derived.** `Writer.update` / `updateDog` / `updateLitter`. A stored
   field cleared in KennelOS must clear here; a derived one (titles, health results) must
   never blank a typed value. Prove both with a scenario.
7. **Emptying a list.** `if (clean.extras)` deletes extras not sent; `if (clean.steps?.length)`
   skips entirely when she has no steps — so stale How-it-works steps may live forever.
   Same question for `products` and `payment`. Is "delete the row" right at all, given the
   plan's "a bundle itself never deletes a photo, file, album or page" and that a product
   row holds her picture, badge and wording?
8. **Name takeover.** Products take over a hand-made row by name (`free.findIndex`);
   extras do not. The plan says both match by name. Which behaviour does a breeder want,
   and does the one that happens surprise her?
9. **Marks off → `hidden_by_kennelos`,** and back on again (`counts.back`). Does a record
   that returns come back whole, with its photos, slug and address?
10. **Pairing → litter,** `kept`/`claimed` sets: a pairing matched to two litters, a litter
    whose pairing row was declined, a pairing that failed, a heat that a pairing used.
11. **Prices.** `OWNED` / `OWNED_PRICES`, `site.kennelos_prices`, and the
    full-registration surcharge (KennelOS `84c40e3` → reverted `2c00f28`; KennelPort
    `04fe0dc`, `0b8aaea`). Do the two sides now agree on whether the surcharge travels
    without "Use my KennelOS prices"? Decisions 6, 31.
12. **Health results with `normal: null`** (KOS `e3a2a1b`, KP `62b8a75`): KennelPort "counts
    unmarked as normal". Read what the site actually prints for an unmarked test against
    §3.7 — this is a health claim about a dog on a public page, so an over-claim is S1.
13. **Puppy status mapping.** `siteExport.puppyStatus` → `PUPPY_STATUS` → what the page
    prints (decision 32, §3.6). Is `hidden` ever sent? Does `undecided → coming_soon` read
    as "Still deciding" and never as for-sale (decision 10)?
14. **Heats.** `websiteHeats` (60 back, one per month, 30/60 pairing window) vs the month
    rendering in `bundle.js` (`MONTHS`) and the page. Timezone and year boundaries:
    a heat in December shown as a month with no year.
15. **`waitlist_public_id`.** It is written when it differs — what clears
    `site.kennelos_public_id` when she turns `website_feed` *off*? A site that keeps
    reading a feed she withdrew is an S1 privacy finding.

**Verify** by writing scenarios through `worker/tests/helpers/d1.js` + `applyBundle` in a
scratch script, and by building bundles with `siteExport.buildSiteBundle` from fixture rows.
Both sides in one script is the fastest way to prove parity.

---

### Session 2 — Link lifecycle, tokens, editions and the license (KP + KOS)

**Why.** This is the authorisation boundary between two products, plus the one secret that
must never travel. A mistake is either a breeder locked out of her own site or a token in a
backup file.

**Read**
- KennelPort: `worker/src/kennelos/link.js`, `worker/src/kennelos/api.js`,
  `worker/src/auth.js` and `worker/src/signin.js`, `worker/src/gate.js`, `worker/wrangler.toml` (the origin and
  domain vars), `worker/src/migrations/0015_kennelos_link.sql`
- KennelOS: `shared/data/kennelportApi.js`, `shared/data/kennelportLinkStore.js`,
  `shared/data/kennelportLink.js` (the link/licence parts),
  `shared/data/editionConfig.js`, `shared/data/proPages.js`, `shared/data/syncRegistry.js`,
  `shared/data/importExport.js` (what a backup carries), `shared/data/license.js`
- Contract: plan §5.2, §5.5, §4, decisions 4, 5, 11, 27; guide §35, §0

**What you are evaluating**
1. **The code:** 8 chars, 15 minutes, single use, owners only, `LIMITS = { codes: 10, redeem_ip: 20 }`.
   Alphabet excludes look-alikes — does `normalizeCode` accept what `showCode` prints
   (the dash), and what a breeder types with a space or in lower case? Is a *used* code
   distinguishable from an *expired* one in what she is told? Does the rate limit lock out
   the honest breeder who mistypes twice (compare `auth.js`'s `MAX_ATTEMPTS`)?
2. **The token.** `device_secrets` only (`kennelport:<kennel id>`). Prove it is excluded
   from: a JSON backup, a restore, cloud backup, live sync (`syncRegistry`,
   `tests/cloudDirty.test.js`, `cloud/src/lib/cloudFields.js`). Also the `sent` bundle copy
   kept on the link row — it holds her records; prove it is device-only too.
3. **Bearer, no cookie, no referrer.** `kennelportApi`'s `call`, and
   `KENNELOS_APP_ORIGINS` vs `KENNELOS_ORIGIN` in `api.js`'s `cors`. Is the app origin list
   actually enforced, and is the family host kept out of it? What happens on a preflight
   from an origin not in the list — does the breeder see "network problem" when the real
   cause is a missing origin on a new deploy? (S4 that becomes S2 on the next domain.)
4. **Staging and localhost.** `kennelportBaseUrl()` / `devKennelportUrl`, `?cloud=staging`,
   and KennelPort's staging host on `workers.dev`. Can a Pro app on localhost be pointed at
   production by accident? Does a staging link survive into a production token row?
5. **Unlink, stop a device, disconnect this device.** `unlinkSite`, `stopDevice`,
   `disconnectWebsite`, and the `not_linked` path in `kennelportLink`. The plan: unlinking
   clears `source` and `kennelos_id` on every record so the draft becomes ordinary content
   "exactly as it stood". Read the SQL and say what is actually left behind
   (`hidden_by_kennelos`, `left_site_at`, `kept_at`, `link_pending`, `link_declines`,
   `feed_cache`, `kennelos_public_id`, `payment_info.source`). A record stranded hidden
   with no way to unhide it in the manage app is an S1.
6. **Multi-kennel and multi-device.** One kennel ↔ one site; a bundle from another kennel
   refused with `other_kennel`. Two own kennels, one site each; the same device linked to
   both; the kennel picker in `websiteCard`. Does `anyWebsiteLink()` (used to decide whether
   Kels offers website steps) confuse "this kennel is linked" with "some kennel is linked"?
7. **A lapsed Pro licence** sends nothing (`LicenseLapsedError`): what she is told, whether
   the site keeps what it has, whether renewing resumes with no new code, and whether
   Lite/Demo (`kennelportUrl: null`, `editionFlags.websiteLink`) make **zero** requests and
   show **zero** UI. Check the assembled editions (`node build/assemble.mjs`, then grep
   `dist/lite` and `dist/demo`), not just the shared source.
8. **Manage-app sign-in** (`auth.js` on `signin.js`): email hash only, 90-day sliding cookie, code TTL,
   `LIMITS`, `inviteToSite`, role checks for owner-only actions
   (`Link KennelOS`, `Unlink`, device stop). Is every owner-only action actually gated, on
   both the screen and the POST?
9. **One sign-in for two kinds of user** (since 2026-11-14, senior review item 10):
   `signin.js` serves the breeder (`auth.js`) and families (`portal/auth.js`). Each keeps its
   own code table, cookie (`kp_session` on `/`, `kp_family` on `/family`) and limit buckets.
   Prove a breeder's code never signs a family in and the reverse, a family's code works
   only on its own site, and one side's limit never locks the other out. Session 11 reads
   the family side; this session owns `signin.js` itself. `tests/copies.test.js` holds
   KennelPort's copies of KennelOS files (`lib/sql.js`, `lib/crypto.js`, `migrate.js`):
   check them against KennelOS's originals if that repo is attached.

---

### Session 3 — Records' lifecycle: matching, the hand-over, the 30-day clock, photos (KP)

**Why.** This is where the plan put its strongest promise — "a dog is never deleted by a
clock", "a bundle never deletes a photo" — and where a mistake destroys the only copy of a
breeder's pictures.

**Read**
- `worker/src/kennelos/match.js`, `worker/src/kennelos/clock.js`,
  `worker/src/cleanup.js`, `worker/src/photos.js`, `worker/src/photoTags.js`,
  `worker/src/ops/usage.js`, the hand-over block in `kennelos/bundle.js` (grep "The hand-over"),
  migrations `0018_puppy_photos.sql`, `0019_album_order.sql`, `0020_puppy_more_photos.sql`
- Added 2026-11-14: `worker/src/photoPlaces.js` (where each photo shows: the photo
  library), and what keeps a site whole when records go: `worker/src/backup.js`,
  `worker/src/ops/backup.js`, `worker/public/_kp/o/backup.js`, the format in
  `docs/plans/backup-format.md`. Migration `0029_outside_dogs` (a dog leaving KennelOS
  kept as an outside dog). Tests: `backup.test.js`, `outside.test.js`.
- Tests: `worker/tests/leaving.test.js`, `phototags.test.js`, `photoshapes.test.js`,
  `usage.test.js`, `albums.test.js`
- Contract: plan §5.2 step 4, §5.3 (gone from the bundle, the hand-over), §5.4, §4.2, §4.4,
  decision 28

**What you are evaluating**
1. **The hand-over.** `applyBundle` copies `pup.photo_id` and the `photo_tags` rows for
   `puppy:<id>` to the new dog. But a puppy now has **more than one photo** (migration 0020,
   commits `5115c0f`, `7bdc786`). Does the grown dog get all of them, or only the cover?
   Everything the cleanup then deletes 30 days later is gone for good — walk it and say
   exactly which files survive.
2. **`photosToRemove` / `deleteLitter`.** Prove a photo used by a surviving record
   (the handed-over dog, an album, another litter, a page block, a product) is never
   deleted. Check the R2 delete path and whether a failed R2 delete leaves a dangling row or
   a dangling object (which side of the pair leaks, and does it count against her
   storage limit?).
3. **The clock.** `litterClockStatements`, `OFF` (`kept_at IS NULL AND (show_on_site = 0 OR
   hidden_by_kennelos = 1 OR stage = 'past')`), `deletesOn`, `keepLitter`,
   `expireLitters(limit 50)`. A litter switched off and back on inside the 30 days; a litter
   she marks Past herself; a kept litter that KennelOS later sends again; the cron's 50-per-run
   cap across many sites (fairness and whether a backlog ever drains); timezone of the
   "deleted on 3 May" date she is shown. The plan's "when this ships" backfill — does any
   code set `left_site_at` for litters already off the site, or do they all become due the
   moment this deploys? That is the S1 to rule out before release.
4. **A dog is never deleted by a clock.** Confirm no path deletes a dog row or its photos on
   a timer, including when its litter goes, when it is archived in KennelOS, and when the
   site is suspended.
5. **Matching.** `pendingMatches`, `matchChanges`, `confirmMatch(keep)`, `declineMatch`,
   `link_declines`. The plan's promise is that the screen shows every field the match will
   change and she chooses. Check: a declined pair never asked again; a confirm that half
   fails; a `claimed` collision when two KennelOS dogs share a name; the `WORDS`/`VALUE_WORDS`
   wording for a field she can't place; a match offered for a record she has since deleted.
6. **Limits** (`ops/usage.js`, `storage_limit`, `photo_limit`, `album_limit`): what a breeder
   sees as she approaches one, what the bundle does when a new record would cross one, and
   whether orphaned-but-not-yet-purged photos count against her.

---

### Session 4 — Addresses back to KennelOS, and publish/snapshot integrity (KP + KOS)

**Why.** KennelPort writes into KennelOS's own records here (`dog.url`,
`litter.photos_url`, the kennel's `website`). It is the only write that crosses back, and
the plan says it must only ever hand over an address that answers.

**Read**
- KennelPort: `publishedAddresses` + `recordPaths` in `worker/src/publish.js`,
  `worker/src/kennelos/link.js` (`siteFacts`, `siteBase`, `siteAddress`),
  `worker/src/domains.js`, `worker/src/diff.js` (its words are now the owner's,
  `manage/wording.js` `publish.diff.*`). Added 2026-11-14: what the snapshot now carries
  beyond records: the breeder's picks (`worker/src/content/picks.js`; migration
  `0031_block_picks`), the site's build (`content/blocks.js` layout, `content/rules.js`;
  migration `0027_site_builds`), and the Featured block turning over with no publish
  (`content/featured.js`; `site.js` `cacheKey`)
- Added 2026-11-14 (evening): **page addresses** (`docs/plans/site-builder.md`, "Page
  addresses"): `worker/src/content/addresses.js` (the rules, `settleAddresses`),
  `render/parts.js` `pagePath`/`pageAt`, `render/index.js` routing by them, `publish.js`
  `recordPaths` (now keyed `page:<key>` too, so the existing redirect code covers pages),
  `site.js` (the redirect lookup on a 404, and a form posted to an old address), migration
  `0035_addresses_forms` (`site_pages.path`). Test: `addresses.test.js`.
- KennelOS: `shared/data/kennelportLink.js` (`addressChanges`, `kennelChanges`,
  `websiteOffer`, `useSiteAsKennelWebsite`, `keepKennelWebsite`),
  `shared/data/websiteAddress.js`
- Tests: `worker/tests/publish.test.js`, `editing.test.js`, `domains.test.js`,
  `KennelOS/tests/siteExport.test.js`
- Contract: plan §5.4, §4.1, decision 15; guide §35 (`addressChanges` / `kennelChanges`)

**What you are evaluating**
1. **`publishedAddresses` reads the *published* snapshot** and runs after the bundle is
   applied. So a brand-new dog in this bundle has no address yet (right), but a dog whose
   page exists only in the draft, or whose page the snapshot predates, reports as **gone** —
   and KennelOS then blanks a `url` it wrote. Walk: apply a bundle, don't publish, apply
   again. Does she lose the links in her Companion packages and waitlist in between? This is
   the S1 lead of this session.
2. **`snap.pages?.litters?.enabled`.** With the Litters page switched off, every litter and
   puppy address disappears from the answer. Same question as above, plus: is that what she
   meant by turning a page off?
3. **Only blank, or only ours.** `isWebsiteAddress(url, sites)`: any `kennelport.com` page
   plus her own site addresses. A custom domain she has connected; a *former* subdomain; a
   Google Photos link she typed that happens to be on a KennelPort domain. Never overwrite
   what she typed (plan §5.4), and never leave a puppy-page address in a grown dog's `url`.
4. **The kennel's `website` and `kept_website`.** Remembered per device, per site address,
   so a new address asks again. Check what happens when she says "Keep mine" and then
   connects a custom domain, and whether `websiteOffer` can ask twice in one sitting.
5. **Publish, undo, prune.** `buildSnapshot` (what it strips: `SYSTEM`, `LITTER_PRICES`),
   `MAX_SNAPSHOT_BYTES` (8MB) against a site at its photo limit, `KEEP = 10`, `prune`,
   `undoPublish`, the in-memory snapshot cache (`MEMORY_MAX = 20`, `forgetSnapshots`) across
   Worker isolates — a stale cached snapshot served after a publish is an S2.
6. **Slug stability.** A slug is in a public address and in `dog.url`. What renames a slug
   (a call-name change from KennelOS, `uniqueSlug` collisions, a dog and a puppy competing)?
   A renamed slug silently breaks every link already handed to families — if that is
   possible, it is S1.
7. **Draft/published leakage.** Does any public path ever read draft content
   (`/__preview`, `__host`, the feed-backed waitlist page, `servePhoto` in preview mode)?
8. **Page addresses and their redirects.** A 301 is cached by browsers for a long time,
   so a wrong one is hard to take back. Walk: rename, publish, rename again (the chain), rename
   back (the redirect dropped), undo a publish (`undoPublish` writes no redirects: does the
   page then 404 at the address visitors were just sent to?), the owner removing a page she
   renamed (nothing should redirect), and the owner adding a page at an address she has used
   or that is an old address. `settleAddresses` gives a contested address to the first
   page: can an import or a race leave her looking at an address in her Pages that the site
   doesn't use? Do old addresses she has handed out (a QR code, KennelOS's `dog.url`) ever
   point at a page address, and survive?
9. **What reaches the Publish list.** Every change a family would see should be listed:
   the build (blocks, menu, rules, tags, the forms' fields), her picks, an address
   change, a page the owner added. Something that changes the site but says "Nothing to
   publish", or a line on every Publish for a change nobody made (an old snapshot without a
   new field), is S3.
10. **What the snapshot must not carry.** `buildSnapshot` keeps reviews' `answers` out
   (the review form's for-the-breeder-only answers, migration 0035). Check every table read
   there for a column added since 2026-11-03 that a `SELECT *` now carries into R2 and the
   page.

---

### Session 5 — The waitlist page, the feed, and the sealed application form (KP + KOS cloud)

**Why.** The one place a *family's* data crosses between the products, in the visitor's
browser, with crypto and a third-party captcha. Also the busiest set of fallbacks in either
repo, and the deciding rule for where an application lands.

**Read**
- KennelPort: `worker/src/feed.js`, `worker/src/site.js` (`cspFor`,
  `withTurnstile`, the `/waitlist` live path), `worker/src/siteforms.js`,
  `worker/src/waitlist.js`, `worker/public/_kp/t/ak/site.js` (`sealToKennelos`),
  `worker/src/render/pages.js` (`waitlist`, `waitlistHelp`), `worker/src/embeds.js`.
  Added 2026-11-14: the form and its pieces split out, `worker/src/render/pages/
  applicationForm.js` (102, KennelOS's form) and `formParts.js`; her inbox,
  `worker/src/manage/screens/inbox.js`; the 90-day cleanup of messages and fulfilled
  entries, `worker/src/cleanup.js`
- Added 2026-11-14 (evening): the contact and review forms are now the owner's
  (`worker/src/content/forms.js`, `docs/plans/site-builder.md` "Forms"):
  `render/pages/formParts.js` draws them from `formOf`; `siteforms.js` `receiveInquiry` and
  `receiveReview` check them against the published snapshot and keep extra answers
  (`inquiries.answers`, and `stories.answers` from migration 0035); `site.js` takes a form's
  post by page (`FORM_PAGES`, `pageAt`), so the contact and review pages can be renamed.
  Test: `forms.test.js`.
- KennelOS: `cloud/src/familyPages.js` (`siteView` / `formView` / apply / verify /
  code), `cloud/src/lib/cors.js`, `cloud/src/index.js` (the `/f/` routing),
  `shared/data/waitlistProjection.js`, `cloud/public/family/common.js`,
  and KennelOS's own `seal.js`
- Tests: `worker/tests/kennelosform.test.js`, `waitlist.test.js`, `messages.test.js`;
  `KennelOS/cloud/tests/familyPages.test.js`, `application.test.js`;
  `KennelOS/tests/waitlistEmbed.test.js`, `waitlistProjection.test.js`
- Contract: plan §3.8 (all of it), §3.10, decisions 21, 26; guide §29, §35

**What you are evaluating**
1. **Decision 26's routing**, in code: the feed's `apply` link decides whether every Apply
   button goes to KennelOS or to KennelPort's own form. Enumerate all four states (no
   KennelOS / feed without `form` / feed with `form` / frame embed) and check each button on
   each page agrees — Home, Litters, a litter page, the waitlist page, the footer. One button
   pointing the other way puts a family on the wrong list, and the plan's promise is "never
   on two lists".
2. **Sealing parity.** `sealToKennelos` in the template script vs KennelOS's `seal.js`
   (ECDH P-256, HKDF-SHA-256, AES-GCM): key id, info/salt, the exact byte layout, and what
   happens when KennelOS rotates the form key (`409 form_changed`). A silent mismatch means
   applications that vanish — S1. Prove it by sealing with the template's code and opening
   it with KennelOS's.
3. **The three cross-origin endpoints.** `WEBSITE_PATHS`, `isWebsiteOrigin`,
   `websitePreflight`: the subdomain regex, the staging host, `WEBSITE_ORIGINS` added by
   hand for a custom domain. What a family sees when her breeder's custom domain is **not**
   in that list yet (the documented, by-hand step) — a form that posts and fails silently is
   S2, and the plan knows this step is manual, so the question is whether the page says
   something useful. Also: no credentials, no session, no status link returned from a
   website-origin verify, and the per-address / per-email limits still applying.
4. **Turnstile.** `cspFor` adds Turnstile only when the feed carries a form and only on
   `/waitlist`; KennelOS's widget must list the site's hostname (a setup step). What happens
   on a custom domain, or when the key is absent? Does the form block on a captcha that can
   never pass?
5. **The feed.** `FEED_FRESH_MS` (5 min), `FEED_RETRY_MS`, `FEED_TIMEOUT_MS` (4s),
   `FEED_MAX_BYTES`, `PUBLIC_ID` regex, `parseFeedAddress`, `readFeed`'s caching and its
   `not_shared` 404. A 4-second blocking fetch inside a page render: measure what the visitor
   waits for on a cold cache, and check the fallback actually renders the last copy with its
   "Updated" date. Is the feed fetched on pages that don't need it?
6. **Privacy.** The only KennelOS data kept is `feed_cache`. Confirm: no emails or phones in
   the feed or the cache, masking parity with KennelOS ("A***** K"), the gap note for paused
   families, deletion of the cache when she removes the feed address or turns the feed off
   (cross-check session 1, item 15), and that the review/contact forms in
   `siteforms.js` never leak an applicant's data into KennelPort's Inbox.
7. **The manage app's steering** (also session 6): greyed "Your waitlist" when linked,
   Inbox dropping "Add to waitlist", application questions marked not used — greyed screens
   still open, nothing set up is hidden.
8. **`/waitlist/help`** and the draft outline; the Family login links; the 320px stacking the
   plan promises (verify in a real browser at 320px).
9. **`waitlistProjection.js`** on the KennelOS side: what it publishes vs what the website
   draws, and whether "the site's Litters section and Available Puppies agree" actually
   holds (two code paths, one truth — `isPupAvailable`, decision 10).
10. **The owner's forms, as a family meets them.** A field the owner made required that a
   family can't fill (a choice with no options left, the pup-or-litter list on a site with
   no litters); the answers checked against the *published* form while the page in the
   family's browser is older (a field added, removed or made required in between: what do
   they see?); a full-registration link with the subject switched off (carried as a hidden
   field); a review with the rating off; the photo required. The for-the-breeder-only
   answers (email, phone, the owner's questions on a review) must never reach the snapshot,
   the review card or `content.json`'s reviews: prove it.
11. **Posting by page.** A form posted to a renamed page's old address is taken as that
   page; anything else that isn't a form page is 405. Check a POST can't reach a page that
   isn't a form, a page that's off, or the waitlist on a site whose applications go to
   KennelOS, by way of an old address in `redirects`.

---

### Session 6 — The manage app: a breeder on a phone (KP)

**Read** `worker/src/manage/index.js`, `screens.js`, `forms.js`,
`worker/public/_kp/m/app.js`, `photos.js`, `sw.js`, `zip.js`,
`app.css`, `worker/src/push.js`, `worker/src/badgeCode.js`, `worker/src/mail.js`,
`worker/src/manage/version.js`. Added 2026-11-14: `screens.js` split into
`worker/src/manage/screens/` (`pages.js`, `picks.js`, `dogform.js`,
`account.js`, `inbox.js`, `share.js`, `queue.js`, `parts.js`); her wording,
`worker/src/manage/wording.js` (every line she reads, `say()`); the portal sites'
app, `worker/src/manage/hub.js` (Today, Families, Dogs, Website, Portal);
`worker/src/sites.js`. Tests: `manage.test.js`, `messages.test.js`, `share.test.js`,
`logo.test.js`, `versions.test.js`; added `wording.test.js`, `picks.test.js`,
`portal-hub.test.js`, `profiles.test.js`. Contract: plan §4 (all), §3.12, §3.8's manage paragraphs,
§5.2 step 4, decisions 12, 13, 17, 24.

**What you are evaluating**
- Every screen's empty, error and offline state. The app is installable and served from its
  service worker's cache first: what does a breeder see when she is in a barn with one bar —
  a stale screen with no warning, a spinner, or a clear "not now"? Does the service worker
  ever serve a stale app against a newer API?
- Photo upload on a real phone: `photos.js` + `stripJpegMeta`, HEIC, 12MP files, several at
  once, orientation, a failed upload mid-batch, the limit reached mid-batch, and what the
  progress tells her. (Plan 4.2 says this was proved on real devices; look for what the code
  does on the *second* and *tenth* photo.)
- Publish: the diff list (`diff.js`), preview, undo, "matches waiting" on Home and Publish,
  the bundle notice (`notices`), `Keep` on a leaving litter and **Remove now** beside Keep
  (`bd90b5c`), which runs the cleanup's own `deleteLitter` today — is it reachable only
  for a litter already on its way out, and does the card say what it cannot undo?
- The matching screen's field-by-field "what this will change", and whether "Keep yours"
  is reversible.
- Form validation and escaping on every hand-built HTML path in `screens.js`/`forms.js`
  (apostrophes in a kennel name, `<` in a bio, a 10k-character paste).
- Owner vs editor on every screen *and* every POST; CSRF posture of the manage POSTs
  (`MANAGE_CSP`, `form-action 'self'`, same-site cookie).
- Push (`push.js`): permission flow, a dead subscription, iOS's installed-app requirement,
  and whether a notice is still findable in the app when push never arrived.
- Wording: read every sentence a breeder sees in these three files as a breeder. Flag jargon
  ("bundle", "snapshot", "source"), dead ends with no next step, and anything that says a
  record "left the site" without saying what to do about it.
- **Her wording is the owner's now** (`wording.js`, `say()`, decision 19): a key a screen
  asks for that isn't in the list, a `{name}` the line uses that the screen doesn't give,
  the owner's every-site line against a site's own, an error matched by its words
  (`sayError`, `sayMessage`) that no longer matches after a check's words changed (she then
  reads the raw text). Lines still in code are listed in the build log as "not moved yet":
  not a finding.
- **Added 2026-11-14 (evening):** her Pages screen's **Address** field
  (`screens/pages.js`, `content/addresses.js` `checkAddress`, `records.js` `savePage`): a
  card that saves only some fields (`_part`) must keep her address; the errors in her words;
  the suggestion from her menu name. Her Inbox shows a message's extra answers, and Reviews
  to approve a review's answers for her only (`screens/inbox.js`, `screens/queue.js`): an
  old message with no answers, a long answer, escaping.
- The portal sites' app (`hub.js`: Today, Families, Dogs, Website, Portal) and her picks
  screen (`screens/picks.js`): the same empty, error and offline states as every other
  screen.

---

### Session 7 — The public site: what a family sees (KP)

**Read** `worker/src/render/pages.js`, `parts.js`, `layout.js`,
`schemes.js`, `index.js`, `worker/src/site.js`,
`worker/public/_kp/t/ak/site.css`, `site.js`, the seven `scheme-*.css`,
`worker/src/content/akSample.js`, `worker/src/qr.js`, `worker/src/render/version.js`.
Added 2026-11-14: the pages split out into `worker/src/render/pages/` (`blocks.js`, the
data blocks, `featured.js`, `applicationForm.js`, `puppy.js`, `formParts.js`,
`albums.js`, `albumLists.js`, `contact.js`, `about.js`, `reviews.js`, `privacy.js`); what
the pages are built from: `worker/src/content/blocks.js` (pages as blocks),
`rules.js`, `fields.js` (conditions, order, groups), `tags.js`,
`featured.js`; kennelport.com's own pages, `worker/src/front.js`. Tests added:
`blocks.test.js`, `ownblocks.test.js`, `menu.test.js`, `headings.test.js`,
`faqplaces.test.js`, `spots.test.js`, `pickup.test.js`, `pills.test.js`, `tags.test.js`,
`fields.test.js`, `rules.test.js`, `picks.test.js`. Contract added:
`docs/plans/site-builder.md`, `docs/plans/kennelos-contract.md` Parts B and D.
Tests: `schemes.test.js`, `collage.test.js`, `photoshapes.test.js`, `sites.test.js`,
`worker.test.js`, `embeds.test.js`, `products.test.js`, `payment.test.js`,
`application.test.js`. Contract: plan §3 (3.1–3.13), §3.6, §3.7, §3.2, decisions 18, 23, 25,
31, 32; `docs/research/design-direction.md`.

**What you are evaluating**
- **Escaping, everywhere.** Every user value on every page, including attributes, `srcset`,
  `alt`, OG tags, JSON-LD if any, and the inline data the template script reads. One missed
  `esc` on a public page is S1.
- **Prices and statuses as decided:** one number per sex (31), "Still deciding" never
  reading as for-sale (32), placed puppies reading "Spoken for", the full-registration
  surcharge only with Show prices on, Show other prices off by default, no picks shown (18).
- **A page with nothing in it.** No photos, no litters, no reviews, one dog, a dog with no
  parents, a parent not on the site (named by call name, `a9c33c2`), a litter with 12
  puppies, an album with 300. Does the layout hold, and does it ever print an empty heading
  or a dangling "·"?
- **Phones.** 320px with no sideways scroll on every page (plan says so explicitly for the
  waitlist list); the collage layouts; `FOCUS`/`FRAMES`; long kennel names in the header.
- **Dark mode** (`auto` / `light_only`) across all seven schemes, including photos, frames
  and the badge colours; contrast on scheme pairs.
- **Embeds:** `PROVIDERS`, `FRAME_ORIGINS`, `SITE_CSP`'s `frame-src`, `readEmbedLink` on the
  share URLs people actually paste (mobile `m.facebook.com`, `youtu.be`, a Reel), and what a
  broken embed looks like to a visitor.
- **Caching and freshness:** `max-age=60` on pages, the asset version/fingerprint pair, the
  one-day browser hold on `_kp/t/`, `robots.txt`, `sitemap.xml`, OG and QR links, and what a
  visitor sees for a page that has left the site (`unavailable`, `gone`).
- **What the owner built** (the site builder; `content/blocks.js`, `fields.js`, `tags.js`,
  `featured.js`, `picks.js`): a block whose conditions match nothing (does it hide, or leave
  a heading?), a group with one record, a Featured block on a day nothing is scheduled, a
  tag rule on a field KennelOS stopped sending, the menu linking to a place that hides, her
  ticks after the owner changed a block. An old site's build read by new code must draw as
  before (decision 14).
- **Added 2026-11-14 (evening): page addresses and the forms.** Every link to a page goes
  through `pagePath` (`render/parts.js`): grep the template for a page's starting address
  still written by hand (`'/contact'`, `"/dogs"`…). A renamed page: the menu marks the
  right group as current (`section`), the sitemap lists the new address only, profiles stay
  at `/dogs/<name>` and `/litters/<litter>`. The forms drawn from the owner's settings
  (`formParts.js`): her words escaped in labels and options, a required field's
  "(optional)" dropped, two short fields to a row, the consent box last, at 320px.
- Do **not** bump `ASSET_VERSION` or run the fingerprint script as part of the review.

---

### Session 8 — Content layer, migrations and the platform (KP)

**Read** `worker/src/content/io.js`, `model.js`, `records.js`,
`prices.js`, `worker/src/migrations/*.sql` + `index.js`, `worker/src/migrate.js`,
`worker/src/index.js`, `hosts.js`, `domains.js`, `ops.js`,
`ops/sites.js`, `ops/usage.js`, `cleanup.js`, `embedStore.js`,
`lib/{sql,http,html,crypto}.js`, `worker/wrangler.toml`, `worker/scripts/*.mjs`.
Added 2026-11-14: migrations now run by themselves on the first request after a deploy
(`worker/src/gate.js`; it began as KennelOS's copy and now differs), so each of `0021` to
`0035` ran unattended on live data: check each only adds. `0035_addresses_forms` (page
addresses and the forms' fields) adds `site_pages.path` and `stories.answers`. The backup
(`worker/src/backup.js`, `ops/backup.js`; a new table with `site_id` must be in
`ops/sites.js` `SITE_TABLES`), the `/ops` sign-in limit (`ops.js`), `lib/demo.js`,
`worker/src/sites.js`. Tests added: `backup.test.js`, `worker.test.js`'s gate cases.
Tests: `content.test.js`, `sites.test.js`, `ops.test.js`, `hosts.test.js`, `domains.test.js`,
`usage.test.js`, `jpegmeta.test.js`. Contract: plan §2, §4.1, §4.3, §4.4, §6, §7, decisions
1, 8, 15.

**What you are evaluating**
- **Migrations:** additive only, applied-in-order, `index.js` complete, nothing editing an
  applied file, and the gate (`gate.js`, `schemaReady`) behaviour on a Worker running before
  its migrations are applied — what does a visitor see then? KennelOS's README notes
  migrations waiting on a deploy in *its* cloud; check whether KennelPort has the same
  pending-migration hazard and whether anything warns the operator.
- **Import/export** (`cleanDocument`, `importContent`, `exportContent`): caps (`MAX_ITEMS`,
  `SECTIONS`), slug uniqueness, `SYSTEM` fields kept out, a round trip that loses nothing,
  and an import that half-applies. Since 2026-11-14 a page carries her address (`path`):
  an import of two pages at one address, or one a page of the owner's then takes.
- **Backup and restore** (`backup.js`, the format in `docs/plans/backup-format.md`): every
  column added since the format was written (0031 to 0035) comes back on a restore; a
  backup made before a migration restored after it; `SITE_TABLES` complete (a test holds
  it: check it can't pass with a table missing).
- **Hosts and previews:** `classifyHost`, `RESERVED`, `effectiveHost`, the `kp_host` cookie
  and `/__host` (staging-only — confirm production ignores it), a subdomain that collides
  with a reserved label, a custom domain (`domains.js`) and the `www`/apex rule (decision 15).
- **`/ops`:** auth, CSP, the by-hand actions (suspend, close, delete-all on leaving,
  decision 8), and whether any destructive ops action is one tap from a mis-click.
- **The cron:** `runCleanup`, `INQUIRY_DAYS`, `PURGE_PER_RUN`, `expireLitters` — order,
  idempotency, what happens when a run is skipped for a week, and whether a failure in one
  step stops the rest.
- **Worker budgets:** `cpu-check.mjs`, the biggest page render, the biggest bundle apply,
  the feed fetch inside a render, subrequest counts, and D1 row-read counts on the hottest
  path (a site's Home page).
- `wrangler.toml`: every binding and var the code reads, and what breaks if one is unset in
  a fresh environment (`KENNELOS_ORIGIN`, `KENNELOS_APP_ORIGINS`, `ROOT_DOMAIN`, Turnstile,
  push keys, R2, D1).

---

### Session 9 — The KennelOS side a breeder actually touches (KOS)

**Read** `shared/assets/websiteCard.js`, `shared/assets/websiteUpdateUI.js`,
the website paths in `shared/pages/kels.js`, `shared/assets/guidedDogsUI.js`,
`guidedLitterUI.js`, `kelsSetupUI.js`, `waitlistSetupUI.js`, `waitlistOnlineUI.js`,
`shared/pages/settings.js` + `settings.html`, the mark fields on
`shared/pages/{dog,litter,pairing}.js`, `shared/data/kennelportLink.js`
(`pendingWebsiteChanges`, `websiteGaps`, `markOnWebsite`, `setDepositsDate`),
`shared/data/siteExport.js` (`bundleChanges`, `websiteGaps`, `websiteCounts`),
`shared/sw.js` (`PRECACHE_URLS`), `shared/data/proPages.js`, `editionConfig.js`.
Tests: `siteExport.test.js`, `editionConfig.test.js`, `serviceWorker.test.js`,
`cloudDirty.test.js`, the `kels*` suites. Contract: guide §35 and §33 (Kels), plan §5.5.

**What you are evaluating**
- **No tests exist for `kennelportLink.js`** (grep: only `siteExport.test.js` and
  `cloudDirty.test.js` mention the website modules). Everything in `addressChanges`,
  `kennelChanges`, `websiteOffer`, `updateWebsite`'s error handling and
  `pendingWebsiteChanges` is unexercised. Say which of those behaviours you verified by hand
  and list the tests that should exist — that list is a deliverable of this session.
- **Press Update website offline / mid-flight / twice.** The card's button "sends straight
  away". What she sees while it goes, on a timeout, on a `refused` with KennelPort's own
  line, on `not_linked`, on a lapsed licence. Is a half-sent bundle possible, and does the
  `sent` copy on the link row get written only on success (if not,
  `pendingWebsiteChanges` lies afterwards — S2)?
- **`pendingWebsiteChanges` / `bundleChanges`** correctness: a change she made on *another*
  device (the `sent` copy is device-local, so does she get asked about changes she already
  sent?), a status wording ("Available → Spoken for"), and the "not asked twice on one page"
  rule.
- **Kels's groups** (`websiteGaps`): her own adults not marked, Keeping pups whose litter
  left, live litters and pairings, breeding girls with heats off (unticked to start),
  accounts with referral info. Check the unticked-by-default choices are the privacy-safe
  ones, and that no flow ever ticks a mark for her (plan §5.1's "she says what a record is").
- **The three prompts** (active_breeding, deposits date, Sold/Closed with the ticked
  hand-over list): asked once, answerable later, never auto-answered, and sane when she
  says no.
- **Editions:** assemble all three and prove Lite and Demo carry no website UI, no
  `kennelportUrl`, and no request. `proPages.js` completeness, and `PRECACHE_URLS` covering
  every website file (a missing path breaks offline — the repo's own rule).
- **`syncRegistry` classification** of the four marks and every field `siteExport` reads;
  anything newly `cloud` is a privacy decision to surface.
- **Backup/restore** with marks set: a restore into a device with no link, and a restore of a
  program that was linked elsewhere.

---

### Session 11 — The family portal (KP) (added 2026-11-14)

**Why.** The largest part built since this plan was written, and the one families sign in
to: their puppy's checklist, timeline, stays, vet visit, photos and messages, and her side
of it. Data about real families, sign-in, reminders that email them, and a feed from
KennelOS.

**Read** `worker/src/portal/`: `family.js` and `family/` (`files.js`, `stay.js`,
`icons.js`, `parts.js`); `auth.js` (family sign-in, on `../signin.js`); `admin.js` and `admin/`
(`today.js`, `settings.js`, `templates.js`, `parts.js`); `store.js`; `steps.js`;
`stays.js`; `vet.js`; `feed.js` (KennelOS's family feed); `account.js`
(257, loss, delete, Delete now, giving a deleted family back); `merge.js` (the same
family twice); `reminders.js` (the hourly job); `messages.js`; `bounces.js`;
`view.js` (her read-only view of a family's portal); `version.js`. And
`worker/public/_kp/f/portal.css`, `portal.js`; migrations `0023_portal`,
`0024_portal_steps`, `0032_tombstone_labels`. Tests: `portal.test.js`,
`portal-feed.test.js`, `portal-steps.test.js`, `portal-stays.test.js`,
`portal-vet.test.js`, `portal-account.test.js`, `portal-hub.test.js`,
`portal-view.test.js`. Contract: `docs/plans/family-portal.md`,
`docs/plans/done/family-view.md`.

**What you are evaluating**
- One family can never see another's: every `/family` route and every query by
  `site_id` and family, the view cookie (`view.js`) refusing every write, a deleted or
  merged family's sign-in.
- The feed: a family sent twice, a placement typed by hand and then sent by KennelOS,
  a family deleted for good and sent again, a feed that stops halfway.
- Reminders and emails: sent once, never to a deleted family, bounces marked, the
  hourly job running late or twice.
- Breeder and family sign-in share `signin.js` since 2026-11-14 (senior review item 10);
  `auth.js` and `portal/auth.js` keep only their own tables, cookies and who gets a
  code. Check the two stay apart (`signin.test.js`).
- Her screens on a phone (portal prototype, `admToday`, `admFamilies`, `admFamily`):
  empty states, a family with no puppy yet, a stay with no dates.

---

### Session 12 — The owner's admin view: building a site (KP) (added 2026-11-14)

**Why.** The owner shapes every site here (pages, blocks, menu, rules, wording), and a
save here changes what every family reads on the next publish. Large files, built fast.

**Read** `worker/src/manage/builder.js` and `worker/src/manage/builder/`
(`records.js`, `blocks.js`, `instructions.js`, `kennelos.js`, `menugroups.js`, `tags.js`,
`forms.js`, `rules.js`, `controls.js`, `frame.js`, `formats.js`, `sites.js`, `timing.js`); `worker/src/admin.js`; the wording editor's half of
`worker/src/manage/wording.js` (`cleanWording`, `withWording`, `saveEveryWording`);
`worker/src/content/blocks.js`, `rules.js`, `fields.js`, `tags.js` as the builder saves
them. Tests: `blocks.test.js`, `ownblocks.test.js`, `menu.test.js`, `rules.test.js`,
`tags.test.js`, `fields.test.js`, `wording.test.js`, `forms.test.js`, `addresses.test.js`. Contract:
`docs/plans/site-builder.md`, `docs/plans/kennelos-contract.md`; the look,
`docs/reference/site-builder-prototype.html`.

**What you are evaluating**
- Only the owner reaches these screens and their POSTs (`kp_admin` and `/ops`), never a
  breeder, on every route.
- A save that half-works: a block, page or rule saved invalid, an old build read by
  new code (a field added since), every-site wording against a site's own.
- A breeder's content against the owner's build: her picks after the owner changes a
  block's conditions; a page removed that her menu or a redirect still points at.
- What a publish then shows: build changes reach the Publish list (session 4).
- **Added 2026-11-14 (evening): Forms** (`worker/src/manage/builder/forms.js`, the admin
  nav's Forms; `content/forms.js` `cleanForm`, `formsFromForm`): the fixed fields can't be
  switched off or made optional by any post; a move, add or remove pressed with unsaved
  changes elsewhere on the screen keeps them; eight questions at most; a choice saved with
  fewer than two options (what the family then sees); Back to today's form leaving no
  `forms` in the build. And **page addresses** on her side of the owner's screens: the
  Pages list and a page's card show her address; New page and a page's address refuse one
  she has given a page (`herAddresses`). No prototype screen exists for Forms: judge it
  against the builder's other screens.

---

### Session 10 — Consolidation (after the others)

Read every findings file (sessions 1 to 9, 11 and 12). Produce `docs/review/SUMMARY.md`:
- de-duplicated findings, ranked S1 → S4, each with its one-line scenario;
- **themes** — the repeated shapes (parity between two hand-maintained lists; "delete the
  row" where the plan promised "never deletes"; the answer-after-apply ordering; a limit with
  no message; a manual deploy step with no in-app warning);
- a **fix order** that puts anything touching a breeder's photos or a family's application
  first, and groups the rest so one change closes several findings;
- the **test gaps** collected from every session, as a short list of suites to write
  (KennelOS `kennelportLink`, KennelPort `embedStore`/`siteforms`, and whatever else came up);
- what no session got to, so the next round starts there.

Mark each finding already known: in `docs/review/senior-review-2026-11.md` (with its
verdict) or `docs/loose-ends.md` (with its number). Known isn't dropped, but it ranks as
"confirmed", not new.

Do not re-review. If a finding looks wrong, check it and say so in one line.

---

## 2. Suggested order

| Wave | Sessions | Why |
|---|---|---|
| 1 | **1**, **2** | The contract and the boundary. Everything else reads against what these establish. |
| 2 | **3**, **5** | The two places real loss happens: her photos, a family's application. |
| 3 | **4**, **9** | Close the loop back into KennelOS. |
| 4 | **6**, **7**, **8**, **11**, **12** | KennelPort's own surface, breadth-first; 11 (the family portal) first among them. |
| 5 | **10** | Consolidate. |

Sessions within a wave are independent. If only a few sessions ever run, run 1, 3, 5, 11, then 10.

## 3. Index of findings

`docs/review/index.md` — one row per session: number, title, branch, the commit reviewed, date, counts by
severity, and a link to the findings file. Each session adds its own row; nobody edits
another session's row.

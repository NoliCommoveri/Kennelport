# KennelPort × KennelOS: version-1 code review plan

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

**Green baseline (2026-11-03).** `node --test` in `/home/user/Kennelport` → 192 pass.
`node --test` in `/home/user/KennelOS` → 1490 pass. `cd /home/user/KennelOS/cloud && npm test`
→ 279 pass. If your session starts red, that is finding number one; say so and stop guessing.

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
`docs/KennelPort_Backlog.md` (requests, guided custom domains, pickup/delivery page, the
rest of 3.9, survey pages, past litters) and the **Open** entries in plan section 9
(content rules and suspension, decision 9). KennelPort README's Status names what is built
and what is only built-but-untried; "built, not yet tried against staging" is not a defect,
but *code that cannot work when it is tried* is.

**Output.** One file per session:
`docs/review/findings/NN-<slug>.md` in the **KennelPort** repo (findings about KennelOS go
there too, so everything is in one place). Then add your row to
`docs/review/INDEX.md`. Commit docs only, push to the branch your session was assigned.
Use this shape:

```markdown
# NN — <session title>

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

| Contract | Read |
|---|---|
| The KennelOS link, end to end | `Kennelport/docs/KennelPort_Plan.md` §5 (lines 1001–1332): 5.1 principle, 5.2 linking, 5.3 what a bundle does, 5.4 photos/addresses, 5.5 the KennelOS side |
| The waitlist on the site + the sealed application form | same file §3.8 (lines 471–620) |
| What's public, puppy statuses, prices, embeds | §3.2 (243), §3.3 (281), §3.6 (370), §3.7 (421) |
| Sign-in, draft/preview/publish, photos, limits | §4 (lines 834–1000) |
| Decisions (and what's still open) | §9 (lines 1459–1553); risks §10 |
| KennelOS's own account of the same link | `KennelOS/docs/End_State_Design_and_Maintenance_Guide.md` §35 (line 3477 →) |
| KennelOS waitlist, editions, invariants, SW | same guide §29 (1638), §0 (16), §16 (976), §12 (827) |
| KennelOS cloud sync/backup | `docs/KennelOS_Cloud_Phase1_Plan.md`, `_Phase2_Sync_Plan.md`, `cloud/README.md` |

Do not read `BUILD_LOG.md` by default in either repo. Do skim
`git log --oneline -40` in both: the newest work is the least reviewed, and several recent
commits reversed each other (KennelOS `84c40e3` then `2c00f28` on the full-registration
surcharge) — flip-flops are where the two sides most easily end up disagreeing.

---

## 1. The sessions

Ten sessions. **1, 2, 3, 5 are the priority four** — they are the cross-app seam, where a
defect costs a breeder her data or a family a wrong answer. 4 and 9 close the loop on that
seam. 6, 7, 8 are KennelPort's own surface. 10 consolidates.

Sessions 1–9 are independent: any order, and several can run in parallel. Only session 10
needs the others finished. If a session finds its area clean early, it should go deeper on
its own "what I did not get to" list rather than wandering into another session's files —
overlap wastes the budget we are splitting for.

---

### Session 1 — The bundle contract, field by field (KP + KOS) ★ start here

**Why first.** Everything a family reads about a dog, a litter or a puppy arrives through
this one call. A mismatch here is wrong data on a public website, or a breeder's typed
field destroyed.

**Read**
- KennelPort: `worker/src/kennelos/bundle.js` (585), `worker/src/kennelos/api.js` (89),
  `worker/src/content/model.js` (446, the shapes the bundle writes into),
  `worker/src/migrations/0015_kennelos_link.sql`, `0016_products.sql`, `0017_registration.sql`
- KennelOS: `shared/data/siteExport.js` (524)
- Tests already there: `worker/tests/kennelos.test.js` (784), `KennelOS/tests/siteExport.test.js` (465)
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
- KennelPort: `worker/src/kennelos/link.js` (197), `worker/src/kennelos/api.js` (89),
  `worker/src/auth.js` (146), `worker/src/gate.js`, `worker/wrangler.toml` (the origin and
  domain vars), `worker/src/migrations/0015_kennelos_link.sql`
- KennelOS: `shared/data/kennelportApi.js` (101), `shared/data/kennelportLinkStore.js` (55),
  `shared/data/kennelportLink.js` (289, the link/licence parts),
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
8. **Manage-app sign-in** (`auth.js`): email hash only, 90-day sliding cookie, code TTL,
   `LIMITS`, `inviteToSite`, role checks for owner-only actions
   (`Link KennelOS`, `Unlink`, device stop). Is every owner-only action actually gated, on
   both the screen and the POST?

---

### Session 3 — Records' lifecycle: matching, the hand-over, the 30-day clock, photos (KP)

**Why.** This is where the plan put its strongest promise — "a dog is never deleted by a
clock", "a bundle never deletes a photo" — and where a mistake destroys the only copy of a
breeder's pictures.

**Read**
- `worker/src/kennelos/match.js` (99), `worker/src/kennelos/clock.js` (121),
  `worker/src/cleanup.js` (64), `worker/src/photos.js` (90), `worker/src/photoTags.js` (71),
  `worker/src/ops/usage.js` (78), the hand-over block in `kennelos/bundle.js` (~line 410),
  migrations `0018_puppy_photos.sql`, `0019_album_order.sql`, `0020_puppy_more_photos.sql`
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
- KennelPort: `publishedAddresses` + `recordPaths` in `worker/src/publish.js` (292),
  `worker/src/kennelos/link.js` (`siteFacts`, `siteBase`, `siteAddress`),
  `worker/src/domains.js` (56), `worker/src/diff.js` (113)
- KennelOS: `shared/data/kennelportLink.js` (`addressChanges`, `kennelChanges`,
  `websiteOffer`, `useSiteAsKennelWebsite`, `keepKennelWebsite`),
  `shared/data/websiteAddress.js` (18)
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

---

### Session 5 — The waitlist page, the feed, and the sealed application form (KP + KOS cloud)

**Why.** The one place a *family's* data crosses between the products, in the visitor's
browser, with crypto and a third-party captcha. Also the busiest set of fallbacks in either
repo, and the deciding rule for where an application lands.

**Read**
- KennelPort: `worker/src/feed.js` (110), `worker/src/site.js` (239, `cspFor`,
  `withTurnstile`, the `/waitlist` live path), `worker/src/siteforms.js` (186),
  `worker/src/waitlist.js` (126), `worker/public/_kp/t/ak/site.js` (389, `sealToKennelos`),
  `worker/src/render/pages.js` (`waitlist`, `waitlistHelp`), `worker/src/embeds.js` (143)
- KennelOS: `cloud/src/familyPages.js` (960, `siteView` / `formView` / apply / verify /
  code), `cloud/src/lib/cors.js`, `cloud/src/index.js` (the `/f/` routing),
  `shared/data/waitlistProjection.js` (677), `cloud/public/family/common.js` (376),
  and KennelOS's own `seal.js`
- Tests: `worker/tests/kennelosform.test.js` (340), `waitlist.test.js`, `messages.test.js`;
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

---

### Session 6 — The manage app: a breeder on a phone (KP)

**Read** `worker/src/manage/index.js` (258), `screens.js` (1095), `forms.js` (380),
`worker/public/_kp/m/app.js` (122), `photos.js` (147), `sw.js` (66), `zip.js` (71),
`app.css` (126), `worker/src/push.js` (180), `worker/src/badgeCode.js`, `worker/src/mail.js`,
`worker/src/manage/version.js`. Tests: `manage.test.js`, `messages.test.js`, `share.test.js`,
`logo.test.js`, `versions.test.js`. Contract: plan §4 (all), §3.12, §3.8's manage paragraphs,
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

---

### Session 7 — The public site: what a family sees (KP)

**Read** `worker/src/render/pages.js` (766), `parts.js` (430), `layout.js` (122),
`schemes.js` (136), `index.js` (80), `worker/src/site.js` (239),
`worker/public/_kp/t/ak/site.css` (555), `site.js` (389), the seven `scheme-*.css`,
`worker/src/content/akSample.js`, `worker/src/qr.js`, `worker/src/render/version.js`.
Tests: `schemes.test.js`, `collage.test.js`, `photoshapes.test.js`, `sites.test.js`,
`worker.test.js`, `embeds.test.js`, `products.test.js`, `payment.test.js`,
`application.test.js`. Contract: plan §3 (3.1–3.13), §3.6, §3.7, §3.2, decisions 18, 23, 25,
31, 32; `docs/KennelPort_Design_Direction.md`.

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
- Do **not** bump `ASSET_VERSION` or run the fingerprint script as part of the review.

---

### Session 8 — Content layer, migrations and the platform (KP)

**Read** `worker/src/content/io.js` (431), `model.js` (446), `records.js` (300),
`prices.js` (45), `worker/src/migrations/*.sql` + `index.js`, `worker/src/migrate.js`,
`worker/src/index.js` (118), `hosts.js` (61), `domains.js` (56), `ops.js` (148),
`ops/sites.js` (308), `ops/usage.js` (78), `cleanup.js` (64), `embedStore.js` (75),
`lib/{sql,http,html,crypto}.js`, `worker/wrangler.toml`, `worker/scripts/*.mjs`.
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
  and an import that half-applies.
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

**Read** `shared/assets/websiteCard.js` (143), `shared/assets/websiteUpdateUI.js` (335),
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

### Session 10 — Consolidation (after 1–9)

Read every findings file. Produce `docs/review/SUMMARY.md`:
- de-duplicated findings, ranked S1 → S4, each with its one-line scenario;
- **themes** — the repeated shapes (parity between two hand-maintained lists; "delete the
  row" where the plan promised "never deletes"; the answer-after-apply ordering; a limit with
  no message; a manual deploy step with no in-app warning);
- a **fix order** that puts anything touching a breeder's photos or a family's application
  first, and groups the rest so one change closes several findings;
- the **test gaps** collected from every session, as a short list of suites to write
  (KennelOS `kennelportLink`, KennelPort `embedStore`/`siteforms`, and whatever else came up);
- what no session got to, so the next round starts there.

Do not re-review. If a finding looks wrong, check it and say so in one line.

---

## 2. Suggested order

| Wave | Sessions | Why |
|---|---|---|
| 1 | **1**, **2** | The contract and the boundary. Everything else reads against what these establish. |
| 2 | **3**, **5** | The two places real loss happens: her photos, a family's application. |
| 3 | **4**, **9** | Close the loop back into KennelOS. |
| 4 | **6**, **7**, **8** | KennelPort's own surface, breadth-first. |
| 5 | **10** | Consolidate. |

Sessions within a wave are independent. If only a few sessions ever run, run 1, 3, 5, then 10.

## 3. Index of findings

`docs/review/INDEX.md` — one row per session: number, title, branch, date, counts by
severity, and a link to the findings file. Each session adds its own row; nobody edits
another session's row.

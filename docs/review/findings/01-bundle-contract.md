# 01 — The bundle contract, field by field

Commit reviewed: KennelPort `8aaf58a` (the target: `main` at the merge of `ccr-a71eca85-omlwep`) · KennelOS `999b868`
Changed since the target: none.
Reviewed: KennelPort `worker/src/kennelos/bundle.js` (935), `kennelos/api.js` (101),
`content/model.js` (629, `cleanValue`, `PAYMENT_FIELDS`), `content/rules.js` (407, landing
defaults), `content/fields.js` (521, skimmed), `render/parts.js` (health lines), `feed.js`
(`readFeed`), migrations 0015, 0016, 0023, 0024 (product and extra references), 0033.
KennelOS `shared/data/siteExport.js` (781), `kennelportLink.js` (`updateWebsite`),
`kennelportApi.js` (`call`), `healthTestLog.js` (`completedTestsByDog`),
`assets/websiteCard.js`, `cloud/src/familyPages.js` (the `/f/site` gate).
Contract read: plan §5.3 (as quoted in `bundle.js`'s header and the review plan), session 1's
fifteen questions.
Verified by: `node --test` (KennelPort 448 pass; KennelOS 2007 pass; KennelOS `cloud` not run,
no `node_modules`); scratch scripts in the session scratchpad (`probe.mjs`, `size.mjs`,
`apply.mjs`) that link a site through the real Worker (`tests/helpers/env.js`, the D1 helper)
and post bundles, plus bundles built with KennelOS's own `buildSiteBundle`; Cloudflare's D1
limits page (read 2026-11-15).

| # | Sev | Where | What | Verified? |
|---|-----|-------|------|-----------|
| 1 | S1 | worker/src/kennelos/bundle.js:846 | A product KennelOS stops sending is deleted, taking her wording, portal settings and every family's program status and code with it | verified · **fixed 2026-11-15** (migration 0036) |
| 2 | S1 | worker/src/kennelos/bundle.js:532 | A dog's last KennelOS health result can never be removed from the site | verified · **fixed 2026-11-15** |
| 3 | S2 | worker/src/kennelos/bundle.js:62 · KennelOS siteExport.js:65 | About 95 dogs with pedigrees fill the 1 MB bundle cap; past it every update is refused with a line she can't act on | verified |
| 4 | S3 | worker/src/kennelos/bundle.js:539 | A result she left unmarked counts as normal, so "Affected" shows under the default Normal results only | verified |
| 5 | S3 | worker/src/kennelos/bundle.js:258, 408 | When no shown dog has a title left, the last title can't be cleared | verified |
| 6 | S3 | worker/src/kennelos/bundle.js:869 · KennelOS siteExport.js:777 | Removing the application fee leaves the old pay link on How to pay | verified |
| 7 | S3 | worker/src/kennelos/bundle.js:721–725, 895 | Two Update presses at once double health results and extras for good, or fail one with "Something went wrong" | verified (latency simulated) |

## 1. A product KennelOS stops sending is deleted, with everything hers on it  (S1, verified)

> **Fixed 2026-11-15** on `ccr-b7748679-2prmsg`, migration 0036. A product or extra KennelOS
> stops sending is hidden (`hidden_by_kennelos`) instead of deleted. It's off the public site
> but stays in the family portal (owner's decision), and it waits in her lists as "Not sent by
> KennelOS · off your website, still in the portal". Sent again, the same row comes back.

**Where.** `bundle.js:845–846` deletes every `source = 'kennelos'` product not in the bundle.
`bundle.js:833–839` takes over a product she made by hand when an account has the same name,
setting `source = 'kennelos'`. The product row is also the family portal's "program":
`portal_show`, `portal_type`, `family_action` and `portal_per_family` are on it
(migrations 0023, 0024). `portal_placements_programs`, `portal_checklist_items.product_id` and
`portal_timeline_tasks.product_id` point at its id, with no cleanup.

**Scenario.** She has a hand-made "Trupanion" product with her own description and group,
shown in the portal as an insurance program with a code per family. She marks her Trupanion
account in KennelOS Show on website, and the next bundle takes the row over. Later she unticks
the account because she doesn't want it under Recommended products, or the promo ends and she
clears its referral code (KennelOS only sends accounts with `hasReferral`,
`siteExport.js:558`). The next Update deletes the row. Her description, group, badges, button
wording and portal settings are gone. Each family's program status and certificate code stays in
`portal_placements_programs` under an id that no longer exists, so no family sees it again.
Checklist and timeline buttons that linked to the program lose their link. Ticking the account
again makes a new row with a new id, so nothing reattaches.

The probe proved it: the taken-over row had `description = 'Her own words about insurance'`.
After a bundle with `products: []`, the row count was 0 and `portal_placements_programs` still
held `CERT-123` for the deleted id.

**Why it matters.** Typed data is lost without a word. The plan says a bundle never deletes
what lives only on the website, and the comment at `bundle.js:818` ("its picture stays in her
photos") shows the deletion was judged only by the picture.

**Same shape, smaller:** extras (`bundle.js:811`). A KennelOS extra she removes deletes the
catalog row, including the photo, `featured`, `lead_in`, `checklist`, `closing` and
`portal_delivery` she set. Placements keep their copied name (0024's comment), so families are
safe there.

**What I'd do.** Hide instead of delete (`hidden_by_kennelos`, as dogs, litters, puppies and
partner kennels already do), and bring the same row back by `kennelos_id`.

## 2. A dog's last KennelOS health result can never be removed  (S1, verified)

> **Fixed 2026-11-15** on `ccr-b7748679-2prmsg`. A dog sent with `health: []` loses its
> KennelOS results. Her own results stay, and a dog sent without the key keeps everything.

**Where.** `bundle.js:532`: `health()` returns at once when the list is empty. The deletion of
results KennelOS no longer sends (`:549–550`) only runs when at least one result is sent.

**Scenario.** She logs "PLL: Affected" on the wrong dog in KennelOS and presses Update. The
result reaches the dog's page. She archives the event in KennelOS and presses Update again. The
dog now has no tests, so the bundle sends `health: []`, and the website keeps "PLL: Affected"
on that dog's public page indefinitely. With a second test on the dog, the same fix works. The
probe sent [hips, eyes], then [eyes], then []. After the last bundle "Eyes" was still there.

**Why it matters.** This is a public health claim about a named dog that she can't take back
from KennelOS. She can only find and delete it by hand in the manage app, and nothing tells her
to. The "derived fields only overwrite with something" rule fits titles typed on the website.
Here the rows are KennelOS's own (`source = 'kennelos'`), and KennelOS always sends the full
list for every dog it sends.

**What I'd do.** For a dog in the bundle, treat `health: []` as "none". Removing a stale
KennelOS result is safe, because her typed results are a different source.

## 3. About 95 dogs with pedigrees fill the 1 MB cap; then every update is refused  (S2, verified)

**Where.** `bundle.js:62` `MAX_BUNDLE_BYTES = 1 MB`, enforced by `readJson` (`lib/http.js:30–33`)
as 413 `too_large`. `api.js:96` answers "That is more than KennelPort takes at once."
KennelOS's `SITE_MAX` (`siteExport.js:65`) allows 200 dogs, and KennelOS never checks the
size, so it shows that line as it is (`kennelportApi.js` `call`, 4xx with a message).

**Scenario.** The lineage section sends 30 ancestors per dog, four generations, each with
registered name, title objects and origin fields: about 9 KB of the 11 KB a dog takes. Bundles
built with KennelOS's own `buildSiteBundle` and every section KennelPort lists, with ordinary
names and 10 tests a dog:

| Dogs × tests | Bundle |
|---|---|
| 30 × 8 | 313 KB |
| 60 × 10 | 645 KB |
| 100 × 10 | 1,075 KB, refused |
| 200 × 15 (`SITE_MAX`) | 2,307 KB |

A kennel past roughly 95 shown dogs with full pedigrees can't update at all, and not one record
gets through. "That is more than KennelPort takes at once" gives her nothing to untick, unlike
siteExport's own over-cap messages ("Untick some, then try again"). Real KennelOS ids (UUIDs)
and longer registered names make the bundle larger still. Her 4th, 5th and later litters' pups
count too, since every dog shown carries a pedigree.

**What isn't the problem.** D1 counts one `batch()` as one query against its 1,000 a call. A
90-dog first bundle was 1,086 statements in one batch and applied in 87 ms in Node. A repeat
with nothing changed took 6 statements and 48 ms. Both are well inside the 30-second limit.
(48 ms of CPU for a no-op bundle is worth checking on the real Worker's logs if the account is on
the free plan's ~10 ms. Note only.)

**What I'd do.** Raise the cap well above what `SITE_MAX` can produce, or send an ancestor
once per bundle instead of once per descendant (the 30 ancestors of 95 dogs are largely the same
few dozen dogs). Have KennelOS measure the bundle first and say which section is too big.

## 4. An unmarked result counts as normal, so "Affected" shows under Normal results only  (S3, verified)

**Where.** KennelOS sends `normal: null` for a result with no Normal or Abnormal flag
(`siteExport.js:292`). KennelPort stores `h.normal ?? 1` (`bundle.js:539`), and a new result's
`show` follows it under `normal_only` (`:546`). Every dog's default is `normal_only`
(`content/rules.js:186`, `records.js:37`), shown to her as "Normal results only"
(`manage/forms.js:200`).

**Scenario.** She logged PLL "Affected" before KennelOS had the outcome flag (or skipped it).
The probe stored `normal = 1, show = 1` on a `normal_only` dog. The dog page lists
"PLL — Affected" (`render/parts.js:570` prints test and result as typed) on a site whose
setting says only normal results show.

**Why it matters, and the limit.** The page prints her own words, not a "Normal" badge, so it
doesn't claim the result is clear. That keeps it at S3 rather than S1. It does break the
setting she chose, on a health result, which is the one place breeders are careful about. Every
test logged before the outcome flag existed is unmarked.

**What I'd do.** Leave an unmarked result out under `normal_only` (or keep `normal` null and let
the rule decide), and tell her that some results are hidden until she marks them in KennelOS.

## 5. When no dog has a title left, the last title can't be cleared  (S3, verified)

**Where.** `bundle.js:183–187`: an all-strings titles list (an empty one included) is read as
"an older KennelOS". `bundle.js:258` turns rows on for every dog only if some dog in the bundle
sent title objects. `bundle.js:408` keeps a derived `titles` line unless it has rows.

**Scenario.** A small kennel's one titled dog, Luna, shows "CH". The title was entered by
mistake (or on the wrong dog) and she removes it in KennelOS. Now no dog in the bundle has a
title, so every `titles` is `[]`, and the bundle reads as pre-`titles_detail`. "CH" stays on
Luna's name and her `dog_titles` row stays. The probe confirmed it: before "CH", after "CH",
1 row. As soon as any other dog has a title, it clears correctly.

**What I'd do.** Decide "titles as rows" from the Worker's own `titles_detail` section having
been offered to that device, or have KennelOS send a marker, not from the bundle's content.

## 6. Removing the application fee leaves the old pay link on How to pay  (S3, verified)

**Where.** KennelOS leaves `payment` out when there's nothing to say (`siteExport.js:512, 777`).
KennelPort only upserts kinds that are sent (`bundle.js:869–874`) and never clears one.

**Scenario.** She had an application fee with a Pay link, and she switched How to pay on in
KennelPort. She drops the fee in KennelOS and presses Update. The website still shows
"Application fee — Pay the application fee" with the old link, so a family can pay a fee she no
longer charges. The probe confirmed the old `pay_url` is still in `payment_info` after a bundle
with no `payment`.

The same "absent means unchanged" applies to `steps` (`bundle.js:854`, `clean.steps?.length`).
That one is by design: steps are hers once started (commit `3942c84`). But "There is an
application fee." in the Apply step outlives the fee in the same way. Loose ends #5 (waitlist
facts) is where that wording gets fixed. Note only.

**What I'd do.** With a KennelOS that sends `payment` (any bundle from this format on), treat an
absent `application_fee` as "none" and clear or hide that kind. At least tell her in the
summary.

## 7. Two Update presses at once double records, or fail one  (S3, verified with simulated latency)

**Where.** `applyBundle` reads the whole site (`bundle.js:725`), works out inserts against that
copy, and writes in one batch (`:895`). Nothing serialises two applies for the same site.
`last_bundle_id` is per device and per press, so it doesn't help (`:721`). The `kennelos_id`
indexes aren't unique (`0015_kennelos_link.sql:54–56`).

**Scenario.** She presses Update website on her phone and her computer within a second, or on
the Website card and through Kels (`websiteUpdateUI.js:67, 366`; the card disables only its own
button). In the D1 helper the reads were delayed 3 ms, as a real D1 round trip would be:

- A new dog in both bundles: one gets in, and the other hits `UNIQUE dogs(site_id, slug)` and
  returns 500 "Something went wrong at KennelPort." No harm done, but it reads as a failure.
- A new extra and a new health result: both bundles insert them. That leaves two "Eyes: Clear"
  lines on the dog's page and two copies of the extra, and later presses keep both
  (`byKos` keeps one; the other is never "not sent").

**What I'd do.** Make the second apply wait or be refused cleanly ("an update is already
running"), for example with a per-site claim row taken in the batch. Or add unique
`(site_id, kennelos_id)` indexes where a row is KennelOS's alone. That's a migration, so it
must be add-only.

## Notes, not findings

- **Lengths and enums agree.** Every `line(v, max)` in siteExport matches its `S(max)` in
  `SHAPES`: dog, puppy, litter, pairing, heat, extra, step, product, partner kennel, ancestor,
  title and pay. `SITE_MAX` equals `MAX` key for key. Statuses, sexes and registrations agree.
  Dates are checked as real dates on this side and only by format on KennelOS's (`ymd`), so
  `2026-02-31` would refuse the whole bundle. KennelOS's date fields come from date inputs, so
  this is only theoretical.
- **Section negotiation is sound.** Every optional key is gated on the Worker's `sections` on
  both sides. `waitlist_facts` is in KennelOS's `BUNDLE_KEYS` but sent only with that section,
  which this Worker doesn't list (loose ends #5). `registration` and `registry` predate any
  Worker in use.
- **Health ids are unique.** `test:<name, lower case>` matches `completedTestsByDog`'s key
  (`healthTestLog.js:27`), so a retest updates and never duplicates. Two names sharing their
  first 75 characters would collide. Not realistic.
- **The retry path is unused.** `updateWebsite` makes a new `bundleId` each press and never
  retries, so `last_bundle_id`'s "answered with its first summary" never runs. Applying a bundle
  twice is harmless anyway (everything matches by `kennelos_id`), apart from #7.
- **The prices switch stays in sync.** KennelOS reads the site's facts (`linkStatus`) just before
  building, so `prices` matches `use_kennelos_prices` except in a sub-second race.
  `OWNED_PRICES` and the full-registration surcharge travel together inside `prices`, only with
  the switch on, on both sides (question 11).
- **`waitlist_public_id` is never cleared** when she turns `website_feed` off (question 15).
  This isn't a privacy finding: KennelOS's cloud refuses `/f/site` with `not_shared`
  (`familyPages.js:936`), and the manage app says so. The published sign-in link to her list
  (`publish.js:309`) stays, and KennelOS gates that page too.
- **Puppy status mapping** matches decision 10: `undecided` becomes `coming_soon`, "Still
  deciding". `health_hold` becomes `hidden` (question 13).
- **Heats** carry their year (`monthOf` gives "March 2027"). The month comes from the heat's own
  date string, so there's no timezone shift (question 14).
- **Name takeover** (question 8): products and partner kennels take over a hand-made row by
  name; extras don't. Finding 1 is what makes products' takeover risky.
- **KennelOS silently trims** puppies past 30 in a litter, extras past 100, titles past 20, health
  past 60 and co-owner kennels past 10, without telling her. None is a realistic count.

## Coverage gaps I found (tests that should exist)

- A bundle with `products: []` after a taken-over product that has portal settings and family
  program rows (finding 1).
- A dog whose health list goes from one result to none (finding 2), and the same for titles with
  `titles_detail` when no dog has any (finding 5).
- A size test: `buildSiteBundle` at `SITE_MAX.dogs` with lineage, checked against
  `MAX_BUNDLE_BYTES` (finding 3). Today the two caps are only compared key by key.
- An unmarked (`normal: null`) non-normal result on a `normal_only` dog (finding 4).
- A bundle without `payment` after one with it (finding 6).

## What I did not get to

- Question 9 in depth: a record coming back after `hidden_by_kennelos` with its address. The
  code clears the flag and keeps slug and photos. Not run end to end through publish.
- Question 10's edge cases (a pairing matched to two litters, a declined pairing row) only by
  reading: `kept` stops one website litter going to two KennelOS litters.
- KennelOS `cloud` `npm test`: `node_modules` isn't installed in this session.
- `content/fields.js` (`pedigreeOf`, `originOf`) and the linked-sample fixture beyond a skim.

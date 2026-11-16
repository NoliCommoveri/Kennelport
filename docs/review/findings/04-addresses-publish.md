# 04 — Addresses back to KennelOS, and publish/snapshot integrity

Commit reviewed: `d54afed` (KennelOS `850e02f`)  ·  Changed since the target (`8aaf58a`): `kennelos/bundle.js`
(products and extras hidden, not deleted; the last health result), `kennelos/link.js` (the last device stopping
is no longer an Unlink; `unlinkSite` leaves products and extras by their own switch), `publish.js` (hidden
products and extras left out, `hidden_by_kennelos` in `SYSTEM`), migrations 0036 and 0037. Read before the rest.
Reviewed: `publish.js` (450), `kennelos/bundle.js` `publishedAddresses`, `applyBundle` and the `Writer`'s slugs
(992), `kennelos/link.js` (224), `diff.js` (181), `content/addresses.js` (71), `render/index.js` (83),
`render/parts.js` `pagePath`/`pageAt`, `site.js` (266, its redirect and cache paths), `backup.js` `restoreFinish`,
`cleanup.js` purge; KennelOS `shared/data/kennelportLink.js` (333), `websiteAddress.js` (18),
`kennelportLinkStore.js`, `portalFeedSync.js` (its facts refresh)  ·  Contract read: plan §5.4, §4.1;
`site-builder.md` "Page addresses"; the plan's paths for KennelOS are right at `850e02f`.
Verified by: `node --test` KennelPort **455 pass**, KennelOS **2080 pass** (`850e02f`; `cloud` not run).
Eight scratch scripts through `tests/helpers/env.js` and the real Worker (the bundle API, `/publish`, the public
site), with KennelOS's own `addressChanges` (loaded from `kennelportLink.js` as is) fed each answer.

| # | Sev | Where | What | Verified? |
|---|-----|-------|------|-----------|
| 1 | S1 | worker/src/kennelos/bundle.js:765, 971-991 · KennelOS kennelportLink.js:55 | A KennelOS dog or litter waiting for her to confirm a match has no address in the answer, so KennelOS blanks its link while the page is live: every link on the first Update of a site she built by hand, and every link after an Unlink and Connect again | verified |
| 2 | S1 | KennelOS kennelportLink.js:47-56, 321 · websiteAddress.js:11-16 | KennelOS reads "not in the answer" as "left the site", and any kennelport.com address as one KennelPort wrote: a link she typed (her page for a dog she doesn't send, a co-owner's KennelPort page) is erased on every Update | verified |
| 3 | S2 | worker/src/publish.js:412-429 | Undo publish writes no redirects: the address the last publish sent visitors to answers "not found", and so do older addresses redirecting to it, and KennelOS's link if she updated in between | verified |
| 4 | S3 | worker/src/publish.js:41-47 · kennelos/bundle.js:757-760 | A kept puppy's page answers "not found" once it leaves the litter, with no redirect to her own dog page (two record ids, so `recordPaths` never pairs them) | verified |
| 5 | S3 | worker/src/kennelos/bundle.js:982 · render/index.js:39-42 · manage/wording.js:513 | Switching the Litters page off takes every litter and puppy page with it and blanks every litter's photos link and every puppy's link in KennelOS; she is told only that "its address" goes | verified |
| 6 | S3 | KennelOS kennelportLink.js:319 · portalFeedSync.js:227-228 · kennelportLink.js:183 | KennelOS forgets her previous domain as soon as the site's facts are refreshed (hourly by the portal feed): links on the old domain are never replaced or blanked | verified |
| 7 | S3 | worker/src/publish.js:201-207 · diff.js:100-101 | A family-portal setting on an extra or product (how often a stay update goes, the program's type) reads "Extras: … edited" on Publish though nothing on the site changes; those columns and `kennelos_id` ride in the snapshot | verified |
| 8 | S4 | worker/src/content/addresses.js:61-70 · content/io.js:79-84 · manage/screens/pages.js:70 | Two pages given one address (by an import) both show it in her Pages; the site gives it to the first and the other stays at its starting address, with nothing said | verified |

---

## 1. A match waiting for her answers as "gone", and KennelOS blanks the live page's link  (S1, verified)

**Where** KennelPort `worker/src/kennelos/bundle.js:765` (a KennelOS dog whose name matches one of hers waits in
`link_pending`; the website dog keeps `kennelos_id` NULL) and `:971-991` (`publishedAddresses` maps only website
records that already have a `kennelos_id`); the same for litters (`:797`). `kennelos/link.js:209-211` (Unlink sets
every `kennelos_id` to NULL) and `:105-106` (a Connect from another kennel unlinks first). KennelOS
`shared/data/kennelportLink.js:55`: `else if (!next && ours) … { url: '' }`.

**Scenario** (script `s1-pending.mjs`)
1. The AK sample site, built by hand and published: `/dogs/willow` answers 200.
2. Before linking she pasted that page into Willow's photos link in KennelOS (the obvious thing to do; Companion
   packages carry it).
3. Connect website, Update website. Willow matches by name and waits: `summary.waiting = 1`,
   `addresses.dogs = {}`. KennelOS's `addressChanges` → `[{ table: 'dogs', id: 'kos-willow', changes: { url: '' } }]`.
   Her link is erased, with `/dogs/willow` still 200.
4. Confirm the match and Update again: the address comes back (`kos-willow → …/dogs/willow`).
5. Unlink, Connect again (same kennel), Update: every record waits again, the answer is empty, and every dog's
   `url` and every litter's `photos_url` that KennelPort itself wrote is blanked, while every page still answers.

The same happens on the first Update after a Connect from another of her kennels (link.js:106 runs the Unlink).

**Why it matters** Plan §5.4: blank only "when a page leaves the site". Between the Update and her confirming
every match on the KennelOS screen in the Site Manager, the families' Companion packages and waitlist status pages
lose every photos link. A link she typed herself (step 2) never comes back on its own if she declines the match,
or if the names differ by a letter and KennelOS's dog becomes a second website dog.

**What I'd do** Answer a waiting match with the address of the page it's waiting to be matched to (it's
published), or answer an explicit `gone` list (addresses reported last time and no longer published) so KennelOS
blanks only those (see 2).

## 2. Missing from the answer means "left the site"; any kennelport.com address means "KennelPort wrote it"  (S1, verified)

**Where** KennelOS `shared/data/kennelportLink.js:47-56`: for every one of her kennel's dogs and litters
(`:321-322`, whether sent or not), a current address that `isWebsiteAddress` calls ours and that isn't in the
answer is blanked. `websiteAddress.js:11-16`: ours is *any* `*.kennelport.com` origin, or her site's address.

**Scenario** (script `s8-littersoff.mjs`, last line, and `s1-pending.mjs`)
- Rex is her dog in KennelOS (her kennel, co-owned), living with his co-owner, who has a KennelPort site. She sets
  his photos link to `https://coowner.kennelport.com/dogs/rex`. She doesn't tick him for her website. Every Update
  website: `addressChanges` → `{ url: '' }`. Gone, with no line in the Update's summary.
- Ziva is retired; she unticked Show on website in KennelOS but left Ziva on her site by hand, and typed Ziva's
  page into the photos link. The next Update blanks it.

**Why it matters** Plan §5.4: "KennelPort may replace an address it wrote itself, and never one she typed".
KennelOS can't tell the two apart, and treats an answer that doesn't mention a record as that record having left.
She loses what she typed on every press, silently (the summary counts only `filled`).

**What I'd do** KennelOS keeps, per record on the device (beside `sent`), the address it last wrote, and replaces
or blanks only a `url` still equal to it. Then neither "any kennelport.com" nor "not mentioned" has to mean ours.

## 3. Undo publish writes no redirects  (S2, verified)

**Where** `worker/src/publish.js:412-429` (`undoPublish` points the site at the earlier snapshot; nothing about
`redirects`), against `publish()`'s `:373-391`. `site.js:252-256` redirects only a 404.

**Scenario** (script `s3-redirects.mjs`, steps 4-7)
1. About was at `/meet-us` once, so `/meet-us → /about` is kept. She renames About to `/our-story` and
   publishes: `/about → /our-story`, `/meet-us → /our-story`. She shares `/our-story`.
2. She presses Undo publish. `/about` 200, but `/our-story` **404**, and `/meet-us` 301s to `/our-story`, which 404s.
3. Same with a dog: change Willow's web address to `willow-the-wild`, publish, Update website (KennelOS now holds
   `/dogs/willow-the-wild`), Undo: `/dogs/willow-the-wild` 404 until she updates again, and for good in any
   Companion package or text already sent.

Publishing again (step 8) puts it right, because `previous` is then the older snapshot. The redirects the undone
publish wrote stay in the table and lie under live pages, harmless until they don't.

**Why it matters** Undo is the button she presses when something went wrong; it shouldn't break links as it
goes. It's the walk the plan asked for (question 8), and the answer is yes, it 404s.

**What I'd do** Undo runs the same redirect step as publish, from the undone snapshot's `recordPaths` to the
target's. That covers both pages and records.

## 4. A kept puppy's page answers "not found", not her new dog page  (S3, verified)

**Where** `worker/src/publish.js:41-47` keys redirects by record id. The hand-over (`kennelos/bundle.js:757-760`)
makes a new dog row, so the puppy (`/litters/<litter>/<pup>`) and the dog (`/dogs/<dog>`) never share an id.

**Scenario** (script `s2-handover.mjs`) Fern's puppy page is published and shared with her new family's friends.
She's kept and sent as a dog. While the litter still lists her, both pages answer. Once KennelOS stops listing
her in the litter (or the litter leaves the site), `/litters/nova-s-litter/fern` is 404 with no redirect.
(KennelOS's own `url` moves to `/dogs/fern` correctly after the next publish and Update: `publishedAddresses`
prefers the dog page, verified.)

**What I'd do** When a puppy row's `kennelos_id` is a shown dog's, `recordPaths` gives the puppy's id the dog's
path too, so its old page redirects.

## 5. The Litters switch blanks every litter and puppy link in KennelOS  (S3, verified)

**Where** `worker/src/kennelos/bundle.js:982` (`snap.pages?.litters?.enabled`), `render/index.js:39-42` (litter
and puppy pages answer only with the Litters page on), the switch's wording `manage/wording.js:513`.

**Scenario** (script `s8-littersoff.mjs`) Litters off, publish, Update website: the answer keeps only dog pages;
KennelOS blanks `photos_url` on every litter and `url` on every puppy. `/litters/nova-s-litter` 404. On again
refills only after a publish and another Update.

**Why it matters** It is consistent with "only addresses that answer", but it isn't what the switch tells her:
"it leaves the menu and its address says 'This page isn't available'". She may be hiding the list page between
litters, not every puppy's own page and the families' photos links.

**What I'd do** Either keep the litter and puppy pages answering with the list page off (as dog profiles do with
Dogs off, `render/index.js:36`), or say on the switch what goes with it. Her wording either way.

## 6. KennelOS forgets her previous domain after a facts refresh  (S3, verified)

**Where** KennelOS `kennelportLink.js:319` (`sites = [after, link.site]`: only the current facts and the ones
stored before this press), refreshed by `portalFeedSync.js:227-228` (`linkStatus` → `notePortalSent({ site })`)
and `setWebsitePrices` (`:183`), neither of which touches the urls.

**Scenario** Her links are on `www.old-domain.com`. She connects `www.new-domain.com` in KennelPort. Within the
hour the portal feed's check stores the new facts. Next Update: the old domain is in neither entry, so
`addressChanges` sees `https://www.old-domain.com/dogs/nova` as one she typed → `[]` (verified). Every link stays on
the old domain for good, neither replaced nor blanked. Once the old domain is disconnected it's dead.

**What I'd do** Keep every website address the device has been given (a short list on the link row), not the
last one only. Finding 2's fix covers this too.

## 7. A family-portal setting reads as a site change on Publish  (S3, verified)

**Where** `worker/src/publish.js:201-207`: extras and products drop a list of their own, not `SYSTEM`, so
`kennelos_id`, `portal_delivery`, `portal_every_days`, `portal_show`, `portal_type`, `family_action`,
`portal_per_family`, `account_type` all go into the snapshot. `diff.js:100-101` compares the whole record.

**Scenario** (script `s7-portal-diff.mjs`) Publish, then change "10-Week Homegoing"'s stay updates to every 14 days
(`portal/stays.js:75`). Publish lists `Extras: 10-Week Homegoing edited`. Nothing on the public site changed.
Likewise for a product's portal settings (`portal/admin.js:512`) and for the one-off `kennelos_id` re-key after
an Unlink.

**What I'd do** Drop the portal and KennelOS columns there (as `SYSTEM` does for dogs), or list exactly what the
site shows. Nothing serves the snapshot JSON, so this is no leak today.

## 8. Two pages claiming one address: her Pages says one thing, the site another  (S4, verified)

**Where** `content/io.js:79-84` leaves who gets a contested address to Publish; `content/addresses.js:61-70`
gives it to the first page in `PAGES` order; `manage/screens/pages.js:70` lists `site_pages.path` as stored.

**Scenario** (script `s4-contest.mjs`) An import sets About and FAQ both to `/our-story`. Published: `/our-story`
is About, FAQ stays at `/faq`, and her Pages list shows `/our-story` for both.

The Site Manager paths can't get here: her rename checks every other page (`records.js:384-393`) and the owner's
new page checks hers (`builder.js:938, 972`). Only an import, or both saving in the same instant.

**What I'd do** Refuse the second one at import, as the typed rename does; or have the Pages list show the
settled address with a line saying why.

---

## Notes, not findings

- **Chains and renaming back are right** (`s3-redirects.mjs` 1-3): `/about → /our-story → /meet-us` collapses to
  both going straight to `/meet-us`; renaming back drops `/about`'s redirect and points the others at `/about`.
  Every redirect is sent with `max-age=300`, so a browser that cached `/about → /our-story` is wrong for five
  minutes after a rename back, not for good. (The trailing-slash 301 at `site.js:227` has no cache-control, but it
  never changes.)
- **The ordering question, otherwise:** a dog KennelOS stops sending (`hidden_by_kennelos`), a puppy whose KennelOS
  dog moved litters, a pairing becoming a litter (same website row, new KennelOS id), and the hand-over all keep
  answering with the *published* page until the next publish. Verified for the hand-over and the litter; read for
  the others. The answer's only gaps are findings 1, 2 and 5.
- **No snapshot at all** (`bundle.js:974`): a never-published site, or one whose `restoreFinish` dropped back to
  draft, answers no addresses and KennelOS blanks every one of its links. Correct while nothing answers.
- **A suspended site** still answers its addresses (its pages are 503). Harmless while the suspension is short.
- **Slug reuse:** `Writer.slug` checks only today's records. After she changes a dog's web address, a new dog of
  the same name takes the old one and publish deletes its redirect (`publish.js:391`): an old QR code shows the
  new dog. Rare (a hand rename, then the same name again).
- **The in-memory cache** keeps up to 20 snapshots of up to 8 MB in a 128 MB isolate, and `cleanup.js:62-66` loads
  every snapshot of every site with removed photos through it. The sample site's snapshot is 28 KB, so far off.
- **The Publish list is otherwise clean:** right after a publish it's empty, and a page address change reads
  "Our story page: now at /our-story; the old address takes visitors there" (true, apart from finding 3).
- Columns added since 2026-11-03 that reach the snapshot through `keep()`: dogs' `country_of_origin`, `breed`,
  `owner_name`, `owner_url`, `weight`, `date_of_birth`; litters' `kennelos_status`, `deposits_on`; puppies'
  `disposition`, `registration`. Each is a field the owner's block rules read (`content/fields.js`), so
  meant. Reviews' `answers` are kept out (`publish.js:190`).

## Coverage gaps I found (tests that should exist)

- The bundle answer while a match waits (and after Unlink, Connect again): the waiting record's page still listed.
- `undoPublish` leaves every address the undone publish sent visitors to answering (page and record).
- A kept puppy's old page redirects to her dog page once the litter stops listing her.
- KennelOS `addressChanges`: a dog not in the answer holding another kennel's kennelport.com page keeps it.

## What I did not get to

- Question 5 against a site at its photo limit (`MAX_SNAPSHOT_BYTES` measured only for the sample).
- `content/featured.js` turning over with no publish, against `site.js`'s day-keyed cache.
- `domains.js` in depth (activating, removing), beyond `siteBase` reading only `status = 'active'`.
- Question 7 (draft leaks) beyond reading the preview cookie check: session 7's ground.
- Whether `websiteOffer` can ask twice in one sitting (its screen is KennelOS's, session 9).
- Two publishes at once (both read the same `previous`; the second's redirects overwrite the first's).

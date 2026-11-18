# KennelPort: where things stand

The one place for progress. Keep it short: one line per item, a link to where the detail
is. When a step is built, change its line here and add the detail to the build log
([`log/BUILD_LOG.md`](log/BUILD_LOG.md)); the plans describe intent, not progress.

Last updated 2026-11-18. Released on `main`: Site Manager (`APP_VERSION`) 18, site
template (`ASSET_VERSION`) 27 (flip cards that grow to fit, 2026-11-17).

## Platform

- **Production is live** at `kennelport.com`: every built migration applied, every key
  and service connected (Resend, push, Turnstile). Work is deployed straight to
  production: a merge to `main` deploys it (Workers Builds), and a migration it carries
  applies itself (2026-11-12); `/ops` is needed only if one fails. Setup steps, for a rebuild: [`plans/setup.md`](plans/setup.md).
- **Staging** (`kennelport-staging.kennelport.workers.dev`) still deploys from `main` but
  isn't used regularly.
- Custom domains are connected by hand ([`plans/setup.md`](plans/setup.md), Custom domains).
- **Full backup and restore** in `/ops` (2026-11-10): every row and file of a site in one
  zip, and back in ([`plans/backup-format.md`](plans/backup-format.md)). Back up each
  site before any change that could lose data.
- The tests run on every pull request and push (`.github/workflows/test.yml`). Requiring
  them to pass before a merge: **descoped** (the owner, 2026-11-12).
- `/ops` sign-in: 10 wrong tokens an hour from one address, then that address is refused
  for the hour (2026-11-12).

## Version 1, the first family site ([`plans/kennelport.md`](plans/kennelport.md) 8.1)

| Phase | State |
|---|---|
| 0. Set up | Done; production live |
| 1. Renderer + ops | Built |
| 2. Breeder login, the Site Manager | Built; photo upload tried on a real Android and iPhone |
| 3. The first site's pages | Built |
| 4. The KennelOS link | Done: built on both sides and working with KennelOS on production |
| 5. Albums, embeds, sharing | Built, apart from KennelOS shares carrying album links |
| 6. Customisation and schemes | Built, and now carried further by the site builder (below) |

Open decision: 9, content rules and suspension, waits until KennelPort is offered to
anyone outside the family.

## Site builder ([`plans/site-builder.md`](plans/site-builder.md), "Building it, in steps")

| Step | State |
|---|---|
| 1. Display and timing rules | Built (pup, registration, price, date and timing rules); the dog rules, fixed wording, formats and how KennelOS data lands still to come |
| 2. The breeder's instructions (`manage/wording.js`) | 2.1–2.3 built; **2.4 to do:** the portal's screens for her (`portal/admin.js`) and Today |
| 3. Pages, blocks, menu | Built: 3.1–3.8 (3.5 page addresses and 3.8 the forms' fields, 2026-11-14, migration 0035) |
| 4. The owner's own blocks and styling | Banners, buttons, dividers, spacers, photos, collages, photo beside words, text over a photo, text, gallery strip, block backgrounds and spacing built. **Next, the photo system:** albums from photos she has, then the duplicate check. Still to come: videos as blocks, links to a dog/litter/puppy, fonts and the font library, text size on built-in blocks |
| 4a. Extras, Cards, documents | Built 2026-11-18 (migration 0038): the **Extras block** (step cards by default, package cards or expanders; a big figure, More details, a highlighted one, her own description); the **Cards block** (free cards: photo, figure, labels, heading, words, button); **Documents** (a site's PDFs in the admin view; any button can open one). **`ASSET_VERSION` bump waiting on the owner's yes.** The gaps (storage, reordering cards, menu links, the breeder's documents, covers, full-size flyers) are planned in [`plans/documents-cards-gaps.md`](plans/documents-cards-gaps.md). Build log, 2026-11-18. |
| 4b. Text sizes | Planned 2026-11-18 ([`plans/text-sizes.md`](plans/text-sizes.md)): text roles with today's sizes, one change per role, components under each; three questions for the owner. Not started. |
| 5. Templates (save, apply, reset) | Not started |
| 6. The family portal's build | Not started |
| 7. After the KennelOS review | Planned in [`plans/kennelos-contract.md`](plans/kennelos-contract.md). Steps 1 and 2 built: blocks over any field (conditions, order, groups, the colour picker; Pup cards new; a dog's Life stage and Lives), 2026-11-12. Featured offspring (B6) built too: a dog's sire and dam (migration 0030), offspring chained on its page, her Pedigree card with Make a dog record, and one Life stage on her dog form. Step 3 built (migration 0031): she unticks any record on any data block, and picks, orders and sets dates for a new Featured dog or Featured pup block that turns over by itself (2026-11-12). Featured's share row built 2026-11-14 (template 26). Step 4 built (migration 0033): KennelOS's raw disposition, litter status, test type and account type, with the owner's rules for a pup's status and a product's place, and as block fields; and its two display rules, a litter card's line by KennelOS status and a dog's health results grouped by kind, her switch on Kennel details (2026-11-13). Step 5 built: titles as rows with organization and date, and tags (the owner's Tags screen, by rule and for her to tick on a dog), in the same migration 0033; and pill styles (six, one per site) with each pill's colour from its scheme's named colours, everywhere a site has pills (2026-11-13). Step 6 built (migration 0034, 2026-11-14): origin and lineage, Import and Import-descended as fields (the import tags are tag rules), the Origin card item, the Pedigree part of a dog's page, and Make a dog record for a KennelOS ancestor; Champion-descended too (KennelOS now sends every ancestor's titles); and country of origin (`origin_country`) with Import-descended and Foreign bloodlines as the owner defined them (reply to KennelOS: [`plans/done/kennelos-origin-country-reply.md`](plans/done/kennelos-origin-country-reply.md)). **Next:** step 7, waitlist facts (C9). Step 2's Girls and boys is now a block grouped by sex as a Show filter, with the menu's Girls and Boys following it; the menu can link to any group of any block (2026-11-13). |

## Family portal ([`plans/family-portal.md`](plans/family-portal.md))

- Phase 1: all six build chunks built (2026-11-04), and KennelOS's side of the feed; the
  family Home, Today and Families in the prototype's look (2026-11-05).
- Phase 1's gate (one litter run from signed contract to the vet visit with no fixes by
  hand, plan section 6): **waits for a real litter**; she has none yet (2026-11-12).
- Still open from "Before building" (plan section 14): her programs list, vet-visit
  wording, guarantee periods, handbook and food details, baseline sign-up rates,
  application-to-buyer mapping, photo and video package details, R2 and HEVC checks.
- Phases 2 and 3: not started.
- The same family twice, and deleted families (2026-11-13): the feed links a family's only
  typed placement; **Merge** for a typed placement or family into KennelOS's; **Delete
  now**; **Let KennelOS send them again** for a family deleted for good. Migration 0032
  (tombstone labels). No version bump. Build log, 2026-11-13.
- Seeing a family's portal as they see it (read-only, live): built 2026-11-13
  ([`plans/done/family-view.md`](plans/done/family-view.md)). No migration, no version bump.

## Finished feature plans

- Co-owned dogs: KennelPort's half built 2026-11-04 ([`plans/done/co-owned-dogs.md`](plans/done/co-owned-dogs.md)).
- Linked sample and the demo site: built ([`plans/done/linked-sample.md`](plans/done/linked-sample.md)).
- Seeing a family's portal as they see it: built 2026-11-13 ([`plans/done/family-view.md`](plans/done/family-view.md)).

## Review ([`review/senior-review-2026-11.md`](review/senior-review-2026-11.md), 2026-11-10)

Verdict: keep the code, fix how it reaches production. Done: backup, tests on every
change, a plain page for unexpected errors, migrations applying themselves (item 1), a
limit on wrong `/ops` tokens (item 4). Descoped (the owner): required checks before a
merge. The portal's gate waits for a real litter, so features carry on meanwhile.

## Loose ends ([`loose-ends.md`](loose-ends.md))

- Step 1, the quick finishes, built 2026-11-14 (#1, #11, #12, #13, #17, #18), with
  `ASSET_VERSION` 26.
- Step 2, one sign-in, not two (#15), built 2026-11-14: breeder and family sign-in share
  `signin.js`; the KennelOS copies checked against KennelOS and held by a test. For
  KennelOS: refuse `<` and `>` in an email address, as KennelPort does.
- Step 3, page addresses (#2) and the forms' fields (#3), built 2026-11-14 on one branch:
  the breeder's Address beside her menu name, old addresses redirect from Publish; Forms
  in the admin view (fields on or off, required, order, words, her own questions).
  Migration 0035 (`site_pages.path`, `stories.answers`). No version bump.
- Step 4, the parked code review (#14), started 2026-11-15: session 1 (the bundle contract)
  done, [`review/findings/01-bundle-contract.md`](review/findings/01-bundle-contract.md):
  2 S1, 1 S2, 4 S3. Both S1s fixed 2026-11-15 (migration 0036, `products` and `extras`
  `hidden_by_kennelos`): a product or extra KennelOS stops sending is hidden, not deleted, and
  stays in the portal; a dog's last KennelOS health result can be removed. No version bump.
  Session 2 (link lifecycle, findings `02-link-lifecycle.md` on branch `ccr-a5707191-duiaog`):
  its data-loss findings 1, 2, 4 and 5 fixed 2026-11-15 (migration 0037, `products` and
  `extras` `show_on_site`): Unlink makes a hidden product or extra hers, off by her own switch;
  stopping the last device no longer unlinks; extras, steps and health results match on a
  relink instead of doubling; Unlink asks first; a slid session re-sends its cookie. Findings
  3, 6, 7 and 8 still open. No version bump.
  **Next:** the other sessions (`review/session-prompts.md`), then 10.

## Parked

- The version-1 code review ([`review/plan.md`](review/plan.md)): written 2026-11-03; session 1
  ran 2026-11-15 (KennelOS paths for session 1 checked). Brought up to date 2026-11-14 (file lists, then questions for every
  feature built since 3 November, sessions 11 and 12, prompts and index); targets `main`
  at the merge of page addresses and the forms. **Next:** sessions 2 to 12.
  KennelOS paths for sessions 2, 4, 5 and 9 are still unchecked.
- After version 1: [`plans/backlog.md`](plans/backlog.md).

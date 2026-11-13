# KennelPort: where things stand

The one place for progress. Keep it short: one line per item, a link to where the detail
is. When a step is built, change its line here and add the detail to the build log
([`log/BUILD_LOG.md`](log/BUILD_LOG.md)); the plans describe intent, not progress.

Last updated 2026-11-13. Released on `main`: Site Manager (`APP_VERSION`) 17, site
template (`ASSET_VERSION`) 23.

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
| 3. Pages, blocks, menu | 3.1–3.4, 3.6, 3.7 built; **to do:** 3.5 page addresses and redirects, 3.8 the forms' fields |
| 4. The owner's own blocks and styling | Banners, buttons, dividers, spacers, photos, collages, photo beside words, text over a photo, text, gallery strip, block backgrounds and spacing built. **Next, the photo system:** albums from photos she has, then the duplicate check. Still to come: videos as blocks, links to a dog/litter/puppy, fonts and the font library, text size on built-in blocks |
| 5. Templates (save, apply, reset) | Not started |
| 6. The family portal's build | Not started |
| 7. After the KennelOS review | Planned in [`plans/kennelos-contract.md`](plans/kennelos-contract.md). Steps 1 and 2 built: blocks over any field (conditions, order, groups, the colour picker; Pup cards new; a dog's Life stage and Lives), 2026-11-12. Featured offspring (B6) built too: a dog's sire and dam (migration 0030), offspring chained on its page, her Pedigree card with Make a dog record, and one Life stage on her dog form. Step 3 built (migration 0031): she unticks any record on any data block, and picks, orders and sets dates for a new Featured dog or Featured pup block that turns over by itself (2026-11-12). Not yet: Featured's share row (needs an `ASSET_VERSION` bump). **Next:** step 4, the small raw fields. Step 2's Girls and boys is now a block grouped by sex as a Show filter, with the menu's Girls and Boys following it; the menu can link to any group of any block (2026-11-13). This branch carries `APP_VERSION` 18 and `ASSET_VERSION` 24. |

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

## Parked

- The version-1 code review ([`review/plan.md`](review/plan.md)): written 2026-11-03, no
  session has run. The code has changed a lot since; refresh its file lists before using it.
- After version 1: [`plans/backlog.md`](plans/backlog.md).

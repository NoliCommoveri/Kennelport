# KennelPort: where things stand

The one place for progress. Keep it short: one line per item, a link to where the detail
is. When a step is built, change its line here and add the detail to the build log
([`log/BUILD_LOG.md`](log/BUILD_LOG.md)); the plans describe intent, not progress.

Last updated 2026-11-10. Released on `main`: Site Manager (`APP_VERSION`) 17, site
template (`ASSET_VERSION`) 23.

## Platform

- **Production is live** at `kennelport.com`: every built migration applied, every key
  and service connected (Resend, push, Turnstile). Work is deployed straight to
  production: a merge to `main` deploys it (Workers Builds), then **Apply pending** in
  `/ops` if it carries a migration. Setup steps, for a rebuild: [`plans/setup.md`](plans/setup.md).
- **Staging** (`kennelport-staging.kennelport.workers.dev`) still deploys from `main` but
  isn't used regularly.
- Custom domains are connected by hand ([`plans/setup.md`](plans/setup.md), Custom domains).
- **Full backup and restore** in `/ops` (2026-11-10): every row and file of a site in one
  zip, and back in ([`plans/backup-format.md`](plans/backup-format.md)). Back up each
  site before any change that could lose data.
- The tests run on every pull request and push (`.github/workflows/test.yml`). **To do
  (owner):** require them to pass before a merge to `main`, in GitHub's branch settings.

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
| 7. After the KennelOS review | Review done 2026-11-10; planned in [`plans/kennelos-contract.md`](plans/kennelos-contract.md) (raw fields, blocks over any field, picks, Featured block, tags). Not built; seven questions open for the owner |

## Family portal ([`plans/family-portal.md`](plans/family-portal.md))

- Phase 1: all six build chunks built (2026-11-04), and KennelOS's side of the feed; the
  family Home, Today and Families in the prototype's look (2026-11-05).
- **Next: phase 1's gate:** one litter run from signed contract to the vet visit with no
  fixes by hand, including one pickup she forgot to mark (plan section 6).
- Still open from "Before building" (plan section 14): her programs list, vet-visit
  wording, guarantee periods, handbook and food details, baseline sign-up rates,
  application-to-buyer mapping, photo and video package details, R2 and HEVC checks.
- Phases 2 and 3: not started.

## Finished feature plans

- Co-owned dogs: KennelPort's half built 2026-11-04 ([`plans/done/co-owned-dogs.md`](plans/done/co-owned-dogs.md)).
- Linked sample and the demo site: built ([`plans/done/linked-sample.md`](plans/done/linked-sample.md)).

## Review ([`review/senior-review-2026-11.md`](review/senior-review-2026-11.md), 2026-11-10)

Verdict: keep the code, fix how it reaches production. Done: backup, tests on every
change, a plain page for unexpected errors. **Open, the owner's to decide:** migrations
applying themselves instead of every site showing "Back soon" until Apply pending
(item 1); limiting wrong guesses at the `/ops` token (item 4). Recommended: no new
features until the portal's gate has been run.

## Parked

- The version-1 code review ([`review/plan.md`](review/plan.md)): written 2026-11-03, no
  session has run. The code has changed a lot since; refresh its file lists before using it.
- After version 1: [`plans/backlog.md`](plans/backlog.md).

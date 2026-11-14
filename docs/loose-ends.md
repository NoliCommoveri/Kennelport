# KennelPort: loose ends, and the order to tie them

As of 14 November 2026, `main` at PR #57.

Unfinished planned work, from `docs/STATUS.md`, the plans' "Building it, in steps"
sections, the senior review and the build log. User experience ranks first, then
security, then maintenance. Each piece has a rough estimate of the tokens a build would
take. Estimates were not checked against the code beyond a quick look.

**Tokens:** low is a small change in a file or two; med is a screen or feature with
tests; high is several screens, maybe a migration or KennelOS; enormous is several
sessions.

## Suggested order: five branches

1. **The quick finishes and tidy-up** (#1, #11, #12, #13, #17, #18; low overall)
   - The Featured block's share button (#1). It needs an `ASSET_VERSION` bump, so ask
     the owner first.
   - Move the Publish screen's change list into the owner's wording list (#11).
   - Check the rules and From KennelOS screens side by side at 390px (#12).
   - Tell breeders that contact messages are deleted after 90 days (#13).
   - Move the two finished KennelOS hand-overs to `plans/done/` (#17).
   - Refresh the code review's file lists, ready for step 4 (#18).
2. **One sign-in, not two** (#15; med). Make breeder and family sign-in share one piece
   of code, and check the four files copied from KennelOS against their originals, so a
   fix can't land in one copy and miss the other.
3. **Page addresses, then the forms' fields** (#2, #3; med–high each). Both are things
   the breeder sees, and each probably carries a migration, so each goes on its own
   branch. A migration applies itself on live sites, so it must only add.
4. **The parked code review** (#14; high). Run it with the file lists refreshed in step
   1, before more large features land.
5. **The photo system and the owner's blocks** (#4, #6; med each part). Leave #5, #7
   and #10 until KennelOS is ready for them.

## 1. User experience

| # | Item | Where it's written down | Tokens | Step | Notes |
|---|---|---|---|---|---|
| 1 | Featured block's share button | kennelos-contract step 3, "Not yet" | low | 1 | The rest of Featured is live; only sharing the featured dog or pup is missing. Needs an `ASSET_VERSION` bump, so the owner's yes first. |
| 2 | Page addresses and redirects | site-builder 3.5 | med–high | 3 | The breeder renames a page's address and the old link still works. Probably needs a migration for the redirects. It must not break existing links. |
| 3 | Contact and review form fields | site-builder 3.8 | med–high | 3 | Families use these forms directly. Probably needs a migration. |
| 4 | Photo system, the rest | site-builder step 4, "Next" | med / med–high | 5 | Albums from photos she already has, then the duplicate check. Marked as the next thing to build. |
| 5 | Waitlist facts and wording templates | kennelos-contract step 7 | high | | The last contract step. Needs agreement with KennelOS on what it sends. |
| 6 | Owner's blocks, the rest | site-builder step 4 | med each | 5 | Videos as blocks; links to a dog, litter or puppy; text size on the built-in blocks. The links are the cheapest and most visible. |
| 7 | Fonts and the font library | site-builder step 4 | high | | Touches every site's template, so it needs a version bump. |
| 8 | Display rules, the rest | site-builder step 1 | med–high | | Dog rules, fixed wording, formats, how KennelOS data lands. Later work may already cover parts (pill style is on Formats), so check the code before planning. |
| 9 | Portal screens' wording into the owner's list, and Today | site-builder 2.4 | med | | `portal/admin.js` (65 KB) has only 15 lines in the list. This gives the owner control over the portal wording the breeder reads. |
| 10 | KennelOS shares carrying album links | kennelport.md phase 5 | med | | The only unfinished part of phase 5. Needs a change on KennelOS too. |
| 11 | Publish screen's change list into the wording list | build log, 2026-11-08 | low | 1 | The lines still live in `diff.js`, not in `wording.js`. |
| 12 | 390px check of the rules and From KennelOS screens | build log, 2026-11-10 | low | 1 | These are her screens, not the breeder's. |
| 13 | Tell breeders contact messages are deleted after 90 days | senior review item 11 | low | 1 | A message or a help line, not code. A backup holds only what is still there. |

## 2. Security

Already done: backup, the error page, migrations applying themselves, the `/ops`
sign-in limit. Required checks before a merge were descoped by the owner.

| # | Item | Where it's written down | Tokens | Step | Notes |
|---|---|---|---|---|---|
| 14 | Run the parked version-1 code review | `review/plan.md` | high | 4 | Planned on 3 November and never run. The main check on code "built faster than it was checked" (review item 6). |
| 15 | Breeder and family sign-in written twice | senior review item 10 | med | 2 | Plus four files copied from KennelOS. Copies drift, so a fix can land in one and not the other. Doing it on purpose closes the risk now instead of waiting for the next change. |
| 16 | Content rules and suspension | open decision 9 | med–high | | Not needed yet: waits until KennelPort is offered outside the family. |

## 3. Maintenance and docs

| # | Item | Where it's written down | Tokens | Step | Notes |
|---|---|---|---|---|---|
| 17 | Move finished plans to `plans/done/` | `kennelos-ancestor-titles.md`, `kennelos-origin-country-reply.md` | low | 1 | STATUS says KennelOS now sends every dog's titles. Confirm on the KennelOS side first. |
| 18 | Refresh the code review's file lists | `review/plan.md` | low | 1 | Gets #14 ready to run. |
| 19 | Automate the version fingerprints | senior review item 9 | low–med | | Optional; the review called it a later tidy-up. |
| 20 | Split the big files | senior review item 7 | high in total | | `manage/builder.js` 96 KB, `screens.js` 78 KB, `render/pages.js` 67 KB, `portal/admin.js` 65 KB. Split a screen when it's next touched (med each); not worth a dedicated pass. |
| 21 | Keep or retire the staging deploy | STATUS, Platform | low | | It still deploys from `main` but isn't used. Mostly a decision. |

## Not loose ends: new projects

- Site builder step 5 (templates) and step 6 (the portal's build), and family-portal
  phases 2 and 3. Each is enormous.
- The rest of `backlog.md`, which is for after version 1.
- The portal gate (one real litter run end to end) and the portal plan's "Before
  building" list wait on a litter and on the owner's answers, not on building.

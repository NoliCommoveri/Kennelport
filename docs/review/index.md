# Review findings index

The plan: [`docs/review/plan.md`](plan.md).
Each session adds its own row when it finishes; nobody edits another session's row.
Findings live in `docs/review/findings/NN-<slug>.md`.

| # | Session | Branch | Commit reviewed | Date | S1 | S2 | S3 | S4 | Findings |
|---|---------|--------|-----------------|------|----|----|----|----|----------|
| 1 | The bundle contract, field by field | — | — | — | — | — | — | — | — |
| 2 | Link lifecycle, tokens, editions, licence | — | — | — | — | — | — | — | — |
| 3 | Records' lifecycle: matching, hand-over, clock, photos | — | — | — | — | — | — | — | — |
| 4 | Addresses back to KennelOS; publish/snapshot | — | — | — | — | — | — | — | — |
| 5 | Waitlist page, feed, sealed application form | — | — | — | — | — | — | — | — |
| 6 | The manage app: a breeder on a phone | — | — | — | — | — | — | — | — |
| 7 | The public site: what a family sees | — | — | — | — | — | — | — | — |
| 8 | Content layer, migrations, platform | — | — | — | — | — | — | — | — |
| 9 | The KennelOS side a breeder touches | — | — | — | — | — | — | — | — |
| 11 | The family portal | — | — | — | — | — | — | — | — |
| 12 | The owner's admin view | — | — | — | — | — | — | — | — |
| 10 | Consolidation | — | — | — | — | — | — | — | `SUMMARY.md` |

Target: `main` at the merge of `ccr-a71eca85-omlwep` (page addresses and the forms'
fields, 2026-11-14). Baseline there: KennelPort `node --test` 448 pass. KennelOS was last
counted on 2026-11-03 (`node --test` 1490 pass, `cloud` `npm test` 279 pass); the first
session to read KennelOS records its counts here.

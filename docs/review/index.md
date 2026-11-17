# Review findings index

The plan: [`docs/review/plan.md`](plan.md).
Each session adds its own row when it finishes; nobody edits another session's row.
Findings live in `docs/review/findings/NN-<slug>.md`.

| # | Session | Branch | Commit reviewed | Date | S1 | S2 | S3 | S4 | Findings |
|---|---------|--------|-----------------|------|----|----|----|----|----------|
| 1 | The bundle contract, field by field | `ccr-b7748679-2prmsg` | `8aaf58a` (KOS `999b868`) | 2026-11-15 | 2 | 1 | 4 | 0 | [01](findings/01-bundle-contract.md) |
| 2 | Link lifecycle, tokens, editions, licence | — | — | — | — | — | — | — | — |
| 3 | Records' lifecycle: matching, hand-over, clock, photos | `ccr-20c22c7c-2aq6yp` | `9bd2d14` | 2026-11-15 | 3 | 2 | 5 | 3 | [03](findings/03-record-lifecycle.md) |
| 4 | Addresses back to KennelOS; publish/snapshot | `ccr-e40bb9e8-ypczsq` | `d54afed` (KOS `850e02f`) | 2026-11-16 | 2 | 1 | 4 | 1 | [04](findings/04-addresses-publish.md) |
| 5 | Waitlist page, feed, sealed application form | `ccr-e40bb9e8-ypczsq` | `bd59ce3` (KOS `850e02f`) | 2026-11-16 | 1 | 2 | 5 | 1 | [05](findings/05-waitlist-application.md) |
| 6 | The manage app: a breeder on a phone | `claude/breeder-app-manage-review-3bw686` | `10cb8b9` | 2026-11-16 | 1 | 4 | 8 | 2 | [06](findings/06-manage-app.md) |
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
Session 1 (2026-11-15, KennelOS `999b868`): `node --test` 2007 pass; `cloud` not run (no `node_modules`).
Session 3 (2026-11-15, `9bd2d14`): KennelPort `node --test` 455 pass.
Session 4 (2026-11-16, `d54afed`): KennelPort `node --test` 455 pass; KennelOS `850e02f` `node --test` 2080 pass.
Session 5 (2026-11-16, `bd59ce3`): KennelPort 455 pass; KennelOS `850e02f` `node --test` 2080 pass, `cloud` `npm test` 365 pass.
Session 6 (2026-11-16, `10cb8b9`): KennelPort `node --test` 455 pass.

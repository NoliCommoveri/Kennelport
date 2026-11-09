# KennelPort

Hosted websites for breeders, at `theirkennel.kennelport.com`, served by one Cloudflare Worker.
The operator sets up and drafts each site; breeders manage content through a simple login
and can link their KennelOS data. A family portal for puppy buyers is switched on for one
breeder's site.

**Where things stand:** [`docs/STATUS.md`](docs/STATUS.md). **Where the code is:**
[`docs/CODE_MAP.md`](docs/CODE_MAP.md).

## Layout

| Path | What's there |
|---|---|
| [`worker/`](worker/) | The Worker: `src/`, `public/` (served files), `tests/`, `scripts/`. How to run it: [`worker/README.md`](worker/README.md) |
| [`docs/STATUS.md`](docs/STATUS.md) | What's built, what's next. Read first |
| [`docs/CODE_MAP.md`](docs/CODE_MAP.md) | One line per source file or folder |
| [`docs/plans/`](docs/plans/) | Plans being built: [`kennelport.md`](docs/plans/kennelport.md) (the main plan; version 1 is section 8.1), [`site-builder.md`](docs/plans/site-builder.md), [`family-portal.md`](docs/plans/family-portal.md), [`backlog.md`](docs/plans/backlog.md) (after version 1), [`setup.md`](docs/plans/setup.md) (Cloudflare steps) |
| [`docs/plans/done/`](docs/plans/done/) | Plans that are fully built: co-owned dogs, the linked sample |
| [`docs/reference/`](docs/reference/) | The prototypes, the target look. Its [README](docs/reference/README.md) says where each screen is in them |
| [`docs/log/`](docs/log/) | The build log, newest last ([`BUILD_LOG.md`](docs/log/BUILD_LOG.md)), and its archive |
| [`docs/research/`](docs/research/) | Finished research behind the plan: the visual survey, the site directory, design direction |
| [`docs/review/`](docs/review/) | A code review plan, not yet run |

Test: `node --test` from the root (Node 22 or later).

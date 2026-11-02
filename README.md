# KennelPort

Hosted websites for breeders, at `theirkennel.kennelport.com`, served by one Cloudflare Worker.
The operator sets up and drafts each site; breeders manage content through a simple login
and can link their KennelOS data.

Status: version 1 in progress. Phase 0 (plan 8.1) is coded: the Worker in [`worker/`](worker/)
routes by hostname and has D1, R2, staging and production configs and `/ops`; the
Cloudflare dashboard steps in [`docs/KennelPort_Setup.md`](docs/KennelPort_Setup.md) are
still to do. Next: phase 1. Open: puppy labels (decision 10), needed before phase 4;
site rules wait until KennelPort is offered (9). See
[`docs/KennelPort_Plan.md`](docs/KennelPort_Plan.md); after version 1:
[`docs/KennelPort_Backlog.md`](docs/KennelPort_Backlog.md). Page directory from a survey of real breeder sites:
[`docs/KennelPort_Site_Directory.md`](docs/KennelPort_Site_Directory.md); what they look like:
[`docs/KennelPort_Visual_Survey.md`](docs/KennelPort_Visual_Survey.md); design preferences:
[`docs/KennelPort_Design_Direction.md`](docs/KennelPort_Design_Direction.md); Cloudflare setup:
[`docs/KennelPort_Setup.md`](docs/KennelPort_Setup.md). History: [`docs/BUILD_LOG.md`](docs/BUILD_LOG.md).

Layout: [`worker/`](worker/) is the Worker (its README says how to run it); `docs/` holds the
plan and its companions. Test: `node --test` from the root (Node 22 or later).

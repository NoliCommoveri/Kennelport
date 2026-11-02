# KennelPort

Hosted websites for breeders, at `theirkennel.kennelport.com`, served by one Cloudflare Worker.
The operator sets up and drafts each site; breeders manage content through a simple login
and can link their KennelOS data.

Status: version 1 in progress. Phase 0 is live on staging
(`kennelport-staging.kennelport.workers.dev`); production waits for the `kennelport.com`
domain ([`docs/KennelPort_Setup.md`](docs/KennelPort_Setup.md)). Phase 1 is built: the
AK template rendered from published snapshots, and `/ops` sites with JSON content
editing, photos, preview, publish, undo, suspend and close; still to do in it: custom
domains by hand, when the first site wants one. Phase 2 is built (sign-in, the installable manage app, editing and publish, the site's
contact and review forms, Inbox, review queue, push, download a copy, Delete my site,
limits); still to do in it: photo upload tried on a real iPhone and Android phone
(plan 4.2). Next: phase 3. Open: site rules wait until KennelPort is offered (9). See
[`docs/KennelPort_Plan.md`](docs/KennelPort_Plan.md); after version 1:
[`docs/KennelPort_Backlog.md`](docs/KennelPort_Backlog.md). Page directory from a survey of real breeder sites:
[`docs/KennelPort_Site_Directory.md`](docs/KennelPort_Site_Directory.md); what they look like:
[`docs/KennelPort_Visual_Survey.md`](docs/KennelPort_Visual_Survey.md); design preferences:
[`docs/KennelPort_Design_Direction.md`](docs/KennelPort_Design_Direction.md); Cloudflare setup:
[`docs/KennelPort_Setup.md`](docs/KennelPort_Setup.md). History: [`docs/BUILD_LOG.md`](docs/BUILD_LOG.md).

Layout: [`worker/`](worker/) is the Worker (its README says how to run it); `docs/` holds the
plan and its companions. Test: `node --test` from the root (Node 22 or later).

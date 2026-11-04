# KennelPort

Hosted websites for breeders, at `theirkennel.kennelport.com`, served by one Cloudflare Worker.
The operator sets up and drafts each site; breeders manage content through a simple login
and can link their KennelOS data.

Status: version 1 in progress. Phase 0 is live on staging
(`kennelport-staging.kennelport.workers.dev`); production waits for the `kennelport.com`
domain ([`docs/KennelPort_Setup.md`](docs/KennelPort_Setup.md)). Phase 1 is built: the
AK template rendered from published snapshots, and `/ops` sites with JSON content
editing, photos, preview, publish, undo, suspend and close (a custom domain is connected
by hand when the first site wants one). Phase 2 is built (sign-in, the installable manage
app, editing and publish, photos tagged with what they're of, the site's contact and
review forms, Inbox, review queue, push, download a copy, Delete my site, limits); photo
upload works on a real Android phone and a real iPhone (plan 4.2). Phase 3 is built: How to pay and the safe-payment notice, the application form on the
waitlist page, and the KennelOS website feed: the list and KennelOS's application form
drawn in the site's style, and a simple waitlist kept by hand for sites without
KennelOS (plan 3.8, 8.1). Phase 5 is built (albums, videos and posts, sharing and QR codes) apart from KennelOS
shares carrying album links. Phase 4 is built on both sides (link codes, the bundle API, matching, litter prices, the
30 days with Keep, the Dogs page's new groups; in KennelOS the marks, Connect website and
Update website; plan 8.1); next is trying it against staging. Open: site
rules wait until KennelPort is offered (9). See
[`docs/KennelPort_Plan.md`](docs/KennelPort_Plan.md); after version 1:
[`docs/KennelPort_Backlog.md`](docs/KennelPort_Backlog.md). Page directory from a survey of real breeder sites:
[`docs/KennelPort_Site_Directory.md`](docs/KennelPort_Site_Directory.md); what they look like:
[`docs/KennelPort_Visual_Survey.md`](docs/KennelPort_Visual_Survey.md); design preferences:
[`docs/KennelPort_Design_Direction.md`](docs/KennelPort_Design_Direction.md); Cloudflare setup:
[`docs/KennelPort_Setup.md`](docs/KennelPort_Setup.md); the version-1 code review, run over
several sessions: [`docs/KennelPort_Review_Plan.md`](docs/KennelPort_Review_Plan.md) (findings
in [`docs/review/`](docs/review/)). The family portal for one breeder (planned, not built):
[`docs/Puppy_Parent_Portal_Plan.md`](docs/Puppy_Parent_Portal_Plan.md). Co-owned dogs, with
KennelOS (planned, not built): [`docs/Co_Owned_Dogs_Plan.md`](docs/Co_Owned_Dogs_Plan.md). History: [`docs/BUILD_LOG.md`](docs/BUILD_LOG.md).

Layout: [`worker/`](worker/) is the Worker (its README says how to run it); `docs/` holds the
plan and its companions. Test: `node --test` from the root (Node 22 or later).

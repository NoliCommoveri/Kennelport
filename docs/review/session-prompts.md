# Session prompts

One block per review session. Paste the block as the session's task. Each block is
self-contained apart from the plan, which it tells the session to read first.

Every block assumes both repos are attached (`/home/user/Kennelport`, `/home/user/KennelOS`)
and ends the session with a findings file committed and pushed to that session's own branch.
Sessions 6, 7, 8, 11 and 12 need only KennelPort.

Updated 2026-11-14 (evening) with the plan. The files a prompt names are where to start; the
plan's "Read" list for the session is the full one, and its section 0 says how to record
the commit you reviewed and what changed since. Every prompt implies: change no product
code, bump no version number, run no fingerprint script.

---

**Session 1 — the bundle contract**

> Read `Kennelport/docs/review/plan.md` (sections 0 and "Session 1") and follow
> it. You are reviewing the KennelOS → KennelPort bundle, field by field, for defects,
> pitfalls and poor user experience — not for departures from the plan. The files are
> `Kennelport/worker/src/kennelos/bundle.js`, `api.js`, `worker/src/content/model.js`, and
> `KennelOS/shared/data/siteExport.js`. Prove what you can with scratch scripts against
> `worker/tests/helpers/d1.js` and `siteExport.buildSiteBundle`. Write
> `docs/review/findings/01-bundle-contract.md` in the KennelPort repo, add your row to
> `docs/review/index.md`, commit docs only, push. Change no product code and bump no
> version numbers.

---

**Session 2 — link lifecycle, tokens, editions, licence**

> Read `Kennelport/docs/review/plan.md` (section 0 and "Session 2") and follow
> it. You are reviewing the link boundary between the two products: codes, rate limits,
> the device token, CORS and origins, unlink/stop-device, multi-kennel, multi-device, the
> lapsed-Pro path, and manage-app sign-in. Prove the token never reaches a backup, the
> cloud or live sync, and assemble the KennelOS editions to prove Lite and Demo make no
> request. Write `docs/review/findings/02-link-lifecycle.md`, add your INDEX row, commit
> docs only, push. Change no product code and bump no version numbers.

---

**Session 3 — matching, the hand-over, the 30-day clock, photos**

> Read `Kennelport/docs/review/plan.md` (section 0 and "Session 3") and follow
> it. You are reviewing everything that can destroy a breeder's photos or a record:
> `worker/src/kennelos/match.js`, `clock.js`, `cleanup.js`, `photos.js`, `photoTags.js`,
> `ops/usage.js`, and the hand-over block in `kennelos/bundle.js`. Start with the question
> of whether a kept puppy's *every* photo survives the hand-over now that a puppy has more
> than one (migration 0020), and with whether litters already off the site all become due
> for deletion the day this ships. Write `docs/review/findings/03-record-lifecycle.md`, add
> your INDEX row, commit docs only, push. Change no product code.

---

**Session 4 — addresses back to KennelOS, publish and snapshots**

> Read `Kennelport/docs/review/plan.md` (section 0 and "Session 4") and follow
> it. You are reviewing the only write that crosses back into KennelOS's records
> (`publishedAddresses` → `addressChanges` / `kennelChanges`) and the publish/snapshot
> machinery under it. Start with the ordering question: `publishedAddresses` reads the
> *published* snapshot right after a bundle is applied, so work out exactly when KennelOS
> blanks a `url` for a page that has not left at all. Then the page addresses the breeder
> renames (`content/addresses.js`, the page redirects `publish.js` writes): chains, renaming
> back, undoing a publish, a removed page. Write
> `docs/review/findings/04-addresses-publish.md`, add your INDEX row, commit docs only,
> push. Change no product code.

---

**Session 5 — the waitlist page, the feed, the sealed application form**

> Read `Kennelport/docs/review/plan.md` (section 0 and "Session 5") and follow
> it. You are reviewing the one path a *family's* data takes between the products:
> `worker/src/feed.js`, `site.js`, `siteforms.js`, `waitlist.js`,
> `worker/public/_kp/t/ak/site.js`'s `sealToKennelos`, against `KennelOS/cloud/src/familyPages.js`,
> `cloud/src/lib/cors.js` and KennelOS's `seal.js`. Enumerate the four application-routing
> states and check every Apply button agrees; prove the sealing is byte-compatible; check
> what a family sees when the breeder's custom domain is not yet in `WEBSITE_ORIGINS`.
> Then the contact and review forms the owner now sets (`content/forms.js`): what a family
> meets, and that a review's for-the-breeder-only answers never reach the site.
> Write `docs/review/findings/05-waitlist-application.md`, add your INDEX row, commit docs
> only, push. Change no product code.

---

**Session 6 — the manage app**

> Read `Kennelport/docs/review/plan.md` (section 0 and "Session 6") and follow
> it. You are reviewing the breeder's own app on a phone: `worker/src/manage/*` and
> `worker/public/_kp/m/*`, plus push. Judge every empty, error and offline state, the photo
> upload past the first photo, publish/preview/undo, the matching screen, owner-vs-editor on
> every POST, escaping in hand-built HTML, and the wording a breeder reads (now the owner's
> list, `manage/wording.js`), including her page Address field and the answers in her Inbox
> and Reviews to approve. Write
> `docs/review/findings/06-manage-app.md`, add your INDEX row, commit docs only, push.
> Change no product code; do not bump `APP_VERSION` or run the fingerprint script.

---

**Session 7 — the public site**

> Read `Kennelport/docs/review/plan.md` (section 0 and "Session 7") and follow
> it. You are reviewing what a family sees: `worker/src/render/*`, `site.js`, and the AK
> template under `worker/public/_kp/t/ak/`. Escaping on every public value first, then the
> price and status rules (decisions 31 and 32), then empty and extreme content, then 320px
> and dark mode across all seven schemes in a real browser, then embeds and caching, then
> what the owner built (blocks, tags, Featured, renamed page addresses, the forms' fields).
> Write
> `docs/review/findings/07-public-site.md`, add your INDEX row, commit docs only, push.
> Change no product code; do not bump `ASSET_VERSION` or run the fingerprint script.

---

**Session 8 — content layer, migrations, platform**

> Read `Kennelport/docs/review/plan.md` (section 0 and "Session 8") and follow
> it. You are reviewing the floor everything stands on: `worker/src/content/*`, the
> migrations and `migrate.js`, `index.js`, `hosts.js`, `domains.js`, `ops*`, `cleanup.js`,
> `lib/*`, `wrangler.toml` and the scripts. Pay attention to a Worker running ahead of its
> migrations, an import that half-applies, `/__host` in production, destructive `/ops`
> actions, the cron's behaviour after a skipped week, and the CPU and subrequest budgets on
> the hottest paths. Migrations 0021 to 0035 each ran unattended on live data; backup and
> restore must carry every column added since. Write `docs/review/findings/08-platform.md`, add your INDEX row, commit
> docs only, push. Change no product code.

---

**Session 9 — the KennelOS side a breeder touches**

> Read `Kennelport/docs/review/plan.md` (section 0 and "Session 9") and follow
> it. You are reviewing KennelOS's website UI and flows: `shared/assets/websiteCard.js`,
> `websiteUpdateUI.js`, the website paths through Kels, the marks on the dog, litter and
> pairing pages, and `shared/data/kennelportLink.js` — which has **no tests at all**, so
> verify its behaviour by hand and list the suites that should exist. Then the editions
> (assemble all three), `PRECACHE_URLS`, `syncRegistry` classification, and backup/restore
> with marks set. Write `docs/review/findings/09-kennelos-side.md` in the **KennelPort**
> repo, add your INDEX row, commit docs only (in KennelPort), push. Change no product code
> in either repo; do not bump KennelOS's `CACHE_NAME`.

---

**Session 11 — the family portal**

> Read `Kennelport/docs/review/plan.md` (section 0 and "Session 11") and follow
> it. You are reviewing the family portal (`worker/src/portal/`): that one family can never
> see another's, her read-only view refusing every write, the KennelOS family feed (a family
> sent twice, merged, deleted for good and sent again), reminders and emails sent once and
> never to a deleted family, and her portal screens on a phone against
> `docs/reference/portal-prototype.html`. Write `docs/review/findings/11-family-portal.md`,
> add your INDEX row, commit docs only, push.

---

**Session 12 — the owner's admin view**

> Read `Kennelport/docs/review/plan.md` (section 0 and "Session 12") and follow
> it. You are reviewing the owner's tools for building a site (`worker/src/manage/builder.js`,
> `worker/src/manage/builder/`, `worker/src/admin.js`, and the content files they save):
> only the owner reaches them, a save that half-works, a breeder's content after the owner
> changes the build, the new Forms screen and page addresses on the owner's side. Write
> `docs/review/findings/12-admin-view.md`, add your INDEX row, commit docs only, push.

---

**Session 10 — consolidation** (only after the others)

> Read `Kennelport/docs/review/plan.md` (section 0 and "Session 10") and every
> file in `docs/review/findings/`. Produce `docs/review/SUMMARY.md`: de-duplicated findings
> ranked S1 → S4, the repeated themes, a fix order that puts a breeder's photos and a
> family's application first, the collected test gaps, and what no session reached. Do not
> re-review; if a finding looks wrong, check it and say so in one line. Mark each finding
> already known in `docs/review/senior-review-2026-11.md` or `docs/loose-ends.md`. Commit
> docs only, push.

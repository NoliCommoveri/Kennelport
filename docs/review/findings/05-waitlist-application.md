# 05 — The waitlist page, the feed, and the sealed application form

Commit reviewed: `bd59ce3` (session 4's docs on `d54afed`; KennelOS `850e02f`)  ·  Changed since the target
(`8aaf58a`) in this session's files: none (`git diff --stat 8aaf58a..HEAD` touches `bundle.js`, `link.js`,
`publish.js` and the portal, not the feed, forms or template).
Reviewed: `feed.js` (113), `site.js` (266: `cspFor`, `withTurnstile`, the live `/waitlist` path, posting by page),
`siteforms.js` (228), `render/pages.js` `waitlist`/`waitlistHelp`/`familyList`, `render/pages/applicationForm.js`
(102), `render/pages/formParts.js` (106), `content/forms.js` (127), `manage/builder/forms.js`,
`public/_kp/t/ak/site.js` (398, the KennelOS form and `sealToKennelos`); KennelOS `cloud/src/familyPages.js`
(1116: `siteView`, `formView`, `/f/apply`, `/f/verify`, `/f/code`, `turnstileOk`), `cloud/src/lib/cors.js` (84),
`cloud/src/index.js` (the `/f/` routing and its CORS on errors), `cloud/public/family/seal.js`, `apply.js`,
`common.js` (`publicListHtml`), `shared/data/waitlistCrypto.js`, `shared/data/cloud/cloudWaitlist.js` (key rotation)
·  Contract read: plan §3.8, `docs/plans/setup.md` custom domains (A, B, C) and Turnstile, `site-builder.md` "Forms".
KennelOS path check: the plan's "KennelOS's `seal.js`" is `cloud/public/family/seal.js`; what opens it is
`shared/data/waitlistCrypto.js`. The other paths are right.
Verified by: `node --test` KennelPort **455 pass**; KennelOS `node --test` **2080 pass**, `cloud` `npm test`
**365 pass** (after `npm install`). Scratch scripts in my scratchpad (`s5/`): the template's own
`sealToKennelos` opened by KennelOS's `openSealed`; the real Worker behind a Chromium page on a "custom domain"
(127.0.0.2) posting to a stub that runs KennelOS's real `websitePreflight` and `openSealed`; the four routing
states and a POST in each; the owner's forms end to end (post, approve, publish, export); 320 px and 390 px in
Chromium.

| # | Sev | Where | What | Verified? |
|---|-----|-------|------|-----------|
| 1 | S1 | worker/src/render/pages.js:841-878 · KennelOS cloud/public/family/common.js:120-147 | The site's copy of the KennelOS list leaves out every family with a pup selected (the feed's `selected`), and the gap that leaves sets off "not currently eligible for available pups" | verified |
| 2 | S2 | worker/public/_kp/t/ak/site.js:286-295 · KennelOS cloud/src/lib/cors.js:65-83 · docs/plans/setup.md:153-161 | On her own domain before it's in `WEBSITE_ORIGINS`, Send application says "Couldn't reach our waitlist. Check your connection", with no other way to apply, and nobody is told | verified (Chromium) |
| 3 | S2 | docs/plans/setup.md:95-97, 130-161 · worker/src/siteforms.js:38-52 | The setup for her own domain never adds it to KennelPort's own Turnstile widget: on production's custom domain, the contact, review and site application forms may all refuse | suspected (dashboard not visible) |
| 4 | S3 | worker/src/feed.js:89-94 | With KennelOS unreachable and no copy kept, nothing is saved, so every visitor to the waitlist and policies pages waits the full 4 seconds | verified |
| 5 | S3 | worker/src/render/pages.js:888-909 · feed.js:83-87 | When the feed says `not_found` (her list is offline in KennelOS) or `not_shared`, the page sends families to KennelOS's /apply, which says "isn't taking applications online"; the site's own form is never offered | verified |
| 6 | S3 | worker/public/_kp/t/ak/site.js:360 · feed.js:62 · KennelOS familyPages.js:1088 | After she rotates her form key, "reload the page and send it again" fails again on every reload for up to five minutes (the feed copy keeps the old key) | verified (reading) |
| 7 | S3 | worker/src/content/forms.js:85 · manage/builder/forms.js:29, 55 | A required choice question with no choices can be saved ("two at least" is only a hint); the form can then never be sent | verified |
| 8 | S3 | worker/src/content/forms.js:112 | A review's email or phone made required still reads "(optional, for us only)" | verified |
| 9 | S4 | worker/src/site.js:209-211 · siteforms.js:196-201 | While the page shows KennelOS's links (feed not shared, not found or unreachable), a POST to /waitlist is still taken into KennelPort's Inbox, and the page it answers says nothing | verified |

---

## 1. The site's KennelOS list drops the families with a pup selected  (S1, verified)

**Where** KennelPort `render/pages.js:866-878` (`kennelosList` maps `feed.rows` only) and `:851` (the gap note,
from `rows` alone). KennelOS `cloud/public/family/common.js:120-147`: `publicListHtml(rows, …, selected)` merges
`selected` in at their numbers ("✓ #2 … Pup selected"), and works the note out *after*, "so they never set it
off". `siteView` sends `selected` in the feed (`familyPages.js:376-385`).

**Scenario** (script `s5/selected.mjs`) A feed with Megan #1, Tom #3, and Andrea #2 with a pup selected.
KennelOS's own list: `#1 Megan R., #2 Andrea K., #3 Tom B.`, no note. Her website: `#1 Megan R., #3 Tom B.` and
"Note: in special circumstances, some applicant names may not be displayed above. Their place is being held,
but they are not currently eligible for available pups."

**Why it matters** The two lists the plan promises agree (decision 21) don't. A family who has picked a pup
searches for themselves on her site and finds nothing; everyone else is told number 2 isn't eligible. On a
busy litter that's every family that just chose.

**What I'd do** Draw `selected` as KennelOS does (merged, ticked, "Pup selected") and work the gap note out
after; a test holding `familyList` to `publicListHtml` on the same feed.

## 2. Her own domain before `WEBSITE_ORIGINS`: "Check your connection", and no way through  (S2, verified)

**Where** The template's `send` (`site.js:286-290`) turns any fetch failure into status 0; `trouble(0)`
(`:293`) is "Couldn't reach our waitlist. Check your connection and try again." with **no** fallback link (only
other statuses get "You can also apply on our KennelOS page"). KennelOS's `websitePreflight` answers 403 for an
origin not in `WEBSITE_ORIGINS` (`cors.js:77-79`). `docs/plans/setup.md` step C (`:153-161`) is a by-hand deploy
in the other repo, done "if the breeder takes applications online"; once her domain is active,
`theirsite.kennelport.com` 301s to it (`site.js:145-147`), so the form only ever runs there.

**Scenario** (script `s5/browser-origin.mjs`, Chromium, KennelOS's real `cors.js` and `waitlistCrypto.js` in a
stub server)
- Domain listed: the code step shows, and KennelOS opens `{"name":"Andrea Kim","email":"andrea@example.com","yard":"yes"}`. (Sealing and the whole round trip work.)
- Domain not listed: the console has "blocked by CORS policy"; the family reads "Couldn't reach our waitlist.
  Check your connection and try again." Every try says the same. Nothing reaches KennelOS, and nothing reaches
  the breeder or the owner.

The plan's question was whether the page says something useful. It doesn't, and it hides the only way that
would work (KennelOS's own /apply page). Step C is also easy to miss later: a breeder who connects her domain
first and turns on online applications in KennelOS months after has no step that brings the owner back.

**What I'd do** Give status 0 the same fallback link as the rest. Better: KennelPort's `/ops` (or the site's
waitlist screen) flags a site with an active domain whose feed carries a `form`, until the owner ticks that
step C is done.

## 3. KennelPort's own Turnstile on her domain  (S2, suspected)

**Where** `docs/plans/setup.md:95-97`: KennelPort's widget lists `kennelport.com` (and staging). The custom domain
steps (A and B, `:130-151`) add routes and the ops row; only step C mentions Turnstile, and that's **KennelOS's**
widget. `wrangler.toml:97-98` routes `www.akbostonterriers.com`, and `TURNSTILE_SITE_KEY` is set (`:125`), so
production's real site draws KennelPort's widget on its own domain. `siteforms.js:38-52`: no token → "Please wait
for the check box under the form to finish"; a failed check → "The spam check didn't pass."

**Scenario** A family on `www.akbostonterriers.com/contact`. If the widget doesn't list `akbostonterriers.com`,
Turnstile shows its own "domain not authorized" error and never makes a token; the contact form, a review and
(without KennelOS online) an application are all refused, and the breeder gets nothing. I can't see the
dashboard, so this is suspected: the owner checks the widget's hostnames in a minute.

**What I'd do** Add "KennelPort's Turnstile widget → Hostnames: add the domain" to steps A and B (and to
"Removing a domain").

## 4. KennelOS down with no copy: every visitor waits four seconds  (S3, verified)

**Where** `feed.js:89-94`: with no row (a newly set feed, which `setFeed` starts by deleting the copy), an
unreachable answer returns without saving, so the next request fetches again. The one-minute retry
(`FEED_RETRY_MS`) only applies to a kept good copy.

**Scenario** (script `s5/feedwait.mjs`) With KennelOS hanging: kept copy, first visitor 4,004 ms (the copy shows
"Updated November 10, 2026. Our records couldn't be reached just now…", as meant), the next 2 ms. No copy: the
waitlist 4,005 ms, then `/policies` 4,007 ms, and so on for every visitor. Home, Litters and Dogs never read
the feed (0 reads, 4-43 ms).

**What I'd do** Save the failure (`state: 'unreachable'`, `checked_at`) so it, too, is retried once a minute.

## 5. A feed that says "not found" sends families to a closed door  (S3, verified)

**Where** `render/pages.js:905-907`: any feed state but `ok` draws `kennelosLinks`, KennelOS's /apply and /list.
`feed.js:83-87` keeps `not_found` and `not_shared` five minutes. KennelOS's /apply on a missing projection says
"This breeder isn't taking applications online right now. Please contact them directly." (`apply.js:213`).

**Scenario** (script `s5/routing.mjs`) She takes her list offline in KennelOS (runs it by hand again), or her
public id is wrong: her site reads "Our waitlist and application form are on KennelOS" with **Apply to join the
waitlist** going to a page that turns them away. Decision 26's "otherwise, the site's own form" never happens.
The manage app does say "KennelOS has no waitlist …" on the waitlist page screen (`manage/screens/pages.js:34`),
but only there.

For the record, the routing states, each checked: no KennelOS → KennelPort's form; feed without `form` → the
KennelOS list plus KennelPort's form, list's Apply → `#apply`; feed with `form` → KennelOS's form drawn on the
site (sealed, straight to KennelOS), list's Apply → `#apply`; feed can't say → KennelOS's own pages. Every other
Apply/Join button on the site (home hero and band, litter and puppy asks, footer, menu) is a plain `/waitlist`
link (`parts.js:544, 754`, `pages.js:384, 403, 672`, `layout.js:85`), so they all agree with the page by
construction. The plan's fourth state, the frame embed, isn't built (see Notes).

**What I'd do** Treat `not_found` like no KennelOS (the site's form) and keep the KennelOS links for
`unreachable`; `not_shared` is session 1's note.

## 6. After a key rotation, "reload and send it again" keeps failing  (S3, verified by reading)

**Where** KennelOS refuses a stale key with 409 `form_changed` (`familyPages.js:1088`); the template says
"…just updated this form. Please reload the page and send it again" (`site.js:360`). The page's key comes from
KennelPort's feed copy, fresh for five minutes (`feed.js:62`), which a 409 can't reach (the browser talks to
KennelOS directly).

**Scenario** She presses Rotate form key in KennelOS (`cloudWaitlist.js:135-140`). A family sends: 409. They
reload: the same copy, the same key, 409 again, for up to five minutes. Long answers are lost unless they
copied them, as the message asks.

**What I'd do** On `form_changed`, offer the KennelOS page link (fresh key) at once, or say "in a few minutes".

## 7. A required choice with no choices  (S3, verified)

**Where** `content/forms.js:85` keeps `options: []`; the owner's screen says "One a line, two at least"
(`manage/builder/forms.js:29`) but `formsFromForm` (`:55`) saves whatever is there.

**Scenario** (script `s5/forms.mjs`) The owner adds "Which pup?", a choice, ticks Required, leaves the list
empty. The contact page draws `<select … required><option value="">Choose…</option></select>`: a family can't
send the contact form at all (the browser refuses; without its check the server says "Please answer "Which pup?"").

**What I'd do** Refuse to save a choice with fewer than two choices, as the hint says.

## 8. "Email (optional, for us only)" on a required field  (S3, verified)

**Where** `content/forms.js:112` drops a trailing "(optional)" only; the review form's email and phone start as
"… (optional, for us only)" (`:49-50`). `siteforms.js:79` already strips both forms for its messages.

**Scenario** (`s5/forms.mjs`) Required email on the review form: the label reads "Email (optional, for us
only)" with the field `required`.

**What I'd do** Strip "optional, " out of "(optional, for us only)" the same way. The owner's words.

## 9. A POST to /waitlist is taken while the page shows KennelOS's links  (S4, verified)

**Where** `site.js:209-211` sets `kennelos` from `ctx.feed?.feed?.form`; in the can't-say states that's false,
so `receiveApplication` (`siteforms.js:196-201`) takes it into the Inbox. The page drawn back has no
KennelPort form, so no thank-you either.

**Scenario** (`s5/routing.mjs`) `not_shared`, `not_found`, `unreachable`: POST → 200, one application in
KennelPort's Inbox each time. Reached by a family whose page was drawn a minute earlier (feed without a form),
or by a bot past the honeypot. With a KennelOS list in play that's the "two lists" the plan rules out, though
rarely.

**What I'd do** Refuse it, as the `kennelos` case does, whenever the site has a feed set and its state isn't
`ok` without a form.

---

## Notes, not findings

- **Sealing is byte-compatible** (`s5/seal-parity.mjs`). The template's `sealToKennelos`, taken from the shipped
  file between its markers, sealed a 200,000-character answer with "Zoë & Łukasz — 🐶", checkboxes and
  `private_request`; KennelOS's real `openSealed` opened it exactly. Envelope `{v, kid, epk, iv, ct}` on both
  sides, 65-byte uncompressed point, 12-byte IV, HKDF info `kennelos-waitlist/seal/v1`, salt = epk, AAD
  `kennelos-waitlist/v1/<kid>`. After `rotateFormKeys` the old seal still opens; a changed `kid` is refused (AAD).
  The payload (`answers` by question id, `prefs`, `private_request`, `sent_at`) matches KennelOS's own
  `apply.js:134-146, 254`. KennelPort's test (`kennelosform.test.js:197-232`) opens with its own copy of the
  opener, not KennelOS's; my script is the cross-repo check it lacks.
- **CORS answers carry their errors.** KennelOS's top-level catch adds the website CORS headers to a failed
  `/f/apply` (`index.js:107-118`), so 409/400/429 reach the page's own messages. `/f/verify` from a website
  origin returns `{confirmed, signin}` only: no status link, no session (`familyPages.js:1023-1047`); the
  per-IP and per-email limits run before anything else in all three.
- **Sealed size.** `applicationBytes` is 96 KB of sealed text, about 54 KB of plain JSON after the double base64.
  Over it, both KennelOS's page and the site say "Something went wrong". Only a family writing essays reaches it.
- **Turnstile on the KennelOS form** follows the feed: no site key in the feed, no widget, and production
  KennelOS answers 503 `form_unavailable` ("Something went wrong… apply on our KennelOS page", which fails the
  same way). A widget that can't pass leaves "Please wait for the check above the button to finish" for good,
  with no link: the same fix as finding 2.
- **Privacy.** The feed rows carry the masked name, position, wants and dates only (`publicRows`); `feed_cache` keeps
  that. The review's for-the-breeder answers (email, phone, the owner's questions) were kept in
  `stories.answers` and found in **none** of the snapshot, the reviews page, the home page or `exportContent`
  (`s5/forms.mjs`). The full-registration subject is carried as a hidden field when the subject is off (read).
- **Posting by page** (`s5/posts.mjs`, `posts2.mjs`): the contact form's old and new addresses both take a
  message; `/about`, its old address, a dog page and an unknown path are 405; a review to the Reviews page
  switched off is 404 (its old address 405). The contact page can't be switched off.
- **320 px:** the waitlist (KennelOS list with long names and program icons, its form, the FAQ), the help page,
  contact and reviews all fit (scrollWidth 320, nothing past the edge), at 390 px too.
- **Doc drift** in plan §3.8 that a future session would trip on: "every Apply button opens KennelOS's own
  application page" (the form is drawn on the site now, decision 21), "with the frame embed instead…" and
  "KennelPort's Content Security Policy allows frames from the KennelOS family-page host" (`FRAME_ORIGINS` has no
  KennelOS host, `embeds.js:109`; the embed was never built).
- A stale page meeting a changed published form (a field added or made required since): the error names the
  field and the form comes back with it and their answers. A review's photo isn't kept through such an error;
  they choose it again.

## Coverage gaps I found (tests that should exist)

- The website list and KennelOS's `publicListHtml` on one feed with `selected` and gaps.
- A cross-repo seal test: KennelPort's shipped `sealToKennelos` opened by KennelOS's `openSealed`.
- `readFeed` unreachable with no copy: the second read within a minute doesn't fetch.
- The template's messages for status 0 and for a Turnstile that never finishes offer the KennelOS link.
- `formsFromForm` refusing a choice with fewer than two choices.

## What I did not get to

- Question 7 (the manage app's steering: greyed Your waitlist, Inbox without Add to waitlist): session 6's too.
- Question 9 (`waitlistProjection.js` against the site's Litters, `isPupAvailable`) beyond confirming the site
  doesn't draw the feed's Available Puppies at all.
- The 90-day cleanup of messages and fulfilled entries (`cleanup.js`), and `manage/screens/inbox.js`.
- Two KennelOS devices each making a first form key (`ensureFormKey` runs per device): session 9's ground.

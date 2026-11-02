# KennelPort build log

History of the plan and, later, the build. Newest last. The plan itself
([`KennelPort_Plan.md`](KennelPort_Plan.md)) describes only the current intent.

## 2026-10-09: first draft and decisions

- High-level plan written: one Worker for every site, subdomains of `kennelport.com`
  (briefly `kennelport.app`), structured content, KennelOS pushes an allow-listed bundle.
- Decided: domain `kennelport.com`; in-app **Request a website** is KennelOS Pro only,
  with a public form for everyone else; KennelPort has its own sign-in; KennelOS
  publishes only on **Update website**; KennelOS never sends prices; embeds from an
  approved provider list; not for sale yet (first site is for family); closing a site
  deletes everything and leaves a "no longer hosting" notice.

## 2026-11-01: checked against KennelOS

KennelOS features built since the draft, and where the plan took them in:

| KennelOS feature | Plan |
|---|---|
| Litter prices (per sex, deposit, full-registration surcharge) shown on families' turns | 3.2; decision 6 reopened |
| Extras price list; families request extras on their status page; `extras_info_url` | 3.4 |
| Pickup places and transport settings (fee per mile, free miles, own-meetup distance, "be in touch" distance) | 3.5 |
| Puppy plan (`disposition`) and waitlist picks holding a pup | 3.6 |
| Parents' health tests on family pages (`parent_tests`, Normal / Abnormal), certificates in the vault | 3.7 |
| Show titles from logged results | 3 (Our dogs), 3.7 |
| Coming up switches (planned heats, pairings, early litters) | 3.7 |
| Waitlist form and public list embeddable on the breeder's own site | 3.8 |
| Application FAQ | 3 (Optional pages) |
| Several own kennels | 5.5 |
| Live sync across devices | 5.5; decision 11 |
| Kels guided tasks | 5.5 |

Also added: the parity rule (every feature works without KennelOS first), sections 3.4–3.8
rewritten as "on its own" then "with KennelOS", sections 3.9–3.10 (standard breeder-site
features and the inquiry form), and custom domains with guided, self-checking DNS steps.

## 2026-11-01: review fixes

- **Scope:** version 1 is now the first family site only (section 8.1): renderer and ops,
  breeder login, and the pages in decision 14. Requests, guided custom domains, the
  KennelOS link, albums and embeds and the rest of section 3.9 moved to a backlog.
  Custom domains for version 1 are connected by hand. Per-plan limits became per-site
  limits set in ops; the cost table shows the first site and 15 breeders.
- **Publish model:** replaced per-row `draft_json` / `published_json` with snapshots: the
  tables are the draft, Publish writes one snapshot of the whole site, the renderer reads
  only that, the last 10 are kept for **Undo publish**, and redirects are worked out at
  publish time (section 4.1, new `snapshots` table).
- **KennelOS bundles:** rules written down for matching, updating, new and missing
  records, and first-link matching by name with confirmation (section 5.3, decision 16).
- **Scripts vs the Content Security Policy:** Turnstile needs an outside script, so the
  form starts with a honeypot, timing check and rate limits, with Turnstile only on form
  pages if needed (decision 17). Visitor stats are counted by the Worker instead of
  Cloudflare Web Analytics' script.
- **Embed previews:** thumbnails fetched once at save time and stored in R2 for YouTube,
  Vimeo and TikTok; placeholders for Facebook, Instagram, maps and forms (their oEmbed
  needs an app token).
- **Closing a site:** the "no copy kept" promise now names D1 Time Travel's 30-day window
  and emails already sent.
- **Photos and files:** the server re-checks uploads (WebP only, size limits, no `EXIF`
  or `XMP` chunks); the renderer serves only files the published snapshot lists as public,
  so certificates stay private whatever their R2 key (section 4.2).
- **Waitlist embed:** corrected: KennelOS's `embed_origins` is optional (empty allows any
  site); **Connect website** adds the site only when the breeder has listed sites.
- **Decision 6** stays open; sections 3.2, 5.1 and 5.3 now say the same thing about it.
- Decisions grouped as Decided / Open without dates; history moved here from the plan's
  old section 11. The breeder is "they" throughout instead of "she".

## 2026-11-01: site directory from a survey of breeder websites

- Read the menus of 28 breeder websites and six inner pages directly, plus about 25 more
  sites through search results. Wrote `KennelPort_Site_Directory.md`: how common each page
  type is, and a page-by-page directory of what real sites show, what KennelOS can fill
  and what only the breeder can write.
- Proposed, not yet in the plan: How it works, Programs (guardian homes), How we raise
  puppies, Retired, In memory, Older puppies, Show results, Litter diary, Reviews and How to
  pay safely pages; planned litters from KennelOS pairings with their status; picks taken
  and open per sex as counts; a Family login link to KennelOS's status page.

## 2026-11-01: survey pages added to the plan

- New plan section 3.11 (how it works, programs, how we raise puppies, how to pay safely,
  retired and in-memory dogs, older puppies, show results, litter diary, planned-litter
  status and picks, family login link), each on its own and with KennelOS. Reviews and
  families' stories split into `/reviews` and `/stories`. Paths in 3.1; `programs`,
  `diary_entries` and `steps` tables and a `kind` on `stories`; KennelOS-owned fields in
  5.3; a backlog row; decisions 18–20 (picks, diary from KennelOS, family login).

## 2026-11-01: visual survey of breeder websites

- Captured 28 home pages and 8 inner pages in Chromium at desktop and phone widths (26
  rendered; two sit behind bot checks) and wrote `KennelPort_Visual_Survey.md`: five
  recognisable looks, element by element (hero, navigation, dog grids, four ways of
  showing puppies, planned-litter cards, trust badges, testimonials, footers), colour,
  type, borders, spacing, phones, photos, what's present and absent, and a comparison
  with the Cotton Paws example mock-up. Observations only, no styling decisions.

## 2026-11-01: visual survey, inner pages

- Captured 39 inner pages from 18 sites at desktop and phone widths and added section 10
  to `KennelPort_Visual_Survey.md`: dog listings (five layouts), litters and available
  puppies, reviews (seven forms), about pages, how-it-works, FAQ and policy pages, and
  what they add (individual dog pages are rare, facts trapped in images, stale dates,
  more privacy slips).

## 2026-11-02: design direction

- Recorded the owner's six design preferences (flip cards, professional square-cornered
  layouts without pills or raw links, sliding sets, nested menus with selects and
  expanders, background ornaments, complementary font pairings) in
  `KennelPort_Design_Direction.md`, each worked through against the plan's rules (no
  outside scripts, works without JavaScript, phones, accessibility, reduced motion), with
  a proposed menu grouping and four open questions. Linked from plan section 3.

## 2026-11-02: the only rule is no cost

- The owner set one constraint for design and technology: it costs nothing. Removed the
  self-imposed rules from `KennelPort_Design_Direction.md` (no outside scripts, no
  JavaScript dependence, self-hosted fonts only, link-cue and motion requirements). In the
  plan: the Content Security Policy now lists whichever free services the template uses
  (section 3.3); Turnstile on the inquiry form from the start (3.10, decision 17); a free
  Google reviews widget allowed; Cloudflare Web Analytics allowed for visitor stats.
  Breeders still never add code, and the privacy rules are unchanged.

## 2026-11-02: JavaScript for design

- The owner confirmed JavaScript may be used to expand what the design can do. Added it
  to `KennelPort_Design_Direction.md` as the main tool, with free libraries for each
  preference (GSAP with ScrollTrigger, Swiper, PhotoSwipe, Lottie).

## 2026-11-02: design decisions

- Flip cards: registered and call name on the front (under or over the photo); the back
  repeats the names with health tests and bio over a copy of the photo faded to about 10%.
- Buttons are rectangles, not pills.
- Top menu: About us · Kennel residents · Puppies · How it works · Waitlist, with the
  plan's pages nested under them; labels are defaults over the fixed addresses.

## 2026-11-02: the AK sample becomes the target

- Built a working one-page sample of the first site, AK Boston Terriers, from the Cotton
  Paws layout and the design decisions: all five menu groups, flip cards, sliding sets,
  expanders, botanical ornaments, the kennel's extended-homegoing packages on Extras, and
  a sample KennelOS public waitlist drawn in the site's style. The owner approved it as the
  end goal. Source saved as `docs/reference/ak-sample.html` (photos left out of the public
  repo).
- Plan: the sample is version 1's target (top, 8.1 phase 3; decision 14 decided as the
  sample's pages, with past litters and news moved to the backlog). New sections 3.12
  (what a breeder can change: page and Home-block switches, menu labels, any-length steps,
  expanders and extras, reworded labels; layouts fixed; decision 24) and 3.13 (colour
  schemes with light and dark versions). Extended homegoing packages added to 3.4 and
  price ranges to 3.2. Proposed drawing the KennelOS waitlist in the site's style from
  KennelOS's public list (3.8). Data model: `site_pages`, `home_blocks`, `expanders`,
  `extras`, `steps.detail`, `sites.scheme` and `dark_mode`. New phase 4 (customisation and
  schemes). Open: decisions 21–23 and 25.
- Design direction: section 7, six proposed schemes (Lawn, Harbor, Heather, Clay, Slate,
  Midnight); the sample needed no JavaScript library.

## 2026-11-02: colour schemes decided

- Built a scheme lab: the AK sample with a switcher for the six proposed schemes and
  Auto / Light / Dark (`docs/reference/scheme-lab.html`). The owner kept all six:
  decision 25 decided (Lawn, Harbor, Heather, Clay, Slate, Midnight, each light and dark;
  Midnight dark first). Contrast checks still due before they ship.

## 2026-11-02: waitlist, accent colour and dark mode decided

- Decision 21: the site draws the KennelOS waitlist in its own style from the public list,
  with sign-in and applications on KennelOS's pages; the KennelOS change it needs (an
  allow switch, the `public_id` shown, rate limits for KennelPort's cached reads) added
  to 5.5. Decision 22: no custom accent colour in version 1. Decision 23: sites follow the
  visitor's dark or light setting, with a **Light only** switch.
- Fixed the AK sample and scheme lab running off the right on phones 360px and narrower:
  the waitlist box and litter cards could grow past the screen. The waitlist table now
  stacks on phones (number, name with wants underneath, ⓘ); every page fits 320px.

## 2026-11-02: how to pay, on the site

- Plan 3.9: a **How to pay** section for the application fee and the deposit (methods,
  details, note to include, when due, optional Pay button), shown openly on the waitlist
  page, the matching How it works steps and How to pay safely, each with its own
  **Show on website** switch, off by default. Amounts still follow the prices rule. With
  KennelOS linked it fills from the waitlist payment instructions and the fee account's
  pay link. Added to version 1 (8.1) and the data model (`payment_info`).

## 2026-11-02: How to pay in the sample

- Added a How to pay box to the AK sample's waitlist page (application fee and deposit:
  when due, methods with copy buttons, the note to include, a Pay button, and the
  only-real-details line), linked from How it works steps 2 and 4 and the footer. Payment
  details are made up.

## 2026-11-02: status-page help

- Plan 3.8: a **Using your status page** page (`/waitlist/help`), opened from a button in
  the Current Applicants box: breeder-written expanders on getting a code, signing in,
  choosing or passing, asking for changes, messages and pickup times, leaving the list.
  Starts as a draft outline from what KennelOS's status page does. Added to the sample
  (`#applicant-help`) with draft text; the breeder will write the real wording.

## 2026-11-02: KennelOS website feed built

- KennelOS now serves the waitlist feed for decision 21: `website_feed` switch, off by
  default, and `GET /f/site/<public_id>` (the public list plus page links, 404
  `not_shared` when off). Plan 3.8 and 5.5 updated to the real endpoint.

## 2026-11-02: open decisions worked through; the manage app as a phone app

- Decided: 6 (a **Use my KennelOS prices** switch, off by default), 11 (each device links
  once), 12 (inquiries go to the manage app's inbox only, never emailed, kept 90 days;
  the breeder replies from their own email; Resend now only sends sign-in codes and
  invites), 13 (families submit reviews on the site, the breeder approves each; photos
  private until approved), 15 (`www.` for custom domains), 16 (as proposed, with matching
  offered whenever a new KennelOS record matches an unlinked website one), 17 (Turnstile
  from the start, on the inquiry and review forms), 18 (pick counts never shown),
  19 (diary drafts, opt-in per litter), 20 (Family login footer link). Deferred: 9 (site
  rules, before any outside breeder). Still open: 10, with a found mismatch: KennelOS's
  waitlist offers Undecided puppies, which the site would call Coming soon.
- Section 4: the stack table (website, manage app, the manage app installed on a phone as
  **KennelPort Site Manager**), online-only saving, and preview before publishing: a
  Preview on every edit screen, Preview site, and a list of changes under Publish.
- Sample: litter cards no longer show open picks; footer gains Family login.

## 2026-11-02: review form in the sample

- Added **Share your review** to the AK sample's reviews (About us menu too): first name,
  town, which puppy, star rating, review, optional photo with a preview, and the required
  permission box; the confirmation says it waits for approval (decision 13). Also fixed
  the application and review forms' drop-downs running past 320px-wide screens.
- Review form: "Your AK puppy" drop-down replaced by the puppy's name and the month they
  brought it home, both typed (plan 3.9 and `stories` updated).

## 2026-11-02: KennelOS link and albums move into version 1

- The owner: the KennelOS link is why the first breeder wants the site, and albums and
  embeds are wanted too. Version 1 gains phase 4 (the KennelOS link: both sides, matching,
  the bundle, Use my KennelOS prices, Family login) and phase 5 (albums, embeds, sharing);
  customisation and schemes become phase 6. Both items left the backlog; decision 14 and
  the plan's opening updated.

## 2026-11-02: plan review; backlog to its own doc; push notifications

- The owner reviewed the plan and kept the multi-user setup in version 1 (they mean to
  iterate quickly).
- Backlog moved to `KennelPort_Backlog.md`: its order, requests, guided custom domains,
  the pickup page, the rest of 3.9, the survey pages not in version 1, and their tables.
  The plan keeps their addresses (3.1) and KennelOS fields (5.3) and points to the doc.
- Decision 12 widened: new inquiries also send a push notification to each device that
  turns them on, following KennelOS cloud's payload-free web push (`cloud/src/notify.js`);
  the first name only, no message text through the push services. Phase 2 gains it;
  `push_subscriptions` and `notices` added.
- Contradictions fixed: 3.8 no longer says applications are emailed; breeders are never
  emailed later (only the email hash is kept), so domain notices reach them in the manage
  app and by push, and you by email; the waitlist feed's last copy is stored
  (`feed_cache`); the safe-payment notice ships in version 1 and the How to pay safely page
  is backlog; a litter's **Show prices** covers that litter, and a site-wide **Show other
  prices** covers extras and other prices; preview builds a throwaway snapshot from the
  draft so the renderer still reads only snapshots.

## 2026-11-02: applications go to KennelOS when it takes them (decision 26)

- The owner: when the breeder takes applications online in KennelOS, every Apply on the
  site opens KennelOS's application page and the application goes through KennelOS's live
  list flow; it arrives in KennelPort's Inbox only for breeders running their list by
  hand. Worked out from the website feed's `apply` link, not a setting; the former
  **Send to my KennelOS waitlist** choice is gone. Plan 3.8, 3.10 and decision 26.
- Clarified (the previous change reverted): a connected KennelOS waitlist with its online
  form off shows KennelPort's own application form, since the feed carries no `apply`
  link; the **Waitlist open / closed** switch is how a breeder stops applications.

## 2026-11-02: technical risks from the review

- Photos (4.2): JPEG whenever the browser can't make WebP (iPhone Safari), the server
  accepts both and rejects EXIF/XMP in either; phase 2 tested on real phones.
- Snapshots (4.1) move to R2, with only their key in D1, since D1 caps a row at about
  2 MB; rendered pages cached by snapshot id.
- Download a copy (4.3) is a zip built in the browser, not the Worker.
- New 4.4: the free plan's CPU limit, how the plan stays within it, and a phase 1
  measurement with Workers Paid as the fallback.
- Fonts and libraries (3.3, and the design direction) are served from the site, never from
  Google Fonts or a CDN, so visitors aren't tracked; only Turnstile loads from outside.
- Risks table: rows for each.

## 2026-11-02: phase 0 coded

- `worker/`: one Worker routing by hostname (`src/hosts.js`: home, manage, api, the
  custom-domain fallback, reserved names, sites; two-level names and other domains get a
  404 for now), D1 and R2 bindings, staging (workers.dev) and production
  (`*.kennelport.com/*` and `kennelport.com/*` routes) in `wrangler.toml`.
- `/ops` on the manage host: OPS_TOKEN sign-in, setup checks (D1 query, R2 write/read/
  delete, root domain), migration status and Apply pending. Migration runner, gate, SQL
  splitter and crypto helpers copied from KennelOS cloud; `0001` holds only `sites`.
- Site hosts look up `sites`: unknown 404, closed 410 with the closed notice, otherwise a
  placeholder until phase 1; everything reading D1 answers 503 until migrated.
- Staging can't receive real hostnames, so `ALLOW_HOST_OVERRIDE` (staging only) lets a
  `/__host` cookie stand in; plan 2.3 says so.
- `docs/KennelPort_Setup.md`: the one-time dashboard steps (domain, proxied apex and
  wildcard records, D1 and R2, two Workers Builds connections, OPS_TOKEN, checks).
- 14 tests (`node --test`); both configs pass `wrangler deploy --dry-run`; checked live
  under `wrangler dev`.

## 2026-11-02: phase 0 live on staging

- Staging deployed at `kennelport-staging.kennelport.workers.dev` in KennelPort's own
  Cloudflare account; `/ops` setup checks (D1, R2, root domain) all OK and `0001` applied.
  Production waits for the domain.

## 2026-11-02: phase 1 built (but custom domains)

- `0002_content.sql`: dogs, health results, litters, puppies, reviews (`stories`),
  steps, expanders, extras, home blocks, page settings, photos, snapshots, redirects, and
  the kennel's own details on `sites` (with `show_other_prices`).
- The content model (`src/content/model.js`) lists every field and its limits; content
  goes in and out of `/ops` as one JSON document, checked whole before one batch write,
  matched by slug so ids survive. The AK sample is that document (`akSample.js`).
- Publish builds the visible site (ticked health results only, no hidden records,
  approved reviews, only used photos), writes it to R2, then points the site at it;
  keeps 10; undo steps back; renamed slugs redirect, chains collapsed.
- The "ak" template: the AK sample's CSS and behaviour as server-rendered pages on the
  plan's addresses, fonts served from the site, no inline styles (strict CSP), OG tags,
  LocalBusiness data, sitemap and robots, a generated privacy page. The waitlist page is
  a placeholder until phase 3.
- Preview links (7 days, signed) set a cookie on the site's own host and render the draft
  with a preview bar; pages are cached by snapshot, path and day.
- `/ops`: sites list and create, content import/export, load the AK sample, photo upload
  (resized in the browser, WebP or JPEG; the server checks type, size and camera data),
  preview, publish, undo, suspend, close (everything deleted, 410 notice, name held) and
  release.
- CPU check (plan 4.4): well under 1 ms per step on five years of AK content; the free
  plan is enough. 35 tests.

## 2026-11-02: phase 2, batch 1: sign-in and the manage app's shell

- `0003_accounts.sql`: site_users, login_codes, sessions, rate_limits, dev_outbox.
  Addresses, codes and tokens kept only as hashes, as in KennelOS cloud.
- Sign-in by emailed code (10 minutes, 5 tries, 5 codes an hour per address, 30 per IP);
  a code goes only to an invited address, with the same answer either way. Sessions are
  a 90-day sliding cookie on the manage host; every manage POST must come from that
  origin.
- `/ops`: setup checks for EMAIL_HMAC_KEY and email; People on each site (invite owner
  or editor, remove); the staging outbox. Invites name the manage app's address.
- The manage app: sign-in and code screens, site picker, the site's home (status, view
  and preview), installable (manifest, icons, service worker: screens open offline,
  nothing saves offline; a failed save keeps the form). Editing tiles say "next update".
- 44 tests.

## 2026-11-02: phase 2, batch 2: editing in the manage app

- Editing screens for the kennel details, every page's switch and wording, Home block by
  block, dogs with their health results, litters with their puppies, reviews, How it
  works steps, policies, FAQ, the status-page help, and extras: add, edit, remove,
  reorder. Forms come from the content model, with the breeder's wording in
  `manage/forms.js`; a form with a problem comes back with what was typed and the reason.
- Puppies: one screen with every current puppy's status, set in one tap.
- Photos: upload from the camera roll (the same resizing and checks), describe, remove;
  photo pickers on every form that takes one.
- Publish: the list of changes since the live version ("Opal: Reserved", "Willow: photo
  added", "FAQ page: switched off"), each with a preview link that opens at that page,
  then Publish or Undo.
- New records start with Show on my website ticked. Records of another site or parent
  are out of reach. 54 tests.

## 2026-11-02: the Site Manager icon

- The owner's KennelPort Manager artwork is the app's icon: outer border removed so
  phones can round it, cut to 64, 180, 192 and 512 pixels plus a maskable 512 with the
  art in the middle 80%. The manifest's colours match it (teal #034655, cream #FCF4E9),
  and the app's header shows it. Source in `docs/reference/kennelport-manager-icon.png`.

## 2026-11-02: phase 2, batch 3: messages, reviews and push

- `0004_messages.sql`: inquiries, push_subscriptions, notify_items.
- The site's contact form (on Contact) and Share your review (on Reviews, which now shows
  even before the first review). Turnstile when set up, a honeypot, 5 an hour per visitor
  and 100 a day per site; another origin is refused; a problem keeps what was typed. A
  review's photo is resized in the visitor's browser, checked on the server and private
  until a published review uses it.
- The manage app's Inbox (unread counts on Home, Reply opens the breeder's email, Copy
  email, mark unread, delete; never emailed, deleted after 90 days by the daily cron) and
  Reviews to approve (approve, then publish; decline deletes it and its photo).
- Push notifications as in KennelOS cloud: payload-free VAPID pushes, the service worker
  asks what to show with the subscription's secret, first name only ("New message from
  Megan"), silent once signed out, gone subscriptions deleted. /notifications turns each
  device on or off and sends a test; iPhones are told to install first. /ops makes the
  key and checks push and Turnstile.
- Closing a site now also deletes its messages, notification records and people.
- Fix: the template's inputs without a type (names, phone) had no styling.
- 65 tests.

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

## 2026-11-02: phase 2, batch 4: download a copy, Delete my site, limits

- Your site (manage app): storage used; Download a copy, a zip of content.json (loadable
  back), messages.json, photos.json and every photo at full size, built in the browser
  (`/_kp/m/zip.js`, stored entries with CRC-32); Delete my site for owners, typing the
  subdomain, from a sign-in in the last 15 minutes, deleting everything as closing from
  /ops does.
- Storage and photo limits set per site in /ops, enforced on upload, shown on Photos and
  Your site (with a warning past 90%).
- 71 tests, including a zip opened by Python's zipfile; the download checked in a browser.

## 2026-11-02: decision 10, Undecided puppies

- Decided: an Undecided puppy is not for sale anywhere. KennelOS's waitlist won't offer
  it and Companion shares won't show it for sale; the site shows it as Coming soon, with
  no price and no Ask about this puppy (already how the renderer treats Coming soon).
- Plan 3.6 and 5.5: the KennelOS changes this needs (`isPupAvailable` holds Undecided
  back like Keeping; Companion's export leaves it out of what's for sale), before phase 4.
  No decisions left open for version 1 except 9 (site rules).

## 2026-11-02: photos tagged with what they're of

- `0005_photo_tags.sql`: a photo can be of a dog, a litter, a puppy, an extra, the Home
  page or Our story (several at once). For the breeder only; never published, and
  tagging doesn't change the draft.
- Every photo picker (dogs, puppies, extras, Home blocks, Our story) has an **Add
  photos** button: photos are resized and uploaded in place, tagged with what's being
  edited, and the newest is chosen, with nothing typed in the form lost. The picker shows
  that record's photos first (a puppy's, then its litter's) and folds the rest under
  **Other photos**. Saving tags whatever was chosen, so older photos get sorted as
  they're used. A litter's screen has **Photos of this litter**.
- Photos screen: filters (All, Not sorted, each dog, litter, puppy, extra, page with
  photos), each photo's tags with × to take one off, **Photo of…** to add one, and
  **Photos of** when uploading. Removing a dog or litter removes its tags; closing a
  site removes them all; the download's photos.json says what each photo is of.
- `photos.js` now loads on every manage page, versioned with the app (`manage/version.js`,
  service worker cache bumped to 6).
- Fix: the web-address field's pattern was an invalid regular expression in current
  browsers, so it was ignored.
- 79 tests; the dog screen's Add photos and Save driven in Chromium at phone width.

## 2026-11-02: real phones, and where phase 3 stands

- Photo upload tried on a real Android phone: it worked. A real iPhone is still to do
  (none to hand), so phase 2 stays open on that one item.
- Plan 8.1: what's left of phase 3, since most of it came with phases 1 and 2 (how to
  pay, the safe-payment notice, the application form for a list run by hand, the
  waitlist page), and that the waitlist page in the site's style needs KennelOS's
  website feed first. Plan status line and README brought up to date.

## 2026-11-02: phase 3, How to pay and the safe-payment notice

- `0006_payment.sql`: payment_info, one row per kind (application fee, deposit, the
  notice), its wording as JSON checked by the content model (`PAYMENT_FIELDS`,
  `SAFE_NOTICE_FIELDS`); in the content document as `payment`, so it exports, imports
  and goes with Download a copy.
- Manage app: **How to pay** (a tile on Home) with the fee, the deposit and the notice.
  Each card: Show on my website (off until turned on, and only with a way to pay or a
  payment page), heading, when it's due, up to six ways to pay as way and details,
  what to write in the note, an optional payment-page button. The notice: on by
  default, its wording or a default about gift cards, wire transfers and other accounts.
- Site: the waitlist page's How to pay section, as in the AK sample (cards side by side,
  stacked on a phone, Copy buttons for an email, @handle or phone number, "These are our
  only payment details" with the notice). How it works steps ticked How to pay link to
  it, and so does the footer. Puppy pages carry the notice: "We take payment only by
  Venmo or Zelle, to the details under How to pay." Links to it only while the waitlist
  page is on. The change list names each: "How to pay, deposit: shown", "Safe-payment
  notice: switched off".
- Nothing in the AK sample content: its payment details are made up, so a site loading
  the sample starts with the cards empty and off.
- 87 tests; the waitlist and puppy pages and the manage screen checked in Chromium at
  phone width.

## 2026-11-02: production database

- `kennelport.com` bought. Production's D1 database (`kennelport`) created and its id
  set in `wrangler.toml`, so the production Worker can be connected (setup step 4).

## 2026-11-02: production Turnstile key

- Production's `TURNSTILE_SITE_KEY` in `wrangler.toml` (`[env.production.vars]`): a
  deploy replaces plain variables with the file's, so a dashboard copy would be lost.
  Setup step 5 now says so. Staging has no Turnstile key yet and relies on the honeypot
  and rate limits.

## 2026-11-02: the first real iPhone upload

- On a real iPhone (Chrome, which on iOS is WebKit like every iPhone browser) every
  upload was refused: "still carries its camera data". WebKit can't make WebP, so the
  JPEG fallback ran, and Apple's JPEG encoder adds an APP1 EXIF block (size and colour;
  no location, the canvas holds only pixels). The browser now drops APP1 segments
  before uploading, in the manage app and the site's review form (`stripJpegMeta`, the
  same in both; `tests/jpegmeta.test.js` runs both copies against the server's check).
  The server still refuses any APP1.
- Manage app version 7 (service worker cache bumped) and template assets version 5, so
  phones pick up the fix.
- 90 tests. To try again on the iPhone once deployed.

## 2026-11-02: one version number each, and a test for a missing bump

- The manage app's service worker gets its version from `APP_VERSION`
  (`src/manage/version.js`) as the Worker serves `/sw.js`, so that's the only number to
  change; `zip.js` is now asked for with `?v=` too. The template's `ASSET_VERSION` moved
  to `src/render/version.js`.
- Each version sits beside a fingerprint of its files (`scripts/fingerprint.mjs`).
  `tests/versions.test.js` fails when files under `public/_kp/m/` or `public/_kp/t/`
  change and the version doesn't, and says how to bump.
- `CLAUDE.md` (new, repo root): ask the owner before every bump; a failing versions
  test is the cue to ask, not to bump.
- 93 tests.

## 2026-11-02: iPhone upload works

- Tried again on the real iPhone with the EXIF fix deployed: the photo uploaded. Phase 2
  is done. Plan status, 4.2, the risks table and README brought up to date.

## 2026-11-02: phase 3, the application form

- For breeders who run their list by hand (plan 3.8, 3.10; decision 26). `0007_application.sql`:
  `form_fields` (the breeder's questions, in order) and `inquiries.answers`.
  The questions are content (`QUESTION_FIELDS`, `questions` in the content document), so
  they go through the draft and publish, and with Download a copy.
- Site: `/waitlist` now has the application form in place of "will be shown here soon":
  name and email always, then the questions (short answer, longer answer, a choice, yes
  or no, which litter, phone, town), short ones two to a row as in the AK sample. With no
  questions it asks for a few lines about the family. Answers are checked against the
  published questions (a choice from its list, a litter from the planned and current
  ones). Turnstile, the honeypot and the limits as on the contact form.
- Waitlist page settings: **Waitlist closed** with its message (the form is replaced and
  applications refused), the form's heading and the line under it.
- Manage app: **Waitlist and application** tile on Home; **Application questions** list
  (add, edit, reorder) linked from the waitlist page. An application arrives in the
  Inbox as "Puppy application", with a push like any message; opened, it shows each
  question and answer, and Reply's subject says it's about their application. The change
  list names questions added or edited.
- The AK sample's questions are the ones on its form (sex, color, timing, what for,
  about your home).
- 102 tests; the form checked in Chromium at phone and desktop widths.

## 2026-11-02: the KennelOS website feed, and KennelOS's application form in the site's style

- Plan 3.8: a new part, **The KennelOS application form in the site's own style**, with
  what KennelOS provides (5.5). Plan 8.1 no longer says the feed is still to be built in
  KennelOS: it was (`GET /f/site/<public_id>`).
- `0008_feed.sql`: `feed_cache`. `src/feed.js` reads the feed from `KENNELOS_ORIGIN`
  (wrangler.toml, staging and production), keeps it five minutes, shows the last copy
  when KennelOS can't be reached and asks again after a minute; `not_shared` and unknown
  kennels are remembered as such.
- Manage app: **Your KennelOS waitlist** on the waitlist page's screen: paste the feed
  address (or the list or apply address), see whether it's connected and where
  applications go, or remove it (which forgets the copy).
- Site: `/waitlist` with a feed isn't cached with the snapshot. While KennelOS takes
  applications online it draws KennelOS's form (her questions of every kind, the FAQ, the
  matching notice, the public-list notice) instead of the site's own; `site.js` seals the
  answers to her form key in the browser (`sealToKennelos`, as KennelOS's `seal.js`) and
  sends them straight to KennelOS, then the emailed code; "Open my status page" opens
  KennelOS's page in a new tab. Nothing reaches KennelPort: a post to `/waitlist` is
  refused. Without scripts the form stays hidden and the KennelOS application page is
  linked. Its Content Security Policy allows the KennelOS host (and Turnstile) on that
  page only. Feed off or unreachable: links to the KennelOS apply and list pages; feed on
  with online applications off: the site's own form (decision 26).
- KennelOS (its own repo, same branch name): the feed carries `form`; `/f/apply`,
  `/f/verify` and `/f/code` answer KennelPort sites cross-origin. Setup there: add
  `kennelport.com` to KennelOS's Turnstile widget.
- 109 tests (sealing checked by opening it as KennelOS does); the whole flow driven in
  Chromium at phone width against a stand-in KennelOS: answers sealed, opened with her
  key, the code step, a wrong code, a new code, the status link.

## 2026-11-02: no status link for the website

- Privacy: confirming a KennelOS application from the site's form no longer hands the
  site the family's status-page link or a KennelOS session. KennelOS's `/f/verify`, asked
  from a KennelPort site, confirms the application and returns only `confirmed`; the last
  step's **See my details** opens KennelOS's own sign-in. Plan 3.8 updated. Tests and the
  Chromium run updated.

## 2026-11-02: version bumps

- Manage app version 8 (the Inbox's application answers, `app.css`) and template assets
  version 6 (the application form's hints, KennelOS's form and its script: `site.css`,
  `site.js`), with their fingerprints. 109 tests.

## 2026-11-02: phase 3, the KennelOS list in the site's style

- The waitlist page draws the KennelOS list from the feed (plan 3.8, decision 21), above
  the application form, with KennelOS's own words (its `common.js` is the model): the
  heading, Updated date (with a note when it's the last copy kept), her intro, the
  rows (position, listed name, "Currently deciding", wants, Skipped until, the date
  added behind an ⓘ that opens on tap), the gap note, Available Puppies (parents, their
  registered names, pedigree and health tests under About the parents, dates, pups by
  sex with photo links) and Coming up. Current Applicants opens KennelOS's sign-in.
- Search by name or number (ignoring case and accents), shown only with the script.
  On a phone each row stacks and nothing scrolls sideways.
- Phase 3 is built. 111 tests; the list checked in Chromium at phone and desktop widths
  (search, the ⓘ, no sideways scroll).

## 2026-11-02: the list shows only the families

- At the owner's word: the KennelOS list on a KennelPort site no longer draws Current
  Applicants (the sign-in box), Available Puppies or Coming up. The site has its own
  puppy pages, and the status-page sign-in belongs elsewhere. The list keeps its header,
  search, rows and gap note, above the application form. Plan 3.8 updated.

## 2026-11-02: Family login, and template version 7

- At the owner's word, the status-page sign-in moved off the waitlist list to
  **Family login**: in the top menu beside the Waitlist button, in the footer's Buying a
  puppy column, and as **Sign in to see your details** on the status-page help page. Each
  opens KennelOS's sign-in in a new tab. The snapshot carries it (`site.family_login`,
  from `KENNELOS_ORIGIN` and the kennel id); saving or removing the feed address marks
  the draft changed, and the change list says "Family login link: added" or "removed".
  The plan's phase 4 Family login footer link is done here.
- Template assets version 7 (the list, Family login, the help page's buttons), with its
  fingerprint.

## 2026-11-02: the simple waitlist

- Decided with the owner: an optional waitlist kept by hand for breeders without KennelOS
  (plan 3.8, replacing "KennelPort is not a waitlist"). Shown publicly as first name and
  last initial; hidden while a KennelOS feed is set; families added from an application
  or by hand; a short "wants" line she types.
- `0009_waitlist.sql`: `waitlist_entries`. `src/waitlist.js`: add, edit, move, fulfil,
  put back, delete; places come from the order, so fulfilling moves everyone up.
- Manage app: **Your waitlist** (tile with the count waiting): each family with **Offer
  pups** (a mailto filled with the waitlist page's Offer pups wording or the default, a
  link to the Puppies page and the kennel name), **Fulfilled**, Edit, up and down; a
  Fulfilled section with **Put back** and Delete. **Add to waitlist** on an application
  in the Inbox, prefilled. Download a copy adds `waitlist.json`.
- Site: the waitlist page reads it live (no publish) and draws it like the KennelOS list
  (`familyList`, shared by both), above the form; the site's application form says names
  show as first name and last initial. The daily cleanup deletes fulfilled families after
  90 days; closing a site deletes them all.
- 117 tests; the Your waitlist screen and the site's list checked in Chromium at phone
  width. Manage app files changed (`app.css`, `zip.js`); version not bumped yet.

## 2026-11-02: keep my name private on the simple waitlist

- The site's application form has **Keep my name private**; it's saved with the
  application ("Show my name privately on the waitlist: Yes"). Add to waitlist then
  starts with the name masked as KennelOS masks it (`maskedNameFor`: "A***** K"), and
  the waitlist forms have a **Keep their name private** tick that always shows the
  masked name. Your waitlist marks them "(private)". 118 tests; the form checked in
  Chromium at phone width.

## 2026-11-02: steering between KennelOS and the simple waitlist

- `kennelosState` (feed.js): linked or not, and whether KennelOS takes applications
  online. Home: the Your waitlist tile is greyed when linked (`.tile.off`), and Waitlist
  and application says what's in use. Waitlist and application: the KennelOS card comes
  first (the full explanation when unlinked, one line when linked); under the settings,
  the questions and the simple waitlist are each marked when unused. The questions list,
  Your waitlist (no Add a family) and the Inbox (no Add to waitlist) say the same.
  119 tests; Home and the settings checked in Chromium at phone width.

## 2026-11-02: manage app version 9

- Manage app version 9 (Your waitlist's layout, `waitlist.json` in Download a copy, the
  greyed tile), with its fingerprint. Template unchanged at 7. 119 tests.

## 2026-11-02: scheme lab rebuilt to match the site

- `reference/scheme-lab.html` (the AK Colour Schemes artifact, republished to its link)
  now shows the waitlist page as built: only the families' list, then the application
  form (with the names line and Keep my name private), then How to pay; no Current
  Applicants box, Available Puppies or Coming up; Family login in the menu and footer,
  leading to the sign-in button on the status-page help page. Schemes unchanged.
  `ak-sample.html` (the page shared with the breeder) is left as it was.

## 2026-11-02: the kennel's own logo; Tuxedo proposed

- Logo (plan 3.12): `0010_logo.sql` (`sites.logo_photo_id`), **Your logo** on Kennel
  details (a photo picker, tagged "Your logo"), in the content document and the
  snapshot. The header shows it in place of the monogram, as a link to the full-size
  picture that `site.js` opens in a dialog (× , Escape or a tap closes it); the name
  beside it goes home. The footer shows it too. The change list says "logo". The manage
  app's resizing puts white behind a picture saved as JPEG (iPhones), so a clear
  background doesn't turn black.
- Tuxedo, a seventh scheme made to match the AK logo (black, white, silver; Cinzel,
  Lato, Pinyon Script; a fleur-de-lis flourish), added to the scheme lab with AK's logo
  in its header, and republished; contrast checked. Proposed until the owner says yes;
  schemes reach real sites in phase 6.
- 121 tests; the logo checked in Chromium at both widths, light and dark, opening and
  closing. Template and manage app files changed; versions not bumped yet.

## 2026-11-02: versions for the logo

- Template assets version 8 and manage app version 10 (the logo, its full-size view, and
  white behind JPEG photos), with their fingerprints.

## 2026-11-02: phase 5, albums

- `0011_albums.sql`; `ALBUM_FIELDS` (title, description, litter, cover, photos, shown).
  Manage app: **Albums** tile and list (the generic list screens), the photo picker
  offering the litter's photos first; `album_limit` enforced; removing a litter keeps
  its albums. Content document: `albums`, matched by slug so ids and redirects survive.
- Site: `/albums` (cards with cover and count, in the Puppies menu as Photo albums,
  hideable) and `/albums/<slug>` (a square-cropped gallery; tap for a full-screen viewer
  with previous, next, arrow keys and swipe; without the script each photo opens
  itself). A litter's page shows its albums. In the sitemap; a new address redirects
  from the old. The change list names albums added, edited or removed.
- 125 tests; the album pages and viewer checked in Chromium at phone width.

## 2026-11-02: phase 5, videos and posts

- `src/embeds.js`: one entry per provider (how its links read, its player, its shape,
  its preview); `readEmbedLink` refuses anything else. `0012_embeds.sql`;
  `src/embedStore.js` adds one from a pasted link, copying the provider's preview (YouTube's
  image, Vimeo's and TikTok's oEmbed) onto the site as a photo; removing it removes that.
- Manage app: a **Videos and posts** card on Home's screen, Our story, and every dog,
  litter and album: paste a link and an optional title, reorder, remove. Removing a dog,
  litter or album removes its videos. Content document: `embeds`, by place and slug.
- Site: a preview with a play button, linking to the original; `site.js` swaps in the
  provider's player only on a tap. Every page's Content Security Policy frames these
  providers and nothing else (Turnstile joins the same `frame-src` on form pages). The
  change list names videos added or removed.
- 129 tests; the boxes and the tap checked in Chromium at phone width.

## 2026-11-02: phase 5, sharing

- `src/lib/vendor/qrcode.js` (qrcode-generator 2.0.4, MIT, copied unchanged with its
  header; no runtime dependency) and `src/qr.js` (an SVG, black on white, quiet zone).
  Decoded with OpenCV to check it scans to the address.
- Manage app: **Share** tile and screen: the published site, its current and planned
  litters and its albums, each with its link, Copy link, a QR code and Download QR code.
- Site: a **Share** button on dog, litter, puppy and album pages (`navigator.share`, or
  the link copied), shown only with the script.
- Phase 5 is built apart from KennelOS shares carrying album links (phase 4). 132 tests;
  the Share screen checked in Chromium at phone width. Template and manage app files
  changed; versions not bumped yet.

## 2026-11-02: phase 5 rides versions 8 and 10

- The logo's bump (template 8, manage app 10) hadn't reached `main`, so phase 5 keeps
  those numbers with updated fingerprints rather than bumping again. `CLAUDE.md` now
  says to check whether the current number has gone out before asking about a bump,
  and, when it hasn't, just to update its fingerprint.

## 2026-11-02: removed photos leave R2; usage on /ops

- Migration `0013_usage.sql`: `photos.purged_at`, and `mail_counts` (emails per day
  and kind, counts only).
- The daily cleanup deletes the R2 files (full and thumbnail) of photos removed over a
  day ago, unless a kept snapshot lists them: the live site serves from its snapshot
  and Undo publish can go back to an older one, so those wait until the snapshots
  naming them are pruned. The row stays, marked `purged_at`. At most 500 a run.
- `/ops` opens with a **Usage** table (this month, now, free tier): sites, photos and
  their size, removed photos still in R2, kept versions, R2 storage against 10 GB,
  emails against Resend's 3,000 a month and 100 a day, form messages, breeder
  accounts, push subscriptions. Emails are counted from this deploy on.
- 134 tests. No template or manage app files changed, so no version bump.

## 2026-11-02: plan checked against KennelOS before phase 4

- Section 5 and the KennelOS parts of 3.2 to 3.11 checked against KennelOS's code. Fixed:
  upcoming litters (planned heats, pairings) go in the bundle per the Coming up switches;
  KennelOS fills litter `photos_url` as well as dog `url`, one way; invoices and receipts
  already print the kennel's website. Decision 10 is now built in KennelOS (Undecided and
  unset puppies aren't offered; Kels's Tidy up asks about pups with no plan).

## 2026-11-03: the Home collage, its frames, and a banner

- The top of Home drew three fixed boxes and filled any it had no photo for with grey
  placeholders, so a breeder's photos rarely matched their shapes and wide photos were
  cut off at both sides. Now (Top of the page, in the manage app):
  - **Photo layout:** seven pre-drawn layouts (one wide; one tall; two tall; two wide;
    one tall and two wide, the old look; one wide and two square; four square),
    `COLLAGE_LAYOUTS` in `content/model.js`. Each box has its own shape (wide 4:3,
    tall 4:5, square) and says the photo size that fills it sharply (1600 × 1200,
    1280 × 1600, 1600 × 1600).
  - **A photo per box**, and **which part to keep** (top, middle, bottom) per box. Box
    pickers follow the layout as she picks it (`app.js`). With fewer photos than boxes
    the site uses a layout for that many (`collageLayout`); never an empty box, and no
    collage at all with no photos.
  - **Frame, round each photo:** a soft mat (default), a mat with a brass inner rule,
    a leafy vine (`vine-h.svg`, `vine-v.svg`, `vine-c.svg` used as masks
    filled with the scheme's accent, so it follows light and dark), or none.
  - **Banner photo:** an optional wide strip under the header, across the page (5:2,
    best at 1600 × 640, at most 440 px tall), with which part to keep.
  - Each box's shape is set on its photo, not the box, so a frame of any thickness
    keeps the recommended sizes exact.
- New `hero` keys: `banner_photo_id`, `banner_focus`, `layout`, `frame`, `focus`
  (per box); `photos` now in box order, up to 4. No migration (block content is JSON).
- Checked in Chromium at phone and computer widths, light and dark. 140 tests; template
  and manage app files changed.
- Released as site template 9 and manage app 11 (fingerprints updated).

## 2026-11-03: phase 4 designed — what the KennelOS link actually does

Section 5 read against KennelOS's code before building, and settled with the owner one
question at a time. Nothing built yet; docs only (plan 5 rewritten, 3.2, 3.6, 3.7, 3.9,
3.11, 3.12, 6, 8.1, decisions and risks, and the backlog).

- **Two principles** (plan 5.1, decisions 29 and 30). A waitlist setting may fill a field
  but never gate a website section: `show_upcoming` and `parent_tests` both default to
  off, so as the website's gate they would have left a breeder who doesn't publish a
  public list with no upcoming litters and no health results, and nothing to explain why.
  And the site never works a status out for her — inference leans on data hygiene and
  fails invisibly, while a mark she set wrong is on her own site and one tap to fix.
- **Four marks in KennelOS** decide what is offered: `show_on_website` on Dog, Litter and
  Pairing, plus `heats_online` on a dam (a heat is a routine log entry twice a year, so
  the choice belongs to the dam, not to each event). A litter carries its own puppies —
  she never ticks eight at a time.
- **Her dates place a litter** (5.3): `accept_deposits_date`, which KennelOS already shows
  to families and already reads as the day deposits open (`depositsDueLitters()`), decides
  when Available means available. Before it, a litter sits under Coming up and its puppies
  read **Available on 12 December**; the site moves them on the day from the published
  snapshot, as Older puppies already does. Puppies are marked Available the day they're
  born, but nobody takes a deposit on a three-day-old puppy.
- **"Still deciding"** replaces "Coming soon" (3.6, decision 32): the old label promised a
  sale she may never make.
- **Prices are one number** (3.2, decision 31): limited shows the base for that sex, full
  shows base plus surcharge as a total, never "+$300"; ranges are worked out from sex and
  registration, never typed. Litter prices, deposits and surcharges per sex are not built
  yet — phase 4 adds them, with a puppy's own optional override and a per-litter **Show
  prices** switch.
- **Health results arrive as data**, and her KennelPort settings decide what shows (3.7):
  each dog's **Health results** choice and each result's tick, set once from that choice
  and hers afterwards. Abnormal results travel with their flag; vault certificates never.
- **Dogs are never deleted by a clock** (5.3, decision 28 narrowed): the 30 days with
  **Keep** is for litters. Archiving a dog in KennelOS is ordinary housekeeping, most
  reasons to hide one are temporary, and her dog photos exist on KennelPort and nowhere
  else — a clock there would destroy the only copy. A hidden dog waits in the draft under
  "Not on your site" until she removes it.
- **New groups on the Dogs page** (3.7): **Up and coming** (`dogs.upcoming`) for young
  stock she has kept, and **Looking for a home** for a dog with KennelOS status
  `for_sale`, with its price and **Ask about this dog** — a dog she can't breed is a dog
  she needs to place, which is what the site is for.
- **The hand-over** when a kept puppy becomes a dog: one KennelOS record, two KennelPort
  tables, matched only within a table. At the moment the litter leaves the site KennelOS
  asks whether to keep her, and on yes KennelPort moves her puppy photos to the new dog
  at once, so the litter's deletion can't take the only pictures of her as a puppy.
- **What a blank means** (5.3): stored fields are KennelOS's, blanks included; derived
  ones (titles from `title_earned` events, health results, upcoming items) only overwrite
  when they have something, and the matching screen shows every blanking before she
  confirms.
- **Mechanics settled** (5.2, 5.3, 5.4): the bundle posts to `api.kennelport.com` (already
  a routed host) with a bearer token, no cookie, and an allow-list of KennelOS app
  origins, which are not the family host in `KENNELOS_ORIGIN`; one-time link codes; one
  `links` row per device with the kennel it belongs to; a bundle id so a retry is safe and
  a format version; all-or-nothing application; **Unlink** from either side; and addresses
  sent back only once the published snapshot carries them, with KennelPort free to replace
  an address it wrote itself but never one she typed.
- **Contradictions fixed:** 5.1's "KennelPort never reads anything from KennelOS" now
  excepts the public waitlist feed, which it has read since phase 3; How to pay is filled
  from her waitlist settings (3.9, as `0006_payment.sql` already assumed) rather than
  being KennelPort-only in 5.3; and the three-generation pedigree, which is in no schema
  and no sample, moves to the backlog with KennelOS's `parent_pedigree` noted.
- **Out of phase 4:** **Request a website** and KennelPort's request form (backlog 2 and
  7; decision 2 stands), and hiding one puppy that has no health hold (backlog 6).


## 2026-11-03: custom domains, by hand (plan 2.4)

- **`custom_domains`** (migration 0014): one per site, the main hostname (normally `www.`),
  `pending` or `active`. The router finds a site from it; the partner name (bare ↔ `www.`)
  301s to the main one with the same path.
- **Pending** serves the site on the domain so it can be checked; **active** makes it the
  main address and the `kennelport.com` address 301s there (an hour's cache, so stopping it
  takes effect soon). Form posts are never redirected; staging never redirects.
- **Ops console → Own domain**: add, make main, stop redirecting, remove. Closing a site
  forgets its domain.
- **Two ways in** (Setup, "Custom domains"): a domain in KennelPort's own Cloudflare account
  is a Workers Custom Domain listed in `wrangler.toml`; any other breeder's goes through
  Cloudflare for SaaS with a CNAME to `sites.kennelport.com`. Same code for both.
- Pages already build their links, share previews and sitemap from the host serving them,
  so on the domain they all use it. Not yet: the daily check (plan 2.4), and the manage
  app's links and QR codes naming the domain (they use the `kennelport.com` address, which
  redirects).

## 2026-11-03: phase 4 built, KennelPort's side

Built from plan section 5 as settled the same day. The KennelOS side (5.5) is for the
KennelOS repo and isn't started. 166 tests with custom domains.

- **Migration 0015** (additive; 0014 is custom domains): litter prices per sex with `show_prices` (off) and
  `show_placed` (on), `price_note` and `deposits_on`; a puppy's `registration` and own
  `price`; a dog's `upcoming`, `for_sale`, `price` and `died_on`; a litter's
  `left_site_at`, `kept_at` and `kennelos_kind` (litter, pairing or heat); KennelOS ids
  on health results, extras and steps; and the tables `link_codes`, `links`,
  `link_pending`, `link_declines` and `notices`.
- **Linking** (`src/kennelos/link.js`): the KennelOS screen in the manage app shows an
  eight-character code (no look-alike characters, 15 minutes, once, owners only, ten an
  hour); KennelOS redeems it at `POST /v1/link` (limited per IP) for a `kpl_` token kept
  only as its hash, one `links` row per device, one kennel per site. Stop one device;
  the last one stopping, or **Unlink**, turns every KennelOS record into ordinary
  content, a record KennelOS had taken off staying off by her own switch.
- **The bundle** (`src/kennelos/bundle.js`): format 1, an allow-list from this side
  too (an unknown key is refused, naming it), capped per section and at 1 MB, applied in
  one batch or not at all, a repeated bundle id answered with its first summary. Matched
  by KennelOS id within a table; a litter's kind is part of its match, and a litter
  naming its pairing takes over the pairing's website litter. Stored fields follow
  KennelOS blanks included; titles, health results and steps only when sent. New
  health results' ticks come from the dog's choice once. Puppies come with their litter
  (by id, else by name among unlinked ones). How to pay and the extras come filled from
  KennelOS, whether they show staying hers; prices only with **Use my KennelOS prices**.
  The answer carries the published pages' addresses (5.4) and the site's facts
  (website, `extras_info_url`, whether the waitlist page wants her list).
- **Matching** (`match.js`): a KennelOS dog or litter with no match but the name of an
  unlinked website one waits for her; the KennelOS screen shows each field it would
  change, a blanking ticked "keep yours" to begin with. Yes links it, keeping its page;
  No makes a new one and remembers the pair.
- **The hand-over**: a bundle dog whose id is a puppy's becomes a dog with that puppy's
  photo and photo tags, so the litter's deletion can't take them.
- **The clock** (`clock.js`): a litter off the site (switched off, gone from a bundle, or
  Past without Keep) is listed under Litters as "Deleted on …" with **Keep**; the daily
  cleanup deletes it 30 days on with its puppies, albums, videos and the photos nothing
  else uses, and purges those files the same night. It starts clocks for litters already
  off the site on the first run, so nothing goes before she has seen the list. Dogs wait
  under **Not on your site** with **Remove**.
- **The site**: prices as one number (3.2); **Still deciding** for what was Coming soon
  (stored value unchanged); before its deposits date a born litter sits under Coming up
  and its puppies read **Available on 12 December**, moving on the day; the Dogs page's
  **Up and coming** and **Looking for a home** with **Ask about** (3.7).
- **Read-only while linked**: the fields KennelOS owns show as text with "from KennelOS"
  on the forms, the puppies screen and How to pay, and a save keeps what's stored.
- **Not set:** `KENNELOS_APP_ORIGINS` (wrangler.toml), the KennelOS Pro app's origins:
  every browser call to the API is refused until it is. Not in this build: programs
  (no page for them yet) and the backlog items 5.3 names.
- No manage app files (`public/_kp/m/`) changed, so the manage app stays at 11. Merged
  with custom domains (whose migration keeps 0014; this one became 0015), and with
  her own domain active, the addresses and website KennelOS is given are on it.
- Released together with the photo-shape changes and custom domains as site template 10
  (fingerprint updated).


## 2026-11-03: Phase 4, KennelOS's side, and what KennelPort needed for it

- KennelOS's side of the link is built (its repo: the four marks, `siteExport.js`,
  `kennelportApi.js`, Connect website and Update website, the prompts; its End-State guide
  §35). A bundle KennelOS builds was run through `cleanBundle` here and accepted.
- **The prices switch in each answer:** `siteFacts` now carries `kennelos_prices` (Use my
  KennelOS prices), so KennelOS sends its prices, which it keeps private, only while the
  switch is on. Tested.
- **Staging answers `/v1/` on its own host:** with `ALLOW_HOST_OVERRIDE`, a `/v1/` path is
  the link API whatever the host cookie says, since KennelOS calls with no credentials and
  so can't send it. Production is unchanged. Tested.
- **`KENNELOS_APP_ORIGINS` set:** `https://pro.kennelos.app` in production; staging adds
  `http://localhost:8000` and `http://127.0.0.1:8000` for KennelOS's dev server.
- No manage app or site template files changed: no version bump.
- **Custom domains and KennelOS's application form:** KennelOS's cloud now takes a
  breeder's own domain from its `WEBSITE_ORIGINS` setting, kept by hand like the domains
  here (fewer than a dozen breeders expected). Setup's Custom domains section has the two
  extra steps (C); `https://www.akbostonterriers.com` is listed.

## 2026-11-03: Recommended products merged in, and fed from KennelOS

- Merged the Recommended products branch (`ccr-ea225d60-8hfvna`) into the phase 4 branch.
- **Site template 11** (owner's yes): the products page's `site.css`; fingerprint updated.
- **Products from KennelOS:** the bundle takes an optional `products` section, each
  `{ id, name, link_url, code, code_note }`, from the KennelOS Accounts she marks Show on
  website. Matched by KennelOS id, else a hand-made product of the same name is taken over
  with its picture. Name, link, code and code note are KennelOS's (read-only while linked);
  picture, Home badge, button wording, group, description and order stay hers. One no longer
  sent is removed; its picture stays in her photos. Unlink makes them hers. A bundle without
  the section leaves products alone.
- Migration 0016 (never applied: it isn't on `main`) gains `products.kennelos_id`.
- Each answer lists the optional sections this Worker takes (`site.sections`), so KennelOS
  sends `products` only where it's understood. Tests added.

## 2026-11-03: colour schemes on real sites (plan 3.13)

- All seven schemes reach sites: Lawn, Harbor, Heather, Clay, Slate, Midnight (dark
  first) and Tuxedo, each light and dark. One list, `src/render/schemes.js`, holds the
  palettes, font pairings and ornaments; `worker/scripts/schemes.mjs` writes
  `public/_kp/t/ak/scheme-<id>.css` from it, and each page loads only its site's file
  before `site.css`, with its heading font preloaded and its ornament in the sprig.
  Fonts for the new pairings are served from `/_kp/fonts` (Latin, OFL, licences beside).
- Contrast checked in both versions (`tests/schemes.test.js`, every text pair at
  4.5:1 or better). Five light colours were darkened just enough to pass: the labels of
  Lawn (#9C7A34 to #7E632A, the one visible change), Harbor, Heather and Clay, and
  Clay's accent. The preview bar keeps its own gold.
- Kennel details has **Colour scheme**: a card per scheme with its swatches and fonts.
  Midnight is dark unless the breeder picks **Light only**.

## 2026-11-03: full-registration asks, Choose… for sex, matches and health fixes

- A litter's **Families can ask about full registration** (`litters.ask_full_reg`, off;
  migration 0017). On, each undecided puppy (no registration set: she'd sell it either
  way; never one staying) links from its card and page to
  `/contact?full-reg=<litter>&puppy=<puppy>`, and the litter page has the button while it
  has one. The About line is filled in from the snapshot (never from the address's words)
  and isn't cached. A puppy card's back shows its Registration.
- The manage app's required choices with no default (a dog's or puppy's sex, a litter's
  stage) start on **Choose…**, so a new dog isn't saved as Female by accident.
- Matches waiting for her yes sit at the top of Home and Publish, saying the site keeps
  her own version until she answers.
- Health: a KennelOS result sent unmarked (`normal: null`) counts as normal, and one
  Normal results only kept off for not being normal shows once it is.
- **Full Registration Surcharge**: with a litter's Ask about full registration and its
  Show prices both on, a detail row under the ask link: the litter's ("$500", or
  "males $500, females $700"), and each undecided puppy's own by its sex. Off with Show
  prices off. The surcharge reaches KennelPort from KennelOS only with Use my KennelOS
  prices, as before.
- **View profile on puppy cards.** A puppy's own page (`/litters/<litter>/<puppy>`) has
  always rendered, for every status the snapshot carries — Available, "Available on
  \<date\>" while deposits are ahead, Reserved, Still deciding, Staying, and Spoken for with
  the litter's Show spoken-for on — but nothing linked to it: the cards had "Ask about this
  puppy" (Available only) and the full-registration ask, and that was all. The card back now
  ends with **View profile**, the way a dog card does, so every puppy on the Puppies page,
  the Older puppies page and a litter page can be opened. Only with the Puppies page on,
  since the puppy route needs it and the Older puppies page can be on while Puppies is off.
- **A puppy's photos on its page.** Two blocks under the facts. First its own photos,
  where the litter's new **Show each puppy's tagged photos on its page**
  (`show_puppy_photos`, migration 0018, off by default) is on: the photos she has tagged
  as that puppy (0005) become its album, oldest first, capped at `ALBUM_PHOTOS_MAX`, with
  the same gallery and lightbox an album page uses. Photo tags have always been private
  and unpublished, so that tick is what publishes them, per litter — nothing changes for a
  site that leaves it off. Then the litter's albums, under "From \<litter\>" rather than a
  second "Photos". `galleryHtml` / `viewerHtml` in `parts.js` are now shared by the album
  page and the puppy page, so there's one gallery implementation.
- **Albums newest first, and "See more photos".** Albums read newest first everywhere
  they are listed (`/albums`, a litter page, a puppy page) and in the manage app, while
  her up/down arrows still win: `sort` is still what orders them, migration 0019 only
  sets the starting order (newest = lowest sort), and a new album is created below the
  lowest instead of above the highest. Each album's photos read newest first too, by the
  photo's own date, as a puppy's tagged photos now do (the cap keeps the newest).
  Albums also carry **More photos link** (`more_photos_url`): any third-party address —
  her Google Photos or Shutterfly share — shown right under the album as "See more
  photos", opening in a new tab. The arrow is `.more`'s in the template CSS, not in the
  words.
- **Each puppy's own "See more photos" link.** A puppy record carries
  `more_photos_url` (migration 0020): any third-party address for *that* puppy's photos,
  never its litter's, shown under its photos on its page as "See more photos". It stands
  alone — a puppy with the link but no tagged photos (its litter never ticked Show tagged
  photos) still gets its Photos block, with just the link in it.
- **Remove now, beside Keep.** A litter under "Leaving your site" waits 30 days before
  the cleanup deletes it. **Remove now** does that same deletion today — its puppies,
  albums and the photos nothing else uses (`deleteLitter`, exactly what the clock calls),
  then marks the draft changed. Only a litter already on its way out, so it is never a way
  round the clock; the card says it can't be undone.

## 2026-11-03: an undecided puppy reads Limited, and a FAQ can ride on other pages

- **An undecided puppy is drawn as the limited puppy it almost certainly is**
  (plan 3.2, decision 31 amended). KennelOS is untouched: it still sends **Undecided**
  for a puppy with no plan set, with no registration beside it. KennelPort now shows
  that puppy's Registration line as **Limited** (`parts.js regText`, which also keeps a
  puppy *staying* here saying nothing, as before) and prices it as limited —
  `puppyPrice` returns the base for its sex instead of a range from base to full. The
  litter's own Price row follows: `litterPriceRange` is its base prices across the sexes
  it has, so the full-registration surcharge no longer widens every litter card into a
  range. Nothing is hidden by this: where the litter's **Families can ask about full
  registration** tick is on, the undecided puppy still carries **Ask about full
  registration** and the **Full Registration Surcharge** under it, which is where the
  extra money is now stated. A puppy she has marked Full still shows the total. The
  manage app's words for Registration and for the surcharge fields were rewritten to
  match.
- **A FAQ question can be shown again at the top of other pages** (plan 3.12). Her first
  use: "What is the difference between 'limited' and 'full' registration?" at the top of
  every litter's page, where a family meets a price. Groundwork for the rest: the places
  are a list on the question itself (`places`, migration 0021, `FAQ_PLACES` in
  `content/model.js`), ticked on the question's own form, and ten pages draw them —
  Home, the Dogs page, a dog's page, the Puppies page, a litter's page, a puppy's page,
  Extras, The steps, Waitlist and Contact. Adding another is a `FAQ_PLACES` line and one
  `faqSection(snap, '<key>')` (or `faqBlock` inside a record page's wrap, under its
  breadcrumb, where the block after it takes the spacing). Only the FAQ carries places;
  Policies and the status-page help are unchanged. Keeping them on the question rather
  than in a table of their own means an export carries them and no placement can point
  at a question that has gone — `content/io.js` round-trips them and refuses an unknown
  place or a place on a non-FAQ expander. The published snapshot carries them, so a page
  draws from the snapshot as usual. The AK sample ships that question, placed on litters,
  so a new site starts with it.
- **Upgrades carry the name, and a litter's page shows its parents (2026-11-03).** A
  pairing sent again as its litter kept "Claire × Bubba" though the litter had a
  nickname: taking over only replaced the KennelOS-owned fields, and the name isn't one.
  Now a website litter taking over (pairing to litter, and newly heat to pairing or
  litter, through the bundle's new `heat_id` on pairings and litters, a `sections` entry)
  becomes what a new one would be: name and planned-litter label follow the new kind
  while still the site's own (`kennelos_name`, migration 0021; one from before counts as
  KennelOS's while it reads like a name the site would have made). Her own name or label
  stays. A litter's page no longer repeats its card: under the head (which drops the
  parents' names when they are the litter's name), a card for each parent side by side,
  Dam and Sire above them (picture, registered name, titles, colour and registry, three
  health results, View profile; an outside parent is the name she typed), then the
  litter's facts the head doesn't give: deposits from, going home, its puppies counted by
  sex ("2 girls, 1 boy") under going home, and the price ranges. `parentCards`, `litterFacts`, `litterRows` in
  `render/parts.js`; site.css. Tests added.
- **Publish's list of changes stops calling everything edited (2026-11-03).** A snapshot
  keeps every column of a record, blanks included, so one published before a column was
  added (registry, registration, the puppy photo settings) lacked keys the draft has, and
  `diff.js` called every dog, litter and puppy "edited" until the next Publish. Values are
  now compared with blanks (null, '', false, empty lists) the same as a missing field and
  key order ignored, so only real changes are listed. Tests added.
- **A litter's address follows its new name (2026-11-03).** When a website litter's name
  follows KennelOS's (a heat becoming a pairing, a pairing a litter, a nickname), its web
  address is made from the new name too, while it is still the one made from the old
  (`Writer.slugFromName`); an address she typed stays. Publish's redirects keep the old
  address, and its puppies' pages, working. Tests added.
- **Puppy wording, and a dog's weight (2026-11-03).** A placed puppy now reads
  Reserved on the site (was Spoken for) and a staying one Joining our program (was
  Staying with us); in the manage app the status list says "Placed (shows as
  Reserved)" so the two Reserved choices stay apart, and the litter switch is Show
  placed puppies. Dogs get a Weight field (migration 0022, free text like "45 lb"),
  the website's own: not in KennelOS's OWNED list, so a bundle never touches it. It
  shows on the dog's flip card (with its details, or above its health results) and
  on its page. Tests added.
- **A big album no longer crashes the Worker (2026-11-03).** D1 takes at most 100
  bound parameters a statement, and saving, previewing and publishing an album
  checked or loaded all its photos (up to 300) in one `IN (…)` list: error 1101 on
  testbostons once an album passed 99 photos. Those queries, and the same pattern in
  photo tagging and the cleanup's purge, now run in slices of 90 (`lib/sql.js
  chunks`). The test database (`tests/helpers/d1.js`) now refuses more than 100
  parameters, as D1 does. Test added (a 150-photo album).
- **Tag many photos at once (2026-11-03).** An album's screen gets "Who's in these
  photos": its photos with a tick box each, and one "Who's in them…" menu (its
  litter's puppies first) with Tag. The Photos screen gets the same tick boxes and
  bar, for whatever filter is showing. Both post to `/photos/tag-many`, which tags
  the ticked photos (in slices, under D1's limit) and returns to the screen it came
  from. Plain form controls joined by the form attribute, with the app's existing
  styles: no app files changed. Tests added.
- **KennelOS program icons on the waitlist page (2026-11-04).** KennelOS's feed rows can
  carry `program: { icon, about }` (her setting "Show program icons on the public list").
  The KennelOS list now draws the icon in its own column left of the number (only when
  some family has one; an unknown icon draws nothing), and tapping it shows her
  description in the same bubble as the date added. The drawings are copied from
  KennelOS's `shared/assets/programIcons.js`. Template CSS: the column, the bubble
  opening below, and the phone grid with the extra column. Test added. Template
  `ASSET_VERSION` 14.

## 2026-11-04: Puppy parent portal, build chunk 1 (the core, typed in by her)

Phase 1 of the portal plan split into six build chunks (portal plan section 6), each one
branch and one migration. The first, built here, is the plan's fallback made whole:
everything a litter needs from signed contract to vet visit, with families and pickups
typed in by her and no KennelOS feed yet.

- **Migration 0023** (`portal`): `sites.portal_on`; programs on `products` (shown,
  type, what the family does); `portal_settings`, `portal_families`, `portal_emails`
  (AES-GCM with the new `PORTAL_EMAIL_KEY` secret, beside the keyed hash),
  `portal_codes`, `portal_sessions`, `portal_placements` (pickup state, stored vet
  deadline, booking, proof, contract, life status, `source` / `kennelos_id` /
  `edited_fields` from day one), `portal_files`, `portal_health_records`,
  `portal_email_log`, `portal_history`, `portal_clicks`.
- **Switched on per site** from /ops (Puppy parent portal). Off, `/family` is a 404 and
  her screens don't show.
- **The vet clock** (`src/portal/vet.js`): 72 hours, or the end of the third calendar day
  after the pickup day in her time zone (her setting; open question 4 stays hers to
  answer). Reminders count back from the deadline: booking (5 days before go-home, until
  "I've booked it"), at pickup, about a day before, the deadline morning; never after the
  deadline, none once a record is uploaded, no burst when a pickup is marked late. A
  booked time that passes unmarked starts the clock (an hourly cron, `7 * * * *`), and
  her Today asks "Did Opal go home at 11:00 AM?" with Yes, Not yet or a corrected time.
- **Family side**, `/family` on her site (open question 1: a path, for now): email code
  or the invite's link (once, 30 days), year-long sessions on their own cookie
  (`Path=/family`). Home by stage (before go-home, the vet window, after) in the Lawn look
  of the prototype; Vet visit (booking, proof upload: photo or PDF, checked by its
  bytes, 10 MB); Records (details, shots and deworming, contract, her photos of the
  puppy); Account. Programs she marks shown appear as "Included with Opal", each click
  through `/family/go/<id>` counted, with the disclosure. Its files are `_kp/f/` with
  their own version (`PORTAL_VERSION`, now in CLAUDE.md's list).
- **Her side**, Site Manager: a Puppy families tile and section (list, add, each
  family's screen: invite, pickup, vet status and Accept, health records, contract,
  details, life status, reminder log with each send's result and the deadline it was
  counted from, history), Portal settings and programs, and the portal's items in
  Needs you. Built on the app's existing styles, so no Site Manager version bump.
- **Contacts for the first weeks** (asked for after the first push): in Portal
  settings, her phone and email for families (blank: the website's) and her vet's
  clinic, name, phone, address and a note. From pickup, the family's Home leads with
  "Questions about Opal? One tap": Call, Text and Email her, Call the vet, the address
  opening in maps, for 8 weeks by default (her setting); Records keeps them after.
- **Kept safe:** a litter with an open placement is never expired by the 30-day litter
  clock; closing a site deletes the portal's rows and files; `sendMail` now returns
  Resend's message id for the log, and sends portal mail under the kennel's name.

Left for later chunks: deleting a family is final for now (the 30-day undo, erase and
retention come with chunk 4, as do bounces from Resend's webhook); her wording for the
emails (plan section 4); the KennelOS feed and handoff (chunk 3).


## 2026-11-04: Puppy parent portal, build chunk 2 (checklist, timeline and programs)

- **Migration 0024** (`portal_steps`): `portal_checklist_items` and `portal_timeline_tasks`
  (her templates, `placement_id` null; or a step she added for one family),
  `portal_placement_progress` (one family's tick, who ticked it, a step hidden from them, a
  task moved to another day), `portal_placements_programs` (each family's status in each
  program: Not started, Clicked, Done; and their own code), the food on `portal_settings`
  (`food_name`, `food_bag`, `food_how`, `food_note`) and `products.portal_per_family`.
- **Her templates** (Puppy families → Go-home checklist / First-weeks timeline): start from a
  suggested list (linked to her shown programs of each kind), then add, edit, reorder or
  remove steps. Removing a template step takes it off every family's list. A task counts
  from birth or pickup, so many days before or after; `{name}` is the puppy, `{food}` her
  food. A few steps tick themselves: the vet booking ("I've booked it"), the pickup, the vet
  record (dated by the real deadline).
- **When a task is due** (`src/portal/steps.js`, pure, tested): from the litter's birthday
  or the pickup day (the real one, else the booked one, else planned go-home), in her time
  zone. A birth-dated task due by go-home is hers ("AK does this", then "Done by AK"). An
  unticked task of theirs reads Overdue (red) for 14 days, then Past. Never booked but
  already home: the booking task goes quiet; the vet visit task carries it.
- **Family side:** a Timeline tab (Before go-home, The first week, The first two months,
  Later), each task with its day, status word, program link and Mark done. Home: the
  go-home checklist from two weeks before go-home (ticks are forms, so no script needed);
  "Coming up" in the vet window; after it, **What's next** as numbered steps, the next task
  in the calendar block and the action bar; the dark green food band with the exact food
  and a round **Order Opal's food** button to her food program. Programs show the family's
  status, their own code where she gives one each, and **I've done this** for a program
  with a step. A click through the portal marks the program Clicked; a done task linked to
  a program marks it Done. Clicks now record the checklist, timeline and food band as
  places.
- **Her side**, on each family's screen: the checklist and timeline as they have them
  (tick or untick, hide a template step from them, add one for them alone, move a task's
  day), and Programs (status and their code). Every tick, hide and move is in History.
  Portal settings gains the food and "Each family gets its own code". Built on the Site
  Manager's existing styles: no Site Manager version bump.
- Deleting a family or closing the site removes their steps, ticks and statuses.
  Portal CSS: the checklist, task rows, status words, the food band and the round button.

Left for later: reminder emails for timeline tasks such as the insurance trial's deadline
(plan section 11; with her email wording, plan section 4); which pages each program shows on
(`portal_link_spots`) and the handbook's links come with the handbook in phase 2; a litter's
own food (from KennelOS's feeding schedule) with chunk 3.

## 2026-11-04: Puppy parent portal, build chunk 3 (KennelPort's end of the KennelOS feed)

The family feed's KennelPort side, ready for KennelOS to send to. KennelOS's part (building
the new rows for her kennel, sending them on its own, the status page's Open your puppy
portal link, applying the facts that come back) is built in the KennelOS repository.
Chunk 3's tables went into the branch's one migration, **0024**, with chunk 2's.

- **`POST api.kennelport.com/v1/portal`** (the device's link token; `src/portal/feed.js`
  documents format 1). Families from their signed contract on, each with their sale's
  placements (puppy by its KennelOS Dog id, go-home day, pickup time, microchip,
  registration number, contract date, a voided sale's reason, shots and deworming), her
  vet, and `removed`. Every key is named; anything else is refused. Advertised in the link
  facts as `portal_feed: 1` while the portal is on; refused (`portal_off`) while it isn't.
  Kept apart from the website bundle, which still waits for Update website.
- **How it lands (plan 3.1):** a new family and placement from `source = kennelos`, waiting
  for her invite ("Invite the Reed family" on Today); a family she typed in is matched by
  address and linked, not doubled, and what she typed stays hers. A field she has edited
  keeps her value: KennelOS's newer one waits on the family's screen with **Use it** /
  **Ignore** (an ignored value isn't offered again; Use it follows KennelOS again). Addresses
  are only added (one she removed isn't put back). Once a puppy is home, KennelOS's booked
  time moves nothing. Everything is in History, by KennelOS.
- **Gone and deleted:** `removed` marks a family, placement or record "no longer in
  KennelOS" (her screen and Today), never deletes it. Deleting a family, or removing a
  health record, leaves a tombstone (KennelOS id and type only), so it never comes back.
- **A voided sale** closes the placement with its reason (died, failed health check, backed
  out); died before pickup sets life status deceased. Every reminder stops; Today says so.
  The replacement's contract arrives as a second placement on the same family. The family's
  page for a loss comes with chunk 4 (`closed_reason` is there for it).
- **Her vet** arrives as contacts for families: filled where hers are blank, a suggestion in
  Portal settings where they differ.
- **The facts that go back**, in every answer: each placement's real pickup time once she
  has marked it, with `portal_only` (the handoff); the microchip she entered or corrected;
  a death after pickup she recorded. Nothing with money.
- **The one-tap link:** `/family/handoff?t=` signs a family in from the status page. The
  token is KennelOS's: base64url JSON `{ f: family's KennelOS id, x: expiry ms, n: nonce }`,
  a dot, and its HMAC-SHA256 under `handoff_key` (in every feed answer; derived from the
  site and kennel, never stored, dead once unlinked). Works once, for 10 minutes.
- **Family side:** before pickup, Home's go-home block links to their status page ("Book
  your pickup on your status page", or "Change it on your status page").
- **Last from KennelOS** on Puppy families and each family; Today says "Open KennelOS so
  your families' pages are up to date" when an open placement's feed is 24 hours quiet.
  Unlink keeps every portal record and drops only the waiting suggestions.

Left for later: the contract document itself (only its date comes now), the puppy's own vet
when it differs from hers, extras and stays (chunk 5), feeding schedule, buyer details and
baby book drafts (phase 2).

## 2026-11-04: Puppy parent portal, build chunk 4 (messages, the loss page, bounces, delete and erase)

Its tables joined the branch's one migration, **0024**, with chunks 2 and 3.

- **Messages from pickup** (plan 2; `portal_messages`). Before pickup the family's
  Messages page points to their status page (or her email) and posting is refused; from
  pickup they write to her there. Each message lands on her Today ("New message from the
  Reed family") and on their screen, and wakes her devices (push, as a `notice` with a
  `portal-message:` ref, since the notification kinds are fixed by migration 0004). Her reply
  shows in their portal and goes to every address by email, logged like every portal email.
  An unread count sits on the family's header.
- **The loss page** (plan 7.4). A puppy who died or failed a health check before pickup,
  from KennelOS's voided sale or recorded by her on the family's screen: their Home is one
  quiet page (the photo, "We're so sorry about Opal" or "About Opal", her note, the way back
  through their status page), the tabs shrink to Home and Photos, and nothing that sells
  shows. Today asks her to **Write to the Reed family**; her note starts from a draft with
  [brackets] she must replace, shows on their page when saved, and is emailed only if she
  ticks it. No reminder names the puppy again. A new Photos page keeps every puppy's photos.
- **Bounces** (plan 5): `POST api.kennelport.com/v1/resend`, Resend's webhook, signed the
  Svix way with `RESEND_WEBHOOK_SECRET` (set it in Resend and as a Worker secret). Delivered
  and bounced (complaints count as bounced) update the reminder log by message id; a bounce
  wakes her devices and shows on Today. A delivered event never undoes a bounce.
- **Delete, undoable for 30 days** (plan 4): her delete closes the family's portal at once
  (signed out, can't sign in) and lists them under **Recently deleted** with Undo; the daily
  cleanup finishes it after 30 days, with KennelOS tombstones. A sale voided because the
  family backed out, with nothing else open, schedules the same (plan 10.1); Today says when
  their account goes.
- **Erase** (plan 10.4): **Delete our account** on the family's Account page, or "They asked
  for their data to go" on hers. Sign-in, addresses, sessions, messages, ticks, waiting
  suggestions and the account's history go at once; the placement, health records,
  contract, vet record and reminder log stay under the family's name, listed under **Erased
  at the family's request** for her guarantee. From KennelOS: a tombstone.
- **The daily cleanup** also removes used one-tap links after a day and expired family
  codes and sessions.
- Portal CSS: the message thread, the unread count, text areas, the loss page.

Left for phase 2 (plan 10): the warnings at 30 and 7 days with Keep my account, deletion
for inactivity and of families who never signed in, the sale records' own clock, and
Download everything. Push to families' own devices isn't planned for phase 1: they get email.

## 2026-11-04: Puppy parent portal, build chunk 5 (extended stays and weekly updates)

Its tables joined the branch's one migration, **0024**, with chunks 2 to 4.

- **Delivery type on her extras** (plan 8.1): Portal settings, **Extras the portal
  delivers**: each extra in her website catalog is "Listed only" or "An extended stay, with
  updates", with how often she writes (7 days by default). `extras.portal_delivery`,
  `portal_every_days`. Photo and video packages (`media`) are phase 2.
- **Extras on a placement** (`portal_placement_extras`), on the family's screen: add one
  they bought, remove one. The name, weeks and cadence are copied, so the record survives
  the catalog changing. Payment stays in KennelOS. From the KennelOS feed, a placement's
  `extras: [{ id, extra_id }]` (the extra by its website-bundle id) arrives **unconfirmed**:
  Today says "The Reed family bought the 12-Week Development Package", and she confirms it
  or says Not right (then that charge isn't offered again).
- **A stay** (plan 8.2): go-home becomes birth + the package's weeks (she can still change
  it); the stay starts at 8 weeks old (editable); the package's "What's included" list
  becomes its skills, and she can add her own. Birth-dated tasks during the stay are
  already hers and pickup-dated ones move with the later go-home (chunk 2), so no
  per-package timeline. The vet clock starts at the real pickup, as for every puppy.
- **Her weekly update**, on the family's screen: a note, a weight, each skill on Not
  started · Introduced · Practicing · Reliable with a line of notes, pre-filled from last
  week, and up to 6 photos (JPEG, PNG or WebP, 10 MB each, checked by their bytes, in R2).
  Saving emails every address (logged as `stay_update`). Today lists stays whose update is
  due ("Opal: weekly update due, last one 8 days ago").
- **The family's side** (plan 8.5): during the stay a **Stay** tab takes Timeline's place.
  Home shows the week of the stay and how each skill is doing; the Stay page has the
  countdown, each skill's progress since the first update, and the updates newest first
  with photos (`/family/media/<id>`, only their own).
- Stay updates and their photos go with the family's account (an erase, or the final
  delete); the record that a stay was bought stays with her sale records.
- Portal CSS: the skills meter and the update cards.

Left for later: a stay update into the baby book (phase 2, with the baby book), video in
updates and photo and video packages (phase 2), and her Dogs tab as the place to write
updates (chunk 6).

## 2026-11-04: Puppy parent portal, build chunk 6 (her Site Manager as one app)

The last of phase 1's six chunks. No migration.

- **Five tabs** (plan 7.3) on sites with the portal on, and only there: along the bottom on
  a phone, down the side on a computer (`src/manage/hub.js`; Reports comes with phase 2).
  Sub-screens keep their Back button. Other breeders' Site Manager is unchanged.
  - **Today** (`/s/<sub>`): website changes not published with **Review and publish**;
    **Going home this week**, each puppy with its pickup time and whether the vet visit is
    booked, and **Mark picked up** on the day itself; **Needs you** from both sides (portal
    items, inbox, reviews, litters leaving); Last from KennelOS. No totals.
  - **Families** (`/s/<sub>/portal`): Puppy families, **Vet visits** in words with time left
    (red only Missed, and Not booked under 48 hours), **Activity** (what families did in the
    last two weeks: ticks, bookings, uploads, programs; never page views), recently
    deleted and erased, and the **Waitlist** (the website's list, or a line saying it's in
    KennelOS).
  - **Dogs** (`/s/<sub>/kennel`): each litter's puppies with their website status, family,
    go-home and extras, and **Write this week's update** for a stay puppy that's due; links
    to the Dogs, Litters and Puppies screens.
  - **Website** (`/s/<sub>/website`): the home screen it was (publish, view, preview,
    share, the tiles, Set up your site).
  - **Portal** (`/s/<sub>/portal/setup`): Portal settings, the checklist, the timeline,
    programs, extras.
- Today's "goes home" item in Needs you is now the Going home card (only "not invited
  yet" stays an item).
- **Versions:** Site Manager `APP_VERSION` 13 (the tabs in `app.css`), family portal
  `PORTAL_VERSION` 2 (every chunk's portal CSS on this branch), with the owner's yes.

Phase 1 is built on KennelPort's side. Before the gate (one litter from signed contract to
the vet visit with no fixes by hand, plan section 6): KennelOS's side of the feed, the
`RESEND_WEBHOOK_SECRET` secret, and her answers to the open questions that set wording
(plan 15: the vet rule, programs, retention numbers).

## 2026-11-04: Co-owned dogs (KennelPort's half)

From `docs/Co_Owned_Dogs_Plan.md`. Migration `0025_co_owned`.

- **Partner kennels** (`partner_kennels`): name, website and logo, from the Dogs screen's
  **Partner kennels** button (`/s/<sub>/lists/partners`). The logo is a photo, uploaded or
  copied from the kennel's pasted badge code (`badgeCode.js`, which also fills in its
  website and name). Names are unique on a site. Removing one takes it off its dogs; a dog
  that lived there still lives away, with no kennel named.
- **On a dog:** Co-owned, Lives with a co-owner, Lives with (one kennel) and Co-owned with
  (its co-owners' kennels). `coOwnedRules` (`records.js`) keeps them agreeing: only a
  co-owned dog lives away or has kennels, and the one it lives with is one of them.
- **The website:** a dog living with a co-owner is in none of her groups and not on Home,
  only in the Dogs page's new **Co-owned** section: light cards (no flip, about five
  across on a computer) in the slider, then the logos of the kennels they live with,
  greyscale until hovered, linked to their sites. Heading and line are hers (Dogs page
  wording). A co-owned dog living with her is grouped like her own. Every co-owned dog's
  page lists **Co-owned with** its named kennels, and **Lives with** when away. A kennel
  KennelOS no longer sends is hidden: dogs show "Lives with a partner kennel".
- **KennelOS** (bundle section `partner_kennels`, listed in SECTIONS): the kennels she
  ticked, by `name` and `website` only, and on each dog `co_owned`, `lives_away`,
  `lives_with_kennel_id`, `co_owner_kennel_ids`. A dog naming a kennel the bundle doesn't
  send is refused, as is any other key. Kennels are matched by KennelOS id, else a
  hand-made one by name (taken over with its logo); one no longer sent is hidden, never
  deleted. A bundle without the section leaves the co-owned fields alone. Name and website
  and the dog's four fields are KennelOS's (read-only while linked); the logo is hers.
- Export and import carry `partners` and name them from dogs (`lives_with`,
  `co_owned_with`); kennels keep their ids across an import. Partner logos count as used
  photos in the litter cleanup; the publish summary lists partner kennel changes; closing
  a site deletes them.
- `docs/KennelPort_Site_Directory.md`: co-owners' personal details still never come from
  KennelOS; a kennel name she ticks may.
- **Version:** site template `ASSET_VERSION` 15 (`site.css`), with the owner's yes.

## 2026-11-04: Puppy parent portal, KennelOS's side of the feed

Built in the KennelOS repository (its End-State guide §35.1; KennelOS PR #160). No change
here: the notes below say what KennelPort now receives.

- **The feed** (`POST /v1/portal`, format 1) goes from each of her devices linked to the
  site, only while the link facts say `portal_feed: 1`: when KennelOS opens (at most
  hourly, after re-reading the facts, sent even unchanged so Last from KennelOS stays
  fresh) and 20 seconds after a change that alters it. Families from their signed contract
  on (a Sale contract marked Signed with its date); the family's id is their KennelOS
  contact. Placements stop being sent 60 days after go-home or their last edit, and are not
  marked `removed` for that. `removed` is sent only for something deleted, or a contract
  set back from Signed.
- **Her vet** (plan 3.2, **Modified**): the Vet contact she names most on her own dogs' vet
  visits and surgeries, else her only Vet contact; `doctor` is not sent.
- **The facts back** are applied once each on her device: the pickup event moved to the
  real time in her time zone (or made) and the sale marked Delivered; the microchip; a death
  after pickup; `portal_only`. A later change in KennelOS isn't undone by the portal.
- **The one-tap link**: KennelOS keeps `portal.handoff_key` on her kennel record (cloud) and
  in her waitlist projection's server-only part; its server's `POST /f/portal` signs the
  token in the format `redeemHandoff` reads, at most 10 minutes, only for a family signed in
  on the status page. Their page shows **Open your puppy portal**, then only **Your puppy
  portal** once handed over, Delivered, or past the pickup day (switched on the server).
  Companion's link request and Furever are off for her families.

Before the gate (plan section 6): a KennelOS Worker deploy, then one litter from signed
contract to the vet visit against staging, the `RESEND_WEBHOOK_SECRET` secret, and her
answers to plan 15.

## 2026-11-04: Puppy parent portal, one Family login button that asks

- On a site with the family portal on (`sites.portal_on`, read when the page is served, so
  no publish is needed), the menu's and footer's **Family login** opens the site's own
  `/family-login` page instead of KennelOS's sign-in. It offers two choices: **Waitlist
  Status Page** (KennelOS's sign-in, in a new tab, as before) and **A-K Puppy Families**
  (`/family`). With no KennelOS waitlist linked, Family login goes straight to `/family`.
  The page isn't indexed or in the sitemap, and it's a 404 while the portal is off.
- Every other site is unchanged. The status-page help's "Sign in to see your details"
  still goes to KennelOS everywhere.
- The page cache keys on the portal switch too, so turning it on or off shows at once.
- Built from the template's existing How to pay card styles: no site template file
  changed, so no version bump.

## 2026-11-05: Puppy parent portal, family Home in the prototype's look

- Compared against `docs/reference/portal-prototype.html` at phone width, the built family
  Home had lost most of the prototype's variety (plain cards, one-column checklist, large
  link tiles). Home now carries the prototype's pieces over, with every built feature kept:
  - the header: her logo (or monogram) in a white circle, and "Puppy Parent Portal" under
    her name;
  - an edge-to-edge photo hero with a script line ("Welcome!", "Welcome home", "Hello
    again", or the stay's week) over the serif heading; after pickup, "N weeks home";
  - the pup card (framed round photo, script name with a sex badge, the breed,
    born and home facts) beside a calendar tile: a calendar page (month on red, day,
    weekday) with days to go and the pickup time and **What to do first**; in the vet
    window a red tile with hours left and **Upload record**; after, the next task; during
    a stay, a dark tile with the week and a week bar;
  - Book the vet visit as a warm tile with a large icon;
  - the vet visit, What's next and the stay's skills as mint bands with numbered blobs;
  - the go-home checklist in two columns on a phone;
  - before pickup, with a status page, a paper band: pickup, extras and messages stay
    there;
  - the food band edge to edge on deep green ("Keep X on the same food", the food on a
    cream box, a round Order button), and Included with X as round outlined badges;
  - Quick links as six small tiles, three across; the pinned bar as a full-width strip
    with an icon and two lines.
- Cards now have the prototype's thin border instead of a shadow, on every portal page.
- Deadlines no longer add "(… UTC your time)" on a phone or browser set to UTC (a server's
  zone, never a family's); a phone in another real zone still gets its own time.
- `CLAUDE.md`: future screens, every phase, are built from and checked against the
  prototypes in `docs/reference/`.
- Portal files changed (`portal.css`, `portal.js`): `PORTAL_VERSION` needs its bump.

## 2026-11-05: Site Manager, Today and Families in the prototype's look

- On a site with the puppy portal, every Site Manager screen has the prototype's header:
  her logo (or monogram) in a white circle, her kennel's name, and "Site Manager" under
  it, with her account at the right. The screen's title moves onto the page, under the
  kennel's name; a sub-screen has a crumb back ("‹ Families"). Sites without the portal
  keep the header they had.
- **Today:** a deep-teal band with the date, how many go home today and this week, and
  Last from KennelOS; this week's pickups as pup cards (round photo, script name with a
  sex badge, the family, a calendar page with the pickup time, the vet visit's status,
  and Mark picked up on the day or Their screen before it); Needs you as small tiles with
  an icon, red for what's gone wrong and amber for what's late; and, as the prototype has
  them, **Vet visits** (round photos, status pills) beside **Recent activity**, moved here
  from Families.
- **Families:** the kennel's name and Families, with **Puppy families** and **Waitlist
  (n)** pills (`?show=waitlist`); each family a row with the puppy's round photo, its
  litter, going home and last active, its extras as tags, and a status pill (Active, Not
  invited, Invite to send, Invite not accepted, No puppy yet). The waitlist side lists the
  website's list in order, or says it's in KennelOS.
- App files changed (`app.css`): `APP_VERSION` needs its bump, held with the portal's.

## 2026-11-05: Her KennelOS waitlist policies on her website

- With a KennelOS waitlist linked, her **Policies** page shows her own policies and then
  **Waitlist policies** (eyebrow "Our waitlist", in the page's own heading look, the same
  expanders), read from the KennelOS feed like the waitlist page (`/policies` is live, so a
  change in KennelOS shows within minutes, no publish), with her upcoming closed dates under
  a business-days policy (KennelOS `docs/KennelOS_Waitlist_Policies_Plan.md` §4).
- KennelOS's application on her waitlist page: the "I've read the policies" box's word
  "policies" links to `/policies#waitlist-policies` (or KennelOS's list page while her
  Policies page is off).
- Site Manager › Policies: a read-only **Waitlist policies from KennelOS** card above her own,
  saying where to change them; her own list stays for everything beyond the waitlist.
- No site template file changed (drawn on the server), so no `ASSET_VERSION` bump.

## 2026-11-05: Getting your pup home, and badges on more pages

- New page **Getting your pup home** at `/pickup` (plan 3.5): her Pickup, Transport and Travel
  day sections (Site Manager › Pages), shown once one has words; her transport services as
  badges under her Transport words (logo, name, web address, code; a name tile without a picture).
  No prototype screen for it: built from the template's own parts.
- Products: `transport` (from a KennelOS transport account, or ticked by her; never on
  Recommended products), `website_url` (the address under its badge), `badge_places` (pages
  besides Home that show its badge, two per page). Every badge now shows its name and web
  address under the logo. Spots per page in `render/pages.js` `badgeRow`. Migration 0026.
- KennelOS bundle: new section `transport` (a product's `website`, `transport`), both
  KennelOS-owned.
- Tests: `pickup.test.js` (new); `kennelos`, `products` updated. Checked rendered at 390px and
  1280px.
- `site.css` changed: `ASSET_VERSION` bump asked, not done.

- Versions bumped (2026-11-05, owner's yes): `APP_VERSION` 14, `ASSET_VERSION` 16, `PORTAL_VERSION` 3, each with its fingerprint.

## 2026-11-05: kennelport.com front page and terms of use

- `worker/src/front.js`: kennelport.com's own pages, replacing the one-line placeholder. `/`
  is a short front page (the dark header, a hero tile, four tiles, three numbered steps,
  a footer), built from the portal prototype's components; there is no prototype of this
  page. `/terms` is the terms of use, as approved by the owner (KennelPort is run by
  KennelOS; any fee agreed separately; contact admin.kennelos@gmail.com). Its own CSP
  allows inline styles and our fonts; nothing in `_kp/m`, `_kp/t` or `_kp/f` changed.
- The terms are linked from the Site Manager's and the puppy portal's sign-in ("By signing
  in you agree…") and every site's footer ("Made with KennelPort · Terms").
- `/privacy`: KennelPort's privacy policy (15 sections, written from the migrations and
  `cleanup.js`), linked from the terms and the footer. Wording waiting for the owner's approval.

## 2026-11-05: site builder, the owner's additions

From the owner, added to [`Site_Builder_Plan.md`](Site_Builder_Plan.md) as decisions 16 to 19,
with new sections and a new building order. Docs only; nothing built yet.

- Decision 16: the editor limits the owner only for function (unreadable text, dead
  links, pages too slow to load, files the site can't serve safely), never for looks;
  risky-but-working choices get a warning and are allowed.
- Decision 17: the owner adds her own blocks to any page: buttons, banners, dividers,
  spacers, collages, photos, videos, text over a photo. Colours only from the template's
  scheme, stored by name; fonts from an open-licence library served from the site.
  Every block gets background, padding, text size and fonts.
- Decision 18: the breeder can reword or switch off the owner's buttons and change an
  outside link, phone or email; she can't add buttons or change where an on-site link goes.
- Decision 19 (the owner's top priority): every line of wording the breeder reads in the
  Site Manager is the owner's, in one list set for every site and overridable per
  template and per site. `CLAUDE.md` now says new breeder-facing text goes in that list.
- Building order: 1 display and timing rules; 2 the breeder's instructions; 3 pages,
  blocks and the menu (was step 2, under way); 4 the owner's own blocks and styling;
  5 templates; 6 the family portal's build; 7 after the KennelOS review.
- Older lines brought in line: `KennelPort_Plan.md` 3.12 (no free look controls and
  "fixed" now mean for the breeder; the owner has them), `KennelPort_Design_Direction.md`
  section 2 (buttons) and Decided (scheme colours and the font library for the owner).

## 2026-11-05: site builder step 2 begins: the breeder's instructions

- `worker/src/manage/wording.js`: the list of wording the breeder reads in the Site
  Manager. Each line has a key, its screen, where it appears, its default (today's
  wording) and the names it can use ({kennel} everywhere; {n}, {date}, {role}, {one},
  {error} where the screen has them). `say(key)` gives the site's own wording, else every
  site's, else the default; `say.n()` picks the one or many line.
- Stored: every site's in a new `wording` table (added to `0028_demo.sql`, the branch's
  one migration); a site's own in its build (`wording`), so Reset to template will treat
  it as the owner's build. Per template comes with templates (step 5).
- The owner's editor: **Site Manager wording** (`/admin/wording`) and each site's **Her
  instructions** tab: grouped by screen, a search across all of it, each line with where
  it shows, today's wording and the names it can use; a line with a name it can't use is
  refused. No prototype screen for it: built from the prototype's lists, cards and pinned
  bar. Saved lines show straight away, no publish.
- In the list so far (521 lines): every form field's label and help (`forms.js` LABELS,
  SHARED, listed from there, so a field's hint she has none of today can be added), the
  choices in lists (ENUM_WORDS, not the schemes' names), the notes after a change (were
  `screens.js` NOTES), the lists' names, Add, New, Save and "None yet", and her home
  screen (`index.js` siteHome: status, buttons, tiles, set-up rows, Needs you).
- Not in it yet, each kept in one place to move next: each screen's own instructions and
  empty messages (`screens.js`, inline in each screen's function), the content model's
  error messages (`content/model.js`, `records.js`), Today with the family portal
  (`index.js` siteHome, the portal branch) and the portal's breeder screens
  (`portal/admin.js`).
- Her Site Manager reads exactly as before with no wording set (45 screens of the AK
  sample drawn before and after). Tests: `wording.test.js`.

## 2026-11-05: the breeder's instructions: each screen's own wording

- Each screen of the website side of the Site Manager now reads its own wording from
  the list (`manage/wording.js` SCREEN_LINES): headings, instructions, buttons, links,
  field labels of its own, empty messages, and the lines a screen picks between (linked
  to KennelOS or not, a list empty or not). New screens in the editor: Puppies at a
  glance, Litters, Dogs, Photos and albums, Waitlist and application, Your waitlist,
  Inbox, Reviews to approve, Publish, Share, KennelOS, Your site. The list now has 790
  lines.
- Moved by a script over `screens.js` and her home screen in `index.js`, each line keyed
  by its screen and first words; where a sentence runs round a link or bold words, each
  part is its own line ("Part of a line"). The owner's own links (her admin view, ops,
  This site's build) stay out of the list.
- Her screens read as before with no wording set (45 screens compared, entities read
  once; an apostrophe is now written `&#39;`, the same on screen). Four tests that looked
  for an apostrophe in the raw HTML now look for `&#39;`.
- Still in the code, each in one place: the sign-in, code, Notifications and offline
  screens (`index.js`, before a site is chosen); the lists' second lines and the
  application question kinds (`screens.js` LISTS, QUESTION_WORDS, BLOCK_TITLES, above
  `createScreens`); the match waiting card (`matchesWaiting`); the content model's error
  messages; the family portal's breeder screens (`portal/admin.js`).

## 2026-11-06: the breeder's instructions: signing in, her lists, the errors

- Signing in, the code screen, "No website here yet", her sites and Notifications read
  every site's wording (no site is chosen yet, so no {kennel}); if the wording table
  can't be read, today's. The offline screens and "That form didn't come from this
  app" stay out: they are about KennelPort itself.
- The line under each item in her lists, the kinds of application question, the Home
  blocks' names and on or off, and the "waiting for you to match" card (screens.js
  LISTS, matchesWaiting) are in the list.
- The errors from her forms' checks (content/model.js, records.js): a line per kind of
  check (`wording.js` ERRORS, matched by the check's words, so the checks stay as the
  import uses them), with {path} as today, {field} its label on her form, and what the
  check carries ({max}, {min}, {slug}, {place}). Today's wording reads exactly as before.
- Still in the code, each in one place: the errors of the waitlist (`waitlist.js`),
  photos (`photos.js`), videos (`embedStore.js`), badge codes (`badgeCode.js`), KennelOS
  linking (`kennelos/link.js`, `feed.js`) and sign-in (`auth.js`); the family portal's
  breeder screens (`portal/admin.js`).
- Her screens read as before with no wording set (51 screens compared, sign-in and
  Notifications among them).

## 2026-11-06: the breeder's instructions: the rest of her errors (step 2.3)

- The errors from her other screens are in the list (`wording.js` MESSAGES, read with
  `sayMessage(group, message, say)`): the waitlist (`waitlist.js`), photos (`photos.js`),
  videos and posts (`embeds.js`, `embedStore.js`), badge codes (`badgeCode.js`), the
  KennelOS feed (`feed.js`), link codes and matches (`kennelos/link.js`, `match.js`),
  Delete (`sites.js` closeSite), Publish (`publish.js`: too large, nothing to undo) and
  signing in (`auth.js`). As with the content model's errors, the code that finds the
  problem keeps today's words; each screen says the message in the owner's, matched by
  its words. 45 new lines; the list now has 931.
- Under Errors, each line says where it shows ("Photos: an empty file"); signing in's
  are on Signing in, with no {kennel}. Names from the message can be used ({max}, {kb},
  {known}...). The waitlist names a family's detail by {what} (and {What}, with a
  capital), and how it names each detail is its own line ("the name on the list").
  A badge code's "can't be copied (…)" carries the Photos error in the owner's words.
- Left out, as the plan says: KennelPort itself failing (sign-in or linking not set up,
  an email that couldn't be sent, "No such site"), the demo site's message, the owner's
  own screens (/ops, inviting), what KennelOS's app shows when it links (`link.js`
  ApiError) and the visitors' review form (`siteforms.js`).
- Still in the code: a few lines the manage app's own scripts write in the browser
  (`_kp/m/app.js`: "Copied", "Saving…", "Add Site Manager to your home screen first.";
  `_kp/m/photos.js`: "upload failed"). Moving them changes `_kp/m`, so it waits for a
  version bump. Then step 2.4: the family portal's breeder screens and Today.
- Today's wording reads exactly as before (each message checked against what the code
  throws). Tests: `wording.test.js` (two new). Nothing in `_kp/` changed: no version bump.

## 2026-11-06: site builder step 3.4: the menu editor

- The menu is the owner's setting (`content/blocks.js`: `menuOf`, `defaultMenu`,
  `withMenu`, `MENU_PLACES`). Groups in order, each with a name, a **Show it as a
  button** switch (today's Waitlist: its first link that shows) and a **Show it in
  the footer** switch; items are a page, a place on a page (Girls, Boys, Available,
  Upcoming litters, each showing only while it has something to show, as today), or an
  outside link (opens in a new tab). A page item can be set to show only while no
  other link to that page in its group shows (today's Puppies).
- Stored in the build (`build.menu`) only once it differs from today's; the snapshot
  carries it (`layout.menu`). No migration. `render/parts.js` `menuGroups` draws any
  menu; with none, today's, which reads exactly as before (413 pages of the demo, the
  AK sample and the AK sample with five added pages, on four dates, compared before and
  after: identical but for the application form's random question ids).
- The footer keeps today's three columns until the menu is changed; then it is a
  column per group shown in the footer, its pages and outside links (not places on a
  page), with How to pay and Family login in the last column.
- **Menu** in the admin view (`manage/builder.js` menuRoute), from the prototype's
  `aMenu`: each group a card with its name, move and remove; its links as movable rows
  with Settings (which group, a link's words and address, a place's own words, the
  only-while switch); the two switches; **Add to …** folded (a page, a place, or an
  outside link); New group; Back to today's menu; Not in the menu; the phone beside it
  shows each group as the site shows it today. Checked at 390px and 1280px. No new CSS,
  so no version bump.
- Pages she adds: New page and a page's own "In the menu under" list the menu's groups
  (not a button group); in a changed menu the page goes at the end of that group, and
  leaves the menu when removed. Pages lists where each sits.
- Functional checks only (decision 16): every group needs a name; an outside link needs
  words and an http(s) address. 8 groups, 20 links a group.
- The owner's screen: its wording stays in the code (her own screens are left out of
  the breeder's list).
- Tests: `menu.test.js` (new).

## 2026-11-06: site builder step 4: the owner's own blocks, and every block's look

- Six new blocks the owner adds to any page, as many as she likes (`content/blocks.js`
  BLOCK_TYPES kind `own`; drawn by `render/pages.js` ownBlock): **Banner** (heading, a
  line, a button; Accent background to start), **Button** (small, medium or large;
  filled or outline; left, centre or right), **Divider** (thin line, brass rule, the
  scheme's ornament; narrow, wide or full), **Spacer** (four heights), **Photo** (wide,
  tall, square or full width; which part to keep; a caption) and **Text over a photo**
  (heading, line and button; top, middle or bottom; left, centre or right; light,
  medium or dark shade).
- A button goes to a page (Home, any page, hers), an outside site (new tab), a call, a
  text or an email. A call, text or email uses Kennel details' phone or email, and
  follows it, unless a number or address is typed in. A button whose page is off, or
  with no number or address to use, hides itself (decision 16); a phone or email has to
  look like one; an outside link needs an https address.
- The breeder (block_switches, no migration: its content is JSON): switches each off
  (not a spacer), rewords it, changes an outside link, phone or email, and the photo and
  caption where the owner ticks "The breeder can change the photo". A link to a page is
  the owner's: her card says where it goes, and when it's hidden (decision 18). Her
  lines are in the wording list (`pages.own.*`, 17 lines; an error kind for a phone
  number). Her button's words post as `button_label`: the app fills any field named
  `label` with the device's name.
- **Every block's look** (the owner's, in each block's settings, Its look): a
  background from the scheme (Surface, Band, Accent, Footer colour, stored by name),
  space above and below, space at the sides, and on her own blocks a text size. On
  Accent or the footer colour the block's own colours swap to the scheme's matching
  ink (`site.css` `.kb`), so text stays readable (decision 16). A block with none set
  is drawn exactly as before: 413 pages compared, identical.
- The published snapshot carries the photos her blocks use. Checked at 390px and
  1280px (the site, the owner's settings, the breeder's cards). No prototype screen for
  these blocks: built from the template's band, buttons, ornament and photo boxes, and
  the manage app's cards, pills and photo picker.
- `site.css` changed: `ASSET_VERSION` bump asked, not done.
- Still to come in step 4: collages and videos as her blocks, links to a dog, litter or
  puppy, fonts and the font library, text size on the built-in blocks.
- Tests: `ownblocks.test.js` (new); `blocks.test.js` (Add a block lists them).

- Version bumped (2026-11-06, owner's yes): `ASSET_VERSION` 17, with its fingerprint.

## 2026-11-06: site builder steps 3.6 and 3.7: FAQ and badge spots anywhere, and what each profile page shows

- **Spots on any page (3.6).** A FAQ spot and a badge row fit any page, a page of the
  owner's included, once each (`content/blocks.js` `fits`, `SPOTS`); Add a block offers
  them where the page has none. A spot's place is its page's key (`model.js`
  `PLACE_KEYS`, or the owner's page id), so today's places carry over unchanged. A
  question's `places` and a product's `badge_places` now take any of those (a place
  that isn't a page is refused, as an error kind of its own, `error.place`).
- **The breeder's tick boxes follow the owner** (`spotPlaces`, `forms.js`
  `placeChoices`): on each FAQ question and each product she sees only the places that
  exist on her site, in the Pages order, then the profiles. With nothing changed, these
  are exactly today's `FAQ_PLACES` and `BADGE_PLACES`. A tick whose spot the owner takes
  away is kept, unseen, so it comes back with the spot. With Home's badge row removed,
  "Show as a badge on my home page" hides and keeps its value. Her FAQ list's "also on"
  line names only places that exist. A badge row that's full names the owner's page
  by its name.
- **What each profile page shows (3.7).** Every dog's, litter's and puppy's page, one
  setting per site (`build.profiles`, kept only once changed; the snapshot carries it
  as `layout.profiles`). A dog's and a puppy's page has three parts (under the
  breadcrumb, beside the photo, under the photo); each item can be switched off,
  ordered within its part, or moved to another; the name is always on; facts are
  switched and ordered. A litter's page: the pair and summary in its heading are
  switched; what sits under the heading is switched and ordered. A profile's FAQ spot
  and badge row are items (a dog's badge row is new, off to start), and turning one on
  or off adds or removes that profile from her tick boxes. A litter's link-card
  description keeps its summary when the owner hides it on the page.
- **The owner's screen**: Pages lists "Every dog, litter and puppy"; each opens its
  editor (`manage/builder.js` profileRoute): the card editor's ordered lists with a
  switch and a "where it sits" choice per item, the facts, Back to today's page, and
  the phone beside it sketching one of her records' pages. No prototype screen for it:
  built from the card editor's lists, switches and the pinned action bar. Checked at
  390px and 1280px, the breeder's FAQ form too. No new CSS, so no version bump.
- **Drawn as before**: 416 pages (the demo, the AK sample, and the AK sample with every
  question and badge placed everywhere, on four dates) compared before and after:
  identical but for whitespace between tags (the profile pages are now assembled from
  their items) and the application form's random question ids.
- Breeder wording: `lists.place.page` and `lists.place.none` in the list, and the
  place names as choices (`c.place.*`, forms.js ENUM_WORDS). The profile editor is the
  owner's screen: its wording stays in the code.
- Tests: `spots.test.js` and `profiles.test.js` (new); `blocks.test.js` (a badge row
  now fits Reviews), `kennelos.test.js` (two patterns allow a line break between the
  ask button and the surcharge row).

## 2026-11-06: which KennelOS puppies go on the site, by disposition

- The owner's ask: Up and coming was meant to carry only puppies she's keeping. Read in
  KennelOS: its bundle sends any puppy-status dog marked Show on website, whatever its
  disposition (`siteExport.js` `websiteDogs`); its own prompts only mark keepers, but the
  mark stays when a disposition changes, and the dog form's box can set it by hand.
- The bundle now takes a dog's `disposition` (text, so a new KennelOS disposition reads
  as undecided rather than refusing the bundle). **From KennelOS** has "Which puppy dogs
  go on the site": a switch per disposition (keeping, available, placed, health hold,
  undecided or none), all on to start (today's behaviour, decision 14). A puppy left out
  is treated as not sent: off the site, in her draft under Not on your site, back when
  it's sent again (`bundle.js` `pupShown`; `rules.landing.pup_*`). A bundle with no
  dispositions shows every puppy, as before.
- KennelOS sends `disposition` on puppy-status dogs only to a Worker whose answer lists
  the new `disposition` section (`SECTIONS`), so neither side has to ship first
  (KennelOS's same-day change, `siteExport.js` `dogEntry`).
- Tests: the linked sample's Pippa* carries `disposition: keeping`; `rules.test.js`
  ticks Keeping only and checks Pippa* leaves the site once she's Available.

## 2026-11-07: text block (one of the owner's own blocks)

- Add a block now offers **Text block** on any page, as many as she likes: a heading,
  a line under it and words (a blank line starts a new paragraph), set left, centred
  (the default) or right, with every block's look (`content/blocks.js` `words`). The
  site draws it with the template's own section head and prose (`.head`, `.lede`,
  `.prose`; `render/pages.js` `ownBlock`, `.own-words` in `site.css`), so no new look.
- The breeder can switch it off and reword the heading, the line and the words in her
  Site Manager (`block_switches` content gains `body`; no migration, it's JSON). Her
  wording for it is in the owner's list: `pages.own.words`, `pages.own.words_body`,
  `pages.own.words_body_hint`.
- Tests: `ownblocks.test.js` adds, words, aligns, rewords and switches one off.
- **Facts row (any page)**, also one of the owner's own blocks: up to four facts, each
  a value over a label, drawn exactly as Home's facts row on its own (`.facts`, no new
  CSS). It starts empty and hides until it has a fact. The breeder can switch it off
  and type her own facts (`block_switches` content `facts`, pairs); all empty follows
  the owner's. Her wording: `pages.own.factrow`, `pages.own.facts`,
  `pages.own.facts_hint`, `pages.own.fact_value`, `pages.own.fact_label`. Home's own
  facts row (her Home block) is unchanged.
- A **Photo** block (the owner's) can take a frame: the Home banner collage's soft mat,
  mat with a fine inner line, or leafy vine, in the scheme's colours (`PHOTO_FRAME`,
  `frame`; none to start, so photos already placed draw as before). A full-width photo
  stays unframed. The collage's `.box` and `.frame-*` rules carry over (`site.css`).
- Her two story photos, Home's "Photo and words" and the Our story page's, take the
  same frames: **Frame round the photo** on each (`photo_frame`, model.js `FRAMES`, no
  frame to start, so every site draws as before). Drawn as `.story-pic .box` in the
  story grid, shrunk and centred on a phone as the bare photo is. Her wording is in
  `forms.js` LABELS (`story.photo_frame`, `about.photo_frame`) and ENUM_WORDS
  (`photo_frame`), listed in the owner's list from there. Site template 19 (not out
  yet), fingerprint updated beside it.

## 2026-11-07: outside dogs, light cards' wording, Photo beside details

- **Outside dogs** (migration 0029): another kennel's dog, like a stud she bred to,
  kept in `dogs` with `outside`, `owner_name` and `owner_url`, so a litter's dam or
  sire, health results, photo tags and its page all work as for her own. Never in
  her groups or on Home; a Dog cards block's new "Outside dogs" filter lists them.
  An outside dog is never up and coming, for sale or co-owned (`outsideRules`). Its
  page says "Owned by" (a new dog-page fact). The litter form's dam and sire lists
  mark them. KennelOS doesn't send them (its `external_reference` dogs stay off).
- **Light cards** no longer say "Lives with a partner kennel" for every dog: their
  "where it lives" line shows only for a co-owned dog living away or an outside dog
  with an owner, and what a light card shows is now a list on the block like the
  flip card's. The words are the owner's site wording (`co_with`, `co_unnamed`,
  `outside_owner`, `outside_fact`).
- **Photo beside details**, a new Dog cards style: photo with the chosen items
  beside it, the bio and what follows it under both. No prototype screen has it;
  built from the dog page's and parent card's parts. Two across above 960px, else
  one wide card; a card stacks its photo on top when narrow (container query).
- **A line between cards** (block setting, flip and Photo beside details): a 4px
  accent bar between cards where they stack.
- Builder wording added to the owner's list: `doglist.outside`. Template v21.

## 2026-11-07: Publish sees every change

- Bug: the Publish screen's change list (`diff.js`) compared only kennel details,
  page wording, Home's built-in blocks and the records. Blocks and their look, the
  owner's added buttons and banners (and her words in them), colours and style, the
  menu, added pages, profile layouts, display rules and timing weren't compared, so
  it said "Nothing to publish" and hid the Publish button while Preview showed them.
- Now each of those has a line, and anything else in the snapshot that differs reads
  "Other changes to the site", so the Publish button can't be hidden again by a part
  the list doesn't name yet.
- Wording: the new lines live in `diff.js` with the existing ones (not yet in
  `manage/wording.js`), to move with them.

## 2026-11-08: collage block (one of the owner's own blocks)

- Add a block now offers **Collage** on any page, as many as she likes: Home's
  collage as a block. The owner picks a layout (the same pictures as the breeder's Home
  collage, `COLLAGE_LAYOUTS`), a frame (soft mat to start, as Home's; mat with a fine
  inner line, leafy vine, or none) and a photo for each box with which part to keep
  (`content/blocks.js` `collage`: `layout`, `frame`, `photos`, `focus`). Boxes the layout
  doesn't have are hidden, and shown as the layout changes (`app.js`, unchanged). An empty
  box is skipped, so the site uses a layout for that many photos (`collageLayout`), and it
  hides with none.
- The site draws it with Home's own collage (`render/pages.js` `collageOf`, now shared by
  Home's top block, which draws exactly as before), centred in `.own-collage`: at most
  760px wide on a computer (440px for one tall photo, 520px for two wide), full width on
  a phone. No prototype screen for a collage block: it's the prototype's Home collage,
  boxes and frames as they are.
- **The breeder can change the photos** (on to start, as the Photo block): her card shows
  a photo picker for each of the owner's boxes, in the owner's layout and frame, as her Home
  collage card does (`block_switches` content gains `photos` and `focus`; no migration,
  it's JSON). Her photos replace the owner's while she has chosen some. The published
  snapshot carries both.
- Her wording is in the owner's list: `pages.own.collage`, `pages.own.collage_photos`,
  `pages.own.no_photos`. The box labels ("Box 1", "which part to keep") are the Home
  collage's, still in `forms.js`.
- Checked at 390px and 1280px: the site (each layout and frame), the owner's settings,
  the breeder's card.
- `site.css` changed (`.own-collage`): `ASSET_VERSION` bump asked, not done.
- Still to come in step 4: videos as her blocks, links to a dog, litter or puppy, fonts
  and the font library, text size on the built-in blocks.
- Tests: `ownblocks.test.js` (a collage added, filled, a box emptied, the breeder's photos,
  not hers to change, switched off, cleaned); `blocks.test.js` (Add a block lists it).

## 2026-11-08: photo beside words (one of the owner's own blocks)

- Add a block now offers **Photo beside words** on any page: the prototype's story
  layout (`.story`, `.story-copy`, the framed `.story-pic`) as a block. A photo (which
  part to keep, a frame or none) beside a heading, words (a blank line starts a new
  paragraph) and an optional button to a page, an outside site, a call, a text or an
  email (`content/blocks.js` `beside`: `side`, `frame`, `focus`, `w.heading`, `w.body`,
  `w.label`, `link`). **Where it sits:** the photo on the left or the right on a computer;
  on a phone it always goes above the words, shrunk and centred as the story's is
  (`.story.pic-right` in `site.css`). With no photo the words take the width.
- **Words line up:** left (to start, as the story's), centred or right: the heading,
  words and button together, on a computer and a phone (`align`, `.story-copy.a-*`).
- The breeder can switch it off, reword the heading, words and button, change an outside
  link, phone or email, and change the photo where the owner lets her. Her wording:
  `pages.own.beside`.
- Checked at 390px and 1280px, left and right.
- Tests: `ownblocks.test.js` (words alone, the photo on the right framed, then left
  unframed, her words); `blocks.test.js` (Add a block lists it).

## 2026-11-08: headings show only as typed

- The owner's ask: no heading is required anywhere; if nothing is typed, nothing shows.
  Before, an empty heading box fell back to the site's own words ("Meet our dogs", "Our
  story", the owner's starting words on an added block), so emptying it changed nothing.
- Now a heading, the small label above it, the line under it and, on the owner's own
  blocks, the line, words, caption and button words show **as typed**. **Emptied, nothing
  shows.** Covered: every page's heading (eyebrow, heading, line under it), Home's blocks
  (the headline and script line, the story's label, heading and script word, the dogs',
  litters' and reviews' label, heading and line, the waitlist band's heading and line),
  the breeder's words on blocks the owner added, and a How it works step's heading (no
  longer required).
- **What's in the box is what shows.** Where she has never set one, her form now fills the
  box with the site's own words (the page's own heading, `blocks.js` `PAGE_HEADS`; Home's,
  `model.js` `HOME_WORDS`; her kennel's name for the headline; the owner's starting words).
  Saved unchanged, they stay unset and keep following the site's own (a renamed kennel,
  the owner's new wording). So no live site changes the day this ships: a heading she
  never touched still shows as before.
- How: those fields are marked `clear` (`model.js` `CLR`); an emptied one is stored as ""
  (no migration: it's JSON, and a step's `heading` column takes ""). The site uses `??`
  where it used `||` (`pagehead`, `head`, Home's blocks, `addedWords`), and draws no empty
  heading, page head or decorative sprigs (`head` and `pagehead` draw nothing when all
  three are empty). The owner's own settings already worked this way.
- Hints: "Leave it empty and nothing shows." on these fields (`forms.js` SHARED `eyebrow`,
  `heading`, `lede`; Home's `headline`, `script`; `steps.heading`) and on her added-block
  boxes (`pages.own.empty_none` in the owner's list).
- Not changed: a FAQ, policy or help expander still needs its heading (it's the line she
  taps to open it). The sub-headings that read "Leave empty for …" still fall back to
  their words when left empty: Getting your pup home's pickup, transport, travel and
  transport-services headings, Our dogs' co-owned heading, and the application form's
  heading.
- `site.css`: no change for this. Tests: `headings.test.js` (new).

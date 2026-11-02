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

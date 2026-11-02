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

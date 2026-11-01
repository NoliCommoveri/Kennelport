# KennelPort: high-level plan (DRAFT)

> Status: planning draft, 2026-10-09; checked against KennelOS on 2026-11-01 (section 11 lists
> what changed). Nothing is built. Section 9 lists the decisions still open.

KennelPort hosts breeder websites. Each kennel gets a site at `theirkennel.kennelport.com`.
The operator (you) sets up and drafts every site by hand. Breeders then manage their own
content through a simple login. Breeders who use KennelOS can link it so dogs, litters
and photo albums fill in by themselves.

**KennelOS is optional.** A KennelPort site works fully on its own; a breeder who has never
used KennelOS gets the same site, edited entirely in KennelPort. The KennelOS link is an
extra, never a requirement.

**What it is not:**
- No self-serve checkout. Nobody buys a site with a click; you approve every one.
- No code for breeders. They fill in forms and upload photos; you own the templates.

---

## 1. The flow

| # | Step | Who | What happens |
|---|---|---|---|
| 1 | **Request** | Breeder: in KennelOS Pro, or anyone through the KennelPort request form | KennelOS Pro users press **Request a website** in the app. Anyone else (Lite users, non-KennelOS breeders) uses the public request form on `kennelport.com`. Either way, you receive an email and the request appears in your console. |
| 2 | **Set up** | You | In your console: pick the subdomain, kennel name, owner's email and template. No DNS or Worker work for each site (see 2.1). |
| 3 | **Draft** | You | You fill in the site (about, dogs, photos, contact) and preview it at its real address behind a private preview link. |
| 4 | **Hand over** | You, then the breeder | You press **Publish** and **Send invite**. The breeder gets an email and signs in with a code sent to their email (no password). |
| 5 | **Manage** | Breeder | Adds dogs, changes pictures, posts a litter, edits text, then presses **Publish**. |
| 6 | **Link KennelOS** (optional, KennelOS users only) | Breeder | Links their KennelOS. Dogs and litters ticked **Show on website** flow to the site. |
| 7 | **Share** | Breeder | Shares the site, dog pages and albums. Links show a photo preview on Facebook and in texts. KennelOS Companion shares carry the album links. |

**Not for sale yet** (decided 2026-10-09). The first site is for a family member; whether
KennelPort is ever sold is undecided. Nothing in the system takes payment, and nothing in
this plan depends on a price.

---

## 2. Architecture

### 2.1 One Worker serves every site (not one Worker per customer)

You do the setup work, but it's a row in a database, not new infrastructure:

- **Once, at the start:** a wildcard DNS record `*.kennelport.com`, a Worker route
  `*.kennelport.com/*`, and Cloudflare's free certificate, which covers every first-level
  subdomain.
- **For each new kennel:** you add a site in your console. The Worker reads the hostname
  on each request, looks the site up, and renders it.

A Worker per customer would mean deploying and updating 15 copies of the same code. One
shared renderer means a template fix reaches every site at once.

### 2.2 Pieces

```
 visitor ──▶ thornfieldkennels.kennelport.com ─┐
                                               │   ┌──────────── Worker: kennelport ────────────┐
 breeder ──▶ manage.kennelport.com            ─┼──▶│ renderer     public sites, OG previews     │──▶ D1  (sites, dogs, litters, pages, users)
 you     ──▶ manage.kennelport.com/ops        ─┤   │ manage API   breeder sign-in + editing     │──▶ R2  (photos: full + thumbnail)
 KennelOS ─▶ api.kennelport.com               ─┘   │ ops          requests, set up, drafts      │──▶ Resend (sign-in codes, invites, request alerts)
                                                   │ link API     KennelOS publishes here       │
                                                   └────────────────────────────────────────────┘
```

| Part | Purpose |
|---|---|
| **Renderer** | Server-side HTML from a template plus the site's published content. Fast, works on any phone, good for search engines. No customer JavaScript. |
| **Manage app** | Static pages on the reserved `manage` host. Forms for each section, photo upload with in-browser resizing. |
| **Ops console** | Your side: request inbox, create site, edit any site, preview, publish, suspend, invite. Same pattern as `cloud/`'s `/ops` in KennelOS. |
| **D1** | All text content and accounts. Tens of MB at most. |
| **R2** | Photos. About 3 GB a year for 15 breeders once photos are resized (estimate in section 7). |

Reserved subdomains (`www`, `manage`, `api`, `ops`, `admin`, `mail`, `support`,
`kennelos`, `kennelport`, …) can never be given to a site.

### 2.3 Separate repo, separate Worker

KennelPort lives in this repo and deploys as its own Worker. It is not part of the
KennelOS `cloud/` Worker. KennelOS treats it like any optional service: with no KennelPort
URL configured, nothing about it shows or runs. That matches the KennelOS rule that
`cloudUrl: null` must work.

---

## 3. What a site contains (the template's sections)

Breeders fill in fields; the template handles layout. Version 1 needs one good template,
with colour and font choices and sections that can be turned on and off:

- **Home:** kennel name, logo, hero photo, short intro
- **About:** the kennel's story, breed(s), location (town and region only, never a street address)
- **Our dogs:** a card per dog (name, registered name, sex, photos, health testing, short bio) linking to a dog page
- **Our dogs** also shows each dog's earned titles, and health tests only as section 3.7 allows
- **Litters and puppies:** current and planned litters, parents, puppies with status (section 3.6) and photos
- **Albums:** photo galleries, each with its own shareable link
- **Extras:** the paid extras she offers families (photo packages, training, …), grouped, with descriptions and prices (section 3.4)
- **Pickup and delivery:** the pickup places she shows families and her transport policy (section 3.5)
- **Waitlist / apply:** the KennelOS waitlist form and public list embedded on the page, when they use it (section 3.8); a plain link otherwise
- **Contact:** email, phone, social links
- **Optional pages:** FAQ (can start from her KennelOS application FAQ), puppy care, testimonials
- **Embeds:** videos and social feeds placed on any page (section 3.3)

Content is stored as structured records (a dog, a litter, a photo), not free HTML. That's
what lets KennelOS fill it in and keeps every site safe and consistent.

### 3.1 Addresses (URLs)

The subdomain picks the site; the path picks the page:

| Page | Address |
|---|---|
| Home | `thornfieldkennels.kennelport.com/` |
| About | `/about` |
| Our dogs | `/dogs` |
| One dog | `/dogs/willow` |
| Litters | `/litters` |
| One litter, with its puppies | `/litters/willow-x-ranger-2026` |
| One puppy | `/litters/willow-x-ranger-2026/blue-collar` |
| Albums | `/albums`, `/albums/willow-x-ranger-week-6` |
| Extras | `/extras` |
| Pickup and delivery | `/pickup` |
| Waitlist | `/waitlist` |
| Contact, FAQ | `/contact`, `/faq` |
| Breeder's own extra page | `/p/puppy-care` |

- **No `www.`** A two-level name such as `www.thornfieldkennels.kennelport.com` isn't
  covered by Cloudflare's free certificate, so visitors would get a security warning. The
  site's address is `thornfieldkennels.kennelport.com`.
- **Section paths are fixed** (`/about`, `/dogs`, …), so every site works the same and
  KennelOS always knows where a dog's page is. Breeders can rename what the menu *shows*
  ("Our Story" instead of "About"), but not the path.
- **Extra pages go under `/p/`**, so a breeder's page name can never clash with a section.
- **Slugs** (`willow`, `willow-x-ranger-2026`) are made from the name and are unique within
  the site. If a slug changes, the old address keeps redirecting, so shared links never
  break. Linked records also keep their KennelOS id, so renaming in KennelOS doesn't
  break links either.
- **Custom domains later** (section 8, phase 6) keep the same paths:
  `thornfieldkennels.com/about`, with the `kennelport.com` address redirecting there.
- Every site also gets `/sitemap.xml` and `/robots.txt` for search engines.

### 3.2 Prices

Decided 2026-10-09: prices are entered in KennelPort only; **KennelOS never sends a
price**. **To revisit (decision 6):** since then KennelOS has gained litter prices
(an expected price and deposit per sex, and a full-registration surcharge, already shown
on families' turn cards), her extras price list (section 3.4) and a fee per mile for
transport (section 3.5). Keeping the 2026-10-09 rule means typing each price twice and
watching them drift apart. The proposal: the bundle may carry them, still shown only
where she turns them on.
- A litter can carry a price per sex (or one price) and a deposit per sex; a puppy can
  override its litter's price.
- **Registration:** a litter can add a surcharge for full registration (KennelOS's
  `full_reg_surcharge_male` / `_female`), shown as "Full registration: +$X".
- Each litter has a **Show prices** switch, off by default. When off, the site shows
  "Contact us for pricing".
- Puppies marked reserved or placed never show a price.
- A short notice under prices (her wording; KennelOS's turn cards say prices are
  intended base prices and may change before contract signing).

### 3.3 Embeds (YouTube, Facebook and others)

Decided 2026-10-09: breeders can embed content from several providers. The safe way to do
that is to **never store the HTML a breeder pastes**:

1. The breeder pastes an ordinary link (a YouTube video, their Facebook page, …).
2. The server checks it against a fixed list of providers and link patterns, and stores
   only the **provider and the item's id** (for example `youtube` + `dQw4w9WgXcQ`).
3. The renderer builds the embed itself from a template for that provider.

| Provider | What can be embedded | Built as |
|---|---|---|
| YouTube | a video, a playlist | iframe from `youtube-nocookie.com` |
| Facebook | a page's timeline, a post, a video | iframe from Facebook's plugin addresses (no Facebook script on the page) |
| Instagram | a post or reel | iframe from the post's `/embed` address |
| TikTok | a video | iframe player |
| Vimeo | a video | iframe player |
| Google Maps | the kennel's town or region (never a street address) | iframe |

- The list is in one place in the code; adding a provider means adding one entry there.
- Each site's pages send a **Content Security Policy** that only allows frames from these
  providers and no outside scripts, so even a mistake in a template can't load anything
  else.
- **Click to load:** an embed shows a preview image with a play button until a visitor
  clicks. Pages load faster, and Facebook or Google don't track visitors who never press
  play.
- If a provider removes an item or changes its embed, the site shows a plain link
  instead of a blank box.

Because embeds are built by KennelPort and breeders never add their own code, the manage
app can stay on `manage.kennelport.com` (see section 9).

### 3.4 Extras page

KennelOS now has a price list of paid extras (photo and video packages, training stays,
boarding and so on): each with a name, amount, optional group and description, and
whether families may request it. Families request extras on their KennelOS status page,
which shows names only and a **See our extras and prices** link to her own page
(KennelOS's `extras_info_url`; KennelOS keeps prices off its own server).

- `/extras` is that page: her extras grouped under each group's name, with descriptions
  and prices (prices follow decision 6).
- Linked, it comes from her KennelOS price list; unlinked, she types it in KennelPort.
- When linked, KennelOS can fill `extras_info_url` with the site's `/extras` address, so
  the status page links straight to it.
- Requesting an extra stays on the KennelOS status page. The site only describes them;
  nothing on the site takes an order or a payment.

### 3.5 Pickup and delivery page

KennelOS now records her pickup places (a name, address and notes, each with **Show to
families**; one is her standard location, where every mileage figure starts) and her
transport settings: fee per mile, one way or round trip, free under a number of miles,
how far away a family must live to suggest their own meetup place, and the distance past
which she'll be in touch instead.

- `/pickup` lists only the places she marked **Show to families**, with their notes.
  The standard location's address appears only when it's one of those (it should be a
  public place, never her home; section 10).
- The transport policy in plain words: "Families at least 40 miles away can ask us to
  meet nearer to them; beyond 150 miles, we'll be in touch about driving or a flight
  nanny." The fee per mile shows only if prices are on (decision 6).
- Pickup times and booking stay on the KennelOS status page.

### 3.6 Puppy statuses

KennelOS keeps a puppy's plan (`disposition`: undecided, keeping, available, placed,
health hold), and a waitlist family's pick holds a pup while its deposit is pending. The
site's labels:

| KennelOS | Site |
|---|---|
| available, no open pick | Available |
| available with a pick awaiting its deposit, or a sale before delivery | Reserved |
| placed | Placed (or hidden, per litter) |
| keeping | Staying with us |
| undecided | Not shown as available ("Coming soon") |
| health hold | Never shown as available; hidden by default |

The bundle carries the label, worked out in KennelOS with the same availability check
its waitlist uses (`isPupAvailable`), so the site and the waitlist never disagree.

### 3.7 What's public follows her KennelOS choices

KennelOS already decides what families see on its public list and status pages. The
site bundle uses the same rules, so nothing she hid there appears on her website:

- **Health tests:** shown only per her `parent_tests` setting (off by default; "Normal
  results only" or "All results"), with each dog's own override, using the Normal /
  Abnormal flag on each result. Health-test certificates are files in her private vault
  and are never published automatically.
- **Titles:** each dog's earned titles (from her logged show results), as family pages
  show them beside a parent's name.
- **Planned litters:** follow her **Coming up** public switches per stage: planned heats
  (month and year only), planned pairings, confirmed pairings, whelped litters before
  picks open.
- **Dates and places:** whelp and ready dates as family pages show them; never a buyer,
  a family, an address or a sale.

### 3.8 The waitlist on the site

KennelOS's waitlist form and public list can now be embedded on a breeder's own site
(`embed.js`, with her **On your website** settings). The `/waitlist` page embeds both.

- KennelPort's Content Security Policy must allow frames from the KennelOS family-page
  host.
- KennelOS must list the site's address among the sites allowed to embed her waitlist;
  **Connect website** adds it for her.
- The site's Litters section and the public list's **Available Puppies** draw on the
  same KennelOS data, so they agree.

---

## 4. Breeder sign-in and editing

- **Sign-in:** email and a 6-digit code, then a session for that browser. This is the
  pattern KennelOS cloud already uses (`cloud/src/auth.js`), so reuse its approach and
  rate limits.
- **Roles:** `owner` (the breeder), optional `editor` (a helper), and `operator` (you, on
  every site).
- **Draft, then publish:** edits save as a draft. **Publish** makes them live. You and
  the breeder can preview the draft first.
- **Photos:** resized in the browser before upload (about 1600px WebP plus a 400px
  thumbnail). Re-encoding also **removes location data** (EXIF GPS) from phone photos,
  which would otherwise reveal where the breeder lives. Each site has a storage limit.
- **Limits:** a storage cap per site, and limits on photo and album counts for each
  plan, enforced by the server.

### 4.1 Closing a site

Decided 2026-10-09: a site's content can be deleted **by the breeder** (a **Delete my
site** button in the manage app, owner only) **or by you** (in the ops console). Either
way:

1. **Confirm.** The breeder types their subdomain to confirm. The screen offers **Download
   a copy first** (a zip of their text and photos) but doesn't require it.
2. **Delete everything, immediately.** Every dog, litter, puppy, page, album, embed and
   redirect row; every photo in R2 (`sites/<site_id>/`); every sign-in, session and link
   token; and the site's request record. No grace period and no hidden copy kept.
3. **Leave a closed marker.** The `sites` row stays with only its subdomain, status
   `closed` and the closing date. The kennel name, theme and owner are wiped.
4. **The address shows a notice.** Every page on that subdomain, including old shared
   links like `/dogs/willow`, shows: *"This breeder is no longer hosting with KennelPort."*
   It answers HTTP 410 (Gone), so search engines drop the old pages.
5. **The subdomain is never reissued automatically.** Otherwise someone else could take
   over links that families, Facebook posts and KennelOS shares still point to. Only you
   can release it, from the ops console.
6. **KennelOS:** the link token stops working. KennelOS shows "This website was closed"
   on its next **Update website** and offers to disconnect. Dog `url` fields already
   pointing at the site land on the closed notice.

Suspending (section 10) is different: it hides a site but keeps everything, so it can be
turned back on.

---

## 5. The KennelOS link

### 5.1 The principle: KennelOS publishes, KennelPort displays

KennelOS works the same way for Companion (`shared/data/companionExport.js`) and the
waitlist (a published "projection"):

- KennelOS builds a **site bundle** with an **allow-list**: every field copied by name,
  with no buyer names, **no prices**, notes, contracts or contacts. A new field
  in KennelOS never reaches the site until someone adds it to the list.
- Only records the breeder marks **Show on website** go into the bundle.
- KennelOS pushes the bundle to KennelPort. KennelPort never reads anything from KennelOS.

### 5.2 Linking

1. In KennelPort's manage app: **Link KennelOS** shows a one-time link code.
2. In KennelOS (Settings or Import/Export): **Connect website** takes that code. KennelPort
   returns a token, which KennelOS stores through `settings.js`.
3. From then on, KennelOS has an **Update website** button. Nothing is sent until the
   breeder presses it (decided 2026-10-09: no automatic publishing). What arrives lands in
   the site's draft, so the breeder can still check it before pressing **Publish**.

### 5.3 Who owns which field

- **From KennelOS (read-only in KennelPort):** name, registered name, sex, date of birth,
  colour, earned titles, health tests (section 3.7), litter dates, parents, puppy status
  label (section 3.6), planned litters (per her Coming up switches), extras names, groups
  and descriptions (section 3.4), shown pickup places and transport distances (section
  3.5). If decision 6 changes: litter prices, deposits, the registration surcharge, extras
  prices and the fee per mile.
- **KennelPort only:** website bio, prices (unless decision 6 changes), photo choice and
  order, albums, embeds, page text, layout.
- Unlinked sites edit everything in KennelPort. Unlinking keeps the last published copy as
  editable KennelPort data.

### 5.4 Photos and shares

- KennelOS doesn't store dog photos today; a dog has a `url` field that Companion shares
  as its "photos link." KennelPort fills that gap: each dog page and album has a
  permanent link, and when linked, KennelOS can **fill the dog's `url` with its
  KennelPort page**. Companion packages, and anything else that shares `url`, then point
  at the site with no other changes.
- Every dog, litter, puppy and album page carries **Open Graph** tags (title, cover photo,
  description), so a link pasted into Facebook, Messenger or a text shows a picture card.
  `cloud/`'s family pages already do this.
- A **QR code** for each site and album, for printed puppy packets and show tables.

### 5.5 KennelOS changes this implies (for the KennelOS repo, later)

These follow KennelOS's own rules, and each one needs its own decision there:
- A `show_on_website` flag on Dog and Litter: a new field in `db.js`, classified in
  `syncRegistry.js`, documented in the End-State guide.
- `shared/data/siteExport.js`, the allow-list bundle builder, with a positive key check
  like `assertOnlyKeys()`.
- A `siteConfig` injection point (KennelPort URL or `null`), so Demo and any build without
  it show nothing.
- **Request a website**: a Pro-only button (decided 2026-10-09). Lite and Demo don't
  show it; it goes through `editionConfig.js` like other Pro-only features, never a
  hardcoded edition check.
- **The link token:** KennelOS now syncs across a breeder's devices. Keep the token in
  the device-only `device_secrets` table (never in a backup file or the cloud), so each
  device links once; or decide one device publishes (decision 11).
- **One link per kennel:** KennelOS supports more than one own kennel. Each site is one
  kennel; the bundle is scoped to that kennel's dogs and litters, and each kennel links
  separately.
- **Filled in when linked:** the kennel's `website` (invoices and contract forms already
  use it), `extras_info_url` (section 3.4), the waitlist embed's allowed sites (section
  3.8), and dog `url` (section 5.4).
- **Kels:** Request a website and Update website as Kels tasks; **Show on website** asked
  in Add dogs, Record a litter and when a pup is marked Keeping.
- Service-worker precache entries and a cache bump for any new files.

---

## 6. Data model (sketch)

| Table | Key fields |
|---|---|
| `sites` | id, subdomain (unique), kennel_name, template, theme, status (`draft` / `live` / `suspended` / `closed`), closed_at, storage_limit, created_at |
| `site_users` | site_id, email_hash, role (`owner` / `editor`) |
| `sessions`, `login_codes` | as in KennelOS cloud |
| `requests` | id, kennel_name, contact email, message, source (`kennelos` / `form`), status (`new` / `in_progress` / `done` / `declined`) |
| `dogs`, `litters`, `puppies` | site_id, slug, content fields, `source` (`kennelport` / `kennelos`), `kennelos_id` when linked, `draft_json`, `published_json` |
| `pages` | site_id, slug, section type, draft and published content |
| `redirects` | site_id, old path, new path (kept when a slug changes) |
| `embeds` | site_id, page or record it sits on, provider, item id, title, order |
| `photos` | site_id, r2_key, thumb_key, width, height, bytes, alt text |
| `albums`, `album_photos` | site_id, title, slug, cover; ordered photo list |
| `links` | site_id, token_hash, linked_at, last_publish_at |

R2 keys look like `sites/<site_id>/photos/<photo_id>.webp`, so a whole site can be deleted
or exported at once. A closed site keeps only its `sites` row (subdomain, `closed`,
closed_at); every other table is emptied for it (section 4.1).

---

## 7. Cost (15 breeders)

| Item | Cost |
|---|---|
| Domain | about $10–15 a year |
| Workers | $0 (free tier); $5 a month when traffic grows |
| D1 | $0 (under 50 MB against a 5 GB free tier) |
| R2 photos | $0 for about 3 years (about 3 GB a year against 10 GB free; no bandwidth fees) |
| Resend email | $0 on the free tier at this volume |
| **Total** | **About $1 a month** |

These are prices from memory; check Cloudflare's and Resend's current pricing.

---

## 8. Build order

Each phase is useful by itself, so you can stop after any one.

| Phase | Delivers | You can now… |
|---|---|---|
| **0. Set up** | Domain on Cloudflare, wildcard DNS, empty Worker with D1 and R2, staging and production | — |
| **1. Renderer + ops** | One template, the ops console, preview links, publish, reserved names, OG tags, close a site and the closed notice | Build and host sites for breeders yourself, with no breeder login yet |
| **2. Requests** | Public request form on `kennelport.com` + email alert to you; ops inbox | Take requests from anyone, before KennelOS has its button |
| **3. Breeder login** | Email-code sign-in, manage app, drafts and publish, photo upload with resizing and location removal, storage limits, **Delete my site** with download-a-copy | Hand sites over to breeders |
| **4. Albums, embeds & sharing** | Albums, embeds (section 3.3), share links, QR codes, nicer previews | Breeders share albums and add videos and Facebook feeds |
| **5. KennelOS link** | Link codes, the bundle API in KennelPort; then in KennelOS: Show on website, `siteExport.js`, Request a website, Update website, filling `dog.url`, the kennel's website, `extras_info_url` and the embed's allowed sites; Extras, Pickup and Waitlist pages from the bundle | Data flows from KennelOS; Companion shares carry album links; status pages link to the site's extras |
| **6. Later** | Custom domains (Cloudflare for SaaS), more templates, visitor stats, contact form | — |

---

## 9. Decisions to make

1. **Domain:** `kennelport.com` (decided 2026-10-09). The manage app stays on
   `manage.kennelport.com`: embeds are built by KennelPort from an approved list, so no
   breeder code ever runs on a site (section 3.3).
2. **Who can request a site:** decided 2026-10-09. The in-app **Request a website**
   button is KennelOS Pro only for now. A KennelPort site never requires KennelOS: anyone
   can ask through the public request form, and you approve every request either way.
3. **Pricing:** decided 2026-10-09: not now. KennelPort isn't for sale yet; the first site
   is for family. Revisit only if it's ever offered to others.
4. **Accounts:** decided 2026-10-09: KennelPort has its **own sign-in**, separate from
   KennelOS cloud. The two connect only through the link code (section 5.2).
5. **Publishing from KennelOS:** decided 2026-10-09: only when the breeder presses
   **Update website**; never automatic.
6. **Prices:** decided 2026-10-09: KennelOS never sends prices. Breeders can enter them
   in KennelPort and choose per litter whether they show (section 3.2). **Reopened
   2026-11-01:** KennelOS now holds litter prices, extras prices and a fee per mile.
   Proposed: the bundle may carry them, shown only where she switches prices on.
7. **Embeds:** decided 2026-10-09: yes, several providers, including YouTube and Facebook
   pages, built from an approved list (section 3.3).
8. **When someone leaves:** decided 2026-10-09: the breeder or you deletes all content
   immediately, and the address shows a "no longer hosting with KennelPort" notice
   (section 4.1).
9. **Content rules and suspension:** still open, and only needed once sites go beyond
   family: terms of service and what gets a site suspended.
10. **Puppy labels:** confirm the table in section 3.6, especially whether placed pups
    stay visible and how health hold shows.
11. **Link token across devices:** each device links once (token in `device_secrets`), or
    one device is the publisher (section 5.5).

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| One bad site gets the whole domain blocklisted | You approve every site; one-click suspend; terms of service; no customer code |
| Photos reveal a breeder's home | Location data removed on upload; addresses shown only as town and region |
| A pickup page reveals a breeder's home | Only places she marked **Show to families**; the standard location should be a public place (section 3.5) |
| The site shows something she hid on KennelOS's public pages | The bundle applies KennelOS's own health-test, Coming up and availability rules (sections 3.6, 3.7) |
| Private KennelOS data leaks to a public site | Allow-list bundle with a positive key check, and per-record opt-in (section 5.1) |
| Storage creep | Per-site limits; delete files when photos and sites are removed |
| A closed subdomain is taken over and old links point at a stranger's site | Closed subdomains are never reissued automatically (section 4.1) |
| You become the bottleneck | Breeders handle routine edits themselves; you only do setup and design |
| An embed provider tracks visitors or changes its embed | Click to load; plain-link fallback; providers listed in one place |
| Tie-in to one host | Plain D1 and R2 data, with a full export for each site |

---

## 11. Checked against KennelOS (2026-11-01)

KennelOS features built since this draft, and where the plan now covers them:

| KennelOS feature | Plan |
|---|---|
| Litter prices (per sex, deposit, full-registration surcharge) shown on families' turns | 3.2; decision 6 reopened |
| Extras price list; families request extras on their status page; `extras_info_url` | 3.4 |
| Pickup places and transport settings (fee per mile, free miles, own-meetup distance, "be in touch" distance) | 3.5 |
| Puppy plan (`disposition`) and waitlist picks holding a pup | 3.6 |
| Parents' health tests on family pages (`parent_tests`, Normal / Abnormal), certificates in the vault | 3.7 |
| Show titles from logged results | 3 (Our dogs), 3.7 |
| Coming up switches (planned heats, pairings, early litters) | 3.7 |
| Waitlist form and public list embeddable on her own site | 3.8 |
| Application FAQ | 3 (Optional pages) |
| Several own kennels | 5.5 |
| Live sync across devices | 5.5; decision 11 |
| Kels guided tasks | 5.5 |


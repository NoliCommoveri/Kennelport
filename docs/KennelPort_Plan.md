# KennelPort: high-level plan (DRAFT)

> Status: planning draft, 2026-10-09. Nothing is built. Section 9 lists the decisions still open.

KennelPort hosts breeder websites. Each kennel gets a site at `theirkennel.kennelport.com`.
The operator (you) sets up and drafts every site by hand. Breeders then manage their own
content through a simple login, and can link their KennelOS data so dogs, litters and
photo albums fill in by themselves.

**What it is not:**
- No self-serve checkout. Nobody buys a site with a click; you approve every one.
- No code for breeders. They fill in forms and upload photos; you own the templates.

---

## 1. The flow

| # | Step | Who | What happens |
|---|---|---|---|
| 1 | **Request** | Breeder, in KennelOS | Presses **Request a website**. You receive an email and the request appears in your console. |
| 2 | **Set up** | You | In your console: pick the subdomain, kennel name, owner's email and template. No DNS or Worker work for each site (see 2.1). |
| 3 | **Draft** | You | You fill in the site (about, dogs, photos, contact) and preview it at its real address behind a private preview link. |
| 4 | **Hand over** | You, then the breeder | You press **Publish** and **Send invite**. The breeder gets an email and signs in with a code sent to their email (no password). |
| 5 | **Manage** | Breeder | Adds dogs, changes pictures, posts a litter, edits text, then presses **Publish**. |
| 6 | **Link KennelOS** (optional) | Breeder | Links their KennelOS. Dogs and litters ticked **Show on website** flow to the site. |
| 7 | **Share** | Breeder | Shares the site, dog pages and albums. Links show a photo preview on Facebook and in texts. KennelOS Companion shares carry the album links. |

Billing stays manual (an invoice, or a Pro add-on you switch on). Nothing in the system
takes payment.

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
- **Litters and puppies:** current and planned litters, parents, puppies with status (available, reserved, placed) and photos
- **Albums:** photo galleries, each with its own shareable link
- **Waitlist / apply:** a link or button to the KennelOS waitlist application (`/apply/...`), when they use it
- **Contact:** email, phone, social links
- **Optional pages:** FAQ, puppy care, testimonials

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

---

## 5. The KennelOS link

### 5.1 The principle: KennelOS publishes, KennelPort displays

KennelOS works the same way for Companion (`shared/data/companionExport.js`) and the
waitlist (a published "projection"):

- KennelOS builds a **site bundle** with an **allow-list**: every field copied by name,
  with no buyer names, prices unless chosen, notes, contracts or contacts. A new field
  in KennelOS never reaches the site until someone adds it to the list.
- Only records the breeder marks **Show on website** go into the bundle.
- KennelOS pushes the bundle to KennelPort. KennelPort never reads anything from KennelOS.

### 5.2 Linking

1. In KennelPort's manage app: **Link KennelOS** shows a one-time link code.
2. In KennelOS (Settings or Import/Export): **Connect website** takes that code. KennelPort
   returns a token, which KennelOS stores through `settings.js`.
3. From then on, KennelOS has a **Update website** button, and an optional auto-publish
   when a linked dog or litter changes.

### 5.3 Who owns which field

- **From KennelOS (read-only in KennelPort):** name, registered name, sex, date of birth,
  colour, health tests, litter dates, parents, puppy status.
- **KennelPort only:** website bio, photo choice and order, albums, page text, layout.
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
- **Request a website**: decide which editions get it (section 9).
- Service-worker precache entries and a cache bump for any new files.

---

## 6. Data model (sketch)

| Table | Key fields |
|---|---|
| `sites` | id, subdomain (unique), kennel_name, template, theme, status (`draft` / `live` / `suspended`), storage_limit, created_at |
| `site_users` | site_id, email_hash, role (`owner` / `editor`) |
| `sessions`, `login_codes` | as in KennelOS cloud |
| `requests` | id, kennel_name, contact email, message, source (`kennelos` / `form`), status (`new` / `in_progress` / `done` / `declined`) |
| `dogs`, `litters`, `puppies` | site_id, slug, content fields, `source` (`kennelport` / `kennelos`), `kennelos_id` when linked, `draft_json`, `published_json` |
| `pages` | site_id, slug, section type, draft and published content |
| `redirects` | site_id, old path, new path (kept when a slug changes) |
| `photos` | site_id, r2_key, thumb_key, width, height, bytes, alt text |
| `albums`, `album_photos` | site_id, title, slug, cover; ordered photo list |
| `links` | site_id, token_hash, linked_at, last_publish_at |

R2 keys look like `sites/<site_id>/photos/<photo_id>.webp`, so a whole site can be deleted
or exported at once.

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
| **1. Renderer + ops** | One template, the ops console, preview links, publish, reserved names, OG tags | Build and host sites for breeders yourself, with no breeder login yet |
| **2. Requests** | Public request form + email alert to you; ops inbox | Take requests (from a link you send, before KennelOS has a button) |
| **3. Breeder login** | Email-code sign-in, manage app, drafts and publish, photo upload with resizing and location removal, storage limits | Hand sites over to breeders |
| **4. Albums & sharing** | Albums, share links, QR codes, nicer previews | Breeders share albums |
| **5. KennelOS link** | Link codes, the bundle API in KennelPort; then in KennelOS: Show on website, `siteExport.js`, Request a website, Update website, filling `dog.url` | Data flows from KennelOS; Companion shares carry album links |
| **6. Later** | Custom domains (Cloudflare for SaaS), more templates, visitor stats, contact form | — |

---

## 9. Decisions to make

1. **Domain:** `kennelport.com` (decided 2026-10-09). Still open: should the manage app
   stay on `manage.kennelport.com` or move to a separate domain? A separate one is safer
   only if sites ever allow embedded code.
2. **Who can request a site:** Pro only, Lite too, or anyone (including non-KennelOS
   breeders through a public form)?
3. **Pricing:** a monthly fee, a setup fee plus monthly, or included with Pro? Billing
   stays manual either way.
4. **Accounts:** a separate KennelPort sign-in (simplest, keeps the products independent)
   or a shared KennelOS cloud account (one login, but ties KennelPort to the KennelOS
   Worker)? The recommendation is separate accounts with the link code.
5. **Auto-publish from KennelOS:** on every change, or only when the breeder presses
   **Update website**? The recommendation is the button first.
6. **Prices on puppy listings:** show, hide, or the breeder's choice per litter? This
   matches a KennelOS Companion decision.
7. **Embedded content** (YouTube, Facebook posts): allowed? It's a security choice.
   Embeds from a short approved list are reasonable.
8. **Content rules and suspension:** terms of service, what gets a site suspended, and
   what happens to the data when someone leaves (export, then delete after N days).

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| One bad site gets the whole domain blocklisted | You approve every site; one-click suspend; terms of service; no customer code |
| Photos reveal a breeder's home | Location data removed on upload; addresses shown only as town and region |
| Private KennelOS data leaks to a public site | Allow-list bundle with a positive key check, and per-record opt-in (section 5.1) |
| Storage creep | Per-site limits; delete files when photos and sites are removed |
| You become the bottleneck | Breeders handle routine edits themselves; you only do setup and design |
| Tie-in to one host | Plain D1 and R2 data, with a full export for each site |

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

**The parity rule:** every section, page and feature in this plan is built for a breeder
with no KennelOS first, as forms in the manage app. The KennelOS link only *fills in*
fields that already exist; it never unlocks a section, and nothing on a site checks
whether its breeder uses KennelOS. Each section below says what it is on its own, then
what changes when KennelOS is linked.

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

- **Home:** kennel name, logo, hero photo, short intro, an optional announcement banner (section 3.9)
- **About:** the kennel's story, breed(s), location (town and region only, never a street address), visiting policy, memberships and breeder programs (section 3.9)
- **Our dogs:** a card per dog (name, registered name, sex, photos, titles, health testing as section 3.7 allows, short bio, pedigree) linking to a dog page
- **Litters and puppies:** current, planned and past litters, parents, puppies with status (section 3.6) and photos
- **Albums:** photo galleries, each with its own shareable link
- **Extras:** the paid extras she offers families (photo packages, training, …), grouped, with descriptions and prices (section 3.4)
- **Pickup and delivery:** her pickup places and transport policy (section 3.5)
- **Waitlist / apply:** an inquiry form on every site; or her own waitlist (KennelOS, or any other) embedded or linked (section 3.8)
- **Contact:** email, phone, social links, and the inquiry form (section 3.10)
- **Policies:** health guarantee, how reserving works, deposits and refunds, spay/neuter and returns (section 3.9)
- **Optional pages:** FAQ, puppy care and going home, the breed, families' stories (testimonials), news, stud dogs, adults available, downloads (section 3.9)
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
| Past litters | `/litters/past` |
| Adults available | `/adults` |
| Stud dogs | `/stud` |
| Extras | `/extras` |
| Pickup and delivery | `/pickup` |
| Waitlist or application | `/waitlist` |
| Policies | `/policies` |
| Going home | `/going-home` |
| The breed | `/breed` |
| Families' stories | `/stories` |
| News, one post | `/news`, `/news/spring-litter-born` |
| Events | `/events` |
| Downloads | `/downloads` |
| Contact, FAQ, privacy | `/contact`, `/faq`, `/privacy` |
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

**On its own:** she types every price in KennelPort.
- A litter can carry a price per sex (or one price) and a deposit per sex; a puppy can
  override its litter's price.
- **Registration:** a litter can add a surcharge for full registration (KennelOS's
  `full_reg_surcharge_male` / `_female`), shown as "Full registration: +$X".
- Each litter has a **Show prices** switch, off by default. When off, the site shows
  "Contact us for pricing".
- Puppies marked reserved or placed never show a price.
- A short notice under prices (her wording; KennelOS's turn cards say prices are
  intended base prices and may change before contract signing).
- The same **Show prices** rule covers every other price on the site: extras (3.4), the
  delivery fee (3.5), stud fees and adults (3.9). Off, each shows "Contact us".

**With KennelOS linked:** decided 2026-10-09 that **KennelOS never sends a price**, so a
linked breeder types prices in KennelPort like anyone else. **To revisit (decision 6):**
KennelOS has since gained litter prices (price and deposit per sex, a full-registration
surcharge, already shown on families' turn cards), an extras price list (3.4) and a fee
per mile (3.5). Keeping the rule means typing each price twice and watching them drift
apart. The proposal: the bundle may carry them, still shown only where she turns prices
on.

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
| Google Forms | a form she already uses (a waitlist or application) | iframe from `docs.google.com/forms/.../viewform?embedded=true` |
| Jotform | a form she already uses | iframe from `form.jotform.com` |
| KennelOS waitlist | her KennelOS application form and public list (section 3.8) | iframe from the KennelOS family-page host |

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

**On its own:** `/extras` lists the paid extras she offers families (photo and video
packages, training stays, boarding, a crate or puppy pack, …): each with a name,
optional group, description, photo and price (prices follow section 3.2's **Show prices**
rule). She adds and orders them in the manage app. Visitors ask about an extra through
the inquiry form (section 3.10); nothing on the site takes an order or a payment.

**With KennelOS linked:** KennelOS has its own extras price list (name, amount, group,
description, whether families may request it), and families request extras on their
KennelOS status page, which shows names only and a **See our extras and prices** link to
her own page (`extras_info_url`).
- The list fills from KennelOS (prices follow decision 6); photos and order stay hers in
  KennelPort.
- KennelOS can fill `extras_info_url` with the site's `/extras` address, so the status
  page links straight to it.

### 3.5 Pickup and delivery page

**On its own:** `/pickup` lists her pickup places (a name, the town or a public place, and
notes such as "by the north entrance") and her delivery policy in plain words: how far she
will drive or meet, a fee per mile or a flat fee (when prices show), and whether she uses
a flight nanny. Never her home address: the form asks for a public place, and a hint says
why (section 10).

**With KennelOS linked:** KennelOS records her pickup places (each with **Show to
families**; one is her standard location, where mileage starts) and her transport settings
(fee per mile, one way or round trip, free under some miles, how far a family must live to
suggest their own meetup place, the "we'll be in touch" distance).
- Only places marked **Show to families** come over.
- The policy sentence is written from her settings: "Families at least 40 miles away can
  ask us to meet nearer to them; beyond 150 miles, we'll be in touch about driving or a
  flight nanny." The fee per mile only if prices show (decision 6).
- Pickup times and booking stay on the KennelOS status page.

### 3.6 Puppy statuses

**On its own:** each puppy has a status she picks from a fixed list, and each label shows
the same way on every site:

| Status | What visitors see |
|---|---|
| Available | Available, with its price if prices show |
| Reserved | Reserved, no price |
| Placed | Placed (or hidden, per litter) |
| Staying with us | Staying with us, no price |
| Coming soon | Not yet available, no price |
| Hidden | Not shown |

**With KennelOS linked:** the status is worked out in KennelOS and arrives read-only, with
the same availability check its waitlist uses (`isPupAvailable`), so the site and the
waitlist never disagree:

| KennelOS | Site status |
|---|---|
| available, no open pick | Available |
| a waitlist pick awaiting its deposit, or a sale before delivery | Reserved |
| placed | Placed |
| keeping | Staying with us |
| undecided | Coming soon |
| health hold | Hidden |

### 3.7 What's public

**On its own:** she decides per dog and per litter what shows, with private defaults:
- **Health tests:** each result she enters (test, result, date, and the lab's public
  verification link where one exists, such as OFA's) has **Show on site**, off by
  default; a dog can show **Normal results only** or **All results**. Uploaded
  certificates are never public unless she ticks them.
- **Titles and awards:** typed per dog (CH, GCH, CGC, …), shown on the dog card.
- **Planned litters:** shown or not per litter; a planned breeding can show as month and
  year only.
- **Never:** a buyer, a family, an address or a sale.

**With KennelOS linked:** the bundle applies the choices she already made for KennelOS's
public list and status pages, so nothing hidden there appears on her website:
- health tests per her `parent_tests` setting and each dog's override, using the Normal /
  Abnormal flag on each result; certificates in her private vault are never sent;
- titles from her logged show results;
- planned litters per her **Coming up** public switches (planned heats month and year
  only, planned pairings, confirmed pairings, whelped litters before picks open).

### 3.8 The waitlist on the site

**On its own:** `/waitlist` (shown as "Apply" or "Puppy application", her choice) is one of:
- **The site's inquiry form** (section 3.10), set up as a puppy application with her own
  questions; answers are emailed to her. KennelPort is not a waitlist: no list, no
  places in line.
- **A link or embed of the waitlist she already uses** (a Google Form, Jotform, …),
  through the approved embed list (section 3.3) or as a button.
- A **Waitlist open / closed** switch with her message ("Our waitlist for 2027 is full").

**With KennelOS linked (Pro waitlist):** KennelOS's waitlist form and public list can be
embedded on her own site (`embed.js`, her **On your website** settings), so `/waitlist`
embeds both.
- KennelPort's Content Security Policy allows frames from the KennelOS family-page host.
- KennelOS must list the site among the sites allowed to embed her waitlist; **Connect
  website** adds it.
- The site's Litters section and the public list's **Available Puppies** draw on the same
  KennelOS data, so they agree.

### 3.9 Standard breeder-site features

What visitors expect on a breeder's website, whether or not she uses KennelOS. All are
KennelPort content only; KennelOS fills none of them. Each is a section she turns on.

**Trust and buying a puppy**
- **Policies:** health guarantee, how reserving works (application, deposit, pick order),
  deposit and refund terms, spay/neuter or breeding rights, and her lifetime take-back or
  rehoming policy. Plain text sections with headings, linked from every puppy page.
- **How to pay safely:** the payment methods she accepts and a standard warning about
  puppy scams ("We'll never ask for payment by gift card; we only use the contacts on this
  site"). On by default, because impersonation scams copy breeders' photos and names.
- **Memberships and programs:** breed club and kennel club memberships and breeder
  programs (AKC Breeder of Merit, Bred with H.E.A.R.T., …), as names with optional links.
  No logo images unless she has the right to use them.
- **Visiting policy:** by appointment only, what to expect, health precautions.
- **Families' stories (testimonials):** a quote, a first name and town, an optional photo
  of the grown dog, added by her with the family's permission (a checkbox she ticks to
  confirm). Never collected automatically from visitors.

**Dogs and litters, beyond the basics**
- **Pedigree:** a three-generation pedigree on each dog page, typed in (or from KennelOS
  when linked: its pedigree-only ancestors), with titles.
- **Past litters:** a litter archive ("Where are they now") with photos, no buyer names.
- **Adults available:** retired or adult dogs looking for homes, with the same statuses.
- **Stud dogs:** a stud page per male she offers at stud: health testing, titles,
  requirements for outside females, "Contact us" (fees follow the prices rule).
- **The breed:** a page about the breed, temperament, care and grooming, with links to
  the parent club.

**Keeping families informed**
- **Announcement banner:** one line across the top of every page ("Spring litter born
  March 3!"), with an end date.
- **News:** short dated posts with a photo (litter born, show results, puppy updates);
  newest on Home. Each post has its own address and share preview.
- **Going home:** what comes with a puppy, food, vaccines given, a first-week checklist,
  and training tips.
- **Downloads:** PDFs she uploads (puppy application, sample contract, care guide), within
  her storage limit; scanned PDFs are checked to be PDFs and served as downloads.
- **Events:** shows and events she'll attend, with dates and towns.

**Basics of a good website**
- **Search and sharing:** a title and description per page, structured data
  (schema.org `LocalBusiness` with town and region only), `sitemap.xml`, a share image per
  page, and a favicon from her logo.
- **Google Business Profile** and social links, shown as links (no tracking scripts).
- **Accessibility:** alt text asked for on every photo upload, colour choices checked for
  contrast, every page usable by keyboard and screen reader.
- **Privacy page:** generated for every site (what the inquiry form collects, that the
  site sets no tracking cookies), with her contact details.
- **Visitor stats** (phase 6): page counts without cookies (Cloudflare Web Analytics).

### 3.10 The inquiry form

Every site has one form, used for Contact, puppy applications (section 3.8) and questions
about extras, pickup or stud service. It works with no KennelOS at all.
- **Her questions:** name and email always; then the fields she chooses (phone, town,
  which litter or dog, preferences, a free-text message), from a fixed list of field types.
- **Delivery:** emailed to her through Resend, with the visitor's email as reply-to.
  Kept in the manage app's inbox for 90 days, then deleted (decision 12), so a lost
  email isn't a lost family.
- **Spam:** Cloudflare Turnstile and per-site rate limits; no CAPTCHA puzzles.
- **No payments, no accounts** for visitors.
- **With KennelOS linked:** she can choose **Send to my KennelOS waitlist** instead, which
  embeds the KennelOS form (section 3.8). KennelPort never forwards inquiries into
  KennelOS by itself.

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
  order, albums, embeds, page text, layout, and everything in sections 3.9 and 3.10
  (policies, testimonials, news, stud and adults pages, downloads, events, the inquiry
  form and its inbox).
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
| `health_results` | site_id, dog, test, result, date, verify_url, show (off by default), certificate photo or file (private unless ticked) |
| `posts` | site_id, slug, title, date, body, cover photo (news, section 3.9) |
| `stories` | site_id, quote, first name, town, photo, permission_confirmed_at |
| `files` | site_id, r2_key, title, bytes (downloads, PDFs only) |
| `events` | site_id, title, date, town |
| `inquiries` | site_id, form answers, received_at, deleted after 90 days (section 3.10, decision 12) |
| `form_fields` | site_id, field type, label, required, order (the inquiry form's questions) |

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
| **4b. A complete breeder site** | The inquiry form and inbox (3.10), policies and safe-payment notice, puppy statuses (3.6), health results and pedigree (3.7, 3.9), extras and pickup pages (3.4, 3.5), waitlist page with outside forms (3.8), announcement banner, news, testimonials, past litters, adults, stud dogs, going home, the breed, downloads, events, privacy page, search basics | A breeder with no KennelOS has everything a breeder website needs |
| **5. KennelOS link** | Link codes, the bundle API in KennelPort; then in KennelOS: Show on website, `siteExport.js`, Request a website, Update website, filling `dog.url`, the kennel's website, `extras_info_url` and the embed's allowed sites; Extras, Pickup and Waitlist pages from the bundle | Data flows from KennelOS; Companion shares carry album links; status pages link to the site's extras |
| **6. Later** | Custom domains (Cloudflare for SaaS), more templates, visitor stats | — |

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
12. **Inquiry storage:** inquiries are emailed and also kept in the manage app's inbox for
    90 days (proposed), or emailed only and never stored. Storing means names and emails
    sit in KennelPort's database; the privacy page says so either way.
13. **Testimonials and permission:** proposed that she confirms each family agreed, with a
    date kept; visitors never post reviews themselves.
14. **Which standard pages ship first:** section 3.9 is long. Proposed for the first family
    site: policies, safe-payment notice, inquiry form, past litters, news, privacy; the
    rest as she asks.

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
| A scammer copies a breeder's site or photos to sell puppies that don't exist | The safe-payment notice on by default; official contacts on every page; you can point to the real site when families ask |
| The inquiry form attracts spam or collects more than it needs | Turnstile and rate limits; a fixed list of field types; inquiries deleted after 90 days (decision 12) |
| A non-KennelOS breeder gets a lesser site | The parity rule (top of the plan): every section is a KennelPort form first; KennelOS only fills fields |

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

Also on 2026-11-01: the **parity rule** was written down (top of the plan), sections 3.4–3.8
now describe each feature on its own first and with KennelOS second, and sections 3.9–3.10
add what a breeder website needs whether or not she uses KennelOS (policies, safe-payment
notice, testimonials, pedigree, past litters, adults, stud dogs, news, going home, the
breed, downloads, events, search and accessibility basics, a privacy page, and the inquiry
form).


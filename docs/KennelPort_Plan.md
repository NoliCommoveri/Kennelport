# KennelPort: high-level plan (DRAFT)

> Status: phases 0 to 3 are built (`worker/`); section 8.1 says how phase 3 came together.
> Section 8 says what version 1 is; section 9 lists the one decision still open. What comes after version 1 is
> in [`KennelPort_Backlog.md`](KennelPort_Backlog.md). History of this plan lives in
> [`BUILD_LOG.md`](BUILD_LOG.md).

KennelPort hosts breeder websites. Each kennel gets a site at `theirkennel.kennelport.com`.
The operator (you) sets up and drafts every site by hand. Breeders then manage their own
content through a simple login. Breeders who use KennelOS can link it so dogs, litters
and photo albums fill in by themselves.

**Version 1 is one site.** The first site is for a family member, and KennelPort is not
for sale. The design below allows for more breeders, but version 1 (section 8) builds only
what that first site needs. Everything else is a backlog, built when someone asks for it
([`KennelPort_Backlog.md`](KennelPort_Backlog.md)).

**The target is the AK sample.** A working sample of the first site, AK Boston Terriers,
was built as one page and approved by the owner: every page in the five-item menu, flip
cards, sliding sets, expanders, the extended-homegoing extras and the KennelOS waitlist
shown in the site's own style. Version 1 is that sample made real: the same look,
with its content in forms (section 3.12), a choice of colour schemes (section 3.13) and
pages a breeder can switch off, plus the two things the first breeder wants most: the
**KennelOS link**, so dogs, litters and health results come from KennelOS instead of being
typed twice (section 5), and **albums and embeds** (section 3.3). The sample's source is
[`reference/ak-sample.html`](reference/ak-sample.html); the reference folder's README
says what's real and what's made up in it.

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
| 1 | **Request** | Breeder | Version 1: they ask you directly. Later, a **Request a website** button in KennelOS Pro and a public request form (backlog section 2). |
| 2 | **Set up** | You | In your console: pick the subdomain, kennel name, owner's email and template. No DNS or Worker work for each site (see 2.1). |
| 3 | **Draft** | You | You fill in the site (about, dogs, photos, contact) and preview it at its real address behind a private preview link. |
| 4 | **Hand over** | You, then the breeder | You press **Publish** and **Send invite**. The breeder gets an email and signs in with a code sent to their email (no password). |
| 5 | **Manage** | Breeder | Adds dogs, changes pictures, posts a litter, edits text, then presses **Publish**. |
| 6 | **Link KennelOS** (optional, KennelOS users only) | Breeder | Links their KennelOS. Dogs and litters ticked **Show on website** flow to the site. |
| 7 | **Share** | Breeder | Shares the site, dog pages and albums. Links show a photo preview on Facebook and in texts. KennelOS Companion shares carry the album links. |

Nothing in the system takes payment, and nothing in this plan depends on a price.

---

## 2. Architecture

### 2.1 One Worker serves every site (not one Worker per customer)

You do the setup work, but it's a row in a database, not new infrastructure:

- **Once, at the start:** a wildcard DNS record `*.kennelport.com`, a Worker route
  `*.kennelport.com/*`, and Cloudflare's free certificate, which covers every first-level
  subdomain.
- **For each new kennel:** you add a site in your console. The Worker reads the hostname
  on each request, looks the site up, and renders it.

A Worker per customer would mean deploying and updating a copy of the same code per
breeder. One shared renderer means a template fix reaches every site at once.

### 2.2 Pieces

```
 visitor ──▶ thornfieldkennels.kennelport.com ─┐
                                               │   ┌──────────── Worker: kennelport ────────────┐
 breeder ──▶ manage.kennelport.com            ─┼──▶│ renderer     public sites, OG previews     │──▶ D1  (sites, dogs, litters, pages, users)
 you     ──▶ manage.kennelport.com/ops        ─┤   │ manage API   breeder sign-in + editing     │──▶ R2  (photos: full + thumbnail; files; snapshots)
 KennelOS ─▶ api.kennelport.com               ─┘   │ ops          requests, set up, drafts      │──▶ Resend (sign-in codes, invites)
                                                   │ link API     KennelOS publishes here       │
                                                   └────────────────────────────────────────────┘
```

| Part | Purpose |
|---|---|
| **Renderer** | Server-side HTML from a template plus the site's published snapshot (section 4.1). Fast, works on any phone, good for search engines. No customer JavaScript. |
| **Manage app** | Pages on the reserved `manage` host, rendered by the Worker. Forms for each section, built from the same content model the import and the snapshot use (`worker/src/content/model.js`, wording in `worker/src/manage/forms.js`); photo upload with in-browser resizing. |
| **Ops console** | Your side: create site, edit any site, preview, publish, suspend, invite; later the request inbox. Same pattern as `cloud/`'s `/ops` in KennelOS. Until the manage app's forms exist (phase 2), you edit a site's content as one JSON document (download, edit, paste back), checked against the content model (`worker/src/content/model.js`) that the forms will use too; photos upload with the same resizing and checks as section 4.2. |
| **D1** | All draft content and accounts. Tens of MB at most. |
| **R2** | Photos, downloads and published snapshots (section 4.1). About 200 MB a year per active breeder once photos are resized (section 7). |

Reserved subdomains (`www`, `manage`, `api`, `ops`, `admin`, `mail`, `support`, `sites`,
`kennelos`, `kennelport`, …) can never be given to a site.

### 2.3 Separate repo, separate Worker

KennelPort lives in this repo and deploys as its own Worker. It is not part of the
KennelOS `cloud/` Worker. KennelOS treats it like any optional service: with no KennelPort
URL configured, nothing about it shows or runs. That matches the KennelOS rule that
`cloudUrl: null` must work.

**Staging and production** are two Workers from the same code (`worker/wrangler.toml`),
each with its own D1 and R2. Production answers on `kennelport.com` and
`*.kennelport.com`. Staging lives on its `workers.dev` address, which can't receive those
hostnames, so on staging only a cookie set by `/__host?h=<hostname>` stands in for the
hostname and the same routing is tested there; without it, staging acts as the manage
host. One-time dashboard steps: [`KennelPort_Setup.md`](KennelPort_Setup.md).

### 2.4 Custom domains (their own domain)

A breeder can use a domain they own, such as `thornfieldkennels.com`, instead of the
`kennelport.com` address. It works the same for every breeder, with or without KennelOS.

**How it runs (once, by you):** turn on Cloudflare for SaaS on the `kennelport.com` zone,
with a fallback host `sites.kennelport.com` pointing at the one Worker. Each breeder's
domain is a **custom hostname** on that zone: Cloudflare issues and renews its
certificate, and the Worker finds the site from the hostname, as it already does for
subdomains (a `custom_domains` table maps one to the other). From memory, about 100
custom hostnames are included free and each one after costs roughly $0.10 a month; check
current pricing (section 7).

**Version 1: by hand.** For the first site, you do it yourself in about ten minutes:

1. In the Cloudflare dashboard, add `www.theirdomain.com` as a custom hostname.
2. At the breeder's registrar (with them, or through the provider's delegate access),
   add a CNAME for `www` pointing to `sites.kennelport.com`, plus any TXT record
   Cloudflare asks for. Don't change nameservers or delete other records (that's where
   email lives).
3. Point or forward the bare domain to `www` (decision 15).
4. When Cloudflare shows the hostname active, add the row to `custom_domains` in the ops
   console.

New domains should be bought in the breeder's own name, never yours, so they keep it if
they leave. Guided steps that check themselves are backlog (backlog section 3).

**Once connected:**
- The custom domain becomes the site's main address: links, share previews, `sitemap.xml`
  and the address KennelOS is given all use it.
- The `kennelport.com` address redirects there with the same path, so old links keep
  working.
- **A daily check:** if the domain stops pointing at KennelPort (it expired, or the records
  changed), the `kennelport.com` address stops redirecting and serves the site again; you are
  emailed, and the breeder sees a notice in the manage app and gets a push notification
  (section 3.10). KennelPort keeps no readable breeder email address to write to
  (section 6).
- **Removing it** (ops console, or closing the site): the custom hostname is deleted and
  the `kennelport.com` address is the main one again. The domain itself is theirs to keep.

---

## 3. What a site contains (the template's sections)

Breeders fill in fields; the template handles layout. Version 1 needs one good template
(the AK sample's), with colour schemes (section 3.13) and the customisation in section
3.12: pages and Home blocks turned on and off, steps, extras and expanders added and
reworded. How it looks and
behaves (flip cards, sliding sets, nested menus and expanders, ornaments, font pairings)
is in [`KennelPort_Design_Direction.md`](KennelPort_Design_Direction.md). The sections:

- **Home:** kennel name, logo, hero photo, short intro, an optional announcement banner (section 3.9)
- **About:** the kennel's story, breed(s), location (town and region only, never a street address), visiting policy, memberships and breeder programs (section 3.9)
- **Our dogs:** a card per dog (name, registered name, sex, photos, titles, health testing as section 3.7 allows, short bio, pedigree) linking to a dog page
- **Litters and puppies:** current, planned and past litters, parents, puppies with status (section 3.6) and photos
- **Albums:** photo galleries, each with its own shareable link
- **Extras:** the paid extras the breeder offers families (photo packages, training, …), grouped, with descriptions and prices (section 3.4)
- **Pickup and delivery:** pickup places and transport policy (section 3.5)
- **Waitlist / apply:** an inquiry form on every site; or the breeder's own waitlist (KennelOS, or any other) embedded or linked (section 3.8)
- **Contact:** email, phone, social links, and the inquiry form (section 3.10)
- **Policies:** health guarantee, how reserving works, deposits and refunds, spay/neuter and returns (section 3.9)
- **Optional pages:** FAQ, puppy care and going home, the breed, reviews and families' stories, news, stud dogs, adults available, downloads (section 3.9)
- **Buying and raising:** how it works, programs such as guardian homes, how we raise puppies, how to pay safely (section 3.11)
- **More dog and litter pages:** retired dogs, in memory, older puppies, show results, a litter diary, and planned-litter pages with their status and picks (section 3.11)
- **Embeds:** videos and social feeds placed on any page (section 3.3)

Version 1 builds the sections in decision 14; the others are designed in
[`KennelPort_Backlog.md`](KennelPort_Backlog.md), and their addresses (3.1) and KennelOS
fields (5.3) are kept here so the template and the link are designed once.

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
| Using your status page | `/waitlist/help` |
| Policies | `/policies` |
| Going home | `/going-home` |
| The breed | `/breed` |
| Reviews | `/reviews` |
| Families' stories (puppies at home) | `/stories` |
| Retired dogs, in memory | `/dogs/retired`, `/dogs/remembered` |
| Older puppies | `/litters/older` |
| A litter's diary | `/litters/willow-x-ranger-2026/diary` |
| Show results | `/shows` |
| How it works | `/how-it-works` |
| Programs (guardian homes, …) | `/programs` |
| How we raise puppies | `/raising` |
| How to pay safely | `/pay-safely` |
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
  break (redirects are recorded at publish time, section 4.1). Linked records also keep
  their KennelOS id, so renaming in KennelOS doesn't break links either.
- **Custom domains** (section 2.4) keep the same paths:
  `www.thornfieldkennels.com/about`, with the `kennelport.com` address redirecting there.
  The "no `www.`" rule above is only about `kennelport.com` addresses.
- Every site also gets `/sitemap.xml` and `/robots.txt` for search engines.

### 3.2 Prices

**On its own:** the breeder types every price in KennelPort.
- A litter can carry a price per sex (or one price) and a deposit per sex; a puppy can
  override its litter's price.
- **Registration:** a litter can add a surcharge for full registration (KennelOS's
  `full_reg_surcharge_male` / `_female`), shown as "Full registration: +$X".
- Each litter has a **Show prices** switch, off by default. When off, the site shows
  "Contact us for pricing" for that litter and its puppies.
- Puppies marked reserved or placed never show a price.
- **Ranges:** any price can be one amount or a from–to range ("$2,500–$2,800"), as breeders
  often price by puppy within a package.
- A short notice under prices, in the breeder's wording (KennelOS's turn cards say prices
  are intended base prices and may change before contract signing).
- Prices that don't belong to a litter (extras, 3.4; and in the backlog the delivery fee,
  stud fees and adults) follow one site-wide **Show other prices** switch, also off by
  default. Off, each shows "Contact us". "Prices show" elsewhere in this plan means the
  switch that covers that price is on.

**With KennelOS linked (decision 6):** the breeder chooses, with a **Use my KennelOS
prices** switch in the manage app, off by default.
- *Off:* KennelOS sends no prices; the breeder types them in KennelPort like anyone else.
- *On:* the bundle carries KennelOS's litter prices (price and deposit per sex, the
  full-registration surcharge), its extras price list (3.4) and the fee per mile (3.5),
  so each is typed once. They're read-only in KennelPort while the switch is on, and
  still show only where the breeder turns the matching switch on.

### 3.3 Embeds (YouTube, Facebook and others)

Breeders can embed content from several providers. The safe way to do that is to **never
store the HTML a breeder pastes**:

1. The breeder pastes an ordinary link (a YouTube video, their Facebook page, …).
2. The server checks it against a fixed list of providers and link patterns, and stores
   only the **provider and the item's id** (for example `youtube` + `dQw4w9WgXcQ`).
3. The renderer builds the embed itself from a template for that provider.

| Provider | What can be embedded | Built as | Preview before click |
|---|---|---|---|
| YouTube | a video, a playlist | iframe from `youtube-nocookie.com` | its thumbnail |
| Facebook | a page's timeline, a post, a video | iframe from Facebook's plugin addresses (no Facebook script on the page) | placeholder |
| Instagram | a post or reel | iframe from the post's `/embed` address | placeholder |
| TikTok | a video | iframe player | its thumbnail |
| Vimeo | a video | iframe player | its thumbnail |
| Google Maps | the kennel's town or region (never a street address) | iframe | placeholder |
| Google Forms | a form the breeder already uses (a waitlist or application) | iframe from `docs.google.com/forms/.../viewform?embedded=true` | placeholder |
| Jotform | a form the breeder already uses | iframe from `form.jotform.com` | placeholder |
| KennelOS waitlist | the breeder's KennelOS application form and public list (section 3.8) | iframe from the KennelOS family-page host | placeholder |

- The list is in one place in the code; adding a provider means adding one entry there.
- **Click to load:** an embed shows a preview with a play button until a visitor clicks.
  Pages load faster, and Facebook or Google don't track visitors who never press play.
- **Where previews come from:** when the embed is saved, the server fetches the thumbnail
  once (YouTube's public image address; Vimeo's and TikTok's public oEmbed) and stores a
  copy in R2, so pages only load images from the site itself. Facebook's and Instagram's
  oEmbed need an app token, so their embeds, and the map and form embeds, show a plain
  placeholder: the provider's name and a title the breeder types.
- If a provider removes an item or changes its embed, the site shows a plain link
  instead of a blank box.

**Outside services and libraries.** The template may use any free font, library or
outside service it needs; the only rule is that it costs nothing. **Fonts and libraries
are served from the site itself**, never from Google Fonts' or a CDN's servers: the font
files (all under the SIL Open Font License, which allows this) and libraries such as
Swiper or PhotoSwipe are copied into the template and served by the Worker. Loading them
from a third party would hand that party every visitor's IP address on every page, which
is exactly what click-to-load embeds avoid. Only services that have to run elsewhere load
from outside: Cloudflare Turnstile, on the form pages only, and in the backlog Cloudflare
Web Analytics and a reviews widget. Every page sends a Content Security Policy listing
exactly those services plus the embed providers above, so a breeder's content still
can't load anything else (breeders never add code).

Because embeds are built by KennelPort and breeders never add their own code, the manage
app can stay on `manage.kennelport.com` (see section 9).

### 3.4 Extras page

**On its own:** `/extras` lists the paid extras the breeder offers families (photo and
video packages, training stays, boarding, a crate or puppy pack, …): each with a name,
optional group, description, photo and price (prices follow section 3.2's **Show other
prices** switch). They add and order them in the manage app. Visitors ask about an extra through
the inquiry form (section 3.10); nothing on the site takes an order or a payment.

**Extended homegoing packages** are a kind of extra with more structure, because breeders
sell them as alternatives to the standard go-home age (the first site offers 10-, 12- and
16-week packages). Each has:
- the **age in weeks**, shown large on its card;
- a **name** ("12-Week Extended Homegoing") and a **price or price range** (3.2);
- a short **description**, a lead-in line ("Your puppy will continue receiving:") and a
  **checklist** of what's included, any length, shown under a **What's included** expander;
- an optional closing paragraph, and an optional **Most complete** mark on one package.
Packages show side by side as cards on `/extras` (stacked on a phone), above any ordinary
extras, each with **Ask about this package** opening the inquiry form with the package
named. A note under them, in the breeder's words, says whether the price is the whole
puppy price or an add-on.

**With KennelOS linked:** KennelOS has its own extras price list (name, amount, group,
description, whether families may request it), and families request extras on their
KennelOS status page, which shows names only and a **See our extras and prices** link to
the breeder's own page (`extras_info_url`).
- The list fills from KennelOS (prices follow decision 6); photos and order stay in
  KennelPort.
- KennelOS can fill `extras_info_url` with the site's `/extras` address, so the status
  page links straight to it.

### 3.5 Pickup and delivery page

Backlog ([`KennelPort_Backlog.md`](KennelPort_Backlog.md) section 4). Version 1 shows
no pickup page; the address and the fields KennelOS fills are kept here so the link is
designed once.

### 3.6 Puppy statuses

**On its own:** each puppy has a status the breeder picks from a fixed list, and each label
shows the same way on every site:

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

**Undecided puppies (decision 10):** an Undecided puppy is not for sale anywhere: not on
the site, not on KennelOS's waitlist and not in Companion shares. The site shows it as
Coming soon, with no price and no **Ask about this puppy**. KennelOS's waitlist today
still treats Undecided as offerable (only Keeping, Placed and Health hold are held back),
so `isPupAvailable` and Companion's export change to hold it back too (section 5.5); until
they do, the site and the waitlist can disagree about an Undecided puppy.

### 3.7 What's public

**On its own:** the breeder decides per dog and per litter what shows, with private
defaults:
- **Health tests:** each result they enter (test, result, date, and the lab's public
  verification link where one exists, such as OFA's) has **Show on site**, off by
  default; a dog can show **Normal results only** or **All results**. Uploaded
  certificates are private unless ticked (section 4.2 says how that's enforced).
- **Titles and awards:** typed per dog (CH, GCH, CGC, …), shown on the dog card.
- **Planned litters:** shown or not per litter; a planned breeding can show as month and
  year only.
- **Never:** a buyer, a family, an address or a sale.

**With KennelOS linked:** the bundle applies the choices already made for KennelOS's
public list and status pages, so nothing hidden there appears on the website:
- health tests per the `parent_tests` setting and each dog's override, using the Normal /
  Abnormal flag on each result; certificates in the KennelOS private vault are never sent;
- titles from logged show results;
- planned litters per the **Coming up** public switches (planned heats month and year
  only, planned pairings, confirmed pairings, whelped litters before picks open).

### 3.8 The waitlist on the site

**Where an application goes (decision 26).** One rule, worked out by the site, not a
setting the breeder can get wrong:
- **The breeder takes applications online in KennelOS** (their waitlist is connected and
  the website feed carries an `apply` link, which KennelOS sends only while it takes
  applications online; with the frame embed instead, the embedded KennelOS form is the
  application):
  every **Apply** button on the site, including **Apply to join the waitlist** and a
  litter's **Apply for this litter**, opens KennelOS's own application page
  (`/apply/<public_id>`). The application goes through KennelOS's live list flow (the
  emailed code, the breeder's KennelOS inbox, KennelOS's own alerts) and never touches
  KennelPort. The site offers no KennelPort application form, and no application ever
  lands in KennelPort's Inbox.
- **Otherwise** (no KennelOS, or KennelOS without online applications, so the breeder runs
  their list by hand): the site's own application form below, arriving in KennelPort's
  Inbox as a message (section 3.10). This includes a connected KennelOS waitlist whose
  online form is off: the feed has no `apply` link, so the site shows KennelPort's form.
  A breeder who wants no applications at all uses the **Waitlist open / closed** switch.
- Plain questions through the Contact form (section 3.10) come to KennelPort's Inbox either
  way.

**On its own:** `/waitlist` (shown as "Apply" or "Puppy application", the breeder's
choice) is one of:
- **The site's inquiry form** (section 3.10), set up as a puppy application with the
  breeder's own questions; answers arrive in the manage app's Inbox, with a push
  notification (section 3.10). This is the manual route; it's never shown while
  KennelOS takes applications online (above).
- **The simple waitlist** (decided 2026-11-02, replacing "KennelPort is not a
  waitlist"): a list the breeder keeps by hand, with no automation (no turns, deadlines,
  status pages or matching; that's KennelOS's waitlist). **Add to waitlist** on an
  application in the Inbox (name, email and phone carried over, a starting "wants" line
  from the short answers, all editable), or **Add a family** for someone who applied
  another way. **Your waitlist** in the manage app lists families in order, each with
  **Offer pups** (her own email, filled in: "It's your turn to choose a pup! Please review
  the available puppies on our website and reach out to us with your selection.", a link
  to the Puppies page and her kennel name; the wording is a waitlist page setting),
  **Fulfilled** (off the list, everyone below moves up; **Put back** returns them to their
  place; deleted 90 days later), up and down, and Edit. The waitlist page shows it live,
  with no publish, above the application form, drawn like the KennelOS list: place, the
  name on the list (first name and last initial, editable, like "Megan R."), what they
  want and the date added behind an ⓘ; never an email or phone. The application form
  says names show that way, and offers **Keep my name private**: masked as KennelOS
  masks them, the first name's first letter and an asterisk for each letter after it,
  then the last initial (Andrea Kim shows as "A***** K"). The tick comes with the
  application, so Add to waitlist starts masked; the breeder can tick it for anyone.
- **The manage app steers by the KennelOS link.** Unlinked, **Waitlist and application**
  opens with the KennelOS card saying a KennelOS waitlist can be linked, and Your
  waitlist mentions it. Linked, the **Your waitlist** tile is greyed ("Not used: your
  website shows your KennelOS waitlist"), its screen says so and drops Add a family, and
  the Inbox drops Add to waitlist; while KennelOS takes applications online, the
  application questions are marked not used too. Greyed screens still open, so nothing
  set up is hidden. Not shown while a KennelOS feed is set: KennelOS's list
  wins, so a family is never on two lists.
- **A link or embed of the waitlist they already use** (a Google Form, Jotform, …),
  through the approved embed list (section 3.3) or as a button. Backlog; version 1 has
  the other two.
- A **Waitlist open / closed** switch with their message ("Our waitlist for 2027 is full").

**With KennelOS linked (Pro waitlist):** KennelOS's waitlist form and public list can be
embedded on the breeder's own site (`embed.js`, the **On your website** settings), so
`/waitlist` embeds both.
- KennelPort's Content Security Policy allows frames from the KennelOS family-page host.
- KennelOS's **On your website** setting must have embedding switched on. Its list of
  allowed sites (`embed_origins`) is optional: empty means any site may embed. If the
  breeder has listed sites there, **Connect website** adds the KennelPort address (and
  the custom domain, once connected) so the embed keeps working.
- The site's Litters section and the public list's **Available Puppies** draw on the same
  KennelOS data, so they agree.

**Shown in the site's own style (decision 21).** An embedded frame keeps
KennelOS's own look, which clashes with the site's scheme. The AK sample instead draws the
list in the site's style: the same rows KennelOS publishes (position, listed name such as
"Megan R." or "A****** K", Wants, the added date behind an ⓘ), the gap note when paused
families are left out, a search box, and **Apply to join the waitlist**, above the
application form. Only the families: the site has its own puppy pages, so KennelOS's
Available Puppies and Coming up aren't drawn there, and the list carries no Current
Applicants sign-in box. Families on the list sign in from **Family login**: in the top
menu beside the Waitlist button, in the footer, and as a button on the status-page help
page, each opening KennelOS's sign-in (`/list/<public_id>#signin`) in a new tab. It's
part of the published site, so it appears (or goes) with the publish after the feed
address is saved (or removed). To do that for real:
- The Worker reads the kennel's **website feed** from KennelOS
  (`GET /f/site/<public_id>`: exactly the public list, plus paths for the list, sign-in
  and form), caches it for five minutes, and renders it with the site's scheme. KennelOS
  serves it only while the breeder has **Let my KennelPort website show my list in its
  own style** on; otherwise it answers 404 `not_shared`, and the page shows a link to the
  KennelOS list instead. The only KennelOS data KennelPort keeps is the last copy of
  this feed, the public list anyone can already see (`feed_cache`, section 6), replaced
  on each read and deleted when the breeder removes the feed address. The breeder pastes the
  feed address (shown on KennelOS's Online list card) into the manage app, which stores
  the kennel's `public_id`.
- **Current Applicants: See Your Details** opens KennelOS's own page
  (`/list/<public_id>#signin`) in a new tab, so sign-in codes never pass through
  KennelPort. The application form is drawn on the site (below), and KennelOS's own
  `/apply/<public_id>` page is its fallback.
- If KennelOS can't be reached, the page shows the last list it read with its "Updated"
  date, or a link to the KennelOS list.
- **Using your status page** (`/waitlist/help`): a **How to use your status page** button
  in the Current Applicants box opens a page the breeder writes for families already on
  the list: how to get a code and sign in, what the page shows, choosing a puppy or
  passing, asking for changes (a pause, which litters, a preference), messages and pickup
  times, leaving the list, signing in on a new device. Expanders, any number, in the
  breeder's words. New sites start with a draft outline that follows what KennelOS's
  status page can do (`cloud/public/family/status.js`), clearly marked as a draft until
  the breeder rewrites it. It has its own **On** switch, and appears only when the
  waitlist comes from KennelOS.
- **On a phone** the list stacks: number, then the name with what they want underneath,
  then the ⓘ, so it never runs off the screen or scrolls sideways. Every part of the
  page fits a 320px-wide screen.
- The frame embed stays available as a fallback.

**The KennelOS application form in the site's own style.** While the breeder takes
applications online in KennelOS, the form on `/waitlist` is KennelOS's form (her
questions, her FAQ, the matching notice and the public-list notice), drawn by the site
like the list, so a family never meets a page in another look before they've applied.
The application still goes only to KennelOS:
- **The feed carries the form.** `GET /f/site/<public_id>` adds `form` while KennelOS
  takes applications online: exactly what KennelOS's own form page reads from
  `/f/form/<public_id>` (questions, FAQ, breeds, matching keys and notice, the
  wording of each preference's choices, the public half of the form key and its id,
  and KennelOS's Turnstile site key). All of it is already public on the `/apply` page.
- **Sealed in the visitor's browser, sent straight to KennelOS.** The site's script
  seals the answers to the form key exactly as KennelOS's `seal.js` does (ECDH P-256,
  HKDF-SHA-256, AES-GCM), then sends them from the visitor's browser to KennelOS's
  `POST /f/apply/<public_id>`. KennelPort's server never sees the request, the answers
  or the name and email; nothing lands in KennelPort's Inbox (decision 26).
- **Confirming, on the same page.** KennelOS emails its 6-digit code; the visitor types
  it into the site's page, which sends it to KennelOS's `POST /f/verify` (and **send a
  new code** to `POST /f/code`). Then "Your application is in", with **See my details**
  opening KennelOS's sign-in on its list page in a new tab. Asked from a website,
  KennelOS's `/f/verify` confirms the application but returns no status link and no
  session, so no KennelPort page ever holds the key to a family's private status page;
  the family signs in on KennelOS to see it.
- **In KennelOS:** those three family endpoints answer cross-origin requests from
  KennelPort sites (`https://*.kennelport.com`, no credentials; custom domains once
  **Connect website** sends them, phase 4). They hold no cookie and no session, so CORS
  lets a site do only what any program could already do; Turnstile and the existing
  per-address and per-email limits stay the real guard. KennelOS's Turnstile widget
  lists `kennelport.com` among its hostnames (a setup step), since the check runs on the
  breeder's site.
- **In KennelPort:** the waitlist page's Content Security Policy allows Turnstile and
  connections to the KennelOS family host (`KENNELOS_ORIGIN`) on `/waitlist` only, and
  only while the feed carries a form. The page isn't cached with the snapshot while a
  feed is set: it's drawn from the snapshot and the feed's five-minute copy.
- **When it can't work:** with scripts off, the feed unreachable, or a form KennelOS
  changed since the feed was read (`409 form_changed`), the page links to KennelOS's own
  `/apply/<public_id>` instead, as before. A feed with no `form` (online applications
  off) shows KennelPort's own application form (decision 26, above).

### 3.9 Standard breeder-site features

What visitors expect on a breeder's website, whether or not the breeder uses KennelOS.
All are KennelPort content only; KennelOS fills none of them. Each is a section the
breeder turns on. These are the ones version 1 ships (decision 14); the rest (stories,
past litters, adults, stud dogs, the breed, a banner, news, going home, downloads, events,
visitor stats) are in the backlog doc, section 5.

**Trust and buying a puppy**
- **Policies:** health guarantee, how reserving works (application, deposit, pick order),
  deposit and refund terms, spay/neuter or breeding rights, and the lifetime take-back or
  rehoming policy. Plain text sections with headings, linked from every puppy page.
- **Safe-payment notice:** the payment methods the breeder accepts and a standard warning
  about puppy scams ("We'll never ask for payment by gift card; we only use the contacts
  on this site"), shown on the waitlist and puppy pages. On by default, because
  impersonation scams copy breeders' photos and names. A full **How to pay safely** page
  (`/pay-safely`) is backlog.
- **How to pay:** how a family pays the **application fee** and the **deposit**, shown
  openly on the site so nobody has to email to ask. For each of the two: the methods taken
  (Venmo, Zelle, PayPal, check, card…), the details for each (handle, email, who a check
  is made out to), what to write in the note ("your name and AK application"), when it's
  due ("once you're approved", "within 48 hours of choosing your puppy"), and an optional
  **Pay** button linking to the breeder's own payment page (Stripe, Square, PayPal). Each
  has its own **Show on website** switch, off until the breeder turns it on. This is how
  to pay, not what it costs: amounts follow the prices rule (section 3.2) and appear only
  if the breeder types them into the wording. It shows on the waitlist page beside
  **Apply**, under the matching How it works steps (3.11), and with the safe-payment
  notice, where it doubles as the list of the only real payment details. Nothing on the site takes a
  payment itself.
  - *With KennelOS linked:* filled from KennelOS's waitlist **payment instructions** and
    the fee account's pay link (`feePay`), the same text families already see on their
    status pages and the application page. It reaches the site only while the breeder's
    switch is on, and they can reword it in KennelPort.
- **Memberships and programs:** breed club and kennel club memberships and breeder
  programs (AKC Breeder of Merit, Bred with H.E.A.R.T., …), as names with optional links.
  No logo images unless the breeder has the right to use them.
- **Visiting policy:** by appointment only, what to expect, health precautions.
- **Reviews (decision 13):** families submit them on the site, and the breeder approves
  each before it shows.
  - *The form* (`/reviews`, **Share your review**): first name, town, their puppy's name
    and the month and year they brought it home (typed), the review, star rating, an optional photo, and a required box: "You
    may show this on your website with my first name and town." Turnstile, a honeypot and
    per-site limits, as on the inquiry form (decision 17).
  - *The queue:* submissions wait in the manage app's **Reviews to approve**. The breeder
    approves or declines each as written; approved reviews can be hidden later. Nothing
    shows until approved, and a declined one is deleted.
  - *Photos* from families get the same checks as the breeder's (section 4.2: resized,
    location data removed, size limits) and stay private until the review is approved.
  - The breeder can also add a review themselves, ticking that the family agreed.
  - Plus a link to their Google reviews (or a free Google reviews widget).

**Dogs and litters, beyond the basics**
- **Pedigree:** a three-generation pedigree on each dog page, typed in (or from KennelOS
  when linked: its pedigree-only ancestors), with titles.

**Basics of a good website**
- **Search and sharing:** a title and description per page, structured data
  (schema.org `LocalBusiness` with town and region only), `sitemap.xml`, a share image per
  page, and a favicon from the logo.
- **Google Business Profile** and social links, shown as links.
- **Accessibility:** alt text asked for on every photo upload, colour choices checked for
  contrast, every page usable by keyboard and screen reader.
- **Privacy page:** generated for every site (what the inquiry form collects, how long
  it's kept, which outside services the pages use, and that notifications pass through
  the device's push service), with the breeder's contact details.

### 3.10 The inquiry form

Every site has one form, used for Contact and questions about extras, pickup or stud
service, and for puppy applications only when the breeder doesn't take them through
KennelOS (section 3.8, decision 26). It works with no KennelOS at all.
- **The breeder's questions:** name and email always; then the fields they choose (phone,
  town, which litter or dog, preferences, a free-text message), from a fixed list of field
  types.
- **Delivery (decision 12):** to the manage app's **Inbox**, with a push notification;
  KennelPort sends no email about it, which keeps the breeder's mailbox and KennelPort's
  email allowance clear. The inbox is a light page: newest first, unread marked, a count
  on the manage app's home, and **Reply** opening the breeder's own email with the
  visitor's address filled in (and **Copy email** beside it). Kept 90 days, then deleted.
- **Push notifications:** each signed-in device can turn on **Notify me of new messages**
  in the manage app. On a phone that means the installed KennelPort Site Manager (iPhones
  allow web push only for an app added to the Home Screen); on a computer, any modern
  browser. A new inquiry, or an application on the manual route (3.8), sends one
  notification: "New message from
  Megan" (the first name typed on the form, nothing else they wrote), and tapping it opens
  that message in the Inbox. Several arriving close together replace one another as "3
  new messages". It follows KennelOS cloud's pattern (`cloud/src/notify.js`): a signed
  (VAPID) push with no payload, after which the app's service worker asks the server what
  to show, proving itself with its subscription's secret, so no message text passes
  through Apple's, Google's or Mozilla's push services. Sent only while the device has a
  live session; a subscription the push service reports gone is deleted. Free, and no
  outside service beyond the browser's own push service. The same channel carries the
  manage app's notices, such as a custom domain that stopped working (section 2.4).
- **Spam:** Cloudflare Turnstile (free, usually invisible) on the form, plus a hidden
  honeypot field and per-site rate limits (decision 17). No CAPTCHA puzzles.
- **No payments, no accounts** for visitors.
- **With KennelOS applications:** applications skip this form and go to KennelOS
  (section 3.8); KennelOS sends its own alerts for them. KennelPort never forwards an
  inquiry into KennelOS, and never copies a KennelOS application into its Inbox.

### 3.11 Pages from the site survey

What the survey of real breeder websites
([`KennelPort_Site_Directory.md`](KennelPort_Site_Directory.md)) found that the list
above lacked. Each is a section the breeder turns on, and works with no KennelOS. Version 1
has these; programs, raising, How to pay safely as a page, retired and in-memory dogs,
show results, the litter diary and planned-litter pages are in the backlog doc, section 6.

**How it works** (`/how-it-works`): the buying process step by step: apply, approval,
deposit, pick order, when picks happen, how long a family has to answer, go-home week,
paying the balance. 14 of the 28 sites read had a page like this.
- *On its own:* as many steps as the breeder needs (one to ten), each a heading, a short
  text and an optional **More detail** expander; numbered automatically, reordered by
  dragging, shown as a sliding set (section 3.12).
- *With KennelOS linked:* the steps KennelOS's waitlist actually runs are filled from their
  waitlist settings (application fee, how picks are offered, days to answer), so the page
  can't drift from what happens. The breeder can add steps and change the wording.

**Older puppies** (`/litters/older`): puppies still available after their go-home date
("12 weeks and older"), often at a changed price.
- *On its own:* a puppy the breeder marks available past the litter's ready date shows
  here as well as on its litter.
- *With KennelOS linked:* worked out from the litter's `estimated_ready_date` and each
  puppy's status.

**Planned litters.** A planned litter shows on Puppies as an upcoming litter; its own
page with a status in plain words is backlog (backlog section 6).
- **Picks (decision 18):** never shown. Litter pages don't say how many picks are taken
  or open; each puppy's own status (section 3.6) is all a visitor sees.

**Family login** (a link, not a page): linked breeders can show a **Family login** link
in the footer that opens KennelOS's family status page, which already gives each family
their countdown, checklist and turn (decision 20). KennelPort builds no portal of its own.

### 3.12 What a breeder can change

The rule: **breeders change content and switch things on and off; the template keeps the
layout.** That's what keeps every site looking like the AK sample (design direction
preference 2) and keeps support small. Everything below is a form in the manage app, with
a live preview.

**Pages.** Every page has an **On** switch except Home, Contact and Privacy. The
safe-payment notice (3.9) has its own switch, on by default.
- A page that's off leaves the menu, footer and `sitemap.xml`, and its address shows a
  plain "This page isn't available" (HTTP 404). Its content is kept, so switching it back
  on restores it.
- The menu's five groups (About us, Kennel residents, Puppies, How it works, Waitlist)
  are fixed; a group whose pages are all off disappears. Menu labels can be renamed
  (section 3.1), and pages can be reordered within their group.
- Pages that depend on records hide themselves when empty (no Retired item with no
  retired dogs, no Older puppies with none), whatever the switch says.

**Home, block by block.** Home is a fixed sequence of blocks, each with an **On** switch:
hero, facts row, story with three features, dogs row, litters, reviews, waitlist band.
The order is fixed. Within each:
- *Hero:* small label, headline, an optional script line ("and tuxedos to match"), intro,
  one to three photos. The two buttons are fixed (waitlist, puppies) but their wording
  can change.
- *Facts row:* up to three number-and-label pairs ("8 wks / Before going home"), typed, or
  counted from the site's own records (dogs, puppies born this season).
- *Story:* a photo, heading with optional script word, text, and three features, each an
  icon from the template's set, a title and a line.
- *Dogs, litters, reviews:* which records show, in what order; heading and label wording.
- *Waitlist band:* heading, line and button wording.

**Lists of things breeders write, any length:**
- *How it works steps:* one to ten (section 3.11).
- *Policies and FAQ:* expanders, each a heading and text; the breeder picks which start
  open.
- *Extras and homegoing packages:* section 3.4.
- *Review topics:* the choices in the reviews filter.

**Wording everywhere.** The small letter-spaced labels above headings ("OUR PARENT DOGS"),
section headings and lead lines all have defaults the breeder can reword.

**Look:** a colour scheme (section 3.13) and the kennel's logo. No free colour, font or
layout controls.

**Fixed by the template:** page layouts, the order of blocks, card shapes and the flip,
sliding sets, button and link styles, fonts within a scheme, and addresses (section 3.1).

### 3.13 Colour schemes

A **scheme** is a matched set: a palette with light and dark versions, a font pairing
(display serif, body sans, optional script) and an ornament set. The breeder picks one
in the manage app with a live preview of their own site; switching is instant and can be
undone like any edit. Every scheme is checked for contrast (normal text at least 4.5:1)
in both versions before it ships. Version 1 has six (decision 25): Lawn, Harbor, Heather,
Clay, Slate and Midnight, set out in
[`KennelPort_Design_Direction.md`](KennelPort_Design_Direction.md) section 7. Midnight is
dark first: it shows dark unless the visitor's device asks for light explicitly.
- **Dark mode (decision 23):** each site follows the visitor's device setting, as the AK
  sample does; the breeder can lock it to light with **Light only**.
- **Custom colour (decision 22):** none in version 1. A breeder's own accent colour may
  come later.

---

## 4. Breeder sign-in and editing

**The stack, as the breeder sees it:**

| Piece | Address | What it is |
|---|---|---|
| **The website** | `akbostons.kennelport.com`, or `www.akbostons.com` with their own domain (2.4) | What visitors see |
| **The manage app** | `manage.kennelport.com` | Where the breeder edits, on a computer or a phone |
| **KennelPort Site Manager** | the same manage app, installed | The manage app added to a phone's home screen as an app (below) |

- **One manage app, two ways in.** The manage app is a progressive web app: in a computer
  browser it's a normal site with a sign-in; on a phone, **Add to Home Screen** installs
  it as **KennelPort Site Manager**, with its own icon and no browser bars. Same sign-in,
  same screens, laid out for a phone: the quick jobs breeders do from a phone (mark a
  puppy reserved, add photos from the camera roll, approve a review, read the inbox, post
  a banner) are one or two taps from its home screen.
- **Notifications:** new messages arrive as push notifications on each device that turns
  them on (section 3.10).
- **Online only for edits.** The app's screens load offline, but saving needs a
  connection; an edit made offline says so and isn't lost from the form. No offline sync,
  so nothing can conflict.
- **Sign-in:** email and a 6-digit code, then a session for that browser. This is the
  pattern KennelOS cloud already uses (`cloud/src/auth.js`), with its approach and
  rate limits. Nobody signs up: a code goes only to an address invited to a site from
  `/ops`, and the screen answers the same either way, so it never reveals who has a
  site.
- **Roles:** `owner` (the breeder), optional `editor` (a helper), and `operator` (you, on
  every site).
- **Limits:** a storage cap per site and limits on photo and album counts, set by you in
  the ops console and enforced by the server.

### 4.1 Draft, preview, publish

- **The tables are the draft.** Every edit in the manage app or ops console, and every
  KennelOS bundle (section 5.3), changes the site's tables directly. Nothing visitors see
  changes yet.
- **Preview before publishing.** Nothing an edit does is live until **Publish**:
  - every edit screen has **Preview**, showing that page exactly as it will look, in the
    site's scheme, with the change in it (on a phone, full screen; on a computer, beside
    the form);
  - **Preview site** opens the whole draft site behind the private preview link, every
    page clickable, with a bar across the top saying it's a preview;
  - **Publish** first lists what changed since the last publish ("Willow: new photo",
    "Opal: Reserved", "Extras: 12-week package edited"), with **Preview** beside each,
    then publishes them all at once.
  A KennelOS update lands the same way: in the draft, listed under Publish.
- **How preview renders:** a preview builds a snapshot from the draft tables exactly as
  Publish would (below), keeps it only for that preview, and renders it with the same
  renderer. The site never points at a preview snapshot, so the renderer still reads only
  snapshots and preview can't drift from what Publish produces.
- **Publish** reads the whole site from the tables and writes it as one **snapshot**: a
  single JSON document with every page, dog, litter, puppy, album and embed that is
  visible, plus the list of photos and files it uses. The site then points at the new
  snapshot in one step.
- **Snapshots live in R2, not D1** (`sites/<site_id>/snapshots/<snapshot_id>.json`). D1
  caps a single row at about 2 MB (from memory; check current limits), and a site with
  years of litters, reviews and diary text could pass that. R2 has no such limit. The
  JSON is written to R2 first; only then does the `sites` row in D1 point at it, so the
  switch is still one step and a failed write leaves the old snapshot live.
- **The renderer reads only the published snapshot**, never the draft tables. A publish
  is all or nothing (visitors never see half an edit), pages render from one read, and the
  Worker can cache it by snapshot id. Rendered pages are cached too (Cloudflare's cache,
  keyed by snapshot id and path), so most visits cost no rendering at all (see the CPU
  note in 4.4).
- **Rollback:** the last 10 snapshots are kept; **Undo publish** in the manage app or ops
  console points the site back at the previous one.
- **Redirects** are worked out at publish time: any path in the previous snapshot whose
  record now has a different slug gets a row in `redirects`.
- **Deleting** a photo or file in the draft marks it removed; it stays in R2 while a kept
  snapshot still uses it, then a daily cleanup deletes it.

### 4.2 Photos and files

- **In the browser:** photos are resized before upload (about 1600px plus a 400px
  thumbnail), as WebP where the browser can make it and JPEG where it can't. Re-encoding
  also removes location data (EXIF GPS) from phone photos, which would otherwise reveal
  where the breeder lives.
- **iPhones:** Safari has not reliably encoded WebP from a canvas: asked for
  `image/webp`, it can quietly hand back a PNG. So the manage app checks the type it
  actually got, and encodes JPEG (quality about 0.85) whenever it isn't WebP. iPhone
  photos stored as HEIC reach the page as JPEG through the photo picker; anything the
  browser can't decode gets a plain message ("This photo couldn't be read; try a
  screenshot of it or a different photo"). Apple's JPEG encoder also writes a small EXIF
  block (size and colour; no location, since a canvas holds only pixels), which the
  server refuses, so the browser drops it before uploading. Adding photos from the
  camera roll is the job breeders do most from a phone, so it's tried on real phones: an
  Android phone worked (2026-11-02); the first real iPhone try found the EXIF block, and
  with that fix an iPhone upload worked too (2026-11-02).
- **On the server, too:** the browser step can be skipped by anyone calling the upload
  API directly, so the server checks every upload itself: only WebP or JPEG accepted for
  photos, within a maximum size and pixel dimensions; a WebP carrying an `EXIF` or `XMP`
  chunk, or a JPEG carrying an `APP1` (EXIF or XMP) segment, is rejected. Downloads must
  be PDFs. Each upload counts against the storage cap.
- **Finding the right photo:** a breeder with ten dogs soon has hundreds of photos, so
  each photo can be tagged with what it's of (a dog, a litter, a puppy, an extra, the
  Home page or Our story). Every photo picker has its own **Add photos** button, and
  photos added there are tagged with what's being edited; the picker shows that
  record's photos first (a puppy's, then its litter's), with every other photo folded
  away, and choosing one and saving tags it too. A litter's screen takes photos the
  same way. The Photos screen filters by tag, including **Not sorted**. Tags are only
  for the breeder: nothing about them is published.
- **Private files stay private:** the renderer serves a photo or file only if the
  published snapshot lists it as public. Health certificates and anything not ticked
  **Show on site** are only reachable through the manage API with a signed-in session,
  whatever its R2 key.

### 4.3 Closing a site

A site's content can be deleted **by the breeder** (a **Delete my site** button in the
manage app, owner only) **or by you** (in the ops console). Either way:

1. **Confirm.** The breeder types their subdomain to confirm, from a sign-in made in the
   last 15 minutes (as KennelOS asks before erasing anything), so a phone left signed in
   can't delete the site. Owners only; editors can download a copy but not delete. The screen offers **Download
   a copy first** (a zip of their text, photos and messages) but doesn't require it. The zip is
   **built in the browser**, not the Worker: the manage app fetches a list of the site's
   text (as JSON) and files, downloads each photo and file in turn, and writes them into
   an uncompressed zip (photos are already compressed) with a small zip writer copied
   into the manage app. A Worker building a zip of a few hundred MB would run into its
   memory and CPU limits; the breeder's browser has neither. It works best on a computer,
   and the screen says so. The same export is each site's full export (section 10, tie-in).
2. **Delete everything, immediately.** Every dog, litter, puppy, page, album, embed,
   snapshot and redirect row; every photo and file in R2 (`sites/<site_id>/`); every
   sign-in, session, push subscription and link token; every stored inquiry; the cached
   waitlist feed; and the site's request record.
   No grace period, and KennelPort keeps no copy.
3. **What's left elsewhere, said plainly.** R2 deletion is immediate. D1 keeps its own
   point-in-time recovery (Time Travel) for up to 30 days, which KennelPort can't turn
   off, so deleted rows only disappear from it after that. Emails already sent (
   invites) stay in the inboxes they reached. The confirm screen and the privacy page say
   so.
4. **Leave a closed marker.** The `sites` row stays with only its subdomain, status
   `closed` and the closing date. The kennel name, theme and owner are wiped.
5. **The address shows a notice.** Every page on that subdomain, including old shared
   links like `/dogs/willow`, shows: *"This breeder is no longer hosting with KennelPort."*
   It answers HTTP 410 (Gone), so search engines drop the old pages.
6. **The subdomain is never reissued automatically.** Otherwise someone else could take
   over links that families, Facebook posts and KennelOS shares still point to. Only you
   can release it, from the ops console.
7. **KennelOS:** the link token stops working. KennelOS shows "This website was closed"
   on its next **Update website** and offers to disconnect. Dog `url` fields already
   pointing at the site land on the closed notice.

Suspending (section 10) is different: it hides a site but keeps everything, so it can be
turned back on.

### 4.4 Worker limits

Cloudflare's free Workers plan gives each request about 10 ms of CPU time (from memory;
check current limits). Waiting on D1, R2 or a fetch doesn't count, but parsing a large
snapshot, rendering a page or checking a big upload does. The plan keeps within it:
- **Pages:** rendered pages are cached by snapshot id and path (4.1), so a page renders
  once per publish, not once per visit; the snapshot is parsed once and kept in the
  Worker's memory while it stays warm.
- **Heavy work happens in the browser:** photo resizing (4.2) and the download-a-copy zip
  (4.3). The server only checks headers and chunks, which is quick.
- **Publish** does most of its work waiting on D1 and R2; building the JSON is the only
  CPU-heavy step.
- **Measured in phase 1** (`worker/scripts/cpu-check.mjs`): the AK site grown to five
  years (24 litters, 60 reviews) makes a 50 KB snapshot; building its JSON, parsing it
  and rendering any page each take well under 1 ms, against a budget of about 10 ms. The
  free plan is enough. Confirm against staging's logs once real photos and content are
  in; if a request ever passes the limit, move to Workers Paid (about $5 a month,
  section 7) rather than splitting the work up.

---

## 5. The KennelOS link

### 5.1 The principle: KennelOS publishes, KennelPort displays

KennelOS works the same way for Companion (`shared/data/companionExport.js`) and the
waitlist (a published "projection"):

- KennelOS builds a **site bundle** with an **allow-list**: every field copied by name,
  with no buyer names, notes, contracts or contacts, and no prices unless decision 6
  allows them. A new field in KennelOS never reaches the site until someone adds it to
  the list.
- Only records the breeder marks **Show on website** go into the bundle.
- KennelOS pushes the bundle to KennelPort. KennelPort never reads anything from KennelOS.

### 5.2 Linking

1. In KennelPort's manage app: **Link KennelOS** shows a one-time link code.
2. In KennelOS (Settings or Import/Export): **Connect website** takes that code. KennelPort
   returns a token, which KennelOS stores through `settings.js`.
3. **Matching what's already there.** A breeder who started without KennelOS already has
   dogs and litters in KennelPort. On the first bundle, the manage app suggests pairs by
   name (KennelPort's "Willow" with KennelOS's "Willow") and the breeder confirms each.
   Nothing is matched without that confirmation; unmatched KennelPort records stay as
   they are. The same suggestion appears whenever a later bundle brings a new KennelOS
   dog or litter whose name matches one still unlinked in KennelPort (a dog the breeder
   added to the website first and to KennelOS later), so it joins the existing page,
   with its photos and wording, instead of making a second one. KennelOS fields start
   flowing to it only after the breeder confirms the match.
4. From then on, KennelOS has an **Update website** button. Nothing is sent until the
   breeder presses it (no automatic publishing, decision 5). What arrives lands in the
   draft (section 4.1), so the breeder can still check it before pressing **Publish**.

### 5.3 What a bundle does to the site

Each bundle is applied by these rules (decision 16):

- **Matching:** records are matched by their KennelOS id (`kennelos_id`), never by name
  after the first link.
- **Updated:** for a matched record, the KennelOS-owned fields (list below) are replaced
  with the bundle's values. KennelPort-only fields (bio, photos, albums, order, embeds)
  are never touched.
- **New:** a record in the bundle with no match is created, with no photos yet.
- **Gone from the bundle** (unticked **Show on website**, archived or deleted in
  KennelOS): the record is **hidden**, not deleted, and its KennelPort photos, bio and
  albums are kept. If it comes back in a later bundle, it reappears as it was. The breeder
  can delete a hidden record in KennelPort.
- **A bundle never deletes a photo, file, album or page.**
- **A summary** after each bundle: "3 updated, 1 new, 1 hidden. Preview, then Publish."

**Who owns which field:**
- **From KennelOS (read-only in KennelPort while linked):** name, registered name, sex,
  date of birth, colour, earned titles, health tests (section 3.7), litter dates, parents,
  puppy status label (section 3.6), planned litters (per the Coming up switches), extras
  names, groups and descriptions (section 3.4), shown pickup places and transport
  distances (section 3.5); a planned litter's status (section 3.11), retired and deceased
  status with the date of death, the waitlist steps behind How it works, and program
  names and public descriptions. For litters opted in (decision 19): milestones and
  weights, as draft diary entries. With **Use my KennelOS prices** on (decision 6): litter
  prices, deposits, the registration surcharge, extras prices and the fee per mile.
- **KennelPort only:** website bio, prices (unless **Use my KennelOS prices** is on), photo choice
  and order, albums, embeds, page text, layout, and everything in sections 3.9 and 3.10
  (policies, reviews and stories, news, stud and adults pages, downloads, events, the
  inquiry form and its inbox), plus the raising page, program terms, the wording of How
  it works and How to pay safely, diary text and photos, and tributes.
- Unlinked sites edit everything in KennelPort. Unlinking turns every KennelOS-sourced
  record into ordinary, editable KennelPort data, as it stands in the draft.

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
- **Request a website**: a Pro-only button. Lite and Demo don't show it; it goes through
  `editionConfig.js` like other Pro-only features, never a hardcoded edition check.
- **The link token:** KennelOS now syncs across a breeder's devices. Keep the token in
  the device-only `device_secrets` table (never in a backup file or the cloud), so each
  device links once (decision 11).
- **One link per kennel:** KennelOS supports more than one own kennel. Each site is one
  kennel; the bundle is scoped to that kennel's dogs and litters, and each kennel links
  separately.
- **Filled in when linked:** the kennel's `website` (invoices and contract forms already
  use it), `extras_info_url` (section 3.4), the waitlist embed's allowed sites when the
  breeder has listed any (section 3.8), and dog `url` (section 5.4).
- **Kels:** Request a website and Update website as Kels tasks; **Show on website** asked
  in Add dogs, Record a litter and when a pup is marked Keeping.
- **The waitlist on the breeder's site (decision 21): built in KennelOS.** The
  `waitlist_config.website_feed` switch (off by default), `GET /f/site/<public_id>` with
  its own read limit, and the feed address to copy on the Online list card. No new fields
  leave KennelOS: it's the list the public page already shows. For the application form
  in the site's style (3.8): the feed's `form` (what `/f/form` already serves), and
  `/f/apply`, `/f/verify` and `/f/code` answering cross-origin requests from KennelPort
  sites; `kennelport.com` added to KennelOS's Turnstile widget.
- **Undecided puppies are not for sale (decision 10):** `isPupAvailable` treats
  Undecided like Keeping, so the waitlist never offers one, its public list's
  **Available Puppies** leaves it out, and the website feed and bundle agree; Companion
  shares (`shared/data/companionExport.js`) don't show an Undecided puppy as available or
  with a price. Needed before phase 4, and worth doing in KennelOS on its own.
- Service-worker precache entries and a cache bump for any new files.

---

## 6. Data model (sketch)

| Table | Key fields |
|---|---|
| `sites` | id, subdomain (unique), kennel_name, tagline, blurb, breed, monogram, town, region, contact_email, contact_phone, facebook_url, facebook_label, instagram_url, template, scheme (section 3.13), dark_mode (`auto` / `light_only`), show_other_prices (3.2, off by default), kennelos_public_id (for the waitlist list, 3.8), status (`draft` / `live` / `suspended` / `closed`), published_snapshot_id, draft_changed_at, closed_at, storage_limit, photo_limit, album_limit, created_at |
| `snapshots` | id, site_id, published_at, published_by, r2_key (the whole published site as JSON in R2, section 4.1), bytes; the last 10 per site kept |
| `site_users` | site_id, email_hash, role (`owner` / `editor`). Only the keyed hash, as in KennelOS cloud: codes and invites go to the address typed at that moment, and nothing is emailed to a breeder later (notices reach them in the manage app and by push) |
| `sessions`, `login_codes`, `rate_limits` | as in KennelOS cloud, keyed by the email hash; a session is a cookie on the manage host (token kept as its SHA-256), 90 days, sliding |
| `dev_outbox` | staging only: codes and invites shown on `/ops` until email is connected |
| `push_subscriptions` | endpoint_hash, email_hash, session_hash, endpoint, auth_secret, created_at, last_sent_at, last_shown_seq (section 3.10); as in KennelOS cloud, tied to the session it was made in |
| `notices` | site_id, kind (`domain_live` / `domain_broken` / …), message, created_at, read_at: what the manage app shows the breeder |
| `waitlist_entries` | site_id, name, list_name (what the site shows), email, phone, wants, added_on, inquiry_id (the application it came from), status (`waiting` / `fulfilled`), sort (order among those waiting; a place is never stored), created_at, done_at (fulfilled ones deleted 90 days after) (section 3.8) |
| `feed_cache` | site_id, state (`ok` / `not_shared` / `not_found`), body (the KennelOS website feed's last copy), fetched_at, checked_at (the last time KennelOS was asked; retried after a minute when it couldn't be reached) (section 3.8) |
| `dogs`, `litters`, `puppies` | site_id, slug, content fields, `source` (`kennelport` / `kennelos`), `kennelos_id` when linked, `hidden_by_kennelos` (section 5.3). A dog has a status (`active` / `retired` / `remembered`) and health_display (`normal_only` / `all` / `none`, 3.7); a litter a stage (`planned` / `current` / `past`) and either parent as a site dog or a typed name; a puppy one of 3.6's statuses. The full field list is `worker/src/migrations/0002_content.sql` |
| `site_pages` | site_id, page key, enabled, menu_label, content (each page's wording, JSON with the keys the content model names, 3.12); order within its menu group comes with phase 6 |
| `redirects` | site_id, old path, new path (written at publish time) |
| `embeds` | site_id, page or record it sits on, provider, item id, title, preview photo, order |
| `photos` | site_id, r2_key, thumb_key, type (WebP or JPEG), width, height, bytes, alt text, removed_at; public only when the published snapshot uses it (4.2) |
| `photo_tags` | site_id, photo_id, subject (`dog:` / `litter:` / `puppy:` / `extra:` + id, or `page:home` / `page:about`): what a photo is of, for the breeder only; never published (4.2) |
| `albums`, `album_photos` | site_id, title, slug, cover; ordered photo list |
| `links` | site_id, token_hash, linked_at, last_bundle_at, last_bundle_summary |
| `custom_domains` | site_id, hostname, cloudflare_hostname_id, registrar (detected, backlog), status (`pending` / `active` / `stuck` / `broken`), checked_at, connected_at |
| `health_results` | site_id, dog, test, result, normal, date, verify_url, show (off by default), certificate file (private unless ticked) |
| `stories` | site_id, kind (`review` / `at_home`), quote, rating, first name, town, puppy_name, home_month (YYYY-MM), photo, submitted_by (`family` / `breeder`), status (`pending` / `approved` / `hidden`), permission_confirmed_at, submitted_at |
| `steps` | site_id, page (`how_it_works` / `raising`), order, heading, body, detail (the More detail expander), `source` |
| `home_blocks` | site_id, block key (`hero` / `facts` / `story` / `dogs` / `litters` / `reviews` / `waitlist`), enabled, content (wording, photos, facts, features) |
| `expanders` | site_id, page (`policies` / `faq` / `waitlist_help`), order, heading, body, start_open |
| `extras` | site_id, kind (`item` / `homegoing`), group, name, description, photo, price_from, price_to, weeks, lead_in, checklist, closing, featured, order, `source` (section 3.4) |
| `files` | site_id, r2_key, title, bytes, public, removed_at (downloads and certificates, PDFs only) |
| `inquiries` | site_id, kind (`contact` / `application`), name, email, phone, topic, message, answers (an application's [question, answer] pairs as JSON, with the question's wording when sent), received_at, read_at; deleted after 90 days by the daily cleanup (section 3.10, decision 12) |
| `notify_items` | what happened, for push notifications: the kind and the sender's first name only; kept 8 days (section 3.10) |
| `payment_info` | site_id, kind (`application_fee` / `deposit` / `safe_notice`), show_on_site (off by default for the fee and deposit; the notice is on with no row), content (JSON: title, due_note, methods as [way, details] pairs, note, pay_url, pay_label; for the notice, its wording), `source` (section 3.9) |
| `form_fields` | site_id, form (`application`), type (short answer, longer answer, choice, yes/no, which litter, phone, town), label, hint, required, options (JSON, for a choice), order: the application form's questions after name and email (section 3.8) |

Tables for backlog items (requests, news, programs, the litter diary, events) are in
[`KennelPort_Backlog.md`](KennelPort_Backlog.md) section 7.

R2 keys look like `sites/<site_id>/photos/<photo_id>.webp` (or `.jpg`, section 4.2) and
`sites/<site_id>/snapshots/<snapshot_id>.json`, so a whole site can be deleted
or exported at once. Whether a file is public is decided by the published snapshot, never
by its key (section 4.2). A closed site keeps only its `sites` row (subdomain, `closed`,
closed_at); every other table is emptied for it (section 4.3).

---

## 7. Cost

| Item | First site | 15 breeders |
|---|---|---|
| Domain (`kennelport.com`) | about $10–15 a year | same |
| Workers | $0 (free tier), or $5 a month if phase 1's CPU check says so (section 4.4) | $0–5 a month |
| D1 | $0 | $0 (under 50 MB against a 5 GB free tier) |
| R2 photos | $0 | $0 for about 3 years (about 3 GB a year against 10 GB free; no bandwidth fees) |
| Resend email | $0 | $0 on the free tier at this volume |
| Push notifications | $0 | $0 (the browsers' own push services) |
| Custom domains (Cloudflare for SaaS) | $0 | $0 for the first ~100; about $0.10 a domain a month after. Each breeder pays for their own domain |
| **Total** | **About $1 a month** | **About $1 a month** |

These are prices from memory; check Cloudflare's and Resend's current pricing.

---

## 8. Build order

### 8.1 Version 1: the first family site

Each phase is useful by itself, so you can stop after any one.

| Phase | Delivers | You can now… |
|---|---|---|
| **0. Set up** | Domain on Cloudflare, wildcard DNS, empty Worker with D1 and R2, staging and production | — |
| **1. Renderer + ops** | One template with its fonts and libraries served from the site (3.3), the ops console, preview links, snapshot publish to R2 and undo (4.1), page caching and the CPU check (4.4), reserved names, OG tags, close a site and the closed notice | Build and host the site yourself, with no breeder login yet |
| **2. Breeder login** | Email-code sign-in, manage app (installable as KennelPort Site Manager), the inbox with push notifications for new messages, the review queue, preview and publish with the list of changes, photo upload with resizing, the JPEG fallback and the server checks, tried on a real Android phone and iPhone (4.2), storage limits, **Delete my site** with the download-a-copy zip built in the browser (4.3) | Hand the site over |
| **3. The first site's pages** | Everything in the AK sample (decision 14): Home with its blocks, About (story, reviews, contact), Kennel residents with flip cards and health results (3.7), Puppies (available, upcoming, older) with statuses (3.6), How it works steps (3.11), Extras with homegoing packages (3.4), Policies and FAQ, the waitlist page and its status-page help (3.8, decision 21) with how to pay the application fee and deposit (3.9), inquiry form and inbox (3.10); plus the safe-payment notice, privacy page and search basics | The family site is complete and live |
| **4. The KennelOS link** | In KennelPort: link codes, matching existing website records to KennelOS ones (5.2), the bundle API and its rules (5.3), **Use my KennelOS prices** (3.2). In KennelOS (5.5): **Show on website** on dogs and litters, `siteExport.js`, **Connect website** and **Update website**, filling `dog.url`, the kennel's website and `extras_info_url`, and the Kels steps | Her dogs, litters, puppy statuses and health results come from KennelOS when she presses **Update website**; she types them only once |
| **5. Albums, embeds and sharing** | Albums with their own links, embeds from the approved list with stored previews (3.3), share links and QR codes, KennelOS shares carrying album links (5.4) | Litter albums and her YouTube and Facebook posts live on the site |
| **6. Customisation and schemes** | Page and Home-block switches, menu labels, any-length steps, expanders and extras (3.12); the colour schemes with light and dark versions (3.13) | Other breeders' sites can differ from AK's without new code |

**Where phase 3 stands.** Most of it was built with phases 1 and 2: Home and its blocks,
About, Kennel residents with health results, Puppies with statuses, How it works, Extras
and homegoing packages, Policies, FAQ, the status-page help, the contact form and Inbox,
reviews, the privacy page and search basics all render and can be edited, and so do How
to pay and the safe-payment notice (3.9), and the application form for breeders who run
their list by hand (3.8, decision 26: the breeder's own questions on the waitlist page,
a closed switch, answers in the Inbox), and, for breeders who take applications online in
KennelOS, the website feed read on the waitlist page with KennelOS's application form
drawn in the site's style (3.8), and the KennelOS list itself in the site's style
(decision 21: the families' rows, the gap note and search, above the application form).
Phase 3 is built.

If the first site wants its own domain, connect it by hand (section 2.4).

### 8.2 Backlog

Everything after version 1, with its order and designs, is in
[`KennelPort_Backlog.md`](KennelPort_Backlog.md).

---

## 9. Decisions

**Decided**

1. **Domain:** `kennelport.com`. The manage app stays on `manage.kennelport.com`: embeds
   are built by KennelPort from an approved list, so no breeder code ever runs on a site
   (section 3.3).
2. **Who can request a site:** the in-app **Request a website** button is KennelOS Pro
   only. A KennelPort site never requires KennelOS: anyone can ask through the public
   request form, and you approve every request either way.
3. **Pricing:** not now. KennelPort isn't for sale; the first site is for family. Revisit
   only if it's ever offered to others.
4. **Accounts:** KennelPort has its **own sign-in**, separate from KennelOS cloud. The two
   connect only through the link code (section 5.2).
5. **Publishing from KennelOS:** only when the breeder presses **Update website**; never
   automatic.
6. **Prices from KennelOS:** the breeder chooses, with **Use my KennelOS prices**, off by
   default (section 3.2).
7. **Embeds:** yes, several providers, including YouTube and Facebook pages, built from an
   approved list (section 3.3).
8. **When someone leaves:** the breeder or you deletes all content immediately, and the
   address shows a "no longer hosting with KennelPort" notice (section 4.3).
10. **Undecided puppies:** not for sale anywhere. KennelOS's waitlist doesn't offer them
    and Companion shares don't show them for sale; the site shows them as Coming soon,
    with no price (sections 3.6, 5.5). Placed puppies show (with a hide switch per
    litter) and health hold is hidden.
11. **Link across devices:** each device links once; the token stays in KennelOS's
    device-only `device_secrets` table (section 5.5).
12. **Inquiries:** stored in the manage app's inbox, never emailed, with a push
    notification to each device that turns them on; kept 90 days; the breeder replies
    from their own email (section 3.10).
13. **Reviews:** families submit them on the site; the breeder approves each before it
    shows (section 3.9).
14. **What ships first:** the AK sample's pages (section 8.1, phase 3), the KennelOS link
    (phase 4) and albums, embeds and sharing (phase 5). Past litters, news and the other
    standard pages wait in the backlog ([`KennelPort_Backlog.md`](KennelPort_Backlog.md)).
15. **Main address for a custom domain:** `www.`, with the bare domain forwarding to it.
16. **How a KennelOS bundle changes the site:** as in section 5.3, with matching offered
    whenever a new KennelOS record matches an unlinked one (section 5.2).
17. **Spam check:** Turnstile from the start on the inquiry and review forms, with a
    honeypot and rate limits.
18. **Picks on litter pages:** never shown.
19. **Litter diary from KennelOS:** opt-in per litter, drafts only.
20. **Family login link:** a footer link to KennelOS's family status page, for linked
    breeders; no KennelPort portal.
21. **Waitlist in the site's style:** the Worker reads KennelOS's public list and draws it
    with the site's scheme, as the AK sample does, stacking on phones; sign-in and
    applications open KennelOS's own pages (sections 3.8, 5.5).
22. **Custom accent colour:** none in version 1; perhaps later.
23. **Dark mode:** sites follow the visitor's device setting, with a **Light only** switch
    for the breeder (section 3.13).
24. **Customisation model:** breeders change content, switch pages and Home blocks on and
    off, and choose a scheme; layouts stay fixed (section 3.12).
25. **Colour schemes:** all six ship in version 1: Lawn, Harbor, Heather, Clay, Slate and
    Midnight (design direction section 7), each with light and dark versions. Compared
    side by side in [`reference/scheme-lab.html`](reference/scheme-lab.html).
26. **Where an application goes:** to KennelOS's live list flow whenever the breeder takes
    applications online in KennelOS; to KennelPort's Inbox only when they don't and run
    their list by hand. Worked out by the site, not a choice (section 3.8).

**Open**

9. **Content rules and suspension:** not needed for version 1. Terms of service and what
   gets a site suspended are written before any breeder outside the family gets a site.

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| One bad site gets the whole domain blocklisted | You approve every site; one-click suspend; terms of service; no customer code |
| Photos reveal a breeder's home | Location data removed on upload and checked again by the server; addresses shown only as town and region |
| A pickup page reveals a breeder's home | Only places marked **Show to families**; the standard location should be a public place (section 3.5) |
| A private certificate or unticked photo is reachable by URL | The renderer serves only what the published snapshot lists as public (section 4.2) |
| The site shows something hidden on KennelOS's public pages | The bundle applies KennelOS's own health-test, Coming up and availability rules (sections 3.6, 3.7) |
| Private KennelOS data leaks to a public site | Allow-list bundle with a positive key check, and per-record opt-in (section 5.1) |
| A bundle wipes work done in KennelPort | Bundles replace only KennelOS-owned fields, hide rather than delete, and land in the draft (section 5.3) |
| A half-finished edit goes live | Publish swaps in a whole snapshot at once; **Undo publish** goes back (section 4.1) |
| Storage creep | Per-site limits; daily cleanup of photos and files no kept snapshot uses |
| A closed subdomain is taken over and old links point at a stranger's site | Closed subdomains are never reissued automatically (section 4.3) |
| You become the bottleneck | Breeders handle routine edits themselves; you only do setup and design |
| Building far more than the first site needs | Version 1 is section 8.1 only; everything else waits for someone to ask |
| An embed provider tracks visitors or changes its embed | Click to load; previews stored on the site; plain-link fallback; providers listed in one place |
| Tie-in to one host | Plain D1 and R2 data, with a full export for each site (built in the browser, section 4.3) |
| Photo upload fails on iPhones, which can't always make WebP | JPEG whenever the browser hands back anything but WebP; the server accepts both and checks both for location data; tried on a real Android phone and a real iPhone (section 4.2) |
| A large site outgrows D1's row size | Snapshots are stored in R2, with only their key in D1 (section 4.1) |
| A page, publish or export runs past the free plan's CPU limit | Pages cached per snapshot; resizing and the export zip run in the browser; CPU measured in phase 1, with Workers Paid as the fallback (section 4.4) |
| Fonts or libraries from Google or a CDN let them track visitors | Fonts and libraries are served from the site itself; only Turnstile loads from outside, on form pages (section 3.3) |
| A scammer copies a breeder's site or photos to sell puppies that don't exist | The safe-payment notice on by default; official contacts on every page; you can point to the real site when families ask |
| The review form is abused (fake or hostile reviews, unwanted photos) | Nothing shows until the breeder approves it; photos stay private until then and get the upload checks; Turnstile, a honeypot and rate limits |
| A breeder misses an inquiry because it isn't emailed | A push notification on each device that turns them on, and an unread count on the manage app's home (section 3.10) |
| The inquiry form attracts spam or collects more than it needs | Turnstile, a honeypot and rate limits; a fixed list of field types; inquiries deleted after 90 days (decision 12) |
| A custom domain lapses or its records change | The daily check stops the redirect, so the `kennelport.com` address serves the site again; you are emailed and the breeder gets a notice and a push notification (section 2.4) |
| A breeder breaks their email while editing DNS | The steps add only the site's records and say not to change nameservers or delete other records |
| A non-KennelOS breeder gets a lesser site | The parity rule (top of the plan): every section is a KennelPort form first; KennelOS only fills fields |

# KennelPort: high-level plan (DRAFT)

> Status: planning draft, checked against KennelOS. Nothing is built. Section 8 says what
> version 1 is; section 9 lists the decisions still open. History of this plan lives in
> [`BUILD_LOG.md`](BUILD_LOG.md).

KennelPort hosts breeder websites. Each kennel gets a site at `theirkennel.kennelport.com`.
The operator (you) sets up and drafts every site by hand. Breeders then manage their own
content through a simple login. Breeders who use KennelOS can link it so dogs, litters
and photo albums fill in by themselves.

**Version 1 is one site.** The first site is for a family member, and KennelPort is not
for sale. The design below allows for more breeders, but version 1 (section 8) builds only
what that first site needs. Everything else is a backlog, built when someone asks for it.

**The target is the AK sample.** A working sample of the first site, AK Boston Terriers,
was built as one page and approved by the owner: every page in the five-item menu, flip
cards, sliding sets, expanders, the extended-homegoing extras and the KennelOS waitlist
shown in the site's own style. Version 1 is that sample made real: the same look,
with its content in forms (section 3.12), a choice of colour schemes (section 3.13) and
pages a breeder can switch off. The sample's source is
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
| 1 | **Request** | Breeder | Version 1: they ask you directly. Later (backlog): KennelOS Pro users press **Request a website** in the app; anyone else uses a public request form on `kennelport.com`. Either way you get an email and the request appears in your console. |
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
 breeder ──▶ manage.kennelport.com            ─┼──▶│ renderer     public sites, OG previews     │──▶ D1  (sites, dogs, litters, pages, users, snapshots)
 you     ──▶ manage.kennelport.com/ops        ─┤   │ manage API   breeder sign-in + editing     │──▶ R2  (photos: full + thumbnail; files)
 KennelOS ─▶ api.kennelport.com               ─┘   │ ops          requests, set up, drafts      │──▶ Resend (sign-in codes, invites, inquiries)
                                                   │ link API     KennelOS publishes here       │
                                                   └────────────────────────────────────────────┘
```

| Part | Purpose |
|---|---|
| **Renderer** | Server-side HTML from a template plus the site's published snapshot (section 4.1). Fast, works on any phone, good for search engines. No customer JavaScript. |
| **Manage app** | Static pages on the reserved `manage` host. Forms for each section, photo upload with in-browser resizing. |
| **Ops console** | Your side: create site, edit any site, preview, publish, suspend, invite; later the request inbox. Same pattern as `cloud/`'s `/ops` in KennelOS. |
| **D1** | All text content, accounts and published snapshots. Tens of MB at most. |
| **R2** | Photos and downloads. About 200 MB a year per active breeder once photos are resized (section 7). |

Reserved subdomains (`www`, `manage`, `api`, `ops`, `admin`, `mail`, `support`, `sites`,
`kennelos`, `kennelport`, …) can never be given to a site.

### 2.3 Separate repo, separate Worker

KennelPort lives in this repo and deploys as its own Worker. It is not part of the
KennelOS `cloud/` Worker. KennelOS treats it like any optional service: with no KennelPort
URL configured, nothing about it shows or runs. That matches the KennelOS rule that
`cloudUrl: null` must work.

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
they leave.

**Once connected** (same by hand or automated):
- The custom domain becomes the site's main address: links, share previews, `sitemap.xml`
  and the address KennelOS is given all use it.
- The `kennelport.com` address redirects there with the same path, so old links keep
  working.
- **A daily check:** if the domain stops pointing at KennelPort (it expired, or the records
  changed), the `kennelport.com` address stops redirecting and serves the site again, and
  the breeder and you are emailed.
- **Removing it** (ops console, or closing the site): the custom hostname is deleted and
  the `kennelport.com` address is the main one again. The domain itself is theirs to keep.

**Backlog: guided steps that check themselves.** Only worth building if several breeders
want their own domains, since the registrar guides need upkeep whenever a provider changes
its screens. The design:

1. **Your own domain** (manage app, owner only): they type their domain. The server checks
   it isn't another site's, creates the custom hostname in Cloudflare (status pending),
   and shows the steps.
2. **We find your registrar.** The server looks up the domain's nameservers (a DNS query
   over HTTPS from the Worker) and matches them to a list of common providers (GoDaddy,
   Namecheap, Squarespace Domains, Porkbun, Cloudflare, IONOS, Hover, Wix, Bluehost). The
   steps are written for that provider, with a **Copy** button beside each value. An
   unknown provider gets general steps that work anywhere.
3. **Only the records the site needs**, as in the by-hand steps above, each shown with its
   exact name and value, and the same warnings.
4. **The bare domain:** where the provider allows a CNAME-like record at the root
   (Cloudflare, and ALIAS records at Porkbun, Namecheap and others), the steps add it.
   Elsewhere they set up the provider's own forwarding from the bare domain to `www`.
5. **It checks for them.** While the page is open it checks every 30 seconds; after they
   close it, the server keeps checking pending domains every 15 minutes for 3 days. Each
   step gets a tick as it's done: **Record found**, **Certificate ready**, **Connected!**
   Problems are explained in plain words: "Your `www` still points somewhere else: delete
   the old `www` record, then add this one", or "Saved but not visible yet: changes
   usually show within an hour, sometimes up to two days."
6. **When it's live**, the breeder and you get an email. If it's still pending after 3
   days, you both get one, and the ops console shows it as stuck so you can help.

The registrar guides would live in one file, an entry per provider (how to find DNS
settings, the field names, whether root CNAMEs or ALIAS records work, how forwarding is
set up).

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
  "Contact us for pricing".
- Puppies marked reserved or placed never show a price.
- **Ranges:** any price can be one amount or a from–to range ("$2,500–$2,800"), as breeders
  often price by puppy within a package.
- A short notice under prices, in the breeder's wording (KennelOS's turn cards say prices
  are intended base prices and may change before contract signing).
- The same **Show prices** rule covers every other price on the site: extras (3.4), the
  delivery fee (3.5), stud fees and adults (3.9). Off, each shows "Contact us".

**With KennelOS linked:** open (decision 6). Today's rule is that KennelOS never sends a
price, so a linked breeder types prices in KennelPort like anyone else. KennelOS now holds
litter prices (price and deposit per sex, a full-registration surcharge, already shown on
families' turn cards), an extras price list (3.4) and a fee per mile (3.5), so keeping the
rule means typing each price twice and watching them drift apart. The proposal: the bundle
may carry them, still shown only where the breeder turns prices on.

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

**Outside services and libraries.** The template may use any free outside service or
library it needs: web fonts, animation and slider libraries, Cloudflare Turnstile,
Cloudflare Web Analytics, a reviews widget. The only rule is that it costs nothing.
Every page sends a Content Security Policy listing exactly the services the template
uses plus the embed providers above, so a breeder's content still can't load anything
else (breeders never add code).

Because embeds are built by KennelPort and breeders never add their own code, the manage
app can stay on `manage.kennelport.com` (see section 9).

### 3.4 Extras page

**On its own:** `/extras` lists the paid extras the breeder offers families (photo and
video packages, training stays, boarding, a crate or puppy pack, …): each with a name,
optional group, description, photo and price (prices follow section 3.2's **Show prices**
rule). They add and order them in the manage app. Visitors ask about an extra through
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

**On its own:** `/pickup` lists the breeder's pickup places (a name, the town or a public
place, and notes such as "by the north entrance") and their delivery policy in plain
words: how far they will drive or meet, a fee per mile or a flat fee (when prices show),
and whether they use a flight nanny. Never a home address: the form asks for a public
place, and a hint says why (section 10).

**With KennelOS linked:** KennelOS records pickup places (each with **Show to families**;
one is the standard location, where mileage starts) and transport settings (fee per mile,
one way or round trip, free under some miles, how far a family must live to suggest their
own meetup place, the "we'll be in touch" distance).
- Only places marked **Show to families** come over.
- The policy sentence is written from those settings: "Families at least 40 miles away can
  ask us to meet nearer to them; beyond 150 miles, we'll be in touch about driving or a
  flight nanny." The fee per mile only if prices show (decision 6).
- Pickup times and booking stay on the KennelOS status page.

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

**On its own:** `/waitlist` (shown as "Apply" or "Puppy application", the breeder's
choice) is one of:
- **The site's inquiry form** (section 3.10), set up as a puppy application with the
  breeder's own questions; answers are emailed to them. KennelPort is not a waitlist: no
  list, no places in line.
- **A link or embed of the waitlist they already use** (a Google Form, Jotform, …),
  through the approved embed list (section 3.3) or as a button.
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
families are left out, a search box, Available Puppies and Coming up as expanders, and
**Apply to join the waitlist**. To do that for real:
- The Worker reads the kennel's **website feed** from KennelOS
  (`GET /f/site/<public_id>`: exactly the public list, plus paths for the list, sign-in
  and form), caches it for five minutes, and renders it with the site's scheme. KennelOS
  serves it only while the breeder has **Let my KennelPort website show my list in its
  own style** on; otherwise it answers 404 `not_shared`, and the page shows a link to the
  KennelOS list instead. No KennelOS data is stored in KennelPort. The breeder pastes the
  feed address (shown on KennelOS's Online list card) into the manage app, which stores
  the kennel's `public_id`.
- **Current Applicants: See Your Details** and the application form open KennelOS's own
  pages (`/list/<public_id>#signin`, `/apply/<public_id>`) in a new tab, so sign-in codes
  and applications never pass through KennelPort.
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

### 3.9 Standard breeder-site features

What visitors expect on a breeder's website, whether or not the breeder uses KennelOS.
All are KennelPort content only; KennelOS fills none of them. Each is a section the
breeder turns on. Version 1 ships only the ones in decision 14; the rest are backlog.

**Trust and buying a puppy**
- **Policies:** health guarantee, how reserving works (application, deposit, pick order),
  deposit and refund terms, spay/neuter or breeding rights, and the lifetime take-back or
  rehoming policy. Plain text sections with headings, linked from every puppy page.
- **How to pay safely:** the payment methods the breeder accepts and a standard warning
  about puppy scams ("We'll never ask for payment by gift card; we only use the contacts
  on this site"). On by default, because impersonation scams copy breeders' photos and
  names.
- **How to pay:** how a family pays the **application fee** and the **deposit**, shown
  openly on the site so nobody has to email to ask. For each of the two: the methods taken
  (Venmo, Zelle, PayPal, check, card…), the details for each (handle, email, who a check
  is made out to), what to write in the note ("your name and AK application"), when it's
  due ("once you're approved", "within 48 hours of choosing your puppy"), and an optional
  **Pay** button linking to the breeder's own payment page (Stripe, Square, PayPal). Each
  has its own **Show on website** switch, off until the breeder turns it on. This is how
  to pay, not what it costs: amounts follow the prices rule (section 3.2) and appear only
  if the breeder types them into the wording. It shows on the waitlist page beside
  **Apply**, under the matching How it works steps (3.11), and on How to pay safely, where
  it doubles as the list of the only real payment details. Nothing on the site takes a
  payment itself.
  - *With KennelOS linked:* filled from KennelOS's waitlist **payment instructions** and
    the fee account's pay link (`feePay`), the same text families already see on their
    status pages and the application page. It reaches the site only while the breeder's
    switch is on, and they can reword it in KennelPort.
- **Memberships and programs:** breed club and kennel club memberships and breeder
  programs (AKC Breeder of Merit, Bred with H.E.A.R.T., …), as names with optional links.
  No logo images unless the breeder has the right to use them.
- **Visiting policy:** by appointment only, what to expect, health precautions.
- **Reviews:** quotes from families (a quote, a first name and town), added by the breeder
  with the family's permission (a checkbox they tick to confirm), plus a link to their
  Google reviews (or a free Google reviews widget). Never collected automatically from
  visitors.
- **Families' stories:** photos of grown puppies in their homes, with a first name and
  town, under the same permission rule. Never a full name, address or buyer record.

**Dogs and litters, beyond the basics**
- **Pedigree:** a three-generation pedigree on each dog page, typed in (or from KennelOS
  when linked: its pedigree-only ancestors), with titles.
- **Past litters:** a litter archive ("Where are they now") with photos, no buyer names.
- **Adults available:** retired or adult dogs looking for homes, with the same statuses.
- **Stud dogs:** a stud page per male offered at stud: health testing, titles,
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
- **Downloads:** PDFs the breeder uploads (puppy application, sample contract, care
  guide), within the site's storage limit; the server checks each is a PDF and serves it
  as a download.
- **Events:** shows and events the breeder will attend, with dates and towns.

**Basics of a good website**
- **Search and sharing:** a title and description per page, structured data
  (schema.org `LocalBusiness` with town and region only), `sitemap.xml`, a share image per
  page, and a favicon from the logo.
- **Google Business Profile** and social links, shown as links.
- **Accessibility:** alt text asked for on every photo upload, colour choices checked for
  contrast, every page usable by keyboard and screen reader.
- **Privacy page:** generated for every site (what the inquiry form collects, how long
  it's kept, which outside services the pages use), with the breeder's contact
  details.
- **Visitor stats** (backlog): page counts from Cloudflare Web Analytics or Workers
  Analytics Engine, both free and cookie-free.

### 3.10 The inquiry form

Every site has one form, used for Contact, puppy applications (section 3.8) and questions
about extras, pickup or stud service. It works with no KennelOS at all.
- **The breeder's questions:** name and email always; then the fields they choose (phone,
  town, which litter or dog, preferences, a free-text message), from a fixed list of field
  types.
- **Delivery:** emailed to the breeder through Resend, with the visitor's email as
  reply-to. Kept in the manage app's inbox for 90 days, then deleted (decision 12), so a
  lost email isn't a lost family.
- **Spam:** Cloudflare Turnstile (free, usually invisible) on the form, plus a hidden
  honeypot field and per-site rate limits (decision 17). No CAPTCHA puzzles.
- **No payments, no accounts** for visitors.
- **With KennelOS linked:** the breeder can choose **Send to my KennelOS waitlist**
  instead, which embeds the KennelOS form (section 3.8). KennelPort never forwards
  inquiries into KennelOS by itself.


### 3.11 Pages from the site survey

What the survey of real breeder websites
([`KennelPort_Site_Directory.md`](KennelPort_Site_Directory.md)) found that the list
above lacked. Each is a section the breeder turns on, and works with no KennelOS.

**How it works** (`/how-it-works`): the buying process step by step: apply, approval,
deposit, pick order, when picks happen, how long a family has to answer, go-home week,
paying the balance. 14 of the 28 sites read had a page like this.
- *On its own:* as many steps as the breeder needs (one to ten), each a heading, a short
  text and an optional **More detail** expander; numbered automatically, reordered by
  dragging, shown as a sliding set (section 3.12).
- *With KennelOS linked:* the steps KennelOS's waitlist actually runs are filled from their
  waitlist settings (application fee, how picks are offered, days to answer), so the page
  can't drift from what happens. The breeder can add steps and change the wording.

**Programs** (`/programs`): guardian homes and any other program, each with its terms
(where the family must live, what they pay for, how many litters, ownership after
retirement), a short FAQ and an application through the inquiry form.
- *On its own:* a program is a title, a description and its terms.
- *With KennelOS linked:* program names and their public descriptions
  (`waitlist_programs.public_description`). Guardian families are never named, and a
  guardian dog's page never says who keeps it.

**How we raise puppies** (`/raising`): the raising method (Puppy Culture, ENS) and a
week-by-week plan: "Weeks 1–2", "Weeks 3–4", … each with what puppies learn and what the
breeder does. Breeder only; KennelOS fills none of it.

**How to pay safely** (`/pay-safely`): the page behind the safe-payment notice (section
3.9): payment methods accepted and refused, "this is our only website", how to check
they're talking to the real breeder. On by default.
- *With KennelOS linked:* the accepted payment methods can come from KennelOS, if they
  choose.

**Retired dogs** (`/dogs/retired`) and **In memory** (`/dogs/remembered`): retired
breeding dogs with their stories, and dogs who have died, with dates and a tribute.
- *On its own:* a dog moves to these pages when the breeder sets it retired or deceased.
- *With KennelOS linked:* status `retired_breeding` or `deceased` (with `date_of_death`)
  moves it, only if ticked **Show on website**. In memory is off by default.

**Older puppies** (`/litters/older`): puppies still available after their go-home date
("12 weeks and older"), often at a changed price.
- *On its own:* a puppy the breeder marks available past the litter's ready date shows
  here as well as on its litter.
- *With KennelOS linked:* worked out from the litter's `estimated_ready_date` and each
  puppy's status.

**Show results** (`/shows`): show wins and titles by dog and by date ("brags").
- *On its own:* results the breeder types (show, date, award).
- *With KennelOS linked:* logged show results and earned titles.

**Litter diary** (`/litters/<slug>/diary`): dated updates on a litter: eyes open, first
walk, weights, puppy parties, each with text and photos.
- *On its own:* entries the breeder adds.
- *With KennelOS linked (decision 19):* KennelOS's milestones, and weights if they choose,
  arrive as draft entries for the breeder to add words and photos to. Nothing goes up
  without their edit.

**Planned litters, in more detail.** A planned litter's page (`/litters/<slug>` before
birth) shows the sire and dam cards with health results, the expected month, when puppies
should go home, a write-up of the pairing, **Apply for this litter**, and "Last updated".
- **Status in plain words:** Planned, Bred (awaiting confirmation), Confirmed. *With
  KennelOS linked:* from the pairing's status (`planned`, `bred`, `confirmed_pregnant`),
  per the Coming up switches.
- **Picks (decision 18):** picks taken and open per sex, as counts, with the price per
  pick when prices show. *On its own:* the breeder sets the counts. *With KennelOS
  linked:* worked out from waitlist offers and sales; counts only, never who holds a pick.

**Family login** (a link, not a page): linked breeders can show a **Family login** link
in the footer that opens KennelOS's family status page, which already gives each family
their countdown, checklist and turn (decision 20). KennelPort builds no portal of its own.

### 3.12 What a breeder can change

The rule: **breeders change content and switch things on and off; the template keeps the
layout.** That's what keeps every site looking like the AK sample (design direction
preference 2) and keeps support small. Everything below is a form in the manage app, with
a live preview.

**Pages.** Every page has an **On** switch except Home, Contact and Privacy; How to pay
safely is on by default.
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

- **Sign-in:** email and a 6-digit code, then a session for that browser. This is the
  pattern KennelOS cloud already uses (`cloud/src/auth.js`), so reuse its approach and
  rate limits.
- **Roles:** `owner` (the breeder), optional `editor` (a helper), and `operator` (you, on
  every site).
- **Limits:** a storage cap per site and limits on photo and album counts, set by you in
  the ops console and enforced by the server.

### 4.1 Draft, preview, publish

- **The tables are the draft.** Every edit in the manage app or ops console, and every
  KennelOS bundle (section 5.3), changes the site's tables directly. Nothing visitors see
  changes yet.
- **Preview** renders the site from the tables, behind the private preview link.
- **Publish** reads the whole site from the tables and writes it as one **snapshot**: a
  single JSON document with every page, dog, litter, puppy, album and embed that is
  visible, plus the list of photos and files it uses. The site then points at the new
  snapshot in one step.
- **The renderer reads only the published snapshot**, never the draft tables. A publish
  is all or nothing (visitors never see half an edit), pages render from one read, and the
  Worker can cache it by snapshot id.
- **Rollback:** the last 10 snapshots are kept; **Undo publish** in the manage app or ops
  console points the site back at the previous one.
- **Redirects** are worked out at publish time: any path in the previous snapshot whose
  record now has a different slug gets a row in `redirects`.
- **Deleting** a photo or file in the draft marks it removed; it stays in R2 while a kept
  snapshot still uses it, then a daily cleanup deletes it.

### 4.2 Photos and files

- **In the browser:** photos are resized before upload (about 1600px WebP plus a 400px
  thumbnail). Re-encoding also removes location data (EXIF GPS) from phone photos, which
  would otherwise reveal where the breeder lives.
- **On the server, too:** the browser step can be skipped by anyone calling the upload
  API directly, so the server checks every upload itself: only WebP accepted for photos,
  within a maximum size and pixel dimensions, and any file carrying an `EXIF` or `XMP`
  chunk is rejected. Downloads must be PDFs. Each upload counts against the storage cap.
- **Private files stay private:** the renderer serves a photo or file only if the
  published snapshot lists it as public. Health certificates and anything not ticked
  **Show on site** are only reachable through the manage API with a signed-in session,
  whatever its R2 key.

### 4.3 Closing a site

A site's content can be deleted **by the breeder** (a **Delete my site** button in the
manage app, owner only) **or by you** (in the ops console). Either way:

1. **Confirm.** The breeder types their subdomain to confirm. The screen offers **Download
   a copy first** (a zip of their text and photos) but doesn't require it.
2. **Delete everything, immediately.** Every dog, litter, puppy, page, album, embed,
   snapshot and redirect row; every photo and file in R2 (`sites/<site_id>/`); every
   sign-in, session and link token; every stored inquiry; and the site's request record.
   No grace period, and KennelPort keeps no copy.
3. **What's left elsewhere, said plainly.** R2 deletion is immediate. D1 keeps its own
   point-in-time recovery (Time Travel) for up to 30 days, which KennelPort can't turn
   off, so deleted rows only disappear from it after that. Emails already sent (inquiries,
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
   they are.
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
  names and public descriptions. If decision 18 allows: pick counts. If decision 19
  allows: milestones and weights, as draft diary entries. If decision 6 allows prices: litter prices, deposits, the
  registration surcharge, extras prices and the fee per mile.
- **KennelPort only:** website bio, prices (unless decision 6 allows them), photo choice
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
  device links once; or decide one device publishes (decision 11).
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
  leave KennelOS: it's the list the public page already shows.
- Service-worker precache entries and a cache bump for any new files.

---

## 6. Data model (sketch)

| Table | Key fields |
|---|---|
| `sites` | id, subdomain (unique), kennel_name, template, scheme (section 3.13), dark_mode (`auto` / `light_only`), kennelos_public_id (for the waitlist list, 3.8), status (`draft` / `live` / `suspended` / `closed`), published_snapshot_id, closed_at, storage_limit, photo_limit, album_limit, created_at |
| `snapshots` | id, site_id, published_at, published_by, content (the whole published site as JSON, section 4.1); the last 10 per site kept |
| `site_users` | site_id, email_hash, role (`owner` / `editor`) |
| `sessions`, `login_codes` | as in KennelOS cloud |
| `requests` | id, kennel_name, contact email, message, source (`kennelos` / `form`), status (`new` / `in_progress` / `done` / `declined`) (backlog) |
| `dogs`, `litters`, `puppies` | site_id, slug, content fields, `source` (`kennelport` / `kennelos`), `kennelos_id` when linked, `hidden_by_kennelos` (section 5.3) |
| `pages` | site_id, slug, section type, content |
| `redirects` | site_id, old path, new path (written at publish time) |
| `embeds` | site_id, page or record it sits on, provider, item id, title, preview photo, order |
| `photos` | site_id, r2_key, thumb_key, width, height, bytes, alt text, public, removed_at |
| `albums`, `album_photos` | site_id, title, slug, cover; ordered photo list |
| `links` | site_id, token_hash, linked_at, last_bundle_at, last_bundle_summary |
| `custom_domains` | site_id, hostname, cloudflare_hostname_id, registrar (detected, backlog), status (`pending` / `active` / `stuck` / `broken`), checked_at, connected_at |
| `health_results` | site_id, dog, test, result, date, verify_url, show (off by default), certificate file (private unless ticked) |
| `posts` | site_id, slug, title, date, body, cover photo (news, section 3.9) |
| `stories` | site_id, kind (`review` / `at_home`), quote, first name, town, photo, permission_confirmed_at |
| `programs` | site_id, slug, title, description, terms, `kennelos_id` when linked |
| `diary_entries` | site_id, litter, date, title, body, photos, `source` (`kennelport` / `kennelos`), draft until the breeder edits it |
| `steps` | site_id, page (`how_it_works` / `raising`), order, heading, body, detail (the More detail expander), `source` |
| `site_pages` | site_id, page key, enabled, menu_label, order within its menu group (section 3.12) |
| `home_blocks` | site_id, block key (`hero` / `facts` / `story` / `dogs` / `litters` / `reviews` / `waitlist`), enabled, content (wording, photos, facts, features) |
| `expanders` | site_id, page (`policies` / `faq` / `waitlist_help`), order, heading, body, start_open |
| `extras` | site_id, kind (`item` / `homegoing`), group, name, description, photo, price_from, price_to, weeks, lead_in, checklist, closing, featured, order, `source` (section 3.4) |
| `files` | site_id, r2_key, title, bytes, public, removed_at (downloads and certificates, PDFs only) |
| `events` | site_id, title, date, town |
| `inquiries` | site_id, form answers, received_at, deleted after 90 days (section 3.10, decision 12) |
| `payment_info` | site_id, kind (`application_fee` / `deposit`), methods, instructions, due_note, pay_url, show_on_site (off by default), `source` (section 3.9) |
| `form_fields` | site_id, field type, label, required, order (the inquiry form's questions) |

R2 keys look like `sites/<site_id>/photos/<photo_id>.webp`, so a whole site can be deleted
or exported at once. Whether a file is public is decided by the published snapshot, never
by its key (section 4.2). A closed site keeps only its `sites` row (subdomain, `closed`,
closed_at); every other table is emptied for it (section 4.3).

---

## 7. Cost

| Item | First site | 15 breeders |
|---|---|---|
| Domain (`kennelport.com`) | about $10–15 a year | same |
| Workers | $0 (free tier) | $0; $5 a month if traffic grows |
| D1 | $0 | $0 (under 50 MB against a 5 GB free tier) |
| R2 photos | $0 | $0 for about 3 years (about 3 GB a year against 10 GB free; no bandwidth fees) |
| Resend email | $0 | $0 on the free tier at this volume |
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
| **1. Renderer + ops** | One template, the ops console, preview links, snapshot publish and undo (4.1), reserved names, OG tags, close a site and the closed notice | Build and host the site yourself, with no breeder login yet |
| **2. Breeder login** | Email-code sign-in, manage app, preview and publish, photo upload with resizing and the server checks (4.2), storage limits, **Delete my site** with download-a-copy | Hand the site over |
| **3. The first site's pages** | Everything in the AK sample (decision 14): Home with its blocks, About (story, reviews, contact), Kennel residents with flip cards and health results (3.7), Puppies (available, upcoming, older) with statuses (3.6), How it works steps (3.11), Extras with homegoing packages (3.4), Policies and FAQ, the waitlist page and its status-page help (3.8, decision 21) with how to pay the application fee and deposit (3.9), inquiry form and inbox (3.10); plus the safe-payment notice, privacy page and search basics | The family site is complete and live |
| **4. Customisation and schemes** | Page and Home-block switches, menu labels, any-length steps, expanders and extras (3.12); the colour schemes with light and dark versions (3.13) | Other breeders' sites can differ from AK's without new code |

If the first site wants its own domain, connect it by hand (section 2.4).

### 8.2 Backlog (built when someone asks)

Rough order of likely need; any item can go first.

| Item | Delivers |
|---|---|
| **Albums, embeds & sharing** | Albums, embeds with stored previews (3.3), share links, QR codes |
| **The rest of section 3.9** | Pickup page (3.5), waitlist page with outside forms (3.8), announcement banner, families' stories, past litters, news, adults, stud dogs, going home, the breed, downloads, events |
| **Survey pages (3.11)** | Programs, how we raise puppies, how to pay safely as a page, retired and in-memory dogs, show results, litter diary, planned-litter status and picks |
| **KennelOS link** | Link codes, matching, the bundle API and its rules (5.3) in KennelPort; then in KennelOS: Show on website, `siteExport.js`, Update website, filling `dog.url`, the kennel's website, `extras_info_url` and the embed's allowed sites |
| **Requests** | Public request form on `kennelport.com`, email alert, ops inbox; KennelOS's **Request a website** button |
| **Guided custom domains** | **Your own domain** with registrar detection, guided steps and automatic checks (section 2.4) |
| **Later** | More templates, visitor stats |

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
7. **Embeds:** yes, several providers, including YouTube and Facebook pages, built from an
   approved list (section 3.3).
8. **When someone leaves:** the breeder or you deletes all content immediately, and the
   address shows a "no longer hosting with KennelPort" notice (section 4.3).
14. **Which pages ship first:** the AK sample's pages (section 8.1, phase 3). Past
    litters and news, proposed earlier, move to the backlog because the sample doesn't
    have them.
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

**Open**

6. **Prices from KennelOS:** the current rule is that KennelOS never sends prices, but
   KennelOS now holds litter prices, extras prices and a fee per mile. Proposed: the
   bundle may carry them, shown only where the breeder switches prices on. Sections 3.2,
   5.1 and 5.3 follow whichever is chosen.
9. **Content rules and suspension:** only needed once sites go beyond family: terms of
   service and what gets a site suspended.
10. **Puppy labels:** confirm the table in section 3.6, especially whether placed pups
    stay visible and how health hold shows.
11. **Link token across devices:** each device links once (token in `device_secrets`), or
    one device is the publisher (section 5.5).
12. **Inquiry storage:** inquiries are emailed and also kept in the manage app's inbox for
    90 days (proposed), or emailed only and never stored. Storing means names and emails
    sit in KennelPort's database; the privacy page says so either way.
13. **Testimonials and permission:** proposed that the breeder confirms each family
    agreed, with a date kept; visitors never post reviews themselves.
15. **Main address for a custom domain:** proposed `www.` always, with the bare domain
    pointing or forwarding to it, because a `www` CNAME works at every provider and a bare
    domain doesn't. Cloudflare's own support for bare domains on custom hostnames without
    CNAME flattening at the registrar is Enterprise-only.
16. **How a KennelOS bundle changes the site:** proposed as in section 5.3: matched by
    KennelOS id, KennelOS fields replaced, KennelPort fields untouched, records missing
    from the bundle hidden rather than deleted, and a bundle never deletes photos.
17. **Spam check on the inquiry form:** proposed Turnstile from the start (free, usually
    invisible), with a honeypot and rate limits behind it.
18. **Picks on litter pages:** showing picks taken and open per sex tells visitors how
    full a litter is, a business choice. Proposed: a switch per litter, off by default;
    from KennelOS, counts only.
19. **Litter diary from KennelOS:** milestones (and weights, if chosen) arriving as draft
    diary entries means new kinds of data in the bundle. Proposed: opt-in per litter,
    drafts only.
20. **Family login link:** proposed for linked breeders: a footer link to KennelOS's
    family status page, with no KennelPort portal.

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
| Tie-in to one host | Plain D1 and R2 data, with a full export for each site |
| A scammer copies a breeder's site or photos to sell puppies that don't exist | The safe-payment notice on by default; official contacts on every page; you can point to the real site when families ask |
| The inquiry form attracts spam or collects more than it needs | Turnstile, a honeypot and rate limits; a fixed list of field types; inquiries deleted after 90 days (decision 12) |
| A custom domain lapses or its records change | The daily check stops the redirect, so the `kennelport.com` address serves the site again; the breeder and you are emailed (section 2.4) |
| A breeder breaks their email while editing DNS | The steps add only the site's records and say not to change nameservers or delete other records |
| A non-KennelOS breeder gets a lesser site | The parity rule (top of the plan): every section is a KennelPort form first; KennelOS only fills fields |

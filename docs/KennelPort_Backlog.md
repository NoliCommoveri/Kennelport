# KennelPort: backlog

> Built when someone asks for it, not part of version 1. Version 1 is section 8.1 of
> [`KennelPort_Plan.md`](KennelPort_Plan.md); this file holds the designs for everything
> after it. Section numbers in brackets point at the plan, where each item's place in the
> site (its address, its fields from KennelOS) is set. The parity rule from the plan holds
> here too: each item works with no KennelOS first.

## 1. Order

Rough order of likely need; any item can go first.

| Item | Delivers |
|---|---|
| **The rest of section 3.9** | Pickup page (3.5), waitlist page with outside forms (3.8), announcement banner, families' stories, past litters, news, adults, stud dogs, going home, the breed, downloads, events |
| **Survey pages (3.11)** | Programs, how we raise puppies, how to pay safely as a page, retired and in-memory dogs, show results, litter diary, planned-litter status (no pick counts, plan decision 18), the three-generation pedigree |
| **Requests** | Public request form on `kennelport.com`, email alert, ops inbox; KennelOS's **Request a website** button |
| **Guided custom domains** | **Your own domain** with registrar detection, guided steps and automatic checks (section 3) |
| **Later** | More templates, visitor stats |

## 2. Requests (plan section 1, step 1)

KennelOS Pro users press **Request a website** in the app; anyone else uses a public
request form on `kennelport.com`. Either way you get an email and the request appears in
your console's request inbox. The in-app button is Pro only (decision 2), goes through
KennelOS's `editionConfig.js`, and is a Kels task (plan 5.5).

## 3. Guided custom domains (plan section 2.4)

Version 1 connects a custom domain by hand (plan 2.4). Guided steps that check themselves
are only worth building if several breeders
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
3. **Only the records the site needs**, as in the plan's by-hand steps, each shown with its
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
6. **When it's live**, the manage app tells the breeder (on the page and as a push
   notification, plan 3.10) and you get an email. If it's still pending after 3 days, you
   both hear the same way, and the ops console shows it as stuck so you can help.

The registrar guides would live in one file, an entry per provider (how to find DNS
settings, the field names, whether root CNAMEs or ALIAS records work, how forwarding is
set up).

## 4. Pickup and delivery page (plan section 3.5)

**On its own:** `/pickup` lists the breeder's pickup places (a name, the town or a public
place, and notes such as "by the north entrance") and their delivery policy in plain
words: how far they will drive or meet, a fee per mile or a flat fee (when prices show),
and whether they use a flight nanny. Never a home address: the form asks for a public
place, and a hint says why (plan section 10).

**With KennelOS linked:** KennelOS records pickup places (each with **Show to families**;
one is the standard location, where mileage starts) and transport settings (fee per mile,
one way or round trip, free under some miles, how far a family must live to suggest their
own meetup place, the "we'll be in touch" distance).
- Only places marked **Show to families** come over.
- The policy sentence is written from those settings: "Families at least 40 miles away can
  ask us to meet nearer to them; beyond 150 miles, we'll be in touch about driving or a
  flight nanny." The fee per mile only if prices show (decision 6).
- Pickup times and booking stay on the KennelOS status page.

## 5. The rest of the standard features (plan section 3.9)

Each is a section the breeder turns on; all are KennelPort content only.

- **Families' stories:** photos of grown puppies in their homes, with a first name and
  town, submitted by families and approved like reviews, or added by the breeder with
  the family's agreement. Never a full name, address or buyer record.
- **Past litters:** a litter archive ("Where are they now") with photos, no buyer names.
- **Adults available:** retired or adult dogs looking for homes, with the same statuses.
- **Stud dogs:** a stud page per male offered at stud: health testing, titles,
  requirements for outside females, "Contact us" (fees follow the prices rule).
- **The breed:** a page about the breed, temperament, care and grooming, with links to
  the parent club.
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
- **Visitor stats:** page counts from Cloudflare Web Analytics or Workers
  Analytics Engine, both free and cookie-free.

## 6. Pages from the site survey (plan section 3.11)

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

**How to pay safely** (`/pay-safely`): the page behind the safe-payment notice (plan
section 3.9): payment methods accepted and refused, "this is our only website", how to check
they're talking to the real breeder. On by default.
- *With KennelOS linked:* the accepted payment methods can come from KennelOS, if they
  choose.

**Retired dogs** (`/dogs/retired`) and **In memory** (`/dogs/remembered`): retired
breeding dogs with their stories, and dogs who have died, with dates and a tribute.
- *On its own:* a dog moves to these pages when the breeder sets it retired or deceased.
- *With KennelOS linked:* status `retired_breeding` or `deceased` (with `date_of_death`)
  moves it, only if ticked **Show on website**. In memory is off by default.

**Pedigree** (on each dog page, plan section 3.9): three generations, each ancestor with
its titles.
- *On its own:* typed per dog, with nothing required.
- *With KennelOS linked:* its own ancestors, `pedigree_only` ones included, the same
  parents the waitlist pages already draw (`parentView`, with KennelOS's
  `waitlist_config.parent_pedigree` deciding only what KennelOS's own pages show, plan
  5.1). Needs its own fields: the plan's data model has none, which is why it waits.

**Show results** (`/shows`): show wins and titles by dog and by date ("brags").
- *On its own:* results the breeder types (show, date, award).
- *With KennelOS linked:* logged show results and earned titles.

**Litter diary** (`/litters/<slug>/diary`): dated updates on a litter: eyes open, first
walk, weights, puppy parties, each with text and photos.
- *On its own:* entries the breeder adds.
- *With KennelOS linked (decision 19):* KennelOS's milestones, and weights if they choose,
  arrive as draft entries for the breeder to add words and photos to. Nothing goes up
  without their edit.

**Planned-litter pages.** A planned litter's page (`/litters/<slug>` before
birth) shows the sire and dam cards with health results, the expected month, when puppies
should go home, a write-up of the pairing, **Apply for this litter**, and "Last updated".
- **Status in plain words:** Planned, Bred (awaiting confirmation), Confirmed. *With
  KennelOS linked:* from the pairing's status (`planned`, `bred`, `confirmed_pregnant`),
  for a pairing she has marked **Show on website** (plan 5.3).

**Hiding one puppy** (plan section 3.6): a puppy she would rather not show at all, with no
health hold to say it. Her litter's mark carries all of its puppies, and a puppy's status
comes from KennelOS while linked, so this needs a word of its own in KennelOS — a small
`website_status` on a puppy-Dog, `shown` or `hidden` — rather than a KennelPort switch the
next bundle would overwrite.

## 7. Data these add (plan section 6)

| Table | Key fields |
|---|---|
| `requests` | id, kennel_name, contact email, message, source (`kennelos` / `form`), status (`new` / `in_progress` / `done` / `declined`) |
| `posts` | site_id, slug, title, date, body, cover photo (news) |
| `programs` | site_id, slug, title, description, terms, `kennelos_id` when linked |
| `diary_entries` | site_id, litter, date, title, body, photos, `source` (`kennelport` / `kennelos`), draft until the breeder edits it |
| `events` | site_id, title, date, town |

The `custom_domains.registrar` field and the `at_home` kind of `stories` (plan section 6)
serve items here too.

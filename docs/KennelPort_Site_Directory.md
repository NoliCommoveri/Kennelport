# KennelPort: site directory (DRAFT)

> Status: proposal. A survey of real breeder websites, turned into the page directory a
> KennelPort site offers, with what KennelOS can fill on each page and what only the
> breeder can write. Nothing here is decided; section 5 lists what to settle before it
> changes [`KennelPort_Plan.md`](KennelPort_Plan.md).

## 1. How this was gathered

- **Read directly:** the menus of 28 breeder websites (home page plus full navigation),
  and inner pages on four of them (a litter page, planned litters, available puppies, a
  weekly raising curriculum, a family portal). Goldens, labs, doodles, Aussies, Bernese,
  cavapoos, Old English Sheepdogs, collies, dachshunds, Boerboels, Malinois, German
  Shepherds, Lagottos; small home programs to large doodle businesses.
- **From search results:** about 25 more sites, for specific pages (guarantees,
  contracts, stud requirements, delivery fees, training add-ons, application steps).
- Four sites blocked automated reading and are left out of the counts.

The counts below are menu items matched by keyword, so they're approximate: a site that
puts its health guarantee inside the FAQ isn't counted as having one. The sources are
listed in section 6.

## 2. What real breeder sites have

Share of the 28 menus read directly:

| Page | Sites | | Page | Sites |
|---|---|---|---|---|
| About / our story | 25 | | Retired dogs or adults available | 12 |
| Our dogs / parents (often girls and boys apart) | 22 | | Training add-ons | 12 |
| Available puppies / current litter | 19 | | Blog, news or journal | 12 |
| Apply / questionnaire | 19 | | Going home, supplies, food, care | 12 |
| Testimonials / reviews | 19 | | Breed information | 11 |
| FAQ | 18 | | Health testing or guarantee page | 10 |
| Upcoming / planned litters | 16 | | Stud service | 9 |
| Pricing / deposit | 16 | | Gallery / photos | 9 |
| How it works / process | 14 | | Pickup, delivery, shipping | 8 |
| Past litters / past puppies | 7 | | Raising program or weekly curriculum | 7 |
| Waitlist as its own page | 6 | | Contracts as pages | 6 |
| Guardian program | 5 | | Show results / brags | 4 |
| Credentials (club, "Good Dog", Breeder of Merit) | 3 | | Memorial ("Rainbow Bridge") | 2 |
| Family portal / login | 2 | | | |

**What the inner pages showed:**
- **A litter page** (Aussies): both parents, date of birth, the parents' DNA test list,
  themed puppy nicknames, the deposit and payment methods accepted, both contracts, how
  to visit.
- **Planned litters** (Boerboels): sire and dam cards, registry, "Expected: December 2026",
  when breeding and go-home are expected, a short pairing write-up, and **picks by sex,
  each with a price and Reserved or Available**, plus "Last updated" and **Apply for this
  litter**.
- **Available puppies** (Boerboels): a two-generation pedigree on the litter, birth date
  and age in weeks, and per-puppy temperament sliders written by the breeder.
- **Current and planned litters** (Lagottos): a status timeline ("Bred 26 October,
  awaiting confirmation"), both parents' hips, elbows and DNA, what the pairing means for
  the puppies (carrier odds), and a plain warning that dates are expectations.
- **A family portal** (Lagottos): a private page per family with a countdown to go-home
  day and a checklist. This is what KennelOS's family status page already is.
- **A weekly curriculum** (doodles): Puppy Culture week by week, breeder-written.

**What stands out:**
- **Trust is the job of the site.** About pages (25 of 28), testimonials (19), FAQ (18)
  and health pages are most of every menu. KennelOS holds the evidence (tests, titles,
  litters); only the breeder can write the promises and the story.
- **The buying process is spelled out** (14 of 28 have a process page, 16 a pricing or
  deposit page). Apply, approval, deposit, pick order, selection week, go-home. KennelOS's
  waitlist already runs exactly this, so the site can describe what actually happens.
- **Planned litters are a sales page.** Picks by sex with Reserved / Available is what
  KennelOS's waitlist picks already know; the site can show counts without any names.
- **Dog life stages drive pages:** girls and boys, retired, adults available, older
  puppies, memorial. KennelOS's dog statuses map onto them directly.
- **Scam copies are real.** Breeders' photos, names and phone numbers are copied onto fake
  sites; a "how to pay safely" notice and official contacts are worth having by default.

## 3. The site directory

Every page below works with no KennelOS (the parity rule). **From KennelOS** names what a
linked kennel can fill; **Breeder only** is content KennelOS doesn't have and shouldn't.
Pages marked *new* aren't in the plan yet (section 5).

### 3.1 Front door

| Page | What real sites show | From KennelOS | Breeder only |
|---|---|---|---|
| **Home** `/` | Name and logo, hero photo, a line about the kennel, current litter or "puppies available", latest news, badges (club, Breeder of Merit), review summary | Kennel name, prefix, logo, town and region (`kennels.kennel_name`, `prefix`, `logo_data_url`, `location`); the current or next litter as a card; waitlist open or full | Hero photo, intro line, announcement banner, featured review, badges |
| **About us** `/about` | The family's story, how they started, why this breed, the home, farm or facility, philosophy, years breeding, litters a year, credentials (club membership, "Good Dog" certified, Breeder of Merit), charitable giving | Breeds (`preferred_breeds`); count of litters bred, if they want it shown | Story, photos of family and property, philosophy, visiting policy, memberships and programs |
| **Contact** `/contact` | Email, phone, social links, form, "by appointment only" | — | Contact details, social and Google Business links, the inquiry form's questions |

### 3.2 The dogs

| Page | What real sites show | From KennelOS | Breeder only |
|---|---|---|---|
| **Our dogs** `/dogs` (filter girls / boys) | A card per breeding dog: photo, call name, registered name, colour, short note | Dogs ticked **Show on website** with status `active_breeding`: call and registered name, sex, colour (`color_markings`), date of birth | Photos and their order, the short note |
| **One dog** `/dogs/<slug>` | Photos, registered name, titles, health clearances with OFA links, pedigree, temperament, show career, litters produced | Titles (`title_earned` and `show` events), health results (`genetic_test`, `ofa_pennhip`, `breed_specific_test` events, filtered by `parent_tests` and the dog's `waitlist_tests`), three-generation pedigree (sire and dam chains, `pedigree_only` ancestors), registry, COI if they choose (`recorded_coi`), litters produced (derived from litters) | Bio and temperament, photos, video embeds, lab verification links where KennelOS has none |
| **Retired** `/dogs/retired` | Retired dams and sires, "enjoying the couch", sometimes looking for homes | Dogs with status `retired_breeding` | Their stories, photos |
| **Adults available** `/adults` | Adults or retired dogs for rehoming, with price or "contact us" | Dogs with status `for_sale` | Description, price (per the prices rule) |
| **Stud dogs** `/stud` | Each stud: clearances, titles, pedigree; requirements for outside females (clearances, brucellosis test, pedigree review), fee, AI or not | The dog's titles, tests and pedigree as on its dog page | Which males are offered, requirements, fee text, terms (KennelOS's stud fees are private and never sent) |
| **Show results** `/shows` *new* | Show careers per dog, recent wins ("Show brags", "News and brags") | Logged `show` events and earned titles | Write-ups, photos |
| **In memory** `/dogs/remembered` *new* | "Rainbow Bridge", "Retired and remembered": dogs who have died, with dates | Dogs with status `deceased` and `date_of_death`, only if ticked | A tribute, photos |

### 3.3 Litters and puppies

| Page | What real sites show | From KennelOS | Breeder only |
|---|---|---|---|
| **Litters** `/litters` | Current litters with parents and puppies; upcoming litters with expected dates; "waitlist full"; litters often named after the dam ("Paisley's puppies") | Whelped litters (`whelp_date`, parents, status, `nickname`); upcoming litters from pairings (`planned_date`, `expected_due_date`), per the **Coming up** switches (month and year only for planned heats) | Litter write-up, cover photo |
| **Planned litter** `/litters/<slug>` before birth | Sire and dam cards, registry, "Expected: December 2026", expected go-home month, a pairing write-up, **picks by sex with Reserved / Available**, "Apply for this litter", "Last updated"; a status timeline ("Bred 26 October, awaiting confirmation") | Pairing status as plain words (`planned` → "Planned", `bred` → "Bred, awaiting confirmation", `confirmed_pregnant` → "Confirmed", per the Coming up switches); expected due date; both parents' health results; picks taken and open per sex, as counts worked out from waitlist offers and sales (never who holds them); "last updated" from the last bundle | Pairing write-up, what to expect from the cross, any "dates are expectations" note |
| **One litter** `/litters/<slug>` | Parents, birth date and age in weeks, a pedigree on the litter, the parents' DNA test list, go-home date, deposit and payment methods, puppy cards, prices or "contact us" | Parents' cards and health results, two-generation pedigree, `whelp_date` (age worked out on the page), puppies born (`puppies_born_alive`), ready date (`estimated_ready_date`), deposits from (`accept_deposits_date`), each puppy's status (plan section 3.6); prices only per decision 6 | Notes, photos and albums, video, the puppies' nickname theme |
| **One puppy** `/litters/<litter>/<collar>` | Photos, sex, colour, collar name, status, personality (one site uses temperament sliders) | Sex, colour, status | Photos, personality note or temperament scale |
| **Older puppies** `/litters/older` | "Puppies 12 weeks and older", sometimes at a lower price | Puppies still available past the ready date, worked out from `estimated_ready_date` and status | Price change wording |
| **Litter diary** `/litters/<slug>/diary` *new* | Weekly updates: eyes open, first walks, weights, puppy parties | Opt-in only: `milestone` events and, if they choose, `weight_check` events for the litter | Weekly text and photos |
| **Past litters** `/litters/past` | Archive by year, "where are they now" | Closed litters with parents and dates | Photos; never buyer names |
| **Puppies at home** `/stories` | Photos of grown puppies sent by families, with first name and town | — (buyers and placements are never sent) | Every entry, with the family's permission ticked |

### 3.4 Buying a puppy

| Page | What real sites show | From KennelOS | Breeder only |
|---|---|---|---|
| **How it works** `/how-it-works` *new* | Apply, approval, deposit, pick order by deposit date, selection week, answer window, go-home week, payment of the balance | The steps KennelOS's waitlist already runs, from `waitlist_config` (application fee, how picks are offered, answer window in days); programs and their `public_description` | Wording, extra steps, exceptions (for example "we keep first pick") |
| **Apply / waitlist** `/waitlist` | Application form, waitlist open or full, deposit link | Embedded KennelOS application and public list (plan section 3.8) | The form's questions, or an outside form, if not using KennelOS |
| **Programs** `/programs` *new* | Guardian home program: terms, location limit, what the family pays, litters expected, ownership after retirement; application | Program names and `public_description` from `waitlist_programs`; guardian dogs never named with their family (`owner_contact_id` is private) | The program's terms, FAQ, application questions |
| **Policies** `/policies` | Health guarantee (72 hours to lifetime), contract, spay/neuter terms and deadlines, take-back for life, deposit and refund terms | Deposit and fee rules as the waitlist applies them, if they want them shown | Every promise: guarantee, contract summary, spay/neuter, take-back. A sample contract as a download |
| **Prices** (on litter and extras pages) | Per sex or per colour, deposit, registration upgrade, often "contact us" | Only if decision 6 allows (`expected_price_*`, `full_reg_surcharge_*`) | Everything else, and the **Show prices** switch |
| **Extras** `/extras` | Training packages, photo sessions, puppy packs, crates, early potty training | Extras names, groups, descriptions (`extra_charge_list`); amounts per decision 6 | Photos, longer descriptions |
| **Pickup and delivery** `/pickup` | Pickup at home or a public place, meet halfway, ground transport, flight nanny, fees per mile, payment before travel | Pickup places marked **Show to families**, transport settings (distances, fee per mile per decision 6), delivery methods offered | Flight nanny wording, travel-day rules, health certificate note |
| **How to pay safely** `/pay-safely` | "We only accept…", "this is our only website", scam warning; one litter page listed the cards and checks accepted and the ones refused | Accepted payment methods, if they want them listed (KennelOS's payment instructions) | Wording; on by default |
| **Family login** (a link, not a page) | Two sites have a private family portal: countdown to go-home day, checklist | KennelOS's family status page already is this; the site only links to it | — |

### 3.5 Raising and going home

| Page | What real sites show | From KennelOS | Breeder only |
|---|---|---|---|
| **How we raise puppies** `/raising` *new* | Puppy Culture, ENS, a week-by-week curriculum (weeks 1–2 ENS, 3–4 first experiences, 4–5 socialization, …), where puppies live in the home | — | All of it |
| **Going home** `/going-home` | What comes with the puppy (vaccines, deworming, microchip, food, blanket with mum's scent), shopping list, first week | Vaccines and preventatives usually given by go-home age (the kennel's typical schedule, not one puppy's record); the breed's feeding schedule (`breed_feeding_schedules`) | Shopping list, packet contents, training tips. Per-puppy records stay in Companion, never on the site |
| **The breed** `/breed` | Temperament, care, grooming, the parent club | — | All of it |
| **FAQ** `/faq` | Common questions on price, waiting, visits, shipping, allergies | The application FAQ from `waitlist_config`, if they use KennelOS's | Other questions |

### 3.6 Keeping in touch

| Page | What real sites show | From KennelOS | Breeder only |
|---|---|---|---|
| **News** `/news` | Litter born, show wins, updates | Optional draft posts: "Litter born" from a whelping, "Title earned" from a title, each landing as a draft the breeder edits before publishing | Every post's text and photo |
| **Reviews** `/reviews` | Quotes from families, a Google review summary and link | — | Quotes with permission, the Google reviews link (no review widgets or scripts) |
| **Albums** `/albums` | Photo galleries by litter or dog | Album per litter or dog can be suggested from KennelOS records | Photos |
| **Events** `/events` | Shows and events they'll attend | Upcoming `show` entries, if they choose | Other events |
| **Downloads** `/downloads` | Application, sample contract, care guide | — | The PDFs |
| **Privacy** `/privacy` | Rare on real sites | — | Generated for every site (plan section 3.9) |

## 4. What KennelOS fills, in one view

**Fills well** (KennelOS is the source of truth, read-only on the site while linked):
dogs and their names, sex, colour, birth dates and statuses; titles and show results;
health results, filtered by the same rules as KennelOS's family pages; pedigrees; litters,
parents, whelp and ready dates; upcoming litters from pairings, per the Coming up
switches, with the pairing's status (planned, bred, confirmed); each puppy's status;
older puppies still available; retired, available and remembered dogs; the waitlist
process, programs and FAQ; pickup places and transport distances; extras names; kennel
name, prefix, logo and town.

**Could fill, new from this survey:** picks taken and open per sex on a planned or
current litter, as counts only (the Boerboel site's most prominent feature, and data
KennelOS's waitlist already has).

**Could fill, if the breeder chooses** (proposals, each needs a yes): prices (decision
6); a litter diary from milestones and weights; draft news posts from a whelping or a
title; upcoming show entries; the vaccines usually given by go-home age.

**Never from KennelOS:** buyers, families, guardians, co-owners and any contact; sales,
contracts and invoices; private notes; stud fees and stud partners; addresses; individual
puppies' medical records; vault documents and certificates; anything not ticked **Show on
website**.

**Breeder only, always:** About us and the family's story; photos and video; policies,
guarantees and contracts; testimonials and puppies-at-home stories; how they raise
puppies; guardian program terms; stud requirements; going-home and breed pages; the
scam notice's wording; reviews links.

## 5. What this changes in the plan (to decide)

1. **New pages:** How it works, Programs (guardian homes), How we raise puppies, Retired
   dogs, Show results, Litter diary, Reviews, How to pay safely as its own page. Add them
   to plan section 3, and the paths to 3.1?
2. **Upcoming litters from pairings:** the plan's "planned litters" should name KennelOS
   pairings (`planned_date`, `expected_due_date`, `status`) as the source, per the Coming
   up switches, and show the pairing's status in plain words.
3. **Dog statuses drive pages:** `active_breeding` → Our dogs, `retired_breeding` →
   Retired, `for_sale` → Adults available, `deceased` → In memory, each only when ticked
   **Show on website**.
4. **Litter diary and draft news posts from KennelOS:** new kinds of data in the bundle
   (`milestone`, `weight_check`, whelping and title events). Opt-in, and only as drafts.
5. **Waitlist process on the site:** `waitlist_config` (process, FAQ) and
   `waitlist_programs.public_description` in the bundle, so How it works, Programs and
   FAQ match what KennelOS actually does.
6. **Version 1:** the first family site's pages stay as in decision 14. Of the new pages,
   **How it works** and **How to pay safely** are the strongest candidates to add, since
   nearly every real site explains its process.
7. **Reviews:** a link to the breeder's Google reviews only; no review widgets, which
   would need outside scripts (plan section 3.3).
8. **Picks on litter pages:** counts of picks taken and open per sex, worked out from
   KennelOS's waitlist offers and sales. A new kind of data in the bundle (counts, no
   names), and a business choice to show how full a litter is: off by default?
9. **Family login link:** a **Family login** link on the site pointing at the KennelOS
   family status page, for linked breeders. KennelPort builds no portal of its own.
10. **Payments stay out.** Several sites take application fees, deposits and balances
   (some through a shop). KennelPort still takes no payment; a linked breeder's site can
   point to KennelOS's online application fee instead.

## 6. Sources

Menus read directly (28): Gardner Lane Puppies, Hunters Goldstrike, Sunflower Dachshunds,
Vom Geliebten Haus, Fine and Dandy Aussiedoodles, Bernedoodles & Co., Pikes Peak Doodles,
McClelland Doodles, Blackwood Acres Kennels, Windy G Farm, Simply Goldendoodles, Goldens
On The Rocks, Rosehaven Homestead, Lonestar Doodles, Crockett Doodles, Peterbuilt
Boerboel, Golden Haven Retrievers, Doodle Patch Farm, Foreverly Kennel, Stormies Doodles,
Northwest Lagotto, Angels of Gold, Endless Mountain Labradors, Dantero Malinois,
Kodalihart Labradors, Field Bred Golden Retrievers, Shepherd Pals, Sweetheart Goldens.
Inner pages read directly:
[Windy G Farm: a litter](https://www.windygfarm.com/paisley-s-puppies),
[Peterbuilt Boerboel: planned litters](https://www.peterbuiltboerboel.com/planned-litters),
[Peterbuilt Boerboel: available puppies](https://www.peterbuiltboerboel.com/available-puppies),
[McClelland Doodles: weekly curriculum](https://www.mcclellanddoodles.com/weekly-curriculum),
[Northwest Lagotto: litters](https://www.northwestlagotto.com/lagotto-romagnolo-litters),
[Northwest Lagotto: family portal](https://www.northwestlagotto.com/nwl-portal).

All breeder sites used, with links (menus, inner pages and search results):
[Gardner Lane Puppies](https://www.gardnerlanepuppies.com/),
[Sunflower Dachshunds](https://www.sunflower-dachshunds.com/),
[Vom Geliebten Haus](https://www.vomgeliebtenhaus.com/),
[Bernedoodles & Co.](https://bernedoodlesandco.com/),
[McClelland Doodles](https://www.mcclellanddoodles.com/),
[Blackwood Acres Kennels](https://www.blackwoodacreskennels.com/),
[Rosehaven Homestead](https://rosehavenhomestead.com/),
[Peterbuilt Boerboel](https://www.peterbuiltboerboel.com/),
[Foreverly Kennel](https://foreverlykennel.com/),
[Northwest Lagotto](https://www.northwestlagotto.com/),
[Endless Mountain Labradors](https://emlabradors.com/),
[Dantero Malinois](https://dantero.com/),
[Kodalihart Labradors](https://www.kodalihartlabradors.com/),
[Field Bred Golden Retrievers](https://www.fieldbredgoldenretrievers.com/),
[Sweetheart Goldens](https://sweetheartgoldens.com/),
[Ryan's Goldens](https://www.ryansgoldens.com/),
[Angels of Gold](https://angelsofgold.com/),
[Goldens On The Rocks](https://www.goldensontherocks.com/),
[Golden Haven Retrievers](https://goldenhavenretrievers.com/),
[Hunters Goldstrike](https://www.huntersgoldstrike.com/),
[Field Bred Golden Retrievers: puppy process](https://www.fieldbredgoldenretrievers.com/our-puppy-process),
[Field Bred Golden Retrievers: stud services](https://www.fieldbredgoldenretrievers.com/stud-services),
[Sweetheart Goldens: Puppy Culture](https://sweetheartgoldens.com/puppy%20culture.htm),
[McClelland Doodles: how it works](https://www.mcclellanddoodles.com/purchasing-process),
[Houston Texas Doodles: how it works](https://www.houstontexasdoodles.com/about-5),
[Farm Pups: waiting list](https://www.farmpups.com/waitinglist.html),
[Gardner Lane Puppies: application process](https://www.gardnerlanepuppies.com/faqs-adoption-process/our-application-process),
[Riversong Doodles: apply](https://riversongdoodles.com/apply),
[Foreverly Kennel: how to apply](https://foreverlykennel.com/how-to-apply),
[Cappom: waitlist process](https://www.cappom.com/contact-us),
[Crockett Doodles](https://www.crockettdoodles.com/),
[The Doodle Tribe: reviews](https://thedoodletribe.com/reviews/),
[Stormies Doodles](https://stormiesdoodles.com/),
[Doodle Patch Farm: reviews](https://www.doodlepatchfarm.com/about-us/reviews/),
[Lonestar Doodles](https://lonestardoodles.com/),
[Shepherd Pals: reviews](https://www.shepherdpals.com/reviews.html),
[AwesomeDoodle: reviews](https://awesomedoodle.com/why-awesomedoodle/awesomedoodle-reviews/),
[Pikes Peak Doodles](https://www.pikespeakdoodles.com/),
[Pikes Peak Doodles: guardian application](https://form.jotform.com/223116302043034),
[Monarch Standard Poodles: guardian application](https://form.jotform.com/203245051035138),
[Zimm Doodles: guardian homes](https://zimmdoodles.breedpost.com/guardian-homes),
[Country Kennels: guardian](https://countrykennels.mypixieset.com/guardian/),
[Simply Goldendoodles: pre-training](https://www.simplygoldendoodles.com/pre-training),
[Bernedoodles & Co.: training add-on](https://bernedoodlesandco.com/training-program-add-on/),
[Blackwood Acres Kennels: training packages](https://www.blackwoodacreskennels.com/training-packages),
[Bailey Mountain Doodles](https://www.baileymountaindoodles.com/post/the-importance-of-early-potty-and-crate-training-for-your-puppy),
[Kodalihart Labradors](https://www.kodalihartlabradors.com/care-health/crate-training-toilet-training),
[Northwest Lagotto: Puppy Culture](https://www.northwestlagotto.com/puppy-culture-protocol),
[AJ Cavalier: socialization](https://ajcavalier.com/puppy-socialization-need-to-know/),
[Prestigious Toy Poodles: delivery](https://prestigioustoypoodles.com/delivery),
[Golden Puppies: transport](https://www.goldenpuppies.com/transport),
[High Desert Companions: delivery and pickup](https://www.highdesertcompanions.com/services-5),
[Borders of Eby Eden: bringing your puppy home](https://www.bordersofebyeden.com/bringing-your-puppy-home),
[Happy Trail Pups: shipping and delivery](https://happytrailpups.com/shipping-delivery/),
[Rose Haven Homestead: pickup and delivery](https://rosehavenhomestead.com/puppy-pick-up-delivery-options/),
[Fine and Dandy Aussiedoodles](https://www.fineanddandyaussiedoodles.com/),
[SK Dox: health guarantee](https://www.skdox.com/health-guarantee),
[CH Teapot Kennels: spay/neuter contract](https://www.chteapotkennels.org/sales-agreement---spay-neuter-contract.html),
[Sunflower Dachshunds: spay/neuter contract](https://www.sunflower-dachshunds.com/puppy-spay-and-neuter-contract),
[Millersburg Paws: health guarantee](https://www.millersburgpaws.com/health-guarantee-purchase-agreement-contract-2),
[Endless Mountain Labradors: why a contract](https://emlabradors.com/2020/09/why-does-a-breeder-have-a-contract-or-health-guarantee/),
[Dantero Malinois: stud service](https://dantero.com/malinois-for-sale/stud-service/),
[Salem's Finest Chihuahuas: stud services](https://www.salemsfinestchihuahuas.com/studservices),
[Vom Geliebten Haus: stud service](https://www.vomgeliebtenhaus.com/stud-service),
[Love My Pups: stud service](https://www.lovemypups.com/stud-service/),
[Peterbuilt Boerboel: avoiding scams](https://www.peterbuiltboerboel.com/how-to-choose-a-boerboel-breeder),
[Windy G Farm (Aussies)](https://www.windygfarm.com/nova-s-puppies),
[SJR Aussies](https://sjraussies.mypixieset.com/services/),
[Akins Labs](https://gundogbreeders.ziplineinteractive.com/breeders-oklahoma/akins-labs.php),
[Ganderhill Labrador Retrievers](https://gundogbreeders.ziplineinteractive.com/breeders-oklahoma/ganderhill-labrador-retrievers.php).

Background: [AKC Breeder of Merit](https://www.akc.org/breeder-programs/akc-breeder-of-merit-program/),
[OFA: information for prospective owners](https://ofa.org/prospective-owners/),
[Puppy Culture: what breeders send home](https://support.shoppuppyculture.com/support/solutions/articles/70000624222-what-can-breeders-send-with-their-puppy-buyers-),
[WSPA: online pet scams](https://www.wspa.com/news/investigations/online-pet-scams-the-1-step-you-must-take-to-avoid-bogus-breeders/).

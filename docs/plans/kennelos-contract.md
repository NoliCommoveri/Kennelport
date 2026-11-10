# The KennelOS contract: raw data, and blocks the owner can shape

A plan from the review of 2026-11-10 (the "later review" that
[`site-builder.md`](site-builder.md) leaves for step 7, "KennelOS data"). Nothing here
is built. KennelOS's half is in its repo: `docs/KennelOS_Website_Contract_Plan.md`.

## Why

Breeders are asking for more than the site offers: their own order for health tests, dog
cards split by something other than sex (colour, champions only), a status for pups that
are born but not yet open for deposits, more kinds of accounts, pedigrees, a sire's or
dam's best offspring, tags for imports and import-descended dogs, and a featured dog or
pup that changes by the week.

Each of these is blocked in one of two places:

- KennelOS works a value out, or writes it as words, before sending it, so the site can't
  tell things apart;
- KennelPort has a fixed list where a rule belongs.

## Principles

1. **KennelOS sends facts.** Its own values, ids and dates, as the breeder set them.
   KennelPort's rules turn them into what a site shows.
2. **One touch stays one touch.** Every new rule's default gives today's result, so a
   site is unchanged until the owner changes it (site-builder decision 14). The breeder
   still only marks records and presses Update website.
3. **The allow-list stays.** Both sides still name every key and refuse the rest. A new
   field goes only to a Worker whose answer lists its section (`SECTIONS` in
   `kennelos/bundle.js`), as now, so either side can be released first.
4. **A new field is new everywhere at once.** It is added to one list of fields and is
   then a filter, a grouping, an order and a card item, with no new screen.
5. **Format 1 stays.** Everything below is added keys and sections. Nothing sent today is
   removed until both sides have moved, and then only by a section.

## What the review found

### Sent altered by KennelOS (`shared/data/siteExport.js`)

| Value | Today | What it costs |
|---|---|---|
| Puppy `status` | `puppyStatus()` maps her disposition to a site word (keeping → `staying`, health hold → `hidden`, none set → `undecided`). The raw disposition goes only on kept dogs, not on a litter's puppies | No telling "none set" from "undecided"; no new status |
| Puppy `reserved` | Never sent, and not wanted (decided 2026-11-10, below). `bundle.js` still takes it, `rules.js` has a row for it and `STATUS_NOTES` says KennelOS works it out, and the Site Manager offers it by hand | A status that means nothing in KennelOS, shown beside Placed, which already reads "Reserved" |
| Litter status | Expected, whelped, weaning and ready become dates only (`born = status !== 'expected'`). Sold and closed litters aren't sent | No weaning or ready stage; no past litters, so no offspring |
| Titles | The abbreviation only, in the order earned. `bundle.js` joins them into one text of 120 characters, and writes it only when there is one | No "champions only": the organization and date are gone. A dog's last title removed never clears |
| Health results | One row per test name, the latest, in the order first tested. No test type, no lab. `verify_url` is taken here and never sent | No grouping by kind of test; no verify links from KennelOS |
| How it works steps | Whole sentences written in KennelOS (`waitlistSteps`); the fee card's title, due note and button label too (`applicationFeePay`) | Wording the owner can't set for a site |
| Accounts | Only ones with something to share, or transport. The type becomes one `transport` yes or no. Instructions over 120 characters are dropped | No other kinds of account on the site |
| Dogs | `status` is raw. Pet-home, outside and pedigree-only dogs aren't sent; nor are sire, dam, litter or breed | No pedigree; no offspring |
| Heats | Which pairing uses which heat, and the 30 and 60 day windows, are fixed in KennelOS | The windows can't be set. (The month only, never the day, is a privacy choice and stays) |

Smaller: puppies arrive in name order; colour is free text cut to 40 characters; an
extra's one price is sent as a range of the same number twice; `collar` and
`payment.deposit` are taken here and never sent.

### Fixed in KennelPort

| Where | Today |
|---|---|
| `kennelos/bundle.js` `health()` | Every bundle sets each result's `sort` to `100 + i`, so her order in the Site Manager is undone at the next Update website |
| `render/parts.js` `puppyStatus`, `depositsAhead` | "Born, deposits not open yet" is a special case that swaps an available pup's words to "Available on {date}". It has no pill, price, ask or show switches of its own |
| `render/parts.js` `dogsFor`, `content/blocks.js` `dogsF` | A Dog cards block filters on six named things (sex, status, up and coming, for sale, away, outside) and orders four ways |
| `render/pages.js` dogs page, `blocks.js` `MENU_PLACES` | The Dogs page's filter and menu places are Girls and Boys |
| `content/rules.js` | Six pup statuses, five dog places; products are transport or not |
| `render/pages.js` dog page | A dog's litters are only those still on the site, which the litter clock deletes |

## Part A. KennelPort only: no contract change

1. **Her health order stays.** A bundle sets `sort` only on a result it creates (after
   her last one). An existing result keeps its place. A new rule in `rules.landing`,
   `health_order`: `hers` (the default from now on) or `kennelos` (today's behaviour, for
   a site that wants KennelOS's order every time).
2. **Born, not yet open, as a status row.** A seventh row in `rules.status`,
   `not_open`: an available pup in a current litter whose deposits date is ahead. Its
   default is today's result exactly: the words "Available on {date}" (from
   `price.before`, which it replaces), the available pill, shown, no price change. The
   owner can then give it its own words, pill, price, ask and order. No data changes: it
   is worked out at render from `deposits_on`, as now.

## Part B. Fields, conditions and picks: blocks over any data

Replaces "split by colour or has-titles" and every later request of that kind.

### B1. One list of fields

`content/fields.js` (new): for each kind of record (dog, puppy, litter), every field a
block may read, with its name for the owner, its kind (`bool`, `enum`, `text`, `date`,
`number`, `list`), and how to read it from a snapshot record. It is built from
`content/model.js` so the two can't drift, plus worked-out fields:

- dog: `has_titles`, `title` (any of its titles), `age`, `has_health`, `tags` (Part D),
  `import`, `import_descended` (Part C4);
- puppy: its litter's fields (`litter.stage`, `litter.born_on`), `status` by rule;
- a test fails when a field in `model.js` is in neither the list nor a short "not for
  blocks" list (photos, slugs, system columns).

### B2. A block's records: conditions or picks

A data block chooses its records one of two ways:

- **Conditions** (`b.where`): a list of `{ field, op, value }`, all of which must hold.
  Ops by kind: is / is not / is one of (enum, text), has any / has none / includes
  (list, text), before / after (date), yes / no (bool). No nested and/or: one list covers
  every request so far, and a second block covers "or".
- **Picks** (`b.pick`): record ids, in her order. A picked record that has left the site
  drops out quietly and returns if it comes back. A block that is picks only and has
  none left hides itself, as an empty block does now.

Then, for both:

- **Group by** (`b.group`): any `enum`, `bool`, `text` or `list` field, with a heading
  per value (the owner's words per value, else the value). On the Dogs page the filter
  select is built from the grouping. Girls and Boys is the default grouping there, so
  the page is as today.
- **Order** (`b.order`): hers, or any field, up or down.
- **What a card shows**: the existing per-block setting, reading the same list, so a new
  field can be put on a card's front or back.

### B3. Who sets what

- The owner (admin view): a block's conditions, grouping, order, and whether it is a
  pick block.
- The breeder (Site Manager): which records are in a pick block and their order, on a
  block the owner placed and marked "hers to pick". Its wording goes in
  `manage/wording.js`.

### B4. Existing sites

Stored blocks keep working: `cleanBlock` reads an old `f` object as the same conditions
(`sex: 'female'` → `sex is female`; `upcoming: 'only'` → `upcoming yes`), with identical
results, and writes the new form when the block is next saved. The published snapshot
carries blocks as now; an older snapshot renders through the same reading. The menu
places `dogs#girls` and `dogs#boys` become "a group of a block" and keep their addresses.

### B5. Featured dog, featured pup

A new block, **Featured**, for dogs or pups: a pick block (or conditions) plus a
schedule.

- Shows one record (or the owner's number) at a time, large: photo, name, the card items
  the owner chooses, its bio, a link to its profile.
- **Schedule:** how long each stays (a day, a week, a month), in her order or shuffled
  (a fixed shuffle from the site id, so it doesn't change on reload), from a start date.
  Optionally a fixed date range for one record, which wins over the rotation.
- **No publish needed to turn over.** A page is rendered from the snapshot with today's
  date and cached per day (`site.js` `cacheKey`), so the rotation moves by itself.
- **Featured pup** from conditions (for example available pups, newest litter first)
  needs no upkeep: a pup that is placed drops out at the next Update website.
- It is a block, so it goes on Home or on a page of the owner's with its own address.
  The share row on it shares the featured record's own profile, not the page, since the
  page shows a different dog next week.

No prototype screen exists for it. It is built from the prototype's components (the
highlight row and the photo-beside-words block), and the build log says so.

## Part C. Raw fields from KennelOS

Each is a section in `SECTIONS`, sent only to a Worker that lists it. Beside each: the
rule that gives today's result by default.

| # | Section | KennelOS sends | KennelPort does with it |
|---|---|---|---|
| C1 | `pup_disposition` | On each litter puppy: `disposition`, raw (`undecided`, `keeping`, `available`, `placed`, `health_hold`, or null when none is set) | `rules.landing` maps each to a site status (today's map by default). `status` is still sent and is used when the section is absent |
| C2 | `litter_status` | On each litter: `status`, raw (`expected`, `whelped`, `weaning`, `ready`) | A field for conditions and for the litter card's eyebrow rule; default eyebrows as today |
| C3 | `titles_detail` | `titles` as `[{ abbr, organization, date }]` | Stored as rows (a small `dog_titles` table, in this step's one migration); the joined text is made at publish. An empty list clears. Fields: `title`, `title_organization` |
| C4 | `origin` | On a dog: `imported` (yes or no), `import_country` (text, optional), and `import_ancestors`: `[{ generations }]`, the nearest first, worked out in KennelOS from its pedigree | Fields `import`, `import_descended`. A rule sets how many generations still count (default 3) and what each tag reads |
| C5 | `health_detail` | On a result: `type` (KennelOS's event type), `verify_url` where she has one | Fields for grouping on a dog's page ("OFA", "Genetic"); the default is one list, as today |
| C6 | `account_type` | On a product: `account_type`, raw | A rule maps each type to where it shows (Recommended products, Getting your pup home, or a group the owner names). `transport` stays until both sides have moved |
| C7 | `lineage` | On a dog: `breed`, `sire_id`, `dam_id`, and `ancestors`: up to four generations as `[{ id, role path ("sire", "sire.dam"…), call_name, registered_name, titles }]`, including pedigree-only dogs, by name only | A Pedigree block on a dog's page (off by default); `sire` and `dam` link to a dog on the site when it is one |
| C8 | `offspring` | On a dog she marks **Feature offspring**: `offspring`: `[{ id, call_name, registered_name, titles, born_on, other_parent_name }]`, only ones she picked in KennelOS | A "Select offspring" part on a dog's page, and a pick source for blocks |
| C9 | `waitlist_facts` | Her waitlist's settings as values: `online_form`, `has_fee`, `fee_due_days`, `respond_days`, `max_passes` | The steps' and the fee card's wording become templates in `rules.words` with those values filled in; today's sentences are the defaults. `steps` and `payment` are still taken when the section is absent |

Left as they are: a heat's month only; which records are sent (her Show on website
marks); prices only with Use my KennelOS prices.

**No `reserved` (the owner's decision, 2026-11-10).** KennelOS has no such status and
sends nothing about picks or sales. A pup with an open sale is marked Placed there and
follows the placed rules here. Step 1 takes `reserved` out:

- `bundle.js`: out of the puppy `status` list and `PUPPY_STATUS`; out of this file's
  header. KennelOS's `siteExport.js` drops the word from `PUPPY_WORDS`.
- `rules.js`: the `reserved` row, its `STATUS_NOTES` line and `PUP_STATUSES` entry go.
  The editor shows five rows (six with `not_open`, Part A).
- The Site Manager's puppy form (`model.js` `PUPPY_STATUSES`, `manage/forms.js`) no
  longer offers it. Placed keeps its default words, "Reserved", which the owner can
  change in the placed row.
- **Live data is not rewritten.** A pup stored as `reserved` (set by hand before this)
  reads as `placed` wherever a status is read (`ruleKey`), and is saved as `placed` the
  next time its form is saved. A site's stored rule for `reserved` is ignored.
- The AK sample, the linked sample's bundles and expect files, the demo's step notes
  and `done/linked-sample.md`'s raw-or-summary table are corrected to `placed`.

## Part D. Tags

A dog (and a puppy) gets `tags`: a list of short labels. Two sources:

- **Rule tags**, the owner's: a name, a condition over the fields (B2), its words and
  pill. "Import" (`import yes`), "Import-descended" (`import_descended yes`) and
  "Champion" (`title includes CH`) are three rows, not three builds.
- **Her own tags**, typed in the Site Manager on a dog, from a list the owner allows
  for the site.

A tag is a field like any other: a condition, a grouping, a card item.

## Privacy and consent (site-builder decision 4)

- Every new field is the breeder's to send: it rides the same Show on website mark, and
  KennelOS's Update website lists what will change before it sends.
- C7 and C8 name dogs that aren't on her site, some not hers. They go by call name,
  registered name and titles only: never an owner, a kennel she hasn't ticked, or a date
  of birth for a dog that isn't hers.
- C4's `import_country` is hers to leave blank.
- Nothing from a buyer, contact, contract or sale goes, as now.

## Building it, in steps

Each step is its own branch and merge, with at most one migration.

1. **A1, A2, and `reserved` out.** Health order kept; the `not_open` status row;
   `reserved` removed as above. No migration (rules are in `site_builds`; no stored
   status is rewritten).
2. **B1, B2, B4.** The field list, conditions, grouping and order for Dog cards and Pups
   blocks; old blocks read as conditions. The admin's block screen. No migration.
3. **B3, B5.** Pick blocks, the breeder's picking screen, the Featured block. One
   migration if picks are kept outside the block (see the open question).
4. **C1, C2, C5, C6.** The small raw fields, each with its rule. Migration: the columns.
   The linked sample (`tests/fixtures/linked-sample/`) gains each value, and its
   coverage test checks them.
5. **C3, D.** Titles as rows; tags. Migration: `dog_titles`, `tags`.
6. **C4, C7, C8.** Origin, lineage, offspring: the Pedigree block and Select offspring.
   Migration: the columns and an `ancestors` store.
7. **C9.** Waitlist facts and the wording templates.

Steps 1 to 3 need nothing from KennelOS. Steps 4 to 7 can be released on either side
first, because of the sections.

Every screen follows the site builder prototype, checked at 390px and on a computer. A
step that changes files under `public/_kp/` says which, and asks before a version bump.

## Open questions (the owner's)

1. **Import:** a plain "Imported" tick, or a country too? How many generations still
   count as import-descended, and can she untick it on one dog whose pedigree in KennelOS
   is incomplete?
2. **Select offspring:** picked in KennelOS (a new mark, sent to every site) or picked in
   KennelPort from the dogs and past pups it holds? The plan assumes KennelOS, since most
   offspring were never on the site.
3. **Pick blocks:** is the list of picked dogs the breeder's (kept as her content, so a
   template change doesn't lose it) or part of the block (the owner's)? The plan assumes
   hers.
4. **Colour:** group by the words she typed, or does KennelOS get a tidy colour list?
5. **Her own tags:** allowed at all, or only the owner's rule tags to begin with?
6. **Pups and litters:** conditions and picks for litters in step 2 as well, or dogs and
   pups first? The plan assumes dogs and pups.

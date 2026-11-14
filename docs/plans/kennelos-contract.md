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
   **Modified (as built):** it is the sixth row, since `reserved` went. It always shows
   and can't be an older puppy, so it has no Show or Older switch: whether a pup shows is
   decided at publish, and this row moves on to available on the day by itself. Its words
   needn't hold `{date}` (60 characters, as `price.before` had). A site's changed
   `price.before` is carried to the row's words; an older snapshot reads as before.
   **Added (the owner, 2026-11-11):** those litters get their own section on the Puppies
   page, **Available soon** (`soon`, between Older puppies and Coming up, on by default),
   with its own menu link; Coming up keeps planned litters only. The Available link
   reads **Available now**.

## Part B. Fields, conditions and picks: blocks over any data

Replaces "split by colour or has-titles" and every later request of that kind.

### B1. One list of fields

`content/fields.js` (new): for each kind of record (dog, puppy, litter), every field a
block may read, with its name for the owner, its kind (`bool`, `enum`, `text`, `date`,
`number`, `list`), and how to read it from a snapshot record. It is built from
`content/model.js` so the two can't drift, plus worked-out fields:

- dog: `has_titles`, `title` (any of its titles), `age`, `has_health`, `tags` (Part D),
  `import`, `import_descended` (Part C4). **As built (the owner, 2026-11-12):** a dog's
  status and its up-and-coming and for-sale flags are one field, **Life stage**
  (KennelOS's five, in the site's words: Breeding dog, Up and coming, Looking for a
  home, Retired, In memory). Lives with a co-owner and Outside dog are one field,
  **Lives** (With me, With a co-owner, Not my dog). The default Dog cards block is
  Breeding dog and With me. Both are worked out from the stored columns, which saving
  keeps consistent (`records.js` `stageRules`);
- puppy: its litter's fields (`litter.stage`, `litter.born_on`), `status` by rule;
- litter (the owner, 2026-11-11: litters get everything dogs get): `stage` as the site
  shows it (`available_now`, `available_soon`, `older`, `planned`, `past`); each parent's
  dog fields as `dam.<field>` and `sire.<field>`, and `a_parent.<field>` for either one
  (so "from champions" is `a_parent.title includes CH`, "from imports" is
  `a_parent.import yes`); `pups.color` (its pups' colours). A parent
  that isn't a dog on the site (an outside sire by name) has only its name until C7
  sends lineage, so its fields read as unknown and a condition on them doesn't hold;
- a test fails when a field in `model.js` is in neither the list nor a short "not for
  blocks" list (photos, slugs, system columns).

### B2. A block's records: conditions or picks

A data block chooses its records one of two ways:

- **Conditions** (`b.where`): a list of `{ field, op, value }`, all of which must hold.
  Ops by kind: is / is not / is one of (enum, text), has any / has none / includes
  (list, text), before / after (date), yes / no (bool). No nested and/or: one list covers
  every request so far, and a second block covers "or".
  A colour (a dog's, a pup's, a litter's pups') is chosen with a **colour picker**: the
  colours the site holds, as KennelOS sends them (case and spacing evened out), each a
  tick. "Standard colours" is a block with black & white, brindle & white and seal & white
  ticked and fawn, blue and lilac left off (the owner, 2026-11-11). For a litter, the
  owner chooses whether every pup or any pup must be one of them.
- **Picks** (`b.pick`): record ids, in her order. A picked record that has left the site
  drops out quietly and returns if it comes back. A block that is picks only and has
  none left hides itself, as an empty block does now.
- **Leave out** (`b.omit`): record ids a conditions block skips though they match ("these
  litters, but not that one"). A left-out record that leaves the site is forgotten.

Dog cards, Pups and Litter cards blocks all choose this way (the owner, 2026-11-11).

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
- **The owner's decision (2026-11-12): the breeder controls individual records.**
  - **Every data block** (Dog cards, Pup cards, Litter cards): her Site Manager shows
    which records will display under the owner's settings, each ticked. She can untick
    any of them, and an unticked one stays out (`b.omit`, hers). A record that later
    matches the conditions comes in ticked. A record that stops matching, or leaves
    the site, drops off her list, and its untick is forgotten.
  - **Featured blocks** (B5): always hers to pick. She chooses which records and their
    order, and can leave any out, whatever conditions the owner set. The owner places
    the block and sets its schedule.
  - Her ticks and picks are her content, kept per site (not in the owner's build), so a
    change to the owner's settings never undoes them.

### B4. Existing sites

Stored blocks keep working: `cleanBlock` reads an old `f` object as the same conditions
(`sex: 'female'` → `sex is female`; `upcoming: 'only'` → `upcoming yes`), with identical
results, and writes the new form when the block is next saved. The published snapshot
carries blocks as now; an older snapshot renders through the same reading. The menu
places `dogs#girls` and `dogs#boys` become "a group of a block" and keep their addresses.

### B5. Featured dog, featured pup

A new block, **Featured**, for dogs or pups: a pick block (or conditions) plus a
schedule.

- **Which records are hers** (the owner, 2026-11-12; B3): she picks them and their
  order in her Site Manager and can leave any out. The owner places the block and sets
  its schedule.

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

### B6. Featured offspring (KennelPort only)

A sire's or dam's best offspring, on the dog's page. This is KennelPort's own (the owner,
2026-11-11), since most of them predate KennelOS and nothing comes from it.
**Rewritten 2026-11-12 (the owner) and built:** a featured offspring is a dog record,
not a separate list.

- Every dog she breeds is kept, co-owned or sold. Kept and co-owned dogs have ordinary
  dog records. A sold one is on her site only if she features it, and then it is a dog
  record with **Not my dog** (the Outside dog switch) and its sire or dam set to her dog.
- **A dog's sire and dam** (migration 0030: `sire_id`, `dam_id`, `sire_name`,
  `dam_name`): each is a dog on the site, or a name typed for one that isn't, as a
  litter's parents are. The Site Manager's dog form has a Parents section; the import
  names them by slug. A parent not shown on the site is named, never linked.
  KennelOS's lineage (C7) fills the same columns for the dogs it sends.
- **Chains:** an offspring's own offspring are found the same way, so a featured grand
  offspring is a Not my dog record whose sire or dam is the featured offspring. A dog's
  page has an **Offspring** part (on by default; `offspring` in the dog profile) listing
  its offspring on the site, then grand offspring and on, four generations
  (`fields.js` GENERATIONS), as light cards. Each generation's eyebrow is in the
  Wording screen (`offspring_1`…`offspring_4`), and so are the Sire and Dam facts.
- **No type or flags** for studs, offspring or ancestors: what a Not my dog record is
  for shows in its links (a litter names it as a parent; its sire or dam is one of
  hers). Blocks choose them by conditions: `parent`, `descends_from` (four
  generations), `sire.call_name`, `dam.call_name`, with **Lives** (`residence`).
- An ancestor stays a name in the Pedigree block (C7) unless she makes it a dog record
  (Not my dog). **Built:** her Site Manager's dog page has a **Pedigree** card (four
  generations from her records). A parent typed by name has **Make a dog record**,
  which makes a Not my dog record with that name and links it in the name's place. When
  C7 sends ancestors by name, the card and the site's Pedigree block offer the same
  button for them.
- Nothing about a buyer is asked for or shown. An outside dog's owner is the name she
  types, as now.

## Part C. Raw fields from KennelOS

Each is a section in `SECTIONS`, sent only to a Worker that lists it. Beside each: the
rule that gives today's result by default.

| # | Section | KennelOS sends | KennelPort does with it |
|---|---|---|---|
| C1 | `pup_disposition` | On each litter puppy: `disposition`, raw (`undecided`, `keeping`, `available`, `placed`, `health_hold`, or null when none is set) | `rules.landing` maps each to a site status (today's map by default). `status` is still sent and is used when the section is absent. Unlike the `disposition` section on a marked puppy-status dog, which sends `undecided` when none is set, this one sends null, and null reads as `undecided` by default |
| C2 | `litter_status` | On each litter: `status`, raw (`expected`, `whelped`, `weaning`, `ready`) | A field for conditions and for the litter card's eyebrow rule; default eyebrows as today |
| C3 | `titles_detail` | `titles` as `[{ abbr, organization, date }]` | Stored as rows (a small `dog_titles` table, in this step's one migration); the joined text is made at publish. An empty list clears. Fields: `title`, `title_organization` |
| C4 | `origin` | On a dog, and on each C7 ancestor: `imported` (yes or no) and `import_country` (her Country of origin, only while Imported is ticked), as she set them. Nothing worked out | Fields `import`, and `import_descended` worked out here from the C7 ancestors, so it needs the `lineage` section too: a dog with an imported ancestor within 3 generations (the default; a rule, at most the four C7 sends). She can untick Import-descended on one dog in the Site Manager (`import_descended_off`, hers, for a pedigree KennelOS holds only in part). A rule sets what each tag reads. **On a dog card** (the owner's words, 2026-11-13): an item labelled **Origin**, reading **Import • Romania** for an imported dog and **Import Ancestry • Romania** for an import-descended one, the countries being every different `import_country` among the imported ancestors it counts, comma separated, nearest ancestor's first (Import Ancestry • Romania, Hungary), and the word alone when none has a country. Never KennelOS's own "Yes, from …" |
| C5 | `health_detail` | On a result: `type` (KennelOS's event type), `verify_url` where she has one | Fields for grouping on a dog's page ("OFA", "Genetic"); the default is one list, as today |
| C6 | `account_type` | On a product: `account_type`, raw | A rule maps each type to where it shows (Recommended products, Getting your pup home, or a group the owner names). `transport` stays until both sides have moved |
| C7 | `lineage` | On a dog: `breed`, `sire_id`, `dam_id`, and `ancestors`: up to four generations as `[{ id, role path ("sire", "sire.dam"…), call_name, registered_name, titles }]`, including pedigree-only dogs, by name only | A Pedigree block on a dog's page (off by default); `sire` and `dam` link to a dog on the site when it is one |
| C9 | `waitlist_facts` | Her waitlist's settings as values: `online_form`, `has_fee`, `fee_due_days`, `respond_days`, `max_passes` | The steps' and the fee card's wording become templates in `rules.words` with those values filled in; today's sentences are the defaults. `steps` and `payment` are still taken when the section is absent. **Modified (2026-11-13):** a step's wording only starts it: once on her site its heading, body and place are hers, so a template fills only a new step |

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
  change in the placed row. Its form label, now "Placed (shows as Reserved)" in
  `forms.js` LABELS, is breeder-facing: the owner gives its new words before the step
  is built.
- `render/parts.js`: `STATUS_TEXT` loses `reserved` (it is where a stored pup's status
  becomes words, so it reads a stored `reserved` as `placed` too), and the comment on a
  litter's puppy order (the one naming reserved) is corrected.
- `front.js`, KennelPort's own front page: "Mark a puppy reserved" in the Site Manager
  line is the owner's copy to reword (for example "mark a puppy placed").
- **Live data is not rewritten.** A pup stored as `reserved` (set by hand before this)
  reads as `placed` wherever a status is read (`ruleKey`), and is saved as `placed` the
  next time its form is saved. A site's stored rule for `reserved` is ignored.
- The AK sample, the linked sample's bundles and expect files, the demo's step notes
  and `done/linked-sample.md`'s raw-or-summary table are corrected to `placed`, and so
  are `tests/rules.test.js` and `tests/linked-sample.test.js`.

## Part D. Tags

A dog (and a puppy) gets `tags`: a list of short labels. Two sources:

- **Rule tags**, the owner's: a name, a condition over the fields (B2), its words and
  pill. "Import" (`import yes`), "Import-descended" (`import_descended yes`) and
  "Champion" (`title includes CH`) are three rows, not three builds.
- **Her own tags**, typed in the Site Manager on a dog, from a list the owner allows
  for the site. That screen's label, hint and empty message are breeder-facing: the
  owner writes them, and they go in `manage/wording.js`.

A tag is a field like any other: a condition, a grouping, a card item.

## Privacy and consent (site-builder decision 4)

- Every new field is the breeder's to send: it rides the same Show on website mark, and
  KennelOS's Update website lists what will change before it sends.
- C7 names dogs that aren't on her site, some not hers. They go by call name,
  registered name and titles only: never an owner, a kennel she hasn't ticked, or a date
  of birth for a dog that isn't hers.
- C4's `import_country` is hers to leave blank.
- B6's featured offspring are dog records she makes (Not my dog); their owner is only the name she types.
- Nothing from a buyer, contact, contract or sale goes, as now.

## Building it, in steps

Each step is its own branch and merge, with at most one migration.

1. **A1, A2, and `reserved` out.** Health order kept; the `not_open` status row;
   `reserved` removed as above. No migration (rules are in `site_builds`; no stored
   status is rewritten).
2. **B1, B2, B4.** The field list, conditions, grouping and order for Dog cards, Pups and
   Litter cards blocks; old blocks read as conditions (a Litter cards block's stages
   become `stage is one of`). The admin's block screen, with the colour picker. Litter
   fields that need data not sent yet (imports: step 6) join the list when it comes. No
   migration.
   **Built 2026-11-12, with these changes:** there was no Pups block, so it adds one,
   **Pup cards** (the Puppies page's flip cards, by conditions). A litter's `current`
   stage reads as `stage is one of available now, available soon, older`, which is every
   stage the site shows a born litter in, so results are identical. A condition whose
   value isn't set yet is kept and leaves nothing out, because the editor works without
   script. **Not yet:** the Dogs page's own Girls and boys section and its menu places
   (`dogs#girls`, `dogs#boys`) as a group of a block. They stay built-in for now, because
   changing them changes every live site's Dogs page. That belongs with step 3 or its
   own small step.
   **Built 2026-11-13:** a Dog cards block grouped by sex, shown as a Show filter;
   every live Dogs page draws as before (checked byte for byte).
3. **B3, B5, B6.** Pick and Leave out for all three, the breeder's picking screen
   (every data block: what shows, each ticked, hers to untick; Featured: hers to pick),
   the Featured block. One migration: the picks, if they are kept outside the block (they are
   hers: question 3). Featured offspring (B6) was built ahead of this, on 2026-11-12, with
   step 2.
   **Built 2026-11-12** (migration 0031 `block_picks`): her picks are her content, kept
   outside the block. A Featured block's picks win over the owner's conditions; until
   she picks, it shows what the conditions hold for. Her set dates win over the
   rotation. **Not yet:** the share row sharing the featured record (needs a template
   script change and an `ASSET_VERSION` bump).
4. **C1, C2, C5, C6.** The small raw fields, each with its rule. Migration: the columns.
   The linked sample (`tests/fixtures/linked-sample/`) gains each value, and its
   coverage test checks them.
   **Built 2026-11-13** (migration 0033 `kennelos_raw`: `puppies.disposition`,
   `litters.kennelos_status`, `health_results.test_type`, `products.account_type`).
   The four sections are in `SECTIONS`. C1: with a pup's disposition, its site status
   is the owner's rule (`landing.pupst_*`, today's map by default). C6: where each
   account type goes (`landing.acct_*`: Recommended products or Getting your pup
   home, today's split by default) and the group a new one starts in
   (`landing.acct_group_*`, none by default; hers after). Both on the owner's From
   KennelOS screen. Fields: a pup's Disposition in KennelOS, a litter's Status in
   KennelOS (and a pup's litter's), a dog's Kinds of health test shown. A key an older
   KennelOS doesn't send leaves the stored value as it is. KennelOS sends no
   `verify_url` (it holds none).
   **Display rules, built 2026-11-13:** C2, a litter card's line by its KennelOS status
   (Wording, "Litter cards, by status in KennelOS": a line per status, empty by default,
   so the usual lines show; an expected litter's plan label still comes first). C5, a
   dog's page groups its health results by kind with the breeder's **Group health
   results by kind** (Site Manager, Kennel details; `sites.group_health`, in migration
   0033; off by default, the owner's decision 2026-11-13), each kind under the owner's
   line for it in Dogs, "Health results"; a result with no type goes under
   Health testing (now wordable). The headings' order is the owner's (Dogs, "Health
   result headings' order": four places, each heading once; Health testing, Genetic,
   OFA / PennHIP, Breed-specific by default). Within a heading, her own order of results.
5. **C3, D.** Titles as rows; tags. Migration: `dog_titles`, `tags`.
   **Built 2026-11-13**, in this branch's one migration (0033: the `dog_titles` table and
   `dogs.tags`). C3: `titles_detail` in `SECTIONS`; a dog's titles come as
   `{ abbr, organization, date }`, kept as rows; the titles line stays their
   abbreviations, written at each update rather than at publish. A bundle where any
   dog's titles are rows is from such a KennelOS: there a dog's empty list clears its
   rows and line (an empty list alone can't be told from an older KennelOS's). Field:
   A title's organization. D: the owner's **Tags** screen (build tools): tags by rule,
   each words, a pill (the site's two status pills), Dogs or Pups, and conditions (the
   block screen's rows; never on tags); and tags the breeder may choose, which she
   ticks on a dog's form (her tags only on dogs). A tag is the field Tags (dogs and
   pups; a litter's parents' too) and a card item (Tags), on no card by default. The
   import tags of C4 come with step 6. The tags kept in the build (`build.tags`), not a
   table. Her field's label and hint are the builder's, for the owner to reword.
   **Pills (the owner, 2026-11-13):** every pill on her site (a pup's status, tags, a
   dog looking for a home) is drawn in the site's one **pill style** (Dot, today's;
   Ribbon tag; Outlined capsule; Soft chip; Wavy ribbon; Wavy ribbon, satin), set by
   the owner on Formats and hers to change on Kennel details (`sites.pill_style`, in
   0033). Each pill's colour is one of its scheme's colours, named per scheme
   (`render/schemes.js` `PILL_COLOURS`), in place of Green and Brass outline, which
   read as the scheme's ok and held.
6. **C4, C7.** Origin and lineage: the import tags and the Pedigree block.
   Migration: the columns and an `ancestors` store. C4 and C7 go together: import-descended
   is worked out from the ancestors.
   **Built 2026-11-14** (migration 0034 `origin_lineage`: seven new `dogs` columns, the
   ancestors kept as JSON on the dog). `origin` and `lineage` in `SECTIONS`. A dog's
   origin is KennelOS's once it sends `origin` (`kennelos_origin`), else hers on the dog
   form (Imported, Country of origin). Lineage fills the dog's sire and dam (a dog on the
   site, else the ancestor's name) once every dog of the bundle is in, so a parent sent
   after its child still links. **Changed:** a parent KennelOS doesn't name (no id, no
   ancestor at that place) stays as she has it and stays hers; only a parent it names is
   locked. Fields: Import, Country of origin, Import-descended, Breed (and a litter's
   `dam.`, `sire.`, `a_parent.` of each), so the import tags are the owner's tag rows
   (Part D), not a build. The owner's generations: Dogs, Import-descended (3 by default,
   `rules.dogs.import_generations`). The Origin card item (dog, light and Featured cards;
   on none by default), its words on the owner's Dogs screen. The **Pedigree** part of a
   dog's page (`pedigree` in the dog profile, off by default): four generations, each
   ancestor by place with its titles, linked where it is a dog on the site; from
   KennelOS's ancestors where sent, else from her records, so a hand-kept site has it
   too. No prototype screen: built from the page's eyebrows, `tests` rows and grid. Her
   Pedigree card shows KennelOS's ancestors, and **Make a dog record** for one known by
   name (a Not my dog record keeping its KennelOS id, `kennelos_ancestor_id`, so every
   pedigree holding that ancestor links to it). That button is in her Site Manager only,
   not on the public Pedigree part. Breed is stored and a field, not shown on the page
   (the eyebrow stays the site's breed).
7. **C9.** Waitlist facts and the wording templates.

Steps 1 to 3 need nothing from KennelOS. Steps 4 to 7 can be released on either side
first, because of the sections.

Every screen follows the site builder prototype, checked at 390px and on a computer. A
step that changes files under `public/_kp/` says which, and asks before a version bump.

## Open questions (the owner's)

All answered (2026-11-11):

1. **Import:** an Imported tick in KennelOS; ticked, it shows Country of origin;
   unticked, the country is cleared. Import-descended: within 3 generations by default,
   and she can untick it on one dog (C4).
2. **Select offspring:** KennelPort's own, not KennelOS's (B6).
3. **Pick blocks:** the picks are hers, kept as her content.
4. **Colour:** a colour picker over the colours the site holds; no list kept anywhere.
5. **Her own tags:** allowed, from a list the owner allows for the site (Part D).
6. **Pups and litters:** litters get the same as dogs (steps 2 and 3).

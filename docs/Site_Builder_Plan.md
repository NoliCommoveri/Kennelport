# Site builder: plan

Nothing here is built yet. This is the plan from the owner's talk on 2026-11-05.

Today a site's pages, menu, sections, and the rules for how KennelOS data shows are
written into the code. Changing one means a code change, for every site at once. This
plan moves them into settings that **the owner** sets per breeder, after talking with
that breeder. It leaves the breeder a light job: wording, photos, records and a few
switches.

## Decisions (the owner's, 2026-11-05)

1. **Two roles.** The owner builds each breeder's site: its template, layout and rules.
   The breeder keeps it up to date and can't change how it is built.
2. **The rule: the owner places things; the breeder switches them on or off and words
   them.** The breeder never moves, adds or rearranges anything in the layout.
3. **Everything the KennelOS package carries should be configurable** in how it
   displays, per site, the way that breeder wants it. Nothing is locked for the sake of
   it. A health-hold pup can show if the breeder wants that.
4. **What KennelOS sends is the breeder's choice.** Raw data, sent only when the
   KennelOS user agrees to send it.
5. **Built-in rules become the owner's settings**, timing rules included: for example,
   how long a litter stays after it leaves the site.
6. **Templates are copied, not linked.** Updating a template doesn't change the sites
   already using it. Each active site has a one-touch **Reset to template**.
7. **Page addresses follow the breeder's names.** When the breeder renames a page, its
   address can follow, and the old address redirects.
8. **The KennelOS side is planned later.** Everything in the package, its raw value,
   and how each should be configurable, comes in a later session with a KennelOS code
   review. This plan covers what KennelPort receives today, and leaves room for more.

## Who controls what

| | The owner (per site, or in a template) | The breeder (Site Manager) |
|---|---|---|
| **Pages** | which pages exist, including new ones (a Dams page, a Sires page); their place and order in the menu | turn a page on or off; rename its menu item; rename its address |
| **Menu** | groups, their names and order; which items are in each, in what order; outside links | — |
| **Home and page blocks** | which blocks a page has, and their order | turn any block on or off; choose the Home collage layout and its photos |
| **FAQ questions and badges** | which pages *can* show them, and where on the page they sit | which of those pages *do* show each one |
| **Data sections** | which records each section shows (filters), their order, the card style | — |
| **Display rules** | how every value from KennelOS reads and behaves (below) | hide prices across the whole site |
| **Timing rules** | every built-in "how long" and "when" (below) | — |
| **Content** | starting wording in a template | all wording and headings; photos; dogs, litters, pups, reviews and the rest |

**Assumed, to confirm:** the litter switches **Show placed puppies** and **Families can
ask about full registration** stay with the breeder, since they are on/off switches.

## The owner's tools

### Templates

- A template is a whole site's build: pages, menu, blocks, data sections, display rules,
  timing rules and starting wording. It contains no breeder content.
- Start one from scratch, from today's built-in site (the first template), or by saving
  an existing site's build as a template.
- **Apply** a template to a new site, then adjust it for that breeder. From then on the
  site is its own copy.
- **Reset to template:** one touch on an active site puts its build back to the
  template's. It never touches the breeder's content: records, photos and wording they
  have typed stay. Whether it also resets the breeder's switches (pages on or off, menu
  names, block switches) is an open question below.

### Pages, menu and blocks

- **Every page becomes a list of blocks in order.** Today's 16 pages become the first
  template's pages, built from blocks that draw exactly what they draw now.
- **New pages:** the owner adds a page and stacks blocks on it.
- **Menu:** the owner sets groups and items. An item can be a page, a place on a page
  (like today's Girls and Boys links), or an outside link. The footer follows the menu,
  with a switch per group to leave it out of the footer.
- **Built from the prototypes.** Blocks are drawn only from the components in
  `docs/reference/`: bands, headings, photo and text, facts, steps, highlight rows, the
  collage, sliders, cards and the call-to-action band. This keeps every site in the
  owner's look. There is no free-form layout.

### Data sections (what KennelOS data goes where)

A data block shows records, with the owner's settings:

| Block | Filters | Order | Style |
|---|---|---|---|
| Dog cards | sex; status (active, retired, remembered); up and coming; for sale; co-owned; lives away | age, name, or the breeder's own order | flip cards, slider, light cards |
| Litters | stage (planned, current, past); deposits open or not yet | due or born date | litter cards |
| Pups | status (by display rule, below); sex | the rule's order | pup cards |
| Reviews | topic; rating | newest, or the breeder's order | quotes, slider |
| Products and extras | group; transport | the breeder's order | cards, badge row |
| FAQ | which questions | the breeder's order | expanders |
| Albums | litter or not | newest | gallery tiles |

Example: a **Dams** page is a new page with one Dog cards block, filtered to female and
active. **Sires** is the same, filtered to male. A block with nothing to show hides
itself, and a page with nothing on it drops out of the menu, as now (plan 3.12).

Dog, litter and pup profiles keep their own addresses (`/dogs/<name>`,
`/litters/<litter>/<pup>`), whichever page lists them. Shared links never break.

### Display rules

The site stores what KennelOS sends, unchanged. Display rules decide how each site shows
it. Each rule has a default that is today's behaviour, so a site is unchanged until the
owner changes a rule.

**Pup statuses**, one row per value the package carries today (`available`, `reserved`,
`placed`, `staying`, `undecided`, `hidden`):

| Setting | Today's default |
|---|---|
| Words shown | Available / Reserved / Reserved / Joining our program / Still deciding / (not shown) |
| Pill colour | as today |
| Shown at all | all but `hidden` |
| Price shown | `available` only |
| "Ask about this puppy" | `available` only |
| "Ask about full registration" | pups with no registration set, other than `staying` (and the litter switch on) |
| Counts as an older puppy | `available` only |
| Order on the litter page | `reserved` and `placed` last |

Several statuses can show the same words: placed and reserved both read "Reserved" today.

`hidden` is a health hold in KennelOS. It is configurable like the rest, and the editor
says so beside it: "Health hold in KennelOS".

**Registration:** what a pup with no registration set reads (today "Limited"), and what
limited and full read.

**Prices:**
- what replaces a price when prices are off (today "Contact us for pricing");
- how a range reads ("$2,500–$3,000" or "from $2,500");
- the Price and Deposit labels;
- whether an adult dog for sale shows its price (today the site setting "Show other
  prices").

**Dates:** how "Available on {date}" reads before a litter's deposits date.

**Dogs:** what each dog status and section reads, and which health results show by
default (today each dog's own setting: normal only, all, or none).

**Fixed wording that is in the code today,** for example the flip-card hint and the
safe-payment notice's default. The owner sets the default; the breeder can still reword
the ones they reword today.

### Timing rules

| Rule | Today | In the code |
|---|---|---|
| Days a litter stays after it leaves the site, before it is deleted | 30 | `kennelos/clock.js` `LITTER_DAYS` |
| When an available pup becomes an "older puppy" | the day after its litter's going-home date | `render/parts.js` `olderPuppies` |
| When "Available on {date}" changes to "Available" | the litter's deposits date | `render/parts.js` `depositsAhead` |

The build will go through the code for every other "how long" and "when" that affects
what a site shows, and add each one here. Rules that keep KennelPort running, not ones
about how a site looks (inquiry and preview expiry, the portal's undo window), stay
fixed unless the owner asks.

### Page addresses

- The breeder renames a page's address beside its menu name. A new address is
  suggested from the name, and the breeder can edit it.
- Every old address is kept and redirects (301) to the new one.
- These addresses stay fixed because other systems link to them: `/waitlist` and
  `/waitlist/help`, `/family-login`, `/privacy`. Their menu names can still change.

## The family portal (one site, configured by the owner)

The family portal (`docs/Puppy_Parent_Portal_Plan.md`) is on for one breeder's site,
and much of its build is written into the code for her. It gets the same split as the
website:

- **The owner builds it.** The breeder keeps what the portal plan already gives her
  (its section 4: products and programs, checklist, timeline tasks, handbook, email
  wording, contacts, baby book, families).
- **Its build is per site,** so the portal can stay special to this breeder's site
  without other sites having to share it. Offering the portal to other breeders is
  still out of scope (portal plan, section 1). This plan just doesn't make that harder
  later.

**What becomes the owner's settings for her portal:**

| Area | Written into the code today |
|---|---|
| **Family Home, per stage** | the four stages (before go-home, pickup to vet deadline, weeks 1–8, later), and which sections each stage shows, in what order (portal plan 7.2's ten sections) |
| **Tabs and quick links** | the five tabs (Home, Timeline or Stay, Photos, Baby book, Records), and the quick links and their names ("A-K's picks") |
| **Display rules** | how what the portal's KennelOS feed carries (`portal/feed.js`) reads to families, like the website's rules above |
| **Timing rules** | the vet booking reminder 5 days before go-home at 09:00, the deadline morning reminder at 08:00, red under 48 hours left (`portal/vet.js`); when a stay starts, 8 weeks old (`portal/stays.js`); overdue after 14 days (`portal/steps.js`); invite links last 30 days (`portal/auth.js`); undo for 30 days (`portal/account.js`); the retention table (portal plan 10.1) |
| **The vet deadline rule** | which of the two counts her contract uses (`VET_RULES`: 72 hours from pickup, or the end of the third day after pickup day) |

**What stays fixed for the breeder,** as the portal plan says: the vet countdown follows
her contract, and its reminders always send. The owner sets those rules for her site to
match the contract. The breeder can't switch them off for a family.

**The same rule as the website:** the owner places the Home sections, tabs and quick
links; the breeder switches on or off the ones the owner allows, and words them.

What makes her portal special is still to be listed, with the owner (open question 5).

## KennelOS data (for the later review)

For now, rules work from what the package carries today (`kennelos/bundle.js`, format
1). Some of its values are KennelOS's summaries, not raw data. For example, `reserved`
is worked out from a waitlist pick or a sale. Those summaries limit what a rule can
tell apart.

The later session reviews the whole package against KennelOS's code: each value's raw
form, the breeder's consent to send it, and how it should be configurable. KennelPort's
side is built so that a new raw field becomes a new filter or rule input, with its
default, without changing the editor screens.

## How it is stored (sketch)

- **`templates`:** a named build (pages, blocks, menu, rules) as JSON.
- **A site's build:** the same JSON, per site, copied from its template on Apply, with a
  note of which template it came from.
- **The breeder's switches** (pages on or off, menu names, addresses, block switches,
  FAQ and badge pages) are kept apart from the build, so Reset to template can choose
  whether to keep them.
- **`page_redirects`:** an old address, the page it now points to, and the date it
  moved.
- **The published snapshot carries the build and rules,** so rendering stays pure
  (`render/index.js`): no D1 at render time, and the tests render any build.
- **Existing sites become today's built-in template,** applied with every setting
  unchanged, so no site looks different on the day this ships.
- **One migration per branch** (CLAUDE.md).

## Building it, in steps

Each step is its own branch and can be released on its own.

1. **Display and timing rules.** The rules above, with today's defaults, in the owner's
   tools per site. This is the smallest step, and the first one the owner would use.
2. **Pages, blocks and the menu as settings.** Today's site becomes the first template.
   Add new pages and data blocks (Dams and Sires), the menu editor, and the breeder's
   address renaming with redirects. FAQ and badge places become block settings.
3. **Templates.** Save as template, Apply, Reset to template.
4. **The family portal's build:** its timing and display rules first, then Family Home's
   sections per stage, the tabs and quick links.
5. **After the KennelOS review:** the new raw fields, as rule and filter inputs, for the
   website and the portal's feed.

The editor screens have no prototype. They will be built from the portal prototype's
existing components (tiles, highlight rows, pills, numbered steps, the pinned action
bar), and checked at 390px and on a computer before going further. The template, the
manage app and possibly the portal change in every step, so versions are bumped only
after asking (CLAUDE.md).

## Open questions

1. **The litter switches** (Show placed puppies, Families can ask about full
   registration): do they stay with the breeder? Assumed yes.
2. **Reset to template:** does it also reset the breeder's switches (pages on or off,
   menu names, addresses, block switches), or only the owner's build? Or offer both?
3. **Where the owner's tools live:** in `/ops` beside the site list, or in the Site
   Manager with an owner-only view of each breeder's site?
4. **Defaults for new rules:** when a later build adds a rule, existing sites get its
   default (today's behaviour). Is that right, or should new rules start off until the
   owner sets them?
5. **The family portal:** what does her portal need that the portal plan doesn't cover
   yet? And should its build be in templates too, or only ever set for her site?

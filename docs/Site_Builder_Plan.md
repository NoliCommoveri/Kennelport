# Site builder: plan

This is the plan from the owner's talk on 2026-11-05. Step 1 is built: the owner's admin
view with Pups, Dogs, Wording, Formats, From KennelOS and Timing for each site
(`content/rules.js`, `manage/builder.js`, `admin.js`). Step 2 has begun: Home as blocks
(`content/blocks.js`; Pages and Home in the admin view), each data block's records and what its
cards show, with today's Home as the default, drawn exactly as before. Its other pages, new
pages, the menu, addresses and forms come next; steps 3 to 5 aren't built yet.

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
9. **The litter switches stay with the breeder:** Show placed puppies, and Families can
   ask about full registration.
10. **Reset to template resets only the owner's build,** never the breeder's switches.
11. **The owner's tools live in her own view of the Site Manager,** as admin, with every
    site open to her automatically (below).
12. **Two starting templates:** **Website**, today's site with the portal off, and
    **Website and family portal**, today's site and portal, for the breeder with the
    portal. Both start with today's behaviour exactly (below).
13. **The portal's build is part of a template.** In the portal template the owner can
    move the family-facing (puppy parent) components and the breeder-facing ones.
14. **New settings in later builds change nothing on their own.** A new setting for
    something sites already do starts with today's behaviour on existing sites. A
    brand-new feature arrives switched off on existing sites until the owner turns it
    on, and on in templates.
15. **What a card or page shows is a setting, not code** (added 2026-11-05). Every card
    and profile page has a "what it shows" setting: which items, on which face, in what
    order. So do the fixed wording, formats and counts still in the code, how KennelOS
    data lands on the site, and the contact and review forms. Each starts as today's
    behaviour (decision 14).

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

The litter switches **Show placed puppies** and **Families can ask about full
registration** stay with the breeder (decision 9).

## The owner's tools

### Where they live: the Site Manager, as admin

- **One app.** The owner uses the same Site Manager as breeders, with an admin view on
  top: the build tools below appear for her only.
- **Every site, automatically.** As admin she sees every site in the list, with no
  invite and no code email per site. Today she would have to invite her own address to
  each site (`auth.js` `inviteToSite`), and that goes away for her.
- **Signing in as admin.** Today `/ops` is opened with the `OPS_TOKEN` secret, and the
  Site Manager with an emailed code. Signing in to `/ops` will also make her admin in the
  Site Manager on that device, so there is still no code email. `/ops` keeps its own jobs
  (migrations, creating, suspending and closing sites).
- **Breeders see none of it.** Their roles and invites work as now.

### Templates

- A template is a whole site's build: pages, menu, blocks, data sections, display rules,
  timing rules and starting wording. It contains no breeder content.
- Start one from scratch, from one of the two starting templates (below), or by saving
  an existing site's build as a template.
- **Apply** a template to a new site, then adjust it for that breeder. From then on the
  site is its own copy.
- **Reset to template:** one touch on an active site puts its build back to the
  template's. It resets only the owner's build (decision 10). The breeder's content and
  switches stay as they are: records, photos, wording, pages on or off, menu names,
  addresses, block switches.

### The two starting templates

Both are today's behaviour exactly, so applying one changes nothing a visitor, family or
breeder sees. They are where the owner starts from, not something the owner has to
keep.

| | **Website** | **Website and family portal** |
|---|---|---|
| Website pages, menu, blocks | today's 16 pages, five menu groups, Home's blocks in today's order | the same |
| Display and timing rules | today's (the tables below) | the same, plus the portal's (below) |
| Family portal | off | on, as built today (portal plan 7.2) |
| Site Manager tabs for the breeder | today's | today's with the portal: Today, Families, Dogs, Website, Portal, Reports (portal plan 7.3) |
| What the owner can move | website pages, menu and blocks | the same, plus the portal's family and breeder components (below) |

The breeder with the portal is set up from **Website and family portal**; every other
site from **Website**. Turning the portal on for another breeder later means applying
that template and adjusting it. Offering the portal to more breeders is still the
portal plan's decision (its section 1), not this one.

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
| Dog cards | sex; status (active, retired, remembered); up and coming; for sale; co-owned; lives away | age, name, or the breeder's own order | flip cards, slider, light cards; cards across |
| Litters | stage (planned, current, past); deposits open or not yet | due or born date | litter cards |
| Pups | status (by display rule, below); sex | the rule's order | pup cards; cards across |
| Reviews | topic; rating | newest, or the breeder's order | quotes, slider |
| Products and extras | group; transport | the breeder's order | cards, badge row |
| FAQ | which questions | the breeder's order | expanders |
| Albums | litter or not | newest | gallery tiles |

**Cards across** (card size): for a block of cards, how many sit side by side on a phone
(one or two) and on a computer (two, three, four, or as many as fit). Today's is one on a
phone and as many as fit on a computer (`site.css` `.grid`: cards at least 240px wide),
so that is the default. A slider keeps its own size.

Example: a **Dams** page is a new page with one Dog cards block, filtered to female and
active. **Sires** is the same, filtered to male. A block with nothing to show hides
itself, and a page with nothing on it drops out of the menu, as now (plan 3.12).

Dog, litter and pup profiles keep their own addresses (`/dogs/<name>`,
`/litters/<litter>/<pup>`), whichever page lists them. Shared links never break.

**Fixed counts and selections become block settings** (decision 15):

| Today, in the code | Becomes |
|---|---|
| Home's litters block shows the first 2 litters that aren't past | a Litters block's filters, order and how many it shows |
| Home's dogs block shows only the breeding dogs | a Dog cards block's filters |
| A litter page's parent cards show 3 health results, then "and N more" | how many the parent card shows |
| A litter card names up to 2 pups, then counts them ("2 girls, 1 boy") | how many it names before counting |
| Retired and remembered dogs show nowhere | Dog cards blocks filtered to them (a page or section the owner places) |
| A block's how many: all of them | a limit, with "See all" to its page |

### What each card and page shows

Every card and profile page has a **"what it shows"** setting (decision 15): a switch per
item, its place (the front or back of a flip card; on a page, which part), and the order.
The default is exactly today's layout, below. It's set per block, so the same dogs can
show differently on a Dams page and on Home. A profile page has one setting per site.
The breeder still words her records; the owner decides what a card carries.

**Cards:**

| Card | What it shows today |
|---|---|
| Dog card (flip) | Front: photo, call name, registered name, breed and role, titles. Back: registry and weight, then the health tests; a dog with none shows Details instead (sex, colour, weight, registry); bio; "Ask about" (for sale) with its price; View profile |
| Pup card (flip) | Front: ribbon (by status rule), photo, name, litter and collar, sex and colour, status. Back: sex, colour, status, registration, registry, price; bio; "Ask about this puppy"; the full-registration link and surcharge; View profile |
| Litter card | eyebrow (Current litter, Coming up, Older puppies, Planned litter, Past litter), the parents' photos, name, the pair's names; rows: Born, Deposits from, Puppies, Going home or Ready now, Price, Deposit (planned: Expected, Going home); the summary (planned only); Meet the puppies or See the waitlist |
| Co-owned light card | photo, call name, sex and role, "with" its kennel and logo |
| Parent card (litter page) | photo, call name, registered name, titles, colour and registry, health results, View profile |
| Review card | stars, the quote, first name and town, "{pup}'s family, home {month}", photo |
| Extras package card | weeks and "most complete" (featured), name, price, description, "What's included" with its lead-in and closing, "Ask about this package"; packages ordered by weeks |
| Extras item card | name, group, price, description, "Ask about this" |
| Album card | cover, title, photo count |
| Step (How it works) | number, heading, body, "More detail", the pay link |

**Profile pages:**

| Page | What it shows today, in order |
|---|---|
| Dog | photo; breed and role; call name; registered name; facts: Sex, Color, Born, Weight, Registry, Titles, Co-owned with, Lives with; bio; for sale and "Ask about"; health testing (with verify links); share row; videos and posts; the dog's litters |
| Puppy | photo; status; name; facts: Sex, Color, Collar, Status, Price, Registration, Registry, Parents, Born; bio; "Ask about"; the full-registration link and surcharge; the safe-payment notice; share row; badges; its photos; the litter's albums |
| Litter | eyebrow and name, the pair and summary; placed FAQs; parent cards; facts; price note; the full-registration link; pup cards; badges; videos and posts; albums |

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
the ones they reword today. All of it (decision 15), including:
- the Dogs page's section headings and lines: Up and coming ("Young dogs we have kept,
  growing up with us."), Looking for a home, Shared with friends, and the Girls and Boys
  filter;
- the litter card's eyebrows and links (above), "Ready now" over older puppies, "Plans can
  change. Heat dates are estimates.", "No litters to show right now.";
- "Swipe or use the arrows.", "More detail", "What's included", "Ask about this package";
- the payment cards' titles ("Application fee", "Puppy deposit"), "Family login", and the
  footer's copyright line.

**Formats** (decision 15):
- dates: long ("December 12, 2026") and short ("December 12"), and where each is used;
- a dog's or pup's sex: Female and Male, or Girl and Boy, and the counts ("2 girls, 1 boy");
- money: the currency sign and its place, and whether cents show.

### How KennelOS data lands

Defaults for each new record a bundle brings (decision 15), today's as the default.
After it lands, a record's own switches stay the breeder's, as now.

| Setting | Today (`kennelos/bundle.js`) |
|---|---|
| A new dog's health results | Normal results only |
| A new litter's Show placed puppies | on |
| A new litter's Show prices | on only with Use my KennelOS prices |
| A litter KennelOS sends without a name | "{dam} × {sire}"; a heat: "{dam}'s next litter", or "Our next litter" |
| The planned-litter label | Upcoming heat, Planned pairing |
| How each KennelOS dog status reads on the site | `puppy` up and coming; `for_sale` looking for a home; `retired_breeding` retired; `deceased` remembered |
| Where a new dog or litter goes in her order | at the end |

### Forms

The contact form and the review form have fixed fields today; the waitlist application's
questions are already hers. The owner chooses each form's fields (from a list: name,
email, phone, town, the pup or litter it's about, rating, topic, photo, and her own
questions), which are required, and their order and wording (decision 15). Today's
fields are the default.

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

## The family portal (in the portal template)

The family portal (`docs/Puppy_Parent_Portal_Plan.md`) is on for one breeder's site,
and much of its build is written into the code for her. Its build moves into the
**Website and family portal** template (decision 13), with the same split as the
website:

- **The owner builds it.** The breeder keeps what the portal plan already gives her
  (its section 4: products and programs, checklist, timeline tasks, handbook, email
  wording, contacts, baby book, families).
- **Applied, it is that site's own copy,** like any template (decision 6), so her
  portal can be adjusted for her without changing the template.

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

### What the owner can move

**Family-facing (puppy parent) components:**
- **Family Home:** its sections (portal plan 7.2: the photo and greeting, the pup card
  and calendar block, the stage's steps band, the go-home checklist, the photo package,
  the food band, the baby book cards, Included with your puppy, Read next, Quick links),
  their order per stage, and which stages show each one;
- **the tabs:** which tabs there are and their order;
- **Quick links:** which links and their order;
- **Records:** the order of what it holds (the puppy's records, pedigree, contract and
  health guarantee, contacts);
- **what each card shows** (decision 15): the pup card and calendar block, a placement's
  card, the baby book cards and the records list, item by item, as on the website.

**Breeder-facing components** (her Site Manager, portal plan 7.3):
- **the tabs:** Today, Families, Dogs, Website, Portal and Reports, their order, and
  what sits under each;
- **Today:** the order of its lists (pickups this week, families to invite, vet proof
  to review, and the rest);
- **a family's page and a puppy's card:** the order of their sections, and what each
  card in them shows (decision 15).

**What can't move:** the safety and contract rules. The vet countdown and its
reminders always run as her contract sets them, and the affiliate disclosure stays on
every page with program links (portal plan 11). The owner sets those rules; moving
components never removes them.

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
  FAQ and badge pages) are kept apart from the build, so Reset to template leaves them
  alone.
- **`page_redirects`:** an old address, the page it now points to, and the date it
  moved.
- **The published snapshot carries the build and rules,** so rendering stays pure
  (`render/index.js`): no D1 at render time, and the tests render any build.
- **Existing sites get a starting template applied,** with every setting unchanged:
  the portal site **Website and family portal**, every other site **Website**. No
  site looks different on the day this ships.
- **One migration per branch** (CLAUDE.md).

## Building it, in steps

Each step is its own branch and can be released on its own.

1. **Display and timing rules.** The rules above, with today's defaults, in the owner's
   tools per site: the pup, registration, price and date rules and the timing rules
   (built); then the dog rules, the fixed wording, the formats, and how KennelOS data
   lands. This is the smallest step, and the first one the owner would use.
2. **Pages, blocks and the menu as settings.** Today's site becomes the **Website** template.
   Add new pages and data blocks (Dams and Sires), the menu editor, and the breeder's
   address renaming with redirects. FAQ and badge places become block settings. Each
   block gets its fixed counts as settings and what its cards show; each profile page,
   what it shows; and the contact and review forms, their fields.
3. **Templates.** Save as template, Apply, Reset to template.
4. **The family portal's build:** the **Website and family portal** template; the
   portal's timing and display rules; then moving its family and breeder components,
   and what each of its cards shows.
5. **After the KennelOS review:** the new raw fields, as rule and filter inputs, for the
   website and the portal's feed.

The editor screens follow the site builder prototype (`docs/reference/site-builder-prototype.html`),
built from the portal prototype's components (tiles, highlight rows, pills, numbered steps,
the pinned action bar), and are checked at 390px and on a computer before going further.
Where today's site and the prototype differ, the prototype goes into the **Website**
template for new sites; existing sites keep today's until the owner applies or resets
them (decided 2026-11-05). The template, the
manage app and possibly the portal change in every step, so versions are bumped only
after asking (CLAUDE.md).

## Open questions

None. The KennelOS package review (decision 8) is its own session.

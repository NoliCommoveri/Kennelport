# Site builder: plan

This is the plan from the owner's talk on 2026-11-05, with her additions of the same day
(decisions 16 to 19). Step 1 is built: the owner's admin view with Pups, Dogs, Wording,
Formats, From KennelOS and Timing for each site (`content/rules.js`, `manage/builder.js`,
`admin.js`). Step 2, the breeder's instructions, has begun: the list
(`manage/wording.js`), the owner's editor (Site Manager wording, and each site's Her
instructions), and the first of her screens' wording moved into it. Step 3 has begun: every
page but Privacy is a list of blocks (`content/blocks.js`; Pages in the admin view), each
data block with its records and what its cards show, and each page drawn exactly as
before until the owner changes it; the owner adds pages, and the breeder switches and
words what the owner adds. The rest of step 3 is below (Building it, in steps); steps 4
to 7 aren't built yet.

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

Added by the owner on 2026-11-05:

16. **The editor limits the owner only for function, never for looks.** It doesn't
    narrow what she can choose just to keep a site tasteful; that's her call. A limit
    stays only where something would break or stop working: text a visitor can't read,
    a link that goes nowhere, a page too slow to load, a file the site can't serve
    safely. A choice that is just unusual is allowed. A choice that is risky but breaks
    nothing (a slow page) gets a warning and is still allowed.
17. **The owner adds her own blocks to any page:** buttons, banners, dividers, spacers,
    collages, photos, videos, and photos with text over them (The owner's own blocks,
    below). Colours come only from the template's colours; fonts come from a font
    library.
18. **What the breeder can do with the owner's buttons:** reword a button, switch it
    off, change an outside link, and change the phone number or email address it uses.
    She can't add buttons. A button that links to a place on the site is the owner's:
    the breeder can reword it or switch it off, but can't change where it goes.
19. **The owner writes all of the breeder's instructions.** Every help line, hint,
    label, empty-screen message and explanation the breeder reads in the Site Manager
    is wording the owner sets, not text fixed in the code. Today's wording is the
    default (decision 14). This is the owner's top priority among these additions.

## Who controls what

| | The owner (per site, or in a template) | The breeder (Site Manager) |
|---|---|---|
| **Pages** | which pages exist, including new ones (a Dams page, a Sires page); their place and order in the menu | turn a page on or off; rename its menu item; rename its address |
| **Menu** | groups, their names and order; which items are in each, in what order; outside links | — |
| **Home and page blocks** | which blocks a page has, and their order; adding her own blocks (decision 17); each block's background, padding, text size and fonts | turn any block on or off; choose the Home collage layout and its photos |
| **Buttons the owner adds** | type, colour, link, wording | reword; switch off; change an outside link, phone or email (decision 18) |
| **Fonts** | the site's fonts and any block's, from the library | — |
| **The breeder's instructions** | all of it (decision 19) | — |
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

- **Every page becomes a list of blocks in order.** Today's 16 pages (Home and 15 others)
  become the first template's pages, built from blocks that draw exactly what they draw
  now. **Privacy** and **Family login** stay fixed, outside the builder (decided
  2026-11-05).
- **What a page is for stays whole** (built): each page's own sections (its form, its
  list, the Dogs page's four groups, the Puppies page's three bands) are its built-in
  blocks, drawn as today. The owner moves or removes them and can put a removed one back;
  she can add Dog cards, Litter cards and Reviews blocks to any page. A badge row placed
  right after a built-in that holds one today sits inside it, as today.
- **Words and photos on blocks the owner adds** are kept with that block. The owner's
  words are the starting wording; the breeder rewords them, and changes the photo, in her
  Website tab (decided 2026-11-05).
- **A block or page the owner adds starts on** for the breeder: she placed it on purpose.
  Decision 14 is about features arriving on existing sites, not what the owner places.
- **New pages:** the owner adds a page and stacks blocks on it.
- **Menu:** the owner sets groups and items. An item can be a page, a place on a page
  (like today's Girls and Boys links), or an outside link. The footer follows the menu,
  with a switch per group to leave it out of the footer, and a switch to show a group as
  a button (today's Waitlist). Until the menu editor, a new page goes at the end of the
  group the owner picks, never under Waitlist (one button, one link).
- **Items show and hide on their own, as today** (decided 2026-11-05). An item hides when
  what it points to has nothing to show: today Girls and Boys show only with breeding
  dogs of both sexes, and Available and Upcoming litters only with such litters. An item
  can be set to **show only when the items before it hide**, which keeps today's
  Puppies item, shown only when neither Available nor Upcoming litters is.
- **Built in the prototypes' style.** Blocks are drawn from the components in
  `docs/reference/`: bands, headings, photo and text, facts, steps, highlight rows, the
  collage, sliders, cards and the call-to-action band, and the owner's own blocks
  (below). A page is a stack of blocks in order. The owner's choices are limited only
  for function (decision 16).

**FAQ and badge spots** (built for today's pages): each page's FAQ spot and badge row
are blocks keyed by today's places (`model.js` `FAQ_PLACES`, `BADGE_PLACES`), so the
questions and badges the breeder placed carry over with no data change. On a profile
page (every dog, litter, puppy) the spot becomes an item in what that profile shows. A
spot the owner adds to a new page is new, and starts empty.

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

**"See all"** on a block with a limit goes to the page the owner picks for that block
(decided 2026-11-05), since the same records can be listed on several pages.

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

- **The contact form always has name, email and message, required,** so she can reply.
  The rest are saved with the message; that needs one column on `inquiries`, in the
  branch's one migration (decided 2026-11-05).
- **Answers to her own questions on the review form** are for the breeder only; the
  review card shows what it shows today.

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
- **No page can take** those addresses, anything under `/dogs/`, `/litters/` or
  `/albums/` (profiles and albums), the sitemap, `robots.txt`, or the system's own paths
  (decided 2026-11-05).
- **Each page's address is its own:** renaming `/litters` doesn't move `/litters/older`.
  A renamed `/dogs` list page leaves profiles at `/dogs/<name>`.
- **A page the owner removes** answers "not found" at its address; nothing redirects.

### The owner's own blocks

Decisions 16 to 18. She can put each one on any page, anywhere in its block list, as
many times as she likes.

| Block | The owner sets | The breeder can |
|---|---|---|
| **Button** | type: small, medium or large; colour (template colours); where it links; wording; alignment | reword; switch off; change an outside link, phone or email |
| **Banner** | a full-width strip across the page: heading, a line, one or more buttons; its colour | reword it and its buttons; switch off; change outside links, phone or email |
| **Divider** | style (thin line, brass rule, the scheme's ornament); colour; width | switch off |
| **Spacer** | height: very small, small, medium, large | — |
| **Collage** | the same layouts, frames and "which part to keep" as Home's collage (`COLLAGE_LAYOUTS` in `content/model.js`); its photos | switch off; change photos if the owner allows it |
| **Photo** | photo, shape (wide, tall, square, full width), which part to keep, optional caption | switch off; change photo and caption if the owner allows it |
| **Video** | a video from the approved embed list, click to load (plan 3.3) | switch off; change the video if the owner allows it |
| **Text over a photo** | photo; heading, line and optional button over it; where the text sits (top, middle or bottom; left, centre or right); a shade behind the text | reword; switch off; change the photo if the owner allows it |

**Where a button can link:**
- a page on the site, or a place on a page;
- a dog, litter or puppy;
- the waitlist, family login or contact form;
- an outside site (opens in a new tab);
- a phone number (call), a text message, or an email address. These start as the
  kennel's phone and email from Kennel details and follow them when they change,
  unless a different number or address is typed in for that button.

These checks are functional (decision 16):
- A button whose page is switched off or deleted, or whose dog or litter has left the
  site, hides itself instead of going nowhere. The Site Manager says it's hidden and why.
- A phone number or email address has to look like one.

**Settings every block gets:**
- **Background:** none, or one of the template's colours.
- **Padding** around the content: none, small, medium, large. Top and bottom can
  differ from the sides.
- **Text size:** very small, small, medium, large. Medium is today's size.
- **Fonts:** the site's fonts by default, or any font from the library, for headings
  and body text.

### Template colours

- The colours to choose from are the scheme's own: page background, surface, band,
  accent, brass, ink, the footer colours and the rest in `_kp/t/ak/scheme-*.css`.
- Each choice is stored by its colour's name ("accent"), not its value, so it follows
  the light and dark versions and changes when the scheme changes.
- Readability is functional (decision 16), so:
  - text and buttons on a coloured background use the scheme's matching ink
    automatically (at least 4.5:1 contrast, plan 3.13);
  - the owner can pick a different text colour, but if the pair fails the contrast
    check in light or dark, the editor shows that and won't save it;
  - text over a photo gets a shade. She chooses how dark, down to the lightest shade
    that still reads.

### Font library

- Open-licence fonts, served from the site like today's (`/_kp/fonts/`), so no outside
  font service sees visitors. The scheme's fonts are the default.
- The owner picks each site's heading, body and script fonts, and any block's fonts.
  The preview shows each font in the site's own wording.
- The only limit is speed: every extra font is another file for visitors to load. The
  editor warns when a page uses more than a few, and still allows it (decision 16).

### The breeder's instructions

Decision 19, the owner's first ask among the additions.

- All the wording the breeder sees in the Site Manager goes in one list the owner
  edits: help lines, field hints, labels, button wording, empty-screen messages,
  confirmations, errors that tell her what to do, and each screen's instructions.
- It's set once for every site, and can be overridden per template and per site.
  Today's wording is the default.
- The list is grouped by screen, and each item shows where it appears. Wording can
  include the breeder's names (her kennel name, a dog's name) where the screen has them.
- **From now on, new breeder-facing text goes in that list, not only in the code**
  (`CLAUDE.md`). Until the list exists, each screen's wording is kept in one place and
  noted in the build log, so it's easy to move later.
- Left out of the list: the owner's own admin screens, and messages about KennelPort
  itself failing (a lost connection).

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
- **Redirects:** the existing `redirects` table (old path, new path, date), already used
  for album addresses, also holds renamed page addresses. No new table.
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
2. **The breeder's instructions** (decision 19): every line of wording she reads in the
   Site Manager in one list the owner edits, set for every site and overridable per
   template and per site. It's small and it's the owner's first ask, so it goes next.
   In this order:
   1. the list, its editor for every site and per site, and the structured wording:
      every field's label and help, the choices in lists, the notes after a change, the
      lists' names and buttons, her home screen (built; per template comes with step 5);
   2. each screen's own instructions and empty-screen messages, screen by screen (built
      for the website's screens: headings, instructions, buttons, links, empty
      messages and the lines a screen picks between; signing in, her sites and
      Notifications, with every site's wording; her lists' second lines);
   3. the errors that tell her what to do (built: the content model's checks, a line
      per kind of check with the field by its label; and the errors of the waitlist,
      photos, videos and posts, badge codes, the KennelOS feed, linking and matches,
      Delete, Publish and signing in, a line per message);
   4. the family portal's screens for the breeder (`portal/admin.js`), and Today.
3. **Pages, blocks and the menu as settings.** Today's site becomes the **Website** template.
   Add new pages and data blocks (Dams and Sires), the menu editor, and the breeder's
   address renaming with redirects. FAQ and badge places become block settings. Each
   block gets its fixed counts as settings and what its cards show; each profile page,
   what it shows; and the contact and review forms, their fields. In this order:
   1. Home as blocks (built);
   2. the other pages as blocks (built);
   3. new pages, with the breeder's switches and words for the blocks the owner adds
      (built: New page in Pages, at its own address and in the menu group the owner picks;
      the breeder switches it on or off, names it and words it, and switches off and
      rewords each block the owner added, on any page; `block_switches`; content.json
      carries both);
   4. the menu editor (built: Menu in the admin view; groups, their names, order, button
      and footer switches; pages, places on a page and outside links; the footer follows
      a changed menu);
   5. page addresses and their redirects;
   6. FAQ and badge spots as block settings, on new pages too;
   7. what each profile page shows;
   8. the contact and review forms' fields.
4. **The owner's own blocks and styling** (decisions 16 to 18): buttons, banners and
   their links; dividers, spacers, collages, photos, videos, text over a photo; every
   block's background, padding, text size and fonts; template colours; the font library.
5. **Templates.** Save as template, Apply, Reset to template.
6. **The family portal's build:** the **Website and family portal** template; the
   portal's timing and display rules; then moving its family and breeder components,
   and what each of its cards shows.
7. **After the KennelOS review:** the new raw fields, as rule and filter inputs, for the
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

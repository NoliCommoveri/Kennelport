# Text sizes: plan

The owner's ask (2026-11-18): as admin, set the text size of each kind of text on a
site, starting from what the site uses today, with **one place to change a kind of text
everywhere** ("headers from 16 to 20": by headers she means headings, 2026-11-18) instead of
hunting through components. Not built.

This carries forward site-builder.md step 4's "text size on the built-in blocks", and sits
beside the template colours and the font library there. Decision 16 holds: the owner is
limited only where text would stop being readable or would break a layout, never for looks.

## Today

`_kp/t/ak/site.css` sets text size in **138 places, with about 40 different values**, in
rem (1rem = 16px at the browser's normal size; it grows when a visitor zooms or has larger
text set, and that must keep working). Headings scale with the screen width (h1 35–58px,
h2 29–40px); everything else has one size. Each scheme sets only the script line's size
(`--script-size`). The owner's own blocks already have a per-block **Text size** (very small
to large: `.kb.t-*`, a multiplier); it stays, on top of what this plan adds.

Many values are near-duplicates of the same idea: card text is .86, .88, .92 or .93rem
depending on the card; a card's heading is 1.1, 1.2, 1.3 or 1.35rem depending on the card.
That is why one change can't reach "all headings" today.

## The idea: text roles, then components

Two levels, both in one screen:

1. **Roles** (the one-stop change): each kind of text the site has, about 16, with its
   size. Change a role and every component in it follows: "Card heading 20.8px → 24px"
   changes the dog and pup names on cards, package and extra names, the Cards block's
   headings, parent cards, album and badge names, at once.
2. **Components** (optional, under each role): each place that role is used, listed with its
   size. By default a component follows its role, keeping its proportion to it. The owner can
   give one component its own size, which then stops following the role. A **Follow the role
   again** link undoes that.

**All headings** (the owner's main ask): the four heading roles (Page title, Section heading,
Card heading, Expander title) also move together, from one control at the top of the screen:
a percentage (90% to 150%) or "make the smallest heading N px", which scales all four and
keeps their proportions to each other. Changing one heading role on its own still works, and
the All headings control then scales from there.

On top of everything, an **All text** scale (90%, 100%, 110%, …) multiplies everything, for "make
the whole site a bit bigger".

### The roles, prefilled with today's sizes

Sizes in px at the browser's normal size (the screen shows px; for reference, a design app's
"pt" is about px × 0.75, so 16px is 12pt).

| Role | Today | Components (examples, from site.css) |
|---|---|---|
| Page title | 35px phone → 58px computer | `h1`, the page heading |
| Section heading | 29px → 40px | `h2`, block headings, the Text block, Text in columns |
| Card heading | 20.8px | `h3`, a dog's or pup's name on a card (21.6), package and extra names (21.6), Cards block (19.2), parent card (19.2), album and badge names (17.6) |
| Expander title | 17.3px | FAQ and Extras expanders (`details.x summary`) |
| Lead line | 16.8px | the line under a heading, the banner's words, review quotes |
| Body | 16px | `body`, the Text block, policies, pickup words |
| Card text | 14.7px | step, extra and package words, Cards words, bios (13.8), features (14.1) |
| Small text | 14px | `.small`, registered names (12.8–14.4), health tests (13.4), breadcrumbs, payment notes |
| Labels | 11.8px | eyebrows, a card's status line, package "weeks", the Show filter (12.8), table headings (11.5), footer headings (11.5), facts' labels (12.5), the tagline under the kennel name (10.9) |
| Pills | 11.8px (dot), 10.9px (ribbon, capsule), 12.8px (chip) | statuses, tags, a card's labels, the Extras block's highlight label |
| Buttons and links | 14.4px | `.btn` (small 11.5, medium 13, large 15.1), "More" links, expander links in cards |
| Menu | 14.7px (16px in the phone menu) | top menu, its dropdowns |
| Big figures | 35.2px | a step's number, a card's big figure; the facts row (25.6); package weeks (48); prices (20.8) |
| Footer | 14.4px | footer links; its fine print (12.5) |
| Forms | 13.6px | visitors' form labels, choices (14.7), hints (12.8) |
| Header name | 18.4px | the kennel's name beside the logo |
| Script line | the scheme's (1em to 1.35em of its heading) | the handwritten line in a heading |

The exact component list for each role comes from the inventory (build step 1); the table
above is from reading site.css on 2026-11-18.

### Near-duplicates: one decision for the owner

To keep **today's site exactly as it is** when nothing has been changed, every component keeps
its own proportion to its role (card text at .86rem is "Card text × 0.94"). That's the safe
default and what this plan builds.

The owner may instead want near-duplicates snapped to their role (every card text
14.7px, every small text 14px): tidier, and a role change then gives exactly one size, but a
few texts would move by up to 1px the day it ships. **Ask the owner**; the plan works either
way, and snapping can be done later, a role at a time, as a "Make these the same" button on
a role.

## How it's stored and drawn

- **Stored** in the site's build (`site_builds.build.text`), like every other admin
  setting, so no migration: `{ scale: 1, roles: { label: 14, … }, parts: { pill_chip: 13, … } }`,
  in px, only what the owner changed. Empty means today's site.
- **Every site, then per site**, as the breeder's wording is: one set of defaults for every
  site, and each site's own changes over it. Templates (site-builder step 5) carry them too.
- **site.css changes once:** every font-size becomes a CSS variable with today's value as its
  fallback, `font-size: var(--ts-card-text, .92rem)`, for a component that follows its role
  `calc(var(--ts-card-text) * .94)`. With no settings the site looks exactly as today.
  That change needs an `ASSET_VERSION` bump (ask first, CLAUDE.md), once.
- **The site's own sizes** are a tiny stylesheet the Worker writes from the snapshot,
  `/_kp/x/sizes-<hash>.css`, linked after site.css when the site has any. Only the variables
  the owner changed are in it, in rem (px ÷ 16), so visitors' zoom and larger-text settings
  still work. The site's CSP allows no inline styles, so it has to be a file; its address
  changes with its contents, so it can be cached for a long time and needs no version bump
  when the owner changes a size. It goes live with Publish, as every other build change does.
- **Headings** keep growing with the screen: their role has a phone size and a computer size,
  and the CSS keeps the `clamp()` between them.
- **Per-block Text size** (`.kb.t-*`) keeps multiplying on top, as today.

## The screen: Text sizes, in the admin view

A screen per site (and one for every site's defaults), built from the prototype's components
(highlight rows, segmented toggles, the pinned action bar; checked at 390px and on a
computer):

- **All headings** first (the one-stop change the owner asked for), then **All text**: each a
  segmented choice of percentages, with − and + for finer steps.
- **A row per role:** its name, a sample line in the site's own fonts and colours at that size,
  the size in px with − and + (1px steps) and a box to type it, and **Back to today's**.
  Headings show their phone and computer sizes.
- **Open a role** to see its components: each with its sample, its size (following the role,
  or its own), and **Follow the role again**.
- **See it:** the admin view of her site, as on Pages (Save, then the preview shows it).
- The action bar: Save, and "Publishing puts it live".

### Checks (decision 16: function only)

- **Readable:** nothing under 10px on the site, refused with a line saying why. Above that,
  any size.
- **Warnings, still allowed:** a label or small text bigger than its card's heading; a
  heading so big that a long word overflows a phone (the preview shows it); a button whose
  words no longer fit on one line at 390px.
- Everything else is her call.

## Building it, in steps

1. **Inventory.** List every font-size in site.css by selector, assign each to a role, and
   record each one's ratio to its role. A test holds the list, so a new font-size in site.css
   without a role fails (as `fields.test.js` does for fields).
2. **site.css to variables** (no visible change). A Playwright check renders every page of the
   demo site and the AK sample at 390 and 1280px and compares every element's computed font
   size before and after: all must match. `ASSET_VERSION` bump, after asking.
3. **The setting and the stylesheet:** `build.text`, cleaned like the rest; the snapshot
   carries it; the Worker serves `/_kp/x/sizes-<hash>.css`; layout.js links it.
4. **The screen**, roles first, then the components under each, then All text.
5. **Every site's defaults**, and templates when step 5 of the site builder comes.
6. Later, if wanted: the same for the family portal (`_kp/f/`), whose sizes are its own.

## Open questions for the owner

1. Near-duplicates: keep each component's proportion to its role (no change today), or snap
   them to the role (tidier, a few texts move by up to 1px)?
2. ~~What "labels" meant~~: answered, headings (2026-11-18). The small uppercase lines stay
   their own role, Labels.
3. Should the breeder have any say (for example, All text bigger for her older families), or
   is it admin only?

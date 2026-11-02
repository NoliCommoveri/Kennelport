# KennelPort: design direction (DRAFT)

> Status: the owner's stated preferences for how a KennelPort site looks and behaves,
> worked out in more detail. The only rule is that it costs nothing. The AK sample
> ([`reference/ak-sample.html`](reference/ak-sample.html)) shows all six working. Evidence
> for what real breeder sites do is in [`KennelPort_Visual_Survey.md`](KennelPort_Visual_Survey.md).

## The six preferences

1. **Photos that flip to reveal more.**
2. **Professional layouts:** no coloured pills, no visible raw hyperlinks, no overly
   rounded corners.
3. **Pages or text that slide sideways** to reveal the next set.
4. **Nested menus, drop-down selects and expanders** instead of long walls of text or
   dozens of buttons side by side.
5. **Background ornaments**, like the botanical sprigs around "Meet Our Dogs" in the
   Cotton Paws example.
6. **Different but complementary fonts** on one page.

None of the 26 surveyed sites combine these. Flip cards appeared on none; slide-sideways
sets on a few (photo carousels); expanders on two (Lonestar, Peterbuilt); several sites
are exactly the walls of buttons and text that preference 4 rules out (Angels of Gold's
25-button sidebar, Ryan's Goldens, Shepherd Pals' pasted application).

## The one rule: it costs nothing

Anything free is fair game: JavaScript, animation and slider libraries, web fonts from
Google Fonts or anywhere else, icon sets, free outside services. Fonts and libraries are
served from the site itself rather than loaded from Google's or a CDN's servers, so
visitors aren't tracked (plan section 3.3). Nothing that charges,
now or at the scale of a few sites.

**JavaScript is the main tool** for expanding what the design can do: flips, slides,
scroll effects, menus, filters and photo viewers. Free libraries that cover the six
preferences (current licences to check when building):

| Need | Free library |
|---|---|
| Flip cards, scroll-triggered reveals, page and section transitions | GSAP with ScrollTrigger (free for all uses, including its plugins) |
| Sliding sets of cards, photos and steps | Swiper (MIT licence) |
| Tapping a photo to view it full screen, with swipe between photos | PhotoSwipe (MIT licence) |
| Small animated illustrations and ornaments | Lottie (MIT licence) with free animation files |
| Menus, drop-downs and expanders | a few lines of the template's own code |

Libraries are copied into the template and served from the site, never from a CDN (plan
section 3.3).

## 1. Flip cards

**Where:** dog cards (Kennel residents: girls, boys, retired, stud), puppy cards on a
litter page, team members on the About us page, extras.

**What each side holds (decided):**
- *Front:* the photo, with the **registered name and call name** beneath it or laid over
  the photo, plus one line ("Boston Terrier · Dam").
- *Back:* the **same photo faded to about 10%** as the background, with the registered
  and call names still showing at the top, then the **health tests** (as the breeder
  chose, plan section 3.7) and the **bio**, with **View profile** at the bottom. For a
  puppy: its names, sex, colour, collar and status (plan section 3.6), and **Ask about
  this puppy**. With KennelOS linked, the back is where KennelOS's data lands.

**How it behaves:** hover flips it on a desktop; a tap flips it on a phone, and a
second tap flips it back. A small, quiet cue says the card turns. The card keeps the
same size on both sides, so a grid never jumps. A reserved puppy shows "Reserved" on the
front too, so nobody falls for a puppy that's taken.

## 2. Professional, not playful

- **Corners:** square or barely rounded (2–4px) on photos, cards, buttons and inputs.
- **Buttons:** rectangles: solid in the accent colour for the one main action on a
  screen (Apply, Join the waitlist), outlined or plain text with an arrow for the rest.
  No pill shapes, no stacks of coloured buttons.
- **Links:** no raw blue underlined links and no visible web addresses. Links look like
  the surrounding text or the accent colour; navigation and buttons carry no underline.
- **Badges and labels:** small caps text, or a thin outlined tag, not coloured lozenges.
  Status like Reserved / Available is a word with a small mark, not a bright pill.
- **Reference sites** from the survey closest to this: Northwest Lagotto, Field Bred
  Golden Retrievers, Blackwood Acres, Lonestar Doodles.

**The Cotton Paws example's buttons** (**View Profile**, **Learn More About Us**, **Read
Our Full Story**, **Join the Waitlist**, the "View All Puppies" outlines) become square or
lightly rounded rectangles (decided).

## 3. Sliding sets

**Where:** a row of dogs, current and upcoming litters, reviews, a litter's photos, the
steps of How it works, and older litters on Past litters.

**How it behaves:**
- A horizontal track that snaps card by card: swipe on a phone; arrows (and the trackpad
  or keyboard) on a desktop.
- The edge of the next card shows, so it's clear there's more.
- A small position marker ("2 / 6" or dots).
- **No autoplay.** Sets move only when the visitor moves them.
- On a phone the Cotton Paws example's four-across dog row can't fit; a sliding row is
  how it stays one row.

Off-screen cards get less attention, so the most important item goes first (available
puppies before reserved ones), and a "See all" link opens the full list as a grid.

## 4. Menus, selects and expanders instead of walls

**Navigation:** a short top menu with nested groups: drop-downs on a desktop, a menu
with expanding sections on a phone. Five top-level items (decided), with the plan's pages
nested under them:

| Menu | Holds |
|---|---|
| **About us** | Our story, Our family, Reviews, Contact |
| **Kennel residents** | Girls, Boys, Retired, In memory, Stud dogs |
| **Puppies** | Available, Upcoming litters, Past litters, Older puppies |
| **How it works** | The steps, Programs (guardian homes), How we raise puppies, Policies, Pickup and delivery, Extras, How to pay safely, FAQ |
| **Waitlist** | The waitlist or application; styled as the one main button |

The labels are the menu's default wording; the pages keep their fixed addresses (plan
section 3.1: "Kennel residents" still opens `/dogs`), and a breeder can rename a label.
Contact also sits in the footer.

Empty sections disappear from the menu (no "Retired" item if there are no retired dogs).

**Expanders** for: FAQ questions, each policy section (guarantee, deposits, spay/neuter,
take-back), the detail under each How it works step, long bios, a dog's full health
results, a litter's weekly diary entries. The first one or two can start open where it
helps.

**Drop-down selects** for: filtering a page (girls or boys, litter year, review topic),
and the inquiry form's choices (which litter, preferred sex, timing).

## 5. Background ornaments

- **What:** light line-art behind or beside headings and in section corners: botanical
  sprigs (as in the example), leaves, a paw, a fence line, a mountain line, rope.
- **How:** faint against the background so text over them stays readable; drawn as
  small vector images, from a free ornament or illustration set.
- **Who picks them:** each theme comes with a matching ornament set (botanical, ranch,
  mountain, coastal, none). Breeders choose a theme, not individual ornaments, which
  keeps every site tidy.
- **Restraint:** one ornament per heading or section at most; none behind body text on a
  phone, where they crowd the screen.

## 6. Font pairings

- **A pairing per theme, not free choice:** a display serif for headings, a clean sans for
  body text, and optionally a script for the kennel name or one accent word, used no
  more than once or twice a page. The example does this: serif "Meet Our Dogs", script
  "Lifelong Companions", sans body.
- **Small letter-spaced capitals** for labels above headings ("ABOUT COTTON PAWS", "OUR
  PARENT DOGS"), as in the example and the polished survey sites.
- **Any free font**, from Google Fonts or elsewhere.
- **Readable body text** on a phone: the survey's worst pages used 10–12px light grey
  body text.

## 7. Colour schemes

Each scheme is a palette in light and dark versions, a font pairing and an ornament set
(plan section 3.13). Breeders pick a scheme, never single colours. All six ship in
version 1 (decided after comparing them on the AK sample in
[`reference/scheme-lab.html`](reference/scheme-lab.html), which holds each scheme's exact
colours). Every scheme is contrast-checked in both versions before it ships; the lab's
colours haven't had that check yet.

| Scheme | Light | Dark | Fonts (display / body / script) | Ornaments |
|---|---|---|---|---|
| **Lawn** (the AK sample) | ivory ground, tuxedo-black ink, lawn-green buttons, brass labels | near-black ground, warm off-white ink, soft green buttons, gold labels | Fraunces / Mulish / Pinyon Script | botanical sprigs |
| **Harbor** | pale sky-blue ground, navy ink, sea-blue buttons, sand labels | deep navy ground, pale blue-white ink, sky-blue buttons | Cormorant Garamond / Nunito Sans / Allura | rope and anchor line |
| **Heather** | soft grey-lilac ground, charcoal ink, plum buttons, sage labels | aubergine-black ground, lilac-white ink, orchid buttons | Libre Caslon Display / Karla / Great Vibes | lavender sprigs |
| **Clay** | warm sand ground, saddle-brown ink, rust buttons | dark leather ground, cream ink, copper buttons | Bitter / Source Sans 3 / none | fence line, wheat |
| **Slate** | white ground, charcoal ink, steel-blue buttons | graphite ground, white ink, light steel buttons | DM Serif Display / Work Sans / none | none |
| **Midnight** (dark first) | cream ground, ink-blue text, gold buttons | charcoal ground, cream ink, gold buttons and labels | Cormorant / Mulish / Pinyon Script | mountain line |

Clay and Slate have no script font: the script line shows in the display face's italic.
Midnight's display face uses old-style numbers. Harbor matches the light blue the first site's owner already uses on their own pages.
All fonts are free from Google Fonts (Open Font License), and the site serves its own
copies (plan section 3.3).

**What the AK sample showed about building it:** the flips, sliding sets, menus and
expanders took a few hundred lines of the template's own JavaScript and CSS (scroll-snap
for the sliding sets); no library was needed. GSAP, Swiper and the others stay allowed
where they add something.

## Decided

- Flip cards show more information, laid over a 10% faded copy of the photo (section 1).
- Buttons are rectangles, not pills (section 2).
- The top menu is About us · Kennel residents · Puppies · How it works · Waitlist
  (section 4).
- JavaScript and any free library or service may be used (the one rule: no cost).
- The AK sample ([`reference/ak-sample.html`](reference/ak-sample.html)) is the reference
  for the first template: its layout, cards, sliding sets, expanders and Lawn scheme.
- Breeders choose a colour scheme, not individual colours; all six schemes in section 7
  ship (section 7).

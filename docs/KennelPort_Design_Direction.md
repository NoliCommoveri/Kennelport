# KennelPort: design direction (DRAFT)

> Status: the owner's stated preferences for how a KennelPort site looks and behaves,
> with how each one works within the plan's rules. Not a finished design. Evidence for
> what real breeder sites do is in [`KennelPort_Visual_Survey.md`](KennelPort_Visual_Survey.md).

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

## The rules they work within

From the plan: pages are rendered on the server from a template; breeders never add code;
each page's Content Security Policy allows scripts, styles, images and fonts only from the
site itself (plan section 3.3); most visitors are on phones; every page must be usable by
keyboard and screen reader (plan section 3.9). So for every preference below:
- **Everything works with no JavaScript.** Motion and interaction are built in CSS where
  possible, with at most a small first-party script as an enhancement. Nothing from
  outside the site.
- **Every word is in the page's HTML,** even when it's on the back of a card, inside a
  closed expander or on a slide that's off screen, so search engines and screen readers
  get it.
- **Motion respects the visitor's "reduce motion" setting:** flips become a fade, slides
  jump instead of gliding.
- **Touch first:** anything that responds to hover on a desktop responds to a tap on a
  phone.

## 1. Flip cards

**Where:** dog cards (Our dogs, Retired, Stud), puppy cards on a litter page, team
members on the About page, extras.

**What each side holds:**
- *Front:* the photo, the name and one line ("Daisy · Boston Terrier · Dam").
- *Back:* the facts real sites put in a list: registered name, date of birth, size, titles,
  health highlights as the breeder chose (plan section 3.7), a short bio, and **View
  profile**. For a puppy: sex, colour, collar, status (plan section 3.6), and **Ask about
  this puppy**. With KennelOS linked, the back is where KennelOS's data lands.

**How it behaves:** hover or keyboard focus flips it on a desktop; a tap flips it on a
phone, and a second tap (or a small "back" control) flips it back. A small, quiet cue
says the card turns. The card keeps the same size on both sides, so a grid never jumps.

**Watch for:** status must never be only on the back. A reserved puppy shows "Reserved"
on the front too, so nobody falls for a puppy that's taken.

## 2. Professional, not playful

- **Corners:** square or barely rounded (2–4px) on photos, cards, buttons and inputs.
- **Buttons:** rectangles: solid in the accent colour for the one main action on a
  screen (Apply, Join the waitlist), outlined or plain text with an arrow for the rest.
  No pill shapes, no stacks of coloured buttons.
- **Links:** no raw blue underlined links and no visible web addresses. Links inside
  paragraphs still need some cue besides colour so they can be found (accessibility
  requires it): the text colour with a thin underline in the accent colour, or a weight
  change. Navigation and buttons need no underline.
- **Badges and labels:** small caps text, or a thin outlined tag, not coloured lozenges.
  Status like Reserved / Available is a word with a small mark, not a bright pill.
- **Reference sites** from the survey closest to this: Northwest Lagotto, Field Bred
  Golden Retrievers, Blackwood Acres, Lonestar Doodles.

**Note on the Cotton Paws example:** its **View Profile**, **Learn More About Us**,
**Read Our Full Story** and **Join the Waitlist** buttons are rounded pills, and its
"View All Puppies" links are pill outlines. Under this preference they become square or
lightly rounded rectangles.

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

**Watch for:** off-screen cards get less attention, so the most important item goes
first (available puppies before reserved ones), and a "See all" link opens the full
list as a grid.

## 4. Menus, selects and expanders instead of walls

**Navigation:** a short top menu with nested groups: drop-downs on a desktop, a menu
with expanding sections on a phone. A proposed grouping of the plan's pages:

| Menu | Holds |
|---|---|
| **About** | Our story, Our family, Programs, How we raise puppies, Reviews |
| **Our dogs** | Girls, Boys, Retired, In memory, Stud dogs |
| **Puppies** | Available, Upcoming litters, Past litters, Older puppies |
| **Buying a puppy** | How it works, Policies, Pickup and delivery, Extras, How to pay safely, FAQ |
| **Apply** (the one button) | The waitlist or application |
| Contact | in the menu and the footer |

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
- **How:** decorative only, so screen readers skip them; faint (low contrast against the
  background) so text over them stays readable; drawn as small vector images served from
  the site.
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
- **At most three families per page**, and only the weights used, so pages stay fast.
- **Fonts are served from the site itself** (the Content Security Policy allows nothing
  else), so only openly licensed fonts that can be self-hosted.
- **Readable body text:** 16px or larger on a phone, normal weight, strong contrast. The
  survey's worst pages used 10–12px light grey body text.

## Open questions

1. **Flip cards:** "a flip animation to reveal more animation" is read here as "to reveal
   more information" (facts on the back). Is that right, or should the back also animate
   (a short video or a second photo)?
2. **Example buttons:** confirm that the pill-shaped buttons in the Cotton Paws example
   change to square or lightly rounded rectangles.
3. **Links in paragraphs:** is a thin accent-coloured underline acceptable for links
   inside text? Some cue is needed for accessibility.
4. **Menu grouping:** does the grouping in section 4 match how you'd expect visitors to
   look for things?

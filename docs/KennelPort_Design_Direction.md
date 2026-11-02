# KennelPort: design direction (DRAFT)

> Status: the owner's stated preferences for how a KennelPort site looks and behaves,
> worked out in more detail. The only rule is that it costs nothing. Not a finished design. Evidence for
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

## The one rule: it costs nothing

Anything free is fair game: JavaScript, animation and slider libraries, web fonts from
Google Fonts or anywhere else, icon sets, free outside services. Nothing that charges,
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

Libraries are loaded from a free CDN or served from the site; either costs nothing.

## 1. Flip cards

**Where:** dog cards (Our dogs, Retired, Stud), puppy cards on a litter page, team
members on the About page, extras.

**What each side holds:**
- *Front:* the photo, the name and one line ("Daisy · Boston Terrier · Dam").
- *Back:* the facts real sites put in a list: registered name, date of birth, size, titles,
  health highlights as the breeder chose (plan section 3.7), a short bio, and **View
  profile**. For a puppy: sex, colour, collar, status (plan section 3.6), and **Ask about
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

Off-screen cards get less attention, so the most important item goes first (available
puppies before reserved ones), and a "See all" link opens the full list as a grid.

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

## Open questions

1. **Flip cards:** "a flip animation to reveal more animation" is read here as "to reveal
   more information" (facts on the back). Is that right, or should the back also animate
   (a short video or a second photo)?
2. **Example buttons:** confirm that the pill-shaped buttons in the Cotton Paws example
   change to square or lightly rounded rectangles.
3. **Menu grouping:** does the grouping in section 4 match how you'd expect visitors to
   look for things?

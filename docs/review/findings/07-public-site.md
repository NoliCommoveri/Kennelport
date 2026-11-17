# 07 — The public site: what a family sees

Commit reviewed: `557235e` (main after #66)  ·  Changed since the target (`8aaf58a`): nothing under
`worker/src/render/`, `site.js`, `front.js` or `worker/public/_kp/t/`; `publish.js` (+8, session 1's
hidden products and extras) and `content/model.js` (+4) only.
Reviewed: `render/index.js` 83, `layout.js` 139, `pages.js` 979, `parts.js` 934, `schemes.js` 162,
`version.js` 10, `render/pages/*` (12 files, 610), `site.js` 266, `front.js` 367 (skimmed), `qr.js` 16,
`embeds.js` 143, `content/blocks.js` 1114 (cleaning, menu, custom pages), `fields.js` 521 (matching),
`forms.js`, `picks.js` 96, `featured.js` 78, `prices.js`, `rules.js` (defaults), `publish.js` (the
snapshot), `lib/html.js`; `public/_kp/t/ak/site.css` 792, `site.js` 398, the seven `scheme-*.css`.
Contract read: plan §3.2, §3.6, decisions 18, 31, 32; `site-builder.md` (pup-status defaults table,
decisions 7–14, forms); `kennelos-contract.md` B3, B5.
Verified by: `node --test` 455 pass. Scratch scripts (scratchpad, not in the repo) that build the
demo (linked-sample) site and the AK sample through `/ops` and `importContent`, call
`buildSnapshot`, then:
- **poison**: every string in the snapshot (prose, then also every enum-ish value except ids, slugs
  and statuses) replaced with `…<q>"'Zn`, every address rendered, the HTML searched for a raw
  `<q>`, a raw `"'Z` inside an attribute, and double escaping; on three snapshots (demo, AK sample,
  and a "rich" one adding photos, a 300-photo album, embeds, a page of hers with every block type,
  both forms with her own questions and an outside menu link);
- **empty and extreme**: an empty site, a dog with nothing, a dog with 30 health results, a 12-pup
  litter, a born litter with no pups entered, a planned litter with no parents, an 80-character
  kennel name and tagline; scanned for empty headings/lists/paragraphs, dangling "·" and ",",
  `undefined`/`null`/`NaN`;
- **Chromium (Playwright)**: every page of the extreme snapshot in all seven schemes, light and
  dark, at 320px: sideways scroll and what pokes out; flip-card backs that cut off links (320, 390,
  1280); WCAG contrast of every visible text node in `main` on 14 pages × 7 schemes × light/dark;
- price, status, form and renamed-address scenarios rendered directly (each finding says which).

| # | Sev | Where | What | Verified? |
|---|-----|-------|------|-----------|
| 1 | S1 | worker/src/content/rules.js:161,163; render/parts.js:688 | Reserved and Still deciding pups show "Ask about full registration" and "Full Registration Surcharge $700" | verified |
| 2 | S2 | worker/src/render/parts.js:543; render/pages/blocks.js:104 | Puppies page off: Home's litter cards still link to "Meet the puppies" and "View all puppies", both 404 | verified |
| 3 | S2 | worker/public/_kp/t/ak/site.css:240; render/parts.js:564 | A dog with 8 health results loses "View profile" (and its bio) off the back of its flip card | verified |
| 4 | S3 | worker/src/render/parts.js:369; content/prices.js:34 | A litter where nothing is for sale still shows Price, Deposit and a range that counts not-for-sale pups | verified |
| 5 | S3 | worker/src/publish.js:118; render/pages/blocks.js:31 | The owner's "always show" adult price rule shows no price at all while the breeder's switch is off | verified |
| 6 | S3 | worker/src/content/forms.js:112 | A required review Email or Phone still reads "(optional, for us only)" | verified |
| 7 | S3 | worker/src/render/pages.js:702 | Renamed FAQ or Policies page: its menu group is no longer marked as the current one | verified |
| 8 | S3 | worker/src/render/schemes.js:160; render/pages/featured.js:58 | Status pills on the Featured block's band fall below 4.5:1 in four light schemes | verified |
| 9 | S3 | worker/src/embeds.js:82,92,44 | Share links the phone apps make are refused; a Facebook photo link embeds a page called "photo"; an unlisted Vimeo loses its key | verified (reading); Vimeo player suspected |
| 10 | S3 | worker/src/render/pages/formParts.js:24 | The contact form's "The puppy or litter" list offers Reserved, staying and Still deciding pups | verified |

**Escaping: no finding.** Under both poison passes, no raw marker reached any page, attribute,
`srcset`/`alt`, OG or Twitter tag, the JSON-LD (`<` is `<`), the sitemap, the menu, her blocks,
her forms' labels and options, or the `data-*` attributes the template script reads; nothing was
double-escaped. The values interpolated without `esc` (`class="a-${b.align}"`, `n-${b.across}`,
`f-${focus}`, `bg-${b.s.bg}` and the like) are all cleaned to fixed lists in `content/blocks.js`
`cleanBlock`. Every outside link (menu, button, partner, owner, verify, pay, more photos, Facebook,
Instagram) is `http(s)` only, checked on the way in (`model.js:504`, `blocks.js:642,930`, the
bundle's `url` type) and again in `linkFor`. The template script uses `textContent`/`dataset`; its
only `document.write` writes the site's own answer to a form post; `data-embed` is built from the
provider list, never from what she pasted.

**No picks shown (decision 18): holds.** No buyer, pick or family field reaches a puppy or litter in
the snapshot (checked the keys of every record of the demo's snapshot). Hidden pups and, with Show
prices off, every litter price field and a pup's own price are left out of the snapshot itself.

**No sideways scroll anywhere** at 320px: every page of the extreme snapshot, all seven schemes,
light and dark (`body` has no `overflow-x: hidden` to mask it). Dark mode contrast: no text below
its WCAG threshold in `main` on any scheme in dark; the only low readings were finding 8.

**Page addresses: holds,** apart from finding 7. No starting address of a renameable page is written
by hand in the template (the `/waitlist`, `/privacy` ones are fixed addresses, `addresses.js:21`);
the sitemap lists the new address only; profiles stay at `/dogs/<slug>` and `/litters/<slug>`.

## 1. Reserved and Still deciding pups show the full-registration ask and its price  (S1, verified)
**Where** `content/rules.js:161` (placed, shown as Reserved) and `:163` (undecided) set `fullreg` true
in `DEFAULT_RULES`; `render/parts.js:688` `undecided()` follows it, so `fullRegLink` and
`fullRegSurchargeRow` (`:721–731`) draw on every card and page of a pup with no registration set.
**Scenario** A litter with Show prices and Families can ask about full registration on; surcharge
$700. Every pup Reserved: each card's back, and each pup's page, reads "Status Reserved ·
Registration Limited · Ask about full registration · Full Registration Surcharge $700", and the
litter's facts carry the same link and figure. With every pup Still deciding, the same. (Rendered:
`/litters/the-spice-litter` and `/litters/the-spice-litter/sage` on the demo with those two
settings.) A family reads a reserved pup as one they can still ask for, at a price.
**Why it matters** Plan §3.2: "Puppies marked reserved or placed never show a price"; §3.6 and
decision 32: Still deciding has no price and is not offered. `site-builder.md`'s defaults table
records "pups with no registration set, other than staying" as today's behaviour, so the default
copied the gap rather than the decision.
**What I'd do** Default `fullreg` to `available` (and `not_open`) only, as price and ask are; ask the
owner first, since the table says otherwise.
**Done, 2026-11-17 (the owner's call):** the setting stays hers on the Rules screen for every
status; its default is now off for Reserved and Still deciding (`rules.js:161,163`), on for
Available as before. See the build log.

## 2. Puppies page off: Home's litter links go nowhere  (S2, verified)
**Where** `render/parts.js:543–545` `litterCard`'s "Meet the puppies" links to `/litters/<slug>`
whatever the Puppies page says; `render/pages/blocks.js:104` `littersBlock`'s "View all puppies"
links to the Puppies page without `pageOn` (Pup cards, `:116`, and puppy cards, `parts.js:759`, do
check). `render/index.js:40–43` 404s every `/litters…` address while the page is off.
**Scenario** The breeder switches the Puppies page off (her Pages screen, `content/records.js:405`)
and leaves Home's litters on. Home still shows the litter cards; "Meet the puppies" and "View all
puppies" open "This page isn't available". (Rendered on the AK sample: `/` links to
`/litters/gem-2026`, `/litters/ziva-boone-2026`, `/litters`, all 404.)
**What I'd do** Hide both links (or the card's link row) unless `snap.pages.litters.enabled`, as
`puppyCard` does.

## 3. Eight health results push "View profile" off a flip card  (S2, verified)
**Where** `site.css:240` `.flip { height: 430px }` with `.face { overflow: hidden }`; `parts.js:564`
`dogItems` puts every health result on the back (the litter page's parent card stops at three).
**Scenario** A Boston with a normal full panel (BAER, patellas, eyes, JHC, cardiac, DM, hips, spine)
and a registry: on the Dogs page and Home's slider the back of its card shows the tests, the bio
is squeezed to nothing and "View profile" is cut off at the bottom edge, at 320, 390 and 1280px
alike (24px over at 8 results, 87px at 10). The card is the only way to the dog's page from the
list. Five results fit; seven with a registry and weight row are at the edge.
**What I'd do** Cap the back's results as `parentCards` does ("and 4 more health results"), or keep
the link pinned outside the clipped area.

## 4. A litter with nothing for sale still reads as priced  (S3, verified)
**Where** `parts.js:369` `litterPriceRows` and `content/prices.js:34` `litterPriceRange` read every
pup in the snapshot, whatever its status.
**Scenario** Spice litter, girl $2,500, boy $3,000, Show prices on. Girl Available, boy Still
deciding: the litter reads "Price $2,500–$3,000", a range the one pup for sale isn't in. Every pup
Reserved or Still deciding: Home's card and the litter page still show "Price $2,500–$3,000 ·
Deposit $500" over cards that each say there is nothing to buy.
**What I'd do** Work the range from the pups whose rule shows a price; with none, show neither row
(or the price-off words).

## 5. "Always show" an adult's price shows nothing while the switch is off  (S3, verified)
**Where** `publish.js:118` leaves a for-sale dog's `price` out of the snapshot unless the breeder's
Show prices of extras and adults is on; `render/pages/blocks.js:31` `saleOf` honours the owner's
rule `dogs.sale_price: 'always'` from that snapshot.
**Scenario** Ran through `buildSnapshot`: switch off, rule `always`: the dog page reads "Looking for
a home" with no price and no "Contact us for pricing"; with the rule `site` it reads "Contact us
for pricing". The owner's rule silently does the opposite of what it says.
**What I'd do** Strip the price in `publish.js` by the same rule `saleOf` uses.

## 6. A required review Email or Phone still says it's optional  (S3, verified)
**Where** `content/forms.js:112` drops only a trailing "(optional)"; the starting words are "Email
(optional, for us only)" and "Phone (optional, for us only)".
**Scenario** The owner makes the review form's Email required: the label reads "Email (optional,
for us only)" on a field the browser refuses to send empty. Same for Phone. (Rendered `/reviews`.)
**What I'd do** Drop "optional, " from the parenthesis too, or give the two a required wording.

## 7. A renamed FAQ or Policies page loses its menu highlight  (S3, verified)
**Where** `render/pages.js:702` `expanderPage` sets `section` to `/${key}` by hand instead of
`pagePath`; the header (`layout.js:52`) marks a group current by comparing that with each link.
**Scenario** FAQ renamed `/our-faq`: the page renders, the sitemap is right, but no menu group is
marked current (at `/faq` it's How it works). Policies the same; How it works, which goes through
`pagePath`, is fine.
**What I'd do** `section: pagePath(snap, key === 'waitlist_help' ? 'waitlist' : key)`.

## 8. Status pills on the Featured band are under 4.5:1 in four light schemes  (S3, verified)
**Where** `render/pages/featured.js:58` draws the Featured block on `.band`; its status pill sits
straight on it. `schemes.js:160` `TEXT_PAIRS` checks `ok` and `held` against `surface` only.
**Scenario** A Featured pup that is Available, light mode: "AVAILABLE" (.74rem) at 3.79:1 (Clay),
3.92 (Heather), 4.13 (Lawn), 4.38 (Harbor). Every other pill sits on a card's surface and passes.
**What I'd do** Add `['ok','band']`, `['held','band']` to the pairs (and darken where they fail), or
give the Featured pill a surface backing.

## 9. Embed links people actually paste  (S3, verified reading; Vimeo player suspected)
**Where** `embeds.js` readers. Ran `readEmbedLink` on 24 real-shaped links.
- Refused: `fb.watch/…` (the Facebook app's video share link; `:82` refuses it on purpose),
  `facebook.com/share/r/…` (a Reel's share link; `share/v` and `share/p` are accepted),
  `vm.tiktok.com/…` and `tiktok.com/t/…` (TikTok's Share → Copy link). Each is answered "That link
  isn't one KennelPort can show. Links from YouTube, Vimeo, TikTok, Instagram, Facebook work", which
  tells her the provider she used works. She must open the post in a browser to get the long link.
- `facebook.com/photo/?fbid=…` (a shared photo) reads as `page:photo` (`:92`) and embeds the Page
  plugin for a page named "photo": a visitor taps and gets Facebook's "not available" frame.
- `vimeo.com/123456789/abcdef1234` (an unlisted video's link) keeps the id and drops the hash (`:44`);
  Vimeo's player needs `?h=` for an unlisted video, so the tap opens a "private video" frame
  (from Vimeo's documented behaviour; not loaded here).
**What I'd do** Say "that's a short share link: open it and copy the address from the browser" for
the known short hosts; leave `photo`, `photo.php`, `media` and the like out of the page reader; keep
Vimeo's hash. (`share/v`, `share/p` are redirects too; whether Facebook's plugins resolve them is
unchecked.)

## 10. The contact form offers pups that aren't for sale  (S3, verified)
**Where** `render/pages/formParts.js:24` `aboutChoices` lists every pup of every current and planned
litter.
**Scenario** With "The puppy or litter" on, the list on the demo offers Ruby, Onyx and Jade
(Reserved), Opal (Joining our program) and Topaz (Still deciding) beside Pearl (Available).
**What I'd do** List the pups whose rule has `ask`, plus the litters.

## Notes, not findings
- The task brief says placed puppies read "Spoken for". The code and `site-builder.md` say
  "Reserved" (default, owner's rule, `no-reserved.test.js`); doc drift in the review plan only.
- A page of hers with data blocks hides entirely (404, gone from the menu) while those blocks are
  empty, her text blocks on it included (`parts.js:277` `customHas`). As designed, but an "About our
  program" page with words and a Reviews block vanishes until the first review.
- A Featured block she has picked for keeps showing a picked pup after it becomes Reserved
  (`picks.js:42` `applyPicks`, "whatever the owner's conditions"); if every pick leaves the site the block goes
  empty rather than falling back to the conditions.
- With the longest allowed kennel name and tagline (80 + 80) the sticky header is 189px of a 568px
  screen at 320 (a third). A realistic 33-character name with a tagline is 76px. `site.css:43`.
- A page with no photo of its own shares `Object.keys(snap.photos)[0]` when Home has no hero photo
  (`layout.js:108`): whichever used photo the database returned first, possibly a review's or a
  partner's logo.
- A planned litter with neither parent set draws two "?" circles and an empty names line
  (`parts.js:534` `litterCard`); a dog with no breed or role draws an empty eyebrow on its page.
- Cached pages are kept a day by snapshot id: turning Turnstile on (an env change, no publish)
  leaves the contact and reviews pages without the widget until the next day or publish, while
  the server starts asking for its token. Rare; note only.
- Photos are `public, max-age=86400`: one removed and published stays in visitors' browsers a day.

## Coverage gaps I found (tests that should exist)
- Full-registration ask on a Reserved and a Still deciding pup (finding 1).
- Home's litter links with the Puppies page off (2).
- A flip card back with eight results keeps its link inside the card (a CSS/layout check; 3).
- `litterPriceRows` with no pup for sale (4); `sale_price: 'always'` through `buildSnapshot` (5).
- A required field whose words hold "(optional, …)" (6); every renameable page marks its group
  current at its new address (7); `TEXT_PAIRS` covers every colour drawn on `band` (8).
- `readEmbedLink` on app share links and a Facebook photo link (9).
- A poison test like this session's, over every page of a full snapshot, would keep escaping honest
  as blocks are added.

## What I did not get to
- The family portal's pages and `front.js` (kennelport.com's own pages) beyond a skim.
- Loading real provider players (no outside network used): how a broken embed looks after the tap.
- Turnstile pages and the KennelOS application form in a browser (session 5's).
- Side-by-side comparison with `docs/reference/ak-sample.html` screen by screen; I checked
  behaviour, overflow and contrast, not the prototype's look.

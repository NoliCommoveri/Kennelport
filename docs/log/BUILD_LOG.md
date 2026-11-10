# KennelPort build log

History of the plan and, later, the build. Newest last. The plan itself
([`plans/kennelport.md`](../plans/kennelport.md)) describes only the current intent;
where things stand now is in [`STATUS.md`](../STATUS.md).

Add new entries at the end. Entries up to 2026-11-04 are in
[`2026-10-09_to_11-04.md`](2026-10-09_to_11-04.md). When this file passes about 60 KB,
move its older entries into a new archive file the same way.

## 2026-11-05: Puppy parent portal, family Home in the prototype's look

- Compared against `docs/reference/portal-prototype.html` at phone width, the built family
  Home had lost most of the prototype's variety (plain cards, one-column checklist, large
  link tiles). Home now carries the prototype's pieces over, with every built feature kept:
  - the header: her logo (or monogram) in a white circle, and "Puppy Parent Portal" under
    her name;
  - an edge-to-edge photo hero with a script line ("Welcome!", "Welcome home", "Hello
    again", or the stay's week) over the serif heading; after pickup, "N weeks home";
  - the pup card (framed round photo, script name with a sex badge, the breed,
    born and home facts) beside a calendar tile: a calendar page (month on red, day,
    weekday) with days to go and the pickup time and **What to do first**; in the vet
    window a red tile with hours left and **Upload record**; after, the next task; during
    a stay, a dark tile with the week and a week bar;
  - Book the vet visit as a warm tile with a large icon;
  - the vet visit, What's next and the stay's skills as mint bands with numbered blobs;
  - the go-home checklist in two columns on a phone;
  - before pickup, with a status page, a paper band: pickup, extras and messages stay
    there;
  - the food band edge to edge on deep green ("Keep X on the same food", the food on a
    cream box, a round Order button), and Included with X as round outlined badges;
  - Quick links as six small tiles, three across; the pinned bar as a full-width strip
    with an icon and two lines.
- Cards now have the prototype's thin border instead of a shadow, on every portal page.
- Deadlines no longer add "(… UTC your time)" on a phone or browser set to UTC (a server's
  zone, never a family's); a phone in another real zone still gets its own time.
- `CLAUDE.md`: future screens, every phase, are built from and checked against the
  prototypes in `docs/reference/`.
- Portal files changed (`portal.css`, `portal.js`): `PORTAL_VERSION` needs its bump.

## 2026-11-05: Site Manager, Today and Families in the prototype's look

- On a site with the puppy portal, every Site Manager screen has the prototype's header:
  her logo (or monogram) in a white circle, her kennel's name, and "Site Manager" under
  it, with her account at the right. The screen's title moves onto the page, under the
  kennel's name; a sub-screen has a crumb back ("‹ Families"). Sites without the portal
  keep the header they had.
- **Today:** a deep-teal band with the date, how many go home today and this week, and
  Last from KennelOS; this week's pickups as pup cards (round photo, script name with a
  sex badge, the family, a calendar page with the pickup time, the vet visit's status,
  and Mark picked up on the day or Their screen before it); Needs you as small tiles with
  an icon, red for what's gone wrong and amber for what's late; and, as the prototype has
  them, **Vet visits** (round photos, status pills) beside **Recent activity**, moved here
  from Families.
- **Families:** the kennel's name and Families, with **Puppy families** and **Waitlist
  (n)** pills (`?show=waitlist`); each family a row with the puppy's round photo, its
  litter, going home and last active, its extras as tags, and a status pill (Active, Not
  invited, Invite to send, Invite not accepted, No puppy yet). The waitlist side lists the
  website's list in order, or says it's in KennelOS.
- App files changed (`app.css`): `APP_VERSION` needs its bump, held with the portal's.

## 2026-11-05: Her KennelOS waitlist policies on her website

- With a KennelOS waitlist linked, her **Policies** page shows her own policies and then
  **Waitlist policies** (eyebrow "Our waitlist", in the page's own heading look, the same
  expanders), read from the KennelOS feed like the waitlist page (`/policies` is live, so a
  change in KennelOS shows within minutes, no publish), with her upcoming closed dates under
  a business-days policy (KennelOS `docs/KennelOS_Waitlist_Policies_Plan.md` §4).
- KennelOS's application on her waitlist page: the "I've read the policies" box's word
  "policies" links to `/policies#waitlist-policies` (or KennelOS's list page while her
  Policies page is off).
- Site Manager › Policies: a read-only **Waitlist policies from KennelOS** card above her own,
  saying where to change them; her own list stays for everything beyond the waitlist.
- No site template file changed (drawn on the server), so no `ASSET_VERSION` bump.

## 2026-11-05: Getting your pup home, and badges on more pages

- New page **Getting your pup home** at `/pickup` (plan 3.5): her Pickup, Transport and Travel
  day sections (Site Manager › Pages), shown once one has words; her transport services as
  badges under her Transport words (logo, name, web address, code; a name tile without a picture).
  No prototype screen for it: built from the template's own parts.
- Products: `transport` (from a KennelOS transport account, or ticked by her; never on
  Recommended products), `website_url` (the address under its badge), `badge_places` (pages
  besides Home that show its badge, two per page). Every badge now shows its name and web
  address under the logo. Spots per page in `render/pages.js` `badgeRow`. Migration 0026.
- KennelOS bundle: new section `transport` (a product's `website`, `transport`), both
  KennelOS-owned.
- Tests: `pickup.test.js` (new); `kennelos`, `products` updated. Checked rendered at 390px and
  1280px.
- `site.css` changed: `ASSET_VERSION` bump asked, not done.

- Versions bumped (2026-11-05, owner's yes): `APP_VERSION` 14, `ASSET_VERSION` 16, `PORTAL_VERSION` 3, each with its fingerprint.

## 2026-11-05: kennelport.com front page and terms of use

- `worker/src/front.js`: kennelport.com's own pages, replacing the one-line placeholder. `/`
  is a short front page (the dark header, a hero tile, four tiles, three numbered steps,
  a footer), built from the portal prototype's components; there is no prototype of this
  page. `/terms` is the terms of use, as approved by the owner (KennelPort is run by
  KennelOS; any fee agreed separately; contact admin.kennelos@gmail.com). Its own CSP
  allows inline styles and our fonts; nothing in `_kp/m`, `_kp/t` or `_kp/f` changed.
- The terms are linked from the Site Manager's and the puppy portal's sign-in ("By signing
  in you agree…") and every site's footer ("Made with KennelPort · Terms").
- `/privacy`: KennelPort's privacy policy (15 sections, written from the migrations and
  `cleanup.js`), linked from the terms and the footer. Wording waiting for the owner's approval.

## 2026-11-05: site builder, the owner's additions

From the owner, added to [`plans/site-builder.md`](../plans/site-builder.md) as decisions 16 to 19,
with new sections and a new building order. Docs only; nothing built yet.

- Decision 16: the editor limits the owner only for function (unreadable text, dead
  links, pages too slow to load, files the site can't serve safely), never for looks;
  risky-but-working choices get a warning and are allowed.
- Decision 17: the owner adds her own blocks to any page: buttons, banners, dividers,
  spacers, collages, photos, videos, text over a photo. Colours only from the template's
  scheme, stored by name; fonts from an open-licence library served from the site.
  Every block gets background, padding, text size and fonts.
- Decision 18: the breeder can reword or switch off the owner's buttons and change an
  outside link, phone or email; she can't add buttons or change where an on-site link goes.
- Decision 19 (the owner's top priority): every line of wording the breeder reads in the
  Site Manager is the owner's, in one list set for every site and overridable per
  template and per site. `CLAUDE.md` now says new breeder-facing text goes in that list.
- Building order: 1 display and timing rules; 2 the breeder's instructions; 3 pages,
  blocks and the menu (was step 2, under way); 4 the owner's own blocks and styling;
  5 templates; 6 the family portal's build; 7 after the KennelOS review.
- Older lines brought in line: `plans/kennelport.md` 3.12 (no free look controls and
  "fixed" now mean for the breeder; the owner has them), `research/design-direction.md`
  section 2 (buttons) and Decided (scheme colours and the font library for the owner).

## 2026-11-05: site builder step 2 begins: the breeder's instructions

- `worker/src/manage/wording.js`: the list of wording the breeder reads in the Site
  Manager. Each line has a key, its screen, where it appears, its default (today's
  wording) and the names it can use ({kennel} everywhere; {n}, {date}, {role}, {one},
  {error} where the screen has them). `say(key)` gives the site's own wording, else every
  site's, else the default; `say.n()` picks the one or many line.
- Stored: every site's in a new `wording` table (added to `0028_demo.sql`, the branch's
  one migration); a site's own in its build (`wording`), so Reset to template will treat
  it as the owner's build. Per template comes with templates (step 5).
- The owner's editor: **Site Manager wording** (`/admin/wording`) and each site's **Her
  instructions** tab: grouped by screen, a search across all of it, each line with where
  it shows, today's wording and the names it can use; a line with a name it can't use is
  refused. No prototype screen for it: built from the prototype's lists, cards and pinned
  bar. Saved lines show straight away, no publish.
- In the list so far (521 lines): every form field's label and help (`forms.js` LABELS,
  SHARED, listed from there, so a field's hint she has none of today can be added), the
  choices in lists (ENUM_WORDS, not the schemes' names), the notes after a change (were
  `screens.js` NOTES), the lists' names, Add, New, Save and "None yet", and her home
  screen (`index.js` siteHome: status, buttons, tiles, set-up rows, Needs you).
- Not in it yet, each kept in one place to move next: each screen's own instructions and
  empty messages (`screens.js`, inline in each screen's function), the content model's
  error messages (`content/model.js`, `records.js`), Today with the family portal
  (`index.js` siteHome, the portal branch) and the portal's breeder screens
  (`portal/admin.js`).
- Her Site Manager reads exactly as before with no wording set (45 screens of the AK
  sample drawn before and after). Tests: `wording.test.js`.

## 2026-11-05: the breeder's instructions: each screen's own wording

- Each screen of the website side of the Site Manager now reads its own wording from
  the list (`manage/wording.js` SCREEN_LINES): headings, instructions, buttons, links,
  field labels of its own, empty messages, and the lines a screen picks between (linked
  to KennelOS or not, a list empty or not). New screens in the editor: Puppies at a
  glance, Litters, Dogs, Photos and albums, Waitlist and application, Your waitlist,
  Inbox, Reviews to approve, Publish, Share, KennelOS, Your site. The list now has 790
  lines.
- Moved by a script over `screens.js` and her home screen in `index.js`, each line keyed
  by its screen and first words; where a sentence runs round a link or bold words, each
  part is its own line ("Part of a line"). The owner's own links (her admin view, ops,
  This site's build) stay out of the list.
- Her screens read as before with no wording set (45 screens compared, entities read
  once; an apostrophe is now written `&#39;`, the same on screen). Four tests that looked
  for an apostrophe in the raw HTML now look for `&#39;`.
- Still in the code, each in one place: the sign-in, code, Notifications and offline
  screens (`index.js`, before a site is chosen); the lists' second lines and the
  application question kinds (`screens.js` LISTS, QUESTION_WORDS, BLOCK_TITLES, above
  `createScreens`); the match waiting card (`matchesWaiting`); the content model's error
  messages; the family portal's breeder screens (`portal/admin.js`).

## 2026-11-06: the breeder's instructions: signing in, her lists, the errors

- Signing in, the code screen, "No website here yet", her sites and Notifications read
  every site's wording (no site is chosen yet, so no {kennel}); if the wording table
  can't be read, today's. The offline screens and "That form didn't come from this
  app" stay out: they are about KennelPort itself.
- The line under each item in her lists, the kinds of application question, the Home
  blocks' names and on or off, and the "waiting for you to match" card (screens.js
  LISTS, matchesWaiting) are in the list.
- The errors from her forms' checks (content/model.js, records.js): a line per kind of
  check (`wording.js` ERRORS, matched by the check's words, so the checks stay as the
  import uses them), with {path} as today, {field} its label on her form, and what the
  check carries ({max}, {min}, {slug}, {place}). Today's wording reads exactly as before.
- Still in the code, each in one place: the errors of the waitlist (`waitlist.js`),
  photos (`photos.js`), videos (`embedStore.js`), badge codes (`badgeCode.js`), KennelOS
  linking (`kennelos/link.js`, `feed.js`) and sign-in (`auth.js`); the family portal's
  breeder screens (`portal/admin.js`).
- Her screens read as before with no wording set (51 screens compared, sign-in and
  Notifications among them).

## 2026-11-06: the breeder's instructions: the rest of her errors (step 2.3)

- The errors from her other screens are in the list (`wording.js` MESSAGES, read with
  `sayMessage(group, message, say)`): the waitlist (`waitlist.js`), photos (`photos.js`),
  videos and posts (`embeds.js`, `embedStore.js`), badge codes (`badgeCode.js`), the
  KennelOS feed (`feed.js`), link codes and matches (`kennelos/link.js`, `match.js`),
  Delete (`sites.js` closeSite), Publish (`publish.js`: too large, nothing to undo) and
  signing in (`auth.js`). As with the content model's errors, the code that finds the
  problem keeps today's words; each screen says the message in the owner's, matched by
  its words. 45 new lines; the list now has 931.
- Under Errors, each line says where it shows ("Photos: an empty file"); signing in's
  are on Signing in, with no {kennel}. Names from the message can be used ({max}, {kb},
  {known}...). The waitlist names a family's detail by {what} (and {What}, with a
  capital), and how it names each detail is its own line ("the name on the list").
  A badge code's "can't be copied (…)" carries the Photos error in the owner's words.
- Left out, as the plan says: KennelPort itself failing (sign-in or linking not set up,
  an email that couldn't be sent, "No such site"), the demo site's message, the owner's
  own screens (/ops, inviting), what KennelOS's app shows when it links (`link.js`
  ApiError) and the visitors' review form (`siteforms.js`).
- Still in the code: a few lines the manage app's own scripts write in the browser
  (`_kp/m/app.js`: "Copied", "Saving…", "Add Site Manager to your home screen first.";
  `_kp/m/photos.js`: "upload failed"). Moving them changes `_kp/m`, so it waits for a
  version bump. Then step 2.4: the family portal's breeder screens and Today.
- Today's wording reads exactly as before (each message checked against what the code
  throws). Tests: `wording.test.js` (two new). Nothing in `_kp/` changed: no version bump.

## 2026-11-06: site builder step 3.4: the menu editor

- The menu is the owner's setting (`content/blocks.js`: `menuOf`, `defaultMenu`,
  `withMenu`, `MENU_PLACES`). Groups in order, each with a name, a **Show it as a
  button** switch (today's Waitlist: its first link that shows) and a **Show it in
  the footer** switch; items are a page, a place on a page (Girls, Boys, Available,
  Upcoming litters, each showing only while it has something to show, as today), or an
  outside link (opens in a new tab). A page item can be set to show only while no
  other link to that page in its group shows (today's Puppies).
- Stored in the build (`build.menu`) only once it differs from today's; the snapshot
  carries it (`layout.menu`). No migration. `render/parts.js` `menuGroups` draws any
  menu; with none, today's, which reads exactly as before (413 pages of the demo, the
  AK sample and the AK sample with five added pages, on four dates, compared before and
  after: identical but for the application form's random question ids).
- The footer keeps today's three columns until the menu is changed; then it is a
  column per group shown in the footer, its pages and outside links (not places on a
  page), with How to pay and Family login in the last column.
- **Menu** in the admin view (`manage/builder.js` menuRoute), from the prototype's
  `aMenu`: each group a card with its name, move and remove; its links as movable rows
  with Settings (which group, a link's words and address, a place's own words, the
  only-while switch); the two switches; **Add to …** folded (a page, a place, or an
  outside link); New group; Back to today's menu; Not in the menu; the phone beside it
  shows each group as the site shows it today. Checked at 390px and 1280px. No new CSS,
  so no version bump.
- Pages she adds: New page and a page's own "In the menu under" list the menu's groups
  (not a button group); in a changed menu the page goes at the end of that group, and
  leaves the menu when removed. Pages lists where each sits.
- Functional checks only (decision 16): every group needs a name; an outside link needs
  words and an http(s) address. 8 groups, 20 links a group.
- The owner's screen: its wording stays in the code (her own screens are left out of
  the breeder's list).
- Tests: `menu.test.js` (new).

## 2026-11-06: site builder step 4: the owner's own blocks, and every block's look

- Six new blocks the owner adds to any page, as many as she likes (`content/blocks.js`
  BLOCK_TYPES kind `own`; drawn by `render/pages.js` ownBlock): **Banner** (heading, a
  line, a button; Accent background to start), **Button** (small, medium or large;
  filled or outline; left, centre or right), **Divider** (thin line, brass rule, the
  scheme's ornament; narrow, wide or full), **Spacer** (four heights), **Photo** (wide,
  tall, square or full width; which part to keep; a caption) and **Text over a photo**
  (heading, line and button; top, middle or bottom; left, centre or right; light,
  medium or dark shade).
- A button goes to a page (Home, any page, hers), an outside site (new tab), a call, a
  text or an email. A call, text or email uses Kennel details' phone or email, and
  follows it, unless a number or address is typed in. A button whose page is off, or
  with no number or address to use, hides itself (decision 16); a phone or email has to
  look like one; an outside link needs an https address.
- The breeder (block_switches, no migration: its content is JSON): switches each off
  (not a spacer), rewords it, changes an outside link, phone or email, and the photo and
  caption where the owner ticks "The breeder can change the photo". A link to a page is
  the owner's: her card says where it goes, and when it's hidden (decision 18). Her
  lines are in the wording list (`pages.own.*`, 17 lines; an error kind for a phone
  number). Her button's words post as `button_label`: the app fills any field named
  `label` with the device's name.
- **Every block's look** (the owner's, in each block's settings, Its look): a
  background from the scheme (Surface, Band, Accent, Footer colour, stored by name),
  space above and below, space at the sides, and on her own blocks a text size. On
  Accent or the footer colour the block's own colours swap to the scheme's matching
  ink (`site.css` `.kb`), so text stays readable (decision 16). A block with none set
  is drawn exactly as before: 413 pages compared, identical.
- The published snapshot carries the photos her blocks use. Checked at 390px and
  1280px (the site, the owner's settings, the breeder's cards). No prototype screen for
  these blocks: built from the template's band, buttons, ornament and photo boxes, and
  the manage app's cards, pills and photo picker.
- `site.css` changed: `ASSET_VERSION` bump asked, not done.
- Still to come in step 4: collages and videos as her blocks, links to a dog, litter or
  puppy, fonts and the font library, text size on the built-in blocks.
- Tests: `ownblocks.test.js` (new); `blocks.test.js` (Add a block lists them).

- Version bumped (2026-11-06, owner's yes): `ASSET_VERSION` 17, with its fingerprint.

## 2026-11-06: site builder steps 3.6 and 3.7: FAQ and badge spots anywhere, and what each profile page shows

- **Spots on any page (3.6).** A FAQ spot and a badge row fit any page, a page of the
  owner's included, once each (`content/blocks.js` `fits`, `SPOTS`); Add a block offers
  them where the page has none. A spot's place is its page's key (`model.js`
  `PLACE_KEYS`, or the owner's page id), so today's places carry over unchanged. A
  question's `places` and a product's `badge_places` now take any of those (a place
  that isn't a page is refused, as an error kind of its own, `error.place`).
- **The breeder's tick boxes follow the owner** (`spotPlaces`, `forms.js`
  `placeChoices`): on each FAQ question and each product she sees only the places that
  exist on her site, in the Pages order, then the profiles. With nothing changed, these
  are exactly today's `FAQ_PLACES` and `BADGE_PLACES`. A tick whose spot the owner takes
  away is kept, unseen, so it comes back with the spot. With Home's badge row removed,
  "Show as a badge on my home page" hides and keeps its value. Her FAQ list's "also on"
  line names only places that exist. A badge row that's full names the owner's page
  by its name.
- **What each profile page shows (3.7).** Every dog's, litter's and puppy's page, one
  setting per site (`build.profiles`, kept only once changed; the snapshot carries it
  as `layout.profiles`). A dog's and a puppy's page has three parts (under the
  breadcrumb, beside the photo, under the photo); each item can be switched off,
  ordered within its part, or moved to another; the name is always on; facts are
  switched and ordered. A litter's page: the pair and summary in its heading are
  switched; what sits under the heading is switched and ordered. A profile's FAQ spot
  and badge row are items (a dog's badge row is new, off to start), and turning one on
  or off adds or removes that profile from her tick boxes. A litter's link-card
  description keeps its summary when the owner hides it on the page.
- **The owner's screen**: Pages lists "Every dog, litter and puppy"; each opens its
  editor (`manage/builder.js` profileRoute): the card editor's ordered lists with a
  switch and a "where it sits" choice per item, the facts, Back to today's page, and
  the phone beside it sketching one of her records' pages. No prototype screen for it:
  built from the card editor's lists, switches and the pinned action bar. Checked at
  390px and 1280px, the breeder's FAQ form too. No new CSS, so no version bump.
- **Drawn as before**: 416 pages (the demo, the AK sample, and the AK sample with every
  question and badge placed everywhere, on four dates) compared before and after:
  identical but for whitespace between tags (the profile pages are now assembled from
  their items) and the application form's random question ids.
- Breeder wording: `lists.place.page` and `lists.place.none` in the list, and the
  place names as choices (`c.place.*`, forms.js ENUM_WORDS). The profile editor is the
  owner's screen: its wording stays in the code.
- Tests: `spots.test.js` and `profiles.test.js` (new); `blocks.test.js` (a badge row
  now fits Reviews), `kennelos.test.js` (two patterns allow a line break between the
  ask button and the surcharge row).

## 2026-11-06: which KennelOS puppies go on the site, by disposition

- The owner's ask: Up and coming was meant to carry only puppies she's keeping. Read in
  KennelOS: its bundle sends any puppy-status dog marked Show on website, whatever its
  disposition (`siteExport.js` `websiteDogs`); its own prompts only mark keepers, but the
  mark stays when a disposition changes, and the dog form's box can set it by hand.
- The bundle now takes a dog's `disposition` (text, so a new KennelOS disposition reads
  as undecided rather than refusing the bundle). **From KennelOS** has "Which puppy dogs
  go on the site": a switch per disposition (keeping, available, placed, health hold,
  undecided or none), all on to start (today's behaviour, decision 14). A puppy left out
  is treated as not sent: off the site, in her draft under Not on your site, back when
  it's sent again (`bundle.js` `pupShown`; `rules.landing.pup_*`). A bundle with no
  dispositions shows every puppy, as before.
- KennelOS sends `disposition` on puppy-status dogs only to a Worker whose answer lists
  the new `disposition` section (`SECTIONS`), so neither side has to ship first
  (KennelOS's same-day change, `siteExport.js` `dogEntry`).
- Tests: the linked sample's Pippa* carries `disposition: keeping`; `rules.test.js`
  ticks Keeping only and checks Pippa* leaves the site once she's Available.

## 2026-11-07: text block (one of the owner's own blocks)

- Add a block now offers **Text block** on any page, as many as she likes: a heading,
  a line under it and words (a blank line starts a new paragraph), set left, centred
  (the default) or right, with every block's look (`content/blocks.js` `words`). The
  site draws it with the template's own section head and prose (`.head`, `.lede`,
  `.prose`; `render/pages.js` `ownBlock`, `.own-words` in `site.css`), so no new look.
- The breeder can switch it off and reword the heading, the line and the words in her
  Site Manager (`block_switches` content gains `body`; no migration, it's JSON). Her
  wording for it is in the owner's list: `pages.own.words`, `pages.own.words_body`,
  `pages.own.words_body_hint`.
- Tests: `ownblocks.test.js` adds, words, aligns, rewords and switches one off.
- **Facts row (any page)**, also one of the owner's own blocks: up to four facts, each
  a value over a label, drawn exactly as Home's facts row on its own (`.facts`, no new
  CSS). It starts empty and hides until it has a fact. The breeder can switch it off
  and type her own facts (`block_switches` content `facts`, pairs); all empty follows
  the owner's. Her wording: `pages.own.factrow`, `pages.own.facts`,
  `pages.own.facts_hint`, `pages.own.fact_value`, `pages.own.fact_label`. Home's own
  facts row (her Home block) is unchanged.
- A **Photo** block (the owner's) can take a frame: the Home banner collage's soft mat,
  mat with a fine inner line, or leafy vine, in the scheme's colours (`PHOTO_FRAME`,
  `frame`; none to start, so photos already placed draw as before). A full-width photo
  stays unframed. The collage's `.box` and `.frame-*` rules carry over (`site.css`).
- Her two story photos, Home's "Photo and words" and the Our story page's, take the
  same frames: **Frame round the photo** on each (`photo_frame`, model.js `FRAMES`, no
  frame to start, so every site draws as before). Drawn as `.story-pic .box` in the
  story grid, shrunk and centred on a phone as the bare photo is. Her wording is in
  `forms.js` LABELS (`story.photo_frame`, `about.photo_frame`) and ENUM_WORDS
  (`photo_frame`), listed in the owner's list from there. Site template 19 (not out
  yet), fingerprint updated beside it.

## 2026-11-07: outside dogs, light cards' wording, Photo beside details

- **Outside dogs** (migration 0029): another kennel's dog, like a stud she bred to,
  kept in `dogs` with `outside`, `owner_name` and `owner_url`, so a litter's dam or
  sire, health results, photo tags and its page all work as for her own. Never in
  her groups or on Home; a Dog cards block's new "Outside dogs" filter lists them.
  An outside dog is never up and coming, for sale or co-owned (`outsideRules`). Its
  page says "Owned by" (a new dog-page fact). The litter form's dam and sire lists
  mark them. KennelOS doesn't send them (its `external_reference` dogs stay off).
- **Light cards** no longer say "Lives with a partner kennel" for every dog: their
  "where it lives" line shows only for a co-owned dog living away or an outside dog
  with an owner, and what a light card shows is now a list on the block like the
  flip card's. The words are the owner's site wording (`co_with`, `co_unnamed`,
  `outside_owner`, `outside_fact`).
- **Photo beside details**, a new Dog cards style: photo with the chosen items
  beside it, the bio and what follows it under both. No prototype screen has it;
  built from the dog page's and parent card's parts. Two across above 960px, else
  one wide card; a card stacks its photo on top when narrow (container query).
- **A line between cards** (block setting, flip and Photo beside details): a 4px
  accent bar between cards where they stack.
- Builder wording added to the owner's list: `doglist.outside`. Template v21.

## 2026-11-07: Publish sees every change

- Bug: the Publish screen's change list (`diff.js`) compared only kennel details,
  page wording, Home's built-in blocks and the records. Blocks and their look, the
  owner's added buttons and banners (and her words in them), colours and style, the
  menu, added pages, profile layouts, display rules and timing weren't compared, so
  it said "Nothing to publish" and hid the Publish button while Preview showed them.
- Now each of those has a line, and anything else in the snapshot that differs reads
  "Other changes to the site", so the Publish button can't be hidden again by a part
  the list doesn't name yet.
- Wording: the new lines live in `diff.js` with the existing ones (not yet in
  `manage/wording.js`), to move with them.

## 2026-11-08: collage block (one of the owner's own blocks)

- Add a block now offers **Collage** on any page, as many as she likes: Home's
  collage as a block. The owner picks a layout (the same pictures as the breeder's Home
  collage, `COLLAGE_LAYOUTS`), a frame (soft mat to start, as Home's; mat with a fine
  inner line, leafy vine, or none) and a photo for each box with which part to keep
  (`content/blocks.js` `collage`: `layout`, `frame`, `photos`, `focus`). Boxes the layout
  doesn't have are hidden, and shown as the layout changes (`app.js`, unchanged). An empty
  box is skipped, so the site uses a layout for that many photos (`collageLayout`), and it
  hides with none.
- The site draws it with Home's own collage (`render/pages.js` `collageOf`, now shared by
  Home's top block, which draws exactly as before), centred in `.own-collage`: at most
  760px wide on a computer (440px for one tall photo, 520px for two wide), full width on
  a phone. No prototype screen for a collage block: it's the prototype's Home collage,
  boxes and frames as they are.
- **The breeder can change the photos** (on to start, as the Photo block): her card shows
  a photo picker for each of the owner's boxes, in the owner's layout and frame, as her Home
  collage card does (`block_switches` content gains `photos` and `focus`; no migration,
  it's JSON). Her photos replace the owner's while she has chosen some. The published
  snapshot carries both.
- Her wording is in the owner's list: `pages.own.collage`, `pages.own.collage_photos`,
  `pages.own.no_photos`. The box labels ("Box 1", "which part to keep") are the Home
  collage's, still in `forms.js`.
- Checked at 390px and 1280px: the site (each layout and frame), the owner's settings,
  the breeder's card.
- `site.css` changed (`.own-collage`): `ASSET_VERSION` bump asked, not done.
- Still to come in step 4: videos as her blocks, links to a dog, litter or puppy, fonts
  and the font library, text size on the built-in blocks.
- Tests: `ownblocks.test.js` (a collage added, filled, a box emptied, the breeder's photos,
  not hers to change, switched off, cleaned); `blocks.test.js` (Add a block lists it).

## 2026-11-08: photo beside words (one of the owner's own blocks)

- Add a block now offers **Photo beside words** on any page: the prototype's story
  layout (`.story`, `.story-copy`, the framed `.story-pic`) as a block. A photo (which
  part to keep, a frame or none) beside a heading, words (a blank line starts a new
  paragraph) and an optional button to a page, an outside site, a call, a text or an
  email (`content/blocks.js` `beside`: `side`, `frame`, `focus`, `w.heading`, `w.body`,
  `w.label`, `link`). **Where it sits:** the photo on the left or the right on a computer;
  on a phone it always goes above the words, shrunk and centred as the story's is
  (`.story.pic-right` in `site.css`). With no photo the words take the width.
- **Words line up:** left (to start, as the story's), centred or right: the heading,
  words and button together, on a computer and a phone (`align`, `.story-copy.a-*`).
- The breeder can switch it off, reword the heading, words and button, change an outside
  link, phone or email, and change the photo where the owner lets her. Her wording:
  `pages.own.beside`.
- Checked at 390px and 1280px, left and right.
- Tests: `ownblocks.test.js` (words alone, the photo on the right framed, then left
  unframed, her words); `blocks.test.js` (Add a block lists it).

## 2026-11-08: headings show only as typed

- The owner's ask: no heading is required anywhere; if nothing is typed, nothing shows.
  Before, an empty heading box fell back to the site's own words ("Meet our dogs", "Our
  story", the owner's starting words on an added block), so emptying it changed nothing.
- Now a heading, the small label above it, the line under it and, on the owner's own
  blocks, the line, words, caption and button words show **as typed**. **Emptied, nothing
  shows.** Covered: every page's heading (eyebrow, heading, line under it), Home's blocks
  (the headline and script line, the story's label, heading and script word, the dogs',
  litters' and reviews' label, heading and line, the waitlist band's heading and line),
  the breeder's words on blocks the owner added, and a How it works step's heading (no
  longer required).
- **What's in the box is what shows.** Where she has never set one, her form now fills the
  box with the site's own words (the page's own heading, `blocks.js` `PAGE_HEADS`; Home's,
  `model.js` `HOME_WORDS`; her kennel's name for the headline; the owner's starting words).
  Saved unchanged, they stay unset and keep following the site's own (a renamed kennel,
  the owner's new wording). So no live site changes the day this ships: a heading she
  never touched still shows as before.
- How: those fields are marked `clear` (`model.js` `CLR`); an emptied one is stored as ""
  (no migration: it's JSON, and a step's `heading` column takes ""). The site uses `??`
  where it used `||` (`pagehead`, `head`, Home's blocks, `addedWords`), and draws no empty
  heading, page head or decorative sprigs (`head` and `pagehead` draw nothing when all
  three are empty). The owner's own settings already worked this way.
- Hints: "Leave it empty and nothing shows." on these fields (`forms.js` SHARED `eyebrow`,
  `heading`, `lede`; Home's `headline`, `script`; `steps.heading`) and on her added-block
  boxes (`pages.own.empty_none` in the owner's list).
- Not changed: a FAQ, policy or help expander still needs its heading (it's the line she
  taps to open it). The sub-headings that read "Leave empty for …" still fall back to
  their words when left empty: Getting your pup home's pickup, transport, travel and
  transport-services headings, Our dogs' co-owned heading, and the application form's
  heading.
- `site.css`: no change for this. Tests: `headings.test.js` (new).

## 2026-11-08: photo spots and the photo library window (decision 20, step 1)

- **Every place a photo goes now shows only the photo that's there** (`forms.js`
  `photoSlot`), at its box's shape where it has one, with **Replace** (or **Choose a
  photo** when empty) and **Remove**. No grid of photos and no upload button in the form.
  A spot that takes several (an album's photos) shows them small, with **Add or change
  photos** and how many. Every breeder form with a photo goes through it (a dog, puppy,
  partner kennel, review, extra, product, album, Kennel details' logo, Home's banner,
  collage boxes and story, Our story, the owner's blocks on her pages), and the owner's
  builder uses the same one for its photo, Photo beside words, Text over a photo and
  collage boxes (`builder.js` `photoChoice`). The form posts hidden inputs, so saving and
  tagging (`tagFromForm`, `_new_photos`) are as before.
- **The photo library window** (`photos.js`, `screens.js` `libraryHtml`, `GET
  /s/<site>/photos/library`): the same on every screen, the owner's too. **Upload new
  photos** at the top, the only upload there now; a new photo joins **Just added**, chosen,
  tagged as what's being edited. **Page photos | Profile photos**: a row per place a photo
  shows, named the way she'd say it ("Home: banner", "Our story", "Contact: Photo",
  "Album: Spring 2026", "Willow's profile", "Opal's profile (Gem litter)"), then **Not used
  anywhere**. The rows come from what's saved, shown or not (`photoPlaces.js`), so they need
  no tagging; a photo in two places is in both. Rows are folded, with counts; the ones
  holding the spot's photo start open; thumbnails load when a row opens. Tap a photo, then
  **Replace**; picking several, tick them ("3 chosen"), then **Use these photos**; more
  than the spot takes says so. **Cancel** changes nothing. The prototype's `dialog`, full
  screen on a phone with the pinned bar at the bottom.
- A collage box's spot takes its box's shape as the layout changes (`app.js`).
- Wording: `slot.*` and `library.*` in the owner's list; hints that said "No photo" or
  "Tick the photos" reworded (`forms.js` LABELS: Home's banner and story photo, an
  album's cover and photos).
- Checked in a browser at 390px and 1280px against a local copy (her Our story photo,
  an album of three, Home's collage boxes, the owner's Photo block on Contact): choose,
  replace, remove, upload in the window, save. No script errors.
- Still to come (plan, decision 20): the Photos screen's rows and select-first bar
  (step 2), whose own upload form and a litter's "Photos of this litter" card (each with
  its own upload) go then; albums' **Add from your photos** wording; the Gallery strip;
  the duplicate check.
- Manage app files changed (`app.js`, `photos.js`, `app.css`): `APP_VERSION` to bump
  before merging, as agreed. Tests: `phototags.test.js` (spots, the library's rows),
  `ownblocks.test.js` (a collage box is a spot).

## 2026-11-08: the Photos screen (decision 20, step 2)

- **Upload new photos** at the top, one button (the old form with its "Photos of" and
  description fields is gone: who's in a photo and its description are set from the bar).
- **Page photos | Profile photos** (two links, `?tab=profile`), then the same rows as the
  library window (`photoPlaces.js`), **folded by default**, each header with its name, a
  few small previews and its count. The old filter chips are gone.
- **Nothing under a photo until she chooses it.** Tapping photos ticks them (a photo in two
  rows is ticked in both); a **pinned bar** comes up at the bottom (above the tabs on a
  phone) with how many, **Show on a profile…** (a profile, then **Show on it** or **Take
  off it**: today's tags, worded by where they show), **Add to album…** (added after what
  the album has), **Description** (one photo only) and **Remove**. All post to `POST
  /s/<site>/photos/selected` (`act`: tag, untag, album, alt, remove).
- **Remove warns when a photo is in use** and lists where ("Our story"), with **Remove
  anyway** or **Keep them**; one not in use goes straight away. Removed, it comes off those
  places: the site already leaves removed photos out, and a photo spot now drops a removed
  photo, so the form doesn't post it (`photoSlot`, the owner's builder too).
- **A litter's "Photos of this litter" card** lost its own upload: it lists the photos on
  the litter's profile and links to the Photos screen's Profile photos.
- Kept as they were: an album's "Who's in these photos" card (`/photos/tag-many`), and the
  single-photo `/photos/<id>/tag|untag|alt|remove` actions.
- Wording: `pm.*` and five notes (`pick_none`, `onprofile`, `offprofile`, `inalbum`,
  `noalbum`) in the owner's list; thirteen lines the old screen used are gone from it.
- Checked in a browser at 390px and 1280px against a local copy: open a row, choose one
  and two, the profile panel, Show on it, remove one in use. No script errors.
- Manage app files changed: `APP_VERSION` to bump before merging, as agreed. Tests:
  `phototags.test.js` (the screen, the bar's actions, remove warns), `albums.test.js`.

## 2026-11-08: Gallery strip (one of the owner's own blocks)

- Add a block now offers **Gallery strip** on any page: one row of photos that **scrolls
  sideways**, drawn as an album page's gallery (`.gal-item`), so a tap opens the photo full
  size in the site's viewer (one viewer per page, added by `render/index.js` wherever a
  page has such photos).
- **The owner sets:** where the photos come from (**one of her albums**, its photos newest
  first, only while the album is on her site; or **photos you pick**, up to 24 in order,
  in the photo library window); **how many show** (4, 6, 8 or 12: in one row on a
  computer, twelve scrolling six at a time; on a phone two and a bit across, scrolling);
  a **border round the whole strip** (none to start, a thin line, the photo frames' soft
  mat, or the mat with a fine brass line); a link under it to the whole album (from an
  album, while the Photo albums page is on); a heading, a line and the link's words.
- **The breeder** can switch it off, reword its heading, line and link, and, where the
  owner lets her, pick her own photos, which replace the owner's (`block_switches`
  content `photos`, now up to 24; no migration).
- Her photos and the picked ones are a row of the photo library ("Our story: Gallery
  strip"); an album's are its album's row. Her wording: `pages.own.gallery`,
  `pages.own.gallery_photos`, `pages.own.album_link`, `library.block.gallery`.
- Checked at 390px and 1280px: six and twelve from an album, with the mat and the fine
  line; the viewer opens; no sideways scroll on the page.
- `site.css` changed (`.gallery.strip`, `.strip-frame`): `ASSET_VERSION` to bump before
  merging, as agreed. Tests: `ownblocks.test.js` (from an album, how many, the border,
  the link, picked photos, hers), `blocks.test.js`.

## 2026-11-08: versions bumped for this branch

- Manage app 17 (`APP_VERSION`, fingerprint `29bc1a90c35f691b`): the photo spots, the
  photo library window, the Photos screen.
- Site template 23 (`ASSET_VERSION`, fingerprint `2ba787891d1c26bb`): the collage block,
  Photo beside words (the photo on the right, its words lined up), the gallery strip and
  its border. Both were last released at 16 and 22 on `main`; bumped once, at the end,
  as the owner asked.

## 2026-11-09: docs reorganised; production is the only target

- Docs moved into `docs/plans/` (with `done/`), `docs/log/`, `docs/research/` and
  `docs/review/`, with lowercase names; entries up to 2026-11-04 archived in
  `docs/log/2026-10-09_to_11-04.md`. New `docs/STATUS.md` and `docs/CODE_MAP.md`; the
  reference README says where each screen is in the prototypes. Doc paths in migrations
  and in `worker/public/` CSS comments still use the old names (changing them would edit
  an applied migration or need a version bump).
- Production is live: every built migration applied, every key and service connected.
  Work deploys straight to production from `main`; staging still deploys but isn't used
  regularly. CLAUDE.md says so, with the 503 until **Apply pending** after a migration.

## 2026-11-09: the KennelOS link works on production

- The owner confirms the link works end to end with KennelOS on production: phase 4 is done.

## 2026-11-10: a review of the whole build; full backup and restore

- Review written: `docs/review/senior-review-2026-11.md`. Verdict: no rewrite and no
  reshaped data; the code is sound, the way it reaches production is what needs work.
  Two items left for the owner to decide (migrations applying themselves; a limit on
  wrong `/ops` tokens).
- **Full backup and restore** (`src/backup.js`, `src/ops/backup.js`,
  `public/_kp/o/backup.js`; format in `docs/plans/backup-format.md`). `/ops` → a site →
  Full backup makes one zip with every row of every table that holds the site's data
  and every file under `sites/<id>/` in R2; `/ops` → Restore a site from a full backup
  puts it back where that site isn't (never over a site that is there), and takes out
  what went in if it fails part way. The site is asked for and sent a piece at a time
  (a manifest, rows by the page, files one by one), so no request holds a whole site;
  the zip is made and read in the browser with the manage app's `zip.js`. Left out:
  sign-in state and caches (`SKIPPED` in `backup.js`). Families' addresses go out
  readable as well as encrypted (`_email`). A restore is marked by an R2 object under
  `_ops/restoring/`, so it needed no migration.
- A test now fails when a table with `site_id` is missing from `SITE_TABLES` or is
  neither in a backup nor named as left out. `tests/helpers/d1.js`: the stand-in
  bucket's list gives each object's size, as R2 does.
- `src/index.js`: an error nobody caught answers a plain "Something went wrong" page
  (JSON on the API) and logs the method, path and the error's stack, in place of
  Cloudflare's error screen. The stale "phase 0" note at its top is gone.
- `.github/workflows/test.yml`: `node --test` on every pull request and push.
- No migration; no file in the three versioned sets changed (`public/_kp/o/` is new and
  outside them), so no version bump. Wording: the two `/ops` pages are the owner's own
  screens, so their words are in `src/ops/backup.js`, not `manage/wording.js`.

## 2026-11-10: the KennelOS contract reviewed; a plan for raw data and shapeable blocks

- Reviewed what KennelOS sends (`shared/data/siteExport.js` there) against what this side
  takes and fixes (`kennelos/bundle.js`, `content/rules.js`, `render/parts.js`). This is
  the review `plans/site-builder.md` leaves for its step 7.
- Plan written: `docs/plans/kennelos-contract.md`. KennelOS sends facts and the site's
  rules shape them; her health order kept; "born, not yet open" as a status row; data
  blocks over any field (conditions, grouping, order) or hand-picked records; a Featured
  dog or pup block on a schedule; raw fields by section (disposition, litter status,
  titles, origin, health detail, account type, lineage, offspring, waitlist facts); tags.
  KennelOS's half is its `docs/KennelOS_Website_Contract_Plan.md`.
- Found while reviewing: KennelOS never sends a pup as `reserved`, though `rules.js`
  `STATUS_NOTES` and `plans/done/linked-sample.md` say it works it out. The plan's step 1
  corrects the note.
- Docs only: no code, no migration, no versioned file changed. Seven questions are open
  for the owner (the plan's last section).

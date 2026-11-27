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
- The owner's decision the same day: no `reserved` status. A pup with an open sale is
  marked Placed in KennelOS and follows the placed rules. The plan's step 1 takes
  `reserved` out of the bundle, the rules and the Site Manager, without rewriting stored
  pups.
- Docs only: no code, no migration, no versioned file changed. Six questions are open
  for the owner (the plan's last section).

## 2026-11-10: the KennelOS contract plan, corrected after review

- `docs/plans/kennelos-contract.md`: C1 notes that it sends null for a pup with no
  disposition, where the existing `disposition` section (marked puppy-status dogs) sends
  `undecided`. Taking `reserved` out now also covers `render/parts.js` `STATUS_TEXT`, the
  front page's "Mark a puppy reserved" (the owner's copy), and the two tests that name it.
  The placed form label and Part D's tag screen are marked breeder-facing, for the owner's
  wording. C4 sends only `imported` and `import_country` (on a dog and each C7 ancestor);
  import-descended is worked out here from the ancestors, so C4 goes with C7.
- Docs only: no code, no migration, no versioned file changed.

## 2026-11-10: KennelOS contract step 1 (health order, not yet open, no reserved)

- **Her health order stays** (`kennelos/bundle.js` `health`): with `rules.landing`
  `health_order: 'hers'` (the new default) an update leaves each result's `sort` alone and
  puts a new one after the dog's last; `'kennelos'` is the old behaviour. Set on the From
  KennelOS screen (`manage/builder.js`). Test in `rules.test.js`.
- **Born, not yet open** is a status row, `not_open` (`content/rules.js` `STATUS_ROWS`,
  `render/parts.js` `pupRuleKey`): an available pup in a born litter whose deposits don't
  open yet reads by it for words, pill, ribbon, price, ask, full registration and order.
  Default is today's result. `price.before` is gone: a site's changed one is carried to
  the row's words (`rulesFor`), and a snapshot from before reads as it did. No Show or
  Older switch on it (decided at publish, and it moves on by itself). `statusRule`,
  `puppyPriceText`, `regText` and `sortPuppies` take the litter and the day.
- **No `reserved`**: out of the bundle (KennelOS sending it is refused; it never did), the
  rules (five KennelOS rows), `model.js` `PUPPY_STATUSES` and the Site Manager's lists.
  Live data isn't rewritten: `pupStatus` reads a stored `reserved` as `placed` everywhere
  (rules, `statusText`, both status selects), and saving or importing one stores `placed`
  (`was` on the enum field, `model.js` `cleanValue`). A site's stored `reserved` rule is
  dropped. The AK sample, the linked sample and its notes, the demo's step notes and
  `done/linked-sample.md` now say placed. New `tests/no-reserved.test.js`.
- Not done: `front.js`'s "Mark a puppy reserved" waits on the owner's words. The Site
  Manager's "Placed (shows as Reserved)" label is unchanged (still right).
- No migration (the `puppies.status` CHECK still allows `reserved`, harmlessly). No file in
  the versioned sets changed, so no version bump. The admin screens changed (rules, From
  KennelOS) use their existing components; not yet checked side by side at 390px.

## 2026-11-11: the screens step 1 touched, split out of the big files

- Following `review/senior-review-2026-11.md` item 7 (split a screen at a time as it's
  touched). From `manage/builder.js`: the Pups screen to `manage/builder/rules.js`, From
  KennelOS (and its panel) to `manage/builder/kennelos.js`, and the form controls they
  share (`field`, `select`, `toggle`, `seg`, `back`, `svg`, `same`, `SPILL`) to
  `manage/builder/controls.js`. From `render/pages.js`: a puppy's page to
  `render/pages/puppy.js`; `profileFor`, `profileBody`, `shareRow` and `litterAlbums` are
  now exported from `pages.js` for it, and `render/index.js` routes to it. Unused imports
  dropped from both. Moved as they were: no change to what they draw.
- `manage/screens.js` left whole (step 1 changed three lines of its puppy list). Steps 2
  and 3 split the Dog cards block and the block screens as they reach them.
- No migration, no versioned file. Tests: all 359 pass unchanged.

## 2026-11-11: more split out of the five big files

- Further to the entry before, a few self-contained screens from each of the five files
  `review/senior-review-2026-11.md` item 7 names, none of them one the KennelOS contract
  plan's later steps change. Moved as they were; what they draw is unchanged.
  - `manage/builder.js` (1,172 → 1,031 lines): Every site, Timing, Formats and her
    instructions to `manage/builder/`; the nav and redirect to `builder/frame.js`.
  - `render/pages.js` (1,240 → 984): About, Reviews, Contact, Albums and Privacy each to
    `render/pages/` (routed by `render/index.js`); album lists, the visitor forms and
    KennelOS's application form to `pages/` too, used by `pages.js`. Imports run one way:
    `pages/*` may import the frame from `pages.js`; `pages.js` imports only the pieces.
  - `manage/screens.js` (1,436 → 1,248): Share, Inbox, Reviews to approve and Account to
    `manage/screens/`, each a factory given what `createScreens` holds (the code inside
    unchanged). An unused `ic` dropped; `FRESH_SIGN_IN_MS` now in `screens/parts.js`.
  - `portal/admin.js` (856 → 633): the templates, settings and Today/tabs lists to
    `portal/admin/`; `manage/index.js` imports `todayLists` from there.
  - `portal/family.js` (803 → 700): icons, the extended stay, and files and photos to
    `portal/family/`.
- Checked with a scope-aware pass (every name each file uses resolves; no import left
  unused) and the tests: all 359 pass unchanged. No migration, no versioned file.

## 2026-11-11: front page wording

- `front.js`: the Site Manager line now says "Update a puppy's status" (was "Mark a puppy
  reserved"; there is no reserved status). The owner's words. Not a cached file: no bump.

## 2026-11-11: Available Soon, and Available Now (the owner's request; live sites change)

- Puppies page: a new built-in section, `soon` ("Available soon" in the page editor), on
  by default between Older puppies and Coming up (`content/blocks.js` PAGE_PARTS and
  PAGE_DEFAULTS). Born litters whose deposits haven't opened go there, not under Coming
  up, and move to the litters taking deposits on the day (`render/pages.js` litters,
  `render/parts.js` `soonSection`). Its words are in the Wording screen: `soon_eyebrow`
  "Born", `soon_heading` "Available Soon", `soon_lede` "Deposits open on the date on each
  litter." (placeholders for the owner's words).
- Menu: a new place, `litters#soon` "Available Soon", in the default menu between
  Available and Upcoming litters; it shows while such a litter is on the page. The
  Available place now reads **Available Now**. Upcoming litters shows only for planned
  litters when the page has Available Soon.
- Every site changes at once on merge, the owner's changed ones too (her decision): a
  Puppies page or menu stored before this gets Available Soon when it's read
  (`content/blocks.js` `withSoonBlock`, `withSoonPlace`: before Coming up, after
  Available). Storing either again marks the build (`soon_page`, `soon_menu`), and from
  then on what she stored stands, so she can take it out. No stored build is rewritten.
- The builder's Puppies preview names the section by its heading. Tests: the linked
  sample and KennelOS tests now expect such litters under Available Soon; a new test in
  `rules.test.js`. No migration, no versioned file.

## 2026-11-11: Available now, Available soon (sentence case)

- The menu links and the section heading read "Available now" and "Available soon", in
  the menu's sentence case ("Upcoming litters"). The entries above say them in title case.

## 2026-11-11: no "Coming up" label on cards in Available soon

- `render/parts.js` `litterCard` takes `label: false`; the Available soon section uses it,
  so its litter cards carry no small label over the name (the section's heading says it).
  Elsewhere (a Litters block, Coming up on a page without the section) the label stays.

## 2026-11-11: plan: litters get what dogs get

- `plans/kennelos-contract.md`: the owner's answer to open question 6. Litter cards
  blocks get conditions, grouping and order in step 2 and picks in step 3, like dogs.
  Litter fields: the site's stage (available now, available soon…), each parent's dog
  fields (`dam.`, `sire.`, `a_parent.`), pups' colours and `standard_colors`. New for all
  three kinds: Leave out (`b.omit`), records a conditions block skips. Question 4 now asks
  where the standard colours list lives. Docs only.

## 2026-11-11: plan: colours by picker

- `plans/kennelos-contract.md` B1/B2: no standard-colours list or field. A colour
  condition uses a colour picker over the colours the site holds; "standard colours" is a
  block with those ticked (for a litter: every pup or any pup). Open question 4 answered.

## 2026-11-11: plan: the owner's answers

- `plans/kennelos-contract.md`: every open question answered. Import: a tick with Country
  of origin (cleared when unticked), import-descended within 3 generations, and her
  untick per dog (`import_descended_off`). Featured offspring is KennelPort's own: C8
  leaves the contract and becomes B6 (her list on a dog, picked or typed; `dog_offspring`
  in step 3's migration). Picks are hers. Her own tags are allowed. Docs only.

## 2026-11-12: migrations apply themselves; a limit on wrong /ops tokens

- The owner's decisions on `review/senior-review-2026-11.md` items 1 and 4.
- **Migrations apply themselves** (`src/gate.js`). When the code is newer than the
  database, the first request, cron run or `/ops` visit applies every pending migration
  with the same all-or-nothing runner as Apply pending, then checks again. Sites answer
  "Back soon" only while that runs or if it fails; a failed try isn't repeated by that
  isolate for a minute (`RETRY_MS`), and the error goes to the Worker's log. Drifted or
  orphaned migrations are never touched: those still wait for the owner. Two isolates
  trying at once is safe (each migration's batch carries its `_migrations` row, so the
  loser's batch fails whole). `gate.js` now differs from KennelOS's copy.
- `/ops` says a still-pending migration means one failed, and Apply pending reruns it and
  shows the error. CLAUDE.md, `plans/setup.md` and the code map say the new way.
- **Wrong `/ops` tokens** (`src/ops.js`): counted per hashed address in `rate_limits`;
  after 10 in an hour that address is refused (429) for the rest of the hour, right token
  or not. Signing in uses none up. With no tables yet, the token is checked unlimited, so
  a new database can still be reached.
- Recorded in STATUS: the portal's gate waits for a real litter (she has none); required
  checks before a merge are descoped.
- No migration, no versioned file. Tests: `worker.test.js` (applies by itself, a failing
  one, a drifted one), `ops.test.js` (opening ops applies, Apply pending reruns, the
  limit, no tables yet). All 364 pass.

## 2026-11-12: KennelOS contract step 2: blocks over any field

- `plans/kennelos-contract.md` B1, B2, B4. No migration, no versioned file (nothing under
  `public/_kp/` changed), so no bump.
- **One list of fields** (`content/fields.js`, new): for dogs, pups and litters, every
  field a block can use, with its name for the owner, its kind and how to read it.
  - Worked out for dogs: has titles, a title, age in years, has health results.
  - Pups: status as the site reads it (its status row, `not_open` included), and its
    litter's name, stage and birth date.
  - Litters: stage as the site shows it on the day (available now, available soon,
    older, planned, past), each parent's dog fields (`dam.`, `sire.`, `a_parent.`), and
    its pups' colours and count.
  - A parent that isn't a dog on the site is unknown, and no condition on it holds.
  - `tests/fields.test.js` fails when a field in `model.js` is in neither this list nor
    `NOT_FOR_BLOCKS`.
- **Conditions, order, groups** for Dog cards, Litter cards and the new **Pup cards**
  block (the Puppies page's flip cards, by conditions; `render/pages.js` `pupsBlock`).
  - `b.where` holds conditions, every one of which must hold. Text is compared with case
    and spacing evened out.
  - `b.order` is hers, or any field up or down, with records missing the value last.
  - `b.group` and `b.gw` give a heading per value (an `h3` in the template's `.head`, no
    new CSS), with the owner's words over the default. Sex groups read Girls and Boys.
  - A condition whose value isn't set yet is kept and leaves nothing out, because the
    editor works without script.
- **Old blocks** (B4): a stored `f` reads as the same conditions (`blocks.js`
  `recordsOf`, `legacyWhere`), and the old orders as fields.
  - A litter's `current` becomes every stage a born litter shows in, so results are
    identical: checked over 1,700 filter and order combinations against the old code.
  - An older snapshot's blocks draw the same. The new form is stored when a block is
    next saved; no stored build is rewritten.
- **The owner's block screen** (`manage/builder/records.js`, new; `builder.js` gets only
  the calls).
  - Conditions as rows: field (grouped: the litter, its pups, either parent, dam,
    sire), what it asks, and a value.
  - Ticks for "is one of". For a colour, the ticks are the colours the site holds (the
    colour picker).
  - Add a condition, Remove this condition, Order, Group by, and a heading over each group.
  - No prototype has this screen: it is built from the prototype's chips, select grid
    and movable rows. Checked in a browser at 390px and 1280px against a local copy (a
    colour ticked, grouped by sex, Pup cards added; the site's block drawn): no sideways
    scroll, no script errors.
- Her side: the Pup cards line in her page screen is in `manage/wording.js`
  (`pages.your_pups_from_kennelos`).
- **Not done:** the Dogs page's built-in Girls and boys and its `dogs#girls` and
  `dogs#boys` menu places as a group of a block, since that changes every live Dogs
  page. Leave out (`b.omit`) and picks are step 3.
- Tests: `fields.test.js` (new), plus `blocks.test.js` and `outside.test.js` moved to
  conditions (an editor test drives the colour picker and group headings through the
  form). All 374 pass.

## 2026-11-12: Life stage and Lives; a dog's sire and dam; offspring chained (migration 0030)

- The owner's decisions, the same day (`plans/kennelos-contract.md` B1 and B6, rewritten).
- **Life stage and Lives** (`content/fields.js`). For blocks, a dog's status plus its
  up-and-coming and for-sale flags are one field, **Life stage**: KennelOS's five in
  the site's words (`rules.js` DOG_PLACE_WORDS). Lives with a co-owner plus Outside dog
  are one field, **Lives**: With me, With a co-owner, Not my dog.
  - Both are worked out from the stored columns, so no data changes.
  - A new Dog cards block is Breeding dog and With me.
  - Old blocks (`blocks.js` `legacyWhere`) keep each stage and each place a dog like it
    would have been kept by its old filter. Identical over the same 1,700 combinations.
    An old filter that kept nothing reads as two conditions no dog meets.
  - Saving a dog keeps its flags to one life stage (`records.js` `stageRules`, also on
    import): only an active dog is up and coming or looking for a home, and looking for
    a home wins if both are ticked, as the Dogs page already shows it. A live dog
    stored with both changes only when next saved.
- **A dog's sire and dam** (migration 0030 adds `sire_id`, `dam_id`, `sire_name`,
  `dam_name` to `dogs`; additive, and it applies itself on deploy).
  - Each parent is a dog on the site or a typed name, as for a litter.
  - Site Manager dog form: a Parents section; a dog isn't offered as its own parent,
    and saving one is refused.
  - Import and export name parents by slug. Removing a dog clears it as a parent.
  - A parent not shown on the site is published as its name only, never linked.
- **The dog's page**: Sire and Dam in its facts (linked when on the site; on by default
  in `PROFILE_FACTS`). A new **Offspring** part (`offspring`, on by default, under the
  photo after Litters) shows its offspring on the site, then grand offspring and on, up
  to four generations (`render/parts.js` `descendantsOf`), as light cards a generation
  at a time. A featured offspring she sold is a Not my dog record with her dog as sire
  or dam; its own offspring chain on from it.
  - Today no dog has parents, so no live page changes until she sets some.
  - A site whose owner changed the dog page's items or facts gets the new ones only
    when she adds them.
- **Conditions on family**: `parent`, `descends_from` (four generations; a line that
  loops stops), `sire.call_name`, `dam.call_name`.
- Wording:
  - The site's new words are in the Wording screen's list (`rules.js` WORDS, Family):
    `sire_fact`, `dam_fact`, `offspring_1`…`offspring_4`.
  - The Site Manager's new labels and hints are in `forms.js` LABELS: sire_id, dam_id,
    sire_name, dam_name, and Outside dog reworded to include a sold puppy she features.
    They're the owner's to reword.
  - The "own parent" error is in `records.js` and `io.js` with the other content errors,
    which aren't in the wording list yet.
- Checked in a browser at 390px and 1280px (Boone's offspring, Ziva's facts, her
  Parents section, the Life stage and Lives ticks): no sideways scroll, no script errors.
- Tests: `dog-parents.test.js` (new); `fields.test.js` and `blocks.test.js` moved to
  the two fields. All 379 pass. No versioned file changed.

## 2026-11-12: her dog form's Life stage; the pedigree card and Make a dog record

- The owner's requests. No migration beyond this branch's 0030, no versioned file.
- **Life stage on her dog form** (`manage/screens/dogform.js`, new; `screens.js` only
  calls it): one select in place of the status select and the Up and coming and Looking
  for a home switches. It's read from the record and written back to `status`,
  `upcoming` and `for_sale` (`rules.js` DOG_PLACES). On a dog KennelOS sends, it is
  KennelOS's: shown as "from KennelOS" and kept whatever is sent, as status was. Its
  label and hint, and the choices' words, are in `forms.js` LABELS and ENUM_WORDS
  (`life_stage`), so they're in the owner's list. The old `status`, `upcoming`,
  `for_sale` labels and `status_dogs` choices went, since no form shows them.
- **Pedigree card** on a dog in her Site Manager: its sire and dam and theirs, four
  generations, from her dog records, nearest first ("Sire", "Sire's dam"…). A record
  links to its form.
  - A parent typed by name links to where it's typed and has **Make a dog record**
    (`records.js` `makeParentRecord`, POST `/s/<site>/dogs/<id>/make-sire|dam`). It
    makes a Not my dog record with that name and the parent's sex, links it in the
    name's place, and opens it with a note saying to change Not my dog if it was hers
    and add its own parents. Pressed again, nothing more is made.
  - No prototype screen: built from the Site Manager's card and list rows (as Not on
    your site). Its wording is in `manage/wording.js` (`dogform.*`, `note.made_parent`).
  - Checked at 390px and 1280px: no sideways scroll, no script errors; Make a dog
    record pressed in the browser.
- Tests: `dog-parents.test.js` (the form's Life stage, KennelOS's kept; the card, made
  and linked). All 381 pass.

## 2026-11-12: plan: the breeder controls individual records

- `plans/kennelos-contract.md` B3, B5 and step 3: the owner's decision. On every data
  block, her Site Manager shows the records the owner's settings display, each ticked,
  and she can untick any. A Featured block's records are always hers to pick, order
  and leave out. Her ticks and picks are her content, kept apart from the owner's
  build. Docs only.


## 2026-11-12: KennelOS contract step 3: her ticks and picks, the Featured block (migration 0031)

- `plans/kennelos-contract.md` B3 and B5, as the owner decided on 2026-11-12.
- **Migration 0031 `block_picks`** (additive: a new table). One row per site, page and
  block, holding her choice as JSON. It applies itself on deploy. It's in `sites.js`
  `SITE_TABLES`, so the full backup carries it.
  - **Not carried:** the `/ops` content JSON import and export (`content/io.js`).
    Import gives records new ids, so the ids in her picks wouldn't carry over.
- **Her ticks on every data block** (`content/picks.js`; applied in `render/parts.js`
  `blockRows`, which now takes the page key).
  - Dog cards, Litter cards and Pup cards: her new screen lists what the owner's
    settings show, each ticked. An untick is stored as `omit` and stays off.
  - A record that matches later comes in ticked.
  - A record that stops matching or leaves the site drops off her list. Its untick is
    forgotten the next time she saves; until then it leaves nothing out.
  - The owner's limit counts after her unticks.
- **Featured dog and Featured pup** (new block types `featured_dog`, `featured_pup`).
  - Records: hers to pick and order (`pick`), whatever the owner's conditions. Until
    she picks, it shows what the owner's conditions hold for, in the owner's order;
    "Let my website choose again" goes back to that.
  - A picked record that leaves the site drops out quietly and comes back if it
    returns. A picked pup stays featured after it's placed (her pick wins); a pup chosen
    by conditions drops out by itself.
  - Schedule (the owner's; `content/featured.js`): a day, a week or a month each; her
    order or a fixed shuffle seeded by site and block; a start date; one to three at
    once.
  - With no start date, weeks turn on a Monday and months on the 1st.
  - She can feature one on set dates (`fixed`, up to 6), which wins over the turn.
  - It turns over by itself: no Update website needed.
  - No groups (one at a time).
  - What shows under the name is the owner's list (`FEATURE_DOG_ITEMS`,
    `FEATURE_PUP_ITEMS`). Its button, "Meet {name}", is in the Wording screen
    (`featured_meet`).
  - **No prototype screen:** drawn as the Home story's photo-beside-words (`.story`),
    the photo in a soft mat, under the block's heading. With two or three at once,
    every other one has its photo on the right on a computer.
  - **Not done: the share row** that shares the featured record's own page (B5). It
    needs a change to the template's `site.js`, so an `ASSET_VERSION` bump; that waits
    for the owner. The "Meet {name}" button goes to the record's page, which has its own
    share row.
- **Her screen** (`manage/screens/picks.js`, new): `/s/<site>/blocks/<page>/<block>/records`.
  - The button to it is on each data block's card in Pages and wording, and on Home's
    Dog cards and Litter cards screens, with "{n} left out by you".
  - Featured: ticks, ↑ ↓ order (a move saves the ticks with it), set dates, and who
    shows today.
  - No prototype screen: built from her app's switch list and the list rows with ↑ ↓,
    so no app CSS changed.
  - Its wording is in `manage/wording.js` (`picks.*`, `note.picked`).
- **The owner's view:** the Featured block's settings: its conditions as the starting
  set, Schedule, What it shows, and who shows today. Every data block says what she
  left out or picked. The page preview draws Featured.
- **Split out** (`review/senior-review-2026-11.md` item 7), moved unchanged:
  - her Pages and Home screens: `screens.js` → `manage/screens/pages.js` (−27 KB);
  - the site's data blocks: `render/pages.js` → `render/pages/blocks.js`;
  - a data block's settings: `builder.js` → `manage/builder/blocks.js`, with the shared
    controls moved to `builder/controls.js`.
- Checked in a browser at 390px and 1280px: her picking screens (Dog cards and
  Featured), the site's Featured block with photos, and the owner's settings. No
  sideways scroll, no script errors.
- No versioned file changed (`public/_kp/` untouched).
- Tests: `picks.test.js` (new: the rotation, picks, her screens end to end, the
  snapshot); `blocks.test.js` gains the owner's Featured settings. All 387 pass.

## 2026-11-13: her Featured order as a grid

- The owner's request: on a Featured block's choosing screen, ↑ and ↓ didn't line up
  from row to row (each sat right after the name, and a row with one move was shorter).
- Each row is now a grid (`app.css` `.picks`, `.pickrow`): the tick and name, then ↑ and
  ↓ in two fixed 44px columns, with an empty cell where a row has no move.
  `manage/screens/picks.js` draws it.
- `public/_kp/m/app.css` changed: it needs an `APP_VERSION` bump (17 is on `main`), which
  waits for the owner's yes. Until then `versions.test.js` fails, as expected.
- Checked at 390px and 1280px: every ↑ at one x and every ↓ at the next, no sideways
  scroll, no script errors.

## 2026-11-13: her lists' arrows in their own columns; Girls and boys as a block (B4)

- **Up and down arrows** (the owner's request: find any not lined up). Three lists in her
  Site Manager drew ↑ and ↓ only where there was a move, so the first and last rows'
  buttons (and the rows' widths) shifted:
  - her lists (dogs, litters, extras, FAQ…);
  - videos and posts;
  - her waitlist.

  Each now draws an empty cell where a row has no move. `app.css` `.item .order` and
  `.wl-entry .order` are two fixed 44px columns, and a list of one hides them.
  - The owner's admin rows were already lined up: they always draw both buttons and
    grey out the one that can't be used.
  - Checked at 390px and 1280px: every ↑ at one x and every ↓ at the next.
- **Girls and boys** (`plans/kennelos-contract.md` B2 and B4, the leftover from step 2):
  - The Dogs page's built-in part is now a Dog cards block (`blocks.js` `DOGS_ALL`): breeding
    dogs with her, in her order, grouped by sex, shown with a new choice, **Its groups:
    a Show filter** (`gshow: 'filter'`). That's one grid of flip cards with a Show select
    built from the groups, as the page always had. Other blocks keep a heading per group.
  - Only the first filter block on a page is drawn as one: the template's script filters
    one grid. The cards keep the attribute name `data-sex` (now any group's key), so the
    template's script didn't change and no `ASSET_VERSION` bump is needed.
  - Old builds and older snapshots holding the built-in part `all` read as the block
    (`pageBlocks`, `render/parts.js` `filterBlockOf`).
  - **Checked against `main`'s code:** the Dogs page and Home rendered for 9 sites (the
    sample, girls only, no breeding dogs; each with no build, the part moved, the part
    removed). 16 of 18 pages are byte-identical.
  - The two that differ are a fix. Where the owner removed Girls and boys, the menu's
    Girls and Boys used to show and open nothing; now they hide.
  - The menu's `dogs#girls` and `dogs#boys` show while that block has both sexes.
  - Being a block, it's hers like any other: her Dogs page screen has its card (Show it,
    words, and Choose which show to untick dogs).
  - The owner's view: Girls and boys is no longer offered as a built-in to put back. Add
    a Dog cards block grouped by sex as a Show filter instead. The page preview draws the
    filter's choices.
- `public/_kp/m/app.css` changed (this entry and the one before), so an `APP_VERSION`
  bump waits for the owner's yes; `versions.test.js` fails until then.
- Tests: `blocks.test.js` (the Dogs page editor with the block; old builds and older
  snapshots). 387 pass; the version test fails as expected.

## 2026-11-13: menu links to any group of a block; the bumps

- The owner's request: Girls and Boys' siblings, a menu link for any group of any
  grouped block.
- **A new menu item, a group of a block** (`{ type: 'group', page, block, key, text? }`;
  `blocks.js` `cleanItem`).
  - The Menu screen's Add offers every group of every grouped data block on every page,
    for example "Group: Retired (All our dogs, Every dog)" (`manage/builder/menugroups.js`,
    new; `builder.js` only calls it).
  - A field with set values (a life stage, a sex) offers every value, so a group that's
    empty today can be placed; it hides until it has something.
  - The Dogs page's Girls and boys isn't offered: it has its places.
  - Its words: the group's name (the owner's heading for it, or the Girls and Boys
    words), or the owner's own, like a place's.
- **On the site** (`render/parts.js` `groupLink`), the link shows while its block is on
  and the group has anything in it (after her ticks and the block's limit). It hides when
  the page is off, the block is gone or no longer grouped (the editor says so), or the
  group is empty.
  - It goes to `<page>#g-<block>-<value>`.
  - A block with a heading per group: each heading carries that id, so the link lands
    on it.
  - A Show filter block: each choice carries it as `data-hash`, and the template's script
    (`public/_kp/t/ak/site.js`) chooses it from the address, on load and on a hash
    change.
  - `#girls` and `#boys` work as before. Checked in a browser: `#girls`, `#boys`,
    `#g-all-female`, `#g-all-male`, and a hash change on the page, with no script errors.
- Live HTML gains only attributes: an id on each group heading and a `data-hash` on each
  Show filter choice. Nothing changes visibly.
- **Bumps, with the owner's yes:**
  - `APP_VERSION` 17 → 18, for the Site Manager's arrows (`app.css`);
  - `ASSET_VERSION` 23 → 24, for the template's filter script;
  - both fingerprints updated (`scripts/fingerprint.mjs`).
- Tests: `menu.test.js` (Add offers the groups; shown, hidden, reworded, the block gone; a
  Show filter's group). `blocks.test.js` and `fields.test.js` follow the new attributes.
  All 390 pass.

## 2026-11-13: Plan for seeing a family's portal as they see it

- New plan, [`plans/done/family-view.md`](../plans/done/family-view.md): a **See their portal**
  button on her family screen opens that family's portal on her site's address,
  read-only and drawn live from the records, with a band saying so. Handed over once
  with a signed link (as the status page's one tap), then a signed view cookie for an
  hour; every write refused on the server; Messages' read marks, program-click counts
  and the family's activity date left untouched.
- No migration and no version bump planned. Four decisions wait for the owner (plan
  section 5). Nothing built yet.

## 2026-11-13: seeing a family's portal as they see it, built

- The owner's answers (plan section 5): everyone with the site; nothing recorded; reload
  is live enough; an hour.
- `portal/view.js` (new): the view link (signed, once only through `portal_handoffs`, 2
  minutes) and the view cookie `kp_family_view` (signed, not stored, an hour, Path=/family).
  Each request checks again that her account still has the site (`site_users`) and the
  family is active.
- Her family screen (`portal/admin.js`): **See their portal**, a link (the Site Manager's
  `form-action 'self'` would block a form's redirect to her site), opening in a new tab.
  `handlePortalAdmin` now gets `user` and `say`.
- `portal/family.js`: `/family/view` and `/family/view/exit`; the view cookie comes before
  the family's own; every POST under a view (sign-in included) goes back to the page it
  came from with "Nothing was changed"; the band at the top of `<main>` in the portal's
  `.note`, with Refresh and Stop viewing in `.two`; "(viewing)" in the title. Messages
  aren't marked read, and `family/files.js` records no program click, while viewing.
  The family's session and activity date are never touched.
- Wording: a new **A family's portal, as they see it** group in `manage/wording.js`
  (`familyview.*`). No prototype screen for it: built from the prototype's note, `.two`
  and line buttons; checked at 390px and 1200px.
- No migration. No change to `public/_kp/f/`, `m/` or `t/`: no version bump.
- Tests: `portal-view.test.js` (the page matches the family's own apart from the band;
  once-only link, other site, changed cookie; every POST changes no row; no read marks,
  clicks, activity or sessions; removed from the site or family deleted ends it; files
  stay the family's own; her own domain). All 395 pass.

## 2026-11-13: the same family twice, Delete now, and giving a deleted family back

What happened on production: she typed a family in, then signed the contract in KennelOS.
The family linked by address, but her typed placement didn't (it named no puppy, or not
KennelOS's), so the feed added a second placement. The list showed the family twice
(`listFamilies` gives a row per open placement), and deleting "the typed one" deleted the
family. The owner's decisions: merge duplicates, allow deleting sooner than 30 days, and
let her give a deleted family back.

- **Linking** (`portal/feed.js` `upsertPlacement`): after the same-puppy match, a
  family's only open typed placement is linked whatever puppy she chose, if the family
  has no open KennelOS placement yet. Her filled fields stay hers; KennelOS's differing
  puppy waits as a suggestion.
- **Merge** (`portal/merge.js`, new): `mergePlacement` folds a typed placement into the
  family's KennelOS one (her `PLACEMENT_FIELDS` win, KennelOS's differing value becomes a
  suggestion; pickup, vet booking, proof, contract and loss fill KennelOS's blanks; files,
  shots less duplicates, checklist and timeline items, extras, photos, the reminder log,
  history move; ticks and programs keep the later row). `mergeFamily` folds a typed family
  into a KennelOS one (addresses, sessions, messages, logs, clicks, placements, history;
  her name wins), then its placements if there's one of each. One batch each.
  Her screens: the list shows each family once, with all their open pups named ("Opal
  and Ruby"; it gave a row per open placement), tagged **Twice: merge** only when one
  was typed in and one is from KennelOS; the family screen
  has **Two puppy records for this family** with **Merge them**, and **The same family
  twice?** with a list of the other kind.
- **Delete now** (`account.deleteNow`): under Recently deleted, typed confirmation; final
  as the daily cleanup would make it.
- **Giving back** (`account.deletedForGood`, `giveBack`): **Deleted for good** on Puppy
  families lists family tombstones (not erased families) with **Let KennelOS send them
  again**, which lifts the family's tombstones and its placements' and shots'. A shot she
  removed by itself stays removed. KennelOS's next send brings them back as a new family.
- **Migration 0032** (`tombstone_labels`): `portal_tombstones.label` (the family's name and
  puppy, no address: the test now checks only that no address is kept) and
  `family_kennelos_id`. Additive. Older tombstones are grouped by their shared `deleted_at`.
- Wording: new group **Puppy families: the same family twice, and deleted families**
  (`familydupes.*`) in `manage/wording.js`. The four new notes (merged, familymerged,
  gonenow, givenback) are in `portal/admin/parts.js` NOTES with the portal's other notes,
  to move with step 2.4. No prototype screen: built from the existing card, kv, tag and
  details pieces; checked at 390px and 1280px.
- No change to `public/_kp/`: no version bump.
- Not here: KennelOS sending a family again without a change. That's in KennelOS.
- Tests: six new in `portal-feed.test.js`. All 401 pass.

## 2026-11-13: redeploy for PR #54

- PR #54 (the same family twice, Delete now, giving a family back; migration 0032)
  merged to `main` but Workers Builds made no deployment for it: production stayed on
  #53. Nothing in the code stopped it (`wrangler deploy --dry-run --env production`
  bundles cleanly; all 401 tests pass). This entry is the change for a fresh merge to
  start a new build. If a build of #54 fails again, its log is in the Worker's build
  history, not in its Deployments list.

## 2026-11-13: How it works steps keep her wording and order

- Her edits to a KennelOS step were dropped and every Update website rewrote them: the
  heading and body were KennelOS's (`OWNED.steps`), shown as "from KennelOS, change it
  there", though KennelOS has nowhere to change them (it words them from her waitlist
  settings). Her own steps were also moved after KennelOS's on every update.
- `kennelos/bundle.js`: KennelOS's steps only start a step. The first time, KennelOS's go
  first and hers follow, as before; after that each step's heading, body and place are
  hers. A step KennelOS adds later goes last; one it stops sending leaves. `OWNED.steps`
  is empty, and `manage/screens.js` `lockedFor` treats a record with nothing of
  KennelOS's on it as hers (no "comes from KennelOS" notice).
- Not changed: a KennelOS step she removes comes back, last, on the next update (no
  record of a removal is kept). Wording edits made before this were never saved.
- Docs: `plans/kennelport.md` (who owns which field), `plans/kennelos-contract.md` C9.
- No change to `public/_kp/`: no version bump. No migration.
- Tests: one new in `kennelos.test.js`. All 402 pass.

## 2026-11-13: KennelOS contract step 4, the small raw fields

- `kennelos/bundle.js`: four new sections in `SECTIONS`, `pup_disposition`,
  `litter_status`, `health_detail`, `account_type` (KennelOS sends them since its PR
  #210). Each value is kept as sent (migration **0033** `kennelos_raw`: four new columns,
  additive). A key an older KennelOS doesn't send leaves what's stored (`cleanShape`
  notes which keys came).
- C1: a litter pup with a disposition gets its status from the owner's rule
  (`rules.landing.pupst_*`, today's map by default); none set or unknown reads undecided.
- C6: a product with an account type goes where the owner's rule says
  (`landing.acct_*`: Recommended products or Getting your pup home; transport to the
  latter by default) and a new one starts in that type's group (`acct_group_*`, empty
  by default). Both on the owner's From KennelOS screen (`manage/builder/kennelos.js`),
  built from that screen's existing list, select and text pieces.
- `content/fields.js`: a pup's Disposition in KennelOS, a litter's Status in KennelOS
  (and `litter.kennelos_status` on a pup), a dog's Kinds of health test shown (and so a
  litter's parents').
- Not yet: the litter card's eyebrow by KennelOS status (C2) and health results grouped
  by kind on a dog's page (C5).
- Linked sample: every bundle gains the four values; results are unchanged.
- Server-rendered only: no change to `public/_kp/`, no version bump.
- **This branch adds migration 0033**: it applies by itself on the first request after
  the merge deploys.
- Tests: one new in `kennelos.test.js`, one in `fields.test.js`. All 404 pass.

## 2026-11-13: KennelOS contract step 4, its two display rules

- C2: a litter card's small line by the litter's status in KennelOS. Owner's Wording
  screen, new group "Litter cards, by status in KennelOS" (`words.litter_kos_*`, empty
  by default and allowed empty: the usual line). A planned litter's own plan label
  still comes first. `render/parts.js` `litterCard`.
- C5: a dog's health results grouped by kind on its page. Owner's Dogs screen, "A dog's
  health results", Group them by kind (`rules.dogs.health_groups`, off by default), and
  a new words group "Health results": `health_heading` (was the fixed "Health testing";
  a result with no type goes under it), `health_genetic`, `health_ofa`, `health_breed`.
  `render/pages.js` `healthLists`, built from the page's existing eyebrow and tests list.
  Flip cards keep one list. Checked at 390px.
- Defaults draw every live site as before. Server-rendered only: no version bump; no
  migration beyond this branch's 0033.
- Tests: one new in `fields.test.js`. All 405 pass.

## 2026-11-13: health results by kind, her switch

- The owner's decision: the breeder turns grouping on and off for her whole site. Her
  **Group health results by kind** on Kennel details (`SITE_FIELDS.group_health`,
  `sites.group_health`, added to this branch's migration 0033; off by default). The
  owner's Dogs switch from the entry above is gone (never released); the headings stay
  the owner's words (Dogs, Health results).
- Kennel details' switches heading is now "On your website", like the other forms',
  since it holds more than prices.
- Breeder-facing wording, new and mine for now: the switch's label and hint in
  `manage/forms.js` LABELS ("Group health results by kind"; "On each dog's page:
  genetic tests, OFA / PennHIP and other tests each under their own heading, sorted by
  KennelOS. Off: one list."), for the owner to reword. Checked at 390px and 1280px.
- Tests: one new in `editing.test.js`; `fields.test.js` reads her switch. All 406 pass.

## 2026-11-13: health result headings' order

- The owner's Dogs screen: "Health result headings' order", four places (First to
  Fourth), each a choice of the four headings (`rules.dogs.health_kind_1`…`_4`; default
  Health testing, Genetic, OFA / PennHIP, Breed-specific, as before). Saving with one
  heading in two places is refused. The choices read in the owner's current words.
- `render/pages.js` `healthLists` follows it; `content/rules.js` `HEALTH_KINDS`,
  `HEALTH_KIND_PLACES`. Within a heading the results keep her order.
- Built from the screen's existing card, select and hint pieces; checked at 390px and
  1280px. No version bump, no new migration.
- Tests: `fields.test.js` (the order, and a repeated heading refused). All 406 pass.

## 2026-11-13: KennelOS contract step 5, titles as rows and tags

- C3 (`kennelos/bundle.js`): `titles_detail` in `SECTIONS`. A dog's titles may come as
  `{ abbr, organization, date }` (`cleanTitles`): kept as rows in `dog_titles` (new table,
  added to this branch's migration 0033; in `SITE_TABLES`, so backups and site deletes
  carry it; removed with its dog, `records.js`, `io.js`). The titles line stays their
  abbreviations. In a bundle where any dog's titles are rows, a dog's empty list clears.
  The snapshot gives each dog `title_rows`; field: A title's organization.
- D: `content/tags.js` (new): tags by rule (words, pill, Dogs or Pups, conditions) and
  tags the breeder may choose, kept in the build (`build.tags`). The owner's **Tags**
  screen (`manage/builder/tags.js`, new; in the build tools' nav), built from the block
  screen's condition rows (`records.js` `conditionRows`, split out of
  `recordsSettings`) and the builder's cards and selects; no prototype screen. Her ticks
  on a dog's form (`dogs.tags`, ids, in migration 0033; `forms.js` item `tag`, shown only
  when the owner allows some). `fields.js` `tagsOf` and the field Tags (dogs, pups, a
  litter's parents); a card item Tags on dog cards, light cards and Featured blocks,
  drawn as the site's `.status` pills: no stylesheet change, no version bump.
- Breeder-facing wording, mine for now (the owner to reword): her dog form's Tags field,
  label "Tags", hint "Shown as small labels on this dog's cards, where your site shows
  them." (`forms.js` LABELS).
- Checked the Tags screen at 390px and 1280px, and her dog form at 390px.
- Tests: `tags.test.js` (new, two), one in `kennelos.test.js`; the linked sample's dogs
  send titles as rows. All 409 pass.

## 2026-11-13: pill styles, and pill colours from the scheme

- The owner's decisions: every pill on a breeder's site (a pup's status on cards, its
  page and a Featured block; tags; a dog's "Looking for a home") is drawn in one style
  for the site, and each pill's colour is one of the site's scheme's colours, by name,
  in place of Green and Brass outline.
- Styles (`content/model.js` `PILL_STYLES`): Dot (today's), Ribbon tag, Outlined capsule,
  Soft chip, Wavy ribbon, Wavy ribbon satin. `sites.pill_style` (added to this branch's
  migration 0033, `dot` by default): the owner's Formats screen (a new Pills card,
  saved to the site, not the build), and her Kennel details (Look). The page carries
  `data-pills` (`render/layout.js`); `site.css` draws each, the wavy ones with a
  repeating SVG mask and forked ends.
- Colours (`PILL_KEYS`: accent, brass, ok, held, ink, muted): `render/schemes.js`
  `PILL_COLOURS` names each scheme's (Lawn: Moss, Brass, Fern, Toffee, Ink, Stone; and
  so on), leaving out a colour that repeats one before it (Midnight's brass is its
  accent). Pills draw as `.status.c-<key>`; a stored `avail`/`res` reads as ok/held
  (`pillKey`, `rules.js` `carried`), so every site looks as it did. Chosen on the
  owner's Pups screen (each status row), Tags (each tag) and Dogs (the new "Looking for
  a home" pill colour, `rules.dogs.sale_pill`); the build tools show a colour as an SVG
  dot, since they take no inline styles. The colour names are mine, for the owner to
  approve.
- Breeder-facing wording, mine for now: Kennel details' "Pill style" label and hint
  (`forms.js` LABELS) and the style names (`PILL_STYLES`).
- `public/_kp/t/ak/site.css` changed: `ASSET_VERSION` (24, released) needs a bump; asked.
- Checked each style on a pup card at 390px.
- Tests: `pills.test.js` (new, two); class names updated in `editing`, `rules`, `tags`
  tests. All pass bar `versions.test.js`, which waits on the bump.

## 2026-11-13: ASSET_VERSION 25

- The owner said yes: `ASSET_VERSION` 24 → 25 for the pill styles in `site.css`, with
  `TEMPLATE_FILES` from `node worker/scripts/fingerprint.mjs`. All 411 tests pass.

## 2026-11-14: KennelOS contract step 6, origin and lineage

- `kennelos/bundle.js`: `origin` and `lineage` in `SECTIONS`. A dog takes `imported`,
  `import_country` (origin), `breed`, `sire_id`, `dam_id` and `ancestors` (lineage: up to
  four generations by place, `sire`, `sire.dam`…, each named, with titles and, with
  origin, its own `imported` and `import_country`). Checked: each place once, four deep
  at most, a call name or registered name. Migration **0034** `origin_lineage`: seven
  new `dogs` columns (additive); the ancestors are kept as JSON on the dog.
- Origin is KennelOS's once sent (`kennelos_origin`); until then it's hers on the dog
  form. Lineage lands after every dog of the bundle (`Writer.lineage`, also after a
  confirmed or declined match), so a parent sent after its child still links. A parent
  KennelOS names fills the dog's sire or dam (a dog on the site, else the name) and is
  locked; one it doesn't name stays hers (`ownedLineage`). An older KennelOS's bundle
  leaves all of it as stored.
- `content/fields.js`: `pedigreeOf` (KennelOS's ancestors per side where sent, else her
  records, carrying a site dog's own KennelOS ancestors up its line), `importedAncestors`,
  `originOf`. Fields: Import, Country of origin, Import-descended, Breed (and each for a
  litter's parents). The import tags are tag rules on these fields (Part D).
- The owner's Dogs screen: Import-descended, how far back an imported ancestor counts
  (`rules.dogs.import_generations`, 3 by default); and a words group "Origin and
  pedigree" (Origin, Import, Import Ancestry, Pedigree, Parents…Great-great-grandparents).
- The Origin card item (dog, light and Featured cards; on none by default): "Import •
  Hungary", or "Import Ancestry • Hungary, Romania" (the countries nearest first), as a
  details row. The **Pedigree** part of a dog's page (dog profile, off by default): a
  generation at a time in the site's grid, each by place with its titles, linked when a
  dog on the site. No prototype screen: built from the page's eyebrows and `tests` rows.
  Checked at 390px and 1280px.
- Her dog form: an Origin group (Country of origin, Breed) and the switches Imported and
  Leave out of Import-descended. Her Pedigree card shows KennelOS's ancestors and **Make
  a dog record** for one known by name (`records.js` `makeAncestorRecord`: a Not my dog
  record with its name, titles, origin and its own parents' names, keeping the
  ancestor's KennelOS id in `kennelos_ancestor_id` so every pedigree links to it).
  Checked at 390px.
- Breeder-facing wording, mine for now (the owner to reword): `forms.js` LABELS
  `imported`, `import_country`, `breed`, `import_descended_off`; `manage/wording.js`
  `dogform.from_kennelos` and the note `made_ancestor`; and `dogform.pedigree_hint`
  reworded to say KennelOS's ancestors show there too.
- Not done: the Make a dog record button on the public Pedigree part (the plan's C7
  mentions it; it is the breeder's action, so it is in her Site Manager only). Breed is
  stored and a field but not shown on a dog's page.
- Linked sample: bundle 1 sends origin and lineage for Atlas*, Clover* and Pippa*; the
  coverage test walks ancestors.
- Server-rendered only: no change to `public/_kp/`, no version bump. **This branch adds
  migration 0034**: it applies by itself on the first request after the merge deploys.
- Tests: `lineage.test.js` (new, seven). All 418 pass.

## 2026-11-14: Champion-descended

- The owner's request: like Import-descended, from the ancestors. `content/fields.js`
  `championAncestors`, `ancestorTitles`; fields **Champion-descended** and **An
  ancestor's title** (and each for a litter's parents). The import and champion tags
  are both tag rules on these fields.
- The owner's Dogs screen, a Champion-descended card: how far back (3 by default,
  `rules.dogs.champion_generations`) and the titles that make a champion (`CH GCH GCHB
  GCHS GCHG GCHP`, `rules.dogs.champion_titles`; case and dots evened out). Both
  generation choices are now full width (the half-width one cut off at 390px).
  Checked at 390px.
- Her switch, **Leave out of Champion-descended** (`dogs.champion_descended_off`, added
  to this branch's migration 0034). Its label and hint are mine, for the owner to reword.
- Found in KennelOS: pedigree-only ancestors are sent with no titles (a chart import
  keeps them only in the dog's notes), and a chart import never ticks Imported. The
  hand-over for a KennelOS session: `plans/kennelos-ancestor-titles.md`. Until then,
  champion-descended counts only ancestors whose titles KennelOS holds as title events,
  or dog records on the site with titles.
- No version bump. Tests: two new in `lineage.test.js`. All 420 pass.

## 2026-11-14: country of origin (origin_country), Import-descended and Foreign bloodlines

- KennelOS's hand-over: it sends every dog's titles, pedigree-only ancestors included
  (no contract change); and asks for a new optional section, `origin_country`.
- `kennelos/bundle.js`: `origin_country` in `SECTIONS`; `country_of_origin` on a dog and
  on each ancestor. `dogs.country_of_origin` (added to this branch's migration 0034).
  `kennelos_origin` is now bits (1 origin, 2 origin_country), so each section locks only
  its own fields; a stored 1 reads as before.
- The owner's definitions (`content/fields.js`): **Import-descended** needs the dog born
  in the breeder's country (not imported itself; from her country where both are
  known). **Foreign bloodlines**: an ancestor within the owner's generations from
  another country. Fields: Country of origin, Foreign bloodlines, An ancestor's
  country of origin.
- The owner's Dogs screen: The breeder's country (`rules.dogs.home_country`, empty by
  default) and Foreign bloodlines' generations (3). Checked at 390px.
- Her dog form: Country of origin (new), and the import's country relabelled "Imported
  from" (my wording, unreleased, for the owner to reword).
- The reply to KennelOS: `plans/kennelos-origin-country-reply.md`.
- Linked sample: bundle 1 sends countries. Tests: one new in `lineage.test.js`, two
  updated for the new meaning of Import-descended. All 421 pass. No version bump.

## 2026-11-14: the quick finishes and tidy-up (loose ends, step 1)

`docs/loose-ends.md` step 1: #1, #11, #12, #13, #17, #18.

- **#1, the Featured block's share row** (`plans/kennelos-contract.md` B5): each record
  in a Featured dog or pup block has a Share button beside "Meet {name}" that shares the
  record's own page (`/dogs/<slug>`, or the pup's under its litter) with its name and the
  kennel's as the title, not the page the block is on. Only where the record has a page
  (a pup needs the Litters page on). `render/pages.js` `shareRow(center, { url, title })`
  writes `data-share-url` and `data-share-title`; the template's `site.js` shares those
  when there; `site.css` `.feature-acts` puts Meet and Share side by side (they wrap on a
  narrow phone). No prototype screen: the site's existing button and share row. Checked
  at 390px and 1280px against a local copy. **Template files
  changed (`site.js`, `site.css`): `ASSET_VERSION` 25 → 26** (the owner's yes), with
  `TEMPLATE_FILES` from `scripts/fingerprint.mjs`. Tests: `picks.test.js` (dog and pup rows; a dog's
  own page still shares itself).
- **#11, the Publish list in the owner's wording**: every word of `diff.js` is now in
  `manage/wording.js` (`DIFF`, on the Publish screen: `publish.diff.*`, 82 lines): the
  line's shape (`{part}: {what}`), each part, each kennel detail, Home block and fee by
  name, each "what changed", and the Publish button (`publish.button.one`/`.many`, was
  in `screens.js`). `changes(live, draft, say)`; `draftChanges(env, id, say)`. Today's
  wording is the default, so the list reads as before. Test: `publish.test.js`.
- **#12, the rules and From KennelOS screens at 390px**: checked side by side with the
  prototype's `aRules` at 390px and 1280px against a local copy with the linked sample.
  Both match it (cards, switch lists, pills, two-up fields, the pinned bar); no sideways
  scroll at 390px. Only a long choice ("Placed (shows as Reserved)") is cut off in its
  select on a computer, as a select does. No change.
- **#13, messages deleted after 90 days**: the inbox list already said so. Each message
  now says the day it goes ("Deleted from your inbox on {date}, 90 days after it came in.
  To keep it, reply from your own email, or download a copy of your site under Your
  site."), `inbox.deleted_on` in the wording list (my wording, for the owner to reword),
  the date from `cleanup.js` `INQUIRY_DAYS`. Test: `messages.test.js`.
- **#17**: `kennelos-ancestor-titles.md` and `kennelos-origin-country-reply.md` moved to
  `plans/done/`, each with a line saying why. Confirmed from KennelOS's own hand-over
  (this log, country of origin, 2026-11-14), not from KennelOS's code: adding that repo
  to the session was refused.
- **#18**: `review/plan.md`'s file lists refreshed: today's line counts, the files added
  since 3 November in each session, and two new sessions (11 the family portal, 12 the
  owner's admin view). KennelOS paths not checked.
- No migration. Template 26. All 422 tests pass.

## 2026-11-14: loose ends step 2, one sign-in, not two (#15)

`docs/loose-ends.md` step 2; senior review item 10.

- **`src/signin.js`, new**: the sign-in both sides use. Email checks and its hash, the
  hourly limits (`askForCode`, `bump`), codes (`codeStore`, `issueCode`, `readCodeForm`,
  `redeemCode`: 10 minutes, once, 5 tries), the code's email (`mailCode`), and sessions
  (`newSession`, `sessionCookie`, `sessionTokenHash`, `sessionLive`, `slideSession`,
  `revokeSession`). The error texts are as before, word for word, so `wording.js`
  MESSAGES (`signin`) still finds them.
- **`auth.js`** (the breeder) and **`portal/auth.js`** (a family) keep only what is their
  own: who may be sent a code, their tables, cookie and session length, invites. Each
  side's code table is a `codeStore`, and each code's hash is made over the same text as
  before (`code:…`, `family-code:<site>:…`), so codes and sessions in flight at the
  deploy still work. The two stay apart: own tables, own cookies (`kp_session` on `/`,
  `kp_family` on `/family`), own limit buckets (`email`/`ip`, `pemail`/`pip`).
- Two small changes in how it behaves, both to the family side, now the same as the
  breeder's: asking for a code counts the network address even when the email address is
  already over its limit; signing out leaves an already-revoked session's date alone.
- `kennelos/link.js` drops its own copy of the hourly counter for `signin.js` `bump`.
  `ops.js` and `siteforms.js` count differently (a check before a wrong token; a
  day's window) and keep theirs.
- **The copies from KennelOS**: `tests/copies.test.js` holds a fingerprint of each copy
  (`lib/sql.js`, `lib/crypto.js`, `migrate.js`) and fails when one changes, saying to
  carry the change to KennelOS first. `gate.js` differs on purpose and isn't held.
  Compared with KennelOS's originals (`c8615c4`, read only, the owner's yes): `crypto.js`
  the same; `migrate.js` the same but for its top comment; `sql.js` the same plus
  KennelPort's `IN_CHUNK`, `chunks` and `placeholders`, which KennelOS doesn't use. No
  fix in KennelOS was missing here.
- **KennelOS's sign-in, compared too** (`cloud/src/auth.js`, `ratelimit.js`): same
  limits, code life, tries, hashing and sliding sessions. One fix carried over: the
  wrong try that kills a code now says "Too many tries. Ask for a new code." at once,
  as KennelOS does, not one more "That code isn't right" (`signin.js` `redeemCode`). One
  for KennelOS to take: KennelPort's `normalizeEmail` refuses `<` and `>` in an address,
  KennelOS's doesn't. This session can't push to KennelOS, so it's left for its next
  session.
- Tests: `signin.test.js`, both sides through the same rules side by side (a code works
  once, unknown address answered the same with no email, 5 tries, expiry and
  replacement, the hourly limit, sliding sessions), and kept apart (a breeder's code
  isn't a family's, a family's works only on its site, neither cookie is the other's
  session, limits counted apart). `copies.test.js`.
- No migration, no version bump, no wording added (the "Too many tries" line was already
  in the list). All 438 tests pass.

## 2026-11-14: loose ends step 3, page addresses (#2; site-builder 3.5)

`docs/loose-ends.md` step 3, first half; `docs/plans/site-builder.md`, "Page addresses".

- **Migration 0035** (`site_pages.path`): her address for a page; null is its starting
  one. Additive only: one column. It applies itself on the first request after the deploy.
- **`content/addresses.js`, new**: which pages she may readdress (all but `/waitlist`,
  `/waitlist/help`, `/privacy`; Home is `/`; every page the owner added), what an address
  may be (one part, letters, numbers, hyphens; not the system's own first parts, nor any
  page of the code's starting address, so an old address always stays free to redirect;
  nothing under `/dogs/`, `/litters/`, `/albums/`), typed text made into one ("Our Story"
  is `/our-story`), and each page's address in a snapshot (`settleAddresses`: the first
  page keeps an address two would share). `blocks.js` takes its list of taken addresses
  from there, unchanged, so no page the owner already added stops being valid.
- **One lookup for every link and route**: `render/parts.js` `pagePath(snap, key)` and
  `pageAt(snap, path)`. `render/index.js` routes by it; the menu, footer, every "See all"
  link, breadcrumbs, the contact and review forms' actions, the full-registration links,
  the privacy page's contact link, the application form's policies link, the sitemap,
  the owner's previews, Publish's change list and the waitlist offer email all follow
  her address. Each address is its own: `/litters` renamed leaves `/litters/older`, and
  profiles stay at `/dogs/<name>` and `/litters/<litter>`.
- **Redirects**: `publish.js` `recordPaths` gains `page:<key>` for every page, so the
  existing redirect code writes a 301 from the old address, chains older ones to the
  newest, and drops one whose address is live again. A page the owner removes isn't
  there, so it answers "not found". A page the owner readdresses redirects too, now.
- **`site.js`**: a form posts to its page wherever it is (`FORM_PAGES` by key, not
  path); a post to a renamed page's old address (a page left open) goes to the page it
  redirects to, as a 301 would lose what was typed; any other post is 405, as before.
  The CSP picks Turnstile and the KennelOS form by page key.
- **Her Pages screen**: an Address field beside Name in the menu (placeholder its
  starting address), with a suggestion from her menu name while she has none; the
  Pages list shows each page's address; the waitlist pages say why theirs is fixed.
  Errors in her words. **Wording added** (mine, for the owner to reword): `pages.address`,
  `pages.address_hint`, `pages.address_suggest`, `pages.address_fixed`,
  `publish.diff.what.page_address`, and errors `error.address`, `error.address_kept`,
  `error.address_used`.
- **Owner's admin view**: the Pages list and each page card show her address; New page
  and a page's address refuse one she has given a page.
- `content.json` export and import carry `path` per page.
- Tests: `addresses.test.js` (the rules; rename, links, menu, sitemap, 301s, chains and
  back; refusals in her words; the contact form at a new address and from an old open
  page; `/litters` renamed leaves the rest; export, import and an old snapshot). Checked
  her screen at 390px: the field is the menu name's, as before.
- No version bump (no file under `public/_kp/` changed). All 444 tests pass.

## 2026-11-14: loose ends step 3, the forms' fields (#3; site-builder 3.8)

On the same branch as page addresses, at the owner's ask, with one migration for both
(0035, renamed `0035_addresses_forms.sql`, `addresses_forms`; not yet on `main`).

- **Migration 0035** adds `stories.answers` (a review's answers for the breeder only) to
  `site_pages.path`. A contact message's extra answers use `inquiries.answers`, which
  applications have had since 0007, so the plan's "one column on inquiries" wasn't
  needed. Additive only: two columns in all.
- **`content/forms.js`, new**: each form's fields from a list (contact: name, email,
  phone, town, the pup or litter it's about, subject, message; review: first name,
  town, pup's name, month home, rating, review, photo, email, phone, consent), and her
  own questions (short answer, paragraph, a choice, yes or no; eight at most). Each on
  or off, required or not, in order, in her words. Fixed, always on and required: the
  contact form's name, email and message; the review form's first name, review and
  consent (consent always last). With nothing set, each form is today's, field for
  field: the site's forms draw the same HTML as before (checked by diffing the
  rendered forms). A required field drops a trailing "(optional)" from its words.
  Rating and photo are offered on the review form only: a message has nowhere to keep a
  photo (decision 16, function).
- **Kept in the build** (`build.forms`), only for a form the owner changed; the snapshot
  carries `forms` only then, so existing sites' Publish lists nothing new.
- **The site** (`render/pages/formParts.js`): fields drawn from the form, short ones two
  to a row as today. The pup-or-litter list is her current and planned litters, each
  with its pups, then "Any litter". With the subject off, a full-registration link's
  subject still goes, as a hidden field.
- **Sending** (`siteforms.js`): checked against the form as published. Contact: phone
  and subject in their columns as before, the rest in `answers`. Review: town, pup's
  name, month, rating and photo in the review's own columns only when the form has
  them; email, phone and her questions in `stories.answers`, never in the snapshot or on
  the review card. A review with the rating off has none (the card already drew none).
- **The owner's Forms screen** (`manage/builder/forms.js`, admin nav "Forms"): a card per
  form with movable rows (on the form, required, its words, a question's kind and
  choices), Add a question, Remove, and Back to today's form. No prototype screen: built
  from the builder's cards, movable rows, switches and fields, as Tags is. Checked at
  390px and on a computer.
- **The breeder**: her Inbox shows a message's extra answers under it; Reviews to approve
  shows a review's answers for her with a line saying they never show on her site.
  **Wording added** (mine, for the owner to reword): `queue.answers_for_you`,
  `publish.diff.part.forms` (Publish lists "The contact and review forms: changed").
  The visitors' words on the forms are the owner's, in the Forms screen.
- Tests: `forms.test.js` (today's forms by default; the fixed fields; the owner's screen
  end to end on the contact form, with refusals, the answers kept and her Inbox; the
  subject off with a full-registration link; the review form's for-her-only answers kept
  out of the snapshot and the site). No version bump. All 448 tests pass.

## 2026-11-14: the code review's instructions brought up to date (loose ends step 4, before it runs)

`docs/review/plan.md`, `session-prompts.md`, `index.md`. Docs only.

- **A target**: `main` at the merge of this branch (page addresses and the forms' fields).
  Each session records the commit it reviewed and, if later, reads `git diff --stat` from
  the target for its files first. The index gains a "Commit reviewed" column.
- **Section 0**: baseline 448 KennelPort tests (KennelOS still the 3 November counts, to be
  recorded by the first session that reads it); "Not findings" now lists the loose ends
  deliberately not built, and says the `/pickup` page with her words is built and in scope
  (only backlog 4's structured places are deferred); status is `docs/STATUS.md`, not the
  README. The contract table gives section names, not line numbers (they had moved by up to
  60 lines), and adds the site-builder, KennelOS-contract, family-portal and senior-review
  docs.
- **File sizes dropped** from every list (they drift); sessions `wc -l` what they read.
- **Questions for what was built after 3 November**, not only its files: session 2 the
  shared sign-in; 4 page redirects, the Publish list, what the snapshot must not carry; 5
  the owner's forms as a family meets them, posting by page; 6 her wording as the owner's
  list, the Address field, the answers in her Inbox and queue, the portal sites' app; 7 the
  owner's blocks on the public site, `pagePath` everywhere, the forms drawn; 8 migrations to
  0035, import of addresses, backup and restore of new columns; 12 the Forms screen and page
  addresses on the owner's side. Session 10 marks findings already in the senior review or
  the loose ends.
- **Prompts** for sessions 11 and 12, and a line on the new work in 4 to 8; rows 11 and 12
  in the index.
- Not done: KennelOS paths and test counts (attaching the KennelOS repo was refused in this
  session). Sessions 1, 2, 4, 5 and 9 check them first; 6, 7, 8, 11 and 12 need only
  KennelPort.
- No version bump needed for this branch: nothing under `worker/public/` changed
  (`versions.test.js` passes).

## 2026-11-15: code review session 1, the bundle contract (loose ends step 4)

`docs/review/findings/01-bundle-contract.md`, the index row. Docs only; no product code, no
version bump. Reviewed `main` at `8aaf58a` (the target) against KennelOS `999b868`.
Baselines: KennelPort 448 pass, KennelOS 2007 pass (`cloud` not run).

- **S1**: a product KennelOS stops sending is deleted (`bundle.js:846`), taking her wording,
  its portal settings and each family's program status and code; extras the same, smaller.
  A dog's last KennelOS health result can never be removed (`health()` returns on `[]`).
- **S2**: about 95 dogs with pedigrees fill the 1 MB bundle cap (lineage is ~9 KB a dog);
  past it every update is refused with "That is more than KennelPort takes at once."
- **S3**: an unmarked result counts as normal, so "Affected" shows under Normal results only;
  the last title in a kennel can't be cleared; dropping the application fee leaves the old pay
  link; two presses at once double health results and extras.
- D1's batch counts as one query, so statement counts aren't the limit (1,086 statements for a
  90-dog first bundle, 87 ms in Node).
- Proved with throwaway scripts in the session scratchpad, not committed.

## 2026-11-15: the two S1s from review session 1 fixed (migration 0036)

`kennelos/bundle.js`, `publish.js`, `manage/screens.js`, `manage/wording.js`, migration
`0036_kennelos_hidden.sql`, `tests/kennelos.test.js`. No version bump: nothing under
`worker/public/` changed.

- **Products and extras are hidden, not deleted** (finding 01-1). Migration 0036 adds
  `hidden_by_kennelos` to `products` and `extras`. It's additive only and applies itself on the
  first request after the merge. One KennelOS stops sending is hidden and counted "off the
  site". Publish leaves it out of Recommended products, Getting your pup home and Extras. The
  family portal still has it (the owner's choice: the portal is private, and families may be
  partway through a program). Sent again, it matches its old row by `kennelos_id`, is
  un-hidden and counted "back", so families' program statuses and codes stay attached. Unlink
  already kept these rows; now the "not sent" path does too.
- **A dog's last KennelOS health result can be removed** (finding 01-2). `health()` now
  clears KennelOS's results for a dog sent with `health: []`. A dog sent without the key is
  left alone, as before, and her own typed results are never touched.
- **New wording in the owner's list:** `lists.sub.not_sent_portal`, "Not sent by KennelOS ·
  off your website, still in the portal", under a hidden product or extra in her lists. The
  existing "not shown" line would be wrong for them, since the portal still shows them.
- `hidden_by_kennelos` is kept out of the published snapshot, so Publish doesn't list every
  product as changed after the migration.
- Tests: 450 pass (two new ones; the products and extras tests now expect hiding).

## 2026-11-15: the data-loss findings from review session 2 fixed (migration 0037)

Findings in `docs/review/findings/02-link-lifecycle.md` (on branch `ccr-a5707191-duiaog`,
not yet merged). Fixed here: 1 (S1), 2 (S2), 4 (S3, the Site Manager half) and 5 (S3).
Still open: 3 (parallel code guesses, security, not data loss), 6, 7 and 8 (8 is KennelOS's
side). `kennelos/link.js`, `kennelos/bundle.js`, `manage/screens.js`, `manage/wording.js`,
`manage/forms.js`, `manage/index.js`, `content/model.js`, `content/records.js`,
`content/io.js`, `publish.js`, `signin.js`, `auth.js`, `portal/auth.js`, `portal/family.js`,
migration `0037_products_extras_show.sql`. No version bump: nothing under `worker/public/`
changed.

- **Migration 0037** adds `show_on_site INTEGER NOT NULL DEFAULT 1` to `products` and
  `extras`. Additive only, every existing row stays shown; it applies itself on the first
  request after the merge.
- **Finding 1, a product or extra stranded hidden after Unlink.** Products and extras get
  her own Show on my website switch (a field in the model, so it's on both forms under On
  your website, and goes out in and comes back from the content document; left out, it's
  on). Unlink turns `hidden_by_kennelos` into `show_on_site = 0`, as it already did for dogs
  and litters. Publish leaves out either kind of hidden; the portal still lists both. Her
  lists say "Off your website, still in the portal".
- **Finding 2, the last device stopping was an Unlink, and a relink doubled things.**
  `stopDevice` only stops that device. With none left, her records stay keyed to KennelOS
  and the next device carries on (`waitingForDevice` tells the screen, which says so and
  keeps Show a link code, Prices and Unlink). KennelOS's own Disconnect this device ends in
  the same place, so its dialog's wording is now true. If a device from *another* kennel
  then links, `redeemCode` runs Unlink first, so the old kennel's records become hers rather
  than waiting as "not sent". For a relink after a real Unlink (or KennelOS re-keying its
  records), `applyBundle` now takes over her own extras by name (as products already were),
  her steps by heading (her wording kept; on a first link a matched step takes KennelOS's
  place in its order; after an earlier link her order stays), and a dog's health result
  with the same test, result and date instead of adding a second one.
  While no device is linked, the portal's waitlist count and KennelOS's portal hand-off act
  as unlinked (they look for a live device); a new device restores both.
- **Finding 4, Unlink in one tap.** Unlink now shows a confirm card first (Yes, unlink /
  Keep it linked). Stop this device stays one tap: it no longer unlinks, and when it was the
  last device the note says the site is still linked.
- **Finding 5, the session didn't slide.** `slideSession` says when it moved, and
  `currentUser` / `currentFamily` return the cookie to send again. `handleManage` and
  `servePortal` add it to the answer (`withCookie`), unless the answer sets that cookie
  itself (signing out). It's sent at most once a day, when the row moves.
- **New wording in the owner's list** (first drafts, for the owner to rewrite):
  `lists.sub.off_site_portal`, the note `stopped_last`, and `kennelos.unlink_sure`,
  `kennelos.unlink_sure_text`, `kennelos.yes_unlink`, `kennelos.keep_it_linked`,
  `kennelos.no_device_linked`, `kennelos.no_device_text`. In `forms.js` LABELS: the hint
  for Show on my website on extras and on products.
- Tests: 455 pass. New: Unlink asks first, then a hidden product and extra can be shown
  again; stopping the last device, then a new device, leaves counts unchanged; a relink after
  Unlink doesn't double extras, steps or health; another kennel linking unlinks first; a slid
  session re-sends its cookie (both sides, and signing out still clears it). Tests that post
  product forms now send the switch, as the real form does.
- Checked side by side at 390px and 1200px: the confirm card and the "no device yet" screen
  use the existing card, danger card and button styles; the switch sits with the product's
  other switches.

## 2026-11-17: review 07 finding 1, full registration not offered on Reserved or Still deciding pups

- **The owner's call:** keep the setting configurable, default it to not shown. In
  `content/rules.js` `DEFAULT_RULES.status`, `fullreg` is now off for `placed` (reads
  Reserved) and `undecided` (Still deciding); Available and the before-deposits row keep it on,
  Joining our program stays off. The Rules screen still has the switch on every row.
- **Who it reaches:** rules are stored as differences from the defaults (`withPart`), so every
  site that never set this switch changes at its next publish (or preview); a site where the
  owner had set it keeps her setting. Nothing in `public/_kp/`: no version bump.
- **What a family sees now:** a Reserved or Still deciding pup with no registration set shows no
  "Ask about full registration", no "Full Registration Surcharge" and no Registration line (that
  line follows the same switch, `render/parts.js` `regText`); the litter's own ask and surcharge
  show only while it has a pup that qualifies. Plan 3.2 ("reserved or placed never show a
  price") and decision 32 now hold by default. `site-builder.md`'s defaults table updated.
- Tests: 455 pass. `rules.test.js` checks a Reserved pup shows neither by default, and turns the
  switch on for Reserved to check it still works.
- Still open from review 07: finding 4 (a litter with nothing on offer still shows Price and
  Deposit) is separate and not changed here.

## 2026-11-17: flip cards grow to fit (review 07 finding 2/3, the owner's call)

- **The owner's call:** make the cards bigger rather than cap what they show; let them stretch
  down, keep the photo, and let the coloured part under it on the front take the extra, so a
  bio on the front works too.
- **`site.css`, Flip cards:** both faces sit in one grid cell (no longer absolutely placed in a
  430px box), so a card is as tall as its taller side needs, never under 430px. The front's
  photo (or "Photos coming soon") is 320px tall on every card (it was 290–370px, whatever the
  caption left; with a bio on the front it shrank to nothing); the caption fills the rest
  (`flex: 1`). The back's bio is no longer squeezed and hidden; "View profile" sits at the
  bottom as before. A front bio (`.cap .bio`) reads like the back's. Cards in a row or the
  slider stay the same height as each other (grid stretch). No markup changed.
- **Checked** in Chromium at 320, 390 and 1280px: no card cuts anything off on either side (a
  dog with 8, 10 and 30 health results, every pup card); no sideways scroll at 320px in Lawn,
  Midnight and Tuxedo, light and dark; a front with the bio keeps its 320px photo. The
  prototype's flip card (`ak-sample.html`, Flip cards) is the same card; only its height rule
  changed.
- Tests: 455 pass. The owner said yes to the bump: `ASSET_VERSION` 27 (was 26 on `main`),
  `TEMPLATE_FILES` 3dfad8a5636f65f3.

## 2026-11-18: the Extras block (data block, migration 0038)

- **The owner's ask:** a place for the breeder's full-page flyers (her "Liam's puppy memory
  packages" ad), with the KennelOS extras the flyer stands for under it; the extras as
  customizable as Dog cards, looking like the How it works steps, with a "More details" fold,
  and her own description. This branch builds the extras half; the Flyer block (a whole,
  uncropped picture that opens full size) is still to come.
- **Extras block** (`content/blocks.js` `extras`, any page): a data block over a new kind of
  record, `extra` (`content/fields.js`: kind, group, name, price, weeks, "most complete", from
  KennelOS, has More details, what's included), so it has conditions, order, groups, a limit
  and the breeder's ticks (Leave out) like the others. Styles: **step cards in a slider** (the
  default: the How it works page's `.step`), step cards in a grid, the Extras page's package
  cards, or expanders (the FAQ's `.acc`). **The big figure** sits where a step has its number:
  its price (default; only while prices of extras show), a number, its weeks, or nothing. Under
  it, in the owner's order, each on or off: group, name, weeks, price, description, More
  details, Ask about this. Drawn in `render/pages/extras.js` from the template's existing
  classes only: **no CSS changed, no version bump**.
- **Her words on an extra** (migration 0038, `extras.site_description` and `extras.details`):
  "Description on my website" shows on the site instead of KennelOS's (which stays KennelOS's
  and read-only while linked); "More details" is folded under it, followed by a package's
  checklist. The Extras page uses her description too. Labels in `manage/forms.js` LABELS.
- **Site words** (the owner's fixed wording, `content/rules.js`): `more_details` ("More
  details") and `weeks`.
- **Migration 0038** adds two empty columns to `extras` (additive; every extra shows as today).
  It applies itself on the first request after the merge.
- **Checked** in Chromium at 390 and 1280px with the sample's memory packages: step cards in the
  slider (three across on a computer, one and a peek on a phone), More details open, and the
  expanders. The owner's admin settings use the existing controls (segments, ordered switch
  list); not screenshotted.
- Tests: 461 pass (`extras-block.test.js`, and an admin round trip in `blocks.test.js`).

## 2026-11-18: Extras highlight, the Cards block, and documents (migration 0038, continued)

- **Extras block, highlight** (the owner's ask: "highlight one as premier"): `hl`, the owner's
  pick of one extra, or those the breeder marks "most complete" (the default), or none. Its card
  gets the Extras page's accent border (`.step.top`, new; `.pkg.top`, as before), an expander
  opens by itself, and the owner's label (`w.flag`, optional, any words) sits over it as a pill.
- **Cards block** (`cards`, one of the owner's own blocks, any page; the owner asked for it with
  no use in mind, so no wording points it at one): up to 12 cards, each any of a photo, a big
  figure (a step's brass number), labels (up to 4 pills in one colour), a heading, words and a
  button. The block: heading and line, side by side (2, 3 or 4 across on a computer; one on a
  phone) or in the slider, the photo's shape (wide, square, tall, or the whole photo uncropped:
  a flyer fits whole), the labels' colour and alignment. Drawn from the portal prototype's
  photo-top card (`.pcard`) in the site's surface (`render/pages/cards.js`, CSS `.own-card*`).
  The breeder switches it off and rewords its heading and line; the cards are the owner's.
  The owner's settings: `manage/builder/cards.js`.
- **Documents** (`src/documents.js`, `manage/builder/documents.js`, the `documents` table in
  migration 0038): a site's PDFs, not tied to any block (the owner's call). The admin view has a
  **Documents** screen (upload, retitle, open, remove). Checked by their first bytes (`%PDF-`),
  10 MB at most; nothing is compressed on the server (a Worker can't redo a PDF's images), so the
  screen says to save a reduced-size PDF. Kept in R2 under the site's files
  (`sites/<id>/docs/`), so backup and closing a site carry them; `documents` is in `SITE_TABLES`.
  **"A document" is now a place every button can go** (`LINK_TO.doc`): Button, Banner, Photo
  beside words, Text over a photo, and each card. It opens the PDF in a new tab (served at
  `/_kp/d/<id>`, inline, under its file name); a card says "PDF · size" beside it. A button
  whose document is gone hides. The snapshot carries the site's documents.
- **Not done:** documents don't count toward a site's storage limit yet (`photos.js` counts
  photos only); a document has no preview of its own (a card's photo is its preview); the
  breeder can't upload documents (admin only); the menu can't link to a document yet; cards
  can't be reordered except by retyping.
- **Checked** in Chromium at 390 and 1280px: cards with and without photos, the flyer as the
  whole photo and cropped wide, the document button and its size.
- **`ASSET_VERSION` 28** (was 27 on `main`), the owner's yes: the template's CSS changed
  (`.step.top`, `.own-card*`). `TEMPLATE_FILES` 4a7222de7618c03e.
- Tests: 467 pass. `cards-documents.test.js`.

## 2026-11-18: fix, the Extras page broke on a package with no checklist; a note when she saves one

- **What she saw:** "Something went wrong" (the Worker's last-resort 500, `index.js`) on her
  site after she deleted her hand-typed extras and edited the ones KennelOS sends instead.
- **Why:** an extra with no checklist has NULL in `extras.checklist` (KennelOS never sends
  one, and `content/records.js` saves an empty list as NULL). `publish.js`'s `json()` only
  fell back on a parse error, but `JSON.parse(null)` is `null`, so the snapshot carried
  `checklist: null`. The Extras page reads `checklist.length` for packages only, so items
  were fine; once she made a KennelOS extra a package (`kind = 'homegoing'`), every visit to
  the Extras page threw `TypeError`. The Extras block already guarded it (`?.length`).
- **Fix:** `json()` returns its fallback for NULL too. That also covers an album saved with no
  photos (`.filter` on null would have stopped publishing) and a safe notice with no content.
  The Extras page guards `checklist?.length`, so the snapshot already published draws again
  as soon as this deploys, with no republish needed.
- **Confirmed** by the breeder: one package's checklist had been typed but not saved.
- **A note when it happens again:** saving (or adding) a homegoing package with nothing
  under What's included still saves, but the note after it says the list is empty and to
  add it before publishing (`note.saved_no_checklist`, `note.added_no_checklist` in
  `manage/wording.js`, for the owner to reword). A new one opens on its own page so the
  note sits beside the form. Items need no list.
- No migration, no version bump (server-side code only; `worker/public/` unchanged).
- Tests: 469 pass. `editing.test.js`: the package note.
- Tests (the fix alone): 468 pass. `extras-block.test.js`: a KennelOS extra made a package with no
  checklist, and a snapshot that still carries null.

## 2026-11-18: flyers, step 6 of the documents and cards gaps

[`plans/documents-cards-gaps.md`](../plans/documents-cards-gaps.md) step 6, the owner's ask
("build the flyer"), with the owner's answers to the plan's questions recorded there (step 4
for chosen breeders with a size cap; the breeder can change a card's words; full detail as a
choice at upload).

- **The Photo block takes "The whole photo, uncropped"** (`PHOTO_SHAPE.whole`): its own shape,
  no wider than 620px on a computer, frames as the others (`.own-photo.whole`).
- **"Opens full size on a tap"** (`zoom`, off by default, so every existing block draws as
  before), on the Photo block and the Cards block (all its photos). The photo becomes a link
  to the full photo (`render/parts.js` `zoomed`) with a small magnifier in its corner
  (`.zoom-ic`, an inline SVG: the site's CSP has no `data:` images), and opens in the album
  viewer the site already has. **The viewer now keeps to one set:** previous and next stay
  among photos with the same `data-gallery` value (an album's share none, each Photo or Cards
  block's are `b-<id>`), and a set of one shows no arrows or count (`.viewer.one`). A card
  that opens full size is read by its photo's description first, then its heading.
- **The description line** on the owner's Photo and Cards settings, when the photo is whole or
  opens full size: the photo's description, or "This photo has no description…" with a link
  to the breeder's Photos screen. A warning, not a block (decision 16). Owner's screen: not in
  `wording.js`.
- **Full detail on upload:** a tickbox beside the upload buttons in the photo library window
  and on the Photos screen (`library.full_detail` in `wording.js`). Ticked, the photo is kept
  at 2400px on its long side instead of 1600px; one that comes out over 2.9 MB is squeezed a
  little more, then made 2000px, under the server's 3 MB. Upload elsewhere (/ops, older
  pickers) stays at 1600px.
- **Checked** in Chromium at 390 and 1280px: a tall flyer whole, framed, in a Photo block and
  in two Cards; the viewer opens the Photo block's alone (no arrows), the cards' as 1 of 2,
  and an album strip's as its own 1 of 2; no sideways scroll. Pinch to zoom in the viewer is
  the browser's own (the page allows zooming).
- No migration. **Both versions need a bump** (asked): the template (`site.css`, `site.js`) and
  the Site Manager (`photos.js`). Until then `versions.test.js` fails, as expected.
- Tests: 470 pass, 2 fail (the version checks). `ownblocks.test.js`: the flyer Photo block and
  Cards; `editing.test.js`: the Full detail tickbox.

## 2026-11-18: Getting your pup home's sections as menu places

- The owner's ask: Pickup, Transport and Travel day as links under Getting your pup home, like
  Girls and Boys under Dogs, all on the one page. Three new `MENU_PLACES` (`pickup#pickup`,
  `pickup#transport`, `pickup#travel`): in the Menu screen's Add, not in today's menu, so no
  site's menu changes until the owner adds them. Each jumps to its section (the ids the page
  already had; the header's `scroll-padding-top` keeps the heading in view) and shows while
  its section is on the page: her words, or for Transport her words or a transport service.
- Jump, not a Show filter: the owner hadn't decided; the sections stay one readable page.
- No migration, no version bump. Tests: `menu.test.js`.

## 2026-11-18: version bumps for flyers (the owner's yes)

- **`ASSET_VERSION` 29** (was 28 on `main`): `site.css` (the whole photo, the magnifier, the
  viewer's set of one) and `site.js` (the viewer keeps to one set). `TEMPLATE_FILES` bdc3c6133f4e9df2.
- **`APP_VERSION` 19** (was 18 on `main`): `photos.js` (Full detail on upload). `APP_FILES` b2d03e0ca03367ed.
- Tests: 473 pass.

## 2026-11-18: fix, her page screen crashed with an Extras block on it

- The breeder's screen for any page holding an Extras block answered "Something went wrong"
  (500): `manage/screens/pages.js` `addedCard` lists a data block's records by name, and
  had no entry for `extras` (`nameOf[b.type]` was undefined). Added extras (by name, under
  "Your extras": new wording key `pages.your_extras`), and a fallback so a data block added
  later without an entry shows its type's name instead of crashing.
- The card's "none right now, so it hides" is still in the code, not yet in `wording.js`.
- No migration, no version bump. Tests: `extras-block.test.js` (474 pass).

## 2026-11-18: fix, See their portal said "used or has expired" for the owner

- The owner, in the Site Manager through her `/ops` sign-in (`src/admin.js` `asAdmin`), isn't
  one of the site's people, so her view link carried "admin" (or her own address) and the
  portal's check (`portal/view.js` `allowed`, a `site_users` row) refused it at once, with
  "That link has been used or has expired". Her link now says `VIEW_AS_ADMIN` when she's
  signed in as admin and not on the site's people list, and the portal accepts that without
  the people check (the link and the hour's cookie are signed, and only made for an admin).
- No migration, no version bump. Tests: `portal-view.test.js` (475 pass).

## 2026-11-18: Open your status page, signed in, and the band in the owner's wording

- Home's band before pickup is now **Until {pup} comes home · Payments, additional services,
  and pickups**, rows Payments, Additional services, Pickup, Message (the owner's wording,
  2026-11-18), with **Open your status page** and "Opens signed in. No code needed."
  (`portal/family.js` `statusBand`; family-facing, so kept there, not in `wording.js`).
- Fix: the Pickup row read "Pickup {go-home day} · Change the time or place there" with no
  pickup booked. It now says "Not booked yet · Request your day and time" until one is
  booked, then the booked day and time.
- Every link to the status page goes through `/family/status-page`, which redirects to it
  with a one-time 10-minute link in the address's # (`feed.js` `makeStatusToken`,
  `statusPageLink`; signed with the KennelOS link's key over `to-status:`). KennelOS's
  status page turns it into its own 90-day sign-in (KennelOS cloud migration 0029, same
  branch name there). Her view ("See their portal") gets their plain link, never signed
  in as them; a family not from KennelOS, or a site unlinked, gets the plain link too.
- No KennelPort migration, no version bump (no file under `public/_kp/f/` changed).
  Tests: `portal-feed.test.js`, `portal-view.test.js` (478 pass).
## 2026-11-18: Publish from KennelOS; portals started before the contract

- **`POST /v1/publish`** (`kennelos/api.js`, device token): the draft goes live through
  `publish()` as Site Manager's Publish does, recorded as published by `kennelos`; her Undo
  publish still steps it back. KennelOS calls it right after each bundle unless she keeps
  sends in the draft there. A refusal is `409 cannot_publish` with a line KennelOS shows.
- **The feed's `contract_signed_on` is optional** (`portal/feed.js`): KennelOS sends a family
  early when she starts their portal before the contract is signed; the date fills in with a
  later feed. Family-portal plan 3.4 **Modified**.
- Site Manager's Today waitlist line now mentions portals started early
  (`portal/admin/today.js`; not in `manage/wording.js` yet, like the rest of that screen).
- Tests: `worker/tests/kennelos.test.js`, `worker/tests/portal-feed.test.js`. No migration,
  no version bump (no file under `worker/public/` changed).

## 2026-11-19: A family's puppy kept after its litter leaves the website; each puppy's vet

- **Migration 0039** (`kept_pups`): new tables `portal_pups` and `portal_pup_photos`, four
  new columns `portal_placements.pup_vet_*`, filled from the site's vet for every existing
  placement. Additive; applies by itself on the first request after the merge.
- `portal/pups.js`: `keepStatements` copies each kept placement's puppy (families with a
  portal) and pins its photos, first in every batch that deletes puppies, litters or
  photos (`deleteLitter`, `removeRecord`, `importContent`, the photo library's Remove).
  `pupOf` / `photosOf` read the website's puppy, else the copy: `family.js`, `family/files.js`,
  `stays.js`, `admin.js`; Families and Going home read the copy's photo, sex and litter.
- `kennelos/clock.js`: the 30-day clock no longer spares a litter with an open placement.
- `cleanup.js`: a photo a family keeps is never purged; it goes with the next cleanup once
  the family is deleted for good (`store.deleteFamily`), erased (`account.eraseFamily`) or
  merged away (`merge.js` moves it).
- The puppy's own vet: `store.vetOf` on Home and Records; `freezeSiteVetStatement` before any
  site vet change; her placement form edits it (`PLACEMENT_FIELDS`). The feed takes
  `placements[].vet` (`feed.js`), and now applies the top-level `vet` before the families.
- Wording: new group `keptpups` in `manage/wording.js` (the kept puppy's choice and hint,
  the puppy's vet heading, hint and labels). The suggestion labels for `pup_vet_*` are in
  `portal/admin/parts.js` `SUGGEST_LABEL`, with the others there (not moved yet).
- Linked sample: Onyx*'s placement carries its own vet (`feed-1.json`).
- Tests: `portal-kept-pups.test.js` (new), `portal.test.js` (the closing-the-site test, which
  had expected a placed litter never to expire). 486 pass. No version bump (no file under
  `worker/public/` changed).
- Same day, the owner: no copy may describe how it works underneath. The puppy's choice
  reads "{name} · {litter}" like any other (was "… (kept for this family)"), the hint
  under it is the usual one, and the vet hint is "The vet the family sees as {name}'s
  vet." New rule in `CLAUDE.md`, "Never describe the plumbing in copy".


## 2026-11-21: ready-made timeline tasks, and a puppy's name in her template

The owner saw "Register Maverick / Your registration papers are in the go home folder" on
Cash's portal. That wording isn't in the code (the suggested one is "Register {name} /
Your registration paper is in the go-home folder."): it's a task in the breeder's own
timeline template with the puppy's name typed in, so every family reads "Maverick".

- `portal/steps.js`: `READY_TASKS`, ready-made tasks by program type (registration,
  insurance, food, product, other), each with two or three wordings and the usual day
  after pickup; `addReady` adds one like a task she typed (`{program}` becomes the
  program's name, `{name}` stays). Registration can go in with no program. `puppyNames`
  and `namedPuppy` find one of her puppies' names in a step.
- `portal/admin/templates.js`: `readyForm`, "Add a ready-made task" on her Timeline screen:
  one group per shown program (its link and code go with the button), plus "Registration,
  no link" while no registration program is shown. A template task that names one of her
  puppies says so in red: "Every family reads "Maverick" here. Write {name} instead…".
- `portal/admin.js`: routes `/portal/timeline/ready` and, on a family's screen, "Add a
  ready-made task for them alone" (`f/<id>/steps/ready`).
- Wording: the ready-made wordings and the new lines are in `READY_TASKS` and `readyForm`
  (portal screens aren't in `manage/wording.js` yet; site-builder step 2.4).
- No prototype screen for her templates; built from the existing card, fgrid and hint.
- Tests: one new in `portal-steps.test.js`. 487 pass. No migration, no version bump (no
  file under `worker/public/` changed).
- Same day, the owner: no replacing on delete (built and reverted). Instead "Register
  {name}" stays suggested on her Timeline screen (`templates.js` `registerSuggestion`)
  whenever her timeline has steps but not that task: one tap adds it, linked to her shown
  registration program if she has one. A task she adjusted or kept is left as it is.
  New sites get it from the suggested timeline as before. 488 pass.

## 2026-11-21: the puppy handbook (family portal, phase 2 begins)

The owner chose to start phase 2 before phase 1's gate (no real litter yet), handbook
first. Her answers: a program's link goes inside the words, not one per chapter; and
nothing shows to families where it's empty, so new sites start with no chapters.

- **Migration 0040** (`handbook`): new table `portal_chapters` (title, body, shown, sort).
  Additive; applies by itself on the first request after the merge. In `SITE_TABLES`, so
  backups, restores and closing a site carry it (`plans/backup-format.md`).
- `portal/handbook.js`: chapters (list, save, move, on/off, remove) and the body's plain
  format: blank line = paragraph, `- ` = list, `{name}`, and `[link: Program]` or
  `[link: Program | her words]`, matched by name to a program families see; a button on
  its own line, a link inside a sentence; a tag matching nothing shows nothing to families.
- Her side, `portal/admin/handbook.js` at `/s/<sub>/portal/handbook`, a row on the Portal
  tab: each chapter opens to edit, Move up / Move down, Remove asks first; "Add a program's
  button at the end" puts `[link: …]` on the last line; a tag naming no shown program is
  flagged in red. No prototype screen for the editor (the prototype's admPortal has the
  list only); built from the template screens' card, fgrid and hint.
- Families, `portal/family.js`: `/family/handbook` (the prototype's famHandbook: search as a
  plain GET form, chapters that open, the first open, or every match, or the one Read next
  led to); Home's **Read next** (the first three chapters as the prototype's photo rows,
  with their own puppy's photos after the hero's; words alone with none) and **Handbook**
  first in Quick links, in Account's place (Account stays in the header). None of it shows
  while no chapter is on with words, nor for a closed placement or the loss page. Program
  clicks count with place `handbook`; the disclosure shows when a link does.
- Wording: new group `handbook` in `manage/wording.js` (every line on her screen, the
  errors and notes). The family page's own lines are in `family.js`, as on its other pages.
- `public/_kp/f/portal.css`: the prototype's chapter, search and photo-row styles.
  **Needs a `PORTAL_VERSION` bump (3, on `main`): asked the owner.** Until then
  `versions.test.js` fails as expected.
- Tests: `portal-handbook.test.js` (new, 2). 489 pass, 1 expected fail (versions).
- Same day, the owner: the handbook is a **flipbook**, styled after her buyer-guide book
  (the "Puppy Waitlist Guide" artifact). `/family/handbook` is now a cover (their own puppy's
  photo to boop, hearts, a collar and tag), then a book on a desk: title page, Contents with
  page numbers, a page for each chapter (a `---` line starts another page of it), and a
  "Happy puppy days!" end page; running heads, folios, the maroon, cocoa and tan trim.
  Two pages side by side on a computer, one on a phone; arrows, swipe, keyboard, a Contents
  dialog; Read next opens the book at its chapter (`#ch-<id>`). New `public/_kp/f/handbook.js`
  (loaded without `defer`, only to mark `<html>` before the page shows); the page has no
  portal header or tabs (`frame(..., { bare: true })`), with Back to the portal and Portal
  instead. The portal's own fonts (Fraunces, Mulish), not the guide's Google fonts: the
  portal's CSP allows only its own. Without the script the cover and pages stack and read
  in order. Search is gone (the book has Contents); `## ` is a small heading in a chapter.
  Her hints updated in `manage/wording.js`. Still needs the `PORTAL_VERSION` bump (asked).
- Same day, the owner: **search back**, in the book. A search box on the Contents page and
  in the Contents dialog; as they type (`handbook.js`), the pages that match every word
  (in the chapter's title or that page's words), each with its page number and a few
  whole words around the first one found; a tap turns the book there. Without the script
  it's a plain form (`?q=`): the Contents page lists the matches (`handbook.js` on the
  server: `plainText`, `matches`, `snippet`). A continuation page has its own address
  (`#ch-<id>-2`). Only the words families see are searched: a link tag naming no program
  isn't.
- Same day, the owner: **chapters from a file she writes with Claude**, styled. Her Handbook
  screen has "Add chapters from a file" (.md, .txt or .html, 400 KB at most) with "What to
  ask Claude" (`handbook.js` `CLAUDE_PROMPT`, kept in code: longer than a wording line may
  be): each `# Title` in the file is a chapter (a file with one `# ` and several `## ` is a
  book: its `## ` are the chapters); a chapter with the same title is replaced (her tick),
  keeping its place and on/off; new ones are off unless she ticks "Families see the new
  chapters straight away". HTML (`htmlToText`) is turned into the same format; its scripts,
  styles and anything else are dropped, nothing of the file runs or shows as it was.
- The chapter format grows (`bodyHtml`, read line by line): `#` big, `##`, `###` small
  headings; `{center}` at the end of a heading or line; `**bold**`, `*italic*`; `1.`
  numbered lists; `> ` a note in a box; `+++ Title` … `+++` a fold that opens on a tap;
  `[photo: what it shows | caption]`. Still never taken as HTML.
- Photos come from her photo library: a file's photo spots say what they should show
  ("Pick a photo: Opal asleep in the crate" in red under the chapter); the picker
  (`/portal/handbook/<id>/photo/<n>`, the app's `ph-grid`) puts the photo's id in the tag,
  and what the spot said becomes its caption. A photo since removed from her photos shows
  nothing to families and asks her to pick another. Families get the 400px copy at
  `/family/handbook/photo/<id>`, only for a photo in a chapter they can read. Her photo
  library lists each chapter's photos ("Puppy handbook: Welcome home", `photoPlaces.js`).
- Wording: new lines in the `handbook` group, and `library.handbook`. No migration beyond
  0040. Tests: `portal-handbook.test.js` (3). 490 pass, 1 expected fail (versions).
- Same day, the owner said yes: **`PORTAL_VERSION` 4** (`PORTAL_FILES` `ec94d3d9f829dbc7`), for
  `portal.css` and the new `handbook.js`. 491 pass.

## 2026-11-21: the go-home bag, planned

- The owner chose the go-home bag as phase 2's next chunk (not the baby book). Plan:
  [`plans/done/portal-go-home-bag.md`](../plans/done/portal-go-home-bag.md), from family-portal.md
  8.4 and the prototype's three bag screens (her template on the Portal tab, Sent home
  with on the family's screen, What came home in Opal's bag on Records). One migration
  (0041: `portal_bag_items`, `portal_placement_bag`, `portal_placements.bag_saved_at`);
  five questions for the owner before building. No code.
- Same day, the owner: **an expense column on each item** (yes/no, copied onto what each
  family was sent, totals on her family card), and **KennelOS will push bag items, cost
  included**: a new `bag_items` bundle section matched like extras and products (owned
  fields, take-over by name, hidden not deleted, Unlink). Plan section 4a is the contract
  for KennelOS. Eight questions now.
- Same day, the owner answered three: the expense is a yes/no (no category); what went
  home, with each item's cost and expense, **goes back to KennelOS** in the facts
  (`factsFor`, plan section 4b; an exception she chose to "money never goes back on its
  own", noted in family-portal.md 3.4); and she can still add bag items by hand while
  linked. Five questions still open.
- Same day, the owner answered the rest: the bag is her usual one until she saves it or
  marks pickup, then fixed; families see it only from pickup; no quantities; her bag
  starts empty; she sets each item's button words (filled in from the program's type,
  hers to change; a `button` column). Plan ready to build.

## 2026-11-21: the go-home bag, built (phase 2)

Plan: [`plans/done/portal-go-home-bag.md`](../plans/done/portal-go-home-bag.md) (its
section 9 lists where the build differs). Branch `ccr-00a76f7b-evincp`.

- **Migration 0041** (`go_home_bag`): `portal_bag_items` (her bag: name, cost in cents,
  expense, origin, program, her button words, on/off, order, and KennelOS's id, source and
  `hidden_by_kennelos`), `portal_placement_bag` (what one puppy went home with, each item as
  it was then), and `portal_placements.bag_saved_at`. Additive only; it applies itself on
  the first request after the merge.
- `portal/bag.js` (new): the bag, costs (`parseCost`, `money`), `bagFor` (a puppy's own rows,
  else her bag as it stands), `saveBag` (Sent home with), `fixBag` (at Mark picked up) and
  `fixDueBags` (the hourly job, for a pickup that came another way), `familyBag` and
  `bagFact` (for KennelOS).
- Her screens, `portal/admin/bag.js` (new): **Go-home bag** on the Portal tab (the
  prototype's admPortal list: the program's icon or a gift, "Costs you $4 · where from ·
  tied to Program", an Expensed tag beside the name; Change opens the item on its own
  screen, with Move up, Move down and Remove after a question); **Sent home with** on a
  family's screen once she has a bag (the prototype's chips, Expensed for this family in a
  fold, Add something else, Save; "8 items · $24 to you · $22 expensed"). Saving or pickup
  fixes the puppy's bag; a later change to her bag doesn't touch it. History: "Sent home
  with: 4 items". Built from the Site Manager's existing `.list`, `.tag`, `.chip` and
  `label.check`: no change to `app.css`, so no `APP_VERSION` bump.
- The family's side, `portal/family.js`: **What came home in Opal's bag** on Records from
  pickup on, while the puppy is with them (the prototype's band of `hl` rows: badge, name,
  the program's line, her button), with the disclosure when a program shows. No costs,
  origins or expense for families. Clicks count with place `bag`. Her read-only view shows
  it as they see it.
- **KennelOS** (`kennelos/bundle.js`): a new optional section `bag_items` (listed in
  `SECTIONS`), `[{ id, name, cost, expense?, origin?, product_id? }]`, matched as extras and
  products are: KennelOS owns name, cost, expense, origin and program (`OWNED.bag_items`);
  her on/off, order and button words stay hers (filled in from the program's type when it
  first arrives); one of hers with the same name is taken over the first time; one not sent
  again is hidden, never deleted; hers made by hand are never touched. Unlink makes them hers
  (`kennelos/link.js`). The linked sample's bundle 1 has three items, so the demo site has
  a bag. `kennelos-contract.md` Part C lists the section.
- **Back to KennelOS** (`portal/feed.js` `factsFor`): `bag: { items: [{ bag_item_id?, name,
  cost, expense }], cost, expensed }` on a placement once its bag is fixed, whole each
  time; an empty list when nothing went. The owner's exception to "money never goes back on
  its own" (her own cost, not a charge), noted in family-portal.md 3.4 and feed.js.
- Delete now and site close remove a family's bag; an erase keeps it with her sale records;
  merging a typed puppy record into KennelOS's moves her bag across when KennelOS's has none.
  Backups carry both tables (`SITE_TABLES`; `backup-format.md`).
- Wording: new group `bag` in `manage/wording.js`, every line on her two screens. The
  family's heading, "From {kennel}" and the Get more fallback stay in `family.js`, as on
  its other pages.
- `public/_kp/f/portal.css`: the three-column highlight row for the band (`.hl.bag`).
  **Needs a `PORTAL_VERSION` bump (4, on `main`): asked the owner.** Until then
  `versions.test.js` fails, as expected.
- Checked at 390px and 1280px against the prototype (her list, the family card, Records).
- Tests: `portal-bag.test.js` (new, 7); additions to `portal-feed` (merge), `backup` (the
  demo site's bag round-trips), `kennelos` and `linked-sample` (the new section).
  497 pass, 1 expected fail (versions).
- For KennelOS to build on its side: the plan's sections 4a (send `bag_items`, cost included)
  and 4b (record what went home as an expense on the sale).

## 2026-11-21: Home's food band, two across, with the insurance card

The owner's request, from her phone's screenshots: replace the food band's bowl icon with
her picture, set the band two across, and put an "Activate {pup}'s pet insurance" card
beside the food with a button straight to her insurance referral link.

- `portal/family.js` `foodBand`: now one or two cards in the dark band. The food card as
  before (its heading moved into the card), with her picture
  (`public/_kp/f/food-bowl.webp`, 256px, cropped from her upload) in place of the `bowl`
  icon, and the points as a ticked list instead of the three-up row (a single point sat
  alone in a third of the width). The insurance card shows when a program is set to Show
  as Insurance and has a referral link: its name, What the family does (or its
  description), its code (or the family's own), and a button (her Button wording, else
  "Activate insurance") to `/family/go/{id}?from=insurance`, so clicks count like the
  others (`insurance` added to `PLACES`, `family/files.js`). Either card shows alone, full
  width, when the other has nothing; neither, no band.
- No new breeder wording: she sets it up with the existing Recommended products fields
  and Portal settings' Show as. The family-facing lines stay in `family.js`.
- `public/_kp/f/portal.css`: `.food .duo`, `.fcard`, `.card-h`, `.ticks`, `.box.pic`; two
  across at every width (one column at the largest text size), buttons level at the
  bottom. No prototype for two across: built from the band, highlight and pill pieces.
  **Needs a `PORTAL_VERSION` bump (4, on `main`): asked the owner.**
- Checked at 390px and 1200px. Tests: `portal-steps` (the insurance card, its link, the
  picture). 497 pass, 1 expected fail (versions).

### Later the same day: the right column stacked, a third card, "protected"

- The right column is now a stack: the insurance card, then a slim card for one more
  program (the first shown with a link that isn't the food or insurance: its icon, name,
  code, and a button, her Button wording or "Shop now", counted as place `home`). With no
  third program, the insurance card grows to fill the column, its button at the bottom.
- The insurance card has her shield picture (`public/_kp/f/insurance-shield.webp`, cropped
  from her upload) and an "I've activated it" button (the same `/family/program` post as
  "I've done this" in Included with). Once the program is done (that button, Included with,
  ticking its timeline task, or her setting it): "Activated", "{pup} is protected!", the
  program's name, "Email or call them for questions about coverage or to file a claim.",
  and no buttons. It shows done even when the program has no link.
- Checked at 390px and 1200px in all three states. `portal-steps` covers the stack, the
  slim card's link, and the done state. Still needs the `PORTAL_VERSION` bump (asked).
- The owner, after: the words stay beside the picture on both cards at phone width too
  (`.food .duo.two .prodrow`: a 3.1rem picture, the name and line beside it; 3.6rem on a
  computer). Checked at 390px and 1200px.
- The owner, after: the note (her food note; the insurance's What the family does, else its
  description) moves under the picture, the name alone beside it (`.fcard .under`).
- `PORTAL_VERSION` 4 → 5 with the owner's yes (`PORTAL_FILES` 342de44b3b6c4478). 498 pass.

## 2026-11-21: no "Included with" for her referral programs

The owner, from her live Home: the food and insurance showed again under "Included with
Cash", which reads as if she gave them. Now:

- Home's list leaves out the programs already on the food band's cards (the food, the
  insurance, the slim third), and is headed "Recommended for {pup}"; with nothing left, no
  list. The Timeline's list has the same heading.
- The insurance card's eyebrow is "Pet insurance" (was "Included with {pup}"), and it shows
  "Your own code will be here once {kennel} adds it" for a per-family program, as the list did.
- Server HTML only: no portal file changed, no version bump. Tests: `portal`,
  `portal-steps` updated. 498 pass.

## 2026-11-21: three card colours in the family portal, food band above the contacts

The owner, from her live Home (dark): the food and insurance band goes above the "Questions
about {pup}? One tap" contacts; every tab but Home was one colour; alternating cards should
differ, with a third colour in the scheme, light and dark.

- A third colour, **sand** (`--sand` #EFE2C3 light, #352C19 dark; `--sand-brass` for its
  eyebrows, 4.5:1 or better), beside **paper** (the surface) and **green** (the mint, and the
  deep green of the food band). The sand page heads (`.band`) and the warm tile use it too.
  Classes `c-paper`, `c-green`, `c-sand`, `.sec.sand` (`portal.css`, "Card colours").
- The rule, also in CLAUDE.md ("Look"): each card has one fixed colour; no two cards of the
  same colour sit one above the other; a new card takes a colour its neighbours don't have.
- Timeline: sand head, groups taking turns green and paper, Recommended sand. Vet visit:
  sand, paper, green. Records: My puppy sand, Shots paper, Papers green, the bag sand,
  Contacts paper, Photos green. Stay: sand head, Skills green, updates paper and green in turn.
- Home: the vet visit's steps and What's next move from mint to sand (the food band's deep
  green now follows them), the checklist sand, Recommended sand. Fixed colours can't keep
  Home's last card clear of every stage's mix, so **Quick links** alone is green unless the
  piece above it is green, then paper (`toneOf` in `family.js`).
- `tests/portal-colours.test.js` renders Home, Timeline, Vet visit and Records at four stages,
  with and without her lists and handbook, and fails on two same-colour neighbours.
- `portal.css` changed: `PORTAL_VERSION` still 5 (on `main`), the owner asked before a bump;
  `versions.test.js` fails until then. 500 pass, 1 fail (that one).

## 2026-11-21: the portal's two mockup looks, as a prototype

The owner sent two mockups of the family portal (cream cards on green; deep green cards with
cream panels and gold). The original prototype artifact can't be published from here, so
`docs/reference/portal-looks.html` is `portal-prototype.html` from `main` plus a layer: a
stylesheet for the family screens (`The mockup look`, then `The Forest look` over it, chosen by
`html[data-look]`), and Home, Timeline, a new Vet visit page and Records redrawn, with the live
portal's four tabs. A Look switch (Forest, Cream) sits in the prototype bar. Published at
https://claude.ai/artifact/9APC1R1PumMwC9xU88etDe. Prototype only: the live portal is unchanged.
- Second pass, closer to the mockups (the owner: the vet cards and the accent curves had been
  simplified): the photo and the pup and vet tiles are one card; the waves are a tapered
  ribbon (mint with a soft echo in Cream, gold in Forest); each look has its own vet card on
  Home (Cream: the card with the clock row; Forest: one row with the stethoscope and a
  chevron); shiny buttons (gold for Upload in Forest); the vet page's art (Cream: a green
  swoosh with a mint edge and a white stethoscope; Forest: a drawn stethoscope); the reminder's
  icon in a gold ring; a Boston sketch on My puppy in Forest.
- Third pass (the owner: the waves had no graded colour, the vet swoosh was crude, and the top
  pieces showed card edges): both looks now keep the mockups' colours in dark mode (her phone
  is in dark mode, which had turned the cream cards charcoal); each wave is one curve drawn
  in seven layers, each lower and a shade on, softened, so the colour grades along it (mint
  into green in Cream, a gold band in Forest); the vet swoosh is an S in proportion, a mint
  glow under a lighter green under the deep green; Timeline's head and page and the vet
  page's head run edge to edge with no card edges (Cream's vet page is one cream sheet), and
  Home's photo and tiles sit on the page itself.
- A third look, **Current** (the owner: the live portal has drifted from the prototype in
  places): the live portal's own pages, rendered by its code for the Reeds and Opal on the
  prototype's four dates (`worker/scripts/portal-current-snapshots.mjs`, Date mocked), with
  the live `portal.css`, in a shadow root so the two stylesheets never meet. It follows dark
  mode as the live portal does; its tabs and links move between the prototype's pages.

## 2026-11-21: "Came home" on the family's pages

The owner: Records said "Went home", which is her side of it; families read it. The family's
Records card now says "Came home" (before pickup, "Coming home"), and the pup card on Home
"Came home". Her own screens keep "went home". Server HTML only, no version bump. The portal
looks prototype and its Current snapshot are updated to match.

## 2026-11-21: the portal's looks, hers to choose (migration 0042)

The owner: all three looks (today's portal, and her two mockups) available to breeders,
each choosing one, so more can be added later.

- **Migration 0042** (`0042_portal_look.sql`): `portal_settings.look`, a new column, empty
  (Classic) until she picks another. Additive; applies itself on the first request after
  the merge.
- `portal/looks.js`: the list (Classic, Forest, Cream), each with its name and a line for
  her, and its stylesheets; `lookOf` reads an unknown or missing look as Classic. Her
  Portal settings screen opens with "How the portal looks" (radio buttons; this screen's
  wording isn't in `manage/wording.js` yet, as before). `saveSettings` refuses a look
  not on the list and stores Classic as none.
- Every portal page carries her look: `data-look` and `pg-<page>` on `<body>`, and for
  Forest and Cream `looks/mockup.css` (what the mockups share) and the look's own sheet
  after `portal.css`. The handbook's cover keeps its own design in every look.
- Hooks in `family.js`, invisible in Classic (`portal.css` hides `.hico` and `.lookonly`):
  an icon before each card's title (`hh()`, four new icons: image, link, syringe, info),
  `vethead`, `remind` and `mypup` classes, and on Home in the vet visit, for a look, the
  vet card with its clock row and the vet row (Cream shows the card, Forest the row) in
  place of Classic's numbered steps.
- The art is SVG files in `public/_kp/f/looks/`: the waves (one curve in seven layers,
  graded), the swoosh, the stethoscope, the Boston, the calendar page, a gold paw.
- The looks are light only, as drawn; Classic follows the phone. The three-colour rule
  stays Classic's (CLAUDE.md updated).
- Tests: `portal-looks.test.js` (the list, picking and saving, each look's page, the
  refusal, the stylesheets and art there); two tests allow the heading icon. Checked the
  real pages in each look at 390px on the prototype's four dates (Home, Timeline, Vet
  visit, Records, Messages, Account). `PORTAL_VERSION` 5 is on `main`: a bump to 6 is
  needed for `portal.css`, the icons and `looks/`; asked. 503 pass, 1 fail (that one).

## 2026-11-21: the vet visit once it's done; Next up wraps

The owner: once the visit is done, the vet card should change or go; it's for the first
week. And in the new looks, Next up's title ran off the tile.

- `family.js` `vetDone`: the record accepted, or uploaded with pickup over a week ago.
  Then the Vet visit tab gives way to Handbook (or Photos, with no chapter shown); with
  nothing uploaded it stays, the contract still asking for it.
- The Vet visit page once a record is in: "{pup}'s vet visit is done" (accepted) or "Record
  uploaded: thank you", seen when and where, uploaded when, who accepted it, View the
  record; no booking form, and "Upload a different record" only until she accepts it.
  The page keeps its look's styling (`page: 'vet'` on the frame) with no tab lit.
- Her booked visit reads as a day ("Booked for Thu, Dec 24, 10:30 am", `bookedWords`),
  not the raw "2026-12-24 at 10:30", on Home and the vet page.
- `looks/mockup.css`: Next up's title wraps; only the countdown keeps to one line.
- The prototype (all three looks) does the same; the Current snapshot now has the record
  as a file (`portal-current-snapshots.mjs`). Test: `portal-looks.test.js`, the vet visit
  once done. 504 pass, 1 fail (the version check).

## 2026-11-21: the live handbook in the prototype

The owner: check the handbook tab live now and add it to the sample and the prototype.
The handbook on `main` is the flipbook (`family.js` handbookPage, `public/_kp/f/handbook.js`):
a cover with Boop to open, pages turned by arrows, swipe or keys, Contents with search.
- `worker/scripts/portal-current-snapshots.mjs` now gives the Reeds a sample handbook of
  four chapters (The first night, Crate and potty training with a page break, Feeding with
  a program link, Boston basics; 8 pages) and renders the handbook page too.
- The prototype (`docs/reference/portal-looks.html`): the Handbook is the live page in
  every look (it keeps its own design live too), with `handbook.js` itself running in the
  shadow root; Handbook leads the mockup looks' Quick links, as live. Checked: the cover,
  opening it, turning pages, Contents.

## 2026-11-21: PORTAL_VERSION 6

With the owner's yes: `PORTAL_VERSION` 5 → 6 (`PORTAL_FILES` e692d88236fdb4b2), for the
three card colours, the looks (`looks/`, the heading icons) and the Next up fix, so phones
pick them up at once. All tests pass.

## 2026-11-21: Forest and Cream drawn as the prototype draws them

The owner: make the live portal's Forest and Cream looks match the prototype
(`docs/reference/portal-looks.html`) exactly. Before, the looks were stylesheets over
Classic's markup; the prototype's mockup layer uses its own markup (mkHome, mkTimeline,
mkVet, mkRecords, mkCard, the waves and the art), so the two could only come close.
- `src/portal/family/mk.js` (new): Home, Timeline, Vet visit and Records in a look other
  than Classic, in the prototype's markup (section.mk with its header strip, the herocard
  with the wave, the peach tile, the vet card and vet row, food and insurance side by
  side, Timeline's green head over a cream page, the vet sheet with the swoosh or the
  drawn stethoscope, My puppy with the Boston), fed by what `family.js` already works out.
  The gradients and the prototype's icon drawings go on look pages only (`LOOK_SPRITE`,
  ids `i-k-*`); the header has Messages first and the tabs a row of four (`frame`).
  Classic's pages are untouched: all 20 sample pages' HTML byte-identical and their
  light and dark screenshots identical to the pixel, before and after.
- Uploads in the looks are the prototype's button (a label with a hidden file input); it
  sends itself once a file is picked (`portal.js`, `data-send`), with a `<noscript>`
  button. The looks' checklist is the prototype's ticks, each a form that sends itself
  (the box first, then a hidden done=0, so an unticked box sends 0).
- `public/_kp/f/looks/`: `mockup.css` and `forest.css` are now, for the four pages
  (`body.mkp`), a port of the prototype's CSS (its base and its mockup layer, rule for
  rule, each selector keeping its weight: `.fam X` is `.mkp.in X`, a plain `X` is
  `.mkp X`, the Forest rules `body[data-look="forest"].mkp.in X`), then the few rules
  the live markup needs (the header's, the forms', a live `.facts`, `.task`, `.eyebrow`,
  `.gallery` rule reset). The other pages keep the looks' earlier rules, scoped to
  `:not(.mkp)`. `cream.css` is almost empty: Cream is mockup.css's default. The art
  `.svg` files are gone (the art is inline now).
- `scripts/portal-looks-check.mjs` finished: the component map, computed styles of each
  component and (where both are built alike) of every element inside, a pixelmatch port
  per component and for the whole page, a table (check.md, check.json) and exit 1 on a
  fail. Final run (2 looks × 4 dates × 4 pages × light and dark, against the prototype in
  light): 1228 of 1228 rows pass; no computed style differs anywhere. 560 components with
  the same content on both sides are held to pixels too: the most any differs is 0.75%.
  576 rows whose content differs are held to their styles (not size or pixels), with
  their parts measured on rows of their own; 28 are KNOWN (on one side only, on purpose).
  The whole Vet visit page is 0.0% apart; Home, Timeline and Records differ as pages by
  their content (Home 29–44%, Timeline 7–22%, Records 19–36%).
- Content that differs on purpose, listed in the checker (KNOWN) or measured by its parts:
  the hero photo (Opal live); times ("11:00 AM EST"); Recommended, Read next and the slim
  third food card (AKC) live; the food card's three ticks and food name; the contacts
  heading ("Questions about Opal? One tap"); Oct 28 (the prototype's birthday tile, live
  all caught up); no status band (the sample has no status page); the checklist's forms;
  the vet page's wording; Records' Microchip and Colour rows; the header's message and
  account icons.
- Tests: `portal-looks.test.js` for the new hooks (body.mkp, the sprite, herocard, waves,
  the vet card and row, Upload's form, the header's order, the timeline head, the vet
  sheet, My puppy; none of it in Classic) and the checklist's ticks. All pass but the
  version check: `PORTAL_VERSION` is 6 on `main`, so these changes need 7. **Asked the
  owner.** No migration.

## 2026-11-21: PORTAL_VERSION 7

With the owner's yes: `PORTAL_VERSION` 6 → 7 (`PORTAL_FILES` d790fbdbc776259e), for the
looks drawn as the prototype (`looks/`, the art files gone) and Upload and the checklist
sending themselves (`portal.js`), so phones pick them up at once. All tests pass (506).

## 2026-11-22: Fix: Link KennelOS answered "Something went wrong" on production

The owner reported the Site Manager's Link KennelOS screen (`/s/<site>/kennelos`) failing
on `nineacresbostons`. Its Worker log: `D1_ERROR: too many terms in compound SELECT`, from
`waitingForDevice` (`kennelos/link.js`), which asked ten tables at once as one `UNION ALL`
of ten SELECTs. D1 allows 5; node:sqlite in the tests allows 500, so the tests never saw
it. It runs only for a site with no device linked, so every site not yet linked hit it
(on opening the screen and on Show a link code).

- `waitingForDevice` now ORs one `EXISTS` per table: the same answer, no compound SELECT.
- The tests' D1 stand-in (`tests/helpers/d1.js`) now refuses a compound SELECT of more
  than 5 terms, as D1 does (beside its 100-variable limit), so this can't come back
  unseen. The other two compound SELECTs in the code (2 and 3 terms) are within it.
- All tests pass (506). No migration, no version bump (Worker code only).

## 2026-11-23 — A returned pup's next family gets its health records

The owner reported a pup returned and placed with a second family whose portal was missing
the pup's shots and deworming. KennelOS sends each health record by its KennelOS id (one
event on the dog), so both families' placements carry the same ids. A tombstone (a record
she removed from a placement, or every record of a family she deleted for good) was by that
id alone, site-wide, so it kept those records from the pup's next family too.

- Health tombstones are now per placement: `<placement's KennelOS id>|<record id>`
  (`feed.js healthTombstoneId`), written by `store.removeHealthRecord` and
  `feed.tombstoneStatements`. `healthTombstoned` reads them, and an older one (the id
  alone) only for the family it was written with or, with none, a placement that was there
  when it was written, so the second family's records arrive at KennelOS's next feed with
  nothing for her to do. Giving a family back still lifts all of its tombstones.
- Test in `tests/portal-feed.test.js` (fails on the old code). All tests pass (507). No
  migration, no version bump (Worker code only).

## 2026-11-23 — The sale's registration and screening tests in the portal

The owner asked for the family's portal to show the registration they bought (the sale's,
not the puppy's planned one on the website), including for a pup resold after its first
family was deleted, and for KennelOS's screening tests to reach families.

- **Migration 0043** (`portal_registration_screening`): `portal_placements.registration`
  and `portal_health_records.kind`, two new columns, additive. Applies by itself on the
  first request after the deploy.
- Feed: a placement's `registration` (limited, full, co_own, none); a health record of
  type `screening`, kept as type `other` with kind `screening` (the table's type check is
  unchanged) and read as "Screening test" (`store.recordKind`). A feed without a
  registration (an older KennelOS) leaves the one there.
- The link facts carry `portal_takes: ['registration', 'screening']` (`kennelos/link.js
  PORTAL_TAKES`): KennelOS sends these only to a Worker that lists them, so this goes live
  before KennelOS sends anything new.
- Records page: Registration is the placement's (`store.registrationWords`: Limited, Full,
  Co-own, Unregistered, with the registry), else the puppy's on the website or kept, as
  before. A pup placed after its litter left the website has no puppy there; the
  placement's own registration still shows. History names it Registration.
- Linked sample feed-1 uses every registration and a screening test. Tests in
  `portal-feed.test.js` and `kennelos.test.js`. All pass (508). No version bump (Worker
  code only; no file under `public/_kp/`).

## 2026-11-23 — The pup's own health tests in the portal

- Feed: health records of type `health_test` (the pup's genetic, OFA / PennHIP and
  breed-specific tests from KennelOS, "PRA-prcd: Clear"), kept as type `other` with kind
  `health_test` (migration 0043, same file), read as "Health test". She removes any one
  from a family with Remove, as any record; it stays removed for that family only.
  `portal_takes` now lists `health_tests`. Tests in `portal-feed.test.js`; all pass (509).

## 2026-11-23 — Removing a photo from a family's portal

The owner: a photo of the wrong pup reached a family, and a photo she removes from the
website stays the family's (2026-11-19), so she had no way to take it off. Now she can,
for one family at a time.

- Her family screen has a **Photos of {name}** card (`portal/admin.js`): every photo the
  family sees, each a link to the full photo, with **Remove**; a **Removed (n)** fold-out
  lists the ones she took off, each with **Put back**. Routes `photo/<id>/remove|back`
  under the family; Remove only takes a photo that family sees.
- **Migration 0044** (`portal_pup_photos.removed_at`, one new column, additive; applies by
  itself on the first request after the merge). `portal/pups.js` `removePhoto` writes the
  row with `removed_at` (pinned or not), `putBackPhoto` clears it; `photosOf` leaves
  removed ones out, the website's live photos included, so Home, Photos, Records and the
  photo files all drop it; `keepStatements`' INSERT OR IGNORE never brings one back.
  `keptPhotoIds` skips removed rows, so a photo she also removes from the website goes with
  the nightly cleanup unless another family keeps it.
- Only that family's portal changes: the photo stays on the website and tagged as it was.
  If it's tagged with the wrong pup there too, she untags it in her photos.
- Wording in `manage/wording.js`, group `portalphotos` (title, hint, empty line, Remove,
  Removed, Put back, and the two notes). Reuses the Site Manager's `.lib-grid` / `.lib-ph`,
  so no CSS change and no version bump.
- Tests in `portal-kept-pups.test.js` (remove while the website shows it, another puppy's
  photo refused, the litter leaving doesn't bring it back, put back, the main photo, and the
  cleanup). All pass (511).
- Fix, same day: the photos' Remove buttons sat below the card, hidden under the next
  one, because `.lib-ph` was on the link (inline, so its square didn't hold). The square
  is now a `div.lib-ph` with the link inside. Checked at 390px. No CSS change, no bump.

## 2026-11-24: Offspring cards drawn at the photo's full height

- The light cards (`.cocard`: a dog's Offspring, the Co-owned section, a dogs block in
  the Light style) drew their photo as tall as its `height` attribute (1067px for Opal on
  Logan's and Apollo's pages), zoomed in and blurry, because `.cocard > img` had
  `aspect-ratio` but no `height: auto` (the same thing `.story img` notes). Added it; the
  photo is 4:3 again. Checked on the live page at 390px and 1280px; no other image on the
  page was stretched. Site template bumped to `ASSET_VERSION` 30 (owner said yes).

## 2026-11-24: Health tests' short names on cards

- Long test names ("Juvenile Hereditary Cataract (DNA)") wrapped on the parent cards
  and pushed the result onto its own line. The owner sets a short name per test on the
  Dogs screen of the site's admin view ("Health tests' short names"): one box for each
  test name the site's dogs have, and Back to default.
- Stored in the site's rules (`rules.short`, `content/rules.js`), keyed by the test's
  name in lower case with spaces evened (`testKey`), not on the results: KennelOS
  rewrites a result's name at every update, and one short name covers every dog with
  that test. `rulesFor` carries the list as is (`over()` keeps only fixed keys). At most
  16 characters. No migration.
- Used on cards only (the owner, 2026-11-24): a parent's card on a litter page and a
  dog's card (flip and beside), through `testRow()` in `render/parts.js`, with the full
  name as the row's `title`. The dog's own page, the Site Manager, the portal and
  KennelOS keep the full name.
- Owner-only screen, so its wording isn't in `manage/wording.js`.
- Test in `rules.test.js` (rows listed, saved, cards short, the dog's page full, a
  KennelOS resend, too long refused, Back to default). Checked at 390px. Rides on the
  same `ASSET_VERSION` 30 bump as the light-card fix.

## 2026-11-24: Dog cards: details always, two columns where a card would grow

- A dog card's back (the `tests` item, now "Details and health tests") dropped the dog's
  sex and colour once it had health results; registry and weight sat above them unlabelled.
  It now always shows **Details** (sex, colour, registry, weight), then **Health testing**
  where it has results. Same item wherever she places it: flip front or back, Photo beside
  details, Featured dog. Her item settings and each result's shown/hidden still decide
  what appears.
- Registries' short names (the owner, 2026-11-24): a second card on the Dogs screen of
  the site's admin view, a row per registry the site's dogs and puppies have, stored as
  `rules.regshort` the same way as the tests' `rules.short` (no migration). Cards only:
  a dog's card, a puppy's card, a parent's card on a litter page (`regShort`,
  `registryRow` in `render/parts.js`, full name as the row's `title`). Pages keep it as
  written. Owner-only screen, so its wording isn't in `manage/wording.js`.
- Two-column lists (site.css "Two-column lists", site.js `fitCols`): each list marked
  `data-cols` (a dog's two, a puppy card's Details) goes in two columns only where one per
  line would make the card grow: a flip side taller than its other side and 430px, or the
  words of Photo beside details / Featured longer than the photo. Longest list first, then
  the next while it still grows. A row too long for half the width (measured in the
  browser, so it follows the card's real width) and an odd short one left over (the
  longest of them) take the whole line, before the short ones (the owner: long rows
  first), within their own list. A dotted line runs between the columns, drawn by the
  left column's rows (`.l`, down to the last pair `.end`). Fewer than two short rows: one
  per line. If the words would then fill under 30% of the card's height (the photo's, or
  the flip card's other side), back to one per line. Runs on load, fonts, a width change
  and the Show filter. Without the script, one per line as before.
- Checked in Chromium at 390px and 1280px: a test page of every card type (flip front
  and back, Photo beside details, Featured dog, light, puppy flip, parent cards) with five
  display settings each and six seeded dogs (everything with full test names, the same
  with short names set, Millie-like, three tests, none, the bare minimum). Fixed on the
  way: the 30% check first measured the lists against the card, which undid columns on
  stacked phone cards and on Featured with a long bio. No face is cut off at either
  width. Cards in one row on a computer can differ in height (as before, when a dog with
  many results grew its card).
- Test in `rules.test.js`. Site template bumped to `ASSET_VERSION` 31 (owner said yes).

## 2026-11-24 — Plan: the family portal for more than one breeder

The owner asked what it takes to offer the portal to other breeders. Written up as
[`plans/portal-multi-breeder.md`](../plans/portal-multi-breeder.md), from a read of the code:
every `portal_*` table already carries `site_id`, the switch, settings, jobs, feed and
sign-in are per site, and the demo site runs a second portal. What's left is product work:
phase 1's gate and decision 9 first, then site-builder steps 5, 6 and 2.4 (the portal's
build and wording as settings), a setup flow, the choices that fit only her (vet rules, time
zones), KennelOS's side for each kennel (to check there), and possibly portal-only sites.
Four questions for the owner. No code, no migration, no version bump.

## 2026-11-24: Flip cards in a row match; spaces in breed, role, titles and tags

- Flip cards in one row are as tall as the tallest (the owner, 2026-11-24). A card straight
  in a grid already stretched; one inside a wrapper (the Dogs block's Show filter,
  `<div data-sex>`) didn't, so the Dogs page's rows were uneven on a computer.
  `.grid > div > .flip { height: 100% }`. Checked on the Dogs page at 1280px: a taller
  card's row-mates stretch to it.
- Breed and role beside titles ("Foundation dam" "CH GCH…") and tags ran together with no
  space on Featured and on a flip card's back: `.line1` had styles only in the front's
  caption and Photo beside details. A base `.line1` (flex, wrap, a gap) under those.
  Already there before the two-column work.
- Both in the site template; `ASSET_VERSION` 31 isn't on `main` yet, so no second bump:
  fingerprint updated beside 31. Checked on the card test page at 390px and 1280px.

## 2026-11-24: Ready-made insurance task due 1 day after pickup

The owner wants insurance due the day after pickup, not three days. The ready-made
insurance task (`READY_TASKS.insurance` in `portal/steps.js`) now starts at 1 day after
pickup. Only new tasks added from the picker change; existing tasks keep the day she set,
and she changes those on her Timeline screen. The suggested timeline for a new site still
puts its insurance step at 5 days ("within a few days of pickup"); left for the owner to
decide. Due dates count whole days from the pickup date, not hours. No migration, no
version bump.
## 2026-11-24: Handbook tables, tick boxes and urgent notes

The breeder's printed handbook (AK Boston Terriers Puppy Parent Handbook, 32 pages) is
mostly tables, tick-box checklists and red warning boxes, which the chapter format couldn't
show. Added to `portal/handbook.js` (`bodyHtml`, `plainText`, `htmlToText`):

- **Tables:** lines starting `|`. A `|---|---|` line under the first row makes it the
  headings. Each cell carries its column heading (`data-h`). A `|` inside a link or photo
  tag doesn't split a cell. A missing cell is blank, and cells past the headings are dropped.
- **Tick boxes:** `- [ ] ` (or `- [x] ` ticked), as `ul.check`. They only show a box: ticking
  isn't saved anywhere, so a family can't tick them on screen.
- **Urgent notes:** `!> ` lines, the note in a box in red (`.note.warn`).
- Search reads a table row as its cells joined with " · ", and drops the markers. An HTML
  file's `<table>` and checkboxes come in as the same format.
- `portal.css`: a table is a tan heading band, the first column bold, rows striped. On a
  narrow page it stacks each row as a small card with the column headings over the words,
  using a container query on `.tbl`, so half of a desktop spread stacks too when it's
  narrow. The paper stays light in dark mode, so one set of colours. The handbook is
  `body.bare` with no `data-look`, so the looks don't touch it.
- Breeder-facing wording: `handbook.body_hint` in `manage/wording.js` and `CLAUDE_PROMPT`
  (still in `handbook.js`) describe the new styles, and the prompt no longer says "no
  tables". Both are drafts for the owner to reword.
- Checked by uploading her 20 chapters (written from the PDF) through the Site Manager and
  opening them as a family, in Chromium at 390px and 1280px with the flipbook running.
  Test in `portal-handbook.test.js`.
- `PORTAL_VERSION` bumped to 8 (owner said yes), fingerprint updated.

## 2026-11-24: Handbook: a swipe turns the page on a phone; the book fits under her preview band

The owner, in "See their portal" on her phone: the handbook wouldn't flip. Two causes,
both in `public/_kp/f/`:

- **A finger swipe never turned a page, for families too.** A page's words (`.content`)
  scroll on their own, and a scroll container stops `touch-action: pan-y` on `.book` from
  reaching it, so the phone took the swipe as a pan and sent `pointercancel` with no
  `pointerup`. `handbook.js` now reads a finger's swipe from `touchstart`/`touchend`
  (which still arrive), keeps pointer events for a mouse or pen, and `.content` gets
  `touch-action: pan-y` too.
- **In her preview the arrows were off the bottom of the screen.** The reader was a full
  `100dvh` tall under the read-only band, and the page can't scroll. The handbook's
  `body.bare` is now a column, band then book, and the cover and reader take the height
  that's left.
- Checked with real touch swipes (CDP touch events) on an emulated Galaxy S9+, as a family
  and through her view link: a swipe turns the page, and the arrows sit at the foot of the
  screen in both, at 1280px as well. Before the fix, the same swipe did nothing in either.
- `PORTAL_VERSION` bumped to 9 (owner said yes), fingerprint updated.

## 2026-11-24: The Vet visit tab goes 24 hours past the deadline; she can decline a record

The owner: many families never go to the vet or never upload the record, so the Vet visit
tab mustn't stay in their tab bar for good. Before, it went only once she accepted the
record, or a week after pickup with a record in.

- **The rule** (`portal/vet.js` `vetTabShown`): the tab shows until 24 hours past the vet
  deadline. A record in (uploaded and not declined, or accepted) takes it away at once. One
  she declines brings it back for 24 hours past the later of the deadline and her
  declining. Before pickup there's no deadline, so it shows. Its place goes to the
  Handbook, else Photos, as before (`family.js`, `fam.vetTab`). The Vet visit page still
  opens from Home's links, with no tab lit.
- **Home's reminder:** none added. Once the vet days are over, Home's tile already says
  "Upload the vet's record on the Vet visit page" with a link, in Classic and the looks,
  whenever no record is in.
- **Declining** (migration **0045**, `portal_placements.proof_declined_at`, additive): a
  Decline it button beside Accept on her family screen, with a hint, and a confirmation
  that tells her to message them about what's missing. Her status word is "Record
  declined" (in red, as trouble). A declined record leaves her "to review" list. The
  family's pages read as if no record were in (`asFamilySees` in `family.js`): the vet
  visit asks for it again, and nothing on their side says it was declined. Their next
  upload clears it, and so does her accepting it after all. The file is kept and is still
  in her History ("Vet record declined"). `merge.js` carries the column with the other
  vet fields.
- Wording: the family screen isn't in `manage/wording.js` yet, so the button, the hint
  (`portal/admin.js`) and the confirmation (`admin/parts.js` NOTES, beside "accepted")
  sit with that screen's other lines, ready to move.
- Tests: `portal-looks.test.js` now checks the new rule step by step (uploaded: gone at
  once; nothing uploaded: still there 8 hours past the deadline, gone at 25 hours with
  Home's line; declined: back, with their pages asking again; a day later, gone) and
  declining, uploading again and accepting in the store. Her card checked at 390px.
- No file under `public/` changed, so no version bump. The migration applies itself on
  the first request after the deploy.
## 2026-11-24: Family portal phase 1's gate passed

The owner confirmed phase 1's gate is met: one litter run from signed contract to the vet
visit with no fixes by hand ([`plans/family-portal.md`](../plans/family-portal.md) section 6).
Marked in the plan, STATUS and the multi-breeder plan's gates (2.1), where decision 9 is now
the only gate left. No code, no migration, no version bump.

## 2026-11-24: More than one breeder started; site-builder step 2.4, first slice

- The owner answered the multi-breeder plan's four questions
  ([`plans/portal-multi-breeder.md`](../plans/portal-multi-breeder.md) section 5): decision 9
  parked while she approves every breeder by hand; a new breeder starts blank and the owner
  copies a handbook, bag, checklist or timeline from any site when it fits; no portal-only
  sites (2.7 dropped for now); the portal stays her switch, no self sign-up.
- Step 2.4 (the portal's screens for the breeder into the owner's list), first slice: new
  `manage/wording-portal.js` (`PORTAL_LINES`, four new screens in the owner's editor: Portal:
  what needs you on Today; Families and adding a family; the Portal tab; the notes after a
  change), read into `wording.js` with its other screen lines. Moved: every portal item on
  Today's Needs you, the vet visits and recent activity lists, "Last from KennelOS" and its
  "how long ago", why a placement closed, the Families tab (filters, list lines, pills, recently
  deleted, erased), the waitlist side, Add a family, the puppy fields a family's screen shares
  with it, the Portal tab's list, and the portal's notes after a change and "Not saved:".
  `sayHtml` (`admin/parts.js`) for a line with a drawn name (the portal's address in bold).
- Today's wording by default: the moved screens render the same text as before (compared
  before and after, rendered). Test in `wording.test.js`. No migration, no version bump (no
  file under `public/_kp/` changed).
- Still in the code, for the next slices: a family's screen (pickup, vet visit, records,
  contract, history, messages, loss, stays, extras), Portal settings (with the vet rule's words,
  `VET_RULES`, and the vet statuses in `portal/vet.js`, which families read too), the checklist
  and timeline screens (`admin/templates.js`, `portal/steps.js`).

## 2026-11-24: Site-builder step 2.4, second slice: a family's screen

- A family's screen in the owner's list (`manage/wording-portal.js`), as three screens in her
  editor: **Portal: a family's screen** (`pf.*`: KennelOS's line and newer values, emails and
  invite, pickup, the loss note, the vet visit, the checklist and timeline as this family has
  them, programs, health records, contract, the puppy's details, life status, the loss form,
  change, delete, erase), **Portal: a family's extras and stays** (`pstay.*`), and **Portal: a
  family's reminder log, history and messages** (`plog.*`, `phist.*`: the reminders' names and
  results, each History field, who changed it). `familyScreen` in `portal/admin.js` rewritten
  around a `t(key, vars)` helper; the page's title and Not found too.
- Today's wording by default: rendered before and after with a family not picked up, one
  picked up with a record and a message, a stay with an update, a loss and a backed-out family;
  the text is the same. Test in `wording.test.js`. No migration, no version bump.
- Still in the code, shared with other screens and moved with them: the vet status words
  (`portal/vet.js`, families read them too) and `VET_RULES`, the record kinds
  (`store.js` `RECORD_TYPES`), the program statuses (`steps.js` `PROGRAM_WORDS`), the skill
  levels (`stays.js` `LEVELS`), the step fields and ready-made tasks (`admin/templates.js`),
  the suggested-change labels (`admin/parts.js` `SUGGEST_LABEL`), and the loss note's
  starting draft (`account.js` `lossDraft`, words the family reads once she sends them).

## 2026-11-24: Site-builder step 2.4, third slice: Portal settings, the checklist and timeline, Today and the Dogs tab

- In the owner's list (`manage/wording-portal.js`), four more screens: **Portal: Portal
  settings** (`pset.*`, the looks `plook.*`), **Portal: the go-home checklist and first-weeks
  timeline** (`ptpl.*`: the screens, the step fields, the ready-made task form, "5 days after
  pickup", the puppy's-name warning, the suggested registration task), **Portal: the Dogs tab**
  (`pdogs.*`), and **Portal: words her portal screens share** (where a vet visit stands
  `pvet.*`, the vet rules `pvet.rule.*`, what a KennelOS value is for `psug.*`, program statuses,
  skill levels and record kinds as she picks them `pchoice.*`). On **Portal: what needs you,
  on Today**: the tabs' names (`ptab.*`), the line under Today's date, the going-home cards
  (`phome.*`), and "Last from KennelOS".
- `vetStatus` (`portal/vet.js`) now gives a `key` beside its word; her screens say the owner's
  word for it, and compare keys, not words. The families' pages still read `VET_RULES`, `LEVELS`
  and `recordKind` as before (their wording isn't in the owner's list). The tabs take her
  wording through `sitePage` (`manage/index.js`), which now passes `say` to `nav()`.
- Today's wording by default: rendered before and after (Portal settings, the checklist and
  timeline with a suggested task and a named-puppy warning, Today with pickups today and in
  three days, the Dogs tab); the text is the same. One test changed for an encoding only:
  the named-puppy warning's quotes are now written `&quot;` (`portal-steps.test.js`); the vet
  test reads the new `key`. Test in `wording.test.js`. No migration, no version bump.
- Left for the last slice of 2.4: the portal's errors that tell her what to fix (`PortalError`
  messages across `portal/*.js`, about 120; some are the families' too). The ready-made tasks
  and suggested lists (`steps.js`) are starting content she edits, not her instructions: they
  become the template's (site-builder step 6).

## 2026-11-24: Merged the Vet visit tab branch into step 2.4's

- Brought in `main` (handbook tables, tick boxes and urgent notes; `PORTAL_VERSION` 8) and
  `ccr-4b3202a9-amiv4s` (the handbook's swipe, `PORTAL_VERSION` 9; the Vet visit tab's 24 hours
  and Decline it, migration 0045). This branch adds no migration of its own, so 0045 stays the
  one migration it carries.
- That branch was written on the screens before their wording moved. Resolved by keeping its
  feature in the owner's list: `pf.decline`, `pf.decline_hint`, `pf.declined` (a family's
  screen), `pnote.declined`, `phist.proof_declined_at`, and `pvet.declined` ("Record declined",
  with the key `declined` in `vetStatus`); Today's "Vet record to review" skips a declined
  record, as it wrote. Its `vetTabShown` kept as written. Her screen's side tested in
  `wording.test.js` (Decline it, its note, the status, History, her wording). 516 tests pass.
- Its error "No vet record to decline yet." stays with the portal's other errors, the last
  slice of 2.4.

## 2026-11-24: Health results grouped by kind on cards

- The owner (from the breeder, with screenshots of Abe): on a dog's card, its health
  results came in her own order (BAER, DM, CMR1, JHC, HUU, Patella) while its page groups
  them by kind. Now, with Group health results by kind on (her Kennel details switch), a
  card lists them in the same kind order as the page (the owner's order of kinds, Dogs
  screen), with **no heading over each kind** (the owner: don't display the kind on the
  card). One function for both, `healthGroups` (`render/parts.js`); the page's
  `healthLists` uses it. Parent cards' first three follow the same order. Switch off: as
  before.
- Each card row carries its kind (`data-kind`, not shown; the owner said keep it) so the
  two-column lists keep a kind together (`site.js` `twoCols`): each kind's long rows first,
  then its short ones in pairs, its odd one out on a whole line, so no pair mixes two
  kinds. Where that would still leave the card growing and mixing the kinds makes it
  shorter, they mix (the column rules come first). Details lists, and results with one
  kind, lay out exactly as before.
- Checked in Chromium at 390px and 1280px on the AK sample's Dogs page with Abe's six
  tests entered out of order: DM | CMR1, JHC | HUU, BAER | Patella at both widths; with
  three genetic tests, CMR1 takes the line and DM | JHC, BAER | Patella follow. Test in
  `fields.test.js`.
- Template files changed (`site.js`, a note in `site.css`): **needs `ASSET_VERSION` 32**
  (31 is on `main`); asked the owner. Until then `versions.test.js` fails, as expected.
  No migration.
- `ASSET_VERSION` 31 → 32 with the owner's yes (`TEMPLATE_FILES` 8a878cad14f459a1). 516 pass.

## 2026-11-25: A tag as a dog card's ribbon; tags and Origin on a dog's page

- The breeder (screenshots of Abe, an import): wanted Import on his card as the ribbon
  across the photo, and on his page. A dog's tag (by rule, or one she can choose) now has
  a switch on the owner's Tags screen, **Ribbon across its card's photo**: the first such
  tag a dog has runs across the front photo of its flip card, in the pup card's `.ribbon`,
  whether or not the card shows the Tags item (`render/parts.js` `dogCard`). Stored as
  `ribbon: true` on the tag in `build.tags` only where on, so stored tags are unchanged
  (`content/tags.js`); the checkbox is read only where the tag's words were posted too.
  Pups' tags have no switch (a pup card's ribbon is its status). Light cards and photo
  beside details have no ribbon, as before.
- A dog's page: **Tags** is now a page part (`PROFILE_ITEMS.dog.tags`, beside the photo
  when switched on, `PROFILE_HOME`), and **Origin** a fact (`PROFILE_FACTS.dog.origin`,
  "Import • Romania", the cards' words). Both off by default, so live pages read as before;
  the owner turns them on in a dog page's settings.
- Origin is a detail (the breeder): on a card face with both Details and Origin, it's the
  last Details row, not a row of its own after View profile (`faceOf`). On a face without
  Details it stays its own row.
- She said Tags was on but showed nothing: rebuilt her case (an imported dog, an Import
  tag with Import = yes) and the pill draws; her screenshot's card had Tags on neither
  face, so it's likely ticked on another block or card style. Said so.
- No template CSS or JS changed (the ribbon's style is already there), so no version bump;
  no migration. Test in `tags.test.js`. 517 pass.
- Follow-up: tags still not showing for the breeder. Traced rule → snapshot (`publish.js`
  `tags: cleanTags(build.tags)`) → `tagsOf` (`content/fields.js`) → `tagPills` → the card
  item; the preview renders the same `buildSnapshot` the Tags screen counts from. The one
  gate that differs: `tagsOf` drops a tag with no words, while the screen's "On 1 now"
  line doesn't, and the empty words box showed a grey "Champion" placeholder that reads as
  filled in. The screen now says, in red on the tag, that a tag with no words shows
  nowhere; the placeholder is "Type its words". Rebuilt with words "Import" on an imported
  dog, the pill and the ribbon draw.
- Then the real cause, from her screenshots (Tags on the front, the tag with words "Import",
  an empty gap where the pill should be): her site's pill style is a wavy one. The Wavy
  ribbon and satin styles masked each pill with a `data:` SVG, and the site's CSP
  (`SITE_CSP`, `img-src 'self'`) blocks `data:` images, so every pill in those styles (tags,
  pup statuses, looking for a home) took its space and drew nothing. Reproduced in Chromium
  with the site's CSP; the other three styles were fine. The wave is now a file beside
  site.css (`public/_kp/t/ak/wave.svg`, as the vine's are); with the CSP, both wavy styles
  draw. Not too many card items: the card grows to fit them.
- Template files changed (`site.css`, new `wave.svg`): **needs `ASSET_VERSION` 33** (32 is on
  `main`); asked the owner. Until then `versions.test.js` fails, as expected.
- `ASSET_VERSION` 32 → 33 with the owner's yes (`TEMPLATE_FILES` 84a3015ba100876f). 517 pass.

## 2026-11-25: Site-builder step 2.4, last slice: the portal's errors

- The errors her portal screens show after "Not saved:" are in the owner's list: a new
  screen in her editor, **Portal: what to fix when a portal form isn't saved**
  (`error.portal.*`, 76 lines: Portal settings, a family and its emails, the puppy and
  pickup, the vet visit, health records, life status and files, messages, a loss, erase,
  delete and merge, the checklist, timeline and programs, extras and stays).
- How: as her other screens' errors (`manage/wording.js` `MESSAGES`, `sayMessage`), the code
  that finds the problem keeps today's words, since the families' pages say some of the
  same ones and the tests read them. The list is `PORTAL_ERRORS` in
  `manage/wording-portal.js`, each line's pattern made from today's words (a name in
  braces matches the part that changes: `{address}`, `{addresses}`, `{extra}`, `{skill}`,
  `{max}`, `{example}`). Her screens say them through one place, `errorBox`
  (`portal/admin/parts.js`), so Portal settings, Add a family, a family's screen and the
  checklist and timeline all take them. The handbook's and bag's errors were already keys
  and pass through as they are.
- Left out, as on her other screens: KennelPort itself failing (the portal not set up,
  invites that couldn't be sent), the families' own errors (their vet booking, messages
  before pickup; the families' wording isn't in the owner's list), the two the Families tab
  swallows (Undo, Let KennelOS send them again), and the ones only a changed form could
  cause ("Unknown list.", "Unknown value.", "Unknown address format.").
- Today's wording by default: tests throw real errors from the portal's code and check
  each says itself by default and the owner's line when she has one; her screens checked
  through the routes (Add a family, a family's emails, Erase, Portal settings). 518 pass.
- With this, **step 2.4 is done**: every portal screen of hers and its errors are in the
  owner's list. The ready-made tasks and suggested lists (`steps.js`) are starting content,
  for step 6. No migration, no version bump (no file under `public/_kp/` changed).

## 2026-11-25: The family portal's tabs: five, the handbook always there

- The owner: the families' bottom bar can take five tabs (her Site Manager has five), and
  the handbook should be second from last and always there, not waiting for the Vet visit
  tab to go. One function, `tabsFor` (`portal/family.js`), by stage:
  - with her handbook (a chapter families see): Home, Timeline, Vet visit, **Handbook**,
    Records; once the Vet visit tab goes, **Photos** takes its place;
  - during an extended stay, Stay in Timeline's place, as before;
  - with no handbook: Home, Timeline, Vet visit, **Photos**, Records, then four once the
    vet tab goes (Photos in its place);
  - after a loss before pickup: Home and Photos, as before.
  Photos was already a page (`/family/photos`) and in the plan's five tabs (section 7.2).
  The handbook still opens full screen with its own "Back to the portal".
- Forest and Cream drew the tabs as a grid of four, so a fifth wrapped to a second row; now
  one row of equal columns, as many as there are (`looks/mockup.css`). Classic's tabs
  already shared the row. Checked at 390px in all three looks, before pickup and later:
  five tabs, no label cut (76px each in Classic, 72px in the others).
- Tests: `tabsFor` by stage; the vet tab's test reads Photos as the fifth. No migration.
- `looks/mockup.css` changed: **needs `PORTAL_VERSION` 10** (9 is on `main`); asked the
  owner. Until then `versions.test.js` fails, as expected.

## 2026-11-25: Site-builder step 6: the family portal's timing rules

- The owner: no templates (step 5 descoped; every breeder builds from the standard), and
  the portal won't be customized much. So step 6 is the portal's timing rules, as the
  owner's per-site settings; Home's sections, the tabs and the cards stay as built.
- `portal/timing.js` (new): `PORTAL_TIMING`, today's values: the vet booking reminder 5
  days before go-home at 9, the deadline morning's at 8, red under 48 hours left, the
  families' Vet visit tab 24 hours past the deadline, a stay from 8 weeks old, a task
  Overdue for 14 days. Stored in the site's build as `portal_timing`, only what differs
  (as the website's `timing`); `portalTimingFor(build)` reads it, an out-of-bounds value
  falling back to today's.
- `getSettings` (`portal/store.js`) now adds the site's rules as `s.timing` (one more read of
  `site_builds`), so everything that has the settings has them: `vet.js` (`bookReminderAt`,
  `reminderTimes`, `dueReminders`, `vetStatus`, `vetTabShown`, each today's by default),
  `steps.js` (`taskState`'s overdue days, from `stepsFor`), `stays.js` (a stay's first day),
  her screens' vet statuses (Today, Families, a family's screen, the Dogs tab) and the
  families' Vet visit tab. The constants they replace are gone from `vet.js`.
- The owner's Timing screen: the "comes with the portal's build" card is now **Family
  portal**, a row per rule with its default, changed and Back to default, bounds on each.
  Only on a site with the portal. The portal reads the build live, so a change to its rules
  alone doesn't mark the website as having changes to publish (`saveBuild`'s `draft: false`).
- Left fixed, as the plan says for rules that keep KennelPort running: invite links' 30 days,
  Undo's 30 days, the retention table. The vet deadline stays her contract's count in her
  Portal settings.
- Her stay line "Starts at 8 weeks…" (`pstay.starts`) now takes `{weeks}`, the site's rule;
  today's words by default.
- Checked the screen at 390px and 1280px. Tests: `portal-timing.test.js` (the rules, each
  function by a site's rules, the owner's screen saving them with nothing to publish, Back
  to default, a bad value refused). No migration (the build is JSON). No file under
  `public/_kp/` changed; `PORTAL_VERSION` 10 is still pending for the tabs (asked).

## 2026-11-25: Fix: a KennelOS puppy, litter, health result or product wouldn't save

- The owner (screenshot of Layla Grace): saving a puppy from KennelOS in the Site Manager
  said "Not saved: puppies.disposition: not a known field". Since KennelOS contract step 4
  (2026-11-13, migration 0033), KennelOS's raw values are on its owned-fields list
  (`kennelos/bundle.js` `OWNED`): a pup's `disposition`, a litter's `kennelos_status`, a
  health result's `test_type`, a product's `account_type`. The record form's save copies
  every owned field back from the stored record so the form can't change them
  (`manage/screens.js`), which put those four into values the form's fields don't have,
  and the check refused them. So every KennelOS litter, puppy, health result and product
  failed to save from her screens.
- Now only the owned fields the form has are copied back; the raw ones aren't the form's,
  and the save leaves them as stored. Test in `dog-parents.test.js` (each of the four
  saved through her screen, unchanged, and its raw value still there); it fails without
  the fix. No migration, no version bump.
- `PORTAL_VERSION` 9 → 10 with the owner's yes, for the five tabs (`looks/mockup.css`)
  (`PORTAL_FILES` bc7532a3b99e6333). 524 pass.

## 2026-11-25: Site-builder step 6: the family Home's order and cards

- The owner: per site, the order of the family portal Home's sections and whether each card
  shows, so a breeder can, say, show the food card only for the first two weeks after
  pickup. The rules module (`portal/home.js`, on `main` since this morning) is now wired in.
- `getSettings` (`portal/store.js`) adds `home: portalHomeFor(build)` beside `timing`.
- Home (`portal/family.js` `homePage`): `daysHome` is whole days between pickup's local date
  and today's (null before pickup); `cardShows` hides the food card (the band gets her
  settings with no food name), insurance and the slim card (null), and gates contacts,
  the checklist, the payments band, Recommended and Read next on top of their own rules.
  What goes under "Recommended for" is still worked out from the unhidden band, so a hidden
  or expired food program doesn't reappear there.
- Classic: each section's html by key, joined in her order. Today's order joins exactly as
  before (checked: all 60 snapshot pages, four dates × five pages × three looks, byte-for-byte
  the same as `main`); a custom order goes through `recolour()`. Quick links' colour comes
  from the joined html. Forest and Cream: `family/mk.js` `home()` pushes the sections in
  `c.order`; no recolouring there.
- The owner's **Family Home** screen (`/admin/<sub>/portalhome`, `manage/builder/portalhome.js`,
  route in `builder.js`, in the nav only on portal sites: `SCREENS` takes a fifth `'portal'`):
  the sections in order with move buttons (a move saves the screen and comes back to the
  section), the stage's band marked always shown, the food band's three cards under it, a
  Show select per card and "Until, in days after pickup" (blank, no end; left out for the
  checklist and payments band, which only show before pickup); "changed" and "moved" marks,
  As today or Back to today's Home. Saves with `draft: false`: nothing to publish. No
  prototype screen exists for it: built from the builder's cards, movable rows, selects and
  action bar, as Forms and Timing are. Its words are the owner's own and stay in code. No
  family-facing words changed.
- `scripts/portal-current-snapshots.mjs` takes `SNAP_HOME` (a Family Home as JSON).
- Checked at 390px and 1280px: Home in Classic, Forest and Cream with a custom order
  (contacts, Recommended, stage, food, Read next…) and the food card at "only once home,
  until 14" on the snapshot's two-weeks-home date: the food card's gone, insurance takes the
  band, Classic recoloured the stage's band (paper, or mint in the vet stage) under the sand
  Recommended band. Her screen at both widths. Already there before this: at 390px the
  admin's bottom nav is wider than the screen (12 tabs, now 13), so Timing, Home and Help sit
  off the right edge; fixing that is a manage-app CSS change (`APP_VERSION`), not done.
- Tests: `portal-home.test.js` (round trips, `cardShows`, `recolour`, the food card at
  home/14 before pickup and on days 0, 13 and 14 in Classic and Forest, cards switched off,
  a custom order in all three looks, no two alike in Classic for four orders at four stages,
  today's order unchanged, her screen's move, cards, a bad until, Back to today's,
  `draft_changed_at` untouched, 404 for a breeder and for a site without the portal).
  536 pass. No migration (build JSON); no file under `public/_kp/` changed, no version bump.
- Follow-up, the owner (phone screenshot): each card's two boxes sat at different heights,
  because the "Until, in days after pickup" label wrapped. The labels are now one line
  ("Show", "Until day") and the choices short (Always, Once home, Never), each explained
  once in the card's intro. Measured at 390px: both boxes on the same line on every card.
- Follow-up, the owner asked whether the timeframes in the section names are settable now.
  They aren't, here: this screen only shortens or hides. The names now say where each
  window comes from (`portal/home.js` `SECTION_NAMES`): the contacts, her "help weeks" in her
  Portal settings (8 by default); the checklist, two weeks before go-home until pickup
  (fixed); the payments band, until pickup with a status page (fixed). The card's intro
  says these can only shorten or hide, never widen. Owner-only words; families' unchanged.
- Follow-up, the owner ("Who is her?"): the screen now says "the breeder" where it said "her"
  (the contacts' name, the stage's band's contract line).
- The owner: the checklist's two weeks settable too. A new portal timing rule,
  `checklist_days_before` (`portal/timing.js`, 14 by default, 1 to 60), on her Timing
  screen's Family portal card ("The go-home checklist shows on Home from … days before").
  Home reads it in every look. The breeder's line on her checklist screen
  (`ptpl.checklist.hint`) now takes `{when}`, the rule in words (`daysText`: "two weeks" for
  14, as before; "three weeks", "10 days"), so it reads as today by default. The Family Home
  screen's checklist name points at Timing. Test in `portal-home.test.js`. 537 pass. No
  migration, no version bump.
- The owner: the admin nav on a phone was wider than the screen (13 tabs). Now the bar
  holds Every site, Pages, Menu, Pups, the screen that's open and **More**; More
  (a `<details>`, no script) opens the rest as a grid in a panel over the bar
  (`builder/frame.js` `adminNav`, `PHONE_SCREENS`; a `more` icon in `manage/index.js`).
  On a computer the side nav is unchanged (More hidden, every screen shown). Checked at
  390px: the page and the bar are 390 wide; More open and closed; 1280px unchanged.
  `app.css` changed: **`APP_VERSION` 19 → 20** with the owner's yes ("You can do a bump"),
  `APP_FILES` bcdf42f9cd572688. 537 pass.
- The prompt for a KennelOS session to check its side for a second kennel (multi-breeder
  plan 2.6): `docs/plans/kennelos-second-kennel-check.md`.
- The owner: group the website's screens and the portal's. The admin nav now runs by
  group (`builder/frame.js` `SCREENS` with a group each, `GROUPS`): **Website** (Pages to From
  KennelOS), **Family portal** (Family Home; only on portal sites), **Website and portal**
  (Timing, which has a card for each, and her instructions). Group names down the side on a
  computer and as headings in the phone's More panel; a site without the portal has one
  group and no names. The side nav scrolls if it's taller than the screen. `app.css`
  changed again under the unreleased `APP_VERSION` 20 (`APP_FILES` ab17944db5aff60d). 537 pass.

## 2026-11-25: Ready for a second portal breeder: the vet rule as a setting, the settings guard, the suggested timeline

- The owner: a second breeder (Central time, KennelOS Pro, a 72-hour contract) and a third
  with 48 hours, so the vet count isn't fixed in code. `portal/vet.js` `parseVetRule`: a rule
  is `hours<N>` (12 to 240, exactly N hours from pickup) or `days<N>` (1 to 14, the end of day
  N after the pickup day, local). `vetRuleText`, `vetRuleClause` and `vetRuleShort` give the
  families' words ("48 hours from pickup", "within 48 hours of pickup", "2-day vet visit")
  on Home, the Vet visit tab, the invite and the reminders, in every look; 72 and 3 read as
  before. Portal settings: two choices, each with its number box (`pset.vet_hours`,
  `pset.vet_days_before`, `pset.vet_days_after`); her screens' rule line is
  `pvet.rule.hours` / `pvet.rule.days` (with `{n}`, `{nth}`), replacing `pvet.rule.hours72`
  and `pvet.rule.days3` (an override the owner wrote for those needs writing again).
- **Migration 0046** (`portal_second_breeder`, first named `portal_vet_count`), additive: `portal_settings.vet_count` (the number;
  `vet_rule`'s CHECK still allows only 'hours72'/'days3', so it now says only hours or days;
  `store.js` `ruleOf` joins them) and `portal_settings.saved_at`. Every existing row is set
  saved from its `updated_at` (those portals are running). A backup from before 0046 restores
  as saved (`backup.js` `restoreRows`).
- The settings guard: until she saves Portal settings once, `sendDueFor` sends no vet reminder
  and Send invite answers "Save your portal settings first: your vet visit rule and time
  zone." (`invite_settings` in the owner's errors). Her Today shows "Set up your puppy
  portal" and her Portal tab starts with "Start here: your portal settings" (`ptoday.settings*`,
  `psetup.first*`). Her first save recounts any vet clock already running on her rule, with
  history; later saves leave running clocks as they are. A row KennelOS's vet fills in
  doesn't count as saved. Invites were never automatic: families from KennelOS wait for her
  Send invite.
- The suggested timeline (`portal/steps.js`), only for a list added from now on (her rows are
  hers): in date order; no go-home folder (registration, deworming); insurance at day 1 as
  the ready-made one; the US puppy shots after the breeder's 8-week one (AAHA): 11 weeks
  DHPP (ask about lepto and Bordetella), 14 weeks DHPP and rabies, 17 weeks the last DHPP,
  one-year boosters; the old 12- and 16-week lines replaced. Ready-made wordings that said
  the same thing dropped: registration 3 → 2, insurance 2 → 1, other 2 → 1. The ready-made
  picker lists its groups by their usual day, so tasks added one after another land in
  date order (a new task always goes to the bottom). `ptpl.body_ph` example updated.
- KennelOS's side for a second kennel: checked on the KennelOS side 2026-11-25, nothing to
  change (multi-breeder plan 2.6 updated).
- Tests: `portal.test.js` (the guard, 48 hours in Central, recount, range), `portal-vet.test.js`
  (counts and words), `portal-hub.test.js` (Today and Portal tab before saving),
  `portal-steps.test.js` (the shots, an existing list unchanged). 539 pass. No version bump
  (server-rendered screens only).
- Follow-up, the owner: reminders wait for the invite; automatic invites; the microchip task;
  a remove for everything she adds.
  - `sendDueFor` sends nothing to a family not yet invited (`portal_families.invited_at`);
    once invited, the latest reminder due goes.
  - Automatic invites, her choice in Portal settings ("Invites", `pset.invites`,
    `pset.auto_invite*`): `portal_settings.auto_invite_at`, added to **migration 0046**
    (still one migration on this branch). `portal/auth.js` `autoInvite`: families added since
    she switched it on, with an address and an open placement with the family, not invited,
    not gone from KennelOS, settings saved; on her first save the ones already waiting are
    included. Runs after a KennelOS feed, after she adds a family, after she saves settings,
    and hourly (`autoInviteAll`, before the reminders). A send that reached no address leaves
    them not invited, to try again. Off: Send invite, as before.
  - The microchip: "Register {name}'s microchip to your name and address", 2 days after
    pickup, in the suggested timeline and as a ready-made registration wording (index 2,
    its own `days`, `noProgram`: never linked to her registration program). Her timeline
    suggests it with one tap, like Register {name}, until it's on it, so a list made before
    (the first breeder's) gets it at the bottom with nothing else changed.
  - Remove paths, checked over every portal screen of hers: everything she adds had one
    except four, now added: her contract file (`removeContract`, the file deleted too), a
    message she sent (`removeBreederMessage`, hers only; the email has gone), a loss she
    recorded by mistake (`undoLoss`, not for one KennelOS sent: changed there), and her loss
    note (`removeLossNote`). Wording: `pf.contract_remove`, `plog.remove`, `pf.loss_undo`,
    `pf.loss_note_remove`, error `loss_kennelos`.
  - Tests in `portal.test.js`, `portal-feed.test.js`, `portal-steps.test.js`,
    `portal-account.test.js`. 541 pass. No version bump.

## 2026-11-25: Resources and the potty schedule

Plan: `docs/plans/portal-resources-potty.md` (the owner's answers and what changed, section 4).

- **Resources:** `portal/resources.js` (data), `portal/admin/resources.js` (her screen, on her
  Portal tab), `/family/resources` in `family.js`. Links (an address, or one of her shown
  programs through `/family/go`, counted as `resources`) and PDFs or photos (10 MB,
  `sites/<site>/portal/resources/`), under her own headings, in her order; each changed,
  moved, switched off or removed (the file deleted too). A Quick link on Home once one is on.
  Table `portal_resources`.
- **The potty schedule:** `portal/potty.js` (the maths, her guide), `/family/potty` in
  `family.js`, `portal/admin/potty.js` (her Potty guide screen: the page on or off for her
  site, the guide on or off, her words or the suggested ones). Three answers (first person up,
  2 to 4 meals, bedtime) make the day's trips for the puppy's age, worked out on every visit:
  first thing, 15 minutes after each meal, breaks within the age's daytime limit (a run of them
  one row), last thing at bed, and night trips while the night is longer than the age's
  overnight limit (`POTTY_LIMITS`: 1 hour and 3 at 8 to 10 weeks … 5 hours and the whole night
  from 6 months). Changed or started over by the family. The guide drawn as the portal's other
  pages (paragraphs, tips as highlight rows), not the handbook's (the owner). A Quick link until
  the owner's timing rule `potty_until_weeks` (26 by default, her Timing screen); always a link
  under Records (Classic and the looks). Table `portal_potty` (removed with a family, their
  erase, and moved on a merge); `portal_settings.potty_guide`, `potty_guide_off`, `potty_off`.
- **The potty task** (the owner): Set up {name}'s potty schedule, 3 days before pickup, in the
  suggested timeline, suggested with one tap on her timeline until one is on it (`addReady`
  'potty', to the bottom), and a kind of task that ticks itself in her task editor
  (`ptpl.auto.potty`). Its button opens their schedule (Make the schedule / See the schedule);
  it ticks itself once they make one; hidden from families while her potty page is off.
  Stored in `portal_timeline_tasks.opens` (`steps.js` `autoOf` reads it as `auto`).
- Both family pages use the looks' own frame (`mkp`), so Forest and Cream draw their header and
  tab bar. Found while checking: on the looks' other plain pages (Account, Messages, Photos,
  Stay, the handbook) the tab bar stacked and the header wrapped at 390px.
- **Migration 0046** renamed `portal_second_breeder` (unreleased) and now also holds
  `portal_resources`, `portal_potty`, the three potty columns and `portal_timeline_tasks.opens`.
  New wording in the owner's list: screens `portalresources` (`pres.*`) and `portalpotty`
  (`ppotty.*`), Portal tab rows `psetup.resources*`, `psetup.potty*`, errors `res_*`.
- Tests: `worker/tests/portal-resources-potty.test.js` (4). 545 pass. Checked at 390px in
  Classic and Forest (no stylesheet change, no version bump).
- Follow-up, the owner ("fix the tab bar and bump"): `looks/mockup.css` part 2 lays out the
  header (one line: brand, then Messages, Aa, Account) and the tab bar (one row of five) on the
  looks' plain pages as Home's are. Checked in Forest and Cream at 390px and 1280px; Classic
  unchanged. **`PORTAL_VERSION` 10 → 11** (the owner's yes), `PORTAL_FILES` 7b3099a49f5bb52c.
  545 pass.
- Follow-up, the owner ("bring over the training content too"): **Training**, `/family/training`.
  `portal/training-content.js` is KennelOS Furever's `furever/data/trainingContent.js` (version
  1) copied unchanged; `portal/training.js` picks the AKC's two tracks: **By age** (the timeline,
  the puppy's stage first with "Where Opal is now", our own plain line under 8–16 weeks in place
  of the content's research note) and **S.T.A.R. Puppy** (by category). Each skill opens to its
  summary and steps, "the puppy" becoming the puppy's name. A Quick link until 52 weeks, always
  under Records (Classic and the looks); her switch on her Resources screen ("Training guides",
  `pres.training*`), `portal_settings.training_off` in migration 0046. Drawn in the looks' frame.
  Read-only: no progress stored. Test in `portal-resources-potty.test.js`. 546 pass. Checked at
  390px in Classic, Forest and Cream. No further version bump (no stylesheet change).

## Portal settings: vet-rule number boxes showed empty

The two number boxes in "The vet visit" (hours / day) rendered as empty 22px squares on
phones: the manage CSP (`style-src 'self'`) drops the inline `style="width:5em"`, so the
checkbox rule `label.check input` (22×22) won. They now use `class="num"` with a rule in
`app.css` (`label.check input.num`), and the two rows centre their radio (`.vetrule`).
`app.css` changed: APP_VERSION 20 → 21 (owner said yes).

## 2026-11-25: Preview your portal, with a sample family

The owner: a way to see a new breeder's portal before adding anyone, like the prototype's
"Today is" bar (before go-home, the day after, a month on), or a puppy whose dates move.

- **Preview your portal**, a button on the Portal tab and in Portal settings (under the looks),
  opens her portal in a new tab through the same view link as See their portal
  (`/s/<site>/portal/sample`), for a made-up family, "The Sample family", and puppy, "Biscuit"
  (her wording, `familyview.sample_*` in `manage/wording.js`).
- **Nothing is stored.** `portal/sample.js`: for any statement that binds a sample id, `sampleDb`
  prefixes a `WITH portal_families(...) AS (SELECT ...), portal_placements ..., puppies ...,
  litters ...` holding the sample's one row each, which SQLite reads before its own tables. So
  every page (Home, Timeline, Vet visit, Records, Photos, Messages, Handbook, Resources, Potty,
  Training, Stay, Account) runs its real queries, on her real settings, checklist, timeline,
  handbook and programs; the family's own things (records, messages, ticks, stays) come back
  empty. A write with a sample id does nothing; her view refuses posts anyway. Column lists come
  from `PRAGMA table_info`, so a later migration's column is picked up by itself.
- **The day moves the dates.** The band offers A week before, The day after, A month after,
  then a day or a week either way (links to `/family/sample?d=`, a cookie, back to the same
  page; −30 to 400). Go-home is that many days before today, pickup 10 am, the vet deadline
  from her rule, born eight weeks before go-home; once the deadline has passed, a vet record
  is in and accepted. The puppy's photo is one of hers (a puppy's, else a dog's) when she has one.
- Stop viewing goes back to the Portal tab and clears both cookies.
- A number box for the day was tried first: in Forest and Cream the band's input draws dark on
  dark, so it's buttons instead (no stylesheet change).
- Tests: `worker/tests/portal-sample.test.js` (6): the buttons, the band and its days, every
  page at seven days in all three looks with no row changed and nothing sent, her checklist and
  timeline dated from the sample, Stop viewing. 552 pass. Checked at 390px in Classic, Forest
  and Cream, and at 1280px. No migration, no version bump.

## 2026-11-25: Her payment methods from KennelOS, for every stage of a sale (Website Contract C11)

- **Built twice.** First to KennelOS's first message (methods inside `application_fee`).
  KennelOS then revised C11: one list of methods at `payment.methods`, each with the stages
  it's taken for. That's what's built now; the first version is gone.
- **New bundle section `pay_methods`** (`kennelos/bundle.js` SECTIONS). `payment.methods`:
  `[{ label, url?, note?, stages }]`, checked in `content/model.js` `cleanPayMethods`:
  - at most 12;
  - label ≤60 (required); note ≤1000, line breaks kept;
  - a link that fails the link check is dropped;
  - stages keep only `application_fee`, `deposit`, `payments`, `final_payment`, and one left
    with no stage is dropped, as is one with neither link nor note;
  - an unknown key, a stages that isn't a list, or too many refuses the bundle.

  `payment` may now come with only `methods`; `application_fee` was already optional. The
  typed `[way, details]` pairs on a card are unchanged.
- **Kept in a new table `pay_methods`** (migration 0047, additive). `payment_info`'s kind
  CHECK allows only three kinds, and widening it would mean rebuilding the table. Each bundle
  replaces KennelOS's rows whole (a method she stops offering drops out; a bundle without
  `methods` clears them). `own_label` (her name for it, plan step 1) is carried over by
  label. In `sites.js` SITE_TABLES (backup), the link's waiting check, and unlinking
  (source back to `kennelport`). Content export and import carry it (`pay_methods`).
- **Snapshot:** `payment.methods` (`publish.js`), each `{ label (her own name if set), url,
  note, stages }`. A fee or deposit card switched on shows with any method tagged for its
  stage; Show in the Site Manager counts them as a way to pay (`records.js` `savePayment`).
  Publish's list says "How to pay, ways to pay: …" (`publish.diff.fee.methods`).
- **On the waitlist** (`render/parts.js` `choicesCard`, `payMethodsFor`): the Application fee
  and Deposit cards show their stage's methods:
  - "How would you like to pay?", with one expander per method (the template's `details.x`,
    sharing a `name`, so one opens at a time);
  - each opens to a "Pay with <label>" button (new tab) and/or her note with its line
    breaks, and a Copy button for an address;
  - a single method shows directly;
  - then the card's note as "Additional Payment Instructions" (the owner's wording, in place
    of KennelOS's "Other ways to pay").

  The card's `pay_url` and typed methods give way to them. Where every card shown has methods,
  the section's "Put the note shown…" line is left off. "We take payment only by…" lists
  them. Payments and Final payment methods show nowhere yet: they wait for the Ways to pay
  block ([`plans/payment-blocks.md`](../plans/payment-blocks.md)).
- **Her switch, per card** (the owner): **Show my payment methods here** (`show_methods`,
  on the card's form, on by default; `records.js` `getPayment` reads a missing one as on).
  Off: the card ignores the methods and shows its link and note as before (for a site whose
  Ways to pay block shows them instead). It's hers even on a card from KennelOS (not locked,
  not in the bundle's shape), and a bundle keeps it (the landing's `ON CONFLICT` puts it back).
  The label and hint are in `manage/forms.js` LABELS, for the owner to word.
- Without methods, every card is drawn exactly as before.
- No stylesheet change, so no `ASSET_VERSION` bump. Checked at 390px and 1200px.
- Tests: `kennelos.test.js` (the section listed; methods with stages, dropped and kept, the
  fee and deposit cards, a single method, methods with no fee, none sent clears them, five
  refusals) and `payment.test.js` (export and import with her own name). 554 pass.
- **Migration 0047 applies by itself on the first request after the merge.**

## 2026-11-25: Her own names for her payment methods (payment-blocks plan, step 1)

- **The owner's call: the breeder gets the name boxes.** Her How to pay screen
  (`manage/screens.js` `methodsCard`) has a **Your payment methods** card, between the
  Deposit card and the safe-payment notice, shown once KennelOS has sent any. Each method
  shows, read-only as KennelOS sends it: its name, "For:" its fees (in the site's fee words),
  its pay link and her instructions with their line breaks. Under each is a **Your name for
  it** box (60 at most; empty shows KennelOS's name, which is also the placeholder). **Save
  names** posts to `/payment/names`.
- Stored in `pay_methods.own_label` (migration 0047, on this branch) by `records.js`
  `savePayMethodNames`, only for this site's methods. A bundle keeps a name by the method's
  label. The snapshot already uses her name, so families see it on the cards, in "Pay with…"
  and in "We take payment only by…".
- **Fee words:** `pay_payments` "Payments" and `pay_final` "Final payment" join `pay_fee`
  and `pay_deposit` in the site's fixed wording (`content/rules.js`), for the owner to reword
  per site. Her screen's "For:" line uses all four.
- Her wording is in `manage/wording.js` (`payment.your_payment_methods*`,
  `payment.method_for`, `payment.method_link`, `payment.your_name_for_it*`,
  `payment.save_names`), for the owner to word.
- No prototype screen for it: built from the Site Manager's own form pieces (card,
  `fgroup`, `fgrid` label and hint), so no stylesheet change and no `APP_VERSION` bump.
  Checked at 390px and 1100px.
- Tests: `kennelos.test.js`, her names (the card, saving, an empty name, another site's id
  ignored, too long, kept through an update, families see hers). 555 pass.

## 2026-11-26: What each payment method pays, and her words per stage (contract C13)

- The owner's ask: "how to pay for your puppy" pages from her KennelOS settings, before a
  pup is picked: every method, for which stage and which kind of charge. No amounts and no
  due dates (she has several schedules; her usual timing goes in a text block).
- New bundle section `pay_charges` (Website Contract C13, KennelOS's side on its branch
  `ccr-c8862061-0nol3l`): each `payment.methods` entry adds `key` (its KennelOS Account id)
  and `pays: { payments?, final_payment? }` (kinds `price`, `boarding`, `transport`,
  `extras`), and `payment.notes` carries her words per stage.
- Kept: `pay_methods.method_key` and `pays`, and a new `pay_notes` table, all in migration
  0047 (still only on this branch, so no second migration). The merge to `main` applies it
  to live data: two new columns and a new table, nothing dropped or rewritten.
- `model.js` `cleanPayMethods` (key, pays; unknown kinds and stages dropped, a key twice
  keeps the first) and `cleanPayNotes`; `bundle.js` takes both and keeps her own names by
  key (by label for rows from before keys); `publish.js` puts them in the snapshot
  (`payment.methods[].key` / `.pays`, `payment.notes`); `diff.js` counts a notes change as
  "ways to pay: edited"; `records.js` `getPayMethods` (key, pays), `getPayNotes`; `io.js`
  exports and imports them (`pay_notes` section); `link.js` and `sites.js` know the table.
- Nothing shows them yet: the Ways to pay block (plan step 2) reads them. No stylesheet or
  manage-app change, so no version bump.
- Tests: `kennelos.test.js` (C13: kept, dropped, refused, a rename keeps her name, the
  snapshot, an older KennelOS), `payment.test.js` (export and import). 556 pass.

## 2026-11-26: Her payment-method discount on a method (C13 `discount`)

- KennelOS Payment Methods Phase 5 (discounts): each method she ticks Discounted carries
  her payment-method discount's name in `pay_charges` (`discount`, up to 120 characters,
  no amount: it differs per payment).
- Kept as `pay_methods.discount` (added to migration 0047, still only on this branch);
  `model.js` `cleanPayMethods`, `bundle.js`, `publish.js` (snapshot
  `payment.methods[].discount`), `records.js`, `io.js`. Nothing shows it yet: the Ways to
  pay block reads it (plan step 4).
- Tests: `kennelos.test.js` (kept, in the snapshot). 556 pass.

## 2026-11-26: Payment methods: no doubles after a new link, no wipe from an older KennelOS

- Review of the C11/C13 merge. After Unlink and a new link, KennelOS's next update added
  its methods beside the rows the unlink had left as hers, so the waitlist showed each
  method twice, and the Site Manager had no way to remove the old ones. `bundle.js` now
  replaces the site's whole `pay_methods` and `pay_notes` lists, carrying her own names
  over by key (by label for rows from before keys).
- Every bundle without `payment.methods` used to clear her methods and notes, so an older
  KennelOS build (a second device not yet updated) wiped them until a newer one sent
  again. Now each list is replaced only when its key comes (`payment.methods`,
  `payment.notes`); KennelOS sends `[]` / `{}` when she has none (its matching change).
- No migration, no stylesheet or manage-app change, so no version bump.
- Tests: `kennelos.test.js`: a new test for unlink then link (each method once, her names
  kept); the pay_methods and pay_charges tests now check that a bundle without the key
  keeps the list and an empty one clears it.

## 2026-11-26: Suggested tasks: the puppy shots, and gone once on her list

The owner: the shots added to the suggested timeline (2026-11-25) only reached a list made
from then on, so the first breeder never saw them; and suggestions she had added kept
showing.

- The four shot tasks (`steps.js` `SHOT_TASKS`: 11, 14 and 17 weeks, one-year boosters) are
  now suggested with one tap on her timeline, like the microchip, and have their own group
  in the ready-made picker, "Puppy shots" (`ptpl.ready_shots`, value `shot|<n>`, dated from
  birth). The suggested timeline uses the same four.
- Why the added ones kept showing: a suggestion hid only while a task had its exact
  wording, so a task she reworded after adding, or one of her own for the same thing,
  brought it back. Now `steps.js` `readyOnList` reads her list by what a task is for:
  potty (its kind or the word), the microchip, the breed registration ("Register…" or a
  task linked to her registration program), each shot (11/14/16-17 weeks, a year or
  boosters), and each program a task links to. The suggestion cards
  (`templates.js` `registerSuggestion`) and the ready-made picker (`readyForm`, on her
  Timeline and on a family's screen, there with that family's own tasks too) leave out
  whatever is on it. A picker with nothing left isn't shown.
- Still: a task she removes is suggested again (nothing records that she turned one down).
- Tests in `portal-steps.test.js` (the shots, reworded and her own wording). 559 pass.
  No migration, no version bump (server-rendered screens only; the cards are the
  existing suggested-task card).

## 2026-11-26: "Shots, tests and vet visits"

The owner: KennelOS now sends a puppy's screening and health tests like its shots, so the
records heading says so. Her family screen (`pf.records` in the owner's list) and the
families' Records page in every look (`family.js`, `family/mk.js`) read "Shots, tests and
vet visits". 559 pass. No version bump (server-rendered).

## 2026-11-27: One family the feed can't take in doesn't stop the rest

A second breeder's first family feed brought two of five signed families, the second with no
puppy record, and nothing said why. `applyFeed` (`portal/feed.js`) took families in one
after another with nothing to catch a failure, so one bad write would stop every family
after it.
- Each family, and each of its placements, is now taken in on its own: one that fails is
  logged (`portal feed: … not taken in`, by site and KennelOS ids and the error, never a
  name or address), counted (`families_failed`, `placements_failed`) and named in the
  answer's new `failed` list (at most 20), and the rest go on. The next send tries it again.
- A refused feed (400) is logged too, by the field it stopped at (its path, no value), so
  it shows in the Worker's logs; before, it counted as a success there.
- KennelOS shows the outcome on its Your website card (its build log, the same day).
- Test in `portal-feed.test.js` (a trigger makes one placement fail; the family after it
  lands; fixed, the next send takes it in). 561 pass. No migration, no version bump.

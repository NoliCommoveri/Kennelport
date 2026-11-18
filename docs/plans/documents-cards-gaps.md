# Documents, Cards and flyers: the gaps

What the first build of the Extras block, the Cards block and documents (2026-11-18, build log)
left undone, and how to finish it. **Step 6 built 2026-11-18** (build log); the rest not built. Each step is small and can ship on its own;
the order puts the ones that need no version bump first.

## The gaps

| # | Gap | Today |
|---|---|---|
| 1 | Documents don't count toward a site's storage limit | `savePhoto` checks `storage_limit` against photos only; her Account screen and `/ops` usage count photos only |
| 2 | Cards can't be reordered | the form shows every card and two empty ones; moving one means retyping it |
| 3 | The menu can't link to a document | menu items are a page, a place on a page, an outside link or a group |
| 4 | Only the owner can upload documents | Documents is in the admin view; the breeder has no screen for them |
| 5 | A document has no picture of its own | a card's photo stands in for one; a button elsewhere has nothing |
| 6 | A flyer can't be opened full size, and loses detail on upload | a photo on the site is a plain picture; the Site Manager resizes every upload to 1600px on its long side |

## 1. Documents count toward storage

- `addDocument` checks the site's `storage_limit` against **photos plus documents** before it
  stores the file, with the same message as photos ("This site has reached its storage limit.",
  in `wording.js` for the breeder's screen once step 4 exists).
- One helper, `siteBytes(env, siteId)` (photos not removed, plus documents), used by
  `savePhoto`, `addDocument`, her Account screen and `/ops` usage, so the four can't disagree.
- Her Account screen: "12 photos, 3 documents · 48 MB of 500 MB used". `/ops` usage gets a
  documents row (count and bytes, against R2's free tier with the photos).
- No document count limit: bytes are what cost anything.
- No migration. No version bump.

## 2. Reordering cards

- In the owner's Cards settings, each card gets ↑ and ↓ (the `mvBtns` the block list uses, act
  `cmv:<block>:<card>:up|down`) and **Remove this card**. Saving keeps every card's other
  changes, as the block list's moves do.
- The form shows the cards she has and **one** empty card, plus **Add a card**, instead of
  two empty ones, so a long block isn't padded with empty forms.
- Optional later: **Copy this card**, which adds a copy under it.
- No migration. No version bump (the admin view's own screens are server-made pages).

## 3. The menu links to a document

- A new kind of menu item, **A document** (`{ type: 'doc', doc, text }`), in the menu editor
  beside "An outside link": a document chosen from the site's list, and its words in the
  menu (empty: the document's title).
- It opens the PDF in a new tab, like an outside link. It hides while the document is gone,
  as a page item hides while its page is off. The footer follows the menu, as now.
- `blocks.js` `cleanItem` (menu items) learns `doc`; `render/parts.js` `menuGroups` shows it while
  `snap.documents` has it. No migration. A template change only if the menu's markup for a
  new-tab link differs (it doesn't today: outside links already open in a new tab).

## 4. The breeder's documents

The owner decides whether the breeder may (her switch per site, in Documents: **The breeder
can add and remove documents**, off by default, since documents are new).

- Her Site Manager gets **Documents** in the Website tab, beside Photos: the same list (title,
  file name, size, Open), **Upload a PDF**, retitle and remove, in her words from `wording.js`
  (the owner writes them; decision 19).
- Uploading is a plain form post with the file, as in the admin view, so the app's files don't
  change. The size limit and storage check are the same (step 1).
- **What she can link:** where the owner made a button "A document", the breeder can choose a
  different document on that block's card in Pages (as she can change an outside link,
  decision 18). On the Cards block, per card, if the owner allows it (see step 5's question).
- Removing a document a button uses: the list says where it's used ("On Extras: the Cards
  block") and asks first. The button hides, as now.
- Stored: the switch in the site's build (`build.docs_hers`); her choice of document on a block
  in `block_switches`, like her outside links. No migration beyond step 5's.

## 5. A document's picture (its cover)

Two ways to give a document a picture. **Recommended: a. now, b. only if wanted.**

a. **A cover she chooses.** Each document gets an optional cover photo, picked in the photo
   library window (the same `photoSlot` every photo spot uses). It's used:
   - on a card whose button opens the document and which has no photo of its own;
   - in the Documents lists, so documents are easy to tell apart;
   - as the picture when the document is shared, if the menu item or card links straight to it
     (not possible for a PDF itself; noted so no one expects it).
   Stored as `documents.cover_photo_id`: one column. Migration 0038 has since merged and been
   applied, so this needs **a new migration** on the branch that builds it. The snapshot carries it; `publish.js` `use()`s it like any photo.
b. **The first page, made automatically.** The browser that uploads the PDF draws its first
   page with pdf.js and uploads it as the cover. That puts a large library (about 1 MB) in the
   Site Manager's files, so it needs an `APP_VERSION` bump, and a PDF pdf.js can't read gets no
   cover. Worth it only if choosing a cover by hand turns out to be a chore.

## 6. Flyers: open full size, and keep their detail

A flyer is a photo with small print. Today it fits on a card (the Cards block's "whole photo"
shape) but can't be read on a phone, and the upload has already thrown detail away.

- **Tap to open full size** on photos the owner chooses: a switch, **Opens full size on a
  tap**, on the Photo block and on the Cards block (for all its photos). It reuses the album
  viewer the site already has (`site.js`, `#viewer`: the photo full screen, pinch to zoom,
  previous and next across the block's photos). A template change: `ASSET_VERSION` bump,
  after asking.
- **Keep full detail on upload:** in the photo library window's upload, a choice **Full detail
  (for a flyer or anything with small print)**: the Site Manager resizes it to 2400px on its long
  side instead of 1600px (the server already allows 2400px and 3 MB). It's a choice, not the
  rule, so ordinary photos stay quick to load. A Site Manager change: `APP_VERSION` bump, after
  asking.
- **Its words for people who can't see it:** the photo's description (`photos.alt`, already in
  her Photos screen) is what a screen reader reads. On a Photo block or card with a flyer, the
  owner's screen shows the photo's description and a line when it's empty ("Describe what it
  says: screen readers and search engines can't read a picture"). A warning, not a block
  (decision 16).
- **Prices that disagree:** a flyer's prices are part of the picture; an Extras block under it
  follows KennelOS. No automatic check is possible. The Extras block's settings say so in one
  line, and a card's words can say "Prices as of …". Nothing more is planned.

## Building it, in order

| Step | What | Migration | Versions |
|---|---|---|---|
| 1 | Documents count toward storage | none | none |
| 2 | Reorder, remove and add cards | none | none |
| 3 | The menu links to a document | none | none expected |
| 5a | A document's cover | `documents.cover_photo_id`, in 0038 | none |
| 4 | The breeder's documents | none | none |
| 6 | Tap to open full size; full-detail upload; the description line | none | `ASSET_VERSION` and `APP_VERSION` (ask first) |
| 5b | First page as cover (only if wanted) | none | `APP_VERSION` (ask first) |

0038 and `ASSET_VERSION` 28 are on `main` now: 5a needs its own migration, and step 6 needs
both version bumps (asked for once it was built).

## The owner's answers (2026-11-18)

1. **Step 4: yes, for chosen breeders only**, with a file size cap: off until the owner switches it
   on for a site, and a size limit on what she uploads (the owner's, per site).
2. **Cards: yes, the breeder can change a card's words.**
3. Covers (5a or 5b): not answered yet.
4. **Full detail: a choice at upload.** Built (step 6).

## Questions for the owner (as first asked)

1. The breeder and documents (step 4): may she upload at all, and should it be off until you
   switch it on per site?
2. On the Cards block, may the breeder change a card (its words, photo, document), as she can
   on the other blocks you add? Today the cards are yours alone.
3. A document's cover: choose by hand (5a), or also the automatic first page (5b, a bigger
   download in the Site Manager)?
4. Full-detail upload: a choice at upload (planned), or always for tall pictures?

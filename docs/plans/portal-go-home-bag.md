# The go-home bag: plan

Phase 2, second chunk of the family portal ([`family-portal.md`](family-portal.md)
sections 6, 8.4, 9 and 12.1). Written 2026-11-21. Not started.

One branch, one migration (0041), usable on its own. The Reports page that compares
sign-ups with and without a bag item is a later chunk; this one stores what it will need.

## 1. What it does

She sends every puppy home with goodies (food starter bag, insurance certificate, AKC
paper, a blanket with the litter's scent, toys, collar and leash, samples, the go-home
folder). Several come from programs' breeder kits, so the bag is also a revenue tool.

- **Her bag template** (Portal tab): each item with what it costs her, whether she
  **expenses** it (a column of its own, section 3 decision 8), where it comes from, and
  the program or product it's tied to, if any. Order, on or off, add, edit, remove.
- **From KennelOS** (the owner, 2026-11-21): KennelOS will let its users set up their bag
  items, cost included, and push them here. They arrive in the bundle beside extras and
  products (section 4a) and show in her template as any other item.
- **Per family** (the family's screen, **Sent home with**): the template ticked by
  default; she unticks what didn't go and adds anything else. The card's heading line
  shows the count, what the bag cost her and how much of that she expenses.
- **The family's side** (Records, from pickup on): **What came home in Opal's bag**, each
  item with its program's line and **Get more**, **Activate** or **Register** where it's
  tied to a program. Clicks count with place `bag`.

## 2. Prototype screens to match

`docs/reference/portal-prototype.html` (find them with the README's "Finding a screen"):

| Screen | Prototype | What to carry over |
|---|---|---|
| Her template | Portal tab, "Go-home bag" card (around line 1327) | `card` with `between` heading and **Add an item** (`btn line small`); `list` of rows: `ico` (the program's icon, else `gift`), name bold, small muted line "Costs you $4 · where from · tied to Program" ("Free to you" at 0); the small muted hint under it. **New, not in the prototype:** the expense column, a `pill` at the row's end ("Expensed") with its switch in the item's form, so the list reads as a column on a computer and stays one line on a phone |
| Her per-family card | Family screen, "Sent home with" (around line 1235) | `card` form; heading with "8 items · $24 to you"; `chips` of ticks (template items, then her own added ones, ticked); a `row` with "Something else, like …" input and **Save** |
| The family's band | Records (around line 1031) | `tile full band`, heading "What came home in Opal's bag" with "From A-K" beside it; `hl` list, each row a `badge` icon, bold name, the program's small muted line, and a `btn line small ext` link |

The prototype's template rows aren't editable in place; editing an item opens the same
small form as adding one (built from the template screens' `card`, `fgrid` and `hint`,
as the handbook's editor was). Say so in the build log.

## 3. Decisions (proposed; the owner confirms in section 8)

1. **The template is live until pickup, then fixed.** A placement with no saved bag shows
   her template, ticked. When she saves **Sent home with**, or when the puppy is marked
   picked up (whichever comes first), the placement gets its own rows. After that, a
   change to the template never changes what a family was sent. (Plumbing; never said in
   copy. Her screen just shows what went.)
2. **Each sent item keeps its own name and cost** as they were when it went, so renaming
   or removing a template item later doesn't rewrite a family's Records or her figures.
   It keeps its link to the template item and program, for Reports and the button.
3. **Families see the band from pickup on**, only while the placement is open and the
   puppy is with them (`active(p)` in `family/parts.js`), and only if at least one item
   went. Not on the loss page, not before pickup (the go-home checklist covers that time).
4. **The button's wording comes from the program's type** (`products.portal_type`):
   food → **Get more**, insurance → **Activate**, registration → **Register**, anything
   else → **Get more**. Each is a wording line. The program's own line under the name is
   its `family_action` ("what the family must do"), as on Home.
   A program that's off in the portal (`portal_show = 0`) or hidden by KennelOS shows the
   item with no button.
5. **Cost is in whole cents, hers alone.** Families never see costs, where an item came
   from, or anything she wrote for herself.
6. **On delete and erase:** what went home is part of her sale records (the reports
   need it), so an **erase** keeps the bag rows with the placement, like the placement
   itself. **Delete now** of a family removes them with the placement. Site close removes
   everything (add both tables to `SITE_TABLES`).
7. **KennelOS sends her bag items** (the owner, 2026-11-21; this replaces plan section
   3.2's "the bag is the portal's own"). The template arrives from KennelOS; what each
   family was sent is still recorded here. Section 4a has the contract and the rules,
   the same as for extras and products.
8. **Expense, per item** (the owner, 2026-11-21): a yes/no column, "Expense it", on each
   template item, defaulting to yes when it costs her anything. Copied onto each sent
   item with its cost (decision 2), so she can untick it for one family (a toy she was
   given free that time). Her family card shows "8 items · $24 to you · $20 expensed",
   and her future Reports show expensed cost per litter. Hers alone, never shown to
   families. From KennelOS it arrives as `expense`. A yes/no is enough: no category
   (the owner, 2026-11-21).
9. **What went home goes back to KennelOS** (the owner, 2026-11-21), with each item's
   cost and expense, so KennelOS records the expense against the sale. Section 4b.
10. **She can still add bag items by hand** with KennelOS linked (the owner, 2026-11-21).
   Hers stay hers; KennelOS's are matched as in section 4a.

## 4. Data (migration 0041, additive only)

Branch is level with `main`, so this is the branch's one migration.

```sql
-- portal_bag_items: her go-home bag template, in her order.
CREATE TABLE IF NOT EXISTS portal_bag_items (
  id          TEXT PRIMARY KEY,
  site_id     TEXT NOT NULL REFERENCES sites(id),
  name        TEXT NOT NULL,
  cost_cents  INTEGER NOT NULL DEFAULT 0,
  expense     INTEGER NOT NULL DEFAULT 1,   -- she expenses it (decision 8)
  origin      TEXT,                 -- where it comes from, her words ("The food program's kit")
  product_id  TEXT REFERENCES products(id),
  shown       INTEGER NOT NULL DEFAULT 1,   -- in the template for new families
  sort        INTEGER NOT NULL DEFAULT 0,
  source      TEXT NOT NULL DEFAULT 'breeder',  -- breeder / kennelos, as on extras
  kennelos_id TEXT,                 -- KennelOS's id for the item (section 4a)
  hidden_by_kennelos INTEGER NOT NULL DEFAULT 0, -- KennelOS stopped sending it
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
-- portal_placement_bag: what one puppy went home with.
CREATE TABLE IF NOT EXISTS portal_placement_bag (
  id           TEXT PRIMARY KEY,
  site_id      TEXT NOT NULL REFERENCES sites(id),
  placement_id TEXT NOT NULL REFERENCES portal_placements(id),
  bag_item_id  TEXT,                -- null for something she added for this family only
  name         TEXT NOT NULL,
  cost_cents   INTEGER NOT NULL DEFAULT 0,
  expense      INTEGER NOT NULL DEFAULT 1,
  product_id   TEXT,
  quantity     INTEGER NOT NULL DEFAULT 1,
  sort         INTEGER NOT NULL DEFAULT 0
);
-- Set when the placement's own rows are made (decision 1); null means "her template".
ALTER TABLE portal_placements ADD COLUMN bag_saved_at TEXT;
```

`bag_saved_at` set with zero rows means "nothing went", distinct from "not saved yet".
Indexes on `(site_id, sort)`, `(site_id, kennelos_id)` and `(placement_id)`. Quantity
is stored but not shown in this chunk (section 8, question 3). The column is `origin`,
not `source`, because `source` already means "who made the row" on imported tables.

## 4a. From KennelOS: bag items in the bundle

A new optional section of the bundle KennelOS already pushes (`kennelos/bundle.js`),
beside `extras` and `products`:

```
bag_items?: [{ id, name, cost, expense?, origin?, product_id? }]
```

- `cost` in dollars and cents as KennelOS holds it (`12.50`), stored as cents; refused if
  negative. `expense` true/false, default true when `cost > 0`. `product_id` is the
  KennelOS Account id of one of the `products` in the same bundle (matched by
  `kennelos_id`); one that names no product it sent is dropped, not refused. A limit in
  `MAX` (50).
- A bundle without the section leaves her bag as it is (as `extras` and `products`).
- **Matching and owned fields, as for extras and products:** matched by `kennelos_id`;
  the first time, one of hers with the same name is taken over (so she doesn't get it
  twice). `OWNED.bag_items = ['name', 'cost_cents', 'expense', 'origin', 'product_id']`:
  KennelOS's values replace hers on each push, since KennelOS is where she sets them.
  Her on/off and her order stay hers.
- **KennelOS stops sending one:** it's hidden (`hidden_by_kennelos = 1`), never deleted,
  and leaves the template for new families; what families were already sent is
  untouched (decision 2). Sent again, it comes back.
- **Unlink** makes them hers, as extras and products (review finding 02-1).
- **Hers beside KennelOS's** (decision 10): she can add items by hand while linked. They
  have no `kennelos_id`, a push never touches them, and they are never hidden for not
  being sent. The take-over by name happens only on an item's first arrival.
- **Her screen:** a KennelOS item shows the small "From KennelOS" note the extras and
  products screens use, and its owned fields say they're changed in KennelOS (the same
  wording those screens use, moved to the `bag` group). She can still turn it off or move
  it.
- The bundle's comment block, the section list in `SECTIONS`, `kennelos-contract.md`
  and `portal-kennelos` tests gain `bag_items`. The KennelOS side (its screen and the
  push) is built in the KennelOS repository; this plan's section 4a is what to hand them.

## 4b. What went home, back to KennelOS

The feed's facts that go back (`feed.js` `factsFor`, family-portal.md 3.4) gain a
`bag` on a placement KennelOS knows, once its bag is fixed (`bag_saved_at` set, by her
Save or by pickup):

```
bag: { items: [{ bag_item_id?, name, cost, expense, quantity }], cost, expensed }
```

- `bag_item_id` is KennelOS's own id for the item when it came from KennelOS (so its
  income and expense lines match up), absent for one she added by hand or for that
  family alone. `cost` and `expensed` are totals in dollars and cents. Zero items
  (nothing went) is sent as an empty list, so KennelOS can tell it from "not yet".
- Sent in every reply while the placement is in the facts, as the other facts are: the
  whole bag each time, which KennelOS replaces, so a later change to one family's bag
  just arrives. No new setting, no approval in KennelOS (she made it herself).
- **An exception to "anything with money never goes back on its own"**
  (family-portal.md 3.4), chosen by the owner: this is her own cost, not a charge,
  refund or return to the family, so KennelOS records it as an expense on the sale.
  Note it in that section.
- Not for an erased or deleted family (`factsFor` already leaves those out).
- KennelOS builds its side (recording the expense on the sale) in its own repository;
  section 4a and this section are what to hand them.

## 5. The build, in order

1. **Migration 0041** and its line in `migrations/index.js`; both tables in
   `sites.js` `SITE_TABLES` (children first), which also puts them in the backup and
   restore (`backup.js` reads it); add them to `plans/backup-format.md`'s table list,
   and a backup round-trip test.
2. **`portal/bag.js`** (new): `bagTemplate`, `saveBagItem`, `removeBagItem` (a removed
   template item leaves sent rows alone), `reorderBag`, `bagFor(placement)` (its rows,
   or the template when `bag_saved_at` is null), `saveBag(placement, ticked ids, extras)`,
   and `fixBag(placement)` called from `markPickedUp` in `store.js` when
   `bag_saved_at` is null. History lines in `portal_history` for her saves
   ("Sent home with: 7 items").
3. **Her template, `portal/admin/bag.js`** (new), linked from the Portal tab's list in
   `admin/today.js` beside Handbook. Add, edit (name, cost, **Expense it**, where from,
   program from her programs list, on/off), remove with a confirmation, move up and down.
   The list shows the expense column (section 2).
3a. **KennelOS's `bag_items`** in `kennelos/bundle.js` (section 4a), after the
   products step so `product_id` can be matched.
3b. **`bag` in the facts that go back** (`feed.js` `factsFor`, section 4b), and the
   line in family-portal.md 3.4's list of facts.
4. **Sent home with** on the family's screen (`portal/admin.js`, after the placement's
   details card), only once a placement has a puppy. The prototype's chips, the add
   input, Save. Shows "(Not saved yet: your usual bag)" style hint while it's the
   template; wording from the owner's list.
5. **The family's band** on Records (`family.js` `recordsPage`, after Papers): decision
   3 and 4; program links through `goToProgram` with `from=bag`; add `bag` to
   `PLACES` in `family/files.js`. A program link shows the affiliate disclosure, as on
   every page with one.
6. **Her read-only view** (`view.js`) shows the band as the family does, nothing more.
7. **Wording:** a new `bag` group in `manage/wording.js`: every line on her two screens
   (headings, hints, buttons, the count line "{n} items · {cost} to you", errors,
   confirmations) and the three button words. The family page's heading and "From
   {kennel}" stay in `family.js`, as on its other pages.
8. **Styles:** her screens use the Site Manager's existing `card`, `list`, `chips` and
   `fgrid` (`.chips` is already in `app.css`). The family band needs the prototype's
   `band` / `hl` / `badge` rules; check whether `portal.css` already has all three (it
   has some) and copy only what's missing.
9. **Docs:** build log entry, STATUS line, CODE_MAP (`bag.js`, `admin/bag.js`), plan 8.4
   marked built, this plan to `done/` once built.

## 6. Version numbers

- If `portal.css` changes, `PORTAL_VERSION` (4, on `main`, so released) needs a bump:
  **ask the owner first**, near the end. `versions.test.js` fails until then, as expected.
- If the Site Manager's `app.css` or scripts change, the same for `APP_VERSION` (check
  `main`'s number first). Aim to need no change there.
- `ASSET_VERSION`: not touched.

## 7. Tests (`worker/tests/portal-bag.test.js`, new)

- Template: add, edit, reorder, turn off, remove; a cost refused if not a sum of money;
  expense defaults to yes with a cost, no at zero, and can be changed.
- Sent home with: expense copied per item and changeable for one family; the card's
  totals (cost, expensed).
- KennelOS (`portal-kennelos` or `kennelos-bundle` tests): bag items arrive with cost and
  expense; a later push changes them; her on/off and order survive; one of hers with the
  same name is taken over; an item not sent again is hidden, not deleted, and families'
  sent rows are unchanged; a bad `product_id` is dropped; no section leaves the bag alone;
  Unlink makes them hers; her own items survive every push.
- Facts back (`portal-feed` tests): no `bag` before the bag is fixed; the bag with
  KennelOS ids, costs, expense and totals after; an empty list for nothing went; a change
  to one family's bag is in the next reply; none for an erased family.
- A placement with no saved bag reads the template ticked; Save makes its rows; a later
  template rename doesn't change them.
- Mark picked up fixes an unsaved bag; it leaves a saved one alone; zero ticked = nothing
  went.
- Records: no band before pickup, for a closed placement, or on the loss page; items with
  the right button per program type; no button for a program that's off; no cost or
  source anywhere on the family's page.
- A bag click is counted with place `bag`, not under her view.
- Erase keeps the bag rows; Delete now and site close remove them; backup round-trip.

## 8. Questions for the owner (before building)

Answered 2026-11-21: 6 (yes/no is enough), 7 (yes, it goes back: section 4b), 8 (yes,
she can still add by hand). Still open:

1. Decision 1: is "her usual bag until she saves it or marks pickup, then fixed" right?
2. Should families see the bag **before** pickup ("What's coming home in Opal's bag"),
   or only once it's home, as the prototype has it?
3. Quantities ("2 chew toys"): needed now, or one of each is fine?
4. Her starting template: build it empty, or start her with the prototype's eight items
   (food starter bag, insurance certificate, AKC paper, scent blanket, toys, collar and
   leash, shampoo sample, go-home folder) at zero cost for her to change?
5. The button words (Get more / Activate / Register): fixed by program type, or should
   she set the button wording on each item?

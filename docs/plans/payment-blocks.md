# Ways to pay: her payment methods as a block, with her own names

The owner's request (2026-11-25): a whole custom "How to pay" page, showing every payment
method she takes for each stage of a sale, with names she can change. Payment blocks can go
on other pages too, each scoped to the fees that page is about. Make it as flexible as Dog
cards: she picks the display and the conditions, and whether it's grouped by fee or by method.

KennelOS's side is Website Contract C11 (bundle section `pay_methods`), built 2026-11-25 on
this branch (build log). This plan builds the block on top of it.

## What there is now (built)

- **`pay_methods` table** (migration 0047), one row per method, in her order: `label`, `url`
  (her link, no amount), `note` (her instructions, with line breaks), `stages` (a JSON list
  of `application_fee`, `deposit`, `payments`, `final_payment`), `own_label` (empty, for
  step 1), `source`. Each bundle replaces KennelOS's rows, so a method she drops goes. Her
  `own_label` follows the method's label from one bundle to the next.
- **Snapshot:** `snap.payment.methods`, each `{ label, url, note, stages }`, where `label`
  is already her own name when she has set one.
- **Waitlist:** the Application fee and Deposit cards show the methods tagged with their
  stage. There's a choice per method ("How would you like to pay?", one expander open at a
  time), a "Pay with <method>" button and/or the note, then her note as "Additional Payment
  Instructions". With none tagged, a card is drawn as before.
- **The built-in cards stay fixed** (the owner, 2026-11-25): the Application fee card shows
  only the methods tagged for the application fee, and the Deposit card only those tagged
  for the deposit, always in the layout above. Their one setting is her switch, **Show my
  payment methods here** (built, on by default). Off, a card shows its link and note as
  before. Every other option in this plan belongs to the Ways to pay block only.
- Methods for **Payments** and **Final payment** don't show anywhere yet. They wait for this
  block.
- **What each method pays, and her words per stage** (Website Contract C13, section
  `pay_charges`, built 2026-11-26): each method also has `key` (KennelOS's Account id for
  it, kept as `pay_methods.method_key`) and `pays: { payments?, final_payment? }`, the kinds
  of charge it may pay there (`price`, `boarding`, `transport`, `extras`; a service fee is
  paid with its charge; the fee and the deposit pay only themselves). KennelOS works these
  out as families are offered them, so KennelPort never repeats its rules. Her
  "Additional Payment Instructions" for each stage are in `pay_notes`. All three are in
  the snapshot (`snap.payment.methods[].key` / `.pays`, `snap.payment.notes`). No amounts
  and no due dates: she has several payment schedules, so her usual timing is hers to
  write in a text block.

## The design in one line

**Ways to pay is a data block, like Dog cards and Extras.** Its records are her payment
methods, so it gets the machinery that already exists: conditions, order, group by, a
display style, what each item shows, and the breeder's unticks. Grouping by **fee** or by
**method** is just a choice of **Group by**.

## Step 1. Her own names (no migration). **Built 2026-11-25** (the breeder's boxes, the owner's call; build log)

- **Method names.** The Site Manager's How to pay screen lists her methods as KennelOS sends
  them: each one's name, its fees, its link and note (read-only: KennelOS's). Beside each
  name is a box, **"Your name for it"**. When it's filled, buyers see it everywhere instead
  of KennelOS's name: the cards, the block, the "We take payment only by…" line. When it's
  empty, they see KennelOS's name. It's stored in `pay_methods.own_label`. The bundle
  already keeps it across updates.
- **Fee names.** Each of the four stages gets a name from the site's fixed wording (the
  owner's Wording screen, `content/rules.js` words): `pay_fee` "Application fee" and
  `pay_deposit` "Puppy deposit" exist; add `pay_payments` "Payments" and `pay_final`
  "Final payment". The breeder's own card title (Application fee and Deposit cards) still
  wins on those cards, as now.
- The breeder's wording for the screen goes in `manage/wording.js` (decision 19), for the
  owner to word.

## Step 2. The records: a "payment method" kind in `content/fields.js`

One record per method, read from `snap.payment.methods`. Fields a block can use:

| Field | Kind | For |
|---|---|---|
| Name | text | order, conditions ("is Cash") |
| Fees (stages) | list, values in sale order: Application fee, Deposit, Payments, Final payment | **group by fee**; scoping ("Fees include Deposit") |
| Has a link | bool | e.g. "only methods with a Pay button" |
| Has instructions | bool | |
| From KennelOS | bool | |
| Has a discount | bool, with its name | "Save paying by bank or cash"; choose by it |
| Pays for (payments) | list: Puppy price, Boarding, Transport, Extras | **group by charge**; "Boarding: Cash" |
| Pays for (final payment) | list, the same values | as above, for the final payment |

- **Group by Fees:** a method goes under each fee it's taken for, so Zelle shows under all
  four. Groups come in sale order and use the fee names from step 1. Check that list
  grouping keeps the values' order; Tags and colours group by list today.
- **Group by Name, or no grouping:** each method once, with its fees as pills. That's the
  "one section per method, and every fee that can be paid that way" layout.
- **A method's key:** `key` from KennelOS (C13); unticks and picks are keyed by it (by
  the label in lower case only for a method from a KennelOS that sends no key), so they
  survive a rename in KennelOS, as her names already do.
- **Group by charge:** a method goes under each kind it pays, per stage, so "Payments ·
  Boarding: Cash" reads straight from `pays`. A group's lead line, "Pay boarding by Cash".
  Charge names go in the site's fixed wording beside the fee words (`pay_kind_price`
  "Puppy price", `pay_kind_boarding`, `pay_kind_transport`, `pay_kind_extras`).

## Step 3. The block: "Ways to pay"

A new data block type, `payments` in `content/blocks.js` `BLOCK_TYPES`, which goes on any
page, as many times as wanted. The owner's settings, in the admin view (`manage/builder/
records.js` and `blocks.js`, as for Extras):

- **Which methods:** conditions, as for any data block. To scope a block to a page, use
  "Fees include Deposit" (or Deposit and Final payment) on the Puppies page.
- **Order:** hers (KennelOS's order), or by name.
- **Group by:** none, Fees, or Name. **Groups as** (`GROUP_SHOW`, plus one new option):
  - a heading over each group;
  - a **Show filter** (the pill row, as on the Dogs page), which works like tabs for each fee;
  - **a card per group** (new): each fee as one box holding its methods. This is today's
    fee card, and what "one block per fee, with every method you can use to pay it" looks
    like.
- **Style** of the methods inside, all from the template's existing components
  (`ak-sample.html`: Expanders, Slider, Flip cards, Steps, How to pay):
  - **Expanders:** a choice per method, one open at a time (as built on the cards);
  - **Rows:** name, instructions and Copy on one line each (the cards' `.methods` list);
  - **Cards side by side:** each method a small card with its button and note;
  - **Slider:** the same cards in a slider;
  - **Flip cards:** the name on the front, the button and note on the back;
  - **Step cards, numbered:** for Group by Fees, a numbered card per fee in sale order (1
    Application fee, 2 Deposit, 3 Payments, 4 Final payment), with the methods inside.
- **What each item shows** (ticks, like a dog card's items): name, its fees as pills, the
  Pay button, instructions, the Copy button.
- **What each group shows** (Group by Fees): the fee's name; its **When** line and her
  note ("Additional Payment Instructions") where the fee has them (Application fee and
  Deposit cards); a **lead line**, "Pay your {fee} by {methods}" (for example, "Pay your
  deposit by Zelle or PayPal"), on or off.
- **Button wording:** "Pay with {method}" by default, in the block's words.
- **The safe-payment notice** under the block: on or off.
- **Where "How to pay" points:** one block on the site can be marked as the How to pay
  place. The footer link, How it works steps with How to pay ticked, and the notice on pup
  pages then link to it (`/<its page>#<block>`) instead of `/waitlist#how-to-pay`. With
  none marked, they link as now.
- **The waitlist's own How to pay section** stays as it is. A switch on the waitlist page
  turns it off for a site whose Ways to pay block replaces it (open question 3).
- **The breeder:** her Site Manager lists the methods each block will show, all ticked, and
  she can untick any of them (`block_picks` omit, `content/picks.js`), as on every data block.

Copy, per KennelOS and the owner's rule: short, plain, and selling. Say what to do. No
disclaimers, no "secure" or privacy wording, and no fee per method or "card fee" (no
surcharge).

**Look:** there's no prototype screen for this block. It's built from the prototype's
existing components, listed above, and checked at 390px and on a computer beside the
waitlist's How to pay. New CSS (the card per group, pills inside a method, the numbered fee
steps) needs an `ASSET_VERSION` bump: ask first (CLAUDE.md).

## Step 4. Later, from KennelOS

- **Amounts (Payment Methods Phase 4):** a cost-cover amount beside each price (contract
  C12, section `cost_cover`, not taken yet), now with the deposit's share too
  (`deposit_service_fee_female` / `_male`). That would become a group's line under the
  fee name.
- **Discount for a way of paying (Phase 5):** **kept** (2026-11-26): `discount` on a
  method (C13), her payment-method discount's name ("Bank or cash discount") on each
  method she ticked Discounted, stored as `pay_methods.discount` and in the snapshot. No
  amount: it differs per payment. For the block: an item on a method ("Saving", her name
  for it) and a field to group or choose by ("Has a discount").

Each is one more tick in what a group or item shows.

## Building it, in order

1. Names: the methods listed on How to pay, the "Your name for it" boxes, and the two new
   fee words. No migration, and no stylesheet change.
2. Records: the kind in `fields.js` (with its field test), keys in the snapshot.
3. The block: type, defaults, admin settings, rendering in `render/pages/payments.js` (new),
   and the breeder's unticks. The `ASSET_VERSION` bump is asked for here.
4. The How to pay place: links follow the marked block. The waitlist section's switch.

Each step ships on its own. None needs a migration: 0047, on the C11 branch, already holds
`own_label`.

## Open questions (the owner's)

1. ~~Who gets the name boxes?~~ **The breeder** (the owner, 2026-11-25), on her How to pay
   screen. Built.
2. ~~Payments and Final payment have no note~~ **KennelOS sends her words for every
   stage** (C13, `pay_notes`). No When line comes: her timing differs by schedule, so she
   writes her usual timing in a text block (the owner, 2026-11-26).
3. **The waitlist's How to pay section** once a Ways to pay block exists: keep both (my
   recommendation: the block is optional, and nothing changes until she places one), or
   replace the section with a default Ways to pay block on the waitlist page.
4. ~~A stable key per method~~ **Sent** (C13: the Account id, as `products` already
   carries; the owner, 2026-11-26).

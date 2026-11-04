# Puppy Parent Portal: plan

> A sign-in-only portal for one breeder's puppy families, built as a module of the
> KennelPort Worker and switched on for her site alone. Revised from the first roadmap
> (Nov 3, 2026) after review: it now reuses KennelPort's stack, takes starting data from
> KennelOS without depending on it, and adds data retention. Built so far: the Site
> Manager's new look and its sectioned forms (section 7.3, Site Manager version 12), and
> phase 1's first build chunk (section 6: the core, typed in by her; build log, Nov 4).

## 1. Purpose and scope

The portal's main job is to put her referral and affiliate programs in front of families
at the moments they apply: current food on the go-home page, insurance activation on the
first-weeks timeline. Today she relies on paperwork and Messenger reminders. The portal
also holds her puppy handbook, each puppy's records, the 3-day vet visit countdown and a
shared baby book.

Secondary returns: fewer repeated questions, reliable 3-day vet visits, and more repeat
and referred buyers.

**Where it sits in her families' journey:**

| When | Where the family goes |
|---|---|
| Applying, on the waitlist, picking a puppy, until the contract is signed | Her KennelOS family status page, as today |
| **From the signed contract to pickup** | Both. The status page keeps everything it does today: booking the pickup, asking for extras, transport, backing out, and messages to her. The portal opens alongside it (the invite goes out when the contract is signed) for the countdown, checklist, vet booking, handbook, programs and, for a stay, the weekly updates. Portal messaging is off; the portal links to the status page for anything it handles |
| **From pickup on** | The portal only. The status page shows a link to the portal and nothing else for that family; portal messaging turns on |
| **If the puppy dies or fails a health check before pickup** | The portal says so gently and sends them back to the status page, where they're back in line for a replacement (section 7.4) |

KennelOS's Companion links and the Furever app are not used for her families: KennelOS
turns them off for her kennel (section 3.4). Every other breeder keeps KennelOS as it is.

**In scope:** one breeder, about 10 litters and 60–80 families a year.

**Out of scope for now:** offering the portal to other KennelPort breeders. The module is
written so it could be switched on for another site later, but nothing is built for that
(no setup flow, no per-site handbook templates).

**Three rules that shape everything below:**

1. **The portal owns its data.** KennelOS feeds in starting content; it is never the
   source the portal depends on. If she leaves KennelOS, nothing in the portal breaks or
   disappears (section 3).
2. **She can add, change and delete anything that families see.** Content lives in her
   admin screens, not in code. The only fixed rules are the ones her contract sets
   (section 4).
3. **What families see is written for families.** KennelOS records facts; the portal
   presents them in her words, with her photos, after she has edited them (section 3.3).

## 2. Where it lives

A module of the existing KennelPort Worker, on for her site only, rather than a separate
app. It reuses what KennelPort already has working and tested:

| Need | Reused from KennelPort |
|---|---|
| Hosting, database, files | The Worker, D1 and R2 (`worker/wrangler.toml`) |
| Sign-in | Email code sign-in, hashed codes and sessions, rate limits (`auth.js`, migration 0003) |
| Email | Resend through `mail.js`, her domain verified |
| Photos | Upload, resizing and serving through the Worker after a check (`photos.js`), tested on real iPhone and Android |
| Albums | `albums` (migration 0011), for her litter photos |
| Her admin | New screens in the manage app she already has installed on her phone |
| Referral links | The `products` table (migration 0016): name, link, code, code note, `kennelos_id` |
| Scheduled jobs | The daily cron and `cleanup.js` |
| Notifications | Web push (`push.js`), as an optional extra to email |
| Download a copy | The existing "download a copy" export, reused for families |

**Address:** a path on her site (for example `/family`) or a subdomain
(`family.herkennel.com`), linked from a **Puppy Parent Login** button. Which one depends
on whether her public site is a KennelPort site (open question 1).

**New pieces:**

- **Family sign-in.** A second kind of session, kept apart from breeder sign-in: a
  family session can only read and write that family's own pages. Same email code plus
  tap-to-sign-in link, sessions lasting up to a year.
- **Readable email addresses.** KennelPort stores only a keyed hash of each address
  (migration 0003), because it only emails people who just typed their address in. The
  portal sends reminders and birthday emails months later, so it must store families'
  addresses. Store them encrypted at rest, with the key a Worker secret, and keep
  the hash for sign-in lookups. Never log them (`wrangler.toml` already forbids it).
- **Family-facing pages** in her site's style, using the KennelPort template's scheme.
- **Messages to her, from pickup on.** Before pickup families message her from the
  status page, as today, and the portal's message button says so and links there. From
  pickup the portal's own messages take over: they land on the family's screen and on her
  Today, with an email or push if she has those on.
- **More from KennelOS** (sections 3.2 and 3.4): the feed KennelPort already takes,
  extended for her site, with everything it brings editable.

**Changes to the KennelPort plan,** when this is approved: decision 20 says "no
KennelPort portal" and needs rewording to "no portal for every breeder; a family portal
module for one site (`Puppy_Parent_Portal_Plan.md`)"; and plan 5.3's read-only rule for
linked sites doesn't apply to her site (section 3).

## 3. KennelOS: a feed, not the source

KennelPort's own rule for linked sites (plan 5.3) makes KennelOS fields read-only while a
site is linked. **Her site uses the opposite rule, everywhere: on the portal's records and
on the site's own litters, puppies and dogs.** Everything the feed brings is a starting
value she can change, personalize or delete at any time; nothing is ever locked because it
came from KennelOS. Things change after the fact (a pickup moves, a name is changed, a
price is renegotiated), and she needs her records to say what really happened, in her
words, not only what KennelOS says today.

### 3.1 How imported data behaves

- **Each imported row records where it came from:** `source` (`kennelos` /
  `portal`), its `kennelos_id`, and which fields she has edited (`edited_fields`).
- **A KennelOS change only updates fields she hasn't touched.** If she has edited a
  field and KennelOS changes it, her admin shows "KennelOS has a newer value: use it /
  ignore". Her value stays until she chooses.
- **History, not just the current value.** Every change to a record, from the feed or
  from her, is kept with its date and where it came from (`portal_history`, section 9):
  the pickup that moved from Dec 23 to Dec 27, the extra added and later cancelled, the
  puppy renamed by its family. Her screens show the current value with **History**
  beside it, and anything that counts as evidence (pickup times, vet deadlines, reminders
  sent) is read from the history as it was then, never recomputed from today's value.
- **A KennelOS removal never removes her record.** If something disappears from the feed
  (a sale voided, an event deleted), the portal marks it "no longer in KennelOS" and asks
  her what it means; it stays until she decides.
- **Deleted stays deleted.** Deleting an imported record leaves a marker holding only its
  `kennelos_id` and type, so the next sync doesn't bring it back. The marker holds no
  name or email.
- **She can add anything KennelOS doesn't have:** a family, a puppy, a product, a
  timeline task.
- **Unlinking changes nothing.** The portal already holds every record; unlinking
  only stops new suggestions.
- **Nothing a family sees comes straight from KennelOS.** Imports land in her admin first
  (as records she can check, or as drafts, section 3.3).

### 3.2 What KennelOS feeds in

One feed: the one KennelPort already takes from KennelOS (`siteExport.js`, KennelPort's
`worker/src/kennelos/bundle.js`), extended for her site to carry whatever keeps the
handoff seamless. Today it carries only what the public website shows; the rows marked
**New** are what it gains for her. What only the portal needs never reaches her public
pages: it lands in the portal's own tables, signed-in only.

| From KennelOS | Feed today | Becomes |
|---|---|---|
| Litters, puppies (name, sex, colour, status, registration) | Built | The site's records, as KennelPort already imports them |
| Accounts marked **Show on website**: referral links, codes, code notes | Built | `products` rows, as KennelPort already does. The account's KennelOS type (insurance, registry, supplier) suggests the portal's product type |
| The family (contact name and emails), the puppy they picked | New | Family and placement records. She confirms before the invite goes out |
| The pickup: the `placement` event's date, time, place and method, from her own entry or the family's approved booking on the status page | New | A suggested pickup time; she confirms it (section 5) |
| Microchip (`Dog.microchip_id`), registration type on the sale | New | Suggested values on the placement |
| The signed contract (its signed date, and its document if one is stored) | New | The invite (section 3.4); the contract under Records |
| A sale voided with the reason pup died or failed health check, and the family put back in line | New | The placement closed and the portal's loss page (section 7.4) |
| Vaccination, preventative (deworming) and vet visit events on the puppy | New | Health records on the puppy |
| Milestone and weight check events | New | Baby book **drafts** (section 3.3) |
| Extras on the sale (`Sale.extra_charges`); a training package's `boarding` stay (reason Training, tied to the sale and the extra) | New | The placement's extras (section 8.1); a stay's go-home date and weeks (section 8.2) |
| Her feeding schedule (`breedFeedingScheduleRepo`: brand, amounts by weight and age, notes; a litter's own override) | New | A suggested **What she's eating now** (section 7.2) and the handbook's Feeding chapter |
| How the buyer found her (`Sale.lead_source`), who referred them (`Sale.referred_by_contact_id`), earlier sales to the same buyer, deposit and balance dates against their due dates, her waitlist application's answers | New | Suggested buyer details (section 12.2) |
| Extras income per litter (sales' extra charges, KennelOS's income figures) | New | The Reports page's extras income (section 12.1) |
| The dog marked deceased; a sale returned, or ended with pup died or health problem | New | A suggested life status on the placement (section 9) |

Never from KennelOS: page text, handbook, email wording, layout, photo choice, visibility.
Never from KennelOS either, because it doesn't record them: who used a program's link or
code (no program reports that, `referralShare.js`), so program sign-ups come from the
programs' own reports (section 12.1); and the go-home bag (section 8.4), which is the
portal's own.

### 3.3 Milestones: data in, story out

KennelOS records facts: "eyes open, day 12", "weight 2 lb 3 oz, day 21". A baby book
entry is something else: her title, her story, her photos, the date she chooses to show,
its order and who can see it. So there are two layers:

1. **Drafts.** KennelOS milestones and weights arrive as drafts in her admin. Families
   never see a draft.
2. **Entries.** She turns a draft into an entry (rewriting it), merges several drafts
   into one entry ("Week 2: eyes open and first wobbly steps"), writes an entry from
   scratch, or dismisses the draft. Weights can show as a chart on the puppy's page if
   she switches that on.

Editing an entry never changes KennelOS, and a later KennelOS change to the milestone
never changes her entry. At most it shows "KennelOS changed this milestone" on the draft.

### 3.4 The feed for her site, and the handoff

**The feed's new part** is work in KennelOS: for her kennel only, the rows marked New in
section 3.2, for each family from their signed contract on. It keeps KennelOS's way of
building a feed (each field named, nothing sent by accident), and it may change as her
needs do.

**The handoff, step by step:**

1. **The signed contract.** When the sale's contract is signed in KennelOS (a Contract
   linked to the sale, status Signed, with its signed date; by e-sign or marked by her),
   the feed sends the family and their puppy. Picking a puppy alone isn't enough:
   a family can still change their pick or back out before signing, and all of that stays
   on the status page. Her Today shows **Invite the Reed family**; the invite goes out
   when she confirms.
2. **From the signed contract to pickup.** The family uses both. The status page keeps booking the
   pickup, asking for extras, transport, backing out and messages; each approved change
   reaches the portal through the feed (a new pickup time, an added extra, a back-out,
   which closes the placement and stops its reminders). In the portal, the buttons for
   those link to the status page ("Book your pickup on your status page"), and portal
   messaging is off.

   **One tap between the two, not two sign-ins.** The status page shows **Open your puppy
   portal**, which signs the family straight in: KennelOS's server makes a link that works
   once, for 10 minutes, for that family only, signed with the key her site and KennelOS
   already share for the link, and the portal checks it and starts a family session (the
   same session as an email code gives, section 2). The portal's links back to the status
   page do the same the other way, using the status page's own sign-in. The invite email
   and the email code still work on their own, for a family who comes in from email.
3. **Pickup.** She marks the puppy picked up in the Site Manager, which starts the vet
   clock (section 5). The portal tells KennelOS through the feed's reply, and from then
   the status page shows that family only **Your puppy portal**, a link. KennelOS also
   switches over on its own once its pickup date has passed or the sale is Delivered,
   whichever comes first, so a missed tap doesn't leave a family on both.
4. **From pickup on.** The portal only, with its messages on.

**If the puppy dies before pickup.** She records it in KennelOS as she does today: the
sale is voided with the reason pup died, and KennelOS puts the family back in line at
their original place, with what they'd paid carried to their next puppy
(`restoreAfterLostSale`). The feed tells the portal, which closes the placement (life
status deceased, before pickup) and turns the family's portal into the page in section
7.4. The status page takes the family back in full, as before their contract, so they
pick and sign for their replacement there. When the replacement's contract is signed,
the feed sends it as a **second placement on the same family** (section 9), so their
account, emails and anything they added carry on.

**The feed sends on its own, for her kennel.** Today KennelOS sends to KennelPort only when
she presses Update website. That's right for her public pages, but not for families: a
signed contract, a booked pickup, an approved extra or a lost puppy has to reach the
portal without her remembering a button. So the feed's new rows go by themselves, from her
device, whenever one of their records changes, and again whenever KennelOS opens. Website
pages still wait for Update website, as now. Because KennelOS runs on her device, nothing
moves while it's closed on every device she has; the same is true of the status page,
which her device publishes. So:
- her Site Manager shows **Last from KennelOS: 2 hours ago** on Today and on each family;
- if a family's placement is open and nothing has come from KennelOS for 24 hours, Today
  says so ("Open KennelOS so your families' pages are up to date");
- the status page's switch at pickup also happens on its own on the server, once the
  pickup date has passed, so it never waits for her device.

**A few facts go back to KennelOS, with no new setting.** What she records in the Site
Manager that KennelOS also keeps comes back through the feed's reply and is applied at
KennelOS's next sync, the way family requests are, but without asking her to approve it,
since she made the change herself:
- **picked up, and its time:** the pup's pickup (`placement` event) gets the real time,
  and the sale is marked Delivered if it isn't already, so KennelOS's own go-home nudges
  stop;
- **a corrected pickup time** before pickup: the same event moves;
- **the microchip** she enters or corrects;
- **a death after pickup** she records: the dog is marked deceased with its date.

Anything with money in it (a return, a rehoming, a refund) never goes back on its own:
KennelOS shows it as a Today nudge for her to handle there. Everything else she edits in
the portal stays the portal's (section 3.1).

**What KennelOS changes for her kennel:** the feed's new rows, sent on their own; the
facts that come back; the one-tap link to the portal; the status page's handoff (steps 2
and 3); and Companion and Furever off (no Companion link request on her status page, no
Send to Furever for her pups). Nothing changes for other breeders.

## 4. What she can change

Everything families see is content she edits in the manage app:

- **Products and programs:** name, link, code, what the family has to do, which pages and
  chapters each appears on, order, on or off.
- **Go-home checklist:** her default list, plus additions or removals for one family.
- **First-weeks timeline:** task templates (title, wording, days from birth or pickup,
  linked program), plus changes for one family's timeline.
- **Handbook:** chapters she writes and orders in an editor in the manage app, with
  product links placed inside the text. Stored in the database, not in files, so she
  needs no one to change it.
- **Email wording:** vet reminders, birthday, milestone and retention warning emails,
  each with a preview. The legal parts (unsubscribe link, mailing address, deadline) are
  added by the template and can't be removed.
- **Kennel info, FAQ, upcoming litters.**
- **Baby book:** her entries, photos and order; which family entries she reposts (with
  their permission, section 9).
- **Families:** add, edit, resend invite, Keep (pauses retention deletion), delete.

**Deleting is undoable** for 30 days (the same pattern as KennelPort's litters and
removed photos), except an **erase**, which happens when a family asks for their data to
go and is final.

**Fixed, because her contract sets them:** how the vet deadline is counted, and that
the countdown reminders send. She can correct a pickup time, but not switch the
countdown's rules off for a family.

## 5. The 3-day vet visit countdown

The highest-stakes feature: missing the visit voids her curable-conditions guarantee.

- **Deadline counted exactly as the contract words it:** 72 hours, or 3 calendar days in
  her time zone (open question 4). One function computes it, with tests for both forms
  and for a pickup late in the evening.
- **Pickup time is editable.** "Picked up" sets the time to now, but she can enter or
  correct the actual time later, and the deadline and reminders move with it. A
  KennelOS pickup date pre-fills it; she confirms.
- **The clock never waits on a tap.** If the booked pickup time passes and she hasn't
  marked the puppy picked up, the portal starts the clock from the booked time anyway,
  sends the pickup reminder, and her Today asks **Did Opal go home at 11:00 am?** with
  **Yes**, **Change the time** and **Not yet**. Not yet stops the clock and its
  reminders until she marks the real pickup. Every start and change is in the placement's
  history (section 3.1), so the reminder log shows which time each reminder was sent
  from.
- **Reminders count back from the deadline**, not forward from pickup, so none can land
  after it:
  - **Before pickup** (from the planned go-home date, about 5 days ahead): "Book your vet
    appointment now." Vets are often booked days out. This is also on the go-home
    checklist. The family records the booking with **I've booked it** (date, time and,
    if they like, the clinic), which shows as Booked on her side and stops this reminder.
  - **At pickup:** the deadline, in her time zone and theirs.
  - **About 24 hours before the deadline.**
  - **The morning of the deadline day**, only if no proof has been uploaded.
- **Proof upload:** the family uploads a vet receipt or record (photo or PDF). She sees
  it in her admin and marks it accepted. What counts as proof comes from her contract.
- **Reminder log:** every reminder records when it was sent, to which address, and
  Resend's delivered or bounced result. If a family says "you never told me", this log
  is her evidence. A bounce alerts her in the manage app so she can text the family.
- **The portal is a reminder, not legal notice.** The contract still states the
  requirement. The countdown page says so.

Text-message reminders stay in phase 3, moved earlier only if email reminders get
missed.

## 6. Features and phases

Each phase starts when the previous one's gate is met. No dates.

### Phase 1: pickup and programs

The revenue placements and the vet countdown, and nothing else:

- Family sign-in and invites
- Admin: litters, puppies, families, placements, picked up (KennelOS import optional)
- My Puppy page: name, litter, sex, colour, microchip, registration, shot and deworming
  record, contract PDF, her photos
- Vet countdown, reminders, proof upload, reminder log
- Products and programs, the go-home checklist with **What she's eating now**, and the
  first-weeks timeline (AKC registration, insurance activation, vaccines, deworming),
  with each family's program status
- Click tracking and the affiliate disclosure
- Retention basics: invite expiry, the activity date, erase on request (section 10)
- Extended stays: the package on the placement, its go-home date, the timeline split
  between her and the family, and weekly updates with skills and photos (section 8.2)
- The KennelOS feed's new rows, sent on their own, the few facts that go back, the
  handoff and the one-tap link (section 3.4); portal messages from pickup
- A puppy who dies or fails a health check before pickup: the family's quiet page and
  the way back to the status page (section 7.4)
- History on every record (section 3.1)
- Her Site Manager as one app for the website and the portal (section 7.3): Today with
  both sides, Families with the waitlist, Dogs shared, the Portal tab
**Gate:** one litter run from signed contract to the vet visit with no fixes by hand,
including one pickup she forgot to mark (section 5).

### Phase 2: handbook and keepsakes

- Handbook chapters with links in context (she may be writing these during phase 1)
- Baby book: her entries weeks 0–8, family entries after pickup; KennelOS drafts
- Sharing levels and her view of shared entries
- Life status (placements) and `remembered` (her dogs) enforced on all birthday logic
- Birthday emails with unsubscribe; birthday banner
- Kennel info, FAQ, upcoming litters
- Retention in full: warning emails, Keep, download everything, daily deletion
- Photo and video packages: full-resolution uploads, video in parts, playback, delivery
  status, download all (section 8.3); video in stay updates
- The go-home bag: her template, what each family was sent, and **What came home in
  Opal's bag** on Records (section 8.4)
- Buyer details she records on each family's screen, pre-filled from KennelOS
  (section 12.2)
- The Reports page, which uses both: sign-ups by litter, where families click, earnings, extras income,
  the go-home bag against sign-ups, the families who've brought her the most, and who her
  buyers are (section 12.1). Its before-portal baseline is typed in before launch
  (section 12), and the program reports from phase 1's litters are typed in as they come,
  so the page opens with real figures

**Gate:** a litter's families have used the baby book for a month, and the first
retention warning has gone out correctly (send one to a test family first).

### Phase 3: retention extras

- Monthly milestone emails ("Your puppy is 4 months: here's what's next")
- Printable baby book export (PDF or photo book)
- Optional passkey sign-in, never required
- Text reminders for the vet visit, if email proves unreliable

**Phase 1, in build chunks.** Each chunk is one branch and one migration, usable on
its own:

1. **The core, typed in by her** (built; the fallback below, made whole): family sign-in and
   invites at `/family`; families, placements, pickup, health records and the contract
   on her side; My Puppy and Records; the vet countdown with its reminders, **I've booked
   it**, proof upload, acceptance and the reminder log; the programs on Home with click
   tracking and the disclosure; history on placements; the portal switched on per site
   from /ops.
2. **Checklist, timeline and programs:** her templates, each family's ticks and program
   status, the food band.
3. **KennelOS:** the feed's new rows, the handoff, the one-tap link, the facts that go
   back.
4. **Messages from pickup, the loss page, bounces, erase and retention basics, push.**
5. **Extended stays** and weekly updates.
6. **Her Site Manager as one app** (section 7.3): Today, Families, Dogs, Portal tabs.

**Fallback:** if a litter goes home before phase 1 is done, ship sign-in, My Puppy, the
vet countdown and the program links on the go-home page alone, with families and pickups
typed in by her rather than fed from KennelOS.

## 7. Look and screens

The look follows her site: the Lawn scheme of the AK sample (ivory ground, tuxedo ink,
lawn-green accent, brass labels; Fraunces, Mulish and Pinyon Script) and the design
direction's rules (`KennelPort_Design_Direction.md`), with one thing decided by the breeder
herself: **the family pages are photo-led and use icons**, as in the first mockups. She
liked the photo across the top, the round puppy photo beside what's due, and the quick
links as icon tiles, and said a flatter, text-led version lost that (Nov 4, 2026). The
clickable prototype, which follows this, is
[`reference/portal-prototype.html`](reference/portal-prototype.html).

### 7.1 Style rules

- **Photos and icons lead.** Every page that's about a puppy shows that puppy's photo;
  her kennel photos fill the top of Home; galleries, update cards and baby book entries
  are photo-first. Icons from one set mark every tile, tab and status box, inside a
  soft tinted square.
- **Softly rounded:** cards, tiles and section bands 14px; buttons, inputs and small
  photos 8px; icon squares 12px; the puppy's photo and the header logo round (the values
  the Site Manager already uses, `--r` and `--rc` in `app.css`). Buttons are rounded
  rectangles: one solid button for the main action on a screen, outlined or
  text-with-arrow for the rest. The fully round exceptions are few and named: the round
  button on the dark food band and on the stay's **Write this week's update**, the
  Everything / From A-K / From us and Charts / Table toggles, and filter chips.
- **Status is a word with a small mark** (Done, Next, Booked, Overdue), not a coloured
  lozenge. Red means trouble (overdue, bounced, no proof near the deadline), never
  "coming up".
- **Script lettering twice a page at most:** the greeting at the top and the puppy's name
  on the profile card. The kennel name in the header is set in the display serif beside
  her logo.
- **Links look like text or the accent colour**, with a small arrow when they leave the
  portal. No raw addresses.
- **Light and dark**, following the device, like her site.
- **Icons from one free set** (Lucide or Tabler), served from the site.
- **Variety down the page, not a stack of identical cards** (her feedback, after pointing
  to the Hill's, Farmer's Dog and Chewy sites, Nov 4, 2026). Each home page mixes section
  types, each used about once: a full-width photo with the greeting over it; the pup card
  (round photo, script name, a coloured gender sign) beside a green calendar block for
  what's due; tinted bands with big headlines; ring gauges with icons for stay skills;
  big numbered steps joined by a line; a dark green band for the food with a row of
  three checkmarks and a round button; side-scrolling photo cards for the baby book and
  photo package; an icon-led highlight list for the included programs; photo-on-the-left
  rows with a round arrow for handbook chapters; the icon tiles for quick links.
- **A pinned action bar** above the tabs on Home holds the one thing to do now (hours left
  and **Upload** in the vet window, **I've booked it** before go-home, the week's stay
  update, the next task).
- **Two columns on a phone.** Small edges (10px), compact type (14px base on a phone,
  15px on a computer) and a tile grid that's two columns on a phone and four on a
  computer.
- **Text size:** an **Aa** button in the header steps through three sizes, remembered on
  that device. The largest takes a phone back to one column.
- **Real photos** from her albums, one set per puppy. No stock photos. A missing photo
  shows a drawn paw placeholder, never a broken image.

### 7.2 Family home: it changes with the puppy's stage

One page, four states, worked out from the go-home date, pickup time and today:

| Stage | Top of the page | Below it |
|---|---|---|
| **Before go-home** (from the signed contract) | "Opal comes home in 5 days", the pickup day and time, or **Book your pickup on your status page** while none is booked | **Book your vet visit now** (with the deadline it will have), the go-home checklist, **What she's eating now** |
| **Pickup to vet deadline** | The vet visit: hours left, the deadline's date and time, booked or not, **Upload vet record** (the page's one solid button) | Insurance activation and its deadline, the food, the next timeline tasks |
| **Weeks 1–8 and on** | The next task or two ("Register Opal with AKC by Jan 22"), each with its link | A prompt to add to the baby book, the vet visit shown as done |
| **Later** | Birthdays (littermates by call name, with permission), "a year ago today" from the baby book | Monthly milestone, the printable book (phase 3) |

- **Layout, top to bottom** (as the prototype has it; each section type once, section
  7.1):
  1. a full-width photo with the stage's greeting ("Welcome home · Opal is home"), kept
     short on a phone (about 180px) so what's below still shows without much scrolling;
  2. the pup card (round photo, script name, gender sign, born, go-home, any stay) beside
     the green calendar block for what's due now (comes home in N days, hours left for
     the vet visit with **Upload record**, week 3 of 4 of the stay, the next task);
  3. the stage's own band of big numbered steps (how the stay works, the vet visit's
     book / see / upload, what's next), or the stay's skill rings;
  4. the go-home checklist, from two weeks before go-home;
  5. the photo package (its progress, or its photos once delivered), or before go-home,
     for families without one, the offer;
  6. the dark green food band;
  7. the baby book's side-scrolling cards (from go-home on, and through a stay);
  8. **Included with Opal**: the insurance trial, AKC registration and A-K's picks as an
     icon-led list;
  9. **Read next**: three handbook chapters as photo rows;
  10. **Quick links**; the disclosure.

  The pinned action bar sits above the tabs (section 7.1).
- **Quick links:** Puppy handbook, Photo album (Photo package if bought), the puppy's
  records, Baby book, Timeline (Stay updates during a stay), and **A-K's picks**, her
  recommended products in one place with the disclosure. One picks tile replaces the
  mockups' separate "Referral program" and "Affiliate deals" tiles, so the row doesn't
  read as an ad funnel. Program links also sit inside the checklist, timeline, food
  tile and handbook.
- **The food card names the exact food** (brand, formula, bag size, how much and how
  often), not "the same food we send home".
- **Insurance wording comes from the program** ("Activate Opal's free trial by Dec 28"),
  never "Get a quote" or "peace of mind".
- **The affiliate disclosure** sits at the foot of every page with program links.
- **Bottom navigation: five tabs** on a dark green bar, each with its own icon, the
  current one highlighted: Home, Timeline (Stay from the signed contract until a stay ends), Photos,
  Baby book, Records. The handbook and picks are in Quick links.
- **Account** opens from the header: the family's emails; email choices (vet and go-home
  reminders, and stay updates while a stay runs, are always on; birthday and, from phase
  3, monthly tips can be turned off); **Download everything**; sign out; and **Delete our
  account**, which is the erase of section 10 asked for by the family themselves, after a
  confirmation, keeping her sale records.
- **Messages:** before pickup a **Message A-K** button links to the status page; from
  pickup on it opens the portal's own messages (section 2).
- **Smaller pieces the prototype shows:** a search box on the handbook; the puppy's
  pedigree with the contract and health guarantee under Records; family baby book entries
  only once the puppy is home.

### 7.3 Her screens: one app for the website and the portal

The portal's admin is not a second app or a separate section: the Site Manager she
already has becomes one app for her website and her families, in the look of section
7.1 (already applied to the existing screens: Fraunces and Mulish, the softly rounded
corners, the teal header that matches the app icon). Six places, a sidebar on a computer
and tabs on a phone:

| Tab | Holds |
|---|---|
| **Today** | Everything that needs her, from both sides (below), plus "N website changes not published" with **Review and publish** |
| **Families** | **Puppy families** (the portal) and the **Waitlist** (the website's list), so a family moves from one to the other when their contract is signed and gets their invite then (section 3.4) |
| **Dogs** | Dogs, litters and puppies: one record each, used by both. A puppy's website status sits beside its family and pickup. Stay puppies' weekly updates and photo packages are here, and KennelOS baby book drafts |
| **Website** | Publish, view, preview, share; the inbox and reviews to approve; photos and albums; pages and wording, waitlist and application, how to pay, extras, recommended products, kennel details, KennelOS (today's Site Manager screens) |
| **Portal** | What families see: the extras it delivers (each one's delivery type, skills, cadence, package contents), the go-home bag template, buyer details she tracks, handbook chapters, programs and where each shows, checklist and timeline templates, email wording |
| **Reports** | Programs, earnings, extras and her buyers (section 12.1) |

**Shared, not copied:** photos and albums feed both the website and baby books, and
the website's Recommended products are the portal's programs: one list, one place to
change a link or code.

The screens:

- **Today** leads with what needs her, from the website and the portal, and shows only the items that are there:
  - puppies going home in the next 7 days, each with its pickup time and whether the vet
    visit is booked, and **Mark picked up** (the solid, main action on the day itself);
  - families to invite, their contract newly signed in KennelOS (section 3.4);
  - vet proof to review, with **Accept**;
  - vet visits not booked as pickup nears;
  - emails that bounced (so she can text the family);
  - stay updates due, and photo packages with a session or due date coming up;
  - invites not accepted;
  - KennelOS drafts to review;
  - families due for deletion in the next 30 days;
  - new messages: from families (from pickup on), from the website, and reviews to approve.
  
  Totals such as "62 families" are not on Today.
- **Vet visits** list each placement with its status in words: Not booked, Booked, Record
  uploaded, Accepted, Missed, and time left. Only the ones in trouble are red (Missed, and
  Not booked with under 48 hours left).
- **Activity** shows actions (completed the checklist, uploaded a record, shared
  photos), not page views. If page views are ever shown, the privacy page says so.
- **Families:** each family's emails, puppy, pickup time (editable; the deadline
  moves with it), vet proof, reminder log, program status, their messages, **Extras**
  (each with its status and whether KennelOS sent it, section 8.5), **Sent home with**
  (section 8.4), **About this family** (section 12.2), **Keep**, resend invite, delete
  (undoable for 30 days) and erase. The Waitlist side lists the families waiting, in
  order; offering a puppy stays in KennelOS.
- **Dogs:** each puppy's card with its family, go-home, extras and website status
  (KennelPort's own: Available, Reserved, Placed, Staying, which on the site reads
  "Joining our program" for a puppy she keeps, so an extended stay is never shown as
  Staying; a stay is an extra on the placement, section 8.2). **Write this week's
  update** for each stay puppy; each photo package's status and uploads; KennelOS
  milestones to turn into baby book entries, or dismiss.
- **Portal:** the extras it delivers and how (section 8.5), the go-home bag template
  (section 8.4), **Buyer details you track** (section 12.2), handbook chapters (order,
  on/off, edit), programs and where each appears, checklist and timeline templates, email
  wording, and whether the weight chart shows on puppies' baby books (section 3.3).
- **Reports:** section 12.1.
- **Setup progress** shows only while something is unfinished.
- **Her screens get the family pages' variety** (same tiles, bands, pup cards, calendar
  blocks, rings and photo rows), and **every long form is sectioned:**
  - fields under titled sections that match how she thinks (The litter, Parents, Dates,
    Prices; About, Photo and story, Where they show; for a puppy, The puppy, Photo and
    story, and, once the portal is on, Family and extras: family, picked up, microchip,
    extras);
  - short fields two to a row (girl and boy prices, born and ready, dam and sire), with
    hints under the input so neighbours line up;
  - every on/off setting together at the end under **On your website**, as switches, not
    checkboxes scattered between inputs;
  - wording for one case folded away unless it applies (planned-litter labels on a born
    litter), and the web address folded at the bottom;
  - smaller inputs, buttons and hints throughout.
  Built in the Site Manager (`worker/src/manage/forms.js` GROUPS and `app.css`); a field
  no section names shows under More, so nothing is lost when fields are added.
- **No free-form email to all families** in phase 1. If it is added, it is commercial
  email and carries the unsubscribe link and mailing address (section 11).

### 7.4 When a puppy dies or fails a health check before pickup

Rare, and the worst moment the portal will ever handle, so it's planned rather than left to
whatever the pages happen to show.

**What the family sees.** From the moment it's recorded, their Home is one quiet page and
nothing else on it:

- the puppy's photo, small, and **"We're so sorry about Opal"**;
- her own note, in her words (she writes it on her side; the portal offers a starting
  draft she rewrites, never a stock message sent for her);
- what happens next, in plain words: they're back on her list at their original place,
  and what they paid goes toward their next puppy (as KennelOS recorded it), with one
  button, **Go to your status page**, where they pick and sign for their replacement;
- **Message A-K**, which goes through the status page like any family before pickup.

Gone from every page: the countdown, checklist, timeline, vet booking, programs, picks,
offers and the disclosure. Nothing on the page sells anything. The tabs shrink to Home and
Photos: her photos of the puppy, and any baby book entries, stay for them to keep and
download; nothing is deleted because the puppy died.

**What stops, at once:** every reminder (vet, booking, insurance, food, stay updates),
birthday and milestone emails, photo package emails, and the action bar. No automatic
email ever names that puppy again. Retention warnings are held, as for any deceased dog
(section 10.3).

**Her side.** The feed brings it in (the sale voided with the reason pup died, the family
back in line, section 3.4); she can also mark it herself on the puppy's screen. Today shows
one item, **Write to the Reed family**, with her note to write; the family's page changes
when she records the loss, and the note appears when she saves it. An email to the family
goes only if she chooses to send it, with her note as its text. A stay in progress ends; a
photo package's delivered files stay the family's; any money is KennelOS's business, as
always.

**The replacement.** When the replacement's contract is signed, the feed adds a second
placement to the same family, and Home becomes that puppy's, starting again at Before
go-home. The lost puppy's photos stay under Photos, under its name, for as long as the
family keeps their account.

**A failed health check** before pickup (KennelOS's lost sale for a health problem) uses
the same page and the same way back, with its own wording: no "we're so sorry about"
heading, no deceased life status, and her note explains what was found. The puppy stays
in her records as hers, not as the family's.

**After pickup** a death is the life status of section 9: birthday emails stop, the family
can tell her from the portal, and retention warnings wait for her (section 10.3). It
doesn't send anyone back to the status page.

## 8. Extras: extended stays and photo and video packages

She sells two kinds of extra that the portal delivers, not just lists:

- **Extended stays** (the 10-, 12- and 16-week homegoing packages): the puppy stays with
  her 2–10 weeks past 8 weeks for socialization, crate and potty training and handling.
  The family has paid and is waiting, so the portal is where they watch the progress.
- **Photo and video packages:** she shoots them, and today she would need an outside
  hosting service to deliver them. The portal keeps and delivers the files instead.

### 8.1 One extra, three jobs

The same extra appears in three places, each with its own job. Nothing is typed twice:

| Where | Its job | Holds |
|---|---|---|
| **KennelOS Extras** | Income: price list, which family requested or bought what, what's been paid | Name, amount, group, the family's request and payment |
| **KennelPort `extras`** (built) | The website's catalog on `/extras` | Name, weeks, price, description, "What's included" checklist, photo. Already linked to KennelOS by `kennelos_id` (plan 3.4) |
| **The portal** (new) | Delivery to the family who bought it | Which placement has it, its status, the stay's updates and skills, the package's files |

- **The portal never handles money.** Payment stays in KennelOS (or however she takes it
  today). The portal records only *that* a placement has the extra.
- **Who bought what:** with KennelOS linked, a family's extra arrives as a suggestion on
  their placement ("The Reed family bought the 12-week stay"), which she confirms
  (section 3.1). Families ask for extras on their status page, before pickup, and she
  approves them in KennelOS as today; the approved extra then arrives the same way.
  Without KennelOS, or to correct it, she adds or removes it on the family's screen.
- **Each extra in the catalog gets a delivery type:** *stay*, *media*, or none (an ordinary
  extra, like a puppy pack, that the portal only lists on the placement).

### 8.2 Extended stays

**What changes for the family.** The stay moves everything that hangs on pickup:

- **Go-home date** = birth date + the package's weeks (16 weeks for the Premier package),
  set on the placement and editable. With KennelOS, the training package's boarding stay
  (KennelOS Family Requests plan section 6) sets it, and the pickup the family books on
  the status page falls after the stay.
- **Home page, before go-home** (section 7.2) becomes a stay page for those weeks: "Opal
  comes home in 3 weeks · week 5 of 8 of her extended stay", the latest update, and
  progress on each skill.
- **The vet countdown** starts at the real pickup, as for every puppy (section 5).
- **The timeline:** tasks dated from pickup (vet visit, insurance trial, food change)
  move with it automatically. Tasks dated from birth that fall during the stay (the
  10-week deworming, the 12- and 16-week vaccines) become *hers*: they show as "Done by
  A-K during Opal's stay" once she logs them, and land in the puppy's health records.
  Each timeline template says whether it counts from birth or pickup, so this needs no
  per-package copy.

**Weekly updates (the progress tracking).** Each stay puppy gets an update, by default
once a week (the cadence is set on the package):

- **Skills:** the package's "What's included" checklist becomes its skills list
  (Crate-training foundations, Potty training, Handling & grooming…). She can add
  skills only she tracks. Each update rates each skill on one scale: **Not started ·
  Introduced · Practicing · Reliable**, with a line of notes where she wants one.
- **The update itself:** a note, photos and short videos (section 8.3 for video), and
  optionally a weight. Families see the updates newest first, with a skills summary
  showing how far each skill has come since the first week.
- **Her side:** on the puppy's screen (Dogs), **Write this week's update** opens a form
  built for her phone, with the skills pre-filled from last week so she changes only
  what moved. Saving sends the family an email and a push notification.
- **Today** lists stay updates due ("Opal: weekly update due, last one 8 days ago").
- **Into the baby book:** each update can also become a baby book entry with one tick,
  so the stay weeks aren't missing from the keepsake.
- **KennelOS:** stay weights and milestones from KennelOS arrive as drafts, like any
  other (section 3.3).

### 8.3 Photo and video packages

**Delivery, not just storage.** Each package on a placement gets a private gallery:

- **Status:** Booked · Shooting · Editing · **Delivered**, with a due date. Delivered
  sends the family an email and a push notification, and their home page shows
  "Your photo package is ready".
- **Files kept as she uploads them,** at full resolution. Package photos skip the
  website's resizing (2400px, 3 MB, `photos.js`), because full resolution is what the
  family paid for. A small preview copy is made for viewing on screen.
- **Families can view, play, download one file, or download all.** Download all is a zip,
  in parts if it's large. It's the only copy they get from her, so the page says how
  long she keeps the files (section 10).
- **Private.** Signed in only, served through the Worker after a check, like every
  KennelPort file. Sharing with grandparents (a view-only link) is a later option, not
  phase 2.
- **Her own use of the photos** follows her package terms (open question). Any photo she
  puts on her website or baby book entries is copied there, so deleting the package
  later doesn't remove it from her site.
- **Offering it.** Families who haven't bought a package can see it on their home page
  before go-home, with **Ask about this**, which opens their status page's extras request
  (the request and her approval stay in KennelOS, section 3.4). It's her own product and
  counts as an offer, not an affiliate link, and it never shows to families who already
  have it.

**Video: what's new to build.** KennelPort only embeds videos from YouTube and similar
services today. Hosting them means:

- **Uploads over 100 MB** (the Worker's request limit on Free and Pro plans) go to R2 in
  parts through the Worker (R2 multipart upload), so a long video uploads from her
  phone and picks up where it left off after a dropped connection.
- **Playback** through the Worker with range requests, so a video starts playing at once
  and can be skipped through without downloading all of it. A poster image is taken
  from the first frame on her phone at upload.
- **Format caveat:** iPhones record HEVC (.mov) by default. Safari plays it; some
  browsers on Windows and Android may not. Families can always download the file. For
  smooth playback everywhere she can set the camera to **Most Compatible** (H.264) for
  package videos, or KennelPort can add Cloudflare Stream later if needed (paid per
  minute stored). Check both before building.
- **Storage and cost.** At about 2 GB per package (40 full-size photos and five short
  videos) and 20 packages a year, that's about 40 GB a year. Kept for two years, it peaks
  around 80 GB, roughly a dollar a month at R2's current list price ($0.015 per GB-month,
  10 GB free, no download fees). Check the price before building. Package files count
  against a separate, larger allowance on her site, not the website's photo limit.

### 8.4 The go-home bag

She sends every puppy home with goodies: a food starter bag, the insurance certificate,
the AKC paper, a blanket with the litter's scent, toys, a collar and leash, samples, the
go-home folder. Several come from the programs' breeder kits, so the bag is also a
revenue tool.

- **Her bag template** (Portal tab): each item with what it costs her, where it comes
  from (a program's kit, or bought), and the program or product it's tied to, if any.
- **Per family** (the family's screen, **Sent home with**): the template ticked by default;
  she unticks what didn't go and adds anything else. The card shows the count and what
  the bag cost her.
- **The family's side:** **What came home in Opal's bag** (Records), each item with its
  program's line, and **Get more**, **Activate** or **Register** where it's tied to a
  program or product. A reorder link on the food they already have is the easiest sale
  in the portal.
- **Reports:** sign-up rates for families who got an item against those who didn't (food
  starter bag → food program, say), and what the bag costs her per litter.

### 8.5 On her screens and theirs

| Her side (Site Manager, section 7.3) | The family's side |
|---|---|
| **Today:** stay updates due, packages due or ready to deliver | **Home:** the stay page during the stay; "Your photo package is ready" when delivered |
| **Dogs:** each puppy shows its extras; **Write this week's update**; upload to a package, set its status | **Stay** (a tab from the signed contract until the stay ends, in place of Timeline): updates, skills, countdown to go-home |
| **Families:** each placement's extras, add or remove, KennelOS suggestions to confirm | **Photos:** the package gallery (view, play, download), beside the baby book |
| **Portal:** each extra's delivery type, skills list, update cadence, package contents and delivery note | **Records:** vaccines and deworming she gave during the stay |
| **Website:** the `/extras` catalog, as built | |

## 9. Data model

New tables, all with `site_id` like the rest of KennelPort. Imported tables also carry
`source`, `kennelos_id` and `edited_fields` (section 3.1).

| Table | Key fields | Purpose |
|---|---|---|
| `portal_families` | name, emails (encrypted) and their hashes, email preferences, default sharing level, invited at, first signed in, last activity at, keep, warned at, status (active / erased) | One per family. Several emails each, so two partners can both sign in |
| `portal_placements` | family, puppy, the name the family gave, microchip, planned go-home (8 weeks, or the stay package's weeks), picked-up at, handed off at (the status page stops, section 3.4), vet booked for (date and time) and clinic, as the family entered them, vet deadline, vet proof file, proof accepted at, life status (with family / deceased / rehomed / returned) and its date | One per puppy a family takes home. A repeat buyer gets a second placement, not a second family. Everything family-facing about the puppy lives here, so it is always hers to edit |
| `litters`, `puppies`, `dogs` (existing) | as they are | The portal points at the site's own records instead of copying them, so she adds a litter once. Their public-site status (`placed`, `remembered`) stays separate from a placement's life status. On her site nothing on them is read-only while linked (section 3): her edit wins, and a newer KennelOS value waits for her as in section 3.1 |
| `products` (existing) | adds type (food / insurance / registration / product / other), what the family must do, family-specific (yes/no) | Every program and product link, stored once |
| `portal_placements_programs` | placement, product, status (not started / clicked / done), family-specific code or certificate | Which families still need each step |
| `portal_link_spots` | product, page or chapter or checklist item, order | Where each link appears |
| `portal_health_records` | puppy, type (vaccine / deworming / vet visit / other), date, notes, file | Shot record and vet proof |
| `portal_checklist_items`, `portal_timeline_tasks` | her templates (each task counts from birth or from pickup), plus per-placement additions, removals and dates | Go-home checklist and first-weeks timeline |
| `portal_placement_progress` | placement, checklist item or timeline task, done at, by (family / breeder) | The family's ticks and **Mark done**, so a done step's reminders stop and her Activity shows it |
| `portal_messages` | family, from (family / breeder), body, attachments, sent at, read at | Messages from pickup on (section 2). With the family's account |
| `portal_chapters` | title, order, body, on/off | Handbook |
| `portal_settings` | weight chart on puppies' baby books (on/off), and other portal-wide choices | One row for her site |
| `portal_entries` | puppy or litter, author (breeder / family), date shown, title, body, photos, visibility, draft (yes/no), from KennelOS milestone(s) | Baby book |
| `portal_photo_consents` | entry or photo, family, level (private / shared with her / OK to post), given at | Consent record, kept as long as she uses the photo |
| `portal_email_log` | family, kind, sent at, address hash, provider ID, result | Reminder evidence, deliverability |
| `portal_clicks` | family (nullable), product, page, at | Referral tracking. Family cleared at deletion |
| `portal_tombstones` | kennelos_id, type, deleted at | Stops a deleted record being imported again |
| `portal_history` | table, row, field, old value, new value, changed at, by (her / the family / KennelOS / the portal) | Every change kept with its date and source (section 3.1). Goes with the row it describes |
| `portal_program_results` | litter, product, families signed up, amount earned, period, entered at, source (typed / CSV) | What each program's own report says, per litter (section 12.1) |
| `portal_detail_fields` | label, type (choice / yes-no / text / tick-any), options, order, on/off | The buyer details she tracks (section 12.2) |
| `portal_family_details` | family, field, value | Her answers for each family. Kept with her sale records |
| `portal_bag_items` | name, cost to her, where it comes from, product (nullable), order, on/off | Her go-home bag template |
| `portal_placement_bag` | placement, bag item or free text, quantity | What each puppy actually went home with |
| `extras` (existing) | adds delivery type (stay / media / none), update cadence in days (stay), what the package includes and a delivery note (media) | The website's catalog, also the portal's list of what it delivers |
| `portal_placement_extras` | placement, extra, `kennelos_id`, status (stay: booked / staying / home; media: booked / shooting / editing / delivered), due date, delivered at | Which family has which extra |
| `portal_stay_skills` | placement extra, skill, order, from the package (yes/no) | The stay's skills list, copied from the package's checklist so she can add her own |
| `portal_stay_updates` | placement extra, date, week, note, weight, skill levels (skill → not started / introduced / practicing / reliable, with a note), photos, videos, sent at, baby book entry (nullable) | Weekly progress |
| `portal_media` | placement extra or stay update, R2 key, kind (photo / video), original name, bytes, width, height, duration, preview and poster keys, uploaded at | Package and update files, kept at full size |

**Build first, not later:** the pickup time (it starts the vet clock), the placement's
life status (it stops birthday emails for a dog that has died or been rehomed; her own
dogs already have `remembered` and `died_on`), and
`last_activity_at` (retention depends on it from day one).

**Migrations:** following `CLAUDE.md`, the branch that builds phase 1 adds one migration
for all of this.

The feed's work on the KennelOS side (the feed's new rows, the status page handoff, Companion
and Furever off for her kennel, section 3.4) is built in the KennelOS repository and follows
its own rules.

## 10. Retention and deletion

Two kinds of data, kept on different clocks:

- **The family's portal account:** sign-in, sessions, emails, preferences, messages, and
  the family's own baby book entries and uploads. Deleted for inactivity, or at once when
  the family deletes it themselves from Account (an erase, section 10.4).
- **Her records of the sale:** placement, puppy, pickup time, contract, vet proof and the
  reminder log. She needs these for any health guarantee claim, so they are kept for
  the guarantee period, not deleted with the account.

### 10.1 The rules

| What | When it goes |
|---|---|
| Unused invite link | Expires 30 days after sending. Nothing is deleted; she can resend |
| Family that never signed in | Account deleted 90 days after **pickup** (not after the invite, which goes out when the contract is signed, often weeks or months earlier), with warnings |
| Inactive family | Account deleted 12 months after last activity, with warnings at 30 and 7 days |
| Photo and video package files | Kept at least 2 years after delivery whatever the activity, then deleted with 60 and 14 days' warning, each with **Download all** |
| Stay updates | With the family's account; any update turned into a baby book entry goes with the baby book |
| Messages | With the family's account |
| A family back in line after losing their puppy (section 7.4) | Their account is kept (as with **Keep**) while KennelOS has them in line, then follows the usual rules from their next placement, or from leaving the list |
| A family who backs out before pickup | Their portal account goes with the closed placement, 30 days after the back-out (undoable until then); her sale records stay in KennelOS |
| Her buyer details, go-home bag records, program results | Kept with her sale records until she deletes them; not removed with the family's portal account |
| Sale record, contract, vet proof, reminder log | Kept until the end of her longest health guarantee plus 6 months, then deleted |
| Clicks and program status | Family removed from the rows at account deletion; the counts stay for her stats |
| Anything | Paused while she has **Keep** on; erased at once when the family asks |
| Backups | D1 Time Travel keeps 30 days, so deleted data is fully gone within 30 days. The privacy page says so |

These numbers are a starting proposal for her to confirm (open question 9).

### 10.2 What counts as activity

`last_activity_at` updates on any portal visit by a signed-in family, any click on a
link in a portal email, any upload, and **Keep my account**. It does not update when an
email is only sent or opened (opens can't be measured reliably).

Note: a family that ignores a year of emails, birthday emails included, is deleted, and
the birthday emails stop with it. That is the intended trade: less data kept on families
who have moved on.

### 10.3 Before deleting

- **Warnings** at 30 and 7 days, each with:
  - **Keep my account**, which counts as activity;
  - **Download everything:** the family's photos and entries as a zip (reusing
    KennelPort's download a copy), or the printable book once phase 3 has it.
- **Her view:** a list of families due for deletion in the next 30 days, with Keep on
  each.
- **A deceased dog:** if the family's dog's life status is deceased, the warning doesn't send
  automatically. She is asked in the manage app first and can Keep the family, or send
  gentler wording.

### 10.4 What deletion does

- Deletes the family row's emails, preferences and sessions, and their entries,
  uploads and the R2 files behind them (through the existing photo purge, which waits
  until nothing kept uses a file).
- **Photos she was given:** a photo shared with her or marked OK to post is copied into
  her own albums when it is shared, so deletion doesn't take her copy. The consent
  record stays as long as she uses the photo.
- Sets `family` to null on clicks and program status rows.
- **Clears the history too** (`portal_history`, section 3.1): every history row about the
  family's account is deleted with it, so an old email address, name or note doesn't
  outlive the account. History about the records she keeps (pickup times, the vet
  deadline, reminders sent) stays with those records, with any family detail in it
  replaced by the name she can read, and goes when they go (10.1). An erase does the
  same, at once.
- Leaves the placement, health records, contract and email log until their own date
  (10.1), with the family reduced to a name she can read.
- If the family came from KennelOS, writes a tombstone with the KennelOS ID only.

The rules run in the existing daily cleanup (`cleanup.js`), each with a test, and are
listed in its header comment with the others.

## 11. Program rules, disclosure and email

- **Read each program's terms before building the placements.** Some restrict where
  links may appear. Amazon Associates, for example, bans affiliate links in emails and
  printed material and restricts redirects. That affects click tracking (which goes
  through a redirect), milestone emails and the printable baby book. Programs that
  forbid redirects get a direct link, tracked by program status rather than by clicks.
- **Insurance:** many breeder insurance programs give a free-trial certificate that has
  to be activated within a set number of days of pickup. That is a timeline task with a
  deadline and reminders like the vet visit. Use each program's approved wording; no
  coverage claims or advice of her own.
- **Affiliate disclosure:** one line on every page and email that carries referral or
  affiliate links (FTC rules).
- **Commercial email** (birthday, milestone emails with product links): an unsubscribe
  link and her physical mailing address (CAN-SPAM). Vet and insurance reminders and
  retention warnings are transactional and don't need an unsubscribe.
- **Deliverability:** Resend with her domain verified (SPF, DKIM, DMARC), already set up
  for KennelPort's sign-in codes.

## 12. Measuring it

- **Before launch:** from her program dashboards, record what share of families enrolled
  in each program for her recent litters.
- **After 3–4 litters on the portal:** compare the programs' own sign-up reports (not
  portal clicks) against that baseline. Clicks show interest; the programs' reports show
  sign-ups.
- 3–4 litters is roughly 20–30 families, so only large changes will be clear. Keep
  measuring for the full first year.

### 12.1 The Reports page (her side)

A tab of its own in the Site Manager. Everything on it is hers alone.

- **This litter at a glance:** one tile per program (share of the litter's families who
  signed up, and the change from her before-portal average), plus what she earned.
- **Sign-ups by litter:** one small bar chart per program, a row per litter, the
  before-portal litters in grey and the portal litters in green, with the before-portal
  average as a dashed line. Small multiples, never two scales on one chart.
- **Where families click:** clicks by place (food band, checklist, insurance tile,
  timeline, handbook chapter, each email), so she keeps the placements that work.
- **Earned per litter:** commissions and credit, from the programs' reports.
- **Extras income per litter:** stays, photo packages and packs, from KennelOS's income
  records (or typed, without KennelOS).
- **Go-home bag and sign-ups:** for each bag item tied to a program, the program's
  sign-up rate among families who got it and those who didn't.
- **Families who've brought you the most:** extras, program credit and referrals per
  family, sorted. Extras and referrals come from KennelOS's sales; program credit from the
  programs' reports. Her list for asking for referrals and reviews, and for offering the
  next litter first.
- **Charts or Table** for every figure, hover for exact numbers, and **Export** to a
  spreadsheet (CSV).
- **Add a program's report:** once a month she copies each program's sign-ups and earnings
  per litter from its dashboard (litter, program, families signed up, amount). Most
  programs send nothing back to the portal, so this is the source of truth; clicks and
  each family's "done" ticks only show interest and who to nudge. A program's CSV export
  can be uploaded later instead of typed. A number larger than the litter is refused.
- **Before-portal litters:** her baseline (section 12, before launch) is entered as the
  first rows, so the charts start with a comparison.

### 12.2 Buyer details she records

Her own observations about each family, as granular as she likes, to see which buyers
and sources bring her the most.

- **She fills them in on each family's screen** ("About this family"). Starting fields:
  how they found her, state, first Boston, who's at home, repeat family, referred by,
  families they've referred, social reach, likely to buy again, budget, how they paid,
  and notes. She turns fields on or off and adds her own (a choice, yes/no, short text,
  or tick-any) under Portal, **Buyer details you track**.
- **KennelOS fills in what it already knows** (section 3.2), as suggestions she can
  change: how they found her (the sale's lead source), referred by, families they've
  referred (sales that name them as referrer), repeat family (an earlier sale to the same
  buyer), how they paid (deposit and balance dates against when they were due), and any
  answer from her waitlist application she maps to a field (state, first Boston, who's at
  home). Her application's question types are the same four as these fields, so a
  question maps to a field once and every family after fills itself in.
- **Reports use them:** how families found her, each program's sign-ups by source, and
  the families who've brought her the most. Every count shows, however small the group.
- **Families don't see them.** They're her business records, not part of the family's
  pages or download.
- **Kept with her sale records,** not with the family's portal account: deleting an
  inactive account (section 10) leaves her details and figures in place, so lifetime
  value and referral history survive. She deletes them herself if she wants to.

## 13. Risks and safeguards

| Risk | Safeguard |
|---|---|
| A family misses the vet visit and says the portal never told them | Contract states the requirement; deadline counted exactly as the contract words it; booking reminder before pickup; reminder log with delivery results; bounce alerts (section 5) |
| Birthday email to a family whose dog has died | Life status on every placement, `remembered` on her dogs; families can tell her from the portal; a status change stops all birthday emails at once; retention warnings held for deceased dogs (10.3) |
| A KennelOS sync overwrites her edits or brings back something she deleted | Edited fields never overwritten; tombstones; tests for both (section 3.1) |
| Deleting a family loses guarantee evidence | Sale records and reminder log on their own retention clock (section 10) |
| Deleting a family loses photos she has reposted | Shared photos copied to her albums; consent records kept (10.4) |
| Family emails exposed | Encrypted at rest, never logged, deleted with the account |
| The portal reads as an ad funnel and costs her trust | Handbook and records lead; links sit where they answer a need; no standalone shop page |
| A program's link rules broken | Terms checked before building; direct links where redirects are banned (section 11) |
| Reposting families' photos without permission | Explicit "OK to post" level, asked per photo, recorded |
| A family loses the package they paid for | Two years' minimum keep after delivery; warnings with **Download all** before deletion; the time is stated on the gallery page |
| Video that won't play on a family's phone or computer | Download always offered; Most Compatible recording; Cloudflare Stream as a fallback (section 8.3) |
| A stay family feels out of touch | Updates due show on her Today screen; the family's page says when the next update is due |
| Other families' details in banners | Call names only, with permission; never owner names or contact details |
| Admin work falls on her | Every screen usable on her phone; adding a litter takes a few minutes; KennelOS import saves retyping |
| Sign-in emails land in spam | Resend with her domain verified; the code works across devices and in-app email browsers |

## 14. Before building

- [ ] Confirm whether her public site is (or will be) a KennelPort site; decides the
      address (section 2)
- [ ] List her referral programs: links, codes, what the family must do, buyer-specific
      codes or certificates, and each program's rules on where links can go
- [ ] Get the exact vet-visit contract wording and what counts as proof
- [ ] Get her health guarantee periods (sets the sale record's retention)
- [ ] Collect the handbook and current food details
- [ ] Pull baseline program sign-up rates from recent litters
- [x] Check which KennelOS data the bundle API already sends (plan 5.3): only what the
      public website shows, so the family rows are new (section 3.2)
- [ ] Plan the KennelOS side: the feed's new rows for her kennel (section 3.2), the
      status page handoff, and Companion and Furever off for her kennel (section 3.4)
- [ ] Map her waitlist application's questions to buyer detail fields (section 12.2)
- [ ] Reword KennelPort plan decision 20 (section 2), and plan 5.3 for her site: nothing
      KennelOS sends is read-only there (section 3)
- [x] Check what KennelOS records for a family's extras: the sale's extra charges, the
      family's requests on the status page, and a training package's boarding stay
      (KennelOS Family Requests plan sections 3 and 6). The feed sends them
- [ ] Get her photo and video package contents, file counts, how she shoots video, and
      her package terms (her own use of the photos, how long she keeps them)
- [ ] Check R2 multipart upload limits, the Worker request limit and R2 pricing; try
      HEVC playback on Chrome for Windows and Android

## 15. Open questions

1. Is her public site a KennelPort site? A path on it or a subdomain?
2. Which programs does she use, and do any give family-specific codes or certificates?
3. Do any programs restrict links in signed-in pages, emails or print?
4. Vet visit: 72 hours or 3 calendar days, and what counts as proof?
5. Birthday banners: every litter and adult dog, or only the family's own litter plus
   her adults?
6. Are text reminders worth the cost for the vet visit, or is email enough?
7. Baseline: what share of recent families enrolled in each program?
8. Should families see each other at all (litter-mate baby book entries, a litter page),
   or is each family's view private to them?
9. Retention: are 30 days (invite), 90 days after pickup (never signed in), 12 months
   (inactive) and guarantee plus 6 months (sale records) the right numbers?
10. Extended stays: is the skills list the package's website checklist, or does she track
    more? Weekly updates, or a different rhythm per package?
11. During a stay, does she give the 10-, 12- and 16-week shots herself, or take the
    puppy to her vet? (Decides how they're logged.)
12. Photo and video packages: what's in each, how soon after go-home is it delivered, and
    may she use package photos on her own site?
13. Should families be able to share their package gallery with relatives?
14. The handoff at pickup: is "her Mark picked up, or else the pickup date passed" the
    right switch for the status page (section 3.4)?
15. After pickup, a family wants another extra (a second photo session, say): a portal
    message she handles by hand, or a request in the portal that reaches KennelOS?
16. The look's few fully round controls (section 7.1): keep them, or square them off to
    match the buttons?

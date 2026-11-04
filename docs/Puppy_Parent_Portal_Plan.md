# Puppy Parent Portal: plan

> A sign-in-only portal for one breeder's puppy families, built as a module of the
> KennelPort Worker and switched on for her site alone. Revised from the first roadmap
> (Nov 3, 2026) after review: it now reuses KennelPort's stack, takes starting data from
> KennelOS without depending on it, and adds data retention. Nothing here is built yet.

## 1. Purpose and scope

The portal's main job is to put her referral and affiliate programs in front of families
at the moments they apply: current food on the go-home page, insurance activation on the
first-weeks timeline. Today she relies on paperwork and Messenger reminders. The portal
also holds her puppy handbook, each puppy's records, the 3-day vet visit countdown and a
shared baby book.

Secondary returns: fewer repeated questions, reliable 3-day vet visits, and more repeat
and referred buyers.

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

**Change to the KennelPort plan:** decision 20 says "no KennelPort portal". It needs
rewording to "no portal for every breeder; a family portal module for one site
(`Puppy_Parent_Portal_Plan.md`)" when this is approved.

## 3. KennelOS: a feed, not the source

KennelPort's own rule for linked sites (plan 5.3) makes KennelOS fields read-only while a
site is linked. **The portal's own tables use the opposite rule.** Every portal record is
the portal's own; KennelOS only suggests. (The site's litters, puppies and dogs, which
the portal points at, keep KennelPort's rule; nothing family-facing is stored on them,
section 7.)

### 3.1 How imported data behaves

- **Each imported row records where it came from:** `source` (`kennelos` /
  `portal`), its `kennelos_id`, and which fields she has edited (`edited_fields`).
- **A KennelOS change only updates fields she hasn't touched.** If she has edited a
  field and KennelOS changes it, her admin shows "KennelOS has a newer value: use it /
  ignore". Her value stays until she chooses.
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

| From KennelOS | Becomes |
|---|---|
| Litters, puppies (name, sex, colour, status, registration) | The site's records, as KennelPort already imports them |
| Microchip | A suggested value on the placement |
| Families and their emails, which puppy | Family and placement records (she confirms before an invite goes out) |
| Go-home date, pickup date | A suggested pickup time; she confirms it (section 5) |
| Accounts marked **Show on website**: referral links, codes, code notes | `products` rows, as KennelPort already does |
| Health records (vaccines, deworming) | Health records on the puppy |
| Milestones and weights | Baby book **drafts** (section 3.3) |

Never from KennelOS: page text, handbook, email wording, layout, photo choice, visibility.

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
  their permission, section 7).
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
- **Reminders count back from the deadline**, not forward from pickup, so none can land
  after it:
  - **Before pickup** (from the planned go-home date, about 5 days ahead): "Book your vet
    appointment now." Vets are often booked days out. This is also on the go-home
    checklist.
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
- Retention basics: invite expiry, the activity date, erase on request (section 8)

**Gate:** one litter run from invite to the vet visit with no fixes by hand.

### Phase 2: handbook and keepsakes

- Handbook chapters with links in context (she may be writing these during phase 1)
- Baby book: her entries weeks 0–8, family entries after pickup; KennelOS drafts
- Sharing levels and her view of shared entries
- Life status (placements) and `remembered` (her dogs) enforced on all birthday logic
- Birthday emails with unsubscribe; birthday banner
- Kennel info, FAQ, upcoming litters
- Retention in full: warning emails, Keep, download everything, daily deletion

**Gate:** a litter's families have used the baby book for a month, and the first
retention warning has gone out correctly (send one to a test family first).

### Phase 3: retention extras

- Monthly milestone emails ("Your puppy is 4 months: here's what's next")
- Printable baby book export (PDF or photo book)
- Optional passkey sign-in, never required
- Text reminders for the vet visit, if email proves unreliable

**Fallback:** if a litter goes home before phase 1 is done, ship sign-in, My Puppy, the
vet countdown and the program links on the go-home page alone.

## 7. Data model

New tables, all with `site_id` like the rest of KennelPort. Imported tables also carry
`source`, `kennelos_id` and `edited_fields` (section 3.1).

| Table | Key fields | Purpose |
|---|---|---|
| `portal_families` | name, emails (encrypted) and their hashes, email preferences, default sharing level, invited at, first signed in, last activity at, keep, warned at, status (active / erased) | One per family. Several emails each, so two partners can both sign in |
| `portal_placements` | family, puppy, the name the family gave, microchip, planned go-home, picked-up at, vet deadline, vet proof file, proof accepted at, life status (with family / deceased / rehomed / returned) and its date | One per puppy a family takes home. A repeat buyer gets a second placement, not a second family. Everything family-facing about the puppy lives here, so it is always hers to edit |
| `litters`, `puppies`, `dogs` (existing) | as they are | The portal points at the site's own records instead of copying them, so she adds a litter once. Their public-site status (`placed`, `remembered`) stays separate from a placement's life status. While the site is linked, KennelOS owns some of their fields (plan 5.3); unlinking makes them all editable (plan 5.2), so rule 1 still holds |
| `products` (existing) | adds type (food / insurance / registration / product / other), what the family must do, family-specific (yes/no) | Every program and product link, stored once |
| `portal_placements_programs` | placement, product, status (not started / clicked / done), family-specific code or certificate | Which families still need each step |
| `portal_link_spots` | product, page or chapter or checklist item, order | Where each link appears |
| `portal_health_records` | puppy, type (vaccine / deworming / vet visit / other), date, notes, file | Shot record and vet proof |
| `portal_checklist_items`, `portal_timeline_tasks` | her templates, plus per-placement additions, removals and dates | Go-home checklist and first-weeks timeline |
| `portal_chapters` | title, order, body, on/off | Handbook |
| `portal_entries` | puppy or litter, author (breeder / family), date shown, title, body, photos, visibility, draft (yes/no), from KennelOS milestone(s) | Baby book |
| `portal_photo_consents` | entry or photo, family, level (private / shared with her / OK to post), given at | Consent record, kept as long as she uses the photo |
| `portal_email_log` | family, kind, sent at, address hash, provider ID, result | Reminder evidence, deliverability |
| `portal_clicks` | family (nullable), product, page, at | Referral tracking. Family cleared at deletion |
| `portal_tombstones` | kennelos_id, type, deleted at | Stops a deleted record being imported again |

**Build first, not later:** the pickup time (it starts the vet clock), the placement's
life status (it stops birthday emails for a dog that has died or been rehomed; her own
dogs already have `remembered` and `died_on`), and
`last_activity_at` (retention depends on it from day one).

**Migrations:** following `CLAUDE.md`, the branch that builds phase 1 adds one migration
for all of this.

## 8. Retention and deletion

Two kinds of data, kept on different clocks:

- **The family's portal account:** sign-in, sessions, emails, preferences, and the
  family's own baby book entries and uploads. Deleted for inactivity.
- **Her records of the sale:** placement, puppy, pickup time, contract, vet proof and the
  reminder log. She needs these for any health guarantee claim, so they are kept for
  the guarantee period, not deleted with the account.

### 8.1 The rules

| What | When it goes |
|---|---|
| Unused invite link | Expires 30 days after sending. Nothing is deleted; she can resend |
| Family that never signed in | Account deleted 90 days after **pickup** (not after the invite, which may go out at deposit, months earlier), with warnings |
| Inactive family | Account deleted 12 months after last activity, with warnings at 30 and 7 days |
| Sale record, contract, vet proof, reminder log | Kept until the end of her longest health guarantee plus 6 months, then deleted |
| Clicks and program status | Family removed from the rows at account deletion; the counts stay for her stats |
| Anything | Paused while she has **Keep** on; erased at once when the family asks |
| Backups | D1 Time Travel keeps 30 days, so deleted data is fully gone within 30 days. The privacy page says so |

These numbers are a starting proposal for her to confirm (open question 9).

### 8.2 What counts as activity

`last_activity_at` updates on any portal visit by a signed-in family, any click on a
link in a portal email, any upload, and **Keep my account**. It does not update when an
email is only sent or opened (opens can't be measured reliably).

Note: a family that ignores a year of emails, birthday emails included, is deleted, and
the birthday emails stop with it. That is the intended trade: less data kept on families
who have moved on.

### 8.3 Before deleting

- **Warnings** at 30 and 7 days, each with:
  - **Keep my account**, which counts as activity;
  - **Download everything:** the family's photos and entries as a zip (reusing
    KennelPort's download a copy), or the printable book once phase 3 has it.
- **Her view:** a list of families due for deletion in the next 30 days, with Keep on
  each.
- **A deceased dog:** if the family's dog's life status is deceased, the warning doesn't send
  automatically. She is asked in the manage app first and can Keep the family, or send
  gentler wording.

### 8.4 What deletion does

- Deletes the family row's emails, preferences and sessions, and their entries,
  uploads and the R2 files behind them (through the existing photo purge, which waits
  until nothing kept uses a file).
- **Photos she was given:** a photo shared with her or marked OK to post is copied into
  her own albums when it is shared, so deletion doesn't take her copy. The consent
  record stays as long as she uses the photo.
- Sets `family` to null on clicks and program status rows.
- Leaves the placement, health records, contract and email log until their own date
  (8.1), with the family reduced to a name she can read.
- If the family came from KennelOS, writes a tombstone with the KennelOS ID only.

The rules run in the existing daily cleanup (`cleanup.js`), each with a test, and are
listed in its header comment with the others.

## 9. Program rules, disclosure and email

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

## 10. Measuring it

- **Before launch:** from her program dashboards, record what share of families enrolled
  in each program for her recent litters.
- **After 3–4 litters on the portal:** compare the programs' own sign-up reports (not
  portal clicks) against that baseline. Clicks show interest; the programs' reports show
  sign-ups.
- 3–4 litters is roughly 20–30 families, so only large changes will be clear. Keep
  measuring for the full first year.

## 11. Risks and safeguards

| Risk | Safeguard |
|---|---|
| A family misses the vet visit and says the portal never told them | Contract states the requirement; deadline counted exactly as the contract words it; booking reminder before pickup; reminder log with delivery results; bounce alerts (section 5) |
| Birthday email to a family whose dog has died | Life status on every placement, `remembered` on her dogs; families can tell her from the portal; a status change stops all birthday emails at once; retention warnings held for deceased dogs (8.3) |
| A KennelOS sync overwrites her edits or brings back something she deleted | Edited fields never overwritten; tombstones; tests for both (section 3.1) |
| Deleting a family loses guarantee evidence | Sale records and reminder log on their own retention clock (section 8) |
| Deleting a family loses photos she has reposted | Shared photos copied to her albums; consent records kept (8.4) |
| Family emails exposed | Encrypted at rest, never logged, deleted with the account |
| The portal reads as an ad funnel and costs her trust | Handbook and records lead; links sit where they answer a need; no standalone shop page |
| A program's link rules broken | Terms checked before building; direct links where redirects are banned (section 9) |
| Reposting families' photos without permission | Explicit "OK to post" level, asked per photo, recorded |
| Other families' details in banners | Call names only, with permission; never owner names or contact details |
| Admin work falls on her | Every screen usable on her phone; adding a litter takes a few minutes; KennelOS import saves retyping |
| Sign-in emails land in spam | Resend with her domain verified; the code works across devices and in-app email browsers |

## 12. Before building

- [ ] Confirm whether her public site is (or will be) a KennelPort site; decides the
      address (section 2)
- [ ] List her referral programs: links, codes, what the family must do, buyer-specific
      codes or certificates, and each program's rules on where links can go
- [ ] Get the exact vet-visit contract wording and what counts as proof
- [ ] Get her health guarantee periods (sets the sale record's retention)
- [ ] Collect the handbook and current food details
- [ ] Pull baseline program sign-up rates from recent litters
- [ ] Check which KennelOS data the bundle API already sends (plan 5.3) and what the
      portal needs added (families, emails, pickup dates, health records)
- [ ] Reword KennelPort plan decision 20 (section 2)

## 13. Open questions

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

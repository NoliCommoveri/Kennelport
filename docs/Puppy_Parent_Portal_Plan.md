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
section 9.)

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
- Retention basics: invite expiry, the activity date, erase on request (section 10)
- Extended stays: the package on the placement, its go-home date, the timeline split
  between her and the family, and weekly updates with skills and photos (section 8.2)

**Gate:** one litter run from invite to the vet visit with no fixes by hand.

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

**Gate:** a litter's families have used the baby book for a month, and the first
retention warning has gone out correctly (send one to a test family first).

### Phase 3: retention extras

- Monthly milestone emails ("Your puppy is 4 months: here's what's next")
- Printable baby book export (PDF or photo book)
- Optional passkey sign-in, never required
- Text reminders for the vet visit, if email proves unreliable

**Fallback:** if a litter goes home before phase 1 is done, ship sign-in, My Puppy, the
vet countdown and the program links on the go-home page alone.

## 7. Look and screens

The look follows her site: the Lawn scheme of the AK sample (ivory ground, tuxedo ink,
lawn-green accent, brass labels; Fraunces, Mulish and Pinyon Script) and the design
direction's rules (`KennelPort_Design_Direction.md`). Mockups from Nov 4, 2026 set the
starting point; the clickable prototype is
[`reference/portal-prototype.html`](reference/portal-prototype.html).

### 7.1 Style rules

- **Corners square or barely rounded** (2–4px) on cards, photos, buttons and inputs.
  Buttons are rectangles: one solid button for the main action on a screen, outlined or
  text-with-arrow for the rest. No pills.
- **Status is a word with a small mark** (Done, Next, Booked, Overdue), not a coloured
  lozenge. Red means trouble (overdue, bounced, no proof near the deadline), never
  "coming up".
- **Script lettering once a page at most.** The kennel name in the header is set in the
  display serif.
- **Links look like text or the accent colour**, with a small arrow when they leave the
  portal. No raw addresses.
- **Light and dark**, following the device, like her site.
- **Icons from one free set** (Lucide or Tabler), served from the site.
- **Real photos** from her albums, one set per puppy. No stock photos.

### 7.2 Family home: it changes with the puppy's stage

One page, four states, worked out from the go-home date, pickup time and today:

| Stage | Top of the page | Below it |
|---|---|---|
| **Before go-home** | "Opal comes home in 5 days", the pickup day and time | **Book your vet visit now** (with the deadline it will have), the go-home checklist, **What she's eating now** |
| **Pickup to vet deadline** | The vet visit: hours left, the deadline's date and time, booked or not, **Upload vet record** (the page's one solid button) | Insurance activation and its deadline, the food, the next timeline tasks |
| **Weeks 1–8 and on** | The next task or two ("Register Opal with AKC by Jan 22"), each with its link | A prompt to add to the baby book, the vet visit shown as done |
| **Later** | Birthdays (littermates by call name, with permission), "a year ago today" from the baby book | Monthly milestone, the printable book (phase 3) |

- **No generic welcome banner** pushing the puppy below the fold on a phone.
- **No "Referral program" or "Affiliate deals" tiles,** and no shop page. Links sit inside
  the checklist, timeline, food card and handbook.
- **The food card names the exact food** (brand, formula, bag size, how much and how
  often), not "the same food we send home".
- **Insurance wording comes from the program** ("Activate Opal's free trial by Dec 28"),
  never "Get a quote" or "peace of mind".
- **The affiliate disclosure** sits at the foot of every page with program links.
- **Bottom navigation: five tabs,** each with its own icon: Home, Timeline, Records, Baby
  book, Handbook. Account (email choices, download everything, sign out) opens from the
  header.

### 7.3 Her screens: one app for the website and the portal

The portal's admin is not a second app or a separate section: the Site Manager she
already has becomes one app for her website and her families, in the look of section
7.1 (already applied to the existing screens: Fraunces and Mulish, square corners,
the teal header that matches the app icon). Five places, a sidebar on a computer and
tabs on a phone:

| Tab | Holds |
|---|---|
| **Today** | Everything that needs her, from both sides (below), plus "N website changes not published" with **Review and publish** |
| **Families** | **Puppy families** (the portal) and the **Waitlist** (the website's list), so a family moves from one to the other when they take a puppy and gets their invite then |
| **Dogs** | Dogs, litters and puppies: one record each, used by both. A puppy's website status (Available, Reserved, Placed) sits beside its family and pickup. KennelOS baby book drafts are here too |
| **Website** | Publish, view, preview, share; the inbox and reviews to approve; photos and albums; pages and wording, waitlist and application, how to pay, extras, recommended products, kennel details, KennelOS (today's Site Manager screens) |
| **Portal** | What families see: handbook chapters, programs, checklist and timeline templates, email wording |

**Shared, not copied:** photos and albums feed both the website and baby books, and
the website's Recommended products are the portal's programs: one list, one place to
change a link or code.

The screens:

- **Today** leads with what needs her, from the website and the portal, and shows only the items that are there:
  - **Mark picked up** on any puppy going home today: the main action on the screen;
  - vet proof to review, with **Accept**;
  - emails that bounced (so she can text the family);
  - invites not accepted;
  - KennelOS drafts to review;
  - families due for deletion in the next 30 days;
  - new messages from the website and reviews to approve.
  
  Totals such as "62 families" are not on Today.
- **Vet visits** list each placement with its status in words: Not booked, Booked, Record
  uploaded, Accepted, and time left. Only the ones in trouble are red.
- **Activity** shows actions (completed the checklist, uploaded a record, shared
  photos), not page views. If page views are ever shown, the privacy page says so.
- **Families:** each family's emails, puppy, pickup time (editable; the deadline
  moves with it), vet proof, reminder log, program status, **Keep**, resend invite,
  delete (undoable for 30 days) and erase.
- **Dogs:** KennelOS milestones to turn into baby book entries, or dismiss, beside the litters and puppies they belong to.
- **Portal:** handbook chapters (order, on/off, edit), programs and where each appears,
  checklist and timeline templates, email wording.
- **Setup progress** shows only while something is unfinished.
- **No free-form email to all families** in phase 1. If it is added, it is commercial
  email and carries the unsubscribe link and mailing address (section 11).

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
  (section 3.1). Without KennelOS, or to correct it, she adds or removes it on the
  family's screen.
- **Each extra in the catalog gets a delivery type:** *stay*, *media*, or none (an ordinary
  extra, like a puppy pack, that the portal only lists on the placement).

### 8.2 Extended stays

**What changes for the family.** The stay moves everything that hangs on pickup:

- **Go-home date** = birth date + the package's weeks (16 weeks for the Premier package),
  set on the placement and editable.
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
  before go-home, with **Ask about this**, which sends her a message through the site's
  inbox. It's her own product and counts as an offer, not an affiliate link, and it
  never shows to families who already have it.

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

### 8.4 On her screens and theirs

| Her side (Site Manager, section 7.3) | The family's side |
|---|---|
| **Today:** stay updates due, packages due or ready to deliver | **Home:** the stay page during the stay; "Your photo package is ready" when delivered |
| **Dogs:** each puppy shows its extras; **Write this week's update**; upload to a package, set its status | **Stay** (a tab while the stay runs, in place of Timeline): updates, skills, countdown to go-home |
| **Families:** each placement's extras, add or remove, KennelOS suggestions to confirm | **Photos:** the package gallery (view, play, download), beside the baby book |
| **Portal:** each extra's delivery type, skills list, update cadence, package contents and delivery note | **Records:** vaccines and deworming she gave during the stay |
| **Website:** the `/extras` catalog, as built | |

## 9. Data model

New tables, all with `site_id` like the rest of KennelPort. Imported tables also carry
`source`, `kennelos_id` and `edited_fields` (section 3.1).

| Table | Key fields | Purpose |
|---|---|---|
| `portal_families` | name, emails (encrypted) and their hashes, email preferences, default sharing level, invited at, first signed in, last activity at, keep, warned at, status (active / erased) | One per family. Several emails each, so two partners can both sign in |
| `portal_placements` | family, puppy, the name the family gave, microchip, planned go-home (8 weeks, or the stay package's weeks), picked-up at, vet deadline, vet proof file, proof accepted at, life status (with family / deceased / rehomed / returned) and its date | One per puppy a family takes home. A repeat buyer gets a second placement, not a second family. Everything family-facing about the puppy lives here, so it is always hers to edit |
| `litters`, `puppies`, `dogs` (existing) | as they are | The portal points at the site's own records instead of copying them, so she adds a litter once. Their public-site status (`placed`, `remembered`) stays separate from a placement's life status. While the site is linked, KennelOS owns some of their fields (plan 5.3); unlinking makes them all editable (plan 5.2), so rule 1 still holds |
| `products` (existing) | adds type (food / insurance / registration / product / other), what the family must do, family-specific (yes/no) | Every program and product link, stored once |
| `portal_placements_programs` | placement, product, status (not started / clicked / done), family-specific code or certificate | Which families still need each step |
| `portal_link_spots` | product, page or chapter or checklist item, order | Where each link appears |
| `portal_health_records` | puppy, type (vaccine / deworming / vet visit / other), date, notes, file | Shot record and vet proof |
| `portal_checklist_items`, `portal_timeline_tasks` | her templates (each task counts from birth or from pickup), plus per-placement additions, removals and dates | Go-home checklist and first-weeks timeline |
| `portal_chapters` | title, order, body, on/off | Handbook |
| `portal_entries` | puppy or litter, author (breeder / family), date shown, title, body, photos, visibility, draft (yes/no), from KennelOS milestone(s) | Baby book |
| `portal_photo_consents` | entry or photo, family, level (private / shared with her / OK to post), given at | Consent record, kept as long as she uses the photo |
| `portal_email_log` | family, kind, sent at, address hash, provider ID, result | Reminder evidence, deliverability |
| `portal_clicks` | family (nullable), product, page, at | Referral tracking. Family cleared at deletion |
| `portal_tombstones` | kennelos_id, type, deleted at | Stops a deleted record being imported again |
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

## 10. Retention and deletion

Two kinds of data, kept on different clocks:

- **The family's portal account:** sign-in, sessions, emails, preferences, and the
  family's own baby book entries and uploads. Deleted for inactivity.
- **Her records of the sale:** placement, puppy, pickup time, contract, vet proof and the
  reminder log. She needs these for any health guarantee claim, so they are kept for
  the guarantee period, not deleted with the account.

### 10.1 The rules

| What | When it goes |
|---|---|
| Unused invite link | Expires 30 days after sending. Nothing is deleted; she can resend |
| Family that never signed in | Account deleted 90 days after **pickup** (not after the invite, which may go out at deposit, months earlier), with warnings |
| Inactive family | Account deleted 12 months after last activity, with warnings at 30 and 7 days |
| Photo and video package files | Kept at least 2 years after delivery whatever the activity, then deleted with 60 and 14 days' warning, each with **Download all** |
| Stay updates | With the family's account; any update turned into a baby book entry goes with the baby book |
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
- [ ] Check which KennelOS data the bundle API already sends (plan 5.3) and what the
      portal needs added (families, emails, pickup dates, health records)
- [ ] Reword KennelPort plan decision 20 (section 2)
- [ ] Check what KennelOS records for a family's extras (requested, bought, paid) and
      whether the bundle can send it
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

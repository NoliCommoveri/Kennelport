# Resources and the potty schedule: plan

Asked for 2026-11-25 (the owner). Two family pages reached from Home's **Quick links**, not
tabs (the five tabs stay as they are): **Resources**, the breeder's links and PDFs for
families, and **{name}'s potty schedule**, a schedule made from the family's day and the
puppy's age, with the breeder's **potty guide** under it. Brought over in spirit from
KennelOS Furever (which has a potty log and training), but not as a tap-per-accident log:
a schedule to follow, which suits the first weeks home better.

**Built 2026-11-25** (build log, that day), with the owner's answers (section 4). Training guides (Furever's `trainingContent.js`) are a later, separate plan.

## 1. Resources

**For the family:** `/family/resources`, a Quick link (icon `link`, "Resources") shown once
she has one resource on. A list in her order, grouped under her headings if she uses them
(say "Learning styles", "Training", "Health"): each a row with its title, her short note,
and **Open** (a link: opens the page; a PDF: opens the file). Program links go through
`/family/go/<id>` as every program link does, so clicks are counted.

**For her:** a Resources screen on her Portal tab (beside the handbook and the bag):
- **Add a link:** title, web address, a short note, a heading (optional), or a program from
  her Recommended products instead of an address.
- **Add a PDF:** title, the file (PDF or photo, 10 MB, as contracts), a note, a heading.
- Each row: **Edit**, **Up / Down**, **On / Off** (hidden from families, kept), **Remove**
  (the file deleted too). Every add has a remove (the owner's rule).
- Empty: one line saying what it's for, and the two Add buttons.

**Storage:** a new table `portal_resources` (`site_id`, `id`, `kind` link|file, `title`,
`note`, `heading`, `url`, `product_id`, `r2_key`, `type`, `bytes`, `sort`, `shown`,
`created_at`, `updated_at`), in `SITE_TABLES` and the backup.

**Look:** no prototype screen. Built from the prototype's **Photo rows** / list rows and the
handbook's heading style; Classic, Forest and Cream; checked at 390px.

## 2. The potty schedule

### What the family does

`/family/potty`, a Quick link ("Potty schedule", from pickup until the puppy is 6 months,
then still under Records). First time: **Make {name}'s potty schedule**, three answers:

1. **When is the first person up?** (a time, 6:30 by default)
2. **When does {name} eat?** (2 to 4 meal times; 3 under 6 months by default, as most
   feeding guides say; prefilled from her food band's "how often" if it says)
3. **Bedtime** (a time, 22:00 by default)

They can change these any time (**Change the times**), and a **Remove the schedule** puts
them back to the first screen.

### What it shows

**Today's schedule for {name} at N weeks**, a list of times in the prototype's **Steps**
style (a time, what it is, a short why), worked out each time the page opens, so it grows
with the puppy without anyone touching it:

- **Up:** straight out, first thing.
- **After each meal:** 15 minutes after it.
- **Between:** a trip whenever the gap since the last one reaches the age's daytime limit.
- **Bedtime:** last trip, right before bed.
- **Overnight:** one or more trips while the night is longer than the age's overnight limit
  (an 8-week-old with 22:00 to 6:30 gets one, about 2:00).
- Under the list, the moments no clock can give: **also after every nap, after play, and
  after a drink**.

**Age limits (the rule of thumb the AKC and most trainers give):** a puppy holds it about
one hour per month of age, plus one, at most about eight. The daytime limit is shorter,
since awake and playing puppies go more often:

| Age | Daytime, at most every | Overnight, at most |
|---|---|---|
| 8 to 10 weeks | 1 hour | 3 hours |
| 10 to 12 weeks | 1½ hours | 3 to 4 hours |
| 3 months | 2 hours | 4 hours |
| 4 months | 3 hours | 5 hours |
| 5 months | 4 hours | 6 hours |
| 6 months on | 4 to 6 hours | 7 to 8 hours |

These numbers live in one table in code (`portal/potty.js`), with tests; the owner can
change them later as a timing rule (`portal/timing.js`) if she wants.

### The potty guide (hers)

Under the schedule, **The potty guide**, a short text the breeder can edit, seeded with what
the experts agree on (AKC, ASPCA, the AVSAB):

- Take {name} to the same spot every time, on a leash, and use the same word.
- Praise and a small treat the moment they finish, outside, not after you're back in.
- Potty first, play after: keep the trip boring until the job's done.
- Never punish an accident. If you catch one, calmly pick {name} up and go outside; if you
  find one later, just clean it.
- Clean accidents with an enzyme cleaner, so the smell doesn't call them back.
- Watch for sniffing, circling or heading for the door, and go out at once.
- When you can't watch, use the crate or a small puppy-safe area.
- Water away about two hours before bed; keep meals on the same times every day.
- Expect accidents for the first few weeks. Most puppies are reliable by 4 to 6 months.

**For her:** on her Portal tab, **Potty guide**: the text in the handbook's format (the
same writing rules, `{name}` and `{kennel}`), **Reset to the suggested guide**, and an
**Off** switch that takes the guide off the page (the schedule stays). Each breeder starts
with the suggested guide (the owner: new breeders start blank, but this one is starting
content that's right for anyone; **question 2** below).

**Storage:** the family's answers per placement, a new table `portal_potty` (`site_id`,
`placement_id`, `wake`, `bed`, `meals` as a short list, `updated_at`), in `SITE_TABLES`,
the backup, and their account erase. Her guide: `portal_settings.potty_guide` (her text,
empty for the suggested one) and `potty_guide_off`.

**Look:** no prototype screen. Built from the prototype's **Steps** (the times),
**Numbered steps** (the three questions), the **Calendar page** for "at N weeks", and a
**Highlights** row for "also after every nap…"; the guide as a handbook page. Every look,
390px.

## 3. Order, migration, versions

1. Resources (smaller, and stands alone).
2. The potty schedule and guide.

One migration for both if built on one branch (`portal_resources`, `portal_potty`, two
`portal_settings` columns), additive. Family pages are server-rendered, but new styles go
in `public/_kp/f/` (portal.css and the looks): a **`PORTAL_VERSION` bump, asked first**.
Her screens are server-rendered too (no `APP_VERSION` change expected).

Wording: her screens' lines in the owner's list (`manage/wording-portal.js`); the guide's
seed text is starting content in `portal/potty.js`.

## 4. The owner's answers (2026-11-25)

1. Resources headings: her own. 2. A new breeder's potty guide: the suggested one. 3. She can
switch the potty page off for her site. 4. Until when: a timing rule of the owner's,
`potty_until_weeks`, 26 weeks (6 months) by default, on her Timing screen.

**Modified in the build:**
- The guide is drawn as the portal's other pages are (paragraphs, and the tips as highlight
  rows), not in the handbook's format (the owner). Her writing rules: a blank line, and "- "
  for a tip.
- A timeline task, **Set up {name}'s potty schedule** (the owner), 3 days before pickup: in
  the suggested timeline, suggested with one tap on a timeline she already has, and a kind of
  task that ticks itself (Opens their potty schedule; done when they make it). Stored in
  `portal_timeline_tasks.opens`, as `auto`'s CHECK allows only the vet and pickup kinds.
- 6 months on: no night trip (the table said 7 to 8 hours; a normal night is longer).
- A run of breaks between two fixed trips is one row ("Potty breaks: 8:15, 9:15 …").
- Both pages are drawn in the looks' own frame (header and tabs), as Home and Timeline are.
- All of it in migration 0046 (this branch's one).

### The questions, as asked

1. **Resources headings:** her own free headings (as above), or a fixed few (Learning,
   Training, Health, Products)?
2. **The potty guide for a new breeder:** seeded with the suggested guide (as above), or
   blank like her handbook?
3. **Who sees the schedule:** every family, or can she switch the potty page off for her
   whole site?
4. **Until when:** the Quick link until 6 months (as above), or always?

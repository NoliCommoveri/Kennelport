# The family portal for more than one breeder: plan

Asked for 2026-11-24 (the owner): what it takes to offer the family portal to breeders
other than the first one. Written from a read of the code that day. Started 2026-11-24: the owner's answers are in
section 5; the first chunk is site-builder step 2.4.

The portal plan kept this out of scope ([`family-portal.md`](family-portal.md) section 1:
"written so it could be switched on for another site later, but nothing is built for
that"). This plan is the "later". It's mostly product work, not storage work: the data is
already kept per site.

## 1. What already works for many breeders

Checked in the code on 2026-11-24:

- **Every portal table is per site.** All 29 `portal_*` tables (migrations 0023, 0024,
  0039–0044) carry `site_id`, and no query assumes there's only one portal site.
- **On or off per site:** `sites.portal_on`, switched in `/ops` (`ops/sites.js`). Switching
  it off hides the portal and deletes nothing.
- **The jobs run over every site.** The hourly reminders (`portal/reminders.js`) cover every
  site with the portal on.
- **Settings per site:** the look (Classic, Forest, Cream), the vet rule, the time zone, the
  handbook, the go-home bag, the checklist, the timeline and the programs.
- **The KennelOS feed is per site.** A feed is refused if it comes from a kennel other than
  the one linked to that site (`portal/feed.js`, `other_kennel`). Status-page handoff
  tokens are keyed by site and kennel.
- **Email** goes out from KennelPort's address, under each kennel's name (`mail.js`
  `senderFor`).
- **Sign-in is per site.** Family sessions, codes and emails all carry `site_id`.
- **A second portal already runs:** the demo site (`kennelos/demo.js`).

## 2. The work

### 2.1 Before anyone outside the family (gates)

1. **Phase 1's gate** ([`family-portal.md`](family-portal.md) section 6): one real litter run
   from the signed contract to the vet visit, with no fixes by hand. **Passed** (the owner,
   2026-11-24).
2. **Open decision 9, content rules and suspension** ([`kennelport.md`](kennelport.md);
   [`loose-ends.md`](../loose-ends.md) #16): what a breeder may publish, and what gets a site
   suspended. The portal adds families' uploads (vet records, photos) and messages, so
   these rules cover the portal too. `family.js` already answers 404 for a suspended site.
   **Parked** (the owner, 2026-11-24): not needed while she approves every breeder by hand
   (question 4). Written before breeders can sign up themselves.

### 2.2 The portal's build becomes settings (site-builder steps 5 and 6)

Much of the portal is still written into the code around the first breeder
([`site-builder.md`](site-builder.md), "The family portal (in the portal template)"):

- Family Home for each stage: the four stages, and which sections each shows, in what order.
- The tabs and quick links, and their names (`family.js` `TABS`, `STAY_TABS`, `LOSS_TABS`).
- The portal's timing rules: the vet reminders, when a stay starts, when a step is
  overdue, how long invite links last, how long Undo lasts, the retention table.
- The vet deadline rule.

**2026-11-25, the owner:** no templates; every breeder builds from the standard, and the
portal won't be customized much. Built: the timing rules, per site, on her Timing screen
(`portal/timing.js`). The vet deadline stays her Portal settings' choice. Home's sections,
the tabs and the cards stay as built for everyone.

As first planned: site-builder **step 6** moves these into the owner's settings for each site, and **step
5** (templates: save, apply, reset) lets a new breeder start from **Website and family
portal** and then be adjusted. Both are not started. Without them, each new breeder gets
exactly the first breeder's portal.

### 2.3 The wording moves to the owner's list (site-builder step 2.4)

**Done 2026-11-25:** her screens and their errors are in the owner's list (build log,
2026-11-24 and 2026-11-25). The suggested lists stay for 2.2.

The portal's screens still hold their own wording: about 60 longer lines on her screens
(`portal/admin.js`, `portal/admin/*.js`) and some on the families' pages (`family.js`),
plus the ready-made tasks and suggested lists in `portal/steps.js`. Step 2.4 moves them
into `manage/wording.js`. Do it together with 2.2, since they change the same code.

Watch for lines that assume her contract, such as "Your contract asks for a vet visit…"
(`family.js`), and her go-home folder in the suggested timeline ("Your registration paper is
in the go-home folder"). For another breeder these become settings, or wording she can
change.

### 2.4 Choices that fit only her

Each new breeder's contract and location may need more than these:

| Choice | Today | For more breeders |
|---|---|---|
| Vet deadline (`portal/vet.js` `VET_RULES`) | 72 hours from pickup, or the end of the third day | more counts (5 days, 7 days, business days) as contracts need them, or none |
| Time zones (`portal/admin/parts.js` `ZONES`) | 12, US and Canada | the full list, or by country |
| Registrations (`portal/feed.js` `REGISTRATIONS`) | limited, full, co-own, none | check against KennelOS's types for other registries |
| Retention ([`family-portal.md`](family-portal.md) 10.1) | fixed numbers | the owner's per-site timing (2.2) |
| Suggested checklist and timeline (`portal/steps.js`) | written for her breed and contract | starting lists from the template (2.2) |

### 2.5 A setup flow

Today the owner switches the portal on in `/ops`, and the breeder starts with the suggested
lists and no handbook, bag or programs. To build:

- **Turning it on:** the owner applies the **Website and family portal** template (2.2) to
  the site in her admin view. `/ops` keeps the on/off switch.
- **The breeder's first steps:** on her Portal tab, until each is done, a short numbered
  list (the prototype's numbered steps): her vet rule (from her contract), her time zone,
  her look, her programs, her checklist and timeline, then sending the first invite. Wording
  in `manage/wording.js`. There is no prototype screen for this: build it from the
  prototype's numbered steps and tiles, and say so.
- **Optional starting content:** the owner copies a handbook, bag, checklist or timeline from
  one site to another (her own admin screen), so she doesn't start from nothing. Nothing
  copies by itself; by default a new breeder starts blank (the owner, 2026-11-24).

### 2.6 KennelOS's side, for each new kennel

Some of this was done for the first breeder's kennel alone ([`family-portal.md`](family-portal.md)
3.4): the feed's rows, the one-tap link to the portal, the status page's handoff, and
Companion and Furever switched off for her families. KennelPort tells KennelOS which sites
have the portal (`portal_feed` in the link facts, `kennelos/link.js`).

- **To check, in the KennelOS repository:** that KennelOS turns these on by that flag for any
  linked kennel, not by her kennel's id. If it's her kennel's id, KennelOS needs the change,
  as a reply in this plan's style ([`done/kennelos-origin-country-reply.md`](done/kennelos-origin-country-reply.md)).
- **A breeder not on KennelOS:** the portal works without it (rule 1 of the portal plan);
  she types her families in. Check that every screen reads right with no link.

### 2.7 Breeders without a KennelPort website

The portal is at `/family` on a KennelPort site (open question 1). `site.js` serves the
portal's pages before it looks for the website's published snapshot, so a portal with no
website published looks possible. **To check:** that a site with no published website,
or with its website switched off, signs families in, sends invites with the right links,
and gives the families' pages a sensible place for "back to the website". If it holds,
"portal only" is a template choice (2.2), not new code.

## 3. Order

1. The gates (2.1): proof on one breeder, then the rules. They decide whether to start.
2. Site-builder steps 5 and 6 with step 2.4 (2.2, 2.3): the biggest piece.
3. The setup flow (2.5).
4. Her-only choices (2.4) and KennelOS's side (2.6), as each new breeder's contract and
   kennel show what's needed. The KennelOS check can happen any time.
5. Portal only (2.7), if a breeder without a KennelPort website asks.

## 4. Migrations and versions

- 2.2 needs storage for the portal's build per site: likely in the site's build
  (`site_builds`, as the website's build is) rather than new tables. One migration at
  most, additive.
- 2.4's longer lists change `ZONES` and `VET_RULES` in code, no migration.
- Screens under `public/_kp/f/` (families) or `public/_kp/m/` (Site Manager) need a
  `PORTAL_VERSION` or `APP_VERSION` bump: ask the owner first (CLAUDE.md).

## 5. The owner's answers (2026-11-24)

1. **The next breeder:** not named yet. Her vet-visit wording decides 2.4's vet rule when she is.
2. **Starting content:** blank by default (the suggested lists, no handbook or bag); the owner
   copies a handbook, checklist, timeline or bag from any site when it fits that breeder
   (2.5, "Optional starting content", now covers the checklist and timeline too).
3. **Portal only:** no. Every portal breeder has a KennelPort website; 2.7 is dropped for now.
4. **Turning it on:** the owner's switch, per breeder. No self sign-up and no payments
   planned, so decision 9 waits (2.1).

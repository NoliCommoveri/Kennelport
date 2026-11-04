# Co-owned dogs: plan

KennelPort's half is built (`docs/BUILD_LOG.md`, 2026-11-04); KennelOS's is in its repo.
Two halves: KennelOS says which dogs are co-owned and where each
lives; KennelPort shows the ones living with a co-owner in their own section of
the Dogs page, with the partner kennel's logo.

## Decisions (the breeder's, 2026-11-04)

1. **Co-ownership comes from KennelOS.** She tracks the income from these dogs there;
   the website takes the facts it shows from the same record.
2. **Where a co-owned dog lands depends on where it lives.**
   - Lives with her: treated exactly like her own dogs. It goes in Girls and boys, Up
     and coming or Looking for a home as usual, and on the home page slider.
   - Lives with one of its co-owners: only in the new **Co-owned** section of the Dogs
     page, never in the main grid and **never on the home page slider**.
3. **A dog can have several co-owners, from different kennels, but lives in one
   place at a time:** with her, or with one of its co-owners. KennelOS keeps only
   where it is now, no history. She changes it there, and the website follows at her
   next Update website.
4. **Every co-owned dog's page says "Co-owned with [kennels]"**, wherever it lives,
   naming each of its co-owners' kennels that may be named (5).
5. **A kennel is named on the website only when she ticks it**, on the kennel's
   record in KennelOS ("Name this kennel on my website", default off). Unticked, the
   dog still goes where (2) says, and reads "Lives with a partner kennel", with no
   name, logo or link.
6. **The logo is uploaded on the website**, not sent from KennelOS (the bundle's 1 MB
   limit, and every photo on the site is added there). **Logos only:** no videos
   or posts for a partner kennel. She uploads the logo, or pastes the badge code the
   kennel hands out (a link and a picture; the HTML is never kept), whichever she
   has.

## What never goes to the website

Co-owners' names, emails, phones and addresses; contracts; income, sales and any
amount; notes. Only a kennel's public name and website address, and only after the
tick in (5). A person with no kennel (a guardian family, say) can never be named
this way, since nothing but a ticked Kennel record is sent. The site directory's
"Never from KennelOS: … co-owners" becomes "co-owners' personal details; a kennel
name she ticks may go".

## KennelOS

What it has: `Dog.ownership_type` (`co_owned` among others), `Dog.kennel_id` (her own
kennel, required for owned and co-owned dogs), `Dog.co_owner_contact_ids`, a
Contact's `kennel_id` (its kennel), and outside Kennel records with `kennel_name`,
`location`, `website`, `logo_data_url`. Co-ownership contracts link the dog and the
contact. Nothing records where a dog lives (a Boarding event is a stay, not a home).
`siteExport.js` already sends marked co-owned dogs, indistinguishable from her own.

Changes:

- **`Dog.lives_with_contact_id`**: empty means the dog lives with her; otherwise the
  co-owner it lives with now, who must be one of its `co_owner_contact_ids`. One
  current value, no history: she changes it when the dog moves. Plain field, so no
  `db.version` block; optional, so older backups load. `dogRepo` refuses a contact
  who isn't a co-owner, and clears it when that co-owner is taken off the dog or the
  ownership stops being `co_owned`. New foreign key: added to
  `referenceRegistry.js`. Sync registry: `cloud`, like `co_owner_contact_ids`;
  regenerate `cloudFields.js`.
- **Dog form:** with ownership Co-owned, "Lives with": *Me* or one of its
  co-owners by name.
- **Kennels are derived, not stored:** a co-owner's kennel is their contact's
  `kennel_id`, when that is an outside kennel. The kennel it lives with is the
  lives-with contact's. A lives-with contact with no kennel is sent as "lives away,
  kennel not named", and the gaps list says so ("Juno lives with Ann Lee, who has
  no kennel to show").
- **`Kennel.name_on_website`** (boolean, default false) on outside kennels: "Name
  this kennel on my website". Sync registry: `cloud`.
- **`siteExport.js`**, only to a Worker whose answer lists the `partner_kennels`
  section (the `registry`/`heat_id` handshake):
  - each dog adds `co_owned` (true for `co_owned`), `lives_away` (a lives-with
    contact is set), `lives_with_kennel_id` (that contact's kennel, only when
    ticked; else null), and `co_owner_kennel_ids` (its co-owners' ticked kennels,
    for "Co-owned with");
  - a top-level `partner_kennels: [{ id, name, website }]`, only kennels some sent
    dog names, cut to KennelPort's lengths, through `assertOnlyKeys`;
  - `bundleChanges` words: "Juno: now living with Oakridge", "Juno: now living with
    you".
- End-State guide and editions docs updated. Tests in its siteExport tests. Service-worker cache bump
  asked for at the end, per its CLAUDE.md.

## KennelPort

### Data: one migration, `0025_co_owned.sql`

- `partner_kennels`: `id, site_id, name, url, logo_photo_id, badge_link,
  badge_image, sort, source, kennelos_id, hidden_by_kennelos, created_at`.
- `dogs` adds `co_owned INTEGER NOT NULL DEFAULT 0`, `lives_away INTEGER NOT NULL
  DEFAULT 0`, `lives_with_kennel_id TEXT`.
- `dog_partner_kennels`: `dog_id, partner_kennel_id, sort`, its co-owners' kennels
  for "Co-owned with".

### KennelOS bundle (`kennelos/bundle.js`)

- `SECTIONS` adds `partner_kennels`; the dog shape adds the four fields; a top-level
  `partner_kennels` list, capped (MAX 50).
- `OWNED.dogs` adds `co_owned`, `lives_away`, `lives_with_kennel_id`, and the
  bundle replaces the dog's `dog_partner_kennels` rows;
  `OWNED.partner_kennels` is `name`, `url`. Logo, badge and sort are hers.
- Kennels are matched by KennelOS id. One no longer sent is hidden, never deleted
  (its logo is the only copy), and waits under "Not on your site" with Remove, like
  a dog. Its dogs keep the link while hidden but show as unnamed.
- KennelPort ships first: until its SECTIONS lists `partner_kennels`, KennelOS
  doesn't send it.

### Website

- `dogGroups`: a dog with `lives_away` goes only to a new `away` group; every other
  dog, co-owned or not, is grouped as now. The home page slider leaves `away` dogs
  out.
- Dogs page: a **Co-owned** section (`id="co-owned"`) at the bottom, beneath all her
  resident dogs (Girls and boys, Up and coming, Looking for a home). Heading and intro editable on the Dogs
  page (`co_owned_heading`, `co_owned_lede`; defaults "Shared with friends", "Dogs
  we co-own, living with partner kennels."). Hidden when empty.
  - **Light scroll cards:** `slider(…, { cls: 'light' })` with a new `coCard()`: no
    flip, a short photo, call name, sex · role, and a footer "with [small logo]
    Kennel name". The card opens the dog's page. About 5 across on a computer, 2.5
    on a tablet, 60% on a phone; a thin border instead of the full card.
  - **Partner strip** under it: each named kennel's logo (greyscale until hover)
    linking to its website (`rel="noopener"`), or its badge when it has one.
- Dog page, any co-owned dog with a named kennel: "Co-owned with" in the facts, each
  kennel with its logo and link.
- Litters naming an away dog as dam or sire keep working; it is still her dog.

### Site Manager

- **Partner kennels** screen, from Dogs: name and website (read-only on a linked
  site), logo upload (the same upload as her own logo), "Paste their badge code"
  (`badgeCode.js`) as the other way to give its logo.
- Dog form: Co-owned, Co-owned with, Lives away and Lives with are read-only while
  linked; an unlinked site sets them here, with "Add a kennel…".
- Removing a kennel unlinks its dogs, and releases its logo to `cleanup.js`. Export and import (`content/io.js`) carry
  `partner_kennels` and the new dog fields.

### Tests

- render: a dog moving (a bundle changing `lives_away`) changes section and comes
  off or back on the home slider; section order and hiding; light cards; logo strip and badge; an away dog
  in no other group and not on the home slider; a co-owned dog at home in its usual
  group; "Co-owned with" on both kinds; an unticked kennel unnamed;
- bundle: kennels created and linked; a later bundle keeps her logo; a kennel no
  longer sent is hidden; unknown keys (anything like income or a contact) refused;
- removing a kennel; io round trip.

### Versions

`site.css` changes, so `ASSET_VERSION` needs a bump. It matches `main`'s (it has gone
out), so the owner is asked at the end, per CLAUDE.md. The manage app's forms are
built on the server, so `APP_VERSION` probably doesn't move; checked when built.

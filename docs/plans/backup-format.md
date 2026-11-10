# The full backup: what is in it, and how it maps

Built 2026-11-10 (`worker/src/backup.js`, `worker/src/ops/backup.js`,
`worker/public/_kp/o/backup.js`, tests in `worker/tests/backup.test.js`). This is the
reference for anyone, a person or a later session, who has to put a site's data back, or
move it into a differently shaped KennelPort.

## Why it exists

KennelPort had two ways to get a site's data out, and neither was a backup:

| Way out | Holds | Missing |
|---|---|---|
| `/ops` → Content (JSON), `content/io.js` | What the site shows, by section, **no ids** | Photos' files, photo tags, page builds, the inbox, the waitlist, the people, the KennelOS link and its ids, the whole puppy portal, published versions |
| Site Manager → Download a copy (zip) | The content document, the inbox, the simple waitlist, the photos | Page builds, the KennelOS link, the whole puppy portal (families, placements, health records, vet proof, contracts, messages), published versions; and nothing reads it back in |

The full backup holds **everything a site has, as stored**, and KennelPort can read it
back in. It adds nothing to the database (no migration) and changes nothing a site shows.

## Making one, and putting one back

- **Make:** `/ops` → the site → **Full backup** → **Download the full backup**. The
  browser asks for the site a piece at a time and saves one zip,
  `<subdomain>-full-backup-<date>.zip`. Keep the tab open until it downloads.
- **Put back:** `/ops` → **Restore a site from a full backup** → choose the zip →
  **Restore**. The site comes back with the same address, records, photos and files,
  live again if it was live.
- A restore **only goes in where that site isn't**. It never writes over a site that is
  there. To replace a site with its backup: close it, release its subdomain, restore.
- A restore that fails part way takes out what had gone in, and says so.
- Afterwards breeders and families sign in again. Their access is in the backup
  (`site_users`, `portal_emails`) as keyed hashes, so it works only where the
  `EMAIL_HMAC_KEY` and `PORTAL_EMAIL_KEY` secrets are the same as when the backup was
  made. Somewhere new, invite the breeder again; families' addresses are in the backup
  readable (`_email`, below) so they can be invited again too.
- **The zip holds personal details** (families' and visitors' names, addresses, phone
  numbers, messages). Keep it private.

Do this before any change that could lose data, and from time to time anyway: D1 can be
wound back 30 days from the Cloudflare dashboard, but nothing else keeps a second copy of
the photos and files in R2.

## The zip

```
backup.json     the manifest and every table's rows
files/<key>     every file in R2 under sites/<site id>/, at its key
README.txt
```

`files/` holds photos (`sites/<id>/photos/<photo id>.webp` and `.t.webp`, the
thumbnail), the puppy portal's files (`sites/<id>/portal/<placement id>/<file id>`: vet
proof, contracts, record attachments, stay photos and videos) and each published version
(`sites/<id>/snapshots/<snapshot id>.json`).

## backup.json

```
{
  "format": "kennelport-site-backup",
  "version": 1,
  "exported_at": "2026-11-10T15:00:00.000Z",
  "environment": "production",
  "root_domain": "kennelport.com",
  "schema": "0029",                  the last migration applied when it was made
  "site": { …the site's row in `sites`, every column… },
  "tables": { "<table>": [ { …a row, every column… }, … ], … },
  "skipped": [ … ],                  tables left out on purpose (below)
  "shared": { "wording": [ … ] },    the owner's changes to the Site Manager's wording
  "files": [ { "key": "sites/<id>/photos/….webp", "bytes": 81234, "type": "image/webp" }, … ]
}
```

Rules that hold for every table:

- A row is the database row, column for column, values as stored. `0`/`1` are yes/no.
  Dates are `YYYY-MM-DD`, times are ISO UTC. Columns named `content`, `build`, `photos`,
  `places`, `checklist`, `options`, `answers`, `edited_fields`, `data` hold JSON as text.
- Rows are in the order they were written. Tables are listed parents first, so reading
  them in order never meets a reference to a row not yet seen.
- A key starting with `_` is a note added on the way out, not a column. One exists:
  `portal_emails._email`, the family's address readable (it is stored encrypted in
  `email_enc`). A restore leaves `_` keys out.
- A log's running number (`portal_history.id`, `portal_email_log.id`,
  `portal_clicks.id`) is in the backup but is given again by the database on restore, so
  a site can be restored beside others. Nothing refers to those numbers.
- Every other id is kept exactly. Ids are what tie a site together: addresses, the
  KennelOS link, photos, families.

Left out (`skipped`), because they are sign-in state or copies that rebuild themselves:
`portal_sessions`, `portal_codes`, `link_codes`, `feed_cache`, `notify_items`. Also not
in a backup, because they belong to no one site: breeders' sessions and codes, rate
limits, the mail counts, the staging outbox.

## The tables, and what refers to what

**The site and its look**

| Table | One row is | Refers to |
|---|---|---|
| `site` (the `sites` row) | The kennel's details, scheme, status, limits, which version is published | `logo_photo_id` → photos, `published_snapshot_id` → snapshots |
| `site_pages` | A page's switch, menu label and wording (`content` JSON), by `page` key | |
| `home_blocks` | A Home block's switch and wording (`content` JSON), by `block` | photo ids inside `content` |
| `block_switches` | The breeder's switch and wording for a block the owner added, by `page` + `block` | |
| `site_builds` | **One row: the owner's whole build** for the site (`build` JSON: pages, blocks and their order, menu, display and timing rules, fixed wording) | page and block keys, photo and album ids inside the JSON |
| `payment_info` | Application fee, deposit, safe-payment notice (`content` JSON), by `kind` | |
| `form_fields` | A question on the application form | |
| `redirects` | An old address that still works | |
| `custom_domains` | Her own domain | |
| `snapshots` | A published version; its JSON is the file at `r2_key` | |

**What the site shows**

| Table | One row is | Refers to |
|---|---|---|
| `photos` | A photo; its files are at `r2_key` and `thumb_key`. `removed_at` set: taken off, file may be gone (`purged_at`) | |
| `photo_tags` | What a photo is of (`subject`: `dog:<id>`, `litter:<id>`, `puppy:<id>`, `extra:<id>`, `product:<id>`, `page:home`…) | `photo_id` → photos; the id inside `subject` |
| `dogs` | A dog | `photo_id`; `lives_with_kennel_id`, `co_owned_with_ids` (JSON list) → partner_kennels |
| `health_results` | One health result | `dog_id` → dogs |
| `partner_kennels` | A kennel she co-owns dogs with | `photo_id` |
| `litters` | A litter, planned, current or past | `dam_id`, `sire_id` → dogs |
| `puppies` | A puppy | `litter_id` → litters, `photo_id` |
| `albums` | A photo album; `photos` is a JSON list of photo ids in order | `litter_id`, `cover_photo_id` |
| `embeds` | A video or post, at `place` (`home`, `about`, `dog:<id>`, `litter:<id>`, `album:<id>`) | `preview_photo_id`; the id inside `place` |
| `stories` | A review | `photo_id` |
| `steps` | A How it works step | |
| `expanders` | A policy, FAQ question or waitlist-help entry (`page`); `places` JSON: where else a question shows | |
| `extras` | An extra or a going-home package | `photo_id` |
| `products` | A recommended product or program; also the portal's programs | `photo_id` |

`source` is `kennelport` (typed here) or `kennelos` (sent by KennelOS); `kennelos_id` is
that record's id in KennelOS, and is how the link finds it again. Keep both.

**People, messages, the KennelOS link**

| Table | One row is | Notes |
|---|---|---|
| `site_users` | Who may manage the site | `email_hash` only: no address is kept. Works with the same `EMAIL_HMAC_KEY`; otherwise invite again |
| `inquiries` | A message or application from the site | Deleted after 90 days by design, so a backup holds only the last 90 days |
| `waitlist_entries` | A family on the simple waitlist | `inquiry_id` → inquiries, may point at one since deleted |
| `notices` | A note to the breeder from KennelPort or the link | |
| `links` | A KennelOS device linked to the site | `token_hash`: the device keeps working after a restore with no new code |
| `link_pending`, `link_declines` | Matches waiting for her answer, and ones she said no to | `kennelport_id` → dogs or litters |

**The puppy portal** (sites with it on)

| Table | One row is | Refers to |
|---|---|---|
| `portal_settings` | Her portal settings: time zone, vet rule, contacts, food | |
| `portal_families` | A family | |
| `portal_emails` | One of a family's addresses: `email_hash`, `email_enc` (encrypted), `_email` (readable, backup only) | `family_id` |
| `portal_placements` | One puppy going to one family: pickup, the vet clock, proof, contract | `family_id`, `puppy_id` → puppies, `proof_file_id`, `contract_file_id` → portal_files |
| `portal_files` | A file on a placement; the file is at `r2_key` | `placement_id` |
| `portal_health_records` | A shot, deworming or vet visit | `placement_id` |
| `portal_checklist_items`, `portal_timeline_tasks` | Her templates (`placement_id` empty) and additions for one family | `placement_id`, `product_id` → products |
| `portal_placement_progress` | A family's tick, hidden step or moved date | `placement_id`, `item_id` → the item or task |
| `portal_placements_programs` | A family's status and code for a program | `placement_id`, `product_id` |
| `portal_placement_extras`, `portal_stay_skills`, `portal_stay_updates`, `portal_update_skills`, `portal_media` | An extended stay: what was bought, its skills, the weekly updates, their photos and videos (files at `r2_key`) | `placement_id`, `extra_id` → extras, each to the one before it |
| `portal_messages` | A message between her and a family | `family_id` |
| `portal_email_log` | Every email the portal sent: her evidence | `family_id`, `placement_id` |
| `portal_history` | Every change to a portal record: her evidence | `tbl` + `row_id` |
| `portal_clicks` | A tap on a program link | `product_id` |
| `portal_suggestions`, `portal_tombstones`, `portal_handoffs` | What the KennelOS family feed needs to stay in step | |

## From the content document to this

The older content document (`/ops` Content, and `content.json` in Download a copy) is
the same data seen from the site's side, with ids taken out and names put in. If a
content document is all there is, this is how its sections map:

| Content document | Backup tables | What the document loses |
|---|---|---|
| `site` | the `site` row | Status, limits, KennelOS ids, the published version |
| `pages.<page>` | `site_pages` | |
| `home.<block>` | `home_blocks` | |
| `blocks.<page>/<block>` | `block_switches` | The block itself: it lives in `site_builds`, which the document doesn't carry |
| `dogs[]`, with `health[]` inside | `dogs`, `health_results` | Ids, `kennelos_id`, `source` |
| `dogs[].lives_with`, `.co_owned_with` (names) | `dogs.lives_with_kennel_id`, `.co_owned_with_ids` (ids) | |
| `partners[]` | `partner_kennels` | |
| `litters[]`, with `puppies[]` inside; `dam`, `sire` (dog slugs) | `litters`, `puppies`; `dam_id`, `sire_id` | Ids, `kennelos_id`, the 30-day clock (`left_site_at`, `kept_at`) |
| `reviews[]` | `stories` | Who sent it, when |
| `steps[]` | `steps` | |
| `expanders.policies / faq / waitlist_help` | `expanders`, by `page` | |
| `extras[]`, `products[]` | `extras`, `products` | The portal's settings on each |
| `payment` | `payment_info` | |
| `questions[]` | `form_fields` | |
| `albums[]`; `litter` (slug), `photos` (ids) | `albums` | |
| `embeds[]`; `place` by slug | `embeds`; `place` by id | |
| (not in the document) | everything else above | |

A content document can still be loaded into a site (`/ops` → Content → Save to draft):
records are matched by slug, so the ids already there survive.

## If KennelPort's data is ever reshaped

The 2026-11 review (`docs/review/senior-review-2026-11.md`) found no reason to reshape
it, and nothing was: today the mapping from "old" to "new" is one to one, table for
table, column for column, which is what `restoreRows` does.

If a later change does move things, the way through is:

1. Make a full backup of each site first, at the old shape.
2. Deploy the change. A backup remembers its `schema`; a restore refuses a backup from a
   *newer* KennelPort, and takes one from an older KennelPort as long as every column in
   it still exists (new columns take their defaults).
3. If the change renamed or removed a table or column, a restore will stop and name it.
   Write the mapping here, as a table of `old table.column → new table.column` with the
   rule for each, and have a session rewrite the old `backup.json` to the new shape
   before restoring. The file is plain JSON and the rules at the top of this page hold
   for every table, so that rewrite is mechanical.
4. Bump `BACKUP_VERSION` only if the *file's own layout* changes (not for a new table
   or column).

A new table with a `site_id` column must be added to `SITE_TABLES` in
`worker/src/sites.js` (which is what closes a site and what a backup reads); a test fails
until it is, and until the table is either in the backup or named in `SKIPPED`.

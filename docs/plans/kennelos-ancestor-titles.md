# For KennelOS: send pedigree-only ancestors' titles (and their import)

A hand-over from KennelPort, 2026-11-14. Take this to a session on the KennelOS repo.
It asks for a KennelOS change only: the website contract (format 1, `lineage` and
`origin` sections) stays as it is.

## Why

KennelPort now works out **Champion-descended** (and Import-descended) from the
ancestors KennelOS sends with `lineage` (contract C7, KennelPort step 6). A dog is
champion-descended when an ancestor within the owner's generations (3 by default)
holds one of the owner's champion titles (CH, GCH, GCHB, GCHS, GCHG, GCHP by default).
The owner tags those dogs with a tag rule, and blocks can choose by it.

That only works if each ancestor's `titles` are filled. For most ancestors they are
empty today.

## What's wrong in KennelOS (as of `main` at PR #211)

- `shared/data/siteExport.js` `lineageOf` fills an ancestor's `titles` from
  `titlesByDog` (`shared/data/waitlistProjection.js`), which reads only
  **`title_earned` events**.
- Pedigree-only dogs come from a pedigree chart import. `shared/data/pedigreeParse.js`
  `splitTitles` takes the titles off the front of each name ("GCHB CH SUNWOOD BECAUSE I
  AM BOB THATS WHY" → name "SUNWOOD BECAUSE I AM BOB THATS WHY", titles GCHB, CH), and
  `toDog` puts them only into the dog's notes as a line: `Titles: GCHB CH`.
  `shared/data/pedigreeImport.js` saves those notes on `createPedigreeOnly`. No
  `title_earned` events are made.
- So every ancestor read from a chart is sent with `titles: []`. The chart's
  champions never reach the website, and no site can show a pedigree's titles or work
  out champion-descended from them.
- The same import never sets `imported` or `import_country`. A chart's foreign-
  registered ancestors (RKF, JR and so on) count as imports only if she opens each one
  and ticks Imported.

## What KennelPort needs

1. **Every ancestor's titles in `ancestors[].titles`**, including pedigree-only dogs,
   in the shape already in the contract: abbreviations (`["GCHB", "CH"]`) or, with
   `titles_detail`, `[{ abbr, organization, date }]` (organization and date may be
   null). Nearest first and to four generations, as now. KennelPort evens out case and
   dots (`H.CH` and `HCH` are the same).
2. **Titles kept as data, not only in notes.** Suggested: when a chart is read, keep
   the titles `splitTitles` finds as the dog's titles, in whatever form KennelOS keeps
   titles for a dog it doesn't own (a `title_earned` event with no date, or a
   `titles` field on a pedigree-only dog), and have `titlesByDog` (or `lineageOf`)
   read that too. Keep the notes line if she relies on it.
3. **Her existing chart imports**, once: read the `Titles: …` line from each
   pedigree-only dog's notes into the same place, so pedigrees already imported get
   their titles without importing again.
4. **A registered name that still carries titles** ("GCH A-K Bella", typed before
   charts were read): `pedigreeImport.js` already notes this happens. Either split
   those titles off when sending (the name without them in `registered_name`, the
   titles in `titles`), or leave it: KennelPort shows the name as sent.
5. **Imported on pedigree-only dogs** (smaller, optional): she can already tick it on
   each dog. If the chart's registry is a foreign one, KennelOS could offer to tick
   Imported with that country while reading the chart, as a suggestion she confirms;
   never set it silently (the owner's rule: KennelOS sends facts as she set them).

## Nothing changes in the contract

- No new section and no new key: `lineage` and `origin` already carry `titles`,
  `imported` and `import_country` on each ancestor, and KennelPort already reads them.
- A KennelOS with this fix needs no KennelPort release first, and KennelPort needs
  nothing more from KennelOS once it's in.

## Checking it

- A KennelOS test: a pedigree chart import of a dog whose grandsire is "GCH CH X";
  the website bundle's `ancestors` entry at `sire.sire` has `titles` `["GCH", "CH"]`.
- On a linked site: press Update website. On KennelPort, a Dog cards block with the
  condition Champion-descended yes lists the dog, and its Pedigree part (if the owner
  has switched it on) shows "GCH CH X" under Grandparents.

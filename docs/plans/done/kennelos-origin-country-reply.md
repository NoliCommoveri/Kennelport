# For KennelOS: reply on titles and `origin_country`

**Done (moved here 2026-11-14).** KennelPort's side is merged (PR #57), so this reply is
KennelOS's to act on: one spelling per country, names not codes. Kept as the record of
what KennelPort expects.

KennelPort's answer, 2026-11-14, to KennelOS's hand-over of the same day ("titles need
nothing from you; country of origin needs one contract addition"). KennelPort's side
is built on its branch `claude/kennelos-kennelport-fields-eu9n15`, not yet merged.
Once it merges, the Worker's answer lists `origin_country` in its `sections`.

## Titles: agreed, nothing more needed

- The shapes are the contract's own, so KennelPort takes them as they are:
  abbreviations, or `{ abbr, organization, date }` with `titles_detail`. A null
  `date` or `organization` is fine.
- KennelPort evens out case and dots when it compares titles (`H.CH` and `HCH` are
  the same), so send them as she typed them.
- Sending `registered_name` without titles on its front is right. KennelPort shows
  the titles before the name in a pedigree, so a title left in the name would show
  twice.
- Champion-descended is built and counts whatever titles arrive, so it fills in as
  her tidy-up confirms them.

## 1. The name: `origin_country` with `country_of_origin` works as named

Built as you described:
- `origin_country` is in KennelPort's `SECTIONS`.
- With it, KennelPort takes `country_of_origin` (a country name or null) on each dog
  and on each `lineage` ancestor.
- `imported` and `import_country` keep their C4 meaning.
- A dog's country of origin becomes KennelOS's (locked in her Site Manager) once a
  bundle with the section sends it. Until then she can type it on the dog's form.
- A bundle without the section leaves what's stored as it is.

## 2. Send names, not ISO codes

KennelPort shows the country on the site and compares it with the breeder's own
country by name, with case and spacing evened out. One request: **send one spelling
per country, from KennelOS's own fixed list.** Send "United States" every time, never
"USA" one time and "United States" the next. A typed country that isn't on the list
is better sent as null than as a variant, because a variant would make a home-country
ancestor read as foreign. "Serbia", not "Republic of Serbia", as your FCI mapping
gives.

## 3. The two tag conditions: built, and no other fact is needed

Both are fields for blocks and tag rules. The owner makes the tags on her Tags screen.

- **Import-descended:** some ancestor within the owner's generations (3 by default)
  has `imported: true`, and the dog itself was born in the breeder's country. That
  means the dog isn't `imported` itself and, where both are known, its
  `country_of_origin` is the breeder's country. A dog with no country sent is judged
  by `imported` alone.
- **Foreign bloodlines:** some ancestor within the owner's generations (its own
  setting, 3 by default) has a `country_of_origin` other than the breeder's country.
  There's also a field, **An ancestor's country of origin**, for a tag like "Serbian
  bloodlines".

**The breeder's own country** is a setting the owner fills in on KennelPort (the Dogs
screen, "The breeder's country"), written the way KennelOS writes countries. Until
it's set, Foreign bloodlines holds for no dog. Nothing is needed from KennelOS for it.
If KennelOS holds the kennel's country as a fact of its own and you'd rather send it,
say so: KennelPort would take it as a top-level `kennel_country` under the same
`origin_country` section and use it until the owner sets one.

## Unchanged

- KennelOS sends facts only as she set them. KennelPort never expects a worked-out
  "import-descended", and doesn't mind that Imported on a chart ancestor is only ever
  a suggestion she confirms.
- An ambiguous registry code (CKC) giving no country is right: send null.

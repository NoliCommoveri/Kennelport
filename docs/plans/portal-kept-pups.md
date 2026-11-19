# A family's puppy kept after its litter leaves the website, and each puppy's vet

Asked for 2026-11-19 (the owner, from the KennelOS review): a closed litter leaves the
website and her lists, but a family with a portal must never see their page change
because of it. Their puppy's vet is the vet it saw, and never changes when she changes
vets. Built 2026-11-19, migration 0039. KennelOS's half: the last section.

## What is kept, and for whom

- **Kept:** the puppy of every placement whose family has a portal: not deleted for good,
  not erased. A family deleted within the undo days is kept too, so Undo brings it all
  back. Closed placements count (a puppy that died: its family's loss page keeps "photos
  stay here for you").
- **Not kept:** the rest of the litter, and puppies with no family.
- **Goes:** when the family is deleted for good, erased, or the site is closed.

## How

- `portal_pups`, one row a placement: what the family's pages show from the website's
  puppy and litter (name, sex, colour, registration, registry, main photo, litter name,
  born, ready, the dam's and sire's names). Not a litter: no list of hers reads it.
- `portal_pup_photos`: the photos the family keeps.
- `portal/pups.js` `keepStatements` refreshes both for every kept placement whose website
  puppy is still there. It runs first, in the same batch, wherever a puppy, litter or
  photo is deleted: the 30-day clock and Remove now (`kennelos/clock.js` `deleteLitter`),
  removing a litter or puppy record (`content/records.js`), a content import
  (`content/io.js`), and removing photos in the photo library (`manage/screens.js`).
- The family's pages and her family screens read the website's puppy while it's there,
  then the copy (`pupOf`, `photosOf`): Records, Home, Photos, photo files, the extended
  stay's dates, her checklist view, Families and Going home.
- **The 30-day clock no longer spares a litter with an open placement**: it goes on time.
- **Photos:** a kept photo she removes from the website (or that goes with the litter) is
  off the website and out of her library, but the nightly cleanup never deletes its file
  while a family keeps it (`cleanup.js`). The family keeps a photo she removes by hand
  too (the owner, 2026-11-19).
- **Her placement form:** once the puppy's litter has gone, the puppy's choice reads
  "{name} · {litter}", like any other, and saving leaves the puppy as it is. Nothing on
  her screens or the family's says where it's kept or that anything moved.

## Each puppy's vet

- `portal_placements.pup_vet_clinic`, `pup_vet_doctor`, `pup_vet_phone`, `pup_vet_address`:
  the vet the family sees as "{name}'s vet since birth" (`store.vetOf`). Her site vet only
  where a placement has none.
- **Filled:** from KennelOS's `placements[].vet`; otherwise her site vet when the
  placement is made. Before her site vet changes (her settings, or KennelOS's `vet`
  filling or a suggestion she takes), every placement with no vet of its own takes the
  old one (`store.freezeSiteVetStatement`). The migration gave every existing placement
  today's site vet.
- **She can correct it** on the family's screen (the owner, 2026-11-19). Her correction
  wins; a different one from KennelOS waits as a suggestion, as for her other fields.
- Her vet note shows only with her own vet.

## Limits

- A family whose litter was deleted before this was built has lost those details; only a
  backup from before can bring them back.

## KennelOS's half

The feed (`POST /v1/portal`, format 1) now takes, on each placement:

```
vet?: { clinic?, doctor?, phone?, address? }   (same lengths as the top-level vet: 120, 120, 40, 200)
```

- **Which vet:** the clinic on that puppy's own vet-visit events, else her vet at the
  time (the owner agreed to KennelOS's proposal, 2026-11-19).
- **Optional:** leave it out and the placement keeps the vet it has. KennelPort accepts it
  from this release, so KennelOS can send it any time after this is on KennelPort's `main`
  (before that, KennelPort refuses the unknown field with a 400).
- **Frozen:** stop sending it once the placement rests (no longer in the feed), as with
  the rest. KennelPort never changes it after that.
- The top-level `vet` stays as it is: her vet, for her settings.
- Also on KennelOS's side (its own review): a delivered sale that's archived should rest,
  not go out as `removed`.

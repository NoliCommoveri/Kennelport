# The linked sample

Tuxedo Lane Bostons*, a **made-up** kennel, as KennelOS would send it
(`docs/Linked_Sample_Plan.md`). Nothing here is real: every dog, family, address and
price is invented, and names carry a * as in the AK sample. No photos.

- `bundle-N.json`: the website bundle (`src/kennelos/bundle.js`, format 1), as Update
  website posts it to `/v1/bundle`.
- `feed-N.json`: the family feed (`src/portal/feed.js`, format 1), posted to `/v1/portal`.
- `expect-N.md`: what the site should hold after step N.
- `sample.js`: loads a file, moving every date by whole days from 2026-11-01 to the day
  you give, so the gaps between dates stay the same on any day.

`tests/linked-sample.test.js` fails, naming what to add, when the bundle or feed takes
a field or value the sample doesn't use. Add it to the step-1 files.

## Step 1: what each record is for

**Dogs** (10)
- Clover*: titles, a registry, normal and not-normal health results, one with a verify link.
- Maple*: UKC, an undated health result.
- Juniper*: co-owned with Ridgeview* and Harbor Light*, living at home.
- Wren*: only the required fields.
- Atlas*: the main sire, two titles.
- Bishop*: co-owned, living with Ridgeview*.
- Pippa*: a kept puppy (`puppy`: up and coming).
- Rocco*: an adult `for_sale`, a not-normal result.
- Hazel*: `retired_breeding`.
- Ginger*: `deceased`, with `died_on`.

**Partner kennels**: Ridgeview* (website), Harbor Light* (no website), Prairie Wind* (sent, but no dog names it).

**Litters**
- A, The Gem litter*: deposits open, every price, a pairing it came from; seven pups, one
  of each status (Ruby* and Pearl* available), registration limited, full and unset.
- B, The Spice litter*: deposits still three weeks ahead; prices for girls only.
- C, The Summer litter*: past its ready date, so Sunny* is an older puppy.
- E, Wren* × Moose*: expected, no prices, an outside sire by name, a heat it used.

**Pairings**: P1 (Juniper* × Atlas*, becomes litter D in step 3); P2 (from heat H1).
**Heats**: H1 (Maple*, becomes P2's); H2 (a dam by name only).

**Extras**: two stays (one fixed price), a photo package (from a price), a starter pack (no price).
**Products**: a food program with a code, insurance with a link only, two transport services.
**Steps**: five. **Payment**: application fee and deposit, with methods. **Waitlist**: an id.

**Family feed**
- Reeds*: Ruby*, before go-home, two health events.
- Hales*: Onyx*, picked up 3 days ago (the vet window), microchip, registration number, a vet visit, the photo package.
- Ortegas*: Jade*, weeks 1–8, the 12-week stay.
- Parks*: Skye*, a year on.
- Lees*: Garnet* voided, failed health check. Diazes*: two voided, backed out and other. Chos*: died.
- The vet, and one removed family, placement and health event.

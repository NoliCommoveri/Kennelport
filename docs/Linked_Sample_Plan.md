# A linked sample site: plan

Nothing here is built yet. This is a plan for a made-up kennel, as KennelOS would send it,
so the owner can see and test a site linked to KennelOS without a real breeder's data.

## What it is for

1. **Building and checking templates and rules** (`docs/Site_Builder_Plan.md`). Every
   filter, display rule and timing rule needs records to act on: a pup of every status,
   dogs of every kind, litters at every stage. The site builder's previews and "Shows N
   dogs" lines use it.
2. **A demo site.** From `/ops`, the owner makes a demo site, links it to the sample
   instead of a real KennelOS, and tries templates on it. Nobody's real data is involved.
3. **Tests.** The same files feed `node --test`. One test checks that the sample uses
   every field and every value the bundle and feed accept, so the sample stays complete
   as the package grows.
4. **The KennelOS package review** (Site_Builder_Plan, decision 8). It is a record of
   what the package carries today, value by value, and a list of which values are raw
   and which are KennelOS's summaries. The review works from that list.

## What it holds

Two kinds of package, as KennelOS sends them today:

- **The website bundle** (`kennelos/bundle.js`, format 1), posted by Update website to
  `/v1/bundle`.
- **The family feed** (`portal/feed.js`, format 1), posted to `/v1/portal` for a site
  with the family portal.

It holds a series of them over time, not one, because much of what the site does
happens between two bundles: a pup moves from reserved to placed, a pairing becomes a
litter, a litter leaves and its 30-day clock starts.

### The kennel

**Tuxedo Lane Bostons*** (made up), a Boston Terrier kennel. Every name in the sample is
made up and marked * where it is shown, like the AK sample (`docs/reference/README.md`).
This repository is public, so no real breeder's dogs, families or prices go in it. The
sample has no photos; the site shows its placeholders.

### Coverage: every field and every value

**Dogs** (12):

| What it covers | Dogs |
|---|---|
| Each KennelOS status | `active_breeding` (4 girls, 2 boys), `puppy` (a girl kept back), `for_sale` (an adult boy), `retired_breeding` (a girl), `deceased` (a girl with `died_on`) |
| Titles and registries | one with three titles, one with none; two registries (AKC, UKC) |
| Health results | normal and not normal results; dated and undated; one with `verify_url`; one dog with none |
| Co-owned, living with her | `co_owned` with two partner kennels, `lives_away` false |
| Co-owned, living away | `lives_away` with `lives_with_kennel_id` |
| Missing optional fields | one dog with only the required fields |

**Partner kennels** (3): one with a website, one without, and one that's sent but named
by no dog.

**Litters, pairings and heats:**

| Record | What it covers |
|---|---|
| Litter A, current, deposits open | full prices for both sexes, 7 pups (one of each status, below) |
| Litter B, current, deposits date still ahead | "Available on {date}"; prices for one sex only |
| Litter C, current, past its ready date | its available pups are older puppies |
| Litter D, born, from a pairing | `pairing_id`: takes over pairing P1 from the bundle before |
| Pairing P1 | becomes litter D in a later bundle |
| Pairing P2, from a heat | `heat_id`: takes over heat H1 |
| Heat H1 | becomes pairing P2 in a later bundle |
| Heat H2 | a dam named only by `dam_name` (not a dog on the site) |
| Litter E, no prices | `prices` missing; a sire named only by `sire_name` |

**Pups:** every status (`available`, `reserved`, `placed`, `staying`, `undecided`,
`hidden`), with registration `limited`, `full` and unset, with and without a collar, and
with a registry.

**The optional sections**, each sent once:
- `extras`: two stays, one photo package and one item; price ranges with `price_from`
  equal to `price_to`, and one with no price.
- `products`: one with a referral link and code, one with a link only, and two transport
  ones with `website` and `transport`.
- `steps`: five.
- `payment`: an application fee and a deposit, each with methods.
- `partner_kennels`: above.
- `waitlist_public_id`.

**The family feed** (for the portal):
- one family at each stage of Family Home: before go-home, the vet window, weeks 1–8,
  and a year on;
- one placement voided for each `voided.reason`: `died`, `failed_health`, `backed_out`
  and `other`;
- health events of every type;
- extras: a stay and a photo package, matching `extras` in the bundle;
- the vet;
- `removed`: a family, a placement and a health event.

### The series

| # | Sent on (sample dates) | What changes |
|---|---|---|
| 1 | Nov 1, 2026 | Everything above, first link |
| 2 | Nov 20 | A pup reserved → placed; another available → reserved; a health result added |
| 3 | Dec 10 | Pairing P1 becomes litter D; heat H1 becomes pairing P2; litter B's deposits date passes |
| 4 | Jan 15, 2027 | Litter A stops being sent (its 30-day clock starts); the deceased dog leaves; a partner kennel is renamed |
| 5 | Jan 20 | Litter A sent again within its 30 days (comes back with its photos and wording) |

Feeds go out with the series: the contract signed, pickup booked, the vet visit, a
placement voided, a family removed.

Each step has a short **expect** file: what the site should show after it, written in
words a test can check, such as "Puppies page: litter D, 4 pups" or "Litter A: leaves on
Feb 14".

### Raw or summary: the list for the review

Beside each value, the sample notes whether KennelPort gets KennelOS's raw value or its
summary. From the code today:

| Value | What KennelPort gets | What it stands for in KennelOS (plan 3.6, 5.3) |
|---|---|---|
| Pup `reserved` | summary | a waitlist pick awaiting its deposit, or a sale before delivery |
| Pup `available` | summary | `isPupAvailable`: available and no open pick |
| Pup `hidden` | summary | a health hold |
| Pup `undecided` | summary | undecided, or no plan set |
| Pup `placed`, `staying` | close to raw | placed; keeping |
| Dog `status` | raw | mapped on arrival to the site's status, up and coming and for sale (`bundle.js` `DOG_STATUS`) |
| A pairing's or heat's place on the site | summary | KennelOS's heat-to-pairing rules (decision 30) |
| Dogs, litters and pairings sent at all | the breeder's Show on website | — |

The review adds what KennelOS knows but doesn't send. The sample then gets those raw
values too, so the site builder's rules can be tried on them.

## Where it lives

- **The packages:** `worker/tests/fixtures/linked-sample/`, as one JSON file per step:
  `bundle-1.json` … `bundle-5.json`, `feed-1.json` …, with `expect-N.md` beside them.
  They're JSON, exactly as KennelOS would post them, so they can also be posted to a real
  Worker by hand.
- **A README in that folder** listing what's real (nothing) and what each record is
  there to cover.
- **The coverage test:** it reads `bundle.js`'s `SHAPES` and the feed's fields, and fails
  when a field or value that the package accepts is missing from the sample, naming
  what to add.
- **The series test:** it posts each step in order to a test Worker and checks the
  expect file.
- **The demo site** (`/ops`): **Make a demo site from the sample** creates a site, links
  it to the sample (no KennelOS device), and loads step 1. Buttons step it forward
  ("Send bundle 2") and back to step 1. It's marked Demo everywhere, can't be published
  at a real address, and is never indexed by search engines.
- **The site builder prototype:** its sample data is replaced by step 1, so the
  previews show what a linked site really receives.

No migration is needed for the files or the tests. The demo site needs one column
(a site marked demo), in that step's own migration.

## Building it, in steps

1. **The packages and the coverage test.** Bundle 1 and feed 1, until the coverage test
   passes.
2. **The series and the series test.** Bundles 2–5, feeds, and the expect files.
3. **The demo site** in `/ops`.
4. **After the KennelOS review:** add the raw values the review agrees to send.

## Open questions

1. **The kennel:** a made-up kennel (proposed), or the AK sample's dogs, as the website
   sample already uses them?
2. **The demo site:** should a demo site be visible only to the owner, or shareable with
   a breeder by preview link to show them a template?

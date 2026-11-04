# Reference builds

Published copies (claude.ai artifacts, with the photos):
- The AK sample, shared with the first breeder: https://claude.ai/artifact/CP9T5ouidYfr1KfLvTY18D
- The scheme lab (private): https://claude.ai/artifact/XzWppS7x8epbNHA1uicRDh
- The portal prototype: https://claude.ai/artifact/ELrT2DnhfmSbPe72SwVG28

To change either, update the file here and republish it to the same link (pass the link
as the artifact's `url`) so the shared address keeps working.

**`ak-sample.html`** is the working sample of the first site, AK Boston Terriers: the
target for version 1 (plan, top and section 8.1). It's one page with hash routing
(`#home`, `#residents`, `#puppies`, `#how`, `#extras`, `#waitlist`, …), built to be
published as a claude.ai artifact, so it has no `<html>`/`<head>` wrapper of its own.

- **Photos aren't in this repository.** The page expects `img/willow.jpg`, `ziva`,
  `peaches`, `pearl`, `ruby`, `onyx`, `opal` and `contessa`, cropped from the kennel's own
  Facebook posts. This repository is public, so they stay out unless the kennel agrees.
  Without them the page works with broken images.
- **Real:** the kennel name, the dogs Willow, Ziva, Peaches, Onyx, Opal, Diamond and
  Contessa, and the three extended-homegoing packages (names, prices, checklists).
- **Draft:** the Using your status page outline (`#applicant-help`); the breeder writes the real text.
- **Made up:** the payment details in How to pay (`@AK-Bostons-Sample`, `payments@akbostons.example`), names marked * (Pearl, Boone), registered names, parents of each litter,
  health results, reviews, policies, FAQ answers, and every waitlist family. The 16-week
  checklist past "Crate-training foundations" is filled in from the package's own
  description.
**`scheme-lab.html`** is the same sample with a bar for switching between the colour
schemes (design direction section 7: the six, and Tuxedo, proposed) and Auto, Light and
Dark. Its header shows AK's own logo (`img/ak-logo.jpg`, tap for full size), which, like
the photos, isn't in this repository: it's only in the published artifact. Its `SCHEMES` list holds
each scheme's light and dark colours, fonts and ornament, the starting point for the
template's scheme files.

In `ak-sample.html`:
- **The waitlist** mirrors KennelOS's public list (`cloud/public/family/list.js` and
  `common.js` in KennelOS): same rows, names, Wants wording, gap note and ⓘ added date.

**`kennelport-manager-icon.png`** is the KennelPort Site Manager app icon, from the owner's
artwork with its outer border removed (phones round icons themselves). The app's icon
sizes in `worker/public/_kp/m/icon-*.png` are made from it; the maskable one keeps the
art in Android's middle 80%.

**`portal-prototype.html`** is a clickable prototype of the Puppy Parent Portal
([`../Puppy_Parent_Portal_Plan.md`](../Puppy_Parent_Portal_Plan.md) section 7): the family
pages, the KennelOS status page they hand off from, and her Site Manager as one app for her website and the portal (Today, Families with the
waitlist, Dogs, Website, Portal, Reports), in the AK sample's Lawn scheme, light and dark. A bar at
the top switches between the Family and Breeder views and four dates (before go-home, the
vet window, weeks 1–8, the first birthday); everything is in memory and resets when
the date changes. Like the AK sample it has no `<html>`/`<head>` wrapper (artifacts add one); it is published at the link in this file's list above.

- **Real:** the kennel name, the Gem litter, its birth date and go-home date, Willow, and
  the puppies Opal, Onyx and Diamond.
- **Made up:** every family and email, the families' messages and notes, the website's messages, review, waitlist and unpublished changes, Boone (as in the AK sample), pickup and booking
  times, the microchip, the food, the programs and their wording, the discount code,
  health records, the weights and the baby book text. Photos are placeholders (this
  repository is public).
- **The journey (plan sections 1, 3.4 and 7.4):** a third view, **Status page**, is the
  KennelOS family status page in its own plainer look: before pickup it keeps pickup,
  extras and messages and opens the portal with one tap; after pickup it shows only the
  portal link. The **Opal, before pickup** buttons show the quiet page for a puppy who dies
  or fails a health check, and the way back to the status page. Her side shows the invite
  after a signed contract, the note she writes after a loss, messages from pickup on,
  pickup history, **Last from KennelOS**, and (on Dec 24) Diamond's pickup that she
  didn't mark, with the vet clock started from the booked time.
- **Not shown:** littermates' birthdays; a family's program status on her side; life
  status after pickup. Its Dogs screen offers **Staying**, KennelPort's word for a puppy
  she keeps, never an extended stay (plan section 7.3).

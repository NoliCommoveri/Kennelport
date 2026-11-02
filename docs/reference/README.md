# Reference builds

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
- **Made up:** names marked * (Pearl, Boone), registered names, parents of each litter,
  health results, reviews, policies, FAQ answers, and every waitlist family. The 16-week
  checklist past "Crate-training foundations" is filled in from the package's own
  description.
- **The waitlist** mirrors KennelOS's public list (`cloud/public/family/list.js` and
  `common.js` in KennelOS): same rows, names, Wants wording, gap note and ⓘ added date.

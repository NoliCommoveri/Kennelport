# KennelPort Worker

One Worker for every site, the manage app, `/ops` and the KennelOS link API
([`../docs/KennelPort_Plan.md`](../docs/KennelPort_Plan.md) section 2). Setup in the
Cloudflare dashboard: [`../docs/KennelPort_Setup.md`](../docs/KennelPort_Setup.md).

- `src/index.js`: the router; `src/hosts.js` picks the part of KennelPort from the hostname.
- `src/ops.js`: `/ops` on the manage host (sign-in, setup checks, migrations);
  `src/ops/sites.js`: its site screens.
- `src/content/model.js`: every content field and its limits, the one list the import,
  the snapshot and (phase 2) the manage app's forms use; `src/content/io.js`: content as
  one JSON document; `src/content/akSample.js`: the AK sample as that document.
- `src/publish.js`: draft → snapshot in R2 → live, undo, redirects. `src/site.js`: serving
  a site (snapshot or preview, photos, cache). `src/render/`: the "ak" template's pages,
  with its CSS, JS and fonts in `public/_kp/`.
- `src/photos.js`: the server's photo checks; `src/sites.js`: create, suspend, close.
- `scripts/cpu-check.mjs`: CPU time of publishing and rendering (plan 4.4).
- `src/migrate.js`, `src/gate.js`, `src/lib/`: copied from KennelOS cloud; a fix found in
  one copy belongs in both.
- `src/migrations/`: a new migration is a new `.sql` file plus its line in `index.js`;
  never edit one applied on production.

Run: `npm install`, then `npx wrangler dev` (local D1 and R2; put `OPS_TOKEN=...` in
`.dev.vars`). Test: `npm test` here, or `node --test` from the repo root (Node 22 or later).
Nothing may log an email address, a code, a token or a request body.

# KennelPort Worker

One Worker for every site, the manage app, `/ops` and the KennelOS link API
([`../docs/KennelPort_Plan.md`](../docs/KennelPort_Plan.md) section 2). Setup in the
Cloudflare dashboard: [`../docs/KennelPort_Setup.md`](../docs/KennelPort_Setup.md).

- `src/index.js`: the router; `src/hosts.js` picks the part of KennelPort from the hostname.
- `src/ops.js`: `/ops` on the manage host (sign-in, setup checks, migrations).
- `src/migrate.js`, `src/gate.js`, `src/lib/`: copied from KennelOS cloud; a fix found in
  one copy belongs in both.
- `src/migrations/`: a new migration is a new `.sql` file plus its line in `index.js`;
  never edit one applied on production.

Run: `npm install`, then `npx wrangler dev` (local D1 and R2; put `OPS_TOKEN=...` in
`.dev.vars`). Test: `npm test` here, or `node --test` from the repo root (Node 22 or later).
Nothing may log an email address, a code, a token or a request body.

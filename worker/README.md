# KennelPort Worker

One Worker for every site, the Site Manager, the family portal, `/ops` and the KennelOS
link API ([`../docs/plans/kennelport.md`](../docs/plans/kennelport.md) section 2). Which
file does what: [`../docs/CODE_MAP.md`](../docs/CODE_MAP.md). Setup in the Cloudflare
dashboard: [`../docs/plans/setup.md`](../docs/plans/setup.md).

Run: `npm install`, then `npx wrangler dev` (local D1 and R2; put `OPS_TOKEN=...` in
`.dev.vars`). Test: `npm test` here, or `node --test` from the repo root (Node 22 or later).

- Files under `public/_kp/m/`, `public/_kp/t/` and `public/_kp/f/` are cached by browsers;
  a change needs a version bump, and the owner is asked first (`../CLAUDE.md`).
- A new migration is a `.sql` file in `src/migrations/` plus its line in `index.js`; never
  edit one that is on `main`.
- Nothing may log an email address, a code, a token or a request body.

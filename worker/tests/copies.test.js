// Files copied from KennelOS cloud (review/senior-review-2026-11.md item 10). Copies
// drift: a fix lands in one and not the other. This fails when one of KennelPort's
// copies changes, so the change is carried to KennelOS too (or KennelOS's fix here),
// and only then is its fingerprint below updated.
//
// gate.js started as a copy but now differs on purpose (it applies migrations by
// itself), so it isn't held here. Sign-in follows KennelOS's approach but is
// KennelPort's own code (signin.js), so it isn't either.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const COPIES = {
  'worker/src/lib/sql.js': { from: 'KennelOS cloud/src/lib/sql.js (from MCCE_Coop_Learning)', sha256: '0ae34956b2797e833e5e32c69485767e0dc2b29c0b1e1e37676ade0e02e838c8' },
  'worker/src/lib/crypto.js': { from: 'KennelOS cloud/src/lib/crypto.js', sha256: 'db70642874222f0d55cdc328197f0c2fe73e8dab4e2a7e1eb66cba1a72cef099' },
  'worker/src/migrate.js': { from: 'KennelOS cloud/src/migrate.js', sha256: 'ea0698347e680867d6dbe1d364652fb88df740ba4259447dc694956df03de648' },
};

for (const [path, { from, sha256 }] of Object.entries(COPIES)) {
  test(`${path} is still the copy of ${from}`, async () => {
    const now = createHash('sha256').update(await readFile(new URL(`../../${path}`, import.meta.url))).digest('hex');
    assert.equal(now, sha256, `${path} changed. It is a copy of ${from}: make the same change there (or check it is already there), then put ${now} here in worker/tests/copies.test.js.`);
  });
}

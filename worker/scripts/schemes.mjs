// Writes public/_kp/t/ak/scheme-<id>.css for every colour scheme in
// src/render/schemes.js, the one place schemes are defined. Run from the repo root
// after changing a scheme: `node worker/scripts/schemes.mjs`. tests/schemes.test.js
// fails while a file differs from what the list makes. The files are part of the
// site template, so a change to them needs a new ASSET_VERSION (ask first, CLAUDE.md).
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { SCHEME_IDS, schemeCss, schemeFile } from '../src/render/schemes.js';

const DIR = fileURLToPath(new URL('../public/_kp/t/ak/', import.meta.url));
for (const id of SCHEME_IDS) {
  await writeFile(DIR + schemeFile(id), schemeCss(id));
  console.log(schemeFile(id));
}

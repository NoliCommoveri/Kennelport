// Fingerprints of the files browsers cache: the manage app's (public/_kp/m/, cached
// first by its service worker) and the site template's (public/_kp/t/, cached a day
// by browsers). tests/versions.test.js compares them with the ones recorded beside
// APP_VERSION (src/manage/version.js) and ASSET_VERSION (src/render/version.js), so
// a changed file without a new version number fails the tests.
//
// After bumping a version, run `node worker/scripts/fingerprint.mjs` from the repo
// root and paste the matching value next to it.
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const PUBLIC = fileURLToPath(new URL('../public/_kp/', import.meta.url));

async function files(dir, prefix = '') {
  const out = [];
  for (const e of await readdir(dir + prefix, { withFileTypes: true })) {
    const rel = prefix + e.name;
    if (e.isDirectory()) out.push(...await files(dir, `${rel}/`));
    else out.push(rel);
  }
  return out.sort();
}

export async function fingerprint(sub) {
  const dir = `${PUBLIC}${sub}/`;
  const hash = createHash('sha256');
  for (const f of await files(dir)) hash.update(f).update('\0').update(await readFile(dir + f)).update('\0');
  return hash.digest('hex').slice(0, 16);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(`APP_FILES (public/_kp/m)      ${await fingerprint('m')}`);
  console.log(`TEMPLATE_FILES (public/_kp/t) ${await fingerprint('t')}`);
}

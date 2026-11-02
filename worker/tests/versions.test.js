// Files browsers cache must come with a new version number, or phones keep the
// old ones: the manage app's service worker serves public/_kp/m/ from its cache
// first, and browsers keep public/_kp/t/ a day. This fails when those files change
// and the version beside their recorded fingerprint doesn't. Ask the owner before
// bumping (CLAUDE.md): they may not be done changing things.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call } from './helpers/env.js';
import { fingerprint } from '../scripts/fingerprint.mjs';

const { APP_VERSION, APP_FILES } = await import('../src/manage/version.js');
const { ASSET_VERSION, TEMPLATE_FILES } = await import('../src/render/version.js');

const how = (name, file, key, now) => `Files under public/_kp/${key === 'APP_FILES' ? 'm' : 't'}/ changed since ${name} was last bumped. `
  + `Ask the owner first, then bump ${name} in ${file} and set ${key} = '${now}' there (node worker/scripts/fingerprint.mjs prints it).`;

test('the manage app files match their version', async () => {
  const now = await fingerprint('m');
  assert.equal(now, APP_FILES, how('APP_VERSION', 'src/manage/version.js', 'APP_FILES', now));
});

test('the site template files match their version', async () => {
  const now = await fingerprint('t');
  assert.equal(now, TEMPLATE_FILES, how('ASSET_VERSION', 'src/render/version.js', 'TEMPLATE_FILES', now));
});

test('the service worker is served with the app version filled in, everywhere', async () => {
  const env = await makeEnv();
  const sw = await (await call(env, 'manage.kennelport.com', '/sw.js')).text();
  assert.doesNotMatch(sw, /__APP_VERSION__/);
  assert.match(sw, new RegExp(`const VERSION = 'kp-manage-${APP_VERSION}'`));
  assert.match(sw, new RegExp(`/_kp/m/app\\.js\\?v=${APP_VERSION}'`));
  assert.match(sw, new RegExp(`/_kp/m/photos\\.js\\?v=${APP_VERSION}'`));
  assert.ok(ASSET_VERSION);
});

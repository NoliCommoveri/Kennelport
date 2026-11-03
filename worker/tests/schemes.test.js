// The colour schemes (plan 3.13): every palette passes the contrast check in both
// versions, each scheme's file is what src/render/schemes.js makes, and a breeder's
// choice on Kennel details reaches every page once published.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { makeEnv, call, addSite } from './helpers/env.js';

const { SCHEMES, SCHEME_IDS, TEXT_PAIRS, FACES, contrast, schemeCss, schemeFile } = await import('../src/render/schemes.js');
const { SCHEME_IDS: MODEL_IDS } = await import('../src/content/model.js');
const { importContent } = await import('../src/content/io.js');
const { AK_SAMPLE } = await import('../src/content/akSample.js');
const { inviteToSite } = await import('../src/auth.js');
const { forgetSnapshots } = await import('../src/publish.js');

const M = 'manage.kennelport.com';
const SITE = 'akbostons.kennelport.com';
const DIR = new URL('../public/_kp/', import.meta.url);

test('every scheme reads at 4.5:1 or better, light and dark', () => {
  const low = [];
  for (const s of SCHEMES) {
    for (const mode of ['light', 'dark']) {
      for (const [fg, bg] of TEXT_PAIRS) {
        const c = contrast(s[mode][fg], s[mode][bg]);
        if (c < 4.5) low.push(`${s.name} ${mode}: ${fg} on ${bg} is ${c.toFixed(2)}:1`);
      }
    }
  }
  assert.deepEqual(low, []);
});

test("each scheme's file is what schemes.js makes, with fonts that are there", async () => {
  assert.deepEqual(MODEL_IDS, SCHEME_IDS);
  for (const id of SCHEME_IDS) {
    const file = await readFile(new URL(`t/ak/${schemeFile(id)}`, DIR), 'utf8');
    assert.equal(file, schemeCss(id), `${schemeFile(id)} is out of date: run node worker/scripts/schemes.mjs`);
  }
  for (const [, , , font] of FACES) assert.ok((await readFile(new URL(`fonts/${font}`, DIR))).length > 1000, font);
  // Dark first: Midnight is dark unless the page says light.
  assert.match(schemeCss('midnight'), /^:root \{[^}]*--bg: #15171B/m);
  assert.match(schemeCss('midnight'), /:root\[data-theme="light"\] \{[^}]*--bg: #F4EEDF/);
  assert.doesNotMatch(schemeCss('midnight'), /prefers-color-scheme/);
  // No script font: the display face's italic stands in.
  assert.match(schemeCss('slate'), /--f-script: "DM Serif Display"[^;]*; [^}]*--script-style: italic/);
});

test('a scheme chosen on Kennel details reaches every page', async () => {
  forgetSnapshots();
  const env = await makeEnv();
  const site = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  await importContent(env, site.id, AK_SAMPLE);
  await inviteToSite(env, site.id, 'b@example.com', 'owner', { manageUrl: 'x', siteUrl: 'y' });
  const headers = { origin: `https://${M}` };
  await call(env, M, '/signin', { method: 'POST', headers, body: new URLSearchParams({ email: 'b@example.com' }) });
  const code = env.DB.raw.prepare("SELECT subject FROM dev_outbox WHERE kind = 'code' ORDER BY id DESC").get().subject.match(/\d{6}/)[0];
  const res = await call(env, M, '/signin/verify', { method: 'POST', headers, body: new URLSearchParams({ email: 'b@example.com', code }) });
  const cookie = res.headers.get('set-cookie').split(';')[0];
  const post = (p, body) => call(env, M, `/s/akbostons${p}`, { method: 'POST', headers: { cookie, origin: `https://${M}` }, body: new URLSearchParams(body) });
  const page = async (p) => (await call(env, SITE, p)).text();

  await post('/publish', {});
  const before = await page('/');
  assert.match(before, /data-scheme="lawn"/);
  assert.match(before, /href="\/_kp\/t\/ak\/scheme-lawn\.css\?v=/);

  const form = await (await call(env, M, '/s/akbostons/details', { headers: { cookie } })).text();
  assert.match(form, /name="scheme" value="lawn" checked/);
  assert.match(form, /<b>Midnight<\/b><br>Cormorant · Mulish · Pinyon Script<br>Dark first/);

  const details = { kennel_name: 'AK Boston Terriers', dark_mode: 'light_only' };
  await post('/details', { ...details, scheme: 'harbor' });
  assert.match(await (await call(env, M, '/s/akbostons/publish', { headers: { cookie } })).text(), /Kennel details/);
  assert.match(await page('/'), /data-scheme="lawn"/); // nothing changes before Publish
  await post('/publish', {});
  for (const p of ['/', '/dogs', '/litters']) {
    const html = await page(p);
    assert.match(html, /<html lang="en" data-theme="light" data-scheme="harbor">/);
    assert.match(html, /scheme-harbor\.css/);
    assert.match(html, /fonts\/cormorant-garamond-600\.woff2/);
    assert.match(html, /<symbol id="sprig" viewBox="0 0 120 60"><g[^>]*><path d="M6 32 q7 -9/); // the rope line
  }
  // A form without the picker leaves the scheme alone; an unknown one is refused.
  await post('/details', details);
  assert.equal(env.DB.raw.prepare('SELECT scheme FROM sites WHERE id = ?').get(site.id).scheme, 'harbor');
  await post('/details', { ...details, scheme: 'neon' });
  assert.equal(env.DB.raw.prepare('SELECT scheme FROM sites WHERE id = ?').get(site.id).scheme, 'harbor');
  assert.equal((await call(env, SITE, '/_kp/t/ak/scheme-tuxedo.css')).status, 200);
});

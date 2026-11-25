// Preview your portal (portal/sample.js): her portal with a made-up family and puppy,
// before she has added anyone. The sample's dates follow the day she picks; every
// page draws as for a real family, in every look; nothing is stored or sent.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';
import { LOOKS } from '../src/portal/looks.js';
import { SAMPLE_FAMILY } from '../src/portal/sample.js';

const M = 'manage.kennelport.com';
const H = 'akbostons.kennelport.com';
const form = (o) => new URLSearchParams(o);
const outbox = (env) => env.DB.raw.prepare('SELECT kind, subject, body FROM dev_outbox ORDER BY id').all();
const cookieOf = (res) => res.headers.get('set-cookie')?.split(';')[0];
const PAGES = ['/family', '/family/timeline', '/family/vet', '/family/records', '/family/photos', '/family/messages', '/family/handbook', '/family/resources', '/family/potty', '/family/training', '/family/stay', '/family/account'];

async function setup() {
  const env = await makeEnv({ PORTAL_EMAIL_KEY: 'portal-test-key' });
  const site = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  const ops = cookieOf(await call(env, M, '/ops/login', { method: 'POST', body: form({ token: 'ops-token' }) }));
  await call(env, M, `/ops/sites/${site.id}/people`, { method: 'POST', headers: { cookie: ops }, body: form({ email: 'breeder@example.com', role: 'editor' }) });
  await call(env, M, `/ops/sites/${site.id}/portal/on`, { method: 'POST', headers: { cookie: ops } });
  await call(env, M, '/signin', { method: 'POST', body: form({ email: 'breeder@example.com' }), headers: { origin: `https://${M}` } });
  const code = outbox(env).at(-1).subject.match(/(\d{6})/)[1];
  const breeder = cookieOf(await call(env, M, '/signin/verify', { method: 'POST', body: form({ email: 'breeder@example.com', code }), headers: { origin: `https://${M}` } }));
  const her = (path, body) => call(env, M, `/s/akbostons${path}`, body ? { method: 'POST', body: form(body), headers: { cookie: breeder, origin: `https://${M}` } } : { headers: { cookie: breeder } });
  const open = async () => {
    const res = await her('/portal/sample');
    assert.equal(res.status, 303);
    const link = res.headers.get('location');
    assert.match(link, /^https:\/\/akbostons\.kennelport\.com\/family\/view\?t=/);
    const opened = await call(env, H, link.replace(/^https:\/\/[^/]+/, ''));
    assert.equal(opened.headers.get('location'), '/family');
    return cookieOf(opened);
  };
  return { env, site, her, open };
}

// Every row of every table, to show the preview leaves no trace.
const dump = (env) => JSON.stringify(env.DB.raw.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT IN ('portal_handoffs', 'dev_outbox') ORDER BY name").all()
  .map(({ name }) => [name, env.DB.raw.prepare(`SELECT * FROM "${name}"`).all()]));

test('her button, on the Portal tab and in Portal settings, opens the preview', async () => {
  const { her } = await setup();
  for (const screen of ['/portal/setup', '/portal/settings']) {
    assert.match(await (await her(screen)).text(), /<a class="button small" href="\/s\/akbostons\/portal\/sample" target="_blank" rel="noopener">Preview your portal<\/a>/, screen);
  }
});

test('the sample family: no one added, the band, and the day she picks moves its dates', async () => {
  const { env, open } = await setup();
  const cookie = await open();
  const at = (path, more = '') => call(env, H, path, { headers: { cookie: `${cookie}${more}` } });
  const before = dump(env);
  const sent = outbox(env).length;
  const home = await (await at('/family')).text();
  assert.match(home, /A preview of your portal, with a made-up family and puppy/);
  assert.match(home, /Biscuit/);
  assert.match(home, /Showing it as on 7 days before go-home\./);
  assert.match(home, /class="btn solid" href="\/family\/sample\?d=-7&amp;back=%2Ffamily" aria-current="true">A week before/);

  // A preset: the cookie, then back to the page she was on.
  const pick = await at('/family/sample?d=1&back=/family/timeline');
  assert.equal(pick.status, 303);
  assert.equal(pick.headers.get('location'), '/family/timeline');
  assert.match(pick.headers.get('set-cookie'), /^kp_family_sample=1; Path=\/family; HttpOnly/);
  assert.equal((await at('/family/sample?d=5&back=https://evil.example/')).headers.get('location'), '/family');
  assert.match((await at('/family/sample?d=99999')).headers.get('set-cookie'), /^kp_family_sample=400;/);

  // The day after: home, the vet clock running; a month on: the record in, the Vet tab gone.
  const dayAfter = await (await at('/family', '; kp_family_sample=1')).text();
  assert.match(dayAfter, /Showing it as on 1 day after go-home\./);
  assert.match(dayAfter, /href="\/family\/vet"/);
  const month = await (await at('/family', '; kp_family_sample=30')).text();
  assert.match(month, /Showing it as on 30 days after go-home\./);
  assert.notEqual(month, dayAfter);

  // Nothing about it is stored, and no one is emailed.
  assert.equal(dump(env), before);
  assert.equal(env.DB.raw.prepare('SELECT COUNT(*) AS n FROM portal_families').get().n, 0);
  assert.equal(outbox(env).length, sent);
});

test('every page draws at every day, in every look, and a tap saves nothing', async () => {
  const { env, site, open } = await setup();
  const cookie = await open();
  const before = dump(env);
  for (const look of Object.keys(LOOKS)) {
    env.DB.raw.prepare('INSERT INTO portal_settings (site_id, look) VALUES (?, ?) ON CONFLICT (site_id) DO UPDATE SET look = excluded.look').run(site.id, look);
    const snap = dump(env);
    for (const day of [-30, -7, 0, 1, 3, 30, 200]) {
      for (const path of PAGES) {
        const res = await call(env, H, path, { headers: { cookie: `${cookie}; kp_family_sample=${day}` } });
        assert.ok([200, 303].includes(res.status), `${look} ${day} ${path}: ${res.status}`);
        if (res.status === 200) assert.match(await res.text(), /A preview of your portal/, `${look} ${day} ${path}`);
      }
    }
    assert.equal(dump(env), snap, look);
  }
  env.DB.raw.prepare('DELETE FROM portal_settings').run();
  assert.equal(dump(env), before);
  const tap = await call(env, H, '/family/messages', { method: 'POST', body: form({ body: 'Hello' }), headers: { cookie, origin: `https://${H}`, referer: `https://${H}/family/messages` } });
  assert.equal(tap.headers.get('location'), '/family/messages?viewing=nochange');
  assert.match(await (await call(env, H, '/family/messages?viewing=nochange', { headers: { cookie } })).text(), /Nothing was saved\. This is a preview\./);
  assert.equal(dump(env), before);
});

test('only for her: signed out, no link; a family session never becomes the sample', async () => {
  const { env } = await setup();
  const res = await call(env, M, '/s/akbostons/portal/sample');
  assert.notEqual(res.headers.get('location')?.startsWith('https://akbostons'), true);
  // /family/sample without her preview does nothing.
  assert.equal((await call(env, H, '/family/sample?d=1')).headers.get('set-cookie'), null);
  assert.ok(SAMPLE_FAMILY);
});

test('her checklist and timeline show, dated from the sample puppy\'s days', async () => {
  const { env, her, open } = await setup();
  assert.equal((await her('/portal/checklist/suggested', {})).status, 303);
  assert.equal((await her('/portal/timeline/suggested', {})).status, 303);
  const cookie = await open();
  const before = dump(env);
  const at = async (path, day) => (await call(env, H, path, { headers: { cookie: `${cookie}; kp_family_sample=${day}` } })).text();
  assert.match(await at('/family', -7), /id="checklist"/);
  assert.doesNotMatch(await at('/family', 30), /id="checklist"/);
  const timeline = await at('/family/timeline', 3);
  assert.doesNotMatch(timeline, /hasn&#39;t added the timeline yet/);
  // Moving the day moves the dates: a week later, a different page.
  assert.notEqual(await at('/family/timeline', 10), timeline);
  assert.equal(dump(env), before);
});

test('Stop viewing: back to her Portal tab, both cookies gone', async () => {
  const { env, open } = await setup();
  const cookie = await open();
  const stop = await call(env, H, '/family/view/exit', { method: 'POST', body: form({}), headers: { cookie: `${cookie}; kp_family_sample=3`, origin: `https://${H}` } });
  assert.equal(stop.status, 200);
  const set = stop.headers.get('set-cookie');
  assert.match(set, /kp_family_view=; .*Max-Age=0/);
  assert.match(set, /kp_family_sample=; .*Max-Age=0/);
  const body = await stop.text();
  assert.match(body, /You&#39;ve stopped the preview\./);
  assert.match(body, /href="https:\/\/manage\.kennelport\.com\/s\/akbostons\/portal\/setup"/);
});

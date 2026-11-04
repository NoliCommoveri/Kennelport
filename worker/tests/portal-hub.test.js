// The Puppy Parent Portal, build chunk 6 (docs/Puppy_Parent_Portal_Plan.md 7.3): her
// Site Manager as one app for the website and the portal, with Today, Families,
// Dogs, Website and Portal tabs, on sites with the portal on, and only there.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';

const M = 'manage.kennelport.com';
const H = 'akbostons.kennelport.com';
const form = (o) => new URLSearchParams(o);
const outbox = (env) => env.DB.raw.prepare('SELECT kind, subject, body FROM dev_outbox ORDER BY id').all();
const ymd = (d) => d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
const DAY = 86400000;

async function setup({ on = true } = {}) {
  const env = await makeEnv({ PORTAL_EMAIL_KEY: 'portal-test-key' });
  const site = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  const ops = (await call(env, M, '/ops/login', { method: 'POST', body: form({ token: 'ops-token' }) })).headers.get('set-cookie').split(';')[0];
  await call(env, M, `/ops/sites/${site.id}/people`, { method: 'POST', headers: { cookie: ops }, body: form({ email: 'breeder@example.com', role: 'owner' }) });
  await call(env, M, '/signin', { method: 'POST', body: form({ email: 'breeder@example.com' }), headers: { origin: `https://${M}` } });
  const code = outbox(env).at(-1).subject.match(/(\d{6})/)[1];
  const cookie = (await call(env, M, '/signin/verify', { method: 'POST', body: form({ email: 'breeder@example.com', code }), headers: { origin: `https://${M}` } })).headers.get('set-cookie').split(';')[0];
  if (on) await call(env, M, `/ops/sites/${site.id}/portal/on`, { method: 'POST', headers: { cookie: ops } });
  const t = new Date().toISOString();
  env.DB.raw.prepare("INSERT INTO litters (id, site_id, slug, name, stage, born_on, created_at, updated_at) VALUES ('lit1', ?, 'winter', 'Winter litter', 'current', ?, ?, ?)").run(site.id, ymd(new Date(Date.now() - 58 * DAY)), t, t);
  for (const [id, name, status] of [['pup1', 'Opal', 'reserved'], ['pup2', 'Ruby', 'available']]) {
    env.DB.raw.prepare("INSERT INTO puppies (id, site_id, litter_id, slug, name, sex, status, created_at, updated_at) VALUES (?, ?, 'lit1', ?, ?, 'female', ?, ?, ?)").run(id, site.id, id, name, status, t, t);
  }
  const her = (path, body) => call(env, M, `/s/akbostons${path}`, body ? { method: 'POST', body: form(body), headers: { cookie, origin: `https://${M}` } } : { headers: { cookie } });
  return { env, site, her };
}

test('without the portal, the Site Manager keeps its one home screen and no tabs', async () => {
  const { her } = await setup({ on: false });
  const home = await (await her('')).text();
  assert.doesNotMatch(home, /class="apptabs"/);
  assert.match(home, /View my site/);
  assert.equal((await her('/kennel')).status, 404);
  assert.equal((await her('/website')).status, 404);
});

test('with the portal: five tabs; Today holds what needs her, Website holds the website', async () => {
  const { her } = await setup();
  const today = await (await her('')).text();
  for (const [path, label] of [['', 'Today'], ['/portal', 'Families'], ['/kennel', 'Dogs'], ['/website', 'Website'], ['/portal/setup', 'Portal']]) {
    assert.match(today, new RegExp(`<a href="/s/akbostons${path.replace(/\//g, '\\/')}"[^>]*><svg[^>]*>.*?</svg><span>${label}</span>`));
  }
  assert.match(today, /<a href="\/s\/akbostons" aria-current="page">/);
  assert.match(today, /Nothing needs you right now/);
  assert.doesNotMatch(today, /View my site/);
  const website = await (await her('/website')).text();
  assert.match(website, /View my site/);
  assert.match(website, /Pages and wording/);
  assert.match(website, /<a href="\/s\/akbostons\/website" aria-current="page">/);
  assert.doesNotMatch(website, /Puppy families/);
  const setup2 = await (await her('/portal/setup')).text();
  assert.match(setup2, /Go-home checklist/);
  assert.match(setup2, /First-weeks timeline/);
  assert.match(setup2, /Portal settings/);
  // Sub-screens keep their Back button and have no tabs.
  assert.doesNotMatch(await (await her('/portal/settings')).text(), /class="apptabs"/);
});

test('Today: going home this week, with Mark picked up on the day; Families: vet visits, activity, the waitlist', async () => {
  const { env, her } = await setup();
  const id = (await her('/portal/new', { name: 'The Reed family', emails: 'sam@example.com', puppy_id: 'pup1', go_home_on: ymd(new Date()) })).headers.get('location').match(/\/f\/([0-9a-f-]{36})/)[1];
  await her('/portal/new', { name: 'The Diaz family', emails: 'lee@example.com', puppy_id: 'pup2', go_home_on: ymd(new Date(Date.now() + 20 * DAY)) });
  let today = await (await her('')).text();
  assert.match(today, /Going home this week/);
  assert.match(today, /Opal · The Reed family/);
  assert.doesNotMatch(today, /Ruby · The Diaz family/);
  assert.match(today, new RegExp(`action="/s/akbostons/portal/f/${id}/picked-up"><button class="primary">Mark picked up`));
  assert.equal((await her(`/portal/f/${id}/picked-up`, {})).status, 303);
  today = await (await her('')).text();
  assert.doesNotMatch(today, /Opal · The Reed family/);

  // The family books the vet: Activity shows it on Families.
  await call(env, H, '/family/signin', { method: 'POST', body: form({ email: 'sam@example.com' }), headers: { origin: `https://${H}` } });
  const code = outbox(env).at(-1).subject.match(/(\d{6})/)[1];
  const fc = (await call(env, H, '/family/signin/verify', { method: 'POST', body: form({ email: 'sam@example.com', code }), headers: { origin: `https://${H}` } })).headers.get('set-cookie').split(';')[0];
  await call(env, H, '/family/vet/booked', { method: 'POST', body: form({ day: ymd(new Date(Date.now() + DAY)), time: '10:00' }), headers: { cookie: fc, origin: `https://${H}` } });
  const families = await (await her('/portal')).text();
  assert.match(families, /<a href="\/s\/akbostons\/portal" aria-current="page">/);
  assert.match(families, /Vet visits/);
  assert.match(families, /Booked<\/span> · 2 days/);
  assert.match(families, /Not booked/);
  assert.match(families, /The Reed family<\/a> booked the vet visit/);
  assert.match(families, /<h2>Waitlist<\/h2>/);
});

test('Dogs: each puppy with its website status, family, go-home and extras, and the stay update to write', async () => {
  const { env, site, her } = await setup();
  env.DB.raw.prepare("INSERT INTO extras (id, site_id, kind, name, weeks, checklist, sort, portal_delivery) VALUES ('x12', ?, 'homegoing', '12-Week Package', 12, '[\"Crate\"]', 1, 'stay')").run(site.id);
  const id = (await her('/portal/new', { name: 'The Reed family', emails: 'sam@example.com', puppy_id: 'pup1' })).headers.get('location').match(/\/f\/([0-9a-f-]{36})/)[1];
  await her(`/portal/f/${id}/extra`, { extra_id: 'x12' });
  const dogs = await (await her('/kennel')).text();
  assert.match(dogs, /<a href="\/s\/akbostons\/kennel" aria-current="page">/);
  assert.match(dogs, /Winter litter/);
  assert.match(dogs, /<b>Opal<\/b><span>Reserved · The Reed family · going home [^<]+ · 12-Week Package<\/span>/);
  assert.match(dogs, /<b>Ruby<\/b><span>Available<\/span>/);
  assert.match(dogs, new RegExp(`href="/s/akbostons/portal/f/${id}#stay">Write this week&#39;s update|href="/s/akbostons/portal/f/${id}#stay">Write this week's update`));
});

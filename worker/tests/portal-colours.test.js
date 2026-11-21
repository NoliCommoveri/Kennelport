// The family portal's card colours (the owner, 2026-11-21): three, paper, green and sand,
// each card fixed to one, and no two of the same colour one directly above the other, on
// every tab and at every stage. The mint, the deep green food band and the green tile are
// all green; the sand band, sand cards and the warm tile are all sand.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';

const M = 'manage.kennelport.com';
const H = 'akbostons.kennelport.com';
const form = (o) => new URLSearchParams(o);
const outbox = (env) => env.DB.raw.prepare('SELECT kind, subject, body FROM dev_outbox ORDER BY id').all();
const DAY = 86400000;
const ymd = (d) => d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

async function setup({ full }) {
  const env = await makeEnv({ PORTAL_EMAIL_KEY: 'portal-test-key' });
  const site = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers', contact_phone: '423-555-0100' });
  const ops = (await call(env, M, '/ops/login', { method: 'POST', body: form({ token: 'ops-token' }) })).headers.get('set-cookie').split(';')[0];
  await call(env, M, `/ops/sites/${site.id}/people`, { method: 'POST', headers: { cookie: ops }, body: form({ email: 'breeder@example.com', role: 'owner' }) });
  await call(env, M, '/signin', { method: 'POST', body: form({ email: 'breeder@example.com' }), headers: { origin: `https://${M}` } });
  const code = outbox(env).at(-1).subject.match(/(\d{6})/)[1];
  const breeder = (await call(env, M, '/signin/verify', { method: 'POST', body: form({ email: 'breeder@example.com', code }), headers: { origin: `https://${M}` } })).headers.get('set-cookie').split(';')[0];
  await call(env, M, `/ops/sites/${site.id}/portal/on`, { method: 'POST', headers: { cookie: ops } });
  const t = new Date().toISOString();
  env.DB.raw.prepare("INSERT INTO litters (id, site_id, slug, name, stage, born_on, created_at, updated_at) VALUES ('lit1', ?, 'winter', 'Winter litter', 'current', ?, ?, ?)").run(site.id, ymd(new Date(Date.now() - 50 * DAY)), t, t);
  for (const id of ['pup1', 'pup2', 'pup3', 'pup4']) {
    env.DB.raw.prepare("INSERT INTO puppies (id, site_id, litter_id, slug, name, sex, created_at, updated_at) VALUES (?, ?, 'lit1', ?, ?, 'male', ?, ?)").run(id, site.id, id, `Pup ${id}`, t, t);
  }
  env.DB.raw.prepare("INSERT INTO products (id, site_id, name, link_url, sort) VALUES ('ins', ?, 'Puppy insurance', 'https://insure.example/akb', 1)").run(site.id);
  env.DB.raw.prepare("INSERT INTO products (id, site_id, name, link_url, sort) VALUES ('train', ?, 'Training course', 'https://train.example/akb', 2)").run(site.id);
  env.DB.raw.prepare("INSERT INTO products (id, site_id, name, link_url, sort) VALUES ('vitamins', ?, 'Vitamins', 'https://vit.example/akb', 3)").run(site.id);
  const her = (path, body) => call(env, M, `/s/akbostons${path}`, body ? { method: 'POST', body: form(body), headers: { cookie: breeder, origin: `https://${M}` } } : { headers: { cookie: breeder } });
  const saved = await her('/portal/settings', {
    vet_rule: 'hours72', time_zone: 'America/New_York', help_weeks: '8', food_name: 'TLC Dog Food',
    vet_clinic: 'Parkway Animal Clinic', vet_phone: '706-555-0180', 'type.ins': 'insurance',
  });
  assert.equal(saved.status, 303, await saved.text());
  // Her lists and a handbook chapter, or none of them.
  if (full) {
    await her('/portal/checklist/suggested', {});
    await her('/portal/timeline/suggested', {});
    await her('/portal/handbook/new', { title: 'The first night', body: 'A quiet room.', shown: '1' });
  }
  return { env, her };
}

async function familyAt(env, her, email, values) {
  const res = await her('/portal/new', { name: email, emails: email, ...values });
  assert.equal(res.status, 303, await res.text());
  await call(env, H, '/family/signin', { method: 'POST', body: form({ email }), headers: { origin: `https://${H}` } });
  const code = outbox(env).at(-1).subject.match(/(\d{6})/)[1];
  const cookie = (await call(env, H, '/family/signin/verify', { method: 'POST', body: form({ email, code }), headers: { origin: `https://${H}` } })).headers.get('set-cookie').split(';')[0];
  return { id: res.headers.get('location').match(/\/f\/([0-9a-f-]{36})/)[1], get: async (path) => (await call(env, H, path, { headers: { cookie } })).text() };
}

// The colour of each top-level piece of <main>, top to bottom. Pieces with no colour of
// their own that sit between cards (a line of text, the disclosure) are passed over;
// the photo, the tile grid and Read next break the run.
const VOID = new Set(['img', 'input', 'br', 'hr', 'meta', 'link', 'source']);
function colours(html) {
  const main = html.slice(html.indexOf('<main>') + 6, html.lastIndexOf('</main>'));
  const out = [];
  let depth = 0;
  for (const m of main.matchAll(/<(\/?)([a-z0-9]+)([^>]*)>/gi)) {
    const [, close, tag, attrs] = m;
    if (close) { depth--; continue; }
    if (VOID.has(tag.toLowerCase()) || attrs.endsWith('/')) continue;
    if (depth++ !== 0) continue;
    const cls = ` ${(attrs.match(/class="([^"]*)"/) ?? [, ''])[1]} `;
    const has = (c) => cls.includes(` ${c} `);
    const id = (attrs.match(/id="([^"]*)"/) ?? [, ''])[1];
    let c = null;
    if (has('hero') || has('bento') || has('readnext')) c = '|';
    else if (has('c-green') || has('mint') || has('deep') || (has('tile') && has('green'))) c = 'green';
    else if (has('c-sand') || has('sand') || has('band') || has('warm')) c = 'sand';
    else if (has('c-paper') || has('paper') || has('card') || has('tile')) c = 'paper';
    if (c) out.push([c, id || cls.trim()]);
  }
  return out;
}

function noTwoAlike(html, where) {
  const list = colours(html);
  assert.ok(list.length > 1, `${where}: found its cards`);
  for (let i = 1; i < list.length; i++) {
    const [a, b] = [list[i - 1], list[i]];
    assert.ok(a[0] === '|' || a[0] !== b[0], `${where}: "${a[1]}" and "${b[1]}" below it are both ${b[0]}`);
  }
  return list;
}

async function stages({ full }) {
  const { env, her } = await setup({ full });
  const soon = await familyAt(env, her, 'soon@example.com', { puppy_id: 'pup1', go_home_on: ymd(new Date(Date.now() + 6 * DAY)) });
  const far = await familyAt(env, her, 'far@example.com', { puppy_id: 'pup2', go_home_on: ymd(new Date(Date.now() + 30 * DAY)) });
  const vet = await familyAt(env, her, 'vet@example.com', { puppy_id: 'pup3', go_home_on: ymd(new Date()) });
  const after = await familyAt(env, her, 'after@example.com', { puppy_id: 'pup4', go_home_on: ymd(new Date(Date.now() - 20 * DAY)) });
  for (const f of [vet, after]) assert.equal((await her(`/portal/f/${f.id}/picked-up`, {})).status, 303);
  env.DB.raw.prepare('UPDATE portal_placements SET picked_up_at = ?, vet_deadline_at = ? WHERE family_id = ?')
    .run(new Date(Date.now() - 20 * DAY).toISOString(), new Date(Date.now() - 17 * DAY).toISOString(), after.id);
  return [['two weeks out', soon], ['a month out', far], ['in the vet visit', vet], ['home a while', after]];
}

for (const full of [true, false]) {
  test(`no two cards of one colour one above the other, every tab, every stage (${full ? 'her lists and handbook' : 'none yet'})`, async () => {
    for (const [who, fam] of await stages({ full })) {
      for (const path of ['/family', '/family/timeline', '/family/vet', '/family/records']) noTwoAlike(await fam.get(path), `${who}, ${path}`);
    }
  });
}

test('the food and insurance band sits above the contacts', async () => {
  const [, , , [, after]] = await stages({ full: true });
  const home = colours(await after.get('/family')).map(([, id]) => id);
  assert.ok(home.indexOf('contacts') > home.findIndex((x) => /food/.test(x)), home.join(', '));
});

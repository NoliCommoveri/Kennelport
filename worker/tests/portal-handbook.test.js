// The puppy handbook (docs/plans/family-portal.md phase 2): her chapters on the Portal
// tab, families' Handbook page with search and program links, Home's Read next and
// quick link, and nothing at all for families while there's no chapter to read.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';

const M = 'manage.kennelport.com';
const H = 'akbostons.kennelport.com';
const form = (o) => new URLSearchParams(o);
const outbox = (env) => env.DB.raw.prepare('SELECT kind, subject, body FROM dev_outbox ORDER BY id').all();
const ymd = (d) => d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
const DAY = 86400000;

const { bodyHtml, brokenLinks, searchChapters } = await import('../src/portal/handbook.js');

async function setup() {
  const env = await makeEnv({ PORTAL_EMAIL_KEY: 'portal-test-key' });
  const site = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  const ops = (await call(env, M, '/ops/login', { method: 'POST', body: form({ token: 'ops-token' }) })).headers.get('set-cookie').split(';')[0];
  await call(env, M, `/ops/sites/${site.id}/people`, { method: 'POST', headers: { cookie: ops }, body: form({ email: 'breeder@example.com', role: 'owner' }) });
  await call(env, M, '/signin', { method: 'POST', body: form({ email: 'breeder@example.com' }), headers: { origin: `https://${M}` } });
  const code = outbox(env).at(-1).subject.match(/(\d{6})/)[1];
  const res = await call(env, M, '/signin/verify', { method: 'POST', body: form({ email: 'breeder@example.com', code }), headers: { origin: `https://${M}` } });
  const breeder = res.headers.get('set-cookie').split(';')[0];
  await call(env, M, `/ops/sites/${site.id}/portal/on`, { method: 'POST', headers: { cookie: ops } });
  const t = new Date().toISOString();
  const born = ymd(new Date(Date.now() - 50 * DAY));
  env.DB.raw.prepare("INSERT INTO litters (id, site_id, slug, name, stage, born_on, created_at, updated_at) VALUES ('lit1', ?, 'winter', 'Winter litter', 'current', ?, ?, ?)").run(site.id, born, t, t);
  for (const [id, name] of [['pup1', 'Opal'], ['pup2', 'Ruby']]) {
    env.DB.raw.prepare("INSERT INTO puppies (id, site_id, litter_id, slug, name, sex, created_at, updated_at) VALUES (?, ?, 'lit1', ?, ?, 'female', ?, ?)").run(id, site.id, id, name, t, t);
  }
  env.DB.raw.prepare("INSERT INTO products (id, site_id, name, link_url, code, sort) VALUES ('ins', ?, 'Puppy insurance', 'https://insure.example/akb', 'AKB30', 1)").run(site.id);
  env.DB.raw.prepare("INSERT INTO products (id, site_id, name, link_url, sort) VALUES ('food', ?, 'Puppy food program', 'https://food.example/akb', 2)").run(site.id);
  env.DB.raw.prepare("INSERT INTO products (id, site_id, name, link_url, sort) VALUES ('crate', ?, 'Crate and bedding', 'https://crate.example/x', 3)").run(site.id);
  const her = (path, body) => call(env, M, `/s/akbostons${path}`, body ? { method: 'POST', body: form(body), headers: { cookie: breeder, origin: `https://${M}` } } : { headers: { cookie: breeder } });
  const fam = (cookie) => (path, body) => call(env, H, path, body ? { method: 'POST', body: form(body), headers: { cookie, origin: `https://${H}` } } : { headers: { cookie } });
  // Programs shown, insurance with its own code per family; the food.
  const saved = await her('/portal/settings', {
    vet_rule: 'hours72', time_zone: 'America/New_York', help_weeks: '8',
    'type.ins': 'insurance', 'action.ins': 'Activate the free trial within 5 days of pickup', 'own.ins': '1',
    'type.food': 'food', 'type.crate': 'product',
    food_name: 'Small-breed puppy formula, chicken and rice', food_bag: '4 lb bag', food_how: '⅓ cup, three times a day',
  });
  assert.equal(saved.status, 303, await saved.text());
  return { env, site, her, fam, born };
}

async function addFamily(her, values) {
  const res = await her('/portal/new', values);
  assert.equal(res.status, 303, await res.text());
  return res.headers.get('location').match(/\/f\/([0-9a-f-]{36})/)[1];
}

async function familySignIn(env, email) {
  await call(env, H, '/family/signin', { method: 'POST', body: form({ email }), headers: { origin: `https://${H}` } });
  const code = outbox(env).at(-1).subject.match(/(\d{6})/)[1];
  const res = await call(env, H, '/family/signin/verify', { method: 'POST', body: form({ email, code }), headers: { origin: `https://${H}` } });
  return res.headers.get('set-cookie').split(';')[0];
}


const programs = [{ id: 'ins', name: 'Puppy insurance', link_url: 'https://insure.example/akb', link_label: 'Activate the trial' }, { id: 'food', name: 'Puppy food program', link_url: 'https://food.example/akb' }];
const link = (x, words, inline) => `<${inline ? 'i' : 'b'}:${x.id}>${words}</>`;

test('a chapter\'s words: paragraphs, lists, {name}, program links on their own line or inside a sentence, unknown links dropped', () => {
  const body = 'First night for {name}.\nA line break.\n\n- crate\n- towel\n\n[link: puppy insurance]\n\nOrder through [link: Puppy food program | the food program] today. [link: Nope]\n\n[link: Nope]\n\n<b>tags</b>';
  const html = bodyHtml(body, programs, { name: 'Opal', kennel: 'AK' }, link);
  assert.equal(html, '<p>First night for Opal.<br>A line break.</p><ul><li>crate</li><li>towel</li></ul><p><b:ins>Activate the trial</></p><p>Order through <i:food>the food program</> today.</p><p>&lt;b&gt;tags&lt;/b&gt;</p>');
  assert.deepEqual(brokenLinks(body, programs), ['Nope']);
  const ch = [{ title: 'Feeding', body: 'Order through [link: Puppy food program]' }, { title: 'The first night', body: 'Crate by the bed.' }];
  assert.deepEqual(searchChapters(ch, 'food program').map((c) => c.title), ['Feeding']);
  assert.deepEqual(searchChapters(ch, 'CRATE').map((c) => c.title), ['The first night']);
  assert.equal(searchChapters(ch, '  ').length, 2);
});

test('her handbook: add, edit, order, off, remove after asking; families see it only once a chapter is on with words', async () => {
  const { env, her, fam } = await setup();
  await addFamily(her, { name: 'The Reed family', emails: 'sam@example.com', puppy_id: 'pup1', go_home_on: ymd(new Date(Date.now() + 6 * DAY)) });
  const r = fam(await familySignIn(env, 'sam@example.com'));

  // Nothing yet: no quick link, no Read next, and the page itself goes Home.
  let home = await (await r('/family')).text();
  assert.doesNotMatch(home, /Handbook|Read next/);
  assert.match(home, /href="\/family\/account"/);
  assert.equal((await r('/family/handbook')).headers.get('location'), '/family');

  const tab = await (await her('/portal/setup')).text();
  assert.match(tab, /portal\/handbook"><b>Puppy handbook/);
  let screen = await (await her('/portal/handbook')).text();
  assert.match(screen, /No chapters yet/);
  assert.match(screen, /<option value="ins">Puppy insurance<\/option>/);

  // A title alone isn't shown; an empty title is refused.
  assert.equal((await her('/portal/handbook/new', { title: '  ', body: 'x' })).status, 400);
  let res = await her('/portal/handbook/new', { title: 'The first night', body: '', shown: '1' });
  assert.equal(res.status, 303);
  const first = env.DB.raw.prepare("SELECT id FROM portal_chapters WHERE title = 'The first night'").get().id;
  screen = await (await her('/portal/handbook')).text();
  assert.match(screen, /No words yet: families don/);
  assert.match(screen, /Families see 0 of 1/);
  assert.equal((await r('/family/handbook')).headers.get('location'), '/family');

  // Words, and a second chapter with its program's button added from the menu.
  await her(`/portal/handbook/${first}`, { title: 'The first night', body: 'Put the crate beside your bed, {name} will settle.', shown: '1' });
  await her('/portal/handbook/new', { title: 'Feeding', body: 'Keep the same food for two weeks.\n\n[link: Kibble club]', link: 'food', shown: '1' });
  const feeding = env.DB.raw.prepare("SELECT id, body FROM portal_chapters WHERE title = 'Feeding'").get();
  assert.equal(feeding.body, 'Keep the same food for two weeks.\n\n[link: Kibble club]\n\n[link: Puppy food program]');
  screen = await (await her('/portal/handbook')).text();
  assert.match(screen, /Links: Puppy food program/);
  assert.match(screen, /Families see no link for \[link: Kibble club\]/);

  home = await (await r('/family')).text();
  assert.match(home, /href="\/family\/handbook"><span class="ico">.*Handbook<\/a>/);
  assert.doesNotMatch(home, /href="\/family\/account"><span class="ico">/);
  assert.match(home, /<h2>Read next<\/h2>/);
  assert.ok(home.indexOf('The first night') < home.indexOf('Feeding'));
  let page = await (await r('/family/handbook')).text();
  assert.match(page, /<details class="ch" id="ch-[^"]+" open><summary>The first night<\/summary><div class="body"><p>Put the crate beside your bed, Opal will settle.<\/p>/);
  assert.match(page, /href="\/family\/go\/food\?from=handbook">Puppy food program/);
  assert.doesNotMatch(page, /Kibble club/);
  assert.match(page, /class="disclose"/);

  // Search, and the chapter Read next opens.
  page = await (await r('/family/handbook?q=food')).text();
  assert.doesNotMatch(page, /The first night/);
  assert.match(page, /Feeding<\/summary>/);
  page = await (await r(`/family/handbook?open=${feeding.id}`)).text();
  assert.match(page, new RegExp(`id="ch-${feeding.id}" open>`));
  assert.doesNotMatch(page, new RegExp(`id="ch-${first}" open>`));
  page = await (await r('/family/handbook?q=heat')).text();
  assert.match(page, /Nothing matches/);

  // The click is counted with where it came from.
  res = await r('/family/go/food?from=handbook');
  assert.equal(res.headers.get('location'), 'https://food.example/akb');
  assert.equal(env.DB.raw.prepare("SELECT place FROM portal_clicks WHERE product_id = 'food'").get().place, 'handbook');

  // Order, and off.
  await her(`/portal/handbook/${feeding.id}/up`, {});
  page = await (await r('/family/handbook')).text();
  assert.ok(page.indexOf('Feeding') < page.indexOf('The first night'));
  await her(`/portal/handbook/${feeding.id}`, { title: 'Feeding', body: feeding.body });
  page = await (await r('/family/handbook')).text();
  assert.doesNotMatch(page, /Feeding/);
  assert.doesNotMatch(page, /class="disclose"/);

  // Remove asks first, then removes; with none left, families see nothing again.
  assert.match(await (await her(`/portal/handbook/${first}/remove`)).text(), /Remove &quot;The first night&quot;\?|Remove "The first night"\?/);
  await her(`/portal/handbook/${first}/remove`, {});
  assert.equal(env.DB.raw.prepare('SELECT COUNT(*) AS n FROM portal_chapters WHERE id = ?').get(first).n, 0);
  home = await (await r('/family')).text();
  assert.doesNotMatch(home, /Handbook|Read next/);
});

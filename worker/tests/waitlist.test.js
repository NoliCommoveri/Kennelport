// The simple waitlist (plan 3.8): kept by hand in the manage app for breeders
// without KennelOS. Added from an application or typed in, offered pups from her
// own email, marked fulfilled (everyone below moves up), shown on the site live as
// first name and last initial, and not shown while a KennelOS feed is set.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';

const { importContent } = await import('../src/content/io.js');
const { AK_SAMPLE } = await import('../src/content/akSample.js');
const { inviteToSite } = await import('../src/auth.js');
const { forgetSnapshots } = await import('../src/publish.js');
const { listNameFor, suggestWants, offerMailto, OFFER_MESSAGE } = await import('../src/waitlist.js');
const { runCleanup } = await import('../src/cleanup.js');

const M = 'manage.kennelport.com';
const SITE = 'akbostons.kennelport.com';

async function breeder(extraEnv = {}) {
  forgetSnapshots();
  const env = await makeEnv(extraEnv);
  const site = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  await importContent(env, site.id, AK_SAMPLE);
  await inviteToSite(env, site.id, 'b@example.com', 'owner', { manageUrl: 'x', siteUrl: 'y' });
  const headers = { origin: `https://${M}` };
  await call(env, M, '/signin', { method: 'POST', headers, body: new URLSearchParams({ email: 'b@example.com' }) });
  const code = env.DB.raw.prepare("SELECT subject FROM dev_outbox WHERE kind = 'code' ORDER BY id DESC").get().subject.match(/\d{6}/)[0];
  const res = await call(env, M, '/signin/verify', { method: 'POST', headers, body: new URLSearchParams({ email: 'b@example.com', code }) });
  const cookie = res.headers.get('set-cookie').split(';')[0];
  const get = (p) => call(env, M, `/s/akbostons${p}`, { headers: { cookie } });
  const post = (p, body = {}) => call(env, M, `/s/akbostons${p}`, { method: 'POST', headers: { cookie, origin: `https://${M}` }, body: new URLSearchParams(body) });
  await post('/publish');
  const entries = () => env.DB.raw.prepare("SELECT * FROM waitlist_entries WHERE status = 'waiting' ORDER BY sort").all();
  return { env, site, get, post, entries, waitlist: async () => (await call(env, SITE, '/waitlist')).text() };
}

test('names on the list and a starting "wants" line', () => {
  assert.equal(listNameFor('Megan Ross'), 'Megan R.');
  assert.equal(listNameFor('  ann   de la cruz '), 'ann C.');
  assert.equal(listNameFor('Cher'), 'Cher');
  assert.equal(suggestWants([['Preferred sex', 'Female'], ['Color', 'Any color'], ['Timing', 'Spring 2027'], ['Fenced?', 'Yes'], ['About', 'A long answer\nwith lines']]), 'Female · Spring 2027');
  assert.equal(suggestWants([['Preferred sex', 'Either']]), '');
});

test('from an application in the Inbox to the list on the site, shown as first name and initial', async () => {
  const b = await breeder();
  const qs = b.env.DB.raw.prepare('SELECT id, label FROM form_fields ORDER BY sort').all();
  const q = (label) => `q.${qs.find((x) => x.label === label).id}`;
  const sent = await call(b.env, SITE, '/waitlist', { method: 'POST', headers: { origin: `https://${SITE}`, 'cf-connecting-ip': '198.51.100.9' }, body: new URLSearchParams({ name: 'Megan Ross', email: 'megan@example.com', [q('Preferred sex')]: 'Female', [q('Color')]: 'Black & white' }) });
  assert.equal(sent.status, 200);
  const msg = b.env.DB.raw.prepare('SELECT id FROM inquiries').get();
  const one = await (await b.get(`/inbox/${msg.id}`)).text();
  assert.match(one, new RegExp(`href="/s/akbostons/waitlist/new\\?from=${msg.id}">Add to waitlist`));
  const form = await (await b.get(`/waitlist/new?from=${msg.id}`)).text();
  assert.match(form, /name="name" value="Megan Ross"/);
  assert.match(form, /name="list_name" value="Megan R\."/);
  assert.match(form, /name="wants" value="Female · Black &amp; white"/);
  assert.match(form, new RegExp(`name="inquiry_id" value="${msg.id}"`));
  assert.equal((await b.post('/waitlist/new', { inquiry_id: msg.id, name: 'Megan Ross', list_name: '', email: 'megan@example.com', wants: 'Female · Black & white' })).status, 303);
  assert.match(await (await b.get(`/inbox/${msg.id}`)).text(), /On your waitlist\./);
  assert.match(await (await b.get('')).text(), /Your waitlist<\/b><span>1 family waiting/);

  const html = await b.waitlist();
  assert.match(html, /<td class="num">#1<\/td><td>Megan R\.<\/td>\s*<td>Female · Black &amp; white<\/td>/, 'live, no publish');
  assert.doesNotMatch(html, /Ross|megan@example\.com/, 'never the full name or email');
  assert.ok(html.indexOf('id="the-list"') < html.indexOf('id="apply"'), 'the list, then the form');
  assert.match(html, /it shows your first name and last initial/, 'the form says so');
  assert.doesNotMatch(html, /KennelOS/);
});

test('fulfilled moves everyone up; put back returns them to their place; order can change', async () => {
  const b = await breeder();
  for (const name of ['Ann Lee', 'Bo Park', 'Cy Diaz']) await b.post('/waitlist/new', { name, email: `${name[0]}@example.com` });
  const [ann, bo] = b.entries();
  assert.equal((await b.post(`/waitlist/${ann.id}/fulfil`)).status, 303);
  let html = await b.waitlist();
  assert.match(html, /#1<\/td><td>Bo P\./);
  assert.match(html, /#2<\/td><td>Cy D\./);
  assert.doesNotMatch(html, /Ann L\./);
  assert.doesNotMatch(html, /may not be displayed above/, 'no gaps: places close up');
  const screen = await (await b.get('/waitlist')).text();
  assert.match(screen, /Fulfilled \(1\)/);

  await b.post(`/waitlist/${ann.id}/back`);
  assert.deepEqual(b.entries().map((e) => e.name), ['Ann Lee', 'Bo Park', 'Cy Diaz']);
  await b.post(`/waitlist/${bo.id}/up`);
  assert.deepEqual(b.entries().map((e) => e.name), ['Bo Park', 'Ann Lee', 'Cy Diaz']);
  await b.post(`/waitlist/${bo.id}/down`);
  await b.post(`/waitlist/${bo.id}/down`);
  assert.deepEqual(b.entries().map((e) => e.name), ['Ann Lee', 'Cy Diaz', 'Bo Park']);

  // Edit: the name on the list and what they want; delete.
  await b.post(`/waitlist/${bo.id}`, { name: 'Bo Park', list_name: 'The Park family', email: 'b@example.com', wants: 'Male', added_on: '2026-01-02' });
  html = await b.waitlist();
  assert.match(html, /#3<\/td><td>The Park family<\/td>\s*<td>Male<\/td><td class="tip"><button type="button" class="added-tip" aria-label="Added January 2, 2026"/);
  await b.post(`/waitlist/${bo.id}/remove`);
  assert.equal(b.entries().length, 2);
  const bad = await b.post('/waitlist/new', { name: '', email: 'x' });
  assert.equal(bad.status, 200);
  assert.match(await bad.text(), /Please fill in their name/);
});

test('Offer pups opens her own email, filled in with her wording or the default', async () => {
  const b = await breeder();
  await b.post('/waitlist/new', { name: 'Megan Ross', email: 'megan@example.com' });
  const screen = await (await b.get('/waitlist')).text();
  const href = screen.match(/href="(mailto:[^"]+)">Offer pups/)[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'");
  const u = new URL(href);
  assert.equal(decodeURIComponent(u.pathname), 'megan@example.com');
  assert.equal(u.searchParams.get('subject'), "It's your turn to choose a puppy");
  const body = u.searchParams.get('body');
  assert.match(body, /^Hi Megan,\n\nIt's your turn to choose a pup! Please review the available puppies on our website and reach out to us with your selection\./);
  assert.match(body, /akbostons\.kennelport\.com\/litters/);
  assert.match(body, /AK Boston Terriers$/);
  assert.match(offerMailto({ name: 'Ann', email: 'a@x.co' }, { message: 'Pick time!' }), /body=Hi%20Ann%2C%0A%0APick%20time!/);
  assert.ok(OFFER_MESSAGE.startsWith("It's your turn"));
  await b.post('/waitlist/new', { name: 'No Email' });
  assert.match(await (await b.get('/waitlist')).text(), /No email: add one to offer pups\./);
});

test('with a KennelOS feed, the simple list is not shown; fulfilled ones go after 90 days; closing deletes all', async () => {
  const b = await breeder({ KENNELOS_ORIGIN: 'https://kos.example', KENNELOS_FETCH: async () => Response.json({ error: 'not_shared' }, { status: 404 }) });
  await b.post('/waitlist/new', { name: 'Megan Ross', email: 'megan@example.com' });
  assert.match(await b.waitlist(), /Megan R\./);
  await b.post('/pages/waitlist/kennelos', { feed: 'kos1_11111111-2222-4333-8444-555555555555' });
  assert.doesNotMatch(await b.waitlist(), /Megan R\./);
  assert.match(await (await b.get('/waitlist')).text(), /shows your KennelOS waitlist, so this list isn(&#39;|')t shown/);

  const m = await (await b.get('/export.json')).json();
  assert.equal(m.waitlist[0].name, 'Megan Ross');
  assert.match(m.readme, /waitlist\.json/);
  const [e] = b.entries();
  await b.post(`/waitlist/${e.id}/fulfil`);
  await runCleanup(b.env, new Date(Date.now() + 89 * 86400000));
  assert.equal(b.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM waitlist_entries').get().n, 1);
  await runCleanup(b.env, new Date(Date.now() + 91 * 86400000));
  assert.equal(b.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM waitlist_entries').get().n, 0);

  b.env.DB.raw.prepare("INSERT INTO waitlist_entries (id, site_id, name, list_name, added_on, status, sort, created_at) VALUES ('x', ?, 'Ann Lee', 'Ann L.', '2026-11-02', 'waiting', 1, '2026-11-02')").run(b.site.id);
  const { closeSite } = await import('../src/sites.js');
  await closeSite(b.env, b.site.id, 'akbostons');
  assert.equal(b.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM waitlist_entries').get().n, 0);
});

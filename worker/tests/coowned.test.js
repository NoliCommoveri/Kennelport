// Co-owned dogs (docs/Co_Owned_Dogs_Plan.md): partner kennels, the Dogs page's
// Co-owned section, "Co-owned with" on a dog's page, KennelOS's partner_kennels
// section, the Site Manager's screens, and the import document.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';
import { webp } from './helpers/images.js';

const { importContent, exportContent } = await import('../src/content/io.js');
const { AK_SAMPLE } = await import('../src/content/akSample.js');
const { inviteToSite } = await import('../src/auth.js');
const { forgetSnapshots } = await import('../src/publish.js');
const { saveRecord, getRecord, coOwnedRules, KINDS } = await import('../src/content/records.js');
const { savePhoto } = await import('../src/photos.js');

const M = 'manage.kennelport.com';
const API = 'api.kennelport.com';
const SITE = 'akbostons.kennelport.com';
const APP = 'https://pro.kennelos.app';
const KENNEL = 'kennel-1';

async function signIn(env, email) {
  const headers = { origin: `https://${M}` };
  await call(env, M, '/signin', { method: 'POST', headers, body: new URLSearchParams({ email }) });
  const code = env.DB.raw.prepare("SELECT subject FROM dev_outbox WHERE kind = 'code' ORDER BY id DESC").get().subject.match(/\d{6}/)[0];
  const res = await call(env, M, '/signin/verify', { method: 'POST', headers, body: new URLSearchParams({ email, code }) });
  return res.headers.get('set-cookie').split(';')[0];
}

async function breeder() {
  forgetSnapshots();
  const env = await makeEnv({ KENNELOS_APP_ORIGINS: APP });
  const site = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  await importContent(env, site.id, AK_SAMPLE);
  await inviteToSite(env, site.id, 'b@example.com', 'owner', { manageUrl: 'x', siteUrl: 'y' });
  const cookie = await signIn(env, 'b@example.com');
  const get = (p) => call(env, M, `/s/akbostons${p}`, { headers: { cookie } });
  const post = (p, body = {}) => call(env, M, `/s/akbostons${p}`, { method: 'POST', headers: { cookie, origin: `https://${M}` }, body: body instanceof URLSearchParams ? body : new URLSearchParams(body) });
  const row = (sql, ...a) => env.DB.raw.prepare(sql).get(...a);
  const rows = (sql, ...a) => env.DB.raw.prepare(sql).all(...a);
  const run = (sql, ...a) => env.DB.raw.prepare(sql).run(...a);
  const page = async (p) => (await call(env, SITE, p)).text();
  return { env, site, get, post, row, rows, run, page };
}

const api = (env, path, { method = 'POST', body, token } = {}) => call(env, API, path, {
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
  headers: { 'content-type': 'application/json', origin: APP, ...(token ? { authorization: `Bearer ${token}` } : {}) },
});

async function linked(b) {
  const html = await (await b.post('/kennelos/code')).text();
  const code = html.match(/class="code">([A-Z0-9-]+)</)[1];
  const res = await api(b.env, '/v1/link', { body: { code, kennel_id: KENNEL, device_label: 'Her phone' } });
  assert.equal(res.status, 200);
  return (await res.json()).token;
}

let n = 0;
const bundle = (extra = {}) => ({ format: 1, bundle_id: `bundle-${++n}-xxxxxx`, kennel_id: KENNEL, dogs: [], litters: [], pairings: [], heats: [], ...extra });
const DOG = (id, call_name, more = {}) => ({ id, call_name, sex: 'female', status: 'active_breeding', ...more });

// A partner kennel made by hand, with a logo.
async function partner(b, name, url, { logo = true } = {}) {
  const photo = logo ? (await savePhoto(b.env, b.site.id, { full: webp(400, 400), thumb: webp(200, 200), alt: `${name} logo` })).id : null;
  return (await saveRecord(b.env, b.site.id, 'partners', null, { name, url, photo_id: photo })).id;
}

// Save a dog as the form would: every field it has, with these changes.
async function saveDog(b, id, changes) {
  const cur = await getRecord(b.env, b.site.id, 'dogs', id);
  const input = Object.fromEntries(Object.keys(KINDS.dogs.fields).map((k) => [k, cur[k] ?? null]));
  for (const k of ['show_on_site', 'upcoming', 'for_sale', 'co_owned', 'lives_away']) input[k] = Boolean(input[k]);
  return saveRecord(b.env, b.site.id, 'dogs', id, { ...input, ...changes });
}

const section = (html, id) => html.match(new RegExp(`id="${id}"[\\s\\S]*?</section>`))?.[0] ?? '';

test('the rules: only a co-owned dog lives away or has kennels, and the one it lives with is one of them', () => {
  assert.deepEqual(coOwnedRules({ co_owned: 0, lives_away: 1, lives_with_kennel_id: 'k1', co_owned_with_ids: ['k1'] }),
    { co_owned: 0, lives_away: 0, lives_with_kennel_id: null, co_owned_with_ids: [] });
  assert.deepEqual(coOwnedRules({ co_owned: 1, lives_away: 0, lives_with_kennel_id: 'k1', co_owned_with_ids: ['k2'] }),
    { co_owned: 1, lives_away: 0, lives_with_kennel_id: null, co_owned_with_ids: ['k2'] });
  assert.deepEqual(coOwnedRules({ co_owned: 1, lives_away: 1, lives_with_kennel_id: 'k1', co_owned_with_ids: ['k2', 'k2'] }),
    { co_owned: 1, lives_away: 1, lives_with_kennel_id: 'k1', co_owned_with_ids: ['k1', 'k2'] });
});

test('the Dogs page: a dog living with a co-owner is only under Co-owned, in a light card with its kennel; one at home stays with her dogs', async () => {
  const b = await breeder();
  const oak = await partner(b, 'Oakridge Bostons', 'https://oakridge.example/');
  const pine = await partner(b, 'Pinehill', null, { logo: false });
  const willow = b.row("SELECT * FROM dogs WHERE slug = 'willow'");
  const ziva = b.row("SELECT * FROM dogs WHERE slug = 'ziva'");
  // Willow lives at Oakridge, co-owned with Oakridge and Pinehill; Ziva is co-owned
  // with Pinehill and lives at home.
  await saveDog(b, willow.id, { co_owned: true, lives_away: true, lives_with_kennel_id: oak, co_owned_with_ids: [pine] });
  await saveDog(b, ziva.id, { co_owned: true, lives_away: false, co_owned_with_ids: [pine] });
  assert.deepEqual(JSON.parse(b.row('SELECT co_owned_with_ids FROM dogs WHERE id = ?', willow.id).co_owned_with_ids), [oak, pine], 'the kennel it lives with is one of its kennels');
  await b.post('/publish');

  const html = await b.page('/dogs');
  const co = section(html, 'co-owned');
  assert.match(co, /Shared with friends/);
  assert.match(co, /class="track light"/);
  assert.match(co, /class="cocard" href="\/dogs\/willow"[\s\S]*with Oakridge Bostons/);
  assert.match(co, /class="partners"[\s\S]*href="https:\/\/oakridge.example\/" rel="noopener"[\s\S]*Oakridge Bostons/);
  assert.doesNotMatch(co, /Ziva|Pinehill/, 'a dog at home is not here, and only the kennels they live with are in the strip');
  assert.doesNotMatch(section(html, 'all-dogs'), /Willow/);
  assert.match(section(html, 'all-dogs'), /Ziva/);
  // Never on Home.
  const home = await b.page('/');
  assert.doesNotMatch(home.match(/Meet our Bostons[\s\S]*?<\/section>/)[0], /Willow/);
  assert.match(home.match(/Meet our Bostons[\s\S]*?<\/section>/)[0], /Ziva/);

  // Its page: Co-owned with both, and where it lives.
  const w = await b.page('/dogs/willow');
  assert.match(w, /Co-owned with<\/dt><dd>[\s\S]*Oakridge Bostons<\/a>[\s\S]*Pinehill/);
  assert.match(w, /Lives with<\/dt><dd>[\s\S]*Oakridge Bostons/);
  const z = await b.page('/dogs/ziva');
  assert.match(z, /Co-owned with<\/dt><dd><span class="pk">Pinehill<\/span>/);
  assert.doesNotMatch(z, /Lives with/);

  // Her own wording for the section.
  b.run("INSERT INTO site_pages (site_id, page, enabled, content) VALUES (?, 'dogs', 1, ?) ON CONFLICT (site_id, page) DO UPDATE SET content = excluded.content", b.site.id, JSON.stringify({ co_owned_heading: 'Our extended family' }));
  await b.post('/publish');
  assert.match(section(await b.page('/dogs'), 'co-owned'), /Our extended family/);

  // Back home: back with her own dogs, the section gone.
  await saveDog(b, willow.id, { lives_away: false });
  await b.post('/publish');
  const after = await b.page('/dogs');
  assert.doesNotMatch(after, /id="co-owned"/);
  assert.match(section(after, 'all-dogs'), /Willow/);
});

test('KennelOS: partner kennels come by name and website, dogs follow where they live, and her logo stays', async () => {
  const b = await breeder();
  const token = await linked(b);
  const send = async (body) => api(b.env, '/v1/bundle', { body, token });
  // A kennel she added by hand with the same name is taken over, keeping its logo.
  const mine = await partner(b, 'Oakridge Bostons', null);
  const logo = b.row('SELECT photo_id FROM partner_kennels WHERE id = ?', mine).photo_id;
  const kennels = [{ id: 'k-oak', name: 'oakridge bostons', website: 'https://oakridge.example/' }, { id: 'k-pine', name: 'Pinehill', website: null }];
  let res = await send(bundle({
    partner_kennels: kennels,
    dogs: [
      DOG('d1', 'Nova', { co_owned: true, lives_away: true, lives_with_kennel_id: 'k-oak', co_owner_kennel_ids: ['k-oak', 'k-pine'] }),
      DOG('d2', 'Juno', { co_owned: true, lives_away: false, co_owner_kennel_ids: ['k-pine'] }),
      DOG('d3', 'Echo', { co_owned: true, lives_away: true, lives_with_kennel_id: null, co_owner_kennel_ids: [] }),
    ],
  }));
  assert.equal(res.status, 200);
  const oak = b.row("SELECT * FROM partner_kennels WHERE kennelos_id = 'k-oak'");
  assert.equal(oak.id, mine, 'the same name is taken over');
  assert.equal(oak.name, 'oakridge bostons');
  assert.equal(oak.url, 'https://oakridge.example/');
  assert.equal(oak.photo_id, logo, 'her logo stays');
  const pine = b.row("SELECT id FROM partner_kennels WHERE kennelos_id = 'k-pine'").id;
  const nova = b.row("SELECT * FROM dogs WHERE kennelos_id = 'd1'");
  assert.equal(nova.co_owned, 1);
  assert.equal(nova.lives_away, 1);
  assert.equal(nova.lives_with_kennel_id, mine);
  assert.deepEqual(JSON.parse(nova.co_owned_with_ids), [mine, pine]);
  await b.post('/publish');
  let co = section(await b.page('/dogs'), 'co-owned');
  assert.match(co, /Nova[\s\S]*with oakridge bostons/);
  assert.match(co, /Echo[\s\S]*Lives with a partner kennel/, 'living with a co-owner whose kennel she has not ticked: no name');
  assert.doesNotMatch(co, /Juno/);
  assert.match(section(await b.page('/dogs'), 'all-dogs'), /Juno/);

  // Read-only in the manage app while they come from KennelOS.
  assert.match(await (await b.get(`/lists/partners/${mine}`)).text(), /Kennel name<\/b><br>oakridge bostons <span class="muted small">· from KennelOS/);
  assert.match(await (await b.get(`/dogs/${nova.id}`)).text(), /Lives with<\/b><br>oakridge bostons/);

  // Nova moves back home, and Pinehill is no longer ticked: it is hidden (its dogs
  // name it no more), never deleted.
  res = await send(bundle({
    partner_kennels: [kennels[0]],
    dogs: [DOG('d1', 'Nova', { co_owned: true, lives_away: false, co_owner_kennel_ids: ['k-oak'] }), DOG('d2', 'Juno', { co_owned: true, co_owner_kennel_ids: [] }), DOG('d3', 'Echo', { co_owned: true, lives_away: true })],
  }));
  assert.equal(res.status, 200);
  assert.equal(b.row("SELECT hidden_by_kennelos FROM partner_kennels WHERE kennelos_id = 'k-pine'").hidden_by_kennelos, 1);
  assert.equal(b.row("SELECT lives_with_kennel_id FROM dogs WHERE kennelos_id = 'd1'").lives_with_kennel_id, null);
  await b.post('/publish');
  const html = await b.page('/dogs');
  assert.match(section(html, 'all-dogs'), /Nova/);
  assert.doesNotMatch(section(html, 'co-owned'), /Nova/);
  assert.doesNotMatch(await b.page('/dogs/juno'), /Pinehill/);
  assert.match(await (await b.get('/lists/partners')).text(), /Not sent by KennelOS/);

  // An older KennelOS (no partner_kennels) leaves all of it as it is.
  await send(bundle({ dogs: [DOG('d1', 'Nova'), DOG('d2', 'Juno'), DOG('d3', 'Echo')] }));
  assert.equal(b.row("SELECT co_owned FROM dogs WHERE kennelos_id = 'd1'").co_owned, 1);
  assert.equal(b.row("SELECT lives_away FROM dogs WHERE kennelos_id = 'd3'").lives_away, 1);

  // Refused: a dog naming a kennel the bundle doesn't send, and anything but a
  // kennel's name and website (never a person, a contract or money).
  assert.equal((await send(bundle({ partner_kennels: [], dogs: [DOG('d1', 'Nova', { co_owned: true, lives_away: true, lives_with_kennel_id: 'k-oak' })] }))).status, 400);
  assert.equal((await send(bundle({ partner_kennels: [{ id: 'k-oak', name: 'Oakridge', contact_email: 'ann@example.com' }] }))).status, 400);
  assert.equal((await send(bundle({ dogs: [DOG('d1', 'Nova', { co_owner_contact_ids: ['c1'] })] }))).status, 400);

  // Unlink: hers to edit.
  await b.post('/kennelos/unlink');
  assert.equal(b.row('SELECT source FROM partner_kennels WHERE id = ?', mine).source, 'kennelport');
});

test('the Site Manager: partner kennels from Dogs, a badge code for the logo, and removing one unlinks its dogs', async () => {
  const b = await breeder();
  b.env.EMBED_FETCH = async () => new Response(webp(300, 300));
  assert.match(await (await b.get('/dogs')).text(), /href="\/s\/akbostons\/lists\/partners">Partner kennels/);
  const res = await b.post('/lists/partners/new', { name: '', url: '', photo_id: '', _badge_code: '<a href="https://oakridge.example/"><img src="https://oakridge.example/badge.webp" alt="Oakridge Bostons"></a>' });
  assert.equal(res.status, 303);
  const oak = b.row('SELECT * FROM partner_kennels WHERE site_id = ?', b.site.id);
  assert.equal(oak.name, 'Oakridge Bostons', 'named from the badge');
  assert.equal(oak.url, 'https://oakridge.example/');
  assert.ok(oak.photo_id, 'its logo copied onto the site');
  // The same name twice is refused.
  assert.match(await (await b.post('/lists/partners/new', { name: 'oakridge bostons' })).text(), /already on your list/);

  // The dog form offers it.
  const willow = b.row("SELECT * FROM dogs WHERE slug = 'willow'");
  const form = await (await b.get(`/dogs/${willow.id}`)).text();
  assert.match(form, /name="lives_with_kennel_id"[\s\S]*Oakridge Bostons/);
  assert.match(form, /name="co_owned_with_ids" value="[^"]+"> <span>Oakridge Bostons/);
  const saved = await b.post(`/dogs/${willow.id}`, new URLSearchParams([
    ['call_name', 'Willow'], ['sex', 'female'], ['status', 'active'], ['health_display', 'normal_only'], ['slug', 'willow'], ['show_on_site', '1'],
    ['co_owned', '1'], ['lives_away', '1'], ['lives_with_kennel_id', oak.id],
  ]));
  assert.equal(saved.status, 303);
  assert.deepEqual(JSON.parse(b.row('SELECT co_owned_with_ids FROM dogs WHERE id = ?', willow.id).co_owned_with_ids), [oak.id]);

  // Removed: off Willow, who still lives away, with no kennel named.
  assert.equal((await b.post(`/lists/partners/${oak.id}/remove`)).status, 303);
  const w = b.row('SELECT * FROM dogs WHERE id = ?', willow.id);
  assert.equal(w.lives_with_kennel_id, null);
  assert.equal(w.co_owned_with_ids, null);
  assert.equal(w.lives_away, 1);
});

test('the import document: partner kennels and dogs name each other by name, and round-trip', async () => {
  const b = await breeder();
  const oak = await partner(b, 'Oakridge Bostons', 'https://oakridge.example/');
  const willow = b.row("SELECT id FROM dogs WHERE slug = 'willow'").id;
  await saveDog(b, willow, { co_owned: true, lives_away: true, lives_with_kennel_id: oak });
  const doc = await exportContent(b.env, b.site.id);
  assert.equal(doc.partners[0].name, 'Oakridge Bostons');
  const w = doc.dogs.find((d) => d.slug === 'willow');
  assert.equal(w.co_owned, true);
  assert.equal(w.lives_with, 'Oakridge Bostons');
  assert.deepEqual(w.co_owned_with, ['Oakridge Bostons']);
  await importContent(b.env, b.site.id, doc);
  assert.equal(b.row('SELECT id FROM partner_kennels WHERE site_id = ?', b.site.id).id, oak, 'the kennel keeps its id');
  assert.equal(b.row('SELECT lives_with_kennel_id FROM dogs WHERE id = ?', willow).lives_with_kennel_id, oak);
  // A dog naming a kennel that isn't there is refused; a kennel left out goes, off its dogs.
  await assert.rejects(importContent(b.env, b.site.id, { dogs: [...doc.dogs.filter((d) => d.slug !== 'willow'), { ...w, lives_with: 'Nowhere' }] }), /no partner kennel called "Nowhere"/);
  await importContent(b.env, b.site.id, { partners: [] });
  assert.equal(b.row('SELECT COUNT(*) AS n FROM partner_kennels WHERE site_id = ?', b.site.id).n, 0);
  assert.equal(b.row('SELECT lives_with_kennel_id FROM dogs WHERE id = ?', willow).lives_with_kennel_id, null);
});

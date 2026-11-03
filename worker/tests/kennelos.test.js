// Phase 4: the KennelOS link (plan 5) — link codes, the bundle API, matching,
// the hand-over, the litter clock, Unlink — and the prices, statuses and dog
// groups it brought (3.2, 3.6, 3.7).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';

const { importContent } = await import('../src/content/io.js');
const { AK_SAMPLE } = await import('../src/content/akSample.js');
const { inviteToSite } = await import('../src/auth.js');
const { forgetSnapshots } = await import('../src/publish.js');
const { runCleanup } = await import('../src/cleanup.js');
const { puppyPrice, litterPriceRange } = await import('../src/content/prices.js');

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
  const env = await makeEnv({ KENNELOS_APP_ORIGINS: `${APP}, https://other.example` });
  const site = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  await importContent(env, site.id, AK_SAMPLE);
  await inviteToSite(env, site.id, 'b@example.com', 'owner', { manageUrl: 'x', siteUrl: 'y' });
  const cookie = await signIn(env, 'b@example.com');
  const get = (p) => call(env, M, `/s/akbostons${p}`, { headers: { cookie } });
  const post = (p, body = {}) => call(env, M, `/s/akbostons${p}`, { method: 'POST', headers: { cookie, origin: `https://${M}` }, body: body instanceof URLSearchParams ? body : new URLSearchParams(body) });
  const row = (sql, ...a) => env.DB.raw.prepare(sql).get(...a);
  const rows = (sql, ...a) => env.DB.raw.prepare(sql).all(...a);
  const page = async (p) => (await call(env, SITE, p)).text();
  return { env, site, get, post, row, rows, page };
}

const api = (env, path, { method = 'POST', body, token, origin = APP } = {}) => call(env, API, path, {
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
  headers: { 'content-type': 'application/json', ...(origin ? { origin } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
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

test('a link code: owners only, once, a quarter of an hour; the token works and nothing else does', async () => {
  const b = await breeder();
  const html = await (await b.post('/kennelos/code')).text();
  const code = html.match(/class="code">([A-Z0-9-]{9})</)[1];
  assert.match(code, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.doesNotMatch(code, /[01OIL]/);
  // Typed in lower case without its dash still works.
  const ok = await api(b.env, '/v1/link', { body: { code: code.replace('-', '').toLowerCase(), kennel_id: KENNEL, device_label: 'Her phone' } });
  assert.equal(ok.status, 200);
  const linkedOut = await ok.json();
  assert.match(linkedOut.token, /^kpl_[0-9a-f]{64}$/);
  assert.equal(linkedOut.site.website, 'https://akbostons.kennelport.com/');
  assert.equal(linkedOut.site.waitlist_page, true);
  assert.equal(ok.headers.get('access-control-allow-origin'), APP);
  // Only the hash is kept.
  assert.equal(b.row('SELECT COUNT(*) AS n FROM links WHERE token_hash LIKE ?', '%kpl_%').n, 0);
  // Once.
  const again = await api(b.env, '/v1/link', { body: { code, kennel_id: KENNEL } });
  assert.equal(again.status, 400);
  assert.equal((await again.json()).error, 'invalid_code');
  // The token says who it is; a made-up one is not linked.
  assert.equal((await (await api(b.env, '/v1/link', { method: 'GET', token: linkedOut.token })).json()).linked, true);
  const bad = await api(b.env, '/v1/link', { method: 'GET', token: `kpl_${'0'.repeat(64)}` });
  assert.equal(bad.status, 401);
  assert.equal((await bad.json()).error, 'not_linked');

  // An expired code is refused.
  const html2 = await (await b.post('/kennelos/code')).text();
  const code2 = html2.match(/class="code">([A-Z0-9-]+)</)[1];
  b.env.DB.raw.prepare("UPDATE link_codes SET expires_at = '2000-01-01T00:00:00Z' WHERE used_at IS NULL").run();
  assert.equal((await api(b.env, '/v1/link', { body: { code: code2, kennel_id: KENNEL } })).status, 400);

  // Another kennel can't link to the same site.
  const html3 = await (await b.post('/kennelos/code')).text();
  const code3 = html3.match(/class="code">([A-Z0-9-]+)</)[1];
  const other = await api(b.env, '/v1/link', { body: { code: code3, kennel_id: 'kennel-2' } });
  assert.equal(other.status, 409);
  assert.equal((await other.json()).error, 'other_kennel');

  // An editor can't make a code.
  await inviteToSite(b.env, b.site.id, 'e@example.com', 'editor', { manageUrl: 'x', siteUrl: 'y' });
  const ec = await signIn(b.env, 'e@example.com');
  const er = await call(b.env, M, '/s/akbostons/kennelos', { headers: { cookie: ec } });
  assert.match(await er.text(), /Only the site's owner can link KennelOS/);
  assert.equal((await call(b.env, M, '/s/akbostons/kennelos/code', { method: 'POST', headers: { cookie: ec, origin: `https://${M}` } })).status, 404);
});

test('the KennelOS screens open, with no inline styles', async () => {
  const b = await breeder();
  assert.match(await (await b.get('/kennelos')).text(), /Show a link code/);
  const token = await linked(b);
  await api(b.env, '/v1/bundle', { body: bundle({ dogs: [DOG('d-willow', 'Willow')] }), token });
  for (const p of ['', '/kennelos', '/dogs', '/litters', '/puppies', '/payment']) {
    const res = await b.get(p);
    assert.equal(res.status, 200, p);
    assert.doesNotMatch(await res.text(), /\sstyle="/, p);
  }
  assert.match(await (await b.get('/kennelos')).text(), /Her phone[\s\S]*Already on your site\?[\s\S]*Use my KennelOS prices[\s\S]*Unlink KennelOS/);
});

test('only the KennelOS app origins; a preflight gets the CORS answer', async () => {
  const b = await breeder();
  const pre = await call(b.env, API, '/v1/bundle', { method: 'OPTIONS', headers: { origin: APP } });
  assert.equal(pre.status, 204);
  assert.match(pre.headers.get('access-control-allow-headers'), /authorization/);
  const no = await api(b.env, '/v1/link', { body: {}, origin: 'https://evil.example' });
  assert.equal(no.status, 403);
  assert.equal((await no.json()).error, 'origin_not_allowed');
});

test('a bundle: refused whole when it is wrong, applied whole when it is right, and once', async () => {
  const b = await breeder();
  await b.post('/publish');
  const token = await linked(b);
  const send = (body) => api(b.env, '/v1/bundle', { body, token });

  const old = await send({ ...bundle(), format: 2 });
  assert.equal(old.status, 400);
  assert.match((await old.json()).message, /Let KennelOS update itself/);
  const unknown = await send(bundle({ dogs: [{ ...DOG('d1', 'Nova'), buyer: 'Smith' }] }));
  assert.equal(unknown.status, 400);
  assert.match((await unknown.json()).message, /dogs\[0\]\.buyer: not a field KennelPort takes/);
  // Nothing landed from the refused ones.
  assert.equal(b.row("SELECT COUNT(*) AS n FROM dogs WHERE source = 'kennelos'").n, 0);
  assert.equal((await send({ ...bundle(), kennel_id: 'kennel-2' })).status, 409);
  assert.equal((await api(b.env, '/v1/bundle', { body: bundle() })).status, 401);

  const one = bundle({ dogs: [DOG('d1', 'Nova', { color: 'Brindle', titles: ['CH', 'CGC'], health: [{ id: 'h1', test: 'Patellas (OFA)', result: 'Normal', normal: true }, { id: 'h2', test: 'BAER', result: 'Unilateral', normal: false }] })] });
  const res = await send(one);
  assert.equal(res.status, 200);
  const out = await res.json();
  assert.equal(out.summary.created, 1);
  assert.match(out.summary.text, /1 new \(needs photos\)/);
  const nova = b.row("SELECT * FROM dogs WHERE kennelos_id = 'd1'");
  assert.equal(nova.call_name, 'Nova');
  assert.equal(nova.titles, 'CH CGC');
  assert.equal(nova.source, 'kennelos');
  // Each result's Show on site set once from the dog's choice (normal only).
  assert.deepEqual(b.rows('SELECT test, show FROM health_results WHERE dog_id = ? ORDER BY test', nova.id).map((h) => [h.test, h.show]), [['BAER', 0], ['Patellas (OFA)', 1]]);

  // The same bundle again (a retry): its first answer, nothing applied twice.
  const repeat = await (await send(one)).json();
  assert.equal(repeat.repeat, true);
  assert.equal(repeat.summary.created, 1);
  assert.equal(b.row("SELECT COUNT(*) AS n FROM dogs WHERE kennelos_id = 'd1'").n, 1);

  // The manage app has the notice, and Publish lists the change.
  assert.match(await (await b.get('')).text(), /From KennelOS: 1 new/);
  assert.match(await (await b.get('/publish')).text(), /Nova: new/);
});

test('what a blank means: stored fields follow KennelOS, derived ones only when there is something', async () => {
  const b = await breeder();
  const token = await linked(b);
  const send = (body) => api(b.env, '/v1/bundle', { body, token });
  await send(bundle({ dogs: [DOG('d1', 'Nova', { color: 'Brindle', titles: ['CH'], health: [{ id: 'h1', test: 'Patellas', result: 'Normal' }] })] }));
  b.env.DB.raw.prepare("UPDATE health_results SET show = 0 WHERE kennelos_id = 'h1'").run();
  await send(bundle({ dogs: [DOG('d1', 'Nova', { registered_name: 'AK Nova' })] }));
  const nova = b.row("SELECT * FROM dogs WHERE kennelos_id = 'd1'");
  assert.equal(nova.color, null); // stored: cleared there, cleared here
  assert.equal(nova.titles, 'CH'); // derived: nothing logged isn't "delete"
  assert.equal(b.row("SELECT COUNT(*) AS n FROM health_results WHERE kennelos_id = 'h1'").n, 1);
  // A result's tick is hers once it has arrived.
  await send(bundle({ dogs: [DOG('d1', 'Nova', { health: [{ id: 'h1', test: 'Patellas', result: 'Normal' }] })] }));
  assert.equal(b.row("SELECT show FROM health_results WHERE kennelos_id = 'h1'").show, 0);
});

test('KennelOS fields are read-only while linked; her own fields are hers', async () => {
  const b = await breeder();
  const token = await linked(b);
  await api(b.env, '/v1/bundle', { body: bundle({ dogs: [DOG('d1', 'Nova', { color: 'Brindle' })] }), token });
  const id = b.row("SELECT id FROM dogs WHERE kennelos_id = 'd1'").id;
  const form = await (await b.get(`/dogs/${id}`)).text();
  assert.match(form, /comes from KennelOS/);
  assert.match(form, /Brindle <span class="muted small">· from KennelOS/);
  assert.doesNotMatch(form, /name="call_name"/);
  assert.match(form, /name="bio"/);
  assert.equal((await b.post(`/dogs/${id}`, { call_name: 'Changed', color: 'Red', sex: 'male', bio: 'Her words', slug: 'nova', show_on_site: '1' })).status, 303);
  const d = b.row('SELECT * FROM dogs WHERE id = ?', id);
  assert.equal(d.call_name, 'Nova');
  assert.equal(d.color, 'Brindle');
  assert.equal(d.sex, 'female');
  assert.equal(d.bio, 'Her words');
});

test('matching what is already there: asked, field by field, and never twice for a declined pair', async () => {
  const b = await breeder();
  const token = await linked(b);
  const send = (body) => api(b.env, '/v1/bundle', { body, token });
  const willow = b.row("SELECT * FROM dogs WHERE slug = 'willow'");
  const out = await (await send(bundle({ dogs: [DOG('d-willow', 'Willow', { registered_name: "AK's Wild at Heart", date_of_birth: '2022-04-01' }), DOG('d-ziva', 'ziva')] }))).json();
  assert.equal(out.summary.waiting, 2);
  assert.equal(out.summary.created, 0);
  assert.equal(b.row("SELECT COUNT(*) AS n FROM dogs WHERE kennelos_id IS NOT NULL").n, 0);

  const screen = await (await b.get('/kennelos')).text();
  assert.match(screen, /Is KennelOS's dog "Willow" your website's Willow\?/);
  assert.match(screen, /colour: 'Black &amp; white' → blank/);
  // A blanking is ticked to keep hers until she says otherwise.
  assert.match(screen, /name="keep" value="color" checked/);
  assert.match(screen, /born: empty → '2022-04-01'/);

  assert.equal((await b.post('/kennelos/match', new URLSearchParams([['kind', 'dogs'], ['kennelos_id', 'd-willow'], ['answer', 'yes'], ['keep', 'color']]))).status, 303);
  const w = b.row('SELECT * FROM dogs WHERE id = ?', willow.id);
  assert.equal(w.kennelos_id, 'd-willow');
  assert.equal(w.source, 'kennelos');
  assert.equal(w.slug, 'willow');
  assert.equal(w.color, 'Black & white');
  assert.equal(w.date_of_birth, '2022-04-01');
  assert.equal(w.bio, willow.bio);

  // No: a new dog, and the pair isn't suggested again.
  const ziva = b.row("SELECT id FROM dogs WHERE slug = 'ziva'").id;
  assert.equal((await b.post('/kennelos/match', { kind: 'dogs', kennelos_id: 'd-ziva', answer: 'no' })).status, 303);
  assert.equal(b.row("SELECT COUNT(*) AS n FROM dogs WHERE kennelos_id = 'd-ziva'").n, 1);
  assert.notEqual(b.row("SELECT id FROM dogs WHERE kennelos_id = 'd-ziva'").id, ziva);
  const again = await (await send(bundle({ dogs: [DOG('d-willow', 'Willow'), DOG('d-ziva', 'ziva')] }))).json();
  assert.equal(again.summary.waiting, 0);
  assert.equal(b.row("SELECT kennelos_id FROM dogs WHERE id = ?", ziva).kennelos_id, null);
});

test('litters: her dates place them, a pairing becomes its litter, and puppies come with it', async () => {
  const b = await breeder();
  const token = await linked(b);
  const send = (body) => api(b.env, '/v1/bundle', { body, token });
  await send(bundle({
    dogs: [DOG('d-nova', 'Nova'), DOG('d-max', 'Max', { sex: 'male' })],
    pairings: [{ id: 'p1', dam_id: 'd-nova', sire_id: 'd-max', dam_name: 'Nova', sire_name: 'Max', expected_on: '2099-03-10' }],
    heats: [{ id: 'h1', dam_id: 'd-nova', dam_name: 'Nova', month: '2099-09' }],
  }));
  const planned = b.row("SELECT * FROM litters WHERE kennelos_kind = 'pairing'");
  assert.equal(planned.name, 'Nova × Max');
  assert.equal(planned.stage, 'planned');
  assert.equal(planned.expected_label, 'March 2099');
  assert.equal(planned.dam_id, b.row("SELECT id FROM dogs WHERE kennelos_id = 'd-nova'").id);
  assert.equal(b.row("SELECT * FROM litters WHERE kennelos_kind = 'heat'").expected_label, 'September 2099');
  b.env.DB.raw.prepare("UPDATE litters SET summary = 'Her words' WHERE id = ?").run(planned.id);

  // Whelped: the litter names its pairing, and takes over its website litter.
  await send(bundle({
    dogs: [DOG('d-nova', 'Nova'), DOG('d-max', 'Max', { sex: 'male' })],
    litters: [{ id: 'l1', pairing_id: 'p1', dam_id: 'd-nova', sire_id: 'd-max', dam_name: 'Nova', sire_name: 'Max', born_on: '2026-11-01', deposits_on: '2099-12-12',
      puppies: [{ id: 'k1', name: 'Fern', sex: 'female', status: 'available' }, { id: 'k2', name: 'Moss', sex: 'male', status: 'undecided' }] }],
  }));
  const l = b.row('SELECT * FROM litters WHERE id = ?', planned.id);
  assert.equal(l.kennelos_kind, 'litter');
  assert.equal(l.kennelos_id, 'l1');
  assert.equal(l.stage, 'current');
  assert.equal(l.summary, 'Her words');
  assert.equal(l.slug, planned.slug);
  // The heat wasn't sent again: it leaves the site, with its clock started.
  assert.ok(b.row("SELECT left_site_at FROM litters WHERE kennelos_kind = 'heat'").left_site_at);

  await b.post('/publish');
  // Before the deposits date: under Coming up, Available on the date, Still deciding.
  const html = await b.page('/litters');
  assert.match(html.split('id="upcoming"')[1], /Nova × Max/);
  assert.doesNotMatch(html.split('id="upcoming"')[0], /Nova × Max/);
  assert.match(html, /Deposits from[\s\S]*December 12, 2099/);
  const pup = await b.page(`/litters/${l.slug}/fern`);
  assert.match(pup, /Available on December 12/);
  assert.match(pup, /Ask about Fern/);
  const moss = await b.page(`/litters/${l.slug}/moss`);
  assert.match(moss, /Still deciding/);
  assert.doesNotMatch(moss, /Ask about Moss/);

  // On the day: Available, with no bundle and no Publish.
  b.env.DB.raw.prepare("UPDATE litters SET deposits_on = '2000-01-01' WHERE id = ?").run(l.id);
  await send(bundle({
    dogs: [DOG('d-nova', 'Nova'), DOG('d-max', 'Max', { sex: 'male' })],
    litters: [{ id: 'l1', pairing_id: 'p1', dam_id: 'd-nova', sire_id: 'd-max', dam_name: 'Nova', sire_name: 'Max', born_on: '2026-11-01', deposits_on: '2000-01-01',
      puppies: [{ id: 'k1', name: 'Fern', sex: 'female', status: 'available' }] }],
  }));
  await b.post('/publish');
  const after = await b.page('/litters');
  assert.match(after.split('id="upcoming"')[0], /Nova × Max/);
  assert.doesNotMatch(after.split('id="upcoming"')[1], /Nova × Max/);
  // Moss wasn't sent: off the site.
  assert.equal((await call(b.env, SITE, `/litters/${l.slug}/moss`)).status, 404);
});

test('the answer carries the addresses of published pages only', async () => {
  const b = await breeder();
  const token = await linked(b);
  const send = (body) => api(b.env, '/v1/bundle', { body, token });
  const body = { dogs: [DOG('d-nova', 'Nova')], litters: [{ id: 'l1', dam_id: 'd-nova', dam_name: 'Nova', born_on: '2026-10-01', puppies: [{ id: 'k1', name: 'Fern', sex: 'female', status: 'available' }] }] };
  const first = await (await send(bundle(body))).json();
  assert.deepEqual(first.addresses, { dogs: {}, litters: {} });
  await b.post('/publish');
  const second = await (await send(bundle(body))).json();
  const slug = b.row("SELECT slug FROM litters WHERE kennelos_id = 'l1'").slug;
  assert.equal(second.addresses.dogs['d-nova'], 'https://akbostons.kennelport.com/dogs/nova');
  assert.equal(second.addresses.litters.l1, `https://akbostons.kennelport.com/litters/${slug}`);
  assert.equal(second.addresses.dogs.k1, `https://akbostons.kennelport.com/litters/${slug}/fern`);
  // With her own domain the main address, that's what KennelOS is given.
  b.env.DB.raw.prepare("INSERT INTO custom_domains (hostname, site_id, status, created_at) VALUES ('www.akbostonterriers.com', ?, 'active', ?)").run(b.site.id, new Date().toISOString());
  const third = await (await send(bundle(body))).json();
  assert.equal(third.addresses.dogs['d-nova'], 'https://www.akbostonterriers.com/dogs/nova');
  assert.equal(third.site.website, 'https://www.akbostonterriers.com/');
});

test('the hand-over: a kept puppy becomes a dog with its photos, and the litter can go without them', async () => {
  const b = await breeder();
  const token = await linked(b);
  const send = (body) => api(b.env, '/v1/bundle', { body, token });
  await send(bundle({ dogs: [DOG('d-nova', 'Nova')], litters: [{ id: 'l1', dam_id: 'd-nova', dam_name: 'Nova', born_on: '2026-01-01', puppies: [{ id: 'k1', name: 'Fern', sex: 'female', status: 'staying' }, { id: 'k2', name: 'Moss', sex: 'male', status: 'placed' }] }] }));
  const fern = b.row("SELECT * FROM puppies WHERE kennelos_id = 'k1'");
  const moss = b.row("SELECT * FROM puppies WHERE kennelos_id = 'k2'");
  const t = new Date().toISOString();
  for (const [pid, who] of [['ph-fern', fern], ['ph-moss', moss]]) {
    b.env.DB.raw.prepare("INSERT INTO photos (id, site_id, r2_key, type, bytes, created_at) VALUES (?, ?, ?, 'image/webp', 10, ?)").run(pid, b.site.id, `sites/${b.site.id}/photos/${pid}.webp`, t);
    b.env.DB.raw.prepare('UPDATE puppies SET photo_id = ? WHERE id = ?').run(pid, who.id);
    b.env.DB.raw.prepare('INSERT INTO photo_tags (site_id, photo_id, subject) VALUES (?, ?, ?)').run(b.site.id, pid, `puppy:${who.id}`);
    await b.env.FILES.put(`sites/${b.site.id}/photos/${pid}.webp`, 'x');
  }
  // Sold: the litter leaves; she keeps Fern, who arrives as a dog with KennelOS's same id.
  const out = await (await send(bundle({ dogs: [DOG('d-nova', 'Nova'), DOG('k1', 'Fern', { status: 'puppy' })] }))).json();
  assert.equal(out.summary.off, 1);
  const dog = b.row("SELECT * FROM dogs WHERE kennelos_id = 'k1'");
  assert.equal(dog.photo_id, 'ph-fern');
  assert.equal(dog.upcoming, 1);
  assert.ok(b.row("SELECT 1 AS y FROM photo_tags WHERE photo_id = 'ph-fern' AND subject = ?", `dog:${dog.id}`));
  await b.post('/publish');
  assert.match(await b.page('/dogs'), /id="up-and-coming"[\s\S]*Fern/);

  // The litter is listed as leaving, and goes 30 days later with Moss's photo only.
  assert.match(await (await b.get('/litters')).text(), /Leaving your site[\s\S]*Deleted on/);
  const later = new Date(Date.now() + 31 * 86400000);
  const res = await runCleanup(b.env, later);
  assert.equal(res.litters, 1);
  assert.equal(b.row("SELECT COUNT(*) AS n FROM litters WHERE kennelos_id = 'l1'").n, 0);
  assert.equal(b.row("SELECT COUNT(*) AS n FROM puppies WHERE kennelos_id IN ('k1', 'k2')").n, 0);
  assert.equal(b.row("SELECT removed_at FROM photos WHERE id = 'ph-fern'").removed_at, null);
  assert.ok(b.row("SELECT removed_at FROM photos WHERE id = 'ph-moss'").removed_at);
});

test('Keep: a litter off the site stays as a past litter, and the cleanup leaves it', async () => {
  const b = await breeder();
  const gem = b.row("SELECT id FROM litters WHERE slug = 'gem-2026'").id;
  await b.post(`/litters/${gem}`, { name: 'The Gem litter', stage: 'current', slug: 'gem-2026' }); // Show on my website unticked
  assert.ok(b.row('SELECT left_site_at FROM litters WHERE id = ?', gem).left_site_at);
  assert.match(await (await b.get('')).text(), /1 leaving your site/);
  assert.equal((await b.post(`/litters/${gem}/keep`)).status, 303);
  const l = b.row('SELECT * FROM litters WHERE id = ?', gem);
  assert.equal(l.stage, 'past');
  assert.equal(l.show_on_site, 1);
  assert.equal(l.left_site_at, null);
  await runCleanup(b.env, new Date(Date.now() + 40 * 86400000));
  assert.equal(b.row('SELECT COUNT(*) AS n FROM litters WHERE id = ?', gem).n, 1);
  // A dog is never deleted by a clock: it waits under Not on your site.
  const willow = b.row("SELECT id FROM dogs WHERE slug = 'willow'").id;
  b.env.DB.raw.prepare('UPDATE dogs SET show_on_site = 0 WHERE id = ?').run(willow);
  assert.match(await (await b.get('/dogs')).text(), /Not on your site[\s\S]*Willow/);
  await runCleanup(b.env, new Date(Date.now() + 400 * 86400000));
  assert.equal(b.row('SELECT COUNT(*) AS n FROM dogs WHERE id = ?', willow).n, 1);
});

test('Use my KennelOS prices: off, KennelOS sends none here; on, they arrive read-only', async () => {
  const b = await breeder();
  const token = await linked(b);
  const send = (body) => api(b.env, '/v1/bundle', { body, token });
  const litter = { id: 'l1', name: 'Spring', born_on: '2026-10-01', prices: { price_female: 3000, full_reg_female: 500, deposit_female: 500 }, puppies: [] };
  await send(bundle({ litters: [litter], extras: [{ id: 'x1', name: 'Crate', price_from: 90 }] }));
  assert.equal(b.row("SELECT price_female FROM litters WHERE kennelos_id = 'l1'").price_female, null);
  assert.equal(b.row("SELECT price_from FROM extras WHERE kennelos_id = 'x1'").price_from, null);
  await b.post('/kennelos/prices', { on: '1' });
  await send(bundle({ litters: [litter], extras: [{ id: 'x1', name: 'Crate', price_from: 90 }] }));
  assert.equal(b.row("SELECT price_female FROM litters WHERE kennelos_id = 'l1'").price_female, 3000);
  assert.equal(b.row("SELECT price_from FROM extras WHERE kennelos_id = 'x1'").price_from, 90);
  const id = b.row("SELECT id FROM litters WHERE kennelos_id = 'l1'").id;
  assert.match(await (await b.get(`/litters/${id}`)).text(), /3000 <span class="muted small">· from KennelOS/);
});

test('prices are one number, worked out from the litter, shown only where switched on', async () => {
  const l = { price_female: 3000, full_reg_female: 500, price_male: null, full_reg_male: null };
  assert.deepEqual(puppyPrice(l, { sex: 'female', registration: 'limited' }), { from: 3000, to: 3000 });
  assert.deepEqual(puppyPrice(l, { sex: 'female', registration: 'full' }), { from: 3500, to: 3500 });
  assert.deepEqual(puppyPrice(l, { sex: 'male' }), { from: 3000, to: 3500 }); // blank sex: the other's
  assert.deepEqual(puppyPrice(l, { sex: 'male', price: 2000 }), { from: 2000, to: 2000 });
  assert.deepEqual(litterPriceRange({ price_female: 3000, price_male: 2800, full_reg_male: 400 }, []), { from: 2800, to: 3400 }); // a girl's surcharge blank: the boy's

  const b = await breeder();
  const gem = b.row("SELECT id FROM litters WHERE slug = 'gem-2026'").id;
  await b.post('/publish');
  const off = await b.page('/litters/gem-2026');
  assert.match(off, /Contact us for pricing/);
  assert.doesNotMatch(off, /\$3,/);
  await b.post(`/litters/${gem}`, { name: 'The Gem litter', stage: 'current', slug: 'gem-2026', born_on: '2026-10-28', ready_on: '2026-12-23', dam_id: b.row("SELECT id FROM dogs WHERE slug = 'willow'").id, show_on_site: '1', show_placed: '1', show_prices: '1', price_female: '3000', full_reg_female: '500', price_note: 'Intended base prices.' });
  const opal = b.row("SELECT id FROM puppies WHERE slug = 'opal'").id;
  await b.post(`/litters/${gem}/puppies/${opal}`, { name: 'Opal', sex: 'female', status: 'available', registration: 'full', slug: 'opal' });
  await b.post('/publish');
  const on = await b.page('/litters/gem-2026');
  assert.match(on, /\$3,000–\$3,500/); // the litter: girls limited to full; boys follow the girls
  assert.match(on, /Intended base prices\./);
  assert.match(await b.page('/litters/gem-2026/opal'), /Price<\/dt><dd>\$3,500/);
  // Reserved puppies never show a price.
  assert.doesNotMatch(await b.page('/litters/gem-2026/onyx'), /\$3,/);
  assert.doesNotMatch(on, /\+\$500/);
});

test('the Dogs page: girls and boys, Up and coming, Looking for a home with Ask', async () => {
  const b = await breeder();
  const ziva = b.row("SELECT id FROM dogs WHERE slug = 'ziva'").id;
  const peaches = b.row("SELECT id FROM dogs WHERE slug = 'peaches'").id;
  b.env.DB.raw.prepare('UPDATE dogs SET upcoming = 1 WHERE id = ?').run(peaches);
  b.env.DB.raw.prepare('UPDATE dogs SET for_sale = 1, price = 1500 WHERE id = ?').run(ziva);
  b.env.DB.raw.prepare('UPDATE sites SET show_other_prices = 0 WHERE id = ?').run(b.site.id);
  await b.post('/publish');
  const html = await b.page('/dogs');
  assert.match(html, /id="all-dogs"[\s\S]*Willow[\s\S]*id="up-and-coming"[\s\S]*Peaches[\s\S]*id="looking-for-a-home"[\s\S]*Ziva/);
  assert.match(html, /Ask about Ziva/);
  assert.match(html, /Contact us for pricing/);
  assert.doesNotMatch(html, /\$1,500/);
  b.env.DB.raw.prepare('UPDATE sites SET show_other_prices = 1 WHERE id = ?').run(b.site.id);
  await b.post('/publish');
  assert.match(await b.page('/dogs/ziva'), /Looking for a home · \$1,500/);
  // Home's dogs row keeps to the breeding dogs.
  const home = await b.page('/');
  assert.doesNotMatch(home.match(/Meet our Bostons[\s\S]*?<\/section>/)[0], /Ziva|Peaches/);
});

test('Unlink: every device stops and everything from KennelOS is hers to edit', async () => {
  const b = await breeder();
  const token = await linked(b);
  await api(b.env, '/v1/bundle', { body: bundle({ dogs: [DOG('d1', 'Nova'), DOG('d2', 'Gone')] }), token });
  await api(b.env, '/v1/bundle', { body: bundle({ dogs: [DOG('d1', 'Nova')] }), token });
  assert.equal(b.row("SELECT hidden_by_kennelos FROM dogs WHERE kennelos_id = 'd2'").hidden_by_kennelos, 1);
  assert.equal((await b.post('/kennelos/unlink')).status, 303);
  assert.equal(b.row("SELECT COUNT(*) AS n FROM dogs WHERE source = 'kennelos' OR kennelos_id IS NOT NULL").n, 0);
  const gone = b.row("SELECT * FROM dogs WHERE call_name = 'Gone'");
  assert.equal(gone.hidden_by_kennelos, 0);
  assert.equal(gone.show_on_site, 0);
  const res = await api(b.env, '/v1/bundle', { body: bundle(), token });
  assert.equal(res.status, 401);
  assert.match((await res.json()).message, /no longer linked/);
  const id = b.row("SELECT id FROM dogs WHERE call_name = 'Nova'").id;
  assert.match(await (await b.get(`/dogs/${id}`)).text(), /name="call_name"/);
});

test('stopping one device leaves the others; KennelOS can stop its own', async () => {
  const b = await breeder();
  const t1 = await linked(b);
  const t2 = await linked(b);
  assert.equal(b.row('SELECT COUNT(*) AS n FROM links WHERE revoked_at IS NULL').n, 2);
  assert.equal((await api(b.env, '/v1/link', { method: 'DELETE', token: t1 })).status, 200);
  assert.equal((await api(b.env, '/v1/link', { method: 'GET', token: t1 })).status, 401);
  assert.equal((await api(b.env, '/v1/link', { method: 'GET', token: t2 })).status, 200);
});

test('steps, How to pay, extras and her public list come with a bundle; whether they show stays hers', async () => {
  const b = await breeder();
  const token = await linked(b);
  const send = (body) => api(b.env, '/v1/bundle', { body, token });
  const ownSteps = b.row("SELECT COUNT(*) AS n FROM steps WHERE site_id = ?", b.site.id).n;
  await send(bundle({
    waitlist_public_id: 'kos1_12345678-1234-1234-1234-123456789abc',
    steps: [{ id: 's1', heading: 'Apply', body: 'Fill in the form.' }, { id: 's2', heading: 'Choose', body: 'When it is your turn.' }],
    payment: { deposit: { title: 'Deposit', methods: [['Venmo', '@ak']], note: 'Your name' } },
    extras: [{ id: 'x1', name: 'Crate', group: 'Gear', description: 'A wire crate.' }],
  }));
  const steps = b.rows('SELECT heading, source, sort FROM steps WHERE site_id = ? ORDER BY sort', b.site.id);
  assert.deepEqual(steps.slice(0, 2).map((x) => [x.heading, x.source]), [['Apply', 'kennelos'], ['Choose', 'kennelos']]);
  assert.equal(steps.length, ownSteps + 2); // hers follow KennelOS's
  const pay = b.row("SELECT * FROM payment_info WHERE kind = 'deposit'");
  assert.equal(pay.source, 'kennelos');
  assert.equal(JSON.parse(pay.content).methods[0][1], '@ak');
  assert.match(await (await b.get('/payment')).text(), /Filled from your waitlist settings in KennelOS/);
  assert.equal(b.row("SELECT grp FROM extras WHERE kennelos_id = 'x1'").grp, 'Gear');
  assert.equal(b.row('SELECT kennelos_public_id FROM sites WHERE id = ?', b.site.id).kennelos_public_id, 'kos1_12345678-1234-1234-1234-123456789abc');
  // A bundle with no steps leaves them be; an extra no longer sent goes.
  await send(bundle({ extras: [] }));
  assert.equal(b.row("SELECT COUNT(*) AS n FROM steps WHERE source = 'kennelos'").n, 2);
  assert.equal(b.row("SELECT COUNT(*) AS n FROM extras WHERE kennelos_id = 'x1'").n, 0);
});

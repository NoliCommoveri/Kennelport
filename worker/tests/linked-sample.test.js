// The linked sample (docs/Linked_Sample_Plan.md, step 1): Tuxedo Lane Bostons*, a
// made-up kennel's first website bundle and family feed. It must use every field
// and every value the packages take, so it stays complete as they grow, and it must
// land on a linked site with the portal on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';
import { bundle, feed, load } from './fixtures/linked-sample/sample.js';

const { BUNDLE_SHAPES, BUNDLE_TOP, cleanBundle } = await import('../src/kennelos/bundle.js');
const { FEED_SHAPES, FEED_TOP, cleanFeed } = await import('../src/portal/feed.js');

const M = 'manage.kennelport.com';
const API = 'api.kennelport.com';
const form = (o) => new URLSearchParams(o);

// Every record of each shape in a package, found by following the shapes.
function collect(shapes, top, pkg) {
  const seen = Object.fromEntries(Object.keys(shapes).map((k) => [k, []]));
  const walk = (name, obj) => {
    if (!obj) return;
    seen[name].push(obj);
    for (const [k, f] of Object.entries(shapes[name])) {
      if (f.list && f.list in shapes) for (const x of obj[k] ?? []) walk(f.list, x);
      if (f.object) walk(f.object, obj[k]);
    }
  };
  for (const [key, name] of Object.entries(top)) {
    const v = pkg[key];
    if (name === 'payment') for (const x of Object.values(v ?? {})) walk('pay', x);
    else if (Array.isArray(v)) v.forEach((x) => walk(name, x));
    else walk(name, v);
  }
  return seen;
}
const filled = (v) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);

// What's missing: a field no record fills, an enum value no record uses, a yes/no
// never yes.
function missing(shapes, seen) {
  const out = [];
  for (const [name, fields] of Object.entries(shapes)) {
    const rows = seen[name];
    if (!rows.length) { out.push(`${name}: no record at all`); continue; }
    for (const [k, f] of Object.entries(fields)) {
      const vals = rows.map((r) => r[k]).filter(filled);
      if (!vals.length) out.push(`${name}.${k}: never filled`);
      const values = f.values;
      if (values) for (const v of values) if (!vals.includes(v)) out.push(`${name}.${k}: never "${v}"`);
      if (f.type === 'bool' && !vals.includes(true)) out.push(`${name}.${k}: never true`);
    }
  }
  return out;
}

const BUNDLE_PARTS = { dogs: 'dog', litters: 'litter', pairings: 'pairing', heats: 'heat', extras: 'extra', products: 'product', steps: 'step', partner_kennels: 'partner_kennel', payment: 'payment' };
const FEED_PARTS = { families: 'family', vet: 'vet', removed: 'removed' };

test('the sample uses every section, field and value the website bundle takes', () => {
  const b = load('bundle-1.json');
  for (const k of BUNDLE_TOP) assert.ok(k in b, `bundle-1 has no "${k}"`);
  assert.deepEqual(Object.keys(BUNDLE_PARTS).filter((k) => !BUNDLE_TOP.includes(k)), [], 'a part named here that the bundle no longer takes');
  const gaps = missing(BUNDLE_SHAPES, collect(BUNDLE_SHAPES, BUNDLE_PARTS, b));
  assert.deepEqual(gaps, [], `Add to tests/fixtures/linked-sample/bundle-1.json:\n  ${gaps.join('\n  ')}`);
  assert.deepEqual(Object.keys(b.payment).sort(), ['application_fee', 'deposit']);
});

test('the sample uses every section, field and value the family feed takes', () => {
  const f = load('feed-1.json');
  for (const k of FEED_TOP) assert.ok(k in f, `feed-1 has no "${k}"`);
  const gaps = missing(FEED_SHAPES, collect(FEED_SHAPES, FEED_PARTS, f));
  assert.deepEqual(gaps, [], `Add to tests/fixtures/linked-sample/feed-1.json:\n  ${gaps.join('\n  ')}`);
});

test('both packages pass KennelPort\'s checks, as written and moved to any day', () => {
  for (const today of [null, '2026-11-05', '2031-02-28']) {
    assert.doesNotThrow(() => cleanBundle(bundle(1, today)));
    assert.doesNotThrow(() => cleanFeed(feed(1, today)));
  }
  // Moving keeps the gaps: deposits still three weeks ahead, the vet window open.
  const moved = bundle(1, '2027-03-10');
  const spice = moved.litters.find((l) => l.id === 'lit-b');
  assert.equal(spice.deposits_on, '2027-03-31');
  assert.equal(moved.heats.find((h) => h.id === 'heat-h1').month, '2027-06');
  assert.equal(feed(1, '2027-03-10').families.find((x) => x.id === 'fam-hale').placements[0].pickup_at, '2027-03-07T16:00:00.000Z');
});

test('the sample lands on a linked site with the portal on', async () => {
  const env = await makeEnv({ PORTAL_EMAIL_KEY: 'portal-test-key' });
  const site = await addSite(env, 'tuxedolane', { kennel_name: 'Tuxedo Lane Bostons*' });
  const ops = (await call(env, M, '/ops/login', { method: 'POST', body: form({ token: 'ops-token' }) })).headers.get('set-cookie').split(';')[0];
  await call(env, M, `/ops/sites/${site.id}/people`, { method: 'POST', headers: { cookie: ops }, body: form({ email: 'owner@example.com', role: 'owner' }) });
  await call(env, M, `/ops/sites/${site.id}/portal/on`, { method: 'POST', headers: { cookie: ops } });
  await call(env, M, '/signin', { method: 'POST', body: form({ email: 'owner@example.com' }), headers: { origin: `https://${M}` } });
  const code = env.DB.raw.prepare("SELECT subject FROM dev_outbox WHERE kind = 'code' ORDER BY id DESC").get().subject.match(/\d{6}/)[0];
  const cookie = (await call(env, M, '/signin/verify', { method: 'POST', body: form({ email: 'owner@example.com', code }), headers: { origin: `https://${M}` } })).headers.get('set-cookie').split(';')[0];
  const html = await (await call(env, M, '/s/tuxedolane/kennelos/code', { method: 'POST', headers: { cookie, origin: `https://${M}` } })).text();
  const linkCode = html.match(/class="code">([A-Z0-9-]+)</)[1];
  const { token } = await (await call(env, API, '/v1/link', { method: 'POST', body: JSON.stringify({ code: linkCode, kennel_id: 'kennel-sample' }), headers: { 'content-type': 'application/json' } })).json();
  const post = (path, body) => call(env, API, path, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` } });
  const today = new Date().toISOString().slice(0, 10);
  const row = (sql, ...a) => env.DB.raw.prepare(sql).get(...a);

  const rb = await post('/v1/bundle', bundle(1, today));
  assert.equal(rb.status, 200, await rb.clone().text());
  // expect-1.md
  assert.equal(row("SELECT COUNT(*) AS n FROM dogs WHERE site_id = ? AND source = 'kennelos'", site.id).n, 10);
  assert.equal(row("SELECT COUNT(*) AS n FROM puppies WHERE site_id = ? AND source = 'kennelos'", site.id).n, 11);
  assert.equal(row("SELECT COUNT(*) AS n FROM partner_kennels WHERE site_id = ?", site.id).n, 3);
  assert.equal(row("SELECT status FROM puppies WHERE site_id = ? AND kennelos_id = 'dog-topaz'", site.id).status, 'coming_soon');
  assert.equal(row("SELECT status, upcoming FROM dogs WHERE site_id = ? AND kennelos_id = 'dog-pippa'", site.id).upcoming, 1);
  assert.equal(row("SELECT status FROM dogs WHERE site_id = ? AND kennelos_id = 'dog-ginger'", site.id).status, 'remembered');
  assert.equal(row("SELECT lives_away FROM dogs WHERE site_id = ? AND kennelos_id = 'dog-bishop'", site.id).lives_away, 1);

  const rf = await post('/v1/portal', feed(1, today));
  assert.equal(rf.status, 200, await rf.clone().text());
});

// The linked sample (docs/Linked_Sample_Plan.md): Tuxedo Lane Bostons*, a made-up
// kennel, as KennelOS would send it. Step 1's bundle and feed must use every field
// and every value the packages take, so the sample stays complete as they grow.
// The series (bundles and feeds 1–5) must land in order on a linked site with the
// portal on, each step leaving the site as its expect-N.md says.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';
import { bundle, feed, load, SENT } from './fixtures/linked-sample/sample.js';

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

// A linked site with the portal on, and a way to post to it as KennelOS.
async function linkedSite() {
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
  const send = async (path, body) => {
    const r = await call(env, API, path, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` } });
    assert.equal(r.status, 200, await r.clone().text());
    return r.json();
  };
  const row = (sql, ...a) => env.DB.raw.prepare(sql).get(...a);
  return { env, site, send, row };
}

test('the sample lands on a linked site with the portal on', async () => {
  const { site, send, row } = await linkedSite();
  const today = new Date().toISOString().slice(0, 10);
  await send('/v1/bundle', bundle(1, today));
  // expect-1.md
  assert.equal(row("SELECT COUNT(*) AS n FROM dogs WHERE site_id = ? AND source = 'kennelos'", site.id).n, 10);
  assert.equal(row("SELECT COUNT(*) AS n FROM puppies WHERE site_id = ? AND source = 'kennelos'", site.id).n, 11);
  assert.equal(row("SELECT COUNT(*) AS n FROM partner_kennels WHERE site_id = ?", site.id).n, 3);
  assert.equal(row("SELECT status FROM puppies WHERE site_id = ? AND kennelos_id = 'dog-topaz'", site.id).status, 'coming_soon');
  assert.equal(row("SELECT status, upcoming FROM dogs WHERE site_id = ? AND kennelos_id = 'dog-pippa'", site.id).upcoming, 1);
  assert.equal(row("SELECT status FROM dogs WHERE site_id = ? AND kennelos_id = 'dog-ginger'", site.id).status, 'remembered');
  assert.equal(row("SELECT lives_away FROM dogs WHERE site_id = ? AND kennelos_id = 'dog-bishop'", site.id).lives_away, 1);
  await send('/v1/portal', feed(1, today));
});

// ---------- the series ----------

const { buildSnapshot } = await import('../src/publish.js');
const { renderPage } = await import('../src/render/index.js');
const { leavingLitters } = await import('../src/kennelos/clock.js');

const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();

// The Puppies page as a visitor reads it: each section's id and words.
async function puppiesPage(env, site, today) {
  const snap = await buildSnapshot(env, site.id);
  const page = (path) => renderPage(snap, { path, origin: 'https://tuxedolane.kennelport.com', today, preview: false, portal: true });
  const { html } = page('/litters');
  const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
  const sections = main.split('<section').slice(1).map((s) => ({ id: s.match(/^[^>]*id="([^"]+)"/)?.[1] ?? null, words: text(`<x${s}`) }));
  // A litter on offer has its own section (the first one's id is "available").
  const where = (name) => sections.filter((s) => s.words.includes(name)).map((s) => (!s.id || s.id === 'available' ? 'current' : s.id));
  const older = page('/litters/older');
  return { snap, page, sections, where, older: older.status === 200 ? text(older.html.slice(older.html.indexOf('<main'))) : '' };
}

// Each step is sent on its own day (sample.js SENT), and the Worker's clock is set
// to it, so the files are posted as written and the expect files can name dates.
test('the series: each bundle and feed, in order, leaves the site as its expect file says', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse(`${SENT[1]}T15:00:00Z`) });
  const { env, site, send, row } = await linkedSite();
  const at = (step) => { t.mock.timers.setTime(Date.parse(`${SENT[step]}T15:00:00Z`)); return SENT[step]; };
  const pup = (kos) => row('SELECT * FROM puppies WHERE site_id = ? AND kennelos_id = ?', site.id, kos);
  const litter = (kind, kos) => row('SELECT * FROM litters WHERE site_id = ? AND kennelos_kind = ? AND kennelos_id = ?', site.id, kind, kos);
  const family = (kos) => row('SELECT * FROM portal_families WHERE site_id = ? AND kennelos_id = ?', site.id, kos);
  const placement = (kos) => row('SELECT * FROM portal_placements WHERE site_id = ? AND kennelos_id = ?', site.id, kos);
  const n = (sql, ...a) => row(`SELECT COUNT(*) AS n FROM ${sql}`, site.id, ...a).n;

  // ----- 1 (expect-1.md) -----
  let today = at(1);
  await send('/v1/bundle', load('bundle-1.json'));
  await send('/v1/portal', load('feed-1.json'));
  let p = await puppiesPage(env, site, today);
  assert.deepEqual(p.where('The Gem litter*'), ['current']);
  assert.deepEqual(p.where('The Summer litter*'), ['older']);
  assert.deepEqual(p.where('The Spice litter*'), ['upcoming']);
  assert.match(p.sections.find((s) => s.id === 'upcoming').words, /The Spice litter\* .*Deposits from November 22, 2026/);
  for (const name of ['Wren* × Moose*', 'Juniper* × Atlas*', 'Our next litter', "Lulu* (a friend's girl)'s next litter"]) assert.deepEqual(p.where(name), ['upcoming'], name);
  assert.match(p.older, /Sunny\*/);
  assert.doesNotMatch(p.page('/litters/the-gem-litter').html, /Garnet\*/);
  assert.equal(pup('dog-ruby').status, 'reserved');
  assert.equal(n("portal_placements WHERE site_id = ? AND status = 'open'"), 4);
  // Her own wording and a photo on litter A, to see them come back at step 5.
  const gem = litter('litter', 'lit-a');
  env.DB.raw.prepare('UPDATE litters SET summary = ? WHERE id = ?').run('Our gem of a litter.', gem.id);
  env.DB.raw.prepare('UPDATE puppies SET bio = ? WHERE id = ?').run('Pearl* loves the water bowl.', pup('dog-pearl').id);

  // ----- 2 (expect-2.md) -----
  today = at(2);
  await send('/v1/bundle', load('bundle-2.json'));
  await send('/v1/portal', load('feed-2.json'));
  assert.equal(pup('dog-onyx').status, 'placed');
  assert.equal(pup('dog-pearl').status, 'reserved');
  assert.equal(n("health_results WHERE site_id = ? AND dog_id = (SELECT id FROM dogs WHERE kennelos_id = 'dog-maple')"), 2);
  assert.equal(placement('sale-ruby').pickup_booked_at, '2026-11-22T16:00:00.000Z');
  assert.equal(placement('sale-pearl').status, 'open');
  assert.equal(placement('sale-pearl').puppy_id, pup('dog-pearl').id);
  p = await puppiesPage(env, site, today);
  assert.match(p.page('/litters/the-gem-litter').html, /Pearl\*[\s\S]*Reserved/);

  // ----- 3 (expect-3.md) -----
  today = at(3);
  const p1 = litter('pairing', 'pr-p1');
  const h1 = litter('heat', 'heat-h1');
  await send('/v1/bundle', load('bundle-3.json'));
  await send('/v1/portal', load('feed-3.json'));
  const d = litter('litter', 'lit-d');
  assert.equal(d.id, p1.id, 'litter D is the website litter made from P1');
  assert.deepEqual([d.name, d.slug, d.stage, d.plan_label], ['The Forest litter*', 'the-forest-litter', 'current', null]);
  assert.equal(n('puppies WHERE site_id = ? AND litter_id = ?', d.id), 4);
  const p2 = litter('pairing', 'pr-p2');
  assert.equal(p2.id, h1.id, 'pairing P2 is the website litter made from heat H1');
  assert.deepEqual([p2.name, p2.plan_label, p2.expected_label], ['Maple* × Bishop*', 'Planned pairing', 'April 2027']);
  assert.equal(litter('heat', 'heat-h1'), undefined);
  p = await puppiesPage(env, site, today);
  assert.deepEqual(p.where('The Forest litter*'), ['upcoming'], 'deposits open January 2');
  assert.deepEqual(p.where('The Spice litter*'), ['current'], 'deposits open: its own section');
  assert.doesNotMatch(p.page('/litters/the-spice-litter').html, /Available on/);
  assert.match(text(p.page('/litters/the-spice-litter/sage').html), /Sage\* .*Available/);
  assert.equal(pup('dog-ruby').status, 'placed');
  assert.equal(n('portal_health_records WHERE site_id = ? AND placement_id = ?', placement('sale-ruby').id), 3);

  // ----- 4 (expect-4.md) -----
  today = at(4);
  await send('/v1/bundle', load('bundle-4.json'));
  await send('/v1/portal', load('feed-4.json'));
  assert.equal(litter('litter', 'lit-a').hidden_by_kennelos, 1);
  assert.deepEqual((await leavingLitters(env, site.id)).map((l) => [l.name, l.deletes_on]), [['The Gem litter*', '2027-02-14']]);
  assert.equal(row("SELECT hidden_by_kennelos FROM dogs WHERE site_id = ? AND kennelos_id = 'dog-ginger'", site.id).hidden_by_kennelos, 1);
  assert.equal(row("SELECT name FROM partner_kennels WHERE site_id = ? AND kennelos_id = 'pk-harbor'", site.id).name, 'Harbor Light Bostons*');
  assert.ok(family('fam-cho').kennelos_gone_at);
  p = await puppiesPage(env, site, today);
  assert.deepEqual(p.where('The Gem litter*'), []);
  assert.equal(p.page('/litters/the-gem-litter').status, 404);
  assert.deepEqual(p.where('The Forest litter*'), ['current']);
  assert.match(p.older, /Sunny\*.*Sage\*|Sage\*.*Sunny\*/);

  // ----- 5 (expect-5.md) -----
  today = at(5);
  await send('/v1/bundle', load('bundle-5.json'));
  await send('/v1/portal', load('feed-5.json'));
  const back = litter('litter', 'lit-a');
  assert.deepEqual([back.id, back.hidden_by_kennelos, back.left_site_at, back.summary], [gem.id, 0, null, 'Our gem of a litter.']);
  assert.equal(pup('dog-pearl').bio, 'Pearl* loves the water bowl.');
  assert.deepEqual(await leavingLitters(env, site.id), []);
  assert.deepEqual([placement('sale-pearl').status, placement('sale-pearl').closed_reason], ['closed', 'backed_out']);
  assert.equal(pup('dog-pearl').status, 'available');
  p = await puppiesPage(env, site, today);
  for (const name of ['Sunny*', 'Sage*', 'Pearl*']) assert.match(p.older, new RegExp(name.replace('*', '\\*')), name);
});

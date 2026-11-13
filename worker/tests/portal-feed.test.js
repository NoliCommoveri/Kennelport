// The Puppy Parent Portal, build chunk 3 (docs/plans/family-portal.md 3.1 and
// 3.4): the KennelOS family feed, her edits winning, tombstones, a voided sale, the
// facts that go back, and the status page's one-tap link.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';

const M = 'manage.kennelport.com';
const H = 'akbostons.kennelport.com';
const API = 'api.kennelport.com';
const KENNEL = 'kennel-1';
const form = (o) => new URLSearchParams(o);
const outbox = (env) => env.DB.raw.prepare('SELECT kind, subject, body FROM dev_outbox ORDER BY id').all();
const DAY = 86400000;

const { makeHandoffToken } = await import('../src/portal/feed.js');
const { hmacHex } = await import('../src/lib/crypto.js');
const { runPortalHourly } = await import('../src/portal/reminders.js');
const { runPortalDaily } = await import('../src/portal/account.js');

async function setup({ on = true } = {}) {
  const env = await makeEnv({ PORTAL_EMAIL_KEY: 'portal-test-key' });
  const site = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  const ops = (await call(env, M, '/ops/login', { method: 'POST', body: form({ token: 'ops-token' }) })).headers.get('set-cookie').split(';')[0];
  await call(env, M, `/ops/sites/${site.id}/people`, { method: 'POST', headers: { cookie: ops }, body: form({ email: 'breeder@example.com', role: 'owner' }) });
  await call(env, M, '/signin', { method: 'POST', body: form({ email: 'breeder@example.com' }), headers: { origin: `https://${M}` } });
  const code = outbox(env).at(-1).subject.match(/(\d{6})/)[1];
  const breeder = (await call(env, M, '/signin/verify', { method: 'POST', body: form({ email: 'breeder@example.com', code }), headers: { origin: `https://${M}` } })).headers.get('set-cookie').split(';')[0];
  if (on) await call(env, M, `/ops/sites/${site.id}/portal/on`, { method: 'POST', headers: { cookie: ops } });
  const t = new Date().toISOString();
  env.DB.raw.prepare("INSERT INTO litters (id, site_id, slug, name, stage, born_on, created_at, updated_at, source, kennelos_id) VALUES ('lit1', ?, 'winter', 'Winter litter', 'current', '2026-10-20', ?, ?, 'kennelos', 'kl1')").run(site.id, t, t);
  for (const [id, name, kos] of [['pup1', 'Opal', 'dog-opal'], ['pup2', 'Ruby', 'dog-ruby']]) {
    env.DB.raw.prepare("INSERT INTO puppies (id, site_id, litter_id, slug, name, sex, created_at, updated_at, source, kennelos_id) VALUES (?, ?, 'lit1', ?, ?, 'female', ?, ?, 'kennelos', ?)").run(id, site.id, id, name, t, t, kos);
  }
  const her = (path, body) => call(env, M, `/s/akbostons${path}`, body ? { method: 'POST', body: form(body), headers: { cookie: breeder, origin: `https://${M}` } } : { headers: { cookie: breeder } });
  // Link a KennelOS device.
  const html = await (await her('/kennelos/code', {})).text();
  const linkCode = html.match(/class="code">([A-Z0-9-]+)</)[1];
  const token = (await (await call(env, API, '/v1/link', { method: 'POST', body: JSON.stringify({ code: linkCode, kennel_id: KENNEL }), headers: { 'content-type': 'application/json' } })).json()).token;
  let n = 0;
  const feed = async (extra = {}) => call(env, API, '/v1/portal', {
    method: 'POST', body: JSON.stringify({ format: 1, feed_id: `feed-${++n}`, kennel_id: KENNEL, ...extra }),
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
  });
  const row = (sql, ...a) => env.DB.raw.prepare(sql).get(...a);
  return { env, site, her, feed, row, token };
}

const go = new Date(Date.now() + 9 * DAY).toISOString().slice(0, 10);
const REED = (more = {}, pl = {}) => ({
  id: 'fam-reed', name: 'The Reed family', emails: ['sam@example.com', 'Alex@Example.com'], status_url: 'https://status.kennelos.app/s/abc',
  placements: [{ id: 'sale-1', puppy_id: 'dog-opal', puppy_name: 'Opal', contract_signed_on: '2026-11-01', go_home_on: go, microchip: '985000000000001',
    health: [{ id: 'ev-1', type: 'vaccine', given_on: '2026-11-03', name: 'DHPP, first round' }], ...pl }],
  ...more,
});

test('the feed is refused unless the portal is on, and refuses fields it doesn\'t know', async () => {
  const off = await setup({ on: false });
  const r1 = await off.feed({ families: [REED()] });
  assert.equal(r1.status, 409);
  assert.equal((await r1.json()).error, 'portal_off');
  const { feed } = await setup();
  const r2 = await feed({ families: [REED({ phone: '555' })] });
  assert.equal(r2.status, 400);
  assert.match((await r2.json()).message, /families\[0\]\.phone: not a field KennelPort takes/);
  assert.equal((await feed({ families: [REED({}, { contract_signed_on: 'soon' })] })).status, 400);
  assert.equal((await call((await setup()).env, API, '/v1/portal', { method: 'POST', body: '{}', headers: { 'content-type': 'application/json' } })).status, 401);
});

test('a signed contract arrives as a family to invite, with the puppy, the pickup and the shots', async () => {
  const { env, her, feed, row } = await setup();
  const res = await feed({ families: [REED({}, { pickup_at: `${go}T16:00:00Z` })] });
  assert.equal(res.status, 200);
  const out = await res.json();
  assert.equal(out.summary.families_new, 1);
  assert.equal(out.summary.placements_new, 1);
  assert.equal(out.summary.health_new, 1);
  assert.match(out.portal.handoff_key, /^[0-9a-f]{64}$/);
  const fam = row("SELECT * FROM portal_families WHERE kennelos_id = 'fam-reed'");
  assert.equal(fam.source, 'kennelos');
  assert.equal(fam.invited_at, null);
  assert.equal(row('SELECT COUNT(*) AS n FROM portal_emails WHERE family_id = ?', fam.id).n, 2);
  assert.doesNotMatch(JSON.stringify(env.DB.raw.prepare('SELECT * FROM portal_emails').all()), /example\.com/);
  const p = row('SELECT * FROM portal_placements WHERE family_id = ?', fam.id);
  assert.equal(p.puppy_id, 'pup1');
  assert.equal(p.microchip, '985000000000001');
  assert.equal(p.pickup_booked_at, `${go}T16:00:00.000Z`);
  assert.equal(p.contract_signed_on, '2026-11-01');
  // Nothing is sent to the family: the invite is hers to send, from Today.
  assert.equal(outbox(env).filter((m) => m.kind === 'family_invite').length, 0);
  const today = await (await her('')).text();
  assert.match(today, /Invite The Reed family/);
  const screen = await (await her(`/portal/f/${fam.id}`)).text();
  assert.match(screen, /From KennelOS, last sent just now/);
  assert.match(screen, /DHPP, first round/);
  // The same feed again changes nothing.
  const again = await (await feed({ families: [REED({}, { pickup_at: `${go}T16:00:00Z` })] })).json();
  assert.deepEqual(again.summary, {});
});

test('a family she typed in is linked by address, not doubled', async () => {
  const { her, feed, row } = await setup();
  const res = await her('/portal/new', { name: 'Reeds', emails: 'sam@example.com', puppy_id: 'pup1' });
  const id = res.headers.get('location').match(/\/f\/([0-9a-f-]{36})/)[1];
  const out = await (await feed({ families: [REED()] })).json();
  assert.equal(out.summary.families_linked, 1);
  assert.equal(out.summary.placements_linked, 1);
  assert.equal(row('SELECT COUNT(*) AS n FROM portal_families').n, 1);
  assert.equal(row('SELECT kennelos_id FROM portal_families WHERE id = ?', id).kennelos_id, 'fam-reed');
  assert.equal(row('SELECT COUNT(*) AS n FROM portal_emails WHERE family_id = ?', id).n, 2);
  // What she typed stays hers; KennelOS's different name and the blank go-home it fills.
  assert.equal(row('SELECT name FROM portal_families WHERE id = ?', id).name, 'Reeds');
  assert.equal(out.summary.suggestions, 1);
  assert.equal(row('SELECT go_home_on FROM portal_placements WHERE family_id = ?', id).go_home_on, go);
});

test('her edits win: KennelOS\'s newer value waits for "use it" or "ignore"', async () => {
  const { her, feed, row } = await setup();
  await feed({ families: [REED()] });
  const fam = row("SELECT id FROM portal_families WHERE kennelos_id = 'fam-reed'");
  const p = row('SELECT * FROM portal_placements WHERE family_id = ?', fam.id);
  await her(`/portal/f/${fam.id}/placement`, { puppy_id: 'pup1', call_name: 'Opal Mae', go_home_on: go, microchip: '985000000000999', registration_no: '', pickup_day: '', pickup_time: '' });
  const out = await (await feed({ families: [REED({}, { microchip: '985000000000002', go_home_on: go })] })).json();
  assert.equal(out.summary.suggestions, 1);
  assert.equal(row('SELECT microchip FROM portal_placements WHERE id = ?', p.id).microchip, '985000000000999');
  // Her microchip goes back to KennelOS.
  assert.equal(out.facts.find((x) => x.id === 'sale-1').microchip, '985000000000999');
  let screen = await (await her(`/portal/f/${fam.id}`)).text();
  assert.match(screen, /KennelOS has a newer value<\/b> for Microchip: <strong>985000000000002/);
  await her(`/portal/f/${fam.id}/suggestion`, { tbl: 'portal_placements', field: 'microchip', act: 'ignore' });
  assert.doesNotMatch(await (await her(`/portal/f/${fam.id}`)).text(), /newer value/);
  // The same value isn't offered again; a different one is.
  assert.equal((await (await feed({ families: [REED({}, { microchip: '985000000000002' })] })).json()).summary.suggestions, undefined);
  await feed({ families: [REED({}, { microchip: '985000000000003' })] });
  screen = await (await her(`/portal/f/${fam.id}`)).text();
  assert.match(screen, /985000000000003/);
  await her(`/portal/f/${fam.id}/suggestion`, { tbl: 'portal_placements', field: 'microchip', act: 'use' });
  assert.equal(row('SELECT microchip FROM portal_placements WHERE id = ?', p.id).microchip, '985000000000003');
  assert.match(row("SELECT changed_by FROM portal_history WHERE row_id = ? AND field = 'microchip' ORDER BY id DESC", p.id).changed_by, /kennelos/);
  // Taken: the field follows KennelOS again.
  await feed({ families: [REED({}, { microchip: '985000000000004' })] });
  assert.equal(row('SELECT microchip FROM portal_placements WHERE id = ?', p.id).microchip, '985000000000004');
});

test('a sale voided because the pup died closes the placement and stops its reminders', async () => {
  const { env, her, feed, row } = await setup();
  await feed({ families: [REED({}, { go_home_on: new Date(Date.now() + 3 * DAY).toISOString().slice(0, 10) })] });
  const fam = row("SELECT id FROM portal_families WHERE kennelos_id = 'fam-reed'");
  await her(`/portal/f/${fam.id}/invite`, {});
  const out = await (await feed({ families: [REED({}, { voided: { reason: 'died', on: '2026-11-04' } })] })).json();
  assert.equal(out.summary.placements_closed, 1);
  const p = row('SELECT * FROM portal_placements WHERE family_id = ?', fam.id);
  assert.equal(p.status, 'closed');
  assert.equal(p.closed_reason, 'died');
  assert.equal(p.life_status, 'deceased');
  const before = outbox(env).length;
  await runPortalHourly(env);
  assert.equal(outbox(env).length, before);
  assert.match(await (await her('')).text(), /Opal&#39;s placement closed|Opal's placement closed/);
  // The replacement puppy's contract: a second placement on the same family.
  await feed({ families: [REED({}, { id: 'sale-2', puppy_id: 'dog-ruby', puppy_name: 'Ruby' })] });
  assert.equal(row("SELECT COUNT(*) AS n FROM portal_placements WHERE family_id = ? AND status = 'open'", fam.id).n, 1);
  assert.equal(row("SELECT puppy_name FROM portal_placements WHERE family_id = ? AND status = 'open'", fam.id).puppy_name, 'Ruby');
});

test('gone from KennelOS is marked, not removed; deleted here stays deleted', async () => {
  const { env, her, feed, row } = await setup();
  await feed({ families: [REED()] });
  const fam = row("SELECT id FROM portal_families WHERE kennelos_id = 'fam-reed'");
  await feed({ removed: [{ type: 'family', id: 'fam-reed' }] });
  assert.ok(row('SELECT kennelos_gone_at FROM portal_families WHERE id = ?', fam.id).kennelos_gone_at);
  assert.match(await (await her(`/portal/f/${fam.id}`)).text(), /no longer in KennelOS/);
  assert.match(await (await her('')).text(), /The Reed family: no longer in KennelOS/);
  // A health record she removes, and then the family she deletes, never come back.
  const rec = row("SELECT id FROM portal_health_records WHERE kennelos_id = 'ev-1'");
  const pid = row('SELECT id FROM portal_placements WHERE family_id = ?', fam.id).id;
  await her(`/portal/f/${fam.id}/record/${rec.id}/remove`, {});
  await feed({ families: [REED()] });
  assert.equal(row('SELECT COUNT(*) AS n FROM portal_health_records WHERE placement_id = ?', pid).n, 0);
  await her(`/portal/f/${fam.id}/delete`, { confirm: 'delete' });
  const out = await (await feed({ families: [REED()] })).json();
  assert.equal(out.summary.skipped_deleted, 1);
  // Gone for good after 30 days; still not brought back.
  await runPortalDaily(env, new Date(Date.now() + 31 * DAY));
  assert.equal(row('SELECT COUNT(*) AS n FROM portal_families').n, 0);
  assert.equal((await (await feed({ families: [REED()] })).json()).summary.skipped_deleted, 1);
  // The tombstone holds no address; the family's keeps the name she knew them by, to give them back.
  assert.doesNotMatch(JSON.stringify(env.DB.raw.prepare('SELECT * FROM portal_tombstones').all()), /example/);
  assert.equal(row("SELECT label FROM portal_tombstones WHERE type = 'family'").label, 'The Reed family · Opal');
});

test('the facts that go back: the real pickup time, then portal only', async () => {
  const { her, feed, row } = await setup();
  await feed({ families: [REED({}, { pickup_at: new Date(Date.now() - 2 * 3600000).toISOString() })] });
  const fam = row("SELECT id FROM portal_families WHERE kennelos_id = 'fam-reed'");
  let out = await (await feed({ families: [REED()] })).json();
  assert.equal(out.facts.length, 0);
  await her(`/portal/f/${fam.id}/picked-up`, {});
  out = await (await feed({ families: [REED({}, { pickup_at: new Date(Date.now() + 5 * DAY).toISOString() })] })).json();
  const f = out.facts.find((x) => x.id === 'sale-1');
  assert.equal(f.family_id, 'fam-reed');
  assert.equal(f.portal_only, true);
  assert.ok(f.picked_up_at);
  // Once home, a booked time from KennelOS moves nothing.
  assert.equal(row('SELECT picked_up_at FROM portal_placements WHERE family_id = ?', fam.id).picked_up_at, f.picked_up_at);
});

test('the status page\'s one tap signs the family in, once, for ten minutes', async () => {
  const { env, site, feed, row } = await setup();
  const { portal } = await (await feed({ families: [REED()] })).json();
  assert.equal(portal.handoff_url, 'https://akbostons.kennelport.com/family/handoff');
  const t = await makeHandoffToken(portal.handoff_key, 'fam-reed');
  const res = await call(env, H, `/family/handoff?t=${t}`);
  assert.equal(res.status, 303);
  const cookie = res.headers.get('set-cookie').split(';')[0];
  const home = await (await call(env, H, '/family', { headers: { cookie } })).text();
  assert.match(home, /Opal/);
  assert.match(home, /status\.kennelos\.app\/s\/abc/);
  // Used: refused. Old, forged, or for a family not here: refused.
  assert.match(await (await call(env, H, `/family/handoff?t=${t}`)).text(), /has been used or has expired/);
  const old = await makeHandoffToken(portal.handoff_key, 'fam-reed', Date.now() - 11 * 60000);
  assert.equal((await call(env, H, `/family/handoff?t=${old}`)).status, 200);
  assert.equal((await call(env, H, `/family/handoff?t=${await makeHandoffToken(await hmacHex('x', 'y'), 'fam-reed')}`)).headers.get('set-cookie'), null);
  assert.equal((await call(env, H, `/family/handoff?t=${await makeHandoffToken(portal.handoff_key, 'fam-other')}`)).headers.get('set-cookie'), null);
  // Unlinked: the key no longer works.
  env.DB.raw.prepare('UPDATE links SET revoked_at = ? WHERE site_id = ?').run(new Date().toISOString(), site.id);
  assert.equal((await call(env, H, `/family/handoff?t=${await makeHandoffToken(portal.handoff_key, 'fam-reed')}`)).headers.get('set-cookie'), null);
  assert.ok(row('SELECT COUNT(*) AS n FROM portal_handoffs').n >= 1);
});

test('her vet arrives as suggested contacts; a quiet feed shows on Today', async () => {
  const { env, site, her, feed, row } = await setup();
  await feed({ vet: { clinic: 'Maple Street Animal Hospital', phone: '555-201-3344' } });
  assert.equal(row('SELECT vet_clinic FROM portal_settings WHERE site_id = ?', site.id).vet_clinic, 'Maple Street Animal Hospital');
  await feed({ vet: { clinic: 'Oak Vets', phone: '555-201-3344' } });
  assert.equal(row('SELECT vet_clinic FROM portal_settings WHERE site_id = ?', site.id).vet_clinic, 'Maple Street Animal Hospital');
  assert.match(await (await her('/portal/settings')).text(), /KennelOS has<\/b> Vet&#39;s clinic: <strong>Oak Vets|KennelOS has<\/b> Vet's clinic: <strong>Oak Vets/);
  await her('/portal/settings/suggestion', { field: 'vet_clinic', act: 'use' });
  assert.equal(row('SELECT vet_clinic FROM portal_settings WHERE site_id = ?', site.id).vet_clinic, 'Oak Vets');

  await feed({ families: [REED()] });
  assert.doesNotMatch(await (await her('')).text(), /Open KennelOS so your families/);
  env.DB.raw.prepare('UPDATE sites SET portal_feed_at = ? WHERE id = ?').run(new Date(Date.now() - 30 * 3600000).toISOString(), site.id);
  assert.match(await (await her('')).text(), /Open KennelOS so your families/);
});

// ---------- the same family twice; deleting sooner; giving a family back ----------

const famIdOf = (res) => res.headers.get('location').match(/\/f\/([0-9a-f-]{36})/)[1];

test('a family\'s only typed placement is linked whatever puppy she chose, and KennelOS\'s puppy waits beside hers', async () => {
  const { her, feed, row } = await setup();
  const id = famIdOf(await her('/portal/new', { name: 'Reeds', emails: 'sam@example.com', puppy_id: 'pup2' }));
  const out = await (await feed({ families: [REED()] })).json();
  assert.equal(out.summary.placements_linked, 1);
  assert.equal(row('SELECT COUNT(*) AS n FROM portal_placements').n, 1);
  const p = row('SELECT * FROM portal_placements WHERE family_id = ?', id);
  assert.equal(p.kennelos_id, 'sale-1');
  assert.equal(p.puppy_id, 'pup2');
  assert.equal(row("SELECT value FROM portal_suggestions WHERE row_id = ? AND field = 'puppy_id'", p.id).value, 'pup1');
  assert.equal(row("SELECT COUNT(*) AS n FROM portal_health_records WHERE placement_id = ? AND kennelos_id = 'ev-1'", p.id).n, 1);
});

test('two puppy records on one family merge into KennelOS\'s: hers wins, KennelOS fills the blanks, everything moves', async () => {
  const { env, site, her, feed, row } = await setup();
  await feed({ families: [REED()] });
  const fam = row("SELECT id FROM portal_families WHERE kennelos_id = 'fam-reed'").id;
  const k = row('SELECT id FROM portal_placements WHERE family_id = ?', fam).id;
  // A record she typed onto the same family, with a name, a shot (one KennelOS has too) and a tick.
  const t = new Date().toISOString();
  env.DB.raw.prepare("INSERT INTO portal_placements (id, site_id, family_id, puppy_id, puppy_name, call_name, vet_clinic, created_at, updated_at) VALUES ('typed-1', ?, ?, NULL, 'Opal', 'Pip', 'Maple Vets', ?, ?)").run(site.id, fam, t, t);
  for (const [id, name] of [['hr1', 'DHPP, first round'], ['hr2', 'Pyrantel']]) env.DB.raw.prepare("INSERT INTO portal_health_records (id, site_id, placement_id, type, given_on, name, created_at) VALUES (?, ?, 'typed-1', ?, '2026-11-03', ?, ?)").run(id, site.id, id === 'hr1' ? 'vaccine' : 'deworming', name, t);
  env.DB.raw.prepare("INSERT INTO portal_placement_progress (site_id, placement_id, item_type, item_id, done_at, done_by, updated_at) VALUES (?, 'typed-1', 'checklist', 'item-1', ?, 'family', ?)").run(site.id, t, t);
  env.DB.raw.prepare("INSERT INTO portal_history (site_id, tbl, row_id, field, old_value, new_value, changed_at, changed_by) VALUES (?, 'portal_placements', 'typed-1', 'call_name', NULL, 'Pip', ?, 'breeder')").run(site.id, t);
  const list = await (await her('/portal')).text();
  assert.equal(list.match(/The Reed family<\/b>/g).length, 1);
  assert.match(list, /Twice: merge/);
  const screen = await (await her(`/portal/f/${fam}`)).text();
  assert.match(screen, /Two puppy records for this family/);
  const res = await her(`/portal/f/${fam}/merge-placement`, { from: 'typed-1', into: k });
  assert.match(res.headers.get('location'), /note=merged/);
  assert.equal(row('SELECT COUNT(*) AS n FROM portal_placements').n, 1);
  const p = row('SELECT * FROM portal_placements WHERE id = ?', k);
  assert.equal(p.call_name, 'Pip');
  assert.equal(p.vet_clinic, 'Maple Vets');
  assert.equal(p.puppy_id, 'pup1'); // hers was blank: KennelOS's stays
  assert.ok(JSON.parse(p.edited_fields).includes('call_name'));
  assert.deepEqual(env.DB.raw.prepare('SELECT name FROM portal_health_records WHERE placement_id = ? ORDER BY name').all(k).map((r) => r.name), ['DHPP, first round', 'Pyrantel']);
  assert.equal(row('SELECT COUNT(*) AS n FROM portal_placement_progress WHERE placement_id = ?', k).n, 1);
  assert.equal(row("SELECT COUNT(*) AS n FROM portal_history WHERE row_id = ? AND field = 'call_name'", k).n, 1);
  assert.doesNotMatch(await (await her(`/portal/f/${fam}`)).text(), /Two puppy records/);
  // KennelOS's next send updates the one record.
  await feed({ families: [REED()] });
  assert.equal(row('SELECT COUNT(*) AS n FROM portal_placements').n, 1);
});

test('a family she typed in under another address merges into KennelOS\'s, puppy records and all', async () => {
  const { her, feed, row } = await setup();
  const typed = famIdOf(await her('/portal/new', { name: 'Reeds', emails: 'other@example.com', puppy_id: 'pup1' }));
  await feed({ families: [REED()] });
  assert.equal(row('SELECT COUNT(*) AS n FROM portal_families').n, 2);
  const kos = row("SELECT id FROM portal_families WHERE kennelos_id = 'fam-reed'").id;
  assert.match(await (await her(`/portal/f/${typed}`)).text(), /The same family twice\?/);
  const res = await her(`/portal/f/${typed}/merge-family`, { other: kos });
  assert.match(res.headers.get('location'), new RegExp(`/f/${kos}\\?note=familymerged`));
  assert.equal(row('SELECT COUNT(*) AS n FROM portal_families').n, 1);
  assert.equal(row('SELECT COUNT(*) AS n FROM portal_emails WHERE family_id = ?', kos).n, 3);
  assert.equal(row('SELECT name FROM portal_families WHERE id = ?', kos).name, 'Reeds');
  assert.equal(row('SELECT COUNT(*) AS n FROM portal_placements').n, 1);
  const p = row('SELECT * FROM portal_placements');
  assert.equal(p.kennelos_id, 'sale-1');
  assert.equal(p.puppy_id, 'pup1');
});

test('Delete now makes it final today; Let KennelOS send them again brings the family back', async () => {
  const { her, feed, row } = await setup();
  await feed({ families: [REED()] });
  const fam = row("SELECT id FROM portal_families WHERE kennelos_id = 'fam-reed'").id;
  await her(`/portal/f/${fam}/delete`, { confirm: 'delete' });
  await her(`/portal/gone/${fam}`, { confirm: 'nope' });
  assert.equal(row('SELECT COUNT(*) AS n FROM portal_families').n, 1);
  assert.match((await her(`/portal/gone/${fam}`, { confirm: 'delete' })).headers.get('location'), /note=gonenow/);
  assert.equal(row('SELECT COUNT(*) AS n FROM portal_families').n, 0);
  assert.equal((await (await feed({ families: [REED()] })).json()).summary.skipped_deleted, 1);
  const list = await (await her('/portal')).text();
  assert.match(list, /Deleted for good/);
  assert.match(list, /The Reed family · Opal/);
  await her('/portal/giveback', { kennelos_id: 'fam-reed' });
  assert.equal(row('SELECT COUNT(*) AS n FROM portal_tombstones').n, 0);
  const out = await (await feed({ families: [REED()] })).json();
  assert.equal(out.summary.families_new, 1);
  assert.equal(out.summary.placements_new, 1);
  assert.equal(row("SELECT COUNT(*) AS n FROM portal_health_records WHERE kennelos_id = 'ev-1'").n, 1);
});

test('a family with two puppies from KennelOS is listed once, both named, with nothing to merge', async () => {
  const { her, feed } = await setup();
  const two = REED();
  two.placements.push({ id: 'sale-2', puppy_id: 'dog-ruby', puppy_name: 'Ruby', contract_signed_on: '2026-11-02' });
  await feed({ families: [two] });
  const list = await (await her('/portal')).text();
  assert.equal(list.match(/The Reed family<\/b>/g).length, 1);
  assert.match(list, /Opal and Ruby|Ruby and Opal/);
  assert.doesNotMatch(list, /Twice: merge/);
});

test('a family deleted before names were kept can be given back too, with its puppy record and shots', async () => {
  const { site, env, her, feed, row } = await setup();
  const at = '2026-11-01T10:00:00.000Z';
  for (const [type, id] of [['family', 'fam-reed'], ['placement', 'sale-1'], ['health', 'ev-1']]) env.DB.raw.prepare('INSERT INTO portal_tombstones (site_id, type, kennelos_id, deleted_at) VALUES (?, ?, ?, ?)').run(site.id, type, id, at);
  env.DB.raw.prepare("INSERT INTO portal_tombstones (site_id, type, kennelos_id, deleted_at) VALUES (?, 'health', 'ev-other', '2026-11-02T10:00:00.000Z')").run(site.id);
  assert.match(await (await her('/portal')).text(), /A family whose name wasn&#39;t kept|A family whose name wasn't kept/);
  await her('/portal/giveback', { kennelos_id: 'fam-reed' });
  assert.equal(row('SELECT COUNT(*) AS n FROM portal_tombstones').n, 1); // the shot removed by itself stays removed
  const out = await (await feed({ families: [REED()] })).json();
  assert.equal(out.summary.families_new, 1);
  assert.equal(out.summary.health_new, 1);
});

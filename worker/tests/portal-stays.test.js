// The Puppy Parent Portal, build chunk 5 (docs/Puppy_Parent_Portal_Plan.md 8.1, 8.2
// and 8.5): an extended stay on a placement, its go-home date and skills, her
// weekly updates with photos, the family's Stay page, and KennelOS's extras.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';

const M = 'manage.kennelport.com';
const H = 'akbostons.kennelport.com';
const API = 'api.kennelport.com';
const form = (o) => new URLSearchParams(o);
const outbox = (env) => env.DB.raw.prepare('SELECT kind, subject, body FROM dev_outbox ORDER BY id').all();
const ymd = (d) => d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
const DAY = 86400000;
const addDays = (d, n) => new Date(Date.parse(`${d}T12:00:00Z`) + n * DAY).toISOString().slice(0, 10);

const { stayWeeks, updateDue, skillProgress } = await import('../src/portal/stays.js');

// A JPEG's first bytes are enough for the check by bytes.
const jpeg = () => new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xd9])], { type: 'image/jpeg' });

async function setup({ bornDaysAgo = 58 } = {}) {
  const env = await makeEnv({ PORTAL_EMAIL_KEY: 'portal-test-key' });
  const site = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  const ops = (await call(env, M, '/ops/login', { method: 'POST', body: form({ token: 'ops-token' }) })).headers.get('set-cookie').split(';')[0];
  await call(env, M, `/ops/sites/${site.id}/people`, { method: 'POST', headers: { cookie: ops }, body: form({ email: 'breeder@example.com', role: 'owner' }) });
  await call(env, M, '/signin', { method: 'POST', body: form({ email: 'breeder@example.com' }), headers: { origin: `https://${M}` } });
  const code = outbox(env).at(-1).subject.match(/(\d{6})/)[1];
  const cookie = (await call(env, M, '/signin/verify', { method: 'POST', body: form({ email: 'breeder@example.com', code }), headers: { origin: `https://${M}` } })).headers.get('set-cookie').split(';')[0];
  await call(env, M, `/ops/sites/${site.id}/portal/on`, { method: 'POST', headers: { cookie: ops } });
  const t = new Date().toISOString();
  const born = ymd(new Date(Date.now() - bornDaysAgo * DAY));
  env.DB.raw.prepare("INSERT INTO litters (id, site_id, slug, name, stage, born_on, created_at, updated_at) VALUES ('lit1', ?, 'winter', 'Winter litter', 'current', ?, ?, ?)").run(site.id, born, t, t);
  env.DB.raw.prepare("INSERT INTO puppies (id, site_id, litter_id, slug, name, sex, created_at, updated_at) VALUES ('pup1', ?, 'lit1', 'opal', 'Opal', 'female', ?, ?)").run(site.id, t, t);
  env.DB.raw.prepare("INSERT INTO extras (id, site_id, kind, name, weeks, checklist, sort, source, kennelos_id) VALUES ('x12', ?, 'homegoing', '12-Week Development Package', 12, ?, 1, 'kennelos', 'kos-x12')")
    .run(site.id, JSON.stringify(['Crate-training foundations', 'Potty training', 'Handling & grooming']));
  env.DB.raw.prepare("INSERT INTO extras (id, site_id, kind, name, sort) VALUES ('xpack', ?, 'item', 'Puppy starter pack', 2)").run(site.id);
  const her = (path, body) => call(env, M, `/s/akbostons${path}`, body ? { method: 'POST', body: body instanceof FormData ? body : form(body), headers: { cookie, origin: `https://${M}` } } : { headers: { cookie } });
  const row = (sql, ...a) => env.DB.raw.prepare(sql).get(...a);
  // The 12-week package is delivered as a stay, updated weekly.
  const saved = await her('/portal/settings', { vet_rule: 'hours72', time_zone: 'America/New_York', help_weeks: '8', 'delivery.x12': 'stay', 'every.x12': '7' });
  assert.equal(saved.status, 303, await saved.text());
  const id = (await her('/portal/new', { name: 'The Reed family', emails: 'sam@example.com', puppy_id: 'pup1' })).headers.get('location').match(/\/f\/([0-9a-f-]{36})/)[1];
  await call(env, H, '/family/signin', { method: 'POST', body: form({ email: 'sam@example.com' }), headers: { origin: `https://${H}` } });
  const fcode = outbox(env).at(-1).subject.match(/(\d{6})/)[1];
  const fc = (await call(env, H, '/family/signin/verify', { method: 'POST', body: form({ email: 'sam@example.com', code: fcode }), headers: { origin: `https://${H}` } })).headers.get('set-cookie').split(';')[0];
  const r = (path, body) => call(env, H, path, body ? { method: 'POST', body: form(body), headers: { cookie: fc, origin: `https://${H}` } } : { headers: { cookie: fc } });
  return { env, her, r, row, id, born, cookie };
}

test('a stay\'s weeks, when an update is due, and how far each skill has come', () => {
  assert.deepEqual(stayWeeks('2026-12-15', '2027-01-12', '2026-12-10'), { total: 4, week: 0, state: 'booked' });
  assert.deepEqual(stayWeeks('2026-12-15', '2027-01-12', '2026-12-15'), { total: 4, week: 1, state: 'staying' });
  assert.deepEqual(stayWeeks('2026-12-15', '2027-01-12', '2026-12-29'), { total: 4, week: 3, state: 'staying' });
  assert.equal(stayWeeks('2026-12-15', '2027-01-12', '2027-01-12').state, 'ending');
  assert.equal(updateDue('2026-12-15', null, 7, '2026-12-14'), null);
  assert.equal(updateDue('2026-12-15', null, 7, '2026-12-15'), '2026-12-15');
  assert.equal(updateDue('2026-12-15', '2026-12-16', 7, '2026-12-22'), null);
  assert.equal(updateDue('2026-12-15', '2026-12-16', 7, '2026-12-23'), '2026-12-23');
  const sk = [{ id: 'a', name: 'Crate' }, { id: 'b', name: 'Potty' }];
  const ups = [
    { written_on: '2026-12-22', created_at: '2', levels: [{ skill_id: 'a', level: 'practicing' }, { skill_id: 'b', level: 'introduced' }] },
    { written_on: '2026-12-15', created_at: '1', levels: [{ skill_id: 'a', level: 'introduced' }] },
  ];
  const p = skillProgress(sk, ups);
  assert.deepEqual([p[0].first, p[0].now, p[1].first, p[1].now], ['introduced', 'practicing', 'introduced', 'introduced']);
});

test('she adds the 12-week stay: go-home at 12 weeks, the package list as skills, a Stay tab for the family', async () => {
  const { her, r, row, id, born } = await setup();
  assert.equal((await her(`/portal/f/${id}/extra`, { extra_id: 'x12' })).status, 303);
  const p = row('SELECT * FROM portal_placements WHERE family_id = ?', id);
  assert.equal(p.go_home_on, addDays(born, 84));
  const pe = row('SELECT * FROM portal_placement_extras WHERE placement_id = ?', p.id);
  assert.equal(pe.starts_on, addDays(born, 56));
  assert.equal(row('SELECT COUNT(*) AS n FROM portal_stay_skills WHERE placement_extra_id = ?', pe.id).n, 3);
  assert.match(await (await her(`/portal/f/${id}`)).text(), /update due/);
  const home = await (await r('/family')).text();
  assert.match(home, /<a href="\/family\/stay"/);
  assert.match(home, /Week 1 of 4/);
  assert.match(home, /How Opal is doing/);
  assert.match(await (await r('/family/stay')).text(), /first update will be here/);
  // An ordinary extra is only listed; a second stay is refused.
  await her(`/portal/f/${id}/extra`, { extra_id: 'xpack' });
  assert.equal(row('SELECT COUNT(*) AS n FROM portal_placement_extras WHERE placement_id = ?', p.id).n, 2);
  assert.equal((await her(`/portal/f/${id}/extra`, { extra_id: 'x12' })).status, 400);
});

test('her weekly update: levels, a note, photos; emailed; shown newest first; Today stops asking', async () => {
  const { env, her, r, row, id } = await setup();
  await her(`/portal/f/${id}/extra`, { extra_id: 'x12' });
  const pe = row("SELECT * FROM portal_placement_extras WHERE extra_id = 'x12'");
  const skills = env.DB.raw.prepare('SELECT * FROM portal_stay_skills WHERE placement_extra_id = ? ORDER BY sort').all(pe.id);
  assert.match(await (await her('')).text(), /Opal: weekly update due/);
  const fd = new FormData();
  fd.append('note', 'Opal slept in her crate all night and asks to go out.');
  fd.append('weight', '6 lb 2 oz');
  for (const [i, sk] of skills.entries()) { fd.append(`level.${sk.id}`, i ? 'introduced' : 'practicing'); fd.append(`note.${sk.id}`, i ? '' : 'Settles in under a minute'); }
  fd.append('photos', jpeg(), 'one.jpg');
  const res = await her(`/portal/f/${id}/extra/${pe.id}/update`, fd);
  assert.equal(res.status, 303, await res.text());
  const mail = outbox(env).filter((m) => m.kind === 'portal_stay_update');
  assert.equal(mail.length, 1);
  assert.match(mail[0].subject, /Opal's week 1 update/);
  assert.match(mail[0].body, /Crate-training foundations: Practicing \(Settles in under a minute\)/);
  assert.doesNotMatch(await (await her('')).text(), /Opal: weekly update due/);

  const stay = await (await r('/family/stay')).text();
  assert.match(stay, /Opal slept in her crate all night/);
  assert.match(stay, /6 lb 2 oz/);
  const media = row('SELECT id FROM portal_media');
  assert.match(stay, new RegExp(`/family/media/${media.id}`));
  const img = await r(`/family/media/${media.id}`);
  assert.equal(img.status, 200);
  assert.equal(img.headers.get('content-type'), 'image/jpeg');
  // Not signed in: no photo.
  assert.equal((await call(env, H, `/family/media/${media.id}`)).status, 303);
  // Last week's levels pre-fill her next form.
  assert.match(await (await her(`/portal/f/${id}`)).text(), /<option value="practicing" selected>Practicing/);
  // A photo that isn't JPEG, PNG or WebP is refused.
  const bad = new FormData();
  bad.append('note', 'x');
  for (const sk of skills) bad.append(`level.${sk.id}`, 'introduced');
  bad.append('photos', new Blob(['not an image']), 'x.txt');
  assert.equal((await her(`/portal/f/${id}/extra/${pe.id}/update`, bad)).status, 400);
  // The updates go with an erase; the record of the stay stays.
  await r('/family/account/delete', { confirm: 'delete' });
  assert.equal(row('SELECT COUNT(*) AS n FROM portal_stay_updates').n, 0);
  assert.equal(row('SELECT COUNT(*) AS n FROM portal_media').n, 0);
  assert.equal(row('SELECT COUNT(*) AS n FROM portal_placement_extras').n, 1);
});

test('KennelOS\'s extra arrives for her to confirm; turned down, it isn\'t offered again', async () => {
  const { env, her, row, id, cookie } = await setup();
  const html = await (await call(env, M, '/s/akbostons/kennelos/code', { method: 'POST', headers: { cookie, origin: `https://${M}` } })).text();
  const linkCode = html.match(/class="code">([A-Z0-9-]+)</)[1];
  const token = (await (await call(env, API, '/v1/link', { method: 'POST', body: JSON.stringify({ code: linkCode, kennel_id: 'k1' }), headers: { 'content-type': 'application/json' } })).json()).token;
  env.DB.raw.prepare("UPDATE puppies SET kennelos_id = 'dog-opal' WHERE id = 'pup1'").run();
  let n = 0;
  const feed = (extras) => call(env, API, '/v1/portal', {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ format: 1, feed_id: `f-${++n}`, kennel_id: 'k1', families: [{ id: 'fam-reed', name: 'The Reed family', emails: ['sam@example.com'], placements: [{ id: 'sale-1', puppy_id: 'dog-opal', puppy_name: 'Opal', contract_signed_on: '2026-11-01', extras }] }] }),
  });
  const res = await feed([{ id: 'charge-1', extra_id: 'kos-x12' }]);
  assert.equal(res.status, 200, await res.clone().text());
  const out = await res.json();
  assert.equal(out.summary.extras_new, 1);
  assert.equal(out.summary.placements_linked, 1);
  const pe = row('SELECT * FROM portal_placement_extras');
  assert.equal(pe.confirmed_at, null);
  assert.match(await (await her('')).text(), /The Reed family bought 12-Week Development Package/);
  assert.match(await (await her(`/portal/f/${id}`)).text(), /KennelOS says they bought 12-Week Development Package/);
  await her(`/portal/f/${id}/extra/${pe.id}/remove`, {});
  await feed([{ id: 'charge-1', extra_id: 'kos-x12' }]);
  assert.equal(row('SELECT COUNT(*) AS n FROM portal_placement_extras').n, 0);
  // A new charge is offered; confirmed, the stay starts.
  await feed([{ id: 'charge-2', extra_id: 'kos-x12' }]);
  const pe2 = row('SELECT * FROM portal_placement_extras');
  await her(`/portal/f/${id}/extra/${pe2.id}/confirm`, {});
  assert.ok(row('SELECT confirmed_at FROM portal_placement_extras').confirmed_at);
  assert.ok(row('SELECT starts_on FROM portal_placement_extras').starts_on);
});

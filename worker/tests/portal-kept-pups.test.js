// A family's puppy kept after its litter leaves the website, and each puppy's own
// vet (docs/plans/portal-kept-pups.md, migration 0039): every way a litter or
// puppy is deleted leaves the family's page as it was, her lists no longer show
// the litter, a photo she removes stays theirs, and her vet changing never
// changes the vet a family sees.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';

const M = 'manage.kennelport.com';
const H = 'akbostons.kennelport.com';
const API = 'api.kennelport.com';
const form = (o) => new URLSearchParams(o);
const outbox = (env) => env.DB.raw.prepare('SELECT kind, subject FROM dev_outbox ORDER BY id').all();

const { deleteLitter, expireLitters } = await import('../src/kennelos/clock.js');
const { removeRecord } = await import('../src/content/records.js');
const { purgeRemovedPhotos } = await import('../src/cleanup.js');
const { deleteFamily } = await import('../src/portal/store.js');

async function setup() {
  const env = await makeEnv({ PORTAL_EMAIL_KEY: 'portal-test-key' });
  const site = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  const ops = (await call(env, M, '/ops/login', { method: 'POST', body: form({ token: 'ops-token' }) })).headers.get('set-cookie').split(';')[0];
  await call(env, M, `/ops/sites/${site.id}/people`, { method: 'POST', headers: { cookie: ops }, body: form({ email: 'breeder@example.com', role: 'owner' }) });
  await call(env, M, '/signin', { method: 'POST', body: form({ email: 'breeder@example.com' }), headers: { origin: `https://${M}` } });
  const code = outbox(env).at(-1).subject.match(/(\d{6})/)[1];
  const breeder = (await call(env, M, '/signin/verify', { method: 'POST', body: form({ email: 'breeder@example.com', code }), headers: { origin: `https://${M}` } })).headers.get('set-cookie').split(';')[0];
  await call(env, M, `/ops/sites/${site.id}/portal/on`, { method: 'POST', headers: { cookie: ops } });
  const t = new Date().toISOString();
  const sql = (q, ...a) => env.DB.raw.prepare(q).run(...a);
  sql("INSERT INTO dogs (id, site_id, slug, call_name, sex, created_at, updated_at) VALUES ('dam1', ?, 'pearl', 'Pearl', 'female', ?, ?)", site.id, t, t);
  sql("INSERT INTO litters (id, site_id, slug, name, stage, born_on, ready_on, dam_id, sire_name, created_at, updated_at, source, kennelos_id) VALUES ('lit1', ?, 'winter', 'Winter litter', 'current', '2026-10-20', '2026-12-15', 'dam1', 'Duke', ?, ?, 'kennelos', 'kl1')", site.id, t, t);
  for (const [id, name, sex, kos] of [['pup1', 'Opal', 'female', 'dog-opal'], ['pup2', 'Ruby', 'female', 'dog-ruby'], ['pup3', 'Jasper', 'male', 'dog-jasper']]) {
    sql("INSERT INTO puppies (id, site_id, litter_id, slug, name, sex, color, created_at, updated_at, source, kennelos_id) VALUES (?, ?, 'lit1', ?, ?, ?, 'Brindle and white', ?, ?, 'kennelos', ?)", id, site.id, id, name, sex, t, t, kos);
  }
  // Photos: Opal's main photo and one tagged with her; one of Jasper's (never placed).
  for (const id of ['00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003']) {
    sql("INSERT INTO photos (id, site_id, r2_key, type, bytes, created_at) VALUES (?, ?, ?, 'image/webp', 10, ?)", id, site.id, `sites/${site.id}/photos/${id}.webp`, t);
    await env.FILES.put(`sites/${site.id}/photos/${id}.webp`, new Uint8Array([1, 2, 3]));
  }
  sql("UPDATE puppies SET photo_id = '00000000-0000-4000-8000-000000000001' WHERE id = 'pup1'");
  sql("INSERT INTO photo_tags (site_id, photo_id, subject) VALUES (?, '00000000-0000-4000-8000-000000000002', 'puppy:pup1')", site.id);
  sql("UPDATE puppies SET photo_id = '00000000-0000-4000-8000-000000000003' WHERE id = 'pup3'");
  const her = (path, body) => call(env, M, `/s/akbostons${path}`, body ? { method: 'POST', body: form(body), headers: { cookie: breeder, origin: `https://${M}` } } : { headers: { cookie: breeder } });
  const signIn = async (email) => {
    await call(env, H, '/family/signin', { method: 'POST', body: form({ email }), headers: { origin: `https://${H}` } });
    const c = outbox(env).at(-1).subject.match(/(\d{6})/)[1];
    const cookie = (await call(env, H, '/family/signin/verify', { method: 'POST', body: form({ email, code: c }), headers: { origin: `https://${H}` } })).headers.get('set-cookie').split(';')[0];
    return (path) => call(env, H, path, { headers: { cookie } });
  };
  const row = (q, ...a) => env.DB.raw.prepare(q).get(...a);
  return { env, site, her, signIn, row, sql };
}

async function addFamily(her, values) {
  const res = await her('/portal/new', values);
  assert.equal(res.status, 303, await res.text());
  return res.headers.get('location').match(/\/f\/([0-9a-f-]{36})/)[1];
}

const OPAL_MAIN = '00000000-0000-4000-8000-000000000001';
const OPAL_TAGGED = '00000000-0000-4000-8000-000000000002';
const JASPER = '00000000-0000-4000-8000-000000000003';

function assertWhole(page) {
  assert.match(page, /Winter litter/);
  assert.match(page, /Female/);
  assert.match(page, /Brindle and white/);
  assert.match(page, /Pearl × Duke/);
}

test('the litter goes from the website and her lists; the family\'s page stays whole, photos and all', async () => {
  const { env, site, her, signIn, row } = await setup();
  const id = await addFamily(her, { name: 'The Reed family', emails: 'sam@example.com', puppy_id: 'pup1' });
  const reed = await signIn('sam@example.com');
  const before = await (await reed('/family/records')).text();
  assertWhole(before);

  // Off the website: its 30 days start, and pass.
  env.DB.raw.prepare('UPDATE litters SET show_on_site = 0').run();
  await expireLitters(env, new Date());
  const done = await expireLitters(env, new Date(Date.now() + 31 * 86400000));
  // An open placement no longer keeps the litter on the website.
  assert.equal(done.litters, 1);
  assert.equal(row('SELECT COUNT(*) AS n FROM litters').n, 0);
  assert.equal(row('SELECT COUNT(*) AS n FROM puppies').n, 0);
  assert.doesNotMatch(await (await her('/litters')).text(), /Winter litter/);

  // Only the placed puppy is kept, and only what the family's page shows.
  assert.equal(row('SELECT COUNT(*) AS n FROM portal_pups').n, 1);
  const kept = row('SELECT * FROM portal_pups');
  assert.deepEqual({ name: kept.name, litter: kept.litter_name, born: kept.born_on, dam: kept.dam_call, sire: kept.sire_name }, { name: 'Opal', litter: 'Winter litter', born: '2026-10-20', dam: 'Pearl', sire: 'Duke' });

  const after = await (await reed('/family/records')).text();
  assertWhole(after);
  assert.match(after, new RegExp(`/family/photo/${OPAL_MAIN}`));
  assert.match(after, new RegExp(`/family/photo/${OPAL_TAGGED}`));
  assert.equal((await reed(`/family/photo/${OPAL_MAIN}`)).status, 200);
  assert.equal((await reed(`/family/photo/${JASPER}`)).status, 404);
  assert.match(await (await reed('/family/photos')).text(), new RegExp(OPAL_TAGGED));

  // The nightly cleanup deletes the files of Jasper's photo, never Opal's.
  await purgeRemovedPhotos(env, new Date(Date.now() + 86400000).toISOString());
  assert.ok(await env.FILES.get(`sites/${site.id}/photos/${OPAL_MAIN}.webp`));
  assert.ok(await env.FILES.get(`sites/${site.id}/photos/${OPAL_TAGGED}.webp`));
  assert.equal(await env.FILES.get(`sites/${site.id}/photos/${JASPER}.webp`), null);

  // Her family screen still names the puppy, and saving its details keeps it.
  const screen = await (await her(`/portal/f/${id}`)).text();
  assert.match(screen, /<option value="kept" selected>Opal · Winter litter<\/option>/);
  assert.equal((await her(`/portal/f/${id}/placement`, { puppy_id: 'kept', call_name: 'Opal Mae', microchip: '985000000000009' })).status, 303);
  assert.equal(row('SELECT call_name FROM portal_placements').call_name, 'Opal Mae');
  assert.match(await (await her('/portal')).text(), /Winter litter/);

  // Deleted for good: the copy goes, and the photo files with the next cleanup.
  await deleteFamily(env, site.id, id);
  assert.equal(row('SELECT COUNT(*) AS n FROM portal_pups').n, 0);
  assert.equal(row('SELECT COUNT(*) AS n FROM portal_pup_photos').n, 0);
  await purgeRemovedPhotos(env, new Date(Date.now() + 86400000).toISOString());
  assert.equal(await env.FILES.get(`sites/${site.id}/photos/${OPAL_MAIN}.webp`), null);
});

test('Remove now, removing the litter or the puppy, and a website import all keep it', async () => {
  for (const how of ['remove-now', 'litter', 'puppy', 'import']) {
    const { env, site, her, signIn, row } = await setup();
    await addFamily(her, { name: 'The Reed family', emails: 'sam@example.com', puppy_id: 'pup1' });
    const reed = await signIn('sam@example.com');
    if (how === 'remove-now') await deleteLitter(env, site.id, 'lit1');
    if (how === 'litter') await removeRecord(env, site.id, 'litters', 'lit1');
    if (how === 'puppy') await removeRecord(env, site.id, 'puppies', 'pup1');
    if (how === 'import') {
      const { importContent } = await import('../src/content/io.js');
      await importContent(env, site.id, { litters: [] });
    }
    assert.equal(row("SELECT COUNT(*) AS n FROM puppies WHERE id = 'pup1'").n, 0, how);
    assertWhole(await (await reed('/family/records')).text());
  }
});

test('a photo she removes from the website stays the family\'s', async () => {
  const { env, site, her, signIn } = await setup();
  await addFamily(her, { name: 'The Reed family', emails: 'sam@example.com', puppy_id: 'pup1' });
  const reed = await signIn('sam@example.com');
  assert.equal((await her(`/photos/${OPAL_TAGGED}/remove`, {})).status, 303);
  assert.ok(env.DB.raw.prepare('SELECT removed_at FROM photos WHERE id = ?').get(OPAL_TAGGED).removed_at);
  assert.match(await (await reed('/family/photos')).text(), new RegExp(OPAL_TAGGED));
  await purgeRemovedPhotos(env, new Date(Date.now() + 86400000).toISOString());
  assert.ok(await env.FILES.get(`sites/${site.id}/photos/${OPAL_TAGGED}.webp`));
  assert.equal((await reed(`/family/photo/${OPAL_TAGGED}`)).status, 200);
});

const VET = { vet_rule: 'hours72', time_zone: 'America/New_York', help_weeks: '8' };

test('each puppy keeps its vet: her vet changing never changes it, and she can correct it', async () => {
  const { her, signIn, row } = await setup();
  await her('/portal/settings', { ...VET, vet_clinic: 'Maple Street Animal Hospital', vet_doctor: 'Dr. Lee', vet_phone: '555-010-3000', vet_note: 'Dr. Lee knows every puppy.' });
  const id = await addFamily(her, { name: 'The Reed family', emails: 'sam@example.com', puppy_id: 'pup1' });
  assert.equal(row('SELECT pup_vet_clinic FROM portal_placements').pup_vet_clinic, 'Maple Street Animal Hospital');
  const reed = await signIn('sam@example.com');
  let page = await (await reed('/family/records')).text();
  assert.match(page, /Opal's vet since birth/);
  assert.match(page, /Maple Street Animal Hospital · Dr\. Lee/);
  assert.match(page, /Dr\. Lee knows every puppy\./);

  // She changes vets: Opal's family still sees the vet Opal saw; a new family, the new one.
  await her('/portal/settings', { ...VET, vet_clinic: 'Oak Vets', vet_doctor: 'Dr. Park', vet_phone: '555-010-4000', vet_note: 'Dr. Park is new.' });
  page = await (await reed('/family/records')).text();
  assert.match(page, /Maple Street Animal Hospital · Dr\. Lee/);
  assert.doesNotMatch(page, /Oak Vets|Dr\. Park is new/);
  await addFamily(her, { name: 'The Diaz family', emails: 'lee@example.com', puppy_id: 'pup2' });
  assert.match(await (await (await signIn('lee@example.com'))('/family/records')).text(), /Oak Vets · Dr\. Park/);

  // She corrects Opal's vet on the family's screen.
  assert.match(await (await her(`/portal/f/${id}`)).text(), /name="pup_vet_clinic" value="Maple Street Animal Hospital"/);
  assert.equal((await her(`/portal/f/${id}/placement`, { puppy_id: 'pup1', pup_vet_clinic: 'Birch Hill Vets', pup_vet_doctor: '', pup_vet_phone: '555-010-5000', pup_vet_address: '' })).status, 303);
  page = await (await reed('/family/records')).text();
  assert.match(page, /Birch Hill Vets/);
  assert.match(page, /tel:5550105000/);
  // Her site vet's note is about her vet, so it isn't shown with another one.
  assert.doesNotMatch(page, /knows every puppy/);
});

test('a placement placed before any vet was set takes the vet at the time she first sets one', async () => {
  const { her, row } = await setup();
  await addFamily(her, { name: 'The Reed family', emails: 'sam@example.com', puppy_id: 'pup1' });
  assert.equal(row('SELECT pup_vet_clinic FROM portal_placements').pup_vet_clinic, null);
  await her('/portal/settings', { ...VET, vet_clinic: 'Maple Street Animal Hospital' });
  await her('/portal/settings', { ...VET, vet_clinic: 'Oak Vets' });
  // Blank when the first one came in: it stays with the first vet it had.
  assert.equal(row('SELECT pup_vet_clinic FROM portal_placements').pup_vet_clinic, 'Maple Street Animal Hospital');
});

test('KennelOS sends each placement its vet; without one, the placement keeps what it has', async () => {
  const { env, her, row } = await setup();
  const html = await (await her('/kennelos/code', {})).text();
  const linkCode = html.match(/class="code">([A-Z0-9-]+)</)[1];
  const token = (await (await call(env, API, '/v1/link', { method: 'POST', body: JSON.stringify({ code: linkCode, kennel_id: 'kennel-1' }), headers: { 'content-type': 'application/json' } })).json()).token;
  let n = 0;
  const feed = (body) => call(env, API, '/v1/portal', { method: 'POST', body: JSON.stringify({ format: 1, feed_id: `f-${++n}`, kennel_id: 'kennel-1', ...body }), headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` } });
  const fam = (pl = {}) => ({ id: 'fam-reed', name: 'The Reed family', emails: ['sam@example.com'], placements: [{ id: 'sale-1', puppy_id: 'dog-opal', puppy_name: 'Opal', contract_signed_on: '2026-11-01', ...pl }] });

  // An old feed (no placement vet) and her vet in `vet`: the placement takes hers.
  assert.equal((await feed({ families: [fam()], vet: { clinic: 'Maple Street Animal Hospital' } })).status, 200);
  assert.equal(row('SELECT pup_vet_clinic FROM portal_placements').pup_vet_clinic, 'Maple Street Animal Hospital');
  // The puppy's own vet.
  assert.equal((await feed({ families: [fam({ vet: { clinic: 'Birch Hill Vets', doctor: 'Dr. Okafor', phone: '555-0177' } })] })).status, 200);
  assert.deepEqual({ ...row('SELECT pup_vet_clinic AS c, pup_vet_doctor AS d, pup_vet_phone AS p FROM portal_placements') }, { c: 'Birch Hill Vets', d: 'Dr. Okafor', p: '555-0177' });
  // A later feed without it changes nothing; her site vet from KennelOS changing doesn't either.
  assert.equal((await feed({ families: [fam()], vet: { clinic: 'Oak Vets' } })).status, 200);
  assert.equal(row('SELECT pup_vet_clinic FROM portal_placements').pup_vet_clinic, 'Birch Hill Vets');
  // Her correction wins; KennelOS's different one waits as a suggestion.
  const id = row('SELECT family_id FROM portal_placements').family_id;
  await her(`/portal/f/${id}/placement`, { puppy_id: 'pup1', pup_vet_clinic: 'Elm Vets', pup_vet_doctor: 'Dr. Okafor', pup_vet_phone: '555-0177', pup_vet_address: '' });
  assert.equal((await feed({ families: [fam({ vet: { clinic: 'Birch Hill Vets', doctor: 'Dr. Okafor', phone: '555-0177' } })] })).status, 200);
  assert.equal(row('SELECT pup_vet_clinic FROM portal_placements').pup_vet_clinic, 'Elm Vets');
  assert.equal(row("SELECT value FROM portal_suggestions WHERE field = 'pup_vet_clinic'").value, 'Birch Hill Vets');
  // A field the vet doesn't take is refused, like any other.
  const bad = await feed({ families: [fam({ vet: { fax: '1' } })] });
  assert.equal(bad.status, 400);
});

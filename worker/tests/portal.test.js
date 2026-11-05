// The Puppy Parent Portal, build chunk 1 (docs/Puppy_Parent_Portal_Plan.md): switched
// on per site, families added by her, invites and sign-in, the family's pages, the
// vet clock and its reminders, proof, clicks, and families kept apart.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';
import { worker } from './helpers/worker.js';

const M = 'manage.kennelport.com';
const H = 'akbostons.kennelport.com';
const form = (o) => new URLSearchParams(o);
const outbox = (env) => env.DB.raw.prepare('SELECT kind, subject, body, email_hash FROM dev_outbox ORDER BY id').all();
const ymd = (d) => d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
const DAY = 86400000;

const { runPortalHourly } = await import('../src/portal/reminders.js');
const { expireLitters } = await import('../src/kennelos/clock.js');
const { closeSite } = await import('../src/sites.js');

async function setup({ on = true } = {}) {
  const env = await makeEnv({ PORTAL_EMAIL_KEY: 'portal-test-key' });
  const site = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  const ops = (await call(env, M, '/ops/login', { method: 'POST', body: form({ token: 'ops-token' }) })).headers.get('set-cookie').split(';')[0];
  await call(env, M, `/ops/sites/${site.id}/people`, { method: 'POST', headers: { cookie: ops }, body: form({ email: 'breeder@example.com', role: 'owner' }) });
  await call(env, M, '/signin', { method: 'POST', body: form({ email: 'breeder@example.com' }), headers: { origin: `https://${M}` } });
  const code = outbox(env).at(-1).subject.match(/(\d{6})/)[1];
  const res = await call(env, M, '/signin/verify', { method: 'POST', body: form({ email: 'breeder@example.com', code }), headers: { origin: `https://${M}` } });
  const breeder = res.headers.get('set-cookie').split(';')[0];
  if (on) assert.equal((await call(env, M, `/ops/sites/${site.id}/portal/on`, { method: 'POST', headers: { cookie: ops } })).status, 303);
  const t = new Date().toISOString();
  env.DB.raw.prepare("INSERT INTO litters (id, site_id, slug, name, stage, born_on, created_at, updated_at) VALUES ('lit1', ?, 'winter', 'Winter litter', 'current', '2026-10-20', ?, ?)").run(site.id, t, t);
  for (const [id, name, sex] of [['pup1', 'Opal', 'female'], ['pup2', 'Ruby', 'female'], ['pup3', 'Jasper', 'male']]) {
    env.DB.raw.prepare("INSERT INTO puppies (id, site_id, litter_id, slug, name, sex, created_at, updated_at) VALUES (?, ?, 'lit1', ?, ?, ?, ?, ?)").run(id, site.id, id, name, sex, t, t);
  }
  const her = (path, body) => call(env, M, `/s/akbostons${path}`, body ? { method: 'POST', body: body instanceof FormData ? body : form(body), headers: { cookie: breeder, origin: `https://${M}` } } : { headers: { cookie: breeder } });
  const fam = (cookie) => (path, body) => call(env, H, path, body ? { method: 'POST', body: body instanceof FormData ? body : form(body), headers: { cookie, origin: `https://${H}` } } : { headers: { cookie } });
  return { env, site, ops, her, fam };
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
  assert.equal(res.status, 303);
  return res.headers.get('set-cookie').split(';')[0];
}

const pdf = () => new Blob([new TextEncoder().encode('%PDF-1.4\n% a vet record\n%%EOF')], { type: 'application/pdf' });

test('the portal is off until /ops switches it on, for that site alone', async () => {
  const { env, site, ops, her } = await setup({ on: false });
  assert.equal((await call(env, H, '/family')).status, 404);
  assert.equal((await her('/portal')).status, 404);
  assert.doesNotMatch(await (await her('')).text(), /class="apptabs"/);
  await call(env, M, `/ops/sites/${site.id}/portal/on`, { method: 'POST', headers: { cookie: ops } });
  assert.match(await (await call(env, H, '/family')).text(), /Welcome to AK Boston Terriers's puppy portal/);
  assert.match(await (await her('')).text(), /<a href="\/s\/akbostons\/portal"><svg[^>]*><use href="#i-people"\/><\/svg><span>Families<\/span>/);
  const other = await addSite(env, 'thornfield');
  assert.equal((await call(env, 'thornfield.kennelport.com', '/family')).status, 404, other.id);
  await call(env, M, `/ops/sites/${site.id}/portal/off`, { method: 'POST', headers: { cookie: ops } });
  assert.equal((await call(env, H, '/family')).status, 404);
});

test('she adds a family; their addresses are stored encrypted; the invite link works once', async () => {
  const { env, her, fam } = await setup();
  const id = await addFamily(her, { name: 'The Reed family', emails: 'Sam@Example.com, alex@example.com', puppy_id: 'pup1', call_name: 'Opal Mae', go_home_on: ymd(new Date(Date.now() + 10 * DAY)) });
  const raw = JSON.stringify(env.DB.raw.prepare('SELECT * FROM portal_emails').all()) + JSON.stringify(env.DB.raw.prepare('SELECT * FROM portal_history').all());
  assert.doesNotMatch(raw.toLowerCase(), /example\.com/);
  const screen = await (await her(`/portal/f/${id}`)).text();
  assert.match(screen, /sam@example\.com/);
  assert.match(screen, /Send invite/);

  assert.equal((await her(`/portal/f/${id}/invite`, {})).status, 303);
  const invites = outbox(env).filter((m) => m.kind === 'family_invite');
  assert.equal(invites.length, 2);
  assert.match(invites[0].subject, /Opal Mae's puppy portal from AK Boston Terriers/);
  assert.equal(env.DB.raw.prepare("SELECT COUNT(*) AS n FROM portal_email_log WHERE kind = 'invite' AND result = 'outbox'").get().n, 2);
  const link = invites[0].body.match(/https:\/\/akbostons\.kennelport\.com(\/family\/welcome\?t=[0-9a-f]{64})/)[1];

  const first = await call(env, H, link);
  assert.equal(first.status, 303);
  const cookie = first.headers.get('set-cookie');
  assert.match(cookie, /Path=\/family; HttpOnly; Secure; SameSite=Lax/);
  const home = await (await fam(cookie.split(';')[0])('/family')).text();
  assert.match(home, /Opal Mae comes home in (9|10|11) days/);
  assert.match(home, /I've booked it/);
  assert.match(await (await call(env, H, link)).text(), /has been used or has expired/);
  assert.match(await (await her(`/portal/f/${id}`)).text(), /Resend invite/);
});

test('code sign-in answers the same for unknown addresses, and families only ever see their own', async () => {
  const { env, her, fam } = await setup();
  const a = await addFamily(her, { name: 'The Reed family', emails: 'sam@example.com', puppy_id: 'pup1' });
  await addFamily(her, { name: 'The Diaz family', emails: 'lee@example.com', puppy_id: 'pup2' });
  const before = outbox(env).length;
  const unknown = await call(env, H, '/family/signin', { method: 'POST', body: form({ email: 'nobody@example.com' }), headers: { origin: `https://${H}` } });
  assert.match(await unknown.text(), /Check your email/);
  assert.equal(outbox(env).length, before);
  // A breeder's address isn't a family's: no code.
  await call(env, H, '/family/signin', { method: 'POST', body: form({ email: 'breeder@example.com' }), headers: { origin: `https://${H}` } });
  assert.equal(outbox(env).length, before);

  const reed = fam(await familySignIn(env, 'sam@example.com'));
  const diaz = fam(await familySignIn(env, 'lee@example.com'));
  const fd = new FormData();
  fd.append('file', pdf(), 'record.pdf');
  assert.equal((await reed('/family/vet/proof', fd)).status, 303);
  const fileId = env.DB.raw.prepare('SELECT proof_file_id FROM portal_placements WHERE family_id = ?').get(a).proof_file_id;
  const mine = await reed(`/family/file/${fileId}`);
  assert.equal(mine.status, 200);
  assert.equal(mine.headers.get('content-type'), 'application/pdf');
  assert.equal((await diaz(`/family/file/${fileId}`)).status, 404);
  assert.match(await (await diaz('/family')).text(), /Ruby/);
  assert.doesNotMatch(await (await diaz('/family')).text(), /Opal/);
  // A family session is no breeder session, and the other way round.
  assert.equal((await call(env, M, '/s/akbostons/portal', { headers: { cookie: (await familySignIn(env, 'sam@example.com')) } })).status, 303);
  // Another site's form can't post here.
  assert.equal((await call(env, H, '/family/vet/booked', { method: 'POST', body: form({ day: '2026-12-01' }), headers: { origin: 'https://evil.example' } })).status, 403);
});

test('the family books the vet, uploads proof; she sees it and accepts it', async () => {
  const { env, her, fam } = await setup();
  const id = await addFamily(her, { name: 'The Reed family', emails: 'sam@example.com', puppy_id: 'pup1' });
  const reed = fam(await familySignIn(env, 'sam@example.com'));
  assert.equal((await reed('/family/vet/booked', { day: '2026-12-26', time: '10:30', clinic: 'Maple Vet' })).status, 303);
  const bad = new FormData();
  bad.append('file', new Blob(['just text']), 'notes.txt');
  const refused = await reed('/family/vet/proof', bad);
  assert.equal(refused.status, 400);
  assert.match(await refused.text(), /isn&#39;t a photo or a PDF/);
  const fd = new FormData();
  fd.append('file', pdf(), 'record.pdf');
  await reed('/family/vet/proof', fd);
  let screen = await (await her(`/portal/f/${id}`)).text();
  assert.match(screen, /2026-12-26 at 10:30, Maple Vet/);
  assert.match(screen, /Vet visit: <span>Record uploaded/);
  assert.match(screen, /Accept the vet record/);
  assert.match((await (await her('')).text()), /Vet record to review: Opal/);
  await her(`/portal/f/${id}/accept`, {});
  screen = await (await her(`/portal/f/${id}`)).text();
  assert.match(screen, /Vet visit: <span>Accepted/);
  const fields = env.DB.raw.prepare("SELECT field, changed_by FROM portal_history WHERE tbl = 'portal_placements' ORDER BY id").all().map((h) => `${h.field}:${h.changed_by}`);
  for (const f of ['vet_booked_for:family', 'proof_uploaded_at:family', 'proof_accepted_at:breeder']) assert.ok(fields.includes(f), f);
});

test('picked up: the clock starts, every address gets the deadline, Home turns to the vet visit', async () => {
  const { env, her, fam } = await setup();
  const id = await addFamily(her, { name: 'The Reed family', emails: 'sam@example.com, alex@example.com', puppy_id: 'pup1' });
  assert.equal((await her(`/portal/f/${id}/picked-up`, {})).status, 303);
  const p = env.DB.raw.prepare('SELECT * FROM portal_placements').get();
  assert.equal(p.pickup_state, 'confirmed');
  assert.equal(Date.parse(p.vet_deadline_at) - Date.parse(p.picked_up_at), 72 * 3600000);
  const pickups = outbox(env).filter((m) => m.kind === 'vet_pickup');
  assert.equal(pickups.length, 2);
  assert.match(pickups[0].subject, /Opal's vet visit is due by/);
  assert.match(pickups[0].body, /your contract states the vet visit requirement/i);
  // The hourly job doesn't send it again.
  await runPortalHourly(env);
  assert.equal(outbox(env).filter((m) => m.kind === 'vet_pickup').length, 2);
  const reed = fam(await familySignIn(env, 'sam@example.com'));
  const home = await (await reed('/family')).text();
  assert.match(home, /<span class="script">Welcome home<\/span><h1>Opal is home<\/h1>/);
  assert.match(home, /(2 days 23 hours|3 days) left/);
  assert.match(home, /Upload vet record/);
  // She corrects the time: the deadline moves, the old one stays in history.
  const yesterday = ymd(new Date(Date.now() - DAY));
  await her(`/portal/f/${id}/picked-up`, { day: yesterday, time: '09:00' });
  const moved = env.DB.raw.prepare('SELECT * FROM portal_placements').get();
  assert.notEqual(moved.vet_deadline_at, p.vet_deadline_at);
  assert.equal(env.DB.raw.prepare("SELECT COUNT(*) AS n FROM portal_history WHERE field = 'vet_deadline_at'").get().n, 2);
  // A time in the future is refused.
  const future = await her(`/portal/f/${id}/picked-up`, { day: ymd(new Date(Date.now() + 3 * DAY)), time: '09:00' });
  assert.match(await future.text(), /hasn&#39;t happened yet/);
});

test('the clock never waits on a tap: a passed booked time starts it, and she confirms or stops it', async () => {
  const { env, her } = await setup();
  const id = await addFamily(her, { name: 'The Reed family', emails: 'sam@example.com', puppy_id: 'pup1', pickup_day: ymd(new Date(Date.now() - DAY / 4)), pickup_time: '00:00' });
  const r = await runPortalHourly(env);
  assert.equal(r.started, 1);
  let p = env.DB.raw.prepare('SELECT * FROM portal_placements').get();
  assert.equal(p.pickup_state, 'assumed');
  assert.equal(p.picked_up_at, p.pickup_booked_at);
  assert.ok(p.vet_deadline_at);
  assert.equal(outbox(env).filter((m) => m.kind === 'vet_pickup').length, 1);
  assert.equal(env.DB.raw.prepare("SELECT changed_by FROM portal_history WHERE field = 'pickup_state' ORDER BY id DESC").get().changed_by, 'portal');
  assert.match(await (await her('')).text(), /Did Opal go home at/);

  await her(`/portal/f/${id}/not-yet`, {});
  p = env.DB.raw.prepare('SELECT * FROM portal_placements').get();
  assert.equal(p.pickup_state, 'not_yet');
  assert.equal(p.vet_deadline_at, null);
  await runPortalHourly(env);
  assert.equal(env.DB.raw.prepare('SELECT pickup_state FROM portal_placements').get().pickup_state, 'not_yet');
  // Marking the real pickup starts it again.
  await her(`/portal/f/${id}/picked-up`, {});
  assert.equal(env.DB.raw.prepare('SELECT pickup_state FROM portal_placements').get().pickup_state, 'confirmed');
});

test('a lost or rehomed puppy stops every reminder at once', async () => {
  const { env, her } = await setup();
  const id = await addFamily(her, { name: 'The Reed family', emails: 'sam@example.com', puppy_id: 'pup1', go_home_on: ymd(new Date(Date.now() + 2 * DAY)) });
  await her(`/portal/f/${id}/life`, { life_status: 'deceased', on: ymd(new Date()) });
  await runPortalHourly(env);
  assert.equal(outbox(env).filter((m) => m.kind.startsWith('vet_')).length, 0);
  await her(`/portal/f/${id}/life`, { life_status: 'with_family' });
  await runPortalHourly(env);
  assert.equal(outbox(env).filter((m) => m.kind === 'vet_book').length, 1);
});

test('programs: only the ones she shows, each click counted, with the disclosure', async () => {
  const { env, site, her, fam } = await setup();
  env.DB.raw.prepare("INSERT INTO products (id, site_id, name, link_url, code) VALUES ('ins', ?, 'Puppy insurance', 'https://insure.example/akb', 'AKB30')").run(site.id);
  env.DB.raw.prepare("INSERT INTO products (id, site_id, name, link_url) VALUES ('toy', ?, 'Chew toy', 'https://toys.example/x')").run(site.id);
  await her('/portal/settings', { vet_rule: 'days3', time_zone: 'America/Chicago', proof_note: 'The exam record', 'type.ins': 'insurance', 'action.ins': 'Activate within 5 days of pickup', 'type.toy': '' });
  await addFamily(her, { name: 'The Reed family', emails: 'sam@example.com', puppy_id: 'pup1' });
  const reed = fam(await familySignIn(env, 'sam@example.com'));
  const home = await (await reed('/family')).text();
  assert.match(home, /Included with Opal/);
  assert.match(home, /Activate within 5 days of pickup/);
  assert.match(home, /AKB30/);
  assert.match(home, /affiliate links/);
  assert.doesNotMatch(home, /Chew toy/);
  const go = await reed('/family/go/ins?from=home');
  assert.equal(go.status, 302);
  assert.equal(go.headers.get('location'), 'https://insure.example/akb');
  assert.equal((await reed('/family/go/toy?from=home')).status, 404);
  assert.equal(env.DB.raw.prepare("SELECT COUNT(*) AS n FROM portal_clicks WHERE product_id = 'ins' AND place = 'home' AND family_id IS NOT NULL").get().n, 1);
  assert.match(await (await reed('/family/vet')).text(), /By the end of the third day after the pickup day/);
});

test('records: her health records and contract show on the family\'s Records page', async () => {
  const { env, her, fam } = await setup();
  const id = await addFamily(her, { name: 'The Reed family', emails: 'sam@example.com', puppy_id: 'pup1' });
  await her(`/portal/f/${id}/record`, { type: 'vaccine', given_on: '2026-11-01', name: 'DHPP, first round' });
  await her(`/portal/f/${id}/placement`, { puppy_id: 'pup1', microchip: '985112003456789', registration_no: 'AKC123' });
  const fd = new FormData();
  fd.append('file', pdf(), 'contract.pdf');
  assert.equal((await her(`/portal/f/${id}/contract`, fd)).status, 303);
  const reed = fam(await familySignIn(env, 'sam@example.com'));
  const page = await (await reed('/family/records')).text();
  assert.match(page, /DHPP, first round/);
  assert.match(page, /985112003456789/);
  assert.match(page, /Your contract/);
  assert.match(page, /Winter litter/);
});

test('closing the site removes the portal; a litter with an open placement is never expired', async () => {
  const { env, site, her } = await setup();
  await addFamily(her, { name: 'The Reed family', emails: 'sam@example.com', puppy_id: 'pup1' });
  env.DB.raw.prepare("UPDATE litters SET left_site_at = '2026-01-01T00:00:00Z'").run();
  await expireLitters(env, new Date());
  assert.equal(env.DB.raw.prepare('SELECT COUNT(*) AS n FROM litters').get().n, 1);
  await closeSite(env, site.id, 'akbostons');
  for (const t of ['portal_families', 'portal_emails', 'portal_placements', 'portal_history']) {
    assert.equal(env.DB.raw.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n, 0, t);
  }
});

test('the hourly cron runs the portal job; the daily one runs the cleanup', async () => {
  const { env, her } = await setup();
  await addFamily(her, { name: 'The Reed family', emails: 'sam@example.com', puppy_id: 'pup1', pickup_day: ymd(new Date(Date.now() - DAY / 4)), pickup_time: '00:00' });
  const waits = [];
  await worker.scheduled({ cron: '7 * * * *' }, env, { waitUntil: (p) => waits.push(p) });
  await Promise.all(waits);
  assert.equal(env.DB.raw.prepare('SELECT pickup_state FROM portal_placements').get().pickup_state, 'assumed');
});

test('her and her vet\'s contacts: one tap from Home for the first weeks after pickup, always on Records', async () => {
  const { env, site, her, fam } = await setup();
  env.DB.raw.prepare("UPDATE sites SET contact_phone = '(555) 010-2000', contact_email = 'hello@akbostons.example' WHERE id = ?").run(site.id);
  const base = { vet_rule: 'hours72', time_zone: 'America/New_York' };
  const bad = await her('/portal/settings', { ...base, vet_phone: 'call me' });
  assert.equal(bad.status, 400);
  assert.match(await bad.text(), /doesn&#39;t look like a phone number/);
  assert.equal((await her('/portal/settings', { ...base, vet_clinic: 'Maple Street Animal Hospital', vet_doctor: 'Dr. Lee', vet_phone: '+1 (555) 010-3000', vet_address: '12 Maple St, Springfield', vet_note: 'Dr. Lee has seen every puppy since birth.', help_weeks: '6' })).status, 303);
  assert.match(await (await her('/portal/settings')).text(), /value="Dr\. Lee"/);

  const id = await addFamily(her, { name: 'The Reed family', emails: 'sam@example.com', puppy_id: 'pup1' });
  const reed = fam(await familySignIn(env, 'sam@example.com'));
  // Before pickup: not on Home, but on Records.
  assert.doesNotMatch(await (await reed('/family')).text(), /Questions about Opal/);
  const records = await (await reed('/family/records')).text();
  assert.match(records, /href="tel:\+15550103000">.*Call the vet/s);
  assert.match(records, /Maple Street Animal Hospital · Dr\. Lee/);

  await her(`/portal/f/${id}/picked-up`, {});
  const home = await (await reed('/family')).text();
  assert.match(home, /Questions about Opal\? One tap/);
  // Blank in her settings: the website's number and address.
  assert.match(home, /href="tel:5550102000"/);
  assert.match(home, /href="sms:5550102000"/);
  assert.match(home, /href="mailto:hello@akbostons\.example\?subject=Question%20about%20Opal"/);
  assert.match(home, /Opal's vet since birth/);
  assert.match(home, /google\.com\/maps\/search\/\?api=1&amp;query=12%20Maple%20St%2C%20Springfield/);

  // After her six weeks it leaves Home; Records keeps it.
  env.DB.raw.prepare('UPDATE portal_placements SET picked_up_at = ?').run(new Date(Date.now() - 43 * DAY).toISOString());
  assert.doesNotMatch(await (await reed('/family')).text(), /Questions about Opal/);
  assert.match(await (await reed('/family/records')).text(), /Call the vet/);
});

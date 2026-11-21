// The portal's looks (portal/looks.js, migration 0042): she picks one in her portal
// settings; Classic is the default and reads as before; Forest and Cream bring their
// stylesheets, data-look on <body>, and their pieces on Home; a look the list doesn't
// know is refused, and one stored that it no longer knows reads as Classic.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';
import { LOOKS, lookOf } from '../src/portal/looks.js';

const M = 'manage.kennelport.com';
const H = 'akbostons.kennelport.com';
const form = (o) => new URLSearchParams(o);
const outbox = (env) => env.DB.raw.prepare('SELECT kind, subject, body FROM dev_outbox ORDER BY id').all();
const DAY = 86400000;
const ymd = (d) => d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
const SETTINGS = { vet_rule: 'hours72', time_zone: 'America/New_York', help_weeks: '8' };

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
  env.DB.raw.prepare("INSERT INTO litters (id, site_id, slug, name, stage, born_on, created_at, updated_at) VALUES ('lit1', ?, 'winter', 'Winter litter', 'current', ?, ?, ?)").run(site.id, ymd(new Date(Date.now() - 50 * DAY)), t, t);
  env.DB.raw.prepare("INSERT INTO puppies (id, site_id, litter_id, slug, name, sex, created_at, updated_at) VALUES ('pup1', ?, 'lit1', 'pup1', 'Opal', 'female', ?, ?)").run(site.id, t, t);
  const her = (path, body) => call(env, M, `/s/akbostons${path}`, body ? { method: 'POST', body: form(body), headers: { cookie: breeder, origin: `https://${M}` } } : { headers: { cookie: breeder } });
  assert.equal((await her('/portal/settings', SETTINGS)).status, 303);
  const res = await her('/portal/new', { name: 'The Reed family', emails: 'sam@example.com', puppy_id: 'pup1', go_home_on: ymd(new Date()) });
  const famId = res.headers.get('location').match(/\/f\/([0-9a-f-]{36})/)[1];
  assert.equal((await her(`/portal/f/${famId}/picked-up`, {})).status, 303);
  await call(env, H, '/family/signin', { method: 'POST', body: form({ email: 'sam@example.com' }), headers: { origin: `https://${H}` } });
  const fcode = outbox(env).at(-1).subject.match(/(\d{6})/)[1];
  const cookie = (await call(env, H, '/family/signin/verify', { method: 'POST', body: form({ email: 'sam@example.com', code: fcode }), headers: { origin: `https://${H}` } })).headers.get('set-cookie').split(';')[0];
  const fam = async (path) => (await call(env, H, path, { headers: { cookie } })).text();
  return { env, site, her, fam };
}

test('the list: Classic for none or an unknown look; each other look names its stylesheets', () => {
  assert.equal(lookOf(null), 'classic');
  assert.equal(lookOf({ look: null }), 'classic');
  assert.equal(lookOf({ look: 'retired' }), 'classic');
  assert.equal(lookOf({ look: 'forest' }), 'forest');
  assert.deepEqual(LOOKS.classic.css, []);
  for (const [k, x] of Object.entries(LOOKS)) {
    assert.ok(x.name && x.about, `${k} has its words for her`);
    if (k !== 'classic') assert.deepEqual(x.css, ['mockup', k]);
  }
});

test('she picks a look; families see it; Classic reads as before', async () => {
  const { env, site, her, fam } = await setup();
  // Her settings list every look, Classic chosen.
  let page = await (await her('/portal/settings')).text();
  for (const x of Object.values(LOOKS)) assert.match(page, new RegExp(`<b>${x.name}</b>`));
  assert.match(page, /name="look" value="classic" checked/);
  // Classic: no look stylesheet, no data-look; the look-only pieces are there but hidden by portal.css.
  let home = await fam('/family');
  assert.doesNotMatch(home, /data-look=|\/_kp\/f\/looks\//);
  assert.match(home, /class="hico"/);
  assert.doesNotMatch(home, /class="card lookonly vetcard"/, 'Classic keeps its numbered vet steps');
  assert.match(home, /class="numsteps"/);
  // Forest.
  assert.equal((await her('/portal/settings', { ...SETTINGS, look: 'forest' })).status, 303);
  assert.equal(env.DB.raw.prepare('SELECT look FROM portal_settings WHERE site_id = ?').get(site.id).look, 'forest');
  assert.match(await (await her('/portal/settings')).text(), /name="look" value="forest" checked/);
  home = await fam('/family');
  assert.match(home, /<body class="in pg-home" data-look="forest">/);
  assert.match(home, /href="\/_kp\/f\/looks\/mockup\.css\?v=\d+">\n<link rel="stylesheet" href="\/_kp\/f\/looks\/forest\.css\?v=\d+">/);
  assert.match(home, /class="card lookonly vetcard"/);
  assert.match(home, /class="lookonly vetrow" href="\/family\/vet"/);
  assert.match(home, /Opal's vet visit/);
  assert.match(await fam('/family/timeline'), /<body class="in pg-timeline" data-look="forest">/);
  assert.match(await fam('/family/vet'), /class="card c-sand vethead"/);
  assert.match(await fam('/family/records'), /class="card c-sand mypup"/);
  // Cream; then an unknown look is refused and nothing changes.
  assert.equal((await her('/portal/settings', { ...SETTINGS, look: 'cream' })).status, 303);
  assert.match(await fam('/family'), /data-look="cream"/);
  const bad = await her('/portal/settings', { ...SETTINGS, look: 'neon' });
  assert.equal(bad.status, 400);
  assert.match(await bad.text(), /Choose a look from the list/);
  assert.equal(env.DB.raw.prepare('SELECT look FROM portal_settings WHERE site_id = ?').get(site.id).look, 'cream');
  // A look stored that the list no longer has reads as Classic.
  env.DB.raw.prepare("UPDATE portal_settings SET look = 'retired' WHERE site_id = ?").run(site.id);
  assert.doesNotMatch(await fam('/family'), /data-look=/);
  // Back to Classic: stored as none.
  assert.equal((await her('/portal/settings', { ...SETTINGS, look: 'classic' })).status, 303);
  assert.equal(env.DB.raw.prepare('SELECT look FROM portal_settings WHERE site_id = ?').get(site.id).look, null);
});

test('every look stylesheet and its art is there', async () => {
  const { readFile } = await import('node:fs/promises');
  const dir = new URL('../public/_kp/f/looks/', import.meta.url);
  for (const x of Object.values(LOOKS)) {
    for (const c of x.css) {
      const css = await readFile(new URL(`${c}.css`, dir), 'utf8');
      for (const [, f] of css.matchAll(/url\("([^"]+)"\)/g)) await readFile(new URL(f, dir));
    }
  }
});

// The owner, 2026-11-21: once the vet visit is behind them, the Vet visit page shows it
// done and its tab gives way (to the handbook, else Photos); nothing uploaded, it stays.
test('the vet visit once it is done: the page says so, the tab gives way', async () => {
  const { env, site, fam } = await setup();
  const db = env.DB.raw;
  const p = db.prepare('SELECT id FROM portal_placements WHERE site_id = ?').get(site.id);
  const tabs = (html) => [...html.match(/<nav class="tabs"[^]*?<\/nav>/)[0].matchAll(/<span>([^<]+)<\/span>/g)].map((m) => m[1]);
  // Booked, nothing uploaded: the tab and the forms stay; the booking reads as a day.
  db.prepare("UPDATE portal_placements SET vet_booked_at = ?, vet_booked_for = '2026-12-24T10:30', vet_clinic = 'Parkway Animal Clinic' WHERE id = ?").run(new Date().toISOString(), p.id);
  assert.deepEqual(tabs(await fam('/family')), ['Home', 'Timeline', 'Vet visit', 'Records']);
  assert.match(await fam('/family'), /Booked for Thu, Dec 24, 10:30 am/);
  assert.match(await fam('/family/vet'), /action="\/family\/vet\/booked"/);
  // Uploaded, not yet accepted, in the first week: done-looking, a new record still possible, the tab stays.
  db.prepare("INSERT INTO portal_files (id, site_id, placement_id, kind, r2_key, type, bytes, name, uploaded_by, uploaded_at) VALUES ('f1', ?, ?, 'proof', 'k', 'application/pdf', 1, 'record.pdf', 'family', ?)").run(site.id, p.id, new Date().toISOString());
  db.prepare("UPDATE portal_placements SET proof_file_id = 'f1', proof_uploaded_at = ? WHERE id = ?").run(new Date().toISOString(), p.id);
  let vet = await fam('/family/vet');
  assert.match(vet, /Record uploaded: thank you/);
  assert.match(vet, /Seen Thu, Dec 24, 10:30 am at Parkway Animal Clinic\./);
  assert.match(vet, /AK Boston Terriers will check it/);
  assert.match(vet, /Upload a different record/);
  assert.doesNotMatch(vet, /action="\/family\/vet\/booked"/);
  assert.deepEqual(tabs(vet), ['Home', 'Timeline', 'Vet visit', 'Records']);
  // Accepted: done, no forms; the tab gives way to Photos (no handbook here).
  db.prepare('UPDATE portal_placements SET proof_accepted_at = ? WHERE id = ?').run(new Date().toISOString(), p.id);
  vet = await fam('/family/vet');
  assert.match(vet, /Opal's vet visit is done/);
  assert.match(vet, /Accepted by AK Boston Terriers/);
  assert.match(vet, /href="\/family\/file\/f1"/);
  assert.doesNotMatch(vet, /<form method="post" action="\/family\/vet/);
  assert.match(vet, /<body class="in pg-vet"/);
  assert.deepEqual(tabs(await fam('/family')), ['Home', 'Timeline', 'Photos', 'Records']);
  // Uploaded but never accepted, a week after pickup: the tab gives way too.
  db.prepare('UPDATE portal_placements SET proof_accepted_at = NULL, picked_up_at = ? WHERE id = ?').run(new Date(Date.now() - 8 * DAY).toISOString(), p.id);
  assert.deepEqual(tabs(await fam('/family/records')), ['Home', 'Timeline', 'Photos', 'Records']);
});

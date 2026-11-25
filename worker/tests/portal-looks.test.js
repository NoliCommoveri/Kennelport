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
  // The four pages drawn as the mockup (family/mk.js): body.mkp, the prototype's markup,
  // its icons and gradients; Classic has none of it.
  assert.match(home, /<body class="in pg-home mkp has-bar" data-look="forest">/);
  assert.match(home, /href="\/_kp\/f\/looks\/mockup\.css\?v=\d+">\n<link rel="stylesheet" href="\/_kp\/f\/looks\/forest\.css\?v=\d+">/);
  assert.match(home, /<linearGradient id="g-gold"/);
  assert.match(home, /<symbol id="i-k-steth"/);
  assert.match(home, /<section class="herocard"><div class="tile photo hero">/);
  assert.match(home, /<svg class="wave"/);
  assert.match(home, /<div class="tile peach"><span class="eyebrow">3-day vet visit<\/span>/);
  assert.match(home, /class="mk only-cream vetcard"/);
  assert.match(home, /<a class="vetrow only-forest" href="\/family\/vet">/);
  assert.match(home, /Opal's vet visit/);
  assert.match(home, /<section class="mk"><header class="mk-h"><span class="mk-i"><svg class="i" aria-hidden="true"><use href="#i-k-pin2"\/><\/svg><\/span><h2>Quick links<\/h2>/);
  // Upload sends itself once a file is picked; a button for a phone without the script.
  assert.match(home, /<form method="post" action="\/family\/vet\/proof" enctype="multipart\/form-data" class="upf"><label class="btn solid small">[^]*?<input class="sr" type="file" name="file" accept="image\/\*,application\/pdf" required data-send><\/label><noscript><button class="btn line small">Upload record<\/button><\/noscript><\/form>/);
  // The header: Messages before Aa.
  assert.match(home, /<header class="top"><div class="in">[^]*?aria-label="Messages"[^]*?id="aa"/);
  assert.doesNotMatch(home, /class="numsteps"/);
  const timeline = await fam('/family/timeline');
  assert.match(timeline, /<body class="in pg-timeline mkp" data-look="forest">/);
  assert.match(timeline, /<div class="mk-head green bleed">[^]*?<svg class="wave"[^]*?<div class="timeline-body bleed">/);
  const vet = await fam('/family/vet');
  assert.match(vet, /<div class="sheet bleed"><div class="mk-head cream"><svg class="swoosh only-cream"[^]*?<svg class="stethart only-forest"/);
  assert.match(vet, /<p class="notebox"><span class="ring">/);
  assert.match(vet, /<form method="post" action="\/family\/vet\/booked" class="stack vf">/);
  const records = await fam('/family/records');
  assert.match(records, /<section class="mk mypup"><span class="paw only-cream">[^]*?<svg class="boston only-forest"/);
  assert.match(records, /<use href="#i-k-syringe"\/><\/svg><\/span><h2>Shots, deworming and vet visits<\/h2>/);
  // Classic: none of the mockup's markup.
  env.DB.raw.prepare('UPDATE portal_settings SET look = NULL WHERE site_id = ?').run(site.id);
  const classic = await fam('/family');
  assert.doesNotMatch(classic, /mkp|i-k-|g-gold|herocard|data-send/);
  env.DB.raw.prepare("UPDATE portal_settings SET look = 'forest' WHERE site_id = ?").run(site.id);
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

test('every look stylesheet is there, and draws no file that is gone', async () => {
  const { readFile } = await import('node:fs/promises');
  const dir = new URL('../public/_kp/f/looks/', import.meta.url);
  for (const x of Object.values(LOOKS)) {
    for (const c of x.css) {
      const css = await readFile(new URL(`${c}.css`, dir), 'utf8');
      for (const [, f] of css.matchAll(/url\("([^"]+)"\)/g)) if (!f.startsWith('data:')) await readFile(new URL(f, dir));
    }
  }
});

// The owner, 2026-11-21: once the vet visit is behind them, the Vet visit page shows it
// done and its tab gives way (to the handbook, else Photos). 2026-11-24: the tab goes as
// soon as a record is in, and 24 hours past the deadline anyway; one she declines brings
// it back (and the family's pages ask for the record again).
test('the vet visit once it is done: the page says so, the tab gives way', async () => {
  const { env, site, fam } = await setup();
  const db = env.DB.raw;
  const p = db.prepare('SELECT id FROM portal_placements WHERE site_id = ?').get(site.id);
  const tabs = (html) => [...html.match(/<nav class="tabs"[^]*?<\/nav>/)[0].matchAll(/<span>([^<]+)<\/span>/g)].map((m) => m[1]);
  // Booked, nothing uploaded: the tab and the forms stay; the booking reads as a day.
  db.prepare("UPDATE portal_placements SET vet_booked_at = ?, vet_booked_for = '2026-12-24T10:30', vet_clinic = 'Parkway Animal Clinic' WHERE id = ?").run(new Date().toISOString(), p.id);
  assert.deepEqual(tabs(await fam('/family')), ['Home', 'Timeline', 'Vet visit', 'Photos', 'Records']);
  assert.match(await fam('/family'), /Booked for Thu, Dec 24, 10:30 am/);
  assert.match(await fam('/family/vet'), /action="\/family\/vet\/booked"/);
  // Uploaded, not yet accepted: done-looking, a new record still possible, and the tab gives way at once.
  db.prepare("INSERT INTO portal_files (id, site_id, placement_id, kind, r2_key, type, bytes, name, uploaded_by, uploaded_at) VALUES ('f1', ?, ?, 'proof', 'k', 'application/pdf', 1, 'record.pdf', 'family', ?)").run(site.id, p.id, new Date().toISOString());
  db.prepare("UPDATE portal_placements SET proof_file_id = 'f1', proof_uploaded_at = ? WHERE id = ?").run(new Date().toISOString(), p.id);
  let vet = await fam('/family/vet');
  assert.match(vet, /Record uploaded: thank you/);
  assert.match(vet, /Seen Thu, Dec 24, 10:30 am at Parkway Animal Clinic\./);
  assert.match(vet, /AK Boston Terriers will check it/);
  assert.match(vet, /Upload a different record/);
  assert.doesNotMatch(vet, /action="\/family\/vet\/booked"/);
  assert.deepEqual(tabs(vet), ['Home', 'Timeline', 'Photos', 'Records']);
  // Accepted: done, no forms; the tab gives way to Photos (no handbook here).
  db.prepare('UPDATE portal_placements SET proof_accepted_at = ? WHERE id = ?').run(new Date().toISOString(), p.id);
  vet = await fam('/family/vet');
  assert.match(vet, /Opal's vet visit is done/);
  assert.match(vet, /Accepted by AK Boston Terriers/);
  assert.match(vet, /href="\/family\/file\/f1"/);
  assert.doesNotMatch(vet, /<form method="post" action="\/family\/vet/);
  assert.match(vet, /<body class="in pg-vet"/);
  assert.deepEqual(tabs(await fam('/family')), ['Home', 'Timeline', 'Photos', 'Records']);
  // Uploaded but never accepted, a week after pickup: still gone.
  db.prepare('UPDATE portal_placements SET proof_accepted_at = NULL, picked_up_at = ? WHERE id = ?').run(new Date(Date.now() - 8 * DAY).toISOString(), p.id);
  assert.deepEqual(tabs(await fam('/family/records')), ['Home', 'Timeline', 'Photos', 'Records']);

  // Nothing uploaded: the tab stays until 24 hours past the deadline, then goes; Home
  // still asks for the record.
  const HOUR = 3600000;
  const at = (ms) => new Date(Date.now() + ms).toISOString();
  db.prepare("UPDATE portal_placements SET proof_file_id = NULL, proof_uploaded_at = NULL, pickup_state = 'confirmed', picked_up_at = ?, vet_deadline_at = ? WHERE id = ?").run(at(-80 * HOUR), at(-8 * HOUR), p.id);
  assert.deepEqual(tabs(await fam('/family')), ['Home', 'Timeline', 'Vet visit', 'Photos', 'Records']);
  db.prepare('UPDATE portal_placements SET picked_up_at = ?, vet_deadline_at = ? WHERE id = ?').run(at(-100 * HOUR), at(-25 * HOUR), p.id);
  const home = await fam('/family');
  assert.deepEqual(tabs(home), ['Home', 'Timeline', 'Photos', 'Records']);
  assert.match(home, /Upload the vet's record on the <a href="\/family\/vet">Vet visit<\/a> page|upload the record on the <a href="\/family\/vet">Vet visit<\/a> page/);
  // The page itself still opens from that link, with no tab lit.
  assert.doesNotMatch(await fam('/family/vet'), /aria-current/);

  // Uploaded, then she declines it: the tab is back for a day, and their pages ask again.
  db.prepare('UPDATE portal_placements SET proof_file_id = \'f1\', proof_uploaded_at = ?, proof_declined_at = ? WHERE id = ?').run(at(-30 * HOUR), at(-1 * HOUR), p.id);
  vet = await fam('/family/vet');
  assert.deepEqual(tabs(vet), ['Home', 'Timeline', 'Vet visit', 'Photos', 'Records']);
  assert.doesNotMatch(vet, /Record uploaded: thank you|will check it|declined/i);
  // A day after she declined, with nothing new: gone again.
  db.prepare('UPDATE portal_placements SET proof_declined_at = ? WHERE id = ?').run(at(-25 * HOUR), p.id);
  assert.deepEqual(tabs(await fam('/family')), ['Home', 'Timeline', 'Photos', 'Records']);
});

test('her vet record: decline it, the family uploads again, she accepts', async () => {
  const { declineProof, acceptProof, saveFile, getPlacement } = await import('../src/portal/store.js');
  const { vetStatus, vetTabShown } = await import('../src/portal/vet.js');
  const { env, site } = await setup();
  const db = env.DB.raw;
  const p = db.prepare('SELECT id FROM portal_placements WHERE site_id = ?').get(site.id);
  await assert.rejects(declineProof(env, site.id, p.id), /No vet record to decline yet/);
  await saveFile(env, site.id, p.id, { kind: 'proof', bytes: new TextEncoder().encode('%PDF-1.4 a'), name: 'r.pdf', by: 'family' });
  let row = await getPlacement(env, site.id, p.id);
  assert.equal(vetTabShown(row), false);
  await declineProof(env, site.id, p.id);
  row = await getPlacement(env, site.id, p.id);
  assert.ok(row.proof_declined_at);
  assert.equal(vetStatus(row).word, 'Record declined');
  assert.equal(vetTabShown(row), true);
  // A new upload clears it; accepting does too.
  await saveFile(env, site.id, p.id, { kind: 'proof', bytes: new TextEncoder().encode('%PDF-1.4 b'), name: 'r2.pdf', by: 'family' });
  row = await getPlacement(env, site.id, p.id);
  assert.equal(row.proof_declined_at, null);
  await declineProof(env, site.id, p.id);
  await acceptProof(env, site.id, p.id);
  row = await getPlacement(env, site.id, p.id);
  assert.equal(row.proof_declined_at, null);
  assert.equal(vetStatus(row).word, 'Accepted');
});

// The looks' checklist (family/mk.js): a box that sends its form. Ticked, the form carries
// done=1 then the hidden done=0, and the server reads the first; unticked, only done=0.
test('the looks\' checklist ticks and unticks', async () => {
  const { checklist } = await import('../src/portal/family/mk.js');
  const html = checklist([{ id: 'c1', title: 'Crate ready', done: false, raw: {} }, { id: 'v', title: 'Vet booked', done: true, auto: 'vet_booking', raw: {} }]);
  assert.match(html, /<input type="checkbox" name="done" value="1" data-send>Crate ready<\/label><input type="hidden" name="done" value="0">/);
  assert.match(html, /<input type="checkbox" checked disabled>Vet booked/);
  assert.match(html, /1 of 2 ready/);
  const sent = (checked) => { const f = new URLSearchParams({ kind: 'checklist', id: 'c1', back: 'home' }); if (checked) f.append('done', '1'); f.append('done', '0'); return f.get('done'); };
  assert.equal(sent(true), '1');
  assert.equal(sent(false), '0');
});

test('the tabs by stage: five at most, the handbook second from last whenever she has one', async () => {
  const { tabsFor } = await import('../src/portal/family.js');
  const names = (o) => tabsFor(o).map((t) => t[2]);
  assert.deepEqual(names({ handbook: true }), ['Home', 'Timeline', 'Vet visit', 'Handbook', 'Records']);
  assert.deepEqual(names({ handbook: true, vetTab: false }), ['Home', 'Timeline', 'Photos', 'Handbook', 'Records']);
  assert.deepEqual(names({}), ['Home', 'Timeline', 'Vet visit', 'Photos', 'Records']);
  assert.deepEqual(names({ vetTab: false }), ['Home', 'Timeline', 'Photos', 'Records']);
  assert.deepEqual(names({ stay: true, handbook: true }), ['Home', 'Stay', 'Vet visit', 'Handbook', 'Records']);
  assert.deepEqual(names({ loss: true, handbook: true }), ['Home', 'Photos']);
});

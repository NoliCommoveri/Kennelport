// Scratch: renders the live family portal for the prototype's sample family (the Reeds,
// Opal) on the prototype's four dates, for the "Current" look of docs/reference/portal-looks.html.
// Run: SNAP_OUT=/path/snap.json node --test worker/scripts/portal-current-snapshots.mjs (not picked up by the test run).
// SNAP_LOOK=forest|cream|classic renders in that look (portal_settings.look; Classic by default).
// SNAP_DIR=/path also writes each page as <dir>/<stage>-<page>.html, viewable on its own: /_kp/
// points at worker/public/_kp/ on disk, and Opal's photo at SNAP_PHOTO (the prototype's
// img/opal.jpg; her logo and Opal's other photos at the prototype's ak-logo.jpg, contessa.jpg
// and willow.jpg beside it). worker/scripts/portal-looks-check.mjs measures these against the prototype.
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { makeEnv, call, addSite } from '../tests/helpers/env.js';

const M = 'manage.kennelport.com';
const H = 'akbostons.kennelport.com';
const form = (o) => new URLSearchParams(o);
const outbox = (env) => env.DB.raw.prepare('SELECT kind, subject, body FROM dev_outbox ORDER BY id').all();
// New York times as UTC instants (EST, -5).
const NY = (y, m, d, h = 0, mi = 0) => Date.UTC(y, m - 1, d, h + 5, mi);
const LOOK = process.env.SNAP_LOOK || 'classic';
const KP = pathToFileURL(fileURLToPath(new URL('../public/_kp/', import.meta.url))).href;
const STAGES = { before: NY(2026, 12, 18, 9), vet: NY(2026, 12, 24, 16, 30), weeks: NY(2027, 1, 12, 10), later: NY(2027, 10, 28, 8) };

async function render(stage) {
  mock.timers.enable({ apis: ['Date'], now: NY(2026, 11, 20, 9) });
  try {
    const env = await makeEnv({ PORTAL_EMAIL_KEY: 'portal-test-key' });
    const site = await addSite(env, 'akbostons', { kennel_name: 'A-K Boston Terriers', contact_phone: '423-555-0142', breed: 'Boston Terrier' });
    const ops = (await call(env, M, '/ops/login', { method: 'POST', body: form({ token: 'ops-token' }) })).headers.get('set-cookie').split(';')[0];
    await call(env, M, `/ops/sites/${site.id}/people`, { method: 'POST', headers: { cookie: ops }, body: form({ email: 'breeder@example.com', role: 'owner' }) });
    await call(env, M, '/signin', { method: 'POST', body: form({ email: 'breeder@example.com' }), headers: { origin: `https://${M}` } });
    const code = outbox(env).at(-1).subject.match(/(\d{6})/)[1];
    const breeder = (await call(env, M, '/signin/verify', { method: 'POST', body: form({ email: 'breeder@example.com', code }), headers: { origin: `https://${M}` } })).headers.get('set-cookie').split(';')[0];
    await call(env, M, `/ops/sites/${site.id}/portal/on`, { method: 'POST', headers: { cookie: ops } });
    const t = new Date().toISOString();
    const db = env.DB.raw;
    db.prepare("INSERT INTO photos (id, site_id, r2_key, type, bytes, alt, created_at) VALUES ('ph-opal', ?, 'x', 'image/jpeg', 1, 'Opal', ?)").run(site.id, t);
    // The prototype's sample (docs/reference/portal-looks.html): her logo, and two more photos of Opal.
    for (const [id, alt, at] of [['ph-logo', 'A-K logo', t], ['ph-contessa', 'Opal', '2026-11-19T00:00:00.000Z'], ['ph-willow', 'Opal', '2026-11-18T00:00:00.000Z']]) {
      db.prepare("INSERT INTO photos (id, site_id, r2_key, type, bytes, alt, created_at) VALUES (?, ?, 'x', 'image/jpeg', 1, ?, ?)").run(id, site.id, alt, at);
    }
    db.prepare("UPDATE sites SET logo_photo_id = 'ph-logo' WHERE id = ?").run(site.id);
    db.prepare("INSERT INTO litters (id, site_id, slug, name, stage, born_on, dam_name, sire_name, created_at, updated_at) VALUES ('gem', ?, 'gem', 'Gem litter', 'current', '2026-10-28', 'Willow', 'Boone', ?, ?)").run(site.id, t, t);
    db.prepare("INSERT INTO puppies (id, site_id, litter_id, slug, name, sex, color, registration, registry, photo_id, created_at, updated_at) VALUES ('opal', ?, 'gem', 'opal', 'Opal', 'female', 'Black & white', 'limited', 'AKC', 'ph-opal', ?, ?)").run(site.id, t, t);
    for (const ph of ['ph-contessa', 'ph-willow']) db.prepare("INSERT INTO photo_tags (site_id, photo_id, subject) VALUES (?, ?, 'puppy:opal')").run(site.id, ph);
    for (const [id, name, url, sort] of [['food', 'Puppy food program', 'https://food.example/akb', 1], ['ins', 'Pet insurance trial', 'https://insure.example/akb', 2], ['akc', 'AKC registration', 'https://akc.example/akb', 3], ['crate', 'Crate and bedding', 'https://crate.example/akb', 4]]) {
      db.prepare('INSERT INTO products (id, site_id, name, link_url, sort) VALUES (?, ?, ?, ?, ?)').run(id, site.id, name, url, sort);
    }
    const her = (path, body) => call(env, M, `/s/akbostons${path}`, body ? { method: 'POST', body: form(body), headers: { cookie: breeder, origin: `https://${M}` } } : { headers: { cookie: breeder } });
    const saved = await her('/portal/settings', {
      vet_rule: 'hours72', time_zone: 'America/New_York', help_weeks: '8', her_phone: '423-555-0142', her_email: 'hello@akbostons.example',
      vet_clinic: 'Parkway Animal Clinic', vet_phone: '706-555-0180', vet_address: '1622 Dietz Rd, Ringgold, GA 30736',
      food_name: 'Small-breed puppy formula, chicken & rice', food_bag: '4 lb bag', food_how: '⅓ cup, three times a day',
      'type.food': 'food', 'action.food': 'Order with A-K’s code for a first-order discount', 'type.ins': 'insurance', 'action.ins': 'Activate the free trial within 5 days of pickup',
      look: LOOK, 'type.akc': 'registration', 'action.akc': 'Register with the papers in your go-home folder', 'type.crate': 'product',
    });
    assert.equal(saved.status, 303, await saved.text());
    await her('/portal/checklist/suggested', {});
    await her('/portal/timeline/suggested', {});
    // The sample handbook: four chapters, with a list, a page break and a program link.
    for (const [title, body] of [
      ['The first night', 'Bring Opal home in the afternoon if you can, so she has a few hours to sniff around before bedtime.\n\nSet the crate beside your bed. She can hear you breathe and settles faster.\n\n- An old towel that smells of her littermates\n- A chew toy sized for small breeds\n- One trip out around 2 am\n\nShe may cry for ten minutes or so. A hand on the crate helps more than taking her out.'],
      ['Crate and potty training', 'Bostons learn fast and love a routine. Take her out after every meal, every nap and every play session.\n\n---\n\nPraise her the moment she goes, outside, every time. Accidents inside get cleaned with an enzyme cleaner and no fuss.\n\n- Out first thing in the morning\n- Out within 15 minutes of eating\n- Out last thing at night'],
      ['Feeding', 'Keep Opal on the food she eats here for at least two weeks. If you change, mix it in slowly over 7 to 10 days.\n\n⅓ cup, three times a day, soaked in warm water the first week.\n\n[link: Puppy food program]'],
      ['Boston basics', 'Bostons are sturdy, funny and very attached to their people. They snore, they love a lap, and they don\'t love heat: keep walks short on hot days.\n\nTheir eyes are large and easy to scratch. Check them daily and call your vet about any redness or squinting.'],
    ]) await her('/portal/handbook/new', { title, body, shown: '1' });
    const res = await her('/portal/new', { name: 'The Reed family', emails: 'sam.reed@example.com', puppy_id: 'opal', pickup_day: '2026-12-23', pickup_time: '11:00' });
    assert.equal(res.status, 303, await res.text());
    const famId = res.headers.get('location').match(/\/f\/([0-9a-f-]{36})/)[1];
    const p = db.prepare('SELECT id FROM portal_placements WHERE family_id = ?').get(famId);
    db.prepare('UPDATE portal_placements SET microchip = ? WHERE id = ?').run('985 112 004 471', p.id);
    db.prepare("INSERT INTO portal_files (id, site_id, placement_id, kind, r2_key, type, bytes, name, uploaded_by, uploaded_at) VALUES ('contract1', ?, ?, 'contract', 'c', 'application/pdf', 1, 'contract.pdf', 'breeder', ?)").run(site.id, p.id, t);
    db.prepare("UPDATE portal_placements SET contract_file_id = 'contract1' WHERE id = ?").run(p.id);
    for (const [ty, on, nm, notes] of [['deworming', '2026-11-11', 'Pyrantel', '2 weeks'], ['deworming', '2026-11-25', 'Pyrantel', '4 weeks'], ['vaccine', '2026-12-09', 'DHPP', 'First puppy shot'], ['deworming', '2026-12-09', 'Pyrantel', '6 weeks'], ['vet_visit', '2026-12-21', 'Health certificate', null]]) {
      db.prepare('INSERT INTO portal_health_records (id, site_id, placement_id, type, given_on, name, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(crypto.randomUUID(), site.id, p.id, ty, on, nm, notes, t);
    }
    if (stage !== 'before') {
      mock.timers.setTime(NY(2026, 12, 23, 11));
      assert.equal((await her(`/portal/f/${famId}/picked-up`, {})).status, 303);
      db.prepare('UPDATE portal_placements SET vet_booked_at = ?, vet_booked_for = ?, vet_clinic = ? WHERE id = ?').run(new Date().toISOString(), '2026-12-24T10:30', 'Parkway Animal Clinic', p.id);
      if (stage !== 'vet') db.prepare("INSERT INTO portal_files (id, site_id, placement_id, kind, r2_key, type, bytes, name, uploaded_by, uploaded_at) VALUES ('proof1', ?, ?, 'proof', 'k', 'application/pdf', 1, 'vet-record.pdf', 'family', ?)").run(site.id, p.id, new Date(NY(2026, 12, 24, 15)).toISOString());
      if (stage !== 'vet') db.prepare("UPDATE portal_placements SET proof_file_id = 'proof1' WHERE id = ?").run(p.id);
      if (stage !== 'vet') db.prepare('UPDATE portal_placements SET proof_uploaded_at = ?, proof_accepted_at = ? WHERE id = ?').run(new Date(NY(2026, 12, 24, 15)).toISOString(), new Date(NY(2026, 12, 24, 18)).toISOString(), p.id);
    }
    mock.timers.setTime(STAGES[stage]);
    await call(env, H, '/family/signin', { method: 'POST', body: form({ email: 'sam.reed@example.com' }), headers: { origin: `https://${H}` } });
    const fcode = outbox(env).at(-1).subject.match(/(\d{6})/)[1];
    const cookie = (await call(env, H, '/family/signin/verify', { method: 'POST', body: form({ email: 'sam.reed@example.com', code: fcode }), headers: { origin: `https://${H}` } })).headers.get('set-cookie').split(';')[0];
    const out = {};
    for (const [k, path] of [['home', '/family'], ['timeline', '/family/timeline'], ['vet', '/family/vet'], ['records', '/family/records'], ['handbook', '/family/handbook']]) {
      const r = await call(env, H, path, { headers: { cookie } });
      assert.equal(r.status, 200, `${stage} ${path}`);
      out[k] = await r.text();
    }
    return out;
  } finally { mock.timers.reset(); }
}

test('snapshots', async () => {
  const all = {};
  for (const stage of Object.keys(STAGES)) all[stage] = await render(stage);
  if (process.env.SNAP_OUT) writeFileSync(process.env.SNAP_OUT, JSON.stringify(all));
  if (process.env.SNAP_DIR) {
    mkdirSync(process.env.SNAP_DIR, { recursive: true });
    const photo = process.env.SNAP_PHOTO ? pathToFileURL(process.env.SNAP_PHOTO).href : 'img/opal.jpg';
    for (const [stage, pages] of Object.entries(all)) {
      for (const [k, html] of Object.entries(pages)) {
        const file = html.replace(/\/(?:family\/photo|_kp\/p)\/ph-(logo|contessa|willow)(\?s=t)?/g, (m, n) => photo.replace(/opal\.jpg$/, `${n === 'logo' ? 'ak-logo' : n}.jpg`))
          .replace(/\/family\/photo\/ph-opal(\?s=t)?/g, photo)
          .replace(/(["'(])\/_kp\/([^"')?]*)(\?v=[^"')]*)?/g, (m, q, rest) => `${q}${KP}${rest}`);
        writeFileSync(`${process.env.SNAP_DIR}/${stage}-${k}.html`, file);
      }
    }
  }
});

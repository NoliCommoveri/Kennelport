// Resources and the potty schedule (docs/plans/portal-resources-potty.md): her links
// and PDFs, every add with a remove; the families' Resources page and its Quick link; the
// potty schedule's maths, the family's answers, her guide and her switches.
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

async function setup({ on = true, saved = true } = {}) {
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
  // Her portal settings saved once, as a breeder does first (invites and reminders wait for it).
  if (on && saved) assert.equal((await her('/portal/settings', { vet_kind: 'hours', vet_hours: '72', time_zone: 'America/New_York', help_weeks: '8' })).status, 303);
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

test('Resources: she adds links, a program and a PDF under her headings; families open them; each can be changed, moved, hidden and removed', async () => {
  const { env, her, fam } = await setup();
  env.DB.raw.prepare("INSERT INTO products (id, site_id, name, link_url, portal_show, sort) VALUES ('prog', ?, 'Puppy Culture', 'https://puppyculture.example/join', 1, 0)").run(env.DB.raw.prepare("SELECT id FROM sites WHERE subdomain = 'akbostons'").get().id);
  const id = await addFamily(her, { name: 'The Reed family', emails: 'sam@example.com', puppy_id: 'pup1' });
  const reed = fam(await familySignIn(env, 'sam@example.com'));
  // None yet: no Quick link.
  assert.doesNotMatch(await (await reed('/family')).text(), /\/family\/resources/);
  assert.match(await (await her('/portal/setup')).text(), /Resources/);
  assert.match(await (await her('/portal/resources')).text(), /None yet/);
  // A link with no address is refused, in her words; then three go in.
  const bad = await her('/portal/resources/new', { kind: 'link', title: 'Quiz', url: 'not a link' });
  assert.equal(bad.status, 400);
  assert.match(await bad.text(), /Type the web address/);
  assert.equal((await her('/portal/resources/new', { kind: 'link', title: 'Learning styles quiz', url: 'www.example.com/quiz', note: 'Ten minutes.', heading: 'Learning', shown: '1' })).status, 303);
  assert.equal((await her('/portal/resources/new', { kind: 'link', title: 'Join Puppy Culture', product_id: 'prog', heading: 'Training', shown: '1' })).status, 303);
  const fd = new FormData();
  for (const [k, v] of Object.entries({ kind: 'file', title: 'Crate training at a glance', heading: 'Training', shown: '1' })) fd.append(k, v);
  fd.append('file', pdf(), 'crate.pdf');
  assert.equal((await her('/portal/resources/new', fd)).status, 303);
  const rows = env.DB.raw.prepare('SELECT * FROM portal_resources ORDER BY sort').all();
  assert.deepEqual(rows.map((r) => [r.kind, r.title, r.sort]), [['link', 'Learning styles quiz', 0], ['link', 'Join Puppy Culture', 1], ['file', 'Crate training at a glance', 2]]);
  assert.equal(rows[0].url, 'https://www.example.com/quiz');
  // Families: the Quick link, the page grouped under her headings, each opening.
  assert.match(await (await reed('/family')).text(), /href="\/family\/resources"/);
  const page = await (await reed('/family/resources')).text();
  assert.match(page, /Learning<\/h2>.*Learning styles quiz.*Ten minutes\..*Training<\/h2>.*Join Puppy Culture.*Crate training at a glance/s);
  assert.match(page, /href="https:\/\/www\.example\.com\/quiz"/);
  assert.match(page, /href="\/family\/go\/prog\?from=resources"/);
  const file = await reed(`/family/resource/${rows[2].id}`);
  assert.equal(file.status, 200);
  assert.equal(file.headers.get('content-type'), 'application/pdf');
  const go = await reed('/family/go/prog?from=resources');
  assert.equal(go.headers.get('location'), 'https://puppyculture.example/join');
  assert.equal(env.DB.raw.prepare("SELECT COUNT(*) AS n FROM portal_clicks WHERE place = 'resources'").get().n, 1);
  // Changed, moved, hidden: families see it as she left it.
  assert.equal((await her(`/portal/resources/${rows[0].id}`, { title: 'Which way does your puppy learn?', url: 'https://www.example.com/quiz', heading: 'Learning', shown: '1' })).status, 303);
  assert.equal((await her(`/portal/resources/${rows[2].id}/up`, {})).status, 303);
  assert.deepEqual(env.DB.raw.prepare('SELECT title FROM portal_resources ORDER BY sort').all().map((r) => r.title), ['Which way does your puppy learn?', 'Crate training at a glance', 'Join Puppy Culture']);
  assert.equal((await her(`/portal/resources/${rows[1].id}`, { title: 'Join Puppy Culture', product_id: 'prog', heading: 'Training' })).status, 303);
  assert.doesNotMatch(await (await reed('/family/resources')).text(), /Join Puppy Culture/);
  // Removed, the PDF's file too; with none on, the Quick link goes.
  assert.equal((await her(`/portal/resources/${rows[2].id}/remove`, {})).status, 303);
  assert.equal(await env.FILES.get(rows[2].r2_key), null);
  assert.equal((await reed(`/family/resource/${rows[2].id}`)).status, 404);
  assert.equal((await her(`/portal/resources/${rows[0].id}/remove`, {})).status, 303);
  assert.doesNotMatch(await (await reed('/family')).text(), /href="\/family\/resources"/);
  assert.equal(env.DB.raw.prepare('SELECT COUNT(*) AS n FROM portal_resources').get().n, 1);
  assert.ok(id);
});

const potty = await import('../src/portal/potty.js');

test('the potty schedule: trips by age from their day; nights shorten as the puppy grows; answers checked', () => {
  const day = { wake: '06:30', bed: '22:00', meals: ['07:00', '12:00', '17:00'] };
  const at8 = potty.pottySchedule(day, 8);
  assert.equal(at8[0].at, '06:30');
  assert.deepEqual(at8.filter((x) => x.kind === 'meal').map((x) => x.at), ['07:15', '12:15', '17:15']);
  // Never more than the day's limit between two trips while awake (an hour at 8 weeks).
  const m = (x) => Number(x.at.slice(0, 2)) * 60 + Number(x.at.slice(3));
  const awake = at8.filter((x) => x.kind !== 'night');
  for (let i = 1; i < awake.length; i++) assert.ok(m(awake[i]) - m(awake[i - 1]) <= 60, awake[i].at);
  assert.equal(awake.at(-1).at, '22:00');
  assert.equal(at8.filter((x) => x.kind === 'night').length, 2);
  assert.equal(potty.pottySchedule(day, 17).filter((x) => x.kind === 'night').length, 1);
  assert.equal(potty.pottySchedule(day, 30).filter((x) => x.kind === 'night').length, 0);
  assert.ok(potty.pottySchedule(day, 17).length < at8.length);
  assert.deepEqual(potty.limitsLine(11), { day: '1½ hours', night: '3½ hours' });
  assert.deepEqual(potty.limitsLine(8), { day: '1 hour', night: '3 hours' });
  // A late night owl: bedtime after midnight still works.
  const late = potty.pottySchedule({ wake: '08:00', bed: '00:30', meals: ['08:30', '18:00'] }, 13);
  assert.equal(late.find((x) => x.kind === 'bed').at, '00:30');
  for (const [bad, msg] of [[{ ...day, wake: '' }, /first person is up/], [{ ...day, meals: ['07:00'] }, /2 to 4 meal/], [{ ...day, meals: ['07:00', '23:00'] }, /between when you're up and bedtime/], [{ ...day, bed: '10:00' }, /at least 8 hours/]]) {
    assert.throws(() => potty.cleanPotty(bad), msg);
  }
  assert.match(potty.guideHtml('Hi {name}.\n\n- One\n- <b>Two</b>', { name: 'Opal' }, '*'), /^<p>Hi Opal\.<\/p><ul class="hl">.*One.*&lt;b&gt;Two/);
});

test('potty: the family makes, changes and removes their schedule; the task opens it and ticks itself; her guide, her switch, the owner\'s age', async () => {
  const { env, her, fam } = await setup();
  const siteId = env.DB.raw.prepare("SELECT id FROM sites WHERE subdomain = 'akbostons'").get().id;
  env.DB.raw.prepare('UPDATE litters SET born_on = ?').run(ymd(new Date(Date.now() - 9 * 7 * DAY - DAY)));
  const id = await addFamily(her, { name: 'The Reed family', emails: 'sam@example.com', puppy_id: 'pup1', go_home_on: ymd(new Date(Date.now() + 5 * DAY)) });
  // Her timeline from the suggested list carries the task, before pickup.
  assert.equal((await her('/portal/timeline/suggested', {})).status, 303);
  const task = env.DB.raw.prepare("SELECT * FROM portal_timeline_tasks WHERE opens = 'potty'").get();
  assert.equal(task.title, 'Set up {name}\'s potty schedule');
  assert.equal(task.offset_days, -3);
  const reed = fam(await familySignIn(env, 'sam@example.com'));
  // Quick link and Records link; the page asks its three questions.
  assert.match(await (await reed('/family')).text(), /href="\/family\/potty"/);
  assert.match(await (await reed('/family/records')).text(), /href="\/family\/potty"/);
  let page = await (await reed('/family/potty')).text();
  assert.match(page, /At 9 weeks, Opal needs to go out at least every <b>1 hour<\/b>/);
  assert.match(page, /When is the first person up\?/);
  assert.match(page, /Every trip outside is a chance for Opal/);
  assert.match(await (await reed('/family/timeline')).text(), /Set up Opal&#39;s potty schedule.*Make the schedule/s);
  // A bad answer comes back with what they typed; then they make it.
  const bad = await reed('/family/potty', form([['wake', '06:30'], ['bed', '22:00'], ['meals', '07:00']]));
  assert.equal(bad.status, 400);
  assert.match(await bad.text(), /Give 2 to 4 meal times/);
  assert.equal((await reed('/family/potty', form([['wake', '06:00'], ['bed', '21:30'], ['meals', '06:30'], ['meals', '11:30'], ['meals', '16:30'], ['meals', '']]))).status, 303);
  page = await (await reed('/family/potty')).text();
  assert.match(page, /Today.s trips outside.*6:00<\/b>am.*Out first thing.*After breakfast.*Last trip before bed.*Overnight trip/s);
  assert.match(page, /Change the times/);
  // The task ticked itself.
  assert.match(await (await reed('/family/timeline')).text(), /See the schedule/);
  // Changed, then removed: back to the questions.
  assert.equal((await reed('/family/potty', form([['wake', '07:00'], ['bed', '22:00'], ['meals', '07:30'], ['meals', '17:30']]))).status, 303);
  assert.equal(env.DB.raw.prepare('SELECT meals FROM portal_potty').get().meals, '07:30,17:30');
  assert.equal((await reed('/family/potty/remove', form({}))).status, 303);
  assert.equal(env.DB.raw.prepare('SELECT COUNT(*) AS n FROM portal_potty').get().n, 0);
  // Her guide: her words, then back to the suggested one; off.
  assert.match(await (await her('/portal/potty')).text(), /The suggested guide/);
  assert.equal((await her('/portal/potty', { potty_on: '1', guide_on: '1', potty_guide: 'Our way, for {name}:\n\n- Bell on the door.' })).status, 303);
  page = await (await reed('/family/potty')).text();
  assert.match(page, /Our way, for Opal:/);
  assert.doesNotMatch(page, /Every trip outside/);
  assert.equal((await her('/portal/potty', { potty_on: '1', guide_on: '1', potty_guide: 'x', reset: '1' })).status, 303);
  assert.match(await (await reed('/family/potty')).text(), /Every trip outside is a chance/);
  assert.equal((await her('/portal/potty', { potty_on: '1', potty_guide: '' })).status, 303);
  assert.doesNotMatch(await (await reed('/family/potty')).text(), /The potty guide/);
  // The owner's age rule: past it, no Quick link (the page stays under Records).
  env.DB.raw.prepare("UPDATE site_builds SET build = json_set(COALESCE(build, '{}'), '$.portal_timing', json('{\"potty_until_weeks\":8}')) WHERE site_id = ?").run(siteId);
  const after = await (await reed('/family')).text();
  if (env.DB.raw.prepare('SELECT COUNT(*) AS n FROM site_builds WHERE site_id = ?').get(siteId).n) assert.doesNotMatch(after, /href="\/family\/potty"/);
  // Her switch off: no page, no Quick link, no task, no Records link.
  assert.equal((await her('/portal/potty', { guide_on: '1', potty_guide: '' })).status, 303);
  assert.equal((await reed('/family/potty')).status, 303);
  assert.doesNotMatch(await (await reed('/family/timeline')).text(), /potty schedule/);
  assert.doesNotMatch(await (await reed('/family/records')).text(), /href="\/family\/potty"/);
  assert.match(await (await her('/portal/timeline')).text(), /Set up \{name\}&#39;s potty schedule/);
  assert.ok(id && task);
});

test('potty: her timeline suggests the task with one tap until it is on it; it lands at the bottom', async () => {
  const { env, her } = await setup();
  await her('/portal/timeline/new', { title: 'Puppy class', days: '9', when: 'after', count_from: 'pickup' });
  let page = await (await her('/portal/timeline')).text();
  assert.match(page, /Suggested: Set up \{name\}&#39;s potty schedule/);
  assert.equal((await her('/portal/timeline/ready', { ready: 'potty' })).status, 303);
  const rows = env.DB.raw.prepare('SELECT title, opens, sort FROM portal_timeline_tasks ORDER BY sort').all();
  assert.deepEqual(rows.map((r) => [r.title, r.opens]), [['Puppy class', null], ['Set up {name}\'s potty schedule', 'potty']]);
  page = await (await her('/portal/timeline')).text();
  assert.doesNotMatch(page, /Suggested: Set up/);
  // Her task editor offers it as a kind that ticks itself.
  assert.match(page, /Opens their potty schedule; done when they make it/);
});

test('training: the AKC timeline with the puppy\'s stage first, the S.T.A.R. checklist, a Quick link; her switch', async () => {
  const { env, her, fam } = await setup();
  env.DB.raw.prepare('UPDATE litters SET born_on = ?').run(ymd(new Date(Date.now() - 20 * 7 * DAY)));
  await addFamily(her, { name: 'The Reed family', emails: 'sam@example.com', puppy_id: 'pup1' });
  const reed = fam(await familySignIn(env, 'sam@example.com'));
  assert.match(await (await reed('/family')).text(), /href="\/family\/training"/);
  const page = await (await reed('/family/training')).text();
  // At 20 weeks the "By 6 months" stage comes first, marked as where Opal is.
  assert.match(page, /Training Opal.*By 6 months[^<]*<\/h2><p class="small muted">Where Opal is now\..*8–16 weeks/s);
  assert.match(page, /Bite inhibition/);
  const star = await (await reed('/family/training?track=akc_star_puppy')).text();
  assert.match(star, /S\.T\.A\.R\. Puppy class/);
  assert.doesNotMatch(star, /Where Opal is now/);
  assert.match(await (await her('/portal/resources')).text(), /Families have the training guides/);
  assert.equal((await her('/portal/resources/training', {})).status, 303);
  assert.equal((await reed('/family/training')).status, 303);
  assert.doesNotMatch(await (await reed('/family')).text(), /href="\/family\/training"/);
  assert.equal((await her('/portal/resources/training', { on: '1' })).status, 303);
  assert.equal((await reed('/family/training')).status, 200);
});

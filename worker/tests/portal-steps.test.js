// The Puppy Parent Portal, build chunk 2 (docs/plans/family-portal.md sections
// 4, 7.2 and 9): her checklist and timeline templates, each family's ticks, hidden
// steps and moved days, program status and own codes, and the food band.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';

const M = 'manage.kennelport.com';
const H = 'akbostons.kennelport.com';
const form = (o) => new URLSearchParams(o);
const outbox = (env) => env.DB.raw.prepare('SELECT kind, subject, body FROM dev_outbox ORDER BY id').all();
const ymd = (d) => d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
const DAY = 86400000;

const { taskDue, taskState, basesFor, OVERDUE_DAYS } = await import('../src/portal/steps.js');
const { closeSite } = await import('../src/sites.js');
const { runPortalDaily } = await import('../src/portal/account.js');

async function setup() {
  const env = await makeEnv({ PORTAL_EMAIL_KEY: 'portal-test-key' });
  const site = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  const ops = (await call(env, M, '/ops/login', { method: 'POST', body: form({ token: 'ops-token' }) })).headers.get('set-cookie').split(';')[0];
  await call(env, M, `/ops/sites/${site.id}/people`, { method: 'POST', headers: { cookie: ops }, body: form({ email: 'breeder@example.com', role: 'owner' }) });
  await call(env, M, '/signin', { method: 'POST', body: form({ email: 'breeder@example.com' }), headers: { origin: `https://${M}` } });
  const code = outbox(env).at(-1).subject.match(/(\d{6})/)[1];
  const res = await call(env, M, '/signin/verify', { method: 'POST', body: form({ email: 'breeder@example.com', code }), headers: { origin: `https://${M}` } });
  const breeder = res.headers.get('set-cookie').split(';')[0];
  await call(env, M, `/ops/sites/${site.id}/portal/on`, { method: 'POST', headers: { cookie: ops } });
  const t = new Date().toISOString();
  const born = ymd(new Date(Date.now() - 50 * DAY));
  env.DB.raw.prepare("INSERT INTO litters (id, site_id, slug, name, stage, born_on, created_at, updated_at) VALUES ('lit1', ?, 'winter', 'Winter litter', 'current', ?, ?, ?)").run(site.id, born, t, t);
  for (const [id, name] of [['pup1', 'Opal'], ['pup2', 'Ruby']]) {
    env.DB.raw.prepare("INSERT INTO puppies (id, site_id, litter_id, slug, name, sex, created_at, updated_at) VALUES (?, ?, 'lit1', ?, ?, 'female', ?, ?)").run(id, site.id, id, name, t, t);
  }
  env.DB.raw.prepare("INSERT INTO products (id, site_id, name, link_url, code, sort) VALUES ('ins', ?, 'Puppy insurance', 'https://insure.example/akb', 'AKB30', 1)").run(site.id);
  env.DB.raw.prepare("INSERT INTO products (id, site_id, name, link_url, sort) VALUES ('food', ?, 'Puppy food program', 'https://food.example/akb', 2)").run(site.id);
  env.DB.raw.prepare("INSERT INTO products (id, site_id, name, link_url, sort) VALUES ('crate', ?, 'Crate and bedding', 'https://crate.example/x', 3)").run(site.id);
  const her = (path, body) => call(env, M, `/s/akbostons${path}`, body ? { method: 'POST', body: form(body), headers: { cookie: breeder, origin: `https://${M}` } } : { headers: { cookie: breeder } });
  const fam = (cookie) => (path, body) => call(env, H, path, body ? { method: 'POST', body: form(body), headers: { cookie, origin: `https://${H}` } } : { headers: { cookie } });
  // Programs shown, insurance with its own code per family; the food.
  const saved = await her('/portal/settings', {
    vet_rule: 'hours72', time_zone: 'America/New_York', help_weeks: '8',
    'type.ins': 'insurance', 'action.ins': 'Activate the free trial within 5 days of pickup', 'own.ins': '1',
    'type.food': 'food', 'type.crate': 'product',
    food_name: 'Small-breed puppy formula, chicken and rice', food_bag: '4 lb bag', food_how: '⅓ cup, three times a day',
  });
  assert.equal(saved.status, 303, await saved.text());
  return { env, site, her, fam, born };
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
  return res.headers.get('set-cookie').split(';')[0];
}

const item = (env, tbl, title) => env.DB.raw.prepare(`SELECT * FROM ${tbl} WHERE title = ?`).get(title);

test('a task is due from birth or pickup; a birth-dated one by go-home is hers; the vet visit uses the deadline', () => {
  const p = { picked_up_at: null, pickup_booked_at: null, go_home_on: '2026-12-20', pickup_state: 'planned', vet_deadline_at: null };
  const pup = { born_on: '2026-10-20' };
  const bases = basesFor(p, pup, 'America/New_York');
  assert.deepEqual(bases, { birth: '2026-10-20', pickup: '2026-12-20', deadline: null });
  assert.deepEqual(taskDue({ count_from: 'pickup', offset_days: 5 }, bases), { due: '2026-12-25', hers: false });
  assert.deepEqual(taskDue({ count_from: 'pickup', offset_days: -5 }, bases), { due: '2026-12-15', hers: false });
  assert.deepEqual(taskDue({ count_from: 'birth', offset_days: 56 }, bases), { due: '2026-12-15', hers: true });
  assert.deepEqual(taskDue({ count_from: 'birth', offset_days: 84 }, bases), { due: '2027-01-12', hers: false });
  // A booked pickup late in the evening counts from its local day, not UTC's.
  const booked = basesFor({ ...p, pickup_booked_at: '2026-12-21T03:30:00.000Z' }, pup, 'America/New_York');
  assert.equal(booked.pickup, '2026-12-20');
  // Picked up: the real day wins, and the vet visit is dated by the deadline.
  const home = { ...p, picked_up_at: '2026-12-22T16:00:00.000Z', pickup_state: 'confirmed', vet_deadline_at: '2026-12-25T16:00:00.000Z' };
  const b2 = basesFor(home, pup, 'America/New_York');
  assert.equal(b2.pickup, '2026-12-22');
  assert.equal(taskDue({ count_from: 'pickup', offset_days: 3, auto: 'vet_visit' }, b2).due, '2026-12-25');
  // A moved day is the family's own.
  assert.equal(taskDue({ count_from: 'pickup', offset_days: 5 }, b2, '2027-01-02').due, '2027-01-02');
  // No birthday known: undated, never hers.
  assert.deepEqual(taskDue({ count_from: 'birth', offset_days: 70 }, basesFor(p, null, 'America/New_York')), { due: null, hers: false });
});

test('task states: hers are done once due, theirs read Overdue for two weeks and then Past', () => {
  const p = { picked_up_at: '2026-12-20T16:00:00.000Z', pickup_state: 'confirmed', vet_deadline_at: '2026-12-23T16:00:00.000Z', vet_booked_at: null, proof_uploaded_at: null };
  const bases = { birth: '2026-10-20', pickup: '2026-12-20', deadline: '2026-12-23' };
  const hers = { count_from: 'birth', offset_days: 56 };
  assert.equal(taskState(hers, p, bases, null, '2026-12-14').done, false);
  assert.deepEqual(taskState(hers, p, bases, null, '2026-12-16'), { due: '2026-12-15', hers: true, done: true, by: 'breeder', overdue: false, past: false });
  const ins = { count_from: 'pickup', offset_days: 5 };
  assert.equal(taskState(ins, p, bases, null, '2026-12-25').overdue, false);
  assert.equal(taskState(ins, p, bases, null, '2026-12-26').overdue, true);
  assert.equal(OVERDUE_DAYS, 14);
  assert.equal(taskState(ins, p, bases, null, '2027-01-08').overdue, true);
  assert.deepEqual([taskState(ins, p, bases, null, '2027-01-10').overdue, taskState(ins, p, bases, null, '2027-01-10').past], [false, true]);
  assert.equal(taskState(ins, p, bases, { done_at: '2026-12-24T10:00:00Z', done_by: 'family' }, '2026-12-30').done, true);
  // Steps the portal sees happen tick themselves.
  assert.equal(taskState({ count_from: 'pickup', offset_days: -5, auto: 'vet_booking' }, { ...p, vet_booked_at: 'x' }, bases, null, '2026-12-30').done, true);
  assert.equal(taskState({ count_from: 'pickup', offset_days: 0, auto: 'pickup' }, p, bases, null, '2026-12-30').done, true);
  assert.equal(taskState({ count_from: 'pickup', offset_days: 3, auto: 'vet_visit' }, p, bases, null, '2026-12-22').done, false);
});

test('she starts from the suggested lists, linked to her programs, and edits, moves and removes steps', async () => {
  const { env, her } = await setup();
  assert.match(await (await her('/portal/checklist')).text(), /Start with the suggested list/);
  assert.equal((await her('/portal/checklist/suggested', {})).status, 303);
  assert.equal((await her('/portal/timeline/suggested', {})).status, 303);
  assert.equal(env.DB.raw.prepare('SELECT COUNT(*) AS n FROM portal_checklist_items WHERE placement_id IS NULL').get().n, 9);
  assert.equal(item(env, 'portal_checklist_items', 'Food: {food}').product_id, 'food');
  assert.equal(item(env, 'portal_checklist_items', 'Crate with a divider, sized for an adult').product_id, 'crate');
  assert.equal(item(env, 'portal_timeline_tasks', 'Activate {name}\'s insurance trial').product_id, 'ins');
  // No registration program shown: that task has no link and no button words.
  const reg = item(env, 'portal_timeline_tasks', 'Register {name}');
  assert.equal(reg.product_id, null);
  assert.equal(reg.button_label, null);
  // A second "suggested" doesn't double the list.
  assert.equal((await her('/portal/checklist/suggested', {})).status, 400);

  const add = await her('/portal/timeline/new', { title: 'Puppy class', body: 'Sign up by 12 weeks.', days: '3', when: 'before', count_from: 'birth' });
  assert.equal(add.status, 303);
  assert.equal(item(env, 'portal_timeline_tasks', 'Puppy class').offset_days, -3);
  const bad = await her('/portal/timeline/new', { title: 'X', days: 'soon', when: 'after', count_from: 'pickup' });
  assert.equal(bad.status, 400);
  assert.match(await bad.text(), /Days is a whole number/);

  const first = env.DB.raw.prepare('SELECT id, title FROM portal_checklist_items ORDER BY sort LIMIT 2').all();
  await her(`/portal/checklist/${first[1].id}/up`, {});
  assert.equal(env.DB.raw.prepare('SELECT id FROM portal_checklist_items ORDER BY sort LIMIT 1').get().id, first[1].id);
  await her(`/portal/checklist/${first[0].id}`, { title: 'A 24-inch crate', product_id: 'crate' });
  assert.equal(env.DB.raw.prepare('SELECT title FROM portal_checklist_items WHERE id = ?').get(first[0].id).title, 'A 24-inch crate');
  await her(`/portal/checklist/${first[0].id}/remove`, {});
  assert.equal(env.DB.raw.prepare('SELECT COUNT(*) AS n FROM portal_checklist_items').get().n, 8);
});

test('the family ticks the checklist from Home; she sees it, and their ticks are theirs alone', async () => {
  const { env, her, fam } = await setup();
  await her('/portal/checklist/suggested', {});
  await her('/portal/timeline/suggested', {});
  const reed = await addFamily(her, { name: 'The Reed family', emails: 'sam@example.com', puppy_id: 'pup1', go_home_on: ymd(new Date(Date.now() + 6 * DAY)) });
  await addFamily(her, { name: 'The Diaz family', emails: 'lee@example.com', puppy_id: 'pup2', go_home_on: ymd(new Date(Date.now() + 30 * DAY)) });
  const r = fam(await familySignIn(env, 'sam@example.com'));
  const d = fam(await familySignIn(env, 'lee@example.com'));

  let home = await (await r('/family')).text();
  assert.match(home, /Go-home checklist/);
  assert.match(home, /0 of 9 ready/);
  assert.match(home, /Food: Small-breed puppy formula, chicken and rice/);
  assert.match(home, /\/family\/go\/food\?from=checklist/);
  // The food band: the exact food, the bag, how much, and the program's button.
  assert.match(home, /What Opal's eating now/);
  assert.match(home, /4 lb bag/);
  assert.match(home, /Order Opal's food/);
  assert.match(home, /\/family\/go\/food\?from=food/);
  // Go-home a month away: no checklist yet.
  assert.doesNotMatch(await (await d('/family')).text(), /Go-home checklist/);

  const crate = item(env, 'portal_checklist_items', 'Crate with a divider, sized for an adult');
  const tick = await r('/family/step', { kind: 'checklist', id: crate.id, done: '1', back: 'home' });
  assert.equal(tick.status, 303);
  assert.equal(tick.headers.get('location'), '/family#checklist');
  home = await (await r('/family')).text();
  assert.match(home, /1 of 9 ready/);
  assert.match(home, /aria-pressed="true"/);
  // The vet item ticks itself, from "I've booked it", and can't be ticked by hand.
  const vet = item(env, 'portal_checklist_items', 'The vet visit booked for the first days home');
  assert.equal((await r('/family/step', { kind: 'checklist', id: vet.id, done: '1', back: 'home' })).status, 400);
  await r('/family/vet/booked', { day: ymd(new Date(Date.now() + 7 * DAY)), time: '10:00' });
  assert.match(await (await r('/family')).text(), /2 of 9 ready/);
  // The Diaz family's list is untouched; they can't tick for the Reeds.
  assert.equal(env.DB.raw.prepare('SELECT COUNT(*) AS n FROM portal_placement_progress WHERE done_at IS NOT NULL').get().n, 1);

  const screen = await (await her(`/portal/f/${reed}`)).text();
  assert.match(screen, /Go-home checklist: 2 of 9 ready/);
  assert.match(screen, /Done by them/);
  assert.match(screen, /Checklist ticked: Crate with a divider/);
  // Untick: back to 1, kept in history.
  await r('/family/step', { kind: 'checklist', id: crate.id, done: '0', back: 'home' });
  assert.match(await (await r('/family')).text(), /1 of 9 ready/);
  assert.match(await (await her(`/portal/f/${reed}`)).text(), /Checklist unticked: Crate with a divider/);
});

test('the timeline: dated steps, her own before go-home, Mark done; a done linked task marks the program done', async () => {
  const { env, her, fam, born } = await setup();
  await her('/portal/timeline/suggested', {});
  // Picked up 10 days ago.
  const reed = await addFamily(her, { name: 'The Reed family', emails: 'sam@example.com', puppy_id: 'pup1' });
  const pid = env.DB.raw.prepare('SELECT id FROM portal_placements WHERE family_id = ?').get(reed).id;
  const pickedUp = new Date(Date.now() - 10 * DAY);
  await her(`/portal/f/${reed}/picked-up`, { day: ymd(pickedUp), time: '11:00' });
  const r = fam(await familySignIn(env, 'sam@example.com'));

  const tl = await (await r('/family/timeline')).text();
  assert.match(tl, /Activate Opal&#39;s insurance trial/);
  assert.match(tl, /The first week/);
  assert.match(tl, /The first two months/);
  assert.match(tl, /Overdue/); // insurance: 5 days after pickup, not done
  assert.match(tl, /Activate the trial/);
  assert.match(tl, /\/family\/go\/ins\?from=timeline/);
  assert.match(tl, /Dated from Opal's birthday \(.+\) and pickup \(/);
  assert.ok(born);

  // A click: Not started becomes Clicked.
  const go = await r('/family/go/ins?from=timeline');
  assert.equal(go.status, 302);
  assert.equal(env.DB.raw.prepare('SELECT status FROM portal_placements_programs WHERE placement_id = ? AND product_id = ?').get(pid, 'ins').status, 'clicked');
  assert.equal(env.DB.raw.prepare("SELECT place FROM portal_clicks WHERE product_id = 'ins'").get().place, 'timeline');

  // Mark done: the task, and the program it links to.
  const ins = item(env, 'portal_timeline_tasks', 'Activate {name}\'s insurance trial');
  const done = await r('/family/step', { kind: 'task', id: ins.id, done: '1', back: 'timeline' });
  assert.equal(done.headers.get('location'), `/family/timeline#t-${ins.id}`);
  assert.equal(env.DB.raw.prepare('SELECT status FROM portal_placements_programs WHERE placement_id = ? AND product_id = ?').get(pid, 'ins').status, 'done');
  // Auto tasks can't be marked by hand.
  const pickupTask = item(env, 'portal_timeline_tasks', 'Pickup day');
  assert.equal((await r('/family/step', { kind: 'task', id: pickupTask.id, done: '1', back: 'timeline' })).status, 400);

  // Home after the vet window: what's next, and the next task in the action bar.
  const home = await (await r('/family')).text();
  assert.match(home, /What's next/);
  assert.match(home, /class="actionbar"/);
  const screen = await (await her(`/portal/f/${reed}`)).text();
  assert.match(screen, /Task done: Activate Opal&#39;s insurance trial/);
  assert.match(screen, /id="programs"/);
});

test('for one family she hides a step, adds one, moves a day; their code shows to them alone', async () => {
  const { env, her, fam } = await setup();
  await her('/portal/checklist/suggested', {});
  await her('/portal/timeline/suggested', {});
  const reed = await addFamily(her, { name: 'The Reed family', emails: 'sam@example.com', puppy_id: 'pup1', go_home_on: ymd(new Date(Date.now() + 3 * DAY)) });
  await addFamily(her, { name: 'The Diaz family', emails: 'lee@example.com', puppy_id: 'pup2', go_home_on: ymd(new Date(Date.now() + 3 * DAY)) });
  const r = fam(await familySignIn(env, 'sam@example.com'));
  const d = fam(await familySignIn(env, 'lee@example.com'));

  const pads = item(env, 'portal_checklist_items', 'Puppy pads and an enzyme cleaner');
  assert.equal((await her(`/portal/f/${reed}/step/checklist/${pads.id}/hide`, {})).status, 303);
  assert.doesNotMatch(await (await r('/family')).text(), /Puppy pads/);
  assert.match(await (await d('/family')).text(), /Puppy pads/);
  assert.match(await (await r('/family')).text(), /0 of 8 ready/);
  // Hidden from them: they can't tick it either.
  assert.equal((await r('/family/step', { kind: 'checklist', id: pads.id, done: '1', back: 'home' })).status, 400);

  await her(`/portal/f/${reed}/steps/new/checklist`, { title: 'Their second crate for the car' });
  assert.match(await (await r('/family')).text(), /Their second crate for the car/);
  assert.doesNotMatch(await (await d('/family')).text(), /Their second crate/);

  const reg = item(env, 'portal_timeline_tasks', 'Register {name}');
  await her(`/portal/f/${reed}/step/task/${reg.id}/day`, { day: '2027-03-01' });
  const tl = await (await r('/family/timeline')).text();
  assert.match(tl, /Mar<b>1<\/b><\/span><div><div class="between"><h3>Register Opal<\/h3>/);
  assert.doesNotMatch(await (await d('/family/timeline')).text(), /Mar<b>1<\/b><\/span><div><div class="between"><h3>Register/);
  assert.match(await (await her(`/portal/f/${reed}`)).text(), /moved for them/);

  // Their own insurance code, typed by her.
  let home = await (await r('/family')).text();
  assert.match(home, /Your own code will be here once AK Boston Terriers adds it/);
  assert.doesNotMatch(home, /AKB30/);
  await her(`/portal/f/${reed}/program/ins`, { status: 'not_started', code: 'TRIAL-7781' });
  home = await (await r('/family')).text();
  assert.match(home, /Your code <strong>TRIAL-7781<\/strong>/);
  assert.doesNotMatch(await (await d('/family')).text(), /TRIAL-7781/);
  // "I've done this" on a program with a step.
  assert.equal((await r('/family/program', { product: 'ins', back: 'home' })).status, 303);
  assert.match(await (await r('/family')).text(), /<span class="st ok">Done<\/span>/);
  // A program she doesn't show can't be marked.
  assert.equal((await r('/family/program', { product: 'nope', back: 'home' })).status, 400);
});

test('a family deleted or a site closed takes their steps, ticks and statuses with it', async () => {
  const { env, site, her, fam } = await setup();
  await her('/portal/checklist/suggested', {});
  const reed = await addFamily(her, { name: 'The Reed family', emails: 'sam@example.com', puppy_id: 'pup1', go_home_on: ymd(new Date(Date.now() + 3 * DAY)) });
  const r = fam(await familySignIn(env, 'sam@example.com'));
  const crate = item(env, 'portal_checklist_items', 'Crate with a divider, sized for an adult');
  await r('/family/step', { kind: 'checklist', id: crate.id, done: '1', back: 'home' });
  await r('/family/go/food?from=food');
  await her(`/portal/f/${reed}/steps/new/checklist`, { title: 'Theirs alone' });
  const count = (tbl) => env.DB.raw.prepare(`SELECT COUNT(*) AS n FROM ${tbl}`).get().n;
  assert.equal(count('portal_placement_progress'), 1);
  assert.equal(count('portal_placements_programs'), 1);
  await her(`/portal/f/${reed}/delete`, { confirm: 'delete' });
  assert.equal(count('portal_placement_progress'), 1); // undoable for 30 days
  await runPortalDaily(env, new Date(Date.now() + 31 * DAY));
  assert.equal(count('portal_placement_progress'), 0);
  assert.equal(count('portal_placements_programs'), 0);
  assert.equal(count('portal_checklist_items'), 9); // her template stays
  await closeSite(env, site.id, 'akbostons');
  assert.equal(count('portal_checklist_items'), 0);
});

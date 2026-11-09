// The go-home checklist, the first-weeks timeline and each family's program status
// (docs/plans/family-portal.md sections 4, 7.2 and 9; build chunk 2).
//
// Her templates hold the steps every family gets; she can add a step for one
// family, hide one from a family, or move a task's day for them. Ticks are the
// family's (or hers, on their screen), and a few steps tick themselves from what the
// portal already knows: "I've booked it", the pickup, the vet record.
//
// When a task is due is worked out here, from the puppy's birth or the pickup, as
// pure functions (tests/portal-steps.test.js).
import { PortalError } from './store.js';
import { localParts, addDays, clockRunning } from './vet.js';

const now = () => new Date().toISOString();
const clean = (v, max = 200) => {
  const s = String(v ?? '').replace(/\s+/g, ' ').trim();
  return s ? s.slice(0, max) : null;
};
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const KINDS = { checklist: 'portal_checklist_items', task: 'portal_timeline_tasks' };
const table = (kind) => {
  if (!KINDS[kind]) throw new PortalError('Unknown list.');
  return KINDS[kind];
};

// Steps the portal ticks itself, and what she sees them called.
export const CHECK_AUTO = { vet_booked: 'Ticked when they tap "I\'ve booked it"' };
export const TASK_AUTO = {
  vet_booking: 'Done when they tap "I\'ve booked it"',
  pickup: 'Done when you mark the pickup',
  vet_visit: 'Dated by the vet deadline; done when they upload the record',
};

// ---------- suggested lists ----------

// Where she starts from (plan 7.2 and the prototype): edited, reordered or removed
// freely. A step's program is the first shown program of that type, if there is one.
const SUGGESTED_CHECKLIST = [
  { title: 'Crate with a divider, sized for an adult', type: 'product' },
  { title: 'Washable crate bed and two old towels' },
  { title: 'Food: {food}', type: 'food' },
  { title: 'Food and water bowls' },
  { title: 'Soft collar and a 6 ft leash' },
  { title: 'Puppy pads and an enzyme cleaner' },
  { title: 'Two chew toys sized for a puppy' },
  { title: 'The vet visit booked for the first days home', auto: 'vet_booked' },
  { title: 'A carrier or car crate for the ride home' },
];
const SUGGESTED_TIMELINE = [
  { title: 'Book the vet visit', body: 'Vets fill up fast. Book it before {name} comes home.', count_from: 'pickup', offset_days: -5, auto: 'vet_booking' },
  { title: 'Pickup day', body: 'Bring the carrier and a towel.', count_from: 'pickup', offset_days: 0, auto: 'pickup' },
  { title: 'The vet visit, and upload the record', body: 'Your contract asks for it. Upload the vet\'s record here afterwards.', count_from: 'pickup', offset_days: 3, auto: 'vet_visit' },
  { title: 'Activate {name}\'s insurance trial', body: 'The free trial has to be activated within a few days of pickup.', count_from: 'pickup', offset_days: 5, type: 'insurance', button_label: 'Activate the trial' },
  { title: 'Keep the same food for two weeks', body: 'Change food slowly, if at all, over 7 to 10 days.', count_from: 'pickup', offset_days: 14, type: 'food', button_label: 'Order {name}\'s food' },
  { title: 'Register {name}', body: 'Your registration paper is in the go-home folder.', count_from: 'pickup', offset_days: 30, type: 'registration', button_label: 'Register' },
  { title: 'Deworming at 10 weeks', body: 'The dose is in your go-home folder.', count_from: 'birth', offset_days: 70 },
  { title: '12-week vaccines', body: 'Your vet sets the schedule from here.', count_from: 'birth', offset_days: 84 },
  { title: '16-week vaccines and rabies', body: 'Ask your vet about the rabies date for your county.', count_from: 'birth', offset_days: 112 },
  { title: 'Six months: spay or neuter and adult teeth', body: 'A good time to ask your vet about timing.', count_from: 'birth', offset_days: 182 },
];

export async function addSuggested(env, siteId, kind) {
  const tbl = table(kind);
  const have = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${tbl} WHERE site_id = ? AND placement_id IS NULL`).bind(siteId).first('n');
  if (have) throw new PortalError('Your list already has steps. Add more one at a time.');
  const { results: shown } = await env.DB.prepare('SELECT id, portal_type FROM products WHERE site_id = ? AND portal_show = 1 ORDER BY sort, name').bind(siteId).all();
  const productFor = (type) => (type ? shown.find((x) => x.portal_type === type)?.id ?? null : null);
  const t = now();
  const list = kind === 'checklist' ? SUGGESTED_CHECKLIST : SUGGESTED_TIMELINE;
  await env.DB.batch(list.map((x, i) => (kind === 'checklist'
    ? env.DB.prepare('INSERT INTO portal_checklist_items (id, site_id, title, product_id, auto, sort, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), siteId, x.title, productFor(x.type), x.auto ?? null, i, t, t)
    : env.DB.prepare('INSERT INTO portal_timeline_tasks (id, site_id, title, body, count_from, offset_days, product_id, button_label, auto, sort, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), siteId, x.title, x.body ?? null, x.count_from, x.offset_days, productFor(x.type), productFor(x.type) ? x.button_label ?? null : null, x.auto ?? null, i, t, t))));
}

// ---------- her lists ----------

// Her template (placementId null), or the steps she added for one family.
export async function listItems(env, siteId, kind, placementId = null) {
  const tbl = table(kind);
  return (await env.DB.prepare(`SELECT * FROM ${tbl} WHERE site_id = ? AND placement_id IS ? ORDER BY sort, created_at`).bind(siteId, placementId).all()).results;
}

async function shownProduct(env, siteId, id) {
  const pid = clean(id, 64);
  if (!pid) return null;
  const x = await env.DB.prepare('SELECT id FROM products WHERE id = ? AND site_id = ?').bind(pid, siteId).first();
  if (!x) throw new PortalError('That program isn\'t on your site.');
  return pid;
}

async function itemValues(env, siteId, kind, input) {
  const title = clean(input.title, 160);
  if (!title) throw new PortalError(kind === 'checklist' ? 'Say what to have ready, for example "A crate with a divider".' : 'Give the task a title, for example "Register {name}".');
  const product_id = await shownProduct(env, siteId, input.product_id);
  if (kind === 'checklist') {
    const auto = clean(input.auto, 20);
    return { title, product_id, auto: auto && CHECK_AUTO[auto] ? auto : null };
  }
  const from = String(input.count_from ?? '');
  if (from !== 'birth' && from !== 'pickup') throw new PortalError('Choose whether the task counts from birth or from pickup.');
  const days = String(input.offset_days ?? '').trim();
  if (!/^-?\d{1,4}$/.test(days) || Math.abs(Number(days)) > 3650) throw new PortalError('Days is a whole number, like 5, or -3 for before.');
  const auto = clean(input.auto, 20);
  return {
    title, body: clean(input.body, 600), count_from: from, offset_days: Number(days), product_id,
    button_label: product_id ? clean(input.button_label, 60) : null, auto: auto && TASK_AUTO[auto] ? auto : null,
  };
}

export async function saveItem(env, siteId, kind, id, input, placementId = null) {
  const tbl = table(kind);
  const v = await itemValues(env, siteId, kind, input);
  const t = now();
  if (id) {
    const row = await env.DB.prepare(`SELECT id FROM ${tbl} WHERE id = ? AND site_id = ? AND placement_id IS ?`).bind(id, siteId, placementId).first();
    if (!row) throw new PortalError('That step has gone.');
    await env.DB.prepare(`UPDATE ${tbl} SET ${Object.keys(v).map((k) => `${k} = ?`).join(', ')}, updated_at = ? WHERE id = ?`).bind(...Object.values(v), t, id).run();
    return id;
  }
  const sort = (await env.DB.prepare(`SELECT COALESCE(MAX(sort), -1) + 1 AS n FROM ${tbl} WHERE site_id = ? AND placement_id IS ?`).bind(siteId, placementId).first('n')) ?? 0;
  const newId = crypto.randomUUID();
  const cols = { id: newId, site_id: siteId, placement_id: placementId, ...v, sort, created_at: t, updated_at: t };
  await env.DB.prepare(`INSERT INTO ${tbl} (${Object.keys(cols).join(', ')}) VALUES (${Object.keys(cols).map(() => '?').join(', ')})`).bind(...Object.values(cols)).run();
  return newId;
}

// Removing a template step takes it off every family's list, ticks and all.
export async function removeItem(env, siteId, kind, id, placementId = null) {
  const tbl = table(kind);
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM portal_placement_progress WHERE site_id = ? AND item_type = ? AND item_id = ? AND item_id IN (SELECT id FROM ${tbl} WHERE site_id = ? AND placement_id IS ?)`).bind(siteId, kind, id, siteId, placementId),
    env.DB.prepare(`DELETE FROM ${tbl} WHERE id = ? AND site_id = ? AND placement_id IS ?`).bind(id, siteId, placementId),
  ]);
}

export async function moveItem(env, siteId, kind, id, dir) {
  const list = await listItems(env, siteId, kind);
  const i = list.findIndex((x) => x.id === id);
  const j = dir === 'up' ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await env.DB.batch(list.map((x, n) => env.DB.prepare(`UPDATE ${table(kind)} SET sort = ? WHERE id = ? AND site_id = ?`).bind(n, x.id, siteId)));
}

// ---------- when a task is due, and whose it is ----------

const ymdOf = (at, tz) => (at ? localParts(at, tz).ymd : null);

// The days a placement's tasks count from: birth, pickup (the real one, else the
// booked one, else the planned go-home day), and the vet deadline's day.
export function basesFor(p, pup, tz) {
  const pickup = ymdOf(p.picked_up_at, tz) ?? ymdOf(p.pickup_booked_at, tz) ?? p.go_home_on ?? null;
  return { birth: pup?.born_on ?? null, pickup, deadline: clockRunning(p) ? ymdOf(p.vet_deadline_at, tz) : null };
}

// A task's due day (YYYY-MM-DD, or null while its base isn't known), and whether
// it's hers: counted from birth and due by go-home, she does it before they leave.
export function taskDue(task, bases, dueOn = null) {
  if (dueOn) return { due: dueOn, hers: task.count_from === 'birth' && Boolean(bases.pickup) && dueOn <= bases.pickup };
  if (task.auto === 'vet_visit' && bases.deadline) return { due: bases.deadline, hers: false };
  const base = bases[task.count_from];
  const due = base ? addDays(base, task.offset_days) : null;
  return { due, hers: task.count_from === 'birth' && Boolean(due && bases.pickup) && due <= bases.pickup };
}

// Within this many days after a task's day, an unticked one reads Overdue (red);
// after that, Past, so an old list isn't a wall of red.
export const OVERDUE_DAYS = 14;

// A task's state for the family: done (and by whom), hers, overdue, past, next.
// p: the placement; today: her local YYYY-MM-DD.
export function taskState(task, p, bases, prog, today) {
  const { due, hers } = taskDue(task, bases, prog?.due_on ?? null);
  let done = Boolean(prog?.done_at);
  let by = prog?.done_by ?? null;
  if (task.auto === 'vet_booking') { done = Boolean(p.vet_booked_at); by = 'family'; }
  if (task.auto === 'pickup') { done = clockRunning(p); by = 'breeder'; }
  if (task.auto === 'vet_visit') { done = Boolean(p.proof_uploaded_at); by = 'family'; }
  if (hers && !done && due && due <= today) { done = true; by = 'breeder'; }
  const late = !done && !hers && due && due < today;
  // Never booked, but the puppy is home: the vet visit task carries it from here.
  const overtaken = task.auto === 'vet_booking' && !done && clockRunning(p);
  return {
    due, hers, done, by,
    overdue: Boolean(late && !overtaken && addDays(due, OVERDUE_DAYS) >= today),
    past: Boolean(overtaken || (late && addDays(due, OVERDUE_DAYS) < today)),
  };
}

// ---------- one family's steps ----------

const fill = (s, { name, food }) => String(s ?? '').replace(/\{name\}/g, name).replace(/\{food\}/g, food || 'the food we feed');

// Every checklist item and timeline task for a placement, with its state, minus
// the ones she hid for them (unless `all`, for her screen). Products are the
// shown programs' links, so a hidden or deleted program drops its link.
export async function stepsFor(env, siteId, p, pup, s, { now: at = new Date(), all = false, name, food } = {}) {
  const tz = s.time_zone;
  const today = localParts(at, tz).ymd;
  const bases = basesFor(p, pup, tz);
  const words = { name: name ?? p.call_name ?? p.puppy_name, food: food ?? s.food_name };
  const progress = new Map((await env.DB.prepare('SELECT * FROM portal_placement_progress WHERE placement_id = ? AND site_id = ?').bind(p.id, siteId).all())
    .results.map((r) => [`${r.item_type}:${r.item_id}`, r]));
  const link = (x) => (x.link_url && x.portal_show ? { id: x.product_id, url: x.link_url, label: x.link_label } : null);
  const q = (tbl) => env.DB.prepare(`SELECT i.*, pr.link_url, pr.link_label, pr.portal_show FROM ${tbl} i LEFT JOIN products pr ON pr.id = i.product_id AND pr.site_id = i.site_id
    WHERE i.site_id = ? AND (i.placement_id IS NULL OR i.placement_id = ?) ORDER BY i.placement_id IS NOT NULL, i.sort, i.created_at`).bind(siteId, p.id).all();

  const checklist = (await q('portal_checklist_items')).results.map((x) => {
    const prog = progress.get(`checklist:${x.id}`);
    const done = x.auto === 'vet_booked' ? Boolean(p.vet_booked_at) : Boolean(prog?.done_at);
    return { id: x.id, kind: 'checklist', title: fill(x.title, words), raw: x, link: link(x), auto: x.auto, mine: Boolean(x.placement_id), hidden: Boolean(prog?.hidden), done, by: x.auto ? 'family' : prog?.done_by ?? null, done_at: prog?.done_at ?? null };
  }).filter((x) => all || !x.hidden);

  const tasks = (await q('portal_timeline_tasks')).results.map((x) => {
    const prog = progress.get(`task:${x.id}`);
    const st = taskState(x, p, bases, prog, today);
    return { id: x.id, kind: 'task', title: fill(x.title, words), body: x.body ? fill(x.body, words) : null, button: x.button_label ? fill(x.button_label, words) : null, raw: x, link: link(x), auto: x.auto, mine: Boolean(x.placement_id), hidden: Boolean(prog?.hidden), moved: prog?.due_on ?? null, done_at: prog?.done_at ?? null, ...st };
  }).filter((x) => all || !x.hidden)
    .sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999') || a.raw.sort - b.raw.sort);

  // "Next": the family's earliest open task.
  const next = tasks.find((t) => !t.done && !t.hers && !t.hidden && !t.past);
  if (next) next.next = true;
  return { checklist, tasks, today, bases };
}

// The family's open tasks, soonest first (overdue ones included, long-past ones not).
export const openTasks = (tasks, n = 3) => tasks.filter((t) => !t.done && !t.hers && !t.hidden && !t.past).slice(0, n);

// ---------- ticks, hiding, moved days ----------

// The step, with its title as this family reads it (for history).
async function itemFor(env, siteId, p, kind, itemId) {
  const row = await env.DB.prepare(`SELECT * FROM ${table(kind)} WHERE id = ? AND site_id = ? AND (placement_id IS NULL OR placement_id = ?)`).bind(itemId, siteId, p.id).first();
  if (!row) throw new PortalError('That step isn\'t on this list.');
  const food = row.title.includes('{food}') ? (await env.DB.prepare('SELECT food_name FROM portal_settings WHERE site_id = ?').bind(siteId).first('food_name')) : null;
  return { ...row, title: fill(row.title, { name: p.call_name || p.puppy_name, food }) };
}

async function progressRow(env, p, kind, itemId) {
  return env.DB.prepare('SELECT * FROM portal_placement_progress WHERE placement_id = ? AND item_type = ? AND item_id = ?').bind(p.id, kind, itemId).first();
}

async function upsertProgress(env, siteId, p, kind, itemId, values) {
  const cur = await progressRow(env, p, kind, itemId);
  const next = { done_at: null, done_by: null, hidden: 0, due_on: null, ...(cur ?? {}), ...values };
  return env.DB.prepare(`INSERT INTO portal_placement_progress (site_id, placement_id, item_type, item_id, done_at, done_by, hidden, due_on, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (placement_id, item_type, item_id) DO UPDATE SET done_at = excluded.done_at, done_by = excluded.done_by, hidden = excluded.hidden, due_on = excluded.due_on, updated_at = excluded.updated_at`)
    .bind(siteId, p.id, kind, itemId, next.done_at, next.done_by, next.hidden ? 1 : 0, next.due_on, now());
}

const history = (env, siteId, p, field, from, to, by) => env.DB.prepare(`INSERT INTO portal_history (site_id, tbl, row_id, field, old_value, new_value, changed_at, changed_by)
  VALUES (?, 'portal_placements', ?, ?, ?, ?, ?, ?)`).bind(siteId, p.id, field, from, to, now(), by);

// Tick or untick a step. Steps the portal ticks itself can't be ticked by hand.
// A done task linked to a program marks the family's program status done too.
export async function setDone(env, siteId, p, kind, itemId, done, by) {
  const item = await itemFor(env, siteId, p, kind, itemId);
  if (item.auto) throw new PortalError('This one ticks itself when it happens.');
  const cur = await progressRow(env, p, kind, itemId);
  if (by === 'family' && cur?.hidden) throw new PortalError('That step isn\'t on your list.');
  if (Boolean(cur?.done_at) === Boolean(done)) return;
  const stmts = [
    await upsertProgress(env, siteId, p, kind, itemId, done ? { done_at: now(), done_by: by } : { done_at: null, done_by: null }),
    history(env, siteId, p, kind === 'checklist' ? 'checklist' : 'task', done ? null : item.title, done ? item.title : null, by),
  ];
  if (done && kind === 'task' && item.product_id) stmts.push(await programStatement(env, siteId, p, item.product_id, { status: 'done' }, by));
  await env.DB.batch(stmts);
}

// Hers alone: hide a template step from one family, or show it again.
export async function setHidden(env, siteId, p, kind, itemId, hidden) {
  const item = await itemFor(env, siteId, p, kind, itemId);
  await env.DB.batch([
    await upsertProgress(env, siteId, p, kind, itemId, { hidden: hidden ? 1 : 0 }),
    history(env, siteId, p, hidden ? 'step_hidden' : 'step_shown', null, item.title, 'breeder'),
  ]);
}

// Hers alone: move one family's task to another day (blank: back to its own).
export async function setDueOn(env, siteId, p, itemId, day) {
  const item = await itemFor(env, siteId, p, 'task', itemId);
  const d = clean(day, 10);
  if (d && !DATE_RE.test(d)) throw new PortalError('The day is a date.');
  const cur = await progressRow(env, p, 'task', itemId);
  if ((cur?.due_on ?? null) === d) return;
  await env.DB.batch([
    await upsertProgress(env, siteId, p, 'task', itemId, { due_on: d }),
    history(env, siteId, p, 'task_day', cur?.due_on ? `${item.title}: ${cur.due_on}` : null, d ? `${item.title}: ${d}` : `${item.title}: its own day`, 'breeder'),
  ]);
}

// ---------- program status ----------

export const PROGRAM_WORDS = { not_started: 'Not started', clicked: 'Clicked', done: 'Done' };
const RANK = { not_started: 0, clicked: 1, done: 2 };

async function programStatement(env, siteId, p, productId, { status, code }, by) {
  const cur = await env.DB.prepare('SELECT status, code FROM portal_placements_programs WHERE placement_id = ? AND product_id = ?').bind(p.id, productId).first();
  const next = { status: status ?? cur?.status ?? 'not_started', code: code === undefined ? cur?.code ?? null : code };
  return env.DB.prepare(`INSERT INTO portal_placements_programs (site_id, placement_id, product_id, status, code, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (placement_id, product_id) DO UPDATE SET status = excluded.status, code = excluded.code, updated_at = excluded.updated_at, updated_by = excluded.updated_by`)
    .bind(siteId, p.id, productId, next.status, next.code, now(), by);
}

// The shown programs for one placement, each with the family's status and code.
export async function programsFor(env, siteId, p) {
  const { results } = await env.DB.prepare(`SELECT pr.id, pr.name, pr.description, pr.link_url, pr.link_label, pr.code, pr.code_note, pr.portal_type, pr.family_action, pr.portal_per_family,
      pp.status, pp.code AS family_code, pp.updated_at AS status_at, pp.updated_by AS status_by
    FROM products pr LEFT JOIN portal_placements_programs pp ON pp.product_id = pr.id AND pp.placement_id = ?
    WHERE pr.site_id = ? AND pr.portal_show = 1 ORDER BY pr.sort, pr.name`).bind(p?.id ?? '', siteId).all();
  return results.map((x) => ({ ...x, status: x.status ?? 'not_started' }));
}

// A click through the portal's link: Not started becomes Clicked, never back.
export async function noteClick(env, siteId, p, productId) {
  if (!p) return;
  const cur = await env.DB.prepare('SELECT status FROM portal_placements_programs WHERE placement_id = ? AND product_id = ?').bind(p.id, productId).first('status');
  if (RANK[cur ?? 'not_started'] >= RANK.clicked) return;
  await (await programStatement(env, siteId, p, productId, { status: 'clicked' }, 'portal')).run();
}

async function shownProgram(env, siteId, productId) {
  const x = await env.DB.prepare('SELECT id, name, portal_per_family FROM products WHERE id = ? AND site_id = ? AND portal_show = 1').bind(productId, siteId).first();
  if (!x) throw new PortalError('That program isn\'t shown to families.');
  return x;
}

export async function setProgramStatus(env, siteId, p, productId, status, by) {
  if (!PROGRAM_WORDS[status]) throw new PortalError('Choose a status.');
  const x = await shownProgram(env, siteId, productId);
  const cur = await env.DB.prepare('SELECT status FROM portal_placements_programs WHERE placement_id = ? AND product_id = ?').bind(p.id, productId).first('status');
  if ((cur ?? 'not_started') === status) return;
  await env.DB.batch([
    await programStatement(env, siteId, p, productId, { status }, by),
    history(env, siteId, p, 'program', cur ? `${x.name}: ${PROGRAM_WORDS[cur]}` : null, `${x.name}: ${PROGRAM_WORDS[status]}`, by),
  ]);
}

// Hers: the family's own code or certificate for a program that gives one each.
export async function setProgramCode(env, siteId, p, productId, code) {
  const x = await shownProgram(env, siteId, productId);
  const c = clean(code, 80);
  const cur = await env.DB.prepare('SELECT code FROM portal_placements_programs WHERE placement_id = ? AND product_id = ?').bind(p.id, productId).first('code');
  if ((cur ?? null) === c) return;
  await env.DB.batch([
    await programStatement(env, siteId, p, productId, { code: c }, 'breeder'),
    history(env, siteId, p, 'program_code', cur ? `${x.name}: ${cur}` : null, c ? `${x.name}: ${c}` : null, 'breeder'),
  ]);
}

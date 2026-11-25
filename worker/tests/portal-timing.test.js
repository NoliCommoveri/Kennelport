// The family portal's timing rules (site-builder step 6, portal/timing.js): the owner's,
// per site, on her Timing screen; today's by default; read live by the portal.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';

const { PORTAL_TIMING, portalTimingFor, withPortalTiming } = await import('../src/portal/timing.js');
const { bookReminderAt, reminderTimes, vetStatus, vetTabShown, dueReminders } = await import('../src/portal/vet.js');
const { taskState } = await import('../src/portal/steps.js');
const { getSettings } = await import('../src/portal/store.js');
const { loadBuild } = await import('../src/content/rules.js');

const M = 'manage.kennelport.com';
const form = (o) => new URLSearchParams(o);
const HOUR = 3600000;
const TZ = 'America/New_York';

test('the rules: today\'s by default; only a changed one is stored; an out-of-bounds one falls back', () => {
  assert.deepEqual({ ...portalTimingFor({}) }, { ...PORTAL_TIMING });
  assert.equal(portalTimingFor({ portal_timing: { book_days_before: 3 } }).book_days_before, 3);
  assert.equal(portalTimingFor({ portal_timing: { book_hour: 40, overdue_days: 'x' } }).book_hour, 9);
  assert.deepEqual(withPortalTiming({ timing: { litter_days: 10 } }, { ...PORTAL_TIMING, morning_hour: 7 }), { timing: { litter_days: 10 }, portal_timing: { morning_hour: 7 } });
  assert.deepEqual(withPortalTiming({ portal_timing: { morning_hour: 7 } }, { ...PORTAL_TIMING }), {});
});

test('the vet reminders, red, the Vet visit tab and Overdue follow a site\'s rules', () => {
  const own = { ...PORTAL_TIMING, book_days_before: 3, book_hour: 10, morning_hour: 7, trouble_hours: 72, vet_tab_hours: 48, overdue_days: 3 };
  // Booking reminder: 3 days before go-home at 10:00, her time (EST, -5).
  assert.equal(bookReminderAt({ go_home_on: '2026-12-20' }, TZ).toISOString(), '2026-12-15T14:00:00.000Z');
  assert.equal(bookReminderAt({ go_home_on: '2026-12-20' }, TZ, own).toISOString(), '2026-12-17T15:00:00.000Z');
  // The deadline morning's reminder at 07:00.
  const deadline = '2026-12-24T04:59:00.000Z';
  assert.equal(new Date(reminderTimes(deadline, TZ, own).find((r) => r.kind === 'vet_morning').at).toISOString(), '2026-12-23T12:00:00.000Z');
  // dueReminders reads the rules from the settings.
  const before = { status: 'open', life_status: 'with_family', go_home_on: '2026-12-20' };
  const at = new Date('2026-12-16T12:00:00Z');
  assert.deepEqual(dueReminders(before, { time_zone: TZ }, at).map((r) => r.kind), ['vet_book']);
  assert.deepEqual(dueReminders(before, { time_zone: TZ, timing: own }, at), []);
  // 60 hours left, not booked: red only under 72.
  const now = new Date('2026-12-20T12:00:00Z');
  const running = { picked_up_at: '2026-12-20T00:00:00Z', pickup_state: 'confirmed', vet_deadline_at: new Date(now.getTime() + 60 * HOUR).toISOString() };
  assert.equal(vetStatus(running, now).trouble, false);
  assert.equal(vetStatus(running, now, own).trouble, true);
  // 30 hours past the deadline: the tab's gone after 24, still there under 48.
  const past = { ...running, vet_deadline_at: new Date(now.getTime() - 30 * HOUR).toISOString() };
  assert.equal(vetTabShown(past, now), false);
  assert.equal(vetTabShown(past, now, own), true);
  // A task 5 days late: Overdue for 14 days by default, Past after 3.
  const task = { count_from: 'pickup', offset_days: 0 };
  const p = { picked_up_at: null };
  assert.equal(taskState(task, p, { pickup: '2026-12-01' }, null, '2026-12-06').overdue, true);
  assert.equal(taskState(task, p, { pickup: '2026-12-01' }, null, '2026-12-06', 3).past, true);
});

test('the owner sets them on her Timing screen; the portal reads them at once, nothing to publish', async () => {
  const env = await makeEnv();
  const site = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  const login = await call(env, M, '/ops/login', { method: 'POST', body: form({ token: 'ops-token' }) });
  const cookies = login.headers.getSetCookie().map((c) => c.split(';')[0]);
  const ops = cookies.join('; ');
  const admin = cookies.find((c) => c.startsWith('kp_admin='));
  const post = (body) => call(env, M, '/admin/akbostons/timing', { method: 'POST', headers: { cookie: admin, origin: `https://${M}` }, body: form(body) });
  const screen = async () => (await call(env, M, '/admin/akbostons/timing', { headers: { cookie: admin } })).text();
  const website = { 'timing.litter_days': '30', 'timing.older_after': '1', 'timing.deposits_after': '0' };
  const portalForm = Object.fromEntries(Object.entries(PORTAL_TIMING).map(([k, v]) => [`portal_timing.${k}`, String(v)]));

  // No portal: no portal card, and a save keeps no portal rules.
  assert.doesNotMatch(await screen(), /Family portal/);
  await post({ ...website, 'portal_timing.book_hour': '11' });
  assert.equal((await loadBuild(env, site.id)).portal_timing, undefined);

  await call(env, M, `/ops/sites/${site.id}/portal/on`, { method: 'POST', headers: { cookie: ops } });
  assert.match(await screen(), /Family portal[\s\S]*The vet booking reminder goes out[\s\S]*days before · default 5/);
  env.DB.raw.prepare('UPDATE sites SET draft_changed_at = NULL WHERE id = ?').run(site.id);
  const saved = await post({ ...website, ...portalForm, 'portal_timing.book_days_before': '3', 'portal_timing.stay_starts_weeks': '10' });
  assert.equal(saved.status, 303);
  assert.deepEqual((await loadBuild(env, site.id)).portal_timing, { book_days_before: 3, stay_starts_weeks: 10 });
  assert.equal((await getSettings(env, site.id)).timing.book_days_before, 3);
  // Only the portal changed: nothing waits to be published.
  assert.equal(env.DB.raw.prepare('SELECT draft_changed_at FROM sites WHERE id = ?').get(site.id).draft_changed_at, null);
  assert.match(await screen(), /days before · default 5 <span class="chg">changed<\/span>/);
  // Back to default, one rule.
  await post({ ...website, ...portalForm, 'portal_timing.book_days_before': '3', 'portal_timing.stay_starts_weeks': '10', default: 'portal_timing.book_days_before' });
  assert.deepEqual((await loadBuild(env, site.id)).portal_timing, { stay_starts_weeks: 10 });
  // Out of bounds: refused, with the reason, nothing saved.
  const bad = await post({ ...website, ...portalForm, 'portal_timing.book_hour': '25' });
  assert.equal(bad.status, 200);
  assert.match(await bad.text(), /The booking reminder goes out at: a whole number from 0 to 23\./);
  assert.deepEqual((await loadBuild(env, site.id)).portal_timing, { stay_starts_weeks: 10 });
  // The website's rules still save beside them, and that is something to publish.
  await post({ ...website, ...portalForm, 'portal_timing.stay_starts_weeks': '10', 'timing.litter_days': '12' });
  assert.deepEqual((await loadBuild(env, site.id)).timing, { litter_days: 12 });
  assert.ok(env.DB.raw.prepare('SELECT draft_changed_at FROM sites WHERE id = ?').get(site.id).draft_changed_at);
});

test('a stay with no first day says the site\'s age, today\'s words by default', async () => {
  const { defaultSay } = await import('../src/manage/wording.js');
  assert.equal(defaultSay('pstay.starts', { weeks: PORTAL_TIMING.stay_starts_weeks }), 'Starts at 8 weeks (add the litter\'s birthday to set it)');
});

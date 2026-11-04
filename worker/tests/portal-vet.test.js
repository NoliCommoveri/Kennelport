// The vet deadline and its reminders (portal plan section 5): both ways a contract
// counts it, a pickup late in the evening, daylight saving, and reminders that
// never land after the deadline.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  vetDeadline, zonedToUtc, localParts, reminderTimes, dueReminders, bookReminderAt, stage, vetStatus, timeLeft, validTimeZone,
} from '../src/portal/vet.js';

const NY = 'America/New_York';
const iso = (s) => new Date(s).toISOString();

test('local times convert both ways, across daylight saving', () => {
  assert.equal(zonedToUtc('2026-12-23', '23:00', NY).toISOString(), '2026-12-24T04:00:00.000Z');
  assert.equal(zonedToUtc('2026-07-01', '09:00', NY).toISOString(), '2026-07-01T13:00:00.000Z');
  assert.deepEqual({ ...localParts('2026-12-24T04:00:00Z', NY), s: 0 }, { ymd: '2026-12-23', hm: '23:00', s: 0 });
  // Spring forward: 2:30 doesn't exist on Mar 8, 2026; it lands just after the gap.
  assert.equal(zonedToUtc('2026-03-08', '02:30', NY).toISOString(), '2026-03-08T07:30:00.000Z');
  // Fall back: 1:30 happens twice on Nov 1, 2026; the first is taken.
  assert.equal(zonedToUtc('2026-11-01', '01:30', NY).toISOString(), '2026-11-01T05:30:00.000Z');
});

test('72 hours is exactly 72 hours, even across a clock change', () => {
  assert.equal(vetDeadline('2026-12-23T16:00:00Z', 'hours72', NY), '2026-12-26T16:00:00.000Z');
  assert.equal(vetDeadline('2026-10-31T16:00:00Z', 'hours72', NY), '2026-11-03T16:00:00.000Z');
});

test('3 calendar days: the end of the third day after the pickup day, in her zone', () => {
  // Picked up 11 pm Dec 23 New York time (04:00 UTC on the 24th): day 0 is the 23rd, so
  // the deadline is the end of Dec 26 there, not of the 27th, which UTC would say.
  assert.equal(vetDeadline('2026-12-24T04:00:00Z', 'days3', NY), iso('2026-12-27T04:59:00Z'));
  // A 9 am pickup the same day has the same deadline.
  assert.equal(vetDeadline('2026-12-23T14:00:00Z', 'days3', NY), iso('2026-12-27T04:59:00Z'));
  // In another zone the same instant is a different day.
  assert.equal(vetDeadline('2026-12-24T04:00:00Z', 'days3', 'America/Los_Angeles'), zonedToUtc('2026-12-26', '23:59', 'America/Los_Angeles').toISOString());
});

test('a late-evening pickup on the 72-hour rule: no reminder after the deadline', () => {
  const deadline = vetDeadline('2026-12-24T04:00:00Z', 'hours72', NY); // 11 pm Dec 26 local
  const times = reminderTimes(deadline, NY);
  assert.deepEqual(times.map((r) => r.kind), ['vet_day_before', 'vet_morning']);
  for (const r of times) assert.ok(r.at < Date.parse(deadline));
  // A deadline at 7 am: its morning reminder would be after it, so it's dropped.
  const early = zonedToUtc('2026-12-26', '07:00', NY).toISOString();
  assert.deepEqual(reminderTimes(early, NY).map((r) => r.kind), ['vet_day_before']);
});

const settings = { time_zone: NY, vet_rule: 'hours72' };
const base = { status: 'open', life_status: 'with_family', pickup_state: 'planned', go_home_on: '2026-12-23' };

test('the booking reminder goes 5 days before go-home, once, and stops at a booking', () => {
  assert.equal(bookReminderAt(base, NY).toISOString(), zonedToUtc('2026-12-18', '09:00', NY).toISOString());
  assert.deepEqual(dueReminders(base, settings, '2026-12-18T13:00:00Z'), []);
  assert.deepEqual(dueReminders(base, settings, '2026-12-18T14:01:00Z'), [{ kind: 'vet_book', basis: '2026-12-23' }]);
  assert.deepEqual(dueReminders(base, settings, '2026-12-19T14:00:00Z', new Map([['vet_book|2026-12-23', 1]])), []);
  assert.deepEqual(dueReminders({ ...base, vet_booked_at: '2026-12-10T00:00:00Z' }, settings, '2026-12-19T14:00:00Z'), []);
  // A booked pickup time counts from its own day.
  const booked = { ...base, pickup_booked_at: '2026-12-27T16:00:00Z' };
  assert.deepEqual(dueReminders(booked, settings, '2026-12-22T15:00:00Z'), [{ kind: 'vet_book', basis: '2026-12-27' }]);
});

test('after pickup: the pickup email first, then only the latest due, none after proof or deadline', () => {
  const picked = '2026-12-23T16:00:00Z';
  const deadline = vetDeadline(picked, 'hours72', NY); // Dec 26 16:00Z = 11 am local
  const p = { ...base, picked_up_at: picked, pickup_state: 'confirmed', vet_deadline_at: deadline };
  assert.deepEqual(dueReminders(p, settings, '2026-12-23T16:05:00Z'), [{ kind: 'vet_pickup', basis: deadline }]);
  const sent = new Map([[`vet_pickup|${deadline}`, Date.parse('2026-12-23T16:05:00Z')]]);
  assert.deepEqual(dueReminders(p, settings, '2026-12-24T16:00:00Z', sent), []);
  assert.deepEqual(dueReminders(p, settings, '2026-12-25T16:30:00Z', sent), [{ kind: 'vet_day_before', basis: deadline }]);
  sent.set(`vet_day_before|${deadline}`, Date.parse('2026-12-25T16:30:00Z'));
  assert.deepEqual(dueReminders(p, settings, '2026-12-26T13:30:00Z', sent), [{ kind: 'vet_morning', basis: deadline }]);
  assert.deepEqual(dueReminders({ ...p, proof_uploaded_at: '2026-12-26T12:00:00Z' }, settings, '2026-12-26T13:30:00Z', sent), []);
  assert.deepEqual(dueReminders(p, settings, '2026-12-26T16:00:00Z', sent), []);
});

test('a pickup marked late sends one email, not a burst', () => {
  const picked = '2026-12-23T16:00:00Z';
  const deadline = vetDeadline(picked, 'hours72', NY);
  const p = { ...base, picked_up_at: picked, pickup_state: 'confirmed', vet_deadline_at: deadline };
  // Marked on the 26th at 13:30Z: past both later reminders' times.
  assert.deepEqual(dueReminders(p, settings, '2026-12-26T13:30:00Z'), [{ kind: 'vet_pickup', basis: deadline }]);
  const sent = new Map([[`vet_pickup|${deadline}`, Date.parse('2026-12-26T13:30:00Z')]]);
  assert.deepEqual(dueReminders(p, settings, '2026-12-26T14:30:00Z', sent), []);
});

test('nothing for a closed placement, a lost puppy, or a clock she stopped', () => {
  const p = { ...base, picked_up_at: '2026-12-23T16:00:00Z', pickup_state: 'confirmed', vet_deadline_at: '2026-12-26T16:00:00.000Z' };
  assert.deepEqual(dueReminders({ ...p, status: 'closed' }, settings, '2026-12-23T17:00:00Z'), []);
  assert.deepEqual(dueReminders({ ...p, life_status: 'deceased' }, settings, '2026-12-23T17:00:00Z'), []);
  assert.deepEqual(dueReminders({ ...base, pickup_state: 'not_yet' }, settings, '2026-12-20T17:00:00Z'), []);
});

test('stages, her status words and time left', () => {
  const p = { ...base, picked_up_at: '2026-12-23T16:00:00Z', pickup_state: 'confirmed', vet_deadline_at: '2026-12-26T16:00:00.000Z' };
  assert.equal(stage(base, '2026-12-20T00:00:00Z'), 'before');
  assert.equal(stage(p, '2026-12-24T00:00:00Z'), 'vet');
  assert.equal(stage({ ...p, proof_accepted_at: 'x' }, '2026-12-24T00:00:00Z'), 'after');
  assert.equal(stage(p, '2026-12-27T00:00:00Z'), 'after');
  assert.deepEqual(vetStatus(p, '2026-12-24T00:00:00Z'), { word: 'Not booked', trouble: false });
  assert.deepEqual(vetStatus(p, '2026-12-25T00:00:00Z'), { word: 'Not booked', trouble: true });
  assert.deepEqual(vetStatus({ ...p, vet_booked_at: 'x' }, '2026-12-25T00:00:00Z'), { word: 'Booked', trouble: false });
  assert.deepEqual(vetStatus(p, '2026-12-27T00:00:00Z'), { word: 'Missed', trouble: true });
  assert.deepEqual(vetStatus({ ...p, proof_uploaded_at: 'x' }, '2026-12-27T00:00:00Z'), { word: 'Record uploaded', trouble: false });
  assert.equal(timeLeft('2026-12-26T16:00:00Z', '2026-12-24T11:00:00Z'), '2 days 5 hours');
  assert.equal(timeLeft('2026-12-26T16:00:00Z', '2026-12-26T15:20:00Z'), '40 minutes');
  assert.ok(validTimeZone('America/Chicago'));
  assert.ok(!validTimeZone('Mars/Base'));
  assert.ok(!validTimeZone('EST'));
});

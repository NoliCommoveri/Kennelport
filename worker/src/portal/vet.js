// The vet visit (docs/plans/family-portal.md section 5): the deadline,
// counted exactly as her contract words it, and the reminders, counted back from
// it so none lands after it. Pure functions of times and settings, so every rule
// here has a test (tests/portal-vet.test.js).
//
// Times are ISO-8601 UTC strings or Dates; "local" means her time zone (an IANA
// name, portal_settings.time_zone), worked out with Intl, so daylight saving is
// the platform's, not ours.

import { PORTAL_TIMING, hoursMs, hourText } from './timing.js';

const HOUR = 3600000;
const DAY = 24 * HOUR;

// Her contract's count, her Portal settings' choice, as one word: `hours<N>` (exactly
// N hours from pickup) or `days<N>` (the pickup day is day 0; by the end of day N,
// local). The first breeder's is hours72; any count in range works, so a contract
// with 48 hours or 5 days needs no code. Stored as how it's counted
// (portal_settings.vet_rule) and the number (vet_count, migration 0046); getSettings
// (portal/store.js ruleOf) joins them.
export const VET_HOURS = { min: 12, max: 240 };
export const VET_DAYS = { min: 1, max: 14 };

export function parseVetRule(rule) {
  const m = /^(hours|days)(\d{1,3})$/.exec(String(rule ?? ''));
  if (!m) return null;
  const kind = m[1];
  const n = Number(m[2]);
  const r = kind === 'hours' ? VET_HOURS : VET_DAYS;
  return n >= r.min && n <= r.max ? { kind, n } : null;
}

const ORDINALS = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
export const ordinal = (n) => ORDINALS[n] ?? `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;

// Today's words for a rule, as a heading line ("72 hours from pickup").
export function vetRuleText(rule) {
  const r = parseVetRule(rule) ?? { kind: 'hours', n: 72 };
  return r.kind === 'hours' ? `${r.n} hours from pickup` : `By the end of the ${ordinal(r.n)} day after the pickup day`;
}

// The rule inside a sentence about a puppy (`who`: its name, or "them"): "within 72
// hours of pickup" (or "of taking them home", with `taking`), or "by the end of the
// third day after the day you take them home".
export function vetRuleClause(rule, who, { taking = false } = {}) {
  const r = parseVetRule(rule) ?? { kind: 'hours', n: 72 };
  if (r.kind === 'hours') return `within ${r.n} hours of ${taking ? `taking ${who} home` : 'pickup'}`;
  return `by the end of the ${ordinal(r.n)} day after the day you take ${who} home`;
}

// Its short name on the families' tiles: "3-day", "2-day", "36-hour".
export function vetRuleShort(rule) {
  const r = parseVetRule(rule) ?? { kind: 'hours', n: 72 };
  if (r.kind === 'days') return `${r.n}-day`;
  return r.n % 24 === 0 ? `${r.n / 24}-day` : `${r.n}-hour`;
}

// The reminders' days and hours, the red under 48 hours left and the Vet visit tab's
// 24 hours are the site's timing rules (portal/timing.js): each function here takes
// them, today's by default. The reminder before pickup goes out days before go-home,
// at a local hour (vets are often booked days out); the deadline day's morning
// reminder at a local hour.

export function validTimeZone(tz) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: String(tz) });
    return /\//.test(String(tz)) || String(tz) === 'UTC';
  } catch {
    return false;
  }
}

const partsCache = new Map();
function formatter(tz) {
  if (!partsCache.has(tz)) {
    partsCache.set(tz, new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }));
  }
  return partsCache.get(tz);
}

// The local calendar fields of an instant.
export function localParts(at, tz) {
  const p = Object.fromEntries(formatter(tz).formatToParts(new Date(at)).map((x) => [x.type, x.value]));
  return { ymd: `${p.year}-${p.month}-${p.day}`, hm: `${p.hour}:${p.minute}`, s: Number(p.second) };
}

// Minutes the zone is ahead of UTC at an instant.
function offsetMinutes(ms, tz) {
  const { ymd, hm, s } = localParts(ms, tz);
  const [y, mo, d] = ymd.split('-').map(Number);
  const [h, mi] = hm.split(':').map(Number);
  return Math.round((Date.UTC(y, mo - 1, d, h, mi, s) - Math.floor(ms / 1000) * 1000) / 60000);
}

// A local date and time as an instant. A time skipped by a spring-forward change
// lands just after it; a repeated one takes the first.
export function zonedToUtc(ymd, hm, tz) {
  const [y, mo, d] = ymd.split('-').map(Number);
  const [h, mi] = hm.split(':').map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const first = guess - offsetMinutes(guess, tz) * 60000;
  if (localParts(first, tz).hm === hm) return new Date(first);
  const second = guess - offsetMinutes(first, tz) * 60000;
  return new Date(Math.max(first, second));
}

export function addDays(ymd, n) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

// The deadline for a pickup. days<N>: the pickup day is day 0, and the visit must
// happen by the end (23:59) of day N, local. hours<N>: exactly N hours later.
export function vetDeadline(pickedUpAt, rule, tz) {
  const t = new Date(pickedUpAt);
  const r = parseVetRule(rule) ?? { kind: 'hours', n: 72 };
  if (r.kind === 'days') return zonedToUtc(addDays(localParts(t, tz).ymd, r.n), '23:59', tz).toISOString();
  return new Date(t.getTime() + r.n * HOUR).toISOString();
}

// The reminders after pickup, before the deadline: about a day before, and the
// deadline day's morning. One sent "at pickup" is separate (always sent).
export function reminderTimes(deadline, tz, timing = PORTAL_TIMING) {
  const end = new Date(deadline).getTime();
  const morning = zonedToUtc(localParts(end, tz).ymd, hourText(timing.morning_hour), tz).getTime();
  return [
    { kind: 'vet_day_before', at: end - DAY },
    { kind: 'vet_morning', at: morning },
  ].filter((r) => r.at < end).sort((a, b) => a.at - b.at);
}

// The booking reminder's time, from the planned go-home date (or the booked
// pickup's local date).
export function bookReminderAt(placement, tz, timing = PORTAL_TIMING) {
  const ymd = placement.pickup_booked_at ? localParts(placement.pickup_booked_at, tz).ymd : placement.go_home_on;
  if (!ymd) return null;
  return zonedToUtc(addDays(ymd, -timing.book_days_before), hourText(timing.book_hour), tz);
}

// Is the clock running? Started by her marking pickup (confirmed) or by the booked
// time passing (assumed). Not yet stops it.
export const clockRunning = (p) => Boolean(p.picked_up_at && p.vet_deadline_at && (p.pickup_state === 'confirmed' || p.pickup_state === 'assumed'));

// What should go out now for one placement. `sent` maps "kind|basis" to when it
// went (ms), from the log. Returns [{ kind, basis }].
// - vet_book: before pickup, from 5 days (the site's rule) before go-home, until they record a booking.
// - vet_pickup: once the clock starts, always (it states the deadline).
// - of the later ones, only the latest that's due, none once a record is uploaded,
//   and none the pickup email already covered (sent after its time), so a pickup
//   marked late doesn't send a burst.
export function dueReminders(p, settings, now = new Date(), sent = new Map()) {
  const t = new Date(now).getTime();
  const timing = settings.timing ?? PORTAL_TIMING;
  if (p.status !== 'open' || p.life_status !== 'with_family') return [];
  const key = (kind, basis) => `${kind}|${basis}`;
  if (!clockRunning(p)) {
    if (p.vet_booked_at || p.pickup_state === 'not_yet') return [];
    const at = bookReminderAt(p, settings.time_zone, timing);
    const basis = p.pickup_booked_at ? localParts(p.pickup_booked_at, settings.time_zone).ymd : p.go_home_on;
    return at && t >= at.getTime() && !sent.has(key('vet_book', basis)) ? [{ kind: 'vet_book', basis }] : [];
  }
  const basis = p.vet_deadline_at;
  if (t >= Date.parse(basis)) return [];
  const pickupSent = sent.get(key('vet_pickup', basis));
  if (pickupSent === undefined) return [{ kind: 'vet_pickup', basis }];
  if (p.proof_uploaded_at) return [];
  const last = reminderTimes(basis, settings.time_zone, timing).filter((r) => r.at <= t).at(-1);
  if (!last || sent.has(key(last.kind, basis)) || pickupSent >= last.at) return [];
  return [{ kind: last.kind, basis }];
}

// The stage the family's Home shows (plan 7.2).
export function stage(p, now = new Date()) {
  if (!clockRunning(p)) return 'before';
  if (!p.proof_accepted_at && new Date(now).getTime() < Date.parse(p.vet_deadline_at)) return 'vet';
  return 'after';
}

// Whether the family's Vet visit tab shows (the owner, 2026-11-24): until 24 hours after
// the deadline, since many never go or never upload. A record in (uploaded, not
// declined, or accepted) takes it away early; one she declines brings it back, for
// 24 hours past the later of the deadline and her declining. Before the clock starts
// there's no deadline yet, so it shows.
export function vetTabShown(p, now = new Date(), timing = PORTAL_TIMING) {
  if (!p) return true;
  if (p.proof_accepted_at) return false;
  if (p.proof_uploaded_at && !p.proof_declined_at) return false;
  if (!clockRunning(p) || !p.vet_deadline_at) return true;
  const until = Math.max(Date.parse(p.vet_deadline_at), p.proof_declined_at ? Date.parse(p.proof_declined_at) : 0) + hoursMs(timing.vet_tab_hours);
  return new Date(now).getTime() < until;
}

// Where a vet visit stands (plan 7.3), and whether it's trouble: its key, for the
// owner's words on her screens (manage/wording-portal.js pvet.*), and today's word.
export function vetStatus(p, now = new Date(), timing = PORTAL_TIMING) {
  const t = new Date(now).getTime();
  const end = p.vet_deadline_at ? Date.parse(p.vet_deadline_at) : null;
  if (p.proof_accepted_at) return { key: 'accepted', word: 'Accepted', trouble: false };
  if (p.proof_declined_at) return { key: 'declined', word: 'Record declined', trouble: true };
  if (p.proof_uploaded_at) return { key: 'uploaded', word: 'Record uploaded', trouble: false };
  if (end && clockRunning(p) && t >= end) return { key: 'missed', word: 'Missed', trouble: true };
  if (p.vet_booked_at) return { key: 'booked', word: 'Booked', trouble: false };
  return { key: 'not_booked', word: 'Not booked', trouble: Boolean(end && clockRunning(p) && end - t < hoursMs(timing.trouble_hours)) };
}

// "2 days 5 hours", "5 hours", "40 minutes".
export function timeLeft(deadline, now = new Date()) {
  const ms = Date.parse(deadline) - new Date(now).getTime();
  if (ms <= 0) return 'no time';
  const d = Math.floor(ms / DAY);
  const h = Math.floor((ms % DAY) / HOUR);
  const m = Math.floor((ms % HOUR) / 60000);
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  if (d) return h ? `${plural(d, 'day')} ${plural(h, 'hour')}` : plural(d, 'day');
  if (h) return plural(h, 'hour');
  return plural(Math.max(m, 1), 'minute');
}

// "Sat, Dec 27, 11:00 PM" in a zone, with its short name when asked.
export function formatAt(at, tz, { zone = false, weekday = true } = {}) {
  return new Date(at).toLocaleString('en-US', {
    timeZone: tz, ...(weekday ? { weekday: 'short' } : {}), month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', ...(zone ? { timeZoneName: 'short' } : {}),
  });
}

export function formatDay(ymd) {
  return new Date(`${ymd}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

// The family portal's timing rules (docs/plans/site-builder.md step 6, "Timing rules"):
// the owner's, per site, on her Timing screen (manage/builder/timing.js), stored in the
// site's build as `portal_timing` with only what differs from these defaults, as the
// website's timing is (content/rules.js). Every site starts from these: today's
// behaviour, the first breeder's.
//
// Left fixed, as the plan says for rules that keep KennelPort running: how long invite
// links last (portal/auth.js), the Undo window (portal/account.js UNDO_DAYS) and the
// retention table (family-portal.md 10.1). The vet deadline itself is her contract's
// count, chosen in her Portal settings (portal/vet.js VET_RULES).
//
// Pure: no D1 here, so vet.js, steps.js and stays.js can read it with no imports.

export const PORTAL_TIMING = Object.freeze({
  // The booking reminder: this many days before go-home, at this local hour.
  book_days_before: 5,
  book_hour: 9,
  // The deadline day's morning reminder, at this local hour.
  morning_hour: 8,
  // With no booking and less than this many hours left, her screens show it red.
  trouble_hours: 48,
  // The families' Vet visit tab stays this many hours past the deadline.
  vet_tab_hours: 24,
  // An extended stay starts at this age, in weeks.
  stay_starts_weeks: 8,
  // An unticked timeline task reads Overdue for this many days after its day, then Past.
  overdue_days: 14,
});

// Each rule's bounds, for the owner's form.
export const PORTAL_TIMING_FIELDS = Object.freeze({
  book_days_before: { min: 0, max: 30 },
  book_hour: { min: 0, max: 23 },
  morning_hour: { min: 0, max: 23 },
  trouble_hours: { min: 1, max: 168 },
  vet_tab_hours: { min: 0, max: 336 },
  stay_starts_weeks: { min: 6, max: 26 },
  overdue_days: { min: 1, max: 90 },
});

// A site's rules from its build: the defaults with what she changed over them (a value
// out of bounds, as from an older build, falls back to the default).
export function portalTimingFor(build) {
  const own = build?.portal_timing && typeof build.portal_timing === 'object' ? build.portal_timing : {};
  const out = { ...PORTAL_TIMING };
  for (const [k, { min, max }] of Object.entries(PORTAL_TIMING_FIELDS)) {
    const v = own[k];
    if (Number.isInteger(v) && v >= min && v <= max) out[k] = v;
  }
  return Object.freeze(out);
}

export class PortalTimingError extends Error {}

// The owner's form (names like portal_timing.book_hour) to the full rules.
export function portalTimingFromForm(get, label = (k) => k) {
  const out = {};
  for (const [k, { min, max }] of Object.entries(PORTAL_TIMING_FIELDS)) {
    const raw = String(get(`portal_timing.${k}`) ?? '').trim();
    const n = raw === '' ? PORTAL_TIMING[k] : Number(raw);
    if (!Number.isInteger(n) || n < min || n > max) throw new PortalTimingError(`${label(k)}: a whole number from ${min} to ${max}.`);
    out[k] = n;
  }
  return out;
}

// The build after a change: only what differs from the defaults is kept.
export function withPortalTiming(build, full) {
  const out = { ...(build ?? {}) };
  const d = Object.fromEntries(Object.entries(full).filter(([k, v]) => PORTAL_TIMING[k] !== v));
  if (Object.keys(d).length) out.portal_timing = d; else delete out.portal_timing;
  return out;
}

const HOUR = 3600000;
export const hoursMs = (h) => h * HOUR;
// "09:00" from 9.
export const hourText = (h) => `${String(h).padStart(2, '0')}:00`;

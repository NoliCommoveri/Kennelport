// The linked sample's dates (docs/Linked_Sample_Plan.md), shared by the tests
// (tests/fixtures/linked-sample/sample.js) and the demo site (kennelos/demo.js).
// The files are written as of their step's day (SENT); shiftDates moves every date
// in a package by whole days, so a package can be sent "as of" any day and read
// the same: deposits still ahead, a litter past its ready date, a family in the
// vet window. Months (a heat's) move with the first of their month.
export const SAMPLE_DAY = '2026-11-01';

// The series (the plan's table): the day each step is sent. Bundle N and feed N are
// written as of that day.
export const SENT = Object.freeze({ 1: '2026-11-01', 2: '2026-11-20', 3: '2026-12-10', 4: '2027-01-15', 5: '2027-01-20' });
export const STEPS = Object.keys(SENT).length;

const DAY = 86400000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const AT = /^\d{4}-\d{2}-\d{2}T/;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export function shiftDates(v, days) {
  if (!days) return v;
  if (typeof v === 'string') {
    if (DATE.test(v)) return new Date(Date.parse(`${v}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
    if (AT.test(v)) return new Date(Date.parse(v) + days * DAY).toISOString();
    if (MONTH.test(v)) return new Date(Date.parse(`${v}-01T00:00:00Z`) + days * DAY).toISOString().slice(0, 7);
    return v;
  }
  if (Array.isArray(v)) return v.map((x) => shiftDates(x, days));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shiftDates(x, days)]));
  return v;
}

// Whole days from one YYYY-MM-DD to another.
export const daysBetween = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);

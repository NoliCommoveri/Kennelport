// The linked sample (docs/Linked_Sample_Plan.md): Tuxedo Lane Bostons*, a made-up
// kennel, as KennelOS would send it. The files are written as of SAMPLE_DAY; load()
// moves every date by whole days so the sample reads the same on any day it is
// used (deposits still ahead, a litter past its ready date, a family in the vet
// window). Months (a heat's) move with the first of their month.
import { readFileSync } from 'node:fs';

export const SAMPLE_DAY = '2026-11-01';
const DAY = 86400000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const AT = /^\d{4}-\d{2}-\d{2}T/;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

function shift(v, days) {
  if (typeof v === 'string') {
    if (DATE.test(v)) return new Date(Date.parse(`${v}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
    if (AT.test(v)) return new Date(Date.parse(v) + days * DAY).toISOString();
    if (MONTH.test(v)) return new Date(Date.parse(`${v}-01T00:00:00Z`) + days * DAY).toISOString().slice(0, 7);
    return v;
  }
  if (Array.isArray(v)) return v.map((x) => shift(x, days));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shift(x, days)]));
  return v;
}

const read = (name) => JSON.parse(readFileSync(new URL(name, import.meta.url), 'utf8'));

// The package as written (for the coverage test), or moved to `today` (YYYY-MM-DD).
export function load(name, today = null) {
  const raw = read(name);
  if (!today) return raw;
  const days = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${SAMPLE_DAY}T00:00:00Z`)) / DAY);
  return shift(raw, days);
}
export const bundle = (step, today) => load(`bundle-${step}.json`, today);
export const feed = (step, today) => load(`feed-${step}.json`, today);

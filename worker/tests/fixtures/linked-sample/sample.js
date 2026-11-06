// The linked sample (docs/Linked_Sample_Plan.md): Tuxedo Lane Bostons*, a made-up
// kennel, as KennelOS would send it. The files are written as of SAMPLE_DAY; load()
// moves every date by whole days so the sample reads the same on any day it is
// used (deposits still ahead, a litter past its ready date, a family in the vet
// window). Months (a heat's) move with the first of their month. The shifting is
// src/kennelos/sampleDates.js, which the demo site uses too.
import { readFileSync } from 'node:fs';
import { SAMPLE_DAY, SENT, shiftDates, daysBetween } from '../../../src/kennelos/sampleDates.js';

export { SAMPLE_DAY, SENT };

const read = (name) => JSON.parse(readFileSync(new URL(name, import.meta.url), 'utf8'));

// The package as written (for the coverage test), or moved to `today` (YYYY-MM-DD).
export function load(name, today = null) {
  const raw = read(name);
  if (!today) return raw;
  return shiftDates(raw, daysBetween(SAMPLE_DAY, today));
}
export const bundle = (step, today) => load(`bundle-${step}.json`, today);
export const feed = (step, today) => load(`feed-${step}.json`, today);

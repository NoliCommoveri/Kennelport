// A Featured block's schedule (docs/plans/kennelos-contract.md B5): which of its
// records shows today. The owner sets how long each stays (a day, a week, a month),
// in the breeder's order or shuffled, from a start date, and how many show at once;
// the breeder picks the records (content/picks.js) and can feature one on set dates,
// which wins over the rotation.
//
// No publish is needed to turn over: a page is drawn from the snapshot with today's
// date and cached per day (site.js cacheKey), so the rotation moves by itself. The
// shuffle is fixed, from the site and the block, so it doesn't change on reload.
export const FEATURE_EVERY = Object.freeze({ day: 'A day', week: 'A week', month: 'A month' });
export const FEATURE_ORDER = Object.freeze({ hers: 'In her order', shuffle: 'Shuffled' });
export const FEATURE_COUNT = Object.freeze({ 1: 'One at a time', 2: 'Two at a time', 3: 'Three at a time' });
// With no start date set, weeks turn on a Monday and months on the 1st.
const EPOCH = '2026-01-05';
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function cleanSchedule(s) {
  const v = s && typeof s === 'object' ? s : {};
  return {
    every: Object.hasOwn(FEATURE_EVERY, v.every) ? v.every : 'week',
    order: Object.hasOwn(FEATURE_ORDER, v.order) ? v.order : 'hers',
    start: DAY.test(String(v.start ?? '')) ? String(v.start) : '',
    count: Object.hasOwn(FEATURE_COUNT, String(v.count)) ? Number(v.count) : 1,
  };
}

const utc = (d) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));
// Whole periods from the start to today (negative before it).
export function periodsSince(start, today, every) {
  const a = start || (every === 'month' ? '2026-01-01' : EPOCH);
  if (every === 'month') {
    const m = (Number(today.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + Number(today.slice(5, 7)) - Number(a.slice(5, 7));
    return today.slice(8) < a.slice(8) ? m - 1 : m;
  }
  const days = Math.floor((utc(today) - utc(a)) / 86400000);
  return Math.floor(days / (every === 'day' ? 1 : 7));
}

// A small seeded generator, so a shuffle is the same every day for a site and block.
function seeded(text) {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuffled(rows, seed) {
  // By id, first, so the shuffle doesn't follow the order they came in.
  const out = [...rows].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const rnd = seeded(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// The records showing on `today`: any she fixed for today first, then the rotation's
// turn, `count` in all (fewer when there are fewer records; fixed ones past the count
// wait for a day with room, the earliest she set first).
export function featuredNow(rows, sched, fixed, seed, today) {
  const s = cleanSchedule(sched);
  if (!rows.length) return [];
  const byId = new Map(rows.map((x) => [x.id, x]));
  const pinned = [...new Set((fixed ?? []).filter((f) => f.from <= today && today <= f.to && byId.has(f.id)).map((f) => f.id))].map((id) => byId.get(id));
  const turn = s.order === 'shuffle' ? shuffled(rows, seed) : rows;
  const n = turn.length;
  const at = (((periodsSince(s.start, today, s.every) * s.count) % n) + n) % n;
  const out = [...pinned];
  for (let i = 0; i < n && out.length < s.count; i++) {
    const x = turn[(at + i) % n];
    if (!out.includes(x)) out.push(x);
  }
  return out.slice(0, s.count);
}

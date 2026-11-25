// The potty schedule (docs/plans/portal-resources-potty.md section 2): from a family's
// day (when the first person is up, meal times, bedtime) and the puppy's age, the day's
// trips outside, worked out each time the page opens so it grows with the puppy. Pure
// functions here (tests/portal-resources-potty.test.js); the family's answers are
// portal_potty (migration 0046), her guide portal_settings.potty_guide.
import { PortalError } from './store.js';

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const mins = (hm) => {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
};
const hm = (n) => {
  const x = ((Math.round(n / 5) * 5) % 1440 + 1440) % 1440;
  return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;
};

// How long a puppy can go, by age: the rule of thumb the AKC and most trainers give (about
// an hour per month of age, plus one, at most about eight) for the night; shorter in the
// day, since an awake, playing puppy goes more often. Minutes; from `weeks` (under).
export const POTTY_LIMITS = Object.freeze([
  { under: 10, day: 60, night: 180 },
  { under: 12, day: 90, night: 210 },
  { under: 16, day: 120, night: 240 },
  { under: 20, day: 180, night: 300 },
  { under: 24, day: 240, night: 360 },
  { under: Infinity, day: 300, night: 600 }, // 6 months on: through a normal night
]);
export const limitsFor = (weeks) => POTTY_LIMITS.find((x) => weeks < x.under);

export const POTTY_DEFAULTS = Object.freeze({ wake: '06:30', bed: '22:00', meals: ['07:00', '12:00', '17:00'] });

// Their answers, checked: wake and bed "HH:MM", 2 to 4 meals between them.
export function cleanPotty(input) {
  const wake = String(input.wake ?? '').trim();
  const bed = String(input.bed ?? '').trim();
  if (!TIME_RE.test(wake)) throw new PortalError('Choose when the first person is up.');
  if (!TIME_RE.test(bed)) throw new PortalError('Choose bedtime.');
  const meals = [...new Set((Array.isArray(input.meals) ? input.meals : String(input.meals ?? '').split(','))
    .map((x) => String(x).trim()).filter(Boolean))];
  if (meals.some((x) => !TIME_RE.test(x))) throw new PortalError('A meal time isn\'t a time.');
  if (meals.length < 2 || meals.length > 4) throw new PortalError('Give 2 to 4 meal times.');
  const w = mins(wake);
  let b = mins(bed);
  if (b <= w) b += 1440;
  if (b - w < 8 * 60) throw new PortalError('Bedtime is at least 8 hours after the first person is up.');
  const at = (x) => (mins(x) < w ? mins(x) + 1440 : mins(x));
  if (meals.some((x) => at(x) >= b)) throw new PortalError('Meal times fall between when you\'re up and bedtime.');
  return { wake, bed, meals: meals.sort((a, c) => at(a) - at(c)) };
}

const MEAL_NAMES = { 2: ['breakfast', 'dinner'], 3: ['breakfast', 'lunch', 'dinner'], 4: ['breakfast', 'lunch', 'the afternoon meal', 'dinner'] };

// The day's trips: [{ at: "HH:MM", what, why, kind }], from waking to the last overnight
// trip, for a puppy `weeks` old. kind: wake, meal, between, bed, night.
export function pottySchedule({ wake, bed, meals }, weeks) {
  const lim = limitsFor(weeks);
  const w = mins(wake);
  let b = mins(bed);
  if (b <= w) b += 1440;
  const at = (x) => (mins(x) < w ? mins(x) + 1440 : mins(x));
  const names = MEAL_NAMES[meals.length] ?? meals.map(() => 'a meal');
  const fixed = [
    { t: w, what: 'Out first thing', why: 'Straight from the crate to the spot, before anything else.', kind: 'wake' },
    ...meals.map((m, i) => ({ t: Math.min(at(m) + 15, b - 5), what: `After ${names[i]}`, why: 'About 15 minutes after eating.', kind: 'meal' })),
    { t: b, what: 'Last trip before bed', why: 'Water up about two hours before this.', kind: 'bed' },
  ].sort((x, y) => x.t - y.t);
  const out = [];
  for (let i = 0; i < fixed.length; i++) {
    out.push(fixed[i]);
    const next = fixed[i + 1];
    if (!next) break;
    const gap = next.t - fixed[i].t;
    const n = Math.ceil(gap / lim.day) - 1;
    for (let k = 1; k <= n; k++) out.push({ t: fixed[i].t + (gap * k) / (n + 1), what: 'Potty break', why: 'Even if they don\'t seem to need it.', kind: 'between' });
  }
  const night = w + 1440 - b;
  const n = Math.ceil(night / lim.night) - 1;
  for (let k = 1; k <= n; k++) out.push({ t: b + (night * k) / (n + 1), what: 'Overnight trip', why: 'Quick and quiet, no play, straight back to bed.', kind: 'night' });
  // Two trips within 20 minutes are one.
  const merged = [];
  for (const x of out) {
    const last = merged.at(-1);
    if (last && x.t - last.t < 20 && x.kind === 'between') continue;
    merged.push(x);
  }
  return merged.map((x) => ({ at: hm(x.t), what: x.what, why: x.why, kind: x.kind }));
}

// "6:30 am".
export function clock(h) {
  const [H, M] = h.split(':').map(Number);
  return `${H % 12 || 12}:${String(M).padStart(2, '0')} ${H < 12 ? 'am' : 'pm'}`;
}

// The age line: how often in the day, how long at night.
export function limitsLine(weeks) {
  const { day, night } = limitsFor(weeks);
  const unit = (m) => {
    const hrs = m / 60;
    return `${Number.isInteger(hrs) ? hrs : `${Math.floor(hrs)}½`} hour${hrs === 1 ? '' : 's'}`;
  };
  return { day: unit(day), night: unit(night) };
}

// Her guide when she hasn't written her own: what the experts agree on (AKC, ASPCA,
// AVSAB). Plain writing: a blank line starts a paragraph, a line starting "- " is a tip;
// {name} is the family's puppy, {kennel} her kennel. Drawn as the portal's other pages
// are (guideHtml), not as the handbook's book.
export const SUGGESTED_GUIDE = `Every trip outside is a chance for {name} to get it right. A few things make it go faster:

- Take {name} to the same spot every time, on a leash, and use the same word, like "go potty".
- Praise and give a small treat the moment {name} finishes, right there outside, not once you're back in.
- Potty first, play after. Keep the trip calm and boring until the job's done.
- Never punish an accident. If you catch one, calmly pick {name} up and go straight outside. If you find one later, just clean it up.
- Clean accidents with an enzyme cleaner, so the smell doesn't bring {name} back to the same place.
- Watch for sniffing, circling or heading for the door, and go out at once.
- When you can't watch, use the crate or a small puppy-safe area.
- Keep meals at the same times every day, and pick up the water about two hours before bed.

Expect accidents for the first few weeks. Most puppies are reliable by four to six months.`;

export const guideText = (s) => (s.potty_guide && s.potty_guide.trim() ? s.potty_guide : SUGGESTED_GUIDE);

// Her guide as the page draws it: paragraphs, and each run of tips as the portal's
// highlight rows (.hl, a ringed icon and the words). Nothing she writes is taken as HTML.
export function guideHtml(text, vars, icon) {
  const esc = (x) => String(x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const fill = (x) => x.replace(/\{(name|kennel)\}/g, (m, k) => vars[k] ?? m);
  const out = [];
  let tips = [];
  let para = [];
  const flush = () => {
    if (para.length) out.push(`<p>${esc(fill(para.join(' ')))}</p>`);
    if (tips.length) out.push(`<ul class="hl">${tips.map((x) => `<li><div><span class="badge">${icon}</span><span>${esc(fill(x))}</span></div></li>`).join('')}</ul>`);
    para = [];
    tips = [];
  };
  for (const raw of String(text).split('\n')) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    const tip = line.match(/^[-*•]\s+(.+)$/);
    if (tip) {
      if (para.length) { out.push(`<p>${esc(fill(para.join(' ')))}</p>`); para = []; }
      tips.push(tip[1]);
    } else {
      if (tips.length) flush();
      para.push(line);
    }
  }
  flush();
  return out.join('');
}

// A puppy's age in whole weeks on a day (YYYY-MM-DD), or null with no birth date.
export function weeksOld(bornOn, today) {
  if (!bornOn) return null;
  return Math.floor((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${bornOn}T12:00:00Z`)) / (7 * 86400000));
}

// ---------- storage ----------

export async function getPotty(env, siteId, placementId) {
  const r = await env.DB.prepare('SELECT * FROM portal_potty WHERE placement_id = ? AND site_id = ?').bind(placementId, siteId).first();
  return r ? { wake: r.wake, bed: r.bed, meals: r.meals.split(',') } : null;
}

export async function savePotty(env, siteId, placementId, input) {
  const v = cleanPotty(input);
  await env.DB.prepare(`INSERT INTO portal_potty (placement_id, site_id, wake, bed, meals, updated_at) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT (placement_id) DO UPDATE SET wake = excluded.wake, bed = excluded.bed, meals = excluded.meals, updated_at = excluded.updated_at`)
    .bind(placementId, siteId, v.wake, v.bed, v.meals.join(','), new Date().toISOString()).run();
  return v;
}

export async function removePotty(env, siteId, placementId) {
  await env.DB.prepare('DELETE FROM portal_potty WHERE placement_id = ? AND site_id = ?').bind(placementId, siteId).run();
}

// Her guide: her text (blank, or the suggested guide unchanged, keeps the suggested one),
// shown or not, and the potty page on or off for her site.
export async function savePottySettings(env, siteId, input) {
  const raw = String(input.potty_guide ?? '').replace(/\r\n?/g, '\n').trim().slice(0, 6000);
  const guide = input.reset || !raw || raw === SUGGESTED_GUIDE ? null : raw;
  const vals = [guide, input.potty_guide_off ? 1 : 0, input.potty_off ? 1 : 0];
  await env.DB.prepare(`INSERT INTO portal_settings (site_id, potty_guide, potty_guide_off, potty_off, updated_at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (site_id) DO UPDATE SET potty_guide = excluded.potty_guide, potty_guide_off = excluded.potty_guide_off, potty_off = excluded.potty_off, updated_at = excluded.updated_at`)
    .bind(siteId, ...vals, new Date().toISOString()).run();
}

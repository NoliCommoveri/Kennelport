// The family Home's sections, per site (docs/plans/site-builder.md step 6, "What the
// owner can move"; the owner, 2026-11-25): their order, and for each card whether it
// shows always, only once the puppy is home, or not at all, and until how many days
// after pickup. The owner's, on her Family Home screen (manage/builder/portalhome.js),
// stored in the site's build as `portal_home` with only what differs from today's.
// family.js and family/mk.js read it for Home in every look.
//
// Fixed, around them: the photo and the tiles at the top, Quick links and the
// disclosure at the foot. The stage's band (the vet visit, what's next, the stay) can
// move but not be hidden: the vet visit follows her contract (plan, "What can't move").
// Each section's own rules still hold first (the checklist from two weeks before
// go-home, the contacts in the first weeks, and so on); these only narrow them.
//
// Pure: no D1, so the tests and both looks share it.

// The sections between the tiles and Quick links, in today's order.
export const HOME_SECTIONS = Object.freeze(['stage', 'food', 'contacts', 'checklist', 'status', 'recommended', 'readnext']);
export const SECTION_NAMES = Object.freeze({
  stage: 'The stage\'s band: the vet visit, what\'s next, or the stay',
  food: 'The food and insurance band',
  contacts: 'Questions? One tap: her and the vet, from pickup for her "help weeks" (her Portal settings, 8 by default)',
  checklist: 'Go-home checklist: from two weeks before go-home until pickup (fixed)',
  status: 'Payments, additional services, and pickups: until pickup, with a status page (fixed)',
  recommended: 'Recommended for the puppy',
  readnext: 'Read next (the handbook\'s first chapters)',
});

// The cards she can hide or time: the band's three, and every section but the stage's.
export const HOME_CARDS = Object.freeze(['food', 'insurance', 'extra', 'contacts', 'checklist', 'status', 'recommended', 'readnext']);
export const CARD_NAMES = Object.freeze({
  food: 'Food card (Keep the puppy on the same food, Order its food)',
  insurance: 'Pet insurance card',
  extra: 'One more program (the slim card under insurance)',
  contacts: SECTION_NAMES.contacts, checklist: SECTION_NAMES.checklist, status: SECTION_NAMES.status,
  recommended: SECTION_NAMES.recommended, readnext: SECTION_NAMES.readnext,
});
// Which section each card is in.
export const CARD_SECTION = Object.freeze({ food: 'food', insurance: 'food', extra: 'food', contacts: 'contacts', checklist: 'checklist', status: 'status', recommended: 'recommended', readnext: 'readnext' });

export const SHOW = Object.freeze({ always: 'Whenever it has something to show', home: 'Only once the puppy is home', off: 'Never' });
export const UNTIL_MAX = 365;
const CARD_DEFAULT = Object.freeze({ show: 'always', until: null });

// A site's Home from its build: the order (any section missing from a stored order goes
// where today's order has it) and each card's rule.
export function portalHomeFor(build) {
  const own = build?.portal_home && typeof build.portal_home === 'object' ? build.portal_home : {};
  const stored = Array.isArray(own.order) ? own.order.filter((k, i, a) => HOME_SECTIONS.includes(k) && a.indexOf(k) === i) : [];
  const order = [...stored];
  for (const k of HOME_SECTIONS) {
    if (order.includes(k)) continue;
    const before = HOME_SECTIONS.slice(0, HOME_SECTIONS.indexOf(k)).reverse().find((x) => order.includes(x));
    order.splice(before ? order.indexOf(before) + 1 : 0, 0, k);
  }
  const cards = {};
  for (const k of HOME_CARDS) {
    const c = own.cards?.[k] ?? {};
    cards[k] = {
      show: Object.hasOwn(SHOW, c.show) ? c.show : 'always',
      until: Number.isInteger(c.until) && c.until >= 1 && c.until <= UNTIL_MAX ? c.until : null,
    };
  }
  return { order, cards, custom: order.some((k, i) => k !== HOME_SECTIONS[i]) };
}

export class HomeError extends Error {}

// The owner's form: home.order (the sections, comma-separated, as the screen keeps them),
// card.<key>.show and card.<key>.until.
export function portalHomeFromForm(get) {
  const order = String(get('home.order') ?? '').split(',').filter((k) => HOME_SECTIONS.includes(k));
  const cards = {};
  for (const k of HOME_CARDS) {
    const show = String(get(`card.${k}.show`) ?? 'always');
    const raw = String(get(`card.${k}.until`) ?? '').trim();
    const until = raw === '' ? null : Number(raw);
    if (until !== null && (!Number.isInteger(until) || until < 1 || until > UNTIL_MAX)) throw new HomeError(`${CARD_NAMES[k]}: until is a whole number of days from 1 to ${UNTIL_MAX}, or blank for no end.`);
    cards[k] = { show: Object.hasOwn(SHOW, show) ? show : 'always', until };
  }
  return { order, cards };
}

// The build after a change: only what differs from today's is kept.
export function withPortalHome(build, { order, cards }) {
  const out = { ...(build ?? {}) };
  const full = portalHomeFor({ portal_home: { order, cards } });
  const d = {};
  if (full.custom) d.order = full.order;
  const changed = Object.fromEntries(Object.entries(full.cards).filter(([, c]) => c.show !== CARD_DEFAULT.show || c.until !== CARD_DEFAULT.until)
    .map(([k, c]) => [k, c.until === null ? { show: c.show } : c]));
  if (Object.keys(changed).length) d.cards = changed;
  if (Object.keys(d).length) out.portal_home = d; else delete out.portal_home;
  return out;
}

// Moving one section up or down the order.
export function moveSection(order, key, dir) {
  const out = [...order];
  const i = out.indexOf(key);
  const j = dir === 'up' ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= out.length) return out;
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

// Whether a card shows now. daysHome: whole days since pickup (her dates), or null
// before pickup. Until counts from pickup: 14 shows on its day and the 13 after it.
export function cardShows(home, key, daysHome) {
  const c = home.cards[key] ?? CARD_DEFAULT;
  if (c.show === 'off') return false;
  if (daysHome === null) return c.show !== 'home';
  return c.until === null || daysHome < c.until;
}

// ---------- Classic's colours, in an order she chose ----------

// The colour of a Home section (portal.css, Card colours), or '|' for one that breaks
// the run (Read next), from its classes.
const has = (cls, c) => cls.includes(` ${c} `);
export function colourOf(classes) {
  const cls = ` ${classes} `;
  if (has(cls, 'readnext') || has(cls, 'hero') || has(cls, 'bento')) return '|';
  if (has(cls, 'c-green') || has(cls, 'mint') || has(cls, 'deep') || (has(cls, 'tile') && has(cls, 'green'))) return 'green';
  if (has(cls, 'c-sand') || has(cls, 'sand') || has(cls, 'band') || has(cls, 'warm')) return 'sand';
  return 'paper';
}
// The deep food band and the breakers keep their colour; the rest can take another.
const fixed = (classes) => colourOf(classes) === '|' || has(` ${classes} `, 'deep');
const COLOUR_TOKENS = new Set(['sand', 'paper', 'mint', 'c-sand', 'c-paper', 'c-green', 'warm']);
function recoloured(classes, colour) {
  const list = classes.split(/\s+/).filter((c) => c && !COLOUR_TOKENS.has(c));
  const sec = list.includes('sec');
  list.push(sec ? { green: 'mint', sand: 'sand', paper: 'paper' }[colour] : `c-${colour}`);
  return list.join(' ');
}

// The top-level <section>s of some html, each with where its class attribute is.
function sections(html) {
  const out = [];
  let depth = 0;
  for (const m of html.matchAll(/<(\/?)section\b([^>]*)>/g)) {
    if (m[1]) { depth--; continue; }
    if (depth++ === 0) {
      const cm = m[2].match(/class="([^"]*)"/);
      if (cm) out.push({ classes: cm[1], at: m.index + m[0].indexOf(cm[0]) + 7, len: cm[1].length });
    }
  }
  return out;
}

// Home's sections in an order she chose, with no two of one colour one above the other:
// where two meet, the lower one takes a colour neither neighbour has (or, when it keeps
// its own, the upper one does). Today's order needs none of this, so it's left as built.
export function recolour(html) {
  const secs = sections(html);
  const col = secs.map((x) => colourOf(x.classes));
  const pick = (i) => ['paper', 'sand', 'green'].find((c) => c !== col[i - 1] && c !== col[i + 1]);
  const next = new Map();
  for (let i = 1; i < secs.length; i++) {
    if (col[i] === '|' || col[i] !== col[i - 1]) continue;
    const j = !fixed(secs[i].classes) ? i : !fixed(secs[i - 1].classes) ? i - 1 : null;
    if (j === null) continue;
    const c = pick(j);
    if (!c) continue;
    col[j] = c;
    next.set(j, recoloured(secs[j].classes, c));
  }
  let out = html;
  for (const [j, cls] of [...next].sort((a, b) => b[0] - a[0])) out = out.slice(0, secs[j].at) + cls + out.slice(secs[j].at + secs[j].len);
  return out;
}

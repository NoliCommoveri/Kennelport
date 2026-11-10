// What Publish would change (plan 4.1): the live snapshot against one built from
// the draft, as short lines a breeder can read ("Willow: new photo", "Opal:
// Reserved", "Extras: 12-week package edited"), each with the page to preview.
import { PAGES, HOME_BLOCK_ORDER } from './content/model.js';
import { statusText } from './render/parts.js';

// Two values the same to a visitor. A blank (null, '', false, an empty list or
// object) is the same as a field that isn't there, and key order doesn't count: a
// snapshot published before a column was added lacks that field, and without this
// every dog, litter and puppy would read "edited" until the next Publish.
const blank = (v) => v == null || v === '' || v === false || (Array.isArray(v) && !v.length) || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(canon(v)).length);
function canon(v) {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().filter((k) => !blank(v[k])).map((k) => [k, canon(v[k])]));
  return v;
}
const same = (a, b) => (blank(a) && blank(b)) || JSON.stringify(canon(a)) === JSON.stringify(canon(b));
const strip = (o, keys) => Object.fromEntries(Object.entries(o ?? {}).filter(([k]) => !keys.includes(k)));
const BLOCK_NAMES = { hero: 'top of the page', facts: 'facts row', story: 'story', dogs: 'dogs row', litters: 'litters', reviews: 'reviews', waitlist: 'waitlist band' };
const SITE_NAMES = { kennel_name: 'name', tagline: 'line under the name', blurb: 'about-you line', breed: 'breed', monogram: 'monogram', logo_photo_id: 'logo', town: 'town', region: 'region', contact_email: 'email', contact_phone: 'phone', facebook_url: 'Facebook', facebook_label: 'Facebook', instagram_url: 'Instagram', dark_mode: 'dark mode', show_other_prices: 'showing prices' };

function byId(list) { return Object.fromEntries((list ?? []).map((x) => [x.id, x])); }

// Changes in a list of records: added, removed, edited (with a reason when one
// field explains it).
function records(lines, before, after, { name, path, describe }) {
  const a = byId(before);
  const b = byId(after);
  for (const [id, x] of Object.entries(b)) {
    if (!a[id]) { lines.push({ text: `${name(x)}: new`, path: path(x) }); continue; }
    if (same(a[id], x)) continue;
    lines.push({ text: `${name(x)}: ${describe(a[id], x)}`, path: path(x) });
  }
  for (const [id, x] of Object.entries(a)) if (!b[id]) lines.push({ text: `${name(x)}: removed`, path: null });
}

function why(a, b, special = {}) {
  const changed = Object.keys({ ...a, ...b }).filter((k) => !same(a[k], b[k]));
  for (const [k, fn] of Object.entries(special)) if (changed.includes(k)) { const t = fn(a[k], b[k]); if (t) return t; }
  if (changed.length === 1 && changed[0] === 'photo_id') return b.photo_id ? (a.photo_id ? 'new photo' : 'photo added') : 'photo removed';
  if (changed.length === 1 && changed[0] === 'slug') return 'new web address';
  return 'edited';
}

export function changes(live, draft) {
  if (!live) return [{ text: 'The whole site: first publish', path: '/' }];
  const lines = [];

  const siteChanged = Object.keys(SITE_NAMES).filter((k) => !same(live.site[k], draft.site[k]));
  if (siteChanged.length) lines.push({ text: `Kennel details: ${[...new Set(siteChanged.map((k) => SITE_NAMES[k]))].join(', ')} edited`, path: '/contact' });

  if ((live.site.family_login ?? null) !== (draft.site.family_login ?? null)) {
    lines.push({ text: `Family login link: ${!live.site.family_login ? 'added' : !draft.site.family_login ? 'removed' : 'changed'}`, path: draft.site.family_login ? '/waitlist/help' : null });
  }

  for (const key of HOME_BLOCK_ORDER) {
    const a = live.home[key]; const b = draft.home[key];
    if (same(a, b)) continue;
    const onOff = a?.enabled !== b?.enabled ? (b?.enabled ? 'switched on' : 'switched off') : 'edited';
    lines.push({ text: `Home, ${BLOCK_NAMES[key]}: ${onOff}`, path: '/' });
  }
  for (const [key, page] of Object.entries(PAGES)) {
    const a = live.pages[key]; const b = draft.pages[key];
    if (same(a, b)) continue;
    const label = b?.menu_label || page.label;
    const onOff = a?.enabled !== b?.enabled ? (b?.enabled ? 'switched on' : 'switched off') : 'wording edited';
    lines.push({ text: `${label} page: ${onOff}`, path: b?.enabled ? page.path : null });
  }

  records(lines, live.dogs.map((d) => strip(d, [])), draft.dogs, {
    name: (d) => d.call_name, path: (d) => `/dogs/${d.slug}`,
    describe: (a, b) => why(a, b, { health: (x, y) => (same(strip(a, ['health']), strip(b, ['health'])) ? 'health results changed' : null) }),
  });
  records(lines, live.litters.map((l) => strip(l, ['puppies'])), draft.litters.map((l) => strip(l, ['puppies'])), {
    name: (l) => l.name, path: (l) => `/litters/${l.slug}`, describe: (a, b) => why(a, b),
  });
  const pups = (snap) => snap.litters.flatMap((l) => l.puppies.map((p) => ({ ...p, _litter: l.slug })));
  records(lines, pups(live), pups(draft), {
    name: (p) => p.name, path: (p) => `/litters/${p._litter}/${p.slug}`,
    describe: (a, b) => why(a, b, { status: (x, y) => (Object.keys({ ...a, ...b }).filter((k) => !same(a[k], b[k])).length === 1 ? statusText(y) ?? y : null) }),
  });

  for (const [label, key, path, nameOf] of [
    ['Reviews', 'reviews', '/reviews', (r) => r.first_name],
    ['How it works', 'steps', '/how-it-works', (s) => s.heading],
    ['Extras', 'extras', '/extras', (x) => x.name],
    ['Recommended products', 'products', '/recommended', (x) => x.name],
    ['Partner kennels', 'partners', '/dogs#co-owned', (x) => x.name],
    ['Application form', 'questions', '/waitlist', (q) => q.label],
    ['Albums', 'albums', '/albums', (a) => a.title],
  ]) {
    const a = live[key] ?? []; const b = draft[key] ?? [];
    if (same(a, b)) continue;
    const ia = byId(a); const ib = byId(b);
    const added = b.filter((x) => !ia[x.id]).map(nameOf);
    const removed = a.filter((x) => !ib[x.id]).map(nameOf);
    const edited = b.filter((x) => ia[x.id] && !same(ia[x.id], x)).map(nameOf);
    const parts = [added.length && `${added.join(', ')} added`, edited.length && `${edited.join(', ')} edited`, removed.length && `${removed.join(', ')} removed`].filter(Boolean);
    lines.push({ text: `${label}: ${parts.join('; ') || 'order changed'}`, path });
  }
  for (const [key, label, path] of [['policies', 'Policies', '/policies'], ['faq', 'FAQ', '/faq'], ['waitlist_help', 'Using your status page', '/waitlist/help']]) {
    if (!same(live.expanders[key] ?? [], draft.expanders[key] ?? [])) lines.push({ text: `${label}: edited`, path });
  }
  // Videos and posts (phase 5): added or removed, by title or provider.
  const flat = (snap) => Object.values(snap.embeds ?? {}).flat();
  const ea = byId(flat(live)); const eb = byId(flat(draft));
  const name = (e) => e.title || `a ${e.provider === 'youtube' ? 'YouTube' : e.provider[0].toUpperCase() + e.provider.slice(1)} link`;
  const added = flat(draft).filter((e) => !ea[e.id]).map(name);
  const gone = flat(live).filter((e) => !eb[e.id]).map(name);
  const moved = !added.length && !gone.length && !same(Object.fromEntries(Object.entries(live.embeds ?? {}).map(([k, v]) => [k, v.map((e) => e.id)])), Object.fromEntries(Object.entries(draft.embeds ?? {}).map(([k, v]) => [k, v.map((e) => e.id)])));
  if (added.length || gone.length || moved) lines.push({ text: `Videos and posts: ${[added.length && `${added.join(', ')} added`, gone.length && `${gone.join(', ')} removed`].filter(Boolean).join('; ') || 'order changed'}`, path: null });

  // How to pay. Snapshots from before it existed had the notice on and no cards.
  const pay = (snap) => snap.payment ?? { safe_notice: { enabled: true, text: null } };
  const pa = pay(live); const pb = pay(draft);
  for (const [kind, name] of [['application_fee', 'application fee'], ['deposit', 'deposit']]) {
    if (same(pa[kind], pb[kind])) continue;
    lines.push({ text: `How to pay, ${name}: ${!pa[kind] ? 'shown' : !pb[kind] ? 'no longer shown' : 'edited'}`, path: pb[kind] ? '/waitlist' : null });
  }
  if (!same(pa.safe_notice, pb.safe_notice)) {
    lines.push({ text: `Safe-payment notice: ${pa.safe_notice?.enabled !== pb.safe_notice?.enabled ? (pb.safe_notice?.enabled ? 'switched on' : 'switched off') : 'wording edited'}`, path: '/waitlist' });
  }

  // Colours and style: the template and its colour scheme.
  if (!same(live.site.template, draft.site.template) || !same(live.site.scheme, draft.site.scheme)) {
    lines.push({ text: 'Colours and style: changed', path: '/' });
  }

  // Each page's blocks and their look (content/blocks.js), and the words, switch and
  // address of each block the owner added (buttons, banners…): one line a page.
  const la = live.layout ?? {}; const lb = draft.layout ?? {};
  const ada = live.added ?? {}; const adb = draft.added ?? {};
  const customs = [...(lb.custom ?? []), ...(la.custom ?? [])];
  const pageName = (key) => (key === 'home' ? 'Home' : draft.pages[key]?.menu_label || PAGES[key]?.label || customs.find((c) => c.id === key)?.name || 'A page');
  const pagePath = (key) => (key === 'home' ? '/' : PAGES[key]?.path ?? (lb.custom ?? []).find((c) => c.id === key)?.path ?? null);
  const ia = byId(la.custom); const ib = byId(lb.custom);
  for (const c of lb.custom ?? []) if (!ia[c.id]) lines.push({ text: `${c.name} page: added`, path: c.path });
  for (const c of la.custom ?? []) if (!ib[c.id]) lines.push({ text: `${c.name} page: removed`, path: null });
  const pageKeys = new Set([...Object.keys(la), ...Object.keys(lb), ...Object.keys(ada), ...Object.keys(adb)]);
  for (const key of ['custom', 'menu', 'profiles']) pageKeys.delete(key);
  for (const key of pageKeys) {
    if (ia[key] && !ib[key]) continue; // a removed page: said above
    if (!ia[key] && ib[key]) continue; // a new page: said above
    const blocks = !same(la[key], lb[key]); const own = !same(ada[key], adb[key]);
    if (!blocks && !own) continue;
    lines.push({ text: `${pageName(key)}: ${blocks ? 'blocks or their look changed' : 'buttons, banners or added words edited'}`, path: pagePath(key) });
  }
  if (!same(la.menu, lb.menu)) lines.push({ text: 'Menu: changed', path: '/' });
  if (!same(la.profiles, lb.profiles)) lines.push({ text: 'Dog and puppy pages: layout changed', path: null });
  if (!same(live.rules, draft.rules)) lines.push({ text: 'Display rules: changed', path: '/litters' });
  if (!same(live.timing, draft.timing)) lines.push({ text: 'Timing: changed', path: '/litters' });

  // Anything else the site draws from: never "Nothing to publish" while the live
  // site and the draft differ, even for a part this list doesn't name yet.
  const SAID = new Set(['v', 'built_at', 'id', 'site', 'pages', 'home', 'dogs', 'litters', 'reviews', 'steps', 'extras', 'products', 'partners', 'questions', 'albums', 'expanders', 'embeds', 'payment', 'layout', 'added', 'rules', 'timing']);
  const SITE_SAID = new Set([...Object.keys(SITE_NAMES), 'family_login', 'template', 'scheme']);
  const otherKeys = new Set([...Object.keys(live), ...Object.keys(draft)].filter((k) => !SAID.has(k)));
  const siteKeys = new Set([...Object.keys(live.site ?? {}), ...Object.keys(draft.site ?? {})].filter((k) => !SITE_SAID.has(k)));
  const other = [...otherKeys].some((k) => !same(live[k], draft[k])) || [...siteKeys].some((k) => !same(live.site?.[k], draft.site?.[k]));
  if (other) lines.push({ text: 'Other changes to the site', path: '/' });
  return lines;
}

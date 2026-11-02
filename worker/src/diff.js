// What Publish would change (plan 4.1): the live snapshot against one built from
// the draft, as short lines a breeder can read ("Willow: new photo", "Opal:
// Reserved", "Extras: 12-week package edited"), each with the page to preview.
import { PAGES, HOME_BLOCK_ORDER } from './content/model.js';
import { STATUS_TEXT } from './render/parts.js';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
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
    describe: (a, b) => why(a, b, { status: (x, y) => (Object.keys({ ...a, ...b }).filter((k) => !same(a[k], b[k])).length === 1 ? STATUS_TEXT[y] ?? y : null) }),
  });

  for (const [label, key, path, nameOf] of [
    ['Reviews', 'reviews', '/reviews', (r) => r.first_name],
    ['How it works', 'steps', '/how-it-works', (s) => s.heading],
    ['Extras', 'extras', '/extras', (x) => x.name],
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
  return lines;
}

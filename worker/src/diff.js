// What Publish would change (plan 4.1): the live snapshot against one built from
// the draft, as short lines a breeder can read ("Willow: new photo", "Opal:
// Reserved", "Extras: 12-week package edited"), each with the page to preview.
// Every word of it is the owner's (manage/wording.js, the Publish screen's
// publish.diff.* lines), read with the site's say().
import { PAGES, HOME_BLOCK_ORDER } from './content/model.js';
import { statusText, pagePath as addressOf } from './render/parts.js';
import { defaultSay } from './manage/wording.js';

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
// The kennel details the list names, each by its publish.diff.site.* line.
const SITE_NAMES = ['kennel_name', 'tagline', 'blurb', 'breed', 'monogram', 'logo_photo_id', 'town', 'region', 'contact_email', 'contact_phone', 'facebook_url', 'facebook_label', 'instagram_url', 'dark_mode', 'show_other_prices', 'group_health', 'pill_style'];

function byId(list) { return Object.fromEntries((list ?? []).map((x) => [x.id, x])); }

// Changes in a list of records: added, removed, edited (with a reason when one
// field explains it).
function records(lines, line, w, before, after, { name, path, describe }) {
  const a = byId(before);
  const b = byId(after);
  for (const [id, x] of Object.entries(b)) {
    if (!a[id]) { lines.push({ text: line(name(x), w('new')), path: path(x) }); continue; }
    if (same(a[id], x)) continue;
    lines.push({ text: line(name(x), describe(a[id], x)), path: path(x) });
  }
  for (const [id, x] of Object.entries(a)) if (!b[id]) lines.push({ text: line(name(x), w('removed')), path: null });
}

function why(w, a, b, special = {}) {
  const changed = Object.keys({ ...a, ...b }).filter((k) => !same(a[k], b[k]));
  for (const [k, fn] of Object.entries(special)) if (changed.includes(k)) { const t = fn(a[k], b[k]); if (t) return t; }
  if (changed.length === 1 && changed[0] === 'photo_id') return w(b.photo_id ? (a.photo_id ? 'new_photo' : 'photo_added') : 'photo_removed');
  if (changed.length === 1 && changed[0] === 'slug') return w('new_address');
  return w('edited');
}

export function changes(live, draft, say = defaultSay) {
  if (!live) return [{ text: say('publish.diff.first'), path: '/' }];
  const lines = [];
  const line = (part, what) => say('publish.diff.line', { part, what });
  const part = (k, vars) => say(`publish.diff.part.${k}`, vars);
  const w = (k, vars) => say(`publish.diff.what.${k}`, vars);
  const onOrOff = (on) => w(on ? 'switched_on' : 'switched_off');
  // A page's address on the draft: hers (content/addresses.js), else its starting one.
  const at = (key) => addressOf(draft, key);

  const siteChanged = SITE_NAMES.filter((k) => !same(live.site[k], draft.site[k]));
  if (siteChanged.length) lines.push({ text: line(part('site'), w('fields_edited', { fields: [...new Set(siteChanged.map((k) => say(`publish.diff.site.${k}`)))].join(', ') })), path: at('contact') });

  if ((live.site.family_login ?? null) !== (draft.site.family_login ?? null)) {
    lines.push({ text: line(part('family_login'), w(!live.site.family_login ? 'added' : !draft.site.family_login ? 'removed' : 'changed')), path: draft.site.family_login ? '/waitlist/help' : null });
  }

  for (const key of HOME_BLOCK_ORDER) {
    const a = live.home[key]; const b = draft.home[key];
    if (same(a, b)) continue;
    const onOff = a?.enabled !== b?.enabled ? onOrOff(b?.enabled) : w('edited');
    lines.push({ text: line(part('home_block', { block: say(`publish.diff.block.${key}`) }), onOff), path: '/' });
  }
  for (const [key, page] of Object.entries(PAGES)) {
    const a = live.pages[key]; const b = draft.pages[key];
    if (same(a, b)) continue;
    const label = b?.menu_label || page.label;
    const moved = addressOf(live, key) !== at(key);
    if (moved) lines.push({ text: line(part('page', { page: label }), w('page_address', { path: at(key) })), path: b?.enabled ? at(key) : null });
    if (moved && same(strip(a, ['path']), strip(b, ['path']))) continue;
    const onOff = a?.enabled !== b?.enabled ? onOrOff(b?.enabled) : w('wording_edited');
    lines.push({ text: line(part('page', { page: label }), onOff), path: b?.enabled ? at(key) : null });
  }

  records(lines, line, w, live.dogs.map((d) => strip(d, [])), draft.dogs, {
    name: (d) => d.call_name, path: (d) => `/dogs/${d.slug}`,
    describe: (a, b) => why(w, a, b, { health: (x, y) => (same(strip(a, ['health']), strip(b, ['health'])) ? w('health') : null) }),
  });
  records(lines, line, w, live.litters.map((l) => strip(l, ['puppies'])), draft.litters.map((l) => strip(l, ['puppies'])), {
    name: (l) => l.name, path: (l) => `/litters/${l.slug}`, describe: (a, b) => why(w, a, b),
  });
  const pups = (snap) => snap.litters.flatMap((l) => l.puppies.map((p) => ({ ...p, _litter: l.slug })));
  records(lines, line, w, pups(live), pups(draft), {
    name: (p) => p.name, path: (p) => `/litters/${p._litter}/${p.slug}`,
    describe: (a, b) => why(w, a, b, { status: (x, y) => (Object.keys({ ...a, ...b }).filter((k) => !same(a[k], b[k])).length === 1 ? statusText(y) ?? y : null) }),
  });

  // Added, edited and removed, by name: "Opal, Pearl added; Onyx removed".
  const named = (added, edited, removed) => [added.length && w('names_added', { names: added.join(', ') }), edited.length && w('names_edited', { names: edited.join(', ') }), removed.length && w('names_removed', { names: removed.join(', ') })].filter(Boolean).join('; ');
  for (const [key, path, nameOf] of [
    ['reviews', at('reviews'), (r) => r.first_name],
    ['steps', at('how_it_works'), (s) => s.heading],
    ['extras', at('extras'), (x) => x.name],
    ['products', at('products'), (x) => x.name],
    ['partners', `${at('dogs')}#co-owned`, (x) => x.name],
    ['questions', '/waitlist', (q) => q.label],
    ['albums', at('albums'), (a) => a.title],
  ]) {
    const a = live[key] ?? []; const b = draft[key] ?? [];
    if (same(a, b)) continue;
    const ia = byId(a); const ib = byId(b);
    const added = b.filter((x) => !ia[x.id]).map(nameOf);
    const removed = a.filter((x) => !ib[x.id]).map(nameOf);
    const edited = b.filter((x) => ia[x.id] && !same(ia[x.id], x)).map(nameOf);
    lines.push({ text: line(part(key), named(added, edited, removed) || w('order_changed')), path });
  }
  for (const [key, path] of [['policies', at('policies')], ['faq', at('faq')], ['waitlist_help', '/waitlist/help']]) {
    if (!same(live.expanders[key] ?? [], draft.expanders[key] ?? [])) lines.push({ text: line(part(key), w('edited')), path });
  }
  // Videos and posts (phase 5): added or removed, by title or provider.
  const flat = (snap) => Object.values(snap.embeds ?? {}).flat();
  const ea = byId(flat(live)); const eb = byId(flat(draft));
  const name = (e) => e.title || say('publish.diff.embed', { provider: e.provider === 'youtube' ? 'YouTube' : e.provider[0].toUpperCase() + e.provider.slice(1) });
  const added = flat(draft).filter((e) => !ea[e.id]).map(name);
  const gone = flat(live).filter((e) => !eb[e.id]).map(name);
  const moved = !added.length && !gone.length && !same(Object.fromEntries(Object.entries(live.embeds ?? {}).map(([k, v]) => [k, v.map((e) => e.id)])), Object.fromEntries(Object.entries(draft.embeds ?? {}).map(([k, v]) => [k, v.map((e) => e.id)])));
  if (added.length || gone.length || moved) lines.push({ text: line(part('embeds'), named(added, [], gone) || w('order_changed')), path: null });

  // How to pay. Snapshots from before it existed had the notice on and no cards.
  const pay = (snap) => snap.payment ?? { safe_notice: { enabled: true, text: null } };
  const pa = pay(live); const pb = pay(draft);
  for (const kind of ['application_fee', 'deposit']) {
    if (same(pa[kind], pb[kind])) continue;
    lines.push({ text: line(part('pay', { fee: say(`publish.diff.fee.${kind}`) }), w(!pa[kind] ? 'shown' : !pb[kind] ? 'no_longer_shown' : 'edited')), path: pb[kind] ? '/waitlist' : null });
  }
  if (!same(pa.safe_notice, pb.safe_notice)) {
    lines.push({ text: line(part('safe_notice'), pa.safe_notice?.enabled !== pb.safe_notice?.enabled ? onOrOff(pb.safe_notice?.enabled) : w('wording_edited')), path: '/waitlist' });
  }

  // Colours and style: the template and its colour scheme.
  if (!same(live.site.template, draft.site.template) || !same(live.site.scheme, draft.site.scheme)) {
    lines.push({ text: line(part('style'), w('changed')), path: '/' });
  }

  // Each page's blocks and their look (content/blocks.js), and the words, switch and
  // address of each block the owner added (buttons, banners…): one line a page.
  const la = live.layout ?? {}; const lb = draft.layout ?? {};
  const ada = live.added ?? {}; const adb = draft.added ?? {};
  const customs = [...(lb.custom ?? []), ...(la.custom ?? [])];
  const pageName = (key) => (key === 'home' ? part('home') : draft.pages[key]?.menu_label || PAGES[key]?.label || customs.find((c) => c.id === key)?.name || part('a_page'));
  const pagePath = at;
  const ia = byId(la.custom); const ib = byId(lb.custom);
  for (const c of lb.custom ?? []) if (!ia[c.id]) lines.push({ text: line(part('page', { page: c.name }), w('added')), path: at(c.id) });
  // A page the owner added, at a new address (hers, or the owner's).
  for (const c of lb.custom ?? []) {
    if (ia[c.id] && addressOf(live, c.id) !== at(c.id)) lines.push({ text: line(part('page', { page: draft.pages[c.id]?.menu_label || c.name }), w('page_address', { path: at(c.id) })), path: at(c.id) });
  }
  for (const c of la.custom ?? []) if (!ib[c.id]) lines.push({ text: line(part('page', { page: c.name }), w('removed')), path: null });
  const pageKeys = new Set([...Object.keys(la), ...Object.keys(lb), ...Object.keys(ada), ...Object.keys(adb)]);
  for (const key of ['custom', 'menu', 'profiles']) pageKeys.delete(key);
  for (const key of pageKeys) {
    if (ia[key] && !ib[key]) continue; // a removed page: said above
    if (!ia[key] && ib[key]) continue; // a new page: said above
    const blocks = !same(la[key], lb[key]); const own = !same(ada[key], adb[key]);
    if (!blocks && !own) continue;
    lines.push({ text: line(pageName(key), w(blocks ? 'blocks' : 'added_words')), path: pagePath(key) });
  }
  if (!same(la.menu, lb.menu)) lines.push({ text: line(part('menu'), w('changed')), path: '/' });
  if (!same(la.profiles, lb.profiles)) lines.push({ text: line(part('profiles'), w('layout')), path: null });
  if (!same(live.rules, draft.rules)) lines.push({ text: line(part('rules'), w('changed')), path: at('litters') });
  if (!same(live.timing, draft.timing)) lines.push({ text: line(part('timing'), w('changed')), path: at('litters') });

  // Anything else the site draws from: never "Nothing to publish" while the live
  // site and the draft differ, even for a part this list doesn't name yet.
  const SAID = new Set(['v', 'built_at', 'id', 'site', 'pages', 'home', 'dogs', 'litters', 'reviews', 'steps', 'extras', 'products', 'partners', 'questions', 'albums', 'expanders', 'embeds', 'payment', 'layout', 'added', 'rules', 'timing']);
  const SITE_SAID = new Set([...SITE_NAMES, 'family_login', 'template', 'scheme']);
  const otherKeys = new Set([...Object.keys(live), ...Object.keys(draft)].filter((k) => !SAID.has(k)));
  const siteKeys = new Set([...Object.keys(live.site ?? {}), ...Object.keys(draft.site ?? {})].filter((k) => !SITE_SAID.has(k)));
  const other = [...otherKeys].some((k) => !same(live[k], draft[k])) || [...siteKeys].some((k) => !same(live.site?.[k], draft.site?.[k]));
  if (other) lines.push({ text: say('publish.diff.other'), path: '/' });
  return lines;
}

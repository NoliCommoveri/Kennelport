// Pieces of the "ak" template shared by its pages: formatting, photos, cards and
// the menu. Every value from a snapshot passes through esc() (or attr()) here.
import { escapeHtml as esc } from '../lib/html.js';
import { MENU_GROUPS, PAGES } from '../content/model.js';
import { puppyPrice, litterPriceRange, depositRange } from '../content/prices.js';
import { DEFAULT_RULES, DEFAULT_TIMING, ruleKey, addDays } from '../content/rules.js';

export { esc };
export const attr = esc;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function fmtDate(ymd) {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}
// "December 12": a date this year or next, where the year goes without saying.
export function fmtDay(ymd) {
  if (!ymd) return '';
  const [, m, d] = ymd.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}
export function fmtMonth(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}
const money = (n) => `$${Number(n).toLocaleString('en-US')}`;
// A price, or a range: "$2,500–$3,000", or "From $2,500" with the site's rule.
export function priceText(from, to, style = 'range') {
  if (from == null) return '';
  if (to == null || to === from) return money(from);
  return style === 'from' ? `From ${money(from)}` : `${money(from)}–${money(to)}`;
}

// ---------- the site's display and timing rules (content/rules.js) ----------

// From the snapshot; one built before rules existed shows today's behaviour.
export const rulesOf = (snap) => snap.rules ?? DEFAULT_RULES;
export const timingOf = (snap) => snap.timing ?? DEFAULT_TIMING;
// The rule for a puppy's status.
export const statusRule = (snap, p) => rulesOf(snap).status[ruleKey(p.status)] ?? DEFAULT_RULES.status.hidden;
// What replaces a price where prices are off.
export const pricesOff = (snap) => rulesOf(snap).price.off;
export const sitePrice = (snap, from, to) => priceText(from, to, rulesOf(snap).price.style);

// Paragraphs from multi-line text.
export const paras = (text) => String(text ?? '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');

// ---------- photos ----------

export const photoUrl = (id, { thumb = false } = {}) => `/_kp/p/${encodeURIComponent(id)}${thumb ? '?s=t' : ''}`;

export function img(snap, id, { alt, cls = '', thumb = false, lazy = true } = {}) {
  const p = id && snap.photos[id];
  if (!p) return null;
  const size = p.width && p.height ? ` width="${p.width}" height="${p.height}"` : '';
  return `<img src="${photoUrl(id, { thumb: thumb && p.thumb })}" alt="${attr(alt ?? p.alt ?? '')}"${size}${cls ? ` class="${cls}"` : ''}${lazy ? ' loading="lazy"' : ''}>`;
}

// ---------- the menu ----------

// Which pages show: switched on, and with something in them (plan 3.12).
export function pageOn(snap, key, ctx) {
  const page = snap.pages[key];
  if (!page || !page.enabled) return false;
  switch (key) {
    case 'dogs': return snap.dogs.some((d) => d.status === 'active');
    case 'reviews': return true; // the page carries the Share your review form even before the first review
    case 'litters': return snap.litters.length > 0;
    case 'older': return olderPuppies(snap, ctx.today).length > 0;
    case 'how_it_works': return snap.steps.length > 0;
    case 'extras': return snap.extras.length > 0;
    case 'products': return (snap.products ?? []).some((x) => !x.transport);
    // Getting your pup home: once one of her sections has words (transport
    // services alone don't make a page).
    case 'pickup': return ['pickup_text', 'transport_text', 'travel_text'].some((k) => page[k]);
    case 'policies': return (snap.expanders.policies ?? []).length > 0;
    case 'faq': return (snap.expanders.faq ?? []).length > 0;
    case 'waitlist_help': return (snap.expanders.waitlist_help ?? []).length > 0;
    case 'albums': return (snap.albums ?? []).length > 0;
    default: return true;
  }
}

export const label = (snap, key) => snap.pages[key]?.menu_label || PAGES[key].label;

export function menuGroups(snap, ctx) {
  const groups = [];
  for (const g of MENU_GROUPS) {
    const links = [];
    for (const [key, page] of Object.entries(PAGES)) {
      if (page.group !== g.key || !pageOn(snap, key, ctx)) continue;
      links.push({ key, href: page.path, text: label(snap, key) });
      // Sub-links that are places within a page.
      const breeding = dogGroups(snap).breeding;
      if (key === 'dogs' && breeding.some((d) => d.sex === 'female') && breeding.some((d) => d.sex === 'male')) {
        links.push({ key, href: '/dogs#girls', text: 'Girls' }, { key, href: '/dogs#boys', text: 'Boys' });
      }
      if (key === 'litters') {
        const current = snap.litters.some((l) => l.stage === 'current' && !depositsAhead(snap, l, ctx.today));
        const planned = snap.litters.some((l) => l.stage === 'planned' || depositsAhead(snap, l, ctx.today));
        links.pop();
        if (current) links.push({ key, href: '/litters#available', text: 'Available' });
        if (planned) links.push({ key, href: '/litters#upcoming', text: 'Upcoming litters' });
        if (!current && !planned) links.push({ key, href: '/litters', text: label(snap, key) });
      }
    }
    if (links.length) groups.push({ ...g, links });
  }
  return groups;
}

// ---------- litters and puppies ----------

// 'coming_soon' is stored, and reads "Still deciding" (plan 3.6, decision 32): she
// may keep the puppy, place it privately or never offer it, so the site promises
// nothing. The Site Manager's own words for a status; the site reads its rules.
export const STATUS_TEXT = { available: 'Available', reserved: 'Reserved', placed: 'Reserved', staying: 'Joining our program', coming_soon: 'Still deciding' };

// The day deposits open: the litter's deposits date, moved by the site's timing rule.
const depositsOpen = (snap, l) => (l.deposits_on ? addDays(l.deposits_on, timingOf(snap).deposits_after) : null);

// A born litter whose deposits don't open yet (plan 5.3): it sits under Coming up,
// and its Available puppies read "Available on <date>". The site moves it on the
// day, from the published snapshot.
export const depositsAhead = (snap, l, today) => l.stage === 'current' && Boolean(l.deposits_on) && depositsOpen(snap, l) > today;

// A current litter past its going-home date, by the site's timing rule (today: from
// the day after): its available puppies are older puppies, and it is "Ready now".
const pastReady = (snap, l, today) => l.stage === 'current' && Boolean(l.ready_on) && !depositsAhead(snap, l, today)
  && addDays(l.ready_on, timingOf(snap).older_after) <= today;

// What a puppy's status says, on its card and page.
export function puppyStatus(snap, l, p, today) {
  if (p.status === 'available' && depositsAhead(snap, l, today)) return rulesOf(snap).price.before.replace('{date}', fmtDay(depositsOpen(snap, l)));
  return statusRule(snap, p).words;
}

// A puppy's price line: only for a status whose rule shows a price (today
// Available only), and only with the litter's Show prices on (plan 3.2).
export function puppyPriceText(snap, l, p) {
  if (!statusRule(snap, p).price) return '';
  if (!l.show_prices) return pricesOff(snap);
  const r = puppyPrice(l, p);
  return r ? sitePrice(snap, r.from, r.to) : '';
}

// The litter's own price rows: a range across its sexes, and the deposit.
export function litterPriceRows(snap, l) {
  const P = rulesOf(snap).price;
  if (l.stage === 'past') return [];
  if (!l.show_prices) return [[P.price_label, P.off]];
  const r = litterPriceRange(l);
  const d = depositRange(l);
  return [[P.price_label, r && sitePrice(snap, r.from, r.to)], [P.deposit_label, d && sitePrice(snap, d.from, d.to)]];
}

// The Dogs page's groups (plan 3.7), from each dog's status: the breeding dogs
// (girls and boys), young stock she has kept, and adults looking for a home.
// Retired and in-memory dogs wait for their pages (backlog). A co-owned dog
// living with one of its co-owners is in none of them, only in `away`, the Co-owned
// section (docs/Co_Owned_Dogs_Plan.md); one living with her is grouped like her own.
export function dogGroups(snap) {
  const active = snap.dogs.filter((d) => d.status === 'active');
  const home = active.filter((d) => !d.lives_away);
  return {
    breeding: home.filter((d) => !d.upcoming && !d.for_sale),
    upcoming: home.filter((d) => d.upcoming && !d.for_sale),
    for_sale: home.filter((d) => d.for_sale),
    away: active.filter((d) => d.lives_away),
  };
}

// A dog's partner kennels, as the site may name them: the one it lives with, and
// the kennels of its co-owners. Older snapshots have none.
export const partnerOf = (snap, id) => (id ? (snap.partners ?? []).find((x) => x.id === id) ?? null : null);
export const coOwnedWith = (snap, d) => (d.co_owned_with_ids ?? []).map((id) => partnerOf(snap, id)).filter(Boolean);

// A partner kennel's logo, small, when it has one.
export function partnerLogo(snap, k, cls = 'plogo') {
  return k?.photo_id ? img(snap, k.photo_id, { alt: '', cls, thumb: true }) ?? '' : '';
}
// Its name, linked to its website when it has one.
export const partnerLink = (k) => (k.url ? `<a href="${attr(k.url)}" rel="noopener">${esc(k.name)}</a>` : esc(k.name));

// Available puppies past their litter's going-home date (plan 3.11): the statuses
// whose rule lets them be older puppies (today Available only).
export function olderPuppies(snap, today) {
  const out = [];
  for (const l of snap.litters) {
    if (!pastReady(snap, l, today)) continue;
    for (const p of l.puppies) if (statusRule(snap, p).older) out.push({ litter: l, puppy: p });
  }
  return out;
}

// A litter's puppies in the order its rules give their statuses (today reserved
// and placed last); equal keeps the breeder's order.
export const sortPuppies = (snap, pups) => [...pups].sort((a, b) => statusRule(snap, a).order - statusRule(snap, b).order);

export function parentName(snap, l, role) {
  const id = l[`${role}_id`];
  const dog = id && snap.dogs.find((d) => d.id === id);
  return dog ? dog.call_name : (l[`${role}_name`] || null);
}

export function pairNames(snap, l) {
  const dam = parentName(snap, l, 'dam');
  const sire = parentName(snap, l, 'sire');
  if (dam && sire) return `${dam} × ${sire}`;
  if (dam) return `${dam} × sire to be chosen`;
  return sire ?? '';
}

function counts(pups) {
  const g = pups.filter((p) => p.sex === 'female').length;
  const b = pups.filter((p) => p.sex === 'male').length;
  const part = (n, one, many) => (n ? `${n} ${n === 1 ? one : many}` : null);
  return [part(g, 'girl', 'girls'), part(b, 'boy', 'boys')].filter(Boolean).join(', ') || 'Expected';
}

// A parent's picture, or its initial in a circle.
function parentPhoto(snap, l, role) {
  const id = l[`${role}_id`];
  const dog = id && snap.dogs.find((d) => d.id === id);
  const name = parentName(snap, l, role);
  return (dog && img(snap, dog.photo_id, { alt: dog.call_name, thumb: true })) || `<span class="ph">${esc(name ? name.slice(0, 1) : '?')}</span>`;
}

// A litter's facts, as its card lists them: [label, value] rows, blanks included.
export function litterRows(snap, l, ctx) {
  const ahead = depositsAhead(snap, l, ctx.today);
  const older = pastReady(snap, l, ctx.today);
  return (l.stage === 'planned'
    ? [['Expected', l.expected_label], ['Going home', l.ready_label]]
    : [['Born', fmtDate(l.born_on)], ['Deposits from', ahead ? fmtDate(depositsOpen(snap, l)) : null], ['Puppies', l.puppies.length ? l.puppies.map((p) => p.name).length <= 2 ? l.puppies.map((p) => p.name).join(', ') : counts(l.puppies) : null],
      ['Going home', older ? 'Ready now' : fmtDate(l.ready_on)]]).concat(litterPriceRows(snap, l));
}

const kvList = (rows) => `<dl class="kv">${rows.filter(([, v]) => v).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;

// A litter's page doesn't repeat its card: the page's head already names the litter
// and its parents. Under it, a small card for each parent in one row (Dam over the
// mother, Sire over the father) says something about them: picture, registered
// name, titles, colour and registry, a few health results, and a link to the
// dog's page. A parent that isn't one of her dogs on the site (an outside stud)
// shows the name she typed. Then the litter's facts the head doesn't give.
export function parentCards(snap, l) {
  const card = (role) => {
    const id = l[`${role}_id`];
    const d = id && snap.dogs.find((x) => x.id === id);
    const name = parentName(snap, l, role);
    if (!name) return '';
    const line = d ? [d.color, d.registry].filter(Boolean).join(' · ') : '';
    const health = d?.health ?? [];
    const tests = health.length
      ? `<ul class="tests">${health.slice(0, 3).map((h) => `<li><span>${esc(h.test)}</span><span>${esc(h.result)}</span></li>`).join('')}</ul>${health.length > 3 ? `<span class="small muted">and ${health.length - 3} more health result${health.length - 3 === 1 ? '' : 's'}</span>` : ''}`
      : '';
    return `<div class="parent"><span class="eyebrow">${role === 'dam' ? 'Dam' : 'Sire'}</span>
      <article class="parent-card">${parentPhoto(snap, l, role)}<b class="call">${esc(name)}</b>${d?.registered_name ? `<span class="reg">${esc(d.registered_name)}</span>` : ''}${d?.titles ? `<span class="small">${esc(d.titles)}</span>` : ''}${line ? `<span class="small muted">${esc(line)}</span>` : ''}${tests}${d ? `<a class="more" href="/dogs/${attr(d.slug)}">View profile</a>` : ''}</article></div>`;
  };
  const cards = [card('dam'), card('sire')].filter(Boolean);
  return cards.length ? `<div class="parents${cards.length === 1 ? ' one' : ''}">${cards.join('')}</div>` : '';
}

// The litter's facts on its page: its card's (deposits, going home, prices), less
// the birth date, which heads the page. Its puppies, which have their own cards
// below, are counted by sex under Going home ("2 girls, 1 boy").
export function litterFacts(snap, l, ctx) {
  const P = rulesOf(snap).price;
  const rows = [];
  for (const [k, v] of litterRows(snap, l, ctx)) {
    if (!v || k === 'Born' || k === 'Puppies') continue;
    rows.push([k, v]);
    if (k === 'Going home' && l.puppies.length) rows.push(['Puppies', counts(l.puppies)]);
  }
  // No going-home date yet: the count goes before the prices.
  if (l.puppies.length && !rows.some(([k]) => k === 'Puppies')) {
    const at = rows.findIndex(([k]) => k === P.price_label || k === P.deposit_label);
    rows.splice(at < 0 ? rows.length : at, 0, ['Puppies', counts(l.puppies)]);
  }
  return rows.length ? `<div class="litter litter-facts">${kvList(rows)}</div>` : '';
}

export function litterCard(snap, l, ctx, { link = true } = {}) {
  const parent = (role) => parentPhoto(snap, l, role);
  const ahead = depositsAhead(snap, l, ctx.today);
  const older = pastReady(snap, l, ctx.today);
  const eyebrow = l.stage === 'planned' ? (l.plan_label || 'Planned litter') : l.stage === 'past' ? 'Past litter' : ahead ? 'Coming up' : older ? 'Older puppies' : 'Current litter';
  const rows = litterRows(snap, l, ctx);
  const more = !link ? '' : l.stage === 'planned'
    ? (pageOn(snap, 'waitlist', ctx) ? '<a class="more" href="/waitlist">See the waitlist</a>' : '')
    : `<a class="more" href="/litters/${attr(l.slug)}">Meet the puppies</a>`;
  return `<article class="litter"><span class="eyebrow">${esc(eyebrow)}</span>
    <div class="pair">${parent('dam')}<span class="x">×</span>${parent('sire')}<div class="names"><b>${esc(l.name)}</b><span class="small muted">${esc(pairNames(snap, l))}</span></div></div>
    ${kvList(rows)}${l.summary && l.stage === 'planned' ? `<p class="small muted">${esc(l.summary)}</p>` : ''}${more}</article>`;
}

// ---------- flip cards ----------

// sale: { price, ask } for a dog looking for a home (plan 3.7).
export function dogCard(snap, d, { sale = null } = {}) {
  const photo = img(snap, d.photo_id, { alt: d.call_name }) ?? '<div class="ph-photo">Photos coming soon</div>';
  const bg = img(snap, d.photo_id, { alt: '', cls: 'bg', thumb: true }) ?? '';
  const registry = d.registry ? `<li><span>Registry</span><span>${esc(d.registry)}</span></li>` : '';
  const weight = d.weight ? `<li><span>Weight</span><span>${esc(d.weight)}</span></li>` : '';
  // Health results when it has some (its registry and weight above them, where
  // set), else its details.
  const tests = d.health.length
    ? `${registry || weight ? `<ul class="tests">${registry}${weight}</ul>` : ''}<span class="eyebrow">Health testing</span><ul class="tests">${d.health.map((h) => `<li><span>${esc(h.test)}</span><span>${esc(h.result)}</span></li>`).join('')}</ul>`
    : `<span class="eyebrow">Details</span><ul class="tests"><li><span>Sex</span><span>${d.sex === 'female' ? 'Female' : 'Male'}</span></li>${d.color ? `<li><span>Color</span><span>${esc(d.color)}</span></li>` : ''}${weight}${registry}</ul>`;
  const line = [snap.site.breed, d.role].filter(Boolean).join(' · ');
  return `<div class="flip" tabindex="0" role="button" aria-label="${attr(d.call_name)}: turn the card over">
    <div class="flip-in">
      <div class="face front">${photo}<span class="turn" aria-hidden="true">↻</span>
        <div class="cap"><span class="call">${esc(d.call_name)}</span>${d.registered_name ? `<span class="reg">${esc(d.registered_name)}</span>` : ''}<span class="line1"><span>${esc(line)}</span>${d.titles ? `<span>${esc(d.titles)}</span>` : ''}</span></div></div>
      <div class="face back">${bg}<span class="call">${esc(d.call_name)}</span>${d.registered_name ? `<span class="reg">${esc(d.registered_name)}</span>` : ''}
        ${tests}${d.bio ? `<p class="bio">${esc(d.bio)}</p>` : ''}${sale ? `${sale.price ? `<p class="small">${esc(sale.price)}</p>` : ''}<a class="more" href="${attr(sale.ask)}">Ask about ${esc(d.call_name)}</a>` : ''}<a class="more" href="/dogs/${attr(d.slug)}">View profile</a></div>
    </div></div>`;
}

// A co-owned dog living with a co-owner (docs/Co_Owned_Dogs_Plan.md): a light
// card, no flip, for the Co-owned section's slider. It opens the dog's page.
export function coCard(snap, d) {
  const photo = img(snap, d.photo_id, { alt: d.call_name, thumb: true }) ?? '<div class="ph-photo">Photo coming soon</div>';
  const k = partnerOf(snap, d.lives_with_kennel_id);
  const line = [d.sex === 'female' ? 'Female' : 'Male', d.role].filter(Boolean).join(' · ');
  return `<a class="cocard" href="/dogs/${attr(d.slug)}">${photo}<span class="cobody"><span class="call">${esc(d.call_name)}</span><span class="small muted">${esc(line)}</span>
    <span class="cowith">${k ? `${partnerLogo(snap, k)}<span>with ${esc(k.name)}</span>` : '<span>Lives with a partner kennel</span>'}</span></span></a>`;
}

// A litter with "Families can ask about full registration" on (its own setting):
// each of its undecided puppies (no registration set: she'd sell it either way)
// links to the contact form with it filled in, and so does the litter while it has
// one. Only for statuses whose rule allows it (today all but staying: a puppy
// staying here is for no one), and only while the contact page is on.
const undecided = (snap, p) => !p.registration && statusRule(snap, p).fullreg;

// What a puppy's Registration line says, in the site's words. A puppy she hasn't
// settled reads **Limited** by default, like the limited puppy it will almost
// certainly be, and is priced that way (content/prices.js): a blank line told a
// family nothing, and a range to full read as a higher price they might have to
// pay. She can still be asked about full registration, where the litter's tick
// allows it, and the surcharge shows under that link. A puppy of a status that
// can't be asked about it (staying, by default) says nothing.
export function regText(snap, p) {
  const R = rulesOf(snap).reg;
  if (p.registration) return R[p.registration] ?? null;
  return undecided(snap, p) ? R.unset || null : null;
}
export function fullRegHref(snap, l, p, ctx) {
  if (!l.ask_full_reg || !pageOn(snap, 'contact', ctx)) return null;
  if (p ? !undecided(snap, p) : !l.puppies.some((x) => undecided(snap, x))) return null;
  return `/contact?full-reg=${encodeURIComponent(l.slug)}${p ? `&puppy=${encodeURIComponent(p.slug)}` : ''}#message`;
}
// The litter's full-registration surcharge, shown under those links while its Show
// prices is on: "$500" when the sexes match (or one is blank, meaning the same as
// the other, as with the prices), else "males $500, females $700"; one puppy's by
// its sex. Null when none is set or prices are off.
export function fullRegSurcharge(l, p) {
  if (!l.show_prices) return null;
  const one = (sex) => l[`full_reg_${sex}`] ?? l[`full_reg_${sex === 'female' ? 'male' : 'female'}`] ?? null;
  if (p) return one(p.sex) == null ? null : money(one(p.sex));
  const m = one('male'); const f = one('female');
  if (m == null) return null;
  return m === f ? money(m) : `males ${money(m)}, females ${money(f)}`;
}
const SURCHARGE = 'Full Registration Surcharge';
// Its detail row, under the ask link: the card's list style, or the puppy page's.
export function fullRegSurchargeRow(snap, l, p, ctx, style = 'tests') {
  const v = fullRegHref(snap, l, p, ctx) && fullRegSurcharge(l, p);
  if (!v) return '';
  return style === 'kv' ? `<dl class="kv"><dt>${SURCHARGE}</dt><dd>${esc(v)}</dd></dl>`
    : `<ul class="tests"><li><span>${SURCHARGE}</span><span>${esc(v)}</span></li></ul>`;
}

export function fullRegLink(snap, l, p, ctx, cls) {
  const href = fullRegHref(snap, l, p, ctx);
  return href ? `<a class="${cls}" href="${attr(href)}">${esc(rulesOf(snap).reg.ask)}</a>` : '';
}

// The contact form's About line from a full-registration link, made from the
// snapshot (never from the address's own words): null when it names nothing shown.
export function fullRegTopic(snap, ctx, params) {
  const l = snap.litters.find((x) => x.slug === params.get('full-reg'));
  if (!l || !fullRegHref(snap, l, null, ctx)) return null;
  const p = params.get('puppy') ? l.puppies.find((x) => x.slug === params.get('puppy')) : null;
  if (p && !fullRegHref(snap, l, p, ctx)) return null;
  return `Full registration: ${p ? `${p.name}, ` : ''}${l.name}`.slice(0, 80);
}

export function puppyCard(snap, l, p, ctx) {
  const photo = img(snap, p.photo_id, { alt: p.name }) ?? '<div class="ph-photo">Photos coming soon</div>';
  const bg = img(snap, p.photo_id, { alt: '', cls: 'bg', thumb: true }) ?? '';
  const sex = p.sex === 'female' ? 'Female' : 'Male';
  const rule = statusRule(snap, p);
  const status = puppyStatus(snap, l, p, ctx.today);
  const price = puppyPriceText(snap, l, p);
  const priceLabel = rulesOf(snap).price.price_label;
  const reg = [l.name, p.collar].filter(Boolean).join(' · ');
  const regWord = regText(snap, p);
  const action = (rule.ask
    ? (pageOn(snap, 'waitlist', ctx) ? '<a class="more" href="/waitlist">Ask about this puppy</a>' : '<a class="more" href="/contact">Ask about this puppy</a>')
    : '') + fullRegLink(snap, l, p, ctx, 'more') + fullRegSurchargeRow(snap, l, p, ctx);
  // Its own page, whatever its status, the way a dog card links to its profile. Only
  // with the Puppies page on, which the puppy route needs (render/index.js): the
  // Older puppies page can be on with Puppies off, and this must not go nowhere.
  const profile = snap.pages.litters.enabled
    ? `<a class="more" href="/litters/${attr(l.slug)}/${attr(p.slug)}">View profile</a>` : '';
  return `<div class="flip" tabindex="0" role="button" aria-label="${attr(p.name)}: turn the card over">
    <div class="flip-in">
      <div class="face front">${rule.ribbon && status ? `<span class="ribbon">${esc(status)}</span>` : ''}${photo}<span class="turn" aria-hidden="true">↻</span>
        <div class="cap"><span class="call">${esc(p.name)}</span><span class="reg">${esc(reg)}</span><span class="line1"><span>${esc([sex, p.color].filter(Boolean).join(' · '))}</span><span class="status ${attr(rule.pill)}">${esc(status)}</span></span></div></div>
      <div class="face back">${bg}<span class="call">${esc(p.name)}</span><span class="reg">${esc(reg)}</span>
        <span class="eyebrow">Details</span><ul class="tests"><li><span>Sex</span><span>${sex}</span></li>${p.color ? `<li><span>Color</span><span>${esc(p.color)}</span></li>` : ''}<li><span>Status</span><span>${esc(status)}</span></li>${regWord ? `<li><span>Registration</span><span>${esc(regWord)}</span></li>` : ''}${p.registry ? `<li><span>Registry</span><span>${esc(p.registry)}</span></li>` : ''}${price ? `<li><span>${esc(priceLabel)}</span><span>${esc(price)}</span></li>` : ''}</ul>
        ${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ''}${action}${profile}</div>
    </div></div>`;
}

// A gallery of photos with the lightbox the template's site.js drives (an album's
// photos, a puppy's tagged ones). `altBase` names the set for photos with no alt
// of their own. Empty when there are none, so the caller can leave the block out.
export function galleryHtml(snap, ids = [], altBase = '') {
  const items = ids.map((id, i) => {
    const p = snap.photos[id];
    if (!p) return '';
    return `<a class="gal-item" href="/_kp/p/${attr(encodeURIComponent(id))}" data-gallery${p.width ? ` data-w="${p.width}" data-h="${p.height}"` : ''}>${img(snap, id, { thumb: true, alt: p.alt || `${altBase}, photo ${i + 1}` })}</a>`;
  }).join('');
  return items ? `<div class="gallery">${items}</div>` : '';
}

// Where the rest of an album's photos live (her Google Photos or Shutterfly share,
// any third-party address): right under the album, opening in a new tab like any
// address off the site. The arrow comes from `.more` in the template's CSS, so the
// words don't carry one. Empty when she set none.
export function morePhotosHtml(a) {
  return a?.more_photos_url
    ? `<p class="center mt-20"><a class="more" href="${attr(a.more_photos_url)}" target="_blank" rel="noopener noreferrer">See more photos</a></p>` : '';
}

// The viewer the gallery opens into: one per page, whatever galleries it holds.
export const viewerHtml = () => '<dialog class="viewer" id="viewer" aria-label="Photo viewer"><img alt=""><button type="button" class="v-prev" aria-label="Previous photo">\u2039</button><button type="button" class="v-next" aria-label="Next photo">\u203a</button><button type="button" class="v-close" aria-label="Close">\u00d7</button><span class="v-count small"></span></dialog>';

// ---------- other blocks ----------

export function slider(items, { cls = '', ctl = '' } = {}) {
  return `<div class="slider" data-slider><div class="track${cls ? ` ${cls}` : ''}">${items.join('')}</div>
    <div class="slider-ctl">${ctl || '<span></span>'}<div class="arrows"><span class="count"></span><button class="arrow prev" type="button" aria-label="Previous">←</button><button class="arrow next" type="button" aria-label="Next">→</button></div></div></div>`;
}

export function reviewCard(snap, r) {
  const stars = r.rating ? `<span class="stars" aria-label="${r.rating} stars">${'★'.repeat(r.rating)}</span>` : '';
  const who = [r.first_name, r.town].filter(Boolean).join(', ');
  const sub = r.puppy_name ? `${r.puppy_name}'s family${r.home_month ? `, home ${fmtMonth(r.home_month)}` : ''}` : `${snap.site.monogram || snap.site.kennel_name} family`;
  const photo = img(snap, r.photo_id, { alt: '', thumb: true }) ?? '';
  return `<article class="review"${r.topic ? ` data-topic="${attr(r.topic)}"` : ''}>${stars}<blockquote>${esc(r.quote)}</blockquote><div class="who">${photo}<div><b>${esc(who)}</b><div class="muted small">${esc(sub)}</div></div></div></article>`;
}

export const expanders = (rows) => rows.map((e) => `<details class="x"${e.start_open ? ' open' : ''}><summary>${esc(e.heading)}</summary><div class="body">${paras(e.body)}</div></details>`).join('');

// A question from the FAQ she has also put on this kind of page (plan 3.9, 3.12):
// the same question, drawn the same way, at the top of the page. Her first use was
// the difference between limited and full registration, at the top of every
// litter's page, where a family meets a price. The FAQ page keeps showing all of
// them, and a placed question shows whether or not that page is on, since it is
// the question she wants read here, not a link to somewhere else.
export const placedFaqs = (snap, place) => (snap.expanders?.faq ?? []).filter((e) => (e.places ?? []).includes(place));
export function faqBlock(snap, place) {
  const rows = placedFaqs(snap, place);
  return rows.length ? `<div class="acc">${expanders(rows)}</div>` : '';
}

// Where Family login goes (plan 3.8). Everywhere: KennelOS's sign-in for her
// status page, in a new tab. On a site with the family portal on (ctx.portal,
// from the site row, so no publish is needed): her own /family-login page, which
// asks which of the two the family wants; or the portal itself when she has no
// KennelOS waitlist linked.
export function familyLogin(snap, ctx) {
  const kos = snap.site.family_login;
  if (ctx.portal) return { href: kos ? '/family-login' : '/family', external: false };
  return kos ? { href: kos, external: true } : null;
}

export function pagehead(page, fallback, { ornament = true } = {}) {
  const heading = page?.heading || fallback.heading;
  const eyebrow = page?.eyebrow ?? fallback.eyebrow;
  const lede = page?.lede ?? fallback.lede;
  return `<div class="wrap pagehead">${ornament ? '<svg class="sprig l" aria-hidden="true"><use href="#sprig"/></svg><svg class="sprig r" aria-hidden="true"><use href="#sprig"/></svg>' : ''}${eyebrow ? `<span class="eyebrow">${esc(eyebrow)}</span>` : ''}<h1>${esc(heading)}</h1>${lede ? `<p class="lede">${esc(lede)}</p>` : ''}</div>`;
}

export function head(eyebrow, heading, lede, { ornament = false } = {}) {
  return `<div class="head">${ornament ? '<svg class="sprig l" aria-hidden="true"><use href="#sprig"/></svg><svg class="sprig r" aria-hidden="true"><use href="#sprig"/></svg>' : ''}${eyebrow ? `<span class="eyebrow">${esc(eyebrow)}</span>` : ''}${heading ? `<h2>${esc(heading)}</h2>` : ''}${lede ? `<p class="lede">${esc(lede)}</p>` : ''}</div>`;
}

export const ICONS = {
  shield: '<path d="M16 4l10 4v7c0 7-4.5 11-10 13C10.5 26 6 22 6 15V8z"/><path d="M11.5 16l3 3 6-6"/>',
  home: '<path d="M5 15l11-9 11 9"/><path d="M8 13v13h16V13"/><path d="M13 26v-7h6v7"/>',
  heart: '<path d="M16 27s-10-6.2-10-13a5.5 5.5 0 0110-3.2A5.5 5.5 0 0126 14c0 6.8-10 13-10 13z"/>',
  star: '<path d="M16 4l3.6 7.4 8.1 1.2-5.9 5.7 1.4 8.1L16 22.6l-7.2 3.8 1.4-8.1-5.9-5.7 8.1-1.2z"/>',
  paw: '<circle cx="9" cy="13" r="2.5"/><circle cx="14" cy="8.5" r="2.5"/><circle cx="20" cy="8.5" r="2.5"/><circle cx="25" cy="13" r="2.5"/><path d="M10.5 23c0-4 2.5-7.5 5.5-7.5s5.5 3.5 5.5 7.5c0 2.5-2.5 3.5-5.5 3.5s-5.5-1-5.5-3.5z"/>',
  leaf: '<path d="M7 25C7 13 14 6 26 6c0 12-7 19-19 19z"/><path d="M7 25L19 13"/>',
};

// ---------- how to pay, and the safe-payment notice (plan 3.9) ----------

export const SAFE_NOTICE_TEXT = "We'll never ask you to pay by gift card, wire transfer or into anyone else's account, and we only contact you from the details on this website. If someone asks you to, please tell us.";
const PAY_TITLES = { application_fee: 'Application fee', deposit: 'Puppy deposit' };

// The cards switched on, in order: [kind, content].
export const payCards = (snap) => ['application_fee', 'deposit'].map((k) => [k, snap.payment?.[k]]).filter(([, v]) => v);
// How to pay lives on the waitlist page, so links to it need that page on.
export const payShown = (snap, ctx) => pageOn(snap, 'waitlist', ctx) && payCards(snap).length > 0;
const noticeOn = (snap) => snap.payment?.safe_notice?.enabled ?? true;
const noticeText = (snap) => snap.payment?.safe_notice?.text || SAFE_NOTICE_TEXT;

// "Venmo, Zelle or PayPal": every method on the cards shown.
function methodList(snap) {
  const names = [...new Set(payCards(snap).flatMap(([, c]) => (c.methods ?? []).map(([m]) => m).filter(Boolean)))];
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} or ${names.at(-1)}` : names[0] ?? '';
}

// What a Copy button copies: an email address, an @handle or a phone number in
// the details, if there is one.
function copyable(detail) {
  const m = String(detail ?? '').match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+|@[\w.-]+|\+?\d[\d ().-]{6,}\d/);
  return m ? m[0] : null;
}

function payCard([kind, c]) {
  const methods = (c.methods ?? []).map(([m, d]) => {
    const copy = copyable(d);
    return `<li><span class="m">${esc(m)}</span><span class="d">${esc(d)}</span>${copy ? `<button type="button" class="copy" data-copy="${attr(copy)}" hidden>Copy</button>` : '<span></span>'}</li>`;
  }).join('');
  return `<article class="pay-card">
    <h3>${esc(c.title || PAY_TITLES[kind])}</h3>
    ${c.due_note ? `<p class="pay-when"><b>When:</b> ${esc(c.due_note)}</p>` : ''}
    ${methods ? `<ul class="methods">${methods}</ul>` : ''}
    ${c.note ? `<p class="pay-note"><b>In the note:</b> ${esc(c.note)}</p>` : ''}
    ${c.pay_url ? `<p><a class="btn solid" href="${attr(c.pay_url)}" rel="noopener noreferrer" target="_blank">${esc(c.pay_label || 'Pay online')}</a></p>` : ''}
  </article>`;
}

// The How to pay section of the waitlist page, with the notice under it.
export function paySection(snap) {
  const cards = payCards(snap);
  const notice = noticeOn(snap) ? noticeText(snap) : '';
  if (!cards.length && !notice) return '';
  const heading = cards.length === 2 ? 'Paying your fee and deposit' : cards.length ? `Paying your ${(cards[0][1].title || PAY_TITLES[cards[0][0]]).toLowerCase()}` : 'Paying safely';
  return `<section class="pay" id="how-to-pay" aria-labelledby="pay-h">
    <header class="center"><span class="eyebrow">How to pay</span><h2 id="pay-h">${esc(heading)}</h2>${cards.length ? '<p class="muted">Use any of the ways below. Put the note shown in your payment so we can match it to you.</p>' : ''}</header>
    ${cards.length ? `<div class="pay-grid${cards.length === 1 ? ' one' : ''}">${cards.map(payCard).join('')}</div>` : ''}
    ${notice ? `<p class="pay-safe" role="note">${cards.length ? 'These are our only payment details. ' : ''}${esc(notice)}</p>` : ''}
  </section>`;
}

// The notice on its own (puppy pages): which ways the breeder takes payment, and
// where the details are.
export function safeNotice(snap, ctx) {
  if (!noticeOn(snap)) return '';
  const list = methodList(snap);
  const where = payShown(snap, ctx) ? ` <a href="/waitlist#how-to-pay">How to pay</a>` : '';
  return `<p class="pay-safe" role="note">${list ? `We take payment only by ${esc(list)}${where ? `, to the details under${where}` : ''}. ` : where ? `Our only payment details are under${where}. ` : ''}${esc(noticeText(snap))}</p>`;
}

// ---------- the application form (plan 3.8) ----------

// The litter question offers these: litters still to come or with puppies now,
// by name, then "Any litter". siteforms.js accepts only these.
export const ANY_LITTER = 'Any litter';
export const litterChoices = (snap) => [...snap.litters.filter((l) => l.stage === 'planned' || l.stage === 'current').map((l) => l.name), ANY_LITTER];
// With no questions set up, the form asks this instead.
export const ABOUT_LABEL = 'About your family and the puppy you hope for';

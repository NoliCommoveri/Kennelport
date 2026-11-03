// Pieces of the "ak" template shared by its pages: formatting, photos, cards and
// the menu. Every value from a snapshot passes through esc() (or attr()) here.
import { escapeHtml as esc } from '../lib/html.js';
import { MENU_GROUPS, PAGES } from '../content/model.js';
import { puppyPrice, litterPriceRange, depositRange } from '../content/prices.js';

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
export function priceText(from, to) {
  if (from == null) return '';
  return to != null && to !== from ? `${money(from)}–${money(to)}` : money(from);
}

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
    case 'products': return (snap.products ?? []).length > 0;
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
        const current = snap.litters.some((l) => l.stage === 'current' && !depositsAhead(l, ctx.today));
        const planned = snap.litters.some((l) => l.stage === 'planned' || depositsAhead(l, ctx.today));
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
// nothing.
export const STATUS_TEXT = { available: 'Available', reserved: 'Reserved', placed: 'Spoken for', staying: 'Staying with us', coming_soon: 'Still deciding' };

const isPast = (ymd, today) => Boolean(ymd) && ymd < today;

// A born litter whose deposits date is still ahead (plan 5.3): it sits under
// Coming up, and its Available puppies read "Available on <date>". The site moves
// it on the day, from the published snapshot.
export const depositsAhead = (l, today) => l.stage === 'current' && Boolean(l.deposits_on) && l.deposits_on > today;

// What a puppy's status says, on its card and page.
export function puppyStatus(l, p, today) {
  if (p.status === 'available' && depositsAhead(l, today)) return `Available on ${fmtDay(l.deposits_on)}`;
  return STATUS_TEXT[p.status] ?? '';
}

// A puppy's price line: only an Available one, and only with the litter's Show
// prices on (plan 3.2). Reserved, placed, staying and still-deciding puppies show
// none.
export function puppyPriceText(l, p) {
  if (p.status !== 'available') return '';
  if (!l.show_prices) return 'Contact us for pricing';
  const r = puppyPrice(l, p);
  return r ? priceText(r.from, r.to) : '';
}

// The litter's own price rows: a range across its sexes, and the deposit.
export function litterPriceRows(l) {
  if (l.stage === 'past') return [];
  if (!l.show_prices) return [['Price', 'Contact us for pricing']];
  const r = litterPriceRange(l);
  const d = depositRange(l);
  return [['Price', r && priceText(r.from, r.to)], ['Deposit', d && priceText(d.from, d.to)]];
}

// The Dogs page's groups (plan 3.7), from each dog's status: the breeding dogs
// (girls and boys), young stock she has kept, and adults looking for a home.
// Retired and in-memory dogs wait for their pages (backlog).
export function dogGroups(snap) {
  const home = snap.dogs.filter((d) => d.status === 'active');
  return {
    breeding: home.filter((d) => !d.upcoming && !d.for_sale),
    upcoming: home.filter((d) => d.upcoming && !d.for_sale),
    for_sale: home.filter((d) => d.for_sale),
  };
}

// Available puppies past their litter's going-home date (plan 3.11).
export function olderPuppies(snap, today) {
  const out = [];
  for (const l of snap.litters) {
    if (l.stage !== 'current' || !isPast(l.ready_on, today) || depositsAhead(l, today)) continue;
    for (const p of l.puppies) if (p.status === 'available') out.push({ litter: l, puppy: p });
  }
  return out;
}

const HELD = ['reserved', 'placed'];
export const sortPuppies = (pups) => [...pups].sort((a, b) => HELD.includes(a.status) - HELD.includes(b.status));

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

export function litterCard(snap, l, ctx, { link = true } = {}) {
  const parent = (role) => {
    const id = l[`${role}_id`];
    const dog = id && snap.dogs.find((d) => d.id === id);
    const name = parentName(snap, l, role);
    return (dog && img(snap, dog.photo_id, { alt: dog.call_name, thumb: true })) || `<span class="ph">${esc(name ? name.slice(0, 1) : '?')}</span>`;
  };
  const ahead = depositsAhead(l, ctx.today);
  const older = l.stage === 'current' && !ahead && isPast(l.ready_on, ctx.today);
  const eyebrow = l.stage === 'planned' ? (l.plan_label || 'Planned litter') : l.stage === 'past' ? 'Past litter' : ahead ? 'Coming up' : older ? 'Older puppies' : 'Current litter';
  const rows = (l.stage === 'planned'
    ? [['Expected', l.expected_label], ['Going home', l.ready_label]]
    : [['Born', fmtDate(l.born_on)], ['Deposits from', ahead ? fmtDate(l.deposits_on) : null], ['Puppies', l.puppies.length ? l.puppies.map((p) => p.name).length <= 2 ? l.puppies.map((p) => p.name).join(', ') : counts(l.puppies) : null],
      ['Going home', older ? 'Ready now' : fmtDate(l.ready_on)]]).concat(litterPriceRows(l));
  const more = !link ? '' : l.stage === 'planned'
    ? (pageOn(snap, 'waitlist', ctx) ? '<a class="more" href="/waitlist">See the waitlist</a>' : '')
    : `<a class="more" href="/litters/${attr(l.slug)}">Meet the puppies</a>`;
  return `<article class="litter"><span class="eyebrow">${esc(eyebrow)}</span>
    <div class="pair">${parent('dam')}<span class="x">×</span>${parent('sire')}<div class="names"><b>${esc(l.name)}</b><span class="small muted">${esc(pairNames(snap, l))}</span></div></div>
    <dl class="kv">${rows.filter(([, v]) => v).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>${l.summary && l.stage === 'planned' ? `<p class="small muted">${esc(l.summary)}</p>` : ''}${more}</article>`;
}

// ---------- flip cards ----------

// sale: { price, ask } for a dog looking for a home (plan 3.7).
export function dogCard(snap, d, { sale = null } = {}) {
  const photo = img(snap, d.photo_id, { alt: d.call_name }) ?? '<div class="ph-photo">Photos coming soon</div>';
  const bg = img(snap, d.photo_id, { alt: '', cls: 'bg', thumb: true }) ?? '';
  const tests = d.health.length
    ? `<span class="eyebrow">Health testing</span><ul class="tests">${d.health.map((h) => `<li><span>${esc(h.test)}</span><span>${esc(h.result)}</span></li>`).join('')}</ul>`
    : `<span class="eyebrow">Details</span><ul class="tests"><li><span>Sex</span><span>${d.sex === 'female' ? 'Female' : 'Male'}</span></li>${d.color ? `<li><span>Color</span><span>${esc(d.color)}</span></li>` : ''}</ul>`;
  const line = [snap.site.breed, d.role].filter(Boolean).join(' · ');
  return `<div class="flip" tabindex="0" role="button" aria-label="${attr(d.call_name)}: turn the card over">
    <div class="flip-in">
      <div class="face front">${photo}<span class="turn" aria-hidden="true">↻</span>
        <div class="cap"><span class="call">${esc(d.call_name)}</span>${d.registered_name ? `<span class="reg">${esc(d.registered_name)}</span>` : ''}<span class="line1"><span>${esc(line)}</span>${d.titles ? `<span>${esc(d.titles)}</span>` : ''}</span></div></div>
      <div class="face back">${bg}<span class="call">${esc(d.call_name)}</span>${d.registered_name ? `<span class="reg">${esc(d.registered_name)}</span>` : ''}
        ${tests}${d.bio ? `<p class="bio">${esc(d.bio)}</p>` : ''}${sale ? `${sale.price ? `<p class="small">${esc(sale.price)}</p>` : ''}<a class="more" href="${attr(sale.ask)}">Ask about ${esc(d.call_name)}</a>` : ''}<a class="more" href="/dogs/${attr(d.slug)}">View profile</a></div>
    </div></div>`;
}

export const REG_WORDS = { limited: 'Limited', full: 'Full' };

// A litter with "Families can ask about full registration" on (its own setting):
// the litter, and each of its puppies planned for Limited, link to the contact
// form with them filled in. Never for a puppy staying here, and only while the
// contact page is on.
export function fullRegHref(snap, l, p, ctx) {
  if (!l.ask_full_reg || !pageOn(snap, 'contact', ctx)) return null;
  if (p && (p.registration !== 'limited' || p.status === 'staying')) return null;
  return `/contact?full-reg=${encodeURIComponent(l.slug)}${p ? `&puppy=${encodeURIComponent(p.slug)}` : ''}#message`;
}
// What full registration adds, shown beside those links: one puppy's (by its sex),
// or the litter's ("$500", or "$500 for a girl, $400 for a boy"). Either sex blank
// means the same as the other, as with the prices. Null when none is set.
export function fullRegAdds(l, p) {
  const one = (sex) => l[`full_reg_${sex}`] ?? l[`full_reg_${sex === 'female' ? 'male' : 'female'}`] ?? null;
  if (p) return one(p.sex) == null ? null : money(one(p.sex));
  const sexes = l.puppies?.length ? [...new Set(l.puppies.map((x) => x.sex))] : ['female', 'male'];
  const each = sexes.map((sex) => [sex, one(sex)]).filter(([, n]) => n != null);
  if (!each.length) return null;
  if (new Set(each.map(([, n]) => n)).size === 1) return money(each[0][1]);
  return each.map(([sex, n]) => `${money(n)} for a ${sex === 'female' ? 'girl' : 'boy'}`).join(', ');
}

export function fullRegLink(snap, l, p, ctx, cls) {
  const href = fullRegHref(snap, l, p, ctx);
  return href ? `<a class="${cls}" href="${attr(href)}">Ask about full registration</a>` : '';
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
  const held = HELD.includes(p.status);
  const status = puppyStatus(l, p, ctx.today);
  const price = puppyPriceText(l, p);
  const reg = [l.name, p.collar].filter(Boolean).join(' · ');
  const regWord = REG_WORDS[p.registration];
  const action = (p.status === 'available'
    ? (pageOn(snap, 'waitlist', ctx) ? '<a class="more" href="/waitlist">Ask about this puppy</a>' : '<a class="more" href="/contact">Ask about this puppy</a>')
    : '') + fullRegLink(snap, l, p, ctx, 'more');
  return `<div class="flip" tabindex="0" role="button" aria-label="${attr(p.name)}: turn the card over">
    <div class="flip-in">
      <div class="face front">${held ? `<span class="ribbon">${esc(status)}</span>` : ''}${photo}<span class="turn" aria-hidden="true">↻</span>
        <div class="cap"><span class="call">${esc(p.name)}</span><span class="reg">${esc(reg)}</span><span class="line1"><span>${esc([sex, p.color].filter(Boolean).join(' · '))}</span><span class="status ${p.status === 'available' ? 'avail' : 'res'}">${esc(status)}</span></span></div></div>
      <div class="face back">${bg}<span class="call">${esc(p.name)}</span><span class="reg">${esc(reg)}</span>
        <span class="eyebrow">Details</span><ul class="tests"><li><span>Sex</span><span>${sex}</span></li>${p.color ? `<li><span>Color</span><span>${esc(p.color)}</span></li>` : ''}<li><span>Status</span><span>${esc(status)}</span></li>${regWord ? `<li><span>Registration</span><span>${regWord}</span></li>` : ''}${fullRegHref(snap, l, p, ctx) && fullRegAdds(l, p) ? `<li><span>Full registration adds</span><span>${esc(fullRegAdds(l, p))}</span></li>` : ''}${price ? `<li><span>Price</span><span>${esc(price)}</span></li>` : ''}</ul>
        ${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ''}${action}</div>
    </div></div>`;
}

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

// The Extras block (content/blocks.js, 2026-11-18): her extras and homegoing
// packages, chosen by the owner's conditions on any page. By default each is a step
// card, as the How it works page draws its steps (the owner's ask): the big brass
// figure where a step has its number (here its price), then its name, her words and a
// "More details" fold. The other styles reuse the template's own pieces: the Extras
// page's package cards, or one expander each (the FAQ's). No new CSS, so the template's
// files are unchanged.
//
// Her description on the website (site_description) shows over KennelOS's; More
// details folds her details and a package's checklist (its line above, the list, its
// closing paragraph). Prices follow "Show prices of extras and adults", as on the
// Extras page.
import { esc, attr, pageOn, pagePath, slider, word, paras, sitePrice, pricesOff } from '../parts.js';

export const descriptionOf = (x) => x.site_description || x.description || '';

// Where "Ask about this" goes: the waitlist while it's on, else the contact page.
const askHref = (snap, ctx) => (pageOn(snap, 'waitlist', ctx) ? '/waitlist' : pagePath(snap, 'contact'));

// An extra's price as words, or '' when it has none; with prices off, the site's
// "Contact us for pricing".
function priceOf(snap, x) {
  if (!snap.site.show_other_prices) return pricesOff(snap);
  return x.price_from != null ? sitePrice(snap, x.price_from, x.price_to) : '';
}

// The big figure: its price (only while prices show), its place in the block, or its weeks.
function bigOf(snap, b, x, i) {
  if (b.show.big === 'number') return String(i + 1);
  if (b.show.big === 'weeks') return x.weeks ? String(x.weeks) : '';
  if (b.show.big === 'price') return snap.site.show_other_prices && x.price_from != null ? sitePrice(snap, x.price_from, x.price_to) : '';
  return '';
}

// What More details holds: her details, then a package's checklist.
function detailsOf(snap, x) {
  const list = x.checklist?.length
    ? `${x.lead_in ? `<p class="small muted lead">${esc(x.lead_in)}</p>` : ''}<ul class="checks">${x.checklist.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>${x.closing ? `<p class="small muted closing">${esc(x.closing)}</p>` : ''}`
    : '';
  return `${x.details ? paras(x.details) : ''}${list}`;
}

// One extra's items, in the block's order. `fold`: More details as a fold (cards), or
// open in place (inside an expander, which is itself the fold).
function itemsOf(snap, ctx, b, x, { fold = true, skip = [] } = {}) {
  const out = [];
  for (const k of b.show.items) {
    if (skip.includes(k)) continue;
    if (k === 'group' && x.grp) out.push(`<span class="eyebrow">${esc(x.grp)}</span>`);
    if (k === 'name') out.push(`<h3>${esc(x.name)}</h3>`);
    if (k === 'weeks' && x.weeks) out.push(`<p class="small muted"><b>${x.weeks}</b> ${esc(word(snap, 'weeks'))}${x.featured ? ` · ${esc(word(snap, 'most_complete'))}` : ''}</p>`);
    if (k === 'price') { const p = priceOf(snap, x); if (p) out.push(`<div class="price">${esc(p)}</div>`); }
    if (k === 'description' && descriptionOf(x)) out.push(`<p>${esc(descriptionOf(x))}</p>`);
    if (k === 'details') {
      const d = detailsOf(snap, x);
      if (d) out.push(fold ? `<details class="x"><summary>${esc(word(snap, 'more_details'))}</summary><div class="body">${d}</div></details>` : d);
    }
    if (k === 'ask') out.push(`<a class="more" href="${attr(askHref(snap, ctx))}">${esc(word(snap, x.kind === 'homegoing' ? 'ask_package' : 'ask_item'))}</a>`);
  }
  return out.join('');
}

const stepCard = (snap, ctx, b, x, i) => {
  const big = bigOf(snap, b, x, i);
  return `<article class="step">${big ? `<span class="n">${esc(big)}</span>` : ''}${itemsOf(snap, ctx, b, x)}</article>`;
};

// The Extras page's package card: the big figure in its weeks spot, "most complete" beside it.
const pkgCard = (snap, ctx, b, x, i) => {
  const big = bigOf(snap, b, x, i);
  const tag = b.show.big === 'weeks' ? `${esc(word(snap, 'weeks'))}${x.featured ? ` · ${esc(word(snap, 'most_complete'))}` : ''}` : x.featured ? esc(word(snap, 'most_complete')) : '';
  return `<article class="pkg${x.featured ? ' top' : ''}">${big ? `<div class="weeks"><b>${esc(big)}</b><span>${tag}</span></div>` : ''}${itemsOf(snap, ctx, b, x)}</article>`;
};

// An expander: its name (and the big figure) to tap, the rest inside, More details open.
const expander = (snap, ctx, b, x, i) => {
  const big = bigOf(snap, b, x, i);
  const title = [b.show.big === 'number' ? `${big}.` : '', x.name, b.show.big === 'price' || b.show.big === 'weeks' ? big && `· ${big}${b.show.big === 'weeks' ? ` ${word(snap, 'weeks')}` : ''}` : ''].filter(Boolean).join(' ');
  return `<details class="x"><summary>${esc(title)}</summary><div class="body">${itemsOf(snap, ctx, b, x, { fold: false, skip: ['name'] })}</div></details>`;
};

// The block: its heading and its extras, grouped when the owner groups them.
// `inGroups` and `words` are pages/blocks.js's (headings per group; her words).
export function extrasBlock(snap, ctx, b, key, { list, w, inGroups, head }) {
  if (!list.length) return '';
  let n = 0;
  const draw = (rows) => {
    const at = n;
    n += rows.length;
    if (b.style === 'list') return `<div class="acc">${rows.map((x, i) => expander(snap, ctx, b, x, at + i)).join('')}</div>`;
    if (b.style === 'pkgs') return `<div class="pkgs">${rows.map((x, i) => pkgCard(snap, ctx, b, x, at + i)).join('')}</div>`;
    const cards = rows.map((x, i) => stepCard(snap, ctx, b, x, at + i));
    if (b.style === 'stepgrid') return `<div class="grid">${cards.join('')}</div>`;
    return slider(cards, { cls: 'three', ctl: `<span class="muted small">${esc(word(snap, 'swipe'))}</span>` });
  };
  const top = w.eyebrow || w.heading || w.lede ? head(w.eyebrow, w.heading, w.lede) : '';
  return `<section class="section tight"><div class="wrap">${top}
      ${inGroups(snap, ctx, b, list, draw)}
    </div></section>`;
}

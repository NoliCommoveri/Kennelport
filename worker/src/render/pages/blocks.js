// The site's data blocks (content/blocks.js: Dog cards, Litter cards, Pup cards,
// Reviews), each with its heading and words (hers, or the owner's starting wording),
// its records by its conditions, groups and limit (render/parts.js blockRows), in its
// style. pages.js draws a page's blocks and calls dataBlock for these. Split out of
// pages.js (docs/review/senior-review-2026-11.md, item 7).
import {
  esc, pageOn, litterCard, dogCard, coCard, besideCard, puppyCard, slider, reviewCard, head, dogsFor, blockRows, blockGroups, recordCtx,
  rulesOf, pricesOff, sitePrice, word, addedOn, addedWords,
} from '../parts.js';
import { hersOn, recordsOf } from '../../content/blocks.js';
import { HOME_WORDS } from '../../content/model.js';
import { featuredBlock } from './featured.js';

// A data block's words: hers (home_blocks) for Home's own blocks; for a block the
// owner added, hers (block_switches) over the owner's starting wording.
const blockWords = (snap, b, key) => (hersOn(key, b) ? snap.home[b.id] ?? {} : { ...addedWords(snap, key, b), link_label: null });
const limited = (rows, b) => (b.limit ? rows.slice(0, b.limit) : rows);
// Its heading as typed (hers, or the owner's for a block the owner added): emptied, none;
// never set, today's words (model.js HOME_WORDS).
const blockHead = (key, b, w, dflt) => w.heading ?? dflt;

// An adult looking for a home (plan 3.7): its asking price with Show other prices
// on, and a way to ask.
const askHref = (snap, ctx) => (pageOn(snap, 'contact', ctx) ? '/contact' : '/');
// An adult for sale: its price by the site's rule (today the breeder's "Show prices
// of extras and adults"), and where to ask.
export function saleOf(snap, ctx, d) {
  if (!d.for_sale) return null;
  const rule = rulesOf(snap).dogs?.sale_price ?? 'site';
  const show = rule === 'always' || (rule === 'site' && snap.site.show_other_prices);
  return { price: show ? (d.price != null ? sitePrice(snap, d.price, d.price) : '') : rule === 'never' ? '' : pricesOff(snap), ask: askHref(snap, ctx) };
}

// A block the owner added shows only while the breeder has it on.
export function dataBlock(snap, ctx, b, key) {
  if (!addedOn(snap, key, b)) return '';
  if (b.type === 'dogs') return dogsBlock(snap, ctx, b, key);
  if (b.type === 'litters') return littersBlock(snap, ctx, b, key);
  if (b.type === 'pups') return pupsBlock(snap, ctx, b, key);
  if (b.type === 'reviews') return reviewsBlock(snap, ctx, b, key);
  if (b.type === 'featured_dog' || b.type === 'featured_pup') return featuredBlock(snap, ctx, b, key);
  return '';
}

// A grouped block (content/fields.js, B2): a heading per group over its cards, in the
// block's style; ungrouped, the cards alone. The block's limit counts every card.
function inGroups(snap, ctx, b, list, draw) {
  const groups = blockGroups(snap, b, list, ctx.today);
  if (groups.length === 1 && !groups[0].heading) return draw(list);
  return groups.map((g, i) => `<div class="head${i ? ' mt-26' : ''}"><h3>${esc(g.heading)}</h3></div>${draw(g.rows)}`).join(`\n      `);
}

function dogsBlock(snap, ctx, b, key = 'home') {
  const list = limited(dogsFor(snap, b, ctx.today, key), b);
  if (!list.length) return '';
  const w = blockWords(snap, b, key);
  const ctl = pageOn(snap, 'dogs', ctx) ? `<a class="more" href="/dogs">${esc(w.link_label || 'See all our dogs')}</a>` : '';
  const card = (d) => dogCard(snap, d, { sale: saleOf(snap, ctx, d), show: b.show });
  // lines: a 4px accent line between cards where they stack (site.css .lines).
  const lines = b.lines ? ' lines' : '';
  const grouped = recordsOf(b).group;
  // Grouped, the See all link goes once, under the last group.
  const more = ctl ? `<p class="center mt-26">${ctl}</p>` : '';
  const draw = (rows) => (b.style === 'light' ? slider(rows.map((d) => coCard(snap, d, { show: b.show })), { cls: 'light', ctl: grouped ? '' : ctl })
    : b.style === 'flip' ? `<div class="grid${rows.length === 1 ? ' narrow-grid' : ''}${lines}">${rows.map(card).join('')}</div>`
      : b.style === 'beside' ? `<div class="dogrows${rows.length === 1 ? ' one' : ''}${lines}">${rows.map((d) => besideCard(snap, d, { sale: saleOf(snap, ctx, d), show: b.show })).join('')}</div>`
        : slider(rows.map(card), { ctl: grouped ? '' : ctl }));
  const body = inGroups(snap, ctx, b, list, draw) + (grouped || b.style === 'flip' || b.style === 'beside' ? more : '');
  return `<section class="section"><div class="wrap">
      ${head(w.eyebrow ?? HOME_WORDS.dogs.eyebrow, blockHead(key, b, w, HOME_WORDS.dogs.heading), w.lede, { ornament: true })}
      ${body}
    </div></section>`;
}

function littersBlock(snap, ctx, b, key = 'home') {
  const list = limited(blockRows(snap, b, ctx.today, key), b);
  if (!list.length) return '';
  const w = blockWords(snap, b, key);
  return `<section class="section band"><div class="wrap">
      ${head(w.eyebrow ?? HOME_WORDS.litters.eyebrow, blockHead(key, b, w, HOME_WORDS.litters.heading))}
      ${inGroups(snap, ctx, b, list, (rows) => `<div class="litters">${rows.map((l) => litterCard(snap, l, ctx, { show: b.show })).join('')}</div>`)}
      <p class="center mt-26"><a class="btn line" href="/litters">${esc(w.link_label || 'View all puppies')}</a></p>
    </div></section>`;
}

// Pup cards (the owner's, kennelos-contract.md step 2): the pups its conditions hold
// for, as flip cards in a grid (the Puppies page's own cards), each with its litter.
function pupsBlock(snap, ctx, b, key = 'home') {
  const list = limited(blockRows(snap, b, ctx.today, key), b);
  if (!list.length) return '';
  const w = blockWords(snap, b, key);
  const rc = recordCtx(snap, ctx.today);
  const draw = (rows) => `<div class="grid${rows.length === 1 ? ' narrow-grid' : ''}">${rows.map((p) => puppyCard(snap, rc.litterOf(p), p, ctx)).join('')}</div>`;
  const ctl = pageOn(snap, 'litters', ctx) ? `<p class="center mt-26"><a class="btn line" href="/litters">${esc(w.link_label || 'View all puppies')}</a></p>` : '';
  return `<section class="section"><div class="wrap">
      ${head(w.eyebrow ?? 'Puppies', blockHead(key, b, w, 'Available puppies'), w.lede)}
      ${inGroups(snap, ctx, b, list, draw)}
      <p class="flip-hint">${esc(word(snap, 'flip_hint'))}</p>${ctl}
    </div></section>`;
}

function reviewsBlock(snap, ctx, b, key = 'home') {
  const list = limited(snap.reviews, b);
  if (!list.length) return '';
  const w = blockWords(snap, b, key);
  const ctl = pageOn(snap, 'reviews', ctx) ? `<a class="more" href="/reviews">${esc(w.link_label || 'All reviews')}</a>` : '';
  const cards = list.map((r) => reviewCard(snap, r, { show: b.show }));
  return `<section class="section"><div class="wrap">
      ${head(w.eyebrow ?? HOME_WORDS.reviews.eyebrow, blockHead(key, b, w, HOME_WORDS.reviews.heading))}
      ${b.style === 'grid' ? `<div class="grid">${cards.join('')}</div>${ctl ? `<p class="center mt-26">${ctl}</p>` : ''}` : slider(cards, { cls: 'three', ctl })}
    </div></section>`;
}

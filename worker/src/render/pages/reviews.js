// Reviews (/reviews): the families' reviews, and the form to send one (pages/formParts.js reviewForm). Routed by render/index.js;
// the page frame it shares is in render/pages.js.
import { esc, attr, label, reviewCard, pagehead } from '../parts.js';
import { reviewForm } from './formParts.js';
import { PAGE_HEADS } from '../../content/blocks.js';
import { assemble } from '../pages.js';

export function reviews(snap, ctx) {
  const p = snap.pages.reviews;
  const topics = [...new Set(snap.reviews.map((r) => r.topic).filter(Boolean))];
  const filter = topics.length > 1 ? `<div class="filter"><label for="review-topic">Show</label><select id="review-topic"><option value="all">All reviews</option>${topics.map((t) => `<option value="${attr(t)}">${esc(t[0].toUpperCase() + t.slice(1))}</option>`).join('')}</select></div>` : '';
  return {
    title: snap.pages.reviews.heading || label(snap, 'reviews'), section: '/reviews', description: p.lede,
    body: assemble(snap, ctx, 'reviews', {
      head: pagehead(p, PAGE_HEADS.reviews),
      list: `<section class="section tight"><div class="wrap">${filter}${snap.reviews.length ? `<div class="grid" id="all-reviews">${snap.reviews.map((r) => reviewCard(snap, r)).join('')}</div>` : ''}
      ${reviewForm(snap, ctx)}</div></section>`,
    }),
  };
}

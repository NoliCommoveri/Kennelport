// The Cards block (content/blocks.js cards, 2026-11-18): the owner's free cards, each
// any of a photo, a big figure, labels, a heading, words and a button. Drawn as the
// portal prototype's photo-top card (`.pcard`, docs/reference/portal-prototype.html,
// Photo-top cards) in the site's surface and corners, with a step's brass figure
// (`.step .n`) and the site's pills (`.status`, in the site's pill style). Side by side
// in a grid, or in the template's slider. A button to a document opens the PDF in a new
// tab and says its size. render/pages.js ownBlock calls this.
import { esc, attr, img, paras, slider, pillClass, zoomed } from '../parts.js';
import { docSize } from '../../documents.js';

// `linkFor` and `aTo` are pages.js's (where a button goes; the link itself).
export function cardsBlock(snap, ctx, b, w, { linkFor, aTo }) {
  const card = (c) => {
    // Opening full size, the photo is something to read (a flyer): its own description first.
    const pic = c.photo ? img(snap, c.photo, { alt: (b.zoom && snap.photos[c.photo]?.alt) || c.heading || '' }) : null;
    const photo = pic && b.zoom ? zoomed(c.photo, pic, `b-${b.id}`) : pic;
    const link = c.link && c.button ? linkFor(snap, ctx, c.link) : null;
    const labels = c.labels.length ? `<span class="line1 tags">${c.labels.map((l) => `<span class="${pillClass(b.pill)}">${esc(l)}</span>`).join('')}</span>` : '';
    const body = [
      c.big && `<span class="n">${esc(c.big)}</span>`,
      labels,
      c.heading && `<h3>${esc(c.heading)}</h3>`,
      c.text && `<div class="words">${paras(c.text)}</div>`,
      link && `<div class="go">${aTo(link, 'btn line sz-s', c.button)}${link.doc ? `<span class="small muted">PDF · ${esc(docSize(link.doc.bytes))}</span>` : ''}</div>`,
    ].filter(Boolean).join('');
    if (!photo && !body) return '';
    return `<article class="own-card">${photo ? `<div class="ph">${photo}</div>` : ''}${body ? `<div class="body">${body}</div>` : ''}</article>`;
  };
  const cards = b.cards.map(card).filter(Boolean);
  if (!cards.length) return '';
  const top = w.heading || w.line ? `<div class="head">${w.heading ? `<h2>${esc(w.heading)}</h2>` : ''}${w.line ? `<p class="lede">${esc(w.line)}</p>` : ''}</div>` : '';
  const list = b.style === 'slider' ? slider(cards, { cls: b.across === '3' ? 'three' : b.across === '2' ? 'two' : '' }) : `<div class="own-cardgrid n-${b.across}">${cards.join('')}</div>`;
  return `<section class="section tight own-cards a-${b.align} shape-${b.shape}"><div class="wrap">${top}${list}</div></section>`;
}

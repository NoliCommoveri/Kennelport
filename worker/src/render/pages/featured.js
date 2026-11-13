// A Featured block (docs/plans/kennelos-contract.md B5): one dog or pup at a time
// (or the owner's number), large: its photo beside its name, the items the owner
// chose and a link to its own page, turning over by its schedule (content/featured.js)
// with no publish needed. Its records are the breeder's picks, else the owner's
// conditions (render/parts.js blockRows).
//
// No prototype screen exists for it: it is the prototype's photo-beside-words (the
// Home story's grid, .story) under the block's heading, the photo in a soft mat. With
// two or three at once, every other one has its photo on the right on a computer.
import {
  esc, attr, img, head, pageOn, dogFace, sexWord, puppyStatus, puppyPriceText, statusRule, pairNames, recordCtx, rulesOf, blockRows, addedWords, word, tagPills, pillClass,
} from '../parts.js';
import { featuredNow } from '../../content/featured.js';
import { framed } from '../pages.js';
import { saleOf } from './blocks.js';

const profileOf = (snap, ctx, b, x, rc) => {
  if (b.type === 'featured_dog') return `/dogs/${attr(x.slug)}`;
  const l = rc.litterOf(x);
  return l && snap.pages.litters?.enabled ? `/litters/${attr(l.slug)}/${attr(x.slug)}` : null;
};

function pupLines(snap, ctx, b, p, rc) {
  const l = rc.litterOf(p);
  const status = puppyStatus(snap, l, p, ctx.today);
  const price = puppyPriceText(snap, l, p, ctx.today);
  const rule = statusRule(snap, p, l, ctx.today);
  const items = {
    line: () => `<span>${esc([sexWord(p.sex), p.color].filter(Boolean).join(' · '))}</span>`,
    status: () => (status ? `<span class="${pillClass(rule.pill)}">${esc(status)}</span>` : ''),
    litter: () => (l ? `<span class="small muted">${esc([l.name, pairNames(snap, l)].filter(Boolean).join(' · '))}</span>` : ''),
    price: () => (price ? `<span class="small">${esc(rulesOf(snap).price.price_label)}: ${esc(price)}</span>` : ''),
    bio: () => (p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ''),
    tags: () => tagPills(snap, 'puppy', p, rc),
  };
  return b.show.items.map((k) => items[k]?.() ?? '').join('');
}

export function featuredBlock(snap, ctx, b, key) {
  const rc = recordCtx(snap, ctx.today);
  const picks = snap.picks?.[key]?.[b.id];
  const now = featuredNow(blockRows(snap, b, ctx.today, key), b.sched, picks?.fixed ?? [], `${snap.site.id ?? ''}/${key}/${b.id}`, ctx.today);
  if (!now.length) return '';
  const w = addedWords(snap, key, b);
  const dog = b.type === 'featured_dog';
  const one = (x, i) => {
    const name = dog ? x.call_name : x.name;
    const pic = framed(img(snap, x.photo_id, { alt: name }) ?? '', 'mat');
    const href = profileOf(snap, ctx, b, x, rc);
    const lines = dog ? dogFace(snap, x, b.show.items, { sale: saleOf(snap, ctx, x) }) : pupLines(snap, ctx, b, x, rc);
    const more = href && (dog || pageOn(snap, 'litters', ctx)) ? `<div><a class="btn solid" href="${href}">${esc(word(snap, 'featured_meet', { name }))}</a></div>` : '';
    return `<div class="wrap story${pic ? (i % 2 ? ' pic-right' : '') : ' no-photo'}${i ? ' mt-26' : ''}">${pic}<div class="story-copy">
        <h2>${esc(name)}</h2>${lines}${more}</div></div>`;
  };
  return `<section class="section band own-featured"><div class="wrap">${head(w.eyebrow, w.heading, w.lede)}</div>
      ${now.map(one).join('\n      ')}
    </section>`;
}

// A puppy's own page (/litters/<litter>/<puppy>, routed by render/index.js): its
// photo, status, facts in the owner's order (content/blocks.js PROFILE_* for
// `puppy`), its ask and full-registration links, its own photos and its litter's
// albums. Its status reads by its litter and the day, so an available pup whose
// deposits don't open yet reads by the not_open row (render/parts.js statusRule).
// The page frame and the parts shared with the dog's page are in render/pages.js.
import {
  esc, attr, fmtDate, img, pageOn, pairNames, head, faqBlock, safeNotice, puppyStatus, puppyPriceText, regText, statusRule, rulesOf, word, sexWord,
  fullRegLink, fullRegSurchargeRow, galleryHtml, viewerHtml, morePhotosHtml,
  pillClass,
} from '../parts.js';
import { profileFor, profileBody, shareRow, badgeRow } from '../pages.js';
import { litterAlbums } from './albumLists.js';

export function puppy(snap, ctx, litterSlug, slug) {
  const l = snap.litters.find((x) => x.slug === litterSlug);
  const p = l?.puppies.find((x) => x.slug === slug);
  if (!p) return null;
  const pr = profileFor(snap, 'puppy');
  const photo = img(snap, p.photo_id, { alt: p.name, cls: 'photo', lazy: false }) ?? '<div class="photo" aria-hidden="true"></div>';
  const rule = statusRule(snap, p, l, ctx.today);
  const status = puppyStatus(snap, l, p, ctx.today);
  const price = puppyPriceText(snap, l, p, ctx.today);
  const reg = regText(snap, p, l, ctx.today);
  const fact = { sex: ['Sex', sexWord(p.sex)], color: ['Color', p.color], collar: ['Collar', p.collar], status: ['Status', status], price: [rulesOf(snap).price.price_label, price], registration: ['Registration', reg], registry: ['Registry', p.registry], parents: ['Parents', pairNames(snap, l)], born: ['Born', fmtDate(l.born_on)] };
  const facts = pr.facts.map((k) => fact[k]).filter(([, v]) => v);
  // Its own photos, where the litter publishes its puppies' tagged ones, and its own
  // "See more photos" link where she set one (its gallery elsewhere, never the
  // litter's). Either alone is enough for the block. Then the litter's albums: its
  // photos are usually in those too.
  const gallery = galleryHtml(snap, p.photos ?? [], p.name);
  const morePup = morePhotosHtml(p);
  const pupGallery = (gallery || morePup) && Object.values(pr.parts).some((x) => x.includes('photos'))
    ? `<div class="mt-26">${head('Photos', `${p.name}'s photos`)}${gallery}${morePup}</div>` : '';
  return {
    title: `${p.name}, ${l.name}`, section: '/litters', description: p.bio || `${p.name}: ${status}`, image: p.photo_id,
    body: `${profileBody(pr, {
      faq: faqBlock(snap, 'puppy'),
      status: status ? `<span class="${pillClass(rule.pill)}">${esc(status)}</span>` : '',
      name: `<h1>${esc(p.name)}</h1>`,
      facts: `<dl class="kv">${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`,
      bio: p.bio ? `<p class="bio">${esc(p.bio)}</p>` : '',
      ask: rule.ask || fullRegLink(snap, l, p, ctx, '') ? `<p>${rule.ask ? `<a class="btn solid" href="${pageOn(snap, 'waitlist', ctx) ? '/waitlist' : '/contact'}">${esc(word(snap, 'ask_pup', { name: p.name }))}</a> ` : ''}${fullRegLink(snap, l, p, ctx, 'btn line')}</p>` : '',
      surcharge: fullRegSurchargeRow(snap, l, p, ctx, 'kv'),
      notice: safeNotice(snap, ctx),
      share: shareRow(),
      badges: badgeRow(snap, 'puppy', { inWrap: true }),
      photos: pupGallery,
      albums: litterAlbums(snap, ctx, l, { eyebrow: 'Albums', heading: `From ${l.name}` }),
    }, { crumb: `<p class="breadcrumb"><a href="/litters/${attr(l.slug)}">${esc(l.name)}</a></p>`, photo, spaced: new Set(['badges', 'photos', 'albums']) })}${pupGallery ? viewerHtml() : ''}`,
  };
}

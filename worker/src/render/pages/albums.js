// The Albums page (/albums) and an album's own page (/albums/<slug>): photos in a
// grid with the viewer, each album's embeds and a Share button. Routed by
// render/index.js; the page frame it shares is in render/pages.js, the album cards in
// pages/albumLists.js. Each photo is a link to its full size; the template's script
// turns the set into a viewer with previous and next (without it, the link opens
// the picture).
import { label, pagehead, esc, attr, galleryHtml, viewerHtml, morePhotosHtml } from '../parts.js';
import { albumCard } from './albumLists.js';
import { PAGE_HEADS } from '../../content/blocks.js';
import { assemble, shareRow, embedsBlock } from '../pages.js';

export function albums(snap, ctx) {
  const p = snap.pages.albums;
  return {
    title: p.heading || label(snap, 'albums'), section: '/litters', description: p.lede, image: snap.albums[0]?.cover_photo_id,
    body: assemble(snap, ctx, 'albums', {
      head: pagehead(p, PAGE_HEADS.albums),
      list: `<section class="section tight"><div class="wrap"><div class="albums">${snap.albums.map((a) => albumCard(snap, a)).join('')}</div></div></section>`,
    }),
  };
}

export function album(snap, ctx, slug) {
  const a = (snap.albums ?? []).find((x) => x.slug === slug);
  if (!a) return null;
  const l = a.litter_id && snap.litters.find((x) => x.id === a.litter_id);
  return {
    title: a.title, section: '/litters', description: a.description || `${a.photos.length} photos from ${snap.site.kennel_name}`, image: a.cover_photo_id,
    body: `${pagehead({}, { eyebrow: l ? l.name : 'Photo album', heading: a.title, lede: a.description })}
      <section class="section tight"><div class="wrap">
        <p class="breadcrumb center">${l && snap.pages.litters.enabled ? `<a href="/litters/${attr(l.slug)}">${esc(l.name)}</a> · ` : ''}<a href="/albums">${esc(label(snap, 'albums'))}</a></p>
        ${galleryHtml(snap, a.photos, a.title)}${morePhotosHtml(a)}${shareRow(true)}
        ${embedsBlock(snap, `album:${a.id}`, { inWrap: true })}
      </div></section>
      ${viewerHtml()}`,
  };
}

// Album lists on a site's pages: an album's card, and the albums of a litter or a
// dog, for their pages and a puppy's (render/pages.js, pages/puppy.js). The Albums
// page and an album's own page are in pages/albums.js.
import { esc, attr, img, pageOn, head } from '../parts.js';

export function albumCard(snap, a) {
  const cover = img(snap, a.cover_photo_id, { alt: '', thumb: true }) ?? '<div class="ph-photo" aria-hidden="true"></div>';
  return `<a class="album-card" href="/albums/${attr(a.slug)}">${cover}<span class="album-meta"><b>${esc(a.title)}</b><span class="small muted">${a.photos.length} photo${a.photos.length === 1 ? '' : 's'}</span></span></a>`;
}

// A litter's albums, under its card on the litter's page.
// Its albums, on the litter's page under "Photos". A puppy's page names the litter
// instead, so it doesn't read "Photos" twice above its own photos.
export function litterAlbums(snap, ctx, l, { eyebrow = 'Photos', heading = null } = {}) {
  const list = pageOn(snap, 'albums', ctx) ? (snap.albums ?? []).filter((a) => a.litter_id === l.id) : [];
  return list.length ? `<div class="mt-26">${head(eyebrow, heading)}<div class="albums">${list.map((a) => albumCard(snap, a)).join('')}</div></div>` : '';
}

// Every album with a photo she tagged as this dog, at the foot of the dog's page.
export function dogAlbums(snap, ctx, d) {
  const list = pageOn(snap, 'albums', ctx) ? (snap.albums ?? []).filter((a) => (a.dog_ids ?? []).includes(d.id)) : [];
  return list.length ? `<div class="mt-26">${head('Albums', `With ${d.call_name}`)}<div class="albums">${list.map((a) => albumCard(snap, a)).join('')}</div></div>` : '';
}

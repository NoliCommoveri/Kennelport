// About us (/about): her story and photos, and what she placed on it. Routed by render/index.js;
// the page frame it shares is in render/pages.js.
import { esc, paras, img, label, pagehead } from '../parts.js';
import { PAGE_HEADS } from '../../content/blocks.js';
import { embedsBlock, framed, badgeRow, assemble } from '../pages.js';

export function about(snap, ctx) {
  const p = snap.pages.about;
  const photo = framed(img(snap, p.photo_id) ?? '', p.photo_frame);
  const facts = p.facts?.length ? `<dl class="kv">${p.facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : '';
  const text = p.text ? `<div class="story-copy">${paras(p.text)}${facts}</div>` : facts;
  return {
    title: snap.pages.about.heading || label(snap, 'about'), section: '/about', description: p.lede, image: p.photo_id,
    body: assemble(snap, ctx, 'about', {
      head: pagehead(p, PAGE_HEADS.about),
      story: `<section class="section tight"><div class="wrap ${photo ? 'story' : 'prose'}">${photo}${text}</div></section>`,
      badges: badgeRow(snap, 'about'),
      embeds: embedsBlock(snap, 'about', { band: true }),
    }),
  };
}

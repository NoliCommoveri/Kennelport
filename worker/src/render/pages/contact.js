// Contact (/contact): the contact form, her FAQ and badges placed on it. Routed by render/index.js;
// the page frame it shares is in render/pages.js.
import { esc, attr, label, pagehead } from '../parts.js';
import { contactForm } from './formParts.js';
import { PAGE_HEADS } from '../../content/blocks.js';
import { faqSection, badgeRow, assemble } from '../pages.js';

export function contact(snap, ctx) {
  const p = snap.pages.contact;
  const s = snap.site;
  const cards = [];
  if (s.facebook_url || s.facebook_label) cards.push(['Message us', s.facebook_url ? `<a href="${attr(s.facebook_url)}" rel="noopener">${esc(s.facebook_label || 'Facebook')}</a>` : `Facebook: ${esc(s.facebook_label)}`]);
  if (s.instagram_url) cards.push(['Instagram', `<a href="${attr(s.instagram_url)}" rel="noopener">${esc(new URL(s.instagram_url).pathname.replace(/\//g, '') || 'Instagram')}</a>`]);
  if (s.contact_email) cards.push(['Email', `<a href="mailto:${attr(s.contact_email)}">${esc(s.contact_email)}</a>`]);
  if (s.contact_phone) cards.push(['Phone', `<a href="tel:${attr(s.contact_phone.replace(/[^\d+]/g, ''))}">${esc(s.contact_phone)}</a>`]);
  const place = [s.town, s.region].filter(Boolean).join(', ');
  if (place || p.location_note) cards.push(['Location', [place && esc(place), p.location_note && esc(p.location_note)].filter(Boolean).join('<br>')]);
  return {
    title: snap.pages.contact.heading || label(snap, 'contact'), section: '/contact', description: p.lede,
    body: assemble(snap, ctx, 'contact', {
      head: pagehead(p, PAGE_HEADS.contact),
      faq: faqSection(snap, 'contact'),
      main: ({ badges }) => `<section class="section tight"><div class="wrap"><div class="contact">${cards.map(([h, val]) => `<div><b>${esc(h)}</b><p class="muted small">${val}</p></div>`).join('')}</div>${badges}${contactForm(snap, ctx)}</div></section>`,
      badges: badgeRow(snap, 'contact'),
      badgesIn: badgeRow(snap, 'contact', { inWrap: true }),
    }),
  };
}

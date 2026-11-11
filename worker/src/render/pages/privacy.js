// Privacy (/privacy): the site's privacy notice, generated (plan 3.9). Routed by render/index.js;
// the page frame it shares is in render/pages.js.
import { esc, attr, pagehead } from '../parts.js';

export function privacy(snap, ctx) {
  const s = snap.site;
  const contactLine = [s.contact_email && `email <a href="mailto:${attr(s.contact_email)}">${esc(s.contact_email)}</a>`, s.contact_phone && `call ${esc(s.contact_phone)}`].filter(Boolean).join(' or ');
  return {
    title: 'Privacy', section: '/privacy', description: `How ${s.kennel_name}'s website handles your information.`,
    body: `${pagehead({}, { eyebrow: 'Privacy', heading: 'Your privacy', lede: null })}
      <section class="section tight"><div class="wrap prose">
        <p>This website belongs to ${esc(s.kennel_name)} and is hosted by KennelPort. This page says what it collects and why.</p>
        <h2>What this site collects</h2>
        <p>Reading this site collects nothing about you: there are no accounts, no advertising, and no tracking cookies. Like every website, the servers that deliver it see your device's internet address for each page it loads; that is used only to deliver the page and keep the site safe, never to track you.</p>
        <h2>Outside services</h2>
        <p>Fonts and pictures are served by this site itself, not by outside companies. This site runs on Cloudflare's network, which delivers each page to you.</p>
        <h2>Questions</h2>
        <p>${contactLine ? `To ask about your information, ${contactLine}.` : `To ask about your information, use the contact details on the <a href="/contact">contact page</a>.`}</p>
      </div></section>`,
  };
}

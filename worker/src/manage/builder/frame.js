// The frame every screen of the owner's build tools shares (manage/builder.js and the
// screens split out beside it): the admin nav, a redirect, an icon, and how a site
// is named (its address, or Demo; its starting template).
import { svg } from './controls.js';
import { escapeHtml as esc } from '../../lib/html.js';

export const redirect = (location) => new Response(null, { status: 303, headers: { location, 'cache-control': 'no-store' } });

export const ic = (n) => `<span class="ic" aria-hidden="true"><svg class="i"><use href="#i-${n}"/></svg></span>`;

// Today's two starting templates (plan, decision 12), as the site's build stands
// until templates are built (step 5): with the portal or without.
export const startingTemplate = (site) => (site.portal_on ? 'Website and family portal' : 'Website');

export const isDemo = (site) => site.demo_step != null;

// Where a site is, in words: its address, or Demo (it has none).
export const whereIs = (site, path = '') => (isDemo(site) ? `Demo${path ? ` · ${path}` : ''}` : `${site.subdomain}.kennelport.com${path}`);

// A site's screens: [path, title, icon, short name for the phone's tabs], and 'portal'
// for one shown only on a site with the family portal.
export const SCREENS = [
  ['pages', 'Pages', 'pages', 'Pages'], ['menu', 'Menu', 'list', 'Menu'], ['rules', 'Pups', 'paw', 'Pups'], ['dogs', 'Dogs', 'star', 'Dogs'], ['tags', 'Tags', 'tag', 'Tags'], ['forms', 'Forms', 'mail', 'Forms'], ['documents', 'Documents', 'draft', 'Docs'], ['wording', 'Wording', 'pages', 'Words'],
  ['formats', 'Formats', 'cal', 'Formats'], ['kennelos', 'From KennelOS', 'link', 'KennelOS'], ['timing', 'Timing', 'clock', 'Timing'], ['portalhome', 'Family Home', 'home', 'Home', 'portal'],
  ['instructions', 'Her instructions', 'book', 'Help'],
];

// The admin nav: Every site, then this site's screens (bottom on a phone, down the
// side on a computer, as the breeder's tabs are).
// On a phone the bar keeps Every site, these screens and the one open, and More holds
// the rest (a panel over the bar); on a computer every screen is down the side.
export const PHONE_SCREENS = ['pages', 'menu', 'rules'];

export function adminNav(site, cur) {
  const items = site ? SCREENS.filter(([, , , , only]) => only !== 'portal' || site.portal_on) : [];
  const link = (href, label, icon, on, short = label, cls = '') => `<a href="${href}"${cls ? ` class="${cls}"` : ''}${on ? ' aria-current="page"' : ''}>${svg(icon)}<span class="lg">${esc(label)}</span><span class="sm">${esc(short)}</span></a>`;
  const onBar = (k) => PHONE_SCREENS.includes(k) || k === cur;
  const href = (k) => `/admin/${esc(site.subdomain)}/${k}`;
  const more = items.filter(([k]) => !onBar(k));
  return `<nav class="apptabs adm" aria-label="Site builder">${link('/admin', 'Every site', 'globe', !site && cur !== 'wording', 'Sites')}${site ? '' : link('/admin/wording', 'Site Manager wording', 'book', cur === 'wording', 'Wording')}
    ${site ? `<span class="lbl">Building</span><span class="site">${esc(site.kennel_name || site.subdomain)}<small>${isDemo(site) ? '<span class="spill brass">Demo</span> ' : ''}${esc(startingTemplate(site))}</small></span>` : ''}
    ${items.map(([k, l, i, short]) => link(href(k), l, i, cur === k, short, onBar(k) ? '' : 'x')).join('')}
    ${more.length ? `<details class="more"><summary>${svg('more')}<span class="sm">More</span></summary><div class="panel">${more.map(([k, l, i, short]) => link(href(k), l, i, false, short)).join('')}</div></details>` : ''}</nav>`;
}

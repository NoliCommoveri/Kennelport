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

// A site's screens: [path, title, icon, short name for the phone's tabs].
export const SCREENS = [
  ['pages', 'Pages', 'pages', 'Pages'], ['menu', 'Menu', 'list', 'Menu'], ['rules', 'Pups', 'paw', 'Pups'], ['dogs', 'Dogs', 'star', 'Dogs'], ['tags', 'Tags', 'tag', 'Tags'], ['wording', 'Wording', 'pages', 'Words'],
  ['formats', 'Formats', 'cal', 'Formats'], ['kennelos', 'From KennelOS', 'link', 'KennelOS'], ['timing', 'Timing', 'clock', 'Timing'],
  ['instructions', 'Her instructions', 'book', 'Help'],
];

// The admin nav: Every site, then this site's screens (bottom on a phone, down the
// side on a computer, as the breeder's tabs are).
export function adminNav(site, cur) {
  const items = site ? SCREENS.map(([k, l, i, short]) => [k, l, i, short]) : [];
  const link = (href, label, icon, on, short = label) => `<a href="${href}"${on ? ' aria-current="page"' : ''}>${svg(icon)}<span class="lg">${esc(label)}</span><span class="sm">${esc(short)}</span></a>`;
  return `<nav class="apptabs adm" aria-label="Site builder">${link('/admin', 'Every site', 'globe', !site && cur !== 'wording', 'Sites')}${site ? '' : link('/admin/wording', 'Site Manager wording', 'book', cur === 'wording', 'Wording')}
    ${site ? `<span class="lbl">Building</span><span class="site">${esc(site.kennel_name || site.subdomain)}<small>${isDemo(site) ? '<span class="spill brass">Demo</span> ' : ''}${esc(startingTemplate(site))}</small></span>` : ''}
    ${items.map(([k, l, i, short]) => link(`/admin/${esc(site.subdomain)}/${k}`, l, i, cur === k, short)).join('')}</nav>`;
}

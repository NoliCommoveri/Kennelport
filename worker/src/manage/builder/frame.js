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

// A site's screens: [path, title, icon, short name for the phone's tabs, group].
// Grouped as the owner works: the website's screens, the family portal's (only on a
// site with the portal), and those that cover both (Timing has a card for each; her
// instructions are her wording on both).
export const SCREENS = [
  ['pages', 'Pages', 'pages', 'Pages', 'website'], ['menu', 'Menu', 'list', 'Menu', 'website'], ['rules', 'Pups', 'paw', 'Pups', 'website'], ['dogs', 'Dogs', 'star', 'Dogs', 'website'],
  ['tags', 'Tags', 'tag', 'Tags', 'website'], ['forms', 'Forms', 'mail', 'Forms', 'website'], ['documents', 'Documents', 'draft', 'Docs', 'website'], ['wording', 'Wording', 'pages', 'Words', 'website'],
  ['formats', 'Formats', 'cal', 'Formats', 'website'], ['kennelos', 'From KennelOS', 'link', 'KennelOS', 'website'],
  ['portalhome', 'Family Home', 'home', 'Home', 'portal'],
  ['timing', 'Timing', 'clock', 'Timing', 'both'], ['instructions', 'Her instructions', 'book', 'Help', 'both'],
];
export const GROUPS = [['website', 'Website'], ['portal', 'Family portal'], ['both', 'Website and portal']];

// The admin nav: Every site, then this site's screens by group (bottom on a phone, down
// the side on a computer, as the breeder's tabs are). On a phone the bar keeps Every
// site, these screens and the one open, and More holds the rest by group (a panel over
// the bar); on a computer every screen is down the side under its group's name.
export const PHONE_SCREENS = ['pages', 'menu', 'rules'];

export function adminNav(site, cur) {
  const items = site ? SCREENS.filter(([, , , , g]) => g !== 'portal' || site.portal_on) : [];
  // With no portal there's one group: no names needed.
  const groups = GROUPS.map(([g, name]) => [g, site?.portal_on ? name : null, items.filter((x) => x[4] === g)]).filter(([, , l]) => l.length);
  const link = (href, label, icon, on, short = label, cls = '') => `<a href="${href}"${cls ? ` class="${cls}"` : ''}${on ? ' aria-current="page"' : ''}>${svg(icon)}<span class="lg">${esc(label)}</span><span class="sm">${esc(short)}</span></a>`;
  const onBar = (k) => PHONE_SCREENS.includes(k) || k === cur;
  const href = (k) => `/admin/${esc(site.subdomain)}/${k}`;
  const more = items.filter(([k]) => !onBar(k));
  return `<nav class="apptabs adm" aria-label="Site builder">${link('/admin', 'Every site', 'globe', !site && cur !== 'wording', 'Sites')}${site ? '' : link('/admin/wording', 'Site Manager wording', 'book', cur === 'wording', 'Wording')}
    ${site ? `<span class="lbl">Building</span><span class="site">${esc(site.kennel_name || site.subdomain)}<small>${isDemo(site) ? '<span class="spill brass">Demo</span> ' : ''}${esc(startingTemplate(site))}</small></span>` : ''}
    ${groups.map(([, name, list]) => `${name ? `<span class="lbl grp">${esc(name)}</span>` : ''}${list.map(([k, l, i, short]) => link(href(k), l, i, cur === k, short, onBar(k) ? '' : 'x')).join('')}`).join('')}
    ${more.length ? `<details class="more"><summary>${svg('more')}<span class="sm">More</span></summary><div class="panel">${groups.map(([, name, list]) => {
    const rest = list.filter(([k]) => !onBar(k));
    return rest.length ? `${name ? `<p class="grp">${esc(name)}</p>` : ''}${rest.map(([k, l, i, short]) => link(href(k), l, i, false, short)).join('')}` : '';
  }).join('')}</div></details>` : ''}</nav>`;
}

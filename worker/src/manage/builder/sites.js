// Every site, in the owner's build tools (GET /admin, routed by manage/builder.js):
// a tile per site, with its starting template and how many rules and pages differ
// from the defaults.
import { changedCount } from '../../content/rules.js';
import { pagesChanged } from '../../content/blocks.js';
import { escapeHtml as esc } from '../../lib/html.js';
import { startingTemplate, isDemo } from './frame.js';
import { DEMO_STEPS } from '../../kennelos/demo.js';
import { svg } from './controls.js';

export async function everySite(env) {
  const { results: sites } = await env.DB.prepare(`SELECT s.id, s.subdomain, s.kennel_name, s.status, s.portal_on, s.demo_step, b.build FROM sites s
    LEFT JOIN site_builds b ON b.site_id = s.id WHERE s.status != 'closed' ORDER BY s.demo_step IS NOT NULL, s.kennel_name, s.subdomain`).all();
  const tile = (s) => {
    let build = {};
    try { build = s.build ? JSON.parse(s.build) : {}; } catch { /* the defaults */ }
    const n = changedCount(build);
    const changed = n.rules + n.timing + pagesChanged(build);
    return `<a class="tile s2${s.portal_on ? ' green' : ''}" href="/admin/${esc(s.subdomain)}/pages">
      <span class="eyebrow">${esc(startingTemplate(s))}</span>${isDemo(s) ? '<span class="spill brass">Demo</span>' : ''}<h2>${esc(s.kennel_name || s.subdomain)}</h2><span class="meta">${isDemo(s) ? `Made from the linked sample · step ${esc(s.demo_step)} of ${DEMO_STEPS} · only in your admin view` : `${esc(s.subdomain)}.kennelport.com · ${esc({ draft: 'Not published yet', live: 'Live', suspended: 'Switched off' }[s.status] ?? s.status)}`}</span>
      <span class="meta">${changed ? `${changed} setting${changed === 1 ? '' : 's'} changed from today's behaviour` : 'Today\'s behaviour, unchanged'}</span></a>`;
  };
  return `<span class="eyebrow">Admin</span><h1>Every site</h1><p class="muted">Signed in as admin: every breeder's site is here, with no invites or codes.</p>
    <div class="bento builder">${sites.map(tile).join('')}
      <div class="tile band s2"><span class="ico">${svg('layers')}</span><h2>Templates</h2><span class="meta">Coming with the next steps: pages and the menu, then templates.</span></div></div>`;
}

// The breeder's instructions, in the owner's build tools (/admin/<sub>/instructions,
// and /admin/wording for every site: routed by manage/builder.js): the help lines,
// hints and messages she reads in the Site Manager (manage/wording.js), which the
// owner writes (docs/plans/site-builder.md, decision 19).
import { everyWording, siteWording, SCREENS as WORD_SCREENS, itemsOn, CATALOG, withWording, saveEveryWording, WordingError } from '../wording.js';
import { escapeHtml as esc } from '../../lib/html.js';
import { adminNav, isDemo, redirect, ic } from './frame.js';
import { saveBuild, loadBuild } from '../../content/rules.js';

// Her Site Manager's wording: for every site (/admin/wording), or one site's own
// (/admin/<sub>/instructions). Grouped by screen, each line with where it shows,
// today's wording and the names it can use. No prototype screen for it: built from
// the prototype's lists, cards, pills and the pinned action bar.
export async function wordingRoute({ env, request, url, page, site, build = null, screen }) {
  const every = await everyWording(env);
  const own = site ? siteWording(build) : {};
  const base = site ? `/admin/${esc(site.subdomain)}/instructions` : '/admin/wording';
  const nav = { admin: { nav: site ? adminNav(site, 'instructions') : adminNav(null, 'wording'), ...(site ? { site } : {}) } };
  const q = String(url.searchParams.get('q') ?? '').trim();
  const changed = (it) => (site ? own[it.key] != null : every[it.key] != null);
  const head = site
    ? `<p class="crumb"><a href="/admin">‹ Every site</a></p><span class="eyebrow">${esc(site.kennel_name || site.subdomain)}</span>${isDemo(site) ? ' <span class="spill brass">Demo</span>' : ''}<h1>Her instructions</h1>
      <p class="muted">The wording she reads in her Site Manager, for this site only. Empty lines follow <a href="/admin/wording">the wording for every site</a>.</p>`
    : `<p class="crumb"><a href="/admin">‹ Every site</a></p><h1>Site Manager wording</h1>
      <p class="muted">Every line the breeder reads in her Site Manager, for every site. A site can have its own, on its Her instructions tab. Empty lines are today's wording.</p>`;
  const search = `<form method="get" action="${base}/all" class="card"><div class="fgrid"><label class="half">Find a line<input type="search" name="q" value="${esc(q)}" placeholder="like &quot;Publish&quot; or &quot;litter&quot;"></label></div></form>`;

  if (!screen) {
    if (request.method !== 'GET') return null;
    const rows = Object.entries(WORD_SCREENS).map(([k, name]) => {
      const list = itemsOn(k);
      const n = list.filter(changed).length;
      return `<li><a class="rowlink grow" href="${base}/${k}"><b>${esc(name)}</b><br><span class="small muted">${list.length} line${list.length === 1 ? '' : 's'}${n ? ` · <span class="chg">${n} changed</span>` : ''}</span></a><span class="go" aria-hidden="true">›</span></li>`;
    });
    const body = `${head}${search}<section class="card"><div class="between"><h2>${CATALOG.size} lines, by screen</h2></div><ul class="list pages">${rows.join('')}</ul></section>
      <section class="card band"><p class="small">The list holds every field's label and help, the choices in lists, the notes after a change, each screen's own headings, instructions, buttons and empty messages, signing in, and the errors from her forms' checks. Still to join it: the errors from the waitlist, photos, videos, KennelOS linking and sign-in, and the family portal's screens.</p></section>`;
    return page(site ? 'Her instructions' : 'Site Manager wording', body, nav);
  }
  if (screen !== 'all' && !Object.hasOwn(WORD_SCREENS, screen)) return null;
  const list = screen === 'all'
    ? [...CATALOG.values()].filter((it) => q && [it.key, it.where, it.text, every[it.key], own[it.key]].some((x) => String(x ?? '').toLowerCase().includes(q.toLowerCase()))).slice(0, 200)
    : itemsOn(screen);
  let error = null;
  if (request.method === 'POST') {
    const form = await request.formData();
    const changes = {};
    for (const it of list) if (form.has(`w.${it.key}`)) changes[it.key] = String(form.get(`w.${it.key}`));
    try {
      if (site) await saveBuild(env, site.id, withWording(build, changes, every));
      else await saveEveryWording(env, changes);
      return redirect(`${base}/${screen}${q ? `?q=${encodeURIComponent(q)}&saved=1` : '?saved=1'}`);
    } catch (err) {
      if (!(err instanceof WordingError)) throw err;
      error = err.message;
    }
  }
  const fresh = site ? siteWording(await loadBuild(env, site.id)) : await everyWording(env);
  const rows = list.map((it) => {
    const mine = fresh[it.key] ?? '';
    const follows = site ? every[it.key] ?? it.text : it.text;
    const long = follows.length > 70 || mine.length > 70;
    const input = long ? `<textarea name="w.${esc(it.key)}" rows="3" placeholder="${esc(follows)}">${esc(mine)}</textarea>` : `<input type="text" name="w.${esc(it.key)}" value="${esc(mine)}" placeholder="${esc(follows)}">`;
    return `<li class="wline${mine ? ' on' : ''}"><label><span class="where"><b>${esc(it.where)}</b>${mine ? ' <span class="chg">changed</span>' : ''}</span>${input}
      <span class="hint">${follows ? `${site && every[it.key] != null ? 'Every site' : 'Today'}: “${esc(follows)}”${/[.!?…:]$/.test(follows) ? '' : '.'}` : 'Empty today.'}${it.vars.length ? ` Can use ${it.vars.map((v) => `{${v}}`).join(', ')}.` : ' No names to fill in here.'}</span></label></li>`;
  }).join('');
  const title = screen === 'all' ? (q ? `Lines with “${q}”` : 'Find a line') : WORD_SCREENS[screen];
  const saved = url.searchParams.get('saved') && !error;
  const body = `<p class="crumb"><a href="${base}">‹ ${site ? 'Her instructions' : 'Site Manager wording'}</a></p>${site ? `<span class="eyebrow">${esc(site.kennel_name || site.subdomain)}</span>` : ''}<h1>${esc(title)}</h1>
    ${screen === 'all' ? search : ''}
    ${saved ? `<p class="notice" role="status">Saved. ${site ? 'Her Site Manager shows it now.' : 'Every site\'s Site Manager shows it now, except where a site has its own.'}</p>` : ''}
    ${error ? `<p class="error" role="alert">${esc(error)}</p>` : ''}
    <form method="post" class="build solo"><button class="sr" tabindex="-1" aria-hidden="true">Save</button><div class="stack">
      <section class="card"><p class="small muted">${site ? 'Leave a line empty to follow the wording for every site.' : 'Leave a line empty for today\'s wording.'} Names in braces are filled in, like {kennel} with her kennel's name.</p>
      ${rows ? `<ul class="list wlines">${rows}</ul>` : `<p class="muted">${q ? 'No line has that.' : 'Type a word to find the lines that have it.'}</p>`}</section></div>
      <div class="actionbar"><div class="in"><span class="ico">${ic('book')}</span><p><b>${site ? 'Her instructions' : 'Every site'}</b>Saved lines show in the Site Manager straight away, no publish needed.</p><button class="primary small">Save</button></div></div></form>`;
  return page(`${title} · ${site ? 'Her instructions' : 'Site Manager wording'}`, body, nav);
}

// Her choice of records on a data block (/s/<sub>/blocks/<page>/<block>/records;
// docs/plans/kennelos-contract.md B3 and B5, the owner's decision of 2026-11-12).
// A screen of the Site Manager (manage/screens.js routes to it), made with what that
// file's createScreens holds for the request.
//
// - A Dog cards, Litter cards or Pup cards block: the records the owner's settings
//   show, each ticked; she unticks any to leave it out (content/picks.js omit).
// - A Featured block: every dog (or pup) on her site, hers to tick and put in order
//   (pick), and one to feature on set dates (fixed). Until she saves, the ones the
//   owner's conditions hold for are ticked, in the owner's order.
//
// No prototype screen: built from her app's own pieces, the switch list her page
// cards use (.switches) and the list rows with ↑ ↓ her Dogs list uses (.items,
// .order). It works without script: a move saves the ticks with it.
import { escapeHtml as esc } from '../../lib/html.js';
import { pageBlocks, hersOn } from '../../content/blocks.js';
import { BLOCK_KIND } from '../../content/fields.js';
import { getPicks, savePicks, picksFromForm, isFeatured, FIXED_MAX } from '../../content/picks.js';
import { featuredNow } from '../../content/featured.js';
import { loadBuild } from '../../content/rules.js';
import { HOME_WORDS } from '../../content/model.js';
import { buildSnapshot } from '../../publish.js';
import { matchingRows, recordsOfKind, recordCtx, pairNames, addedWords } from '../../render/parts.js';
import { redirect } from './parts.js';

const PATH = /^\/blocks\/([a-z0-9_-]{1,60})\/([a-z][a-z0-9_-]{0,39})\/records$/;
export const isPicksPath = (p) => PATH.test(p);

// A record's name, and a line under it from its own details.
function nameOf(kind, x) { return kind === 'dog' ? x.call_name : x.name; }
function subOf(snap, kind, x, rc) {
  if (kind === 'dog') return x.registered_name ?? '';
  if (kind === 'litter') return pairNames(snap, x);
  const l = rc.litterOf(x);
  return [l?.name, x.color].filter(Boolean).join(' · ');
}

export function picksScreens({ base, env, note, request, say, site, url }) {
  async function picksScreen() {
    const [, page, block] = url.pathname.slice(base.length).match(PATH) ?? [];
    if (!page) return null;
    const build = await loadBuild(env, site.id);
    const b = pageBlocks(build, page).find((x) => x.id === block && BLOCK_KIND[x.type]);
    if (!b) return null;
    const kind = BLOCK_KIND[b.type];
    const featured = isFeatured(b);
    const snap = await buildSnapshot(env, site.id);
    const rc = recordCtx(snap);
    const cur = await getPicks(env, site.id, page, block);
    const matching = matchingRows(snap, b);
    // A Featured block's list: her picks in her order (or the owner's choice, before
    // she picks), then everything else of its kind. Any other block: what matches.
    let shown = matching;
    let ticked = new Set(matching.filter((x) => !cur.omit.includes(x.id)).map((x) => x.id));
    if (featured) {
      const all = recordsOfKind(snap, kind);
      const byId = new Map(all.map((x) => [x.id, x]));
      const first = cur.pick ? cur.pick.map((id) => byId.get(id)).filter(Boolean) : matching;
      shown = [...first, ...all.filter((x) => !first.includes(x))];
      ticked = new Set(first.map((x) => x.id));
    }
    const here = `${base}/blocks/${page}/${block}/records`;
    const back = page === 'home' ? (hersOn(page, b) ? `${base}/home/${block}` : `${base}/home`) : `${base}/pages/${page}`;

    if (request.method === 'POST') {
      const fd = await request.formData();
      if (featured && fd.get('reset') != null) {
        await savePicks(env, site.id, page, block, null);
        return redirect(`${here}?note=picked`);
      }
      // A move swaps a ticked one with the ticked one next to it.
      const on = new Set(fd.getAll('on').map(String));
      const posted = fd.getAll('order').map(String);
      const seq = posted.filter((id) => on.has(id));
      const move = String(fd.get('move') ?? '').match(/^(.+):(up|down)$/);
      if (move) {
        const i = seq.indexOf(move[1]);
        const j = move[2] === 'up' ? i - 1 : i + 1;
        if (i >= 0 && j >= 0 && j < seq.length) [seq[i], seq[j]] = [seq[j], seq[i]];
      }
      const order = [...seq, ...posted.filter((id) => !on.has(id))];
      const fixed = Array.from({ length: FIXED_MAX }, (_, i) => ({ id: String(fd.get(`fixed.${i}.id`) ?? ''), from: String(fd.get(`fixed.${i}.from`) ?? ''), to: String(fd.get(`fixed.${i}.to`) ?? '') }))
        .filter((f) => f.id && (f.from || f.to)).map((f) => ({ ...f, from: f.from || f.to, to: f.to || f.from }));
      await savePicks(env, site.id, page, block, picksFromForm(b, shown, { ticked: [...on], order, fixed }));
      return redirect(move ? `${here}#r-${move[1]}` : `${here}?note=picked`);
    }

    // Its heading as her site shows it: hers on Home's own blocks, else hers over the owner's.
    const heading = (hersOn(page, b) ? snap.home[b.id]?.heading ?? HOME_WORDS[b.id]?.heading : addedWords(snap, page, b).heading) || b.w?.heading || say(featured ? 'picks.link_featured' : 'picks.link');
    const tick = (x) => `<input type="checkbox" name="on" value="${esc(x.id)}"${ticked.has(x.id) ? ' checked' : ''}>`;
    let list;
    if (!shown.length) list = `<p class="muted">${esc(say(featured ? 'picks.none_featured' : 'picks.none'))}</p>`;
    else if (!featured) {
      list = `<div class="switches"><div class="fgrid">${shown.map((x) => `<label class="check" id="r-${esc(x.id)}"><span>${esc(nameOf(kind, x))}${subOf(snap, kind, x, rc) ? `<span class="hint">${esc(subOf(snap, kind, x, rc))}</span>` : ''}</span>${tick(x)}</label>`).join('')}</div></div>`;
    } else {
      // Her order: the ticked ones can move; each row posts its place (order).
      const on = shown.filter((x) => ticked.has(x.id));
      list = `<ul class="items">${shown.map((x) => {
        const i = on.indexOf(x);
        const nm = nameOf(kind, x);
        const moves = i < 0 ? '' : `${i ? `<button name="move" value="${esc(x.id)}:up" aria-label="${esc(say('picks.move_up', { name: nm }))}">↑</button>` : ''}${i < on.length - 1 ? `<button name="move" value="${esc(x.id)}:down" aria-label="${esc(say('picks.move_down', { name: nm }))}">↓</button>` : ''}`;
        return `<li class="item between" id="r-${esc(x.id)}"><input type="hidden" name="order" value="${esc(x.id)}"><label class="check">${tick(x)}<span><b>${esc(nm)}</b>${subOf(snap, kind, x, rc) ? `<span class="hint">${esc(subOf(snap, kind, x, rc))}</span>` : ''}</span></label>${moves ? `<span class="order">${moves}</span>` : ''}</li>`;
      }).join('')}</ul>`;
    }
    let dates = '';
    let today = '';
    if (featured && shown.length) {
      const rows = [...cur.fixed, { id: '', from: '', to: '' }].slice(0, FIXED_MAX);
      const opts = (sel) => `<option value="">${esc(say('picks.dates_none'))}</option>${shown.map((x) => `<option value="${esc(x.id)}"${x.id === sel ? ' selected' : ''}>${esc(nameOf(kind, x))}</option>`).join('')}`;
      dates = `<h2>${esc(say('picks.dates'))}</h2><p class="muted small">${esc(say('picks.dates_hint'))}</p>
        ${rows.map((f, i) => `<div class="fgrid"><label>${esc(say('picks.dates_which'))}<select name="fixed.${i}.id">${opts(f.id)}</select></label><label class="half">${esc(say('picks.dates_from'))}<input type="date" name="fixed.${i}.from" value="${esc(f.from)}"></label><label class="half">${esc(say('picks.dates_to'))}<input type="date" name="fixed.${i}.to" value="${esc(f.to)}"></label></div>`).join('')}`;
      const day = new Date().toISOString().slice(0, 10);
      const live = featuredNow(shown.filter((x) => ticked.has(x.id)), b.sched, cur.fixed, `${site.id}/${page}/${block}`, day);
      if (live.length) today = `<p class="notice">${esc(say('picks.today', { names: live.map((x) => nameOf(kind, x)).join(', ') }))}</p>`;
    }
    const intro = featured
      ? `<p class="muted small">${esc(say('picks.intro_featured'))}</p>${cur.pick ? '' : `<p class="muted small">${esc(say('picks.not_yet'))}</p>`}`
      : `<p class="muted small">${esc(say('picks.intro'))}${b.limit ? ` ${esc(say('picks.limit', { n: b.limit }))}` : ''}</p>`;
    const reset = featured && cur.pick
      ? `<form method="post" action="${here}" class="card"><p class="muted small">${esc(say('picks.reset_hint'))}</p><button name="reset" value="1">${esc(say('picks.reset'))}</button></form>` : '';
    return {
      title: say(featured ? 'picks.title_featured' : 'picks.title', { block: heading }), back,
      body: `${note(url)}${today}<form method="post" action="${here}" data-save class="card">${intro}${list}${dates}
        ${shown.length ? `<button class="primary">${esc(say('picks.save'))}</button>` : ''}</form>${reset}`,
    };
  }
  return { picksScreen };
}

// The button to it, on a block's card in her Site Manager, and what she left out.
export function picksLink(base, say, page, b, snap) {
  if (!BLOCK_KIND[b.type]) return '';
  const left = isFeatured(b) ? 0 : (snap?.picks?.[page]?.[b.id]?.omit ?? []).filter((id) => matchingRows(snap, b).some((x) => x.id === id)).length;
  return `<p><a class="button" href="${base}/blocks/${esc(page)}/${esc(b.id)}/records">${esc(say(isFeatured(b) ? 'picks.link_featured' : 'picks.link'))}</a>${left ? ` <span class="muted small">${esc(say('picks.left_out', { n: left }))}</span>` : ''}</p>`;
}

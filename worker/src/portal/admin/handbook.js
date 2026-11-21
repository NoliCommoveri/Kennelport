// Her puppy handbook, on the Portal tab (/s/<sub>/portal/handbook, routed by
// portal/admin.js): its chapters in her order, each opening to edit, on or off,
// moved up or down, removed after a question. The data and the body's format are in
// portal/handbook.js. Every line she reads is in manage/wording.js (group handbook).
// The prototype's admPortal has the list (title, Links: under it, ↑ ↓, On); its
// "Add chapter" editor isn't in the prototype, so it's built from the template
// screens' card, fgrid and hint.
import { escapeHtml as esc } from '../../lib/html.js';
import { isShown, brokenLinks, linkedPrograms } from '../handbook.js';
import { errorBox } from './parts.js';

const NOTES = ['saved', 'added', 'removed'];

function fields(c, programs, say) {
  const opts = programs.map((x) => `<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
  return `<label>${esc(say('handbook.field_title'))}<input name="title" value="${esc(c?.title ?? '')}" required maxlength="120" placeholder="${esc(say('handbook.field_title_ph'))}"></label>
    <label>${esc(say('handbook.field_body'))}<textarea name="body" rows="${c ? 12 : 8}" maxlength="20000">${esc(c?.body ?? '')}</textarea><span class="hint">${esc(say('handbook.body_hint'))}</span></label>
    ${programs.length ? `<label>${esc(say('handbook.field_link'))}<select name="link"><option value="">${esc(say('handbook.no_link'))}</option>${opts}</select><span class="hint">${esc(say('handbook.link_hint'))}</span></label>`
    : `<p class="hint">${esc(say('handbook.no_programs'))}</p>`}
    <label class="check"><input type="checkbox" name="shown" value="1"${!c || c.shown ? ' checked' : ''}> <span>${esc(say('handbook.field_shown'))}</span></label>`;
}

export function handbookScreen(site, chapters, programs, url, { error, say, values = null } = {}) {
  const base = `/s/${esc(site.subdomain)}/portal/handbook`;
  const n = url.searchParams.get('note');
  const shown = chapters.filter(isShown).length;
  const rows = chapters.map((c, i) => {
    const tags = [];
    if (!c.shown) tags.push(say('handbook.off_tag'));
    else if (!String(c.body ?? '').trim()) tags.push(say('handbook.empty_tag'));
    const linked = linkedPrograms(c.body, programs).map((x) => x.name);
    if (linked.length) tags.push(say('handbook.links_tag', { programs: linked.join(', ') }));
    const broken = brokenLinks(c.body, programs).map((l) => `<br><span class="error">${esc(say('handbook.broken', { link: l }))}</span>`).join('');
    return `<details class="card" id="c-${esc(c.id)}"><summary><b>${esc(c.title)}</b>${tags.length ? `<br><span class="hint">${esc(tags.join(' · '))}</span>` : ''}${broken}</summary>
    <form method="post" action="${base}/${esc(c.id)}"><div class="fgrid">${fields(c, programs, say)}<p><button class="primary">${esc(say('handbook.save'))}</button></p></div></form>
    <div class="row">${i ? `<form method="post" action="${base}/${esc(c.id)}/up"><button>${esc(say('handbook.up'))}</button></form>` : ''}${i < chapters.length - 1 ? `<form method="post" action="${base}/${esc(c.id)}/down"><button>${esc(say('handbook.down'))}</button></form>` : ''}
    <a href="${base}/${esc(c.id)}/remove">${esc(say('handbook.remove'))}</a></div></details>`;
  }).join('');
  return `${NOTES.includes(n) ? `<p class="notice" role="status">${esc(say(`handbook.${n}`))}</p>` : ''}${errorBox(error)}
    <section class="card"><h1>${esc(say('handbook.title'))}</h1><p class="hint">${esc(say('handbook.hint'))}</p>
    <p class="muted small">${esc(chapters.length ? say('handbook.count', { shown, all: chapters.length }) : say('handbook.none'))}</p></section>
    ${rows}
    <form method="post" action="${base}/new" class="card"><h2>${esc(say('handbook.add_title'))}</h2><div class="fgrid">${fields(values, programs, say)}<p><button class="primary">${esc(say('handbook.add'))}</button></p></div></form>`;
}

export function removeScreen(site, c, say) {
  const base = `/s/${esc(site.subdomain)}/portal/handbook`;
  return `<section class="card danger"><h1>${esc(say('handbook.remove_title', { title: c.title }))}</h1><p>${esc(say('handbook.remove_line'))}</p>
    <form method="post" action="${base}/${esc(c.id)}/remove" class="row"><button>${esc(say('handbook.remove_button'))}</button><a href="${base}#c-${esc(c.id)}">${esc(say('handbook.keep'))}</a></form></section>`;
}

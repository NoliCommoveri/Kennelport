// Her Resources screen (/s/<sub>/portal/resources, routed by portal/admin.js): her links
// and PDFs for families (docs/plans/portal-resources-potty.md section 1), the data in
// portal/resources.js. Every line she reads is in the owner's list
// (manage/wording-portal.js pres.*).
//
// No prototype screen: built as the go-home bag's screen is (portal/admin/bag.js), from the
// prototype's list rows, the template screens' card and fgrid, and its hints. Each row
// opens its own small form with Up, Down and Remove.
import { escapeHtml as esc } from '../../lib/html.js';
import { headingsOf, MAX_TITLE, MAX_NOTE, MAX_HEADING } from '../resources.js';
import { errorBox } from './parts.js';
import { defaultSay } from '../../manage/wording.js';

const NOTES = ['saved', 'added', 'removed'];

function fields(kind, x, programs, headings, say) {
  const t = (k, v) => esc(say(k, v));
  const where = kind === 'file'
    ? `<label>${t(x ? 'pres.field_file_replace' : 'pres.field_file')}<input type="file" name="file" accept="application/pdf,image/*"${x ? '' : ' required'}><span class="hint">${t('pres.file_hint')}</span></label>`
    : `<label>${t('pres.field_url')}<input name="url" value="${esc(x?.url ?? '')}" maxlength="500" inputmode="url" placeholder="${t('pres.field_url_ph')}"></label>
      ${programs.length ? `<label>${t('pres.field_program')}<select name="product_id"><option value="">${t('pres.no_program')}</option>${programs.map((p) => `<option value="${esc(p.id)}"${p.id === x?.product_id ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select><span class="hint">${t('pres.program_hint')}</span></label>` : ''}`;
  const list = `res-headings-${kind}`;
  return `<label>${t('pres.field_title')}<input name="title" value="${esc(x?.title ?? '')}" required maxlength="${MAX_TITLE}" placeholder="${t(kind === 'file' ? 'pres.field_title_ph_file' : 'pres.field_title_ph')}"></label>
    ${where}
    <label>${t('pres.field_note')}<input name="note" value="${esc(x?.note ?? '')}" maxlength="${MAX_NOTE}" placeholder="${t('pres.field_note_ph')}"></label>
    <label>${t('pres.field_heading')}<input name="heading" value="${esc(x?.heading ?? '')}" maxlength="${MAX_HEADING}" list="${list}" placeholder="${t('pres.field_heading_ph')}"><datalist id="${list}">${headings.map((h) => `<option value="${esc(h)}">`).join('')}</datalist><span class="hint">${t('pres.heading_hint')}</span></label>
    <label class="check"><input type="checkbox" name="shown" value="1"${!x || x.shown ? ' checked' : ''}> <span>${t('pres.field_shown')}</span></label>`;
}

export function resourcesScreen(site, items, programs, url, { error, say = defaultSay, values = null } = {}) {
  const t = (k, v) => esc(say(k, v));
  const base = `/s/${esc(site.subdomain)}/portal/resources`;
  const n = url.searchParams.get('note');
  const headings = headingsOf(items);
  const rows = items.map((x) => {
    const line = [x.kind === 'file' ? say('pres.kind_file') : x.product_name ? say('pres.kind_program', { program: x.product_name }) : say('pres.kind_link')];
    if (x.heading) line.push(x.heading);
    if (!x.shown) line.push(say('pres.off_tag'));
    return `<li id="r-${esc(x.id)}"><span class="grow"><b>${esc(x.title)}</b><br><span class="small muted">${esc(line.join(' · '))}</span>${x.note ? `<br><span class="hint">${esc(x.note)}</span>` : ''}</span>
      <a href="${base}/${esc(x.id)}">${t('pres.edit')}</a></li>`;
  }).join('');
  const kept = (kind) => (values?.kind === kind ? values : null);
  return `${NOTES.includes(n) ? `<p class="notice" role="status">${t(`pres.${n}`)}</p>` : ''}${errorBox(error, say)}
    <section class="card"><h1>${t('pres.title')}</h1><p class="hint">${t('pres.hint')}</p>
    ${items.length ? `<ul class="list">${rows}</ul>` : `<p class="muted">${t('pres.none')}</p>`}</section>
    <form method="post" action="${base}/new" class="card" id="add-link"><h2>${t('pres.add_link_title')}</h2><input type="hidden" name="kind" value="link"><div class="fgrid">${fields('link', kept('link'), programs, headings, say)}<p><button class="primary">${t('pres.add')}</button></p></div></form>
    <form method="post" action="${base}/new" class="card" id="add-file" enctype="multipart/form-data"><h2>${t('pres.add_file_title')}</h2><input type="hidden" name="kind" value="file"><div class="fgrid">${fields('file', kept('file'), programs, headings, say)}<p><button class="primary">${t('pres.add')}</button></p></div></form>`;
}

// One resource, to change: its form, its place in the list, Open and Remove.
export function resourceScreen(site, x, i, count, programs, headings, { error, say = defaultSay, values = null } = {}) {
  const t = (k, v) => esc(say(k, v));
  const base = `/s/${esc(site.subdomain)}/portal/resources`;
  const shown = values ? { ...x, ...values } : x;
  const open = x.kind === 'file' ? `${base}/${esc(x.id)}/file` : null;
  return `${errorBox(error, say)}<form method="post" action="${base}/${esc(x.id)}" class="card"${x.kind === 'file' ? ' enctype="multipart/form-data"' : ''}><h1>${esc(x.title)}</h1>
    ${open ? `<p><a href="${open}" target="_blank" rel="noopener">${t('pres.open_file')}</a></p>` : ''}
    <div class="fgrid">${fields(x.kind, shown, programs, headings, say)}<p><button class="primary">${t('pres.save')}</button></p></div></form>
    <section class="card"><div class="row">${i ? `<form method="post" action="${base}/${esc(x.id)}/up"><button>${t('pres.up')}</button></form>` : ''}${i < count - 1 ? `<form method="post" action="${base}/${esc(x.id)}/down"><button>${t('pres.down')}</button></form>` : ''}
    <form method="post" action="${base}/${esc(x.id)}/remove"><button class="link">${t(x.kind === 'file' ? 'pres.remove_file' : 'pres.remove')}</button></form></div></section>`;
}

// Her puppy handbook, on the Portal tab (/s/<sub>/portal/handbook, routed by
// portal/admin.js): its chapters in her order, each opening to edit, on or off,
// moved up or down, removed after a question. The data and the body's format are in
// portal/handbook.js. Every line she reads is in manage/wording.js (group handbook).
// The prototype's admPortal has the list (title, Links: under it, ↑ ↓, On); its
// "Add chapter" editor isn't in the prototype, so it's built from the template
// screens' card, fgrid and hint.
import { escapeHtml as esc } from '../../lib/html.js';
import { isShown, brokenLinks, linkedPrograms, photoTags, CLAUDE_PROMPT } from '../handbook.js';
import { errorBox } from './parts.js';

const NOTES = ['saved', 'added', 'removed', 'photo_set'];

function fields(c, programs, say) {
  const opts = programs.map((x) => `<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
  return `<label>${esc(say('handbook.field_title'))}<input name="title" value="${esc(c?.title ?? '')}" required maxlength="120" placeholder="${esc(say('handbook.field_title_ph'))}"></label>
    <label>${esc(say('handbook.field_body'))}<textarea name="body" rows="${c ? 12 : 8}" maxlength="20000">${esc(c?.body ?? '')}</textarea><span class="hint">${esc(say('handbook.body_hint'))}</span></label>
    ${programs.length ? `<label>${esc(say('handbook.field_link'))}<select name="link"><option value="">${esc(say('handbook.no_link'))}</option>${opts}</select><span class="hint">${esc(say('handbook.link_hint'))}</span></label>`
    : `<p class="hint">${esc(say('handbook.no_programs'))}</p>`}
    <label class="check"><input type="checkbox" name="shown" value="1"${!c || c.shown ? ' checked' : ''}> <span>${esc(say('handbook.field_shown'))}</span></label>`;
}

export function handbookScreen(site, chapters, programs, url, { error, say, values = null, live = new Set() } = {}) {
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
    // Its photos: the spots still to fill (what Claude wrote it should show), and any
    // photo since removed from her photos, each a link to pick one.
    const pics = photoTags(c.body);
    const ready = pics.filter((t) => t.id && live.has(t.id));
    if (ready.length) tags.push(say('handbook.photos_tag', { n: ready.length }));
    const need = pics.filter((t) => !t.id || !live.has(t.id)).map((t) => `<br><a class="error" href="${base}/${esc(c.id)}/photo/${t.n}">${esc(t.id ? say('handbook.photo_missing') : say('handbook.photo_needed', { what: t.what }))}</a>`).join('');
    const thumbs = ready.length ? `<div class="ph-grid">${ready.map((t) => `<a class="ph-opt" href="${base}/${esc(c.id)}/photo/${t.n}" title="${esc(say('handbook.photo_change'))}"><img src="/s/${esc(site.subdomain)}/photos/${esc(t.id)}/thumb" alt="${esc(t.caption || say('handbook.photo_change'))}" loading="lazy"></a>`).join('')}</div>` : '';
    return `<details class="card" id="c-${esc(c.id)}"><summary><b>${esc(c.title)}</b>${tags.length ? `<br><span class="hint">${esc(tags.join(' · '))}</span>` : ''}${broken}${need}</summary>
    ${thumbs}<form method="post" action="${base}/${esc(c.id)}"><div class="fgrid">${fields(c, programs, say)}<p><button class="primary">${esc(say('handbook.save'))}</button></p></div></form>
    <div class="row">${i ? `<form method="post" action="${base}/${esc(c.id)}/up"><button>${esc(say('handbook.up'))}</button></form>` : ''}${i < chapters.length - 1 ? `<form method="post" action="${base}/${esc(c.id)}/down"><button>${esc(say('handbook.down'))}</button></form>` : ''}
    <a href="${base}/${esc(c.id)}/remove">${esc(say('handbook.remove'))}</a></div></details>`;
  }).join('');
  const imported = n === 'imported' ? say(url.searchParams.get('on') ? 'handbook.imported_on' : 'handbook.imported_off', { added: Number(url.searchParams.get('a')) || 0, replaced: Number(url.searchParams.get('r')) || 0 }) : null;
  return `${NOTES.includes(n) ? `<p class="notice" role="status">${esc(say(`handbook.${n}`))}</p>` : ''}${imported ? `<p class="notice" role="status">${esc(imported)}</p>` : ''}${errorBox(error)}
    <section class="card"><h1>${esc(say('handbook.title'))}</h1><p class="hint">${esc(say('handbook.hint'))}</p>
    <p class="muted small">${esc(chapters.length ? say('handbook.count', { shown, all: chapters.length }) : say('handbook.none'))}</p></section>
    ${rows}
    <form method="post" action="${base}/upload" enctype="multipart/form-data" class="card"><h2>${esc(say('handbook.upload_title'))}</h2><p class="hint">${esc(say('handbook.upload_hint'))}</p>
      <details><summary>${esc(say('handbook.prompt_title'))}</summary><p class="hint">${esc(say('handbook.prompt_hint'))}</p><textarea readonly rows="12" aria-label="${esc(say('handbook.prompt_title'))}">${esc(CLAUDE_PROMPT)}</textarea></details>
      <div class="fgrid"><label>${esc(say('handbook.upload_field'))}<input type="file" name="file" accept=".md,.markdown,.txt,.html,.htm,text/markdown,text/plain,text/html" required></label>
      <label class="check"><input type="checkbox" name="replace" value="1" checked> <span>${esc(say('handbook.upload_replace'))}</span></label>
      <label class="check"><input type="checkbox" name="shown" value="1"> <span>${esc(say('handbook.upload_shown'))}<br><span class="hint">${esc(say('handbook.upload_shown_hint'))}</span></span></label>
      <p><button class="primary">${esc(say('handbook.upload_button'))}</button></p></div></form>
    <form method="post" action="${base}/new" class="card"><h2>${esc(say('handbook.add_title'))}</h2><div class="fgrid">${fields(values, programs, say)}<p><button class="primary">${esc(say('handbook.add'))}</button></p></div></form>`;
}

export function removeScreen(site, c, say) {
  const base = `/s/${esc(site.subdomain)}/portal/handbook`;
  return `<section class="card danger"><h1>${esc(say('handbook.remove_title', { title: c.title }))}</h1><p>${esc(say('handbook.remove_line'))}</p>
    <form method="post" action="${base}/${esc(c.id)}/remove" class="row"><button>${esc(say('handbook.remove_button'))}</button><a href="${base}#c-${esc(c.id)}">${esc(say('handbook.keep'))}</a></form></section>`;
}

// Picking one of her photos for a chapter's photo spot: her photo library, newest
// first, as the app's photo grid with a tick on each; or leave the photo out.
export function photoScreen(site, c, spot, photos, say, { error } = {}) {
  const base = `/s/${esc(site.subdomain)}/portal/handbook/${esc(c.id)}/photo/${spot.n}`;
  return `${errorBox(error)}<section class="card"><h1>${esc(say('handbook.photo_title', { chapter: c.title }))}</h1>
    ${spot.what && !spot.id ? `<p class="hint">${esc(say('handbook.photo_line', { what: spot.what }))}</p>` : ''}
    ${photos.length ? `<form method="post" action="${base}"><div class="ph-grid">${photos.map((ph) => `<label class="ph-opt"><input type="radio" name="photo" value="${esc(ph.id)}"${ph.id === spot.id ? ' checked' : ''}><img src="/s/${esc(site.subdomain)}/photos/${esc(ph.id)}/thumb" alt="${esc(ph.alt ?? '')}" loading="lazy"></label>`).join('')}</div>
      <p><button class="primary">${esc(say('handbook.photo_use'))}</button></p></form>` : `<p class="muted">${esc(say('handbook.photo_none'))}</p>`}
    <form method="post" action="${base}"><input type="hidden" name="leave" value="1"><p><button class="link">${esc(say('handbook.photo_leave'))}</button></p></form></section>`;
}


// Documents (documents.js), in the owner's admin view: a site's PDFs, to upload,
// retitle and remove. Any button on the site can open one ("A document" where a button
// goes). The upload is a plain form post, so the manage app's files are unchanged.
import { escapeHtml as esc } from '../../lib/html.js';
import { listDocuments, addDocument, removeDocument, renameDocument, DocumentError, docSize, MAX_DOC_BYTES, TITLE_MAX } from '../../documents.js';
import { adminNav, redirect, isDemo } from './frame.js';
import { svg } from './controls.js';

const NOTES = { added: 'Uploaded. Choose it as where a button goes; it shows on the site once the breeder (or you) publishes.', saved: 'Saved.', removed: 'Removed. A button that opened it hides by itself at the next publish.' };

export async function documentsRoute({ env, request, url, site, page }) {
  const here = `/admin/${site.subdomain}/documents`;
  let error = null;
  if (request.method === 'POST') {
    const form = await request.formData();
    const act = String(form.get('act') ?? '');
    try {
      if (act === 'upload') { await addDocument(env, site.id, form.get('file'), form.get('title')); return redirect(`${here}?note=added`); }
      const [what, id] = act.split(':');
      if (what === 'remove' && id) { await removeDocument(env, site.id, id); return redirect(`${here}?note=removed`); }
      if (what === 'title' && id) { await renameDocument(env, site.id, id, form.get(`title.${id}`)); return redirect(`${here}?note=saved#d-${id}`); }
    } catch (e) {
      if (!(e instanceof DocumentError)) throw e;
      error = e.message;
    }
  }
  const docs = await listDocuments(env, site.id);
  const note = NOTES[url.searchParams.get('note')];
  const preview = (id) => `/admin/${site.subdomain}/site/_kp/d/${encodeURIComponent(id)}`;
  const rows = docs.map((d) => `<li class="mvr" id="d-${esc(d.id)}"><span class="ico">${svg('draft')}</span><span class="grow"><label>Title<input type="text" name="title.${esc(d.id)}" value="${esc(d.title ?? '')}" maxlength="${TITLE_MAX}" placeholder="${esc(d.name)}"></label>
      <span class="small muted">${esc(d.name)} · ${esc(docSize(d.bytes))} · <a href="${preview(d.id)}" target="_blank" rel="noopener">Open</a></span></span>
      <span class="end"><button class="button small" name="act" value="title:${esc(d.id)}">Save title</button> <button class="link small danger" name="act" value="remove:${esc(d.id)}">${svg('trash')} Remove</button></span></li>`).join('');
  const body = `<p class="crumb"><a href="/admin">‹ Every site</a></p><span class="eyebrow">${esc(site.kennel_name || site.subdomain)}</span>${isDemo(site) ? ' <span class="spill brass">Demo</span>' : ''}<h1>Documents</h1>
    <p class="muted">This site's PDFs. Any button can open one: choose "A document" where the button goes, on a button, a banner, a card or any block with a button.</p>
    ${note ? `<p class="notice" role="status">${esc(note)}</p>` : ''}${error ? `<p class="notice error" role="alert">${esc(error)}</p>` : ''}
    <form method="post" enctype="multipart/form-data" class="fgroup"><h2>Upload a PDF</h2>
      <p class="small muted">At most ${MAX_DOC_BYTES / 1048576} MB. A large one loads slowly on a phone: save it as a "reduced size" or "compressed" PDF first (most PDF apps and print-to-PDF offer it).</p>
      <div class="fgrid"><label class="half">The file<input type="file" name="file" accept="application/pdf,.pdf" required></label><label class="half">Title<input type="text" name="title" maxlength="${TITLE_MAX}"><span class="hint">Optional: how it's named in your lists. Empty: its file name.</span></label></div>
      <button class="primary" name="act" value="upload">Upload</button></form>
    <form method="post" class="fgroup"><h2>On this site</h2>${docs.length ? `<ul class="list">${rows}</ul>` : '<p class="muted">None yet.</p>'}</form>`;
  return page(`Documents · ${site.kennel_name || site.subdomain}`, body, { admin: { nav: adminNav(site, 'documents'), site } });
}

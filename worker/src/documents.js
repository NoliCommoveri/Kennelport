// Documents (2026-11-18): a site's PDFs, which the owner uploads in her admin view
// (manage/builder/documents.js). Not tied to any one block: anything that links can
// link to one ("A document", content/blocks.js LINK_TO: every button, banner and card).
// Kept in R2 with the site's other files (sites/<id>/docs/<doc id>.pdf), so a site's
// backup and its closing carry them; a row each in `documents` (migration 0038).
//
// Only PDFs, checked by their first bytes, at most MAX_DOC_BYTES: nothing is
// compressed here (a Worker can't redo a PDF's images), so a big one is made smaller
// before it's uploaded. Published sites serve the documents their snapshot lists
// (publish.js), at /_kp/d/<id>; a preview serves any of the site's.
export const MAX_DOC_BYTES = 10 * 1024 * 1024;
export const TITLE_MAX = 120;

export class DocumentError extends Error {}

const ID = /^[A-Za-z0-9_-]{1,64}$/;
export const docUrl = (id) => `/_kp/d/${encodeURIComponent(id)}`;

// A file's name as a short, safe one for the download (letters, digits, - and _).
export function fileName(name) {
  const base = String(name ?? '').replace(/\.pdf$/i, '').normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60);
  return `${base || 'document'}.pdf`;
}

export function checkPdf(bytes) {
  const b = new Uint8Array(bytes);
  if (!b.length) throw new DocumentError('That file is empty.');
  if (b.length > MAX_DOC_BYTES) throw new DocumentError(`That file is ${(b.length / 1048576).toFixed(1)} MB; at most ${MAX_DOC_BYTES / 1048576} MB. Save it smaller (a "reduced size" or "compressed" PDF) and try again.`);
  if (String.fromCharCode(...b.slice(0, 5)) !== '%PDF-') throw new DocumentError('That isn\'t a PDF. Only PDF files can be uploaded here.');
}

export async function listDocuments(env, siteId) {
  return (await env.DB.prepare('SELECT id, name, title, bytes, created_at FROM documents WHERE site_id = ? ORDER BY created_at DESC').bind(siteId).all()).results;
}

export async function addDocument(env, siteId, file, title) {
  if (!file || typeof file.arrayBuffer !== 'function') throw new DocumentError('Choose a PDF to upload.');
  const bytes = await file.arrayBuffer();
  checkPdf(bytes);
  const id = crypto.randomUUID();
  const key = `sites/${siteId}/docs/${id}.pdf`;
  const name = fileName(file.name);
  await env.FILES.put(key, bytes, { httpMetadata: { contentType: 'application/pdf' } });
  const t = String(title ?? '').replace(/\s+/g, ' ').trim().slice(0, TITLE_MAX) || null;
  await env.DB.prepare('INSERT INTO documents (id, site_id, r2_key, name, title, bytes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, siteId, key, name, t, bytes.byteLength, new Date().toISOString()).run();
  return id;
}

export async function renameDocument(env, siteId, id, title) {
  const t = String(title ?? '').replace(/\s+/g, ' ').trim().slice(0, TITLE_MAX) || null;
  await env.DB.prepare('UPDATE documents SET title = ? WHERE id = ? AND site_id = ?').bind(t, id, siteId).run();
}

// Gone at once, from R2 too: a published site that still lists it answers Not found,
// and a card linking to it loses its button at the next publish.
export async function removeDocument(env, siteId, id) {
  const row = await env.DB.prepare('SELECT r2_key FROM documents WHERE id = ? AND site_id = ?').bind(id, siteId).first();
  if (!row) return;
  await env.FILES.delete(row.r2_key);
  await env.DB.prepare('DELETE FROM documents WHERE id = ? AND site_id = ?').bind(id, siteId).run();
}

// What the snapshot carries: every document of the site, by id.
export async function snapshotDocuments(db, siteId) {
  const rows = (await db.prepare('SELECT id, r2_key, name, title, bytes FROM documents WHERE site_id = ?').bind(siteId).all()).results;
  return Object.fromEntries(rows.map((d) => [d.id, { key: d.r2_key, name: d.name, title: d.title ?? null, bytes: d.bytes }]));
}

// /_kp/d/<id>: the PDF, shown in the browser's own viewer (inline), saved under its name.
export async function serveDocument(env, site, snap, url, { preview }) {
  const id = decodeURIComponent(url.pathname.slice('/_kp/d/'.length).split('/')[0]);
  const none = () => new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });
  if (!ID.test(id)) return none();
  let entry = snap?.documents?.[id];
  if (!entry && preview) entry = await env.DB.prepare('SELECT r2_key AS key, name FROM documents WHERE id = ? AND site_id = ?').bind(id, site.id).first();
  if (!entry) return none();
  const obj = await env.FILES.get(entry.key);
  if (!obj) return none();
  return new Response(obj.body, {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="${fileName(entry.name)}"`,
      'cache-control': preview ? 'private, no-store' : 'public, max-age=3600',
      'x-content-type-options': 'nosniff',
    },
  });
}

// "PDF · 1.2 MB", for a card under its button.
export const docSize = (bytes) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

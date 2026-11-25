// Resources (docs/plans/portal-resources-potty.md section 1): the breeder's links and
// PDFs for families, under her own headings, on their Resources page (a Quick link, once
// one is on). Her screen is portal/admin/resources.js; the family's page is in
// portal/family.js. Every add has a remove (the owner's rule): removeResource deletes the
// file too.
import { PortalError, sniff, MAX_FILE_BYTES } from './store.js';

const now = () => new Date().toISOString();
const clean = (v, max) => {
  const s = String(v ?? '').replace(/\s+/g, ' ').trim();
  return s ? s.slice(0, max) : null;
};
export const MAX_TITLE = 120;
export const MAX_NOTE = 300;
export const MAX_HEADING = 60;

const keyFor = (siteId, id) => `sites/${siteId}/portal/resources/${id}`;

// Hers, all of them, in her order, with the program's name for a program link.
export async function listResources(env, siteId) {
  return (await env.DB.prepare(`SELECT r.*, p.name AS product_name FROM portal_resources r
    LEFT JOIN products p ON p.id = r.product_id AND p.site_id = r.site_id WHERE r.site_id = ? ORDER BY r.sort, r.created_at`).bind(siteId).all()).results;
}

// What families see: those on, a program link only while the program is shown with a link.
export async function shownResources(env, siteId) {
  return (await listResources(env, siteId)).filter((r) => r.shown && (r.kind === 'file' || r.url || r.product_name));
}

export async function getResource(env, siteId, id) {
  return env.DB.prepare('SELECT * FROM portal_resources WHERE id = ? AND site_id = ?').bind(id, siteId).first();
}

// A program families can be sent to: shown in the portal, with a web link.
async function linkable(env, siteId, productId) {
  const x = await env.DB.prepare('SELECT id, link_url FROM products WHERE id = ? AND site_id = ? AND portal_show = 1').bind(productId, siteId).first();
  return x && /^https:\/\//i.test(x.link_url ?? '') ? x : null;
}

function cleanUrl(v) {
  let s = clean(v, 500);
  if (!s) return null;
  if (!/^[a-z]+:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    if (!u.hostname.includes('.')) return false;
    return u.toString();
  } catch {
    return false;
  }
}

// Add or change one. A new link: input.url or input.product_id. A new file: `bytes`
// and `name` (her upload). Changing one keeps its kind; a file can be replaced.
export async function saveResource(env, siteId, id, input, file = null) {
  const title = clean(input.title, MAX_TITLE);
  if (!title) throw new PortalError('Give it a title families will recognise.');
  const v = { title, note: clean(input.note, MAX_NOTE), heading: clean(input.heading, MAX_HEADING), shown: input.shown ? 1 : 0 };
  const cur = id ? await getResource(env, siteId, id) : null;
  if (id && !cur) throw new PortalError('That resource has gone.');
  const kind = cur?.kind ?? (input.kind === 'file' ? 'file' : 'link');
  if (kind === 'link') {
    const pid = clean(input.product_id, 64);
    if (pid) {
      if (!(await linkable(env, siteId, pid))) throw new PortalError('That program has no link families can open.');
      Object.assign(v, { product_id: pid, url: null });
    } else {
      const url = cleanUrl(input.url);
      if (!url) throw new PortalError('Type the web address, like www.example.com/guide.');
      Object.assign(v, { url, product_id: null });
    }
  }
  const t = now();
  const rid = id ?? crypto.randomUUID();
  let put = null;
  if (kind === 'file' && (file?.bytes?.length || !id)) {
    if (!file?.bytes?.length) throw new PortalError('Choose a PDF or photo.');
    if (file.bytes.length > MAX_FILE_BYTES) throw new PortalError('That file is over 10 MB.');
    const type = sniff(file.bytes);
    if (!type) throw new PortalError('That file isn\'t a PDF or a photo.');
    put = { key: `${keyFor(siteId, rid)}-${t.replace(/\D/g, '')}`, type, bytes: file.bytes };
    Object.assign(v, { r2_key: put.key, type, bytes: file.bytes.length });
  }
  if (put) await env.FILES.put(put.key, put.bytes, { httpMetadata: { contentType: put.type } });
  if (cur) {
    await env.DB.prepare(`UPDATE portal_resources SET ${Object.keys(v).map((k) => `${k} = ?`).join(', ')}, updated_at = ? WHERE id = ? AND site_id = ?`)
      .bind(...Object.values(v), t, rid, siteId).run();
    if (put && cur.r2_key) await env.FILES.delete(cur.r2_key);
    return rid;
  }
  // A new one goes to the bottom of her list.
  const sort = (await env.DB.prepare('SELECT COALESCE(MAX(sort), -1) + 1 AS n FROM portal_resources WHERE site_id = ?').bind(siteId).first('n')) ?? 0;
  const cols = { id: rid, site_id: siteId, kind, ...v, sort, created_at: t, updated_at: t };
  await env.DB.prepare(`INSERT INTO portal_resources (${Object.keys(cols).join(', ')}) VALUES (${Object.keys(cols).map(() => '?').join(', ')})`).bind(...Object.values(cols)).run();
  return rid;
}

export async function removeResource(env, siteId, id) {
  const cur = await getResource(env, siteId, id);
  if (!cur) return;
  await env.DB.prepare('DELETE FROM portal_resources WHERE id = ? AND site_id = ?').bind(id, siteId).run();
  if (cur.r2_key) await env.FILES.delete(cur.r2_key);
}

export async function moveResource(env, siteId, id, dir) {
  const list = await listResources(env, siteId);
  const i = list.findIndex((x) => x.id === id);
  const j = dir === 'up' ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await env.DB.batch(list.map((x, n) => env.DB.prepare('UPDATE portal_resources SET sort = ? WHERE id = ? AND site_id = ?').bind(n, x.id, siteId)));
}

// Her headings, for the field's suggestions, in the order they first appear.
export const headingsOf = (list) => [...new Set(list.map((x) => x.heading).filter(Boolean))];

// Grouped for the family page: [[heading or null, [rows]], ...], in her order.
export function grouped(list) {
  const out = [];
  for (const r of list) {
    const g = out.find(([h]) => h === (r.heading ?? null));
    if (g) g[1].push(r);
    else out.push([r.heading ?? null, [r]]);
  }
  return out;
}

// A file, opened in the browser: to her, or to a signed-in family while it's on.
export async function resourceFile(env, siteId, id, { family = false } = {}) {
  const r = await getResource(env, siteId, id);
  const obj = r?.kind === 'file' && (!family || r.shown) && r.r2_key ? await env.FILES.get(r.r2_key) : null;
  if (!obj) return new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });
  const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'application/pdf': 'pdf' }[r.type] ?? 'bin';
  const name = `${r.title.replace(/[^\w -]+/g, '').trim().slice(0, 60) || 'resource'}.${ext}`;
  return new Response(obj.body, {
    headers: {
      'content-type': r.type, 'content-disposition': `inline; filename="${name}"`, 'cache-control': 'private, max-age=300',
      'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:",
    },
  });
}

// /ops: sites (plan 2.2, 8.1 phase 1). Everything here sits behind the ops
// sign-in (ops.js has already checked it). Each form posts back and, on success,
// redirects to the site's page with a note, so a reload never repeats an action.
import { escapeHtml as esc, htmlPage } from '../lib/html.js';
import { json } from '../lib/http.js';
import { createSite, setSuspended, closeSite, releaseSubdomain, SiteError } from '../sites.js';
import { publish, undoPublish, listSnapshots } from '../publish.js';
import { importContent, exportContent } from '../content/io.js';
import { ContentError } from '../content/model.js';
import { AK_SAMPLE } from '../content/akSample.js';
import { makePreviewToken, PREVIEW_DAYS } from '../site.js';
import { savePhoto, PhotoError } from '../photos.js';
import { APP_VERSION } from '../manage/version.js';
import { inviteToSite, removeFromSite, AuthError } from '../auth.js';

const TITLE = 'KennelPort ops';
// The site page loads one script of our own (photo resizing); nothing else.
const OPS_CSP = "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; img-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'";

const redirect = (location) => new Response(null, { status: 303, headers: { location } });
const page = (body, status = 200) => htmlPage(TITLE, body, { status, headers: { 'content-security-policy': OPS_CSP } });
const fmtTime = (iso) => (iso ? iso.replace('T', ' ').slice(0, 16) + ' UTC' : '');

const NOTES = {
  created: 'Site created. Fill in its content, preview it, then publish.',
  published: 'Published. Visitors now see this version.',
  undone: 'Undone. Visitors now see the previous version.',
  imported: 'Content saved to the draft. Preview it, then publish.',
  sample: 'The AK sample content is in the draft. Preview it, then publish.',
  suspended: 'Suspended: visitors see "isn\'t available right now".',
  resumed: 'Back on.',
  photo_removed: 'Photo removed from the draft.',
  invited: 'Invited. They sign in at the manage app with that address.',
  limits: 'Limits saved.',
  removed: 'Removed from this site.',
  closed: 'Site closed and its content deleted.',
  released: 'Subdomain released.',
};

// Where to see a site from here. Staging can't receive real hostnames, so its
// links go through /__host (hosts.js).
export function siteLink(env, subdomain, path = '/') {
  const host = `${subdomain}.${env.ROOT_DOMAIN}`;
  if (env.ALLOW_HOST_OVERRIDE === '1') return `/__host?h=${encodeURIComponent(host)}&next=${encodeURIComponent(path)}`;
  return `https://${host}${path}`;
}

// ---------- the list on /ops ----------

export async function sitesSection(env) {
  const { results } = await env.DB.prepare('SELECT id, subdomain, kennel_name, status, created_at FROM sites ORDER BY created_at DESC').all();
  const rows = results.map((s) => `<tr><td><a href="/ops/sites/${esc(s.id)}">${esc(s.subdomain)}</a></td><td>${esc(s.kennel_name ?? '')}</td><td>${esc(s.status)}</td></tr>`).join('');
  return `<h2>Sites</h2>
${rows ? `<table><tr><th>Subdomain</th><th>Kennel</th><th>Status</th></tr>${rows}</table>` : '<p class="muted">No sites yet.</p>'}
<form method="post" action="/ops/sites">
  <p><label>Subdomain<br><input name="subdomain" required pattern="[a-z0-9-]{1,63}" placeholder="akbostons"></label></p>
  <p><label>Kennel name<br><input name="kennel_name" required maxlength="80" placeholder="AK Boston Terriers"></label></p>
  <p><button>Create site</button></p>
</form>`;
}

// ---------- one site ----------

async function sitePage(env, siteId, { note, error, previewLink, content } = {}) {
  const site = await env.DB.prepare('SELECT * FROM sites WHERE id = ?').bind(siteId).first();
  if (!site) return page('<h1>Not found</h1><p><a href="/ops">Back to ops</a></p>', 404);
  const top = `<p><a href="/ops">← Ops</a></p><h1>${esc(site.kennel_name || site.subdomain)}</h1>
<p class="muted"><code>${esc(site.subdomain)}.${esc(env.ROOT_DOMAIN)}</code> · ${esc(site.status)}</p>
${note ? `<p class="ok">${esc(NOTES[note] ?? note)}</p>` : ''}${error ? `<p class="bad">${esc(error)}</p>` : ''}`;

  if (site.status === 'closed') {
    return page(`${top}<p>Closed ${esc(fmtTime(site.closed_at))}. Its address shows the closed notice (HTTP 410) and the subdomain can't be given to another site until it's released.</p>
<form method="post" action="/ops/sites/${esc(site.id)}/release"><p><button>Release ${esc(site.subdomain)}</button></p></form>`);
  }

  const snaps = await listSnapshots(env, siteId);
  const live = snaps.find((s) => s.id === site.published_snapshot_id);
  const { results: photos } = await env.DB.prepare('SELECT id, alt, width, height, bytes, created_at FROM photos WHERE site_id = ? AND removed_at IS NULL ORDER BY created_at DESC').bind(siteId).all();
  const changed = site.draft_changed_at && (!live || site.draft_changed_at > live.published_at);
  const staging = env.ALLOW_HOST_OVERRIDE === '1';

  const publishing = `<h2>Publish</h2>
<p>${live ? `Live version published ${esc(fmtTime(live.published_at))}.` : 'Never published: visitors see "This website is being built".'}
${changed ? ' <strong>The draft has changes since then.</strong>' : ''}</p>
<p><a href="${esc(siteLink(env, site.subdomain))}">Open the live site</a>${staging ? ' <span class="muted">(staging: this browser then sees the site; <code>/__host?clear</code> brings back ops)</span>' : ''}</p>
<form method="post" action="/ops/sites/${esc(site.id)}/preview"><p><button>Make a preview link</button> <span class="muted">Shows the draft, every page, for ${PREVIEW_DAYS} days, to anyone with the link.</span></p></form>
${previewLink ? `<p><a href="${esc(previewLink)}">Preview link</a></p><pre>${esc(previewLink)}</pre>` : ''}
<form method="post" action="/ops/sites/${esc(site.id)}/publish"><p><button>Publish</button></p></form>
${snaps.length > 1 ? `<form method="post" action="/ops/sites/${esc(site.id)}/undo"><p><button>Undo publish</button> <span class="muted">Back to the version before the live one.</span></p></form>` : ''}
${snaps.length ? `<table><tr><th>Published</th><th>Size</th><th></th></tr>${snaps.map((s) => `<tr><td>${esc(fmtTime(s.published_at))}</td><td>${Math.round(s.bytes / 1024)} KB</td><td>${s.id === site.published_snapshot_id ? 'live' : ''}</td></tr>`).join('')}</table>` : ''}`;

  const contentSection = `<h2>Content</h2>
<p>The draft's content as one JSON document (the content model, <code>worker/src/content/model.js</code>). Download it, edit it, paste it back. A section you include replaces that section of the draft; one you leave out is untouched. Nothing is live until you publish.</p>
<p><a href="/ops/sites/${esc(site.id)}/content.json">Download the content (JSON)</a></p>
<form method="post" action="/ops/sites/${esc(site.id)}/content">
  <p><textarea name="content" rows="14" spellcheck="false" placeholder='{"site": {"tagline": "..."}}'>${esc(content ?? '')}</textarea></p>
  <p><button>Save to draft</button></p>
</form>
<form method="post" action="/ops/sites/${esc(site.id)}/sample"><p><button>Load the AK sample content</button> <span class="muted">Replaces every section of the draft with the AK sample's. Photos aren't included.</span></p></form>`;

  const photoRows = photos.map((p) => `<tr><td><img src="/ops/sites/${esc(site.id)}/photos/${esc(p.id)}" alt="" width="64" height="64" style="object-fit:cover;border-radius:4px"></td>
<td><code>${esc(p.id)}</code><br><span class="muted">${esc(p.alt ?? 'no description')} · ${p.width}×${p.height} · ${Math.round(p.bytes / 1024)} KB</span></td>
<td><form method="post" action="/ops/sites/${esc(site.id)}/photos/${esc(p.id)}/remove"><button>Remove</button></form></td></tr>`).join('');
  const photoSection = `<h2>Photos</h2>
<p>Resized here in the browser (about 1600px and a 400px thumbnail) and checked again on the server. Use a photo's id in the content, for example <code>"photo_id": "…"</code> on a dog, or in <code>home.hero.photos</code>. A photo shows on the site only once a published page uses it.</p>
<form id="photo-form" method="post" action="/ops/sites/${esc(site.id)}/photos">
  <p><input type="file" accept="image/*" multiple required></p>
  <p><label>Description (for screen readers and search)<br><input name="alt" maxlength="200" placeholder="Willow standing on autumn leaves"></label></p>
  <p><button>Upload</button> <span id="photo-status" class="muted" role="status"></span></p>
</form>
${photoRows ? `<table>${photoRows}</table>` : '<p class="muted">No photos yet.</p>'}
<script src="/_kp/m/photos.js?v=${APP_VERSION}" defer></script>`;

  const { results: people } = await env.DB.prepare('SELECT email_hash, role, invited_at, joined_at FROM site_users WHERE site_id = ? ORDER BY invited_at').bind(siteId).all();
  const peopleSection = `<h2>People</h2>
<p class="muted">Who can sign in to the manage app for this site. Addresses aren't kept, only a keyed hash, so people show by role and date.</p>
${people.length ? `<table>${people.map((p) => `<tr><td>${esc(p.role)}</td><td class="muted">invited ${esc(fmtTime(p.invited_at))}${p.joined_at ? `, signed in ${esc(fmtTime(p.joined_at))}` : ', not signed in yet'}</td>
<td><form method="post" action="/ops/sites/${esc(site.id)}/people/remove"><input type="hidden" name="email_hash" value="${esc(p.email_hash)}"><button>Remove</button></form></td></tr>`).join('')}</table>` : '<p class="muted">Nobody yet.</p>'}
<form method="post" action="/ops/sites/${esc(site.id)}/people">
  <p><label>Email<br><input type="email" name="email" required autocomplete="off"></label></p>
  <p><label><input type="radio" name="role" value="owner" checked style="width:auto"> Owner (the breeder)</label> <label><input type="radio" name="role" value="editor" style="width:auto"> Editor (a helper)</label></p>
  <p><button>Invite</button> <span class="muted">Sends an invite email. Inviting an address again resends it.</span></p>
</form>`;

  const mbOf = (b) => (b ? Math.round(b / 1024 / 1024) : '');
  const limitsSection = `<h2>Limits</h2>
<p class="muted">Enforced on every upload. Empty means no limit. The breeder sees what's used on Photos and on Your site.</p>
<form method="post" action="/ops/sites/${esc(site.id)}/limits">
  <p><label>Storage, in MB<br><input name="storage_mb" inputmode="numeric" value="${esc(mbOf(site.storage_limit))}" placeholder="for example 500"></label></p>
  <p><label>Photos<br><input name="photos" inputmode="numeric" value="${esc(site.photo_limit ?? '')}" placeholder="for example 400"></label></p>
  <p><button>Save limits</button></p>
</form>`;

  const lifecycle = `<h2>Suspend or close</h2>
<form method="post" action="/ops/sites/${esc(site.id)}/${site.status === 'suspended' ? 'resume' : 'suspend'}"><p><button>${site.status === 'suspended' ? 'Turn the site back on' : 'Suspend'}</button> <span class="muted">${site.status === 'suspended' ? '' : 'Hides the site; keeps everything.'}</span></p></form>
<form method="post" action="/ops/sites/${esc(site.id)}/close">
  <p><strong>Close the site</strong>: deletes every dog, litter, page, photo, snapshot and redirect now, with no grace period. The address then shows "This breeder is no longer hosting with KennelPort" and the subdomain is held until you release it. Cloudflare's D1 keeps its own recovery copy of deleted rows for up to 30 days, which can't be turned off. Download the content first if it should be kept.</p>
  <p><label>Type <code>${esc(site.subdomain)}</code> to confirm<br><input name="confirm" autocomplete="off" required></label></p>
  <p><button>Close and delete everything</button></p>
</form>`;

  return page(`${top}${publishing}${peopleSection}${contentSection}${photoSection}${limitsSection}${lifecycle}`);
}

// ---------- routes ----------

export async function handleSites(request, env, url) {
  const m = url.pathname.match(/^\/ops\/sites(?:\/([0-9a-f-]{36}))?(?:\/(.+))?$/);
  if (!m) return null;
  const [, siteId, action] = m;
  const post = request.method === 'POST';
  const back = (note) => redirect(`/ops/sites/${siteId}?note=${note}`);

  try {
    if (!siteId) {
      if (!post) return null;
      const form = await request.formData();
      try {
        const { id } = await createSite(env, { subdomain: form.get('subdomain'), kennel_name: form.get('kennel_name') });
        return redirect(`/ops/sites/${id}?note=created`);
      } catch (err) {
        if (err instanceof SiteError) return page(`<p><a href="/ops">← Ops</a></p><p class="bad">${esc(err.message)}</p>`, 400);
        throw err;
      }
    }

    if (!action && !post) return sitePage(env, siteId, { note: url.searchParams.get('note') });

    if (action === 'content.json' && !post) {
      const doc = await exportContent(env, siteId);
      if (!doc) return page('<h1>Not found</h1>', 404);
      return new Response(JSON.stringify(doc, null, 2), {
        headers: { 'content-type': 'application/json; charset=utf-8', 'content-disposition': `attachment; filename="${doc.site.kennel_name ? 'content' : 'site'}-${siteId.slice(0, 8)}.json"`, 'cache-control': 'no-store' },
      });
    }

    let pm = action?.match(/^photos\/([0-9a-f-]{36})$/);
    if (pm && !post) {
      const p = await env.DB.prepare('SELECT r2_key, thumb_key, type FROM photos WHERE id = ? AND site_id = ?').bind(pm[1], siteId).first();
      const obj = p && await env.FILES.get(p.thumb_key || p.r2_key);
      if (!obj) return new Response('Not found', { status: 404 });
      return new Response(obj.body, { headers: { 'content-type': p.type, 'cache-control': 'private, max-age=300' } });
    }

    if (!post) return null;

    switch (action) {
      case 'publish': await publish(env, siteId, 'operator'); return back('published');
      case 'undo': await undoPublish(env, siteId); return back('undone');
      case 'preview': {
        const site = await env.DB.prepare('SELECT subdomain FROM sites WHERE id = ?').bind(siteId).first();
        const token = await makePreviewToken(env, siteId);
        return sitePage(env, siteId, { previewLink: siteLink(env, site.subdomain, `/__preview?t=${encodeURIComponent(token)}`) });
      }
      case 'content': {
        const text = String((await request.formData()).get('content') ?? '');
        let doc;
        try { doc = JSON.parse(text); } catch (err) { return sitePage(env, siteId, { error: `That isn't valid JSON: ${err.message}`, content: text }); }
        try { await importContent(env, siteId, doc); } catch (err) {
          if (err instanceof ContentError) return sitePage(env, siteId, { error: `Nothing was saved. ${err.message}`, content: text });
          throw err;
        }
        return back('imported');
      }
      case 'sample': await importContent(env, siteId, AK_SAMPLE); return back('sample');
      case 'suspend': await setSuspended(env, siteId, true); return back('suspended');
      case 'resume': await setSuspended(env, siteId, false); return back('resumed');
      case 'close': {
        const form = await request.formData();
        try { await closeSite(env, siteId, form.get('confirm')); } catch (err) {
          if (err instanceof SiteError) return sitePage(env, siteId, { error: err.message });
          throw err;
        }
        return back('closed');
      }
      case 'release': await releaseSubdomain(env, siteId); return redirect('/ops?note=released');
      case 'people': {
        const form = await request.formData();
        const site = await env.DB.prepare('SELECT subdomain FROM sites WHERE id = ?').bind(siteId).first();
        try {
          await inviteToSite(env, siteId, form.get('email'), String(form.get('role') ?? 'owner'), {
            manageUrl: env.ALLOW_HOST_OVERRIDE === '1' ? new URL(request.url).origin : `https://manage.${env.ROOT_DOMAIN}`,
            siteUrl: `https://${site?.subdomain}.${env.ROOT_DOMAIN}`,
          });
        } catch (err) {
          if (err instanceof AuthError) return sitePage(env, siteId, { error: err.message });
          throw err;
        }
        return back('invited');
      }
      case 'limits': {
        const form = await request.formData();
        const num = (v) => { const s = String(v ?? '').trim(); if (!s) return null; const n = Number(s); return Number.isInteger(n) && n > 0 && n < 1e6 ? n : NaN; };
        const mbv = num(form.get('storage_mb'));
        const photos = num(form.get('photos'));
        if (Number.isNaN(mbv) || Number.isNaN(photos)) return sitePage(env, siteId, { error: 'Limits are whole numbers above 0, or empty for none.' });
        await env.DB.prepare('UPDATE sites SET storage_limit = ?, photo_limit = ? WHERE id = ?').bind(mbv === null ? null : mbv * 1024 * 1024, photos, siteId).run();
        return back('limits');
      }
      case 'people/remove': {
        const form = await request.formData();
        await removeFromSite(env, siteId, String(form.get('email_hash') ?? ''));
        return back('removed');
      }
      case 'photos': {
        const form = await request.formData();
        const full = form.get('full');
        const thumb = form.get('thumb');
        if (!full || typeof full === 'string') return json({ message: 'No photo was sent.' }, 400);
        try {
          const saved = await savePhoto(env, siteId, { full: new Uint8Array(await full.arrayBuffer()), thumb: thumb && typeof thumb !== 'string' ? new Uint8Array(await thumb.arrayBuffer()) : null, alt: form.get('alt') });
          return json({ id: saved.id });
        } catch (err) {
          if (err instanceof PhotoError) return json({ message: err.message }, 400);
          throw err;
        }
      }
      default:
        pm = action?.match(/^photos\/([0-9a-f-]{36})\/remove$/);
        if (pm) {
          await env.DB.prepare('UPDATE photos SET removed_at = ? WHERE id = ? AND site_id = ?').bind(new Date().toISOString(), pm[1], siteId).run();
          await env.DB.prepare('UPDATE sites SET draft_changed_at = ? WHERE id = ?').bind(new Date().toISOString(), siteId).run();
          return back('photo_removed');
        }
        return null;
    }
  } catch (err) {
    if (err instanceof SiteError || /no earlier version|this site is closed|too large to publish/.test(err.message)) {
      return sitePage(env, siteId, { error: err.message });
    }
    throw err;
  }
}


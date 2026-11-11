// Her account (/s/<sub>/account, plan 4.3): storage used, download a copy of her
// site (/export.json), and deleting her site. The storage line is also on Photos. A
// screen of the Site Manager (manage/screens.js routes to it), made with what that
// file's createScreens holds for the request.
import { escapeHtml as esc } from '../../lib/html.js';
import { json } from '../../lib/http.js';
import { subjects } from '../../photoTags.js';
import { exportContent } from '../../content/io.js';
import { APP_VERSION } from '../version.js';
import { sayMessage } from '../wording.js';
import { closeSite, SiteError } from '../../sites.js';
import { FRESH_SIGN_IN_MS } from './parts.js';

export function accountScreens({ base, env, errorBox, request, say, site, tags, url, user }) {
  // ---------- storage, download a copy, delete my site (plan 4.3) ----------
  async function usage() {
    const limits = await env.DB.prepare('SELECT storage_limit, photo_limit FROM sites WHERE id = ?').bind(site.id).first();
    const used = await env.DB.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(bytes), 0) AS bytes FROM photos WHERE site_id = ? AND removed_at IS NULL').bind(site.id).first();
    return { ...used, ...limits };
  }

  const mb = (b) => `${Math.round(b / 1024 / 1024 * 10) / 10} MB`;

  async function usageLine() {
    const u = await usage();
    const parts = [`${u.n} photo${u.n === 1 ? '' : 's'}${u.photo_limit ? ` of ${u.photo_limit}` : ''}`, `${mb(u.bytes)}${u.storage_limit ? ` of ${mb(u.storage_limit)}` : ''} used`];
    const near = (u.storage_limit && u.bytes > u.storage_limit * 0.9) || (u.photo_limit && u.n > u.photo_limit * 0.9);
    return `<p class="${near ? 'error' : 'muted'} small">${esc(parts.join(' · '))}${near ? '. Nearly full: remove photos you no longer use, or ask KennelPort for more room.' : ''}</p>`;
  }

  async function exportManifest() {
    const content = await exportContent(env, site.id);
    const { results: rows } = await env.DB.prepare('SELECT kind, name, email, phone, topic, message, answers, received_at FROM inquiries WHERE site_id = ? ORDER BY received_at').bind(site.id).all();
    const msgs = rows.map(({ answers, ...m }) => (m.kind === 'application' ? { ...m, answers: JSON.parse(answers || '[]') } : m));
    const { results: ph } = await env.DB.prepare('SELECT id, alt, type, width, height, created_at FROM photos WHERE site_id = ? AND removed_at IS NULL ORDER BY created_at').bind(site.id).all();
    const t = await tags();
    const names = new Map((await subjects(env, site.id)).map((x) => [x.subject, x.label]));
    const date = new Date().toISOString().slice(0, 10);
    return json({
      filename: `${site.subdomain}-kennelport-${date}.zip`,
      readme: `A copy of ${site.kennel_name || site.subdomain}'s KennelPort website, made ${date}.\n\n`
        + 'content.json: everything on the site (dogs, litters, puppies, pages, reviews, extras...), in the form KennelPort can load back.\n'
        + 'messages.json: the messages and applications in your Inbox.\nwaitlist.json: your waitlist, in order, and the families marked fulfilled.\nphotos.json: each photo\'s description and what it\'s of; the photos are in photos/, named by their id.\n',
      content, messages: msgs,
      waitlist: (await env.DB.prepare('SELECT name, list_name, email, phone, wants, added_on, status, done_at FROM waitlist_entries WHERE site_id = ? ORDER BY status DESC, sort').bind(site.id).all()).results,
      photos: ph.map((p) => ({ ...p, of: (t.get(p.id) ?? []).filter((x) => names.has(x)).map((x) => names.get(x)), file: `${p.id}.${p.type === 'image/webp' ? 'webp' : 'jpg'}`, url: `${base}/photos/${p.id}/full` })),
    });
  }

  async function account() {
    const rest = url.pathname.slice(`${base}/account`.length);
    const owner = site.role === 'owner';
    const fresh = Date.now() - Date.parse(user.signedInAt) <= FRESH_SIGN_IN_MS;
    const storage = await usageLine();
    const render = (err) => ({
      title: say('account.your_site_2'), back: base,
      body: `<section class="card"><h2>${esc(say('account.storage'))}</h2>${storage}</section>
        <section class="card"><h2>${esc(say('account.download_a_copy_2'))}</h2><p class="muted">${esc(say('account.a_zip_of_your'))}</p>
          <p><button id="export" data-manifest="${base}/export.json">${esc(say('account.download_a_copy'))}</button></p><p id="export-status" class="muted small" role="status"></p></section>
        ${owner ? `<section class="card danger"><h2>${esc(say('account.delete_my_site_2'))}</h2>
          <p>${esc(say('account.this_deletes_every_dog'))} <strong>${esc(say('account.straight_away'))}</strong>${esc(say('account.there_s_no_undo'))}</p>
          <p class="muted small">${esc(say('account.your_address_then_shows'))}</p>
          ${errorBox(err)}
          ${fresh ? `<form method="post" action="${base}/account/delete">
            <label>${esc(say('account.type'))} <strong>${esc(site.subdomain)}</strong> ${esc(say('account.to_confirm'))}<input name="confirm" autocomplete="off" autocapitalize="none" spellcheck="false" required></label>
            <button>${esc(say('account.delete_my_site'))}</button></form>`
          : `<p>${esc(say('account.for_safety_deleting_needs'))} <form method="post" action="/signout" class="inline"><button class="link">${esc(say('account.sign_out'))}</button></form>${esc(say('account.sign_in_again_then'))}</p>`}
        </section>` : ''}
        <script src="/_kp/m/zip.js?v=${APP_VERSION}" defer></script>`,
    });
    if (rest === '/delete' && request.method === 'POST') {
      if (!owner) return { title: say('account.your_site'), back: base, body: `<p class="error">${esc(say('account.only_the_owner_can'))}</p>` };
      if (!fresh) return render(say('account.sign_in_again_first'));
      try { await closeSite(env, site.id, (await request.formData()).get('confirm')); } catch (err) {
        if (err instanceof SiteError) return render(sayMessage('account', err.message, say));
        throw err;
      }
      return new Response(null, { status: 303, headers: { location: '/deleted', 'cache-control': 'no-store' } });
    }
    if (rest || request.method === 'POST') return null;
    return render();
  }

  return { usage, mb, usageLine, exportManifest, account };
}

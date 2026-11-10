// /ops: a site's full backup and its restore (src/backup.js,
// docs/plans/backup-format.md). Behind the ops sign-in (ops.js has checked it).
// The pages here hold a button and a status line; public/_kp/o/backup.js asks for
// the pieces and makes, or reads, the zip in the browser.
//
//   GET  /ops/backup/<site id>            the page
//   GET  /ops/backup/<site id>/manifest   what the site has
//   GET  /ops/backup/<site id>/rows       ?table=&after=: a page of rows
//   GET  /ops/backup/<site id>/file       ?key=: one file
//   GET  /ops/restore                     the page
//   POST /ops/restore/begin | rows | file | finish | abandon
import { escapeHtml as esc, htmlPage } from '../lib/html.js';
import { json } from '../lib/http.js';
import { APP_VERSION } from '../manage/version.js';
import {
  backupManifest, backupRows, backupFile, restoreBegin, restoreRows, restoreFile, restoreFinish, restoreAbandon, BackupError,
} from '../backup.js';

const TITLE = 'KennelPort ops';
const CSP = "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'";
// Not one of the versioned sets (CLAUDE.md): only the operator loads it. Change
// this number with the file, so her browser takes the new one.
const SCRIPT = `<script src="/_kp/m/zip.js?v=${APP_VERSION}" defer></script><script src="/_kp/o/backup.js?v=1" defer></script>`;
const page = (body, status = 200) => htmlPage(TITLE, body, { status, headers: { 'content-security-policy': CSP } });

// A JSON body of any size a backup's page of rows needs (lib/http.js readJson
// stops at 64 KB, right for the API, too small here).
async function body(request) {
  try { return await request.json(); } catch { throw new BackupError('That wasn\'t readable.'); }
}

export async function handleBackup(request, env, url) {
  const post = request.method === 'POST';
  try {
    let m = url.pathname.match(/^\/ops\/backup\/([0-9a-f-]{36})(?:\/(manifest|rows|file))?$/);
    if (m && !post) {
      const [, siteId, what] = m;
      if (what === 'manifest') {
        const manifest = await backupManifest(env, siteId);
        return manifest ? json(manifest) : json({ message: 'No such site.' }, 404);
      }
      if (what === 'rows') return json(await backupRows(env, siteId, url.searchParams.get('table'), url.searchParams.get('after') ?? 0));
      if (what === 'file') {
        const obj = await backupFile(env, siteId, url.searchParams.get('key'));
        if (!obj) return new Response('Not found', { status: 404 });
        return new Response(obj.body, { headers: { 'content-type': 'application/octet-stream', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
      }
      const site = await env.DB.prepare('SELECT subdomain, kennel_name, status FROM sites WHERE id = ?').bind(siteId).first();
      if (!site || site.status === 'closed') return page('<h1>Not found</h1><p><a href="/ops">Back to ops</a></p>', 404);
      return page(`<p><a href="/ops/sites/${esc(siteId)}">← ${esc(site.kennel_name || site.subdomain)}</a></p>
<h1>Full backup</h1>
<p>One zip with everything this site holds: every record as stored (dogs, litters, pages and their builds, the inbox, the waitlist, the KennelOS link, the puppy portal's families and their records), every photo and file, and each published version. It is made here in this browser, a piece at a time, so keep this tab open until the download starts.</p>
<p class="muted">The zip holds families' and visitors' names, addresses and messages, readable. Keep it somewhere private. What is in it and how to put it back: <code>docs/plans/backup-format.md</code>.</p>
<p><button id="backup" data-base="/ops/backup/${esc(siteId)}" data-name="${esc(site.subdomain)}">Download the full backup</button></p>
<p id="status" role="status"></p>${SCRIPT}`);
    }

    if (url.pathname === '/ops/restore' && !post) {
      return page(`<p><a href="/ops">← Ops</a></p>
<h1>Restore a site from a backup</h1>
<p>Choose a full backup zip made on a site's Full backup page. The site comes back as it was: same address, same records, photos and files, live again if it was live. It only goes in where that site isn't: a restore never writes over a site that is here. To replace one, close it and release its subdomain first.</p>
<p class="muted">Breeders and families sign in again afterwards (sign-ins aren't in a backup). Their access comes back with it as long as this KennelPort still has the same EMAIL_HMAC_KEY and PORTAL_EMAIL_KEY secrets.</p>
<p><input type="file" id="zip" accept=".zip,application/zip"></p>
<p><button id="restore" data-base="/ops/restore">Restore</button></p>
<p id="status" role="status"></p>${SCRIPT}`);
    }

    m = url.pathname.match(/^\/ops\/restore\/(begin|rows|file|finish|abandon)$/);
    if (m && post) {
      if (m[1] === 'file') {
        const siteId = url.searchParams.get('site');
        return json(await restoreFile(env, siteId, url.searchParams.get('key'), request.body, url.searchParams.get('type')));
      }
      const input = await body(request);
      if (m[1] === 'begin') return json(await restoreBegin(env, input));
      if (m[1] === 'rows') return json(await restoreRows(env, input.site_id, input.table, input.rows));
      if (m[1] === 'finish') return json(await restoreFinish(env, input.site_id));
      await restoreAbandon(env, input.site_id);
      return json({ ok: true });
    }
  } catch (err) {
    if (err instanceof BackupError) return json({ message: err.message }, 400);
    throw err;
  }
  return null;
}

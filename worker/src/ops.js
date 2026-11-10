// /ops on the manage host: the operator's page (plan 2.2): sign in, check that D1
// and R2 are bound and working, apply migrations, and the sites (ops/sites.js:
// create, content, photos, preview, publish, undo, suspend, close).
//
// Access is the OPS_TOKEN Worker secret, typed in once and held in a signed,
// HttpOnly cookie, as in KennelOS cloud's /ops. Until the secret is set the page
// refuses everything and says how to set it: it never falls open. Breeder
// accounts have no way in.
import { applyPending, migrationStatus } from './migrate.js';
import { resetGateCache } from './gate.js';
import { hmacHex, timingSafeEqual } from './lib/crypto.js';
import { readCookie } from './lib/http.js';
import { escapeHtml as esc, htmlPage } from './lib/html.js';
import { handleSites, sitesSection } from './ops/sites.js';
import { usageSection } from './ops/usage.js';
import { handleBackup } from './ops/backup.js';
import { mailMode, outboxRecent } from './mail.js';
import { vapidConfig, generateVapidKeys } from './push.js';
import { turnstileOn } from './siteforms.js';
import { adminCookie, clearAdminCookie } from './admin.js';

const COOKIE = 'ops_session';
const SESSION_SECONDS = 12 * 60 * 60;
const TITLE = 'KennelPort ops';

async function mintCookie(secret) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  return `${expires}.${await hmacHex(secret, `ops:${expires}`)}`;
}

async function cookieValid(secret, value) {
  if (!value) return false;
  const [expiresRaw, sig] = value.split('.');
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires * 1000 < Date.now()) return false;
  return timingSafeEqual(sig ?? '', await hmacHex(secret, `ops:${expires}`));
}

const redirect = (location, headers = {}) => new Response(null, { status: 303, headers: { location, ...headers } });
// Ops's own cookie, and the one that makes this device admin in the Site Manager
// (admin.js): signing in to /ops does both, signing out undoes both.
const redirectWithCookies = (location, cookies) => {
  const headers = new Headers({ location });
  for (const c of cookies) headers.append('set-cookie', c);
  return new Response(null, { status: 303, headers });
};

function loginPage(error) {
  return htmlPage(TITLE, `<h1>${TITLE}</h1>
${error ? `<p class="bad">${esc(error)}</p>` : ''}
<form method="post" action="/ops/login">
  <p><label>Ops token<br><input type="password" name="token" autocomplete="current-password" required></label></p>
  <p><button>Sign in</button></p>
</form>`, { status: error ? 401 : 200 });
}

// Is each binding there and answering? Never throws: a missing binding is what
// this section is for.
export async function bindingChecks(env) {
  const checks = [];
  try {
    if (!env.DB) throw new Error('not bound');
    const one = await env.DB.prepare('SELECT 1 AS one').first('one');
    checks.push({ name: 'D1 (DB)', ok: one === 1, detail: 'query answered' });
  } catch (err) {
    checks.push({ name: 'D1 (DB)', ok: false, detail: String(err?.message ?? err) });
  }
  try {
    if (!env.FILES) throw new Error('not bound');
    const key = '_ops/check.txt';
    const stamp = new Date().toISOString();
    await env.FILES.put(key, stamp);
    const obj = await env.FILES.get(key);
    const back = obj ? new TextDecoder().decode(await obj.arrayBuffer()) : null;
    await env.FILES.delete(key);
    checks.push({ name: 'R2 (FILES)', ok: back === stamp, detail: 'write, read and delete worked' });
  } catch (err) {
    checks.push({ name: 'R2 (FILES)', ok: false, detail: String(err?.message ?? err) });
  }
  checks.push({ name: 'Root domain', ok: Boolean(env.ROOT_DOMAIN), detail: env.ROOT_DOMAIN ? esc(env.ROOT_DOMAIN) : 'ROOT_DOMAIN not set' });
  checks.push({ name: 'Sign-in key', ok: Boolean(env.EMAIL_HMAC_KEY), detail: env.EMAIL_HMAC_KEY ? 'EMAIL_HMAC_KEY set' : 'Add the secret EMAIL_HMAC_KEY (a long random string; never change it once breeders sign in)' });
  const mode = mailMode(env);
  checks.push({ name: 'Push notifications', ok: vapidConfig(env).ready, detail: vapidConfig(env).ready ? 'VAPID_PRIVATE_JWK set' : 'Press Make push keys below and add the result as the secret VAPID_PRIVATE_JWK' });
  checks.push({ name: 'Spam check', ok: turnstileOn(env), detail: turnstileOn(env) ? 'Turnstile on for the contact and review forms' : 'Turnstile off: forms rely on the honeypot and rate limits. Add TURNSTILE_SITE_KEY (variable) and TURNSTILE_SECRET (secret)' });
  checks.push({ name: 'Email', ok: Boolean(mode), detail: mode === 'resend' ? 'Resend (RESEND_API_KEY set)' : mode === 'outbox' ? 'Staging outbox: codes and invites show below instead of being emailed' : 'Add the secret RESEND_API_KEY; until then nobody can sign in' });
  return checks;
}

async function statusPage(env, log = null, note = null, keys = null) {
  const pushKeysHtml = vapidConfig(env).ready ? '' : `<h2>Push keys</h2>${keys ? `<p>Add this as the Worker <strong>secret</strong> <code>VAPID_PRIVATE_JWK</code> (it is shown once, and kept nowhere):</p><pre>${esc(keys.privateJwk)}</pre>` : '<form method="post" action="/ops/push-keys"><p><button>Make push keys</button></p></form>'}`;
  const checks = await bindingChecks(env);
  const dbOk = checks[0].ok;
  const rows = dbOk ? await migrationStatus(env.DB) : [];
  const pending = rows.some((r) => r.state !== 'applied');
  const envName = env.ENV_NAME || 'unknown';
  const sites = dbOk && !pending ? await sitesSection(env) : '';
  const usage = dbOk && !pending ? await usageSection(env) : '';
  const outbox = dbOk && !pending && mailMode(env) === 'outbox' ? await outboxRecent(env) : [];
  const outboxHtml = outbox.length ? `<h2>Staging outbox</h2><p class="muted">What would have been emailed, newest first. Addresses aren't kept.</p>${outbox.map((m) => `<pre>${esc(m.created_at.slice(0, 16).replace('T', ' '))} · ${esc(m.kind)}\n${esc(m.subject)}\n\n${esc(m.body)}</pre>`).join('')}` : '';

  const checkRows = checks.map((c) => `<tr><td>${esc(c.name)}</td><td class="${c.ok ? 'ok' : 'bad'}">${c.ok ? 'OK' : 'Problem'}</td><td>${c.detail}</td></tr>`).join('');
  const migRows = rows.map((r) => `<tr><td><code>${esc(r.id)}</code></td><td>${esc(r.name)}</td><td class="${r.state === 'applied' ? 'ok' : 'bad'}">${esc(r.state)}</td><td class="muted">${esc(r.applied_at ?? '')}</td></tr>`).join('');
  const logHtml = log ? `<h2>Last run</h2><pre>${esc(log.map((l) => l.ok ? `${l.id} ${l.name}: applied (${l.statements} statements)` : `${l.id} ${l.name}: FAILED: ${l.error}\n${(l.statementList ?? []).map((s, i) => `  [${i + 1}] ${s}`).join('\n')}`).join('\n') || 'Nothing pending.')}</pre>` : '';

  return htmlPage(TITLE, `<h1>${TITLE}</h1>
<p class="muted">Environment: <strong>${esc(envName)}</strong></p>
<p>You're admin in the Site Manager on this device: <a href="/">open every site's build</a>.</p>
${note === 'released' ? '<p class="ok">Subdomain released.</p>' : ''}
${usage}
${sites}
<h2>Setup checks</h2>
<table>${checkRows}</table>
<h2>Migrations</h2>
${dbOk ? `<table><tr><th>Id</th><th>Name</th><th>State</th><th>Applied</th></tr>${migRows}</table>
${pending ? '<form method="post" action="/ops/migrate"><p><button>Apply pending</button></p></form>' : '<p class="ok">The database matches this deploy.</p>'}` : '<p class="bad">D1 isn\'t working, so migrations can\'t be read.</p>'}
${outboxHtml}
${logHtml}
${pushKeysHtml}
<form method="post" action="/ops/logout"><p><button>Sign out</button></p></form>`);
}

export async function handleOps(request, env) {
  const url = new URL(request.url);

  if (!env.OPS_TOKEN) {
    return htmlPage(TITLE, `<h1>${TITLE}</h1><p class="bad"><strong>OPS_TOKEN is not set.</strong></p>
<p>In the Cloudflare dashboard: Workers &amp; Pages → this Worker → Settings → Variables and Secrets,
add <code>OPS_TOKEN</code> as a <em>Secret</em> (a long random string). Ops is closed until it is set.</p>`, { status: 503 });
  }

  if (url.pathname === '/ops/login' && request.method === 'POST') {
    const form = await request.formData();
    if (!timingSafeEqual(String(form.get('token') ?? ''), env.OPS_TOKEN)) return loginPage('That token is not right.');
    return redirectWithCookies('/ops', [
      `${COOKIE}=${await mintCookie(env.OPS_TOKEN)}; Path=/ops; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`,
      await adminCookie(env),
    ]);
  }

  if (!(await cookieValid(env.OPS_TOKEN, readCookie(request, COOKIE)))) return loginPage(null);

  if (url.pathname === '/ops/logout' && request.method === 'POST') {
    return redirectWithCookies('/ops', [`${COOKIE}=; Path=/ops; HttpOnly; Secure; SameSite=Strict; Max-Age=0`, clearAdminCookie()]);
  }

  if (url.pathname === '/ops/migrate' && request.method === 'POST') {
    const { log } = await applyPending(env.DB);
    resetGateCache();
    return statusPage(env, log);
  }

  if (url.pathname === '/ops/push-keys' && request.method === 'POST') return statusPage(env, null, null, await generateVapidKeys());
  if (url.pathname === '/ops' && request.method === 'GET') return statusPage(env, null, url.searchParams.get('note'));
  if (url.pathname.startsWith('/ops/backup/') || url.pathname.startsWith('/ops/restore')) {
    const res = await handleBackup(request, env, url);
    if (res) return res;
  }
  if (url.pathname.startsWith('/ops/sites')) {
    const res = await handleSites(request, env, url);
    if (res) return res;
  }
  return htmlPage(TITLE, '<h1>Not found</h1>', { status: 404 });
}

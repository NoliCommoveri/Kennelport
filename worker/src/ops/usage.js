// /ops's usage table: what KennelPort holds and sends, this month and now, beside
// the free tiers it runs on. Months are UTC calendar months.
import { escapeHtml as esc } from '../lib/html.js';
import { mailMode } from '../mail.js';

// Cloudflare R2's free storage (10 GB-month) and Resend's free sending
// (3,000 emails a month, at most 100 a day).
export const R2_FREE_BYTES = 10 * 1000 ** 3;
export const MAIL_FREE_MONTH = 3000;
export const MAIL_FREE_DAY = 100;

export function size(bytes) {
  const n = Number(bytes) || 0;
  if (n >= 1000 ** 3) return `${(n / 1000 ** 3).toFixed(2)} GB`;
  if (n >= 1000 ** 2) return `${(n / 1000 ** 2).toFixed(1)} MB`;
  return `${Math.round(n / 1000)} KB`;
}
const pct = (part, whole) => `${((100 * part) / whole).toFixed(part && part < whole / 1000 ? 2 : 1)}%`;
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export async function usageNumbers(env, now = new Date()) {
  const month = now.toISOString().slice(0, 7);
  const monthStart = `${month}-01`;
  const today = now.toISOString().slice(0, 10);
  const one = (sql, ...args) => env.DB.prepare(sql).bind(...args).first();
  const all = async (sql, ...args) => (await env.DB.prepare(sql).bind(...args).all()).results;

  const [sites, sitesNew, photos, photosNew, removed, snaps, mailMonth, mailToday, messages, messagesNew, accounts, push] = await Promise.all([
    // Demo sites (kennelos/demo.js) aren't breeders' sites: not counted.
    all('SELECT status, COUNT(*) AS n FROM sites WHERE demo_step IS NULL GROUP BY status'),
    one('SELECT COUNT(*) AS n FROM sites WHERE created_at >= ? AND demo_step IS NULL', monthStart),
    one('SELECT COUNT(*) AS n, COALESCE(SUM(bytes), 0) AS bytes FROM photos WHERE removed_at IS NULL'),
    one('SELECT COUNT(*) AS n, COALESCE(SUM(bytes), 0) AS bytes FROM photos WHERE created_at >= ?', monthStart),
    one('SELECT COUNT(*) AS n, COALESCE(SUM(bytes), 0) AS bytes FROM photos WHERE removed_at IS NOT NULL AND purged_at IS NULL'),
    one('SELECT COUNT(*) AS n, COALESCE(SUM(bytes), 0) AS bytes FROM snapshots'),
    all('SELECT kind, SUM(n) AS n FROM mail_counts WHERE day >= ? GROUP BY kind ORDER BY kind', monthStart),
    one('SELECT COALESCE(SUM(n), 0) AS n FROM mail_counts WHERE day = ?', today),
    one('SELECT COUNT(*) AS n FROM inquiries'),
    one('SELECT COUNT(*) AS n FROM inquiries WHERE received_at >= ?', monthStart),
    one('SELECT COUNT(DISTINCT email_hash) AS joined, (SELECT COUNT(*) FROM site_users WHERE joined_at IS NULL) AS waiting, (SELECT COUNT(DISTINCT email_hash) FROM site_users WHERE joined_at >= ?) AS fresh FROM site_users WHERE joined_at IS NOT NULL', monthStart),
    one('SELECT COUNT(*) AS n FROM push_subscriptions'),
  ]);
  return {
    month,
    sites: Object.fromEntries(sites.map((s) => [s.status, s.n])),
    sitesNew: sitesNew.n,
    photos, photosNew, removed, snaps,
    r2Bytes: photos.bytes + removed.bytes + snaps.bytes,
    mail: { byKind: Object.fromEntries(mailMonth.map((m) => [m.kind, m.n])), month: mailMonth.reduce((t, m) => t + m.n, 0), today: mailToday.n },
    messages: messages.n, messagesNew: messagesNew.n,
    accounts,
    push: push.n,
  };
}

export async function usageSection(env, now = new Date()) {
  const u = await usageNumbers(env, now);
  const monthName = new Date(`${u.month}-01T00:00:00Z`).toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
  const statusList = ['live', 'draft', 'suspended', 'closed'].filter((s) => u.sites[s]).map((s) => `${u.sites[s]} ${s}`).join(' · ') || 'none';
  const kinds = Object.entries(u.mail.byKind).map(([k, n]) => `${n} ${k}${n === 1 ? '' : 's'}`).join(', ');
  const outbox = mailMode(env) === 'outbox';
  const rows = [
    ['Sites', `${u.sitesNew} new`, statusList, ''],
    ['Photos on sites', `${u.photosNew.n} added`, `${u.photos.n} · ${size(u.photos.bytes)}`, ''],
    ['Removed photos still in R2', '', `${u.removed.n} · ${size(u.removed.bytes)}`, 'Deleted by the daily cleanup once no kept version uses them'],
    ['Published versions kept', '', `${u.snaps.n} · ${size(u.snaps.bytes)}`, ''],
    ['R2 storage', '', size(u.r2Bytes), `10 GB · ${pct(u.r2Bytes, R2_FREE_BYTES)} used`],
    [outbox ? 'Emails (staging outbox, not sent)' : 'Emails sent', `${u.mail.month}${kinds ? ` (${kinds})` : ''}`, `${u.mail.today} today`, `${MAIL_FREE_MONTH.toLocaleString('en-US')} a month · ${pct(u.mail.month, MAIL_FREE_MONTH)} used; ${MAIL_FREE_DAY} a day`],
    ['Messages from site forms', `${u.messagesNew} received`, `${u.messages} kept`, 'Deleted after 90 days'],
    ['Breeder accounts', `${u.accounts.fresh} joined`, `${plural(u.accounts.joined, 'account')}${u.accounts.waiting ? ` · ${plural(u.accounts.waiting, 'invite')} not yet taken` : ''}`, ''],
    ['Push subscriptions', '', String(u.push), ''],
  ];
  const near = u.r2Bytes > R2_FREE_BYTES * 0.8 || u.mail.month > MAIL_FREE_MONTH * 0.8 || u.mail.today > MAIL_FREE_DAY * 0.8;
  return `<h2>Usage</h2>
<table><tr><th></th><th>${esc(monthName)}</th><th>Now</th><th>Free tier</th></tr>
${rows.map(([what, month, current, free]) => `<tr><td>${esc(what)}</td><td>${esc(month)}</td><td>${esc(current)}</td><td class="muted">${esc(free)}</td></tr>`).join('\n')}
</table>
${near ? '<p class="bad">Over 80% of a free tier.</p>' : ''}<p class="muted">Sizes count each photo with its thumbnail. Emails are counted from when this table started.</p>`;
}

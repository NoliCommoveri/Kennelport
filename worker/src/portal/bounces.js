// Resend's delivery results for the portal's emails (docs/plans/family-portal.md
// section 5: the reminder log is her evidence, and a bounce alerts her so she can
// text the family). Resend posts its events, signed the Svix way, to
//
//   POST api.kennelport.com/v1/resend   (RESEND_WEBHOOK_SECRET: "whsec_<base64>")
//
// email.delivered → delivered; email.bounced and email.complained → bounced. Only
// the portal's log is touched, matched by Resend's message id; the event's address
// is never read or kept. A bounce shows on her Today and the family's reminder log.
import { json } from '../lib/http.js';
import { timingSafeEqual } from '../lib/crypto.js';
import { notify } from '../push.js';

const TOLERANCE_S = 5 * 60;
const b64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));

// Svix: HMAC-SHA256 over "<id>.<timestamp>.<body>" with the secret's bytes, base64;
// the header holds one or more "v1,<sig>" separated by spaces.
export async function svixValid(secret, headers, body, nowS = Math.floor(Date.now() / 1000)) {
  const id = headers.get('svix-id');
  const ts = headers.get('svix-timestamp');
  const sigs = String(headers.get('svix-signature') ?? '').split(' ').map((x) => x.split(',')[1]).filter(Boolean);
  if (!secret || !id || !/^\d{1,12}$/.test(ts ?? '') || !sigs.length) return false;
  if (Math.abs(nowS - Number(ts)) > TOLERANCE_S) return false;
  let keyBytes;
  try { keyBytes = Uint8Array.from(atob(String(secret).replace(/^whsec_/, '')), (c) => c.charCodeAt(0)); } catch { return false; }
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mine = b64(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${ts}.${body}`)));
  return sigs.some((s) => timingSafeEqual(s, mine));
}

const RESULT = { 'email.delivered': 'delivered', 'email.bounced': 'bounced', 'email.complained': 'bounced' };

export async function handleResendEvent(request, env) {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const body = await request.text();
  if (body.length > 64 * 1024) return json({ error: 'too_large' }, 413);
  if (!(await svixValid(env.RESEND_WEBHOOK_SECRET, request.headers, body))) return json({ error: 'bad_signature' }, 401);
  let event;
  try { event = JSON.parse(body); } catch { return json({ error: 'bad_json' }, 400); }
  const result = RESULT[event?.type];
  const id = event?.data?.email_id;
  if (!result || typeof id !== 'string' || !/^[\w-]{1,100}$/.test(id)) return json({ ok: true, ignored: true });
  // A bounce wins over delivered; delivered never undoes a bounce.
  const res = await env.DB.prepare(`UPDATE portal_email_log SET result = ? WHERE provider_id = ? AND result IN (${result === 'bounced' ? "'sent', 'delivered'" : "'sent'"})`).bind(result, id).run();
  if (result === 'bounced' && res.meta.changes) {
    const row = await env.DB.prepare('SELECT l.site_id, l.family_id, f.name FROM portal_email_log l LEFT JOIN portal_families f ON f.id = l.family_id WHERE l.provider_id = ? LIMIT 1').bind(id).first();
    if (row) await notify(env, row.site_id, 'notice', row.name ? String(row.name).replace(/^the\s+/i, '') : null, `portal-bounce:${row.family_id ?? ''}`);
  }
  return json({ ok: true, updated: res.meta.changes });
}

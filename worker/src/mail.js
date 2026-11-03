// Email: sign-in codes and invites only (plan 2.2; inquiries are never emailed,
// decision 12). The provider is Resend, as in KennelOS cloud.
//
// - With the RESEND_API_KEY secret set, mail goes through Resend from MAIL_FROM.
// - Without it, staging (DEV_OUTBOX = "1") keeps the message in dev_outbox, keyed
//   by the address HASH, and /ops shows it.
// - With neither (production before the key is set), sign-in and invites refuse
//   with a clear message rather than pretending something was sent.
//
// The address is used only inside this call: never stored, never logged. A failed
// send logs Resend's status code and nothing else.
const RESEND_URL = 'https://api.resend.com/emails';

export class MailError extends Error {}

export function mailMode(env) {
  if (env.RESEND_API_KEY) return 'resend';
  if (env.DEV_OUTBOX === '1') return 'outbox';
  return null;
}

export async function sendMail(env, { to, emailHash, kind, subject, text }) {
  const mode = mailMode(env);
  if (mode === 'outbox') {
    await env.DB.prepare('INSERT INTO dev_outbox (email_hash, kind, subject, body, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(emailHash, kind, subject, text, new Date().toISOString()).run();
    await countMail(env, kind);
    return;
  }
  if (mode !== 'resend') throw new MailError('Email isn\'t set up yet (RESEND_API_KEY).');
  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: env.MAIL_FROM || 'KennelPort <signin@kennelport.com>', to: [to], subject, text }),
  });
  if (!res.ok) {
    console.error(`mail: resend answered ${res.status}`);
    throw new MailError('The email could not be sent. Try again in a minute.');
  }
  await countMail(env, kind);
}

// One more email of this kind today (/ops's usage table). Never stops a send.
async function countMail(env, kind) {
  try {
    await env.DB.prepare('INSERT INTO mail_counts (day, kind, n) VALUES (?, ?, 1) ON CONFLICT (day, kind) DO UPDATE SET n = n + 1')
      .bind(new Date().toISOString().slice(0, 10), String(kind || 'other')).run();
  } catch (err) {
    console.error(`mail: count failed: ${err?.message ?? err}`);
  }
}

// Plain text, no tracking, no links in the code email (a tapped link would open
// the browser, not the installed app).
export const codeMessage = (code, minutes) => ({
  subject: `Your KennelPort code: ${code}`,
  text: `Your KennelPort sign-in code is ${code}\n\nType it into KennelPort Site Manager within ${minutes} minutes.\n\nIf you didn't ask for this code, you can ignore this email.\n`,
});

export const inviteMessage = ({ kennelName, manageUrl, siteUrl }) => ({
  subject: `Your website, ${kennelName}, is ready to manage`,
  text: `You've been invited to manage ${kennelName}'s website (${siteUrl}).\n\n`
    + `Open ${manageUrl} and sign in with this email address. We'll send you a 6-digit code; there's no password.\n\n`
    + 'On a phone, add that page to your home screen to keep KennelPort Site Manager one tap away.\n\n'
    + "If you weren't expecting this, you can ignore it.\n",
});

export async function outboxRecent(env, limit = 15) {
  try {
    return (await env.DB.prepare('SELECT kind, subject, body, created_at FROM dev_outbox ORDER BY id DESC LIMIT ?').bind(limit).all()).results;
  } catch {
    return [];
  }
}

// The portal's hourly job (wrangler.toml crons): start the vet clock for pickups
// that passed unmarked, then send whatever reminders are due (vet.js says which),
// to every address the family has, logging each send (plan section 5).
import { sendMail, MailError } from '../mail.js';
import { startAssumedClocks, getSettings, familyEmails } from './store.js';
import { dueReminders } from './vet.js';
import { vetMessage } from './messages.js';
import { portalBase } from './auth.js';

export async function sendDueFor(env, site, p, settings, now = new Date()) {
  const { results: log } = await env.DB.prepare("SELECT kind, basis, MIN(sent_at) AS at FROM portal_email_log WHERE placement_id = ? AND result != 'failed' GROUP BY kind, basis").bind(p.id).all();
  const sent = new Map(log.map((r) => [`${r.kind}|${r.basis}`, Date.parse(r.at)]));
  const due = dueReminders(p, settings, now, sent);
  if (!due.length) return 0;
  const kennel = site.kennel_name || site.subdomain;
  const emails = await familyEmails(env, p.family_id);
  const pup = p.call_name || p.puppy_name;
  let n = 0;
  for (const { kind, basis } of due) {
    const msg = vetMessage(kind, { kennel, pup, p, s: settings, base: portalBase(env, site), now });
    for (const e of emails) {
      let result = 'failed';
      let providerId = null;
      try {
        const r = await sendMail(env, { to: e.email, emailHash: e.email_hash, kind, fromName: kennel, ...msg });
        result = r.outbox ? 'outbox' : 'sent';
        providerId = r.id;
        n++;
      } catch (err) {
        if (!(err instanceof MailError)) throw err;
        console.error(`portal: ${kind} not sent`);
      }
      await env.DB.prepare('INSERT INTO portal_email_log (site_id, family_id, placement_id, kind, basis, address_hash, provider_id, result, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(site.id, p.family_id, p.id, kind, basis, e.email_hash, providerId, result, new Date(now).toISOString()).run();
    }
  }
  return n;
}

export async function runPortalHourly(env, now = new Date()) {
  const started = await startAssumedClocks(env, now);
  const { results } = await env.DB.prepare(`SELECT p.*, s.subdomain, s.kennel_name, d.hostname AS domain FROM portal_placements p
    JOIN sites s ON s.id = p.site_id JOIN portal_families f ON f.id = p.family_id
    LEFT JOIN custom_domains d ON d.site_id = s.id AND d.status = 'active'
    WHERE s.portal_on = 1 AND s.status != 'closed' AND f.status = 'active' AND f.deleted_at IS NULL AND p.status = 'open' AND p.life_status = 'with_family'
      AND (p.vet_deadline_at IS NULL OR p.vet_deadline_at > ?)`).bind(new Date(now).toISOString()).all();
  const settings = new Map();
  let sent = 0;
  for (const p of results) {
    if (!settings.has(p.site_id)) settings.set(p.site_id, await getSettings(env, p.site_id));
    const site = { id: p.site_id, subdomain: p.subdomain, kennel_name: p.kennel_name, domain: p.domain };
    try {
      sent += await sendDueFor(env, site, p, settings.get(p.site_id), now);
    } catch (err) {
      console.error(`portal: reminders for one placement failed: ${err?.message ?? err}`);
    }
  }
  return { started: started.length, sent };
}

// The family's account over time (docs/Puppy_Parent_Portal_Plan.md sections 2, 7.4
// and 10; build chunk 4): messages from pickup on, her note when a puppy is lost
// before pickup, her delete (undoable for 30 days), a back-out's account going the
// same way, and the erase a family asks for.
//
// Two kinds of data on two clocks (plan 10): the family's account (sign-in,
// addresses, sessions, messages, their ticks) goes with an erase or a final delete;
// her sale records (placement, health records, contract, vet proof, reminder log)
// stay with an erase, the family reduced to the name she can read. A final delete
// (her own choice) takes both, as it did before. The full retention clocks, with
// their warnings, come with phase 2.
import { PortalError, deleteFamily, getFamily, getPlacement, applyChanges, familyEmails } from './store.js';
import { tombstoneStatements } from './feed.js';
import { sendMail, MailError } from '../mail.js';
import { notify } from '../push.js';
import { portalBase } from './auth.js';

export const UNDO_DAYS = 30;
const DAY = 86400000;
const now = () => new Date().toISOString();
export const MAX_MESSAGE = 4000;

// ---------- messages ----------

// Messages open once a puppy is home (plan 2): before that, the status page
// carries them. Any placement of theirs picked up opens them.
export async function messagesOpen(env, siteId, familyId) {
  return Boolean(await env.DB.prepare("SELECT 1 FROM portal_placements WHERE site_id = ? AND family_id = ? AND picked_up_at IS NOT NULL AND pickup_state IN ('confirmed', 'assumed') LIMIT 1").bind(siteId, familyId).first());
}

export async function thread(env, siteId, familyId) {
  return (await env.DB.prepare('SELECT * FROM portal_messages WHERE site_id = ? AND family_id = ? ORDER BY sent_at, id LIMIT 500').bind(siteId, familyId).all()).results;
}

// What one side hasn't read from the other.
export async function unreadFrom(env, siteId, familyId, sender) {
  return env.DB.prepare('SELECT COUNT(*) AS n FROM portal_messages WHERE site_id = ? AND family_id = ? AND sender = ? AND read_at IS NULL').bind(siteId, familyId, sender).first('n');
}

export async function markRead(env, siteId, familyId, sender) {
  await env.DB.prepare('UPDATE portal_messages SET read_at = ? WHERE site_id = ? AND family_id = ? AND sender = ? AND read_at IS NULL').bind(now(), siteId, familyId, sender).run();
}

const cleanBody = (v) => {
  const s = String(v ?? '').replace(/\r\n?/g, '\n').replace(/[^\S\n]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  if (!s) throw new PortalError('Write a message first.');
  if (s.length > MAX_MESSAGE) throw new PortalError(`A message is up to ${MAX_MESSAGE} characters.`);
  return s;
};

// The family writes: it lands on her screen and Today, and wakes her devices.
export async function familyWrites(env, site, fam, body) {
  if (!(await messagesOpen(env, site.id, fam.familyId))) throw new PortalError('Messages open once your puppy is home.');
  const text = cleanBody(body);
  await env.DB.prepare("INSERT INTO portal_messages (id, site_id, family_id, sender, body, sent_at) VALUES (?, ?, ?, 'family', ?, ?)").bind(crypto.randomUUID(), site.id, fam.familyId, text, now()).run();
  await notify(env, site.id, 'notice', String(fam.name).replace(/^the\s+/i, ''), `portal-message:${fam.familyId}`);
}

// She writes: the family sees it in the portal and gets an email with it, to every
// address, logged like every portal email.
export async function breederWrites(env, site, familyId, body) {
  const fam = await getFamily(env, site.id, familyId);
  if (!fam) throw new PortalError('No such family.');
  const text = cleanBody(body);
  const t = now();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO portal_messages (id, site_id, family_id, sender, body, sent_at) VALUES (?, ?, ?, 'breeder', ?, ?)").bind(crypto.randomUUID(), site.id, familyId, text, t),
    env.DB.prepare("UPDATE portal_messages SET read_at = ? WHERE site_id = ? AND family_id = ? AND sender = 'family' AND read_at IS NULL").bind(t, site.id, familyId),
  ]);
  const kennel = site.kennel_name || site.subdomain;
  const p = await env.DB.prepare("SELECT id FROM portal_placements WHERE family_id = ? ORDER BY status = 'open' DESC, created_at DESC LIMIT 1").bind(familyId).first('id');
  return mailFamily(env, site, familyId, p, 'message', {
    subject: `A message from ${kennel}`,
    text: `${kennel} wrote:\n\n${text}\n\nReply in your puppy portal: ${portalBase(env, site)}/family/messages\n`,
  });
}

async function mailFamily(env, site, familyId, placementId, kind, msg) {
  const kennel = site.kennel_name || site.subdomain;
  let sent = 0;
  let failed = 0;
  for (const e of await familyEmails(env, familyId)) {
    let result = 'failed';
    let providerId = null;
    try {
      const r = await sendMail(env, { to: e.email, emailHash: e.email_hash, kind: `portal_${kind}`, fromName: kennel, ...msg });
      result = r.outbox ? 'outbox' : 'sent';
      providerId = r.id;
      sent++;
    } catch (err) {
      if (!(err instanceof MailError)) throw err;
      failed++;
    }
    await env.DB.prepare('INSERT INTO portal_email_log (site_id, family_id, placement_id, kind, basis, address_hash, provider_id, result, sent_at) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?)')
      .bind(site.id, familyId, placementId, kind, e.email_hash, providerId, result, now()).run();
  }
  return { sent, failed };
}

// ---------- a puppy lost before pickup (plan 7.4) ----------

export const LOSS_REASONS = { died: 'died', failed_health: 'failed_health' };

// A loss she records herself (the feed does the same from KennelOS).
export async function markLoss(env, siteId, placementId, reason, on) {
  const p = await getPlacement(env, siteId, placementId);
  if (!p) throw new PortalError('No such placement.');
  if (!LOSS_REASONS[reason]) throw new PortalError('Choose what happened.');
  if (p.picked_up_at) throw new PortalError('After pickup, record it as the life status instead.');
  if (on && !/^\d{4}-\d{2}-\d{2}$/.test(on)) throw new PortalError('The date is a date.');
  const day = on || now().slice(0, 10);
  return applyChanges(env, siteId, p, {
    status: 'closed', closed_reason: reason, ...(reason === 'died' ? { life_status: 'deceased', life_status_on: day } : {}),
  }, 'breeder');
}

// Lost before pickup: the family's Home becomes the quiet page.
export const isLoss = (p) => Boolean(p && p.status === 'closed' && (p.closed_reason === 'died' || p.closed_reason === 'failed_health') && !p.picked_up_at);

// The starting draft she rewrites: never sent for her.
export function lossDraft(p, kennel, family) {
  const name = p.call_name || p.puppy_name;
  return p.closed_reason === 'died'
    ? `Dear ${family},\n\nI'm so sorry to tell you that ${name} passed away. [What happened, in your words.]\n\nYou're back on our list at your original place, and what you've paid goes toward your next puppy. Take whatever time you need; I'm here whenever you want to talk.\n\n${kennel}`
    : `Dear ${family},\n\nAt ${name}'s health check we found [what was found], so ${name} won't be going home with you. [What it means for ${name}.]\n\nYou're back on our list at your original place, and what you've paid goes toward your next puppy. I'm here whenever you want to talk.\n\n${kennel}`;
}

// Save her note; it shows on their page at once. send: also email it, its text hers.
export async function saveLossNote(env, site, placementId, note, { send = false } = {}) {
  const p = await getPlacement(env, site.id, placementId);
  if (!isLoss(p)) throw new PortalError('There\'s no loss recorded for this puppy.');
  const text = String(note ?? '').replace(/\r\n?/g, '\n').trim().slice(0, 4000);
  if (!text) throw new PortalError('Write your note first.');
  if (/\[[^\]]*\]/.test(text)) throw new PortalError('Your note still has a [bracket] from the draft. Put your own words there.');
  const t = now();
  await env.DB.prepare('UPDATE portal_placements SET loss_note = ?, loss_note_at = ?, updated_at = ? WHERE id = ?').bind(text, t, t, p.id).run();
  if (!send) return null;
  const kennel = site.kennel_name || site.subdomain;
  const r = await mailFamily(env, site, p.family_id, p.id, 'loss_note', { subject: `A note from ${kennel}`, text: `${text}\n` });
  if (r.sent) await env.DB.prepare('UPDATE portal_placements SET loss_sent_at = ? WHERE id = ?').bind(t, p.id).run();
  return r;
}

// ---------- delete (undoable) and erase ----------

// Her delete, or a back-out from KennelOS: the family can't sign in from now, and
// the daily cleanup finishes it after UNDO_DAYS unless she undoes it.
export async function scheduleDelete(env, siteId, familyId, reason = 'breeder') {
  const t = now();
  await env.DB.batch([
    env.DB.prepare("UPDATE portal_families SET deleted_at = ?, delete_reason = ?, updated_at = ? WHERE id = ? AND site_id = ? AND status = 'active' AND deleted_at IS NULL").bind(t, reason, t, familyId, siteId),
    env.DB.prepare('UPDATE portal_sessions SET revoked_at = ? WHERE family_id = ? AND revoked_at IS NULL').bind(t, familyId),
    env.DB.prepare("INSERT INTO portal_history (site_id, tbl, row_id, field, old_value, new_value, changed_at, changed_by) VALUES (?, 'portal_families', ?, 'deleted', NULL, ?, ?, ?)").bind(siteId, familyId, reason, t, reason === 'breeder' ? 'breeder' : 'kennelos'),
  ]);
}

export async function undoDelete(env, siteId, familyId) {
  const r = await env.DB.prepare("UPDATE portal_families SET deleted_at = NULL, delete_reason = NULL, updated_at = ? WHERE id = ? AND site_id = ? AND status = 'active' AND deleted_at IS NOT NULL").bind(now(), familyId, siteId).run();
  if (!r.meta.changes) throw new PortalError('That family can no longer be brought back.');
}

export async function recentlyDeleted(env, siteId) {
  return (await env.DB.prepare(`SELECT f.id, f.name, f.deleted_at, f.delete_reason,
      (SELECT COALESCE(call_name, puppy_name) FROM portal_placements WHERE family_id = f.id ORDER BY created_at DESC LIMIT 1) AS pup
    FROM portal_families f WHERE f.site_id = ? AND f.status = 'active' AND f.deleted_at IS NOT NULL ORDER BY f.deleted_at DESC`).bind(siteId).all()).results;
}

// The daily cleanup: deletes due after UNDO_DAYS, final, with tombstones for what
// came from KennelOS.
export async function finishDeletes(env, at = new Date()) {
  const { results } = await env.DB.prepare("SELECT id, site_id FROM portal_families WHERE status = 'active' AND deleted_at IS NOT NULL AND deleted_at < ? LIMIT 50")
    .bind(new Date(at.getTime() - UNDO_DAYS * DAY).toISOString()).all();
  for (const f of results) {
    await env.DB.batch(await tombstoneStatements(env, f.site_id, f.id));
    await deleteFamily(env, f.site_id, f.id);
  }
  return results.length;
}

// The erase (plan 10.4), asked for by the family (from Account) or by her for them:
// their account goes now, for good; her sale records stay, with the family reduced
// to the name she knows them by. From KennelOS: a tombstone, so it isn't sent again.
export async function eraseFamily(env, siteId, familyId, by) {
  const fam = await env.DB.prepare("SELECT * FROM portal_families WHERE id = ? AND site_id = ? AND status = 'active'").bind(familyId, siteId).first();
  if (!fam) throw new PortalError('No such family.');
  const t = now();
  const { results: hashes } = await env.DB.prepare('SELECT email_hash FROM portal_emails WHERE family_id = ?').bind(familyId).all();
  const inPlacements = 'SELECT id FROM portal_placements WHERE family_id = ?';
  await env.DB.batch([
    ...(fam.kennelos_id ? [env.DB.prepare('INSERT OR IGNORE INTO portal_tombstones (site_id, type, kennelos_id, deleted_at) VALUES (?, \'family\', ?, ?)').bind(siteId, fam.kennelos_id, t)] : []),
    ...hashes.map((h) => env.DB.prepare('DELETE FROM portal_codes WHERE site_id = ? AND email_hash = ?').bind(siteId, h.email_hash)),
    env.DB.prepare('DELETE FROM portal_sessions WHERE family_id = ?').bind(familyId),
    env.DB.prepare('DELETE FROM portal_emails WHERE family_id = ?').bind(familyId),
    env.DB.prepare('DELETE FROM portal_messages WHERE family_id = ?').bind(familyId),
    env.DB.prepare(`DELETE FROM portal_placement_progress WHERE placement_id IN (${inPlacements})`).bind(familyId),
    env.DB.prepare(`DELETE FROM portal_suggestions WHERE (tbl = 'portal_families' AND row_id = ?) OR (tbl = 'portal_placements' AND row_id IN (${inPlacements}))`).bind(familyId, familyId),
    // History about the account goes; history about her records stays with them.
    env.DB.prepare("DELETE FROM portal_history WHERE site_id = ? AND tbl = 'portal_families' AND row_id = ?").bind(siteId, familyId),
    env.DB.prepare('UPDATE portal_clicks SET family_id = NULL WHERE family_id = ?').bind(familyId),
    env.DB.prepare("UPDATE portal_families SET status = 'erased', erased_at = ?, status_url = NULL, kennelos_id = NULL, edited_fields = '[]', deleted_at = NULL, updated_at = ? WHERE id = ?").bind(t, t, familyId),
    env.DB.prepare("INSERT INTO portal_history (site_id, tbl, row_id, field, old_value, new_value, changed_at, changed_by) SELECT ?, 'portal_placements', id, 'account_erased', NULL, ?, ?, ? FROM portal_placements WHERE family_id = ?")
      .bind(siteId, by === 'family' ? 'at the family\'s request, from their account' : 'at the family\'s request, by you', t, by === 'family' ? 'family' : 'breeder', familyId),
  ]);
}

// Erased families' sale records, for her guarantee claims (plan 10.1).
export async function erasedRecords(env, siteId) {
  return (await env.DB.prepare(`SELECT f.id AS family_id, f.name, f.erased_at, p.id, p.puppy_name, p.call_name, p.picked_up_at, p.vet_deadline_at, p.proof_file_id, p.proof_accepted_at, p.contract_file_id
    FROM portal_families f JOIN portal_placements p ON p.family_id = f.id WHERE f.site_id = ? AND f.status = 'erased' ORDER BY f.erased_at DESC`).bind(siteId).all()).results;
}

// The daily cleanup's portal part: finished deletes, used one-tap links, old codes.
export async function runPortalDaily(env, at = new Date()) {
  const deleted = await finishDeletes(env, at);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM portal_handoffs WHERE used_at < ?').bind(new Date(at.getTime() - DAY).toISOString()),
    env.DB.prepare('DELETE FROM portal_codes WHERE expires_at < ?').bind(at.toISOString()),
    env.DB.prepare('DELETE FROM portal_sessions WHERE expires_at < ? OR revoked_at < ?').bind(at.toISOString(), new Date(at.getTime() - UNDO_DAYS * DAY).toISOString()),
  ]);
  return { deleted };
}

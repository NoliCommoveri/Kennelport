// The portal's records (docs/plans/family-portal.md section 9): families and
// their addresses, placements with the pickup and vet clock, health records, files
// and history. Every change to a placement is written to portal_history with who
// made it (plan 3.1); fields she edits are listed in edited_fields, so a later
// KennelOS sync (build chunk 3) never overwrites them.
import { emailHash, normalizeEmail } from '../auth.js';
import { randomHex } from '../lib/crypto.js';
import { vetDeadline, validTimeZone, zonedToUtc, VET_RULES } from './vet.js';

export class PortalError extends Error {}

const now = () => new Date().toISOString();
const clean = (v, max = 200) => {
  const s = String(v ?? '').replace(/\s+/g, ' ').trim();
  return s ? s.slice(0, max) : null;
};
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ---------- settings ----------

export const DEFAULT_DISCLOSURE = 'Some links here are referral or affiliate links: we may earn a commission or credit when you use them, at no cost to you.';

export async function portalOn(env, siteId) {
  return Boolean(await env.DB.prepare('SELECT portal_on FROM sites WHERE id = ?').bind(siteId).first('portal_on'));
}

const SETTINGS_DEFAULTS = {
  time_zone: 'America/New_York', vet_rule: 'hours72', proof_note: null, disclosure: null,
  her_phone: null, her_email: null, vet_clinic: null, vet_doctor: null, vet_phone: null, vet_address: null, vet_note: null, help_weeks: 8,
  food_name: null, food_bag: null, food_how: null, food_note: null,
};

export async function getSettings(env, siteId) {
  const row = await env.DB.prepare('SELECT * FROM portal_settings WHERE site_id = ?').bind(siteId).first();
  return row ?? { site_id: siteId, ...SETTINGS_DEFAULTS };
}

// A phone number as typed, kept if it has 7 to 15 digits (an optional leading +).
export function cleanPhone(v, what) {
  const s = clean(v, 40);
  if (!s) return null;
  const digits = s.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15 || /[^\d\s()+.\-]/.test(s.replace(/\s*(ext\.?|x)\s*\d+$/i, ''))) throw new PortalError(`${what} doesn't look like a phone number.`);
  return s;
}

// For a tel: or sms: link: digits, and a leading + if typed.
export const dialable = (phone) => (String(phone).trim().startsWith('+') ? '+' : '') + String(phone).replace(/\s*(ext\.?|x)\s*\d+$/i, '').replace(/\D/g, '');

export async function saveSettings(env, siteId, input) {
  const tz = String(input.time_zone ?? '').trim();
  if (!validTimeZone(tz)) throw new PortalError('Choose a time zone from the list.');
  if (!VET_RULES[input.vet_rule]) throw new PortalError('Choose how your contract counts the vet visit.');
  const herEmail = clean(input.her_email, 254);
  if (herEmail && !normalizeEmail(herEmail)) throw new PortalError('Your email for families isn\'t an email address.');
  const weeks = clean(input.help_weeks, 3) ?? '8';
  if (!/^\d{1,2}$/.test(weeks) || Number(weeks) < 1 || Number(weeks) > 52) throw new PortalError('Weeks on Home is a number from 1 to 52.');
  const v = {
    time_zone: tz, vet_rule: input.vet_rule, proof_note: clean(input.proof_note, 400), disclosure: clean(input.disclosure, 400),
    her_phone: cleanPhone(input.her_phone, 'Your phone for families'), her_email: herEmail,
    vet_clinic: clean(input.vet_clinic, 120), vet_doctor: clean(input.vet_doctor, 120), vet_phone: cleanPhone(input.vet_phone, 'Your vet\'s phone'),
    vet_address: clean(input.vet_address, 200), vet_note: clean(input.vet_note, 400), help_weeks: Number(weeks),
    food_name: clean(input.food_name, 160), food_bag: clean(input.food_bag, 80), food_how: clean(input.food_how, 160), food_note: clean(input.food_note, 300),
  };
  const cols = Object.keys(v);
  await env.DB.prepare(`INSERT INTO portal_settings (site_id, ${cols.join(', ')}, updated_at) VALUES (?, ${cols.map(() => '?').join(', ')}, ?)
    ON CONFLICT (site_id) DO UPDATE SET ${cols.map((c) => `${c} = excluded.${c}`).join(', ')}, updated_at = excluded.updated_at`)
    .bind(siteId, ...Object.values(v), now()).run();
}

export async function setPortalOn(env, siteId, on) {
  await env.DB.prepare('UPDATE sites SET portal_on = ? WHERE id = ?').bind(on ? 1 : 0, siteId).run();
}

// ---------- addresses, encrypted at rest ----------

const b64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

async function emailKey(env) {
  if (!env.PORTAL_EMAIL_KEY) throw new PortalError('The family portal isn\'t set up yet (PORTAL_EMAIL_KEY).');
  const raw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`portal-email:${env.PORTAL_EMAIL_KEY}`));
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptEmail(env, email) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await emailKey(env), new TextEncoder().encode(email));
  return `v1.${b64(iv)}.${b64(ct)}`;
}

export async function decryptEmail(env, stored) {
  const [v, iv, ct] = String(stored).split('.');
  if (v !== 'v1') throw new PortalError('Unknown address format.');
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, await emailKey(env), unb64(ct));
  return new TextDecoder().decode(plain);
}

// ---------- history ----------

const show = (v) => (v === null || v === undefined || v === '' ? null : String(v));

function historyStatements(env, siteId, tbl, rowId, changes, by, at = now()) {
  return Object.entries(changes).map(([field, [from, to]]) => env.DB.prepare(`INSERT INTO portal_history (site_id, tbl, row_id, field, old_value, new_value, changed_at, changed_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(siteId, tbl, rowId, field, show(from), show(to), at, by));
}

export async function history(env, siteId, tbl, rowId) {
  return (await env.DB.prepare('SELECT field, old_value, new_value, changed_at, changed_by FROM portal_history WHERE site_id = ? AND tbl = ? AND row_id = ? ORDER BY id DESC LIMIT 200')
    .bind(siteId, tbl, rowId).all()).results;
}

// ---------- families ----------

async function parseEmails(env, raw) {
  const list = String(raw ?? '').split(/[\s,;]+/).filter(Boolean);
  const out = [];
  for (const r of list) {
    const email = normalizeEmail(r);
    if (!email) throw new PortalError(`${r.slice(0, 80)} isn't an email address.`);
    if (!out.some((e) => e.email === email)) out.push({ email, hash: await emailHash(env, email) });
  }
  if (out.length > 4) throw new PortalError('Up to four addresses for a family.');
  return out;
}

async function emailStatements(env, siteId, familyId, emails) {
  const taken = [];
  for (const e of emails) {
    const row = await env.DB.prepare('SELECT family_id FROM portal_emails WHERE site_id = ? AND email_hash = ?').bind(siteId, e.hash).first();
    if (row && row.family_id !== familyId) taken.push(e.email);
  }
  if (taken.length) throw new PortalError(`${taken.join(', ')} already belongs to another family here.`);
  const stmts = [];
  for (const e of emails) {
    stmts.push(env.DB.prepare(`INSERT INTO portal_emails (id, site_id, family_id, email_hash, email_enc, added_at) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (site_id, email_hash) DO NOTHING`).bind(crypto.randomUUID(), siteId, familyId, e.hash, await encryptEmail(env, e.email), now()));
  }
  return stmts;
}

export async function createFamily(env, siteId, input) {
  const name = clean(input.name, 120);
  if (!name) throw new PortalError('Give the family a name, for example "the Reed family".');
  const emails = await parseEmails(env, input.emails);
  if (!emails.length) throw new PortalError('Add at least one email address, so they can sign in.');
  const id = crypto.randomUUID();
  const t = now();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO portal_families (id, site_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').bind(id, siteId, name, t, t),
    ...await emailStatements(env, siteId, id, emails),
    ...historyStatements(env, siteId, 'portal_families', id, { created: [null, name] }, 'breeder', t),
  ]);
  return id;
}

// Name and addresses: the list given replaces the family's addresses.
export async function updateFamily(env, siteId, familyId, input) {
  const fam = await getFamily(env, siteId, familyId);
  if (!fam) throw new PortalError('No such family.');
  const name = clean(input.name, 120);
  if (!name) throw new PortalError('Give the family a name.');
  const emails = await parseEmails(env, input.emails);
  if (!emails.length) throw new PortalError('Keep at least one email address, so they can sign in.');
  const before = await env.DB.prepare('SELECT id, email_hash FROM portal_emails WHERE family_id = ?').bind(familyId).all();
  const keep = new Set(emails.map((e) => e.hash));
  const gone = before.results.filter((r) => !keep.has(r.email_hash));
  const added = emails.filter((e) => !before.results.some((r) => r.email_hash === e.hash));
  const t = now();
  const changes = {};
  if (name !== fam.name) changes.name = [fam.name, name];
  if (gone.length || added.length) changes.emails = [`${before.results.length} address(es)`, `${emails.length} address(es)`];
  await env.DB.batch([
    env.DB.prepare('UPDATE portal_families SET name = ?, updated_at = ?, edited_fields = ? WHERE id = ? AND site_id = ?')
      .bind(name, t, mergeEdited(fam.edited_fields, Object.keys(changes).filter((k) => k === 'name')), familyId, siteId),
    ...gone.map((r) => env.DB.prepare('DELETE FROM portal_emails WHERE id = ?').bind(r.id)),
    // Kept by its hash alone, so the KennelOS feed doesn't put it back (portal/feed.js).
    ...gone.map((r) => env.DB.prepare("INSERT INTO portal_history (site_id, tbl, row_id, field, old_value, new_value, changed_at, changed_by) VALUES (?, 'portal_families', ?, 'email_removed', ?, NULL, ?, 'breeder')").bind(siteId, familyId, r.email_hash, t)),
    ...await emailStatements(env, siteId, familyId, added),
    ...historyStatements(env, siteId, 'portal_families', familyId, changes, 'breeder', t),
  ]);
}

export async function getFamily(env, siteId, familyId) {
  return env.DB.prepare("SELECT * FROM portal_families WHERE id = ? AND site_id = ? AND status = 'active' AND deleted_at IS NULL").bind(familyId, siteId).first();
}

// The family's addresses, readable. Only for sending and for her screens.
export async function familyEmails(env, familyId) {
  const { results } = await env.DB.prepare('SELECT id, email_hash, email_enc, invited_at, invite_expires_at, invite_hash FROM portal_emails WHERE family_id = ? ORDER BY added_at').bind(familyId).all();
  return Promise.all(results.map(async (r) => ({ ...r, email: await decryptEmail(env, r.email_enc) })));
}

export async function listFamilies(env, siteId) {
  const { results } = await env.DB.prepare(`SELECT f.id, f.name, f.invited_at, f.first_signed_in_at, f.last_activity_at, f.kennelos_id,
      p.id AS placement_id, p.puppy_name, p.call_name, p.go_home_on, p.pickup_booked_at, p.picked_up_at, p.pickup_state, p.vet_deadline_at,
      p.vet_booked_at, p.proof_uploaded_at, p.proof_accepted_at, p.status, p.life_status, p.vet_booked_for,
      pu.photo_id, pu.sex, l.name AS litter_name,
      (SELECT GROUP_CONCAT(x.name, '|') FROM portal_placement_extras x WHERE x.placement_id = p.id AND x.confirmed_at IS NOT NULL) AS extras
    FROM portal_families f LEFT JOIN portal_placements p ON p.family_id = f.id AND p.status = 'open'
      LEFT JOIN puppies pu ON pu.id = p.puppy_id LEFT JOIN litters l ON l.id = pu.litter_id
    WHERE f.site_id = ? AND f.status = 'active' AND f.deleted_at IS NULL ORDER BY COALESCE(p.go_home_on, '9999'), f.name`).bind(siteId).all();
  return results;
}

// Delete a family and everything of theirs. Phase 1's delete is final; the 30-day
// undo and the erase/retention split (plan section 10) come with build chunk 4.
export async function deleteFamily(env, siteId, familyId) {
  const { results: files } = await env.DB.prepare(`SELECT f.r2_key FROM portal_files f JOIN portal_placements p ON p.id = f.placement_id WHERE p.family_id = ? AND f.site_id = ?
    UNION ALL SELECT m.r2_key FROM portal_media m JOIN portal_placements p ON p.id = m.placement_id WHERE p.family_id = ? AND m.site_id = ?`).bind(familyId, siteId, familyId, siteId).all();
  if (files.length) await env.FILES.delete(files.map((f) => f.r2_key));
  const inPlacements = 'SELECT id FROM portal_placements WHERE family_id = ?';
  await env.DB.batch([
    ...stayDeletes(env, familyId, { keepExtras: false }),
    env.DB.prepare(`DELETE FROM portal_files WHERE placement_id IN (${inPlacements})`).bind(familyId),
    env.DB.prepare(`DELETE FROM portal_health_records WHERE placement_id IN (${inPlacements})`).bind(familyId),
    env.DB.prepare(`DELETE FROM portal_placement_progress WHERE placement_id IN (${inPlacements})`).bind(familyId),
    env.DB.prepare(`DELETE FROM portal_placements_programs WHERE placement_id IN (${inPlacements})`).bind(familyId),
    env.DB.prepare(`DELETE FROM portal_checklist_items WHERE placement_id IN (${inPlacements})`).bind(familyId),
    env.DB.prepare(`DELETE FROM portal_timeline_tasks WHERE placement_id IN (${inPlacements})`).bind(familyId),
    env.DB.prepare(`DELETE FROM portal_history WHERE site_id = ? AND tbl = 'portal_placements' AND row_id IN (${inPlacements})`).bind(siteId, familyId),
    env.DB.prepare("DELETE FROM portal_history WHERE site_id = ? AND tbl = 'portal_families' AND row_id = ?").bind(siteId, familyId),
    env.DB.prepare('UPDATE portal_email_log SET family_id = NULL WHERE family_id = ?').bind(familyId),
    env.DB.prepare('UPDATE portal_clicks SET family_id = NULL WHERE family_id = ?').bind(familyId),
    env.DB.prepare('DELETE FROM portal_messages WHERE family_id = ?').bind(familyId),
    env.DB.prepare('DELETE FROM portal_placements WHERE family_id = ?').bind(familyId),
    env.DB.prepare('DELETE FROM portal_sessions WHERE family_id = ?').bind(familyId),
    env.DB.prepare('DELETE FROM portal_emails WHERE family_id = ?').bind(familyId),
    env.DB.prepare('DELETE FROM portal_families WHERE id = ? AND site_id = ?').bind(familyId, siteId),
  ]);
}

// A family's stay updates and their photos' rows (and, unless keepExtras, the
// extras and skills themselves). The R2 files are the caller's to delete.
export function stayDeletes(env, familyId, { keepExtras }) {
  const pe = 'SELECT id FROM portal_placement_extras WHERE placement_id IN (SELECT id FROM portal_placements WHERE family_id = ?)';
  const ups = `SELECT id FROM portal_stay_updates WHERE placement_extra_id IN (${pe})`;
  return [
    env.DB.prepare('DELETE FROM portal_media WHERE placement_id IN (SELECT id FROM portal_placements WHERE family_id = ?)').bind(familyId),
    env.DB.prepare(`DELETE FROM portal_update_skills WHERE update_id IN (${ups})`).bind(familyId),
    env.DB.prepare(`DELETE FROM portal_stay_updates WHERE placement_extra_id IN (${pe})`).bind(familyId),
    ...(keepExtras ? [] : [
      env.DB.prepare(`DELETE FROM portal_stay_skills WHERE placement_extra_id IN (${pe})`).bind(familyId),
      env.DB.prepare('DELETE FROM portal_placement_extras WHERE placement_id IN (SELECT id FROM portal_placements WHERE family_id = ?)').bind(familyId),
    ]),
  ];
}

// ---------- placements ----------

const mergeEdited = (json, fields) => JSON.stringify([...new Set([...JSON.parse(json || '[]'), ...fields])]);

export async function getPlacement(env, siteId, id) {
  return env.DB.prepare('SELECT * FROM portal_placements WHERE id = ? AND site_id = ?').bind(id, siteId).first();
}

// The family's current placement: the open one, else the latest.
export async function placementFor(env, siteId, familyId) {
  return env.DB.prepare("SELECT * FROM portal_placements WHERE site_id = ? AND family_id = ? ORDER BY status = 'open' DESC, created_at DESC LIMIT 1").bind(siteId, familyId).first();
}

// The puppy, its litter and its photo, for both sides' pages.
export async function puppyFor(env, siteId, puppyId) {
  if (!puppyId) return null;
  return env.DB.prepare(`SELECT p.id, p.name, p.sex, p.color, p.registration, p.registry, p.photo_id, p.litter_id, l.name AS litter_name, l.born_on, l.ready_on, l.dam_name, l.sire_name,
      dam.call_name AS dam_call, sire.call_name AS sire_call
    FROM puppies p JOIN litters l ON l.id = p.litter_id LEFT JOIN dogs dam ON dam.id = l.dam_id LEFT JOIN dogs sire ON sire.id = l.sire_id
    WHERE p.id = ? AND p.site_id = ?`).bind(puppyId, siteId).first();
}

// Puppies she can place: every puppy on her site, newest litter first, with any open placement.
export async function placeablePuppies(env, siteId) {
  return (await env.DB.prepare(`SELECT p.id, p.name, p.sex, l.name AS litter_name, l.ready_on,
      (SELECT f.name FROM portal_placements pp JOIN portal_families f ON f.id = pp.family_id WHERE pp.puppy_id = p.id AND pp.status = 'open' LIMIT 1) AS family
    FROM puppies p JOIN litters l ON l.id = p.litter_id WHERE p.site_id = ? ORDER BY COALESCE(l.born_on, l.created_at) DESC, p.sort, p.name`).bind(siteId).all()).results;
}

// Her fields on a placement, as she types them. Times are local (her zone).
export const PLACEMENT_FIELDS = ['puppy_id', 'call_name', 'microchip', 'registration_no', 'go_home_on', 'pickup_booked_at'];

async function placementValues(env, siteId, input, tz) {
  const out = {};
  if ('puppy_id' in input) {
    const id = clean(input.puppy_id, 64);
    if (!id) throw new PortalError('Choose the puppy.');
    const pup = await puppyFor(env, siteId, id);
    if (!pup) throw new PortalError('That puppy isn\'t on your site.');
    out.puppy_id = id;
    out.puppy_name = pup.name;
  }
  if ('call_name' in input) out.call_name = clean(input.call_name, 60);
  if ('microchip' in input) out.microchip = clean(input.microchip, 40);
  if ('registration_no' in input) out.registration_no = clean(input.registration_no, 40);
  if ('go_home_on' in input) {
    const d = clean(input.go_home_on, 10);
    if (d && !DATE_RE.test(d)) throw new PortalError('Go-home is a date.');
    out.go_home_on = d;
  }
  if ('pickup_day' in input || 'pickup_time' in input) {
    const d = clean(input.pickup_day, 10);
    const tm = clean(input.pickup_time, 5);
    if (d && !DATE_RE.test(d)) throw new PortalError('The pickup day is a date.');
    if (tm && !/^\d{2}:\d{2}$/.test(tm)) throw new PortalError('The pickup time is a time, like 11:00.');
    if (tm && !d) throw new PortalError('Give the pickup a day as well as a time.');
    out.pickup_booked_at = d ? zonedToUtc(d, tm || '12:00', tz).toISOString() : null;
  }
  return out;
}

export async function createPlacement(env, siteId, familyId, input) {
  const settings = await getSettings(env, siteId);
  const v = await placementValues(env, siteId, { puppy_id: input.puppy_id, ...input }, settings.time_zone);
  const open = await env.DB.prepare("SELECT 1 FROM portal_placements WHERE puppy_id = ? AND status = 'open'").bind(v.puppy_id).first();
  if (open) throw new PortalError('That puppy already has a family here.');
  const id = crypto.randomUUID();
  const t = now();
  const cols = { id, site_id: siteId, family_id: familyId, ...v, created_at: t, updated_at: t };
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO portal_placements (${Object.keys(cols).join(', ')}) VALUES (${Object.keys(cols).map(() => '?').join(', ')})`).bind(...Object.values(cols)),
    ...historyStatements(env, siteId, 'portal_placements', id, Object.fromEntries(Object.entries(v).filter(([, x]) => x !== null).map(([k, x]) => [k, [null, x]])), 'breeder', t),
  ]);
  return id;
}

// Apply changes to a placement, keeping history. `by` is breeder, family or portal.
// A moved pickup moves the deadline, using the rule in force now.
export async function applyChanges(env, siteId, p, values, by) {
  const changes = {};
  for (const [k, v] of Object.entries(values)) if (show(p[k]) !== show(v)) changes[k] = [p[k], v];
  if (!Object.keys(changes).length) return p;
  const t = now();
  const next = { ...p, ...values };
  if ('picked_up_at' in changes || 'pickup_state' in changes) {
    const settings = await getSettings(env, siteId);
    const deadline = next.picked_up_at && ['confirmed', 'assumed'].includes(next.pickup_state) ? vetDeadline(next.picked_up_at, settings.vet_rule, settings.time_zone) : null;
    if (show(deadline) !== show(p.vet_deadline_at)) { changes.vet_deadline_at = [p.vet_deadline_at, deadline]; next.vet_deadline_at = deadline; }
  }
  const sets = Object.keys(changes);
  const edited = by === 'breeder' ? mergeEdited(p.edited_fields, sets.filter((k) => PLACEMENT_FIELDS.includes(k) || k === 'picked_up_at')) : p.edited_fields;
  await env.DB.batch([
    env.DB.prepare(`UPDATE portal_placements SET ${sets.map((k) => `${k} = ?`).join(', ')}, edited_fields = ?, updated_at = ? WHERE id = ? AND site_id = ?`)
      .bind(...sets.map((k) => next[k]), edited, t, p.id, siteId),
    ...historyStatements(env, siteId, 'portal_placements', p.id, changes, by, t),
  ]);
  return { ...next, edited_fields: edited, updated_at: t };
}

export async function updatePlacement(env, siteId, id, input, by = 'breeder') {
  const p = await getPlacement(env, siteId, id);
  if (!p) throw new PortalError('No such placement.');
  const settings = await getSettings(env, siteId);
  const v = await placementValues(env, siteId, input, settings.time_zone);
  if (v.puppy_id && v.puppy_id !== p.puppy_id) {
    const open = await env.DB.prepare("SELECT 1 FROM portal_placements WHERE puppy_id = ? AND status = 'open' AND id != ?").bind(v.puppy_id, id).first();
    if (open) throw new PortalError('That puppy already has a family here.');
  }
  // A new booked time on a stopped clock puts it back to waiting for that time.
  if ('pickup_booked_at' in v && v.pickup_booked_at !== p.pickup_booked_at && p.pickup_state === 'not_yet') v.pickup_state = 'planned';
  return applyChanges(env, siteId, p, v, by);
}

// "Picked up" now, or at the time she gives (local day and time).
export async function markPickedUp(env, siteId, id, { day, time } = {}, at = new Date()) {
  const p = await getPlacement(env, siteId, id);
  if (!p) throw new PortalError('No such placement.');
  let when = new Date(at).toISOString();
  if (day) {
    const settings = await getSettings(env, siteId);
    if (!DATE_RE.test(day) || !/^\d{2}:\d{2}$/.test(time ?? '')) throw new PortalError('Give the day and time they went home.');
    when = zonedToUtc(day, time, settings.time_zone).toISOString();
    if (Date.parse(when) > Date.now() + 5 * 60000) throw new PortalError('That time hasn\'t happened yet.');
  }
  return applyChanges(env, siteId, p, { picked_up_at: when, pickup_state: 'confirmed' }, 'breeder');
}

// Her answers to "Did Opal go home at 11:00 am?" (plan section 5).
export async function confirmPickup(env, siteId, id) {
  const p = await getPlacement(env, siteId, id);
  if (!p || p.pickup_state !== 'assumed') throw new PortalError('Nothing to confirm.');
  return applyChanges(env, siteId, p, { pickup_state: 'confirmed' }, 'breeder');
}

export async function pickupNotYet(env, siteId, id) {
  const p = await getPlacement(env, siteId, id);
  if (!p || p.pickup_state === 'not_yet') throw new PortalError('Nothing to stop.');
  return applyChanges(env, siteId, p, { pickup_state: 'not_yet', picked_up_at: null }, 'breeder');
}

// The clock never waits on a tap: a booked time that has passed unmarked starts it
// from that time (the hourly job). Returns the placements it started.
export async function startAssumedClocks(env, at = new Date()) {
  const { results } = await env.DB.prepare(`SELECT p.* FROM portal_placements p JOIN sites s ON s.id = p.site_id
    WHERE s.portal_on = 1 AND s.status != 'closed' AND p.status = 'open' AND p.life_status = 'with_family'
      AND p.pickup_state = 'planned' AND p.picked_up_at IS NULL AND p.pickup_booked_at IS NOT NULL AND p.pickup_booked_at <= ?`).bind(new Date(at).toISOString()).all();
  const out = [];
  for (const p of results) out.push(await applyChanges(env, p.site_id, p, { picked_up_at: p.pickup_booked_at, pickup_state: 'assumed' }, 'portal'));
  return out;
}

// The family's side: their vet booking.
export async function recordVetBooking(env, siteId, id, { day, time, clinic }) {
  const p = await getPlacement(env, siteId, id);
  if (!p) throw new PortalError('No such placement.');
  const d = clean(day, 10);
  const tm = clean(time, 5);
  if (!d || !DATE_RE.test(d)) throw new PortalError('Choose the day of the appointment.');
  if (tm && !/^\d{2}:\d{2}$/.test(tm)) throw new PortalError('The time is a time, like 10:30.');
  return applyChanges(env, siteId, p, { vet_booked_for: tm ? `${d}T${tm}` : d, vet_clinic: clean(clinic, 120), vet_booked_at: p.vet_booked_at ?? now() }, 'family');
}

export async function acceptProof(env, siteId, id) {
  const p = await getPlacement(env, siteId, id);
  if (!p?.proof_file_id) throw new PortalError('No vet record to accept yet.');
  return applyChanges(env, siteId, p, { proof_accepted_at: now() }, 'breeder');
}

export async function setLifeStatus(env, siteId, id, status, on) {
  const p = await getPlacement(env, siteId, id);
  if (!p) throw new PortalError('No such placement.');
  if (!['with_family', 'deceased', 'rehomed', 'returned'].includes(status)) throw new PortalError('Choose a status.');
  if (on && !DATE_RE.test(on)) throw new PortalError('The date is a date.');
  return applyChanges(env, siteId, p, { life_status: status, life_status_on: status === 'with_family' ? null : (on || now().slice(0, 10)) }, 'breeder');
}

// ---------- health records ----------

export const RECORD_TYPES = { vaccine: 'Vaccine', deworming: 'Deworming', vet_visit: 'Vet visit', other: 'Other' };

export async function addHealthRecord(env, siteId, placementId, input) {
  const type = String(input.type ?? '');
  if (!RECORD_TYPES[type]) throw new PortalError('Choose what kind of record it is.');
  const given = clean(input.given_on, 10);
  if (!given || !DATE_RE.test(given)) throw new PortalError('Give the date.');
  const name = clean(input.name, 120);
  if (!name) throw new PortalError('Say what was given, for example "DHPP, first round".');
  const id = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO portal_health_records (id, site_id, placement_id, type, given_on, name, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, siteId, placementId, type, given, name, clean(input.notes, 400), now()),
    ...historyStatements(env, siteId, 'portal_placements', placementId, { health_record: [null, `${RECORD_TYPES[type]}: ${name}, ${given}`] }, 'breeder'),
  ]);
  return id;
}

export async function removeHealthRecord(env, siteId, placementId, id) {
  const r = await env.DB.prepare('SELECT type, name, given_on, kennelos_id FROM portal_health_records WHERE id = ? AND site_id = ? AND placement_id = ?').bind(id, siteId, placementId).first();
  if (!r) return;
  await env.DB.batch([
    // From KennelOS: a tombstone, so the next feed doesn't bring it back.
    ...(r.kennelos_id ? [env.DB.prepare('INSERT OR IGNORE INTO portal_tombstones (site_id, type, kennelos_id, deleted_at) VALUES (?, \'health\', ?, ?)').bind(siteId, r.kennelos_id, now())] : []),
    env.DB.prepare('DELETE FROM portal_health_records WHERE id = ?').bind(id),
    ...historyStatements(env, siteId, 'portal_placements', placementId, { health_record: [`${RECORD_TYPES[r.type]}: ${r.name}, ${r.given_on}`, null] }, 'breeder'),
  ]);
}

export async function healthRecords(env, siteId, placementId) {
  return (await env.DB.prepare('SELECT * FROM portal_health_records WHERE site_id = ? AND placement_id = ? ORDER BY given_on, created_at').bind(siteId, placementId).all()).results;
}

// ---------- files: vet proof and the contract ----------

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

// What a file is, from its first bytes (never the name or the browser's word).
export function sniff(bytes) {
  const b = bytes;
  const at = (i, ...xs) => xs.every((x, j) => b[i + j] === x);
  if (at(0, 0xff, 0xd8, 0xff)) return 'image/jpeg';
  if (at(0, 0x89, 0x50, 0x4e, 0x47)) return 'image/png';
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return 'image/webp';
  if (at(0, 0x25, 0x50, 0x44, 0x46, 0x2d)) return 'application/pdf';
  if (at(4, 0x66, 0x74, 0x79, 0x70)) {
    const brand = String.fromCharCode(...b.slice(8, 12));
    if (/^(heic|heix|hevc|mif1|msf1|heim|heis)$/.test(brand)) return 'image/heic';
  }
  return null;
}

export async function saveFile(env, siteId, placementId, { kind, bytes, name, by }) {
  if (!bytes?.length) throw new PortalError('Choose a file.');
  if (bytes.length > MAX_FILE_BYTES) throw new PortalError('That file is over 10 MB. Try a photo of the page instead.');
  const type = sniff(bytes);
  if (!type) throw new PortalError('That file isn\'t a photo or a PDF.');
  const p = await getPlacement(env, siteId, placementId);
  if (!p) throw new PortalError('No such placement.');
  const id = crypto.randomUUID();
  const key = `sites/${siteId}/portal/${placementId}/${id}`;
  await env.FILES.put(key, bytes, { httpMetadata: { contentType: type } });
  const t = now();
  await env.DB.prepare('INSERT INTO portal_files (id, site_id, placement_id, kind, r2_key, type, bytes, name, uploaded_by, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, siteId, placementId, kind, key, type, bytes.length, clean(name, 120), by, t).run();
  if (kind === 'proof') await applyChanges(env, siteId, p, { proof_file_id: id, proof_uploaded_at: t, proof_accepted_at: null }, by);
  if (kind === 'contract') await applyChanges(env, siteId, p, { contract_file_id: id }, by);
  return id;
}

export async function getFile(env, siteId, id) {
  return env.DB.prepare('SELECT * FROM portal_files WHERE id = ? AND site_id = ?').bind(id, siteId).first();
}

export async function fileResponse(env, file, { download = false } = {}) {
  const obj = file && await env.FILES.get(file.r2_key);
  if (!obj) return new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });
  const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'application/pdf': 'pdf' }[file.type] ?? 'bin';
  const name = `${file.kind === 'contract' ? 'contract' : 'vet-record'}.${ext}`;
  return new Response(obj.body, {
    headers: {
      'content-type': file.type,
      'content-disposition': `${download || file.type === 'image/heic' ? 'attachment' : 'inline'}; filename="${name}"`,
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'",
    },
  });
}

// ---------- the email log ----------

export async function emailLog(env, siteId, placementId) {
  return (await env.DB.prepare('SELECT kind, basis, address_hash, provider_id, result, sent_at FROM portal_email_log WHERE site_id = ? AND placement_id = ? ORDER BY id DESC LIMIT 100').bind(siteId, placementId).all()).results;
}

export const newToken = () => randomHex(32);

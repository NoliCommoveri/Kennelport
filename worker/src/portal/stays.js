// Extended stays (docs/Puppy_Parent_Portal_Plan.md sections 8.1, 8.2 and 8.5; build
// chunk 5): the 10-, 12- and 16-week homegoing packages, where the puppy stays with
// her past 8 weeks and the family watches the progress in the portal.
//
// - An extra in her catalog says how the portal delivers it (extras.portal_delivery):
//   'stay', or nothing (only listed on the placement). The portal never handles money.
// - A placement's extra copies the catalog's name, weeks and cadence. A stay sets the
//   go-home date to birth + the package's weeks (she can still change it), starts at
//   8 weeks old, and copies the package's "What's included" list as its skills.
// - Her weekly update: a note, a weight, each skill on one scale (Not started ·
//   Introduced · Practicing · Reliable) with a line of notes, and photos. Saving it
//   emails the family. Today lists the stays whose update is due.
// - The stay's tasks need no copy: birth-dated tasks before go-home are already hers
//   (steps.js), and pickup-dated ones move with the later go-home.
import { PortalError, getPlacement, applyChanges, puppyFor, familyEmails, sniff } from './store.js';
import { localParts, addDays } from './vet.js';
import { sendMail, MailError } from '../mail.js';
import { portalBase } from './auth.js';

const now = () => new Date().toISOString();
const clean = (v, max = 200) => {
  const s = String(v ?? '').replace(/\s+/g, ' ').trim();
  return s ? s.slice(0, max) : null;
};
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY = 86400000;

export const LEVELS = { not_started: 'Not started', introduced: 'Introduced', practicing: 'Practicing', reliable: 'Reliable' };
export const LEVEL_ORDER = Object.keys(LEVELS);
export const STAY_STARTS_DAYS = 56; // 8 weeks old
export const MAX_PHOTOS = 6;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

// ---------- pure: where a stay is ----------

const days = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY);

// The stay's weeks and today's place in them. ends: the go-home day.
export function stayWeeks(startsOn, ends, today) {
  if (!startsOn || !ends) return { total: null, week: null, state: 'booked' };
  const total = Math.max(1, Math.ceil(days(startsOn, ends) / 7));
  if (today < startsOn) return { total, week: 0, state: 'booked' };
  if (today >= ends) return { total, week: total, state: 'ending' };
  return { total, week: Math.min(total, Math.floor(days(startsOn, today) / 7) + 1), state: 'staying' };
}

// When the next update is due: every `every` days from the start, or from the last.
export function updateDue(startsOn, lastOn, every, today) {
  if (!startsOn || today < startsOn) return null;
  const due = addDays(lastOn ?? startsOn, lastOn ? every : 0);
  return due <= today ? due : null;
}

// How far each skill has come: its level in the first update and the latest.
export function skillProgress(skills, updates) {
  const byOld = [...updates].sort((a, b) => a.written_on.localeCompare(b.written_on) || a.created_at.localeCompare(b.created_at));
  return skills.map((sk) => {
    const seen = byOld.map((u) => u.levels.find((l) => l.skill_id === sk.id)).filter(Boolean);
    return { ...sk, first: seen[0]?.level ?? null, now: seen.at(-1)?.level ?? null, note: seen.at(-1)?.note ?? null };
  });
}

// ---------- her catalog ----------

export async function catalog(env, siteId) {
  return (await env.DB.prepare('SELECT id, name, kind, weeks, checklist, portal_delivery, portal_every_days FROM extras WHERE site_id = ? ORDER BY sort, name').bind(siteId).all()).results;
}

export async function saveDelivery(env, siteId, input) {
  const list = await catalog(env, siteId);
  if (!list.length) return;
  await env.DB.batch(list.map((x) => {
    const d = input[`delivery.${x.id}`] === 'stay' ? 'stay' : null;
    const every = Number(input[`every.${x.id}`] ?? x.portal_every_days);
    return env.DB.prepare('UPDATE extras SET portal_delivery = ?, portal_every_days = ? WHERE id = ? AND site_id = ?')
      .bind(d, Number.isInteger(every) && every >= 3 && every <= 31 ? every : x.portal_every_days, x.id, siteId);
  }));
}

// ---------- a placement's extras ----------

export async function extrasFor(env, siteId, placementId) {
  return (await env.DB.prepare('SELECT * FROM portal_placement_extras WHERE site_id = ? AND placement_id = ? ORDER BY created_at').bind(siteId, placementId).all()).results;
}

// The placement's confirmed stay, if it has one.
export async function stayFor(env, siteId, placementId) {
  return env.DB.prepare("SELECT * FROM portal_placement_extras WHERE site_id = ? AND placement_id = ? AND delivery = 'stay' AND confirmed_at IS NOT NULL ORDER BY created_at DESC LIMIT 1").bind(siteId, placementId).first();
}

// A stay sets go-home to birth + its weeks, and starts at 8 weeks old.
async function startStay(env, siteId, p, pe) {
  const pup = await puppyFor(env, siteId, p.puppy_id);
  if (!pup?.born_on) return;
  const starts = pe.starts_on ?? addDays(pup.born_on, STAY_STARTS_DAYS);
  if (!pe.starts_on) await env.DB.prepare('UPDATE portal_placement_extras SET starts_on = ? WHERE id = ?').bind(starts, pe.id).run();
  if (pe.weeks && !p.picked_up_at) await applyChanges(env, siteId, p, { go_home_on: addDays(pup.born_on, pe.weeks * 7) }, 'portal');
}

async function copySkills(env, siteId, pe, extra) {
  let items = [];
  try { items = JSON.parse(extra?.checklist ?? '[]'); } catch { items = []; }
  if (!Array.isArray(items) || !items.length) return;
  await env.DB.batch(items.slice(0, 30).map((name, i) => env.DB.prepare('INSERT INTO portal_stay_skills (id, site_id, placement_extra_id, name, sort, from_package) VALUES (?, ?, ?, ?, ?, 1)')
    .bind(crypto.randomUUID(), siteId, pe.id, String(name).slice(0, 120), i)));
}

const historyStmt = (env, siteId, p, field, from, to, by) => env.DB.prepare(`INSERT INTO portal_history (site_id, tbl, row_id, field, old_value, new_value, changed_at, changed_by)
  VALUES (?, 'portal_placements', ?, ?, ?, ?, ?, ?)`).bind(siteId, p.id, field, from, to, now(), by);

// She adds an extra (or KennelOS suggests one: unconfirmed until she says yes).
export async function addExtra(env, siteId, placementId, extraId, { by = 'breeder', kennelosId = null, startsOn = null } = {}) {
  const p = await getPlacement(env, siteId, placementId);
  if (!p) throw new PortalError('No such placement.');
  const x = await env.DB.prepare('SELECT * FROM extras WHERE id = ? AND site_id = ?').bind(extraId, siteId).first();
  if (!x) throw new PortalError('Choose an extra from your list.');
  if (await env.DB.prepare('SELECT 1 FROM portal_placement_extras WHERE placement_id = ? AND extra_id = ?').bind(p.id, x.id).first()) throw new PortalError(`${x.name} is already on this placement.`);
  if (x.portal_delivery === 'stay' && await env.DB.prepare("SELECT 1 FROM portal_placement_extras WHERE placement_id = ? AND delivery = 'stay'").bind(p.id).first()) throw new PortalError('This puppy already has a stay. Remove it first.');
  const t = now();
  const pe = {
    id: crypto.randomUUID(), site_id: siteId, placement_id: p.id, extra_id: x.id, name: x.name, delivery: x.portal_delivery ?? null,
    weeks: x.kind === 'homegoing' ? x.weeks : null, every_days: x.portal_every_days ?? 7, starts_on: startsOn,
    source: by === 'kennelos' ? 'kennelos' : 'portal', kennelos_id: kennelosId, confirmed_at: by === 'kennelos' ? null : t, created_at: t, updated_at: t,
  };
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO portal_placement_extras (${Object.keys(pe).join(', ')}) VALUES (${Object.keys(pe).map(() => '?').join(', ')})`).bind(...Object.values(pe)),
    historyStmt(env, siteId, p, by === 'kennelos' ? 'extra_suggested' : 'extra', null, x.name, by),
  ]);
  if (pe.delivery === 'stay') await copySkills(env, siteId, pe, x);
  if (pe.confirmed_at && pe.delivery === 'stay') await startStay(env, siteId, p, pe);
  return pe.id;
}

export async function confirmExtra(env, siteId, placementId, peId) {
  const pe = await env.DB.prepare('SELECT * FROM portal_placement_extras WHERE id = ? AND site_id = ? AND placement_id = ?').bind(peId, siteId, placementId).first();
  if (!pe || pe.confirmed_at) return;
  const p = await getPlacement(env, siteId, placementId);
  await env.DB.batch([
    env.DB.prepare('UPDATE portal_placement_extras SET confirmed_at = ?, updated_at = ? WHERE id = ?').bind(now(), now(), pe.id),
    historyStmt(env, siteId, p, 'extra', null, pe.name, 'breeder'),
  ]);
  if (pe.delivery === 'stay') await startStay(env, siteId, p, pe);
}

// Statements that remove placement extras (and their skills, updates and photos'
// rows); returns { stmts, keys } so the caller deletes the R2 files too.
export async function extraDeletes(env, where, ...binds) {
  const ids = (await env.DB.prepare(`SELECT id FROM portal_placement_extras WHERE ${where}`).bind(...binds).all()).results.map((r) => r.id);
  if (!ids.length) return { stmts: [], keys: [] };
  const q = ids.map(() => '?').join(', ');
  const ups = `SELECT id FROM portal_stay_updates WHERE placement_extra_id IN (${q})`;
  const keys = (await env.DB.prepare(`SELECT r2_key FROM portal_media WHERE update_id IN (${ups})`).bind(...ids).all()).results.map((r) => r.r2_key);
  return {
    keys,
    stmts: [
      env.DB.prepare(`DELETE FROM portal_media WHERE update_id IN (${ups})`).bind(...ids),
      env.DB.prepare(`DELETE FROM portal_update_skills WHERE update_id IN (${ups})`).bind(...ids),
      env.DB.prepare(`DELETE FROM portal_stay_updates WHERE placement_extra_id IN (${q})`).bind(...ids),
      env.DB.prepare(`DELETE FROM portal_stay_skills WHERE placement_extra_id IN (${q})`).bind(...ids),
      env.DB.prepare(`DELETE FROM portal_placement_extras WHERE id IN (${q})`).bind(...ids),
    ],
  };
}

export async function removeExtra(env, siteId, placementId, peId) {
  const pe = await env.DB.prepare('SELECT name, kennelos_id FROM portal_placement_extras WHERE id = ? AND site_id = ? AND placement_id = ?').bind(peId, siteId, placementId).first();
  if (!pe) return;
  const p = await getPlacement(env, siteId, placementId);
  const { stmts, keys } = await extraDeletes(env, 'id = ?', peId);
  if (keys.length) await env.FILES.delete(keys);
  await env.DB.batch([...stmts, historyStmt(env, siteId, p, 'extra', pe.name, null, 'breeder'),
    // From KennelOS: not offered again.
    ...(pe.kennelos_id ? [historyStmt(env, siteId, p, 'extra_declined', null, pe.kennelos_id, 'breeder')] : [])]);
}

export async function setStayStart(env, siteId, placementId, peId, day) {
  const d = clean(day, 10);
  if (!d || !DATE_RE.test(d)) throw new PortalError('The stay\'s first day is a date.');
  await env.DB.prepare("UPDATE portal_placement_extras SET starts_on = ?, updated_at = ? WHERE id = ? AND site_id = ? AND placement_id = ? AND delivery = 'stay'").bind(d, now(), peId, siteId, placementId).run();
}

export async function skillsFor(env, siteId, peId) {
  return (await env.DB.prepare('SELECT * FROM portal_stay_skills WHERE site_id = ? AND placement_extra_id = ? ORDER BY sort, name').bind(siteId, peId).all()).results;
}

export async function addSkill(env, siteId, peId, name) {
  const n = clean(name, 120);
  if (!n) throw new PortalError('Name the skill, for example "Recall".');
  const sort = await env.DB.prepare('SELECT COALESCE(MAX(sort), -1) + 1 AS n FROM portal_stay_skills WHERE placement_extra_id = ?').bind(peId).first('n');
  await env.DB.prepare('INSERT INTO portal_stay_skills (id, site_id, placement_extra_id, name, sort, from_package) VALUES (?, ?, ?, ?, ?, 0)').bind(crypto.randomUUID(), siteId, peId, n, sort).run();
}

export async function removeSkill(env, siteId, peId, skillId) {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM portal_update_skills WHERE site_id = ? AND skill_id = ?').bind(siteId, skillId),
    env.DB.prepare('DELETE FROM portal_stay_skills WHERE id = ? AND site_id = ? AND placement_extra_id = ?').bind(skillId, siteId, peId),
  ]);
}

// ---------- updates ----------

// Newest first, each with its skill levels and photos.
export async function updatesFor(env, siteId, peId) {
  const { results: ups } = await env.DB.prepare('SELECT * FROM portal_stay_updates WHERE site_id = ? AND placement_extra_id = ? ORDER BY written_on DESC, created_at DESC').bind(siteId, peId).all();
  if (!ups.length) return [];
  const q = ups.map(() => '?').join(', ');
  const levels = (await env.DB.prepare(`SELECT * FROM portal_update_skills WHERE update_id IN (${q})`).bind(...ups.map((u) => u.id)).all()).results;
  const media = (await env.DB.prepare(`SELECT id, update_id FROM portal_media WHERE update_id IN (${q}) ORDER BY uploaded_at`).bind(...ups.map((u) => u.id)).all()).results;
  return ups.map((u) => ({ ...u, levels: levels.filter((l) => l.update_id === u.id), photos: media.filter((m) => m.update_id === u.id).map((m) => m.id) }));
}

// Her update: saved, photos kept, and emailed to the family.
export async function writeUpdate(env, site, s, placementId, peId, input, photos = [], at = new Date()) {
  const p = await getPlacement(env, site.id, placementId);
  const pe = await env.DB.prepare("SELECT * FROM portal_placement_extras WHERE id = ? AND site_id = ? AND placement_id = ? AND delivery = 'stay' AND confirmed_at IS NOT NULL").bind(peId, site.id, placementId).first();
  if (!p || !pe) throw new PortalError('No stay to write about.');
  const skills = await skillsFor(env, site.id, pe.id);
  const levels = skills.map((sk) => ({ skill: sk, level: input[`level.${sk.id}`], note: clean(input[`note.${sk.id}`], 200) }));
  for (const l of levels) if (!LEVELS[l.level]) throw new PortalError(`Choose a level for ${l.skill.name}.`);
  const note = String(input.note ?? '').replace(/\r\n?/g, '\n').trim().slice(0, 3000) || null;
  if (!note && !photos.length) throw new PortalError('Write a note or add a photo.');
  if (photos.length > MAX_PHOTOS) throw new PortalError(`Up to ${MAX_PHOTOS} photos an update.`);
  const files = photos.map((bytes) => {
    if (bytes.length > MAX_PHOTO_BYTES) throw new PortalError('A photo is over 10 MB.');
    const type = sniff(bytes);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) throw new PortalError('Photos are JPEG, PNG or WebP. On an iPhone, choose "Most Compatible" in Camera settings, or share the photo as a JPEG.');
    return { bytes, type };
  });
  const today = localParts(at, s.time_zone).ymd;
  const week = Math.max(1, stayWeeks(pe.starts_on ?? today, p.go_home_on ?? addDays(today, 7), today).week || 1);
  const id = crypto.randomUUID();
  const t = new Date(at).toISOString();
  const media = [];
  for (const f of files) {
    const mid = crypto.randomUUID();
    const key = `sites/${site.id}/portal/${p.id}/stay/${mid}`;
    await env.FILES.put(key, f.bytes, { httpMetadata: { contentType: f.type } });
    media.push(env.DB.prepare('INSERT INTO portal_media (id, site_id, placement_id, update_id, r2_key, type, bytes, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(mid, site.id, p.id, id, key, f.type, f.bytes.length, t));
  }
  await env.DB.batch([
    env.DB.prepare('INSERT INTO portal_stay_updates (id, site_id, placement_extra_id, week, written_on, note, weight, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, site.id, pe.id, week, today, note, clean(input.weight, 30), t),
    ...levels.map((l) => env.DB.prepare('INSERT INTO portal_update_skills (site_id, update_id, skill_id, level, note) VALUES (?, ?, ?, ?, ?)').bind(site.id, id, l.skill.id, l.level, l.note)),
    ...media,
    historyStmt(env, site.id, p, 'stay_update', null, `Week ${week}`, 'breeder'),
  ]);
  // Emailed to every address, logged like every portal email.
  const kennel = site.kennel_name || site.subdomain;
  const pup = p.call_name || p.puppy_name;
  const moved = levels.filter((l) => l.level !== 'not_started').map((l) => `- ${l.skill.name}: ${LEVELS[l.level]}${l.note ? ` (${l.note})` : ''}`).join('\n');
  const text = `Week ${week} of ${pup}'s stay with ${kennel}.\n\n${note ? `${note}\n\n` : ''}${moved ? `How ${pup} is doing:\n${moved}\n\n` : ''}${files.length ? `${files.length} new photo${files.length === 1 ? '' : 's'} in your puppy portal.\n\n` : ''}See the update: ${portalBase(env, site)}/family/stay\n`;
  let sent = 0;
  for (const e of await familyEmails(env, p.family_id)) {
    let result = 'failed';
    let providerId = null;
    try {
      const r = await sendMail(env, { to: e.email, emailHash: e.email_hash, kind: 'portal_stay_update', fromName: kennel, subject: `${pup}'s week ${week} update`, text });
      result = r.outbox ? 'outbox' : 'sent';
      providerId = r.id;
      sent++;
    } catch (err) {
      if (!(err instanceof MailError)) throw err;
    }
    await env.DB.prepare("INSERT INTO portal_email_log (site_id, family_id, placement_id, kind, basis, address_hash, provider_id, result, sent_at) VALUES (?, ?, ?, 'stay_update', ?, ?, ?, ?, ?)")
      .bind(site.id, p.family_id, p.id, id, e.email_hash, providerId, result, t).run();
  }
  if (sent) await env.DB.prepare('UPDATE portal_stay_updates SET sent_at = ? WHERE id = ?').bind(t, id).run();
  return { id, week, sent };
}

export async function removeUpdate(env, siteId, placementId, updateId) {
  const u = await env.DB.prepare('SELECT u.id FROM portal_stay_updates u JOIN portal_placement_extras pe ON pe.id = u.placement_extra_id WHERE u.id = ? AND u.site_id = ? AND pe.placement_id = ?').bind(updateId, siteId, placementId).first();
  if (!u) return;
  const keys = (await env.DB.prepare('SELECT r2_key FROM portal_media WHERE update_id = ?').bind(u.id).all()).results.map((r) => r.r2_key);
  if (keys.length) await env.FILES.delete(keys);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM portal_media WHERE update_id = ?').bind(u.id),
    env.DB.prepare('DELETE FROM portal_update_skills WHERE update_id = ?').bind(u.id),
    env.DB.prepare('DELETE FROM portal_stay_updates WHERE id = ?').bind(u.id),
  ]);
}

// Today: stays in progress whose update is due ("Opal: weekly update due, last one 8 days ago").
export async function updatesDue(env, siteId, tz, at = new Date()) {
  const today = localParts(at, tz).ymd;
  const { results } = await env.DB.prepare(`SELECT pe.*, p.family_id, p.puppy_name, p.call_name, p.go_home_on, p.picked_up_at,
      (SELECT MAX(written_on) FROM portal_stay_updates u WHERE u.placement_extra_id = pe.id) AS last_on
    FROM portal_placement_extras pe JOIN portal_placements p ON p.id = pe.placement_id JOIN portal_families f ON f.id = p.family_id
    WHERE pe.site_id = ? AND pe.delivery = 'stay' AND pe.confirmed_at IS NOT NULL AND p.status = 'open' AND p.life_status = 'with_family' AND p.picked_up_at IS NULL
      AND f.status = 'active' AND f.deleted_at IS NULL`).bind(siteId).all();
  return results.filter((x) => (!x.go_home_on || today < x.go_home_on) && updateDue(x.starts_on, x.last_on, x.every_days, today))
    .map((x) => ({ ...x, name: x.call_name || x.puppy_name, ago: x.last_on ? days(x.last_on, today) : null }));
}

// A stay photo for the family, only if it's on one of their placements.
export async function mediaFor(env, siteId, familyId, id) {
  return env.DB.prepare('SELECT m.* FROM portal_media m JOIN portal_placements p ON p.id = m.placement_id WHERE m.id = ? AND m.site_id = ? AND p.family_id = ?').bind(id, siteId, familyId).first();
}

export async function mediaResponse(env, m) {
  const obj = m && await env.FILES.get(m.r2_key);
  if (!obj) return new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });
  return new Response(obj.body, { headers: { 'content-type': m.type, 'cache-control': 'private, max-age=3600', 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'none'" } });
}

// The KennelOS family feed (docs/plans/family-portal.md sections 3.1, 3.2 and
// 3.4; build chunk 3). For her kennel, KennelOS sends each family from their signed
// contract on, on its own whenever one of their records changes, to
//
//   POST api.kennelport.com/v1/portal   (Bearer: the device's link token)
//
// apart from the website's bundle, which still waits for Update website.
//
// The feed (format 1). Every key is named here; any other is refused, so nothing
// reaches the portal until this list knows it. Ids are KennelOS's own.
//
//   { format: 1, feed_id, kennel_id, sent_at?,
//     families?: [{ id, name, emails: [..], status_url?,
//       placements: [{ id (the sale), puppy_id (its Dog), puppy_name, contract_signed_on,
//         go_home_on?, pickup_at? (ISO: the placement event, hers or the family's approved booking),
//         microchip?, registration_no?,
//         voided?: { reason: died | failed_health | backed_out | other, on },
//         health?: [{ id, type: vaccine | deworming | vet_visit | other, given_on, name, notes? }],
//         extras?: [{ id (the sale's extra charge), extra_id (the extra, as the website bundle sends it) }] }] }],
//     vet?: { clinic?, doctor?, phone?, address? },
//     removed?: [{ type: family | placement | health, id }] }
//
// A family is a list of upserts: one not sent is left as it is. Something gone in
// KennelOS (a sale voided, an event deleted) is in `removed`, and is marked "no
// longer in KennelOS" for her to decide, never deleted (3.1).
//
// How it lands (3.1): a new family or placement is created, from source kennelos,
// and waits for her to send the invite. A field she has edited keeps her value, and
// KennelOS's newer one waits as a suggestion ("use it / ignore"). Everything is in
// History, by KennelOS. A record she deleted has a tombstone and never comes back.
// Her vet arrives as suggested contacts for families: filled in where hers are
// blank, a suggestion where they differ. Nothing a family sees changes until it's
// on their placement, and the invite is hers to send.
//
// The answer carries the few facts that go back (3.4): each placement's real pickup
// time once she has marked it (KennelOS moves its placement event and marks the
// sale Delivered), the microchip she entered or corrected, a death after pickup
// she recorded, and portal_only once the family is handed over. Applied at
// KennelOS's next sync, without asking her: she made the change herself. Money
// never comes back this way. It also carries the key for the one-tap link.
import { ApiError } from '../lib/http.js';
import { hmacHex, sha256Hex, timingSafeEqual, randomHex } from '../lib/crypto.js';
import { emailHash, normalizeEmail } from '../auth.js';
import { encryptEmail, applyChanges, getSettings, PLACEMENT_FIELDS } from './store.js';
import { siteBase } from '../kennelos/link.js';
import { scheduleDelete } from './account.js';
import { addExtra } from './stays.js';

export const FEED_FORMAT = 1;
export const MAX_FEED_BYTES = 512 * 1024;
const MAX = { families: 200, placements: 6, emails: 4, health: 40, removed: 400 };
// When nothing has come for this long and a placement is open, her Today says so.
export const QUIET_MS = 24 * 3600000;
// The one-tap link from the status page works this long, once.
export const HANDOFF_MS = 10 * 60000;

// ---------- checking ----------

const bad = (path, message) => new ApiError(400, 'bad_feed', { path, message: `${path}: ${message}` });
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const F = {
  id: { t: 'id', req: true }, ref: { t: 'id' }, text: (max, req = false) => ({ t: 'text', max, req }),
  date: (req = false) => ({ t: 'date', req }), at: { t: 'at' }, url: { t: 'url' },
  enumOf: (values, req = false) => ({ t: 'enum', values, req }),
};
const SHAPES = {
  family: { id: F.id, name: F.text(120, true), emails: { list: 'email', max: MAX.emails }, status_url: F.url, placements: { list: 'placement', max: MAX.placements } },
  placement: {
    id: F.id, puppy_id: F.ref, puppy_name: F.text(60, true), contract_signed_on: F.date(true), go_home_on: F.date(), pickup_at: F.at,
    microchip: F.text(40), registration_no: F.text(40), voided: { object: 'voided' }, health: { list: 'health', max: MAX.health },
    extras: { list: 'extra', max: 10 },
  },
  extra: { id: F.id, extra_id: F.id },
  voided: { reason: F.enumOf(['died', 'failed_health', 'backed_out', 'other'], true), on: F.date(true) },
  health: { id: F.id, type: F.enumOf(['vaccine', 'deworming', 'vet_visit', 'other'], true), given_on: F.date(true), name: F.text(120, true), notes: F.text(400) },
  vet: { clinic: F.text(120), doctor: F.text(120), phone: F.text(40), address: F.text(200) },
  removed: { type: F.enumOf(['family', 'placement', 'health'], true), id: F.id },
};

function value(f, v, path) {
  if (v === undefined || v === null || v === '') {
    if (f.req) throw bad(path, 'required');
    return null;
  }
  switch (f.t) {
    case 'id':
      if (typeof v !== 'string' || !/^[\w.:-]{1,80}$/.test(v)) throw bad(path, 'not an id');
      return v;
    case 'text':
      if (typeof v !== 'string') throw bad(path, 'must be text');
      return v.replace(/\s+/g, ' ').trim().slice(0, f.max) || (f.req ? (() => { throw bad(path, 'required'); })() : null);
    case 'date':
      if (typeof v !== 'string' || !DATE_RE.test(v) || Number.isNaN(Date.parse(`${v}T00:00:00Z`))) throw bad(path, 'must be a date (YYYY-MM-DD)');
      return v;
    case 'at':
      if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v) || Number.isNaN(Date.parse(v))) throw bad(path, 'must be a time (ISO 8601)');
      return new Date(v).toISOString();
    case 'url':
      if (typeof v !== 'string' || !/^https:\/\/[^\s<>"]{3,500}$/i.test(v)) throw bad(path, 'must be an https address');
      return v;
    case 'enum':
      if (!f.values.includes(v)) throw bad(path, `must be one of ${f.values.join(', ')}`);
      return v;
    default: throw bad(path, 'unknown');
  }
}

function shape(name, obj, path) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw bad(path, 'must be an object');
  const fields = SHAPES[name];
  for (const k of Object.keys(obj)) if (!(k in fields)) throw bad(`${path}.${k}`, 'not a field KennelPort takes');
  const out = {};
  for (const [k, f] of Object.entries(fields)) {
    if (f.list) out[k] = list(f.list, obj[k] ?? [], `${path}.${k}`, f.max);
    else if (f.object) out[k] = obj[k] == null ? null : shape(f.object, obj[k], `${path}.${k}`);
    else out[k] = value(f, obj[k], `${path}.${k}`);
  }
  return out;
}

function list(name, v, path, max) {
  if (!Array.isArray(v)) throw bad(path, 'must be a list');
  if (v.length > max) throw bad(path, `at most ${max}`);
  if (name === 'email') {
    return [...new Set(v.map((x, i) => {
      const e = typeof x === 'string' ? normalizeEmail(x) : null;
      if (!e) throw bad(`${path}[${i}]`, 'not an email address');
      return e;
    }))];
  }
  const rows = v.map((x, i) => shape(name, x, `${path}[${i}]`));
  if (name !== 'removed') {
    const seen = new Set();
    rows.forEach((r, i) => { if (seen.has(r.id)) throw bad(`${path}[${i}].id`, `"${r.id}" is sent twice`); seen.add(r.id); });
  }
  return rows;
}

const TOP = ['format', 'feed_id', 'kennel_id', 'sent_at', 'families', 'vet', 'removed'];

// For the linked sample's coverage test (tests/fixtures/linked-sample).
export { SHAPES as FEED_SHAPES, TOP as FEED_TOP };

export function cleanFeed(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw bad('feed', 'must be an object');
  if (body.format !== FEED_FORMAT) throw new ApiError(400, 'bad_format', { message: `KennelPort takes family feed format ${FEED_FORMAT}.` });
  for (const k of Object.keys(body)) if (!TOP.includes(k)) throw bad(k, 'not a field KennelPort takes');
  return {
    feed_id: value(F.id, body.feed_id, 'feed_id'),
    kennel_id: value(F.id, body.kennel_id, 'kennel_id'),
    families: list('family', body.families ?? [], 'families', MAX.families),
    vet: body.vet == null ? null : shape('vet', body.vet, 'vet'),
    removed: list('removed', body.removed ?? [], 'removed', MAX.removed),
  };
}

// ---------- applying ----------

const now = () => new Date().toISOString();
const show = (v) => (v === null || v === undefined || v === '' ? null : String(v));
const edited = (row) => JSON.parse(row.edited_fields || '[]');

const historyStmt = (env, siteId, tbl, rowId, field, from, to, at) => env.DB.prepare(`INSERT INTO portal_history (site_id, tbl, row_id, field, old_value, new_value, changed_at, changed_by)
  VALUES (?, ?, ?, ?, ?, ?, ?, 'kennelos')`).bind(siteId, tbl, rowId, field, show(from), show(to), at);

async function tombstoned(env, siteId, type, id) {
  return Boolean(await env.DB.prepare('SELECT 1 FROM portal_tombstones WHERE site_id = ? AND type = ? AND kennelos_id = ?').bind(siteId, type, id).first());
}

// A value KennelOS sent for a field she edited: kept for her, unless it's the one
// she already has, or one she ignored.
async function suggest(env, siteId, tbl, rowId, field, val, at) {
  const cur = await env.DB.prepare('SELECT value, ignored FROM portal_suggestions WHERE tbl = ? AND row_id = ? AND field = ?').bind(tbl, rowId, field).first();
  if (cur && show(cur.value) === show(val)) return false;
  await env.DB.prepare(`INSERT INTO portal_suggestions (site_id, tbl, row_id, field, value, ignored, sent_at) VALUES (?, ?, ?, ?, ?, 0, ?)
    ON CONFLICT (tbl, row_id, field) DO UPDATE SET value = excluded.value, ignored = 0, sent_at = excluded.sent_at`).bind(siteId, tbl, rowId, field, show(val), at).run();
  return true;
}
const unsuggest = (env, tbl, rowId, field) => env.DB.prepare('DELETE FROM portal_suggestions WHERE tbl = ? AND row_id = ? AND field = ?').bind(tbl, rowId, field).run();

// Add the addresses KennelOS knows that the family doesn't have yet. Never removes
// one: a removal is hers (an address she took off isn't put back, see below).
async function addEmails(env, siteId, familyId, emails, counts) {
  for (const email of emails) {
    const hash = await emailHash(env, email);
    const row = await env.DB.prepare('SELECT family_id FROM portal_emails WHERE site_id = ? AND email_hash = ?').bind(siteId, hash).first();
    if (row) { if (row.family_id !== familyId) counts.email_conflicts++; continue; }
    const gone = await env.DB.prepare("SELECT 1 FROM portal_history WHERE site_id = ? AND tbl = 'portal_families' AND row_id = ? AND field = 'email_removed' AND old_value = ?").bind(siteId, familyId, hash).first();
    if (gone) continue;
    await env.DB.prepare('INSERT INTO portal_emails (id, site_id, family_id, email_hash, email_enc, added_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), siteId, familyId, hash, await encryptEmail(env, email), now()).run();
    counts.emails_added++;
  }
}

// The family: by its KennelOS id, else one she typed in with one of the same
// addresses (it becomes linked), else a new one.
async function upsertFamily(env, siteId, bf, at, counts) {
  if (await tombstoned(env, siteId, 'family', bf.id)) { counts.skipped_deleted++; return null; }
  let fam = await env.DB.prepare("SELECT * FROM portal_families WHERE site_id = ? AND kennelos_id = ? AND status = 'active'").bind(siteId, bf.id).first();
  // Deleted by her (undoable for 30 days) or erased: KennelOS doesn't bring them back.
  if (fam?.deleted_at) { counts.skipped_deleted++; return null; }
  if (!fam && await env.DB.prepare("SELECT 1 FROM portal_families WHERE site_id = ? AND kennelos_id = ? AND status = 'erased'").bind(siteId, bf.id).first()) { counts.skipped_deleted++; return null; }
  if (!fam) {
    for (const email of bf.emails) {
      const hit = await env.DB.prepare(`SELECT f.* FROM portal_emails e JOIN portal_families f ON f.id = e.family_id
        WHERE e.site_id = ? AND e.email_hash = ? AND f.status = 'active' AND f.deleted_at IS NULL AND f.kennelos_id IS NULL`).bind(siteId, await emailHash(env, email)).first();
      if (hit) { fam = { ...hit, edited_fields: JSON.stringify([...new Set([...edited(hit), 'name'])]) }; break; }
    }
    if (fam) {
      await env.DB.batch([
        // What she typed is hers: KennelOS's different name waits for her.
        env.DB.prepare('UPDATE portal_families SET kennelos_id = ?, kennelos_gone_at = NULL, edited_fields = ?, updated_at = ? WHERE id = ?').bind(bf.id, JSON.stringify([...new Set([...edited(fam), 'name'])]), at, fam.id),
        historyStmt(env, siteId, 'portal_families', fam.id, 'kennelos_linked', null, bf.name, at),
      ]);
      counts.families_linked++;
    }
  }
  if (!fam) {
    const id = crypto.randomUUID();
    await env.DB.batch([
      env.DB.prepare("INSERT INTO portal_families (id, site_id, name, status_url, source, kennelos_id, created_at, updated_at) VALUES (?, ?, ?, ?, 'kennelos', ?, ?, ?)")
        .bind(id, siteId, bf.name, bf.status_url, bf.id, at, at),
      historyStmt(env, siteId, 'portal_families', id, 'created', null, bf.name, at),
    ]);
    await addEmails(env, siteId, id, bf.emails, counts);
    counts.families_new++;
    return env.DB.prepare('SELECT * FROM portal_families WHERE id = ?').bind(id).first();
  }
  const sets = [];
  const binds = [];
  const stmts = [];
  if (bf.name !== fam.name) {
    if (edited(fam).includes('name')) { if (await suggest(env, siteId, 'portal_families', fam.id, 'name', bf.name, at)) counts.suggestions++; } else {
      sets.push('name = ?'); binds.push(bf.name);
      stmts.push(historyStmt(env, siteId, 'portal_families', fam.id, 'name', fam.name, bf.name, at));
    }
  } else await unsuggest(env, 'portal_families', fam.id, 'name');
  if (show(bf.status_url) !== show(fam.status_url)) { sets.push('status_url = ?'); binds.push(bf.status_url); }
  if (fam.kennelos_gone_at) { sets.push('kennelos_gone_at = NULL'); stmts.push(historyStmt(env, siteId, 'portal_families', fam.id, 'kennelos', 'no longer in KennelOS', 'back in KennelOS', at)); }
  if (sets.length) stmts.unshift(env.DB.prepare(`UPDATE portal_families SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`).bind(...binds, at, fam.id));
  if (stmts.length) { await env.DB.batch(stmts); counts.families_updated++; }
  await addEmails(env, siteId, fam.id, bf.emails, counts);
  return fam;
}

// The fields KennelOS fills on a placement, as the placement's own columns.
async function placementValues(env, siteId, bp) {
  const pup = bp.puppy_id ? await env.DB.prepare('SELECT id, name FROM puppies WHERE site_id = ? AND kennelos_id = ?').bind(siteId, bp.puppy_id).first() : null;
  return {
    puppy_id: pup?.id ?? null, puppy_name: bp.puppy_name, go_home_on: bp.go_home_on, pickup_booked_at: bp.pickup_at,
    microchip: bp.microchip, registration_no: bp.registration_no, contract_signed_on: bp.contract_signed_on,
  };
}

async function upsertPlacement(env, siteId, fam, bp, at, counts) {
  if (await tombstoned(env, siteId, 'placement', bp.id)) { counts.skipped_deleted++; return; }
  const v = await placementValues(env, siteId, bp);
  let p = await env.DB.prepare('SELECT * FROM portal_placements WHERE site_id = ? AND kennelos_id = ?').bind(siteId, bp.id).first();
  if (!p) {
    // A placement she typed in for this family becomes linked, not doubled: the one
    // with the same puppy, else the family's only open one she typed in (whatever
    // puppy, or none, she chose; hers stays and KennelOS's waits beside it).
    if (v.puppy_id) p = await env.DB.prepare("SELECT * FROM portal_placements WHERE site_id = ? AND family_id = ? AND puppy_id = ? AND status = 'open' AND kennelos_id IS NULL").bind(siteId, fam.id, v.puppy_id).first();
    if (!p && !bp.voided) {
      const { results: typed } = await env.DB.prepare("SELECT * FROM portal_placements WHERE site_id = ? AND family_id = ? AND status = 'open' AND kennelos_id IS NULL").bind(siteId, fam.id).all();
      const others = await env.DB.prepare("SELECT COUNT(*) AS n FROM portal_placements WHERE site_id = ? AND family_id = ? AND status = 'open' AND kennelos_id IS NOT NULL").bind(siteId, fam.id).first('n');
      if (typed.length === 1 && !others) p = typed[0];
    }
    if (p) {
      // Every field she filled in is hers; KennelOS fills the blanks.
      const mineNow = JSON.stringify([...new Set([...edited(p), ...PLACEMENT_FIELDS.filter((k) => p[k] !== null && p[k] !== undefined)])]);
      await env.DB.prepare('UPDATE portal_placements SET kennelos_id = ?, edited_fields = ? WHERE id = ?').bind(bp.id, mineNow, p.id).run();
      p = { ...p, kennelos_id: bp.id, edited_fields: mineNow };
      counts.placements_linked++;
    } else {
      if (bp.voided) return; // voided before it ever reached the portal
      if (v.puppy_id && await env.DB.prepare("SELECT 1 FROM portal_placements WHERE puppy_id = ? AND status = 'open'").bind(v.puppy_id).first()) { counts.puppy_conflicts++; v.puppy_id = null; }
      const id = crypto.randomUUID();
      const cols = { id, site_id: siteId, family_id: fam.id, ...v, source: 'kennelos', kennelos_id: bp.id, created_at: at, updated_at: at };
      await env.DB.batch([
        env.DB.prepare(`INSERT INTO portal_placements (${Object.keys(cols).join(', ')}) VALUES (${Object.keys(cols).map(() => '?').join(', ')})`).bind(...Object.values(cols)),
        ...Object.entries(v).filter(([k, x]) => x !== null && k !== 'puppy_id').map(([k, x]) => historyStmt(env, siteId, 'portal_placements', id, k, null, x, at)),
      ]);
      counts.placements_new++;
      p = await env.DB.prepare('SELECT * FROM portal_placements WHERE id = ?').bind(id).first();
      await upsertHealth(env, siteId, p, bp.health, at, counts);
      await upsertExtras(env, siteId, p, bp.extras, counts);
      return;
    }
  }
  // Her edits win; KennelOS's other values apply. Once the puppy is home, the
  // pickup is hers: a booked time from KennelOS no longer moves anything.
  const mine = edited(p);
  const apply = {};
  for (const [k, x] of Object.entries(v)) {
    // The puppy: a puppy KennelOS names that isn't on her website changes nothing,
    // and its name follows the puppy she chose if she changed it.
    if (k === 'puppy_id' && !x) continue;
    if (k === 'puppy_name' && mine.includes('puppy_id')) continue;
    if (k === 'pickup_booked_at' && p.picked_up_at) continue;
    if (show(x) === show(p[k])) { await unsuggest(env, 'portal_placements', p.id, k); continue; }
    if (mine.includes(k) && PLACEMENT_FIELDS.includes(k)) { if (await suggest(env, siteId, 'portal_placements', p.id, k, x, at)) counts.suggestions++; continue; }
    if (k === 'puppy_id' && await env.DB.prepare("SELECT 1 FROM portal_placements WHERE puppy_id = ? AND status = 'open' AND id != ?").bind(x, p.id).first()) { counts.puppy_conflicts++; continue; }
    apply[k] = x;
  }
  // A new booked time on a stopped clock waits for that time again (store.updatePlacement).
  if ('pickup_booked_at' in apply && p.pickup_state === 'not_yet') apply.pickup_state = 'planned';
  if (p.kennelos_gone_at) apply.kennelos_gone_at = null;
  // A sale voided: the placement closes and its reminders stop (3.4). A pup who
  // died before pickup: life status deceased. The family's page for it is chunk 4.
  if (bp.voided && p.status === 'open') {
    Object.assign(apply, { status: 'closed', closed_reason: bp.voided.reason });
    if (bp.voided.reason === 'died' && !p.picked_up_at) Object.assign(apply, { life_status: 'deceased', life_status_on: bp.voided.on });
    counts.placements_closed++;
  }
  if (Object.keys(apply).length) {
    await applyChanges(env, siteId, p, apply, 'kennelos');
    counts.placements_updated++;
  }
  // Backed out with nothing else open: their portal account goes in 30 days,
  // undoable until then (plan 10.1); her sale records stay in KennelOS.
  if (apply.closed_reason === 'backed_out' && !(await env.DB.prepare("SELECT 1 FROM portal_placements WHERE family_id = ? AND status = 'open'").bind(fam.id).first())) {
    await scheduleDelete(env, siteId, fam.id, 'backed_out');
    counts.families_leaving++;
  }
  await upsertHealth(env, siteId, { ...p, ...apply }, bp.health, at, counts);
  if (p.status === 'open' && !bp.voided) await upsertExtras(env, siteId, p, bp.extras, counts);
}

// An extra on the sale (plan 8.1): on the placement, unconfirmed until she confirms
// it. One she removed or turned down isn't offered again (its history says so).
async function upsertExtras(env, siteId, p, rows, counts) {
  for (const x of rows ?? []) {
    if (await env.DB.prepare('SELECT 1 FROM portal_placement_extras WHERE placement_id = ? AND kennelos_id = ?').bind(p.id, x.id).first()) continue;
    if (await env.DB.prepare("SELECT 1 FROM portal_history WHERE tbl = 'portal_placements' AND row_id = ? AND field = 'extra_declined' AND new_value = ?").bind(p.id, x.id).first()) continue;
    const extra = await env.DB.prepare('SELECT id FROM extras WHERE site_id = ? AND kennelos_id = ?').bind(siteId, x.extra_id).first('id');
    if (!extra || await env.DB.prepare('SELECT 1 FROM portal_placement_extras WHERE placement_id = ? AND extra_id = ?').bind(p.id, extra).first()) continue;
    await addExtra(env, siteId, p.id, extra, { by: 'kennelos', kennelosId: x.id });
    counts.extras_new++;
  }
}

async function upsertHealth(env, siteId, p, rows, at, counts) {
  for (const h of rows) {
    const cur = await env.DB.prepare('SELECT * FROM portal_health_records WHERE site_id = ? AND placement_id = ? AND kennelos_id = ?').bind(siteId, p.id, h.id).first();
    if (!cur) {
      if (await tombstoned(env, siteId, 'health', h.id)) continue;
      await env.DB.batch([
        env.DB.prepare("INSERT INTO portal_health_records (id, site_id, placement_id, type, given_on, name, notes, source, kennelos_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'kennelos', ?, ?)")
          .bind(crypto.randomUUID(), siteId, p.id, h.type, h.given_on, h.name, h.notes, h.id, at),
        historyStmt(env, siteId, 'portal_placements', p.id, 'health_record', null, `${h.name}, ${h.given_on}`, at),
      ]);
      counts.health_new++;
      continue;
    }
    if (cur.type !== h.type || cur.given_on !== h.given_on || cur.name !== h.name || show(cur.notes) !== show(h.notes) || cur.kennelos_gone_at) {
      await env.DB.prepare('UPDATE portal_health_records SET type = ?, given_on = ?, name = ?, notes = ?, kennelos_gone_at = NULL WHERE id = ?').bind(h.type, h.given_on, h.name, h.notes, cur.id).run();
      counts.health_updated++;
    }
  }
}

// Her vet, as suggested contacts for families (plan 4): filled in where hers are
// blank; where hers differ, a suggestion.
const VET_FIELDS = { clinic: 'vet_clinic', doctor: 'vet_doctor', phone: 'vet_phone', address: 'vet_address' };
async function applyVet(env, siteId, vet, at, counts) {
  if (!vet) return;
  const s = await getSettings(env, siteId);
  const fill = {};
  for (const [k, col] of Object.entries(VET_FIELDS)) {
    const x = vet[k];
    if (!x || show(x) === show(s[col])) { await unsuggest(env, 'portal_settings', siteId, col); continue; }
    if (!s[col]) fill[col] = x;
    else if (await suggest(env, siteId, 'portal_settings', siteId, col, x, at)) counts.suggestions++;
  }
  const cols = Object.keys(fill);
  if (!cols.length) return;
  await env.DB.prepare(`INSERT INTO portal_settings (site_id, ${cols.join(', ')}, updated_at) VALUES (?, ${cols.map(() => '?').join(', ')}, ?)
    ON CONFLICT (site_id) DO UPDATE SET ${cols.map((c) => `${c} = excluded.${c}`).join(', ')}, updated_at = excluded.updated_at`).bind(siteId, ...Object.values(fill), at).run();
  counts.vet_filled += cols.length;
}

async function markGone(env, siteId, r, at, counts) {
  const tbl = { family: 'portal_families', placement: 'portal_placements', health: 'portal_health_records' }[r.type];
  const res = await env.DB.prepare(`UPDATE ${tbl} SET kennelos_gone_at = ? WHERE site_id = ? AND kennelos_id = ? AND kennelos_gone_at IS NULL`).bind(at, siteId, r.id).run();
  if (res.meta.changes) counts.gone++;
}

// ---------- the facts that go back ----------

export async function factsFor(env, siteId) {
  const { results } = await env.DB.prepare(`SELECT p.kennelos_id, p.picked_up_at, p.pickup_state, p.microchip, p.edited_fields, p.life_status, p.life_status_on, f.kennelos_id AS family_kennelos_id
    FROM portal_placements p JOIN portal_families f ON f.id = p.family_id
    WHERE p.site_id = ? AND p.kennelos_id IS NOT NULL AND f.status = 'active' AND f.deleted_at IS NULL`).bind(siteId).all();
  return results.map((p) => {
    const out = { id: p.kennelos_id, family_id: p.family_kennelos_id };
    const home = p.pickup_state === 'confirmed' && p.picked_up_at;
    if (home) { out.picked_up_at = p.picked_up_at; out.portal_only = true; }
    if (edited(p).includes('microchip') && p.microchip) out.microchip = p.microchip;
    if (p.life_status === 'deceased' && home) out.died_on = p.life_status_on;
    return out;
  }).filter((x) => Object.keys(x).length > 2);
}

// ---------- the one-tap link ----------

// The key the status page signs its links with: derived, never stored, and only
// for a site still linked to that KennelOS kennel (an Unlink ends it).
async function handoffKey(env, siteId, kennelId) {
  if (!env.EMAIL_HMAC_KEY) throw new ApiError(503, 'not_set_up', { message: 'KennelPort isn\'t set up for this yet.' });
  return hmacHex(env.EMAIL_HMAC_KEY, `portal-handoff:${siteId}:${kennelId}`);
}

const b64url = (s) => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64url = (s) => atob(s.replace(/-/g, '+').replace(/_/g, '/'));

// What KennelOS's server does (and the tests): the token for ?t= on /family/handoff.
// f: the family's KennelOS id; x: when it stops working (ms); n: a one-time value.
export async function makeHandoffToken(key, familyKennelosId, at = Date.now()) {
  const body = b64url(JSON.stringify({ f: familyKennelosId, x: at + HANDOFF_MS, n: randomHex(16) }));
  return `${body}.${await hmacHex(key, body)}`;
}

// The family the token is for, or null: signed by the site's key, unexpired, not
// used before, for a family here that came from KennelOS.
export async function redeemHandoff(env, site, token) {
  const m = /^([A-Za-z0-9_-]{10,400})\.([0-9a-f]{64})$/.exec(String(token ?? ''));
  if (!m) return null;
  const link = await env.DB.prepare('SELECT kennelos_kennel_id FROM links WHERE site_id = ? AND revoked_at IS NULL LIMIT 1').bind(site.id).first();
  if (!link) return null;
  if (!timingSafeEqual(m[2], await hmacHex(await handoffKey(env, site.id, link.kennelos_kennel_id), m[1]))) return null;
  let body;
  try { body = JSON.parse(unb64url(m[1])); } catch { return null; }
  if (typeof body?.f !== 'string' || typeof body.n !== 'string' || typeof body.x !== 'number') return null;
  if (body.x < Date.now() || body.x > Date.now() + HANDOFF_MS + 60000) return null;
  const used = await env.DB.prepare('INSERT INTO portal_handoffs (nonce_hash, site_id, used_at) VALUES (?, ?, ?) ON CONFLICT (nonce_hash) DO NOTHING')
    .bind(await sha256Hex(`${site.id}:${body.n}`), site.id, now()).run();
  if (used.meta.changes !== 1) return null;
  return env.DB.prepare("SELECT id FROM portal_families WHERE site_id = ? AND kennelos_id = ? AND status = 'active' AND deleted_at IS NULL").bind(site.id, body.f).first('id');
}

// ---------- the endpoint ----------

export async function applyFeed(env, device, body) {
  const feed = cleanFeed(body);
  if (feed.kennel_id !== device.kennelos_kennel_id) throw new ApiError(409, 'other_kennel', { message: 'This website is linked to another of your kennels.' });
  const site = await env.DB.prepare('SELECT id, subdomain, portal_on FROM sites WHERE id = ?').bind(device.site_id).first();
  if (!site.portal_on) throw new ApiError(409, 'portal_off', { message: 'The puppy portal isn\'t switched on for this website.' });
  const at = now();
  const counts = {
    families_new: 0, families_linked: 0, families_updated: 0, emails_added: 0, email_conflicts: 0, placements_new: 0, placements_linked: 0,
    placements_updated: 0, placements_closed: 0, families_leaving: 0, extras_new: 0, puppy_conflicts: 0, health_new: 0, health_updated: 0, suggestions: 0, vet_filled: 0, gone: 0, skipped_deleted: 0,
  };
  for (const bf of feed.families) {
    const fam = await upsertFamily(env, site.id, bf, at, counts);
    if (!fam) continue;
    for (const bp of bf.placements) await upsertPlacement(env, site.id, fam, bp, at, counts);
  }
  await applyVet(env, site.id, feed.vet, at, counts);
  for (const r of feed.removed) await markGone(env, site.id, r, at, counts);
  await env.DB.prepare('UPDATE sites SET portal_feed_at = ? WHERE id = ?').bind(at, site.id).run();
  return {
    received: feed.feed_id,
    summary: Object.fromEntries(Object.entries(counts).filter(([, n]) => n)),
    facts: await factsFor(env, site.id),
    portal: { url: `${await siteBase(env, site)}/family`, handoff_url: `${await siteBase(env, site)}/family/handoff`, handoff_key: await handoffKey(env, site.id, device.kennelos_kennel_id), handoff_minutes: HANDOFF_MS / 60000 },
  };
}

// ---------- her side ----------

// KennelOS's waiting values for her screens: [{ tbl, row_id, field, value }].
export async function suggestionsFor(env, siteId, tbl, rowId) {
  return (await env.DB.prepare('SELECT field, value, sent_at FROM portal_suggestions WHERE site_id = ? AND tbl = ? AND row_id = ? AND ignored = 0').bind(siteId, tbl, rowId).all()).results;
}

export async function ignoreSuggestion(env, siteId, tbl, rowId, field) {
  await env.DB.prepare('UPDATE portal_suggestions SET ignored = 1 WHERE site_id = ? AND tbl = ? AND row_id = ? AND field = ?').bind(siteId, tbl, rowId, field).run();
}

export async function takeSuggestion(env, siteId, tbl, rowId, field) {
  const row = await env.DB.prepare('SELECT value FROM portal_suggestions WHERE site_id = ? AND tbl = ? AND row_id = ? AND field = ? AND ignored = 0').bind(siteId, tbl, rowId, field).first();
  if (!row) return;
  const at = now();
  if (tbl === 'portal_placements') {
    const p = await env.DB.prepare('SELECT * FROM portal_placements WHERE id = ? AND site_id = ?').bind(rowId, siteId).first();
    if (p && Object.hasOwn(p, field)) {
      const values = { [field]: row.value };
      if (field === 'puppy_id') values.puppy_name = (await env.DB.prepare('SELECT name FROM puppies WHERE id = ?').bind(row.value).first('name')) ?? p.puppy_name;
      await applyChanges(env, siteId, p, values, 'kennelos');
      // Back to following KennelOS for this field.
      await env.DB.prepare('UPDATE portal_placements SET edited_fields = ? WHERE id = ?').bind(JSON.stringify(edited(p).filter((k) => k !== field)), p.id).run();
    }
  } else if (tbl === 'portal_families' && field === 'name') {
    const f = await env.DB.prepare('SELECT * FROM portal_families WHERE id = ? AND site_id = ?').bind(rowId, siteId).first();
    if (f) {
      await env.DB.batch([
        env.DB.prepare('UPDATE portal_families SET name = ?, edited_fields = ?, updated_at = ? WHERE id = ?').bind(row.value, JSON.stringify(edited(f).filter((k) => k !== 'name')), at, f.id),
        historyStmt(env, siteId, 'portal_families', f.id, 'name', f.name, row.value, at),
      ]);
    }
  } else if (tbl === 'portal_settings' && Object.values(VET_FIELDS).includes(field)) {
    await env.DB.prepare(`UPDATE portal_settings SET ${field} = ?, updated_at = ? WHERE site_id = ?`).bind(row.value, at, siteId).run();
  }
  await unsuggest(env, tbl, rowId, field);
}

// Deleted stays deleted: tombstones for a family's KennelOS records, by id and
// type, before store.deleteFamily removes them. The family's own tombstone keeps the
// name she knew them by (no address), so she can give them back (account.giveBack);
// each keeps the family's KennelOS id, so giving them back lifts them all.
export async function tombstoneStatements(env, siteId, familyId) {
  const at = now();
  const fam = await env.DB.prepare('SELECT kennelos_id, name FROM portal_families WHERE id = ? AND site_id = ?').bind(familyId, siteId).first();
  const { results: ps } = await env.DB.prepare('SELECT id, kennelos_id, COALESCE(call_name, puppy_name) AS pup FROM portal_placements WHERE family_id = ? AND site_id = ? ORDER BY created_at').bind(familyId, siteId).all();
  const { results: hs } = await env.DB.prepare(`SELECT kennelos_id FROM portal_health_records WHERE site_id = ? AND kennelos_id IS NOT NULL AND placement_id IN (SELECT id FROM portal_placements WHERE family_id = ?)`).bind(siteId, familyId).all();
  const famId = fam?.kennelos_id ?? null;
  const label = fam ? [fam.name, ...new Set(ps.map((p) => p.pup).filter(Boolean))].join(' · ').slice(0, 200) : null;
  const ins = (type, id, lbl = null) => env.DB.prepare('INSERT OR IGNORE INTO portal_tombstones (site_id, type, kennelos_id, deleted_at, label, family_kennelos_id) VALUES (?, ?, ?, ?, ?, ?)').bind(siteId, type, id, at, lbl, famId);
  return [
    ...(famId ? [ins('family', famId, label)] : []),
    ...ps.filter((p) => p.kennelos_id).map((p) => ins('placement', p.kennelos_id)),
    ...hs.map((h) => ins('health', h.kennelos_id)),
    env.DB.prepare(`DELETE FROM portal_suggestions WHERE site_id = ? AND ((tbl = 'portal_families' AND row_id = ?) OR (tbl = 'portal_placements' AND row_id IN (SELECT id FROM portal_placements WHERE family_id = ?)))`).bind(siteId, familyId, familyId),
  ];
}

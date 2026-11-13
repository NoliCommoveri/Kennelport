// The same family twice (the owner's decision of 2026-11-13): she typed a family
// in, then KennelOS sent them too, and the two didn't link by themselves (feed.js
// links them by address, and a placement by puppy or as the family's only typed
// one). Merge folds what she typed into what KennelOS sent, so there's one, and
// KennelOS keeps updating it:
//
//   mergePlacement  a placement she typed into the family's KennelOS placement
//   mergeFamily     a family she typed into a KennelOS family, then their
//                   placements too when there's just one of each
//
// What she typed wins, as when the feed links a record (plan 3.1): her values stay,
// marked hers, with KennelOS's different one waiting as "KennelOS has a newer value";
// KennelOS fills the blanks. Everything hers moves across (files, shots, ticks,
// programs, extras, photos, the reminder log, messages, addresses, history), and
// the typed record goes. Each merge is one batch, so it happens whole or not at all.
import { PortalError, PLACEMENT_FIELDS } from './store.js';

const now = () => new Date().toISOString();
const show = (v) => (v === null || v === undefined || v === '' ? null : String(v));
const edited = (row) => JSON.parse(row.edited_fields || '[]');

const hist = (env, siteId, tbl, rowId, field, from, to, at) => env.DB.prepare(`INSERT INTO portal_history (site_id, tbl, row_id, field, old_value, new_value, changed_at, changed_by)
  VALUES (?, ?, ?, ?, ?, ?, ?, 'breeder')`).bind(siteId, tbl, rowId, field, show(from), show(to), at);
const suggestion = (env, siteId, tbl, rowId, field, value, at) => env.DB.prepare(`INSERT INTO portal_suggestions (site_id, tbl, row_id, field, value, ignored, sent_at) VALUES (?, ?, ?, ?, ?, 0, ?)
  ON CONFLICT (tbl, row_id, field) DO UPDATE SET value = excluded.value, ignored = 0, sent_at = excluded.sent_at`).bind(siteId, tbl, rowId, field, show(value), at);

// The family's open placements, split into the ones she typed in and KennelOS's.
export async function placementDuplicates(env, siteId, familyId) {
  const { results } = await env.DB.prepare("SELECT * FROM portal_placements WHERE site_id = ? AND family_id = ? AND status = 'open' ORDER BY created_at").bind(siteId, familyId).all();
  const typed = results.filter((p) => !p.kennelos_id);
  const linked = results.filter((p) => p.kennelos_id);
  return typed.length && linked.length ? { typed, linked } : null;
}

// The families this one could be the same as: of the other kind (typed in, or from
// KennelOS), active and not deleted.
export async function familyCandidates(env, siteId, fam) {
  const { results } = await env.DB.prepare(`SELECT f.id, f.name, (SELECT COALESCE(call_name, puppy_name) FROM portal_placements WHERE family_id = f.id ORDER BY status = 'open' DESC, created_at DESC LIMIT 1) AS pup
    FROM portal_families f WHERE f.site_id = ? AND f.id != ? AND f.status = 'active' AND f.deleted_at IS NULL AND f.kennelos_id IS ${fam.kennelos_id ? 'NULL' : 'NOT NULL'} ORDER BY f.name`).bind(siteId, fam.id).all();
  return results;
}

// The columns that record what she and the family did (pickup, the vet visit, the
// contract, a loss): taken from the typed placement where KennelOS's is blank.
const PICKUP = ['picked_up_at', 'pickup_state', 'vet_deadline_at'];
const DONE = ['vet_booked_for', 'vet_clinic', 'vet_booked_at', 'proof_file_id', 'proof_uploaded_at', 'proof_accepted_at', 'contract_file_id', 'contract_signed_on', 'loss_note', 'loss_note_at', 'loss_sent_at'];

export async function mergePlacement(env, siteId, familyId, fromId, intoId) {
  const get = (id) => env.DB.prepare("SELECT * FROM portal_placements WHERE id = ? AND site_id = ? AND family_id = ? AND status = 'open'").bind(id, siteId, familyId).first();
  const h = await get(fromId);
  const k = await get(intoId);
  if (!h || !k || h.kennelos_id || !k.kennelos_id) throw new PortalError('Those two records can\'t be merged. Open the family again and try once more.');
  const at = now();
  const set = {};
  const stmts = [];
  const mine = new Set([...edited(k), ...edited(h)]);
  // Her values win; KennelOS's different one waits beside them.
  for (const f of PLACEMENT_FIELDS) {
    if (show(h[f]) === null) continue;
    mine.add(f);
    if (show(h[f]) === show(k[f])) continue;
    set[f] = h[f];
    if (show(k[f]) !== null) stmts.push(suggestion(env, siteId, 'portal_placements', k.id, f, k[f], at));
  }
  if ('puppy_id' in set) set.puppy_name = h.puppy_name;
  if (h.picked_up_at && !k.picked_up_at) for (const f of PICKUP) set[f] = h[f];
  else if (!k.picked_up_at && k.pickup_state === 'planned' && h.pickup_state !== 'planned') set.pickup_state = h.pickup_state;
  for (const f of DONE) if (show(h[f]) !== null && show(k[f]) === null) set[f] = h[f];
  if (h.life_status !== 'with_family' && k.life_status === 'with_family') Object.assign(set, { life_status: h.life_status, life_status_on: h.life_status_on });
  set.edited_fields = JSON.stringify([...mine].filter((f) => PLACEMENT_FIELDS.includes(f) || f === 'picked_up_at'));
  const cols = Object.keys(set);
  const H = h.id;
  const K = k.id;
  await env.DB.batch([
    env.DB.prepare(`UPDATE portal_placements SET ${cols.map((c) => `${c} = ?`).join(', ')}, updated_at = ? WHERE id = ?`).bind(...cols.map((c) => set[c]), at, K),
    ...stmts,
    // Shots: hers move across, less any KennelOS already has (same kind, day and name).
    env.DB.prepare(`DELETE FROM portal_health_records WHERE placement_id = ? AND EXISTS (SELECT 1 FROM portal_health_records x WHERE x.placement_id = ?
      AND x.type = portal_health_records.type AND x.given_on = portal_health_records.given_on AND lower(trim(x.name)) = lower(trim(portal_health_records.name)))`).bind(H, K),
    // An extra KennelOS suggested that she already has on hers: hers stays.
    env.DB.prepare(`DELETE FROM portal_placement_extras WHERE placement_id = ? AND confirmed_at IS NULL AND extra_id IS NOT NULL
      AND extra_id IN (SELECT extra_id FROM portal_placement_extras WHERE placement_id = ?)`).bind(K, H),
    ...['portal_files', 'portal_health_records', 'portal_checklist_items', 'portal_timeline_tasks', 'portal_placement_extras', 'portal_media', 'portal_email_log']
      .map((t) => env.DB.prepare(`UPDATE ${t} SET placement_id = ? WHERE placement_id = ?`).bind(K, H)),
    // Ticks and programs: one row each; the later one wins.
    env.DB.prepare(`DELETE FROM portal_placement_progress WHERE placement_id = ? AND EXISTS (SELECT 1 FROM portal_placement_progress x WHERE x.placement_id = ?
      AND x.item_type = portal_placement_progress.item_type AND x.item_id = portal_placement_progress.item_id AND x.updated_at >= portal_placement_progress.updated_at)`).bind(K, H),
    env.DB.prepare('UPDATE OR IGNORE portal_placement_progress SET placement_id = ? WHERE placement_id = ?').bind(K, H),
    env.DB.prepare('DELETE FROM portal_placement_progress WHERE placement_id = ?').bind(H),
    env.DB.prepare(`DELETE FROM portal_placements_programs WHERE placement_id = ? AND EXISTS (SELECT 1 FROM portal_placements_programs x WHERE x.placement_id = ?
      AND x.product_id = portal_placements_programs.product_id AND x.updated_at >= portal_placements_programs.updated_at)`).bind(K, H),
    env.DB.prepare('UPDATE OR IGNORE portal_placements_programs SET placement_id = ? WHERE placement_id = ?').bind(K, H),
    env.DB.prepare('DELETE FROM portal_placements_programs WHERE placement_id = ?').bind(H),
    env.DB.prepare("UPDATE portal_history SET row_id = ? WHERE site_id = ? AND tbl = 'portal_placements' AND row_id = ?").bind(K, siteId, H),
    env.DB.prepare("DELETE FROM portal_suggestions WHERE tbl = 'portal_placements' AND row_id = ?").bind(H),
    hist(env, siteId, 'portal_placements', K, 'merged', null, h.call_name || h.puppy_name, at),
    env.DB.prepare('DELETE FROM portal_placements WHERE id = ?').bind(H),
  ]);
  return K;
}

// A family she typed in, into a KennelOS family (either way round on her screen;
// the KennelOS one is kept). Returns the kept family's id.
export async function mergeFamily(env, siteId, aId, bId) {
  const get = (id) => env.DB.prepare("SELECT * FROM portal_families WHERE id = ? AND site_id = ? AND status = 'active' AND deleted_at IS NULL").bind(id, siteId).first();
  const a = await get(aId);
  const b = await get(bId);
  if (!a || !b || a.id === b.id || Boolean(a.kennelos_id) === Boolean(b.kennelos_id)) throw new PortalError('Merge a family you typed in with one from KennelOS.');
  const h = a.kennelos_id ? b : a;
  const k = a.kennelos_id ? a : b;
  const at = now();
  const first = (x, y) => [x, y].filter(Boolean).sort()[0] ?? null;
  const last = (x, y) => [x, y].filter(Boolean).sort().at(-1) ?? null;
  const set = {
    invited_at: first(h.invited_at, k.invited_at), first_signed_in_at: first(h.first_signed_in_at, k.first_signed_in_at),
    last_activity_at: last(h.last_activity_at, k.last_activity_at), keep: Math.max(h.keep ?? 0, k.keep ?? 0),
  };
  const stmts = [];
  // The name she typed stays hers; KennelOS's waits beside it.
  if (h.name !== k.name) {
    set.name = h.name;
    set.edited_fields = JSON.stringify([...new Set([...edited(k), 'name'])]);
    stmts.push(suggestion(env, siteId, 'portal_families', k.id, 'name', k.name, at));
  }
  const cols = Object.keys(set);
  await env.DB.batch([
    env.DB.prepare(`UPDATE portal_families SET ${cols.map((c) => `${c} = ?`).join(', ')}, updated_at = ? WHERE id = ?`).bind(...cols.map((c) => set[c]), at, k.id),
    ...stmts,
    ...['portal_emails', 'portal_sessions', 'portal_messages', 'portal_email_log', 'portal_clicks', 'portal_placements']
      .map((t) => env.DB.prepare(`UPDATE ${t} SET family_id = ? WHERE family_id = ?`).bind(k.id, h.id)),
    env.DB.prepare("UPDATE portal_history SET row_id = ? WHERE site_id = ? AND tbl = 'portal_families' AND row_id = ?").bind(k.id, siteId, h.id),
    env.DB.prepare("DELETE FROM portal_suggestions WHERE tbl = 'portal_families' AND row_id = ?").bind(h.id),
    hist(env, siteId, 'portal_families', k.id, 'merged', null, h.name, at),
    env.DB.prepare('DELETE FROM portal_families WHERE id = ?').bind(h.id),
  ]);
  // One puppy record of each now: those are the same puppy too.
  const d = await placementDuplicates(env, siteId, k.id);
  if (d && d.typed.length === 1 && d.linked.length === 1) await mergePlacement(env, siteId, k.id, d.typed[0].id, d.linked[0].id);
  return k.id;
}

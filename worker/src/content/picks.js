// The breeder's own choice of records on a data block (docs/plans/kennelos-contract.md
// B3, the owner's decision of 2026-11-12), kept per site in block_picks (migration
// 0031), apart from the owner's build, so a change to the owner's settings never
// undoes them.
//
// - Every data block (Dog cards, Litter cards, Pup cards): `omit`, the records that
//   match the owner's conditions which she unticked. A record that stops matching or
//   leaves the site drops off her list, and its untick is forgotten the next time she
//   saves; until then it simply has nothing to leave out.
// - A Featured block (B5): `pick`, the records she chose, in her order, whatever the
//   owner's conditions. null until she chooses: the block shows what the owner's
//   conditions hold for, in the owner's order. A picked record that has left the site
//   drops out quietly and comes back if it returns. `fixed`: a record she wants
//   featured on set dates, which wins over the rotation (content/featured.js).
//
// The published snapshot carries them (snap.picks[page][block]), so rendering stays
// pure; render/parts.js blockRows applies them.
export const PICKS_MAX = 200;
export const FIXED_MAX = 6;
const ID = /^[A-Za-z0-9_-]{1,64}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export const isFeatured = (b) => b?.type === 'featured_dog' || b?.type === 'featured_pup';

const ids = (v) => (Array.isArray(v) ? [...new Set(v.map(String).filter((x) => ID.test(x)))].slice(0, PICKS_MAX) : []);

// One block's picks, every part present and in range.
export function cleanPicks(v) {
  const p = v && typeof v === 'object' ? v : {};
  const fixed = (Array.isArray(p.fixed) ? p.fixed : [])
    .map((f) => ({ id: String(f?.id ?? ''), from: String(f?.from ?? ''), to: String(f?.to ?? '') }))
    .filter((f) => ID.test(f.id) && DAY.test(f.from) && DAY.test(f.to))
    .map((f) => (f.to < f.from ? { ...f, from: f.to, to: f.from } : f))
    .slice(0, FIXED_MAX);
  return { omit: ids(p.omit), pick: Array.isArray(p.pick) ? ids(p.pick) : null, fixed };
}
export const noPicks = (p) => !p.omit.length && p.pick == null && !p.fixed.length;

// A block's records with her choice applied. `matching`: the records the owner's
// conditions hold for, in the owner's order; `all`: every record of its kind on the
// site (a Featured block's picks may be any of them).
export function applyPicks(b, matching, all, picks) {
  const p = cleanPicks(picks);
  if (isFeatured(b) && p.pick) {
    const byId = new Map(all.map((x) => [x.id, x]));
    return p.pick.map((id) => byId.get(id)).filter(Boolean);
  }
  if (!p.omit.length) return matching;
  const out = new Set(p.omit);
  return matching.filter((x) => !out.has(x.id));
}

// Her choice from her screen (manage/screens/picks.js), against the records it showed:
// on a block, the ticked ones of those that match (the rest are left out); on a
// Featured block, the ticked ones in the order posted. Ids not among them are dropped,
// which is how a record that left the site, or stopped matching, is forgotten.
export function picksFromForm(b, shown, { ticked, order, fixed = [] }) {
  const known = new Set(shown.map((x) => x.id));
  const on = new Set(ticked.filter((id) => known.has(id)));
  if (isFeatured(b)) {
    const ord = [...new Set(order.filter((id) => known.has(id)))];
    const rest = shown.map((x) => x.id).filter((id) => !ord.includes(id));
    return cleanPicks({ pick: [...ord, ...rest].filter((id) => on.has(id)), fixed: fixed.filter((f) => on.has(f.id)) });
  }
  return cleanPicks({ omit: shown.map((x) => x.id).filter((id) => !on.has(id)) });
}

// ---------- stored (block_picks) ----------

export async function getPicks(env, siteId, page, block) {
  const row = await env.DB.prepare('SELECT picks FROM block_picks WHERE site_id = ? AND page = ? AND block = ?').bind(siteId, page, block).first();
  return cleanPicks(row ? JSON.parse(row.picks) : null);
}

// Saved; none left (all ticked, or back to the owner's), the row goes.
export async function savePicks(env, siteId, page, block, picks) {
  const p = cleanPicks(picks);
  const stmt = noPicks(p)
    ? env.DB.prepare('DELETE FROM block_picks WHERE site_id = ? AND page = ? AND block = ?').bind(siteId, page, block)
    : env.DB.prepare(`INSERT INTO block_picks (site_id, page, block, picks, updated_at) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT (site_id, page, block) DO UPDATE SET picks = excluded.picks, updated_at = excluded.updated_at`)
      .bind(siteId, page, block, JSON.stringify(p), new Date().toISOString());
  await env.DB.batch([stmt, env.DB.prepare('UPDATE sites SET draft_changed_at = ? WHERE id = ?').bind(new Date().toISOString(), siteId)]);
}

// Every block's, for the snapshot: { page: { block: picks } }.
export async function sitePicks(env, siteId) {
  const out = {};
  for (const r of (await env.DB.prepare('SELECT page, block, picks FROM block_picks WHERE site_id = ?').bind(siteId).all()).results) {
    let v = null;
    try { v = JSON.parse(r.picks); } catch { /* a broken row reads as none */ }
    const p = cleanPicks(v);
    if (!noPicks(p)) (out[r.page] ??= {})[r.block] = p;
  }
  return out;
}

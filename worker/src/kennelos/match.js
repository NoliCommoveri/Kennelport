// Matching what's already there (plan 5.2 step 4). A bundle's dog or litter that
// has no KennelOS match, but whose name matches a website one not yet linked,
// waits in link_pending. The manage app shows what the match would change, field
// by field, and she confirms (the website record joins KennelOS, keeping its
// photos, wording and address) or declines (a new one is made, and she isn't
// asked about that pair again). Nothing is matched without her yes.
import { Writer, siteState, OWNED, OWNED_PRICES, landingFor } from './bundle.js';
import { litterClockStatements } from './clock.js';

export class MatchError extends Error {}

const WORDS = {
  call_name: 'call name', registered_name: 'registered name', registry: 'registry', sex: 'sex', date_of_birth: 'born', color: 'colour',
  status: 'where they show', upcoming: 'up and coming', for_sale: 'looking for a home', died_on: 'date of death', titles: 'titles',
  stage: 'stage', dam_id: 'dam', sire_id: 'sire', dam_name: 'dam\'s name', sire_name: 'sire\'s name', born_on: 'born',
  ready_on: 'going home', deposits_on: 'deposits open', expected_label: 'expected',
  price_female: 'price for a girl', price_male: 'price for a boy', full_reg_female: 'full registration, girl', full_reg_male: 'full registration, boy',
  deposit_female: 'deposit for a girl', deposit_male: 'deposit for a boy',
};
const VALUE_WORDS = {
  sex: { female: 'female', male: 'male' }, status: { active: 'at home', retired: 'retired', remembered: 'in memory' },
  stage: { planned: 'planned', current: 'born', past: 'past' }, upcoming: { 0: 'no', 1: 'yes' }, for_sale: { 0: 'no', 1: 'yes' },
};

export async function pendingMatches(env, siteId) {
  const { results } = await env.DB.prepare('SELECT * FROM link_pending WHERE site_id = ? ORDER BY kind, created_at').bind(siteId).all();
  return results.map((r) => ({ ...r, data: JSON.parse(r.data) }));
}

async function load(env, siteId, kind, kennelosId) {
  const row = await env.DB.prepare('SELECT * FROM link_pending WHERE site_id = ? AND kind = ? AND kennelos_id = ?').bind(siteId, kind, kennelosId).first();
  if (!row) throw new MatchError('That match has already been answered.');
  const site = await env.DB.prepare('SELECT * FROM sites WHERE id = ?').bind(siteId).first();
  const st = await siteState(env, siteId);
  const target = st[kind].find((r) => r.id === row.kennelport_id);
  return { row, data: JSON.parse(row.data), site, st, target, w: new Writer(env, site, st, await landingFor(env, site.id)) };
}

// What confirming would change: [{ field, label, from, to, blanking }]. A
// blanking is the one moment a bundle meets a field she typed by hand, so the
// screen asks before it clears one ("What a blank means", 5.3).
export async function matchChanges(env, siteId, kind, kennelosId) {
  const { data, target, w, st, site } = await load(env, siteId, kind, kennelosId);
  if (!target) return { target: null, changes: [] };
  const values = kind === 'dogs' ? w.dogValues(data) : w.litterValues(data, data.kind);
  const dogName = (id) => st.dogs.find((d) => d.id === id)?.call_name ?? null;
  const show = (field, v) => {
    if (v === null || v === undefined || v === '') return null;
    if (field === 'dam_id' || field === 'sire_id') return dogName(v);
    return VALUE_WORDS[field]?.[v] ?? String(v);
  };
  const fields = [...OWNED[kind], ...(site.use_kennelos_prices ? OWNED_PRICES[kind] ?? [] : [])].filter((f) => f in values);
  const changes = [];
  for (const f of fields) {
    const from = show(f, target[f]);
    const to = show(f, values[f]);
    if (from === to) continue;
    changes.push({ field: f, label: WORDS[f] ?? f, from, to, blanking: from !== null && to === null });
  }
  return { target, changes, puppies: kind === 'litters' ? (data.puppies ?? []).length : 0 };
}

// Yes: the website record joins KennelOS. `keep` names the fields she chose to
// keep as she typed them, this once; later bundles own them as usual.
export async function confirmMatch(env, siteId, kind, kennelosId, keep = []) {
  const { row, data, target, w } = await load(env, siteId, kind, kennelosId);
  if (!target) {
    await env.DB.prepare('DELETE FROM link_pending WHERE site_id = ? AND kind = ? AND kennelos_id = ?').bind(siteId, kind, kennelosId).run();
    throw new MatchError('That website record is no longer there.');
  }
  const allowed = new Set([...OWNED[kind], ...(OWNED_PRICES[kind] ?? [])]);
  const kept = keep.filter((f) => allowed.has(f));
  if (kind === 'dogs') {
    w.s.push(env.DB.prepare("UPDATE dogs SET source = 'kennelos', kennelos_id = ? WHERE id = ? AND site_id = ?").bind(data.id, target.id, siteId));
    w.updateDog({ ...target, source: 'kennelos', kennelos_id: data.id }, data, kept);
  } else {
    w.s.push(env.DB.prepare("UPDATE litters SET source = 'kennelos' WHERE id = ? AND site_id = ?").bind(target.id, siteId));
    w.updateLitter({ ...target, source: 'kennelos' }, data, data.kind, kept);
  }
  w.lineage();
  finish(env, siteId, w, row);
  await env.DB.batch(w.s);
}

// No: they're different. A new record is made from KennelOS's, and the pair is
// remembered so it isn't suggested again.
export async function declineMatch(env, siteId, kind, kennelosId) {
  const { row, data, w } = await load(env, siteId, kind, kennelosId);
  w.s.push(env.DB.prepare('INSERT OR IGNORE INTO link_declines (site_id, kind, kennelos_id, kennelport_id) VALUES (?, ?, ?, ?)').bind(siteId, kind, kennelosId, row.kennelport_id));
  if (kind === 'dogs') w.createDog(data);
  else w.createLitter(data, data.kind);
  w.lineage();
  finish(env, siteId, w, row);
  await env.DB.batch(w.s);
}

function finish(env, siteId, w, row) {
  w.s.push(env.DB.prepare('DELETE FROM link_pending WHERE site_id = ? AND kind = ? AND kennelos_id = ?').bind(siteId, row.kind, row.kennelos_id));
  w.s.push(...litterClockStatements(env, siteId, w.t));
  w.s.push(env.DB.prepare('UPDATE sites SET draft_changed_at = ? WHERE id = ?').bind(w.t, siteId));
}

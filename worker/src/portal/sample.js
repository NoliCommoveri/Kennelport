// Her portal with a sample family (the owner, 2026-11-25): a new breeder sees what her
// families will see before she adds anyone. A made-up family and puppy, never stored:
// for each database statement that names one of the sample's ids, the sample's rows
// stand in for the family, placement, puppy and litter tables (a WITH of the same
// names, which SQLite reads before its own tables), so every portal page runs as it
// does for a real family, on her real settings, checklist, timeline, handbook and
// programs. Anything else the family would have (records, messages, stays, ticks)
// comes back empty, because nothing in the database belongs to those ids.
//
// The sample's dates move: she picks the day she's looking from (days since go-home,
// before it when below zero), and go-home, pickup, the vet deadline and the birth date
// are worked out back from today, so the pages follow as they would for a real puppy.
// Opened through her view link (portal/view.js, family SAMPLE_FAMILY), read-only like
// any view; a statement that would write with a sample id does nothing.
import { readCookie } from '../lib/http.js';
import { localParts, zonedToUtc, addDays, vetDeadline } from './vet.js';

export const SAMPLE_FAMILY = '00000000-0000-4000-8000-0000005a3901';
export const SAMPLE_PLACEMENT = '00000000-0000-4000-8000-0000005a3902';
export const SAMPLE_PUPPY = '00000000-0000-4000-8000-0000005a3903';
export const SAMPLE_LITTER = '00000000-0000-4000-8000-0000005a3904';
const IDS = new Set([SAMPLE_FAMILY, SAMPLE_PLACEMENT, SAMPLE_PUPPY, SAMPLE_LITTER]);

// The day she's looking from, in a cookie of its own beside the view cookie.
export const SAMPLE_COOKIE = 'kp_family_sample';
export const SAMPLE_DAYS = { min: -30, max: 400, start: -7 };
// The days the band offers in one tap, after the prototype's "Today is" bar: before
// go-home, the day after (the vet visit's window), a month on.
export const SAMPLE_PRESETS = [-7, 1, 30];
// Born this many days before go-home (eight weeks).
const BORN_BEFORE = 56;
const PICKUP_AT = '10:00';

export const sampleDayOf = (value) => {
  const n = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n)) return null;
  return Math.min(SAMPLE_DAYS.max, Math.max(SAMPLE_DAYS.min, n));
};
export const sampleDay = (request) => sampleDayOf(readCookie(request, SAMPLE_COOKIE)) ?? SAMPLE_DAYS.start;
export const sampleCookie = (day, maxAge = 3600) => `${SAMPLE_COOKIE}=${day}; Path=/family; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

// A photo of hers for the sample puppy, so its card isn't empty: a puppy's, else a dog's.
async function samplePhoto(db, siteId) {
  const live = 'SELECT 1 FROM photos ph WHERE ph.id = x.photo_id AND ph.site_id = x.site_id AND ph.removed_at IS NULL AND ph.purged_at IS NULL';
  return (await db.prepare(`SELECT photo_id FROM puppies x WHERE x.site_id = ? AND x.photo_id IS NOT NULL AND EXISTS (${live}) ORDER BY x.updated_at DESC LIMIT 1`).bind(siteId).first('photo_id'))
    ?? (await db.prepare(`SELECT photo_id FROM dogs x WHERE x.site_id = ? AND x.photo_id IS NOT NULL AND EXISTS (${live}) ORDER BY x.updated_at DESC LIMIT 1`).bind(siteId).first('photo_id'));
}

// The sample's rows for one day: go-home is `day` days before today (after it when
// negative), pickup at 10 am that day, the vet clock from pickup by her rule, and a
// vet record in and accepted half a day before a deadline that has passed.
export async function sampleRows(db, site, s, day, { names, now = new Date() } = {}) {
  const tz = s.time_zone;
  const today = localParts(now, tz).ymd;
  const goHome = addDays(today, -day);
  const pickup = zonedToUtc(goHome, PICKUP_AT, tz);
  const home = pickup.getTime() <= new Date(now).getTime();
  const deadline = home ? vetDeadline(pickup, s.vet_rule, tz) : null;
  const recordIn = deadline && Date.parse(deadline) < new Date(now).getTime() ? new Date(Date.parse(deadline) - 12 * 3600000).toISOString() : null;
  const born = addDays(goHome, -BORN_BEFORE);
  const at = `${born}T12:00:00.000Z`;
  return {
    day, goHome, born,
    portal_families: {
      id: SAMPLE_FAMILY, site_id: site.id, name: names.family, status: 'active', source: 'portal', keep: 0, edited_fields: '[]',
      invited_at: at, first_signed_in_at: at, created_at: at, updated_at: at,
    },
    portal_placements: {
      id: SAMPLE_PLACEMENT, site_id: site.id, family_id: SAMPLE_FAMILY, puppy_id: SAMPLE_PUPPY, puppy_name: names.pup,
      go_home_on: goHome, pickup_booked_at: home ? null : pickup.toISOString(), picked_up_at: home ? pickup.toISOString() : null,
      pickup_state: home ? 'confirmed' : 'planned', vet_deadline_at: deadline,
      proof_uploaded_at: recordIn, proof_accepted_at: recordIn, contract_signed_on: addDays(goHome, -30),
      life_status: 'with_family', status: 'open', source: 'portal', edited_fields: '[]', created_at: at, updated_at: at,
    },
    puppies: {
      id: SAMPLE_PUPPY, site_id: site.id, litter_id: SAMPLE_LITTER, slug: 'sample', name: names.pup, sex: 'female', status: 'placed',
      photo_id: await samplePhoto(db, site.id), sort: 0, source: 'kennelport', show_on_site: 0, hidden_by_kennelos: 0, created_at: at, updated_at: at,
    },
    litters: {
      id: SAMPLE_LITTER, site_id: site.id, slug: 'sample', name: names.litter, stage: 'past', born_on: born, ready_on: goHome,
      show_on_site: 0, sort: 0, source: 'kennelport', hidden_by_kennelos: 0, created_at: at, updated_at: at,
    },
  };
}

// ---------- the database, with the sample standing in ----------

const TABLES = ['portal_families', 'portal_placements', 'puppies', 'litters'];
const columnsCache = new Map();
async function columnsOf(db, table) {
  if (!columnsCache.has(table)) {
    const { results } = await db.prepare(`PRAGMA table_info(${table})`).all();
    columnsCache.set(table, results.map((r) => r.name));
  }
  return columnsCache.get(table);
}

const literal = (v) => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';
  return `'${String(v).replace(/\0/g, '').replace(/'/g, "''")}'`;
};

// The WITH for the tables a statement names, each one row: the sample's.
async function withFor(db, rows, sql) {
  const parts = [];
  for (const t of TABLES) {
    if (!new RegExp(`\\b${t}\\b`, 'i').test(sql)) continue;
    const cols = await columnsOf(db, t);
    parts.push(`${t}(${cols.join(', ')}) AS (SELECT ${cols.map((c) => literal(rows[t][c])).join(', ')})`);
  }
  if (!parts.length) return sql;
  const own = /^\s*WITH\s+(RECURSIVE\s+)?/i.exec(sql);
  return own ? `${own[0]}${parts.join(', ')}, ${sql.slice(own[0].length)}` : `WITH ${parts.join(', ')} ${sql}`;
}

const isSample = (params) => params.some((x) => typeof x === 'string' && IDS.has(x));
const writes = (sql) => /^\s*(WITH\b[\s\S]*?\)\s*)?(INSERT|UPDATE|DELETE|REPLACE|CREATE|DROP|ALTER)\b/i.test(sql);

class SampleStmt {
  constructor(db, rows, sql, params = []) { Object.assign(this, { db, rows, sql, params }); }
  bind(...params) { return new SampleStmt(this.db, this.rows, this.sql, params); }
  async real() {
    if (!isSample(this.params)) return this.db.prepare(this.sql).bind(...this.params);
    return this.db.prepare(await withFor(this.db, this.rows, this.sql)).bind(...this.params);
  }
  nothing() { return isSample(this.params) && writes(this.sql); }
  async first(col) { return (await this.real()).first(col); }
  async all() { return this.nothing() ? { success: true, results: [], meta: { changes: 0 } } : (await this.real()).all(); }
  async raw(opts) { return (await this.real()).raw(opts); }
  async run() { return this.nothing() ? { success: true, meta: { changes: 0, last_row_id: 0 } } : (await this.real()).run(); }
}

// env.DB for her sample preview: the real database, with the sample in for its ids.
export function sampleDb(db, rows) {
  return {
    prepare: (sql) => new SampleStmt(db, rows, sql),
    batch: async (stmts) => {
      const live = [];
      for (const x of stmts) if (!(x instanceof SampleStmt) || !x.nothing()) live.push(x instanceof SampleStmt ? await x.real() : x);
      return live.length ? db.batch(live) : [];
    },
    exec: (sql) => db.exec(sql),
    dump: () => db.dump(),
  };
}

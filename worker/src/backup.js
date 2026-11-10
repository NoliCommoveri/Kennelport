// A whole site, out and back in (docs/plans/backup-format.md): every row of every
// table that holds a site's data, as stored, and every file it has in R2. The
// operator's safety copy, made from /ops (ops/backup.js).
//
// How it differs from the content document (content/io.js) and the breeder's
// "Download a copy": those carry what the site shows, with no ids. This carries
// everything, ids included: the page builds, the photo tags, the inbox, the
// waitlist, the KennelOS link, the family portal with its files, the published
// versions. A site restored from it is the site as it was.
//
// It goes out and comes in a piece at a time (a list of what there is, then rows
// by the page, then files one by one), so no single request has to hold a whole
// site: the browser puts the pieces in one zip (public/_kp/o/backup.js).
//
// Left out, because they are sign-in state or copies that rebuild themselves:
// one-time codes, signed-in sessions, the waitlist feed's five-minute copy and
// the notification queue (SKIPPED). Families and breeders sign in again.
import { SITE_TABLES } from './sites.js';
import { MIGRATIONS } from './migrations/index.js';
import { isValidSubdomain } from './hosts.js';
import { forgetSnapshots } from './publish.js';
import { decryptEmail } from './portal/store.js';

export const BACKUP_FORMAT = 'kennelport-site-backup';
export const BACKUP_VERSION = 1;
export const ROWS_PER_PAGE = 200;

export class BackupError extends Error {}

const SKIPPED = ['portal_sessions', 'portal_codes', 'link_codes', 'feed_cache', 'notify_items'];
// Parents before children, so rows go back in without breaking a reference.
export const BACKUP_TABLES = Object.freeze([...SITE_TABLES].reverse().filter((t) => !SKIPPED.includes(t)));
// Kept for every site at once, not per site: the owner's changes to the Site
// Manager's wording. In every backup; put back only where a line isn't set.
const SHARED_TABLES = ['wording'];

const filesPrefix = (siteId) => `sites/${siteId}/`;
// While a restore is under way. Outside sites/<id>/, so it is never in a backup.
const markerKey = (siteId) => `_ops/restoring/${siteId}.json`;

async function listFiles(env, siteId) {
  const out = [];
  let cursor;
  do {
    const page = await env.FILES.list({ prefix: filesPrefix(siteId), cursor, limit: 1000, include: ['httpMetadata'] });
    for (const o of page.objects) out.push({ key: o.key, bytes: o.size ?? null, type: o.httpMetadata?.contentType ?? null });
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return out;
}

// What a site has: its own row, how many rows each table holds, its files.
export async function backupManifest(env, siteId) {
  const site = await env.DB.prepare('SELECT * FROM sites WHERE id = ?').bind(siteId).first();
  if (!site) return null;
  const counts = await env.DB.batch(BACKUP_TABLES.map((t) => env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t} WHERE site_id = ?`).bind(siteId)));
  const shared = {};
  for (const t of SHARED_TABLES) shared[t] = (await env.DB.prepare(`SELECT * FROM ${t}`).all()).results;
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exported_at: new Date().toISOString(),
    environment: env.ENV_NAME || null,
    root_domain: env.ROOT_DOMAIN || null,
    // The database's shape when this was made: the last migration applied.
    schema: MIGRATIONS.at(-1).id,
    site,
    tables: BACKUP_TABLES.map((name, i) => ({ name, rows: counts[i].results[0].n })),
    skipped: SKIPPED,
    shared,
    files: await listFiles(env, siteId),
  };
}

// One page of a table's rows, in the order they were written. `next` is what to
// ask for after it, null at the end. A family's address is stored encrypted; it
// goes out readable too (_email), so a copy is of use without this deploy's key.
// Keys starting with "_" are notes: a restore leaves them out.
export async function backupRows(env, siteId, table, after = 0, limit = ROWS_PER_PAGE) {
  if (!BACKUP_TABLES.includes(table)) throw new BackupError(`${table} isn't a table a backup holds.`);
  const from = Number.isInteger(Number(after)) ? Number(after) : 0;
  const { results } = await env.DB.prepare(`SELECT rowid AS _rowid, * FROM ${table} WHERE site_id = ? AND rowid > ? ORDER BY rowid LIMIT ?`).bind(siteId, from, limit).all();
  const next = results.length === limit ? results.at(-1)._rowid : null;
  const rows = [];
  for (const { _rowid, ...row } of results) {
    if (table === 'portal_emails' && env.PORTAL_EMAIL_KEY) {
      try { row._email = await decryptEmail(env, row.email_enc); } catch { row._email = null; }
    }
    rows.push(row);
  }
  return { table, rows, next };
}

export async function backupFile(env, siteId, key) {
  if (!String(key ?? '').startsWith(filesPrefix(siteId))) return null;
  return env.FILES.get(key);
}

// The whole site as one document (the tests, and a small site from a script).
// The zip /ops makes holds the same thing, with the files beside it.
export async function exportBackup(env, siteId) {
  const manifest = await backupManifest(env, siteId);
  if (!manifest) return null;
  const tables = {};
  for (const { name } of manifest.tables) {
    tables[name] = [];
    let after = 0;
    while (after !== null) {
      const page = await backupRows(env, siteId, name, after);
      tables[name].push(...page.rows);
      after = page.next;
    }
  }
  return { ...manifest, tables };
}

// ---------- back in ----------

const columnsOf = async (env, table) => (await env.DB.prepare(`PRAGMA table_info(${table})`).all()).results;

// The columns a row goes into. A number the database gives out itself (a log's
// running id) is left for it to give again, so a restore beside other sites can't
// collide; nothing refers to those. A column the database doesn't have means the
// backup is from a newer KennelPort than this one: refused, never dropped.
async function insertPlan(env, table, rows) {
  const info = await columnsOf(env, table);
  const known = new Set(info.map((c) => c.name));
  const pks = info.filter((c) => c.pk > 0);
  const serial = pks.length === 1 && /^integer$/i.test(pks[0].type) ? pks[0].name : null;
  const cols = [];
  for (const row of rows) {
    for (const k of Object.keys(row)) {
      if (k.startsWith('_') || k === serial || cols.includes(k)) continue;
      if (!known.has(k)) throw new BackupError(`${table}.${k} isn't in this database. The backup is from a newer KennelPort: apply the pending migrations first.`);
      cols.push(k);
    }
  }
  return cols;
}

const insertRow = (env, table, cols, row, verb = 'INSERT') => env.DB.prepare(`${verb} INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`).bind(...cols.map((c) => row[c] ?? null));

async function restoring(env, siteId) {
  const obj = await env.FILES.get(markerKey(siteId));
  if (!obj) throw new BackupError('No restore is under way for this site. Start again from the backup file.');
  return JSON.parse(new TextDecoder().decode(await obj.arrayBuffer()));
}

// Step 1: the site's own row, suspended until the rest is in. Only where the site
// isn't already: a restore never writes over a site that is there.
export async function restoreBegin(env, manifest) {
  if (manifest?.format !== BACKUP_FORMAT) throw new BackupError('That isn\'t a KennelPort site backup.');
  if (manifest.version !== BACKUP_VERSION) throw new BackupError(`This backup is version ${manifest.version}; this KennelPort reads version ${BACKUP_VERSION}.`);
  const site = manifest.site;
  if (!site?.id || !/^[0-9a-f-]{36}$/.test(site.id) || !isValidSubdomain(site.subdomain)) throw new BackupError('The backup\'s site row is missing or damaged.');
  if (site.status === 'closed') throw new BackupError('That backup is of a closed site: there is nothing in it.');
  if (String(manifest.schema) > MIGRATIONS.at(-1).id) throw new BackupError(`The backup was made at migration ${manifest.schema}; this KennelPort is at ${MIGRATIONS.at(-1).id}. Deploy the newer code first.`);
  const there = await env.DB.prepare('SELECT id, subdomain, status FROM sites WHERE id = ? OR subdomain = ?').bind(site.id, site.subdomain).first();
  if (there) {
    throw new BackupError(there.status === 'closed'
      ? `${there.subdomain} is a closed site here. Release its subdomain first, then restore.`
      : `${there.subdomain} is already a site here. A restore never writes over one: close and release it first if the backup should replace it.`);
  }
  const row = { ...site, status: 'suspended', published_snapshot_id: null };
  const cols = await insertPlan(env, 'sites', [row]);
  const shared = [];
  for (const t of SHARED_TABLES) {
    const rows = manifest.shared?.[t] ?? [];
    if (!rows.length) continue;
    const c = await insertPlan(env, t, rows);
    for (const r of rows) shared.push(insertRow(env, t, c, r, 'INSERT OR IGNORE'));
  }
  await env.FILES.put(markerKey(site.id), JSON.stringify({ status: site.status, published_snapshot_id: site.published_snapshot_id ?? null, started_at: new Date().toISOString() }));
  try {
    await env.DB.batch([insertRow(env, 'sites', cols, row), ...shared]);
  } catch (err) {
    await env.FILES.delete(markerKey(site.id));
    throw err;
  }
  return { site_id: site.id, subdomain: site.subdomain, tables: BACKUP_TABLES };
}

// Step 2, as often as needed: rows of one table, parents' tables first
// (BACKUP_TABLES' order). One call lands whole or not at all.
export async function restoreRows(env, siteId, table, rows) {
  await restoring(env, siteId);
  if (!BACKUP_TABLES.includes(table)) throw new BackupError(`${table} isn't a table a backup holds.`);
  if (!Array.isArray(rows) || rows.length > 500) throw new BackupError('Send up to 500 rows at a time.');
  if (!rows.length) return { table, rows: 0 };
  for (const r of rows) if (r?.site_id !== siteId) throw new BackupError(`A row of ${table} belongs to another site.`);
  const cols = await insertPlan(env, table, rows);
  await env.DB.batch(rows.map((r) => insertRow(env, table, cols, r)));
  return { table, rows: rows.length };
}

// Step 3, once per file: back to the same key.
export async function restoreFile(env, siteId, key, body, type) {
  await restoring(env, siteId);
  if (!String(key ?? '').startsWith(filesPrefix(siteId)) || key.includes('..')) throw new BackupError('That file isn\'t one of this site\'s.');
  await env.FILES.put(key, body, type ? { httpMetadata: { contentType: type } } : {});
  return { key };
}

// Step 4: the site goes back to what it was (live, with the version that was
// published), and the count of what is now here, to check against the backup.
export async function restoreFinish(env, siteId) {
  const was = await restoring(env, siteId);
  const snap = was.published_snapshot_id && await env.DB.prepare('SELECT id FROM snapshots WHERE id = ? AND site_id = ?').bind(was.published_snapshot_id, siteId).first();
  const status = ['draft', 'live', 'suspended'].includes(was.status) ? was.status : 'suspended';
  await env.DB.prepare('UPDATE sites SET status = ?, published_snapshot_id = ? WHERE id = ?')
    .bind(status === 'live' && !snap ? 'draft' : status, snap ? was.published_snapshot_id : null, siteId).run();
  await env.FILES.delete(markerKey(siteId));
  forgetSnapshots();
  const counts = await env.DB.batch(BACKUP_TABLES.map((t) => env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t} WHERE site_id = ?`).bind(siteId)));
  return {
    site_id: siteId,
    status: status === 'live' && !snap ? 'draft' : status,
    tables: BACKUP_TABLES.map((name, i) => ({ name, rows: counts[i].results[0].n })),
    files: (await listFiles(env, siteId)).length,
  };
}

// A restore that stopped part way: take out what went in, so it can start again.
export async function restoreAbandon(env, siteId) {
  await restoring(env, siteId);
  let cursor;
  do {
    const page = await env.FILES.list({ prefix: filesPrefix(siteId), cursor, limit: 1000 });
    if (page.objects.length) await env.FILES.delete(page.objects.map((o) => o.key));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  await env.DB.batch([
    ...SITE_TABLES.map((t) => env.DB.prepare(`DELETE FROM ${t} WHERE site_id = ?`).bind(siteId)),
    env.DB.prepare('DELETE FROM sites WHERE id = ?').bind(siteId),
  ]);
  await env.FILES.delete(markerKey(siteId));
  forgetSnapshots();
}

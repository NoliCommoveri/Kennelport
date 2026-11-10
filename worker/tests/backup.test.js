// A site's full backup and its restore (src/backup.js, src/ops/backup.js,
// public/_kp/o/backup.js, docs/plans/backup-format.md): everything a site holds
// goes into one zip from /ops and comes back out of it as it was, into a
// KennelPort where that site isn't. The browser's own script is run here against
// the Worker, so what is tested is what the operator's button does.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { makeEnv, call, addSite } from './helpers/env.js';
import { webp } from './helpers/images.js';

const { BACKUP_TABLES, BACKUP_FORMAT, exportBackup, restoreBegin } = await import('../src/backup.js');
const { SITE_TABLES, closeSite, releaseSubdomain } = await import('../src/sites.js');
const { importContent } = await import('../src/content/io.js');
const { AK_SAMPLE } = await import('../src/content/akSample.js');
const { savePhoto } = await import('../src/photos.js');
const { publish } = await import('../src/publish.js');
const { inviteToSite } = await import('../src/auth.js');
const { makeDemoSite } = await import('../src/kennelos/demo.js');
const { decryptEmail } = await import('../src/portal/store.js');

const M = 'manage.kennelport.com';
const KEYS = { PORTAL_EMAIL_KEY: 'portal-test-key' };

async function opsCookie(env) {
  const res = await call(env, M, '/ops/login', { method: 'POST', body: new URLSearchParams({ token: 'ops-token' }) });
  return res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
}

// The browser's two scripts, with fetch going to this Worker as the operator.
async function browser(env) {
  const cookie = await opsCookie(env);
  const sandbox = { TextEncoder, TextDecoder, Blob, Uint8Array, Uint32Array, DataView, ArrayBuffer, Map, JSON, Math, Error, URL, encodeURIComponent, document: { getElementById: () => null } };
  sandbox.globalThis = sandbox;
  for (const f of ['m/zip.js', 'o/backup.js']) vm.runInNewContext(await readFile(new URL(`../public/_kp/${f}`, import.meta.url), 'utf8'), sandbox);
  const fetcher = (path, init = {}) => call(env, M, path, { method: init.method, body: init.body, headers: { ...init.headers, cookie } });
  return {
    async download(siteId) {
      const { files } = await sandbox.kpBackup.collect(`/ops/backup/${siteId}`, { fetcher });
      return sandbox.kpZip(files);
    },
    restore: (zip) => sandbox.kpBackup.restore('/ops/restore', zip, { fetcher }),
    readZip: sandbox.kpBackup.readZip,
    zip: sandbox.kpZip,
  };
}

// Everything a site holds, to compare before and after. A log's running number
// is the database's to give (backup.js insertPlan), so it is left out.
async function everything(env, siteId) {
  const out = { site: await env.DB.prepare('SELECT * FROM sites WHERE id = ?').bind(siteId).first(), tables: {}, files: {} };
  for (const t of BACKUP_TABLES) {
    const info = env.DB.raw.prepare(`PRAGMA table_info(${t})`).all();
    const pks = info.filter((c) => c.pk > 0);
    const serial = pks.length === 1 && /^integer$/i.test(pks[0].type) ? pks[0].name : null;
    out.tables[t] = env.DB.raw.prepare(`SELECT * FROM ${t} WHERE site_id = ? ORDER BY rowid`).all(siteId).map((r) => { const row = { ...r }; if (serial) delete row[serial]; return row; });
  }
  for (const [key, entry] of env.FILES.store) if (key.startsWith(`sites/${siteId}/`)) out.files[key] = Buffer.from(entry.bytes).toString('base64');
  return out;
}

// An ordinary site with something in every corner a breeder fills: content, a
// photo, a published version, a person, a message, a waitlist family, a build.
async function fullSite(env) {
  const site = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  const photo = await savePhoto(env, site.id, { full: webp(1600, 1200), thumb: webp(400, 300), alt: 'Pearl on the lawn' });
  await importContent(env, site.id, { ...AK_SAMPLE, site: { ...AK_SAMPLE.site, logo_photo_id: photo.id } });
  await publish(env, site.id, 'operator');
  await inviteToSite(env, site.id, 'breeder@example.com', 'owner', { manageUrl: 'https://manage.kennelport.com', siteUrl: 'https://akbostons.kennelport.com' });
  const t = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO inquiries (id, site_id, kind, name, email, message, received_at) VALUES (?, ?, 'contact', 'Dana', 'dana@example.com', 'Do you have a waitlist?', ?)").bind(crypto.randomUUID(), site.id, t),
    env.DB.prepare("INSERT INTO waitlist_entries (id, site_id, name, list_name, added_on, sort, created_at) VALUES (?, ?, 'Dana P.', 'Dana', '2026-11-01', 1, ?)").bind(crypto.randomUUID(), site.id, t),
    env.DB.prepare("INSERT INTO photo_tags (site_id, photo_id, subject) VALUES (?, ?, 'kennel')").bind(site.id, photo.id),
    env.DB.prepare("INSERT INTO site_builds (site_id, build, updated_at) VALUES (?, '{\"pages\":{}}', ?)").bind(site.id, t),
    env.DB.prepare("INSERT INTO redirects (site_id, old_path, new_path, created_at) VALUES (?, '/dogs/old', '/dogs/pearl', ?)").bind(site.id, t),
    env.DB.prepare("INSERT INTO wording (key, text, updated_at) VALUES ('home.hello', 'Good morning', ?)").bind(t),
  ]);
  return site;
}

test('every table that holds a site\'s data is in a backup, or named as left out', async () => {
  const env = await makeEnv();
  const scoped = env.DB.raw.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((r) => r.name)
    .filter((t) => env.DB.raw.prepare(`PRAGMA table_info(${t})`).all().some((c) => c.name === 'site_id'));
  assert.deepEqual(scoped.filter((t) => !SITE_TABLES.includes(t)), [], 'a table with site_id is missing from sites.js SITE_TABLES');
  const left = scoped.filter((t) => !BACKUP_TABLES.includes(t)).sort();
  assert.deepEqual(left, ['feed_cache', 'link_codes', 'notify_items', 'portal_codes', 'portal_sessions']);
});

test('a site goes into one zip from /ops and comes back as it was', async () => {
  const from = await makeEnv(KEYS);
  const site = await fullSite(from);
  const before = await everything(from, site.id);
  assert.ok(before.tables.dogs.length > 0 && before.tables.snapshots.length === 1 && Object.keys(before.files).length >= 3);

  const zip = await (await browser(from)).download(site.id);

  const to = await makeEnv(KEYS);
  const there = await browser(to);
  const names = (await there.readZip(zip)).map((e) => e.name);
  assert.ok(names.includes('backup.json') && names.includes('README.txt'));
  const done = await there.restore(zip);
  assert.equal(done.status, 'live');

  assert.deepEqual(await everything(to, site.id), before);
  // The owner's wording came with it, and the site answers at its address again.
  assert.equal(await to.DB.prepare("SELECT text FROM wording WHERE key = 'home.hello'").first('text'), 'Good morning');
  const home = await call(to, 'akbostons.kennelport.com', '/');
  assert.equal(home.status, 200);
  assert.match(await home.text(), /AK Boston Terriers/);
  // The marker a restore works under is gone.
  assert.equal([...to.FILES.store.keys()].filter((k) => k.startsWith('_ops/')).length, 0);
});

test('the puppy portal, the KennelOS link and the page builds come back too', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2027-03-10T15:00:00Z') });
  const from = await makeEnv(KEYS);
  const { id } = await makeDemoSite(from);
  const before = await everything(from, id);
  for (const table of ['portal_families', 'portal_emails', 'portal_placements', 'litters', 'puppies']) assert.ok(before.tables[table].length > 0, `${table} has rows to carry`);

  const doc = await exportBackup(from, id);
  assert.equal(doc.format, BACKUP_FORMAT);
  // A family's address is readable in the copy, beside the stored, encrypted one.
  const address = doc.tables.portal_emails[0];
  assert.match(address._email, /@/);
  assert.equal(address._email, await decryptEmail(from, address.email_enc));

  const zip = await (await browser(from)).download(id);
  const to = await makeEnv(KEYS);
  await (await browser(to)).restore(zip);
  assert.deepEqual(await everything(to, id), before);
});

test('a restore never writes over a site that is there, and a closed one is released first', async () => {
  const env = await makeEnv(KEYS);
  const site = await fullSite(env);
  const b = await browser(env);
  const zip = await b.download(site.id);
  const before = await everything(env, site.id);

  await assert.rejects(b.restore(zip), /already a site here/);
  assert.deepEqual(await everything(env, site.id), before);

  await closeSite(env, site.id, 'akbostons');
  await assert.rejects(b.restore(zip), /Release its subdomain first/);
  await releaseSubdomain(env, site.id);
  await b.restore(zip);
  assert.deepEqual(await everything(env, site.id), before);
});

test('a restore that fails part way takes out what went in', async () => {
  const from = await makeEnv(KEYS);
  const site = await fullSite(from);
  const b = await browser(from);
  const entries = await b.readZip(await b.download(site.id));
  // The same zip with its litters gone: a puppy whose litter isn't there is refused
  // by the database, after the dogs and the site's row have gone in.
  const files = [];
  for (const e of entries) {
    let data = await e.data();
    if (e.name === 'backup.json') {
      const doc = JSON.parse(new TextDecoder().decode(data));
      doc.tables.litters = [];
      data = new TextEncoder().encode(JSON.stringify(doc));
    }
    files.push({ name: e.name, data });
  }
  const to = await makeEnv(KEYS);
  const there = await browser(to);
  await assert.rejects(there.restore(there.zip(files)), /Nothing was kept/);
  assert.equal(await to.DB.prepare('SELECT COUNT(*) AS n FROM sites').first('n'), 0);
  assert.equal(await to.DB.prepare('SELECT COUNT(*) AS n FROM dogs').first('n'), 0);
  assert.equal(to.FILES.store.size, 0);
  // And the real zip then goes in.
  await there.restore(await b.download(site.id));
  assert.equal(await to.DB.prepare('SELECT status FROM sites WHERE id = ?').bind(site.id).first('status'), 'live');
});

test('what a restore refuses: another format, a newer database, rows of another site, a site not being restored', async () => {
  const env = await makeEnv(KEYS);
  const site = await fullSite(env);
  const doc = await exportBackup(env, site.id);
  const to = await makeEnv(KEYS);
  await assert.rejects(restoreBegin(to, { ...doc, format: 'something-else' }), /isn't a KennelPort site backup/);
  await assert.rejects(restoreBegin(to, { ...doc, schema: '9999' }), /Deploy the newer code first/);
  await assert.rejects(restoreBegin(to, { ...doc, site: { ...doc.site, made_up_column: 1 } }), /newer KennelPort/);

  const cookie = await opsCookie(to);
  const post = (path, body) => call(to, M, path, { method: 'POST', body: JSON.stringify(body), headers: { cookie, 'content-type': 'application/json' } });
  // No restore under way for this site: nothing can be written into it.
  const res = await post('/ops/restore/rows', { site_id: site.id, table: 'dogs', rows: doc.tables.dogs });
  assert.equal(res.status, 400);
  assert.match((await res.json()).message, /No restore is under way/);
  const { tables, ...manifest } = doc;
  await post('/ops/restore/begin', manifest);
  const other = await post('/ops/restore/rows', { site_id: site.id, table: 'dogs', rows: [{ ...tables.dogs[0], site_id: 'someone-else' }] });
  assert.match((await other.json()).message, /belongs to another site/);
  assert.equal((await post('/ops/restore/rows', { site_id: site.id, table: 'sessions', rows: [] })).status, 400);
});

test('the backup and restore pages are the operator\'s only', async () => {
  const env = await makeEnv(KEYS);
  const site = await fullSite(env);
  for (const path of [`/ops/backup/${site.id}`, `/ops/backup/${site.id}/manifest`, `/ops/backup/${site.id}/rows?table=inquiries`, '/ops/restore']) {
    assert.match(await (await call(env, M, path)).text(), /Ops token/, path);
  }
  const cookie = await opsCookie(env);
  assert.match(await (await call(env, M, `/ops/backup/${site.id}`, { headers: { cookie } })).text(), /Download the full backup/);
  assert.match(await (await call(env, M, '/ops/restore', { headers: { cookie } })).text(), /Restore a site from a backup/);
  assert.match(await (await call(env, M, `/ops/sites/${site.id}`, { headers: { cookie } })).text(), /Full backup/);
  // A file is only ever one of that site's.
  assert.equal((await call(env, M, `/ops/backup/${site.id}/file?key=_ops/check.txt`, { headers: { cookie } })).status, 404);
});

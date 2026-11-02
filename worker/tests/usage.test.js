// Removed photos leave R2 in the daily cleanup, and /ops's usage table.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';
import { webp } from './helpers/images.js';

const { importContent } = await import('../src/content/io.js');
const { publish, forgetSnapshots } = await import('../src/publish.js');
const { savePhoto } = await import('../src/photos.js');
const { inviteToSite } = await import('../src/auth.js');
const { runCleanup, purgeRemovedPhotos } = await import('../src/cleanup.js');
const { usageNumbers } = await import('../src/ops/usage.js');

const M = 'manage.kennelport.com';
const NOW = new Date('2026-11-02T12:00:00Z');

async function setup() {
  forgetSnapshots();
  const env = await makeEnv();
  const site = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  const save = () => savePhoto(env, site.id, { full: webp(1600, 1200), thumb: webp(400, 300), alt: '' });
  return { env, site, save };
}
const row = (env, id) => env.DB.raw.prepare('SELECT r2_key, thumb_key, removed_at, purged_at FROM photos WHERE id = ?').get(id);
const remove = (env, id, at) => env.DB.raw.prepare('UPDATE photos SET removed_at = ? WHERE id = ?').run(at, id);
const inR2 = async (env, key) => Boolean(await env.FILES.get(key));

test('the daily cleanup deletes removed photos from R2, but not one a kept version uses', async () => {
  const { env, site, save } = await setup();
  const used = await save();
  const unused = await save();
  const recent = await save();
  await importContent(env, site.id, { home: { hero: { photos: [used.id] } } });
  await publish(env, site.id, 'test');
  for (const p of [used, unused]) remove(env, p.id, '2026-10-30T00:00:00Z');
  remove(env, recent.id, '2026-11-02T10:00:00Z');

  const { photos } = await runCleanup(env, NOW);
  assert.equal(photos, 1);
  const gone = row(env, unused.id);
  assert.ok(gone.purged_at);
  assert.equal(await inR2(env, gone.r2_key), false);
  assert.equal(await inR2(env, gone.thumb_key), false);
  // Still on the live site: its files stay, and the site still shows it.
  assert.equal(row(env, used.id).purged_at, null);
  assert.equal(await inR2(env, row(env, used.id).r2_key), true);
  // Removed under a day ago: left for now.
  assert.equal(row(env, recent.id).purged_at, null);
  assert.equal(await inR2(env, row(env, recent.id).r2_key), true);

  // Republished without it, it's still in the version Undo would go back to...
  await importContent(env, site.id, { home: { hero: { photos: [] } } });
  await publish(env, site.id, 'test');
  assert.equal(await purgeRemovedPhotos(env, NOW.toISOString()), 1); // only `recent`
  assert.equal(row(env, used.id).purged_at, null);
  // ...and goes once that version is pruned.
  env.DB.raw.prepare('DELETE FROM snapshots WHERE id != (SELECT published_snapshot_id FROM sites WHERE id = ?)').run(site.id);
  assert.equal(await purgeRemovedPhotos(env, NOW.toISOString()), 1);
  assert.equal(await inR2(env, row(env, used.id).r2_key), false);
  // Nothing left to do: a second run touches nothing.
  assert.equal(await purgeRemovedPhotos(env, NOW.toISOString()), 0);
});

test('usage counts photos, storage and emails this month', async () => {
  const { env, site, save } = await setup();
  const a = await save();
  const b = await save();
  remove(env, b.id, '2026-10-30T00:00:00Z');
  await inviteToSite(env, site.id, 'b@example.com', 'owner', { manageUrl: 'x', siteUrl: 'y' });
  await inviteToSite(env, site.id, 'c@example.com', 'editor', { manageUrl: 'x', siteUrl: 'y' });
  env.DB.raw.prepare("INSERT INTO mail_counts (day, kind, n) VALUES ('2026-10-31', 'code', 7)").run();

  const u = await usageNumbers(env, new Date());
  assert.equal(u.photos.n, 1);
  assert.equal(u.photos.bytes, a.bytes + webp(400, 300).length);
  assert.equal(u.removed.n, 1);
  assert.equal(u.mail.byKind.invite, 2);
  assert.equal(u.mail.today, 2);
  assert.equal(u.accounts.waiting, 2);
  const october = await usageNumbers(env, new Date('2026-10-15T00:00:00Z'));
  assert.equal(october.mail.byKind.code, 7);

  const login = await call(env, M, '/ops/login', { method: 'POST', body: new URLSearchParams({ token: 'ops-token' }) });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const page = await (await call(env, M, '/ops', { headers: { cookie } })).text();
  assert.match(page, /<h2>Usage<\/h2>\s*<table>/);
  assert.match(page, /<td>Photos on sites<\/td><td>2 added<\/td><td>1 · /);
  assert.match(page, /<td>Removed photos still in R2<\/td><td><\/td><td>1 · /);
  assert.match(page, /<td>Emails \(staging outbox, not sent\)<\/td><td>2 \(2 invites\)<\/td><td>2 today<\/td>/);
  assert.doesNotMatch(page, /<details/);
});

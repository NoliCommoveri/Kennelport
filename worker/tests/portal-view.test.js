// Seeing a family's portal as they see it (docs/plans/family-view.md): her button
// opens their portal on her site's address, read-only; the link works once; every
// write is refused; looking leaves no trace (read marks, clicks, activity date).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';

const M = 'manage.kennelport.com';
const H = 'akbostons.kennelport.com';
const form = (o) => new URLSearchParams(o);
const outbox = (env) => env.DB.raw.prepare('SELECT kind, subject, body FROM dev_outbox ORDER BY id').all();
const DAY = 86400000;
const ymd = (d) => d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
const cookieOf = (res) => res.headers.get('set-cookie')?.split(';')[0];

async function signIn(env, host, prefix, email) {
  await call(env, host, `${prefix}/signin`, { method: 'POST', body: form({ email }), headers: { origin: `https://${host}` } });
  const code = outbox(env).at(-1).subject.match(/(\d{6})/)[1];
  return cookieOf(await call(env, host, `${prefix}/signin/verify`, { method: 'POST', body: form({ email, code }), headers: { origin: `https://${host}` } }));
}

async function setup() {
  const env = await makeEnv({ PORTAL_EMAIL_KEY: 'portal-test-key' });
  const site = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  const ops = cookieOf(await call(env, M, '/ops/login', { method: 'POST', body: form({ token: 'ops-token' }) }));
  await call(env, M, `/ops/sites/${site.id}/people`, { method: 'POST', headers: { cookie: ops }, body: form({ email: 'breeder@example.com', role: 'editor' }) });
  await call(env, M, `/ops/sites/${site.id}/portal/on`, { method: 'POST', headers: { cookie: ops } });
  const breeder = await signIn(env, M, '', 'breeder@example.com');
  const t = new Date().toISOString();
  env.DB.raw.prepare("INSERT INTO litters (id, site_id, slug, name, stage, born_on, created_at, updated_at) VALUES ('lit1', ?, 'winter', 'Winter litter', 'current', '2026-10-20', ?, ?)").run(site.id, t, t);
  for (const [id, name] of [['pup1', 'Opal'], ['pup2', 'Ruby']]) {
    env.DB.raw.prepare("INSERT INTO puppies (id, site_id, litter_id, slug, name, sex, created_at, updated_at) VALUES (?, ?, 'lit1', ?, ?, 'female', ?, ?)").run(id, site.id, id, name, t, t);
  }
  const her = (path, body) => call(env, M, `/s/akbostons${path}`, body ? { method: 'POST', body: form(body), headers: { cookie: breeder, origin: `https://${M}` } } : { headers: { cookie: breeder } });
  const at = (cookie) => (path, body, headers = {}) => call(env, H, path, body ? { method: 'POST', body: body instanceof FormData ? body : form(body), headers: { cookie, origin: `https://${H}`, ...headers } } : { headers: { cookie, ...headers } });
  const addFamily = async (values) => (await her('/portal/new', values)).headers.get('location').match(/\/f\/([0-9a-f-]{36})/)[1];
  // Her button: the Site Manager's link, then the portal's, to a view cookie.
  const view = async (id) => {
    const res = await her(`/portal/f/${id}/view`);
    assert.equal(res.status, 303);
    const link = res.headers.get('location');
    assert.match(link, /^https:\/\/akbostons\.kennelport\.com\/family\/view\?t=/);
    const opened = await call(env, H, link.replace(/^https:\/\/[^/]+/, ''));
    assert.equal(opened.status, 303);
    assert.equal(opened.headers.get('location'), '/family');
    assert.match(opened.headers.get('set-cookie'), /^kp_family_view=[^;]+; Path=\/family; HttpOnly; Secure; SameSite=Lax; Max-Age=3600/);
    return { link, cookie: cookieOf(opened) };
  };
  return { env, site, ops, her, at, addFamily, view };
}

test('her button opens their portal, as they see it, with the band; the link works once', async () => {
  const { env, her, at, addFamily, view } = await setup();
  const id = await addFamily({ name: 'The Reed family', emails: 'sam@example.com', puppy_id: 'pup1', call_name: 'Opal Mae', go_home_on: ymd(new Date(Date.now() + 10 * DAY)) });
  await addFamily({ name: 'The Diaz family', emails: 'lee@example.com', puppy_id: 'pup2' });
  const screen = await (await her(`/portal/f/${id}`)).text();
  assert.match(screen, new RegExp(`<a class="button small" href="/s/akbostons/portal/f/${id}/view" target="_blank" rel="noopener">See their portal</a>`));

  const { link, cookie } = await view(id);
  const seen = await (await at(cookie)('/family')).text();
  const fam = await signIn(env, H, '/family', 'sam@example.com');
  const theirs = await (await at(fam)('/family')).text();
  assert.match(seen, /You&#39;re seeing The Reed family&#39;s portal as they see it\. Read-only/);
  assert.match(seen, /<title>Home \(viewing\)/);
  assert.match(seen, /Opal Mae/);
  assert.doesNotMatch(seen, /Ruby/);
  // Apart from the band and the title, the very same page.
  const strip = (h) => h.replace(/<div class="note" role="status">[\s\S]*?<\/form><\/div>/, '').replace(' (viewing)', '');
  assert.equal(strip(seen), theirs);

  // Once only; a changed link, or another site's, is nothing.
  const again = await call(env, H, link.replace(/^https:\/\/[^/]+/, ''));
  assert.equal(again.status, 403);
  assert.match(await again.text(), /That link has been used or has expired/);
  assert.equal((await call(env, H, `${link.replace(/^https:\/\/[^/]+/, '')}0`)).status, 403);
  await addSite(env, 'thornfield', { portal_on: 1 });
  env.DB.raw.prepare("UPDATE sites SET portal_on = 1 WHERE subdomain = 'thornfield'").run();
  const fresh = (await her(`/portal/f/${id}/view`)).headers.get('location').replace(/^https:\/\/[^/]+/, '');
  assert.equal((await call(env, 'thornfield.kennelport.com', fresh)).status, 403);
  // The view cookie means nothing on another site, or changed.
  assert.equal((await at(cookie.replace(/.$/, (c) => (c === '0' ? '1' : '0')))('/family')).status, 403);
  assert.equal((await call(env, 'thornfield.kennelport.com', '/family', { headers: { cookie } })).status, 403);
  // Signed out of the Site Manager: no link.
  assert.equal((await call(env, M, `/s/akbostons/portal/f/${id}/view`)).status, 303);
  assert.notEqual((await call(env, M, `/s/akbostons/portal/f/${id}/view`)).headers.get('location')?.startsWith('https://akbostons'), true);
});

test('read-only: every tap changes nothing and comes back with a note', async () => {
  const { env, her, at, addFamily, view } = await setup();
  const id = await addFamily({ name: 'The Reed family', emails: 'sam@example.com', puppy_id: 'pup1' });
  await her(`/portal/f/${id}/picked-up`, {});
  const v = at((await view(id)).cookie);
  const dump = () => JSON.stringify(['portal_families', 'portal_placements', 'portal_messages', 'portal_sessions', 'portal_steps_done', 'portal_files', 'portal_history', 'portal_clicks', 'portal_program_status']
    .map((t) => { try { return env.DB.raw.prepare(`SELECT * FROM ${t}`).all(); } catch { return t; } }));
  const before = dump();
  const fd = new FormData();
  fd.append('file', new Blob(['%PDF-1.4\n%%EOF'], { type: 'application/pdf' }), 'record.pdf');
  const posts = [
    ['/family/messages', { body: 'Hello from her' }], ['/family/vet/booked', { day: ymd(new Date()), time: '10:00', clinic: 'Town Vets' }], ['/family/vet/proof', fd],
    ['/family/step', { kind: 'task', id: 'x', done: '1', back: 'timeline' }], ['/family/program', { product: 'x', back: 'home' }],
    ['/family/signout', {}], ['/family/account/delete', { confirm: 'delete' }], ['/family/signin', { email: 'sam@example.com' }],
  ];
  for (const [path, body] of posts) {
    const res = await v(path, body, { referer: `https://${H}/family/vet?note=booked` });
    assert.equal(res.status, 303, path);
    assert.equal(res.headers.get('location'), '/family/vet?viewing=nochange', path);
  }
  assert.equal(dump(), before);
  assert.equal(outbox(env).filter((m) => m.kind === 'family_code').length, 0);
  assert.equal((await v('/family', {})).headers.get('location'), '/family?viewing=nochange');
  assert.match(await (await v('/family/vet?viewing=nochange')).text(), /Nothing was changed\. This is their portal, read-only\./);
  // Stop viewing: the cookie goes, and the way back to the family's screen.
  const stop = await v('/family/view/exit', {});
  assert.equal(stop.status, 200);
  assert.match(stop.headers.get('set-cookie'), /^kp_family_view=; .*Max-Age=0/);
  assert.match(await stop.text(), new RegExp(`You&#39;ve stopped viewing their portal[\\s\\S]*href="https://manage\\.kennelport\\.com/s/akbostons/portal/f/${id}"`));
});

test('looking leaves no trace: her messages stay unread, clicks uncounted, their activity unmoved', async () => {
  const { env, site, her, at, addFamily, view } = await setup();
  env.DB.raw.prepare("INSERT INTO products (id, site_id, name, link_url, portal_show, portal_type) VALUES ('ins', ?, 'Puppy insurance', 'https://insure.example/akb', 1, 'insurance')").run(site.id);
  const id = await addFamily({ name: 'The Reed family', emails: 'sam@example.com', puppy_id: 'pup1' });
  await her(`/portal/f/${id}/picked-up`, {});
  assert.equal((await her(`/portal/f/${id}/message`, { body: 'How is she settling in?' })).status, 303);
  env.DB.raw.prepare('UPDATE portal_families SET last_activity_at = NULL WHERE id = ?').run(id);
  const v = at((await view(id)).cookie);
  assert.match(await (await v('/family')).text(), /Messages, 1 new/);
  assert.match(await (await v('/family/messages')).text(), /How is she settling in\?/);
  assert.equal(env.DB.raw.prepare("SELECT COUNT(*) AS n FROM portal_messages WHERE sender = 'breeder' AND read_at IS NULL").get().n, 1);
  const go = await v('/family/go/ins?from=home');
  assert.equal(go.status, 302);
  assert.equal(go.headers.get('location'), 'https://insure.example/akb');
  assert.equal(env.DB.raw.prepare('SELECT COUNT(*) AS n FROM portal_clicks').get().n, 0);
  assert.equal(env.DB.raw.prepare('SELECT last_activity_at FROM portal_families WHERE id = ?').get(id).last_activity_at, null);
  assert.equal(env.DB.raw.prepare('SELECT COUNT(*) AS n FROM portal_sessions').get().n, 0);
});

test('a view ends when she loses the site or the family is deleted; files stay the family\'s own', async () => {
  const { env, site, her, at, addFamily, view } = await setup();
  const a = await addFamily({ name: 'The Reed family', emails: 'sam@example.com', puppy_id: 'pup1' });
  const b = await addFamily({ name: 'The Diaz family', emails: 'lee@example.com', puppy_id: 'pup2' });
  // A file of each family's: hers to see through a view of that family only.
  const diaz = at(await signIn(env, H, '/family', 'lee@example.com'));
  const fd = new FormData();
  fd.append('file', new Blob(['%PDF-1.4\n%%EOF'], { type: 'application/pdf' }), 'record.pdf');
  assert.equal((await diaz('/family/vet/proof', fd)).status, 303);
  const fileId = env.DB.raw.prepare('SELECT proof_file_id FROM portal_placements WHERE family_id = ?').get(b).proof_file_id;
  const va = at((await view(a)).cookie);
  assert.equal((await va(`/family/file/${fileId}`)).status, 404);
  assert.equal((await at((await view(b)).cookie)(`/family/file/${fileId}`)).status, 200);

  // The family deleted: the next page ends the view.
  env.DB.raw.prepare('UPDATE portal_families SET deleted_at = ? WHERE id = ?').run(new Date().toISOString(), a);
  let res = await va('/family');
  assert.equal(res.status, 403);
  assert.match(await res.text(), /Viewing ends by itself after an hour/);
  assert.match(res.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal((await her(`/portal/f/${a}/view`)).status, 404);
  // Removed from the site: the same.
  const vb = at((await view(b)).cookie);
  assert.equal((await vb('/family')).status, 200);
  env.DB.raw.prepare('DELETE FROM site_users WHERE site_id = ?').run(site.id);
  res = await vb('/family');
  assert.equal(res.status, 403);
});

test('on her own domain, the link goes there', async () => {
  const { env, site, her, addFamily } = await setup();
  const id = await addFamily({ name: 'The Reed family', emails: 'sam@example.com', puppy_id: 'pup1' });
  env.DB.raw.prepare("INSERT INTO custom_domains (site_id, hostname, status, created_at) VALUES (?, 'akbostons.example', 'active', ?)").run(site.id, new Date().toISOString());
  assert.match((await her(`/portal/f/${id}/view`)).headers.get('location'), /^https:\/\/akbostons\.example\/family\/view\?t=/);
});

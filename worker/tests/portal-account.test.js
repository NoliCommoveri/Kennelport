// The Puppy Parent Portal, build chunk 4 (docs/Puppy_Parent_Portal_Plan.md 2, 7.4
// and 10): messages from pickup on, the loss page and her note, Resend's bounces,
// her delete with its 30-day undo, a back-out, and the family's own erase.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';

const M = 'manage.kennelport.com';
const H = 'akbostons.kennelport.com';
const API = 'api.kennelport.com';
const form = (o) => new URLSearchParams(o);
const outbox = (env) => env.DB.raw.prepare('SELECT kind, subject, body FROM dev_outbox ORDER BY id').all();
const ymd = (d) => d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
const DAY = 86400000;

const { runPortalDaily } = await import('../src/portal/account.js');
const { runPortalHourly } = await import('../src/portal/reminders.js');
const { pushText } = await import('../src/push.js');

async function setup() {
  const env = await makeEnv({ PORTAL_EMAIL_KEY: 'portal-test-key', RESEND_WEBHOOK_SECRET: `whsec_${btoa('a-test-webhook-secret')}` });
  const site = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  const ops = (await call(env, M, '/ops/login', { method: 'POST', body: form({ token: 'ops-token' }) })).headers.get('set-cookie').split(';')[0];
  await call(env, M, `/ops/sites/${site.id}/people`, { method: 'POST', headers: { cookie: ops }, body: form({ email: 'breeder@example.com', role: 'owner' }) });
  await call(env, M, '/signin', { method: 'POST', body: form({ email: 'breeder@example.com' }), headers: { origin: `https://${M}` } });
  const code = outbox(env).at(-1).subject.match(/(\d{6})/)[1];
  const breeder = (await call(env, M, '/signin/verify', { method: 'POST', body: form({ email: 'breeder@example.com', code }), headers: { origin: `https://${M}` } })).headers.get('set-cookie').split(';')[0];
  await call(env, M, `/ops/sites/${site.id}/portal/on`, { method: 'POST', headers: { cookie: ops } });
  const t = new Date().toISOString();
  env.DB.raw.prepare("INSERT INTO litters (id, site_id, slug, name, stage, born_on, created_at, updated_at) VALUES ('lit1', ?, 'winter', 'Winter litter', 'current', '2026-10-20', ?, ?)").run(site.id, t, t);
  for (const [id, name] of [['pup1', 'Opal'], ['pup2', 'Ruby']]) env.DB.raw.prepare("INSERT INTO puppies (id, site_id, litter_id, slug, name, sex, created_at, updated_at) VALUES (?, ?, 'lit1', ?, ?, 'female', ?, ?)").run(id, site.id, id, name, t, t);
  const her = (path, body) => call(env, M, `/s/akbostons${path}`, body ? { method: 'POST', body: form(body), headers: { cookie: breeder, origin: `https://${M}` } } : { headers: { cookie: breeder } });
  const fam = (cookie) => (path, body) => call(env, H, path, body ? { method: 'POST', body: form(body), headers: { cookie, origin: `https://${H}` } } : { headers: { cookie } });
  const row = (sql, ...a) => env.DB.raw.prepare(sql).get(...a);
  return { env, site, her, fam, row };
}

async function addFamily(her, values) {
  const res = await her('/portal/new', values);
  assert.equal(res.status, 303, await res.text());
  return res.headers.get('location').match(/\/f\/([0-9a-f-]{36})/)[1];
}

async function familySignIn(env, email) {
  await call(env, H, '/family/signin', { method: 'POST', body: form({ email }), headers: { origin: `https://${H}` } });
  const code = outbox(env).at(-1).subject.match(/(\d{6})/)[1];
  return (await call(env, H, '/family/signin/verify', { method: 'POST', body: form({ email, code }), headers: { origin: `https://${H}` } })).headers.get('set-cookie')?.split(';')[0] ?? null;
}

test('messages open at pickup: the family writes, she sees it on Today and replies, they get it by email', async () => {
  const { env, her, fam, row } = await setup();
  const id = await addFamily(her, { name: 'The Reed family', emails: 'sam@example.com', puppy_id: 'pup1', go_home_on: ymd(new Date(Date.now() + 3 * DAY)) });
  const r = fam(await familySignIn(env, 'sam@example.com'));
  // Before pickup: the page points elsewhere and posting is refused.
  assert.match(await (await r('/family/messages')).text(), /Messages here open on pickup day/);
  assert.equal((await r('/family/messages', { body: 'Hello?' })).status, 400);

  await her(`/portal/f/${id}/picked-up`, {});
  assert.equal((await r('/family/messages', { body: 'She slept all night!\n\nIs that normal?' })).status, 303);
  assert.match(row('SELECT ref FROM notify_items ORDER BY seq DESC').ref, new RegExp(`^portal-message:${id}$`));
  assert.match(await (await her('')).text(), /New message from The Reed family/);
  let screen = await (await her(`/portal/f/${id}`)).text();
  assert.match(screen, /She slept all night!/);
  // Seen: off Today.
  assert.doesNotMatch(await (await her('')).text(), /New message from The Reed family/);
  assert.equal((await her(`/portal/f/${id}/message`, { body: 'Completely normal. Enjoy it!' })).status, 303);
  const mail = outbox(env).filter((m) => m.kind === 'portal_message');
  assert.equal(mail.length, 1);
  assert.match(mail[0].body, /Completely normal/);
  assert.equal(row("SELECT COUNT(*) AS n FROM portal_email_log WHERE kind = 'message'").n, 1);
  const home = await (await r('/family')).text();
  assert.match(home, /Messages, 1 new/);
  const page = await (await r('/family/messages')).text();
  assert.match(page, /Completely normal/);
  assert.doesNotMatch(await (await r('/family')).text(), /Messages, 1 new/);
  // Another family never sees it.
  await addFamily(her, { name: 'The Diaz family', emails: 'lee@example.com', puppy_id: 'pup2' });
  const d = fam(await familySignIn(env, 'lee@example.com'));
  assert.doesNotMatch(await (await d('/family/messages')).text(), /slept/);
  assert.equal(pushText([{ kind: 'notice', site_id: 's', name: 'Reed', ref: `portal-message:${id}` }], [{ id: 's', subdomain: 'akbostons' }]).path, `/s/akbostons/portal/f/${id}#messages`);
});

test('lost before pickup: one quiet page, her note in her words, tabs down to Home and Photos', async () => {
  const { env, her, fam, row } = await setup();
  const id = await addFamily(her, { name: 'The Reed family', emails: 'sam@example.com', puppy_id: 'pup1', go_home_on: ymd(new Date(Date.now() + 3 * DAY)) });
  const r = fam(await familySignIn(env, 'sam@example.com'));
  assert.equal((await her(`/portal/f/${id}/loss`, { reason: 'died', on: ymd(new Date()) })).status, 303);
  const p = row('SELECT * FROM portal_placements WHERE family_id = ?', id);
  assert.equal(p.status, 'closed');
  assert.equal(p.life_status, 'deceased');
  assert.match(await (await her('')).text(), /Write to The Reed family/);

  let home = await (await r('/family')).text();
  assert.match(home, /We&#39;re so sorry about Opal|We're so sorry about Opal/);
  assert.match(home, /will write to you here soon/);
  for (const gone of [/Vet visit/, /Included with/, /disclosure/, /actionbar/, /Timeline/]) assert.doesNotMatch(home, gone);
  assert.match(home, /href="\/family\/photos"/);
  assert.equal((await r('/family/timeline')).status, 303);

  // The draft has brackets for her own words: saving it as it is is refused.
  const screen = await (await her(`/portal/f/${id}`)).text();
  assert.match(screen, /\[What happened, in your words\.\]/);
  assert.equal((await her(`/portal/f/${id}/loss-note`, { note: 'Dear Reeds, [What happened]' })).status, 400);
  const before = outbox(env).length;
  await her(`/portal/f/${id}/loss-note`, { note: 'Dear Sam,\n\nOpal passed away this morning. Her heart, our vet thinks.\n\nI am here whenever you want to talk.' });
  assert.equal(outbox(env).length, before);
  home = await (await r('/family')).text();
  assert.match(home, /Opal passed away this morning/);
  assert.doesNotMatch(await (await her('')).text(), /Write to The Reed family/);
  await her(`/portal/f/${id}/loss-note`, { note: 'Dear Sam,\n\nOpal passed away this morning.', send: '1' });
  assert.match(outbox(env).at(-1).body, /Opal passed away this morning/);
  // No reminder names her again.
  const n = outbox(env).length;
  await runPortalHourly(env, new Date(Date.now() + 5 * DAY));
  assert.equal(outbox(env).length, n);
});

test('Resend\'s webhook: signed events mark the log delivered or bounced; unsigned ones are refused', async () => {
  const { env, her, row } = await setup();
  const id = await addFamily(her, { name: 'The Reed family', emails: 'sam@example.com', puppy_id: 'pup1' });
  await her(`/portal/f/${id}/invite`, {});
  env.DB.raw.prepare("UPDATE portal_email_log SET provider_id = 're_123', result = 'sent'").run();
  const post = async (event, { sign = true, at = Math.floor(Date.now() / 1000) } = {}) => {
    const body = JSON.stringify(event);
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('a-test-webhook-secret'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`msg_1.${at}.${body}`)))));
    return call(env, API, '/v1/resend', { method: 'POST', body, headers: { 'content-type': 'application/json', 'svix-id': 'msg_1', 'svix-timestamp': String(at), 'svix-signature': sign ? `v1,${sig}` : 'v1,bad' } });
  };
  assert.equal((await post({ type: 'email.bounced', data: { email_id: 're_123' } }, { sign: false })).status, 401);
  assert.equal((await post({ type: 'email.bounced', data: { email_id: 're_123' } }, { at: Math.floor(Date.now() / 1000) - 3600 })).status, 401);
  assert.equal((await post({ type: 'email.delivered', data: { email_id: 're_123' } })).status, 200);
  assert.equal(row('SELECT result FROM portal_email_log').result, 'delivered');
  await post({ type: 'email.bounced', data: { email_id: 're_123' } });
  assert.equal(row('SELECT result FROM portal_email_log').result, 'bounced');
  // Delivered never undoes a bounce.
  await post({ type: 'email.delivered', data: { email_id: 're_123' } });
  assert.equal(row('SELECT result FROM portal_email_log').result, 'bounced');
  assert.match(await (await her('')).text(), /1 portal email not delivered/);
  assert.match(await (await her(`/portal/f/${id}`)).text(), /BOUNCED/);
  assert.match(row('SELECT ref FROM notify_items ORDER BY seq DESC').ref, /^portal-bounce:/);
});

test('her delete closes the portal at once, undoable for 30 days, then final', async () => {
  const { env, her, fam, row } = await setup();
  const id = await addFamily(her, { name: 'The Reed family', emails: 'sam@example.com', puppy_id: 'pup1' });
  const r = fam(await familySignIn(env, 'sam@example.com'));
  await her(`/portal/f/${id}/delete`, { confirm: 'delete' });
  assert.equal((await r('/family')).status, 200);
  assert.match(await (await r('/family')).text(), /Send me a code/); // signed out
  assert.equal(await familySignIn(env, 'sam@example.com'), null);
  const list = await (await her('/portal')).text();
  assert.match(list, /Recently deleted/);
  await her(`/portal/undo/${id}`, {});
  assert.ok(await familySignIn(env, 'sam@example.com'));
  await her(`/portal/f/${id}/delete`, { confirm: 'delete' });
  await runPortalDaily(env, new Date(Date.now() + 29 * DAY));
  assert.equal(row('SELECT COUNT(*) AS n FROM portal_families').n, 1);
  await runPortalDaily(env, new Date(Date.now() + 31 * DAY));
  assert.equal(row('SELECT COUNT(*) AS n FROM portal_families').n, 0);
});

test('the family erases their account: sign-in and messages gone, her sale records kept', async () => {
  const { env, her, fam, row } = await setup();
  const id = await addFamily(her, { name: 'The Reed family', emails: 'sam@example.com', puppy_id: 'pup1' });
  await her(`/portal/f/${id}/picked-up`, {});
  const r = fam(await familySignIn(env, 'sam@example.com'));
  await r('/family/messages', { body: 'Thank you for everything.' });
  assert.equal((await r('/family/account/delete', { confirm: 'nope' })).status, 400);
  const res = await r('/family/account/delete', { confirm: 'delete' });
  assert.match(res.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal(row('SELECT status FROM portal_families WHERE id = ?', id).status, 'erased');
  for (const t of ['portal_emails', 'portal_sessions', 'portal_messages']) assert.equal(row(`SELECT COUNT(*) AS n FROM ${t}`).n, 0, t);
  assert.equal(row("SELECT COUNT(*) AS n FROM portal_history WHERE tbl = 'portal_families'").n, 0);
  // Her records stay, shown under Erased.
  assert.equal(row('SELECT COUNT(*) AS n FROM portal_placements WHERE family_id = ?', id).n, 1);
  assert.ok(row('SELECT vet_deadline_at FROM portal_placements WHERE family_id = ?', id).vet_deadline_at);
  const list = await (await her('/portal')).text();
  assert.match(list, /Erased at the family&#39;s request|Erased at the family's request/);
  assert.equal(await familySignIn(env, 'sam@example.com'), null);
  // No more reminders to anyone.
  const n = outbox(env).length;
  await runPortalHourly(env, new Date(Date.now() + 2 * DAY));
  assert.equal(outbox(env).length, n);
});

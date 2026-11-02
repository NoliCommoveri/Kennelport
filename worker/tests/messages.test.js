import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';
import { webp, jpeg } from './helpers/images.js';

const { importContent } = await import('../src/content/io.js');
const { AK_SAMPLE } = await import('../src/content/akSample.js');
const { inviteToSite } = await import('../src/auth.js');
const { publish, forgetSnapshots } = await import('../src/publish.js');
const { generateVapidKeys, pushText } = await import('../src/push.js');
const { runCleanup } = await import('../src/cleanup.js');

const M = 'manage.kennelport.com';
const S = 'akbostons.kennelport.com';
const SO = { origin: `https://${S}` };

async function setup(extra = {}) {
  forgetSnapshots();
  const sent = [];
  const env = await makeEnv({ PUSH_FETCH: async (url) => { sent.push(url); return new Response(null, { status: 201 }); }, ...extra });
  const site = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  await importContent(env, site.id, AK_SAMPLE);
  await publish(env, site.id, 'test');
  await inviteToSite(env, site.id, 'b@example.com', 'owner', { manageUrl: 'x', siteUrl: 'y' });
  const h = { origin: `https://${M}` };
  await call(env, M, '/signin', { method: 'POST', headers: h, body: new URLSearchParams({ email: 'b@example.com' }) });
  const code = env.DB.raw.prepare("SELECT subject FROM dev_outbox WHERE kind = 'code' ORDER BY id DESC").get().subject.match(/\d{6}/)[0];
  const cookie = (await call(env, M, '/signin/verify', { method: 'POST', headers: h, body: new URLSearchParams({ email: 'b@example.com', code }) })).headers.get('set-cookie').split(';')[0];
  const get = (p) => call(env, M, p, { headers: { cookie } });
  const post = (p, body = {}) => call(env, M, p, { method: 'POST', headers: { cookie, ...h }, body: new URLSearchParams(body) });
  const postJson = (p, body) => call(env, M, p, { method: 'POST', headers: { cookie, ...h, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { env, site, get, post, postJson, sent, cookie };
}

const contact = (env, body, headers = {}) => call(env, S, '/contact', { method: 'POST', headers: { ...SO, 'cf-connecting-ip': '198.51.100.7', ...headers }, body: new URLSearchParams(body) });
const MSG = { name: 'Megan Ross', email: 'megan@example.com', topic: 'Opal', message: 'Is Opal still available?\nWe live in Tulsa.' };

test('the contact form on the site saves a message to the Inbox, never anywhere else', async () => {
  const t = await setup();
  const page = await (await call(t.env, S, '/contact')).text();
  assert.match(page, /<form class="apply-form" method="post" action="\/contact#message"/);
  assert.match(page, /name="website"/, 'the honeypot is there');
  const res = await contact(t.env, MSG);
  assert.equal(res.status, 200);
  assert.match(await res.text(), /Thanks, Megan\. Your message is on its way to AK Boston Terriers/);
  const row = t.env.DB.raw.prepare('SELECT * FROM inquiries').get();
  assert.equal(row.email, 'megan@example.com');
  assert.equal(row.message, 'Is Opal still available?\nWe live in Tulsa.');
  assert.equal(t.env.DB.raw.prepare("SELECT COUNT(*) AS n FROM dev_outbox WHERE kind != 'code' AND kind != 'invite'").get().n, 0, 'nothing emailed');
});

test('the Inbox: unread count, open marks read, reply and copy, delete', async () => {
  const t = await setup();
  await contact(t.env, MSG);
  const home = await (await t.get('/s/akbostons')).text();
  assert.match(home, /Inbox<\/b><span>Messages from your site<\/span><span class="count">1<\/span>/);
  const list = await (await t.get('/s/akbostons/inbox')).text();
  assert.match(list, /Megan Ross/);
  const id = t.env.DB.raw.prepare('SELECT id FROM inquiries').get().id;
  const one = await (await t.get(`/s/akbostons/inbox/${id}`)).text();
  assert.match(one, /Is Opal still available\?<br>We live in Tulsa\./);
  assert.match(one, /href="mailto:megan%40example\.com\?subject=Re%3A%20Opal"/);
  assert.match(one, /data-copy="megan@example\.com"/);
  assert.ok(t.env.DB.raw.prepare('SELECT read_at FROM inquiries').get().read_at);
  assert.doesNotMatch(await (await t.get('/s/akbostons')).text(), /<span class="count">/);
  await t.post(`/s/akbostons/inbox/${id}/delete`);
  assert.equal(t.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM inquiries').get().n, 0);
});

test('spam: the honeypot is thanked and dropped; too many from one visitor are refused; another origin is refused', async () => {
  const t = await setup();
  const bot = await contact(t.env, { ...MSG, website: 'http://spam.example' });
  assert.equal(bot.status, 200);
  assert.equal(t.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM inquiries').get().n, 0);
  for (let i = 0; i < 5; i++) assert.equal((await contact(t.env, MSG)).status, 200);
  const sixth = await contact(t.env, MSG);
  assert.equal(sixth.status, 400);
  assert.match(await sixth.text(), /Too many messages/);
  assert.equal((await contact(t.env, MSG, { origin: 'https://evil.example' })).status, 403);
});

test('a problem keeps what the visitor typed', async () => {
  const t = await setup();
  const res = await contact(t.env, { ...MSG, email: 'not-an-email' });
  assert.equal(res.status, 400);
  const html = await res.text();
  assert.match(html, /doesn&#39;t look right/);
  assert.match(html, /We live in Tulsa\./);
});

test('Turnstile, when set up: the widget shows, the CSP allows it, a failed check is refused', async () => {
  let verdict = false;
  const t = await setup({ TURNSTILE_SITE_KEY: '1x00000000000000000000AA', TURNSTILE_SECRET: 's', TURNSTILE_FETCH: async () => new Response(JSON.stringify({ success: verdict })) });
  const res = await call(t.env, S, '/contact');
  assert.match(await res.text(), /class="cf-turnstile" data-sitekey="1x00000000000000000000AA"/);
  assert.match(res.headers.get('content-security-policy'), /script-src 'self' https:\/\/challenges\.cloudflare\.com/);
  assert.doesNotMatch((await call(t.env, S, '/dogs')).headers.get('content-security-policy'), /challenges/);
  assert.match(await (await contact(t.env, { ...MSG, 'cf-turnstile-response': 'x' })).text(), /spam check didn/);
  verdict = true;
  assert.equal((await contact(t.env, { ...MSG, 'cf-turnstile-response': 'x' })).status, 200);
  assert.equal(t.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM inquiries').get().n, 1);
});

async function sendReview(env, extra = {}) {
  const form = new FormData();
  for (const [k, v] of Object.entries({ first_name: 'Sarah', town: 'Tulsa, OK', puppy_name: 'Biscuit', home_month: '2026-04', rating: '5', quote: 'Biscuit is perfect.', consent: '1', ...extra })) form.append(k, v);
  return call(env, S, '/reviews', { method: 'POST', headers: SO, body: form });
}

test('a family review waits for approval, then shows after publish; its photo is private until then', async () => {
  const t = await setup();
  const res = await sendReview(t.env, {});
  assert.match(await res.text(), /Thank you, Sarah! Your review goes to AK Boston Terriers to read/);
  const form = new FormData();
  for (const [k, v] of Object.entries({ first_name: 'Dana', rating: '4', quote: 'Lovely pup.', consent: '1' })) form.append(k, v);
  form.append('photo', new Blob([webp(800, 600)]), 'photo');
  await call(t.env, S, '/reviews', { method: 'POST', headers: SO, body: form });
  const dana = t.env.DB.raw.prepare("SELECT * FROM stories WHERE first_name = 'Dana'").get();
  assert.equal(dana.status, 'pending');
  assert.ok(dana.photo_id);
  assert.equal((await call(t.env, S, `/_kp/p/${dana.photo_id}`)).status, 404, 'private until approved and published');
  const queue = await (await t.get('/s/akbostons/reviews-queue')).text();
  assert.match(queue, /Biscuit is perfect\./);
  assert.match(await (await t.get('/s/akbostons')).text(), /Reviews to approve<\/b><span>From families<\/span><span class="count">2<\/span>/);
  await t.post(`/s/akbostons/reviews-queue/${dana.id}/approve`);
  assert.doesNotMatch(await (await call(t.env, S, '/reviews')).text(), /Lovely pup/, 'not live until published');
  await t.post('/s/akbostons/publish');
  assert.match(await (await call(t.env, S, '/reviews')).text(), /Lovely pup/);
  assert.equal((await call(t.env, S, `/_kp/p/${dana.photo_id}`)).status, 200);
  const sarah = t.env.DB.raw.prepare("SELECT id FROM stories WHERE first_name = 'Sarah'").get();
  await t.post(`/s/akbostons/reviews-queue/${sarah.id}/decline`);
  assert.equal(t.env.DB.raw.prepare("SELECT COUNT(*) AS n FROM stories WHERE first_name = 'Sarah'").get().n, 0);
});

test('a review needs consent and a rating; a photo with camera data is refused with a reason', async () => {
  const t = await setup();
  assert.match(await (await sendReview(t.env, { consent: '' })).text(), /tick the box/);
  assert.match(await (await sendReview(t.env, { rating: '0' })).text(), /star rating/);
  const form = new FormData();
  for (const [k, v] of Object.entries({ first_name: 'Ann', rating: '5', quote: 'Great.', consent: '1' })) form.append(k, v);
  form.append('photo', new Blob([jpeg(800, 600, { exif: true })]), 'photo');
  assert.match(await (await call(t.env, S, '/reviews', { method: 'POST', headers: SO, body: form })).text(), /camera data/);
  assert.equal(t.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM stories WHERE status = \'pending\'').get().n, 0);
});

test('push: a device turns on, a message wakes it, the service worker learns the first name only', async () => {
  const keys = await generateVapidKeys();
  const t = await setup({ VAPID_PRIVATE_JWK: keys.privateJwk });
  const page = await (await t.get('/notifications')).text();
  assert.match(page, new RegExp(`data-key="${keys.publicKey}"`));
  const endpoint = 'https://fcm.googleapis.com/fcm/send/abc123';
  assert.deepEqual(await (await t.postJson('/push/subscribe', { endpoint, auth: 'aaaaaaaaaaaaaaaaaaaaaa' })).json(), { ok: true });
  assert.equal((await t.postJson('/push/subscribe', { endpoint: 'https://evil.example/x', auth: 'aaaaaaaaaaaaaaaaaaaaaa' })).status, 400);
  await contact(t.env, MSG);
  assert.deepEqual(t.sent, [endpoint]);
  const pending = await call(t.env, M, '/push/pending', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint, auth: 'aaaaaaaaaaaaaaaaaaaaaa' }) });
  const n = await pending.json();
  assert.equal(n.body, 'New message from Megan');
  assert.match(n.path, /^\/s\/akbostons\/inbox\/[0-9a-f-]{36}$/);
  assert.doesNotMatch(JSON.stringify(n), /Opal|Tulsa|megan@/);
  const wrong = await (await call(t.env, M, '/push/pending', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint, auth: 'bbbbbbbbbbbbbbbbbbbbbb' }) })).json();
  assert.equal(wrong.body, 'Something new on your website.');
  // Signed out: the device is silent.
  await t.post('/signout');
  t.sent.length = 0;
  await contact(t.env, { ...MSG, name: 'Owen' });
  assert.deepEqual(t.sent, []);
});

test('push text: one, several, test, and several sites', () => {
  const sites = [{ id: 'a', subdomain: 'ak', kennel_name: 'AK' }];
  assert.equal(pushText([{ site_id: 'a', kind: 'review', name: 'Sarah' }], sites).body, 'Sarah sent a review to approve');
  assert.equal(pushText([{ site_id: 'a', kind: 'message', name: 'A' }, { site_id: 'a', kind: 'message', name: 'B' }, { site_id: 'a', kind: 'review', name: 'C' }], sites).body, '2 new messages and 1 review to approve');
  assert.match(pushText([{ site_id: 'a', kind: 'test' }], sites).body, /working/);
  assert.equal(pushText([{ site_id: 'a', kind: 'message', name: 'Megan' }], [...sites, { id: 'b', subdomain: 'x', kennel_name: 'X' }]).body, 'AK: New message from Megan');
});

test('the daily cleanup deletes messages after 90 days and keeps newer ones', async () => {
  const t = await setup();
  await contact(t.env, MSG);
  t.env.DB.raw.prepare("INSERT INTO inquiries (id, site_id, name, email, message, received_at) VALUES ('old', ?, 'Old', 'o@example.com', 'old', '2026-01-01T00:00:00Z')").run(t.site.id);
  const { inquiries } = await runCleanup(t.env, new Date('2026-11-02T00:00:00Z'));
  assert.equal(inquiries, 1);
  assert.equal(t.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM inquiries').get().n, 1);
});

test('ops makes push keys and reports what is set up', async () => {
  const env = await makeEnv();
  const r = await call(env, M, '/ops/login', { method: 'POST', body: new URLSearchParams({ token: 'ops-token' }) });
  const cookie = r.headers.get('set-cookie').split(';')[0];
  const page = await (await call(env, M, '/ops', { headers: { cookie } })).text();
  assert.match(page, /Push notifications<\/td><td class="bad">/);
  assert.match(page, /Spam check<\/td><td class="bad">/);
  const made = await (await call(env, M, '/ops/push-keys', { method: 'POST', headers: { cookie } })).text();
  assert.match(made, /VAPID_PRIVATE_JWK/);
  assert.match(made, /&quot;kty&quot;:&quot;EC&quot;/);
});

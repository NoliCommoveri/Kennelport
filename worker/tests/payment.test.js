// How to pay and the safe-payment notice (plan 3.9): edited in the manage app,
// off until switched on, shown on the waitlist page with the notice, linked from
// How it works steps and the footer, and the notice on puppy pages.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';

const { importContent, exportContent } = await import('../src/content/io.js');
const { AK_SAMPLE } = await import('../src/content/akSample.js');
const { inviteToSite } = await import('../src/auth.js');
const { forgetSnapshots } = await import('../src/publish.js');
const { SAFE_NOTICE_TEXT } = await import('../src/render/parts.js');

const M = 'manage.kennelport.com';
const SITE = 'akbostons.kennelport.com';

async function breeder() {
  forgetSnapshots();
  const env = await makeEnv();
  const site = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  await importContent(env, site.id, AK_SAMPLE);
  await inviteToSite(env, site.id, 'b@example.com', 'owner', { manageUrl: 'x', siteUrl: 'y' });
  const headers = { origin: `https://${M}` };
  await call(env, M, '/signin', { method: 'POST', headers, body: new URLSearchParams({ email: 'b@example.com' }) });
  const code = env.DB.raw.prepare("SELECT subject FROM dev_outbox WHERE kind = 'code' ORDER BY id DESC").get().subject.match(/\d{6}/)[0];
  const res = await call(env, M, '/signin/verify', { method: 'POST', headers, body: new URLSearchParams({ email: 'b@example.com', code }) });
  const cookie = res.headers.get('set-cookie').split(';')[0];
  const get = (p) => call(env, M, `/s/akbostons${p}`, { headers: { cookie } });
  const post = (p, body = {}) => call(env, M, `/s/akbostons${p}`, { method: 'POST', headers: { cookie, origin: `https://${M}` }, body: new URLSearchParams(body) });
  const page = async (p) => (await call(env, SITE, p)).text();
  return { env, site, get, post, page };
}

const FEE = {
  show_on_site: '1', due_note: 'after we approve your application',
  'methods.0.0': 'Venmo', 'methods.0.1': '@AK-Bostons', 'methods.1.0': 'Zelle', 'methods.1.1': 'pay@akbostons.example',
  note: 'your full name and "AK application"', pay_url: 'https://pay.example.com/ak',
};

test('the How to pay screen opens with the fee and deposit off and the notice on', async () => {
  const b = await breeder();
  const html = await (await b.get('/payment')).text();
  assert.match(html, /Application fee/);
  assert.match(html, /Puppy deposit/);
  assert.match(html, /Safe-payment notice/);
  assert.doesNotMatch(html, /name="show_on_site" value="1" checked/);
  assert.match(html, /name="enabled" value="1" checked/);
  assert.match(await (await b.get('')).text(), /How to pay/);
});

test('a card can only be shown with a way to pay in it', async () => {
  const b = await breeder();
  const res = await b.post('/payment/application_fee', { show_on_site: '1', note: 'Your name' });
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Not saved: methods: add at least one way to pay/);
  assert.match(html, /value="Your name"/);
});

test('nothing shows until switched on and published; then the waitlist has the card, the notice, and the links', async () => {
  const b = await breeder();
  await b.post('/publish');
  assert.doesNotMatch(await b.page('/waitlist'), /class="pay-card"/);
  // The notice is on from the start, in its default words.
  assert.ok((await b.page('/waitlist')).includes('gift card'));

  assert.equal((await b.post('/payment/application_fee', FEE)).status, 303);
  assert.doesNotMatch(await b.page('/waitlist'), /pay-card/, 'not before publishing');
  const pub = await (await b.get('/publish')).text();
  assert.match(pub, /How to pay, application fee: shown/);
  await b.post('/publish');

  const w = await b.page('/waitlist');
  assert.match(w, /id="how-to-pay"/);
  assert.match(w, /<h3>Application fee<\/h3>/);
  assert.match(w, /<b>When:<\/b> after we approve your application/);
  assert.match(w, /data-copy="@AK-Bostons"/);
  assert.match(w, /data-copy="pay@akbostons.example"/);
  assert.match(w, /In the note:<\/b> your full name and &quot;AK application&quot;/);
  assert.match(w, /href="https:\/\/pay\.example\.com\/ak" rel="noopener noreferrer" target="_blank">Pay online/);
  assert.match(w, /These are our only payment details\./);
  assert.match(w, /href="\/waitlist#how-to-pay">How to pay<\/a>/, 'footer link');

  // The AK sample's "Pay the application fee" step links to it.
  assert.match(await b.page('/how-it-works'), /<a class="more" href="\/waitlist#how-to-pay">How to pay<\/a>/);
  // Puppy pages: the methods, the link, the notice.
  const pup = await b.page('/litters/gem-2026/opal');
  assert.match(pup, /We take payment only by Venmo or Zelle, to the details under <a href="\/waitlist#how-to-pay">How to pay<\/a>\./);
});

test('the notice can be reworded or switched off', async () => {
  const b = await breeder();
  await b.post('/payment/safe_notice', { enabled: '1', text: 'Only ever pay us, never a stranger.' });
  await b.post('/publish');
  assert.match(await b.page('/litters/gem-2026/opal'), /Only ever pay us, never a stranger\./);
  await b.post('/payment/safe_notice', {});
  assert.match(await (await b.get('/publish')).text(), /Safe-payment notice: switched off/);
  await b.post('/publish');
  const pup = await b.page('/litters/gem-2026/opal');
  assert.doesNotMatch(pup, /pay-safe/);
  assert.doesNotMatch(await b.page('/waitlist'), /id="how-to-pay"/);
});

test('with the waitlist page off there are no links to How to pay', async () => {
  const b = await breeder();
  await b.post('/payment/deposit', { ...FEE, title: '' });
  await b.post('/pages/waitlist', { menu_label: '' });
  await b.post('/publish');
  assert.doesNotMatch(await b.page('/how-it-works'), /#how-to-pay/);
  const pup = await b.page('/litters/gem-2026/opal');
  assert.doesNotMatch(pup, /#how-to-pay/);
  assert.match(pup, /We take payment only by Venmo or Zelle\./);
});

test('payment goes out in the content document and comes back in', async () => {
  const b = await breeder();
  await b.post('/payment/deposit', FEE);
  const doc = await exportContent(b.env, b.site.id);
  assert.equal(doc.payment.deposit.show_on_site, true);
  assert.deepEqual(doc.payment.deposit.methods[0], ['Venmo', '@AK-Bostons']);
  const other = await addSite(b.env, 'copy');
  await importContent(b.env, other.id, { payment: doc.payment });
  assert.deepEqual((await exportContent(b.env, other.id)).payment.deposit, doc.payment.deposit);
  await assert.rejects(importContent(b.env, other.id, { payment: { tip_jar: {} } }), /not a kind/);
});

test('closing a site deletes its payment details', async () => {
  const b = await breeder();
  await b.post('/payment/deposit', FEE);
  const { closeSite } = await import('../src/sites.js');
  await closeSite(b.env, b.site.id, 'akbostons');
  assert.equal(b.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM payment_info').get().n, 0);
});

test('the default notice text is plain about scams', () => {
  assert.match(SAFE_NOTICE_TEXT, /gift card/);
});

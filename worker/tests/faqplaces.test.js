// A question from the FAQ shown again elsewhere on the site (plan 3.9): the places
// live on the question itself, so an export carries them and nothing can point at
// a question that is gone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';

const { importContent, exportContent } = await import('../src/content/io.js');
const { AK_SAMPLE } = await import('../src/content/akSample.js');
const { inviteToSite } = await import('../src/auth.js');
const { forgetSnapshots } = await import('../src/publish.js');

const M = 'manage.kennelport.com';
const SITE = 'akbostons.kennelport.com';
const REG_FAQ = 'What is the difference between &quot;limited&quot; and &quot;full&quot; registration?';

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
  const row = (sql, ...a) => env.DB.raw.prepare(sql).get(...a);
  const page = async (p) => (await call(env, SITE, p)).text();
  return { env, site, get, post, row, page };
}

test('the registration question rides at the top of every litter page, and only there', async () => {
  const b = await breeder();
  await b.post('/publish');

  const litter = await b.page('/litters/gem-2026');
  assert.ok(litter.includes(`<div class="acc"><details class="x"><summary>${REG_FAQ}</summary>`), 'the question, drawn like the FAQ page draws it');
  // Above the litter, under its breadcrumb, with the card pushed down.
  assert.match(litter, /breadcrumb[\s\S]{0,400}<div class="acc">[\s\S]{0,900}<div class="mt-26"><div class="parents/);
  assert.match(litter, /Almost every puppy goes home on limited registration/);
  // Still on the FAQ page, where every question lives.
  assert.ok((await b.page('/faq')).includes(REG_FAQ));
  // Nowhere she didn't ask for it.
  for (const p of ['/', '/dogs', '/dogs/willow', '/litters', '/litters/gem-2026/opal', '/extras', '/contact', '/waitlist']) {
    assert.doesNotMatch(await b.page(p), /<div class="acc">/, `${p} carries no placed question`);
  }
});

test('she picks the pages on the question itself, and the site follows at the next publish', async () => {
  const b = await breeder();
  await b.post('/publish');
  const id = b.row("SELECT id FROM expanders WHERE page = 'faq' AND heading LIKE 'What is the difference%'").id;

  // The form offers every place as a tick box, this one already on its litters.
  const form = await (await b.get(`/lists/faq/${id}`)).text();
  assert.match(form, /<legend>Also show this question at the top of/);
  assert.match(form, /name="places" value="litter" checked> <span>Every litter&#39;s page<\/span>/);
  assert.match(form, /name="places" value="puppy"> <span>Every puppy&#39;s profile<\/span>/);
  assert.match(form, /name="places" value="home"> <span>Home page<\/span>/);
  // The list says where a question is carried, so she can see it at a glance.
  assert.match(await (await b.get('/lists/faq')).text(), /also on every litter&#39;s page/);

  // Add the puppy pages and Home; drop the litters.
  const body = new URLSearchParams({ heading: 'What is the difference between "limited" and "full" registration?', body: 'Limited means pet only.' });
  body.append('places', 'puppy');
  body.append('places', 'home');
  const saved = await b.post(`/lists/faq/${id}`, body);
  assert.equal(saved.status, 303);
  assert.deepEqual(JSON.parse(b.row('SELECT places FROM expanders WHERE id = ?', id).places), ['home', 'puppy'], 'kept in the model order');

  // The draft changed; the site still shows what was published.
  assert.match(await b.page('/litters/gem-2026'), /<div class="acc">/);
  await b.post('/publish');
  assert.doesNotMatch(await b.page('/litters/gem-2026'), /<div class="acc">/);
  assert.match(await b.page('/litters/gem-2026/opal'), /<div class="acc">[\s\S]{0,600}<div class="dogpage mt-26">/);
  assert.match(await b.page('/'), /Limited means pet only\./);

  // Nothing ticked: back to the FAQ page only.
  await b.post(`/lists/faq/${id}`, { heading: 'What is the difference?', body: 'Limited means pet only.' });
  await b.post('/publish');
  assert.equal(b.row('SELECT places FROM expanders WHERE id = ?', id).places, null);
  assert.doesNotMatch(await b.page('/'), /<div class="acc">/);
  assert.match(await b.page('/faq'), /What is the difference\?/);
});

test('places travel with the question through an export and import, and a bad one is refused', async () => {
  const b = await breeder();
  const doc = await exportContent(b.env, b.site.id);
  const reg = doc.expanders.faq.find((f) => f.heading.startsWith('What is the difference'));
  assert.deepEqual(reg.places, ['litter']);
  assert.deepEqual(doc.expanders.policies[0].places, undefined, 'only the FAQ has places');

  // Round trip: the same question, the same places, with new ids.
  doc.expanders.faq = doc.expanders.faq.map((f) => (f === reg ? { ...f, places: ['litter', 'dog'] } : f));
  await importContent(b.env, b.site.id, { expanders: doc.expanders });
  const again = await exportContent(b.env, b.site.id);
  assert.deepEqual(again.expanders.faq.find((f) => f.heading.startsWith('What is the difference')).places, ['dog', 'litter']);
  await b.post('/publish');
  assert.match(await b.page('/dogs/willow'), /<div class="acc">[\s\S]{0,600}<div class="dogpage mt-26">/);

  await assert.rejects(
    () => importContent(b.env, b.site.id, { expanders: { faq: [{ heading: 'Hi', body: 'There', places: ['everywhere'] }] } }),
    /places/,
  );
  await assert.rejects(
    () => importContent(b.env, b.site.id, { expanders: { policies: [{ heading: 'Hi', body: 'There', places: ['litter'] }] } }),
    /places/,
  );
});

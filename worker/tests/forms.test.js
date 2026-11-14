// The contact and review forms' fields (docs/plans/site-builder.md, "Forms", step
// 3.8; content/forms.js): the owner's Forms screen, the forms on the site, what a
// sent form keeps, and where the breeder reads it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';

const { importContent } = await import('../src/content/io.js');
const { AK_SAMPLE } = await import('../src/content/akSample.js');
const { inviteToSite } = await import('../src/auth.js');
const { publish, buildSnapshot, forgetSnapshots, draftChanges } = await import('../src/publish.js');
const { loadBuild } = await import('../src/content/rules.js');
const { cleanForm, formOf } = await import('../src/content/forms.js');

const M = 'manage.kennelport.com';
const S = 'akbostons.kennelport.com';
const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ');
const decode = (v) => v.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

async function setup() {
  forgetSnapshots();
  const env = await makeEnv();
  const site = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  await importContent(env, site.id, AK_SAMPLE);
  await publish(env, site.id, 'test');
  const login = await call(env, M, '/ops/login', { method: 'POST', body: new URLSearchParams({ token: 'ops-token' }) });
  const admin = login.headers.getSetCookie().map((c) => c.split(';')[0]).find((c) => c.startsWith('kp_admin='));
  await inviteToSite(env, site.id, 'b@example.com', 'owner', { manageUrl: 'x', siteUrl: 'y' });
  const h = { origin: `https://${M}` };
  await call(env, M, '/signin', { method: 'POST', headers: h, body: new URLSearchParams({ email: 'b@example.com' }) });
  const code = env.DB.raw.prepare("SELECT subject FROM dev_outbox WHERE kind = 'code' ORDER BY id DESC").get().subject.match(/\d{6}/)[0];
  const her = (await call(env, M, '/signin/verify', { method: 'POST', headers: h, body: new URLSearchParams({ email: 'b@example.com', code }) })).headers.get('set-cookie').split(';')[0];
  const screen = async () => (await call(env, M, '/admin/akbostons/forms', { headers: { cookie: admin } })).text();
  // The Forms screen as drawn, with changes ({ name: value, name: null to untick }), and a press.
  const save = async (changes = {}, act = null) => {
    const html = await screen();
    const body = new URLSearchParams();
    for (const [, a] of html.matchAll(/<input([^>]*)>/g)) {
      const name = a.match(/name="([^"]+)"/)?.[1];
      if (!name || / disabled/.test(a)) continue;
      if (/type="checkbox"/.test(a)) { if (/ checked/.test(a)) body.set(name, '1'); continue; }
      body.set(name, decode(a.match(/value="([^"]*)"/)?.[1] ?? ''));
    }
    for (const [, name, inner] of html.matchAll(/<select name="([^"]+)">([\s\S]*?)<\/select>/g)) body.set(name, inner.match(/<option value="([^"]*)" selected/)?.[1] ?? '');
    for (const [, name, inner] of html.matchAll(/<textarea name="([^"]+)"[^>]*>([\s\S]*?)<\/textarea>/g)) body.set(name, decode(inner));
    for (const [k, v] of Object.entries(changes)) { if (v === null) body.delete(k); else body.set(k, v); }
    if (act) body.set('act', act);
    const res = await call(env, M, '/admin/akbostons/forms', { method: 'POST', headers: { cookie: admin, origin: `https://${M}` }, body });
    assert.equal(res.status, 303);
    return res;
  };
  const idx = async (which, key) => {
    const m = [...(await screen()).matchAll(new RegExp(`name="f\\.${which}\\.(\\d+)\\.key" value="([^"]+)"`, 'g'))];
    return Number(m.find((x) => x[2] === key)[1]);
  };
  const go = async () => { forgetSnapshots(); await publish(env, site.id, 'test'); };
  const send = (path, body) => call(env, S, path, { method: 'POST', headers: { origin: `https://${S}`, 'cf-connecting-ip': '198.51.100.9' }, body: body instanceof FormData ? body : new URLSearchParams(body) });
  const hers = async (p) => (await call(env, M, `/s/akbostons${p}`, { headers: { cookie: her } })).text();
  return { env, site, screen, save, idx, go, send, hers };
}

test('with nothing set, each form is today\'s', () => {
  assert.deepEqual(formOf(null, 'contact').map((f) => [f.key, f.required]), [['name', true], ['email', true], ['phone', false], ['topic', false], ['message', true]]);
  assert.deepEqual(formOf(null, 'reviews').map((f) => f.key), ['first_name', 'town', 'puppy_name', 'home_month', 'rating', 'quote', 'photo', 'consent']);
  // The fixed fields stay on and required whatever is sent; consent stays last.
  const f = cleanForm('reviews', [{ key: 'consent', on: false }, { key: 'quote', on: false }, { key: 'q-x', words: 'Hi' }]);
  assert.equal(f.at(-1).key, 'consent');
  assert.ok(f.find((x) => x.key === 'quote').on && f.find((x) => x.key === 'consent').required);
  assert.equal(f.find((x) => x.key === 'rating').on, false, 'a field she left out is off');
});

test('the owner sets the contact form: fields on, required, reworded, moved, a question of her own; the message keeps every answer', async () => {
  const t = await setup();
  let html = await t.screen();
  assert.match(text(html), /Contact form As today .* Review form As today/);
  const town = await t.idx('contact', 'town');
  const about = await t.idx('contact', 'about');
  const phone = await t.idx('contact', 'phone');
  const msg = await t.idx('contact', 'message');
  // The name can't be switched off.
  assert.match(html, /name="f\.contact\.0\.on" value="1" checked disabled/);
  await t.save({ [`f.contact.${town}.on`]: '1', [`f.contact.${about}.on`]: '1', [`f.contact.${phone}.req`]: '1', [`f.contact.${msg}.words`]: 'Tell us about your family', 'f.contact.0.on': null });
  await t.save({}, 'add:contact');
  const q = await t.idx('contact', 'q-question-1');
  await t.save({ [`f.contact.${q}.words`]: 'Have you had a Boston before?', [`f.contact.${q}.type`]: 'yes_no', [`f.contact.${q}.req`]: '1' });
  await t.save({}, `mv:contact:${await t.idx('contact', 'topic')}:up`);
  html = await t.screen();
  assert.match(text(html), /Contact form Back to today's form/);
  const build = await loadBuild(t.env, t.site.id);
  assert.deepEqual(build.forms.contact.filter((f) => f.on).map((f) => f.key), ['name', 'email', 'topic', 'phone', 'message', 'town', 'about', 'q-question-1']);
  assert.ok(!build.forms.reviews, 'the review form, unchanged, isn\'t kept');

  assert.ok((await draftChanges(t.env, t.site.id)).some((l) => /The contact and review forms: changed/.test(l.text)));
  await t.go();
  const page = await (await call(t.env, S, '/contact')).text();
  assert.match(page, /<label for="c-phone">Phone<input id="c-phone" type="tel" name="phone" autocomplete="tel" maxlength="30" required value="">/, 'required: no "(optional)"');
  assert.match(page, /<label for="c-msg">Tell us about your family<textarea/);
  assert.match(page, /<label for="c-town">Town \(optional\)<input id="c-town" name="town" maxlength="80" value="">/);
  assert.match(page, /<select id="c-about" name="about"><option value=""><\/option><option>The Gem litter<\/option><option>Opal \(The Gem litter\)<\/option>/);
  assert.match(page, /Have you had a Boston before\?<select id="c-q-question-1" name="q\.q-question-1" required><option value="">Choose…<\/option><option>Yes<\/option><option>No<\/option>/);
  assert.ok(page.indexOf('name="topic"') < page.indexOf('name="phone"'), 'moved up');

  const base = { name: 'Megan Ross', email: 'megan@example.com', message: 'Hello' };
  let res = await t.send('/contact', base);
  assert.equal(res.status, 400);
  assert.match(await res.text(), /Please fill in the phone number\./);
  res = await t.send('/contact', { ...base, phone: '555 0100', about: 'Nobody (The Gem litter)', 'q.q-question-1': 'Yes' });
  assert.match(await res.text(), /Please choose an answer from the list for &quot;The puppy or litter&quot;|Please choose an answer from the list for "The puppy or litter"/);
  res = await t.send('/contact', { ...base, phone: '555 0100' });
  assert.match(await res.text(), /Please answer (&quot;|")Have you had a Boston before\?/);
  res = await t.send('/contact', { ...base, phone: '555 0100', town: 'Tulsa', about: 'Opal (The Gem litter)', 'q.q-question-1': 'Yes', topic: 'Opal' });
  assert.equal(res.status, 200);
  const row = t.env.DB.raw.prepare('SELECT * FROM inquiries').get();
  assert.equal(row.phone, '555 0100');
  assert.equal(row.topic, 'Opal');
  assert.deepEqual(JSON.parse(row.answers), [['Town', 'Tulsa'], ['The puppy or litter', 'Opal (The Gem litter)'], ['Have you had a Boston before?', 'Yes']]);
  // Her Inbox shows them under the message.
  assert.match(text(await t.hers(`/inbox/${row.id}`)), /Hello Town Tulsa The puppy or litter Opal \(The Gem litter\) Have you had a Boston before\? Yes/);

  // Back to today's form.
  await t.save({}, 'today:contact');
  assert.equal((await loadBuild(t.env, t.site.id)).forms, undefined);
});

test('the subject switched off: a full registration link still brings its subject', async () => {
  const t = await setup();
  await t.save({ [`f.contact.${await t.idx('contact', 'topic')}.on`]: null });
  t.env.DB.raw.prepare("UPDATE litters SET ask_full_reg = 1 WHERE slug = 'gem-2026'").run();
  t.env.DB.raw.prepare("UPDATE puppies SET registration = NULL").run();
  await t.go();
  const page = await (await call(t.env, S, '/contact?full-reg=gem-2026')).text();
  assert.doesNotMatch(page, /id="c-topic"/);
  assert.match(page, /<input type="hidden" name="topic" value="Full registration: The Gem litter">/);
  await t.send('/contact', { name: 'Megan Ross', email: 'megan@example.com', message: 'Hello', topic: 'Full registration: Gem 2026' });
  assert.equal(t.env.DB.raw.prepare('SELECT topic FROM inquiries').get().topic, 'Full registration: Gem 2026');
});

test('the review form: rating and town off, an email and a question for her only, never on the review', async () => {
  const t = await setup();
  await t.save({ [`f.reviews.${await t.idx('reviews', 'rating')}.on`]: null, [`f.reviews.${await t.idx('reviews', 'town')}.on`]: null, [`f.reviews.${await t.idx('reviews', 'email')}.on`]: '1' });
  await t.save({}, 'add:reviews');
  const q = await t.idx('reviews', 'q-question-1');
  await t.save({ [`f.reviews.${q}.words`]: 'Which pup did you take home?' });
  await t.go();
  const page = await (await call(t.env, S, '/reviews')).text();
  assert.doesNotMatch(page, /name="rating"|id="r-town"/);
  assert.match(page, /<label for="r-email">Email \(optional, for us only\)<input id="r-email" type="email" name="email" autocomplete="email" maxlength="254" value="">/);
  assert.ok(page.indexOf('id="r-q-question-1"') < page.indexOf('id="r-ok"'), 'the consent box stays last');

  const fd = new FormData();
  for (const [k, v] of Object.entries({ first_name: 'Dana', town: 'Ignored', quote: 'Lovely pup.', consent: '1', email: 'dana@example.com', 'q.q-question-1': 'Ruby' })) fd.set(k, v);
  const res = await t.send('/reviews', fd);
  assert.equal(res.status, 200);
  const r = t.env.DB.raw.prepare("SELECT * FROM stories WHERE first_name = 'Dana'").get();
  assert.equal(r.rating, null);
  assert.equal(r.town, null, 'a field that isn\'t on the form isn\'t kept');
  assert.deepEqual(JSON.parse(r.answers), [['Email', 'dana@example.com'], ['Which pup did you take home?', 'Ruby']]);
  const queue = text(await t.hers('/reviews-queue'));
  assert.match(queue, /Lovely pup\. Email dana@example\.com Which pup did you take home\? Ruby These answers are for you: they never show on your website\./);

  t.env.DB.raw.prepare("UPDATE stories SET status = 'approved' WHERE id = ?").run(r.id);
  const snap = await buildSnapshot(t.env, t.site.id);
  assert.ok(!JSON.stringify(snap.reviews).includes('dana@example.com'));
  await t.go();
  const site = await (await call(t.env, S, '/reviews')).text();
  assert.match(site, /Lovely pup\./);
  assert.doesNotMatch(site, /dana@example\.com|Ruby<\/dd>/);
});

// The application form for breeders who run their list by hand (plan 3.8, 3.10;
// decision 26): the breeder's own questions on the waitlist page, answers into
// the Inbox, a closed switch, and the questions in the content document.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';

const { importContent, exportContent } = await import('../src/content/io.js');
const { AK_SAMPLE } = await import('../src/content/akSample.js');
const { inviteToSite } = await import('../src/auth.js');
const { forgetSnapshots } = await import('../src/publish.js');

const M = 'manage.kennelport.com';
const SITE = 'akbostons.kennelport.com';

async function breeder(content = AK_SAMPLE) {
  forgetSnapshots();
  const env = await makeEnv();
  const site = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  await importContent(env, site.id, content);
  await inviteToSite(env, site.id, 'b@example.com', 'owner', { manageUrl: 'x', siteUrl: 'y' });
  const headers = { origin: `https://${M}` };
  await call(env, M, '/signin', { method: 'POST', headers, body: new URLSearchParams({ email: 'b@example.com' }) });
  const code = env.DB.raw.prepare("SELECT subject FROM dev_outbox WHERE kind = 'code' ORDER BY id DESC").get().subject.match(/\d{6}/)[0];
  const res = await call(env, M, '/signin/verify', { method: 'POST', headers, body: new URLSearchParams({ email: 'b@example.com', code }) });
  const cookie = res.headers.get('set-cookie').split(';')[0];
  const get = (p) => call(env, M, `/s/akbostons${p}`, { headers: { cookie } });
  const post = (p, body = {}) => call(env, M, `/s/akbostons${p}`, { method: 'POST', headers: { cookie, origin: `https://${M}` }, body: new URLSearchParams(body) });
  const page = async (p) => (await call(env, SITE, p)).text();
  const apply = (body) => call(env, SITE, '/waitlist', { method: 'POST', headers: { origin: `https://${SITE}`, 'cf-connecting-ip': '198.51.100.9' }, body: new URLSearchParams(body) });
  await post('/publish');
  const questions = () => env.DB.raw.prepare('SELECT id, label, type FROM form_fields ORDER BY sort').all();
  return { env, site, get, post, page, apply, questions };
}

const answer = (qs, label, value) => [`q.${qs.find((q) => q.label === label).id}`, value];

test('the waitlist page has the application form with the sample\'s questions', async () => {
  const b = await breeder();
  const w = await b.page('/waitlist');
  assert.match(w, /<form class="apply-form" method="post" action="\/waitlist#apply" id="apply">/);
  assert.match(w, /<h2 class="mt-6">Apply to join the waitlist<\/h2>/);
  assert.match(w, /Your place on the list is set the day your application fee is received\./);
  assert.match(w, /name="name"/);
  assert.match(w, /type="email" name="email"/);
  assert.match(w, /Preferred sex<select[^>]*><option selected>Either<\/option><option>Female<\/option>/);
  assert.match(w, /<option>Brindle &amp; white<\/option>/);
  assert.match(w, /Tell us about your home \(optional\)<span class="q-hint">Who lives with you/);
  assert.match(w, /name="website"/, 'the honeypot');
  assert.doesNotMatch(w, /will be shown here soon/);
  assert.match(w, /Send application/);
});

test('an application lands in the Inbox with its answers, and nothing is emailed', async () => {
  const b = await breeder();
  const qs = b.questions();
  const res = await b.apply(Object.fromEntries([
    ['name', 'Megan Ross'], ['email', 'megan@example.com'],
    answer(qs, 'Preferred sex', 'Female'), answer(qs, 'Color', 'Any color'),
    answer(qs, 'Timing', 'Spring 2027'), answer(qs, 'Looking for', 'A family companion'),
    answer(qs, 'Tell us about your home', 'Two kids and a cat.\nBig fenced yard.'),
  ]));
  assert.equal(res.status, 200);
  assert.match(await res.text(), /Thanks, Megan\. Your application is on its way to AK Boston Terriers/);
  const row = b.env.DB.raw.prepare('SELECT * FROM inquiries').get();
  assert.equal(row.kind, 'application');
  assert.equal(row.topic, 'Puppy application');
  assert.deepEqual(JSON.parse(row.answers), [
    ['Preferred sex', 'Female'], ['Color', 'Any color'], ['Timing', 'Spring 2027'], ['Looking for', 'A family companion'],
    ['Tell us about your home', 'Two kids and a cat.\nBig fenced yard.'],
  ]);
  assert.equal(b.env.DB.raw.prepare("SELECT COUNT(*) AS n FROM dev_outbox WHERE kind NOT IN ('code', 'invite')").get().n, 0);

  const list = await (await b.get('/inbox')).text();
  assert.match(list, /Megan Ross/);
  assert.match(list, /Puppy application/);
  const one = await (await b.get(`/inbox/${row.id}`)).text();
  assert.match(one, /<dt>Preferred sex<\/dt><dd>Female<\/dd>/);
  assert.match(one, /<dd>Two kids and a cat\.<br>Big fenced yard\.<\/dd>/);
  assert.match(one, /subject=Re%3A%20your%20puppy%20application%20to%20AK%20Boston%20Terriers/);

  const m = await (await b.get('/export.json')).json();
  assert.deepEqual(m.messages[0].answers[0], ['Preferred sex', 'Female']);
});

test('answers are checked against the published questions; what was typed comes back', async () => {
  const b = await breeder();
  const qs = b.questions();
  const bad = await b.apply(Object.fromEntries([['name', 'Megan'], ['email', 'megan@example.com'], answer(qs, 'Color', 'Purple'), answer(qs, 'Tell us about your home', 'Kept')]));
  assert.equal(bad.status, 400);
  const html = await bad.text();
  assert.match(html, /Please choose an answer from the list for &quot;Color&quot;/);
  assert.match(html, />Kept<\/textarea>/);
  assert.equal(b.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM inquiries').get().n, 0);

  // A required question, added in the manage app, published.
  await b.post('/lists/questions/new', { type: 'yes_no', label: 'Do you have a fenced yard?', required: '1' });
  await b.post('/publish');
  const w = await b.page('/waitlist');
  assert.match(w, /Do you have a fenced yard\?<select[^>]* required><option value="">Choose…<\/option><option>Yes<\/option><option>No<\/option>/);
  const missing = await b.apply({ name: 'Megan', email: 'megan@example.com' });
  assert.match(await missing.text(), /Please answer &quot;Do you have a fenced yard\?&quot;/);
});

test('a litter question offers the planned and current litters, and Any litter', async () => {
  const b = await breeder();
  await b.post('/lists/questions/new', { type: 'litter', label: 'Which litter?' });
  await b.post('/publish');
  const w = await b.page('/waitlist');
  assert.match(w, /<option>The Gem litter<\/option><option>Ziva × Boone\*<\/option><option>Peaches × Boone\*<\/option><option>Pearl\*<\/option><option selected>Any litter<\/option>/);
  const q = b.questions().find((x) => x.type === 'litter');
  assert.equal((await b.apply({ name: 'Megan', email: 'megan@example.com', [`q.${q.id}`]: 'Pearl*' })).status, 200);
  assert.equal((await b.apply({ name: 'Megan', email: 'megan@example.com', [`q.${q.id}`]: 'Some old litter' })).status, 400);
});

test('editing questions: a choice needs two options; the change list names them', async () => {
  const b = await breeder();
  const res = await b.post('/lists/questions/new', { type: 'choice', label: 'Coat', options: 'Short' });
  assert.equal(res.status, 200);
  assert.match(await res.text(), /Not saved: question\.options: a choice needs at least two options/);
  assert.equal((await b.post('/lists/questions/new', { type: 'text', label: 'Where did you hear about us?', options: 'stray' })).status, 303);
  const row = b.env.DB.raw.prepare("SELECT options FROM form_fields WHERE label LIKE 'Where%'").get();
  assert.equal(row.options, null, 'only a choice keeps options');
  assert.match(await (await b.get('/publish')).text(), /Application form: Where did you hear about us\? added/);
  const list = await (await b.get('/lists/questions')).text();
  assert.match(list, /always asks for the family's name and email/);
  assert.match(list, /Where did you hear about us\?<\/b><span>Short answer · optional/);
  assert.match(await (await b.get('/pages/waitlist')).text(), /Edit the application questions on this page/);
  assert.match(await (await b.get('')).text(), /Waitlist and application/);
});

test('with no questions the form asks about the family', async () => {
  const b = await breeder({ ...AK_SAMPLE, questions: [] });
  const w = await b.page('/waitlist');
  assert.match(w, /About your family and the puppy you hope for/);
  assert.match((await (await b.apply({ name: 'Ann', email: 'ann@example.com' })).text()), /Please fill in a little about your family/);
  assert.equal((await b.apply({ name: 'Ann', email: 'ann@example.com', message: 'We are a family of four.' })).status, 200);
  assert.deepEqual(JSON.parse(b.env.DB.raw.prepare('SELECT answers FROM inquiries').get().answers), [['About your family and the puppy you hope for', 'We are a family of four.']]);
});

test('closed: the message replaces the form, and applications are refused', async () => {
  const b = await breeder();
  assert.equal((await b.post('/pages/waitlist', { enabled: '1', closed: '1', closed_message: 'Our 2027 list is full.' })).status, 303);
  assert.match(await (await b.get('/publish')).text(), /Waitlist page: wording edited/);
  await b.post('/publish');
  const w = await b.page('/waitlist');
  assert.match(w, /Our waitlist is closed for now/);
  assert.match(w, /Our 2027 list is full\./);
  assert.doesNotMatch(w, /id="apply"/);
  const res = await b.apply({ name: 'Megan', email: 'megan@example.com' });
  assert.equal(res.status, 400);
  assert.equal(b.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM inquiries').get().n, 0);
});

test('with the waitlist page off, applications are refused', async () => {
  const b = await breeder();
  await b.post('/pages/waitlist', {});
  await b.post('/publish');
  assert.equal((await b.apply({ name: 'Megan', email: 'megan@example.com' })).status, 404);
});

test('questions go out in the content document and come back in; closing a site deletes them', async () => {
  const b = await breeder();
  const doc = await exportContent(b.env, b.site.id);
  assert.equal(doc.questions.length, 5);
  assert.deepEqual(doc.questions[0], { type: 'choice', label: 'Preferred sex', required: false, options: ['Either', 'Female', 'Male'] });
  const other = await addSite(b.env, 'copy');
  await importContent(b.env, other.id, { questions: doc.questions });
  assert.deepEqual((await exportContent(b.env, other.id)).questions, doc.questions);
  await assert.rejects(importContent(b.env, other.id, { questions: [{ type: 'choice', label: 'One', options: ['Only'] }] }), /at least two options/);
  await assert.rejects(importContent(b.env, other.id, { questions: [{ type: 'signature', label: 'Sign' }] }), /one of/);

  const { closeSite } = await import('../src/sites.js');
  await closeSite(b.env, b.site.id, 'akbostons');
  assert.equal(b.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM form_fields WHERE site_id = ?').get(b.site.id).n, 0);
});

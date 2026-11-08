// Headings show only as typed: emptied, nothing shows; never set, the site's own
// words (model.js CLR, HOME_WORDS, blocks.js PAGE_HEADS), and the forms show them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';

const { buildSnapshot } = await import('../src/publish.js');
const { renderPage } = await import('../src/render/index.js');
const { importContent } = await import('../src/content/io.js');
const { AK_SAMPLE } = await import('../src/content/akSample.js');
const { getPage, getBlock, getAddedBlock } = await import('../src/content/records.js');
const { loadBuild } = await import('../src/content/rules.js');

const M = 'manage.kennelport.com';

async function setup({ sample = true } = {}) {
  const env = await makeEnv();
  const site = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  if (sample) await importContent(env, site.id, structuredClone(AK_SAMPLE));
  const login = await call(env, M, '/ops/login', { method: 'POST', body: new URLSearchParams({ token: 'ops-token' }) });
  const cookie = login.headers.getSetCookie().map((c) => c.split(';')[0]).find((c) => c.startsWith('kp_admin='));
  const get = async (p) => (await call(env, M, p, { headers: { cookie } })).text();
  const post = (p, body) => call(env, M, p, { method: 'POST', headers: { cookie, origin: `https://${M}` }, body: new URLSearchParams(body) });
  const render = async (p) => renderPage(await buildSnapshot(env, site.id), { path: p, origin: 'https://x', today: '2027-03-10', preview: true }).html;
  return { env, site, get, post, render };
}

test('a page\'s heading: her form shows the page\'s own; emptied, no heading shows; saved unchanged, it stays the page\'s own', async () => {
  const s = await setup({ sample: false });
  let form = await s.get('/s/akbostons/pages/reviews');
  assert.match(form, /name="heading" value="From our families"/);
  assert.match(form, /name="eyebrow" value="Reviews"/);
  assert.match(await s.render('/reviews'), /<span class="eyebrow">Reviews<\/span><h1>From our families<\/h1>/);
  // Saved as shown: nothing stored, still the page's own.
  await s.post('/s/akbostons/pages/reviews', { enabled: '1', eyebrow: 'Reviews', heading: 'From our families', lede: '' });
  const p = await getPage(s.env, s.site.id, 'reviews');
  assert.equal(p.heading, undefined);
  assert.equal(p.eyebrow, undefined);
  // Emptied: no heading.
  await s.post('/s/akbostons/pages/reviews', { enabled: '1', eyebrow: 'Reviews', heading: '', lede: '' });
  assert.equal((await getPage(s.env, s.site.id, 'reviews')).heading, '');
  let html = await s.render('/reviews');
  assert.match(html, /<div class="wrap pagehead">.*<span class="eyebrow">Reviews<\/span><\/div>/);
  assert.doesNotMatch(html, /<h1>/);
  form = await s.get('/s/akbostons/pages/reviews');
  assert.match(form, /name="heading" value=""/);
  // All three emptied: no page head at all.
  await s.post('/s/akbostons/pages/reviews', { enabled: '1', eyebrow: '', heading: '', lede: '' });
  html = await s.render('/reviews');
  assert.doesNotMatch(html, /pagehead/);
});

test('Home\'s blocks: the dogs\' heading, the waitlist band\'s, the headline and the story\'s show only as typed', async () => {
  const s = await setup();
  // Hers, in the box as they show.
  assert.match(await s.get("/s/akbostons/home/dogs"), /name="heading" value="Meet our Bostons"/);
  await s.post('/s/akbostons/home/dogs', { enabled: '1', eyebrow: '', heading: '', lede: '' });
  let html = await s.render('/');
  assert.doesNotMatch(html, /Meet our|Our parent dogs|Hover or tap/);
  await s.post('/s/akbostons/home/waitlist', { enabled: '1', heading: '', line: 'Write to us.', button_label: '' });
  html = await s.render('/');
  assert.match(html, /<section class="cta"><div class="wrap"><div><p>Write to us\.<\/p><\/div>/);
  // The headline: her kennel's name until she types one; emptied, none.
  assert.match(await s.get('/s/akbostons/home/hero'), /name="headline" value="[^"]+"/);
  const hero = await getBlock(s.env, s.site.id, 'hero');
  await s.post('/s/akbostons/home/hero', { enabled: '1', headline: '', script: '', eyebrow: hero.eyebrow ?? '', layout: hero.layout ?? 'tall_two_wide', frame: hero.frame ?? 'mat', ...Object.fromEntries((hero.photos ?? []).map((id, i) => [`photos.${i}`, id])) });
  html = await s.render('/');
  assert.doesNotMatch(html, /<h1>/);
  // The story with words and no heading: no empty heading drawn.
  const story = await getBlock(s.env, s.site.id, 'story');
  await s.post('/s/akbostons/home/story', { enabled: '1', heading: '', script: '', eyebrow: '', text: story.text, photo_id: story.photo_id ?? '' });
  html = await s.render('/');
  assert.doesNotMatch(html, /<h2>\s*<\/h2>/);
  assert.match(html, /story-copy/);
});

test('a block the owner added: her box shows the owner\'s words; emptied, nothing shows', async () => {
  const s = await setup();
  // A text block on Our story, via the owner's page form.
  const page = await s.get('/admin/akbostons/pages/about');
  const form = page.match(/<form method="post"[\s\S]*?<\/form>/)[0];
  const body = new URLSearchParams();
  for (const [, a] of form.matchAll(/<input([^>]*)>/g)) {
    const name = a.match(/name="([^"]+)"/)?.[1];
    const type = a.match(/type="([^"]+)"/)?.[1];
    if (!name || / disabled/.test(a) || ((type === 'checkbox' || type === 'radio') && !/ checked/.test(a))) continue;
    body.append(name, a.match(/value="([^"]*)"/)?.[1] ?? 'on');
  }
  body.set('act', 'add:words');
  await call(s.env, M, '/admin/akbostons/pages/about', { method: 'POST', headers: { cookie: (await call(s.env, M, '/ops/login', { method: 'POST', body: new URLSearchParams({ token: 'ops-token' }) })).headers.getSetCookie().map((c) => c.split(';')[0]).find((c) => c.startsWith('kp_admin=')), origin: `https://${M}` }, body });
  const b = (await loadBuild(s.env, s.site.id)).pages.about.blocks.at(-1);
  assert.equal(b.type, 'words');
  const mine = await s.get('/s/akbostons/pages/about');
  assert.match(mine, /name="heading" value="A few words from us"/);
  assert.match(mine, /Leave it empty and nothing shows\./);
  // Saved unchanged: it keeps following the owner's.
  await s.post(`/s/akbostons/blocks/about/${b.id}`, { enabled: '1', heading: 'A few words from us', line: '', body: 'Hello.' });
  assert.equal((await getAddedBlock(s.env, s.site.id, 'about', b.id)).heading, undefined);
  assert.match(await s.render('/about'), /<h2>A few words from us<\/h2>/);
  // Emptied: no heading, the words still show.
  await s.post(`/s/akbostons/blocks/about/${b.id}`, { enabled: '1', heading: '', line: '', body: 'Hello.' });
  const html = await s.render('/about');
  assert.doesNotMatch(html, /A few words from us/);
  assert.match(html, /<section class="own-words a-center"><div class="wrap"><div class="prose"><p>Hello\.<\/p>/);
});

test('a How it works step needs no heading', async () => {
  const s = await setup();
  const r = await s.post('/s/akbostons/lists/steps/new', { heading: '', body: 'We talk on the phone.' });
  assert.equal(r.status, 303, await r.clone().text());
  const html = await s.render('/how-it-works');
  assert.match(html, /<article class="step"><span class="n">\d+<\/span><p>We talk on the phone\.<\/p>/);
});

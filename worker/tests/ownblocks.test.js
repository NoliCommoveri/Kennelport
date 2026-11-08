// The owner's own blocks and every block's look (docs/Site_Builder_Plan.md, step 4,
// decisions 16 to 18; content/blocks.js, render/pages.js ownBlock, styled).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';

const { buildSnapshot } = await import('../src/publish.js');
const { renderPage } = await import('../src/render/index.js');
const { importContent } = await import('../src/content/io.js');
const { AK_SAMPLE } = await import('../src/content/akSample.js');
const { loadBuild } = await import('../src/content/rules.js');
const { cleanBlock, newBlock } = await import('../src/content/blocks.js');

const M = 'manage.kennelport.com';
const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ');

async function setup() {
  const env = await makeEnv();
  const site = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  await importContent(env, site.id, structuredClone(AK_SAMPLE));
  env.DB.raw.prepare("UPDATE sites SET contact_phone = '(555) 201-3344', contact_email = 'hello@ak.example' WHERE id = ?").run(site.id);
  const pid = 'ph1';
  env.DB.raw.prepare("INSERT INTO photos (id, site_id, r2_key, type, bytes, width, height, created_at) VALUES (?, ?, ?, 'image/webp', 10, 1600, 1000, '2026-11-01T00:00:00Z')").run(pid, site.id, `sites/${site.id}/photos/${pid}.webp`);
  const login = await call(env, M, '/ops/login', { method: 'POST', body: new URLSearchParams({ token: 'ops-token' }) });
  const admin = login.headers.getSetCookie().map((c) => c.split(';')[0]).find((c) => c.startsWith('kp_admin='));
  const get = async (p) => (await call(env, M, p, { headers: { cookie: admin } })).text();
  // The owner's page form as drawn (with ?open=), with changes and a press.
  const post = async (page, changes = {}, { act = null, open = null, status = 303 } = {}) => {
    const path = `/admin/akbostons/pages/${page}`;
    const html = await get(open ? `${path}?open=${open}` : path);
    const form = html.match(/<form method="post"[\s\S]*?<\/form>/)[0];
    const body = new URLSearchParams();
    for (const [, a] of form.matchAll(/<input([^>]*)>/g)) {
      const name = a.match(/name="([^"]+)"/)?.[1];
      if (!name || / disabled/.test(a)) continue;
      const type = a.match(/type="([^"]+)"/)?.[1];
      if ((type === 'checkbox' || type === 'radio') && !/ checked/.test(a)) continue;
      body.append(name, (a.match(/value="([^"]*)"/)?.[1] ?? 'on').replace(/&amp;/g, '&'));
    }
    for (const m of form.matchAll(/<select name="([^"]+)">([\s\S]*?)<\/select>/g)) body.append(m[1], m[2].match(/<option value="([^"]*)" selected/)?.[1] ?? m[2].match(/<option value="([^"]*)"/)[1]);
    for (const [k, v] of Object.entries(changes)) { body.delete(k); if (v !== null) body.append(k, v); }
    if (act) body.set('act', act);
    const r = await call(env, M, path, { method: 'POST', headers: { cookie: admin, origin: `https://${M}` }, body });
    assert.equal(r.status, status, await r.clone().text());
    return r;
  };
  const breeder = (p, body) => call(env, M, `/s/akbostons${p}`, { method: 'POST', headers: { cookie: admin, origin: `https://${M}` }, body: new URLSearchParams(body) });
  const render = async (p) => renderPage(await buildSnapshot(env, site.id), { path: p, origin: 'https://x', today: '2027-03-10', preview: true }).html;
  const blocks = async (page) => (await loadBuild(env, site.id)).pages[page].blocks;
  return { env, site, get, post, breeder, render, blocks };
}

test('a block nobody styled reads as before; a new block\'s settings are clean', () => {
  for (const t of ['banner', 'button', 'divider', 'spacer', 'photo', 'collage', 'beside', 'overlay', 'words', 'factrow', 'columns']) assert.deepEqual(cleanBlock(newBlock(t, `${t}-2`)), cleanBlock(cleanBlock(newBlock(t, `${t}-2`))), t);
  assert.equal(cleanBlock({ id: 'faq', type: 'faq', s: { bg: '', py: '', px: '', text: 'm' } }).s, undefined);
  assert.deepEqual(cleanBlock({ id: 'faq', type: 'faq', s: { bg: 'accent', py: 'l', text: 'huge' } }).s, { bg: 'accent', py: 'l' });
  assert.equal(cleanBlock({ id: 'x', type: 'button', link: { to: 'page', page: 'Bad Page' } }).link, null);
});

test('the owner adds a banner, a button, a divider and a spacer; the site draws them', async () => {
  const s = await setup();
  await s.post('about', {}, { act: 'add:banner' });
  let b = (await s.blocks('about')).at(-1);
  assert.equal(b.type, 'banner');
  await s.post('about', { [`b.${b.id}.w.heading`]: 'Visit us', [`b.${b.id}.w.line`]: 'By appointment.', [`b.${b.id}.w.label`]: 'Say hello', [`b.${b.id}.link.to`]: 'page', [`b.${b.id}.link.page`]: 'contact' }, { open: b.id });
  let html = await s.render('/about');
  assert.match(html, /<section class="own-banner"><div class="wrap"><div><h2>Visit us<\/h2><p>By appointment\.<\/p><\/div><a class="btn" href="\/contact">Say hello<\/a>/);
  // It came with the Accent background: the wrap that swaps the scheme's inks.
  assert.match(html, /<div class="kb-o"><div class="kb bg-accent"><section class="own-banner">/);
  // A button to a phone call, from Kennel details.
  await s.post('about', {}, { act: 'add:button' });
  b = (await s.blocks('about')).at(-1);
  await s.post('about', { [`b.${b.id}.w.label`]: 'Call us', [`b.${b.id}.link.to`]: 'tel', [`b.${b.id}.size`]: 'l', [`b.${b.id}.align`]: 'left' }, { open: b.id });
  html = await s.render('/about');
  assert.match(html, /<div class="own-button wrap a-left"><a class="btn solid sz-l" href="tel:5552013344">Call us<\/a><\/div>/);
  // A bad phone number or an outside link with no address is refused.
  let r = await s.post('about', { [`b.${b.id}.link.to`]: 'tel', [`b.${b.id}.link.value`]: 'call me' }, { open: b.id, status: 200 });
  assert.match(text(await r.text()), /That phone number doesn't look like one\./);
  r = await s.post('about', { [`b.${b.id}.link.to`]: 'url', [`b.${b.id}.link.value`]: '' }, { open: b.id, status: 200 });
  assert.match(text(await r.text()), /needs its address/);
  // Divider and spacer.
  await s.post('about', {}, { act: 'add:divider' });
  await s.post('about', {}, { act: 'add:spacer' });
  html = await s.render('/about');
  assert.match(html, /<div class="own-divider line w-wide wrap" role="presentation"><hr><\/div>/);
  assert.match(html, /<div class="own-spacer h-m" aria-hidden="true"><\/div>/);
  // A button whose page is off hides itself.
  await s.post('about', { [`b.${b.id}.link.to`]: 'page', [`b.${b.id}.link.page`]: 'faq' }, { open: b.id });
  s.env.DB.raw.prepare("INSERT INTO site_pages (site_id, page, enabled, content) VALUES (?, 'faq', 0, '{}') ON CONFLICT (site_id, page) DO UPDATE SET enabled = 0").run(s.site.id);
  assert.doesNotMatch(await s.render('/about'), /own-button/);
});

test('every block\'s look: a colour and space on a built-in block, today\'s with none', async () => {
  const s = await setup();
  const before = await s.render('/about');
  assert.doesNotMatch(before, /kb-o/);
  await s.post('about', { 'b.story.s.bg': 'band', 'b.story.s.py': 'm' }, { open: 'story' });
  const html = await s.render('/about');
  assert.match(html, /<div class="kb-o"><div class="kb bg-band py-m">/);
  await s.post('about', { 'b.story.s.bg': '', 'b.story.s.py': '' }, { open: 'story' });
  assert.equal(await s.render('/about'), before);
});

test('the breeder rewords, switches off, and changes the outside link, phone and photo', async () => {
  const s = await setup();
  await s.post('about', {}, { act: 'add:button' });
  const b = (await s.blocks('about')).at(-1);
  await s.post('about', { [`b.${b.id}.w.label`]: 'Our club', [`b.${b.id}.link.to`]: 'url', [`b.${b.id}.link.value`]: 'https://club.example.org/' }, { open: b.id });
  // Her Pages screen shows it, with the address she can change.
  const pageHtml = text(await s.get('/s/akbostons/pages/about'));
  assert.match(pageHtml, /A button\. .*Button words .*Web address it opens/);
  let r = await s.breeder(`/blocks/about/${b.id}`, { enabled: '1', button_label: 'The club', url: 'https://newclub.example.org/' });
  assert.equal(r.status, 303);
  let html = await s.render('/about');
  assert.match(html, /<a class="btn solid sz-m" href="https:\/\/newclub\.example\.org\/" rel="noopener noreferrer" target="_blank">The club<\/a>/);
  // Switched off.
  await s.breeder(`/blocks/about/${b.id}`, { button_label: 'The club' });
  assert.doesNotMatch(await s.get('/s/akbostons/pages/about'), /<input name="label"/);
  assert.doesNotMatch(await s.render('/about'), /own-button/);
  // A phone she types must look like one.
  await s.post('about', {}, { act: 'add:button' });
  const c = (await s.blocks('about')).at(-1);
  await s.post('about', { [`b.${c.id}.w.label`]: 'Text us', [`b.${c.id}.link.to`]: 'sms' }, { open: c.id });
  r = await s.breeder(`/blocks/about/${c.id}`, { enabled: '1', phone: 'nope' });
  assert.match(r.headers.get('location'), /note=not_saved/);
  await s.breeder(`/blocks/about/${c.id}`, { enabled: '1', phone: '+1 555 777 8899' });
  assert.match(await s.render('/about'), /href="sms:\+15557778899">Text us</);
  // A photo: the owner's, then hers where the owner lets her.
  await s.post('about', {}, { act: 'add:photo' });
  const p = (await s.blocks('about')).at(-1);
  assert.doesNotMatch(await s.render('/about'), /own-photo/);
  await s.post('about', { [`b.${p.id}.photo`]: 'ph1', [`b.${p.id}.w.caption`]: 'Spring' }, { open: p.id });
  html = await s.render('/about');
  assert.match(html, /<figure class="own-photo wide wrap f-middle"><img src="\/_kp\/p\/ph1"[^>]*><figcaption>Spring<\/figcaption><\/figure>/);
  await s.breeder(`/blocks/about/${p.id}`, { enabled: '1', caption: 'Our spring litter' });
  assert.match(await s.render('/about'), /<figcaption>Our spring litter<\/figcaption>/);
  // Text over a photo.
  await s.post('about', {}, { act: 'add:overlay' });
  const o = (await s.blocks('about')).at(-1);
  await s.post('about', { [`b.${o.id}.photo`]: 'ph1', [`b.${o.id}.v`]: 'middle', [`b.${o.id}.h`]: 'center', [`b.${o.id}.shade`]: 'dark', [`b.${o.id}.w.label`]: 'Apply', [`b.${o.id}.link.to`]: 'page', [`b.${o.id}.link.page`]: 'waitlist' }, { open: o.id });
  assert.match(await s.render('/about'), /<section class="own-over v-middle h-center shade-dark f-middle"><img src="\/_kp\/p\/ph1"[^>]*><div class="over"><div class="wrap"><h2>Raised with love<\/h2><a class="btn solid" href="\/waitlist">Apply<\/a>/);
});

test('the owner adds a text block: a heading, a line under it and words; the breeder can reword it', async () => {
  const s = await setup();
  await s.post('about', {}, { act: 'add:words' });
  const b = (await s.blocks('about')).at(-1);
  assert.equal(b.type, 'words');
  assert.equal(b.align, 'center');
  // Its settings: heading, line, words and where it sits.
  const form = await s.get(`/admin/akbostons/pages/about?open=${b.id}`);
  assert.match(form, new RegExp(`name="b\\.${b.id}\\.w\\.heading"`));
  assert.match(form, new RegExp(`name="b\\.${b.id}\\.w\\.line"`));
  assert.match(form, new RegExp(`<textarea name="b\\.${b.id}\\.w\\.body"`));
  await s.post('about', { [`b.${b.id}.w.heading`]: 'Our promise', [`b.${b.id}.w.line`]: 'Raised at home, with care', [`b.${b.id}.w.body`]: 'Every puppy is family.\r\n\r\nWe stay in touch for life.', [`b.${b.id}.align`]: 'left' }, { open: b.id });
  let html = await s.render('/about');
  assert.match(html, /<section class="own-words a-left"><div class="wrap"><div class="head"><h2>Our promise<\/h2><p class="lede">Raised at home, with care<\/p><\/div><div class="prose"><p>Every puppy is family\.<\/p><p>We stay in touch for life\.<\/p><\/div><\/div><\/section>/);
  // The breeder sees it in her Site Manager and rewords it.
  const mine = await (await call(s.env, M, '/s/akbostons/pages/about', { headers: { cookie: (await call(s.env, M, '/ops/login', { method: 'POST', body: new URLSearchParams({ token: 'ops-token' }) })).headers.getSetCookie().map((c) => c.split(';')[0]).find((c) => c.startsWith('kp_admin=')) } })).text();
  assert.match(mine, /<textarea name="body"/);
  await s.breeder(`/blocks/about/${b.id}`, { enabled: '1', heading: 'Our word', body: 'Just one paragraph.' });
  html = await s.render('/about');
  assert.match(html, /<h2>Our word<\/h2><p class="lede">Raised at home, with care<\/p><\/div><div class="prose"><p>Just one paragraph\.<\/p><\/div>/);
  // Switched off, or with no words at all, it draws nothing.
  await s.breeder(`/blocks/about/${b.id}`, {});
  assert.doesNotMatch(await s.render('/about'), /own-words/);
});

test('the owner adds a facts row to any page; the breeder can change its facts', async () => {
  const s = await setup();
  await s.post('about', {}, { act: 'add:factrow' });
  const b = (await s.blocks('about')).at(-1);
  assert.equal(b.type, 'factrow');
  assert.deepEqual(b.items, []);
  // Empty, it hides.
  assert.doesNotMatch(await s.render('/about'), /own-facts/);
  const form = await s.get(`/admin/akbostons/pages/about?open=${b.id}`);
  assert.match(form, new RegExp(`name="b\\.${b.id}\\.items\\.3\\.1"`));
  await s.post('about', { [`b.${b.id}.items.0.0`]: '12', [`b.${b.id}.items.0.1`]: 'Years breeding', [`b.${b.id}.items.2.0`]: 'AKC', [`b.${b.id}.items.2.1`]: 'Registered' }, { open: b.id });
  assert.deepEqual((await s.blocks('about')).at(-1).items, [['12', 'Years breeding'], ['AKC', 'Registered']]);
  let html = await s.render('/about');
  assert.match(html, /<section class="section tight own-facts"><div class="wrap"><div class="facts"><div><b>12<\/b><span>Years breeding<\/span><\/div><div><b>AKC<\/b><span>Registered<\/span><\/div><\/div><\/div><\/section>/);
  // In her Site Manager: four rows, KennelPort's facts as the hints.
  const mine = await s.get('/s/akbostons/pages/about');
  assert.match(mine, /<input name="facts\.0\.0" value="" maxlength="40" aria-label="Fact 1, value" placeholder="12">/);
  assert.match(mine, /name="facts\.3\.1"/);
  // Hers over the owner's; all empty goes back to the owner's.
  await s.breeder(`/blocks/about/${b.id}`, { enabled: '1', 'facts.0.0': '40+', 'facts.0.1': 'Puppies home' });
  html = await s.render('/about');
  assert.match(html, /<div class="facts"><div><b>40\+<\/b><span>Puppies home<\/span><\/div><\/div>/);
  // A long fact, a heading and a sentence, keeps every letter.
  const longLabel = 'From hands-on care and early developmental exercises to new surfaces, sounds, people, and experiences, we introduce age-appropriate challenges designed to encourage confidence and adaptability.';
  await s.breeder(`/blocks/about/${b.id}`, { enabled: '1', 'facts.0.0': 'Intentional Early Development', 'facts.0.1': longLabel });
  assert.ok((await s.render('/about')).includes(`<b>Intentional Early Development</b><span>${longLabel}</span>`));
  await s.breeder(`/blocks/about/${b.id}`, { enabled: '1', 'facts.0.0': '', 'facts.0.1': '' });
  assert.match(await s.render('/about'), /<b>12<\/b><span>Years breeding/);
  // Off, it's gone.
  await s.breeder(`/blocks/about/${b.id}`, {});
  assert.doesNotMatch(await s.render('/about'), /own-facts/);
});

test('the owner adds text in columns: a heading over sections, two or three across; the breeder can reword it', async () => {
  const s = await setup();
  await s.post('about', {}, { act: 'add:columns' });
  const b = (await s.blocks('about')).at(-1);
  assert.equal(b.type, 'columns');
  assert.deepEqual([b.cols, b.across, b.align], [[], '2', 'center']);
  // No sections, it hides.
  assert.doesNotMatch(await s.render('/about'), /own-cols/);
  const long = 'From birth, our littles are closely monitored and handled daily. We begin Early Neurological Stimulation (ENS) during the appropriate developmental window.\n\nTheir earliest days are focused on warmth, cleanliness and nutrition.';
  await s.post('about', { [`b.${b.id}.w.heading`]: 'Our Approach to Raising Puppies', [`b.${b.id}.cols.0.0`]: 'Early Days', [`b.${b.id}.cols.0.1`]: long, [`b.${b.id}.cols.2.0`]: 'Learning Life at Home', [`b.${b.id}.cols.2.1`]: 'Our puppies grow up right in the middle of it.' }, { open: b.id });
  assert.deepEqual((await s.blocks('about')).at(-1).cols, [['Early Days', long], ['Learning Life at Home', 'Our puppies grow up right in the middle of it.']]);
  let html = await s.render('/about');
  assert.match(html, /<section class="own-cols a-center"><div class="wrap"><div class="head"><h2>Our Approach to Raising Puppies<\/h2><\/div><div class="features n-2"><div class="feature"><b>Early Days<\/b><p>From birth, [^<]+<\/p><p>Their earliest days [^<]+<\/p><\/div><div class="feature"><b>Learning Life at Home<\/b><p>Our puppies grow up right in the middle of it\.<\/p><\/div><\/div><\/div><\/section>/);
  await s.post('about', { [`b.${b.id}.across`]: '3', [`b.${b.id}.align`]: 'left' }, { open: b.id });
  assert.match(await s.render('/about'), /<section class="own-cols a-left">.*<div class="features n-3">/s);
  // In her Site Manager: six sections, KennelPort's as the hints; hers over them.
  const mine = await s.get('/s/akbostons/pages/about');
  assert.match(mine, /<input name="cols\.0\.0" value="" maxlength="80" placeholder="Early Days">/);
  assert.match(mine, /<textarea name="cols\.5\.1" rows="4" maxlength="1500"><\/textarea>/);
  await s.breeder(`/blocks/about/${b.id}`, { enabled: '1', heading: 'How we raise them', 'cols.0.0': 'Growing & Exploring', 'cols.0.1': 'One.\n\nTwo.' });
  html = await s.render('/about');
  assert.match(html, /<h2>How we raise them<\/h2><\/div><div class="features n-3"><div class="feature"><b>Growing &amp; Exploring<\/b><p>One\.<\/p><p>Two\.<\/p><\/div><\/div>/);
  await s.breeder(`/blocks/about/${b.id}`, { enabled: '1' });
  assert.match(await s.render('/about'), /<b>Early Days<\/b>/);
  await s.breeder(`/blocks/about/${b.id}`, {});
  assert.doesNotMatch(await s.render('/about'), /own-cols/);
  assert.equal(cleanBlock({ id: 'x', type: 'columns', across: '5' }).across, '2');
});

test('her page screen shows a placed block where it sits, between her own parts; each card saves only its own fields', async () => {
  const s = await setup();
  await s.post('about', {}, { act: 'add:factrow' });
  const b = (await s.blocks('about')).at(-1);
  await s.post('about', { [`b.${b.id}.items.0.0`]: '12', [`b.${b.id}.items.0.1`]: 'Years breeding' }, { open: b.id });
  for (let i = 0; i < 3; i++) await s.post('about', {}, { act: `mv:${b.id}:up` });
  assert.deepEqual((await s.blocks('about')).map((x) => x.id).slice(0, 3), ['head', b.id, 'story']);
  const mine = await s.get('/s/akbostons/pages/about');
  // Heading card, then the facts row, then her story: no separate section, no word of who placed it.
  assert.match(mine, /name="heading"[\s\S]*<\/form>\s*<form method="post" action="\/s\/akbostons\/blocks\/about\/[^"]+"[\s\S]*name="facts\.0\.0"[\s\S]*<\/form>\s*<form method="post" action="\/s\/akbostons\/pages\/about"[^>]*><input type="hidden" name="_part" value="([^"]+)">[\s\S]*name="text"/);
  assert.doesNotMatch(mine, /KennelPort added|Placed with you/);
  // The heading card saves its fields only; her story stays.
  const before = await s.get('/s/akbostons/pages/about');
  const story = before.match(/<textarea[^>]*name="text"[^>]*>([^<]*)</)[1];
  const headPart = before.match(/name="_part" value="([^"]*heading[^"]*)"/)[1];
  assert.ok(!headPart.split(',').includes('text'));
  await s.breeder('/pages/about', { _part: headPart, enabled: '1', heading: 'Where it began' });
  const after = await s.get('/s/akbostons/pages/about');
  assert.match(after, /name="heading" value="Where it began"/);
  assert.equal(after.match(/<textarea[^>]*name="text"[^>]*>([^<]*)</)[1], story);
  assert.match(await s.render('/about'), /Where it began/);
});

test('a photo block can take the Home banner\'s frames; none to start, and never full width', async () => {
  const s = await setup();
  await s.post('about', {}, { act: 'add:photo' });
  const p = (await s.blocks('about')).at(-1);
  assert.equal(p.frame, 'none');
  await s.post('about', { [`b.${p.id}.photo`]: 'ph1' }, { open: p.id });
  assert.match(await s.render('/about'), /<figure class="own-photo wide wrap f-middle"><img /);
  assert.match(await s.get(`/admin/akbostons/pages/about?open=${p.id}`), new RegExp(`name="b\\.${p.id}\\.frame" value="sprig"`));
  await s.post('about', { [`b.${p.id}.frame`]: 'double' }, { open: p.id });
  assert.match(await s.render('/about'), /<figure class="own-photo wide wrap f-middle frame-double"><div class="box"><img src="\/_kp\/p\/ph1"[^>]*><\/div><\/figure>/);
  await s.post('about', { [`b.${p.id}.frame`]: 'sprig' }, { open: p.id });
  assert.match(await s.render('/about'), /frame-sprig"><div class="box"><img [^>]*><div class="vine" aria-hidden="true">/);
  await s.post('about', { [`b.${p.id}.shape`]: 'full' }, { open: p.id });
  assert.match(await s.render('/about'), /<figure class="own-photo full f-middle"><img /);
  assert.equal(cleanBlock({ id: 'x', type: 'photo', frame: 'gold' }).frame, 'none');
});

test('a text block and a facts row take every block\'s look: background, space and text size', async () => {
  const s = await setup();
  for (const t of ['words', 'factrow']) {
    await s.post('about', {}, { act: `add:${t}` });
    const b = (await s.blocks('about')).at(-1);
    const form = await s.get(`/admin/akbostons/pages/about?open=${b.id}`);
    for (const f of ['bg', 'py', 'px', 'text']) assert.match(form, new RegExp(`<select name="b\\.${b.id}\\.s\\.${f}">`), `${t} ${f}`);
    const fill = t === 'words' ? { [`b.${b.id}.w.heading`]: 'Our promise' } : { [`b.${b.id}.items.0.0`]: '12', [`b.${b.id}.items.0.1`]: 'Years' };
    await s.post('about', { ...fill, [`b.${b.id}.s.bg`]: 'foot', [`b.${b.id}.s.py`]: 'l', [`b.${b.id}.s.text`]: 'l' }, { open: b.id });
    assert.deepEqual((await s.blocks('about')).at(-1).s, { bg: 'foot', py: 'l', text: 'l' });
    const cls = t === 'words' ? 'own-words a-center' : 'section tight own-facts';
    assert.match(await s.render('/about'), new RegExp(`<div class="kb-o"><div class="kb bg-foot py-l t-l"><section class="${cls}">`));
  }
});

test('the owner adds a collage: Home\'s layouts and frames, a photo for each box; the breeder can change its photos', async () => {
  const s = await setup();
  for (const id of ['ph2', 'ph3']) s.env.DB.raw.prepare("INSERT INTO photos (id, site_id, r2_key, type, bytes, width, height, created_at) VALUES (?, ?, ?, 'image/webp', 10, 1600, 1000, '2026-11-02T00:00:00Z')").run(id, s.site.id, `sites/${s.site.id}/photos/${id}.webp`);
  await s.post('about', {}, { act: 'add:collage' });
  const c = (await s.blocks('about')).at(-1);
  assert.deepEqual({ layout: c.layout, frame: c.frame, photos: c.photos, mayChange: c.mayChange }, { layout: 'tall_two_wide', frame: 'mat', photos: [], mayChange: true });
  // No photos: nothing drawn.
  assert.doesNotMatch(await s.render('/about'), /own-collage/);
  // Its settings: the layout pictures, the frames, and a box per box of the layout (the rest hidden).
  const form = await s.get(`/admin/akbostons/pages/about?open=${c.id}`);
  assert.match(form, new RegExp(`<fieldset class="layouts" data-layouts><legend>Photo layout</legend><label class="layout-opt"><input type="radio" name="b\\.${c.id}\\.layout" value="one_wide"`));
  assert.match(form, new RegExp(`name="b\\.${c.id}\\.frame" value="sprig"`));
  assert.match(form, /<div class="box" data-box="2">/);
  assert.match(form, /<div class="box" data-box="3" hidden>/);
  assert.match(form, new RegExp(`name="b\\.${c.id}\\.photos\\.0" value="ph1"`));
  // Three photos in its three boxes, the second kept at the top.
  await s.post('about', { [`b.${c.id}.photos.0`]: 'ph1', [`b.${c.id}.photos.1`]: 'ph2', [`b.${c.id}.photos.2`]: 'ph3', [`b.${c.id}.focus.1`]: 'top' }, { open: c.id });
  let html = await s.render('/about');
  assert.match(html, /<section class="own-collage"><div class="wrap"><div class="hero-photos tall_two_wide frame-mat"><div class="box tall f-middle"><img src="\/_kp\/p\/ph1"[^>]*><\/div><div class="box wide f-top"><img src="\/_kp\/p\/ph2"[^>]*><\/div><div class="box wide f-middle"><img src="\/_kp\/p\/ph3"[^>]*><\/div><\/div><\/div><\/section>/);
  // An empty box is skipped: two photos use a layout for two.
  await s.post('about', { [`b.${c.id}.photos.1`]: '', [`b.${c.id}.frame`]: 'sprig' }, { open: c.id });
  assert.deepEqual((await s.blocks('about')).at(-1).photos, ['ph1', 'ph3']);
  html = await s.render('/about');
  assert.match(html, /<div class="hero-photos two_tall frame-sprig"><div class="box tall f-middle"><img src="\/_kp\/p\/ph1"[^>]*><div class="vine" aria-hidden="true">/);
  // Its line in the list.
  assert.match(text(await s.get('/admin/akbostons/pages/about')), /Collage Two tall, side by side · 2 photos · a leafy vine/);
  // The breeder picks her own, in the owner's layout; the boxes past it hidden.
  await s.post('about', { [`b.${c.id}.layout`]: 'four_square', [`b.${c.id}.photos.0`]: 'ph1', [`b.${c.id}.photos.1`]: 'ph2' }, { open: c.id });
  const mine = await s.get('/s/akbostons/pages/about');
  assert.match(text(mine), /A collage of photos\. A photo for each box, in order\./);
  assert.match(mine, /<div class="box" data-box="3">/);
  await s.breeder(`/blocks/about/${c.id}`, { enabled: '1', 'photos.0': 'ph3', 'focus.0': 'bottom', 'photos.2': 'ph2' });
  html = await s.render('/about');
  assert.match(html, /<div class="hero-photos two_tall frame-sprig"><div class="box tall f-bottom"><img src="\/_kp\/p\/ph3"[^>]*>.*?<\/div><div class="box tall f-middle"><img src="\/_kp\/p\/ph2"/);
  // Not hers to change: the owner's photos, and no boxes on her card.
  await s.post('about', { [`b.${c.id}.mayChange`]: null }, { open: c.id });
  assert.match(await s.render('/about'), /<div class="hero-photos two_tall frame-sprig"><div class="box tall f-middle"><img src="\/_kp\/p\/ph1"/);
  assert.doesNotMatch(await s.get('/s/akbostons/pages/about'), /name="photos\.0"/);
  // Switched off by her.
  await s.breeder(`/blocks/about/${c.id}`, {});
  assert.doesNotMatch(await s.render('/about'), /own-collage/);
  // Cleaned: an unknown layout or frame falls back; at most four photos.
  const x = cleanBlock({ id: 'x', type: 'collage', layout: 'nine', frame: 'gold', photos: ['a', 'b', 'c', 'd', 'e'], focus: ['top', 'sideways'] });
  assert.deepEqual([x.layout, x.frame, x.photos, x.focus], ['tall_two_wide', 'mat', ['a', 'b', 'c', 'd'], ['top', 'middle', 'middle', 'middle']]);
});

test('the owner adds a photo beside words: the photo left or right, framed or not; the breeder rewords it and changes the photo', async () => {
  const s = await setup();
  await s.post('about', {}, { act: 'add:beside' });
  const b = (await s.blocks('about')).at(-1);
  assert.deepEqual([b.side, b.frame, b.photo, b.link], ['left', 'none', null, null]);
  // Words alone: the story's grid with the words taking the width.
  assert.match(await s.render('/about'), /<section class="section own-beside"><div class="wrap story no-photo f-middle"><div class="story-copy"><h2>A little about us<\/h2><\/div><\/div><\/section>/);
  const form = await s.get(`/admin/akbostons/pages/about?open=${b.id}`);
  assert.match(form, new RegExp(`name="b\\.${b.id}\\.side" value="right"`));
  await s.post('about', { [`b.${b.id}.photo`]: 'ph1', [`b.${b.id}.side`]: 'right', [`b.${b.id}.frame`]: 'mat', [`b.${b.id}.w.body`]: 'We raise them at home.\r\n\r\nWith the kids.', [`b.${b.id}.w.label`]: 'Meet the dogs', [`b.${b.id}.link.to`]: 'page', [`b.${b.id}.link.page`]: 'dogs' }, { open: b.id });
  let html = await s.render('/about');
  assert.match(html, /<section class="section own-beside"><div class="wrap story pic-right f-middle"><div class="story-pic frame-mat"><div class="box"><img src="\/_kp\/p\/ph1"[^>]*><\/div><\/div><div class="story-copy"><h2>A little about us<\/h2><p>We raise them at home\.<\/p><p>With the kids\.<\/p><div><a class="btn solid" href="\/dogs">Meet the dogs<\/a><\/div><\/div><\/div><\/section>/);
  assert.match(text(await s.get('/admin/akbostons/pages/about')), /Photo beside words Photo on the right · A little about us · a soft mat/);
  // Left, unframed.
  await s.post('about', { [`b.${b.id}.side`]: 'left', [`b.${b.id}.frame`]: 'none' }, { open: b.id });
  assert.match(await s.render('/about'), /<div class="wrap story f-middle"><img src="\/_kp\/p\/ph1"[^>]*><div class="story-copy">/);
  // Hers: the heading, the words and the button's words.
  assert.match(text(await s.get('/s/akbostons/pages/about')), /A photo beside words\./);
  await s.breeder(`/blocks/about/${b.id}`, { enabled: '1', heading: 'Home life', body: 'Just us.', button_label: 'Our dogs' });
  html = await s.render('/about');
  assert.match(html, /<h2>Home life<\/h2><p>Just us\.<\/p><div><a class="btn solid" href="\/dogs">Our dogs<\/a>/);
  assert.equal(cleanBlock({ id: 'x', type: 'beside', side: 'up' }).side, 'left');
});

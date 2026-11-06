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
  for (const t of ['banner', 'button', 'divider', 'spacer', 'photo', 'overlay']) assert.deepEqual(cleanBlock(newBlock(t, `${t}-2`)), cleanBlock(cleanBlock(newBlock(t, `${t}-2`))), t);
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

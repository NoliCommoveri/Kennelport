// The menu as the owner's setting (docs/plans/site-builder.md, step 3.4;
// content/blocks.js menuOf, render/parts.js menuGroups, manage/builder.js Menu).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';

const { buildSnapshot } = await import('../src/publish.js');
const { renderPage } = await import('../src/render/index.js');
const { menuOf, defaultMenu, withMenu, addPage, withoutPage, MenuError } = await import('../src/content/blocks.js');
const { menuGroups } = await import('../src/render/parts.js');
const { importContent } = await import('../src/content/io.js');
const { AK_SAMPLE } = await import('../src/content/akSample.js');
const { loadBuild, saveBuild } = await import('../src/content/rules.js');

const M = 'manage.kennelport.com';
const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ');
const nav = (html) => text(html.match(/<nav class="main"[\s\S]*?<\/nav>/)[0]).trim();
const foot = (html) => text(html.match(/<footer class="site">[\s\S]*?<div class="fine">/)[0]).trim();

async function setup() {
  const env = await makeEnv();
  const site = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  await importContent(env, site.id, structuredClone(AK_SAMPLE));
  const login = await call(env, M, '/ops/login', { method: 'POST', body: new URLSearchParams({ token: 'ops-token' }) });
  const admin = login.headers.getSetCookie().map((c) => c.split(';')[0]).find((c) => c.startsWith('kp_admin='));
  const path = '/admin/akbostons/menu';
  const get = async (p = path) => (await call(env, M, p, { headers: { cookie: admin } })).text();
  // The form as the screen draws it, with changes, and a press.
  const post = async (changes = {}, { act = null, open = null } = {}) => {
    const html = await get(open ? `${path}?open=${open}` : path);
    const form = html.match(/<form method="post" id="build"[\s\S]*?<\/form>/)[0];
    const body = new URLSearchParams();
    for (const [, a] of form.matchAll(/<input([^>]*)>/g)) {
      const name = a.match(/name="([^"]+)"/)?.[1];
      if (!name) continue;
      const type = a.match(/type="([^"]+)"/)?.[1];
      if (type === 'checkbox' && !/ checked/.test(a)) continue;
      body.append(name, (a.match(/value="([^"]*)"/)?.[1] ?? 'on').replace(/&amp;/g, '&'));
    }
    for (const m of form.matchAll(/<select name="([^"]+)">([\s\S]*?)<\/select>/g)) body.append(m[1], m[2].match(/<option value="([^"]*)" selected/)?.[1] ?? m[2].match(/<option value="([^"]*)"/)[1]);
    for (const [k, v] of Object.entries(changes)) { body.delete(k); if (v !== null) body.append(k, v); }
    if (act) body.set('act', act);
    return call(env, M, path, { method: 'POST', headers: { cookie: admin, origin: `https://${M}` }, body });
  };
  const render = async (p = '/', today = '2027-03-10') => renderPage(await buildSnapshot(env, site.id), { path: p, origin: 'https://x', today, preview: true }).html;
  return { env, site, get, post, render, build: () => loadBuild(env, site.id) };
}

test('today\'s menu is the default: the screen lists it, and saving it unchanged stores nothing', async () => {
  const s = await setup();
  const before = await s.render();
  const screen = text(await s.get());
  assert.match(screen, /Menu .*About us .*Our story .*Kennel residents .*All our dogs .*Girls .*Puppies .*Available .*Upcoming litters .*How it works .*Waitlist/);
  assert.match(screen, /only while no other link to it here shows/);
  const r = await s.post();
  assert.equal(r.status, 303);
  assert.equal((await s.build()).menu, undefined);
  assert.equal(await s.render(), before);
  // Today's menu, from code to settings: the same groups and links.
  assert.deepEqual(menuOf({}), defaultMenu([]));
  assert.equal(withMenu({}, defaultMenu([])).menu, undefined);
});

test('the owner renames, moves, adds and removes; the site\'s menu and footer follow', async () => {
  const s = await setup();
  // Rename a group; it's stored, and the menu and footer read it.
  let r = await s.post({ 'g.1.label': 'Our dogs' });
  assert.equal(r.headers.get('location'), '/admin/akbostons/menu?saved=1');
  assert.equal((await s.build()).menu[1].label, 'Our dogs');
  let html = await s.render();
  assert.match(nav(html), /^About us .* Our dogs All our dogs Girls Boys Puppies/);
  // The footer follows the menu now: a column per group, pages only.
  assert.match(foot(html), /About us Our story Reviews Contact Our dogs All our dogs Puppies .*How it works .*Waitlist Waitlist/);
  assert.doesNotMatch(foot(html), /Girls/);
  // Move Contact (About us, third) to the end of How it works.
  r = await s.post({ 'i.0.2.to': '3' }, { open: '0.2' });
  assert.equal(r.status, 303);
  let m = (await s.build()).menu;
  assert.deepEqual(m[0].items.map((x) => x.page), ['about', 'reviews']);
  assert.equal(m[3].items.at(-1).page, 'contact');
  // Up and down.
  await s.post({}, { act: 'imv:3:6:up' });
  m = (await s.build()).menu;
  assert.equal(m[3].items.at(-2).page, 'contact');
  await s.post({}, { act: 'gmv:3:up' });
  assert.equal((await s.build()).menu[2].label, 'How it works');
  // An outside link and a place; a link with no address is refused, nothing saved.
  r = await s.post({ 'add.0': 'link', 'addtext.0': 'Our club', 'addurl.0': '' }, { act: 'add:0' });
  assert.equal(r.status, 200);
  assert.match(text(await r.text()), /The outside link "Our club" needs a web address/);
  assert.equal((await s.build()).menu[0].items.length, 2);
  await s.post({ 'add.0': 'link', 'addtext.0': 'Our club', 'addurl.0': 'https://club.example.org/' }, { act: 'add:0' });
  await s.post({ 'add.0': 'place:dogs#girls' }, { act: 'add:0' });
  html = await s.render();
  assert.match(html, /<a href="https:\/\/club\.example\.org\/" rel="noopener noreferrer" target="_blank">Our club<\/a>/);
  assert.match(nav(html), /^About us Our story Reviews Our club Girls/);
  // A place's own words.
  await s.post({ 'i.0.3.text': 'Our girls' }, { open: '0.3' });
  assert.match(nav(await s.render()), /^About us Our story Reviews Our club Our girls/);
  // Remove an item, a new group, a button and the footer switch.
  await s.post({}, { act: 'idel:0:3' });
  await s.post({}, { act: 'newgroup' });
  m = (await s.build()).menu;
  assert.equal(m.at(-1).label, 'New group');
  await s.post({ 'g.5.label': 'Visit', 'add.5': 'page:contact' }, { act: 'add:5' });
  // Contact is in How it works and Visit now: allowed.
  await s.post({ 'g.5.button': 'on', 'g.4.footer': null });
  html = await s.render();
  assert.match(html, /<a class="btn solid" href="\/contact">Contact<\/a>/);
  assert.doesNotMatch(foot(html), /Waitlist Waitlist/);
  // Remove a group: its pages leave the menu, and the screen lists them.
  await s.post({}, { act: 'gdel:4' });
  assert.match(text(await s.get()), /Not in the menu Waitlist · Using your status page/);
  assert.doesNotMatch(nav(await s.render()), /Waitlist/);
  // Back to today's menu.
  await s.post({}, { act: 'default' });
  assert.equal((await s.build()).menu, undefined);
  assert.match(nav(await s.render()), /Kennel residents/);
});

test('a page of hers goes where the menu has room for it, and leaves with it', async () => {
  const s = await setup();
  await s.post({ 'g.0.label': 'About' });
  let b = await s.build();
  // Into a group of the changed menu, at its end.
  let out = addPage(b, { name: 'Our dams', group: 'residents', start: 'dams' });
  assert.deepEqual(out.build.menu[1].items.at(-1), { type: 'page', page: out.id });
  // A button group takes no page.
  assert.equal(addPage(b, { name: 'Help', group: 'waitlist' }).build.menu[4].items.length, 2);
  await saveBuild(s.env, s.site.id, out.build);
  assert.match(nav(await s.render()), /Kennel residents All our dogs Girls Boys Our dams/);
  // Moved by its own Group setting; then gone with the page.
  const { withPageInfo } = await import('../src/content/blocks.js');
  b = withPageInfo(out.build, out.id, { name: 'Our dams', path: '/our-dams', group: 'about' });
  assert.equal(b.menu[0].items.at(-1).page, out.id);
  assert.ok(!b.menu[1].items.some((x) => x.page === out.id));
  b = withoutPage(b, out.id);
  assert.ok(!b.menu.some((g) => g.items.some((x) => x.page === out.id)));
});

test('today\'s Puppies link shows only while Available Now, Available Soon and Upcoming litters hide', async () => {
  const s = await setup();
  const snap = await buildSnapshot(s.env, s.site.id);
  const ctx = { today: '2027-03-10', origin: '', path: '/' };
  const puppies = (sn) => menuGroups(sn, ctx).find((g) => g.key === 'puppies').links.map((l) => l.text);
  assert.deepEqual(puppies(snap).slice(0, 2), ['Available Now', 'Upcoming litters']);
  assert.ok(!puppies(snap).includes('Puppies'));
  const none = { ...snap, litters: snap.litters.map((l) => ({ ...l, stage: 'past' })) };
  assert.equal(puppies(none)[0], 'Puppies');
  // The same with the owner's menu, any group.
  const menu = defaultMenu([]);
  const moved = { ...none, layout: { ...none.layout, menu: [{ ...menu[2], id: 'pups', label: 'Pups' }] } };
  assert.deepEqual(menuGroups(moved, ctx).map((g) => g.label), ['Pups']);
  assert.equal(menuGroups(moved, ctx)[0].links[0].text, 'Puppies');
  assert.throws(() => withMenu({}, [{ id: 'a', label: '', items: [] }]), MenuError);
});

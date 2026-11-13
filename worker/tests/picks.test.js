// The breeder's own choice of records on a data block, and the Featured block
// (docs/plans/kennelos-contract.md B3, B5, step 3; content/picks.js, content/featured.js,
// manage/screens/picks.js, render/pages/featured.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';

const { buildSnapshot } = await import('../src/publish.js');
const { renderPage } = await import('../src/render/index.js');
const { homeBlocks, withHome, newBlock, cleanBlock } = await import('../src/content/blocks.js');
const { importContent } = await import('../src/content/io.js');
const { AK_SAMPLE } = await import('../src/content/akSample.js');
const { loadBuild, saveBuild } = await import('../src/content/rules.js');
const { inviteToSite } = await import('../src/auth.js');
const { cleanPicks, applyPicks, picksFromForm } = await import('../src/content/picks.js');
const { featuredNow, periodsSince, cleanSchedule } = await import('../src/content/featured.js');
const { blockRows } = await import('../src/render/parts.js');

const M = 'manage.kennelport.com';
const TODAY = '2026-11-20';
const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/\s+/g, ' ');
const rows = (...ids) => ids.map((id) => ({ id, name: id }));

test('the schedule turns over by day, week and month, from its start', () => {
  assert.equal(periodsSince('2026-11-01', '2026-11-01', 'day'), 0);
  assert.equal(periodsSince('2026-11-01', '2026-11-03', 'day'), 2);
  assert.equal(periodsSince('2026-11-02', '2026-11-08', 'week'), 0);
  assert.equal(periodsSince('2026-11-02', '2026-11-09', 'week'), 1);
  assert.equal(periodsSince('2026-11-15', '2026-12-14', 'month'), 0);
  assert.equal(periodsSince('2026-11-15', '2026-12-15', 'month'), 1);
  // No start: weeks turn on a Monday.
  assert.equal(periodsSince('', '2026-01-11', 'week'), 0);
  assert.equal(periodsSince('', '2026-01-12', 'week'), 1);
  assert.equal(periodsSince('', '2026-03-01', 'month'), 2);
  const r = rows('a', 'b', 'c');
  const s = { every: 'day', order: 'hers', start: '2026-11-01', count: 1 };
  const on = (day, x = s, fixed = []) => featuredNow(r, x, fixed, 'seed', day).map((y) => y.id);
  assert.deepEqual([on('2026-11-01'), on('2026-11-02'), on('2026-11-03'), on('2026-11-04')], [['a'], ['b'], ['c'], ['a']]);
  // Before the start it still shows one, in turn backwards.
  assert.deepEqual(on('2026-10-31'), ['c']);
  // Two at a time move on two.
  assert.deepEqual([on('2026-11-01', { ...s, count: 2 }), on('2026-11-02', { ...s, count: 2 })], [['a', 'b'], ['c', 'a']]);
  // A fixed range wins over the turn, on its days only.
  const fixed = [{ id: 'c', from: '2026-11-01', to: '2026-11-02' }];
  assert.deepEqual([on('2026-11-01', s, fixed), on('2026-11-02', s, fixed), on('2026-11-03', s, fixed)], [['c'], ['c'], ['c']]);
  assert.deepEqual(on('2026-11-04', s, fixed), ['a']);
  // Shuffled: the same every time for a seed, every record in turn.
  const sh = { ...s, order: 'shuffle' };
  const week = ['2026-11-01', '2026-11-02', '2026-11-03'].map((d) => featuredNow(r, sh, [], 'site/home/f', d)[0].id);
  assert.deepEqual(week, ['2026-11-01', '2026-11-02', '2026-11-03'].map((d) => featuredNow([...r].reverse(), sh, [], 'site/home/f', d)[0].id));
  assert.deepEqual([...week].sort(), ['a', 'b', 'c']);
  assert.deepEqual(featuredNow([], s, [], 'x', TODAY), []);
  assert.deepEqual(cleanSchedule({ every: 'year', order: 'x', start: 'soon', count: 9 }), { every: 'week', order: 'hers', start: '', count: 1 });
});

test('picks: Leave out on any block; a Featured block shows her picks in her order', () => {
  const dogs = cleanBlock(newBlock('dogs', 'mine'));
  const feat = cleanBlock(newBlock('featured_dog', 'feat'));
  const all = rows('a', 'b', 'c', 'd');
  const matching = all.slice(0, 3);
  assert.deepEqual(applyPicks(dogs, matching, all, { omit: ['b', 'gone'] }).map((x) => x.id), ['a', 'c']);
  assert.deepEqual(applyPicks(dogs, matching, all, null).map((x) => x.id), ['a', 'b', 'c']);
  // Featured: until she picks, what matches; then hers, whatever matches, gone ones quietly out.
  assert.deepEqual(applyPicks(feat, matching, all, { pick: null }).map((x) => x.id), ['a', 'b', 'c']);
  assert.deepEqual(applyPicks(feat, matching, all, { pick: ['d', 'gone', 'a'] }).map((x) => x.id), ['d', 'a']);
  // From her form: the ticked ones of those shown; on a block, the rest left out.
  assert.deepEqual(picksFromForm(dogs, matching, { ticked: ['a', 'c', 'zz'], order: [] }), { omit: ['b'], pick: null, fixed: [] });
  assert.deepEqual(picksFromForm(feat, all, { ticked: ['c', 'a'], order: ['c', 'b', 'a', 'd'], fixed: [{ id: 'a', from: '2026-12-02', to: '2026-12-01' }, { id: 'b', from: '2026-12-01', to: '2026-12-02' }] }),
    { omit: [], pick: ['c', 'a'], fixed: [{ id: 'a', from: '2026-12-01', to: '2026-12-02' }] });
  assert.deepEqual(cleanPicks({ omit: ['ok', 'not ok!', 'ok'], pick: 'x', fixed: [{ id: 'a', from: 'x', to: '2026-01-01' }] }), { omit: ['ok'], pick: null, fixed: [] });
});

async function signedIn(t) {
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse(`${TODAY}T15:00:00Z`) });
  const env = await makeEnv();
  const s = await addSite(env, 'akpicks');
  await importContent(env, s.id, structuredClone(AK_SAMPLE));
  await inviteToSite(env, s.id, 'b@example.com', 'owner', { manageUrl: 'x', siteUrl: 'y' });
  const headers = { origin: `https://${M}` };
  await call(env, M, '/signin', { method: 'POST', headers, body: new URLSearchParams({ email: 'b@example.com' }) });
  const code = env.DB.raw.prepare("SELECT subject FROM dev_outbox WHERE kind = 'code' ORDER BY id DESC").get().subject.match(/\d{6}/)[0];
  const cookie = (await call(env, M, '/signin/verify', { method: 'POST', headers, body: new URLSearchParams({ email: 'b@example.com', code }) })).headers.get('set-cookie').split(';')[0];
  const get = async (p) => (await call(env, M, `/s/akpicks${p}`, { headers: { cookie } })).text();
  const post = async (p, body) => {
    const r = await call(env, M, `/s/akpicks${p}`, { method: 'POST', headers: { cookie, origin: `https://${M}` }, body: new URLSearchParams(body) });
    assert.equal(r.status, 303, await r.clone().text());
    return r.headers.get('location');
  };
  const home = async () => renderPage(await buildSnapshot(env, s.id), { path: '/', origin: 'https://x', today: TODAY, preview: true }).html;
  const id = (slug) => env.DB.raw.prepare('SELECT id FROM dogs WHERE site_id = ? AND slug = ?').get(s.id, slug).id;
  return { env, s, get, post, home, id };
}

test('her Home Dog cards: each dog ticked; one unticked stays off; a new one comes in ticked', async (t) => {
  const { env, s, get, post, home, id } = await signedIn(t);
  // Her Home Dogs screen links to it.
  assert.match(await get('/home/dogs'), /href="\/s\/akpicks\/blocks\/home\/dogs\/records"[^>]*>Choose which show</);
  const html = await get('/blocks/home/dogs/records');
  for (const n of ['Willow', 'Ziva', 'Peaches', 'Boone*']) assert.match(html, new RegExp(`value="${id(n.toLowerCase().replace('*', ''))}" checked`));
  assert.match(text(html), /Meet our Bostons: which show/);
  assert.match(text(await home()), /Peaches/);
  const keep = ['willow', 'ziva', 'pearl', 'boone'].map(id);
  assert.equal(await post('/blocks/home/dogs/records', [...keep.map((v) => ['on', v])]), '/s/akpicks/blocks/home/dogs/records?note=picked');
  const row = env.DB.raw.prepare('SELECT picks FROM block_picks WHERE site_id = ?').get(s.id);
  assert.deepEqual(JSON.parse(row.picks).omit, [id('peaches')]);
  const after = await get('/blocks/home/dogs/records?note=picked');
  assert.match(after, new RegExp(`value="${id('peaches')}">`));
  assert.match(text(after), /Saved\. Your website shows your choice after you publish\./);
  // Home's Dog cards no longer show her; her own page still does.
  const h = await home();
  const dogsSection = h.slice(h.indexOf('Meet our dogs'));
  assert.doesNotMatch(dogsSection.slice(0, dogsSection.indexOf('</section>')), /Peaches/);
  assert.match(await get('/home/dogs'), /1 left out by you/);
  // A new breeding dog comes in ticked.
  await importContent(env, s.id, { ...structuredClone(AK_SAMPLE), dogs: [...AK_SAMPLE.dogs, { slug: 'nova', call_name: 'Nova', sex: 'female', role: 'Dam' }] });
  assert.match(await get('/blocks/home/dogs/records'), new RegExp(`value="${id('nova')}" checked`));
  // Ticking them all again stores nothing.
  const all = env.DB.raw.prepare("SELECT id FROM dogs WHERE site_id = ? AND outside = 0").all(s.id).map((r) => ['on', r.id]);
  await post('/blocks/home/dogs/records', all);
  assert.equal(env.DB.raw.prepare('SELECT COUNT(*) AS n FROM block_picks WHERE site_id = ?').get(s.id).n, 0);
  // A block that isn't on the page, or isn't a data block, has no such screen.
  assert.equal((await call(env, M, '/s/akpicks/blocks/home/nope/records', { headers: {} })).status >= 300, true);
  assert.doesNotMatch(await get('/blocks/home/hero/records'), /which show/);
});

test('a Featured dog block: shown by the owner\'s conditions until she picks; her order, moves, set dates and back again', async (t) => {
  const { env, s, get, post, home, id } = await signedIn(t);
  const build = await loadBuild(env, s.id);
  const feat = { ...newBlock('featured_dog', 'feat'), sched: { every: 'day', order: 'hers', start: TODAY, count: 1 } };
  await saveBuild(env, s.id, withHome(build, [...homeBlocks(build), feat]));
  // Before she picks: the first of the owner's conditions (breeding, at home), in order.
  let h = text(await home());
  assert.match(h, /Featured Meet one of our dogs Willow AK's Wild at Heart/);
  assert.match(h, /Meet Willow/);
  // Her Home lists the block with its button.
  assert.match(await get('/home'), /href="\/s\/akpicks\/blocks\/home\/feat\/records"[^>]*>Choose which are featured</);
  let html = await get('/blocks/home/feat/records');
  assert.match(text(html), /You haven't picked any yet/);
  assert.match(text(html), /Showing today: Willow/);
  // Every dog is offered; before she picks, the owner's conditions' ones are ticked.
  assert.match(html, new RegExp(`value="${id('peaches')}" checked`));
  const order = ['boone', 'ziva', 'willow', 'peaches', 'pearl'].map(id);
  await post('/blocks/home/feat/records', [...['boone', 'ziva'].map((x) => ['on', id(x)]), ...order.map((x) => ['order', x])]);
  h = text(await home());
  assert.match(h, /Meet Boone\*/);
  assert.doesNotMatch(h, /Meet Willow/);
  // Tomorrow it's Ziva's turn; the day after, Boone's again.
  const snap = await buildSnapshot(env, s.id);
  const on = (day) => text(renderPage(snap, { path: '/', origin: 'https://x', today: day, preview: true }).html);
  assert.match(on('2026-11-21'), /Meet Ziva/);
  assert.match(on('2026-11-22'), /Meet Boone\*/);
  // Moving Ziva up puts her first, keeping the ticks.
  html = await get('/blocks/home/feat/records');
  assert.match(html, new RegExp(`name="move" value="${id('ziva')}:up"`));
  const ticked = [...html.matchAll(/name="on" value="([^"]+)" checked/g)].map((m) => m[1]);
  const posted = [...html.matchAll(/name="order" value="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(await post('/blocks/home/feat/records', [...ticked.map((x) => ['on', x]), ...posted.map((x) => ['order', x]), ['move', `${id('ziva')}:up`]]), `/s/akpicks/blocks/home/feat/records#r-${id('ziva')}`);
  assert.match(text(await home()), /Meet Ziva/);
  // A set date wins: Boone today.
  await post('/blocks/home/feat/records', [...['ziva', 'boone'].map((x) => ['on', id(x)]), ...[id('ziva'), id('boone')].map((x) => ['order', x]), ['fixed.0.id', id('boone')], ['fixed.0.from', TODAY], ['fixed.0.to', TODAY]]);
  assert.match(text(await home()), /Meet Boone\*/);
  assert.match(await get('/blocks/home/feat/records'), new RegExp(`<option value="${id('boone')}" selected>`));
  // Back to the website's choice.
  await post('/blocks/home/feat/records', [['reset', '1']]);
  assert.match(text(await home()), /Meet Willow/);
  // Two at once, one under the other (with no photos here, the words take the width).
  const b2 = await loadBuild(env, s.id);
  await saveBuild(env, s.id, withHome(b2, homeBlocks(b2).map((b) => (b.id === 'feat' ? { ...b, sched: { ...b.sched, count: 2 } } : b))));
  h = await home();
  const featured = h.slice(h.indexOf('own-featured'), h.indexOf('</section>', h.indexOf('own-featured')));
  assert.equal(featured.match(/class="wrap story no-photo/g).length, 2);
  assert.match(text(h), /Meet Willow.*Meet Ziva/);
});

test('a Featured pup block: available pups until she picks; snapshot names only shown records', async (t) => {
  const { env, s, home } = await signedIn(t);
  const build = await loadBuild(env, s.id);
  await saveBuild(env, s.id, withHome(build, [...homeBlocks(build), { ...newBlock('featured_pup', 'fp'), sched: { every: 'week', order: 'hers', start: TODAY, count: 3 } }]));
  const h = text(await home());
  assert.match(h, /Puppy spotlight/);
  for (const n of ['Opal', 'Diamond', 'Contessa']) assert.match(h, new RegExp(`Meet ${n}`));
  assert.doesNotMatch(h, /Meet Onyx/);
  // A pick of a record that isn't shown (hidden) isn't carried in the snapshot.
  const hidden = env.DB.raw.prepare("SELECT id FROM puppies WHERE site_id = ? AND slug = 'onyx'").get(s.id).id;
  const opal = env.DB.raw.prepare("SELECT id FROM puppies WHERE site_id = ? AND slug = 'opal'").get(s.id).id;
  env.DB.raw.prepare("UPDATE puppies SET status = 'hidden' WHERE id = ?").run(hidden);
  env.DB.raw.prepare('INSERT INTO block_picks (site_id, page, block, picks, updated_at) VALUES (?, ?, ?, ?, ?)').run(s.id, 'home', 'fp', JSON.stringify({ pick: [hidden, opal] }), 'x');
  const snap = await buildSnapshot(env, s.id);
  assert.deepEqual(snap.picks.home.fp.pick, [opal]);
  const b = snap.layout.home.find((x) => x.id === 'fp');
  assert.deepEqual(blockRows(snap, b, TODAY, 'home').map((x) => x.name), ['Opal']);
});

// Videos and posts (plan 3.3, phase 5): a pasted link read into a provider and an
// item, never HTML; a preview stored on the site; the player only on a tap.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';
import { jpeg } from './helpers/images.js';

const { importContent, exportContent } = await import('../src/content/io.js');
const { AK_SAMPLE } = await import('../src/content/akSample.js');
const { inviteToSite } = await import('../src/auth.js');
const { forgetSnapshots } = await import('../src/publish.js');
const { readEmbedLink, embedView } = await import('../src/embeds.js');

const M = 'manage.kennelport.com';
const SITE = 'akbostons.kennelport.com';

test('links are read into a provider and an item; anything else is refused', () => {
  const r = (u) => readEmbedLink(u);
  assert.deepEqual(r('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10'), { provider: 'youtube', item: 'v:dQw4w9WgXcQ' });
  assert.deepEqual(r('https://youtu.be/dQw4w9WgXcQ'), { provider: 'youtube', item: 'v:dQw4w9WgXcQ' });
  assert.deepEqual(r('https://youtube.com/shorts/abcdefghijk'), { provider: 'youtube', item: 'short:abcdefghijk' });
  assert.deepEqual(r('https://www.youtube.com/playlist?list=PLabcdefghij'), { provider: 'youtube', item: 'list:PLabcdefghij' });
  assert.deepEqual(r('https://vimeo.com/123456789'), { provider: 'vimeo', item: '123456789' });
  assert.deepEqual(r('https://www.tiktok.com/@akbostons/video/7300000000000000000'), { provider: 'tiktok', item: 'akbostons/7300000000000000000' });
  assert.deepEqual(r('https://www.instagram.com/reel/Cxyz12345/'), { provider: 'instagram', item: 'reel:Cxyz12345' });
  assert.deepEqual(r('https://www.facebook.com/AKBostonTerriers'), { provider: 'facebook', item: 'page:AKBostonTerriers' });
  assert.deepEqual(r('https://www.facebook.com/AKBostonTerriers/videos/123456789012'), { provider: 'facebook', item: 'video:/AKBostonTerriers/videos/123456789012' });
  assert.deepEqual(r('https://www.facebook.com/AKBostonTerriers/posts/pfbid02abc'), { provider: 'facebook', item: 'post:/AKBostonTerriers/posts/pfbid02abc' });
  for (const bad of ['not a link', 'javascript:alert(1)', 'https://evil.example/watch?v=dQw4w9WgXcQ', 'https://www.youtube.com/', '<iframe src="https://www.youtube.com/embed/x">']) {
    assert.throws(() => r(bad), /isn't one KennelPort can show|Paste the link/, bad);
  }
  const v = embedView({ provider: 'youtube', item: 'v:dQw4w9WgXcQ', title: 'Hi' });
  assert.equal(v.src, 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0');
  assert.equal(v.link, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert.match(embedView({ provider: 'facebook', item: 'page:AKBostonTerriers' }).src, /^https:\/\/www\.facebook\.com\/plugins\/page\.php\?href=https%3A%2F%2Fwww\.facebook\.com%2FAKBostonTerriers&tabs=timeline/);
});

async function breeder() {
  forgetSnapshots();
  const fetched = [];
  const env = await makeEnv({
    EMBED_FETCH: async (url) => {
      fetched.push(url);
      if (url.startsWith('https://i.ytimg.com/')) return new Response(jpeg(480, 360));
      if (url.startsWith('https://vimeo.com/api/oembed.json')) return Response.json({ thumbnail_url: 'https://i.vimeocdn.com/video/1.jpg' });
      if (url.startsWith('https://i.vimeocdn.com/')) return new Response(jpeg(640, 360));
      return new Response('no', { status: 404 });
    },
  });
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
  await post('/publish');
  const litter = env.DB.raw.prepare("SELECT id FROM litters WHERE slug = 'gem-2026'").get().id;
  const add = (place, link, title = '', back = '/s/akbostons/home') => post('/embeds/add', { place, link, title, back });
  return { env, site, get, post, add, litter, fetched, page: async (p) => (await call(env, SITE, p)).text() };
}

test('added on Home: a stored preview, the player only on a tap, after publishing', async () => {
  const b = await breeder();
  assert.match(await (await b.get('/home')).text(), /<h2>Videos and posts<\/h2>/);
  const res = await b.add('home', 'https://youtu.be/dQw4w9WgXcQ', 'Opal at 6 weeks');
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), '/s/akbostons/home?note=embedded#videos');
  assert.deepEqual(b.fetched, ['https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg']);
  const e = b.env.DB.raw.prepare('SELECT * FROM embeds').get();
  assert.equal(e.provider, 'youtube');
  assert.ok(e.preview_photo_id, 'the preview was stored as a photo on the site');
  assert.match(await (await b.get('/home')).text(), /<b>Opal at 6 weeks<\/b><span class="muted small"> · YouTube<\/span>/);
  assert.doesNotMatch(await b.page('/'), /data-embed/, 'not before publishing');
  assert.match(await (await b.get('/publish')).text(), /Videos and posts: Opal at 6 weeks added/);
  await b.post('/publish');

  const html = await b.page('/');
  assert.match(html, /<a class="em-start" href="https:\/\/www\.youtube\.com\/watch\?v=dQw4w9WgXcQ" rel="noopener noreferrer" target="_blank" data-embed="https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?autoplay=1&amp;rel=0" aria-label="Play: Opal at 6 weeks \(YouTube\)"><img src="\/_kp\/p\//);
  assert.doesNotMatch(html, /<iframe/, 'nothing framed until a tap');
  assert.equal((await call(b.env, SITE, `/_kp/p/${e.preview_photo_id}`)).status, 200);
  const csp = (await call(b.env, SITE, '/')).headers.get('content-security-policy');
  assert.match(csp, /frame-src https:\/\/www\.youtube-nocookie\.com https:\/\/player\.vimeo\.com https:\/\/www\.tiktok\.com https:\/\/www\.instagram\.com https:\/\/www\.facebook\.com;/);
  assert.equal((csp.match(/frame-src/g) ?? []).length, 1);
});

test('on a litter, a dog and an album; a refused link says why; removing the litter removes its videos', async () => {
  const b = await breeder();
  const back = `/s/akbostons/litters/${b.litter}`;
  const bad = await b.add(`litter:${b.litter}`, 'https://evil.example/x', '', back);
  assert.match(decodeURIComponent(bad.headers.get('location')), /embed_error=That link isn't one KennelPort can show/);
  const shown = await (await b.get(bad.headers.get('location').replace('/s/akbostons', '').replace('#videos', ''))).text();
  assert.match(shown, /<p class="error" role="alert">Not added: That link isn(&#39;|')t one KennelPort can show/);
  await b.add(`litter:${b.litter}`, 'https://vimeo.com/123456789', 'Gem litter at play', back);
  assert.equal((await b.add(`litter:${b.litter}`, 'https://vimeo.com/123456789', '', back)).headers.get('location').includes('already'), true);
  await b.add(`litter:${b.litter}`, 'https://www.facebook.com/AKBostonTerriers', '', back);
  assert.match(await (await b.get(`/litters/${b.litter}`)).text(), /Gem litter at play/);
  await b.post('/publish');
  const lit = await b.page('/litters/gem-2026');
  assert.match(lit, /data-embed="https:\/\/player\.vimeo\.com\/video\/123456789\?autoplay=1&amp;dnt=1"/);
  assert.match(lit, /<figure class="em em-post"><a class="em-start" href="https:\/\/www\.facebook\.com\/AKBostonTerriers"[^>]*><span class="em-ph">Facebook<\/span>/, 'no preview: the provider\'s name');
  assert.equal((await b.add('dog:not-a-dog', 'https://vimeo.com/123456789')).headers.get('location').includes('embed_error'), true);

  await b.post(`/litters/${b.litter}/remove`);
  assert.equal(b.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM embeds').get().n, 0);
});

test('order and removal; they go out in the content document and come back in', async () => {
  const b = await breeder();
  await b.add('about', 'https://www.youtube.com/watch?v=aaaaaaaaaaa', 'First', '/s/akbostons/pages/about');
  await b.add('about', 'https://www.youtube.com/watch?v=bbbbbbbbbbb', 'Second', '/s/akbostons/pages/about');
  await b.add(`litter:${b.litter}`, 'https://www.instagram.com/p/Cabc123/', 'Pups');
  const [first, second] = b.env.DB.raw.prepare("SELECT id FROM embeds WHERE place = 'about' ORDER BY sort").all();
  await b.post(`/embeds/${second.id}/up`, { back: '/s/akbostons/pages/about' });
  assert.deepEqual(b.env.DB.raw.prepare("SELECT title FROM embeds WHERE place = 'about' ORDER BY sort").all().map((x) => x.title), ['Second', 'First']);
  const doc = await exportContent(b.env, b.site.id);
  assert.deepEqual(doc.embeds.map((e) => [e.place, e.provider, e.item, e.title]), [
    ['about', 'youtube', 'v:bbbbbbbbbbb', 'Second'], ['about', 'youtube', 'v:aaaaaaaaaaa', 'First'], ['litter:gem-2026', 'instagram', 'p:Cabc123', 'Pups'],
  ]);
  await importContent(b.env, b.site.id, { embeds: doc.embeds });
  assert.equal(b.env.DB.raw.prepare("SELECT place FROM embeds WHERE provider = 'instagram'").get().place, `litter:${b.litter}`);
  await assert.rejects(importContent(b.env, b.site.id, { embeds: [{ place: 'home', provider: 'myspace', item: 'x' }] }), /one of youtube/);
  await b.post(`/embeds/${first.id}/remove`, { back: '/s/akbostons/pages/about' });
  assert.equal(b.env.DB.raw.prepare("SELECT COUNT(*) AS n FROM embeds WHERE title = 'First'").get().n, 1, 'import gave new ids; the old one is gone already');
});

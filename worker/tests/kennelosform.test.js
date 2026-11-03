// The waitlist page with a KennelOS waitlist (plan 3.8): the website feed read and
// kept five minutes, KennelOS's application form drawn in the site's style while
// she takes applications online, the answers sealed in the browser to her form
// key (and nothing sent to KennelPort), and KennelOS's own pages while the feed
// can't say.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import { makeEnv, call, addSite } from './helpers/env.js';

const { importContent } = await import('../src/content/io.js');
const { AK_SAMPLE } = await import('../src/content/akSample.js');
const { inviteToSite } = await import('../src/auth.js');
const { forgetSnapshots } = await import('../src/publish.js');
const { readFeed, parseFeedAddress, FEED_FRESH_MS, FEED_RETRY_MS } = await import('../src/feed.js');

const M = 'manage.kennelport.com';
const SITE = 'akbostons.kennelport.com';
const KOS = 'https://apply.kennelos.example';
const KENNEL = 'kos1_11111111-2222-4333-8444-555555555555';
const FEED_URL = `${KOS}/f/site/${KENNEL}`;

const FORM = {
  key_id: 'fk_1', public_key: 'BPUBLICKEY',
  questions: [
    { id: 'name', key: 'name', label: 'Name', type: 'short_text', required: true },
    { id: 'email', key: 'email', label: 'Email', type: 'email', required: true },
    { id: 'pref_sex', key: 'pref_sex', label: 'Do you prefer a male or a female?', type: 'preference' },
    { id: 'ready_timing', key: 'ready_timing', label: 'When are you ready?', type: 'preference', required: true },
    { id: 'household', label: 'Tell us about your household', type: 'long_text', help: 'Kids, other pets' },
    { id: 'yard', label: 'Fenced yard?', type: 'yes_no', required: true },
    { id: 'public_notice', key: 'public_notice', label: 'About our public waitlist', type: 'notice', help: 'Names show as first name and last initial.' },
  ],
  faq: [{ id: 'f1', question: 'Is there a fee?', answer: '$300, credited to your puppy.' }],
  breeds: ['Boston Terrier'], matching_keys: ['pref_sex'], matching_notice: 'We offer pups that match what you ask for.', color_matching: false,
  choices: { pref_sex: [['any', 'Either'], ['male', 'Male'], ['female', 'Female']], ready_timing: [['asap', 'ASAP'], ['1_month', '1 month']], pref_purposes: [] },
  turnstile_site_key: '0xKOS',
};
const feed = (form = FORM) => ({
  kennel: { name: 'AK Boston Terriers', intro: '', apply_open: Boolean(form) }, as_of: '2026-11-01', rows: [], available: [], upcoming: [],
  links: { list: `/list/${KENNEL}`, signin: `/list/${KENNEL}#signin`, apply: form ? `/apply/${KENNEL}` : null },
  ...(form ? { form } : {}),
});

// A KennelOS that answers the feed as told, counting reads.
function kennelos(answer) {
  const k = { reads: 0, answer };
  k.fetch = async (url) => {
    k.reads++;
    assert.equal(url, FEED_URL);
    const a = typeof k.answer === 'function' ? k.answer() : k.answer;
    if (a === 'down') throw new Error('unreachable');
    if (a === 'not_shared') return Response.json({ error: 'not_shared' }, { status: 404 });
    return Response.json(a);
  };
  return k;
}

async function breeder(k) {
  forgetSnapshots();
  const env = await makeEnv({ KENNELOS_ORIGIN: KOS, KENNELOS_FETCH: k.fetch });
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
  return { env, site, get, post, waitlist: () => call(env, SITE, '/waitlist') };
}

test('the feed address: the feed, list or apply address, or the bare id; only from KennelOS', () => {
  const env = { KENNELOS_ORIGIN: KOS };
  assert.equal(parseFeedAddress(env, ` ${FEED_URL} `), KENNEL);
  assert.equal(parseFeedAddress(env, `${KOS}/list/${KENNEL}#signin`), KENNEL);
  assert.equal(parseFeedAddress(env, `${KOS}/apply/${KENNEL}`), KENNEL);
  assert.equal(parseFeedAddress(env, KENNEL), KENNEL);
  assert.throws(() => parseFeedAddress(env, `https://evil.example/f/site/${KENNEL}`), /isn't a KennelOS address/);
  assert.throws(() => parseFeedAddress(env, `${KOS}/f/site/someone`), /doesn't name a kennel/);
  assert.throws(() => parseFeedAddress(env, 'hello'), /Paste the website feed address/);
});

test('with a feed carrying her form, the waitlist page draws KennelOS\'s form, and only it', async () => {
  const k = kennelos(feed());
  const b = await breeder(k);
  const saved = await b.post('/pages/waitlist/kennelos', { feed: FEED_URL });
  assert.equal(saved.status, 303);
  assert.match(await (await b.get('/pages/waitlist')).text(), /Connected\. You take applications online in KennelOS/);

  const res = await b.waitlist();
  const html = await res.text();
  assert.match(html, /data-kos-form data-origin="https:\/\/apply\.kennelos\.example" data-public-id="kos1_11111111-2222-4333-8444-555555555555" data-key-id="fk_1" data-public-key="BPUBLICKEY"/);
  assert.match(html, /data-q="name" data-type="short_text" data-key="name" data-required data-label="Name"/);
  assert.match(html, /type="email" autocomplete="email"/);
  assert.match(html, /<b>Matching you with a pup<\/b><p class="small">We offer pups that match/, 'the matching notice before the first matching question');
  assert.match(html, /name="pref_sex" value="any"> Either/);
  assert.match(html, /name="ready_timing" value="asap" required> ASAP/);
  assert.match(html, /Tell us about your household<\/span><span class="q-hint">Kids, other pets<\/span><textarea/);
  assert.match(html, /name="k-yard" value="yes"> Yes/);
  assert.match(html, /data-notice required> I understand/);
  assert.match(html, /<summary>Is there a fee\?<\/summary>/);
  assert.match(html, /class="cf-turnstile" data-sitekey="0xKOS"/);
  assert.match(html, /data-kos-fallback>This form needs a browser with JavaScript on\. Apply on our <a href="https:\/\/apply\.kennelos\.example\/apply\/kos1_/);
  assert.ok(html.indexOf('id="the-list"') < html.indexOf('id="apply"'), 'the list, then the form');
  assert.doesNotMatch(html, /action="\/waitlist#apply"/, 'no KennelPort application form');
  assert.match(html, /<h3>Your application is in<\/h3>[\s\S]*?href="https:\/\/apply\.kennelos\.example\/list\/kos1_[^"]+#signin"[^>]*>See my details/, 'afterwards: KennelOS\'s own sign-in');
  assert.doesNotMatch(html, /\/s\//, 'no status-page link is ever built here');
  assert.doesNotMatch(html, /Preferred sex/, 'not KennelPort\'s own questions');

  const csp = res.headers.get('content-security-policy');
  assert.match(csp, /connect-src 'self'[^;]* https:\/\/apply\.kennelos\.example/);
  assert.match(csp, /connect-src[^;]*challenges\.cloudflare\.com/);
  assert.match(csp, /script-src 'self' https:\/\/challenges\.cloudflare\.com/);
  assert.match(csp, /form-action 'self'/);
  assert.doesNotMatch((await call(b.env, SITE, '/contact')).headers.get('content-security-policy'), /kennelos/, 'only the waitlist page');

  // Nothing can be sent to KennelPort instead.
  const sent = await call(b.env, SITE, '/waitlist', { method: 'POST', headers: { origin: `https://${SITE}` }, body: new URLSearchParams({ name: 'Megan', email: 'm@example.com' }) });
  assert.equal(sent.status, 400);
  assert.equal(b.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM inquiries').get().n, 0);
});

test('the feed is read once per five minutes; unreachable, the last copy is used and retried after a minute', async () => {
  const k = kennelos(feed());
  const b = await breeder(k);
  await b.post('/pages/waitlist/kennelos', { feed: FEED_URL });
  k.reads = 0;
  const t0 = Date.parse('2026-11-02T12:00:00Z');
  const r1 = await readFeed(b.env, b.site.id, KENNEL, { now: t0 });
  assert.equal(r1.state, 'ok');
  await readFeed(b.env, b.site.id, KENNEL, { now: t0 + FEED_FRESH_MS - 1 });
  assert.equal(k.reads, 1);

  k.answer = 'down';
  const r2 = await readFeed(b.env, b.site.id, KENNEL, { now: t0 + FEED_FRESH_MS });
  assert.equal(k.reads, 2);
  assert.equal(r2.state, 'ok');
  assert.equal(r2.stale, true);
  assert.equal(r2.fetched_at, new Date(t0).toISOString(), 'the copy keeps its own date');
  await readFeed(b.env, b.site.id, KENNEL, { now: t0 + FEED_FRESH_MS + FEED_RETRY_MS - 1 });
  assert.equal(k.reads, 2, 'not asked again within the minute');
  k.answer = feed(null);
  const r3 = await readFeed(b.env, b.site.id, KENNEL, { now: t0 + FEED_FRESH_MS + FEED_RETRY_MS });
  assert.equal(k.reads, 3);
  assert.equal(r3.stale, undefined);
  assert.equal(r3.feed.form, undefined);
});

test('online applications off in KennelOS: the site\'s own form, with the KennelOS sign-in link', async () => {
  const b = await breeder(kennelos(feed(null)));
  await b.post('/pages/waitlist/kennelos', { feed: FEED_URL });
  assert.match(await (await b.get('/pages/waitlist')).text(), /You aren't taking applications online in KennelOS/);
  const res = await b.waitlist();
  const html = await res.text();
  assert.match(html, /action="\/waitlist#apply"/);
  assert.match(html, /Preferred sex/);
  assert.doesNotMatch(res.headers.get('content-security-policy'), /kennelos/);
});

test('feed off or KennelOS unreachable: links to her KennelOS pages; the manage screen says why', async () => {
  const k = kennelos('not_shared');
  const b = await breeder(k);
  await b.post('/pages/waitlist/kennelos', { feed: FEED_URL });
  assert.match(await (await b.get('/pages/waitlist')).text(), /isn't sharing your list with your website/);
  const html = await (await b.waitlist()).text();
  assert.match(html, /href="https:\/\/apply\.kennelos\.example\/apply\/kos1_[^"]+" rel="noopener" target="_blank">Apply to join the waitlist/);
  assert.doesNotMatch(html, /action="\/waitlist#apply"/);

  const down = await breeder(kennelos('down'));
  await down.post('/pages/waitlist/kennelos', { feed: FEED_URL });
  assert.match(await (await down.get('/pages/waitlist')).text(), /couldn't be reached/);
  assert.match(await (await down.waitlist()).text(), /Our waitlist and application form are on KennelOS/);
});

test('a wrong address is refused with what was typed; removing it forgets the copy', async () => {
  const b = await breeder(kennelos(feed()));
  const bad = await b.post('/pages/waitlist/kennelos', { feed: 'https://evil.example/f/site/x' });
  assert.equal(bad.status, 200);
  const html = await bad.text();
  assert.match(html, /Not saved: That isn(&#39;|')t a KennelOS address/);
  assert.match(html, /value="https:\/\/evil\.example\/f\/site\/x"/);
  await b.post('/pages/waitlist/kennelos', { feed: FEED_URL });
  await b.waitlist();
  assert.equal(b.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM feed_cache').get().n, 1);
  await b.post('/pages/waitlist/kennelos', { remove: '1' });
  assert.equal(b.env.DB.raw.prepare('SELECT COUNT(*) AS n FROM feed_cache').get().n, 0);
  assert.equal(b.env.DB.raw.prepare('SELECT kennelos_public_id AS id FROM sites').get().id, null);
  assert.match(await (await b.waitlist()).text(), /action="\/waitlist#apply"/, 'back to the site\'s own form');
});

// The sealing in the template's script: what it seals opens the way KennelOS's
// shared/data/waitlistCrypto.js opens it, with her private key, and not without.
async function sealFn() {
  const src = await readFile(new URL('../public/_kp/t/ak/site.js', import.meta.url), 'utf8');
  const m = src.match(/\/\/ kennelos-seal:start[\s\S]*?\n(\s*async function sealToKennelos[\s\S]*?)\n\s*\/\/ kennelos-seal:end/);
  assert.ok(m, 'sealToKennelos in site.js');
  return new Function('crypto', 'btoa', 'atob', `${m[1]}; return sealToKennelos;`)(webcrypto, btoa, atob);
}

async function openSealed(privateKey, keyId, sealed) {
  const subtle = webcrypto.subtle;
  const fromB64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const env = JSON.parse(atob(sealed));
  assert.equal(env.v, 1);
  assert.equal(env.kid, keyId);
  const epk = fromB64(env.epk);
  const theirs = await subtle.importKey('raw', epk, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = await subtle.deriveBits({ name: 'ECDH', public: theirs }, privateKey, 256);
  const hkdf = await subtle.importKey('raw', shared, 'HKDF', false, ['deriveKey']);
  const aes = await subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: epk, info: new TextEncoder().encode('kennelos-waitlist/seal/v1') }, hkdf, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const plain = await subtle.decrypt({ name: 'AES-GCM', iv: fromB64(env.iv), additionalData: new TextEncoder().encode(`kennelos-waitlist/v1/${env.kid}`) }, aes, fromB64(env.ct));
  return JSON.parse(new TextDecoder().decode(plain));
}

test('an application sealed in the browser opens only with her form key', async () => {
  const seal = await sealFn();
  const pair = await webcrypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const pub = btoa(String.fromCharCode(...new Uint8Array(await webcrypto.subtle.exportKey('raw', pair.publicKey))));
  const value = { answers: { name: 'Ann Lee', household: 'Two kids.\nA cat.', yard: 'yes' }, prefs: { pref_sex: 'female', ready_timing: 'asap' }, private_request: true, sent_at: '2026-11-02T12:00:00Z' };
  const sealed = await seal(pub, 'fk_1', value);
  assert.ok(!sealed.includes('Ann') && !atob(sealed).includes('Ann'), 'nothing readable in it');
  assert.deepEqual(await openSealed(pair.privateKey, 'fk_1', sealed), value);
  const other = await webcrypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  await assert.rejects(openSealed(other.privateKey, 'fk_1', sealed));
  // The key id is bound in: the same text under another id doesn't open.
  const env = JSON.parse(atob(sealed));
  await assert.rejects(openSealed(pair.privateKey, 'fk_2', btoa(JSON.stringify({ ...env, kid: 'fk_2' }))));
});

// The list itself, as KennelOS's /list page draws it.
const LIST = {
  ...feed(null),
  kennel: { name: 'AK Boston Terriers', intro: 'Puppies go out in list order.\nThanks for waiting!', apply_open: false },
  rows: [
    { position: 1, name: 'Currently deciding', deciding: true, pref_sex: 'female', added: '2026-01-05' },
    { position: 2, name: 'Megan R.', pref_sex: 'any', wants_more: ['Black & white'], added: '2026-02-10' },
    { position: 4, name: 'A****** K', pref_sex: 'male', added: '2026-03-01', skipped: true, skipped_until: '2027-01-15' },
    { position: 5, name: '<script>x</script>', pref_sex: 'female', added: '2026-04-01' },
  ],
  available: [{ id: 'l1', label: 'Willow 2026', nickname: 'The Gem litter', breed: 'Boston Terrier', whelp_date: '2026-10-28', ready_date: '2026-12-23', picks_open: true, pups_available: 2, pups_female: 1, pups_male: 1,
    pups: [{ call_name: 'Opal', sex: 'female' }, { call_name: 'Onyx', sex: 'male', photos_url: 'https://photos.example/onyx' }],
    dam: { name: 'Willow', titles: ['CGC'], tests: [{ name: 'Patellas (OFA)', result: 'Normal' }] }, sire: { name: 'Boone', titles: [] } }],
  upcoming: [{ id: 'u1', kind: 'planned_heat', label: 'Pearl heat', breed: 'Boston Terrier', dam: { name: 'Pearl', titles: [] }, sire: { name: '', titles: [] }, expected_month: '2027-03' },
    { id: 'u2', kind: 'planned_pairing', label: 'Peaches × Boone', dam: { name: 'Peaches', titles: [] }, sire: { name: 'Boone', titles: [] } }],
};

test('the KennelOS list is drawn on the waitlist page in the site\'s style', async () => {
  const b = await breeder(kennelos(LIST));
  await b.post('/pages/waitlist/kennelos', { feed: FEED_URL });
  const html = await (await b.waitlist()).text();
  assert.match(html, /<h2>AK Boston Terriers Waitlist<\/h2><p class="muted small">Updated November 1, 2026<\/p>/);
  assert.match(html, /<p class="intro">Puppies go out in list order\.\nThanks for waiting!<\/p>/);
  assert.match(html, /<td class="num">#1<\/td><td><em>Currently deciding<\/em><\/td>/);
  assert.match(html, /<td>Either · Black &amp; white<\/td><td class="tip"><button type="button" class="added-tip" aria-label="Added February 10, 2026"/);
  assert.match(html, /<em>Skipped until January 15, 2027<\/em>/);
  assert.match(html, /&lt;script&gt;x&lt;\/script&gt;/, 'names escaped');
  assert.doesNotMatch(html, /<script>x<\/script>/);
  assert.match(html, /some applicant names may not be displayed above/, 'the gap note, since #3 is left out');
  assert.match(html, /data-wl-search hidden/, 'search shows only with the script');
  // Only the families: the site has its own puppy pages, and no sign-in box here.
  for (const gone of ['Available Puppies', 'Coming up', 'The Gem litter', 'Current Applicants', '#signin']) assert.ok(!html.includes(gone), gone);
  // Online applications off: the site's own form follows the list.
  assert.match(html, /<a class="btn solid" href="#apply">Apply to join the waitlist<\/a>/);
  assert.match(html, /action="\/waitlist#apply"/);
});

test('an empty list says so; the last copy is shown, dated, when KennelOS can\'t be reached', async () => {
  const k = kennelos({ ...LIST, rows: [] });
  const b = await breeder(k);
  await b.post('/pages/waitlist/kennelos', { feed: FEED_URL });
  assert.match(await (await b.waitlist()).text(), /No families to show right now\./);
  k.answer = 'down';
  b.env.DB.raw.prepare("UPDATE feed_cache SET checked_at = '2000-01-01T00:00:00Z'").run();
  const html = await (await b.waitlist()).text();
  assert.match(html, /Updated November 1, 2026\. Our records couldn&#39;t be reached just now/);
});

test('Family login: in the menu, the footer and the status-page help, once published', async () => {
  const b = await breeder(kennelos(LIST));
  const home = async () => (await call(b.env, SITE, '/')).text();
  assert.doesNotMatch(await home(), /Family login/);
  await b.post('/pages/waitlist/kennelos', { feed: FEED_URL });
  assert.doesNotMatch(await home(), /Family login/, 'not before publishing');
  assert.match(await (await b.get('/publish')).text(), /Family login link: added/);
  await b.post('/publish');
  const signin = 'https://apply.kennelos.example/list/kos1_11111111-2222-4333-8444-555555555555#signin';
  const html = await home();
  assert.match(html, new RegExp(`<li><a class="navtop" href="${signin}" rel="noopener noreferrer" target="_blank">Family login</a></li><li><a class="btn solid" href="/waitlist">`), 'beside the Waitlist button');
  assert.match(html, new RegExp(`<li><a href="${signin}" rel="noopener noreferrer" target="_blank">Family login</a></li>`), 'in the footer');
  assert.match(await (await call(b.env, SITE, '/waitlist/help')).text(), new RegExp(`<a class="btn solid" href="${signin}"[^>]*>Sign in to see your details</a>`));
  await b.post('/pages/waitlist/kennelos', { remove: '1' });
  assert.match(await (await b.get('/publish')).text(), /Family login link: removed/);
  await b.post('/publish');
  assert.doesNotMatch(await home(), /Family login/);
});

test('the manage app steers by the KennelOS link: says it can be linked, then leaves out what is unused', async () => {
  const k = kennelos(feed());
  const b = await breeder(k);
  // Not linked: KennelOS is offered; the simple waitlist and questions are in use.
  let home = await (await b.get('')).text();
  assert.match(home, /<a class="tile" href="\/s\/akbostons\/waitlist"><b>Your waitlist<\/b>/);
  assert.match(home, /Waitlist and application<\/b><span>Your questions, or link KennelOS/);
  let wl = await (await b.get('/pages/waitlist')).text();
  assert.ok(wl.indexOf('Your KennelOS waitlist') < wl.indexOf('action="/s/akbostons/pages/waitlist"'), 'the KennelOS card comes first');
  assert.match(wl, /Keep your waitlist in KennelOS\?/);
  assert.match(wl, /Edit the application questions on this page/);
  assert.match(await (await b.get('/waitlist')).text(), /Keep your waitlist in KennelOS Pro instead/);

  // Linked, with online applications: both greyed, with the reason.
  await b.post('/pages/waitlist/kennelos', { feed: FEED_URL });
  home = await (await b.get('')).text();
  assert.doesNotMatch(home, /href="\/s\/akbostons\/waitlist"/, 'no tile for the unused simple waitlist');
  assert.match(home, /Waitlist and application<\/b><span>Linked to KennelOS, which takes your applications/);
  wl = await (await b.get('/pages/waitlist')).text();
  assert.match(wl, /application questions aren(&#39;|')t used while KennelOS takes your applications online/);
  assert.match(wl, /simple waitlist isn(&#39;|')t used while KennelOS is linked/);
  assert.match(await (await b.get('/lists/questions')).text(), /Not used right now: KennelOS takes your applications online/);
  const screen = await (await b.get('/waitlist')).text();
  assert.match(screen, /Not used: your website shows your KennelOS waitlist/);
  assert.doesNotMatch(screen, /Add a family/);

  // Linked, online applications off in KennelOS: the questions are in use again.
  k.answer = feed(null);
  b.env.DB.raw.prepare("UPDATE feed_cache SET checked_at = '2000-01-01T00:00:00Z'").run();
  home = await (await b.get('')).text();
  assert.match(home, /Linked to KennelOS · your questions/);
  assert.doesNotMatch(await (await b.get('/lists/questions')).text(), /Not used right now/);
  assert.doesNotMatch(home, /href="\/s\/akbostons\/waitlist"/, 'the simple waitlist still isn\'t');

  // An application from the site's own form: no Add to waitlist while linked.
  await call(b.env, SITE, '/waitlist', { method: 'POST', headers: { origin: `https://${SITE}`, 'cf-connecting-ip': '198.51.100.9' }, body: new URLSearchParams({ name: 'Megan Ross', email: 'm@example.com' }) });
  const msg = b.env.DB.raw.prepare('SELECT id FROM inquiries').get();
  assert.doesNotMatch(await (await b.get(`/inbox/${msg.id}`)).text(), /Add to waitlist/);
});

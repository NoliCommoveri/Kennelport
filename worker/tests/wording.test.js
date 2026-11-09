// The breeder's instructions (docs/plans/site-builder.md, step 2, decision 19;
// manage/wording.js): every line she reads in the Site Manager is the owner's
// wording, for every site and per site, with today's wording as the default.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';

const { CATALOG, sayer, defaultSay, cleanWording, withWording, NOTE_KEYS, SCREENS, itemsOn } = await import('../src/manage/wording.js');
const { LABELS, SHARED, labelFor } = await import('../src/manage/forms.js');

const M = 'manage.kennelport.com';
const ORIGIN = `https://${M}`;
const form = (o) => new URLSearchParams(o);
const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ');
const lastOutbox = (env) => env.DB.raw.prepare('SELECT subject FROM dev_outbox ORDER BY id DESC LIMIT 1').get();

test('the list: every field\'s label and help, the notes, the lists and her home screen, each today\'s wording by default', () => {
  for (const [kind, list] of Object.entries(LABELS)) {
    for (const [n, [label, hint]] of Object.entries(list)) {
      assert.equal(defaultSay(`f.${kind}.${n}`), label);
      assert.equal(defaultSay(`f.${kind}.${n}.hint`), hint ?? '');
      // With nobody's wording, a form reads as before.
      assert.deepEqual(labelFor(kind, n, defaultSay), [label, hint ?? null]);
    }
  }
  for (const n of Object.keys(SHARED)) assert.ok(CATALOG.has(`f.${n}`));
  for (const k of NOTE_KEYS) assert.ok(CATALOG.get(`note.${k}`).text);
  assert.equal(defaultSay('note.saved'), 'Saved to your draft. Publish when you\'re ready.');
  assert.equal(defaultSay.n('home.tile.waitlist', 1), '1 family waiting');
  assert.equal(defaultSay.n('home.tile.waitlist', 3), '3 families waiting');
  assert.equal(defaultSay('list.add', { one: defaultSay('list.dogs.one') }), 'Add dog');
  // Every item is on a screen the editor lists.
  for (const it of CATALOG.values()) assert.ok(Object.hasOwn(SCREENS, it.screen), it.key);
  assert.ok(Object.keys(SCREENS).every((k) => itemsOn(k).length > 0));
  // A key the list doesn't have says itself, so a mistake shows.
  assert.equal(defaultSay('nope.nothing'), 'nope.nothing');
});

test('hers over every site\'s over today\'s; names filled in; names a line can\'t use refused', () => {
  const say = sayer({ every: { 'home.tile.dogs': 'Our dogs', 'home.view': 'See it' }, site: { 'home.tile.dogs': 'The {kennel} gang' } }, { kennel: 'AK' });
  assert.equal(say('home.tile.dogs'), 'The AK gang');
  assert.equal(say('home.view'), 'See it');
  assert.equal(say('home.share'), 'Share');
  assert.equal(cleanWording('home.tile.dogs', '  Our dogs  '), 'Our dogs');
  assert.equal(cleanWording('home.tile.dogs', ''), null);
  assert.throws(() => cleanWording('home.tile.dogs', 'Dogs of {dog}'), /can't use \{dog\}\. It can use \{kennel\}/);
  assert.throws(() => cleanWording('home.tile.dogs', 'x'.repeat(601)), /600 characters at most/);
  assert.throws(() => cleanWording('no.such', 'x'), /isn't in the list/);
  assert.equal(cleanWording('home.tile.waitlist.many', '{n} on the list'), '{n} on the list');
  // A site's line equal to what it follows is not kept; '' follows again.
  let build = withWording({}, { 'home.view': 'See it', 'home.share': 'Pass it on' }, { 'home.view': 'See it' });
  assert.deepEqual(build.wording, { 'home.share': 'Pass it on' });
  build = withWording(build, { 'home.share': '' });
  assert.equal(build.wording, undefined);
  // Today's wording typed in on a site whose every-site line differs: kept.
  assert.deepEqual(withWording({}, { 'home.view': 'View my site' }, { 'home.view': 'See it' }).wording, { 'home.view': 'View my site' });
});

test('the owner sets it in her admin view; the breeder reads it in her Site Manager, for every site or this one', async () => {
  const env = await makeEnv();
  const ak = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  await addSite(env, 'hollow', { kennel_name: 'Hollow Creek' });
  const login = await call(env, M, '/ops/login', { method: 'POST', body: form({ token: 'ops-token' }) });
  const cookies = login.headers.getSetCookie().map((c) => c.split(';')[0]);
  const ops = cookies.find((c) => c.startsWith('ops_session='));
  const admin = cookies.find((c) => c.startsWith('kp_admin='));
  // A breeder of AK, signed in the usual way.
  await call(env, M, `/ops/sites/${ak.id}/people`, { method: 'POST', headers: { cookie: ops }, body: form({ email: 'b@example.com', role: 'owner' }) });
  await call(env, M, '/signin', { method: 'POST', body: form({ email: 'b@example.com' }), headers: { origin: ORIGIN } });
  const code = lastOutbox(env).subject.match(/(\d{6})/)[1];
  const breeder = (await call(env, M, '/signin/verify', { method: 'POST', body: form({ email: 'b@example.com', code, label: 'Phone' }), headers: { origin: ORIGIN } })).headers.get('set-cookie').split(';')[0];
  const as = async (cookie, p) => text(await (await call(env, M, p, { headers: { cookie } })).text());
  const save = (p, body) => call(env, M, p, { method: 'POST', headers: { cookie: admin, origin: ORIGIN }, body: form(body) });

  // The list, by screen, and a search across it.
  const list = await as(admin, '/admin/wording');
  assert.match(list, /Site Manager wording .* lines, by screen Her home screen \d+ lines .* A dog \d+ lines/);
  assert.match(await as(admin, '/admin/wording/all?q=call%20name'), /The "Call name" field \(?.*Today: “Call name”\./);
  assert.notEqual((await call(env, M, '/admin/wording', { headers: { cookie: breeder } })).status, 200);

  // For every site: a dog's Call name, its help (empty today), and a home tile.
  let r = await save('/admin/wording/dogs', { 'w.f.dogs.call_name': 'Pet name', 'w.f.dogs.call_name.hint': 'What {kennel} calls her at home.' });
  assert.equal(r.headers.get('location'), '/admin/wording/dogs?saved=1');
  await save('/admin/wording/home', { 'w.home.tile.dogs': 'Our dogs', 'w.home.tile.dogs.note': '' });
  const dogForm = await as(breeder, '/s/akbostons/dogs/new');
  assert.match(dogForm, /Pet name What AK Boston Terriers calls her at home\./);
  assert.match(await as(breeder, '/s/akbostons'), /Our dogs Cards, health results/);
  // Refused: a name it can't use; nothing saved.
  r = await save('/admin/wording/home', { 'w.home.tile.dogs': 'Dogs of {dog}' });
  assert.equal(r.status, 200);
  assert.match(text(await r.text()), /can't use \{dog\}/);
  assert.match(await as(breeder, '/s/akbostons'), /Our dogs Cards/);

  // This site's own: AK reads it, Hollow Creek still reads every site's.
  r = await save('/admin/akbostons/instructions/home', { 'w.home.tile.dogs': 'The pack' });
  assert.equal(r.headers.get('location'), '/admin/akbostons/instructions/home?saved=1');
  assert.match(await as(breeder, '/s/akbostons'), /The pack Cards/);
  assert.match(await as(admin, '/s/hollow'), /Our dogs Cards/);
  assert.match(await as(admin, '/admin/akbostons/instructions/home'), /changed .*Every site: “Our dogs”\./);
  // The note after a save, in her wording.
  await save('/admin/wording/notes', { 'w.note.saved': 'Got it, {kennel}. Publish when ready.' });
  const saved = await call(env, M, '/s/akbostons/details?note=saved', { headers: { cookie: breeder } });
  assert.match(text(await saved.text()), /Got it, AK Boston Terriers\. Publish when ready\./);
  // A screen's own lines too: the Inbox's help line and the empty review queue.
  await save('/admin/wording/inbox', { 'w.inbox.messages_are_kept_for': 'We keep messages 90 days. Reply opens your email.' });
  await save('/admin/wording/queue', { 'w.queue.no_reviews_waiting_families': 'Nothing to approve, {kennel}.' });
  assert.match(await as(breeder, '/s/akbostons/inbox'), /We keep messages 90 days\. Reply opens your email\./);
  assert.match(await as(breeder, '/s/akbostons/reviews-queue'), /Nothing to approve, AK Boston Terriers\./);
  // An error on her form, in the owner's line, naming the field by its label.
  await save('/admin/wording/errors', { 'w.error.too_long': '{field} can be {max} characters at most, {kennel}.' });
  const tooLong = await call(env, M, '/s/akbostons/dogs/new', { method: 'POST', headers: { cookie: breeder, origin: ORIGIN }, body: form({ call_name: 'x'.repeat(41), sex: 'female' }) });
  assert.match(text(await tooLong.text()), /Not saved: Pet name can be 40 characters at most, AK Boston Terriers\./);
  // Back to today's: empty lines.
  await save('/admin/akbostons/instructions/home', { 'w.home.tile.dogs': '' });
  await save('/admin/wording/home', { 'w.home.tile.dogs': '' });
  assert.match(await as(breeder, '/s/akbostons'), /Dogs Cards, health results/);
  assert.equal(env.DB.raw.prepare("SELECT COUNT(*) AS n FROM wording WHERE key = 'home.tile.dogs'").get().n, 0);
});

test('the errors that tell her what to fix: today\'s wording by default, the owner\'s line by kind, the field by its label', async () => {
  const { sayError, ERROR_KEYS } = await import('../src/manage/wording.js');
  const { ContentError, cleanValue, DOG_FIELDS } = await import('../src/content/model.js');
  // Every check's message reads as before with no wording set.
  const msgs = [
    ['call_name', 'required'], ['call_name', 'longer than 40 characters'], ['url', 'not a web address'], ['url', 'must start with https://'],
    ['contact_email', 'not an email address'], ['weeks', 'a whole number from 1 to 52'], ['born_on', 'a date is YYYY-MM-DD'],
    ['slug', '"willow" is already used'], ['badge_places', 'the Puppies page shows at most 2 badges: take one off it first'], ['x', 'something else'],
  ];
  for (const [p, m] of msgs) assert.equal(sayError(new ContentError(p, m).message, defaultSay), `${p}: ${m}`);
  assert.equal(sayError('An error of another kind.', defaultSay), 'An error of another kind.');
  assert.ok(ERROR_KEYS.length >= 25);
  // The owner's line: the field by its label, and what the check carries.
  const say = sayer({ every: { 'error.too_long': '{field} can be {max} characters at most.', 'error.required': '{field} needs filling in.' } });
  const label = (n) => ({ call_name: 'Call name' })[n] ?? n;
  let err;
  try { cleanValue(DOG_FIELDS.call_name, 'x'.repeat(41), 'dog.call_name'); } catch (e) { err = e; }
  assert.equal(sayError(err.message, say, label), 'Call name can be 40 characters at most.');
  assert.equal(sayError('dogs[0].call_name: required', say, label), 'Call name needs filling in.');
  assert.throws(() => cleanWording('error.required', '{nope} is needed'), /can't use \{nope\}/);
});

test('the errors from her other screens: today\'s words by default, the owner\'s line by kind', async () => {
  const { sayMessage } = await import('../src/manage/wording.js');
  const { addEntry, updateEntry } = await import('../src/waitlist.js');
  const { checkPhoto } = await import('../src/photos.js');
  const { readEmbedLink } = await import('../src/embeds.js');
  const { readBadgeCode } = await import('../src/badgeCode.js');
  const { parseFeedAddress } = await import('../src/feed.js');
  const caught = async (fn) => { try { await fn(); } catch (e) { return e.message; } return null; };
  const env = await makeEnv();
  const ak = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  // What each screen's code says today, and the messages it can say.
  const said = {
    waitlist: [
      await caught(() => addEntry(env, ak.id, { name: '' })),
      await caught(() => addEntry(env, ak.id, { name: 'x'.repeat(81) })),
      await caught(() => addEntry(env, ak.id, { name: 'Megan', list_name: 'x'.repeat(41) })),
      await caught(() => addEntry(env, ak.id, { name: 'Megan', email: 'nope' })),
      await caught(() => updateEntry(env, ak.id, 'x', { name: 'Megan', added_on: 'May 2' })),
    ],
    photos: [await caught(() => checkPhoto(new Uint8Array())), await caught(() => checkPhoto(new Uint8Array([1, 2, 3]))),
      'The photo is too large (4000 KB; at most 3072 KB).', 'The photo is 3000×2000; at most 2400 pixels a side.', 'This site has reached its limit of 500 photos.'],
    videos: [await caught(() => readEmbedLink('nope')), await caught(() => readEmbedLink('https://example.com/v')), 'At most 12 videos and posts in one place.', "That one's already here."],
    badge: [await caught(() => readBadgeCode('<p>hi</p>')), "Your link is filled in, but the picture in that code can't be copied (The file is empty). Download the logo from their page, choose it as the picture above, and save."],
    feed: [await caught(() => parseFeedAddress(env, 'nope'))],
    kennelos: ['Too many codes asked for. Try again in an hour.', 'That match has already been answered.'],
    account: ['Type akbostons to confirm.'],
    publish: ['there is no earlier version to go back to'],
    signin: ["That code isn't right. Check the latest email, or ask for a new code.", 'That code has expired. Ask for a new one.', "That isn't an email address."],
  };
  for (const [group, msgs] of Object.entries(said)) {
    for (const m of msgs) {
      assert.ok(m, `${group}: a message`);
      assert.equal(sayMessage(group, m, defaultSay), m);
      assert.notEqual(sayMessage(group, m, () => 'OWNER'), m, `${group}: "${m}" is in the list`);
    }
  }
  assert.equal(sayMessage('photos', 'Something else.', defaultSay), 'Something else.');
  assert.equal(sayMessage('signin', 'That match has already been answered.', defaultSay), 'That match has already been answered.');
  // The owner's lines: names filled in, the waitlist's detail by her words, a photo error inside a badge's.
  const say = sayer({ every: {
    'error.waitlist.too_long': '{What} can be {max} characters at most.', 'error.waitlist.what.list_name': 'the waitlist name',
    'error.photos.empty': 'That file has nothing in it.', 'error.photos.too_large': 'Too big: {kb} KB, the most is {max} KB.',
    'error.signin.expired': 'Old code, ask again.',
  } });
  assert.equal(sayMessage('waitlist', said.waitlist[2], say), 'The waitlist name can be 40 characters at most.');
  assert.equal(sayMessage('waitlist', said.waitlist[0], say), 'Please fill in their name.');
  assert.equal(sayMessage('photos', said.photos[2], say), 'Too big: 4000 KB, the most is 3072 KB.');
  assert.match(sayMessage('badge', said.badge[1], say), /can't be copied \(That file has nothing in it\)\./);
  assert.equal(sayMessage('signin', 'That code has expired. Ask for a new one.', say), 'Old code, ask again.');
  assert.ok(CATALOG.get('error.signin.expired').vars.length === 0, 'no {kennel} before a site is chosen');
  assert.ok(CATALOG.get('error.waitlist.too_long').vars.includes('what'));
});

test('her waitlist and sign-in errors, in the owner\'s words on her screens', async () => {
  const env = await makeEnv();
  const ak = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  const login = await call(env, M, '/ops/login', { method: 'POST', body: form({ token: 'ops-token' }) });
  const cookies = login.headers.getSetCookie().map((c) => c.split(';')[0]);
  const ops = cookies.find((c) => c.startsWith('ops_session='));
  const admin = cookies.find((c) => c.startsWith('kp_admin='));
  await call(env, M, `/ops/sites/${ak.id}/people`, { method: 'POST', headers: { cookie: ops }, body: form({ email: 'b@example.com', role: 'owner' }) });
  const save = (p, body) => call(env, M, p, { method: 'POST', headers: { cookie: admin, origin: ORIGIN }, body: form(body) });
  await save('/admin/wording/errors', { 'w.error.waitlist.required': 'Add {what} first, {kennel}.', 'w.error.waitlist.what.name': 'the family\'s name' });
  await save('/admin/wording/signin', { 'w.error.signin.wrong': 'Not that code. Try the newest email.' });
  // Signing in with a wrong code.
  await call(env, M, '/signin', { method: 'POST', body: form({ email: 'b@example.com' }), headers: { origin: ORIGIN } });
  const code = lastOutbox(env).subject.match(/(\d{6})/)[1];
  const wrong = String((Number(code) + 1) % 1000000).padStart(6, '0');
  const r = await call(env, M, '/signin/verify', { method: 'POST', body: form({ email: 'b@example.com', code: wrong }), headers: { origin: ORIGIN } });
  assert.match(text(await r.text()), /Not that code\. Try the newest email\./);
  const breeder = (await call(env, M, '/signin/verify', { method: 'POST', body: form({ email: 'b@example.com', code }), headers: { origin: ORIGIN } })).headers.get('set-cookie').split(';')[0];
  // A family added with no name.
  const w = await call(env, M, '/s/akbostons/waitlist/new', { method: 'POST', headers: { cookie: breeder, origin: ORIGIN }, body: form({ name: '' }) });
  assert.match(text(await w.text()), /Add the family's name first, AK Boston Terriers\./);
});

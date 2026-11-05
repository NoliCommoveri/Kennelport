// The breeder's instructions (docs/Site_Builder_Plan.md, step 2, decision 19;
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
  // Back to today's: empty lines.
  await save('/admin/akbostons/instructions/home', { 'w.home.tile.dogs': '' });
  await save('/admin/wording/home', { 'w.home.tile.dogs': '' });
  assert.match(await as(breeder, '/s/akbostons'), /Dogs Cards, health results/);
  assert.equal(env.DB.raw.prepare("SELECT COUNT(*) AS n FROM wording WHERE key = 'home.tile.dogs'").get().n, 0);
});

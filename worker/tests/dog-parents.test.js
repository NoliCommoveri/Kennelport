// A dog's sire and dam (migration 0030), and the chain they make: a featured offspring
// she sold is an outside dog ("not my dog") whose sire or dam is her dog, and its own
// offspring chain on from it, so a grand offspring shows on her dog's page too
// (docs/plans/kennelos-contract.md B6, as the owner set it on 2026-11-12).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, addSite } from './helpers/env.js';

const { buildSnapshot } = await import('../src/publish.js');
const { renderPage } = await import('../src/render/index.js');
const { cleanBlock } = await import('../src/content/blocks.js');
const { blockRows } = await import('../src/render/parts.js');
const { importContent, exportContent } = await import('../src/content/io.js');
const { saveRecord, removeRecord, getRecord, KINDS } = await import('../src/content/records.js');
// A record as its form sends it: its fields only.
const asForm = (r) => Object.fromEntries(Object.keys(KINDS.dogs.fields).map((k) => [k, r[k] ?? null]));
const { AK_SAMPLE } = await import('../src/content/akSample.js');

const TODAY = '2026-11-20';

async function site(edit = () => {}) {
  const env = await makeEnv();
  const s = await addSite(env, 'akparents');
  const doc = structuredClone(AK_SAMPLE);
  // Ziva is Boone's daughter she kept. Rocket is a son she sold and features (not her
  // dog), and Comet is Rocket's son: Boone's grand offspring. Pearl's sire is a name.
  Object.assign(doc.dogs.find((d) => d.slug === 'ziva'), { sire: 'boone', dam: 'willow' });
  Object.assign(doc.dogs.find((d) => d.slug === 'pearl'), { sire_name: 'Rocky of Oakridge' });
  doc.dogs.push(
    { slug: 'rocket', call_name: 'Rocket', sex: 'male', outside: true, owner_name: 'The Lees', sire: 'boone', dam: 'willow', titles: 'CH' },
    { slug: 'comet', call_name: 'Comet', sex: 'male', outside: true, owner_name: 'Sky Bostons', sire: 'rocket', dam_name: 'Luna' },
  );
  edit(doc);
  await importContent(env, s.id, doc);
  const snap = await buildSnapshot(env, s.id);
  const page = (p) => renderPage(snap, { path: p, origin: 'https://x', today: TODAY, preview: true }).html;
  return { env, s, snap, page };
}
const idOf = (snap, slug) => snap.dogs.find((d) => d.slug === slug).id;

test('a dog\'s sire and dam: imported by slug, exported the same, a name for one not on the site', async () => {
  const { env, s, snap } = await site();
  const ziva = snap.dogs.find((d) => d.slug === 'ziva');
  assert.equal(ziva.sire_id, idOf(snap, 'boone'));
  assert.equal(ziva.dam_id, idOf(snap, 'willow'));
  assert.equal(snap.dogs.find((d) => d.slug === 'pearl').sire_name, 'Rocky of Oakridge');
  const back = await exportContent(env, s.id);
  const by = (slug) => back.dogs.find((d) => d.slug === slug);
  assert.equal(by('comet').sire, 'rocket');
  assert.equal(by('comet').dam_name, 'Luna');
  assert.equal(by('ziva').dam, 'willow');
  assert.equal(by('willow').sire, undefined);
  // A parent that isn't in the list, or the dog itself, is refused.
  await assert.rejects(importContent(env, s.id, { ...back, dogs: back.dogs.map((d) => (d.slug === 'comet' ? { ...d, sire: 'nobody' } : d)) }), /no dog with slug "nobody"/);
  await assert.rejects(importContent(env, s.id, { ...back, dogs: back.dogs.map((d) => (d.slug === 'comet' ? { ...d, sire: 'comet' } : d)) }), /own parent/);
});

test('her dog\'s page: its sire and dam among its facts, then offspring and grand offspring', async () => {
  const { page } = await site();
  const ziva = page('/dogs/ziva');
  assert.match(ziva, /<dt>Sire<\/dt><dd><a href="\/dogs\/boone">Boone\*<\/a><\/dd><dt>Dam<\/dt><dd><a href="\/dogs\/willow">Willow<\/a><\/dd>/);
  assert.match(page('/dogs/pearl'), /<dt>Sire<\/dt><dd>Rocky of Oakridge<\/dd>/);
  const boone = page('/dogs/boone');
  const off = boone.slice(boone.indexOf('<span class="eyebrow">Offspring</span>'));
  assert.ok(off.length < boone.length, 'an Offspring part');
  // Ziva (kept) and Rocket (sold, featured) are his offspring; Comet, Rocket's son, his grand offspring.
  const grand = off.indexOf('<span class="eyebrow">Grand offspring</span>');
  assert.ok(grand > 0);
  assert.match(off.slice(0, grand), /href="\/dogs\/ziva"[^]*href="\/dogs\/rocket"/);
  assert.match(off.slice(grand), /href="\/dogs\/comet"[^]*Owned by Sky Bostons/);
  assert.doesNotMatch(off.slice(grand), /href="\/dogs\/rocket"/);
  // Rocket's own page: his sire, and Comet as his offspring.
  const rocket = page('/dogs/rocket');
  assert.match(rocket, /<dt>Sire<\/dt><dd><a href="\/dogs\/boone">/);
  assert.match(rocket, /<span class="eyebrow">Offspring<\/span>[^]*href="\/dogs\/comet"/);
  // A dog with none has no part.
  assert.doesNotMatch(page('/dogs/comet'), /<span class="eyebrow">Offspring<\/span>/);
});

test('blocks: a parent, descends from, life stage and where it lives', async () => {
  const { snap } = await site();
  const names = (where) => blockRows(snap, cleanBlock({ id: 'd', type: 'dogs', where }), TODAY).map((d) => d.call_name.replace(/\*$/, ''));
  assert.deepEqual(names([{ field: 'parent', op: 'includes', value: 'Boone*' }]), ['Ziva', 'Rocket']);
  assert.deepEqual(names([{ field: 'descends_from', op: 'includes', value: 'boone*' }]), ['Ziva', 'Rocket', 'Comet']);
  // Boone's featured offspring and grand offspring she doesn't own.
  assert.deepEqual(names([{ field: 'descends_from', op: 'includes', value: 'boone*' }, { field: 'residence', op: 'is', value: 'not_mine' }]), ['Rocket', 'Comet']);
  assert.deepEqual(names([{ field: 'residence', op: 'one_of', value: ['home'] }, { field: 'sire.call_name', op: 'is', value: 'rocky of oakridge' }]), ['Pearl']);
});

test('a parent not shown on the site is named, never linked; a removed one leaves its offspring', async () => {
  const { env, s } = await site((doc) => { doc.dogs.find((d) => d.slug === 'boone').show_on_site = false; });
  const snap = await buildSnapshot(env, s.id);
  const ziva = snap.dogs.find((d) => d.slug === 'ziva');
  assert.equal(ziva.sire_id, undefined);
  assert.equal(ziva.sire_name, 'Boone*');
  const boone = (await env.DB.prepare("SELECT id FROM dogs WHERE site_id = ? AND slug = 'boone'").bind(s.id).first()).id;
  await removeRecord(env, s.id, 'dogs', boone);
  const left = await env.DB.prepare("SELECT sire_id FROM dogs WHERE site_id = ? AND slug IN ('ziva', 'rocket')").bind(s.id).all();
  assert.deepEqual(left.results.map((r) => r.sire_id), [null, null]);
});

test('saving a dog: never its own parent; one life stage', async () => {
  const { env, s } = await site();
  const comet = (await env.DB.prepare("SELECT id FROM dogs WHERE site_id = ? AND slug = 'comet'").bind(s.id).first()).id;
  const cur = asForm(await getRecord(env, s.id, 'dogs', comet));
  await assert.rejects(saveRecord(env, s.id, 'dogs', comet, { ...cur, sire_id: comet }), /own parent/);
  const pearl = (await env.DB.prepare("SELECT id FROM dogs WHERE site_id = ? AND slug = 'pearl'").bind(s.id).first()).id;
  const p = asForm(await getRecord(env, s.id, 'dogs', pearl));
  const saved = await saveRecord(env, s.id, 'dogs', pearl, { ...p, upcoming: 1, for_sale: 1 });
  assert.deepEqual([saved.upcoming, saved.for_sale], [0, 1]);
  const retired = await saveRecord(env, s.id, 'dogs', pearl, { ...p, status: 'retired', upcoming: 1 });
  assert.deepEqual([retired.upcoming, retired.for_sale], [0, 0]);
});

// ---------- her Site Manager: Life stage, and the pedigree card ----------

const { call } = await import('./helpers/env.js');
const { inviteToSite } = await import('../src/auth.js');
const M = 'manage.kennelport.com';

async function signedIn() {
  const { env, s } = await site();
  await env.DB.prepare('UPDATE sites SET subdomain = ? WHERE id = ?').bind('akparents', s.id).run();
  await inviteToSite(env, s.id, 'b@example.com', 'owner', { manageUrl: 'x', siteUrl: 'y' });
  const headers = { origin: `https://${M}` };
  await call(env, M, '/signin', { method: 'POST', headers, body: new URLSearchParams({ email: 'b@example.com' }) });
  const code = env.DB.raw.prepare("SELECT subject FROM dev_outbox WHERE kind = 'code' ORDER BY id DESC").get().subject.match(/\d{6}/)[0];
  const cookie = (await call(env, M, '/signin/verify', { method: 'POST', headers, body: new URLSearchParams({ email: 'b@example.com', code }) })).headers.get('set-cookie').split(';')[0];
  const get = async (p) => (await call(env, M, `/s/akparents${p}`, { headers: { cookie } })).text();
  const post = (p, body) => call(env, M, `/s/akparents${p}`, { method: 'POST', headers: { cookie, origin: `https://${M}` }, body: new URLSearchParams(body) });
  const dog = (slug) => env.DB.raw.prepare('SELECT * FROM dogs WHERE site_id = ? AND slug = ?').get(s.id, slug);
  return { env, s, get, post, dog };
}
// The form as drawn, with changes: its inputs, selects and text areas.
async function formOf(get, p, changes) {
  const html = await get(p);
  const f = html.slice(html.indexOf('<form method="post" action="/s/akparents/dogs/'), html.indexOf('</form>', html.indexOf('data-save')));
  const body = {};
  for (const m of f.matchAll(/<input([^>]*)>/g)) {
    const name = m[1].match(/name="([^"]+)"/)?.[1];
    const type = m[1].match(/type="([^"]+)"/)?.[1];
    if (!name || ((type === 'checkbox' || type === 'radio') && !/ checked/.test(m[1]))) continue;
    body[name] = (m[1].match(/value="([^"]*)"/)?.[1] ?? '').replace(/&amp;/g, '&').replace(/&#39;/g, "'");
  }
  for (const m of f.matchAll(/<select[^>]*name="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)) body[m[1]] = m[2].match(/<option value="([^"]*)" selected/)?.[1] ?? '';
  for (const m of f.matchAll(/<textarea[^>]*name="([^"]+)"[^>]*>([\s\S]*?)<\/textarea>/g)) body[m[1]] = m[2];
  return { ...body, ...changes };
}

test('her dog form: one Life stage for its status and two flags; KennelOS\'s on a dog it sends', async () => {
  const { env, get, post, dog } = await signedIn();
  const pearl = dog('pearl');
  const html = await get(`/dogs/${pearl.id}`);
  assert.match(html, /<select id="f-life_stage" name="life_stage"[^>]*>[^]*<option value="breeding" selected>Breeding dog<\/option>/);
  assert.doesNotMatch(html, /name="upcoming"|name="for_sale"|name="status"/);
  assert.equal((await post(`/dogs/${pearl.id}`, await formOf(get, `/dogs/${pearl.id}`, { life_stage: 'for_sale' }))).status, 303);
  assert.deepEqual([dog('pearl').status, dog('pearl').upcoming, dog('pearl').for_sale], ['active', 0, 1]);
  await post(`/dogs/${pearl.id}`, await formOf(get, `/dogs/${pearl.id}`, { life_stage: 'remembered' }));
  assert.deepEqual([dog('pearl').status, dog('pearl').upcoming, dog('pearl').for_sale], ['remembered', 0, 0]);
  // A dog from KennelOS: shown, not editable, and kept whatever is sent.
  env.DB.raw.prepare("UPDATE dogs SET source = 'kennelos', upcoming = 1 WHERE id = ?").run(dog('ziva').id);
  const ziva = dog('ziva');
  const form = await get(`/dogs/${ziva.id}`);
  assert.match(form, /<p class="locked"><b>Life stage<\/b><br>Up and coming <span class="muted small">· from KennelOS/);
  await post(`/dogs/${ziva.id}`, { ...(await formOf(get, `/dogs/${ziva.id}`, {})), life_stage: 'retired' });
  assert.deepEqual([dog('ziva').status, dog('ziva').upcoming], ['active', 1]);
});

test('the pedigree card: her records four generations back; a name made a dog record, linked', async () => {
  const { get, post, dog } = await signedIn();
  const comet = dog('comet');
  const card = (html) => html.slice(html.indexOf('id="pedigree"'));
  const html = card(await get(`/dogs/${comet.id}`));
  // Rocket (a record), his sire Boone and dam Willow; Luna, typed by name.
  assert.match(html, /<b>Rocket<\/b><span>Sire<\/span>/);
  assert.match(html, /<b>Boone\*<\/b><span>Sire&#39;s sire<\/span>/);
  assert.match(html, /<b>Willow<\/b><span>Sire&#39;s dam<\/span>/);
  assert.match(html, /<b>Luna<\/b><span>Dam · name only<\/span><\/a>\s*<form method="post" action="\/s\/akparents\/dogs\/[0-9a-f-]{36}\/make-dam"><button class="button small">Make a dog record<\/button>/);
  // Made: a Not my dog record, a female called Luna, linked as Comet's dam.
  const made = await post(`/dogs/${comet.id}/make-dam`, {});
  assert.equal(made.status, 303);
  const luna = dog('luna');
  assert.equal(made.headers.get('location'), `/s/akparents/dogs/${luna.id}?note=made_parent`);
  assert.deepEqual([luna.call_name, luna.sex, luna.outside, luna.status], ['Luna', 'female', 1, 'active']);
  assert.deepEqual([dog('comet').dam_id, dog('comet').dam_name], [luna.id, null]);
  assert.match(await get(`/dogs/${luna.id}?note=made_parent`), /Made a dog record for this parent and linked it/);
  assert.match(card(await get(`/dogs/${comet.id}`)), /<b>Luna<\/b><span>Dam<\/span>/);
  // Again: nothing more is made.
  await post(`/dogs/${comet.id}/make-dam`, {});
  assert.equal(dog('luna-2'), undefined);
  // A dog with no parents says so.
  assert.match(card(await get(`/dogs/${dog('boone').id}`)), /No sire or dam yet/);
});

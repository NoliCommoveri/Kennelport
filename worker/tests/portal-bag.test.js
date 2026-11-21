// The go-home bag (docs/plans/portal-go-home-bag.md): her bag on the Portal tab, Sent
// home with on a family's screen, what came home on the family's Records, the
// bag_items KennelOS sends in its bundle, and what went home in the feed's facts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';

const M = 'manage.kennelport.com';
const H = 'akbostons.kennelport.com';
const API = 'api.kennelport.com';
const KENNEL = 'kennel-1';
const form = (o) => new URLSearchParams(o);
const outbox = (env) => env.DB.raw.prepare('SELECT kind, subject, body FROM dev_outbox ORDER BY id').all();
const DAY = 86400000;
const ymd = (d) => d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

const { parseCost, money, bagFact } = await import('../src/portal/bag.js');
const { runPortalHourly } = await import('../src/portal/reminders.js');

async function setup() {
  const env = await makeEnv({ PORTAL_EMAIL_KEY: 'portal-test-key' });
  const site = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  const ops = (await call(env, M, '/ops/login', { method: 'POST', body: form({ token: 'ops-token' }) })).headers.get('set-cookie').split(';')[0];
  await call(env, M, `/ops/sites/${site.id}/people`, { method: 'POST', headers: { cookie: ops }, body: form({ email: 'breeder@example.com', role: 'owner' }) });
  await call(env, M, '/signin', { method: 'POST', body: form({ email: 'breeder@example.com' }), headers: { origin: `https://${M}` } });
  const code = outbox(env).at(-1).subject.match(/(\d{6})/)[1];
  const breeder = (await call(env, M, '/signin/verify', { method: 'POST', body: form({ email: 'breeder@example.com', code }), headers: { origin: `https://${M}` } })).headers.get('set-cookie').split(';')[0];
  await call(env, M, `/ops/sites/${site.id}/portal/on`, { method: 'POST', headers: { cookie: ops } });
  const t = new Date().toISOString();
  const born = ymd(new Date(Date.now() - 50 * DAY));
  env.DB.raw.prepare("INSERT INTO litters (id, site_id, slug, name, stage, born_on, created_at, updated_at) VALUES ('lit1', ?, 'winter', 'Winter litter', 'current', ?, ?, ?)").run(site.id, born, t, t);
  for (const [id, name] of [['pup1', 'Opal'], ['pup2', 'Ruby']]) {
    env.DB.raw.prepare("INSERT INTO puppies (id, site_id, litter_id, slug, name, sex, created_at, updated_at) VALUES (?, ?, 'lit1', ?, ?, 'female', ?, ?)").run(id, site.id, id, name, t, t);
  }
  env.DB.raw.prepare("INSERT INTO products (id, site_id, name, link_url, sort) VALUES ('food', ?, 'Puppy food program', 'https://food.example/akb', 1)").run(site.id);
  env.DB.raw.prepare("INSERT INTO products (id, site_id, name, link_url, sort) VALUES ('ins', ?, 'Puppy insurance', 'https://insure.example/akb', 2)").run(site.id);
  env.DB.raw.prepare("INSERT INTO products (id, site_id, name, link_url, sort) VALUES ('off', ?, 'Old program', 'https://old.example/akb', 3)").run(site.id);
  const her = (path, body) => call(env, M, `/s/akbostons${path}`, body ? { method: 'POST', body: body instanceof URLSearchParams ? body : form(body), headers: { cookie: breeder, origin: `https://${M}` } } : { headers: { cookie: breeder } });
  const saved = await her('/portal/settings', {
    vet_rule: 'hours72', time_zone: 'America/New_York', help_weeks: '8',
    'type.food': 'food', 'action.food': 'Order the same food within the first week', 'type.ins': 'insurance',
  });
  assert.equal(saved.status, 303, await saved.text());
  const row = (sql, ...a) => env.DB.raw.prepare(sql).get(...a);
  const rows = (sql, ...a) => env.DB.raw.prepare(sql).all(...a);
  return { env, site, her, row, rows, breeder };
}

async function addFamily(her, values) {
  const res = await her('/portal/new', values);
  assert.equal(res.status, 303, await res.text());
  return res.headers.get('location').match(/\/f\/([0-9a-f-]{36})/)[1];
}

async function familySignIn(env, email) {
  await call(env, H, '/family/signin', { method: 'POST', body: form({ email }), headers: { origin: `https://${H}` } });
  const code = outbox(env).at(-1).subject.match(/(\d{6})/)[1];
  const res = await call(env, H, '/family/signin/verify', { method: 'POST', body: form({ email, code }), headers: { origin: `https://${H}` } });
  return res.headers.get('set-cookie').split(';')[0];
}

const addItem = async (her, v) => {
  const res = await her('/portal/bag/new', v);
  assert.equal(res.status, 303, await res.text());
  return res.headers.get('location').match(/#b-([0-9a-f-]{36})/)[1];
};

test('costs: sums of money in, whole cents kept', () => {
  assert.equal(parseCost('4.50'), 450);
  assert.equal(parseCost('$12'), 1200);
  assert.equal(parseCost(' 1,200.5 '), 120050);
  assert.equal(parseCost(''), 0);
  assert.throws(() => parseCost('four'), /bag\.cost_bad/);
  assert.throws(() => parseCost('4.555'), /bag\.cost_bad/);
  assert.throws(() => parseCost('20000'), /bag\.cost_big/);
  assert.equal(money(450), '$4.50');
  assert.equal(money(1200), '$12');
  assert.deepEqual(bagFact([{ bag_item_id: 'a', name: 'Toy', cost_cents: 650, expense: 1 }, { bag_item_id: null, name: 'Treats', cost_cents: 0, expense: 0 }], new Map([['a', 'kos-a']])),
    { items: [{ bag_item_id: 'kos-a', name: 'Toy', cost: 6.5, expense: true }, { name: 'Treats', cost: 0, expense: false }], cost: 6.5, expensed: 6.5 });
});

test('her bag: starts empty; add, change, order, switch off and remove, with the expense column', async () => {
  const { her, row, rows } = await setup();
  // On the Portal tab, and empty to begin with.
  assert.match(await (await her('/portal/setup')).text(), /Go-home bag/);
  let page = await (await her('/portal/bag')).text();
  assert.match(page, /Your bag is empty/);
  assert.equal((await her('/portal/bag/new', { name: 'Toy', cost: 'four dollars', shown: '1' })).status, 400);
  const blanket = await addItem(her, { name: 'Blanket with the litter\'s scent', cost: '4', expense: '1', origin: 'Bought in bulk', shown: '1' });
  const food = await addItem(her, { name: 'Food starter bag (2 lb)', cost: '', product_id: 'food', shown: '1' });
  const ins = await addItem(her, { name: 'Insurance certificate', product_id: 'ins', button: 'Start the trial', shown: '1' });
  const toy = await addItem(her, { name: 'Chew toy', cost: '6.50', expense_set: '1', shown: '1' });
  const b = row('SELECT * FROM portal_bag_items WHERE id = ?', blanket);
  assert.deepEqual([b.cost_cents, b.expense, b.origin], [400, 1, 'Bought in bulk']);
  // Free: nothing to expense. Tied to a program: its button words filled in by its type.
  const f = row('SELECT * FROM portal_bag_items WHERE id = ?', food);
  assert.deepEqual([f.cost_cents, f.expense, f.button], [0, 0, 'Get more']);
  assert.equal(row('SELECT button FROM portal_bag_items WHERE id = ?', ins).button, 'Start the trial', 'her own words stay');
  assert.equal(row('SELECT expense FROM portal_bag_items WHERE id = ?', toy).expense, 0, 'unticked: not expensed');
  page = await (await her('/portal/bag')).text();
  assert.match(page, /4 in the bag · \$10\.50 to you · \$4 expensed/);
  assert.match(page, /Costs you \$4 · Bought in bulk/);
  assert.match(page, /Free to you · tied to Puppy food program/);
  assert.equal((page.match(/class="tag">Expensed</g) ?? []).length, 1);
  // Change one: expense it now; move it up; switch the insurance off.
  assert.equal((await her(`/portal/bag/${toy}`, { name: 'Chew toy and squeaky toy', cost: '6.50', expense: '1', shown: '1' })).status, 303);
  assert.equal(row('SELECT expense FROM portal_bag_items WHERE id = ?', toy).expense, 1);
  await her(`/portal/bag/${toy}/up`, {});
  assert.deepEqual(rows('SELECT name FROM portal_bag_items ORDER BY sort').map((x) => x.name), ['Blanket with the litter\'s scent', 'Food starter bag (2 lb)', 'Chew toy and squeaky toy', 'Insurance certificate']);
  await her(`/portal/bag/${ins}`, { name: 'Insurance certificate', product_id: 'ins', button: 'Start the trial' });
  assert.match(await (await her('/portal/bag')).text(), /Off: not in the bag for new families/);
  // Remove asks first.
  assert.match(await (await her(`/portal/bag/${blanket}/remove`)).text(), /Remove Blanket with the litter&#39;s scent from your bag\?|Remove Blanket with the litter's scent from your bag\?/);
  await her(`/portal/bag/${blanket}/remove`, {});
  assert.equal(row('SELECT COUNT(*) AS n FROM portal_bag_items').n, 3);
});

test('Sent home with: her usual bag until she saves it or the puppy goes home; the family sees it from pickup on', async () => {
  const { env, her, row, rows } = await setup();
  const famId = await addFamily(her, { name: 'The Reed family', emails: 'sam@example.com', puppy_id: 'pup1', go_home_on: ymd(new Date(Date.now() + 6 * DAY)) });
  // No bag yet: no card.
  assert.doesNotMatch(await (await her(`/portal/f/${famId}`)).text(), /Sent home with/);
  const food = await addItem(her, { name: 'Food starter bag', product_id: 'food', shown: '1' });
  const toy = await addItem(her, { name: 'Chew toy', cost: '6', expense: '1', shown: '1' });
  const leash = await addItem(her, { name: 'Collar and leash', cost: '9', expense: '1', origin: 'Pet store', shown: '1' });
  let page = await (await her(`/portal/f/${famId}`)).text();
  assert.match(page, /Sent home with/);
  assert.match(page, /Your usual bag, ticked/);
  assert.match(page, /3 items · \$15 to you · \$15 expensed/);
  const p = row('SELECT * FROM portal_placements WHERE family_id = ?', famId);
  assert.equal(p.bag_saved_at, null);
  // Before pickup the family sees nothing of it.
  const fam = (cookie) => (path) => call(env, H, path, { headers: { cookie } });
  const reed = fam(await familySignIn(env, 'sam@example.com'));
  assert.doesNotMatch(await (await reed('/family/records')).text(), /came home/);
  // She unticks the leash, keeps the toy but doesn't expense it this time, adds treats.
  const saved = await her(`/portal/f/${famId}/bag`, form({ [`item.${food}`]: '1', [`item.${toy}`]: '1', add: 'Extra bag of treats' }));
  assert.equal(saved.status, 303);
  assert.match(saved.headers.get('location'), /note=bag#bag/);
  const sent = rows('SELECT * FROM portal_placement_bag WHERE placement_id = ? ORDER BY sort', p.id);
  assert.deepEqual(sent.map((x) => [x.name, x.cost_cents, x.expense, x.bag_item_id === null]), [['Food starter bag', 0, 0, false], ['Chew toy', 600, 0, false], ['Extra bag of treats', 0, 0, true]]);
  page = await (await her(`/portal/f/${famId}?note=bag`)).text();
  assert.match(page, /3 items · \$6 to you · \$0 expensed/);
  assert.match(page, /Saved\. The family sees it under Records once Opal is home/);
  assert.doesNotMatch(page, /Your usual bag/);
  assert.match(page, /Collar and leash/, 'still offered, unticked');
  // A later change to her bag doesn't change what this puppy went with.
  await her(`/portal/bag/${toy}`, { name: 'Rope toy', cost: '8', expense: '1', shown: '1' });
  assert.equal(row('SELECT name FROM portal_placement_bag WHERE placement_id = ? AND bag_item_id = ?', p.id, toy).name, 'Chew toy');
  // Save again: the toy expensed after all, the leash ticked now.
  const ids = rows('SELECT id, bag_item_id FROM portal_placement_bag WHERE placement_id = ?', p.id);
  const body = form({ [`item.${leash}`]: '1', [`expense.${leash}`]: '1' });
  for (const x of ids) { body.set(`sent.${x.id}`, '1'); if (x.bag_item_id === toy) body.set(`sentexpense.${x.id}`, '1'); }
  await her(`/portal/f/${famId}/bag`, body);
  const again = rows('SELECT * FROM portal_placement_bag WHERE placement_id = ? ORDER BY sort', p.id);
  assert.deepEqual(again.map((x) => [x.name, x.expense]), [['Food starter bag', 0], ['Chew toy', 1], ['Extra bag of treats', 0], ['Collar and leash', 1]]);
  // Pickup leaves a saved bag alone; the family sees what came home, with her buttons.
  await her(`/portal/f/${famId}/picked-up`, {});
  assert.equal(rows('SELECT id FROM portal_placement_bag WHERE placement_id = ?', p.id).length, 4);
  const records = await (await reed('/family/records')).text();
  assert.match(records, /What came home in Opal's bag/);
  assert.match(records, /From AK Boston Terriers/);
  assert.match(records, /Extra bag of treats/);
  assert.match(records, /href="\/family\/go\/food\?from=bag">Get more/);
  assert.match(records, /Order the same food within the first week/);
  assert.doesNotMatch(records, /\$6|\$9|Pet store|xpense/, 'no cost, origin or expense for families');
  assert.match(records, /class="disclose"/);
  // A bag click counts as from the bag.
  await reed('/family/go/food?from=bag');
  assert.equal(row("SELECT place FROM portal_clicks ORDER BY id DESC LIMIT 1").place, 'bag');
  // Her history says what she did.
  assert.match(await (await her(`/portal/f/${famId}`)).text(), /Sent home with: 4 items/);
});

test('pickup fixes her usual bag as it stands; nothing ticked means nothing went', async () => {
  const { env, her, row, rows } = await setup();
  const a = await addFamily(her, { name: 'The Reed family', emails: 'sam@example.com', puppy_id: 'pup1', go_home_on: ymd(new Date(Date.now() + 6 * DAY)) });
  const b = await addFamily(her, { name: 'The Hale family', emails: 'jo@example.com', puppy_id: 'pup2', go_home_on: ymd(new Date(Date.now() + 6 * DAY)) });
  const ins = await addItem(her, { name: 'Insurance certificate', product_id: 'ins', shown: '1' });
  await addItem(her, { name: 'Old leaflet', shown: '' });
  await addItem(her, { name: 'Program kit', product_id: 'off', shown: '1' });
  await her(`/portal/f/${a}/picked-up`, {});
  const pa = row('SELECT * FROM portal_placements WHERE family_id = ?', a);
  assert.ok(pa.bag_saved_at);
  assert.deepEqual(rows('SELECT name, button FROM portal_placement_bag WHERE placement_id = ? ORDER BY sort', pa.id).map((x) => [x.name, x.button]), [['Insurance certificate', 'Activate'], ['Program kit', 'Get more']], 'only what is on, as it stands');
  // A program families don't see: the item with no button.
  const reed = await familySignIn(env, 'sam@example.com');
  const records = await (await call(env, H, '/family/records', { headers: { cookie: reed } })).text();
  assert.match(records, /Program kit<\/b><\/span>\s*<span><\/span>/);
  assert.match(records, /href="\/family\/go\/ins\?from=bag">Activate/);
  // The second family: she saves with nothing ticked.
  await her(`/portal/f/${b}/bag`, {});
  const pb = row('SELECT * FROM portal_placements WHERE family_id = ?', b);
  assert.ok(pb.bag_saved_at);
  assert.equal(rows('SELECT id FROM portal_placement_bag WHERE placement_id = ?', pb.id).length, 0);
  await her(`/portal/f/${b}/picked-up`, {});
  assert.equal(rows('SELECT id FROM portal_placement_bag WHERE placement_id = ?', pb.id).length, 0, 'pickup leaves it as she saved it');
  const hale = await familySignIn(env, 'jo@example.com');
  assert.doesNotMatch(await (await call(env, H, '/family/records', { headers: { cookie: hale } })).text(), /came home/);
  // Her template item removed later: what went home stays.
  await her(`/portal/bag/${ins}/remove`, {});
  assert.equal(rows('SELECT id FROM portal_placement_bag WHERE placement_id = ?', pa.id).length, 2);
  // A pickup that came another way (the clock started from the booked time): the hourly job fixes it.
  env.DB.raw.prepare("UPDATE portal_placements SET bag_saved_at = NULL, picked_up_at = ?, pickup_state = 'assumed' WHERE id = ?").run(new Date().toISOString(), pa.id);
  env.DB.raw.prepare('DELETE FROM portal_placement_bag WHERE placement_id = ?').run(pa.id);
  await runPortalHourly(env);
  assert.ok(row('SELECT bag_saved_at FROM portal_placements WHERE id = ?', pa.id).bag_saved_at);
  assert.equal(rows('SELECT id FROM portal_placement_bag WHERE placement_id = ?', pa.id).length, 1, 'her bag as it stands now');
});

test('an erased account keeps what went home; Delete now removes it', async () => {
  const { her, row, rows } = await setup();
  const a = await addFamily(her, { name: 'The Reed family', emails: 'sam@example.com', puppy_id: 'pup1', go_home_on: ymd(new Date(Date.now() + 6 * DAY)) });
  const b = await addFamily(her, { name: 'The Hale family', emails: 'jo@example.com', puppy_id: 'pup2', go_home_on: ymd(new Date(Date.now() + 6 * DAY)) });
  await addItem(her, { name: 'Chew toy', cost: '6', expense: '1', shown: '1' });
  await her(`/portal/f/${a}/picked-up`, {});
  await her(`/portal/f/${b}/picked-up`, {});
  const pa = row('SELECT id FROM portal_placements WHERE family_id = ?', a).id;
  const pb = row('SELECT id FROM portal_placements WHERE family_id = ?', b).id;
  await her(`/portal/f/${a}/erase`, { confirm: 'erase' });
  assert.equal(rows('SELECT id FROM portal_placement_bag WHERE placement_id = ?', pa).length, 1);
  await her(`/portal/f/${b}/delete`, { confirm: 'delete' });
  await her(`/portal/gone/${b}`, { confirm: 'delete' });
  assert.equal(row('SELECT COUNT(*) AS n FROM portal_placements WHERE id = ?', pb).n, 0);
  assert.equal(rows('SELECT id FROM portal_placement_bag WHERE placement_id = ?', pb).length, 0);
});

// ---------- KennelOS ----------

async function linkedSetup() {
  const s = await setup();
  const html = await (await s.her('/kennelos/code', {})).text();
  const linkCode = html.match(/class="code">([A-Z0-9-]+)</)[1];
  const token = (await (await call(s.env, API, '/v1/link', { method: 'POST', body: JSON.stringify({ code: linkCode, kennel_id: KENNEL }), headers: { 'content-type': 'application/json' } })).json()).token;
  let n = 0;
  const post = (path, body) => call(s.env, API, path, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` } });
  const bundle = async (extra) => {
    const res = await post('/v1/bundle', { format: 1, bundle_id: `bundle-${++n}-xxxxxx`, kennel_id: KENNEL, dogs: [], litters: [], pairings: [], heats: [], ...extra });
    return { status: res.status, body: await res.json() };
  };
  const feed = async (extra = {}) => (await post('/v1/portal', { format: 1, feed_id: `feed-${++n}`, kennel_id: KENNEL, ...extra })).json();
  return { ...s, bundle, feed };
}

const PRODUCTS = [{ id: 'acct-food', name: 'Puppy food program', link_url: 'https://food.example/akb' }, { id: 'acct-ins', name: 'Puppy insurance', link_url: 'https://insure.example/akb' }];

test('bag items from KennelOS: cost and expense are KennelOS\'s; her switch, order and words stay hers; hidden, never deleted', async () => {
  const { her, bundle, row, rows } = await linkedSetup();
  // Hers, made by hand, one with a name KennelOS also sends.
  const mine = await addItem(her, { name: 'Scent blanket', cost: '3', expense: '1', shown: '1' });
  const own = await addItem(her, { name: 'Go-home folder', cost: '2', expense: '1', shown: '1' });
  let out = await bundle({ products: PRODUCTS, bag_items: [
    { id: 'bag-food', name: 'Food starter bag', cost: 0, origin: 'The food program\'s kit', product_id: 'acct-food' },
    { id: 'bag-blanket', name: 'scent blanket', cost: 4.5 },
    { id: 'bag-toy', name: 'Chew toy', cost: '6.25', expense: false, product_id: 'acct-gone' },
  ] });
  assert.equal(out.status, 200, JSON.stringify(out.body));
  const food = row("SELECT * FROM portal_bag_items WHERE kennelos_id = 'bag-food'");
  assert.equal(food.source, 'kennelos');
  assert.equal(food.product_id, row("SELECT id FROM products WHERE kennelos_id = 'acct-food'").id);
  assert.equal(food.button, 'Get more', 'filled in when it first arrives');
  assert.equal(food.origin, 'The food program\'s kit');
  const blanket = row('SELECT * FROM portal_bag_items WHERE id = ?', mine);
  assert.deepEqual([blanket.kennelos_id, blanket.cost_cents, blanket.expense, blanket.name], ['bag-blanket', 450, 1, 'scent blanket'], 'hers with the same name is taken over');
  const toy = row("SELECT * FROM portal_bag_items WHERE kennelos_id = 'bag-toy'");
  assert.deepEqual([toy.cost_cents, toy.expense, toy.product_id], [625, 0, null], 'a product it doesn\'t send is dropped');
  // Her switch, order and button words stay through the next push; KennelOS's cost changes.
  await her(`/portal/bag/${food.id}`, { button: 'Order more food', shown: '' });
  await her(`/portal/bag/${own}/up`, {});
  const order = rows('SELECT id FROM portal_bag_items ORDER BY sort').map((x) => x.id);
  out = await bundle({ bag_items: [
    { id: 'bag-food', name: 'Food starter bag', cost: 1, product_id: 'acct-food' },
    { id: 'bag-blanket', name: 'Scent blanket', cost: 4.5 },
  ] });
  assert.equal(out.status, 200, JSON.stringify(out.body));
  const food2 = row('SELECT * FROM portal_bag_items WHERE id = ?', food.id);
  assert.deepEqual([food2.cost_cents, food2.expense, food2.button, food2.shown, food2.origin], [100, 1, 'Order more food', 0, null]);
  assert.deepEqual(rows('SELECT id FROM portal_bag_items ORDER BY sort').map((x) => x.id), order);
  // Not sent again: hidden, not deleted, and out of the bag for new families. Hers untouched.
  assert.equal(row("SELECT hidden_by_kennelos FROM portal_bag_items WHERE kennelos_id = 'bag-toy'").hidden_by_kennelos, 1);
  assert.deepEqual({ ...row('SELECT source, kennelos_id, hidden_by_kennelos FROM portal_bag_items WHERE id = ?', own) }, { source: 'kennelport', kennelos_id: null, hidden_by_kennelos: 0 });
  const page = await (await her('/portal/bag')).text();
  assert.match(page, /No longer in KennelOS/);
  assert.match(page, /From KennelOS/);
  const one = await (await her(`/portal/bag/${food.id}`)).text();
  assert.match(one, /From KennelOS: change its name, cost/);
  assert.doesNotMatch(one, /name="cost"|>Remove</, 'no fields of KennelOS\'s, and no Remove');
  // Her form can't change KennelOS's fields, nor remove it.
  await her(`/portal/bag/${food.id}`, { name: 'Renamed', cost: '99', button: 'Order more food', shown: '1' });
  assert.equal(row('SELECT name, cost_cents FROM portal_bag_items WHERE id = ?', food.id).cost_cents, 100);
  assert.equal((await her(`/portal/bag/${food.id}/remove`, {})).status, 400);
  // A bundle with no bag_items leaves the bag alone; a bad cost is refused.
  await bundle({});
  assert.equal(row("SELECT hidden_by_kennelos FROM portal_bag_items WHERE kennelos_id = 'bag-food'").hidden_by_kennelos, 0);
  assert.equal((await bundle({ bag_items: [{ id: 'x', name: 'Toy', cost: -1 }] })).status, 400);
  // Unlink makes them hers; the hidden one stays off.
  await her('/kennelos/unlink', { confirm: 'yes' });
  assert.equal(rows("SELECT id FROM portal_bag_items WHERE source = 'kennelos' OR kennelos_id IS NOT NULL").length, 0);
  assert.equal(row('SELECT shown FROM portal_bag_items WHERE id = ?', toy.id).shown, 0);
});

const go = new Date(Date.now() + 9 * DAY).toISOString().slice(0, 10);
const REED = { id: 'fam-reed', name: 'The Reed family', emails: ['sam@example.com'], placements: [{ id: 'sale-1', puppy_name: 'Opal', contract_signed_on: '2026-11-01', go_home_on: go }] };

test('what went home goes back to KennelOS with her costs, once the bag is the puppy\'s own', async () => {
  const { her, bundle, feed, row } = await linkedSetup();
  await bundle({ products: PRODUCTS, bag_items: [{ id: 'bag-toy', name: 'Chew toy', cost: 6.5 }, { id: 'bag-food', name: 'Food starter bag', cost: 0, product_id: 'acct-food' }] });
  let out = await feed({ families: [REED] });
  const fam = row("SELECT id FROM portal_families WHERE kennelos_id = 'fam-reed'").id;
  out = await feed({ families: [REED] });
  assert.equal(out.facts.find((x) => x.id === 'sale-1')?.bag, undefined, 'not before it is fixed');
  await her(`/portal/f/${fam}/picked-up`, {});
  out = await feed({ families: [REED] });
  assert.deepEqual(out.facts.find((x) => x.id === 'sale-1').bag, {
    items: [{ bag_item_id: 'bag-toy', name: 'Chew toy', cost: 6.5, expense: true }, { bag_item_id: 'bag-food', name: 'Food starter bag', cost: 0, expense: false }],
    cost: 6.5, expensed: 6.5,
  });
  // A change to this family's bag is in the next reply; one of hers has no KennelOS id.
  const p = row('SELECT id FROM portal_placements WHERE family_id = ?', fam).id;
  const toyRow = row("SELECT id FROM portal_placement_bag WHERE placement_id = ? AND name = 'Chew toy'", p).id;
  await her(`/portal/f/${fam}/bag`, form({ [`sent.${toyRow}`]: '1', add: 'Extra treats' }));
  out = await feed({ families: [REED] });
  assert.deepEqual(out.facts.find((x) => x.id === 'sale-1').bag, {
    items: [{ bag_item_id: 'bag-toy', name: 'Chew toy', cost: 6.5, expense: false }, { name: 'Extra treats', cost: 0, expense: false }],
    cost: 6.5, expensed: 0,
  });
  // Nothing went: an empty list.
  await her(`/portal/f/${fam}/bag`, {});
  out = await feed({ families: [REED] });
  assert.deepEqual(out.facts.find((x) => x.id === 'sale-1').bag, { items: [], cost: 0, expensed: 0 });
});

// The Extras block (content/blocks.js extras, render/pages/extras.js, 2026-11-18): her
// extras chosen by the owner's conditions on any page, as step cards by default (the
// price where a step has its number, then a More details fold), or package cards or
// expanders; her description on the website over KennelOS's; and the Extras page using
// hers too.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, addSite } from './helpers/env.js';

const { buildSnapshot } = await import('../src/publish.js');
const { renderPage } = await import('../src/render/index.js');
const { pageBlocks, cleanBlock, newBlock, blocksFromForm } = await import('../src/content/blocks.js');
const { importContent } = await import('../src/content/io.js');
const { AK_SAMPLE } = await import('../src/content/akSample.js');
const { saveRecord } = await import('../src/content/records.js');
const { EXTRA_FIELDS } = await import('../src/content/model.js');

const MEMORY = [
  { kind: 'item', grp: 'Memory packages', name: 'Extra photos', price_from: 5, description: '5–10 photos per session.', details: 'You choose the age.\n\nDigital delivery only (no prints).' },
  { kind: 'item', grp: 'Memory packages', name: 'Two photo sessions', price_from: 8, description: '2 separate sessions at different ages.' },
  { kind: 'item', grp: 'Memory packages', name: 'The Works', price_from: 50, description: 'Everything.', site_description: 'Three photo sessions, two videos and a tumbler.', lead_in: 'It includes:', checklist: ['3 photo sessions', '2 extra videos', 'Customized tumbler'] },
  { kind: 'item', grp: 'Travel', name: 'Crate', price_from: 60 },
];

async function site(t, extra = {}) {
  const env = await makeEnv();
  const s = await addSite(env, `akx${Math.random().toString(36).slice(2, 8)}`);
  const doc = structuredClone(AK_SAMPLE);
  doc.extras = [...doc.extras, ...MEMORY];
  Object.assign(doc.site, extra);
  await importContent(env, s.id, doc);
  const snap = await buildSnapshot(env, s.id);
  const block = (o = {}) => cleanBlock({ ...newBlock('extras', 'extras-2'), where: [{ field: 'grp', op: 'is', value: 'Memory packages' }], ...o });
  const draw = (b, p = '/contact') => renderPage({ ...snap, layout: { ...snap.layout, contact: [...pageBlocks(null, 'contact'), b] } }, { path: p, origin: 'https://x', today: '2027-03-10', preview: true }).html;
  return { env, s, snap, block, draw };
}
const section = (html) => html.slice(html.lastIndexOf('<section class="section tight"><div class="wrap"><div class="head'));

test('a new Extras block is step cards in a slider: the price as the big figure, the name, her words, More details and Ask', async (t) => {
  const { block, draw } = await site(t);
  const b = block();
  assert.equal(b.style, 'steps');
  assert.deepEqual(b.show, { items: ['name', 'description', 'details', 'ask'], big: 'price' });
  const html = draw(b);
  assert.match(html, /<div class="slider" data-slider><div class="track three"><article class="step"><span class="n">\$5<\/span><h3>Extra photos<\/h3><p>5–10 photos per session.<\/p><details class="x"><summary>More details<\/summary><div class="body"><p>You choose the age.<\/p><p>Digital delivery only \(no prints\).<\/p><\/div><\/details><a class="more" href="[^"]+">Ask about this<\/a><\/article>/);
  // Only the group the condition names; nothing from Travel.
  assert.match(html, /Two photo sessions/);
  assert.doesNotMatch(html, /<h3>Crate<\/h3>/);
  // Her description on the website over KennelOS's; a checklist goes in More details.
  assert.match(html, /<h3>The Works<\/h3><p>Three photo sessions, two videos and a tumbler.<\/p><details class="x"><summary>More details<\/summary><div class="body"><p class="small muted lead">It includes:<\/p><ul class="checks"><li>3 photo sessions<\/li>/);
  assert.doesNotMatch(html, /<p>Everything.<\/p>/);
  // An extra with no details and no checklist has no fold.
  assert.match(html, /<h3>Two photo sessions<\/h3><p>2 separate sessions at different ages.<\/p><a class="more"/);
});

test('its style, big figure, order of items, limit and groups are the owner\'s', async (t) => {
  const { block, draw } = await site(t);
  // A grid of step cards, numbered, with the price as a line under the name.
  let html = draw(block({ style: 'stepgrid', show: { big: 'number', items: ['name', 'price', 'ask'] } }));
  assert.match(html, /<div class="grid"><article class="step"><span class="n">1<\/span><h3>Extra photos<\/h3><div class="price">\$5<\/div><a class="more"/);
  assert.match(html, /<span class="n">3<\/span><h3>The Works<\/h3>/);
  // Package cards: the big figure in the weeks spot.
  html = draw(block({ style: 'pkgs', limit: 2, show: { big: 'price', items: ['group', 'name', 'description', 'details', 'ask'] } }));
  assert.match(html, /<div class="pkgs"><article class="pkg"><div class="weeks"><b>\$5<\/b><span><\/span><\/div><span class="eyebrow">Memory packages<\/span><h3>Extra photos<\/h3>/);
  assert.doesNotMatch(html, /The Works/);
  // Expanders: the name and price to tap; More details open inside.
  html = draw(block({ style: 'list', show: { big: 'price', items: ['group', 'name', 'description', 'details', 'ask'] } }));
  assert.match(html, /<div class="acc"><details class="x"><summary>Extra photos · \$5<\/summary><div class="body"><span class="eyebrow">Memory packages<\/span><p>5–10 photos per session.<\/p><p>You choose the age.<\/p>/);
  // Grouped by group, every extra: a heading over each.
  html = draw(block({ where: [], group: 'grp', style: 'stepgrid' }));
  assert.match(html, /<h3>Memory packages<\/h3><\/div><div class="grid">/);
  assert.match(html, /<h3>Travel<\/h3><\/div><div class="grid"><article class="step"><span class="n">\$60<\/span>/);
  // Ordered by price, highest first.
  html = section(draw(block({ order: 'price:down', style: 'stepgrid', show: { big: 'none', items: ['name'] } })));
  assert.ok(html.indexOf('The Works') < html.indexOf('Two photo sessions') && html.indexOf('Two photo sessions') < html.indexOf('Extra photos'));
});

test('with prices off, no price figure; a price line says to contact', async (t) => {
  const { block, draw } = await site(t, { show_other_prices: false });
  const html = draw(block({ show: { big: 'price', items: ['name', 'price'] } }));
  assert.doesNotMatch(section(html), /class="n"/);
  assert.match(html, /<h3>Extra photos<\/h3><div class="price">[^<$]+<\/div>/);
});

test('the owner\'s form reads the style, the big figure and the items; nothing matching hides it', async (t) => {
  const { block, draw } = await site(t);
  const b = block();
  const f = new Map([['b.extras-2.present', '1'], ['b.extras-2.style', 'pkgs'], ['b.extras-2.limit', ''], ['b.extras-2.show.big', 'weeks'],
    ['b.extras-2.show.items', 'ask,name'], ['b.extras-2.show.items.ask', 'on'], ['b.extras-2.show.items.name', 'on'],
    ['b.extras-2.where.0.field', 'grp'], ['b.extras-2.where.0.op', 'is'], ['b.extras-2.where.0.value', 'memory packages']]);
  const [next] = blocksFromForm([b], (n) => f.get(n) ?? null, (n) => (f.has(n) ? [f.get(n)] : []), 'contact');
  assert.equal(next.style, 'pkgs');
  assert.deepEqual(next.show, { items: ['ask', 'name'], big: 'weeks' });
  assert.equal(draw(block({ where: [{ field: 'grp', op: 'is', value: 'Nothing like it' }] })).includes('Ask about this</a></article>'), false);
});

test('her description on the website is hers: kept with KennelOS\'s, and shown over it on the Extras page', async (t) => {
  const { env, s } = await site(t);
  const row = env.DB.raw.prepare("SELECT * FROM extras WHERE site_id = ? AND name = 'Two photo sessions'").get(s.id);
  const input = Object.fromEntries(Object.keys(EXTRA_FIELDS).map((k) => [k, row[k]]));
  await saveRecord(env, s.id, 'extras', row.id, { ...input, checklist: [], site_description: 'Two sessions, a few weeks apart.', details: 'Any two ages you like.' });
  const snap = await buildSnapshot(env, s.id);
  const x = snap.extras.find((e) => e.name === 'Two photo sessions');
  assert.equal(x.site_description, 'Two sessions, a few weeks apart.');
  assert.equal(x.details, 'Any two ages you like.');
  const page = renderPage(snap, { path: '/extras', origin: 'https://x', today: '2027-03-10', preview: true }).html;
  assert.match(page, /<h3>Two photo sessions<\/h3><span class="eyebrow">Memory packages<\/span><div class="price">\$8<\/div><p>Two sessions, a few weeks apart.<\/p>/);
});

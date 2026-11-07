// Outside dogs (migration 0029), light cards that only say where a dog lives when
// that is true, the Photo beside details card, and the line between stacked cards.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, addSite } from './helpers/env.js';

const { buildSnapshot } = await import('../src/publish.js');
const { renderPage } = await import('../src/render/index.js');
const { newBlock, cleanBlock, HOME_DEFAULT } = await import('../src/content/blocks.js');
const { importContent, exportContent } = await import('../src/content/io.js');
const { AK_SAMPLE } = await import('../src/content/akSample.js');

async function site() {
  const env = await makeEnv();
  const s = await addSite(env, 'akout');
  const doc = structuredClone(AK_SAMPLE);
  doc.dogs.push({ slug: 'duke', call_name: 'Duke', sex: 'male', outside: true, for_sale: true, owner_name: 'Oakridge Bostons', owner_url: 'https://oakridge.example', bio: 'A gentle stud.' });
  await importContent(env, s.id, doc);
  const snap = await buildSnapshot(env, s.id);
  const draw = (home, p = '/') => renderPage({ ...snap, layout: { ...snap.layout, ...(home ? { home } : {}) } }, { path: p, origin: 'https://x', today: '2027-03-10', preview: true }).html;
  return { env, s, snap, draw };
}

test('an outside dog is in none of her groups, nor on Home, but has its page with its owner', async () => {
  const { env, s, snap, draw } = await site();
  const duke = snap.dogs.find((d) => d.slug === 'duke');
  assert.equal(duke.outside, true);
  assert.equal(duke.for_sale, false, 'an outside dog is never for sale here');
  assert.doesNotMatch(draw(null, '/dogs'), /Duke/);
  assert.doesNotMatch(draw(null, '/'), /Duke/);
  assert.match(draw(null, '/dogs/duke'), /<dt>Owned by<\/dt><dd><a href="https:\/\/oakridge.example\/" rel="noopener">Oakridge Bostons<\/a>/);
  const back = (await exportContent(env, s.id)).dogs.find((d) => d.slug === 'duke');
  assert.equal(back.outside, true);
  assert.equal(back.owner_name, 'Oakridge Bostons');
});

test('light cards of her own dogs say nothing about partner kennels; an outside dog names its owner', async () => {
  const { draw } = await site();
  const light = cleanBlock({ ...newBlock('dogs', 'dogs-2'), style: 'light', f: { status: ['active'], sex: 'any', outside: 'any' } });
  const html = draw([...HOME_DEFAULT, light]);
  assert.doesNotMatch(html, /Lives with a partner kennel/);
  assert.match(html, /class="cocard"[^]*Owned by Oakridge Bostons/);
});

test('photo beside details: its items beside the photo, the bio under them; the line between cards is the block\'s', async () => {
  const { draw } = await site();
  const b = cleanBlock({ ...newBlock('dogs', 'dogs-2'), style: 'beside', lines: true, f: { status: ['active'], sex: 'any', outside: 'only' } });
  const html = draw([...HOME_DEFAULT, b]);
  assert.match(html, /<div class="dogrows one lines"><article class="dogrow[^"]*"><div class="dr-top">[^]*?<div class="dr-info"><span class="call">Duke<\/span>[^]*?<\/div><\/div><div class="dr-under"><p class="bio">A gentle stud\.<\/p>/);
  assert.doesNotMatch(draw([...HOME_DEFAULT, { ...b, lines: false }]), /dogrows one lines/);
});

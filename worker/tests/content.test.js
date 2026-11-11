import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, addSite } from './helpers/env.js';

const { importContent, exportContent, cleanDocument } = await import('../src/content/io.js');
const { AK_SAMPLE } = await import('../src/content/akSample.js');

test('the AK sample imports, and exports back as the same content', async () => {
  const env = await makeEnv();
  const site = await addSite(env, 'akbostons');
  await importContent(env, site.id, AK_SAMPLE);
  const doc = await exportContent(env, site.id);
  assert.equal(doc.site.kennel_name, 'AK Boston Terriers');
  assert.deepEqual(doc.dogs.map((d) => d.slug), ['willow', 'ziva', 'peaches', 'pearl', 'boone']);
  assert.equal(doc.dogs[4].health.length, 5);
  assert.equal(doc.litters[0].dam, 'willow');
  assert.deepEqual(doc.litters[0].puppies.map((p) => p.status), ['available', 'available', 'placed']);
  assert.equal(doc.extras[2].featured, true);
  assert.deepEqual(doc.home.facts.items[0], ['5', 'Bostons at home']);
  // Importing the export changes nothing.
  await importContent(env, site.id, doc);
  assert.deepEqual(await exportContent(env, site.id), doc);
});

test('a re-import keeps ids by slug and removes what is gone', async () => {
  const env = await makeEnv();
  const site = await addSite(env, 'akbostons');
  await importContent(env, site.id, AK_SAMPLE);
  const before = await env.DB.prepare("SELECT id FROM dogs WHERE slug = 'willow'").first('id');
  const doc = structuredClone(AK_SAMPLE);
  doc.dogs = doc.dogs.filter((d) => d.slug !== 'pearl');
  doc.litters = doc.litters.filter((l) => l.dam !== 'pearl');
  doc.dogs[0].call_name = 'Willow (renamed)';
  await importContent(env, site.id, doc);
  assert.equal(await env.DB.prepare("SELECT id FROM dogs WHERE slug = 'willow'").first('id'), before);
  assert.equal(await env.DB.prepare("SELECT call_name FROM dogs WHERE slug = 'willow'").first('call_name'), 'Willow (renamed)');
  assert.equal(await env.DB.prepare("SELECT COUNT(*) AS n FROM dogs").first('n'), 4);
});

test('bad content is refused with where it went wrong, and nothing is written', async () => {
  const env = await makeEnv();
  const site = await addSite(env, 'akbostons');
  const bad = [
    [{ dogs: [{ slug: 'Bad Slug', call_name: 'X', sex: 'female' }] }, /dogs\[0\]\.slug/],
    [{ dogs: [{ slug: 'x', call_name: 'X', sex: 'female', colour: 'red' }] }, /dogs\[0\]\.colour: not a known field/],
    [{ litters: [{ slug: 'l', name: 'L', stage: 'current', dam: 'nobody' }] }, /litters\[0\]\.dam: no dog/],
    [{ pages: { contact: { enabled: false } } }, /always on/],
    [{ home: { hero: { photos: ['nope'] } } }, /no photo with id nope/],
    [{ extras: [{ kind: 'item', name: 'X', price_from: 10, price_to: 5 }] }, /lower than price_from/],
    [{ nonsense: [] }, /not a section/],
  ];
  for (const [doc, re] of bad) await assert.rejects(importContent(env, site.id, doc), re);
  assert.equal(await env.DB.prepare('SELECT COUNT(*) AS n FROM dogs').first('n'), 0);
  assert.throws(() => cleanDocument({ dogs: [{ slug: 'a', call_name: 'A', sex: 'female' }, { slug: 'a', call_name: 'B', sex: 'male' }] }), /used twice/);
});

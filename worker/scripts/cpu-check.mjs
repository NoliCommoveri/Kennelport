// Plan 4.4: how much CPU publishing and rendering take, on AK's content grown to
// a few years' worth (20 litters, 60 puppies, 60 reviews). Run from worker/:
//   node scripts/cpu-check.mjs
// The free Workers plan allows about 10 ms of CPU a request (check current
// limits); D1 and R2 waits don't count. Node on a laptop is close to the Workers
// runtime, so treat these as estimates and confirm on staging's logs.
import { makeEnv, addSite } from '../tests/helpers/env.js';
const { importContent } = await import('../src/content/io.js');
const { AK_SAMPLE } = await import('../src/content/akSample.js');
const { buildSnapshot } = await import('../src/publish.js');
const { renderPage } = await import('../src/render/index.js');

const doc = structuredClone(AK_SAMPLE);
for (let y = 0; y < 5; y++) for (let i = 0; i < 4; i++) {
  doc.litters.push({ slug: `past-${y}-${i}`, name: `Litter ${y}-${i}`, stage: 'past', dam: 'willow', sire: 'boone', born_on: `202${y}-0${i + 1}-10`,
    puppies: [1, 2, 3].map((n) => ({ slug: `p${n}`, name: `Pup ${n}`, sex: n % 2 ? 'female' : 'male', status: 'placed', bio: 'A happy puppy who went home to a loving family.'.repeat(3) })) });
}
for (let i = 0; i < 55; i++) doc.reviews.push({ ...AK_SAMPLE.reviews[i % 5], first_name: `Family ${i}` });

const env = await makeEnv();
const site = await addSite(env, 'akbostons');
await importContent(env, site.id, doc);
const snap = await buildSnapshot(env, site.id);
snap.id = 'x';
const body = JSON.stringify(snap);

const time = (fn, n = 50) => { fn(); const t = performance.now(); for (let i = 0; i < n; i++) fn(); return (performance.now() - t) / n; };
const ctx = (path) => ({ path, origin: 'https://akbostons.kennelport.com', today: '2026-11-02', preview: false });
console.log(`snapshot: ${(body.length / 1024).toFixed(0)} KB`);
console.log(`stringify (publish): ${time(() => JSON.stringify(snap)).toFixed(2)} ms`);
console.log(`parse (cold render): ${time(() => JSON.parse(body)).toFixed(2)} ms`);
for (const p of ['/', '/litters', '/dogs', '/reviews', '/extras', '/litters/gem-2026']) {
  console.log(`render ${p}: ${time(() => renderPage(snap, ctx(p))).toFixed(2)} ms`);
}

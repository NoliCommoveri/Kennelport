import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';

const { importContent } = await import('../src/content/io.js');
const { AK_SAMPLE } = await import('../src/content/akSample.js');
const { publish, undoPublish, buildSnapshot, listSnapshots, forgetSnapshots, KEEP } = await import('../src/publish.js');
const { makePreviewToken } = await import('../src/site.js');

const H = 'akbostons.kennelport.com';

async function akSite() {
  forgetSnapshots();
  const env = await makeEnv();
  const site = await addSite(env, 'akbostons');
  await importContent(env, site.id, AK_SAMPLE);
  return { env, site };
}

test('before the first publish, visitors see "being built"; after it, the site', async () => {
  const { env, site } = await akSite();
  assert.match(await (await call(env, H, '/')).text(), /being built/);
  await publish(env, site.id, 'test');
  const res = await call(env, H, '/');
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Small dogs with big hearts/);
  assert.match(html, /<meta property="og:title" content="AK Boston Terriers">/);
  assert.match(res.headers.get('content-security-policy'), /script-src 'self'/);
  assert.doesNotMatch(html, /\sstyle="/, 'no inline styles: the CSP would block them');
  assert.doesNotMatch(html, /fonts\.googleapis|gstatic|cdn/i);
  assert.equal((await env.DB.prepare('SELECT status FROM sites WHERE id = ?').bind(site.id).first('status')), 'live');
});

test('every page of the AK sample renders, and the snapshot holds only what visitors may see', async () => {
  const { env, site } = await akSite();
  await env.DB.prepare("UPDATE health_results SET show = 0 WHERE test = 'Cardiac (OFA)'").run();
  await env.DB.prepare("UPDATE puppies SET status = 'hidden' WHERE slug = 'diamond'").run();
  await env.DB.prepare("UPDATE dogs SET show_on_site = 0 WHERE slug = 'pearl'").run();
  await publish(env, site.id, 'test');
  for (const p of ['/', '/about', '/reviews', '/contact', '/dogs', '/dogs/willow', '/litters', '/litters/older', '/litters/gem-2026', '/litters/gem-2026/opal', '/how-it-works', '/extras', '/policies', '/faq', '/waitlist', '/waitlist/help', '/privacy']) {
    assert.equal((await call(env, H, p)).status, 200, p);
  }
  const snap = await buildSnapshot(env, site.id);
  assert.ok(!snap.dogs.some((d) => d.slug === 'pearl'));
  assert.ok(!snap.dogs.find((d) => d.slug === 'boone').health.some((h) => h.test === 'Cardiac (OFA)'));
  assert.ok(!snap.litters[0].puppies.some((p) => p.slug === 'diamond'));
  assert.equal((await call(env, H, '/dogs/pearl')).status, 404);
  assert.equal((await call(env, H, '/litters/gem-2026/diamond')).status, 404);
  assert.ok(!JSON.stringify(snap).includes('permission_confirmed_at'));
});

test('a switched-off or empty page is a 404 and leaves the menu', async () => {
  const { env, site } = await akSite();
  await importContent(env, site.id, { pages: { faq: { enabled: false } }, extras: [] });
  await publish(env, site.id, 'test');
  assert.equal((await call(env, H, '/faq')).status, 404);
  assert.equal((await call(env, H, '/extras')).status, 404);
  const home = await (await call(env, H, '/')).text();
  assert.doesNotMatch(home, /href="\/faq"/);
  assert.doesNotMatch(home, /href="\/extras"/);
  assert.match(home, /href="\/policies"/);
});

test('prices show only with Show other prices on', async () => {
  const { env, site } = await akSite();
  await publish(env, site.id, 'test');
  assert.match(await (await call(env, H, '/extras')).text(), /\$2,500–\$2,800/);
  await importContent(env, site.id, { site: { show_other_prices: false } });
  await publish(env, site.id, 'test');
  const html = await (await call(env, H, '/extras')).text();
  assert.doesNotMatch(html, /\$2,500/);
  assert.match(html, /Contact us for pricing/);
});

test('a renamed slug redirects from its old address', async () => {
  const { env, site } = await akSite();
  await publish(env, site.id, 'test');
  await env.DB.prepare("UPDATE dogs SET slug = 'willow-girl' WHERE slug = 'willow'").run();
  await publish(env, site.id, 'test');
  const res = await call(env, H, '/dogs/willow');
  assert.equal(res.status, 301);
  assert.equal(res.headers.get('location'), '/dogs/willow-girl');
  // Renamed again: the oldest address goes straight to the newest.
  await env.DB.prepare("UPDATE dogs SET slug = 'willow-the-great' WHERE slug = 'willow-girl'").run();
  await publish(env, site.id, 'test');
  assert.equal((await call(env, H, '/dogs/willow')).headers.get('location'), '/dogs/willow-the-great');
});

test('drafts are invisible until published; undo goes back; only the last 10 are kept', async () => {
  const { env, site } = await akSite();
  await publish(env, site.id, 'test');
  await importContent(env, site.id, { home: { hero: { headline: 'A brand new headline' } } });
  assert.doesNotMatch(await (await call(env, H, '/')).text(), /A brand new headline/);
  await publish(env, site.id, 'test');
  assert.match(await (await call(env, H, '/')).text(), /A brand new headline/);
  await undoPublish(env, site.id);
  assert.doesNotMatch(await (await call(env, H, '/')).text(), /A brand new headline/);
  await assert.rejects(undoPublish(env, site.id), /no earlier version/);

  for (let i = 0; i < KEEP + 3; i++) await publish(env, site.id, 'test');
  assert.equal((await listSnapshots(env, site.id)).length, KEEP);
  const objects = [...env.FILES.store.keys()].filter((k) => k.includes('/snapshots/'));
  assert.equal(objects.length, KEEP);
});

test('a preview link shows the draft on the site itself, marked as a preview', async () => {
  const { env, site } = await akSite();
  await publish(env, site.id, 'test');
  await importContent(env, site.id, { home: { hero: { headline: 'Draft headline' } } });
  const token = await makePreviewToken(env, site.id);
  const open = await call(env, H, `/__preview?t=${encodeURIComponent(token)}`);
  assert.equal(open.status, 303);
  const cookie = open.headers.get('set-cookie').split(';')[0];
  const page = await call(env, H, '/', { headers: { cookie } });
  const html = await page.text();
  assert.match(html, /Draft headline/);
  assert.match(html, /class="preview-bar"/);
  assert.match(html, /noindex/);
  assert.equal(page.headers.get('cache-control'), 'private, no-store');
  // Without the cookie, visitors still see the published version.
  assert.doesNotMatch(await (await call(env, H, '/')).text(), /Draft headline/);
  // A token for another site, or a forged one, is refused.
  const other = await addSite(env, 'other');
  const wrong = await makePreviewToken(env, other.id);
  assert.equal((await call(env, H, `/__preview?t=${encodeURIComponent(wrong)}`)).status, 403);
  assert.equal((await call(env, H, `/__preview?t=${site.id}.9999999999.abc`)).status, 403);
});

test('photos are served only if the snapshot lists them', async () => {
  const { env, site } = await akSite();
  const id = crypto.randomUUID();
  await env.FILES.put(`sites/${site.id}/photos/${id}.webp`, new Uint8Array([1, 2, 3]));
  await env.DB.prepare("INSERT INTO photos (id, site_id, r2_key, type, bytes, created_at) VALUES (?, ?, ?, 'image/webp', 3, '2026-11-02T00:00:00Z')").bind(id, site.id, `sites/${site.id}/photos/${id}.webp`).run();
  await publish(env, site.id, 'test');
  assert.equal((await call(env, H, `/_kp/p/${id}`)).status, 404, 'uploaded but used nowhere');
  await importContent(env, site.id, { home: { hero: { photos: [id] } } });
  await publish(env, site.id, 'test');
  const res = await call(env, H, `/_kp/p/${id}`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'image/webp');
  assert.match(await (await call(env, H, '/')).text(), new RegExp(`og:image" content="https://${H}/_kp/p/${id}`));
});

test('sitemap, robots, trailing slashes and the template files', async () => {
  const { env, site } = await akSite();
  await publish(env, site.id, 'test');
  const map = await (await call(env, H, '/sitemap.xml')).text();
  assert.match(map, /<loc>https:\/\/akbostons\.kennelport\.com\/dogs\/willow<\/loc>/);
  assert.match(await (await call(env, H, '/robots.txt')).text(), /Sitemap: https:\/\/akbostons/);
  assert.equal((await call(env, H, '/about/')).headers.get('location'), '/about');
  const css = await call(env, H, '/_kp/t/ak/site.css');
  assert.equal(css.status, 200);
  assert.doesNotMatch(await css.text(), /@font-face/);
  const scheme = await call(env, H, '/_kp/t/ak/scheme-lawn.css');
  assert.equal(scheme.status, 200);
  assert.match(await scheme.text(), /@font-face \{ font-family: "Fraunces"/);
  assert.equal((await call(env, 'manage.kennelport.com', '/_kp/fonts/mulish-400.woff2')).headers.get('cache-control'), 'public, max-age=31536000, immutable');
  assert.equal((await call(env, H, '/', { method: 'POST' })).status, 405);
});

test("a puppy card links to that puppy's own page, whatever its status, and only with the Puppies page on", async () => {
  const { env, site } = await akSite();
  // The Gem litter's deposits are still ahead, so it sits under Coming up and its
  // available pups read "Available on <date>": the case with no way through before.
  await env.DB.prepare("UPDATE litters SET deposits_on = '2099-01-01' WHERE slug = 'gem-2026'").run();
  await publish(env, site.id, 'test');
  const litter = await (await call(env, H, '/litters/gem-2026')).text();
  // Available, available-on-a-date and reserved pups all get the link, and it answers.
  for (const slug of ['opal', 'diamond', 'onyx']) {
    assert.match(litter, new RegExp(`href="/litters/gem-2026/${slug}">View profile</a>`), slug);
    assert.equal((await call(env, H, `/litters/gem-2026/${slug}`)).status, 200, slug);
  }
  assert.match(litter, /Available on/, 'deposits ahead: the status says the date');
  // Coming up leads to the litter page, which now leads to each puppy.
  assert.match(await (await call(env, H, '/litters')).text(), /href="\/litters\/gem-2026">Meet the puppies<\/a>/);
  // A current litter's pups on the Puppies page carry it too.
  assert.match(await (await call(env, H, '/litters')).text(), /href="\/litters\/ziva-boone-2026\/contessa">View profile<\/a>/);
  // The Older puppies page can be on with Puppies off, and the puppy route needs
  // Puppies on: no link there that would 404.
  await importContent(env, site.id, { pages: { litters: { enabled: false } } });
  await publish(env, site.id, 'test');
  const older = await (await call(env, H, '/litters/older')).text();
  assert.equal(older.includes('Contessa'), true, 'the older puppy is still shown');
  assert.equal(older.includes('View profile'), false, 'no link to a page that is switched off');
  assert.equal((await call(env, H, '/litters/gem-2026/opal')).status, 404);
});

test('what Publish would change: a field an older snapshot lacks, blank in the draft, is no change', async () => {
  const { changes } = await import('../src/diff.js');
  const { env, site } = await akSite();
  const draft = await buildSnapshot(env, site.id);
  assert.deepEqual(changes(structuredClone(draft), draft), []);
  // Published before columns were added: those keys are missing, not blank.
  const old = structuredClone(draft);
  for (const d of old.dogs) { delete d.registry; d.health = d.health.map((h) => Object.fromEntries(Object.entries(h).reverse())); }
  for (const l of old.litters) { delete l.ask_full_reg; delete l.more_photos_url; for (const p of l.puppies) { delete p.registration; delete p.registry; } }
  assert.deepEqual(changes(old, draft), []);
  // A real change still shows, a switch turned off included.
  const next = structuredClone(draft);
  next.dogs[0].registry = 'AKC';
  next.litters[0].show_prices = !draft.litters[0].show_prices;
  assert.deepEqual(changes(old, next).map((x) => x.text), [`${draft.dogs[0].call_name}: edited`, `${draft.litters[0].name}: edited`]);
});

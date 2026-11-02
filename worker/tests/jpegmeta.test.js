// The browser step that drops the EXIF block Apple's JPEG encoder adds (iPhone
// browsers can't make WebP). The same function is in the manage app and the site
// template; both copies are run here against the server's own check.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { jpeg } from './helpers/images.js';

const { checkPhoto, PhotoError } = await import('../src/photos.js');
const FILES = ['../public/_kp/m/photos.js', '../public/_kp/t/ak/site.js'];

async function load(path) {
  const src = await readFile(new URL(path, import.meta.url), 'utf8');
  const m = src.match(/\/\/ strip-jpeg-meta:start[\s\S]*?\n(\s*async function stripJpegMeta[\s\S]*?)\n\s*\/\/ strip-jpeg-meta:end/);
  assert.ok(m, `stripJpegMeta in ${path}`);
  return { body: m[1].trim(), fn: new Function(`${m[1]}; return stripJpegMeta;`)() };
}

test('both copies are the same', async () => {
  const [a, b] = await Promise.all(FILES.map(load));
  assert.equal(a.body, b.body);
});

for (const path of FILES) {
  test(`an iPhone-style JPEG passes the server check once cleaned (${path.split('/').at(-1)})`, async () => {
    const { fn } = await load(path);
    const raw = jpeg(1600, 1200, { exif: true });
    assert.throws(() => checkPhoto(raw), PhotoError);
    const out = new Uint8Array(await (await fn(new Blob([raw], { type: 'image/jpeg' }))).arrayBuffer());
    assert.deepEqual(checkPhoto(out), { type: 'image/jpeg', width: 1600, height: 1200, bytes: out.length });
    // A clean JPEG and a WebP come through unchanged.
    const clean = jpeg(800, 600);
    assert.deepEqual(new Uint8Array(await (await fn(new Blob([clean], { type: 'image/jpeg' }))).arrayBuffer()), clean);
    const webp = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/webp' });
    assert.equal(await fn(webp), webp);
  });
}

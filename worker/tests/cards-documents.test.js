// The Cards block (content/blocks.js cards, render/pages/cards.js) and documents
// (documents.js, manage/builder/documents.js), 2026-11-18: free cards of any photo,
// big figure, labels, heading, words and button; a site's PDFs, uploaded in the admin
// view, which any button can open ("A document").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, call, addSite } from './helpers/env.js';

const { buildSnapshot } = await import('../src/publish.js');
const { renderPage } = await import('../src/render/index.js');
const { pageBlocks, cleanBlock, newBlock, blocksFromForm } = await import('../src/content/blocks.js');
const { importContent } = await import('../src/content/io.js');
const { AK_SAMPLE } = await import('../src/content/akSample.js');
const { checkPdf, DocumentError, addDocument, fileName } = await import('../src/documents.js');
const { saveBuild } = await import('../src/content/rules.js');

const M = 'manage.kennelport.com';
const PDF = new TextEncoder().encode('%PDF-1.4\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF\n');
const pdfFile = (name = 'Puppy packages.pdf', bytes = PDF) => new File([bytes], name, { type: 'application/pdf' });

async function site() {
  const env = await makeEnv();
  const s = await addSite(env, `akc${Math.random().toString(36).slice(2, 8)}`);
  await importContent(env, s.id, structuredClone(AK_SAMPLE));
  const draw = async (b, p = '/contact') => {
    const snap = await buildSnapshot(env, s.id);
    return renderPage({ ...snap, layout: { ...snap.layout, contact: [...pageBlocks(null, 'contact'), cleanBlock(b)] } }, { path: p, origin: 'https://x', today: '2027-03-10', preview: true }).html;
  };
  return { env, s, draw };
}
const cardsOf = (html) => html.slice(html.indexOf('<section class="section tight own-cards'));

test('a PDF is checked by its first bytes and its size', () => {
  checkPdf(PDF);
  assert.throws(() => checkPdf(new TextEncoder().encode('<html>')), DocumentError);
  assert.throws(() => checkPdf(new Uint8Array(0)), DocumentError);
  assert.throws(() => checkPdf(new Uint8Array(11 * 1024 * 1024).fill(37)), /at most 10 MB/);
  assert.equal(fileName('Liam’s puppy packages (v2).PDF'), 'Liams-puppy-packages-v2.pdf');
});

test('cards draw any of their parts; an empty card is left out; a grid by default', async () => {
  const { draw } = await site();
  const b = { ...newBlock('cards', 'cards'), w: { heading: 'Anything', line: '' }, cards: [
    { big: '$5', labels: 'New, Limited', heading: 'First', text: 'One.\n\nTwo.', button: 'Go', link: { to: 'page', page: 'contact' } },
    { heading: 'Words only' },
    {},
  ] };
  const html = cardsOf(await draw(b));
  assert.match(html, /<div class="own-cardgrid n-3"><article class="own-card"><div class="body"><span class="n">\$5<\/span><span class="line1 tags"><span class="status c-accent">New<\/span><span class="status c-accent">Limited<\/span><\/span><h3>First<\/h3><div class="words"><p>One.<\/p><p>Two.<\/p><\/div><div class="go"><a class="btn line sz-s" href="\/contact">Go<\/a><\/div><\/div><\/article><article class="own-card"><div class="body"><h3>Words only<\/h3><\/div><\/article><\/div>/);
  assert.equal(cleanBlock(b).cards.length, 2);
  // In a slider, four across.
  assert.match(cardsOf(await draw({ ...b, style: 'slider', across: '4' })), /<div class="slider" data-slider><div class="track"><article class="own-card">/);
  // None: it hides.
  assert.doesNotMatch(await draw({ ...b, cards: [] }), /own-cards/);
});

test('a button can open a document from any block; one gone hides the button', async () => {
  const { env, s, draw } = await site();
  const id = await addDocument(env, s.id, pdfFile(), 'Memory packages');
  // A card, with its size beside the button.
  let html = cardsOf(await draw({ ...newBlock('cards', 'cards'), cards: [{ heading: 'Packages', button: 'Open now', link: { to: 'doc', value: id } }] }));
  assert.match(html, new RegExp(`<a class="btn line sz-s" href="/_kp/d/${id}" rel="noopener noreferrer" target="_blank">Open now</a><span class="small muted">PDF · 1 KB</span>`));
  // A plain Button block, too.
  html = await draw({ ...newBlock('button', 'button'), w: { label: 'Read it' }, link: { to: 'doc', value: id } });
  assert.match(html, new RegExp(`href="/_kp/d/${id}"[^>]*>Read it</a>`));
  // Served from a published site, as a PDF.
  const snap = await buildSnapshot(env, s.id);
  assert.equal(snap.documents[id].title, 'Memory packages');
  // A document that isn't there: no button.
  html = cardsOf(await draw({ ...newBlock('cards', 'cards'), cards: [{ heading: 'Packages', button: 'Open now', link: { to: 'doc', value: 'gone' } }] }));
  assert.doesNotMatch(html, /Open now/);
  assert.match(html, /<h3>Packages<\/h3>/);
});

test('the owner uploads, retitles and removes documents in the admin view; the site serves them', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2027-03-10T15:00:00Z') });
  const env = await makeEnv();
  const login = await call(env, M, '/ops/login', { method: 'POST', body: new URLSearchParams({ token: 'ops-token' }) });
  const cookies = login.headers.getSetCookie().map((c) => c.split(';')[0]);
  const admin = cookies.find((c) => c.startsWith('kp_admin='));
  const s = await addSite(env, 'akdocs');
  const at = '/admin/akdocs/documents';
  const post = (body) => call(env, M, at, { method: 'POST', headers: { cookie: admin, origin: `https://${M}` }, body });
  let fd = new FormData();
  fd.set('act', 'upload'); fd.set('file', pdfFile()); fd.set('title', '');
  let r = await post(fd);
  assert.equal(r.status, 303);
  const row = env.DB.raw.prepare('SELECT * FROM documents WHERE site_id = ?').get(s.id);
  assert.equal(row.name, 'Puppy-packages.pdf');
  assert.ok(row.r2_key.startsWith(`sites/${s.id}/docs/`));
  // Not a PDF: refused, in words.
  fd = new FormData(); fd.set('act', 'upload'); fd.set('file', new File(['hello'], 'x.pdf'));
  r = await post(fd);
  assert.match(await r.text(), /That isn&#39;t a PDF|That isn't a PDF/);
  const page = await (await call(env, M, at, { headers: { cookie: admin } })).text();
  assert.match(page, /Puppy-packages\.pdf · 1 KB/);
  // The admin view's preview of her site serves it.
  r = await call(env, M, `/admin/akdocs/site/_kp/d/${row.id}`, { headers: { cookie: admin } });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'application/pdf');
  assert.match(r.headers.get('content-disposition'), /inline; filename="Puppy-packages.pdf"/);
  // Retitle, then remove: gone from R2 too.
  fd = new FormData(); fd.set('act', `title:${row.id}`); fd.set(`title.${row.id}`, 'Packages');
  await post(fd);
  assert.equal(env.DB.raw.prepare('SELECT title FROM documents WHERE id = ?').get(row.id).title, 'Packages');
  fd = new FormData(); fd.set('act', `remove:${row.id}`);
  await post(fd);
  assert.equal(env.DB.raw.prepare('SELECT COUNT(*) AS n FROM documents').get().n, 0);
  assert.equal(await env.FILES.get(row.r2_key), null);
});

test('the owner\'s form reads every card, its button and the block\'s look', () => {
  const b = cleanBlock(newBlock('cards', 'cards'));
  const f = new Map(Object.entries({
    'b.cards.present': '1', 'b.cards.w.heading': 'H', 'b.cards.w.line': '', 'b.cards.style': 'slider', 'b.cards.across': '2', 'b.cards.shape': 'whole', 'b.cards.pill': 'brass', 'b.cards.align': 'center',
    'b.cards.cards.n': '2', 'b.cards.cards.0.heading': 'A', 'b.cards.cards.0.labels': 'x, y', 'b.cards.cards.0.button': 'Open', 'b.cards.cards.0.link.to': 'doc', 'b.cards.cards.0.link.doc': 'abc', 'b.cards.cards.0.link.value': '',
    'b.cards.cards.1.heading': '', 'b.cards.cards.1.link.to': '',
  }));
  const [next] = blocksFromForm([b], (n) => f.get(n) ?? null, () => [], 'contact');
  assert.deepEqual(next.cards, [{ photo: null, big: '', labels: ['x', 'y'], heading: 'A', text: '', button: 'Open', link: { to: 'doc', value: 'abc' } }]);
  assert.deepEqual([next.style, next.across, next.shape, next.pill, next.align, next.w.heading], ['slider', '2', 'whole', 'brass', 'center', 'H']);
  f.set('b.cards.cards.0.link.to', 'url'); f.set('b.cards.cards.0.link.value', 'example.com');
  assert.throws(() => blocksFromForm([b], (n) => f.get(n) ?? null, () => [], 'contact'), /https:\/\//);
});

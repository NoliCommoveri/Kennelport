// Checks the live family portal's Forest and Cream looks against the owner's prototype,
// docs/reference/portal-looks.html (published with its photos as an artifact). Not a test:
// it needs the pages rendered first and Chromium with Playwright (both preinstalled in the
// cloud sessions).
//
// 1. Render the live pages, one folder per look:
//      SNAP_LOOK=forest SNAP_DIR=<dir>/forest SNAP_PHOTO=<img>/opal.jpg \
//        node --test worker/scripts/portal-current-snapshots.mjs        (and cream)
// 2. node worker/scripts/portal-looks-check.mjs --live <dir> --proto <published index.html>
//      [--img <prototype img/ folder>] [--out <folder for screenshots>] [--only forest/vet/home]
//      [--shots]   (side-by-side screenshots, prototype | live, per look and page)
//
// For each look × date × page it pairs the prototype's components with the live ones
// (COMPONENTS below), at 390×844 and deviceScaleFactor 1, in light and in dark (the looks
// ignore dark mode, so both are measured against the prototype in light; the prototype's
// own dark mode leaks its base colours), and checks:
//   styles  getComputedStyle of each pair and, where both are built alike (the same
//           elements in the same order), of every element inside: colours exact, numbers
//           within 2% (or half a pixel);
//   pixels  each pair's screenshot, text made transparent on both sides (the live words
//           swapped for the prototype's first where both are built alike, so the layout
//           can match; the live hero photo swapped for the prototype's), each component
//           nudged onto the pixel grid, a pixelmatch (5.3.0) diff at threshold 0.1 with its
//           anti-aliasing check; over 2% of pixels differing fails;
//   page    the whole page the same way (reported; held to 2% only for --pages a,b).
// A component whose content differs (a live line the prototype hasn't) is held to its
// styles, not its size or pixels; its parts are measured on their own rows. KNOWN lists
// the components on one side only, on purpose, with why.
// It prints each failure, writes check.md and check.json to --out, and exits 1 on any fail.
// [--scheme light|dark] [--stage before|vet|weeks|later] [--only forest/vet/home]
// [--dump <dir>] (the pair of PNGs for each component over 2%) [--debug] (positions).
// Files are served with context.route: no server.
import { createRequire } from 'node:module';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join, dirname, extname } from 'node:path';

// Playwright as installed globally (require finds it through NODE_PATH; import doesn't).
const { chromium } = createRequire(import.meta.url)('playwright');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, all) => (x.startsWith('--') ? [...a, [x.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]] : a), []));
const KP = fileURLToPath(new URL('../public/_kp/', import.meta.url));
const LIVE = args.live;
const PROTO = args.proto;
const IMG = args.img || join(dirname(PROTO), 'img');
const OUT = args.out || null;
const LOOKS = ['forest', 'cream'];
const STAGES = ['before', 'vet', 'weeks', 'later'];
const PAGES = ['home', 'timeline', 'vet', 'records'];
const STAGE_BUTTON = { before: 'Dec 18', vet: 'Dec 24', weeks: 'Jan 12', later: 'Oct 28' };
const W = 390;
const H = 844;
const TYPES = { '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.html': 'text/html' };
const FONTS = readFileSync(join(KP, 'f/portal.css'), 'utf8').split('\n').filter((l) => l.startsWith('@font-face')).join('\n');

// The two sides served from disk. The prototype's fonts are the live ones (the same files
// on both sides), its photos from its img/ folder.
async function routes(context) {
  const file = (route, path) => (existsSync(path) ? route.fulfill({ body: readFileSync(path), contentType: TYPES[extname(path)] || 'application/octet-stream' }) : route.fulfill({ status: 404, body: '' }));
  await context.route('**/*', (route) => {
    const u = new URL(route.request().url());
    if (u.host === 'fonts.googleapis.com') return route.fulfill({ body: FONTS.replaceAll('url("/_kp/', 'url("http://kp.test/_kp/'), contentType: 'text/css' });
    if (u.host === 'kp.test' || u.host === 'proto.test') {
      if (u.pathname.startsWith('/_kp/')) return file(route, join(KP, decodeURIComponent(u.pathname.slice(5))));
      if (u.pathname.startsWith('/img/')) return file(route, join(IMG, decodeURIComponent(u.pathname.slice(5))));
      if (u.host === 'proto.test' && u.pathname === '/index.html') return route.fulfill({ body: readFileSync(PROTO), contentType: 'text/html' });
      if (u.host === 'kp.test' && u.pathname.startsWith('/live/')) {
        const html = readFileSync(join(LIVE, decodeURIComponent(u.pathname.slice(6))), 'utf8')
          .replaceAll(pathToFileURL(KP).href, 'http://kp.test/_kp/')
          .replace(/file:\/\/[^"')]*\/img\/([\w.-]+)/g, 'http://kp.test/img/$1');
        return route.fulfill({ body: html, contentType: 'text/html' });
      }
    }
    return route.fulfill({ status: 404, body: '' });
  });
}

async function newPage(browser, scheme) {
  const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: scheme, timezoneId: 'America/New_York', locale: 'en-US', reducedMotion: 'reduce' });
  await routes(context);
  return context.newPage();
}

// Settled: loaded, fonts in, every image decoded, two frames drawn. (Everything is served
// from disk through page.route, so there's nothing to wait for on the network.)
const settle = async (page) => {
  await page.waitForLoadState('load');
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => (i.complete ? i.decode().catch(() => {}) : new Promise((r) => { i.onload = i.onerror = r; }))));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
};

// The prototype on a look, a date and a page; its bar taken away.
async function openProto(page, look, stage, pg) {
  await page.goto('http://proto.test/index.html#f-home', { waitUntil: 'domcontentloaded' });
  await page.click(`#pk button[data-look="${look}"]`);
  await page.click(`#ps button:text-is("${STAGE_BUTTON[stage]}")`).catch(() => page.click(`#ps button[data-stage="${stage}"]`));
  await page.evaluate((p) => { location.hash = `#f-${p}`; }, pg);
  await page.waitForFunction((p) => location.hash === `#f-${p}`, pg);
  await page.evaluate(() => { document.querySelector('.proto')?.remove(); window.scrollTo(0, 0); });
  await settle(page);
}

async function openLive(page, look, stage, pg) {
  await page.goto(`http://kp.test/live/${look}/${stage}-${pg}.html`, { waitUntil: 'domcontentloaded' });
  await settle(page);
}

export { openProto, openLive, newPage, LOOKS, STAGES, PAGES, W, H, args, OUT, LIVE, PROTO };

// ---------- side-by-side screenshots ----------
async function shots(browser) {
  mkdirSync(OUT, { recursive: true });
  const stages = args.stage ? [args.stage] : STAGES;
  for (const look of LOOKS) for (const stage of stages) for (const pg of PAGES) {
    if (args.only && !`${look}/${stage}/${pg}`.includes(args.only)) continue;
    const a = await newPage(browser, args.scheme || 'light');
    await openProto(a, look, stage, pg);
    const pa = await a.screenshot({ fullPage: true });
    const b = await newPage(browser, args.scheme || 'light');
    await openLive(b, look, stage, pg);
    const pb = await b.screenshot({ fullPage: true });
    const c = await newPage(browser, 'light');
    await c.setViewportSize({ width: W * 2 + 24, height: 400 });
    await c.setContent(`<body style="margin:0;background:#888;display:flex;gap:24px;align-items:flex-start"><img src="data:image/png;base64,${pa.toString('base64')}"><img src="data:image/png;base64,${pb.toString('base64')}"></body>`);
    await c.waitForLoadState('load');
    writeFileSync(join(OUT, `${look}-${stage}-${pg}.png`), await c.screenshot({ fullPage: true }));
    await Promise.all([a.context().close(), b.context().close(), c.context().close()]);
    console.log('shot', look, stage, pg);
  }
}

// ---------- the check ----------

// What's compared on each page: [name, the prototype's selector, the live one (the same if
// left out)]. "sel@words": the first match whose card title (.mk-h), or else whose text,
// has those words; "...>>sub": the first match of sub inside it. A component shown on neither side (a look's own piece, a stage's) is
// skipped; shown on one side only, it fails.
const COMMON = [['header', 'header.app', 'header.top'], ['header row', 'header.app .in', 'header.top .in'], ['tabs', 'nav.tabs'], ['tab on', 'nav.tabs a[aria-current]']];
const COMPONENTS = {
  home: [
    ['herocard', '.herocard'], ['hero', '.herocard .hero'], ['hero words', '.herocard .hero .cap'], ['pup tile', '.herocard .tile.pup', '.herocard .tile.pup', { stretch: true }], ['status tile', '.herocard .tile.peach'],
    ['status button', '.herocard .tile.peach .btn'], ['calendar page', '.herocard .calpage'], ['pup photo', '.herocard .pup .ph.round'], ['pup name', '.herocard .pname'], ['vet card', 'section.mk.only-cream', 'section.mk.vetcard'], ['vet row', '.vetrow'],
    ['book the vet', 'section.mk@Book'], ['checklist', 'section.mk:has(.checks)'], ['coming up', 'section.mk@Coming up'], ['a task', 'section.mk@Coming up>>.task:last-child'],
    ['food and insurance', '.duo2'], ['food card', '.duo2 > .mk:nth-child(1)'], ['insurance card', '.duo2 > .mk:nth-child(2)'],
    ['food header', '.duo2 > .mk:nth-child(1) .mk-h'], ['food title', '.duo2 > .mk:nth-child(1) h3'], ['food picture', '.duo2 > .mk:nth-child(1) .pic'], ['food button', '.duo2 > .mk:nth-child(1) .btn.line'],
    ['insurance header', '.duo2 > .mk:nth-child(2) .mk-h'], ['insurance title', '.duo2 > .mk:nth-child(2) h3'], ['insurance picture', '.duo2 > .mk:nth-child(2) .pic'], ['insurance button', '.duo2 > .mk:nth-child(2) .btn.line'],
    ['coming up header', 'section.mk@Coming up>>.mk-h'], ['contacts header', '#contacts .mk-h'], ['a contact button', '#contacts .btn'], ['vet name', '#contacts .who'], ['checklist bar', '.progress'],
    ['contacts', '#contacts'], ['quick links', 'section.mk@Quick links'], ['a quick link', '.qtile'], ['action bar', '.actionbar'], ['disclosure', '.disclose'],
  ],
  timeline: [
    ['head', '.mk-head.green'], ['body', '.timeline-body'], ['group title', '.timeline-body > h2'], ['first card', '.timeline-body > section.mk:nth-of-type(1)'],
    ['second card', '.timeline-body > section.mk:nth-of-type(2)'], ['card header', '.timeline-body > section.mk:nth-of-type(2) .mk-h'], ['a task', '.timeline-body > section.mk:nth-of-type(1) .task:last-child'],
    ['recommended', 'section.mk@Recommended'], ['disclosure', '.disclose'],
  ],
  vet: [
    ['sheet', '.sheet'], ['head', '.mk-head.cream'], ['head title', '.mk-head.cream h1'], ['note', '.notebox'],
    ['first card', '.sheet > section.mk:nth-of-type(1)'], ['second card', '.sheet > section.mk:nth-of-type(2)'], ['wide button', '.sheet .btn.wide'],
  ],
  records: [
    ['my puppy', '.mypup'], ['puppy name', '.mypup h1'], ['facts', '.mypup dl'], ['a fact', '.mypup dl > div'], ['shots header', 'section.mk@Shots>>.mk-h'],
    ['a table row', 'section.mk@Shots>>tbody tr'], ['shots', 'section.mk@Shots'], ['table', 'section.mk@Shots>>table'], ['papers', 'section.mk@Papers'],
    ['contacts', '#contacts'], ['contacts header', '#contacts .mk-h'], ['photos', 'section.mk@Photos'], ['gallery', '.gallery'], ['a photo', '.gallery .ph'],
  ],
};
// { stretch: true }: a grid item its row stretches to the height of its neighbour, so its
// height follows that neighbour's content; compared over the height the two have in common.
//
// Content that differs on purpose (the live sample's data, or a live line the prototype
// doesn't have), as [date/page/component, why]: reported as such, not failed.
const KNOWN = [
  [/^weeks\/home\/status button$/, 'the next task (Jan 12) has a program link live'],
  [/^(weeks|later)\/home\/insurance button$/, 'the live sample hasn\'t activated the insurance; the prototype\'s has'],
  [/^later\/home\/(calendar page|coming up|coming up header|a task)$/, 'Oct 28: the prototype\'s birthday tile and its tasks; live, all caught up'],
];
const known = (r) => KNOWN.find(([re]) => re.test(`${r.stage}/${r.page}/${r.name}`))?.[1] ?? null;

// Pages whose content is the same on both sides, so the whole page is held to 2% too.
const PAGES_SAME = new Set(args.pages ? String(args.pages).split(',') : []);
const LIMIT = 2;
const PROPS = ['display', 'position', 'color', 'background-color', 'background-image', 'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-style', 'border-top-color', 'border-bottom-color', 'border-left-color', 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius',
  'box-shadow', 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-transform', 'text-align', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'row-gap', 'column-gap', 'grid-template-columns', 'opacity', 'width', 'height', 'min-height', 'z-index'];

const SIZES = new Set(['width', 'height', 'grid-template-columns']);

// In the page: find a component; its text nodes; its computed styles.
const IN_PAGE = `
window.__find = (spec) => {
  const [head, sub] = spec.split('>>');
  const [sel, main] = head.split('@');
  const shown = (el) => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
  let list = [...document.querySelectorAll(sel)].filter(shown);
  if (main) list = list.filter((el) => ((el.querySelector('.mk-h') ?? el).textContent).includes(main));
  let el = list[0] ?? null;
  if (el && sub) el = [...el.querySelectorAll(sub)].find(shown) ?? null;
  return el;
};
window.__texts = (el) => { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.data.trim() && !n.parentElement.closest('style,script,noscript,svg') ? 1 : 2) }); const out = []; while (w.nextNode()) out.push(w.currentNode); return out; };
window.__styles = (el, props) => { const cs = getComputedStyle(el); return Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p)])); };
// Every element inside, with where it is (tag.class), skipping the icons' insides.
// Wrappers that add no box (a live form shown as display: contents) and hidden inputs
// don't count: the boxes are what's drawn.
window.__boxed = (k) => !k.closest('noscript') && !(k.tagName === 'INPUT' && k.type === 'hidden') && getComputedStyle(k).display !== 'contents';
window.__shape = (el) => [...el.querySelectorAll('*')].filter((k) => !k.closest('svg') && window.__boxed(k)).map((k) => k.tagName).join(' ');
window.__kids = (el, props) => [...el.querySelectorAll('*')].filter((k) => !k.closest('svg') || k.tagName === 'svg').filter((k) => window.__boxed(k) && !k.closest('input.sr') && k.getClientRects().length)
  .map((k) => ({ at: k.tagName.toLowerCase() + (k.getAttribute('class') ? '.' + k.getAttribute('class').trim().split(/\s+/).join('.') : ''), s: window.__styles(k, props) }));
`;

// Two values alike: colours (and every other word) the same, numbers within 2% (or half a pixel).
function alike(a, b) {
  if (a === b) return true;
  const tok = (v) => v.replace(/rgba?\([^)]*\)/g, (m) => ` ${m.replace(/\s+/g, '')} `).match(/rgba?\([^)]*\)|-?[\d.]+(?:px|%|deg|s)?|[^\s\d,()-]+|[(),]/g) ?? [];
  const x = tok(a); const y = tok(b);
  if (x.length !== y.length) return false;
  return x.every((t, i) => {
    const u = y[i];
    if (t === u) return true;
    const n = /^-?[\d.]+(px|%|deg|s)?$/;
    if (n.test(t) && n.test(u) && t.replace(/^-?[\d.]+/, '') === u.replace(/^-?[\d.]+/, '')) {
      const p = parseFloat(t); const q = parseFloat(u);
      return Math.abs(p - q) <= 0.5 || Math.abs(p - q) <= LIMIT / 100 * Math.max(Math.abs(p), Math.abs(q));
    }
    return false;
  });
}

// pixelmatch (5.3.0)'s colour distance (YIQ) and anti-aliasing check, at threshold 0.1, run
// in a page on two PNGs. Pixels outside the smaller image all count as differing.
const DIFF_JS = `async ([a, b, crop]) => {
  const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; });
  const [x, y] = await Promise.all([load(a), load(b)]);
  const w = Math.min(x.width, y.width); const h = Math.min(x.height, y.height);
  const W = crop ? w : Math.max(x.width, y.width); const H = crop ? h : Math.max(x.height, y.height);
  const px = (i) => { const c = new OffscreenCanvas(w, h); const g = c.getContext('2d'); g.drawImage(i, 0, 0); return g.getImageData(0, 0, w, h).data; };
  const A = px(x); const B = px(y);
  const maxDelta = 35215 * 0.1 * 0.1;
  const blend = (c, a) => 255 + (c - 255) * a;
  const rgb2y = (r, g, b) => r * 0.29889531 + g * 0.58662247 + b * 0.11448223;
  const rgb2i = (r, g, b) => r * 0.59597799 - g * 0.27417610 - b * 0.32180189;
  const rgb2q = (r, g, b) => r * 0.21147017 - g * 0.52261711 + b * 0.31114694;
  function delta(i1, i2, k, m, yOnly) {
    let r1 = i1[k], g1 = i1[k + 1], b1 = i1[k + 2], a1 = i1[k + 3], r2 = i2[m], g2 = i2[m + 1], b2 = i2[m + 2], a2 = i2[m + 3];
    if (a1 === a2 && r1 === r2 && g1 === g2 && b1 === b2) return 0;
    if (a1 < 255) { a1 /= 255; r1 = blend(r1, a1); g1 = blend(g1, a1); b1 = blend(b1, a1); }
    if (a2 < 255) { a2 /= 255; r2 = blend(r2, a2); g2 = blend(g2, a2); b2 = blend(b2, a2); }
    const y1 = rgb2y(r1, g1, b1), y2 = rgb2y(r2, g2, b2), yy = y1 - y2;
    if (yOnly) return yy;
    const ii = rgb2i(r1, g1, b1) - rgb2i(r2, g2, b2), qq = rgb2q(r1, g1, b1) - rgb2q(r2, g2, b2);
    const d = 0.5053 * yy * yy + 0.299 * ii * ii + 0.1957 * qq * qq;
    return y1 > y2 ? -d : d;
  }
  function hasManySiblings(img, x1, y1) {
    const x0 = Math.max(x1 - 1, 0), y0 = Math.max(y1 - 1, 0), x2 = Math.min(x1 + 1, w - 1), y2 = Math.min(y1 + 1, h - 1);
    const pos = (y1 * w + x1) * 4; let zeroes = x1 === x0 || x1 === x2 || y1 === y0 || y1 === y2 ? 1 : 0;
    for (let xx = x0; xx <= x2; xx++) for (let yy = y0; yy <= y2; yy++) {
      if (xx === x1 && yy === y1) continue;
      const p2 = (yy * w + xx) * 4;
      if (img[pos] === img[p2] && img[pos + 1] === img[p2 + 1] && img[pos + 2] === img[p2 + 2] && img[pos + 3] === img[p2 + 3]) zeroes++;
      if (zeroes > 2) return true;
    }
    return false;
  }
  function antialiased(img, x1, y1, img2) {
    const x0 = Math.max(x1 - 1, 0), y0 = Math.max(y1 - 1, 0), x2 = Math.min(x1 + 1, w - 1), y2 = Math.min(y1 + 1, h - 1);
    const pos = (y1 * w + x1) * 4; let zeroes = x1 === x0 || x1 === x2 || y1 === y0 || y1 === y2 ? 1 : 0;
    let min = 0, max = 0, minX, minY, maxX, maxY;
    for (let xx = x0; xx <= x2; xx++) for (let yy = y0; yy <= y2; yy++) {
      if (xx === x1 && yy === y1) continue;
      const d = delta(img, img, pos, (yy * w + xx) * 4, true);
      if (d === 0) { zeroes++; if (zeroes > 2) return false; }
      else if (d < min) { min = d; minX = xx; minY = yy; }
      else if (d > max) { max = d; maxX = xx; maxY = yy; }
    }
    if (min === 0 || max === 0) return false;
    return (hasManySiblings(img, minX, minY) && hasManySiblings(img2, minX, minY)) || (hasManySiblings(img, maxX, maxY) && hasManySiblings(img2, maxX, maxY));
  }
  let diff = W * H - w * h;
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    const pos = (yy * w + xx) * 4;
    const d = delta(A, B, pos, pos);
    if (Math.abs(d) > maxDelta && !(antialiased(A, xx, yy, B) || antialiased(B, xx, yy, A))) diff++;
  }
  return { pct: W * H ? (100 * diff) / (W * H) : 0, size: [x.width, x.height, y.width, y.height] };
}`;

const pixelDiff = async (page, a, b, crop = false) => (await page.evaluate(`(${DIFF_JS})(${JSON.stringify([a.toString('base64'), b.toString('base64'), crop])})`)).pct;

// Text made invisible on a page (each text node wrapped in a transparent span that adds no box).
const HIDE_TEXT = () => {
  for (const n of window.__texts(document.body)) {
    const s = document.createElement('span');
    s.setAttribute('style', 'display:contents;color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important');
    n.replaceWith(s); s.append(n);
  }
  const st = document.createElement('style');
  st.textContent = '*{text-shadow:none!important;caret-color:transparent!important} ::placeholder{color:transparent!important} input,select,textarea{color:transparent!important;-webkit-text-fill-color:transparent!important}';
  document.head.append(st);
};
const FIXED = 'header.app, header.top, nav.tabs, .actionbar';

async function compare(browser, diffPage, look, stage, pg, scheme) {
  const a = await newPage(browser, 'light');
  const b = await newPage(browser, scheme);
  await openProto(a, look, stage, pg);
  await openLive(b, look, stage, pg);
  for (const x of [a, b]) await x.evaluate(IN_PAGE);
  // Their own photo on Home's hero, swapped for the prototype's (the content, not the look).
  await b.evaluate(() => { const i = document.querySelector('.herocard .hero img'); if (i) i.src = 'http://kp.test/img/contessa.jpg'; });
  await settle(b);
  const rows = [];
  for (const [name, ps, ls = ps, opt = {}] of [...COMMON, ...COMPONENTS[pg]]) {
    const has = [await a.evaluate((s) => Boolean(window.__find(s)), ps), await b.evaluate((s) => Boolean(window.__find(s)), ls)];
    if (!has[0] && !has[1]) continue;
    const row = { look, stage, page: pg, scheme, name, stretch: Boolean(opt.stretch), styles: [], pixels: null, content: false, missing: !has[0] ? 'not in the prototype' : !has[1] ? 'not on the live page' : null };
    rows.push(row);
    if (row.missing) continue;
    // The same words on both sides where the text is the same shape, so the layout can match.
    // (Only where both are built alike: the same elements in the same order.)
    const shape = (s) => window.__shape(window.__find(s));
    const same = (await a.evaluate(shape, ps)) === (await b.evaluate(shape, ls));
    const pt = await a.evaluate((s) => window.__texts(window.__find(s)).map((n) => n.data), ps);
    const n = await b.evaluate(([s, texts, ok]) => { const l = window.__texts(window.__find(s)); if (ok && l.length === texts.length) l.forEach((x, i) => { x.data = texts[i]; }); return l.length; }, [ls, pt, same]);
    row.content = !same || n !== pt.length;
    row.texts = [pt.length, n];
  }
  for (const x of [a, b]) await settle(x);
  for (const row of rows.filter((r) => !r.missing)) {
    const [, ps, ls = ps] = [...COMMON, ...COMPONENTS[pg]].find((c) => c[0] === row.name);
    const sa = await a.evaluate(([s, p]) => window.__styles(window.__find(s), p), [ps, PROPS]);
    const sb = await b.evaluate(([s, p]) => window.__styles(window.__find(s), p), [ls, PROPS]);
    // Where the content differs, its size follows the content: sizes aren't held to it.
    const props = row.content ? PROPS.filter((p) => !SIZES.has(p)) : row.stretch ? PROPS.filter((p) => p !== 'height') : PROPS;
    row.styles = props.filter((p) => !alike(sa[p], sb[p])).map((p) => `${p}: ${sa[p]} | ${sb[p]}`);
    // Inside it, element by element, where both sides are built the same way.
    const ka = await a.evaluate(([s, p]) => window.__kids(window.__find(s), p), [ps, PROPS]);
    const kb = await b.evaluate(([s, p]) => window.__kids(window.__find(s), p), [ls, PROPS]);
    const tags = (l) => l.map((k) => k.at.split('.')[0]).join(' ');
    row.same = tags(ka) === tags(kb);
    // An element of another kind on each side (a task's word: Next here, Later there) is content.
    if (row.same && !/^(header|header row)$/.test(row.name)) {
      ka.forEach((k, i) => {
        if (k.at !== kb[i].at) { row.kinds = [...(row.kinds ?? []), `${k.at} | ${kb[i].at}`]; return; }
        for (const p of props) if (!alike(k.s[p], kb[i].s[p])) row.styles.push(`${k.at} ${p}: ${k.s[p]} | ${kb[i].s[p]}`);
      });
    }
  }
  for (const x of [a, b]) await x.evaluate(HIDE_TEXT);
  // The pinned bars on their own, then out of the way of the cards.
  // Each component moved by under a pixel so it starts on the pixel grid on both sides
  // (the cards above it differ in height, and an offset of a fraction of a pixel redraws
  // every edge): its top margin, then put back. Layout, not a transform, so it's painted
  // the way the page paints it.
  const shot = async (x, s) => x.evaluate((q) => {
    for (const el of document.querySelectorAll('[data-nudged]')) { el.style.marginTop = el.dataset.nudged; el.removeAttribute('data-nudged'); }
    const e = window.__find(q); let r = e.getBoundingClientRect();
    const fy = (r.top + scrollY) % 1;
    if (getComputedStyle(e).position !== 'fixed' && fy > 0.001) {
      e.dataset.nudged = e.style.marginTop;
      e.style.marginTop = `${parseFloat(getComputedStyle(e).marginTop) + (1 - fy)}px`;
      r = e.getBoundingClientRect();
    }
    return { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), width: Math.round(r.width), height: Math.round(r.height), raw: [r.left + scrollX, r.top + scrollY, r.width, r.height, fy] };
  }, s).then((r) => { if (args.debug) console.log(s, JSON.stringify(r.raw)); delete r.raw; return r; })
    .then((r) => (r.width && r.height ? x.screenshot({ clip: r, fullPage: true }) : null));
  for (const row of rows.filter((r) => !r.missing)) {
    const [, ps, ls = ps] = [...COMMON, ...COMPONENTS[pg]].find((c) => c[0] === row.name);
    const fixed = /^(header|header row|tabs|tab on|action bar)$/.test(row.name);
    if (!fixed) continue;
    const [ia, ib] = [await shot(a, ps), await shot(b, ls)];
    row.pixels = ia && ib ? await pixelDiff(diffPage, ia, ib) : 100;
  }
  for (const x of [a, b]) await x.evaluate((sel) => { for (const e of document.querySelectorAll(sel)) e.style.visibility = 'hidden'; }, FIXED);
  for (const row of rows.filter((r) => !r.missing && r.pixels === null)) {
    const [, ps, ls = ps] = [...COMMON, ...COMPONENTS[pg]].find((c) => c[0] === row.name);
    const [ia, ib] = [await shot(a, ps), await shot(b, ls)];
    row.pixels = ia && ib ? await pixelDiff(diffPage, ia, ib, row.stretch) : 100;
    if (args.dump && ia && ib && row.pixels > LIMIT) {
      mkdirSync(args.dump, { recursive: true });
      const f = `${look}-${stage}-${pg}-${scheme}-${row.name.replace(/\W+/g, '_')}`;
      writeFileSync(join(args.dump, `${f}-a.png`), ia); writeFileSync(join(args.dump, `${f}-b.png`), ib);
    }
  }
  const [fa, fb] = [await a.screenshot({ fullPage: true }), await b.screenshot({ fullPage: true })];
  const whole = await pixelDiff(diffPage, fa, fb);
  rows.push({ look, stage, page: pg, scheme, name: '(whole page)', styles: [], pixels: whole, content: !PAGES_SAME.has(pg), missing: null });
  await Promise.all([a.context().close(), b.context().close()]);
  return rows;
}

// A component fails on a style that differs, on being on one side only, or, where the
// content is the same shape on both sides, on more than 2% of its pixels. Where the
// content differs (a live line the prototype hasn't), its parts are measured instead.
const failed = (r) => !r.known && Boolean(r.missing || r.styles.length || (!r.content && r.pixels > LIMIT));

async function check(browser) {
  const diffPage = await (await browser.newContext()).newPage();
  const all = [];
  const stages = args.stage ? [args.stage] : STAGES;
  const schemes = args.scheme ? [args.scheme] : ['light', 'dark'];
  for (const look of LOOKS) for (const stage of stages) for (const pg of PAGES) for (const scheme of schemes) {
    if (args.only && !`${look}/${stage}/${pg}`.includes(args.only)) continue;
    const rows = await compare(browser, diffPage, look, stage, pg, scheme);
    for (const r of rows) r.known = known(r);
    all.push(...rows);
    const bad = rows.filter(failed);
    console.log(`${look} ${stage} ${pg} ${scheme}: ${rows.length - bad.length}/${rows.length} pass`);
    for (const r of bad) console.log(`  FAIL ${r.name}${r.missing ? ` (${r.missing})` : ''}${r.pixels !== null && r.pixels !== undefined ? ` pixels ${r.pixels.toFixed(2)}%` : ''}${r.content ? ` [content differs: ${r.texts?.join(' vs ') ?? ''} text nodes]` : ''}${r.styles.length ? `\n      ${r.styles.join('\n      ')}` : ''}`);
  }
  if (OUT) {
    mkdirSync(OUT, { recursive: true });
    writeFileSync(join(OUT, 'check.json'), JSON.stringify(all, null, 1));
    const pct = (r) => (r.pixels === null || r.pixels === undefined ? '' : `${r.pixels.toFixed(2)}%`);
    const md = ['| Look | Date | Page | Mode | Component | Styles | Pixels | Result |', '|---|---|---|---|---|---|---|---|',
      ...all.map((r) => `| ${r.look} | ${STAGE_BUTTON[r.stage]} | ${r.page} | ${r.scheme} | ${r.name} | ${r.missing ?? (r.styles.length ? `${r.styles.length} differ` : 'same')} | ${pct(r)}${r.content ? ' (content differs)' : ''}${r.stretch ? ' (common height)' : ''} | ${failed(r) ? 'FAIL' : r.known ? `content: ${r.known}` : 'pass'} |`)];
    writeFileSync(join(OUT, 'check.md'), `${md.join('\n')}\n`);
  }
  const bad = all.filter(failed).length;
  console.log(`\n${all.length - bad} of ${all.length} pass${bad ? `; ${bad} fail` : ''}`);
  return bad;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const browser = await chromium.launch();
  let bad = 0;
  try {
    if (args.shots) await shots(browser);
    else bad = await check(browser);
  } finally { await browser.close(); }
  process.exitCode = bad ? 1 : 0;
}

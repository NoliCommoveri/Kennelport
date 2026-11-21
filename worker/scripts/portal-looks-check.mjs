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
// ignore dark mode, so both are measured against the prototype in light), and checks:
//   styles  getComputedStyle of each pair (colours exact, numbers within 2%);
//   pixels  each pair's screenshot, text made transparent on both sides, a pixelmatch-style
//           diff at threshold 0.1 (anti-aliased pixels not counted, as pixelmatch does);
//           over 2% of pixels differing fails;
//   page    the whole page the same way, where the content matches (PAGES_SAME).
// It prints a table and exits 1 on any fail. Files are served with page.route: no server.
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

const settle = async (page) => { await page.evaluate(() => document.fonts.ready); await page.waitForLoadState('networkidle'); await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); };

// The prototype on a look, a date and a page; its bar taken away.
async function openProto(page, look, stage, pg) {
  await page.goto('http://proto.test/index.html#f-home');
  await page.evaluate((l) => { try { localStorage.setItem('portal-look', l); } catch { /* none */ } }, look);
  await page.goto(`http://proto.test/index.html#f-home`);
  await page.click(`#pk button[data-look="${look}"]`);
  await page.click(`#ps button:text-is("${STAGE_BUTTON[stage]}")`).catch(() => page.click(`#ps button[data-stage="${stage}"]`));
  await page.evaluate((p) => { location.hash = `#f-${p}`; }, pg);
  await page.waitForFunction((p) => location.hash === `#f-${p}`, pg);
  await page.evaluate(() => { document.querySelector('.proto')?.remove(); window.scrollTo(0, 0); });
  await settle(page);
}

async function openLive(page, look, stage, pg) {
  await page.goto(`http://kp.test/live/${look}/${stage}-${pg}.html`);
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const browser = await chromium.launch();
  try {
    if (args.shots) await shots(browser);
  } finally { await browser.close(); }
}

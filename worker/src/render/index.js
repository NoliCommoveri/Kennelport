// From a snapshot and a path to a response body (plan 3.1): which page, or a 404
// for a page that's switched off or empty. Pure: no D1, R2 or network, so the
// same function renders the live site, a preview and the tests.
import { layout } from './layout.js';
import { pageOn } from './parts.js';
import * as P from './pages.js';
import { PAGES } from '../content/model.js';

// Fixed addresses (plan 3.1) → page key and renderer.
const FIXED = {
  '/': ['home', P.home],
  '/about': ['about', P.about],
  '/reviews': ['reviews', P.reviews],
  '/contact': ['contact', P.contact],
  '/dogs': ['dogs', P.dogs],
  '/litters': ['litters', P.litters],
  '/litters/older': ['older', P.older],
  '/how-it-works': ['how_it_works', P.howItWorks],
  '/extras': ['extras', P.extras],
  '/recommended': ['products', P.products],
  '/policies': ['policies', P.policies],
  '/faq': ['faq', P.faq],
  '/waitlist': ['waitlist', P.waitlist],
  '/waitlist/help': ['waitlist_help', P.waitlistHelp],
  '/albums': ['albums', P.albums],
  '/privacy': ['privacy', P.privacy],
};

function pick(snap, ctx) {
  const path = ctx.path;
  const fixed = FIXED[path];
  if (fixed) {
    const [key, fn] = fixed;
    if (key !== 'home' && !pageOn(snap, key, ctx)) return null;
    return fn(snap, ctx);
  }
  let m = path.match(/^\/dogs\/([a-z0-9-]+)$/);
  if (m) return pageOn(snap, 'dogs', ctx) || snap.dogs.length ? P.dog(snap, ctx, m[1]) : null;
  m = path.match(/^\/albums\/([a-z0-9-]+)$/);
  if (m) return pageOn(snap, 'albums', ctx) ? P.album(snap, ctx, m[1]) : null;
  m = path.match(/^\/litters\/([a-z0-9-]+)$/);
  if (m) return snap.pages.litters.enabled ? P.litter(snap, ctx, m[1]) : null;
  m = path.match(/^\/litters\/([a-z0-9-]+)\/([a-z0-9-]+)$/);
  if (m) return snap.pages.litters.enabled ? P.puppy(snap, ctx, m[1], m[2]) : null;
  return null;
}

// ctx: { path, origin, today (YYYY-MM-DD), preview }
export function renderPage(snap, ctx) {
  const page = pick(snap, ctx);
  if (!page) return { status: 404, html: layout(snap, ctx, P.unavailable(snap, ctx)) };
  return { status: 200, html: layout(snap, ctx, page) };
}

// Every address that renders, for sitemap.xml.
export function sitePaths(snap, ctx) {
  const paths = [];
  for (const [path, [key]] of Object.entries(FIXED)) if (key === 'home' || pageOn(snap, key, ctx)) paths.push(path);
  for (const d of snap.dogs) paths.push(`/dogs/${d.slug}`);
  if (pageOn(snap, 'albums', ctx)) for (const a of snap.albums) paths.push(`/albums/${a.slug}`);
  if (snap.pages.litters.enabled) {
    for (const l of snap.litters) {
      paths.push(`/litters/${l.slug}`);
      for (const p of l.puppies) paths.push(`/litters/${l.slug}/${p.slug}`);
    }
  }
  return paths;
}

export function sitemap(snap, ctx) {
  const lastmod = snap.built_at.slice(0, 10);
  const urls = sitePaths(snap, ctx).map((p) => `<url><loc>${ctx.origin}${p}</loc><lastmod>${lastmod}</lastmod></url>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
}

export function robots(ctx, { allow = true } = {}) {
  return allow ? `User-agent: *\nAllow: /\nSitemap: ${ctx.origin}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n';
}

export { PAGES };

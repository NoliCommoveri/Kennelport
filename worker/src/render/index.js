// From a snapshot and a path to a response body (plan 3.1): which page, or a 404
// for a page that's switched off or empty. Pure: no D1, R2 or network, so the
// same function renders the live site, a preview and the tests.
import { layout } from './layout.js';
import { pageOn, useFormats, viewerHtml, pagePath, pageAt } from './parts.js';
import * as P from './pages.js';
import { puppy } from './pages/puppy.js';
import { about } from './pages/about.js';
import { reviews } from './pages/reviews.js';
import { contact } from './pages/contact.js';
import { albums, album } from './pages/albums.js';
import { privacy } from './pages/privacy.js';
import { PAGES } from '../content/model.js';

// Each page's renderer, by key. Its address is the breeder's (render/parts.js
// pagePath; content/addresses.js), else its starting one (model.js PAGES).
const RENDER = {
  home: P.home, about, reviews, contact, dogs: P.dogs, litters: P.litters, older: P.older,
  how_it_works: P.howItWorks, extras: P.extras, products: P.products, pickup: P.pickup,
  policies: P.policies, faq: P.faq, waitlist: P.waitlist, waitlist_help: P.waitlistHelp,
  albums, privacy,
};

function pick(snap, ctx) {
  const path = ctx.path;
  const key = pageAt(snap, path);
  if (key && RENDER[key]) {
    if (key !== 'home' && !pageOn(snap, key, ctx)) return null;
    return RENDER[key](snap, ctx);
  }
  // A page the owner added, at its address.
  if (key) return pageOn(snap, key, ctx) ? P.custom(snap, ctx, key) : null;
  if (path === '/family-login') return P.familyLogin(snap, ctx);
  // Profiles and albums stay where they are whatever their list page is called.
  let m = path.match(/^\/dogs\/([a-z0-9-]+)$/);
  if (m) return pageOn(snap, 'dogs', ctx) || snap.dogs.length ? P.dog(snap, ctx, m[1]) : null;
  m = path.match(/^\/albums\/([a-z0-9-]+)$/);
  if (m) return pageOn(snap, 'albums', ctx) ? album(snap, ctx, m[1]) : null;
  m = path.match(/^\/litters\/([a-z0-9-]+)$/);
  if (m) return snap.pages.litters.enabled ? P.litter(snap, ctx, m[1]) : null;
  m = path.match(/^\/litters\/([a-z0-9-]+)\/([a-z0-9-]+)$/);
  if (m) return snap.pages.litters.enabled ? puppy(snap, ctx, m[1], m[2]) : null;
  return null;
}

// ctx: { path, origin, today (YYYY-MM-DD), preview, portal (the family portal is on) }
export function renderPage(snap, ctx) {
  useFormats(snap);
  const page = pick(snap, ctx);
  if (!page) return { status: 404, html: layout(snap, ctx, P.unavailable(snap, ctx)) };
  // A page with photos that open full size (an album, a puppy's, a gallery strip) has
  // the one viewer they open into.
  if (page.body?.includes('data-gallery') && !page.body.includes('id="viewer"')) page.body += viewerHtml();
  return { status: 200, html: layout(snap, ctx, page) };
}

// Every address that renders, for sitemap.xml.
export function sitePaths(snap, ctx) {
  const paths = [];
  for (const key of Object.keys(RENDER)) if (key === 'home' || pageOn(snap, key, ctx)) paths.push(pagePath(snap, key));
  for (const c of snap.layout?.custom ?? []) if (pageOn(snap, c.id, ctx)) paths.push(pagePath(snap, c.id));
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

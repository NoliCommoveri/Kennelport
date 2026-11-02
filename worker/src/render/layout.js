// The page around every "ak" page: <head> with title, description, share
// preview (Open Graph) and structured data; the header and menu; the footer.
import { esc, attr, menuGroups, photoUrl, label, pageOn } from './parts.js';

export const ASSET_VERSION = '3';

function monogramSvg(snap) {
  const letters = (snap.site.monogram || snap.site.kennel_name.replace(/[^A-Za-z]/g, '').slice(0, 2) || 'K').slice(0, 3);
  return `<symbol id="mono" viewBox="0 0 48 48"><g fill="none" stroke="currentColor"><rect x="9" y="9" width="30" height="30" transform="rotate(45 24 24)" stroke-width="1.4"/><rect x="12.5" y="12.5" width="23" height="23" transform="rotate(45 24 24)" stroke-width=".7"/></g><text x="24" y="29.5" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-size="${letters.length > 2 ? 12 : 15}" font-style="italic" fill="currentColor">${esc(letters)}</text></symbol>`;
}

const SPRITES = (snap) => `<svg width="0" height="0" class="sr-only" aria-hidden="true">
  <symbol id="sprig" viewBox="0 0 120 60"><g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M4 50 C 34 44, 64 32, 116 8"/><path d="M28 44 c-4-10 2-18 10-20 c2 9-3 17-10 20z"/><path d="M28 44 c10 4 18 0 22-7 c-9-3-17 0-22 7z"/><path d="M58 33 c-3-10 3-18 11-19 c1 9-4 16-11 19z"/><path d="M58 33 c10 3 18-1 21-9 c-9-2-17 1-21 9z"/><path d="M88 20 c-2-8 3-14 9-15 c1 7-3 12-9 15z"/><path d="M88 20 c8 2 14-2 16-8 c-7-1-13 2-16 8z"/></g></symbol>
  ${monogramSvg(snap)}
</svg>`;

function brand(snap) {
  return `<svg aria-hidden="true"><use href="#mono"/></svg><div><b>${esc(snap.site.kennel_name)}</b>${snap.site.tagline ? `<span>${esc(snap.site.tagline)}</span>` : ''}</div>`;
}

function header(snap, ctx) {
  const groups = menuGroups(snap, ctx);
  const items = groups.map((g) => {
    if (g.key === 'waitlist') {
      const main = g.links.find((l) => l.key === 'waitlist') ?? g.links[0];
      return `<li><a class="btn solid" href="${attr(main.href)}">${esc(label(snap, main.key))}</a></li>`;
    }
    const current = g.links.some((l) => l.href.split('#')[0] === ctx.section);
    return `<li><button class="navtop" type="button" aria-expanded="false"${current ? ' aria-current="page"' : ''}>${esc(g.label)} <i class="chev"></i></button>
      <ul class="drop">${g.links.map((l) => `<li><a href="${attr(l.href)}">${esc(l.text)}</a></li>`).join('')}</ul></li>`;
  }).join('');
  return `<header class="site"><div class="wrap bar">
    <a class="brand" href="/" aria-label="${attr(snap.site.kennel_name)} home">${brand(snap)}</a>
    <button class="menu-toggle" id="menu-toggle" type="button" aria-label="Menu" aria-expanded="false" aria-controls="main-nav"><span></span></button>
    <nav class="main" id="main-nav" aria-label="Main"><ul>${items}</ul></nav>
  </div></header>`;
}

function footer(snap, ctx) {
  const groups = menuGroups(snap, ctx).filter((g) => g.key !== 'waitlist');
  const year = ctx.today.slice(0, 4);
  const cols = [
    ['About us', groups.find((g) => g.key === 'about')?.links ?? []],
    ['Dogs and puppies', [...(groups.find((g) => g.key === 'residents')?.links.slice(0, 1) ?? []), ...(groups.find((g) => g.key === 'puppies')?.links ?? [])]],
    ['Buying a puppy', [...(groups.find((g) => g.key === 'how')?.links ?? []), ...(pageOn(snap, 'waitlist', ctx) ? [{ href: '/waitlist', text: label(snap, 'waitlist') }] : [])]],
  ].filter(([, links]) => links.length);
  return `<footer class="site"><div class="wrap">
    <div class="foot-brand"><a class="brand" href="/">${brand(snap)}</a>${snap.site.blurb ? `<p class="small">${esc(snap.site.blurb)}</p>` : ''}</div>
    ${cols.map(([h, links]) => `<div><h4>${esc(h)}</h4><ul>${links.map((l) => `<li><a href="${attr(l.href)}">${esc(l.text)}</a></li>`).join('')}</ul></div>`).join('')}
    <div class="fine"><span>© ${esc(year)} ${esc(snap.site.kennel_name)} · <a href="/privacy">Privacy</a></span><span>Made with KennelPort</span></div>
  </div></footer>`;
}

// schema.org LocalBusiness with town and region only (plan 3.9). JSON in a
// <script> is escaped so no "</script>" can close it.
function structuredData(snap, ctx) {
  const data = {
    '@context': 'https://schema.org', '@type': 'LocalBusiness', name: snap.site.kennel_name, url: `${ctx.origin}/`,
    ...(snap.site.town || snap.site.region ? { address: { '@type': 'PostalAddress', addressLocality: snap.site.town ?? undefined, addressRegion: snap.site.region ?? undefined } } : {}),
  };
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

export function layout(snap, ctx, { title, description, image, body, section, noindex = false }) {
  const pageTitle = title ? `${title} · ${snap.site.kennel_name}` : snap.site.kennel_name;
  const desc = description || snap.site.blurb || `${snap.site.kennel_name}${snap.site.breed ? `: ${snap.site.breed}` : ''}`;
  const canonical = `${ctx.origin}${ctx.path === '/' ? '/' : ctx.path}`;
  const shareImage = image ?? snap.home.hero?.photos?.[0] ?? Object.keys(snap.photos)[0];
  const og = [
    ['og:type', 'website'], ['og:site_name', snap.site.kennel_name], ['og:title', title || snap.site.kennel_name],
    ['og:description', desc], ['og:url', canonical],
    ...(shareImage && snap.photos[shareImage] ? [['og:image', `${ctx.origin}${photoUrl(shareImage)}`], ['og:image:alt', snap.photos[shareImage].alt || snap.site.kennel_name]] : []),
  ];
  const theme = snap.site.dark_mode === 'light_only' ? ' data-theme="light"' : '';
  const html = `<!doctype html><html lang="en"${theme}><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(pageTitle)}</title>
<meta name="description" content="${attr(desc)}">
<link rel="canonical" href="${attr(canonical)}">
${noindex || ctx.preview ? '<meta name="robots" content="noindex">\n' : ''}${og.map(([p, c]) => `<meta property="${p}" content="${attr(c)}">`).join('\n')}
<meta name="twitter:card" content="${og.some(([p]) => p === 'og:image') ? 'summary_large_image' : 'summary'}">
<link rel="preload" href="/_kp/fonts/fraunces-opsz-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/_kp/t/ak/site.css?v=${ASSET_VERSION}">
<script src="/_kp/t/ak/site.js?v=${ASSET_VERSION}" defer></script>
${ctx.path === '/' ? structuredData(snap, ctx) : ''}
</head><body>
${ctx.preview ? '<div class="preview-bar" role="status">Preview: this is the draft, not what visitors see. Publish from /ops to make it live.</div>' : ''}<a class="skip" href="#main">Skip to content</a>
${SPRITES(snap)}
${header(snap, { ...ctx, section })}
<main id="main">${body}</main>
${footer(snap, ctx)}
</body></html>`;
  return html;
}

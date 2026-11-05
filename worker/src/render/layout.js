// The page around every "ak" page: <head> with title, description, share
// preview (Open Graph) and structured data; the header and menu; the footer.
import { esc, attr, menuGroups, photoUrl, label, pageOn, payShown, familyLogin, word } from './parts.js';

import { ASSET_VERSION } from './version.js';
import { schemeOf, schemeFile, preloadFont, ORNAMENTS } from './schemes.js';

export { ASSET_VERSION };

function monogramSvg(snap) {
  const letters = (snap.site.monogram || snap.site.kennel_name.replace(/[^A-Za-z]/g, '').slice(0, 2) || 'K').slice(0, 3);
  return `<symbol id="mono" viewBox="0 0 48 48"><g fill="none" stroke="currentColor"><rect x="9" y="9" width="30" height="30" transform="rotate(45 24 24)" stroke-width="1.4"/><rect x="12.5" y="12.5" width="23" height="23" transform="rotate(45 24 24)" stroke-width=".7"/></g><text x="24" y="29.5" text-anchor="middle" font-family="'${attr(schemeOf(snap.site.scheme).display)}', Georgia, serif" font-size="${letters.length > 2 ? 12 : 15}" font-style="italic" fill="currentColor">${esc(letters)}</text></symbol>`;
}

const SPRITES = (snap) => `<svg width="0" height="0" class="sr-only" aria-hidden="true">
  <symbol id="sprig" viewBox="0 0 120 60">${ORNAMENTS[schemeOf(snap.site.scheme).ornament]}</symbol>
  ${monogramSvg(snap)}
</svg>`;

const logoOf = (snap) => (snap.site.logo_photo_id && snap.photos[snap.site.logo_photo_id] ? snap.photos[snap.site.logo_photo_id] : null);
const nameBlock = (snap) => `<div><b>${esc(snap.site.kennel_name)}</b>${snap.site.tagline ? `<span>${esc(snap.site.tagline)}</span>` : ''}</div>`;
const logoImg = (snap, cls = '') => {
  const p = logoOf(snap);
  const size = p.width && p.height ? ` width="${p.width}" height="${p.height}"` : '';
  return `<img${cls ? ` class="${cls}"` : ''} src="${photoUrl(snap.site.logo_photo_id, { thumb: Boolean(p.thumb) })}" alt="${attr(p.alt || `${snap.site.kennel_name} logo`)}"${size}>`;
};

// The monogram, or her own logo (plan 3.12). In the header the logo is its own
// link to the full-size picture, which the template's script opens in a dialog;
// the name beside it goes home.
function brand(snap) {
  return `<svg aria-hidden="true"><use href="#mono"/></svg>${nameBlock(snap)}`;
}
function headerBrand(snap) {
  if (!logoOf(snap)) return `<a class="brand" href="/" aria-label="${attr(snap.site.kennel_name)} home">${brand(snap)}</a>`;
  return `<div class="brand"><a class="brand-logo" href="${photoUrl(snap.site.logo_photo_id)}" data-logo-zoom aria-label="Show the ${attr(snap.site.kennel_name)} logo full size">${logoImg(snap)}</a><a class="brand-name" href="/" aria-label="${attr(snap.site.kennel_name)} home">${nameBlock(snap)}</a></div>`;
}
function footerBrand(snap) {
  return `<a class="brand" href="/">${logoOf(snap) ? `<span class="brand-logo">${logoImg(snap)}</span>${nameBlock(snap)}` : brand(snap)}</a>`;
}
// The full-size logo, opened by site.js; without the script the link opens the picture.
const logoDialog = (snap) => (logoOf(snap) ? `<dialog class="logo-zoom" id="logo-zoom" aria-label="${attr(snap.site.kennel_name)} logo"><form method="dialog"><button class="logo-close" aria-label="Close">×</button></form><img src="${photoUrl(snap.site.logo_photo_id)}" alt="${attr(logoOf(snap).alt || `${snap.site.kennel_name} logo`)}" loading="lazy"></dialog>` : '');

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
  // Family login (plan 3.8): beside the Waitlist button (familyLogin says where).
  const fl = familyLogin(snap, ctx);
  const login = fl ? `<li><a class="navtop" href="${attr(fl.href)}"${fl.external ? ' rel="noopener noreferrer" target="_blank"' : ''}>${esc(word(snap, 'family_login'))}</a></li>` : '';
  const withLogin = login && items.includes('class="btn solid"') ? items.replace(/<li><a class="btn solid"/, `${login}<li><a class="btn solid"`) : items + login;
  return `<header class="site"><div class="wrap bar">
    ${headerBrand(snap)}
    <button class="menu-toggle" id="menu-toggle" type="button" aria-label="Menu" aria-expanded="false" aria-controls="main-nav"><span></span></button>
    <nav class="main" id="main-nav" aria-label="Main"><ul>${withLogin}</ul></nav>
  </div></header>`;
}

function footer(snap, ctx) {
  const groups = menuGroups(snap, ctx).filter((g) => g.key !== 'waitlist');
  const year = ctx.today.slice(0, 4);
  const cols = [
    ['About us', groups.find((g) => g.key === 'about')?.links ?? []],
    ['Dogs and puppies', [...(groups.find((g) => g.key === 'residents')?.links.slice(0, 1) ?? []), ...(groups.find((g) => g.key === 'puppies')?.links ?? [])]],
    ['Buying a puppy', [...(groups.find((g) => g.key === 'how')?.links ?? []), ...(pageOn(snap, 'waitlist', ctx) ? [{ href: '/waitlist', text: label(snap, 'waitlist') }] : []), ...(payShown(snap, ctx) ? [{ href: '/waitlist#how-to-pay', text: 'How to pay' }] : []), ...(familyLogin(snap, ctx) ? [{ ...familyLogin(snap, ctx), text: word(snap, 'family_login') }] : [])]],
  ].filter(([, links]) => links.length);
  return `<footer class="site"><div class="wrap">
    <div class="foot-brand">${footerBrand(snap)}${snap.site.blurb ? `<p class="small">${esc(snap.site.blurb)}</p>` : ''}</div>
    ${cols.map(([h, links]) => `<div><h4>${esc(h)}</h4><ul>${links.map((l) => `<li><a href="${attr(l.href)}"${l.external ? ' rel="noopener noreferrer" target="_blank"' : ''}>${esc(l.text)}</a></li>`).join('')}</ul></div>`).join('')}
    <div class="fine"><span>${esc(word(snap, 'copyright', { year, kennel: snap.site.kennel_name }))} · <a href="/privacy">Privacy</a></span><span>Made with <a href="https://kennelport.com/">KennelPort</a> · <a href="https://kennelport.com/terms">Terms</a></span></div>
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
  const theme = `${snap.site.dark_mode === 'light_only' ? ' data-theme="light"' : ''} data-scheme="${attr(schemeOf(snap.site.scheme).id)}"`;
  const html = `<!doctype html><html lang="en"${theme}><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(pageTitle)}</title>
<meta name="description" content="${attr(desc)}">
<link rel="canonical" href="${attr(canonical)}">
${noindex || ctx.preview ? '<meta name="robots" content="noindex">\n' : ''}${og.map(([p, c]) => `<meta property="${p}" content="${attr(c)}">`).join('\n')}
<meta name="twitter:card" content="${og.some(([p]) => p === 'og:image') ? 'summary_large_image' : 'summary'}">
<link rel="preload" href="/_kp/fonts/${preloadFont(snap.site.scheme)}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/_kp/t/ak/${schemeFile(snap.site.scheme)}?v=${ASSET_VERSION}">
<link rel="stylesheet" href="/_kp/t/ak/site.css?v=${ASSET_VERSION}">
<script src="/_kp/t/ak/site.js?v=${ASSET_VERSION}" defer></script>
${ctx.path === '/' ? structuredData(snap, ctx) : ''}
</head><body>
${ctx.adminBar ? `<div class="preview-bar" role="status">${esc(ctx.adminBar.text)} <a href="${attr(ctx.adminBar.back)}"><u>Back to the build</u></a></div>`
  : ctx.preview ? '<div class="preview-bar" role="status">Preview: this is the draft, not what visitors see. Publish from /ops to make it live.</div>' : ''}<a class="skip" href="#main">Skip to content</a>
${SPRITES(snap)}
${header(snap, { ...ctx, section })}
<main id="main">${body}</main>
${logoDialog(snap)}
${footer(snap, ctx)}
</body></html>`;
  return html;
}

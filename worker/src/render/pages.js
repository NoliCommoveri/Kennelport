// The "ak" template's pages. Each takes the snapshot and the request context and
// returns { title, description, image, section, body } for layout(), or null for
// "no such page". Split out into pages/, a page at a time (docs/review/
// senior-review-2026-11.md, item 7): about, reviews, contact, albums, privacy, puppy
// (routed by index.js), and pieces used here (albumLists, formParts, applicationForm,
// blocks: the data blocks).
// The frame they share (assemble, badgeRow, embedsBlock, framed, shareRow,
// faqSection, profileFor, profileBody) is exported from this file.
import {
  esc, attr, fmtDate, paras, img, pageOn, label, olderPuppies, sortPuppies, pairNames, litterCard, parentCards, litterFacts, dogCard, coCard,
  partnerOf, coOwnedWith, partnerLogo, partnerLink, puppyCard, slider, expanders, pagehead, head, ICONS, paySection,
  payShown, litterChoices, ANY_LITTER, ABOUT_LABEL, dogGroups, descendantsOf, depositsAhead, soonSection, pricesOff, sitePrice, word, sexWord, fullRegLink,
  fullRegSurchargeRow, galleryHtml, faqBlock, addedOn, addedWords, addedRow, customPage,
} from './parts.js';
import { embedView } from '../embeds.js';
import { litterAlbums, dogAlbums } from './pages/albumLists.js';
import { v, honeypot, turnstileBox, formResult } from './pages/formParts.js';
import { kennelosForm } from './pages/applicationForm.js';
import { dataBlock, saleOf } from './pages/blocks.js';
import { homeBlocks, pageBlocks, BREEDER_SWITCH, PAGE_PARTS, PAGE_HEADS, headFor, BLOCK_TYPES, cleanProfile } from '../content/blocks.js';
import { HOME_WORDS, COLLAGE_LAYOUTS, collageLayout, HOME_BADGES_MAX, brandImageOk, badgeAddress, PAGES } from '../content/model.js';

// A question from her FAQ, where she has placed it (plan 3.9): its own band under
// the page's heading, so it sits above what the page is about and takes the
// spacing every other section has. A record's own page (a dog, a litter, a puppy)
// puts the same block inside its first wrap instead, under the breadcrumb, which
// is why that one is `faqBlock` and this one wraps it in a section.
export const faqSection = (snap, place) => {
  const html = faqBlock(snap, place);
  return html ? `<section class="section tight"><div class="wrap">${html}</div></section>` : '';
};

// A Share button (plan 5.4): the phone's own share sheet, or the link copied.
// Shown only with the template's script.
export const shareRow = (center = false) => `<p class="share-row${center ? ' center' : ''}" data-share-row hidden><button type="button" class="btn line" data-share>Share</button><span class="small muted" role="status"></span></p>`;

// ---------- Videos and posts (plan 3.3) ----------
// A preview (stored on the site) with a play button, linking to the original. The
// template's script swaps in the provider's player only when tapped, so nothing
// from YouTube, Facebook and the rest loads before that.
function embedBox(snap, e) {
  const v = embedView(e);
  if (!v) return '';
  const pic = img(snap, v.preview_photo_id, { alt: '', cls: 'em-pic' }) ?? `<span class="em-ph">${esc(v.name)}</span>`;
  const label = v.title ? `${v.title} (${v.name})` : `${v.name} ${v.shape === 'post' ? 'post' : 'video'}`;
  return `<figure class="em em-${v.shape}"><a class="em-start" href="${attr(v.link)}" rel="noopener noreferrer" target="_blank" data-embed="${attr(v.src)}" aria-label="Play: ${attr(label)}">${pic}<span class="em-play" aria-hidden="true"></span></a>
    <figcaption><span>${esc(v.title || v.name)}</span><a class="small muted" href="${attr(v.link)}" rel="noopener noreferrer" target="_blank">Open on ${esc(v.name)}</a></figcaption></figure>`;
}
export function embedsBlock(snap, place, { heading = 'Videos and posts', band = false, inWrap = false } = {}) {
  const list = snap.embeds?.[place] ?? [];
  if (!list.length) return '';
  const inner = `${head(null, heading)}<div class="ems">${list.map((e) => embedBox(snap, e)).join('')}</div>`;
  return inWrap ? `<div class="mt-26">${inner}</div>` : `<section class="section${band ? ' band' : ''}"><div class="wrap">${inner}</div></section>`;
}

// The vine frame round each photo: a leafy stem along each edge and curled round
// each corner, in the scheme's accent, drawn by masks in site.css.
const VINE_PARTS = ['t', 'b', 'l', 'r', 'c tl', 'c tr', 'c bl', 'c br'];
const VINE = `<div class="vine" aria-hidden="true">${VINE_PARTS.map((p) => `<i class="${p}"></i>`).join('')}</div>`;
// A photo in one of the collage's frames (FRAMES), or bare: the story photos' choice.
export const framed = (pic, frame) => (pic && frame && frame !== 'none' ? `<div class="story-pic frame-${frame}"><div class="box">${pic}${frame === 'sprig' ? VINE : ''}</div></div>` : pic);
const sprigs = '<svg class="sprig l" aria-hidden="true"><use href="#sprig"/></svg><svg class="sprig r" aria-hidden="true"><use href="#sprig"/></svg>';
// A collage: photos ({id, focus}) in a layout's boxes (model.js COLLAGE_LAYOUTS),
// each its own shape with the part to keep, in one of the frames; never an empty
// box (collageLayout), and nothing with no photos. Home's and the owner's blocks.
function collageOf(snap, list, layoutKey, frame, { lazyFirst = false } = {}) {
  const chosen = list.filter((x) => snap.photos[x.id]);
  const layout = collageLayout(layoutKey, chosen.length);
  if (!layout) return { layout: null, html: '' };
  const boxes = COLLAGE_LAYOUTS[layout].boxes;
  const photos = chosen.map((x, i) => `<div class="box ${boxes[i]} f-${x.focus ?? 'middle'}">${img(snap, x.id, { lazy: lazyFirst || i > 0 })}${frame === 'sprig' ? VINE : ''}</div>`);
  return { layout, html: `<div class="hero-photos ${layout} frame-${frame}">${photos.join('')}</div>` };
}
const scriptLine = (text, script) => `${esc(text ?? '')}${script ? ` <span class="script">${esc(script)}</span>` : ''}`;

// ---------- Recommended products: links out ----------
// A referral link opens in a new tab, marked sponsored for search engines.
const outLink = (href, inner, cls = '') => `<a${cls ? ` class="${cls}"` : ''} href="${attr(href)}" target="_blank" rel="noopener sponsored">${inner}</a>`;

// A product's picture: the brand's own, from the brand (as its referral program
// intends), else her copy.
const productPic = (snap, x, { cls = '', lazy = true } = {}) => (x.image_url && brandImageOk(x.image_url)
  ? `<img src="${attr(x.image_url)}" alt="${attr(x.name)}"${cls ? ` class="${cls}"` : ''}${lazy ? ' loading="lazy"' : ''}>`
  : img(snap, x.photo_id, { alt: x.name, cls, lazy }));

// One badge: the logo, then its name and web address under it (badgeAddress), the
// logo and address linked to the product's link when it has one. A transport
// service with no picture yet shows its name in the logo's place (and not again
// under it), so it isn't left off its page; a code shows under the address.
function badgeItem(snap, x, { lazy = true, withCode = false, nameIfNoPic = false } = {}) {
  const logo = productPic(snap, x, { lazy });
  const pic = logo ?? (nameIfNoPic ? `<span class="badge-name">${esc(x.name)}</span>` : null);
  if (!pic) return '';
  const addr = badgeAddress(x);
  const name = logo ? `<span class="badge-label">${esc(x.name)}</span>` : '';
  const code = withCode && x.code ? `<span class="badge-code">Use code <b>${esc(x.code)}</b></span>` : '';
  return `<li>${x.link_url ? outLink(x.link_url, pic, 'badge-pic') : pic}${name}${addr ? (x.link_url ? outLink(x.link_url, esc(addr), 'badge-addr') : `<span class="badge-addr">${esc(addr)}</span>`) : ''}${code}</li>`;
}
const badgeList = (items, cls = '') => {
  const html = items.filter(Boolean);
  return html.length ? `<ul class="badges-${Math.min(html.length, 2)}${cls}">${html.join('')}</ul>` : '';
};

// Up to two logos right under the banner, side by side even on a phone.
export function homeBadges(snap) {
  const list = (snap.products ?? []).filter((x) => x.home_badge && productPic(snap, x)).slice(0, HOME_BADGES_MAX);
  const ul = badgeList(list.map((x) => badgeItem(snap, x, { lazy: false })));
  return ul ? `<section class="wrap badges" aria-label="Recommended">${ul}</section>` : '';
}

// The badge row on another page (model.js BADGE_PLACES), where that page puts it:
// her products with the place ticked, at most two. `inWrap`: inside the page's
// own wrap (a record's page), else its own section.
export function badgeRow(snap, place, { inWrap = false } = {}) {
  const list = (snap.products ?? []).filter((x) => (x.badge_places ?? []).includes(place) && productPic(snap, x)).slice(0, HOME_BADGES_MAX);
  const ul = badgeList(list.map((x) => badgeItem(snap, x)));
  if (!ul) return '';
  const inner = `<div class="badges badges-row" role="group" aria-label="We recommend"><span class="eyebrow">We recommend</span>${ul}</div>`;
  return inWrap ? `<div class="mt-26">${inner}</div>` : `<section class="section tight"><div class="wrap">${inner}</div></section>`;
}

export function products(snap, ctx) {
  const p = snap.pages.products;
  // Transport services are on Getting your pup home, never here.
  const list = (snap.products ?? []).filter((x) => !x.transport);
  const card = (x) => {
    const pic = productPic(snap, x, { cls: 'prod-pic' });
    const code = x.code ? `<p class="prod-code">Use code <b>${esc(x.code)}</b>${x.code_note ? ` <span class="small muted">${esc(x.code_note)}</span>` : ''}</p>` : '';
    return `<article class="pkg prod">${pic ? (x.link_url ? outLink(x.link_url, pic, 'prod-pic-link') : pic) : ''}
      ${x.grp ? `<span class="eyebrow">${esc(x.grp)}</span>` : ''}<h3>${esc(x.name)}</h3>
      ${x.description ? paras(x.description) : ''}${code}
      ${x.link_url ? outLink(x.link_url, esc(x.link_label || 'Shop now'), 'btn line') : ''}</article>`;
  };
  return {
    title: p.heading || label(snap, 'products'), section: '/recommended', description: p.lede,
    body: assemble(snap, ctx, 'products', {
      head: pagehead(p, PAGE_HEADS.products),
      list: `<section class="section tight"><div class="wrap">
        <div class="pkgs prods">${list.map(card).join('')}</div>
        ${p.note ? `<p class="small muted center mt-20">${esc(p.note)}</p>` : ''}
      </div></section>`,
    }),
  };
}

// ---------- Getting your pup home (plan 3.5) ----------
// Her words on picking up, transport and travel day, each its own band when it has
// words; then her transport services as badges (logo, address, code), and any
// other product she ticked for this page. Built from the template's own parts (no
// prototype screen for it): pagehead, head + prose, the badge row.
export function pickup(snap, ctx) {
  const p = snap.pages.pickup;
  const blocks = [
    ['pickup', 'Pickup', 'Picking up your puppy'],
    ['transport', 'Transport', 'If you can\'t come to us'],
    ['travel', 'Travel day', 'On the way home'],
  ].filter(([k]) => p[`${k}_text`]);
  const transport = (snap.products ?? []).filter((x) => x.transport);
  const sections = blocks.map(([k, eyebrow, fallback], i) => {
    const band = i % 2 === 1;
    const inner = `${head(eyebrow, p[`${k}_heading`] || fallback, null)}<div class="prose">${paras(p[`${k}_text`])}</div>`;
    // The transport services sit with her transport words when she has some.
    const services = k === 'transport' ? transportBadges(snap, p, transport) : '';
    return `<section class="section${i ? '' : ' tight'}${band ? ' band' : ''}" id="${k}"><div class="wrap">${inner}${services}</div></section>`;
  });
  const placed = blocks.some(([k]) => k === 'transport');
  if (!placed && transport.length) sections.push(`<section class="section band" id="transport"><div class="wrap">${transportBadges(snap, p, transport, { own: true })}</div></section>`);
  return {
    title: p.heading || label(snap, 'pickup'), section: '/pickup', description: p.lede,
    body: assemble(snap, ctx, 'pickup', {
      head: pagehead(p, PAGE_HEADS.pickup),
      faq: faqSection(snap, 'pickup'),
      words: sections.join('\n'),
      badges: badgeRow(snap, 'pickup'),
    }),
  };
}

// Her transport services, as badges under her transport words (or as their own
// band when she wrote none).
function transportBadges(snap, p, list, { own = false } = {}) {
  const ul = badgeList(list.map((x) => badgeItem(snap, x, { withCode: true, nameIfNoPic: true })), ' badges-wrap');
  if (!ul) return '';
  const heading = p.badges_heading || 'Transport we trust';
  return `<div class="badges badges-row${own ? '' : ' mt-26'}" role="group" aria-label="${attr(heading)}">${own ? head('Transport', heading, p.badges_note || null) : `<span class="eyebrow">${esc(heading)}</span>${p.badges_note ? `<p class="small muted">${esc(p.badges_note)}</p>` : ''}`}${ul}</div>`;
}

// ---------- a page as its blocks ----------

// A page other than Home, as its blocks in order (content/blocks.js): the owner's
// build, or today's page, which this draws as before blocks. `parts` is what the
// page has to draw: its heading, its spots (faq, badges, embeds) and its built-in
// sections by id. A built-in marked `inside` takes the badge row placed right after
// it into its own wrap (`inWrap`), as today; elsewhere the row is its own section.
// A FAQ spot or badge row the page doesn't draw itself (one the owner added, step
// 3.6) shows what the breeder placed on this page, by its key.
export function assemble(snap, ctx, key, parts) {
  const blocks = snap.layout?.[key] ?? pageBlocks(null, key);
  parts = { faq: faqSection(snap, key), badges: badgeRow(snap, key), badgesIn: badgeRow(snap, key, { inWrap: true }), ...parts };
  const out = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    let html = '';
    if (b.type === 'builtin') {
      const inside = PAGE_PARTS[key][b.id]?.inside && blocks[i + 1]?.type === 'badges';
      if (inside) i++;
      const p = parts[b.id];
      html = typeof p === 'function' ? p({ badges: inside ? parts.badgesIn : '' }) : p ?? '';
    } else if (b.type === 'head' || b.type === 'faq' || b.type === 'badges' || b.type === 'embeds') html = parts[b.type] ?? '';
    else if (BLOCK_TYPES[b.type].kind === 'own') html = ownBlock(snap, ctx, b, key);
    else html = dataBlock(snap, ctx, b, key);
    if (html) out.push(styled(b, html));
  }
  return out.join('\n      ');
}
const has = (snap, key, id) => (snap.layout?.[key] ?? pageBlocks(null, key)).some((b) => b.id === id);

// A page the owner added: its heading (her words, or the page's name) and its blocks.
export function custom(snap, ctx, key) {
  const c = customPage(snap, key);
  if (!c) return null;
  const p = snap.pages[key] ?? {};
  return {
    title: p.heading || label(snap, key), section: c.path, description: p.lede,
    body: assemble(snap, ctx, key, { head: pagehead(p, headFor(key, c)) }),
  };
}

// ---------- the owner's own blocks, and every block's look (step 4) ----------

// A block with a look of its own (content/blocks.js cleanStyle) sits in a wrap that
// gives it a scheme colour (text in the scheme's matching ink), space around it and,
// on her own blocks, a text size. A block with none is drawn as before, unwrapped.
function styled(b, html) {
  if (!b.s || !html) return html;
  const c = ['kb', b.s.bg && `bg-${b.s.bg}`, b.s.py && `py-${b.s.py}`, b.s.px && `px-${b.s.px}`, b.s.text && `t-${b.s.text}`].filter(Boolean).join(' ');
  return `<div class="kb-o"><div class="${c}">${html}</div></div>`;
}

// Where a button goes, or null: a page that's off, or a phone or email that isn't
// there, hides the button rather than going nowhere. Hers (block_switches) over the
// owner's: an outside link, a phone number, an email address.
export function linkFor(snap, ctx, link, her = {}) {
  if (!link) return null;
  const s = snap.site;
  if (link.to === 'page') {
    if (link.page === 'home') return { href: '/' };
    const path = PAGES[link.page]?.path ?? customPage(snap, link.page)?.path;
    return path && pageOn(snap, link.page, ctx) ? { href: path } : null;
  }
  if (link.to === 'url') { const u = her.url || link.value; return /^https?:\/\//i.test(u ?? '') ? { href: u, external: true } : null; }
  if (link.to === 'email') { const e = her.email || link.value || s.contact_email; return e ? { href: `mailto:${e}` } : null; }
  const n = String(her.phone || link.value || s.contact_phone || '').replace(/[^\d+]/g, '');
  return n ? { href: `${link.to === 'sms' ? 'sms' : 'tel'}:${n}` } : null;
}
const aTo = (l, cls, text) => `<a class="${cls}" href="${attr(l.href)}"${l.external ? ' rel="noopener noreferrer" target="_blank"' : ''}>${esc(text)}</a>`;

function ownBlock(snap, ctx, b, key) {
  if (!addedOn(snap, key, b)) return '';
  const her = addedRow(snap, key, b) ?? {};
  const w = addedWords(snap, key, b);
  const link = b.link ? linkFor(snap, ctx, b.link, her) : null;
  const photoId = b.mayChange && her.photo_id ? her.photo_id : b.photo;
  if (b.type === 'banner') {
    if (!w.heading && !w.line && !link) return '';
    return `<section class="own-banner"><div class="wrap"><div>${w.heading ? `<h2>${esc(w.heading)}</h2>` : ''}${w.line ? `<p>${esc(w.line)}</p>` : ''}</div>${link && w.label ? aTo(link, 'btn', w.label) : ''}</div></section>`;
  }
  if (b.type === 'button') {
    if (!link || !w.label) return '';
    return `<div class="own-button wrap a-${b.align}">${aTo(link, `btn ${b.look} sz-${b.size}`, w.label)}</div>`;
  }
  if (b.type === 'factrow') {
    // Hers over the owner's; drawn as Home's facts row on its own.
    const items = her.facts?.length ? her.facts : b.items;
    return items.length ? `<section class="section tight own-facts"><div class="wrap"><div class="facts">${items.map(([v, l]) => `<div><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div></div></section>` : '';
  }
  if (b.type === 'words') {
    if (!w.heading && !w.line && !w.body) return '';
    // The template's own section head and prose (as Getting your pup home draws them).
    const top = w.heading || w.line ? `<div class="head">${w.heading ? `<h2>${esc(w.heading)}</h2>` : ''}${w.line ? `<p class="lede">${esc(w.line)}</p>` : ''}</div>` : '';
    return `<section class="own-words a-${b.align}"><div class="wrap">${top}${w.body ? `<div class="prose">${paras(w.body)}</div>` : ''}</div></section>`;
  }
  if (b.type === 'columns') {
    // Hers over the owner's; the prototype's features (a subheading over its words),
    // two or three across on a computer, one under another on a phone.
    const cols = her.cols?.length ? her.cols : b.cols;
    if (!cols.length) return '';
    const top = w.heading || w.line ? `<div class="head">${w.heading ? `<h2>${esc(w.heading)}</h2>` : ''}${w.line ? `<p class="lede">${esc(w.line)}</p>` : ''}</div>` : '';
    return `<section class="own-cols a-${b.align}"><div class="wrap">${top}<div class="features n-${b.across}">${cols.map(([h, t]) => `<div class="feature">${h ? `<b>${esc(h)}</b>` : ''}${paras(t)}</div>`).join('')}</div></div></section>`;
  }
  if (b.type === 'divider') {
    const inner = b.style === 'ornament' ? '<svg class="orn" aria-hidden="true"><use href="#sprig"/></svg>' : '<hr>';
    return `<div class="own-divider ${b.style} w-${b.width}${b.width === 'full' ? '' : ' wrap'}" role="presentation">${inner}</div>`;
  }
  if (b.type === 'spacer') return `<div class="own-spacer h-${b.height}" aria-hidden="true"></div>`;
  if (b.type === 'photo') {
    const pic = img(snap, photoId);
    if (!pic) return '';
    const cap = b.mayChange && her.caption ? her.caption : w.caption;
    // A frame (the collage's) round the photo; a full-width photo goes edge to edge, unframed.
    const framed = b.frame !== 'none' && b.shape !== 'full';
    return `<figure class="own-photo ${b.shape}${b.shape === 'full' ? '' : ' wrap'} f-${b.focus}${framed ? ` frame-${b.frame}` : ''}">${framed ? `<div class="box">${pic}${b.frame === 'sprig' ? VINE : ''}</div>` : pic}${cap ? `<figcaption>${esc(cap)}</figcaption>` : ''}</figure>`;
  }
  if (b.type === 'gallery') {
    // A row of photos (the album page's gallery and viewer): hers where the owner lets
    // her pick, else the album's (shown albums only) or the owner's picks; how many
    // show; a link to the whole album where it has a page.
    const album = b.source === 'album' ? snap.albums?.find((a) => a.id === b.album) : null;
    const ids = (b.mayChange && her.photos?.length ? her.photos : album ? album.photos : b.source === 'pick' ? b.photos : []).filter((id) => snap.photos[id]).slice(0, Number(b.count));
    if (!ids.length) return '';
    const row = galleryHtml(snap, ids, album?.title ?? w.heading ?? '').replace('<div class="gallery">', `<div class="gallery strip n-${b.count}">`);
    // A border round the whole strip, where she picked one.
    const strip = b.frame === 'none' ? row : `<div class="strip-frame frame-${b.frame}">${row}</div>`;
    const more = album && b.more && w.label && pageOn(snap, 'albums', ctx) ? `<p class="center mt-20"><a class="more" href="/albums/${attr(album.slug)}">${esc(w.label)}</a></p>` : '';
    const top = w.heading || w.line ? `<div class="head">${w.heading ? `<h2>${esc(w.heading)}</h2>` : ''}${w.line ? `<p class="lede">${esc(w.line)}</p>` : ''}</div>` : '';
    return `<section class="section own-gallery"><div class="wrap">${top}${strip}${more}</div></section>`;
  }
  if (b.type === 'beside') {
    // The prototype's story: a photo beside a heading, words and a button. On a
    // computer the photo sits left or right; on a phone it goes above the words.
    const pic = img(snap, photoId) ?? '';
    const button = link && w.label ? `<div>${aTo(link, 'btn solid', w.label)}</div>` : '';
    if (!pic && !w.heading && !w.body && !button) return '';
    const side = pic && b.side === 'right' ? ' pic-right' : '';
    return `<section class="section own-beside"><div class="wrap story${pic ? '' : ' no-photo'}${side} f-${b.focus}">${framed(pic, b.frame)}<div class="story-copy a-${b.align}">${w.heading ? `<h2>${esc(w.heading)}</h2>` : ''}${w.body ? paras(w.body) : ''}${button}</div></div></section>`;
  }
  if (b.type === 'collage') {
    // Hers where the owner lets her change them and she has chosen some; the
    // owner's layout and frame either way.
    const ids = b.mayChange && her.photos?.length ? her.photos : b.photos;
    const focus = b.mayChange && her.photos?.length ? her.focus ?? [] : b.focus;
    const { html } = collageOf(snap, ids.map((id, i) => ({ id, focus: focus[i] })), b.layout, b.frame, { lazyFirst: true });
    return html ? `<section class="own-collage"><div class="wrap">${html}</div></section>` : '';
  }
  if (b.type === 'overlay') {
    const pic = img(snap, photoId);
    if (!pic) return '';
    return `<section class="own-over v-${b.v} h-${b.h} shade-${b.shade} f-${b.focus}">${pic}<div class="over"><div class="wrap">${w.heading ? `<h2>${esc(w.heading)}</h2>` : ''}${w.line ? `<p>${esc(w.line)}</p>` : ''}${link && w.label ? aTo(link, 'btn solid', w.label) : ''}</div></div></section>`;
  }
  return '';
}

// ---------- Home ----------

// Home, as its blocks in order (content/blocks.js): the owner's build, or today's
// Home (HOME_DEFAULT), which this draws exactly as before blocks. The breeder's
// switches and words for each block are home_blocks, as always.
export function home(snap, ctx) {
  const h = snap.home;
  const blocks = snap.layout?.home ?? homeBlocks(null);
  const parts = [];
  const waitlistOn = pageOn(snap, 'waitlist', ctx);
  const on = (b) => !BREEDER_SWITCH.includes(b.id) || Boolean(h[b.id]?.enabled);
  const factsRow = () => (h.facts.enabled && h.facts.items?.length
    ? `<div class="facts">${h.facts.items.map(([v, l]) => `<div><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>` : '');

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.type === 'hero') {
      // The facts row and the badge row right after the top block sit in it, as
      // they always have: the badges under the banner, the facts under the words.
      const inside = new Set();
      while (['facts', 'badges'].includes(blocks[i + 1]?.type) && !inside.has(blocks[i + 1].type)) inside.add(blocks[++i].type);
      // As before, the top block's place is kept even when it draws nothing.
      parts.push(heroBlock(snap, ctx, { facts: inside.has('facts') ? factsRow() : '', badges: inside.has('badges'), waitlistOn }));
      continue;
    }
    // The question spot and videos keep their place too; the rest only when they draw.
    if (b.type === 'faq') { parts.push(styled(b, faqSection(snap, 'home'))); continue; }
    if (b.type === 'embeds') { parts.push(styled(b, embedsBlock(snap, 'home'))); continue; }
    if (BLOCK_TYPES[b.type].kind === 'own') { const own = ownBlock(snap, ctx, b, 'home'); if (own) parts.push(styled(b, own)); continue; }
    if (!on(b)) continue;
    let html = '';
    if (b.type === 'facts') {
      const row = factsRow();
      html = row ? `<section class="section tight"><div class="wrap">${row}</div></section>` : '';
    } else if (b.type === 'badges') html = homeBadges(snap);
    else if (b.type === 'text') html = storyBlock(snap, ctx);
    else if (b.type === 'band') {
      html = waitlistOn ? `<section class="cta"><div class="wrap"><div>${(h.waitlist.heading ?? HOME_WORDS.waitlist.heading) ? `<h2>${esc(h.waitlist.heading ?? HOME_WORDS.waitlist.heading)}</h2>` : ''}${h.waitlist.line ? `<p>${esc(h.waitlist.line)}</p>` : ''}</div><a class="btn" href="/waitlist">${esc(h.waitlist.button_label || 'Join the waitlist')}</a></div></section>` : '';
    } else html = dataBlock(snap, ctx, b, 'home');
    if (html) parts.push(styled(b, html));
  }

  return { title: null, section: '/', image: h.hero.photos?.[0] ?? h.hero.banner_photo_id, body: parts.join('\n') };
}


function heroBlock(snap, ctx, { facts, badges, waitlistOn }) {
  const h = snap.home;
  // With the top block off, the badges still lead the page.
  if (!h.hero.enabled) return badges ? homeBadges(snap) : '';
  // The collage: the breeder's layout, each box its own shape with her photo in it
  // and the part she chose to keep; never an empty box (collageLayout).
  const { layout, html: collage } = collageOf(snap, (h.hero.photos ?? []).map((id, i) => ({ id, focus: h.hero.focus?.[i] ?? 'middle' })), h.hero.layout, h.hero.frame ?? 'mat');
  const banner = h.hero.banner_photo_id && snap.photos[h.hero.banner_photo_id]
    ? `<div class="banner f-${h.hero.banner_focus ?? 'middle'}">${img(snap, h.hero.banner_photo_id, { lazy: false })}</div>` : '';
  const buttons = [
    waitlistOn ? `<a class="btn solid" href="/waitlist">${esc(h.hero.primary_label || 'Join the waitlist')}</a>` : '',
    pageOn(snap, 'litters', ctx) ? `<a class="btn line" href="/litters">${esc(h.hero.secondary_label || 'See our puppies')}</a>` : '',
  ].join('');
  return `${banner}${badges ? homeBadges(snap) : ''}<section class="wrap hero${layout ? '' : ' no-photos'}"><div class="hero-copy">
      ${h.hero.eyebrow ? `<span class="eyebrow">${esc(h.hero.eyebrow)}</span>` : ''}
      ${(h.hero.headline ?? snap.site.kennel_name) || h.hero.script ? `<h1>${scriptLine(h.hero.headline ?? snap.site.kennel_name, h.hero.script)}</h1>` : ''}
      ${h.hero.intro ? `<p>${esc(h.hero.intro)}</p>` : ''}
      ${buttons ? `<div class="hero-actions">${buttons}</div>` : ''}${facts}
    </div>${collage}</section>`;
}

function storyBlock(snap, ctx) {
  const s = snap.home.story;
  if (!(s.text || s.heading)) return '';
  // No photo (or "No photo" in the manage app): the words take the whole width.
  const photo = framed(img(snap, s.photo_id) ?? '', s.photo_frame);
  const features = (s.features ?? []).map((f) => `<div class="feature"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">${ICONS[f.icon] ?? ICONS.heart}</svg><b>${esc(f.title)}</b><p>${esc(f.text)}</p></div>`).join('');
  return `<section class="section band"><div class="wrap story${photo ? '' : ' no-photo'}">${photo}<div class="story-copy">
      ${s.eyebrow ? `<span class="eyebrow">${esc(s.eyebrow)}</span>` : ''}
      ${s.heading || s.script ? `<h2>${scriptLine(s.heading, s.script)}</h2>` : ''}
      ${s.text ? `<p>${esc(s.text)}</p>` : ''}
      ${features ? `<div class="features">${features}</div>` : ''}
      ${pageOn(snap, 'about', ctx) ? `<div><a class="more" href="/about">${esc(s.link_label || 'Read our full story')}</a></div>` : ''}
    </div></div></section>`;
}


// ---------- Kennel residents ----------


export function dogs(snap, ctx) {
  const p = snap.pages.dogs;
  const g = dogGroups(snap);
  const list = g.breeding;
  const both = list.some((d) => d.sex === 'female') && list.some((d) => d.sex === 'male');
  // A group with nothing in it doesn't appear (plan 3.12).
  const group = (id, eyebrow, heading, lede, dogsIn) => (dogsIn.length ? `<section class="section band" id="${id}"><div class="wrap">
      ${head(eyebrow, heading, lede)}
      <div class="grid${dogsIn.length === 1 ? ' narrow-grid' : ''}">${dogsIn.map((d) => dogCard(snap, d, { sale: saleOf(snap, ctx, d) })).join('')}</div>
    </div></section>` : '');
  return {
    title: snap.pages.dogs.heading || label(snap, 'dogs'), section: '/dogs', description: p.lede,
    body: assemble(snap, ctx, 'dogs', {
      head: pagehead(p, PAGE_HEADS.dogs),
      faq: faqSection(snap, 'dogs'),
      all: list.length ? `<section class="section tight"><div class="wrap"><span id="girls"></span><span id="boys"></span>
      ${both ? `<div class="filter"><label for="dog-filter">Show</label><select id="dog-filter"><option value="all">${esc(word(snap, 'dogs_all'))}</option><option value="female">${esc(word(snap, 'girls'))}</option><option value="male">${esc(word(snap, 'boys'))}</option></select></div>` : ''}
      <div class="grid" id="all-dogs">${list.map((d) => `<div data-sex="${d.sex}">${dogCard(snap, d)}</div>`).join('')}</div>
      <p class="flip-hint">${esc(word(snap, 'flip_hint'))}</p></div></section>` : '',
      upcoming: group('up-and-coming', word(snap, 'upcoming_eyebrow'), word(snap, 'upcoming_heading'), word(snap, 'upcoming_lede'), g.upcoming),
      for_sale: group('looking-for-a-home', word(snap, 'for_sale_eyebrow'), word(snap, 'for_sale_heading'), word(snap, 'for_sale_lede'), g.for_sale),
      co_owned: coOwnedSection(snap, p, g.away),
    }),
  };
}

// Co-owned dogs living with a co-owner (docs/plans/done/co-owned-dogs.md): light cards in
// a slider, then the logos of the kennels they live with, each linked to its site.
function coOwnedSection(snap, p, away) {
  if (!away.length) return '';
  const seen = new Set();
  const kennels = away.map((d) => partnerOf(snap, d.lives_with_kennel_id)).filter((k) => k && !seen.has(k.id) && seen.add(k.id));
  const strip = kennels.length ? `<ul class="partners" aria-label="Our partner kennels">${kennels.map((k) => {
    const inner = `${partnerLogo(snap, k)}<span>${esc(k.name)}</span>`;
    return `<li>${k.url ? `<a href="${attr(k.url)}" rel="noopener">${inner}</a>` : inner}</li>`;
  }).join('')}</ul>` : '';
  return `<section class="section" id="co-owned"><div class="wrap">
      ${head(word(snap, 'co_owned_eyebrow'), p.co_owned_heading || word(snap, 'co_owned_heading'), p.co_owned_lede || word(snap, 'co_owned_lede'))}
      ${slider(away.map((d) => coCard(snap, d)), { cls: 'light' })}${strip}
    </div></section>`;
}

// A profile page's setting (content/blocks.js PROFILE_*): the owner's, or today's.
export const profileFor = (snap, kind) => cleanProfile(kind, snap.layout?.profiles?.[kind]);

// A dog's or a puppy's page: the breadcrumb, what sits under it, the photo with what
// sits beside it, then what sits under it, each part's items in the owner's order.
// Under the breadcrumb, every item after the first gets the space between them;
// under the photo, an item that doesn't bring its own (`spaced`) gets it.
export function profileBody(pr, pieces, { crumb, photo, spaced }) {
  const of = (part) => (pr.parts[part] ?? []).map((x) => [x, pieces[x] ?? '']).filter(([, h]) => h);
  const gap = (x, h) => (spaced.has(x) ? h : `<div class="mt-26">${h}</div>`);
  const above = of('above').map(([x, h], i) => (i ? gap(x, h) : h)).join('\n      ');
  return `<section class="section"><div class="wrap">
      ${crumb}
      ${above}
      <div class="dogpage${above ? ' mt-26' : ''}">${photo}<div class="info">
        ${of('side').map(([, h]) => h).join('\n        ')}
      </div></div>
      ${of('below').map(([x, h]) => gap(x, h)).join('\n      ')}
    </div></section>`;
}

export function dog(snap, ctx, slug) {
  const d = snap.dogs.find((x) => x.slug === slug);
  if (!d) return null;
  const pr = profileFor(snap, 'dog');
  const photo = img(snap, d.photo_id, { alt: d.call_name, cls: 'photo', lazy: false }) ?? '<div class="photo" aria-hidden="true"></div>';
  const fact = { sex: ['Sex', sexWord(d.sex)], color: ['Color', d.color], born: ['Born', fmtDate(d.date_of_birth)], weight: ['Weight', d.weight], registry: ['Registry', d.registry], titles: ['Titles', d.titles] };
  for (const k of Object.keys(fact)) fact[k] = fact[k][1] ? [fact[k][0], esc(fact[k][1])] : null;
  // Co-owned (docs/plans/done/co-owned-dogs.md): every named co-owner kennel, with its
  // logo and link; a dog living with one says which.
  const partners = d.co_owned ? coOwnedWith(snap, d) : [];
  if (partners.length) fact.co_owned = ['Co-owned with', partners.map((k) => `<span class="pk">${partnerLogo(snap, k)}${partnerLink(k)}</span>`).join(', ')];
  if (d.lives_away) {
    const k = partnerOf(snap, d.lives_with_kennel_id);
    fact.lives_with = ['Lives with', k ? `<span class="pk">${partnerLogo(snap, k)}${partnerLink(k)}</span>` : 'A partner kennel'];
  }
  // An outside dog (another kennel's): who owns it, linked to their website.
  // Its sire and dam: linked when on the site, else the name typed for them.
  for (const role of ['sire', 'dam']) {
    const p = d[`${role}_id`] && snap.dogs.find((x) => x.id === d[`${role}_id`]);
    const v = p ? `<a href="/dogs/${attr(p.slug)}">${esc(p.call_name)}</a>` : d[`${role}_name`] ? esc(d[`${role}_name`]) : null;
    if (v) fact[role] = [word(snap, `${role}_fact`), v];
  }
  if (d.outside && d.owner_name) fact.owner = [word(snap, 'outside_fact'), d.owner_url ? `<a href="${attr(d.owner_url)}" rel="noopener">${esc(d.owner_name)}</a>` : esc(d.owner_name)];
  const facts = pr.facts.map((k) => fact[k]).filter(Boolean);
  const tests = d.health.length ? `<span class="eyebrow">Health testing</span><ul class="tests">${d.health.map((h) => `<li><span>${esc(h.test)}</span><span>${h.verify_url ? `<a href="${attr(h.verify_url)}" rel="noopener">${esc(h.result)}</a>` : esc(h.result)}</span></li>`).join('')}</ul>` : '';
  const litters = snap.litters.filter((l) => l.dam_id === d.id || l.sire_id === d.id);
  // Offspring, grand offspring and on: light cards a generation at a time.
  const offspring = descendantsOf(snap, d).map((gen, i) => `<div class="mt-26">${head(word(snap, `offspring_${i + 1}`), null)}${slider(gen.map((x) => coCard(snap, x)), { cls: 'light' })}</div>`).join('');
  const sale = saleOf(snap, ctx, d);
  return {
    title: d.call_name, section: '/dogs', description: d.bio || `${d.call_name}, ${[snap.site.breed, d.role].filter(Boolean).join(' ')}`, image: d.photo_id,
    body: profileBody(pr, {
      faq: faqBlock(snap, 'dog'),
      role: `<span class="eyebrow">${esc([snap.site.breed, d.role].filter(Boolean).join(' · '))}</span>`,
      name: `<h1>${esc(d.call_name)}</h1>`,
      reg: d.registered_name ? `<p class="reg">${esc(d.registered_name)}</p>` : '',
      facts: `<dl class="kv">${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>`,
      bio: d.bio ? `<p class="bio">${esc(d.bio)}</p>` : '',
      sale: sale ? `<p class="status avail">${esc(word(snap, 'for_sale_status'))}${sale.price ? ` · ${esc(sale.price)}` : ''}</p><p><a class="btn solid" href="${attr(sale.ask)}">${esc(word(snap, 'ask_dog', { name: d.call_name }))}</a></p>` : '',
      tests,
      share: shareRow(),
      badges: badgeRow(snap, 'dog', { inWrap: true }),
      embeds: embedsBlock(snap, `dog:${d.id}`, { inWrap: true }),
      litters: litters.length ? `<div class="mt-26">${head('Litters', null)}<div class="litters">${litters.map((l) => litterCard(snap, l, ctx)).join('')}</div></div>` : '',
      offspring,
      albums: dogAlbums(snap, ctx, d),
    }, { crumb: `<p class="breadcrumb"><a href="/dogs">${esc(label(snap, 'dogs'))}</a></p>`, photo, spaced: new Set(['badges', 'embeds', 'litters', 'offspring', 'albums']) }),
  };
}

// ---------- Puppies ----------

export function litters(snap, ctx) {
  const p = snap.pages.litters;
  const older = new Set(olderPuppies(snap, ctx.today).map((o) => o.litter.id));
  const current = snap.litters.filter((l) => l.stage === 'current' && !depositsAhead(snap, l, ctx.today) && !older.has(l.id) && l.puppies.length);
  // Coming up: planned litters, and born ones whose deposits date is still ahead,
  // unless the page has Available soon: then those are there.
  const soonOn = soonSection(snap);
  const soon = soonOn ? snap.litters.filter((l) => depositsAhead(snap, l, ctx.today)) : [];
  const planned = snap.litters.filter((l) => l.stage === 'planned' || (!soonOn && depositsAhead(snap, l, ctx.today)));
  const sections = [];
    current.forEach((l, i) => {
    const lede = [pairNames(snap, l) && `${pairNames(snap, l)}.`, l.summary, l.ready_on && `Ready to go home ${fmtDate(l.ready_on)}.`, l.show_prices && l.price_note].filter(Boolean).join(' ');
    sections.push(`<section class="section${i ? '' : ' tight'}"${i ? '' : ' id="available"'}><div class="wrap">
      ${head(l.born_on ? `Born ${fmtDate(l.born_on)}` : word(snap, 'litter_current'), l.name, lede)}
      ${slider(sortPuppies(snap, l.puppies, l, ctx.today).map((pup) => puppyCard(snap, l, pup, ctx)), { cls: 'three', ctl: `<a class="more" href="/litters/${attr(l.slug)}">The ${esc(l.name.replace(/^the /i, ''))} page</a>` })}
    </div></section>`);
  });
  // Her badges after the puppies on offer, before older and upcoming ones (the
  // page's default order: content/blocks.js).
  const row = has(snap, 'litters', 'badges') ? badgeRow(snap, 'litters') : '';
  const olderList = olderPuppies(snap, ctx.today);
  let olderHtml = '';
  let upcomingHtml = '';
  const soonHtml = soon.length ? `<section class="section" id="soon"><div class="wrap">
      ${head(word(snap, 'soon_eyebrow'), word(snap, 'soon_heading'), word(snap, 'soon_lede'))}
      <div class="litters">${soon.map((l) => litterCard(snap, l, ctx, { label: false })).join('')}</div>
    </div></section>` : '';
  if (olderList.length && pageOn(snap, 'older', ctx) && has(snap, 'litters', 'older')) {
    olderHtml = (`<section class="section band" id="older"><div class="wrap">
      ${head(word(snap, 'older_eyebrow'), label(snap, 'older'), null)}
      <div class="grid${olderList.length === 1 ? ' narrow-grid' : ''}">${olderList.map(({ litter, puppy }) => puppyCard(snap, litter, puppy, ctx)).join('')}</div>
      <p class="center mt-20"><a class="more" href="/litters/older">All older puppies</a></p>
    </div></section>`);
  }
  if (planned.length && has(snap, 'litters', 'upcoming')) {
    upcomingHtml = (`<section class="section" id="upcoming"><div class="wrap">
      ${head(word(snap, 'upcoming_band_eyebrow'), word(snap, 'upcoming_band_heading'), word(snap, 'upcoming_band_lede'))}
      <div class="litters">${planned.map((l) => litterCard(snap, l, ctx)).join('')}</div>
    </div></section>`);
  }
  // With nothing else on the page, the litters' place says so.
  const empty = !sections.length && !row && !olderHtml && !soonHtml && !upcomingHtml;
  return {
    title: snap.pages.litters.heading || label(snap, 'litters'), section: '/litters', description: p.lede,
    body: assemble(snap, ctx, 'litters', {
      head: pagehead(p, PAGE_HEADS.litters),
      faq: faqSection(snap, 'litters'),
      current: empty ? `<section class="section tight"><div class="wrap notice"><p class="muted">${esc(word(snap, 'no_litters'))}</p></div></section>` : sections.join('\n'),
      badges: row,
      older: olderHtml,
      soon: soonHtml,
      upcoming: upcomingHtml,
    }),
  };
}

export function older(snap, ctx) {
  const p = snap.pages.older;
  const list = olderPuppies(snap, ctx.today);
  return {
    title: snap.pages.older.heading || label(snap, 'older'), section: '/litters', description: p.lede,
    body: assemble(snap, ctx, 'older', {
      head: pagehead(p, PAGE_HEADS.older),
      list: `<section class="section tight"><div class="wrap"><div class="grid${list.length === 1 ? ' narrow-grid' : ''}">${list.map(({ litter, puppy }) => puppyCard(snap, litter, puppy, ctx)).join('')}</div></div></section>`,
    }),
  };
}

export function litter(snap, ctx, slug) {
  const l = snap.litters.find((x) => x.slug === slug);
  if (!l) return null;
  const pr = profileFor(snap, 'litter');
  const on = (x) => pr.parts.head.includes(x);
  const pups = sortPuppies(snap, l.puppies, l, ctx.today);
  // The parents' names under the litter's own, unless they are its name.
  const pair = pairNames(snap, l);
  const lede = [pair !== l.name ? pair : null, l.summary].filter(Boolean).join('. ');
  const shown = [on('pair') && pair !== l.name ? pair : null, on('summary') ? l.summary : null].filter(Boolean).join('. ');
  const reg = fullRegLink(snap, l, null, ctx, 'btn line');
  const pieces = {
    faq: faqBlock(snap, 'litter'),
    parents: parentCards(snap, l),
    facts: litterFacts(snap, l, ctx),
    note: l.show_prices && l.price_note ? `<p class="small muted center mt-20">${esc(l.price_note)}</p>` : '',
    fullreg: reg ? `<div class="litters mt-20" id="full-registration"><div><p class="btn-row">${reg}</p>${fullRegSurchargeRow(snap, l, null, ctx) ? `<div class="mt-20">${fullRegSurchargeRow(snap, l, null, ctx)}</div>` : ''}</div></div>` : '',
    share: shareRow(true),
    pups: pups.length ? `<div class="mt-26 grid">${pups.map((pup) => puppyCard(snap, l, pup, ctx)).join('')}</div>` : '',
    badges: badgeRow(snap, 'litter', { inWrap: true }),
    embeds: embedsBlock(snap, `litter:${l.id}`, { inWrap: true }),
    albums: litterAlbums(snap, ctx, l),
  };
  // Under the heading, in the owner's order: an item that doesn't bring its own
  // space gets it, unless it comes first.
  const spaced = new Set(['note', 'fullreg', 'share', 'pups', 'badges', 'embeds', 'albums']);
  const body = pr.parts.body.map((x) => [x, pieces[x] ?? '']).filter(([, h]) => h)
    .map(([x, h], i) => (i && !spaced.has(x) ? `<div class="mt-26">${h}</div>` : h)).join('\n        ');
  return {
    title: l.name, section: '/litters', description: lede || l.name, image: pups.find((x) => x.photo_id)?.photo_id,
    body: `${pagehead({}, { eyebrow: l.stage === 'planned' ? (l.plan_label || word(snap, 'litter_planned')) : l.born_on ? `Born ${fmtDate(l.born_on)}` : 'Litter', heading: l.name, lede: shown })}
      <section class="section tight"><div class="wrap">
        <p class="breadcrumb center"><a href="/litters">${esc(label(snap, 'litters'))}</a></p>
        ${body}
      </div></section>`,
  };
}

// ---------- How it works ----------

export function howItWorks(snap, ctx) {
  const p = snap.pages.how_it_works;
  const pay = payShown(snap, ctx);
  const items = snap.steps.map((s, i) => `<article class="step"><span class="n">${i + 1}</span>${s.heading ? `<h3>${esc(s.heading)}</h3>` : ''}${s.body ? `<p>${esc(s.body)}</p>` : ''}${s.detail ? `<details class="x"><summary>${esc(word(snap, 'more_detail'))}</summary><div class="body">${paras(s.detail)}</div></details>` : ''}${s.pay_link && pay ? '<a class="more" href="/waitlist#how-to-pay">How to pay</a>' : ''}</article>`);
  return {
    title: snap.pages.how_it_works.heading || label(snap, 'how_it_works'), section: '/how-it-works', description: p.lede,
    body: assemble(snap, ctx, 'how_it_works', {
      head: pagehead(p, PAGE_HEADS.how_it_works),
      faq: faqSection(snap, 'how_it_works'),
      steps: ({ badges }) => `<section class="section tight" id="steps"><div class="wrap">${slider(items, { cls: 'three', ctl: `<span class="muted small">${esc(word(snap, 'swipe'))}</span>` })}${badges}</div></section>`,
      badges: badgeRow(snap, 'how_it_works'),
      badgesIn: badgeRow(snap, 'how_it_works', { inWrap: true }),
    }),
  };
}

export function extras(snap, ctx) {
  const p = snap.pages.extras;
  const prices = snap.site.show_other_prices;
  const ask = pageOn(snap, 'waitlist', ctx) ? '/waitlist' : '/contact';
  const pkgs = snap.extras.filter((x) => x.kind === 'homegoing').sort((a, b) => (a.weeks ?? 0) - (b.weeks ?? 0));
  const items = snap.extras.filter((x) => x.kind === 'item');
  const price = (x) => (prices && x.price_from != null ? `<div class="price">${esc(sitePrice(snap, x.price_from, x.price_to))}</div>` : `<div class="price">${esc(pricesOff(snap))}</div>`);
  const pkgHtml = pkgs.map((x) => `<article class="pkg${x.featured ? ' top' : ''}">
      ${x.weeks ? `<div class="weeks"><b>${x.weeks}</b><span>weeks${x.featured ? ` · ${esc(word(snap, 'most_complete'))}` : ''}</span></div>` : ''}<h3>${esc(x.name)}</h3>${price(x)}
      ${x.description ? `<p>${esc(x.description)}</p>` : ''}
      ${x.checklist.length ? `<details><summary>${esc(word(snap, 'whats_included'))}</summary>${x.lead_in ? `<p class="small muted lead">${esc(x.lead_in)}</p>` : ''}<ul class="checks">${x.checklist.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>${x.closing ? `<p class="small muted closing">${esc(x.closing)}</p>` : ''}</details>` : ''}
      <a class="more" href="${ask}">${esc(word(snap, 'ask_package'))}</a></article>`).join('');
  const itemHtml = items.map((x) => `<article class="pkg"><h3>${esc(x.name)}</h3>${x.grp ? `<span class="eyebrow">${esc(x.grp)}</span>` : ''}${price(x)}${x.description ? `<p>${esc(x.description)}</p>` : ''}<a class="more" href="${ask}">${esc(word(snap, 'ask_item'))}</a></article>`).join('');
  return {
    title: snap.pages.extras.heading || label(snap, 'extras'), section: '/extras', description: p.lede,
    body: assemble(snap, ctx, 'extras', {
      head: pagehead(p, PAGE_HEADS.extras),
      faq: faqSection(snap, 'extras'),
      list: ({ badges }) => `<section class="section tight"><div class="wrap">
        ${pkgHtml ? `<div class="pkgs">${pkgHtml}</div>${p.note && prices ? `<p class="small muted center mt-20">${esc(p.note)}</p>` : ''}` : ''}
        ${itemHtml ? `<div class="pkgs mt-26">${itemHtml}</div>` : ''}
        ${badges}
      </div></section>`,
      badges: badgeRow(snap, 'extras'),
      badgesIn: badgeRow(snap, 'extras', { inWrap: true }),
    }),
  };
}

// `more`: what follows her questions in the same block.
function expanderPage(snap, ctx, key, fallback, more = '') {
  const p = snap.pages[key];
  return {
    title: p.heading || label(snap, key), section: `/${key === 'waitlist_help' ? 'waitlist' : key}`, description: p.lede,
    body: assemble(snap, ctx, key, {
      head: pagehead(p, fallback),
      list: `<section class="section tight"><div class="wrap"><div class="acc">${expanders(snap.expanders[key] ?? [])}</div></div></section>${more}`,
    }),
  };
}
// Policies: hers, then (with a KennelOS waitlist linked) her KennelOS waitlist
// policies under their own heading, read from the feed so a change there shows here
// without a publish (KennelOS Waitlist Policies plan §4). They're edited in KennelOS.
export function policies(snap, ctx = {}) {
  const fallback = PAGE_HEADS.policies;
  const wl = ctx.feed?.feed?.kennel;
  if (!wl?.policies?.length) return expanderPage(snap, ctx, 'policies', fallback);
  const closed = closedDatesText(wl.closed_dates ?? []);
  const rows = wl.policies.map((x) => ({ heading: x.heading, body: x.body + (x.topic === 'days' && closed ? `\n\nUpcoming closed dates: ${closed}` : '') }));
  // A second page head, in the page's own look (eyebrow, heading, lede), as an h2.
  return expanderPage(snap, ctx, 'policies', fallback, `<section id="waitlist-policies"><div class="wrap pagehead"><span class="eyebrow">Our waitlist</span><h2 class="pagehead-h">Waitlist policies</h2>
    <p class="lede">How our waitlist runs. Families tick that they've read these when they apply.${wl.policies_updated ? ` Updated ${esc(fmtDate(wl.policies_updated))}.` : ''}</p></div>
    <section class="section tight"><div class="wrap"><div class="acc">${expanders(rows)}</div></div></section></section>`);
}

// Closed dates in words, runs of days together: "Dec 24–26, Jan 1".
function closedDatesText(dates) {
  const days = [...new Set(dates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d))))].sort();
  const label = (ymd) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });
  const next = (ymd) => new Date(Date.parse(`${ymd}T12:00:00Z`) + 86400000).toISOString().slice(0, 10);
  const runs = [];
  for (const d of days) {
    const last = runs.at(-1);
    if (last && next(last.to) === d) last.to = d; else runs.push({ from: d, to: d });
  }
  return runs.map((r) => (r.from === r.to ? label(r.from) : `${label(r.from)}–${r.from.slice(0, 7) === r.to.slice(0, 7) ? Number(r.to.slice(8)) : label(r.to)}`)).join(', ');
}
export const faq = (snap, ctx = {}) => expanderPage(snap, ctx, 'faq', PAGE_HEADS.faq);
// /family-login, only on a site with the family portal on and a KennelOS
// waitlist linked: the one Family login button asks which the family wants.
export function familyLogin(snap, ctx) {
  if (!ctx.portal || !snap.site.family_login) return null;
  const card = (button, text, href, external) => `<div class="pay-card"><p><a class="btn solid" href="${attr(href)}"${external ? ' rel="noopener noreferrer" target="_blank"' : ''}>${esc(button)}</a></p><p class="pay-when">${esc(text)}</p></div>`;
  return {
    title: 'Family login', section: null, noindex: true,
    body: `${pagehead(null, { heading: 'Family login' })}
      <section class="section tight"><div class="wrap"><div class="pay"><div class="pay-grid">
        ${card('Waitlist Status Page', 'For families waiting for their turn to bring home a Boston baby', snap.site.family_login, true)}
        ${card('A-K Puppy Families', 'For families with a current A-K Boston pup; a lifetime of support beyond the sale', '/family', false)}
      </div></div></div></section>`,
  };
}

export function waitlistHelp(snap, ctx) {
  const login = snap.site.family_login ? `<a class="btn solid" href="${attr(snap.site.family_login)}" rel="noopener noreferrer" target="_blank">Sign in to see your details</a> ` : '';
  return expanderPage(snap, ctx, 'waitlist_help', PAGE_HEADS.waitlist_help,
    `<p class="btn-row mt-26">${login}<a class="btn line" href="/waitlist">Back to the waitlist</a></p>`);
}

// ---------- Waitlist ----------
// The manual route (plan 3.8, decision 26): the breeder's application form, or
// their "closed" message. The list from KennelOS comes with its website feed.

// One question on the form. Name: q.<question id>, as siteforms.js reads it.
function question(snap, ctx, q) {
  const id = `a-${q.id.slice(0, 8)}`;
  const name = `q.${q.id}`;
  const typed = ctx.form?.page === 'waitlist' ? ctx.form.values?.[name] : undefined;
  const req = q.required ? ' required' : '';
  // "(optional)" only where it can be left empty: a choice or litter list that
  // starts on an answer ("Either", "Any litter") has nothing to leave out.
  const preset = q.type === 'choice' || q.type === 'litter';
  const label = `${esc(q.label)}${q.required || preset ? '' : ' (optional)'}${q.hint ? `<span class="q-hint">${esc(q.hint)}</span>` : ''}`;
  const select = (choices, fallback) => {
    const chosen = typed ?? (q.required ? '' : fallback);
    const blank = q.required ? '<option value="">Choose…</option>' : fallback === '' ? '<option value=""></option>' : '';
    return `<label for="${id}">${label}<select id="${id}" name="${attr(name)}"${req}>${blank}${choices.map((c) => `<option${c === chosen ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select></label>`;
  };
  switch (q.type) {
    case 'choice': return select(q.options ?? [], q.options?.[0] ?? '');
    case 'yes_no': return select(['Yes', 'No'], '');
    case 'litter': return select(litterChoices(snap), ANY_LITTER);
    case 'paragraph': return `<label for="${id}">${label}<textarea id="${id}" name="${attr(name)}" rows="4" maxlength="3000"${req}>${esc(typed ?? '')}</textarea></label>`;
    case 'phone': return `<label for="${id}">${label}<input id="${id}" type="tel" name="${attr(name)}" autocomplete="tel" maxlength="30" value="${attr(typed ?? '')}"${req}></label>`;
    case 'town': return `<label for="${id}">${label}<input id="${id}" name="${attr(name)}" autocomplete="address-level2" maxlength="80" value="${attr(typed ?? '')}"${req}></label>`;
    default: return `<label for="${id}">${label}<input id="${id}" name="${attr(name)}" maxlength="200" value="${attr(typed ?? '')}"${req}></label>`;
  }
}

// Short questions two to a row, as in the AK sample; paragraphs on their own.
function questionRows(snap, ctx, questions) {
  const out = [];
  let row = [];
  const flush = () => { if (row.length) out.push(row.length === 2 ? `<div class="row">${row.join('')}</div>` : row[0]); row = []; };
  for (const q of questions) {
    if (q.type === 'paragraph') { flush(); out.push(question(snap, ctx, q)); continue; }
    row.push(question(snap, ctx, q));
    if (row.length === 2) flush();
  }
  flush();
  return out.join('\n');
}

function applicationForm(snap, ctx) {
  const p = snap.pages.waitlist;
  const sent = ctx.form?.page === 'waitlist' && ctx.form.ok;
  const questions = snap.questions ?? [];
  const about = `<label for="a-about">${esc(ABOUT_LABEL)}<span class="q-hint">Who lives with you, other pets, your home, what you hope for in a puppy.</span><textarea id="a-about" name="message" rows="5" maxlength="3000" required>${v(ctx, 'message')}</textarea></label>`;
  return `<form class="apply-form" method="post" action="/waitlist#apply" id="apply">
    <div><span class="eyebrow">Puppy application</span><h2 class="mt-6">${esc(p.form_heading || 'Apply to join the waitlist')}</h2>${p.form_intro ? `<p class="muted small mt-6">${esc(p.form_intro)}</p>` : ''}</div>
    ${formResult(ctx, 'waitlist', (name) => `Thanks${name ? `, ${name.split(/\s+/)[0]}` : ''}. Your application is on its way to ${snap.site.kennel_name}, and they'll reply to the email address you gave.`)}
    ${sent ? '' : `<div class="row"><label for="a-name">Your name<input id="a-name" name="name" autocomplete="name" maxlength="80" required value="${v(ctx, 'name')}"></label><label for="a-email">Email<input id="a-email" type="email" name="email" autocomplete="email" maxlength="254" required value="${v(ctx, 'email')}"></label></div>
    ${questions.length ? questionRows(snap, ctx, questions) : about}
    <p class="muted small">If we add you to our waitlist, it shows your first name and last initial (like Megan R.) and what you're hoping for. Your email and phone never show.</p>
    <label class="consent" for="a-private"><input id="a-private" type="checkbox" name="private" value="1"${ctx.form?.page === 'waitlist' && ctx.form.values?.private ? ' checked' : ''}> Keep my name private: show it as its first letter and an asterisk for each letter after it, then my last initial (Andrea Kim shows as A***** K)</label>
    ${honeypot}${turnstileBox(ctx)}
    <div><button class="btn solid" type="submit">Send application</button></div>`}
  </form>`;
}

// ---------- the KennelOS list, drawn in the site's style (plan 3.8, decision 21) ----------
// The families on her list, in KennelOS's own words (its cloud/public/family/
// common.js is the model). Only the list: the site has its own puppy pages, so the
// feed's Available Puppies and Coming up aren't drawn here, and signing in to a
// status page isn't offered from the list.

const SEX_WORD = { any: 'Either', male: 'Male', female: 'Female' };
// A family's program, when the breeder shows them (the feed's row.program: { icon,
// about }): the icon left of the number; tapping it shows her description. The
// drawings are KennelOS's (its shared/assets/programIcons.js), copied as they are.
const PROGRAM_ICON_SVG = {
  star: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#d49b0b" d="M12 2.5l2.9 6.1 6.6.7-4.9 4.5 1.4 6.6L12 17l-5.9 3.4 1.4-6.6-4.9-4.5 6.6-.7z"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#2f9e5b"/><path d="M7 12.5l3.3 3.3L17 9" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  heart: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#d64545" d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.1 5.3 3 1.7-1.9 3.2-3 5.3-3 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z"/></svg>',
  ribbon: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M8.8 21.5L15.6 10.6C17.6 7.3 16 2.8 12 2.8S6.4 7.3 8.4 10.6L15.2 21.5" fill="none" stroke="#d9559a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  medal: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M7 2h4l2 6H9zM13 2h4l-2 6h-2z" fill="#3f6fb5"/><circle cx="12" cy="15.5" r="6" fill="#c9971c"/><path fill="#fff" d="M12 11.8l1.1 2.3 2.5.3-1.9 1.7.5 2.5-2.2-1.3-2.2 1.3.5-2.5-1.9-1.7 2.5-.3z"/></svg>',
  shield: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#4a6b8a" d="M12 2.5l8 3v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6z"/></svg>',
  paw: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><g fill="#8a5a3c"><ellipse cx="6.2" cy="10" rx="2.1" ry="2.6"/><ellipse cx="10" cy="5.8" rx="2.1" ry="2.7"/><ellipse cx="14" cy="5.8" rx="2.1" ry="2.7"/><ellipse cx="17.8" cy="10" rx="2.1" ry="2.6"/><path d="M12 11c3 0 5.6 3.4 5.6 6.1 0 2.1-1.6 3.1-3.3 2.6-.9-.3-1.5-.5-2.3-.5s-1.4.2-2.3.5c-1.7.5-3.3-.5-3.3-2.6C6.4 14.4 9 11 12 11z"/></g></svg>'
};
const listDate = (ymd) => (/^\d{4}-\d{2}-\d{2}$/.test(String(ymd ?? '')) ? fmtDate(ymd) : '');
// The list as the site draws it, from KennelOS's feed or the simple waitlist.
// rows: { position, name, deciding?, wants (html, escaped), added, program? }.
function familyList(snap, ctx, { name, updated, intro, rows, applyHere, powered }) {
  const added = (r) => (listDate(r.added) ? `<button type="button" class="added-tip" aria-label="Added ${attr(listDate(r.added))}" data-tip="Added ${attr(listDate(r.added))}">i</button>` : '');
  const icon = (r) => (PROGRAM_ICON_SVG[r.program?.icon] && typeof r.program?.about === 'string' && r.program.about.trim()
    ? `<button type="button" class="added-tip program-tip" aria-label="${attr(r.program.about.trim())}" data-tip="${attr(r.program.about.trim())}">${PROGRAM_ICON_SVG[r.program.icon]}</button>` : '');
  // Its own column, only when some family has an icon.
  const marks = rows.some((r) => icon(r));
  const body = rows.map((r) => `<tr data-wl-row data-pos="${attr(r.position)}" data-name="${attr(r.name ?? '')}"${r.deciding ? ' class="deciding"' : ''}>
      ${marks ? `<td class="mark">${icon(r)}</td>` : ''}<td class="num">#${esc(r.position)}</td><td>${r.deciding ? `<em>${esc(r.name)}</em>` : esc(r.name)}</td>
      <td>${r.wants}</td><td class="tip">${added(r)}</td></tr>`).join('');
  const gaps = rows.some((r, i) => r.position !== i + 1);
  const table = rows.length
    ? `<table class="list${marks ? ' marks' : ''}"><thead><tr>${marks ? '<th class="mark"><span class="sr-only">Program</span></th>' : ''}<th>#</th><th>Name</th><th>Wants</th><th class="tip"><span class="sr-only">Added</span></th></tr></thead><tbody>${body}</tbody></table>
      <p class="muted" data-wl-none hidden></p>
      ${gaps ? '<p class="small muted">Note: in special circumstances, some applicant names may not be displayed above. Their place is being held, but they are not currently eligible for available pups.</p>' : ''}`
    : '<p class="muted">No families to show right now.</p>';
  return `<div class="embed" id="the-list"><div class="embed-in">
    <header><h2>${esc(name)} Waitlist</h2>${updated ? `<p class="muted small">${esc(updated)}</p>` : ''}
      ${intro ? `<p class="intro">${esc(intro)}</p>` : ''}
      ${applyHere ? '<div><a class="btn solid" href="#apply">Apply to join the waitlist</a></div>' : ''}</header>
    ${rows.length ? '<div class="card searchbox" data-wl-search hidden><label for="wl-search" class="small muted">Find yourself on the list</label><input id="wl-search" type="search" placeholder="Search by name or number" autocomplete="off"></div>' : ''}
    <div class="card"><div class="tablewrap">${table}</div></div>
    <p class="small muted center">For questions or concerns, please contact ${esc(name)}.</p>
  </div>${powered ? `<div class="powered">${esc(powered)}</div>` : ''}</div>`;
}

function kennelosList(snap, ctx, { applyHere }) {
  const { feed, stale } = ctx.feed;
  const wants = (r) => [SEX_WORD[r.pref_sex] || 'Either', ...(Array.isArray(r.wants_more) ? r.wants_more : [])].map(esc).join(' · ');
  const rows = (Array.isArray(feed.rows) ? feed.rows : []).map((r) => ({
    position: r.position, name: r.name, deciding: r.deciding, added: r.added, program: r.program,
    wants: r.skipped ? `<em>${esc(listDate(r.skipped_until) ? `Skipped until ${listDate(r.skipped_until)}` : 'Skipped for now')}</em>` : wants(r),
  }));
  return familyList(snap, ctx, {
    name: feed.kennel?.name || snap.site.kennel_name, rows, applyHere, intro: feed.kennel?.intro,
    updated: listDate(feed.as_of) ? `Updated ${listDate(feed.as_of)}${stale ? ". Our records couldn't be reached just now, so this may be out of date." : ''}` : '',
    powered: 'Waitlist kept in KennelOS · positions update automatically',
  });
}

// The simple waitlist the breeder keeps in the manage app (no KennelOS).
function simpleList(snap, ctx, { applyHere }) {
  return familyList(snap, ctx, {
    name: snap.site.kennel_name, applyHere, intro: null, updated: '', powered: null,
    rows: ctx.waitlist.map((r) => ({ position: r.position, name: r.name, added: r.added, wants: esc(r.wants || '') })),
  });
}

// While KennelOS can't say (its feed is off, or it can't be reached): its own pages.
function kennelosLinks(snap, ctx) {
  const { origin, publicId } = ctx.feed;
  const id = encodeURIComponent(publicId);
  return `<div class="notice"><h2>Apply to join our waitlist</h2><p class="muted">Our waitlist and application form are on KennelOS, the app we keep our records in.</p>
    <p><a class="btn solid" href="${attr(`${origin}/apply/${id}`)}" rel="noopener" target="_blank">Apply to join the waitlist</a> <a class="btn line" href="${attr(`${origin}/list/${id}`)}" rel="noopener" target="_blank">See the waitlist</a></p></div>`;
}

export function waitlist(snap, ctx) {
  const p = snap.pages.waitlist;
  const help = pageOn(snap, 'waitlist_help', ctx) ? `<p class="center mt-20"><a class="more" href="/waitlist/help">${esc(label(snap, 'waitlist_help'))}</a></p>` : '';
  const f = ctx.feed;
  // Decision 26: KennelOS's form while it takes applications online; its pages
  // while its feed can't say; the site's own form otherwise.
  let main;
  if (p.closed) {
    main = `<div class="notice"><h2>Our waitlist is closed for now</h2><p class="muted">${esc(p.closed_message || "We aren't taking new applications at the moment. Please check back, or get in touch with any questions.")}</p><a class="btn line" href="/contact">Contact us</a></div>`;
  } else if (f?.feed?.form) {
    main = kennelosForm(snap, ctx);
  } else if (f && f.state !== 'ok') {
    main = kennelosLinks(snap, ctx);
  } else {
    main = applicationForm(snap, ctx);
  }
  // The KennelOS list, above the form, while the feed is shared; with no KennelOS,
  // the simple waitlist, while it has anyone on it.
  const list = f?.state === 'ok' ? kennelosList(snap, ctx, { applyHere: !p.closed })
    : !f && ctx.waitlist?.length ? simpleList(snap, ctx, { applyHere: !p.closed }) : '';
  const pay = paySection(snap);
  return {
    title: snap.pages.waitlist.heading || label(snap, 'waitlist'), section: '/waitlist', description: p.lede,
    body: assemble(snap, ctx, 'waitlist', {
      head: pagehead(p, PAGE_HEADS.waitlist),
      faq: faqSection(snap, 'waitlist'),
      main: ({ badges }) => `<section class="section tight"><div class="wrap">${list}${main}${help}${badges}</div>${pay ? `<div class="wrap">${pay}</div>` : ''}</section>`,
      badges: badgeRow(snap, 'waitlist'),
      badgesIn: badgeRow(snap, 'waitlist', { inWrap: true }),
    }),
  };
}

// ---------- the page for an address that isn't available ----------

export function unavailable(snap, ctx, { gone = false } = {}) {
  return {
    title: gone ? 'Gone' : 'Not found', section: null, noindex: true,
    body: `<section class="section"><div class="wrap notice"><h1>${gone ? 'This page is gone' : "This page isn't available"}</h1>
      <p class="muted">It may have moved, or it isn't on the site right now.</p><a class="btn line" href="/">Go to the home page</a></div></section>`,
  };
}

// The "ak" template's pages. Each takes the snapshot and the request context and
// returns { title, description, image, section, body } for layout(), or null for
// "no such page".
import {
  esc, attr, fmtDate, priceText, paras, img, pageOn, label, olderPuppies, sortPuppies, pairNames, parentName,
  litterCard, parentCards, litterFacts, dogCard, coCard, partnerOf, coOwnedWith, partnerLogo, partnerLink, puppyCard, slider, reviewCard, expanders, pagehead, head, ICONS, STATUS_TEXT,
  paySection, safeNotice, payShown, litterChoices, ANY_LITTER, ABOUT_LABEL,
  dogGroups, dogsFor, depositsAhead, puppyStatus, puppyPriceText, regText, statusRule, rulesOf, pricesOff, sitePrice, word, sexWord, fullRegLink, fullRegSurchargeRow, galleryHtml, viewerHtml, morePhotosHtml,
  faqBlock, familyLogin as familyLoginLink,
} from './parts.js';
import { embedView } from '../embeds.js';
import { homeBlocks, BREEDER_SWITCH } from '../content/blocks.js';
import { COLLAGE_LAYOUTS, collageLayout, HOME_BADGES_MAX, brandImageOk, badgeAddress } from '../content/model.js';

// A question from her FAQ, where she has placed it (plan 3.9): its own band under
// the page's heading, so it sits above what the page is about and takes the
// spacing every other section has. A record's own page (a dog, a litter, a puppy)
// puts the same block inside its first wrap instead, under the breadcrumb, which
// is why that one is `faqBlock` and this one wraps it in a section.
const faqSection = (snap, place) => {
  const html = faqBlock(snap, place);
  return html ? `<section class="section tight"><div class="wrap">${html}</div></section>` : '';
};

// A Share button (plan 5.4): the phone's own share sheet, or the link copied.
// Shown only with the template's script.
const shareRow = (center = false) => `<p class="share-row${center ? ' center' : ''}" data-share-row hidden><button type="button" class="btn line" data-share>Share</button><span class="small muted" role="status"></span></p>`;

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
const sprigs = '<svg class="sprig l" aria-hidden="true"><use href="#sprig"/></svg><svg class="sprig r" aria-hidden="true"><use href="#sprig"/></svg>';
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
    body: `${pagehead(p, { eyebrow: 'What we use', heading: 'Recommended products' })}
      <section class="section tight"><div class="wrap">
        <div class="pkgs prods">${list.map(card).join('')}</div>
        ${p.note ? `<p class="small muted center mt-20">${esc(p.note)}</p>` : ''}
      </div></section>`,
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
    body: `${pagehead(p, { eyebrow: 'Going home', heading: 'Getting your pup home' })}${faqSection(snap, 'pickup')}${sections.join('\n')}${badgeRow(snap, 'pickup')}`,
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
    if (b.type === 'faq') { parts.push(faqSection(snap, 'home')); continue; }
    if (b.type === 'embeds') { parts.push(embedsBlock(snap, 'home')); continue; }
    if (!on(b)) continue;
    let html = '';
    if (b.type === 'facts') {
      const row = factsRow();
      html = row ? `<section class="section tight"><div class="wrap">${row}</div></section>` : '';
    } else if (b.type === 'badges') html = homeBadges(snap);
    else if (b.type === 'text') html = storyBlock(snap, ctx);
    else if (b.type === 'band') {
      html = waitlistOn ? `<section class="cta"><div class="wrap"><div><h2>${esc(h.waitlist.heading || 'Hoping for a puppy of your own?')}</h2>${h.waitlist.line ? `<p>${esc(h.waitlist.line)}</p>` : ''}</div><a class="btn" href="/waitlist">${esc(h.waitlist.button_label || 'Join the waitlist')}</a></div></section>` : '';
    } else if (b.type === 'dogs') html = dogsBlock(snap, ctx, b);
    else if (b.type === 'litters') html = littersBlock(snap, ctx, b);
    else if (b.type === 'reviews') html = reviewsBlock(snap, ctx, b);
    if (html) parts.push(html);
  }

  return { title: null, section: '/', image: h.hero.photos?.[0] ?? h.hero.banner_photo_id, body: parts.join('\n') };
}

// A data block's words: hers (home_blocks) for the block she has a switch for,
// else the owner's starting wording (the breeder rewords added blocks later).
const blockWords = (snap, b) => (BREEDER_SWITCH.includes(b.id) ? snap.home[b.id] ?? {} : { ...b.w, link_label: null });
const limited = (rows, b) => (b.limit ? rows.slice(0, b.limit) : rows);

function heroBlock(snap, ctx, { facts, badges, waitlistOn }) {
  const h = snap.home;
  // With the top block off, the badges still lead the page.
  if (!h.hero.enabled) return badges ? homeBadges(snap) : '';
  // The collage: the breeder's layout, each box its own shape with her photo in it
  // and the part she chose to keep; never an empty box (collageLayout).
  const chosen = (h.hero.photos ?? []).map((id, i) => ({ id, focus: h.hero.focus?.[i] ?? 'middle' })).filter((x) => snap.photos[x.id]);
  const layout = collageLayout(h.hero.layout, chosen.length);
  const boxes = layout ? COLLAGE_LAYOUTS[layout].boxes : [];
  const frame = h.hero.frame ?? 'mat';
  const photos = chosen.map((x, i) => `<div class="box ${boxes[i]} f-${x.focus}">${img(snap, x.id, { lazy: i > 0 })}${frame === 'sprig' ? VINE : ''}</div>`);
  const banner = h.hero.banner_photo_id && snap.photos[h.hero.banner_photo_id]
    ? `<div class="banner f-${h.hero.banner_focus ?? 'middle'}">${img(snap, h.hero.banner_photo_id, { lazy: false })}</div>` : '';
  const buttons = [
    waitlistOn ? `<a class="btn solid" href="/waitlist">${esc(h.hero.primary_label || 'Join the waitlist')}</a>` : '',
    pageOn(snap, 'litters', ctx) ? `<a class="btn line" href="/litters">${esc(h.hero.secondary_label || 'See our puppies')}</a>` : '',
  ].join('');
  return `${banner}${badges ? homeBadges(snap) : ''}<section class="wrap hero${layout ? '' : ' no-photos'}"><div class="hero-copy">
      ${h.hero.eyebrow ? `<span class="eyebrow">${esc(h.hero.eyebrow)}</span>` : ''}
      <h1>${scriptLine(h.hero.headline || snap.site.kennel_name, h.hero.script)}</h1>
      ${h.hero.intro ? `<p>${esc(h.hero.intro)}</p>` : ''}
      ${buttons ? `<div class="hero-actions">${buttons}</div>` : ''}${facts}
    </div>${layout ? `<div class="hero-photos ${layout} frame-${frame}">${photos.join('')}</div>` : ''}</section>`;
}

function storyBlock(snap, ctx) {
  const s = snap.home.story;
  if (!(s.text || s.heading)) return '';
  // No photo (or "No photo" in the manage app): the words take the whole width.
  const photo = img(snap, s.photo_id) ?? '';
  const features = (s.features ?? []).map((f) => `<div class="feature"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">${ICONS[f.icon] ?? ICONS.heart}</svg><b>${esc(f.title)}</b><p>${esc(f.text)}</p></div>`).join('');
  return `<section class="section band"><div class="wrap story${photo ? '' : ' no-photo'}">${photo}<div class="story-copy">
      ${s.eyebrow ? `<span class="eyebrow">${esc(s.eyebrow)}</span>` : ''}
      <h2>${scriptLine(s.heading, s.script)}</h2>
      ${s.text ? `<p>${esc(s.text)}</p>` : ''}
      ${features ? `<div class="features">${features}</div>` : ''}
      ${pageOn(snap, 'about', ctx) ? `<div><a class="more" href="/about">${esc(s.link_label || 'Read our full story')}</a></div>` : ''}
    </div></div></section>`;
}

function dogsBlock(snap, ctx, b) {
  const list = limited(dogsFor(snap, b), b);
  if (!list.length) return '';
  const w = blockWords(snap, b);
  const ctl = pageOn(snap, 'dogs', ctx) ? `<a class="more" href="/dogs">${esc(w.link_label || 'See all our dogs')}</a>` : '';
  const card = (d) => dogCard(snap, d, { sale: saleOf(snap, ctx, d), show: b.show });
  const body = b.style === 'light' ? slider(list.map((d) => coCard(snap, d)), { cls: 'light', ctl })
    : b.style === 'flip' ? `<div class="grid${list.length === 1 ? ' narrow-grid' : ''}">${list.map(card).join('')}</div>${ctl ? `<p class="center mt-26">${ctl}</p>` : ''}`
      : slider(list.map(card), { ctl });
  return `<section class="section"><div class="wrap">
      ${head(w.eyebrow ?? 'Our dogs', w.heading || 'Meet our dogs', w.lede, { ornament: true })}
      ${body}
    </div></section>`;
}

function littersBlock(snap, ctx, b) {
  const list = limited(snap.litters.filter((l) => b.f.stage.includes(l.stage)), b);
  if (!list.length) return '';
  const w = blockWords(snap, b);
  return `<section class="section band"><div class="wrap">
      ${head(w.eyebrow ?? 'Litters', w.heading || 'Current and upcoming')}
      <div class="litters">${list.map((l) => litterCard(snap, l, ctx, { show: b.show })).join('')}</div>
      <p class="center mt-26"><a class="btn line" href="/litters">${esc(w.link_label || 'View all puppies')}</a></p>
    </div></section>`;
}

function reviewsBlock(snap, ctx, b) {
  const list = limited(snap.reviews, b);
  if (!list.length) return '';
  const w = blockWords(snap, b);
  const ctl = pageOn(snap, 'reviews', ctx) ? `<a class="more" href="/reviews">${esc(w.link_label || 'All reviews')}</a>` : '';
  const cards = list.map((r) => reviewCard(snap, r, { show: b.show }));
  return `<section class="section"><div class="wrap">
      ${head(w.eyebrow ?? 'Families', w.heading || 'What our families say')}
      ${b.style === 'grid' ? `<div class="grid">${cards.join('')}</div>${ctl ? `<p class="center mt-26">${ctl}</p>` : ''}` : slider(cards, { cls: 'three', ctl })}
    </div></section>`;
}

// ---------- About us ----------

export function about(snap, ctx) {
  const p = snap.pages.about;
  const photo = img(snap, p.photo_id) ?? '';
  const facts = p.facts?.length ? `<dl class="kv">${p.facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : '';
  const text = p.text ? `<div class="story-copy">${paras(p.text)}${facts}</div>` : facts;
  return {
    title: snap.pages.about.heading || label(snap, 'about'), section: '/about', description: p.lede, image: p.photo_id,
    body: `${pagehead(p, { eyebrow: 'About us', heading: 'Our story' })}
      <section class="section tight"><div class="wrap ${photo ? 'story' : 'prose'}">${photo}${text}</div></section>${badgeRow(snap, 'about')}${embedsBlock(snap, 'about', { band: true })}`,
  };
}

export function reviews(snap, ctx) {
  const p = snap.pages.reviews;
  const topics = [...new Set(snap.reviews.map((r) => r.topic).filter(Boolean))];
  const filter = topics.length > 1 ? `<div class="filter"><label for="review-topic">Show</label><select id="review-topic"><option value="all">All reviews</option>${topics.map((t) => `<option value="${attr(t)}">${esc(t[0].toUpperCase() + t.slice(1))}</option>`).join('')}</select></div>` : '';
  return {
    title: snap.pages.reviews.heading || label(snap, 'reviews'), section: '/reviews', description: p.lede,
    body: `${pagehead(p, { eyebrow: 'Reviews', heading: 'From our families' })}
      <section class="section tight"><div class="wrap">${filter}${snap.reviews.length ? `<div class="grid" id="all-reviews">${snap.reviews.map((r) => reviewCard(snap, r)).join('')}</div>` : ''}
      ${reviewForm(snap, ctx)}</div></section>`,
  };
}

// ---------- the forms visitors send (siteforms.js receives them) ----------

// What she typed, or (before any send) what a link filled in (ctx.prefill).
const v = (ctx, name) => attr(ctx.form?.values?.[name] ?? ctx.prefill?.[name] ?? '');
const honeypot = '<div class="hp" aria-hidden="true"><label>Leave this empty<input name="website" tabindex="-1" autocomplete="off"></label></div>';
const turnstileBox = (ctx) => (ctx.turnstileKey ? `<div class="cf-turnstile" data-sitekey="${attr(ctx.turnstileKey)}"></div><script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>` : '');
const formResult = (ctx, page, thanks) => {
  if (ctx.form?.page !== page) return '';
  if (ctx.form.ok) return `<p class="done" role="status">${esc(thanks(ctx.form.name))}</p>`;
  return `<p class="done bad" role="alert">${esc(ctx.form.error)}</p>`;
};

function reviewForm(snap, ctx) {
  const sent = ctx.form?.page === 'reviews' && ctx.form.ok;
  const stars = [5, 4, 3, 2, 1].map((n) => `<input type="radio" name="rating" id="r-s${n}" value="${n}"${String(ctx.form?.values?.rating ?? '5') === String(n) ? ' checked' : ''}><label for="r-s${n}" title="${n} star${n === 1 ? '' : 's'}">★</label>`).join('');
  return `<details class="review-share" id="share-review"${ctx.form?.page === 'reviews' ? ' open' : ''}>
    <summary class="btn line">Share your review</summary>
    <form class="apply-form review-form" method="post" action="/reviews#share-review" enctype="multipart/form-data" data-photo-form>
      <div><span class="eyebrow">${esc(snap.site.monogram || snap.site.kennel_name)} families</span><h2 class="mt-6">Share your review</h2><p class="muted small mt-6">Reviews appear on our site once we've read and approved them. We show your first name and town only.</p></div>
      ${formResult(ctx, 'reviews', (name) => `Thank you, ${name}! Your review goes to ${snap.site.kennel_name} to read, and it appears here once they approve it.`)}
      ${sent ? '' : `<div class="row"><label for="r-name">First name<input id="r-name" name="first_name" autocomplete="given-name" maxlength="60" required value="${v(ctx, 'first_name')}"></label><label for="r-town">Town<input id="r-town" name="town" maxlength="60" value="${v(ctx, 'town')}"></label></div>
      <div class="row"><label for="r-pup">Your puppy's name<input id="r-pup" name="puppy_name" maxlength="40" value="${v(ctx, 'puppy_name')}"></label><label for="r-home">Brought home<input id="r-home" type="month" name="home_month" value="${v(ctx, 'home_month')}"></label></div>
      <fieldset class="stars-in"><legend>Rating</legend><div class="star-row">${stars}</div></fieldset>
      <label for="r-text">Your review<textarea id="r-text" name="quote" rows="4" maxlength="1500" required>${v(ctx, 'quote')}</textarea></label>
      <label for="r-photo">A photo of your puppy (optional)<input id="r-photo" type="file" name="photo" accept="image/*"></label>
      <label class="consent" for="r-ok"><input id="r-ok" type="checkbox" name="consent" value="1" required> You may show this on your website with my first name and town.</label>
      ${honeypot}${turnstileBox(ctx)}
      <div><button class="btn solid" type="submit">Send review</button></div>`}
    </form></details>`;
}

function contactForm(snap, ctx) {
  const sent = ctx.form?.page === 'contact' && ctx.form.ok;
  return `<form class="apply-form" method="post" action="/contact#message" id="message">
    <div><span class="eyebrow">Message us</span><h2 class="mt-6">Send us a message</h2><p class="muted small mt-6">We'll reply to the email address you give.</p></div>
    ${formResult(ctx, 'contact', (name) => `Thanks${name ? `, ${name.split(/\s+/)[0]}` : ''}. Your message is on its way to ${snap.site.kennel_name}.`)}
    ${sent ? '' : `<div class="row"><label for="c-name">Your name<input id="c-name" name="name" autocomplete="name" maxlength="80" required value="${v(ctx, 'name')}"></label><label for="c-email">Email<input id="c-email" type="email" name="email" autocomplete="email" maxlength="254" required value="${v(ctx, 'email')}"></label></div>
    <div class="row"><label for="c-phone">Phone (optional)<input id="c-phone" type="tel" name="phone" autocomplete="tel" maxlength="30" value="${v(ctx, 'phone')}"></label><label for="c-topic">About (optional)<input id="c-topic" name="topic" maxlength="80" placeholder="A puppy, the waitlist, extras…" value="${v(ctx, 'topic')}"></label></div>
    <label for="c-msg">Message<textarea id="c-msg" name="message" rows="5" maxlength="3000" required>${v(ctx, 'message')}</textarea></label>
    ${honeypot}${turnstileBox(ctx)}
    <div><button class="btn solid" type="submit">Send message</button></div>`}
  </form>`;
}

export function contact(snap, ctx) {
  const p = snap.pages.contact;
  const s = snap.site;
  const cards = [];
  if (s.facebook_url || s.facebook_label) cards.push(['Message us', s.facebook_url ? `<a href="${attr(s.facebook_url)}" rel="noopener">${esc(s.facebook_label || 'Facebook')}</a>` : `Facebook: ${esc(s.facebook_label)}`]);
  if (s.instagram_url) cards.push(['Instagram', `<a href="${attr(s.instagram_url)}" rel="noopener">${esc(new URL(s.instagram_url).pathname.replace(/\//g, '') || 'Instagram')}</a>`]);
  if (s.contact_email) cards.push(['Email', `<a href="mailto:${attr(s.contact_email)}">${esc(s.contact_email)}</a>`]);
  if (s.contact_phone) cards.push(['Phone', `<a href="tel:${attr(s.contact_phone.replace(/[^\d+]/g, ''))}">${esc(s.contact_phone)}</a>`]);
  const place = [s.town, s.region].filter(Boolean).join(', ');
  if (place || p.location_note) cards.push(['Location', [place && esc(place), p.location_note && esc(p.location_note)].filter(Boolean).join('<br>')]);
  return {
    title: snap.pages.contact.heading || label(snap, 'contact'), section: '/contact', description: p.lede,
    body: `${pagehead(p, { eyebrow: 'Contact', heading: 'Say hello' })}${faqSection(snap, 'contact')}
      <section class="section tight"><div class="wrap"><div class="contact">${cards.map(([h, val]) => `<div><b>${esc(h)}</b><p class="muted small">${val}</p></div>`).join('')}</div>${badgeRow(snap, 'contact', { inWrap: true })}${contactForm(snap, ctx)}</div></section>`,
  };
}

// ---------- Kennel residents ----------

// An adult looking for a home (plan 3.7): its asking price with Show other prices
// on, and a way to ask.
const askHref = (snap, ctx) => (pageOn(snap, 'contact', ctx) ? '/contact' : '/');
// An adult for sale: its price by the site's rule (today the breeder's "Show prices
// of extras and adults"), and where to ask.
function saleOf(snap, ctx, d) {
  if (!d.for_sale) return null;
  const rule = rulesOf(snap).dogs?.sale_price ?? 'site';
  const show = rule === 'always' || (rule === 'site' && snap.site.show_other_prices);
  return { price: show ? (d.price != null ? sitePrice(snap, d.price, d.price) : '') : rule === 'never' ? '' : pricesOff(snap), ask: askHref(snap, ctx) };
}

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
    body: `${pagehead(p, { eyebrow: 'Kennel residents', heading: 'Our dogs' })}${faqSection(snap, 'dogs')}
      ${list.length ? `<section class="section tight"><div class="wrap"><span id="girls"></span><span id="boys"></span>
      ${both ? `<div class="filter"><label for="dog-filter">Show</label><select id="dog-filter"><option value="all">${esc(word(snap, 'dogs_all'))}</option><option value="female">${esc(word(snap, 'girls'))}</option><option value="male">${esc(word(snap, 'boys'))}</option></select></div>` : ''}
      <div class="grid" id="all-dogs">${list.map((d) => `<div data-sex="${d.sex}">${dogCard(snap, d)}</div>`).join('')}</div>
      <p class="flip-hint">${esc(word(snap, 'flip_hint'))}</p></div></section>` : ''}
      ${group('up-and-coming', word(snap, 'upcoming_eyebrow'), word(snap, 'upcoming_heading'), word(snap, 'upcoming_lede'), g.upcoming)}
      ${group('looking-for-a-home', word(snap, 'for_sale_eyebrow'), word(snap, 'for_sale_heading'), word(snap, 'for_sale_lede'), g.for_sale)}
      ${coOwnedSection(snap, p, g.away)}`,
  };
}

// Co-owned dogs living with a co-owner (docs/Co_Owned_Dogs_Plan.md): light cards in
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

export function dog(snap, ctx, slug) {
  const d = snap.dogs.find((x) => x.slug === slug);
  if (!d) return null;
  const photo = img(snap, d.photo_id, { alt: d.call_name, cls: 'photo', lazy: false }) ?? '<div class="photo" aria-hidden="true"></div>';
  const facts = [['Sex', sexWord(d.sex)], ['Color', d.color], ['Born', fmtDate(d.date_of_birth)], ['Weight', d.weight], ['Registry', d.registry], ['Titles', d.titles]].filter(([, v]) => v)
    .map(([k, v]) => [k, esc(v)]);
  // Co-owned (docs/Co_Owned_Dogs_Plan.md): every named co-owner kennel, with its
  // logo and link; a dog living with one says which.
  const partners = d.co_owned ? coOwnedWith(snap, d) : [];
  if (partners.length) facts.push(['Co-owned with', partners.map((k) => `<span class="pk">${partnerLogo(snap, k)}${partnerLink(k)}</span>`).join(', ')]);
  if (d.lives_away) {
    const k = partnerOf(snap, d.lives_with_kennel_id);
    facts.push(['Lives with', k ? `<span class="pk">${partnerLogo(snap, k)}${partnerLink(k)}</span>` : 'A partner kennel']);
  }
  const tests = d.health.length ? `<span class="eyebrow">Health testing</span><ul class="tests">${d.health.map((h) => `<li><span>${esc(h.test)}</span><span>${h.verify_url ? `<a href="${attr(h.verify_url)}" rel="noopener">${esc(h.result)}</a>` : esc(h.result)}</span></li>`).join('')}</ul>` : '';
  const litters = snap.litters.filter((l) => l.dam_id === d.id || l.sire_id === d.id);
  const sale = saleOf(snap, ctx, d);
  const faqs = faqBlock(snap, 'dog');
  return {
    title: d.call_name, section: '/dogs', description: d.bio || `${d.call_name}, ${[snap.site.breed, d.role].filter(Boolean).join(' ')}`, image: d.photo_id,
    body: `<section class="section"><div class="wrap">
      <p class="breadcrumb"><a href="/dogs">${esc(label(snap, 'dogs'))}</a></p>
      ${faqs}
      <div class="dogpage${faqs ? ' mt-26' : ''}">${photo}<div class="info">
        <span class="eyebrow">${esc([snap.site.breed, d.role].filter(Boolean).join(' · '))}</span><h1>${esc(d.call_name)}</h1>
        ${d.registered_name ? `<p class="reg">${esc(d.registered_name)}</p>` : ''}
        <dl class="kv">${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>
        ${d.bio ? `<p class="bio">${esc(d.bio)}</p>` : ''}${sale ? `<p class="status avail">${esc(word(snap, 'for_sale_status'))}${sale.price ? ` · ${esc(sale.price)}` : ''}</p><p><a class="btn solid" href="${attr(sale.ask)}">${esc(word(snap, 'ask_dog', { name: d.call_name }))}</a></p>` : ''}${tests}${shareRow()}
      </div></div>
      ${embedsBlock(snap, `dog:${d.id}`, { inWrap: true })}
      ${litters.length ? `<div class="mt-26">${head('Litters', null)}<div class="litters">${litters.map((l) => litterCard(snap, l, ctx)).join('')}</div></div>` : ''}
    </div></section>`,
  };
}

// ---------- Puppies ----------

export function litters(snap, ctx) {
  const p = snap.pages.litters;
  const older = new Set(olderPuppies(snap, ctx.today).map((o) => o.litter.id));
  const current = snap.litters.filter((l) => l.stage === 'current' && !depositsAhead(snap, l, ctx.today) && !older.has(l.id) && l.puppies.length);
  // Coming up: planned litters, and born ones whose deposits date is still ahead.
  const planned = snap.litters.filter((l) => l.stage === 'planned' || depositsAhead(snap, l, ctx.today));
  const sections = [];
  current.forEach((l, i) => {
    const lede = [pairNames(snap, l) && `${pairNames(snap, l)}.`, l.summary, l.ready_on && `Ready to go home ${fmtDate(l.ready_on)}.`, l.show_prices && l.price_note].filter(Boolean).join(' ');
    sections.push(`<section class="section${i ? '' : ' tight'}"${i ? '' : ' id="available"'}><div class="wrap">
      ${head(l.born_on ? `Born ${fmtDate(l.born_on)}` : word(snap, 'litter_current'), l.name, lede)}
      ${slider(sortPuppies(snap, l.puppies).map((pup) => puppyCard(snap, l, pup, ctx)), { cls: 'three', ctl: `<a class="more" href="/litters/${attr(l.slug)}">The ${esc(l.name.replace(/^the /i, ''))} page</a>` })}
    </div></section>`);
  });
  // Her badges after the puppies on offer, before older and upcoming ones.
  const row = badgeRow(snap, 'litters');
  if (row) sections.push(row);
  const olderList = olderPuppies(snap, ctx.today);
  if (olderList.length && pageOn(snap, 'older', ctx)) {
    sections.push(`<section class="section band" id="older"><div class="wrap">
      ${head(word(snap, 'older_eyebrow'), label(snap, 'older'), null)}
      <div class="grid${olderList.length === 1 ? ' narrow-grid' : ''}">${olderList.map(({ litter, puppy }) => puppyCard(snap, litter, puppy, ctx)).join('')}</div>
      <p class="center mt-20"><a class="more" href="/litters/older">All older puppies</a></p>
    </div></section>`);
  }
  if (planned.length) {
    sections.push(`<section class="section" id="upcoming"><div class="wrap">
      ${head(word(snap, 'upcoming_band_eyebrow'), word(snap, 'upcoming_band_heading'), word(snap, 'upcoming_band_lede'))}
      <div class="litters">${planned.map((l) => litterCard(snap, l, ctx)).join('')}</div>
    </div></section>`);
  }
  if (!sections.length) sections.push(`<section class="section tight"><div class="wrap notice"><p class="muted">${esc(word(snap, 'no_litters'))}</p></div></section>`);
  return {
    title: snap.pages.litters.heading || label(snap, 'litters'), section: '/litters', description: p.lede,
    body: `${pagehead(p, { eyebrow: 'Puppies', heading: 'Puppies' })}${faqSection(snap, 'litters')}${sections.join('\n')}`,
  };
}

export function older(snap, ctx) {
  const p = snap.pages.older;
  const list = olderPuppies(snap, ctx.today);
  return {
    title: snap.pages.older.heading || label(snap, 'older'), section: '/litters', description: p.lede,
    body: `${pagehead(p, { eyebrow: 'Puppies', heading: 'Older puppies', lede: 'Puppies still looking for a home after their going-home date.' })}
      <section class="section tight"><div class="wrap"><div class="grid${list.length === 1 ? ' narrow-grid' : ''}">${list.map(({ litter, puppy }) => puppyCard(snap, litter, puppy, ctx)).join('')}</div></div></section>`,
  };
}

export function litter(snap, ctx, slug) {
  const l = snap.litters.find((x) => x.slug === slug);
  if (!l) return null;
  const pups = sortPuppies(snap, l.puppies);
  // The parents' names under the litter's own, unless they are its name.
  const pair = pairNames(snap, l);
  const lede = [pair !== l.name ? pair : null, l.summary].filter(Boolean).join('. ');
  const note = l.show_prices && l.price_note ? `<p class="small muted center mt-20">${esc(l.price_note)}</p>` : '';
  const faqs = faqBlock(snap, 'litter');
  return {
    title: l.name, section: '/litters', description: lede || l.name, image: pups.find((x) => x.photo_id)?.photo_id,
    body: `${pagehead({}, { eyebrow: l.stage === 'planned' ? (l.plan_label || word(snap, 'litter_planned')) : l.born_on ? `Born ${fmtDate(l.born_on)}` : 'Litter', heading: l.name, lede })}
      <section class="section tight"><div class="wrap">
        <p class="breadcrumb center"><a href="/litters">${esc(label(snap, 'litters'))}</a></p>
        ${faqs}
        ${[parentCards(snap, l), litterFacts(snap, l, ctx)].filter(Boolean).map((x, i) => (i || faqs ? `<div class="mt-26">${x}</div>` : x)).join('\n        ')}${note}
        ${fullRegLink(snap, l, null, ctx, 'btn line') ? `<div class="litters mt-20" id="full-registration"><div><p class="btn-row">${fullRegLink(snap, l, null, ctx, 'btn line')}</p>${fullRegSurchargeRow(snap, l, null, ctx) ? `<div class="mt-20">${fullRegSurchargeRow(snap, l, null, ctx)}</div>` : ''}</div></div>` : ''}${shareRow(true)}
        ${pups.length ? `<div class="mt-26 grid">${pups.map((pup) => puppyCard(snap, l, pup, ctx)).join('')}</div>` : ''}
        ${badgeRow(snap, 'litter', { inWrap: true })}
        ${embedsBlock(snap, `litter:${l.id}`, { inWrap: true })}
        ${litterAlbums(snap, ctx, l)}
      </div></section>`,
  };
}

// ---------- Albums (phase 5) ----------
// Each photo is a link to its full size; the template's script turns the set into
// a viewer with previous and next (without it, the link opens the picture).

function albumCard(snap, a) {
  const cover = img(snap, a.cover_photo_id, { alt: '', thumb: true }) ?? '<div class="ph-photo" aria-hidden="true"></div>';
  return `<a class="album-card" href="/albums/${attr(a.slug)}">${cover}<span class="album-meta"><b>${esc(a.title)}</b><span class="small muted">${a.photos.length} photo${a.photos.length === 1 ? '' : 's'}</span></span></a>`;
}
// A litter's albums, under its card on the litter's page.
// Its albums, on the litter's page under "Photos". A puppy's page names the litter
// instead, so it doesn't read "Photos" twice above its own photos.
function litterAlbums(snap, ctx, l, { eyebrow = 'Photos', heading = null } = {}) {
  const list = pageOn(snap, 'albums', ctx) ? (snap.albums ?? []).filter((a) => a.litter_id === l.id) : [];
  return list.length ? `<div class="mt-26">${head(eyebrow, heading)}<div class="albums">${list.map((a) => albumCard(snap, a)).join('')}</div></div>` : '';
}

export function albums(snap, ctx) {
  const p = snap.pages.albums;
  return {
    title: p.heading || label(snap, 'albums'), section: '/litters', description: p.lede, image: snap.albums[0]?.cover_photo_id,
    body: `${pagehead(p, { eyebrow: 'Puppies', heading: 'Photo albums' })}
      <section class="section tight"><div class="wrap"><div class="albums">${snap.albums.map((a) => albumCard(snap, a)).join('')}</div></div></section>`,
  };
}

export function album(snap, ctx, slug) {
  const a = (snap.albums ?? []).find((x) => x.slug === slug);
  if (!a) return null;
  const l = a.litter_id && snap.litters.find((x) => x.id === a.litter_id);
  return {
    title: a.title, section: '/litters', description: a.description || `${a.photos.length} photos from ${snap.site.kennel_name}`, image: a.cover_photo_id,
    body: `${pagehead({}, { eyebrow: l ? l.name : 'Photo album', heading: a.title, lede: a.description })}
      <section class="section tight"><div class="wrap">
        <p class="breadcrumb center">${l && snap.pages.litters.enabled ? `<a href="/litters/${attr(l.slug)}">${esc(l.name)}</a> · ` : ''}<a href="/albums">${esc(label(snap, 'albums'))}</a></p>
        ${galleryHtml(snap, a.photos, a.title)}${morePhotosHtml(a)}${shareRow(true)}
        ${embedsBlock(snap, `album:${a.id}`, { inWrap: true })}
      </div></section>
      ${viewerHtml()}`,
  };
}

export function puppy(snap, ctx, litterSlug, slug) {
  const l = snap.litters.find((x) => x.slug === litterSlug);
  const p = l?.puppies.find((x) => x.slug === slug);
  if (!p) return null;
  const photo = img(snap, p.photo_id, { alt: p.name, cls: 'photo', lazy: false }) ?? '<div class="photo" aria-hidden="true"></div>';
  const rule = statusRule(snap, p);
  const status = puppyStatus(snap, l, p, ctx.today);
  const price = puppyPriceText(snap, l, p);
  const reg = regText(snap, p);
  const facts = [['Sex', sexWord(p.sex)], ['Color', p.color], ['Collar', p.collar], ['Status', status], [rulesOf(snap).price.price_label, price], ['Registration', reg], ['Registry', p.registry], ['Parents', pairNames(snap, l)], ['Born', fmtDate(l.born_on)]].filter(([, v]) => v);
  // Its own photos, where the litter publishes its puppies' tagged ones, and its own
  // "See more photos" link where she set one (its gallery elsewhere, never the
  // litter's). Either alone is enough for the block. Then the litter's albums: its
  // photos are usually in those too.
  const gallery = galleryHtml(snap, p.photos ?? [], p.name);
  const morePup = morePhotosHtml(p);
  const faqs = faqBlock(snap, 'puppy');
  const pupGallery = gallery || morePup
    ? `<div class="mt-26">${head('Photos', `${p.name}'s photos`)}${gallery}${morePup}</div>` : '';
  return {
    title: `${p.name}, ${l.name}`, section: '/litters', description: p.bio || `${p.name}: ${status}`, image: p.photo_id,
    body: `<section class="section"><div class="wrap">
      <p class="breadcrumb"><a href="/litters/${attr(l.slug)}">${esc(l.name)}</a></p>
      ${faqs}
      <div class="dogpage${faqs ? ' mt-26' : ''}">${photo}<div class="info">
        ${status ? `<span class="status ${attr(rule.pill)}">${esc(status)}</span>` : ''}<h1>${esc(p.name)}</h1>
        <dl class="kv">${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
        ${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ''}
        ${rule.ask || fullRegLink(snap, l, p, ctx, '') ? `<p>${rule.ask ? `<a class="btn solid" href="${pageOn(snap, 'waitlist', ctx) ? '/waitlist' : '/contact'}">${esc(word(snap, 'ask_pup', { name: p.name }))}</a> ` : ''}${fullRegLink(snap, l, p, ctx, 'btn line')}</p>` : ''}${fullRegSurchargeRow(snap, l, p, ctx, 'kv')}
        ${safeNotice(snap, ctx)}${shareRow()}
      </div></div>
      ${badgeRow(snap, 'puppy', { inWrap: true })}${pupGallery}${litterAlbums(snap, ctx, l, { eyebrow: 'Albums', heading: `From ${l.name}` })}
    </div></section>${pupGallery ? viewerHtml() : ''}`,
  };
}

// ---------- How it works ----------

export function howItWorks(snap, ctx) {
  const p = snap.pages.how_it_works;
  const pay = payShown(snap, ctx);
  const items = snap.steps.map((s, i) => `<article class="step"><span class="n">${i + 1}</span><h3>${esc(s.heading)}</h3>${s.body ? `<p>${esc(s.body)}</p>` : ''}${s.detail ? `<details class="x"><summary>${esc(word(snap, 'more_detail'))}</summary><div class="body">${paras(s.detail)}</div></details>` : ''}${s.pay_link && pay ? '<a class="more" href="/waitlist#how-to-pay">How to pay</a>' : ''}</article>`);
  return {
    title: snap.pages.how_it_works.heading || label(snap, 'how_it_works'), section: '/how-it-works', description: p.lede,
    body: `${pagehead(p, { eyebrow: 'How it works', heading: 'From application to home' })}${faqSection(snap, 'how_it_works')}
      <section class="section tight" id="steps"><div class="wrap">${slider(items, { cls: 'three', ctl: `<span class="muted small">${esc(word(snap, 'swipe'))}</span>` })}${badgeRow(snap, 'how_it_works', { inWrap: true })}</div></section>`,
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
    body: `${pagehead(p, { eyebrow: 'Extras', heading: 'Extras' })}${faqSection(snap, 'extras')}
      <section class="section tight"><div class="wrap">
        ${pkgHtml ? `<div class="pkgs">${pkgHtml}</div>${p.note && prices ? `<p class="small muted center mt-20">${esc(p.note)}</p>` : ''}` : ''}
        ${itemHtml ? `<div class="pkgs mt-26">${itemHtml}</div>` : ''}
        ${badgeRow(snap, 'extras', { inWrap: true })}
      </div></section>`,
  };
}

function expanderPage(snap, key, fallback) {
  const p = snap.pages[key];
  return {
    title: p.heading || label(snap, key), section: `/${key === 'waitlist_help' ? 'waitlist' : key}`, description: p.lede,
    body: `${pagehead(p, fallback)}<section class="section tight"><div class="wrap"><div class="acc">${expanders(snap.expanders[key] ?? [])}</div></div></section>`,
  };
}
// Policies: hers, then (with a KennelOS waitlist linked) her KennelOS waitlist
// policies under their own heading, read from the feed so a change there shows here
// without a publish (KennelOS Waitlist Policies plan §4). They're edited in KennelOS.
export function policies(snap, ctx = {}) {
  const page = expanderPage(snap, 'policies', { eyebrow: 'Our promises', heading: 'Policies' });
  const wl = ctx.feed?.feed?.kennel;
  if (!wl?.policies?.length) return page;
  const closed = closedDatesText(wl.closed_dates ?? []);
  const rows = wl.policies.map((x) => ({ heading: x.heading, body: x.body + (x.topic === 'days' && closed ? `\n\nUpcoming closed dates: ${closed}` : '') }));
  // A second page head, in the page's own look (eyebrow, heading, lede), as an h2.
  page.body += `<section id="waitlist-policies"><div class="wrap pagehead"><span class="eyebrow">Our waitlist</span><h2 class="pagehead-h">Waitlist policies</h2>
    <p class="lede">How our waitlist runs. Families tick that they've read these when they apply.${wl.policies_updated ? ` Updated ${esc(fmtDate(wl.policies_updated))}.` : ''}</p></div>
    <section class="section tight"><div class="wrap"><div class="acc">${expanders(rows)}</div></div></section></section>`;
  return page;
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
export const faq = (snap) => expanderPage(snap, 'faq', { eyebrow: 'Questions', heading: 'FAQ' });
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
  const page = expanderPage(snap, 'waitlist_help', { eyebrow: 'Waitlist', heading: 'Using your status page' });
  const login = snap.site.family_login ? `<a class="btn solid" href="${attr(snap.site.family_login)}" rel="noopener noreferrer" target="_blank">Sign in to see your details</a> ` : '';
  page.body += `<p class="btn-row mt-26">${login}<a class="btn line" href="/waitlist">Back to the waitlist</a></p>`;
  return page;
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

// ---------- KennelOS's application form, drawn in the site's style (plan 3.8) ----------
// The feed's `form` is what KennelOS's own /apply page draws; this draws the same
// questions here. site.js (the template's script) seals the answers to her form
// key in the visitor's browser and sends them straight to KennelOS, then takes
// the emailed code. Without scripts (or WebCrypto) the form stays hidden and the
// link to KennelOS's own page shows instead.

const kosReq = (q) => (q.required ? ' <span class="req" aria-label="required">*</span>' : '');
const kosHelp = (q) => (q.help && q.type !== 'notice' ? `<span class="q-hint">${esc(q.help)}</span>` : '');
const kosId = (q) => `k-${String(q.id).replace(/[^A-Za-z0-9_-]/g, '_')}`;
const radios = (name, options, required = false) => `<div class="choices">${options.map(([value, text]) => `<label class="choice"><input type="radio" name="${attr(name)}" value="${attr(value)}"${required ? ' required' : ''}> ${esc(text)}</label>`).join('')}</div>`;
const boxes = (options) => `<div class="choices">${options.map(([value, text]) => `<label class="choice"><input type="checkbox" value="${attr(value)}"> ${esc(text)}</label>`).join('')}</div>`;

function kosPreference(q, form) {
  const c = form.choices ?? {};
  const legend = (required) => `<legend><span>${esc(q.label)}${required ? kosReq({ required: true }) : ''}</span>${kosHelp(q)}</legend>`;
  switch (q.key) {
    case 'pref_sex': return `<fieldset class="kq" data-pref="pref_sex">${legend(false)}${radios('pref_sex', c.pref_sex ?? [])}</fieldset>`;
    case 'pref_breed':
      if (!form.breeds?.length) return '';
      return `<label class="kq" for="k-pref_breed"><span>${esc(q.label)}</span>${kosHelp(q)}<select id="k-pref_breed" data-pref="pref_breed"><option value="">Any breed</option>${form.breeds.map((b) => `<option>${esc(b)}</option>`).join('')}</select></label>`;
    case 'pref_purposes': return `<fieldset class="kq" data-pref="pref_purposes"><legend><span>${esc(q.label)}</span><span class="q-hint">Leave all unticked if any is fine.</span>${kosHelp(q)}</legend>${boxes(c.pref_purposes ?? [])}</fieldset>`;
    case 'pref_colors': return `<label class="kq" for="k-pref_colors"><span>${esc(q.label)}</span><span class="q-hint">Separate colors with commas.${form.color_matching ? ' Only pups in a color you list will be offered.' : ''}</span>${kosHelp(q)}<input id="k-pref_colors" data-pref="pref_colors" maxlength="300" placeholder="Leave blank for any"></label>`;
    case 'ready_timing': return `<fieldset class="kq" data-pref="ready_timing" data-required>${legend(true)}${radios('ready_timing', c.ready_timing ?? [], true)}</fieldset>`;
    default: return '';
  }
}

function kosQuestion(q, form, policiesHref = null) {
  const id = kosId(q);
  const data = `data-q="${attr(q.id)}" data-type="${attr(q.type)}"${q.key ? ` data-key="${attr(q.key)}"` : ''}${q.required ? ' data-required' : ''} data-label="${attr(q.label)}"`;
  // "I've read the policies" (KennelOS): the word "policies" links to them.
  let text = esc(q.label);
  if (q.link === 'policies' && policiesHref) {
    const a = (w) => `<a href="${attr(policiesHref)}"${/^https?:/.test(policiesHref) ? ' rel="noopener" target="_blank"' : ''}>${w}</a>`;
    text = /\bpolicies\b/i.test(text) ? text.replace(/\bpolicies\b/i, (w) => a(w)) : `${text} ${a('Read our policies')}`;
  }
  const label = `<span>${text}${kosReq(q)}</span>${kosHelp(q)}`;
  switch (q.type) {
    case 'notice':
      return `<div class="kq notice-q" ${data}><b>${esc(q.label)}</b><div class="small">${paras(q.help)}</div>
        <label class="choice"><input type="checkbox" data-notice required> I understand</label>
        <label class="choice"><input type="checkbox" data-private> Please show my name privately on the public list</label>
        <span class="q-hint">Your first name shows as its first letter and an asterisk for each letter after it, then your last initial (Andrea Kim shows as A***** K). The breeder decides whether to allow it; your place in line is the same either way.</span></div>`;
    case 'preference': return kosPreference(q, form);
    case 'long_text': return `<label class="kq" for="${id}" ${data}>${label}<textarea id="${id}" rows="4" maxlength="10000"></textarea></label>`;
    case 'email': return `<label class="kq" for="${id}" ${data}>${label}<input id="${id}" type="email" autocomplete="email" maxlength="254"></label>`;
    case 'number': return `<label class="kq" for="${id}" ${data}>${label}<input id="${id}" inputmode="decimal" maxlength="30"></label>`;
    case 'date': return `<label class="kq" for="${id}" ${data}>${label}<input id="${id}" type="date"></label>`;
    case 'yes_no': return `<fieldset class="kq" ${data}><legend>${label}</legend>${radios(id, [['yes', 'Yes'], ['no', 'No']])}</fieldset>`;
    case 'single_choice': return `<fieldset class="kq" ${data}><legend>${label}</legend>${radios(id, (q.options ?? []).map((o) => [o, o]))}</fieldset>`;
    case 'checkboxes': return `<fieldset class="kq" ${data}><legend>${label}</legend>${boxes((q.options ?? []).map((o) => [o, o]))}</fieldset>`;
    default: return `<label class="kq" for="${id}" ${data}>${label}<input id="${id}" maxlength="500"${q.key === 'name' ? ' autocomplete="name"' : ''}></label>`;
  }
}

function kennelosForm(snap, ctx) {
  const p = snap.pages.waitlist;
  const { feed, origin, publicId } = ctx.feed;
  const form = feed.form;
  const applyUrl = `${origin}${feed.links?.apply ?? `/apply/${encodeURIComponent(publicId)}`}`;
  const firstMatch = (form.questions ?? []).find((q) => (form.matching_keys ?? []).includes(q.key));
  // Where "policies" in the application goes: her Policies page's waitlist part, or
  // KennelOS's list page when her Policies page is off.
  const policiesHref = !feed.kennel?.policies?.length ? null
    : pageOn(snap, 'policies', ctx) ? '/policies#waitlist-policies' : `${origin}${feed.links?.list ?? `/list/${encodeURIComponent(publicId)}`}#policies`;
  const questions = (form.questions ?? []).map((q) => {
    const notice = q === firstMatch && form.matching_notice ? `<div class="kq notice-q"><b>Matching you with a pup</b><p class="small">${esc(form.matching_notice)}</p></div>` : '';
    return notice + kosQuestion(q, form, policiesHref);
  }).join('\n');
  const faq = form.faq?.length ? `<div class="kos-faq"><b>Before you apply</b><div class="acc">${form.faq.map((x) => `<details class="x"><summary>${esc(x.question || 'Question')}</summary><div class="body">${paras(x.answer)}</div></details>`).join('')}</div></div>` : '';
  const turnstile = form.turnstile_site_key ? `<div class="cf-turnstile" data-sitekey="${attr(form.turnstile_site_key)}"></div><script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>` : '';
  const fallback = `Apply on our <a href="${attr(applyUrl)}" rel="noopener" target="_blank">KennelOS application page</a> instead.`;
  return `<div class="apply-form kos" id="apply" data-kos-form data-origin="${attr(origin)}" data-public-id="${attr(publicId)}" data-key-id="${attr(form.key_id)}" data-public-key="${attr(form.public_key)}" data-apply-url="${attr(applyUrl)}" data-kennel="${attr(snap.site.kennel_name)}">
    <div><span class="eyebrow">Puppy application</span><h2 class="mt-6">${esc(p.form_heading || 'Apply to join the waitlist')}</h2>${p.form_intro ? `<p class="muted small mt-6">${esc(p.form_intro)}</p>` : ''}<p class="muted small mt-6">Fields marked * are required.</p></div>
    <p class="done" data-kos-fallback>This form needs a browser with JavaScript on. ${fallback}</p>
    ${faq}
    <form data-kos-step="form" novalidate hidden>
      ${questions}
      ${turnstile}
      <p class="done bad" data-kos-problems role="alert" hidden></p>
      <div><button class="btn solid" type="submit">Send application</button></div>
      <p class="muted small">Your answers are locked in this browser before they're sent, so only ${esc(snap.site.kennel_name)} can read them. They go to our waitlist in KennelOS, not to this website. You'll get an email with a code to confirm it's you.</p>
    </form>
    <form data-kos-step="confirm" hidden>
      <div><h3>Check your email</h3><p class="small">We sent a 6-digit code to <b data-kos-email></b>. Enter it here to send your application. It works for 15 minutes.</p></div>
      <div class="row"><label for="k-code">Code<input id="k-code" inputmode="numeric" autocomplete="one-time-code" maxlength="7" required></label><div class="kos-confirm"><button class="btn solid" type="submit">Confirm</button></div></div>
      <p class="small" data-kos-result role="status"></p>
      <p class="muted small">No email after a few minutes? Check your spam folder, or <button type="button" class="linkish" data-kos-resend>send a new code</button>.</p>
    </form>
    <div data-kos-step="done" hidden><h3>Your application is in</h3><p class="small">${esc(snap.site.kennel_name)} will review it. To see your place in line and anything waiting for you, sign in on our KennelOS waitlist page with the email you applied with.</p>
      <p><a class="btn solid" href="${attr(`${origin}${feed.links?.signin ?? `/list/${encodeURIComponent(publicId)}#signin`}`)}" rel="noopener noreferrer" target="_blank">See my details</a></p></div>
  </div>`;
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
    body: `${pagehead(p, { eyebrow: 'Waitlist', heading: 'Our waitlist' })}${faqSection(snap, 'waitlist')}
      <section class="section tight"><div class="wrap">${list}${main}${help}${badgeRow(snap, 'waitlist', { inWrap: true })}</div>${pay ? `<div class="wrap">${pay}</div>` : ''}</section>`,
  };
}

// ---------- Privacy (generated, plan 3.9) ----------

export function privacy(snap, ctx) {
  const s = snap.site;
  const contactLine = [s.contact_email && `email <a href="mailto:${attr(s.contact_email)}">${esc(s.contact_email)}</a>`, s.contact_phone && `call ${esc(s.contact_phone)}`].filter(Boolean).join(' or ');
  return {
    title: 'Privacy', section: '/privacy', description: `How ${s.kennel_name}'s website handles your information.`,
    body: `${pagehead({}, { eyebrow: 'Privacy', heading: 'Your privacy', lede: null })}
      <section class="section tight"><div class="wrap prose">
        <p>This website belongs to ${esc(s.kennel_name)} and is hosted by KennelPort. This page says what it collects and why.</p>
        <h2>What this site collects</h2>
        <p>Reading this site collects nothing about you: there are no accounts, no advertising, and no tracking cookies. Like every website, the servers that deliver it see your device's internet address for each page it loads; that is used only to deliver the page and keep the site safe, never to track you.</p>
        <h2>Outside services</h2>
        <p>Fonts and pictures are served by this site itself, not by outside companies. This site runs on Cloudflare's network, which delivers each page to you.</p>
        <h2>Questions</h2>
        <p>${contactLine ? `To ask about your information, ${contactLine}.` : `To ask about your information, use the contact details on the <a href="/contact">contact page</a>.`}</p>
      </div></section>`,
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

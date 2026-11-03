// The "ak" template's pages. Each takes the snapshot and the request context and
// returns { title, description, image, section, body } for layout(), or null for
// "no such page".
import {
  esc, attr, fmtDate, priceText, paras, img, pageOn, label, olderPuppies, sortPuppies, pairNames, parentName,
  litterCard, dogCard, puppyCard, slider, reviewCard, expanders, pagehead, head, ICONS, STATUS_TEXT,
  paySection, safeNotice, payShown, litterChoices, ANY_LITTER, ABOUT_LABEL,
  dogGroups, depositsAhead, puppyStatus, puppyPriceText, REG_WORDS, fullRegLink, fullRegSurchargeRow,
} from './parts.js';
import { embedView } from '../embeds.js';
import { COLLAGE_LAYOUTS, collageLayout, HOME_BADGES_MAX, brandImageOk } from '../content/model.js';

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

// Up to two logos right under the banner, side by side even on a phone, each
// linked to its product's link when it has one.
export function homeBadges(snap) {
  const list = (snap.products ?? []).filter((x) => x.home_badge && productPic(snap, x)).slice(0, HOME_BADGES_MAX);
  if (!list.length) return '';
  const one = (x) => {
    const pic = productPic(snap, x, { lazy: false });
    return `<li>${x.link_url ? outLink(x.link_url, pic) : pic}</li>`;
  };
  return `<section class="wrap badges" aria-label="Recommended"><ul class="badges-${list.length}">${list.map(one).join('')}</ul></section>`;
}

export function products(snap, ctx) {
  const p = snap.pages.products;
  const list = snap.products ?? [];
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

// ---------- Home ----------

export function home(snap, ctx) {
  const h = snap.home;
  const parts = [];
  const waitlistOn = pageOn(snap, 'waitlist', ctx);

  if (h.hero.enabled) {
    // The collage: the breeder's layout, each box its own shape with her photo in it
    // and the part she chose to keep; never an empty box (collageLayout).
    const chosen = (h.hero.photos ?? []).map((id, i) => ({ id, focus: h.hero.focus?.[i] ?? 'middle' })).filter((x) => snap.photos[x.id]);
    const layout = collageLayout(h.hero.layout, chosen.length);
    const boxes = layout ? COLLAGE_LAYOUTS[layout].boxes : [];
    const frame = h.hero.frame ?? 'mat';
    const photos = chosen.map((x, i) => `<div class="box ${boxes[i]} f-${x.focus}">${img(snap, x.id, { lazy: i > 0 })}${frame === 'sprig' ? VINE : ''}</div>`);
    const banner = h.hero.banner_photo_id && snap.photos[h.hero.banner_photo_id]
      ? `<div class="banner f-${h.hero.banner_focus ?? 'middle'}">${img(snap, h.hero.banner_photo_id, { lazy: false })}</div>` : '';
    const facts = h.facts.enabled && h.facts.items?.length
      ? `<div class="facts">${h.facts.items.map(([v, l]) => `<div><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>` : '';
    const buttons = [
      waitlistOn ? `<a class="btn solid" href="/waitlist">${esc(h.hero.primary_label || 'Join the waitlist')}</a>` : '',
      pageOn(snap, 'litters', ctx) ? `<a class="btn line" href="/litters">${esc(h.hero.secondary_label || 'See our puppies')}</a>` : '',
    ].join('');
    parts.push(`${banner}${homeBadges(snap)}<section class="wrap hero${layout ? '' : ' no-photos'}"><div class="hero-copy">
      ${h.hero.eyebrow ? `<span class="eyebrow">${esc(h.hero.eyebrow)}</span>` : ''}
      <h1>${scriptLine(h.hero.headline || snap.site.kennel_name, h.hero.script)}</h1>
      ${h.hero.intro ? `<p>${esc(h.hero.intro)}</p>` : ''}
      ${buttons ? `<div class="hero-actions">${buttons}</div>` : ''}${facts}
    </div>${layout ? `<div class="hero-photos ${layout} frame-${frame}">${photos.join('')}</div>` : ''}</section>`);
  }

  // With the top block off, the badges still lead the page.
  if (!h.hero.enabled) parts.push(homeBadges(snap));

  if (h.story.enabled && (h.story.text || h.story.heading)) {
    // No photo (or "No photo" in the manage app): the words take the whole width.
    // An empty box was drawn here before, in flat grey.
    const photo = img(snap, h.story.photo_id) ?? '';
    const features = (h.story.features ?? []).map((f) => `<div class="feature"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">${ICONS[f.icon] ?? ICONS.heart}</svg><b>${esc(f.title)}</b><p>${esc(f.text)}</p></div>`).join('');
    parts.push(`<section class="section band"><div class="wrap story${photo ? '' : ' no-photo'}">${photo}<div class="story-copy">
      ${h.story.eyebrow ? `<span class="eyebrow">${esc(h.story.eyebrow)}</span>` : ''}
      <h2>${scriptLine(h.story.heading, h.story.script)}</h2>
      ${h.story.text ? `<p>${esc(h.story.text)}</p>` : ''}
      ${features ? `<div class="features">${features}</div>` : ''}
      ${pageOn(snap, 'about', ctx) ? `<div><a class="more" href="/about">${esc(h.story.link_label || 'Read our full story')}</a></div>` : ''}
    </div></div></section>`);
  }

  const dogs = dogGroups(snap).breeding;
  if (h.dogs.enabled && dogs.length) {
    parts.push(`<section class="section"><div class="wrap">
      ${head(h.dogs.eyebrow ?? 'Our dogs', h.dogs.heading || 'Meet our dogs', h.dogs.lede, { ornament: true })}
      ${slider(dogs.map((d) => dogCard(snap, d)), { ctl: pageOn(snap, 'dogs', ctx) ? `<a class="more" href="/dogs">${esc(h.dogs.link_label || 'See all our dogs')}</a>` : '' })}
    </div></section>`);
  }

  const litters = snap.litters.filter((l) => l.stage !== 'past').slice(0, 2);
  if (h.litters.enabled && litters.length) {
    parts.push(`<section class="section band"><div class="wrap">
      ${head(h.litters.eyebrow ?? 'Litters', h.litters.heading || 'Current and upcoming')}
      <div class="litters">${litters.map((l) => litterCard(snap, l, ctx)).join('')}</div>
      <p class="center mt-26"><a class="btn line" href="/litters">${esc(h.litters.link_label || 'View all puppies')}</a></p>
    </div></section>`);
  }

  if (h.reviews.enabled && snap.reviews.length) {
    parts.push(`<section class="section"><div class="wrap">
      ${head(h.reviews.eyebrow ?? 'Families', h.reviews.heading || 'What our families say')}
      ${slider(snap.reviews.map((r) => reviewCard(snap, r)), { cls: 'three', ctl: pageOn(snap, 'reviews', ctx) ? `<a class="more" href="/reviews">${esc(h.reviews.link_label || 'All reviews')}</a>` : '' })}
    </div></section>`);
  }

  parts.push(embedsBlock(snap, 'home'));

  if (h.waitlist.enabled && waitlistOn) {
    parts.push(`<section class="cta"><div class="wrap"><div><h2>${esc(h.waitlist.heading || 'Hoping for a puppy of your own?')}</h2>${h.waitlist.line ? `<p>${esc(h.waitlist.line)}</p>` : ''}</div><a class="btn" href="/waitlist">${esc(h.waitlist.button_label || 'Join the waitlist')}</a></div></section>`);
  }

  return { title: null, section: '/', image: h.hero.photos?.[0] ?? h.hero.banner_photo_id, body: parts.join('\n') };
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
      <section class="section tight"><div class="wrap ${photo ? 'story' : 'prose'}">${photo}${text}</div></section>${embedsBlock(snap, 'about', { band: true })}`,
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
    body: `${pagehead(p, { eyebrow: 'Contact', heading: 'Say hello' })}
      <section class="section tight"><div class="wrap"><div class="contact">${cards.map(([h, val]) => `<div><b>${esc(h)}</b><p class="muted small">${val}</p></div>`).join('')}</div>${contactForm(snap, ctx)}</div></section>`,
  };
}

// ---------- Kennel residents ----------

// An adult looking for a home (plan 3.7): its asking price with Show other prices
// on, and a way to ask.
const askHref = (snap, ctx) => (pageOn(snap, 'contact', ctx) ? '/contact' : '/');
function saleOf(snap, ctx, d) {
  if (!d.for_sale) return null;
  return { price: snap.site.show_other_prices ? (d.price != null ? priceText(d.price) : '') : 'Contact us for pricing', ask: askHref(snap, ctx) };
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
    body: `${pagehead(p, { eyebrow: 'Kennel residents', heading: 'Our dogs' })}
      ${list.length ? `<section class="section tight"><div class="wrap"><span id="girls"></span><span id="boys"></span>
      ${both ? '<div class="filter"><label for="dog-filter">Show</label><select id="dog-filter"><option value="all">All dogs</option><option value="female">Girls</option><option value="male">Boys</option></select></div>' : ''}
      <div class="grid" id="all-dogs">${list.map((d) => `<div data-sex="${d.sex}">${dogCard(snap, d)}</div>`).join('')}</div>
      <p class="flip-hint">Tap a card to turn it over; tap again to turn it back.</p></div></section>` : ''}
      ${group('up-and-coming', 'Our next generation', 'Up and coming', 'Young dogs we have kept, growing up with us.', g.upcoming)}
      ${group('looking-for-a-home', 'Ready for a family', 'Looking for a home', 'Grown dogs we are placing in a loving pet home.', g.for_sale)}`,
  };
}

export function dog(snap, ctx, slug) {
  const d = snap.dogs.find((x) => x.slug === slug);
  if (!d) return null;
  const photo = img(snap, d.photo_id, { alt: d.call_name, cls: 'photo', lazy: false }) ?? '<div class="photo" aria-hidden="true"></div>';
  const facts = [['Sex', d.sex === 'female' ? 'Female' : 'Male'], ['Color', d.color], ['Born', fmtDate(d.date_of_birth)], ['Registry', d.registry], ['Titles', d.titles]].filter(([, v]) => v);
  const tests = d.health.length ? `<span class="eyebrow">Health testing</span><ul class="tests">${d.health.map((h) => `<li><span>${esc(h.test)}</span><span>${h.verify_url ? `<a href="${attr(h.verify_url)}" rel="noopener">${esc(h.result)}</a>` : esc(h.result)}</span></li>`).join('')}</ul>` : '';
  const litters = snap.litters.filter((l) => l.dam_id === d.id || l.sire_id === d.id);
  const sale = saleOf(snap, ctx, d);
  return {
    title: d.call_name, section: '/dogs', description: d.bio || `${d.call_name}, ${[snap.site.breed, d.role].filter(Boolean).join(' ')}`, image: d.photo_id,
    body: `<section class="section"><div class="wrap">
      <p class="breadcrumb"><a href="/dogs">${esc(label(snap, 'dogs'))}</a></p>
      <div class="dogpage">${photo}<div class="info">
        <span class="eyebrow">${esc([snap.site.breed, d.role].filter(Boolean).join(' · '))}</span><h1>${esc(d.call_name)}</h1>
        ${d.registered_name ? `<p class="reg">${esc(d.registered_name)}</p>` : ''}
        <dl class="kv">${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
        ${d.bio ? `<p class="bio">${esc(d.bio)}</p>` : ''}${sale ? `<p class="status avail">Looking for a home${sale.price ? ` · ${esc(sale.price)}` : ''}</p><p><a class="btn solid" href="${attr(sale.ask)}">Ask about ${esc(d.call_name)}</a></p>` : ''}${tests}${shareRow()}
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
  const current = snap.litters.filter((l) => l.stage === 'current' && !depositsAhead(l, ctx.today) && !older.has(l.id) && l.puppies.length);
  // Coming up: planned litters, and born ones whose deposits date is still ahead.
  const planned = snap.litters.filter((l) => l.stage === 'planned' || depositsAhead(l, ctx.today));
  const sections = [];
  current.forEach((l, i) => {
    const lede = [pairNames(snap, l) && `${pairNames(snap, l)}.`, l.summary, l.ready_on && `Ready to go home ${fmtDate(l.ready_on)}.`, l.show_prices && l.price_note].filter(Boolean).join(' ');
    sections.push(`<section class="section${i ? '' : ' tight'}"${i ? '' : ' id="available"'}><div class="wrap">
      ${head(l.born_on ? `Born ${fmtDate(l.born_on)}` : 'Current litter', l.name, lede)}
      ${slider(sortPuppies(l.puppies).map((pup) => puppyCard(snap, l, pup, ctx)), { cls: 'three', ctl: `<a class="more" href="/litters/${attr(l.slug)}">The ${esc(l.name.replace(/^the /i, ''))} page</a>` })}
    </div></section>`);
  });
  const olderList = olderPuppies(snap, ctx.today);
  if (olderList.length && pageOn(snap, 'older', ctx)) {
    sections.push(`<section class="section band" id="older"><div class="wrap">
      ${head('Ready now', label(snap, 'older'), null)}
      <div class="grid${olderList.length === 1 ? ' narrow-grid' : ''}">${olderList.map(({ litter, puppy }) => puppyCard(snap, litter, puppy, ctx)).join('')}</div>
      <p class="center mt-20"><a class="more" href="/litters/older">All older puppies</a></p>
    </div></section>`);
  }
  if (planned.length) {
    sections.push(`<section class="section" id="upcoming"><div class="wrap">
      ${head('Coming up', 'Upcoming litters', 'Plans can change. Heat dates are estimates.')}
      <div class="litters">${planned.map((l) => litterCard(snap, l, ctx)).join('')}</div>
    </div></section>`);
  }
  if (!sections.length) sections.push('<section class="section tight"><div class="wrap notice"><p class="muted">No litters to show right now.</p></div></section>');
  return {
    title: snap.pages.litters.heading || label(snap, 'litters'), section: '/litters', description: p.lede,
    body: `${pagehead(p, { eyebrow: 'Puppies', heading: 'Puppies' })}${sections.join('\n')}`,
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
  const pups = sortPuppies(l.puppies);
  const lede = [pairNames(snap, l), l.summary].filter(Boolean).join('. ');
  const note = l.show_prices && l.price_note ? `<p class="small muted center mt-20">${esc(l.price_note)}</p>` : '';
  return {
    title: l.name, section: '/litters', description: lede || l.name, image: pups.find((x) => x.photo_id)?.photo_id,
    body: `${pagehead({}, { eyebrow: l.stage === 'planned' ? (l.plan_label || 'Planned litter') : l.born_on ? `Born ${fmtDate(l.born_on)}` : 'Litter', heading: l.name, lede })}
      <section class="section tight"><div class="wrap">
        <p class="breadcrumb center"><a href="/litters">${esc(label(snap, 'litters'))}</a></p>
        <div class="litters">${litterCard(snap, l, ctx, { link: false })}</div>${note}
        ${fullRegLink(snap, l, null, ctx, 'btn line') ? `<div class="litters mt-20" id="full-registration"><div><p class="btn-row">${fullRegLink(snap, l, null, ctx, 'btn line')}</p>${fullRegSurchargeRow(snap, l, null, ctx) ? `<div class="mt-20">${fullRegSurchargeRow(snap, l, null, ctx)}</div>` : ''}</div></div>` : ''}${shareRow(true)}
        ${pups.length ? `<div class="mt-26 grid">${pups.map((pup) => puppyCard(snap, l, pup, ctx)).join('')}</div>` : ''}
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
function litterAlbums(snap, ctx, l) {
  const list = pageOn(snap, 'albums', ctx) ? (snap.albums ?? []).filter((a) => a.litter_id === l.id) : [];
  return list.length ? `<div class="mt-26">${head('Photos', null)}<div class="albums">${list.map((a) => albumCard(snap, a)).join('')}</div></div>` : '';
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
  const photos = a.photos.map((id, i) => {
    const p = snap.photos[id];
    return `<a class="gal-item" href="/_kp/p/${attr(encodeURIComponent(id))}" data-gallery${p?.width ? ` data-w="${p.width}" data-h="${p.height}"` : ''}>${img(snap, id, { thumb: true, alt: p?.alt || `${a.title}, photo ${i + 1}` })}</a>`;
  }).join('');
  return {
    title: a.title, section: '/litters', description: a.description || `${a.photos.length} photos from ${snap.site.kennel_name}`, image: a.cover_photo_id,
    body: `${pagehead({}, { eyebrow: l ? l.name : 'Photo album', heading: a.title, lede: a.description })}
      <section class="section tight"><div class="wrap">
        <p class="breadcrumb center">${l && snap.pages.litters.enabled ? `<a href="/litters/${attr(l.slug)}">${esc(l.name)}</a> · ` : ''}<a href="/albums">${esc(label(snap, 'albums'))}</a></p>
        <div class="gallery">${photos}</div>${shareRow(true)}
        ${embedsBlock(snap, `album:${a.id}`, { inWrap: true })}
      </div></section>
      <dialog class="viewer" id="viewer" aria-label="Photo viewer"><img alt=""><button type="button" class="v-prev" aria-label="Previous photo">‹</button><button type="button" class="v-next" aria-label="Next photo">›</button><button type="button" class="v-close" aria-label="Close">×</button><span class="v-count small"></span></dialog>`,
  };
}

export function puppy(snap, ctx, litterSlug, slug) {
  const l = snap.litters.find((x) => x.slug === litterSlug);
  const p = l?.puppies.find((x) => x.slug === slug);
  if (!p) return null;
  const photo = img(snap, p.photo_id, { alt: p.name, cls: 'photo', lazy: false }) ?? '<div class="photo" aria-hidden="true"></div>';
  const status = puppyStatus(l, p, ctx.today);
  const price = puppyPriceText(l, p);
  const reg = REG_WORDS[p.registration];
  const facts = [['Sex', p.sex === 'female' ? 'Female' : 'Male'], ['Color', p.color], ['Collar', p.collar], ['Status', status], ['Price', price], ['Registration', reg], ['Registry', p.registry], ['Parents', pairNames(snap, l)], ['Born', fmtDate(l.born_on)]].filter(([, v]) => v);
  return {
    title: `${p.name}, ${l.name}`, section: '/litters', description: p.bio || `${p.name}: ${status}`, image: p.photo_id,
    body: `<section class="section"><div class="wrap">
      <p class="breadcrumb"><a href="/litters/${attr(l.slug)}">${esc(l.name)}</a></p>
      <div class="dogpage">${photo}<div class="info">
        <span class="status ${p.status === 'available' ? 'avail' : 'res'}">${esc(status)}</span><h1>${esc(p.name)}</h1>
        <dl class="kv">${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
        ${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ''}
        ${p.status === 'available' || fullRegLink(snap, l, p, ctx, '') ? `<p>${p.status === 'available' ? `<a class="btn solid" href="${pageOn(snap, 'waitlist', ctx) ? '/waitlist' : '/contact'}">Ask about ${esc(p.name)}</a> ` : ''}${fullRegLink(snap, l, p, ctx, 'btn line')}</p>` : ''}${fullRegSurchargeRow(snap, l, p, ctx, 'kv')}
        ${safeNotice(snap, ctx)}${shareRow()}
      </div></div>
    </div></section>`,
  };
}

// ---------- How it works ----------

export function howItWorks(snap, ctx) {
  const p = snap.pages.how_it_works;
  const pay = payShown(snap, ctx);
  const items = snap.steps.map((s, i) => `<article class="step"><span class="n">${i + 1}</span><h3>${esc(s.heading)}</h3>${s.body ? `<p>${esc(s.body)}</p>` : ''}${s.detail ? `<details class="x"><summary>More detail</summary><div class="body">${paras(s.detail)}</div></details>` : ''}${s.pay_link && pay ? '<a class="more" href="/waitlist#how-to-pay">How to pay</a>' : ''}</article>`);
  return {
    title: snap.pages.how_it_works.heading || label(snap, 'how_it_works'), section: '/how-it-works', description: p.lede,
    body: `${pagehead(p, { eyebrow: 'How it works', heading: 'From application to home' })}
      <section class="section tight" id="steps"><div class="wrap">${slider(items, { cls: 'three', ctl: '<span class="muted small">Swipe or use the arrows.</span>' })}</div></section>`,
  };
}

export function extras(snap, ctx) {
  const p = snap.pages.extras;
  const prices = snap.site.show_other_prices;
  const ask = pageOn(snap, 'waitlist', ctx) ? '/waitlist' : '/contact';
  const pkgs = snap.extras.filter((x) => x.kind === 'homegoing').sort((a, b) => (a.weeks ?? 0) - (b.weeks ?? 0));
  const items = snap.extras.filter((x) => x.kind === 'item');
  const price = (x) => (prices && x.price_from != null ? `<div class="price">${esc(priceText(x.price_from, x.price_to))}</div>` : `<div class="price">Contact us for pricing</div>`);
  const pkgHtml = pkgs.map((x) => `<article class="pkg${x.featured ? ' top' : ''}">
      ${x.weeks ? `<div class="weeks"><b>${x.weeks}</b><span>weeks${x.featured ? ' · most complete' : ''}</span></div>` : ''}<h3>${esc(x.name)}</h3>${price(x)}
      ${x.description ? `<p>${esc(x.description)}</p>` : ''}
      ${x.checklist.length ? `<details><summary>What's included</summary>${x.lead_in ? `<p class="small muted lead">${esc(x.lead_in)}</p>` : ''}<ul class="checks">${x.checklist.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>${x.closing ? `<p class="small muted closing">${esc(x.closing)}</p>` : ''}</details>` : ''}
      <a class="more" href="${ask}">Ask about this package</a></article>`).join('');
  const itemHtml = items.map((x) => `<article class="pkg"><h3>${esc(x.name)}</h3>${x.grp ? `<span class="eyebrow">${esc(x.grp)}</span>` : ''}${price(x)}${x.description ? `<p>${esc(x.description)}</p>` : ''}<a class="more" href="${ask}">Ask about this</a></article>`).join('');
  return {
    title: snap.pages.extras.heading || label(snap, 'extras'), section: '/extras', description: p.lede,
    body: `${pagehead(p, { eyebrow: 'Extras', heading: 'Extras' })}
      <section class="section tight"><div class="wrap">
        ${pkgHtml ? `<div class="pkgs">${pkgHtml}</div>${p.note && prices ? `<p class="small muted center mt-20">${esc(p.note)}</p>` : ''}` : ''}
        ${itemHtml ? `<div class="pkgs mt-26">${itemHtml}</div>` : ''}
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
export const policies = (snap) => expanderPage(snap, 'policies', { eyebrow: 'Our promises', heading: 'Policies' });
export const faq = (snap) => expanderPage(snap, 'faq', { eyebrow: 'Questions', heading: 'FAQ' });
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

function kosQuestion(q, form) {
  const id = kosId(q);
  const data = `data-q="${attr(q.id)}" data-type="${attr(q.type)}"${q.key ? ` data-key="${attr(q.key)}"` : ''}${q.required ? ' data-required' : ''} data-label="${attr(q.label)}"`;
  const label = `<span>${esc(q.label)}${kosReq(q)}</span>${kosHelp(q)}`;
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
  const questions = (form.questions ?? []).map((q) => {
    const notice = q === firstMatch && form.matching_notice ? `<div class="kq notice-q"><b>Matching you with a pup</b><p class="small">${esc(form.matching_notice)}</p></div>` : '';
    return notice + kosQuestion(q, form);
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
const listDate = (ymd) => (/^\d{4}-\d{2}-\d{2}$/.test(String(ymd ?? '')) ? fmtDate(ymd) : '');
// The list as the site draws it, from KennelOS's feed or the simple waitlist.
// rows: { position, name, deciding?, wants (html, escaped), added }.
function familyList(snap, ctx, { name, updated, intro, rows, applyHere, powered }) {
  const added = (r) => (listDate(r.added) ? `<button type="button" class="added-tip" aria-label="Added ${attr(listDate(r.added))}" data-tip="Added ${attr(listDate(r.added))}">i</button>` : '');
  const body = rows.map((r) => `<tr data-wl-row data-pos="${attr(r.position)}" data-name="${attr(r.name ?? '')}"${r.deciding ? ' class="deciding"' : ''}>
      <td class="num">#${esc(r.position)}</td><td>${r.deciding ? `<em>${esc(r.name)}</em>` : esc(r.name)}</td>
      <td>${r.wants}</td><td class="tip">${added(r)}</td></tr>`).join('');
  const gaps = rows.some((r, i) => r.position !== i + 1);
  const table = rows.length
    ? `<table class="list"><thead><tr><th>#</th><th>Name</th><th>Wants</th><th class="tip"><span class="sr-only">Added</span></th></tr></thead><tbody>${body}</tbody></table>
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
    position: r.position, name: r.name, deciding: r.deciding, added: r.added,
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
    body: `${pagehead(p, { eyebrow: 'Waitlist', heading: 'Our waitlist' })}
      <section class="section tight"><div class="wrap">${list}${main}${help}</div>${pay ? `<div class="wrap">${pay}</div>` : ''}</section>`,
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

// The "ak" template's pages. Each takes the snapshot and the request context and
// returns { title, description, image, section, body } for layout(), or null for
// "no such page".
import {
  esc, attr, fmtDate, priceText, paras, img, pageOn, label, olderPuppies, sortPuppies, pairNames, parentName,
  litterCard, dogCard, puppyCard, slider, reviewCard, expanders, pagehead, head, ICONS, STATUS_TEXT,
  paySection, safeNotice, payShown,
} from './parts.js';

const sprigs = '<svg class="sprig l" aria-hidden="true"><use href="#sprig"/></svg><svg class="sprig r" aria-hidden="true"><use href="#sprig"/></svg>';
const scriptLine = (text, script) => `${esc(text ?? '')}${script ? ` <span class="script">${esc(script)}</span>` : ''}`;

// ---------- Home ----------

export function home(snap, ctx) {
  const h = snap.home;
  const parts = [];
  const waitlistOn = pageOn(snap, 'waitlist', ctx);

  if (h.hero.enabled) {
    const photos = (h.hero.photos ?? []).map((id, i) => img(snap, id, { lazy: i > 0 })).filter(Boolean);
    while (photos.length < 3) photos.push('<div class="hero-ph" aria-hidden="true"></div>');
    const facts = h.facts.enabled && h.facts.items?.length
      ? `<div class="facts">${h.facts.items.map(([v, l]) => `<div><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>` : '';
    const buttons = [
      waitlistOn ? `<a class="btn solid" href="/waitlist">${esc(h.hero.primary_label || 'Join the waitlist')}</a>` : '',
      pageOn(snap, 'litters', ctx) ? `<a class="btn line" href="/litters">${esc(h.hero.secondary_label || 'See our puppies')}</a>` : '',
    ].join('');
    parts.push(`<section class="wrap hero"><div class="hero-copy">
      ${h.hero.eyebrow ? `<span class="eyebrow">${esc(h.hero.eyebrow)}</span>` : ''}
      <h1>${scriptLine(h.hero.headline || snap.site.kennel_name, h.hero.script)}</h1>
      ${h.hero.intro ? `<p>${esc(h.hero.intro)}</p>` : ''}
      ${buttons ? `<div class="hero-actions">${buttons}</div>` : ''}${facts}
    </div><div class="hero-photos">${photos.join('')}</div></section>`);
  }

  if (h.story.enabled && (h.story.text || h.story.heading)) {
    const photo = img(snap, h.story.photo_id) ?? '<div class="story-ph" aria-hidden="true"></div>';
    const features = (h.story.features ?? []).map((f) => `<div class="feature"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">${ICONS[f.icon] ?? ICONS.heart}</svg><b>${esc(f.title)}</b><p>${esc(f.text)}</p></div>`).join('');
    parts.push(`<section class="section band"><div class="wrap story">${photo}<div class="story-copy">
      ${h.story.eyebrow ? `<span class="eyebrow">${esc(h.story.eyebrow)}</span>` : ''}
      <h2>${scriptLine(h.story.heading, h.story.script)}</h2>
      ${h.story.text ? `<p>${esc(h.story.text)}</p>` : ''}
      ${features ? `<div class="features">${features}</div>` : ''}
      ${pageOn(snap, 'about', ctx) ? `<div><a class="more" href="/about">${esc(h.story.link_label || 'Read our full story')}</a></div>` : ''}
    </div></div></section>`);
  }

  const dogs = snap.dogs.filter((d) => d.status === 'active');
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

  if (h.waitlist.enabled && waitlistOn) {
    parts.push(`<section class="cta"><div class="wrap"><div><h2>${esc(h.waitlist.heading || 'Hoping for a puppy of your own?')}</h2>${h.waitlist.line ? `<p>${esc(h.waitlist.line)}</p>` : ''}</div><a class="btn" href="/waitlist">${esc(h.waitlist.button_label || 'Join the waitlist')}</a></div></section>`);
  }

  return { title: null, section: '/', image: h.hero.photos?.[0], body: parts.join('\n') };
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
      <section class="section tight"><div class="wrap ${photo ? 'story' : 'prose'}">${photo}${text}</div></section>`,
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

const v = (ctx, name) => attr(ctx.form?.values?.[name] ?? '');
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

export function dogs(snap, ctx) {
  const p = snap.pages.dogs;
  const list = snap.dogs.filter((d) => d.status === 'active');
  const both = list.some((d) => d.sex === 'female') && list.some((d) => d.sex === 'male');
  return {
    title: snap.pages.dogs.heading || label(snap, 'dogs'), section: '/dogs', description: p.lede,
    body: `${pagehead(p, { eyebrow: 'Kennel residents', heading: 'Our dogs' })}
      <section class="section tight"><div class="wrap"><span id="girls"></span><span id="boys"></span>
      ${both ? '<div class="filter"><label for="dog-filter">Show</label><select id="dog-filter"><option value="all">All dogs</option><option value="female">Girls</option><option value="male">Boys</option></select></div>' : ''}
      <div class="grid" id="all-dogs">${list.map((d) => `<div data-sex="${d.sex}">${dogCard(snap, d)}</div>`).join('')}</div>
      <p class="flip-hint">Tap a card to turn it over; tap again to turn it back.</p></div></section>`,
  };
}

export function dog(snap, ctx, slug) {
  const d = snap.dogs.find((x) => x.slug === slug);
  if (!d) return null;
  const photo = img(snap, d.photo_id, { alt: d.call_name, cls: 'photo', lazy: false }) ?? '<div class="photo" aria-hidden="true"></div>';
  const facts = [['Sex', d.sex === 'female' ? 'Female' : 'Male'], ['Color', d.color], ['Born', fmtDate(d.date_of_birth)], ['Titles', d.titles]].filter(([, v]) => v);
  const tests = d.health.length ? `<span class="eyebrow">Health testing</span><ul class="tests">${d.health.map((h) => `<li><span>${esc(h.test)}</span><span>${h.verify_url ? `<a href="${attr(h.verify_url)}" rel="noopener">${esc(h.result)}</a>` : esc(h.result)}</span></li>`).join('')}</ul>` : '';
  const litters = snap.litters.filter((l) => l.dam_id === d.id || l.sire_id === d.id);
  return {
    title: d.call_name, section: '/dogs', description: d.bio || `${d.call_name}, ${[snap.site.breed, d.role].filter(Boolean).join(' ')}`, image: d.photo_id,
    body: `<section class="section"><div class="wrap">
      <p class="breadcrumb"><a href="/dogs">${esc(label(snap, 'dogs'))}</a></p>
      <div class="dogpage">${photo}<div class="info">
        <span class="eyebrow">${esc([snap.site.breed, d.role].filter(Boolean).join(' · '))}</span><h1>${esc(d.call_name)}</h1>
        ${d.registered_name ? `<p class="reg">${esc(d.registered_name)}</p>` : ''}
        <dl class="kv">${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
        ${d.bio ? `<p class="bio">${esc(d.bio)}</p>` : ''}${tests}
      </div></div>
      ${litters.length ? `<div class="mt-26">${head('Litters', null)}<div class="litters">${litters.map((l) => litterCard(snap, l, ctx)).join('')}</div></div>` : ''}
    </div></section>`,
  };
}

// ---------- Puppies ----------

export function litters(snap, ctx) {
  const p = snap.pages.litters;
  const older = new Set(olderPuppies(snap, ctx.today).map((o) => o.litter.id));
  const current = snap.litters.filter((l) => l.stage === 'current' && !older.has(l.id) && l.puppies.length);
  const planned = snap.litters.filter((l) => l.stage === 'planned');
  const sections = [];
  current.forEach((l, i) => {
    const lede = [pairNames(snap, l) && `${pairNames(snap, l)}.`, l.summary, l.ready_on && `Ready to go home ${fmtDate(l.ready_on)}.`].filter(Boolean).join(' ');
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
  return {
    title: l.name, section: '/litters', description: lede || l.name, image: pups.find((x) => x.photo_id)?.photo_id,
    body: `${pagehead({}, { eyebrow: l.stage === 'planned' ? (l.plan_label || 'Planned litter') : l.born_on ? `Born ${fmtDate(l.born_on)}` : 'Litter', heading: l.name, lede })}
      <section class="section tight"><div class="wrap">
        <p class="breadcrumb center"><a href="/litters">${esc(label(snap, 'litters'))}</a></p>
        <div class="litters">${litterCard(snap, l, ctx, { link: false })}</div>
        ${pups.length ? `<div class="mt-26 grid">${pups.map((pup) => puppyCard(snap, l, pup, ctx)).join('')}</div>` : ''}
      </div></section>`,
  };
}

export function puppy(snap, ctx, litterSlug, slug) {
  const l = snap.litters.find((x) => x.slug === litterSlug);
  const p = l?.puppies.find((x) => x.slug === slug);
  if (!p) return null;
  const photo = img(snap, p.photo_id, { alt: p.name, cls: 'photo', lazy: false }) ?? '<div class="photo" aria-hidden="true"></div>';
  const facts = [['Sex', p.sex === 'female' ? 'Female' : 'Male'], ['Color', p.color], ['Collar', p.collar], ['Status', STATUS_TEXT[p.status]], ['Parents', pairNames(snap, l)], ['Born', fmtDate(l.born_on)]].filter(([, v]) => v);
  return {
    title: `${p.name}, ${l.name}`, section: '/litters', description: p.bio || `${p.name}: ${STATUS_TEXT[p.status]}`, image: p.photo_id,
    body: `<section class="section"><div class="wrap">
      <p class="breadcrumb"><a href="/litters/${attr(l.slug)}">${esc(l.name)}</a></p>
      <div class="dogpage">${photo}<div class="info">
        <span class="status ${p.status === 'available' ? 'avail' : 'res'}">${esc(STATUS_TEXT[p.status])}</span><h1>${esc(p.name)}</h1>
        <dl class="kv">${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
        ${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ''}
        ${p.status === 'available' ? `<p><a class="btn solid" href="${pageOn(snap, 'waitlist', ctx) ? '/waitlist' : '/contact'}">Ask about ${esc(p.name)}</a></p>` : ''}
        ${safeNotice(snap, ctx)}
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
  page.body += '<p class="center mt-26"><a class="btn line" href="/waitlist">Back to the waitlist</a></p>';
  return page;
}

// ---------- Waitlist ----------
// Phase 3 adds the list from KennelOS and the application (plan 3.8). Until then
// the page says how to ask.

export function waitlist(snap, ctx) {
  const p = snap.pages.waitlist;
  return {
    title: snap.pages.waitlist.heading || label(snap, 'waitlist'), section: '/waitlist', description: p.lede,
    body: `${pagehead(p, { eyebrow: 'Waitlist', heading: 'Our waitlist' })}
      <section class="section tight"><div class="wrap notice">
        <p class="muted">Our waitlist will be shown here soon. In the meantime, please get in touch and we'll tell you where it stands.</p>
        <a class="btn solid" href="/contact">Contact us</a>
        ${pageOn(snap, 'waitlist_help', ctx) ? `<a class="more" href="/waitlist/help">${esc(label(snap, 'waitlist_help'))}</a>` : ''}
      </div>${paySection(snap) ? `<div class="wrap">${paySection(snap)}</div>` : ''}</section>`,
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

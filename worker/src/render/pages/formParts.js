// The forms visitors send (siteforms.js receives them): what each field held when a
// form comes back with an error, the honeypot, the Turnstile box, the sent or
// not-sent message, and the review and contact forms themselves.
import { attr, esc, pagePath, ANY_LITTER } from '../parts.js';
import { formOf } from '../../content/forms.js';

// What she typed, or (before any send) what a link filled in (ctx.prefill).
export const v = (ctx, name) => attr(ctx.form?.values?.[name] ?? ctx.prefill?.[name] ?? '');

export const honeypot = '<div class="hp" aria-hidden="true"><label>Leave this empty<input name="website" tabindex="-1" autocomplete="off"></label></div>';

export const turnstileBox = (ctx) => (ctx.turnstileKey ? `<div class="cf-turnstile" data-sitekey="${attr(ctx.turnstileKey)}"></div><script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>` : '');

export const formResult = (ctx, page, thanks) => {
  if (ctx.form?.page !== page) return '';
  if (ctx.form.ok) return `<p class="done" role="status">${esc(thanks(ctx.form.name))}</p>`;
  return `<p class="done bad" role="alert">${esc(ctx.form.error)}</p>`;
};

// ---------- the contact and review forms' fields (content/forms.js) ----------

// The pup or litter a message is about: her current and planned litters, each with
// its pups, then "Any litter".
export const aboutChoices = (snap) => [
  ...snap.litters.filter((l) => l.stage === 'planned' || l.stage === 'current').flatMap((l) => [l.name, ...(l.puppies ?? []).map((p) => `${p.name} (${l.name})`)]),
  ANY_LITTER,
];
const IDS = {
  contact: { name: 'c-name', email: 'c-email', phone: 'c-phone', topic: 'c-topic', message: 'c-msg' },
  reviews: { first_name: 'r-name', town: 'r-town', puppy_name: 'r-pup', home_month: 'r-home', quote: 'r-text', photo: 'r-photo', consent: 'r-ok' },
};
const AUTOCOMPLETE = { name: 'name', email: 'email', phone: 'tel', first_name: 'given-name' };
const TYPES = { email: 'email', phone: 'tel', month: 'month' };

// One field, drawn as today's forms draw it. prefix: c (contact) or r (review).
function fieldHtml(snap, ctx, which, f) {
  const id = IDS[which][f.key] ?? `${which === 'contact' ? 'c' : 'r'}-${f.key}`;
  const req = f.required ? ' required' : '';
  const label = esc(f.words);
  const name = attr(f.name);
  switch (f.kind) {
    case 'long': return `<label for="${id}">${label}<textarea id="${id}" name="${name}" rows="${f.rows ?? 4}" maxlength="${f.max}"${req}>${v(ctx, f.name)}</textarea></label>`;
    case 'stars': {
      const chosen = String(ctx.form?.values?.rating ?? (f.required ? '5' : ''));
      const stars = [5, 4, 3, 2, 1].map((n) => `<input type="radio" name="rating" id="r-s${n}" value="${n}"${chosen === String(n) ? ' checked' : ''}><label for="r-s${n}" title="${n} star${n === 1 ? '' : 's'}">★</label>`).join('');
      return `<fieldset class="stars-in"><legend>${label}</legend><div class="star-row">${stars}</div></fieldset>`;
    }
    case 'photo': return `<label for="${id}">${label}<input id="${id}" type="file" name="photo" accept="image/*"${req}></label>`;
    case 'consent': return `<label class="consent" for="${id}"><input id="${id}" type="checkbox" name="consent" value="1" required> ${label}</label>`;
    case 'pick': {
      const choices = f.key === 'about' ? aboutChoices(snap) : f.type === 'yes_no' ? ['Yes', 'No'] : f.options ?? [];
      const typed = ctx.form?.values?.[f.name] ?? ctx.prefill?.[f.name] ?? '';
      return `<label for="${id}">${label}<select id="${id}" name="${name}"${req}><option value="">${f.required ? 'Choose…' : ''}</option>${choices.map((c) => `<option${c === typed ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select></label>`;
    }
    default: {
      const type = TYPES[f.kind] ? ` type="${TYPES[f.kind]}"` : '';
      const auto = AUTOCOMPLETE[f.key] && !f.own ? ` autocomplete="${AUTOCOMPLETE[f.key]}"` : '';
      const max = f.kind === 'month' ? '' : ` maxlength="${f.max}"`;
      const ph = f.ph ? ` placeholder="${attr(f.ph)}"` : '';
      return `<label for="${id}">${label}<input id="${id}"${type} name="${name}"${auto}${max}${ph}${req} value="${v(ctx, f.name)}"></label>`;
    }
  }
}

// A form's fields: the short ones two to a row, as today; the rest on their own.
const ALONE = new Set(['long', 'stars', 'photo', 'consent']);
function fieldRows(snap, ctx, which, indent) {
  const out = [];
  let row = [];
  const flush = () => { if (row.length) out.push(row.length === 2 ? `<div class="row">${row.join('')}</div>` : row[0]); row = []; };
  for (const f of formOf(snap, which)) {
    if (ALONE.has(f.kind)) { flush(); out.push(fieldHtml(snap, ctx, which, f)); continue; }
    row.push(fieldHtml(snap, ctx, which, f));
    if (row.length === 2) flush();
  }
  flush();
  return out.join(`\n${indent}`);
}

export function reviewForm(snap, ctx) {
  const sent = ctx.form?.page === 'reviews' && ctx.form.ok;
  return `<details class="review-share" id="share-review"${ctx.form?.page === 'reviews' ? ' open' : ''}>
    <summary class="btn line">Share your review</summary>
    <form class="apply-form review-form" method="post" action="${attr(pagePath(snap, 'reviews'))}#share-review" enctype="multipart/form-data" data-photo-form>
      <div><span class="eyebrow">${esc(snap.site.monogram || snap.site.kennel_name)} families</span><h2 class="mt-6">Share your review</h2><p class="muted small mt-6">Reviews appear on our site once we've read and approved them. We show your first name and town only.</p></div>
      ${formResult(ctx, 'reviews', (name) => `Thank you, ${name}! Your review goes to ${snap.site.kennel_name} to read, and it appears here once they approve it.`)}
      ${sent ? '' : `${fieldRows(snap, ctx, 'reviews', '      ')}
      ${honeypot}${turnstileBox(ctx)}
      <div><button class="btn solid" type="submit">Send review</button></div>`}
    </form></details>`;
}

export function contactForm(snap, ctx) {
  const sent = ctx.form?.page === 'contact' && ctx.form.ok;
  // A full registration link fills in the subject; with no subject field it still
  // goes with the message.
  const topicOff = !formOf(snap, 'contact').some((f) => f.key === 'topic');
  const carried = topicOff && (ctx.form?.values?.topic || ctx.prefill?.topic) ? `<input type="hidden" name="topic" value="${v(ctx, 'topic')}">` : '';
  return `<form class="apply-form" method="post" action="${attr(pagePath(snap, 'contact'))}#message" id="message">
    <div><span class="eyebrow">Message us</span><h2 class="mt-6">Send us a message</h2><p class="muted small mt-6">We'll reply to the email address you give.</p></div>
    ${formResult(ctx, 'contact', (name) => `Thanks${name ? `, ${name.split(/\s+/)[0]}` : ''}. Your message is on its way to ${snap.site.kennel_name}.`)}
    ${sent ? '' : `${fieldRows(snap, ctx, 'contact', '    ')}${carried}
    ${honeypot}${turnstileBox(ctx)}
    <div><button class="btn solid" type="submit">Send message</button></div>`}
  </form>`;
}

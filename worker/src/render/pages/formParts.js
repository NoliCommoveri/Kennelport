// The forms visitors send (siteforms.js receives them): what each field held when a
// form comes back with an error, the honeypot, the Turnstile box, the sent or
// not-sent message, and the review and contact forms themselves.
import { attr, esc } from '../parts.js';

// What she typed, or (before any send) what a link filled in (ctx.prefill).
export const v = (ctx, name) => attr(ctx.form?.values?.[name] ?? ctx.prefill?.[name] ?? '');

export const honeypot = '<div class="hp" aria-hidden="true"><label>Leave this empty<input name="website" tabindex="-1" autocomplete="off"></label></div>';

export const turnstileBox = (ctx) => (ctx.turnstileKey ? `<div class="cf-turnstile" data-sitekey="${attr(ctx.turnstileKey)}"></div><script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>` : '');

export const formResult = (ctx, page, thanks) => {
  if (ctx.form?.page !== page) return '';
  if (ctx.form.ok) return `<p class="done" role="status">${esc(thanks(ctx.form.name))}</p>`;
  return `<p class="done bad" role="alert">${esc(ctx.form.error)}</p>`;
};

export function reviewForm(snap, ctx) {
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

export function contactForm(snap, ctx) {
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

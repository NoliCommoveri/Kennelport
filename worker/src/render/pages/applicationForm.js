// KennelOS's application form, drawn in the site's style (plan 3.8): its questions
// (from KennelOS's feed, src/feed.js) as the template's fields, for the Waitlist page
// (render/pages.js waitlist).
//
// The feed's `form` is what KennelOS's own /apply page draws; this draws the same
// questions here. site.js (the template's script) seals the answers to her form
// key in the visitor's browser and sends them straight to KennelOS, then takes
// the emailed code. Without scripts (or WebCrypto) the form stays hidden and the
// link to KennelOS's own page shows instead.
import { esc, attr, paras, pageOn } from '../parts.js';

export const kosReq = (q) => (q.required ? ' <span class="req" aria-label="required">*</span>' : '');

export const kosHelp = (q) => (q.help && q.type !== 'notice' ? `<span class="q-hint">${esc(q.help)}</span>` : '');

export const kosId = (q) => `k-${String(q.id).replace(/[^A-Za-z0-9_-]/g, '_')}`;

export const radios = (name, options, required = false) => `<div class="choices">${options.map(([value, text]) => `<label class="choice"><input type="radio" name="${attr(name)}" value="${attr(value)}"${required ? ' required' : ''}> ${esc(text)}</label>`).join('')}</div>`;

export const boxes = (options) => `<div class="choices">${options.map(([value, text]) => `<label class="choice"><input type="checkbox" value="${attr(value)}"> ${esc(text)}</label>`).join('')}</div>`;

export function kosPreference(q, form) {
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

export function kosQuestion(q, form, policiesHref = null) {
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

export function kennelosForm(snap, ctx) {
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

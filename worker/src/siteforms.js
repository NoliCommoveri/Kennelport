// The forms visitors send from a site (plan 3.9, 3.10; decisions 12, 13, 17):
// - POST /contact: a message, saved to the manage app's Inbox only, never emailed;
// - POST /waitlist: a puppy application on the manual route (plan 3.8, decision
//   26), the breeder's own questions as published, saved to the Inbox the same way;
// - POST /reviews: a family's review, held for the breeder to approve; its photo
//   gets the same checks as any upload and stays private until a published review
//   uses it.
// Spam: Cloudflare Turnstile when TURNSTILE_SITE_KEY / TURNSTILE_SECRET are set,
// always a hidden honeypot field, and limits per visitor and per site.
import { hmacHex } from './lib/crypto.js';
import { savePhoto, PhotoError } from './photos.js';
import { notify } from './push.js';
import { litterChoices, ABOUT_LABEL } from './render/parts.js';
import { PRIVATE_ANSWER } from './waitlist.js';
import { formOf } from './content/forms.js';
import { aboutChoices } from './render/pages/formParts.js';

export const FORM_LIMITS = { perVisitorHour: 5, perSiteDay: 100 };
export const HONEYPOT = 'website';

export class FormError extends Error {}

export const turnstileOn = (env) => Boolean(env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET);

async function bump(env, bucket, window) {
  return env.DB.prepare(`INSERT INTO rate_limits (bucket, window_start, count) VALUES (?, ?, 1)
    ON CONFLICT (bucket, window_start) DO UPDATE SET count = count + 1 RETURNING count`).bind(bucket, window).first('count');
}

async function limit(env, request, siteId) {
  const now = new Date().toISOString();
  const ip = await hmacHex(env.EMAIL_HMAC_KEY || 'kp', `ip:${request.headers.get('cf-connecting-ip') ?? 'unknown'}`);
  const byVisitor = await bump(env, `form:${siteId}:${ip}`, `${now.slice(0, 13)}:00:00Z`);
  const bySite = await bump(env, `form-site:${siteId}`, `${now.slice(0, 10)}T00:00:00Z`);
  if (byVisitor > FORM_LIMITS.perVisitorHour || bySite > FORM_LIMITS.perSiteDay) throw new FormError('Too many messages from here just now. Please try again later.');
}

async function turnstile(env, request, form) {
  if (!turnstileOn(env)) return;
  const token = String(form.get('cf-turnstile-response') ?? '');
  if (!token) throw new FormError('Please wait for the check box under the form to finish, then send again.');
  const body = new FormData();
  body.append('secret', env.TURNSTILE_SECRET);
  body.append('response', token);
  const ip = request.headers.get('cf-connecting-ip');
  if (ip) body.append('remoteip', ip);
  let ok = false;
  try {
    const res = await (env.TURNSTILE_FETCH ?? fetch)('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    ok = Boolean((await res.json()).success);
  } catch { ok = false; }
  if (!ok) throw new FormError("The spam check didn't pass. Please try again.");
}

const text = (form, name, max, { required = false, label = name, multiline = false } = {}) => {
  let v = String(form.get(name) ?? '').replace(/\r\n?/g, '\n');
  if (!multiline) v = v.replace(/\s+/g, ' ');
  v = v.trim();
  if (required && !v) throw new FormError(`Please fill in ${label}.`);
  if (v.length > max) throw new FormError(`${label[0].toUpperCase()}${label.slice(1)} is too long (at most ${max} characters).`);
  return v || null;
};

// Shared checks. Returns false for the honeypot: the caller answers "thanks" and
// keeps nothing, so a bot learns nothing.
async function screen(env, request, siteId, form) {
  if (String(form.get(HONEYPOT) ?? '')) return false;
  await turnstile(env, request, form);
  await limit(env, request, siteId);
  return true;
}

const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const REVIEW_OWN = new Set(['first_name', 'town', 'puppy_name', 'home_month', 'rating', 'quote', 'photo', 'consent']);

// The fields the owner added to a form (content/forms.js), checked against the
// form as published: [[its words, the answer], ...] for those answered. skip: the
// fields the caller keeps in their own columns.
function extraAnswers(form, snap, which, skip) {
  const out = [];
  for (const f of formOf(snap, which)) {
    if (skip.has(f.key)) continue;
    const words = f.words.replace(/\s*\((optional|optional, for us only)\)$/i, '');
    const label = `"${words}"`;
    const a = text(form, f.name, f.max ?? 200, { label, multiline: f.kind === 'long' });
    if (f.required && !a) throw new FormError(`Please answer ${label}.`);
    if (!a) continue;
    if (f.kind === 'pick') {
      const allowed = f.key === 'about' ? aboutChoices(snap) : f.type === 'yes_no' ? ['Yes', 'No'] : f.options ?? [];
      if (!allowed.includes(a)) throw new FormError(`Please choose an answer from the list for ${label}.`);
    }
    if (f.kind === 'email' && !EMAIL.test(a)) throw new FormError("That email address doesn't look right.");
    out.push([words, a]);
  }
  return out;
}

export async function receiveInquiry(env, request, siteId, ctxWorker, snap = null) {
  const form = await request.formData();
  const values = Object.fromEntries([...form.keys()].map((k) => [k, String(form.get(k) ?? '')]));
  try {
    if (!(await screen(env, request, siteId, form))) return { ok: true };
    const name = text(form, 'name', 80, { required: true, label: 'your name' });
    const email = text(form, 'email', 254, { required: true, label: 'your email' });
    if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) throw new FormError("That email address doesn't look right.");
    // The owner's fields (content/forms.js): phone and subject in their own columns,
    // as before (a full-registration link's subject comes even with no subject field);
    // the rest with the message, as an application's answers are.
    const fields = new Map(formOf(snap, 'contact').map((f) => [f.key, f]));
    const phone = fields.has('phone') ? text(form, 'phone', 30, { required: fields.get('phone').required, label: 'the phone number' }) : null;
    const topic = text(form, 'topic', 80, { required: Boolean(fields.get('topic')?.required), label: 'the subject' });
    const message = text(form, 'message', 3000, { required: true, label: 'your message', multiline: true });
    const extra = extraAnswers(form, snap, 'contact', new Set(['name', 'email', 'phone', 'topic', 'message']));
    const id = crypto.randomUUID();
    await env.DB.prepare('INSERT INTO inquiries (id, site_id, kind, name, email, phone, topic, message, answers, received_at) VALUES (?, ?, \'contact\', ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, siteId, name, email, phone, topic, message, extra.length ? JSON.stringify(extra) : null, new Date().toISOString()).run();
    const job = notify(env, siteId, 'message', name, id);
    if (ctxWorker?.waitUntil) ctxWorker.waitUntil(job); else await job;
    return { ok: true, name };
  } catch (err) {
    if (err instanceof FormError) return { ok: false, error: err.message, values };
    throw err;
  }
}

export async function receiveReview(env, request, siteId, ctxWorker, snap = null) {
  const form = await request.formData();
  const values = Object.fromEntries([...form.keys()].filter((k) => k !== 'photo').map((k) => [k, String(form.get(k) ?? '')]));
  try {
    if (!(await screen(env, request, siteId, form))) return { ok: true };
    // The owner's fields (content/forms.js): those on the review in its own columns
    // when the form has them; the rest (email, phone, her questions) for her only.
    const fields = new Map(formOf(snap, 'reviews').map((f) => [f.key, f]));
    const own = (key, max, label) => (fields.has(key) ? text(form, key, max, { required: fields.get(key).required, label }) : null);
    const first_name = text(form, 'first_name', 60, { required: true, label: 'your first name' });
    const town = own('town', 60, 'your town');
    const puppy_name = own('puppy_name', 40, "your puppy's name");
    const home_month = own('home_month', 7, 'the month');
    if (home_month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(home_month)) throw new FormError('Please give the month as a month and year.');
    const quote = text(form, 'quote', 1500, { required: true, label: 'your review', multiline: true });
    let rating = null;
    if (fields.has('rating')) {
      const given = String(form.get('rating') ?? '');
      rating = given || fields.get('rating').required ? Number(given || 0) : null;
      if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) throw new FormError('Please choose a star rating.');
    }
    if (!form.get('consent')) throw new FormError('Please tick the box so your review may be shown.');
    const extra = extraAnswers(form, snap, 'reviews', REVIEW_OWN);

    let photoId = null;
    const photo = fields.has('photo') ? form.get('photo') : null;
    if (fields.get('photo')?.required && !(photo && typeof photo !== 'string' && photo.size)) throw new FormError('Please add a photo of your puppy.');
    if (photo && typeof photo !== 'string' && photo.size) {
      try {
        photoId = (await savePhoto(env, siteId, { full: new Uint8Array(await photo.arrayBuffer()), alt: `${first_name}'s puppy` })).id;
      } catch (err) {
        if (err instanceof PhotoError) throw new FormError(`The photo couldn't be used: ${err.message} You can send the review without it.`);
        throw err;
      }
    }
    const t = new Date().toISOString();
    const id = crypto.randomUUID();
    await env.DB.prepare(`INSERT INTO stories (id, site_id, kind, quote, rating, first_name, town, puppy_name, home_month, photo_id, submitted_by, status, permission_confirmed_at, sort, submitted_at, answers)
      VALUES (?, ?, 'review', ?, ?, ?, ?, ?, ?, ?, 'family', 'pending', ?, 9999, ?, ?)`).bind(id, siteId, quote, rating, first_name, town, puppy_name, home_month, photoId, t, t, extra.length ? JSON.stringify(extra) : null).run();
    const job = notify(env, siteId, 'review', first_name, id);
    if (ctxWorker?.waitUntil) ctxWorker.waitUntil(job); else await job;
    return { ok: true, name: first_name };
  } catch (err) {
    if (err instanceof FormError) return { ok: false, error: err.message, values };
    throw err;
  }
}

// How long an answer may be, by question type.
const ANSWER_MAX = { text: 200, paragraph: 3000, phone: 30, town: 80 };

// Answers are checked against the questions in the published snapshot: what the
// visitor was shown. Returns [[question, answer], ...] for the questions answered.
function answers(form, snap) {
  const out = [];
  for (const q of snap.questions ?? []) {
    const name = `q.${q.id}`;
    const label = `"${q.label}"`;
    let a;
    if (q.type === 'choice' || q.type === 'yes_no' || q.type === 'litter') {
      a = text(form, name, 200, { label });
      const allowed = q.type === 'choice' ? q.options ?? [] : q.type === 'yes_no' ? ['Yes', 'No'] : litterChoices(snap);
      if (a && !allowed.includes(a)) throw new FormError(`Please choose an answer from the list for ${label}.`);
    } else {
      a = text(form, name, ANSWER_MAX[q.type] ?? 200, { label, multiline: q.type === 'paragraph' });
    }
    if (q.required && !a) throw new FormError(`Please answer ${label}.`);
    if (a) out.push([q.label, a]);
  }
  return out;
}

// kennelos: the breeder takes applications online in KennelOS, so they go there
// (from the visitor's browser), never here (decision 26).
export async function receiveApplication(env, request, siteId, snap, ctxWorker, { kennelos = false } = {}) {
  const form = await request.formData();
  const values = Object.fromEntries([...form.keys()].map((k) => [k, String(form.get(k) ?? '')]));
  try {
    if (snap.pages.waitlist?.closed) throw new FormError("Our waitlist isn't taking applications right now.");
    if (kennelos) throw new FormError('Please use the application form on this page; it sends your application straight to our waitlist.');
    if (!(await screen(env, request, siteId, form))) return { ok: true };
    const name = text(form, 'name', 80, { required: true, label: 'your name' });
    const email = text(form, 'email', 254, { required: true, label: 'your email' });
    if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) throw new FormError("That email address doesn't look right.");
    const list = answers(form, snap);
    // With no questions set up, the form asks for a few lines about them.
    const about = (snap.questions ?? []).length ? null : text(form, 'message', 3000, { required: true, label: 'a little about your family', multiline: true });
    if (about) list.push([ABOUT_LABEL, about]);
    // Keep my name private: if they're added to the waitlist, it shows masked.
    if (form.get('private')) list.push(PRIVATE_ANSWER);
    const phone = list.find(([label]) => (snap.questions ?? []).find((q) => q.label === label)?.type === 'phone')?.[1] ?? null;
    const id = crypto.randomUUID();
    await env.DB.prepare(`INSERT INTO inquiries (id, site_id, kind, name, email, phone, topic, message, answers, received_at)
      VALUES (?, ?, 'application', ?, ?, ?, 'Puppy application', ?, ?, ?)`)
      .bind(id, siteId, name, email, phone, list.map(([q, a]) => `${q}: ${a}`).join('\n').slice(0, 4000), JSON.stringify(list), new Date().toISOString()).run();
    const job = notify(env, siteId, 'message', name, id);
    if (ctxWorker?.waitUntil) ctxWorker.waitUntil(job); else await job;
    return { ok: true, name };
  } catch (err) {
    if (err instanceof FormError) return { ok: false, error: err.message, values };
    throw err;
  }
}

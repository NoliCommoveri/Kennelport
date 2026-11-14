// The contact and review forms' fields (docs/plans/site-builder.md, "Forms", step 3.8;
// decision 15): the owner chooses each form's fields from a list, which are
// required, their order and their words, per site, in her build (build.forms). With
// none set, each form is today's, field for field (decision 14).
//
// - The contact form always has name, email and message, required, so the breeder
//   can reply. Its other answers are saved with the message (inquiries.answers, the
//   column applications already use), the subject in its own column as before.
// - The review form always has first name, the review and the consent box, required:
//   the review card needs a name and words, and nothing shows without consent. Its
//   town, pup's name, month, rating and photo are the card's, as before. Its email,
//   phone and her own questions are for the breeder only (stories.answers,
//   migration 0035); the card never shows them.
// - Her own questions: short answer, paragraph, a choice, yes or no.
//
// The words are what visitors read on her site, the owner's (not the breeder's
// instructions). A field that isn't required reads as before; a required one loses a
// trailing "(optional)" from its words.
import { slugify } from './model.js';

export const FORM_KINDS = { contact: 'Contact form', reviews: 'Review form' };
export const QUESTION_KINDS = { text: 'A short answer', paragraph: 'A paragraph', choice: 'A choice from a list', yes_no: 'Yes or no' };
export const OWN_MAX = 8;
export const WORDS_MAX = 80;
const OPTIONS_MAX = 12;
const OPTION_MAX = 60;

// Every field each form can have: its starting words, whether it's always there and
// required (fixed), how it's drawn (kind), and what it is, for the owner's screen.
// short fields sit two to a row, as today.
export const FIELDS = {
  contact: {
    name: { words: 'Your name', fixed: true, kind: 'short', max: 80, what: 'Their name (always there, required)' },
    email: { words: 'Email', fixed: true, kind: 'email', max: 254, what: 'Their email, for her reply (always there, required)' },
    phone: { words: 'Phone (optional)', kind: 'phone', max: 30, what: 'A phone number' },
    town: { words: 'Town (optional)', kind: 'short', max: 80, what: 'Their town' },
    about: { words: 'The puppy or litter (optional)', kind: 'pick', max: 200, what: 'The pup or litter it\'s about: a list of her current and planned litters and their pups' },
    topic: { words: 'About (optional)', kind: 'short', max: 80, ph: 'A puppy, the waitlist, extras…', what: 'What it\'s about, in their words (her Inbox lists it)' },
    message: { words: 'Message', fixed: true, kind: 'long', max: 3000, rows: 5, what: 'Their message (always there, required)' },
  },
  reviews: {
    first_name: { words: 'First name', fixed: true, kind: 'short', max: 60, what: 'Their first name, on the review (always there, required)' },
    town: { words: 'Town', kind: 'short', max: 60, what: 'Their town, on the review' },
    puppy_name: { words: 'Your puppy\'s name', kind: 'short', max: 40, what: 'Their pup\'s name, on the review' },
    home_month: { words: 'Brought home', kind: 'month', max: 7, what: 'The month their pup came home, on the review' },
    rating: { words: 'Rating', kind: 'stars', what: 'A star rating, on the review' },
    quote: { words: 'Your review', fixed: true, kind: 'long', max: 1500, rows: 4, what: 'The review itself (always there, required)' },
    photo: { words: 'A photo of your puppy (optional)', kind: 'photo', what: 'A photo of their pup, on the review' },
    email: { words: 'Email (optional, for us only)', kind: 'email', max: 254, what: 'Their email, for her only' },
    phone: { words: 'Phone (optional, for us only)', kind: 'phone', max: 30, what: 'A phone number, for her only' },
    consent: { words: 'You may show this on your website with my first name and town.', fixed: true, kind: 'consent', what: 'Their consent to show it (always there, last, required)' },
  },
};

// Today's forms: these fields, in this order, these required.
const TODAY = {
  contact: [['name', true], ['email', true], ['phone', false], ['topic', false], ['message', true]],
  reviews: [['first_name', true], ['town', false], ['puppy_name', false], ['home_month', false], ['rating', true], ['quote', true], ['photo', false], ['consent', true]],
};
// The fields a review keeps on the review itself (stories' own columns); the rest
// are answers for her.
export const REVIEW_COLUMNS = new Set(['first_name', 'town', 'puppy_name', 'home_month', 'rating', 'quote', 'photo', 'consent']);

const str = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
export const isOwn = (key) => /^q-[a-z0-9-]{1,40}$/.test(String(key ?? ''));

// One form as the owner set it, every field present: [{ key, on, required, words,
// type?, options? }] in order. Fields she hasn't placed come after hers, off; fixed
// ones are always on and required; consent is always last.
export function cleanForm(which, list) {
  const fields = FIELDS[which];
  const given = Array.isArray(list) ? list : TODAY[which].map(([key, required]) => ({ key, on: true, required }));
  const seen = new Set();
  const out = [];
  let own = 0;
  for (const f of given) {
    const key = String(f?.key ?? '');
    if (seen.has(key)) continue;
    if (fields[key]) {
      seen.add(key);
      const d = fields[key];
      out.push({ key, on: d.fixed ? true : Boolean(f.on), required: d.fixed ? true : Boolean(f.required), words: str(f.words, d.kind === 'consent' ? 200 : WORDS_MAX) || null });
    } else if (isOwn(key) && own < OWN_MAX) {
      const type = Object.hasOwn(QUESTION_KINDS, f.type) ? f.type : 'text';
      const options = type === 'choice' ? [...new Set((Array.isArray(f.options) ? f.options : []).map((o) => str(o, OPTION_MAX)).filter(Boolean))].slice(0, OPTIONS_MAX) : null;
      seen.add(key);
      own++;
      out.push({ key, own: true, type, on: Boolean(f.on ?? true), required: Boolean(f.required), words: str(f.words, WORDS_MAX) || 'A question', ...(options ? { options } : {}) });
    }
  }
  for (const key of Object.keys(fields)) if (!seen.has(key)) out.push({ key, on: Boolean(fields[key].fixed), required: Boolean(fields[key].fixed), words: null });
  const consent = out.findIndex((f) => f.key === 'consent');
  if (consent >= 0) out.push(...out.splice(consent, 1));
  return out;
}

// The build's forms, as kept: only a form the owner has changed.
export function cleanForms(forms) {
  if (!forms || typeof forms !== 'object') return undefined;
  const out = {};
  for (const which of Object.keys(FORM_KINDS)) if (forms[which]) out[which] = cleanForm(which, forms[which]);
  return Object.keys(out).length ? out : undefined;
}

// What a form shows on her site (from a snapshot): its fields that are on, in order,
// each with its words, as drawn and as checked when it's sent.
export function formOf(snap, which) {
  const list = cleanForm(which, snap?.forms?.[which]);
  return list.filter((f) => f.on).map((f) => {
    const d = f.own ? { kind: f.type === 'paragraph' ? 'long' : f.type === 'choice' || f.type === 'yes_no' ? 'pick' : 'short', max: f.type === 'paragraph' ? 3000 : 200, rows: 4 } : FIELDS[which][f.key];
    let words = f.words || d.words;
    if (f.required) words = words.replace(/\s*\(optional\)$/i, '');
    return { ...d, ...f, words, name: f.own ? `q.${f.key}` : f.key };
  });
}

// Whether a form is today's (the owner hasn't changed it).
export const isToday = (which, list) => JSON.stringify(cleanForm(which, list)) === JSON.stringify(cleanForm(which, null));

// A new question's key, from its words.
export function ownKey(list, words) {
  const taken = new Set(list.map((f) => f.key));
  const base = `q-${slugify(words).slice(0, 30).replace(/-+$/, '') || 'question'}`;
  let key = base;
  for (let n = 2; taken.has(key); n++) key = `${base}-${n}`;
  return key;
}

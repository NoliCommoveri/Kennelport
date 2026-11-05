// The breeder's instructions (docs/Site_Builder_Plan.md, step 2, decision 19): every
// line of wording she reads in the Site Manager, as one list the owner edits. Each
// item has a key, the screen it's grouped under, where it appears, its default
// (today's wording: decision 14) and the names it may use ({kennel} everywhere;
// others where the screen has them, like {n} for a count).
//
// The owner's wording is set once for every site (the wording table) and can be
// changed per site (the site's build: wording); per template comes with templates
// (step 5). say() takes the site's, else every site's, else the default.
//
// The field labels and hints (forms.js LABELS, SHARED) and the choice words
// (ENUM_WORDS) stay where the forms are, and are listed here from there; the rest
// of the defaults are below. Not listed: the owner's own admin screens, and
// messages about KennelPort itself failing (a lost connection).
import { LABELS, SHARED, ENUM_WORDS } from './forms.js';

export class WordingError extends Error {}

// The screens, in the order the owner's editor lists them.
export const SCREENS = Object.freeze({
  home: 'Her home screen',
  notes: 'Saved, added, removed: the notes after a change',
  lists: 'Lists (dogs, litters, extras…)',
  fields: 'Every form: fields they share',
  site: 'Kennel details',
  dogs: 'A dog',
  health: 'A health result',
  partners: 'A partner kennel',
  litters: 'A litter',
  puppies: 'A puppy',
  reviews: 'A review',
  steps: 'A step (How it works)',
  expander: 'A policy, FAQ question or help section',
  extras: 'An extra',
  products: 'A recommended product',
  albums: 'An album',
  questions: 'An application question',
  homeblocks: 'Home page blocks',
  pages: 'Pages and wording',
  payment: 'How to pay',
  choices: 'Choices in lists',
});

// Which screen a form's kind belongs to.
const KIND_SCREEN = {
  site: 'site', dogs: 'dogs', partners: 'partners', health: 'health', litters: 'litters', puppies: 'puppies', reviews: 'reviews', steps: 'steps',
  expander: 'expander', extras: 'extras', products: 'products', albums: 'albums', questions: 'questions',
  hero: 'homeblocks', facts: 'homeblocks', story: 'homeblocks', waitlist: 'pages', pickup: 'pages', products_page: 'pages', about: 'pages', contact: 'pages',
  extras_page: 'pages', payment: 'payment', safe_notice: 'payment',
};
const KIND_WORDS = {
  hero: 'Top of the page', facts: 'Facts row', story: 'Story', waitlist: 'Waitlist page (and Home\'s waitlist band)', pickup: 'Getting your pup home page',
  products_page: 'Recommended products page', about: 'Our story page', contact: 'Contact page', extras_page: 'Extras page', payment: 'Application fee and deposit',
  safe_notice: 'Safe-payment notice',
};

// Her home screen (manage/index.js siteHome), the website's tiles and set-up list.
const HOME = {
  'home.status.draft': 'Not published yet',
  'home.status.live': 'Live',
  'home.status.suspended': 'Switched off by KennelPort',
  'home.unpublished': 'changes not published yet',
  'home.view': 'View my site',
  'home.preview': 'Preview changes',
  'home.share': 'Share',
  'home.publish': 'Publish',
  'home.review_publish': 'Review and publish',
  'home.needs': 'Needs you',
  'home.needs.messages.one': '{n} new message',
  'home.needs.messages.many': '{n} new messages',
  'home.needs.messages.note': 'In your inbox',
  'home.needs.site_messages.one': '{n} new message from your website',
  'home.needs.site_messages.many': '{n} new messages from your website',
  'home.needs.reviews.one': '{n} review to approve',
  'home.needs.reviews.many': '{n} reviews to approve',
  'home.needs.reviews.note': 'From families',
  'home.needs.leaving.one': '{n} litter leaving your site',
  'home.needs.leaving.many': '{n} litters leaving your site',
  'home.needs.leaving.note': 'Keep or remove',
  'home.tile.puppies': 'Puppies',
  'home.tile.puppies.note': 'Statuses at a glance',
  'home.tile.litters': 'Litters',
  'home.tile.litters.note': 'Planned, current, past',
  'home.tile.litters.leaving': '{n} leaving your site',
  'home.tile.photos': 'Photos and albums',
  'home.tile.photos.note': 'Camera roll, galleries',
  'home.tile.waitlist': 'Your waitlist',
  'home.tile.waitlist.note': 'Families in order, offer pups',
  'home.tile.waitlist.one': '{n} family waiting',
  'home.tile.waitlist.many': '{n} families waiting',
  'home.tile.inbox': 'Inbox',
  'home.tile.inbox.note': 'Messages from your site',
  'home.tile.dogs': 'Dogs',
  'home.tile.dogs.note': 'Cards, health results',
  'home.setup': 'Set up your site',
  'home.setup.note': 'Set once, change now and then.',
  'home.setup.pages': 'Pages and wording',
  'home.setup.pages.note': 'Home, about, policies, FAQ…',
  'home.setup.waitlist': 'Waitlist and application',
  'home.setup.waitlist.online': 'Linked to KennelOS, which takes your applications',
  'home.setup.waitlist.linked': 'Linked to KennelOS · your questions',
  'home.setup.waitlist.offered': 'Your questions, or link KennelOS',
  'home.setup.waitlist.note': 'Open or closed, your questions',
  'home.setup.payment': 'How to pay',
  'home.setup.payment.note': 'Fee, deposit, scam warning',
  'home.setup.extras': 'Extras',
  'home.setup.extras.note': 'Packages and prices',
  'home.setup.products': 'Recommended products',
  'home.setup.products.note': 'Referral links, codes, home badges',
  'home.setup.reviews': 'Reviews',
  'home.setup.reviews.note': 'Add or hide',
  'home.setup.details': 'Kennel details',
  'home.setup.details.note': 'Name, contact, town',
  'home.setup.kennelos': 'KennelOS',
  'home.setup.kennelos.linked': 'Linked · last update {date}',
  'home.setup.kennelos.waiting': 'Linked · no update yet',
  'home.setup.kennelos.note': 'Link your dogs and litters',
  'home.notifications': 'Notifications on this device',
  'home.account': 'Your site: storage, copy, delete',
  'home.role': 'Your role: {role}.',
  'home.other_sites': 'Your other sites',
  'home.signout': 'Sign out',
};
const HOME_WHERE = {
  'home.status.draft': 'Her site\'s status, before its first publish', 'home.status.live': 'Her site\'s status, once published',
  'home.status.suspended': 'Her site\'s status, when KennelPort has switched it off', 'home.unpublished': 'After the status, while there are changes to publish',
  'home.needs': 'Heading over what\'s waiting for her', 'home.setup.note': 'Set up your site: the line under its heading',
};

// The notes after a change (screens.js), by the note in the address.
const NOTES = {
  saved: 'Saved to your draft. Publish when you\'re ready.',
  not_saved: 'Not saved: one of the lines is too long.',
  added: 'Added to your draft.',
  removed: 'Removed from your draft.',
  moved: 'Moved.',
  status: 'Status changed in your draft.',
  uploaded: 'Photos added.',
  embedded: 'Added to your draft. It shows on your site after you publish.',
  tagged: 'Saved.',
  tagmany: 'Tagged.',
  tagnone: 'Nothing tagged: tick at least one photo, then choose who\'s in them.',
  deleted: 'Message deleted.',
  approved: 'Approved. It shows on your site after you publish.',
  declined: 'Declined and deleted.',
  published: 'Published. Visitors now see your changes.',
  listed: 'Added to your waitlist. It shows on your website now.',
  fulfilled: 'Marked fulfilled. Everyone below moved up.',
  back: 'Put back in its place.',
  listsaved: 'Saved. Your website shows it now.',
  unlisted: 'Deleted from your waitlist.',
  undone: 'Undone. Visitors see the version before.',
  kept: 'Kept. It stays as a past litter until you remove it.',
  litterremoved: 'Removed, with its puppies, albums and the photos nothing else uses.',
  matched: 'Matched. It now comes from KennelOS, with your photos and wording kept.',
  apart: 'Kept apart. KennelOS\'s one is added as new.',
  stopped: 'That device is no longer linked.',
  unlinked: 'Unlinked. Everything from KennelOS is now yours to edit here.',
};
export const NOTE_KEYS = Object.keys(NOTES);

// The lists (screens.js LISTS): what each is called, and its shared lines.
const LIST_TITLES = {
  dogs: ['Dogs', 'dog'], litters: ['Litters', 'litter'], puppies: ['Puppies', 'puppy'], health: ['Health results', 'result'], reviews: ['Reviews', 'review'],
  steps: ['How it works', 'step'], extras: ['Extras', 'extra'], partners: ['Partner kennels', 'kennel'], products: ['Recommended products', 'product'],
  policies: ['Policies', 'policy'], faq: ['FAQ', 'question'], waitlist_help: ['Using your status page', 'section'], albums: ['Albums', 'album'],
  questions: ['Application questions', 'question'],
};
const LISTS = {
  'list.empty': 'None yet.',
  'list.add': 'Add {one}',
  'list.new': 'New {one}',
  'list.save': 'Save',
  'list.error': 'Not saved: {error}',
};

// ---------- the catalog ----------

const items = new Map();
const add = (key, screen, where, text, vars = []) => items.set(key, { key, screen, where, text: text ?? '', vars: ['kennel', ...vars] });

// Where each line of her home screen sits, from its key: a tile, a set-up row, a
// button, and the lines that go with them.
const SUFFIX = {
  note: 'the line under it', one: 'its count, for one', many: 'its count, for more than one', leaving: 'while litters are leaving her site',
  online: 'while KennelOS takes her applications', linked: 'while linked to KennelOS', offered: 'when she could link KennelOS', waiting: 'linked, before the first update',
};
const NEEDS = { messages: 'new messages', site_messages: 'new messages from her website (with the family portal)', reviews: 'reviews to approve', leaving: 'litters leaving her site' };
function homeWhere(k, t) {
  if (HOME_WHERE[k]) return HOME_WHERE[k];
  const parts = k.split('.');
  const last = parts.at(-1);
  if (parts[1] === 'needs' && parts.length > 2) return `Needs you: ${NEEDS[parts[2]]}, ${SUFFIX[last] ?? 'its line'}`;
  const parent = SUFFIX[last] ? parts.slice(0, -1).join('.') : k;
  const name = HOME[parent] ?? t;
  const what = parts[1] === 'tile' ? `The "${name}" tile` : parts[1] === 'setup' && parent !== 'home.setup' ? `Set up your site: "${name}"` : parent === 'home.setup' ? 'Set up your site: its heading' : `"${name}"`;
  return parent === k ? (parts[1] === 'tile' || parts[1] === 'setup' ? what : `The ${name.includes('{') ? 'line' : 'button or line'} ${what}`) : `${what}: ${SUFFIX[last]}`;
}
for (const [k, t] of Object.entries(HOME)) add(k, 'home', homeWhere(k, t), t, [...t.matchAll(/\{(\w+)\}/g)].map((m) => m[1]));
for (const [k, t] of Object.entries(NOTES)) add(`note.${k}`, 'notes', 'At the top of the screen after the change', t);
for (const [k, [title, one]] of Object.entries(LIST_TITLES)) {
  add(`list.${k}.title`, 'lists', 'The list\'s heading', title);
  add(`list.${k}.one`, 'lists', 'One of them, as in "Add a dog" and "New dog"', one);
}
add('list.empty', 'lists', 'In a list with nothing in it yet', LISTS['list.empty']);
add('list.add', 'lists', 'The button under a list, and on a new one\'s form', LISTS['list.add'], ['one']);
add('list.new', 'lists', 'The heading of a new one\'s form', LISTS['list.new'], ['one']);
add('list.save', 'lists', 'The button on a form', LISTS['list.save']);
add('list.error', 'lists', 'When a form isn\'t saved, before what was wrong', LISTS['list.error'], ['error']);
for (const [n, [label, hint]] of Object.entries(SHARED)) {
  add(`f.${n}`, 'fields', `The "${label}" field, on every form that has it`, label);
  add(`f.${n}.hint`, 'fields', `The help under "${label}"`, hint);
}
for (const [kind, list] of Object.entries(LABELS)) {
  const screen = KIND_SCREEN[kind] ?? 'fields';
  const on = KIND_WORDS[kind] ? ` (${KIND_WORDS[kind]})` : '';
  for (const [n, [label, hint]] of Object.entries(list)) {
    add(`f.${kind}.${n}`, screen, `The "${label}" field${on}`, label);
    add(`f.${kind}.${n}.hint`, screen, `The help under "${label}"${on}`, hint);
  }
}
for (const [group, words] of Object.entries(ENUM_WORDS)) {
  if (group === 'scheme') continue; // the schemes' own names
  for (const [v, t] of Object.entries(words)) add(`c.${group}.${v}`, 'choices', `In the "${group.replace(/_/g, ' ')}" choices`, t);
}

export const CATALOG = items;
export const itemsOn = (screen) => [...items.values()].filter((x) => x.screen === screen);

// ---------- saying it ----------

const fill = (text, vars) => text.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m));

// A sayer: the wording for a site, with its names. say(key, vars) → text; a key the
// list doesn't have says itself, so a mistake shows instead of vanishing.
export function sayer({ every = {}, site = {} } = {}, names = {}) {
  const say = (key, vars = {}) => {
    const own = site[key] ?? every[key];
    const text = own ?? items.get(key)?.text ?? key;
    return fill(text, { ...names, ...vars });
  };
  // One or many: the key's .one or .many.
  say.n = (key, n, vars = {}) => say(`${key}.${n === 1 ? 'one' : 'many'}`, { n, ...vars });
  return say;
}
export const defaultSay = sayer();

// ---------- storing it ----------

export const WORDING_MAX = 600;

// One item's wording as the owner typed it: '' means "what it follows" (null);
// names it can't use are refused, saying which it can.
export function cleanWording(key, text) {
  const item = items.get(key);
  if (!item) throw new WordingError(`${key} isn't in the list.`);
  const t = String(text ?? '').replace(/\r\n?/g, '\n').trim();
  if (!t) return null;
  if (t.length > WORDING_MAX) throw new WordingError(`"${item.where}" is ${WORDING_MAX} characters at most.`);
  const bad = [...t.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).filter((v) => !item.vars.includes(v));
  if (bad.length) throw new WordingError(`"${item.where}" can't use {${bad[0]}}. It can use ${item.vars.map((v) => `{${v}}`).join(', ')}.`);
  return t;
}

// Every site's wording (the wording table).
export async function everyWording(env) {
  const { results } = await env.DB.prepare('SELECT key, text FROM wording').all();
  return Object.fromEntries(results.filter((r) => items.has(r.key)).map((r) => [r.key, r.text]));
}

export async function saveEveryWording(env, changes) {
  const now = new Date().toISOString();
  const s = [];
  for (const [key, text] of Object.entries(changes)) {
    const t = cleanWording(key, text);
    s.push(t == null || t === items.get(key).text ? env.DB.prepare('DELETE FROM wording WHERE key = ?').bind(key)
      : env.DB.prepare('INSERT INTO wording (key, text, updated_at) VALUES (?, ?, ?) ON CONFLICT (key) DO UPDATE SET text = excluded.text, updated_at = excluded.updated_at').bind(key, t, now));
  }
  if (s.length) await env.DB.batch(s);
}

// A site's own wording, in its build.
export const siteWording = (build) => Object.fromEntries(Object.entries(build?.wording ?? {}).filter(([k, v]) => items.has(k) && typeof v === 'string'));

// The build with a site's wording changed: '' (or the every-site wording) follows
// every site again.
export function withWording(build, changes, every = {}) {
  const next = structuredClone(build ?? {});
  const w = siteWording(next);
  for (const [key, text] of Object.entries(changes)) {
    const t = cleanWording(key, text);
    if (t == null || t === (every[key] ?? items.get(key).text)) delete w[key]; else w[key] = t;
  }
  if (Object.keys(w).length) next.wording = w; else delete next.wording;
  return next;
}

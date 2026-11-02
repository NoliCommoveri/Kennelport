// The simple waitlist (plan 3.8): a list a breeder without KennelOS keeps by hand.
// Families come from an application in the Inbox or are typed in; Offer pups opens
// her own email to them; Fulfilled takes them off and everyone below moves up.
// Positions are never stored: a family's place is its order among those waiting.
// Shown on the site live, as first name and last initial, only while the site has
// no KennelOS feed (KennelOS's list wins).

export class WaitlistError extends Error {}

export const OFFER_SUBJECT = "It's your turn to choose a puppy";
export const OFFER_MESSAGE = "It's your turn to choose a pup! Please review the available puppies on our website and reach out to us with your selection.";

const clean = (v, max, label, { required = false } = {}) => {
  const s = String(v ?? '').replace(/\s+/g, ' ').trim();
  if (required && !s) throw new WaitlistError(`Please fill in ${label}.`);
  if (s.length > max) throw new WaitlistError(`${label[0].toUpperCase()}${label.slice(1)} is too long (at most ${max} characters).`);
  return s || null;
};

// "Megan Ross" → "Megan R."; one word stays as it is. What the site shows.
export function listNameFor(name) {
  const words = String(name ?? '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (!words.length) return '';
  if (words.length === 1) return words[0].slice(0, 40);
  return `${words[0]} ${words.at(-1)[0].toUpperCase()}.`.slice(0, 40);
}

// Shown privately, as KennelOS does: the first name's first letter and an asterisk
// for each letter after it, then the last initial. "Andrea Kim" → "A***** K".
export function maskedNameFor(name) {
  const words = String(name ?? '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (!words.length) return '';
  const first = [...words[0]];
  const masked = `${first[0].toUpperCase()}${'*'.repeat(first.length - 1)}`;
  return (words.length > 1 ? `${masked} ${[...words.at(-1)][0].toUpperCase()}` : masked).slice(0, 40);
}

// The answer a family's "show my name privately" tick adds to their application.
export const PRIVATE_ANSWER = ['Show my name privately on the waitlist', 'Yes'];
export const wantsPrivate = (answers) => (answers ?? []).some(([q, a]) => q === PRIVATE_ANSWER[0] && a === 'Yes');

// A starting line for "what they want", from an application's answers: the short
// ones that say something ("Female", "Black & white"), not "Either", "Any color",
// "Yes" or "No". The breeder edits it before adding.
export function suggestWants(answers) {
  const skip = /^(either|any\b|no preference|yes|no)$|^any /i;
  return (answers ?? []).filter(([q]) => q !== PRIVATE_ANSWER[0]).map(([, a]) => String(a ?? '').trim())
    .filter((a) => a && a.length <= 30 && !a.includes('\n') && !skip.test(a)).slice(0, 3).join(' · ').slice(0, 120);
}

function check(input) {
  const name = clean(input.name, 80, 'their name', { required: true });
  const email = clean(input.email, 254, 'the email');
  if (email && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) throw new WaitlistError("That email address doesn't look right.");
  return {
    name,
    // Private: always the masked name, whatever was typed.
    list_name: input.private ? maskedNameFor(name) : clean(input.list_name, 40, 'the name on the list') ?? listNameFor(name),
    email,
    phone: clean(input.phone, 30, 'the phone number'),
    wants: clean(input.wants, 120, 'what they want'),
  };
}

export async function waiting(env, siteId) {
  const { results } = await env.DB.prepare("SELECT * FROM waitlist_entries WHERE site_id = ? AND status = 'waiting' ORDER BY sort, created_at").bind(siteId).all();
  return results.map((r, i) => ({ ...r, position: i + 1 }));
}

export async function fulfilled(env, siteId) {
  return (await env.DB.prepare("SELECT * FROM waitlist_entries WHERE site_id = ? AND status = 'fulfilled' ORDER BY done_at DESC LIMIT 100").bind(siteId).all()).results;
}

export const getEntry = (env, siteId, id) => env.DB.prepare('SELECT * FROM waitlist_entries WHERE id = ? AND site_id = ?').bind(id, siteId).first();

// What the site may show: place, the name on the list, what they want, when added.
export async function publicRows(env, siteId) {
  return (await waiting(env, siteId)).map((r) => ({ position: r.position, name: r.list_name, wants: r.wants, added: r.added_on }));
}

export async function addEntry(env, siteId, input, { inquiryId = null, today = new Date().toISOString().slice(0, 10) } = {}) {
  const e = check(input);
  const last = await env.DB.prepare('SELECT COALESCE(MAX(sort), 0) AS s FROM waitlist_entries WHERE site_id = ?').bind(siteId).first('s');
  const id = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO waitlist_entries (id, site_id, name, list_name, email, phone, wants, added_on, inquiry_id, status, sort, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'waiting', ?, ?)`)
    .bind(id, siteId, e.name, e.list_name, e.email, e.phone, e.wants, today, inquiryId, last + 1, new Date().toISOString()).run();
  return id;
}

export async function updateEntry(env, siteId, id, input) {
  const e = check(input);
  const added = clean(input.added_on, 10, 'the date added');
  if (added && !/^\d{4}-\d{2}-\d{2}$/.test(added)) throw new WaitlistError('Give the date added as a date.');
  await env.DB.prepare('UPDATE waitlist_entries SET name = ?, list_name = ?, email = ?, phone = ?, wants = ?, added_on = COALESCE(?, added_on) WHERE id = ? AND site_id = ?')
    .bind(e.name, e.list_name, e.email, e.phone, e.wants, added, id, siteId).run();
}

export async function setFulfilled(env, siteId, id, done) {
  await env.DB.prepare('UPDATE waitlist_entries SET status = ?, done_at = ? WHERE id = ? AND site_id = ?')
    .bind(done ? 'fulfilled' : 'waiting', done ? new Date().toISOString() : null, id, siteId).run();
}

export async function removeEntry(env, siteId, id) {
  await env.DB.prepare('DELETE FROM waitlist_entries WHERE id = ? AND site_id = ?').bind(id, siteId).run();
}

// One place up (-1) or down (+1) among those waiting: swap with the neighbour.
export async function moveEntry(env, siteId, id, dir) {
  const list = await waiting(env, siteId);
  const i = list.findIndex((r) => r.id === id);
  const j = i + (dir < 0 ? -1 : 1);
  if (i < 0 || j < 0 || j >= list.length) return;
  const [a, b] = [list[i], list[j]];
  const sa = a.sort === b.sort ? b.sort + (dir < 0 ? -0.5 : 0.5) : b.sort;
  await env.DB.batch([
    env.DB.prepare('UPDATE waitlist_entries SET sort = ? WHERE id = ?').bind(sa, a.id),
    env.DB.prepare('UPDATE waitlist_entries SET sort = ? WHERE id = ?').bind(a.sort, b.id),
  ]);
}

// Offer pups: her own email, filled in. → a mailto: address.
export function offerMailto(entry, { kennelName, siteUrl, message }) {
  const body = `Hi ${String(entry.name).split(' ')[0]},\n\n${message || OFFER_MESSAGE}\n\n${siteUrl ? `${siteUrl}\n\n` : ''}${kennelName ?? ''}`.trim();
  return `mailto:${encodeURIComponent(entry.email ?? '')}?subject=${encodeURIComponent(OFFER_SUBJECT)}&body=${encodeURIComponent(body)}`;
}

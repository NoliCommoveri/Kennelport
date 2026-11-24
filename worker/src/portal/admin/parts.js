// Small pieces the portal's admin screens share (portal/admin.js and the screens
// split out beside it): a redirect, the saved and error notes, a puppy's name, the
// Families filters, the suggested-change labels and the time zones. Their wording is
// the owner's (manage/wording-portal.js).
import { escapeHtml as esc } from '../../lib/html.js';
import { defaultSay } from '../../manage/wording.js';
import { UNDO_DAYS } from '../account.js';

export const SUGGEST_LABEL = { name: 'Family name', puppy_id: 'Puppy', puppy_name: 'Puppy', go_home_on: 'Go-home', pickup_booked_at: 'Pickup booked for', microchip: 'Microchip', registration_no: 'Registration number', vet_clinic: 'Vet\'s clinic', vet_doctor: 'Vet\'s name', vet_phone: 'Vet\'s phone', vet_address: 'Vet\'s address', pup_vet_clinic: 'Puppy\'s vet: clinic', pup_vet_doctor: 'Puppy\'s vet: name', pup_vet_phone: 'Puppy\'s vet: phone', pup_vet_address: 'Puppy\'s vet: address' };

// What a newer value from KennelOS is for, in the owner's words (psug.*).
export const suggestLabel = (field, say = defaultSay) => (Object.hasOwn(SUGGEST_LABEL, field) ? say(`psug.${field}`) : field);

export const redirect = (location) => new Response(null, { status: 303, headers: { location, 'cache-control': 'no-store' } });

// The notes after a change (wording: pnote.*), by the note= in the address.
export const NOTE_NAMES = ['added', 'saved', 'invited', 'pickedup', 'confirmed', 'notyet', 'accepted', 'record', 'removed', 'contract', 'deleted', 'undone', 'merged',
  'familymerged', 'gonenow', 'givenback', 'erased', 'sent', 'lossnote', 'losssent', 'extra', 'extraremoved', 'update', 'loss', 'suggested', 'stepadded', 'stepremoved', 'step'];

export const note = (url, say = defaultSay) => {
  const n = url.searchParams.get('note');
  return NOTE_NAMES.includes(n) ? `<p class="notice" role="status">${esc(say(`pnote.${n}`, { n: UNDO_DAYS }))}</p>` : '';
};

export const errorBox = (err, say = defaultSay) => (err ? `<p class="error" role="alert">${esc(say('perror.not_saved', { error: err }))}</p>` : '');

// A line of the owner's with a name that's drawn, not just written (an address in
// bold): her words escaped, then the drawn piece put in where the name was.
export function sayHtml(say, key, vars = {}, html = {}) {
  let out = esc(say(key, { ...vars, ...Object.fromEntries(Object.keys(html).map((k) => [k, `{${k}}`])) }));
  for (const [k, v] of Object.entries(html)) out = out.replaceAll(`{${k}}`, v);
  return out;
}

export const pupName = (p) => p.call_name || p.puppy_name;

export const ZONES = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu', 'America/Halifax', 'America/Toronto', 'America/Winnipeg', 'America/Edmonton', 'America/Vancouver'];

export const ZONE_NAMES = { 'America/New_York': 'Eastern', 'America/Chicago': 'Central', 'America/Denver': 'Mountain', 'America/Phoenix': 'Arizona', 'America/Los_Angeles': 'Pacific', 'America/Anchorage': 'Alaska', 'Pacific/Honolulu': 'Hawaii', 'America/Halifax': 'Atlantic (Halifax)', 'America/Toronto': 'Eastern (Toronto)', 'America/Winnipeg': 'Central (Winnipeg)', 'America/Edmonton': 'Mountain (Edmonton)', 'America/Vancouver': 'Pacific (Vancouver)' };

export function familyFilters(site, on, waitlistCount, say = defaultSay) {
  const base = `/s/${esc(site.subdomain)}/portal`;
  return `<nav class="filters" aria-label="Show">${[['puppy', base, say('pfam.puppy_families')], ['wait', `${base}?show=waitlist`, waitlistCount === null ? say('pfam.waitlist') : say('pfam.waitlist_n', { n: waitlistCount })]]
    .map(([k, href, label]) => `<a href="${href}"${k === on ? ' aria-current="page"' : ''}>${esc(label)}</a>`).join('')}</nav>`;
}

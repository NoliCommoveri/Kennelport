// Small pieces the portal's admin screens share (portal/admin.js and the screens
// split out beside it): a redirect, the saved and error notes, a puppy's name, the
// Families filters, the suggested-change labels and the time zones.
import { escapeHtml as esc } from '../../lib/html.js';

export const SUGGEST_LABEL = { name: 'Family name', puppy_id: 'Puppy', puppy_name: 'Puppy', go_home_on: 'Go-home', pickup_booked_at: 'Pickup booked for', microchip: 'Microchip', registration_no: 'Registration number', vet_clinic: 'Vet\'s clinic', vet_doctor: 'Vet\'s name', vet_phone: 'Vet\'s phone', vet_address: 'Vet\'s address' };

export const redirect = (location) => new Response(null, { status: 303, headers: { location, 'cache-control': 'no-store' } });

export const NOTES = {
  added: 'Family added. Send their invite when you\'re ready.',
  saved: 'Saved.',
  invited: 'Invite sent to every address.',
  pickedup: 'Marked picked up. The vet clock has started and the family has been emailed.',
  confirmed: 'Confirmed.',
  notyet: 'Clock stopped. Mark the real pickup when it happens.',
  accepted: 'Vet record accepted.',
  record: 'Record added.',
  removed: 'Record removed.',
  contract: 'Contract added. The family can see it under Records.',
  deleted: `Family deleted. Their portal is closed now; you can undo this for ${30} days.`,
  undone: 'Family brought back. They can sign in again.',
  erased: 'Their account is erased. Their sale records stay, under the name you know them by.',
  sent: 'Sent. They see it in the portal and by email.',
  lossnote: 'Saved. The family sees your note now.',
  losssent: 'Saved and emailed to the family.',
  extra: 'Extra added.',
  extraremoved: 'Extra removed.',
  update: 'Update saved and emailed to the family.',
  loss: 'Recorded. Their portal is now the quiet page; write your note to them below.',
  suggested: 'Suggested steps added. Change, reorder or remove any of them.',
  stepadded: 'Step added.',
  stepremoved: 'Step removed.',
  step: 'Saved. The family sees it.',
};

export const note = (url) => (NOTES[url.searchParams.get('note')] ? `<p class="notice" role="status">${esc(NOTES[url.searchParams.get('note')])}</p>` : '');

export const errorBox = (err) => (err ? `<p class="error" role="alert">Not saved: ${esc(err)}</p>` : '');

export const pupName = (p) => p.call_name || p.puppy_name;

export const ZONES = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu', 'America/Halifax', 'America/Toronto', 'America/Winnipeg', 'America/Edmonton', 'America/Vancouver'];

export const ZONE_NAMES = { 'America/New_York': 'Eastern', 'America/Chicago': 'Central', 'America/Denver': 'Mountain', 'America/Phoenix': 'Arizona', 'America/Los_Angeles': 'Pacific', 'America/Anchorage': 'Alaska', 'Pacific/Honolulu': 'Hawaii', 'America/Halifax': 'Atlantic (Halifax)', 'America/Toronto': 'Eastern (Toronto)', 'America/Winnipeg': 'Central (Winnipeg)', 'America/Edmonton': 'Mountain (Edmonton)', 'America/Vancouver': 'Pacific (Vancouver)' };

export function familyFilters(site, on, waitlistCount) {
  const base = `/s/${esc(site.subdomain)}/portal`;
  return `<nav class="filters" aria-label="Show">${[['puppy', base, 'Puppy families'], ['wait', `${base}?show=waitlist`, `Waitlist${waitlistCount === null ? '' : ` (${waitlistCount})`}`]]
    .map(([k, href, label]) => `<a href="${href}"${k === on ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav>`;
}

// Timing, in the owner's build tools (GET/POST /admin/<sub>/timing, routed by
// manage/builder.js): a row per timing rule (content/rules.js DEFAULT_TIMING), each
// with its default; and, on a site with the family portal, the portal's rules
// (portal/timing.js PORTAL_TIMING, site-builder step 6).
import { escapeHtml as esc } from '../../lib/html.js';
import { DEFAULT_TIMING } from '../../content/rules.js';
import { PORTAL_TIMING, PORTAL_TIMING_FIELDS } from '../../portal/timing.js';
import { back } from './controls.js';

export const TIMING_ROWS = [
  ['litter_days', 'A litter off the site is deleted after', 'Unless the breeder taps Keep', 'days'],
  ['older_after', 'An available pup becomes an older puppy', 'Counted from its going-home date', 'days after'],
  ['deposits_after', '“Available on {date}” becomes “Available”', 'Counted from the litter’s deposits date', 'days after'],
];

// The family portal's, in the order a placement meets them.
export const PORTAL_TIMING_ROWS = [
  ['checklist_days_before', 'The go-home checklist shows on Home from', 'Until pickup; with no go-home date, it shows all along', 'days before'],
  ['book_days_before', 'The vet booking reminder goes out', 'Before go-home, while no visit is booked', 'days before'],
  ['book_hour', 'The booking reminder goes out at', 'Her time zone, 0 to 23', 'o\'clock'],
  ['morning_hour', 'The deadline day\'s reminder goes out at', 'The morning of the vet deadline, her time', 'o\'clock'],
  ['trouble_hours', 'A vet visit not booked shows red with', 'On her Today and Families screens', 'hours left'],
  ['vet_tab_hours', 'The families\' Vet visit tab stays', 'After the deadline, with no record in', 'hours after'],
  ['stay_starts_weeks', 'An extended stay starts at', 'The puppy\'s age, unless she sets the first day', 'weeks old'],
  ['overdue_days', 'An unticked timeline task reads Overdue for', 'After its day; then it reads Past', 'days'],
  ['potty_until_weeks', 'The potty schedule is in Quick links until', 'The puppy\'s age; after that it\'s under Records', 'weeks old'],
];

const rowOf = (part, values, defaults, bounds = {}) => ([k, lab, sub, unit]) => `<div class="inl"><label class="lab" for="t-${part}-${k}">${esc(lab)}<small>${esc(sub)}</small></label><input type="number" inputmode="numeric" min="${bounds[k]?.min ?? 0}"${bounds[k] ? ` max="${bounds[k].max}"` : ''} name="${part}.${k}" id="t-${part}-${k}" value="${esc(values[k])}">
    <span class="dfl">${esc(unit)} · default ${esc(defaults[k])}${values[k] !== defaults[k] ? ` <span class="chg">changed</span> ${back(`${part}.${k}`)}` : ''}</span></div>`;

export function timingScreen(site, timing, error, portal = PORTAL_TIMING) {
  return `<div class="stack">${error ? `<p class="error" role="alert">${esc(error)}</p>` : ''}
    <div class="twocol"><section class="card"><div class="fgroup"><h2>Website</h2>${TIMING_ROWS.map(rowOf('timing', timing, DEFAULT_TIMING)).join('')}</div></section>
    ${site.portal_on ? `<section class="card band"><div class="fgroup"><h2>Family portal</h2><p class="small">Takes effect as soon as it's saved: the portal has nothing to publish. The vet deadline itself follows her contract, in her Portal settings.</p>${PORTAL_TIMING_ROWS.map(rowOf('portal_timing', portal, PORTAL_TIMING, PORTAL_TIMING_FIELDS)).join('')}</div></section>` : ''}</div></div>`;
}

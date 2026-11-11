// Timing, in the owner's build tools (GET/POST /admin/<sub>/timing, routed by
// manage/builder.js): a row per timing rule (content/rules.js DEFAULT_TIMING), each
// with its default.
import { escapeHtml as esc } from '../../lib/html.js';
import { DEFAULT_TIMING } from '../../content/rules.js';
import { back } from './controls.js';

export const TIMING_ROWS = [
  ['litter_days', 'A litter off the site is deleted after', 'Unless the breeder taps Keep', 'days'],
  ['older_after', 'An available pup becomes an older puppy', 'Counted from its going-home date', 'days after'],
  ['deposits_after', '“Available on {date}” becomes “Available”', 'Counted from the litter’s deposits date', 'days after'],
];

export function timingScreen(site, timing, error) {
  const row = ([k, lab, sub, unit]) => `<div class="inl"><label class="lab" for="t-${k}">${esc(lab)}<small>${esc(sub)}</small></label><input type="number" inputmode="numeric" min="0" name="timing.${k}" id="t-${k}" value="${esc(timing[k])}">
    <span class="dfl">${esc(unit)} · default ${esc(DEFAULT_TIMING[k])}${timing[k] !== DEFAULT_TIMING[k] ? ` <span class="chg">changed</span> ${back(`timing.${k}`)}` : ''}</span></div>`;
  return `<div class="stack">${error ? `<p class="error" role="alert">${esc(error)}</p>` : ''}
    <div class="twocol"><section class="card"><div class="fgroup"><h2>Website</h2>${TIMING_ROWS.map(row).join('')}</div></section>
    ${site.portal_on ? '<section class="card band"><div class="fgroup"><h2>Family portal</h2><p class="small">Its timing (the vet reminders, stays, invites and the rest) comes with the portal\'s build, step 4.</p></div></section>' : ''}</div></div>`;
}

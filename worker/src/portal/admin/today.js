// The Families and Portal tabs' lists, and the portal's part of Today (plan 7.3,
// build chunk 6): vet visits coming up, families' recent activity, the waitlist's
// count and part, and setting the portal up. Routed by portal/admin.js; Today's
// lists are read by manage/index.js too.
import { escapeHtml as esc } from '../../lib/html.js';
import { vetStatus, formatAt, timeLeft, clockRunning, formatDay, VET_RULES } from '../vet.js';
import { roundPhoto } from '../../manage/hub.js';
import { pupName, familyFilters } from './parts.js';
import { getSettings, listFamilies } from '../store.js';

// Vet visits: each placement's status in words and time left; red only in trouble.
// Vet visits: each placement with its status in words, red only when in trouble.
export function vetVisits(site, families, s, now = new Date()) {
  const rows = families.filter((f) => f.placement_id && f.status === 'open' && f.life_status === 'with_family');
  if (!rows.length) return '<section class="card" id="vet-visits"><h2>Vet visits</h2><p class="muted">None running. The clock starts when you mark a puppy picked up.</p></section>';
  return `<section class="card" id="vet-visits"><h2>Vet visits</h2><ul class="list">${rows.map((f) => {
    const v = vetStatus(f, now);
    const tone = v.trouble ? 'bad' : v.word === 'Accepted' ? 'ok' : v.word === 'Record uploaded' ? 'next' : v.word === 'Not booked' && clockRunning(f) ? 'warn' : '';
    const running = f.vet_deadline_at && clockRunning(f);
    const when = running ? `Due ${formatAt(f.vet_deadline_at, s.time_zone, { weekday: false })}${Date.parse(f.vet_deadline_at) > now.getTime() && !f.proof_uploaded_at ? ` · ${timeLeft(f.vet_deadline_at, now)} left` : ''}`
      : f.pickup_booked_at ? `Clock starts at pickup, ${formatAt(f.pickup_booked_at, s.time_zone, { weekday: false })}` : 'Clock starts at pickup';
    return `<li>${roundPhoto(site.subdomain, f.photo_id, pupName(f))}<span class="grow"><a class="rowlink" href="/s/${esc(site.subdomain)}/portal/f/${esc(f.id)}"><b>${esc(pupName(f))}</b></a> · <span class="small">${esc(f.name)}</span><br><span class="small muted">${esc(when)}</span></span><span class="st${tone ? ` ${tone}` : ''}">${esc(v.word)}</span></li>`;
  }).join('')}</ul></section>`;
}

// Activity: what families did (ticks, uploads, bookings, programs), not page views.
export const ACTIVITY = { checklist: 'ticked', task: 'marked done', vet_booked_at: 'booked the vet visit', vet_booked_for: null, vet_clinic: null, proof_uploaded_at: 'uploaded the vet record', proof_file_id: null, program: 'program', account_erased: 'erased their account' };

export async function activity(env, site, s, now = new Date()) {
  const { results } = await env.DB.prepare(`SELECT h.field, h.new_value, h.changed_at, f.id AS family_id, f.name FROM portal_history h
    JOIN portal_placements p ON p.id = h.row_id AND h.tbl = 'portal_placements' JOIN portal_families f ON f.id = p.family_id
    WHERE h.site_id = ? AND h.changed_by = 'family' AND h.changed_at > ? AND h.new_value IS NOT NULL AND f.status = 'active' AND f.deleted_at IS NULL
    ORDER BY h.id DESC LIMIT 60`).bind(site.id, new Date(now.getTime() - 14 * 86400000).toISOString()).all();
  const rows = results.filter((h) => ACTIVITY[h.field]).slice(0, 15);
  const what = (h) => (h.field === 'checklist' || h.field === 'task' ? `${ACTIVITY[h.field]} ${h.new_value}` : h.field === 'program' ? h.new_value : ACTIVITY[h.field]);
  return `<section class="card" id="activity"><h2>Recent activity</h2>${rows.length
    ? `<ul class="list">${rows.map((h) => `<li><span class="grow"><a class="rowlink" href="/s/${esc(site.subdomain)}/portal/f/${esc(h.family_id)}"><b>${esc(h.name)}</b></a><br><span class="small">${esc(what(h)).replace(/^./, (c) => c.toUpperCase())}</span></span><span class="small muted">${esc(formatAt(h.changed_at, s.time_zone, { weekday: false }))}</span></li>`).join('')}</ul>`
    : '<p class="muted">What families do in their portal (ticks, bookings, uploads) shows here for two weeks.</p>'}</section>`;
}

// Today's lower half (the prototype's): vet visits beside recent activity.
export async function todayLists(env, site, now = new Date()) {
  const s = await getSettings(env, site.id);
  const families = await listFamilies(env, site.id);
  return `<div class="cols">${vetVisits(site, families, s, now)}${await activity(env, site, s, now)}</div>`;
}

// The Waitlist side of Families: the website's list, in order (offering a puppy stays in KennelOS).
export async function waitlistCount(env, site) {
  const linked = await env.DB.prepare('SELECT 1 FROM links WHERE site_id = ? AND revoked_at IS NULL LIMIT 1').bind(site.id).first();
  if (linked) return { linked: true, n: null };
  return { linked: false, n: await env.DB.prepare("SELECT COUNT(*) AS n FROM waitlist_entries WHERE site_id = ? AND status = 'waiting'").bind(site.id).first('n') };
}

export async function waitlistPart(env, site, kennel, w) {
  const sub = esc(site.subdomain);
  if (w.linked) {
    return `<span class="eyebrow">${esc(kennel)}</span><h1>Families</h1>${familyFilters(site, 'wait', null)}
      <section class="card band" id="waitlist"><h2>Waitlist</h2><p>Your waitlist is in KennelOS. When a family's contract is signed there, they arrive under Puppy families to invite.</p></section>`;
  }
  const { results } = await env.DB.prepare("SELECT id, name, wants, added_on FROM waitlist_entries WHERE site_id = ? AND status = 'waiting' ORDER BY sort LIMIT 100").bind(site.id).all();
  return `<span class="eyebrow">${esc(kennel)}</span><h1>Families</h1>${familyFilters(site, 'wait', w.n)}
    <section class="card" id="waitlist"><div class="between"><h2>Waitlist</h2><a class="button small" href="/s/${sub}/waitlist">Your waitlist</a></div>
    ${results.length ? `<ul class="list">${results.map((x, i) => `<li><span class="grow"><b>${i + 1}. ${esc(x.name)}</b><br><span class="small muted">${x.wants ? `${esc(x.wants)} · ` : ''}on the list since ${esc(formatDay(x.added_on))}</span></span></li>`).join('')}</ul>`
      : '<p class="muted">No families waiting.</p>'}</section>
    <p class="small muted">The same list your website's Waitlist page shows. When a family signs their contract, add them as a puppy family and send their invite.</p>`;
}

export function setupScreen(site, s) {
  const b = `/s/${esc(site.subdomain)}/portal`;
  const item = (href, label, note) => `<li class="item"><a href="${href}"><b>${esc(label)}</b><span>${esc(note)}</span></a></li>`;
  return `<section class="card"><h1>What families see</h1><p class="muted small">Families sign in at <strong>${esc(site.portalUrl)}</strong>.</p></section>
    <ul class="items">
      ${item(`${b}/settings`, 'Portal settings', `Vet visit (${VET_RULES[s.vet_rule].toLowerCase()}), contacts, the food, programs, extras`)}
      ${item(`${b}/checklist`, 'Go-home checklist', 'What every family has ready')}
      ${item(`${b}/timeline`, 'First-weeks timeline', 'Tasks dated from birth or pickup')}
      ${item(`${b}/settings#programs`, 'Programs and where they show', 'Your recommended products, as families see them')}
      ${item(`/s/${esc(site.subdomain)}/lists/extras`, 'Extras', 'The catalog; how the portal delivers each is in Portal settings')}
    </ul>`;
}

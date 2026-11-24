// The Families and Portal tabs' lists, and the portal's part of Today (plan 7.3,
// build chunk 6): vet visits coming up, families' recent activity, the waitlist's
// count and part, and setting the portal up. Routed by portal/admin.js; Today's
// lists are read by manage/index.js too. Their wording is the owner's
// (manage/wording-portal.js).
import { escapeHtml as esc } from '../../lib/html.js';
import { vetStatus, formatAt, timeLeft, clockRunning, formatDay, VET_RULES } from '../vet.js';
import { roundPhoto } from '../../manage/hub.js';
import { pupName, familyFilters, sayHtml } from './parts.js';
import { getSettings, listFamilies } from '../store.js';
import { defaultSay } from '../../manage/wording.js';

// Vet visits: each placement with its status in words and time left, red only when in trouble.
export function vetVisits(site, families, s, now = new Date(), say = defaultSay) {
  const rows = families.filter((f) => f.placement_id && f.status === 'open' && f.life_status === 'with_family');
  if (!rows.length) return `<section class="card" id="vet-visits"><h2>${esc(say('ptoday.visits_title'))}</h2><p class="muted">${esc(say('ptoday.visits_none'))}</p></section>`;
  return `<section class="card" id="vet-visits"><h2>${esc(say('ptoday.visits_title'))}</h2><ul class="list">${rows.map((f) => {
    const v = vetStatus(f, now);
    const tone = v.trouble ? 'bad' : v.word === 'Accepted' ? 'ok' : v.word === 'Record uploaded' ? 'next' : v.word === 'Not booked' && clockRunning(f) ? 'warn' : '';
    const running = f.vet_deadline_at && clockRunning(f);
    const time = running ? formatAt(f.vet_deadline_at, s.time_zone, { weekday: false }) : null;
    const when = running ? (Date.parse(f.vet_deadline_at) > now.getTime() && !f.proof_uploaded_at ? say('ptoday.visit_due_left', { time, left: timeLeft(f.vet_deadline_at, now) }) : say('ptoday.visit_due', { time }))
      : f.pickup_booked_at ? say('ptoday.visit_starts_at', { time: formatAt(f.pickup_booked_at, s.time_zone, { weekday: false }) }) : say('ptoday.visit_starts');
    return `<li>${roundPhoto(site.subdomain, f.photo_id, pupName(f))}<span class="grow"><a class="rowlink" href="/s/${esc(site.subdomain)}/portal/f/${esc(f.id)}"><b>${esc(pupName(f))}</b></a> · <span class="small">${esc(f.name)}</span><br><span class="small muted">${esc(when)}</span></span><span class="st${tone ? ` ${tone}` : ''}">${esc(v.word)}</span></li>`;
  }).join('')}</ul></section>`;
}

// Activity: what families did (ticks, uploads, bookings, programs), not page views. A
// program's line is its own status words; the rest are the owner's (pactivity.*).
export const ACTIVITY = new Set(['checklist', 'task', 'vet_booked_at', 'proof_uploaded_at', 'program', 'account_erased']);

export async function activity(env, site, s, now = new Date(), say = defaultSay) {
  const { results } = await env.DB.prepare(`SELECT h.field, h.new_value, h.changed_at, f.id AS family_id, f.name FROM portal_history h
    JOIN portal_placements p ON p.id = h.row_id AND h.tbl = 'portal_placements' JOIN portal_families f ON f.id = p.family_id
    WHERE h.site_id = ? AND h.changed_by = 'family' AND h.changed_at > ? AND h.new_value IS NOT NULL AND f.status = 'active' AND f.deleted_at IS NULL
    ORDER BY h.id DESC LIMIT 60`).bind(site.id, new Date(now.getTime() - 14 * 86400000).toISOString()).all();
  const rows = results.filter((h) => ACTIVITY.has(h.field)).slice(0, 15);
  const what = (h) => (h.field === 'program' ? h.new_value.replace(/^./, (c) => c.toUpperCase()) : say(`pactivity.${h.field}`, { item: h.new_value }));
  return `<section class="card" id="activity"><h2>${esc(say('ptoday.activity_title'))}</h2>${rows.length
    ? `<ul class="list">${rows.map((h) => `<li><span class="grow"><a class="rowlink" href="/s/${esc(site.subdomain)}/portal/f/${esc(h.family_id)}"><b>${esc(h.name)}</b></a><br><span class="small">${esc(what(h))}</span></span><span class="small muted">${esc(formatAt(h.changed_at, s.time_zone, { weekday: false }))}</span></li>`).join('')}</ul>`
    : `<p class="muted">${esc(say('ptoday.activity_none'))}</p>`}</section>`;
}

// Today's lower half (the prototype's): vet visits beside recent activity.
export async function todayLists(env, site, say = defaultSay, now = new Date()) {
  const s = await getSettings(env, site.id);
  const families = await listFamilies(env, site.id);
  return `<div class="cols">${vetVisits(site, families, s, now, say)}${await activity(env, site, s, now, say)}</div>`;
}

// The Waitlist side of Families: the website's list, in order (offering a puppy stays in KennelOS).
export async function waitlistCount(env, site) {
  const linked = await env.DB.prepare('SELECT 1 FROM links WHERE site_id = ? AND revoked_at IS NULL LIMIT 1').bind(site.id).first();
  if (linked) return { linked: true, n: null };
  return { linked: false, n: await env.DB.prepare("SELECT COUNT(*) AS n FROM waitlist_entries WHERE site_id = ? AND status = 'waiting'").bind(site.id).first('n') };
}

export async function waitlistPart(env, site, kennel, w, say = defaultSay) {
  const sub = esc(site.subdomain);
  const top = `<span class="eyebrow">${esc(kennel)}</span><h1>${esc(say('pfam.title'))}</h1>`;
  if (w.linked) {
    return `${top}${familyFilters(site, 'wait', null, say)}
      <section class="card band" id="waitlist"><h2>${esc(say('pwait.title'))}</h2><p>${esc(say('pwait.linked'))}</p></section>`;
  }
  const { results } = await env.DB.prepare("SELECT id, name, wants, added_on FROM waitlist_entries WHERE site_id = ? AND status = 'waiting' ORDER BY sort LIMIT 100").bind(site.id).all();
  return `${top}${familyFilters(site, 'wait', w.n, say)}
    <section class="card" id="waitlist"><div class="between"><h2>${esc(say('pwait.title'))}</h2><a class="button small" href="/s/${sub}/waitlist">${esc(say('pwait.button'))}</a></div>
    ${results.length ? `<ul class="list">${results.map((x, i) => `<li><span class="grow"><b>${i + 1}. ${esc(x.name)}</b><br><span class="small muted">${x.wants ? `${esc(x.wants)} · ` : ''}${esc(say('pwait.since', { day: formatDay(x.added_on) }))}</span></span></li>`).join('')}</ul>`
      : `<p class="muted">${esc(say('pwait.none'))}</p>`}</section>
    <p class="small muted">${esc(say('pwait.line'))}</p>`;
}

export function setupScreen(site, s, say = defaultSay) {
  const b = `/s/${esc(site.subdomain)}/portal`;
  const item = (href, label, note) => `<li class="item"><a href="${href}"><b>${esc(label)}</b><span>${esc(note)}</span></a></li>`;
  return `<section class="card"><h1>${esc(say('psetup.title'))}</h1><p class="muted small">${sayHtml(say, 'psetup.line', {}, { address: `<strong>${esc(site.portalUrl)}</strong>` })}</p></section>
    <ul class="items">
      ${item(`${b}/settings`, say('psetup.settings'), say('psetup.settings_note', { rule: VET_RULES[s.vet_rule].toLowerCase() }))}
      ${item(`${b}/checklist`, say('psetup.checklist'), say('psetup.checklist_note'))}
      ${item(`${b}/timeline`, say('psetup.timeline'), say('psetup.timeline_note'))}
      ${item(`${b}/handbook`, say('handbook.item'), say('handbook.item_note'))}
      ${item(`${b}/bag`, say('bag.item'), say('bag.item_note'))}
      ${item(`${b}/settings#programs`, say('psetup.programs'), say('psetup.programs_note'))}
      ${item(`/s/${esc(site.subdomain)}/lists/extras`, say('psetup.extras'), say('psetup.extras_note'))}
    </ul>`;
}

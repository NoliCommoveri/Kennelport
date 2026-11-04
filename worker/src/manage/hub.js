// Her Site Manager as one app for the website and the puppy portal
// (docs/Puppy_Parent_Portal_Plan.md section 7.3; build chunk 6), on sites with the
// portal on. Five tabs (Reports comes with phase 2), along the bottom on a phone and
// down the side on a computer:
//
//   Today     /s/<sub>          what needs her from both sides
//   Families  /s/<sub>/portal   puppy families, vet visits, activity, the waitlist
//   Dogs      /s/<sub>/kennel   dogs, litters and puppies, one record each, used by both
//   Website   /s/<sub>/website  publish, inbox, photos, pages (today's screens)
//   Portal    /s/<sub>/portal/setup  what families see: settings, lists, programs, extras
//
// Sites without the portal keep the one home screen they have.
import { escapeHtml as esc } from '../lib/html.js';
import { getSettings } from '../portal/store.js';
import { formatAt, formatDay, localParts, vetStatus } from '../portal/vet.js';
import { updatesDue } from '../portal/stays.js';
import { STATUS_TEXT } from '../render/parts.js';

const DAY = 86400000;

export const TABS = [
  ['today', '', 'Today', 'home'],
  ['families', '/portal', 'Families', 'people'],
  ['dogs', '/kennel', 'Dogs', 'paw'],
  ['website', '/website', 'Website', 'pages'],
  ['portal', '/portal/setup', 'Portal', 'list'],
];

export function nav(sub, current) {
  return `<nav class="apptabs" aria-label="Site Manager">${TABS.map(([key, path, label, icon]) => `<a href="/s/${esc(sub)}${path}"${key === current ? ' aria-current="page"' : ''}><svg class="i" aria-hidden="true"><use href="#i-${icon}"/></svg><span>${label}</span></a>`).join('')}</nav>`;
}

// Today: puppies going home in the next 7 days, each with its pickup time, whether
// the vet visit is booked, and Mark picked up (the main action on the day itself).
export async function goingHome(env, site, now = new Date()) {
  const s = await getSettings(env, site.id);
  const today = localParts(now, s.time_zone).ymd;
  const { results } = await env.DB.prepare(`SELECT p.*, f.name AS family FROM portal_placements p JOIN portal_families f ON f.id = p.family_id
    WHERE p.site_id = ? AND p.status = 'open' AND p.life_status = 'with_family' AND p.picked_up_at IS NULL AND p.pickup_state != 'not_yet'
      AND f.status = 'active' AND f.deleted_at IS NULL AND (p.pickup_booked_at IS NOT NULL OR p.go_home_on IS NOT NULL)`).bind(site.id).all();
  const soon = results.map((p) => ({ ...p, day: p.pickup_booked_at ? localParts(p.pickup_booked_at, s.time_zone).ymd : p.go_home_on }))
    .filter((p) => p.day <= new Date(Date.parse(`${today}T12:00:00Z`) + 7 * DAY).toISOString().slice(0, 10))
    .sort((a, b) => a.day.localeCompare(b.day));
  if (!soon.length) return '';
  const base = `/s/${esc(site.subdomain)}/portal/f`;
  return `<section class="card" id="going-home"><h2>Going home this week</h2><ul class="items">${soon.map((p) => {
    const name = p.call_name || p.puppy_name;
    const when = p.pickup_booked_at ? formatAt(p.pickup_booked_at, s.time_zone) : `${formatDay(p.go_home_on)}, no time booked`;
    const isToday = p.day <= today;
    return `<li class="item going"><a href="${base}/${esc(p.family_id)}"><b>${esc(name)} · ${esc(p.family)}</b><span>${esc(when)} · vet visit ${p.vet_booked_at ? 'booked' : 'not booked yet'}</span></a>
      ${isToday ? `<form method="post" action="${base}/${esc(p.family_id)}/picked-up"><button class="primary">Mark picked up</button></form>` : ''}</li>`;
  }).join('')}</ul></section>`;
}

export async function lastFromKennelos(env, site, now = new Date()) {
  const at = await env.DB.prepare('SELECT portal_feed_at FROM sites WHERE id = ?').bind(site.id).first('portal_feed_at');
  if (!at) return '';
  const m = Math.round((now.getTime() - Date.parse(at)) / 60000);
  const ago = m < 2 ? 'just now' : m < 60 ? `${m} minutes ago` : m < 36 * 60 ? `${Math.round(m / 60)} hours ago` : `${Math.round(m / 1440)} days ago`;
  return `<p class="muted small">Last from KennelOS: ${esc(ago)}</p>`;
}

// Dogs: each litter's puppies with their family, go-home, extras and website
// status; Write this week's update for a stay puppy; and the screens for each.
export async function dogsTab(env, site, now = new Date()) {
  const s = await getSettings(env, site.id);
  const sub = esc(site.subdomain);
  const { results: litters } = await env.DB.prepare(`SELECT id, name, born_on, ready_on, stage FROM litters WHERE site_id = ? AND left_site_at IS NULL
    ORDER BY stage = 'past', COALESCE(born_on, created_at) DESC LIMIT 12`).bind(site.id).all();
  const { results: pups } = await env.DB.prepare(`SELECT pu.id, pu.name, pu.status, pu.litter_id,
      pl.id AS placement_id, pl.family_id, pl.go_home_on, pl.pickup_booked_at, pl.picked_up_at, pl.vet_deadline_at, pl.vet_booked_at, pl.proof_uploaded_at, pl.proof_accepted_at, pl.pickup_state, pl.call_name,
      f.name AS family,
      (SELECT GROUP_CONCAT(name, ', ') FROM portal_placement_extras x WHERE x.placement_id = pl.id AND x.confirmed_at IS NOT NULL) AS extras
    FROM puppies pu LEFT JOIN portal_placements pl ON pl.puppy_id = pu.id AND pl.status = 'open'
      LEFT JOIN portal_families f ON f.id = pl.family_id AND f.status = 'active' AND f.deleted_at IS NULL
    WHERE pu.site_id = ? ORDER BY pu.sort, pu.name`).bind(site.id).all();
  const due = new Set((await updatesDue(env, site.id, s.time_zone, now)).map((x) => x.placement_id));
  const stays = new Set((await env.DB.prepare("SELECT placement_id FROM portal_placement_extras WHERE site_id = ? AND delivery = 'stay' AND confirmed_at IS NOT NULL").bind(site.id).all()).results.map((r) => r.placement_id));
  const card = (p) => {
    const bits = [STATUS_TEXT[p.status] ?? 'Hidden on the website'];
    if (p.family) {
      bits.push(p.family);
      if (p.picked_up_at) bits.push(`went home ${formatAt(p.picked_up_at, s.time_zone, { weekday: false })}`, `vet: ${vetStatus(p, now).word.toLowerCase()}`);
      else if (p.pickup_booked_at) bits.push(`going home ${formatAt(p.pickup_booked_at, s.time_zone, { weekday: false })}`);
      else if (p.go_home_on) bits.push(`going home ${formatDay(p.go_home_on)}`);
      if (p.extras) bits.push(p.extras);
    }
    const stayLink = p.placement_id && stays.has(p.placement_id) && !p.picked_up_at
      ? `<a class="button${due.has(p.placement_id) ? ' primary' : ''}" href="/s/${sub}/portal/f/${esc(p.family_id)}#stay">${due.has(p.placement_id) ? 'Write this week\'s update' : 'Stay updates'}</a>` : '';
    return `<li class="item"><a href="${p.family_id ? `/s/${sub}/portal/f/${esc(p.family_id)}` : `/s/${sub}/puppies`}"><b>${esc(p.call_name && p.call_name !== p.name ? `${p.call_name} (${p.name})` : p.name)}</b><span>${esc(bits.join(' · '))}</span></a>${stayLink}</li>`;
  };
  const sections = litters.map((l) => {
    const list = pups.filter((p) => p.litter_id === l.id);
    return `<section class="card"><h2>${esc(l.name)}</h2><p class="muted small">${l.born_on ? `Born ${esc(formatDay(l.born_on))}` : 'Not born yet'}${l.ready_on ? ` · ready ${esc(formatDay(l.ready_on))}` : ''}</p>
      ${list.length ? `<ul class="items">${list.map(card).join('')}</ul>` : '<p class="muted small">No puppies listed yet.</p>'}</section>`;
  }).join('');
  return `${sections || '<section class="card"><p class="muted">No litters yet.</p></section>'}
    <ul class="items"><li class="item"><a href="/s/${sub}/dogs"><b>Your dogs</b><span>Cards, health results</span></a></li>
      <li class="item"><a href="/s/${sub}/litters"><b>Litters</b><span>Planned, current, past</span></a></li>
      <li class="item"><a href="/s/${sub}/puppies"><b>Puppies</b><span>Website statuses at a glance</span></a></li></ul>`;
}

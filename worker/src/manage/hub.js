// Her Site Manager as one app for the website and the puppy portal
// (docs/plans/family-portal.md section 7.3; build chunk 6), on sites with the
// portal on. Five tabs (Reports comes with phase 2), along the bottom on a phone and
// down the side on a computer:
//
//   Today     /s/<sub>          what needs her from both sides
//   Families  /s/<sub>/portal   puppy families, vet visits, activity, the waitlist
//   Dogs      /s/<sub>/kennel   dogs, litters and puppies, one record each, used by both
//   Website   /s/<sub>/website  publish, inbox, photos, pages (today's screens)
//   Portal    /s/<sub>/portal/setup  what families see: settings, lists, programs, extras
//
// Sites without the portal keep the one home screen they have. The wording is the
// owner's (manage/wording-portal.js ptab.*, phome.*, pdogs.*).
import { escapeHtml as esc } from '../lib/html.js';
import { getSettings } from '../portal/store.js';
import { formatAt, formatDay, localParts, vetStatus } from '../portal/vet.js';
import { updatesDue } from '../portal/stays.js';
import { statusText } from '../render/parts.js';
import { defaultSay } from './wording.js';

const DAY = 86400000;

// Each tab: its key, path and icon; its name is the owner's (ptab.<key>).
export const TABS = [
  ['today', '', 'home'],
  ['families', '/portal', 'people'],
  ['dogs', '/kennel', 'paw'],
  ['website', '/website', 'pages'],
  ['portal', '/portal/setup', 'list'],
];

export function nav(sub, current, say = defaultSay) {
  return `<nav class="apptabs" aria-label="Site Manager">${TABS.map(([key, path, icon]) => `<a href="/s/${esc(sub)}${path}"${key === current ? ' aria-current="page"' : ''}><svg class="i" aria-hidden="true"><use href="#i-${icon}"/></svg><span>${esc(say(`ptab.${key}`))}</span></a>`).join('')}</nav>`;
}

// Today: puppies going home in the next 7 days, each as the prototype's pup card: its
// photo, name and family, a calendar page with the pickup time, whether the vet visit
// is booked, and Mark picked up (the main action, on the day itself).
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const calPage = (ymd) => `<span class="calpage" aria-hidden="true"><b>${MON[Number(ymd.slice(5, 7)) - 1]}</b><span>${Number(ymd.slice(8, 10))}</span><i>${DOW[new Date(`${ymd}T12:00:00Z`).getUTCDay()]}</i></span>`;
const clock = (hm) => { const [h, m] = hm.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`; };
const SEX = { female: ['♀', 'girl'], male: ['♂', 'boy'] };
// A round photo, or a paw on sand when there's none.
export const roundPhoto = (sub, photoId, alt) => (photoId
  ? `<img class="round" src="/s/${esc(sub)}/photos/${esc(photoId)}/thumb" alt="${esc(alt)}" loading="lazy">`
  : '<span class="round ph" aria-hidden="true"><svg class="i"><use href="#i-paw"/></svg></span>');

export async function goingHome(env, site, now = new Date(), say = defaultSay) {
  const s = await getSettings(env, site.id);
  const today = localParts(now, s.time_zone).ymd;
  const { results } = await env.DB.prepare(`SELECT p.*, f.name AS family, COALESCE(pu.photo_id, k.photo_id) AS photo_id, COALESCE(pu.sex, k.sex) AS sex FROM portal_placements p JOIN portal_families f ON f.id = p.family_id LEFT JOIN puppies pu ON pu.id = p.puppy_id LEFT JOIN portal_pups k ON k.placement_id = p.id
    WHERE p.site_id = ? AND p.status = 'open' AND p.life_status = 'with_family' AND p.picked_up_at IS NULL AND p.pickup_state != 'not_yet'
      AND f.status = 'active' AND f.deleted_at IS NULL AND (p.pickup_booked_at IS NOT NULL OR p.go_home_on IS NOT NULL)`).bind(site.id).all();
  const soon = results.map((p) => ({ ...p, day: p.pickup_booked_at ? localParts(p.pickup_booked_at, s.time_zone).ymd : p.go_home_on }))
    .filter((p) => p.day <= new Date(Date.parse(`${today}T12:00:00Z`) + 7 * DAY).toISOString().slice(0, 10))
    .sort((a, b) => a.day.localeCompare(b.day));
  if (!soon.length) return { html: '', count: 0 };
  const sub = esc(site.subdomain);
  const base = `/s/${sub}/portal/f`;
  const anyToday = soon.some((p) => p.day <= today);
  const cards = soon.map((p) => {
    const name = p.call_name || p.puppy_name;
    const sex = SEX[p.sex];
    const isToday = p.day <= today;
    return `<div class="pupcard">${roundPhoto(site.subdomain, p.photo_id, name)}
      <a class="pname" href="${base}/${esc(p.family_id)}">${esc(name)}${sex ? `<span class="sex ${sex[1]}" aria-label="${sex[1]}">${sex[0]}</span>` : ''}</a>
      <span class="small muted"><span class="sr">${esc(name)} · </span>${esc(p.family)}</span>
      <div class="calrow">${calPage(p.day)}<span class="when">${isToday ? `<b>${esc(say('phome.today'))}</b>` : ''}${p.pickup_booked_at ? esc(clock(localParts(p.pickup_booked_at, s.time_zone).hm)) : esc(say('phome.no_time'))}</span></div>
      <span class="st ${p.vet_booked_at ? 'ok' : 'warn'}">${esc(say(p.vet_booked_at ? 'phome.vet_booked' : 'phome.vet_not_booked'))}</span>
      ${isToday ? `<form method="post" action="${base}/${esc(p.family_id)}/picked-up"><button class="primary small">${esc(say('phome.mark'))}</button></form>` : `<a class="button small" href="${base}/${esc(p.family_id)}">${esc(say('phome.their_screen'))}</a>`}</div>`;
  }).join('');
  return {
    count: soon.length,
    today: soon.filter((p) => p.day <= today).length,
    first: soon[0].day,
    html: `<section id="going-home" class="stack"><h2>${esc(say('phome.title'))}</h2><div class="bento">${cards}</div>
      ${anyToday ? `<p class="small muted">${esc(say('phome.mark_hint'))}</p>` : ''}</section>`,
  };
}

export async function lastFromKennelos(env, site, now = new Date(), say = defaultSay) {
  const at = await env.DB.prepare('SELECT portal_feed_at FROM sites WHERE id = ?').bind(site.id).first('portal_feed_at');
  if (!at) return '';
  const m = Math.round((now.getTime() - Date.parse(at)) / 60000);
  const ago = m < 2 ? say('pago.now') : m < 60 ? say('pago.minutes', { n: m }) : m < 36 * 60 ? say('pago.hours.many', { n: Math.round(m / 60) }) : say('pago.days', { n: Math.round(m / 1440) });
  return `<span class="feedline"><svg class="i" aria-hidden="true"><use href="#i-globe"/></svg>${esc(say('pfam.feed', { ago }))}</span>`;
}

// Dogs: each litter's puppies with their family, go-home, extras and website
// status; Write this week's update for a stay puppy; and the screens for each.
export async function dogsTab(env, site, now = new Date(), say = defaultSay) {
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
    const bits = [statusText(p.status) ?? say('pdogs.hidden')];
    if (p.family) {
      bits.push(p.family);
      if (p.picked_up_at) bits.push(say('pfam.went_home', { time: formatAt(p.picked_up_at, s.time_zone, { weekday: false }) }), say('pdogs.vet', { status: say(`pvet.${vetStatus(p, now).key}`).toLowerCase() }));
      else if (p.pickup_booked_at) bits.push(say('pfam.going_home', { time: formatAt(p.pickup_booked_at, s.time_zone, { weekday: false }) }));
      else if (p.go_home_on) bits.push(say('pfam.going_home', { time: formatDay(p.go_home_on) }));
      if (p.extras) bits.push(p.extras);
    }
    const stayLink = p.placement_id && stays.has(p.placement_id) && !p.picked_up_at
      ? `<a class="button${due.has(p.placement_id) ? ' primary' : ''}" href="/s/${sub}/portal/f/${esc(p.family_id)}#stay">${esc(say(due.has(p.placement_id) ? 'pdogs.write_update' : 'pdogs.stay_updates'))}</a>` : '';
    return `<li class="item"><a href="${p.family_id ? `/s/${sub}/portal/f/${esc(p.family_id)}` : `/s/${sub}/puppies`}"><b>${esc(p.call_name && p.call_name !== p.name ? `${p.call_name} (${p.name})` : p.name)}</b><span>${esc(bits.join(' · '))}</span></a>${stayLink}</li>`;
  };
  const sections = litters.map((l) => {
    const list = pups.filter((p) => p.litter_id === l.id);
    return `<section class="card"><h2>${esc(l.name)}</h2><p class="muted small">${l.born_on ? esc(say('pdogs.born', { day: formatDay(l.born_on) })) : esc(say('pdogs.not_born'))}${l.ready_on ? ` · ${esc(say('pdogs.ready', { day: formatDay(l.ready_on) }))}` : ''}</p>
      ${list.length ? `<ul class="items">${list.map(card).join('')}</ul>` : `<p class="muted small">${esc(say('pdogs.no_puppies'))}</p>`}</section>`;
  }).join('');
  const item = (path, key) => `<li class="item"><a href="/s/${sub}/${path}"><b>${esc(say(`pdogs.${key}`))}</b><span>${esc(say(`pdogs.${key}_note`))}</span></a></li>`;
  return `${sections || `<section class="card"><p class="muted">${esc(say('pdogs.no_litters'))}</p></section>`}
    <ul class="items">${item('dogs', 'dogs')}
      ${item('litters', 'litters')}
      ${item('puppies', 'puppies')}</ul>`;
}

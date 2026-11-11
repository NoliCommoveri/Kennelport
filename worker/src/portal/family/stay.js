// The extended stay on the family portal (a puppy staying on with the breeder for
// training): the skills meter and list, an update's card, and what the stay screens
// read. For Home and the Stay page (portal/family.js).
import { escapeHtml as esc } from '../../lib/html.js';
import { LEVELS, LEVEL_ORDER, stayFor, skillsFor, updatesFor, skillProgress, stayWeeks } from '../stays.js';
import { formatDay, localParts } from '../vet.js';

// A skill's level as four marks, filled to where it is.
export const meter = (level) => {
  const n = level ? LEVEL_ORDER.indexOf(level) : -1;
  return `<span class="meter" aria-label="${esc(level ? LEVELS[level] : 'Not started')}">${LEVEL_ORDER.slice(1).map((_, i) => `<i${i < n ? ' class="on"' : ''}></i>`).join('')}</span>`;
};

export function skillsList(progress, { compact = false } = {}) {
  if (!progress.length) return '';
  return `<ul class="skills">${progress.map((sk) => `<li><span>${esc(sk.name)}</span>${meter(sk.now)}<b class="small">${esc(sk.now ? LEVELS[sk.now] : 'Not started')}</b>${!compact && sk.first && sk.first !== sk.now ? `<span class="small muted">from ${esc(LEVELS[sk.first].toLowerCase())} in the first update</span>` : ''}${!compact && sk.note ? `<span class="small muted">${esc(sk.note)}</span>` : ''}</li>`).join('')}</ul>`;
}

export function updateCard(u, skills, name) {
  const named = new Map(skills.map((sk) => [sk.id, sk.name]));
  return `<article class="card update"><p class="eyebrow">Week ${u.week} · ${esc(formatDay(u.written_on))}</p>
    ${u.note ? u.note.split(/\n{2,}/).map((x) => `<p>${esc(x).replace(/\n/g, '<br>')}</p>`).join('') : ''}
    ${u.weight ? `<p class="small"><b>Weight:</b> ${esc(u.weight)}</p>` : ''}
    ${u.photos.length ? `<ul class="gallery">${u.photos.map((id) => `<li><a href="/family/media/${esc(id)}"><img src="/family/media/${esc(id)}" alt="${esc(name)}, week ${u.week}" loading="lazy"></a></li>`).join('')}</ul>` : ''}
    ${u.levels.some((l) => l.note) ? `<ul class="small muted">${u.levels.filter((l) => l.note).map((l) => `<li>${esc(named.get(l.skill_id) ?? '')}: ${esc(l.note)}</li>`).join('')}</ul>` : ''}</article>`;
}

export async function stayContext(env, site, p, s, now) {
  const pe = await stayFor(env, site.id, p.id);
  if (!pe) return null;
  const skills = await skillsFor(env, site.id, pe.id);
  const updates = await updatesFor(env, site.id, pe.id);
  const w = stayWeeks(pe.starts_on, p.go_home_on, localParts(now, s.time_zone).ymd);
  return { pe, skills, updates, progress: skillProgress(skills, updates), ...w };
}

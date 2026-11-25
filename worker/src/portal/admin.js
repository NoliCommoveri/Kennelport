// Her side of the portal (docs/plans/family-portal.md section 7.3), in the
// Site Manager under /s/<subdomain>/portal: puppy families, each family's screen
// (invite, pickup, vet visit, records, contract, reminder log, history), and the
// portal's settings and programs. Build chunk 1 adds these as their own section;
// chunk 6 folds them into the app's Today / Families / Dogs / Portal tabs.
//
// Uses the manage app's own page frame and styles (public/_kp/m/app.css), so it
// needs no change to the app's cached files.
//
// Split out into admin/ (docs/review/senior-review-2026-11.md, item 7): templates.js,
// settings.js, today.js, and parts.js, the pieces they share.
import { escapeHtml as esc } from '../lib/html.js';
import {
  getSettings, saveSettings, listFamilies, getFamily, familyEmails, createFamily, updateFamily, deleteFamily, placementFor, createPlacement,
  updatePlacement, markPickedUp, confirmPickup, pickupNotYet, acceptProof, declineProof, setLifeStatus, addHealthRecord, removeHealthRecord, healthRecords,
  saveFile, getFile, fileResponse, emailLog, history, placeablePuppies, PortalError, RECORD_TYPES, recordKind, MAX_FILE_BYTES,
} from './store.js';
import { sendInvites, portalBase } from './auth.js';
import { pupOf, photosOf, removedPhotosOf, removePhoto, putBackPhoto } from './pups.js';
import { makeViewLink, VIEW_AS_ADMIN } from './view.js';
import { defaultSay } from '../manage/wording.js';
import {
  listItems, saveItem, removeItem, moveItem, addSuggested, addReady, puppyNames, stepsFor, programsFor, setDone, setHidden, setDueOn, setProgramStatus, setProgramCode,
  PROGRAM_WORDS,
} from './steps.js';
import { sendDueFor } from './reminders.js';
import { vetStatus, formatAt, formatDay, localParts, timeLeft, clockRunning } from './vet.js';
import { MailError } from '../mail.js';
import { roundPhoto } from '../manage/hub.js';
import {
  catalog, saveDelivery, extrasFor, addExtra, confirmExtra, removeExtra, setStayStart, skillsFor, addSkill, removeSkill, updatesFor, writeUpdate, removeUpdate,
  updatesDue, stayWeeks, updateDue, LEVELS, MAX_PHOTOS,
} from './stays.js';
import { suggestionsFor, takeSuggestion, ignoreSuggestion, QUIET_MS } from './feed.js';
import {
  thread, markRead, breederWrites, markLoss, isLoss, lossDraft, saveLossNote, scheduleDelete, undoDelete, recentlyDeleted, eraseFamily, erasedRecords, MAX_MESSAGE, UNDO_DAYS,
  deleteNow, deletedForGood, giveBack,
} from './account.js';
import { placementDuplicates, familyCandidates, mergePlacement, mergeFamily } from './merge.js';
import { redirect, note, errorBox, pupName, familyFilters, sayHtml, suggestLabel, ZONE_NAMES } from './admin/parts.js';
import { products, itemFields, whenWords, formOffset, templateScreen, readyForm } from './admin/templates.js';
import { settingsScreen } from './admin/settings.js';
import { waitlistCount, waitlistPart, setupScreen } from './admin/today.js';
import { handbookScreen, removeScreen, photoScreen } from './admin/handbook.js';
import { bagScreen, bagItemScreen, removeBagScreen, sentHomeCard } from './admin/bag.js';
import { bagTemplate, bagPrograms, getBagItem, saveBagItem, removeBagItem, moveBagItem, bagFor, saveBag, fixBag, inTemplate } from './bag.js';
import {
  listChapters, getChapter, saveChapter, removeChapter, moveChapter, linkablePrograms, photoTags, setChapterPhoto, chaptersFrom, importChapters, MAX_UPLOAD,
} from './handbook.js';

// "2 hours ago", for Last from KennelOS.
export function ago(at, now = new Date(), say = defaultSay) {
  const m = Math.max(0, Math.round((now.getTime() - Date.parse(at)) / 60000));
  if (m < 2) return say('pago.now');
  if (m < 60) return say('pago.minutes', { n: m });
  const h = Math.round(m / 60);
  if (h < 36) return say.n('pago.hours', h);
  return say('pago.days', { n: Math.round(h / 24) });
}
// Why a placement closed (from KennelOS), in the owner's words.
const closedWhy = (reason, say) => say(`pclosed.${reason}`);

// ---------- Today ----------

// What the portal needs from her, for the "Needs you" list on her Today screen.
// Each: { href (under /s/<sub>), label, note }. Only what's there.
export async function portalNeedsYou(env, siteId, now = new Date(), say = defaultSay) {
  if (!(await env.DB.prepare('SELECT portal_on FROM sites WHERE id = ?').bind(siteId).first('portal_on'))) return [];
  const s = await getSettings(env, siteId);
  const t = now.getTime();
  const out = [];
  for (const f of await listFamilies(env, siteId)) {
    if (!f.placement_id || f.life_status !== 'with_family') continue;
    const href = `/portal/f/${f.id}`;
    const name = f.call_name || f.puppy_name;
    if (f.pickup_state === 'assumed') {
      out.push({ href, label: say('ptoday.assumed', { name, time: formatAt(f.pickup_booked_at, s.time_zone, { weekday: false }) }), note: say('ptoday.assumed_note') });
      continue;
    }
    if (f.proof_uploaded_at && !f.proof_accepted_at && !f.proof_declined_at) out.push({ href, label: say('ptoday.proof', { name }), note: f.name });
    const v = vetStatus(f, now, s.timing);
    if (clockRunning(f) && v.trouble) out.push({ href, label: say('ptoday.vet', { name, status: say(`pvet.${v.key}`).toLowerCase() }), note: v.key === 'missed' ? say('ptoday.vet_missed_note', { time: formatAt(f.vet_deadline_at, s.time_zone) }) : say('ptoday.vet_left_note', { left: timeLeft(f.vet_deadline_at, now) }) });
    // Going home in the next 7 days has its own card on Today (manage/hub.js goingHome);
    // here only what that card doesn't say: not invited yet.
    if (!f.picked_up_at && f.pickup_state !== 'not_yet' && !f.invited_at && !f.kennelos_id) {
      const at = f.pickup_booked_at ? Date.parse(f.pickup_booked_at) : f.go_home_on ? Date.parse(`${f.go_home_on}T12:00:00Z`) : null;
      if (at && at - t < 7 * 86400000) out.push({ href, label: say('ptoday.not_invited', { name, family: f.name }), note: say('ptoday.not_invited_note') });
    }
  }
  // From the KennelOS feed (plan 3.4): new families to invite, sales voided, records
  // no longer in KennelOS, newer values waiting, and a feed gone quiet.
  const { results: kos } = await env.DB.prepare(`SELECT f.id, f.name, f.invited_at, f.kennelos_gone_at,
      (SELECT COUNT(*) FROM portal_suggestions g WHERE g.ignored = 0 AND ((g.tbl = 'portal_families' AND g.row_id = f.id) OR (g.tbl = 'portal_placements' AND g.row_id IN (SELECT id FROM portal_placements WHERE family_id = f.id)))) AS waiting
    FROM portal_families f WHERE f.site_id = ? AND f.status = 'active' AND f.deleted_at IS NULL AND f.kennelos_id IS NOT NULL`).bind(siteId).all();
  for (const f of kos) {
    const href = `/portal/f/${f.id}`;
    if (!f.invited_at) out.push({ href, label: say('ptoday.invite', { family: f.name }), note: say('ptoday.invite_note') });
    if (f.kennelos_gone_at) out.push({ href, label: say('ptoday.family_gone', { family: f.name }), note: say('ptoday.family_gone_note') });
    if (f.waiting) out.push({ href, label: say.n('ptoday.newer', f.waiting, { family: f.name }), note: say('ptoday.newer_note') });
  }
  const { results: voided } = await env.DB.prepare(`SELECT p.family_id, p.puppy_name, p.call_name, p.closed_reason, p.kennelos_gone_at FROM portal_placements p
    WHERE p.site_id = ? AND ((p.status = 'closed' AND p.closed_reason IS NOT NULL AND p.updated_at > ?) OR (p.status = 'open' AND p.kennelos_gone_at IS NOT NULL))`).bind(siteId, new Date(t - 14 * 86400000).toISOString()).all();
  for (const p of voided) {
    out.push(p.kennelos_gone_at && !p.closed_reason
      ? { href: `/portal/f/${p.family_id}`, label: say('ptoday.pup_gone', { name: p.call_name || p.puppy_name }), note: say('ptoday.pup_gone_note') }
      : { href: `/portal/f/${p.family_id}`, label: say('ptoday.closed', { name: p.call_name || p.puppy_name }), note: say('ptoday.closed_note', { reason: closedWhy(p.closed_reason, say) }) });
  }
  // Messages from families, a loss to write about, a back-out on its way out.
  const { results: unread } = await env.DB.prepare(`SELECT f.id, f.name, COUNT(*) AS n FROM portal_messages m JOIN portal_families f ON f.id = m.family_id
    WHERE m.site_id = ? AND m.sender = 'family' AND m.read_at IS NULL AND f.status = 'active' AND f.deleted_at IS NULL GROUP BY f.id`).bind(siteId).all();
  for (const f of unread) out.unshift({ href: `/portal/f/${f.id}#messages`, label: say.n('ptoday.messages', f.n, { family: f.name }), note: say('ptoday.messages_note') });
  const { results: losses } = await env.DB.prepare(`SELECT f.id, f.name FROM portal_placements p JOIN portal_families f ON f.id = p.family_id
    WHERE p.site_id = ? AND p.status = 'closed' AND p.closed_reason IN ('died', 'failed_health') AND p.picked_up_at IS NULL AND p.loss_note IS NULL AND f.status = 'active' AND f.deleted_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM portal_placements o WHERE o.family_id = f.id AND o.status = 'open')`).bind(siteId).all();
  for (const f of losses) out.unshift({ href: `/portal/f/${f.id}#loss`, label: say('ptoday.loss', { family: f.name }), note: say('ptoday.loss_note') });
  for (const f of await recentlyDeleted(env, siteId)) {
    if (f.delete_reason === 'backed_out') out.push({ href: '/portal#deleted', label: say('ptoday.backed_out', { family: f.name }), note: say('ptoday.backed_out_note', { date: formatDay(new Date(Date.parse(f.deleted_at) + UNDO_DAYS * 86400000).toISOString().slice(0, 10)) }) });
  }
  // Extended stays: updates due, and extras KennelOS says they bought, to confirm.
  for (const x of await updatesDue(env, siteId, s.time_zone, now)) {
    out.push({ href: `/portal/f/${x.family_id}#stay`, label: say(x.every_days === 7 ? 'ptoday.update_due_weekly' : 'ptoday.update_due', { name: x.name }), note: x.ago === null ? say('ptoday.update_none') : say.n('ptoday.update_last', x.ago) });
  }
  const { results: unconfirmed } = await env.DB.prepare(`SELECT pe.name, p.family_id, f.name AS family FROM portal_placement_extras pe JOIN portal_placements p ON p.id = pe.placement_id JOIN portal_families f ON f.id = p.family_id
    WHERE pe.site_id = ? AND pe.confirmed_at IS NULL AND p.status = 'open' AND f.status = 'active' AND f.deleted_at IS NULL`).bind(siteId).all();
  for (const x of unconfirmed) out.push({ href: `/portal/f/${x.family_id}#extras`, label: say('ptoday.bought', { family: x.family, extra: x.name }), note: say('ptoday.bought_note') });
  const vetWaiting = await env.DB.prepare("SELECT COUNT(*) AS n FROM portal_suggestions WHERE site_id = ? AND tbl = 'portal_settings' AND ignored = 0").bind(siteId).first('n');
  if (vetWaiting) out.push({ href: '/portal/settings', label: say('ptoday.vet_details'), note: say('ptoday.vet_details_note') });
  const feedAt = await env.DB.prepare('SELECT portal_feed_at FROM sites WHERE id = ?').bind(siteId).first('portal_feed_at');
  if (feedAt && t - Date.parse(feedAt) > QUIET_MS) {
    const open = await env.DB.prepare("SELECT 1 FROM portal_placements WHERE site_id = ? AND status = 'open' AND kennelos_id IS NOT NULL LIMIT 1").bind(siteId).first();
    if (open) out.push({ href: '/portal', label: say('ptoday.quiet'), note: say('ptoday.quiet_note', { ago: ago(feedAt, now, say) }) });
  }

  const failed = await env.DB.prepare(`SELECT COUNT(*) AS n FROM portal_email_log WHERE site_id = ? AND result IN ('failed', 'bounced') AND sent_at > ?`)
    .bind(siteId, new Date(t - 7 * 86400000).toISOString()).first('n');
  if (failed) out.push({ href: '/portal', label: say.n('ptoday.failed', failed), note: say('ptoday.failed_note') });
  return out;
}

// ---------- screens ----------

// A family's state, as a status pill (plan 7.3).
function familyPill(f, say) {
  const pill = (tone, key) => `<span class="st${tone ? ` ${tone}` : ''}">${esc(say(`pfam.pill.${key}`))}</span>`;
  if (f.first_signed_in_at) return f.placement_id ? pill('ok', 'active') : pill('', 'no_puppy');
  if (!f.invited_at) return f.kennelos_id ? pill('next', 'to_send') : pill('next', 'not_invited');
  return pill('warn', 'not_accepted');
}
const shortDay = (iso, tz) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: tz });

function familiesScreen(site, families, s, url, { deleted = [], erased = [], gone = [], waitlistCount = null, kennel, say = defaultSay } = {}, now = new Date()) {
  // site.portalUrl: set by handlePortalAdmin.
  const base = `/s/${esc(site.subdomain)}/portal`;
  // One row a family, whatever their open puppy records (listFamilies gives a row
  // each): their pups named together, and tagged to merge when one was typed in and
  // one is from KennelOS (merge.js).
  const of = (id) => families.filter((g) => g.id === id && g.placement_id);
  const twice = (id) => of(id).some((g) => g.placement_kennelos_id) && of(id).some((g) => !g.placement_kennelos_id);
  const rows = families.filter((f, i) => families.findIndex((g) => g.id === f.id) === i).map((f) => {
    const p = f.placement_id ? f : null;
    const bits = [];
    if (p) {
      const more = [...new Set(of(f.id).slice(1).map(pupName))].filter((n) => n !== pupName(p));
      bits.push(`${[pupName(p), ...more].join(' and ')}${p.litter_name ? ` · ${p.litter_name}` : ''}`);
      if (p.picked_up_at) bits.push(say('pfam.went_home', { time: formatAt(p.picked_up_at, s.time_zone, { weekday: false }) }));
      else if (p.pickup_booked_at) bits.push(say('pfam.going_home', { time: formatAt(p.pickup_booked_at, s.time_zone, { weekday: false }) }));
      else if (p.go_home_on) bits.push(say('pfam.going_home', { time: formatDay(p.go_home_on) }));
    }
    bits.push(f.last_activity_at ? say('pfam.last_active', { day: shortDay(f.last_activity_at, s.time_zone) }) : say('pfam.never'));
    if (f.kennelos_id) bits.push(say('pfam.from_kennelos'));
    const tags = `${twice(f.id) ? `<span class="tag">${esc(say('familydupes.twice_tag'))}</span>` : ''}${(f.extras ?? '').split('|').filter(Boolean).map((x) => `<span class="tag">${esc(x)}</span>`).join('')}`;
    return `<li>${roundPhoto(site.subdomain, p?.photo_id, p ? pupName(p) : f.name)}<span class="grow"><a class="rowlink" href="${base}/f/${esc(f.id)}"><b>${esc(f.name)}</b></a><br><span class="small muted">${esc(bits.join(' · '))}</span>${tags ? `<br>${tags}` : ''}</span>${familyPill(f, say)}</li>`;
  }).join('');
  return `${note(url, say)}
  <span class="eyebrow">${esc(kennel)}</span><h1>${esc(say('pfam.title'))}</h1>
  ${familyFilters(site, 'puppy', waitlistCount, say)}
  <section class="card"><div class="between"><p class="muted small">${sayHtml(say, 'pfam.line', {}, { address: `<strong>${esc(site.portalUrl)}</strong>` })}</p><a class="button primary small" href="${base}/new">${esc(say('pfam.add'))}</a></div>
    ${site.feedAt ? `<span class="feedline muted"><svg class="i" aria-hidden="true"><use href="#i-globe"/></svg>${esc(say('pfam.feed', { ago: ago(site.feedAt, now, say) }))}</span>` : ''}
    ${rows ? `<ul class="list">${rows}</ul>` : `<p class="muted">${esc(say('pfam.none'))}</p>`}
  </section>
  <p class="small muted">${esc(say('pfam.keeping'))}</p>

  ${deleted.length ? `<section class="card" id="deleted"><h2>${esc(say('pfam.deleted_title'))}</h2><p class="hint">${esc(say('pfam.deleted_line', { n: UNDO_DAYS }))}</p>
    <dl class="kv">${deleted.map((f) => `<dt>${esc(formatDay(new Date(Date.parse(f.deleted_at) + UNDO_DAYS * 86400000).toISOString().slice(0, 10)))}</dt><dd><b>${esc(f.name)}</b>${f.pup ? ` · ${esc(f.pup)}` : ''}${f.delete_reason === 'backed_out' ? ` <span class="hint">${esc(say('pfam.backed_out'))}</span>` : ''}
      <form method="post" action="${base}/undo/${esc(f.id)}" class="inline"><button class="link">${esc(say('pfam.undo'))}</button></form>
      <details><summary>${esc(say('familydupes.delete_now'))}</summary><form method="post" action="${base}/gone/${esc(f.id)}"><p class="hint">${esc(say('familydupes.delete_now_line'))}</p>
        <label>${esc(say('familydupes.confirm_label'))}<input name="confirm" autocomplete="off" required></label><p><button>${esc(say('familydupes.confirm_button'))}</button></p></form></details></dd>`).join('')}</dl></section>` : ''}
  ${gone.length ? `<details class="card" id="gone"><summary>${esc(say('familydupes.gone_title'))} (${gone.length})</summary><p class="hint">${esc(say('familydupes.gone_line'))}</p>
    <dl class="kv">${gone.map((t) => `<dt>${esc(shortDay(t.deleted_at, s.time_zone))}</dt><dd><b>${esc(t.label || say('familydupes.gone_no_name'))}</b>
      <form method="post" action="${base}/giveback" class="inline"><input type="hidden" name="kennelos_id" value="${esc(t.kennelos_id)}"><button class="link">${esc(say('familydupes.give_back'))}</button></form></dd>`).join('')}</dl></details>` : ''}
  ${erased.length ? `<details class="card"><summary>${esc(say('pfam.erased_title', { n: erased.length }))}</summary><p class="hint">${esc(say('pfam.erased_line'))}</p>
    <dl class="kv">${erased.map((r) => `<dt>${esc(r.name)}</dt><dd><b>${esc(r.call_name || r.puppy_name)}</b>${r.picked_up_at ? ` · ${esc(say('pfam.went_home', { time: formatAt(r.picked_up_at, s.time_zone, { weekday: false }) }))}` : ''}${r.proof_file_id ? ` · <a href="${base}/file/${esc(r.proof_file_id)}">${esc(say('pfam.erased_vet'))}</a>${r.proof_accepted_at ? ` ${esc(say('pfam.erased_accepted'))}` : ''}` : ''}${r.contract_file_id ? ` · <a href="${base}/file/${esc(r.contract_file_id)}">${esc(say('pfam.erased_contract'))}</a>` : ''} <span class="hint">${esc(say('pfam.erased_on', { time: formatAt(r.erased_at, s.time_zone, { weekday: false }) }))}</span></dd>`).join('')}</dl></details>` : ''}`;
}

// A puppy whose litter has left the website (portal/pups.js) stays the placement's
// choice: `kept` is its copy, and choosing it changes nothing.
function puppyOptions(puppies, current, kept, say) {
  const keptOption = kept ? `<option value="${KEPT_PUPPY}" selected>${esc(say('keptpups.option', { name: kept.name ?? '', litter: kept.litter_name ?? '' }))}</option>` : '';
  return `<option value="">${esc(say('ppup.choose'))}</option>${keptOption}${puppies.map((p) => `<option value="${esc(p.id)}"${p.id === current ? ' selected' : ''}${p.family && p.id !== current ? ' disabled' : ''}>${esc(p.name)} · ${esc(p.litter_name)}${p.family && p.id !== current ? ` (${esc(p.family)})` : ''}</option>`).join('')}`;
}

export const KEPT_PUPPY = 'kept';

function placementFields(p, puppies, s, { kept = null, say = defaultSay } = {}) {
  const booked = p?.pickup_booked_at ? localParts(p.pickup_booked_at, s.time_zone) : null;
  return `<label>${esc(say('ppup.puppy'))}<select name="puppy_id" required>${puppyOptions(puppies, p?.puppy_id, kept, say)}</select><span class="hint">${esc(say('ppup.puppy_hint'))}</span></label>
    <label>${esc(p ? say('ppup.call_name', { name: p.puppy_name }) : say('ppup.call_name_new'))}<input name="call_name" value="${esc(p?.call_name ?? '')}" maxlength="60"><span class="hint">${esc(say('ppup.call_name_hint'))}</span></label>
    <div class="row"><label>${esc(say('ppup.go_home'))}<input type="date" name="go_home_on" value="${esc(p?.go_home_on ?? '')}"><span class="hint">${esc(say('ppup.go_home_hint'))}</span></label></div>
    <div class="row"><label>${esc(say('ppup.pickup'))}<input type="date" name="pickup_day" value="${esc(booked?.ymd ?? '')}"></label><label>${esc(say('ppup.at'))}<input type="time" name="pickup_time" value="${esc(booked?.hm ?? '')}"><span class="hint">${esc(say('ppup.pickup_hint', { zone: ZONE_NAMES[s.time_zone] ?? s.time_zone }))}</span></label></div>`;
}

function newScreen(site, puppies, s, { error, values = {}, say = defaultSay } = {}) {
  return `${errorBox(error, say)}<form method="post" action="/s/${esc(site.subdomain)}/portal/new" class="card">
    <h1>${esc(say('pfam.add'))}</h1>
    <section class="fgroup"><h2>${esc(say('pnew.family'))}</h2><div class="fgrid">
      <label>${esc(say('pnew.name'))}<input name="name" value="${esc(values.name ?? '')}" required maxlength="120" placeholder="${esc(say('pnew.name_ph'))}"></label>
      <label>${esc(say('pnew.emails'))}<input name="emails" value="${esc(values.emails ?? '')}" required placeholder="${esc(say('pnew.emails_ph'))}"><span class="hint">${esc(say('pnew.emails_hint'))}</span></label>
    </div></section>
    <section class="fgroup"><h2>${esc(say('pnew.puppy'))}</h2><div class="fgrid">${placementFields(values.puppy_id ? values : null, puppies, s, { say })}</div></section>
    <p><button class="primary">${esc(say('pnew.button'))}</button></p>
    <p class="muted small">${esc(say('pnew.nothing_sent'))}</p>
  </form>`;
}

async function familyScreen(env, site, familyId, url, { error, say = defaultSay } = {}, now = new Date()) {
  const f = await getFamily(env, site.id, familyId);
  if (!f) return null;
  const s = await getSettings(env, site.id);
  const emails = await familyEmails(env, f.id);
  const p = await placementFor(env, site.id, f.id);
  const base = `/s/${esc(site.subdomain)}/portal/f/${esc(f.id)}`;
  const form = (action, inner, cls = '') => `<form method="post" action="${base}/${action}"${cls ? ` class="${cls}"` : ''}>${inner}</form>`;
  // The owner's line, escaped (manage/wording-portal.js: pf.*, pstay.*, plog.*).
  const t = (key, vars) => esc(say(key, vars));
  const at = (iso) => formatAt(iso, s.time_zone, { weekday: false });
  const puppies = await placeablePuppies(env, site.id);
  const photoNote = { photoremoved: 'portalphotos.removed_note', photoback: 'portalphotos.back_note' }[url.searchParams.get('note')];
  const parts = [photoNote ? `<p class="notice" role="status">${esc(say(photoNote))}</p>` : note(url, say), errorBox(error, say)];

  // From KennelOS (plan 3.1): when it last sent, anything it no longer has, and
  // newer values waiting beside hers.
  const sug = async (tbl, id) => (await suggestionsFor(env, site.id, tbl, id)).map((g) => ({ ...g, tbl, id }));
  const waiting = [...await sug('portal_families', f.id), ...(p ? await sug('portal_placements', p.id) : [])];
  const pupNames = new Map(puppies.map((x) => [x.id, x.name]));
  const shown = (g) => (g.value === null ? say('pf.blank') : g.field === 'pickup_booked_at' ? formatAt(g.value, s.time_zone) : g.field === 'go_home_on' ? formatDay(g.value) : g.field === 'puppy_id' ? pupNames.get(g.value) ?? say('pf.another_puppy') : g.value);
  if (f.kennelos_id) {
    parts.push(`<section class="card"><p class="hint">${site.feedAt ? t('pf.kennelos_sent', { ago: ago(site.feedAt, now, say) }) : t('pf.kennelos')}</p>
      ${f.kennelos_gone_at ? `<p class="error">${t('pf.family_gone', { time: at(f.kennelos_gone_at) })}</p>` : ''}
      ${p?.kennelos_gone_at ? `<p class="error">${t('pf.pup_gone', { name: pupName(p) })}</p>` : ''}
      ${waiting.map((g) => `<div class="box"><p><b>${t('pf.newer')}</b> ${sayHtml(say, 'pf.newer_for', { field: suggestLabel(g.field, say) }, { value: `<strong>${esc(shown(g))}</strong>` })}</p>
        <div class="row">${form('suggestion', `<input type="hidden" name="tbl" value="${g.tbl}"><input type="hidden" name="field" value="${esc(g.field)}"><input type="hidden" name="act" value="use"><button class="primary">${t('pf.use')}</button>`)}
        ${form('suggestion', `<input type="hidden" name="tbl" value="${g.tbl}"><input type="hidden" name="field" value="${esc(g.field)}"><input type="hidden" name="act" value="ignore"><button>${t('pf.ignore')}</button>`)}</div></div>`).join('')}</section>`);
  }
  // Two puppy records, one typed and one from KennelOS (merge.js).
  const dupes = await placementDuplicates(env, site.id, f.id);
  if (dupes) {
    const label = (x) => [pupName(x), x.go_home_on ? formatDay(x.go_home_on) : null].filter(Boolean).join(', ');
    parts.push(`<section class="card" id="merge"><h2>${esc(say('familydupes.placements_title'))}</h2>
      ${dupes.typed.map((h) => form('merge-placement', `<p>${esc(say('familydupes.placements_line', { typed: label(h), kennelos: dupes.linked.map(label).join('; ') }))}</p>
        <input type="hidden" name="from" value="${esc(h.id)}">
        ${dupes.linked.length === 1 ? `<input type="hidden" name="into" value="${esc(dupes.linked[0].id)}">`
          : `<label>${esc(say('familydupes.placements_choose'))}<select name="into" required>${dupes.linked.map((k) => `<option value="${esc(k.id)}">${esc(label(k))}</option>`).join('')}</select></label>`}
        <p><button class="primary">${esc(say('familydupes.placements_button'))}</button></p>`)).join('')}</section>`);
  }
  if (p && p.status === 'closed' && p.closed_reason) parts.push(`<section class="card"><p class="error">${t('pf.closed', { name: pupName(p), reason: closedWhy(p.closed_reason, say) })}</p></section>`);

  parts.push(`<section class="card"><h1>${esc(f.name)}</h1>
    <dl class="kv">${emails.map((e, i) => `<dt>${i ? '' : t('pf.emails')}</dt><dd>${esc(e.email)}${e.invited_at ? ` <span class="muted small">${t(e.invite_hash ? 'pf.invited' : 'pf.invited_used', { time: at(e.invited_at) })}</span>` : ''}</dd>`).join('')}
      <dt>${t('pf.signed_in')}</dt><dd>${f.first_signed_in_at ? t('pf.signed_in_when', { first: at(f.first_signed_in_at), last: at(f.last_activity_at) }) : t('pf.not_yet')}</dd></dl>
    ${form('invite', `<button${f.invited_at ? '' : ' class="primary"'}>${t(f.invited_at ? 'pf.resend' : 'pf.send_invite')}</button> <span class="hint">${t('pf.invite_hint')}</span>`)}
    <p><a class="button small" href="${base}/view" target="_blank" rel="noopener">${esc(say('familyview.button'))}</a> <span class="hint">${esc(say('familyview.button_hint'))}</span></p>
  </section>`);

  if (!p) {
    parts.push(form('placement', `<section class="card"><h2>${esc(say('pnew.puppy'))}</h2>${placementFields(null, puppies, s, { say })}<p><button class="primary">${t('pf.save')}</button></p></section>`));
  } else {
    const name = pupName(p);
    const v = vetStatus(p, now, s.timing);
    // Pickup: the clock's state, and the one action that fits.
    let pickup;
    if (p.pickup_state === 'assumed') {
      pickup = `<p><strong>${t('pf.assumed', { name, time: formatAt(p.pickup_booked_at, s.time_zone) })}</strong> ${t('pf.assumed_line')}</p>
        <div class="row">${form('confirm', `<button class="primary">${t('pf.yes')}</button>`)}${form('not-yet', `<button>${t('pf.not_yet_button')}</button>`)}</div>
        <p class="hint">${t('pf.or_change')}</p>`;
    } else if (p.picked_up_at) {
      pickup = `<p>${sayHtml(say, 'pf.went_home', {}, { time: `<strong>${esc(formatAt(p.picked_up_at, s.time_zone))}</strong>` })}</p>`;
    } else {
      pickup = `<p>${p.pickup_booked_at ? sayHtml(say, 'pf.booked', {}, { time: `<strong>${esc(formatAt(p.pickup_booked_at, s.time_zone))}</strong>` }) : p.go_home_on ? t('pf.planned', { day: formatDay(p.go_home_on) }) : t('pf.no_date')}${p.pickup_state === 'not_yet' ? ` ${t('pf.stopped')}` : ''}</p>
        ${form('picked-up', `<button class="primary">${t('pf.mark_picked_up')}</button>`)}`;
    }
    const local = p.picked_up_at ? localParts(p.picked_up_at, s.time_zone) : null;
    pickup += `<details><summary>${t(p.picked_up_at ? 'pf.correct_time' : 'pf.earlier')}</summary>
      ${form('picked-up', `<div class="row"><label>${t('pf.day')}<input type="date" name="day" value="${esc(local?.ymd ?? '')}" required></label><label>${t('pf.time')}<input type="time" name="time" value="${esc(local?.hm ?? '')}" required></label></div><p><button>${t('pf.save_time')}</button> <span class="hint">${t('pf.save_time_hint')}</span></p>`)}</details>`;
    parts.push(`<section class="card"><h2>${t('pf.pickup_title', { name })}</h2>${pickup}</section>`);

    // Lost before pickup (plan 7.4): her note, from a draft she rewrites; email only if she chooses.
    if (isLoss(p)) {
      parts.push(`<section class="card" id="loss"><h2>${t(p.closed_reason === 'died' ? 'pf.loss_died' : 'pf.loss_failed', { name })}</h2>
        <p class="hint">${t('pf.loss_line', { name })}</p>
        ${form('loss-note', `<label>${t('pf.loss_note', { family: f.name })}<textarea name="note" rows="9" maxlength="4000" required>${esc(p.loss_note ?? lossDraft(p, site.kennel_name || site.subdomain, f.name))}</textarea>
          <span class="hint">${p.loss_note ? (p.loss_sent_at ? t('pf.loss_saved_sent', { time: at(p.loss_note_at), sent: at(p.loss_sent_at) }) : t('pf.loss_saved', { time: at(p.loss_note_at) })) : t('pf.loss_draft')}</span></label>
          <label class="check"><input type="checkbox" name="send" value="1"> <span>${t('pf.loss_email')}</span></label><p><button class="primary">${t('pf.loss_save')}</button></p>`)}</section>`);
    }
    const proof = p.proof_file_id ? await getFile(env, site.id, p.proof_file_id) : null;
    parts.push(`<section class="card"><h2>${sayHtml(say, 'pf.vet_title', {}, { status: `<span${v.trouble ? ' class="error"' : ''}>${t(`pvet.${v.key}`)}</span>` })}</h2>
      <dl class="kv">
        ${p.vet_deadline_at ? `<dt>${t('pf.deadline')}</dt><dd>${esc(formatAt(p.vet_deadline_at, s.time_zone, { zone: true }))}${Date.parse(p.vet_deadline_at) > now.getTime() ? ` · ${t('pf.left', { left: timeLeft(p.vet_deadline_at, now) })}` : ''}</dd>` : `<dt>${t('pf.deadline')}</dt><dd class="muted">${t('pf.deadline_starts', { rule: say(`pvet.rule.${s.vet_rule}`).toLowerCase() })}</dd>`}
        <dt>${t('pf.booked_label')}</dt><dd>${p.vet_booked_at ? `${esc((p.vet_booked_for ?? '').replace('T', ' at '))}${p.vet_clinic ? `, ${esc(p.vet_clinic)}` : ''} <span class="muted small">${t('pf.their_entry')}</span>` : t('pf.not_yet')}</dd>
        <dt>${t('pf.record')}</dt><dd>${proof ? `<a href="/s/${esc(site.subdomain)}/portal/file/${esc(proof.id)}">${t('pf.view')}</a> · ${t('pf.uploaded', { time: at(p.proof_uploaded_at) })}${p.proof_accepted_at ? ` · ${t('pf.accepted', { time: at(p.proof_accepted_at) })}` : ''}${p.proof_declined_at ? ` · ${t('pf.declined', { time: at(p.proof_declined_at) })}` : ''}` : t('pf.not_uploaded')}</dd>
      </dl>
      ${proof && !p.proof_accepted_at ? `<div class="row">${form('accept', `<button class="primary">${t('pf.accept')}</button>`)}${p.proof_declined_at ? '' : form('decline', `<button>${t('pf.decline')}</button>`)}</div>
      ${p.proof_declined_at ? '' : `<p class="hint">${t('pf.decline_hint')}</p>`}` : ''}
    </section>`);

    // The checklist, the timeline and the programs, as this family has them.
    const steps = await stepsFor(env, site.id, p, await pupOf(env, site.id, p), s, { now, all: true, name });
    const op = (kind, x, what, key, cls = 'link') => form(`step/${kind}/${esc(x.id)}/${what}`, `<button class="${cls}">${t(key)}</button>`, 'inline');
    const stepOps = (kind, x) => [
      !x.auto && !(x.hers) ? op(kind, x, x.done ? 'undo' : 'done', x.done ? 'pf.untick' : 'pf.tick') : '',
      x.mine ? op(kind, x, 'remove', 'pf.remove') : op(kind, x, x.hidden ? 'show' : 'hide', x.hidden ? 'pf.show' : 'pf.hide'),
    ].filter(Boolean).join(' · ');
    const who = (x) => (x.done ? `${say(x.by === 'breeder' ? (x.hers ? 'pf.done_yours' : 'pf.done_by_you') : x.by === 'family' && !x.auto ? 'pf.done_by_them' : 'pf.done')}${x.done_at ? ` ${at(x.done_at)}` : ''}` : say('pf.not_yet'));
    const steps1 = steps.checklist.filter((x) => !x.hidden);
    const home = Boolean(p.picked_up_at);
    const theirs = ` <span class="hint">${t('pf.theirs_alone')}</span>`;
    const setUp = (key, path) => `<p class="muted">${t(key)} <a href="/s/${esc(site.subdomain)}/portal/${path}">${t('pf.set_up')}</a>.</p>`;
    const checklistPart = steps.checklist.length ? `<details${home ? '' : ' open'}><summary><b>${t('pf.checklist_n', { done: steps1.filter((x) => x.done).length, total: steps1.length })}</b></summary>
      <dl class="kv">${steps.checklist.map((x) => `<dt>${x.hidden ? `<span class="muted">${t('pf.hidden')}</span>` : esc(who(x))}</dt><dd>${x.hidden ? `<span class="muted">${esc(x.title)}</span>` : `<b>${esc(x.title)}</b>`}${x.mine ? theirs : ''}<br>${stepOps('checklist', x)}</dd>`).join('')}</dl></details>`
      : setUp('pf.no_checklist', 'checklist');
    const TWORD = (x) => (x.hidden ? say('pf.hidden') : x.done ? who(x) : say(x.hers ? 'pf.task_yours' : x.overdue ? 'pf.task_overdue' : x.past ? 'pf.task_past' : x.next ? 'pf.task_next' : 'pf.task_later'));
    const shownTasks = steps.tasks.filter((x) => !x.hidden);
    const overdue = shownTasks.filter((x) => x.overdue).length;
    const timelinePart = steps.tasks.length ? `<details${home ? ' open' : ''}><summary><b>${overdue ? t('pf.timeline_overdue', { n: overdue }) : t('pf.timeline_n', { done: shownTasks.filter((x) => x.done).length, total: shownTasks.length })}</b></summary>
      <dl class="kv">${steps.tasks.map((x) => `<dt>${x.due ? esc(formatDay(x.due)) : t('pf.no_day')}</dt><dd>${x.hidden ? `<span class="muted">${esc(x.title)}</span>` : `<b>${esc(x.title)}</b>`} <span${x.overdue && !x.hidden ? ' class="error"' : ' class="hint"'}>${esc(TWORD(x))}</span>${x.moved ? ` <span class="hint">${t('pf.moved')}</span>` : ''}${x.mine ? theirs : ''}<br>${stepOps('task', x)}
        <details><summary class="hint">${t('pf.move')}</summary>${form(`step/task/${esc(x.id)}/day`, `<div class="row"><label>${t('pf.day')}<input type="date" name="day" value="${esc(x.moved ?? '')}"></label></div><p><button>${t('pf.save')}</button> <span class="hint">${t('pf.move_hint', { when: whenWords(x.raw, say).toLowerCase() })}</span></p>`)}</details></dd>`).join('')}</dl></details>`
      : setUp('pf.no_timeline', 'timeline');
    const prods = await products(env, site.id);
    parts.push(`<section class="card" id="steps"><h2>${t('pf.steps_title')}</h2>${checklistPart}
      <details><summary>${t('pf.add_item', { family: f.name })}</summary>${form('steps/new/checklist', `<div class="fgrid">${itemFields('checklist', null, prods, say)}<p><button>${t('pf.add')}</button></p></div>`)}</details>
      ${timelinePart}
      <details><summary>${t('pf.add_task', { family: f.name })}</summary>${form('steps/new/task', `<div class="fgrid">${itemFields('task', null, prods, say)}<p><button>${t('pf.add')}</button></p></div>`)}</details>
      <details><summary>${t('pf.add_ready', { family: f.name })}</summary>${readyForm(`${base}/steps/ready`, prods, { say })}</details>
    </section>`);

    const progs = await programsFor(env, site.id, p);
    if (progs.length) {
      parts.push(`<section class="card" id="programs"><h2>${t('pf.programs')}</h2><p class="hint">${t('pf.programs_hint')}</p>
        ${progs.map((x) => form(`program/${esc(x.id)}`, `<div class="box"><b>${esc(x.name)}</b>${x.status_at ? ` <span class="hint">${t(`pchoice.program.${x.status}`)} ${esc(at(x.status_at))}${x.status_by === 'family' ? t('pf.by_them') : x.status_by === 'breeder' ? t('pf.by_you') : ''}</span>` : ''}
          <div class="row"><label>${t('pf.status')}<select name="status">${Object.keys(PROGRAM_WORDS).map((k) => `<option value="${k}"${x.status === k ? ' selected' : ''}>${t(`pchoice.program.${k}`)}</option>`).join('')}</select></label>
          ${x.portal_per_family ? `<label>${t('pf.code')}<input name="code" value="${esc(x.family_code ?? '')}" maxlength="80"></label>` : ''}</div>
          <p><button>${t('pf.save')}</button></p></div>`)).join('')}</section>`);
    }

    // Extras (plan 8.1): what they bought, and for a stay its skills and weekly updates.
    const cat = await catalog(env, site.id);
    const pex = await extrasFor(env, site.id, p.id);
    const today = localParts(now, s.time_zone).ymd;
    const exParts = [];
    const removeLink = (action) => form(action, `<button class="link">${t('pf.remove')}</button>`, 'inline');
    for (const x of pex) {
      if (!x.confirmed_at) {
        exParts.push(`<div class="box"><p><b>${t('pstay.bought', { extra: x.name })}</b></p><div class="row">${form(`extra/${esc(x.id)}/confirm`, `<button class="primary">${t('pstay.confirm')}</button>`)}${form(`extra/${esc(x.id)}/remove`, `<button>${t('pstay.not_right')}</button>`)}</div></div>`);
        continue;
      }
      if (x.delivery !== 'stay') { exParts.push(`<div class="box"><p><b>${esc(x.name)}</b> ${removeLink(`extra/${esc(x.id)}/remove`)}</p></div>`); continue; }
      const skills = await skillsFor(env, site.id, x.id);
      const ups = await updatesFor(env, site.id, x.id);
      const w = stayWeeks(x.starts_on, p.go_home_on, today);
      const due = !p.picked_up_at && updateDue(x.starts_on, ups[0]?.written_on ?? null, x.every_days, today);
      const last = new Map((ups[0]?.levels ?? []).map((l) => [l.skill_id, l]));
      const when = [
        `${x.starts_on ? t('pstay.from', { day: formatDay(x.starts_on) }) : t('pstay.starts', { weeks: s.timing.stay_starts_weeks })}${p.go_home_on ? ` ${t('pstay.to', { day: formatDay(p.go_home_on) })}` : ''}`,
        w.state === 'staying' ? t('pstay.week', { week: w.week, total: w.total }) : '',
        t('pstay.every', { n: x.every_days }),
        due ? `<b>${t('pstay.due')}</b>` : '',
      ].filter(Boolean).join(' · ');
      exParts.push(`<div class="box" id="stay"><p><b>${esc(x.name)}</b>${x.weeks ? ` <span class="hint">${t('pstay.home_at', { n: x.weeks })}</span>` : ''}</p>
        <p class="hint">${when}</p>
        <details${due ? ' open' : ''}><summary><b>${t(x.every_days === 7 ? 'pstay.write_weekly' : 'pstay.write')}</b></summary>
          <form method="post" action="${base}/extra/${esc(x.id)}/update" enctype="multipart/form-data"><div class="fgrid">
            <label>${t('pstay.note')}<textarea name="note" rows="4" maxlength="3000" placeholder="${t('pstay.note_ph', { name })}"></textarea></label>
            <label>${t('pstay.weight')}<input name="weight" maxlength="30" placeholder="${t('pstay.weight_ph')}"></label>
            ${skills.map((sk) => `<div class="row"><label>${esc(sk.name)}<select name="level.${esc(sk.id)}">${Object.keys(LEVELS).map((k) => `<option value="${k}"${(last.get(sk.id)?.level ?? 'not_started') === k ? ' selected' : ''}>${t(`pchoice.level.${k}`)}</option>`).join('')}</select></label>
              <label>${t('pstay.skill_note')}<input name="note.${esc(sk.id)}" maxlength="200" value="${esc(last.get(sk.id)?.note ?? '')}"></label></div>`).join('')}
            <label>${t('pstay.photos')}<input type="file" name="photos" accept="image/jpeg,image/png,image/webp" multiple><span class="hint">${t('pstay.photos_hint', { n: MAX_PHOTOS })}</span></label>
            <p><button class="primary">${t('pstay.send')}</button> <span class="hint">${t('pstay.send_hint')}</span></p></div></form></details>
        ${ups.length ? `<details><summary>${esc(say.n('pstay.sent', ups.length))}</summary><dl class="kv">${ups.map((u) => `<dt>${t('pstay.week_n', { n: u.week })}<br><span class="hint">${esc(formatDay(u.written_on))}</span></dt><dd>${esc((u.note ?? '').slice(0, 140))}${u.photos.length ? ` <span class="hint">${esc(say.n('pstay.photo_count', u.photos.length))}</span>` : ''} ${removeLink(`extra/${esc(x.id)}/update/${esc(u.id)}/remove`)}</dd>`).join('')}</dl></details>` : ''}
        <details><summary>${t('pstay.skills')}</summary>
          ${skills.length ? `<ul>${skills.map((sk) => `<li>${esc(sk.name)}${sk.from_package ? '' : ` <span class="hint">${t('pstay.yours')}</span>`} ${removeLink(`extra/${esc(x.id)}/skill/${esc(sk.id)}/remove`)}</li>`).join('')}</ul>` : `<p class="muted">${t('pstay.no_skills')}</p>`}
          ${form(`extra/${esc(x.id)}/skill`, `<div class="row"><label>${t('pstay.add_skill')}<input name="name" maxlength="120" required placeholder="${t('pstay.add_skill_ph')}"></label></div><p><button>${t('pf.add')}</button></p>`)}
          ${form(`extra/${esc(x.id)}/start`, `<div class="row"><label>${t('pstay.first_day')}<input type="date" name="day" value="${esc(x.starts_on ?? '')}" required></label></div><p><button>${t('pf.save')}</button></p>`)}
          ${form(`extra/${esc(x.id)}/remove`, `<p><button class="link">${t('pstay.remove_stay')}</button></p>`)}</details></div>`);
    }
    const addable = cat.filter((c) => !pex.some((x) => x.extra_id === c.id));
    parts.push(`<section class="card" id="extras"><h2>${t('pstay.title')}</h2>${exParts.join('') || `<p class="muted">${t('pstay.none')}</p>`}
      ${addable.length ? form('extra', `<div class="row"><label>${t('pstay.add')}<select name="extra_id">${addable.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}${c.portal_delivery === 'stay' ? ` ${t('pstay.a_stay')}` : ''}</option>`).join('')}</select></label></div><p><button>${t('pf.add')}</button> <span class="hint">${t('pstay.add_hint')}</span></p>`) : cat.length ? '' : `<p class="hint">${t('pstay.on_website')}</p>`}</section>`);

    const records = await healthRecords(env, site.id, p.id);
    parts.push(`<section class="card"><h2>${t('pf.records')}</h2>
      ${records.length ? `<dl class="kv">${records.map((r) => `<dt>${esc(formatDay(r.given_on))}</dt><dd><b>${esc(r.name)}</b> · ${esc(recordKind(r))}${r.notes ? ` · ${esc(r.notes)}` : ''} ${form(`record/${esc(r.id)}/remove`, `<button class="link">${t('pf.remove')}</button>`)}</dd>`).join('')}</dl>` : `<p class="muted">${t('pf.records_none')}</p>`}
      <details><summary>${t('pf.record_add')}</summary>${form('record', `<div class="fgrid"><div class="row"><label>${t('pf.record_kind')}<select name="type">${Object.keys(RECORD_TYPES).map((k) => `<option value="${k}">${t(`pchoice.record.${k}`)}</option>`).join('')}</select></label><label>${t('pf.record_date')}<input type="date" name="given_on" required></label></div>
        <label>${t('pf.record_what')}<input name="name" required maxlength="120" placeholder="${t('pf.record_what_ph')}"></label><label>${t('pf.record_notes')}<input name="notes" maxlength="400"></label><p><button>${t('pf.add')}</button></p></div>`)}</details>
    </section>`);

    // The photos the family sees of their puppy, each with Remove for this family only
    // (portal/pups.js removePhoto), and any she removed, to put back. The square is a
    // div (.lib-ph is drawn for a block box), the link inside it.
    const pics = await photosOf(env, site.id, p);
    const gone = await removedPhotosOf(env, site.id, p);
    const thumb = (ph, act, label) => `<div><div class="lib-ph"><a href="/s/${esc(site.subdomain)}/photos/${esc(ph.id)}/full" target="_blank" rel="noopener"><img src="/s/${esc(site.subdomain)}/photos/${esc(ph.id)}/thumb" alt="${esc(ph.alt || say('portalphotos.photo'))}" loading="lazy"></a></div>
      ${form(`photo/${esc(ph.id)}/${act}`, `<button class="link">${esc(say(label))}</button>`)}</div>`;
    parts.push(`<section class="card" id="photos"><h2>${esc(say('portalphotos.title', { name }))}</h2>
      ${pics.length ? `<p class="hint">${esc(say('portalphotos.hint', { name }))}</p><div class="lib-grid">${pics.map((ph) => thumb(ph, 'remove', 'portalphotos.remove')).join('')}</div>` : `<p class="muted">${esc(say('portalphotos.none', { name }))}</p>`}
      ${gone.length ? `<details><summary>${esc(say('portalphotos.removed', { n: gone.length }))}</summary><div class="lib-grid">${gone.map((ph) => thumb(ph, 'back', 'portalphotos.put_back')).join('')}</div></details>` : ''}
    </section>`);

    const contract = p.contract_file_id ? await getFile(env, site.id, p.contract_file_id) : null;
    parts.push(`<section class="card"><h2>${t('pf.contract')}</h2>
      ${contract ? `<p><a href="/s/${esc(site.subdomain)}/portal/file/${esc(contract.id)}">${t('pf.contract_view')}</a> <span class="muted small">${t('pf.contract_added', { time: at(contract.uploaded_at) })}</span></p>` : `<p class="muted">${t('pf.contract_none')}</p>`}
      <form method="post" action="${base}/contract" enctype="multipart/form-data"><label>${t(contract ? 'pf.contract_replace' : 'pf.contract_add')}<input type="file" name="file" accept="application/pdf,image/*" required></label><p><button>${t('pf.upload')}</button></p></form>
    </section>`);

    const kept = p.puppy_id && puppies.some((x) => x.id === p.puppy_id) ? null : await pupOf(env, site.id, p);
    parts.push(form('placement', `<section class="card"><h2>${t('pf.details', { name })}</h2><div class="fgrid">${placementFields(p, puppies, s, { kept: kept?.kept ? kept : null, say })}
      <div class="row"><label>${t('pf.microchip')}<input name="microchip" value="${esc(p.microchip ?? '')}" maxlength="40"></label><label>${t('pf.registration_no')}<input name="registration_no" value="${esc(p.registration_no ?? '')}" maxlength="40"></label></div>
      <div class="fgroup"><h2>${esc(say('keptpups.vet_title', { name }))}</h2><p class="hint">${esc(say('keptpups.vet_hint', { name }))}</p>
        <div class="row"><label>${esc(say('keptpups.vet_clinic'))}<input name="pup_vet_clinic" value="${esc(p.pup_vet_clinic ?? '')}" maxlength="120"></label><label>${esc(say('keptpups.vet_doctor'))}<input name="pup_vet_doctor" value="${esc(p.pup_vet_doctor ?? '')}" maxlength="120"></label></div>
        <div class="row"><label>${esc(say('keptpups.vet_phone'))}<input name="pup_vet_phone" type="tel" value="${esc(p.pup_vet_phone ?? '')}" maxlength="40"></label><label>${esc(say('keptpups.vet_address'))}<input name="pup_vet_address" value="${esc(p.pup_vet_address ?? '')}" maxlength="200"></label></div></div>
      <p><button class="primary">${t('pf.save')}</button></p></div></section>`));

    // Sent home with (portal/admin/bag.js): once she has a bag, or this puppy has one of its own.
    const bag = await bagFor(env, site.id, p);
    const template = (await bagTemplate(env, site.id)).filter(inTemplate);
    if (bag.own || template.length) parts.push(sentHomeCard(`${base}/bag`, bag, template, name, url, say));

    parts.push(form('life', `<section class="card"><h2>${t('pf.life')}</h2><div class="row"><label>${t('pf.status')}<select name="life_status">${['with_family', 'deceased', 'rehomed', 'returned'].map((k) => `<option value="${k}"${p.life_status === k ? ' selected' : ''}>${t(`pf.life.${k}`)}</option>`).join('')}</select></label><label>${t('pf.life_since')}<input type="date" name="on" value="${esc(p.life_status_on ?? '')}"></label></div>
      <p class="hint">${t('pf.life_hint')}</p><p><button>${t('pf.save')}</button></p></section>`));
    if (p.status === 'open' && !p.picked_up_at) {
      parts.push(form('loss', `<details class="card"><summary>${t('pf.lost', { name })}</summary>
        <p class="hint">${t('pf.lost_hint')}</p>
        <div class="row"><label>${t('pf.lost_what')}<select name="reason"><option value="died">${t('pf.lost_died', { name })}</option><option value="failed_health">${t('pf.lost_failed')}</option></select></label><label>${t('pf.lost_on')}<input type="date" name="on"></label></div>
        <p><button>${t('pf.lost_button')}</button></p></details>`));
    }

    const log = await emailLog(env, site.id, p.id);
    parts.push(`<section class="card"><h2>${t('plog.title')}</h2>
      ${log.length ? `<dl class="kv">${log.map((r) => {
        const addr = emails.find((e) => e.email_hash === r.address_hash)?.email ?? say('plog.removed_address');
        const kind = LOG_KINDS.includes(r.kind) ? say(`plog.kind.${r.kind}`) : r.kind;
        const result = LOG_RESULTS.includes(r.result) ? say(`plog.result.${r.result}`) : r.result;
        return `<dt>${esc(at(r.sent_at))}</dt><dd><b>${esc(kind)}</b>: <span${['failed', 'bounced'].includes(r.result) ? ' class="error"' : ''}>${esc(result)}</span> ${t('plog.to', { address: addr })}${r.basis && r.kind !== 'invite' ? `<br><span class="hint">${r.basis.includes('T') ? t('plog.from_deadline', { time: at(r.basis) }) : t('plog.from_go_home', { day: formatDay(r.basis) })}</span>` : ''}</dd>`;
      }).join('')}</dl>` : `<p class="muted">${t('plog.none')}</p>`}</section>`);

    const field = (k) => (k === 'bag' ? say('bag.history') : HISTORY_FIELDS.includes(k) ? say(`phist.${k}`) : k);
    const isTime = (v) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v ?? '');
    const val = (v) => (v === null ? say('phist.blank') : isTime(v) ? at(v) : /_file_id$/.test(v) ? say('phist.a_file') : v);
    const hist = (await history(env, site.id, 'portal_placements', p.id)).filter((h) => !['puppy_id', 'proof_file_id', 'contract_file_id', 'extra_declined'].includes(h.field));
    parts.push(`<details class="card"><summary>${t('phist.title')}</summary><dl class="kv">${hist.map((h) => {
      const undone = h.new_value === null && HISTORY_UNDONE.includes(h.field);
      const was = h.old_value !== null && !undone ? t('phist.was', { value: val(h.old_value) }) : '';
      return `<dt>${esc(at(h.changed_at))}</dt><dd><b>${esc(undone ? `${say(`phist.undone.${h.field}`)}: ${val(h.old_value)}` : `${field(h.field)}: ${val(h.new_value)}`)}</b> <span class="hint">${t('phist.by', { who: say(`phist.by.${h.changed_by}`) })}${was}</span></dd>`;
    }).join('')}</dl></details>`);
  }

  // Messages, from pickup on (plan 2).
  const msgs = await thread(env, site.id, f.id);
  if (msgs.length || (p?.picked_up_at)) {
    await markRead(env, site.id, f.id, 'family');
    parts.push(`<section class="card" id="messages"><h2>${t('plog.messages')}</h2>
      ${msgs.length ? `<dl class="kv">${msgs.map((m) => `<dt>${m.sender === 'family' ? esc(f.name) : t('plog.you')}<br><span class="hint">${esc(at(m.sent_at))}</span></dt><dd>${esc(m.body).replace(/\n/g, '<br>')}</dd>`).join('')}</dl>` : `<p class="muted">${t('plog.messages_none')}</p>`}
      ${form('message', `<label>${t('plog.reply')}<textarea name="body" rows="4" maxlength="${MAX_MESSAGE}" required></textarea><span class="hint">${t('plog.reply_hint')}</span></label><p><button class="primary">${t('plog.send')}</button></p>`)}</section>`);
  }

  parts.push(form('family', `<details class="card"><summary>${t('pf.change')}</summary><div class="fgrid">
    <label>${t('pnew.name')}<input name="name" value="${esc(f.name)}" required maxlength="120"></label>
    <label>${t('pnew.emails')}<input name="emails" value="${esc(emails.map((e) => e.email).join(', '))}" required><span class="hint">${t('pf.change_hint')}</span></label>
    <p><button>${t('pf.save')}</button></p></div></details>`));
  const others = await familyCandidates(env, site.id, f);
  if (others.length) {
    parts.push(form('merge-family', `<details class="card"><summary>${esc(say('familydupes.family_title'))}</summary>
      <p class="hint">${esc(say(f.kennelos_id ? 'familydupes.family_line_kennelos' : 'familydupes.family_line_typed', { family: f.name }))}</p>
      <label>${esc(say('familydupes.family_choose'))}<select name="other" required><option value="">${t('ppup.choose')}</option>${others.map((o) => `<option value="${esc(o.id)}">${esc(o.name)}${o.pup ? ` · ${esc(o.pup)}` : ''}</option>`).join('')}</select></label>
      <p><button>${esc(say('familydupes.family_button'))}</button></p></details>`));
  }
  const typeTo = (key, word) => sayHtml(say, key, {}, { word: `<strong>${esc(word)}</strong>` });
  parts.push(form('delete', `<details class="card danger"><summary>${t('pf.delete')}</summary>
    <p>${t(f.kennelos_id ? 'pf.delete_line_kennelos' : 'pf.delete_line', { n: UNDO_DAYS })}</p>
    <label>${typeTo('pf.type_to_confirm', 'delete')}<input name="confirm" autocomplete="off" required></label><p><button>${t('pf.delete_button')}</button></p></details>`));
  parts.push(form('erase', `<details class="card danger"><summary>${t('pf.erase')}</summary>
    <p>${t('pf.erase_line', { family: f.name })}</p>
    <label>${typeTo('pf.type_to_confirm', 'erase')}<input name="confirm" autocomplete="off" required></label><p><button>${t('pf.erase_button')}</button></p></details>`));
  return parts.join('\n');
}

// The reminder log's kinds and results, and History's fields, in the owner's words
// (plog.*, phist.*); anything else shows as stored.
const LOG_KINDS = ['invite', 'vet_book', 'vet_pickup', 'vet_day_before', 'vet_morning'];
const LOG_RESULTS = ['sent', 'outbox', 'failed', 'delivered', 'bounced'];
const HISTORY_FIELDS = ['picked_up_at', 'pickup_state', 'vet_deadline_at', 'pickup_booked_at', 'go_home_on', 'puppy_id', 'puppy_name', 'call_name', 'microchip', 'registration_no', 'registration',
  'vet_booked_for', 'vet_clinic', 'vet_booked_at', 'proof_file_id', 'proof_uploaded_at', 'proof_accepted_at', 'proof_declined_at', 'contract_file_id', 'life_status', 'life_status_on', 'health_record', 'extra',
  'extra_suggested', 'extra_declined', 'stay_update', 'account_erased', 'checklist', 'task', 'step_hidden', 'step_shown', 'task_day', 'program', 'program_code', 'merged'];
const HISTORY_UNDONE = ['checklist', 'task', 'program_code'];

// ---------- routes ----------

export async function handlePortalAdmin({ env, request, url, site: signedInSite, page, user = null, say = defaultSay }) {
  let site = signedInSite;
  const m = url.pathname.match(/^\/s\/[a-z0-9-]+\/portal(\/.*)?$/);
  if (!m) return null;
  const on = await env.DB.prepare('SELECT portal_on FROM sites WHERE id = ?').bind(site.id).first('portal_on');
  if (!on) return page(say('psetup.tab'), `<section class="card"><p>${esc(say('psetup.off'))}</p></section>`, { status: 404, back: `/s/${site.subdomain}` });
  const rest = m[1] ?? '';
  const post = request.method === 'POST';
  // With its own domain, for links in emails and the address shown to her.
  const full = await env.DB.prepare(`SELECT s.id, s.subdomain, s.kennel_name, s.contact_phone, s.contact_email, s.portal_feed_at, d.hostname AS domain FROM sites s
    LEFT JOIN custom_domains d ON d.site_id = s.id AND d.status = 'active' WHERE s.id = ?`).bind(site.id).first();
  site = { ...site, domain: full.domain, kennel_name: full.kennel_name, contactPhone: full.contact_phone, contactEmail: full.contact_email, feedAt: full.portal_feed_at, portalUrl: `${portalBase(env, full).replace(/^https:\/\//, '')}/family` };
  const home = `/s/${site.subdomain}/portal`;
  const back = `/s/${site.subdomain}`;
  const s = await getSettings(env, site.id);

  const tabs = (tab) => ({ nav: { sub: site.subdomain, tab } });
  if (!rest && !post) {
    const kennel = full.kennel_name || site.subdomain;
    const w = await waitlistCount(env, site);
    if (url.searchParams.get('show') === 'waitlist') return page(say('pfam.title'), await waitlistPart(env, site, kennel, w, say), tabs('families'));
    const families = await listFamilies(env, site.id);
    return page(say('pfam.title'), familiesScreen(site, families, s, url, { deleted: await recentlyDeleted(env, site.id), erased: await erasedRecords(env, site.id), gone: await deletedForGood(env, site.id), waitlistCount: w.n, kennel, say }), tabs('families'));
  }
  // The Portal tab (plan 7.3): what families see, in one place.
  if (rest === '/setup' && !post) return page(say('psetup.tab'), setupScreen(site, s, say), tabs('portal'));
  const um = rest.match(/^\/undo\/([0-9a-f-]{36})$/);
  if (um && post) {
    try { await undoDelete(env, site.id, um[1]); } catch (err) { if (!(err instanceof PortalError)) throw err; }
    return redirect(`${home}/f/${um[1]}?note=undone`);
  }
  // Delete now, from Recently deleted; and giving back one deleted for good.
  const gm = rest.match(/^\/gone\/([0-9a-f-]{36})$/);
  if (gm && post) {
    const form = await request.formData();
    if (String(form.get('confirm') ?? '').trim().toLowerCase() !== 'delete') return redirect(`${home}#deleted`);
    try { await deleteNow(env, site.id, gm[1]); } catch (err) { if (!(err instanceof PortalError)) throw err; }
    return redirect(`${home}?note=gonenow`);
  }
  if (rest === '/giveback' && post) {
    const form = await request.formData();
    try { await giveBack(env, site.id, String(form.get('kennelos_id') ?? '')); } catch (err) { if (!(err instanceof PortalError)) throw err; }
    return redirect(`${home}?note=givenback`);
  }

  if (rest === '/settings/suggestion' && post) {
    const form = await request.formData();
    const field = String(form.get('field') ?? '');
    if (form.get('act') === 'use') await takeSuggestion(env, site.id, 'portal_settings', site.id, field);
    else await ignoreSuggestion(env, site.id, 'portal_settings', site.id, field);
    return redirect(`${home}/settings?note=saved`);
  }
  if (rest === '/settings') {
    const waiting = await suggestionsFor(env, site.id, 'portal_settings', site.id);
    if (!post) return page(say('pset.title'), settingsScreen(site, s, await products(env, site.id), { waiting, extras: await catalog(env, site.id), say }, url), { back: `${home}/setup` });
    const form = await request.formData();
    const input = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
    try {
      await saveSettings(env, site.id, input);
    } catch (err) {
      if (err instanceof PortalError) return page(say('pset.title'), settingsScreen(site, { ...s, ...input }, await products(env, site.id), { error: err.message, say }), { back: home, status: 400 });
      throw err;
    }
    await saveDelivery(env, site.id, input);
    const TYPES = ['food', 'insurance', 'registration', 'product', 'other'];
    const list = await products(env, site.id);
    if (list.length) {
      await env.DB.batch(list.map((x) => {
        const type = input[`type.${x.id}`] ?? '';
        return env.DB.prepare('UPDATE products SET portal_show = ?, portal_type = ?, family_action = ?, portal_per_family = ? WHERE id = ? AND site_id = ?')
          .bind(TYPES.includes(type) ? 1 : 0, TYPES.includes(type) ? type : x.portal_type, String(input[`action.${x.id}`] ?? '').trim().slice(0, 200) || null, input[`own.${x.id}`] ? 1 : 0, x.id, site.id);
      }));
    }
    return redirect(`${home}/settings?note=saved`);
  }

  // Her puppy handbook (portal/admin/handbook.js).
  const hm = rest.match(/^\/handbook(?:\/(new|upload|[0-9a-f-]{36})(?:\/(up|down|remove|photo\/(\d{1,3})))?)?$/);
  if (hm) {
    const here = `${home}/handbook`;
    const programs = await linkablePrograms(env, site.id);
    const livePhotos = async () => (await env.DB.prepare('SELECT id, alt FROM photos WHERE site_id = ? AND removed_at IS NULL ORDER BY created_at DESC LIMIT 400').bind(site.id).all()).results;
    const show = async (opts = {}) => page(say('handbook.title'), handbookScreen(site, await listChapters(env, site.id), programs, url, { ...opts, say, live: new Set((await livePhotos()).map((x) => x.id)) }), { back: `${home}/setup`, status: opts.error ? 400 : 200 });
    // A photo for one of a chapter's photo spots.
    if (hm[3] !== undefined) {
      const c = await getChapter(env, site.id, hm[1]);
      const spot = c && photoTags(c.body)[Number(hm[3])];
      if (!spot) return redirect(here);
      const picker = async (error) => page(say('handbook.title'), photoScreen(site, c, spot, await livePhotos(), say, { error }), { back: `${here}#c-${c.id}`, status: error ? 400 : 200 });
      if (!post) return picker();
      const form = await request.formData();
      const photo = form.get('leave') ? null : String(form.get('photo') ?? '');
      if (photo === '') return picker(say('handbook.photo_pick'));
      try { await setChapterPhoto(env, site.id, c.id, spot.n, photo); } catch (err) {
        if (err instanceof PortalError) return picker(say(err.message));
        throw err;
      }
      return redirect(`${here}?note=${photo ? 'photo_set' : 'saved'}#c-${c.id}`);
    }
    if (!post) {
      if (!hm[1]) return show();
      if (hm[2] !== 'remove' || hm[1] === 'new' || hm[1] === 'upload') return null;
      const c = await getChapter(env, site.id, hm[1]);
      return c ? page(say('handbook.title'), removeScreen(site, c, say), { back: here }) : redirect(here);
    }
    if (!hm[1]) return null;
    // Chapters from a file she made with Claude (handbook.js chaptersFrom).
    if (hm[1] === 'upload') {
      if (hm[2]) return null;
      const form = await request.formData();
      const file = form.get('file');
      try {
        if (!file || typeof file === 'string' || !file.size) throw new PortalError('handbook.upload_none');
        if (file.size > MAX_UPLOAD) throw new PortalError('handbook.upload_big');
        if (!/\.(md|markdown|txt|html?)$/i.test(file.name ?? '') && !/^text\//.test(file.type ?? '')) throw new PortalError('handbook.upload_type');
        const text = new TextDecoder('utf-8', { fatal: false }).decode(await file.arrayBuffer());
        if (text.includes('\u0000')) throw new PortalError('handbook.upload_type');
        const shown = Boolean(form.get('shown'));
        const { added, replaced } = await importChapters(env, site.id, chaptersFrom(text, file.name ?? ''), { replace: Boolean(form.get('replace')), shown });
        return redirect(`${here}?note=imported&a=${added}&r=${replaced}${shown ? '&on=1' : ''}`);
      } catch (err) {
        if (err instanceof PortalError) return show({ error: say(err.message) });
        throw err;
      }
    }
    if (hm[2] === 'remove') { await removeChapter(env, site.id, hm[1]); return redirect(`${here}?note=removed`); }
    if (hm[2]) { await moveChapter(env, site.id, hm[1], hm[2]); return redirect(`${here}#c-${hm[1]}`); }
    const form = await request.formData();
    const values = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
    try {
      const id = await saveChapter(env, site.id, hm[1] === 'new' ? null : hm[1], values, programs);
      return redirect(`${here}?note=${hm[1] === 'new' ? 'added' : 'saved'}#c-${id}`);
    } catch (err) {
      if (err instanceof PortalError) return show({ error: say(err.message), values: hm[1] === 'new' ? { ...values, shown: values.shown ? 1 : 0 } : null });
      throw err;
    }
  }

  // Her go-home bag (portal/admin/bag.js).
  const bm = rest.match(/^\/bag(?:\/(new|[0-9a-f-]{36})(?:\/(up|down|remove))?)?$/);
  if (bm) {
    const here = `${home}/bag`;
    const programs = await bagPrograms(env, site.id);
    const show = async (opts = {}) => page(say('bag.title'), bagScreen(site, await bagTemplate(env, site.id), programs, url, { ...opts, say }), { back: `${home}/setup`, status: opts.error ? 400 : 200 });
    // One item, to change (its own screen, opened from the list).
    const itemPage = async (id, opts = {}) => {
      const list = await bagTemplate(env, site.id);
      const i = list.findIndex((x) => x.id === id);
      if (i < 0) return redirect(here);
      return page(say('bag.title'), bagItemScreen(site, list[i], i, list.length, programs, { ...opts, say }), { back: `${here}#b-${id}`, status: opts.error ? 400 : 200 });
    };
    if (!post) {
      if (!bm[1]) return show();
      if (bm[1] === 'new') return null;
      if (!bm[2]) return itemPage(bm[1]);
      if (bm[2] !== 'remove') return null;
      const x = await getBagItem(env, site.id, bm[1]);
      return x ? page(say('bag.title'), removeBagScreen(site, x, say), { back: here }) : redirect(here);
    }
    if (!bm[1]) return null;
    let values = null;
    try {
      if (bm[2] === 'remove') { await removeBagItem(env, site.id, bm[1]); return redirect(`${here}?note=removed`); }
      if (bm[2]) { await moveBagItem(env, site.id, bm[1], bm[2]); return redirect(`${here}/${bm[1]}`); }
      const form = await request.formData();
      values = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
      const id = await saveBagItem(env, site.id, bm[1] === 'new' ? null : bm[1], values, say);
      return redirect(`${here}?note=${bm[1] === 'new' ? 'added' : 'saved'}#b-${id}`);
    } catch (err) {
      const kept = values ? { ...values, shown: values.shown ? 1 : 0, expense: values.expense ? 1 : 0, product_id: values.product_id || null } : null;
      if (err instanceof PortalError && bm[1] !== 'new' && !bm[2]) return itemPage(bm[1], { error: say(err.message), values: kept });
      if (err instanceof PortalError) return show({ error: say(err.message), values: bm[1] === 'new' ? kept : null });
      throw err;
    }
  }

  // Her checklist and timeline templates.
  const tm = rest.match(/^\/(checklist|timeline)(?:\/(suggested|new|ready|[0-9a-f-]{36})(?:\/(up|down|remove))?)?$/);
  if (tm) {
    const kind = tm[1] === 'checklist' ? 'checklist' : 'task';
    const here = `${home}/${tm[1]}`;
    const show = async (opts = {}) => page(say(`ptpl.${kind}.title`), templateScreen(site, kind, await listItems(env, site.id, kind), await products(env, site.id), url, { ...opts, say, names: await puppyNames(env, site.id), timing: (await getSettings(env, site.id)).timing }), { back: `${home}/settings`, status: opts.error ? 400 : 200 });
    if (!post) return tm[2] ? null : show();
    try {
      if (tm[2] === 'suggested') { await addSuggested(env, site.id, kind); return redirect(`${here}?note=suggested`); }
      if (tm[3] === 'remove') { await removeItem(env, site.id, kind, tm[2]); return redirect(`${here}?note=stepremoved`); }
      if (tm[3]) { await moveItem(env, site.id, kind, tm[2], tm[3]); return redirect(here); }
      const form = await request.formData();
      if (tm[2] === 'ready') {
        if (kind !== 'task') return null;
        await addReady(env, site.id, form.get('ready'));
        return redirect(`${here}?note=stepadded`);
      }
      const values = formOffset(Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)])));
      await saveItem(env, site.id, kind, tm[2] === 'new' ? null : tm[2], values);
      return redirect(`${here}?note=${tm[2] === 'new' ? 'stepadded' : 'saved'}`);
    } catch (err) {
      if (err instanceof PortalError) return show({ error: err.message });
      throw err;
    }
  }

  let fm = rest.match(/^\/file\/([0-9a-f-]{36})$/);
  if (fm && !post) {
    const file = await getFile(env, site.id, fm[1]);
    return file ? fileResponse(env, file) : new Response('Not found', { status: 404 });
  }

  if (rest === '/new') {
    const puppies = await placeablePuppies(env, site.id);
    if (!post) return page(say('pfam.add'), newScreen(site, puppies, s, { say }), { back: home, backLabel: say('pfam.title') });
    const form = await request.formData();
    const values = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
    let familyId = null;
    try {
      if (!values.puppy_id) throw new PortalError('Choose the puppy.');
      familyId = await createFamily(env, site.id, values);
      await createPlacement(env, site.id, familyId, values);
    } catch (err) {
      if (!(err instanceof PortalError)) throw err;
      if (familyId) await deleteFamily(env, site.id, familyId);
      return page(say('pfam.add'), newScreen(site, puppies, s, { error: err.message, values, say }), { back: home, status: 400 });
    }
    return redirect(`${home}/f/${familyId}?note=added`);
  }

  fm = rest.match(/^\/f\/([0-9a-f-]{36})(?:\/(.+))?$/);
  if (!fm) return null;
  const [, familyId, action] = fm;
  const show = async (opts) => {
    const body = await familyScreen(env, site, familyId, url, { say, ...opts });
    return body ? page(say('pf.title'), body, { back: home, backLabel: say('pfam.title'), status: opts?.error ? 400 : 200 }) : page(say('pf.not_found'), `<section class="card"><p>${esc(say('pf.no_such'))}</p></section>`, { status: 404, back: home });
  };
  // See their portal (plan family-view.md): a once-only link to her site's address.
  // A GET, since the Site Manager's forms may only post to itself.
  if (!post && action === 'view') {
    if (!user || !(await getFamily(env, site.id, familyId))) return show();
    // The owner signed in through /ops may not be one of the site's people.
    const member = user.sites?.some((x) => x.id === site.id && x.role !== 'admin');
    const link = await makeViewLink(env, site.id, familyId, user.admin && !member ? VIEW_AS_ADMIN : user.emailHash);
    return new Response(null, { status: 303, headers: { location: `${portalBase(env, site)}/family/view?t=${link}`, 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } });
  }
  if (!post) return action ? null : show();

  const fam = await getFamily(env, site.id, familyId);
  if (!fam) return show();
  const p = await placementFor(env, site.id, familyId);
  const to = (n) => redirect(`${home}/f/${familyId}?note=${n}`);
  try {
    const isFile = action === 'contract' || /\/update$/.test(action ?? '');
    if (action === 'contract' && Number(request.headers.get('content-length') ?? 0) > MAX_FILE_BYTES + 64 * 1024) throw new PortalError('That file is over 10 MB.');
    if (isFile && Number(request.headers.get('content-length') ?? 0) > (MAX_PHOTOS + 1) * MAX_FILE_BYTES) throw new PortalError('Those photos are too large together.');
    const form = await request.formData();
    const get = (k) => String(form.get(k) ?? '');
    const values = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === 'string'));
    const needP = () => { if (!p) throw new PortalError('Add their puppy first.'); return p; };
    switch (action) {
      case 'invite': {
        const r = await sendInvites(env, site, familyId);
        if (r.failed) throw new PortalError(`${r.failed} invite${r.failed === 1 ? '' : 's'} could not be sent. Try again in a minute.`);
        return to('invited');
      }
      case 'family': await updateFamily(env, site.id, familyId, values); return to('saved');
      case 'placement':
        // The kept puppy (its litter has left the website): the puppy stays as it is.
        if (values.puppy_id === KEPT_PUPPY) delete values.puppy_id;
        if (p) await updatePlacement(env, site.id, p.id, values);
        else await createPlacement(env, site.id, familyId, values);
        return to('saved');
      case 'picked-up': {
        const after = await markPickedUp(env, site.id, needP().id, get('day') ? { day: get('day'), time: get('time') } : {});
        await fixBag(env, site.id, after, 'breeder');
        try { await sendDueFor(env, site, after, s); } catch (err) { if (!(err instanceof MailError)) throw err; }
        return to('pickedup');
      }
      case 'confirm': await confirmPickup(env, site.id, needP().id); return to('confirmed');
      case 'not-yet': await pickupNotYet(env, site.id, needP().id); return to('notyet');
      case 'accept': await acceptProof(env, site.id, needP().id); return to('accepted');
      case 'decline': await declineProof(env, site.id, needP().id); return to('declined');
      case 'bag':
        try { await saveBag(env, site.id, needP(), form); } catch (err) {
          if (err instanceof PortalError && /^bag\./.test(err.message)) throw new PortalError(say(err.message));
          throw err;
        }
        return redirect(`${home}/f/${familyId}?note=bag#bag`);
      case 'life': await setLifeStatus(env, site.id, needP().id, get('life_status'), get('on')); return to('saved');
      case 'record': await addHealthRecord(env, site.id, needP().id, values); return to('record');
      case 'contract': {
        const file = form.get('file');
        if (!file || typeof file === 'string') throw new PortalError('Choose a file.');
        await saveFile(env, site.id, needP().id, { kind: 'contract', bytes: new Uint8Array(await file.arrayBuffer()), name: file.name, by: 'breeder' });
        return to('contract');
      }
      case 'suggestion': {
        const tbl = get('tbl');
        if (tbl !== 'portal_families' && tbl !== 'portal_placements') throw new PortalError('Unknown value.');
        const rowId = tbl === 'portal_families' ? familyId : needP().id;
        if (get('act') === 'use') await takeSuggestion(env, site.id, tbl, rowId, get('field'));
        else await ignoreSuggestion(env, site.id, tbl, rowId, get('field'));
        return to('saved');
      }
      case 'message': await breederWrites(env, site, familyId, get('body')); return redirect(`${home}/f/${familyId}?note=sent#messages`);
      case 'loss': await markLoss(env, site.id, needP().id, get('reason'), get('on')); return redirect(`${home}/f/${familyId}?note=loss#loss`);
      case 'loss-note': {
        const r = await saveLossNote(env, site, needP().id, get('note'), { send: get('send') === '1' });
        return redirect(`${home}/f/${familyId}?note=${r?.sent ? 'losssent' : 'lossnote'}#loss`);
      }
      case 'erase':
        if (get('confirm').trim().toLowerCase() !== 'erase') throw new PortalError('Type erase to confirm.');
        await eraseFamily(env, site.id, familyId, 'breeder');
        return redirect(`${home}?note=erased`);
      case 'merge-placement': await mergePlacement(env, site.id, familyId, get('from'), get('into')); return to('merged');
      case 'merge-family': {
        const kept = await mergeFamily(env, site.id, familyId, get('other'));
        return redirect(`${home}/f/${kept}?note=familymerged`);
      }
      case 'delete':
        if (get('confirm').trim().toLowerCase() !== 'delete') throw new PortalError('Type delete to confirm.');
        await scheduleDelete(env, site.id, familyId, 'breeder');
        return redirect(`${home}?note=deleted`);
      default: {
        const rm = action?.match(/^record\/([0-9a-f-]{36})\/remove$/);
        if (rm) { await removeHealthRecord(env, site.id, needP().id, rm[1]); return to('removed'); }
        const phm = action?.match(/^photo\/([0-9a-f-]{36})\/(remove|back)$/);
        if (phm) {
          const pl = needP();
          if (phm[2] === 'back') await putBackPhoto(env, site.id, pl.id, phm[1]);
          else if ((await photosOf(env, site.id, pl)).some((ph) => ph.id === phm[1])) await removePhoto(env, site.id, pl.id, phm[1]);
          return redirect(`${home}/f/${familyId}?note=${phm[2] === 'back' ? 'photoback' : 'photoremoved'}#photos`);
        }
        const sm = action?.match(/^step\/(checklist|task)\/([0-9a-f-]{36})\/(done|undo|hide|show|remove|day)$/);
        if (sm) {
          const [, kind, id, what] = sm;
          const pl = needP();
          if (what === 'done' || what === 'undo') await setDone(env, site.id, pl, kind, id, what === 'done', 'breeder');
          else if (what === 'hide' || what === 'show') await setHidden(env, site.id, pl, kind, id, what === 'hide');
          else if (what === 'remove') await removeItem(env, site.id, kind, id, pl.id);
          else if (kind === 'task') await setDueOn(env, site.id, pl, id, get('day'));
          return redirect(`${home}/f/${familyId}?note=step#steps`);
        }
        if (action === 'extra') { await addExtra(env, site.id, needP().id, get('extra_id')); return redirect(`${home}/f/${familyId}?note=extra#extras`); }
        const xm = action?.match(/^extra\/([0-9a-f-]{36})\/(confirm|remove|start|skill|update)(?:\/([0-9a-f-]{36})\/remove|\/remove)?$/);
        if (xm) {
          const [, peId, what, sub] = xm;
          const pl = needP();
          const back = (n) => redirect(`${home}/f/${familyId}?note=${n}#extras`);
          if (what === 'confirm') { await confirmExtra(env, site.id, pl.id, peId); return back('saved'); }
          if (what === 'remove') { await removeExtra(env, site.id, pl.id, peId); return back('extraremoved'); }
          if (what === 'start') { await setStayStart(env, site.id, pl.id, peId, get('day')); return back('saved'); }
          if (what === 'skill' && action.endsWith('/remove')) { await removeSkill(env, site.id, peId, sub); return back('saved'); }
          if (what === 'skill') { await addSkill(env, site.id, peId, get('name')); return back('saved'); }
          if (what === 'update' && action.endsWith('/remove')) { await removeUpdate(env, site.id, pl.id, sub); return back('saved'); }
          const photos = [];
          for (const f of form.getAll('photos')) if (f && typeof f !== 'string' && f.size) photos.push(new Uint8Array(await f.arrayBuffer()));
          await writeUpdate(env, site, s, pl.id, peId, values, photos);
          return back('update');
        }
        if (action === 'steps/ready') {
          await addReady(env, site.id, get('ready'), needP().id);
          return redirect(`${home}/f/${familyId}?note=stepadded#steps`);
        }
        const nm = action?.match(/^steps\/new\/(checklist|task)$/);
        if (nm) {
          await saveItem(env, site.id, nm[1], null, formOffset(values), needP().id);
          return redirect(`${home}/f/${familyId}?note=stepadded#steps`);
        }
        const pm = action?.match(/^program\/([\w-]{1,64})$/);
        if (pm) {
          const pl = needP();
          await setProgramStatus(env, site.id, pl, pm[1], get('status'), 'breeder');
          if (form.has('code')) await setProgramCode(env, site.id, pl, pm[1], get('code'));
          return redirect(`${home}/f/${familyId}?note=saved#programs`);
        }
        return null;
      }
    }
  } catch (err) {
    if (err instanceof PortalError) return show({ error: err.message });
    throw err;
  }
}

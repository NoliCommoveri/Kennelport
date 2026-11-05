// Her side of the portal (docs/Puppy_Parent_Portal_Plan.md section 7.3), in the
// Site Manager under /s/<subdomain>/portal: puppy families, each family's screen
// (invite, pickup, vet visit, records, contract, reminder log, history), and the
// portal's settings and programs. Build chunk 1 adds these as their own section;
// chunk 6 folds them into the app's Today / Families / Dogs / Portal tabs.
//
// Uses the manage app's own page frame and styles (public/_kp/m/app.css), so it
// needs no change to the app's cached files.
import { escapeHtml as esc } from '../lib/html.js';
import {
  getSettings, saveSettings, listFamilies, getFamily, familyEmails, createFamily, updateFamily, deleteFamily,
  placementFor, createPlacement, updatePlacement, markPickedUp, confirmPickup, pickupNotYet, acceptProof, setLifeStatus,
  addHealthRecord, removeHealthRecord, healthRecords, saveFile, getFile, fileResponse, emailLog, history, placeablePuppies, puppyFor,
  PortalError, RECORD_TYPES, MAX_FILE_BYTES, DEFAULT_DISCLOSURE,
} from './store.js';
import { sendInvites, portalBase } from './auth.js';
import {
  listItems, saveItem, removeItem, moveItem, addSuggested, stepsFor, programsFor, setDone, setHidden, setDueOn, setProgramStatus, setProgramCode,
  CHECK_AUTO, TASK_AUTO, PROGRAM_WORDS,
} from './steps.js';
import { sendDueFor } from './reminders.js';
import { vetStatus, formatAt, formatDay, localParts, timeLeft, clockRunning, VET_RULES } from './vet.js';
import { MailError } from '../mail.js';
import { roundPhoto } from '../manage/hub.js';
import {
  catalog, saveDelivery, extrasFor, addExtra, confirmExtra, removeExtra, setStayStart, skillsFor, addSkill, removeSkill, updatesFor, writeUpdate, removeUpdate,
  updatesDue, stayWeeks, updateDue, LEVELS, MAX_PHOTOS,
} from './stays.js';
import { suggestionsFor, takeSuggestion, ignoreSuggestion, QUIET_MS } from './feed.js';
import {
  thread, markRead, breederWrites, markLoss, isLoss, lossDraft, saveLossNote, scheduleDelete, undoDelete, recentlyDeleted, eraseFamily, erasedRecords, MAX_MESSAGE, UNDO_DAYS,
} from './account.js';

// "2 hours ago", for Last from KennelOS.
export function ago(at, now = new Date()) {
  const m = Math.max(0, Math.round((now.getTime() - Date.parse(at)) / 60000));
  if (m < 2) return 'just now';
  if (m < 60) return `${m} minutes ago`;
  const h = Math.round(m / 60);
  if (h < 36) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24);
  return `${d} days ago`;
}
const CLOSED = { died: 'the puppy died', failed_health: 'the puppy failed a health check', backed_out: 'the family backed out', other: 'the sale was voided' };
const SUGGEST_LABEL = { name: 'Family name', puppy_id: 'Puppy', puppy_name: 'Puppy', go_home_on: 'Go-home', pickup_booked_at: 'Pickup booked for', microchip: 'Microchip', registration_no: 'Registration number', vet_clinic: 'Vet\'s clinic', vet_doctor: 'Vet\'s name', vet_phone: 'Vet\'s phone', vet_address: 'Vet\'s address' };

const redirect = (location) => new Response(null, { status: 303, headers: { location, 'cache-control': 'no-store' } });

const NOTES = {
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
const note = (url) => (NOTES[url.searchParams.get('note')] ? `<p class="notice" role="status">${esc(NOTES[url.searchParams.get('note')])}</p>` : '');
const errorBox = (err) => (err ? `<p class="error" role="alert">Not saved: ${esc(err)}</p>` : '');
const pupName = (p) => p.call_name || p.puppy_name;

const ZONES = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu', 'America/Halifax', 'America/Toronto', 'America/Winnipeg', 'America/Edmonton', 'America/Vancouver'];
const ZONE_NAMES = { 'America/New_York': 'Eastern', 'America/Chicago': 'Central', 'America/Denver': 'Mountain', 'America/Phoenix': 'Arizona', 'America/Los_Angeles': 'Pacific', 'America/Anchorage': 'Alaska', 'Pacific/Honolulu': 'Hawaii', 'America/Halifax': 'Atlantic (Halifax)', 'America/Toronto': 'Eastern (Toronto)', 'America/Winnipeg': 'Central (Winnipeg)', 'America/Edmonton': 'Mountain (Edmonton)', 'America/Vancouver': 'Pacific (Vancouver)' };

// ---------- Today ----------

// What the portal needs from her, for the "Needs you" list on her Today screen.
// Each: { href (under /s/<sub>), label, note }. Only what's there.
export async function portalNeedsYou(env, siteId, now = new Date()) {
  if (!(await env.DB.prepare('SELECT portal_on FROM sites WHERE id = ?').bind(siteId).first('portal_on'))) return [];
  const s = await getSettings(env, siteId);
  const t = now.getTime();
  const out = [];
  for (const f of await listFamilies(env, siteId)) {
    if (!f.placement_id || f.life_status !== 'with_family') continue;
    const href = `/portal/f/${f.id}`;
    const name = f.call_name || f.puppy_name;
    if (f.pickup_state === 'assumed') {
      out.push({ href, label: `Did ${name} go home at ${formatAt(f.pickup_booked_at, s.time_zone, { weekday: false })}?`, note: 'The vet clock started from the booked time. Confirm or change it.' });
      continue;
    }
    if (f.proof_uploaded_at && !f.proof_accepted_at) out.push({ href, label: `Vet record to review: ${name}`, note: f.name });
    const v = vetStatus(f, now);
    if (clockRunning(f) && v.trouble) out.push({ href, label: `${name}: vet visit ${v.word.toLowerCase()}`, note: v.word === 'Missed' ? `Deadline was ${formatAt(f.vet_deadline_at, s.time_zone)}` : `${timeLeft(f.vet_deadline_at, now)} left` });
    // Going home in the next 7 days has its own card on Today (manage/hub.js goingHome);
    // here only what that card doesn't say: not invited yet.
    if (!f.picked_up_at && f.pickup_state !== 'not_yet' && !f.invited_at && !f.kennelos_id) {
      const at = f.pickup_booked_at ? Date.parse(f.pickup_booked_at) : f.go_home_on ? Date.parse(`${f.go_home_on}T12:00:00Z`) : null;
      if (at && at - t < 7 * 86400000) out.push({ href, label: `${name} goes home soon: ${f.name} not invited yet`, note: 'Send their invite so they see the countdown and vet visit' });
    }
  }
  // From the KennelOS feed (plan 3.4): new families to invite, sales voided, records
  // no longer in KennelOS, newer values waiting, and a feed gone quiet.
  const { results: kos } = await env.DB.prepare(`SELECT f.id, f.name, f.invited_at, f.kennelos_gone_at,
      (SELECT COUNT(*) FROM portal_suggestions g WHERE g.ignored = 0 AND ((g.tbl = 'portal_families' AND g.row_id = f.id) OR (g.tbl = 'portal_placements' AND g.row_id IN (SELECT id FROM portal_placements WHERE family_id = f.id)))) AS waiting
    FROM portal_families f WHERE f.site_id = ? AND f.status = 'active' AND f.deleted_at IS NULL AND f.kennelos_id IS NOT NULL`).bind(siteId).all();
  for (const f of kos) {
    const href = `/portal/f/${f.id}`;
    if (!f.invited_at) out.push({ href, label: `Invite ${f.name}`, note: 'Their contract is signed in KennelOS. Check their details, then send the invite.' });
    if (f.kennelos_gone_at) out.push({ href, label: `${f.name}: no longer in KennelOS`, note: 'Nothing was removed here. Decide what it means.' });
    if (f.waiting) out.push({ href, label: `${f.name}: KennelOS has ${f.waiting === 1 ? 'a newer value' : `${f.waiting} newer values`}`, note: 'Use it or ignore it; yours stays until you choose' });
  }
  const { results: voided } = await env.DB.prepare(`SELECT p.family_id, p.puppy_name, p.call_name, p.closed_reason, p.kennelos_gone_at FROM portal_placements p
    WHERE p.site_id = ? AND ((p.status = 'closed' AND p.closed_reason IS NOT NULL AND p.updated_at > ?) OR (p.status = 'open' AND p.kennelos_gone_at IS NOT NULL))`).bind(siteId, new Date(t - 14 * 86400000).toISOString()).all();
  for (const p of voided) {
    out.push(p.kennelos_gone_at && !p.closed_reason
      ? { href: `/portal/f/${p.family_id}`, label: `${p.call_name || p.puppy_name}: no longer in KennelOS`, note: 'The placement is still open here. Decide what it means.' }
      : { href: `/portal/f/${p.family_id}`, label: `${p.call_name || p.puppy_name}'s placement closed`, note: `From KennelOS: ${CLOSED[p.closed_reason]}. Reminders have stopped.` });
  }
  // Messages from families, a loss to write about, a back-out on its way out.
  const { results: unread } = await env.DB.prepare(`SELECT f.id, f.name, COUNT(*) AS n FROM portal_messages m JOIN portal_families f ON f.id = m.family_id
    WHERE m.site_id = ? AND m.sender = 'family' AND m.read_at IS NULL AND f.status = 'active' AND f.deleted_at IS NULL GROUP BY f.id`).bind(siteId).all();
  for (const f of unread) out.unshift({ href: `/portal/f/${f.id}#messages`, label: `New message${f.n === 1 ? '' : `s (${f.n})`} from ${f.name}`, note: 'From their puppy portal' });
  const { results: losses } = await env.DB.prepare(`SELECT f.id, f.name FROM portal_placements p JOIN portal_families f ON f.id = p.family_id
    WHERE p.site_id = ? AND p.status = 'closed' AND p.closed_reason IN ('died', 'failed_health') AND p.picked_up_at IS NULL AND p.loss_note IS NULL AND f.status = 'active' AND f.deleted_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM portal_placements o WHERE o.family_id = f.id AND o.status = 'open')`).bind(siteId).all();
  for (const f of losses) out.unshift({ href: `/portal/f/${f.id}#loss`, label: `Write to ${f.name}`, note: 'Their portal shows a quiet page; your note goes on it' });
  for (const f of await recentlyDeleted(env, siteId)) {
    if (f.delete_reason === 'backed_out') out.push({ href: '/portal#deleted', label: `${f.name} backed out`, note: `Their portal account goes ${formatDay(new Date(Date.parse(f.deleted_at) + UNDO_DAYS * 86400000).toISOString().slice(0, 10))}. Undo on Puppy families.` });
  }
  // Extended stays: updates due, and extras KennelOS says they bought, to confirm.
  for (const x of await updatesDue(env, siteId, s.time_zone, now)) {
    out.push({ href: `/portal/f/${x.family_id}#stay`, label: `${x.name}: ${x.every_days === 7 ? 'weekly ' : ''}update due`, note: x.ago === null ? 'No update yet this stay' : `Last one ${x.ago} day${x.ago === 1 ? '' : 's'} ago` });
  }
  const { results: unconfirmed } = await env.DB.prepare(`SELECT pe.name, p.family_id, f.name AS family FROM portal_placement_extras pe JOIN portal_placements p ON p.id = pe.placement_id JOIN portal_families f ON f.id = p.family_id
    WHERE pe.site_id = ? AND pe.confirmed_at IS NULL AND p.status = 'open' AND f.status = 'active' AND f.deleted_at IS NULL`).bind(siteId).all();
  for (const x of unconfirmed) out.push({ href: `/portal/f/${x.family_id}#extras`, label: `${x.family} bought ${x.name}`, note: 'From KennelOS. Confirm it on their screen' });
  const vetWaiting = await env.DB.prepare("SELECT COUNT(*) AS n FROM portal_suggestions WHERE site_id = ? AND tbl = 'portal_settings' AND ignored = 0").bind(siteId).first('n');
  if (vetWaiting) out.push({ href: '/portal/settings', label: 'KennelOS has your vet\'s details', note: 'Use them for families or ignore them' });
  const feedAt = await env.DB.prepare('SELECT portal_feed_at FROM sites WHERE id = ?').bind(siteId).first('portal_feed_at');
  if (feedAt && t - Date.parse(feedAt) > QUIET_MS) {
    const open = await env.DB.prepare("SELECT 1 FROM portal_placements WHERE site_id = ? AND status = 'open' AND kennelos_id IS NOT NULL LIMIT 1").bind(siteId).first();
    if (open) out.push({ href: '/portal', label: 'Open KennelOS so your families\' pages are up to date', note: `Last from KennelOS: ${ago(feedAt, now)}` });
  }

  const failed = await env.DB.prepare(`SELECT COUNT(*) AS n FROM portal_email_log WHERE site_id = ? AND result IN ('failed', 'bounced') AND sent_at > ?`)
    .bind(siteId, new Date(t - 7 * 86400000).toISOString()).first('n');
  if (failed) out.push({ href: '/portal', label: `${failed} portal email${failed === 1 ? '' : 's'} not delivered`, note: 'Text the family; see the reminder log on their screen' });
  return out;
}

// ---------- screens ----------

// A family's state, as a status pill (plan 7.3).
function familyPill(f) {
  if (f.first_signed_in_at) return f.placement_id ? '<span class="st ok">Active</span>' : '<span class="st">No puppy yet</span>';
  if (!f.invited_at) return f.kennelos_id ? '<span class="st next">Invite to send</span>' : '<span class="st next">Not invited</span>';
  return '<span class="st warn">Invite not accepted</span>';
}
const shortDay = (iso, tz) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: tz });

function familiesScreen(site, families, s, url, { deleted = [], erased = [], waitlistCount = null, kennel } = {}, now = new Date()) {
  // site.portalUrl: set by handlePortalAdmin.
  const base = `/s/${esc(site.subdomain)}/portal`;
  const rows = families.map((f) => {
    const p = f.placement_id ? f : null;
    const bits = [];
    if (p) {
      bits.push(`${pupName(p)}${p.litter_name ? ` · ${p.litter_name}` : ''}`);
      if (p.picked_up_at) bits.push(`went home ${formatAt(p.picked_up_at, s.time_zone, { weekday: false })}`);
      else if (p.pickup_booked_at) bits.push(`going home ${formatAt(p.pickup_booked_at, s.time_zone, { weekday: false })}`);
      else if (p.go_home_on) bits.push(`going home ${formatDay(p.go_home_on)}`);
    }
    bits.push(f.last_activity_at ? `last active ${shortDay(f.last_activity_at, s.time_zone)}` : 'never signed in');
    if (f.kennelos_id) bits.push('from KennelOS');
    const tags = (f.extras ?? '').split('|').filter(Boolean).map((x) => `<span class="tag">${esc(x)}</span>`).join('');
    return `<li>${roundPhoto(site.subdomain, p?.photo_id, p ? pupName(p) : f.name)}<span class="grow"><a class="rowlink" href="${base}/f/${esc(f.id)}"><b>${esc(f.name)}</b></a><br><span class="small muted">${esc(bits.join(' · '))}</span>${tags ? `<br>${tags}` : ''}</span>${familyPill(f)}</li>`;
  }).join('');
  return `${note(url)}
  <span class="eyebrow">${esc(kennel)}</span><h1>Families</h1>
  ${familyFilters(site, 'puppy', waitlistCount)}
  <section class="card"><div class="between"><p class="muted small">Families who've signed their contract see their puppy portal at <strong>${esc(site.portalUrl)}</strong>.</p><a class="button primary small" href="${base}/new">Add a family</a></div>
    ${site.feedAt ? `<span class="feedline muted"><svg class="i" aria-hidden="true"><use href="#i-globe"/></svg>Last from KennelOS: ${esc(ago(site.feedAt, now))}</span>` : ''}
    ${rows ? `<ul class="list">${rows}</ul>` : '<p class="muted">No families yet.</p>'}
  </section>
  <p class="small muted">Accounts are deleted after 12 months with no activity, with warnings at 30 and 7 days. Sale records and reminder logs have their own clocks.</p>

  ${deleted.length ? `<section class="card" id="deleted"><h2>Recently deleted</h2><p class="hint">Their portal is closed. Each is deleted for good ${UNDO_DAYS} days after, unless you undo it.</p>
    <dl class="kv">${deleted.map((f) => `<dt>${esc(formatDay(new Date(Date.parse(f.deleted_at) + UNDO_DAYS * 86400000).toISOString().slice(0, 10)))}</dt><dd><b>${esc(f.name)}</b>${f.pup ? ` · ${esc(f.pup)}` : ''}${f.delete_reason === 'backed_out' ? ' <span class="hint">backed out (KennelOS)</span>' : ''}
      <form method="post" action="${base}/undo/${esc(f.id)}" class="inline"><button class="link">Undo</button></form></dd>`).join('')}</dl></section>` : ''}
  ${erased.length ? `<details class="card"><summary>Erased at the family's request (${erased.length})</summary><p class="hint">Their accounts are gone; the sale records stay for your guarantee.</p>
    <dl class="kv">${erased.map((r) => `<dt>${esc(r.name)}</dt><dd><b>${esc(r.call_name || r.puppy_name)}</b>${r.picked_up_at ? ` · went home ${esc(formatAt(r.picked_up_at, s.time_zone, { weekday: false }))}` : ''}${r.proof_file_id ? ` · <a href="${base}/file/${esc(r.proof_file_id)}">vet record</a>${r.proof_accepted_at ? ' (accepted)' : ''}` : ''}${r.contract_file_id ? ` · <a href="${base}/file/${esc(r.contract_file_id)}">contract</a>` : ''} <span class="hint">erased ${esc(formatAt(r.erased_at, s.time_zone, { weekday: false }))}</span></dd>`).join('')}</dl></details>` : ''}`;
}

function familyFilters(site, on, waitlistCount) {
  const base = `/s/${esc(site.subdomain)}/portal`;
  return `<nav class="filters" aria-label="Show">${[['puppy', base, 'Puppy families'], ['wait', `${base}?show=waitlist`, `Waitlist${waitlistCount === null ? '' : ` (${waitlistCount})`}`]]
    .map(([k, href, label]) => `<a href="${href}"${k === on ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav>`;
}

function puppyOptions(puppies, current) {
  return `<option value="">Choose…</option>${puppies.map((p) => `<option value="${esc(p.id)}"${p.id === current ? ' selected' : ''}${p.family && p.id !== current ? ' disabled' : ''}>${esc(p.name)} · ${esc(p.litter_name)}${p.family && p.id !== current ? ` (${esc(p.family)})` : ''}</option>`).join('')}`;
}

function placementFields(p, puppies, s) {
  const booked = p?.pickup_booked_at ? localParts(p.pickup_booked_at, s.time_zone) : null;
  return `<label>Puppy<select name="puppy_id" required>${puppyOptions(puppies, p?.puppy_id)}</select><span class="hint">From your site's litters. Add the litter and puppy there first.</span></label>
    <label>The name they've given ${p ? esc(p.puppy_name) : 'the puppy'}<input name="call_name" value="${esc(p?.call_name ?? '')}" maxlength="60"><span class="hint">Used on their pages and in emails, if they've chosen one.</span></label>
    <div class="row"><label>Planned go-home<input type="date" name="go_home_on" value="${esc(p?.go_home_on ?? '')}"><span class="hint">The day, before a pickup time is booked.</span></label></div>
    <div class="row"><label>Pickup booked for<input type="date" name="pickup_day" value="${esc(booked?.ymd ?? '')}"></label><label>at<input type="time" name="pickup_time" value="${esc(booked?.hm ?? '')}"><span class="hint">${esc(ZONE_NAMES[s.time_zone] ?? s.time_zone)} time. If it passes without you marking pickup, the vet clock starts from it.</span></label></div>`;
}

function newScreen(site, puppies, s, { error, values = {} } = {}) {
  return `${errorBox(error)}<form method="post" action="/s/${esc(site.subdomain)}/portal/new" class="card">
    <h1>Add a family</h1>
    <section class="fgroup"><h2>The family</h2><div class="fgrid">
      <label>Family name<input name="name" value="${esc(values.name ?? '')}" required maxlength="120" placeholder="The Reed family"></label>
      <label>Email addresses<input name="emails" value="${esc(values.emails ?? '')}" required placeholder="sam@example.com, alex@example.com"><span class="hint">Up to four, separated by commas. Each can sign in; reminders go to all.</span></label>
    </div></section>
    <section class="fgroup"><h2>Their puppy</h2><div class="fgrid">${placementFields(values.puppy_id ? values : null, puppies, s)}</div></section>
    <p><button class="primary">Add family</button></p>
    <p class="muted small">Nothing is sent yet: you send the invite from their screen.</p>
  </form>`;
}

async function familyScreen(env, site, familyId, url, { error } = {}, now = new Date()) {
  const f = await getFamily(env, site.id, familyId);
  if (!f) return null;
  const s = await getSettings(env, site.id);
  const emails = await familyEmails(env, f.id);
  const p = await placementFor(env, site.id, f.id);
  const base = `/s/${esc(site.subdomain)}/portal/f/${esc(f.id)}`;
  const form = (action, inner, cls = '') => `<form method="post" action="${base}/${action}"${cls ? ` class="${cls}"` : ''}>${inner}</form>`;
  const puppies = await placeablePuppies(env, site.id);
  const parts = [note(url), errorBox(error)];

  // From KennelOS (plan 3.1): when it last sent, anything it no longer has, and
  // newer values waiting beside hers.
  const sug = async (tbl, id) => (await suggestionsFor(env, site.id, tbl, id)).map((g) => ({ ...g, tbl, id }));
  const waiting = [...await sug('portal_families', f.id), ...(p ? await sug('portal_placements', p.id) : [])];
  const pupNames = new Map(puppies.map((x) => [x.id, x.name]));
  const shown = (g) => (g.value === null ? 'blank' : g.field === 'pickup_booked_at' ? formatAt(g.value, s.time_zone) : g.field === 'go_home_on' ? formatDay(g.value) : g.field === 'puppy_id' ? pupNames.get(g.value) ?? 'another puppy' : g.value);
  if (f.kennelos_id) {
    parts.push(`<section class="card"><p class="hint">From KennelOS${site.feedAt ? `, last sent ${esc(ago(site.feedAt, now))}` : ''}. Your changes here win; KennelOS never overwrites them.</p>
      ${f.kennelos_gone_at ? `<p class="error">This family is no longer in KennelOS (since ${esc(formatAt(f.kennelos_gone_at, s.time_zone, { weekday: false }))}). Nothing was removed here: keep them, or delete them below.</p>` : ''}
      ${p?.kennelos_gone_at ? `<p class="error">${esc(pupName(p))}'s sale is no longer in KennelOS. The placement is still open here: change its life status, or delete the family, if that's what it means.</p>` : ''}
      ${waiting.map((g) => `<div class="box"><p><b>KennelOS has a newer value</b> for ${esc(SUGGEST_LABEL[g.field] ?? g.field)}: <strong>${esc(shown(g))}</strong></p>
        <div class="row">${form('suggestion', `<input type="hidden" name="tbl" value="${g.tbl}"><input type="hidden" name="field" value="${esc(g.field)}"><input type="hidden" name="act" value="use"><button class="primary">Use it</button>`)}
        ${form('suggestion', `<input type="hidden" name="tbl" value="${g.tbl}"><input type="hidden" name="field" value="${esc(g.field)}"><input type="hidden" name="act" value="ignore"><button>Ignore</button>`)}</div></div>`).join('')}</section>`);
  }
  if (p && p.status === 'closed' && p.closed_reason) parts.push(`<section class="card"><p class="error">${esc(pupName(p))}'s placement is closed: ${esc(CLOSED[p.closed_reason])} (from KennelOS). Every reminder has stopped.</p></section>`);

  parts.push(`<section class="card"><h1>${esc(f.name)}</h1>
    <dl class="kv">${emails.map((e, i) => `<dt>${i ? '' : 'Emails'}</dt><dd>${esc(e.email)}${e.invited_at ? ` <span class="muted small">invited ${esc(formatAt(e.invited_at, s.time_zone, { weekday: false }))}${e.invite_hash ? '' : ', link used'}</span>` : ''}</dd>`).join('')}
      <dt>Signed in</dt><dd>${f.first_signed_in_at ? `First ${esc(formatAt(f.first_signed_in_at, s.time_zone, { weekday: false }))}; last seen ${esc(formatAt(f.last_activity_at, s.time_zone, { weekday: false }))}` : 'Not yet'}</dd></dl>
    ${form('invite', `<button${f.invited_at ? '' : ' class="primary"'}>${f.invited_at ? 'Resend invite' : 'Send invite'}</button> <span class="hint">A sign-in link to each address, working once for 30 days. A resend replaces the old links.</span>`)}
  </section>`);

  if (!p) {
    parts.push(form('placement', `<section class="card"><h2>Their puppy</h2>${placementFields(null, puppies, s)}<p><button class="primary">Save</button></p></section>`));
  } else {
    const name = pupName(p);
    const v = vetStatus(p, now);
    // Pickup: the clock's state, and the one action that fits.
    let pickup;
    if (p.pickup_state === 'assumed') {
      pickup = `<p><strong>Did ${esc(name)} go home at ${esc(formatAt(p.pickup_booked_at, s.time_zone))}?</strong> The vet clock started from that booked time, because it passed without a pickup marked.</p>
        <div class="row">${form('confirm', '<button class="primary">Yes</button>')}${form('not-yet', '<button>Not yet</button>')}</div>
        <p class="hint">Or change the time below.</p>`;
    } else if (p.picked_up_at) {
      pickup = `<p>Went home <strong>${esc(formatAt(p.picked_up_at, s.time_zone))}</strong>.</p>`;
    } else {
      pickup = `<p>${p.pickup_booked_at ? `Pickup booked for <strong>${esc(formatAt(p.pickup_booked_at, s.time_zone))}</strong>.` : p.go_home_on ? `Planned for ${esc(formatDay(p.go_home_on))}; no pickup time booked.` : 'No go-home date yet.'}${p.pickup_state === 'not_yet' ? ' You said they haven\'t gone home yet: the clock is stopped.' : ''}</p>
        ${form('picked-up', `<button class="primary">Mark picked up now</button>`)}`;
    }
    const local = p.picked_up_at ? localParts(p.picked_up_at, s.time_zone) : null;
    pickup += `<details><summary>${p.picked_up_at ? 'Correct the pickup time' : 'Picked up earlier? Enter the time'}</summary>
      ${form('picked-up', `<div class="row"><label>Day<input type="date" name="day" value="${esc(local?.ymd ?? '')}" required></label><label>Time<input type="time" name="time" value="${esc(local?.hm ?? '')}" required></label></div><p><button>Save pickup time</button> <span class="hint">The deadline and reminders move with it; the old time stays in History.</span></p>`)}</details>`;
    parts.push(`<section class="card"><h2>${esc(name)} · pickup</h2>${pickup}</section>`);

    // Lost before pickup (plan 7.4): her note, from a draft she rewrites; email only if she chooses.
    if (isLoss(p)) {
      parts.push(`<section class="card" id="loss"><h2>${p.closed_reason === 'died' ? `${esc(name)} died before pickup` : `${esc(name)} failed a health check before pickup`}</h2>
        <p class="hint">Their portal is one quiet page now: ${esc(name)}'s photo, your note, and the way back through their status page. Every reminder has stopped.</p>
        ${form('loss-note', `<label>Your note to ${esc(f.name)}<textarea name="note" rows="9" maxlength="4000" required>${esc(p.loss_note ?? lossDraft(p, site.kennel_name || site.subdomain, f.name))}</textarea>
          <span class="hint">${p.loss_note ? `Saved ${esc(formatAt(p.loss_note_at, s.time_zone, { weekday: false }))}${p.loss_sent_at ? `, emailed ${esc(formatAt(p.loss_sent_at, s.time_zone, { weekday: false }))}` : ''}.` : 'A starting draft: put it in your own words. Nothing is sent for you.'}</span></label>
          <label class="check"><input type="checkbox" name="send" value="1"> <span>Also email it to them</span></label><p><button class="primary">Save note</button></p>`)}</section>`);
    }
    const proof = p.proof_file_id ? await getFile(env, site.id, p.proof_file_id) : null;
    parts.push(`<section class="card"><h2>Vet visit: <span${v.trouble ? ' class="error"' : ''}>${esc(v.word)}</span></h2>
      <dl class="kv">
        ${p.vet_deadline_at ? `<dt>Deadline</dt><dd>${esc(formatAt(p.vet_deadline_at, s.time_zone, { zone: true }))}${Date.parse(p.vet_deadline_at) > now.getTime() ? ` · ${esc(timeLeft(p.vet_deadline_at, now))} left` : ''}</dd>` : `<dt>Deadline</dt><dd class="muted">Starts at pickup (${esc(VET_RULES[s.vet_rule].toLowerCase())})</dd>`}
        <dt>Booked</dt><dd>${p.vet_booked_at ? `${esc((p.vet_booked_for ?? '').replace('T', ' at '))}${p.vet_clinic ? `, ${esc(p.vet_clinic)}` : ''} <span class="muted small">(the family's entry)</span>` : 'Not yet'}</dd>
        <dt>Record</dt><dd>${proof ? `<a href="/s/${esc(site.subdomain)}/portal/file/${esc(proof.id)}">View</a> · uploaded ${esc(formatAt(p.proof_uploaded_at, s.time_zone, { weekday: false }))}${p.proof_accepted_at ? ` · accepted ${esc(formatAt(p.proof_accepted_at, s.time_zone, { weekday: false }))}` : ''}` : 'Not uploaded'}</dd>
      </dl>
      ${proof && !p.proof_accepted_at ? form('accept', '<button class="primary">Accept the vet record</button>') : ''}
    </section>`);


    // The checklist, the timeline and the programs, as this family has them.
    const steps = await stepsFor(env, site.id, p, await puppyFor(env, site.id, p.puppy_id), s, { now, all: true, name });
    const op = (kind, x, what, label, cls = 'link') => form(`step/${kind}/${esc(x.id)}/${what}`, `<button class="${cls}">${label}</button>`, 'inline');
    const stepOps = (kind, x) => [
      !x.auto && !(x.hers) ? op(kind, x, x.done ? 'undo' : 'done', x.done ? 'Untick' : 'Tick') : '',
      x.mine ? op(kind, x, 'remove', 'Remove') : op(kind, x, x.hidden ? 'show' : 'hide', x.hidden ? 'Show to them' : 'Hide for them'),
    ].filter(Boolean).join(' · ');
    const who = (x) => (x.done ? `Done${x.by === 'breeder' ? (x.hers ? ' (yours)' : ' by you') : x.by === 'family' && !x.auto ? ' by them' : ''}${x.done_at ? ` ${formatAt(x.done_at, s.time_zone, { weekday: false })}` : ''}` : 'Not yet');
    const steps1 = steps.checklist.filter((x) => !x.hidden);
    const home = Boolean(p.picked_up_at);
    const checklistPart = steps.checklist.length ? `<details${home ? '' : ' open'}><summary><b>Go-home checklist: ${steps1.filter((x) => x.done).length} of ${steps1.length} ready</b></summary>
      <dl class="kv">${steps.checklist.map((x) => `<dt>${x.hidden ? '<span class="muted">Hidden</span>' : esc(who(x))}</dt><dd>${x.hidden ? `<span class="muted">${esc(x.title)}</span>` : `<b>${esc(x.title)}</b>`}${x.mine ? ' <span class="hint">(theirs alone)</span>' : ''}<br>${stepOps('checklist', x)}</dd>`).join('')}</dl></details>`
      : `<p class="muted">No go-home checklist yet. <a href="/s/${esc(site.subdomain)}/portal/checklist">Set it up</a>.</p>`;
    const TWORD = (t) => (t.hidden ? 'Hidden' : t.done ? who(t) : t.hers ? 'Yours, before go-home' : t.overdue ? 'Overdue' : t.past ? 'Past' : t.next ? 'Next' : 'Later');
    const timelinePart = steps.tasks.length ? `<details${home ? ' open' : ''}><summary><b>Timeline: ${steps.tasks.filter((t) => t.overdue && !t.hidden).length ? `${steps.tasks.filter((t) => t.overdue && !t.hidden).length} overdue` : `${steps.tasks.filter((t) => t.done && !t.hidden).length} of ${steps.tasks.filter((t) => !t.hidden).length} done`}</b></summary>
      <dl class="kv">${steps.tasks.map((t) => `<dt>${t.due ? esc(formatDay(t.due)) : 'No date yet'}</dt><dd>${t.hidden ? `<span class="muted">${esc(t.title)}</span>` : `<b>${esc(t.title)}</b>`} <span${t.overdue && !t.hidden ? ' class="error"' : ' class="hint"'}>${esc(TWORD(t))}</span>${t.moved ? ' <span class="hint">(moved for them)</span>' : ''}${t.mine ? ' <span class="hint">(theirs alone)</span>' : ''}<br>${stepOps('task', t)}
        <details><summary class="hint">Move to another day</summary>${form(`step/task/${esc(t.id)}/day`, `<div class="row"><label>Day<input type="date" name="day" value="${esc(t.moved ?? '')}"></label></div><p><button>Save</button> <span class="hint">Blank: back to ${esc(whenWords(t.raw).toLowerCase())}.</span></p>`)}</details></dd>`).join('')}</dl></details>`
      : `<p class="muted">No timeline yet. <a href="/s/${esc(site.subdomain)}/portal/timeline">Set it up</a>.</p>`;
    const prods = await products(env, site.id);
    parts.push(`<section class="card" id="steps"><h2>Checklist and timeline</h2>${checklistPart}
      <details><summary>Add a checklist item for ${esc(f.name)} alone</summary>${form('steps/new/checklist', `<div class="fgrid">${itemFields('checklist', null, prods)}<p><button>Add</button></p></div>`)}</details>
      ${timelinePart}
      <details><summary>Add a timeline task for ${esc(f.name)} alone</summary>${form('steps/new/task', `<div class="fgrid">${itemFields('task', null, prods)}<p><button>Add</button></p></div>`)}</details>
    </section>`);

    const progs = await programsFor(env, site.id, p);
    if (progs.length) {
      parts.push(`<section class="card" id="programs"><h2>Programs</h2><p class="hint">Clicked: they opened the link from the portal. Done: they or you marked it. Sign-ups themselves come from each program's own report.</p>
        ${progs.map((x) => form(`program/${esc(x.id)}`, `<div class="box"><b>${esc(x.name)}</b>${x.status_at ? ` <span class="hint">${esc(PROGRAM_WORDS[x.status])} ${esc(formatAt(x.status_at, s.time_zone, { weekday: false }))}${x.status_by === 'family' ? ', by them' : x.status_by === 'breeder' ? ', by you' : ''}</span>` : ''}
          <div class="row"><label>Status<select name="status">${Object.entries(PROGRAM_WORDS).map(([k, l]) => `<option value="${k}"${x.status === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
          ${x.portal_per_family ? `<label>Their code or certificate<input name="code" value="${esc(x.family_code ?? '')}" maxlength="80"></label>` : ''}</div>
          <p><button>Save</button></p></div>`)).join('')}</section>`);
    }


    // Extras (plan 8.1): what they bought, and for a stay its skills and weekly updates.
    const cat = await catalog(env, site.id);
    const pex = await extrasFor(env, site.id, p.id);
    const today = localParts(now, s.time_zone).ymd;
    const exParts = [];
    for (const x of pex) {
      if (!x.confirmed_at) {
        exParts.push(`<div class="box"><p><b>KennelOS says they bought ${esc(x.name)}</b></p><div class="row">${form(`extra/${esc(x.id)}/confirm`, '<button class="primary">Confirm</button>')}${form(`extra/${esc(x.id)}/remove`, '<button>Not right</button>')}</div></div>`);
        continue;
      }
      if (x.delivery !== 'stay') { exParts.push(`<div class="box"><p><b>${esc(x.name)}</b> ${form(`extra/${esc(x.id)}/remove`, '<button class="link">Remove</button>', 'inline')}</p></div>`); continue; }
      const skills = await skillsFor(env, site.id, x.id);
      const ups = await updatesFor(env, site.id, x.id);
      const w = stayWeeks(x.starts_on, p.go_home_on, today);
      const due = !p.picked_up_at && updateDue(x.starts_on, ups[0]?.written_on ?? null, x.every_days, today);
      const last = new Map((ups[0]?.levels ?? []).map((l) => [l.skill_id, l]));
      exParts.push(`<div class="box" id="stay"><p><b>${esc(x.name)}</b>${x.weeks ? ` <span class="hint">home at ${x.weeks} weeks</span>` : ''}</p>
        <p class="hint">${x.starts_on ? `From ${esc(formatDay(x.starts_on))}` : 'Starts at 8 weeks (add the litter\'s birthday to set it)'}${p.go_home_on ? ` to go-home ${esc(formatDay(p.go_home_on))}` : ''}${w.state === 'staying' ? ` · week ${w.week} of ${w.total}` : ''} · an update every ${x.every_days} days${due ? ' · <b>update due</b>' : ''}</p>
        <details${due ? ' open' : ''}><summary><b>Write this ${x.every_days === 7 ? 'week\'s' : ''} update</b></summary>
          <form method="post" action="${base}/extra/${esc(x.id)}/update" enctype="multipart/form-data"><div class="fgrid">
            <label>Note<textarea name="note" rows="4" maxlength="3000" placeholder="This week ${esc(name)}…"></textarea></label>
            <label>Weight<input name="weight" maxlength="30" placeholder="6 lb 2 oz"></label>
            ${skills.map((sk) => `<div class="row"><label>${esc(sk.name)}<select name="level.${esc(sk.id)}">${Object.entries(LEVELS).map(([k, l]) => `<option value="${k}"${(last.get(sk.id)?.level ?? 'not_started') === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
              <label>Note<input name="note.${esc(sk.id)}" maxlength="200" value="${esc(last.get(sk.id)?.note ?? '')}"></label></div>`).join('')}
            <label>Photos<input type="file" name="photos" accept="image/jpeg,image/png,image/webp" multiple><span class="hint">Up to ${MAX_PHOTOS}, 10 MB each.</span></label>
            <p><button class="primary">Save and send</button> <span class="hint">Last week's levels are filled in: change only what moved.</span></p></div></form></details>
        ${ups.length ? `<details><summary>${ups.length} update${ups.length === 1 ? '' : 's'} sent</summary><dl class="kv">${ups.map((u) => `<dt>Week ${u.week}<br><span class="hint">${esc(formatDay(u.written_on))}</span></dt><dd>${esc((u.note ?? '').slice(0, 140))}${u.photos.length ? ` <span class="hint">${u.photos.length} photo${u.photos.length === 1 ? '' : 's'}</span>` : ''} ${form(`extra/${esc(x.id)}/update/${esc(u.id)}/remove`, '<button class="link">Remove</button>', 'inline')}</dd>`).join('')}</dl></details>` : ''}
        <details><summary>Skills and the first day</summary>
          ${skills.length ? `<ul>${skills.map((sk) => `<li>${esc(sk.name)}${sk.from_package ? '' : ' <span class="hint">(yours)</span>'} ${form(`extra/${esc(x.id)}/skill/${esc(sk.id)}/remove`, '<button class="link">Remove</button>', 'inline')}</li>`).join('')}</ul>` : '<p class="muted">No skills yet.</p>'}
          ${form(`extra/${esc(x.id)}/skill`, '<div class="row"><label>Add a skill<input name="name" maxlength="120" required placeholder="Recall"></label></div><p><button>Add</button></p>')}
          ${form(`extra/${esc(x.id)}/start`, `<div class="row"><label>The stay's first day<input type="date" name="day" value="${esc(x.starts_on ?? '')}" required></label></div><p><button>Save</button></p>`)}
          ${form(`extra/${esc(x.id)}/remove`, '<p><button class="link">Remove this stay, with its updates</button></p>')}</details></div>`);
    }
    const addable = cat.filter((c) => !pex.some((x) => x.extra_id === c.id));
    parts.push(`<section class="card" id="extras"><h2>Extras</h2>${exParts.join('') || '<p class="muted">None.</p>'}
      ${addable.length ? form('extra', `<div class="row"><label>Add an extra they bought<select name="extra_id">${addable.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}${c.portal_delivery === 'stay' ? ' (a stay, with updates)' : ''}</option>`).join('')}</select></label></div><p><button>Add</button> <span class="hint">A stay sets go-home to the package's weeks. Payment stays in KennelOS or however you take it.</span></p>`) : cat.length ? '' : '<p class="hint">Your extras are on the website\'s Extras page.</p>'}</section>`);

    const records = await healthRecords(env, site.id, p.id);
    parts.push(`<section class="card"><h2>Shots, deworming and vet visits</h2>
      ${records.length ? `<dl class="kv">${records.map((r) => `<dt>${esc(formatDay(r.given_on))}</dt><dd><b>${esc(r.name)}</b> · ${esc(RECORD_TYPES[r.type])}${r.notes ? ` · ${esc(r.notes)}` : ''} ${form(`record/${esc(r.id)}/remove`, '<button class="link">Remove</button>')}</dd>`).join('')}</dl>` : '<p class="muted">None yet. The family sees these under Records.</p>'}
      <details><summary>Add a record</summary>${form('record', `<div class="fgrid"><div class="row"><label>Kind<select name="type">${Object.entries(RECORD_TYPES).map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join('')}</select></label><label>Date<input type="date" name="given_on" required></label></div>
        <label>What<input name="name" required maxlength="120" placeholder="DHPP, first round"></label><label>Notes<input name="notes" maxlength="400"></label><p><button>Add</button></p></div>`)}</details>
    </section>`);

    const contract = p.contract_file_id ? await getFile(env, site.id, p.contract_file_id) : null;
    parts.push(`<section class="card"><h2>Contract</h2>
      ${contract ? `<p><a href="/s/${esc(site.subdomain)}/portal/file/${esc(contract.id)}">View the contract</a> <span class="muted small">added ${esc(formatAt(contract.uploaded_at, s.time_zone, { weekday: false }))}</span></p>` : '<p class="muted">Not added yet.</p>'}
      <form method="post" action="${base}/contract" enctype="multipart/form-data"><label>${contract ? 'Replace with' : 'Add'} a PDF or photo, up to 10 MB<input type="file" name="file" accept="application/pdf,image/*" required></label><p><button>Upload</button></p></form>
    </section>`);

    parts.push(form('placement', `<section class="card"><h2>${esc(name)}'s details</h2><div class="fgrid">${placementFields(p, puppies, s)}
      <div class="row"><label>Microchip<input name="microchip" value="${esc(p.microchip ?? '')}" maxlength="40"></label><label>Registration number<input name="registration_no" value="${esc(p.registration_no ?? '')}" maxlength="40"></label></div>
      <p><button class="primary">Save</button></p></div></section>`));

    parts.push(form('life', `<section class="card"><h2>Life status</h2><div class="row"><label>Status<select name="life_status">${[['with_family', 'With the family'], ['deceased', 'Died'], ['rehomed', 'Rehomed'], ['returned', 'Returned to you']].map(([k, l]) => `<option value="${k}"${p.life_status === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label><label>Since<input type="date" name="on" value="${esc(p.life_status_on ?? '')}"></label></div>
      <p class="hint">Anything but "With the family" stops every reminder at once.</p><p><button>Save</button></p></section>`));
    if (p.status === 'open' && !p.picked_up_at) {
      parts.push(form('loss', `<details class="card"><summary>${esc(name)} died or failed a health check before pickup</summary>
        <p class="hint">Closes this placement and stops every reminder; the family's portal becomes a quiet page with your note. With KennelOS, voiding the sale there does the same.</p>
        <div class="row"><label>What happened<select name="reason"><option value="died">${esc(name)} died</option><option value="failed_health">Failed a health check</option></select></label><label>On<input type="date" name="on"></label></div>
        <p><button>Record it</button></p></details>`));
    }

    const log = await emailLog(env, site.id, p.id);
    const KINDS = { invite: 'Invite', vet_book: 'Book the vet visit', vet_pickup: 'Pickup: the deadline', vet_day_before: 'About a day left', vet_morning: 'Deadline day morning' };
    const WORDS = { sent: 'sent', outbox: 'held in the staging outbox', failed: 'NOT sent', delivered: 'delivered', bounced: 'BOUNCED' };
    parts.push(`<section class="card"><h2>Reminder log</h2>
      ${log.length ? `<dl class="kv">${log.map((r) => {
        const addr = emails.find((e) => e.email_hash === r.address_hash)?.email ?? 'an address since removed';
        return `<dt>${esc(formatAt(r.sent_at, s.time_zone, { weekday: false }))}</dt><dd><b>${esc(KINDS[r.kind] ?? r.kind)}</b>: <span${['failed', 'bounced'].includes(r.result) ? ' class="error"' : ''}>${esc(WORDS[r.result] ?? r.result)}</span> to ${esc(addr)}${r.basis && r.kind !== 'invite' ? `<br><span class="hint">Counted from ${esc(r.basis.includes('T') ? `the deadline ${formatAt(r.basis, s.time_zone, { weekday: false })}` : `go-home ${formatDay(r.basis)}`)}</span>` : ''}</dd>`;
      }).join('')}</dl>` : '<p class="muted">Nothing sent yet.</p>'}</section>`);

    const FIELD = { picked_up_at: 'Picked up', pickup_state: 'Pickup', vet_deadline_at: 'Vet deadline', pickup_booked_at: 'Pickup booked', go_home_on: 'Go-home', puppy_id: 'Puppy', puppy_name: 'Puppy', call_name: 'Name', microchip: 'Microchip', registration_no: 'Registration number', vet_booked_for: 'Vet booked for', vet_clinic: 'Clinic', vet_booked_at: 'Vet booking recorded', proof_file_id: 'Vet record', proof_uploaded_at: 'Vet record uploaded', proof_accepted_at: 'Vet record accepted', contract_file_id: 'Contract', life_status: 'Life status', life_status_on: 'Since', health_record: 'Health record', extra: 'Extra', extra_suggested: 'Extra from KennelOS, to confirm', extra_declined: 'KennelOS extra turned down', stay_update: 'Stay update sent', account_erased: 'Account erased', checklist: 'Checklist ticked', task: 'Task done', step_hidden: 'Step hidden for them', step_shown: 'Step shown again', task_day: 'Task moved', program: 'Program', program_code: 'Their program code' };
    const UNDONE = { checklist: 'Checklist unticked', task: 'Task undone', program_code: 'Their program code removed' };
    const BY = { breeder: 'you', family: 'the family', kennelos: 'KennelOS', portal: 'the portal' };
    const isTime = (v) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v ?? '');
    const val = (v) => (v === null ? '—' : isTime(v) ? formatAt(v, s.time_zone, { weekday: false }) : /_file_id$/.test(v) ? 'a file' : v);
    const hist = (await history(env, site.id, 'portal_placements', p.id)).filter((h) => !['puppy_id', 'proof_file_id', 'contract_file_id', 'extra_declined'].includes(h.field));
    parts.push(`<details class="card"><summary>History</summary><dl class="kv">${hist.map((h) => `<dt>${esc(formatAt(h.changed_at, s.time_zone, { weekday: false }))}</dt><dd><b>${esc(h.new_value === null && UNDONE[h.field] ? `${UNDONE[h.field]}: ${val(h.old_value)}` : `${FIELD[h.field] ?? h.field}: ${val(h.new_value)}`)}</b> <span class="hint">by ${esc(BY[h.changed_by])}${h.old_value !== null && !(h.new_value === null && UNDONE[h.field]) ? `, was ${esc(val(h.old_value))}` : ''}</span></dd>`).join('')}</dl></details>`);
  }

  // Messages, from pickup on (plan 2).
  const msgs = await thread(env, site.id, f.id);
  if (msgs.length || (p?.picked_up_at)) {
    await markRead(env, site.id, f.id, 'family');
    parts.push(`<section class="card" id="messages"><h2>Messages</h2>
      ${msgs.length ? `<dl class="kv">${msgs.map((m) => `<dt>${m.sender === 'family' ? esc(f.name) : 'You'}<br><span class="hint">${esc(formatAt(m.sent_at, s.time_zone, { weekday: false }))}</span></dt><dd>${esc(m.body).replace(/\n/g, '<br>')}</dd>`).join('')}</dl>` : '<p class="muted">None yet. They can write to you from their portal now that the puppy is home.</p>'}
      ${form('message', `<label>Reply<textarea name="body" rows="4" maxlength="${MAX_MESSAGE}" required></textarea><span class="hint">They see it in their portal and get it by email.</span></label><p><button class="primary">Send</button></p>`)}</section>`);
  }

  parts.push(form('family', `<details class="card"><summary>Change name or emails</summary><div class="fgrid">
    <label>Family name<input name="name" value="${esc(f.name)}" required maxlength="120"></label>
    <label>Email addresses<input name="emails" value="${esc(emails.map((e) => e.email).join(', '))}" required><span class="hint">Removing an address stops it signing in and getting reminders.</span></label>
    <p><button>Save</button></p></div></details>`));
  parts.push(form('delete', `<details class="card danger"><summary>Delete this family</summary>
    <p>Closes their portal now, and deletes their account, emails, puppy records here, files and history for good after ${UNDO_DAYS} days. Until then you can undo it under Puppy families. Nothing is deleted from your website or from KennelOS${f.kennelos_id ? ', and KennelOS won\'t send them again' : ''}.</p>
    <label>Type <strong>delete</strong> to confirm<input name="confirm" autocomplete="off" required></label><p><button>Delete the family</button></p></details>`));
  parts.push(form('erase', `<details class="card danger"><summary>They asked for their data to go</summary>
    <p>Erases their account now, for good: sign-in, email addresses, messages and their ticks. Your records of the sale (the placement, health records, contract, vet record and reminder log) stay, under the name ${esc(f.name)}, for your guarantee. A family can also do this themselves from their Account page.</p>
    <label>Type <strong>erase</strong> to confirm<input name="confirm" autocomplete="off" required></label><p><button>Erase their account</button></p></details>`));
  return parts.join('\n');
}

function settingsScreen(site, s, products, { error, waiting = [], extras = [] } = {}, url) {
  const zones = ZONES.includes(s.time_zone) ? ZONES : [s.time_zone, ...ZONES];
  const TYPES = { '': 'Not shown', food: 'Food', insurance: 'Insurance', registration: 'Registration', product: 'Product', other: 'Other' };
  return `${url ? note(url) : ''}${errorBox(error)}<form method="post" action="/s/${esc(site.subdomain)}/portal/settings" class="card">
    <h1>Portal settings</h1>
    <section class="fgroup"><h2>The vet visit</h2><div class="fgrid">
      <fieldset><legend>How your contract counts it</legend>${Object.entries(VET_RULES).map(([k, l]) => `<label class="check"><input type="radio" name="vet_rule" value="${k}"${s.vet_rule === k ? ' checked' : ''}> <span>${esc(l)}</span></label>`).join('')}
        <span class="hint">Applies to clocks that start from now on; a clock already running keeps its deadline.</span></fieldset>
      <label>Your time zone<select name="time_zone">${zones.map((z) => `<option value="${esc(z)}"${z === s.time_zone ? ' selected' : ''}>${esc(ZONE_NAMES[z] ?? z)}</option>`).join('')}</select></label>
      <label>What counts as proof<input name="proof_note" value="${esc(s.proof_note ?? '')}" maxlength="400" placeholder="The vet's exam record or receipt, showing the date and Opal's microchip"><span class="hint">Shown on the vet page and in reminders.</span></label>
    </div></section>
    <section class="fgroup"><h2>Contacts for families, once the puppy is home</h2><div class="fgrid">
      <p class="hint">From pickup, each family's Home leads with these as one-tap buttons for the first weeks, so a question goes to you or your vet, who already knows the puppy. They stay under Records after that.</p>
      ${waiting.map((g) => `<div class="box"><p><b>KennelOS has</b> ${esc(SUGGEST_LABEL[g.field] ?? g.field)}: <strong>${esc(g.value ?? '')}</strong></p><div class="row">
        <button form="sug-use-${esc(g.field)}" class="primary">Use it</button><button form="sug-ignore-${esc(g.field)}">Ignore</button></div></div>`).join('')}
      <div class="row"><label>Your phone for families<input name="her_phone" type="tel" value="${esc(s.her_phone ?? '')}" maxlength="40" placeholder="${esc(site.contactPhone ?? '')}"><span class="hint">Call and text.${site.contactPhone ? ' Blank: your website\'s number.' : ''}</span></label>
      <label>Your email for families<input name="her_email" type="email" value="${esc(s.her_email ?? '')}" maxlength="254" placeholder="${esc(site.contactEmail ?? '')}"><span class="hint">${site.contactEmail ? 'Blank: your website\'s address.' : 'Optional.'}</span></label></div>
      <div class="row"><label>Your vet's clinic<input name="vet_clinic" value="${esc(s.vet_clinic ?? '')}" maxlength="120" placeholder="Maple Street Animal Hospital"></label>
      <label>Vet's name<input name="vet_doctor" value="${esc(s.vet_doctor ?? '')}" maxlength="120" placeholder="Dr. Lee"></label></div>
      <div class="row"><label>Vet's phone<input name="vet_phone" type="tel" value="${esc(s.vet_phone ?? '')}" maxlength="40"></label>
      <label>Vet's address<input name="vet_address" value="${esc(s.vet_address ?? '')}" maxlength="200"><span class="hint">Opens in maps.</span></label></div>
      <label>A note for families<input name="vet_note" value="${esc(s.vet_note ?? '')}" maxlength="400" placeholder="Dr. Lee has seen every puppy since birth and is happy to take your questions."></label>
      <label>On Home for this many weeks after pickup<input name="help_weeks" inputmode="numeric" value="${esc(s.help_weeks ?? 8)}" maxlength="2"></label>
    </div></section>
    <section class="fgroup"><h2>What the puppies eat now</h2><div class="fgrid">
      <p class="hint">The food band on each family's Home: the exact food, so they buy the same. Its button opens your food program, if you show one.</p>
      <label>The food<input name="food_name" value="${esc(s.food_name ?? '')}" maxlength="160" placeholder="Small-breed puppy formula, chicken and rice"><span class="hint">Brand and formula. Blank: no food band.</span></label>
      <div class="row"><label>Bag<input name="food_bag" value="${esc(s.food_bag ?? '')}" maxlength="80" placeholder="4 lb bag"></label>
      <label>How much and how often<input name="food_how" value="${esc(s.food_how ?? '')}" maxlength="160" placeholder="⅓ cup, three times a day"></label></div>
      <label>A note<input name="food_note" value="${esc(s.food_note ?? '')}" maxlength="300" placeholder="Soak it in warm water for the first week."></label>
    </div></section>
    ${extras.length ? `<section class="fgroup"><h2>Extras the portal delivers</h2><div class="fgrid">
      <p class="hint">An extended stay gets a Stay page for the family, its "What's included" list as skills, and your updates on a rhythm you set.</p>
      ${extras.map((x) => `<div class="row"><label>${esc(x.name)}<select name="delivery.${esc(x.id)}"><option value="">Listed only</option><option value="stay"${x.portal_delivery === 'stay' ? ' selected' : ''}>An extended stay, with updates</option></select></label>
        <label>Update every (days)<input name="every.${esc(x.id)}" inputmode="numeric" maxlength="2" value="${esc(x.portal_every_days ?? 7)}"></label></div>`).join('')}
    </div></section>` : ''}
    <section class="fgroup" id="programs"><h2>Programs families see</h2><div class="fgrid">
      ${products.length ? products.map((x) => `<div class="fgrid box"><b>${esc(x.name)}</b>
        <div class="row"><label>Show as<select name="type.${esc(x.id)}">${Object.entries(TYPES).map(([k, l]) => `<option value="${k}"${(x.portal_show ? x.portal_type ?? 'other' : '') === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
        <label>What the family does<input name="action.${esc(x.id)}" value="${esc(x.family_action ?? '')}" maxlength="200" placeholder="${x.portal_type === 'insurance' ? 'Activate the free trial within 5 days of pickup' : 'Use the code at checkout'}"></label></div>
        <label class="check"><input type="checkbox" name="own.${esc(x.id)}" value="1"${x.portal_per_family ? ' checked' : ''}> <span>Each family gets its own code or certificate <span class="hint">You type it on their screen; they see theirs instead of the program's code.</span></span></label></div>`).join('') : '<p class="muted">Add your programs under Recommended products first; their links and codes are used here too.</p>'}
      <label>Disclosure line<input name="disclosure" value="${esc(s.disclosure ?? '')}" maxlength="400" placeholder="${esc(DEFAULT_DISCLOSURE)}"><span class="hint">At the foot of every page with program links.</span></label>
    </div></section>
    <p><button class="primary">Save</button></p></form>
  ${waiting.map((g) => ['use', 'ignore'].map((a) => `<form id="sug-${a}-${esc(g.field)}" method="post" action="/s/${esc(site.subdomain)}/portal/settings/suggestion"><input type="hidden" name="field" value="${esc(g.field)}"><input type="hidden" name="act" value="${a}"></form>`).join('')).join('')}
  <ul class="items"><li class="item"><a href="/s/${esc(site.subdomain)}/portal/checklist"><b>Go-home checklist</b><span>Your list for every family</span></a></li>
    <li class="item"><a href="/s/${esc(site.subdomain)}/portal/timeline"><b>First-weeks timeline</b><span>Tasks dated from birth or pickup</span></a></li></ul>`;
}


// ---------- the checklist and timeline templates ----------

const products = async (env, siteId) => (await env.DB.prepare('SELECT id, name, portal_show, portal_type, family_action, portal_per_family FROM products WHERE site_id = ? ORDER BY sort, name').bind(siteId).all()).results;

const KIND_WORDS = {
  checklist: { title: 'Go-home checklist', one: 'item', hint: 'What to have ready before the puppy comes home. Every family gets this list from two weeks before go-home; you can hide an item or add one for a family on their screen.' },
  task: { title: 'First-weeks timeline', one: 'task', hint: 'Each task is dated from the puppy\'s birth or from pickup. A task counted from birth that falls by go-home is yours: families see it as done by you. Write {name} for the puppy\'s name.' },
};

function programSelect(products, current) {
  const shown = products.filter((x) => x.portal_show || x.id === current);
  return `<label>Links to<select name="product_id"><option value="">No program</option>${shown.map((x) => `<option value="${esc(x.id)}"${x.id === current ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select><span class="hint">A program families see (Portal settings). Its link and code go with the step.</span></label>`;
}

function itemFields(kind, x, products) {
  const auto = kind === 'checklist' ? CHECK_AUTO : TASK_AUTO;
  const autoField = `<label>Ticks itself<select name="auto"><option value="">No: the family ticks it</option>${Object.entries(auto).map(([k, l]) => `<option value="${k}"${x?.auto === k ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
  if (kind === 'checklist') {
    return `<label>Item<input name="title" value="${esc(x?.title ?? '')}" required maxlength="160" placeholder="A crate with a divider"><span class="hint">Write {food} for the food in Portal settings.</span></label>
      ${programSelect(products, x?.product_id)}${autoField}`;
  }
  const days = x ? Math.abs(x.offset_days) : '';
  const when = x ? (x.offset_days < 0 ? 'before' : 'after') : 'after';
  return `<label>Task<input name="title" value="${esc(x?.title ?? '')}" required maxlength="160" placeholder="Register {name}"></label>
    <label>What to do<input name="body" value="${esc(x?.body ?? '')}" maxlength="600" placeholder="Your registration paper is in the go-home folder."></label>
    <div class="row"><label>Days<input name="days" inputmode="numeric" value="${esc(days)}" maxlength="4" required></label>
      <label>&nbsp;<select name="when"><option value="after"${when === 'after' ? ' selected' : ''}>after</option><option value="before"${when === 'before' ? ' selected' : ''}>before</option></select></label>
      <label>&nbsp;<select name="count_from"><option value="pickup"${x?.count_from !== 'birth' ? ' selected' : ''}>pickup</option><option value="birth"${x?.count_from === 'birth' ? ' selected' : ''}>birth</option></select></label></div>
    ${programSelect(products, x?.product_id)}
    <label>Button words<input name="button_label" value="${esc(x?.button_label ?? '')}" maxlength="60" placeholder="Activate the trial"><span class="hint">On the program's link. Blank: the program's own.</span></label>
    ${autoField}`;
}

// "5 days after pickup", "70 days from birth".
const whenWords = (t) => (t.count_from === 'birth' ? `${t.offset_days} days from birth` : t.offset_days === 0 ? 'Pickup day' : `${Math.abs(t.offset_days)} day${Math.abs(t.offset_days) === 1 ? '' : 's'} ${t.offset_days < 0 ? 'before' : 'after'} pickup`);

// The form's "days" and "when" as one signed number.
export const formOffset = (values) => ({ ...values, offset_days: values.days === undefined ? values.offset_days : `${values.when === 'before' ? '-' : ''}${String(values.days ?? '').trim().replace(/^-/, '')}` });

function itemMeta(kind, x, products) {
  const bits = [];
  if (kind === 'task') bits.push(whenWords(x));
  const prod = products.find((y) => y.id === x.product_id);
  if (prod) bits.push(`${prod.name}${prod.portal_show ? '' : ' (not shown)'}`);
  if (x.auto) bits.push(kind === 'checklist' ? 'ticks itself' : 'done by itself');
  return bits.join(' · ');
}

function templateScreen(site, kind, items, products, url, { error } = {}) {
  const w = KIND_WORDS[kind];
  const base = `/s/${esc(site.subdomain)}/portal/${kind === 'checklist' ? 'checklist' : 'timeline'}`;
  const rows = items.map((x, i) => `<details class="card"><summary><b>${esc(x.title)}</b><br><span class="hint">${esc(itemMeta(kind, x, products))}</span></summary>
    <form method="post" action="${base}/${esc(x.id)}"><div class="fgrid">${itemFields(kind, x, products)}<p><button class="primary">Save</button></p></div></form>
    <div class="row">${i ? `<form method="post" action="${base}/${esc(x.id)}/up"><button>Move up</button></form>` : ''}${i < items.length - 1 ? `<form method="post" action="${base}/${esc(x.id)}/down"><button>Move down</button></form>` : ''}
    <form method="post" action="${base}/${esc(x.id)}/remove"><button class="link">Remove from every family's list</button></form></div></details>`).join('');
  return `${note(url)}${errorBox(error)}<section class="card"><h1>${esc(w.title)}</h1><p class="hint">${esc(w.hint)}</p>
    ${items.length ? '' : `<form method="post" action="${base}/suggested"><p><button class="primary">Start with the suggested ${kind === 'checklist' ? 'list' : 'timeline'}</button></p><p class="hint">${kind === 'checklist' ? 'Crate, bed, food, bowls, collar and leash, pads, chews, the vet booking and a carrier.' : 'The vet booking, pickup, the vet visit, insurance, food, registration, deworming and vaccines.'} Each links to your programs of that kind. Change anything after.</p></form>`}</section>
    ${rows}
    <form method="post" action="${base}/new" class="card"><h2>Add ${kind === 'checklist' ? 'an item' : 'a task'}</h2><div class="fgrid">${itemFields(kind, null, products)}<p><button>Add</button></p></div></form>`;
}

// ---------- the Families and Portal tabs (plan 7.3, build chunk 6) ----------

// Vet visits: each placement's status in words and time left; red only in trouble.
// Vet visits: each placement with its status in words, red only when in trouble.
function vetVisits(site, families, s, now = new Date()) {
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
const ACTIVITY = { checklist: 'ticked', task: 'marked done', vet_booked_at: 'booked the vet visit', vet_booked_for: null, vet_clinic: null, proof_uploaded_at: 'uploaded the vet record', proof_file_id: null, program: 'program', account_erased: 'erased their account' };
async function activity(env, site, s, now = new Date()) {
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
async function waitlistCount(env, site) {
  const linked = await env.DB.prepare('SELECT 1 FROM links WHERE site_id = ? AND revoked_at IS NULL LIMIT 1').bind(site.id).first();
  if (linked) return { linked: true, n: null };
  return { linked: false, n: await env.DB.prepare("SELECT COUNT(*) AS n FROM waitlist_entries WHERE site_id = ? AND status = 'waiting'").bind(site.id).first('n') };
}
async function waitlistPart(env, site, kennel, w) {
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

function setupScreen(site, s) {
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

// ---------- routes ----------

export async function handlePortalAdmin({ env, request, url, site: signedInSite, page }) {
  let site = signedInSite;
  const m = url.pathname.match(/^\/s\/[a-z0-9-]+\/portal(\/.*)?$/);
  if (!m) return null;
  const on = await env.DB.prepare('SELECT portal_on FROM sites WHERE id = ?').bind(site.id).first('portal_on');
  if (!on) return page('Portal', '<section class="card"><p>The puppy portal isn\'t switched on for your site.</p></section>', { status: 404, back: `/s/${site.subdomain}` });
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
    if (url.searchParams.get('show') === 'waitlist') return page('Families', await waitlistPart(env, site, kennel, w), tabs('families'));
    const families = await listFamilies(env, site.id);
    return page('Families', familiesScreen(site, families, s, url, { deleted: await recentlyDeleted(env, site.id), erased: await erasedRecords(env, site.id), waitlistCount: w.n, kennel }), tabs('families'));
  }
  // The Portal tab (plan 7.3): what families see, in one place.
  if (rest === '/setup' && !post) return page('Portal', setupScreen(site, s), tabs('portal'));
  const um = rest.match(/^\/undo\/([0-9a-f-]{36})$/);
  if (um && post) {
    try { await undoDelete(env, site.id, um[1]); } catch (err) { if (!(err instanceof PortalError)) throw err; }
    return redirect(`${home}/f/${um[1]}?note=undone`);
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
    if (!post) return page('Portal settings', settingsScreen(site, s, await products(env, site.id), { waiting, extras: await catalog(env, site.id) }, url), { back: `${home}/setup` });
    const form = await request.formData();
    const input = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
    try {
      await saveSettings(env, site.id, input);
    } catch (err) {
      if (err instanceof PortalError) return page('Portal settings', settingsScreen(site, { ...s, ...input }, await products(env, site.id), { error: err.message }), { back: home, status: 400 });
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

  // Her checklist and timeline templates.
  const tm = rest.match(/^\/(checklist|timeline)(?:\/(suggested|new|[0-9a-f-]{36})(?:\/(up|down|remove))?)?$/);
  if (tm) {
    const kind = tm[1] === 'checklist' ? 'checklist' : 'task';
    const here = `${home}/${tm[1]}`;
    const show = async (opts = {}) => page(KIND_WORDS[kind].title, templateScreen(site, kind, await listItems(env, site.id, kind), await products(env, site.id), url, opts), { back: `${home}/settings`, status: opts.error ? 400 : 200 });
    if (!post) return tm[2] ? null : show();
    try {
      if (tm[2] === 'suggested') { await addSuggested(env, site.id, kind); return redirect(`${here}?note=suggested`); }
      if (tm[3] === 'remove') { await removeItem(env, site.id, kind, tm[2]); return redirect(`${here}?note=stepremoved`); }
      if (tm[3]) { await moveItem(env, site.id, kind, tm[2], tm[3]); return redirect(here); }
      const form = await request.formData();
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
    if (!post) return page('Add a family', newScreen(site, puppies, s), { back: home, backLabel: 'Families' });
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
      return page('Add a family', newScreen(site, puppies, s, { error: err.message, values }), { back: home, status: 400 });
    }
    return redirect(`${home}/f/${familyId}?note=added`);
  }

  fm = rest.match(/^\/f\/([0-9a-f-]{36})(?:\/(.+))?$/);
  if (!fm) return null;
  const [, familyId, action] = fm;
  const show = async (opts) => {
    const body = await familyScreen(env, site, familyId, url, opts);
    return body ? page('Family', body, { back: home, backLabel: 'Families', status: opts?.error ? 400 : 200 }) : page('Not found', '<section class="card"><p>No such family.</p></section>', { status: 404, back: home });
  };
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
        if (p) await updatePlacement(env, site.id, p.id, values);
        else await createPlacement(env, site.id, familyId, values);
        return to('saved');
      case 'picked-up': {
        const after = await markPickedUp(env, site.id, needP().id, get('day') ? { day: get('day'), time: get('time') } : {});
        try { await sendDueFor(env, site, after, s); } catch (err) { if (!(err instanceof MailError)) throw err; }
        return to('pickedup');
      }
      case 'confirm': await confirmPickup(env, site.id, needP().id); return to('confirmed');
      case 'not-yet': await pickupNotYet(env, site.id, needP().id); return to('notyet');
      case 'accept': await acceptProof(env, site.id, needP().id); return to('accepted');
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
      case 'delete':
        if (get('confirm').trim().toLowerCase() !== 'delete') throw new PortalError('Type delete to confirm.');
        await scheduleDelete(env, site.id, familyId, 'breeder');
        return redirect(`${home}?note=deleted`);
      default: {
        const rm = action?.match(/^record\/([0-9a-f-]{36})\/remove$/);
        if (rm) { await removeHealthRecord(env, site.id, needP().id, rm[1]); return to('removed'); }
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

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
  addHealthRecord, removeHealthRecord, healthRecords, saveFile, getFile, fileResponse, emailLog, history, placeablePuppies,
  PortalError, RECORD_TYPES, MAX_FILE_BYTES, DEFAULT_DISCLOSURE,
} from './store.js';
import { sendInvites, portalBase } from './auth.js';
import { sendDueFor } from './reminders.js';
import { vetStatus, formatAt, formatDay, localParts, timeLeft, clockRunning, VET_RULES } from './vet.js';
import { MailError } from '../mail.js';

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
  deleted: 'Family deleted.',
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
    if (!f.picked_up_at && f.pickup_state !== 'not_yet') {
      const at = f.pickup_booked_at ? Date.parse(f.pickup_booked_at) : f.go_home_on ? Date.parse(`${f.go_home_on}T12:00:00Z`) : null;
      if (at && at - t < 7 * 86400000) {
        const when = f.pickup_booked_at ? formatAt(f.pickup_booked_at, s.time_zone) : formatDay(f.go_home_on);
        out.push({ href, label: `${name} goes home ${when}`, note: `${f.name} · vet visit ${f.vet_booked_at ? 'booked' : 'not booked yet'}${f.invited_at ? '' : ' · not invited yet'}` });
      }
    }
  }
  const failed = await env.DB.prepare(`SELECT COUNT(*) AS n FROM portal_email_log WHERE site_id = ? AND result IN ('failed', 'bounced') AND sent_at > ?`)
    .bind(siteId, new Date(t - 7 * 86400000).toISOString()).first('n');
  if (failed) out.push({ href: '/portal', label: `${failed} portal email${failed === 1 ? '' : 's'} not delivered`, note: 'Text the family; see the reminder log on their screen' });
  return out;
}

// ---------- screens ----------

function familiesScreen(site, families, s, url, now = new Date()) {
  // site.portalUrl: set by handlePortalAdmin.
  const base = `/s/${esc(site.subdomain)}/portal`;
  const rows = families.map((f) => {
    const p = f.placement_id ? f : null;
    const bits = [];
    if (p) {
      if (p.picked_up_at) bits.push(`Went home ${formatAt(p.picked_up_at, s.time_zone, { weekday: false })}`);
      else if (p.pickup_booked_at) bits.push(`Going home ${formatAt(p.pickup_booked_at, s.time_zone, { weekday: false })}`);
      else if (p.go_home_on) bits.push(`Going home ${formatDay(p.go_home_on)}`);
      bits.push(`Vet: ${vetStatus(p, now).word}`);
    } else bits.push('No puppy yet');
    if (!f.invited_at) bits.push('not invited');
    else if (!f.first_signed_in_at) bits.push('invite not accepted');
    return `<li class="item"><a href="${base}/f/${esc(f.id)}"><b>${esc(f.name)}${p ? ` · ${esc(pupName(p))}` : ''}</b><span>${esc(bits.join(' · '))}</span></a></li>`;
  }).join('');
  return `${note(url)}
  <section class="card"><h1>Puppy families</h1>
    <p class="muted small">Families who've signed their contract, and their puppy portal. Families see it at <strong>${esc(site.portalUrl)}</strong>.</p>
    <p><a class="button primary" href="${base}/new">Add a family</a></p>
    ${rows ? `<ul class="items">${rows}</ul>` : '<p class="muted">No families yet.</p>'}
  </section>
  <ul class="items"><li class="item"><a href="${base}/settings"><b>Portal settings and programs</b><span>Vet visit rule, time zone, which programs families see</span></a></li></ul>`;
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

    const proof = p.proof_file_id ? await getFile(env, site.id, p.proof_file_id) : null;
    parts.push(`<section class="card"><h2>Vet visit: <span${v.trouble ? ' class="error"' : ''}>${esc(v.word)}</span></h2>
      <dl class="kv">
        ${p.vet_deadline_at ? `<dt>Deadline</dt><dd>${esc(formatAt(p.vet_deadline_at, s.time_zone, { zone: true }))}${Date.parse(p.vet_deadline_at) > now.getTime() ? ` · ${esc(timeLeft(p.vet_deadline_at, now))} left` : ''}</dd>` : `<dt>Deadline</dt><dd class="muted">Starts at pickup (${esc(VET_RULES[s.vet_rule].toLowerCase())})</dd>`}
        <dt>Booked</dt><dd>${p.vet_booked_at ? `${esc((p.vet_booked_for ?? '').replace('T', ' at '))}${p.vet_clinic ? `, ${esc(p.vet_clinic)}` : ''} <span class="muted small">(the family's entry)</span>` : 'Not yet'}</dd>
        <dt>Record</dt><dd>${proof ? `<a href="/s/${esc(site.subdomain)}/portal/file/${esc(proof.id)}">View</a> · uploaded ${esc(formatAt(p.proof_uploaded_at, s.time_zone, { weekday: false }))}${p.proof_accepted_at ? ` · accepted ${esc(formatAt(p.proof_accepted_at, s.time_zone, { weekday: false }))}` : ''}` : 'Not uploaded'}</dd>
      </dl>
      ${proof && !p.proof_accepted_at ? form('accept', '<button class="primary">Accept the vet record</button>') : ''}
    </section>`);

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

    const log = await emailLog(env, site.id, p.id);
    const KINDS = { invite: 'Invite', vet_book: 'Book the vet visit', vet_pickup: 'Pickup: the deadline', vet_day_before: 'About a day left', vet_morning: 'Deadline day morning' };
    const WORDS = { sent: 'sent', outbox: 'held in the staging outbox', failed: 'NOT sent', delivered: 'delivered', bounced: 'BOUNCED' };
    parts.push(`<section class="card"><h2>Reminder log</h2>
      ${log.length ? `<dl class="kv">${log.map((r) => {
        const addr = emails.find((e) => e.email_hash === r.address_hash)?.email ?? 'an address since removed';
        return `<dt>${esc(formatAt(r.sent_at, s.time_zone, { weekday: false }))}</dt><dd><b>${esc(KINDS[r.kind] ?? r.kind)}</b>: <span${['failed', 'bounced'].includes(r.result) ? ' class="error"' : ''}>${esc(WORDS[r.result] ?? r.result)}</span> to ${esc(addr)}${r.basis && r.kind !== 'invite' ? `<br><span class="hint">Counted from ${esc(r.basis.includes('T') ? `the deadline ${formatAt(r.basis, s.time_zone, { weekday: false })}` : `go-home ${formatDay(r.basis)}`)}</span>` : ''}</dd>`;
      }).join('')}</dl>` : '<p class="muted">Nothing sent yet.</p>'}</section>`);

    const FIELD = { picked_up_at: 'Picked up', pickup_state: 'Pickup', vet_deadline_at: 'Vet deadline', pickup_booked_at: 'Pickup booked', go_home_on: 'Go-home', puppy_id: 'Puppy', puppy_name: 'Puppy', call_name: 'Name', microchip: 'Microchip', registration_no: 'Registration number', vet_booked_for: 'Vet booked for', vet_clinic: 'Clinic', vet_booked_at: 'Vet booking recorded', proof_file_id: 'Vet record', proof_uploaded_at: 'Vet record uploaded', proof_accepted_at: 'Vet record accepted', contract_file_id: 'Contract', life_status: 'Life status', life_status_on: 'Since', health_record: 'Health record' };
    const BY = { breeder: 'you', family: 'the family', kennelos: 'KennelOS', portal: 'the portal' };
    const isTime = (v) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v ?? '');
    const val = (v) => (v === null ? '—' : isTime(v) ? formatAt(v, s.time_zone, { weekday: false }) : /_file_id$/.test(v) ? 'a file' : v);
    const hist = (await history(env, site.id, 'portal_placements', p.id)).filter((h) => !['puppy_id', 'proof_file_id', 'contract_file_id'].includes(h.field));
    parts.push(`<details class="card"><summary>History</summary><dl class="kv">${hist.map((h) => `<dt>${esc(formatAt(h.changed_at, s.time_zone, { weekday: false }))}</dt><dd><b>${esc(FIELD[h.field] ?? h.field)}: ${esc(val(h.new_value))}</b> <span class="hint">by ${esc(BY[h.changed_by])}${h.old_value !== null ? `, was ${esc(val(h.old_value))}` : ''}</span></dd>`).join('')}</dl></details>`);
  }

  parts.push(form('family', `<details class="card"><summary>Change name or emails</summary><div class="fgrid">
    <label>Family name<input name="name" value="${esc(f.name)}" required maxlength="120"></label>
    <label>Email addresses<input name="emails" value="${esc(emails.map((e) => e.email).join(', '))}" required><span class="hint">Removing an address stops it signing in and getting reminders.</span></label>
    <p><button>Save</button></p></div></details>`));
  parts.push(form('delete', `<details class="card danger"><summary>Delete this family</summary>
    <p>Deletes their account, emails, puppy records here, files and history now. Nothing is deleted from your website or from KennelOS.</p>
    <label>Type <strong>delete</strong> to confirm<input name="confirm" autocomplete="off" required></label><p><button>Delete the family</button></p></details>`));
  return parts.join('\n');
}

function settingsScreen(site, s, products, { error } = {}, url) {
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
      <div class="row"><label>Your phone for families<input name="her_phone" type="tel" value="${esc(s.her_phone ?? '')}" maxlength="40" placeholder="${esc(site.contactPhone ?? '')}"><span class="hint">Call and text.${site.contactPhone ? ' Blank: your website\'s number.' : ''}</span></label>
      <label>Your email for families<input name="her_email" type="email" value="${esc(s.her_email ?? '')}" maxlength="254" placeholder="${esc(site.contactEmail ?? '')}"><span class="hint">${site.contactEmail ? 'Blank: your website\'s address.' : 'Optional.'}</span></label></div>
      <div class="row"><label>Your vet's clinic<input name="vet_clinic" value="${esc(s.vet_clinic ?? '')}" maxlength="120" placeholder="Maple Street Animal Hospital"></label>
      <label>Vet's name<input name="vet_doctor" value="${esc(s.vet_doctor ?? '')}" maxlength="120" placeholder="Dr. Lee"></label></div>
      <div class="row"><label>Vet's phone<input name="vet_phone" type="tel" value="${esc(s.vet_phone ?? '')}" maxlength="40"></label>
      <label>Vet's address<input name="vet_address" value="${esc(s.vet_address ?? '')}" maxlength="200"><span class="hint">Opens in maps.</span></label></div>
      <label>A note for families<input name="vet_note" value="${esc(s.vet_note ?? '')}" maxlength="400" placeholder="Dr. Lee has seen every puppy since birth and is happy to take your questions."></label>
      <label>On Home for this many weeks after pickup<input name="help_weeks" inputmode="numeric" value="${esc(s.help_weeks ?? 8)}" maxlength="2"></label>
    </div></section>
    <section class="fgroup"><h2>Programs families see</h2><div class="fgrid">
      ${products.length ? products.map((x) => `<div class="fgrid box"><b>${esc(x.name)}</b>
        <div class="row"><label>Show as<select name="type.${esc(x.id)}">${Object.entries(TYPES).map(([k, l]) => `<option value="${k}"${(x.portal_show ? x.portal_type ?? 'other' : '') === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
        <label>What the family does<input name="action.${esc(x.id)}" value="${esc(x.family_action ?? '')}" maxlength="200" placeholder="${x.portal_type === 'insurance' ? 'Activate the free trial within 5 days of pickup' : 'Use the code at checkout'}"></label></div></div>`).join('') : '<p class="muted">Add your programs under Recommended products first; their links and codes are used here too.</p>'}
      <label>Disclosure line<input name="disclosure" value="${esc(s.disclosure ?? '')}" maxlength="400" placeholder="${esc(DEFAULT_DISCLOSURE)}"><span class="hint">At the foot of every page with program links.</span></label>
    </div></section>
    <p><button class="primary">Save</button></p></form>`;
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
  const full = await env.DB.prepare(`SELECT s.id, s.subdomain, s.kennel_name, s.contact_phone, s.contact_email, d.hostname AS domain FROM sites s
    LEFT JOIN custom_domains d ON d.site_id = s.id AND d.status = 'active' WHERE s.id = ?`).bind(site.id).first();
  site = { ...site, domain: full.domain, kennel_name: full.kennel_name, contactPhone: full.contact_phone, contactEmail: full.contact_email, portalUrl: `${portalBase(env, full).replace(/^https:\/\//, '')}/family` };
  const home = `/s/${site.subdomain}/portal`;
  const back = `/s/${site.subdomain}`;
  const s = await getSettings(env, site.id);

  if (!rest && !post) return page('Puppy families', familiesScreen(site, await listFamilies(env, site.id), s, url), { back });

  const products = async () => (await env.DB.prepare('SELECT id, name, portal_show, portal_type, family_action FROM products WHERE site_id = ? ORDER BY sort, name').bind(site.id).all()).results;
  if (rest === '/settings') {
    if (!post) return page('Portal settings', settingsScreen(site, s, await products(), {}, url), { back: home });
    const form = await request.formData();
    const input = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
    try {
      await saveSettings(env, site.id, input);
    } catch (err) {
      if (err instanceof PortalError) return page('Portal settings', settingsScreen(site, { ...s, ...input }, await products(), { error: err.message }), { back: home, status: 400 });
      throw err;
    }
    const TYPES = ['food', 'insurance', 'registration', 'product', 'other'];
    const list = await products();
    if (list.length) {
      await env.DB.batch(list.map((x) => {
        const type = input[`type.${x.id}`] ?? '';
        return env.DB.prepare('UPDATE products SET portal_show = ?, portal_type = ?, family_action = ? WHERE id = ? AND site_id = ?')
          .bind(TYPES.includes(type) ? 1 : 0, TYPES.includes(type) ? type : x.portal_type, String(input[`action.${x.id}`] ?? '').trim().slice(0, 200) || null, x.id, site.id);
      }));
    }
    return redirect(`${home}/settings?note=saved`);
  }

  let fm = rest.match(/^\/file\/([0-9a-f-]{36})$/);
  if (fm && !post) {
    const file = await getFile(env, site.id, fm[1]);
    return file ? fileResponse(env, file) : new Response('Not found', { status: 404 });
  }

  if (rest === '/new') {
    const puppies = await placeablePuppies(env, site.id);
    if (!post) return page('Add a family', newScreen(site, puppies, s), { back: home });
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
    return body ? page('Family', body, { back: home, status: opts?.error ? 400 : 200 }) : page('Not found', '<section class="card"><p>No such family.</p></section>', { status: 404, back: home });
  };
  if (!post) return action ? null : show();

  const fam = await getFamily(env, site.id, familyId);
  if (!fam) return show();
  const p = await placementFor(env, site.id, familyId);
  const to = (n) => redirect(`${home}/f/${familyId}?note=${n}`);
  try {
    const isFile = action === 'contract';
    if (isFile && Number(request.headers.get('content-length') ?? 0) > MAX_FILE_BYTES + 64 * 1024) throw new PortalError('That file is over 10 MB.');
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
      case 'delete':
        if (get('confirm').trim().toLowerCase() !== 'delete') throw new PortalError('Type delete to confirm.');
        await deleteFamily(env, site.id, familyId);
        return redirect(`${home}?note=deleted`);
      default: {
        const rm = action?.match(/^record\/([0-9a-f-]{36})\/remove$/);
        if (rm) { await removeHealthRecord(env, site.id, needP().id, rm[1]); return to('removed'); }
        return null;
      }
    }
  } catch (err) {
    if (err instanceof PortalError) return show({ error: err.message });
    throw err;
  }
}

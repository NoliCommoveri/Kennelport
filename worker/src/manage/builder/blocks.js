// A data block's own settings in the owner's block screen (builder.js blockSettings):
// which records (builder/records.js: conditions, order, groups), its style, and what
// its cards show, for Dog cards, Litter cards, Pup cards, Featured and Reviews; a
// Featured block's schedule; and the records it shows now, from the draft, with what
// the breeder ticked and picked. Split out of builder.js (docs/review/
// senior-review-2026-11.md, item 7).
import { escapeHtml as esc } from '../../lib/html.js';
import { blockRows } from '../../render/parts.js';
import {
  DOG_STYLE, REVIEW_STYLE, DOG_ITEMS, LIGHT_ITEMS, DOG_STACKED, LITTER_ITEMS, LITTER_PAIR, LITTER_ROWS, REVIEW_ITEMS, REVIEW_WHO,
  FEATURE_DOG_ITEMS, FEATURE_PUP_ITEMS,
} from '../../content/blocks.js';
import { featuredNow, FEATURE_EVERY, FEATURE_ORDER, FEATURE_COUNT } from '../../content/featured.js';
import { seg, select, fld, mvBtns } from './controls.js';
import { recordsSettings } from './records.js';

// The records a data block shows now, from the draft, with the breeder's ticks and
// picks on this page (a Featured block's: every one it turns through).
export function blockRecords(snap, b, key = null) {
  const lim = (rows) => (b.limit ? rows.slice(0, b.limit) : rows);
  if (b.type === 'dogs' || b.type === 'featured_dog') return lim(blockRows(snap, b, null, key)).map((d) => d.call_name);
  if (b.type === 'litters' || b.type === 'pups' || b.type === 'featured_pup') return lim(blockRows(snap, b, null, key)).map((x) => x.name);
  if (b.type === 'reviews') return lim(snap.reviews).map((r) => [r.first_name, r.town].filter(Boolean).join(', ') || 'A family');
  return [];
}
export const WHAT = { dogs: 'dog', litters: 'litter', pups: 'pup', reviews: 'review', featured_dog: 'dog', featured_pup: 'pup' };

// One ordered list of a card's items: on ones in their order, then the rest; each
// with its switch, and up and down within the list.
function showList(b, face, items, title, hint = '') {
  const on = b.show[face];
  const order = [...on, ...Object.keys(items).filter((k) => !on.includes(k))];
  const n = `b.${b.id}.show.${face}`;
  return `<div class="fld"><span class="fldt">${esc(title)}</span>${hint ? `<span class="hint">${esc(hint)}</span>` : ''}<input type="hidden" name="${n}" value="${esc(order.join(','))}">
    <ul class="mvl">${order.map((k, i) => `<li class="mvr item${on.includes(k) ? '' : ' off'}">${mvBtns(`smv:${b.id}:${face}:${k}`, i, order.length)}<span class="ttl">${esc(items[k])}</span>
      <span class="end switches"><label class="check"><input type="checkbox" name="${n}.${k}"${on.includes(k) ? ' checked' : ''} aria-label="${esc(items[k])}"></label></span></li>`).join('')}</ul></div>`;
}
// On or off only (their order is fixed).
function showSwitches(b, face, items, title) {
  const on = b.show[face];
  const n = `b.${b.id}.show.${face}`;
  return `<div class="fld"><span class="fldt">${esc(title)}</span><input type="hidden" name="${n}" value="${esc(Object.keys(items).join(','))}"><div class="switches boxed">${Object.entries(items).map(([k, l]) => `<label class="check"><input type="checkbox" name="${n}.${k}"${on.includes(k) ? ' checked' : ''}>${esc(l)}</label>`).join('')}</div></div>`;
}

// Which records and what its cards show: { data, show } for blockSettings to place.
export function dataSettings(snap, b, k) {
  let data = '';
  let show = '';
  if (b.type === 'dogs') {
    data = `${recordsSettings(snap, b, k)}${fld('Style', seg(k('style'), b.style, DOG_STYLE))}`;
    // The lists for the style it has now (save after changing the style to see its own).
    const lines = DOG_STACKED.includes(b.style) ? `<label class="check"><input type="checkbox" name="${k('lines')}"${b.lines ? ' checked' : ''}> <span>A line between cards where they stack<span class="hint">A 4px bar in the scheme's accent colour between one card and the next, where they sit one under another${b.style === 'flip' ? ' (on a phone)' : ' (on a phone or a tablet)'}.</span></span></label>` : '';
    show = b.style === 'light' ? showList(b, 'light', LIGHT_ITEMS, 'Top to bottom', 'Where it lives shows only for a co-owned dog living with a co-owner, or an outside dog with its owner filled in.')
      : b.style === 'beside' ? showList(b, 'beside', DOG_ITEMS, 'Beside the photo, then under it', 'The bio and everything after it go under the photo and details, across the card.')
        : `<div class="twocol">${showList(b, 'front', DOG_ITEMS, 'Front of the card', 'The photo always fills the front when it is on.')}${showList(b, 'back', DOG_ITEMS, 'Back of the card')}</div>`;
    show += lines;
  } else if (b.type === 'litters') {
    data = recordsSettings(snap, b, k);
    show = `${showList(b, 'items', LITTER_ITEMS, 'Top to bottom')}<div class="twocol">${showSwitches(b, 'pair', LITTER_PAIR, 'The pair')}${showSwitches(b, 'rows', LITTER_ROWS, 'Facts')}</div>
      <div class="fgrid">${select(k('show.names'), b.show.names, Object.fromEntries(Array.from({ length: 7 }, (_, i) => [String(i), i ? `Up to ${i}, then count them` : 'Count them only'])), 'Puppies: names', '')}</div>`;
  } else if (b.type === 'pups') {
    data = recordsSettings(snap, b, k);
    show = '<p class="small muted">The Puppies page\'s own flip cards: photo, name, colour and status on the front; details, price and a way to ask on the back, by the pup rules.</p>';
  } else if (b.type === 'featured_dog' || b.type === 'featured_pup') {
    data = `<p class="small muted">${b.type === 'featured_dog' ? 'Until she picks her dogs, it shows the dogs these conditions hold for, in this order.' : 'Until she picks her pups, it shows the pups these conditions hold for, in this order: as they\'re placed, they drop out by themselves.'}</p>${recordsSettings(snap, b, k)}`;
    show = showList(b, 'items', b.type === 'featured_dog' ? FEATURE_DOG_ITEMS : FEATURE_PUP_ITEMS, 'Under its name, top to bottom', 'Its photo sits beside them, and a button to its own page goes under them.');
  } else if (b.type === 'reviews') {
    data = fld('Style', seg(k('style'), b.style, REVIEW_STYLE));
    show = `${showList(b, 'items', REVIEW_ITEMS, 'Top to bottom')}${showSwitches(b, 'who', REVIEW_WHO, 'Who it is from')}`;
  }
  return { data, show };
}

// A Featured block's schedule (content/featured.js): how long each stays, in what
// order, from when, and how many at once; and which shows today, from the draft.
export function scheduleSettings(snap, key, b, k) {
  const s = b.sched;
  const today = new Date().toISOString().slice(0, 10);
  const now = featuredNow(blockRows(snap, b, null, key), s, snap.picks?.[key]?.[b.id]?.fixed ?? [], `${snap.site.id ?? ''}/${key}/${b.id}`, today);
  const name = (x) => x.call_name ?? x.name;
  return `<div class="fgroup"><h2>Schedule</h2>
      <p class="small muted">It turns over by itself, with no Update website needed. She can also feature one on set dates, which wins over this.</p>
      ${fld('Each one stays', seg(k('sched.every'), s.every, FEATURE_EVERY))}
      ${fld('In what order', seg(k('sched.order'), s.order, FEATURE_ORDER), 'Shuffled is a fixed shuffle: the same for every visitor, and it doesn\'t change on reload.')}
      <div class="fgrid">${select(k('sched.count'), String(s.count), FEATURE_COUNT, 'How many at once')}
        <label class="half">Starting on<input type="date" name="${k('sched.start')}" value="${esc(s.start)}"><span class="hint">Empty: weeks turn over on a Monday, months on the 1st.</span></label></div>
      <p class="result">${now.length ? `Showing today: <b>${now.map((x) => esc(name(x))).join(', ')}</b>` : '<b>Nothing to show</b>, so this block hides itself on the site.'}</p></div>`;
}

// What the breeder has done with this block's records in her Site Manager.
export function hersLine(snap, key, b) {
  const p = snap.picks?.[key]?.[b.id];
  const featured = b.type === 'featured_dog' || b.type === 'featured_pup';
  if (featured) {
    return p?.pick ? `<p class="small muted">She has picked ${p.pick.length} in her Site Manager, so they show in her order whatever the conditions above.</p>`
      : '<p class="small muted">She hasn\'t picked any yet in her Site Manager.</p>';
  }
  const n = p?.omit?.length ?? 0;
  return `<p class="small muted">${n ? `She has left out ${n} of these in her Site Manager.` : 'She can untick any of these in her Site Manager to leave it out.'}</p>`;
}

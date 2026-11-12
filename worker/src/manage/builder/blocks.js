// A data block's own settings in the owner's block screen (builder.js blockSettings):
// which records (builder/records.js: conditions, order, groups), its style, and what
// its cards show, for Dog cards, Litter cards, Pup cards and Reviews; and the records
// it shows now, from the draft. Split out of builder.js (docs/review/
// senior-review-2026-11.md, item 7).
import { escapeHtml as esc } from '../../lib/html.js';
import { blockRows } from '../../render/parts.js';
import {
  DOG_STYLE, REVIEW_STYLE, DOG_ITEMS, LIGHT_ITEMS, DOG_STACKED, LITTER_ITEMS, LITTER_PAIR, LITTER_ROWS, REVIEW_ITEMS, REVIEW_WHO,
} from '../../content/blocks.js';
import { seg, select, fld, mvBtns } from './controls.js';
import { recordsSettings } from './records.js';

// The records a data block shows now, from the draft.
export function blockRecords(snap, b) {
  const lim = (rows) => (b.limit ? rows.slice(0, b.limit) : rows);
  if (b.type === 'dogs') return lim(blockRows(snap, b)).map((d) => d.call_name);
  if (b.type === 'litters' || b.type === 'pups') return lim(blockRows(snap, b)).map((x) => x.name);
  if (b.type === 'reviews') return lim(snap.reviews).map((r) => [r.first_name, r.town].filter(Boolean).join(', ') || 'A family');
  return [];
}
export const WHAT = { dogs: 'dog', litters: 'litter', pups: 'pup', reviews: 'review' };

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
  } else if (b.type === 'reviews') {
    data = fld('Style', seg(k('style'), b.style, REVIEW_STYLE));
    show = `${showList(b, 'items', REVIEW_ITEMS, 'Top to bottom')}${showSwitches(b, 'who', REVIEW_WHO, 'Who it is from')}`;
  }
  return { data, show };
}

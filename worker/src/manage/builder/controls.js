// The form controls the owner's build screens share (manage/builder.js and the
// screens split out of it beside this file): a text field, a select, a switch, a
// segmented choice, a Back to default button, an icon, and a status pill's colour.
import { escapeHtml as esc } from '../../lib/html.js';
import { pillColours, pillName, schemeOf } from '../../render/schemes.js';
import { pillKey } from '../../content/model.js';

export const svg = (n) => `<svg class="i" aria-hidden="true"><use href="#i-${n}"/></svg>`;
export const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// A pill's colour (content/model.js PILL_KEYS) shown in the build tools: its words in a
// plain pill with a dot of the colour, as the scheme has it (light). An SVG dot, since
// the build tools take no inline styles.
const dot = (hex) => `<svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true"><circle cx="5" cy="5" r="5" fill="${esc(hex)}"/></svg>`;
export const pillChip = (scheme, key, words) => `<span class="spill plain">${dot(schemeOf(scheme).light[pillKey(key)])} ${esc(words)}</span>`;
// A choice of the site's scheme's colours, by name; a stored one it doesn't offer
// (another scheme's choice) stays, under the name of the colour it matches.
export function pillSelect(name, scheme, value, label, cls = 'half') {
  const cur = pillKey(value);
  const opts = pillColours(scheme).map(([k, n]) => [k, n]);
  if (!opts.some(([k]) => k === cur)) opts.push([cur, pillName(scheme, cur)]);
  return `<label class="${cls}">${esc(label)}<select name="${name}">${opts.map(([v, l]) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
}
export const field = (name, value, { label, hint = '', cls = 'half', ph = '' } = {}) => `<label class="${cls}">${esc(label)}<input type="text" name="${name}" value="${esc(value)}"${ph ? ` placeholder="${esc(ph)}"` : ''}>${hint ? `<span class="hint">${esc(hint)}</span>` : ''}</label>`;
export const select = (name, value, opts, label, cls = 'half') => `<label class="${cls}">${esc(label)}<select name="${name}">${Object.entries(opts).map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(value) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
export const toggle = (name, on, label) => `<label class="check"><input type="checkbox" name="${name}"${on ? ' checked' : ''}>${esc(label)}</label>`;
export const seg = (name, cur, opts) => `<div class="seg sm" role="radiogroup">${Object.entries(opts).map(([v, l]) => `<label><input type="radio" name="${name}" value="${v}"${cur === v ? ' checked' : ''}><span>${esc(l)}</span></label>`).join('')}</div>`;
export const back = (key) => `<button class="link small" name="default" value="${esc(key)}">Back to default</button>`;

// Shared by the block screens (builder.js, builder/blocks.js).
export const mvBtns = (act, i, n) => `<div class="mv"><button name="act" value="${esc(act)}:up" aria-label="Move up"${i === 0 ? ' disabled' : ''}>${svg('up1')}</button><button name="act" value="${esc(act)}:down" aria-label="Move down"${i === n - 1 ? ' disabled' : ''}>${svg('down1')}</button></div>`;
export const fld = (title, inner, hint = '') => `<div class="fld"><span class="fldt">${esc(title)}</span>${inner}${hint ? `<span class="hint">${esc(hint)}</span>` : ''}</div>`;
export const LIMITS = { all: 'All of them', ...Object.fromEntries(Array.from({ length: 12 }, (_, i) => [String(i + 1), String(i + 1)])) };
export const resultLine = (names, what) => (names.length
  ? `<p class="result">Shows <b>${names.length} ${what}${names.length === 1 ? '' : 's'}</b>: ${names.map(esc).join(', ')}</p>`
  : '<p class="result none"><b>Nothing matches</b>, so this block hides itself on the site.</p>');

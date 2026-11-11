// The form controls the owner's build screens share (manage/builder.js and the
// screens split out of it beside this file): a text field, a select, a switch, a
// segmented choice, a Back to default button, an icon, and a status pill's colour.
import { escapeHtml as esc } from '../../lib/html.js';

export const svg = (n) => `<svg class="i" aria-hidden="true"><use href="#i-${n}"/></svg>`;
export const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// A status rule's pill (content/rules.js PILLS) as the Site Manager's spill colour.
export const SPILL = { avail: 'green', res: 'brass' };
export const field = (name, value, { label, hint = '', cls = 'half', ph = '' } = {}) => `<label class="${cls}">${esc(label)}<input type="text" name="${name}" value="${esc(value)}"${ph ? ` placeholder="${esc(ph)}"` : ''}>${hint ? `<span class="hint">${esc(hint)}</span>` : ''}</label>`;
export const select = (name, value, opts, label, cls = 'half') => `<label class="${cls}">${esc(label)}<select name="${name}">${Object.entries(opts).map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(value) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
export const toggle = (name, on, label) => `<label class="check"><input type="checkbox" name="${name}"${on ? ' checked' : ''}>${esc(label)}</label>`;
export const seg = (name, cur, opts) => `<div class="seg sm" role="radiogroup">${Object.entries(opts).map(([v, l]) => `<label><input type="radio" name="${name}" value="${v}"${cur === v ? ' checked' : ''}><span>${esc(l)}</span></label>`).join('')}</div>`;
export const back = (key) => `<button class="link small" name="default" value="${esc(key)}">Back to default</button>`;


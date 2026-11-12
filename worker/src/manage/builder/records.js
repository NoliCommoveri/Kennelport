// A data block's records in the owner's block screen (docs/plans/kennelos-contract.md
// step 2, B2): its conditions, each a field, what it asks and a value; Add a condition;
// its order; its grouping and a heading per group. Fields and what they can ask come
// from content/fields.js. There's no prototype screen for this: it's built from the
// prototype's own pieces (the movable rows, the select grid, the chips), and a colour
// is chosen by ticking the colours the site holds (the colour picker).
//
// It works without script, as the rest of the builder does: a changed field or ask
// shows its own choices once saved (Save, or any button on the screen).
import { escapeHtml as esc } from '../../lib/html.js';
import {
  FIELDS, OPS, TICK_OPS, NO_VALUE_OPS, WHERE_MAX, BLOCK_KIND, siteValues, siteColours, groupable, grouped, condSet, condWords,
} from '../../content/fields.js';
import { recordCtx } from '../../render/parts.js';
import { svg } from './controls.js';

const WHAT = { dog: 'dogs', puppy: 'pups', litter: 'litters' };

// A field list's sections, for the select's groups.
function sections(kind) {
  const all = Object.entries(FIELDS[kind]);
  if (kind === 'dog') return [['The dog', all]];
  if (kind === 'puppy') return [['The pup', all.filter(([k]) => !k.startsWith('litter.'))], ['Its litter', all.filter(([k]) => k.startsWith('litter.'))]];
  const by = (p) => all.filter(([k]) => k.startsWith(p));
  return [['The litter', all.filter(([k]) => !k.includes('.'))], ['Its pups', by('pups.')], ['Either parent', by('a_parent.')], ['Dam', by('dam.')], ['Sire', by('sire.')]];
}

const option = (v, l, cur) => `<option value="${esc(v)}"${String(v) === String(cur) ? ' selected' : ''}>${esc(l)}</option>`;
const fieldSelect = (name, kind, cur, { label, filter = () => true, first = null } = {}) => `<label class="half">${esc(label)}<select name="${name}">${first ? option(first[0], first[1], cur) : ''}${sections(kind)
  .map(([title, fs]) => [title, fs.filter(([k, s]) => filter(k, s))]).filter(([, fs]) => fs.length)
  .map(([title, fs]) => `<optgroup label="${esc(title)}">${fs.map(([k, s]) => option(k, s.label, cur)).join('')}</optgroup>`).join('')}</select></label>`;

const ORDER_WORDS = { text: ['A to Z', 'Z to A'], list: ['A to Z', 'Z to A'], date: ['earliest first', 'latest first'], number: ['lowest first', 'highest first'], enum: ['in its list order', 'in reverse'], bool: ['no first', 'yes first'] };

// The rows a field's values are offered from: every record of its kind on the site.
const allOf = (snap, kind) => (kind === 'dog' ? snap.dogs : kind === 'litter' ? snap.litters : snap.litters.flatMap((l) => l.puppies ?? []));

// The values a condition's ticks offer: the field's own list, the colours the site
// holds, or what its records have; and any stored value no record has now.
function tickValues(snap, kind, c, rc) {
  const spec = FIELDS[kind][c.field];
  const vals = spec.colour ? siteColours(snap) : siteValues(kind, c.field, allOf(snap, kind), rc);
  for (const v of Array.isArray(c.value) ? c.value : []) if (!Object.hasOwn(vals, v)) vals[v] = v;
  return vals;
}

function valueInput(snap, kind, c, i, k, rc) {
  const spec = FIELDS[kind][c.field];
  const n = k(`where.${i}.value`);
  if (NO_VALUE_OPS.includes(c.op)) return '';
  if (TICK_OPS.includes(c.op)) {
    const vals = tickValues(snap, kind, c, rc);
    const cur = Array.isArray(c.value) ? c.value : [];
    if (!Object.keys(vals).length) return `<p class="small muted">${spec.colour ? 'No dog or pup on the site has a colour yet.' : 'Nothing on the site has this filled in yet.'}</p>`;
    return `<div class="chips"${spec.colour ? ' aria-label="Colours on the site"' : ''}>${Object.entries(vals).map(([v, l]) => `<label><input type="checkbox" name="${n}" value="${esc(v)}"${cur.includes(v) ? ' checked' : ''}>${esc(l)}</label>`).join('')}</div>`;
  }
  const v = Array.isArray(c.value) ? '' : c.value ?? '';
  if (spec.kind === 'enum') return `<label class="half">Value<select name="${n}">${option('', 'Choose…', v)}${Object.entries(spec.values).map(([x, l]) => option(x, l, v)).join('')}</select></label>`;
  const type = spec.kind === 'date' ? 'date' : spec.kind === 'number' ? 'number' : 'text';
  return `<label class="half">Value<input type="${type}" name="${n}" value="${esc(v)}"${type === 'text' ? ' maxlength="60"' : ''}></label>`;
}

function condRow(snap, kind, b, c, i, k, rc) {
  const spec = FIELDS[kind][c.field];
  const ticks = TICK_OPS.includes(c.op);
  const value = valueInput(snap, kind, c, i, k, rc);
  return `<li class="mvr item cond${condSet(c) ? '' : ' off'}"><span class="ttl"><div class="fgrid">
      ${fieldSelect(k(`where.${i}.field`), kind, c.field, { label: 'Field' })}
      <label class="half">Asks<select name="${k(`where.${i}.op`)}">${Object.entries(OPS[spec.kind]).map(([o, l]) => option(o, l, c.op)).join('')}</select></label>
      ${ticks ? '' : value}</div>${ticks ? value : ''}
      ${condSet(c) ? '' : `<span class="hint">${ticks ? 'Tick at least one' : 'Fill in a value'}, then save: until then this condition leaves nothing out.</span>`}
      ${spec.either ? '<span class="hint">Holds when either parent matches. A parent that isn\'t a dog on the site (an outside sire by name only) never does.</span>' : ''}
      ${spec.colour ? '<span class="hint">The colours on her dogs and pups now, as KennelOS sends them (case and spacing evened out).</span>' : ''}
      <span class="row"><button class="link small danger" name="act" value="cond-:${esc(b.id)}:${i}">${svg('trash')} Remove this condition</button></span></span></li>`;
}

// The block's "Which …" part: conditions, Add a condition, order, grouping, headings.
export function recordsSettings(snap, b, k, today = null) {
  const kind = BLOCK_KIND[b.type];
  const rc = recordCtx(snap, today);
  const conds = b.where.map((c, i) => condRow(snap, kind, b, c, i, k, rc)).join('');
  const add = b.where.length < WHERE_MAX
    ? `<div class="fgrid">${fieldSelect(k('addcond'), kind, '', { label: 'Add a condition on', first: ['', 'Choose a field…'] })}<div class="half"><button class="button small" name="act" value="cond+:${esc(b.id)}">${svg('plus')} Add a condition</button></div></div>` : '';
  const orders = `<label class="half">Order<select name="${k('order')}">${option('own', "The breeder's order", b.order)}${sections(kind).map(([title, fs]) => {
    const opts = fs.filter(([, s]) => !s.either).flatMap(([f, s]) => ORDER_WORDS[s.kind].map((w, d) => [`${f}:${d ? 'down' : 'up'}`, `${s.label}, ${w}`]));
    return opts.length ? `<optgroup label="${esc(title)}">${opts.map(([v, l]) => option(v, l, b.order)).join('')}</optgroup>` : '';
  }).join('')}</select></label>`;
  const canGroup = new Set(groupable(kind).map(([f]) => f));
  // A Featured block shows one at a time, so it has no groups.
  const groupSel = b.type.startsWith('featured_') ? '' : fieldSelect(k('group'), kind, b.group, { label: 'Group by', first: ['', 'No groups'], filter: (f) => canGroup.has(f) });
  let headings = '';
  if (b.group) {
    // The groups the block would draw now (from every record of its kind, so a group
    // that's empty today can be worded too), each with the owner's heading.
    const gs = grouped(kind, allOf(snap, kind), b.group, {}, rc);
    headings = `<div class="fld"><span class="fldt">A heading over each group</span><span class="hint">Left empty, a group's heading is its value, as shown. A group with nothing in it doesn't show.</span><div class="fgrid">${gs.map((g, i) => `<label class="half">${esc(g.heading)}<input type="hidden" name="${k(`gw.${i}.k`)}" value="${esc(g.key)}"><input type="text" name="${k(`gw.${i}.w`)}" value="${esc(b.gw[g.key] ?? '')}" placeholder="${esc(g.heading)}" maxlength="60"></label>`).join('')}</div></div>`;
  }
  return `<div class="fld"><span class="fldt">Conditions</span><span class="hint">Every one must hold. For one thing or another, add a second block. With none, it shows every one of its ${WHAT[kind]}.</span>
      ${conds ? `<ul class="mvl">${conds}</ul>` : ''}${add}</div>
    <div class="fgrid">${orders}${groupSel}</div>${headings}`;
}

// The block's summary line: its conditions in words.
export function recordsSummary(b) {
  const kind = BLOCK_KIND[b.type];
  const words = b.where.map((c) => (condSet(c) ? condWords(kind, c) : `${FIELDS[kind][c.field].label}: not set yet`));
  const group = b.group ? `grouped by ${FIELDS[kind][b.group].label.toLowerCase()}` : '';
  return [words.join(' · ') || `every one of its ${WHAT[kind]}`, group].filter(Boolean).join(' · ');
}

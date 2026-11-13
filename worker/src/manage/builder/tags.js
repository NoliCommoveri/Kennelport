// Tags, in the owner's build tools (GET/POST /admin/<sub>/tags, routed by
// manage/builder.js; content/tags.js, docs/plans/kennelos-contract.md Part D): the
// owner's tags by rule, each its words, pill, kind and conditions (the block screen's
// condition rows, manage/builder/records.js), and the tags the breeder may tick on a
// dog in her Site Manager. There's no prototype screen for this: it's built from the
// builder's own pieces (cards, the movable rows, selects, chips).
//
// It works without script, as the rest of the builder does: Add a condition, a new
// tag and Remove save the screen as they go.
import { escapeHtml as esc } from '../../lib/html.js';
import { TAG_KINDS, TAG_PILLS, TAG_WORDS_MAX, TAGS_MAX } from '../../content/tags.js';
import { BLOCK_KIND, matches } from '../../content/fields.js';
import { recordCtx } from '../../render/parts.js';
import { conditionRows } from './records.js';
import { svg, SPILL } from './controls.js';

const option = (v, l, cur) => `<option value="${esc(v)}"${String(v) === String(cur) ? ' selected' : ''}>${esc(l)}</option>`;
const select = (name, cur, opts, label) => `<label class="half">${esc(label)}<select name="${name}">${Object.entries(opts).map(([v, l]) => option(v, l, cur)).join('')}</select></label>`;
const words = (name, value, label) => `<label class="half">${esc(label)}<input type="text" name="${name}" value="${esc(value)}" maxlength="${TAG_WORDS_MAX}" placeholder="Champion"></label>`;
const pillOf = (t) => `<span class="spill ${SPILL[t.pill] ?? 'brass'}">${esc(t.words || 'No words yet')}</span>`;
// A tag rule as a pretend block, so the block screen's condition rows serve it.
const asBlock = (t) => ({ id: t.id, type: t.kind === 'puppy' ? 'pups' : 'dogs', where: t.where });
const recordsOf = (snap, kind) => (kind === 'dog' ? snap.dogs : snap.litters.flatMap((l) => l.puppies ?? []));
const nameOf = (r) => String(r.call_name ?? r.name ?? '').replace(/\*$/, '');

function ruleCard(snap, t, rc) {
  const b = asBlock(t);
  const k = (f) => `b.${t.id}.${f}`;
  const hits = recordsOf(snap, t.kind).filter((r) => matches(BLOCK_KIND[b.type], r, t.where, rc));
  return `<li class="mvr item"><span class="ttl">
    <div class="between">${pillOf(t)}<button class="link small danger" name="act" value="del:${esc(t.id)}">${svg('trash')} Remove this tag</button></div>
    <div class="fgrid">${words(`t.${t.id}.words`, t.words, 'Its words')}${select(`t.${t.id}.pill`, t.pill, TAG_PILLS, 'Its pill')}${select(`t.${t.id}.kind`, t.kind, TAG_KINDS, 'On')}</div>
    ${conditionRows(snap, b, k, rc, { without: ['tags'], intro: 'Every one must hold. For one thing or another, add a second tag with the same words.' })}
    <span class="hint">${hits.length ? `On ${hits.length} now: ${esc(hits.slice(0, 8).map(nameOf).join(', '))}${hits.length > 8 ? '…' : ''}` : `On no ${t.kind === 'dog' ? 'dog' : 'pup'} on the site now`}${t.where.length ? '' : ' (with no conditions, it is on every one)'}.</span>
  </span></li>`;
}

export function tagsScreen(snap, tags, error, today = null) {
  const rc = recordCtx(snap, today);
  const rules = tags.rules.map((t) => ruleCard(snap, t, rc)).join('');
  const own = tags.own.map((t) => `<li class="mvr item"><span class="ttl"><div class="fgrid">${words(`own.${t.id}.words`, t.words, 'Its words')}${select(`own.${t.id}.pill`, t.pill, TAG_PILLS, 'Its pill')}</div>
    <span class="row">${pillOf(t)}<button class="link small danger" name="act" value="del:${esc(t.id)}">${svg('trash')} Remove</button></span></span></li>`).join('');
  return `<div class="stack">${error ? `<p class="error" role="alert">${esc(error)}</p>` : ''}
    <section class="card"><div class="fgroup"><h2>Tags by rule</h2>
      <p class="small muted">Each is on every dog (or pup) its conditions hold for, like "Champion" for a title that includes CH. A tag is then a field like any other, for a block's conditions and groups, and a card item (Tags) to show its pills.</p>
      ${rules ? `<ul class="mvl">${rules}</ul>` : ''}
      ${tags.rules.length < TAGS_MAX ? `<div class="fgrid">${select('addkind', 'dog', TAG_KINDS, 'A new tag on')}<div class="half"><button class="button small" name="act" value="rule+">${svg('plus')} Add a tag by rule</button></div></div>` : ''}</div></section>
    <section class="card"><div class="fgroup"><h2>Tags the breeder can choose</h2>
      <p class="small muted">She ticks these on a dog in her Site Manager. With none here, her dog form doesn't offer tags. A tag she ticked that you remove stops showing; it comes back if you add it again.</p>
      ${own ? `<ul class="mvl">${own}</ul>` : ''}
      ${tags.own.length < TAGS_MAX ? `<div class="row"><button class="button small" name="act" value="own+">${svg('plus')} Add a tag she can choose</button></div>` : ''}</div></section></div>`;
}


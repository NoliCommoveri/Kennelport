// A menu link to a group of a block (kennelos-contract.md B2: Girls and Boys' siblings),
// in the owner's Menu screen (builder.js menuScreen): what Add offers, and how an item
// reads in the list. The site shows the link while its group has anything in it
// (render/parts.js groupLink); on a Show filter block it opens the page with that group
// chosen, elsewhere it lands on the group's heading.
import { pageBlocks, customPages, PAGE_DEFAULTS, blockName } from '../../content/blocks.js';
import { BLOCK_KIND, FIELDS, grouped } from '../../content/fields.js';
import { recordCtx, recordsOfKind, groupLabel, addedWords } from '../../render/parts.js';

const PAGE_KEYS = (build) => ['home', ...Object.keys(PAGE_DEFAULTS), ...customPages(build).map((c) => c.id)];

// The groups a grouped block has, from every record of its kind; a group that's empty
// today can still be placed, and hides until it has something.
// A field with set values (a life stage, a sex) offers every one of them.
function groupsOf(snap, b) {
  const kind = BLOCK_KIND[b.type];
  const now = grouped(kind, recordsOfKind(snap, kind), b.group, b.gw, recordCtx(snap));
  const spec = FIELDS[kind][b.group];
  if (spec.kind !== 'enum') return now;
  const rest = Object.keys(spec.values).filter((k) => !now.some((g) => g.key === k))
    .map((k) => ({ key: k, heading: b.gw?.[k] || spec.groups?.[k] || spec.values[k], rows: [] }));
  const at = (k) => Object.keys(spec.values).indexOf(k);
  return [...now, ...rest].sort((x, y) => (x.key === '' ? 1e9 : at(x.key)) - (y.key === '' ? 1e9 : at(y.key)));
}
const blockWords = (snap, key, b) => addedWords(snap, key, b).heading || b.w?.heading || blockName(key, b);
// The Dogs page's Girls and boys already has its places (Girls, Boys).
const hasPlaces = (key, b) => key === 'dogs' && b.id === 'all' && b.group === 'sex';

// Add's choices: group:<page>|<block>|<value> → "Group: Retired (All our dogs, Our dogs)".
export function groupChoices(snap, build, pageLabel) {
  const out = {};
  for (const key of PAGE_KEYS(build)) {
    for (const b of pageBlocks(build, key)) {
      if (!BLOCK_KIND[b.type] || !b.group || hasPlaces(key, b)) continue;
      for (const g of groupsOf(snap, b)) out[`group:${key}|${b.id}|${g.key}`] = `Group: ${groupLabel(snap, b, g)} (${pageLabel(key)}, ${blockWords(snap, key, b)})`;
    }
  }
  return out;
}

// An item from Add's choice, or null.
export function groupItem(ref) {
  const [page, block, ...rest] = String(ref ?? '').split('|');
  return page && block && rest.length ? { type: 'group', page, block, key: rest.join('|') } : null;
}

// Its name and line in the list.
export function groupItemLine(snap, build, it, pageLabel) {
  const b = pageBlocks(build, it.page).find((x) => x.id === it.block);
  if (!b || !BLOCK_KIND[b.type] || !b.group) return [it.text || it.key, `A group on ${pageLabel(it.page)} · its block is gone or no longer grouped, so it doesn't show`];
  const g = groupsOf(snap, b).find((x) => x.key === it.key);
  const name = g ? groupLabel(snap, b, g) : it.key;
  return [it.text || name, `A group on ${pageLabel(it.page)} · ${blockWords(snap, it.page, b)} · shows while it has anything in it`];
}
// Its own name, for Its words' placeholder.
export const groupItemName = (snap, build, it, pageLabel) => groupItemLine(snap, build, { ...it, text: '' }, pageLabel)[0];

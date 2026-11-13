// Tags (docs/plans/kennelos-contract.md Part D): short labels on a dog or a pup, each
// a pill. Two sources, both kept in the site's build (`build.tags`), shown in the
// snapshot as `tags`:
//
//   rules: the owner's tags by rule, each a kind (dog or puppy), its words, its pill
//          and conditions over the fields (content/fields.js, B2), all of which hold;
//   own:   the tags the owner allows the breeder for this site (words and pill), which
//          she ticks on a dog in her Site Manager (dogs.tags: their ids).
//
// A tag is a field like any other (fields.js `tags`): a condition, a grouping, a card
// item. A tag rule's own conditions never read tags (that would go round in circles):
// a condition on tags in one is dropped.
import { cleanWhere, WHERE_MAX, TICK_OPS } from './fields.js';

export const TAGS_MAX = 20;
export const TAG_WORDS_MAX = 30;
export const TAG_KINDS = Object.freeze({ dog: 'Dogs', puppy: 'Pups' });
// The site's two status pills (render: .status.avail, .status.res).
export const TAG_PILLS = Object.freeze({ avail: 'Green', res: 'Brass' });
export const TAG_ID = /^t[a-z0-9]{6,20}$/;

export const newTagId = () => `t${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`;
const words = (v) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, TAG_WORDS_MAX);
const pill = (v) => (Object.hasOwn(TAG_PILLS, v) ? v : 'res');

// A stored or posted list, cleaned: unknown keys dropped, ids kept (a new one made
// where missing), at most TAGS_MAX of each.
export function cleanTags(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const seen = new Set();
  const id = (v) => {
    let x = TAG_ID.test(String(v ?? '')) ? String(v) : newTagId();
    while (seen.has(x)) x = newTagId();
    seen.add(x);
    return x;
  };
  const rules = (Array.isArray(src.rules) ? src.rules : []).slice(0, TAGS_MAX).map((t) => {
    const kind = Object.hasOwn(TAG_KINDS, t?.kind) ? t.kind : 'dog';
    return { id: id(t?.id), kind, words: words(t?.words), pill: pill(t?.pill), where: cleanWhere(kind, t?.where).filter((c) => c.field !== 'tags') };
  });
  const own = (Array.isArray(src.own) ? src.own : []).slice(0, TAGS_MAX).map((t) => ({ id: id(t?.id), words: words(t?.words), pill: pill(t?.pill) }));
  return { rules, own };
}

export const noTags = () => ({ rules: [], own: [] });

// ---------- the owner's Tags screen, from its form ----------

// Names: t.<id>.kind | .words | .pill, and its conditions as a data block's
// (b.<id>.where.<i>.field | .op | .value, content/blocks.js recordsFromForm); own.<id>.words |
// .pill. What was pressed (`act`): rule+ (a new tag by rule, of kind .addkind), own+ (a
// new tag of hers), del:<id>, cond+:<id> (with b.<id>.addcond), cond-:<id>:<i>.
export function tagsFromForm(current, get, getAll) {
  const cur = cleanTags(current);
  const rules = cur.rules.map((t) => {
    const k = (f) => `b.${t.id}.${f}`;
    const kind = Object.hasOwn(TAG_KINDS, get(`t.${t.id}.kind`)) ? String(get(`t.${t.id}.kind`)) : t.kind;
    const where = [];
    for (let i = 0; i < WHERE_MAX; i++) {
      const field = get(k(`where.${i}.field`));
      if (field == null) continue;
      const was = t.where[i];
      const op = String(get(k(`where.${i}.op`)) ?? '');
      const changed = !was || was.field !== field || kind !== t.kind;
      where.push({ field: String(field), op, value: changed ? '' : TICK_OPS.includes(op) ? getAll(k(`where.${i}.value`)) : get(k(`where.${i}.value`)) });
    }
    return { ...t, kind, words: get(`t.${t.id}.words`) ?? t.words, pill: get(`t.${t.id}.pill`) ?? t.pill, where: kind === t.kind ? where : [] };
  });
  const own = cur.own.map((t) => ({ ...t, words: get(`own.${t.id}.words`) ?? t.words, pill: get(`own.${t.id}.pill`) ?? t.pill }));
  let next = { rules, own };
  const [verb, id, i] = String(get('act') ?? '').split(':');
  if (verb === 'rule+' && rules.length < TAGS_MAX) {
    const kind = Object.hasOwn(TAG_KINDS, get('addkind')) ? String(get('addkind')) : 'dog';
    next.rules = [...rules, { id: newTagId(), kind, words: '', pill: 'res', where: [] }];
  }
  if (verb === 'own+' && own.length < TAGS_MAX) next.own = [...own, { id: newTagId(), words: '', pill: 'res' }];
  if (verb === 'del') next = { rules: rules.filter((t) => t.id !== id), own: own.filter((t) => t.id !== id) };
  if (verb === 'cond+') {
    const field = String(get(`b.${id}.addcond`) ?? '');
    next.rules = rules.map((t) => (t.id === id && field && field !== 'tags' && t.where.length < WHERE_MAX ? { ...t, where: [...t.where, { field, op: '', value: '' }] } : t));
  }
  if (verb === 'cond-') next.rules = rules.map((t) => (t.id === id ? { ...t, where: t.where.filter((_, n) => n !== Number(i)) } : t));
  return cleanTags(next);
}

// A tag with no words never shows; the screen says so.
export const shownTags = (list) => list.filter((t) => t.words);

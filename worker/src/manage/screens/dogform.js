// A dog in her Site Manager, beyond the plain form (manage/screens.js recordScreens):
// - Life stage, one choice in place of the stored status and its two flags (the owner,
//   2026-11-12): KennelOS's five, in the site's words (content/rules.js DOG_PLACES).
//   Read from the record for the form; written back to the three columns on save.
//   On a dog KennelOS sends, it is KennelOS's, shown and not editable, as status was.
// - Its pedigree (docs/plans/kennelos-contract.md B6): its sire and dam, theirs and
//   on, four generations, from her dog records. A parent typed by name has Make a dog
//   record: a Not my dog record with that name, linked in its place, so its own
//   parents can be added and it can have a page.
// Her wording is in manage/wording.js (dogform.*) and forms.js LABELS (life_stage).
import { escapeHtml as esc } from '../../lib/html.js';
import { DOG_PLACES } from '../../content/rules.js';
import { lifeStage, GENERATIONS } from '../../content/fields.js';

const STAGE_COLUMNS = ['status', 'upcoming', 'for_sale'];

// The form's fields for a dog: Life stage where the status was, without the two flags.
export function dogFormFields(fields) {
  const out = {};
  for (const [n, f] of Object.entries(fields)) {
    if (n === 'status') out.life_stage = { type: 'enum', values: Object.keys(DOG_PLACES), default: 'breeding' };
    else if (!STAGE_COLUMNS.includes(n)) out[n] = f;
  }
  return out;
}

// A record (or what the form sent back) as the form shows it.
export const withLifeStage = (v) => (v ? { ...v, life_stage: v.life_stage ?? lifeStage(v) } : v);

// What the form sent, as the record stores it.
export function fromLifeStage(values) {
  const [status, upcoming, forSale] = DOG_PLACES[values.life_stage] ?? DOG_PLACES.breeding;
  const out = { ...values, status, upcoming, for_sale: forSale };
  delete out.life_stage;
  return out;
}

// KennelOS owns the life stage while it owns the status.
export const lockLifeStage = (lock) => (lock?.has('status') ? new Set([...lock, 'life_stage']) : lock);

// Its pedigree, nearest first: [{ path: ['sire', 'dam'], dog | name, child, role }].
// A record's parents go on; a typed name ends its line.
export function pedigreeOf(dog, dogs) {
  const byId = new Map(dogs.map((d) => [d.id, d]));
  const out = [];
  let gen = [{ dog, path: [] }];
  const seen = new Set([dog.id]);
  for (let g = 0; g < GENERATIONS && gen.length; g++) {
    const next = [];
    for (const { dog: x, path } of gen) {
      for (const role of ['sire', 'dam']) {
        const p = byId.get(x[`${role}_id`]);
        const at = [...path, role];
        if (p && !seen.has(p.id)) { seen.add(p.id); out.push({ path: at, dog: p }); next.push({ dog: p, path: at }); }
        else if (!p && x[`${role}_name`]) out.push({ path: at, name: x[`${role}_name`], child: x, role });
      }
    }
    gen = next;
  }
  return out;
}

// "Sire", "Sire's dam", "Dam's sire's sire".
const pathWords = (path, say) => path.map((r, i) => {
  const w = say(`dogform.${r}`);
  return i ? w.toLowerCase() : w;
}).join("'s ");

export function pedigreeCard(dog, dogs, base, say) {
  const rows = pedigreeOf(dog, dogs);
  const body = rows.length
    ? `<ul class="items">${rows.map((r) => (r.dog
      ? `<li class="item"><a href="${base}/dogs/${esc(r.dog.id)}"><b>${esc(r.dog.call_name)}</b><span>${esc(pathWords(r.path, say))}</span></a></li>`
      // Known by name only: the name links to where it's typed (its child's Parents), as
      // "Not on your site" rows link to the dog, with the button beside it.
      : `<li class="item going"><a href="${base}/dogs/${esc(r.child.id)}#f-${r.role}_name"><b>${esc(r.name)}</b><span>${esc(pathWords(r.path, say))} · ${esc(say('dogform.name_only'))}</span></a>
        <form method="post" action="${base}/dogs/${esc(r.child.id)}/make-${r.role}"><button class="button small">${esc(say('dogform.make_record'))}</button></form></li>`)).join('')}</ul>`
    : `<p class="muted small">${esc(say('dogform.no_parents'))}</p>`;
  return `<section class="card" id="pedigree"><h2>${esc(say('dogform.pedigree'))}</h2><p class="muted small">${esc(say('dogform.pedigree_hint'))}</p>${body}</section>`;
}

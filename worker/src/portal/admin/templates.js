// The checklist and timeline templates, in the portal's admin (/s/<sub>/portal/
// checklist and /timeline, routed by portal/admin.js): the items every new family's
// checklist and timeline start from, and the programs (products) they can link to.
import { escapeHtml as esc } from '../../lib/html.js';
import { CHECK_AUTO, TASK_AUTO } from '../steps.js';
import { note, errorBox } from './parts.js';

export const products = async (env, siteId) => (await env.DB.prepare('SELECT id, name, portal_show, portal_type, family_action, portal_per_family FROM products WHERE site_id = ? ORDER BY sort, name').bind(siteId).all()).results;

export const KIND_WORDS = {
  checklist: { title: 'Go-home checklist', one: 'item', hint: 'What to have ready before the puppy comes home. Every family gets this list from two weeks before go-home; you can hide an item or add one for a family on their screen.' },
  task: { title: 'First-weeks timeline', one: 'task', hint: 'Each task is dated from the puppy\'s birth or from pickup. A task counted from birth that falls by go-home is yours: families see it as done by you. Write {name} for the puppy\'s name.' },
};

export function programSelect(products, current) {
  const shown = products.filter((x) => x.portal_show || x.id === current);
  return `<label>Links to<select name="product_id"><option value="">No program</option>${shown.map((x) => `<option value="${esc(x.id)}"${x.id === current ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select><span class="hint">A program families see (Portal settings). Its link and code go with the step.</span></label>`;
}

export function itemFields(kind, x, products) {
  const auto = kind === 'checklist' ? CHECK_AUTO : TASK_AUTO;
  const autoField = `<label>Ticks itself<select name="auto"><option value="">No: the family ticks it</option>${Object.entries(auto).map(([k, l]) => `<option value="${k}"${x?.auto === k ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
  if (kind === 'checklist') {
    return `<label>Item<input name="title" value="${esc(x?.title ?? '')}" required maxlength="160" placeholder="A crate with a divider"><span class="hint">Write {food} for the food in Portal settings.</span></label>
      ${programSelect(products, x?.product_id)}${autoField}`;
  }
  const days = x ? Math.abs(x.offset_days) : '';
  const when = x ? (x.offset_days < 0 ? 'before' : 'after') : 'after';
  return `<label>Task<input name="title" value="${esc(x?.title ?? '')}" required maxlength="160" placeholder="Register {name}"></label>
    <label>What to do<input name="body" value="${esc(x?.body ?? '')}" maxlength="600" placeholder="Your registration paper is in the go-home folder."></label>
    <div class="row"><label>Days<input name="days" inputmode="numeric" value="${esc(days)}" maxlength="4" required></label>
      <label>&nbsp;<select name="when"><option value="after"${when === 'after' ? ' selected' : ''}>after</option><option value="before"${when === 'before' ? ' selected' : ''}>before</option></select></label>
      <label>&nbsp;<select name="count_from"><option value="pickup"${x?.count_from !== 'birth' ? ' selected' : ''}>pickup</option><option value="birth"${x?.count_from === 'birth' ? ' selected' : ''}>birth</option></select></label></div>
    ${programSelect(products, x?.product_id)}
    <label>Button words<input name="button_label" value="${esc(x?.button_label ?? '')}" maxlength="60" placeholder="Activate the trial"><span class="hint">On the program's link. Blank: the program's own.</span></label>
    ${autoField}`;
}

// "5 days after pickup", "70 days from birth".
export const whenWords = (t) => (t.count_from === 'birth' ? `${t.offset_days} days from birth` : t.offset_days === 0 ? 'Pickup day' : `${Math.abs(t.offset_days)} day${Math.abs(t.offset_days) === 1 ? '' : 's'} ${t.offset_days < 0 ? 'before' : 'after'} pickup`);

// The form's "days" and "when" as one signed number.
export const formOffset = (values) => ({ ...values, offset_days: values.days === undefined ? values.offset_days : `${values.when === 'before' ? '-' : ''}${String(values.days ?? '').trim().replace(/^-/, '')}` });

export function itemMeta(kind, x, products) {
  const bits = [];
  if (kind === 'task') bits.push(whenWords(x));
  const prod = products.find((y) => y.id === x.product_id);
  if (prod) bits.push(`${prod.name}${prod.portal_show ? '' : ' (not shown)'}`);
  if (x.auto) bits.push(kind === 'checklist' ? 'ticks itself' : 'done by itself');
  return bits.join(' · ');
}

export function templateScreen(site, kind, items, products, url, { error } = {}) {
  const w = KIND_WORDS[kind];
  const base = `/s/${esc(site.subdomain)}/portal/${kind === 'checklist' ? 'checklist' : 'timeline'}`;
  const rows = items.map((x, i) => `<details class="card"><summary><b>${esc(x.title)}</b><br><span class="hint">${esc(itemMeta(kind, x, products))}</span></summary>
    <form method="post" action="${base}/${esc(x.id)}"><div class="fgrid">${itemFields(kind, x, products)}<p><button class="primary">Save</button></p></div></form>
    <div class="row">${i ? `<form method="post" action="${base}/${esc(x.id)}/up"><button>Move up</button></form>` : ''}${i < items.length - 1 ? `<form method="post" action="${base}/${esc(x.id)}/down"><button>Move down</button></form>` : ''}
    <form method="post" action="${base}/${esc(x.id)}/remove"><button class="link">Remove from every family's list</button></form></div></details>`).join('');
  return `${note(url)}${errorBox(error)}<section class="card"><h1>${esc(w.title)}</h1><p class="hint">${esc(w.hint)}</p>
    ${items.length ? '' : `<form method="post" action="${base}/suggested"><p><button class="primary">Start with the suggested ${kind === 'checklist' ? 'list' : 'timeline'}</button></p><p class="hint">${kind === 'checklist' ? 'Crate, bed, food, bowls, collar and leash, pads, chews, the vet booking and a carrier.' : 'The vet booking, pickup, the vet visit, insurance, food, registration, deworming and vaccines.'} Each links to your programs of that kind. Change anything after.</p></form>`}</section>
    ${rows}
    <form method="post" action="${base}/new" class="card"><h2>Add ${kind === 'checklist' ? 'an item' : 'a task'}</h2><div class="fgrid">${itemFields(kind, null, products)}<p><button>Add</button></p></div></form>`;
}

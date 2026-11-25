// The checklist and timeline templates, in the portal's admin (/s/<sub>/portal/
// checklist and /timeline, routed by portal/admin.js): the items every new family's
// checklist and timeline start from, and the programs (products) they can link to.
// Its wording is the owner's (manage/wording-portal.js ptpl.*); the ready-made tasks
// and suggested lists (steps.js) are starting content, not her instructions.
import { escapeHtml as esc } from '../../lib/html.js';
import { CHECK_AUTO, TASK_AUTO, READY_TASKS, namedPuppy } from '../steps.js';
import { note, errorBox } from './parts.js';
import { defaultSay } from '../../manage/wording.js';
import { PORTAL_TIMING, daysText } from '../timing.js';

export const products = async (env, siteId) => (await env.DB.prepare('SELECT id, name, portal_show, portal_type, family_action, portal_per_family FROM products WHERE site_id = ? ORDER BY sort, name').bind(siteId).all()).results;

const t = (say, key, vars) => esc(say(key, vars));

export function programSelect(products, current, say = defaultSay) {
  const shown = products.filter((x) => x.portal_show || x.id === current);
  return `<label>${t(say, 'ptpl.links_to')}<select name="product_id"><option value="">${t(say, 'ptpl.no_program')}</option>${shown.map((x) => `<option value="${esc(x.id)}"${x.id === current ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select><span class="hint">${t(say, 'ptpl.links_to_hint')}</span></label>`;
}

export function itemFields(kind, x, products, say = defaultSay) {
  const auto = kind === 'checklist' ? CHECK_AUTO : TASK_AUTO;
  const autoField = `<label>${t(say, 'ptpl.auto')}<select name="auto"><option value="">${t(say, 'ptpl.auto_no')}</option>${Object.keys(auto).map((k) => `<option value="${k}"${x?.auto === k ? ' selected' : ''}>${t(say, `ptpl.auto.${k}`)}</option>`).join('')}</select></label>`;
  if (kind === 'checklist') {
    return `<label>${t(say, 'ptpl.item')}<input name="title" value="${esc(x?.title ?? '')}" required maxlength="160" placeholder="${t(say, 'ptpl.item_ph')}"><span class="hint">${t(say, 'ptpl.item_hint')}</span></label>
      ${programSelect(products, x?.product_id, say)}${autoField}`;
  }
  const days = x ? Math.abs(x.offset_days) : '';
  const when = x ? (x.offset_days < 0 ? 'before' : 'after') : 'after';
  return `<label>${t(say, 'ptpl.task')}<input name="title" value="${esc(x?.title ?? '')}" required maxlength="160" placeholder="${t(say, 'ptpl.task_ph')}"></label>
    <label>${t(say, 'ptpl.body')}<input name="body" value="${esc(x?.body ?? '')}" maxlength="600" placeholder="${t(say, 'ptpl.body_ph')}"></label>
    <div class="row"><label>${t(say, 'ptpl.days')}<input name="days" inputmode="numeric" value="${esc(days)}" maxlength="4" required></label>
      <label>&nbsp;<select name="when"><option value="after"${when === 'after' ? ' selected' : ''}>${t(say, 'ptpl.after')}</option><option value="before"${when === 'before' ? ' selected' : ''}>${t(say, 'ptpl.before')}</option></select></label>
      <label>&nbsp;<select name="count_from"><option value="pickup"${x?.count_from !== 'birth' ? ' selected' : ''}>${t(say, 'ptpl.pickup')}</option><option value="birth"${x?.count_from === 'birth' ? ' selected' : ''}>${t(say, 'ptpl.birth')}</option></select></label></div>
    ${programSelect(products, x?.product_id, say)}
    <label>${t(say, 'ptpl.button')}<input name="button_label" value="${esc(x?.button_label ?? '')}" maxlength="60" placeholder="${t(say, 'ptpl.button_ph')}"><span class="hint">${t(say, 'ptpl.button_hint')}</span></label>
    ${autoField}`;
}

// The ready-made tasks, grouped by her shown programs (each with its type's
// wordings), and registration with no program. {name} is left as she writes it.
export function readyForm(action, products, { forOne = '', say = defaultSay } = {}) {
  const opt = (pid, kind, i, c) => `<option value="${esc(`${pid}|${kind}|${i}`)}">${esc(c.title)}: ${esc(c.body)}</option>`;
  const shown = products.filter((x) => x.portal_show);
  // In the order the tasks fall after pickup (each kind's usual day), so adding them
  // one after another lands them in date order: a new task goes to the bottom.
  const entries = shown.map((x) => {
    const kind = READY_TASKS[x.portal_type] ? x.portal_type : 'other';
    return { days: READY_TASKS[kind].days, html: `<optgroup label="${esc(x.name)}">${READY_TASKS[kind].choices.map((c, i) => (c.noProgram ? '' : opt(x.id, kind, i, c).replace(/\{program\}/g, esc(x.name)))).join('')}</optgroup>` };
  });
  // Registration with no program: every wording, or with a registration program shown,
  // only those that never take one (the microchip), first by their own day.
  const regProgram = shown.some((x) => x.portal_type === 'registration');
  const loose = READY_TASKS.registration.choices.map((c, i) => ({ c, i })).filter(({ c }) => !regProgram || c.noProgram);
  if (loose.length) entries.push({ days: Math.min(...loose.map(({ c }) => c.days ?? READY_TASKS.registration.days)), html: `<optgroup label="${t(say, 'ptpl.ready_registration')}">${loose.map(({ c, i }) => opt('', 'registration', i, c)).join('')}</optgroup>` });
  const groups = entries.map((e, i) => ({ ...e, i })).sort((a, b) => a.days - b.days || a.i - b.i).map((e) => e.html);
  const days = Object.entries(READY_TASKS).map(([k, r]) => `${say(`pset.type.${k}`).toLowerCase()} ${r.days}`).join(', ');
  return `<form method="post" action="${action}" class="card"><h2>${t(say, 'ptpl.ready_title')}${forOne}</h2>
    <p class="hint">${t(say, shown.length ? 'ptpl.ready_hint' : 'ptpl.ready_hint_none')}</p>
    <div class="fgrid"><label>${t(say, 'ptpl.task')}<select name="ready" required><option value="">${t(say, 'ppup.choose')}</option>${groups.join('')}</select>
      <span class="hint">${t(say, 'ptpl.ready_days', { days })}</span></label>
    <p><button>${t(say, 'pf.add')}</button></p></div></form>`;
}

// "5 days after pickup", "70 days from birth".
export const whenWords = (x, say = defaultSay) => {
  const n = Math.abs(x.offset_days);
  if (x.count_from === 'birth') return say('ptpl.when_birth', { n: x.offset_days });
  if (x.offset_days === 0) return say('ptpl.when_pickup_day');
  return say(`ptpl.when_${x.offset_days < 0 ? 'before' : 'after'}.${n === 1 ? 'one' : 'many'}`, { n });
};

// The form's "days" and "when" as one signed number.
export const formOffset = (values) => ({ ...values, offset_days: values.days === undefined ? values.offset_days : `${values.when === 'before' ? '-' : ''}${String(values.days ?? '').trim().replace(/^-/, '')}` });

export function itemMeta(kind, x, products, say = defaultSay) {
  const bits = [];
  if (kind === 'task') bits.push(whenWords(x, say));
  const prod = products.find((y) => y.id === x.product_id);
  if (prod) bits.push(prod.portal_show ? prod.name : say('ptpl.not_shown', { program: prod.name }));
  if (x.auto) bits.push(say(kind === 'checklist' ? 'ptpl.ticks_itself' : 'ptpl.done_itself'));
  return bits.join(' · ');
}

// A template step naming one puppy: every family would read that name.
const nameWarning = (x, names, say) => {
  const n = namedPuppy(x, names);
  return n ? `<br><span class="error">${t(say, 'ptpl.named', { pup: n })}</span>` : '';
};

// "Register {name}" and the microchip's registration stay suggested on her timeline
// until each is on it: her own wording (a task she adjusted or removed) is hers to keep,
// and this is one tap to add (to the bottom, as every new task). A list she had before
// the microchip task existed gets it this way, with nothing else changed.
function registerSuggestion(base, items, products, say) {
  const reg = READY_TASKS.registration;
  const has = (c) => items.some((x) => x.title === c.title);
  const card = (i) => {
    const c = reg.choices[i];
    if (has(c)) return '';
    const prog = c.noProgram ? null : products.find((x) => x.portal_show && x.portal_type === 'registration');
    const n = c.days ?? reg.days;
    return `<form method="post" action="${base}/ready" class="card"><h2>${t(say, 'ptpl.suggested', { task: c.title })}</h2>
    <p>${esc(c.body)}</p><p class="hint">${prog ? t(say, 'ptpl.suggested_when_program', { n, button: reg.button, program: prog.name }) : t(say, 'ptpl.suggested_when', { n })} ${t(say, 'ptpl.suggested_hint')}</p>
    <input type="hidden" name="ready" value="${esc(`${prog?.id ?? ''}|registration|${i}`)}"><p><button class="primary">${t(say, 'ptpl.suggested_add')}</button></p></form>`;
  };
  // Earliest first, as they fall after pickup.
  return reg.choices.map((c, i) => ({ c, i })).filter(({ c, i }) => i === 0 || c.noProgram)
    .sort((a, b) => (a.c.days ?? reg.days) - (b.c.days ?? reg.days)).map(({ i }) => card(i)).join('');
}

export function templateScreen(site, kind, items, products, url, { error, names = [], say = defaultSay, timing = PORTAL_TIMING } = {}) {
  const base = `/s/${esc(site.subdomain)}/portal/${kind === 'checklist' ? 'checklist' : 'timeline'}`;
  const rows = items.map((x, i) => `<details class="card"><summary><b>${esc(x.title)}</b><br><span class="hint">${esc(itemMeta(kind, x, products, say))}</span>${nameWarning(x, names, say)}</summary>
    <form method="post" action="${base}/${esc(x.id)}"><div class="fgrid">${itemFields(kind, x, products, say)}<p><button class="primary">${t(say, 'pf.save')}</button></p></div></form>
    <div class="row">${i ? `<form method="post" action="${base}/${esc(x.id)}/up"><button>${t(say, 'ptpl.up')}</button></form>` : ''}${i < items.length - 1 ? `<form method="post" action="${base}/${esc(x.id)}/down"><button>${t(say, 'ptpl.down')}</button></form>` : ''}
    <form method="post" action="${base}/${esc(x.id)}/remove"><button class="link">${t(say, 'ptpl.remove')}</button></form></div></details>`).join('');
  return `${note(url, say)}${errorBox(error, say)}<section class="card"><h1>${t(say, `ptpl.${kind}.title`)}</h1><p class="hint">${t(say, `ptpl.${kind}.hint`, { when: daysText(timing.checklist_days_before) })}</p>
    ${items.length ? '' : `<form method="post" action="${base}/suggested"><p><button class="primary">${t(say, `ptpl.${kind}.start`)}</button></p><p class="hint">${t(say, `ptpl.${kind}.start_hint`)}</p></form>`}</section>
    ${rows}
    ${kind === 'task' && items.length ? registerSuggestion(base, items, products, say) : ''}
    ${kind === 'task' ? readyForm(`${base}/ready`, products, { say }) : ''}
    <form method="post" action="${base}/new" class="card"><h2>${t(say, `ptpl.${kind}.add`)}</h2><div class="fgrid">${itemFields(kind, null, products, say)}<p><button>${t(say, 'pf.add')}</button></p></div></form>`;
}

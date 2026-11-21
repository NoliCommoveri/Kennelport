// Her go-home bag (docs/plans/portal-go-home-bag.md), on the Portal tab
// (/s/<sub>/portal/bag, routed by portal/admin.js), and the Sent home with card on a
// family's screen. The data is in portal/bag.js. Every line she reads is in
// manage/wording.js (group bag).
//
// The prototype's admPortal "Go-home bag" card is the list: each row the program's
// icon (else a gift), the name in bold, "Costs you $4 · where from · tied to Program"
// under it; the expense column, an Expensed tag beside the name (so a row stays one
// line on a phone), is new (the owner, 2026-11-21). Its rows aren't editable in the prototype: each opens here to the same
// small form as Add an item, built from the template screens' card, fgrid and hint,
// as the handbook's editor is. Sent home with is the prototype's family-screen card:
// the ticks as chips, Add something else and Save.
import { escapeHtml as esc } from '../../lib/html.js';
import { ICONS, TYPE_ICON } from '../family/icons.js';
import { money, totals, inTemplate, MAX_NAME, MAX_ORIGIN, MAX_BUTTON } from '../bag.js';
import { errorBox } from './parts.js';

const NOTES = ['saved', 'added', 'removed'];
const svg = (n) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] ?? ICONS.gift}</svg>`;
const iconFor = (x) => (x.product_id && x.portal_type ? TYPE_ICON[x.portal_type] ?? 'gift' : 'gift');

function fields(x, programs, say) {
  const fromKos = x?.source === 'kennelos';
  const cents = x?.cost_cents ? (x.cost_cents / 100).toFixed(2).replace(/\.00$/, '') : '';
  const mine = fromKos ? `<p class="hint">${esc(say('bag.kennelos_hint'))}</p>` : `
    <label>${esc(say('bag.field_name'))}<input name="name" value="${esc(x?.name ?? '')}" required maxlength="${MAX_NAME}" placeholder="${esc(say('bag.field_name_ph'))}"></label>
    <div class="row"><label>${esc(say('bag.field_cost'))}<input name="cost" value="${esc(x?.cost ?? cents)}" inputmode="decimal" maxlength="12" placeholder="${esc(say('bag.field_cost_ph'))}"><span class="hint">${esc(say('bag.cost_hint'))}</span></label>
      <label class="check"><input type="hidden" name="expense_set" value="1"><input type="checkbox" name="expense" value="1"${!x || x.expense ? ' checked' : ''}> <span>${esc(say('bag.field_expense'))}<br><span class="hint">${esc(say('bag.expense_hint'))}</span></span></label></div>
    <label>${esc(say('bag.field_origin'))}<input name="origin" value="${esc(x?.origin ?? '')}" maxlength="${MAX_ORIGIN}" placeholder="${esc(say('bag.field_origin_ph'))}"></label>
    <label>${esc(say('bag.field_program'))}<select name="product_id"><option value="">${esc(say('bag.no_program'))}</option>${programs.map((p) => `<option value="${esc(p.id)}"${p.id === x?.product_id ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select><span class="hint">${esc(say('bag.program_hint'))}</span></label>`;
  return `${mine}
    <label>${esc(say('bag.field_button'))}<input name="button" value="${esc(x?.button ?? '')}" maxlength="${MAX_BUTTON}" placeholder="${esc(say('bag.button_other'))}"><span class="hint">${esc(say('bag.button_hint'))}</span></label>
    <label class="check"><input type="checkbox" name="shown" value="1"${!x || x.shown ? ' checked' : ''}> <span>${esc(say('bag.field_shown'))}</span></label>`;
}

export function bagScreen(site, items, programs, url, { error, say, values = null } = {}) {
  const base = `/s/${esc(site.subdomain)}/portal/bag`;
  const n = url.searchParams.get('note');
  const inBag = items.filter(inTemplate);
  const t = totals(inBag);
  const rows = items.map((x) => {
    const line = [x.cost_cents ? say('bag.cost_line', { cost: money(x.cost_cents) }) : say('bag.free')];
    if (x.origin) line.push(x.origin);
    if (x.product_name) line.push(say('bag.tied', { program: x.product_name }));
    const notes = [];
    if (x.hidden_by_kennelos) notes.push(say('bag.kennelos_gone'));
    else if (!x.shown) notes.push(say('bag.off_tag'));
    if (x.source === 'kennelos') notes.push(say('bag.kennelos_tag'));
    return `<li id="b-${esc(x.id)}"><span class="ico">${svg(iconFor(x))}</span><span class="grow"><b>${esc(x.name)}</b>${x.expense && x.cost_cents ? ` <span class="tag">${esc(say('bag.expensed_tag'))}</span>` : ''}<br><span class="small muted">${esc(line.join(' · '))}</span>${notes.length ? `<br><span class="hint">${esc(notes.join(' · '))}</span>` : ''}</span>
      <a href="${base}/${esc(x.id)}">${esc(say('bag.edit'))}</a></li>`;
  }).join('');
  return `${NOTES.includes(n) ? `<p class="notice" role="status">${esc(say(`bag.${n}`))}</p>` : ''}${errorBox(error)}
    <section class="card"><div class="between"><h1>${esc(say('bag.title'))}</h1><a class="button small" href="#add">${esc(say('bag.add_link'))}</a></div>
    <p class="hint">${esc(say('bag.hint'))}</p>
    ${items.length ? `<p class="muted small">${esc(say('bag.count', { n: t.n, cost: money(t.cost), expensed: money(t.expensed) }))}</p><ul class="list">${rows}</ul>` : `<p class="muted">${esc(say('bag.none'))}</p>`}</section>
    <form method="post" action="${base}/new" class="card" id="add"><h2>${esc(say('bag.add_title'))}</h2><div class="fgrid">${fields(values, programs, say)}<p><button class="primary">${esc(say('bag.add'))}</button></p></div></form>`;
}

// One item, to change: the same small form as Add an item, with its place in the
// list and Remove.
export function bagItemScreen(site, x, i, count, programs, { error, say, values = null } = {}) {
  const base = `/s/${esc(site.subdomain)}/portal/bag`;
  return `${errorBox(error)}<form method="post" action="${base}/${esc(x.id)}" class="card"><h1>${esc(x.name)}</h1><div class="fgrid">${fields(values ? { ...x, ...values } : x, programs, say)}<p><button class="primary">${esc(say('bag.save'))}</button></p></div></form>
    <div class="row">${i ? `<form method="post" action="${base}/${esc(x.id)}/up"><button>${esc(say('bag.up'))}</button></form>` : ''}${i < count - 1 ? `<form method="post" action="${base}/${esc(x.id)}/down"><button>${esc(say('bag.down'))}</button></form>` : ''}
    ${x.source === 'kennelos' ? '' : `<a href="${base}/${esc(x.id)}/remove">${esc(say('bag.remove'))}</a>`}</div>`;
}

export function removeBagScreen(site, x, say) {
  const base = `/s/${esc(site.subdomain)}/portal/bag`;
  return `<section class="card danger"><h1>${esc(say('bag.remove_title', { name: x.name }))}</h1><p>${esc(say('bag.remove_line'))}</p>
    <form method="post" action="${base}/${esc(x.id)}/remove" class="row"><button>${esc(say('bag.remove_button'))}</button><a href="${base}#b-${esc(x.id)}">${esc(say('bag.keep'))}</a></form></section>`;
}

// Sent home with, on a family's screen. bag: bagFor's { own, items }; template: her
// bag's items in it now (for ticks of ones added to it since this bag was saved).
export function sentHomeCard(action, bag, template, name, url, say) {
  const t = totals(bag.items);
  // The Photos screen's chips (app.css .chip) with label.check's tick: no new styles.
  const chip = (field, value, label, on) => `<label class="check chip"><input type="checkbox" name="${field}" value="1"${on ? ' checked' : ''}> <span>${esc(label)}</span></label>`;
  const chips = [];
  const costed = [];
  for (const x of bag.items) {
    const key = x.id ? `sent.${x.id}` : `item.${x.bag_item_id}`;
    chips.push(chip(key, 1, x.name, true));
    if (x.cost_cents) costed.push([x.id ? `sentexpense.${x.id}` : `expense.${x.bag_item_id}`, `${x.name} (${money(x.cost_cents)})`, x.expense]);
  }
  // Added to her bag since this one was saved: offered, not ticked.
  if (bag.own) {
    for (const x of template) {
      if (bag.items.some((r) => r.bag_item_id === x.id)) continue;
      chips.push(chip(`item.${x.id}`, 1, x.name, false));
      if (x.cost_cents) costed.push([`expense.${x.id}`, `${x.name} (${money(x.cost_cents)})`, x.expense]);
    }
  }
  const saved = url.searchParams.get('note') === 'bag';
  return `<form method="post" action="${action}" class="card" id="bag"><div class="between"><h2>${esc(say('bag.family_title'))}</h2><span class="small muted">${esc(say.n('bag.family_count', t.n, { cost: money(t.cost), expensed: money(t.expensed) }))}</span></div>
    ${saved ? `<p class="notice" role="status">${esc(say('bag.family_saved', { name }))}</p>` : ''}
    ${bag.own ? '' : `<p class="hint">${esc(say('bag.family_usual', { name }))}</p>`}
    ${chips.length ? `<div class="chips">${chips.join('')}</div>` : ''}
    ${costed.length ? `<details><summary>${esc(say('bag.family_expense'))}</summary><p class="hint">${esc(say('bag.family_expense_hint'))}</p>
      ${costed.map(([k, label, on]) => `<label class="check"><input type="checkbox" name="${esc(k)}" value="1"${on ? ' checked' : ''}> <span>${esc(label)}</span></label>`).join('')}</details>` : ''}
    <div class="row"><label for="bag-add" class="sr">${esc(say('bag.family_add'))}</label><input id="bag-add" name="add" maxlength="${MAX_NAME}" placeholder="${esc(say('bag.family_add_ph'))}" style="flex:1 1 12rem"><button>${esc(say('bag.family_save'))}</button></div></form>`;
}

// Pups, in the owner's build tools (GET/POST /admin/<sub>/rules, routed by
// manage/builder.js): a card per pup status row (content/rules.js STATUS_ROWS: each
// of KennelOS's, and not_open, worked out here), then registration and price
// wording. Drawn from the site builder prototype's Display rules screen.
import { escapeHtml as esc } from '../../lib/html.js';
import { STATUS_ROWS, NOT_OPEN_FIXED, STATUS_NOTES, DEFAULT_RULES } from '../../content/rules.js';
import { field, select, toggle, seg, back, same, pillChip, pillSelect } from './controls.js';

export function rulesScreen(site, rules, error) {
  const D = DEFAULT_RULES;
  const card = (k) => {
    const r = rules.status[k];
    const name = (f) => `status.${k}.${f}`;
    const fixed = (f) => k === 'not_open' && NOT_OPEN_FIXED.includes(f);
    return `<section class="card status-card"><div class="between"><span class="stcode"><span class="code">${k}</span>${r.show && r.words ? pillChip(site.scheme, r.pill, r.words) : '<span class="small muted">Not shown</span>'}</span>${same(r, D.status[k]) ? '' : back(`status.${k}`)}</div>
      <p class="small muted">${esc(STATUS_NOTES[k])}</p>
      <div class="fgrid">${field(name('words'), r.words, { label: 'Shows as', ph: 'Words on the card' })}${pillSelect(name('pill'), site.scheme, r.pill, 'Its colour')}</div>
      <div class="switches">${fixed('show') ? '' : toggle(name('show'), r.show, 'Show the pup on the site')}${toggle(name('price'), r.price, 'Show its price')}${toggle(name('ask'), r.ask, '“Ask about this puppy”')}
        ${toggle(name('fullreg'), r.fullreg, `“${rules.reg.ask}” (no registration set)`)}${fixed('older') ? '' : toggle(name('older'), r.older, 'Can be an older puppy')}${toggle(name('ribbon'), r.ribbon, 'Ribbon across its photo')}</div>
      ${k === 'not_open' ? '<p class="small muted">Always shown, like an available pup; on the day deposits open it reads as available.</p>' : ''}
      <label>Order on the litter page<span class="hint">Lower comes first; equal keeps the breeder's order.</span><select name="${name('order')}">${Object.entries({ 1: 'First', 2: 'Second', 3: 'Third', 4: 'Last' }).map(([v, l]) => `<option value="${v}"${String(v) === String(r.order) ? ' selected' : ''}>${l}</option>`).join('')}</select></label></section>`;
  };
  const changed = (part) => (same(rules[part], D[part]) ? '' : back(part));
  return `<div class="stack">
      ${error ? `<p class="error" role="alert">${esc(error)}</p>` : ''}
      <div class="fgroup"><h2>Pup statuses from KennelOS</h2></div>
      <div class="twocol">${STATUS_ROWS.map(card).join('')}</div>
      <section class="card"><div class="fgroup"><div class="between"><h2>Registration</h2>${changed('reg')}</div><div class="fgrid">
        ${field('reg.unset', rules.reg.unset, { label: 'No registration set reads', ph: 'Leave empty to say nothing' })}
        ${field('reg.limited', rules.reg.limited, { label: 'Limited reads' })}
        ${field('reg.full', rules.reg.full, { label: 'Full reads' })}
        ${field('reg.ask', rules.reg.ask, { label: 'The full-registration link' })}</div></div>
      <div class="fgroup"><div class="between"><h2>Prices</h2>${changed('price')}</div><div class="fgrid">
        ${field('price.off', rules.price.off, { label: 'When prices are off', cls: '' })}
        <div class="fld"><span class="fldt">A price range reads</span>${seg('price.style', rules.price.style, { range: '$2,800–$3,200', from: 'From $2,800' })}</div>
        ${field('price.price_label', rules.price.price_label, { label: 'Price label' })}
        ${field('price.deposit_label', rules.price.deposit_label, { label: 'Deposit label' })}</div></div></section>
    </div>`;
}

// From KennelOS, in the owner's build tools (GET/POST /admin/<sub>/kennelos, routed
// by manage/builder.js): how its data lands on the site (content/rules.js
// rules.landing): each new dog's and litter's switches, a dog's health order, where
// each KennelOS dog status goes, which puppy dogs show, a litter's name and labels
// when KennelOS sends none, and where new records go; with the panel beside it.
import { escapeHtml as esc } from '../../lib/html.js';
import { DEFAULT_RULES, DOG_PLACES, DOG_PLACE_WORDS, KOS_DOG_STATUSES, PUP_DISPOSITIONS, PUP_DISPOSITION_WORDS } from '../../content/rules.js';
import { field, select, toggle, seg, back, svg } from './controls.js';

export function kennelosScreen(site, rules, error) {
  const L = rules.landing;
  const D = DEFAULT_RULES.landing;
  const backFor = (keys) => (keys.some((k) => L[k] !== D[k]) ? back(keys.map((k) => `landing.${k}`).join(',')) : '');
  const nameKeys = ['name_pair', 'name_dam', 'name_heat', 'name_none', 'name_upcoming'];
  const dogKeys = KOS_DOG_STATUSES.map((k) => `dog_${k}`);
  const pupKeys = PUP_DISPOSITIONS.map((k) => `pup_${k}`);
  return `<div class="stack">${error ? `<p class="error" role="alert">${esc(error)}</p>` : ''}
    <p class="small muted">For each new record an Update website brings. Once it's on the site, its switches are the breeder's.</p>
    <div class="twocol">
    <section class="card"><div class="fgroup"><div class="between"><h2>Each new dog</h2>${backFor(['health_display'])}</div>
      ${select('landing.health_display', L.health_display, { normal_only: 'Normal results only', all: 'All results', none: 'None' }, 'Health results shown', '')}</div>
      <div class="fgroup"><div class="between"><h2>Health results' order</h2>${backFor(['health_order'])}</div>
      ${seg('landing.health_order', L.health_order, { hers: 'Hers', kennelos: 'KennelOS’s' })}
      <span class="hint">Every dog, at each update. Hers: each result stays where she put it, a new one goes last. KennelOS’s: its order every time.</span></div></section>
    <section class="card"><div class="fgroup"><div class="between"><h2>Each new litter</h2>${backFor(['show_placed', 'show_prices'])}</div>
      <div class="switches">${toggle('landing.show_placed', L.show_placed, 'Show placed puppies')}</div>
      ${select('landing.show_prices', L.show_prices, { kos_prices: 'On, with Use my KennelOS prices', off: 'Off: the breeder switches them on' }, 'Show prices', '')}</div></section>
    </div>
    <section class="card"><div class="fgroup"><div class="between"><h2>Where each KennelOS dog status goes</h2>${backFor(dogKeys)}</div>
      <ul class="list">${KOS_DOG_STATUSES.map((k) => `<li><span class="grow"><span class="code">${k}</span></span><select name="landing.dog_${k}" aria-label="${esc(k)}" class="place">${Object.keys(DOG_PLACES).map((v) => `<option value="${v}"${L[`dog_${k}`] === v ? ' selected' : ''}>${esc(DOG_PLACE_WORDS[v])}</option>`).join('')}</select></li>`).join('')}</ul></div>
      <div class="fgroup"><div class="between"><h2>Which <span class="code">puppy</span> dogs go on the site</h2>${backFor(pupKeys)}</div>
      <p class="small muted">A KennelOS puppy dog marked Show on website, by her disposition for it in KennelOS. One switched on goes where <span class="code">puppy</span> goes above (Up and coming, to start); one left out is off the site, and waits in her draft under Not on your site. Until her KennelOS sends dispositions (an update of KennelOS, then Update website), every one shows.</p>
      <div class="switches boxed">${PUP_DISPOSITIONS.map((k) => toggle(`landing.pup_${k}`, L[`pup_${k}`], PUP_DISPOSITION_WORDS[k])).join('')}</div></div></section>
    <section class="card"><div class="fgroup"><div class="between"><h2>A litter's name, when KennelOS sends none</h2>${backFor(nameKeys)}</div><div class="fgrid">
      ${field('landing.name_pair', L.name_pair, { label: 'Dam and sire known', hint: '{dam} and {sire} are their names.' })}${field('landing.name_dam', L.name_dam, { label: 'Only the dam' })}
      ${field('landing.name_heat', L.name_heat, { label: 'A heat' })}${field('landing.name_none', L.name_none, { label: 'A heat with no dam named' })}
      ${field('landing.name_upcoming', L.name_upcoming, { label: 'No parents named' })}</div></div>
    <div class="fgroup"><div class="between"><h2>Planned-litter labels</h2>${backFor(['label_heat', 'label_pairing'])}</div><div class="fgrid">
      ${field('landing.label_heat', L.label_heat, { label: 'From a heat' })}${field('landing.label_pairing', L.label_pairing, { label: 'From a pairing' })}</div></div>
    <div class="fgroup"><div class="between"><h2>New dogs and litters go</h2>${backFor(['new_at'])}</div>${seg('landing.new_at', L.new_at, { end: 'At the end of her order', start: 'First' })}</div></section></div>`;
}

// What each new record would get, with these settings: the panel beside From KennelOS.
export function landingPreview(rules) {
  const L = rules.landing;
  const fill = (t, dam, sire) => t.replace('{dam}', dam).replace('{sire}', sire);
  const rows = [
    ['A pairing of Juniper* and Atlas*', fill(L.name_pair, 'Juniper*', 'Atlas*'), L.label_pairing],
    ['A heat of Maple*', fill(L.name_heat, 'Maple*', ''), L.label_heat],
    ['A heat, no dam named', L.name_none, L.label_heat],
    ['A litter, only the dam named', fill(L.name_dam, 'Wren*', ''), null],
  ];
  return `<div class="pvwrap" id="preview"><span class="cap">The next Update website, with these settings</span>
    <section class="card landing"><ul class="hl">${rows.map(([what, name, lbl]) => `<li><div><span class="badge">${svg('heart')}</span><span><span class="small muted">${esc(what)}</span><b>${esc(name)}</b>${lbl ? `<span class="spill brass">${esc(lbl)}</span>` : ''}</span></div></li>`).join('')}</ul>
    <ul class="hl">${KOS_DOG_STATUSES.map((k) => `<li><div><span class="badge">${svg('star')}</span><span><span class="small muted">A <span class="code">${k}</span> dog</span><b>${esc(DOG_PLACE_WORDS[L[`dog_${k}`]])}</b></span></div></li>`).join('')}</ul></section></div>`;
}

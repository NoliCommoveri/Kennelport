// The portal's settings (/s/<sub>/portal/settings, routed by portal/admin.js): her
// contact details for families, the time zone, the disclosure, what families may
// suggest changing, and the programs shown.
import { escapeHtml as esc } from '../../lib/html.js';
import { DEFAULT_DISCLOSURE } from '../store.js';
import { VET_RULES } from '../vet.js';
import { note, errorBox, SUGGEST_LABEL, ZONES, ZONE_NAMES } from './parts.js';

export function settingsScreen(site, s, products, { error, waiting = [], extras = [] } = {}, url) {
  const zones = ZONES.includes(s.time_zone) ? ZONES : [s.time_zone, ...ZONES];
  const TYPES = { '': 'Not shown', food: 'Food', insurance: 'Insurance', registration: 'Registration', product: 'Product', other: 'Other' };
  return `${url ? note(url) : ''}${errorBox(error)}<form method="post" action="/s/${esc(site.subdomain)}/portal/settings" class="card">
    <h1>Portal settings</h1>
    <section class="fgroup"><h2>The vet visit</h2><div class="fgrid">
      <fieldset><legend>How your contract counts it</legend>${Object.entries(VET_RULES).map(([k, l]) => `<label class="check"><input type="radio" name="vet_rule" value="${k}"${s.vet_rule === k ? ' checked' : ''}> <span>${esc(l)}</span></label>`).join('')}
        <span class="hint">Applies to clocks that start from now on; a clock already running keeps its deadline.</span></fieldset>
      <label>Your time zone<select name="time_zone">${zones.map((z) => `<option value="${esc(z)}"${z === s.time_zone ? ' selected' : ''}>${esc(ZONE_NAMES[z] ?? z)}</option>`).join('')}</select></label>
      <label>What counts as proof<input name="proof_note" value="${esc(s.proof_note ?? '')}" maxlength="400" placeholder="The vet's exam record or receipt, showing the date and Opal's microchip"><span class="hint">Shown on the vet page and in reminders.</span></label>
    </div></section>
    <section class="fgroup"><h2>Contacts for families, once the puppy is home</h2><div class="fgrid">
      <p class="hint">From pickup, each family's Home leads with these as one-tap buttons for the first weeks, so a question goes to you or your vet, who already knows the puppy. They stay under Records after that.</p>
      ${waiting.map((g) => `<div class="box"><p><b>KennelOS has</b> ${esc(SUGGEST_LABEL[g.field] ?? g.field)}: <strong>${esc(g.value ?? '')}</strong></p><div class="row">
        <button form="sug-use-${esc(g.field)}" class="primary">Use it</button><button form="sug-ignore-${esc(g.field)}">Ignore</button></div></div>`).join('')}
      <div class="row"><label>Your phone for families<input name="her_phone" type="tel" value="${esc(s.her_phone ?? '')}" maxlength="40" placeholder="${esc(site.contactPhone ?? '')}"><span class="hint">Call and text.${site.contactPhone ? ' Blank: your website\'s number.' : ''}</span></label>
      <label>Your email for families<input name="her_email" type="email" value="${esc(s.her_email ?? '')}" maxlength="254" placeholder="${esc(site.contactEmail ?? '')}"><span class="hint">${site.contactEmail ? 'Blank: your website\'s address.' : 'Optional.'}</span></label></div>
      <div class="row"><label>Your vet's clinic<input name="vet_clinic" value="${esc(s.vet_clinic ?? '')}" maxlength="120" placeholder="Maple Street Animal Hospital"></label>
      <label>Vet's name<input name="vet_doctor" value="${esc(s.vet_doctor ?? '')}" maxlength="120" placeholder="Dr. Lee"></label></div>
      <div class="row"><label>Vet's phone<input name="vet_phone" type="tel" value="${esc(s.vet_phone ?? '')}" maxlength="40"></label>
      <label>Vet's address<input name="vet_address" value="${esc(s.vet_address ?? '')}" maxlength="200"><span class="hint">Opens in maps.</span></label></div>
      <label>A note for families<input name="vet_note" value="${esc(s.vet_note ?? '')}" maxlength="400" placeholder="Dr. Lee has seen every puppy since birth and is happy to take your questions."></label>
      <label>On Home for this many weeks after pickup<input name="help_weeks" inputmode="numeric" value="${esc(s.help_weeks ?? 8)}" maxlength="2"></label>
    </div></section>
    <section class="fgroup"><h2>What the puppies eat now</h2><div class="fgrid">
      <p class="hint">The food band on each family's Home: the exact food, so they buy the same. Its button opens your food program, if you show one.</p>
      <label>The food<input name="food_name" value="${esc(s.food_name ?? '')}" maxlength="160" placeholder="Small-breed puppy formula, chicken and rice"><span class="hint">Brand and formula. Blank: no food band.</span></label>
      <div class="row"><label>Bag<input name="food_bag" value="${esc(s.food_bag ?? '')}" maxlength="80" placeholder="4 lb bag"></label>
      <label>How much and how often<input name="food_how" value="${esc(s.food_how ?? '')}" maxlength="160" placeholder="⅓ cup, three times a day"></label></div>
      <label>A note<input name="food_note" value="${esc(s.food_note ?? '')}" maxlength="300" placeholder="Soak it in warm water for the first week."></label>
    </div></section>
    ${extras.length ? `<section class="fgroup"><h2>Extras the portal delivers</h2><div class="fgrid">
      <p class="hint">An extended stay gets a Stay page for the family, its "What's included" list as skills, and your updates on a rhythm you set.</p>
      ${extras.map((x) => `<div class="row"><label>${esc(x.name)}<select name="delivery.${esc(x.id)}"><option value="">Listed only</option><option value="stay"${x.portal_delivery === 'stay' ? ' selected' : ''}>An extended stay, with updates</option></select></label>
        <label>Update every (days)<input name="every.${esc(x.id)}" inputmode="numeric" maxlength="2" value="${esc(x.portal_every_days ?? 7)}"></label></div>`).join('')}
    </div></section>` : ''}
    <section class="fgroup" id="programs"><h2>Programs families see</h2><div class="fgrid">
      ${products.length ? products.map((x) => `<div class="fgrid box"><b>${esc(x.name)}</b>
        <div class="row"><label>Show as<select name="type.${esc(x.id)}">${Object.entries(TYPES).map(([k, l]) => `<option value="${k}"${(x.portal_show ? x.portal_type ?? 'other' : '') === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
        <label>What the family does<input name="action.${esc(x.id)}" value="${esc(x.family_action ?? '')}" maxlength="200" placeholder="${x.portal_type === 'insurance' ? 'Activate the free trial within 5 days of pickup' : 'Use the code at checkout'}"></label></div>
        <label class="check"><input type="checkbox" name="own.${esc(x.id)}" value="1"${x.portal_per_family ? ' checked' : ''}> <span>Each family gets its own code or certificate <span class="hint">You type it on their screen; they see theirs instead of the program's code.</span></span></label></div>`).join('') : '<p class="muted">Add your programs under Recommended products first; their links and codes are used here too.</p>'}
      <label>Disclosure line<input name="disclosure" value="${esc(s.disclosure ?? '')}" maxlength="400" placeholder="${esc(DEFAULT_DISCLOSURE)}"><span class="hint">At the foot of every page with program links.</span></label>
    </div></section>
    <p><button class="primary">Save</button></p></form>
  ${waiting.map((g) => ['use', 'ignore'].map((a) => `<form id="sug-${a}-${esc(g.field)}" method="post" action="/s/${esc(site.subdomain)}/portal/settings/suggestion"><input type="hidden" name="field" value="${esc(g.field)}"><input type="hidden" name="act" value="${a}"></form>`).join('')).join('')}
  <ul class="items"><li class="item"><a href="/s/${esc(site.subdomain)}/portal/checklist"><b>Go-home checklist</b><span>Your list for every family</span></a></li>
    <li class="item"><a href="/s/${esc(site.subdomain)}/portal/timeline"><b>First-weeks timeline</b><span>Tasks dated from birth or pickup</span></a></li></ul>`;
}

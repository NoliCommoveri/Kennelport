// The portal's settings (/s/<sub>/portal/settings, routed by portal/admin.js): her
// contact details for families, the time zone, the disclosure, what families may
// suggest changing, and the programs shown. Its wording is the owner's
// (manage/wording-portal.js pset.*; the vet rules pvet.rule.*, the looks plook.*).
import { escapeHtml as esc } from '../../lib/html.js';
import { DEFAULT_DISCLOSURE } from '../store.js';
import { parseVetRule, VET_HOURS, VET_DAYS } from '../vet.js';
import { note, errorBox, suggestLabel, ZONES, ZONE_NAMES } from './parts.js';
import { LOOKS, lookOf } from '../looks.js';
import { defaultSay } from '../../manage/wording.js';

export const PROGRAM_TYPES = ['', 'food', 'insurance', 'registration', 'product', 'other'];

// Her contract's vet rule: hours from pickup, or the end of a day after the pickup day,
// each with its number. A form sent back with an error keeps what she typed.
function vetRuleFields(s, t) {
  const r = parseVetRule(s.vet_rule) ?? { kind: 'hours', n: 72 };
  const kind = s.vet_kind === 'hours' || s.vet_kind === 'days' ? s.vet_kind : r.kind;
  const num = (k, lim, dflt) => `<input name="vet_${k}" type="number" inputmode="numeric" min="${lim.min}" max="${lim.max}" style="width:5em" value="${esc(s[`vet_${k}`] ?? (r.kind === k ? r.n : dflt))}">`;
  return `<label class="check"><input type="radio" name="vet_kind" value="hours"${kind === 'hours' ? ' checked' : ''}> <span>${num('hours', VET_HOURS, 72)} ${t('pset.vet_hours')}</span></label>
    <label class="check"><input type="radio" name="vet_kind" value="days"${kind === 'days' ? ' checked' : ''}> <span>${t('pset.vet_days_before')} ${num('days', VET_DAYS, 3)} ${t('pset.vet_days_after')}</span></label>`;
}

export function settingsScreen(site, s, products, { error, waiting = [], extras = [], say = defaultSay } = {}, url) {
  const t = (key, vars) => esc(say(key, vars));
  const zones = ZONES.includes(s.time_zone) ? ZONES : [s.time_zone, ...ZONES];
  return `${url ? note(url, say) : ''}${errorBox(error, say)}<form method="post" action="/s/${esc(site.subdomain)}/portal/settings" class="card">
    <h1>${t('pset.title')}</h1>
    <section class="fgroup" id="look"><h2>${t('pset.look')}</h2><div class="fgrid">
      <fieldset><legend>${t('pset.look_legend')}</legend>${Object.keys(LOOKS).map((k) => `<label class="check"><input type="radio" name="look" value="${k}"${lookOf(s) === k ? ' checked' : ''}> <span><b>${t(`plook.${k}`)}</b> <span class="hint">${t(`plook.${k}.about`)}</span></span></label>`).join('')}
        <span class="hint">${t('pset.look_hint')}</span></fieldset>
    </div></section>
    <section class="fgroup"><h2>${t('pset.vet')}</h2><div class="fgrid">
      <fieldset><legend>${t('pset.vet_legend')}</legend>${vetRuleFields(s, t)}
        <span class="hint">${t('pset.vet_hint')}</span></fieldset>
      <label>${t('pset.zone')}<select name="time_zone">${zones.map((z) => `<option value="${esc(z)}"${z === s.time_zone ? ' selected' : ''}>${esc(ZONE_NAMES[z] ?? z)}</option>`).join('')}</select></label>
      <label>${t('pset.proof')}<input name="proof_note" value="${esc(s.proof_note ?? '')}" maxlength="400" placeholder="${t('pset.proof_ph')}"><span class="hint">${t('pset.proof_hint')}</span></label>
    </div></section>
    <section class="fgroup"><h2>${t('pset.contacts')}</h2><div class="fgrid">
      <p class="hint">${t('pset.contacts_hint')}</p>
      ${waiting.map((g) => `<div class="box"><p><b>${t('pset.kennelos_has')}</b> ${esc(suggestLabel(g.field, say))}: <strong>${esc(g.value ?? '')}</strong></p><div class="row">
        <button form="sug-use-${esc(g.field)}" class="primary">${t('pf.use')}</button><button form="sug-ignore-${esc(g.field)}">${t('pf.ignore')}</button></div></div>`).join('')}
      <div class="row"><label>${t('pset.phone')}<input name="her_phone" type="tel" value="${esc(s.her_phone ?? '')}" maxlength="40" placeholder="${esc(site.contactPhone ?? '')}"><span class="hint">${t(site.contactPhone ? 'pset.phone_hint_site' : 'pset.phone_hint')}</span></label>
      <label>${t('pset.email')}<input name="her_email" type="email" value="${esc(s.her_email ?? '')}" maxlength="254" placeholder="${esc(site.contactEmail ?? '')}"><span class="hint">${t(site.contactEmail ? 'pset.email_hint_site' : 'pset.email_hint')}</span></label></div>
      <div class="row"><label>${t('pset.vet_clinic')}<input name="vet_clinic" value="${esc(s.vet_clinic ?? '')}" maxlength="120" placeholder="${t('pset.vet_clinic_ph')}"></label>
      <label>${t('pset.vet_doctor')}<input name="vet_doctor" value="${esc(s.vet_doctor ?? '')}" maxlength="120" placeholder="${t('pset.vet_doctor_ph')}"></label></div>
      <div class="row"><label>${t('pset.vet_phone')}<input name="vet_phone" type="tel" value="${esc(s.vet_phone ?? '')}" maxlength="40"></label>
      <label>${t('pset.vet_address')}<input name="vet_address" value="${esc(s.vet_address ?? '')}" maxlength="200"><span class="hint">${t('pset.vet_address_hint')}</span></label></div>
      <label>${t('pset.vet_note')}<input name="vet_note" value="${esc(s.vet_note ?? '')}" maxlength="400" placeholder="${t('pset.vet_note_ph')}"></label>
      <label>${t('pset.help_weeks')}<input name="help_weeks" inputmode="numeric" value="${esc(s.help_weeks ?? 8)}" maxlength="2"></label>
    </div></section>
    <section class="fgroup"><h2>${t('pset.food')}</h2><div class="fgrid">
      <p class="hint">${t('pset.food_hint')}</p>
      <label>${t('pset.food_name')}<input name="food_name" value="${esc(s.food_name ?? '')}" maxlength="160" placeholder="${t('pset.food_name_ph')}"><span class="hint">${t('pset.food_name_hint')}</span></label>
      <div class="row"><label>${t('pset.food_bag')}<input name="food_bag" value="${esc(s.food_bag ?? '')}" maxlength="80" placeholder="${t('pset.food_bag_ph')}"></label>
      <label>${t('pset.food_how')}<input name="food_how" value="${esc(s.food_how ?? '')}" maxlength="160" placeholder="${t('pset.food_how_ph')}"></label></div>
      <label>${t('pset.food_note')}<input name="food_note" value="${esc(s.food_note ?? '')}" maxlength="300" placeholder="${t('pset.food_note_ph')}"></label>
    </div></section>
    ${extras.length ? `<section class="fgroup"><h2>${t('pset.extras')}</h2><div class="fgrid">
      <p class="hint">${t('pset.extras_hint')}</p>
      ${extras.map((x) => `<div class="row"><label>${esc(x.name)}<select name="delivery.${esc(x.id)}"><option value="">${t('pset.listed')}</option><option value="stay"${x.portal_delivery === 'stay' ? ' selected' : ''}>${t('pset.stay')}</option></select></label>
        <label>${t('pset.every')}<input name="every.${esc(x.id)}" inputmode="numeric" maxlength="2" value="${esc(x.portal_every_days ?? 7)}"></label></div>`).join('')}
    </div></section>` : ''}
    <section class="fgroup" id="programs"><h2>${t('pset.programs')}</h2><div class="fgrid">
      ${products.length ? products.map((x) => `<div class="fgrid box"><b>${esc(x.name)}</b>
        <div class="row"><label>${t('pset.show_as')}<select name="type.${esc(x.id)}">${PROGRAM_TYPES.map((k) => `<option value="${k}"${(x.portal_show ? x.portal_type ?? 'other' : '') === k ? ' selected' : ''}>${t(`pset.type.${k || 'none'}`)}</option>`).join('')}</select></label>
        <label>${t('pset.action')}<input name="action.${esc(x.id)}" value="${esc(x.family_action ?? '')}" maxlength="200" placeholder="${t(x.portal_type === 'insurance' ? 'pset.action_ph_insurance' : 'pset.action_ph')}"></label></div>
        <label class="check"><input type="checkbox" name="own.${esc(x.id)}" value="1"${x.portal_per_family ? ' checked' : ''}> <span>${t('pset.own')} <span class="hint">${t('pset.own_hint')}</span></span></label></div>`).join('') : `<p class="muted">${t('pset.no_programs')}</p>`}
      <label>${t('pset.disclosure')}<input name="disclosure" value="${esc(s.disclosure ?? '')}" maxlength="400" placeholder="${esc(DEFAULT_DISCLOSURE)}"><span class="hint">${t('pset.disclosure_hint')}</span></label>
    </div></section>
    <p><button class="primary">${t('pf.save')}</button></p></form>
  ${waiting.map((g) => ['use', 'ignore'].map((a) => `<form id="sug-${a}-${esc(g.field)}" method="post" action="/s/${esc(site.subdomain)}/portal/settings/suggestion"><input type="hidden" name="field" value="${esc(g.field)}"><input type="hidden" name="act" value="${a}"></form>`).join('')).join('')}
  <ul class="items"><li class="item"><a href="/s/${esc(site.subdomain)}/portal/checklist"><b>${t('psetup.checklist')}</b><span>${t('pset.checklist_note')}</span></a></li>
    <li class="item"><a href="/s/${esc(site.subdomain)}/portal/timeline"><b>${t('psetup.timeline')}</b><span>${t('psetup.timeline_note')}</span></a></li></ul>`;
}

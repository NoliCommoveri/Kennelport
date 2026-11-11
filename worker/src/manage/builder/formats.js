// Formats, in the owner's build tools (GET/POST /admin/<sub>/formats, routed by
// manage/builder.js): how the site writes dates, a dog's or pup's sex, a litter's
// count and money (content/rules.js rules.format).
import { DEFAULT_RULES, DATE_STYLES, DAY_STYLES, SEX_STYLES, COUNT_STYLES } from '../../content/rules.js';
import { escapeHtml as esc } from '../../lib/html.js';
import { back, seg, field, toggle } from './controls.js';

export function formatsScreen(site, rules, error) {
  const f = rules.format;
  const changed = Object.keys(f).some((k) => f[k] !== DEFAULT_RULES.format[k]);
  const sample = `${f.currency_after ? '' : f.currency}2,800${f.cents ? '.00' : ''}${f.currency_after ? ` ${f.currency}` : ''}`;
  return `<div class="stack">${error ? `<p class="error" role="alert">${esc(error)}</p>` : ''}
    <section class="card"><div class="fgroup"><div class="between"><h2>Dates</h2>${changed ? back('format') : ''}</div>
      <div class="fld"><span class="fldt">A full date</span>${seg('format.date', f.date, DATE_STYLES)}<span class="hint">Born, going home, deposits from.</span></div>
      <div class="fld"><span class="fldt">A day this year</span>${seg('format.day', f.day, DAY_STYLES)}<span class="hint">“Available on December 12”.</span></div></div>
    <div class="fgroup"><h2>Girls and boys</h2>
      <div class="fld"><span class="fldt">A dog's or pup's sex</span>${seg('format.sex', f.sex, SEX_STYLES)}</div>
      <div class="fld"><span class="fldt">A litter's count</span>${seg('format.counts', f.counts, COUNT_STYLES)}</div></div>
    <div class="fgroup"><h2>Money</h2><div class="fgrid">
      ${field('format.currency', f.currency, { label: 'Currency sign' })}<div class="half fld"><span class="fldt">Reads</span><span class="code big">${esc(sample)}</span></div></div>
      <div class="switches">${toggle('format.currency_after', f.currency_after, 'The sign goes after the number')}${toggle('format.cents', f.cents, 'Show cents')}</div></div></section></div>`;
}

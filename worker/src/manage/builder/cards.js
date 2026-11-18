// The Cards block's settings in the owner's block screen (builder.js ownSettings): the
// block's heading and look, then each card. A card is any of a photo, a big figure,
// labels, a heading, words and a button (to a page, an outside site, a call, a text, an
// email or one of the site's documents). The form shows every card she has and two
// empty ones; saving drops the empty ones (content/blocks.js cleanCards). Nothing here
// is worded for one use: the hints say what each part does, not what it's for.
import { escapeHtml as esc } from '../../lib/html.js';
import { field, select, seg, fld, toggle } from './controls.js';
import { CARDS_MAX, CARD_SIZES, CARD_LABELS_MAX, CARD_STYLE, CARD_ACROSS, CARD_SHAPE, CARD_PILL, CARD_LINK_TO, ALIGN } from '../../content/blocks.js';

// `photoChoice`, `pageChoices` and `docChoice` are builder.js's.
export function cardsSettings(snap, b, pics, { photoChoice, pageChoices, docChoice, describeLine, her }) {
  const k = (f) => `b.${b.id}.${f}`;
  const n = Math.min(b.cards.length + 2, CARDS_MAX);
  const cards = Array.from({ length: n }, (_, i) => b.cards[i] ?? { photo: null, big: '', labels: [], heading: '', text: '', button: '', link: null });
  const card = (c, i) => {
    const f = (x) => k(`cards.${i}.${x}`);
    const l = c.link ?? { to: '' };
    return `<fieldset class="fgroup"><legend><b>Card ${i + 1}</b>${i >= b.cards.length ? ' <span class="small muted">(empty: fill it in to add it)</span>' : ''}</legend>
      ${photoChoice(b, pics, { name: f('photo'), chosen: c.photo, label: 'Photo', shape: b.shape === 'whole' ? null : b.shape })}${b.zoom || b.shape === 'whole' ? describeLine(pics, c.photo) : ''}
      <div class="fgrid">${field(f('big'), c.big, { label: 'Big figure', hint: `Optional, ${CARD_SIZES.big} letters at most, large in the scheme's brass: a number, a price, a date…` })}
        ${field(f('labels'), c.labels.join(', '), { label: 'Labels', hint: `Optional: up to ${CARD_LABELS_MAX}, separated by commas, as small pills.` })}
        ${field(f('heading'), c.heading, { label: 'Heading', cls: '' })}
        <label>Words<textarea name="${f('text')}" rows="4" maxlength="${CARD_SIZES.text}">${esc(c.text)}</textarea><span class="hint">Optional. A blank line starts a new paragraph.</span></label>
        ${select(f('link.to'), l.to ?? '', CARD_LINK_TO, 'Its button goes to')}${field(f('button'), c.button, { label: 'Button words' })}
        ${select(f('link.page'), l.page ?? 'home', pageChoices(snap, pics.build), 'The page (for a page)')}${docChoice(f('link.doc'), l.to === 'doc' ? l.value : '', pics)}
        ${field(f('link.value'), l.to === 'doc' ? '' : l.value ?? '', { label: 'Address, number or email', cls: '', hint: 'An outside site needs its address. For a call, a text or an email, leave it empty to use the phone and email in Kennel details.' })}</div></fieldset>`;
  };
  return `<div class="fgroup"><h2>The block</h2><p class="small muted">${esc(her)}</p><div class="fgrid">${field(k('w.heading'), b.w.heading ?? '', { label: 'Heading', hint: 'Optional.' })}${field(k('w.line'), b.w.line ?? '', { label: 'Line under the heading', hint: 'Optional.' })}</div>
      ${fld('How they sit', seg(k('style'), b.style, CARD_STYLE))}
      ${fld('Across on a computer', seg(k('across'), b.across, CARD_ACROSS), 'Side by side: one under another on a phone. In a slider: about one and a peek on a phone.')}
      ${fld('Photo shape', seg(k('shape'), b.shape, CARD_SHAPE), 'The whole photo keeps each photo\'s own shape: nothing is cut off, so cards can differ in height.')}
      <div class="switches boxed">${toggle(k('zoom'), b.zoom, 'A tap on a photo opens it full size (for a flyer or anything with small print)')}</div>
      ${fld('Label colour', seg(k('pill'), b.pill, CARD_PILL), 'In the site\'s pill style, from its scheme.')}
      ${fld('Words line up', seg(k('align'), b.align, ALIGN))}</div>
    <div class="fgroup"><h2>The cards</h2><p class="small muted">Up to ${CARDS_MAX}, in this order. Every part is optional; a card with nothing in it is left out. A button needs its words and where it goes; one to a page that's off, or a document that's gone, hides by itself.</p>
      <input type="hidden" name="${k('cards.n')}" value="${n}">${cards.map(card).join('')}</div>`;
}

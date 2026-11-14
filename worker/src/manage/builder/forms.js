// Forms, in the owner's build tools (GET/POST /admin/<sub>/forms, routed by
// manage/builder.js; content/forms.js; docs/plans/site-builder.md, "Forms", step
// 3.8): the contact and review forms' fields, each switched on or off, required or
// not, in order, in her words; and her own questions. There's no prototype screen
// for this: it's built from the builder's own pieces (cards, the movable rows,
// switches, text fields and selects), as Tags is.
//
// It works without script, as the rest of the builder does: every button saves the
// screen with what it does (move, add, remove, back to today's form).
import { escapeHtml as esc } from '../../lib/html.js';
import { FIELDS, FORM_KINDS, QUESTION_KINDS, OWN_MAX, WORDS_MAX, cleanForm, isToday, ownKey } from '../../content/forms.js';
import { svg, mvBtns, select } from './controls.js';

const INTRO = {
  contact: 'On her Contact page. Name, email and message are always there, so she can reply. Her Inbox shows every answer with the message.',
  reviews: 'Under Share your review on her Reviews page. First name, the review and the consent box are always there. Town, pup\'s name, month, rating and photo show on the review; an email, a phone number and your questions are for her only, in Reviews to approve.',
};

function row(which, f, i, n) {
  const k = (x) => `f.${which}.${i}.${x}`;
  const d = f.own ? null : FIELDS[which][f.key];
  const fixed = Boolean(d?.fixed);
  const title = f.own ? `Your question: ${QUESTION_KINDS[f.type].toLowerCase()}` : d.what;
  const check = (name, on, label, disabled) => `<label class="check"><input type="checkbox" name="${k(name)}" value="1"${on ? ' checked' : ''}${disabled ? ' disabled' : ''}>${esc(label)}</label>`;
  return `<li class="mvr item${f.on ? '' : ' off'}">${mvBtns(`mv:${which}:${i}`, i, n)}<span class="ttl">${esc(title)}
    <input type="hidden" name="${k('key')}" value="${esc(f.key)}">
    <div class="fgrid"><label class="${f.own ? 'half' : ''}">Its words<input type="text" name="${k('words')}" value="${esc(f.words ?? '')}" maxlength="${d?.kind === 'consent' ? 200 : WORDS_MAX}" placeholder="${esc(d?.words ?? 'Your question')}"></label>
      ${f.own ? select(k('type'), f.type, QUESTION_KINDS, 'Answered with') : ''}</div>
    ${f.own && f.type === 'choice' ? `<label>Its choices<textarea name="${k('options')}" rows="3">${esc((f.options ?? []).join('\n'))}</textarea><span class="hint">One a line, two at least.</span></label>` : ''}
    <div class="switches">${check('on', f.on, 'On the form', fixed)}${check('req', f.required, 'Required', fixed)}${fixed ? '<span class="small muted">Always there, required</span>' : ''}</div>
  </span>${f.own ? `<button class="link small danger" name="act" value="del:${which}:${esc(f.key)}" aria-label="Remove this question">${svg('trash')}</button>` : '<span></span>'}</li>`;
}

export function formsScreen(forms) {
  return `<div class="stack">${Object.entries(FORM_KINDS).map(([which, name]) => {
    const list = cleanForm(which, forms?.[which]);
    const own = list.filter((f) => f.own).length;
    return `<section class="card" id="form-${which}"><div class="fgroup"><div class="between"><h2>${esc(name)}</h2>${isToday(which, forms?.[which]) ? '<span class="spill plain">As today</span>' : `<button class="link small" name="act" value="today:${which}">Back to today's form</button>`}</div>
      <p class="small muted">${esc(INTRO[which])} Words left empty read as shown in grey. A required field drops "(optional)" from its words.</p>
      <ul class="mvl">${list.map((f, i) => row(which, f, i, list.length)).join('')}</ul>
      ${own < OWN_MAX ? `<div class="row"><button class="button small" name="act" value="add:${which}">${svg('plus')} Add a question</button></div>` : ''}</div></section>`;
  }).join('')}</div>`;
}

// The screen's form back into build.forms, with what was pressed done. A form back
// at today's is left out, so a site with no changes keeps none.
export function formsFromForm(forms, get) {
  const act = String(get('act') ?? '');
  const out = {};
  for (const which of Object.keys(FORM_KINDS)) {
    let list = [];
    for (let i = 0; get(`f.${which}.${i}.key`) != null; i++) {
      const k = (x) => get(`f.${which}.${i}.${x}`);
      const key = String(k('key'));
      list.push({ key, on: k('on') != null, required: k('req') != null, words: String(k('words') ?? ''), type: k('type') ?? undefined, options: k('options') != null ? String(k('options')).split('\n') : undefined });
    }
    if (!list.length) list = forms?.[which] ?? null;
    let m = act.match(/^mv:([a-z]+):(\d+):(up|down)$/);
    if (m && m[1] === which && list) {
      const i = Number(m[2]);
      const j = m[3] === 'up' ? i - 1 : i + 1;
      if (j >= 0 && j < list.length) [list[i], list[j]] = [list[j], list[i]];
    }
    m = act.match(/^del:([a-z]+):(.+)$/);
    if (m && m[1] === which && list) list = list.filter((f) => f.key !== m[2]);
    if (act === `add:${which}`) {
      const cur = cleanForm(which, list);
      cur.splice(cur.findIndex((f) => f.key === 'consent') >= 0 ? cur.findIndex((f) => f.key === 'consent') : cur.length, 0, { key: ownKey(cur, `question ${cur.filter((f) => f.own).length + 1}`), own: true, type: 'text', on: true, required: false, words: 'A question' });
      list = cur;
    }
    if (act === `today:${which}`) list = null;
    if (list && !isToday(which, list)) out[which] = cleanForm(which, list);
  }
  return Object.keys(out).length ? out : undefined;
}

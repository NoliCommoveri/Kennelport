// The family pages in the owner's mockup looks (Forest and Cream, portal/looks.js;
// docs/reference/portal-looks.html, its mkHome, mkTimeline, mkVet and mkRecords): the same
// markup the prototype draws, filled with the family's own data. Classic never comes here;
// its pages are family.js's own. Styled by public/_kp/f/looks/ (mockup.css, then the look's).
//
// The pieces: mkCard (a cream card with a header strip: an icon, then a title or an
// eyebrow), the waves, the vet page's art (the swoosh for Cream, the drawn stethoscope for
// Forest), the Boston sketch on My puppy, the gradients they fill with (LOOK_DEFS), and the
// prototype's own icon drawings (LOOK_SPRITE, used as lk('name')). The page builders take
// what family.js has already worked out (the stage, the tasks, the programs) and its
// helpers (h), so the rules stay in one place.
import { escapeHtml as esc } from '../../lib/html.js';

// The prototype's icons, as drawn there (its sprite), under their own ids: i-k-<name>.
const K = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="m9 15 2 2 4-4"/>',
  steth: '<path d="M6 3.5H4.5v5a5 5 0 0 0 10 0v-5H13"/><path d="M9.5 13.5v1.5a5 5 0 0 0 10 0v-2"/><circle cx="19.5" cy="11" r="2"/>',
  file: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  user: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3.5"/><path d="M5.5 19c1.5-2.6 3.8-4 6.5-4s5 1.4 6.5 4"/>',
  phone: '<path d="M5 3.5h3.2l1.6 4.2-2.1 1.3a11 11 0 0 0 5.3 5.3l1.3-2.1 4.2 1.6V17a2 2 0 0 1-2 2A15.5 15.5 0 0 1 3 5.5a2 2 0 0 1 2-2z"/>',
  msg: '<path d="M4 4.5h16v11H9l-5 4z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
  pin2: '<path d="M14.5 3.5l6 6-3 1.2-3.8 3.8.3 4-2 2-4-4-4.5 4.5M7.5 12.5l-2-2 2-2 4 .3 3.8-3.8z"/>',
  syringe: '<path d="m18 3 3 3M19.5 4.5l-3 3M16.5 4.5l3 3"/><path d="m15 6 3 3-9 9H6v-3z"/><path d="m11 10 1.5 1.5M8.5 12.5 10 14M3 21l3-3"/>',
  up: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/>',
  clock: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2.5h6"/>',
  ext: '<path d="M8 16 17 7M10 7h7v7"/>',
  vet: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/>',
  chev: '<path d="m9 5 7 7-7 7"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  paw: '<circle cx="6" cy="10" r="2"/><circle cx="10" cy="6" r="2"/><circle cx="14" cy="6" r="2"/><circle cx="18" cy="10" r="2"/><path d="M12 12c-3 0-6 4-6 6.5 0 1.5 1.5 2 3 1.6 1.2-.3 2-.6 3-.6s1.8.3 3 .6c1.5.4 3-.1 3-1.6C18 16 15 12 12 12z"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9.5" r="1.8"/><path d="m3 17 5-5 4 4 3-3 6 6"/>',
  book: '<path d="M3 5h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H3z"/><path d="M21 5h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"/>',
  gift: '<rect x="3" y="8" width="18" height="5" rx="1"/><path d="M5 13v8h14v-8M12 8v13"/><path d="M12 8c-1.5-3-5-4-5-1.5S10 8 12 8zM12 8c1.5-3 5-4 5-1.5S14 8 12 8z"/>',
  bowl: '<path d="M2.5 12.5h19c0 4-4 7-9.5 7s-9.5-3-9.5-7z"/><path d="M7 12.5c0-1.2.8-2 1.8-2s1.7.8 1.7 2M11 12.5c0-1.5 1-2.5 2.2-2.5s2.3 1 2.3 2.5M15.5 12.5c0-.9.6-1.6 1.5-1.6s1.5.7 1.5 1.6"/><path d="M10 16.5h4"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><circle cx="9.3" cy="10.3" r=".9"/><circle cx="11.2" cy="8.6" r=".9"/><circle cx="12.8" cy="8.6" r=".9"/><circle cx="14.7" cy="10.3" r=".9"/><path d="M12 11.2c-1.3 0-2.6 1.7-2.6 2.8 0 .7.7.9 1.3.7.5-.1.9-.3 1.3-.3s.8.2 1.3.3c.6.2 1.3 0 1.3-.7 0-1.1-1.3-2.8-2.6-2.8z"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
  award: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7"/>',
};
// The kinds of program, as the prototype draws them.
const TYPE_K = { food: 'bowl', insurance: 'shield', registration: 'award', product: 'tag', other: 'tag' };
// A live icon name, as the looks draw it (the tabs, Quick links).
export const K_OF = { calendar: 'cal', stethoscope: 'steth', message: 'msg', upload: 'up', list: 'cal', arrow: 'ext', clock: 'vet' };

export const lk = (n) => `<svg class="i" aria-hidden="true"><use href="#i-k-${K[n] ? n : K_OF[n] ?? 'paw'}"/></svg>`;

// The gradients and soft edges the waves and the vet art fill with, and the icons.
export const LOOK_SPRITE = `<svg width="0" height="0" class="sprite" aria-hidden="true"><defs>
<linearGradient id="g-gold" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#A97A2E"/><stop offset=".45" stop-color="#F3D99A"/><stop offset=".75" stop-color="#D9B26A"/><stop offset="1" stop-color="#B8893A"/></linearGradient>
<linearGradient id="g-mint" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3E7A4B"/><stop offset=".5" stop-color="#A3CF9B"/><stop offset="1" stop-color="#5E9A63"/></linearGradient>
<linearGradient id="g-deep" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2E5D3D"/><stop offset="1" stop-color="#1B3826"/></linearGradient>
<linearGradient id="g-silver" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8E9692"/><stop offset=".5" stop-color="#F1F3F1"/><stop offset="1" stop-color="#A2AAA6"/></linearGradient>
<radialGradient id="g-steel" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".45" stop-color="#C8CECB"/><stop offset="1" stop-color="#6E7672"/></radialGradient>
<linearGradient id="g-gold2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8F6524"/><stop offset=".5" stop-color="#D3A455"/><stop offset="1" stop-color="#9C7230"/></linearGradient>
<linearGradient id="sw-main" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#4A8455"/><stop offset=".45" stop-color="#2E5E3D"/><stop offset="1" stop-color="#1B3D29"/></linearGradient>
<linearGradient id="sw-mid" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#A6D29C"/><stop offset="1" stop-color="#5F9A62"/></linearGradient>
<linearGradient id="sw-glow" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#D7EDCB" stop-opacity=".95"/><stop offset="1" stop-color="#A6D29C" stop-opacity=".3"/></linearGradient>
<linearGradient id="sw-sheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".12"/><stop offset=".6" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>
<filter id="soft" x="-2%" y="-20%" width="104%" height="140%"><feGaussianBlur stdDeviation="1.3"/></filter>
<filter id="blur4" x="-10%" y="-10%" width="120%" height="130%"><feGaussianBlur stdDeviation="4"/></filter>
</defs>${Object.entries(K).map(([k, d]) => `<symbol id="i-k-${k}" viewBox="0 0 24 24">${d}</symbol>`).join('')}</svg>`;

// The waves: one curve drawn several times, each a little lower, coloured per look.
const CURVE = (dy) => `M-20 ${38 + dy} C 90 ${58 + dy}, 200 ${50 + dy}, 290 ${26 + dy} S 380 ${2 + dy}, 400 ${2 + dy} L420 ${1 + dy} L420 100 L-20 100 Z`;
export const WAVE = `<svg class="wave" viewBox="0 0 400 80" preserveAspectRatio="none" aria-hidden="true">${[[-4, 'l0', 1], [0, 'l1'], [3.5, 'l2'], [8, 'l3', 1], [13, 'l4', 1], [19, 'l5', 1], [26, 'l6']].map(([dy, c, soft]) => `<path class="${c}" d="${CURVE(dy)}"${soft ? ' filter="url(#soft)"' : ''}/>`).join('')}</svg>`;
const SW = (x, y) => `M${x} 0 C ${x + 40} 0, ${x + 62} ${36 + y}, ${x + 96} ${68 + y} C ${x + 128} ${98 + y}, ${x + 160} ${110 + y}, 300 ${112 + y} V0 Z`;
const SWOOSH = `<svg class="swoosh only-cream" viewBox="0 0 300 170" aria-hidden="true"><path d="${SW(92, 22)}" fill="url(#sw-glow)" filter="url(#blur4)"/><path d="${SW(100, 10)}" fill="url(#sw-mid)"/><path d="${SW(112, 0)}" fill="url(#sw-main)"/><path d="${SW(112, 0)}" fill="url(#sw-sheen)"/></svg>`;
const STETH = `<svg class="stethart only-forest" viewBox="0 -8 172 150" aria-hidden="true">
  <path d="M40 2 C 26 30, 40 58, 78 60" fill="none" stroke="url(#g-silver)" stroke-width="5" stroke-linecap="round"/>
  <path d="M64 0 C 58 28, 70 50, 92 56" fill="none" stroke="url(#g-silver)" stroke-width="5" stroke-linecap="round"/>
  <circle cx="40" cy="3" r="4.5" fill="#1B2620"/><circle cx="64" cy="2" r="4.5" fill="#1B2620"/>
  <path d="M84 58 C 120 64, 160 52, 168 82 C 172 100, 150 104, 132 96" fill="none" stroke="#14201A" stroke-width="9" stroke-linecap="round"/>
  <path d="M84 56 C 120 62, 158 50, 166 80" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="2" stroke-linecap="round"/>
  <rect x="118" y="90" width="18" height="9" rx="3" fill="url(#g-silver)" transform="rotate(20 127 94)"/>
  <circle cx="104" cy="104" r="30" fill="url(#g-steel)"/><circle cx="104" cy="104" r="23" fill="#2A332F"/><circle cx="104" cy="104" r="19" fill="url(#g-steel)"/>
  <circle cx="104" cy="104" r="11" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="1.5"/><ellipse cx="96" cy="94" rx="8" ry="4" fill="rgba(255,255,255,.55)" transform="rotate(-30 96 94)"/></svg>`;
const BOSTON = `<svg class="boston only-forest" viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <path d="M27 31 C 16 23, 9 11, 11 2 C 22 5, 33 13, 39 24"/><path d="M73 31 C 84 23, 91 11, 89 2 C 78 5, 67 13, 61 24"/><path d="M17 8 C 21 15, 27 21, 31 25M83 8 C 79 15, 73 21, 69 25" stroke-width="1"/>
  <path d="M20 47 C 18 31, 32 22, 50 22 C 68 22, 82 31, 80 47 C 80 63, 71 77, 50 79 C 29 77, 20 63, 20 47 Z"/>
  <path d="M46 23 C 45 34, 43 41, 40 50M54 23 C 55 34, 57 41, 60 50"/><path d="M37 57 C 39 68, 61 68, 63 57"/><path d="M50 58 V63M42 67 C 46 70, 54 70, 58 67"/>
  <path d="M30 76 C 35 86, 43 92, 50 95 C 57 92, 65 86, 70 76" stroke-width="1.2"/></g>
  <g fill="currentColor"><circle cx="35" cy="45" r="5.5"/><circle cx="65" cy="45" r="5.5"/><ellipse cx="50" cy="55" rx="7" ry="4.5"/></g><g fill="#F4ECDA"><circle cx="33.5" cy="43.5" r="1.5"/><circle cx="63.5" cy="43.5" r="1.5"/></g></svg>`;
// Timeline's calendar page with a paw (Cream).
const CAL_ART = '<svg class="art" viewBox="0 0 64 64" aria-hidden="true"><rect x="8" y="12" width="48" height="44" rx="6" fill="#FFF8EC"/><rect x="8" y="12" width="48" height="12" rx="6" fill="#C9583F"/><rect x="8" y="18" width="48" height="6" fill="#C9583F"/><g fill="#C9A15A"><circle cx="18" cy="11" r="2.4"/><circle cx="26" cy="11" r="2.4"/><circle cx="34" cy="11" r="2.4"/><circle cx="42" cy="11" r="2.4"/><circle cx="50" cy="11" r="2.4"/></g><g fill="#B98A3E" transform="translate(20 28) scale(1.05)"><circle cx="6" cy="8" r="2.6"/><circle cx="11" cy="4" r="2.6"/><circle cx="17" cy="4" r="2.6"/><circle cx="22" cy="8" r="2.6"/><path d="M14 10c-4 0-8 5-8 8.5 0 2 2 2.7 4 2.1 1.6-.4 2.7-.8 4-.8s2.4.4 4 .8c2 .6 4-.1 4-2.1C22 15 18 10 14 10z"/></g></svg>';

// A card: the header strip (an icon, a title or an eyebrow, something at its end), then the body.
export const mkCard = (icon, title, body, o = {}) => `<section class="mk${o.cls ? ` ${o.cls}` : ''}"${o.id ? ` id="${o.id}"` : ''}><header class="mk-h">${icon ? `<span class="mk-i${o.gold ? ' gold' : ''}">${lk(icon)}</span>` : ''}${o.eyebrow ? `<p class="eyebrow">${title}</p>` : `<h2>${title}</h2>`}${o.aside ?? ''}</header>${o.sub ? `<p class="mk-sub">${o.sub}</p>` : ''}<div class="mk-b">${body}</div></section>`;
const photo = (src, alt, cls = '') => `<span class="ph ${cls}">${src ? `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy">` : ''}</span>`;
// A calendar page with the month in capitals, as the prototype writes it.
const cal = (h, ymd) => h.calPage(ymd).replace(/<b>(\w+)<\/b>/, (m, x) => `<b>${x.toUpperCase()}</b>`);
const goHref = (id, from) => `/family/go/${esc(id)}?from=${from}`;

// A file input that sends itself once a file is picked (portal.js, data-send), with a
// button for a phone without the script.
export const uploadForm = (cls, words, icon = true) => `<form method="post" action="/family/vet/proof" enctype="multipart/form-data" class="upf"><label class="btn ${cls}">${icon ? lk('up') : ''}${words}<input class="sr" type="file" name="file" accept="image/*,application/pdf" required data-send></label><noscript><button class="btn line small">${words}</button></noscript></form>`;

// A task, as the prototype draws it: the day, the title and its word, the words, the buttons.
export function taskRow(t, kennel, back, h) {
  const vetLink = t.auto === 'vet_booking' ? '/family/vet#booked' : t.auto === 'vet_visit' ? '/family/vet#proof' : null;
  const acts = [];
  if (!t.done && !t.hers) {
    if (t.link) acts.push(`<a class="btn line small ext" href="${goHref(t.link.id, 'timeline')}">${esc(t.button || t.link.label || 'Open')}</a>`);
    if (vetLink && !(t.auto === 'vet_booking' && t.past)) acts.push(`<a class="btn line small" href="${vetLink}">${t.auto === 'vet_booking' ? 'I\'ve booked it' : 'Upload the record'}</a>`);
  }
  if (!t.auto && !t.hers) acts.push(`<form method="post" action="/family/step" class="tickf"><input type="hidden" name="kind" value="task"><input type="hidden" name="id" value="${esc(t.id)}"><input type="hidden" name="done" value="${t.done ? 0 : 1}"><input type="hidden" name="back" value="${back}"><button class="btn text small">${t.done ? 'Undo' : 'Mark done'}</button></form>`);
  const day = t.due ? `${h.MON[Number(t.due.slice(5, 7)) - 1]}<b>${Number(t.due.slice(8, 10))}</b>` : lk('cal');
  return `<div class="task${t.done ? ' done' : ''}" id="t-${esc(t.id)}"><div class="d">${day}</div><div class="stack tk"><div class="between"><h3>${esc(t.title)}</h3>${h.taskWord(t, kennel)}</div>${t.body ? `<p class="small">${esc(t.body)}</p>` : ''}${acts.length ? `<div class="row">${acts.join('')}</div>` : ''}</div></div>`;
}

// The programs below the food (Recommended), each with its picture, words and button.
function programRows(list, place, kennel) {
  return list.map((x) => {
    const code = x.portal_per_family ? x.family_code : x.code;
    const done = x.status === 'done';
    return `<div class="prog"><span class="ico">${lk(done ? 'check' : TYPE_K[x.portal_type] ?? 'tag')}</span><div class="stack tk"><b>${esc(x.name)}</b>${done ? ' <span class="st ok">Done</span>' : ''}${x.family_action ? `<p class="small">${esc(x.family_action)}</p>` : x.description ? `<p class="small muted">${esc(x.description)}</p>` : ''}
      ${code ? `<p class="small">${x.portal_per_family ? 'Your code' : 'Code'} <strong>${esc(code)}</strong>${x.code_note ? ` <span class="muted">${esc(x.code_note)}</span>` : ''}</p>` : x.portal_per_family ? `<p class="small muted">Your own code will be here once ${esc(kennel)} adds it.</p>` : ''}
      <div class="row">${x.link_url ? `<a class="btn line small ext" href="${goHref(x.id, place)}">${esc(x.link_label || 'Open')}</a>` : ''}${x.family_action && !done ? `<form method="post" action="/family/program" class="tickf"><input type="hidden" name="product" value="${esc(x.id)}"><input type="hidden" name="back" value="${place === 'home' ? 'home' : 'timeline'}"><button class="btn text small">I've done this</button></form>` : ''}</div></div></div>`;
  }).join('');
}

// Her and the vet's contacts: Home's lead card in the first weeks, and Records'.
export function contacts(c, lead) {
  const { kennel, name, phone, email, v, dialable } = c;
  const vet = v.clinic || v.doctor || v.phone;
  if (!phone && !email && !vet) return '';
  const her = phone || email ? `<p class="eyebrow">${esc(kennel)}</p><div class="row">${phone ? `<a class="btn line small" href="tel:${esc(dialable(phone))}">${lk('phone')}Call</a><a class="btn line small" href="sms:${esc(dialable(phone))}">${lk('msg')}Text</a>` : ''}${email ? `<a class="btn line small" href="mailto:${esc(email)}?subject=${encodeURIComponent(`Question about ${name}`)}">${lk('mail')}Email</a>` : ''}</div>
    ${phone ? `<p class="num-line">${esc(phone)}</p>` : ''}` : '';
  const vetBlock = vet ? `${her ? '<hr>' : ''}<p class="eyebrow">${esc(name)}'s vet since birth</p>${v.clinic || v.doctor ? `<p class="who">${esc([v.clinic, v.doctor].filter(Boolean).join(' · '))}</p>` : ''}${v.note ? `<p class="small">${esc(v.note)}</p>` : ''}
    ${v.phone ? `<div class="row"><a class="btn line small" href="tel:${esc(dialable(v.phone))}">${lk('phone')}Call the vet</a></div>` : ''}
    ${v.address ? `<a class="pinline" href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(v.address)}">${lk('pin')}${esc(v.address)} ${lk('ext')}</a>` : ''}
    ${v.phone ? `<p class="num-line">${lk('phone')}${esc(v.phone)}</p>` : ''}` : '';
  return lead
    ? mkCard('paw', 'The first weeks at home', `<h2 class="lead-h">Questions about ${esc(name)}? One tap</h2>${her}${vetBlock}`, { eyebrow: true, id: 'contacts' })
    : mkCard('user', 'Contacts', `${her}${vetBlock}`, { id: 'contacts' });
}

// ---------- Home ----------

export function home(c, h) {
  const { name, kennel, st } = c;
  const out = [];
  const hero = `<div class="tile photo hero">${photo(c.main, '')}<div class="cap"><span class="script">${esc(c.hello)}</span><h1>${esc(c.greeting)}${lk('paw')}</h1></div>${WAVE}</div>`;
  const pup = `<a class="tile pup" href="/family/records">${photo(c.main ? `${c.main}?s=t` : null, name, 'round')}<span class="pname">${esc(name)}${c.sex ? `<span class="sex ${c.sex[1] === 'girl' ? 'f' : 'm'}" aria-label="${c.sex[1]}">${c.sex[0]}</span>` : ''}</span>${c.breed ? `<span class="small muted">${esc(c.breed)}</span>` : ''}
    ${c.facts.length ? `<ul class="facts">${c.facts.map(([icon, words]) => `<li>${lk(icon)}${esc(words)}</li>`).join('')}</ul>` : ''}</a>`;
  out.push(`<section class="herocard">${hero}<div class="hc-panel"><div class="bento">${pup}${c.tile}</div></div></section>`);
  out.push(c.band);
  out.push(c.food);
  if (c.contactsLead) out.push(contacts(c, true));
  out.push(c.checklist, c.statusBand);
  if (c.rest.length) out.push(mkCard('paw', `Recommended for ${esc(name)}`, programRows(c.rest, 'home', kennel), { gold: true }));
  out.push(c.readNext);
  out.push(mkCard('pin2', 'Quick links', `<div class="qgrid">${c.quick.map(([href, icon, label]) => `<a class="qtile" href="${href}"><span class="ico">${lk(icon)}</span>${label}</a>`).join('')}</div>`));
  if (c.disclosure) out.push(c.disclosure);
  return out.filter(Boolean).join('\n');
}

// The tile beside the pup: when they come home, the vet visit's clock, or what's next.
export function homeTile(c, h) {
  const { p, s, st, kennel, name } = c;
  if (st === 'before') {
    return `<div class="tile peach"><span class="eyebrow">Comes home</span>${c.goYmd ? `<div class="calrow">${cal(h, c.goYmd)}<div><p class="bigline">${esc(h.inDays(c.days) ?? h.formatDay(c.goYmd))}</p><p class="small">${p.pickup_booked_at ? `Pickup ${esc(h.clock(h.localParts(p.pickup_booked_at, s.time_zone).hm))}` : 'Pickup time to come'}</p></div></div>`
      : `<p class="small">${c.statusUrl ? `<a href="${h.STATUS_PATH}">Book your pickup on your status page</a>` : `Not booked yet. ${esc(kennel)} will confirm the day and time with you.`}</p>`}<a class="btn solid small" href="/family/timeline">What to do first</a></div>`;
  }
  if (st === 'vet') {
    const dl = h.localParts(p.vet_deadline_at, s.time_zone);
    const hoursLeft = Math.max(0, Math.round((Date.parse(p.vet_deadline_at) - new Date(c.now).getTime()) / 3600000));
    return `<div class="tile peach"><span class="eyebrow">3-day vet visit</span><div class="calrow">${cal(h, dl.ymd)}<div><p class="bigline">${p.proof_uploaded_at ? (p.proof_accepted_at ? 'Done' : 'Uploaded') : `${hoursLeft} h left`}</p><p class="small">Due by ${esc(h.clock(dl.hm))}</p></div></div>
      ${p.proof_uploaded_at ? `<span class="small"><b>${p.proof_accepted_at ? `Accepted by ${esc(kennel)}` : `${esc(kennel)} will check it`}</b></span>` : uploadForm('solid small', 'Upload record')}</div>`;
  }
  const next = c.next;
  if (next) {
    return `<div class="tile peach"><span class="eyebrow">Next up</span><div class="calrow">${next.due ? cal(h, next.due) : `<span class="ico big">${lk('cal')}</span>`}<div><p class="bigline nx">${esc(next.title)}</p></div></div>${next.link ? `<a class="btn solid small ext" href="${goHref(next.link.id, 'home')}">${esc(next.button || next.link.label || 'Open')}</a>` : ''}</div>`;
  }
  const done = p.proof_accepted_at ? 'Vet visit done' : p.proof_uploaded_at ? 'Vet record uploaded' : 'Vet visit';
  return `<div class="tile peach"><span class="eyebrow">${esc(done)}</span><p class="bigline">All caught up</p><p class="small">${p.proof_uploaded_at ? 'Thank you.' : `Upload the vet's record on the <a href="/family/vet">Vet visit</a> page.`}</p></div>`;
}

// Under the photo: the vet visit (the card with its clock in Cream, the row in Forest) and
// what's coming up; before go-home, booking the vet and the checklist.
export function homeBand(c, h) {
  const { p, s, st, kennel, name, now } = c;
  const coming = (n) => {
    const list = h.openTasks(c.tasks.filter((t) => t.auto !== 'vet_visit' && t.auto !== 'vet_booking'), n);
    return list.length ? mkCard('paw', 'Coming up', list.map((t) => taskRow(t, kennel, 'home', h)).join(''), { aside: `<a class="go" href="/family/timeline">All ${lk('chev')}</a>` }) : '';
  };
  if (st === 'vet') {
    const left = p.proof_uploaded_at ? (p.proof_accepted_at ? `Accepted by ${esc(kennel)}` : 'Record uploaded') : `${esc(h.timeLeft(p.vet_deadline_at, now))} left`;
    return `${mkCard('', 'Your contract\'s 3-day visit', `<h2 class="vet-h">${esc(name)}'s vet visit</h2>
      ${p.proof_uploaded_at ? `<p class="small">${lk('check')} ${left}</p>` : `<div class="timer"><span class="ico clockdot">${lk('clock')}</span><p><b>${left}</b>Vet visit due ${esc(h.formatAt(p.vet_deadline_at, s.time_zone))}</p>${uploadForm('solid small', 'Upload', false)}</div>`}`, { eyebrow: true, cls: 'only-cream vetcard' })}
      <a class="vetrow only-forest" href="/family/vet"><span class="vr-i">${lk('steth')}</span><span class="vr-t"><b>${esc(name)}'s vet visit</b><span>${left}</span></span><span class="vr-c">${lk('chev')}</span></a>
      ${coming(2)}`;
  }
  if (st === 'before') {
    const rule = s.vet_rule === 'days3' ? `by the end of the third day after the day you take ${esc(name)} home` : 'within 72 hours of pickup';
    return mkCard('steth', `Book ${esc(name)}'s vet visit`, `<p class="small">Your contract asks for a vet visit ${rule}${c.expected ? `: by <b>${h.deadlineLine(c.expected, s)}</b>` : ''}. Vets are often booked days ahead.</p>
      ${p.vet_booked_at ? `<p class="small"><span class="st ok">Booked</span> ${p.vet_booked_for ? esc(h.bookedWords(p.vet_booked_for)) : ''}${p.vet_clinic ? `, ${esc(p.vet_clinic)}` : ''}</p>` : `<a class="btn solid small self-start" href="/family/vet">${lk('check')}I've booked it</a>`}`);
  }
  return coming(3);
}

// The go-home checklist: a tick for each (it sends itself; a button without the script).
export function checklist(list) {
  if (!list.length) return '';
  const done = list.filter((x) => x.done).length;
  const pct = Math.round((done / list.length) * 100);
  return `<section class="mk" id="checklist"><div class="mk-b pt"><div class="stack cl"><div class="between"><h2>Go-home checklist</h2><span class="small muted">${done} of ${list.length} ready</span></div>
    <svg class="progress" viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden="true"><rect width="100" height="6"/><rect class="on" width="${pct}" height="6"/></svg>
    <div class="checks">${list.map((x) => `<div>${x.auto
      ? `<label class="check"><input type="checkbox"${x.done ? ' checked' : ''} disabled>${esc(x.title)}</label>`
      : `<form method="post" action="/family/step" class="tickf"><input type="hidden" name="kind" value="checklist"><input type="hidden" name="id" value="${esc(x.id)}"><input type="hidden" name="back" value="home"><label class="check"><input type="checkbox" name="done" value="1"${x.done ? ' checked' : ''} data-send>${esc(x.title)}</label><input type="hidden" name="done" value="0"><noscript><button class="btn text small">Save</button></noscript></form>`}${x.link ? `<a class="btn text small ext" href="${goHref(x.link.id, 'checklist')}">${esc(x.raw.auto ? 'Open' : 'See')}</a>` : x.auto ? `<a class="btn text small" href="/family/vet#booked">${x.done ? 'See' : 'Book'}</a>` : ''}</div>`).join('')}</div></div></div></section>`;
}

// Food and insurance side by side, each with its picture; one more program under them.
export function foodDuo(c) {
  const { s, name, food, ins, extra, kennel } = c;
  const cards = [];
  if (s.food_name) {
    const points = [s.food_bag, s.food_how, 'The same food for the first two weeks'].filter(Boolean);
    cards.push(mkCard('', `What ${esc(name)}'s eating now`, `<h3>Keep ${esc(name)} on the same food</h3><span class="pic"><img src="/_kp/f/food-bowl.webp" alt="" width="128" height="128"></span><span class="chip">${esc(s.food_name)}</span>
      ${s.food_note ? `<p class="small">${esc(s.food_note)}</p>` : ''}${points.map((x) => `<span class="ok">${lk('check')}${esc(x)}</span>`).join('')}${food?.link_url ? `<a class="btn line small ext" href="${goHref(food.id, 'food')}">Order ${esc(name)}'s food</a>` : ''}`, { eyebrow: true }));
  }
  if (ins) {
    const pic = '<span class="pic"><img src="/_kp/f/insurance-shield.webp" alt="" width="128" height="128"></span>';
    const code = ins.portal_per_family ? ins.family_code : ins.code;
    cards.push(mkCard('', 'Pet insurance', ins.status === 'done' ? `<h3>${esc(name)} is protected!</h3>${pic}<span class="ok">${lk('check')}${esc(ins.name)}, activated</span><p class="small">Email or call them for questions about coverage or to file a claim.</p>`
      : `<h3>Activate ${esc(name)}'s pet insurance</h3>${pic}<span class="chip">${esc(ins.name)}</span>${ins.family_action || ins.description ? `<p class="small">${esc(ins.family_action || ins.description)}</p>` : ''}
      ${code ? `<p class="small">${ins.portal_per_family ? 'Your code' : 'Code'} <strong>${esc(code)}</strong>${ins.code_note ? ` ${esc(ins.code_note)}` : ''}</p>` : ins.portal_per_family ? `<p class="small">Your own code will be here once ${esc(kennel)} adds it.</p>` : ''}
      <a class="btn line small ext" href="${goHref(ins.id, 'insurance')}">${esc(ins.link_label || 'Activate insurance')}</a><form method="post" action="/family/program" class="tickf"><input type="hidden" name="product" value="${esc(ins.id)}"><input type="hidden" name="back" value="home"><button class="btn text small">I've activated it</button></form>`, { eyebrow: true }));
  }
  if (!cards.length) return '';
  const more = extra ? `<section class="mk slim"><div class="mk-b"><div class="slimrow"><span class="ico">${lk(TYPE_K[extra.portal_type] ?? 'tag')}</span><div class="stack tk"><b>${esc(extra.name)}</b>${extra.code ? `<p class="small">Code <strong>${esc(extra.code)}</strong></p>` : ''}</div><a class="btn line small ext" href="${goHref(extra.id, 'home')}">${esc(extra.link_label || 'Shop now')}</a></div></div></section>` : '';
  return `<div class="duo2${cards.length === 1 ? ' one' : ''}">${cards.join('')}</div>${more}`;
}

// Read next: her first chapters, each with one of their puppy's photos.
export function readNext(rows) {
  return rows.length ? mkCard('book', 'Read next', `<div class="prows">${rows.join('')}</div>`, { aside: `<a class="go" href="/family/handbook">Handbook ${lk('chev')}</a>` }) : '';
}

// ---------- Timeline ----------

export function timeline(c, h) {
  const { name, kennel, groups } = c;
  // The group under way opens the page, as its title over a card; the rest follow.
  const nowAt = Math.max(0, groups.findIndex(([, l]) => l.some((t) => !t.done && !t.hers)));
  const rows = (l) => l.map((t) => taskRow(t, kennel, 'timeline', h)).join('');
  const first = groups[nowAt];
  const rest = groups.filter((_, i) => i !== nowAt);
  return `<div class="mk-head green bleed"><span class="eyebrow">${esc(name)}'s first months</span><h1>Timeline</h1><span class="fo-paw">${lk('paw')}</span><p>${c.dated}Mark a step done and its reminders stop.</p>${CAL_ART}${WAVE}</div>
    <div class="timeline-body bleed">${first ? `<h2>${esc(first[0])}</h2><section class="mk"><div class="mk-b">${rows(first[1])}</div></section>
    ${rest.map(([g, l]) => mkCard('cal', esc(g), rows(l))).join('')}` : `<section class="mk"><div class="mk-b pt"><p class="muted">${esc(kennel)} hasn't added the timeline yet.</p></div></section>`}
    ${c.checklistLink ? `<p class="small"><a class="go" href="/family#checklist">The go-home checklist ${lk('chev')}</a></p>` : ''}
    ${c.list.length ? mkCard('paw', `Recommended for ${esc(name)}`, programRows(c.list, 'timeline', kennel), { gold: true }) : ''}</div>${c.list.length ? c.disclosure : ''}`;
}

// ---------- Vet visit ----------

const vetHead = (h1, words) => `<div class="mk-head cream">${SWOOSH}<span class="steth only-cream">${lk('steth')}</span>${STETH}<span class="eyebrow">The vet visit</span><h1>${h1}</h1>${words}</div>`;

export function vetDone(c) {
  const { accepted, kennel, name } = c;
  return `<div class="sheet bleed">${vetHead(accepted ? `${esc(name)}'s vet visit is done` : 'Record uploaded: thank you', `<p>${c.seen}Record uploaded ${esc(c.uploaded)}.</p>
      <p class="notebox"><span class="ring">${lk('check')}</span>${accepted ? `Accepted by ${esc(kennel)}` : `${esc(kennel)} will check it`}</p>
      <p><a class="btn line small" href="/family/file/${esc(c.proofId)}">${lk('file')}View the record</a></p>`)}
    ${accepted ? '' : mkCard('file', 'Upload a different record', uploadForm('line wide', 'Upload'), { id: 'proof' })}</div>`;
}

export function vet(c) {
  const { p, name } = c;
  return `<div class="sheet bleed">${vetHead(c.h1, `<p>${c.rule}</p>${c.proofNote ? `<p class="small">What counts as proof: ${esc(c.proofNote)}</p>` : ''}
      <p class="notebox"><span class="ring">${lk('info')}</span>This page is a reminder. Your contract states the vet visit requirement.</p>`)}
    ${mkCard('cal', p.vet_booked_at ? 'Your appointment' : 'I\'ve booked it', `<form method="post" action="/family/vet/booked" class="stack vf"><div class="two"><label for="v-day">Day<input id="v-day" type="date" name="day" value="${esc(c.day)}" required></label><label for="v-time">Time<input id="v-time" type="time" name="time" value="${esc(c.time)}"></label></div>
      <label for="v-clinic">Clinic <span class="muted">(if you like)</span><input id="v-clinic" name="clinic" value="${esc(p.vet_clinic ?? '')}" maxlength="120"></label>
      <button class="btn solid wide">${p.vet_booked_at ? 'Save changes' : 'I\'ve booked it'}</button></form>`, { id: 'booked' })}
    ${mkCard('file', 'Upload the vet\'s record', `${c.proof ? `<p class="small"><span class="st ok">Uploaded</span> ${esc(c.uploaded)}${p.proof_accepted_at ? `, accepted by ${esc(c.kennel)}` : ''}. <a href="/family/file/${esc(c.proof.id)}">View it</a></p>` : '<p class="small">A photo or PDF, up to 10 MB.</p>'}
      ${uploadForm(`${c.proof ? 'line' : 'solid'} wide`, c.proof ? 'Upload a new one' : 'Upload')}`, { id: 'proof' })}</div>`;
}

// ---------- Records ----------

export function records(c) {
  const { name } = c;
  return `<section class="mk mypup"><span class="paw only-cream">${lk('paw')}</span>${BOSTON}<div class="mk-b"><p class="eyebrow mp">${lk('paw')}My puppy</p><h1 class="script">${esc(name)}</h1>
      <dl>${c.facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div></section>
    ${mkCard('syringe', 'Shots, deworming and vet visits', c.records.length ? `<div class="tablewrap"><table><thead><tr><th>Date</th><th>What</th><th>Kind</th></tr></thead><tbody>${c.records.map(([d, what, note, kind]) => `<tr><td>${esc(d)}</td><td>${esc(what)}${note ? `<br><span class="small muted">${esc(note)}</span>` : ''}</td><td>${esc(kind)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">None recorded yet.</p>')}
    ${mkCard('file', 'Papers', `${c.contractId ? `<a class="pinline" href="/family/file/${esc(c.contractId)}">${lk('file')}<u>Your contract</u></a>` : '<p class="muted">Your contract will be here once it\'s added.</p>'}${c.proofId ? `<a class="pinline" href="/family/file/${esc(c.proofId)}">${lk('steth')}<u>Vet visit record</u></a>` : ''}`)}
    ${c.bag}
    ${contacts(c, false)}
    ${mkCard('image', `Photos of ${esc(name)}`, c.photos.length ? `<div class="gallery">${c.photos.map((ph) => `<a class="ph" href="/family/photo/${esc(ph.id)}"><img src="/family/photo/${esc(ph.id)}?s=t" alt="${esc(ph.alt ?? '')}" loading="lazy"></a>`).join('')}</div>` : '<p class="muted">Photos will appear here.</p>', { id: 'photos' })}`;
}

// What came home in the puppy's bag, on Records.
export function bag(items, name, kennel, disclosure) {
  if (!items.length) return '';
  return `${mkCard('gift', `What came home in ${esc(name)}'s bag`, items.map((x) => {
    const pr = x.program;
    return `<div class="prog"><span class="ico">${lk(pr ? TYPE_K[pr.portal_type] ?? 'gift' : 'gift')}</span><div class="stack tk"><b>${esc(x.name)}</b>${pr?.family_action ? `<p class="small muted">${esc(pr.family_action)}</p>` : ''}${pr ? `<div class="row"><a class="btn line small ext" href="${goHref(pr.id, 'bag')}">${esc(x.button || 'Get more')}</a></div>` : ''}</div></div>`;
  }).join(''), { id: 'bag', sub: `From ${esc(kennel)}` })}${items.some((x) => x.program) ? disclosure : ''}`;
}

// Forms from the content model: one input per field, in the model's order, with
// the words a breeder sees (LABELS) kept here, next to the inputs. parseForm()
// turns a submitted form back into the values the model checks.
import { escapeHtml as esc } from '../lib/html.js';
import { FEATURE_ICONS } from '../content/model.js';

// [label, hint] per field name; kind-specific entries win over the shared ones.
const SHARED = {
  slug: ['Web address', 'The last part of this page\'s address. Leave empty to make it from the name. Old addresses keep working if you change it.'],
  photo_id: ['Photo', null],
  bio: ['About', null],
  color: ['Color', null],
  sex: ['Sex', null],
  status: ['Status', null],
  show_on_site: ['Show on my website', null],
  eyebrow: ['Small label above the heading', 'The letter-spaced line, like "OUR PARENT DOGS".'],
  heading: ['Heading', null],
  lede: ['Line under the heading', null],
  name: ['Name', null],
  description: ['Description', null],
};
const LABELS = {
  site: {
    kennel_name: ['Kennel name', null], tagline: ['Line under the name', 'Shown small in the header, like "The American Gentleman".'],
    blurb: ['One or two sentences about you', 'For the footer and for search engines.'], breed: ['Breed', null],
    monogram: ['Monogram', 'Up to 3 letters in the logo.'], town: ['Town', 'Town and region only, never a street address.'], region: ['State or region', null],
    contact_email: ['Email for families', null], contact_phone: ['Phone', null], facebook_url: ['Facebook page address', null],
    facebook_label: ['Facebook page name', null], instagram_url: ['Instagram address', null],
    dark_mode: ['Dark mode', 'Follow each visitor\'s phone or computer setting, or always show the light version.'],
    show_other_prices: ['Show prices of extras', 'Off: visitors see "Contact us for pricing".'],
  },
  dogs: {
    call_name: ['Call name', null], registered_name: ['Registered name', null], role: ['Role', 'For example Dam, Sire, or Retired.'],
    date_of_birth: ['Born', null], titles: ['Titles', 'For example CH, CGC.'],
    status: ['Where they show', 'Retired and in-memory pages come later; for now only "At home" dogs show.'],
    health_display: ['Health results shown', 'Only results you tick below ever show.'],
  },
  health: { test: ['Test', 'For example "Patellas (OFA)".'], result: ['Result', null], normal: ['This is a normal result', null], date: ['Date', null], verify_url: ['Link to check it', 'For example the OFA page for this result.'], show: ['Show on my website', null] },
  litters: {
    name: ['Name', 'For example "The Gem litter" or "Willow × Boone".'], stage: ['Stage', null],
    plan_label: ['Label for a planned litter', 'For example "Planned pairing" or "Upcoming heat".'],
    dam_id: ['Dam', null], sire_id: ['Sire', null], dam_name: ['Dam, if not one of your dogs', null], sire_name: ['Sire, if not one of your dogs', null],
    born_on: ['Born', null], ready_on: ['Ready to go home', null], expected_label: ['Expected (planned litters)', 'For example "Mid-February 2027".'],
    ready_label: ['Going home (planned litters)', null], summary: ['A line about the litter', null],
  },
  puppies: { name: ['Name', null], collar: ['Collar', 'For example "pink collar".'] },
  reviews: {
    quote: ['Review', null], rating: ['Stars', '1 to 5.'], first_name: ['Name shown', 'First name or family name only, like "The Rivera family".'],
    town: ['Town', null], puppy_name: ['Their puppy\'s name', null], home_month: ['Month they brought the puppy home', null],
    topic: ['Topic', 'Optional: groups reviews in the filter, like "health" or "temperament".'],
    status: ['Shown', null],
  },
  steps: { heading: ['Step', null], body: ['Short text', null], detail: ['More detail (opens on tap)', null], pay_link: ['Link to "How to pay" under this step', null] },
  expander: { heading: ['Heading', null], body: ['Text', null], start_open: ['Open when the page loads', null] },
  extras: {
    kind: ['Kind', null], grp: ['Group', null], price_from: ['Price (or lowest price), in dollars', null], price_to: ['Highest price, for a range', null],
    weeks: ['Weeks (homegoing packages)', null], lead_in: ['Line above the checklist', 'For example "Your puppy will continue receiving:".'],
    checklist: ['What\'s included', 'One item per line.'], closing: ['Closing paragraph', null], featured: ['Mark as "most complete"', null],
  },
  hero: { headline: ['Headline', null], script: ['Script line', 'The handwritten-style line, like "and tuxedos to match".'], intro: ['Intro', null], photos: ['Photos', 'Up to 3.'], primary_label: ['Waitlist button', null], secondary_label: ['Puppies button', null] },
  facts: { items: ['Facts', 'Up to 3 pairs, like "8 wks" / "Before going home".'] },
  story: { script: ['Script word', null], text: ['Text', null], features: ['Three features', null], link_label: ['Link to your story', null] },
  waitlist: { line: ['Line', null], button_label: ['Button', null] },
  about: { text: ['Your story', 'Leave a blank line between paragraphs.'], facts: ['Facts', 'Pairs like "Litters a year" / "One or two".'] },
  contact: { location_note: ['Note about your location', 'For example "Exact address shared once your pickup is booked."'] },
  extras_page: { note: ['Note under the packages', null] },
};

const ENUM_WORDS = {
  sex: { female: 'Female', male: 'Male' },
  status_dogs: { active: 'At home', retired: 'Retired', remembered: 'In memory' },
  status_puppies: { available: 'Available', reserved: 'Reserved', placed: 'Placed', staying: 'Staying with us', coming_soon: 'Coming soon', hidden: 'Hidden' },
  status_reviews: { approved: 'Shown', hidden: 'Hidden' },
  health_display: { normal_only: 'Normal results only', all: 'All ticked results', none: 'None' },
  stage: { planned: 'Planned', current: 'Born (current)', past: 'Past' },
  kind: { item: 'Extra', homegoing: 'Extended homegoing package' },
  dark_mode: { auto: 'Follow the visitor\'s setting', light_only: 'Light only' },
};

export function labelFor(kind, name) {
  return LABELS[kind]?.[name] ?? SHARED[name] ?? [name.replace(/_/g, ' '), null];
}

const enumWords = (kind, name, v) => ENUM_WORDS[`${name}_${kind}`]?.[v] ?? ENUM_WORDS[name]?.[v] ?? v;

// ctx: { kind, photos: [{id, alt}], photoUrl(id), dogs: [{id, call_name}] }
export function field(name, f, value, ctx) {
  const [label, hint] = labelFor(ctx.kind, name);
  const id = `f-${name}`;
  const h = hint ? `<span class="hint">${esc(hint)}</span>` : '';
  const req = f.required ? ' required' : '';
  const v = value ?? '';
  switch (f.type) {
    case 'bool':
      return `<label class="check"><input type="checkbox" name="${name}" value="1"${value ? ' checked' : ''}> <span>${esc(label)}${h}</span></label>`;
    case 'enum':
      return `<label for="${id}">${esc(label)}${h}<select id="${id}" name="${name}"${req}>${f.required ? '' : '<option value=""></option>'}${f.values.map((x) => `<option value="${esc(x)}"${x === value ? ' selected' : ''}>${esc(enumWords(ctx.kind, name, x))}</option>`).join('')}</select></label>`;
    case 'dogid': {
      const dogs = ctx.dogs ?? [];
      return `<label for="${id}">${esc(label)}${h}<select id="${id}" name="${name}"><option value="">—</option>${dogs.map((d) => `<option value="${esc(d.id)}"${d.id === value ? ' selected' : ''}>${esc(d.call_name)}</option>`).join('')}</select></label>`;
    }
    case 'photo':
      return photoPicker(name, label, hint, value ? [value] : [], ctx, { multiple: false });
    case 'list':
      if (f.item === 'photo') return photoPicker(name, label, hint, value ?? [], ctx, { multiple: true, max: f.max });
      return `<label for="${id}">${esc(label)}${h}<textarea id="${id}" name="${name}" rows="6">${esc((value ?? []).join('\n'))}</textarea></label>`;
    case 'pairs': {
      const rows = [...(value ?? [])];
      while (rows.length < f.max) rows.push(['', '']);
      return `<fieldset><legend>${esc(label)}${h}</legend>${rows.map(([a, b], i) => `<div class="pair"><input name="${name}.${i}.0" value="${esc(a)}" aria-label="${esc(label)} ${i + 1}, value" maxlength="${f.keyMax}"><input name="${name}.${i}.1" value="${esc(b)}" aria-label="${esc(label)} ${i + 1}, label" maxlength="${f.valueMax}"></div>`).join('')}</fieldset>`;
    }
    case 'features': {
      const rows = [...(value ?? [])];
      while (rows.length < f.max) rows.push({ icon: 'heart', title: '', text: '' });
      return `<fieldset><legend>${esc(label)}${h}</legend>${rows.map((x, i) => `<div class="feature-row">
        <select name="${name}.${i}.icon" aria-label="Icon ${i + 1}">${FEATURE_ICONS.map((ic) => `<option${ic === x.icon ? ' selected' : ''}>${ic}</option>`).join('')}</select>
        <input name="${name}.${i}.title" value="${esc(x.title)}" placeholder="Title" aria-label="Feature ${i + 1} title" maxlength="40">
        <input name="${name}.${i}.text" value="${esc(x.text)}" placeholder="One line" aria-label="Feature ${i + 1} text" maxlength="160"></div>`).join('')}</fieldset>`;
    }
    case 'date':
      return `<label for="${id}">${esc(label)}${h}<input id="${id}" type="date" name="${name}" value="${esc(v)}"${req}></label>`;
    case 'month':
      return `<label for="${id}">${esc(label)}${h}<input id="${id}" type="month" name="${name}" value="${esc(v)}" placeholder="YYYY-MM"${req}></label>`;
    case 'int':
      return `<label for="${id}">${esc(label)}${h}<input id="${id}" type="number" inputmode="numeric" name="${name}" value="${esc(v)}" min="${f.min}" max="${f.max}"${req}></label>`;
    case 'url':
      return `<label for="${id}">${esc(label)}${h}<input id="${id}" type="url" name="${name}" value="${esc(v)}" placeholder="https://"${req}></label>`;
    case 'email':
      return `<label for="${id}">${esc(label)}${h}<input id="${id}" type="email" name="${name}" value="${esc(v)}"${req}></label>`;
    case 'slug':
      return `<label for="${id}">${esc(label)}${h}<input id="${id}" name="${name}" value="${esc(v)}" pattern="[a-z0-9-]*" autocapitalize="none" spellcheck="false"></label>`;
    default:
      return f.multiline
        ? `<label for="${id}">${esc(label)}${h}<textarea id="${id}" name="${name}" rows="${f.max > 1000 ? 10 : 4}" maxlength="${f.max}"${req}>${esc(v)}</textarea></label>`
        : `<label for="${id}">${esc(label)}${h}<input id="${id}" name="${name}" value="${esc(v)}" maxlength="${f.max}"${req}></label>`;
  }
}

function photoPicker(name, label, hint, chosen, ctx, { multiple, max }) {
  const photos = ctx.photos ?? [];
  const type = multiple ? 'checkbox' : 'radio';
  const none = multiple ? '' : `<label class="ph-opt none"><input type="radio" name="${name}" value=""${chosen.length ? '' : ' checked'}><span>No photo</span></label>`;
  const opts = photos.map((p) => `<label class="ph-opt"><input type="${type}" name="${name}" value="${esc(p.id)}"${chosen.includes(p.id) ? ' checked' : ''}><img src="${esc(ctx.photoUrl(p.id))}" alt="${esc(p.alt || 'Photo')}" loading="lazy"></label>`).join('');
  return `<fieldset class="photos"><legend>${esc(label)}${hint ? `<span class="hint">${esc(hint)}</span>` : ''}${max ? `<span class="hint">Choose up to ${max}.</span>` : ''}</legend>
    ${photos.length ? `<div class="ph-grid">${none}${opts}</div>` : `<p class="muted small">No photos yet. <a href="${esc(ctx.photosLink ?? '#')}">Add photos</a> first.</p>`}</fieldset>`;
}

// The web address goes last: most people never change it.
export function fields(list, values, ctx) {
  const entries = Object.entries(list).sort(([a], [b]) => (a === 'slug') - (b === 'slug'));
  return entries.map(([n, f]) => field(n, f, values?.[n], ctx)).join('\n');
}

// A submitted form → values for the model. Checkboxes absent mean off; empty
// inputs mean "not set"; lists, pairs and features are rebuilt from their parts.
export function parseForm(list, form) {
  const out = {};
  for (const [n, f] of Object.entries(list)) {
    switch (f.type) {
      case 'bool': out[n] = form.has(n); break;
      case 'int': { const s = String(form.get(n) ?? '').trim(); out[n] = s === '' ? null : Number(s); break; }
      case 'list':
        out[n] = f.item === 'photo' ? form.getAll(n).filter(Boolean) : String(form.get(n) ?? '').split('\n').map((x) => x.trim()).filter(Boolean);
        break;
      case 'pairs': {
        const rows = [];
        for (let i = 0; i < f.max; i++) {
          const a = String(form.get(`${n}.${i}.0`) ?? '').trim();
          const b = String(form.get(`${n}.${i}.1`) ?? '').trim();
          if (a || b) rows.push([a, b]);
        }
        out[n] = rows;
        break;
      }
      case 'features': {
        const rows = [];
        for (let i = 0; i < f.max; i++) {
          const title = String(form.get(`${n}.${i}.title`) ?? '').trim();
          const text = String(form.get(`${n}.${i}.text`) ?? '').trim();
          if (title || text) rows.push({ icon: String(form.get(`${n}.${i}.icon`) ?? 'heart'), title, text });
        }
        out[n] = rows;
        break;
      }
      default: { const s = form.get(n); out[n] = s === null ? null : String(s); }
    }
  }
  return out;
}

// Forms from the content model: one input per field, in the model's order, with
// the words a breeder sees (LABELS) kept here, next to the inputs. parseForm()
// turns a submitted form back into the values the model checks.
import { escapeHtml as esc } from '../lib/html.js';
import { FEATURE_ICONS, COLLAGE_LAYOUTS, FOCUS, collageLayout } from '../content/model.js';

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
    monogram: ['Monogram', 'Up to 3 letters in the diamond at the top of the page, when you have no logo of your own.'],
    logo_photo_id: ['Your logo', 'Shown in place of the monogram at the top and foot of every page. Tapping it shows it full size. A square or diamond logo works best.'], town: ['Town', 'Town and region only, never a street address.'], region: ['State or region', null],
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
  hero: {
    banner_photo_id: ['Banner photo', 'A wide strip right under the menu, across the whole page. Make it 1600 × 640 px (5:2) for a sharp fit. "No photo" for none.'],
    banner_focus: ['Banner: which part to keep', 'If the photo is taller than the strip: the part that shows.'],
    headline: ['Headline', null], script: ['Script line', 'The handwritten-style line, like "and tuxedos to match".'], intro: ['Intro', null],
    layout: ['Photo layout', 'Pick the boxes, then a photo for each box below. With fewer photos than boxes, your site uses a layout for that many.'],
    frame: ['Frame', 'In your site\'s colours.'],
    photos: ['Photos', null], primary_label: ['Waitlist button', null], secondary_label: ['Puppies button', null],
  },
  facts: { items: ['Facts', 'Up to 3 pairs, like "8 wks" / "Before going home".'] },
  story: { script: ['Script word', null], text: ['Text', null], features: ['Three features', null], link_label: ['Link to your story', null] },
  waitlist: {
    line: ['Line', null], button_label: ['Button', null],
    closed: ['Waitlist closed', 'On: the application form is replaced by your message below, and no applications can be sent.'],
    closed_message: ['Message while closed', 'For example "Our waitlist for 2027 is full. Check back in the spring." Leave empty for a general one.'],
    form_heading: ['Application form heading', 'Leave empty for "Apply to join the waitlist".'],
    form_intro: ['Line under the form heading', 'For example "Your place on the list is set the day your application fee is received."'],
    offer_message: ['Offer pups email', 'What Offer pups on Your waitlist fills in, after "Hi <name>,". Leave empty for "It\'s your turn to choose a pup! Please review the available puppies on our website and reach out to us with your selection." A link to your Puppies page and your kennel name follow.'],
  },
  albums: {
    title: ['Title', 'For example "The Gem litter, week 6".'], description: ['A line about it', null],
    litter_id: ['Litter', 'Its litter\'s page links to it, and that litter\'s photos are offered first below.'],
    cover_photo_id: ['Cover photo', 'Leave as "No photo" to use the first photo.'],
    photos: ['Photos', 'Tick the photos for this album. They show in the order they appear here, newest first.'],
    show_on_site: ['Show on my website', null],
  },
  questions: {
    type: ['Kind of answer', null],
    label: ['Question', 'For example "Preferred sex" or "Tell us about your home".'],
    hint: ['Help text', 'Optional, shown small under the question, like "Who lives with you, other pets, your yard".'],
    required: ['Families must answer this', 'Off: it shows as "(optional)".'],
    options: ['Choices (for "A choice from a list")', 'One per line. The first is picked to begin with unless families must answer, so a first choice like "Either" or "Any color" works well.'],
  },
  about: { text: ['Your story', 'Leave a blank line between paragraphs.'], facts: ['Facts', 'Pairs like "Litters a year" / "One or two".'] },
  contact: { location_note: ['Note about your location', 'For example "Exact address shared once your pickup is booked."'] },
  extras_page: { note: ['Note under the packages', null] },
  payment: {
    show_on_site: ['Show on my website', 'Off until you turn it on. It shows on your waitlist page under How to pay.'],
    title: ['Heading', 'Leave empty for the usual name.'],
    due_note: ['When it\'s due', 'For example "after we approve your application" or "within 48 hours of choosing your puppy".'],
    methods: ['Ways to pay', 'One per row: the way, then what families need to pay that way, like "Venmo" and "@ak-bostons", or "Check" and "Payable to AK Boston Terriers". Amounts appear only if you type them here.'],
    note: ['What to write in the payment note', 'For example "your full name and AK application".'],
    pay_url: ['Link to your own payment page', 'Optional: Stripe, Square or PayPal. Shows as a button.'],
    pay_label: ['Button wording', 'Leave empty for "Pay online".'],
  },
  safe_notice: {
    enabled: ['Show the safe-payment notice', 'On your waitlist page and every puppy page. It warns families about scams that copy breeders\' photos and names.'],
    text: ['Wording', null],
  },
};

const ENUM_WORDS = {
  sex: { female: 'Female', male: 'Male' },
  status_dogs: { active: 'At home', retired: 'Retired', remembered: 'In memory' },
  status_puppies: { available: 'Available', reserved: 'Reserved', placed: 'Placed', staying: 'Staying with us', coming_soon: 'Coming soon', hidden: 'Hidden' },
  status_reviews: { approved: 'Shown', hidden: 'Hidden' },
  health_display: { normal_only: 'Normal results only', all: 'All ticked results', none: 'None' },
  stage: { planned: 'Planned', current: 'Born (current)', past: 'Past' },
  banner_focus: { top: 'The top', middle: 'The middle', bottom: 'The bottom' },
  frame: { mat: 'A soft mat around each photo', double: 'A mat with a fine inner line, like a framed print', sprig: 'A leafy vine round each photo', none: 'No frame' },
  kind: { item: 'Extra', homegoing: 'Extended homegoing package' },
  dark_mode: { auto: 'Follow the visitor\'s setting', light_only: 'Light only' },
  type_questions: { text: 'A short answer', paragraph: 'A longer answer (a few lines)', choice: 'A choice from a list', yes_no: 'Yes or no', litter: 'Which litter (your planned and current litters)', phone: 'A phone number', town: 'A town' },
};

export function labelFor(kind, name) {
  return LABELS[kind]?.[name] ?? SHARED[name] ?? [name.replace(/_/g, ' '), null];
}

// Each box shape: what it's called, and the photo size that fills it sharply
// (uploads are resized to 1600 px on the long side).
export const BOX_WORDS = {
  wide: { name: 'Wide', ratio: '4:3', size: '1600 × 1200' },
  tall: { name: 'Tall', ratio: '4:5', size: '1280 × 1600' },
  square: { name: 'Square', ratio: '1:1', size: '1600 × 1600' },
};
const boxHint = (shape) => `${BOX_WORDS[shape].name} box (${BOX_WORDS[shape].ratio}): best at ${BOX_WORDS[shape].size} px.`;
const FOCUS_WORDS = { top: 'The top', middle: 'The middle', bottom: 'The bottom' };

// Each layout's little drawing: its boxes as [x, y, w, h] in a 50 × 40 frame.
const LAYOUT_RECTS = {
  one_wide: [[5, 5, 40, 30]],
  one_tall: [[13, 5, 24, 30]],
  two_tall: [[3, 5, 21, 30], [26, 5, 21, 30]],
  two_wide: [[8, 1, 34, 18.5], [8, 20.5, 34, 18.5]],
  tall_two_wide: [[2, 4, 22, 32], [26, 4, 22, 15], [26, 21, 22, 15]],
  wide_two_square: [[9, 1, 32, 20], [9, 23, 15, 15], [26, 23, 15, 15]],
  four_square: [[6, 1, 18, 18], [26, 1, 18, 18], [6, 21, 18, 18], [26, 21, 18, 18]],
};
const layoutSvg = (key) => `<svg viewBox="0 0 50 40" width="75" height="60" aria-hidden="true">${LAYOUT_RECTS[key].map(([x, y, w, h], i) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.2"/><text x="${x + w / 2}" y="${y + h / 2 + 3}" text-anchor="middle" font-size="9" fill="currentColor">${i + 1}</text>`).join('')}</svg>`;
const chosenLayout = (values) => values?.layout ?? collageLayout(null, (values?.photos ?? []).length) ?? 'tall_two_wide';

const enumWords = (kind, name, v) => ENUM_WORDS[`${name}_${kind}`]?.[v] ?? ENUM_WORDS[name]?.[v] ?? v;

// ctx: { kind, photos: [{id, alt}], photoUrl(id), photoGroups, upload: {action, tags, alt}, dogs: [{id, call_name}] }
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
      return `<label for="${id}">${esc(label)}${h}<select id="${id}" name="${name}"${req}>${f.required || f.default ? '' : '<option value=""></option>'}${f.values.map((x) => `<option value="${esc(x)}"${x === (value ?? f.default) ? ' selected' : ''}>${esc(enumWords(ctx.kind, name, x))}</option>`).join('')}</select></label>`;
    case 'litterid': {
      const litters = ctx.litters ?? [];
      return `<label for="${id}">${esc(label)}${h}<select id="${id}" name="${name}"><option value="">None</option>${litters.map((l) => `<option value="${esc(l.id)}"${l.id === value ? ' selected' : ''}>${esc(l.name)}</option>`).join('')}</select></label>`;
    }
    case 'dogid': {
      const dogs = ctx.dogs ?? [];
      return `<label for="${id}">${esc(label)}${h}<select id="${id}" name="${name}"><option value="">—</option>${dogs.map((d) => `<option value="${esc(d.id)}"${d.id === value ? ' selected' : ''}>${esc(d.call_name)}</option>`).join('')}</select></label>`;
    }
    case 'photo':
      return photoPicker(name, label, hint, value ? [value] : [], ctx, { multiple: false });
    case 'layout': {
      const current = chosenLayout(ctx.values);
      return `<fieldset class="layouts" data-layouts><legend>${esc(label)}${h}</legend>${f.values.map((k) => `<label class="layout-opt"><input type="radio" name="${name}" value="${esc(k)}" data-boxes="${COLLAGE_LAYOUTS[k].boxes.join(',')}"${k === current ? ' checked' : ''}>${layoutSvg(k)}<span>${esc(COLLAGE_LAYOUTS[k].label)}</span></label>`).join('')}</fieldset>`;
    }
    case 'list':
      if (f.item === 'focus') return '';
      if (f.item === 'photo' && f.boxes) {
        // One photo per box, in box order, each with which part to keep. Boxes the
        // layout doesn't have are hidden (app.js shows them when the layout changes).
        const boxes = COLLAGE_LAYOUTS[chosenLayout(ctx.values)].boxes;
        const focus = ctx.values?.focus ?? [];
        return Array.from({ length: f.max }, (_, i) => {
          const shape = boxes[i] ?? 'square';
          return `<div class="box" data-box="${i}"${i < boxes.length ? '' : ' hidden'}>${photoPicker(`${name}.${i}`, `Box ${i + 1}`, boxHint(shape), value?.[i] ? [value[i]] : [], ctx, { multiple: false })}
            <label>Box ${i + 1}: which part to keep<span class="hint">If the photo is a different shape from the box: the part that shows.</span><select name="focus.${i}">${FOCUS.map((x) => `<option value="${x}"${x === (focus[i] ?? 'middle') ? ' selected' : ''}>${FOCUS_WORDS[x]}</option>`).join('')}</select></label></div>`;
        }).join('\n');
      }
      if (f.item === 'photo') return photoPicker(name, label, hint, value ?? [], ctx, { multiple: true, max: f.max });
      return `<label for="${id}">${esc(label)}${h}<textarea id="${id}" name="${name}" rows="6">${esc((value ?? []).join('\n'))}</textarea></label>`;
    case 'pairs': {
      const rows = [...(value ?? [])];
      while (rows.length < f.max) rows.push(['', '']);
      return `<fieldset><legend>${esc(label)}${h}</legend>${rows.map(([a, b], i) => `<div class="pair"><input name="${name}.${i}.0" value="${esc(a)}" aria-label="${esc(label)} ${i + 1}, ${esc(f.names?.[0] ?? 'value')}" maxlength="${f.keyMax}"${f.placeholders && !i ? ` placeholder="${esc(f.placeholders[0])}"` : ''}><input name="${name}.${i}.1" value="${esc(b)}" aria-label="${esc(label)} ${i + 1}, ${esc(f.names?.[1] ?? 'label')}" maxlength="${f.valueMax}"${f.placeholders && !i ? ` placeholder="${esc(f.placeholders[1])}"` : ''}></div>`).join('')}</fieldset>`;
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
      return `<label for="${id}">${esc(label)}${h}<input id="${id}" name="${name}" value="${esc(v)}" pattern="[a-z0-9\\-]*" autocapitalize="none" spellcheck="false"></label>`;
    default:
      return f.multiline
        ? `<label for="${id}">${esc(label)}${h}<textarea id="${id}" name="${name}" rows="${f.max > 1000 ? 10 : 4}" maxlength="${f.max}"${req}>${esc(v)}</textarea></label>`
        : `<label for="${id}">${esc(label)}${h}<input id="${id}" name="${name}" value="${esc(v)}" maxlength="${f.max}"${req}></label>`;
  }
}

// A photo picker shows the photos of what's being edited first (ctx.photoGroups:
// [{ label, ids }], the first group being this record's own), then every other
// photo folded away, and an Add photos button that uploads straight into the
// first group, tagged with ctx.upload.tags (public/_kp/m/photos.js). Photos
// chosen here are tagged with the record when the form is saved.
function photoPicker(name, label, hint, chosen, ctx, { multiple, max }) {
  const photos = ctx.photos ?? [];
  const type = multiple ? 'checkbox' : 'radio';
  const byId = new Map(photos.map((p) => [p.id, p]));
  const groups = (ctx.photoGroups ?? [{ label: 'Photos', ids: photos.map((p) => p.id) }]).map((g) => ({ ...g, ids: g.ids.filter((id) => byId.has(id)) }));
  const shown = new Set(groups.flatMap((g) => g.ids));
  const strays = chosen.filter((id) => byId.has(id) && !shown.has(id));
  groups[0] = { ...groups[0], ids: [...strays, ...groups[0].ids] };
  for (const id of strays) shown.add(id);
  const rest = photos.filter((p) => !shown.has(p.id));
  const opt = (p) => `<label class="ph-opt"><input type="${type}" name="${name}" value="${esc(p.id)}"${chosen.includes(p.id) ? ' checked' : ''}><img src="${esc(ctx.photoUrl(p.id))}" alt="${esc(p.alt || 'Photo')}" loading="lazy"></label>`;
  const none = multiple ? '' : `<label class="ph-opt none"><input type="radio" name="${name}" value=""${chosen.length ? '' : ' checked'}><span>No photo</span></label>`;
  const grid = (ids, first) => `<div class="ph-grid"${first ? ' data-first' : ''}>${first ? none : ''}${ids.map((id) => opt(byId.get(id))).join('')}</div>`;
  const parts = groups.map((g, i) => (i === 0 || g.ids.length ? `<p class="ph-head">${esc(g.label)}${i === 0 && !g.ids.length ? ' <span class="muted small">· none yet</span>' : ''}</p>${grid(g.ids, i === 0)}` : ''));
  const others = rest.length ? `<details class="ph-more"><summary>${groups[0].ids.length || groups.length > 1 ? 'Other photos' : 'Choose from your photos'} (${rest.length})</summary>${grid(rest.map((p) => p.id), false)}</details>` : '';
  const up = ctx.upload;
  const add = up ? `<div class="ph-add"><label class="button">Add photos<input type="file" accept="image/*" multiple data-add-photos></label><span class="muted small" role="status"></span></div>` : '';
  return `<fieldset class="photos" data-picker data-name="${esc(name)}" data-type="${type}"${max ? ` data-max="${max}"` : ''}${up ? ` data-upload="${esc(up.action)}" data-tags="${esc(up.tags)}" data-alt="${esc(up.alt ?? '')}"` : ''}>
    <legend>${esc(label)}${hint ? `<span class="hint">${esc(hint)}</span>` : ''}${max ? `<span class="hint">Choose up to ${max}.</span>` : ''}</legend>
    ${parts.join('')}${others}${add}</fieldset>`;
}

// The web address goes last: most people never change it.
export function fields(list, values, ctx) {
  const entries = Object.entries(list).sort(([a], [b]) => (a === 'slug') - (b === 'slug'));
  return entries.map(([n, f]) => field(n, f, values?.[n], { ...ctx, values })).join('\n');
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
        if (f.item === 'focus') { out[n] ??= []; break; }
        if (f.item === 'photo' && f.boxes) {
          // The layout's boxes in order; an empty box is skipped, so the photos
          // after it move up (the site then uses a layout for that many).
          const count = COLLAGE_LAYOUTS[form.get('layout')]?.boxes.length ?? f.max;
          const ids = []; const focus = [];
          for (let i = 0; i < count; i++) {
            const id = String(form.get(`${n}.${i}`) ?? '');
            if (!id) continue;
            ids.push(id);
            const fx = String(form.get(`focus.${i}`) ?? '');
            focus.push(FOCUS.includes(fx) ? fx : 'middle');
          }
          out[n] = ids;
          out.focus = focus;
          break;
        }
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

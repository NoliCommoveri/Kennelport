// Forms from the content model: one input per field, in the model's order, with
// the words a breeder sees (LABELS) kept here, next to the inputs. parseForm()
// turns a submitted form back into the values the model checks.
import { escapeHtml as esc } from '../lib/html.js';
import { FEATURE_ICONS, COLLAGE_LAYOUTS, FOCUS, collageLayout, FAQ_PLACES } from '../content/model.js';
import { SCHEMES } from '../render/schemes.js';

// [label, hint] per field name; kind-specific entries win over the shared ones.
const SHARED = {
  slug: ['Web address', 'The last part of this page\'s address. Leave empty to make it from the name. Old addresses keep working if you change it.'],
  photo_id: ['Photo', null],
  bio: ['About', null],
  color: ['Color', null],
  sex: ['Sex', null],
  registry: ['Registry', 'For example AKC or CKC. Shown on your site where set.'],
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
    scheme: ['Colour scheme', 'Colours, fonts and the little ornaments by headings, each with a light and a dark version. Preview, then Publish, to see it on your site.'],
    dark_mode: ['Dark mode', 'Follow each visitor\'s phone or computer setting, or always show the light version.'],
    show_other_prices: ['Show prices of extras and adults', 'Extras, and dogs looking for a home. Off: visitors see "Contact us for pricing". Litter prices have their own switch on each litter.'],
  },
  dogs: {
    call_name: ['Call name', null], registered_name: ['Registered name', null], role: ['Role', 'For example Dam, Sire, or Retired.'],
    date_of_birth: ['Born', null], weight: ['Weight', 'For example "45 lb". Shown on the dog\'s card and page. Your website only: KennelOS never changes it.'], titles: ['Titles', 'For example CH, CGC.'],
    status: ['Where they show', 'Retired and in-memory pages come later; for now only "At home" dogs show.'],
    upcoming: ['Up and coming', 'A young dog you\'ve kept and aren\'t breeding yet. Shown under Up and coming on your Dogs page, not with your girls and boys.'],
    for_sale: ['Looking for a home', 'An adult you are placing. Shown under Looking for a home, with Ask about this dog.'],
    price: ['Asking price, in dollars', 'Shown only with "Show prices of extras and adults" on under Kennel details; otherwise "Contact us for pricing".'],
    died_on: ['Date of death', 'For a dog in memory.'],
    health_display: ['Health results shown', 'Only results you tick below ever show.'],
  },
  health: { test: ['Test', 'For example "Patellas (OFA)".'], result: ['Result', null], normal: ['This is a normal result', null], date: ['Date', null], verify_url: ['Link to check it', 'For example the OFA page for this result.'], show: ['Show on my website', null] },
  litters: {
    name: ['Name', 'For example "The Gem litter" or "Willow × Boone".'], stage: ['Stage', null],
    plan_label: ['Label for a planned litter', 'For example "Planned pairing" or "Upcoming heat".'],
    dam_id: ['Dam', null], sire_id: ['Sire', null], dam_name: ['Dam, if not one of your dogs', null], sire_name: ['Sire, if not one of your dogs', null],
    born_on: ['Born', null], ready_on: ['Ready to go home', null], expected_label: ['Expected (planned litters)', 'For example "Mid-February 2027".'],
    ready_label: ['Going home (planned litters)', null], summary: ['A line about the litter', null],
    deposits_on: ['Deposits open', 'Until this day the litter shows under Coming up, and its Available puppies read "Available on" this date. Empty: available straight away.'],
    price_female: ['Price for a girl, in dollars', 'With limited registration. Leave one sex empty if girls and boys cost the same.'],
    price_male: ['Price for a boy, in dollars', null],
    full_reg_female: ['Full registration adds, for a girl', 'A puppy you have marked Full shows the total price, never "+$300". Everywhere else your site shows the limited price, and this amount under "Ask about full registration" as the Full Registration Surcharge.'],
    full_reg_male: ['Full registration adds, for a boy', null],
    deposit_female: ['Deposit for a girl', null], deposit_male: ['Deposit for a boy', null],
    price_note: ['A note under the prices', 'For example "Prices are our intended base prices and may change before the contract is signed."'],
    show_prices: ['Show prices', 'Off: this litter and its puppies show "Contact us for pricing".'],
    show_placed: ['Show placed puppies', 'They read Reserved on your site. Off: placed puppies leave the site.'],
    show_puppy_photos: ['Show each puppy\'s tagged photos on its page', 'On: a puppy\'s page shows the photos you\'ve tagged as that puppy, as its own album. Your photo tags are private otherwise, so this is what publishes them: tick it only where every tagged photo is one you\'d put on the site.'],
    ask_full_reg: ['Families can ask about full registration', 'On: each puppy with no registration set (you\'d sell it either way), and the litter page, show "Ask about full registration", which opens your contact form with the litter and puppy filled in. With Show prices on, the Full Registration Surcharge shows under it.'],
  },
  puppies: {
    name: ['Name', null], collar: ['Collar', 'For example "pink collar".'],
    registration: ['Registration', 'Leave it empty while it isn\'t settled, or when you\'d sell either way: your site then reads Limited and shows the limited price, and families can still ask about full registration if the litter\'s tick below allows it.'],
    price: ['Its own price, in dollars', 'Usually empty, to follow the litter\'s prices. Shown exactly as typed.'],
    more_photos_url: ['More photos link', 'Where the rest of THIS puppy\'s photos live \u2014 your Google Photos or Shutterfly share for it. Shown under its photos on its page as "See more photos".'],
  },
  reviews: {
    quote: ['Review', null], rating: ['Stars', '1 to 5.'], first_name: ['Name shown', 'First name or family name only, like "The Rivera family".'],
    town: ['Town', null], puppy_name: ['Their puppy\'s name', null], home_month: ['Month they brought the puppy home', null],
    topic: ['Topic', 'Optional: groups reviews in the filter, like "health" or "temperament".'],
    status: ['Shown', null],
  },
  steps: { heading: ['Step', null], body: ['Short text', null], detail: ['More detail (opens on tap)', null], pay_link: ['Link to "How to pay" under this step', null] },
  expander: {
    heading: ['Heading', null], body: ['Text', null], start_open: ['Open when the page loads', null],
    places: ['Also show this question at the top of', 'It stays on your FAQ page as well. Use it for a question families need where they meet it \u2014 "limited or full registration?" at the top of every litter\'s page, say.'],
  },
  extras: {
    kind: ['Kind', null], grp: ['Group', null], price_from: ['Price (or lowest price), in dollars', null], price_to: ['Highest price, for a range', null],
    weeks: ['Weeks (homegoing packages)', null], lead_in: ['Line above the checklist', 'For example "Your puppy will continue receiving:".'],
    checklist: ['What\'s included', 'One item per line.'], closing: ['Closing paragraph', null], featured: ['Mark as "most complete"', null],
  },
  products: {
    name: ['Name', 'For example "TLC Puppy Food".'], grp: ['Group', 'Optional, a small label above the name, like "Food" or "Toys".'],
    photo_id: ['Picture', 'A logo or product photo of your own. Not needed when the brand\'s picture is filled in below.'],
    image_url: ['The brand\'s picture', 'Filled in from the embed code, and shown straight from the brand, as their referral program intends. Only some brands\' addresses can be shown this way; for others, the picture is copied into Picture above. Empty it to use your own picture instead.'],
    link_url: ['Your referral link', 'Where tapping it goes, in a new tab.'], link_label: ['Button wording', 'Leave empty for "Shop now".'],
    code: ['Discount or referral code', 'For example "AKBOSTON10". Shown as "Use code …".'], code_note: ['Line after the code', 'For example "for 10% off your first order".'],
    home_badge: ['Show as a badge on my home page', 'Its picture shows right under your banner, linked to your referral link. Up to 2; they sit side by side, on phones too.'],
  },
  products_page: { note: ['Note under the products', 'For example "We may earn a small commission when you order through these links."'] },
  hero: {
    banner_photo_id: ['Banner photo', 'A wide strip right under the menu, across the whole page. Make it 1600 × 640 px (5:2) for a sharp fit. "No photo" for none.'],
    banner_focus: ['Banner: which part to keep', 'If the photo is taller than the strip: the part that shows.'],
    headline: ['Headline', null], script: ['Script line', 'The handwritten-style line, like "and tuxedos to match".'], intro: ['Intro', null],
    layout: ['Photo layout', 'Pick the boxes, then a photo for each box below. With fewer photos than boxes, your site uses a layout for that many.'],
    frame: ['Frame', 'In your site\'s colours.'],
    photos: ['Photos', null], primary_label: ['Waitlist button', null], secondary_label: ['Puppies button', null],
  },
  facts: { items: ['Facts', 'Up to 3 pairs, like "8 wks" / "Before going home".'] },
  story: {
    photo_id: ['Photo', 'A tall photo (4:5) beside your words: best at 1280 × 1600 px. "No photo" leaves it out, and your words take the whole width.'],
    script: ['Script word', null], text: ['Text', null], features: ['Three features', null], link_label: ['Link to your story', null],
  },
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
    photos: ['Photos', 'Tick the photos for this album. They show newest first.'],
    more_photos_url: ['More photos link', 'Where the rest of these photos live \u2014 your Google Photos or Shutterfly share, say. Shown under the album as "See more photos".'],
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
  status_puppies: { available: 'Available', reserved: 'Reserved', placed: 'Placed (shows as Reserved)', staying: 'Joining our program', coming_soon: 'Still deciding', hidden: 'Hidden' },
  registration: { limited: 'Limited', full: 'Full' },
  status_reviews: { approved: 'Shown', hidden: 'Hidden' },
  health_display: { normal_only: 'Normal results only', all: 'All ticked results', none: 'None' },
  stage: { planned: 'Planned', current: 'Born (current)', past: 'Past' },
  banner_focus: { top: 'The top', middle: 'The middle', bottom: 'The bottom' },
  frame: { mat: 'A soft mat around each photo', double: 'A mat with a fine inner line, like a framed print', sprig: 'A leafy vine round each photo', none: 'No frame' },
  kind: { item: 'Extra', homegoing: 'Extended homegoing package' },
  dark_mode: { auto: 'Follow the visitor\'s setting', light_only: 'Light only' },
  scheme: Object.fromEntries(SCHEMES.map((x) => [x.id, x.name])),
  type_questions: { text: 'A short answer', paragraph: 'A longer answer (a few lines)', choice: 'A choice from a list', yes_no: 'Yes or no', litter: 'Which litter (your planned and current litters)', phone: 'A phone number', town: 'A town' },
};

// The colour schemes as cards: four swatches each (light ground and button, dark
// ground and button), its name, and its fonts. Drawn as SVG: the app allows no
// inline styles.
function schemePicker(name, label, h, current) {
  const fonts = (s) => [s.display, s.body, s.script].filter(Boolean).join(' · ');
  const swatch = (s) => `<svg viewBox="0 0 88 28" width="88" height="28" aria-hidden="true">${[s.light.bg, s.light.accent, s.dark.bg, s.dark.accent].map((c, i) => `<rect x="${i * 22}" y="0" width="22" height="28" fill="${c}"/>`).join('')}<rect x=".5" y=".5" width="87" height="27" fill="none" stroke="#8884"/></svg>`;
  return `<fieldset class="layouts"><legend>${esc(label)}${h}</legend>${SCHEMES.map((s) => `<label class="layout-opt"><input type="radio" name="${name}" value="${esc(s.id)}"${s.id === current ? ' checked' : ''}>${swatch(s)}<span><b>${esc(s.name)}</b><br>${esc(fonts(s))}${s.darkFirst ? '<br>Dark first' : ''}</span></label>`).join('')}</fieldset>`;
}

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
// A field KennelOS owns while linked (plan 5.3): shown, not editable. The save
// keeps what's stored (screens.js), whatever the form sends.
function lockedField(name, f, value, ctx, label) {
  let shown;
  if (value === null || value === undefined || value === '' || (Array.isArray(value) && !value.length)) shown = '—';
  else if (f.type === 'bool') shown = value ? 'Yes' : 'No';
  else if (f.type === 'dogid') shown = (ctx.dogs ?? []).find((d) => d.id === value)?.call_name ?? '—';
  else if (f.type === 'enum') shown = enumWords(ctx.kind, name, value);
  else if (Array.isArray(value)) shown = value.join(', ');
  else shown = String(value);
  return `<p class="locked"><b>${esc(label)}</b><br>${esc(shown)} <span class="muted small">· from KennelOS, change it there</span></p>`;
}

export function field(name, f, value, ctx) {
  const [label, hint] = labelFor(ctx.kind, name);
  if (ctx.locked?.has(name)) return lockedField(name, f, value, ctx, label);
  const id = `f-${name}`;
  const h = hint ? `<span class="hint">${esc(hint)}</span>` : '';
  const req = f.required ? ' required' : '';
  const v = value ?? '';
  if (f.ui === 'scheme') return schemePicker(name, label, h, value ?? f.values[0]);
  switch (f.type) {
    case 'bool':
      return `<label class="check"><input type="checkbox" name="${name}" value="1"${value ? ' checked' : ''}> <span>${esc(label)}${h}</span></label>`;
    case 'enum': {
      // A required choice with no default starts on "Choose…", not on its first
      // value, so a new dog's sex (or a litter's stage) is never saved by accident.
      const unset = value === null || value === undefined || value === '';
      const blank = !f.required && !f.default ? '<option value=""></option>'
        : f.required && !f.default && unset ? '<option value="" selected disabled>Choose…</option>' : '';
      return `<label for="${id}">${esc(label)}${h}<select id="${id}" name="${name}"${req}>${blank}${f.values.map((x) => `<option value="${esc(x)}"${x === (value ?? f.default) ? ' selected' : ''}>${esc(enumWords(ctx.kind, name, x))}</option>`).join('')}</select></label>`;
    }
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
      // A list of fixed keys (a FAQ's places): one tick box each, in the model's
      // order, with the words the manage app calls those pages.
      if (f.item === 'enum') {
        const on = new Set(value ?? []);
        return `<fieldset><legend>${esc(label)}${h}</legend>${f.values.map((x) => `<label class="check"><input type="checkbox" name="${name}" value="${esc(x)}"${on.has(x) ? ' checked' : ''}> <span>${esc(FAQ_PLACES[x] ?? x)}</span></label>`).join('')}</fieldset>`;
      }
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

// The long forms in sections (docs/Puppy_Parent_Portal_Plan.md section 7.3): what belongs
// together under a heading, short fields two to a row, and every on/off setting gathered
// at the end as switches instead of scattered between the inputs. A field a group doesn't
// name still shows, under More, so a new field is never lost. Kinds without groups keep
// the one plain list.
const GROUPS = {
  dogs: [['About', ['call_name', 'sex', 'registered_name', 'date_of_birth', 'color', 'weight', 'role', 'registry', 'titles']], ['Photo and story', ['photo_id', 'bio']], ['Where they show', ['status', 'health_display', 'price', 'died_on']]],
  litters: [['The litter', ['name', 'stage', 'summary']], ['Parents', ['dam_id', 'sire_id', 'dam', 'sire', 'dam_name', 'sire_name']], ['Dates', ['born_on', 'ready_on', 'deposits_on']], ['For a planned litter', ['plan_label', 'expected_label', 'ready_label'], (v) => v?.stage === 'planned'], ['Prices', ['price_female', 'price_male', 'full_reg_female', 'full_reg_male', 'deposit_female', 'deposit_male', 'price_note']]],
  puppies: [['The puppy', ['name', 'collar', 'sex', 'color', 'status', 'registration', 'registry', 'price']], ['Photo and story', ['photo_id', 'bio', 'more_photos_url']]],
  site: [['Your kennel', ['kennel_name', 'breed', 'tagline', 'monogram', 'blurb', 'logo_photo_id']], ['Where families find you', ['town', 'region', 'contact_email', 'contact_phone', 'facebook_url', 'facebook_label', 'instagram_url']], ['Look', ['scheme', 'dark_mode']]],
  health: [['The result', ['test', 'result', 'date', 'verify_url']]],
  reviews: [['The review', ['quote', 'first_name', 'rating', 'town', 'puppy_name', 'home_month', 'topic', 'photo_id']], ['Shown', ['status']]],
  extras: [['The extra', ['kind', 'name', 'grp', 'description', 'photo_id']], ['Price and length', ['price_from', 'price_to', 'weeks']], ['What\u2019s included', ['lead_in', 'checklist', 'closing']]],
  products: [['The product', ['name', 'grp', 'description', 'photo_id', 'image_url']], ['Link and code', ['link_url', 'link_label', 'code', 'code_note']]],
  albums: [['The album', ['title', 'litter_id', 'litter', 'description', 'cover_photo_id']], ['Photos', ['photos', 'more_photos_url']]],
};
const SWITCHES_TITLE = { site: 'Prices', health: 'This result' };
// Two to a row: numbers, dates, choices, and one-line text of 80 characters or fewer.
const half = (f) => !f.ui && (['int', 'date', 'month', 'enum', 'dogid', 'dogref', 'litterid', 'litterref'].includes(f.type) || (f.type === 'text' && !f.multiline && (f.max ?? 999) <= 80));
const group = (title, inner, cls = '') => `<section class="fgroup${cls}"><h2>${esc(title)}</h2><div class="fgrid">${inner}</div></section>`;

// The web address goes last, folded away: most people never change it.
export function fields(list, values, ctx) {
  const draw = (n) => field(n, list[n], values?.[n], { ...ctx, values });
  const groups = GROUPS[ctx.kind];
  if (!groups) {
    const entries = Object.entries(list).sort(([a], [b]) => (a === 'slug') - (b === 'slug'));
    return entries.map(([n]) => draw(n)).join('\n');
  }
  const used = new Set(['slug']);
  const cell = (n) => { used.add(n); return `<div class="f${half(list[n]) ? ' half' : ''}">${draw(n)}</div>`; };
  const out = [];
  // A group with a test folds away unless the test holds (planned-litter wording on a
  // born litter, say); it opens with a tap either way.
  for (const [title, names, openIf] of groups) {
    const here = names.filter((n) => list[n] && list[n].type !== 'bool');
    if (!here.length) continue;
    const inner = here.map(cell).join('');
    out.push(openIf ? `<details class="fgroup fold"${openIf(values) ? ' open' : ''}><summary>${esc(title)}</summary><div class="fgrid">${inner}</div></details>` : group(title, inner));
  }
  const rest = Object.keys(list).filter((n) => !used.has(n) && list[n].type !== 'bool');
  if (rest.length) out.push(group('More', rest.map(cell).join('')));
  const bools = Object.keys(list).filter((n) => list[n].type === 'bool');
  if (bools.length) out.push(group(SWITCHES_TITLE[ctx.kind] ?? 'On your website', bools.map((n) => { used.add(n); return draw(n); }).join(''), ' switches'));
  if (list.slug) out.push(`<details class="fgroup advanced"><summary>Web address</summary><div class="fgrid">${draw('slug')}</div></details>`);
  return out.join('\n');
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
        if (f.item === 'enum') { out[n] = form.getAll(n).filter(Boolean); break; }
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

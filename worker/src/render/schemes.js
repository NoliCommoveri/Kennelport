// The colour schemes (plan 3.13, design direction section 7): each a palette in
// light and dark, a font pairing and an ornament. This list is the one source:
// worker/scripts/schemes.mjs writes public/_kp/t/ak/scheme-<id>.css from it, the
// page asks for its site's file, the ornament is drawn from it, and
// tests/schemes.test.js checks every palette's contrast and that each file is
// what this list makes. Colours are the scheme lab's (reference/scheme-lab.html),
// except where the contrast check needed a touch darker: the light labels (brass)
// of Lawn, Harbor, Heather and Clay, and Clay's light accent.

// Palette keys, in the order each palette string lists them.
export const KEYS = ['bg', 'surface', 'ink', 'muted', 'line', 'accent', 'accent-ink', 'brass', 'band', 'foot', 'foot-ink', 'foot-muted', 'ok', 'held'];
const pal = (s) => Object.fromEntries(s.trim().split(/\s+/).map((v, i) => [KEYS[i], v]));

// Each font file under public/_kp/fonts (Latin, from Google Fonts, SIL Open Font
// License beside it): [family, style, weight or range, file].
export const FACES = [
  ['Fraunces', 'normal', '100 900', 'fraunces-opsz-normal.woff2'],
  ['Fraunces', 'italic', '100 900', 'fraunces-opsz-italic.woff2'],
  ['Mulish', 'normal', '400', 'mulish-400.woff2'],
  ['Mulish', 'normal', '600', 'mulish-600.woff2'],
  ['Mulish', 'normal', '700', 'mulish-700.woff2'],
  ['Pinyon Script', 'normal', '400', 'pinyon-script-400.woff2'],
  ['Cormorant Garamond', 'normal', '600', 'cormorant-garamond-600.woff2'],
  ['Nunito Sans', 'normal', '400 700', 'nunito-sans-400-700.woff2'],
  ['Allura', 'normal', '400', 'allura-400.woff2'],
  ['Libre Caslon Display', 'normal', '400', 'libre-caslon-display-400.woff2'],
  ['Karla', 'normal', '400 700', 'karla-400-700.woff2'],
  ['Great Vibes', 'normal', '400', 'great-vibes-400.woff2'],
  ['Bitter', 'normal', '400 700', 'bitter-400-700.woff2'],
  ['Bitter', 'italic', '400 700', 'bitter-400-700-italic.woff2'],
  ['Source Sans 3', 'normal', '400 700', 'source-sans-3-400-700.woff2'],
  ['DM Serif Display', 'normal', '400', 'dm-serif-display-400.woff2'],
  ['DM Serif Display', 'italic', '400', 'dm-serif-display-400-italic.woff2'],
  ['Work Sans', 'normal', '400 700', 'work-sans-400-700.woff2'],
  ['Cormorant', 'normal', '400 700', 'cormorant-400-700.woff2'],
  ['Cinzel', 'normal', '400 700', 'cinzel-400-700.woff2'],
  ['Lato', 'normal', '400', 'lato-400.woff2'],
  ['Lato', 'normal', '700', 'lato-700.woff2'],
];

const SERIF = 'Georgia, "Times New Roman", serif';
const SANS = '"Segoe UI", system-ui, -apple-system, sans-serif';
const SCRIPT = '"Snell Roundhand", "Apple Chancery", cursive';

// The ornaments: the drawing inside the page heads' sprig symbol (viewBox 0 0 120 60).
const LEAVES = [[70, 26], [80, 21], [90, 16], [100, 11], [108, 8], [80, 36], [88, 32], [96, 27]];
export const ORNAMENTS = {
  botanical: '<g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M4 50 C 34 44, 64 32, 116 8"/><path d="M28 44 c-4-10 2-18 10-20 c2 9-3 17-10 20z"/><path d="M28 44 c10 4 18 0 22-7 c-9-3-17 0-22 7z"/><path d="M58 33 c-3-10 3-18 11-19 c1 9-4 16-11 19z"/><path d="M58 33 c10 3 18-1 21-9 c-9-2-17 1-21 9z"/><path d="M88 20 c-2-8 3-14 9-15 c1 7-3 12-9 15z"/><path d="M88 20 c8 2 14-2 16-8 c-7-1-13 2-16 8z"/></g>',
  rope: '<g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M6 32 q7 -9 14 0 t14 0 t14 0 t14 0 t14 0 t14 0 t14 0"/><path d="M6 28 q7 9 14 0 t14 0 t14 0 t14 0 t14 0 t14 0 t14 0"/><circle cx="114" cy="30" r="3"/></g>',
  lavender: `<g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M14 56 C 34 44, 60 26, 112 6"/><path d="M40 56 C 56 46, 74 36, 104 22"/>${LEAVES.map(([x, y]) => `<path d="M${x} ${y} l-3 -5 M${x} ${y} l5 -2"/>`).join('')}</g>`,
  fence: '<g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 56 V18 l4 -6 l4 6 V56"/><path d="M52 56 V18 l4 -6 l4 6 V56"/><path d="M92 56 V18 l4 -6 l4 6 V56"/><path d="M2 28 H118 M2 44 H118"/></g>',
  fleur: '<g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 36 H44"/><path d="M76 36 H116"/><circle cx="48" cy="36" r="1.5"/><circle cx="72" cy="36" r="1.5"/><path d="M60 16 C 55 22, 55 29, 60 35 C 65 29, 65 22, 60 16 Z"/><path d="M59 31 C 53 26, 47 30, 50 35 C 52 38, 56 36, 55 33"/><path d="M61 31 C 67 26, 73 30, 70 35 C 68 38, 64 36, 65 33"/><path d="M54 38 H66"/><path d="M60 38 V45"/></g>',
  mountain: '<g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M2 54 L28 24 L38 34 L58 10 L80 38 L92 28 L118 54"/><path d="M52 18 l6 -8 l6 9"/><circle cx="100" cy="12" r="5"/></g>',
  none: '',
};

// display / body / script: family names (FACES); script null means the display
// face's italic stands in. weight: headings' weight. darkFirst: dark unless the
// breeder chose Light only.
export const SCHEMES = [
  { id: 'lawn', name: 'Lawn', display: 'Fraunces', body: 'Mulish', script: 'Pinyon Script', weight: 500, scriptSize: '1.25em', ornament: 'botanical', radius: '3px',
    light: pal('#F5F2EA #FFFDF8 #1E1D1A #625C51 #DED7C8 #34523C #FFFFFF #7E632A #ECE6D8 #1B1A18 #E9E4D8 #A39D90 #3E7A4B #8A5A1E'),
    dark: pal('#141412 #1D1C19 #ECE7DC #A9A294 #35332D #8FB998 #0F1A12 #CFAE66 #1A1916 #0C0C0B #E9E4D8 #8F897D #86C495 #E0A65A') },
  { id: 'harbor', name: 'Harbor', display: 'Cormorant Garamond', body: 'Nunito Sans', script: 'Allura', weight: 600, scriptSize: '1.35em', ornament: 'rope', radius: '3px',
    light: pal('#E8F1F5 #F8FCFD #13263A #4B5F71 #C6DAE3 #1F5F86 #FFFFFF #825F31 #D7E7EE #0F2233 #E3EEF4 #93A9B8 #2E7552 #8E5B1C'),
    dark: pal('#0D1B28 #13253A #E4EEF5 #9DB2C2 #24394E #7FC1E6 #08202F #D9B47E #102133 #081320 #E4EEF5 #7F95A6 #7FD0A2 #E7AE64') },
  { id: 'heather', name: 'Heather', display: 'Libre Caslon Display', body: 'Karla', script: 'Great Vibes', weight: 400, scriptSize: '1.3em', ornament: 'lavender', radius: '3px',
    light: pal('#EFECF1 #FBFAFC #26222B #5F5868 #DBD4DF #6B3A6E #FFFFFF #4B4496 #E5DFE9 #221C27 #ECE6F0 #A397AA #3F7A4C #8A5A1E'),
    dark: pal('#17131B #211B26 #EEE8F2 #ACA2B3 #372E3D #D29BD6 #24102A #B7A9EA #1C1621 #0E0B11 #EEE8F2 #8C8293 #8BC79A #E3A962') },
  { id: 'clay', name: 'Clay', display: 'Bitter', body: 'Source Sans 3', script: null, weight: 600, scriptSize: '1em', ornament: 'fence', radius: '2px',
    light: pal('#F2E9DC #FCF7F0 #3A2717 #6B533F #DFD0BB #A2462A #FFFFFF #726029 #EADDCB #2B1D12 #F1E6D6 #AE9A84 #4A7A3E #8A4B1A'),
    dark: pal('#1C140E #261B13 #F1E6D6 #B8A48E #3B2C20 #E08A5E #2A140A #D6BE7A #21170F #120C08 #F1E6D6 #9A8670 #8FC27F #E6A15E') },
  { id: 'slate', name: 'Slate', display: 'DM Serif Display', body: 'Work Sans', script: null, weight: 400, scriptSize: '1em', ornament: 'none', radius: '0px',
    light: pal('#FFFFFF #F6F7F9 #1E2329 #57616C #DFE3E8 #3A5F82 #FFFFFF #4E6882 #F1F3F6 #1E2329 #EEF1F4 #9AA4AF #2F7550 #8E5B1C'),
    dark: pal('#16191D #1F2328 #F1F3F5 #A3ACB6 #343A42 #A9C4DE #12202D #A9C4DE #1B1F23 #0E1012 #F1F3F5 #8A939D #84C9A1 #E3A962') },
  { id: 'midnight', name: 'Midnight', display: 'Cormorant', body: 'Mulish', script: 'Pinyon Script', weight: 600, scriptSize: '1.3em', ornament: 'mountain', radius: '3px', darkFirst: true, oldstyle: true,
    light: pal('#F4EEDF #FCF8EE #1C2437 #545A68 #DED5BF #7A5B17 #FFFFFF #7A5B17 #EBE3CF #151B2A #F1E9D6 #A49C88 #3E7A4B #8A5A1E'),
    dark: pal('#15171B #1E2126 #F1E9D6 #ADA796 #343630 #D9B45A #1A1406 #D9B45A #1A1C20 #0C0D10 #F1E9D6 #8E8878 #8CC79A #E6AE62') },
  { id: 'tuxedo', name: 'Tuxedo', display: 'Cinzel', body: 'Lato', script: 'Pinyon Script', weight: 500, scriptSize: '1.3em', ornament: 'fleur', radius: '2px',
    light: pal('#F7F6F3 #FFFFFF #141414 #5A5A58 #D8D7D3 #1C1C1C #FFFFFF #6A6A66 #EDECE8 #111111 #EDEDEA #A3A3A0 #2F6E45 #8A5A1E'),
    dark: pal('#121212 #1C1C1C #EEEEEC #A7A7A3 #343432 #E6E6E3 #121212 #BDBDB8 #171717 #0A0A0A #EEEEEC #8E8E8A #84C49A #E3A962') },
];
export const SCHEME_IDS = SCHEMES.map((s) => s.id); // the same as content/model.js's
export const schemeOf = (id) => SCHEMES.find((s) => s.id === id) ?? SCHEMES[0];

// The file a scheme's page reads, and the font it preloads (its headings').
export const schemeFile = (id) => `scheme-${schemeOf(id).id}.css`;
export const preloadFont = (id) => FACES.find(([f, style]) => f === schemeOf(id).display && style === 'normal')[3];

const SHADOW = { light: '0 1px 2px rgba(20,20,30,.06), 0 8px 24px rgba(20,20,30,.08)', dark: '0 1px 2px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.35)' };
// Brands' logos are drawn for light backgrounds: in dark, each sits on a light panel.
const LOGO = { light: '--logo-panel: transparent; --logo-pad: 0px;', dark: '--logo-panel: #F5F2EA; --logo-pad: 10px;' };
const vars = (p, mode) => `${KEYS.map((k) => `--${k}: ${p[k]};`).join(' ')} --shadow: ${SHADOW[mode]}; ${LOGO[mode]} color-scheme: ${mode};`;

// The CSS for one scheme: its fonts, then its palette. Auto follows the visitor's
// device; Light only puts data-theme="light" on the page. Dark-first shows dark
// unless the page says light.
export function schemeCss(id) {
  const s = schemeOf(id);
  const families = [s.display, s.body, s.script].filter(Boolean);
  // Every face of the three families: the display face's italic serves the script
  // line where a scheme has no script font, and italic headings anywhere.
  const faces = FACES.filter(([f]) => families.includes(f))
    .map(([f, style, w, file]) => `@font-face { font-family: "${f}"; src: url("/_kp/fonts/${file}") format("woff2"); font-weight: ${w}; font-style: ${style}; font-display: swap; }`);
  const type = `--f-display: "${s.display}", ${SERIF}; --f-body: "${s.body}", ${SANS}; --f-script: ${s.script ? `"${s.script}", ${SCRIPT}` : `"${s.display}", ${SERIF}`}; --display-w: ${s.weight}; --script-style: ${s.script ? 'normal' : 'italic'}; --script-size: ${s.scriptSize}; --r: ${s.radius};`;
  const palette = s.darkFirst
    ? [`:root { ${type} ${vars(s.dark, 'dark')} }`, `:root[data-theme="light"] { ${vars(s.light, 'light')} }`]
    : [`:root { ${type} ${vars(s.light, 'light')} }`,
      `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ${vars(s.dark, 'dark')} } }`,
      `:root[data-theme="dark"] { ${vars(s.dark, 'dark')} }`];
  const extra = [
    ...(s.oldstyle ? ['h1, h2, h3 { font-variant-numeric: oldstyle-nums; }'] : []),
    ...(s.ornament === 'none' ? ['.sprig { display: none; }'] : []),
  ];
  return `/* Scheme ${s.name}: written by worker/scripts/schemes.mjs from src/render/schemes.js. Don't edit by hand. */\n${[...faces, ...palette, ...extra].join('\n')}\n`;
}

// WCAG contrast of two #RRGGBB colours.
export function contrast(a, b) {
  const lum = (hex) => {
    const [r, g, b2] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b2;
  };
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

// The text-on-ground pairs the template draws, each needing 4.5:1 (normal text).
export const TEXT_PAIRS = [
  ['ink', 'bg'], ['ink', 'surface'], ['ink', 'band'],
  ['muted', 'bg'], ['muted', 'surface'], ['muted', 'band'],
  ['accent', 'bg'], ['accent', 'surface'], ['accent', 'band'], ['accent-ink', 'accent'],
  ['brass', 'bg'], ['brass', 'surface'], ['brass', 'band'],
  ['ok', 'surface'], ['held', 'surface'],
  ['foot-ink', 'foot'], ['foot-muted', 'foot'],
];

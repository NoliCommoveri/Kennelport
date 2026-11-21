// The family portal's looks (the owner, 2026-11-21): each breeder picks one in her portal
// settings (portal_settings.look, migration 0042). Classic is the portal as built from
// portal-prototype.html; the others are the owner's mockups (docs/reference/portal-looks.html).
// A look other than Classic is stylesheets in public/_kp/f/looks/ over portal.css (`css`,
// in order: mockup.css, what the mockup looks share, then the look's own), plus the art
// beside them; the pages carry data-look on <body> and a few hooks for it (the heading
// icons, pg-<page> on <body>, the vet card and vet row on Home). To add a look: its entry
// here, its .css there (start from looks/cream.css); the settings screen lists `name`
// and `about`.
// Classic follows the phone's light or dark mode; the mockup looks are light only, as drawn.
export const LOOKS = Object.freeze({
  classic: { name: 'Classic', about: 'Tiles and bands of paper, green and sand. Follows the phone\'s light or dark setting.', css: [] },
  forest: { name: 'Forest', about: 'Deep green cards with cream panels inside, and gold.', css: ['mockup', 'forest'] },
  cream: { name: 'Cream', about: 'Cream cards on deep green, with soft green waves.', css: ['mockup', 'cream'] },
});

// A stored look, or Classic for none or one this list doesn't know.
export const lookOf = (s) => (Object.hasOwn(LOOKS, s?.look ?? '') ? s.look : 'classic');

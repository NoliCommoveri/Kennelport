// Family Home, in the owner's build tools (GET/POST /admin/<sub>/portalhome, routed by
// manage/builder.js; only on a site with the family portal): the order of the family
// portal Home's sections, and for each card whether it shows always, only once the puppy
// is home, or never, and until how many days after pickup (portal/home.js,
// docs/plans/site-builder.md step 6). The portal reads the build live, so a save here
// leaves nothing to publish.
//
// There's no prototype screen for this: it's built from the builder's own pieces (cards,
// the movable rows, selects, the inline number rows, changed and Back to today's), as
// Forms and Timing are. It works without script: every button saves the screen with what
// it does (move a section, back to today's Home). The owner's own screen, so its words
// stay here, not in manage/wording.js.
import { escapeHtml as esc } from '../../lib/html.js';
import {
  HOME_SECTIONS, SECTION_NAMES, HOME_CARDS, CARD_NAMES, CARD_SECTION, SHOW, UNTIL_MAX,
  portalHomeFor, portalHomeFromForm, withPortalHome, moveSection,
} from '../../portal/home.js';
import { mvBtns, select } from './controls.js';

const changed = (c) => c.show !== 'always' || c.until !== null;

// The checklist and the payments band only show before pickup, so an end after
// pickup means nothing for them: they get Show alone.
const NO_UNTIL = new Set(['checklist', 'status']);

function cardRow(k, c) {
  return `<div class="fgrid" id="c-${k}">${HOME_CARDS.filter((x) => CARD_SECTION[x] === CARD_SECTION[k]).length > 1 ? `<p class="small"><b>${esc(CARD_NAMES[k])}</b>${changed(c) ? ' <span class="chg">changed</span>' : ''}</p>` : changed(c) ? '<p class="small"><span class="chg">changed</span></p>' : ''}
    ${select(`card.${k}.show`, c.show, SHOW, 'Show')}
    ${NO_UNTIL.has(k) ? `<input type="hidden" name="card.${k}.until" value="${c.until ?? ''}">` : `<label class="half">Until, in days after pickup<input type="number" inputmode="numeric" min="1" max="${UNTIL_MAX}" name="card.${k}.until" value="${c.until ?? ''}" placeholder="No end"></label>`}</div>`;
}

export function portalHomeScreen(home, error = null) {
  const n = home.order.length;
  const rows = home.order.map((k, i) => {
    const cards = HOME_CARDS.filter((x) => CARD_SECTION[x] === k);
    const moved = k !== HOME_SECTIONS[i];
    return `<li class="mvr item" id="s-${k}">${mvBtns(`mv:${k}`, i, n)}<span class="ttl">${esc(SECTION_NAMES[k])}${moved ? ' <span class="chg">moved</span>' : ''}
      ${k === 'stage' ? '<small>Always shows: it carries the vet visit, which follows her contract.</small>' : cards.map((x) => cardRow(x, home.cards[x])).join('')}</span><span></span></li>`;
  }).join('');
  const same = !home.custom && !HOME_CARDS.some((k) => changed(home.cards[k]));
  return `<div class="stack">${error ? `<p class="error" role="alert">${esc(error)}</p>` : ''}
    <section class="card"><div class="fgroup"><div class="between"><h2>Home's sections</h2>${same ? '<span class="spill plain">As today</span>' : '<button class="link small" name="act" value="today">Back to today\'s Home</button>'}</div>
      <p class="small muted">Top to bottom, between the photo and tiles (always first) and Quick links (always last). Each section still follows its own rules first; these only narrow them. A card set to only once home, or with an end, shows from the day the puppy is picked up. Until 14 shows on pickup day and the 13 days after; blank has no end.</p>
      <input type="hidden" name="home.order" value="${esc(home.order.join(','))}">
      <ul class="mvl">${rows}</ul></div></section></div>`;
}

// The screen's form into the next build: what was pressed (a move, back to today's)
// done on the values as sent. Throws HomeError on a bad until.
export function portalHomeNext(build, get) {
  const act = String(get('act') ?? '');
  if (act === 'today') return { build: withPortalHome(build, { order: [...HOME_SECTIONS], cards: {} }), at: '' };
  const input = portalHomeFromForm(get);
  const m = act.match(/^mv:([a-z]+):(up|down)$/);
  if (m) input.order = moveSection(portalHomeFor({ portal_home: { order: input.order } }).order, m[1], m[2]);
  return { build: withPortalHome(build, input), at: m ? `#s-${m[1]}` : '' };
}

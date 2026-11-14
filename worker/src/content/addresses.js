// Page addresses (docs/plans/site-builder.md, "Page addresses", step 3.5): the
// breeder renames a page's address beside its menu name, and the old one redirects
// (publish.js writes the redirect, site.js answers it).
//
// - Her address is kept in site_pages.path (migration 0035); null is the page's
//   starting address: the code's (model.js PAGES) or, for a page the owner added,
//   the owner's in the build.
// - Fixed, because other systems link to them: /waitlist, /waitlist/help, /privacy
//   (and /family-login, which isn't a page here). Their menu names still change.
// - No page takes the system's own first parts, or any page of the code's starting
//   address, so an old address always stays free to redirect. An address is one
//   part (/our-story), so nothing under /dogs/, /litters/ or /albums/ can be taken.
// - Each page's address is its own: renaming /litters leaves /litters/older, and
//   the profiles under /dogs/ and /litters/, where they are.
// - A page the owner removes isn't redirected: it answers "not found".
//
// The errors are her words in manage/wording.js ERRORS (address, address_kept,
// address_used); the words here are the ones it matches.
import { PAGES, slugify, ContentError } from './model.js';

export const FIXED_ADDRESS = new Set(['waitlist', 'waitlist_help', 'privacy']);
// The same list a page the owner adds has always been checked against, so no page
// already on a site stops being valid. sitemap.xml and robots.txt can't be one part.
const SYSTEM = ['family', 'family-login', 'privacy', 'ops', 'health', 'v1', 'admin', 'api', 'apply', 'list', 's', 'f'];
// First parts of an address no page of hers can take.
export const TAKEN = new Set([...SYSTEM, ...Object.values(PAGES).map((p) => p.path.split('/')[1])]);
export const PATH = /^\/[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/;
export const pathFor = (name) => `/${slugify(name) || 'page'}`;

// Whether the breeder may rename a page's address: every page of the code's but
// the fixed ones, and every page the owner added.
export const canRename = (key, custom = false) => (PAGES[key] ? !FIXED_ADDRESS.has(key) : Boolean(custom));

// An address as she typed it: "Our story", "our-story" and "/our-story/" are all
// /our-story. Empty is null (the page's starting address).
export function typedAddress(text) {
  const t = String(text ?? '').trim().toLowerCase().replace(/^\/+|\/+$/g, '');
  if (!t) return null;
  return t.includes('/') ? `/${t}` : `/${slugify(t)}`;
}

// A free address of hers, or no address at all: whether `at` may be a page's.
export const freeAddress = (at) => PATH.test(at ?? '') && !TAKEN.has(at.slice(1));

// The address she typed for a page, checked: null for its starting address, else
// the address. `start` is the page's starting address; `others`, every address
// another page has now (their starting ones included).
export function checkAddress(typed, { start, others }) {
  const at = typedAddress(typed);
  if (!at || at === start) return null;
  if (!PATH.test(at)) throw new ContentError('path', 'an address is one word or a few joined by hyphens, like /our-story');
  if (TAKEN.has(at.slice(1))) throw new ContentError('path', `${at} is kept for a page of the site's own`);
  if (others.has(at)) throw new ContentError('path', `another page has ${at}`);
  return at;
}

// Every page's address for a snapshot: starting addresses first, then hers where
// each is free and not another's (one imported or typed before a page took it
// keeps the starting one). pages: { key: { path? } }, custom: the owner's pages.
// Sets pages[key].path on the pages she renamed.
export function settleAddresses(pages, custom, hers) {
  const used = new Set([...Object.values(PAGES).map((p) => p.path), ...custom.map((c) => c.path)]);
  const keys = [...Object.keys(PAGES).filter((k) => canRename(k)), ...custom.map((c) => c.id)];
  for (const key of keys) {
    const at = hers[key];
    if (!pages[key] || !at || !freeAddress(at) || used.has(at)) continue;
    pages[key].path = at;
    used.add(at);
  }
  return pages;
}

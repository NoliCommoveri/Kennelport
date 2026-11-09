// Where each photo shows on her site (docs/plans/site-builder.md, decision 20, "Photos:
// one library"): the rows of the photo library window and, later, the Photos screen.
// Worked out from what is saved, shown or not (a hidden dog's photo is still that
// dog's), so the rows are always right and need no tagging. Named the way she'd say
// it: where a photo shows, never what kind of record it belongs to.
//
//   Page photos:    "Home: banner", "Our story", "Contact: Photo", "Album: Spring", …,
//                   and last, Not used anywhere (so no photo is ever out of reach).
//   Profile photos: "Ziva's profile", "Clover × Duke litter", "Pip's profile (…)":
//                   a profile's own photo and the photos set to show on it (tags).
import { PAGES } from './content/model.js';
import { pageBlocks, customPages, BUILT_PAGES } from './content/blocks.js';
import { loadBuild } from './content/rules.js';

const json = (s, d) => { try { return s ? JSON.parse(s) : d; } catch { return d; } };
// The owner's blocks that hold photos, and what each row calls them.
const PHOTO_BLOCKS = ['photo', 'overlay', 'beside', 'collage', 'gallery'];

export async function photoPlaces(env, siteId, say) {
  const all = (sql) => env.DB.prepare(sql).bind(siteId).all().then((r) => r.results);
  const [live, site, homeRows, pageRows, switches, albums, dogs, litters, puppies, products, extras, partners, reviews, embeds, tags] = await Promise.all([
    all('SELECT id FROM photos WHERE site_id = ? AND removed_at IS NULL ORDER BY created_at DESC'),
    env.DB.prepare('SELECT logo_photo_id FROM sites WHERE id = ?').bind(siteId).first(),
    all('SELECT block, content FROM home_blocks WHERE site_id = ?'),
    all('SELECT page, menu_label, content FROM site_pages WHERE site_id = ?'),
    all('SELECT page, block, content FROM block_switches WHERE site_id = ?'),
    all('SELECT title, cover_photo_id, photos FROM albums WHERE site_id = ? ORDER BY sort, title'),
    all('SELECT id, call_name, photo_id FROM dogs WHERE site_id = ? ORDER BY sort, rowid'),
    all('SELECT id, name FROM litters WHERE site_id = ? ORDER BY sort, rowid'),
    all('SELECT p.id, p.name, p.photo_id, l.name AS litter FROM puppies p JOIN litters l ON l.id = p.litter_id WHERE p.site_id = ? ORDER BY l.sort, l.rowid, p.sort, p.rowid'),
    all('SELECT photo_id FROM products WHERE site_id = ? ORDER BY sort'),
    all('SELECT photo_id FROM extras WHERE site_id = ? ORDER BY sort'),
    all('SELECT photo_id FROM partner_kennels WHERE site_id = ? ORDER BY sort'),
    all("SELECT photo_id FROM stories WHERE site_id = ? AND kind = 'review' ORDER BY sort"),
    all('SELECT preview_photo_id FROM embeds WHERE site_id = ? ORDER BY place, sort'),
    all('SELECT photo_id, subject FROM photo_tags WHERE site_id = ?'),
  ]);
  const isLive = new Set(live.map((p) => p.id));
  const rows = { page: new Map(), profile: new Map() };
  const put = (tab, label, ids) => {
    const keep = ids.filter((id) => id && isLive.has(id));
    if (!keep.length) return;
    const row = rows[tab].get(label) ?? [];
    for (const id of keep) if (!row.includes(id)) row.push(id);
    rows[tab].set(label, row);
  };

  // Home's own blocks, then Our story's photo.
  const home = Object.fromEntries(homeRows.map((r) => [r.block, json(r.content, {})]));
  put('page', say('library.home_banner'), [home.hero?.banner_photo_id]);
  put('page', say('library.home_collage'), home.hero?.photos ?? []);
  put('page', say('library.home_story'), [home.story?.photo_id]);
  const pages = Object.fromEntries(pageRows.map((r) => [r.page, { ...json(r.content, {}), menu_label: r.menu_label }]));
  const build = await loadBuild(env, siteId);
  const custom = customPages(build);
  const pageName = (key) => (key === 'home' ? say('library.home') : pages[key]?.menu_label || PAGES[key]?.label || custom.find((c) => c.id === key)?.name || key);
  put('page', pageName('about'), [pages.about?.photo_id]);

  // The owner's photo blocks on every page: the owner's photos and hers (block_switches).
  const hers = new Map(switches.map((r) => [`${r.page}/${r.block}`, json(r.content, {})]));
  for (const key of [...BUILT_PAGES, ...custom.map((c) => c.id)]) {
    for (const b of pageBlocks(build, key)) {
      if (!PHOTO_BLOCKS.includes(b.type)) continue;
      const her = hers.get(`${key}/${b.id}`) ?? {};
      // A gallery strip from an album is that album's row; picked photos are its own.
      const ids = b.type === 'collage' || b.type === 'gallery' ? [...(b.type === 'gallery' && b.source === 'album' ? [] : b.photos), ...(b.mayChange ? her.photos ?? [] : [])] : [b.photo, b.mayChange ? her.photo_id : null];
      put('page', say('library.on_page', { page: pageName(key), block: say(`library.block.${b.type}`) }), ids);
    }
  }

  put('page', say('library.logo'), [site?.logo_photo_id]);
  put('page', say('library.products'), products.map((x) => x.photo_id));
  put('page', say('library.extras'), extras.map((x) => x.photo_id));
  put('page', say('library.partners'), partners.map((x) => x.photo_id));
  put('page', say('library.reviews'), reviews.map((x) => x.photo_id));
  put('page', say('library.embeds'), embeds.map((x) => x.preview_photo_id));
  for (const a of albums) put('page', say('library.album', { name: a.title }), [a.cover_photo_id, ...json(a.photos, [])]);

  // Profiles: a dog's, litter's or puppy's own photo, and those set to show on it.
  const tagged = new Map();
  for (const t of tags) tagged.set(t.subject, [...(tagged.get(t.subject) ?? []), t.photo_id]);
  for (const d of dogs) put('profile', say('library.dog', { name: d.call_name }), [d.photo_id, ...(tagged.get(`dog:${d.id}`) ?? [])]);
  for (const l of litters) put('profile', say('library.litter', { name: l.name }), tagged.get(`litter:${l.id}`) ?? []);
  for (const p of puppies) put('profile', say('library.puppy', { name: p.name, litter: p.litter }), [p.photo_id, ...(tagged.get(`puppy:${p.id}`) ?? [])]);

  const used = new Set([...rows.page.values(), ...rows.profile.values()].flat());
  const out = (tab) => [...rows[tab]].map(([label, ids]) => ({ label, ids }));
  const unused = live.map((p) => p.id).filter((id) => !used.has(id));
  return { page: [...out('page'), ...(unused.length ? [{ label: say('library.not_used'), ids: unused, unused: true }] : [])], profile: out('profile') };
}

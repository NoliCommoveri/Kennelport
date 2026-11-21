// The go-home bag (docs/plans/portal-go-home-bag.md; family-portal.md 8.4): her bag
// template on the Portal tab (portal/admin/bag.js), what each puppy went home with
// (Sent home with, on the family's screen), and What came home in Opal's bag on the
// family's Records (portal/family.js). KennelOS can send her template (bundle
// section bag_items, kennelos/bundle.js), and what went home goes back to it in the
// feed's facts (feed.js factsFor).
//
// A placement reads her template, ticked, until its bag becomes its own: when she
// saves Sent home with, or when the puppy is picked up (markPickedUp, and the hourly
// job for a pickup that arrived another way). From then each item is kept as it was
// when it went (name, cost, expense, program, button), so a later change to the
// template never rewrites what a family was sent or her figures. None of this is
// ever said in copy: her screen shows what went, the family's what came home.
//
// Costs are whole cents, hers alone: families never see a cost, an item's origin
// or whether she expenses it.
import { PortalError } from './store.js';

export const MAX_ITEMS = 60;
export const MAX_NAME = 80;
export const MAX_ORIGIN = 120;
export const MAX_BUTTON = 30;
export const MAX_COST_CENTS = 1000000; // $10,000

const now = () => new Date().toISOString();
const text = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

// "12.50", "$12", "12" → 1250, 1200, 1200; blank → 0. Anything else: an error key.
export function parseCost(v) {
  const s = String(v ?? '').replace(/[\s,]/g, '').replace(/^\$/, '');
  if (!s) return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw new PortalError('bag.cost_bad');
  const [whole, part = ''] = s.split('.');
  const cents = Number(whole) * 100 + Number(part.padEnd(2, '0'));
  if (cents > MAX_COST_CENTS) throw new PortalError('bag.cost_big');
  return cents;
}

// 1250 → "$12.50", 1200 → "$12".
export const money = (cents) => {
  const c = Math.max(0, Math.round(Number(cents) || 0));
  return `$${Math.floor(c / 100).toLocaleString('en-US')}${c % 100 ? `.${String(c % 100).padStart(2, '0')}` : ''}`;
};
// For KennelOS: dollars and cents as a number (12.5).
export const dollars = (cents) => Math.round(Number(cents) || 0) / 100;

// The button words she starts with for a program, by its type (decision 4). The words
// are hers (wording group bag), so this names the key.
export const suggestedButtonKey = (type) => ({ food: 'bag.button_food', insurance: 'bag.button_insurance', registration: 'bag.button_registration' })[type] ?? 'bag.button_other';

// ---------- her template ----------

export async function bagTemplate(env, siteId) {
  const { results } = await env.DB.prepare(`SELECT b.*, p.name AS product_name, p.portal_type, p.portal_show
    FROM portal_bag_items b LEFT JOIN products p ON p.id = b.product_id AND p.site_id = b.site_id
    WHERE b.site_id = ? ORDER BY b.sort, b.created_at`).bind(siteId).all();
  return results;
}

// In the bag for a family whose bag isn't their own yet: on, and still sent by KennelOS.
export const inTemplate = (x) => Boolean(x.shown) && !x.hidden_by_kennelos;

export async function getBagItem(env, siteId, id) {
  return env.DB.prepare('SELECT * FROM portal_bag_items WHERE id = ? AND site_id = ?').bind(id, siteId).first();
}

// Her programs an item can be tied to: every program she has, by name.
export async function bagPrograms(env, siteId) {
  const { results } = await env.DB.prepare('SELECT id, name, portal_type, portal_show FROM products WHERE site_id = ? ORDER BY sort, name').bind(siteId).all();
  return results;
}

// input: { name, cost, expense, origin, product_id, button, shown }. say: for the
// button words she starts with when she ties an item to a program.
// An item from KennelOS: its name, cost, expense, origin and program are KennelOS's
// (OWNED.bag_items), so only her switch and her button words change here.
export async function saveBagItem(env, siteId, id, input, say) {
  const cur = id ? await getBagItem(env, siteId, id) : null;
  if (id && !cur) throw new PortalError('bag.gone');
  const fromKos = cur?.source === 'kennelos';
  const shown = input.shown ? 1 : 0;
  const t = now();
  let product = null;
  const productId = fromKos ? cur.product_id : String(input.product_id ?? '');
  if (productId) {
    product = await env.DB.prepare('SELECT id, portal_type FROM products WHERE id = ? AND site_id = ?').bind(productId, siteId).first();
    if (!product && !fromKos) throw new PortalError('bag.program_gone');
  }
  // Tied to a program just now, with no words of hers: the words for its type.
  let button = text(input.button, MAX_BUTTON) || null;
  if (!button && product && product.id !== cur?.product_id) button = say(suggestedButtonKey(product.portal_type));
  if (fromKos) {
    await env.DB.prepare('UPDATE portal_bag_items SET shown = ?, button = ?, updated_at = ? WHERE id = ? AND site_id = ?').bind(shown, button, t, id, siteId).run();
    return id;
  }
  const name = text(input.name, MAX_NAME);
  if (!name) throw new PortalError('bag.need_name');
  const cost = parseCost(input.cost);
  // Expense it: yes with a cost unless she unticks it (her form says it has the
  // switch: an unticked box sends nothing); at no cost there's nothing to expense.
  const expense = cost > 0 && (input.expense_set ? Boolean(input.expense) : true) ? 1 : 0;
  const origin = text(input.origin, MAX_ORIGIN) || null;
  if (cur) {
    await env.DB.prepare(`UPDATE portal_bag_items SET name = ?, cost_cents = ?, expense = ?, origin = ?, product_id = ?, button = ?, shown = ?, updated_at = ?
      WHERE id = ? AND site_id = ?`).bind(name, cost, expense, origin, product?.id ?? null, button, shown, t, id, siteId).run();
    return id;
  }
  const count = await env.DB.prepare('SELECT COUNT(*) AS n, COALESCE(MAX(sort), -1) + 1 AS next FROM portal_bag_items WHERE site_id = ?').bind(siteId).first();
  if (count.n >= MAX_ITEMS) throw new PortalError('bag.too_many');
  const newId = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO portal_bag_items (id, site_id, name, cost_cents, expense, origin, product_id, button, shown, sort, source, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'kennelport', ?, ?)`).bind(newId, siteId, name, cost, expense, origin, product?.id ?? null, button, shown, count.next, t, t).run();
  return newId;
}

// What went home with families stays as it went (decision 2): only the template row goes.
export async function removeBagItem(env, siteId, id) {
  const cur = await getBagItem(env, siteId, id);
  if (!cur) return;
  if (cur.source === 'kennelos') throw new PortalError('bag.kennelos_remove');
  await env.DB.prepare('DELETE FROM portal_bag_items WHERE id = ? AND site_id = ?').bind(id, siteId).run();
}

export async function moveBagItem(env, siteId, id, dir) {
  const list = await bagTemplate(env, siteId);
  const i = list.findIndex((x) => x.id === id);
  const j = dir === 'up' ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await env.DB.batch(list.map((x, n) => env.DB.prepare('UPDATE portal_bag_items SET sort = ? WHERE id = ? AND site_id = ?').bind(n, x.id, siteId)));
}

// ---------- one puppy's bag ----------

// What a placement went home with: { own: true, items } once its bag is its own;
// else { own: false, items: her template as it would go }. Each item:
// { id, bag_item_id, name, cost_cents, expense, product_id, button }.
export async function bagFor(env, siteId, p) {
  if (p.bag_saved_at) {
    const { results } = await env.DB.prepare('SELECT * FROM portal_placement_bag WHERE placement_id = ? AND site_id = ? ORDER BY sort').bind(p.id, siteId).all();
    return { own: true, items: results };
  }
  const items = (await bagTemplate(env, siteId)).filter(inTemplate).map((x) => ({
    id: null, bag_item_id: x.id, name: x.name, cost_cents: x.cost_cents, expense: x.expense, product_id: x.product_id, button: x.button,
  }));
  return { own: false, items };
}

export const totals = (items) => ({
  n: items.length,
  cost: items.reduce((a, x) => a + (x.cost_cents || 0), 0),
  expensed: items.reduce((a, x) => a + (x.expense ? x.cost_cents || 0 : 0), 0),
});

const rowStatements = (env, siteId, placementId, items) => [
  env.DB.prepare('DELETE FROM portal_placement_bag WHERE placement_id = ? AND site_id = ?').bind(placementId, siteId),
  ...items.map((x, i) => env.DB.prepare(`INSERT INTO portal_placement_bag (id, site_id, placement_id, bag_item_id, name, cost_cents, expense, product_id, button, sort)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(crypto.randomUUID(), siteId, placementId, x.bag_item_id ?? null, x.name, x.cost_cents || 0, x.expense ? 1 : 0, x.product_id ?? null, x.button ?? null, i)),
];

const itemsWord = (n) => `${n} item${n === 1 ? '' : 's'}`;
const historyStatement = (env, siteId, placementId, from, to, by, t) => env.DB.prepare(`INSERT INTO portal_history (site_id, tbl, row_id, field, old_value, new_value, changed_at, changed_by)
  VALUES (?, 'portal_placements', ?, 'bag', ?, ?, ?, ?)`).bind(siteId, placementId, from, to, t, by);

// Her Sent home with: input is the form, with
//   item.<template id> (ticked), expense.<template id> (expensed for this family);
//   sent.<row id> and sentexpense.<row id> for what's on an already-saved bag (its
//   own rows, which keep their names and costs, hers for this family alone among them);
//   add: a new one for this family alone.
// Returns the items saved.
export async function saveBag(env, siteId, p, form) {
  const has = (k) => form.has(k);
  const cur = await bagFor(env, siteId, p);
  const template = (await bagTemplate(env, siteId)).filter(inTemplate);
  const items = [];
  const kept = new Set();
  // What's on the bag now (its own rows, or the template), as it was.
  for (const x of cur.items) {
    const key = x.id ? `sent.${x.id}` : x.bag_item_id ? `item.${x.bag_item_id}` : null;
    if (!key || !has(key)) continue;
    if (x.bag_item_id) kept.add(x.bag_item_id);
    const exp = x.id ? `sentexpense.${x.id}` : `expense.${x.bag_item_id}`;
    items.push({ ...x, expense: x.cost_cents > 0 && has(exp) ? 1 : 0 });
  }
  // Template items not on a saved bag yet (added to her bag since), if ticked.
  if (cur.own) {
    for (const x of template) {
      if (kept.has(x.id) || cur.items.some((r) => r.bag_item_id === x.id) || !has(`item.${x.id}`)) continue;
      items.push({ bag_item_id: x.id, name: x.name, cost_cents: x.cost_cents, expense: x.cost_cents > 0 && has(`expense.${x.id}`) ? 1 : 0, product_id: x.product_id, button: x.button });
    }
  }
  const add = text(form.get('add'), MAX_NAME);
  if (add) items.push({ bag_item_id: null, name: add, cost_cents: 0, expense: 0, product_id: null, button: null });
  if (items.length > MAX_ITEMS) throw new PortalError('bag.too_many');
  const t = now();
  const before = cur.own ? totals(cur.items).n : null;
  await env.DB.batch([
    ...rowStatements(env, siteId, p.id, items),
    env.DB.prepare('UPDATE portal_placements SET bag_saved_at = ?, updated_at = ? WHERE id = ? AND site_id = ?').bind(t, t, p.id, siteId),
    historyStatement(env, siteId, p.id, before === null ? null : itemsWord(before), itemsWord(items.length), 'breeder', t),
  ]);
  return items;
}

// At pickup, a bag that isn't the placement's own yet becomes it: her template as
// it stands (decision 1). A saved bag is left as she saved it.
export async function fixBag(env, siteId, p, by = 'portal') {
  if (!p || p.bag_saved_at) return false;
  const { items } = await bagFor(env, siteId, p);
  const t = now();
  const res = await env.DB.prepare('UPDATE portal_placements SET bag_saved_at = ? WHERE id = ? AND site_id = ? AND bag_saved_at IS NULL').bind(t, p.id, siteId).run();
  if (!res.meta?.changes) return false;
  await env.DB.batch([...rowStatements(env, siteId, p.id, items), historyStatement(env, siteId, p.id, null, itemsWord(items.length), by, t)]);
  return true;
}

// The hourly job: a puppy that went home another way (the clock started from its
// booked time, or KennelOS sent the pickup) gets its bag fixed too.
export async function fixDueBags(env) {
  const { results } = await env.DB.prepare(`SELECT p.* FROM portal_placements p JOIN sites s ON s.id = p.site_id
    WHERE s.portal_on = 1 AND s.status != 'closed' AND p.picked_up_at IS NOT NULL AND p.bag_saved_at IS NULL AND p.pickup_state IN ('confirmed', 'assumed') LIMIT 200`).all();
  let n = 0;
  for (const p of results) if (await fixBag(env, p.site_id, p)) n++;
  return n;
}

// What came home, for the family's Records: only once home, only while the puppy is
// with them, and only the program buttons families can use.
export async function familyBag(env, siteId, p) {
  if (!p?.picked_up_at) return [];
  const { items } = await bagFor(env, siteId, p);
  if (!items.length) return [];
  const { results } = await env.DB.prepare('SELECT id, name, portal_type, family_action, link_url FROM products WHERE site_id = ? AND portal_show = 1').bind(siteId).all();
  const programs = new Map(results.filter((x) => /^https:\/\//i.test(x.link_url ?? '')).map((x) => [x.id, x]));
  return items.map((x) => ({ name: x.name, button: x.button, program: x.product_id ? programs.get(x.product_id) ?? null : null }));
}

// For KennelOS (feed.js factsFor, plan section 4b): what went home, once the bag is
// the placement's own. kennelosIds: template item id → KennelOS's id for it.
export function bagFact(rows, kennelosIds) {
  const items = rows.map((x) => {
    const out = { name: x.name, cost: dollars(x.cost_cents), expense: Boolean(x.expense) };
    const kos = x.bag_item_id ? kennelosIds.get(x.bag_item_id) : null;
    return kos ? { bag_item_id: kos, ...out } : out;
  });
  const t = totals(rows);
  return { items, cost: dollars(t.cost), expensed: dollars(t.expensed) };
}

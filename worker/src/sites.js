// A site's life: created as a draft, live after its first publish, suspended and
// back, closed (plan 4.3), and its subdomain released only by the operator.
import { isValidSubdomain } from './hosts.js';
import { forgetSnapshots } from './publish.js';

export class SiteError extends Error {}

export async function createSite(env, { subdomain, kennel_name }) {
  const sub = String(subdomain ?? '').trim().toLowerCase();
  const name = String(kennel_name ?? '').replace(/\s+/g, ' ').trim();
  if (!isValidSubdomain(sub)) throw new SiteError('A subdomain is 1–63 lower-case letters, digits and single hyphens, not starting or ending with a hyphen, and not a reserved name.');
  if (!name || name.length > 80) throw new SiteError('Give the kennel a name (up to 80 characters).');
  const taken = await env.DB.prepare('SELECT status FROM sites WHERE subdomain = ?').bind(sub).first();
  if (taken) throw new SiteError(taken.status === 'closed' ? `${sub} belonged to a closed site. Release it first if it may be given out again.` : `${sub} is already a site.`);
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO sites (id, subdomain, kennel_name, status, created_at) VALUES (?, ?, ?, 'draft', ?)").bind(id, sub, name, new Date().toISOString()).run();
  return { id, subdomain: sub };
}

export async function setSuspended(env, siteId, suspended) {
  const site = await env.DB.prepare('SELECT status, published_snapshot_id FROM sites WHERE id = ?').bind(siteId).first();
  if (!site || site.status === 'closed') throw new SiteError('No such open site.');
  const status = suspended ? 'suspended' : (site.published_snapshot_id ? 'live' : 'draft');
  await env.DB.prepare('UPDATE sites SET status = ? WHERE id = ?').bind(status, siteId).run();
  return status;
}

// Every table that holds a site's content, children before parents.
const SITE_TABLES = ['portal_update_skills', 'portal_media', 'portal_stay_updates', 'portal_stay_skills', 'portal_placement_extras', 'portal_messages', 'portal_suggestions', 'portal_tombstones', 'portal_handoffs', 'portal_placement_progress', 'portal_placements_programs', 'portal_checklist_items', 'portal_timeline_tasks', 'portal_sessions', 'portal_codes', 'portal_clicks', 'portal_history', 'portal_email_log', 'portal_health_records', 'portal_files', 'portal_placements', 'portal_emails', 'portal_families', 'portal_settings', 'link_codes', 'links', 'link_pending', 'link_declines', 'notices', 'dog_titles', 'health_results', 'puppies', 'litters', 'dogs', 'stories', 'steps', 'expanders', 'extras', 'products', 'partner_kennels', 'home_blocks', 'block_switches', 'block_picks', 'site_pages', 'snapshots', 'redirects', 'photo_tags', 'photos', 'inquiries', 'notify_items', 'site_users', 'payment_info', 'form_fields', 'feed_cache', 'waitlist_entries', 'albums', 'embeds', 'custom_domains', 'site_builds'];

// Close a site (plan 4.3): delete everything now, keep only the marker row.
export async function closeSite(env, siteId, confirmSubdomain) {
  const site = await env.DB.prepare('SELECT subdomain, status FROM sites WHERE id = ?').bind(siteId).first();
  if (!site || site.status === 'closed') throw new SiteError('No such open site.');
  if (String(confirmSubdomain ?? '').trim().toLowerCase() !== site.subdomain) throw new SiteError(`Type ${site.subdomain} to confirm.`);

  // R2 first: if this stops part way, the site is still open and can be closed again.
  let cursor;
  do {
    const page = await env.FILES.list({ prefix: `sites/${siteId}/`, cursor, limit: 1000 });
    if (page.objects.length) await env.FILES.delete(page.objects.map((o) => o.key));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  const t = new Date().toISOString();
  await env.DB.batch([
    ...SITE_TABLES.map((table) => env.DB.prepare(`DELETE FROM ${table} WHERE site_id = ?`).bind(siteId)),
    env.DB.prepare(`UPDATE sites SET status = 'closed', closed_at = ?, kennel_name = NULL, tagline = NULL, blurb = NULL, breed = NULL,
      monogram = NULL, town = NULL, region = NULL, contact_email = NULL, contact_phone = NULL, facebook_url = NULL, facebook_label = NULL,
      instagram_url = NULL, kennelos_public_id = NULL, published_snapshot_id = NULL, storage_limit = NULL, photo_limit = NULL,
      album_limit = NULL, draft_changed_at = NULL, template = 'ak', scheme = 'lawn', dark_mode = 'auto', show_other_prices = 0, group_health = 0, use_kennelos_prices = 0 WHERE id = ?`).bind(t, siteId),
  ]);
  forgetSnapshots();
  return { subdomain: site.subdomain };
}

// Only the operator, and only for a closed site: the subdomain may be given out again.
export async function releaseSubdomain(env, siteId) {
  const site = await env.DB.prepare('SELECT status FROM sites WHERE id = ?').bind(siteId).first();
  if (!site || site.status !== 'closed') throw new SiteError('Only a closed site can be released.');
  await env.DB.prepare('DELETE FROM sites WHERE id = ?').bind(siteId).run();
}

export { SITE_TABLES };

// A site's own domain (plan 2.4), connected by hand in version 1.
//
// The operator first routes the hostname to the Worker: a Workers Custom Domain
// when the domain is a zone in KennelPort's own Cloudflare account, or a Cloudflare
// for SaaS custom hostname (CNAME to sites.kennelport.com) when it isn't. Then
// the row here says which site it is. 'pending' serves the site on the domain so
// it can be checked; 'active' makes it the main address, and the kennelport.com
// address redirects there with the same path.
import { isDemoSite, NOT_FOR_DEMO } from './lib/demo.js';

export class DomainError extends Error {}

const NAME = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export function normalizeHostname(raw) {
  return String(raw ?? '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/\.$/, '');
}

// The row for a hostname a request came in on. The main address answers as it
// is; its partner (www. ↔ bare) is told where to go.
export async function findDomain(env, host) {
  const bare = host.startsWith('www.') ? host.slice(4) : host;
  const { results } = await env.DB.prepare(`SELECT d.hostname, d.status, s.subdomain FROM custom_domains d JOIN sites s ON s.id = d.site_id
    WHERE d.hostname IN (?, ?) AND s.status != 'closed'`).bind(bare, `www.${bare}`).all();
  const row = results.find((r) => r.hostname === host) ?? results[0];
  if (!row) return null;
  return { ...row, redirect: row.hostname !== host };
}

export async function domainFor(env, siteId) {
  return env.DB.prepare('SELECT hostname, status, created_at, connected_at FROM custom_domains WHERE site_id = ?').bind(siteId).first();
}

export async function setDomain(env, siteId, raw) {
  if (await isDemoSite(env, siteId)) throw new DomainError(NOT_FOR_DEMO);
  const hostname = normalizeHostname(raw);
  const root = String(env.ROOT_DOMAIN ?? '').toLowerCase();
  if (!NAME.test(hostname) || hostname.split('.').some((l) => l.startsWith('xn--'))) throw new DomainError('That isn\'t a domain name, such as www.thornfieldkennels.com.');
  if (hostname === root || hostname.endsWith(`.${root}`)) throw new DomainError(`A ${root} address is already the site's own; give the breeder's domain.`);
  const site = await env.DB.prepare('SELECT status FROM sites WHERE id = ?').bind(siteId).first();
  if (!site || site.status === 'closed') throw new DomainError('No such open site.');
  const bare = hostname.startsWith('www.') ? hostname.slice(4) : hostname;
  const taken = await env.DB.prepare('SELECT site_id FROM custom_domains WHERE hostname IN (?, ?) AND site_id != ?').bind(bare, `www.${bare}`, siteId).first();
  if (taken) throw new DomainError(`${hostname} already belongs to another site.`);
  await env.DB.prepare('DELETE FROM custom_domains WHERE site_id = ?').bind(siteId).run();
  await env.DB.prepare("INSERT INTO custom_domains (hostname, site_id, status, created_at) VALUES (?, ?, 'pending', ?)").bind(hostname, siteId, new Date().toISOString()).run();
  return hostname;
}

export async function activateDomain(env, siteId, on = true) {
  const t = new Date().toISOString();
  const r = await env.DB.prepare(`UPDATE custom_domains SET status = ?, connected_at = CASE WHEN ? THEN COALESCE(connected_at, ?) ELSE connected_at END, checked_at = ? WHERE site_id = ?`)
    .bind(on ? 'active' : 'pending', on ? 1 : 0, t, t, siteId).run();
  if (!r.meta?.changes) throw new DomainError('This site has no domain yet.');
}

export async function removeDomain(env, siteId) {
  await env.DB.prepare('DELETE FROM custom_domains WHERE site_id = ?').bind(siteId).run();
}

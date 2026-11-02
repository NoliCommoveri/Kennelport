// Which part of KennelPort a request is for, from its hostname (plan 2.1, 2.2).
//
//   kennelport.com, www.kennelport.com  → home     (the public front page)
//   manage.kennelport.com               → manage   (the manage app; /ops is here too)
//   api.kennelport.com                  → api      (the KennelOS link API)
//   sites.kennelport.com                → fallback (custom domains' CNAME target, 2.4)
//   <reserved>.kennelport.com           → reserved (never a site)
//   <subdomain>.kennelport.com          → site
//   a.b.kennelport.com                  → unknown  (not covered by the certificate, 3.1)
//   anything else                       → custom   (a breeder's own domain, 2.4)
//
// Staging runs on workers.dev, where the real hostnames can't reach it. With
// ALLOW_HOST_OVERRIDE = "1" (staging only, never production) a cookie set by
// /__host?h=<hostname> stands in for the hostname, so the same routing is tested
// there. Without the cookie, staging behaves as the manage host.

// Never given to a site (plan 2.2). Kept in this one list.
export const RESERVED = Object.freeze([
  'www', 'manage', 'api', 'ops', 'admin', 'mail', 'email', 'support', 'help', 'sites',
  'kennelos', 'kennelport', 'staging', 'dev', 'test', 'app', 'apps', 'status', 'blog',
  'docs', 'static', 'assets', 'cdn', 'img', 'images', 'files', 'login', 'signin', 'account',
  'billing', 'security', 'root', 'ftp', 'smtp', 'imap', 'pop', 'ns1', 'ns2', 'mx',
]);

const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

// A subdomain a site may have: one DNS label, lower case, not reserved, no
// leading/trailing hyphen, and not an IDN/punycode label ("xn--"), which could
// imitate another kennel's name.
export function isValidSubdomain(label) {
  return typeof label === 'string' && LABEL.test(label) && !label.startsWith('xn--')
    && !label.includes('--') && !RESERVED.includes(label);
}

export const HOST_COOKIE = 'kp_host';

export function classifyHost(hostname, rootDomain) {
  const host = String(hostname ?? '').toLowerCase().replace(/\.$/, '');
  const root = String(rootDomain ?? '').toLowerCase();
  if (!host || !root) return { kind: 'unknown', host };
  if (host === root || host === `www.${root}`) return { kind: 'home', host };
  if (!host.endsWith(`.${root}`)) return { kind: 'custom', host };

  const label = host.slice(0, -(root.length + 1));
  if (label.includes('.')) return { kind: 'unknown', host };
  if (label === 'manage') return { kind: 'manage', host };
  if (label === 'api') return { kind: 'api', host };
  if (label === 'sites') return { kind: 'fallback', host };
  if (RESERVED.includes(label)) return { kind: 'reserved', host };
  if (!LABEL.test(label)) return { kind: 'unknown', host };
  return { kind: 'site', host, subdomain: label };
}

// The hostname to route by: the request's own, or on staging the override.
export function effectiveHost(request, env, readCookie) {
  const own = new URL(request.url).hostname;
  if (env.ALLOW_HOST_OVERRIDE !== '1') return own;
  const chosen = readCookie(request, HOST_COOKIE);
  if (chosen && /^[a-z0-9.-]{1,253}$/.test(chosen)) return chosen;
  return `manage.${env.ROOT_DOMAIN}`;
}

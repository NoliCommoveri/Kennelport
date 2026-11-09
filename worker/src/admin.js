// The owner as admin in the Site Manager (docs/plans/site-builder.md, "Where they
// live"). Signing in to /ops with OPS_TOKEN also makes this device admin in the
// Site Manager, so there is no code email and no invite per site: every open site
// is in her list. The proof is its own signed, HttpOnly cookie for the whole manage
// host (the ops cookie is only for /ops), lasting as long as the ops sign-in.
// Breeders never get it: their roles and invites work as before.
import { hmacHex, timingSafeEqual } from './lib/crypto.js';
import { readCookie } from './lib/http.js';

export const ADMIN_COOKIE = 'kp_admin';
export const ADMIN_SECONDS = 12 * 60 * 60;

export async function adminCookie(env) {
  const expires = Math.floor(Date.now() / 1000) + ADMIN_SECONDS;
  return `${ADMIN_COOKIE}=${expires}.${await hmacHex(env.OPS_TOKEN, `admin:${expires}`)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${ADMIN_SECONDS}`;
}

export const clearAdminCookie = () => `${ADMIN_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

export async function isAdmin(env, request) {
  if (!env.OPS_TOKEN) return false;
  const value = readCookie(request, ADMIN_COOKIE);
  if (!value) return false;
  const [expiresRaw, sig] = value.split('.');
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires * 1000 < Date.now()) return false;
  return timingSafeEqual(sig ?? '', await hmacHex(env.OPS_TOKEN, `admin:${expires}`));
}

// The signed-in user as admin: every open site, her own role kept where she has
// one, 'admin' elsewhere. Without a breeder sign-in on this device she has no
// email here; what the screens record as hers says "admin".
export async function asAdmin(env, user) {
  const { results } = await env.DB.prepare("SELECT id, subdomain, kennel_name, status, demo_step FROM sites WHERE status != 'closed' ORDER BY demo_step IS NOT NULL, kennel_name, subdomain").all();
  const mine = new Map((user?.sites ?? []).map((s) => [s.id, s.role]));
  return {
    tokenHash: user?.tokenHash ?? null,
    emailHash: user?.emailHash ?? 'admin',
    signedInAt: user?.signedInAt ?? new Date().toISOString(),
    admin: true,
    sites: results.map((s) => ({ ...s, role: mine.get(s.id) ?? 'admin' })),
  };
}

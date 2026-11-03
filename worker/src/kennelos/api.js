// The KennelOS link API on api.kennelport.com (plan 5.2, 5.3).
//
//   POST   /v1/link    { code, kennel_id, device_label, waitlist_public_id? }  → { token, site }
//   GET    /v1/link    (Bearer)  → { linked: true, site, last_bundle_at }
//   DELETE /v1/link    (Bearer)  → this device stops; the last one is an Unlink
//   POST   /v1/bundle  (Bearer, the bundle as JSON) → { summary, addresses, site }
//
// KennelOS Pro is a static app on its own origin, so a browser call comes with an
// Origin that must be one of KENNELOS_APP_ORIGINS (comma-separated), and gets the
// CORS headers back; a call with no Origin (not from a browser) is judged by its
// token alone. No cookie is ever read here.
//
// Every refusal is { error, message } with a line KennelOS can show as it is.
// Never logged: a code, a token or a body.
import { ApiError, json, readJson } from '../lib/http.js';
import { redeemCode, deviceFor, siteFacts, stopDevice } from './link.js';
import { applyBundle, MAX_BUNDLE_BYTES } from './bundle.js';

export const appOrigins = (env) => String(env.KENNELOS_APP_ORIGINS ?? '').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean);

function cors(env, request) {
  const origin = request.headers.get('origin');
  if (!origin) return { ok: true, headers: {} };
  if (!appOrigins(env).includes(origin)) return { ok: false, headers: {} };
  return {
    ok: true,
    headers: {
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
      'access-control-allow-headers': 'authorization, content-type',
      'access-control-max-age': '86400',
      vary: 'Origin',
    },
  };
}

export async function handleApi(request, env, url) {
  const c = cors(env, request);
  if (!c.ok) return json({ error: 'origin_not_allowed', message: 'KennelPort only takes this from the KennelOS app.' }, 403);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: c.headers });
  const reply = (body, status = 200) => json(body, status, c.headers);
  try {
    if (url.pathname === '/v1/link') {
      if (request.method === 'POST') {
        const body = await readJson(request, 4 * 1024);
        const out = await redeemCode(env, request, body);
        return reply(out);
      }
      const device = await deviceFor(env, request);
      if (request.method === 'GET') {
        const site = await env.DB.prepare('SELECT * FROM sites WHERE id = ?').bind(device.site_id).first();
        return reply({ linked: true, site: await siteFacts(env, site), last_bundle_at: device.last_bundle_at });
      }
      if (request.method === 'DELETE') {
        await stopDevice(env, device.site_id, device.id);
        return reply({ linked: false });
      }
      return reply({ error: 'method_not_allowed' }, 405);
    }
    if (url.pathname === '/v1/bundle') {
      if (request.method !== 'POST') return reply({ error: 'method_not_allowed' }, 405);
      const device = await deviceFor(env, request);
      const body = await readJson(request, MAX_BUNDLE_BYTES);
      return reply(await applyBundle(env, device, body));
    }
    return reply({ error: 'not_found' }, 404);
  } catch (err) {
    if (err instanceof ApiError) {
      const message = err.extra?.message ?? ({ too_large: 'That is more than KennelPort takes at once.', bad_json: 'KennelPort couldn\'t read that.' })[err.code] ?? 'KennelPort couldn\'t take that.';
      return reply({ error: err.code, ...err.extra, message }, err.status);
    }
    throw err;
  }
}

// A staging-shaped environment for tests, and a way to call the Worker as any host.
import { worker, migrate, gate } from './worker.js';
import { makeDb, makeBucket } from './d1.js';

export async function makeEnv(extra = {}, { migrated = true } = {}) {
  gate.resetGateCache();
  const env = { DB: makeDb(), FILES: makeBucket(), ROOT_DOMAIN: 'kennelport.com', ENV_NAME: 'test', OPS_TOKEN: 'ops-token', ...extra };
  if (migrated) await migrate.applyPending(env.DB);
  return env;
}

export function call(env, host, path, { method = 'GET', body, headers = {} } = {}) {
  return worker.fetch(new Request(`https://${host}${path}`, { method, body, headers, redirect: 'manual' }), env);
}

export async function addSite(env, subdomain, fields = {}) {
  const row = { id: crypto.randomUUID(), subdomain, kennel_name: 'Test Kennel', status: 'draft', created_at: new Date().toISOString(), ...fields };
  const cols = Object.keys(row);
  await env.DB.prepare(`INSERT INTO sites (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`).bind(...Object.values(row)).run();
  return row;
}

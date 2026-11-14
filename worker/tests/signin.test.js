// One sign-in, used twice (src/signin.js; review/senior-review-2026-11.md item 10):
// the breeder's (auth.js) and a family's (portal/auth.js) are held to the same rules
// here, side by side, and kept apart from each other.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, addSite } from './helpers/env.js';

const auth = await import('../src/auth.js');
const portal = await import('../src/portal/auth.js');
const { emailHash, MAX_ATTEMPTS, LIMITS, SLIDE_AFTER_MS } = await import('../src/signin.js');

const DAY = 86400000;
const req = (ip = '1.2.3.4', cookie) => new Request('https://x.test/', { headers: { 'cf-connecting-ip': ip, ...(cookie ? { cookie } : {}) } });
const lastCode = (env) => env.DB.raw.prepare('SELECT subject FROM dev_outbox ORDER BY id DESC LIMIT 1').get()?.subject.match(/(\d{6})/)?.[1];
const sent = (env) => env.DB.raw.prepare('SELECT COUNT(*) AS n FROM dev_outbox').get().n;
const cookiePair = (setCookie) => setCookie.split(';')[0];

async function setup() {
  const env = await makeEnv();
  const site = await addSite(env, 'akbostons', { kennel_name: 'AK Boston Terriers' });
  const other = await addSite(env, 'other', { kennel_name: 'Other Kennel' });
  const t = new Date().toISOString();
  const eh = await emailHash(env, 'both@example.com');
  // One address that is both a breeder on the site and a family on it.
  env.DB.raw.prepare("INSERT INTO site_users (site_id, email_hash, role, invited_at) VALUES (?, ?, 'owner', ?)").run(site.id, eh, t);
  env.DB.raw.prepare("INSERT INTO portal_families (id, site_id, name, created_at, updated_at) VALUES ('fam1', ?, 'The Reeds', ?, ?)").run(site.id, t, t);
  env.DB.raw.prepare("INSERT INTO portal_emails (id, site_id, family_id, email_hash, email_enc, added_at) VALUES ('e1', ?, 'fam1', ?, 'x', ?)").run(site.id, eh, t);
  return { env, site, other };
}

// The two sides, called the same way.
const SIDES = {
  breeder: {
    start: (env, s, email, ip) => auth.startSignIn(env, req(ip), email),
    verify: async (env, s, email, code) => (await auth.verifySignIn(env, email, code)).cookie,
    current: (env, s, cookie) => auth.currentUser(env, req(undefined, cookie)),
    signOut: (env, who) => auth.signOut(env, who),
    sessions: 'sessions',
  },
  family: {
    start: (env, s, email, ip) => portal.startFamilySignIn(env, req(ip), s, email),
    verify: (env, s, email, code) => portal.verifyFamilySignIn(env, s, email, code),
    current: (env, s, cookie) => portal.currentFamily(env, req(undefined, cookie), s),
    signOut: (env, who) => portal.signOutFamily(env, who),
    sessions: 'portal_sessions',
  },
};

for (const [name, side] of Object.entries(SIDES)) {
  test(`${name}: a code works once, and the session it starts lets them in until they sign out`, async () => {
    const { env, site } = await setup();
    await side.start(env, site, ' Both@Example.com ');
    const code = lastCode(env);
    const cookie = cookiePair(await side.verify(env, site, 'both@example.com', code));
    assert.ok(await side.current(env, site, cookie));
    await assert.rejects(side.verify(env, site, 'both@example.com', code), { code: 'invalid_code', message: 'That code has expired. Ask for a new one.' });
    await side.signOut(env, await side.current(env, site, cookie));
    assert.equal(await side.current(env, site, cookie), null);
  });

  test(`${name}: an unknown address gets the same answer and no email`, async () => {
    const { env, site } = await setup();
    assert.deepEqual(await side.start(env, site, 'nobody@example.com'), { email: 'nobody@example.com' });
    assert.equal(sent(env), 0);
    await assert.rejects(side.start(env, site, 'not an address'), { code: 'bad_email' });
  });

  test(`${name}: ${MAX_ATTEMPTS} wrong tries and the code is dead`, async () => {
    const { env, site } = await setup();
    await side.start(env, site, 'both@example.com');
    const code = lastCode(env);
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 1; i < MAX_ATTEMPTS; i++) {
      await assert.rejects(side.verify(env, site, 'both@example.com', wrong), { code: 'invalid_code', message: /isn't right/ });
    }
    // The last wrong try says the code is dead, not one more "isn't right".
    await assert.rejects(side.verify(env, site, 'both@example.com', wrong), { code: 'too_many_attempts', message: 'Too many tries. Ask for a new code.' });
    await assert.rejects(side.verify(env, site, 'both@example.com', code), { code: 'too_many_attempts' });
    await assert.rejects(side.verify(env, site, 'both@example.com', '12 34'), { code: 'invalid_code' });
  });

  test(`${name}: an old code has expired, and a new one replaces it`, async () => {
    const { env, site } = await setup();
    await side.start(env, site, 'both@example.com');
    const first = lastCode(env);
    await side.start(env, site, 'both@example.com');
    const second = lastCode(env);
    if (first !== second) await assert.rejects(side.verify(env, site, 'both@example.com', first), { code: 'invalid_code' });
    const table = name === 'breeder' ? 'login_codes' : 'portal_codes';
    env.DB.raw.prepare(`UPDATE ${table} SET expires_at = ?`).run(new Date(Date.now() - 1000).toISOString());
    await assert.rejects(side.verify(env, site, 'both@example.com', second), { message: 'That code has expired. Ask for a new one.' });
  });

  test(`${name}: ${LIMITS.email} codes an hour per address, then refused`, async () => {
    const { env, site } = await setup();
    for (let i = 0; i < LIMITS.email; i++) await side.start(env, site, 'both@example.com', `10.0.0.${i}`);
    await assert.rejects(side.start(env, site, 'both@example.com', '10.0.1.1'), { code: 'rate_limited', message: 'Too many codes asked for. Try again in an hour.' });
  });

  test(`${name}: the session slides a day after the last visit, and an expired one is refused`, async () => {
    const { env, site } = await setup();
    await side.start(env, site, 'both@example.com');
    const cookie = cookiePair(await side.verify(env, site, 'both@example.com', lastCode(env)));
    const old = new Date(Date.now() - SLIDE_AFTER_MS - 60000).toISOString();
    const soon = new Date(Date.now() + DAY).toISOString();
    env.DB.raw.prepare(`UPDATE ${side.sessions} SET last_seen_at = ?, expires_at = ?`).run(old, soon);
    assert.ok(await side.current(env, site, cookie));
    const row = env.DB.raw.prepare(`SELECT last_seen_at, expires_at FROM ${side.sessions}`).get();
    assert.ok(row.last_seen_at > old && row.expires_at > new Date(Date.now() + 30 * DAY).toISOString());
    env.DB.raw.prepare(`UPDATE ${side.sessions} SET expires_at = ?`).run(new Date(Date.now() - 1000).toISOString());
    assert.equal(await side.current(env, site, cookie), null);
  });
}

test('the two are kept apart: codes, limits and sessions of one never work for the other', async () => {
  const { env, site, other } = await setup();
  // A breeder's code is not a family's code, for the same address.
  await auth.startSignIn(env, req(), 'both@example.com');
  const breederCode = lastCode(env);
  await assert.rejects(portal.verifyFamilySignIn(env, site, 'both@example.com', breederCode), { code: 'invalid_code' });
  // A family's code works only on its own site.
  await portal.startFamilySignIn(env, req(), site, 'both@example.com');
  const familyCode = lastCode(env);
  await assert.rejects(portal.verifyFamilySignIn(env, other, 'both@example.com', familyCode), { code: 'invalid_code' });
  await assert.rejects(auth.verifySignIn(env, 'both@example.com', familyCode === breederCode ? '999999' : familyCode), { code: 'invalid_code' });
  // Each cookie has its own name and path, and one's token is no session for the other.
  const breeder = await auth.verifySignIn(env, 'both@example.com', breederCode);
  const family = await portal.verifyFamilySignIn(env, site, 'both@example.com', familyCode);
  assert.match(breeder.cookie, /^kp_session=[0-9a-f]{64}; Path=\/; HttpOnly; Secure; SameSite=Lax; Max-Age=7776000$/);
  assert.match(family, /^kp_family=[0-9a-f]{64}; Path=\/family; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000$/);
  const familyToken = cookiePair(family).split('=')[1];
  assert.equal(await auth.currentUser(env, req(undefined, `kp_session=${familyToken}`)), null);
  assert.equal(await portal.currentFamily(env, req(undefined, `kp_family=${breeder.token}`), site), null);
  assert.equal(await portal.currentFamily(env, req(undefined, cookiePair(family)), other), null);
  // Their limits are counted apart.
  const buckets = env.DB.raw.prepare('SELECT bucket FROM rate_limits').all().map((r) => r.bucket.split(':')[0]).sort();
  assert.deepEqual([...new Set(buckets)], ['email', 'ip', 'pemail', 'pip']);
});

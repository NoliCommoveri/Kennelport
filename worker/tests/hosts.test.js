import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hosts } from './helpers/worker.js';

const { classifyHost, isValidSubdomain, effectiveHost, RESERVED, HOST_COOKIE } = hosts;
const R = 'kennelport.com';

test('hostnames map to the part of KennelPort they are for', () => {
  assert.equal(classifyHost('kennelport.com', R).kind, 'home');
  assert.equal(classifyHost('www.kennelport.com', R).kind, 'home');
  assert.equal(classifyHost('manage.kennelport.com', R).kind, 'manage');
  assert.equal(classifyHost('api.kennelport.com', R).kind, 'api');
  assert.equal(classifyHost('sites.kennelport.com', R).kind, 'fallback');
  assert.equal(classifyHost('ops.kennelport.com', R).kind, 'reserved');
  assert.deepEqual(classifyHost('AKBostons.kennelport.com.', R), { kind: 'site', host: 'akbostons.kennelport.com', subdomain: 'akbostons' });
  assert.equal(classifyHost('www.akbostons.kennelport.com', R).kind, 'unknown');
  assert.equal(classifyHost('www.akbostons.com', R).kind, 'custom');
  assert.equal(classifyHost('evilkennelport.com', R).kind, 'custom');
  assert.equal(classifyHost('-bad.kennelport.com', R).kind, 'unknown');
});

test('reserved names and lookalikes are never valid subdomains', () => {
  for (const name of RESERVED) assert.equal(isValidSubdomain(name), false, name);
  assert.equal(isValidSubdomain('akbostons'), true);
  assert.equal(isValidSubdomain('thornfield-kennels'), true);
  assert.equal(isValidSubdomain('xn--kennel-abc'), false);
  assert.equal(isValidSubdomain('a--b'), false);
  assert.equal(isValidSubdomain('Upper'), false);
  assert.equal(isValidSubdomain('-lead'), false);
  assert.equal(isValidSubdomain('a'.repeat(64)), false);
});

test('the host override works only where it is allowed', () => {
  const read = (req, name) => (name === HOST_COOKIE ? 'akbostons.kennelport.com' : null);
  const req = new Request('https://kennelport-staging.example.workers.dev/');
  assert.equal(effectiveHost(req, { ROOT_DOMAIN: R }, read), 'kennelport-staging.example.workers.dev');
  assert.equal(effectiveHost(req, { ROOT_DOMAIN: R, ALLOW_HOST_OVERRIDE: '1' }, read), 'akbostons.kennelport.com');
  assert.equal(effectiveHost(req, { ROOT_DOMAIN: R, ALLOW_HOST_OVERRIDE: '1' }, () => null), 'manage.kennelport.com');
});

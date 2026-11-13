// The demo site (docs/plans/done/linked-sample.md, step 3): made in /ops from the linked
// sample (tests/fixtures/linked-sample/), for the owner only.
//
// - It is linked to the sample, not to a KennelOS device: its one links row has a
//   token_hash ("demo:<site id>") that no bearer token can hash to, so nothing can
//   post to it through /v1. Its bundles and feeds go through the same applyBundle
//   and applyFeed as a real device's.
// - Each step is sent as of today: bundle N and feed N are written as of their
//   step's day (sampleDates.js SENT) and moved to today, so expect-N.md reads true
//   on the day the owner presses the button. The gaps between steps disappear: a
//   litter's 30-day clock starts when its bundle is sent.
// - It is never served at its address, never published, never indexed, and can't
//   be invited to, given a domain or a link code (sites.demo_step; the guards in
//   site.js, publish.js, auth.js, domains.js, kennelos/link.js). It opens only in
//   her admin view (manage/builder.js /admin/<sub>/site).
import b1 from '../../tests/fixtures/linked-sample/bundle-1.json' with { type: 'json' };
import b2 from '../../tests/fixtures/linked-sample/bundle-2.json' with { type: 'json' };
import b3 from '../../tests/fixtures/linked-sample/bundle-3.json' with { type: 'json' };
import b4 from '../../tests/fixtures/linked-sample/bundle-4.json' with { type: 'json' };
import b5 from '../../tests/fixtures/linked-sample/bundle-5.json' with { type: 'json' };
import f1 from '../../tests/fixtures/linked-sample/feed-1.json' with { type: 'json' };
import f2 from '../../tests/fixtures/linked-sample/feed-2.json' with { type: 'json' };
import f3 from '../../tests/fixtures/linked-sample/feed-3.json' with { type: 'json' };
import f4 from '../../tests/fixtures/linked-sample/feed-4.json' with { type: 'json' };
import f5 from '../../tests/fixtures/linked-sample/feed-5.json' with { type: 'json' };
import { SENT, STEPS, shiftDates, daysBetween } from './sampleDates.js';
import { applyBundle } from './bundle.js';
import { applyFeed } from '../portal/feed.js';
import { createSite, SITE_TABLES } from '../sites.js';

export { STEPS as DEMO_STEPS };
export const DEMO_NAME = 'Tuxedo Lane Bostons*';
export const DEMO_DEVICE = 'The linked sample';
// What each step brings, for her buttons (the sample README's series table).
export const STEP_NOTES = Object.freeze({
  1: 'Everything: 10 dogs, 5 litters and pairings, 2 heats, 11 pups, the family feed.',
  2: 'Pearl* placed, a health result for Maple*; the Reeds*\' pickup booked.',
  3: 'Pairing P1 becomes the Forest litter*, heat H1 becomes a pairing.',
  4: 'The Gem litter* and Ginger* stop being sent; Harbor Light* renamed.',
  5: 'The Gem litter* sent again, within its 30 days; the Kims* back out.',
});

const PACKAGES = { bundle: [null, b1, b2, b3, b4, b5], feed: [null, f1, f2, f3, f4, f5] };
const KENNEL_ID = b1.kennel_id;

export class DemoError extends Error {}

const todayYmd = () => new Date().toISOString().slice(0, 10);

// Bundle or feed N, as if KennelOS sent it today.
export function samplePackage(kind, step, today = todayYmd()) {
  return shiftDates(structuredClone(PACKAGES[kind][step]), daysBetween(SENT[step], today));
}

export { isDemoSite, NOT_FOR_DEMO } from '../lib/demo.js';

async function addLink(env, siteId) {
  await env.DB.prepare('INSERT INTO links (id, site_id, kennelos_kennel_id, token_hash, device_label, linked_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), siteId, KENNEL_ID, `demo:${siteId}`, DEMO_DEVICE, new Date().toISOString()).run();
}

async function sendStep(env, siteId, step) {
  const device = await env.DB.prepare('SELECT * FROM links WHERE site_id = ? AND revoked_at IS NULL ORDER BY linked_at LIMIT 1').bind(siteId).first();
  if (!device) throw new DemoError('The demo isn\'t linked to the sample any more. Go back to step 1 to link it again.');
  const today = todayYmd();
  const out = await applyBundle(env, device, samplePackage('bundle', step, today));
  await applyFeed(env, device, samplePackage('feed', step, today));
  await env.DB.prepare('UPDATE sites SET demo_step = ? WHERE id = ?').bind(step, siteId).run();
  return out.summary;
}

// "Make a demo site from the sample": a new draft site, with the portal on (the
// feed needs it), linked to the sample, holding step 1.
export async function makeDemoSite(env) {
  const tag = [...crypto.getRandomValues(new Uint8Array(3))].map((b) => b.toString(16).padStart(2, '0')).join('');
  const { id, subdomain } = await createSite(env, { subdomain: `demo-${tag}`, kennel_name: DEMO_NAME });
  await env.DB.prepare('UPDATE sites SET demo_step = 0, portal_on = 1 WHERE id = ?').bind(id).run();
  await addLink(env, id);
  await sendStep(env, id, 1);
  return { id, subdomain };
}

async function demoStep(env, siteId) {
  const row = await env.DB.prepare("SELECT demo_step FROM sites WHERE id = ? AND status != 'closed'").bind(siteId).first();
  if (row?.demo_step == null) throw new DemoError('That isn\'t a demo site.');
  return row.demo_step;
}

// "Send bundle and feed N": the next step of the series.
export async function sendNextStep(env, siteId) {
  const step = await demoStep(env, siteId);
  if (step >= STEPS) throw new DemoError(`All ${STEPS} steps are in. Go back to step 1 to start again.`);
  return { step: step + 1, summary: await sendStep(env, siteId, step + 1) };
}

// "Back to step 1": everything the steps (or she) put in the demo is deleted, its
// photos too, and step 1 is sent again, as of today. Her build for it (its display
// and timing rules, site_builds) stays, so she can keep trying them on fresh data.
export async function backToStepOne(env, siteId) {
  await demoStep(env, siteId);
  let cursor;
  do {
    const page = await env.FILES.list({ prefix: `sites/${siteId}/`, cursor, limit: 1000 });
    if (page.objects.length) await env.FILES.delete(page.objects.map((o) => o.key));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  await env.DB.batch([
    ...SITE_TABLES.filter((t) => t !== 'site_builds').map((table) => env.DB.prepare(`DELETE FROM ${table} WHERE site_id = ?`).bind(siteId)),
    env.DB.prepare(`UPDATE sites SET kennel_name = ?, tagline = NULL, blurb = NULL, breed = NULL, monogram = NULL, town = NULL, region = NULL,
      contact_email = NULL, contact_phone = NULL, facebook_url = NULL, facebook_label = NULL, instagram_url = NULL, logo_photo_id = NULL,
      kennelos_public_id = NULL, published_snapshot_id = NULL, use_kennelos_prices = 0, show_other_prices = 0, group_health = 0, pill_style = 'dot', portal_on = 1,
      portal_feed_at = NULL, draft_changed_at = ?, demo_step = 0 WHERE id = ?`).bind(DEMO_NAME, new Date().toISOString(), siteId),
  ]);
  await addLink(env, siteId);
  return { step: 1, summary: await sendStep(env, siteId, 1) };
}

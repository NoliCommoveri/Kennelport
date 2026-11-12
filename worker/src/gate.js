// The maintenance answer. Started as a copy of KennelOS cloud (cloud/src/gate.js); since
// 2026-11-12 KennelPort's differs: it applies pending migrations by itself
// (review/senior-review-2026-11.md item 1, the owner's decision).
//
// When the code is newer than the database, the first request (or cron run) that asks
// applies every pending migration, the same all-or-nothing runner Apply pending in /ops
// uses (migrate.js applyPending), then checks again. Everything that reads D1 answers
// 503 only while that runs, or if it fails: then the owner is needed, and /ops shows
// what failed and still has Apply pending. A drifted or orphaned migration is never
// touched by this: it stays "not current" until someone looks.
//
// Two isolates may try at once. Each migration lands in one batch with its _migrations
// row, so the second batch fails whole on that row's primary key and nothing is applied
// twice; whichever lost just reads the status again.
//
// "Current" is cached per isolate once it is true: a new deploy is a new isolate, so the
// cache can't outlive the migration list it was checked against. "Not current" is never
// cached, so the first request after a fix goes straight through. A failed attempt is
// not retried by this isolate for RETRY_MS, so a broken migration isn't run on every
// request.
import { schemaIsCurrent, migrationStatus, applyPending } from './migrate.js';

export const RETRY_MS = 60 * 1000;

let current = false;
let running = null;
let failedAt = 0;

async function applyIfPending(db) {
  const rows = await migrationStatus(db);
  if (!rows.some((r) => r.state === 'pending')) return;
  const { log, halted } = await applyPending(db);
  for (const l of log) {
    if (l.ok) console.log(`migration ${l.id} ${l.name}: applied by itself (${l.statements} statements)`);
    else console.error(`migration ${l.id} ${l.name}: failed when applied by itself: ${l.error}`);
  }
  if (halted) failedAt = Date.now();
}

export async function schemaReady(db) {
  if (current) return true;
  try {
    current = await schemaIsCurrent(db);
    if (current) return true;
    if (Date.now() - failedAt < RETRY_MS) return false;
    running ??= applyIfPending(db).finally(() => { running = null; });
    await running;
    current = await schemaIsCurrent(db);
  } catch (err) {
    console.error(`migrations: ${err?.message ?? err}`);
    failedAt = Date.now();
    current = false;
  }
  return current;
}

// Tests only: forget the cached answer.
export function resetGateCache() {
  current = false;
  running = null;
  failedAt = 0;
}

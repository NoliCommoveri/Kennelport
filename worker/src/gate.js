// The maintenance answer, copied from KennelOS cloud (cloud/src/gate.js). Between a
// deploy and Apply pending the code is newer than the database, so everything that
// reads D1 answers 503 until the two agree.
//
// "Current" is cached per isolate once it is true: a new deploy is a new
// isolate, so the cache can't outlive the migration list it was checked
// against. "Not current" is never cached, so the first request after Apply
// pending goes straight through.
import { schemaIsCurrent } from './migrate.js';

let current = false;

export async function schemaReady(db) {
  if (current) return true;
  try {
    current = await schemaIsCurrent(db);
  } catch {
    current = false;
  }
  return current;
}

// Tests only: forget the cached answer.
export function resetGateCache() {
  current = false;
}

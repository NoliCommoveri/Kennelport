// The ordered migration list /ops applies. Adding a migration means adding its
// .sql file beside this one AND a line here; the runner only knows what this
// list names.
//
// Rules (as in KennelOS cloud):
// - pre-launch, 0001 may be edited on staging (it then reads as drifted);
// - from the first real site on production, forward-only and additive, and an
//   applied file is never edited: its checksum is what drift is measured by;
// - semicolons inside strings, comments and trigger bodies are fine:
//   lib/sql.js understands them.
import schema from './0001_schema.sql';

export const MIGRATIONS = [
  { id: '0001', name: 'schema', sql: schema },
];

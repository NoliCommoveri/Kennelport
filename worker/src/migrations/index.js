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
import content from './0002_content.sql';
import accounts from './0003_accounts.sql';
import messages from './0004_messages.sql';
import photoTags from './0005_photo_tags.sql';

export const MIGRATIONS = [
  { id: '0001', name: 'schema', sql: schema },
  { id: '0002', name: 'content', sql: content },
  { id: '0003', name: 'accounts', sql: accounts },
  { id: '0004', name: 'messages', sql: messages },
  { id: '0005', name: 'photo_tags', sql: photoTags },
];

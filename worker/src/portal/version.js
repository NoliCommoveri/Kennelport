// The family portal's own files (public/_kp/f/): the one number to bump whenever
// one changes, because browsers keep them a day; pages ask for portal.css and
// portal.js with ?v=<it>. PORTAL_FILES is their fingerprint at this version
// (tests/versions.test.js; `node worker/scripts/fingerprint.mjs` prints it).
// Ask the owner before bumping once a version has gone out (CLAUDE.md).
export const PORTAL_VERSION = '1';
export const PORTAL_FILES = '3bd0220a88e48561';

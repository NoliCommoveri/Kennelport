// The site template's version: the one number to bump whenever a file under
// public/_kp/t/ changes, because browsers keep those a day; pages ask for site.css
// and site.js with ?v=<it>.
//
// TEMPLATE_FILES is the fingerprint of public/_kp/t/ at this version. If a file
// there changes, tests/versions.test.js fails until both are updated: bump
// ASSET_VERSION, then run `node worker/scripts/fingerprint.mjs` and paste its
// TEMPLATE_FILES value here. Ask the owner before bumping (CLAUDE.md).
export const ASSET_VERSION = '14';
export const TEMPLATE_FILES = 'a85d1b40624a13f7';

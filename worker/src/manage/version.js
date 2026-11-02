// The manage app's version: the one number to bump whenever a file under
// public/_kp/m/ changes, because the app's service worker serves those files from
// its cache first, so phones keep the old ones until this changes. The Worker
// writes it into the service worker as it serves /sw.js, and pages ask for
// app.css, app.js, photos.js and zip.js with ?v=<it>.
//
// APP_FILES is the fingerprint of public/_kp/m/ at this version. If a file there
// changes, tests/versions.test.js fails until both are updated: bump APP_VERSION,
// then run `node worker/scripts/fingerprint.mjs` and paste its APP_FILES value here.
// Ask the owner before bumping (CLAUDE.md).
export const APP_VERSION = '10';
export const APP_FILES = 'c60ccfbbf36827bb';

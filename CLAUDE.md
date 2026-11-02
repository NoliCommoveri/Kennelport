# KennelPort: notes for Claude

## Version bumps: ask first, every time

Browsers cache two sets of files, so a change to them only reaches phones and
computers when its version number changes:

- the manage app (`worker/public/_kp/m/`), served from its service worker's cache
  first: `APP_VERSION` in `worker/src/manage/version.js`;
- the site template (`worker/public/_kp/t/`), kept by browsers for a day:
  `ASSET_VERSION` in `worker/src/render/version.js`.

**Never bump either without asking the owner first, every time,** even when a test
fails for it. The owner may not be done changing things and wants to bump once, at
the end. Say which files changed and ask; bump only after a yes.

**First check whether the current number has gone out.** Compare it with the one on
`main` (`git fetch origin main`, then `git show origin/main:worker/src/manage/version.js`
or `.../render/version.js`). If the branch's number is already higher than `main`'s,
it hasn't been released: no browser has cached it, so don't bump and don't ask. Just
run the fingerprint script and update the fingerprint beside that same number, and
say you did. Only when the number matches `main`'s (it has gone out) is a bump
needed, and then ask as above.

When a file there changes without a bump, `tests/versions.test.js` fails and says
what to do. That failure is expected while work is in progress; it's the cue to ask,
not to bump. After a yes: bump the number by one, run
`node worker/scripts/fingerprint.mjs` from the repo root, and paste the matching
fingerprint (`APP_FILES` or `TEMPLATE_FILES`) beside the number.

## Tests

`node --test` from the repo root (Node 22 or later).

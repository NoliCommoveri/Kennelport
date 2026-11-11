// Small pieces the Site Manager's screens share (manage/screens.js and the screens
// split out beside it): a time and a day in words, a redirect, and how recent a
// sign-in must be to delete a site.


export const when = (iso) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }) + ' UTC';

export const redirect = (location) => new Response(null, { status: 303, headers: { location, 'cache-control': 'no-store' } });

export const day = (ymd) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' });

// A sign-in this recent (15 minutes) may delete her site.
export const FRESH_SIGN_IN_MS = 15 * 60 * 1000;

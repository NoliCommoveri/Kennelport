// HTML escaping and the plain pages the Worker answers with until the template
// exists (phase 1).
export const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

// Sent with every HTML page: nothing loads from anywhere (plan 3.3 lists what the
// template will add), no framing, no referrer beyond the origin.
export const SECURITY_HEADERS = Object.freeze({
  'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'DENY',
});

export function htmlPage(title, body, { status = 200, noindex = true, headers = {} } = {}) {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
${noindex ? '<meta name="robots" content="noindex">\n' : ''}<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light dark; }
  body { font: 16px/1.55 ui-sans-serif, system-ui, sans-serif; margin: 0 auto; padding: 2rem 1rem; max-width: 40rem; }
  h1 { font-size: 1.4rem; margin: 0 0 .5rem; }
  h2 { font-size: 1rem; margin: 2rem 0 .5rem; border-bottom: 1px solid #8884; padding-bottom: .25rem; }
  table { border-collapse: collapse; width: 100%; font-size: .9rem; }
  td, th { text-align: left; padding: .3rem .5rem .3rem 0; vertical-align: top; }
  code, pre { font-family: ui-monospace, monospace; font-size: .85em; }
  pre { overflow-x: auto; background: #8881; padding: .6rem; border-radius: 4px; white-space: pre-wrap; }
  button { font: inherit; padding: .5rem .9rem; border-radius: 6px; border: 1px solid #8886; background: #8881; color: inherit; cursor: pointer; }
  input { font: inherit; padding: .45rem; width: 100%; box-sizing: border-box; border-radius: 6px; border: 1px solid #8886; background: transparent; color: inherit; }
  .muted { opacity: .7; }
  .ok { color: #2a7a3a; } .bad { color: #b3261e; }
</style></head><body>${body}</body></html>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', ...SECURITY_HEADERS, ...headers } },
  );
}

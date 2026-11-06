// Is a site the demo (kennelos/demo.js, sites.demo_step)? Kept apart, with no
// imports, so every guard can use it without an import cycle.
export const NOT_FOR_DEMO = 'This is a demo site, made from the linked sample. It has no address of its own and opens only in the admin view.';

export async function isDemoSite(env, siteId) {
  return (await env.DB.prepare('SELECT demo_step FROM sites WHERE id = ?').bind(siteId).first('demo_step')) != null;
}

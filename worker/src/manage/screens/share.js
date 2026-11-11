// Sharing her site (/s/<sub>/share, plan 5.4): links and QR codes for each page,
// litter and dog. A screen of the Site Manager (manage/screens.js routes to it), made
// with what that file's createScreens holds for the request.
import { escapeHtml as esc } from '../../lib/html.js';
import { loadSnapshot } from '../../publish.js';
import { siteLink } from '../../ops/sites.js';
import { qrSvg } from '../../qr.js';
import { NOT_FOR_DEMO } from '../../lib/demo.js';

export function shareScreens({ base, env, request, say, site, url }) {
  // ---------- sharing (plan 5.4): links and QR codes ----------
  // The site and its litters and albums, as visitors see them: published ones only.
  async function shareScreen() {
    const rest = url.pathname.slice(`${base}/share`.length);
    // The demo has nothing to share: no address, no preview link.
    if (site.demo_step != null) return { title: say('share.share_2'), back: base, body: `<section class="card band"><p><strong>${esc(say('share.demo_site'))}</strong> ${esc(NOT_FOR_DEMO)}</p><p class="row"><a class="button" href="/admin/${esc(site.subdomain)}/site/">${esc(say('share.open_it_in_your'))}</a></p></section>` };
    if (request.method !== 'GET') return null;
    const row = await env.DB.prepare('SELECT published_snapshot_id FROM sites WHERE id = ?').bind(site.id).first();
    const live = await loadSnapshot(env, site.id, row.published_snapshot_id);
    const targets = [{ key: 'site', label: site.kennel_name || site.subdomain, path: '/' }];
    if (live) {
      if (live.pages?.litters?.enabled) for (const l of live.litters.filter((x) => x.stage !== 'past')) targets.push({ key: `litter-${l.slug}`, label: l.name, path: `/litters/${l.slug}` });
      if (live.pages?.albums?.enabled) for (const a of live.albums ?? []) targets.push({ key: `album-${a.slug}`, label: a.title, path: `/albums/${a.slug}` });
    }
    const m = rest.match(/^\/qr\/([a-z0-9-]+)\.svg$/);
    if (m) {
      const t = targets.find((x) => x.key === m[1]);
      if (!t) return null;
      return new Response(qrSvg(siteLink(env, site.subdomain, t.path)), { headers: {
        'content-type': 'image/svg+xml', 'cache-control': 'private, max-age=300', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'",
        ...(url.searchParams.has('download') ? { 'content-disposition': `attachment; filename="${site.subdomain}-${m[1]}-qr.svg"` } : {}),
      } });
    }
    if (rest) return null;
    const card = (t) => {
      const link = siteLink(env, site.subdomain, t.path);
      return `<li class="card share-card"><img class="qr" src="${base}/share/qr/${t.key}.svg" alt="QR code for ${esc(t.label)}" width="132" height="132">
        <div><b>${esc(t.label)}</b><p class="muted small share-link">${esc(link)}</p>
        <p class="row"><button type="button" data-copy="${esc(link)}">${esc(say('share.copy_link'))}</button><a class="button" href="${base}/share/qr/${t.key}.svg?download">${esc(say('share.download_qr_code'))}</a></p></div></li>`;
    };
    return {
      title: say('share.share'), back: base,
      body: `<p class="muted">Links to your site and its pages, and a QR code for each, for puppy packets, business cards and show tables. A link pasted into Facebook, Messenger or a text shows a picture card.${live ? '' : ' Publish your site first: these are the pages visitors can see.'}</p>
        <ul class="share-list">${targets.map(card).join('')}</ul>
        <p class="muted small">${esc(say('share.litters_and_albums_show'))}</p>`,
    };
  }

  return { shareScreen };
}

// Embeds (plan 3.3): videos and posts from a fixed list of providers, never HTML a
// breeder pasted. A pasted link is read into a provider and an item id; the site
// builds the player from that, loads it only when a visitor taps (until then, a
// preview stored on the site), and links to the original otherwise.
//
// Every provider is one entry here: how its links look, the player address, the
// address to open it on the provider, its shape, and where a preview comes from.
// Adding a provider means adding one entry (and its frame origin to FRAME_ORIGINS).

export class EmbedError extends Error {}

const ID = /^[A-Za-z0-9_-]+$/;
const enc = encodeURIComponent;

export const PROVIDERS = {
  youtube: {
    name: 'YouTube',
    // v:<id>, short:<id> or list:<id>
    read(u) {
      if (!/(^|\.)youtube\.com$|^youtu\.be$/.test(u.hostname)) return null;
      const short = u.pathname.match(/^\/shorts\/([A-Za-z0-9_-]{11})/);
      if (short) return `short:${short[1]}`;
      const v = u.hostname === 'youtu.be' ? u.pathname.slice(1, 12) : u.searchParams.get('v') ?? u.pathname.match(/^\/(?:embed|live)\/([A-Za-z0-9_-]{11})/)?.[1];
      if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return `v:${v}`;
      const list = u.searchParams.get('list');
      if (list && /^[A-Za-z0-9_-]{10,64}$/.test(list)) return `list:${list}`;
      return null;
    },
    src: (item) => {
      const [kind, id] = item.split(':');
      return kind === 'list' ? `https://www.youtube-nocookie.com/embed/videoseries?list=${enc(id)}&autoplay=1` : `https://www.youtube-nocookie.com/embed/${enc(id)}?autoplay=1&rel=0`;
    },
    link: (item) => {
      const [kind, id] = item.split(':');
      return kind === 'list' ? `https://www.youtube.com/playlist?list=${enc(id)}` : kind === 'short' ? `https://www.youtube.com/shorts/${enc(id)}` : `https://www.youtube.com/watch?v=${enc(id)}`;
    },
    shape: (item) => (item.startsWith('short:') ? 'tall' : 'wide'),
    preview: async (item) => (item.startsWith('list:') ? null : `https://i.ytimg.com/vi/${enc(item.split(':')[1])}/hqdefault.jpg`),
  },
  vimeo: {
    name: 'Vimeo',
    read(u) {
      if (!/(^|\.)vimeo\.com$/.test(u.hostname)) return null;
      const m = u.pathname.match(/(?:^|\/)(\d{6,12})(?:\/|$)/);
      return m ? m[1] : null;
    },
    src: (item) => `https://player.vimeo.com/video/${enc(item)}?autoplay=1&dnt=1`,
    link: (item) => `https://vimeo.com/${enc(item)}`,
    shape: () => 'wide',
    preview: async (item, fetchJson) => (await fetchJson(`https://vimeo.com/api/oembed.json?url=${enc(`https://vimeo.com/${item}`)}`))?.thumbnail_url ?? null,
  },
  tiktok: {
    name: 'TikTok',
    // <user>/<video id>
    read(u) {
      if (!/(^|\.)tiktok\.com$/.test(u.hostname)) return null;
      const m = u.pathname.match(/^\/@([A-Za-z0-9._]{1,40})\/video\/(\d{8,25})/);
      return m ? `${m[1]}/${m[2]}` : null;
    },
    src: (item) => `https://www.tiktok.com/embed/v2/${enc(item.split('/')[1])}`,
    link: (item) => `https://www.tiktok.com/@${item.split('/')[0]}/video/${item.split('/')[1]}`,
    shape: () => 'tall',
    preview: async (item, fetchJson) => (await fetchJson(`https://www.tiktok.com/oembed?url=${enc(PROVIDERS.tiktok.link(item))}`))?.thumbnail_url ?? null,
  },
  instagram: {
    name: 'Instagram',
    // p:<code> or reel:<code>
    read(u) {
      if (!/(^|\.)instagram\.com$/.test(u.hostname)) return null;
      const m = u.pathname.match(/^\/(?:[A-Za-z0-9._]+\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]{5,40})/);
      return m ? `${m[1] === 'p' || m[1] === 'tv' ? 'p' : 'reel'}:${m[2]}` : null;
    },
    src: (item) => { const [kind, code] = item.split(':'); return `https://www.instagram.com/${kind}/${enc(code)}/embed`; },
    link: (item) => { const [kind, code] = item.split(':'); return `https://www.instagram.com/${kind}/${enc(code)}/`; },
    shape: () => 'post',
    preview: async () => null,
  },
  facebook: {
    name: 'Facebook',
    // video:<path>, post:<path> or page:<page name>, the path on www.facebook.com
    read(u) {
      if (!/(^|\.)(facebook\.com|fb\.watch)$/.test(u.hostname) || u.hostname === 'fb.watch') return null;
      const path = u.pathname.replace(/\/+$/, '');
      const keep = (p) => (/^[A-Za-z0-9._\-/]{1,200}$/.test(p) ? p : null);
      if (path === '/watch' && /^\d{5,25}$/.test(u.searchParams.get('v') ?? '')) return `video:/watch/?v=${u.searchParams.get('v')}`;
      if (/\/(videos|reel)\/\d+/.test(path)) return keep(path) && `video:${path}`;
      if (path === '/permalink.php' || path === '/story.php') {
        const sid = u.searchParams.get('story_fbid'); const id = u.searchParams.get('id');
        return /^[A-Za-z0-9]{5,60}$/.test(sid ?? '') && /^\d{3,25}$/.test(id ?? '') ? `post:/permalink.php?story_fbid=${sid}&id=${id}` : null;
      }
      if (/\/(posts|photos|share\/p|share\/v)\//.test(path)) return keep(path) && `${/share\/v/.test(path) ? 'video' : 'post'}:${path}`;
      const page = path.match(/^\/([A-Za-z0-9.\-]{2,80})$/)?.[1];
      return page && !['watch', 'groups', 'events', 'marketplace', 'profile.php'].includes(page) ? `page:${page}` : null;
    },
    src: (item) => {
      const [kind, ...rest] = item.split(':');
      const target = rest.join(':');
      const href = enc(`https://www.facebook.com${kind === 'page' ? `/${target}` : target}`);
      if (kind === 'page') return `https://www.facebook.com/plugins/page.php?href=${href}&tabs=timeline&width=500&height=600&small_header=true&hide_cover=false`;
      return `https://www.facebook.com/plugins/${kind === 'video' ? 'video' : 'post'}.php?href=${href}&show_text=true&width=500`;
    },
    link: (item) => { const [kind, ...rest] = item.split(':'); const t = rest.join(':'); return `https://www.facebook.com${kind === 'page' ? `/${t}` : t}`; },
    shape: (item) => (item.startsWith('video:') ? 'wide' : 'post'),
    preview: async () => null,
  },
};

// Every page may frame these and nothing else (site.js SITE_CSP).
export const FRAME_ORIGINS = ['https://www.youtube-nocookie.com', 'https://player.vimeo.com', 'https://www.tiktok.com', 'https://www.instagram.com', 'https://www.facebook.com'];

// A pasted link → { provider, item }. Throws EmbedError with words for the breeder.
export function readEmbedLink(text) {
  let u;
  try { u = new URL(String(text ?? '').trim()); } catch { throw new EmbedError('Paste the link to the video or post, starting with https://'); }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new EmbedError('Paste the link to the video or post, starting with https://');
  u.hostname = u.hostname.toLowerCase();
  for (const [provider, p] of Object.entries(PROVIDERS)) {
    const item = p.read(u);
    if (item) {
      if (item.length > 260) throw new EmbedError('That link is too long.');
      return { provider, item };
    }
  }
  const known = Object.values(PROVIDERS).map((p) => p.name).join(', ');
  throw new EmbedError(`That link isn't one KennelPort can show. Links from ${known} work: open the video or post and copy its address.`);
}

// What the site needs to draw one, from what's stored.
export function embedView(e) {
  const p = PROVIDERS[e.provider];
  if (!p || !ID.test(e.provider)) return null;
  return { provider: e.provider, name: p.name, src: p.src(e.item), link: p.link(e.item), shape: p.shape(e.item), title: e.title, preview_photo_id: e.preview_photo_id ?? null };
}

// The preview's address, if the provider has one (YouTube's image; Vimeo's and
// TikTok's public oEmbed). Never throws: no preview means a plain placeholder.
export async function previewUrl(env, provider, item) {
  const fetchFn = env.EMBED_FETCH ?? fetch;
  const fetchJson = async (url) => {
    try { const r = await fetchFn(url, { headers: { accept: 'application/json' } }); return r.ok ? await r.json() : null; } catch { return null; }
  };
  try { return (await PROVIDERS[provider]?.preview(item, fetchJson)) ?? null; } catch { return null; }
}

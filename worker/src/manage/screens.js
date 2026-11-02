// The manage app's editing screens (phase 2): everything under /s/<subdomain>/.
// Every form posts to its own address and redirects back with a note; a form with
// a problem comes back with what was typed and the reason.
import { escapeHtml as esc } from '../lib/html.js';
import { json } from '../lib/http.js';
import { PAGES, HOME_BLOCKS, HOME_BLOCK_ORDER, SITE_FIELDS, ContentError } from '../content/model.js';
import {
  KINDS, listRecords, getRecord, saveRecord, setField, removeRecord, moveRecord,
  saveSite, getPage, savePage, getBlock, saveBlock,
} from '../content/records.js';
import { fields, parseForm } from './forms.js';
import { savePhoto, PhotoError } from '../photos.js';
import { buildSnapshot, loadSnapshot, publish, undoPublish, listSnapshots } from '../publish.js';
import { changes } from '../diff.js';
import { makePreviewToken } from '../site.js';
import { siteLink } from '../ops/sites.js';
import { STATUS_TEXT } from '../render/parts.js';

const redirect = (location) => new Response(null, { status: 303, headers: { location, 'cache-control': 'no-store' } });

const NOTES = {
  saved: 'Saved to your draft. Publish when you\'re ready.',
  added: 'Added to your draft.',
  removed: 'Removed from your draft.',
  moved: 'Moved.',
  status: 'Status changed in your draft.',
  uploaded: 'Photos added.',
  published: 'Published. Visitors now see your changes.',
  undone: 'Undone. Visitors see the version before.',
};
const note = (url) => (NOTES[url.searchParams.get('note')] ? `<p class="notice" role="status">${esc(NOTES[url.searchParams.get('note')])}</p>` : '');
const errorBox = (err) => (err ? `<p class="error" role="alert">Not saved: ${esc(err)}</p>` : '');

// What each list is called, and how one item reads in it.
const LISTS = {
  dogs: { title: 'Dogs', one: 'dog', name: (r) => r.call_name, sub: (r) => [r.role, r.show_on_site ? null : 'hidden'].filter(Boolean).join(' · ') },
  litters: { title: 'Litters', one: 'litter', name: (r) => r.name, sub: (r) => ({ planned: 'Planned', current: 'Born', past: 'Past' })[r.stage] },
  puppies: { title: 'Puppies', one: 'puppy', name: (r) => r.name, sub: (r) => STATUS_TEXT[r.status] ?? 'Hidden' },
  health: { title: 'Health results', one: 'result', name: (r) => r.test, sub: (r) => `${r.result}${r.show ? '' : ' · not shown'}` },
  reviews: { title: 'Reviews', one: 'review', name: (r) => r.first_name, sub: (r) => (r.status === 'hidden' ? 'hidden' : r.quote.slice(0, 60)) },
  steps: { title: 'How it works', one: 'step', name: (r) => r.heading, sub: () => '' },
  extras: { title: 'Extras', one: 'extra', name: (r) => r.name, sub: (r) => (r.kind === 'homegoing' ? `${r.weeks ?? ''}-week package` : r.grp ?? '') },
  policies: { title: 'Policies', one: 'policy', name: (r) => r.heading, sub: () => '' },
  faq: { title: 'FAQ', one: 'question', name: (r) => r.heading, sub: () => '' },
  waitlist_help: { title: 'Using your status page', one: 'section', name: (r) => r.heading, sub: () => '' },
};
const FORM_KIND = { policies: 'expander', faq: 'expander', waitlist_help: 'expander' };
const BLOCK_TITLES = { hero: 'Top of the page', facts: 'Facts row', story: 'Story', dogs: 'Dogs row', litters: 'Litters', reviews: 'Reviews', waitlist: 'Waitlist band' };

export function createScreens({ env, request, url, site, user, page }) {
  const base = `/s/${site.subdomain}`;
  const photoUrl = (id) => `${base}/photos/${id}/thumb`;
  let photosCache = null;
  const photos = async () => (photosCache ??= (await env.DB.prepare('SELECT id, alt FROM photos WHERE site_id = ? AND removed_at IS NULL ORDER BY created_at DESC').bind(site.id).all()).results);
  const dogsList = async () => (await env.DB.prepare('SELECT id, call_name FROM dogs WHERE site_id = ? ORDER BY sort').bind(site.id).all()).results;
  const ctxFor = async (kind) => ({ kind, photos: await photos(), photoUrl, dogs: await dogsList(), photosLink: `${base}/photos` });

  // ---------- one list of records, generic ----------
  async function collection(path, kind, scopeId, { back, parentTitle } = {}) {
    const k = KINDS[kind];
    const L = LISTS[kind];
    const rest = url.pathname.slice(path.length).replace(/^\//, '');
    const post = request.method === 'POST';
    const formKind = FORM_KIND[kind] ?? kind;
    const formFields = Object.fromEntries(Object.entries(k.fields).filter(([n]) => !(kind === 'reviews' && n === 'photo_id')));

    const form = async (rec, err, values) => {
      const action = rec ? `${path}/${rec.id}` : `${path}/new`;
      const body = `${errorBox(err)}<form method="post" action="${esc(action)}" data-save class="card">${fields(formFields, values ?? rec ?? { ...(k.defaults ?? {}) }, await ctxFor(formKind))}
        <button class="primary">${rec ? 'Save' : `Add ${L.one}`}</button></form>
        ${rec ? `<form method="post" action="${esc(`${path}/${rec.id}/remove`)}" class="card danger"><p class="muted small">Removing takes it off your draft; it stays on the live site until you publish.</p><button>Remove this ${L.one}</button></form>` : ''}`;
      return { title: rec ? L.name(rec) : `New ${L.one}`, back: path, body };
    };

    if (!rest) {
      if (post) return null;
      const rows = await listRecords(env, site.id, kind, scopeId);
      const items = rows.map((r, i) => `<li class="item"><a href="${esc(`${path}/${r.id}`)}"><b>${esc(L.name(r))}</b><span>${esc(L.sub(r) ?? '')}</span></a>
        <span class="order">${i ? `<form method="post" action="${esc(`${path}/${r.id}/up`)}"><button aria-label="Move ${esc(L.name(r))} up">↑</button></form>` : ''}${i < rows.length - 1 ? `<form method="post" action="${esc(`${path}/${r.id}/down`)}"><button aria-label="Move ${esc(L.name(r))} down">↓</button></form>` : ''}</span></li>`).join('');
      return { title: parentTitle ? `${parentTitle}: ${L.title}` : L.title, back: back ?? base, body: `${note(url)}<ul class="items">${items || `<li class="muted">None yet.</li>`}</ul><p><a class="button primary" href="${esc(`${path}/new`)}">Add ${L.one}</a></p>` };
    }
    if (rest === 'new') {
      if (!post) return form(null);
      const values = parseForm(formFields, await request.formData());
      try { await saveRecord(env, site.id, kind, null, values, scopeId); } catch (err) {
        if (err instanceof ContentError) return form(null, err.message, values);
        throw err;
      }
      return redirect(`${path}?note=added`);
    }
    const m = rest.match(/^([0-9a-f-]{36})(?:\/(remove|up|down))?$/);
    if (!m) return null;
    const rec = await getRecord(env, site.id, kind, m[1]);
    if (!rec || (k.scope && rec[k.scope] !== scopeId)) return null;
    if (m[2]) {
      if (!post) return null;
      if (m[2] === 'remove') { await removeRecord(env, site.id, kind, rec.id); return redirect(`${path}?note=removed`); }
      await moveRecord(env, site.id, kind, rec.id, m[2] === 'up' ? -1 : 1, scopeId);
      return redirect(`${path}?note=moved`);
    }
    if (!post) {
      const view = await form(rec);
      view.body = note(url) + view.body;
      return { ...view, rec };
    }
    const values = parseForm(formFields, await request.formData());
    try { await saveRecord(env, site.id, kind, rec.id, values, scopeId); } catch (err) {
      if (err instanceof ContentError) return form(rec, err.message, values);
      throw err;
    }
    return redirect(`${path}/${rec.id}?note=saved`);
  }

  // A record's page plus the list under it (a dog's health results, a litter's puppies).
  async function withChildren(view, childPath, childKind, label) {
    if (!view?.rec) return view;
    const rows = await listRecords(env, site.id, childKind, view.rec.id);
    const L = LISTS[childKind];
    view.body += `<section class="card"><h2>${esc(label)}</h2><ul class="items">${rows.map((r) => `<li class="item"><a href="${esc(`${childPath}/${r.id}`)}"><b>${esc(L.name(r))}</b><span>${esc(L.sub(r) ?? '')}</span></a></li>`).join('') || '<li class="muted">None yet.</li>'}</ul>
      <p><a class="button" href="${esc(childPath)}">Edit the list</a> <a class="button" href="${esc(`${childPath}/new`)}">Add ${L.one}</a></p></section>`;
    return view;
  }

  // ---------- puppies: the quick screen ----------
  async function puppies() {
    const post = request.method === 'POST';
    const m = url.pathname.match(/\/puppies\/([0-9a-f-]{36})\/status$/);
    if (m && post) {
      const form = await request.formData();
      try { await setField(env, site.id, 'puppies', m[1], 'status', String(form.get('status') ?? '')); } catch (err) {
        if (!(err instanceof ContentError)) throw err;
      }
      return redirect(`${base}/puppies?note=status`);
    }
    if (post) return null;
    const litters = (await listRecords(env, site.id, 'litters')).filter((l) => l.stage === 'current');
    const sections = [];
    for (const l of litters) {
      const pups = await listRecords(env, site.id, 'puppies', l.id);
      sections.push(`<section class="card"><h2>${esc(l.name)}</h2>${pups.map((p) => `<form method="post" action="${esc(`${base}/puppies/${p.id}/status`)}" class="pup" data-save>
          <a href="${esc(`${base}/litters/${l.id}/puppies/${p.id}`)}"><b>${esc(p.name)}</b><span>${esc([p.collar, p.sex === 'female' ? 'girl' : 'boy'].filter(Boolean).join(' · '))}</span></a>
          <select name="status" aria-label="${esc(p.name)}'s status">${Object.entries({ ...STATUS_TEXT, hidden: 'Hidden' }).map(([v, t]) => `<option value="${v}"${v === p.status ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>
          <button>Set</button></form>`).join('') || '<p class="muted">No puppies yet.</p>'}
        <p><a class="button" href="${esc(`${base}/litters/${l.id}/puppies/new`)}">Add a puppy</a></p></section>`);
    }
    return { title: 'Puppies', back: base, body: `${note(url)}${sections.join('') || `<section class="card"><p class="muted">No current litters. <a href="${esc(`${base}/litters/new`)}">Add a litter</a>.</p></section>`}` };
  }

  // ---------- kennel details, pages, Home ----------
  async function details() {
    const row = await env.DB.prepare('SELECT * FROM sites WHERE id = ?').bind(site.id).first();
    const render = async (err, values) => ({ title: 'Kennel details', back: base, body: `${note(url)}${errorBox(err)}<form method="post" action="${base}/details" data-save class="card">${fields(SITE_FIELDS, values ?? row, await ctxFor('site'))}<button class="primary">Save</button></form>` });
    if (request.method !== 'POST') return render();
    const values = parseForm(SITE_FIELDS, await request.formData());
    try { await saveSite(env, site.id, values); } catch (err) {
      if (err instanceof ContentError) return render(err.message, values);
      throw err;
    }
    return redirect(`${base}/details?note=saved`);
  }

  async function pages() {
    const key = url.pathname.split('/')[4];
    if (!key) {
      const rows = [];
      for (const [k, p] of Object.entries(PAGES)) {
        if (k === 'privacy') continue;
        const v = await getPage(env, site.id, k);
        rows.push(`<li class="item"><a href="${base}/pages/${k}"><b>${esc(v.menu_label || p.label)}</b><span>${esc(p.path)}${p.canHide && !v.enabled ? ' · off' : ''}</span></a></li>`);
      }
      return { title: 'Pages', back: base, body: `${note(url)}<ul class="items"><li class="item"><a href="${base}/home"><b>Home</b><span>/ · block by block</span></a></li>${rows.join('')}</ul>` };
    }
    const p = PAGES[key];
    if (!p || key === 'privacy') return null;
    const all = { ...(p.canHide ? { enabled: { type: 'bool' } } : {}), menu_label: { type: 'text', max: 40 }, ...p.fields };
    const current = await getPage(env, site.id, key);
    const render = async (err, values) => ({
      title: p.label, back: `${base}/pages`,
      body: `${note(url)}${errorBox(err)}<form method="post" action="${base}/pages/${key}" data-save class="card">
        ${p.canHide ? fieldsWithLabel(all, values ?? current, await ctxFor(key === 'extras' ? 'extras_page' : key), { enabled: ['This page is on', 'Off: it leaves the menu and its address says "This page isn\'t available". Its words are kept.'], menu_label: ['Name in the menu', `Leave empty for "${p.label}".`] }) : fieldsWithLabel(all, values ?? current, await ctxFor(key), { menu_label: ['Name in the menu', `Leave empty for "${p.label}".`] })}
        <button class="primary">Save</button></form>
        ${listLinkFor(key)}`,
    });
    if (request.method !== 'POST') return render();
    const values = parseForm(all, await request.formData());
    try { await savePage(env, site.id, key, values); } catch (err) {
      if (err instanceof ContentError) return render(err.message, values);
      throw err;
    }
    return redirect(`${base}/pages/${key}?note=saved`);
  }

  const listLinkFor = (key) => {
    const kind = { reviews: 'reviews', how_it_works: 'steps', extras: 'extras', policies: 'policies', faq: 'faq', waitlist_help: 'waitlist_help', dogs: 'dogs', litters: 'litters' }[key];
    if (!kind) return '';
    const href = ['dogs', 'litters'].includes(kind) ? `${base}/${kind}` : `${base}/lists/${kind}`;
    return `<p><a class="button" href="${esc(href)}">Edit the ${esc(LISTS[kind].title.toLowerCase())} on this page</a></p>`;
  };

  function fieldsWithLabel(list, values, ctx, labels) {
    // Page-level fields have their own words; everything else comes from forms.js.
    return Object.entries(list).map(([n, f]) => {
      if (!labels[n]) return fields({ [n]: f }, values, ctx);
      const [label, hint] = labels[n];
      if (f.type === 'bool') return `<label class="check"><input type="checkbox" name="${n}" value="1"${values?.[n] ? ' checked' : ''}> <span>${esc(label)}<span class="hint">${esc(hint)}</span></span></label>`;
      return `<label>${esc(label)}<span class="hint">${esc(hint)}</span><input name="${n}" value="${esc(values?.[n] ?? '')}" maxlength="${f.max}"></label>`;
    }).join('\n');
  }

  async function home() {
    const key = url.pathname.split('/')[4];
    if (!key) {
      const rows = [];
      for (const b of HOME_BLOCK_ORDER) {
        const v = await getBlock(env, site.id, b);
        rows.push(`<li class="item"><a href="${base}/home/${b}"><b>${esc(BLOCK_TITLES[b])}</b><span>${v.enabled ? 'on' : 'off'}</span></a></li>`);
      }
      return { title: 'Home page', back: `${base}/pages`, body: `${note(url)}<p class="muted">Home is a fixed sequence of blocks. Switch each on or off and change its words.</p><ul class="items">${rows.join('')}</ul>` };
    }
    const flds = HOME_BLOCKS[key];
    if (!flds) return null;
    const all = { enabled: { type: 'bool' }, ...flds };
    const current = await getBlock(env, site.id, key);
    const render = async (err, values) => ({
      title: BLOCK_TITLES[key], back: `${base}/home`,
      body: `${note(url)}${errorBox(err)}<form method="post" action="${base}/home/${key}" data-save class="card">${fieldsWithLabel(all, values ?? current, await ctxFor(key), { enabled: ['This block is on', 'Off: it leaves the home page; its words are kept.'] })}<button class="primary">Save</button></form>`,
    });
    if (request.method !== 'POST') return render();
    const values = parseForm(all, await request.formData());
    try { await saveBlock(env, site.id, key, values); } catch (err) {
      if (err instanceof ContentError) return render(err.message, values);
      throw err;
    }
    return redirect(`${base}/home/${key}?note=saved`);
  }

  // ---------- photos ----------
  async function photosScreen() {
    const rest = url.pathname.slice(`${base}/photos`.length);
    const post = request.method === 'POST';
    if (rest === '/upload' && post) {
      const form = await request.formData();
      const full = form.get('full');
      const thumb = form.get('thumb');
      if (!full || typeof full === 'string') return json({ message: 'No photo was sent.' }, 400);
      try {
        const saved = await savePhoto(env, site.id, { full: new Uint8Array(await full.arrayBuffer()), thumb: thumb && typeof thumb !== 'string' ? new Uint8Array(await thumb.arrayBuffer()) : null, alt: form.get('alt') });
        return json({ id: saved.id });
      } catch (err) {
        if (err instanceof PhotoError) return json({ message: err.message }, 400);
        throw err;
      }
    }
    let m = rest.match(/^\/([0-9a-f-]{36})\/thumb$/);
    if (m && !post) {
      const p = await env.DB.prepare('SELECT r2_key, thumb_key, type FROM photos WHERE id = ? AND site_id = ?').bind(m[1], site.id).first();
      const obj = p && await env.FILES.get(p.thumb_key || p.r2_key);
      if (!obj) return new Response('Not found', { status: 404 });
      return new Response(obj.body, { headers: { 'content-type': p.type, 'cache-control': 'private, max-age=86400' } });
    }
    m = rest.match(/^\/([0-9a-f-]{36})\/(alt|remove)$/);
    if (m && post) {
      const t = new Date().toISOString();
      if (m[2] === 'alt') {
        const alt = String((await request.formData()).get('alt') ?? '').replace(/\s+/g, ' ').trim().slice(0, 200) || null;
        await env.DB.batch([env.DB.prepare('UPDATE photos SET alt = ? WHERE id = ? AND site_id = ?').bind(alt, m[1], site.id), env.DB.prepare('UPDATE sites SET draft_changed_at = ? WHERE id = ?').bind(t, site.id)]);
        return redirect(`${base}/photos?note=saved`);
      }
      await env.DB.batch([env.DB.prepare('UPDATE photos SET removed_at = ? WHERE id = ? AND site_id = ?').bind(t, m[1], site.id), env.DB.prepare('UPDATE sites SET draft_changed_at = ? WHERE id = ?').bind(t, site.id)]);
      return redirect(`${base}/photos?note=removed`);
    }
    if (rest || post) return null;
    const list = await photos();
    return {
      title: 'Photos', back: base,
      body: `${note(url)}<form id="photo-form" class="card" method="post" action="${base}/photos/upload">
        <label>Add photos<input type="file" accept="image/*" multiple required></label>
        <label>What's in the photo<span class="hint">Helps visitors who use screen readers, and search engines. For example "Willow on autumn leaves".</span><input name="alt" maxlength="200"></label>
        <button class="primary">Upload</button><p id="photo-status" class="muted small" role="status"></p>
        <p class="muted small">Photos are made smaller on your phone before they're sent, and the camera's location is removed.</p></form>
        <ul class="ph-list">${list.map((p) => `<li class="card"><img src="${esc(photoUrl(p.id))}" alt="${esc(p.alt || 'Photo')}" loading="lazy">
          <form method="post" action="${base}/photos/${p.id}/alt" data-save><label>Description<input name="alt" value="${esc(p.alt ?? '')}" maxlength="200"></label><button>Save</button></form>
          <form method="post" action="${base}/photos/${p.id}/remove"><button class="link">Remove</button></form></li>`).join('')}</ul>
        <script src="/_kp/m/photos.js" defer></script>`,
    };
  }

  // ---------- publish ----------
  async function publishScreen() {
    const rest = url.pathname.slice(`${base}/publish`.length);
    if (request.method === 'POST') {
      try {
        if (rest === '/undo') { await undoPublish(env, site.id); return redirect(`${base}/publish?note=undone`); }
        if (!rest) { await publish(env, site.id, user.emailHash.slice(0, 12)); return redirect(`${base}/publish?note=published`); }
      } catch (err) {
        return { title: 'Publish', back: base, body: `<p class="error" role="alert">${esc(err.message)}</p><p><a href="${base}/publish">Back</a></p>` };
      }
      return null;
    }
    if (rest) return null;
    const row = await env.DB.prepare('SELECT published_snapshot_id FROM sites WHERE id = ?').bind(site.id).first();
    const live = await loadSnapshot(env, site.id, row.published_snapshot_id);
    const draft = await buildSnapshot(env, site.id);
    const list = changes(live, draft);
    const token = await makePreviewToken(env, site.id, 1);
    const prev = (path) => siteLink(env, site.subdomain, `/__preview?t=${encodeURIComponent(token)}&next=${encodeURIComponent(path)}`);
    const snaps = await listSnapshots(env, site.id);
    return {
      title: 'Publish', back: base,
      body: `${note(url)}<section class="card"><h2>${list.length ? 'Changes since your last publish' : 'Nothing to publish'}</h2>
        ${list.length ? `<ul class="changes">${list.map((c) => `<li><span>${esc(c.text)}</span>${c.path ? `<a href="${esc(prev(c.path))}">Preview</a>` : ''}</li>`).join('')}</ul>` : '<p class="muted">Your website already shows everything in your draft.</p>'}
        <p class="row"><a class="button" href="${esc(prev('/'))}">Preview the whole site</a></p>
        ${list.length ? `<form method="post" action="${base}/publish"><button class="primary">Publish ${list.length} change${list.length === 1 ? '' : 's'}</button></form>` : ''}</section>
        ${snaps.length > 1 ? `<form method="post" action="${base}/publish/undo" class="card"><p class="muted small">Undo goes back to the version before the one visitors see now.</p><button>Undo last publish</button></form>` : ''}`,
    };
  }

  // ---------- routing ----------
  return async function route() {
    const p = url.pathname.slice(base.length);
    let view = null;
    if (p === '/puppies' || /^\/puppies\/[0-9a-f-]{36}\/status$/.test(p)) view = await puppies();
    else if (p === '/details') view = await details();
    else if (p.startsWith('/pages')) view = await pages();
    else if (p.startsWith('/home')) view = await home();
    else if (p.startsWith('/photos')) view = await photosScreen();
    else if (p.startsWith('/publish')) view = await publishScreen();
    else if (p.startsWith('/dogs')) {
      const hm = p.match(/^\/dogs\/([0-9a-f-]{36})\/health/);
      if (hm) {
        const dog = await getRecord(env, site.id, 'dogs', hm[1]);
        if (dog) view = await collection(`${base}/dogs/${dog.id}/health`, 'health', dog.id, { back: `${base}/dogs/${dog.id}`, parentTitle: dog.call_name });
      } else {
        view = await collection(`${base}/dogs`, 'dogs', null);
        if (view && !(view instanceof Response)) view = await withChildren(view, `${base}/dogs/${view.rec?.id}/health`, 'health', 'Health results');
      }
    } else if (p.startsWith('/litters')) {
      const pm = p.match(/^\/litters\/([0-9a-f-]{36})\/puppies/);
      if (pm) {
        const litter = await getRecord(env, site.id, 'litters', pm[1]);
        if (litter) view = await collection(`${base}/litters/${litter.id}/puppies`, 'puppies', litter.id, { back: `${base}/litters/${litter.id}`, parentTitle: litter.name });
      } else {
        view = await collection(`${base}/litters`, 'litters', null);
        if (view && !(view instanceof Response)) view = await withChildren(view, `${base}/litters/${view.rec?.id}/puppies`, 'puppies', 'Puppies');
      }
    } else {
      const lm = p.match(/^\/lists\/(reviews|steps|extras|policies|faq|waitlist_help)(\/|$)/);
      if (lm) view = await collection(`${base}/lists/${lm[1]}`, lm[1], null, { back: `${base}/pages` });
    }
    if (!view) return null;
    if (view instanceof Response) return view;
    return page(view.title, view.body, { back: view.back });
  };
}

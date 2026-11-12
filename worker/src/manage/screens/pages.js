// Her Pages and Home (/s/<sub>/pages, /s/<sub>/home, /s/<sub>/blocks/<page>/<block>):
// each page card by card in the order its parts sit on the page, the blocks the owner
// placed on it where they sit (hers to switch off and reword), and Home block by block.
// A screen of the Site Manager (manage/screens.js routes to it), made with what that
// file's createScreens holds for the request. Split out of screens.js
// (docs/review/senior-review-2026-11.md, item 7).
import { escapeHtml as esc } from '../../lib/html.js';
import { PAGES, HOME_BLOCKS, HOME_BLOCK_ORDER, HOME_WORDS, ContentError, CUSTOM_PAGE, ADDED_BLOCK_FIELDS } from '../../content/model.js';
import { getPage, savePage, getBlock, saveBlock, getAddedBlock, saveAddedBlock } from '../../content/records.js';
import { pageBlocks, customPages, addedBlocks, BLOCK_TYPES, isCustom, collageFromForm, PAGE_HEADS } from '../../content/blocks.js';
import { fields, field, parseForm } from '../forms.js';
import { buildSnapshot } from '../../publish.js';
import { sayMessage } from '../wording.js';
import { blockRows, pageOn as pageShows, label as pageMenuName } from '../../render/parts.js';
import { readFeed, parseFeedAddress, setFeed, FeedError, kennelosOrigin } from '../../feed.js';
import { loadBuild } from '../../content/rules.js';
import { redirect } from './parts.js';

export function pagesScreens({ base, ctxFor, embedErr, embedsCard, env, errorBox, kos, library, listTitle, note, photoUrl, photos, request, say, site, tagFromForm, url }) {
  // The KennelOS website feed (plan 3.8): pasted on the waitlist page's screen.
  async function kennelosCard(err, typed) {
    const row = await env.DB.prepare('SELECT kennelos_public_id FROM sites WHERE id = ?').bind(site.id).first();
    const id = row?.kennelos_public_id;
    const origin = kennelosOrigin(env);
    if (!origin) return '';
    let state = '';
    if (id) {
      const f = await readFeed(env, site.id, id);
      state = f.state === 'ok'
        ? `<p class="notice">Connected. ${f.feed.form ? esc(say('waitlistpage.you_take_applications_online')) : esc(say('waitlistpage.you_aren_t_taking'))}${f.stale ? ' KennelOS couldn\'t be reached just now; this is from its last copy.' : ''}</p>`
        : f.state === 'not_shared' ? `<p class="error">${esc(say('waitlistpage.kennelos_isn_t_sharing'))}</p>`
          : f.state === 'not_found' ? `<p class="error">${esc(say('waitlistpage.kennelos_has_no_waitlist'))}</p>`
            : `<p class="error">${esc(say('waitlistpage.kennelos_couldn_t_be'))}</p>`;
    }
    return `<form method="post" action="${base}/pages/waitlist/kennelos" class="card" id="kennelos"><h2>${esc(say('waitlistpage.your_kennelos_waitlist'))}</h2>
      ${id ? `<p class="muted small">${esc(say('waitlistpage.your_waitlist_page_shows'))}</p>` : `<p class="muted small">${esc(say('waitlistpage.keep_your_waitlist_in'))}</p>`}
      ${errorBox(err)}${state}
      <label>${esc(say('waitlistpage.website_feed_address'))}<input name="feed" value="${esc(typed ?? (id ? `${origin}/f/site/${id}` : ''))}" placeholder="${esc(origin)}/f/site/…" autocapitalize="none" spellcheck="false"></label>
      <div class="row"><button class="primary">${esc(say('waitlistpage.save'))}</button>${id ? `<button name="remove" value="1">${esc(say('waitlistpage.remove'))}</button>` : ''}</div></form>`;
  }

  async function pages() {
    const key = url.pathname.split('/')[4];
    if (key === 'waitlist' && url.pathname.split('/')[5] === 'kennelos') {
      if (request.method !== 'POST') return null;
      const fd = await request.formData();
      if (fd.get('remove')) { await setFeed(env, site.id, null); return redirect(`${base}/pages/waitlist?note=saved#kennelos`); }
      try { await setFeed(env, site.id, parseFeedAddress(env, fd.get('feed'))); } catch (err) {
        if (!(err instanceof FeedError)) throw err;
        return pagesView('waitlist', await kennelosCard(sayMessage('feed', err.message, say), String(fd.get('feed') ?? '')), { show: true });
      }
      return redirect(`${base}/pages/waitlist?note=saved#kennelos`);
    }
    return pagesView(key);
  }

  async function pagesView(key, kennelos = null, { show = false } = {}) {
    if (!key) {
      const rows = [];
      for (const [k, p] of Object.entries(PAGES)) {
        if (k === 'privacy') continue;
        const v = await getPage(env, site.id, k);
        rows.push(`<li class="item"><a href="${base}/pages/${k}"><b>${esc(v.menu_label || p.label)}</b><span>${esc(p.path)}${p.canHide && !v.enabled ? esc(say('pages.off_2')) : ''}</span></a></li>`);
      }
      // The pages KennelPort added to her site: hers to switch on or off and word.
      for (const c of customPages(await loadBuild(env, site.id))) {
        const v = await getPage(env, site.id, c.id);
        rows.push(`<li class="item"><a href="${base}/pages/${c.id}"><b>${esc(v.menu_label || c.name)}</b><span>${esc(c.path)}${!v.enabled ? esc(say('pages.off')) : ''}</span></a></li>`);
      }
      return { title: say('pages.pages'), back: base, body: `${note(url)}<ul class="items"><li class="item"><a href="${base}/home"><b>${esc(say('pages.home'))}</b><span>${esc(say('pages.block_by_block'))}</span></a></li>${rows.join('')}</ul>` };
    }
    const custom = isCustom(key) ? customPages(await loadBuild(env, site.id)).find((c) => c.id === key) : null;
    const p = custom ? { ...CUSTOM_PAGE, label: custom.name, path: custom.path } : PAGES[key];
    if (!p || key === 'privacy') return null;
    const all = { ...(p.canHide ? { enabled: { type: 'bool' } } : {}), menu_label: { type: 'text', max: 40 }, ...p.fields };
    const current = await getPage(env, site.id, key);
    const subject = key === 'about' ? 'page:about' : null;
    // Its heading's own words, shown where she has set none (render/parts.js pagehead).
    const defs = custom ? { heading: custom.name } : { ...(PAGE_HEADS[key] ?? {}) };

    const pick = subject ? { groups: [{ label: `Photos for ${p.label}`, subject }], tags: [subject], alt: '' } : undefined;
    // Her page, card by card in the order its parts sit on the page: its on/off and
    // menu name, then its heading and its own words where those parts sit, with the
    // blocks placed on it in between, each where it goes. Neighbouring parts of her
    // page share one card; each card saves only its own fields (_part).
    const render = async (err, values) => {
      const ctx = await ctxFor(key === 'extras' ? 'extras_page' : key === 'products' ? 'products_page' : key, pick);
      const labels = p.canHide ? { enabled: [say('pages.this_page_is_on'), say('pages.off_it_leaves_the')], menu_label: [say('pages.name_in_the_menu_2'), `Leave empty for "${p.label}".`] } : { menu_label: [say('pages.name_in_the_menu'), `Leave empty for "${p.label}".`] };
      const blocks = pageBlocks(await loadBuild(env, site.id), key);
      const added = new Set(addedBlocks(key, blocks).map((b) => b.id));
      const snap = added.size ? await buildSnapshot(env, site.id) : null;
      const names = Object.keys(all);
      const top = names.filter((n) => n === 'enabled' || n === 'menu_label');
      const head = names.filter((n) => ['eyebrow', 'heading', 'lede'].includes(n));
      const rest = names.filter((n) => !top.includes(n) && !head.includes(n));
      const segs = [];
      const pagePart = (ns, links = false) => {
        const last = segs.at(-1);
        if (last?.names) { last.names.push(...ns); last.links ||= links; } else segs.push({ names: [...ns], links });
      };
      pagePart(top);
      let headDone = false, restDone = false, embedsDone = key !== 'about';
      for (const b of blocks) {
        if (b.type === 'head' && !headDone) { pagePart(head); headDone = true; }
        else if (b.type === 'builtin' && !restDone) { pagePart(rest, true); restDone = true; }
        else if (b.type === 'embeds' && !embedsDone) { segs.push({ html: await embedsCard('about', `${base}/pages/about`, embedErr()) }); embedsDone = true; }
        else if (added.has(b.id)) segs.push({ html: await addedCard(key, b, snap) });
      }
      if (!headDone) segs.find((x) => x.names)?.names.push(...head);
      if (!restDone) pagePart(rest, true);
      if (!embedsDone) segs.push({ html: await embedsCard('about', `${base}/pages/about`, embedErr()) });
      const links = `${key === 'waitlist' ? await waitlistLinks() : listLinkFor(key)}`;
      const pageCards = segs.filter((x) => x.names?.length).length;
      const cards = [];
      for (const x of segs) {
        if (x.html) { cards.push(x.html); continue; }
        if (!x.names.length) { if (x.links) cards.push(links); continue; }
        const list = Object.fromEntries(x.names.map((n) => [n, all[n]]));
        cards.push(`<form method="post" action="${base}/pages/${key}" data-save class="card">${pageCards > 1 ? `<input type="hidden" name="_part" value="${esc(x.names.join(','))}">` : ''}
        ${fieldsWithLabel(list, shownWith(values ?? current, defs), ctx, labels)}
        <button class="primary">${esc(say('pages.save_2'))}</button></form>${x.links ? links : ''}`);
      }
      return { title: p.label, back: `${base}/pages`, body: `${note(url)}${key === 'waitlist' ? kennelos ?? await kennelosCard() : ''}${errorBox(err)}${cards.join('\n')}` };
    };
    if (request.method !== 'POST' || show) return render();
    const fd = await request.formData();
    // One card's fields (_part), over what she has saved; or the whole page.
    const part = fd.has('_part') ? String(fd.get('_part')).split(',').filter((n) => Object.hasOwn(all, n)) : null;
    const list = part ? Object.fromEntries(part.map((n) => [n, all[n]])) : all;
    const values = part ? { ...current, ...keepUnset(parseForm(list, fd), defs) } : keepUnset(parseForm(all, fd), defs);
    try { await savePage(env, site.id, key, values); } catch (err) {
      if (err instanceof ContentError) return render(err.message, values);
      throw err;
    }
    if (subject) await tagFromForm(list, values, fd, [subject]);
    return redirect(`${base}/pages/${key}?note=saved`);
  }

  // Under the waitlist page's settings: its questions and the simple waitlist, each
  // marked when a linked KennelOS waitlist means it isn't used.
  async function waitlistLinks() {
    const k = await kos();
    const questions = k.online
      ? `<p class="muted small">${esc(say('waitlistpage.your_application_questions_aren'))} <a href="` + base + '/lists/questions">See them anyway</a></p>'
      : listLinkFor('waitlist');
    const simple = k.linked
      ? `<p class="muted small">${esc(say('waitlistpage.your_simple_waitlist_isn'))}</p>`
      : `<p><a class="button" href="${base}/waitlist">${esc(say('waitlistpage.your_waitlist'))}</a></p>`;
    return questions + simple;
  }

  const listLinkFor = (key) => {
    const kind = { reviews: 'reviews', how_it_works: 'steps', extras: 'extras', products: 'products', pickup: 'products', policies: 'policies', faq: 'faq', waitlist_help: 'waitlist_help', dogs: 'dogs', litters: 'litters', waitlist: 'questions', albums: 'albums' }[key];
    if (!kind) return '';
    const href = ['dogs', 'litters'].includes(kind) ? `${base}/${kind}` : `${base}/lists/${kind}`;
    return `<p><a class="button" href="${esc(href)}">Edit the ${esc(listTitle(kind).toLowerCase())} on this page</a></p>`;
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

  // A block placed on a page (content/blocks.js addedBlocks): hers to switch off
  // and reword, drawn like the rest of her page, where it sits. Its own small form.
  async function addedCard(key, b, snap) {
    if (BLOCK_TYPES[b.type].kind === 'own') return ownCard(key, b, snap);
    const what = { dogs: say('pages.your_dogs_from_kennelos'), litters: say('pages.your_litters_from_kennelos'), pups: say('pages.your_pups_from_kennelos'), reviews: say('pages.your_reviews') };
    const nameOf = { dogs: (d) => d.call_name, litters: (l) => l.name, pups: (p) => p.name, reviews: (r) => r.first_name || say('pages.a_family') };
    const cur = await getAddedBlock(env, site.id, key, b.id);
    const rows = blockRows(snap, b);
    const names = (b.limit ? rows.slice(0, b.limit) : rows).map(nameOf[b.type]);
    const input = (n, label, max, half) => `<div class="f${half ? ' half' : ''}"><label>${esc(label)}<input name="${n}" value="${esc(cur[n] ?? b.w[n] ?? '')}" maxlength="${max}"><span class="hint">${esc(say('pages.own.empty_none'))}</span></label></div>`;
    return `<form method="post" action="${base}/blocks/${esc(key)}/${esc(b.id)}" data-save class="card added${cur.enabled ? '' : ' off'}" id="b-${esc(b.id)}">
        <div class="between"><h2 class="added-h">${esc(cur.heading || b.w.heading || BLOCK_TYPES[b.type].name)}</h2>
          <div class="switches"><label class="check">${esc(say('pages.show_it'))}<input type="checkbox" name="enabled" value="1"${cur.enabled ? ' checked' : ''}></label></div></div>
        <p class="muted small">${esc(what[b.type])}: ${names.length ? esc(names.join(', ')) : 'none right now, so it hides'}.</p>
        <div class="fgrid">${input('eyebrow', say('pages.eyebrow'), ADDED_BLOCK_FIELDS.eyebrow.max, true)}${input('heading', say('pages.heading'), ADDED_BLOCK_FIELDS.heading.max, true)}${input('lede', say('pages.line_under_it'), ADDED_BLOCK_FIELDS.lede.max, false)}</div>
        <button class="primary">${esc(say('pages.save'))}</button></form>`;
  }

  // One of the owner's own blocks (content/blocks.js, step 4): hers to switch off and
  // reword; an outside link, phone or email she can change; a page link is the owner's
  // (decision 18); the photo, where the owner lets her.
  const WORD_KEYS = ['heading', 'line', 'label', 'caption', 'body'];
  async function ownCard(key, b, snap) {
    const cur = await getAddedBlock(env, site.id, key, b.id);
    const empty = (t) => (t ? say('pages.own.empty_is', { text: t }) : '');
    const none = say('pages.own.empty_none');
    // Her words where she has typed some (emptied too), else the owner's: what shows.
    const shown = (n) => cur[n] ?? b.w?.[n];
    // A button's words post as button_label: the app fills any field named label
    // with the device's name (the sign-in form's).
    const input = (n, label, max, half, hint = '', ph = '') => `<div class="f${half ? ' half' : ''}"><label>${esc(label)}<input name="${n === 'label' ? 'button_label' : n}" value="${esc((WORD_KEYS.includes(n) ? shown(n) : cur[n]) ?? '')}" maxlength="${max}"${ph && !WORD_KEYS.includes(n) ? ` placeholder="${esc(ph)}"` : ''}>${hint ? `<span class="hint">${esc(hint)}</span>` : ''}</label></div>`;
    const F = ADDED_BLOCK_FIELDS;
    const parts = [];
    if (b.type === 'banner' || b.type === 'overlay') parts.push(input('heading', say('pages.heading'), F.heading.max, true, none, b.w.heading), input('label', say('pages.own.button_words'), F.label.max, true, none, b.w.label), input('line', say('pages.own.a_line'), F.line.max, false, none, b.w.line));
    if (b.type === 'words') parts.push(input('heading', say('pages.heading'), F.heading.max, true, none, b.w.heading), input('line', say('pages.line_under_it'), F.line.max, true, none, b.w.line),
      `<div class="f"><label>${esc(say('pages.own.words_body'))}<textarea name="body" rows="6" maxlength="${F.body.max}">${esc(shown('body') ?? '')}</textarea><span class="hint">${esc(say('pages.own.words_body_hint'))}</span></label></div>`);
    if (b.type === 'factrow') {
      // Hers, row by row; all empty follows KennelPort's.
      const mine = cur.facts?.length ? cur.facts : [];
      const rows = Array.from({ length: F.facts.max }, (_, i) => mine[i] ?? ['', '']);
      const ph = (i, j) => (!mine.length && b.items[i]?.[j] ? ` placeholder="${esc(b.items[i][j])}"` : '');
      parts.push(`<div class="f"><fieldset><legend>${esc(say('pages.own.facts'))}<span class="hint">${esc(say('pages.own.facts_hint'))}</span></legend>${rows.map(([v, l], i) => `<div class="pair"><input name="facts.${i}.0" value="${esc(v)}" maxlength="${F.facts.keyMax}" aria-label="${esc(say('pages.own.fact_value', { n: i + 1 }))}"${ph(i, 0)}><input name="facts.${i}.1" value="${esc(l)}" maxlength="${F.facts.valueMax}" aria-label="${esc(say('pages.own.fact_label', { n: i + 1 }))}"${ph(i, 1)}></div>`).join('')}</fieldset></div>`);
    }
    if (b.type === 'columns') {
      // Her heading and sections; all sections empty follows KennelPort's.
      parts.push(input('heading', say('pages.heading'), F.heading.max, true, none, b.w.heading), input('line', say('pages.line_under_it'), F.line.max, true, none, b.w.line));
      const mine = cur.cols?.length ? cur.cols : [];
      const rows = Array.from({ length: F.cols.max }, (_, i) => mine[i] ?? ['', '']);
      const ph = (i, j) => (!mine.length && b.cols[i]?.[j] ? ` placeholder="${esc(b.cols[i][j])}"` : '');
      parts.push(`<div class="f"><fieldset><legend>${esc(say('pages.own.cols'))}<span class="hint">${esc(say('pages.own.cols_hint'))}</span></legend>${rows.map(([h, t], i) => `<label>${esc(say('pages.own.col_heading', { n: i + 1 }))}<input name="cols.${i}.0" value="${esc(h)}" maxlength="${F.cols.keyMax}"${ph(i, 0)}></label><label>${esc(say('pages.own.col_words', { n: i + 1 }))}<textarea name="cols.${i}.1" rows="4" maxlength="${F.cols.valueMax}"${ph(i, 1)}>${esc(t)}</textarea></label>`).join('')}</fieldset></div>`);
    }
    if (b.type === 'gallery') parts.push(input('heading', say('pages.heading'), F.heading.max, true, none, b.w.heading), input('line', say('pages.line_under_it'), F.line.max, true, none, b.w.line),
      ...(b.source === 'album' && b.more ? [input('label', say('pages.own.album_link'), F.label.max, true, none, b.w.label)] : []));
    if (b.type === 'beside') parts.push(input('heading', say('pages.heading'), F.heading.max, true, none, b.w.heading), input('label', say('pages.own.button_words'), F.label.max, true, none, b.w.label),
      `<div class="f"><label>${esc(say('pages.own.words_body'))}<textarea name="body" rows="6" maxlength="${F.body.max}">${esc(shown('body') ?? '')}</textarea><span class="hint">${esc(say('pages.own.words_body_hint'))}</span></label></div>`);
    if (b.type === 'button') parts.push(input('label', say('pages.own.button_words'), F.label.max, true, none, b.w.label));
    const l = b.link;
    let linkNote = '';
    if (l?.to === 'url') parts.push(input('url', say('pages.own.address'), 300, false, empty(l.value), l.value));
    if (l?.to === 'tel' || l?.to === 'sms') parts.push(input('phone', say('pages.own.phone'), F.phone.max, true, l.value ? empty(l.value) : say('pages.own.from_details'), l.value || snap.site.contact_phone || ''));
    if (l?.to === 'email') parts.push(input('email', say('pages.own.email'), 254, true, l.value ? empty(l.value) : say('pages.own.from_details'), l.value || snap.site.contact_email || ''));
    if (l?.to === 'page') {
      const name = l.page === 'home' ? 'Home' : pageMenuName(snap, l.page);
      linkNote = `<p class="muted small">${esc(say('pages.own.goes_to', { page: name }))}${l.page !== 'home' && !pageShows(snap, l.page, { today: new Date().toISOString().slice(0, 10) }) ? ` ${esc(say('pages.own.hidden', { page: name }))}` : ''}</p>`;
    }
    let photo = '';
    if (['photo', 'overlay', 'beside'].includes(b.type) && b.mayChange) {
      photo = field('photo_id', { type: 'photo' }, cur.photo_id || b.photo || '', { kind: 'pages', say, library: library(), photos: await photos(), photoUrl });
      if (b.type === 'photo') parts.push(input('caption', say('pages.own.caption'), F.caption.max, false, none, b.w.caption));
    } else if ((b.type === 'photo' || b.type === 'overlay') && !b.photo) linkNote += `<p class="muted small">${esc(say('pages.own.no_photo'))}</p>`;
    if (b.type === 'collage' && b.mayChange) {
      // A photo for each of the owner's boxes (her layout and frame), as on Home's collage.
      const mine = cur.photos?.length;
      photo = `<p class="muted small">${esc(say('pages.own.collage_photos'))}</p>${field('photos', { ...ADDED_BLOCK_FIELDS.photos, boxes: true }, mine ? cur.photos : b.photos, { kind: 'pages', say, library: library(), photos: await photos(), photoUrl, values: { layout: b.layout, focus: mine ? cur.focus ?? [] : b.focus } })}`;
    } else if (b.type === 'gallery' && b.mayChange) {
      // Her own photos for the strip, picked in the photo library window; none: the owner's.
      photo = `<p class="muted small">${esc(say('pages.own.gallery_photos'))}</p>${field('photos', ADDED_BLOCK_FIELDS.photos, cur.photos ?? [], { kind: 'pages', say, library: library(), photos: await photos(), photoUrl })}`;
    } else if (b.type === 'collage' && !b.photos.length) linkNote += `<p class="muted small">${esc(say('pages.own.no_photos'))}</p>`;
    return `<form method="post" action="${base}/blocks/${esc(key)}/${esc(b.id)}" data-save class="card added${cur.enabled ? '' : ' off'}" id="b-${esc(b.id)}">
        <div class="between"><h2 class="added-h">${esc(cur.heading || cur.label || b.w?.heading || b.w?.label || say(`pages.own.${b.type}`))}</h2>
          <div class="switches"><label class="check">${esc(say('pages.show_it'))}<input type="checkbox" name="enabled" value="1"${cur.enabled ? ' checked' : ''}></label></div></div>
        <p class="muted small">${esc(say(`pages.own.${b.type}`))}.</p>${linkNote}${photo}
        ${parts.length ? `<div class="fgrid">${parts.join('')}</div>` : ''}
        <button class="primary">${esc(say('pages.save'))}</button></form>`;
  }

  // Headings and the lines round them show as typed (model.js CLR): where she has set
  // none, her form shows the site's own words, so what's in the box is what shows and
  // emptying it shows nothing. Saved unchanged, they stay unset and keep following
  // the site's own (a renamed kennel, the owner's starting words).
  const sameWords = (v, d) => d != null && String(v ?? '').replace(/\s+/g, ' ').trim() === String(d).replace(/\s+/g, ' ').trim();
  const shownWith = (values, defs) => ({ ...values, ...Object.fromEntries(Object.entries(defs).filter(([k, d]) => d != null && values?.[k] == null)) });
  const keepUnset = (values, defs) => { for (const [k, d] of Object.entries(defs)) if (k in values && sameWords(values[k], d)) values[k] = null; return values; };

  // A facts row's rows as she typed them, the empty ones dropped.
  const factsFrom = (fd) => Array.from({ length: ADDED_BLOCK_FIELDS.facts.max }, (_, i) => [String(fd.get(`facts.${i}.0`) ?? '').trim(), String(fd.get(`facts.${i}.1`) ?? '').trim()]).filter(([v, l]) => v || l);

  // Text in columns' sections as she typed them, the empty ones dropped.
  const colsFrom = (fd) => Array.from({ length: ADDED_BLOCK_FIELDS.cols.max }, (_, i) => [String(fd.get(`cols.${i}.0`) ?? '').trim(), String(fd.get(`cols.${i}.1`) ?? '').trim()]).filter(([h, t]) => h || t);

  // A collage's photos as she picked them, box by box in the owner's layout.
  const collageMine = (fd, b) => { const { photos: ids, focus } = collageFromForm((n) => fd.get(n), b.layout); return { photos: ids, focus }; };

  async function addedAction() {
    const [, , , , page, block] = url.pathname.split('/');
    if (request.method !== 'POST') return null;
    const b = addedBlocks(page, pageBlocks(await loadBuild(env, site.id), page)).find((x) => x.id === block);
    if (!b) return null;
    const back = page === 'home' ? `${base}/home` : `${base}/pages/${page}`;
    const fd = await request.formData();
    try {
      const own = BLOCK_TYPES[b.type].kind === 'own';
      const pick = (...ks) => Object.fromEntries(ks.filter((k) => fd.has(k)).map((k) => [k, fd.get(k)]));
      const owners = b.w ?? {};
      await saveAddedBlock(env, site.id, page, block, keepUnset(own
        ? { enabled: fd.get('enabled') != null, ...pick('heading', 'line', 'url', 'phone', 'email', 'caption', 'body'), ...(b.type === 'factrow' ? { facts: factsFrom(fd) } : {}), ...(b.type === 'columns' ? { cols: colsFrom(fd) } : {}), ...(b.type === 'collage' && b.mayChange ? collageMine(fd, b) : {}), ...(b.type === 'gallery' && b.mayChange ? { photos: fd.getAll('photos').map(String).filter(Boolean).slice(0, ADDED_BLOCK_FIELDS.photos.max) } : {}), ...(fd.has('button_label') ? { label: fd.get('button_label') } : {}), ...(b.mayChange ? pick('photo_id') : {}) }
        : { enabled: fd.get('enabled') != null, eyebrow: fd.get('eyebrow'), heading: fd.get('heading'), lede: fd.get('lede') }, owners));
    } catch (err) {
      if (!(err instanceof ContentError)) throw err;
      return redirect(`${back}?note=not_saved#b-${block}`);
    }
    return redirect(`${back}?note=saved#b-${block}`);
  }

  async function home() {
    const key = url.pathname.split('/')[4];
    if (!key) {
      // Her Home's parts top to bottom: her blocks, her videos and posts, and the
      // blocks placed on it, each where it sits.
      const blocks = pageBlocks(await loadBuild(env, site.id), 'home');
      const added = new Set(addedBlocks('home', blocks).map((b) => b.id));
      const snap = added.size ? await buildSnapshot(env, site.id) : null;
      const out = [];
      let items = [];
      const flush = () => { if (items.length) out.push(`<ul class="items">${items.join('')}</ul>`); items = []; };
      const done = new Set();
      const item = async (k) => {
        done.add(k);
        const v = await getBlock(env, site.id, k);
        items.push(`<li class="item"><a href="${base}/home/${k}"><b>${esc(say(`homeblocks.title.${k}`))}</b><span>${esc(say(v.enabled ? 'homeblocks.on' : 'homeblocks.off'))}</span></a></li>`);
      };
      for (const b of blocks) {
        if (HOME_BLOCK_ORDER.includes(b.id) && !done.has(b.id)) await item(b.id);
        else if (b.type === 'embeds' && !done.has('embeds')) { flush(); out.push(await embedsCard('home', `${base}/home`, embedErr())); done.add('embeds'); }
        else if (added.has(b.id)) { flush(); out.push(await addedCard('home', b, snap)); }
      }
      // Her blocks not on Home just now, still hers to word.
      for (const k of HOME_BLOCK_ORDER) if (!done.has(k)) await item(k);
      flush();
      if (!done.has('embeds')) out.push(await embedsCard('home', `${base}/home`, embedErr()));
      return { title: say('homeblocks.home_page'), back: `${base}/pages`, body: `${note(url)}<p class="muted">${esc(say('homeblocks.your_home_page_s'))}</p>${out.join('')}` };
    }
    const flds = HOME_BLOCKS[key];
    if (!flds) return null;
    const all = { enabled: { type: 'bool' }, ...flds };
    const current = await getBlock(env, site.id, key);
    const defs = key === 'hero' ? { headline: site.kennel_name ?? null } : HOME_WORDS[key] ?? {};
    const pick = { groups: [{ label: say('homeblocks.photos_for_the_home'), subject: 'page:home' }], tags: ['page:home'], alt: '' };
    const render = async (err, values) => ({
      title: say(`homeblocks.title.${key}`), back: `${base}/home`,
      body: `${note(url)}${errorBox(err)}<form method="post" action="${base}/home/${key}" data-save class="card">${fieldsWithLabel(all, shownWith(values ?? current, defs), await ctxFor(key, pick), { enabled: [say('homeblocks.this_block_is_on'), say('homeblocks.off_it_leaves_the')] })}<button class="primary">${esc(say('homeblocks.save'))}</button></form>`,
    });
    if (request.method !== 'POST') return render();
    const fd = await request.formData();
    const values = keepUnset(parseForm(all, fd), defs);
    try { await saveBlock(env, site.id, key, values); } catch (err) {
      if (err instanceof ContentError) return render(err.message, values);
      throw err;
    }
    await tagFromForm(all, values, fd, ['page:home']);
    return redirect(`${base}/home/${key}?note=saved`);
  }

  return { pages, home, addedAction };
}

// The manage app's editing screens (phase 2): everything under /s/<subdomain>/.
// Every form posts to its own address and redirects back with a note; a form with
// a problem comes back with what was typed and the reason.
import { escapeHtml as esc } from '../lib/html.js';
import { json } from '../lib/http.js';
import { PAGES, HOME_BLOCKS, HOME_BLOCK_ORDER, SITE_FIELDS, PAYMENT_FIELDS, SAFE_NOTICE_FIELDS, ContentError, brandImageOk } from '../content/model.js';
import {
  KINDS, listRecords, getRecord, saveRecord, setField, removeRecord, moveRecord,
  saveSite, getPage, savePage, getBlock, saveBlock, getPayment, savePayment,
} from '../content/records.js';
import { fields, parseForm } from './forms.js';
import { savePhoto, PhotoError } from '../photos.js';
import { subjects, tagPhotos, untagPhoto, tagsByPhoto } from '../photoTags.js';
import { buildSnapshot, loadSnapshot, publish, undoPublish, listSnapshots } from '../publish.js';
import { changes } from '../diff.js';
import { makePreviewToken } from '../site.js';
import { siteLink } from '../ops/sites.js';
import { APP_VERSION } from './version.js';
import { STATUS_TEXT, SAFE_NOTICE_TEXT } from '../render/parts.js';
import { exportContent } from '../content/io.js';
import { closeSite, SiteError } from '../sites.js';
import { listEmbeds, addEmbed, removeEmbed, moveEmbed, EmbedError, EMBEDS_PER_PLACE } from '../embedStore.js';
import { PROVIDERS } from '../embeds.js';
import { readBadgeCode, storeBadgeImage, BadgeCodeError } from '../badgeCode.js';
import { qrSvg } from '../qr.js';
import { readFeed, parseFeedAddress, setFeed, FeedError, kennelosOrigin, kennelosState } from '../feed.js';
import {
  waiting, fulfilled, getEntry, addEntry, updateEntry, setFulfilled, removeEntry, moveEntry, offerMailto, suggestWants, listNameFor, maskedNameFor, wantsPrivate, WaitlistError,
} from '../waitlist.js';
import { makeLinkCode, showCode, devices, stopDevice, unlinkSite, setKennelosPrices, LinkError, CODE_TTL_MS } from '../kennelos/link.js';
import { OWNED, OWNED_PRICES } from '../kennelos/bundle.js';
import { pendingMatches, matchChanges, confirmMatch, declineMatch, MatchError } from '../kennelos/match.js';
import { leavingLitters, keepLitter, LITTER_DAYS } from '../kennelos/clock.js';

export const FRESH_SIGN_IN_MS = 15 * 60 * 1000;

const when = (iso) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }) + ' UTC';
const redirect = (location) => new Response(null, { status: 303, headers: { location, 'cache-control': 'no-store' } });

const NOTES = {
  saved: 'Saved to your draft. Publish when you\'re ready.',
  added: 'Added to your draft.',
  removed: 'Removed from your draft.',
  moved: 'Moved.',
  status: 'Status changed in your draft.',
  uploaded: 'Photos added.',
  embedded: 'Added to your draft. It shows on your site after you publish.',
  tagged: 'Saved.',
  deleted: 'Message deleted.',
  approved: 'Approved. It shows on your site after you publish.',
  declined: 'Declined and deleted.',
  published: 'Published. Visitors now see your changes.',
  listed: 'Added to your waitlist. It shows on your website now.',
  fulfilled: 'Marked fulfilled. Everyone below moved up.',
  back: 'Put back in its place.',
  listsaved: 'Saved. Your website shows it now.',
  unlisted: 'Deleted from your waitlist.',
  undone: 'Undone. Visitors see the version before.',
  kept: 'Kept. It stays as a past litter until you remove it.',
  matched: 'Matched. It now comes from KennelOS, with your photos and wording kept.',
  apart: 'Kept apart. KennelOS\'s one is added as new.',
  stopped: 'That device is no longer linked.',
  unlinked: 'Unlinked. Everything from KennelOS is now yours to edit here.',
};
const day = (ymd) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' });
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
  products: { title: 'Recommended products', one: 'product', name: (r) => r.name, sub: (r) => [r.grp, r.code ? `code ${r.code}` : null, r.home_badge ? 'home page badge' : null].filter(Boolean).join(' · ') },
  policies: { title: 'Policies', one: 'policy', name: (r) => r.heading, sub: () => '' },
  faq: { title: 'FAQ', one: 'question', name: (r) => r.heading, sub: () => '' },
  waitlist_help: { title: 'Using your status page', one: 'section', name: (r) => r.heading, sub: () => '' },
  albums: { title: 'Albums', one: 'album', name: (r) => r.title, sub: (r) => [`${(r.photos ?? []).length} photo${(r.photos ?? []).length === 1 ? '' : 's'}`, r.show_on_site ? null : 'hidden'].filter(Boolean).join(' · ') },
  questions: { title: 'Application questions', one: 'question', name: (r) => r.label, sub: (r) => [QUESTION_WORDS[r.type], r.required ? 'must answer' : 'optional'].join(' · ') },
};
// Under a product's fields: the brand's embed code, read for its link and picture
// (badgeCode.js), never kept.
const BADGE_CODE_FIELD = `<label for="f-badge_code">Or paste the embed code they gave you<span class="hint">The HTML from the brand's referral page, starting with &lt;a href=. It fills in your referral link and the picture. The code itself isn't kept.</span><textarea id="f-badge_code" name="_badge_code" rows="4" autocapitalize="none" spellcheck="false" placeholder="&lt;a href=&quot;https://…&quot;&gt;&lt;img src=&quot;https://…&quot;&gt;&lt;/a&gt;"></textarea></label>`;
const QUESTION_WORDS = { text: 'Short answer', paragraph: 'Longer answer', choice: 'Choice', yes_no: 'Yes or no', litter: 'Which litter', phone: 'Phone', town: 'Town' };
const FORM_KIND = { policies: 'expander', faq: 'expander', waitlist_help: 'expander' };
// The kinds whose records a photo can be of (photoTags.js).
const SUBJECT_OF = { dogs: 'dog', litters: 'litter', puppies: 'puppy', extras: 'extra', products: 'product' };
const BLOCK_TITLES = { hero: 'Top of the page', facts: 'Facts row', story: 'Story', dogs: 'Dogs row', litters: 'Litters', reviews: 'Reviews', waitlist: 'Waitlist band' };

// Records from KennelOS that share a name with one already on the site wait for
// her yes; until then the site keeps showing her own version, so this sits at the
// top of Home and Publish, not only on the KennelOS screen.
export function matchesWaiting(subdomain, n) {
  return `<section class="card notice-card" role="status" id="matches-waiting"><p><strong>${n} from KennelOS ${n === 1 ? 'is' : 'are'} waiting for you to match.</strong> ${n === 1 ? 'It has' : 'They have'} the same name as one already on your website. Until you answer, your website keeps showing your own version, without what KennelOS sent (its sex, health results and so on).</p><p class="row"><a class="button primary" href="/s/${esc(subdomain)}/kennelos#matches">Answer ${n === 1 ? 'it' : 'them'}</a></p></section>`;
}

export function createScreens({ env, request, url, site, user, page }) {
  const base = `/s/${site.subdomain}`;
  const photoUrl = (id) => `${base}/photos/${id}/thumb`;
  let photosCache = null;
  const photos = async () => (photosCache ??= (await env.DB.prepare('SELECT id, alt FROM photos WHERE site_id = ? AND removed_at IS NULL ORDER BY created_at DESC').bind(site.id).all()).results);
  const dogsList = async () => (await env.DB.prepare('SELECT id, call_name FROM dogs WHERE site_id = ? ORDER BY sort').bind(site.id).all()).results;
  const littersList = async () => (await env.DB.prepare('SELECT id, name FROM litters WHERE site_id = ? ORDER BY sort').bind(site.id).all()).results;
  let tagsCache = null;
  const tags = async () => (tagsCache ??= await tagsByPhoto(env, site.id));
  // pick: { groups: [{ label, subject }], tags: [subject…] to tag uploads with, alt }
  const ctxFor = async (kind, pick) => {
    const ctx = { kind, photos: await photos(), photoUrl, dogs: await dogsList(), litters: await littersList(), photosLink: `${base}/photos` };
    if (pick) {
      const t = await tags();
      ctx.photoGroups = pick.groups.map((g) => ({ label: g.label, ids: g.subject ? ctx.photos.filter((p) => (t.get(p.id) ?? []).includes(g.subject)).map((p) => p.id) : [] }));
      ctx.upload = { action: `${base}/photos/upload`, tags: pick.tags.filter(Boolean).join(','), alt: pick.alt ?? '' };
    }
    return ctx;
  };
  // After a save: the photos chosen in the form, and any added with its Add
  // photos button, are tagged as being of what was saved.
  const photoValues = (list, values) => Object.entries(list).flatMap(([n, f]) => (f.type === 'photo' ? [values[n]] : f.type === 'list' && f.item === 'photo' ? values[n] ?? [] : [])).filter(Boolean);
  const tagFromForm = (list, values, fd, subs) => tagPhotos(env, site.id, [...photoValues(list, values), ...fd.getAll('_new_photos')], subs);

  // A pasted embed code fills in the product's link and picture (and its name, if
  // empty). Its errors read as the form's.
  async function fromBadgeCode(fd, values) {
    const code = String(fd.get('_badge_code') ?? '').trim();
    if (!code) return;
    try {
      const { link, image, alt } = readBadgeCode(code);
      if (link) values.link_url = link;
      if (!values.name && alt) values.name = alt;
      // An approved brand's picture is shown from the brand; any other is copied.
      if (image && brandImageOk(image)) { values.image_url = image; values.photo_id = null; }
      else if (image) { values.photo_id = await storeBadgeImage(env, site.id, image, alt ?? values.name ?? ''); values.image_url = null; }
    } catch (err) {
      if (err instanceof BadgeCodeError) throw new ContentError('embed code', err.message);
      throw err;
    }
  }

  let kosCache = null;
  const kos = async () => (kosCache ??= await kennelosState(env, site.id));

  // ---------- the KennelOS link (plan 5) ----------
  let pricesCache = null;
  const kosPrices = async () => (pricesCache ??= Boolean(await env.DB.prepare('SELECT use_kennelos_prices FROM sites WHERE id = ?').bind(site.id).first('use_kennelos_prices')));
  // The fields KennelOS owns on this record, while it comes from KennelOS.
  async function lockedFor(kind, rec) {
    if (rec?.source !== 'kennelos') return null;
    return new Set([...(OWNED[kind] ?? []), ...((await kosPrices()) ? OWNED_PRICES[kind] ?? [] : [])]);
  }

  // Litters about to go (5.3): each with the day it's deleted, and Keep.
  async function leavingCard() {
    const list = await leavingLitters(env, site.id);
    if (!list.length) return '';
    return `<section class="card" id="leaving"><h2>Leaving your site</h2>
      <p class="muted small">Litters off your site are deleted ${LITTER_DAYS} days after they left, with their puppies, albums and the photos nothing else uses. Keep one to have it stay as a past litter.</p>
      <ul class="items">${list.map((l) => `<li class="item"><a href="${base}/litters/${l.id}"><b>${esc(l.name)}</b><span>Deleted on ${esc(day(l.deletes_on))}</span></a>
        <form method="post" action="${base}/litters/${l.id}/keep"><button>Keep</button></form></li>`).join('')}</ul></section>`;
  }

  // Dogs that wait in the draft (5.3): never deleted by a clock; removing is hers.
  async function offSiteDogsCard(rows) {
    const off = rows.filter((d) => !d.show_on_site || d.hidden_by_kennelos);
    if (!off.length) return '';
    return `<section class="card" id="not-on-site"><h2>Not on your site</h2>
      <p class="muted small">Switched off here${off.some((d) => d.hidden_by_kennelos) ? ', or unticked or archived in KennelOS' : ''}. They wait here, with their photos, until you put them back or remove them.</p>
      <ul class="items">${off.map((d) => `<li class="item"><a href="${base}/dogs/${d.id}"><b>${esc(d.call_name)}</b><span>${d.hidden_by_kennelos ? 'Not sent by KennelOS' : 'Switched off'}</span></a>
        <form method="post" action="${base}/dogs/${d.id}/remove"><button class="link">Remove</button></form></li>`).join('')}</ul></section>`;
  }

  async function kennelosScreen() {
    const rest = url.pathname.slice(`${base}/kennelos`.length);
    const post = request.method === 'POST';
    const owner = site.role === 'owner';
    const here = (n, hash = '') => redirect(`${base}/kennelos${n ? `?note=${n}` : ''}${hash}`);
    if (post) {
      let fd;
      try { fd = await request.formData(); } catch { fd = new FormData(); }
      if (rest === '/code') {
        if (!owner) return null;
        try {
          const { code, expiresAt } = await makeLinkCode(env, site.id, user.emailHash.slice(0, 12));
          return render({ code, expiresAt });
        } catch (err) {
          if (err instanceof LinkError) return render({ error: err.message });
          throw err;
        }
      }
      if (rest === '/prices') {
        await setKennelosPrices(env, site.id, fd.has('on'));
        return here('saved', '#prices');
      }
      if (rest === '/unlink') {
        if (!owner) return null;
        await unlinkSite(env, site.id);
        return here('unlinked');
      }
      let m = rest.match(/^\/devices\/([0-9a-f-]{36})\/stop$/);
      if (m) {
        if (!owner) return null;
        await stopDevice(env, site.id, m[1]);
        return here('stopped');
      }
      if (rest === '/match') {
        const kind = String(fd.get('kind') ?? '');
        const kid = String(fd.get('kennelos_id') ?? '');
        if (!['dogs', 'litters'].includes(kind)) return null;
        try {
          if (fd.get('answer') === 'yes') await confirmMatch(env, site.id, kind, kid, fd.getAll('keep').map(String));
          else await declineMatch(env, site.id, kind, kid);
        } catch (err) {
          if (err instanceof MatchError) return render({ error: err.message });
          throw err;
        }
        return here(fd.get('answer') === 'yes' ? 'matched' : 'apart', '#matches');
      }
      return null;
    }
    if (rest) return null;
    return render({});

    async function render({ code = null, expiresAt = null, error = null }) {
      const list = await devices(env, site.id);
      const linked = list.length > 0;
      const prices = await kosPrices();
      const parts = [note(url), error ? `<p class="error" role="alert">${esc(error)}</p>` : ''];
      parts.push(`<section class="card"><h2>${linked ? 'Linked to KennelOS' : 'Link KennelOS'}</h2>
        <p class="muted">${linked
          ? 'When you press Update website in KennelOS, your dogs, litters, puppy statuses and health results arrive here in your draft. Nothing changes on your site until you Publish.'
          : 'Keep your dogs and litters in KennelOS Pro? Link it, and Update website in KennelOS sends them here, so you type them only once. In KennelOS, tick Show on website on the dogs, litters and pairings you want on your site.'}</p>
        ${code ? `<p class="notice" role="status">Your code: <strong class="code">${esc(showCode(code))}</strong><br>In KennelOS, open Settings, then Connect website, and type it in. It works once, for ${CODE_TTL_MS / 60000} minutes${expiresAt ? ` (until ${esc(when(expiresAt))})` : ''}.</p>` : ''}
        ${owner ? `<form method="post" action="${base}/kennelos/code"><button class="${linked ? '' : 'primary'}">${linked ? 'Link another device' : 'Show a link code'}</button></form>` : '<p class="muted small">Only the site\'s owner can link KennelOS.</p>'}
        <p class="muted small">Each phone or computer you use KennelOS on links once, with its own code.</p></section>`);
      if (linked) {
        parts.push(`<section class="card"><h2>Devices</h2><ul class="items">${list.map((d) => `<li class="item"><span><b>${esc(d.device_label || 'A KennelOS device')}</b><span class="muted small"> · ${d.last_bundle_at ? `last update ${esc(when(d.last_bundle_at))}` : `linked ${esc(when(d.linked_at))}, no update yet`}</span>${d.summary?.text ? `<br><span class="muted small">${esc(d.summary.text)}</span>` : ''}</span>
          ${owner ? `<form method="post" action="${base}/kennelos/devices/${d.id}/stop"><button class="link">Stop this device</button></form>` : ''}</li>`).join('')}</ul></section>`);
        const pending = await pendingMatches(env, site.id);
        if (pending.length) parts.push(await matchesCard(pending));
        parts.push(`<form method="post" action="${base}/kennelos/prices" class="card" id="prices"><h2>Prices</h2>
          <label class="check"><input type="checkbox" name="on" value="1"${prices ? ' checked' : ''}> <span>Use my KennelOS prices<span class="hint">On: each litter's prices, deposits and full-registration amounts, and your extras' prices, come from KennelOS with the next Update website, and can't be changed here. Switching it on turns on Show prices for those litters, and for each new one KennelOS sends; you can still switch a litter's off. Off: you type them here, and they show only where you switch Show prices on. A puppy's own price and an adult's asking price are always typed here.</span></span></label>
          <button>Save</button></form>`);
        if (owner) {
          parts.push(`<form method="post" action="${base}/kennelos/unlink" class="card danger"><h2>Unlink</h2>
            <p class="muted small">Every device stops, and everything that came from KennelOS stays in your draft as ordinary content you can edit here. KennelOS's next Update website will say your site is no longer linked.</p>
            <button>Unlink KennelOS</button></form>`);
        }
      }
      return { title: 'KennelOS', back: base, body: parts.join('') };
    }
  }

  // Matching what's already there (5.2 step 4): each pair, with what it changes.
  async function matchesCard(pending) {
    const items = [];
    for (const p of pending) {
      const { target, changes: diff, puppies: pups } = await matchChanges(env, site.id, p.kind, p.kennelos_id);
      if (!target) continue;
      const name = p.kind === 'dogs' ? target.call_name : target.name;
      const what = p.kind === 'dogs' ? 'dog' : 'litter';
      const rows = diff.map((c) => `<li><label class="check"><input type="checkbox" name="keep" value="${esc(c.field)}"${c.blanking ? ' checked' : ''}> <span>${esc(c.label)}: ${c.from === null ? 'empty' : `'${esc(c.from)}'`} → ${c.to === null ? 'blank' : `'${esc(c.to)}'`}<span class="hint">Tick to keep yours.</span></span></label></li>`).join('');
      items.push(`<form method="post" action="${base}/kennelos/match" class="card">
        <input type="hidden" name="kind" value="${esc(p.kind)}"><input type="hidden" name="kennelos_id" value="${esc(p.kennelos_id)}">
        <p><b>Is KennelOS's ${esc(what)} "${esc(p.kind === 'dogs' ? p.data.call_name : p.data.name ?? name)}" your website's ${esc(name)}?</b></p>
        <p class="muted small">Yes: your ${esc(name)} page keeps its address, photos and wording, and from now on comes from KennelOS.${pups ? ` Its ${pups} pupp${pups === 1 ? 'y comes' : 'ies come'} with it, matched by name.` : ''}</p>
        ${rows ? `<ul class="plain">${rows}</ul>` : '<p class="muted small">Nothing you typed changes.</p>'}
        <div class="row"><button class="primary" name="answer" value="yes">Yes, the same ${esc(what)}</button><button name="answer" value="no">No, keep them apart</button></div></form>`);
    }
    return items.length ? `<section id="matches"><h2>Already on your site?</h2><p class="muted">These came from KennelOS with the same name as one already on your website. Nothing is matched until you say so.</p>${items.join('')}</section>` : '';
  }

  // ---------- videos and posts (plan 3.3) ----------
  // A card on the screen of whatever they sit on; its forms come back to `here`.
  async function embedsCard(place, here, err) {
    const list = await listEmbeds(env, site.id, place);
    const hidden = `<input type="hidden" name="place" value="${esc(place)}"><input type="hidden" name="back" value="${esc(here)}">`;
    const items = list.map((e, i) => `<li class="item"><span><b>${esc(e.title || PROVIDERS[e.provider]?.name || e.provider)}</b><span class="muted small"> · ${esc(PROVIDERS[e.provider]?.name ?? e.provider)}${e.preview_photo_id ? '' : ', no preview'}</span></span>
      <span class="order">${i ? `<form method="post" action="${base}/embeds/${e.id}/up">${hidden}<button aria-label="Move up">↑</button></form>` : ''}${i < list.length - 1 ? `<form method="post" action="${base}/embeds/${e.id}/down">${hidden}<button aria-label="Move down">↓</button></form>` : ''}<form method="post" action="${base}/embeds/${e.id}/remove">${hidden}<button class="link">Remove</button></form></span></li>`).join('');
    return `<section class="card" id="videos"><h2>Videos and posts</h2>
      <p class="muted small">Paste the link to a video or post on ${esc(Object.values(PROVIDERS).map((p) => p.name).join(', '))}. Your site shows a preview, and plays it only when a visitor taps.</p>
      ${err ? `<p class="error" role="alert">Not added: ${esc(err)}</p>` : ''}
      ${items ? `<ul class="items">${items}</ul>` : ''}
      ${list.length < EMBEDS_PER_PLACE ? `<form method="post" action="${base}/embeds/add">${hidden}<label>Link<input name="link" type="url" inputmode="url" placeholder="https://www.youtube.com/watch?v=…" required></label><label>Title<span class="hint">Optional, shown under it, like "Opal at 6 weeks".</span><input name="title" maxlength="120"></label><button class="primary">Add</button></form>` : ''}</section>`;
  }

  async function embedsAction() {
    if (request.method !== 'POST') return null;
    const fd = await request.formData();
    const back = String(fd.get('back') ?? '');
    const here = back.startsWith(`${base}/`) && !back.includes('//') ? back : base;
    const m = url.pathname.slice(`${base}/embeds`.length).match(/^\/(?:add|([0-9a-f-]{36})\/(remove|up|down))$/);
    if (!m) return null;
    if (m[2] === 'remove') await removeEmbed(env, site.id, m[1]);
    else if (m[2]) await moveEmbed(env, site.id, m[1], m[2] === 'up' ? -1 : 1);
    else {
      try { await addEmbed(env, site.id, String(fd.get('place') ?? ''), { link: fd.get('link'), title: fd.get('title') }); } catch (err) {
        if (!(err instanceof EmbedError)) throw err;
        return redirect(`${here}${here.includes('?') ? '&' : '?'}embed_error=${encodeURIComponent(err.message)}#videos`);
      }
      return redirect(`${here}?note=embedded#videos`);
    }
    return redirect(`${here}?note=saved#videos`);
  }
  const embedErr = () => url.searchParams.get('embed_error');

  // ---------- sharing (plan 5.4): links and QR codes ----------
  // The site and its litters and albums, as visitors see them: published ones only.
  async function shareScreen() {
    const rest = url.pathname.slice(`${base}/share`.length);
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
        <p class="row"><button type="button" data-copy="${esc(link)}">Copy link</button><a class="button" href="${base}/share/qr/${t.key}.svg?download">Download QR code</a></p></div></li>`;
    };
    return {
      title: 'Share', back: base,
      body: `<p class="muted">Links to your site and its pages, and a QR code for each, for puppy packets, business cards and show tables. A link pasted into Facebook, Messenger or a text shows a picture card.${live ? '' : ' Publish your site first: these are the pages visitors can see.'}</p>
        <ul class="share-list">${targets.map(card).join('')}</ul>
        <p class="muted small">Litters and albums show here once they're published. The QR code is a picture you can print at any size.</p>`,
    };
  }

  // ---------- one list of records, generic ----------
  async function collection(path, kind, scopeId, { back, parentTitle } = {}) {
    const k = KINDS[kind];
    const L = LISTS[kind];
    const rest = url.pathname.slice(path.length).replace(/^\//, '');
    const post = request.method === 'POST';
    const formKind = FORM_KIND[kind] ?? kind;
    const formFields = Object.fromEntries(Object.entries(k.fields).filter(([n]) => !(kind === 'reviews' && n === 'photo_id')));
    const one = SUBJECT_OF[kind];
    const subsFor = (id) => [id && one ? `${one}:${id}` : null, kind === 'puppies' ? `litter:${scopeId}` : null].filter(Boolean);
    const pickFor = (rec) => {
      // An album offers its litter's photos first; photos added here are tagged with it.
      if (kind === 'albums') {
        const lit = rec?.litter_id ? `litter:${rec.litter_id}` : null;
        return { groups: [{ label: rec?.litter_id ? 'Photos of its litter' : 'Your photos', subject: lit }], tags: lit ? [lit] : [], alt: rec?.title ?? '' };
      }
      if (!one) return null;
      const groups = [{ label: rec ? `Photos of ${L.name(rec)}` : `Photos of this ${L.one}`, subject: rec ? `${one}:${rec.id}` : null }];
      if (kind === 'puppies' && parentTitle) groups.push({ label: `Photos of ${parentTitle}`, subject: `litter:${scopeId}` });
      return { groups, tags: subsFor(rec?.id), alt: rec ? L.name(rec) : '' };
    };

    const form = async (rec, err, values) => {
      const action = rec ? `${path}/${rec.id}` : `${path}/new`;
      const lock = rec ? await lockedFor(kind, rec) : null;
      const from = lock ? `<p class="notice">This ${esc(L.one)} comes from KennelOS. What's marked "from KennelOS" changes there, then Update website; everything else here is yours.</p>` : '';
      const body = `${from}${errorBox(err)}<form method="post" action="${esc(action)}" data-save class="card">${fields(formFields, values ?? rec ?? { ...(k.defaults ?? {}) }, { ...await ctxFor(formKind, pickFor(rec)), locked: lock })}
        ${kind === 'products' ? BADGE_CODE_FIELD : ''}<button class="primary">${rec ? 'Save' : `Add ${L.one}`}</button></form>
        ${rec ? `<form method="post" action="${esc(`${path}/${rec.id}/remove`)}" class="card danger"><p class="muted small">Removing takes it off your draft; it stays on the live site until you publish.</p><button>Remove this ${L.one}</button></form>` : ''}`;
      return { title: rec ? L.name(rec) : `New ${L.one}`, back: path, body };
    };

    if (!rest) {
      if (post) return null;
      const rows = await listRecords(env, site.id, kind, scopeId);
      const items = rows.map((r, i) => `<li class="item"><a href="${esc(`${path}/${r.id}`)}"><b>${esc(L.name(r))}</b><span>${esc(L.sub(r) ?? '')}</span></a>
        <span class="order">${i ? `<form method="post" action="${esc(`${path}/${r.id}/up`)}"><button aria-label="Move ${esc(L.name(r))} up">↑</button></form>` : ''}${i < rows.length - 1 ? `<form method="post" action="${esc(`${path}/${r.id}/down`)}"><button aria-label="Move ${esc(L.name(r))} down">↓</button></form>` : ''}</span></li>`).join('');
      const intro = kind === 'questions' ? `${(await kos()).online ? '<p class="error">Not used right now: KennelOS takes your applications online, so your website shows your KennelOS form. These questions come back if you turn online applications off in KennelOS or remove the link.</p>' : ''}<p class="muted">The application form on your waitlist page always asks for the family's name and email. These questions come after, in this order. With none, it asks for a few lines about their family.</p>` : '';
      const extra = kind === 'litters' ? await leavingCard() : kind === 'dogs' ? await offSiteDogsCard(rows) : '';
      return { title: parentTitle ? `${parentTitle}: ${L.title}` : L.title, back: back ?? base, body: `${note(url)}${intro}${extra}<ul class="items">${items || `<li class="muted">None yet.</li>`}</ul><p><a class="button primary" href="${esc(`${path}/new`)}">Add ${L.one}</a></p>` };
    }
    if (rest === 'new') {
      if (!post) return form(null);
      const fd = await request.formData();
      const values = parseForm(formFields, fd);
      let saved;
      try {
        if (kind === 'products') await fromBadgeCode(fd, values);
        saved = await saveRecord(env, site.id, kind, null, values, scopeId); } catch (err) {
        if (err instanceof ContentError) return form(null, err.message, values);
        throw err;
      }
      if (one) await tagFromForm(formFields, values, fd, subsFor(saved.id));
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
      const place = { dogs: 'dog', litters: 'litter', albums: 'album' }[kind];
      if (place) view.body += await embedsCard(`${place}:${rec.id}`, `${path}/${rec.id}`, embedErr());
      return { ...view, rec };
    }
    const fd = await request.formData();
    const values = parseForm(formFields, fd);
    // KennelOS's fields keep what's stored, whatever the form sent.
    for (const f of await lockedFor(kind, rec) ?? []) values[f] = rec[f];
    try {
      if (kind === 'products') await fromBadgeCode(fd, values);
      await saveRecord(env, site.id, kind, rec.id, values, scopeId); } catch (err) {
      if (err instanceof ContentError) return form(rec, err.message, values);
      throw err;
    }
    if (one) await tagFromForm(formFields, values, fd, subsFor(rec.id));
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

  // A litter has no photo field of its own, but its photos (for albums and the
  // puppies' pickers) are added here, tagged with the litter.
  async function litterPhotos(view) {
    if (!view?.rec) return view;
    const subject = `litter:${view.rec.id}`;
    const t = await tags();
    const mine = (await photos()).filter((p) => (t.get(p.id) ?? []).includes(subject));
    view.body += `<section class="card photos" data-picker data-type="none" data-upload="${esc(`${base}/photos/upload`)}" data-tags="${esc(subject)}" data-alt="${esc(view.rec.name)}">
      <h2>Photos of this litter</h2><p class="muted small">Photos added here are offered first when you choose a photo for one of its puppies.</p>
      <div class="ph-grid" data-first>${mine.map((p) => `<img src="${esc(photoUrl(p.id))}" alt="${esc(p.alt || 'Photo')}" loading="lazy">`).join('')}</div>
      <div class="ph-add"><label class="button">Add photos<input type="file" accept="image/*" multiple data-add-photos></label><span class="muted small" role="status"></span></div>
      ${mine.length ? `<p><a href="${esc(`${base}/photos?of=${encodeURIComponent(subject)}`)}">See them on the Photos screen</a></p>` : ''}</section>`;
    return view;
  }

  // ---------- puppies: the quick screen ----------
  async function puppies() {
    const post = request.method === 'POST';
    const m = url.pathname.match(/\/puppies\/([0-9a-f-]{36})\/status$/);
    if (m && post) {
      const form = await request.formData();
      // A puppy from KennelOS takes its status from there (plan 3.6).
      const from = await env.DB.prepare('SELECT source FROM puppies WHERE id = ? AND site_id = ?').bind(m[1], site.id).first('source');
      if (from === 'kennelos') return redirect(`${base}/puppies`);
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
          ${p.source === 'kennelos' ? `<span class="muted small">${esc(p.hidden_by_kennelos ? 'Not sent by KennelOS' : STATUS_TEXT[p.status] ?? 'Hidden')} · from KennelOS</span>` : `<select name="status" aria-label="${esc(p.name)}'s status">${Object.entries({ ...STATUS_TEXT, hidden: 'Hidden' }).map(([v, t]) => `<option value="${v}"${v === p.status ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>
          <button>Set</button>`}</form>`).join('') || '<p class="muted">No puppies yet.</p>'}
        <p><a class="button" href="${esc(`${base}/litters/${l.id}/puppies/new`)}">Add a puppy</a></p></section>`);
    }
    return { title: 'Puppies', back: base, body: `${note(url)}${sections.join('') || `<section class="card"><p class="muted">No current litters. <a href="${esc(`${base}/litters/new`)}">Add a litter</a>.</p></section>`}` };
  }

  // ---------- kennel details, pages, Home ----------
  async function details() {
    const row = await env.DB.prepare('SELECT * FROM sites WHERE id = ?').bind(site.id).first();
    const logoPick = { groups: [{ label: 'Your logo', subject: 'page:logo' }], tags: ['page:logo'], alt: `${row.kennel_name ?? ''} logo` };
    const render = async (err, values) => ({ title: 'Kennel details', back: base, body: `${note(url)}${errorBox(err)}<form method="post" action="${base}/details" data-save class="card">${fields(SITE_FIELDS, values ?? row, await ctxFor('site', logoPick))}<button class="primary">Save</button></form>` });
    if (request.method !== 'POST') return render();
    const fd = await request.formData();
    const values = parseForm(SITE_FIELDS, fd);
    try { await saveSite(env, site.id, values); } catch (err) {
      if (err instanceof ContentError) return render(err.message, values);
      throw err;
    }
    await tagFromForm(SITE_FIELDS, values, fd, ['page:logo']);
    return redirect(`${base}/details?note=saved`);
  }

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
        ? `<p class="notice">Connected. ${f.feed.form ? 'You take applications online in KennelOS, so your waitlist page shows your KennelOS application form, and applications go to KennelOS, not to this Inbox.' : 'You aren\'t taking applications online in KennelOS, so your waitlist page shows the application form set up here, and applications come to this Inbox.'}${f.stale ? ' KennelOS couldn\'t be reached just now; this is from its last copy.' : ''}</p>`
        : f.state === 'not_shared' ? '<p class="error">KennelOS isn\'t sharing your list with your website. In KennelOS, open the Online list card and turn on "Let my KennelPort website show my list in its own style". Until then, your waitlist page links to your KennelOS pages.</p>'
          : f.state === 'not_found' ? '<p class="error">KennelOS has no waitlist online at this address. Check the address, or put your list online in KennelOS first.</p>'
            : '<p class="error">KennelOS couldn\'t be reached just now. Your waitlist page links to your KennelOS pages until it can.</p>';
    }
    return `<form method="post" action="${base}/pages/waitlist/kennelos" class="card" id="kennelos"><h2>Your KennelOS waitlist</h2>
      ${id ? '<p class="muted small">Your waitlist page shows your KennelOS list. Remove the link to use the simple waitlist kept here instead.</p>' : `<p class="muted small">Keep your waitlist in KennelOS? Paste the website feed address from its Online list card. Your waitlist page then shows your KennelOS list, and while you take applications online there, your KennelOS application form, in your website's style, with applications going straight to KennelOS. The simple waitlist and the questions set up here are then not used (the questions are, if you don't take applications online in KennelOS). Without KennelOS, leave this empty and use the questions and Your waitlist below.</p>`}
      ${errorBox(err)}${state}
      <label>Website feed address<input name="feed" value="${esc(typed ?? (id ? `${origin}/f/site/${id}` : ''))}" placeholder="${esc(origin)}/f/site/…" autocapitalize="none" spellcheck="false"></label>
      <div class="row"><button class="primary">Save</button>${id ? '<button name="remove" value="1">Remove</button>' : ''}</div></form>`;
  }

  async function pages() {
    const key = url.pathname.split('/')[4];
    if (key === 'waitlist' && url.pathname.split('/')[5] === 'kennelos') {
      if (request.method !== 'POST') return null;
      const fd = await request.formData();
      if (fd.get('remove')) { await setFeed(env, site.id, null); return redirect(`${base}/pages/waitlist?note=saved#kennelos`); }
      try { await setFeed(env, site.id, parseFeedAddress(env, fd.get('feed'))); } catch (err) {
        if (!(err instanceof FeedError)) throw err;
        return pagesView('waitlist', await kennelosCard(err.message, String(fd.get('feed') ?? '')), { show: true });
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
        rows.push(`<li class="item"><a href="${base}/pages/${k}"><b>${esc(v.menu_label || p.label)}</b><span>${esc(p.path)}${p.canHide && !v.enabled ? ' · off' : ''}</span></a></li>`);
      }
      return { title: 'Pages', back: base, body: `${note(url)}<ul class="items"><li class="item"><a href="${base}/home"><b>Home</b><span>/ · block by block</span></a></li>${rows.join('')}</ul>` };
    }
    const p = PAGES[key];
    if (!p || key === 'privacy') return null;
    const all = { ...(p.canHide ? { enabled: { type: 'bool' } } : {}), menu_label: { type: 'text', max: 40 }, ...p.fields };
    const current = await getPage(env, site.id, key);
    const subject = key === 'about' ? 'page:about' : null;
    const pick = subject ? { groups: [{ label: `Photos for ${p.label}`, subject }], tags: [subject], alt: '' } : undefined;
    const render = async (err, values) => ({
      title: p.label, back: `${base}/pages`,
      body: `${note(url)}${key === 'waitlist' ? kennelos ?? await kennelosCard() : ''}${errorBox(err)}<form method="post" action="${base}/pages/${key}" data-save class="card">
        ${p.canHide ? fieldsWithLabel(all, values ?? current, await ctxFor(key === 'extras' ? 'extras_page' : key === 'products' ? 'products_page' : key, pick), { enabled: ['This page is on', 'Off: it leaves the menu and its address says "This page isn\'t available". Its words are kept.'], menu_label: ['Name in the menu', `Leave empty for "${p.label}".`] }) : fieldsWithLabel(all, values ?? current, await ctxFor(key, pick), { menu_label: ['Name in the menu', `Leave empty for "${p.label}".`] })}
        <button class="primary">Save</button></form>
        ${key === 'waitlist' ? await waitlistLinks() : listLinkFor(key)}${key === 'about' ? await embedsCard('about', `${base}/pages/about`, embedErr()) : ''}`,
    });
    if (request.method !== 'POST' || show) return render();
    const fd = await request.formData();
    const values = parseForm(all, fd);
    try { await savePage(env, site.id, key, values); } catch (err) {
      if (err instanceof ContentError) return render(err.message, values);
      throw err;
    }
    if (subject) await tagFromForm(all, values, fd, [subject]);
    return redirect(`${base}/pages/${key}?note=saved`);
  }

  // Under the waitlist page's settings: its questions and the simple waitlist, each
  // marked when a linked KennelOS waitlist means it isn't used.
  async function waitlistLinks() {
    const k = await kos();
    const questions = k.online
      ? '<p class="muted small">Your application questions aren\'t used while KennelOS takes your applications online: your website shows your KennelOS form. <a href="' + base + '/lists/questions">See them anyway</a></p>'
      : listLinkFor('waitlist');
    const simple = k.linked
      ? '<p class="muted small">Your simple waitlist isn\'t used while KennelOS is linked: your website shows your KennelOS list.</p>'
      : `<p><a class="button" href="${base}/waitlist">Your waitlist</a></p>`;
    return questions + simple;
  }

  const listLinkFor = (key) => {
    const kind = { reviews: 'reviews', how_it_works: 'steps', extras: 'extras', products: 'products', policies: 'policies', faq: 'faq', waitlist_help: 'waitlist_help', dogs: 'dogs', litters: 'litters', waitlist: 'questions', albums: 'albums' }[key];
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
      return { title: 'Home page', back: `${base}/pages`, body: `${note(url)}<p class="muted">Home is a fixed sequence of blocks. Switch each on or off and change its words.</p><ul class="items">${rows.join('')}</ul>${await embedsCard('home', `${base}/home`, embedErr())}` };
    }
    const flds = HOME_BLOCKS[key];
    if (!flds) return null;
    const all = { enabled: { type: 'bool' }, ...flds };
    const current = await getBlock(env, site.id, key);
    const pick = { groups: [{ label: 'Photos for the Home page', subject: 'page:home' }], tags: ['page:home'], alt: '' };
    const render = async (err, values) => ({
      title: BLOCK_TITLES[key], back: `${base}/home`,
      body: `${note(url)}${errorBox(err)}<form method="post" action="${base}/home/${key}" data-save class="card">${fieldsWithLabel(all, values ?? current, await ctxFor(key, pick), { enabled: ['This block is on', 'Off: it leaves the home page; its words are kept.'] })}<button class="primary">Save</button></form>`,
    });
    if (request.method !== 'POST') return render();
    const fd = await request.formData();
    const values = parseForm(all, fd);
    try { await saveBlock(env, site.id, key, values); } catch (err) {
      if (err instanceof ContentError) return render(err.message, values);
      throw err;
    }
    await tagFromForm(all, values, fd, ['page:home']);
    return redirect(`${base}/home/${key}?note=saved`);
  }

  // ---------- how to pay, and the safe-payment notice (plan 3.9) ----------
  async function payment() {
    const kind = url.pathname.split('/')[4] ?? '';
    const KINDS_HERE = { application_fee: ['Application fee', PAYMENT_FIELDS], deposit: ['Puppy deposit', PAYMENT_FIELDS], safe_notice: ['Safe-payment notice', SAFE_NOTICE_FIELDS] };
    if (request.method === 'POST') {
      const k = KINDS_HERE[kind];
      if (!k) return null;
      const values = parseForm(k[1], await request.formData());
      // Filled from her KennelOS waitlist settings: only the switch is hers here.
      const cur = kind === 'safe_notice' ? null : await getPayment(env, site.id, kind);
      if (cur?.source === 'kennelos') for (const f of Object.keys(PAYMENT_FIELDS)) if (f !== 'show_on_site') values[f] = cur[f] ?? null;
      try { await savePayment(env, site.id, kind, values); } catch (err) {
        if (err instanceof ContentError) return render({ [kind]: [err.message, values] });
        throw err;
      }
      return redirect(`${base}/payment?note=saved#${kind}`);
    }
    if (kind) return null;
    return render({});

    async function render(problems) {
      const cards = [];
      for (const [k, [title, flds]] of Object.entries(KINDS_HERE)) {
        const [err, typed] = problems[k] ?? [];
        const current = typed ?? await getPayment(env, site.id, k);
        const intro = k === 'safe_notice'
          ? `<p class="muted small">Leave the wording empty for: "${esc(SAFE_NOTICE_TEXT)}" Where the ways to pay above are shown, it starts "We take payment only by…" and links to them.</p>`
          : `<p class="muted small">${k === 'application_fee' ? 'How a family pays the fee once you approve them.' : 'How a family pays the deposit once they choose a puppy.'} This is how to pay, not the price.</p>`;
        cards.push(`<form method="post" action="${base}/payment/${k}" id="${k}" data-save class="card"><h2>${esc(title)}</h2>${intro}${errorBox(err)}
          ${current.source === 'kennelos' ? '<p class="notice">Filled from your waitlist settings in KennelOS. Change the wording there, then Update website; whether it shows is up to you here.</p>' : ''}
          ${fields(flds, current, { kind: k === 'safe_notice' ? 'safe_notice' : 'payment', locked: current.source === 'kennelos' ? new Set(Object.keys(PAYMENT_FIELDS).filter((f) => f !== 'show_on_site')) : null })}<button class="primary">Save</button></form>`);
      }
      return { title: 'How to pay', back: base, body: `${note(url)}<p class="muted">Shown on your waitlist page, so families don't have to email to ask. A How it works step can link here too: open the step and tick its How to pay box.</p>${cards.join('')}` };
    }
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
        await tagPhotos(env, site.id, [saved.id], String(form.get('tags') ?? '').split(','));
        return json({ id: saved.id, thumb: photoUrl(saved.id) });
      } catch (err) {
        if (err instanceof PhotoError) return json({ message: err.message }, 400);
        throw err;
      }
    }
    let m = rest.match(/^\/([0-9a-f-]{36})\/(thumb|full)$/);
    if (m && !post) {
      const p = await env.DB.prepare('SELECT r2_key, thumb_key, type FROM photos WHERE id = ? AND site_id = ?').bind(m[1], site.id).first();
      const obj = p && await env.FILES.get(m[2] === 'full' ? p.r2_key : (p.thumb_key || p.r2_key));
      if (!obj) return new Response('Not found', { status: 404 });
      return new Response(obj.body, { headers: { 'content-type': p.type, 'cache-control': 'private, max-age=86400' } });
    }
    // Where to come back to: the same filter.
    const ofParam = (v) => (v && (v === 'none' || /^[a-z]+:[0-9a-z-]+$/.test(v)) ? v : '');
    const back = (noteKey, of) => redirect(`${base}/photos?${of ? `of=${encodeURIComponent(of)}&` : ''}note=${noteKey}`);
    m = rest.match(/^\/([0-9a-f-]{36})\/(alt|remove|tag|untag)$/);
    if (m && post) {
      const form = await request.formData();
      const of = ofParam(String(form.get('of') ?? ''));
      const photo = await env.DB.prepare('SELECT id FROM photos WHERE id = ? AND site_id = ? AND removed_at IS NULL').bind(m[1], site.id).first();
      if (!photo) return back('removed', of);
      const t = new Date().toISOString();
      if (m[2] === 'tag') { await tagPhotos(env, site.id, [photo.id], [String(form.get('subject') ?? '')]); return back('tagged', of); }
      if (m[2] === 'untag') { await untagPhoto(env, site.id, photo.id, String(form.get('subject') ?? '')); return back('tagged', of); }
      if (m[2] === 'alt') {
        const alt = String(form.get('alt') ?? '').replace(/\s+/g, ' ').trim().slice(0, 200) || null;
        await env.DB.batch([env.DB.prepare('UPDATE photos SET alt = ? WHERE id = ? AND site_id = ?').bind(alt, photo.id, site.id), env.DB.prepare('UPDATE sites SET draft_changed_at = ? WHERE id = ?').bind(t, site.id)]);
        return back('saved', of);
      }
      await env.DB.batch([env.DB.prepare('UPDATE photos SET removed_at = ? WHERE id = ? AND site_id = ?').bind(t, photo.id, site.id), env.DB.prepare('UPDATE sites SET draft_changed_at = ? WHERE id = ?').bind(t, site.id)]);
      return back('removed', of);
    }
    if (rest || post) return null;

    const all = await photos();
    const t = await tags();
    const subs = await subjects(env, site.id);
    const names = new Map(subs.map((x) => [x.subject, x.label]));
    const of = ofParam(url.searchParams.get('of') ?? '');
    const known = (p) => (t.get(p.id) ?? []).filter((x) => names.has(x));
    const count = (subject) => all.filter((p) => known(p).includes(subject)).length;
    const untagged = all.filter((p) => !known(p).length).length;
    const list = of === 'none' ? all.filter((p) => !known(p).length) : of ? all.filter((p) => known(p).includes(of)) : all;
    const chip = (value, label, n) => `<a class="chip${value === of ? ' on' : ''}" href="${esc(`${base}/photos${value ? `?of=${encodeURIComponent(value)}` : ''}`)}"${value === of ? ' aria-current="true"' : ''}>${esc(label)} <span>${n}</span></a>`;
    const chips = [chip('', 'All', all.length), untagged ? chip('none', 'Not sorted', untagged) : '', ...subs.map((x) => [x, count(x.subject)]).filter(([, n]) => n).map(([x, n]) => chip(x.subject, x.label, n))].join('');
    const options = (exclude = [], selected = '') => {
      const groups = [...new Set(subs.map((x) => x.group))];
      return groups.map((g) => `<optgroup label="${esc(g)}">${subs.filter((x) => x.group === g && !exclude.includes(x.subject)).map((x) => `<option value="${esc(x.subject)}"${x.subject === selected ? ' selected' : ''}>${esc(x.label)}</option>`).join('')}</optgroup>`).join('');
    };
    const ofInput = of ? `<input type="hidden" name="of" value="${esc(of)}">` : '';
    const card = (p) => {
      const mine = known(p);
      return `<li class="card"><img src="${esc(photoUrl(p.id))}" alt="${esc(p.alt || 'Photo')}" loading="lazy">
        <div class="tags">${mine.map((x) => `<form method="post" action="${base}/photos/${p.id}/untag" class="tag">${ofInput}<input type="hidden" name="subject" value="${esc(x)}"><span>${esc(names.get(x))}</span><button class="link" aria-label="${esc(`Not ${names.get(x)}`)}">×</button></form>`).join('') || '<span class="muted small">Not sorted</span>'}</div>
        <form method="post" action="${base}/photos/${p.id}/tag" class="row">${ofInput}<select name="subject" aria-label="This photo is also of"><option value="">Photo of…</option>${options(mine)}</select><button>Add</button></form>
        <form method="post" action="${base}/photos/${p.id}/alt" data-save>${ofInput}<label>Description<input name="alt" value="${esc(p.alt ?? '')}" maxlength="200"></label><button>Save</button></form>
        <form method="post" action="${base}/photos/${p.id}/remove">${ofInput}<button class="link">Remove</button></form></li>`;
    };
    return {
      title: 'Photos', back: base,
      body: `${note(url)}${await usageLine()}<form id="photo-form" class="card" method="post" action="${base}/photos/upload">
        <label>Add photos<input type="file" accept="image/*" multiple required></label>
        <label>Photos of<span class="hint">So they're offered first when you choose a photo for that dog, litter or page. You can also add photos from the dog's or litter's own screen.</span>
          <select name="tags"><option value="">Choose later</option>${options([], of)}</select></label>
        <label>What's in the photo<span class="hint">Helps visitors who use screen readers, and search engines. For example "Willow on autumn leaves".</span><input name="alt" maxlength="200"></label>
        <button class="primary">Upload</button><p id="photo-status" class="muted small" role="status"></p>
        <p class="muted small">Photos are made smaller on your phone before they're sent, and the camera's location is removed.</p></form>
        ${all.length ? `<nav class="chips" aria-label="Show photos of">${chips}</nav>` : ''}
        <ul class="ph-list">${list.map(card).join('') || (all.length ? '<li class="muted">No photos here.</li>' : '')}</ul>`,
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
    const matches = await env.DB.prepare('SELECT COUNT(*) AS n FROM link_pending WHERE site_id = ?').bind(site.id).first('n');
    return {
      title: 'Publish', back: base,
      body: `${note(url)}${matches ? matchesWaiting(site.subdomain, matches) : ''}<section class="card"><h2>${list.length ? 'Changes since your last publish' : 'Nothing to publish'}</h2>
        ${list.length ? `<ul class="changes">${list.map((c) => `<li><span>${esc(c.text)}</span>${c.path ? `<a href="${esc(prev(c.path))}">Preview</a>` : ''}</li>`).join('')}</ul>` : '<p class="muted">Your website already shows everything in your draft.</p>'}
        <p class="row"><a class="button" href="${esc(prev('/'))}">Preview the whole site</a></p>
        ${list.length ? `<form method="post" action="${base}/publish"><button class="primary">Publish ${list.length} change${list.length === 1 ? '' : 's'}</button></form>` : ''}</section>
        ${snaps.length > 1 ? `<form method="post" action="${base}/publish/undo" class="card"><p class="muted small">Undo goes back to the version before the one visitors see now.</p><button>Undo last publish</button></form>` : ''}`,
    };
  }

  // ---------- inbox (plan 3.10, decision 12) ----------
  // An application: already on the simple waitlist, or a button to add them.
  async function listedLine(msg) {
    const on = await env.DB.prepare("SELECT id, status FROM waitlist_entries WHERE site_id = ? AND inquiry_id = ?").bind(site.id, msg.id).first();
    if (on) return `<p class="muted small">${on.status === 'waiting' ? 'On your waitlist.' : 'On your waitlist, marked fulfilled.'} <a href="${base}/waitlist">See the waitlist</a></p>`;
    if ((await kos()).linked) return '';
    return `<p><a class="button" href="${base}/waitlist/new?from=${esc(msg.id)}">Add to waitlist</a></p>`;
  }
  async function inbox() {
    const rest = url.pathname.slice(`${base}/inbox`.length);
    const post = request.method === 'POST';
    const m = rest.match(/^\/([0-9a-f-]{36})(\/delete|\/unread)?$/);
    if (m) {
      const msg = await env.DB.prepare('SELECT * FROM inquiries WHERE id = ? AND site_id = ?').bind(m[1], site.id).first();
      if (!msg) return null;
      if (post && m[2] === '/delete') { await env.DB.prepare('DELETE FROM inquiries WHERE id = ? AND site_id = ?').bind(msg.id, site.id).run(); return redirect(`${base}/inbox?note=deleted`); }
      if (post && m[2] === '/unread') { await env.DB.prepare('UPDATE inquiries SET read_at = NULL WHERE id = ?').bind(msg.id).run(); return redirect(`${base}/inbox`); }
      if (post || m[2]) return null;
      if (!msg.read_at) await env.DB.prepare('UPDATE inquiries SET read_at = ? WHERE id = ?').bind(new Date().toISOString(), msg.id).run();
      const application = msg.kind === 'application';
      const subject = application ? `Re: your puppy application to ${site.kennel_name || site.subdomain}` : `Re: ${msg.topic || `your message to ${site.kennel_name || site.subdomain}`}`;
      const mailto = `mailto:${encodeURIComponent(msg.email)}?subject=${encodeURIComponent(subject)}`;
      const answers = application ? JSON.parse(msg.answers || '[]') : [];
      // An application's answers, each question with what they wrote under it.
      const text = application
        ? (answers.length ? `<dl class="answers">${answers.map(([q, a]) => `<dt>${esc(q)}</dt><dd>${esc(a).replace(/\n/g, '<br>')}</dd>`).join('')}</dl>` : '<p class="muted">No questions answered.</p>')
        : `<p class="message">${esc(msg.message).replace(/\n/g, '<br>')}</p>`;
      return {
        title: msg.name, back: `${base}/inbox`,
        body: `<section class="card"><p class="muted small">${esc(when(msg.received_at))}${msg.topic ? ` · ${esc(msg.topic)}` : ''}</p>
          ${text}
          <dl class="kv"><dt>Email</dt><dd>${esc(msg.email)}</dd>${msg.phone ? `<dt>Phone</dt><dd><a href="tel:${esc(msg.phone.replace(/[^\d+]/g, ''))}">${esc(msg.phone)}</a></dd>` : ''}</dl>
          <p class="row"><a class="button primary" href="${esc(mailto)}">Reply</a><button type="button" data-copy="${esc(msg.email)}">Copy email</button></p>
          ${application ? await listedLine(msg) : ''}</section>
          <form method="post" action="${base}/inbox/${msg.id}/unread"><button class="link">Mark as unread</button></form>
          <form method="post" action="${base}/inbox/${msg.id}/delete" class="card danger"><button>Delete this message</button></form>`,
      };
    }
    if (rest || post) return null;
    const { results } = await env.DB.prepare('SELECT id, name, topic, message, received_at, read_at FROM inquiries WHERE site_id = ? ORDER BY received_at DESC LIMIT 200').bind(site.id).all();
    return {
      title: 'Inbox', back: base,
      body: `${note(url)}${results.length ? `<ul class="items">${results.map((r) => `<li class="item${r.read_at ? '' : ' unread'}"><a href="${base}/inbox/${r.id}"><b>${r.read_at ? '' : '<span class="dot-new" aria-label="Unread"></span>'}${esc(r.name)}</b><span>${esc(when(r.received_at))} · ${esc(r.topic || r.message.slice(0, 80))}</span></a></li>`).join('')}</ul>` : '<section class="card"><p class="muted">No messages yet. Messages from your site\'s contact form, and applications from your waitlist page, land here.</p></section>'}
        <p class="muted small">Messages are kept for 90 days, then deleted. Reply opens your own email.</p>`,
    };
  }

  // ---------- the simple waitlist (plan 3.8) ----------
  async function waitlistScreen() {
    const rest = url.pathname.slice(`${base}/waitlist`.length);
    const post = request.method === 'POST';
    const back = (n) => redirect(`${base}/waitlist?note=${n}`);
    const FIELDS = [
      ['name', 'Their name', null, 80],
      ['list_name', 'Name on the list', 'What your website shows. Leave empty for their first name and last initial, like "Megan R.".', 40],
      ['email', 'Email', 'For Offer pups. Never shown.', 254],
      ['phone', 'Phone', 'Never shown.', 30],
      ['wants', 'What they want', 'Shown on the list, like "Female · Black & white".', 120],
    ];
    const form = (action, v, { err, edit = false, from = null } = {}) => `${errorBox(err)}<form method="post" action="${esc(action)}" class="card" data-save>
      ${from ? `<input type="hidden" name="inquiry_id" value="${esc(from)}">` : ''}
      ${FIELDS.map(([n, label, hint, max]) => `<label>${esc(label)}${hint ? `<span class="hint">${esc(hint)}</span>` : ''}<input name="${n}"${n === 'email' ? ' type="email"' : n === 'phone' ? ' type="tel"' : ''} value="${esc(v?.[n] ?? '')}" maxlength="${max}"${n === 'name' ? ' required' : ''}></label>`).join('')}
      <label class="check"><input type="checkbox" name="private" value="1"${v?.private ? ' checked' : ''}> <span>Keep their name private<span class="hint">The list shows it masked, like "A***** K" for Andrea Kim, in place of the name on the list.</span></span></label>
      ${edit ? `<label>Added<span class="hint">Their place comes from the order of the list, not this date.</span><input name="added_on" type="date" value="${esc(v?.added_on ?? '')}"></label>` : ''}
      <button class="primary">${edit ? 'Save' : 'Add to waitlist'}</button></form>`;
    const values = async () => Object.fromEntries(await request.formData());

    if (rest === '/new') {
      const fromId = url.searchParams.get('from');
      if (post) {
        const v = await values();
        const inquiry = v.inquiry_id ? await env.DB.prepare('SELECT id FROM inquiries WHERE id = ? AND site_id = ?').bind(v.inquiry_id, site.id).first() : null;
        try { await addEntry(env, site.id, v, { inquiryId: inquiry?.id ?? null }); } catch (err) {
          if (!(err instanceof WaitlistError)) throw err;
          return { title: 'Add to waitlist', back: `${base}/waitlist`, body: form(`${base}/waitlist/new`, v, { err: err.message, from: inquiry?.id }) };
        }
        return back('listed');
      }
      let v = {};
      if (fromId) {
        const msg = await env.DB.prepare('SELECT * FROM inquiries WHERE id = ? AND site_id = ?').bind(fromId, site.id).first();
        if (msg) {
          const answers = JSON.parse(msg.answers || '[]');
          const priv = wantsPrivate(answers);
          v = { name: msg.name, email: msg.email, phone: msg.phone, private: priv, list_name: priv ? maskedNameFor(msg.name) : listNameFor(msg.name), wants: suggestWants(answers) };
        }
      }
      return { title: 'Add to waitlist', back: fromId ? `${base}/inbox/${fromId}` : `${base}/waitlist`, body: `<p class="muted">They go to the end of the list. Check what the list will show before adding.</p>${form(`${base}/waitlist/new`, v, { from: fromId })}` };
    }

    const m = rest.match(/^\/([0-9a-f-]{36})(?:\/(fulfil|back|up|down|remove))?$/);
    if (m) {
      const e = await getEntry(env, site.id, m[1]);
      if (!e) return null;
      if (m[2]) {
        if (!post) return null;
        if (m[2] === 'fulfil') { await setFulfilled(env, site.id, e.id, true); return back('fulfilled'); }
        if (m[2] === 'back') { await setFulfilled(env, site.id, e.id, false); return back('back'); }
        if (m[2] === 'remove') { await removeEntry(env, site.id, e.id); return back('unlisted'); }
        await moveEntry(env, site.id, e.id, m[2] === 'up' ? -1 : 1);
        return back('moved');
      }
      if (post) {
        const v = await values();
        try { await updateEntry(env, site.id, e.id, v); } catch (err) {
          if (!(err instanceof WaitlistError)) throw err;
          return { title: e.name, back: `${base}/waitlist`, body: form(`${base}/waitlist/${e.id}`, { ...e, ...v }, { err: err.message, edit: true }) };
        }
        return back('listsaved');
      }
      return {
        title: e.name, back: `${base}/waitlist`,
        body: `${form(`${base}/waitlist/${e.id}`, { ...e, private: e.list_name === maskedNameFor(e.name) }, { edit: true })}
          <form method="post" action="${base}/waitlist/${e.id}/remove" class="card danger"><p class="muted small">Delete takes them off without marking them fulfilled, and can't be undone.</p><button>Delete from the waitlist</button></form>`,
      };
    }
    if (rest || post) return null;

    const k = await kos();
    const page = await getPage(env, site.id, 'waitlist');
    const siteUrl = siteLink(env, site.subdomain, '/litters');
    const list = await waiting(env, site.id);
    const done = await fulfilled(env, site.id);
    const fmt = (ymd) => (ymd ? new Date(`${ymd}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '');
    const item = (e, i) => `<li class="card wl-entry"><p><b>#${e.position} ${esc(e.name)}</b><span class="muted small"> · shown as ${esc(e.list_name)}${e.list_name === maskedNameFor(e.name) ? ' (private)' : ''}</span></p>
      <p class="muted small">${esc([e.wants, `added ${fmt(e.added_on)}`].filter(Boolean).join(' · '))}</p>
      <div class="row">${e.email ? `<a class="button primary" href="${esc(offerMailto(e, { kennelName: site.kennel_name || site.subdomain, siteUrl, message: page.offer_message }))}">Offer pups</a>` : '<span class="muted small">No email: add one to offer pups.</span>'}
        <form method="post" action="${base}/waitlist/${e.id}/fulfil"><button>Fulfilled</button></form>
        <a class="button" href="${base}/waitlist/${e.id}">Edit</a>
        <span class="order">${i ? `<form method="post" action="${base}/waitlist/${e.id}/up"><button aria-label="Move ${esc(e.name)} up">↑</button></form>` : ''}${i < list.length - 1 ? `<form method="post" action="${base}/waitlist/${e.id}/down"><button aria-label="Move ${esc(e.name)} down">↓</button></form>` : ''}</span></div></li>`;
    return {
      title: 'Your waitlist', back: base,
      body: `${note(url)}${k.linked ? `<p class="error">Not used: your website shows your KennelOS waitlist, so this list isn't shown on it, and families are added in KennelOS. Remove the KennelOS link under <a href="${base}/pages/waitlist">Waitlist and application</a> to use this one instead.</p>` : ''}
        <p class="muted">Families in order. Your website shows each one's place, the name on the list and what they want, straight away, with no publish. Offer pups opens your own email to them; Fulfilled takes them off and moves everyone below up.</p>
        ${k.linked ? '' : `<p><a class="button primary" href="${base}/waitlist/new">Add a family</a></p>`}
        ${!k.linked && k.offered ? `<p class="muted small">Keep your waitlist in KennelOS Pro instead, with turns, deadlines and status pages for families? Link it under <a href="${base}/pages/waitlist">Waitlist and application</a>.</p>` : ''}
        <ul class="wl-list">${list.map(item).join('') || '<li class="muted">No one on the list yet. Add families from an application in your Inbox, or here.</li>'}</ul>
        <p class="muted small">The Offer pups email's wording is under <a href="${base}/pages/waitlist">Waitlist and application</a>.</p>
        ${done.length ? `<details class="card"><summary>Fulfilled (${done.length})</summary><p class="muted small">Kept 90 days, then deleted.</p><ul class="items">${done.map((e) => `<li class="item"><span><b>${esc(e.name)}</b> <span class="muted small">${esc(fmt(e.done_at.slice(0, 10)))}</span></span>
          <span class="row"><form method="post" action="${base}/waitlist/${e.id}/back"><button>Put back</button></form><form method="post" action="${base}/waitlist/${e.id}/remove"><button class="link">Delete</button></form></span></li>`).join('')}</ul></details>` : ''}`,
    };
  }

  // ---------- reviews to approve (decision 13) ----------
  async function queue() {
    const rest = url.pathname.slice(`${base}/reviews-queue`.length);
    const post = request.method === 'POST';
    const m = rest.match(/^\/([0-9a-f-]{36})\/(approve|decline)$/);
    if (m && post) {
      const r = await env.DB.prepare("SELECT id, photo_id FROM stories WHERE id = ? AND site_id = ? AND status = 'pending'").bind(m[1], site.id).first();
      if (!r) return redirect(`${base}/reviews-queue`);
      const t = new Date().toISOString();
      if (m[2] === 'approve') {
        await env.DB.batch([
          env.DB.prepare("UPDATE stories SET status = 'approved', sort = (SELECT COALESCE(MAX(sort), -1) + 1 FROM stories WHERE site_id = ? AND status != 'pending') WHERE id = ?").bind(site.id, r.id),
          env.DB.prepare('UPDATE sites SET draft_changed_at = ? WHERE id = ?').bind(t, site.id),
        ]);
        return redirect(`${base}/reviews-queue?note=approved`);
      }
      const s2 = [env.DB.prepare('DELETE FROM stories WHERE id = ?').bind(r.id)];
      if (r.photo_id) s2.push(env.DB.prepare('UPDATE photos SET removed_at = ? WHERE id = ? AND site_id = ?').bind(t, r.photo_id, site.id));
      await env.DB.batch(s2);
      return redirect(`${base}/reviews-queue?note=declined`);
    }
    if (rest || post) return null;
    const { results } = await env.DB.prepare("SELECT * FROM stories WHERE site_id = ? AND status = 'pending' ORDER BY submitted_at").bind(site.id).all();
    return {
      title: 'Reviews to approve', back: base,
      body: `${note(url)}${results.map((r) => `<section class="card review-q">
          <p><b>${esc(r.first_name)}</b>${r.town ? `, ${esc(r.town)}` : ''} <span class="muted small">· ${esc(when(r.submitted_at))}</span></p>
          <p class="stars" aria-label="${r.rating} stars">${'★'.repeat(r.rating ?? 0)}</p>
          <p class="message">${esc(r.quote).replace(/\n/g, '<br>')}</p>
          ${r.puppy_name || r.home_month ? `<p class="muted small">${esc([r.puppy_name, r.home_month].filter(Boolean).join(' · '))}</p>` : ''}
          ${r.photo_id ? `<img class="q-photo" src="${esc(photoUrl(r.photo_id))}" alt="Photo sent with the review">` : ''}
          <p class="muted small">They agreed to it being shown with their first name and town.</p>
          <div class="row"><form method="post" action="${base}/reviews-queue/${r.id}/approve"><button class="primary">Approve</button></form>
          <form method="post" action="${base}/reviews-queue/${r.id}/decline"><button>Decline and delete</button></form></div></section>`).join('') || '<section class="card"><p class="muted">No reviews waiting. Families send them from the Reviews page on your site.</p></section>'}
        <p class="muted small">An approved review shows on your site after you publish. You can hide it later under Reviews.</p>`,
    };
  }

  // ---------- storage, download a copy, delete my site (plan 4.3) ----------
  async function usage() {
    const limits = await env.DB.prepare('SELECT storage_limit, photo_limit FROM sites WHERE id = ?').bind(site.id).first();
    const used = await env.DB.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(bytes), 0) AS bytes FROM photos WHERE site_id = ? AND removed_at IS NULL').bind(site.id).first();
    return { ...used, ...limits };
  }
  const mb = (b) => `${Math.round(b / 1024 / 1024 * 10) / 10} MB`;
  async function usageLine() {
    const u = await usage();
    const parts = [`${u.n} photo${u.n === 1 ? '' : 's'}${u.photo_limit ? ` of ${u.photo_limit}` : ''}`, `${mb(u.bytes)}${u.storage_limit ? ` of ${mb(u.storage_limit)}` : ''} used`];
    const near = (u.storage_limit && u.bytes > u.storage_limit * 0.9) || (u.photo_limit && u.n > u.photo_limit * 0.9);
    return `<p class="${near ? 'error' : 'muted'} small">${esc(parts.join(' · '))}${near ? '. Nearly full: remove photos you no longer use, or ask KennelPort for more room.' : ''}</p>`;
  }

  async function exportManifest() {
    const content = await exportContent(env, site.id);
    const { results: rows } = await env.DB.prepare('SELECT kind, name, email, phone, topic, message, answers, received_at FROM inquiries WHERE site_id = ? ORDER BY received_at').bind(site.id).all();
    const msgs = rows.map(({ answers, ...m }) => (m.kind === 'application' ? { ...m, answers: JSON.parse(answers || '[]') } : m));
    const { results: ph } = await env.DB.prepare('SELECT id, alt, type, width, height, created_at FROM photos WHERE site_id = ? AND removed_at IS NULL ORDER BY created_at').bind(site.id).all();
    const t = await tags();
    const names = new Map((await subjects(env, site.id)).map((x) => [x.subject, x.label]));
    const date = new Date().toISOString().slice(0, 10);
    return json({
      filename: `${site.subdomain}-kennelport-${date}.zip`,
      readme: `A copy of ${site.kennel_name || site.subdomain}'s KennelPort website, made ${date}.\n\n`
        + 'content.json: everything on the site (dogs, litters, puppies, pages, reviews, extras...), in the form KennelPort can load back.\n'
        + 'messages.json: the messages and applications in your Inbox.\nwaitlist.json: your waitlist, in order, and the families marked fulfilled.\nphotos.json: each photo\'s description and what it\'s of; the photos are in photos/, named by their id.\n',
      content, messages: msgs,
      waitlist: (await env.DB.prepare('SELECT name, list_name, email, phone, wants, added_on, status, done_at FROM waitlist_entries WHERE site_id = ? ORDER BY status DESC, sort').bind(site.id).all()).results,
      photos: ph.map((p) => ({ ...p, of: (t.get(p.id) ?? []).filter((x) => names.has(x)).map((x) => names.get(x)), file: `${p.id}.${p.type === 'image/webp' ? 'webp' : 'jpg'}`, url: `${base}/photos/${p.id}/full` })),
    });
  }

  async function account() {
    const rest = url.pathname.slice(`${base}/account`.length);
    const owner = site.role === 'owner';
    const fresh = Date.now() - Date.parse(user.signedInAt) <= FRESH_SIGN_IN_MS;
    const storage = await usageLine();
    const render = (err) => ({
      title: 'Your site', back: base,
      body: `<section class="card"><h2>Storage</h2>${storage}</section>
        <section class="card"><h2>Download a copy</h2><p class="muted">A zip of your site's words, photos and messages. It's made on this device, so on a phone with many photos a computer may be quicker.</p>
          <p><button id="export" data-manifest="${base}/export.json">Download a copy</button></p><p id="export-status" class="muted small" role="status"></p></section>
        ${owner ? `<section class="card danger"><h2>Delete my site</h2>
          <p>This deletes every dog, litter, puppy, page, photo, review and message <strong>straight away</strong>. There's no undo, and KennelPort keeps no copy, so download one first.</p>
          <p class="muted small">Your address then shows "This breeder is no longer hosting with KennelPort", and it isn't given to anyone else. Cloudflare keeps its own backup of deleted database rows for up to 30 days, which KennelPort can't turn off. Emails already sent stay where they arrived.</p>
          ${errorBox(err)}
          ${fresh ? `<form method="post" action="${base}/account/delete">
            <label>Type <strong>${esc(site.subdomain)}</strong> to confirm<input name="confirm" autocomplete="off" autocapitalize="none" spellcheck="false" required></label>
            <button>Delete my site</button></form>`
          : `<p>For safety, deleting needs a fresh sign-in. <form method="post" action="/signout" class="inline"><button class="link">Sign out</button></form>, sign in again, then come back here within 15 minutes.</p>`}
        </section>` : ''}
        <script src="/_kp/m/zip.js?v=${APP_VERSION}" defer></script>`,
    });
    if (rest === '/delete' && request.method === 'POST') {
      if (!owner) return { title: 'Your site', back: base, body: '<p class="error">Only the owner can delete the site.</p>' };
      if (!fresh) return render('Sign in again first.');
      try { await closeSite(env, site.id, (await request.formData()).get('confirm')); } catch (err) {
        if (err instanceof SiteError) return render(err.message);
        throw err;
      }
      return new Response(null, { status: 303, headers: { location: '/deleted', 'cache-control': 'no-store' } });
    }
    if (rest || request.method === 'POST') return null;
    return render();
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
    else if (p === '/payment' || /^\/payment\/(application_fee|deposit|safe_notice)$/.test(p)) view = await payment();
    else if (p.startsWith('/publish')) view = await publishScreen();
    else if (p.startsWith('/inbox')) view = await inbox();
    else if (p.startsWith('/embeds/')) view = await embedsAction();
    else if (p === '/share' || p.startsWith('/share/')) view = await shareScreen();
    else if (p === '/waitlist' || p.startsWith('/waitlist/')) view = await waitlistScreen();
    else if (p === '/export.json' && request.method === 'GET') return exportManifest();
    else if (p.startsWith('/account')) view = await account();
    else if (p.startsWith('/reviews-queue')) view = await queue();
    else if (p === '/kennelos' || p.startsWith('/kennelos/')) view = await kennelosScreen();
    else if (/^\/notices\/[0-9a-f-]{36}\/read$/.test(p) && request.method === 'POST') {
      await env.DB.prepare('UPDATE notices SET read_at = ? WHERE id = ? AND site_id = ?').bind(new Date().toISOString(), p.split('/')[2], site.id).run();
      return redirect(base);
    } else if (/^\/litters\/[0-9a-f-]{36}\/keep$/.test(p) && request.method === 'POST') {
      await keepLitter(env, site.id, p.split('/')[2]);
      return redirect(`${base}/litters?note=kept`);
    }
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
        if (view && !(view instanceof Response)) view = await litterPhotos(await withChildren(view, `${base}/litters/${view.rec?.id}/puppies`, 'puppies', 'Puppies'));
      }
    } else {
      const lm = p.match(/^\/lists\/(reviews|steps|extras|products|policies|faq|waitlist_help|questions|albums)(\/|$)/);
      if (lm) view = await collection(`${base}/lists/${lm[1]}`, lm[1], null, { back: lm[1] === 'questions' ? `${base}/pages/waitlist` : `${base}/pages` });
    }
    if (!view) return null;
    if (view instanceof Response) return view;
    return page(view.title, view.body, { back: view.back });
  };
}

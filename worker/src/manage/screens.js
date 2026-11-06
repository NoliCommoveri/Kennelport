// The manage app's editing screens (phase 2): everything under /s/<subdomain>/.
// Every form posts to its own address and redirects back with a note; a form with
// a problem comes back with what was typed and the reason.
import { escapeHtml as esc } from '../lib/html.js';
import { json } from '../lib/http.js';
import { PAGES, HOME_BLOCKS, HOME_BLOCK_ORDER, SITE_FIELDS, PAYMENT_FIELDS, SAFE_NOTICE_FIELDS, ContentError, brandImageOk, FAQ_PLACES, CUSTOM_PAGE, ADDED_BLOCK_FIELDS } from '../content/model.js';
import {
  KINDS, listRecords, getRecord, saveRecord, setField, removeRecord, moveRecord,
  saveSite, getPage, savePage, getBlock, saveBlock, getPayment, savePayment, getAddedBlock, saveAddedBlock,
} from '../content/records.js';
import { pageBlocks, customPages, addedBlocks, BLOCK_TYPES, isCustom } from '../content/blocks.js';
import { fields, field, parseForm, LABELS, labelFor } from './forms.js';
import { savePhoto, PhotoError } from '../photos.js';
import { subjects, isSubject, tagPhotos, untagPhoto, tagsByPhoto } from '../photoTags.js';
import { buildSnapshot, loadSnapshot, publish, undoPublish, listSnapshots } from '../publish.js';
import { changes } from '../diff.js';
import { makePreviewToken } from '../site.js';
import { siteLink } from '../ops/sites.js';
import { APP_VERSION } from './version.js';
import { defaultSay, NOTE_KEYS, sayError, sayMessage } from './wording.js';
import { STATUS_TEXT, SAFE_NOTICE_TEXT, blockRows, pageOn as pageShows, label as pageMenuName } from '../render/parts.js';
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
import { leavingLitters, keepLitter, deleteLitter } from '../kennelos/clock.js';
import { NOT_FOR_DEMO } from '../lib/demo.js';
import { litterDaysFor, loadBuild } from '../content/rules.js';

export const FRESH_SIGN_IN_MS = 15 * 60 * 1000;

const when = (iso) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }) + ' UTC';
const redirect = (location) => new Response(null, { status: 303, headers: { location, 'cache-control': 'no-store' } });

const day = (ymd) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' });
const ic = (n) => `<span class="ic" aria-hidden="true"><svg class="i"><use href="#i-${n}"/></svg></span>`;
// The note after a change, and a form's error, in the owner's wording (wording.js).
const noteFor = (url, say) => (NOTE_KEYS.includes(url.searchParams.get('note')) ? `<p class="notice" role="status">${esc(say(`note.${url.searchParams.get('note')}`))}</p>` : '');
const errorFor = (err, say) => (err ? `<p class="error" role="alert">${esc(say('list.error', { error: sayError(err, say, fieldLabel(say)) }))}</p>` : '');
// A field's label on her forms, by its name, for {field} in an error.
const fieldLabel = (say) => (name) => {
  const kind = Object.keys(LABELS).find((k) => LABELS[k][name]);
  return labelFor(kind ?? null, name, say)[0];
};

// How one item reads in each list: its name, and the line under it in the owner's
// wording (wording.js, lists.sub.*), as are the lists' names.
const LISTS = {
  dogs: { name: (r) => r.call_name, sub: (r, say) => [r.role, r.show_on_site ? null : say('lists.sub.hidden')].filter(Boolean).join(' · ') },
  litters: { name: (r) => r.name, sub: (r, say) => (['planned', 'current', 'past'].includes(r.stage) ? say(`lists.sub.stage.${r.stage}`) : '') },
  puppies: { name: (r) => r.name, sub: (r, say) => STATUS_TEXT[r.status] ?? say('lists.sub.hidden_puppy') },
  health: { name: (r) => r.test, sub: (r, say) => `${r.result}${r.show ? '' : ` · ${say('lists.sub.not_shown')}`}` },
  reviews: { name: (r) => r.first_name, sub: (r, say) => (r.status === 'hidden' ? say('lists.sub.hidden') : r.quote.slice(0, 60)) },
  steps: { name: (r) => r.heading, sub: () => '' },
  extras: { name: (r) => r.name, sub: (r, say) => (r.kind === 'homegoing' ? say('lists.sub.package', { weeks: r.weeks ?? '' }) : r.grp ?? '') },
  partners: { name: (r) => r.name, sub: (r, say) => (r.hidden_by_kennelos ? say('lists.sub.not_sent') : r.url ? r.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') : '') },
  products: { name: (r) => r.name, sub: (r, say) => [r.grp, r.code ? say('lists.sub.code', { code: r.code }) : null, r.transport ? say('lists.sub.transport') : null, r.home_badge ? say('lists.sub.home_badge') : null].filter(Boolean).join(' · ') },
  policies: { name: (r) => r.heading, sub: () => '' },
  // A question also placed elsewhere says so here, so she can see at a glance
  // which ones her pages are carrying (model.js FAQ_PLACES).
  faq: { name: (r) => r.heading, sub: (r, say) => ((r.places ?? []).length ? say('lists.sub.also_on', { places: (r.places ?? []).map((x) => (FAQ_PLACES[x] ?? x).toLowerCase()).join(', ') }) : '') },
  waitlist_help: { name: (r) => r.heading, sub: () => '' },
  albums: { name: (r) => r.title, sub: (r, say) => [say.n('lists.sub.photos', (r.photos ?? []).length), r.show_on_site ? null : say('lists.sub.hidden')].filter(Boolean).join(' · ') },
  questions: { name: (r) => r.label, sub: (r, say) => [QUESTION_TYPES.includes(r.type) ? say(`lists.qtype.${r.type}`) : r.type, say(r.required ? 'lists.sub.must_answer' : 'lists.sub.optional')].join(' · ') },
};
// Under a product's fields: the brand's embed code, read for its link and picture
// (badgeCode.js), never kept.
const BADGE_CODE_FIELD = (say) => `<label for="f-badge_code">${esc(say('products.or_paste_the_embed'))}<span class="hint">${esc(say('products.the_html_from_the'))}</span><textarea id="f-badge_code" name="_badge_code" rows="4" autocapitalize="none" spellcheck="false" placeholder="&lt;a href=&quot;https://…&quot;&gt;&lt;img src=&quot;https://…&quot;&gt;&lt;/a&gt;"></textarea></label>`;
// Under a partner kennel's fields: the badge code a kennel hands out, read for its
// link and logo (badgeCode.js), never kept.
const PARTNER_BADGE_FIELD = (say) => `<label for="f-badge_code">${esc(say('partners.or_paste_the_badge'))}<span class="hint">${esc(say('partners.the_html_for_their'))}</span><textarea id="f-badge_code" name="_badge_code" rows="4" autocapitalize="none" spellcheck="false" placeholder="&lt;a href=&quot;https://…&quot;&gt;&lt;img src=&quot;https://…&quot;&gt;&lt;/a&gt;"></textarea></label>`;
// The kinds of application question (their words: wording.js lists.qtype.*).
const QUESTION_TYPES = ['text', 'paragraph', 'choice', 'yes_no', 'litter', 'phone', 'town'];
const FORM_KIND = { policies: 'expander', faq: 'expander', waitlist_help: 'expander' };
// The kinds whose records a photo can be of (photoTags.js).
const SUBJECT_OF = { dogs: 'dog', litters: 'litter', puppies: 'puppy', extras: 'extra', products: 'product' };

// Records from KennelOS that share a name with one already on the site wait for
// her yes; until then the site keeps showing her own version, so this sits at the
// top of Home and Publish, not only on the KennelOS screen.
export function matchesWaiting(subdomain, n, say = defaultSay) {
  return `<section class="card notice-card" role="status" id="matches-waiting"><p><strong>${esc(say.n('kennelos.waiting', n))}</strong> ${esc(say.n('kennelos.waiting.text', n))}</p><p class="row"><a class="button primary" href="/s/${esc(subdomain)}/kennelos#matches">${esc(say.n('kennelos.waiting.answer', n))}</a></p></section>`;
}

export function createScreens({ env, request, url, site, user, page, say = defaultSay }) {
  const note = (u) => noteFor(u, say);
  const errorBox = (err) => errorFor(err, say);
  // A list's name and one of its items, in the owner's wording.
  const listTitle = (kind) => say(`list.${kind}.title`);
  const oneOf = (kind) => say(`list.${kind}.one`);
  const base = `/s/${site.subdomain}`;
  const photoUrl = (id) => `${base}/photos/${id}/thumb`;
  let photosCache = null;
  const photos = async () => (photosCache ??= (await env.DB.prepare('SELECT id, alt FROM photos WHERE site_id = ? AND removed_at IS NULL ORDER BY created_at DESC').bind(site.id).all()).results);
  const dogsList = async () => (await env.DB.prepare('SELECT id, call_name FROM dogs WHERE site_id = ? ORDER BY sort').bind(site.id).all()).results;
  const littersList = async () => (await env.DB.prepare('SELECT id, name FROM litters WHERE site_id = ? ORDER BY sort').bind(site.id).all()).results;
  const partnersList = async () => (await env.DB.prepare('SELECT id, name FROM partner_kennels WHERE site_id = ? ORDER BY sort, name').bind(site.id).all()).results;
  let tagsCache = null;
  const tags = async () => (tagsCache ??= await tagsByPhoto(env, site.id));

  // Tagging many photos at once (the Photos screen, an album's screen): a tick box
  // on each photo, joined by its form attribute to one bar that says who the ticked
  // photos are of. `first`: { label, names: Map subject → name } offered at the top
  // (an album's litter's puppies, by name alone: the group already says whose). `back`: where to return, under base.
  const tagManyBar = (subs, { back, first = null }) => {
    const opt = (x) => `<option value="${esc(x.subject)}">${esc(first?.names.get(x.subject) ?? x.label)}</option>`;
    const rest = first ? subs.filter((x) => !first.names.has(x.subject)) : subs;
    const top = first ? subs.filter((x) => first.names.has(x.subject)) : [];
    const groups = [...new Set(rest.map((x) => x.group))];
    return `<form method="post" action="${base}/photos/tag-many" id="tag-many" class="row"><input type="hidden" name="back" value="${esc(back)}">
      <select name="subject" aria-label="Who the ticked photos are of"><option value="">${esc(say('photos.who_s_in_them'))}</option>${top.length ? `<optgroup label="${esc(first.label)}">${top.map(opt).join('')}</optgroup>` : ''}${groups.map((g) => `<optgroup label="${esc(g)}">${rest.filter((x) => x.group === g).map(opt).join('')}</optgroup>`).join('')}</select>
      <button class="primary">${esc(say('photos.tag'))}</button></form>`;
  };
  const tickBox = (p) => `<label class="check"><input type="checkbox" name="photos" value="${esc(p.id)}" form="tag-many"> ${esc(say('photos.tick'))}</label>`;
  // pick: { groups: [{ label, subject }], tags: [subject…] to tag uploads with, alt }
  const ctxFor = async (kind, pick) => {
    const ctx = { kind, say, photos: await photos(), photoUrl, dogs: await dogsList(), litters: await littersList(), partners: kind === 'dogs' ? await partnersList() : [], photosLink: `${base}/photos` };
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
  async function fromBadgeCode(fd, values, kind = 'products') {
    const code = String(fd.get('_badge_code') ?? '').trim();
    if (!code) return;
    try {
      const { link, image, alt } = readBadgeCode(code);
      // A partner kennel's: its website (unless KennelOS gave one) and its logo,
      // always copied onto the site.
      if (kind === 'partners') {
        if (link && !values.url) values.url = link;
        if (!values.name && alt) values.name = alt;
        if (image) values.photo_id = await storeBadgeImage(env, site.id, image, alt ?? values.name ?? '');
        return;
      }
      if (link) values.link_url = link;
      if (!values.name && alt) values.name = alt;
      // An approved brand's picture is shown from the brand; any other is copied.
      if (image && brandImageOk(image)) { values.image_url = image; values.photo_id = null; }
      else if (image) { values.photo_id = await storeBadgeImage(env, site.id, image, alt ?? values.name ?? ''); values.image_url = null; }
    } catch (err) {
      if (err instanceof BadgeCodeError) throw new ContentError('embed code', sayMessage('badge', err.message, say));
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

  // Litters about to go (5.3): each with the day it's deleted, Keep, and Remove now
  // for when she doesn't want to wait out the 30 days.
  async function leavingCard() {
    const list = await leavingLitters(env, site.id);
    if (!list.length) return '';
    return `<section class="card" id="leaving"><h2>${esc(say('litterlist.leaving_your_site'))}</h2>
      <p class="muted small">Litters off your site are deleted ${await litterDaysFor(env, site.id)} days after they left, with their puppies, albums and the photos nothing else uses. Keep one to have it stay as a past litter, or Remove now to delete it today instead of waiting. Removing can't be undone.</p>
      <ul class="items">${list.map((l) => `<li class="item"><a href="${base}/litters/${l.id}"><b>${esc(l.name)}</b><span>Deleted on ${esc(day(l.deletes_on))}</span></a>
        <form method="post" action="${base}/litters/${l.id}/keep"><button>${esc(say('litterlist.keep'))}</button></form>
        <form method="post" action="${base}/litters/${l.id}/remove-now"><button class="link">${esc(say('litterlist.remove_now'))}</button></form></li>`).join('')}</ul></section>`;
  }

  // Dogs that wait in the draft (5.3): never deleted by a clock; removing is hers.
  // Co-owned dogs (docs/Co_Owned_Dogs_Plan.md): her partner kennels, from Dogs.
  const partnersLink = () => `<p><a class="button" href="${base}/lists/partners">${esc(say('litterlist.partner_kennels'))}</a> <span class="muted small">${esc(say('litterlist.the_kennels_your_co'))}</span></p>`;
  const partnersIntro = async () => `<p class="muted">The kennels your co-owned dogs are shared with. Your Dogs page shows co-owned dogs living with one of them under Co-owned, with that kennel's logo; each co-owned dog's page names its kennels.${(await kos()).linked ? ' The kennels you tick "Name this kennel on my website" for in KennelOS come from there, by name and website: add their logo here.' : ''}</p>`;

  async function offSiteDogsCard(rows) {
    const off = rows.filter((d) => !d.show_on_site || d.hidden_by_kennelos);
    if (!off.length) return '';
    return `<section class="card" id="not-on-site"><h2>${esc(say('doglist.not_on_your_site'))}</h2>
      <p class="muted small">Switched off here${off.some((d) => d.hidden_by_kennelos) ? ', or unticked or archived in KennelOS' : ''}. They wait here, with their photos, until you put them back or remove them.</p>
      <ul class="items">${off.map((d) => `<li class="item"><a href="${base}/dogs/${d.id}"><b>${esc(d.call_name)}</b><span>${d.hidden_by_kennelos ? esc(say('doglist.not_sent_by_kennelos')) : esc(say('doglist.switched_off'))}</span></a>
        <form method="post" action="${base}/dogs/${d.id}/remove"><button class="link">${esc(say('doglist.remove'))}</button></form></li>`).join('')}</ul></section>`;
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
        try {
          const { code, expiresAt } = await makeLinkCode(env, site.id, user.emailHash.slice(0, 12));
          return render({ code, expiresAt });
        } catch (err) {
          if (err instanceof LinkError) return render({ error: sayMessage('kennelos', err.message, say) });
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
          if (err instanceof MatchError) return render({ error: sayMessage('kennelos', err.message, say) });
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
      parts.push(`<section class="card"><h2>${linked ? esc(say('kennelos.linked_to_kennelos')) : esc(say('kennelos.link_kennelos'))}</h2>
        <p class="muted">${linked
          ? esc(say('kennelos.when_you_press_update'))
          : esc(say('kennelos.keep_your_dogs_and'))}</p>
        ${code ? `<p class="notice" role="status">${esc(say('kennelos.your_code'))} <strong class="code">${esc(showCode(code))}</strong><br>In KennelOS, open Settings, then Connect website, and type it in. It works once, for ${CODE_TTL_MS / 60000} minutes${expiresAt ? ` (until ${esc(when(expiresAt))})` : ''}.</p>` : ''}
        ${site.demo_step != null ? `<p class="muted small">${esc(say('kennelos.this_demo_is_linked'))}</p>` : `<form method="post" action="${base}/kennelos/code"><button class="${linked ? '' : 'primary'}">${linked ? esc(say('kennelos.link_another_device')) : esc(say('kennelos.show_a_link_code'))}</button></form>
        <p class="muted small">${esc(say('kennelos.each_phone_or_computer'))}</p>`}</section>`);
      if (linked) {
        parts.push(`<section class="card"><h2>${esc(say('kennelos.devices'))}</h2><ul class="items">${list.map((d) => `<li class="item"><span><b>${esc(d.device_label || say('kennelos.a_kennelos_device'))}</b><span class="muted small"> · ${d.last_bundle_at ? `last update ${esc(when(d.last_bundle_at))}` : `linked ${esc(when(d.linked_at))}, no update yet`}</span>${d.summary?.text ? `<br><span class="muted small">${esc(d.summary.text)}</span>` : ''}</span>
          ${owner ? `<form method="post" action="${base}/kennelos/devices/${d.id}/stop"><button class="link">${esc(say('kennelos.stop_this_device'))}</button></form>` : ''}</li>`).join('')}</ul></section>`);
        const pending = await pendingMatches(env, site.id);
        if (pending.length) parts.push(await matchesCard(pending));
        parts.push(`<form method="post" action="${base}/kennelos/prices" class="card" id="prices"><h2>${esc(say('kennelos.prices'))}</h2>
          <label class="check"><input type="checkbox" name="on" value="1"${prices ? ' checked' : ''}> <span>${esc(say('kennelos.use_my_kennelos_prices'))}<span class="hint">${esc(say('kennelos.on_each_litter_s'))}</span></span></label>
          <button>${esc(say('kennelos.save'))}</button></form>`);
        if (owner) {
          parts.push(`<form method="post" action="${base}/kennelos/unlink" class="card danger"><h2>${esc(say('kennelos.unlink'))}</h2>
            <p class="muted small">${esc(say('kennelos.every_device_stops_and'))}</p>
            <button>${esc(say('kennelos.unlink_kennelos'))}</button></form>`);
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
      const rows = diff.map((c) => `<li><label class="check"><input type="checkbox" name="keep" value="${esc(c.field)}"${c.blanking ? ' checked' : ''}> <span>${esc(c.label)}: ${c.from === null ? 'empty' : `'${esc(c.from)}'`} → ${c.to === null ? 'blank' : `'${esc(c.to)}'`}<span class="hint">${esc(say('kennelos.tick_to_keep_yours'))}</span></span></label></li>`).join('');
      items.push(`<form method="post" action="${base}/kennelos/match" class="card">
        <input type="hidden" name="kind" value="${esc(p.kind)}"><input type="hidden" name="kennelos_id" value="${esc(p.kennelos_id)}">
        <p><b>Is KennelOS's ${esc(what)} "${esc(p.kind === 'dogs' ? p.data.call_name : p.data.name ?? name)}" your website's ${esc(name)}?</b></p>
        <p class="muted small">Yes: your ${esc(name)} page keeps its address, photos and wording, and from now on comes from KennelOS.${pups ? ` Its ${pups} pupp${pups === 1 ? 'y comes' : 'ies come'} with it, matched by name.` : ''}</p>
        ${rows ? `<ul class="plain">${rows}</ul>` : `<p class="muted small">${esc(say('kennelos.nothing_you_typed_changes'))}</p>`}
        <div class="row"><button class="primary" name="answer" value="yes">Yes, the same ${esc(what)}</button><button name="answer" value="no">${esc(say('kennelos.no_keep_them_apart'))}</button></div></form>`);
    }
    return items.length ? `<section id="matches"><h2>${esc(say('kennelos.already_on_your_site'))}</h2><p class="muted">${esc(say('kennelos.these_came_from_kennelos'))}</p>${items.join('')}</section>` : '';
  }

  // ---------- videos and posts (plan 3.3) ----------
  // A card on the screen of whatever they sit on; its forms come back to `here`.
  async function embedsCard(place, here, err) {
    const list = await listEmbeds(env, site.id, place);
    const hidden = `<input type="hidden" name="place" value="${esc(place)}"><input type="hidden" name="back" value="${esc(here)}">`;
    const items = list.map((e, i) => `<li class="item"><span><b>${esc(e.title || PROVIDERS[e.provider]?.name || e.provider)}</b><span class="muted small"> · ${esc(PROVIDERS[e.provider]?.name ?? e.provider)}${e.preview_photo_id ? '' : ', no preview'}</span></span>
      <span class="order">${i ? `<form method="post" action="${base}/embeds/${e.id}/up">${hidden}<button aria-label="Move up">↑</button></form>` : ''}${i < list.length - 1 ? `<form method="post" action="${base}/embeds/${e.id}/down">${hidden}<button aria-label="Move down">↓</button></form>` : ''}<form method="post" action="${base}/embeds/${e.id}/remove">${hidden}<button class="link">${esc(say('pages.remove'))}</button></form></span></li>`).join('');
    return `<section class="card" id="videos"><h2>${esc(say('pages.videos_and_posts'))}</h2>
      <p class="muted small">Paste the link to a video or post on ${esc(Object.values(PROVIDERS).map((p) => p.name).join(', '))}. Your site shows a preview, and plays it only when a visitor taps.</p>
      ${err ? `<p class="error" role="alert">Not added: ${esc(err)}</p>` : ''}
      ${items ? `<ul class="items">${items}</ul>` : ''}
      ${list.length < EMBEDS_PER_PLACE ? `<form method="post" action="${base}/embeds/add">${hidden}<label>${esc(say('pages.link'))}<input name="link" type="url" inputmode="url" placeholder="https://www.youtube.com/watch?v=…" required></label><label>${esc(say('pages.title'))}<span class="hint">${esc(say('pages.optional_shown_under_it'))}</span><input name="title" maxlength="120"></label><button class="primary">${esc(say('pages.add'))}</button></form>` : ''}</section>`;
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
        return redirect(`${here}${here.includes('?') ? '&' : '?'}embed_error=${encodeURIComponent(sayMessage('videos', err.message, say))}#videos`);
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

  // ---------- one list of records, generic ----------
  async function collection(path, kind, scopeId, { back, parentTitle } = {}) {
    const k = KINDS[kind];
    const L = LISTS[kind];
    const rest = url.pathname.slice(path.length).replace(/^\//, '');
    const post = request.method === 'POST';
    const formKind = FORM_KIND[kind] ?? kind;
    const formFields = Object.fromEntries(Object.entries(k.fields).filter(([n]) => !(kind === 'reviews' && n === 'photo_id')));
    const one = SUBJECT_OF[kind];
    const subsFor = (id) => [id && one ? `${one}:${id}` : null, kind === 'puppies' ? `litter:${scopeId}` : null, kind === 'partners' ? 'page:partners' : null].filter(Boolean);
    const pickFor = (rec) => {
      // A partner kennel's logo: from the logos she has added for them.
      if (kind === 'partners') return { groups: [{ label: say('lists.partner_kennel_logos'), subject: 'page:partners' }], tags: ['page:partners'], alt: rec ? `${rec.name} logo` : '' };
      // An album offers its litter's photos first; photos added here are tagged with it.
      if (kind === 'albums') {
        const lit = rec?.litter_id ? `litter:${rec.litter_id}` : null;
        return { groups: [{ label: rec?.litter_id ? say('lists.photos_of_its_litter') : say('lists.your_photos'), subject: lit }], tags: lit ? [lit] : [], alt: rec?.title ?? '' };
      }
      if (!one) return null;
      const groups = [{ label: rec ? `Photos of ${L.name(rec)}` : `Photos of this ${oneOf(kind)}`, subject: rec ? `${one}:${rec.id}` : null }];
      if (kind === 'puppies' && parentTitle) groups.push({ label: `Photos of ${parentTitle}`, subject: `litter:${scopeId}` });
      return { groups, tags: subsFor(rec?.id), alt: rec ? L.name(rec) : '' };
    };

    const form = async (rec, err, values) => {
      const action = rec ? `${path}/${rec.id}` : `${path}/new`;
      const lock = rec ? await lockedFor(kind, rec) : null;
      const from = lock ? `<p class="notice">This ${esc(oneOf(kind))} comes from KennelOS. What's marked "from KennelOS" changes there, then Update website; everything else here is yours.</p>` : '';
      const body = `${from}${errorBox(err)}<form method="post" action="${esc(action)}" data-save class="card">${fields(formFields, values ?? rec ?? { ...(k.defaults ?? {}) }, { ...await ctxFor(formKind, pickFor(rec)), locked: lock })}
        ${kind === 'products' ? BADGE_CODE_FIELD(say) : kind === 'partners' ? PARTNER_BADGE_FIELD(say) : ''}<button class="primary">${esc(rec ? say('list.save') : say('list.add', { one: oneOf(kind) }))}</button></form>
        ${rec ? `<form method="post" action="${esc(`${path}/${rec.id}/remove`)}" class="card danger"><p class="muted small">${esc(say('lists.removing_takes_it_off'))}</p><button>Remove this ${esc(oneOf(kind))}</button></form>` : ''}`;
      return { title: rec ? L.name(rec) : say('list.new', { one: oneOf(kind) }), back: path, body };
    };

    if (!rest) {
      if (post) return null;
      const rows = await listRecords(env, site.id, kind, scopeId);
      const items = rows.map((r, i) => `<li class="item"><a href="${esc(`${path}/${r.id}`)}"><b>${esc(L.name(r))}</b><span>${esc(L.sub(r, say) ?? '')}</span></a>
        <span class="order">${i ? `<form method="post" action="${esc(`${path}/${r.id}/up`)}"><button aria-label="Move ${esc(L.name(r))} up">↑</button></form>` : ''}${i < rows.length - 1 ? `<form method="post" action="${esc(`${path}/${r.id}/down`)}"><button aria-label="Move ${esc(L.name(r))} down">↓</button></form>` : ''}</span></li>`).join('');
      const intro = kind === 'questions' ? `${(await kos()).online ? `<p class="error">${esc(say('lists.not_used_right_now'))}</p>` : ''}<p class="muted">${esc(say('lists.the_application_form_on'))}</p>` : '';
      const extra = kind === 'policies' ? await waitlistPoliciesCard() : kind === 'litters' ? await leavingCard() : kind === 'dogs' ? `${await offSiteDogsCard(rows)}${partnersLink()}` : kind === 'partners' ? await partnersIntro() : kind === 'reviews' ? '<p><a class="button" href="' + base + '/reviews-queue">Reviews families sent</a></p>' : '';
      return { title: parentTitle ? `${parentTitle}: ${listTitle(kind)}` : listTitle(kind), back: back ?? base, body: `${note(url)}${intro}${extra}<ul class="items">${items || `<li class="muted">${esc(say('list.empty'))}</li>`}</ul><p><a class="button primary" href="${esc(`${path}/new`)}">${esc(say('list.add', { one: oneOf(kind) }))}</a></p>` };
    }
    if (rest === 'new') {
      if (!post) return form(null);
      const fd = await request.formData();
      const values = parseForm(formFields, fd);
      let saved;
      try {
        if (kind === 'products' || kind === 'partners') await fromBadgeCode(fd, values, kind);
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
      if (kind === 'albums') view.body += await whosInCard(rec, `${path}/${rec.id}`);
      const place = { dogs: 'dog', litters: 'litter', albums: 'album' }[kind];
      if (place) view.body += await embedsCard(`${place}:${rec.id}`, `${path}/${rec.id}`, embedErr());
      return { ...view, rec };
    }
    const fd = await request.formData();
    const values = parseForm(formFields, fd);
    // KennelOS's fields keep what's stored, whatever the form sent.
    for (const f of await lockedFor(kind, rec) ?? []) values[f] = rec[f];
    try {
      if (kind === 'products' || kind === 'partners') await fromBadgeCode(fd, values, kind);
      await saveRecord(env, site.id, kind, rec.id, values, scopeId); } catch (err) {
      if (err instanceof ContentError) return form(rec, err.message, values);
      throw err;
    }
    if (one) await tagFromForm(formFields, values, fd, subsFor(rec.id));
    return redirect(`${path}/${rec.id}?note=saved`);
  }

  // An album's photos, to say who is in them, several at a time: its litter's
  // puppies first. Tags are what put a photo on a puppy's page (the litter's Show
  // each puppy's tagged photos) and offer it first in that puppy's picker.
  async function whosInCard(rec, back) {
    const ids = new Set(Array.isArray(rec.photos) ? rec.photos : []);
    const list = (await photos()).filter((p) => ids.has(p.id));
    if (!list.length) return '';
    const subs = await subjects(env, site.id);
    const names = new Map(subs.map((x) => [x.subject, x.label]));
    const t = await tags();
    let first = null;
    if (rec.litter_id) {
      const pups = (await env.DB.prepare('SELECT id, name FROM puppies WHERE site_id = ? AND litter_id = ?').bind(site.id, rec.litter_id).all()).results;
      if (pups.length) first = { label: say('photos.puppies_of_its_litter'), names: new Map(pups.map((x) => [`puppy:${x.id}`, x.name])) };
    }
    const card = (p) => {
      const mine = (t.get(p.id) ?? []).filter((x) => names.has(x));
      return `<li class="card"><img src="${esc(photoUrl(p.id))}" alt="${esc(p.alt || say('photos.photo_3'))}" loading="lazy">${tickBox(p)}
        <div class="tags">${mine.map((x) => `<span class="tag">${esc(first?.names.get(x) ?? names.get(x))}</span>`).join('') || `<span class="muted small">${esc(say('photos.no_one_yet'))}</span>`}</div></li>`;
    };
    return `<section class="card" id="whos-in"><h2>${esc(say('photos.who_s_in_these'))}</h2>
      <p class="muted small">${esc(say('photos.tick_the_photos_with'))}</p>
      ${tagManyBar(subs, { back: `${back}#whos-in`, first })}<ul class="ph-list">${list.map(card).join('')}</ul></section>`;
  }

  // A record's page plus the list under it (a dog's health results, a litter's puppies).
  async function withChildren(view, childPath, childKind, label) {
    if (!view?.rec) return view;
    const rows = await listRecords(env, site.id, childKind, view.rec.id);
    const L = LISTS[childKind];
    view.body += `<section class="card"><h2>${esc(label)}</h2><ul class="items">${rows.map((r) => `<li class="item"><a href="${esc(`${childPath}/${r.id}`)}"><b>${esc(L.name(r))}</b><span>${esc(L.sub(r, say) ?? '')}</span></a></li>`).join('') || `<li class="muted">${esc(say('lists.none_yet'))}</li>`}</ul>
      <p><a class="button" href="${esc(childPath)}">${esc(say('lists.edit_the_list'))}</a> <a class="button" href="${esc(`${childPath}/new`)}">${esc(say('list.add', { one: oneOf(childKind) }))}</a></p></section>`;
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
      <h2>${esc(say('photos.photos_of_this_litter'))}</h2><p class="muted small">${esc(say('photos.photos_added_here_are'))}</p>
      <div class="ph-grid" data-first>${mine.map((p) => `<img src="${esc(photoUrl(p.id))}" alt="${esc(p.alt || say('photos.photo_2'))}" loading="lazy">`).join('')}</div>
      <div class="ph-add"><label class="button">${esc(say('photos.add_photos_2'))}<input type="file" accept="image/*" multiple data-add-photos></label><span class="muted small" role="status"></span></div>
      ${mine.length ? `<p><a href="${esc(`${base}/photos?of=${encodeURIComponent(subject)}`)}">${esc(say('photos.see_them_on_the'))}</a></p>` : ''}</section>`;
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
          ${p.source === 'kennelos' ? `<span class="muted small">${esc(p.hidden_by_kennelos ? say('puppylist.not_sent_by_kennelos') : STATUS_TEXT[p.status] ?? say('puppylist.hidden_2'))} · from KennelOS</span>` : `<select name="status" aria-label="${esc(p.name)}'s status">${Object.entries({ ...STATUS_TEXT, hidden: say('puppylist.hidden') }).map(([v, t]) => `<option value="${v}"${v === p.status ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>
          <button>${esc(say('puppylist.set'))}</button>`}</form>`).join('') || `<p class="muted">${esc(say('puppylist.no_puppies_yet'))}</p>`}
        <p><a class="button" href="${esc(`${base}/litters/${l.id}/puppies/new`)}">${esc(say('puppylist.add_a_puppy'))}</a></p></section>`);
    }
    return { title: say('puppylist.puppies'), back: base, body: `${note(url)}${sections.join('') || `<section class="card"><p class="muted">${esc(say('puppylist.no_current_litters'))} <a href="${esc(`${base}/litters/new`)}">${esc(say('puppylist.add_a_litter'))}</a>.</p></section>`}` };
  }

  // ---------- kennel details, pages, Home ----------
  async function details() {
    const row = await env.DB.prepare('SELECT * FROM sites WHERE id = ?').bind(site.id).first();
    const logoPick = { groups: [{ label: say('site.your_logo'), subject: 'page:logo' }], tags: ['page:logo'], alt: `${row.kennel_name ?? ''} logo` };
    const render = async (err, values) => ({ title: say('site.kennel_details'), back: base, body: `${note(url)}${errorBox(err)}<form method="post" action="${base}/details" data-save class="card">${fields(SITE_FIELDS, values ?? row, await ctxFor('site', logoPick))}<button class="primary">${esc(say('site.save'))}</button></form>` });
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

  // Her KennelOS waitlist policies (KennelOS Waitlist Policies plan §4), above her own
  // Policies: shown on that page under their own heading, read-only here, changed in KennelOS.
  async function waitlistPoliciesCard() {
    const row = await env.DB.prepare('SELECT kennelos_public_id FROM sites WHERE id = ?').bind(site.id).first();
    if (!row?.kennelos_public_id) return '';
    const f = await readFeed(env, site.id, row.kennelos_public_id);
    const list = f.state === 'ok' ? f.feed?.kennel?.policies ?? [] : [];
    if (!list.length) {
      return f.state === 'ok' ? `<section class="card"><h2>${esc(say('waitlistpage.waitlist_policies_2'))}</h2><p class="muted small">${esc(say('waitlistpage.none_in_kennelos_yet'))}</p></section>` : '';
    }
    return `<section class="card" id="waitlist-policies"><h2>${esc(say('waitlistpage.waitlist_policies'))} <span class="muted small">${esc(say('waitlistpage.from_kennelos'))}</span></h2>
      <p class="muted small">${esc(say('waitlistpage.shown_on_your_policies'))}</p>
      <ul class="items">${list.map((x) => `<li class="item"><details><summary><b>${esc(x.heading)}</b></summary><p class="small">${esc(x.body)}</p></details></li>`).join('')}</ul>
      <p class="muted small">${esc(say('waitlistpage.add_your_own_policies'))}</p></section>`;
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

    const pick = subject ? { groups: [{ label: `Photos for ${p.label}`, subject }], tags: [subject], alt: '' } : undefined;
    const render = async (err, values) => ({
      title: p.label, back: `${base}/pages`,
      body: `${note(url)}${key === 'waitlist' ? kennelos ?? await kennelosCard() : ''}${errorBox(err)}<form method="post" action="${base}/pages/${key}" data-save class="card">
        ${p.canHide ? fieldsWithLabel(all, values ?? current, await ctxFor(key === 'extras' ? 'extras_page' : key === 'products' ? 'products_page' : key, pick), { enabled: [say('pages.this_page_is_on'), say('pages.off_it_leaves_the')], menu_label: [say('pages.name_in_the_menu_2'), `Leave empty for "${p.label}".`] }) : fieldsWithLabel(all, values ?? current, await ctxFor(key, pick), { menu_label: [say('pages.name_in_the_menu'), `Leave empty for "${p.label}".`] })}
        <button class="primary">${esc(say('pages.save_2'))}</button></form>
        ${key === 'waitlist' ? await waitlistLinks() : listLinkFor(key)}${key === 'about' ? await embedsCard('about', `${base}/pages/about`, embedErr()) : ''}${await addedCards(key)}`,
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

  // Blocks KennelPort placed on a page (content/blocks.js addedBlocks): hers to
  // switch off and reword, never to move. Each is its own small form.
  async function addedCards(key) {
    const blocks = addedBlocks(key, pageBlocks(await loadBuild(env, site.id), key));
    if (!blocks.length) return '';
    const snap = await buildSnapshot(env, site.id);
    const what = { dogs: say('pages.your_dogs_from_kennelos'), litters: say('pages.your_litters_from_kennelos'), reviews: say('pages.your_reviews') };
    const nameOf = { dogs: (d) => d.call_name, litters: (l) => l.name, reviews: (r) => r.first_name || say('pages.a_family') };
    const icon = { dogs: 'paw', litters: 'heart', reviews: 'star' };
    const cards = [];
    for (const b of blocks) {
      if (BLOCK_TYPES[b.type].kind === 'own') { cards.push(await ownCard(key, b, snap)); continue; }
      const cur = await getAddedBlock(env, site.id, key, b.id);
      const rows = blockRows(snap, b);
      const names = (b.limit ? rows.slice(0, b.limit) : rows).map(nameOf[b.type]);
      const input = (n, label, max, half) => `<div class="f${half ? ' half' : ''}"><label>${esc(label)}<input name="${n}" value="${esc(cur[n] ?? '')}" maxlength="${max}" placeholder="${esc(b.w[n] ?? '')}">${b.w[n] ? `<span class="hint">Empty: "${esc(b.w[n])}".</span>` : ''}</label></div>`;
      cards.push(`<form method="post" action="${base}/blocks/${esc(key)}/${esc(b.id)}" data-save class="card added${cur.enabled ? '' : ' off'}" id="b-${esc(b.id)}">
        <div class="between"><h2 class="added-h">${ic(icon[b.type])}${esc(cur.heading || b.w.heading || BLOCK_TYPES[b.type].name)}</h2>
          <div class="switches"><label class="check">${esc(say('pages.show_it'))}<input type="checkbox" name="enabled" value="1"${cur.enabled ? ' checked' : ''}></label></div></div>
        <p class="muted small">${esc(what[b.type])}: ${names.length ? esc(names.join(', ')) : 'none right now, so it hides'}.</p>
        <div class="fgrid">${input('eyebrow', say('pages.eyebrow'), ADDED_BLOCK_FIELDS.eyebrow.max, true)}${input('heading', say('pages.heading'), ADDED_BLOCK_FIELDS.heading.max, true)}${input('lede', say('pages.line_under_it'), ADDED_BLOCK_FIELDS.lede.max, false)}</div>
        <button class="primary">${esc(say('pages.save'))}</button></form>`);
    }
    return `<h2>${esc(say('pages.blocks_kennelport_added'))}</h2><p class="muted small">${esc(say('pages.placed_with_you_by'))}</p>${cards.join('')}`;
  }

  // One of the owner's own blocks (content/blocks.js, step 4): hers to switch off and
  // reword; an outside link, phone or email she can change; a page link is the owner's
  // (decision 18); the photo, where the owner lets her.
  async function ownCard(key, b, snap) {
    const cur = await getAddedBlock(env, site.id, key, b.id);
    const empty = (t) => (t ? say('pages.own.empty_is', { text: t }) : '');
    // A button's words post as button_label: the app fills any field named label
    // with the device's name (the sign-in form's).
    const input = (n, label, max, half, hint = '', ph = '') => `<div class="f${half ? ' half' : ''}"><label>${esc(label)}<input name="${n === 'label' ? 'button_label' : n}" value="${esc(cur[n] ?? '')}" maxlength="${max}"${ph ? ` placeholder="${esc(ph)}"` : ''}>${hint ? `<span class="hint">${esc(hint)}</span>` : ''}</label></div>`;
    const F = ADDED_BLOCK_FIELDS;
    const parts = [];
    if (b.type === 'banner' || b.type === 'overlay') parts.push(input('heading', say('pages.heading'), F.heading.max, true, empty(b.w.heading), b.w.heading), input('label', say('pages.own.button_words'), F.label.max, true, empty(b.w.label), b.w.label), input('line', say('pages.own.a_line'), F.line.max, false, empty(b.w.line), b.w.line));
    if (b.type === 'button') parts.push(input('label', say('pages.own.button_words'), F.label.max, true, empty(b.w.label), b.w.label));
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
    if ((b.type === 'photo' || b.type === 'overlay') && b.mayChange) {
      photo = field('photo_id', { type: 'photo' }, cur.photo_id || b.photo || '', { kind: 'pages', say, photos: await photos(), photoUrl });
      if (b.type === 'photo') parts.push(input('caption', say('pages.own.caption'), F.caption.max, false, empty(b.w.caption), b.w.caption));
    } else if ((b.type === 'photo' || b.type === 'overlay') && !b.photo) linkNote += `<p class="muted small">${esc(say('pages.own.no_photo'))}</p>`;
    return `<form method="post" action="${base}/blocks/${esc(key)}/${esc(b.id)}" data-save class="card added${cur.enabled ? '' : ' off'}" id="b-${esc(b.id)}">
        <div class="between"><h2 class="added-h">${ic(BLOCK_TYPES[b.type].ic === 'layers' ? 'pages' : BLOCK_TYPES[b.type].ic === 'list' ? 'pages' : BLOCK_TYPES[b.type].ic)}${esc(cur.heading || cur.label || b.w?.heading || b.w?.label || say(`pages.own.${b.type}`))}</h2>
          <div class="switches"><label class="check">${esc(say('pages.show_it'))}<input type="checkbox" name="enabled" value="1"${cur.enabled ? ' checked' : ''}></label></div></div>
        <p class="muted small">${esc(say(`pages.own.${b.type}`))}.</p>${linkNote}${photo}
        ${parts.length ? `<div class="fgrid">${parts.join('')}</div>` : ''}
        <button class="primary">${esc(say('pages.save'))}</button></form>`;
  }

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
      await saveAddedBlock(env, site.id, page, block, own
        ? { enabled: fd.get('enabled') != null, ...pick('heading', 'line', 'url', 'phone', 'email', 'caption'), ...(fd.has('button_label') ? { label: fd.get('button_label') } : {}), ...(b.mayChange ? pick('photo_id') : {}) }
        : { enabled: fd.get('enabled') != null, eyebrow: fd.get('eyebrow'), heading: fd.get('heading'), lede: fd.get('lede') });
    } catch (err) {
      if (!(err instanceof ContentError)) throw err;
      return redirect(`${back}?note=not_saved#b-${block}`);
    }
    return redirect(`${back}?note=saved#b-${block}`);
  }

  async function home() {
    const key = url.pathname.split('/')[4];
    if (!key) {
      const rows = [];
      for (const b of HOME_BLOCK_ORDER) {
        const v = await getBlock(env, site.id, b);
        rows.push(`<li class="item"><a href="${base}/home/${b}"><b>${esc(say(`homeblocks.title.${b}`))}</b><span>${esc(say(v.enabled ? 'homeblocks.on' : 'homeblocks.off'))}</span></a></li>`);
      }
      return { title: say('homeblocks.home_page'), back: `${base}/pages`, body: `${note(url)}<p class="muted">${esc(say('homeblocks.your_home_page_s'))}</p><ul class="items">${rows.join('')}</ul>${await embedsCard('home', `${base}/home`, embedErr())}${await addedCards('home')}` };
    }
    const flds = HOME_BLOCKS[key];
    if (!flds) return null;
    const all = { enabled: { type: 'bool' }, ...flds };
    const current = await getBlock(env, site.id, key);
    const pick = { groups: [{ label: say('homeblocks.photos_for_the_home'), subject: 'page:home' }], tags: ['page:home'], alt: '' };
    const render = async (err, values) => ({
      title: say(`homeblocks.title.${key}`), back: `${base}/home`,
      body: `${note(url)}${errorBox(err)}<form method="post" action="${base}/home/${key}" data-save class="card">${fieldsWithLabel(all, values ?? current, await ctxFor(key, pick), { enabled: [say('homeblocks.this_block_is_on'), say('homeblocks.off_it_leaves_the')] })}<button class="primary">${esc(say('homeblocks.save'))}</button></form>`,
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
    const KINDS_HERE = { application_fee: [say('payment.application_fee'), PAYMENT_FIELDS], deposit: [say('payment.puppy_deposit'), PAYMENT_FIELDS], safe_notice: [say('payment.safe_payment_notice'), SAFE_NOTICE_FIELDS] };
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
          : `<p class="muted small">${k === 'application_fee' ? esc(say('payment.how_a_family_pays_2')) : esc(say('payment.how_a_family_pays'))} This is how to pay, not the price.</p>`;
        cards.push(`<form method="post" action="${base}/payment/${k}" id="${k}" data-save class="card"><h2>${esc(title)}</h2>${intro}${errorBox(err)}
          ${current.source === 'kennelos' ? `<p class="notice">${esc(say('payment.filled_from_your_waitlist'))}</p>` : ''}
          ${fields(flds, current, { kind: k === 'safe_notice' ? 'safe_notice' : 'payment', say, locked: current.source === 'kennelos' ? new Set(Object.keys(PAYMENT_FIELDS).filter((f) => f !== 'show_on_site')) : null })}<button class="primary">${esc(say('payment.save'))}</button></form>`);
      }
      return { title: say('payment.how_to_pay'), back: base, body: `${note(url)}<p class="muted">${esc(say('payment.shown_on_your_waitlist'))}</p>${cards.join('')}` };
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
      if (!full || typeof full === 'string') return json({ message: say('photos.no_photo_was_sent') }, 400);
      try {
        const saved = await savePhoto(env, site.id, { full: new Uint8Array(await full.arrayBuffer()), thumb: thumb && typeof thumb !== 'string' ? new Uint8Array(await thumb.arrayBuffer()) : null, alt: form.get('alt') });
        await tagPhotos(env, site.id, [saved.id], String(form.get('tags') ?? '').split(','));
        return json({ id: saved.id, thumb: photoUrl(saved.id) });
      } catch (err) {
        if (err instanceof PhotoError) return json({ message: sayMessage('photos', err.message, say) }, 400);
        throw err;
      }
    }
    if (rest === '/tag-many' && post) {
      const form = await request.formData();
      const asked = String(form.get('back') ?? '');
      const [where, hash] = asked.startsWith(`${base}/`) && !/[\\\s]|\/\//.test(asked) ? asked.split('#') : [`${base}/photos`];
      const ids = form.getAll('photos').map(String);
      const subject = String(form.get('subject') ?? '');
      const ok = ids.length && subject && await isSubject(env, site.id, subject);
      if (ok) await tagPhotos(env, site.id, ids, [subject]);
      return redirect(`${where}${where.includes('?') ? '&' : '?'}note=${ok ? 'tagmany' : 'tagnone'}${hash ? `#${hash}` : ''}`);
    }
    let m = rest.match(/^\/([0-9a-f-]{36})\/(thumb|full)$/);
    if (m && !post) {
      const p = await env.DB.prepare('SELECT r2_key, thumb_key, type FROM photos WHERE id = ? AND site_id = ?').bind(m[1], site.id).first();
      const obj = p && await env.FILES.get(m[2] === 'full' ? p.r2_key : (p.thumb_key || p.r2_key));
      if (!obj) return new Response(say('photos.not_found'), { status: 404 });
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
    const chips = [chip('', say('photos.all'), all.length), untagged ? chip('none', say('photos.not_sorted_2'), untagged) : '', ...subs.map((x) => [x, count(x.subject)]).filter(([, n]) => n).map(([x, n]) => chip(x.subject, x.label, n))].join('');
    const options = (exclude = [], selected = '') => {
      const groups = [...new Set(subs.map((x) => x.group))];
      return groups.map((g) => `<optgroup label="${esc(g)}">${subs.filter((x) => x.group === g && !exclude.includes(x.subject)).map((x) => `<option value="${esc(x.subject)}"${x.subject === selected ? ' selected' : ''}>${esc(x.label)}</option>`).join('')}</optgroup>`).join('');
    };
    const ofInput = of ? `<input type="hidden" name="of" value="${esc(of)}">` : '';
    const card = (p) => {
      const mine = known(p);
      return `<li class="card"><img src="${esc(photoUrl(p.id))}" alt="${esc(p.alt || say('photos.photo'))}" loading="lazy">${tickBox(p)}
        <div class="tags">${mine.map((x) => `<form method="post" action="${base}/photos/${p.id}/untag" class="tag">${ofInput}<input type="hidden" name="subject" value="${esc(x)}"><span>${esc(names.get(x))}</span><button class="link" aria-label="${esc(`Not ${names.get(x)}`)}">×</button></form>`).join('') || `<span class="muted small">${esc(say('photos.not_sorted'))}</span>`}</div>
        <form method="post" action="${base}/photos/${p.id}/tag" class="row">${ofInput}<select name="subject" aria-label="This photo is also of"><option value="">${esc(say('photos.photo_of'))}</option>${options(mine)}</select><button>${esc(say('photos.add'))}</button></form>
        <form method="post" action="${base}/photos/${p.id}/alt" data-save>${ofInput}<label>${esc(say('photos.description'))}<input name="alt" value="${esc(p.alt ?? '')}" maxlength="200"></label><button>${esc(say('photos.save'))}</button></form>
        <form method="post" action="${base}/photos/${p.id}/remove">${ofInput}<button class="link">${esc(say('photos.remove'))}</button></form></li>`;
    };
    return {
      title: say('photos.photos'), back: base,
      body: `${note(url)}<p class="row"><a class="button" href="${base}/lists/albums">${esc(say('photos.albums'))}</a><span class="muted small">${esc(say('photos.galleries_with_their_own'))}</span></p>${await usageLine()}<form id="photo-form" class="card" method="post" action="${base}/photos/upload">
        <label>${esc(say('photos.add_photos'))}<input type="file" accept="image/*" multiple required></label>
        <label>${esc(say('photos.photos_of'))}<span class="hint">${esc(say('photos.so_they_re_offered'))}</span>
          <select name="tags"><option value="">${esc(say('photos.choose_later'))}</option>${options([], of)}</select></label>
        <label>${esc(say('photos.what_s_in_the'))}<span class="hint">${esc(say('photos.helps_visitors_who_use'))}</span><input name="alt" maxlength="200"></label>
        <button class="primary">${esc(say('photos.upload'))}</button><p id="photo-status" class="muted small" role="status"></p>
        <p class="muted small">${esc(say('photos.photos_are_made_smaller'))}</p></form>
        ${all.length ? `<nav class="chips" aria-label="Show photos of">${chips}</nav>` : ''}
        ${list.length ? `<section class="card"><p class="muted small">${esc(say('photos.to_tag_several_at'))}</p>${tagManyBar(subs, { back: `${base}/photos${of ? `?of=${encodeURIComponent(of)}` : ''}` })}</section>` : ''}
        <ul class="ph-list">${list.map(card).join('') || (all.length ? `<li class="muted">${esc(say('photos.no_photos_here'))}</li>` : '')}</ul>`,
    };
  }

  // ---------- publish ----------
  async function publishScreen() {
    const rest = url.pathname.slice(`${base}/publish`.length);
    // The demo is never published (kennelos/demo.js).
    if (site.demo_step != null) return { title: say('publish.publish_3'), back: base, body: `<section class="card band"><p><strong>${esc(say('publish.demo_site'))}</strong> ${esc(NOT_FOR_DEMO)}</p><p class="row"><a class="button" href="/admin/${esc(site.subdomain)}/site/">${esc(say('publish.open_it_in_your'))}</a></p></section>` };
    if (request.method === 'POST') {
      try {
        if (rest === '/undo') { await undoPublish(env, site.id); return redirect(`${base}/publish?note=undone`); }
        if (!rest) { await publish(env, site.id, user.emailHash.slice(0, 12)); return redirect(`${base}/publish?note=published`); }
      } catch (err) {
        return { title: say('publish.publish_2'), back: base, body: `<p class="error" role="alert">${esc(sayMessage('publish', err.message, say))}</p><p><a href="${base}/publish">${esc(say('publish.back'))}</a></p>` };
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
      title: say('publish.publish'), back: base,
      body: `${note(url)}${matches ? matchesWaiting(site.subdomain, matches, say) : ''}<section class="card"><h2>${list.length ? esc(say('publish.changes_since_your_last')) : esc(say('publish.nothing_to_publish'))}</h2>
        ${list.length ? `<ul class="changes">${list.map((c) => `<li><span>${esc(c.text)}</span>${c.path ? `<a href="${esc(prev(c.path))}">${esc(say('publish.preview'))}</a>` : ''}</li>`).join('')}</ul>` : `<p class="muted">${esc(say('publish.your_website_already_shows'))}</p>`}
        <p class="row"><a class="button" href="${esc(prev('/'))}">${esc(say('publish.preview_the_whole_site'))}</a></p>
        ${list.length ? `<form method="post" action="${base}/publish"><button class="primary">Publish ${list.length} change${list.length === 1 ? '' : 's'}</button></form>` : ''}</section>
        ${snaps.length > 1 ? `<form method="post" action="${base}/publish/undo" class="card"><p class="muted small">${esc(say('publish.undo_goes_back_to'))}</p><button>${esc(say('publish.undo_last_publish'))}</button></form>` : ''}`,
    };
  }

  // ---------- inbox (plan 3.10, decision 12) ----------
  // An application: already on the simple waitlist, or a button to add them.
  async function listedLine(msg) {
    const on = await env.DB.prepare("SELECT id, status FROM waitlist_entries WHERE site_id = ? AND inquiry_id = ?").bind(site.id, msg.id).first();
    if (on) return `<p class="muted small">${on.status === 'waiting' ? esc(say('inbox.on_your_waitlist')) : esc(say('inbox.on_your_waitlist_marked'))} <a href="${base}/waitlist">${esc(say('inbox.see_the_waitlist'))}</a></p>`;
    if ((await kos()).linked) return '';
    return `<p><a class="button" href="${base}/waitlist/new?from=${esc(msg.id)}">${esc(say('inbox.add_to_waitlist'))}</a></p>`;
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
        ? (answers.length ? `<dl class="answers">${answers.map(([q, a]) => `<dt>${esc(q)}</dt><dd>${esc(a).replace(/\n/g, '<br>')}</dd>`).join('')}</dl>` : `<p class="muted">${esc(say('inbox.no_questions_answered'))}</p>`)
        : `<p class="message">${esc(msg.message).replace(/\n/g, '<br>')}</p>`;
      return {
        title: msg.name, back: `${base}/inbox`,
        body: `<section class="card"><p class="muted small">${esc(when(msg.received_at))}${msg.topic ? ` · ${esc(msg.topic)}` : ''}</p>
          ${text}
          <dl class="kv"><dt>${esc(say('inbox.email'))}</dt><dd>${esc(msg.email)}</dd>${msg.phone ? `<dt>${esc(say('inbox.phone'))}</dt><dd><a href="tel:${esc(msg.phone.replace(/[^\d+]/g, ''))}">${esc(msg.phone)}</a></dd>` : ''}</dl>
          <p class="row"><a class="button primary" href="${esc(mailto)}">${esc(say('inbox.reply'))}</a><button type="button" data-copy="${esc(msg.email)}">${esc(say('inbox.copy_email'))}</button></p>
          ${application ? await listedLine(msg) : ''}</section>
          <form method="post" action="${base}/inbox/${msg.id}/unread"><button class="link">${esc(say('inbox.mark_as_unread'))}</button></form>
          <form method="post" action="${base}/inbox/${msg.id}/delete" class="card danger"><button>${esc(say('inbox.delete_this_message'))}</button></form>`,
      };
    }
    if (rest || post) return null;
    const { results } = await env.DB.prepare('SELECT id, name, topic, message, received_at, read_at FROM inquiries WHERE site_id = ? ORDER BY received_at DESC LIMIT 200').bind(site.id).all();
    return {
      title: say('inbox.inbox'), back: base,
      body: `${note(url)}${results.length ? `<ul class="items">${results.map((r) => `<li class="item${r.read_at ? '' : ' unread'}"><a href="${base}/inbox/${r.id}"><b>${r.read_at ? '' : '<span class="dot-new" aria-label="Unread"></span>'}${esc(r.name)}</b><span>${esc(when(r.received_at))} · ${esc(r.topic || r.message.slice(0, 80))}</span></a></li>`).join('')}</ul>` : `<section class="card"><p class="muted">${esc(say('inbox.no_messages_yet_messages'))}</p></section>`}
        <p class="muted small">${esc(say('inbox.messages_are_kept_for'))}</p>`,
    };
  }

  // ---------- the simple waitlist (plan 3.8) ----------
  async function waitlistScreen() {
    const rest = url.pathname.slice(`${base}/waitlist`.length);
    const post = request.method === 'POST';
    const back = (n) => redirect(`${base}/waitlist?note=${n}`);
    const FIELDS = [
      ['name', say('waitlistlist.their_name'), null, 80],
      ['list_name', say('waitlistlist.name_on_the_list'), say('waitlistlist.what_your_website_shows'), 40],
      ['email', say('waitlistlist.email'), say('waitlistlist.for_offer_pups_never'), 254],
      ['phone', say('waitlistlist.phone'), say('waitlistlist.never_shown'), 30],
      ['wants', say('waitlistlist.what_they_want'), say('waitlistlist.shown_on_the_list'), 120],
    ];
    const form = (action, v, { err, edit = false, from = null } = {}) => `${errorBox(err)}<form method="post" action="${esc(action)}" class="card" data-save>
      ${from ? `<input type="hidden" name="inquiry_id" value="${esc(from)}">` : ''}
      ${FIELDS.map(([n, label, hint, max]) => `<label>${esc(label)}${hint ? `<span class="hint">${esc(hint)}</span>` : ''}<input name="${n}"${n === 'email' ? ' type="email"' : n === 'phone' ? ' type="tel"' : ''} value="${esc(v?.[n] ?? '')}" maxlength="${max}"${n === 'name' ? ' required' : ''}></label>`).join('')}
      <label class="check"><input type="checkbox" name="private" value="1"${v?.private ? ' checked' : ''}> <span>${esc(say('waitlistlist.keep_their_name_private'))}<span class="hint">${esc(say('waitlistlist.the_list_shows_it'))}</span></span></label>
      ${edit ? `<label>${esc(say('waitlistlist.added'))}<span class="hint">${esc(say('waitlistlist.their_place_comes_from'))}</span><input name="added_on" type="date" value="${esc(v?.added_on ?? '')}"></label>` : ''}
      <button class="primary">${edit ? esc(say('waitlistlist.save')) : esc(say('waitlistlist.add_to_waitlist_3'))}</button></form>`;
    const values = async () => Object.fromEntries(await request.formData());

    if (rest === '/new') {
      const fromId = url.searchParams.get('from');
      if (post) {
        const v = await values();
        const inquiry = v.inquiry_id ? await env.DB.prepare('SELECT id FROM inquiries WHERE id = ? AND site_id = ?').bind(v.inquiry_id, site.id).first() : null;
        try { await addEntry(env, site.id, v, { inquiryId: inquiry?.id ?? null }); } catch (err) {
          if (!(err instanceof WaitlistError)) throw err;
          return { title: say('waitlistlist.add_to_waitlist_2'), back: `${base}/waitlist`, body: form(`${base}/waitlist/new`, v, { err: sayMessage('waitlist', err.message, say), from: inquiry?.id }) };
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
      return { title: say('waitlistlist.add_to_waitlist'), back: fromId ? `${base}/inbox/${fromId}` : `${base}/waitlist`, body: `<p class="muted">${esc(say('waitlistlist.they_go_to_the'))}</p>${form(`${base}/waitlist/new`, v, { from: fromId })}` };
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
          return { title: e.name, back: `${base}/waitlist`, body: form(`${base}/waitlist/${e.id}`, { ...e, ...v }, { err: sayMessage('waitlist', err.message, say), edit: true }) };
        }
        return back('listsaved');
      }
      return {
        title: e.name, back: `${base}/waitlist`,
        body: `${form(`${base}/waitlist/${e.id}`, { ...e, private: e.list_name === maskedNameFor(e.name) }, { edit: true })}
          <form method="post" action="${base}/waitlist/${e.id}/remove" class="card danger"><p class="muted small">${esc(say('waitlistlist.delete_takes_them_off'))}</p><button>${esc(say('waitlistlist.delete_from_the_waitlist'))}</button></form>`,
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
      <div class="row">${e.email ? `<a class="button primary" href="${esc(offerMailto(e, { kennelName: site.kennel_name || site.subdomain, siteUrl, message: page.offer_message }))}">${esc(say('waitlistlist.offer_pups'))}</a>` : `<span class="muted small">${esc(say('waitlistlist.no_email_add_one'))}</span>`}
        <form method="post" action="${base}/waitlist/${e.id}/fulfil"><button>${esc(say('waitlistlist.fulfilled'))}</button></form>
        <a class="button" href="${base}/waitlist/${e.id}">${esc(say('waitlistlist.edit'))}</a>
        <span class="order">${i ? `<form method="post" action="${base}/waitlist/${e.id}/up"><button aria-label="Move ${esc(e.name)} up">↑</button></form>` : ''}${i < list.length - 1 ? `<form method="post" action="${base}/waitlist/${e.id}/down"><button aria-label="Move ${esc(e.name)} down">↓</button></form>` : ''}</span></div></li>`;
    return {
      title: say('waitlistlist.your_waitlist'), back: base,
      body: `${note(url)}${k.linked ? `<p class="error">${esc(say('waitlistlist.not_used_your_website'))} <a href="${base}/pages/waitlist">${esc(say('waitlistlist.waitlist_and_application_3'))}</a> ${esc(say('waitlistlist.to_use_this_one'))}</p>` : ''}
        <p class="muted">${esc(say('waitlistlist.families_in_order_your'))}</p>
        ${k.linked ? '' : `<p><a class="button primary" href="${base}/waitlist/new">${esc(say('waitlistlist.add_a_family'))}</a></p>`}
        ${!k.linked && k.offered ? `<p class="muted small">${esc(say('waitlistlist.keep_your_waitlist_in'))} <a href="${base}/pages/waitlist">${esc(say('waitlistlist.waitlist_and_application_2'))}</a>.</p>` : ''}
        <ul class="wl-list">${list.map(item).join('') || `<li class="muted">${esc(say('waitlistlist.no_one_on_the'))}</li>`}</ul>
        <p class="muted small">${esc(say('waitlistlist.the_offer_pups_email'))} <a href="${base}/pages/waitlist">${esc(say('waitlistlist.waitlist_and_application'))}</a>.</p>
        ${done.length ? `<details class="card"><summary>Fulfilled (${done.length})</summary><p class="muted small">${esc(say('waitlistlist.kept_90_days_then'))}</p><ul class="items">${done.map((e) => `<li class="item"><span><b>${esc(e.name)}</b> <span class="muted small">${esc(fmt(e.done_at.slice(0, 10)))}</span></span>
          <span class="row"><form method="post" action="${base}/waitlist/${e.id}/back"><button>${esc(say('waitlistlist.put_back'))}</button></form><form method="post" action="${base}/waitlist/${e.id}/remove"><button class="link">${esc(say('waitlistlist.delete'))}</button></form></span></li>`).join('')}</ul></details>` : ''}`,
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
      title: say('queue.reviews_to_approve'), back: base,
      body: `${note(url)}${results.map((r) => `<section class="card review-q">
          <p><b>${esc(r.first_name)}</b>${r.town ? `, ${esc(r.town)}` : ''} <span class="muted small">· ${esc(when(r.submitted_at))}</span></p>
          <p class="stars" aria-label="${r.rating} stars">${'★'.repeat(r.rating ?? 0)}</p>
          <p class="message">${esc(r.quote).replace(/\n/g, '<br>')}</p>
          ${r.puppy_name || r.home_month ? `<p class="muted small">${esc([r.puppy_name, r.home_month].filter(Boolean).join(' · '))}</p>` : ''}
          ${r.photo_id ? `<img class="q-photo" src="${esc(photoUrl(r.photo_id))}" alt="Photo sent with the review">` : ''}
          <p class="muted small">${esc(say('queue.they_agreed_to_it'))}</p>
          <div class="row"><form method="post" action="${base}/reviews-queue/${r.id}/approve"><button class="primary">${esc(say('queue.approve'))}</button></form>
          <form method="post" action="${base}/reviews-queue/${r.id}/decline"><button>${esc(say('queue.decline_and_delete'))}</button></form></div></section>`).join('') || `<section class="card"><p class="muted">${esc(say('queue.no_reviews_waiting_families'))}</p></section>`}
        <p class="muted small">${esc(say('queue.an_approved_review_shows'))}</p>`,
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
      title: say('account.your_site_2'), back: base,
      body: `<section class="card"><h2>${esc(say('account.storage'))}</h2>${storage}</section>
        <section class="card"><h2>${esc(say('account.download_a_copy_2'))}</h2><p class="muted">${esc(say('account.a_zip_of_your'))}</p>
          <p><button id="export" data-manifest="${base}/export.json">${esc(say('account.download_a_copy'))}</button></p><p id="export-status" class="muted small" role="status"></p></section>
        ${owner ? `<section class="card danger"><h2>${esc(say('account.delete_my_site_2'))}</h2>
          <p>${esc(say('account.this_deletes_every_dog'))} <strong>${esc(say('account.straight_away'))}</strong>${esc(say('account.there_s_no_undo'))}</p>
          <p class="muted small">${esc(say('account.your_address_then_shows'))}</p>
          ${errorBox(err)}
          ${fresh ? `<form method="post" action="${base}/account/delete">
            <label>${esc(say('account.type'))} <strong>${esc(site.subdomain)}</strong> ${esc(say('account.to_confirm'))}<input name="confirm" autocomplete="off" autocapitalize="none" spellcheck="false" required></label>
            <button>${esc(say('account.delete_my_site'))}</button></form>`
          : `<p>${esc(say('account.for_safety_deleting_needs'))} <form method="post" action="/signout" class="inline"><button class="link">${esc(say('account.sign_out'))}</button></form>${esc(say('account.sign_in_again_then'))}</p>`}
        </section>` : ''}
        <script src="/_kp/m/zip.js?v=${APP_VERSION}" defer></script>`,
    });
    if (rest === '/delete' && request.method === 'POST') {
      if (!owner) return { title: say('account.your_site'), back: base, body: `<p class="error">${esc(say('account.only_the_owner_can'))}</p>` };
      if (!fresh) return render(say('account.sign_in_again_first'));
      try { await closeSite(env, site.id, (await request.formData()).get('confirm')); } catch (err) {
        if (err instanceof SiteError) return render(sayMessage('account', err.message, say));
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
    else if (p.startsWith('/blocks/')) view = await addedAction();
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
    } else if (/^\/litters\/[0-9a-f-]{36}\/remove-now$/.test(p) && request.method === 'POST') {
      // Remove now (5.3): the same deletion the 30-day clock would do, today. Only a
      // litter already on its way out, so this is never a way round the clock.
      const id = p.split('/')[2];
      const leaving = await leavingLitters(env, site.id);
      if (!leaving.some((l) => l.id === id)) return redirect(`${base}/litters`);
      await deleteLitter(env, site.id, id);
      await env.DB.prepare('UPDATE sites SET draft_changed_at = ? WHERE id = ?').bind(new Date().toISOString(), site.id).run();
      return redirect(`${base}/litters?note=litterremoved`);
    }
    else if (p.startsWith('/dogs')) {
      const hm = p.match(/^\/dogs\/([0-9a-f-]{36})\/health/);
      if (hm) {
        const dog = await getRecord(env, site.id, 'dogs', hm[1]);
        if (dog) view = await collection(`${base}/dogs/${dog.id}/health`, 'health', dog.id, { back: `${base}/dogs/${dog.id}`, parentTitle: dog.call_name });
      } else {
        view = await collection(`${base}/dogs`, 'dogs', null);
        if (view && !(view instanceof Response)) view = await withChildren(view, `${base}/dogs/${view.rec?.id}/health`, 'health', say('lists.health_results'));
      }
    } else if (p.startsWith('/litters')) {
      const pm = p.match(/^\/litters\/([0-9a-f-]{36})\/puppies/);
      if (pm) {
        const litter = await getRecord(env, site.id, 'litters', pm[1]);
        if (litter) view = await collection(`${base}/litters/${litter.id}/puppies`, 'puppies', litter.id, { back: `${base}/litters/${litter.id}`, parentTitle: litter.name });
      } else {
        view = await collection(`${base}/litters`, 'litters', null);
        if (view && !(view instanceof Response)) view = await litterPhotos(await withChildren(view, `${base}/litters/${view.rec?.id}/puppies`, 'puppies', say('lists.puppies')));
      }
    } else {
      const lm = p.match(/^\/lists\/(reviews|steps|extras|products|policies|faq|waitlist_help|questions|albums|partners)(\/|$)/);
      if (lm) view = await collection(`${base}/lists/${lm[1]}`, lm[1], null, { back: lm[1] === 'questions' ? `${base}/pages/waitlist` : lm[1] === 'albums' ? `${base}/photos` : lm[1] === 'partners' ? `${base}/dogs` : `${base}/pages` });
    }
    if (!view) return null;
    if (view instanceof Response) return view;
    return page(view.title, view.body, { back: view.back });
  };
}

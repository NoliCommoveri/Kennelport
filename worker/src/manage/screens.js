// The manage app's editing screens (phase 2): everything under /s/<subdomain>/.
// Every form posts to its own address and redirects back with a note; a form with
// a problem comes back with what was typed and the reason.
//
// Split out into screens/, a screen at a time (docs/review/senior-review-2026-11.md,
// item 7): share, inbox, queue (reviews to approve), account, pages (her Pages and Home),
// picks (which records a block shows). Each is a factory
// given what createScreens holds for the request; screens/parts.js is shared.
import { escapeHtml as esc } from '../lib/html.js';
import { json } from '../lib/http.js';
import { ALBUM_PHOTOS_MAX, SITE_FIELDS, PAYMENT_FIELDS, SAFE_NOTICE_FIELDS, ContentError, brandImageOk, pupStatus } from '../content/model.js';
import {
  KINDS, listRecords, getRecord, saveRecord, setField, removeRecord, moveRecord, makeParentRecord,
  saveSite, getPage, getPayment, savePayment, } from '../content/records.js';
import { fields, field, parseForm, LABELS, labelFor, placeChoices } from './forms.js';
import { savePhoto, PhotoError } from '../photos.js';
import { subjects, isSubject, tagPhotos, untagPhoto, tagsByPhoto } from '../photoTags.js';
import { photoPlaces } from '../photoPlaces.js';
import { publish, undoPublish, listSnapshots, draftChanges } from '../publish.js';
import { makePreviewToken } from '../site.js';
import { siteLink } from '../ops/sites.js';
import { defaultSay, NOTE_KEYS, sayError, sayMessage } from './wording.js';
import { STATUS_TEXT, statusText, SAFE_NOTICE_TEXT } from '../render/parts.js';
import { listEmbeds, addEmbed, removeEmbed, moveEmbed, EmbedError, EMBEDS_PER_PLACE } from '../embedStore.js';
import { PROVIDERS } from '../embeds.js';
import { readBadgeCode, storeBadgeImage, BadgeCodeError } from '../badgeCode.js';
import { readFeed, kennelosState } from '../feed.js';
import {
  waiting, fulfilled, getEntry, addEntry, updateEntry, setFulfilled, removeEntry, moveEntry, offerMailto, suggestWants, listNameFor, maskedNameFor, wantsPrivate, WaitlistError,
} from '../waitlist.js';
import { makeLinkCode, showCode, devices, stopDevice, unlinkSite, setKennelosPrices, LinkError, CODE_TTL_MS } from '../kennelos/link.js';
import { OWNED, OWNED_PRICES } from '../kennelos/bundle.js';
import { pendingMatches, matchChanges, confirmMatch, declineMatch, MatchError } from '../kennelos/match.js';
import { leavingLitters, keepLitter, deleteLitter } from '../kennelos/clock.js';
import { NOT_FOR_DEMO } from '../lib/demo.js';
import { litterDaysFor, loadBuild } from '../content/rules.js';
import { shareScreens } from './screens/share.js';
import { when, redirect, day } from './screens/parts.js';
import { inboxScreens } from './screens/inbox.js';
import { queueScreens } from './screens/queue.js';
import { accountScreens } from './screens/account.js';
import { pagesScreens } from './screens/pages.js';
import { picksScreens, isPicksPath } from './screens/picks.js';
import { dogFormFields, withLifeStage, fromLifeStage, lockLifeStage, pedigreeCard } from './screens/dogform.js';

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
  dogs: { name: (r) => r.call_name, sub: (r, say) => [r.outside ? say('doglist.outside') : null, r.role, r.show_on_site ? null : say('lists.sub.hidden')].filter(Boolean).join(' · ') },
  litters: { name: (r) => r.name, sub: (r, say) => (['planned', 'current', 'past'].includes(r.stage) ? say(`lists.sub.stage.${r.stage}`) : '') },
  puppies: { name: (r) => r.name, sub: (r, say) => statusText(r.status) ?? say('lists.sub.hidden_puppy') },
  health: { name: (r) => r.test, sub: (r, say) => `${r.result}${r.show ? '' : ` · ${say('lists.sub.not_shown')}`}` },
  reviews: { name: (r) => r.first_name, sub: (r, say) => (r.status === 'hidden' ? say('lists.sub.hidden') : r.quote.slice(0, 60)) },
  steps: { name: (r) => r.heading || r.body || '—', sub: () => '' },
  extras: { name: (r) => r.name, sub: (r, say) => (r.kind === 'homegoing' ? say('lists.sub.package', { weeks: r.weeks ?? '' }) : r.grp ?? '') },
  partners: { name: (r) => r.name, sub: (r, say) => (r.hidden_by_kennelos ? say('lists.sub.not_sent') : r.url ? r.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') : '') },
  products: { name: (r) => r.name, sub: (r, say) => [r.grp, r.code ? say('lists.sub.code', { code: r.code }) : null, r.transport ? say('lists.sub.transport') : null, r.home_badge ? say('lists.sub.home_badge') : null].filter(Boolean).join(' · ') },
  policies: { name: (r) => r.heading, sub: () => '' },
  // A question also placed elsewhere says so here, so she can see at a glance
  // which ones her pages are carrying: the places the owner has made (placeChoices).
  faq: { name: (r) => r.heading, sub: (r, say, places) => {
    const at = (r.places ?? []).filter((x) => !places || places.faq.some(([k]) => k === x));
    return at.length ? say('lists.sub.also_on', { places: at.map((x) => (places?.words(x) ?? x).toLowerCase()).join(', ') }) : '';
  } },
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
  const dogsList = async () => (await env.DB.prepare('SELECT id, call_name, outside FROM dogs WHERE site_id = ? ORDER BY sort').bind(site.id).all()).results;
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
  // Where questions and badges can show: the places the owner has made (step 3.6).
  let placesMemo = null;
  const places = async () => (placesMemo ??= placeChoices(await loadBuild(env, site.id), say));
  // The photo library window's addresses (forms.js photoSlot, photos.js): one window
  // for every photo spot; a new photo is tagged as what's being edited.
  const library = (pick) => ({ list: `${base}/photos/library`, upload: `${base}/photos/upload`, tags: (pick?.tags ?? []).filter(Boolean).join(','), alt: pick?.alt ?? '' });
  const ctxFor = async (kind, pick) => {
    const ctx = { kind, say, library: library(pick), photos: await photos(), photoUrl, dogs: await dogsList(), litters: await littersList(), partners: kind === 'dogs' ? await partnersList() : [], photosLink: `${base}/photos` };
    if (kind === 'expander' || kind === 'products') ctx.places = await places();
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
  // Co-owned dogs (docs/plans/done/co-owned-dogs.md): her partner kennels, from Dogs.
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
      <span class="order">${i ? `<form method="post" action="${base}/embeds/${e.id}/up">${hidden}<button aria-label="Move up">↑</button></form>` : '<span></span>'}${i < list.length - 1 ? `<form method="post" action="${base}/embeds/${e.id}/down">${hidden}<button aria-label="Move down">↓</button></form>` : '<span></span>'}<form method="post" action="${base}/embeds/${e.id}/remove">${hidden}<button class="link">${esc(say('pages.remove'))}</button></form></span></li>`).join('');
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

  const { shareScreen } = shareScreens({ base, env, request, say, site, url });

  // ---------- one list of records, generic ----------
  async function collection(path, kind, scopeId, { back, parentTitle } = {}) {
    const k = KINDS[kind];
    const L = LISTS[kind];
    const rest = url.pathname.slice(path.length).replace(/^\//, '');
    const post = request.method === 'POST';
    const formKind = FORM_KIND[kind] ?? kind;
    const allFields = Object.fromEntries(Object.entries(k.fields).filter(([n]) => !(kind === 'reviews' && n === 'photo_id')));
    // A dog's form has one Life stage for its status and two flags (screens/dogform.js).
    const dogs = kind === 'dogs';
    const formFields = dogs ? dogFormFields(allFields) : allFields;
    const parsed = (fd) => (dogs ? fromLifeStage(parseForm(formFields, fd)) : parseForm(formFields, fd));
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
      const lock = rec ? (dogs ? lockLifeStage(await lockedFor(kind, rec)) : await lockedFor(kind, rec)) : null;
      const shown = values ?? rec ?? { ...(k.defaults ?? {}) };
      const from = lock ? `<p class="notice">This ${esc(oneOf(kind))} comes from KennelOS. What's marked "from KennelOS" changes there, then Update website; everything else here is yours.</p>` : '';
      const body = `${from}${errorBox(err)}<form method="post" action="${esc(action)}" data-save class="card">${fields(formFields, dogs ? withLifeStage(shown) : shown, { ...await ctxFor(formKind, pickFor(rec)), locked: lock })}
        ${kind === 'products' ? BADGE_CODE_FIELD(say) : kind === 'partners' ? PARTNER_BADGE_FIELD(say) : ''}<button class="primary">${esc(rec ? say('list.save') : say('list.add', { one: oneOf(kind) }))}</button></form>
        ${rec ? `<form method="post" action="${esc(`${path}/${rec.id}/remove`)}" class="card danger"><p class="muted small">${esc(say('lists.removing_takes_it_off'))}</p><button>Remove this ${esc(oneOf(kind))}</button></form>` : ''}`;
      return { title: rec ? L.name(rec) : say('list.new', { one: oneOf(kind) }), back: path, body };
    };

    if (!rest) {
      if (post) return null;
      const rows = await listRecords(env, site.id, kind, scopeId);
      const where = kind === 'faq' ? await places() : null;
      const items = rows.map((r, i) => `<li class="item"><a href="${esc(`${path}/${r.id}`)}"><b>${esc(L.name(r))}</b><span>${esc(L.sub(r, say, where) ?? '')}</span></a>
        <span class="order">${i ? `<form method="post" action="${esc(`${path}/${r.id}/up`)}"><button aria-label="Move ${esc(L.name(r))} up">↑</button></form>` : '<span></span>'}${i < rows.length - 1 ? `<form method="post" action="${esc(`${path}/${r.id}/down`)}"><button aria-label="Move ${esc(L.name(r))} down">↓</button></form>` : '<span></span>'}</span></li>`).join('');
      const intro = kind === 'questions' ? `${(await kos()).online ? `<p class="error">${esc(say('lists.not_used_right_now'))}</p>` : ''}<p class="muted">${esc(say('lists.the_application_form_on'))}</p>` : '';
      const extra = kind === 'policies' ? await waitlistPoliciesCard() : kind === 'litters' ? await leavingCard() : kind === 'dogs' ? `${await offSiteDogsCard(rows)}${partnersLink()}` : kind === 'partners' ? await partnersIntro() : kind === 'reviews' ? '<p><a class="button" href="' + base + '/reviews-queue">Reviews families sent</a></p>' : '';
      return { title: parentTitle ? `${parentTitle}: ${listTitle(kind)}` : listTitle(kind), back: back ?? base, body: `${note(url)}${intro}${extra}<ul class="items">${items || `<li class="muted">${esc(say('list.empty'))}</li>`}</ul><p><a class="button primary" href="${esc(`${path}/new`)}">${esc(say('list.add', { one: oneOf(kind) }))}</a></p>` };
    }
    if (rest === 'new') {
      if (!post) return form(null);
      const fd = await request.formData();
      const values = parsed(fd);
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
    // A parent known only by name, made a dog record (its pedigree card).
    const mk = dogs && rest.match(/^([0-9a-f-]{36})\/make-(sire|dam)$/);
    if (mk) {
      if (!post) return null;
      const made = await makeParentRecord(env, site.id, mk[1], mk[2]);
      return redirect(made ? `${path}/${made.id}?note=made_parent` : `${path}/${mk[1]}`);
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
      if (dogs) view.body += pedigreeCard(rec, await listRecords(env, site.id, 'dogs'), base, say);
      return { ...view, rec };
    }
    const fd = await request.formData();
    const values = parsed(fd);
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

  // A litter has no photo field of its own: the photos shown on its profile (tagged
  // with it) are listed here, and chosen on the Photos screen (Show on a profile), the one
  // place to upload (decision 20). They're its row in the photo library's Profile photos.
  async function litterPhotos(view) {
    if (!view?.rec) return view;
    const subject = `litter:${view.rec.id}`;
    const t = await tags();
    const mine = (await photos()).filter((p) => (t.get(p.id) ?? []).includes(subject));
    view.body += `<section class="card photos"><h2>${esc(say('photos.photos_of_this_litter'))}</h2><p class="muted small">${esc(say('photos.photos_added_here_are'))}</p>
      ${mine.length ? `<div class="pm-peek pm-litter">${mine.slice(0, 12).map((p) => `<img src="${esc(photoUrl(p.id))}" alt="${esc(p.alt || say('photos.photo_2'))}" loading="lazy">`).join('')}</div>` : ''}
      <p><a class="button small" href="${esc(`${base}/photos?tab=profile`)}">${esc(say('photos.see_them_on_the'))}</a></p></section>`;
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
          ${p.source === 'kennelos' ? `<span class="muted small">${esc(p.hidden_by_kennelos ? say('puppylist.not_sent_by_kennelos') : statusText(p.status) ?? say('puppylist.hidden_2'))} · from KennelOS</span>` : `<select name="status" aria-label="${esc(p.name)}'s status">${Object.entries({ ...STATUS_TEXT, hidden: say('puppylist.hidden') }).map(([v, t]) => `<option value="${v}"${v === pupStatus(p.status) ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>
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

  const { picksScreen } = picksScreens({ base, env, note, request, say, site, url });
  const { pages, home, addedAction } = pagesScreens({ base, ctxFor, embedErr, embedsCard, env, errorBox, kos, library, listTitle, note, photoUrl, photos, request, say, site, tagFromForm, url });

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
  // The photo library window (docs/plans/site-builder.md, decision 20): the same on every
  // screen, the owner's too. Upload at the top; Page photos | Profile photos, each a row
  // per place a photo shows (photoPlaces.js), folded until opened, its thumbnails loading
  // then; the pinned bar's Replace (or Use these photos, picking several). photos.js
  // opens it in a dialog and does the choosing; these are only its parts, in her words.
  async function libraryHtml() {
    const places = await photoPlaces(env, site.id, say);
    const alts = new Map((await photos()).map((p) => [p.id, p.alt]));
    const ph = (id) => `<button type="button" class="lib-ph" data-id="${esc(id)}" data-thumb="${esc(photoUrl(id))}" aria-pressed="false"><img data-src="${esc(photoUrl(id))}" alt="${esc(alts.get(id) || say('photos.photo'))}"></button>`;
    const row = (r) => `<details class="lib-row"${r.unused ? ' data-unused' : ''}><summary><b>${esc(r.label)}</b><span class="n">${r.ids.length}</span></summary><div class="lib-grid">${r.ids.map(ph).join('')}</div></details>`;
    const tab = (k, list) => `<div class="lib-tab" data-tab="${k}"${k === 'page' ? '' : ' hidden'}>${list.map(row).join('') || `<p class="muted small">${esc(say('library.empty'))}</p>`}</div>`;
    return `<div class="lib" data-lib data-chosen="${esc(say('library.chosen', { n: '{n}' }))}" data-too-many="${esc(say('library.too_many', { n: '{n}' }))}" data-just-added="${esc(say('library.just_added'))}">
      <div class="lib-top"><h2>${esc(say('library.title'))}</h2>
        <label class="button small primary">${esc(say('library.upload'))}<input type="file" accept="image/*" multiple data-lib-upload></label>
        <p class="small muted" role="status" data-lib-status></p></div>
      <div class="seg sm lib-tabs" role="radiogroup"><label><input type="radio" name="lib-tab" value="page" checked><span>${esc(say('library.page_photos'))}</span></label><label><input type="radio" name="lib-tab" value="profile"><span>${esc(say('library.profile_photos'))}</span></label></div>
      <p class="small muted" data-for="one">${esc(say('library.pick_one'))}</p><p class="small muted" data-for="many">${esc(say('library.pick_many'))}</p>
      <div class="lib-rows">${tab('page', places.page)}${tab('profile', places.profile)}</div>
      <div class="lib-bar"><span class="small muted" data-lib-count></span><button type="button" class="link" data-lib-cancel>${esc(say('library.cancel'))}</button><button type="button" class="primary" data-lib-pick data-one="${esc(say('library.replace'))}" data-many="${esc(say('library.use_many'))}" disabled>${esc(say('library.replace'))}</button></div></div>`;
  }

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
    if (rest === '/library' && !post) return new Response(await libraryHtml(), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
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
    // The pinned bar's actions on the photos she chose (decision 20, step 2).
    if (rest === '/selected' && post) {
      const form = await request.formData();
      const tab = form.get('tab') === 'profile' ? 'profile' : 'page';
      const back = (key) => redirect(`${base}/photos?${tab === 'profile' ? 'tab=profile&' : ''}note=${key}`);
      const live = new Set((await photos()).map((p) => p.id));
      const ids = [...new Set(form.getAll('photos').map(String))].filter((id) => live.has(id));
      if (!ids.length) return back('pick_none');
      const act = String(form.get('act') ?? '');
      const t = new Date().toISOString();
      const touch = env.DB.prepare('UPDATE sites SET draft_changed_at = ? WHERE id = ?').bind(t, site.id);
      if (act === 'tag' || act === 'untag') {
        const subject = String(form.get('subject') ?? '');
        if (!subject || !(await isSubject(env, site.id, subject))) return back('tagnone');
        if (act === 'tag') await tagPhotos(env, site.id, ids, [subject]);
        else for (const id of ids) await untagPhoto(env, site.id, id, subject);
        return back(act === 'tag' ? 'onprofile' : 'offprofile');
      }
      if (act === 'album') {
        const album = await env.DB.prepare('SELECT id, photos FROM albums WHERE id = ? AND site_id = ?').bind(String(form.get('album') ?? ''), site.id).first();
        if (!album) return back('noalbum');
        const had = JSON.parse(album.photos || '[]');
        const next = [...had, ...ids.filter((id) => !had.includes(id))].slice(0, ALBUM_PHOTOS_MAX);
        await env.DB.batch([env.DB.prepare('UPDATE albums SET photos = ? WHERE id = ? AND site_id = ?').bind(JSON.stringify(next), album.id, site.id), touch]);
        return back('inalbum');
      }
      if (act === 'alt') {
        const alt = String(form.get('alt') ?? '').replace(/\s+/g, ' ').trim().slice(0, 200) || null;
        await env.DB.batch([...ids.map((id) => env.DB.prepare('UPDATE photos SET alt = ? WHERE id = ? AND site_id = ?').bind(alt, id, site.id)), touch]);
        return back('saved');
      }
      if (act === 'remove') {
        // In use: say where first, and remove only when she says so. Removed, a photo
        // comes off those places (the site leaves out removed photos; a form drops it).
        const places = await photoPlaces(env, site.id, say);
        const where = (id) => [...places.page, ...places.profile].filter((r) => !r.unused && r.ids.includes(id)).map((r) => r.label);
        const used = ids.map((id) => [id, where(id)]).filter(([, w]) => w.length);
        if (used.length && !form.has('confirm')) {
          return { title: say('photos.photos'), back: `${base}/photos`, body: `<form method="post" action="${base}/photos/selected" class="card"><h2>${esc(say('pm.in_use'))}</h2>
            <ul class="pm-where">${used.map(([id, w]) => `<li><img src="${esc(photoUrl(id))}" alt=""><span>${esc(w.join(', '))}</span></li>`).join('')}</ul>
            <p class="muted small">${esc(say('pm.in_use_then'))}</p>${ids.map((id) => `<input type="hidden" name="photos" value="${esc(id)}">`).join('')}
            <input type="hidden" name="tab" value="${tab}"><input type="hidden" name="confirm" value="1">
            <div class="row"><button class="primary danger" name="act" value="remove">${esc(say('pm.remove_anyway'))}</button><a class="link" href="${base}/photos${tab === 'profile' ? '?tab=profile' : ''}">${esc(say('pm.keep'))}</a></div></form>` };
        }
        await env.DB.batch([...ids.map((id) => env.DB.prepare('UPDATE photos SET removed_at = ? WHERE id = ? AND site_id = ?').bind(t, id, site.id)), touch]);
        return back('removed');
      }
      return back('pick_none');
    }
    if (rest || post) return null;

    // The Photos screen (decision 20, step 2): upload at the top; Page photos | Profile
    // photos, a row per place a photo shows (photoPlaces.js), folded with its count and
    // a few small previews; nothing under a photo until she chooses it, then one pinned
    // bar: Show on a profile, Add to album, Description, Remove (photos.js shows it).
    const tab = url.searchParams.get('tab') === 'profile' ? 'profile' : 'page';
    const places = await photoPlaces(env, site.id, say);
    const alts = new Map((await photos()).map((p) => [p.id, p.alt]));
    const rows = places[tab];
    const pic = (id, cls = '') => `<img${cls ? ` class="${cls}"` : ''} src="${esc(photoUrl(id))}" alt="${esc(alts.get(id) || say('photos.photo'))}" loading="lazy">`;
    const row = (r) => `<details class="lib-row pm-row"${r.unused ? ' data-unused' : ''}><summary><b>${esc(r.label)}</b><span class="pm-peek" aria-hidden="true">${r.ids.slice(0, 4).map((id) => pic(id)).join('')}</span><span class="n">${r.ids.length}</span></summary>
      <div class="lib-grid">${r.ids.map((id) => `<label class="lib-ph pm-ph"><input type="checkbox" name="photos" value="${esc(id)}" form="pm-bar">${pic(id)}</label>`).join('')}</div></details>`;
    const profiles = (await env.DB.prepare('SELECT d.id, d.call_name FROM dogs d WHERE d.site_id = ? ORDER BY d.sort, d.rowid').bind(site.id).all()).results.map((d) => [`dog:${d.id}`, say('library.dog', { name: d.call_name })])
      .concat((await env.DB.prepare('SELECT id, name FROM litters WHERE site_id = ? ORDER BY sort, rowid').bind(site.id).all()).results.map((l) => [`litter:${l.id}`, say('library.litter', { name: l.name })]))
      .concat((await env.DB.prepare('SELECT p.id, p.name, l.name AS litter FROM puppies p JOIN litters l ON l.id = p.litter_id WHERE p.site_id = ? ORDER BY l.sort, l.rowid, p.sort, p.rowid').bind(site.id).all()).results.map((p) => [`puppy:${p.id}`, say('library.puppy', { name: p.name, litter: p.litter })]));
    const albums = (await env.DB.prepare('SELECT id, title FROM albums WHERE site_id = ? ORDER BY sort, title').bind(site.id).all()).results;
    const tabLink = (k, label) => `<a href="${base}/photos${k === 'profile' ? '?tab=profile' : ''}"${k === tab ? ' class="on" aria-current="page"' : ''}>${esc(label)}</a>`;
    const panel = (k, inner) => `<div class="pm-panel" data-panel="${k}" hidden>${inner}</div>`;
    const bar = `<form method="post" action="${base}/photos/selected" id="pm-bar" class="pm-bar" data-chosen="${esc(say('library.chosen', { n: '{n}' }))}"><input type="hidden" name="tab" value="${tab}">
      ${panel('profile', `<label>${esc(say('pm.profile'))}<select name="subject"><option value="">${esc(say('pm.choose_profile'))}</option>${profiles.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('')}</select></label><div class="row"><button class="primary small" name="act" value="tag">${esc(say('pm.show_on_it'))}</button><button class="small" name="act" value="untag">${esc(say('pm.take_off_it'))}</button></div>`)}
      ${panel('album', albums.length ? `<label>${esc(say('pm.album'))}<select name="album">${albums.map((a) => `<option value="${esc(a.id)}">${esc(a.title)}</option>`).join('')}</select></label><div class="row"><button class="primary small" name="act" value="album">${esc(say('pm.add_to_it'))}</button></div>` : `<p class="small muted">${esc(say('pm.no_albums'))} <a href="${base}/lists/albums/new">${esc(say('pm.new_album'))}</a></p>`)}
      ${panel('alt', `<label>${esc(say('photos.what_s_in_the'))}<span class="hint">${esc(say('photos.helps_visitors_who_use'))}</span><input name="alt" maxlength="200"></label><div class="row"><button class="primary small" name="act" value="alt">${esc(say('photos.save'))}</button></div>`)}
      <div class="pm-acts"><span class="small" data-pm-count></span><button type="button" class="small" data-pm-panel="profile">${esc(say('pm.on_a_profile'))}</button><button type="button" class="small" data-pm-panel="album">${esc(say('pm.to_album'))}</button><button type="button" class="small" data-pm-panel="alt" data-pm-one>${esc(say('photos.description'))}</button><button class="small danger" name="act" value="remove">${esc(say('photos.remove'))}</button><button type="button" class="link small" data-pm-clear>${esc(say('library.cancel'))}</button></div></form>`;
    return {
      title: say('photos.photos'), back: base,
      body: `${note(url)}<p class="row"><a class="button" href="${base}/lists/albums">${esc(say('photos.albums'))}</a><span class="muted small">${esc(say('photos.galleries_with_their_own'))}</span></p>${await usageLine()}
        <section class="card pm-up" data-upload-here="${base}/photos/upload"><label class="button primary">${esc(say('library.upload'))}<input type="file" accept="image/*" multiple></label><p class="muted small" role="status"></p><p class="muted small">${esc(say('photos.photos_are_made_smaller'))}</p></section>
        <nav class="pm-tabs seg sm" aria-label="${esc(say('photos.photos'))}">${tabLink('page', say('library.page_photos'))}${tabLink('profile', say('library.profile_photos'))}</nav>
        <p class="muted small">${esc(say('pm.how'))}</p>
        <section class="card pm-rows">${rows.map(row).join('') || `<p class="muted small">${esc(say('library.empty'))}</p>`}</section>${bar}`,
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
    const list = await draftChanges(env, site.id);
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

  const { inbox } = inboxScreens({ base, env, kos, note, request, say, site, url });

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
        <span class="order">${i ? `<form method="post" action="${base}/waitlist/${e.id}/up"><button aria-label="Move ${esc(e.name)} up">↑</button></form>` : '<span></span>'}${i < list.length - 1 ? `<form method="post" action="${base}/waitlist/${e.id}/down"><button aria-label="Move ${esc(e.name)} down">↓</button></form>` : '<span></span>'}</span></div></li>`;
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

  const { queue } = queueScreens({ base, env, note, photoUrl, request, say, site, url });

  const { usageLine, exportManifest, account } = accountScreens({ base, env, errorBox, request, say, site, tags, url, user });

  // ---------- routing ----------
  return async function route() {
    const p = url.pathname.slice(base.length);
    let view = null;
    if (p === '/puppies' || /^\/puppies\/[0-9a-f-]{36}\/status$/.test(p)) view = await puppies();
    else if (p === '/details') view = await details();
    else if (p.startsWith('/pages')) view = await pages();
    else if (p.startsWith('/home')) view = await home();
    else if (isPicksPath(p)) view = await picksScreen();
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

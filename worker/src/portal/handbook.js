// The puppy handbook (docs/plans/family-portal.md sections 4, 6 phase 2 and 7.2):
// chapters she writes and orders on her Portal tab (portal/admin/handbook.js), read
// by families as a flipbook at /family/handbook (portal/family.js, public/_kp/f/
// handbook.js), with Home's Read next.
//
// A chapter's body is plain text, so it needs no editor script:
// - a blank line starts a new paragraph; a line break stays a line break;
// - lines starting "- " are a list; a line starting "## " is a small heading;
// - a line of "---" starts a new page of the flipbook (portal/family.js);
// - "[link: Embark]" is that program's link (one of her programs families see,
//   matched by name, any case); "[link: Embark | Order the kit]" gives it her words.
//   On a line of its own it's a button, inside a sentence a link. A tag that matches
//   no shown program shows nothing to families, and her screen says so;
// - {name} is the family's puppy, {kennel} her kennel.
//
// Families see a chapter only when it's on and has a title and words; with none,
// the handbook doesn't show at all (no page, no quick link, no Read next).
import { escapeHtml as esc } from '../lib/html.js';
import { PortalError } from './store.js';

export const MAX_TITLE = 120;
export const MAX_BODY = 20000;

const now = () => new Date().toISOString();

export async function listChapters(env, siteId) {
  const { results } = await env.DB.prepare('SELECT id, title, body, shown, sort, updated_at FROM portal_chapters WHERE site_id = ? ORDER BY sort, created_at').bind(siteId).all();
  return results;
}

export const isShown = (c) => Boolean(c.shown) && Boolean(String(c.title ?? '').trim()) && Boolean(String(c.body ?? '').trim());

// The chapters families see, in her order.
export async function shownChapters(env, siteId) {
  return (await listChapters(env, siteId)).filter(isShown);
}

// Her programs a chapter can link to: shown in the portal, with a web link.
export async function linkablePrograms(env, siteId) {
  const { results } = await env.DB.prepare(`SELECT id, name, link_url, link_label FROM products WHERE site_id = ? AND portal_show = 1
    AND link_url IS NOT NULL ORDER BY sort, name`).bind(siteId).all();
  return results.filter((x) => /^https:\/\//i.test(x.link_url));
}

export const linkTag = (name) => `[link: ${name}]`;

// save: { title, body, shown, link } — link: a program's id to add as a button at the end.
export async function saveChapter(env, siteId, id, input, programs = []) {
  const title = String(input.title ?? '').trim();
  let body = String(input.body ?? '').replace(/\r\n?/g, '\n').replace(/\s+$/, '');
  if (!title) throw new PortalError('handbook.need_title');
  if (title.length > MAX_TITLE) throw new PortalError('handbook.title_long');
  const add = programs.find((x) => x.id === String(input.link ?? ''));
  if (add) body = `${body}${body ? '\n\n' : ''}${linkTag(add.name)}`;
  if (body.length > MAX_BODY) throw new PortalError('handbook.body_long');
  const shown = input.shown ? 1 : 0;
  const t = now();
  if (id) {
    const res = await env.DB.prepare('UPDATE portal_chapters SET title = ?, body = ?, shown = ?, updated_at = ? WHERE id = ? AND site_id = ?').bind(title, body, shown, t, id, siteId).run();
    if (!res.meta?.changes) throw new PortalError('handbook.gone');
    return id;
  }
  const sort = (await env.DB.prepare('SELECT COALESCE(MAX(sort), -1) + 1 AS n FROM portal_chapters WHERE site_id = ?').bind(siteId).first('n')) ?? 0;
  const newId = crypto.randomUUID();
  await env.DB.prepare('INSERT INTO portal_chapters (id, site_id, title, body, shown, sort, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(newId, siteId, title, body, shown, sort, t, t).run();
  return newId;
}

export async function getChapter(env, siteId, id) {
  return env.DB.prepare('SELECT id, title, body, shown, sort FROM portal_chapters WHERE id = ? AND site_id = ?').bind(id, siteId).first();
}

export async function removeChapter(env, siteId, id) {
  await env.DB.prepare('DELETE FROM portal_chapters WHERE id = ? AND site_id = ?').bind(id, siteId).run();
}

export async function setShown(env, siteId, id, shown) {
  await env.DB.prepare('UPDATE portal_chapters SET shown = ?, updated_at = ? WHERE id = ? AND site_id = ?').bind(shown ? 1 : 0, now(), id, siteId).run();
}

export async function moveChapter(env, siteId, id, dir) {
  const list = await listChapters(env, siteId);
  const i = list.findIndex((x) => x.id === id);
  const j = dir === 'up' ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await env.DB.batch(list.map((x, n) => env.DB.prepare('UPDATE portal_chapters SET sort = ? WHERE id = ? AND site_id = ?').bind(n, x.id, siteId)));
}

// ---------- the body's link tags ----------

const TAG = /\[link:\s*([^\]|]{1,80}?)\s*(?:\|\s*([^\]]{1,80}?)\s*)?\]/gi;
const OWN_LINE = new RegExp(`^${TAG.source}$`, 'i');
const BULLET = /^[-•]\s+/;
const HEADING = /^(#{1,3})\s+/;
// [photo: what it shows | its caption]: what it shows until she picks one of her
// photos for it, then that photo's id. Only an id shows to families.
const PHOTO = /\[photo:\s*([^\]|]{1,160}?)\s*(?:\|\s*([^\]]{0,200}?)\s*)?\]/gi;
const OWN_PHOTO = new RegExp(`^${PHOTO.source}$`, 'i');
const PHOTO_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const key = (s) => String(s ?? '').trim().toLowerCase();

const matchProgram = (programs, name) => programs.find((x) => key(x.name) === key(name));

// The tags in a body that match none of her shown programs: what her screen flags.
export function brokenLinks(body, programs) {
  const out = [];
  for (const m of String(body ?? '').matchAll(TAG)) if (!matchProgram(programs, m[1]) && !out.includes(m[1].trim())) out.push(m[1].trim());
  return out;
}

// A body as the family's HTML. vars: { name, kennel }. link(program, words, inline)
// → the link's HTML (family.js counts its clicks); photo(id, caption) → a photo's HTML,
// or '' for one that isn't there. Read line by line:
//   # / ## / ### heading (a big one, a small one, a smaller one); "{center}" at the end
//   of a heading or a line centers it; **bold** and *italic*; "- " a list, "1. " a
//   numbered one; "> " a note in a box; "+++ Title" … "+++" a fold that opens on a tap;
//   [photo: …] and [link: …] on a line of their own. Everything else is a paragraph
//   (a blank line between two). Nothing she writes is ever taken as HTML.
export function bodyHtml(body, programs, vars, link, photo = () => '') {
  const fill = (s) => s.replace(/\{(name|kennel)\}/g, (m, k) => vars[k] ?? m);
  const emph = (h) => h.replace(/\*\*(?=\S)(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*\w])\*(?=\S)([^*]+?)\*(?!\w)/g, '$1<em>$2</em>');
  const inline = (text) => {
    let out = '';
    let at = 0;
    const t = text.replace(PHOTO, '');
    for (const m of t.matchAll(TAG)) {
      out += emph(esc(fill(t.slice(at, m.index))));
      const x = matchProgram(programs, m[1]);
      if (x) out += link(x, m[2] ? fill(m[2]) : (x.link_label || x.name), true);
      at = m.index + m[0].length;
    }
    return (out + emph(esc(fill(t.slice(at))))).replace(/ {2,}/g, ' ').trim();
  };
  const lines = String(body ?? '').replace(/\r\n?/g, '\n').split('\n').map((l) => l.trim());
  return blocksOf(lines, inline, (own) => {
    const x = matchProgram(programs, own[1]);
    return x ? `<p>${link(x, own[2] ? fill(own[2]) : (x.link_label || x.name), false)}</p>` : '';
  }, (m) => (PHOTO_ID.test(m[1]) ? photo(m[1].toLowerCase(), m[2] ? fill(m[2]) : '') : ''));
}

const CENTER = /\s*\{center\}\s*$/i;
const NUMBERED = /^\d{1,3}[.)]\s+/;
const QUOTE = /^>\s?/;
const FOLD = /^\+\+\+\s*(.*)$/;

function blocksOf(lines, inline, ownLink, ownPhoto) {
  const out = [];
  let para = [];
  let list = [];
  let ordered = false;
  const flushPara = () => {
    if (!para.length) return;
    const centered = para.some((l) => CENTER.test(l));
    const h = para.map((l) => inline(l.replace(CENTER, ''))).filter(Boolean).join('<br>');
    if (h) out.push(`<p${centered ? ' class="center"' : ''}>${h}</p>`);
    para = [];
  };
  const flushList = () => {
    const items = list.map(inline).filter(Boolean);
    if (items.length) out.push(`<${ordered ? 'ol' : 'ul'}>${items.map((h) => `<li>${h}</li>`).join('')}</${ordered ? 'ol' : 'ul'}>`);
    list = [];
  };
  const flush = () => { flushPara(); flushList(); };
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!l) { flush(); continue; }
    const fold = l.match(FOLD);
    if (fold && fold[1]) {
      flush();
      let j = i + 1;
      while (j < lines.length && !/^\+\+\+\s*$/.test(lines[j])) j++;
      const inner = blocksOf(lines.slice(i + 1, j), inline, ownLink, ownPhoto);
      const title = inline(fold[1]);
      if (title && inner) out.push(`<details class="fold"><summary>${title}</summary><div class="inner">${inner}</div></details>`);
      i = j;
      continue;
    }
    if (fold) continue; // a stray closing +++
    const own = l.match(OWN_LINE);
    if (own) { flush(); const h = ownLink(own); if (h) out.push(h); continue; }
    const pic = l.match(OWN_PHOTO);
    if (pic) { flush(); const h = ownPhoto(pic); if (h) out.push(h); continue; }
    const head = l.match(HEADING);
    if (head) {
      flush();
      const h = inline(l.replace(HEADING, '').replace(CENTER, ''));
      const cls = [head[1].length === 1 ? 'big' : head[1].length === 3 ? 'small' : '', CENTER.test(l) ? 'center' : ''].filter(Boolean).join(' ');
      if (h) out.push(`<h3${cls ? ` class="${cls}"` : ''}>${h}</h3>`);
      continue;
    }
    if (QUOTE.test(l)) {
      flush();
      const q = [];
      while (i < lines.length && QUOTE.test(lines[i])) q.push(lines[i++].replace(QUOTE, ''));
      i--;
      const inner = blocksOf(q, inline, ownLink, ownPhoto);
      if (inner) out.push(`<div class="note">${inner}</div>`);
      continue;
    }
    if (BULLET.test(l) || NUMBERED.test(l)) {
      const num = NUMBERED.test(l);
      flushPara();
      if (list.length && num !== ordered) flushList();
      ordered = num;
      list.push(l.replace(num ? NUMBERED : BULLET, ''));
      continue;
    }
    flushList();
    para.push(l);
  }
  flush();
  return out.join('');
}

// The programs a body links to, once each, in its order. Any: the disclosure goes with it.
export function linkedPrograms(body, programs) {
  const out = [];
  for (const m of String(body ?? '').matchAll(TAG)) {
    const x = matchProgram(programs, m[1]);
    if (x && !out.includes(x)) out.push(x);
  }
  return out;
}

// ---------- search ----------

// A page's words as plain text, for search: each link tag as the words families see
// (nothing for a tag that matches no program), list and heading marks gone, {name}
// and {kennel} filled in, spaces run together.
export function plainText(body, vars = {}, programs = []) {
  return String(body ?? '').replace(TAG, (m, name, words) => {
    const x = matchProgram(programs, name);
    return x ? (words ?? (x.link_label || x.name)) : '';
  })
    .replace(PHOTO, (m, what, caption) => (PHOTO_ID.test(what) ? caption ?? '' : ''))
    .replace(/^[ \t]*(?:[-•]|#{1,3}|\d{1,3}[.)]|>|\+\+\+)[ \t]*/gm, '')
    .replace(/\{center\}/gi, '').replace(/\*\*|(?<!\w)\*|\*(?!\w)/g, '')
    .replace(/\{(name|kennel)\}/g, (m, k) => vars[k] ?? m)
    .split(/\n/).map((l) => l.trim()).filter(Boolean)
    // A line with no stop of its own (a list item, a heading) ends with " · ".
    .map((l, i, all) => (i < all.length - 1 && !/[.!?:;,…]$/.test(l) ? `${l} ·` : l))
    .join(' ').replace(/\s+/g, ' ').trim();
}

export const searchWords = (q) => String(q ?? '').toLowerCase().split(/\s+/).filter(Boolean).slice(0, 8);

// Whether every word is in the title or the text.
export const matches = (title, text, words) => {
  const hay = `${title} ${text}`.toLowerCase();
  return words.every((w) => hay.includes(w));
};

// A few words around the first word found in the text ("… the crate beside your …"),
// or its start. public/_kp/f/handbook.js does the same as you type.
export function snippet(text, words, room = 60) {
  const low = text.toLowerCase();
  const at = words.map((w) => low.indexOf(w)).filter((i) => i >= 0).sort((a, b) => a - b)[0] ?? 0;
  let from = Math.max(0, at - room);
  let to = Math.min(text.length, Math.round(at + room * 1.6));
  // Whole words only: start after a space, stop before one.
  if (from) { const sp = text.indexOf(' ', from); from = sp >= 0 && sp < at ? sp + 1 : from; }
  if (to < text.length) { const sp = text.lastIndexOf(' ', to); to = sp > at ? sp : to; }
  return `${from ? '… ' : ''}${text.slice(from, to).trim()}${to < text.length ? ' …' : ''}`;
}

// ---------- photos ----------

// Every photo tag in a body, in order: { n, what, caption, id } (id once she's picked one).
export function photoTags(body) {
  return [...String(body ?? '').matchAll(PHOTO)].map((m, n) => ({ n, what: m[1].trim(), caption: (m[2] ?? '').trim(), id: PHOTO_ID.test(m[1]) ? m[1].toLowerCase() : null }));
}

// The photos a set of chapters shows (a family may see those, and only those).
export const photoIdsIn = (chapters) => [...new Set(chapters.flatMap((c) => photoTags(c.body).map((t) => t.id).filter(Boolean)))];

// Put one of her photos at a chapter's nth photo tag (or take the tag out: photoId null).
// What the tag said it shows becomes the caption, unless it had one.
export async function setChapterPhoto(env, siteId, id, n, photoId) {
  const c = await getChapter(env, siteId, id);
  if (!c) throw new PortalError('handbook.gone');
  if (photoId && !(await env.DB.prepare('SELECT id FROM photos WHERE id = ? AND site_id = ? AND removed_at IS NULL').bind(photoId, siteId).first())) throw new PortalError('handbook.photo_gone');
  let i = -1;
  const body = String(c.body).replace(PHOTO, (m, what, caption) => {
    i++;
    if (i !== n) return m;
    if (!photoId) return '';
    const words = (caption ?? '').trim() || (PHOTO_ID.test(what) ? '' : what.trim());
    return `[photo: ${photoId}${words ? ` | ${words}` : ''}]`;
  });
  await env.DB.prepare('UPDATE portal_chapters SET body = ?, updated_at = ? WHERE id = ? AND site_id = ?').bind(body.replace(/\n{3,}/g, '\n\n'), now(), id, siteId).run();
}

// ---------- chapters from a file (written with Claude, say) ----------

export const MAX_UPLOAD = 400 * 1024;
const MAX_CHAPTERS = 40;

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', mdash: '—', ndash: '–', hellip: '…', bull: '•', middot: '·', copy: '©', reg: '®', trade: '™', deg: '°', frac12: '½', frac13: '⅓', frac14: '¼', frac34: '¾', times: '×' };
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => {
  if (e[0] === '#') { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ''; }
  return ENTITIES[e.toLowerCase()] ?? m;
});

// An HTML page (what Claude makes as a page or a download) as the handbook's own format:
// headings, paragraphs, bold and italic, lists, notes (blockquote), folds (details),
// rules (a new page), pictures (their alt as a photo to pick), centered text. Scripts,
// styles and anything else are dropped: nothing of the file runs or shows as it was.
export function htmlToText(html) {
  let h = String(html ?? '');
  const body = h.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (body) h = body[1];
  h = h.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|head|title|svg|noscript|template|iframe|object|button|form|nav|footer)\b[\s\S]*?<\/\1\s*>/gi, '');
  const centered = (attrs) => /text-align\s*:\s*center|class\s*=\s*["'][^"']*\b(center|centered|text-center)\b/i.test(attrs ?? '');
  h = h.replace(/<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1\s*>/gi, (m, n, attrs, t) => `\n\n${'#'.repeat(Math.min(3, Number(n)))} ${t.replace(/\s+/g, ' ').trim()}${centered(attrs) ? ' {center}' : ''}\n\n`);
  h = h.replace(/<img\b([^>]*)>/gi, (m, attrs) => { const alt = attrs.match(/\balt\s*=\s*("([^"]*)"|'([^']*)')/i); const w = (alt?.[2] ?? alt?.[3] ?? '').replace(/[[\]|]/g, ' ').trim(); return `\n\n[photo: ${w || 'a photo'}]\n\n`; });
  h = h.replace(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption\s*>/gi, (m, t) => `\n\n*${t.replace(/\s+/g, ' ').trim()}*\n\n`);
  h = h.replace(/<summary\b[^>]*>([\s\S]*?)<\/summary\s*>/gi, (m, t) => `\n+++ ${t.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()}\n`);
  h = h.replace(/<\/details\s*>/gi, '\n+++\n');
  h = h.replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi, (m, t, x) => (x.trim() ? `**${x.trim()}**` : x));
  h = h.replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi, (m, t, x) => (x.trim() ? `*${x.trim()}*` : x));
  h = h.replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote\s*>/gi, (m, t) => `\n\n${t.replace(/<\/?p\b[^>]*>/gi, '\n').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => `> ${l}`).join('\n')}\n\n`);
  h = h.replace(/<ol\b[^>]*>([\s\S]*?)<\/ol\s*>/gi, (m, t) => { let n = 0; return `\n\n${t.replace(/<li\b[^>]*>([\s\S]*?)<\/li\s*>/gi, (x, li) => `\n${++n}. ${li.replace(/\s+/g, ' ').trim()}`)}\n\n`; });
  h = h.replace(/<li\b[^>]*>([\s\S]*?)<\/li\s*>/gi, (m, li) => `\n- ${li.replace(/\s+/g, ' ').trim()}`);
  h = h.replace(/<hr\b[^>]*>/gi, '\n\n---\n\n').replace(/<br\s*\/?>/gi, '\n');
  h = h.replace(/<p\b([^>]*)>([\s\S]*?)<\/p\s*>/gi, (m, attrs, t) => `\n\n${t.replace(/\s*\n\s*/g, ' ').trim()}${centered(attrs) ? ' {center}' : ''}\n\n`);
  h = h.replace(/<\/?(div|section|article|header|main|ul|table|tr|aside|figure)\b[^>]*>/gi, '\n');
  h = h.replace(/<[^>]+>/g, '');
  return decode(h).replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

// A file's text as chapters: each "# Title" starts one. A file with one "# " title and
// two or more "## " headings is a book: its "## " are the chapters. With no heading at
// all, the whole file is one chapter, named after the file.
export function chaptersFrom(text, filename = '') {
  let t = String(text ?? '').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  if (/\.html?$/i.test(filename) || /^\s*(<!doctype html|<html|<body|<h1|<div|<p\b)/i.test(t)) t = htmlToText(t);
  const lines = t.split('\n');
  const ones = lines.filter((l) => /^#\s+\S/.test(l)).length;
  const twos = lines.filter((l) => /^##\s+\S/.test(l)).length;
  let level = ones >= 2 || (ones === 1 && twos < 2) ? 1 : twos >= 1 ? 2 : 0;
  const out = [];
  let cur = null;
  const base = filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
  const fallback = base ? base[0].toUpperCase() + base.slice(1) : 'A chapter';
  for (const l of lines) {
    const m = level && l.match(level === 1 ? /^#\s+(.+)$/ : /^##\s+(.+)$/);
    if (m) { cur = { title: m[1].replace(CENTER, '').replace(/\*\*/g, '').trim().slice(0, MAX_TITLE), lines: [] }; out.push(cur); continue; }
    if (level === 2 && /^#\s+/.test(l)) continue; // the book's own title
    if (!cur) { if (!l.trim()) continue; cur = { title: fallback.slice(0, MAX_TITLE), lines: [] }; out.push(cur); }
    cur.lines.push(l);
  }
  const chapters = out.map((c) => ({ title: c.title, body: c.lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() })).filter((c) => c.title && c.body);
  if (!chapters.length) throw new PortalError('handbook.upload_empty');
  if (chapters.length > MAX_CHAPTERS) throw new PortalError('handbook.upload_many');
  if (chapters.some((c) => c.body.length > MAX_BODY)) throw new PortalError('handbook.body_long');
  return chapters;
}

// Add a file's chapters at the end; one with the same title as hers replaces its words
// (keeping its place and whether it's on) when replace is set. shown: new ones are on.
export async function importChapters(env, siteId, chapters, { replace = true, shown = false } = {}) {
  const have = await listChapters(env, siteId);
  let sort = have.reduce((n, c) => Math.max(n, c.sort), -1) + 1;
  const t = now();
  const st = [];
  let added = 0; let replaced = 0;
  for (const c of chapters) {
    const same = replace && have.find((x) => key(x.title) === key(c.title));
    if (same) { st.push(env.DB.prepare('UPDATE portal_chapters SET body = ?, updated_at = ? WHERE id = ? AND site_id = ?').bind(c.body, t, same.id, siteId)); replaced++; continue; }
    st.push(env.DB.prepare('INSERT INTO portal_chapters (id, site_id, title, body, shown, sort, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), siteId, c.title, c.body, shown ? 1 : 0, sort++, t, t));
    added++;
  }
  if (st.length) await env.DB.batch(st);
  return { added, replaced };
}

// What she gives Claude so the file it makes comes in looking right. Kept here, not in
// manage/wording.js: it's longer than a line there may be (600 characters).
export const CLAUDE_PROMPT = `Please write chapters for my puppy handbook, which families read as a little book in my puppy portal. Give me one Markdown (.md) file I can download, using only these styles:

# Chapter title  (each chapter starts with one of these)
## A heading inside a chapter, ### a smaller one. Add {center} at the end of a heading or a line to center it, like: ## Welcome home {center}
**bold** and *italic*
- a list item, or 1. a numbered one
> a note in a box (start each of its lines with >)
+++ A question or title that opens on a tap
The words inside it
+++
[photo: what the photo should show | a caption]  (on a line of its own; I'll pick the photo from my own photos)
--- on a line of its own starts a new page of the book
Write {name} wherever the puppy's name goes; each family sees their own puppy's name.

No tables, no links and no other formatting. Keep each chapter short and warm, a page or two. Here is what I'd like:

`;


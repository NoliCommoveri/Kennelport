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
const HEADING = /^#{1,3}\s+/;
const key = (s) => String(s ?? '').trim().toLowerCase();

const matchProgram = (programs, name) => programs.find((x) => key(x.name) === key(name));

// The tags in a body that match none of her shown programs: what her screen flags.
export function brokenLinks(body, programs) {
  const out = [];
  for (const m of String(body ?? '').matchAll(TAG)) if (!matchProgram(programs, m[1]) && !out.includes(m[1].trim())) out.push(m[1].trim());
  return out;
}

// A body as the family's HTML. vars: { name, kennel }. link(program, words, inline)
// → the link's HTML (family.js counts its clicks).
export function bodyHtml(body, programs, vars, link) {
  const fill = (s) => s.replace(/\{(name|kennel)\}/g, (m, k) => vars[k] ?? m);
  const inline = (text) => {
    let out = '';
    let at = 0;
    for (const m of text.matchAll(TAG)) {
      out += esc(fill(text.slice(at, m.index)));
      const x = matchProgram(programs, m[1]);
      if (x) out += link(x, m[2] ? fill(m[2]) : (x.link_label || x.name), true);
      at = m.index + m[0].length;
    }
    return (out + esc(fill(text.slice(at)))).replace(/ {2,}/g, ' ');
  };
  const blocks = [];
  for (const part of String(body ?? '').replace(/\r\n?/g, '\n').split(/\n\s*\n/)) {
    const lines = part.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    let para = [];
    let list = [];
    const flushPara = () => {
      const h = para.map(inline).join('<br>').trim();
      if (h) blocks.push(`<p>${h}</p>`);
      para = [];
    };
    const flushList = () => {
      const items = list.map(inline).filter((h) => h.trim());
      if (items.length) blocks.push(`<ul>${items.map((h) => `<li>${h}</li>`).join('')}</ul>`);
      list = [];
    };
    for (const l of lines) {
      const own = l.match(OWN_LINE);
      if (own) {
        flushPara(); flushList();
        const x = matchProgram(programs, own[1]);
        if (x) blocks.push(`<p>${link(x, own[2] ? fill(own[2]) : (x.link_label || x.name), false)}</p>`);
      } else if (HEADING.test(l)) {
        flushPara(); flushList();
        const h = inline(l.replace(HEADING, ''));
        if (h.trim()) blocks.push(`<h3>${h}</h3>`);
      } else if (BULLET.test(l)) {
        flushPara();
        list.push(l.replace(BULLET, ''));
      } else {
        flushList();
        para.push(l);
      }
    }
    flushPara(); flushList();
  }
  return blocks.join('');
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

// Her inbox (/s/<sub>/inbox, plan 3.10, decision 12): messages from her site's forms,
// one per line, and each opened. A screen of the Site Manager (manage/screens.js
// routes to it), made with what that file's createScreens holds for the request.
import { escapeHtml as esc } from '../../lib/html.js';
import { when, redirect } from './parts.js';

export function inboxScreens({ base, env, kos, note, request, say, site, url }) {
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

  return { listedLine, inbox };
}

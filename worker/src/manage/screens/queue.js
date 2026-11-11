// Reviews to approve (/s/<sub>/reviews-queue, decision 13): a review a family sent
// from her site waits here until she shows or hides it. A screen of the Site Manager
// (manage/screens.js routes to it), made with what that file's createScreens holds.
import { escapeHtml as esc } from '../../lib/html.js';
import { when, redirect } from './parts.js';

export function queueScreens({ base, env, note, photoUrl, request, say, site, url }) {
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

  return { queue };
}

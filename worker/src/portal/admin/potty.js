// Her potty guide (/s/<sub>/portal/potty, routed by portal/admin.js;
// docs/plans/portal-resources-potty.md section 2): the families' potty schedule on or off
// for her site, and her guide under it, the suggested one until she writes her own.
// Every line she reads is in the owner's list (manage/wording-portal.js ppotty.*). No
// prototype screen: built from the template screens' card, fgrid and hints.
import { escapeHtml as esc } from '../../lib/html.js';
import { guideText, SUGGESTED_GUIDE } from '../potty.js';
import { errorBox } from './parts.js';
import { defaultSay } from '../../manage/wording.js';

export function pottyScreen(site, s, url, { error, say = defaultSay } = {}) {
  const t = (k, v) => esc(say(k, v));
  const base = `/s/${esc(site.subdomain)}/portal/potty`;
  const text = guideText(s);
  const suggested = text === SUGGESTED_GUIDE;
  return `${url.searchParams.get('note') === 'saved' ? `<p class="notice" role="status">${t('ppotty.saved')}</p>` : ''}${errorBox(error, say)}
    <form method="post" action="${base}" class="card"><h1>${t('ppotty.title')}</h1><p class="hint">${t('ppotty.hint')}</p>
    <div class="fgrid">
      <label class="check"><input type="checkbox" name="potty_on" value="1"${s.potty_off ? '' : ' checked'}> <span>${t('ppotty.on')}<br><span class="hint">${t('ppotty.on_hint')}</span></span></label>
      <label class="check"><input type="checkbox" name="guide_on" value="1"${s.potty_guide_off ? '' : ' checked'}> <span>${t('ppotty.guide_on')}</span></label>
      <label>${t('ppotty.guide')}${suggested ? ` <span class="tag">${t('ppotty.suggested_tag')}</span>` : ''}<textarea name="potty_guide" rows="16" maxlength="6000">${esc(text)}</textarea><span class="hint">${t('ppotty.guide_hint')}</span></label>
      <p><button class="primary">${t('ppotty.save')}</button>${suggested ? '' : ` <button name="reset" value="1">${t('ppotty.reset')}</button>`}</p>
      <p class="hint">${t('ppotty.see')}</p>
    </div></form>`;
}

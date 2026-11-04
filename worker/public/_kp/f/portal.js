// The family portal's one script (src/portal/family.js): the Aa text size,
// remembered on this device, and deadlines shown in the family's own time zone
// when it differs from the breeder's. The pages work without it.
(() => {
  const root = document.documentElement;
  const KEY = 'kp-family-zoom';
  const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const z = read();
  if (z === '2' || z === '3') root.dataset.zoom = z;
  document.addEventListener('DOMContentLoaded', () => {
    const aa = document.getElementById('aa');
    if (aa) aa.addEventListener('click', () => {
      const next = { 1: '2', 2: '3', 3: '1' }[root.dataset.zoom || '1'];
      if (next === '1') delete root.dataset.zoom; else root.dataset.zoom = next;
      try { localStorage.setItem(KEY, next); } catch { /* private window */ }
    });
    let zone = null;
    try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { /* old browser */ }
    for (const t of document.querySelectorAll('time[data-local]')) {
      const at = new Date(t.dataset.local);
      if (!zone || zone === t.dataset.tz || Number.isNaN(at.getTime())) continue;
      const mine = at.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
      t.insertAdjacentText('afterend', ` (${mine} your time)`);
    }
  });
})();

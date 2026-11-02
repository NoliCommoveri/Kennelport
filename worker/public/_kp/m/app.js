// KennelPort Site Manager in the browser:
// - registers the service worker, so the screens open offline (public/_kp/m/sw.js);
// - shows a note while offline;
// - forms marked data-save are sent with fetch: if that fails (offline, or the
//   connection drops), the page stays as it is with everything typed still in the
//   form, and says nothing was saved (plan 4, "online only for edits").
(() => {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});

  const note = document.getElementById('offline-note');
  const update = () => { if (note) note.hidden = navigator.onLine; };
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  update();

  // Fill the device label on the code form, so the session list can say "iPhone".
  for (const input of document.querySelectorAll('input[name=label]')) {
    const ua = navigator.userAgent;
    input.value = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android phone' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows computer' : 'Browser';
  }

  // Copy buttons (an email address in the Inbox).
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-copy]');
    if (!b) return;
    try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = 'Copied'; } catch { b.textContent = b.dataset.copy; }
    setTimeout(() => { b.textContent = 'Copy email'; }, 2000);
  });

  // Notifications on this device (/notifications). The push carries no text; the
  // service worker asks the server what to show (sw.js).
  const push = document.getElementById('push');
  if (push && push.dataset.key) {
    const state = document.getElementById('push-state');
    const on = document.getElementById('push-on');
    const off = document.getElementById('push-off');
    const test = document.getElementById('push-test');
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const key = Uint8Array.from(atob(push.dataset.key.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((push.dataset.key.length + 3) % 4)), (c) => c.charCodeAt(0));
    const post = (path, body) => fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' }).then((r) => r.json());
    const show = (msg, isOn) => { state.textContent = msg; on.hidden = isOn; off.hidden = !isOn; test.hidden = !isOn; };
    const sub = async () => (await navigator.serviceWorker.ready).pushManager.getSubscription();
    (async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        if (ios && !standalone) { document.getElementById('push-ios').hidden = false; state.textContent = 'Add Site Manager to your home screen first.'; }
        else state.textContent = "This browser can't show notifications.";
        return;
      }
      const s = await sub();
      const known = s ? (await post('/push/status', { endpoint: s.endpoint })).on : false;
      show(known ? 'Notifications are on for this device.' : (Notification.permission === 'denied' ? 'Notifications are blocked for this site in your browser settings.' : 'Notifications are off for this device.'), known);
    })();
    on.addEventListener('click', async () => {
      on.disabled = true;
      try {
        if (await Notification.requestPermission() !== 'granted') { show('Notifications weren\'t allowed. You can allow them in your browser\'s settings for this site.', false); return; }
        const reg = await navigator.serviceWorker.ready;
        const s = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
        const r = await post('/push/subscribe', { endpoint: s.endpoint, auth: b64(s.getKey('auth')) });
        show(r.ok ? 'Notifications are on for this device.' : r.reason, r.ok);
      } catch { show("Notifications couldn't be turned on. Try again.", false); }
      finally { on.disabled = false; }
    });
    off.addEventListener('click', async () => {
      const s = await sub();
      if (s) { await post('/push/unsubscribe', { endpoint: s.endpoint }); await s.unsubscribe(); }
      show('Notifications are off for this device.', false);
    });
    test.addEventListener('click', async () => {
      const s = await sub();
      const r = s ? await post('/push/test', { endpoint: s.endpoint }) : { ok: false };
      state.textContent = r.ok ? 'Test sent. It should appear in a moment.' : "The test couldn't be sent. Turn notifications off and on again.";
    });
  }

  for (const form of document.querySelectorAll('form[data-save]')) {
    form.addEventListener('submit', async (e) => {
      if (form.dataset.sending) { e.preventDefault(); return; }
      e.preventDefault();
      let msg = form.querySelector('.save-msg');
      if (!msg) { msg = document.createElement('p'); msg.className = 'save-msg'; msg.setAttribute('role', 'status'); form.append(msg); }
      const button = form.querySelector('button[type=submit], button:not([type])');
      form.dataset.sending = '1';
      if (button) button.disabled = true;
      msg.className = 'save-msg'; msg.textContent = 'Saving…';
      try {
        const res = await fetch(form.action, { method: 'POST', body: new FormData(form), credentials: 'same-origin', redirect: 'follow' });
        const html = await res.text();
        // The server answered: show whatever it sent (the next screen, or the form with its message).
        history.replaceState(null, '', res.url);
        document.open(); document.write(html); document.close();
      } catch {
        msg.className = 'save-msg bad';
        msg.textContent = navigator.onLine ? "Couldn't reach KennelPort. Nothing was saved; your changes are still here. Try again." : "You're offline. Nothing was saved; your changes are still here. Try again when you're back online.";
      } finally {
        delete form.dataset.sending;
        if (button) button.disabled = false;
      }
    });
  }
})();

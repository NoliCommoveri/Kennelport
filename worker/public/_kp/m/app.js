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

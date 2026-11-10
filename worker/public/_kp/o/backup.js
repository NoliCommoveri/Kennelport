// /ops: a site's full backup, made and read here in the browser (src/backup.js,
// docs/plans/backup-format.md). The server hands a site over a piece at a time
// (what there is, rows by the page, files one by one) and takes it back the same
// way, so no request holds a whole site; this puts the pieces in one zip, using
// the manage app's zip maker (/_kp/m/zip.js, loaded before this).
//
// The zip:  backup.json   the manifest and every table's rows
//           files/<key>   every file, at its storage key
//           README.txt
(() => {
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  async function ask(fetcher, url, init) {
    const res = await fetcher(url, { credentials: 'same-origin', ...init });
    if (!res.ok) {
      let message = `${url.split('?')[0]} answered ${res.status}`;
      try { message = (await res.json()).message || message; } catch { /* not JSON */ }
      throw new Error(message);
    }
    return res;
  }
  const post = (fetcher, url, body) => ask(fetcher, url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json());

  // ---------- out ----------

  // Returns { backup, files: [{ name, data }] }, ready for the zip.
  async function collect(base, { fetcher = fetch, say = () => {} } = {}) {
    say('Reading what the site has…');
    const manifest = await (await ask(fetcher, `${base}/manifest`)).json();
    const tables = {};
    for (const t of manifest.tables) {
      tables[t.name] = [];
      let after = 0;
      while (after !== null) {
        say(`Records: ${t.name} (${tables[t.name].length} of ${t.rows})…`);
        const page = await (await ask(fetcher, `${base}/rows?table=${encodeURIComponent(t.name)}&after=${after}`)).json();
        tables[t.name].push(...page.rows);
        after = page.next;
      }
    }
    const backup = { ...manifest, tables };
    const files = [];
    let n = 0;
    for (const f of manifest.files) {
      n++;
      say(`File ${n} of ${manifest.files.length}…`);
      const res = await ask(fetcher, `${base}/file?key=${encodeURIComponent(f.key)}`);
      files.push({ name: `files/${f.key}`, data: new Uint8Array(await res.arrayBuffer()) });
    }
    const rows = Object.values(tables).reduce((sum, list) => sum + list.length, 0);
    const readme = `A full backup of ${manifest.site.kennel_name || manifest.site.subdomain} (${manifest.site.subdomain}), made ${manifest.exported_at}.\n\n`
      + `backup.json: the site's own row and every table's rows, as stored (${rows} rows).\n`
      + `files/: every photo and file (${files.length}), each at its storage key.\n\n`
      + 'To put it back: KennelPort ops, "Restore a site from a full backup". What each table and field is: docs/plans/backup-format.md in the KennelPort repository.\n\n'
      + 'This holds families\' and visitors\' names, addresses and messages. Keep it private.\n';
    return { backup, files: [{ name: 'backup.json', data: enc.encode(JSON.stringify(backup, null, 1)) }, { name: 'README.txt', data: enc.encode(readme) }, ...files] };
  }

  // ---------- the zip, read back ----------

  // The entries of a zip whose files are stored, not compressed (as zip.js makes
  // them). `blob` is a File or Blob; each entry reads its own bytes when asked.
  async function readZip(blob) {
    const tailSize = Math.min(blob.size, 66000);
    const tail = new DataView(await blob.slice(blob.size - tailSize).arrayBuffer());
    let at = -1;
    for (let i = tail.byteLength - 22; i >= 0; i--) if (tail.getUint32(i, true) === 0x06054b50) { at = i; break; }
    if (at < 0) throw new Error('That file isn\'t a zip.');
    const count = tail.getUint16(at + 10, true);
    const size = tail.getUint32(at + 12, true);
    const offset = tail.getUint32(at + 16, true);
    const dir = new DataView(await blob.slice(offset, offset + size).arrayBuffer());
    const entries = [];
    let p = 0;
    for (let i = 0; i < count; i++) {
      if (dir.getUint32(p, true) !== 0x02014b50) throw new Error('The zip is damaged.');
      const method = dir.getUint16(p + 10, true);
      const bytes = dir.getUint32(p + 20, true);
      const nameLen = dir.getUint16(p + 28, true);
      const extraLen = dir.getUint16(p + 30, true);
      const commentLen = dir.getUint16(p + 32, true);
      const local = dir.getUint32(p + 42, true);
      const name = dec.decode(new Uint8Array(dir.buffer, dir.byteOffset + p + 46, nameLen));
      if (method !== 0) throw new Error('This zip has been repacked. Use the zip exactly as KennelPort made it.');
      entries.push({
        name,
        bytes,
        async data() {
          const head = new DataView(await blob.slice(local, local + 30).arrayBuffer());
          const start = local + 30 + head.getUint16(26, true) + head.getUint16(28, true);
          return new Uint8Array(await blob.slice(start, start + bytes).arrayBuffer());
        },
      });
      p += 46 + nameLen + extraLen + commentLen;
    }
    return entries;
  }

  // ---------- back in ----------

  const CHUNK = 100;

  async function restore(base, blob, { fetcher = fetch, say = () => {} } = {}) {
    say('Reading the zip…');
    const entries = await readZip(blob);
    const main = entries.find((e) => e.name === 'backup.json');
    if (!main) throw new Error('There is no backup.json in that zip: it isn\'t a full backup.');
    const backup = JSON.parse(dec.decode(await main.data()));
    const { tables, ...manifest } = backup;
    const files = entries.filter((e) => e.name.startsWith('files/'));
    const types = new Map((manifest.files || []).map((f) => [f.key, f.type]));

    say('Making the site…');
    const begun = await post(fetcher, `${base}/begin`, manifest);
    const site = begun.site_id;
    try {
      for (const table of begun.tables) {
        const rows = (tables && tables[table]) || [];
        for (let i = 0; i < rows.length; i += CHUNK) {
          say(`Records: ${table} (${i} of ${rows.length})…`);
          await post(fetcher, `${base}/rows`, { site_id: site, table, rows: rows.slice(i, i + CHUNK) });
        }
      }
      let n = 0;
      for (const f of files) {
        n++;
        say(`File ${n} of ${files.length}…`);
        const key = f.name.slice('files/'.length);
        const type = types.get(key);
        await ask(fetcher, `${base}/file?site=${encodeURIComponent(site)}&key=${encodeURIComponent(key)}${type ? `&type=${encodeURIComponent(type)}` : ''}`, { method: 'POST', headers: { 'content-type': 'application/octet-stream' }, body: await f.data() });
      }
      say('Finishing…');
      const done = await post(fetcher, `${base}/finish`, { site_id: site });
      // What went in against what the backup said it held.
      const short = done.tables.filter((t) => t.rows !== ((tables && tables[t.name]) || []).length).map((t) => t.name);
      if (short.length || done.files !== files.length) throw new Error(`The restore finished, but these don't match the backup: ${[...short, ...(done.files !== files.length ? ['files'] : [])].join(', ')}. Check the site before using it.`);
      return { ...done, subdomain: begun.subdomain };
    } catch (err) {
      if (!/finished, but/.test(err.message)) {
        try { await post(fetcher, `${base}/abandon`, { site_id: site }); } catch { /* the message below says so */ }
        throw new Error(`${err.message} Nothing was kept: what had gone in was taken out again, so you can try again.`);
      }
      throw err;
    }
  }

  globalThis.kpBackup = { collect, readZip, restore }; // for the tests

  if (typeof document === 'undefined') return;
  const status = document.getElementById('status');
  const say = (m) => { if (status) status.textContent = m; };

  const out = document.getElementById('backup');
  if (out) {
    out.addEventListener('click', async () => {
      out.disabled = true;
      try {
        const { files } = await collect(out.dataset.base, { say });
        say('Making the zip…');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(globalThis.kpZip(files));
        a.download = `${out.dataset.name}-full-backup-${new Date().toISOString().slice(0, 10)}.zip`;
        document.body.append(a);
        a.click();
        a.remove();
        say(`Done: ${files.length - 2} files and the records are in the zip that just downloaded.`);
      } catch (err) {
        say(`The backup didn't finish: ${err.message}`);
      }
      out.disabled = false;
    });
  }

  const back = document.getElementById('restore');
  if (back) {
    back.addEventListener('click', async () => {
      const file = document.getElementById('zip').files[0];
      if (!file) { say('Choose the backup zip first.'); return; }
      back.disabled = true;
      try {
        const done = await restore(back.dataset.base, file, { say });
        say(`Restored ${done.subdomain}: ${done.tables.reduce((n, t) => n + t.rows, 0)} records and ${done.files} files. It is ${done.status}. Open it from the list on the ops page.`);
      } catch (err) {
        say(`Not restored: ${err.message}`);
      }
      back.disabled = false;
    });
  }
})();

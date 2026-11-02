// "Download a copy" (plan 4.3): the zip is built here in the browser, not on the
// server, which would run into a Worker's memory and CPU limits on a site with
// hundreds of photos. Files are stored uncompressed (photos are compressed
// already); each one's CRC-32 is worked out here as the zip format needs.
(() => {

  const table = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc32 = (bytes) => { let c = 0xffffffff; for (let i = 0; i < bytes.length; i++) c = table[(c ^ bytes[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const enc = new TextEncoder();

  function zip(files) {
    const parts = []; const central = []; let offset = 0;
    for (const f of files) {
      const name = enc.encode(f.name); const data = f.data; const crc = crc32(data);
      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true); // UTF-8 names
      local.setUint32(14, crc, true); local.setUint32(18, data.length, true); local.setUint32(22, data.length, true); local.setUint16(26, name.length, true);
      parts.push(local, name, data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
      c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, offset, true);
      central.push(c, name);
      offset += 30 + name.length + data.length;
    }
    const size = central.reduce((n, p) => n + p.byteLength, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, size, true); end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, end], { type: 'application/zip' });
  }
  globalThis.kpZip = zip; // for the tests

  const button = document.getElementById('export');
  if (!button) return;
  const status = document.getElementById('export-status');
  const say = (m) => { status.textContent = m; };

  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      say('Getting your content…');
      const manifest = await (await fetch(button.dataset.manifest, { credentials: 'same-origin' })).json();
      const files = [
        { name: 'content.json', data: enc.encode(JSON.stringify(manifest.content, null, 2)) },
        { name: 'messages.json', data: enc.encode(JSON.stringify(manifest.messages, null, 2)) },
        ...(manifest.waitlist ? [{ name: 'waitlist.json', data: enc.encode(JSON.stringify(manifest.waitlist, null, 2)) }] : []),
        { name: 'photos.json', data: enc.encode(JSON.stringify(manifest.photos.map(({ url, ...p }) => p), null, 2)) },
        { name: 'README.txt', data: enc.encode(manifest.readme) },
      ];
      let n = 0;
      for (const p of manifest.photos) {
        n++;
        say(`Downloading photo ${n} of ${manifest.photos.length}…`);
        const res = await fetch(p.url, { credentials: 'same-origin' });
        if (res.ok) files.push({ name: `photos/${p.file}`, data: new Uint8Array(await res.arrayBuffer()) });
      }
      say('Making the zip…');
      const blob = zip(files);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = manifest.filename;
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 60000);
      const size = blob.size < 1024 * 1024 ? `${Math.max(1, Math.round(blob.size / 1024))} KB` : `${Math.round(blob.size / 1024 / 1024 * 10) / 10} MB`;
      say(`Done: ${manifest.filename} (${size}). Check your downloads.`);
    } catch {
      say("The copy couldn't be made. Check your connection and try again; on a phone, a computer may work better for a large site.");
    } finally {
      button.disabled = false;
    }
  });
})();

// An ASSETS-shaped stand-in: serves files from public/, as Workers static assets do.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../public', import.meta.url));
const TYPES = { css: 'text/css', js: 'text/javascript', woff2: 'font/woff2', txt: 'text/plain' };

export function makeAssets() {
  return {
    async fetch(request) {
      const path = decodeURIComponent(new URL(request.url).pathname);
      if (path.includes('..')) return new Response('Not found', { status: 404 });
      try {
        const body = await readFile(root + path);
        return new Response(body, { headers: { 'content-type': TYPES[path.split('.').pop()] ?? 'application/octet-stream' } });
      } catch {
        return new Response('Not found', { status: 404 });
      }
    },
  };
}

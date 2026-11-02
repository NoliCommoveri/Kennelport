// QR codes (plan 5.4): for the site and its pages, for printed puppy packets and
// show tables. Drawn as SVG by the vendored encoder (lib/vendor/qrcode.js).
import qrcode from './lib/vendor/qrcode.js';

// → an SVG document for `text`, black on white, with a quiet zone, any size.
export function qrSvg(text) {
  const q = qrcode(0, 'M');
  q.addData(String(text));
  q.make();
  const n = q.getModuleCount();
  const m = 4;
  let path = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) path += `M${x + m} ${y + m}h1v1h-1z`;
  const size = n + m * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size * 8}" height="${size * 8}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
}

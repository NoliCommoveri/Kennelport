// The smallest byte strings the photo checks accept as WebP and JPEG headers, and
// variants carrying camera data. Not real images: the server reads headers only.
const le32 = (n) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >> 24) & 255];
const le24 = (n) => [n & 255, (n >> 8) & 255, (n >> 16) & 255];
const ascii = (s) => [...s].map((c) => c.charCodeAt(0));

export function webp(width = 800, height = 600, { exif = false } = {}) {
  const vp8x = [...ascii('VP8X'), ...le32(10), exif ? 0x08 : 0, 0, 0, 0, ...le24(width - 1), ...le24(height - 1)];
  const extra = exif ? [...ascii('EXIF'), ...le32(4), 1, 2, 3, 4] : [];
  const body = [...ascii('WEBP'), ...vp8x, ...extra];
  return new Uint8Array([...ascii('RIFF'), ...le32(body.length), ...body]);
}

export function jpeg(width = 800, height = 600, { exif = false } = {}) {
  const app1 = exif ? [0xff, 0xe1, 0, 8, ...ascii('Exif'), 0, 0] : [];
  const sof = [0xff, 0xc0, 0, 11, 8, height >> 8, height & 255, width >> 8, width & 255, 1, 1, 0x11, 0];
  return new Uint8Array([0xff, 0xd8, ...app1, ...sof, 0xff, 0xda, 0, 2, 0xff, 0xd9]);
}

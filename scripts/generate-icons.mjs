// Generates PWA install icons with zero dependencies (pure-Node PNG writer).
// Design: the house seal — gold ring, blood-red core, noir black field.
// Re-run with `npm run icons` if the brand ever changes.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(dirname(fileURLToPath(import.meta.url))), 'public');

const CRC = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([length, typeBuf, data, crc]);
}

function encodePng(width, height, rgb) {
  const stride = 1 + width * 3;
  const raw = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0; // filter: none
    rgb.copy(raw, y * stride + 1, y * width * 3, (y + 1) * width * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit
  ihdr[9] = 2; // truecolor
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const BG = [0x0b, 0x0b, 0x10];
const GOLD = [0xc9, 0xa2, 0x27];
const RED = [0xe5, 0x48, 0x4d];

function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function blend(bg, fg, alpha) {
  return [0, 1, 2].map((i) => Math.round(bg[i] * (1 - alpha) + fg[i] * alpha));
}

function drawSeal(size, pad) {
  const rgb = Buffer.alloc(size * size * 3);
  const c = size / 2;
  const ringR = size / 2 - pad * size;
  const ringW = Math.max(2, size * 0.022);
  const dotR = ringR * 0.36;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
      const ringA = 1 - smoothstep(ringW * 0.5, ringW * 0.5 + 1.4, Math.abs(d - ringR));
      const dotA = 1 - smoothstep(dotR - 1.4, dotR, d);
      let px = BG;
      if (ringA > 0) px = blend(px, GOLD, ringA);
      if (dotA > 0) px = blend(px, RED, dotA);
      const o = (y * size + x) * 3;
      rgb[o] = px[0];
      rgb[o + 1] = px[1];
      rgb[o + 2] = px[2];
    }
  }
  return rgb;
}

const jobs = [
  { file: 'icon-192.png', size: 192, pad: 0.04 },
  { file: 'icon-512.png', size: 512, pad: 0.04 },
  // Maskable icons get cropped to a safe zone — extra padding keeps the seal intact.
  { file: 'icon-maskable-512.png', size: 512, pad: 0.14 },
  { file: 'apple-touch-icon.png', size: 180, pad: 0.04 },
];

for (const { file, size, pad } of jobs) {
  writeFileSync(join(OUT, file), encodePng(size, size, drawSeal(size, pad)));
  console.log(`wrote public/${file} (${size}x${size})`);
}

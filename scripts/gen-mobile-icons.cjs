/**
 * Generates Cutepad launcher icons + splash screens for the Capacitor
 * Android and iOS projects from the procedural kawaii blob in
 * apps/desktop/src/icon.ts (compiled). No binary assets, no image deps.
 *
 * Usage: node scripts/gen-mobile-icons.cjs
 */
const { inflateSync, deflateSync } = require('node:zlib');
const fs = require('node:fs');
const path = require('node:path');
const { makeKawaiiPng } = require('../apps/desktop/dist/icon.js');

const ROOT = path.join(__dirname, '..');
const RES = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');
const IOS = path.join(ROOT, 'ios', 'App', 'App', 'Assets.xcassets');
const PINK = [255, 211, 229];

function decodeKawaii(size) {
  const buf = makeKawaiiPng(size);
  let off = 8;
  const idat = [];
  let w = 0;
  let h = 0;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    off += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const rgba = Buffer.alloc(w * h * 4);
  const stride = 1 + w * 4;
  for (let y = 0; y < h; y++) {
    if (raw[y * stride] !== 0) throw new Error('expected PNG filter 0');
    raw.copy(rgba, y * w * 4, y * stride + 1, y * stride + 1 + w * 4);
  }
  return { w, h, rgba };
}

function pngDims(file) {
  const buf = fs.readFileSync(file);
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function encodePng(w, h, rgba, { opaque = false, bg = PINK } = {}) {
  const bpp = opaque ? 3 : 4;
  const rows = Buffer.alloc(h * (1 + w * bpp));
  for (let y = 0; y < h; y++) {
    const rowOff = y * (1 + w * bpp);
    rows[rowOff] = 0;
    for (let x = 0; x < w; x++) {
      const s = (y * w + x) * 4;
      const d = rowOff + 1 + x * bpp;
      if (opaque) {
        const a = rgba[s + 3] / 255;
        rows[d] = Math.round(rgba[s] * a + bg[0] * (1 - a));
        rows[d + 1] = Math.round(rgba[s + 1] * a + bg[1] * (1 - a));
        rows[d + 2] = Math.round(rgba[s + 2] * a + bg[2] * (1 - a));
      } else {
        rows[d] = rgba[s];
        rows[d + 1] = rgba[s + 1];
        rows[d + 2] = rgba[s + 2];
        rows[d + 3] = rgba[s + 3];
      }
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = opaque ? 2 : 6;
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body), 0);
    return Buffer.concat([len, body, crc]);
  };
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Solid pink canvas with the kawaii blob (rendered at native size) centered. */
function squareIcon(size) {
  const art = decodeKawaii(size);
  const rgba = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    rgba[i * 4] = PINK[0];
    rgba[i * 4 + 1] = PINK[1];
    rgba[i * 4 + 2] = PINK[2];
    rgba[i * 4 + 3] = 255;
  }
  // art and canvas are the same size — alpha-composite directly
  for (let i = 0; i < size * size; i++) {
    const a = art.rgba[i * 4 + 3] / 255;
    if (a === 0) continue;
    rgba[i * 4] = Math.round(art.rgba[i * 4] * a + rgba[i * 4] * (1 - a));
    rgba[i * 4 + 1] = Math.round(art.rgba[i * 4 + 1] * a + rgba[i * 4 + 1] * (1 - a));
    rgba[i * 4 + 2] = Math.round(art.rgba[i * 4 + 2] * a + rgba[i * 4 + 2] * (1 - a));
  }
  return rgba;
}

/** Transparent canvas with the blob scaled to ~75% (adaptive-icon safe zone). */
function adaptiveForeground(size) {
  const artSize = Math.round(size * 0.75);
  const art = decodeKawaii(artSize);
  const rgba = Buffer.alloc(size * size * 4);
  const dx = Math.floor((size - artSize) / 2);
  const dy = Math.floor((size - artSize) / 2);
  for (let y = 0; y < artSize; y++) {
    art.rgba.copy(rgba, ((y + dy) * size + dx) * 4, y * artSize * 4, (y + 1) * artSize * 4);
  }
  return rgba;
}

/** Pink splash canvas with a centered blob at `frac` of the short side. */
function splash(w, h, frac) {
  const artSize = Math.min(Math.max(32, Math.round(Math.min(w, h) * frac)), w, h);
  const art = decodeKawaii(artSize);
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    rgba[i * 4] = PINK[0];
    rgba[i * 4 + 1] = PINK[1];
    rgba[i * 4 + 2] = PINK[2];
    rgba[i * 4 + 3] = 255;
  }
  const dx = Math.floor((w - artSize) / 2);
  const dy = Math.floor((h - artSize) / 2);
  for (let y = 0; y < artSize; y++) {
    for (let x = 0; x < artSize; x++) {
      const s = (y * artSize + x) * 4;
      const a = art.rgba[s + 3] / 255;
      if (a === 0) continue;
      const d = ((y + dy) * w + (x + dx)) * 4;
      rgba[d] = Math.round(art.rgba[s] * a + rgba[d] * (1 - a));
      rgba[d + 1] = Math.round(art.rgba[s + 1] * a + rgba[d + 1] * (1 - a));
      rgba[d + 2] = Math.round(art.rgba[s + 2] * a + rgba[d + 2] * (1 - a));
    }
  }
  return rgba;
}

function write(file, buf) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
  console.log(`wrote ${path.relative(ROOT, file)} (${buf.length} B)`);
}

// --- Android launcher icons ---
const densities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [dens, size] of Object.entries(densities)) {
  const dir = path.join(RES, `mipmap-${dens}`);
  const icon = encodePng(size, size, squareIcon(size));
  write(path.join(dir, 'ic_launcher.png'), icon);
  write(path.join(dir, 'ic_launcher_round.png'), icon);
  const fg = adaptiveForeground(size * (108 / 48));
  write(path.join(dir, 'ic_launcher_foreground.png'), encodePng(Math.round(size * 2.25), Math.round(size * 2.25), fg));
}

// --- Android splash screens (same dimensions as the template files) ---
const splashFiles = [path.join(RES, 'drawable', 'splash.png')];
for (const orient of ['land', 'port']) {
  for (const dens of Object.keys(densities)) splashFiles.push(path.join(RES, `drawable-${orient}-${dens}`, 'splash.png'));
}
for (const file of splashFiles) {
  if (!fs.existsSync(file)) continue;
  const { w, h } = pngDims(file);
  write(file, encodePng(w, h, splash(w, h, 0.34), { opaque: true }));
}

// --- iOS app icon (opaque, no alpha channel — App Store requirement) ---
write(path.join(IOS, 'AppIcon.appiconset', 'AppIcon-512@2x.png'), encodePng(1024, 1024, squareIcon(1024), { opaque: true }));

// --- iOS launch images (all three scale slots ship the same 2732px art) ---
for (const name of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
  write(path.join(IOS, 'Splash.imageset', name), encodePng(2732, 2732, splash(2732, 2732, 0.22), { opaque: true }));
}

console.log('done');

import { deflateSync } from 'node:zlib';

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const BODY: [number, number, number] = [255, 211, 229];
const OUTLINE: [number, number, number] = [74, 58, 82];
const EYE: [number, number, number] = [61, 44, 61];
const BLUSH: [number, number, number] = [255, 157, 191];

function blend(
  base: [number, number, number, number],
  over: [number, number, number],
  alpha: number,
): [number, number, number, number] {
  return [
    Math.round(base[0] * (1 - alpha) + over[0] * alpha),
    Math.round(base[1] * (1 - alpha) + over[1] * alpha),
    Math.round(base[2] * (1 - alpha) + over[2] * alpha),
    Math.min(255, Math.round(base[3] + alpha * 255)),
  ];
}

function inCircle(x: number, y: number, cx: number, cy: number, r: number): boolean {
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function inRoundRect(x: number, y: number, w: number, h: number, r: number): boolean {
  if (x < 0 || y < 0 || x > w || y > h) return false;
  const dx = Math.max(r - x, x - (w - r), 0);
  const dy = Math.max(r - y, y - (h - r), 0);
  return dx * dx + dy * dy <= r * r;
}

/**
 * Discord / store logo: the kawaii face on a rounded pink tile (matches the favicon).
 * Square, any size ≥ 512 — generate with:
 *   node -e "require('fs').writeFileSync('docs/discord-asset.png', require('./apps/desktop/dist/icon.js').makeKawaiiLogoPng(1024))"
 */
export function makeKawaiiLogoPng(size = 1024): Buffer {
  const rows: Buffer[] = [];
  const cx = size / 2;
  const cy = size / 2 + size * 0.04;
  const corner = size * 0.22;
  const pink: [number, number, number] = [255, 183, 213];
  const mouthThickness = Math.max(1.2, size * 0.014);

  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0;
    for (let x = 0; x < size; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      let color: [number, number, number, number] = [0, 0, 0, 0];
      if (inRoundRect(px, py, size, size, corner)) {
        color = [...pink, 255];
        const eyeR = size * 0.075;
        if (inCircle(px, py, cx - size * 0.16, cy - size * 0.05, eyeR)) color = [...EYE, 255];
        if (inCircle(px, py, cx + size * 0.16, cy - size * 0.05, eyeR)) color = [...EYE, 255];
        if (inCircle(px, py, cx - size * 0.27, cy + size * 0.13, size * 0.075)) color = blend(color, BLUSH, 0.75);
        if (inCircle(px, py, cx + size * 0.27, cy + size * 0.13, size * 0.075)) color = blend(color, BLUSH, 0.75);
        const mouthY = cy + size * 0.13;
        const mouth =
          Math.abs(px - cx) < size * 0.11 &&
          Math.abs(py - (mouthY - Math.abs(px - cx) * 0.55)) < mouthThickness;
        if (mouth) color = [...EYE, 255];
      }
      const offset = 1 + x * 4;
      row[offset] = color[0];
      row[offset + 1] = color[1];
      row[offset + 2] = color[2];
      row[offset + 3] = color[3];
    }
    rows.push(row);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Renders a tiny kawaii blob PNG for the tray icon — no binary assets required. */
export function makeKawaiiPng(size = 32): Buffer {
  const rows: Buffer[] = [];
  const cx = size / 2;
  const cy = size / 2 + size * 0.04;
  const bodyR = size * 0.44;

  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0;
    for (let x = 0; x < size; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const dist = Math.hypot(px - cx, py - cy);
      let color: [number, number, number, number] = [0, 0, 0, 0];
      if (dist <= bodyR) {
        color = dist >= bodyR - Math.max(1.4, size * 0.06) ? [...OUTLINE, 255] : [...BODY, 255];
        const eyeR = size * 0.075;
        if (inCircle(px, py, cx - size * 0.16, cy - size * 0.05, eyeR)) color = [...EYE, 255];
        if (inCircle(px, py, cx + size * 0.16, cy - size * 0.05, eyeR)) color = [...EYE, 255];
        if (inCircle(px, py, cx - size * 0.27, cy + size * 0.13, size * 0.075)) color = blend(color, BLUSH, 0.75);
        if (inCircle(px, py, cx + size * 0.27, cy + size * 0.13, size * 0.075)) color = blend(color, BLUSH, 0.75);
        const mouthY = cy + size * 0.13;
        const mouth = Math.abs(px - cx) < size * 0.11 && Math.abs(py - (mouthY - Math.abs(px - cx) * 0.55)) < 1.2;
        if (mouth) color = [...EYE, 255];
      }
      const offset = 1 + x * 4;
      row[offset] = color[0];
      row[offset + 1] = color[1];
      row[offset + 2] = color[2];
      row[offset + 3] = color[3];
    }
    rows.push(row);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

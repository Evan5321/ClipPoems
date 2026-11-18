// 生成 PWA 图标（无第三方依赖，使用 Node 内置 zlib 手写 PNG）
// 运行：node scripts/generate-icons.mjs
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, draw) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = draw(x, y);
      const i = y * (width * 4 + 1) + 1 + x * 4;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const hex = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
  255,
];

const PAPER = hex('#f5f0e8');
const INK = hex('#3b322b');
const CARD = hex('#fffdf7');
const SEAL = hex('#b03a2e');

function makeIcon(size) {
  // 纸片卡片区域（maskable 版本收小到安全区）
  const pad = size * 0.18;
  const card = { x: pad, y: pad * 1.1, w: size - pad * 2, h: size - pad * 2.1 };
  const lineCount = 4;
  return (x, y) => {
    // 背景
    let color = PAPER;
    // 卡片（带 1px 柔和边）
    if (x >= card.x && x <= card.x + card.w && y >= card.y && y <= card.y + card.h) {
      color = CARD;
      const edge =
        x < card.x + 2 || x > card.x + card.w - 2 || y < card.y + 2 || y > card.y + card.h - 2;
      if (edge) color = hex('#e0d6c4');
    }
    // 文字横线
    const lineGap = card.h / (lineCount + 2);
    for (let i = 1; i <= lineCount; i++) {
      const ly = card.y + lineGap * i;
      const lx = card.x + card.w * 0.18;
      const lw = card.w * (0.64 - (i === lineCount ? 0.2 : 0));
      if (Math.abs(y - ly) <= size * 0.012 && x >= lx && x <= lx + lw) color = INK;
    }
    // 红色印章
    const sx = card.x + card.w * 0.68;
    const sy = card.y + card.h * 0.78;
    const sr = size * 0.065;
    if ((x - sx) ** 2 + (y - sy) ** 2 <= sr * sr) color = SEAL;
    return color;
  };
}

const targets = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['maskable-512.png', 512],
];

for (const [name, size] of targets) {
  writeFileSync(join(outDir, name), encodePng(size, size, makeIcon(size)));
  console.log(`generated ${name}`);
}

// Tauri 桌面端图标（PNG + 单尺寸 ICO）
const tauriIcons = join(root, 'tauri', 'icons');
mkdirSync(tauriIcons, { recursive: true });
const icon256 = encodePng(256, 256, makeIcon(256));
writeFileSync(join(tauriIcons, 'icon.png'), icon256);
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(1, 4);
const entry = Buffer.alloc(16);
entry[0] = 0; // 256
entry[1] = 0; // 256
entry[2] = 0;
entry[3] = 0;
entry.writeUInt16LE(1, 4);
entry.writeUInt16LE(32, 6);
entry.writeUInt32LE(icon256.length, 8);
entry.writeUInt32LE(22, 12);
writeFileSync(join(tauriIcons, 'icon.ico'), Buffer.concat([icoHeader, entry, icon256]));
console.log('generated tauri icons');

// 同时输出 SVG 版本（favicon）
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#f5f0e8"/>
  <rect x="92" y="100" width="328" height="312" rx="10" fill="#fffdf7" stroke="#e0d6c4" stroke-width="6"/>
  ${[0, 1, 2, 3]
    .map((i) => {
      const y = 100 + (312 / 6) * (i + 1);
      const w = i === 3 ? 0.44 : 0.64;
      return `<rect x="${92 + 328 * 0.18}" y="${y - 6}" width="${328 * w}" height="12" rx="6" fill="#3b322b"/>`;
    })
    .join('\n  ')}
  <circle cx="${92 + 328 * 0.68}" cy="${100 + 312 * 0.78}" r="33" fill="#b03a2e"/>
</svg>`;
writeFileSync(join(outDir, 'icon.svg'), svg);
console.log('generated icon.svg');

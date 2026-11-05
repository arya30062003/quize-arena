import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple CRC32 table
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c;
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const body = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(body);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lenBuf, body, crcBuf]);
}

function generatePNG(width, height) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk: width (4), height (4), depth: 8 (1), color: 6 (RGBA) (1), comp: 0, filter: 0, interlace: 0
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bit depth
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = createChunk('IHDR', ihdrData);

  // Raw image scanlines
  // Indigo / Purple gradient with gold trophy center
  const rawData = Buffer.alloc(height * (width * 4 + 1));
  let offset = 0;

  const cx = width / 2;
  const cy = height / 2;
  const maxR = Math.min(width, height) * 0.45;

  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter byte: None

    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Gradient background: from indigo (#4f46e5) to pink (#ec4899)
      const gradRatio = (x + y) / (width + height);
      let r = Math.round(79 + (236 - 79) * gradRatio);
      let g = Math.round(70 + (72 - 70) * gradRatio);
      let b = Math.round(229 + (153 - 229) * gradRatio);
      let a = 255;

      // Rounded app icon border
      const cornerR = width * 0.22;
      const inCornerX = Math.abs(x - cx) - (cx - cornerR);
      const inCornerY = Math.abs(y - cy) - (cy - cornerR);
      if (inCornerX > 0 && inCornerY > 0) {
        if (Math.sqrt(inCornerX * inCornerX + inCornerY * inCornerY) > cornerR) {
          a = 0;
        }
      }

      // Golden Trophy in center
      if (a > 0 && dist < maxR * 0.65) {
        // Cup shape
        const ny = (y - (cy - maxR * 0.15)) / (maxR * 0.7);
        const nx = Math.abs(x - cx) / (maxR * 0.5);

        if (ny > 0 && ny < 0.6 && nx < 0.55 - ny * 0.25) {
          // Trophy Cup
          r = 251; g = 191; b = 36;
        } else if (ny >= 0.6 && ny < 0.75 && nx < 0.12) {
          // Trophy Stem
          r = 245; g = 158; b = 11;
        } else if (ny >= 0.75 && ny < 0.9 && nx < 0.45) {
          // Trophy Base
          r = 251; g = 191; b = 36;
        } else if (ny > 0.05 && ny < 0.45 && nx > 0.35 && nx < 0.65) {
          // Handles
          r = 253; g = 224; b = 71;
        }
      }

      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idat = createChunk('IDAT', compressedData);
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

const iconsDir = path.resolve(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), generatePNG(192, 192));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), generatePNG(512, 512));
fs.writeFileSync(path.join(iconsDir, 'icon-512-maskable.png'), generatePNG(512, 512));

console.log('Successfully generated PWA icons!');

/**
 * Generates PWA screenshots required for "Richer Install UI" in Chrome.
 *   • screenshot-mobile.png  390×844  (portrait, no form_factor)
 *   • screenshot-desktop.png 1280×720 (landscape, form_factor: "wide")
 *
 * Uses only Node.js built-ins (zlib + fs) — no external dependencies.
 * Run: node scripts/generate-screenshots.cjs
 */
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── Minimal PNG encoder (supports arbitrary width × height) ───────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const lenBuf    = Buffer.allocUnsafe(4);
  const crcBuf    = Buffer.allocUnsafe(4);
  lenBuf.writeUInt32BE(data.length);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
}

/**
 * @param {number} w
 * @param {number} h
 * @param {(x: number, y: number) => [number, number, number]} getPixel
 */
function makePNG(w, h, getPixel) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.writeUInt8(8, 8); // 8 bits per channel
  ihdr.writeUInt8(2, 9); // color type: RGB

  const rowBytes = 1 + w * 3;
  const raw = Buffer.alloc(h * rowBytes);

  for (let y = 0; y < h; y++) {
    raw[y * rowBytes] = 0; // filter: None
    for (let x = 0; x < w; x++) {
      const [r, g, b] = getPixel(x, y);
      const off = y * rowBytes + 1 + x * 3;
      raw[off] = r; raw[off + 1] = g; raw[off + 2] = b;
    }
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Drawing helpers ───────────────────────────────────────────────────────

function inEllipse(px, py, cx, cy, a, b, angle) {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const dx = px - cx, dy = py - cy;
  const u = (dx * cos + dy * sin) / a;
  const v = (dy * cos - dx * sin) / b;
  return u * u + v * v <= 1;
}

const GLYPHS = {
  U: [[1,0,1],[1,0,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1],[0,1,0]],
  N: [[1,0,1],[1,1,1],[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,0,1]],
  O: [[0,1,0],[1,0,1],[1,0,1],[1,0,1],[1,0,1],[1,0,1],[0,1,0]],
};

function inUnoText(px, py, ox, oy, s, gap) {
  const letters = ['U', 'N', 'O'];
  for (let li = 0; li < 3; li++) {
    const glyph = GLYPHS[letters[li]];
    const lx = ox + li * (3 * s + gap);
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 3; col++) {
        if (!glyph[row][col]) continue;
        if (px >= lx + col * s && px < lx + col * s + s &&
            py >= oy + row * s && py < oy + row * s + s) return true;
      }
    }
  }
  return false;
}

// ── UNO logo renderer (centered in a w×h canvas) ─────────────────────────

function drawLogo(px, py, cx, cy, r) {
  // r = reference radius (half the logo height)
  const NAVY  = [15,  26,  42 ];
  const RED   = [220, 38,  38 ];
  const WHITE = [255, 255, 255];
  const angle = -0.35;

  if (!inEllipse(px, py, cx, cy, r * 0.85, r, 0)) return null; // outside logo area
  if (!inEllipse(px, py, cx, cy, r * 0.80, r * 0.95, angle)) return NAVY;
  if (!inEllipse(px, py, cx, cy, r * 0.57, r * 0.67, angle)) return RED;

  const scale = Math.max(1, Math.round(r / 32));
  const gap   = Math.max(1, Math.round(scale * 1.5));
  const textW = 3 * 3 * scale + 2 * gap;
  const textH = 7 * scale;
  const tx = Math.round(cx - textW / 2);
  const ty = Math.round(cy - textH / 2);
  if (inUnoText(px, py, tx, ty, scale, gap)) return RED;

  return WHITE;
}

// ── Screenshot pixel functions ────────────────────────────────────────────

const BG   = [15, 26, 42];   // --color-surface: #0f172a
const GRID = [20, 34, 58];   // subtle grid line color

function screenshotPixel(px, py, w, h) {
  // Subtle grid pattern
  const isGrid = (px % 40 === 0) || (py % 40 === 0);
  const base   = isGrid ? GRID : BG;

  // Logo centered slightly above middle
  const cx = w / 2;
  const cy = h * 0.42;
  const r  = Math.min(w, h) * 0.22;
  const logo = drawLogo(px, py, cx, cy, r);
  if (logo) return logo;

  return base;
}

// ── Generate screenshots ──────────────────────────────────────────────────

const outDir = path.join(__dirname, '..', 'public', 'screenshots');
fs.mkdirSync(outDir, { recursive: true });

const sizes = [
  { name: 'screenshot-mobile.png',  w: 390,  h: 844  },
  { name: 'screenshot-desktop.png', w: 1280, h: 720  },
];

for (const { name, w, h } of sizes) {
  const buf  = makePNG(w, h, (x, y) => screenshotPixel(x, y, w, h));
  const file = path.join(outDir, name);
  fs.writeFileSync(file, buf);
  console.log(`✓ ${name}  (${w}×${h}, ${(buf.length / 1024).toFixed(1)} KB)`);
}

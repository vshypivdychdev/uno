/**
 * Generates UNO app icons as PNG files using only Node.js built-in modules.
 * No external dependencies required.
 *
 * Run: node scripts/generate-icons.cjs
 */
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── PNG encoder ───────────────────────────────────────────────────────────

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
 * Encodes a square PNG from a pixel function.
 * @param {number} size - Width and height in pixels.
 * @param {(x: number, y: number, size: number) => [number, number, number]} getPixel
 */
function makePNG(size, getPixel) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.writeUInt8(8, 8); // 8 bits per channel
  ihdr.writeUInt8(2, 9); // color type: RGB

  const rowBytes = 1 + size * 3; // filter byte + 3 bytes per pixel
  const raw = Buffer.alloc(size * rowBytes);

  for (let y = 0; y < size; y++) {
    raw[y * rowBytes] = 0; // filter type: None
    for (let x = 0; x < size; x++) {
      const [r, g, b] = getPixel(x, y, size);
      const off = y * rowBytes + 1 + x * 3;
      raw[off] = r; raw[off + 1] = g; raw[off + 2] = b;
    }
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Drawing helpers ───────────────────────────────────────────────────────

/** SDF-based rounded square test. */
function inRoundedSquare(px, py, size, r) {
  const dx = Math.max(r - px, 0, px - (size - 1 - r));
  const dy = Math.max(r - py, 0, py - (size - 1 - r));
  return dx * dx + dy * dy <= r * r;
}

/** Rotated ellipse containment test. */
function inEllipse(px, py, cx, cy, a, b, angle) {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const dx = px - cx, dy = py - cy;
  const u = (dx * cos + dy * sin) / a;
  const v = (dy * cos - dx * sin) / b;
  return u * u + v * v <= 1;
}

// ── UNO icon design ───────────────────────────────────────────────────────
//
// Layout (same proportions as the SVG icon):
//   • Dark navy rounded background  #0f172a
//   • Red tilted oval               #dc2626
//   • White inner oval              #ffffff
//   • Red "UNO" letters drawn with pixel rectangles

/** Draws a filled rectangle — returns true if (px, py) is inside. */
function inRect(px, py, x, y, w, h) {
  return px >= x && px < x + w && py >= y && py < y + h;
}

/**
 * Simple bitmap font for "UNO" — each letter is a 5×7 pixel grid.
 * 1 = filled, 0 = empty.
 */
const GLYPHS = {
  U: [
    [1,0,1],
    [1,0,1],
    [1,0,1],
    [1,0,1],
    [1,0,1],
    [1,1,1],
    [0,1,0],
  ],
  N: [
    [1,0,1],
    [1,1,1],
    [1,1,1],
    [1,0,1],
    [1,0,1],
    [1,0,1],
    [1,0,1],
  ],
  O: [
    [0,1,0],
    [1,0,1],
    [1,0,1],
    [1,0,1],
    [1,0,1],
    [1,0,1],
    [0,1,0],
  ],
};

/**
 * Returns true if pixel (px, py) falls on a glyph pixel for "UNO",
 * rendered at scale `s` with top-left at (ox, oy), with `gap` pixel spacing.
 */
function inUnoText(px, py, ox, oy, s, gap) {
  const letters = ['U', 'N', 'O'];
  const glyphW = 3, glyphH = 7;

  for (let li = 0; li < letters.length; li++) {
    const glyph = GLYPHS[letters[li]];
    const lx = ox + li * (glyphW * s + gap);

    for (let row = 0; row < glyphH; row++) {
      for (let col = 0; col < glyphW; col++) {
        if (!glyph[row][col]) continue;
        const bx = lx + col * s;
        const by = oy + row * s;
        if (px >= bx && px < bx + s && py >= by && py < by + s) return true;
      }
    }
  }
  return false;
}

// ── Pixel function ────────────────────────────────────────────────────────

function unoPixel(px, py, size) {
  const cx = size / 2, cy = size / 2;
  const angle = -0.35; // ~20° tilt, matching the SVG

  const NAVY  = [15,  26,  42 ];
  const RED   = [220, 38,  38 ];
  const WHITE = [255, 255, 255];

  // Rounded square background (corner radius = 15% of size)
  if (!inRoundedSquare(px, py, size, size * 0.15)) return NAVY;

  // Red outer oval
  const inRed = inEllipse(px, py, cx, cy, size * 0.40, size * 0.47, angle);
  if (!inRed) return NAVY;

  // White inner oval
  const inWhite = inEllipse(px, py, cx, cy, size * 0.27, size * 0.32, angle);
  if (!inWhite) return RED;

  // "UNO" text inside the white oval — pixel font, centered
  const scale    = Math.max(1, Math.floor(size / 64));
  const gap      = Math.max(1, Math.floor(scale * 1.5));
  const textW    = 3 * 3 * scale + 2 * gap; // 3 letters × 3cols + 2 gaps
  const textH    = 7 * scale;
  const textX    = Math.round(cx - textW / 2);
  const textY    = Math.round(cy - textH / 2);

  if (inUnoText(px, py, textX, textY, scale, gap)) return RED;

  return WHITE;
}

// ── Generate files ────────────────────────────────────────────────────────

const outDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

for (const size of [192, 512]) {
  const buf  = makePNG(size, unoPixel);
  const file = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(file, buf);
  console.log(`✓ icon-${size}.png  (${(buf.length / 1024).toFixed(1)} KB)`);
}

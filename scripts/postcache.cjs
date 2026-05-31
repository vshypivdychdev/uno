/**
 * Post-build script: scans the dist/ folder and injects a complete
 * precache manifest into dist/sw.js, plus a unique build timestamp so
 * every deploy gets its own cache name (preventing stale-cache collisions).
 *
 * When BASE_URL env var is set (e.g. /uno/), all precache URLs are prefixed
 * with that path and dist/manifest.json paths are patched to match.
 *
 * Run automatically via: npm run build
 */

const fs   = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist');
const SW_PATH  = path.join(DIST_DIR, 'sw.js');

// Base URL for this deployment (e.g. '/uno/' on GitHub Pages, '/' locally).
const BASE_URL = process.env.BASE_URL ?? '/';
// Prefix to prepend to each URL path, e.g. '' or '/uno'
const URL_PREFIX = BASE_URL === '/' ? '' : BASE_URL.slice(0, -1);

/** Recursively collect all file paths under `dir` as URL strings (e.g. /assets/index-abc.js). */
function collectUrls(dir, base = '') {
  const urls = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const urlPath = `${base}/${entry.name}`;
    if (entry.isDirectory()) {
      urls.push(...collectUrls(path.join(dir, entry.name), urlPath));
    } else {
      urls.push(urlPath);
    }
  }
  return urls;
}

const allUrls = collectUrls(DIST_DIR);

const precacheUrls = allUrls
  .filter((url) => {
    if (url === '/sw.js') return false;
    if (url.endsWith('.map')) return false;
    return true;
  })
  .map((url) => `${URL_PREFIX}${url}`);

// Unique build timestamp — used as the cache version so every deploy
// gets its own cache name and old service workers are evicted cleanly.
const buildTs = Date.now().toString(36);

// ── Patch dist/sw.js ─────────────────────────────────────────────────────────

let sw = fs.readFileSync(SW_PATH, 'utf8');

sw = sw.replace(
  /const CACHE_VERSION = 'BUILD_TS';/,
  `const CACHE_VERSION = '${buildTs}';`,
);

sw = sw.replace(
  /const APP_BASE\s*=\s*'\/';/,
  `const APP_BASE      = '${BASE_URL}';`,
);

sw = sw.replace(
  /const PRECACHE_URLS = \[\];/,
  `const PRECACHE_URLS = ${JSON.stringify(precacheUrls, null, 2)};`,
);

if (!sw.includes(buildTs) || !sw.includes(precacheUrls[0] ?? `${BASE_URL}index.html`)) {
  console.error('postcache: placeholder replacement failed in dist/sw.js');
  process.exit(1);
}

fs.writeFileSync(SW_PATH, sw);

// ── Patch dist/manifest.json paths when base is not '/' ──────────────────────

if (URL_PREFIX) {
  const manifestPath = path.join(DIST_DIR, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  if (manifest.start_url) {
    manifest.start_url = URL_PREFIX + manifest.start_url;
  }
  if (manifest.icons) {
    manifest.icons = manifest.icons.map((icon) => ({
      ...icon,
      src: URL_PREFIX + icon.src,
    }));
  }
  if (manifest.screenshots) {
    manifest.screenshots = manifest.screenshots.map((ss) => ({
      ...ss,
      src: URL_PREFIX + ss.src,
    }));
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`✓ manifest.json paths prefixed with ${URL_PREFIX}`);
}

console.log(`✓ Cache version:      uno-${buildTs}`);
console.log(`✓ Precache manifest:  ${precacheUrls.length} URLs injected into dist/sw.js`);
precacheUrls.forEach((u) => console.log(`  ${u}`));

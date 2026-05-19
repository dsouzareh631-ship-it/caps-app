import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(__dirname, '../assets');

const SIZE   = 1024;
const CENTER = SIZE / 2;
const TEETH  = 21;

// Radii
const R_TOOTH_TIP    = 478;   // outer tip of each crimped tooth
const R_TOOTH_VALLEY = 432;   // valley between teeth
const R_FACE         = 412;   // smooth face circle
const LOGO_SIZE      = 460;   // logo bounding box (fits inside R_FACE)

// Build the 21-tooth crimped polygon
function crimpedPoints() {
  const pts = [];
  for (let i = 0; i < TEETH; i++) {
    const tip    = (2 * Math.PI * i       / TEETH) - Math.PI / 2;
    const valley = (2 * Math.PI * (i + 0.5) / TEETH) - Math.PI / 2;
    pts.push(`${(CENTER + R_TOOTH_TIP    * Math.cos(tip)).toFixed(1)},${(CENTER + R_TOOTH_TIP    * Math.sin(tip)).toFixed(1)}`);
    pts.push(`${(CENTER + R_TOOTH_VALLEY * Math.cos(valley)).toFixed(1)},${(CENTER + R_TOOTH_VALLEY * Math.sin(valley)).toFixed(1)}`);
  }
  return pts.join(' ');
}

const capSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
  <defs>
    <radialGradient id="faceGrad" cx="42%" cy="36%" r="70%">
      <stop offset="0%"   stop-color="#f0d070"/>
      <stop offset="45%"  stop-color="#c9a844"/>
      <stop offset="100%" stop-color="#9a7520"/>
    </radialGradient>
    <radialGradient id="rimGrad" cx="42%" cy="36%" r="70%">
      <stop offset="0%"   stop-color="#e8c855"/>
      <stop offset="100%" stop-color="#8a6415"/>
    </radialGradient>
    <filter id="drop" x="-8%" y="-8%" width="116%" height="116%">
      <feDropShadow dx="0" dy="6" stdDeviation="14" flood-color="#000000" flood-opacity="0.55"/>
    </filter>
    <clipPath id="faceClip">
      <circle cx="${CENTER}" cy="${CENTER}" r="${R_FACE}"/>
    </clipPath>
  </defs>

  <!-- Dark navy background -->
  <rect width="${SIZE}" height="${SIZE}" fill="#0a0f2e"/>

  <!-- Crimped rim shadow -->
  <polygon points="${crimpedPoints()}" fill="#7a5810" filter="url(#drop)" opacity="0.5"
           transform="translate(0,8)"/>

  <!-- Crimped rim (gold teeth) -->
  <polygon points="${crimpedPoints()}" fill="url(#rimGrad)"/>

  <!-- Cap face circle -->
  <circle cx="${CENTER}" cy="${CENTER}" r="${R_FACE}" fill="url(#faceGrad)"/>

  <!-- Inner rim bevel (dark ring) -->
  <circle cx="${CENTER}" cy="${CENTER}" r="${R_FACE}"
          fill="none" stroke="#7a5810" stroke-width="10" stroke-opacity="0.45"/>

  <!-- Sheen highlight (top-left gloss) -->
  <ellipse cx="${CENTER - 70}" cy="${CENTER - 90}" rx="200" ry="110"
           fill="white" fill-opacity="0.11" clip-path="url(#faceClip)"/>
</svg>`;

// ── Build logo layer ─────────────────────────────────────────────────────────
// Resize sticker to LOGO_SIZE. The sticker has a white background — we'll
// composite it with multiply blend so white becomes transparent on the gold face.
const logoBuffer = await sharp(join(assetsDir, 'teersticker.webp'))
  .resize(LOGO_SIZE, LOGO_SIZE, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
  .png()
  .toBuffer();

// ── Composite ────────────────────────────────────────────────────────────────
const offset = CENTER - LOGO_SIZE / 2;

const finalBuffer = await sharp(Buffer.from(capSvg))
  .png()
  .composite([{
    input: logoBuffer,
    left: Math.round(offset),
    top: Math.round(offset),
    blend: 'multiply',   // white in logo → transparent on gold face
  }])
  .png()
  .flatten({ background: { r: 10, g: 15, b: 46 } })  // fill any transparency
  .removeAlpha()                                       // Apple requires no alpha channel
  .toBuffer();

// ── Write all three asset files ───────────────────────────────────────────────
await sharp(finalBuffer).toFile(join(assetsDir, 'icon.png'));
await sharp(finalBuffer).toFile(join(assetsDir, 'splash-icon.png'));
await sharp(finalBuffer).toFile(join(assetsDir, 'adaptive-icon.png'));

const meta = await sharp(join(assetsDir, 'icon.png')).metadata();
console.log(`✓ icon.png  ${meta.width}×${meta.height}  ${meta.format}  hasAlpha=${meta.hasAlpha}`);
console.log('✓ splash-icon.png and adaptive-icon.png updated');

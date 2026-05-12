import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(__dirname, '../assets');

const SIZE = 1024;
const CENTER = SIZE / 2;
const OUTER_R = SIZE / 2 - 8;
const INNER_R = OUTER_R * 0.72;
const TOOTH_COUNT = 21;
const TOOTH_DEPTH = OUTER_R * 0.12;

// Build crimped polygon points
function buildCapPoints() {
  const pts = [];
  for (let i = 0; i < TOOTH_COUNT * 2; i++) {
    const angle = (i * Math.PI) / TOOTH_COUNT - Math.PI / 2;
    const r = i % 2 === 0 ? OUTER_R : OUTER_R - TOOTH_DEPTH;
    const x = CENTER + r * Math.cos(angle);
    const y = CENTER + r * Math.sin(angle);
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return pts.join(' ');
}

// Load and resize the Triniters logo to fit inside the inner disc
const logoSize = Math.floor(INNER_R * 1.5);
const logoPng = await sharp(join(assetsDir, 'teersticker.webp'))
  .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

// Build the SVG background (bottle cap shape)
const svgBg = `
<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${SIZE}" height="${SIZE}" fill="#0a0f2e"/>
  <polygon points="${buildCapPoints()}" fill="#c9a844"/>
  <circle cx="${CENTER}" cy="${CENTER}" r="${INNER_R}" fill="#0a0f2e"/>
  <circle cx="${CENTER - INNER_R * 0.25}" cy="${CENTER - INNER_R * 0.25}" r="${INNER_R * 0.15}" fill="#c9a844" opacity="0.2"/>
</svg>`;

const bgBuffer = await sharp(Buffer.from(svgBg)).png().toBuffer();

// Composite logo onto the background
const logoX = Math.floor(CENTER - logoSize / 2);
const logoY = Math.floor(CENTER - logoSize / 2);

await sharp(bgBuffer)
  .composite([{ input: logoPng, left: logoX, top: logoY }])
  .png()
  .toFile(join(assetsDir, 'icon.png'));

console.log('icon.png generated successfully');

/**
 * Generates public/images/og-card.jpg (1200x630) for social sharing.
 * Run: node scripts/generate-og-image.mjs
 */
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const photoPath = path.join(root, "src/assets/profile-photo.jpg");
const outPath = path.join(root, "public/images/og-card.jpg");

const W = 1200;
const H = 630;
const PHOTO = 280;

// Circular-cropped profile photo
const photo = await sharp(photoPath)
  .resize(PHOTO, PHOTO, { fit: "cover" })
  .composite([
    {
      input: Buffer.from(
        `<svg width="${PHOTO}" height="${PHOTO}"><circle cx="${PHOTO / 2}" cy="${PHOTO / 2}" r="${PHOTO / 2}" fill="#fff"/></svg>`
      ),
      blend: "dest-in",
    },
  ])
  .png()
  .toBuffer();

// Background + text
const bg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#232f3e"/>
      <stop offset="1" stop-color="#10171f"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ff9900"/>
      <stop offset="1" stop-color="#146eb4"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect x="80" y="396" width="120" height="6" rx="3" fill="url(#accent)"/>
  <text x="80" y="290" font-family="DejaVu Sans, Arial, sans-serif" font-size="56" font-weight="bold" fill="#ffffff">Christopher Corbin</text>
  <text x="80" y="356" font-family="DejaVu Sans, Arial, sans-serif" font-size="28" fill="#ff9900">AWS Solutions Architect &amp; Security Engineer</text>
  <text x="80" y="450" font-family="DejaVu Sans, Arial, sans-serif" font-size="22" fill="#b8c4ce">SOC 2 Compliance &#183; DevSecOps &#183; Public-Sector Cloud</text>
  <text x="80" y="560" font-family="DejaVu Sans, Arial, sans-serif" font-size="22" fill="#6b7a88">christophercorbin.cloud</text>
</svg>`;

await sharp(Buffer.from(bg))
  .composite([{ input: photo, left: W - PHOTO - 80, top: (H - PHOTO) / 2 - 30 }])
  .jpeg({ quality: 85 })
  .toFile(outPath);

console.log(`Wrote ${outPath}`);

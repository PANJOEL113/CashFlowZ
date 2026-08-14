const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, 'asset', 'logo', 'logo-only.svg');
const svgBuffer = fs.readFileSync(svgPath);

const configs = [
  { size: 32, name: 'favicon-32.png' },
  { size: 180, name: 'icon-180.png' },
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
];
const outputDir = path.join(__dirname, 'asset', 'logo');

async function generate() {
  const largePng = await sharp(svgBuffer, { density: 1200 })
    .resize(800, 800, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const trimmed = await sharp(largePng)
    .trim({ threshold: 10 })
    .png()
    .toBuffer();

  for (const cfg of configs) {
    const outPath = path.join(outputDir, cfg.name);
    await sharp(trimmed)
      .resize(cfg.size, cfg.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(outPath);
    console.log(`Generated: ${outPath} (${cfg.size}x${cfg.size})`);
  }
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});

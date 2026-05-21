/**
 * Corrige les icônes adaptatives Android :
 * 1. Scale up adaptive-icon.png ×1.75 (supprime le padding excessif)
 * 2. Supprime le fond blanc → transparent (le fond #0A0A0F vient du XML Android)
 * 3. Régénère ic_launcher_foreground.webp à toutes les densités
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const FOREGROUND_SIZES = {
  mdpi:    108,
  hdpi:    162,
  xhdpi:   216,
  xxhdpi:  324,
  xxxhdpi: 432,
};

const SCALE   = 1.75;
const SRC     = 'assets/adaptive-icon.png';
const SRC_SIZE = 1024;
const newSize  = Math.round(SRC_SIZE * SCALE);
const offset   = Math.round((newSize - SRC_SIZE) / 2);

async function scaleAndDewhiten(input) {
  const scaled = await sharp(input)
    .resize(newSize, newSize, { kernel: 'lanczos3' })
    .extract({ left: offset, top: offset, width: SRC_SIZE, height: SRC_SIZE })
    .ensureAlpha()
    .toBuffer();

  // Remplace le fond blanc (R>230, G>230, B>230) par transparent
  const { data, info } = await sharp(scaled)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Uint8Array(data);
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    if (r > 230 && g > 230 && b > 230) pixels[i + 3] = 0;
  }

  return await sharp(Buffer.from(pixels), {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png().toBuffer();
}

async function main() {
  if (!fs.existsSync(SRC)) {
    console.error(`❌ Introuvable : ${SRC}`);
    process.exit(1);
  }

  console.log(`⚙  Traitement de ${SRC} (scale ×${SCALE}, suppression fond blanc)…`);
  const processed = await scaleAndDewhiten(SRC);

  // Sauvegarde la source mise à jour
  fs.writeFileSync(SRC, processed);
  console.log(`✓ ${SRC} mis à jour`);

  // Régénère les foreground WebP pour chaque densité
  for (const [density, size] of Object.entries(FOREGROUND_SIZES)) {
    const dir  = `android/app/src/main/res/mipmap-${density}`;
    const dest = path.join(dir, 'ic_launcher_foreground.webp');
    if (!fs.existsSync(dir)) { console.warn(`⚠  Dossier absent : ${dir}`); continue; }

    await sharp(processed)
      .resize(size, size, { kernel: 'lanczos3' })
      .webp({ quality: 90 })
      .toFile(dest);
    console.log(`✓ ${dest} (${size}×${size})`);
  }

  console.log('\n✅ Icônes régénérées. Lance un build EAS pour voir le résultat.');
}

main().catch(e => { console.error(e); process.exit(1); });

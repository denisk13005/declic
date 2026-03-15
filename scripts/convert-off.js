#!/usr/bin/env node
/**
 * Convertit le CSV Open Food Facts (France) en JSON optimisé pour l'app.
 *
 * Source : https://fr.openfoodfacts.org/data/fr.openfoodfacts.org.products.csv
 * Usage  : node scripts/convert-off.js
 *
 * Le CSV OFF est en réalité un TSV (séparateur tabulation).
 * Lecture en streaming ligne par ligne pour éviter de charger 6+ GB en mémoire.
 *
 * Output : src/data/off-fr.json
 * Format : { name, brand?, code?, kcal, p?, c?, f? }[]
 *   - p = protéines/100g
 *   - c = glucides/100g
 *   - f = lipides/100g
 */

const fs      = require('fs');
const path    = require('path');
const zlib    = require('zlib');
const readline = require('readline');

const INPUT  = path.join(__dirname, 'fr.openfoodfacts.org.products.csv.gz');
const OUTPUT = path.join(__dirname, '..', 'src', 'data', 'off-fr.json');

const NON_LATIN = /[\u0600-\u06FF\u0400-\u04FF\u4E00-\u9FFF\u3040-\u30FF]/;

function parseNum(val) {
  if (!val || val === '' || val === 'unknown' || val === 'NaN') return null;
  const n = parseFloat(String(val).replace(',', '.'));
  return isNaN(n) ? null : n;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

async function main() {
  if (!fs.existsSync(INPUT)) {
    console.error(`Fichier introuvable : ${INPUT}`);
    process.exit(1);
  }

  const stat = fs.statSync(INPUT);
  console.log(`Fichier : ${(stat.size / 1024 / 1024 / 1024).toFixed(2)} GB`);

  // Détecte si le fichier est gzippé (magic bytes 1f 8b)
  const buf = Buffer.alloc(2);
  const fd = fs.openSync(INPUT, 'r');
  fs.readSync(fd, buf, 0, 2, 0);
  fs.closeSync(fd);
  const isGzip = buf[0] === 0x1f && buf[1] === 0x8b;
  console.log(`Format   : ${isGzip ? 'gzip compressé' : 'texte brut'}`);
  console.log('Lecture en streaming...\n');

  const fileStream = fs.createReadStream(INPUT);
  const input = isGzip
    ? fileStream.pipe(zlib.createGunzip())
    : fileStream;

  const rl = readline.createInterface({
    input,
    crlfDelay: Infinity,
  });

  let headers = null;
  let idx = {};
  const COLS = [
    'code',
    'product_name_fr',
    'product_name',
    'brands',
    'energy-kcal_100g',
    'energy_100g',        // kJ fallback
    'proteins_100g',
    'carbohydrates_100g',
    'fat_100g',
  ];

  const results = [];
  const seen = new Set(); // déduplique par "name|brand"
  let lineCount = 0;
  let kept = 0;
  let sep = '\t'; // OFF CSV = TSV

  for await (const line of rl) {
    lineCount++;

    // ── Ligne 1 : entête ──────────────────────────────────────────────────────
    if (lineCount === 1) {
      // Détecte le séparateur (tab ou virgule)
      sep = line.includes('\t') ? '\t' : ',';
      console.log(`Séparateur détecté : ${sep === '\t' ? 'TAB' : 'VIRGULE'}`);

      headers = line.split(sep);
      for (const col of COLS) {
        idx[col] = headers.indexOf(col);
      }

      const found   = COLS.filter(c => idx[c] >= 0);
      const missing = COLS.filter(c => idx[c] < 0);
      console.log('Colonnes trouvées   :', found.join(', '));
      if (missing.length) console.warn('Colonnes manquantes :', missing.join(', '));
      console.log('');
      continue;
    }

    if (lineCount % 200_000 === 0) {
      process.stdout.write(`\r  ${(lineCount / 1_000_000).toFixed(1)}M lignes lues — ${kept} gardées...`);
    }

    const fields = line.split(sep);

    // ── Nom ───────────────────────────────────────────────────────────────────
    const nameFr  = idx['product_name_fr']  >= 0 ? (fields[idx['product_name_fr']]  ?? '').trim() : '';
    const nameGen = idx['product_name']     >= 0 ? (fields[idx['product_name']]     ?? '').trim() : '';
    const name    = nameFr || nameGen;
    if (!name) continue;
    if (NON_LATIN.test(name)) continue;
    if (name.length < 2 || name.length > 120) continue;

    // ── Calories ──────────────────────────────────────────────────────────────
    let kcal = parseNum(fields[idx['energy-kcal_100g']]);
    if (kcal === null && idx['energy_100g'] >= 0) {
      const kj = parseNum(fields[idx['energy_100g']]);
      if (kj !== null) kcal = kj / 4.184;
    }
    if (kcal === null || kcal < 0 || kcal > 900) continue;
    kcal = Math.round(kcal);

    // ── Macros ────────────────────────────────────────────────────────────────
    const protein = idx['proteins_100g']       >= 0 ? parseNum(fields[idx['proteins_100g']])       : null;
    const carbs   = idx['carbohydrates_100g']  >= 0 ? parseNum(fields[idx['carbohydrates_100g']])  : null;
    const fat     = idx['fat_100g']            >= 0 ? parseNum(fields[idx['fat_100g']])            : null;

    // ── Marque ────────────────────────────────────────────────────────────────
    const rawBrand = idx['brands'] >= 0 ? (fields[idx['brands']] ?? '').split(',')[0].trim() : '';
    const brand    = rawBrand && !NON_LATIN.test(rawBrand) ? rawBrand : '';

    // ── Déduplication ─────────────────────────────────────────────────────────
    const key = `${name.toLowerCase()}|${brand.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // ── Entrée finale ─────────────────────────────────────────────────────────
    const entry = { name, kcal };
    if (brand)          entry.brand = brand;
    const barcode = idx['code'] >= 0 ? (fields[idx['code']] ?? '').trim() : '';
    if (barcode)        entry.code  = barcode;
    if (protein !== null) entry.p = round1(protein);
    if (carbs   !== null) entry.c = round1(carbs);
    if (fat     !== null) entry.f = round1(fat);

    results.push(entry);
    kept++;
  }

  console.log(`\n\nTotal lu     : ${lineCount.toLocaleString()} lignes`);
  console.log(`Produits gardés : ${kept.toLocaleString()}`);
  console.log(`\nÉcriture → ${OUTPUT} ...`);

  fs.writeFileSync(OUTPUT, JSON.stringify(results));

  const sizeMB = (fs.statSync(OUTPUT).size / 1024 / 1024).toFixed(1);
  console.log(`✅ Terminé — ${sizeMB} MB`);
}

main().catch(err => {
  console.error('\n❌ Erreur :', err.message);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Convertit les fichiers XML Ciqual 2025 en JSON optimisé pour l'app.
 * Usage : node scripts/convert-ciqual.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CIQUAL_DIR = path.join(ROOT, 'cliqual2025');
const OUT = path.join(ROOT, 'src', 'data', 'ciqual.json');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function decodeEntities(str) {
  return str
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>');
}

function extractField(block, field) {
  const re = new RegExp(`<${field}[^>]*>\\s*([^<]+?)\\s*<\\/${field}>`);
  const m = block.match(re);
  return m ? decodeEntities(m[1].trim()) : null;
}

function parseNum(s) {
  if (!s || s === '-' || s === '' || s === 'traces') return null;
  const n = parseFloat(s.replace(',', '.'));
  return isNaN(n) ? null : n;
}

// ─── 1. Parse noms des aliments ───────────────────────────────────────────────

console.log('Parsing alim_2025_11_03.xml…');
const alimXml = fs.readFileSync(path.join(CIQUAL_DIR, 'alim_2025_11_03.xml'), 'utf8');
const alimMap = new Map(); // alim_code (string) -> nom_fr

for (const block of alimXml.split('<ALIM>').slice(1)) {
  const code = extractField(block, 'alim_code');
  const name = extractField(block, 'alim_nom_fr');
  if (code && name) alimMap.set(code.trim(), name.trim());
}
console.log(`  → ${alimMap.size} aliments trouvés`);

// ─── 2. Parse compositions nutritionnelles ────────────────────────────────────

// Codes retenus
const KCAL     = '328';   // Énergie kcal/100g (Règlement UE 1169/2011)
const PROTEIN  = '25000'; // Protéines N x facteur Jones g/100g
const CARBS    = '31000'; // Glucides g/100g
const FAT      = '40000'; // Lipides g/100g
const WANTED   = new Set([KCAL, PROTEIN, CARBS, FAT]);

console.log('Parsing compo_2025_11_03.xml…');
const compoXml = fs.readFileSync(path.join(CIQUAL_DIR, 'compo_2025_11_03.xml'), 'utf8');
const compoMap = new Map(); // alim_code -> { kcal, protein, carbs, fat }

for (const block of compoXml.split('<COMPO>').slice(1)) {
  const alimCode  = extractField(block, 'alim_code')?.trim();
  const constCode = extractField(block, 'const_code')?.trim();
  const teneurStr = extractField(block, 'teneur');

  if (!alimCode || !constCode || !WANTED.has(constCode)) continue;

  const teneur = parseNum(teneurStr);
  if (teneur === null) continue;

  if (!compoMap.has(alimCode)) compoMap.set(alimCode, {});
  const entry = compoMap.get(alimCode);

  if (constCode === KCAL)    entry.kcal    = teneur;
  if (constCode === PROTEIN) entry.protein = teneur;
  if (constCode === CARBS)   entry.carbs   = teneur;
  if (constCode === FAT)     entry.fat     = teneur;
}
console.log(`  → ${compoMap.size} aliments avec données nutritionnelles`);

// ─── 3. Jointure et filtrage ──────────────────────────────────────────────────

const foods = [];

for (const [code, name] of alimMap) {
  const c = compoMap.get(code);
  if (!c || c.kcal == null) continue; // on exclut sans calories

  const hasMacros = c.protein != null && c.carbs != null && c.fat != null;

  foods.push({
    code: parseInt(code, 10),
    name,
    kcal: Math.round(c.kcal),
    protein: hasMacros ? Math.round(c.protein * 10) / 10 : null,
    carbs:   hasMacros ? Math.round(c.carbs   * 10) / 10 : null,
    fat:     hasMacros ? Math.round(c.fat     * 10) / 10 : null,
  });
}

// Trier par nom français
foods.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));

// ─── 4. Écriture ──────────────────────────────────────────────────────────────

fs.writeFileSync(OUT, JSON.stringify(foods));

const sizeKb = Math.round(fs.statSync(OUT).size / 1024);
console.log(`\n✅ ${foods.length} aliments écrits dans src/data/ciqual.json (${sizeKb} KB)`);

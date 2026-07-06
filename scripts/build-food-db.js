#!/usr/bin/env node
/**
 * Génère assets/food.db depuis src/data/ciqual.json + src/data/off-fr.json
 *
 * Usage : node scripts/build-food-db.js
 *
 * La base SQLite contient :
 *  - Table `foods`      : données brutes (id, name, kcal, protein, carbs, fat, brand, source)
 *  - Table `foods_fts`  : index FTS5 virtuel pour la recherche full-text avec préfixes
 *
 * Tokenizer : unicode61 avec remove_diacritics → "epeautre" trouve "Épeautre"
 */

const Database = require('better-sqlite3');
const fs   = require('fs');
const path = require('path');

const CIQUAL_PATH = path.join(__dirname, '..', 'src', 'data', 'ciqual.json');
const SUPP_PATH   = path.join(__dirname, '..', 'src', 'data', 'ciqual_supplement.json');
const OFF_PATH    = path.join(__dirname, '..', 'src', 'data', 'off-fr.json');
const OUT_PATH    = path.join(__dirname, '..', 'assets', 'food.db');

if (!fs.existsSync(CIQUAL_PATH)) { console.error('❌ ciqual.json introuvable'); process.exit(1); }
const hasOff = fs.existsSync(OFF_PATH);
if (!hasOff) console.warn('⚠️  off-fr.json absent — build Ciqual seul (lancez convert-off.js pour inclure OFF)');

// Supprime l'ancienne DB si elle existe
if (fs.existsSync(OUT_PATH)) fs.unlinkSync(OUT_PATH);

const db = new Database(OUT_PATH);
db.pragma('journal_mode = DELETE'); // pas de fichier WAL séparé
db.pragma('page_size = 4096');

// ── Schéma ─────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE foods (
    id      INTEGER PRIMARY KEY,
    name    TEXT    NOT NULL,
    kcal    INTEGER NOT NULL,
    protein REAL,
    carbs   REAL,
    fat     REAL,
    brand   TEXT,
    source  TEXT    NOT NULL
  );

  CREATE VIRTUAL TABLE foods_fts USING fts5(
    name,
    brand,
    content='foods',
    content_rowid='id',
    tokenize='unicode61 remove_diacritics 1'
  );
`);

const insert = db.prepare(`
  INSERT INTO foods (name, kcal, protein, carbs, fat, brand, source)
  VALUES (@name, @kcal, @protein, @carbs, @fat, @brand, @source)
`);

// ── Chargement des sources ─────────────────────────────────────────────────
console.log('Chargement ciqual.json...');
const ciqual = JSON.parse(fs.readFileSync(CIQUAL_PATH, 'utf8'));

console.log('Chargement ciqual_supplement.json...');
const suppList = JSON.parse(fs.readFileSync(SUPP_PATH, 'utf8'));
const supplement = new Map(suppList.map(s => [s.code, s]));

const offFr = hasOff ? JSON.parse(fs.readFileSync(OFF_PATH, 'utf8')) : [];
if (hasOff) console.log(`Chargement off-fr.json... (${offFr.length.toLocaleString()} entrées)`);

// ── Insertion en transaction unique ────────────────────────────────────────
const insertMany = db.transaction((items) => {
  for (const item of items) insert.run(item);
});

const seen = new Set();
const rows = [];

// Ciqual en priorité
for (const item of ciqual) {
  const key = item.name.toLowerCase();
  if (seen.has(key)) continue;
  seen.add(key);
  const supp = supplement.get(item.code);
  rows.push({
    name:    item.name,
    kcal:    Math.round(item.kcal),
    protein: item.protein ?? supp?.protein ?? null,
    carbs:   item.carbs   ?? supp?.carbs   ?? null,
    fat:     item.fat     ?? supp?.fat     ?? null,
    brand:   null,
    source:  'ciqual',
  });
}

// OFF France
for (const item of offFr) {
  const key = item.name.toLowerCase();
  if (seen.has(key)) continue;
  seen.add(key);
  rows.push({
    name:    item.name,
    kcal:    Math.round(item.kcal),
    protein: item.p ?? null,
    carbs:   item.c ?? null,
    fat:     item.f ?? null,
    brand:   item.brand ?? null,
    source:  'off',
  });
}

console.log(`Insertion de ${rows.length.toLocaleString()} aliments...`);
insertMany(rows);

// ── Construction de l'index FTS5 ───────────────────────────────────────────
console.log('Construction de l\'index FTS5...');
db.exec(`INSERT INTO foods_fts(foods_fts) VALUES('rebuild')`);

db.exec('VACUUM'); // compacte le fichier
db.close();

const sizeMB = (fs.statSync(OUT_PATH).size / 1024 / 1024).toFixed(1);
console.log(`\n✅ Terminé — assets/food.db (${sizeMB} MB, ${rows.length.toLocaleString()} aliments)`);

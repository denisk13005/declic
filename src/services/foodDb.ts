/**
 * Recherche alimentaire via SQLite local (expo-sqlite + FTS5).
 *
 * Remplace ciqualSearch.ts et foodSearch.ts (Fuse.js + JSON en mémoire).
 * La DB est bundlée dans assets/food.db et copiée sur l'appareil au 1er lancement
 * via expo-asset + expo-file-system.
 *
 * Usage :
 *   await initFoodDb()          — à appeler au démarrage de l'app
 *   await searchFood("pomme")   — retourne FoodResult[]
 */

import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import { Macros } from '@/types';

export interface FoodResult {
  name: string;
  caloriesPer100: number;
  macros: Macros | null;
  brand?: string;
}

let db: SQLite.SQLiteDatabase | null = null;

const DB_NAME    = 'food.db';
const DB_DIR     = FileSystem.documentDirectory + 'SQLite/';
const DB_PATH    = DB_DIR + DB_NAME;

async function copyAssetDb(): Promise<void> {
  // Crée le répertoire SQLite si besoin
  const dirInfo = await FileSystem.getInfoAsync(DB_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(DB_DIR, { intermediates: true });
  }
  // Supprime l'éventuel fichier corrompu/vide avant de copier
  await FileSystem.deleteAsync(DB_PATH, { idempotent: true });

  // Récupère l'URI Metro de l'asset et télécharge directement vers la destination
  const asset = Asset.fromModule(require('../../assets/food.db'));
  const result = await FileSystem.downloadAsync(asset.uri, DB_PATH);
  if (result.status !== 200) {
    throw new Error(`Échec téléchargement food.db : HTTP ${result.status}`);
  }
  console.log('[foodDb] DB copiée depuis les assets :', result.uri);
}

/**
 * Copie assets/food.db vers le répertoire SQLite de l'app si absent ou invalide,
 * puis ouvre la connexion.
 */
export async function initFoodDb(): Promise<void> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(DB_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(DB_DIR, { intermediates: true });
    }

    // Copie si la DB n'existe pas encore
    const dbInfo = await FileSystem.getInfoAsync(DB_PATH);
    if (!dbInfo.exists) {
      await copyAssetDb();
    }

    db = await SQLite.openDatabaseAsync(DB_NAME);

    // Vérifie que la table FTS5 est bien présente (détecte un fichier corrompu/vide)
    const check = await db.getFirstAsync<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table' AND name='foods_fts'`
    );
    if (!check || check.cnt === 0) {
      console.warn('[foodDb] DB invalide, re-copie depuis les assets...');
      await db.closeAsync();
      db = null;
      await copyAssetDb();
      db = await SQLite.openDatabaseAsync(DB_NAME);
    }
  } catch (e) {
    console.warn('[foodDb] Erreur init :', e);
  }
}

/**
 * Recherche full-text avec préfixes via FTS5.
 * "pom beu" → trouve "Pomme de Beurre", "Pommes Beurre", etc.
 */
export async function searchFood(query: string, limit = 8): Promise<FoodResult[]> {
  if (!db || !query || query.trim().length < 2) return [];

  // Construit la requête FTS5 : chaque mot devient un préfixe ("mot*")
  const terms = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length >= 1)
    .map(w => `"${w.replace(/"/g, '')}"*`)
    .join(' ');

  try {
    const rows = await db.getAllAsync<{
      name: string;
      kcal: number;
      protein: number | null;
      carbs: number | null;
      fat: number | null;
      brand: string | null;
    }>(
      `SELECT f.name, f.kcal, f.protein, f.carbs, f.fat, f.brand
       FROM foods_fts fts
       JOIN foods f ON f.id = fts.rowid
       WHERE foods_fts MATCH ?
       ORDER BY fts.rank
       LIMIT ?`,
      [terms, limit]
    );

    return rows.map(row => ({
      name: row.name,
      caloriesPer100: row.kcal,
      macros:
        row.protein != null && row.carbs != null && row.fat != null
          ? { protein: row.protein, carbs: row.carbs, fat: row.fat }
          : null,
      brand: row.brand ?? undefined,
    }));
  } catch (e) {
    console.warn('[foodDb] Erreur recherche :', e);
    return [];
  }
}

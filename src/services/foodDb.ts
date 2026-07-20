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
import AsyncStorage from '@react-native-async-storage/async-storage';
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
// Incrémenter à chaque rebuild de food.db pour forcer la re-copie sur l'appareil
const DB_VERSION = '3';

async function copyAssetDb(): Promise<void> {
  // Crée le répertoire SQLite si besoin
  const dirInfo = await FileSystem.getInfoAsync(DB_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(DB_DIR, { intermediates: true });
  }
  // Supprime l'éventuel fichier corrompu/vide avant de copier
  await FileSystem.deleteAsync(DB_PATH, { idempotent: true });

  // En production EAS, asset.uri est une référence bundlée (pas une URL HTTP).
  // downloadAsync() extrait l'asset depuis l'APK vers un fichier local temporaire,
  // puis localUri donne le chemin pour la copie.
  const asset = Asset.fromModule(require('../../assets/food.db'));
  await asset.downloadAsync();
  if (!asset.localUri) {
    throw new Error('[foodDb] asset.localUri null après downloadAsync — asset introuvable dans le bundle');
  }
  await FileSystem.copyAsync({ from: asset.localUri, to: DB_PATH });
  console.log('[foodDb] DB copiée depuis les assets :', DB_PATH);
}

/**
 * Copie assets/food.db vers le répertoire SQLite de l'app si absent ou invalide,
 * puis ouvre la connexion.
 */
export async function initFoodDb(): Promise<void> {
  try {
    // Re-copie si la DB n'existe pas ou si la version a changé
    const [dbInfo, storedVersion] = await Promise.all([
      FileSystem.getInfoAsync(DB_PATH),
      AsyncStorage.getItem('food_db_version'),
    ]);
    if (!dbInfo.exists || storedVersion !== DB_VERSION) {
      console.log(`[foodDb] Re-copie DB (version stockée: ${storedVersion} → ${DB_VERSION})`);
      await copyAssetDb();
      await AsyncStorage.setItem('food_db_version', DB_VERSION);
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
      await AsyncStorage.setItem('food_db_version', DB_VERSION);
      db = await SQLite.openDatabaseAsync(DB_NAME);
    }
  } catch (e) {
    console.warn('[foodDb] Erreur init :', e);
  }
}

/**
 * Recherche full-text avec préfixes via FTS5.
 * "pom beu" → trouve "Pomme de Beurre", "Pommes Beurre", etc.
 * @param offset  Position de départ pour la pagination (0 = première page)
 */
export async function searchFood(query: string, limit = 8, offset = 0): Promise<FoodResult[]> {
  if (!db || !query || query.trim().length < 2) return [];

  const lowerQuery = query.trim().toLowerCase();

  // Construit la requête FTS5 : chaque mot devient un préfixe ("mot*")
  const terms = lowerQuery
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
       ORDER BY
         CASE
           WHEN lower(f.name) = ? THEN 0
           WHEN lower(f.name) LIKE ? || ', %' AND f.brand IS NULL THEN 1
           WHEN lower(f.name) LIKE ? || '%' AND f.brand IS NULL THEN 2
           WHEN lower(f.name) LIKE ? || '%' THEN 3
           ELSE 4
         END,
         fts.rank,
         length(f.name)
       LIMIT ? OFFSET ?`,
      [terms, lowerQuery, lowerQuery, lowerQuery, lowerQuery, limit, offset]
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

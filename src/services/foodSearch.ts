/**
 * Recherche unifiée : Ciqual ANSES (3 339 aliments génériques)
 *                   + Open Food Facts France (59 000 produits de marque)
 *
 * Index Fuse.js unique — synchrone, hors-ligne, <20ms après warmup.
 */

import Fuse from 'fuse.js';
import { Macros } from '@/types';

interface FoodEntry {
  name: string;
  kcal: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  brand?: string;
}

export interface FoodResult {
  name: string;
  caloriesPer100: number;
  macros: Macros | null;
  brand?: string;
}

let fuse: Fuse<FoodEntry> | null = null;

function buildEntries(): FoodEntry[] {
  const ciqual  = require('@/data/ciqual.json')  as any[];
  const offFr   = require('@/data/off-fr.json')  as any[];

  const entries: FoodEntry[] = [];
  const seen = new Set<string>();

  // Ciqual en priorité (aliments génériques ANSES, qualité officielle)
  for (const item of ciqual) {
    const key = item.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({
      name: item.name,
      kcal: item.kcal,
      protein: item.protein ?? null,
      carbs: item.carbs ?? null,
      fat: item.fat ?? null,
    });
  }

  // OFF France (produits de marque : Danette, Activia, Kinder…)
  for (const item of offFr) {
    const key = item.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({
      name: item.name,
      kcal: item.kcal,
      protein: item.p ?? null,
      carbs: item.c ?? null,
      fat: item.f ?? null,
      brand: item.brand,
    });
  }

  return entries;
}

function getFuse(): Fuse<FoodEntry> {
  if (!fuse) {
    fuse = new Fuse<FoodEntry>(buildEntries(), {
      keys: ['name'],
      threshold: 0.35,
      distance: 200,
      minMatchCharLength: 2,
      shouldSort: true,
      includeScore: true,
    });
  }
  return fuse;
}

function matchesWordPrefix(name: string, queryWords: string[]): boolean {
  const nameWords = name.toLowerCase().split(/[\s\-_',().]+/).filter(Boolean);
  return queryWords.every(qw => nameWords.some(nw => nw.startsWith(qw)));
}

export function searchFood(query: string, limit = 8): FoodResult[] {
  if (!query || query.trim().length < 2) return [];

  const queryWords = query.trim().toLowerCase().split(/\s+/).filter(w => w.length >= 1);

  return getFuse()
    .search(query.trim(), { limit: limit * 5 })
    .filter(({ item }) => matchesWordPrefix(item.name, queryWords))
    .slice(0, limit)
    .map(({ item }) => ({
      name: item.name,
      caloriesPer100: item.kcal,
      macros:
        item.protein != null && item.carbs != null && item.fat != null
          ? { protein: item.protein, carbs: item.carbs, fat: item.fat }
          : null,
      brand: item.brand,
    }));
}

// Pré-chauffe l'index Fuse après le 1er render (évite un délai à la première ouverture)
export function warmupFoodSearch(): void {
  setTimeout(() => getFuse(), 0);
}

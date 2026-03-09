import Fuse from 'fuse.js';
import { Macros } from '@/types';

interface CiqualEntry {
  code: number;
  name: string;
  kcal: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

export interface CiqualResult {
  name: string;
  caloriesPer100: number;
  macros: Macros | null;
}

// Initialisation lazy : Fuse est créé uniquement au 1er appel de searchCiqual
// → évite de bloquer le thread JS au chargement du module (ANR sur émulateurs lents)
let fuse: Fuse<CiqualEntry> | null = null;

function getFuse(): Fuse<CiqualEntry> {
  if (!fuse) {
    const RAW = require('@/data/ciqual.json') as CiqualEntry[];
    fuse = new Fuse<CiqualEntry>(RAW, {
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

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// Vérifie qu'un nom contient un mot commençant par chaque mot de la requête
// Les accents sont ignorés dans les deux sens (entrecote ↔ entrecôte)
function matchesWordPrefix(name: string, queryWords: string[]): boolean {
  const nameWords = normalize(name).split(/[\s\-_',().]+/).filter(Boolean);
  return queryWords.every(qw =>
    nameWords.some(nw => nw.startsWith(qw))
  );
}

export function searchCiqual(query: string, limit = 8): CiqualResult[] {
  if (!query || query.trim().length < 2) return [];

  const queryWords = normalize(query.trim()).split(/\s+/).filter(w => w.length >= 1);

  return getFuse()
    .search(query.trim(), { limit: limit * 4 })
    .filter(({ item }) => matchesWordPrefix(item.name, queryWords))
    // Trie par longueur de nom croissante : les entrées génériques (courtes) passent en premier
    // ex: "Pomme, pulpe et peau, crue" avant "Pomme, déshydratée, sucrée"
    .sort((a, b) => a.item.name.length - b.item.name.length)
    .slice(0, limit)
    .map(({ item }) => ({
      name: item.name,
      caloriesPer100: item.kcal,
      macros:
        item.protein != null && item.carbs != null && item.fat != null
          ? { protein: item.protein, carbs: item.carbs, fat: item.fat }
          : null,
    }));
}

// Pré-chauffe l'index en arrière-plan après le démarrage de l'app
// (setTimeout 0 = après le 1er render, sans bloquer l'UI)
export function warmupCiqual(): void {
  setTimeout(() => getFuse(), 0);
}

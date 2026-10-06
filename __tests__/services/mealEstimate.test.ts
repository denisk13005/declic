/**
 * Tests unitaires — mealEstimate (calcul d'un repas dicté avec la base Ciqual)
 *
 * La recherche SQLite est remplacée par une fausse recherche sur un extrait réel
 * de assets/food.db (mots-clés tous présents dans le nom, comme FTS5).
 */

jest.mock('@/services/foodDb', () => ({ searchFood: jest.fn(async () => []) }));

import { estimateMeal, estimateSourceLabel, pickBestMatch, SearchFn } from '@/services/mealEstimate';
import type { MealItem } from '@/services/gemini';
import type { FoodResult } from '@/services/foodDb';

// Extrait de food.db (valeurs Ciqual réelles)
const DB: FoodResult[] = [
  { name: 'Jambon de poulet ou blanc de poulet en tranche', caloriesPer100: 105, macros: { protein: 20.7, carbs: 1.4, fat: 1.8 } },
  { name: 'Poulet blanc, viande et peau crues', caloriesPer100: 122, macros: { protein: 20.8, carbs: 0, fat: 4.3 } },
  { name: 'Poulet, filet sans peau cru', caloriesPer100: 110, macros: { protein: 23.4, carbs: 0, fat: 1.5 } },
  { name: 'Poulet, filet sans peau grillé/poêlé', caloriesPer100: 141, macros: { protein: 30.1, carbs: 0, fat: 2 } },
  { name: 'Poulet, filet sans peau grillé/poêlé, bio', caloriesPer100: 144, macros: { protein: 31.1, carbs: 0, fat: 1.8 } },
  { name: 'Morceaux de filets de poulet', caloriesPer100: 148, macros: { protein: 27.3, carbs: 0.5, fat: 4 }, brand: 'Bofrost' },
  { name: 'Riz blanc, cuit', caloriesPer100: 146, macros: { protein: 2.9, carbs: 32.2, fat: 0.3 } },
  { name: 'Riz au lait', caloriesPer100: 120, macros: { protein: 3.2, carbs: 20, fat: 2.9 } },
];

// Comme FTS5 avec "mot*" : chaque mot de la requête doit commencer un mot du nom
const fakeSearch: SearchFn = async (query, limit) => {
  const words = query.toLowerCase().split(/\s+/);
  return DB.filter((f) => {
    const nameWords = f.name.toLowerCase().split(/[\s,/]+/);
    return words.every((w) => nameWords.some((nw) => nw.startsWith(w)));
  }).slice(0, limit);
};

function item(overrides: Partial<MealItem> = {}): MealItem {
  return {
    name: 'Filet de poulet grillé',
    search: 'poulet filet grillé',
    grams: 100,
    estimatePer100: { calories: 165, macros: { protein: 31, carbs: 0, fat: 3.6 } },
    ...overrides,
  };
}

describe('pickBestMatch', () => {
  it('prend le résultat le plus proche de l’estimation (cuit plutôt que cru)', () => {
    const r = pickBestMatch(DB.slice(0, 4), 165);
    expect(r?.name).toBe('Poulet, filet sans peau grillé/poêlé');
  });

  it('à écart quasi égal, garde le plus pertinent (standard plutôt que bio)', () => {
    // 144 (bio) est un peu plus proche de 165 que 141, mais l'écart est < 10 % → ordre de recherche
    const r = pickBestMatch([DB[3], DB[4]], 165);
    expect(r?.name).toBe('Poulet, filet sans peau grillé/poêlé');
  });

  it('ignore les produits de marque', () => {
    const r = pickBestMatch([DB[5]], 148);
    expect(r).toBeNull();
  });

  it('refuse un résultat trop éloigné de l’estimation (> 50 %)', () => {
    expect(pickBestMatch([DB[7]], 350)).toBeNull();
  });

  it('accepte un aliment quasi nul quand l’estimation est quasi nulle', () => {
    const eau: FoodResult = { name: 'Eau', caloriesPer100: 0, macros: { protein: 0, carbs: 0, fat: 0 } };
    expect(pickBestMatch([eau], 0)?.name).toBe('Eau');
  });
});

describe('estimateMeal', () => {
  it('100 g de filet de poulet dicté → valeur Ciqual grillé (141), pas l’estimation USDA (165)', async () => {
    const r = await estimateMeal([item()], fakeSearch);
    expect(r.analysis.calories).toBe(141);
    expect(r.analysis.macros).toEqual({ protein: 30.1, carbs: 0, fat: 2 });
    expect(r.matchedCount).toBe(1);
  });

  it('« cru » précisé → valeur Ciqual crue (110), identique à la saisie manuelle', async () => {
    const r = await estimateMeal(
      [item({ name: 'Filet de poulet cru', search: 'poulet filet cru', estimatePer100: { calories: 110, macros: null } })],
      fakeSearch,
    );
    expect(r.analysis.calories).toBe(110);
  });

  it('additionne plusieurs aliments en tenant compte des grammes', async () => {
    const r = await estimateMeal(
      [item(), item({ name: 'Riz blanc cuit', search: 'riz blanc cuit', grams: 200, estimatePer100: { calories: 130, macros: null } })],
      fakeSearch,
    );
    expect(r.analysis.calories).toBe(141 + 292);
    expect(r.analysis.name).toBe('Filet de poulet grillé (100 g) + Riz blanc cuit (200 g)');
    expect(r.matchedCount).toBe(2);
  });

  it('retire les derniers mots-clés si la recherche complète ne trouve rien', async () => {
    // "vapeur" n'apparaît dans aucun nom → repli sur "riz blanc"
    const r = await estimateMeal(
      [item({ name: 'Riz blanc', search: 'riz blanc vapeur', grams: 100, estimatePer100: { calories: 140, macros: null } })],
      fakeSearch,
    );
    expect(r.analysis.calories).toBe(146);
    expect(r.matchedCount).toBe(1);
  });

  it('garde l’estimation Gemini si l’aliment est absent de la base', async () => {
    const r = await estimateMeal(
      [item({ name: 'Bo bun', search: 'bo bun', grams: 400, estimatePer100: { calories: 120, macros: { protein: 6, carbs: 15, fat: 4 } } })],
      fakeSearch,
    );
    expect(r.analysis.calories).toBe(480);
    expect(r.analysis.macros).toEqual({ protein: 24, carbs: 60, fat: 16 });
    expect(r.matchedCount).toBe(0);
  });

  it('macros null si un aliment n’a pas de macros connues', async () => {
    const r = await estimateMeal(
      [item(), item({ name: 'Bo bun', search: 'bo bun', estimatePer100: { calories: 120, macros: null } })],
      fakeSearch,
    );
    expect(r.analysis.macros).toBeNull();
  });
});

describe('estimateSourceLabel', () => {
  it('indique la source du calcul', () => {
    expect(estimateSourceLabel({ matchedCount: 2, itemCount: 2 })).toBe('Calculé avec la base Ciqual');
    expect(estimateSourceLabel({ matchedCount: 0, itemCount: 1 })).toMatch(/Estimation IA/);
    expect(estimateSourceLabel({ matchedCount: 1, itemCount: 3 })).toMatch(/^1\/3 aliments/);
  });
});

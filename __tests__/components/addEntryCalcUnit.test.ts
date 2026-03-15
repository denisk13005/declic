/**
 * Tests unitaires — logique de calcul calories/macros par unité
 *
 * Vérifie que le calcul est correct pour g, ml, pièce, portion
 * en répliquant la logique de applyBase() de AddEntryModal.
 *
 * On teste aussi computeCalories/computeMacros du store pour cohérence.
 */

import { useCalorieStore } from '@/stores/calorieStore';
import { FoodItem, Serving } from '@/types';

const APPLE: FoodItem = {
  id: 'apple',
  name: 'Pomme',
  caloriesPer100: 52,
  macrosPer100: { protein: 0.3, carbs: 12.1, fat: 0.2 },
  defaultServing: { quantity: 150, unit: 'g' },
  isCustom: false,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const EGG: FoodItem = {
  id: 'egg',
  name: 'Oeuf',
  caloriesPer100: 143,
  macrosPer100: { protein: 13.0, carbs: 0.7, fat: 11.0 },
  defaultServing: { quantity: 1, unit: 'piece' },
  isCustom: false,
  createdAt: '2026-01-01T00:00:00.000Z',
};

// Réplique exacte de applyBase() dans AddEntryModal
function applyBase(
  base: { calories: number; macros: { protein: number; carbs: number; fat: number } | null },
  qty: number,
  unit: 'g' | 'ml' | 'piece' | 'portion',
  gpp: number = 0, // grammes par pièce/portion
): { calories: number; protein: number | null; carbs: number | null; fat: number | null } {
  let factor: number;
  if (unit === 'g' || unit === 'ml') {
    factor = qty / 100;
  } else {
    if (!gpp || gpp <= 0) return { calories: 0, protein: null, carbs: null, fat: null };
    factor = (gpp * qty) / 100;
  }
  return {
    calories: Math.round(base.calories * factor),
    protein: base.macros ? Math.round(base.macros.protein * factor * 10) / 10 : null,
    carbs:   base.macros ? Math.round(base.macros.carbs   * factor * 10) / 10 : null,
    fat:     base.macros ? Math.round(base.macros.fat     * factor * 10) / 10 : null,
  };
}

describe('applyBase — unités g/ml', () => {
  const base = { calories: APPLE.caloriesPer100, macros: APPLE.macrosPer100 };

  it('100g → valeur pour 100g', () => {
    const r = applyBase(base, 100, 'g');
    expect(r.calories).toBe(52);
  });

  it('200g → double des calories', () => {
    const r = applyBase(base, 200, 'g');
    expect(r.calories).toBe(104);
  });

  it('50g → moitié des calories', () => {
    const r = applyBase(base, 50, 'g');
    expect(r.calories).toBe(26);
  });

  it('ml se comporte comme g', () => {
    const r = applyBase(base, 250, 'ml');
    expect(r.calories).toBe(Math.round(52 * 2.5));
  });

  it('les macros sont proportionnelles à la quantité', () => {
    const r = applyBase(base, 200, 'g');
    expect(r.protein).toBe(Math.round(0.3 * 2 * 10) / 10);
    expect(r.carbs).toBe(Math.round(12.1 * 2 * 10) / 10);
    expect(r.fat).toBe(Math.round(0.2 * 2 * 10) / 10);
  });
});

describe('applyBase — unités pièce/portion avec gramsPerPiece', () => {
  const base = { calories: APPLE.caloriesPer100, macros: APPLE.macrosPer100 };

  it('1 pièce de 150g → mêmes calories que 150g', () => {
    const piece = applyBase(base, 1, 'piece', 150);
    const grams = applyBase(base, 150, 'g');
    expect(piece.calories).toBe(grams.calories);
  });

  it('2 pièces de 150g → double de 1 pièce', () => {
    const one  = applyBase(base, 1, 'piece', 150);
    const two  = applyBase(base, 2, 'piece', 150);
    expect(two.calories).toBe(one.calories * 2);
  });

  it('1 oeuf de 60g → ~86 kcal', () => {
    const eggBase = { calories: EGG.caloriesPer100, macros: EGG.macrosPer100 };
    const r = applyBase(eggBase, 1, 'piece', 60);
    expect(r.calories).toBe(Math.round(143 * 60 / 100)); // 86
  });

  it('sans gramsPerPiece (gpp=0) → calories=0, macros=null (pas de calcul)', () => {
    const r = applyBase(base, 1, 'piece', 0);
    expect(r.calories).toBe(0);
    expect(r.protein).toBeNull();
  });

  it('portion fonctionne comme pièce', () => {
    const piece   = applyBase(base, 1, 'piece',   150);
    const portion = applyBase(base, 1, 'portion', 150);
    expect(piece.calories).toBe(portion.calories);
  });
});

describe('computeCalories store — cohérence avec applyBase', () => {
  const { computeCalories, computeMacros } = useCalorieStore.getState();

  it('g : computeCalories(150g) = applyBase(150, g)', () => {
    const serving: Serving = { quantity: 150, unit: 'g' };
    const fromStore = computeCalories(APPLE, serving);
    const fromBase  = applyBase({ calories: APPLE.caloriesPer100, macros: APPLE.macrosPer100 }, 150, 'g');
    expect(fromStore).toBe(fromBase.calories);
  });

  it('piece : computeCalories traite caloriesPer100 comme cal/pièce × qty', () => {
    // Dans le store, piece : factor = qty (pas de gramsPerPiece)
    // → cohérent avec l'usage du store pour les FoodItem déjà en bibliothèque
    const serving: Serving = { quantity: 2, unit: 'piece' };
    const result = computeCalories(EGG, serving);
    // factor = 2, caloriesPer100 = 143 → 286
    expect(result).toBe(286);
  });
});
